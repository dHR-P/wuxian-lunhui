# -*- coding: utf-8 -*-
"""诊断 zombie 原图：边框背景色、距离直方图、flood 失败原因。"""
import os
import numpy as np
from PIL import Image

BASE = r"C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1"
p = os.path.join(BASE, "tools", "design", "raw_enemy", "zombie.png")
im = Image.open(p).convert("RGB")
rgb = np.asarray(im).astype(np.int32)
h, w, _ = rgb.shape
print("size", rgb.shape)

# 边框 8px 中位色
border = np.concatenate([rgb[:8].reshape(-1, 3), rgb[-8:].reshape(-1, 3),
                         rgb[:, :8].reshape(-1, 3), rgb[:, -8:].reshape(-1, 3)])
bg0 = np.median(border, axis=0)
print("bg0", bg0)

# 距离直方图（到 bg0 的曼哈顿距离）
d = np.abs(rgb - bg0).sum(axis=2)
for thr in [5, 10, 15, 20, 25, 30, 40, 50, 60, 80, 100, 150, 200, 300]:
    frac = (d <= thr).mean() * 100
    print("d<=%3d: %6.1f%%" % (thr, frac))

# 亮度分布（亮部在哪）
lum = rgb.mean(axis=2)
for thr in [5, 10, 20, 30, 50, 80, 120, 160, 200]:
    frac = (lum >= thr).mean() * 100
    print("lum>=%3d: %6.1f%%" % (thr, frac))

# 用欧氏距离 v1 阈值看看主体大致范围
de = np.sqrt(((rgb - np.array([0, 0, 0])) ** 2).sum(axis=2))
mask = de >= 19.0
ys, xs = np.nonzero(mask)
if len(ys):
    print("v1(d>=19 to black): n=%d box=(%d,%d)-(%d,%d)" % (len(ys), xs.min(), ys.min(), xs.max(), ys.max()))
    # 中心区域（包围盒中心 ±10%）
    cx, cy = (xs.min() + xs.max()) // 2, (ys.min() + ys.max()) // 2
    cw, chh = (xs.max() - xs.min()) // 10, (ys.max() - ys.min()) // 10
    sub = mask[cy - chh:cy + chh, cx - cw:cx + cw]
    print("center region opaque frac: %.1f%%" % (sub.mean() * 100))

# 最低 100 行不透明率（检查底部倒影）
e_bottom = np.sqrt(((rgb[-100:] - np.array([0, 0, 0])) ** 2).sum(axis=2))
for row in range(0, 100, 20):
    seg = e_bottom[row:row + 20]
    print("bottom rows %d-%d: d>=19 frac %.1f%%, mean lum %.0f" % (
        len(rgb) - 100 + row, len(rgb) - 100 + row + 20, (seg >= 19).mean() * 100, seg.mean()))