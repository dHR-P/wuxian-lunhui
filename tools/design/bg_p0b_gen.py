# -*- coding: utf-8 -*-
"""bg_p0b_gen.py — 批量 生图->qwen质检->部署 背景池(8副本×3=24张)。
用法: comfy_python bg_p0b_gen.py
流程(每 job): gen_wan.gen -> qwen3.7-flash QC(qc_qwen.py,bg_full_qc_instr.json) -> PASS 落盘 raw + 部署 ui/assets。
每条最多 3 次生图尝试(≤2 重试)。花费按 gen_wan 输出 cost_cny 累计。
引用替换由 bg_p0b_edit.py 另行处理。
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
JOBS_JSON = os.path.join(HERE, "bg_p0b_jobs.json")
QC_INSTR_TPL = os.path.join(HERE, "bg_full_qc_instr.json")
UI_IMG = r"C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1\server-rs\ui\assets\img"
GEN_WAN = os.path.join(HERE, "gen_wan.py")
QC_QWEN = os.path.join(HERE, "qc_qwen.py")
USE_UTF8 = os.name == "nt"


def run(cmd, cwd=None, timeout=600):
    if USE_UTF8:
        env = dict(os.environ, PYTHONIOENCODING="utf-8", PYTHONUTF8="1")
    else:
        env = os.environ.copy()
    r = subprocess.run(cmd, cwd=cwd, env=env, capture_output=True, text=True, timeout=timeout)
    return r


def gen_image(prompt, out_png):
    r = run([PY, GEN_WAN, out_png, prompt, "768x1024"], timeout=600)
    return r.returncode == 0, (r.stdout or "") + (r.stderr or "")


def qc_image(png, qdesc, tmp_instr):
    with open(QC_INSTR_TPL, "r", encoding="utf-8") as f:
        tpl = json.load(f)
    tpl["instruction"] = tpl["instruction"] + "\n【本图的场景设定】" + qdesc
    with open(tmp_instr, "w", encoding="utf-8") as f:
        json.dump(tpl, f, ensure_ascii=False)
    r = run([PY, QC_QWEN, png, tmp_instr], timeout=600)
    res_path = os.path.splitext(png)[0] + ".qcresult.json"
    if not os.path.exists(res_path):
        return None, "QC_NO_FILE", (r.stdout or "") + (r.stderr or "")
    with open(res_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    # fetch verdict conservatively from raw content regex
    content = data.get("content") or ""
    parsed = data.get("parsed_json") or {}
    verdict = parsed.get("verdict") or ""
    passed = parsed.get("pass")
    if verdict == "PASS" or passed is True:
        return True, verdict, content
    # fallback: scan content for explicit pass/fail tokens in final verdict
    seg = content[-200:]
    if "PASS" in seg and "FAIL" not in seg:
        return True, "PASS", content
    return False, verdict or "FAIL", content


def main(argv=None):
    with open(JOBS_JSON, "r", encoding="utf-8") as f:
        jobs = json.load(f)["jobs"]
    style = json.load(open(JOBS_JSON, encoding="utf-8"))["style_suffix"]
    os.makedirs(RAW_DIR, exist_ok=True)
    results = {}
    total_cost = 0.0
    qc_calls = 0
    for job in jobs:
        slug = job["slug"]
        typ = job["type"]
        new_bg = job["file"]
        qdesc = job["qdesc"]
        raw_png = os.path.join(RAW_DIR, new_bg)
        deploy_png = os.path.join(UI_IMG, new_bg)
        ok = False
        cost = 0.0
        attempts = 3
        verdicts = []
        for attempt in range(1, attempts + 1):
            prompt = job["prompt"].strip()
            if os.path.exists(raw_png):
                os.remove(raw_png)
            gok, gout = gen_image(prompt + " " + style, raw_png)
            if not gok or not os.path.exists(raw_png):
                verdicts.append("GEN_FAIL")
                print("[FAIL] %s/%s GEN attempt=%d out=%s" % (slug, typ, attempt, gout[:200]), flush=True)
                continue
            cm = re.search(r"cost_cny=([\d.]+)", gout)
            if cm:
                cost += float(cm.group(1))
            tmp_instr = os.path.join(RAW_DIR, "_qc_%s_%s.json" % (slug, typ))
            qc_calls += 1
            qok, verdict, detail = qc_image(raw_png, qdesc, tmp_instr)
            verdicts.append("%s@%d" % (verdict or "FAIL", attempt))
            if qok:
                ok = True
                print("[PASS] %s/%s attempt=%d verdict=%s" % (slug, typ, attempt, verdict), flush=True)
                break
            print("[FAIL] %s/%s attempt=%d verdict=%s det=%s" % (slug, typ, attempt, verdict, detail[:200]), flush=True)
        total_cost += cost
        if not ok:
            results["%s/%s" % (slug, typ)] = {"pass": False, "cost": round(cost, 4), "attempts": verdicts}
            print("[RESULT] %s/%s FAIL" % (slug, typ), flush=True)
            continue
        # preserve a QC-cleared raw copy then deploy
        shutil.copyfile(raw_png, deploy_png)
        results["%s/%s" % (slug, typ)] = {
            "pass": True, "cost": round(cost, 4), "attempts": verdicts,
            "raw": raw_png, "deployed": deploy_png,
        }
        print("[RESULT] %s/%s PASS deployed=%s" % (slug, typ, deploy_png), flush=True)
    summary = {"total_cost_est": round(total_cost, 4), "qc_calls": qc_calls, "results": results}
    with open(os.path.join(HERE, "_bg_p0b_gen_out.json"), "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    print("=== SUMMARY ===", flush=True)
    print(json.dumps(summary, ensure_ascii=False), flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
