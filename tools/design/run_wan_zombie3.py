# -*- coding: utf-8 -*-
"""run_wan_zombie3.py — zombie(丧尸) v3 生成(wan 轮 6 = 第3轮重生成)。
zombie_wan2 仍失败:全身粗白描边(贴纸风格),绝对否定在 wan2.7 上顽固。修正尝试:
①prompt 改为「以亮色/灰色调人物 + 纯黑背景强对比,边缘靠冷色材质高光而非白描边」,
  明确要求 silhouette 是「暗色实边贴黑底、无任何亮色外框」;
②保留 smooth anti-aliased; ③脚底贴底。
输出 raw_enemy/zombie_wan3.png。(注:若生成仍带白边,后续用 edge_clean.py 后处理去边。)
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gen_wan import gen  # noqa: E402

PROMPT = (
    "A decayed rotting human zombie, grayish rotten skin, torn blood-stained ragged "
    "clothing, shambling upright hunched walking pose, arms slightly raised. "
    "Full body, single character. The zombie is rendered in layered gray-blue and gray "
    "tones with high internal shading; its silhouette edge is a DARK solid edge sitting "
    "directly against the flat pure black background, there is NO bright, colored, white or "
    "light outline of any kind around the body. The garment tatters and skin are lit by a "
    "cool white key light from the front with clear folds and texture, brighter than the "
    "background, no body part the same color as background. "
    "Both hands fully visible, clear separate fingers. "
    "LARGE full body taking up over 90% of the image height, feet soles touching the very "
    "bottom edge of the frame, soles cropped slightly by the bottom frame edge with almost "
    "no empty margin below. "
    "Background: flat pure black, absolutely uniform matte black, NO reflection, NO shadow, "
    "NO gradient, NO glow, NO haze. "
    "Absolute negatives: NO outline, NO border, NO white edge, NO sticker style, NO cartoon "
    "outline, NO halo, NO colored rim, NO light border; the character must read as a solid "
    "dark-rimmed figure fused into a black void, smooth anti-aliased edge. "
    "High detail, sharp, single character. "
    "全身站姿居中, 脚掌贴底缘留白极小, 人物呈灰蓝灰色调边缘暗实边贴黑底无任何亮色外框无描边无贴纸感, 背景纯黑, 轮廓平滑抗锯齿"
)

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "raw_enemy", "zombie_wan3.png")

if __name__ == "__main__":
    ok = gen(PROMPT, "768x1024", OUT)
    print("RESULT: %s -> %s" % ("OK" if ok else "FAIL", OUT), flush=True)
    sys.exit(0 if ok else 1)