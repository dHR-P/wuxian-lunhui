# -*- coding: utf-8 -*-
"""为 5 张敌人精灵生成棋盘格合成预览（透明区显示棋盘格），供 ox-alpha 质检透明背景干净度。
Usage: python make_enemy_previews.py [id...]   (默认全部 5 张)
Outputs: tools/design/preview_enemy/preview_enemy_<id>.png (宽 384)
"""
import os, sys
from PIL import Image

BASE = r"C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1"
SRC = os.path.join(BASE, "server-rs", "ui", "assets", "img")
OUT = os.path.join(BASE, "tools", "design", "preview_enemy")
os.makedirs(OUT, exist_ok=True)

CELL = 16
C_A = (210, 210, 210)
C_B = (150, 150, 150)


def checker(w, h):
    ch = Image.new("RGB", (w, h))
    px = ch.load()
    for y in range(h):
        for x in range(w):
            px[x, y] = C_A if ((x // CELL) + (y // CELL)) % 2 == 0 else C_B
    return ch


ids = sys.argv[1:] or ["zombie", "licker", "hunter", "guard", "horde"]
for name in ids:
    # 主角立绘输出名不带 enemy_ 前缀
    fn = "pc_zhengzha.png" if name == "pc_zhengzha" else "enemy_%s.png" % name
    p = os.path.join(SRC, fn)
    if not os.path.exists(p):
        print("MISSING", p)
        continue
    im = Image.open(p).convert("RGBA")
    w = 384
    h = int(im.height * w / im.width)
    im = im.resize((w, h), Image.LANCZOS)
    bg = checker(w, h)
    out = Image.alpha_composite(bg.convert("RGBA"), im)
    out.convert("RGB").save(os.path.join(OUT, "preview_enemy_%s.png" % name))
    print("OK preview_enemy_%s.png" % name, out.size)
print("done")