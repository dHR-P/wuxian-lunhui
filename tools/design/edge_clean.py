# -*- coding: utf-8 -*-
"""edge_clean.py — 抠图边缘描边清理:收缩 alpha 边缘 N px(去白描边/残边),可选把
边缘 1px 的 RGB 向主体色中性化。
用法: <python> edge_clean.py <in.png> <out.png> [shrink=2]
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage


def main():
    src, dst = sys.argv[1], sys.argv[2]
    shrink = int(sys.argv[3]) if len(sys.argv) > 3 else 2
    im = Image.open(src).convert("RGBA")
    arr = np.asarray(im).copy()
    alpha = arr[..., 3]
    solid = alpha >= 250
    # 腐蚀 solid 边界 shrink 像素 → 透明
    erode = ndimage.binary_erosion(solid, iterations=shrink)
    # 原实心-腐蚀后实心 = 边缘带
    edge = solid & ~erode
    if shrink == 0:
        edge = np.zeros_like(solid)
    # 边缘带 alpha 置 0
    arr[..., 3][edge] = 0
    n = int(edge.sum())
    Image.fromarray(arr).save(dst)
    print("edge_clean: removed %d edge px (shrink=%d) -> %s" % (n, shrink, dst))


if __name__ == "__main__":
    main()