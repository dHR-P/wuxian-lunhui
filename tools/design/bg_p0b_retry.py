# -*- coding: utf-8 -*-
"""bg_p0b_retry.py — 对指定 jobs json 重跑 生图->qwen质检->部署(不处理引用)。
用法: comfy_python bg_p0b_retry.py <jobs.json> [--keep-if-deployed]
   --keep-if-deployed: 若目标部署图已存在且本批次此 job 前次已 PASS, 跳过重跑。
默认只重跑 jobs 中标记为需重试的文件。
"""
import json
import os
import re
import shutil
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
PY = r"D:\AI_Tools\ComfyUI\python_embeded\python.exe"
RAW_DIR = os.path.join(HERE, "raw_bg_p0b")
QC_INSTR_TPL = os.path.join(HERE, "bg_full_qc_instr.json")
UI_IMG = r"C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1\server-rs\ui\assets\img"
GEN_WAN = os.path.join(HERE, "gen_wan.py")
QC_QWEN = os.path.join(HERE, "qc_qwen.py")
USE_UTF8 = os.name == "nt"


def run(cmd, cwd=None, timeout=600):
    env = dict(os.environ, PYTHONIOENCODING="utf-8", PYTHONUTF8="1") if USE_UTF8 else os.environ.copy()
    return subprocess.run(cmd, cwd=cwd, env=env, capture_output=True, text=True, timeout=timeout)


def gen_image(prompt, out_png):
    r = run([PY, GEN_WAN, out_png, prompt, "768x1024"], timeout=600)
    return r.returncode == 0, (r.stdout or "") + (r.stderr or "")


def qc_image(png, qdesc, tmp_instr):
    with open(QC_INSTR_TPL, "r", encoding="utf-8") as f:
        tpl = json.load(f)
    tpl["instruction"] = tpl["instruction"] + "\n【本图的场景设定】" + qdesc
    with open(tmp_instr, "w", encoding="utf-8") as f:
        json.dump(tpl, f, ensure_ascii=False)
    run([PY, QC_QWEN, png, tmp_instr], timeout=600)
    res_path = os.path.splitext(png)[0] + ".qcresult.json"
    if not os.path.exists(res_path):
        return None, "QC_NO_FILE", ""
    with open(res_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    content = data.get("content") or ""
    parsed = data.get("parsed_json") or {}
    verdict = parsed.get("verdict") or ""
    passed = parsed.get("pass")
    if verdict == "PASS" or passed is True:
        return True, "PASS", content
    seg = content[-200:]
    if "PASS" in seg and "FAIL" not in seg:
        return True, "PASS", content
    return False, verdict or "FAIL", content


def main(argv):
    jobs_path = sys.argv[1]
    with open(jobs_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    jobs = data["jobs"]
    style = data["style_suffix"]
    os.makedirs(RAW_DIR, exist_ok=True)
    results = {}
    total_cost = 0.0
    for job in jobs:
        slug = job["slug"]
        typ = job["type"]
        new_bg = job["file"]
        qdesc = job["qdesc"]
        raw_png = os.path.join(RAW_DIR, new_bg)
        deploy_png = os.path.join(UI_IMG, new_bg)
        ok = False
        cost = 0.0
        verdicts = []
        for attempt in range(1, 4):
            if os.path.exists(raw_png):
                os.remove(raw_png)
            gok, gout = gen_image(job["prompt"].strip() + " " + style, raw_png)
            if not gok or not os.path.exists(raw_png):
                verdicts.append("GEN_FAIL")
                continue
            cm = re.search(r"cost_cny=([\d.]+)", gout)
            if cm:
                cost += float(cm.group(1))
            tmp_instr = os.path.join(RAW_DIR, "_qc_%s_%s.json" % (slug, typ))
            qok, verdict, detail = qc_image(raw_png, qdesc, tmp_instr)
            verdicts.append("%s@%d" % (verdict or "FAIL", attempt))
            if qok:
                ok = True
                print("[PASS] %s/%s attempt=%d" % (slug, typ, attempt), flush=True)
                break
            print("[FAIL] %s/%s attempt=%d %s" % (slug, typ, attempt, verdict), flush=True)
        total_cost += cost
        if not ok:
            results["%s/%s" % (slug, typ)] = {"pass": False, "cost": round(cost, 4), "attempts": verdicts}
            print("[RESULT] %s/%s FAIL" % (slug, typ), flush=True)
            continue
        shutil.copyfile(raw_png, deploy_png)
        results["%s/%s" % (slug, typ)] = {"pass": True, "cost": round(cost, 4), "attempts": verdicts, "deployed": deploy_png}
        print("[RESULT] %s/%s PASS deployed=%s" % (slug, typ, deploy_png), flush=True)
    summary = {"total_cost_est": round(total_cost, 4), "results": results}
    with open(os.path.join(HERE, "_bg_p0b_retry_out.json"), "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    print("=== SUMMARY ===", flush=True)
    print(json.dumps(summary, ensure_ascii=False), flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
