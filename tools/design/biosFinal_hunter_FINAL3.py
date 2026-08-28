# -*- coding: utf-8 -*-
"""biosFinal_hunter_FINAL3.py — hunter_wan3 FINAL3 受限局部手术。
原则(严格避免 FINAL2 的全局低亮度误掏):
  - 基座 = BASELINE flood 抠图(左胸/躯干/肌肉全部完整, void 被 --hole-solid 填实)。
  - 补刀只在「主臂-躯空隙」的紧致局部 bbox 内进行; 且仅当暗色区域同时满足
      (1)不透明且 lum<30  (2)被不透明区完全包围(封闭, 不与图像边缘/open 通路连通)
    才将其透明化为背景。
  - 绝不触碰左胸/腋下/肩部肌肉: 这些区域不透明明亮, 不含 lum<30 大片, 天然被排除;
    即使进入 bbox, 也因不满足 lum<30 或封闭判定而不处理。
输入: baseline + void bbox。输出: FINAL3。
"""
import sys
import numpy as np
from PIL import Image
import scipy.ndimage as ndi

BASE = r"C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1\tools\design"
BASELINE = BASE + r"\cutout_out\hunter_wan3_cut_BASELINE.png"
OUT = BASE + r"\cutout_out\hunter_wan3_cut_FINAL3.png"

# 主臂-躯空隙 comp#176 bbox=(134,336)-(259,609), center=(197,457); 加余量
VOID_BBOX = (120, 320, 275, 625)   # (x0,y0,x1,y1)
LUM_TH = 30.0


def main():
    a = np.array(Image.open(BASELINE).convert("RGBA"))  # copy → writable
    rgb = a[..., :3].astype(np.float64)
    alpha = a[..., 3].astype(np.float64)
    body = alpha >= 250
    H, W = body.shape

    lum = rgb.mean(axis=2)
    dark = body & (lum < LUM_TH)

    x0, y0, x1, y1 = VOID_BBOX
    # 仅在该局部 bbox 内作业
    sub_dark = np.zeros_like(dark)
    sub_dark[y0:y1, x0:x1] = dark[y0:y1, x0:x1]

    # 封闭判定: 该暗区连通域是否完全被不透明 body 包围而且不接触图像边缘
    lab, n = ndi.label(sub_dark)
    enclosed_mask = np.zeros_like(dark)
    for i in range(1, n + 1):
        comp = lab == i
        ys, xs = np.where(comp)
        # 触边(与图像边缘接触)→ 开口, 非封闭空隙, 跳过
        touches_edge = (ys.min() == 0) or (ys.max() == H - 1) or (xs.min() == 0) or (xs.max() == W - 1)
        if touches_edge:
            continue
        # 检查该连通域是否被不透明包围: 检查其 1px 外扩邻域是否几乎都是 body(或等于该区本身)
        dil = ndi.binary_dilation(comp, iterations=2)
        fringe = dil & ~comp
        # 邻域中非 body 的部分占比(应接近 0 才算被 body 包围)。允许极少(边界抗锯齿)容差。
        nonbody = (~body) & fringe
        ratio = nonbody.sum() / max(1, fringe.sum())
        if ratio <= 0.15:  # 被包围: 邻域几乎全是不透明 body
            enclosed_mask |= comp

    if not enclosed_mask.any():
        print("NO_ENCLOSED_DARK_IN_BBOX", flush=True)
    n_px = int(enclosed_mask.sum())
    print("float_enclosed_px=%d" % n_px, flush=True)

    # 生效: 这些像素置透明；RGB 置 0(--zero-rgb 口径)
    a[enclosed_mask, 3] = 0
    a[enclosed_mask, 0:3] = 0

    Image.fromarray(a, "RGBA").save(OUT, "PNG")

    # 复核
    chk = np.asarray(Image.open(OUT).convert("RGBA"))
    al = chk[..., 3]
    print("FINAL3 trans=%.3f opaque=%.3f" % ((al <= 5).mean(), (al >= 250).mean()), flush=True)
    print("SAVED %s" % OUT, flush=True)


if __name__ == "__main__":
    main()