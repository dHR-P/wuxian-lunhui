# -*- coding: utf-8 -*-
"""body_fill.py — 主体区域闭运算回填:flood 会把与背景同黑的裤装/暗部实体误删为透明,
本工具用「solid 大核闭运算」重建主体区域,把人物轮廓内的透明全部回填 alpha=255
(保留原 RGB,深色裤即显示为黑裤实体),人物外侧真实背景保持透明。
用法: <python> body_fill.py <cut.png> <out.png> [radius=60]
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage


def main():
    src, dst = sys.argv[1], sys.argv[2]
    radius = int(sys.argv[3]) if len(sys.argv) > 3 else 60
    im = Image.open(src).convert("RGBA")
    arr = np.asarray(im).copy()
    alpha = arr[..., 3]
    solid = alpha >= 250
    # 闭运算:solid 膨胀 radius 再腐蚀 radius → 填掉人物内部 <2*radius 宽的透明
    closed = ndimage.binary_closing(solid, iterations=radius)
    fill = closed & (alpha <= 5)
    n = int(fill.sum())
    arr[..., 3][fill] = 255
    Image.fromarray(arr).save(dst)
    print("body_fill: filled %d px (%.3f%%) radius=%d -> %s" % (n, 100.0 * n / alpha.size, radius, dst))


if __name__ == "__main__":
    main()