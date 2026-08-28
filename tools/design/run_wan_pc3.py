# -*- coding: utf-8 -*-
"""run_wan_pc3.py — pc_zhengzha(郑吒)立绘 v3 生成。
qc_wan_pc2 判定需重生成,真实缺陷 = 底部地面反光/投影(背景非纯黑,复现历史 c5/c6 泛光缺陷)。
修正:①背景措辞强化为绝对平面纯黑、无反光/无投影/无渐变/无辉光;②脚掌被画面底缘轻微裁切(真正贴底);
③保持郑吒健康战士设定(亚洲青年、深灰蓝T恤、深色战术裤、战士站姿)——角色设定没有错。
输出 raw_enemy/pc_wan3.png。
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gen_wan import gen  # noqa: E402

PROMPT = (
    "A Chinese young man with short black hair, dark serious expression, wearing a dark "
    "grayish-blue fitted T-shirt and dark cargo pants, in a heroic battle stance with fists "
    "clenched. He is a normal healthy human warrior, NOT a zombie, NOT mutated. "
    "His whole body including the dark clothing is brightly lit by a cool white key light "
    "from the front, clearly brighter than the background; no part of his body or clothing "
    "is the same color as the background. Both hands are fully visible with clear separate "
    "fingers, no merged or blurry fingers. "
    "LARGE full body taking up over 90% of the image height, feet soles and shoes touching "
    "the very bottom edge of the frame, the shoe soles cropped slightly by the bottom frame "
    "edge, standing centered. "
    "Background: flat pure black, absolutely uniform matte black, completely dark, "
    "NO floor reflection, NO ground shadow, NO light gradient, NO glow, NO haze, "
    "no visible ground plane at all, nothing behind the character. "
    "A thin cool-white rim light outlines the silhouette (hair, shoulders, arms, torso, "
    "legs, clothing hem) as a clean thin line only, no white glow bleeding into the "
    "background. High detail, sharp, single character. "
    "全身站姿居中, 角色放大, 脚掌紧贴画面底缘被轻微裁切, 背景纯黑无反光"
)

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "raw_enemy", "pc_wan3.png")

if __name__ == "__main__":
    ok = gen(PROMPT, "768x1024", OUT)
    print("RESULT: %s -> %s" % ("OK" if ok else "FAIL", OUT), flush=True)
    sys.exit(0 if ok else 1)