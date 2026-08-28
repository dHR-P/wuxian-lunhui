# -*- coding: utf-8 -*-
"""run_wan_pc.py — 用 wan2.7-image 正式生成 pc_zhengzha 立绘 v2。
按 qwen 质检反馈修正:角色放大占画面 90%+、脚底紧贴画面底缘(留白 <2%)、双手手指清晰分开。
输出 raw_enemy/pc_wan2.png。
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gen_wan import gen  # noqa: E402

PROMPT = (
    "A Chinese young man with short black hair, dark serious expression, wearing a dark "
    "grayish-blue fitted T-shirt and dark cargo pants, in a heroic battle stance with fists "
    "clenched. His whole body including the dark clothing is brightly lit by a cool white "
    "key light, clearly brighter than the pure black background; no part of his body or "
    "clothing is the same color as the background. Both hands are fully visible with clear "
    "separate fingers, no merged or blurry fingers. "
    "LARGE full body taking up over 90% of the image height, feet soles touching the very "
    "bottom edge of the frame with minimal margin below the feet (less than 2% of image "
    "height), standing centered, pure black background, a distinct cool-white rim light "
    "outlines the entire silhouette (hair, shoulders, arms, torso, legs, clothing hem) "
    "clearly separating the subject from the background, no background elements, no floor, "
    "no shadows on the ground, high detail, sharp, single character. "
    "全身站姿居中, 角色放大, 脚底紧贴画面底缘"
)

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "raw_enemy", "pc_wan2.png")

if __name__ == "__main__":
    ok = gen(PROMPT, "768x1024", OUT)
    print("RESULT: %s -> %s" % ("OK" if ok else "FAIL", OUT), flush=True)
    sys.exit(0 if ok else 1)