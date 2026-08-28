# -*- coding: utf-8 -*-
"""gen_jianzhong_boss_v2.py — 剑冢之灵立绘 二次生成(修正QC FAIL)。
QC问题: 背景有灰雾纹理非纯黑 + 边缘青白辉光泄入背景 + 脚未贴底。
修正: 移除冷雾/灰雾描述, 明确整幅画面除主体与极细轮廓光外绝对纯黑实心,
      去除大面积辉光, 强调贴底占满。
输出: tools/design/raw_jianzhong/boss_jianling_v2.png
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gen_wan import gen  # noqa: E402

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "raw_jianzhong")
os.makedirs(OUT_DIR, exist_ok=True)

STRICT_REV2 = (
    "LARGE full body, standing dead-center, filling over 95% of the image height from "
    "head/crown to the very bottom edge; the feet and lower robe are cropped by the "
    "bottom frame edge (feet NOT fully visible). The entire frame outside the character "
    "silhouette is absolutely flat solid pure black (#000000) — a completely uniform empty "
    "void, NO fog, NO mist, NO smoke, NO cloud, NO haze, NO gradient, NO glow, NO reflection, "
    "NO ground plane, NO secondary element, nothing between or around the character. "
    "The only lighting is a single very thin hairline cold-white rim light exactly along "
    "the outer silhouette, no wider than 1-2 pixels, producing NO halo and bleeding nothing "
    "into the black. The character itself is clearly visible, matte, no part of it matches "
    "the black background. High detail, sharp, single character. "
    "全身居中标定, 头顶微裁也允许, 脚掌及下摆被底缘裁掉一小截, 画面除角色极细轮廓光外整幅绝对纯黑实心填空, 无任何雾/光晕/地表"
)


def run():
    out = os.path.join(OUT_DIR, "boss_jianling_v2.png")
    if os.path.exists(out):
        print("SKIP exists: %s" % out, flush=True)
        return
    print(">>> generating boss_jianling_v2", flush=True)
    prompt = (
        "A spectral sword-spirit boss, an ancient sorrowful white-haired sword-mage, "
        "golden pupils glowing cold and intense, robes and long white hair partly "
        "materialized from a mass of countless rusted sword blades and sword shards, "
        "a ring of a few floating sword silhouettes in a close tight circle around the "
        "body (small, dim, well inside the frame, not touching the edges). The figure "
        "is facing forward, taking the whole frame height, touching the bottom edge. "
        "Matte shading, sharp rim-light silhouette only. "
        + STRICT_REV2
    )
    ok = gen(prompt, "768x1024", out)
    print("RESULT boss_jianling_v2: %s" % ("OK" if ok else "FAIL"), flush=True)


if __name__ == "__main__":
    run()