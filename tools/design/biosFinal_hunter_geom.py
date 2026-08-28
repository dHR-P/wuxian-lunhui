# -*- coding: utf-8 -*-
"""biosFinal_hunter_geom.py — 精确测量 baseline 与 FINAL2 在候选 void / 左胸区的不透明与亮度,定 FINAL3 手术策略。
"""
import sys
import numpy as np
from PIL import Image

BASE = r"C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1\tools\design"
BASELINE = BASE + r"\cutout_out\hunter_wan3_cut_BASELINE.png"
FINAL2 = BASE + r"\cutout_out\hunter_wan3_cut_FINAL2.png"


def load(p, rgb_too=True):
    a = np.asarray(Image.open(p).convert("RGBA"))
    if rgb_too:
        return a[..., :3].astype(np.int16), a[..., 3].astype(np.int16)
    return a[..., 3]


b_rgb, b_alpha = load(BASELINE)
f_rgb, f_alpha = load(FINAL2)

# 候选 void bbox (glm 估): x230-310, y280-465
voids = {
    "void_glm(230-310,280-465)": (230, 280, 310, 465),
    "void_tight(235-300,285-460)": (235, 285, 300, 460),
    "chest_left(300-420,230-330)": (300, 230, 420, 330),
    "chest_top(290-360,230-300)": (290, 230, 360, 300),
    "arm_upper(150-280,180-350)": (150, 180, 280, 350),
}
for name, (x0, y0, x1, y1) in voids.items():
    bb = b_alpha[y0:y1, x0:x1]
    ff = f_alpha[y0:y1, x0:x1]
    bl = b_rgb[y0:y1, x0:x1]
    # baseline 该区不透明占比 + 其中近纯背景(lum<30)占比
    blum = bl.mean(axis=2)
    bo = (bb >= 250).mean()
    bodark = ((bb >= 250) & (blum < 30)).mean()
    fo = (ff >= 250).mean()
    print("[%s] bbox=%s baseline_opaque=%.3f baseline_opaque_darklum<30=%.3f fin2_opaque=%.3f" % (
        name, (x0, y0, x1, y1), bo, bodark, fo), flush=True)

# 全图找"baseline 不透明但 lum<25(近背景黑)"的纯黑填充 void 连通域
print("\n=== 扫描 baseline 中『不透明且极暗(lum<25)』的连通域 ===", flush=True)
import scipy.ndimage as ndi
solid = b_alpha >= 250
blum = b_rgb.mean(axis=2)
dark_region = solid & (blum < 25)
lab, n = ndi.label(dark_region)
sizes = ndi.sum(dark_region, lab, range(1, n + 1))
order = np.argsort(sizes)[::-1]
print("n_dark_solid_components=%d" % n, flush=True)
top = min(6, n)
for i in order[:top]:
    s = sizes[i]
    comp = lab == (i + 1)
    ys, xs = np.where(comp)
    print("comp#%d size=%d bbox=(%d,%d)-(%d,%d) center=(%d,%d)" % (
        i + 1, s, xs.min(), ys.min(), xs.max(), ys.max(),
        int(xs.mean()), int(ys.mean())), flush=True)