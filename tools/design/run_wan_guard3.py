# -*- coding: utf-8 -*-
"""run_wan_guard3.py — guard(守卫) v3 生成(wan 轮 6 = 第3轮重生成)。
guard_wan2 仍失败:下半身(裤腿布料)偏暗融黑 + 边缘光晕。修正:
①prompt 强化「裤腿/大腿/小腿布料受冷白主光均匀照亮、布料有高光与纹理、与黑背景高对比、
  绝不与背景同色; 边缘光柔和不宜过亮」;
②脚底留白≤5%。
输出 raw_enemy/guard_wan3.png。
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gen_wan import gen  # noqa: E402

PROMPT = (
    "An armed human guard in full riot gear, wearing a black riot armor vest, shoulder "
    "pauldrons and tactical gear, holding a riot shield and a short baton, in a standing "
    "alert guard stance. He is a normal healthy human guard, NOT a zombie. "
    "His ENTIRE body including the dark armor AND every part of the fabric (the tactical "
    "pant legs, thighs, calves, lower torso) is brightly and evenly lit by a strong cool "
    "white key light from the front; the pant fabric has clear bright highlights, folds and "
    "texture so it stands out strongly against the pure black background; absolutely NO "
    "part of the lower body or gear is the same dark color as the background, the lower "
    "body is as bright and detailed as the upper body, no dark silhouette, high contrast "
    "between legs and background. Lighting is clean and even, soft, NOT over-bright on the "
    "edges. "
    "Both hands fully visible with clear separate fingers, the riot shield and baton clearly "
    "separated from the arms and body. "
    "LARGE full body taking up over 90% of the image height, feet soles touching the very "
    "bottom edge of the frame, soles cropped slightly by the bottom frame edge with under "
    "5% empty margin below. Standing centered. "
    "Background: flat pure black, absolutely uniform matte black, NO floor reflection, "
    "NO ground shadow, NO gradient, NO glow, NO haze, no visible ground plane. "
    "Absolutely NO white outline, NO strong rim light, NO halo; clean flat silhouette "
    "against the pure black background. "
    "High detail, sharp, single character. "
    "全身站姿居中, 脚掌紧贴底缘留白≤5%, 全身装备与裤腿受冷白主光均匀照亮尤其下半身布料明亮高对比不融黑, 边缘光柔和, 背景纯黑, 无白描边无轮廓光晕"
)

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "raw_enemy", "guard_wan3.png")

if __name__ == "__main__":
    ok = gen(PROMPT, "768x1024", OUT)
    print("RESULT: %s -> %s" % ("OK" if ok else "FAIL", OUT), flush=True)
    sys.exit(0 if ok else 1)