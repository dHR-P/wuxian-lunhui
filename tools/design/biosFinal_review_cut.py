# -*- coding: utf-8 -*-
"""biosFinal_review_cut.py — 抠图 cut 数值复核(参照 honghuang_assets.md §三口径 + biohazard 口径)。
检查:
  1) 透明像素(pixel alpha<=5)的 RGB 是否全 0(--zero-rgb 生效)
  2) 头冠区域不透明覆盖率(头顶 y 一定范围)
  3) 主透明度 solid 相连性 / 主体最大连通件占比(检查被挖空/镂空)
  4) 沿不透明主体边界外侧 1px 环带中, RGB 亮度>=180 的像素占比(应为 0%, 防白描边/光晕)
  5) 主体 bbox / 高度占比
用法: review_cut.py <cut.png> [head_top_frac head_bot_frac]
"""
import sys
import numpy as np
from PIL import Image


def load(p):
    im = Image.open(p).convert("RGBA")
    a = np.asarray(im)
    return a[..., :3].astype(np.int16), a[..., 3].astype(np.int16)


def connected_max(alpha):
    # 用 scipy 求最大连通件占比
    import scipy.ndimage as ndi
    solid = alpha >= 250
    lab, n = ndi.label(solid)
    if n == 0:
        return 0.0
    sizes = ndi.sum(solid, lab, range(1, n + 1))
    return float(sizes.max()) / float(solid.sum()) if solid.sum() else 0.0


def main():
    p = sys.argv[1]
    rgb, alpha = load(p)
    H, W = alpha.shape
    total = H * W

    trans = alpha <= 5
    n_trans = trans.sum()
    # 透明像素 RGB 检查
    trgb = rgb[trans]
    zero_ok = n_trans == 0 or (trgb.sum() == 0)
    print("trans_cnt=%d trans_ratio=%.3f | trans_RGB_all_zero=%s" % (
        n_trans, n_trans / total, zero_ok), flush=True)

    solid = alpha >= 250
    opaque_ratio = solid.mean()
    print("opaque_ratio=%.3f" % opaque_ratio, flush=True)

    # 主体 bbox
    ys, xs = np.where(solid)
    if len(ys) == 0:
        print("NO SOLID", flush=True)
        return
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    print("body_bbox=(%d,%d)-(%d,%d) h=%d w=%d body_h_ratio=%.3f" % (
        x0, y0, x1, y1, y1 - y0 + 1, x1 - x0 + 1, (y1 - y0 + 1) / H), flush=True)

    # 头冠区域不透明覆盖率(头顶 y 区)
    ht = 0.0
    hb = 0.10
    if len(sys.argv) > 2:
        ht = float(sys.argv[2])
    if len(sys.argv) > 3:
        hb = float(sys.argv[3])
    yt = int(H * ht)
    yb = int(H * hb)
    if yb > yt:
        crown = solid[yt:yb, :]
        print("crown[y %d..%d] opaque_ratio=%.3f" % (yt, yb, crown.mean()), flush=True)

    # 边缘环带: 不透明主体边界的边界像素扩张1px得到环带, 但只统计紧邻 solid 边界外侧的透明/半透明像素
    # 用形态学: ring = (dilate(solid,1) & ~solid) 即主体外围 1px 处。但这里我们要的是"沿主体边缘 1px 环带亮度"
    # 口径: 对 solid 边界做 1px 膨胀, 取该环带内像素的 RGB 亮度>=180 占比。
    from scipy import ndimage as ndi
    ring = ndi.binary_dilation(solid, iterations=1) & ~solid
    if ring.any():
        rlum = rgb[ring].mean(axis=1)
        bright = (rlum >= 180).mean()
        print("edge_ring1px_bright(>=180)_ratio=%.3f" % bright, flush=True)
        # 额外: 环带中 max 亮度
        print("edge_ring1px_maxlum=%.1f" % rlum.max(), flush=True)
    else:
        print("edge_ring1px empty", flush=True)

    # 主体最大连通件占比
    print("max_connected_component_ratio=%.3f" % connected_max(alpha), flush=True)


if __name__ == "__main__":
    main()