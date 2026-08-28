# -*- coding: utf-8 -*-
"""bright_fill.py — 基于原图亮面(d>=15)膨胀回填被 flood 误删的深色裤面暗带。
用法: <python> bright_fill.py <cut.png> <raw.png> <out.png> [dist=3]
原理:抠图后已成透明的区域中,凡「在原图上距亮面(d>=15)<=dist 像素」者,
判定为裤面/主体暗部(与背景黑在像素上相近但空间上与主体亮面相邻),回填
alpha=255 并保留原图 RGB;真正的背景(腿缝中心/远处)距亮面较远,保持透明。
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

def main():
    src_cut, src_raw, dst = sys.argv[1], sys.argv[2], sys.argv[3]
    dist = int(sys.argv[4]) if len(sys.argv) > 4 else 3
    im = Image.open(src_raw).convert("RGBA")
    a = np.asarray(im).astype(float)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    d = np.sqrt(r * r + g * g + b * b)
    bright = d >= 15.0
    # 亮面膨胀,但不越过「纯背景」:仅当膨胀区内非近黑(d>3)时才算裤面暗带
    near = d <= 3.0
    bright_d = ndimage.binary_dilation(bright, iterations=dist)
    # 保护:紧邻亮面的深色裤(3<d)算主体;d<=3 且距亮面近的(可能是背景边的暗影)也算,回填后视觉无害
    zone = bright_d & (d > 3.0)  # 只处理非纯黑像素(裤面暗带 d 4-14)
    cut = Image.open(src_cut).convert("RGBA")
    arr = np.asarray(cut).copy()
    alpha = arr[..., 3]
    fill = zone & (alpha <= 5)
    n = int(fill.sum())
    # 保留原图 RGB(用 raw 的 RGB 覆盖该区域)
    rgb = np.asarray(im.convert("RGBA"))[..., :3]
    arr[..., :3][fill] = rgb[fill]
    arr[..., 3][fill] = 255
    Image.fromarray(arr).save(dst)
    print("bright_fill: filled %d px (%.3f%%) dist=%d -> %s" % (n, 100.0 * n / alpha.size, dist, dst))

if __name__ == "__main__":
    main()