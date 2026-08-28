# 《无限恐怖 · 死神来了》实现日志（副本子代理）

> 子代理：编程类，模型 `tokenrhythm/deepseek-v4-flash-0731`（与主线同模型）。
> 落地根：`games/wuxian-horror-ch1`。
> 产出：**只写 3 个全新文件 + 本日志**，未改动任何既有文件（一个字节未碰）。
> 定位：`00_INDEX_EXPANSION.md §1.1` 明确本副本为 **「规则流」** 零战斗机关关——死神无实体，以「意外死亡」连环收命，玩家在机场→公路→住宅三连环事故间预判死亡征兆，用 flag 链改写命运。

## 1. 文件进度（随产出逐条更新）

| 文件 | 行数 | 状态 |
|---|---|---|
| `server-rs/src/worlds/sishen.rs` | 158 | ✅ 已落盘（3 层开放地图 + POINTS 12 + NPCS 3 + ZONES 5 + ENEMIES 1 + GATES 2 + PORTALS 2，含出生点 P(20,5)） |
| `server-rs/src/scenes_sishen.rs` | 556+ | ✅ 已落盘（SISHEN_SCENES 36 个场景 + sishen_figths 1 场使者象征战 + 命运清单 flag 链引擎） |
| `server-rs/tests/sishen_flow.rs` | 141 | ✅ 已落盘（4 个用例） |

> ★项：上述文件在合并注册之前**不参与编译**（未挂入 worlds/mod.rs / scenes.rs / lib.rs）。
> 结构按 scenes_jiguancheng.rs / tests/jiguancheng_flow.rs 模板逐一对齐自查。

## 2. 世界静态数据（worlds/sishen.rs）

- **3 层 40×26**：L1 机场候机大厅 / L2 明州高速公路 / L3 郊外住宅（`SISHEN_L1/2/3_MAP`，ASCII 仅示意，坐标为权威）。
- **出生点** `(20,5)` L1 候机大厅；`SISHEN_FLOOR_NAMES` 3 层名。
- **POINTS 12 个**（全 `ss_p_` 前缀，route 全指向 scenes_sishen.rs 场景 id）：
  L1 `ss_p_l1_board`（值机屏航班牌）/ `ss_p_l1_sit`（候机座椅）/ `ss_p_l1_nexus`（扶梯口）/ `ss_p_l1_glass`（落地玻璃幕）/ `ss_p_l1_metal`（金属通道缝隙）；
  L2 `ss_p_l2_over`（跨线天桥）/ `ss_p_l2_truck`（油罐车残骸）/ `ss_p_l2_tire`（轮胎印）/ `ss_p_l2_car`（连环撞车）；
  L3 `ss_p_l3_fuse`（跳闸电箱）/ `ss_p_l3_oven`（煤气灶）/ `ss_p_l3_stair`（楼梯口扶手）/ `ss_p_l3_water`（地面积水）。
- **NPCS 3 个**（同伴/证人）：L1 值班广播员 `ss_n_l1_announcer`→talk `ss_05_announcer`；L2 公路巡警 `ss_n_l2_trooper`→`ss_06_trooper`；L3 隔壁邻居 `ss_n_l3_neighbor`→`ss_07_neighbor`。
- **ENEMIES 1 个**（极简象征代理）：L3 车库「搬家的执法者（异样）」`ss_e_l3_enforcer`→fight `ss_enforcer`（guard 执法者立绘，使者象征战代理）。
- **ZONES 5 个**（核心：环境机关「意外死亡」表演）：
  - L1 `ss_z_l1_fall` kind=env → `ss_10_death_fall`（扶梯金属护栏·坠落）；
  - L2 `ss_z_l2_boom` kind=env → `ss_11_death_boom`（油罐车侧翻·爆炸）；
  - L3 `ss_z_l3_shock` kind=env → `ss_12_death_shock`（短路积水·触电）；
  - L3 `ss_z_l3_stair` kind=env → `ss_13_death_stair`（楼梯坠落·第二坠落线）；
  - L3 `ss_z_l3_emissary` kind=fight → `ss_emissary`（死神·使者象征战）。
- **GATES 2 个**：`ss_g1` 登机安检门（需 `it_boarding_pass` 登机牌）；`ss_g2` 匝道护栏缺口（需 flag `ss_foresee_explosion` 已识破爆炸征兆）。
- **PORTALS 2 个**（三连环单向推进）：`p_ss_1` L1(34,21)→L2(20,2)；`p_ss_2` L2(18,21)→L3(20,2)。

## 3. 命运清单 flag 链（核心规则流设计）

预判征兆 → 置 `ss_foresee_*` → 遇环境机关时进入「改写命运」免死分支 → 累计 3 个征兆齐备置
`ss_fate_rewritten`（命运清单全革新）。三连环对应三征兆：

1. **坠落**（L1 扶梯 / L3 楼梯）：征兆点观测置 `ss_foresee_fall`；
2. **爆炸**（L2 油罐车）：征兆点观测置 `ss_foresee_explosion`（同时解锁 G2）；
3. **触电**（L3 积水+电箱）：征兆点观测置 `ss_foresee_shock`。

未预判征兆进入对应 ZoneDef → San 惩罚 + 命中则触发致死死亡档案「意外身故」（environment 死亡，复活扣 300 回主神）。
预判过征兆 → 改命：免死 + 加点 +（若三征兆齐）结算命运清单全革新 + sp_grade=D。

### 3.1 实际场景 / 路由落点（scenes_sishen.rs，36 场景，id 全 `ss_`）
- 开场 `ss_00`（钩子：「死神从不露面，只在你放松的下一秒。」sp_grade 预留 D 级）。
- L1 机场 hub `ss_01_l1_hub`；征兆观测：`ss_02_escalator`/`ss_02_glass`→`mark_fall_l1` 置 `ss_foresee_fall`；`ss_02_sit` 取 `it_boarding_pass`（开 G1）；`ss_02_board`/`ss_02_metal` 伏笔；NPC `ss_05_announcer`。
- L1 环境机关 `ss_10_death_fall`（坠落）：`zone_fall` 依 `ss_foresee_fall` → 免死 `ss_01_l1_hub`（+40 + `ss_sign_fall_dodged`）或死亡 `ss_40_death_fall`。
- L2 公路 hub `ss_03_l2_hub`；征兆观测：`ss_03_truck`→`mark_explosion` 置 `ss_foresee_explosion`（开 G2）；`ss_03_overpass/tire/car` 伏笔；NPC `ss_06_trooper`。
- L2 环境机关 `ss_11_death_boom`（爆炸）：`zone_boom` → 免死 `ss_03_l2_hub`（+50 + `ss_sign_boom_dodged`）或死亡 `ss_41_death_boom`。
- L3 住宅 hub `ss_04_l3_hub`；征兆观测：`ss_04_fuse`/`ss_04_water`→`mark_shock` 置 `ss_foresee_shock`；`ss_04_stair`—`mark_fall_l3`；`ss_04_oven` 伏笔；NPC `ss_07_neighbor`。
- L3 环境机关：`ss_12_death_shock`（触电）`zone_shock`、`ss_13_death_stair`（坠落）`zone_stair`；死亡档案 `ss_42_death_shock`/`ss_43_death_stair`。
- 使者象征战：`ss_04_garage`→`ss_09_emissary`（fight `ss_emissary`）→win `ss_09_emissary_win`→结算；死亡 `ss_44_death_enforcer`。规则流主线可完全绕过。
- 结算：`ss_20_settle` 文字 + 选择 →`Route::Dyn(route_settle)` 置 `sp_grade=Some('D')` → `ss_21_card`（Nice Ending 卡片，`__enter_nexus__` 按钮）。
- 死亡档案全部 overlay：`death: Some((标题, 死因「意外身故」类文案))`，复活扣 300 回主神（主线复活系统接线）。

### 3.2 flag 链实现
`foresaw(st, which)` 置征兆 flag；`cond_all_foreseen` 三征兆齐备且未置时，首置 `ss_fate_rewritten` 并 `+150`。
`zone_*` 四个环境机关入口函数统一「预判征兆→改命免死 / 未预判→死亡档案」，零战斗、零实体 BOSS。

## 4. 集成测试（tests/sishen_flow.rs，4 用例）
1. `sishen_l1_map_reachable`：三层每行 40 字符 + 出生点 `P(20,5)` + L1 调查点/传送门起点可走。
2. `sishen_fate_rewrite_chain`：三征兆观测→`ss_fate_rewritten`；预判后进 3 个环境机关全免死存活（deaths==0）；结算→`ss_21_card`。
3. `sishen_environment_death_archive`：未预判→进坠落机关→`ss_40_death_fall`，断言 overlay `death` 记录（意外身故死因）。
4. `sishen_fight_table_complete`：`sishen_figths()` 含 `ss_emissary`（使者象征战，HP 150）。

## 5. ★外部依赖清单（需主线合并阶段接线）
1. `worlds/mod.rs`：注册 `pub const WORLD_SISHEN: &str = "sishen";` + 在 `find_world()` 挂 `WorldData { id, name, floors:&[SISHEN_L1_MAP..], floor_names, points:&maps::POINTS, enemies:&maps::ENEMIES, npcs:&maps::NPCS, zones:&maps::ZONES, portals:&maps::PORTALS, gates:&maps::GATES }`（split 世界的 `maps::POINTS` 等即本文件静态表；若引擎按模块隔离需加 `use crate::worlds::sishen::*`）。
2. `scenes.rs`：把 `SISHEN_SCENES` 并入 `scene()` 检索、把 `sishen_figths()` 并入 `fight_cfg()` 检索（参考 scorpe：扩展两个静态表或 each 调 `ss_fight_cfg`）。
3. `lib.rs`/`mod`：声明 `pub mod scenes_sishen;`（以及 `worlds::sishen` 若按模块组织）。
4. 素材替换：bg 现用占位 `img_train.png`（机场）/`img_corridor.png`（公路）/`img_zhuyuan_book.png`（住宅），待主线生图后换 `ss_bg_airport/road/house`；使者象征战立绘复用 `guard`（执法者形）。
5. 新增道具 `it_boarding_pass`（登机牌）需主线在 items_data 注册（用于 G1 门禁 need_item）；`sp_grade=D` 走既有经济线。
6. 死亡档案复活扣 300 与「意外身故」存档由主线死亡/复活系统接线。

★本子代理只写三文件 + 本日志，未改动任何既有文件（含模版未合并注册，故当前不参与编译，属预期）。