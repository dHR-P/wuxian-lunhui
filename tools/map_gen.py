# -*- coding: utf-8 -*-
"""程序化生成蜂巢 4 层等宽地图（40x26），对象坐标自动吸附到可走格。
输出 maps.rs 可直接粘贴的 Rust 代码段。
"""
import collections

W, H = 40, 26

def blank():
    return [['#'] * W for _ in range(H)]

def carve(g, x0, y0, x1, y1):
    """挖矩形开放区域（含边界，自动夹紧）"""
    for y in range(max(0, y0), min(H, y1 + 1)):
        for x in range(max(0, x0), min(W, x1 + 1)):
            g[y][x] = '.'

def hdoor(g, x, y):
    if 0 <= x < W and 0 <= y < H: g[y][x] = '.'

def col(g, x, y, c='I'):
    """柱子/设备"""
    if 0 <= x < W and 0 <= y < H and g[y][x] != '#': g[y][x] = c

def nearest_open(g, x, y):
    """从 (x,y) 螺旋找最近非墙格"""
    if 0 <= x < W and 0 <= y < H and g[y][x] != '#':
        return (x, y)
    for r in range(1, 20):
        for dy in range(-r, r + 1):
            for dx in range(-r, r + 1):
                if max(abs(dx), abs(dy)) != r: continue
                nx, ny = x + dx, y + dy
                if 0 <= nx < W and 0 <= ny < H and g[ny][nx] != '#':
                    return (nx, ny)
    return (1, 1)

def bfs_check(g):
    """返回 (连通分量列表, 是否全通)"""
    comps = []
    seen_all = set()
    for y in range(H):
        for x in range(W):
            if g[y][x] == '#' or (x, y) in seen_all:
                continue
            comp, q = {(x, y)}, collections.deque([(x, y)])
            while q:
                cx, cy = q.popleft()
                for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)):
                    nx, ny = cx+dx, cy+dy
                    if 0 <= nx < W and 0 <= ny < H and g[ny][nx] != '#' and (nx,ny) not in comp:
                        comp.add((nx, ny)); q.append((nx, ny))
            seen_all |= comp
            comps.append(comp)
    total = sum(1 for row in g for c in row if c != '#')
    ok = len(comps) == 1
    return comps, ok

# ---------------- F1 入口层：西站台 — 中消毒厅 — 东齿轮电梯厅 ----------------
def f1():
    g = blank()
    carve(g, 1, 1, 38, 24)                    # 整层开放
    # 西侧站台区
    hdoor(g, 20, 1); hdoor(g, 20, 25)
    col(g, 8, 4); col(g, 12, 4); col(g, 8, 6); col(g, 12, 6)   # 站台立柱
    # 中部消毒通道：横贯墙，留门
    for x in range(1, 39):
        g[12][x] = '#'                          # 主隔墙
    hdoor(g, 4, 12); hdoor(g, 17, 12); hdoor(g, 27, 12)  # 三个门洞
    for x in range(1, 39):
        g[22][x] = '#'                          # 南隔墙
    hdoor(g, 9, 22); hdoor(g, 30, 22)
    # 消毒小室（中段北）
    for y in range(3, 9):
        g[y][15] = '#'; g[y][19] = '#'
    for x in range(15, 20):
        g[4][x] = '#'; g[8][x] = '#'
    hdoor(g, 17, 4); hdoor(g, 17, 8)
    # 东侧电梯厅装饰
    col(g, 25, 3); col(g, 31, 3); col(g, 25, 20); col(g, 33, 20)
    return g

# ---------------- F2 实验层：B区走廊/餐厅/厨房/实验室/样本库 ----------------
def f2():
    g = blank()
    carve(g, 1, 1, 38, 24)                     # 整层开放
    # 十字走廊
    for x in range(1, 39): g[9][x] = '#'        # 东西主墙
    hdoor(g, 3, 9); hdoor(g, 12, 9); hdoor(g, 24, 9); hdoor(g, 34, 9)
    for x in range(1, 39): g[18][x] = '#'       # 南墙
    hdoor(g, 6, 18); hdoor(g, 21, 18); hdoor(g, 32, 18)
    for y in range(1, 25): g[y][13] = '#'       # 南北主墙
    hdoor(g, 13, 4); hdoor(g, 13, 13); hdoor(g, 13, 21)
    for y in range(1, 25): g[y][26] = '#'       # 东墙
    hdoor(g, 26, 4); hdoor(g, 26, 13); hdoor(g, 26, 22)
    # 西北：厨房/餐厅（小隔间）
    for x in range(2, 9): g[2][x] = '#'; g[7][x] = '#'
    for y in range(2, 7): g[y][2] = '#'; g[y][8] = '#'
    hdoor(g, 5, 2); hdoor(g, 5, 7)
    # 西南：无菌实验室 (11..21, 20..24) 通过 (13,21) 进入
    # 东南：病毒样本库 (33..37, 12..16)
    for y in range(12, 17):
        g[y][32] = '#'; g[y][37] = '#'
    for x in range(32, 38):
        g[12][x] = '#'; g[16][x] = '#'
    hdoor(g, 34, 12); hdoor(g, 34, 16)
    # 东北：红后终端室 + 隔离观察室
    for y in range(2, 8):
        g[y][19] = '#'; g[y][24] = '#'
    for x in range(19, 25):
        g[2][x] = '#'; g[7][x] = '#'
    hdoor(g, 21, 2); hdoor(g, 21, 7)
    for y in range(2, 10):
        g[y][36] = '#'; g[y][39] = '#'
    for x in range(36, 40):
        g[2][x] = '#'; g[9][x] = '#'
    hdoor(g, 36, 5)
    # 中央 B1/B2 实验台
    for x in range(15, 20): g[12][x] = '#'; g[16][x] = '#'
    for y in range(12, 17): g[y][15] = '#'; g[y][19] = '#'
    hdoor(g, 17, 12); hdoor(g, 17, 16)
    # 设备点缀
    for (x, y) in [(5, 13), (9, 13), (30, 11), (22, 20), (28, 20), (10, 23)]:
        col(g, x, y)
    return g

# ---------------- F3 核心层：红后机房 / 激光通道 / 配电室 ----------------
def f3():
    g = blank()
    carve(g, 1, 1, 38, 24)
    # 红后机房（中央大间，角门）
    for x in range(18, 30): g[5][x] = '#'; g[17][x] = '#'
    for y in range(5, 18): g[y][18] = '#'; g[y][29] = '#'
    hdoor(g, 24, 5); hdoor(g, 24, 17); hdoor(g, 18, 11); hdoor(g, 29, 11)
    # 机房内设备环
    for (x, y) in [(20,7),(27,7),(21,14),(28,14),(24,10)]:
        col(g, x, y, 'I')
    # 北激光通道（狭长房间）
    for x in range(2, 14): g[2][x] = '#'; g[8][x] = '#'
    for y in range(2, 9): g[y][2] = '#'; g[y][13] = '#'
    hdoor(g, 7, 2); hdoor(g, 7, 8); hdoor(g, 13, 5)
    # 西配电室
    for x in range(1, 8): g[11][x] = '#'; g[17][x] = '#'
    for y in range(11, 18): g[y][1] = '#'; g[y][7] = '#'
    hdoor(g, 4, 11); hdoor(g, 4, 17)
    # 南安全通道
    for x in range(14, 36): g[21][x] = '#'
    hdoor(g, 20, 21); hdoor(g, 30, 21); hdoor(g, 36, 21)
    # 东服务器室
    for x in range(33, 39): g[2][x] = '#'; g[7][x] = '#'
    for y in range(2, 8): g[y][33] = '#'; g[y][38] = '#'
    hdoor(g, 36, 4); hdoor(g, 36, 7)
    # 装饰
    for (x, y) in [(10, 12), (16, 8), (32, 13), (34, 20)]:
        col(g, x, y)
    return g

# ---------------- F4 底层：水道 / 排水闸 / 终点站台 / 逃生列车 ----------------
def f4():
    g = blank()
    carve(g, 1, 1, 38, 24)
    # 主走廊
    for x in range(1, 39): g[10][x] = '#'; g[20][x] = '#'
    hdoor(g, 3, 10); hdoor(g, 14, 10); hdoor(g, 27, 10); hdoor(g, 35, 10)
    hdoor(g, 6, 20); hdoor(g, 19, 20); hdoor(g, 30, 20)
    # 北水道区（闸门/管道）
    for x in range(4, 9): g[3][x] = '#'; g[7][x] = '#'
    for y in range(3, 8): g[y][4] = '#'; g[y][8] = '#'
    hdoor(g, 6, 3); hdoor(g, 6, 7)
    # 南站台大厅
    for x in range(28, 37): g[23][x] = '#'
    hdoor(g, 32, 23)
    # 东列车轨道（长条）
    for y in range(3, 20): g[y][34] = '#'; g[y][37] = '#'
    for x in range(34, 38): g[3][x] = '#'; g[19][x] = '#'
    hdoor(g, 34, 7); hdoor(g, 37, 12); hdoor(g, 34, 19)
    # 装饰/列车
    for (x, y) in [(12, 5), (18, 5), (25, 13), (11, 22), (24, 22)]:
        col(g, x, y, 'I')
    return g

# ---------------- 对象表（理想坐标 → 吸附） ----------------
def snap_objects(g, objs):
    out = []
    for oid, name, floor, x, y, extra in objs:
        nx, ny = nearest_open(g, x, y)
        if (nx, ny) != (x, y):
            print(f"  吸附 {oid}: ({x},{y}) -> ({nx},{ny})  理想={name}({floor})")
        out.append((oid, name, floor, nx, ny, extra))
    return out

def render(g):
    return [''.join(row) for row in g]

def main():
    maps = {'F1': f1(), 'F2': f2(), 'F3': f3(), 'F4': f4()}
    for name, g in maps.items():
        comps, ok = bfs_check(g)
        if not ok:
            for i, comp in enumerate(comps):
                xs = [p[0] for p in comp]; ys = [p[1] for p in comp]
                print(f"  {name} 分量{i}: 大小={len(comp)} 范围 x[{min(xs)},{max(xs)}] y[{min(ys)},{max(ys)}]")
        print(f"{name}: 全层连通={ok} 分量数={len(comps)}")
        assert ok, f"{name} 不连通"

    # 传送门（强制开洞）
    portals = [
        ("pt_elevator_down", 0, 27, 4, 1, 2, 2),
        ("pt_stairs_down",   0, 3, 20, 1, 23, 13),
        ("pt_elevator_up",   1, 2, 2,  0, 27, 4),
        ("pt_vlift_up",      1, 23, 14, 2, 30, 3),
        ("pt_vlift_down",    2, 30, 3,  1, 23, 14),
        ("pt_shaft_down",    2, 21, 14, 3, 21, 5),
        ("pt_shaft_up",      3, 21, 5,  2, 21, 14),
    ]
    for pid, pf, x, y, tf, tx, ty in portals:
        g = maps[['F1','F2','F3','F4'][pf]]
        g[y][x] = '.'   # 先挖源
        g2 = maps[['F1','F2','F3','F4'][tf]]
        g2[ty][tx] = '.'  # 再挖目标
    # 出生点：F1 西侧 (1,1)
    maps['F1'][1][1] = 'P'

    # 对象理想坐标
    points = [
        ("p_train_console", "列车控制台", 0, 20, 17, "d_train_console"),
        ("p_luggage", "行李架", 0, 3, 4, "d_luggage"),
        ("p_platform_map", "站台导览图", 0, 21, 10, "d_platform_map"),
        ("p_decon_terminal", "消毒终端", 0, 29, 10, "d_decon"),
        ("p_gate_lock", "大门密码锁", 0, 33, 10, "d_entrance_gate"),
        ("p_kitchen_cabinet", "厨房急救箱", 1, 6, 10, "d_adrenaline"),
        ("p_redqueen_terminal", "红后终端", 1, 28, 9, "d_redqueen"),
        ("p_laser_schematic", "激光通道示意图", 1, 21, 16, "d_schematic"),
        ("p_file_cabinet", "档案柜", 1, 6, 21, "d_files"),
        ("p_med_cabinet", "药品柜", 1, 9, 23, "d_meds"),
        ("p_sterile_lab", "无菌实验室", 1, 13, 19, "s_b_sterile_lab"),
        ("p_kitchen", "厨房", 1, 23, 17, "s_b_kitchen_after"),
        ("p_virus_vault", "病毒样本库", 1, 33, 13, "s_virus_vault"),
        ("p_isolation", "隔离观察室", 1, 38, 9, "s_isolation_room"),
        ("p_rq3_terminal", "红后终端(核心)", 2, 24, 9, "d_redqueen"),
        ("p_server_array", "服务器阵列", 2, 29, 6, "d_server"),
        ("p_main_console", "主控终端", 2, 33, 12, "d_main_console"),
        ("p_safety_manual", "安全手册", 2, 36, 8, "d_manual"),
        ("p_drain_gate", "排水闸", 3, 6, 6, "d_drain_gate"),
        ("p_pipe_valve", "管道阀门", 3, 29, 3, "d_pipe_valve"),
        ("p_firstaid", "站台急救点", 3, 22, 21, "d_firstaid"),
        ("p_train_door", "列车车门开关", 3, 34, 15, "d_train_door"),
        ("p_backup_power", "备用电源箱", 3, 24, 24, "d_backup_power"),
    ]
    enemies = [
        ("e_f1_z1", "站台丧尸", 0, 7, 6, "zombie1_save"),
        ("e_f1_z2", "列车员丧尸", 0, 14, 14, "zombie1_far"),
        ("e_z1", "游荡丧尸", 1, 26, 3, "zombie1_save"),
        ("e_z2", "游荡丧尸", 1, 30, 2, "zombie1_save"),
        ("e_z3", "厨房丧尸", 1, 15, 16, "zombie1_far"),
        ("e_h1", "水道尸群", 1, 26, 25, "horde"),
        ("e_licker", "舔食者", 1, 35, 22, "licker"),
        ("e_f3_z1", "回廊感染者", 2, 12, 18, "zombie1_save"),
        ("e_f3_z2", "机房守卫", 2, 28, 23, "b_guard"),
        ("e_f4_horde", "水道尸群", 3, 4, 8, "horde"),
        ("e_f4_z1", "管道丧尸", 3, 13, 18, "zombie1_save"),
        ("e_f4_boss", "舔食者·成年", 3, 22, 23, "licker"),
    ]
    npcs = [
        ("n_zhangjie", "张杰", 0, 8, 3, "s_world_zhangjie"),
        ("n_rain", "蕾恩", 1, 22, 16, "s_world_rain"),
        ("n_kaplan", "卡普兰", 1, 26, 14, "s_world_kaplan"),
        ("n_yihao", "一号", 1, 24, 11, "s_world_yihao"),
        ("n_rain_f3", "蕾恩(核心层)", 2, 32, 4, "s_world_rain"),
        ("n_rain_f4", "蕾恩(站台)", 3, 30, 12, "s_world_rain"),
    ]
    zones = [
        ("z_laser", "激光通道", 1, 34, 21, "puzzle", "d_laser_room"),
        ("z_licker", "站台BOSS区", 1, 34, 22, "fight", "licker"),
    ]

    # 吸附后输出
    print("\n=== POINTS ===")
    for (oid, name, fl, x, y, extra) in snap_objects(maps[['F1','F2','F3','F4'][0]], points):
        pass
    # 按层吸附：注意对象坐标属于对应层
    flmap = {'F1': 0, 'F2': 1, 'F3': 2, 'F4': 3}
    groups = {'points': [], 'enemies': [], 'npcs': [], 'zones': []}
    for oid, name, fl, x, y, extra in points:
        g = maps[['F1','F2','F3','F4'][fl]]
        nx, ny = nearest_open(g, x, y)
        if (nx, ny) != (x, y): print(f"  吸附点 {oid}: ({x},{y})->({nx},{ny})")
        groups['points'].append((oid, name, fl, nx, ny, extra))
    for oid, name, fl, x, y, extra in enemies:
        g = maps[['F1','F2','F3','F4'][fl]]
        nx, ny = nearest_open(g, x, y)
        if (nx, ny) != (x, y): print(f"  吸附敌 {oid}: ({x},{y})->({nx},{ny})")
        groups['enemies'].append((oid, name, fl, nx, ny, extra))
    for oid, name, fl, x, y, extra in npcs:
        g = maps[['F1','F2','F3','F4'][fl]]
        nx, ny = nearest_open(g, x, y)
        if (nx, ny) != (x, y): print(f"  吸附NPC {oid}: ({x},{y})->({nx},{ny})")
        groups['npcs'].append((oid, name, fl, nx, ny, extra))
    for oid, name, fl, x, y, kind, ref in zones:
        g = maps[['F1','F2','F3','F4'][fl]]
        nx, ny = nearest_open(g, x, y)
        if (nx, ny) != (x, y): print(f"  吸附副本 {oid}: ({x},{y})->({nx},{ny})")
        groups['zones'].append((oid, name, fl, nx, ny, kind, ref))

    # 输出 Rust
    out = []
    out.append("pub const MAP_W: usize = 40;")
    out.append("pub const MAP_H: usize = 26;")
    out.append("pub const FLOORS: usize = 4;")
    out.append('')
    out.append('pub static FLOOR_NAMES: [&str; 4] = ["F1 入口层 · 列车站台", "F2 实验层 · B区", "F3 核心层 · 红后机房", "F4 底层 · 水道站台"];')
    for name, g in maps.items():
        out.append('')
        out.append(f'pub static {name}_MAP: &[&str] = &[')
        for row in render(g):
            out.append(f'    "{row}",')
        out.append('];')
    out.append('')
    out.append('pub struct PointDef { pub id: &\'static str, pub name: &\'static str, pub floor: usize, pub x: usize, pub y: usize, pub route: &\'static str }')
    out.append('pub static POINTS: &[PointDef] = &[')
    for oid, name, fl, x, y, extra in groups['points']:
        out.append(f'    PointDef {{ id: "{oid}", name: "{name}", floor: {fl}, x: {x}, y: {y}, route: "{extra}" }},')
    out.append('];')
    out.append('')
    out.append('pub struct EnemyDef { pub id: &\'static str, pub name: &\'static str, pub floor: usize, pub x: usize, pub y: usize, pub radius: usize, pub fight: &\'static str }')
    out.append('pub static ENEMIES: &[EnemyDef] = &[')
    for oid, name, fl, x, y, extra in groups['enemies']:
        out.append(f'    EnemyDef {{ id: "{oid}", name: "{name}", floor: {fl}, x: {x}, y: {y}, radius: 3, fight: "{extra}" }},')
    out.append('];')
    out.append('')
    out.append('pub struct NpcDef { pub id: &\'static str, pub name: &\'static str, pub floor: usize, pub x: usize, pub y: usize, pub talk: &\'static str }')
    out.append('pub static NPCS: &[NpcDef] = &[')
    for oid, name, fl, x, y, extra in groups['npcs']:
        out.append(f'    NpcDef {{ id: "{oid}", name: "{name}", floor: {fl}, x: {x}, y: {y}, talk: "{extra}" }},')
    out.append('];')
    out.append('')
    out.append('pub struct ZoneDef { pub id: &\'static str, pub name: &\'static str, pub floor: usize, pub x: usize, pub y: usize, pub kind: &\'static str, pub ref_id: &\'static str }')
    out.append('pub static ZONES: &[ZoneDef] = &[')
    for oid, name, fl, x, y, kind, ref in groups['zones']:
        out.append(f'    ZoneDef {{ id: "{oid}", name: "{name}", floor: {fl}, x: {x}, y: {y}, kind: "{kind}", ref_id: "{ref}" }},')
    out.append('];')
    out.append('')
    out.append('pub struct PortalDef { pub id: &\'static str, pub floor: usize, pub x: usize, pub y: usize, pub to_floor: usize, pub tx: usize, pub ty: usize }')
    out.append('pub static PORTALS: &[PortalDef] = &[')
    for pid, pf, x, y, tf, tx, ty in portals:
        out.append(f'    PortalDef {{ id: "{pid}", floor: {pf}, x: {x}, y: {y}, to_floor: {tf}, tx: {tx}, ty: {ty} }},')
    out.append('];')
    code = '\n'.join(out)
    with open('C:/Users/GWL/Desktop/itwillclaude/games/wuxian-horror-ch1/tools/maps_gen.txt', 'w', encoding='utf-8') as f:
        f.write(code)
    print('\n已生成 tools/maps_gen.txt')
    # 地图预览
    for name, g in maps.items():
        print(f'\n--- {name} ---')
        for row in render(g):
            print(row)

if __name__ == '__main__':
    main()