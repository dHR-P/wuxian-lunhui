# -*- coding: utf-8 -*-
"""diag_connected_dark.py — 检测「与背景连通的主体近黑区」(连通洞/暗部风险)

背景:cutout_floodfill 的「0 孔」只查封闭洞;主体暗部若与背景经宽通道(腿间/腋下/
身侧)连通,会被 flood 当背景整片删除且不回填(diag_body_check 同样测不到这类区域)。
本脚本直接在 raw 上检测:近黑像素(d<=3)中,「与图像边界连通」且「紧邻不透明
主体(d>=19 膨胀 N 像素)”的区域 —— 它们既属于主体视觉范围又被背景连通,
是抠图会被误删的高风险区。

用法: <python> diag_connected_dark.py <raw.png> [N=12] [nearT=6] [solidT=19]
默认 nearT=6 与 cutout_floodfill 的 T 阈值对齐(flood 会删 d<=6 的连通区);
solidT=19 与抠图「全不透明」阈值一致。
输出: 控制台 + tools/design/diag_connected_dark.txt
"""
import os
import sys
from collections import deque

import numpy as np
from PIL import Image

try:
    from scipy import ndimage
    HAS_SCIPY = True
except Exception:
    HAS_SCIPY = False

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "diag_connected_dark.txt")


def analyze(path, N=12, nearT=6.0, solidT=19.0):
    lines = []
    img = Image.open(path).convert("RGBA")
    a = np.asarray(img).astype(np.float64)
    h, w = a.shape[:2]
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    d = np.sqrt(r * r + g * g + b * b)
    near = d <= nearT
    solid = d >= solidT
    lines.append("%s: %dx%d near-black=%.1f%% solid=%.1f%%" % (
        os.path.basename(path), w, h, 100.0 * near.mean(), 100.0 * solid.mean()))
    if HAS_SCIPY:
        solid_d = ndimage.binary_dilation(solid, iterations=N)
    else:
        # numpy 自写 8-邻域膨胀
        solid_d = solid.copy()
        for _ in range(N):
            pad = np.pad(solid_d, 1, mode="edge")
            solid_d = (pad[1:-1, 1:-1] | pad[:-2, 1:-1] | pad[2:, 1:-1] |
                       pad[1:-1, :-2] | pad[1:-1, 2:] | pad[:-2, :-2] | pad[:-2, 2:] |
                       pad[2:, :-2] | pad[2:, 2:])
    neck = solid_d & near
    # 只保留与图像边缘 4-连通的 neck 像素(连通洞);不触边缘的是封闭洞(flood 能修)
    touch = np.zeros((h, w), dtype=bool)
    q = deque()
    for y in range(h):
        for x in (0, w - 1):
            if neck[y, x] and not touch[y, x]:
                touch[y, x] = True
                q.append((y, x))
    for x in range(w):
        for y in (0, h - 1):
            if neck[y, x] and not touch[y, x]:
                touch[y, x] = True
                q.append((y, x))
    while q:
        cy, cx = q.popleft()
        for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
            if 0 <= ny < h and 0 <= nx < w and neck[ny, nx] and not touch[ny, nx]:
                touch[ny, nx] = True
                q.append((ny, nx))
    comps = []
    vis = np.zeros((h, w), dtype=bool)
    for y in range(h):
        for x in range(w):
            if touch[y, x] and not vis[y, x]:
                qq = deque([(y, x)])
                vis[y, x] = True
                cnt = 0
                ys = [y]
                xs = [x]
                while qq:
                    cy, cx = qq.popleft()
                    cnt += 1
                    for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
                        if 0 <= ny < h and 0 <= nx < w and touch[ny, nx] and not vis[ny, nx]:
                            vis[ny, nx] = True
                            qq.append((ny, nx))
                            ys.append(ny)
                            xs.append(nx)
                comps.append((cnt, min(ys), max(ys), min(xs), max(xs)))
    comps.sort(reverse=True)
    total = sum(c[0] for c in comps)
    lines.append("  connected-dark(near-solid, touching border): comps=%d total=%d px (%.2f%% of image)" % (
        len(comps), total, 100.0 * total / (h * w)))
    for c in comps[:10]:
        lines.append("    size=%d bbox=(y%d-%d,x%d-%d)=%.0f%%x%.0f%%" % (
            c[0], c[1], c[2], c[3], c[4], 100.0 * (c[2] - c[1] + 1) / h, 100.0 * (c[4] - c[3] + 1) / w))
    verdict = "合格: 无明显连通暗区" if total < (h * w) * 0.01 else "风险: 主体大面积近黑且与背景连通,flood/距离法抠图将误删"
    lines.append("  verdict: " + verdict)
    return lines


if __name__ == "__main__":
    args = sys.argv[1:]
    if not args:
        print("usage: diag_connected_dark.py <raw.png> [N]")
        sys.exit(1)
    N = int(args[1]) if len(args) > 1 else 12
    nearT = float(args[2]) if len(args) > 2 else 6.0
    solidT = float(args[3]) if len(args) > 3 else 19.0
    out_lines = []
    for p in args[0:1]:
        if os.path.exists(p):
            out_lines += analyze(p, N, nearT, solidT)
            out_lines.append("")
        else:
            print("missing %s" % p)
    with open(OUT, "w", encoding="utf-8") as f:
        f.write("\n".join(out_lines) + "\n")
    for ln in out_lines:
        print(ln)
    print("written to %s" % OUT)