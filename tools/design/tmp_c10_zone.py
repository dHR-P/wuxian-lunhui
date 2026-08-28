# -*- coding: utf-8 -*-
"""临时诊断:c10 raw 被抠穿区域(裆部/大腿内侧)像素 d 值分布,决定回填方案。"""
import numpy as np
from PIL import Image

im = Image.open(r"design/raw_enemy/pc_zhengzha_c10.png").convert("RGBA")
a = np.asarray(im).astype(float)
r, g, b = a[..., 0], a[..., 1], a[..., 2]
d = np.sqrt(r * r + g * g + b * b)

regions = [
    (480, 720, 250, 460, "crotch"),
    (480, 620, 250, 380, "left-thigh-in"),
    (480, 620, 380, 460, "right-thigh-in"),
    (620, 760, 300, 400, "left-knee"),
    (620, 760, 400, 480, "right-knee"),
]
for y0, y1, x0, x1, label in regions:
    band = d[y0:y1, x0:x1]
    print("%-16s d<=3:%.1f%% 3-6:%.1f%% 6-15:%.1f%% >=15:%.1f%% median=%.1f" % (
        label, 100 * (band <= 3).mean(), 100 * ((band > 3) & (band <= 6)).mean(),
        100 * ((band > 6) & (band < 15)).mean(), 100 * (band >= 15).mean(), np.median(band)))

# 抠图成品中这些区域的 alpha
im2 = Image.open(r"design/raw_enemy/pc_zhengzha_c10cut.png").convert("RGBA")
a2 = np.asarray(im2)[..., 3]
for y0, y1, x0, x1, label in regions:
    band = a2[y0:y1, x0:x1]
    print("%-16s alpha<=5:%.1f%% 6-249:%.1f%% >=250:%.1f%%" % (
        label, 100 * (band <= 5).mean(), 100 * ((band > 5) & (band < 250)).mean(), 100 * (band >= 250).mean()))