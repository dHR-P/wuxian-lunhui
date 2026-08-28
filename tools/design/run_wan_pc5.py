# -*- coding: utf-8 -*-
"""run_wan_pc5.py — pc_zhengzha(郑吒)立绘 v5 生成(wan 轮 5 = 第2轮重生成)。
wan 轮 4 pc_wan4 失败根因:底部两下角灰蓝地面反光/渐变(lum≈51-55),背景非纯黑
(历史 c5/c6、pc_wan2 泛光缺陷第 3 次复发)。修正:
①prompt 强化「脚下无任何地面/反光/渐变,脚下虚空纯黑,无地面无地板」;
②保持郑吒健康战士设定不变(亚洲青年、深灰蓝T恤、深色战术裤、战士站姿握拳、非丧尸)。
输出 raw_enemy/pc_wan5.png。
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
    "is the same color as the background. Both hands fully visible with clear separate "
    "fingers, no merged or blurry fingers. "
    "LARGE full body taking up over 90% of the image height, feet soles and shoes touching "
    "the very bottom edge of the frame, the shoe soles cropped slightly by the bottom frame "
    "edge, standing centered with almost no empty margin below the feet. "
    "Background: flat pure black, absolutely uniform matte black, completely dark, "
    "NO floor reflection, NO ground shadow, NO light gradient, NO glow, NO haze. "
    "There is NO ground plane, NO floor, NO ground, NO standing surface of any kind; the "
    "character floats in pure void black; there is nothing visible below the feet, no "
    "reflective or glowing floor at the bottom of the frame, the bottom edge stays uniform "
    "matte black exactly like the rest of the background. "
    "Absolutely NO white outline, NO rim light, NO halo; the silhouette must terminate "
    "cleanly and flat against the pure black background, absolutely no white border on any "
    "edge of the character's silhouette. "
    "High detail, sharp, single character. "
    "全身站姿居中, 脚掌紧贴底缘被轻微裁切且下方几乎无留白, 纯黑色虚空无地面无地板无反射无渐变, 背景纯黑, 无白描边无轮廓光"
)

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "raw_enemy", "pc_wan5.png")

if __name__ == "__main__":
    ok = gen(PROMPT, "768x1024", OUT)
    print("RESULT: %s -> %s" % ("OK" if ok else "FAIL", OUT), flush=True)
    sys.exit(0 if ok else 1)