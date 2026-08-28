# 副本实现日志 · 沉没神殿（shenmiao）

> 副本子代理交付物落盘点。
> 世界 id：`shenmiao`；常量 `WORLD_SHENMIAO="shenmiao"`；场景/敌/道具前缀：`sm_`。
> 挂载点：项目根 `C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1`。
> 主题：海底/异位面沉没神殿，结构颠倒，旧神眷属。钩子「这里的水是倒着流的。」三层 40×26。

## 交付文件（全新，未改动任何既有文件）

| 文件 | 行数 | 说明 |
|------|------|------|
| `server-rs/src/worlds/shenmiao.rs` | ~200 | 三层地图（F1 逆流之涡 / F2 颠倒回廊 / F3 沉眠神龛）+ POINTS/ENEMIES/NPCS/ZONES/PORTALS/GATES 六表 + gate_at/gate_by_id/tile/walkable/spawn 辅助 |
| `server-rs/src/scenes_shenmiao.rs` | ~600 | `SHENMIAO_SCENES` 27 个场景 + `shenmiao_figths()` 6 场战斗 + BOSS 相位闪现逻辑 + 查询辅助 |
| `server-rs/tests/shenmiao_flow.rs` | ~110 | 3 个确定性用例 |
| `tools/design/shenmiao_impl_log.md` | 本文件 | 验收清单 |

## 场景清单（scenes_shenmiao.rs，id 全 `sm_`）

序、F1/F2/F3 各 hub + 调查点 + 遭遇 + 门禁/BOSS + 结局卡片 + 死亡档案，共 27 个场景：
`sm_00, sm_10_f1, sm_11_vortex, sm_12_pillar, sm_13_whisper, sm_14_pool, sm_15_fight, sm_16_gate,`
`sm_20_f2, sm_21_ceiling, sm_22_echo, sm_23_fall, sm_24_fight, sm_25_npc, sm_26_enter_f3,`
`sm_30_f3, sm_31_basilica, sm_32_eye, sm_33_bones, sm_34_fight, sm_35_boss, sm_35_boss_round,`
`sm_36_win, sm_37_ending, sm_40_card, sm_50_death`

自检：`Route::To` 目标 21 条全部命中已定义场景；`fight_id: Some(...)` 三处（sm_current_shade / sm_inverted_servant / sm_god_sludge）均已列入 `shenmiao_figths()`。战斗 `win` 都路由到已存在 hub/se 场景。

## 战斗表 `shenmiao_figths()`

| id | 名称 | HP | dmg | reward |
|----|------|----|----|--------|
| sm_current_shade | 逆流之影 | 34 | (6,10) | 14 |
| sm_drowned_priest | 溺行祭司 | 48 | (9,15) | 20 |
| sm_inverted_servant | 倒影侍从 | 56 | (10,16) | 24 |
| sm_faceless_statue | 无面石像 | 70 | (12,19) | 30 |
| sm_god_sludge | 旧神唾沫 | 66 | (11,18) | 28 |
| sm_oldgod_spawn | 旧神眷属（BOSS） | **200** | (14,22) | 300 |

## BOSS 机制：旧神眷属 · 相位闪现（选择驱动，确定性）

- 血量存 `st.fight`（`start_spawn` 在 `sm_35_boss` 的 `Route::Dyn` 初始化，引用 `sm_oldgod_spawn` 的 FightCfg，hp=max_hp=200）。
- 每回合 4 个选择，**固定数值、无 rand，保证测试确定性**：
  - **重击**：实相落刀，固定 34 伤；未狂暴时挨 16 反击。
  - **虚相追斩**：固定 46 伤（伤害更高）。
  - **以祭器破相**（cond=持有 `it_shenmiao_reliquary`）：固定 60 伤，必中压境。
  - **防御**：本回合免伤。
- **狂暴（相位失序）**：回合首判定 `hp<=90` → `f.raged=true`；狂暴后任何主动出招都会被反噬 26，仅防御可免。finisher 条件：狂暴态 + 持祭器（可直接钉入虚相）。
- 胜：`spawn_win` → 加 `it_shenmiao_ash`、+300 分、置 `sm_spawn_dead`、`sp_grade='S'` → `sm_36_win`。
- 死：`sm_50_death`（倒流之海溺亡档案，复活扣 300 点由主线接线）。

确定性推演（供测试）：`重击`=34 → 200→166→132（中间插一次 `防御` 免伤）→98→64（仍未狂暴，因 rage 在回合首判）→ 下回合首判 **64≤90 → 狂暴=30** →再一 `重击` → 0 胜。玩家 HP 设 2000 时累计反噬 ≤116，安全。

## ★外部依赖清单（主线合并必须做，否则无法编译/运行）

1. `server-rs/src/lib.rs`：加 `pub mod scenes_shenmiao;`。
2. `server-rs/src/worlds/mod.rs`：
   - `pub mod shenmiao;`（mod 声明）
   - 定义 `pub const WORLD_SHENMIAO: &str = "shenmiao";`
   - 组装并注册 `static SHENMIAO: WorldData = WorldData { id: WORLD_SHENMIAO, name: "旧神遗迹·沉没神殿", difficulty: …, initial_scene: "sm_00", floors: [SHENMIAO_F1_MAP…], floor_names: SHENMIAO_FLOOR_NAMES, points: worlds::shenmiao::POINTS, enemies: …, npcs: …, zones: …, portals: …, gates: … }`，加入 `WORLDS` 数组；需要时接网关。
3. `server-rs/src/scenes.rs`：在 `scene()` 的 or_else 链加 `SHENMIAO_SCENES`（或 `shenmiao::…` 检索）；`fight_cfg()` 加 `shenmiao::shenmiao_figths()` 检索。
4. 道具 id（需在 items 数据里存在或由主线定义）：`it_shenmiao_reliquary`（旧神祭器，开 `gate_sm_invert`/破相用）、`it_shenmiao_ash`（旧神残灰，BOSS 掉落）。`Eff::AddItem` 引用了它们。
5. 图片占位：scenes 里 bg 均复用既有图（img_laser/img_redqueen/img_zhuyuan_book.png）占位；新美术由主 agent 统一生图替换。
6. 测试：`server-rs/tests/shenmiao_flow.rs` 依赖以上注册，**合并后运行**；运行方式同其它副本 test。

## 结构自检结论
- 所有 `Route::To` 目标均为已定义 scene id ✓
- 所有 `fight_id` 均存在于 `shenmiao_figths()` ✓
- 三张地图均 26 行 × 40 列；POINTS/ENEMIES/NPCS/ZONES/PORTALS/GATES 坐标均在地图内且可走（`tile != '#'`）✓
- 出生点 `P` 位于 F1 (2,22)，`spawn()` 会正确找到 ✓
- 门禁 `gate_sm_invert`（F2, 需 `it_shenmiao_reliquary`）可开 → `sm_16_gate` 剧情 ✓

## 测试用例（tests/shenmiao_flow.rs）
1. `shenmiao_map_reachable`：三层、行宽 40、出生点/调查点/传送门落点可走。
2. `shenmiao_dispatch_wired`：`scenes::scene("sm_00")/("sm_37_ending")/("sm_40_card")`、`fight_cfg("sm_oldgod_spawn")` 可解析。
3. `shenmiao_boss_deterministic`：拾祭器→开倒置门环→F2→F3→直面眷属→7 回合重击/防御击败→狂暴断言→安魂→`Mode::AwaitCard` + `sp_grade`。