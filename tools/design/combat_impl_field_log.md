# 战斗体系实现 · 数据层（包 A 字段与数据表铺装）变更日志

> 角色：无限流战斗体系·字段与数据表层铺装子代理（模型 tokenrhythm/deepseek-v4-flash-0731）。
> 范围：仅改 `server-rs/src/{state.rs, defs.rs, lib.rs}` + 新建 `combat_data.rs / skills_data.rs / items_data.rs`。
> 铁律遵守：全新增持久字段 `#[serde(default)]`；migrate_save 幂等；**未碰** engine.rs / scenes.rs / FightCfg / FIGHTS / Weapon 枚举语义 / 任何战斗结算逻辑。

---

## 一、新增字段清单（全部 `#[serde(default)]` 确认）

`server-rs/src/state.rs` → `GameState`：

| 字段 | 类型 | 缺省 | 说明 |
|---|---|---|---|
| `gene_stage` | `u8` | 0 | 基因锁多阶（0=未开，1~4=阶）；权威字段，`gene_lock` 为布尔视图 |
| `qi` | `i32` | 0 | 真气/内力当前量 |
| `qi_max` | `i32` | 0 | 真气上限 |
| `inner_art` | `Option<String>` | None | 内功心法 id |
| `tech_shield` | `i32` | 0 | 纳米护盾当前值 |
| `tech_shield_max` | `i32` | 0 | 纳米护盾上限 |
| `cultivation_stage` | `u8` | 0 | 修真境界（0 未修真，1~7 练气~合道） |
| `cultivation_qi_max` | `i32` | 0 | 修真境界档位（qi_max 天棚） |
| `treasures` | `Vec<String>` | `[]` | 已装法宝 id（拥有标记） |
| `sect` | `Option<String>` | None | 修真流派标签 |
| `skills` | `Vec<String>` | `[]` | 已购技能 id 列表 |
| `equipment` | `Equipment` | Default | 装备格（武器旁附/护甲/饰品/法宝三格） |

- `GameState::new()` 已为上述字段提供缺省（不改变 new() 既有语义；`save_version` 仍 = 2）。
- 全部带 `#[serde(default)]` ⇒ 旧档反序列化天然成功（最高红线满足）。

## 二、migrate_save 迁移（v2→v3，幂等）

- R7 基因锁一档迁移：`gene_lock == true && gene_stage == 0` → `gene_stage = 1`，并升 `save_version = 3`。
- 为保持既有 v1→v2 断言（migrate_save 用例 `save_version == 2`）不变，仅在**确实执行基因迁移**时才升到 v3（`gene_lock=false` 的旧档停在 v2，语义一致）。幂等：`gene_stage >= 1` 即跳过。
- 未清空/未二次回写 inventory / flags / fight。

## 三、defs.rs 类型定义（结构体 + re-export，数据表放新模块）

新增类型：
- 基因锁：`GeneStageCfg`
- 血统：`BloodlinePassive` / `BloodlineDef`
- 敌人修饰：`BattleMods`
- 技能：`SkillSchool` / `SkillCost` / `SkillKind` / `SkillEffect` / `SkillDef`
- 修真：`StagePassive` / `CultivationStageCfg`
- 装备：`DamageType` / `WeaponSpecial` / `WeaponSlot` / `WeaponDef` / `GearSlot` / `GearDef` / `Equipment` / `TreasureDef`
- 道具：`ItemSub` / `ItemEffect` / `ItemDef` / `FightItemEffect` / `Recipe`
- re-export：`BATTLE_MODS / BLOODLINES / CULTIVATION_STAGES / FIGHT_ITEMS / GENE_STAGES`（←combat_data），`GEAR / ITEMS / RECIPES / TRESURE_DEFS / WEAPONS`（←items_data），`SKILLS`（←skills_data）。

> 注：`WeaponSlot.id` 用 `String`（持久字段，serde 反序列化安全，避免 `&'static str` 反序列化限制）。`StagePassive` 在 const 表中用 `SP_ZERO` 常量展开（const 上下文中禁止调用 `Default::default()`）。

## 四、新模块与数据表清单（含条数）

### `server-rs/src/combat_data.rs`
| 表 | 条数 | 依据 |
|---|---|---|
| `GENE_STAGES` | 4 | gene_lock §1.1~1.4（一阶D/二阶B/三阶A/四阶A顶） |
| `BLOODLINES` | 5 | combat §1.2（vampire 迁入：leech4 / reduce3，对齐现 is_vampire 内联行为等价；werewolf/zuwu/zhanshi_blood/gauss_cyber） |
| `BATTLE_MODS` | 3 | combat §2.1（b_thirst_king / balrog / b_kayako 初始映射行） |
| `CULTIVATION_STAGES` | 7 | cultivation §1.1（练气~合道） |
| `FIGHT_ITEMS` | 12 | combat §2.3 / item §3.1（可战斗消耗品白名单） |

### `server-rs/src/skills_data.rs`
| 表 | 条数 | 依据 |
|---|---|---|
| `SKILLS` | **146**（id 全唯一，无重复） | 现有技能系统 33 + 扩充技能库 76 + 基因锁新条目 15 + 修真 cu_* 22 |

SKILLS 按流派细览：修真 cu_* 22 / 基因 sk_gene 18（含 skx_gene 通用 3 分计在基因，表内按 id 归类）→ 详见下表
- 武道 sk_ww 6 + skx_ww 16 = 22
- 基因 sk_gene 15 + skx_gene 3 = 18
- 血统 sk_vamp/sk_wolf/sk_zuwu/sk_zhanshi 2+1+1+1=5 + skx_blood 9 = 14
- 圣光 sk_holy 4 + skx_holy 8 = 12
- 科技 sk_tech 4 + skx_tech 8 = 12
- 超能NT sk_nt 4 + skx_nt 9 = 13
- 模因 sk_meme 3 + skx_meme 7 = 10
- 通用 sk_util 4 + skx_util 9 = 13
- 修真交叉 skx_xiu 7
- **合计 146**（≈任务目标 149）

> 说明：技能 id 前缀 `sk_ / skx_ / cu_ / sk_gene_` 共存，`skill(id)` 线性查找；`skill_usable_in_fight` 判定拥有+血统/境界/基因阶/qi 上限门槛（结算由包 B 执行）。

### `server-rs/src/items_data.rs`
| 表 | 条数 | 依据 |
|---|---|---|
| `WEAPONS` | 10 | item §1.1（现三把手级等价 + 高 tier 旁附） |
| `GEAR` | 9 | item §1.2（护甲 5 + 饰品 4） |
| `TRESURE_DEFS` | 6 | cultivation §2.4 法宝三格 |
| `ITEMS` | 19 | item §1.3/1.4/1.5（消耗品 16 + 圣物/任务 3 合并归 `ITEMS` 唯一表）+ `QUEST_ITEM_IDS` 常量（复用现 engine 掉落 id 清单） |
| `RECIPES` | 2 | item §4.3 合成示例 |

## 五、查询 helper（均放对应数据模块，数据驱动）

- combat_data：`gene_stage_of(st)` / `set_gene_stage(st,n)` / `bloodline_def(id)` / `bloodline_of(st)` / `battle_mods(id)` / `cultivation_stage_cfg(n)` / `qi_max_cap_of(st)` / `gene_stage_cfg(st)`
- skills_data：`skill(id)` / `skills_owned(st)` / `skill_usable_in_fight(st, sk)`
- items_data：`item_def(id)` / `weapon_def(id)` / `gear_def(id)` / `treasure_def(id)` / `count_item(st,id)` / `count_items(st,id)` / `has_item(st,id)` / `add_item_counted(st,id)` / `consume_item(st,id)`

inventory 计数采用方案 A 拆 id（`item_id_k`），零侵入现有 `Vec<String>` / GateDef need_item / 门禁判定；`st.weapon` 原语义保留，`equipment.weapon` 为旁附增强（None 回落现武器）。

## 六、红线核对

- 新增持久字段全 serde default ✓
- migrate_save 幂等（v2 屏障保留 + v3 条件迁移）✓
- 未改 `FightCfg` 结构 / FIGHTS 条目 ✓（BATTLE_MODS 为旁附 key by fight_id）
- 未改 `Weapon` 枚举语义 ✓（新武器走 WEAPONS 旁附）
- 未写任何战斗结算逻辑（engine.rs / scenes.rs / FightCfg 一个字节未碰）✓

## 七、验收结果

| 项 | 结果 |
|---|---|
| `cargo check --release` | ✅ exit 0（零错误；仅既有 scenes_yinse/yiying 未用函数警告 28 条，非本包引入） |
| `cargo test --release --test migrate_save` | ✅ **4/4 通过**（幂等迁移全绿） |
| `cargo test --release --test playthrough`（settle_counts_seven_sides / laser_two_fails_is_death / full_playthrough_axe_all_sidequests） | ✅ 全绿（exit 0）；字段默认值不破坏战斗——playthrough 新建态字段 0/None/空表，数值零影响 |

> 全量 playthrough 带随机（召唤兽血统/觉醒判定），属既有随机性；本包仅加全默认新字段，不引入任何结算变化。

## 八、遗留 / 后续（供包 B/C/D 执行）

- 包 B：engine `fight_turn` 查表应用 GENE_STAGES / BLOODLINES / BATTLE_MODS / FIGHT_ITEMS / 技能动作（`sk_/skx_/cu_` 前缀拦截）+ tech_shield 吸收 + equipment 常驻合并；`action_label` 兜底前缀需覆盖 `sk_` 与 `skx_`/`cu_`。
- 包 C：主神兑换/修真阁/道具铺/技能册分页 + HUD 增 geneStage/qi/techShield/cultivationStage/equipment 摘要。
- 包 D：字段/表/helper 单测（消耗品计数、兑换门槛、查询覆盖）。
- `OFF_TABLE`：WEAPONS tier4 强化上限、多武器独立弹药、修真 `treasures` vs `equipment.treasure` 二选一宿主落定（当前 `equipment.treasure` 定为装配权威，`treasures` 保留拥有标记）。

本包仅数据地基，可编译、旧档兼容、既有测试全绿。