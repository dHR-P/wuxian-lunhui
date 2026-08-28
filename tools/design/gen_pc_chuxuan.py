# -*- coding: utf-8 -*-
"""gen_pc_chuxuan.py — 楚轩(鸿钧转世)立绘生成。中洲队首席智者,大校,智商220,
基因改造人,天生无感情无表情。戴眼镜、军装/素净、冷静理性智者气质。"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gen_wan import gen  # noqa: E402

PROMPT = (
    "A single full-body portrait of a Chinese elite male military strategist named Chu Xuan, "
    "a calm emotionless genius with a cold rational expressionless thin face, wearing thin "
    "wire-rimmed glasses, dressed in a clean neat dark military officer uniform (dark olive "
    "green fitted uniform, neat collar, no decoration), arms hanging naturally, standing "
    "tall and centered. He is a normal healthy human intelligence staff officer, NOT a "
    "zombie, NOT mutated, NOT a monster. His cool detached intelligent gaze looks slightly "
    "down at the camera. "
    "His whole body including the dark uniform is brightly and evenly lit by a cool white "
    "key light from the front, clearly brighter than the pure black background; no part of "
    "the hair, face, glasses, uniform, limbs or boots is the same darkness as the background. "
    "HAIR AND HEAD CRITICAL: The short black hair on the head must be rendered as clearly "
    "defined mid-brightness hair strands (gray-blue highlights), clearly separated from the "
    "pure black background, completely covering the crown with a solid continuous mass, NO "
    "thin gaps or cracks connecting through to the background. There must be healthy clear "
    "pure black margin ABOVE the topmost hair so the head is fully inside the frame, never "
    "clipped. No wispy loose hair strands dissolving into black. "
    "FULL BODY: the whole figure from top of head to shoe soles takes up over 90% of image "
    "height; feet shoes touch the very bottom edge cropped slightly; standing centered with "
    "almost no margin below the feet. Both hands fully visible with clear separate fingers. "
    "Background: flat pure black absolute uniform matte #000000, NO vignette, NO gradient, "
    "NO floor reflection, NO ground shadow, NO glow, NO haze, no ground plane; bottom edge "
    "stays uniform pure black. "
    "Absolutely NO white outline, NO rim light, NO halo; silhouette must terminate cleanly "
    "and flat against the background, absolutely no white border on any edge. "
    "High detail, sharp, single character, 768x1024 vertical game portrait. "
    "全身单人立绘居中, 人物占画面高度90%以上, 脚掌贴底缘轻裁切; 冷峻无表情智者, 戴细框眼镜, 深军绿素净军装, "
    "整洁冷静军官气质; 短发发顶完整无缝隙与纯黑背景干净分离, 头顶留足纯黑余量不出框; 纯黑#000000背景无暗角无渐变, "
    "脚下虚空无地面无反射, 无白描边无轮廓光无光晕"
)

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "raw_npc", "pc_chuxuan.png")

if __name__ == "__main__":
    ok = gen(PROMPT, "768x1024", OUT)
    print("RESULT: %s -> %s" % ("OK" if ok else "FAIL", OUT), flush=True)
    sys.exit(0 if ok else 1)
