# -*- coding: utf-8 -*-
"""gen_jianzhong_scene_l4_v2.py — L4无名剑碑之巅 二次生成(修正QC FAIL: 巨碑出现竖排碑文刻字)。
设计要求: 巨碑为"无字刻痕", 只有剑痕刻痕非文字。去除所有铭文文字。"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gen_wan import gen  # noqa: E402

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "raw_jianzhong")
os.makedirs(OUT_DIR, exist_ok=True)

NO_TEXT = (
    "空镜, 无人物, 无生物。巨碑碑面完全无字无铭文无文字, 只有凌乱剑痕划痕雕刻纹理, "
    "绝对禁止出现任何文字/汉字/符号/铭文/篆字/水印/logo。"
    "Empty scene. The great stele face is completely unmarked of any text/letters/inscription — "
    "only abstract chaotic sword-slash scratch textures, absolutely no characters, no glyphs, "
    "no brush-writing, no watermark, no logo anywhere."
)


def run():
    out = os.path.join(OUT_DIR, "jz_bg_l4_jianbei_v2.png")
    if os.path.exists(out):
        print("SKIP exists: %s" % out, flush=True)
        return
    print(">>> generating jz_bg_l4_jianbei_v2", flush=True)
    prompt = (
        "剑冢最深处无名剑碑之巅: 一座巨大的素面无字巨碑立于夕照之下, 碑面只有道道凌乱的剑痕划痕刻痕纹理, 无任何文字, "
        "夕照斜光如熔金泼满碑身, 四周插满成千上万的枯剑, 万剑低鸣的氛围, "
        "夕照金红色暖光与铁青冷雾交叠, 庄严悲壮, 黄金时刻。"
        + NO_TEXT
    )
    ok = gen(prompt, "1024x768", out)
    print("RESULT jz_bg_l4_jianbei_v2: %s" % ("OK" if ok else "FAIL"), flush=True)


if __name__ == "__main__":
    run()