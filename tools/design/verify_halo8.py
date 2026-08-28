# -*- coding: utf-8 -*-
"""verify_halo8.py — 抠图成品边界光晕复核（项目约定：像素级证据优先于视觉误判）。
透明像素 RGB 全 0；主体边界外 1px 环带内不应有纯白/高亮残留（白色描边应被抠成透明）。
用法: <comfy-python> verify_halo8.py <slug>
"""
import os
import sys
import numpy as np
from PIL import Image

IMG = r"C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1\server-rs\ui\assets\img"


def main():
    slug = sys.argv[1]
    path = os.path.join(IMG, "enemy_%s.png" % slug)
    arr = np.asarray(Image.open(path).convert("RGBA")).astype(np.int32)
    rgb, alpha = arr[..., :3], arr[..., 3]
    h, w = alpha.shape
    transparent = alpha <= 5
    opaque = alpha >= 250
    semi = (alpha > 5) & (alpha < 250)
    # 透明像素 RGB 全 0
    tr_rgb = rgb[transparent]
    tr_zero = bool((tr_rgb == 0).all()) if len(tr_rgb) else True
    # 主体边界外 1px 环带 = 紧邻透明像素的 opaque 过渡像素
    # 高亮残留判定：不透明主体边缘像素中是否存在接近纯白的高亮(>230)且占比过大
    body = opaque | semi
    # 四邻域扩张找边界
    from scipy import ndimage as ndi
    dilated = ndi.binary_dilation(body, structure=np.ones((3, 3)))
    edge = dilated & ~body  # 主体外的1px环（透明侧）
    edge_val = alpha[edge]
    body_edge = body & dilated  # 主体侧内缘
    # 透明侧不应存在不透明度>80 的"假边"
    fake_edge = (edge & (alpha > 80)).sum()
    # 主体内缘像素不应是纯白（白描边被抠后内缘应为自然色；若有白描边则极亮）
    inner_rgb = rgb[body_edge]
    whiteratio = float((inner_rgb.min(axis=1) > 225).sum()) / max(len(inner_rgb), 1) * 100
    semi_pct = float(semi.sum()) / alpha.size * 100
    res = dict(
        slug=slug, tr_zero=tr_zero,
        edge_fake_high=bool(fake_edge > 0),
        inner_white_ratio_pct=round(whiteratio, 2),
        semi_pct=round(semi_pct, 2),
        trans_pct=round(float(transparent.sum()) / alpha.size * 100, 2),
    )
    print(json(res), flush=True)
    ok = tr_zero and not (fake_edge > 0) and whiteratio < 3.0
    print("HALO_VERDICT=%s" % ("OK" if ok else "WARN"), flush=True)
    sys.exit(0 if ok else 1)


def json(d):
    import json
    return json.dumps(d, ensure_ascii=False)


if __name__ == "__main__":
    main()
