# -*- coding: utf-8 -*-
"""cutout_floodfill.py — 背景「连通域」洪水填充抠图（v2 管线核心脚本）

解决逐像素欧氏距离法（cutout_enemy.py）把主体内部/边缘深色阴影像素误判为背景、
导致躯干镂空与毛边的问题。

历史教训（项目 README 记载 flood-fill 曾弃用）：Z-Image 纯黑背景立绘主体边缘
常带暗色碎边/裂隙/窟窿，若洪水只按「距背景色距离<=阈值」从四边扩散，一旦主体
边缘有窟窿，洪水会漏进主体内部把大片深色区域误删（吃穿主体）。本脚本用三道
防线规避：

  防线① 填充前边界密封（--seal N，默认 2）：flood 前把近背景掩膜 near 腐蚀
        N 像素，斩断 <=N 像素宽的细缝/窟窿通道（「开运算」方向：先收缩掩膜
        再洪泛，才能真正断流；字面「闭运算=先膨胀再腐蚀」不改变 1px 细缝的
        4-连通性，无法防漏，仅保留为 --gap 缺口桥接、默认关），flood 结束后
        把 bgf 膨胀 N 像素 ∩ 原 near，还原边界背景范围且不侵入主体。
  防线② 填充起点只允许图像四边像素（强制）：种子＝图像四条边上的近背景像素
        （seal>0 时由四边像素派生、深入腐蚀带）；主体内部被包围的深色区域到
        不了边界，flood 永不触及 → 不再镂空。
  防线③ 内部镂空回填（--fix-holes 默认开，--no-fix-holes 关闭）：填充+羽化+
        闭运算之后，对 alpha==0 掩膜做边界连通性检查——完全不接触图像边界的
        alpha==0 连通域视为内部镂空，按「原欧氏距离 alpha」回填
        （d<=3→透明，3<d<19→(d-3)*16，d>=19→不透明），而不是一律清 0。

完整管线：
  1. 背景参考色 bg：默认取四角 8x8 块的中位色（兼容纯黑/纯白背景；--bg 可覆盖）。
  2. 近背景掩膜 near = { 像素 RGB 到 bg 的欧氏距离 d <= 阈值 T }（T 默认 6）。
  3. 防线①：near 先腐蚀 seal 像素，然后从四边像素派生的种子做 flood-fill
     （BFS 传播，4/8 连通可选），结果再膨胀回 seal 像素并 ∩ 原 near → bgf
     （与边界连通的"背景连通域"）。
  4. （可选 --gap N，默认 0）字面「先膨胀再腐蚀」式缺口桥接，解决边缘缺口把
     洪水挡死在边界外的反向问题；默认关闭（最保守）。
  5. alpha 基础值：bgf → 0（透明），其余 → 255（不透明）。
  6. 边缘羽化（--feather N，默认 2）：只对主体侧距边界 N 像素的过渡带像素
     套用原脚本的线性渐变 alpha＝(d-3)*16（3<d<19），更远处一律 255，
     既保留半透明抗锯齿渐变，又不会让主体内部深色像素变透。
  7. 形态学闭运算（--closing N，默认 1，scipy.ndimage.binary_closing，3x3）：
     对 alpha>0 掩膜先膨胀后腐蚀，清除主体内部细小透明孔洞（如被误开的一像素缝），
     被补上的像素 alpha 置 255。无 scipy 时用 numpy 自写 3x3 膨胀/腐蚀。
  8. 防线③：内部镂空（不接触边界的 alpha==0 连通域）按 ramp_alpha(d) 回填。
     增强(--hole-channel N，默认 2)：判定前先对 alpha==0 掩膜做 N 次闭运算，把
     仅经 <=N px 窄通道与外部背景连通的内部孔洞堵成「封闭洞」再检查连通性，
     解决「洪水经主体缝隙(如手臂与躯干间)漏入、深色部位洞与背景仍连通导致
     不回填」的边界情形（pc_zhengzha 候选4 黑T恤/深裤被抠穿的教训）。
  9. 输出透明 PNG（RGBA，RGB 保留原值，alpha 如上；--zero-rgb 可选置 0）。

用法：
  <python> cutout_floodfill.py <输入png> <输出png> [阈值] [选项]
  <python> cutout_floodfill.py --all [选项]        # 批量处理 raw_enemy 全部 ID

选项：
  --bg R,G,B        指定背景色（默认四角中位色自动检测）
  --gap N           边界缺口桥接（0=关，默认 0）
  --seal N          填充前边界密封像素（0=关，默认 2）
  --closing N       对 alpha 做闭运算次数（0=关，默认 1）
  --feather N       边缘羽化过渡带宽度（0=关，默认 2）
  --fix-holes / --no-fix-holes   内部镂空按欧氏距离 alpha 回填（默认开/关）
  --hole-channel N   内部镂空判定前对透明掩膜闭运算堵窄通道的迭代数（默认 2，
                     0 = 旧行为：只回填完全不接触边界的内部域）
  --hole-solid       （配合 --hole-channel 用）内部镂空判定后**无条件填 255 不透明**
                     （不回填 ramp 渐变）。适用于连续实体的全身立绘（主角/敌人单体），
                     主体内部任何透明区都是缺陷、其 RGB 保留为原暗色即真实内容
                     （如黑T恤近黑胸口被 flood 误删 → 填实后视觉=黑色衣物）。
  --conn 4|8        flood 连通性（默认 4，最保守；8 更激进）
  --zero-rgb        （可选）透明像素 RGB 置 0；默认保留原值
"""
import argparse
import os
import sys

import numpy as np
from PIL import Image

try:
    import scipy.ndimage as ndi
    HAS_SCIPY = True
except Exception:
    HAS_SCIPY = False

BASE = r"C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1"
RAW = os.path.join(BASE, "tools", "design", "raw_enemy")
OUT = os.path.join(BASE, "server-rs", "ui", "assets", "img")

# 与 cutout_enemy.py 的 ITEMS/OUTNAME 保持一致的 ID 与输出文件名映射
ALL_IDS = ["zombie", "licker", "hunter", "guard", "horde", "pc_zhengzha"]


def out_name(cid):
    return "pc_zhengzha.png" if cid == "pc_zhengzha" else "enemy_%s.png" % cid


# ---------------------------------------------------------------------------
# 形态学 / 连通域原语（scipy 不存在时用 numpy 手写 3x3 实现，逻辑等价）
# ---------------------------------------------------------------------------

_SHIFTS4 = ((-1, 0), (1, 0), (0, -1), (0, 1))
_SHIFTS8 = ((-1, 0), (1, 0), (0, -1), (0, 1),
            (-1, -1), (-1, 1), (1, -1), (1, 1))


def _shifts(conn):
    return _SHIFTS8 if conn == 8 else _SHIFTS4


def dilate_np(m, it=1, conn=4):
    out = np.asarray(m, dtype=bool)
    sh = _shifts(conn)
    for _ in range(it):
        acc = np.zeros_like(out)
        for dy, dx in sh:
            p = np.pad(out, ((1, 1), (1, 1)))
            acc |= p[1 + dy:1 + dy + out.shape[0], 1 + dx:1 + dx + out.shape[1]]
        out = acc
    return out


def erode_np(m, it=1, conn=4):
    return ~dilate_np(~np.asarray(m, dtype=bool), it, conn)


def close_np(m, it=1, conn=4):
    return erode_np(dilate_np(m, it, conn), it, conn)


def flood_mask(mask, conn=4, seeds=None):
    """连通域 flood-fill：返回 True 掩膜 = mask 中与种子相连的部分。

    防线②：种子默认取 mask 在图像四条边上的像素——只有「从图像边缘连进来」
    的近背景像素才可能被清成透明；主体内部被包围的深色区域永远接触不到种子。
    """
    m = np.asarray(mask, dtype=bool)
    h, w = m.shape
    if seeds is not None:
        s = np.asarray(seeds, dtype=bool) & m
    else:
        s = m.copy()
        s[1:-1, 1:-1] = False  # 种子只允许图像四边像素
    if HAS_SCIPY:
        struct = (np.ones((3, 3), dtype=bool) if conn == 8
                  else ndi.generate_binary_structure(2, 1))
        return ndi.binary_propagation(s, structure=struct, mask=m)
    # numpy 迭代 BFS 回退实现
    fl = s.copy()
    sh = _shifts(conn)
    while True:
        acc = np.zeros_like(fl)
        for dy, dx in sh:
            p = np.pad(fl, ((1, 1), (1, 1)))
            acc |= p[1 + dy:1 + dy + h, 1 + dx:1 + dx + w]
        cand = acc & m & ~fl
        if not cand.any():
            break
        fl |= cand
    return fl


# ---------------------------------------------------------------------------
# 主抠图管线
# ---------------------------------------------------------------------------

def auto_bg(rgb, patch=8):
    """四角 patch 的中位色（全部角块拉平后按通道取中位数）。"""
    h, w = rgb.shape[:2]
    p = min(patch, h // 2, w // 2)
    corners = np.concatenate([
        rgb[0:p, 0:p].reshape(-1, 3),
        rgb[0:p, w - p:w].reshape(-1, 3),
        rgb[h - p:h, 0:p].reshape(-1, 3),
        rgb[h - p:h, w - p:w].reshape(-1, 3),
    ])
    return np.median(corners, axis=0)


def ramp_alpha(d):
    """原脚本逐像素线性渐变：d<=3→0，(d-3)*16，d>=19→255。"""
    return np.where(d <= 3.0, 0.0, np.minimum(255.0, (d - 3.0) * 16.0))


def cutout(src, dst, threshold=6.0, gap=0, seal=2, closing=1, feather=2,
           fix_holes=True, bg=None, conn=4, zero_rgb=False, hole_channel=2,
           hole_solid=False):
    """把 src 中与边界连通的近背景区域抠为透明，其余不透明（主体侧过渡带羽化）。"""
    img = Image.open(src)
    img = img.convert("RGBA") if img.mode != "RGBA" else img
    arr = np.asarray(img).astype(np.float64)
    rgb = arr[..., :3]
    h, w = rgb.shape[:2]

    if bg is None:
        bg = auto_bg(rgb)
    else:
        bg = np.asarray(bg, dtype=np.float64).reshape(3)
    bg = bg.astype(np.float64)

    d = np.sqrt(((rgb - bg) ** 2).sum(axis=2))
    near = d <= float(threshold)

    # 防线①：填充前边界密封。先腐蚀 near（斩断 <=seal 像素宽的细缝/窟窿通道，
    # 防止洪水沿主体边缘裂隙漏入主体内部——历史教训：flood-fill 吃穿主体），
    # 洪泛结束后把 bgf 膨胀回 seal 像素并 ∩ 原 near，还原边界背景且不侵入主体。
    if seal > 0:
        border_near = near.copy()
        border_near[1:-1, 1:-1] = False          # 防线②：种子只派生自图像四边
        near_seed = erode_np(near, seal, conn)   # 密封后仅余近背景 bulk
        seeds = dilate_np(border_near, seal, conn) & near_seed
    else:
        near_seed = near
        seeds = None

    # （可选 --gap，默认关）字面「先膨胀再腐蚀」：桥接边界 1-2px 缺口，防止
    # 洪水被边缘杂点挡死在边界外（与防线①方向相反的问题）。
    near_flood = dilate_np(near_seed, gap, conn) if gap > 0 else near_seed

    bgf = flood_mask(near_flood, conn, seeds=seeds)
    if gap > 0:
        bgf = erode_np(bgf, gap, conn)
    if seal > 0:
        bgf = dilate_np(bgf, seal, conn) & near   # 还原边界背景，∩near 不侵入主体

    subject = ~bgf
    alpha = np.where(subject, 255, 0).astype(np.uint8)

    # 边缘羽化：只对主体侧过渡带（距 bgf <= feather 像素）套渐变，其余 255
    if feather > 0:
        ring = dilate_np(bgf, feather, conn) & subject
        if ring.any():
            ar = ramp_alpha(d)
            alpha[ring] = np.maximum(ar[ring], 8).astype(np.uint8)

    # 形态学闭运算清除主体内部细小透明孔洞（被补的像素置 255 不透明）
    if closing > 0:
        sub_mask = alpha > 0
        closed = close_np(sub_mask, closing, conn) if not HAS_SCIPY \
            else ndi.binary_closing(sub_mask, structure=np.ones((3, 3), dtype=bool),
                                    iterations=closing)
        filled = closed & ~sub_mask
        if filled.any():
            alpha[filled] = 255

    # 防线③（二道防线--fix-holes，默认开）：内部镂空按「原欧氏距离 alpha」回填。
    # 增强(--hole-channel N)：判定前对 alpha==0 掩膜做 N 次闭运算，堵住仅经
    # <=N px 窄通道与外部背景连通的内部孔洞（如手臂与躯干间的缝隙），再检查
    # 「完全不接触图像边界」——解决洪水漏入主体、深色部位洞仍与背景连通的
    # 边界情形（pc_zhengzha 候选4 黑T恤/深裤被抠穿的教训；hunter 极暗躯干同型）。
    if fix_holes:
        zeros = alpha == 0
        if zeros.any():
            if hole_channel > 0:
                if HAS_SCIPY:
                    # border_value=1 关键:binary_closing 默认 border_value=0 会在腐蚀
                    # 阶段把图像边界一圈(iterations px)吞成 False,导致边界种子全灭、
                    # flood 无法传播、enclosed 误判为整个画面(历史 bug:hole-solid 全填)。
                    # 边界外视作背景 True,闭运算只堵内部窄通道,不破坏边界连通性。
                    zc = ndi.binary_closing(zeros, structure=np.ones((3, 3), dtype=bool),
                                            iterations=hole_channel, border_value=1)
                else:
                    zc = close_np(zeros, hole_channel, conn)
                enclosed = zc & ~flood_mask(zc, conn)
            else:
                enclosed = zeros & ~flood_mask(zeros, conn)
            if enclosed.any():
                if hole_solid:
                    alpha[enclosed] = 255  # RGB 保持原像素：黑T恤近黑=真实内容
                else:
                    ar = ramp_alpha(d)
                    alpha[enclosed] = ar[enclosed].astype(np.uint8)

    rgb8 = rgb.astype(np.uint8)
    if zero_rgb:
        rgb8 = np.where(alpha[..., None] > 0, rgb8, 0).astype(np.uint8)
    out_arr = np.dstack([rgb8, alpha])
    Image.fromarray(out_arr, "RGBA").save(dst, "PNG")

    # 自检落盘
    chk = np.asarray(Image.open(dst).convert("RGBA"))
    al = chk[..., 3]
    total = al.size
    stats = dict(
        size=(w, h), bg=str(tuple(int(x) for x in bg)),
        trans=float((al <= 5).sum()) / total * 100,
        semi=float(((al > 5) & (al < 250)).sum()) / total * 100,
        opaque=float((al >= 250).sum()) / total * 100,
        used_scipy=HAS_SCIPY,
    )
    print("%s: size=%dx%d bg=%s alpha<=5:%.1f%% mid:%.1f%% >=250:%.1f%% "
          "(scipy=%s)" % (os.path.basename(dst), w, h, stats["bg"],
                          stats["trans"], stats["semi"], stats["opaque"],
                          HAS_SCIPY), flush=True)
    return stats


def main():
    ap = argparse.ArgumentParser(description="背景连通域 flood-fill 抠图")
    ap.add_argument("paths", nargs="*", help="<输入png> <输出png> [阈值]")
    ap.add_argument("--all", action="store_true", help="批量处理 raw_enemy 全部 ID")
    ap.add_argument("--bg", default=None, help="背景色 R,G,B（默认四角中位色）")
    ap.add_argument("--gap", type=int, default=0, help="边界缺口桥接像素(默认0)")
    ap.add_argument("--seal", type=int, default=2, help="填充前边界密封像素(默认2)")
    ap.add_argument("--closing", type=int, default=1, help="alpha 闭运算次数(默认1)")
    ap.add_argument("--feather", type=int, default=2, help="边缘羽化带宽度(默认2)")
    ap.add_argument("--fix-holes", dest="fix_holes", action="store_true",
                    default=True, help="内部镂空按原欧氏距离 alpha 回填(默认开)")
    ap.add_argument("--no-fix-holes", dest="fix_holes", action="store_false",
                    help="关闭内部镂空回填")
    ap.add_argument("--conn", type=int, default=4, choices=(4, 8), help="连通性(默认4)")
    ap.add_argument("--hole-channel", dest="hole_channel", type=int, default=2,
                    help="fix-holes 判定前对透明掩膜闭运算堵窄通道次数(默认2,0=旧行为)")
    ap.add_argument("--hole-solid", dest="hole_solid", action="store_true",
                    help="内部镂空判定后无条件填 255 不透明(不回填 ramp)")
    ap.add_argument("--zero-rgb", action="store_true", help="透明像素 RGB 置 0")
    args = ap.parse_args()

    bg = None
    if args.bg:
        bg = tuple(int(x) for x in args.bg.split(","))

    if args.all:
        os.makedirs(OUT, exist_ok=True)
        for cid in ALL_IDS:
            src = os.path.join(RAW, "%s.png" % cid)
            if not os.path.exists(src):
                print("skip missing %s" % src, flush=True)
                continue
            cutout(src, os.path.join(OUT, out_name(cid)),
                   threshold=6.0, gap=args.gap, seal=args.seal,
                   closing=args.closing, feather=args.feather,
                   fix_holes=args.fix_holes, bg=bg, conn=args.conn,
                   zero_rgb=args.zero_rgb, hole_channel=args.hole_channel,
                   hole_solid=args.hole_solid)
        print("done", flush=True)
        return

    p = list(args.paths)
    if len(p) >= 2 and os.path.isfile(p[0]):
        thr = float(p[2]) if len(p) > 2 else 6.0
        cutout(p[0], p[1], threshold=thr, gap=args.gap, seal=args.seal,
               closing=args.closing, feather=args.feather,
               fix_holes=args.fix_holes, bg=bg, conn=args.conn,
               zero_rgb=args.zero_rgb, hole_channel=args.hole_channel,
               hole_solid=args.hole_solid)
        print("done", flush=True)
    else:
        ap.print_help()


if __name__ == "__main__":
    main()