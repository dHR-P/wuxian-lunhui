# -*- coding: utf-8 -*-
"""gen_honghuang_scenes.py — 银色大地(地灵族机界遗迹)副本场景图生成。
依据 design/zhttty_universe/honghuang_li/yinse_dadi.md §9.2 bg 键抽取 5 张场景:
  1. scene_l1_waste  : L1 白银荒原(风蚀金属平原/血色天空/远山尸骸剪影)
  2. scene_l2_city   : L2 都市遗迹(坍塌高塔/忽明忽暗符文灯/骸骨长街)
  3. scene_l3_factory: L3 机界升华工厂(传送带/熔炉/蒸汽/机械臂阵列/"人形材料")
  4. scene_l3_rift   : L3 低纬度裂缝(墨紫虚空/逆几何/漂浮机械残骸)
  5. scene_l4_arena  : L4 决战祭坛(中央升华法阵/四柱符文)
风格基调与现有生化/周原场景图一致: 昏暗、冷色、氛围光、写实、无人。
输出: tools/design/raw_honghuang/scene_*.png (768x1024, 无需抠图)
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gen_wan import gen  # noqa: E402

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "raw_honghuang")
os.makedirs(OUT_DIR, exist_ok=True)

# 与现有场景图一致的风格基调: 昏暗冷色、氛围光、写实恐怖、空镜无人
STYLE = (
    "Photorealistic empty scene, no people, no characters, cinematic single wide shot, "
    "very dark gloomy mood, cold desaturated color grade, dim atmospheric environmental "
    "lighting, muted tones, film grain, high detail, vertical 768x1024 composition"
)

# 调色参考(§2 美术色调): 主色 银灰#C0C4CC / 冷白#E8F0F2 / 锈橙#B5651D; 裂隙区 墨紫#2B1E4A
SCENES = [
    {
        "name": "scene_l1_waste",
        "prompt": (
            "The vast silver wasteland of a post-apocalyptic battlefield plain at dusk, "
            "stripped of all color into an eerie colorless silver-white plain of wind-eroded "
            "metal, scattered rusted swords and broken blades, skeletal remains and charred "
            "wreckage half-buried. A blood-red murky sky overhead, distant dark silhouettes "
            "of giant fallen corpses on the horizon. Low industrial hum made visual: faint "
            "distant machinery shapes. Dim cold steel-gray light across the whole scene. "
            + STYLE
        ),
    },
    {
        "name": "scene_l2_city",
        "prompt": (
            "A ruined underground mechanical city street of a long-dead machine civilization, "
            "collapsed towers and toppled glowing rune lanterns, crumbling residential walls. "
            "Along the street stand rows of bone-white skeletal remains frozen in the same "
            "posture, arms reaching upward. Faint flickering rune lights glowing blue-white "
            "in broken characters carved into the walls. Rust-orange {#B5651D} accents on "
            "corroded metal, cold desaturated gray-blue overall darkness, oppressive dim "
            "lighting. "
            + STYLE
        ),
    },
    {
        "name": "scene_l3_factory",
        "prompt": (
            "An abandoned enormous mechanized sublimation factory interior, endless conveyor "
            "belts still slowly moving, hydraulic arms and mechanical claws array rows, "
            "large industrial furnaces glowing dull orange, steam venting. On the assembly "
            "line a faintly human-shaped dark material slab being pressed into a mold, "
            "silhouette only. Corroded dark metal everywhere, cold steel-blue ambient light "
            "mixed with the furnace ember glow, industrial haze, eerie but dead silence. "
            + STYLE
        ),
    },
    {
        "name": "scene_l3_rift",
        "prompt": (
            "A low-dimension rift crack tearing open the factory wall, revealing an "
            "impossible dark purple void of inverse geometry, floating mechanical debris "
            "and broken machine parts drifting weightlessly, distorted un-natural angular "
            "structures, faint sickly violet light leaking. Around the rift, fractured "
            "silver metal and frozen machinery. Deep black-purple {#2B1E4A} color grade, "
            "cold ominous lighting, oppressive dread atmosphere. "
            + STYLE
        ),
    },
    {
        "name": "scene_l4_arena",
        "prompt": (
            "The central ritual arena deep inside a silver tomb, a huge circular sublimation "
            "array carved into the floor glowing with faint pale blue-white rune lines, "
            "four tall carved rune pillars standing at compass points around it, ancient "
            "silver stele and broken relic columns lining the circular wall. Cold pale "
            "blue-white holy-light remnants, silver-gray stone and metal, a single solemn "
            "dim pool of light over the array, dense shadow around. "
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