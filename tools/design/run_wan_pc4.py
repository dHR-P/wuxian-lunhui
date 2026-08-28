# -*- coding: utf-8 -*-
"""run_wan_pc4.py — pc_zhengzha(郑吒)立绘 v4 生成。

基于 pc_wan3 改造，改造要点：
  ① 背景负面强化到极致：flat pure black + 明示无白描边/无轮廓光/无白边。
  ② 移除原 "A thin cool-white rim light outlines..." 那句 —— 正是它烤出白描边。
  ③ 脚掌贴底缘、下方留白压到 ≤5%（原 10-15% 太多）。
  ④ 保留：冷白主光全前照明(深色衣裤不得与背景同色)、双手清晰分离、LARGE full body>90%。
中文后缀同步改成「全身站姿居中, 脚掌紧贴底缘被轻微裁切且下方几乎无留白, 背景纯黑无白描边无轮廓光」。
prompt 内明示 "Absolutely NO white border, NO white glow on any edge of the character's silhouette."

输出 raw_enemy/pc_wan4.png
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
    "edge, standing centered, leaving almost no empty space below the feet. "
    "Background: flat pure black, absolutely uniform matte black, completely dark, "
    "NO white outline, NO rim light, NO halo; the silhouette must terminate cleanly and flat "
    "against pure black background. NO floor reflection, NO ground shadow, NO light gradient, "
    "NO glow, NO haze, no visible ground plane at all, nothing behind the character. "
    "Absolutely NO white border, NO white glow on any edge of the character's silhouette. "
    "High detail, sharp, single character. "
    "全身站姿居中, 角色放大, 脚掌紧贴画面底缘被轻微裁切且下方几乎无留白, 背景纯黑无白描边无轮廓光"
)

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "raw_enemy", "pc_wan4.png")

if __name__ == "__main__":
    ok = gen(PROMPT, "768x1024", OUT)
    print("RESULT: %s -> %s" % ("OK" if ok else "FAIL", OUT), flush=True)
    sys.exit(0 if ok else 1)