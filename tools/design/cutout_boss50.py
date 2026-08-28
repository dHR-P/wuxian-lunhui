# -*- coding: utf-8 -*-
"""cutout_boss50.py — 对所有已 PASS 质检的 raw_boss50 立绘做 flood-fill 抠图。
用法: python cutout_boss50.py [slug1 slug2 ...]   (不给参数=处理全部)
抠图参数固定: 阈值16 | --seal 2 --closing 1 --feather 2 --hole-channel 6 --hole-solid --zero-rgb
输入: tools/design/raw_boss50/boss_<slug>.png
输出: tools/design/cutout_boss50/boss_<slug>.png
"""
import os
import subprocess
import sys

BASE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(BASE, "raw_boss50")
CUT = os.path.join(BASE, "cutout_boss50")
os.makedirs(CUT, exist_ok=True)
CUTTER = os.path.join(BASE, "..", "cutout_floodfill.py")

ALL_SLUGS = ["sanjiaotou", "fulaidi", "yizhong", "jixianti", "baojun", "miwujuwu",
             "xingshiwang", "juanzhe", "kuangxie", "shourenchaowang", "jixieronghe", "poxujiezhe"]

# 每个 BOSS 选定的 raw 立绘(带后缀), 由 raw QC PASS 决定
RAW_SUFFIX = {
    "sanjiaotou": "_r2",
    "fulaidi": "_r2",
    # yizhong / jixianti 为原图
    "baojun": "_r2",
    "miwujuwu": "_r2",
    "xingshiwang": "_r2",
    "juanzhe": "_r2",
    "kuangxie": "_r3",
    "shourenchaowang": "_r2",
    "jixieronghe": "_r2",
}


def main():
    slugs = sys.argv[1:] if len(sys.argv) > 1 else ALL_SLUGS
    for slug in slugs:
        src = os.path.join(RAW, "boss_%s%s.png" % (slug, RAW_SUFFIX.get(slug, "")))
        dst = os.path.join(CUT, "boss_%s.png" % slug)
        if not os.path.exists(src):
            print("MISSING RAW: %s" % src, flush=True)
            continue
        cmd = ["python", CUTTER, src, dst, "16",
               "--seal", "2", "--closing", "1", "--feather", "2",
               "--hole-channel", "6", "--hole-solid", "--zero-rgb"]
        print(">>> cutout boss_%s" % slug, flush=True)
        p = subprocess.run(cmd, cwd=BASE, capture_output=True, text=True)
        print(p.stdout[-2000:], flush=True)
        if p.returncode != 0:
            print("CUTOUT FAIL boss_%s: %s" % (slug, p.stderr[-1000:]), flush=True)
        else:
            print("CUTOUT OK boss_%s -> %s (exists=%s)" % (slug, dst, os.path.exists(dst)), flush=True)


if __name__ == "__main__":
    main()