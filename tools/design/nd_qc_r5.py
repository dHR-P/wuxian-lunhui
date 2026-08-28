# -*- coding: utf-8 -*-
"""nd_qc_r5.py — 数值复核 r5 raw:背景是否纯黑、有无白/亮描边环带、主体占比、边缘带亮度。
用于 glm 判定的兜底客观数据。透明 PNG 也会被检测(RGBA)。
"""
import sys, numpy as np
from PIL import Image

def analyze(path):
    img = Image.open(path).convert("RGBA")
    a = np.asarray(img).astype(np.float32)
    h, w = a.shape[:2]
    rgb = a[..., :3]
    alpha = a[..., 3]
    luma = rgb.mean(axis=2)

    # 背景黑度:四角 10x10 区域 + 四边带
    corners = np.concatenate([
        rgb[0:10, 0:10].reshape(-1,3), rgb[0:10, w-10:w].reshape(-1,3),
        rgb[h-10:h, 0:10].reshape(-1,3), rgb[h-10:h, w-10:w].reshape(-1,3)])
    corner_max = corners.max()
    corner_mean = corners.mean()

    # 整体非黑像素占比(任一通道>35 视为亮)
    bright = (rgb.max(axis=2) > 35)
    subject = (alpha > 20) if (alpha.min() < 250) else bright
    subject_ratio = subject.mean()

    # 边缘环带(贴近图像边界的窄带)亮度>=180 占比 = 白描边/光晕污染
    band = np.zeros((h, w), bool)
    bw = max(1, w // 200)
    bh = max(1, h // 200)
    band[:bh, :] = band[-bh:, :] = band[:, :bw] = band[:, -bw:] = True
    band &= subject
    edge_bright = luma[band]
    edge_bright_ratio = float((edge_bright >= 180).mean()) if edge_bright.size else 0.0
    top_bright = float((luma[0:bh, :] >= 180).mean())
    bottom_bright = float((luma[-bh:, :] >= 180).mean())

    # alpha 透明像素的 RGB 是否=0(zero-rgb 检查,针对 cut)
    trans = alpha == 0
    trans_rgb_zero = float((~trans).mean())  # 不透明比例
    trans_colored = float((rgb[trans].max(axis=1) > 5).mean()) if trans.any() else 0.0

    print("--- %s (%dx%d) ---" % (path.split('\\')[-1], w, h))
    print("  corner_max=%.1f corner_mean=%.1f (纯黑~0)" % (corner_max, corner_mean))
    print("  subject_bright_ratio=%.3f (主体/亮像素占比)" % subject_ratio)
    print("  edge_band_bright(>=180) ratio=%.4f (白描边污染;0=无)" % edge_bright_ratio)
    print("  top_edge_bright=%.4f bottom_edge_bright=%.4f" % (top_bright, bottom_bright))
    print("  opaque_ratio=%.3f (不透明占比) trans_colored=%.4f (透明区RGB>5比例;0=好)" % (trans_rgb_zero, trans_colored))
    return dict(corner_max=corner_max, corner_mean=corner_mean, subject=subject_ratio,
                edge=edge_bright_ratio, top_edge=top_bright, bottom_edge=bottom_bright,
                opaque=trans_rgb_zero, trans_colored=trans_colored)

if __name__ == "__main__":
    for p in sys.argv[1:]:
        analyze(p)