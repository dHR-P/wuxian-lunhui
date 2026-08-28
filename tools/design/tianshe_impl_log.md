# 《天蛇族地下实验室 · 零号基地》实现日志（tianshe）

> 实现子代理：天蛇副本测试与日志收尾轻量子代理 ｜ 模型：tokenrhythm/deepseek-v4-flash-0731
> 设计依据：`design/zhttty_universe/honghuang_li/tianshe_lab.md`（权威）
> 硬约束：只写全新文件（tests/tianshe_flow.rs + 本日志）；绝不修改既有文件；不部署；不运行 cargo（未合并必然失败，预期）。
> 实现产物（前序代理产出，未合并未注册）：`server-rs/src/worlds/tianshe.rs` + `server-rs/src/scenes_tianshe.rs`。
> 主神衔接：WORLDS 注册 / scenes::scene() 与 scenes::fight_cfg() 扩展由主线合并阶段做（★外部依赖，见下）。

---

## 【文件与前序实现产物】

| 文件 | 行数 | 角色 |
|---|---|---|
| `server-rs/src/worlds/tianshe.rs` | 257 | 世界静态数据：L1-L4 地图 / POINTS / ENEMIES / NPCS / ZONES / PORTALS / GATES |
| `server-rs/src/scenes_tianshe.rs` | 818 | 全部 `ts_` 剧情场景 + `tianshe_figths()`（15 场 fight）+ 查询辅助 |
| `server-rs/tests/tianshe_flow.rs` | 298 | **本次新增** · 集成测试（合并后编译运行），6 个用例 |
| `tools/design/tianshe_impl_log.md` | — | **本次新增** · 本日志 |

均为新建文件，零修改既有文件。

---

## 【本次交付 · File · `server-rs/tests/tianshe_flow.rs`】集成测试

参考 `tests/zhouyuan_flow.rs` 与 `tests/yinse_flow.rs` 模板：`GameState::new()` + `engine::goto` + `engine::choose` + `pick()`（按 label 关键词）+ 断言（scene_id / points / flag / hp-san / sp_grade）。

### 测试用例（6 个）

1. **`tianshe_l1_map_reachable`（① 地图可达性）**：
   - `worlds::find_world(worlds::WORLD_TIANSHE)`（WORLD_TIANSHE 主线合并后加入，同 yinse/zhouyuan 写法）。
   - 断言四层每行恰 40 字符；出生点 `(1,1)`；L1 每个调查点 `worlds::walkable`（非墙）；BFS `flood_fill` 从出生点可达所有 L1 调查点。

2. **`tianshe_main_line_boss_win`（② 主线链）**：开场→囚笼→基因区→初蛇基因库→族长战→逼退→聚合体→胜利→结算。
   - `ts_open` 观察环境→`ts_act2_cell` 和阿莲交谈→`ts_act3_convoy` 趁乱夺令→`ts_guard_fight`(drive_fight)→`ts_guard_win` 循令牌下电梯(+G1)→`ts_act4_pool` 先救阿莲(草药麻醉剂)→`ts_zero_fight`(drive_fight)→`ts_zero_win` 继续深入→`ts_act5_temple` 调查祭坛取血契+样本→`ts_act6_core` 揭穿他→`ts_boss1_fight`(drive_fight，穆拉巴 HP<150 触发「逼退」finisher)→`ts_boss1_retreat`→熔炉核心(start_snake)→`ts_boss2_round` 重击至 HP<100 再「样本共鸣」→`ts_boss2_win`→拾取战利品→`ts_finale` 主通道撤离→`ts_finish`。
   - 断言：points 全程增加、`sample_resonance`、`boss1_retreated`、`boss2_defeated`、`dungeon_cleared`、`sp_grade==Some('D')`、持有 `item_core_crystal`。
   - *注*：全程手动 `st.weapon` 给一柄军刀（引擎裸拳 base=0 打不动敌人），`st.hp=2000/san=150` 抬高以稳定通过多场引擎反击。

3. **`tianshe_archive_collection`（③ 残页收集）**：逐张 `goto` 8 个残页场景（ts_roster/flow/prayer/mother/seal/escape/name/heart），各 `收下残页` +30→回 `ts_hall` → 集齐自动置 `ts_archive_all` → 进 `ts_finale` 主通道撤离结算 +200。断言 flag 置位、结算点额 ≥+200、`ts_finish`、`sp_grade=D`。

4. **`tianshe_no_sample_shed_wipe`（④ 无样本→灭团）**：手工构建 `apocalypse_snake` Fight（HP=60<100，inventory 无样本），`goto ts_boss2_round` 连击 3 次「重击」→ 倒计时 `ts_apoc_1/2/3` 递增 → 第 3 次进 `ts_boss2_wipe`。断言 scene、三个倒计时 flag、灭团死亡档案（`灭世蜕皮`）。
   - *注*：`st.hp=500` 抬血避免无样本反击致死干扰倒计时测试。

5. **`tianshe_with_sample_resonance`（⑤ 样本共鸣终局）**：inventory 置 `item_chushe_sample` + 手工 Fight（HP=60<100），`goto ts_boss2_round` 选「样本共鸣」→ `route_snake_resonance` → 直接 `ts_boss2_win`，置 `sample_resonance`；继续推进拾取战利品→撤离→`ts_finish`、`sp_grade=D`。

6. **`tianshe_fight_table_complete`（⑥ 战斗表完整性）**：直接 `scenes_tianshe::tianshe_figths()`，断言 15 场 id 全覆盖 + 长度 15 + BOSS 数值（mulaba HP 360/reward 500；apocalypse_snake HP 540/reward 800）。

### 引用路径（合并后形态）
- `wuxian_horror_ch1::{engine, state::{GameState, Mode}}`、`wuxian_horror_ch1::worlds`（WORLD_TIANSHE）、`wuxian_horror_ch1::scenes::scene/fight_cfg`、`wuxian_horror_ch1::state::{Weapon::Sword, Fight}`、`wuxian_horror_ch1::scenes_tianshe::tianshe_figths`。

---

## 【场景 / 路由目标 self-consistency 核对】

对 `worlds/tianshe.rs` 各对象表 route/ref/talk/fight 字段逐一交叉核对 `scenes_tianshe.rs` 的 TIANSHE_SCENES 场景 id 与 `tianshe_figths()` 战斗 id：

| 来源表 | 引用字段 | 目标 | 核对结果 |
|---|---|---|---|
| POINTS（21 个） | `route` | 场景 id | 全部存在（ts_roster/tokenbox/foreman/wall/pool/flow/prayer/mother/console/safe/rune/valve/altar/hope/seal/mothercurve/temple/escape/furnace/name/heart）✓ |
| ENEMIES（13 个） | `fight` | 战斗 id | 全部存在（guard/hound/cell_rioter/overseer/swallower/licker_x/snake_guard/chushe_tentacle/rabid_guard/royal_guard/wangxue_exp/nest_tentacle）✓ |
| NPCS（3 个） | `talk` | 场景 id | 全部存在（ts_npc_alien/stone/jun）✓ |
| ZONES（4 个） | `ref_id` | 场景/战斗 id | `zero_proto`✓(fight) `ts_act5_temple`✓(scene) `mulaba`✓(fight) `apocalypse_snake`✓(fight) |
| GATES（7 个） | need_item/need_flag | 道具/flag | 道具 mapping 见下；flag 由场景 Dyn 置位 ✓ |
| PORTALS（7 个） | to_floor/tx/ty | 内部坐标 | 物理单向，无场景引用 ✓ |

**RBCC 结论：路由自洽，无缺失目标。**

**发现 1 处 **flag 命名不一致（待主线/后续修复，非阻断测试）**：**
- `route_hope`（scenes_tianshe.rs）集齐镜线置 **`mirror_line_3`**（无 `ts_` 前缀）；
- 但 `ts_finale` 的撤离 `Eff::PointsIfFlag("ts_mirror_line_3", 200)` 检索的是 **`ts_mirror_line_3`**（带前缀）——二者不匹配，导致「镜像支线 +200」结算奖励实际不触发；
- 而 `ts_finish` 结算卡判读的仍是 **`mirror_line_3`**（无前缀），卡片展示正常。
- → 建议主线合并时把 `ts_finale` 的 `PointsIfFlag` 键统一为 `mirror_line_3`（或把 `route_hope` 置位改为 `ts_mirror_line_3`），二选一对齐。本测试③只断言 `ts_archive_all`（带前缀，实现一致），不涉及此不一致，测试不受影响。

**道具 key 汇总**：`item_guard_token`(G1)/`item_gene_card`(G2)/`item_seal_pass`(G3)/`item_chushe_blood`(G4)/`item_chushe_sample`(样本)/`item_anesthetic`(麻醉剂)/`item_core_crystal`(结晶)/`item_hope_light`(残光)/`item_record_1..8`(残页)，均与场景 Choice Eff 一致。

---

## 【fight 表 tianshe_figths() · 15 条】
按层：L1 `tianshe_guard`(48)/`tianshe_hound`(42)/`cell_rioter`(45)；L2 `snake_overseer`(70)/`blood_swallower`(95)/`licker_x`(120)；miniboss `zero_proto`(230)；L3 `snake_guard`(150)/`chushe_tentacle`(130)/`rabid_guard`(170)；L4 `royal_guard`(190)/`wangxue_exp`(165)/`nest_tentacle`(175)；BOSS 阶段一 `mulaba`(360)、阶段二 `apocalypse_snake`(540)。（HP 均为引擎 Fight 数值。）

---

## 【与设计文档差异摘录】

1. **坐标体系（worlds ★差异1）**：设计 §3 区域划分表坐标两套矛盾记法（部分(y,x)部分(x,y) 且 y 越界 26 格），无法直接落地 40×26。实现（同 zhouyuan 数据模板）改为**开放式可探索地板**：房间不作实体墙封闭，以对象坐标承载区域职能，坐标按区域意图换算到 1..=38 可走格。BOSS/敌人 HP/伤害/奖励照抄设计 §4/§5。地图不再复刻设计的墙体迷宫。
2. **结算评级机制**：设计 §7.1 依赖引擎 `compute_settlement`（按支线 flag 数 ×200 评级 S/A/B/C/D）。实现 `route_finalize` 直接把 `sp_grade=Some('D')`（Route::Dyn 落地），镜像 `mirror_line_3` 与 `ts_archive_all` 的 +200 改由 `ts_finale` 撤离 `Eff::PointsIfFlag` 就地加，不并入 compute_settlement 的全局支线池——**评级固定 D，与设计按支线浮动评级不一致**（需主线合并时取舍）。
3. **阶段二 BOSS 落地为「选择驱动遭遇」**：设计 5.2 的 `apocalypse_snake` 描述为带终结技的 fight；实现 `ts_boss2_round` 为普通场景（`fight_id=None`），由 `start_snake`（Dyn）据 `fight_cfg("apocalypse_snake")` 建 Fight，HP/伤害行进走 `route_snake_attack`（重击/连击/共鸣三选项），样本共鸣 `route_snake_resonance` 直接结算胜利——不依赖引擎 `Mode::Fight` 同步，与 scenes_zhouyuan.rs 的 `b_kayako` 场景链一致。
4. **穆拉巴阶段 flag 命名**：设计用 `boss1_defeated`；实现逼退后置 `boss1_retreated`（start_snake 设）。miniboss 留存 `zero_prototype_killed`（与设计一致）。
5. **miniboss 终结技**：设计要求持 `草药麻醉剂` 免打满血；实现 `zero_proto` finisher_if=has_anesthetic，一致。
6. **阶段二倒计时**：设计「灭世蜕皮 3 回合倒计时灭团」用 `ts_boss2_wipe`（死亡 overlay，扣 300 灭团）；实现 `route_snake_attack` 在 HP<100 且无样本时推进 `ts_apoc_1/2/3`，第 3 次返回 wipe，与设计一致。
7. **幕 7 撤离门控简化**：设计主通道要求 `token_route` 或击败 2 名亲卫；实现 `ts_finale` 两选项均无条件（恒可见），撤离门控弱化为开放选择。

---

## ★ 外部依赖清单（主线合并阶段完成，本代理不触碰既有文件）

| 依赖 | 说明 |
|---|---|
| `mod scenes_tianshe;` | 库 `lib.rs` 新增模块声明（文件 `server-rs/src/scenes_tianshe.rs` 已存在） |
| `mod worlds::tianshe;` | `worlds/mod.rs` 新增 `mod tianshe;`（文件 `server-rs/src/worlds/tianshe.rs` 已存在） |
| `WORLD_TIANSHE` 常量 + 注册 | worlds/mod.rs 新增 `pub const WORLD_TIANSHE: &str = "tianshe";`，并构造 `static TIANSHE: WorldData`（floors=TIANSHE_L1..L4_MAP，points/enemies/npcs/zones/portals/gates=tianshe::同名字段，initial_scene=ts_open），加入 `WORLDS` 列表 |
| `TIANSHE_SCENES` 并入 `scenes::scene()` | scenes.rs `scene()` 增加 `or_else(|| scenes_tianshe::TIANSHE_SCENES.iter().find(...))` |
| `tianshe_figths()` 并入 `scenes::fight_cfg()` | scenes.rs `fight_cfg()` 增加 `or_else(|| scenes_tianshe::tianshe_figths().iter().find(...))`（查询辅助 `ts_fight_cfg` 也可用） |
| 复活接线 | `ts_boss2_wipe` / `ts_boss2_lose` / `ts_death` 死亡 overlay 均 button `__enter_nexus__` 回主神空间；`__enter_nexus__` 路由与主神复活由主线衔接 |
| 收敛项 | 建议把 `ts_finale` 的 `PointsIfFlag("ts_mirror_line_3")` 与 `route_hope` 置位 `mirror_line_3` 对齐（见「发现 1」） |

---

## 【BOSS 二段链与样本分支实现方式】

- **阶段一 穆拉巴（mulaba, HP360）**：标准引擎 Fight（`finisher_if = ehp<150`）→ finisher「弃战献祭 · 逼退」→ `win → ts_boss1_retreat`（演员：他撕碎蛇蜕逃向熔炉）。转场场景 `ts_boss1_retreat` → 唯一选项 `Dyn(start_snake)` → 进入阶段二。
- **阶段二 初蛇聚合体（apocalypse_snake, HP540）**：`start_snake` 从 fight_cfg 建 Fight 进 `ts_boss2_round`。回合 `route_snake_attack`（重击 28-40 / 连击 20-28）+ 幼体反击（18-30）：
  - 持样本（`item_chushe_sample`）：HP<100 时「样本共鸣」选项出现，`cond_sample_resonance`，`route_snake_resonance` 直接置 `sample_resonance` → `ts_boss2_win`；
  - 无样本：HP<100 触发「灭世蜕皮」护体（无法造成伤害），倒计时 `ts_apoc_1/2/3`，第 3 回 `ts_boss2_wipe` 灭团（死亡 overlay + 扣 300）；
  - HP 被打到 0 直接 `ts_boss2_win`（有样本且强打带样本时仍可硬杀）。

---

## 【测试清单（tests/tianshe_flow.rs · 6 用例）】

| # | 用例 | 覆盖 |
|---|---|---|
| ① | `tianshe_l1_map_reachable` | L1 地图 40 字符 / 出生点 (1,1) / 调查点可走动 / BFS 连通 |
| ② | `tianshe_main_line_boss_win` | 全主线链 → 二段战样本共鸣胜利 → 结算（points/grade/dungeon_cleared/掉落）|
| ③ | `tianshe_archive_collection` | 8 残页收集 → ts_archive_all → 结算 +200 |
| ④ | `tianshe_no_sample_shed_wipe` | 无样本 → 灭世蜕皮 3 回合倒计时灭团（含死亡档案）|
| ⑤ | `tianshe_with_sample_resonance` | 持样本 → 样本共鸣终局分支 |
| ⑥ | `tianshe_fight_table_complete` | 战斗表 15 场 id 全在 / BOSS 数值 |

---

## 待办 / 提醒
- [ ] 主线合并注册（上表外部依赖 6 项）。
- [ ] 修复「发现 1」镜线 flag 前缀不一致（`ts_mirror_line_3` vs `mirror_line_3`）。
- [ ] cargo check / test 须在主线合并后执行（本子代理不改既有文件，无法独立编译新文件；未合并编译失败为预期）。
- [ ] 设计 §7.1 的星级结算（S/A/B/C/D 按支线数）与实现的固定 `D` 级取舍需主线拍板。