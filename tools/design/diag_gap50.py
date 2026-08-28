# -*- coding: utf-8 -*-
"""diag_gap50.py — 诊断 cutout 内部"黑色残留"间隙。输出 alpha 的空间分布概览:
对若干水平扫描线, 统计 alpha==0(透明) / 0<alpha<255(半透) / 255(不透明) 的分布,
特别找出「被不透明包围的区域」。用法: python diag_gap50.py <cutout.png>
"""
import sys
import numpy as np
from PIL import Image


def main():
    p = sys.argv[1]
    im = np.asarray(Image.open(p).convert("RGBA"))
    a = im[..., 3]
    h, w = a.shape
    print("%s %dx%d" % (p, w, h))
    for frac in (0.25, 0.4, 0.55, 0.7, 0.85):
        y = int(h * frac)
        row = a[y]
        runs = []
        cur = row[0]
        start = 0
        for x in range(1, w):
            if row[x] != cur:
                runs.append((start, x - 1, cur))
                start = x
                cur = row[x]
        runs.append((start, w - 1, cur))
        # 合并签名: T=transparent, S=semitrans, O=opaque
        sig = "".join("T" if c == 0 else ("O" if c == 255 else "S") for _, _, c in runs)
        # 找到长度>8 的 Opaque 段
        op = [(s, e, c) for (s, e, c) in runs if c == 255 and e - s > 8]
        print("y=%d  alpha0=%.1f%% semi=%.1f%% op=%.1f%%  opaqueRuns>8:%s" % (
            y, (row == 0).mean() * 100, ((row > 0) & (row < 255)).mean() * 100,
            (row == 255).mean() * 100,
            [ (s, e) for (s, e, _) in op]))
    # 统计全部不透明像素
    print("GLOBAL alpha==0:%.1f%%  semi:%.1f%%  opaque:%.1f%%" % (
        (a == 0).mean() * 100, ((a > 0) & (a < 255)).mean() * 100, (a == 255).mean() * 100))


if __name__ == "__main__":
    main()