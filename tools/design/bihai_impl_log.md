# bihai（无限恐怖 · 深海阴影）副本三件套 · 实现日志

> 副本身份：slug `bihai`，前缀 `bh_`；世界《无限恐怖·深海阴影》。世界展示向·克苏鲁式存在主义恐怖，
> 无真相线，开放结局。3 层：L1 深海潜水器舱 / L2 沉船残骸 / L3 海沟深渊·邪物栖息地。
> 位置：`server-rs/`（src + tests 根）。三类全新文件 + 本日志，**未改动任何既有文件**。

## 一、交付文件与行数/状态

| 文件 | 相对路径 | 行数 | 状态 |
| --- | --- | --- | --- |
| 世界静态数据 | `server-rs/src/worlds/bihai.rs` | 145 | ✅ 已落盘 |
| 剧情场景 + 战斗表 | `server-rs/src/scenes_bihai.rs` | 522 | ✅ 已落盘 |
| 集成测试 | `server-rs/tests/bihai_flow.rs` | 32 | ✅ 已落盘 |
| 本日志 | `tools/design/bihai_impl_log.md` | 54 | ✅ 已落盘 |

- 地图常量：`BIHAI_L1_MAP / BIHAI_L2_MAP / BIHAI_L3_MAP`（每行恰 40 字符，恰 26 行；已逐行校验 `len==40`）。
- `BIHAI_FLOOR_NAMES`（3 层名）。
- `POINTS`（12 个调查点）/ `ENEMIES`（每层 1 个深海异形，3 个）/ `NPCS`（每层 1 个，3 个）/
  `ZONES`（3 个：L3 1 个 fight=bh_boss + 2 个 env）/ `PORTALS`（2 个）/ `GATES`（2 个软锁）。
- 场景图 `BIHAI_SCENES`：**33 个 SceneDef**（开场 → L1 hub → 调查 → NPC → L2 hub → 调查 → NPC → L3 hub → 调查 → BOSS 铺垫 → BOSS round → 开放结局选择 → 3 结局 → 结算卡 + 死亡卡 + 2 env 机关 + 3 原生遭遇战场景）。
- 战斗表 `bihai_figths()`：**4 场**（3 原生异形战 bh_fight_l1/2/3 + 1 选择驱动 BOSS bh_boss），查询辅助 `bh_fight_cfg(id)`。

## 二、BOSS 机制（一句话）

「深渊邪物」为**选择驱动 BOSS**（黄金模板 C 段 `start_boss / boss_act / boss_win`）：HP 230、进战/狂暴由 fight
状态机接管、`boss_round` 每回合 重击/防御/（听懂低语后）「回敬深渊」三道选择，`boss_act` 结算伤害/免伤/反伤，
血量归零 → `boss_win`(+500 点、置 `bh_boss_down`、sp_grade=D) → 进入 3 分支开放结局（逃离/献祭/同化），
HP 归零致死则跳死亡档案 `bh_50_death`。

## 三、开放结局（3 分支）

1. `bh_win_escape`（逃离海沟，C 级）
2. `bh_win_sacrifice`（献祭自身换取宁静，B 级，需 `bh_whisper_heard`）
3. `bh_win_assimilate`（与邪物同化，A 级）

均可进入结算卡 `bh_42_card`；死亡统一落 `bh_50_death`（overlay `death: ("深海的拥吻", "你死于深渊的注视与水压…")`）。

## 四、★外部依赖清单（需主线合并；条数：7）

1. `server-rs/src/lib.rs`：`pub mod scenes_bihai;`
2. `server-rs/src/worlds/mod.rs`：`mod bihai;` + `WORLD_BIHAI` 常量 + `WorldData` 注册（并把 `BIHAI_L1/L2/L3_MAP` 纳入 floors）+ 可选网关。
3. `server-rs/src/scenes.rs`：`scene()` 检索扩展，追加一条 `or_else` 查 `BIHAI_SCENES`。
4. `server-rs/src/scenes.rs`：`fight_cfg()` 检索扩展，追加一条 `or_else` 查 `bihai_figths()`（或用 `bh_fight_cfg`）。
5. 素材替换：scenes_bihai 的 `bg` 全部占位（`img_zhuyuan_book.png / img_laser.png / img_corridor.png`），需按素材表替换为深海实景。
6. 新道具注册：`it_deep_key`（海渊钥匙，L2 船长室 AddItem、bh_g1 门禁 need_item、boss_win 象征归还）需在 `items_data`/道具表注册。
7. `sp_grade` 经济线 + 死亡复活接线：结局/结算按分支设 C/B/A/D 级；`bh_50_death` 复活扣 300 回主神由主线复活系统接线。

## 五、验收自检（已做）

- 所有 `Route::To("...")` 目标均为 `BIHAI_SCENES` 已定义 scene id（开场/三大 hub/boss/boss_round/end/win/card/death 全部命中）。
- 所有 `fight_id`（`bh_fight_l1/2/3`）均在 `bihai_figths()` 中；`bh_boss` 选择驱动已独立在表内且 HP==230。
- 三张地图每行 `len==40`、恰 26 行；POINTS/ENEMIES/NPCS/ZONES/PORTALS/GATES 全部坐标落在 `.`/`P`（已按生成网格逐格校验）。
- 测试仅依赖 `scenes::scene` / `scenes::fight_cfg` / `bihai_figths()`，未触及 `find_world/walkable/WorldData/spawn`。
- 未 build --release、未部署、未跑 cargo test（遵指示）。