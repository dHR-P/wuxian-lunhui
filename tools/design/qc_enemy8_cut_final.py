# -*- coding: utf-8 -*-
"""qc_enemy8_cut_final.py — 对已抠图透明 PNG 做 qwen3.7-flash 终审（带耐心退避）。
判据：背景全透明无残留、主体边缘无白边/黑边/灰晕、无毛边碎屑、无镂空窟窿、
主体完整、透明区无残留脏点（抠图后白描边应被清掉）。
用法: <comfy-python> qc_enemy8_cut_final.py <slug>
"""
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from qc_enemy8 import ask

IMG = r"C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1\server-rs\ui\assets\img"
OUT = r"C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1\tools\design\qc_out"


def main():
    slug = sys.argv[1]
    img = os.path.join(IMG, "enemy_%s.png" % slug)
    js, raw = ask(img, "cut", slug, retries=15, patient=True)
    out_md = os.path.join(OUT, "cut_%s_final.md" % slug)
    with open(out_md, "w", encoding="utf-8") as f:
        f.write("# QC cut final: %s\n\n**文件**: `%s`\n\n" % (slug, img))
        f.write("**判定 JSON**\n```json\n%s\n```\n\n**原始回复**\n```\n%s\n```\n" % (js, raw))
    verdict = "PASS" if (js and "\"pass\": true" in js) else ("FAIL" if js else "ERROR")
    print("CUTFINAL %s verdict=%s -> %s" % (slug, verdict, out_md), flush=True)
    sys.exit(0 if verdict == "PASS" else 1)


if __name__ == "__main__":
    main()
