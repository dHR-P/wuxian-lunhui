# -*- coding: utf-8 -*-
"""run_wan_hunter.py — 用 wan2.7-image 正式生成 hunter 立绘(替代 Z-Image r7 系列)。
prompt 内嵌 UTF-8,避免 PowerShell 传参编码损坏。输出 raw_enemy/hunter_wan1.png。
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gen_wan import gen  # noqa: E402

PROMPT = (
    "A skinless muscular monster, pale gray-brown muscle skin, broad shoulders thick chest, "
    "solid dense torso with visible muscle blocks, thick muscular arms and legs, white bone "
    "spikes on forearms, huge claw on left hand and blade on right hand, fierce standing pose, "
    "no clothing no fabric. Entire body including the lower abdomen, hips and legs is brightly "
    "lit, muscular highlights clearly brighter than the pure black background; the lower body "
    "must be as bright and detailed as the upper body. "
    "Standing centered full body, feet on the bottom edge of the frame, pure black background, "
    "a distinct cool-white rim light outlines the entire silhouette (hair, shoulders, arms, "
    "torso, legs, hips) clearly separating the subject from the background, no background "
    "elements, no floor, no shadows on the ground, high detail, sharp, single character. "
    "全身站姿居中, 脚底贴近画面底缘"
)

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "raw_enemy", "hunter_wan1.png")

if __name__ == "__main__":
    ok = gen(PROMPT, "768x1024", OUT)
    print("RESULT: %s -> %s" % ("OK" if ok else "FAIL", OUT), flush=True)
    sys.exit(0 if ok else 1)