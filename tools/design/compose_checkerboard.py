# -*- coding: utf-8 -*-
"""compose_checkerboard.py — 把透明抠图合成到棋盘格背景上, 供视觉质检透明效果。
Usage: python compose_checkerboard.py <cutout.png> <out_preview.png> [cell=24]
"""
import sys
import numpy as np
from PIL import Image


def main():
    p = sys.argv[1]
    out = sys.argv[2]
    cell = int(sys.argv[3]) if len(sys.argv) > 3 else 24
    arr = np.asarray(Image.open(p).convert("RGBA")).astype(np.float64)
    h, w = arr.shape[:2]
    alpha = arr[..., 3:4] / 255.0
    rgb = arr[..., :3]
    # 棋盘格 (灰白相间, 便于看透明边缘)
    yy, xx = np.mgrid[0:h, 0:w]
    board = np.where(((yy // cell + xx // cell) % 2) == 0, 200, 140)
    board = board[..., None].repeat(3, axis=2).astype(np.float64)
    out_arr = rgb * alpha + board * (1 - alpha)
    # 再叠一层 subtle 亮边指示: 主体外缘一圈红/不需要
    Image.fromarray(out_arr.astype(np.uint8), "RGB").save(out)
    print("saved %s (%dx%d)" % (out, w, h))


if __name__ == "__main__":
    main()