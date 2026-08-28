# -*- coding: utf-8 -*-
"""Debug probe: why hole-channel 6 + hole-solid filled the whole background.
Replicates cutout_floodfill.cutout up to fix-holes and prints areas per stage.
"""
import os
import sys

import numpy as np
from PIL import Image

TOOLS = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, TOOLS)
import cutout_floodfill as cf

RAW = os.path.join(os.path.dirname(os.path.abspath(__file__)), "raw_enemy", "pc_zhengzha.png")

img = Image.open(RAW).convert("RGBA")
arr = np.asarray(img).astype(np.float64)
rgb = arr[..., :3]
h, w = rgb.shape[:2]
bg = cf.auto_bg(rgb)
d = np.sqrt(((rgb - bg) ** 2).sum(axis=2))
near = d <= 6.0
print("near(d<=6) ratio: %.2f%%" % (100.0 * near.mean()))

seal = 2
conn = 4
border_near = near.copy()
border_near[1:-1, 1:-1] = False
near_seed = cf.erode_np(near, seal, conn)
seeds = cf.dilate_np(border_near, seal, conn) & near_seed
bgf = cf.flood_mask(near_seed, conn, seeds=seeds)
bgf = cf.dilate_np(bgf, seal, conn) & near
alpha = np.where(~bgf, 255, 0).astype(np.uint8)
print("after flood: alpha==0 ratio: %.2f%% (external bg)" % (100.0 * (alpha == 0).mean()))

zeros = alpha == 0
# raw boundary check
border = np.concatenate([zeros[0, :], zeros[-1, :], zeros[:, 0], zeros[:, -1]])
print("zeros on image border: %.2f%% True" % (100.0 * border.mean()))

for hc in (2, 6):
    zc = cf.ndi.binary_closing(zeros, structure=np.ones((3, 3), dtype=bool),
                               iterations=hc, border_value=1)
    print("hc=%d: zc ratio=%.2f%%  zc border True=%.2f%%" % (
        hc, 100.0 * zc.mean(), 100.0 * np.concatenate([zc[0, :], zc[-1, :], zc[:, 0], zc[:, -1]]).mean()))
    fl = cf.flood_mask(zc, conn)
    print("hc=%d: flood(zc) ratio=%.2f%%  enclosed=zc&~flood ratio=%.2f%%" % (
        hc, 100.0 * fl.mean(), 100.0 * (zc & ~fl).mean()))
    enc = zc & ~fl
    if enc.any():
        ys, xs = np.where(enc)
        print("hc=%d: enclosed bbox y=%d-%d x=%d-%d" % (hc, ys.min(), ys.max(), xs.min(), xs.max()))

# also check WITH seal dilation reversed like binary_closing on zeros (subject structural)
# what does scipy closing of zeros do to a thin subject? measure: alpha>0 thin parts swallowed
sub = alpha > 0
zc2 = cf.ndi.binary_closing(zeros, structure=np.ones((3, 3), dtype=bool), iterations=6)
swallowed = sub & zc2  # subject pixels that became zeros after closing (should be ~0)
print("subject pixels swallowed into zc after closing6: %d (%.3f%% of subject)" % (
    int(swallowed.sum()), 100.0 * swallowed.mean() if sub.any() else 0))