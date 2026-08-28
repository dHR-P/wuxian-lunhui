# -*- coding: utf-8 -*-
"""run_wan_zombie1.py — zombie(丧尸)敌人立绘 v1 生成。
正式设定:丧尸 = 腐坏人类丧尸(烂衣血污、灰白腐皮、直立踉跄,恐怖但可辨识;区别于守卫/主角)。
背景负面强化去白描边;prompt 明示 smooth anti-aliased silhouette,修复上代僵尸"轮廓锯齿缺抗锯齿"缺陷。
输出 raw_enemy/zombie_wan1.png。
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gen_wan import gen  # noqa: E402

PROMPT = (
    "A decayed rotting human zombie, grayish rotten skin with visible wounds and torn "
    "blood-stained ragged clothing, shambling upright in a hunched walking pose, arms "
    "slightly raised, decaying flesh visible. Single character, full body. "
    "His whole body including the darker rotten areas is lit by a cool white key light from "
    "the front, clearly brighter than the background; every limb is separated from the pure "
    "black background by a clear luminous edge, no body part is the same color as the "
    "background, sharp clean anti-aliased silhouette. Both hands fully visible with clear "
    "separate fingers, no merged or blurry fingers. "
    "LARGE full body taking up over 90% of the image height, feet soles touching the very "
    "bottom edge of the frame, soles cropped slightly by the bottom frame edge with almost "
    "no empty margin below. Standing centered. "
    "Background: flat pure black, absolutely uniform matte black, completely dark, "
    "NO floor reflection, NO ground shadow, NO light gradient, NO glow, NO haze, "
    "no visible ground plane at all, nothing behind the character. "
    "Absolutely NO white outline, NO rim light, NO halo; the silhouette must terminate "
    "cleanly and flat against the pure black background with smooth anti-aliased edges, "
    "absolutely no white border on any edge of the character's silhouette. "
    "High detail, sharp, single character. "
    "全身站姿居中, 脚掌紧贴底缘被轻微裁切且下方几乎无留白, 背景纯黑, 无白描边无轮廓光, 轮廓平滑抗锯齿"
)

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "raw_enemy", "zombie_wan1.png")

if __name__ == "__main__":
    ok = gen(PROMPT, "768x1024", OUT)
    print("RESULT: %s -> %s" % ("OK" if ok else "FAIL", OUT), flush=True)
    sys.exit(0 if ok else 1)