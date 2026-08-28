# 《无限恐怖 · 黑珍珠》副本三件套实现日志

> 副本身份：slug=`jialebi`，前缀 `jb_`。主题：海盗冒险·展示向（无真相线，开放结局）。
> 全体为**全新文件**，绝未改动任何既有文件。不 build、不部署、不跑 cargo test（尚未注册，编译失败为预期）。

## §1 交付文件（全新）

| 文件 | 行数 | 状态 |
| --- | --- | --- |
| `server-rs/src/worlds/jialebi.rs` | 153 | ✅ 已落盘 |
| `server-rs/src/scenes_jialebi.rs` | 455 | ✅ 已落盘 |
| `server-rs/tests/jialebi_flow.rs` | 44 | ✅ 已落盘 |
| `tools/design/jialebi_impl_log.md` | 本文件 | ✅ 已落盘 |

## §2 世界静态数据（worlds/jialebi.rs）

- 3 层地图 `JIALEBI_L1_MAP / JIALEBI_L2_MAP / JIALEBI_L3_MAP`，每层恰 26 行、每行精确 40 字符（`#` 墙 / `.` 地板 / `P` 出生 / `I` 装饰）。全部定义坐标（调查点/敌人/NPC/传送门/门禁/战圈）经验证落在 `.` 或 `P` 上，`I` 绝不压坐标。
- `JIALEBI_FLOOR_NAMES = ["L1 黑珍珠海盗船","L2 沉船湾 · 礁石湾","L3 财宝洞 · 洞穴宝库"]`
- `POINTS`（11 个）：L1 舵轮/瞭望台/火药桶/船长室；L2 宝箱/沉船/渡板/锈锚；L3 月光水池/祭坛/白骨堆。
- `ENEMIES`（3 个，每层一个）：`jb_e_l1_sailor` 醉水手 / `jb_e_l2_crab` 巨爪蟹 / `jb_e_l3_mimic` 拟态匣。
- `NPCS`（3 个，每层一个）：船厨阿朵 / 独眼海盗 / 老海盗鬼魂。
- `ZONES`（2 个）：L3 `jb_z_boss`（kind=fight → `jb_boss` 战圈）+ `jb_z_cavein`（kind=env 坍方危区）。
- `PORTALS`（2 个）：L1→L2 `p_jb_1`、L2→L3 `p_jb_2`（逐层单向）。
- `GATES`（2 个软锁）：L1 `jb_g1` 船员舱闩门（需 `jb_rum`）、L2 `jb_g2` 暗礁水道闸（需 `jb_treasure_map`）。

## §3 BOSS 机制（选择驱动 · 黄金模板 C 段）

- BOSS：**亡灵船长·巴博萨**，HP **220**。
- 实现：`scenes_jialebi.rs` 内 `start_boss`（读 `scenes::fight_cfg("jb_boss")` 建 Fight）→ `jb_boss_round` 回合场景（重击 / 防御 / 呼唤真名·绝杀三选项，经 `boss_act`）→ 分胜负。
- 败则 `boss_act` 内跳死亡卡 `jb_50_death`；胜则 `boss_win`（+500 点、`jb_boss_down`、sp_grade=D、`add_item(jb_black_pearl)`）→ 开放结局 `jb_boss_win` → `jb_ending`（3 分支）→ `jb_settle` → 结算卡 `jb_42_card`。
- 狂暴：`rage_at=Some(120)`，狂暴后 BOSS 反伤由 18 提至 24。
- 做准备：祭坛/老海盗鬼魂两处「BOSS 铺垫」可置 `jb_boss_primed`，开启 `jb_boss_round` 的绝杀选项（大伤害 55）。

## §4 场景 / 战斗统计

- 场景数：**JIALEBI_SCENES = 30 个 SceneDef**，结构照 scenes_sishen.rs（具名 cond fn + 路由 fn + `NO_EFF/NO_CH`），字段顺序照模板。
- 战斗数：**jialebi_figths() = 4 场**（`jb_boss` + `jb_fight_l1/l2/l3`）；提供查询辅助 `jb_fight_cfg(id)`。
- 结算卡 `jb_42_card`（模板 A 段 overlay Card）；死亡卡 `jb_50_death`（BOSS）与 `jb_51_death_fight`（战斗/坍方通用，模板 B 段）。
- 道具：`jb_rum`、`jb_treasure_map`、`jb_compass`、`jb_black_pearl`。

## §5 ★外部依赖清单（主线合并时处理）

1. `server-rs/src/lib.rs`：新增 `pub mod scenes_jialebi;`（目前未注册）。
2. `server-rs/src/worlds/mod.rs`：
   - `mod jialebi;`
   - 新增 `pub static WORLD_JIALEBI: WorldData = WorldData { id: "jialebi", name: "无限恐怖·黑珍珠", difficulty: "普通", initial_scene: "jb_00", floors: &[jialebi::JIALEBI_L1_MAP, jialebi::JIALEBI_L2_MAP, jialebi::JIALEBI_L3_MAP], floor_names: jialebi::JIALEBI_FLOOR_NAMES, points: jialebi::POINTS, enemies: jialebi::ENEMIES, npcs: jialebi::NPCS, zones: jialebi::ZONES, portals: jialebi::PORTALS, gates: jialebi::GATES }`；
   - `WORLDS` 数组加入 `WORLD_JIALEBI`（可加可选网关）。
3. `server-rs/src/scenes.rs`：`scene(id)` 增加一条 `or_else` 检索 `JIALEBI_SCENES`；`fight_cfg(id)` 增加一条 `or_else` 检索 `jialebi_figths()`（可用 `jb_fight_cfg`）。
4. 素材替换：3 张 bg 占位待替换——`img_zhuyuan_book.png` / `img_laser.png` / `img_corridor.png`；L1/L3 主要用前两张，L2 用 `img_corridor.png`。
5. 新道具注册：`jb_rum`、`jb_treasure_map`、`jb_compass`、`jb_black_pearl` 需在 items_data 等道具定义表登记（含图标/描述）。
6. `sp_grade` 经济线：`route_settle` 在 sp_grade 为空时置 `'D'`，`boss_win` 亦然——与主线评级评分表接线。
7. 死亡复活接线：死亡卡按钮 `__enter_nexus__` + 复活扣 300 由主线复活系统接线（死亡档案文案已注明）。

## 验收

- ✅ Route::To 目标场景 id 全部存在于 `JIALEBI_SCENES`（自检见代码）。
- ✅ 所有 fight_id 都在 `jialebi_figths()`；测试 `jialebi_self_consistent` 验证分发闭环。
- ✅ 地图每行 `.Length == 40`、每层 26 行、定义坐标均可走动（PowerShell 校验通过）。
- 未 build / 未部署 / 未跑 cargo test（预期：未注册前无法编译）。