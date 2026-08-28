# -*- coding: utf-8 -*-
"""Generic raw-sprite body-shape check (works on any raw black-bg sprite).

Checks for the known failure modes of this Z-Image pipeline:
  1. torso/limb porosity: big INTERNAL near-black components (d<=3) => subject has
     deep black holes that flood cutout cannot distinguish from background.
  2. half-body generation: subject pixels concentrated in only bottom or top half
     (Z-Image "no glow" negative overfitting produced half bodies for pc_zhengzha).
  3. content bbox coverage: overall body bounding box sanity (head should reach near
     top, feet near 78% height per prompt).

Usage:
  python diag_body_check.py <file1.png> [file2.png ...]
Paths are relative to design/raw_enemy/. Prints a report and writes
design/diag_body_check.txt
"""
import os
import sys
from collections import deque

import numpy as np
from PIL import Image

RAW = r"C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1\tools\design\raw_enemy"
OUT = r"C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1\tools\design"


def label_components(mask):
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


def check_one(name, lines):
    src = os.path.join(RAW, name)
    if not os.path.exists(src):
        lines.append("%s: MISSING" % name)
        print("%s: MISSING" % name)
        return
    img = Image.open(src).convert("RGBA")
    a = np.asarray(img).astype(np.float64)
    d = np.sqrt(a[..., 0] ** 2 + a[..., 1] ** 2 + a[..., 2] ** 2)
    h, w = d.shape
    nb = d <= 3.0
    body = ~nb  # non-near-black = "subject-ish" pixels
    nb_ratio = 100.0 * nb.mean()

    lines.append("=== %s (%dx%d) ===" % (name, w, h))
    lines.append("near-black(d<=3) ratio: %.1f%%" % nb_ratio)

    # body bbox
    if body.any():
        ys, xs = np.where(body)
        y0, y1, x0, x1 = int(ys.min()), int(ys.max()), int(xs.min()), int(xs.max())
        bw, bh = x1 - x0 + 1, y1 - y0 + 1
        lines.append("body bbox: x %d-%d (%.1f%%-%.1f%% of W), y %d-%d (%.1f%%-%.1f%% of H), size %dx%d" % (
            x0, x1, 100.0 * x0 / w, 100.0 * x1 / w, y0, y1, 100.0 * y0 / h, 100.0 * y1 / h, bw, bh))
        # vertical distribution: subject pixels per half
        top_half = body[:h // 2].sum()
        bot_half = body[h // 2:].sum()
        head_zone = body[:int(h * 0.12)].sum()   # expected >0 (head at top)
        foot_zone = body[int(h * 0.72):].sum()   # feet around 78%
        lines.append("subject px top-half: %d (%.1f%%), bottom-half: %d (%.1f%%)" % (
            top_half, 100.0 * top_half / max(body.sum(), 1),
            bot_half, 100.0 * bot_half / max(body.sum(), 1)))
        lines.append("head zone (y<12%%): %d px  |  feet zone (y>72%%): %d px" % (
            head_zone, foot_zone))
    else:
        lines.append("NO subject pixels?!")
        return

    # internal near-black components (holes inside subject that flood cannot separate)
    labels, sizes = label_components(nb)
    border = set(np.unique(np.concatenate([
        labels[0, :], labels[-1, :], labels[:, 0], labels[:, -1]])))
    border.discard(0)
    internal = [(l, s) for l, s in sizes.items() if l not in border]
    internal.sort(key=lambda t: -t[1])
    inner_sum = sum(s for _, s in internal)
    # exclude components that sit clearly OUTSIDE the body bbox (background far corners)
    outside = 0
    for l, s in internal:
        ys, xs = np.where(labels == l)
        cy, cx = (ys.min() + ys.max()) / 2.0, (xs.min() + xs.max()) / 2.0
        # rough: centroid outside body bbox => background region enclosed by grey islands
        if cx < x0 or cx > x1 or cy < y0 or cy > y1:
            outside += s
    true_inner = inner_sum - outside
    lines.append("internal near-black components: %d, total %d px (%.2f%% of image), "
                 "of which outside-body-bbox: %d px; true inner holes ~ %d px (%.2f%%)" % (
                     len(internal), inner_sum, 100.0 * inner_sum / (h * w), outside,
                     true_inner, 100.0 * true_inner / (h * w)))
    for l, s in internal[:5]:
        ys, xs = np.where(labels == l)
        cy, cx = (ys.min() + ys.max()) / 2.0, (xs.min() + xs.max()) / 2.0
        tag = "OUTSIDE-bbox" if (cx < x0 or cx > x1 or cy < y0 or cy > y1) else "IN-body"
        lines.append("  hole size=%d (%.2f%%) centroid=(%.0f,%.0f) [%s]" % (
            s, 100.0 * s / (h * w), cy, cx, tag))
    print("\n".join(lines[-6:]))


def main():
    names = sys.argv[1:]
    if not names:
        print("usage: python diag_body_check.py <file>.png [...]")
        sys.exit(1)
    lines = ["diag_body_check report"]
    for n in names:
        if not n.endswith(".png"):
            n += ".png"
        check_one(n, lines)
        lines.append("")
    outfile = os.path.join(OUT, "diag_body_check.txt")
    with open(outfile, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    print("\nwritten to %s" % outfile)


if __name__ == "__main__":
    main()