# -*- coding: utf-8 -*-
"""gen_npc10_v2.py — 重试 npc_survivor / npc_soldier (v2)。修正前次细节偏差。
用法: <comfy-python> gen_npc10_v2.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gen_wan import gen  # noqa: E402

BASE = r"C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1"
RAW = os.path.join(BASE, "tools", "design", "raw_npc10")
os.makedirs(RAW, exist_ok=True)

SUFFIX = (
    "Standing centered full body portrait, showing head to feet, "
    "feet soles touching the very bottom edge of the frame (soles cropped "
    "slightly by the bottom frame edge). Background: flat pure black, absolutely "
    "uniform matte black, NO floor reflection, NO ground shadow, NO light gradient, "
    "NO glow, NO haze, no visible ground plane, nothing behind the character. "
    "The character is lit by an even cool front key light, clearly brighter than the "
    "background, silhouette has clean hard edges; absolutely NO white glow, NO white "
    "outline, NO rim-light halo bleeding into the black background, no stray white "
    "specks. High detail, sharp, single character, full body within the frame."
)

RETRY = {
    "npc_survivor": (
        "A frightened civilian survivor, adult man in his 30s, torn and stained dark jacket "
        "over a rumpled shirt, dust and scratches on his face, wide alarmed frightened eyes, "
        "cowering with BOTH ARMS CROSSED AND HUGGING HIS OWN CHEST, body hunched and shrunk "
        "inward, hands empty, holding nothing, no object in his hands. " + SUFFIX
    ),
    "npc_soldier": (
        "A combat soldier, adult man, wearing a dark-green military field uniform with body "
        "armor vest and helmet, both hands WEARING identical black tactical gloves, holding a "
        "rifle with the MUZZLE POINTING UP-AND-AWAY toward the sky (safe carry, not pointing at "
        "anyone), alert stern face. " + SUFFIX
    ),
}

for slug in RETRY:
    out = os.path.join(RAW, "%s_v2.png" % slug)
    ok = gen(RETRY[slug], "768x1024", out)
    print("GENERATE %s_v2 -> %s" % (slug, "OK" if ok else "FAIL"), flush=True)
print("ALL_DONE", flush=True)
