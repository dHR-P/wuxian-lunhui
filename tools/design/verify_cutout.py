# -*- coding: utf-8 -*-
"""verify_cutout.py — 抠图后数值复核。
检查: 1)透明像素(alpha<=5)的 RGB 是否全为 0(带 --zero-rgb);
      2)边缘带有无亮边(半透明过渡带及其相邻不透明像素是否有高亮/白边)。
Usage: python verify_cutout.py <cutout.png>
"""
import sys
import numpy as np
from PIL import Image


def main():
    p = sys.argv[1]
    arr = np.asarray(Image.open(p).convert("RGBA")).astype(np.int32)
    r, g, b, a = arr[..., 0], arr[..., 1], arr[..., 2], arr[..., 3]

    trans = a <= 5
    opaque = a >= 250
    semi = (a > 5) & (a < 250)

    # 1) 透明像素 RGB 是否全 0
    trans_rgb_notzero = (trans & ((r != 0) | (g != 0) | (b != 0))).sum()
    trans_pct = trans.sum() / a.size * 100

    # 2) 边缘带亮度: 检查 semi(半透明过渡)与紧邻的不透明像素里的亮像素(RGB近白).
    #    若有明显白边(亮度>=230), 报告.
    lum = ((r + g + b) / 3.0)
    edge_bright = ((semi | opaque) & (lum >= 228)).sum()
    total_subject = (opaque | semi).sum()

    print("== %s ==" % p)
    print("size=%dx%d" % (arr.shape[1], arr.shape[0]))
    print("trans(alpha<=5)=%.1f%%  opaque(>=250)=%.1f%%  semi=%.1f%%"
          % (trans_pct, opaque.sum() / a.size * 100, semi.sum() / a.size * 100))
    print("trans_rgb_nonzero= %d  (应=0, 即透明像素RGB全0)" % trans_rgb_notzero)
    print("edge/subject bright(>=228) pixels= %d / %d  (应≈0, 无亮边)" % (edge_bright, total_subject))
    if semi.sum() > 0:
        semi_lum = lum[semi]
        print("semi-edge mean-lum=%.1f max-lum=%d (过渡带应偏暗, 越接近背景色越好)"
              % (semi_lum.mean(), semi_lum.max()))

    ok = (trans_rgb_notzero == 0) and (edge_bright == 0)
    print("VERDICT_NUMERIC: %s" % ("OK" if ok else "CHECK"))


if __name__ == "__main__":
    main()