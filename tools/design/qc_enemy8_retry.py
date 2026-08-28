# -*- coding: utf-8 -*-
"""qc_enemy8_retry.py — 对 r2 raw 重试质检（qwen3.7-flash），更耐心的退避。
复读 qc_enemy8.ask（同判据），把重试次数提到 40、退避用逐次指数，扛住上游
504/503/SERVICE_BUSY 抖动，直到出判定。
用法: <comfy-python> qc_enemy8_retry.py <slug>
"""
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from qc_enemy8 import ask, SETTING

RAW = r"C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1\tools\design\raw_enemy_8"
OUT = r"C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1\tools\design\qc_out"


def main():
    slug = sys.argv[1]
    img = os.path.join(RAW, "%s.png" % slug)
    js, raw = ask(img, "raw", slug, retries=15, patient=True)
    out_md = os.path.join(OUT, "raw_%s_r3.md" % slug)
    with open(out_md, "w", encoding="utf-8") as f:
        f.write("# QC retry r3: %s (raw)\n\n**文件**: `%s`\n\n" % (slug, img))
        f.write("**判定 JSON**\n```json\n%s\n```\n\n**原始回复**\n```\n%s\n```\n" % (js, raw))
    print("RESULT %s -> %s" % (slug, out_md), flush=True)
    if js and "PASS" in js:
        sys.exit(0)
    else:
        sys.exit(2)


if __name__ == "__main__":
    main()
