# -*- coding: utf-8 -*-
"""gen_honghuang_boss.py — 银色大地 BOSS「机界升华体·瓦罗残响」两形态立绘生成。
依据 yinse_dadi.md §5 / §9.1:
  1. boss_waro_r1 : 半圣躯壳×机界升华装甲聚合巨像(第一形态 升华法阵·尸骸升天)
  2. boss_waro_r2 : 低纬度裂缝物质缠身、墨紫触须、眼柄漫布(第二形态 真理形态·天翻地覆)
BODY: 全贴底缘 + 绝对平面纯黑背景 rev2 后缀 → 供 flood-fill 抠图。
输出: tools/design/raw_honghuang/boss_*.png (768x1024)
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gen_wan import gen  # noqa: E402

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "raw_honghuang")
os.makedirs(OUT_DIR, exist_ok=True)

# 通用 rev2 后缀: 绝对平面纯黑背景 + 贴底缘, 便于抠图与 3D 立绘合成
REV2 = (
    "LARGE full body taking up over 90% of the image height, standing centered, "
    "feet and lower body touching the very bottom edge of the frame, the feet soles "
    "cropped slightly by the bottom frame edge. The whole body is brightly lit by a "
    "cool key light from the front, clearly brighter than the background; no part of "
    "the body is the same color as the background. "
    "Background: absolutely flat pure black (#000000), uniform matte black, completely dark, "
    "NO reflection, NO shadow, NO gradient, NO glow, NO haze, no visible ground plane at all. "
    "A thin cool-blue rim light outlines the silhouette as a clean thin line only, no glow "
    "bleeding into the background. High detail, sharp, single character. "
    "全身站姿居中, 角色放大占满画面高度, 脚掌紧贴底缘被轻微裁切, 背景绝对平面纯黑无反光"
)

BOSSES = [
    {
        "name": "boss_waro_r1",
        "prompt": (
            "A colossal amalgam deity-form boss, the fused husk of a demi-saint's body fused "
            "into ominous mechanical sublimation armor: an immense metal-encased humanoid "
            "giant with mechanical wings of corroded silver blades folded behind its back, "
            "its face eroded blank by sacred white light (featureless mask), the whole body "
            "riddled with inserted tubes and pipes leaking faint blue-white rune light. "
            "Silver-blue-white blooming armor over dark recessed joints, rust-orange ember "
            "accents at the seams. Menacing, sorrowful, heroic-scale dread. "
            + REV2
        ),
    },
    {
        "name": "boss_waro_r2",
        "prompt": (
            "The second form of the same colossal amalgam boss god: its mechanical "
            "sublimation armor now wrapped and overgrown with dark purple low-dimension "
            "corridor matter, writhing thick dark-purple tentacles coiling around the body, "
            "many eye-stalks spreading across the surface, a single remaining human eye on "
            "one side. Rust-orange ember seams partly swallowed by dark violet void-matter, "
            "crackling faint violet lightning threads. Tragic, monstrous, cosmic dread. "
            + REV2
        ),
    },
]


def run():
    for b in BOSSES:
        out = os.path.join(OUT_DIR, b["name"] + ".png")
        if os.path.exists(out):
            print("SKIP exists: %s" % out, flush=True)
            continue
        print(">>> generating %s" % b["name"], flush=True)
        ok = gen(b["prompt"], "768x1024", out)
        print("RESULT %s: %s" % (b["name"], "OK" if ok else "FAIL"), flush=True)


if __name__ == "__main__":
    run()