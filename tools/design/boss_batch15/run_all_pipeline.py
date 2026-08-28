# -*- coding: utf-8 -*-
"""run_all_pipeline.py — 对所有已生成的 raw_enemy/<id>.png 跑完整管线QC+抠图+复核+部署。
用法: python run_all_pipeline.py id1 id2 ... (可省略=处理所有存在的 raw)
"""
import json, os, re, subprocess, sys

BASE = r"C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1"
BATCH = os.path.join(BASE, "tools", "design", "boss_batch15")
RAW = os.path.join(BASE, "tools", "design", "raw_enemy")
DEPLOY = os.path.join(BASE, "server-rs", "ui", "assets", "img")
PY = r"D:\AI_Tools\ComfyUI\python_embeded\python.exe"
PIPE = os.path.join(BATCH, "pipeline_one.py")
os.environ["PYTHONIOENCODING"] = "utf-8"

IDS = ["brain_bug","yiy_queen","yiy_facehugger","yiy_worker","gregor","tyrant",
       "barbossa","freddy2","pyramid","deep","kage","sword","zhen","poxu","watcher"]

def main():
    sel = sys.argv[1:]
    targets = sel if sel else IDS
    results = {}
    for cid in targets:
        raw = os.path.join(RAW, cid + ".png")
        if not os.path.exists(raw):
            results[cid] = {"status": "SKIP", "note": "raw missing"}
            continue
        r = subprocess.run([PY, PIPE, cid], capture_output=True, text=True,
                           encoding="utf-8", errors="replace")
        m = re.search(r'PIPELINE_SUMMARY: (.*)', r.stdout + r.stderr, re.S)
        if m:
            try:
                results[cid] = json.loads(m.group(1))
            except Exception:
                results[cid] = {"status": "FAIL", "note": "parse", "raw": (r.stdout + r.stderr)[-400:]}
        else:
            results[cid] = {"status": "FAIL", "note": "no summary", "raw": (r.stdout + r.stderr)[-400:]}
        print("== %s -> %s" % (cid, results[cid].get("status")), flush=True)
    print("ALL_RESULTS: %s" % json.dumps(results, ensure_ascii=False))

if __name__ == "__main__":
    main()
