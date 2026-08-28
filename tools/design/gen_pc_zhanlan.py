# -*- coding: utf-8 -*-
"""gen_pc_zhanlan.py — 詹岚(中洲队精神力控制者)立绘生成。网络小说作家出身,
知性女性,现代装扮,温柔聪慧。"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gen_wan import gen  # noqa: E402

PROMPT = (
    "A single full-body portrait of a Chinese young intellectual woman named Zhan Lan, an "
    "elegant smart girl with shoulder-length dark hair, gentle intelligent eyes, a modern "
    "civic outfit (a neat light-beige blouse and dark slim trousers, standing naturally with "
    "one hand touching her chest), standing tall and centered. She is a normal healthy human "
    "woman, a psychic-supportist and novelist, NOT a zombie, NOT mutated, NOT a monster. "
    "Her whole body including dark hair is brightly and evenly lit by a cool white key light "
    "from the front, clearly brighter than the pure black background; no part of the hair, "
    "face, blouse, trousers or shoes is the same darkness as the background. "
    "HAIR AND HEAD CRITICAL: The shoulder-length dark hair must be rendered with clearly "
    "defined mid-brightness strands (warm highlights), visibly separated from the pure black "
    "background, a solid continuous hair mass fully covering the head with NO thin gaps or "
    "cracks connecting through to the background. There must be healthy clear pure black "
    "margin ABOVE the topmost hair so the head is fully inside the frame, never clipped. No "
    "wispy loose hair strands dissolving into black. "
    "FULL BODY: the whole figure from top of head to shoe soles takes up over 90% of image "
    "height; feet shoes touch the very bottom edge cropped slightly; standing centered with "
    "almost no margin below the feet. Both hands fully visible with clear separate fingers. "
    "Background: flat pure black absolute uniform matte #000000, NO vignette, NO gradient, "
    "NO floor reflection, NO ground shadow, NO glow, NO haze, no ground plane; bottom edge "
    "stays uniform pure black. "
    "Absolutely NO white outline, NO rim light, NO halo; silhouette must terminate cleanly "
    "and flat against the background, absolutely no white border. "
    "High detail, sharp, single character, 768x1024 vertical game portrait. "
    "全身单人立绘居中, 人物占画面高度90%以上, 脚掌贴底缘轻裁切; 知性温柔现代女性, 及肩深发, 米色衬衫深色长裤现代装扮; "
    "发顶发丝完整无缝隙与纯黑背景干净分离, 头顶留足纯黑余量不出框; 纯黑#000000背景无暗角无渐变, "
    "脚下虚空无地面无反射, 无白描边无轮廓光无光晕"
)

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "raw_npc", "pc_zhanlan.png")

if __name__ == "__main__":
    ok = gen(PROMPT, "768x1024", OUT)
    print("RESULT: %s -> %s" % ("OK" if ok else "FAIL", OUT), flush=True)
    sys.exit(0 if ok else 1)
