# -*- coding: utf-8 -*-
"""箱庭设计选址辅助：验证门禁/爬梯/单向井候选格是否可走，并分析关键区域入口。"""
import re

MAPS_RS = r'C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1\server-rs\src\maps.rs'

def load():
    src = open(MAPS_RS, encoding='utf-8').read()
    maps = {}
    for nm in ['F1_MAP', 'F2_MAP', 'F3_MAP', 'F4_MAP']:
        m = re.search(nm + r': &\[&str\] = &\[(.*?)\];', src, re.S)
        maps[nm] = re.findall(r'"([#.PI]+)"', m.group(1))
    return maps

def ok(grid, x, y):
    if y < 0 or y >= len(grid) or x < 0 or x >= len(grid[y]):
        return False
    return grid[y][x] != '#'

def region(grid, sx, sy):
    """从 (sx,sy) 出发的连通开放区（四向）。返回格子集合。"""
    seen = set()
    stack = [(sx, sy)]
    while stack:
        x, y = stack.pop()
        if (x, y) in seen or not ok(grid, x, y):
            continue
        seen.add((x, y))
        for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)):
            stack.append((x+dx, y+dy))
    return seen

def region_entries(grid, reg):
    """区域 reg 与外部开放格的邻接边（非墙壁）；返回 [(ex,ey, rx,ry)] 外部格→区域内格。"""
    out = []
    for (x, y) in reg:
        for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)):
            nx, ny = x+dx, y+dy
            if ok(grid, nx, ny) and (nx, ny) not in reg:
                out.append((nx, ny, x, y))
    return out

def main():
    maps = load()
    checks = {
        'F3_MAP': [  # (label, x, y)
            ('vlift_down', 30, 3),
            ('rq3_terminal', 24, 9),
            ('main_console', 33, 12),
            ('cand_ladder_out', 33, 3), ('cand_ladder_out2', 34, 3), ('cand_ladder_out3', 32, 3),
            ('cand_ladder_out4', 35, 3), ('cand_ladder_out5', 29, 3), ('cand_ladder_out6', 31, 3),
            ('shaft_down', 21, 14),
        ],
        'F4_MAP': [
            ('shaft_up_old', 21, 5),
            ('cand_ladder_in', 33, 18), ('cand_ladder_in2', 34, 18), ('cand_ladder_in3', 33, 17),
            ('cand_ladder_in4', 32, 18), ('cand_ladder_in5', 34, 17), ('cand_ladder_in6', 32, 19),
            ('cand_gate3', 32, 21), ('cand_gate3b', 32, 20),
            ('drain_gate', 6, 6), ('train_door', 33, 14), ('boss', 22, 23), ('firstaid', 22, 21),
        ],
        'F2_MAP': [
            ('cand_gate1', 32, 19), ('cand_gate1b', 32, 18), ('cand_gate1c', 31, 19),
            ('licker', 35, 22), ('z_laser', 34, 21), ('z_licker', 34, 22), ('horde_f2', 25, 24),
            ('vlift_up', 23, 14), ('shaft_f2?', 21, 14),
        ],
    }
    for nm, lst in checks.items():
        g = maps[nm]
        print(f'--- {nm} ---')
        for label, x, y in lst:
            print(f'  {label:16s} ({x:02d},{y:02d}) walkable={ok(g,x,y)} tile={g[y][x] if y<len(g) and x<len(g[y]) else "?"}' )

    print()
    # F3 右侧主控室区域分析：从 main_console 出发找连通区 & 入口
    g3 = maps['F3_MAP']
    reg = region(g3, 33, 12)
    ent = region_entries(g3, reg)
    print('F3 主控室区 (33,12) 大小:', len(reg), ' 入口数:', len(ent))
    for e in sorted(ent, key=lambda t: (t[0], t[1])):
        print(f'  外部入口格 ({e[0]:02d},{e[1]:02d}) -> 区内 ({e[2]:02d},{e[3]:02d})')
    # 主控室区内所有对象候选：server_array / safety_manual 是否在该区
    for lx, ly in [(30,5),(36,8),(33,12),(24,9),(21,14),(28,23),(12,18)]:
        print(f'  F3 格 ({lx:02d},{ly:02d}) 在主控室区: {(lx,ly) in reg}')

    print()
    # F2 右下舔食者区：从 (35,22) 出发
    g2 = maps['F2_MAP']
    reg2 = region(g2, 35, 22)
    ent2 = region_entries(g2, reg2)
    print('F2 舔食者区 (35,22) 大小:', len(reg2), ' 入口数:', len(ent2))
    for e in sorted(ent2, key=lambda t: (t[0], t[1])):
        print(f'  外部入口格 ({e[0]:02d},{e[1]:02d}) -> 区内 ({e[2]:02d},{e[3]:02d})')
    for (x,y) in [(35,22),(34,21),(34,22),(25,24),(9,23),(6,21)]:
        print(f'  F2 格 ({x:02d},{y:02d}) 在舔食者区: {(x,y) in reg2}')

    print()
    # F4 南区站台：从 (22,23) 出发
    g4 = maps['F4_MAP']
    reg4 = region(g4, 22, 23)
    ent4 = region_entries(g4, reg4)
    print('F4 站台区 (22,23) 大小:', len(reg4), ' 入口数:', len(ent4))
    for e in sorted(ent4, key=lambda t: (t[0], t[1])):
        print(f'  外部入口格 ({e[0]:02d},{e[1]:02d}) -> 区内 ({e[2]:02d},{e[3]:02d})')
    for (x,y) in [(22,23),(22,21),(24,24),(33,14),(21,5),(30,12)]:
        print(f'  F4 格 ({x:02d},{y:02d}) 在站台区: {(x,y) in reg4}')

    print()
    # F3 右侧电梯区（vlift_down 30,3 所在区）
    regv = region(g3, 30, 3)
    entv = region_entries(g3, regv)
    print('F3 电梯/服务器区 (30,3) 大小:', len(regv), ' 入口数:', len(entv))
    for e in sorted(entv, key=lambda t: (t[0], t[1])):
        print(f'  外部入口格 ({e[0]:02d},{e[1]:02d}) -> 区内 ({e[2]:02d},{e[3]:02d})')
    for (x,y) in [(30,3),(30,5),(33,12),(36,8),(32,4),(21,14),(24,9)]:
        print(f'  F3 格 ({x:02d},{y:02d}) 在电梯区: {(x,y) in regv}')

if __name__ == '__main__':
    main()