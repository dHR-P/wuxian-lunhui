# -*- coding: utf-8 -*-
"""diag_edge_bright.py — 定位亮边像素是否紧贴主体alpha边界。
如果亮像素都在主体内部(距alpha边界>2px), 则是角色自然亮部(金瞳/白发), 不算白边;
如果紧贴边界, 则为抠图残留亮边(需处理)。"""
import sys
import numpy as np
from PIL import Image


def main():
    p = sys.argv[1]
    arr = np.asarray(Image.open(p).convert("RGBA")).astype(np.int32)
    a = arr[..., 3]
    lum = ((arr[..., 0] + arr[..., 1] + arr[..., 2]) / 3.0)
    bright = lum >= 228

    # 主体边界: alpha>5 且其8邻域含 alpha<=5
    sub = a > 5
    pad = np.zeros((sub.shape[0] + 2, sub.shape[1] + 2), dtype=bool)
    pad[1:-1, 1:-1] = sub
    edge_mask = np.zeros_like(sub)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            if dy == 0 and dx == 0:
                continue
            edge_mask |= ~pad[1 + dy:1 + dy + sub.shape[0], 1 + dx:1 + dx + sub.shape[1]]
    edge_mask &= sub  # 主体侧贴边像素

    bright_edge = bright & edge_mask
    bright_inner = bright & sub & ~edge_mask
    print("p=%s" % p)
    print("bright total=%d  bright-at-edge(<=1px)=%d  bright-inner=%d"
          % (bright.sum(), bright_edge.sum(), bright_inner.sum()))
    if bright_edge.sum() > 0:
        # 给出贴边亮像素坐标样本
        ys, xs = np.where(bright_edge)
        print("sample edge-bright coords (n=%d):" % len(ys))
        for i in range(min(8, len(ys))):
            print("  (%d,%d) lum=%d alpha=%d" % (ys[i], xs[i], int(lum[ys[i], xs[i]]), int(a[ys[i], xs[i]])))
    ok = bright_edge.sum() == 0
    print("VERDICT_EDGE_BRIGHT: %s" % ("OK_无贴边亮边" if ok else "有贴边亮边需处理"))


if __name__ == "__main__":
    main()