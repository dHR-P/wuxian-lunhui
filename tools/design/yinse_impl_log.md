# 《银色大地 · 地灵族机界遗迹》实现日志（yinse）

> 实现子代理：yinse 副本实现子代理 ｜ 模型：tokenrhythm/deepseek-v4-flash-0731
> 设计依据：`design/zhttty_universe/honghuang_li/yinse_dadi.md`（权威）
> 硬约束：只写全新文件（worlds/yinse.rs + scenes_yinse.rs + tests/yinse_flow.rs + 本日志）；绝不修改既有文件；不部署；cargo check 只修自己文件错，外部错误记录不修。
> 主神衔接：WORLDS 注册 / GW 网关 / scenes::scene() 与 scenes::fight_cfg() 扩展由主线合并阶段做（★外部依赖，见下）。

---

## 【已完成】File 1 · `server-rs/src/worlds/yinse.rs`（世界静态数据）

### 层数
4 层，40×26/层：
- L1 白银荒原 · 地表尸骸战场（`YINSE_F1_MAP`，§3.1）
- L2 地灵族都市遗迹（`YINSE_F2_MAP`，§3.2）
- L3 机界升华工厂（`YINSE_F3_MAP`，§3.3）
- L4 银色核心 · 瓦罗之墓（`YINSE_F4_MAP`，§3.4）

### 导出项（worlds/yinse.rs）
- 地图：`YINSE_F1_MAP..F4_MAP`、`YINSE_FLOOR_NAMES`
- 表：`POINTS` / `ENEMIES` / `NPCS` / `ZONES` / `PORTALS` / `GATES`（全部 id `ys_` 前缀）
- `use crate::maps;` 引用映射类型（与 zhouyuan.rs/zhutian.rs 一致）。

### POINTS（调查点，14 个）
| id | 层 | 坐标 | 内容 |
|---|---|---|---|
| ys_pt_drop | L1 | (2,13) | 撤离信标（出生点/提前结算） |
| ys_dragon_pit | L1 | (30,6) | 龙尸坑·地灵方解石（san-4） |
| ys_war_flags | L1 | (17,15) | 北废墟·战旗情报 |
| ys_power_master | L2 | (4,7) | 配电塔总控（机关链 Z1） |
| ys_power_b | L2 | (24,9) | 配电点 B（Z2） |
| ys_power_c | L2 | (16,22) | 配电点 C（Z3） |
| ys_home_bones | L2 | (16,16) | 居民骸骨长街（san-8 真相） |
| ys_l2_vault | L2 | (10,21) | 隐藏库房（三神兵·机核碎片） |
| ys_assembly_line | L3 | (20,18) | 三神兵生产线 |
| ys_l3_rift_lever | L3 | (32,12) | 裂缝机关拉杆（机关链末端） |
| ys_l4_stele | L4 | (6,3) | 瓦罗石碑（san-2+诗谜） |

### ENEMIES（§4，fight 引用 yinse_figths()）28 个
按层覆盖：L1 拾荒者×2/碎骨者/银蚴×3；L2 机仆×4/电偶×2/缝合体×2/巢群；L3 守卫×3/灾厄之蛹/银蛇×2；L4 守墓枢机×2/银蚴残余×2。miniboss 髅与试作残骸为条件触发（见 ZONES + 场景）。

### NPCS（2）
- ys_n_asang（阿桑）→ ys_03_asang
- ys_n_xiaoshu（小枢）→ ys_07_xiaoshu

### ZONES（7）
- ys_z_mini_lou（L1 战潮王髅战场，fight）
- ys_z_powerchain（L2 顺序机关链，puzzle）
- ys_z_nest（L2 银蚴巢群，fight）
- ys_z_sublime（L3 升华装置启动间，puzzle）
- ys_z_rift（L3 低纬度裂缝，puzzle）
- ys_z_waro（L4 决战祭坛 BOSS 两段式，fight → ref ys_waR0_r1）
- ys_z_huang（L4 东天二皇投影·演出 overlay，不可战）

### PORTALS（7，§3.5 接线表，物理单向）
pt_down1(L1→L2) / pt_up1(L2→L1) / pt_down2(L2→L3) / pt_up2(L3→L2) / pt_down3(L3→L4) / pt_rift(L3→L4 裂缝) / pt_exit(L4→主神)。

### GATES（4，§3.6）
| id | 位置 | 需要 |
|---|---|---|
| ys_g_ele1 | L1(33,21) | item_diling（地灵方解石） |
| ys_g_runegate | L2(28,12) | ysl2_power_restored flag |
| ys_g_sublime | L3(13,13) | item_jiche（三神兵·机核碎片） |
| ys_g_core | L3(24,23) | ys_core_open flag（truth OR 机核 → 场景 Dyn 设） |

### 与设计差异（File 1）
1. **G4 双条件合并**：§3.6 G4 原为"waro_truth OR 三神兵·机核碎片"二选一；引擎 `GateDef` 单 need_flag/need_item 无法表达 OR。改用派生 flag `ys_core_open`，由场景（升华真相回放 / 裂缝拉杆侧门）在满足"truth 或持机核"时置位，门禁判此 flag。逻辑等价，落地为最小改动。
2. **三神兵生产线坐标**：§3.3 生产线段 (13,10)~(30,10)，落地调查点取 (20,18)（区域中部可走格）。§3.3 敌方"试作残骸"条件触发，ZONES 走 BOSS 化处理（见 scenes）。
3. **信封门 pt_rift 起点**：§3.5 表内 pt_rift 起点 (32,12)，与 §3.3"机关链末端拉杆(32,12)"同位，落地拉杆点与传送门起点共用 (32,12) —— 实际由场景 ys_11_rift_lever 在行选用"激活裂缝传送/关闭裂缝"后路由。

### 素材引用（§9.2/§9.1）
场景 bg：`img_ysd_l4_arena.png` 等（scenes 用）；本文件无图（纯坐标数据）。

---

## 【已完成】File 2 · `server-rs/src/scenes_yinse.rs`（剧情与战斗）

### 导出项
- `pub static YINSE_SCENES: &[SceneDef]`（id 全部 `ys_` 前缀）
- `pub fn yinse_figths() -> &'static [(&'static str, FightCfg)]`（id 全部 `ws_` 前缀）
- 辅助：`ys_scene(id)` / `ys_fight_cfg(id)`（主线合并查询扩展时可直接调用）

### BOSS 两段式（§5）：机界升华体·瓦罗残响 `ws_waro_r1`(380) → 转场演出 `ys_waR0_cast` → `ws_waro_r2`(300)
- 一段战胜利（`ys_win_r1`）→ 转场演出场景（东天二皇投影，演出级，不可战）→ 放二段（`start_waro_r2` 建 Fight 进 `ys_14_round_r2`）。**无 next_fight 引擎字段**，用场景链衔接（§10.2 取舍）。
- 升华可打断：`ys_13_cast_check` 中 `l2_power_restored` 时设 `ys_waro_cast_stopped` → 一段终结技「机界升华·降临」不释放（finisher_desc 分支）。
- 结局三向（二段胜利 `ys_win_r2` 路由）：
  - 和平归还（`waro_peace`）→ `ys_15_ending_peace`
  - 私藏碎片（持 `item_jiche`）→ `ys_15_ending_fire`
  - 强杀（无真相/碎片）→ `ys_15_ending_venge`
- 结算：`ys_16_settle` / `ys_17_settle_fire` 两张结算卡；死亡档案：`ys_lose_r1`（被升华定格，扣 400）、`ys_lose_r2`（洞悉真相则特殊失败扣 200 文案）、`ys_lose_common`。

### 圣位演出红线（§1/§10.4）
- 东天二皇投影：`ys_waR0_cast` 纯演出场景，`fight_id=None`、不建 Fight，演出文本内含「镇压——凡升者，必坠」与裂缝吞没投影。
- 龙族高圣尸骸：`ys_dragon_pit`（调查得地灵方解石，san-4，**演出文本不对战**，落地为 scenes 调查场景，未进 fights 数值）。
- 瓦罗圣位本体：只做残响演出文本，可控 BOSS 是执念×机界残骸聚合体（两段数值封四阶初中级 380+300）。

### 敌人表（§4）
`ws_scav/ws_brute/ws_worm/ws_lou(miniboss)/ws_servant/ws_golem/ws_fused/ws_nest/ws_guardline/ws_proto/ws_pupa/ws_abyss_snake/ws_warden` + BOSS r1/r2。狂暴/终结/掉落/立绘复用按文档。

### 机关链（§10.1，L2 顺序 master→B→C）
- 三个 PointDef 各设 flag；错序经 `route_wrong_order` 触发电偶战斗（`ys_06_golem_fight`）——零引擎改动的自然惩罚（案 A）。
- 完成后设 `ys_l2_power_restored` → 符文闸门 G2 / 库房通道 / 回程吊索。

### 撤离信标 / 主神衔接（§7/§8）
- `ys_pt_drop`（L1 降落点）→ `ys_evac_beacon`：需 `item_beacon`（主神信标）可提前结算 `ys_16_settle`。
- 撤离传送门 `ys_pt_exit` → 结算卡。主神兑换项（力量之道·古之残响 1800 / 心灵之光·稚芽 3000+C 需 waro_truth 等）由主神空间衔接（主线/主神场景扩展）。

### 与设计差异（File 2）
1. 两段式 BOSS 落地为**选择驱动回合**（`txt_round_r1/r2` + `route_r1_attack/route_r2_attack`），不依赖引擎 `Mode::Fight` 同步——与 scenes_zhouyuan.rs `b_kayako` 场景链一致（§10.2 取舍案）。
2. 圣位尸骸演出在调查场景文本落地（`ys_dragon_pit`），未进 fights 表。
3. `win` 闭包为只读（FightCfg.win 签名 `fn(&GameState)`），掉落/flag 改由剧情场景 Choice 的 Eff 落地（如髅之掉的方解石+髅骨在 `ys_05_lou_win` 选择中）。
4. FightCfg.death 为 `&str`（非 fn），特殊失败（真相推裂缝）由 death overlay card 内据 `ys_waro_truth` 分支文案实现。

---

## 【已完成】File 3 · `server-rs/tests/yinse_flow.rs`（集成测试）

1. `yinse_f1_map_reachable`：L1 每行 40 字符 / 出生点 (2,13) / 关键点可走动 / BFS 连通。
2. `yinse_main_line_boss_two_phase`：救人→髅(得方解石)→机关链→小枢+库房碎片→升华真相→一段 BOSS(打断)→转场演出→二段→结算（sp_grade=D、掉瓦罗之泪）。
3. `yinse_powerchain_wrong_order_triggers_golem`：先动 C 错序 → 触发电偶战斗场景。
4. `yinse_huang_yaji_cast_is_playout_not_fight`：转场演出场景 fight_id=None、不建 Fight、不进战斗模式。

### 外部依赖（★ 需主线合并阶段完成）
| 依赖 | 说明 |
|---|---|
| `worlds::WORLD_YINSE` 常量 | 在 worlds/mod.rs 新增 `pub const WORLD_YINSE: &str = "yinse_dadi";` 并注册进 `WORLDS` 列表 |
| `mod worlds::yinse;` | worlds/mod.rs `mod yinse;` |
| `YINSE_SCENES` 并入 `scenes::scene()` | scenes.rs `scene()` 增加 `or_else(|| scenes_yinse::YINSE_SCENES.iter().find(...))` |
| `yinse_figths()` 并入 `scenes::fight_cfg()` | scenes.rs `fight_cfg()` 增加 `or_else(|| scenes_yinse::yinse_figths().iter().find(...))` |
| `mod scenes_yinse;` | 库根新增模块声明 |
| 网关/跨世界 | 主神空间门「洪荒·覆灭历」(GW) 由主神世界接入（gw_yinse） |
---

## 待办 / 提醒
- [ ] 主线合并注册（上表外部依赖）。
- [ ] cargo check 须在注册后由主线执行（本子代理不改既有文件，无法独立编译新文件）。
- [ ] 素材命名核对：bg `img_ysd_l1_waste.png` 等 + BOSS `enemy_waro_r1/r2.png`（§9 已列，主线统一生图）。