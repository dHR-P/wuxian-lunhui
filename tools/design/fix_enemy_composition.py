# -*- coding: utf-8 -*-
"""敌人精灵构图后处理：把已抠图精灵的 alpha 内容整体平移，使主体 bbox 中心对齐画布中心。
用于修复 Z-Image 生成的「主体偏上/偏右/下方留白过大」构图问题（ox-alpha 判定内容已达标、
仅构图需微调的图），避免再次重生成引入退化风险。
Usage: <python> fix_enemy_composition.py zombie guard horde
"""
import os
import sys

import numpy as np
from PIL import Image

BASE = r"C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1"
OUT = os.path.join(BASE, "server-rs", "ui", "assets", "img")


def recenter(cid):
    p = os.path.join(OUT, "enemy_%s.png" % cid)
    if not os.path.exists(p):
        print("MISSING", p)
        return
    img = Image.open(p).convert("RGBA")
    a = np.asarray(img)
    alpha = a[..., 3]
    # 用 alpha>=48 计算 bbox：排除 d 3..6 的淡灰雾（alpha>0 会被雾拉偏），
    # 只框住实质性主体（与 diag 的 v1(d>=19) 基本一致）。
    ys, xs = np.nonzero(alpha >= 48)
    if len(xs) == 0:
        print("EMPTY", cid)
        return
    H, W = alpha.shape
    by0, by1, bx0, bx1 = ys.min(), ys.max(), xs.min(), xs.max()
    ch, cw = (by0 + by1) // 2, (bx0 + bx1) // 2
    dy, dx = (H // 2) - ch, (W // 2) - cw
    out = np.zeros_like(a)
    y0, y1 = max(0, dy), min(H, H + dy)
    sy0, sy1 = max(0, -dy), min(H, H - dy)
    x0, x1 = max(0, dx), min(W, W + dx)
    sx0, sx1 = max(0, -dx), min(W, W - dx)
    out[y0:y1, x0:x1] = a[sy0:sy1, sx0:sx1]
    Image.fromarray(out).save(p)
    print("%s: bbox=(%d,%d)-(%d,%d) shift=(%+d,%+d) new_center=(%.0f,%.0f)" % (
        cid, bx0, by0, bx1, by1, dx, dy, (x0 + x1) / 2, (y0 + y1) / 2))


if __name__ == "__main__":
    ids = sys.argv[1:]
    for cid in ids:
        recenter(cid)
    print("done")