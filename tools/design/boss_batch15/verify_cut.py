# -*- coding: utf-8 -*-
"""verify_cut.py — 抠图后数值复核: 透明像素 RGB 必须=0, alpha 三档分布, 尺寸。
用法: python verify_cut.py <png...>
输出 JSON list
"""
import json, sys
import numpy as np
from PIL import Image

def verify(path):
    im = Image.open(path).convert("RGBA")
    a = np.asarray(im)
    al = a[..., 3]
    total = al.size
    trans = al <= 5
    semi = (al > 5) & (al < 250)
    opaque = al >= 250
    # 透明像素 RGB 全 0 校验 (zero-rgb)
    tr_rgb_ok = True
    if trans.any():
        rgb = a[trans][:, :3]
        tr_rgb_ok = bool((rgb == 0).all())
    return dict(
        path=path, w=im.width, h=im.height,
        trans_pct=round(float(trans.mean() * 100), 2),
        semi_pct=round(float(semi.mean() * 100), 2),
        opaque_pct=round(float(opaque.mean() * 100), 2),
        transparent_rgb_zero=tr_rgb_ok,
        has_opaque=bool(opaque.any()),
        valid=bool(tr_rgb_ok and opaque.any() and im.width == 768 and im.height == 1024),
    )

if __name__ == "__main__":
    out = []
    for p in sys.argv[1:]:
        try:
            out.append(verify(p))
        except Exception as e:
            out.append({"path": p, "error": str(e)})
    print(json.dumps(out, ensure_ascii=False))
