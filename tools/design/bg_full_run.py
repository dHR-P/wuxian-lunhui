# -*- coding: utf-8 -*-
"""bg_full_run.py — 为仍未接线开场占位 bg 的副本批量 生图->qwen质检->部署->改引用。
用法:
  comfy_python bg_full_run.py [--only slug1,slug2,...] [--skip-gen slug]
仅列出 jobs 中 scene_id 的 opening 占位为 img_* 的副本；若已非占位则跳过并标记 SKIP。
流程(每 job): gen_wan.gen -> qwen3.7-flash QC(qc_qwen.py) -> PASS 落盘 raw_bg_full + 部署 ui/assets + 改 scenes 引用。
每条最多 3 次生图尝试(≤2 重试)。花费按 gen_wan 输出 cost_cny 累计。
"""
import json
import os
import re
import shutil
import subprocess
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
PY = r"D:\AI_Tools\ComfyUI\python_embeded\python.exe"
RAW_DIR = os.path.join(HERE, "raw_bg_full")
QC_INSTR_TPL = os.path.join(HERE, "bg_full_qc_instr.json")
JOBS_JSON = os.path.join(HERE, "bg_full_jobs.json")
UI_IMG = r"C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1\server-rs\ui\assets\img"
SRC_DIR = r"C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1\server-rs\src"
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
    r = run([PY, GEN_WAN, out_png, prompt, "768x1024"])
    return r.returncode == 0, (r.stdout or "") + (r.stderr or "")


def qc_image(png, qdesc, tmp_instr):
    # build per-job instruction embedding the setting
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
    pj = data.get("parsed_json") or {}
    verdict = pj.get("verdict") or ""
    passed = pj.get("pass")
    if verdict == "PASS" or passed is True:
        return True, verdict, json.dumps(pj, ensure_ascii=False)
    return False, verdict or "FAIL", json.dumps(pj, ensure_ascii=False)


def edit_scene(slug, scenes_file, scene_id, old_bg, new_bg):
    path = os.path.join(SRC_DIR, scenes_file)
    with open(path, "r", encoding="utf-8") as f:
        text = f.read()
    # locate the scene block and its bg line
    marker = 'id: "%s"' % scene_id
    if marker not in text:
        return False, "scene_id not found"
    idx = text.index(marker)
    # replace only within this scene block (until next 'SceneDef {' or end)
    block_end = len(text)
    nxt = text.find("SceneDef {", idx + 1)
    if nxt != -1:
        block_end = nxt
    block = text[idx:block_end]
    pat = re.compile(r'(bg: Some\(")[^"]*("\))')
    m = pat.search(block)
    if not m:
        return False, "no bg field in scene block"
    old_val = m.group(0)
    new_line = 'bg: Some("%s")' % new_bg
    new_block = block.replace(old_val, new_line, 1)
    text = text[:idx] + new_block + text[block_end:]
    # validate placeholder->new mapping: only allow if old was img_* or the known old_bg
    if not old_val.startswith('bg: Some("img_'):
        if old_bg not in old_val:
            return False, "old bg not img_* and not expected (%s vs %s)" % (old_val, old_bg)
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)
    return True, old_val + " -> " + new_line


def main(argv):
    only = None
    jobs_path = JOBS_JSON
    if "--only" in argv:
        only = set(argv[argv.index("--only") + 1].split(","))
    if "--jobs" in argv:
        jobs_path = argv[argv.index("--jobs") + 1]
    with open(jobs_path, "r", encoding="utf-8") as f:
        jobs = json.load(f)["jobs"]
    style = jobs_text_style(jobs_path)
    os.makedirs(RAW_DIR, exist_ok=True)
    results = {}
    total_cost = 0.0
    for job in jobs:
        slug = job["slug"]
        if only and slug not in only:
            continue
        new_bg = job["new_bg"]
        scenes_file = job["scenes_file"]
        scene_id = job["scene_id"]
        old_bg = job["old_bg"]
        qdesc = job["qdesc"]
        raw_png = os.path.join(RAW_DIR, new_bg)
        deploy_png = os.path.join(UI_IMG, new_bg)
        # --- gen + qc with up to 3 attempts ---
        ok = False
        cost = 0.0
        attempts = 3
        verdicts = []
        for attempt in range(1, attempts + 1):
            prompt = job["prompt"] + " " + style
            if os.path.exists(raw_png):
                os.remove(raw_png)
            gok, gout = gen_image(prompt, raw_png)
            if not gok or not os.path.exists(raw_png):
                verdicts.append("GEN_FAIL")
                continue
            # parse cost from gen output
            cm = re.search(r"cost_cny=([\d.]+)", gout)
            if cm:
                cost += float(cm.group(1))
            # QC
            tmp_instr = os.path.join(RAW_DIR, "_qc_%s.json" % slug)
            qok, verdict, detail = qc_image(raw_png, qdesc, tmp_instr)
            verdicts.append("%s@%d" % (verdict or "FAIL", attempt))
            if qok:
                ok = True
                print("[PASS] %s attempt=%d verdict=%s" % (slug, attempt, verdict), flush=True)
                break
            print("[FAIL] %s attempt=%d verdict=%s det=%s" % (slug, attempt, verdict, detail[:200]), flush=True)
            # retry gen
        total_cost += cost
        if not ok:
            results[slug] = {"pass": False, "cost": round(cost, 4), "attempts": verdicts, "reason": "all_attempts_failed"}
            print("[RESULT] %s FAIL" % slug, flush=True)
            continue
        # --- deploy ---
        shutil.copyfile(raw_png, deploy_png)
        # --- edit scene ---
        eok, edetail = edit_scene(slug, scenes_file, scene_id, old_bg, new_bg)
        results[slug] = {
            "pass": True, "cost": round(cost, 4), "attempts": verdicts,
            "raw": raw_png, "deployed": deploy_png, "edit": edetail,
        }
        print("[RESULT] %s PASS deployed=%s edit=%s" % (slug, deploy_png, edetail), flush=True)
    # dump run summary
    summary = {"total_cost_est": round(total_cost, 4), "results": results}
    with open(os.path.join(HERE, "_bg_full_run_out.json"), "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    print("=== SUMMARY ===", flush=True)
    print(json.dumps(summary, ensure_ascii=False), flush=True)
    return 0


def jobs_text_style(jobs_path=None):
    with open(jobs_path or JOBS_JSON, "r", encoding="utf-8") as f:
        return json.load(f)["style_suffix"]


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
