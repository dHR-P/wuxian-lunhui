# -*- coding: utf-8 -*-
"""diag_zhengzha_glow.py — pc_zhengzha 下半部蓝白放射光晕数值检测（重生成验收）

历史问题：旧 pc_zhengzha 的 raw 在 y≈50-55% 以下有横贯 x≈2-98% 的蓝白放射逆光光晕
（ox-alpha 视觉确认 + alpha 组件近全宽 [0,84,767,959]）。本脚本用像素统计判定新候选
是否仍带该缺陷：

  1. 蓝白高亮像素（candidate glow）：RGB 中 B 显著主导（b >= r+35 且 b >= g+25）且
     亮度较高（b >= 150）。此类像素在纯黑背景立绘的「人物裤/靴」上几乎不出现
     （深色服饰 B 低），主体皮肤/衣物高光通常 R/G 接近或高于 B（肤色暖调）。
     例外：冷白主光照亮的白色高光区（r≈g≈b）不满足 b 主导条件，不会误报。
  2. 只看 y >= 40%（旧光晕起点 y≈50%，留余量）区域，计算该区域蓝白高亮像素占比。
  3. 同时报告整图 near-black 占比（背景纯度，参考 diag_hunter_holes 口径）。

判定参考（对 768x1024 原图）：
  - glowPct40 >= 3%   → 仍有明显放射光晕，不合格
  - glowPct40 < 1%    → 光晕基本消除，合格
  - 1% ~ 3%           → 视 bbox 分布人工判断（脚本会打印 top 连通域 bbox）

用法: <python> diag_zhengzha_glow.py [raw.png ...]   (默认 raw_enemy/pc_zhengzha.png)
输出: 控制台 + tools/design/diag_zhengzha_glow.txt
"""
import os
import sys
from collections import deque

import numpy as np
from PIL import Image

BASE = r"C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1"
RAW = os.path.join(BASE, "tools", "design", "raw_enemy")
OUT = os.path.join(BASE, "tools", "design")


def label_components(mask):
    """4-连通域标注, 返回 labels 与 {label: size}。"""
    h, w = mask.shape
    labels = np.zeros((h, w), dtype=np.int32)
    sizes = {}
    cur = 0
    for y in range(h):
        for x in range(w):
            if mask[y, x] and labels[y, x] == 0:
                cur += 1
                q = deque()
                q.append((y, x))
                labels[y, x] = cur
                cnt = 0
                while q:
                    cy, cx = q.popleft()
                    cnt += 1
                    for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
                        if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and labels[ny, nx] == 0:
                            labels[ny, nx] = cur
                            q.append((ny, nx))
                sizes[cur] = cnt
    return labels, sizes


def analyze(path):
    lines = []
    name = os.path.basename(path)
    img = Image.open(path).convert("RGBA")
    a = np.asarray(img).astype(np.float64)
    h, w = a.shape[:2]
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    d = np.sqrt(r * r + g * g + b * b)

    near_black = d <= 3.0
    whole_nb = 100.0 * near_black.mean()

    y_split = int(h * 0.40)
    lower = slice(y_split, h)
    glow = (b >= 150) & (b >= r + 35) & (b >= g + 25) & (d > 3.0)
    glow_lower = glow[lower]
    glow_cnt_lower = int(glow_lower.sum())
    glow_pct_lower = 100.0 * glow_lower.mean()

    # 蓝白高亮在下半部的 top 连通域 bbox（若占比介于 1-3% 用作人工判据）
    comps = []
    if glow_pct_lower >= 0.3:
        gl = glow.copy()
        gl[:y_split, :] = False
        labels, sizes = label_components(gl)
        total = glow_lower.sum()
        border = set(np.unique(np.concatenate([labels[y_split, :], labels[-1, :],
                                               labels[:, 0], labels[:, -1]])))
        border.discard(0)
        internal = [(l, s) for l, s in sizes.items() if l not in border]
        internal.sort(key=lambda t: -t[1])
        for l, s in internal[:4]:
            ys, xs = np.where(labels == l)
            comps.append((s, (ys.min(), ys.max(), xs.min(), xs.max())))
        touch_border = sum(sizes.get(l, 0) for l in border)
        comps.append(("border_touch", touch_border))

    msg = "%s: %dx%d near-black=%.1f%%  y>=40%% glow=%.2f%% (%d px)" % (
        name, w, h, whole_nb, glow_pct_lower, glow_cnt_lower)
    print(msg)
    lines.append(msg)
    for c in comps:
        if c[0] == "border_touch":
            lines.append("  glow 接触图像边缘像素=%d" % c[1])
        else:
            s, (y0, y1, x0, x1) = c
            lines.append("  glow comp size=%d bbox=(y %d-%d, x %d-%d)=%.1f%%x%.1f%%" % (
                s, y0, y1, x0, x1, 100.0 * (x1 - x0 + 1) / w, 100.0 * (y1 - y0 + 1) / h))
    if glow_pct_lower >= 3.0:
        verdict = "不合格: 明显蓝白放射光晕残留"
    elif glow_pct_lower < 1.0:
        verdict = "合格: 光晕基本消除"
    else:
        verdict = "需人工判断: 占比在 1-3% 区间, 看 bbox 分布"
    print("  verdict: " + verdict)
    lines.append("  verdict: " + verdict)
    return lines


if __name__ == "__main__":
    paths = sys.argv[1:] or [os.path.join(RAW, "pc_zhengzha.png")]
    out_lines = []
    for p in paths:
        if not os.path.exists(p):
            print("missing %s" % p)
            continue
        out_lines += analyze(p)
        out_lines.append("")
    outfile = os.path.join(OUT, "diag_zhengzha_glow.txt")
    with open(outfile, "w", encoding="utf-8") as f:
        f.write("\n".join(out_lines) + "\n")
    print("\nwritten to %s" % outfile)