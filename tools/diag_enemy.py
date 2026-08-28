# -*- coding: utf-8 -*-
"""通用立绘抠图诊断：对指定 raw 立绘打印
- 边框 8px 中位色 bg0（用作 v1 距离法背景参考色）
- 到 bg0 的欧氏距离累积百分比表
- 亮度累积百分比表
- v1 距离法(d>=19) mask 的 n/box/中心区域不透明率
- v1 半透明带(d 3..19)占比（过大说明会发 ghost）
Usage: python diag_enemy.py hunter guard licker horde
"""
import os, sys
import numpy as np
from PIL import Image

BASE = r"C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1"
SRC = os.path.join(BASE, "tools", "design", "raw_enemy")

def diag(cid):
    p = os.path.join(SRC, cid + ".png")
    if not os.path.exists(p):
        print("MISSING", p); return
    a = np.asarray(Image.open(p).convert("RGB")).astype(np.int32)
    h, w, _ = a.shape
    border = np.concatenate([a[0:8].reshape(-1, 3), a[-8:].reshape(-1, 3),
                             a[:, 0:8].reshape(-1, 3), a[:, -8:].reshape(-1, 3)])
    bg0 = np.median(border, axis=0).astype(np.int32)
    d = np.sqrt(((a - bg0) ** 2).sum(axis=2))
    lum = a.mean(axis=2)
    print("== %s size=(%d,%d) bg0=%s" % (cid, w, h, bg0.tolist()))
    for thr in (5, 10, 15, 20, 30, 50, 80, 120, 200):
        print("  d<=%3d: %5.1f%%" % (thr, (d <= thr).mean() * 100))
    for thr in (5, 10, 20, 30, 50, 80, 120, 160, 200):
        print("  lum>=%3d: %5.1f%%" % (thr, (lum >= thr).mean() * 100))
    mask19 = d >= 19
    n = int(mask19.sum())
    print("  v1(d>=19): n=%d %.1f%%" % (n, n / mask19.size * 100))
    if n:
        ys, xs = np.nonzero(mask19)
        print("  v1 box=(%d,%d)-(%d,%d)" % (xs.min(), ys.min(), xs.max(), ys.max()))
        # 中心区域（mask 包围盒放大 1.4 倍后裁剪）的不透明率
        cy, cx = (ys.min() + ys.max()) // 2, (xs.min() + xs.max()) // 2
        rh, rw = int((ys.max() - ys.min()) * 0.7), int((xs.max() - xs.min()) * 0.7)
        y0, y1 = max(0, cy - rh), min(h, cy + rh)
        x0, x1 = max(0, cx - rw), min(w, cx + rw)
        frac = mask19[y0:y1, x0:x1].mean() * 100
        print("  center opaque frac: %.1f%%" % frac)
    mid = ((d > 3) & (d < 19)).mean() * 100
    print("  v1 semi band d(3,19): %.2f%% (ghost risk)" % mid)

if __name__ == "__main__":
    ids = sys.argv[1:] or ["hunter", "guard", "licker", "horde"]
    for cid in ids:
        diag(cid)