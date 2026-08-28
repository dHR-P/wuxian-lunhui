# -*- coding: utf-8 -*-
"""Cut pure-solid-color background out of AI-generated enemy sprites -> transparent PNG.
Algorithm identical to cutout_enemy.ps1:
    d = euclidean distance to known bg color C0
    alpha = d<=3 ? 0 : min(255, (d-3)*16)   (d=3 -> 0, d>=19 -> fully opaque)
Uses Pillow+numpy (available in ComfyUI's embedded python).
Usage: <python> cutout_enemy.py [rawdir] [outdir]
Defaults are absolute paths under the game root.
"""
import os
import sys

import numpy as np
from PIL import Image

BASE = r"C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1"
RAW = os.path.join(BASE, "tools", "design", "raw_enemy")
OUT = os.path.join(BASE, "server-rs", "ui", "assets", "img")

# id -> background color of the raw sprite (all pure black after 2026-08-26 regen: Z-Image
# only follows pure-black bg reliably; white/gradient bg produced scene/gradient that broke
# both v1-distance and flood cutouts — see cutout_enemy_v2.py history)
ITEMS = {
    "zombie": (0, 0, 0),
    "licker": (0, 0, 0),
    "hunter": (0, 0, 0),
    "guard": (0, 0, 0),
    "horde": (0, 0, 0),
    "pc_zhengzha": (0, 0, 0),
}
# 输出文件名覆盖（默认 enemy_<id>.png；主角立绘按素材约定叫 pc_zhengzha.png）
OUTNAME = {
    "pc_zhengzha": "pc_zhengzha.png",
}


def cutout(src, dst, bg):
    img = Image.open(src).convert("RGBA")
    a = np.asarray(img).astype(np.float64)
    dr = a[..., 0] - bg[0]
    dg = a[..., 1] - bg[1]
    db = a[..., 2] - bg[2]
    d = np.sqrt(dr * dr + dg * dg + db * db)
    alpha = np.where(d <= 3.0, 0.0, np.minimum(255.0, (d - 3.0) * 16.0)).astype(np.uint8)
    img.putalpha(Image.fromarray(alpha, "L"))
    img.save(dst, "PNG")
    # self-check the written file
    chk = Image.open(dst)
    arr = np.asarray(chk.convert("RGBA"))
    al = arr[..., 3]
    total = al.size
    a0 = float((al <= 2).sum()) / total
    amid = float(((al > 2) & (al < 253)).sum()) / total
    a255 = float((al >= 253).sum()) / total
    print("%s: mode=%s  a<=2:%.1f%%  mid:%.1f%%  a>=253:%.1f%%" % (
        os.path.basename(dst), chk.mode, a0 * 100, amid * 100, a255 * 100))


def main():
    args = sys.argv[1:]
    # 兼容旧用法: [rawdir] [outdir]；新用法: --ids zombie hunter ...
    if args and not args[0].startswith("-") and os.path.isdir(args[0]):
        raw = args[0]
        out = args[1] if len(args) > 1 else OUT
        wanted = None
    else:
        raw = RAW
        out = OUT
        wanted = set()
        i = 0
        while i < len(args):
            if args[i] == "--ids":
                wanted.update(args[i + 1:])
                break
            i += 1
        wanted = wanted or None
    os.makedirs(out, exist_ok=True)
    for cid, bg in ITEMS.items():
        if wanted is not None and cid not in wanted:
            continue
        src = os.path.join(raw, "%s.png" % cid)
        if not os.path.exists(src):
            print("skip missing %s" % src)
            continue
        cutout(src, os.path.join(out, OUTNAME.get(cid, "enemy_%s.png" % cid)), bg)
    print("done")


if __name__ == "__main__":
    main()