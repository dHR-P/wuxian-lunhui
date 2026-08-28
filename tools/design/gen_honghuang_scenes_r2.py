# -*- coding: utf-8 -*-
"""gen_honghuang_scenes_r2.py — l1/l3 场景修正重生成。
l1 FAIL: 前景出现明显盔甲人形/大型人形尸骸剪影,违反'无人物/空镜'。
l3 FAIL: 出现站立人形暗影; '人形材料'被渲染成站立姿态而非压模。
修正: 强化绝对空镜、前景禁止任何人形/尸骸主体; l3 把'人形材料'改为'空置人形模具槽'。
输出仍写 raw_honghuang/(覆盖失败版本)。
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gen_wan import gen  # noqa: E402

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "raw_honghuang")

STYLE = (
    "Photorealistic empty scene, absolutely no people, no characters, no humanoid "
    "figures anywhere, no corpses, cinematic single wide shot, very dark gloomy mood, "
    "cold desaturated color grade, dim atmospheric environmental lighting, muted tones, "
    "film grain, high detail, vertical 768x1024 composition"
)

SCENES = [
    {
        "name": "scene_l1_waste",
        "prompt": (
            "A vast completely empty colorless silver wasteland stretching to the horizon, "
            "an endless plain of wind-eroded pale metal, stripped of all color into a "
            "featureless silver-white ground. Scattered lone rusted swords and broken "
            "wreck fragments lie far apart on the ground as objects only. A blood-red murky "
            "sky overhead, a faint distant silhouette of mountains on the very far horizon. "
            "NO people, NO figures, NO corpses, NO body silhouettes in the entire scene, "
            "the foreground is completely empty open ground. Low cold steel-gray light "
            "across the whole scene, oppressive emptiness. "
            + STYLE
        ),
    },
    {
        "name": "scene_l3_factory",
        "prompt": (
            "An abandoned enormous mechanized sublimation factory interior viewed from "
            "an empty vantage point, endless conveyor belts still slowly moving, rows of "
            "hydraulic arms and mechanical claws, large industrial furnaces glowing dull "
            "orange, steam venting. On one conveyor an empty open human-shaped mold cavity "
            "sits with dark residue inside, the mold is vacant with no figure in it. "
            "Corroded dark metal everywhere, cold steel-blue ambient light mixed with the "
            "furnace ember glow, industrial haze, eerie but dead silence. NO people, NO "
            "humanoid figure, NO body, the scene is completely empty of living or humanoid "
            "subjects. "
            + STYLE
        ),
    },
]


def run():
    for s in SCENES:
        out = os.path.join(OUT_DIR, s["name"] + ".png")
        # r2: 删除旧失败版本(就地覆盖前先移除),重新生成
        if os.path.exists(out):
            os.remove(out)
        print(">>> regenerating %s" % s["name"], flush=True)
        ok = gen(s["prompt"], "768x1024", out)
        print("RESULT %s: %s" % (s["name"], "OK" if ok else "FAIL"), flush=True)


if __name__ == "__main__":
    run()