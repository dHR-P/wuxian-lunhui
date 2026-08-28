# -*- coding: utf-8 -*-
"""diag_cutout.py — 抠图成品统计诊断（用于新旧管线对比）

对每张抠图输出：
  ① 背景透明占比   alpha<=5 的像素比例
  ② 半透明占比     5<alpha<250 的像素比例
  ③ 全不透明占比   alpha>=250 的像素比例
  ④ 主体包围盒     alpha>128 的 bounding box (x0,y0,x1,y1,w,h)
  ⑤ 主体内部孤立透明孔洞数量：对 (alpha<=5) 掩膜做 4 连通分量标记，
     统计「不接触图像边界」的连通区域个数（连通到边界的即背景，不算孔洞），
     并给出最大孔洞面积(px)。scipy 可用则用 scipy.ndimage.label，否则自写四邻域 BFS。

用法：
  <python> diag_cutout.py <png...>
  <python> diag_cutout.py --json out.json <png...>     # 额外落一份 JSON
  <python> diag_cutout.py --md-rows <png...>           # 输出 Markdown 表行
"""
import argparse
import json
import os
import sys

import numpy as np
from PIL import Image

try:
    from scipy import ndimage as ndi
    HAS_SCIPY = True
except Exception:
    HAS_SCIPY = False


def count_interior_holes(holes):
    """holes: bool 掩膜（alpha<=5）。返回 (不接触边界的连通区域数, 最大孔洞面积px)。"""
    if not holes.any():
        return 0, 0
    h, w = holes.shape
    if HAS_SCIPY:
        lbl, n = ndi.label(holes, structure=ndi.generate_binary_structure(2, 1))
        border_labels = set(np.unique(np.concatenate([
            lbl[0, :], lbl[-1, :], lbl[:, 0], lbl[:, -1]])))
        sizes = np.bincount(lbl.ravel())
        n_holes = 0
        max_sz = 0
        for lab in range(1, n + 1):
            if lab in border_labels:
                continue
            n_holes += 1
            if sizes[lab] > max_sz:
                max_sz = int(sizes[lab])
        return n_holes, max_sz
    # 自写四邻域 BFS 回退实现
    visited = np.zeros_like(holes, dtype=bool)
    n_holes = 0
    max_sz = 0
    for y in range(h):
        for x in range(w):
            if not holes[y, x] or visited[y, x]:
                continue
            # BFS 收集连通分量
            stack = [(y, x)]
            visited[y, x] = True
            sz = 0
            touches_border = False
            while stack:
                cy, cx = stack.pop()
                sz += 1
                if cy == 0 or cy == h - 1 or cx == 0 or cx == w - 1:
                    touches_border = True
                for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                    ny, nx = cy + dy, cx + dx
                    if 0 <= ny < h and 0 <= nx < w and holes[ny, nx] and not visited[ny, nx]:
                        visited[ny, nx] = True
                        stack.append((ny, nx))
            if not touches_border:
                n_holes += 1
                max_sz = max(max_sz, sz)
    return n_holes, max_sz


def analyze(path):
    img = Image.open(path).convert("RGBA")
    a = np.asarray(img).astype(np.uint8)
    al = a[..., 3].astype(np.int64)
    h, w = al.shape
    total = h * w
    sub = al > 128
    if sub.any():
        ys, xs = np.nonzero(sub)
        box = (int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max()),
               int(xs.max() - xs.min() + 1), int(ys.max() - ys.min() + 1))
    else:
        box = None
    n_holes, max_hole = count_interior_holes(al <= 5)
    stats = dict(
        file=os.path.basename(path), size=(int(w), int(h)), mode=img.mode,
        trans=float((al <= 5).sum()) / total * 100,
        semi=float(((al > 5) & (al < 250)).sum()) / total * 100,
        opaque=float((al >= 250).sum()) / total * 100,
        bbox=box, holes=int(n_holes), max_hole_px=int(max_hole),
        scipy=HAS_SCIPY,
    )
    return stats


def print_stats(s):
    box = "EMPTY" if s["bbox"] is None else \
        "(%d,%d)-(%d,%d) %dx%d" % s["bbox"]
    print("%s: %dx%d %s | alpha<=5: %.2f%% | 5<alpha<250: %.2f%% | "
          "alpha>=250: %.2f%% | bbox: %s | interior_holes: %d | max_hole: %dpx"
          % (s["file"], s["size"][0], s["size"][1], s["mode"],
             s["trans"], s["semi"], s["opaque"], box, s["holes"],
             s["max_hole_px"]))


def main():
    ap = argparse.ArgumentParser(description="抠图统计诊断")
    ap.add_argument("files", nargs="+", help="PNG 文件路径")
    ap.add_argument("--json", default=None, help="额外写入 JSON 结果文件")
    ap.add_argument("--md-rows", action="store_true", help="输出 Markdown 表行")
    args = ap.parse_args()

    results = []
    for f in args.files:
        try:
            s = analyze(f)
        except Exception as e:
            print("FAIL %s: %s" % (f, e), file=sys.stderr)
            continue
        results.append(s)
        print_stats(s)
        if args.md_rows:
            box = "EMPTY" if s["bbox"] is None else "(%d,%d)-(%d,%d)" % s["bbox"][:4]
            print("| %s | %.2f | %.2f | %.2f | %s | %d | %d |"
                  % (s["file"], s["trans"], s["semi"], s["opaque"],
                     box, s["holes"], s["max_hole_px"]))

    if args.json and results:
        with open(args.json, "w", encoding="utf-8") as fh:
            json.dump(results, fh, ensure_ascii=False, indent=2)
        print("json -> %s" % args.json)


if __name__ == "__main__":
    main()