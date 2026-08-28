# -*- coding: utf-8 -*-
"""可视化 maps.rs 的 4 张楼层地图（带坐标轴与对象标注），用于箱庭设计定位。"""
import re, sys

MAPS_RS = r'C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1\server-rs\src\maps.rs'

def load_maps():
    src = open(MAPS_RS, encoding='utf-8').read()
    names = ['F1_MAP', 'F2_MAP', 'F3_MAP', 'F4_MAP']
    out = {}
    for nm in names:
        m = re.search(nm + r': &\[&str\] = &\[(.*?)\];', src, re.S)
        rows = re.findall(r'"([#.PI]+)"', m.group(1))
        out[nm] = rows
    return out

def load_objs(src):
    """从 maps.rs 提取对象表（POINTS/ENEMIES/NPCS/ZONES/PORTALS）。"""
    objs = {}
    for table in ['POINTS', 'ENEMIES', 'NPCS', 'ZONES', 'PORTALS']:
        m = re.search(table + r': &\[(.*?)\];', src, re.S)
        if not m:
            continue
        body = m.group(1)
        # 提取 (floor, x, y, id, kind)
        item = []
        for fm in re.finditer(r'\{ id: "([^"]+)",[^}]*?floor: (\d+), x: (\d+), y: (\d+)([^}]*)\}', body):
            fid, fl, x, y, rest = fm.groups()
            kind = table
            if table == 'ZONES':
                km = re.search(r'kind: "([^"]+)"', rest)
                kind = km.group(1) if km else 'zone'
            item.append((int(fl), int(x), int(y), fid, kind))
        objs[table] = item
    return objs

def draw(rows, objs, title):
    h = len(rows)
    w = len(rows[0])
    floor_no = {'F1_MAP': 0, 'F2_MAP': 1, 'F3_MAP': 2, 'F4_MAP': 3}[title]
    # 0=floor 1=wall 2=decor 3=object
    grid = [[0]*w for _ in range(h)]
    for y in range(h):
        for x in range(w):
            if rows[y][x] == '#':
                grid[y][x] = 1
            elif rows[y][x] == 'I':
                grid[y][x] = 2
    for (fl, x, y, fid, kind) in objs:
        if fl != floor_no:
            continue
        grid[y][x] = 3  # object
    print('=' * (w + 12))
    print(title, f'  ({w}x{h})')
    print('    ' + ''.join(str(i % 10) for i in range(w)))
    for y in range(h):
        line = []
        for x in range(w):
            c = grid[y][x]
            line.append({0: '.', 1: '#', 2: 'I', 3: '@'}[c])
        print(f'{y:02d} {"".join(line)}')
    # annotations
    print('ANNOTATIONS:')
    for (fl, x, y, fid, kind) in sorted(objs, key=lambda t: (t[0], t[2], t[1])):
        floor_no = {'F1_MAP': 0, 'F2_MAP': 1, 'F3_MAP': 2, 'F4_MAP': 3}[title]
        if fl == floor_no:
            print(f'  F{fl} ({x:02d},{y:02d}) {kind:8s} {fid}')

def my_short(fid):
    return fid[:6]

if __name__ == '__main__':
    src = open(MAPS_RS, encoding='utf-8').read()
    maps = load_maps()
    objs = load_objs(src)
    all_sorted = []
    for t in objs.values():
        all_sorted.extend(t)
    which = sys.argv[1] if len(sys.argv) > 1 else 'all'
    for nm, rows in maps.items():
        if which != 'all' and which.upper() != nm:
            continue
        draw(rows, all_sorted, nm)