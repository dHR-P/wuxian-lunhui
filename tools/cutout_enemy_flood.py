# -*- coding: utf-8 -*-
"""Flood-fill background removal for sprites whose bg is a gradient / mixed tone
(licker pale-cyan gradient, horde black+cyan mix) where single-color distance
fails. Seeds = all border pixels; grows while neighbor color-diff <= T (Manhattan).
Numpy-vectorized multi-round expansion; stops when no growth.
Usage: <python> cutout_enemy_flood.py [rawdir] [outdir]
"""
import os
import sys

import numpy as np
from PIL import Image

BASE = r"C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1"
RAW = os.path.join(BASE, "tools", "design", "raw_enemy")
OUT = os.path.join(BASE, "server-rs", "ui", "assets", "img")

TARGETS = ["licker", "horde"]
T = 45  # manhattan color-gap threshold
MAX_ROUNDS = 4000


def flood_bg(a, T=T, max_rounds=MAX_ROUNDS):
    """Return boolean mask: True = background (connected to border via color-continuity)."""
    h, w, _ = a.shape
    bg = np.zeros((h, w), dtype=bool)
    bg[0, :] = True
    bg[-1, :] = True
    bg[:, 0] = True
    bg[:, -1] = True
    a32 = a.astype(np.int32)
    for _ in range(max_rounds):
        cand = np.zeros_like(bg)
        cand[1:, :] |= bg[:-1, :]
        cand[:-1, :] |= bg[1:, :]
        cand[:, 1:] |= bg[:, :-1]
        cand[:, :-1] |= bg[:, 1:]
        cand &= ~bg
        ys, xs = np.nonzero(cand)
        if len(ys) == 0:
            break
        best = np.full(len(ys), 10 ** 9, dtype=np.int64)
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny = ys + dy
            nx = xs + dx
            valid = (ny >= 0) & (ny < h) & (nx >= 0) & (nx < w)
            nbg = np.zeros(len(ys), dtype=bool)
            nbg[valid] = bg[ny[valid], nx[valid]]
            diff = np.full(len(ys), 10 ** 9, dtype=np.int64)
            diff[valid] = np.abs(
                a32[ys[valid], xs[valid]] - a32[ny[valid], nx[valid]]
            ).sum(axis=1)
            upd = np.where(nbg, diff, 10 ** 9)
            best = np.minimum(best, upd)
        ok = best <= T
        if not ok.any():
            break
        bg[ys[ok], xs[ok]] = True
    return bg


def main():
    raw = sys.argv[1] if len(sys.argv) > 1 else RAW
    out = sys.argv[2] if len(sys.argv) > 2 else OUT
    os.makedirs(out, exist_ok=True)
    for cid in TARGETS:
        src = os.path.join(raw, "%s.png" % cid)
        dst = os.path.join(out, "enemy_%s.png" % cid)
        if not os.path.exists(src):
            print("skip missing %s" % src)
            continue
        img = Image.open(src).convert("RGB")
        a = np.asarray(img)
        bgm = flood_bg(a)
        # alpha: bg=0, subject=255, 1px feather via laplacian-ish smoothing of edge
        alpha = np.where(bgm, 0, 255).astype(np.uint8)
        rgba = np.dstack([a, alpha])
        out_img = Image.fromarray(rgba, "RGBA")
        out_img.save(dst, "PNG")
        # self-check
        chk = np.asarray(Image.open(dst).convert("RGBA"))
        al = chk[..., 3]
        tot = al.size
        print(
            "%s: bg(transparent)=%.1f%%  mid=%.1f%%  opaque=%.1f%%  bgpx=%d"
            % (
                cid,
                (al <= 2).mean() * 100,
                ((al > 2) & (al < 253)).mean() * 100,
                (al >= 253).mean() * 100,
                int((al <= 2).sum()),
            )
        )
    print("done")


if __name__ == "__main__":
    main()