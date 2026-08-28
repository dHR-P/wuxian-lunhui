# -*- coding: utf-8 -*-
"""QC 剩余 3 张未质检 bg：xingjichuanqi2_bg_mine / xingjichuanqi2_bg_hospital / shenghua3_bg_underground"""
import os, sys, subprocess, re
HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, "raw_bg_batch_p0")
QC = os.path.join(RAW, "qc")
PY = r"D:\AI_Tools\ComfyUI\python_embeded\python.exe"
GLM = os.path.join(HERE, "glm_qc.py")
EXPECT = {
    "xingjichuanqi2_bg_mine": "废弃煤矿洞空镜，灰雾弥漫，矿车轨道，无人",
    "xingjichuanqi2_bg_hospital": "老式医院走廊空镜，冷光灯闪烁，空荡无人",
    "shenghua3_bg_underground": "浣熊市地下污水管网空镜，昏黄应急灯，无人",
}
os.makedirs(QC, exist_ok=True)
for name, desc in EXPECT.items():
    img = os.path.join(RAW, name + ".png")
    out_md = os.path.join(QC, name + ".md")
    if os.path.exists(out_md):
        print("SKIP (already qc)", name, flush=True); continue
    r = subprocess.run([PY, GLM, img, "raw_bg", desc, out_md],
                       capture_output=True, text=True, encoding="utf-8", errors="replace")
    raw = (r.stdout or "")
    m = re.search(r"VERDICT:\s*(PASS|FAIL)", raw)
    print("QC", name, "->", m.group(1) if m else "UNKNOWN", flush=True)
print("DONE ALL", flush=True)
