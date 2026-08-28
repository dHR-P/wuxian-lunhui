# -*- coding: utf-8 -*-
"""verify_cut8.py — 抠图成品数值复核：透明像素 RGB 必须全 0（--zero-rgb 生效），
主体不透明占比合理，含底部贴底(非漂浮)与透明残留统计。
用法: <comfy-python> verify_cut8.py <cut.png>
"""
import os
import sys
import numpy as np
from PIL import Image


def main():
    path = sys.argv[1]
    img = Image.open(path).convert("RGBA")
    arr = np.asarray(img).astype(np.int32)
    rgb, alpha = arr[..., :3], arr[..., 3]
    h, w = alpha.shape
    total = alpha.size
    trans = alpha <= 5
    opaque = alpha >= 250
    semi = (alpha > 5) & (alpha < 250)
    n_trans, n_opaque, n_semi = trans.sum(), opaque.sum(), semi.sum()
    # 透明像素 RGB 检查
    trans_rgb = rgb[trans]
    tr_ok = bool((trans_rgb == 0).all()) if len(trans_rgb) else True
    # 底部贴底：有主体像素触及最底行
    bottom_touch = bool(opaque[h-1, :].any()) or bool(np.intersect1d(np.where(semi)[0], np.array([h-1])).size)
    # 主体像素占画面百分比
    body_ratio = float((opaque | semi).sum()) / total * 100
    res = dict(
        size=(w, h),
        trans_pct=float(n_trans) / total * 100,
        semi_pct=float(n_semi) / total * 100,
        opaque_pct=float(n_opaque) / total * 100,
        trans_rgb_all_zero=tr_ok,
        bottom_touch=bool(bottom_touch),
        body_ratio_pct=round(body_ratio, 2),
    )
    print(json_dumps(res), flush=True)
    # 摘要行
    print("VERDICT_NUMERIC=%s" % ("OK" if tr_ok else "FAIL"), flush=True)
    sys.exit(0 if tr_ok else 1)


def json_dumps(d):
    import json
    return json.dumps(d, ensure_ascii=False)


if __name__ == "__main__":
    main()
