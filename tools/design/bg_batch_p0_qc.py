# -*- coding: utf-8 -*-
"""bg_batch_p0_qc.py — 对 raw_bg_batch_p0/ 下生成的 bg 逐张做视觉质检。
kind=raw_bg（空镜无人/无文字水印），QC 后输出每个 PASS/FAIL。
用法: D:\\AI_Tools\\ComfyUI\\python_embeded\\python.exe bg_batch_p0_qc.py [--regenerate-test]
"""
import os, sys, subprocess, re, shutil
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, "raw_bg_batch_p0")
QC = os.path.join(RAW, "qc")
PY = r"D:\AI_Tools\ComfyUI\python_embeded\python.exe"
GLM = os.path.join(HERE, "glm_qc.py")

# name -> 期望描述（给 QC 用）
EXPECT = {
    "bs_bg_airport": "现代机场候机厅空镜，冷白光，空旷无人，灾难前宁静",
    "bs_bg_highway": "夜间高速公路空镜，雨夜车灯光轨，车祸前寂静",
    "bs_bg_mall": "商场中庭空镜，玻璃穹顶，人群已散，扶梯与货梯",
    "bs_bg_cinema": "影院逃生楼梯间空镜，火光与警报红光，浓烟",
    "xingjichuanqi2_bg_mine": "废弃煤矿洞空镜，灰雾弥漫，矿车轨道，无人",
    "xingjichuanqi2_bg_hospital": "老式医院走廊空镜，冷光灯闪烁，空荡无人",
    "jialebi_bg_deck": "海盗船木质甲板空镜，帆布与缆绳，海景落日，无人",
    "jialebi_bg_cove": "加勒比沉船湾空镜，半沉海盗船残骸搁浅礁湾",
    "shenghua3_bg_underground": "浣熊市地下污水管网空镜，昏黄应急灯，无人",
    "shenghua3_bg_lab": "生物实验室孵化舱空镜，玻璃培养舱绿光，无人",
    "jishujing_bg_boiler": "梦境锅炉房空镜，巨大铸铁炉与蒸汽，炉火，无人",
    "jishujing_bg_highschool": "废弃高中教室走廊空镜，储物柜与冷光，无人",
}

def run_qc(img_path, desc, out_md):
    r = subprocess.run([PY, GLM, img_path, "raw_bg", desc, out_md],
                       capture_output=True, text=True, encoding="utf-8", errors="replace")
    raw = (r.stdout or "")
    m = re.search(r"VERDICT:\s*(PASS|FAIL)", raw)
    verdict = m.group(1) if m else "UNKNOWN"
    return verdict, raw

os.makedirs(QC, exist_ok=True)
names = [f[:-4] for f in os.listdir(RAW) if f.endswith(".png") and f not in ("qc",)]
names.sort()
report = {}
for name in names:
    img = os.path.join(RAW, name + ".png")
    if not os.path.exists(img):
        continue
    out_md = os.path.join(QC, name + ".md")
    verdict, raw = run_qc(img, EXPECT.get(name, name), out_md)
    report[name] = verdict
    print("QC", name, "->", verdict, flush=True)

print("=== QC SUMMARY ===", flush=True)
for k, v in report.items():
    print(k, v, flush=True)
