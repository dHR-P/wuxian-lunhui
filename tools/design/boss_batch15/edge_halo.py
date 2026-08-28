# -*- coding: utf-8 -*-
"""edge_halo.py — 抠图后边缘白晕检测。检测透明→不透明边界上是否有大量亮白(RGB近白)像素。
（白色光晕会残留在透明像素上形成明亮边缘;内部高光不在外边界,不会被误报）
用法: python edge_halo.py <cut.png...>
输出 JSON list
"""
import json, os, sys
import numpy as np
from PIL import Image

_OFFS = [(-1,0),(1,0),(0,-1),(0,1),(-1,-1),(-1,1),(1,-1),(1,1)]

def edge_halo(path):
    im = Image.open(path).convert("RGBA")
    a = np.asarray(im)
    al = a[...,3]
    rgb = a[...,:3].astype(np.float32)
    h, w = al.shape
    opaque = al >= 200
    trans = al < 5
    # 半透明/边缘带: alpha 5..200 或 紧邻透明像素的不透明像素
    edge = np.zeros_like(al, dtype=bool)
    # 透明像素邻域里的不透明像素视为主体边缘
    padded_trans = np.pad(trans, 1)
    for dy,dx in _OFFS:
        edge |= opaque & padded_trans[1+dy:1+dy+h, 1+dx:1+dx+w]
    # 也把半透明像素本身算边缘
    edge |= (al>=5)&(al<200)
    if not edge.any():
        return dict(path=os.path.basename(path), edge_bright_pct=0.0, white_halo=False, edge_px=0)
    edge_rgb = rgb[edge]
    lum = edge_rgb[:,0]*0.299+edge_rgb[:,1]*0.587+edge_rgb[:,2]*0.114
    bright = lum > 170
    bright_pct = float(bright.mean()*100)
    # 白色光晕判定: 边缘像素中亮白占比偏高(>18%)
    white_halo = bright_pct > 18.0
    return dict(
        path=os.path.basename(path),
        edge_px=int(edge.sum()),
        edge_bright_pct=round(bright_pct,2),
        white_halo=white_halo,
    )

if __name__ == "__main__":
    out=[]
    for p in sys.argv[1:]:
        try:
            out.append(edge_halo(p))
        except Exception as e:
            out.append({"path":p,"error":str(e)})
    print(json.dumps(out, ensure_ascii=False))
