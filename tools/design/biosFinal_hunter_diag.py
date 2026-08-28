# -*- coding: utf-8 -*-
"""biosFinal_hunter_diag.py — 分析 hunter baseline vs FINAL2 vs raw 在左胸区差异,辅助 FINAL3 手术设计。
输出:
  1) 各 cut 透明占比、主体连通、bbox、边缘环带 0% 亮边检查
  2) baseline 相对 FINAL2 的 alpha 差异 bbox(找 FINAL2 被过度掏空的区域)
  3) 左胸区定义与 integrity 统计
"""
import sys
import numpy as np
from PIL import Image

BASE = r"C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1\tools\design"
BASELINE = BASE + r"\cutout_out\hunter_wan3_cut_BASELINE.png"
FINAL2 = BASE + r"\cutout_out\hunter_wan3_cut_FINAL2.png"
RAW = BASE + r"\raw_enemy\hunter_wan3.png"


def load(p):
    im = Image.open(p).convert("RGBA")
    a = np.asarray(im)
    return a[..., :3], a[..., 3]


def stats(name, alpha):
    h, w = alpha.shape
    total = h * w
    trans = (alpha <= 5).sum() / total
    opaque = (alpha >= 250).sum() / total
    body = alpha >= 250
    ys, xs = np.where(body)
    bbox = (int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())) if len(ys) else None
    # 边缘 1px 环带亮边检查(body 边界外 1px 中 alpha=0 但 RGB 亮? 像素级以 RGB 增益>=180 计)
    rgb_names = {1: "raw"}
    print("[%s] trans=%.3f opaque=%.3f bbox=%s" % (name, trans, opaque, bbox))
    return body, bbox


print("=== RAW ===", flush=True)
r_rgb, r_alpha = load(RAW)
stats("RAW", (r_alpha * 0 + 255).astype(np.uint8))  # raw 无 alpha

print("\n=== BASELINE ===", flush=True)
b_rgb, b_alpha = load(BASELINE)
stats("BASELINE", b_alpha)

print("\n=== FINAL2 ===", flush=True)
f_rgb, f_alpha = load(FINAL2)
stats("FINAL2", f_alpha)

# 差异区域: baseline 不透明但 FINAL2 透明的(baseline solid 被 FINAL2 掏掉的部分)
print("\n=== BASELINE-minus-FINAL2 (被 FINAL2 掏掉的 solid) ===", flush=True)
base_solid = b_alpha >= 250
fin2_trans = f_alpha <= 5
removed = base_solid & fin2_trans
if removed.any():
    ys, xs = np.where(removed)
    print("removed_count=%d bbox=(%d,%d)-(%d,%d)" % (
        removed.sum(), xs.min(), ys.min(), xs.max(), ys.max()), flush=True)
    # 分上/中/下段分布
    H = b_alpha.shape[0]
    for name, sl in [("top(0-33%)", slice(0, H//3)), ("mid(33-66%)", slice(H//3, 2*H//3)), ("low(66-100%)", slice(2*H//3, H))]:
        seg = removed[sl]
        if seg.any():
            yy, xx = np.where(seg)
            print("   %s: %d px bbox=(%d,%d)-(%d,%d)" % (name, seg.sum(), xx.min(), yy.min(), xx.max(), yy.max()), flush=True)
else:
    print("no removed", flush=True)

# FINAL2 中左胸区域是否存在非透明(即左胸是否已被掏空)
print("\n=== FINAL2 left-chest region (x115-225, y300-420 参考) ===", flush=True)
lc_f = f_alpha[300:420, 115:225]
print("FINAL2 leftchest opaque_ratio=%.3f trans_ratio=%.3f" % (
    (lc_f >= 250).mean(), (lc_f <= 5).mean()), flush=True)
lc_b = b_alpha[300:420, 115:225]
print("BASELINE leftchest opaque_ratio=%.3f trans_ratio=%.3f" % (
    (lc_b >= 250).mean(), (lc_b <= 5).mean()), flush=True)