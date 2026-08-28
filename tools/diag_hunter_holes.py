# -*- coding: utf-8 -*-
"""Diagnose whether hunter's "torso hole" is a generation defect or a cutout artifact.

Method: load the RAW black-bg original (before cutout). Compute per-pixel distance to black.
Build a mask of "near-black" pixels (d <= 3, the exact threshold cutout_enemy.py uses).
Label connected components of that mask that touch the image border -> these are external
background, expected. Components that do NOT touch the border = internal near-black regions
(= regions the v1 cutout would erase as transparent). If big internal components exist with
real body pixels around them, the raw image itself has deep black holes in the subject
(generation issue) OR the subject edges are porous. Report coordinates/size of the largest
internal components to cross-check with the vision subagent's verdict.
"""
import os
import sys

import numpy as np
from PIL import Image

RAW = r"C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1\tools\design\raw_enemy"
OUT = r"C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1\tools\design"


def label_components(mask):
    """4-neighbour connected component labeling, return labels array + sizes dict."""
    h, w = mask.shape
    labels = np.zeros((h, w), dtype=np.int32)
    sizes = {}
    cur = 0
    # iterative scanline-ish BFS with a simple queue
    from collections import deque
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


def main():
    lines = []
    lines.append("=== hunter 内部近黑连通域诊断 ===")
    src = os.path.join(RAW, "hunter.png")
    if not os.path.exists(src):
        print("missing %s" % src)
        sys.exit(1)
    img = Image.open(src).convert("RGBA")
    a = np.asarray(img).astype(np.float64)
    d = np.sqrt((a[..., 0]) ** 2 + (a[..., 1]) ** 2 + (a[..., 2]) ** 2)
    h, w = d.shape
    mask = d <= 3.0
    print("image %dx%d, near-black(d<=3) ratio: %.1f%%" % (w, h, 100.0 * mask.mean()))
    lines.append("image %dx%d, near-black(d<=3) ratio: %.1f%%" % (w, h, 100.0 * mask.mean()))

    labels, sizes = label_components(mask)
    n_comp = len(sizes)
    print("connected components of near-black mask: %d" % n_comp)
    lines.append("connected components: %d" % n_comp)

    total = mask.sum()
    border = set(np.unique(np.concatenate([
        labels[0, :], labels[-1, :], labels[:, 0], labels[:, -1],
    ])))
    border.discard(0)
    border_touch = sum(sizes.get(l, 0) for l in border)
    print("border-touching (external bg) pixels: %d = %.1f%% of near-black" % (
        border_touch, 100.0 * border_touch / max(total, 1)))
    lines.append("border-touching (external bg): %d (%.1f%% of near-black)" % (
        border_touch, 100.0 * border_touch / max(total, 1)))

    internal = [(l, s) for l, s in sizes.items() if l not in border]
    internal.sort(key=lambda t: -t[1])
    print("\ninternal (non-border) near-black components (top 10):")
    lines.append("\ninternal (non-border) near-black components (top 10):")
    for l, s in internal[:10]:
        ys, xs = np.where(labels == l)
        y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
        frac = s / float(h * w)
        pct = 100.0 * frac
        print("  size=%d (%.2f%% of image) bbox=(y %d-%d, x %d-%d)" % (s, pct, y0, y1, x0, x1))
        lines.append("  size=%d (%.2f%%) bbox=(y %d-%d, x %d-%d)" % (s, pct, y0, y1, x0, x1))

    # Sum of internal holes vs body: rough "porosity" of subject
    inner_sum = sum(s for _, s in internal)
    print("\ntotal internal near-black pixels: %d (%.2f%% of image) -> these are what v1 "
          "cutout erases inside the subject" % (inner_sum, 100.0 * inner_sum / (h * w)))
    lines.append("\ntotal internal near-black pixels: %d (%.2f%%) -> v1 cutout erases these inside subject"
                 % (inner_sum, 100.0 * inner_sum / (h * w)))

    # Also report for the OTHER sprites for comparison baseline
    lines.append("\n--- 对比基线(其他原图) ---")
    for name in ("zombie", "guard", "horde", "licker", "pc_zhengzha"):
        p = os.path.join(RAW, name + ".png")
        if not os.path.exists(p):
            continue
        im = Image.open(p).convert("RGBA")
        aa = np.asarray(im).astype(np.float64)
        dd = np.sqrt((aa[..., 0]) ** 2 + (aa[..., 1]) ** 2 + (aa[..., 2]) ** 2)
        hh, ww = dd.shape
        mk = dd <= 3.0
        lb, sz = label_components(mk)
        bd = set(np.unique(np.concatenate([lb[0, :], lb[-1, :], lb[:, 0], lb[:, -1]])))
        bd.discard(0)
        inner = sum(s for l, s in sz.items() if l not in bd)
        print("%s: %dx%d near-black=%.1f%% internal-holes=%d (%.2f%%)" % (
            name, ww, hh, 100.0 * mk.mean(), inner, 100.0 * inner / (hh * ww)))
        lines.append("%s: %dx%d near-black=%.1f%% internal-holes=%d (%.2f%%)" % (
            name, ww, hh, 100.0 * mk.mean(), inner, 100.0 * inner / (hh * ww)))

    outfile = os.path.join(OUT, "diag_hunter_holes.txt")
    with open(outfile, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    print("\nwritten to %s" % outfile)


if __name__ == "__main__":
    main()