# -*- coding: utf-8 -*-
"""gen_jianzhong_scene_l1_v2.py — L1山门古道雾景 二次生成(修正QC FAIL: 石坊匾额/石碑出现刻字)。"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gen_wan import gen  # noqa: E402

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "raw_jianzhong")
os.makedirs(OUT_DIR, exist_ok=True)

NO_TEXT = (
    "空镜, 无人物, 无角色, 无生物。所有石造物均为素面, 匾额完全空白平滑, 石碑无字无刻痕, "
    "绝对禁止出现任何文字/汉字/符号/铭文/水印/logo。"
    "Empty scene, no characters. All stone structures are smooth and blank — blank empty "
    "archways with NO engraved/inscribed text whatsoever, unmarked bare steles, absolutely "
    "no letters, no characters, no glyphs, no watermark, no logo anywhere."
)


def run():
    out = os.path.join(OUT_DIR, "jz_bg_l1_shanmen_v2.png")
    if os.path.exists(out):
        print("SKIP exists: %s" % out, flush=True)
        return
    print(">>> generating jz_bg_l1_shanmen_v2", flush=True)
    prompt = (
        "武侠门派禁地山门古道雾景: 青灰色素面石牌坊(匾额完全空白无字)立在灰雾古道中央, "
        "两侧残破青苔巨石与素面无字断碑, 枯树立于路边, 冷灰雾霭涌动, 低饱和铁灰青灰冷调, 肃穆空旷。"
        "远景群山隐入浓雾。"
        + NO_TEXT
    )
    ok = gen(prompt, "1024x768", out)
    print("RESULT jz_bg_l1_shanmen_v2: %s" % ("OK" if ok else "FAIL"), flush=True)


if __name__ == "__main__":
    run()