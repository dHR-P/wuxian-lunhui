# -*- coding: utf-8 -*-
"""neck_fill.py — 抠图后处理:回填「紧贴主体的连通透明区」(flood 误删的暗部)。
用法: <python> neck_fill.py <in_cut.png> <out.png> [dist=5]
原理:flood 会把与背景连通的近黑暗部(裤面暗带等)误删成透明;这些区域紧邻
不透明主体(solid, alpha>=250)。本工具把「距 solid <= dist 像素的透明区」填
alpha=255(保留原 RGB),从而还原被误删的深色裤/暗部;腿缝等距两侧主体都
超过 dist 的透明背景区保持透明。
"""
import os
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

def main():
    src, dst = sys.argv[1], sys.argv[2]
    dist = int(sys.argv[3]) if len(sys.argv) > 3 else 5
    im = Image.open(src).convert("RGBA")
    arr = np.asarray(im).copy()
    a = arr[..., 3]
    solid = a >= 250
    solid_d = ndimage.binary_dilation(solid, iterations=dist)
    transparent = a <= 5
    fill = solid_d & transparent
    n = int(fill.sum())
    arr[..., 3][fill] = 255
    Image.fromarray(arr).save(dst)
    print("neck_fill: filled %d px (%.3f%%), dist=%d -> %s" % (n, 100.0 * n / a.size, dist, dst))

if __name__ == "__main__":
    main()