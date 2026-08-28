# -*- coding: utf-8 -*-
"""qc_checker50.py — 对 checkerboard 合成版 cutout 做 glm 终审(透明确认版)。
用法: python qc_checker50.py [slug1 ...]
输入: tools/design/ck_preview/boss_<slug>_ck.png
输出: tools/design/qc_boss50_cut/ck_<slug>.md + _results.json
判据: 在棋盘格底上主体干净、棋子格在背景区透出(证明真透明)、无大片不透明黑底残留/白描边/轮廓完整
"""
import json
import os
import subprocess
import sys

BASE = os.path.dirname(os.path.abspath(__file__))
CK = os.path.join(BASE, "ck_preview")
MQ = os.path.join(BASE, "glm_qc.py")
OUT = os.path.join(BASE, "qc_boss50_cut")
os.makedirs(OUT, exist_ok=True)

ALL_SLUGS = ["sanjiaotou", "fulaidi", "yizhong", "jixianti", "baojun", "miwujuwu",
             "xingshiwang", "juanzhe", "kuangxie", "shourenchaowang", "jixieronghe"]

EXPECT_TMPL = (
    "单个游戏BOSS立绘抠图被合成到灰白棋盘格底上, 用于证明PNG透明通道真实存在。"
    "判断: 1)背景区(主体外)应明显透出完整棋盘格, 证明是真透明PNG而非实心黑底; "
    "2)主体内不得有碍观感的大片实心不透明黑残留(例如四肢/手指/翅翼之间三角空隙应透出棋盘格而非黑块); "
    "3)主体轮廓完整无镂空吃穿, 无白描边/亮晕残留; 4)剪影清晰, 与棋盘格交界干净。"
    "逐项简短说明, 最后一行结论 PASS(可合成入库) 或 FAIL(说明具体问题)。"
)


def verdict_of(md):
    if not os.path.exists(md):
        return "NOFILE"
    with open(md, "r", encoding="utf-8") as f:
        txt = f.read()
    tail = txt[-50:]
    return "FAIL" if "FAIL" in tail else ("PASS" if "PASS" in txt else "NOFILE")


def main():
    slugs = sys.argv[1:] if len(sys.argv) > 1 else ALL_SLUGS
    results = {}
    for slug in slugs:
        img = os.path.join(CK, "boss_%s_ck.png" % slug)
        md = os.path.join(OUT, "ck_%s.md" % slug)
        if not os.path.exists(img):
            print("MISSING %s" % img, flush=True)
            results[slug] = {"status": "MISS", "file": img}
            continue
        print(">>> CK-QC boss_%s" % slug, flush=True)
        try:
            p = subprocess.run([sys.executable, MQ, img, "raw_lihui", EXPECT_TMPL, md],
                               cwd=BASE, capture_output=True, timeout=1200)
        except subprocess.TimeoutExpired:
            print(">>> CK-QC boss_%s TIMEOUT" % slug, flush=True)
            results[slug] = {"status": "TIMEOUT", "md": md}
            continue
        v = verdict_of(md)
        results[slug] = {"status": v, "md": md}
        print("VERDICT boss_%s: %s" % (slug, v), flush=True)
    with open(os.path.join(OUT, "_results_ck.json"), "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print("CK QC DONE", flush=True)


if __name__ == "__main__":
    main()