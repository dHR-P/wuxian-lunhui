# -*- coding: utf-8 -*-
"""verify_cutout50.py — 数值复核抠图结果: 透明像素 RGB 必须全为 0 (--zero-rgb 效果)。
用法: python verify_cutout50.py [slug1 ...]
输出: 每个 boss_<slug>.png 的 尺寸/RGBA/透明像素数/透明区RGB是否全0/不透明像素数/文件字节
"""
import os
import sys

BASE = os.path.dirname(os.path.abspath(__file__))
CUT = os.path.join(BASE, "cutout_boss50")

try:
    from PIL import Image
except ImportError:
    sys.path.insert(0, os.path.join(BASE, "..", "..", "venv", "Lib", "site-packages"))
    from PIL import Image

ALL_SLUGS = ["sanjiaotou", "fulaidi", "yizhong", "jixianti", "baojun", "miwujuwu",
             "xingshiwang", "juanzhe", "kuangxie", "shourenchaowang", "jixieronghe", "poxujiezhe"]


def main():
    slugs = sys.argv[1:] if len(sys.argv) > 1 else ALL_SLUGS
    for slug in slugs:
        path = os.path.join(CUT, "boss_%s.png" % slug)
        if not os.path.exists(path):
            print("MISSING: %s" % path, flush=True)
            continue
        im = Image.open(path)
        rgba = im.convert("RGBA")
        w, h = rgba.size
        px = rgba.load()
        nb = ntransp = 0
        rgb_nonzero_in_transp = 0
        for y in range(h):
            for x in range(w):
                r, g, b, a = px[x, y]
                nb += 1
                if a == 0:
                    ntransp += 1
                    if r or g or b:
                        rgb_nonzero_in_transp += 1
        opaque = nb - ntransp
        ratio = ntransp / nb if nb else 0
        ok = (rgb_nonzero_in_transp == 0)
        print("boss_%s: size=%dx%d total=%d transparent=%d (%.1f%%) opaque=%d transparentRGB_nonzero=%d -> %s bytes=%d"
              % (slug, w, h, nb, ntransp, ratio * 100, opaque, rgb_nonzero_in_transp,
                 "OK" if ok else "FAIL", os.path.getsize(path)), flush=True)


if __name__ == "__main__":
    main()