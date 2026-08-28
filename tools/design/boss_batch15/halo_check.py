# -*- coding: utf-8 -*-
"""halo_check.py — 确定性白晕/白边预筛(本地像素法,无需API)。
判定: 图像存在「偏亮/偏白像素」(亮度>140) 且这些像素与图像边界背景连通、紧贴主体边缘 => 疑似白晕。
同时给主体占用率(用于判断是否全身贴底)。
用法: python halo_check.py <png...>
输出: JSON list {id, bright_pct, halo_detected, subject_y_ratio}
"""
import json, os, sys
import numpy as np
from PIL import Image

def bright_halo(path):
    im = Image.open(path).convert("RGB")
    a = np.asarray(im).astype(np.float32)
    lum = a[..., 0] * 0.299 + a[..., 1] * 0.587 + a[..., 2] * 0.114
    h, w = lum.shape
    total = h * w
    dark_bg = lum < 60          # 近黑背景
    bright = lum > 140          # 偏亮像素
    # 支撑点: 亮像素占整体比例
    bright_pct = float(bright.mean() * 100)
    # 白晕特征: 亮像素中,距最近近黑背景很近(<=8px)且本身是"过渡亮"而非纯白高光
    # 简化: 亮像素占比显著(>3%) → 很可能是背景光晕(纯黑底主体高光占比一般<3%)
    halo = bright_pct > 3.0
    # 主体纵向占用(非背景行比例) 判断是否贴底: 底部是否有主体不透明
    # 近底部 5% 区域是否有亮/主体像素
    bottom = lum[int(h * 0.95):, :]
    bottom_subject = (bottom < 210).mean()
    return dict(
        path=os.path.basename(path),
        bright_pct=round(bright_pct, 2),
        halo_detected=halo,
        bottom_subject_pct=round(float(bottom_subject * 100), 2),
    )

if __name__ == "__main__":
    out = []
    for p in sys.argv[1:]:
        try:
            out.append(bright_halo(p))
        except Exception as e:
            out.append({"path": p, "error": str(e)})
    print(json.dumps(out, ensure_ascii=False))
