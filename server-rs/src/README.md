# server-rs/src/ —— Rust 引擎各模块职责

本文件逐一说明 `src/*.rs` 的职责、关键类型、命名约定，以及「副本三件套」模式。所有逻辑与状态权威在 Rust 侧。

---

## 一、模块总表

| 文件 | 职责 | 关键类型/常量 |
|------|------|--------------|
| `main.rs` | **Tauri 命令层**（IPC 入口）+ 存档/死亡档案 I/O + 应用启动 | `Session(Mutex<GameState>)`；`api_*` 命令；`data_dir()` |
| `lib.rs` | **库入口**：re-export 全部 `pub mod`（集成测试与二进制共用） | — |
| `defs.rs` | **类型定义**（剧本 DSL + 数据层结构体），不存数据 | `SceneDef/FightCfg/Eff/Route/ChoiceDef/TextSpec/OverlayDef` + 数据层结构体 + re-export |
| `scenes.rs` | **总剧本调度**：`scene(id)` / `fight_cfg(id)` 分发到各 `scenes_<slug>.rs`；生化主线大剧本 | `scene()`/`fight_cfg()` or_else 链 |
| `scenes_<slug>.rs` | 每副本剧本 DSL（`<SLUG>_SCENES` 数组 + fight_cfg 条目） | `pub static <SLUG>_SCENES: &[SceneDef]` |
| `engine.rs` | **战斗引擎 / 结算 / 恢复** | `render/goto/choose/rebuild_mode/fight_turn/enemy_turn/fight_win/hud_json/fight_actions` |
| `state.rs` | **GameState 全局状态** + 存档迁移 | `GameState/Fight/Card/Mode/ZoneSession/SaveData/Weapon`；`migrate_save` |
| `worlds/` | **各副本世界数据 6 表 + 注册表** | `WorldData`/`WORLDS`/`WORLD_*`常量/`find_world`/`WorldGateway`/`GW_PORTALS` |
| `world.rs` | **开放世界逻辑**：移动/门禁/敌人/NPC/交互/视图 | `world_view/try_move/world_init/ensure_enemies/nearby_interactables/kill_enemy/switch_world` |
| `maps.rs` | **地图对象类型 + 生化（biohazard）六对象表** | `PointDef/EnemyDef/NpcDef/ZoneDef/PortalDef/GateDef` |
| `power.rs` | **动态难度缩放** | `power/power_factor/difficulty_scale/fight_scale/scaled_fight/weapon_atk` |
| `combat_data.rs` | 战斗数据表（静态） | `GENE_STAGES/BLOODLINES/CULTIVATION_STAGES/FIGHT_ITEMS/BATTLE_MODS` |
| `skills_data.rs` | 技能数据表 | `SKILLS`（146 条 `SkillDef`） |
| `items_data.rs` | 装备道具数据表 | `WEAPONS(20)/GEAR(17)/ITEMS(30)/RECIPES(8)/TRESURE_DEFS` |

---

## 二、关键类型（defs.rs —— 剧本 DSL）

### 表驱动：`FightCfg`（战斗配置，数值=基准值，不直接被引擎改）

```rust
pub struct FightCfg {
    name, hp, dmg:(i32,i32), reward, reward_why, intro,
    rage_at: Option<i32>, rage_text,
    on_rage: fn(&mut GameState,&mut Vec<String>),
    finisher_if: fn(&GameState,i32)->bool, finisher_name, finisher_desc,
    win: fn(&GameState)->String,
    death: &'static str,
}
```
> **重要**：`FightCfg` 表里的数值是**难度系数 1.0 时的基准值**（不改表），只在实例化 `Fight` 时经 `power::scaled_fight` 按 `scale = D × P` 缩放（hp/dmg/reward/rage_at 三者同乘）。

### `SceneDef`（剧情节点）

```rust
pub struct SceneDef {
    id, bg: Option<&str>, loc, mood, speaker, voice,
    text: TextSpec,            // Static(&[str]) 或 Dyn(fn(&GameState)->String)
    choices: &[ChoiceDef],
    fight_id: Option<&str>,    // 引用 FightCfg id
    video: Option<&str>, cine_label, overlay: Option<OverlayDef>,
}
```

### `Eff`（选择副作用枚举）

```rust
pub enum Eff {
    SetFlag(&str), San(i32), Points(i32), PointsIfFlag(&str,i32),
    KillTeam(&str), Hurt(i32, death_route), Weapon(Weapon),
    AddItem(&str), MarkPoint(&str),
}
```
(`apply()` 统一应用副作用；`Hurt` 归零 → `pending_death` 死亡场景)

### `Route`（跳转目标）

```rust
pub enum Route { To(&str), Dyn(fn(&mut GameState)->String) }
```

### 数据层结构体（combat/skills/items）

- 基因锁 `GeneStageCfg`（4 阶）、血统 `BloodlineDef`/`BloodlinePassive`（9）
- 敌人修饰 `BattleMods`（weak_fire/weak_electric/armor/regen/aura/post_kill/waves/no_dodge）
- 技能 `SkillDef`（`SKILLS` 146：
  `SkillSchool` Wushu|Gene|Blood|Holy|Tech|Nt|Meme|Util|Xiu；`SkillEffect` Striking|SelfBuff|DebuffEnemy|Passive；`SkillCost` None|Qi|Item）
- 修真 `CultivationStageCfg`（7 阶练气~合道，`StagePassive` 含 ignore_death 挡必死）
- 装备 `WeaponDef/WeaponSlot/WeaponSpecial`、`GearDef/GearSlot`（Armor|Accessory|Treasure）、`Equipment`（weapon/armor/accessory/treasure[3]）、`TreasureDef`
- 道具 `ItemDef/ItemEffect/ItemSub`；战斗道具 `FightItemEffect`；合成 `Recipe`

---

## 三、关键类型（state.rs —— 运行期状态）

### `GameState`（唯一权威状态，serde 持久化）

核心字段：`hp/san/points/weapon/ammo`、`flags/dead_team`、`scene_id/fight/zone`、开放世界 `px/py/floor`、地图 `map_objs/enemies_alive`、轮回记忆 `explored`、多世界 `world_id/world_states/save_version`、兑换与强化（`sp_grade/str_bonus/agi_bonus/bloodline`）、战斗体系（`gene_stage/qi/qi_max/inner_art/tech_shield/cultivation_stage/treasures/sect/skills/equipment`）、动态难度 `scaling_enabled`。

- 非持久（`#[serde(skip)]`）：`mode/pending_death/settle_total/settle_rank`（`Mode: Normal|Fight|AwaitCard(Card)`）。
- 所有持久增强字段均 `#[serde(default)]`，旧档天然可读；`save_version` + `migrate_save()` 幂等迁移 v1→v2/v3（R7 基因锁一档迁移：`gene_lock&&gene_stage==0 → gene_stage=1`）。

### 其他

- `Fight` 战斗实例（运行时实例，由 `scaled_fight` 产出）
- `Card` 覆盖层卡片（死亡/结算/基因锁演出；`title/good/body_html/buttons[(label,route)]/voice`）
- `ZoneSession` 3D 副本会话（`zone_id/kind(fight|puzzle)/ref_id/zx/zz/zyaw/zhp/progress/last_action`）
- `WorldRuntime` 非活跃世界快照
- `Weapon` 枚举（Axe 消防斧 / Gun 9mm手枪 / Sword 军刀）——与装备格 `WeaponSlot` 旁附共存，旧 `Weapon` 为兼容保留

---

## 四、关键类型（worlds/ —— 世界数据 6 表）

### `WorldData`（每副本世界静态配置）

```rust
pub struct WorldData {
    id: &str, name: &str, difficulty: u8,      // 1..5（power.rs 查 difficulty_scale）
    initial_scene: &str,                        // 入场场景 id
    floors: &[&[&str]], floor_names: &[&str],  // 每层 ASCII 40×26 图
    points: &[maps::PointDef], enemies: &[maps::EnemyDef],
    npcs: &[maps::NpcDef], zones: &[maps::ZoneDef],
    portals: &[maps::PortalDef], gates: &[maps::GateDef],
}
```

六张表（分别数组）。常量：`WORLD_<SLUG>`、`WORLDS: &[&WorldData]`（54 项）、`GW_PORTALS`（跨世界网关）、`find_world(id)`。

### 跨世界网关 `WorldGateway`

`{ id("gw_*"), from_world, floor, x, y, to_world, to_floor, tx, ty, available }` —— 主神空间 `GW_PORTALS` 打通到各副本落点（`available=true` 可交互，`false` 占位）。

---

## 五、动态难度缩放（power.rs）—— 数值即铁律

- **主角强度** `power(st) = hp/20 + 武器攻击 + 基因锁阶×8 + 修真境界×6 + 装备攻击 + min(技能数,20)`
- **强度因子** `power_factor = clamp(power/25, 0.6, 4.0)`
- **副本难度系数** `difficulty_scale(d)`：`1→0.8, 2→1.0, 3→1.3, 4→1.6, 5→2.0`，其余回退 1.0
- **整体缩放** `fight_scale = D(副本难度) × P(主角强度)`；**`scaling_enabled==false` 时恒 1.0**（测试安全阀）
- `scaled_fight(id, cfg, st, pending_log)` 用 `fight_scale` 缩放 FightCfg → 实例化 `Fight`（hp/max_hp/dmg/reward/rage_at 同乘）
- San 惩罚 / 环境伤害不缩放（场景机制，非敌人强度）

---

## 六、命名约定（全局铁律）

| 类别 | 规则 | 例 |
|------|------|-----|
| 世界 slug | 小写英文，文件名 = slug | `moshi`、`zhouyuan`、`xingjijianchuan` |
| 世界常量 | `WORLD_<SLUG>`（SLUG 全大写） | `WORLD_MOSHI` |
| 世界数据模块 | `worlds/<slug>.rs`（`mod <slug>;`） | `worlds/moshi.rs` |
| 剧本模块 | `scenes_<slug>.rs`（lib.rs `pub mod scenes_<slug>;`） | `scenes_moshi.rs` |
| 场景/物品 id | 带世界前缀 `prefix_` | 调查点 `ms_pt_1`、BOSS `ms_e_1`、副本入口 `gw_moshi` |
| 剧本数组 | `pub static <SLUG>_SCENES` | `MOSHI_SCENES` |
| 本地图文件 | `<prefix>_F<层>_MAP` / `<SLUG>_FLOOR_NAMES` | `MOSHI_F1_MAP` |
| 对象表 | 每世界模块内 `POINTS/ENEMIES/NPCS/ZONES/PORTALS/GATES` | `blocks::POINTS` |
| 注册文件 | `worlds/<slug>.rs` + `scenes_<slug>.rs` + `tests/<slug>_flow.rs` | 三件套 |

---

## 七、副本三件套模式（开新副本的核心）

每个副本世界 = **一条三文件链路 + 多步注册**：

```
① src/worlds/<slug>.rs       世界 6 表（走 gen_dungeons 模板）
② src/scenes_<slug>.rs       剧本 DSL（<SLUG>_SCENES + fight_cfg）
③ tests/<slug>_flow.rs       该副本集成测试
+ 注册：
   src/lib.rs                    → pub mod scenes_<slug>;
   src/worlds/mod.rs             → mod <slug>; + WORLD_<SLUG> + WorldData 静态 + WORLDS 数组 + GW_PORTALS 网关
   src/scenes.rs                 → scene()/fight_cfg() 追加 .or_else(|| scenes_<slug>::…)
```

> 自动化：`tools/gen_dungeons.mjs` 从 `D` 表 + `templates/demo_*.rs` 生成三件套骨架（跳过已存在）；`tools/gen_register.mjs` 批量写 lib.rs / worlds/mod.rs / scenes.rs 注册。二者不能全自动（GW_PORTALS 字段、fight_cfg or_else 需手工补），跑完必 `cargo check --all-targets` 引导修复。完整流程见 `docs/DEVELOPMENT.md`。

---

## 八、测试目录（tests/）

- `*_flow.rs`：按副本的端到端流程（每副本一个）。
- `*_test.rs`：系统专项——`craft`（合成）/`equipment`（装备强化）/`bloodline`/`exchange`（兑换）/`dynamic_scaling`（动态难度回归）/`all_panels`（全面板）/`all_upgrades`（全强化条目）/`all_worlds_interaction`（全副本交互遍历）/`characters`（人物）/`playthrough`（通关）/`migrate_save`（存档迁移）/`debug_laser` 等。

> 动态难度测试安全阀：`GameState::new_no_scaling()`（`scaling_enabled=false`）保证既有 flow 数值回归全绿。
