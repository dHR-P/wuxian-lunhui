# -*- coding: utf-8 -*-
"""gen_zhouyuan_boss.py — 咒怨 BOSS 伽椰子全身立绘(raw)生成。
模型 wan2.7-image via tokenrhythm。输出 tools/design/raw_zhouyuan/boss_jiazi_raw.png

复用通用后缀 rev2(绝对平面纯黑背景 + 贴底缘) + 咒怨设定。
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gen_wan import gen  # noqa: E402

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "raw_zhouyuan")
os.makedirs(OUT_DIR, exist_ok=True)

# 复用 vs 通用后缀 rev2 基础段
BLACK_BG_SUFFIX = (
    "absolutely flat pure black background (#000000), NO reflection, NO shadow, "
    "NO gradient, NO glow; full body from head to feet, feet slightly clipped by "
    "bottom edge, clean silhouette"
)

PROMPT = (
    "A Japanese female vengeful spirit (怨灵伽椰子, from Ju-on), pale ghost girl "
    "with long straight unkempt black hair covering her face, a glimpse of deathly-white "
    "skin and dark hollow eye sockets, wearing a tattered soiled white kimono whose hem "
    "fades to black, her hair stretching long into the dark. She crawls on all fours "
    "low to the ground with head turned backwards over her shoulder 90 degrees looking "
    "at the viewer, overly long pale fingers with strands of black hair wrapped around "
    "them, body slightly translucent ghostly. Photorealistic horror portraits, "
    "silhouette strong, only a single dim cool light on the face. Whole body visible "
    "from head to feet, taking up over 90% of image height, centered, reaching down so "
    "her posture is cropped slightly by the bottom frame edge. "
    + BLACK_BG_SUFFIX +
    " 悲惨怨灵女鬼, 白衣和服, 黑发覆面, 四肢着地头颈反折回望, 贴底缘, 背景纯黑"
)


def run():
    out = os.path.join(OUT_DIR, "boss_jiazi_raw.png")
    ok = gen(PROMPT, "768x1024", out)
    print("RESULT: %s -> %s" % ("OK" if ok else "FAIL", out), flush=True)
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    run()