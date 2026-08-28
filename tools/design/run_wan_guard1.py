# -*- coding: utf-8 -*-
"""run_wan_guard1.py — guard(守卫)敌人立绘 v1 生成。
正式设定:守卫 = 穿着防暴装备/制服的全副武装人类守卫(防暴甲、战术背心、盾/器械,立姿警戒,非丧尸)。
背景负面强化去白描边/轮廓光(修复上代 guard 白描边/伪影缺陷的 prompt 层根治)。
输出 raw_enemy/guard_wan1.png。
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gen_wan import gen  # noqa: E402

PROMPT = (
    "An armed human guard in full riot gear, wearing a black riot armor vest, shoulder "
    "pauldrons and tactical gear, holding a riot shield and a short baton, in a standing "
    "alert guard stance, armor straps clearly visible. He is a normal healthy human guard, "
    "NOT a zombie, NOT mutated. "
    "His whole body including the dark armor is brightly lit by a cool white key light from "
    "the front, clearly brighter than the background; no part of his body or gear is the "
    "same color as the pure black background. Both hands fully visible with clear separate "
    "fingers, the riot shield and baton clearly separated from the arms and body, no merged "
    "parts. "
    "LARGE full body taking up over 90% of the image height, feet soles touching the very "
    "bottom edge of the frame, soles cropped slightly by the bottom frame edge with almost "
    "no empty margin below. Standing centered. "
    "Background: flat pure black, absolutely uniform matte black, completely dark, "
    "NO floor reflection, NO ground shadow, NO light gradient, NO glow, NO haze, "
    "no visible ground plane at all, nothing behind the character. "
    "Absolutely NO white outline, NO rim light, NO halo; the silhouette must terminate "
    "cleanly and flat against the pure black background, absolutely no white border on any "
    "edge of the character's silhouette. "
    "High detail, sharp, single character. "
    "全身站姿居中, 脚掌紧贴底缘被轻微裁切且下方几乎无留白, 背景纯黑, 无白描边无轮廓光无地面反光无投影"
)

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "raw_enemy", "guard_wan1.png")

if __name__ == "__main__":
    ok = gen(PROMPT, "768x1024", OUT)
    print("RESULT: %s -> %s" % ("OK" if ok else "FAIL", OUT), flush=True)
    sys.exit(0 if ok else 1)