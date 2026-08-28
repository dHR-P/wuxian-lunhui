# 木乃伊 · 哈姆纳塔地宫 副本实现日志

> 世界 slug：`mumiyi`（世界 id 常量 `WORLD_MUMIYI="mumiyi"`，由主线注册）
> 设计依据：`design/zhttty_universe/00_INDEX_EXPANSION.md` §1.1 第 40 行 + `wuxian_kongbu/00_wuxian_kongbu_research.md` §4.5
> 模型：`tokenrhythm/deepseek-v4-flash-0731`
> 本子代理只写全新文件，不修改任何既有文件；不部署、不 `build --release`。

---

## 一、产出文件与行数

| 文件 | 行数 | 内容 |
|---|---|---|
| `server-rs/src/worlds/mumiyi.rs` | 155 | 3 层地图（F0 地宫入口/F1 圣甲虫厅/F2 祭司墓室，40×26）+ POINTS/ENEMIES/NPCS/ZONES/PORTALS/GATES 静态表 |
| `server-rs/src/scenes_mumiyi.rs` | 673 | `MUMIYI_SCENES`（**25 个场景** id 全 `mm_` 前缀）+ `mumiyi_figths()`（**6 场战斗** id 全 `mm_` 前缀）+ `mumiyi_fight()` 查询辅助 |
| `server-rs/tests/mumiyi_flow.rs` | 172 | **4 个集成用例**（地图可达 / 主线链→伊莫顿二阶段→弱水封棺 / 宝藏掉落 / 战斗表完整性） |

三文件合计 **1000 行**。

### 25 场景清单（mm_ 前缀）

考古营地交付（1）→ F0 入口（7）→ F1 圣甲虫厅（6）→ F2 祭司墓室（5）→ 伊莫顿三段战（3+复生）→ 结局（3）→ 战（2）。
核心链：`mm_00_camp → mm_01_arrive → mm_03_stele(取钥) → mm_07_gate_scarab(机关门) → mm_10_arrive_f1 → mm_12_well(取弱水)/mm_13_hollow(取圣甲虫匣) → mm_15_gate_tomb(封印墓门) → mm_20_sarc_room → mm_21_open_sarc(开棺) → mm_22_curse(诅咒苏醒) → mm_23_imhotep1(一段) → mm_24_reborn(复生二段) → mm_25_imhotep2(二段) → mm_27_win(封棺胜利) → mm_28_escape(逃离结局)`；败北 `mm_29_lose`。

### 6 场战斗（mm_ 前缀）

`mm_scarab_swarm_light`(27) / `mm_scarab_swarm`(40, rage 圣甲虫潮增员) / `mm_mummy_guard`(48) / `mm_mummy_sentinel`(60) / `mm_imhotep`(HP 210, rage@105) / `mm_imhotep2`(HP 120, rage@60)。

---

## 二、核心机制实现

### 2.1 伊莫顿二阶段（复生）
「选择驱动的遭遇链」实现（参考 `scenes_zhouyuan.rs` 黑发领域 zy_boss_round）：
- 一段 `mm_23_imhotep1`：`Route::Dyn(route_imhotep1_atk)` 每回合扣 BOSS 血（rng 14–24）；
  敌 HP 归零置 `mm_imhotep1_down` → **转场** `mm_24_reborn`（复生演出场景）。
- `mm_24_reborn` 选「再次迎向复生之躯」→ `route_start_imhotep2` 重置 Fight 为复生体 `mm_imhotep2`（HP120）→ `mm_25_imhotep2`。
- 二段攻击 `route_imhotep2_atk`（rng 12–20，每回 San-4 胁迫）；敌 HP 归零 → `mm_27_win` 并写 `sp_grade = Some('C')`。
- 同时导出 `mm_imhotep`/`mm_imhotep2` 两张 FightCfg 供 ZONES 引擎直战复用（win 回 mm_24_reborn / mm_27_win）。

### 2.2 弱水终结技前置（`finisher_if` + Route::Dyn）
- 前置道具 `it_mumi_water`（尼罗弱水），在 `mm_12_well` 以 `Eff::AddItem` 取得。
- 二段场景条件选项「以尼罗弱水终结」`cond: cond_has_water` → `route_imhotep2_water`：强制 `f.hp=0`、`mm_water_finish`、`sp_grade=C` → `mm_27_win`。
- 引擎 FightCfg 也配 `finisher_if: mm_finisher_water`（持有弱水才可终结），供 ZoneDef 战斗判定。
- 一段弱水祭炼 `mm_imhotep1_water`：强伤害但不终结（一段必复生，剧情保障）。

### 2.3 圣甲虫潮增员
- 地图敌人换色复用：`horde→圣甲虫潮`（`mm_scarab_swarm*`）、`zombie→木乃伊战士`（`mm_mummy_*`）。
- BOSS 狂暴 `on_rage: mm_rage_scarab` 叙事「虫潮自墙缝涌出」；狂暴期间每回 San-5 胁迫（用场景数据落地，引擎无助调）。

### 2.4 宝藏多掉落
- 宝藏点 `PointDef.route` 指向场景，由场景 `Eff::AddItem` 多掉落：
  - `mm_06_box_a`（F0 石匣）：`it_mumi_loot_gold` + `it_mumi_amulet`（+120 点数）
  - `mm_14_vault`（F1 宝库供案）：`it_mumi_loot_gem` + `it_mumi_trinket`（+150 点数）
  - `mm_27_win` 结算额外 +800。

### 2.5 sp_grade
击杀伊莫顿（二段任一胜利路径）写 `st.sp_grade = Some('C')`（每段路由 route_imhotep2_atk / route_imhotep2_water 均写）。

---

## 三、★外部依赖清单（主线合并阶段必须处理）

| # | 依赖 | 说明 |
|---|---|---|
| 1 | `worlds/mod.rs` 注册 `WORLD_MUMIYI = "mumiyi"` + 构造 `WorldData{ floors:&[MUMIYI_F0_MAP,F1,F2], floor_names:MUMIYI_FLOOR_NAMES, points:MUMIYI_POINTS, enemies:MUMIYI_ENEMIES, npcs:MUMIYI_NPCS, zones:MUMIYI_ZONES, portals:MUMIYI_PORTALS, gates:MUMIYI_GATES }`，并 `.expect("木乃伊世界已注册")`。 | `worlds::find_world("mumiyi")` 与测试依赖 |
| 2 | `worlds/mod.rs` 的 `GW_PORTALS` 增 `gw_mumiyi` 网关（主神→木乃伊，落点=F0 出生 P(19,22)），`available:true`。 | 进入副本入口 |
| 3 | `worlds/mod.rs` 顶部 `mod mumiyi;` | 可见性 |
| 4 | `lib.rs` 加 `pub mod scenes_mumiyi;` | 导出场景/战斗/测试引用 |
| 5 | `scenes.rs` 的 `scene(id)` 与 `fight_cfg(id)` 合并检索 `MUMIYI_SCENES` / `mumiyi_figths()`。 | `engine::goto/choose` 解析 mm_\* 场景，`pick()` 用 `scenes::scene` |
| 6 | 素材替换（待主线生图）：bg 当前占位 `img_zhuyuan_book.png`(F0)/`img_laser.png`(F1)/`img_redqueen.png`(F2) → 目标 `mm_bg_entrance`/`mm_bg_scarab`/`mm_bg_tomb`。 | scenes_mumiyi.rs 头部以注释标注 |
| 7 | 敌人立绘复用声明：horde→圣甲虫潮、zombie→木乃伊战士（无新立绘，BOSS 新美术由主 agent 统一替换）。 | 复用 |
| 8 | 门禁物品/flag 命名（主线应避免重名普查）：物品 `it_mumi_key`/`it_mumi_water`/`it_mumi_scarab_sac`/`it_mumi_loot_gold`/`it_mumi_loot_gem`/`it_mumi_trinket`/`it_mumi_amulet`；flag `mm_*`；`GateDef`: `mm_gate_scarab`/`mm_gate_tomb`。 | 命名一致性 |

---

## 四、测试清单（tests/mumiyi_flow.rs，4 用例）

| # | 用例 | 断言 |
|---|---|---|
| 1 | `mumiyi_map_reachable` | 三层每行 40 字符；出生 P(19,22)；各点/传送门起点可走动（`worlds::walkable`） |
| 2 | `mumiyi_main_line_imhotep2_water_seal` | 全主链 step 走到门户，密钥/弱水/圣甲虫匣齐备；伊莫顿一段循环击倒→mm_24_reborn→复生二段→弱水终结→mm_27_win→`sp_grade=Some('C')`→`mm_end_seal`→mm_28_escape |
| 3 | `mumiyi_treasure_drops` | `mm_06_box_a` 得 gold+amulet+120；`mm_14_vault` 得 gem+trinket+150 |
| 4 | `mumiyi_fight_table` | 6 场齐备；Imhotep HP210/rage@105/reward700、Imhotep2 HP120；弱水终结前置（无弱水不可终结 / 持有弱水可终结） |

> 注：用例 2/3 依赖第 1 节外部依赖合并完成后才能编译通过（与既有 jiguancheng/juluoji 测试同约定——合并阶段生效）。

---

## 五、如实汇报

- **已完成**：worlds（155）+ scenes（673）+ tests（172）+ 本日志；地图逐行 40 字符已用脚本全量校验（0 违规），全部 table 坐标均落在非 `#` 可走格（vault 坐标曾踩墙，已从 (29,22) 修正到 (26,23)）。
- **未做**：未修改任何既有文件；未部署；未 `build --release`。scenes 内含两个已知可交付点（sp_grade 二段两条胜利路径均已写 Some('C')、cine_label 错值已修正）。
- **风险提示**：测试需主线先完成外部依赖合并方可通过编译；若地图行走性另有 path 级约束（引擎可能要求连通），F0 中部带空隙横墙设计需在合并后按引擎实际规则复核。