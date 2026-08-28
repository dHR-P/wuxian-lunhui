# -*- coding: utf-8 -*-
"""regen_boss50_r3.py — 对 r2 仍 FAIL 的 kuangxie/poxujiezhe 做 r3 定向修复。
kuangxie: 强制脚掌贴底缘裁切。
poxujiezhe: 去掉背景光晕晕, 主体趋暗实体, 辉光仅收敛在衣袍内, 并强制脚贴底。
输出: tools/design/raw_boss50/boss_<slug>_r3.png
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gen_wan import gen  # noqa: E402

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "raw_boss50")
os.makedirs(OUT_DIR, exist_ok=True)

# 强调贴底 + 禁背景光晕 的紧凑后缀
R3_SUFFIX = (
    "The figure is EXTREMELY tall, crown of the head reaching very close to the top edge and "
    "the soles of the feet pressing FLUSH against the very bottom edge of the frame, the feet "
    "and shins cropped slightly by the bottom border. The body is a crisp dark silhouette evenly "
    "lit by a cool white front key light only, hard clean edges, absolutely NO back-light, NO "
    "rim light, NO halo, NO white or grey glow bleeding into the flat pure black (#000000) "
    "background, background uniform matte black, single standing character. High detail, sharp. "
    "脚掌紧贴底缘裁切, 头顶贴近上缘, 背景纯黑无辉光白边, 主体边缘硬朗干净"
)

R3 = {
    "kuangxie": (
        "A battlefield cursed war-crazed legion commander: towering barbaric warrior in crude "
        "ancient bronze-and-iron battle armor crusted with dried blood and rust, large horned "
        "helmet, a great blade held at the side, fierce martial aura, blood-red war paint and a "
        "ragged war banner, commanding undying battle-dread."
    ),
    "poxujiezhe": (
        "A xianxia transcendent realm-breaker invader: a tall OTHERWORLDLY transcendent cultivator "
        "clad in dark flowing xianxia robes etched with faint golden-white void-law runes, the "
        "glow kept INSIDE the robes as thin contained line accents only, dark fabric dominant, "
        "hands raised holding faint crackling void-light at the palms (tiny contained sparks, "
        "no spread into background). Calm awe-crushing presence, crisp dark silhouette against "
        "pure black."
    ),
}


def run():
    slugs = sys.argv[1:] if len(sys.argv) > 1 else list(R3.keys())
    for slug in slugs:
        out = os.path.join(OUT_DIR, "boss_%s_r3.png" % slug)
        print(">>> regenerating r3 boss_%s" % slug, flush=True)
        ok = gen(R3[slug] + R3_SUFFIX, "768x1024", out)
        print("RESULT r3 boss_%s: %s" % (slug, "OK" if ok else "FAIL"), flush=True)


if __name__ == "__main__":
    run()