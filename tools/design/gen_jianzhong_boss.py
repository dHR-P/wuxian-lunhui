# -*- coding: utf-8 -*-
"""gen_jianzhong_boss.py — 剑冢禁地 BOSS「剑冢之灵·剑魔残魂」立绘生成。
依据 jianzhong.md §5/§9: 千百枯剑聚成的白发剑灵(剑魔残魂), 金瞳, 周身万剑绕行。
BODY: 纯黑底贴底缘, 全身, 冷白 rim light → 供 flood-fill 抠图。
输出: tools/design/raw_jianzhong/boss_jianling.png (768x1024)
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gen_wan import gen  # noqa: E402

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "raw_jianzhong")
os.makedirs(OUT_DIR, exist_ok=True)

REV2 = (
    "LARGE full body taking up over 90% of the image height, standing centered, "
    "feet and lower body touching the very bottom edge of the frame, the feet soles "
    "cropped slightly by the bottom frame edge. The whole body is lit by a thin "
    "cold-white rim light outlining the silhouette cleanly; the front is dim but "
    "clearly visible against the black ground. No part of the body is the same "
    "color as the background. "
    "Background: absolutely flat pure black (#000000), uniform matte black, completely dark, "
    "NO reflection, NO shadow, NO gradient, NO glow, NO haze, no visible ground plane at all. "
    "Rim light is a clean thin line only, no glow bleeding into the background. "
    "High detail, sharp, single character. "
    "全身站姿居中, 角色放大占满画面高度, 脚掌紧贴底缘被轻微裁切, 背景绝对平面纯黑无反光"
)

BOSS = {
    "name": "boss_jianling",
    "prompt": (
        "The Sword Tomb Spirit, a spectral sword-mage phantasm formed from thousands of "
        "ancient buried swords: a tall gaunt figure whose hair is long flowing white, "
        "whose golden pupils glow cold, and whose whole body and flowing robe are woven "
        "from countless rusted old swords and glowing sword shards. Hundreds of floating "
        "sword silhouettes orbit around him like a storm of blades. Limbs partially "
        "ethereal. Cold mist trailing. The face is human but glacial and sorrowful, "
        "ancient and majestic. "
        + REV2
    ),
}


def run():
    b = BOSS
    out = os.path.join(OUT_DIR, b["name"] + ".png")
    if os.path.exists(out):
        print("SKIP exists: %s" % out, flush=True)
        return
    print(">>> generating %s" % b["name"], flush=True)
    ok = gen(b["prompt"], "768x1024", out)
    print("RESULT %s: %s" % (b["name"], "OK" if ok else "FAIL"), flush=True)


if __name__ == "__main__":
    run()