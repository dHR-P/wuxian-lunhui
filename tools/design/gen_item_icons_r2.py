# -*- coding: utf-8 -*-
"""gen_item_icons_r2.py — 重生成 QC FAIL 的 4 个道具图标。
根因: 上一轮用「发光/glow」描述导致强光晕泄入纯黑背景 + 玻璃/物体边缘亮白高光描边,
违反「纯黑平底 + 无白描边 + 无光晕污染」。本轮弱化发出的光、只保留物体本体高光,
并明确「无光环/无光晕外泄, 物体轮廓外即纯黑平底」。
对象本身仍高亮(明显亮于黑底), 但不向背景发光、无白色边缘描边。
重生成: item_health, item_core, item_holy, item_stone (768x768 纯黑底方形)。
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gen_wan import gen  # noqa: E402

SIZE = "768x768"

COMMON = (
    "A clean flat game item icon on a perfectly uniform pure black (#000000) background. "
    "The single item sits centered occupying about 70% of the frame. The item itself is "
    "evenly lit by a cool key light and looks clearly brighter than the background, with "
    "local bright details INSIDE its own silhouette only. "
    "CRITICAL: the item emits NO glow, NO light halo, NO light beam into the background; "
    "the area surrounding the item remains absolutely uniform pure black edge to edge, "
    "NO radial falloff, NO color tint near the object. "
    "The item has NO bright white outline, NO white rim, NO white border on its silhouette; "
    "its edges terminate cleanly against the black background. "
    "NO text, NO watermark, NO emblem, NO decoration ring. Flat 2D game icon, sharp."
)

ITEMS = {
    "item_health": (
        "a glass round vial of red healing potion, thick clear glass, red liquid halfway up, "
        "simple cork top, the glass rims drawn with thin structured highlights, red liquid "
        "glowing only within the glass."
        "纯黑平底上居中的玻璃圆瓶血瓶图标, 玻璃边缘仅结构化细高光无荧光晕, 红色药液仅在瓶内发光不外溢"
    ),
    "item_core": (
        "a small crystalline cyan energy core sphere with crisp faceted facets, cool cyan "
        "energy swirl ONLY inside the sphere, static not bursting, no electric arcs escaping."
        "纯黑平底上居中的青蓝水晶能量核心球体图标, 冷光仅存于球体内不外溢, 无电弧外溢"
    ),
    "item_holy": (
        "a glass flask of holy water with a small cross mark, water is soft warm white-gold "
        "lit only within the flask, shaped highlights on the glass, no light escaping."
        "纯黑平底上居中的圣水瓶图标, 温水金白光仅存于瓶内, 玻璃结构化高光, 无光外溢"
    ),
    "item_stone": (
        "a chunky multi-faceted amber-orange crystal strengthening stone, warm inner color "
        "in the facets only, no glow halo around it, no extra ring element."
        "纯黑平底上居中的多棱琥珀橙结晶强化石图标, 暖色仅在切面内部, 无光晕无额外圆环"
    ),
}

BASE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(BASE, "npc_icons")

if __name__ == "__main__":
    os.makedirs(OUT_DIR, exist_ok=True)
    for slug, body in ITEMS.items():
        out = os.path.join(OUT_DIR, slug + ".png")
        prompt = COMMON + "\n" + body
        ok = gen(prompt, SIZE, out)
        print("RESULT[%s]: %s -> %s" % (slug, "OK" if ok else "FAIL", out), flush=True)
    print("ALL_DONE", flush=True)
