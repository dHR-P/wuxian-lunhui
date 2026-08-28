# -*- coding: utf-8 -*-
"""多楼层地图验证器：规范化等宽、对象开洞、BFS 连通性检查。
用法: python map_validator.py <draft.json>
draft.json: {"F1": [rows...], "F2": [...], "F3": [...], "F4": [...]}
"""
import json, sys, collections

W, H = 40, 26

def load(path):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def normalize(rows):
    out = []
    errs = []
    for i, r in enumerate(rows):
        r = r.rstrip('\n')
        if len(r) > W:
            errs.append(f"  row {i}: len={len(r)} > {W} -> {r}")
            r = r[:W]
        elif len(r) < W:
            # 补墙到标准宽（若该行以墙逻辑结尾）
            r = r + '#' * (W - len(r))
        # 首尾必须是墙
        rl = list(r)
        rl[0] = '#'
        rl[-1] = '#'
        out.append(''.join(rl))
    if len(out) != H:
        errs.append(f"  total rows={len(out)} != {H}")
    return out, errs

def bfs(map_, start, doors):
    """从 start 出发，在非墙格子中 BFS；doors 集合视为可走。返回可到达集合。"""
    seen = set()
    q = collections.deque([start])
    seen.add(start)
    while q:
        x, y = q.popleft()
        for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)):
            nx, ny = x+dx, y+dy
            if not (0 <= nx < W and 0 <= ny < H): continue
            if (nx, ny) in seen: continue
            c = map_[ny][nx]
            if c != '#':
                seen.add((nx, ny))
                q.append((nx, ny))
    return seen

def main():
    data = load(sys.argv[1])
    objs = data.get('objects', {})  # floor -> list of (id, x, y, kind)
    portals = data.get('portals', [])  # list of (id, floor, x, y, to_floor, tx, ty)
    all_ok = True
    reach = {}   # (floor) -> reachable set from spawn
    for name in ['F1', 'F2', 'F3', 'F4']:
        rows, errs = normalize(data['maps'][name])
        if errs:
            print(f"== {name} 长度错误:"); [print(e) for e in errs]
            all_ok = False
            continue
        data['maps'][name] = rows
        print(f"== {name} 规范化完成 ({len(rows)}x{len(rows[0])})")

    # 开洞：对象与传送门坐标置 '.'
    for name in ['F1','F2','F3','F4']:
        rows = [list(r) for r in data['maps'][name]]
        fl = ['F1','F2','F3','F4'].index(name)
        for o in objs.get(str(fl), []):
            oid, x, y, kind = o
            if 0 <= x < W and 0 <= y < H:
                rows[y][x] = '.'
        for p in portals:
            pid, pf, x, y, tf, tx, ty = p
            if pf == fl:
                rows[y][x] = '.'
            if tf == fl:
                rows[ty][tx] = '.'
        data['maps'][name] = [''.join(r) for r in rows]

    # 出生点可达性 + 全层连通
    spawn_map = {'F1': None, 'F2': None, 'F3': None, 'F4': None}
    for name in ['F1','F2','F3','F4']:
        rows = data['maps'][name]
        try:
            sy = next(y for y, r in enumerate(rows) if 'P' in r)
            sx = rows[sy].index('P')
        except StopIteration:
            sy, sx = 1, 1
        spawn_map[name] = (sx, sy)
        reach[name] = bfs(rows, (sx, sy), None)
        # 统计非墙格子
        total = sum(1 for r in rows for c in r if c != '#')
        if len(reach[name]) != total:
            all_ok = False
            missing = [(x, y) for y in range(H) for x in range(W)
                       if rows[y][x] != '#' and (x, y) not in reach[name]]
            print(f"!! {name} 不连通: 可达 {len(reach[name])}/{total}，缺失 {len(missing)} 处: {missing[:20]}")

    # 对象位置检查
    for fl in range(4):
        name = ['F1','F2','F3','F4'][fl]
        rows = data['maps'][name]
        for o in objs.get(str(fl), []):
            oid, x, y, kind = o
            if not (0 <= x < W and 0 <= y < H):
                print(f"!! {name} 对象 {oid} ({x},{y}) 越界"); all_ok = False; continue
            if (x, y) not in reach[name]:
                print(f"!! {name} 对象 {oid} ({x},{y}) 不可达"); all_ok = False
        print(f"== {name} 对象放置 OK")

    # 传送门双侧可达
    for p in portals:
        pid, pf, x, y, tf, tx, ty = p
        n1 = ['F1','F2','F3','F4'][pf]
        n2 = ['F1','F2','F3','F4'][tf]
        ok1 = (x, y) in reach[n1]
        ok2 = (tx, ty) in reach[n2]
        if not ok1 or not ok2:
            all_ok = False
            print(f"!! 传送门 {pid}: {n1}({x},{y})可达={ok1}  ->  {n2}({tx},{ty})可达={ok2}")

    # 输出最终地图
    if all_ok:
        print("\n===== 最终地图（可直接写入 maps.rs）=====")
        for name in ['F1','F2','F3','F4']:
            print(f"// {name}")
            for r in data['maps'][name]:
                print(f'    "{r}",')
            print()
        print("ALL GREEN ✅")
    else:
        print("\n仍有问题，请修正后重跑。")
        sys.exit(1)

if __name__ == '__main__':
    main()