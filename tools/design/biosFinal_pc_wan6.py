# -*- coding: utf-8 -*-
"""biosFinal_pc_wan6.py — pc_zhengzha(郑吒) v6 raw 生成(wan 轮6 = 最后一击定稿)。
历史病因:pc_wan5 cutout 头顶黑发被误抠成洞(raw 头顶头发过淡与黑背景同层)。
v6 prompt 强化:黑发以中明度发束呈现、发顶完整覆盖头冠、发丝与背景分离、
头顶留白出框余量、无游离碎发;纯黑背景无暗角;无白描边无轮廓光。
提示词从 UTF-8 文本文件读取(避免命令行编码问题)。
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gen_wan import gen  # noqa: E402

PROMPT_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "prompt_pc_wan6_v1.txt")
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "raw_enemy", "pc_wan6.png")

if __name__ == "__main__":
    with open(PROMPT_FILE, "r", encoding="utf-8") as f:
        prompt = f.read().strip()
    print("PROMPT_LEN=%d" % len(prompt), flush=True)
    ok = gen(prompt, "768x1024", OUT)
    print("RESULT: %s -> %s" % ("OK" if ok else "FAIL", OUT), flush=True)
    sys.exit(0 if ok else 1)