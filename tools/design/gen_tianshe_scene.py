# -*- coding: utf-8 -*-
"""gen_tianshe_scene.py — 天蛇实验室(零号基地)场景图(预算内 1 张,选最具辨识度 L2 血池车间)。
依据 design/zhttty_universe/honghuang_li/tianshe_lab.md §9.2 bg 键 + §2 色调(暗绿/血红/惨白)。
教训: 严格空镜、禁人物/人形/尸骸主体、符合设定主色调。
输出: tools/design/raw_honghuang/scene_*.png (768x1024)
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gen_wan import gen  # noqa: E402

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "raw_honghuang")

STYLE = (
    "Photorealistic empty scene, absolutely no people, no characters, no humanoid "
    "figures anywhere, no corpse bodies, cinematic single wide shot, very dark gloomy "
    "mood, cold desaturated color grade, dim atmospheric environmental lighting, "
    "film grain, high detail, vertical 768x1024 composition"
)

SCENE = {
    "name": "scene_ts_pool",
    "prompt": (
        "An abandoned underground gene-factory blood pool workshop, a large dark red "
        "blood pool stretching across the foreground with a calm viscous surface, bone-white "
        "ribs and scraps lining the pool walls, iron chains and meat hooks hanging from the "
        "ceiling above the pool, a slow conveyor line along one side, faint instrument "
        "screens glowing pale green in the gloom. Dark deep-red and bone-white and dim "
        "fluorescent-green tones, blood pool surface reflecting a faint pale light, cold "
        "oppressive horror atmosphere, wet dripping ambience. "
        "The scene is completely empty: NO people, NO worker, NO body, NO corpse, NO "
        "humanoid figure anywhere. "
        + STYLE
    ),
}
OUT = os.path.join(OUT_DIR, SCENE["name"] + ".png")

if __name__ == "__main__":
    if os.path.exists(OUT):
        os.remove(OUT)
    ok = gen(SCENE["prompt"], "768x1024", OUT)
    print("RESULT: %s -> %s" % ("OK" if ok else "FAIL", OUT), flush=True)
    sys.exit(0 if ok else 1)