# -*- coding: utf-8 -*-
"""gen_npc10_r2.py — 背景带底部渐变/泛光的 5 张 NPC 重生成(v3, 严格平黑)。
问题: v1/v2 背景底部出现地面反光/变亮渐变(尤其明亮服装的 doctor/soldier),
floodfill 阈值16 无法清干净底部背景 → 外框残留不透明底条。
修正: 强化「绝对均匀平黑、无地面、底部与顶部一致暗、双腿下部不被反光打亮为背景亮斑」。
用法: <comfy-python> gen_npc10_r2.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gen_wan import gen  # noqa: E402

BASE = r"C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1"
RAW = os.path.join(BASE, "tools", "design", "raw_npc10")
os.makedirs(RAW, exist_ok=True)

STRICT_BG = (
    "Background: ABSOLUTELY UNIFORM flat pure black, every pixel of the background is the "
    "SAME dark matte black from the very top of the frame to the very bottom, INCLUDING the "
    "area directly below the feet and behind the lower legs. There is NO ground, NO floor, "
    "NO floor reflection, NO floor glow, NO lighter band or gradient along the bottom of the "
    "frame, NO shadow pool under the feet, NO glow creeping off the character's lower body "
    "onto the background. The region below the character's knees and the empty space behind "
    "the feet is pure background black identical to the top corners. The character's own "
    "clothing (including pants, shoes, coat hem) is lit by the front key light, but that light "
    "must NOT spill onto the background around the character. no white glow, no rim-light "
    "halo, no stray specks."
)

BODY = (
    "Standing centered full body portrait, showing head to feet, "
    "feet soles touching the very bottom edge of the frame (soles cropped slightly by the "
    "bottom frame edge)."
)

CHAR = {
    "npc_guard": "A serious professional security guard, adult Asian man, wearing a dark-blue "
                 "security guard uniform with badge and shoulder patches, black peaked cap, "
                 "holding a compact black pistol with both hands down at his sides (holstered "
                 "position, hands resting on the weapon at his waist), stern calm face. ",
    "npc_merchant": "A shrewd merchant, middle-aged man, well-groomed, wearing a neat dark vest and "
                    "white shirt with a necktie, gold pocket watch chain, holding a small coin purse, "
                    "cunning calculating eyes, confident upright posture. ",
    "npc_doctor": "A calm doctor, adult male, wearing a clean white doctor coat over light clothes "
                  "with a stethoscope around the neck, holding a clipboard, professional neutral "
                  "expression. ",
    "npc_soldier": "A combat soldier, adult man, wearing a dark-green military field uniform with "
                   "body armor vest and helmet, both hands in identical black gloves holding a rifle "
                   "with the muzzle pointing up safely, alert stern face. ",
    "npc_elder": "A frail elderly man with short white hair and a long white beard, deep wrinkles, "
                 "wearing a simple long dark robe, leaning on a wooden walking staff held in one "
                 "hand, kind but weary face. ",
}

for slug in CHAR:
    # 逐次轮流生成, v3 后缀
    out = os.path.join(RAW, "%s_v3.png" % slug)
    prompt = CHAR[slug] + BODY + " " + STRICT_BG
    ok = gen(prompt, "768x1024", out)
    print("GENERATE %s_v3 -> %s" % (slug, "OK" if ok else "FAIL"), flush=True)
print("ALL_DONE", flush=True)
