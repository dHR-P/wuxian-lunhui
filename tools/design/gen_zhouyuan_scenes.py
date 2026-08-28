# -*- coding: utf-8 -*-
"""gen_zhouyuan_scenes.py — 咒怨副本场景图生成(wan2.7-image via tokenrhythm)。

场景清单(依据 design/zhttty_universe/wuxian_kongbu/zhouyuan.md §3/§6/§9.3):
  1. scene_house_exterior_v1  : 佐伯家宅外观 · 雨夜玄关(F1, 幕1开场, 灰蓝)
  2. scene_corridor_v1        : 二楼走廊惨绿壁纸(鼓包人形剪影, F2, 幕3)
  3. scene_room_v1            : 主卧婚礼照床头(门缝黑影, F2)
  4. scene_attic_v1           : 阁楼藏尸处(昏黄报纸反光, F3, 幕4)
  5. scene_battle_v1          : 地下室结界圈 BOSS 战场(惨白线+黑发铺地, F3, 幕5)

风格基调一致: 昏暗、冷色(惨绿/灰蓝)、氛围灯光, 纯背景无主体人物, 写实恐怖。
输出: tools/design/raw_zhouyuan/scene_*.png
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gen_wan import gen  # noqa: E402

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "raw_zhouyuan")
os.makedirs(OUT_DIR, exist_ok=True)

STYLE = (
    "Photorealistic Japanese haunted house horror scene, empty room background only, "
    "no people, no character, cinematic single wide shot, very dark gloomy mood, "
    "cold desaturated color grade leaning sickly green and gray-blue, wet rainy night "
    "ambience, atmospheric dim lighting, film grain, high detail, 768x1024 vertical"
)

SCENES = [
    {
        "name": "scene_house_exterior_v1",
        "prompt": (
            "The exterior front entrance of a traditional Japanese two-story wooden "
            "house (佐伯家 old haunted estate) on a rainy night. Old wooden noren-free "
            "doorway steps, dark wet wooden porch and sliding doors, a small pair of "
            "kid's rain boots left by the entrance. Falling rain, puddles reflecting "
            "cold blue light. Door slightly ajar, total darkness inside. "
            + STYLE
        ),
    },
    {
        "name": "scene_corridor_v1",
        "prompt": (
            "A long dim second-floor corridor of an old Japanese house, sickly green "
            "peeling wallpaper on both walls, wooden floor. At the far end the wallpaper "
            "bulges outward into a blurry humanoid silhouette shape as if something is "
            "pushing through from inside the wall. An old wall clock frozen showing 3:00. "
            "Single fluorescent tube flickering weak green light. "
            + STYLE
        ),
    },
    {
        "name": "scene_room_v1",
        "prompt": (
            "The master bedroom (main bedroom) of a haunted Japanese house at night. "
            "A wooden bed with rumpled sheets, an old wardrobe, and above the headboard "
            "a wedding photograph of a kimono woman; its glass reflects a faint black "
            "smoky shadow lurking in the doorway gap. Dim sickly-green bedside lamp. "
            "Dusty tatami, oppressive dark corners. "
            + STYLE
        ),
    },
    {
        "name": "scene_attic_v1",
        "prompt": (
            "The attic crawl space of a haunted Japanese house, dusty old wooden floor "
            "and low ceiling, warm dim single light from a small skylight leaking rain. "
            "Newspapers and plastic sheeting spread over a board that has been pried open "
            "in the ceiling, empty now. A worn old suitcase, stacks of yellowed newspaper, "
            "dense shadows. Faint bluish-gray cast with warm yellowish highlight only at "
            "the skylight. "
            + STYLE
        ),
    },
    {
        "name": "scene_battle_v1",
        "prompt": (
            "The dark basement ritual chamber of a haunted Japanese house, nearly pitch "
            "black. On the concrete/floor a huge circle is drawn with a chalk-white line, "
            "four corners weighted down by tangled long black hair. Pale white-lit altar "
            "circle glowing faintly in the darkness, long black hair creeping across the "
            "floor toward the center, oppressive pitch-black surroundings with a single "
            "cold white harsh accent light. "
            + STYLE
        ),
    },
]


def run():
    for s in SCENES:
        out = os.path.join(OUT_DIR, s["name"] + ".png")
        if os.path.exists(out):
            print("SKIP exists: %s" % out, flush=True)
            continue
        print(">>> generating %s" % s["name"], flush=True)
        ok = gen(s["prompt"], "768x1024", out)
        print("RESULT %s: %s" % (s["name"], "OK" if ok else "FAIL"), flush=True)


if __name__ == "__main__":
    run()