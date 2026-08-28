# -*- coding: utf-8 -*-
"""gen_jianzhong_boss_v3.py — 剑冢之灵 三次生成(修正 QC FAIL: 白色描边/非贴底)。
修正: 明确"无任何轮廓线/无描边/无勾边", 只有极细暗冷光; 角色贴近画面底部边缘脚被裁切。
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gen_wan import gen  # noqa: E402

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "raw_jianzhong")
os.makedirs(OUT_DIR, exist_ok=True)

V3 = (
    "full body, standing centered, the figure is very large filling nearly the entire "
    "frame height; the feet and the lower edge of the robe are cropped off by the bottom "
    "frame edge (feet NOT fully visible, cropped). The character is a dark metallic "
    "sword-spirit: body, robe, hair and limbs all rendered in dark iron/steel cold tones "
    "woven from many sword blades, so the figure itself is dark and its inner shading is "
    "dim — clearly darker than any light in the scene. "
    "There is NO outline, NO contour line, NO edge glow, NO halo, NO light spill around "
    "the figure at all — the transition from the figure edge to the background is a clean "
    "hard cut with NO bright border. "
    "Everything else in the frame is absolutely flat solid pure black (#000000) empty void: "
    "NO fog, NO mist, NO smoke, NO glow, NO reflection, NO ground, NO secondary object, "
    "nothing but the single dark figure. The single dim cold key light barely models the "
    "figure so it is distinguishable from the black but stays dark. "
    "High detail, sharp, single character. "
    "全身居中放大占满高度, 脚与袍下摆被画面底缘裁掉不可完整看见; 角色整体为暗铁冷灰色的由剑刃组成的身影本身偏暗, 绝无轮廓线/勾边/描边/辉光, 画面其余部分绝对整幅纯黑实心空白, 无雾无光晕无地表"
)


def run():
    out = os.path.join(OUT_DIR, "boss_jianling_v3.png")
    if os.path.exists(out):
        print("SKIP exists: %s" % out, flush=True)
        return
    print(">>> generating boss_jianling_v3", flush=True)
    prompt = (
        "A spectral sword-spirit boss, a sorrowful ancient white-haired sword-mage whose "
        "whole dark figure (robe, long white hair, limbs) is woven from countless rusted "
        "dark sword blades and sword shards, golden pupils faintly glowing. The figure is "
        "dark iron/steel toned and dimly lit, cropped by the bottom frame edge, facing "
        "forward, filling the frame height. A few small dim floating sword silhouettes in a "
        "tight ring around him, all well inside the frame. "
        + V3
    )
    ok = gen(prompt, "768x1024", out)
    print("RESULT boss_jianling_v3: %s" % ("OK" if ok else "FAIL"), flush=True)


if __name__ == "__main__":
    run()