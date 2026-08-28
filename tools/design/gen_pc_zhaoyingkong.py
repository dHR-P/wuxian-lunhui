# -*- coding: utf-8 -*-
"""gen_pc_zhaoyingkong.py — 赵樱空(中洲队主战力/刺客)立绘生成。冷艳女刺客,
刺客世家天才,冷峻眼神。"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gen_wan import gen  # noqa: E402

PROMPT = (
    "A single full-body portrait of a Chinese cold beautiful young female assassin named "
    "Zhao Ying Kong, with long black hair, sharp icy cold eyes, a sleek dark ninja assassin "
    "outfit (dark fitted combat bodysuit with light grey straps, a short dark sash), standing "
    "in a poised ready stance with one hand on a hidden blade at her back, standing tall and "
    "centered. She is a normal healthy human assassin, NOT a zombie, NOT mutated, NOT a "
    "monster. "
    "Her whole body including dark clothing is brightly and evenly lit by a cool white key "
    "light from the front, clearly brighter than the pure black background; no part of the "
    "hair, face, suit, arms or boots is the same darkness as the background. "
    "HAIR AND HEAD CRITICAL: The long black hair must be rendered with clearly defined "
    "mid-brightness strands (cool highlights), visibly separated from the pure black "
    "background, a solid continuous hair mass with NO thin gaps or cracks connecting through "
    "to the background. There must be healthy clear pure black margin ABOVE the topmost hair "
    "so the head is fully inside the frame, never clipped. No wispy loose hair strands "
    "dissolving into black. "
    "FULL BODY: the whole figure from top of head to shoe soles takes up over 90% of image "
    "height; feet shoes touch the very bottom edge cropped slightly; standing centered with "
    "almost no margin below the feet. Both hands fully visible with clear separate fingers. "
    "Background: flat pure black absolute uniform matte #000000, NO vignette, NO gradient, "
    "NO floor reflection, NO ground shadow, NO glow, NO haze, no ground plane; bottom edge "
    "stays uniform pure black. "
    "Absolutely NO white outline, NO rim light, NO halo; silhouette must terminate cleanly "
    "and flat against the background, absolutely no white border. "
    "High detail, sharp, single character, 768x1024 vertical game portrait. "
    "全身单人立绘居中, 人物占画面高度90%以上, 脚掌贴底缘轻裁切; 冷艳女刺客, 长黑发, 冷峻锐利眼神, "
    "深色贴身刺客战斗服, 隐蔽刀刃姿态; 长发丝与纯黑背景干净分离, 头顶留足纯黑余量不出框; 纯黑#000000背景无暗角无渐变, "
    "脚下虚空无地面无反射, 无白描边无轮廓光无光晕"
)

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "raw_npc", "pc_zhaoyingkong.png")

if __name__ == "__main__":
    ok = gen(PROMPT, "768x1024", OUT)
    print("RESULT: %s -> %s" % ("OK" if ok else "FAIL", OUT), flush=True)
    sys.exit(0 if ok else 1)
