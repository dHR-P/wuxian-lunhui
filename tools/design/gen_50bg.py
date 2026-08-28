# -*- coding: utf-8 -*-
"""gen_50bg.py — 12 dungeons scene backgrounds generator.
Reads prompt_<slug>.txt, runs gen_wan.py gen() against wan2.7-image.
Usage: D:\AI_Tools\ComfyUI\python_embeded\python.exe gen_50bg.py
Outputs raw_50bg/<slug>_bg.png, logs generation result to bg_50_gen.log
"""
import os, time, sys

BASE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(BASE, "raw_50bg")
sys.path.insert(0, BASE)

from gen_wan import gen

SLUGS = [
    "jingjiling", "xingjichuanqi", "jishengqianye", "mengguijie",
    "siwuzhen", "shenmiao", "hangu", "diweidu",
    "wujin", "xingchen", "yinxiang", "tianwang",
]

def run():
    log = []
    for slug in SLUGS:
        pf = os.path.join(RAW, "prompt_%s.txt" % slug)
        with open(pf, "r", encoding="utf-8") as f:
            prompt = f.read().strip()
        out = os.path.join(RAW, "%s_bg.png" % slug)
        ok = gen(prompt, "768x1024", out)
        line = "%s => %s : %s" % (slug, "OK" if ok else "FAIL", out)
        print(line, flush=True)
        log.append(line)
        time.sleep(2)
    with open(os.path.join(BASE, "bg_50_gen.log"), "w", encoding="utf-8") as f:
        f.write("\n".join(log))

if __name__ == "__main__":
    run()