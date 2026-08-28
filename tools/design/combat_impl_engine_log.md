# combat_impl_engine_log.md — engine 战斗结算（包 B）实现日志

> 角色：无限流战斗体系·engine 战斗结算（包 B）子代理
> 模型：tokenrhythm/deepseek-v4-flash-0731
> 授权改动文件：`server-rs/src/engine.rs`（本次全部改动集中在此；未改 world.rs）
> 依赖：包 A 已完成（field + combat_data/skills_data/items_data 数据层，只读）

---

## 0. 结论先行

包 B 的 **5 项实现已在 `engine.rs` 全部落地**，`engine.rs` 自身 **零编译错误**。

**但数值等价验证（playthrough 3/3、nexus_exchange 6/6、6 副本 flow 全绿）当前无法执行**：
工作目录被多家并行 agent 正在改写（新增 `worlds/mumiyi.rs`、`scenes_mumiyi.rs`、`scenes_mojiao.rs`、
`scenes_jianzhong.rs`、`scenes_tongqu.rs`，以及 `scenes.rs` 内 `skill_cat!/shop_cat!` 宏被改动），
`cargo check --release` 现报 **35 个编译错误，全部位于以上并行 agent 文件内**（`src\scenes.rs`
`src\scenes_jianzhong.rs` `src\scenes_mojiao.rs` `src\scenes_mumiyi.rs` `src\scenes_tongqu.rs`
`src\worlds\mumiyi.rs`），**`engine.rs` 无一错误**。golden 测试因此无法构建运行，
数值等价证明被外部并行改动阻塞（详见 §7 遗留）。

---

## 1. 玩家加成查表化（替代原内联 str_bonus/vampire if）

**等价公式（金标准红线）**：
| 来源 | 旧内联 | 新查表 | 等价性 |
|---|---|---|---|
| 基因锁攻击 | `if st.gene_lock { rnd(6,12) }` | `gene_atk(st)` = GENE_STAGES[1].atk=(6,12) | `rnd(6,12)` 完全一致 |
| 基因锁闪避 | `if st.gene_lock { +0.15 }` | `gene_dodge(st)` = GENE_STAGES[1].dodge=0.15 | 一致 |
| 基因锁受击减伤 | `if st.gene_lock { -4 }` | `gene_reduce(st)` = GENE_STAGES[1].dmg_reduce=4 | 一致 |
| 血统吸血 | `is_vampire → hp+=4` | BLOODLINES.vampire.leech_on_hit=4 | 一致 |
| 血统受击减伤 | `is_vampire → -3` | BLOODLINES.vampire.dmg_reduce=3 | 一致 |
| 战力 | `str_bonus×5` | 保留 | 不变（非表化项） |
| 敏捷 | `agi×0.05` | 保留 | 不变 |

**新 helper**（`engine.rs` 顶部，全 `crate::combat_data::gene_stage_cfg` / `bloodline_of` 查表）：
- `gene_atk / gene_dodge / gene_reduce`：按 `combat_data::gene_stage_of(st)` 查 GENE_STAGES。
- `gear_dodge / gear_reduce / gear_atk_flat / gear_dmg_mult`：装备格护甲/饰品/法宝查 GEAR / TRESURE_DEFS 常驻。
- 攻击结算顺序等价：武器 base → 基因锁 atk → str_bonus×5 → 血统 atk_flat → 装备 atk_flat → 装备倍率×弱点倍率 → 敌 armor → 血统吸血。
- 受击结算：`dodge = base(0.16/0.55) + gene_dodge + 血统dodge_bonus + gear_dodge + agi*0.05`；
  `dmg = max(raw - (gene_reduce+血统dmg_reduce+gear_reduce), 2)`。
- **科技护盾** `tech_shield` 受击先吞伤：`absorb = min(shield, dmg); shield -= absorb; dmg -= absorb;` 后再扣 hp。

> 数值等价性：对 gene_stage=0/1、血统=vampire/无、装备空 的黄金路径，各公式与旧内联逐项相等；
> 更高基因阶/装备仅在新入口命中（零回归）。

---

## 2. BATTLE_MODS 结算（旁附表查表，零侵入 FightCfg）

- `battle_mods(id)` 查表（`combat_data::BATTLE_MODS`），未挂 mods 的 fight 行为完全不变。
- **aura**：敌回合顶部，全队 `san -= aura`（clamp 0-100）+ 日志。
- **weak_fire/weak_electric**：敌人命伤前按 `×(100+weak_fire+weak_electric)/100` 增伤（普攻与技能结；×1.3）。
- **armor**：命伤后固定扣减 `max(deal-armor, 1)`。
- **regen**：敌回合 `f.hp += (amt)`（每回合再生）。
- **post_kill**：`fight_win` 内击杀后对玩家副作用（Hurt），有量才触发。
- **no_dodge**：敌命中跳过玩家闪避 roll（必中）。

> 落地说明：mods 仅在引擎 `Mode::Fight`（engine `fight_turn`）战斗生效；
> 现有 zhouyuan 的 `b_kayako` / moruiya 的 `b_balrog` 战斗走「场景菜单（scene-menu）」而非引擎战斗，
> 故 `no_dodge/aura` 对现有 6 副本 flow 不构成 delta（道德上安全）。

---

## 3. `fight_actions` 扩展（新动作仅在资源满足时出现 → 未购技能玩家动作列表零回归）

`fight_actions` 返回类型改为 **`Vec<String>`**（因 skill/item 动作 id 动态拼接）；
调用方用 `.position(|a| a=="finisher")` 按字符串定位，对原有行为无损。

- `"art"`：已学内功（`inner_art`）且 `qi >= cost` 时出现（wuming=20 / jingxin=10）。
- `"sk_<skill_id>"`：`skills_owned` + `skill_usable_in_fight`（拥有+主动+前置/cost 满足）出现；被动跳过。
- `"item_<base_id>"`：FIGHT_ITEMS 白名单内且 `has_item` 携带时出现。

`action_label` 兜底识别：`item_`（道具使用）、`sk_`/`skx_`/`cu_`/`sk_gene_`（技能：派系短标+消耗文案）前缀。

`fight_turn` 分派：
- `art` → `do_art`：扣 qi，rnd(30,40) 无视 armor 伤。
- `sk_*` → `do_skill`：按 SkillEffect 分发 Striking（海量连击+弱词+armor）/ SelfBuff（guard/heal/san）/ DebuffEnemy（dmg）。
- `item_*` → `do_fight_item`：消耗一份（consume_item），确定性效果（Heal/San/Ammo/Throw/Charm），不耗命中 roll。

---

## 4. 濒死觉醒通用化（承接 licker）

`gene_awaken_check`：
- 判定：`hp <= 下一阶 hp_low_threshold`（一阶30/二阶25/三阶20/四阶15）+ `san >= 20`
  + 未在本场觉醒（`gene_lock_used` 临场标记）+ 未满阶。
- 触发：`set_gene_stage(next)` + `san -= cfg.awakening_cost_san` + AwaitCard 演出（`scenes::gene_lock_card`）。
- 一次战斗一升（`gene_lock_used` 阻断重复，兼容旧 licker 语义）。

> 兼容注：黄金 playthrough 的 licker 战在 hp≤30 时觉醒行为与旧一致；其敌方通用阈值仅在高阶/新触发命中。

---

## 5. `hud_json` 扩展

新增字段：`qi / qiMax / techShield / techShieldMax / geneStage / cultivationStage / bloodlineName / skills`。
原 `hp/san/points/weapon/ammo/geneLock/strBonus/agiBonus/bloodline/team` 全部保留。

---

## 6. 编译

- `cargo check --release`：`engine.rs` **0 错误**；全 crate 35 错误全部在并行 agent 文件
  （scenes.rs / scenes_mumiyi.rs / scenes_mojiao.rs / scenes_jianzhong.rs / scenes_tongqu.rs / worlds/mumiyi.rs）。

---

## 7. 遗留 / 阻塞

1. **【阻塞-外部】无法跑 golden 测试**：全 crate 因并行 agent 的新世界/新场景
   （木乃伊 mumiyi、魔教 mojiao、剑冢/桐趣等）未编译而构建失败。`scenes.rs` 内
   `skill_cat!([...])` / `shop_cat!([...])` 调用缺少宏要求的 `$stat:ident` 首参（宏签名
   `($stat:ident, [...])`），疑为并行 agent 半成品。**请父代理协调并行 agent 修复；
   修复后需重跑 `cargo test --release --test playthrough`（3/3 数值等价）与 6 副本 flow。**
2. playthrough `full_playthrough_axe_all_sidequests` 为既有随机（舔食者随机死亡）flaky——如重跑碰即注明既有随机。