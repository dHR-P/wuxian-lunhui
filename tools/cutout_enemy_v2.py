# -*- coding: utf-8 -*-
"""v2 统一抠图：flood-fill 全部 5 张敌人立绘（逐图可配阈值）→ 小斑点清理 → zombie 底部倒影收边。
- flood: 从边框种子扩张，曼哈顿色差 <= T 视为背景（梯度背景可吞）
- 清理: 保留面积 >= max(0.004*最大连通域, 150px^2) 的组件（8 连通，numpy 迭代扩张实现）
- 底部收边: zombie 从最底行向上扫描，剔除非主体暗影带（可选开关）
- 输出: server-rs/ui/assets/img/enemy_<id>.png（RGBA 硬 alpha），控制台打印统计
Usage: python cutout_enemy_v2.py [id...]   (默认全部)
"""
import os, sys
import numpy as np
from PIL import Image

BASE = r"C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1"
SRC = os.path.join(BASE, "tools", "design", "raw_enemy")
DST = os.path.join(BASE, "server-rs", "ui", "assets", "img")
os.makedirs(DST, exist_ok=True)

# 每张图 flood 阈值 T（曼哈顿色差）与是否做底部收边
JOBS = [
    {"id": "zombie", "T": 45, "trim_bottom": True},
    {"id": "licker", "T": 45, "trim_bottom": False},
    {"id": "hunter", "T": 45, "trim_bottom": False},
    {"id": "guard", "T": 45, "trim_bottom": False},
    {"id": "horde", "T": 45, "trim_bottom": False},
]
MAX_ROUNDS = 4000


def flood_bg(rgb, T):
    """从边框种子扩张，返回背景 mask。每轮: 候选=膨胀(bg)&~bg，若候选与任一 4 邻 bg 像素曼哈顿色差<=T 则并入。"""
    h, w, _ = rgb.shape
    bg = np.zeros((h, w), dtype=bool)
    bg[0, :] = True; bg[-1, :] = True; bg[:, 0] = True; bg[:, -1] = True
    # 预计算 4 邻（0=上 1=下 2=左 3=右）填充版本
    for _ in range(MAX_ROUNDS):
        # 4 方向偏移
        up = np.zeros_like(bg); up[1:, :] = bg[:-1, :]
        down = np.zeros_like(bg); down[:-1, :] = bg[1:, :]
        left = np.zeros_like(bg); left[:, 1:] = bg[:, :-1]
        right = np.zeros_like(bg); right[:, :-1] = bg[:, 1:]
        cand = (up | down | left | right) & ~bg
        if not cand.any():
            break
        # 对候选像素计算与各方向 bg 邻像素的曼哈顿色差最小值
        cy, cx = np.nonzero(cand)
        best = np.full(len(cy), 1 << 30, dtype=np.int32)
        for dy, dx in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            ny, nx = cy + dy, cx + dx
            okm = (ny >= 0) & (ny < h) & (nx >= 0) & (nx < w) & bg[ny, nx]
            if not okm.any():
                continue
            d = (np.abs(rgb[cy[okm], cx[okm]].astype(np.int32) - rgb[ny[okm], nx[okm]].astype(np.int32))).sum(axis=1)
            sel = np.where(okm)[0]
            np.minimum.at(best, sel, d)
        take = best <= T
        if not take.any():
            break
        bg[cy[take], cx[take]] = True
    return bg


def largest_components(mask, thresh_frac=0.004, min_size=150):
    """8 连通组件，保留面积>=max(thresh_frac*最大, min_size) 的部分（用迭代膨胀标记最大组件并剔除小斑点）。"""
    h, w = mask.shape
    kept = np.zeros_like(mask)
    work = mask.copy()
    size_max = int(work.sum())
    thr = max(int(size_max * thresh_frac), min_size)
    while work.any():
        # 取种子
        ys, xs = np.nonzero(work)
        seed = (ys[0], xs[0])
        comp = np.zeros_like(work)
        comp[seed] = True
        while True:
            c = comp.copy()
            # 8 邻膨胀
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    if dy == 0 and dx == 0:
                        continue
                    ny = np.clip(np.arange(h)[:, None] + dy, 0, h - 1)
                    nx = np.clip(np.arange(w)[None, :] + dx, 0, w - 1)
                    c |= comp[ny, nx]
            c &= work
            if c.sum() == comp.sum():
                break
            comp = c
        size = int(comp.sum())
        if size >= thr:
            kept |= comp
        work &= ~comp
    return kept


def trim_bottom_band(rgb, mask):
    """zombie 底部收边：从最底行逐行上扫，若某行不透明像素占比超过 8% 且其平均色与背景偏黑（暗影带），且上方还有主体，则把该行及其下全部置透明。"""
    h, w = mask.shape
    if not mask.any():
        return mask
    rows = np.where(mask.any(axis=1))[0]
    if len(rows) == 0:
        return mask
    bottom = rows.max()
    # 找 body 底端：从不透明像素最密行向上找第一个"稀疏段"
    ys = np.where(mask.sum(axis=1) > w * 0.02)[0]
    if len(ys) == 0:
        return mask
    dense_bottom = ys.max()
    if dense_bottom >= bottom - 2:
        return mask  # 主体几乎贴底，无需收边
    # 主体底部与最底之间视为倒影带，直接清除
    out = mask.copy()
    out[dense_bottom + 1:, :] = False
    return out


def main():
    args = list(sys.argv[1:])
    T_override = None
    MIN_OVERRIDE = None
    if "--T" in args:
        i = args.index("--T")
        T_override = int(args[i + 1])
        del args[i:i + 2]
    if "--min-size" in args:
        i = args.index("--min-size")
        MIN_OVERRIDE = int(args[i + 1])
        del args[i:i + 2]
    wanted = args or [j["id"] for j in JOBS]
    for job in JOBS:
        if job["id"] not in wanted:
            continue
        T = T_override if T_override is not None else job["T"]
        mn = MIN_OVERRIDE if MIN_OVERRIDE is not None else None
        p = os.path.join(SRC, job["id"] + ".png")
        if not os.path.exists(p):
            print("MISSING RAW", p)
            continue
        im = Image.open(p).convert("RGB")
        rgb = np.asarray(im).astype(np.int32)
        print("%s: size=%s T=%d" % (job["id"], rgb.shape, T), flush=True)
        bg = flood_bg(rgb, T)
        fg = ~bg
        fg = largest_components(fg, min_size=(mn or 150))
        if job.get("trim_bottom"):
            fg = trim_bottom_band(rgb, fg)
        alpha = np.where(fg, 255, 0).astype(np.uint8)
        out = np.dstack([np.asarray(im).astype(np.uint8), alpha])
        dst = os.path.join(DST, "enemy_%s.png" % job["id"])
        Image.fromarray(out, "RGBA").save(dst)
        n = int(fg.sum())
        frac = n / fg.size * 100
        ys, xs = np.nonzero(fg)
        box = "EMPTY"
        if n:
            box = "(%d,%d)-(%d,%d)" % (xs.min(), ys.min(), xs.max(), ys.max())
        print("%s: opaque=%d %.1f%% box=%s -> %s" % (job["id"], n, frac, box, dst), flush=True)
    print("done", flush=True)


if __name__ == "__main__":
    main()