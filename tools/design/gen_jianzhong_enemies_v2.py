# -*- coding: utf-8 -*-
"""gen_jianzhong_enemies_v2.py — 3 张失败敌人立绘修正生成。
修正项(依 QC FAIL):
  enemy_jiangu_v2    : 脚贴底裁切+占满高度, 眼窝嵌碎剑刃(非发光缝), 躯干为断裂剑刃碎片层层拼接。
  enemy_yuanling_v2  : 极暗灵光/无白色辉光泄出, 四角纯黑无渐晕, 脚贴底裁切, 边缘干净实边。
  enemy_rumoke_v2    : 角色半透明残影(透叠), 剑身缠黑色魔气, 血瞳。
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gen_wan import gen  # noqa: E402

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "raw_jianzhong")
os.makedirs(OUT_DIR, exist_ok=True)

CLEAN_BG = (
    "full body, standing centered, figure large filling nearly all frame height, the "
    "feet and lower robe cropped by the bottom frame edge (feet NOT fully visible). "
    "No outline, no contour line, no edge glow, no halo, no light spill around the "
    "figure — clean hard cut edge, no bright border, no white rim, no corner vignette. "
    "All four corners are absolutely flat solid pure black. Entire background is uniform "
    "flat solid pure black (#000000): no fog, no mist, no smoke, no glow, no halo, no "
    "reflection, no ground plane. The figure is dimly lit by one faint cold key light, "
    "matte and dark, clearly separable from the black. High detail, sharp. "
    "全身居中放大占满高度, 脚与袍下摆被画面底缘裁掉不可完整看见; 角色整体偏暗哑光, 绝无轮廓线/勾边/描边/辉光/白边, 四角与全画面绝对整幅纯黑实心空白, 无雾无光晕无地表"
)

ENEMIES = [
    {
        "name": "enemy_jiangu_v2",
        "prompt": (
            "锈剑傀儡: 一个由断裂锈剑的刃片和铁片一层层交叠拼接而成的人形傀儡, 全身铠甲与四肢都是碎刃铁片铆接堆叠, "
            "关节处锈红色铆钉与铁筋, 眼窝嵌着两片向上翘的碎裂锈剑刃(不发光, 只是碎铁刃), "
            "躯干布满剑刃交错的接缝与铁锈, 古老机关感, 沉默沉重。"
            + CLEAN_BG
        ),
    },
    {
        "name": "enemy_yuanling_v2",
        "prompt": (
            "剑冢怨灵·游魂: 半透明的人形怨灵, 无面, 身形流曳如暗青烟气, 身后拖一道巨大暗色剑形虚影, "
            "周身只有极淡的冷蓝幽光围绕(几乎不发亮), 双手低垂, 飘浮, 光晕极弱, 边缘干净。"
            + CLEAN_BG
        ),
    },
    {
        "name": "enemy_rumoke_v2",
        "prompt": (
            "入魔剑客·残影: 一名入魔剑客的半透明残影幻影, 身体呈半透明青灰色透叠状, 隐约透出背景, "
            "黑红破损剑袍袖口飘飞, 双眼血瞳, 手中长剑剑身缠绕流动的黑色魔气与暗红细丝, 发丝狂乱, 阴森残影。"
            + CLEAN_BG
        ),
    },
]


def run():
    for e in ENEMIES:
        out = os.path.join(OUT_DIR, e["name"] + ".png")
        if os.path.exists(out):
            print("SKIP exists: %s" % out, flush=True)
            continue
        print(">>> generating %s" % e["name"], flush=True)
        ok = gen(e["prompt"], "768x1024", out)
        print("RESULT %s: %s" % (e["name"], "OK" if ok else "FAIL"), flush=True)


if __name__ == "__main__":
    run()