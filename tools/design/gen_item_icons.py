# -*- coding: utf-8 -*-
"""gen_item_icons.py — 6 个道具图标生成(wan2.7-image, 方形纯黑底)。

命名与提示词:
  item_health 血瓶      — 玻璃瓶中红色发光药水
  item_core    能量核心  — 发光能量球体核心
  item_holy    圣水      — 圣光水瓶
  item_rune    符文      — 发光符文石
  item_stone   强化石    — 结晶强化石
  item_fragment 法宝碎片 — 碎裂发光法宝残片
要求: 方形纯黑底/透明底图标, 主体居中占比大, 无白描边, 无文字。
每个输出到 npc_icons/item_<slug>.png (方形)。
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gen_wan import gen  # noqa: E402

SIZE = "768x768"

ITEMS = {
    "item_health": (
        "A circular game item icon centered on a flat pure black background: a glass round "
        "vial filled with glowing red healing potion liquid, small bright highlights, thick "
        "glass rim clearly bright, a simple cork top. The whole object is brightly lit, "
        "clearly brighter than the pure black background, occupying about 75% of the frame, "
        "centered. Absolutely flat uniform pure black (#000000) background with NO glow, NO "
        "floor, NO reflection, NO vignette. Absolutely NO white outline, NO rim light, NO "
        "text, NO watermark. High detail game icon, square."
        "圆形道具图标居中纯黑底, 红色发光血瓶占画面约75%, 高亮, 无地面无反射无白描边无文字"
    ),
    "item_core": (
        "A circular game item icon centered on a flat pure black background: a glowing "
        "cyan-blue energy core, a bright crystalline sphere of pulsing energy with tiny "
        "electric arcs on its surface, vibrant glow emanating from the sphere visibly "
        "brighter than the black background. Occupying about 75% of the frame, centered. "
        "Absolutely flat uniform pure black (#000000) background with NO floor, NO "
        "reflection. No excessive glow bleed outside the object. NO white outline rim, NO "
        "text, NO watermark. High detail game icon, square."
        "圆形道具图标居中纯黑底, 青蓝发光能量核心球体占画面约75%, 表面电弧, 无地面无白描边无文字"
    ),
    "item_holy": (
        "A circular game item icon centered on a flat pure black background: a glass flask "
        "filled with radiant holy water glowing soft warm white-gold light, a small cross "
        "mark on the flask, bright clear highlights. Occupying about 75% of the frame, "
        "centered. Absolutely flat uniform pure black (#000000) background with NO glow "
        "bleed, NO floor, NO reflection, NO vignette. Absolutely NO white outline rim, NO "
        "text, NO watermark. High detail game icon, square."
        "圆形道具图标居中纯黑底, 圣光白金色发光圣水瓶占画面约75%, 瓶身十字纹, 无地面无白描边无文字"
    ),
    "item_rune": (
        "A circular game item icon centered on a flat pure black background: an ancient "
        "hexagonal rune stone glowing with purple arcane runes etched into its surface and "
        "floating, subtle glowing purple energy. Occupying about 75% of the frame, centered. "
        "Absolutely flat uniform pure black (#000000) background with NO glow bleed beyond "
        "the rune, NO floor, NO reflection. NO white outline rim, NO text, NO watermark. "
        "High detail game icon, square."
        "圆形道具图标居中纯黑底, 紫色发光远古符文石占画面约75%, 六边形表面刻符文, 无地面无白描边无文字"
    ),
    "item_stone": (
        "A circular game item icon centered on a flat pure black background: a sharp-cut "
        "crystal strengthening stone with a warm orange inner glow, faceted amber-red crystal "
        "shard, bright. Occupying about 75% of the frame, centered. Absolutely flat uniform "
        "pure black (#000000) background with NO glow bleed, NO floor, NO reflection. NO "
        "white outline rim, NO text, NO watermark. High detail game icon, square."
        "圆形道具图标居中纯黑底, 橙红光内部发光的强化结晶石占画面约75%, 多棱切面, 无地面无白描边无文字"
    ),
    "item_fragment": (
        "A circular game item icon centered on a flat pure black background: a fragment of a "
        "broken glowing golden artifact weapon tip, a jagged ancient golden relic shard with "
        "a faint golden glow along its broken edge, few floating golden particles. Occupying "
        "about 75% of the frame, centered. Absolutely flat uniform pure black (#000000) "
        "background with NO glow bleed beyond the particles, NO floor, NO reflection. NO "
        "white outline rim, NO text, NO watermark. High detail game icon, square."
        "圆形道具图标居中纯黑底, 断裂金色发光法宝残片占画面约75%, 破损边缘泛金光, 少量金色粒子, 无地面无白描边无文字"
    ),
}

BASE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(BASE, "npc_icons")

if __name__ == "__main__":
    os.makedirs(OUT_DIR, exist_ok=True)
    results = {}
    for slug, prompt in ITEMS.items():
        out = os.path.join(OUT_DIR, slug + ".png")
        ok = gen(prompt, SIZE, out)
        results[slug] = ok
        print("RESULT[%s]: %s -> %s" % (slug, "OK" if ok else "FAIL", out), flush=True)
    failed = [k for k, v in results.items() if not v]
    print("ALL_DONE failed=%s" % failed, flush=True)
    sys.exit(0 if not failed else 1)
