# -*- coding: utf-8 -*-
"""run_wan_guard2.py — guard(守卫)敌人立绘 v2 生成(wan 轮 5 = 第2轮重生成)。
wan 轮 4 guard_wan1 失败根因:黑色防暴甲是深色主体,在纯黑背景下天然难分离,下半身
(裤腿/下躯干)过暗融入背景,不满足「下半身明亮」;脚底留白~10%。修正:
①prompt 强化「全身装备尤其裤腿/下躯干受冷白主光均匀照亮、轮廓边缘明亮、任何部位
不得与纯黑背景同色」;
②脚底留白压到 ≤5%。
输出 raw_enemy/guard_wan2.png。
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
    "His entire body including every piece of the dark armor, the tactical kneepads, the "
    "shin guards, the boots and the lower torso / pants is brightly lit by a strong cool "
    "white key light from the front; every part of his gear is clearly brighter than the "
    "pure black background and separated from it by a clear luminous edge; absolutely NO "
    "part of his body or gear is the same dark color as the background, the lower body "
    "(pants, legs, boots) is as bright and detailed as the upper body, no dark silhouette. "
    "Both hands fully visible with clear separate fingers, the riot shield and baton clearly "
    "separated from the arms and body, no merged parts. "
    "LARGE full body taking up over 90% of the image height, feet soles touching the very "
    "bottom edge of the frame, soles cropped slightly by the bottom frame edge with almost "
    "no empty margin below (under 5%). Standing centered. "
    "Background: flat pure black, absolutely uniform matte black, completely dark, "
    "NO floor reflection, NO ground shadow, NO light gradient, NO glow, NO haze, "
    "no visible ground plane at all, nothing behind the character. "
    "Absolutely NO white outline, NO rim light, NO halo; the silhouette must terminate "
    "cleanly and flat against the pure black background, absolutely no white border on any "
    "edge of the character's silhouette. "
    "High detail, sharp, single character. "
    "全身站姿居中, 脚掌紧贴底缘被轻微裁切且下方留白≤5%, 装备全身受冷白主光均匀照亮尤其下半身明亮不融黑, 背景纯黑, 无白描边无轮廓光无地面反光无投影"
)

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "raw_enemy", "guard_wan2.png")

if __name__ == "__main__":
    ok = gen(PROMPT, "768x1024", OUT)
    print("RESULT: %s -> %s" % ("OK" if ok else "FAIL", OUT), flush=True)
    sys.exit(0 if ok else 1)