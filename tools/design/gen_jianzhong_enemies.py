# -*- coding: utf-8 -*-
"""gen_jianzhong_enemies.py — 剑冢禁地 4 张敌人立绘生成(高优先).
依据 jianzhong.md §9: 锈剑傀儡/守墓剑仆·灰袍/剑冢怨灵·游魂/入魔剑客·残影。
BODY: 纯黑底贴底缘, 全身, 冷白 rim light → 供 flood-fill 抠图。
输出: tools/design/raw_jianzhong/enemy_*.png (768x1024)
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gen_wan import gen  # noqa: E402

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "raw_jianzhong")
os.makedirs(OUT_DIR, exist_ok=True)

REV2 = (
    "full body, standing centered, the figure is large filling nearly all the frame "
    "height, feet and lower robe cropped by the bottom frame edge (feet NOT fully "
    "visible). No outline, no contour line, no edge glow, no halo, no light spill "
    "around the figure — clean hard cut edge with NO bright border. Everything else "
    "in the frame is absolutely flat solid pure black (#000000) empty void: no fog, "
    "no mist, no smoke, no glow, no reflection, no ground plane, no secondary object. "
    "The figure is dimly lit by a single faint cold key light so it is distinguishable "
    "from the black but stays matte and dark. High detail, sharp, single character. "
    "全身居中放大占满高度, 脚与袍下摆被画面底缘裁掉不可完整看见; 角色整体偏暗哑光, 绝无轮廓线/勾边/描边/辉光, 画面其余部分绝对整幅纯黑实心空白, 无雾无光晕无地表"
)

ENEMIES = [
    {
        "name": "enemy_jiangu",  # 锈剑傀儡
        "out": "enemy_jiangu",
        "prompt": (
            "锈剑傀儡: 一个由断剑残刃和锈铁片拼接而成的人形傀儡, 关节处锈红色, "
            "两条手臂由交错的锈剑刃组成, 眼窝嵌着两片碎裂的剑刃发光, 躯干覆盖青铜锈铁板, "
            "盔甲般, 浑身铁锈与古旧感, 行动机械僵硬, 恐怖古代机关造物。"
            + REV2
        ),
    },
    {
        "name": "enemy_jipu",  # 守墓剑仆·灰袍
        "out": "enemy_jipu",
        "prompt": (
            "守墓剑仆·灰袍: 一名灰袍佝偻的老仆, 双手怀抱一柄没鞘的锈剑抵在胸前, "
            "面容枯老垂目安详, 灰旧粗麻布袍, 腰间束带, 满身尘土与风霜, 沉默肃穆的守墓人。"
            + REV2
        ),
    },
    {
        "name": "enemy_yuanling",  # 剑冢怨灵·游魂
        "out": "enemy_yuanling",
        "prompt": (
            "剑冢怨灵·游魂: 半透明的人形怨灵, 无面, 身形流曳像暗青烟气, "
            "身后拖曳一道巨大剑形虚影, 周身缠绕幽蓝惨绿的灵光, 双手低垂, 怨念缠身, 飘浮姿态, 冷雾弥漫。"
            + REV2
        ),
    },
    {
        "name": "enemy_rumoke",  # 入魔剑客·残影
        "out": "enemy_rumoke",
        "prompt": (
            "入魔剑客·残影: 一名入魔的剑客残影, 黑红剑袍破损翻飞, 双眼血瞳, "
            "手中长剑剑身缠绕黑色魔气与红丝, 发丝狂乱, 杀气狰狞, 身体半透明如残留影像, 邪气森然。"
            + REV2
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