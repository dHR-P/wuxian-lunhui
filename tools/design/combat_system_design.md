# 战斗体系扩展设计（无限流引擎级通用能力 × 主神兑换成长线）

> **文档定位**：设计规格（「做什么」，可落地、不写 Rust 实现代码）。落地由编程子代理按 00_ENGINE_CONTEXT.md 数据模型完成。
> **模型**：tokenrhythm/deepseek-v4-flash-0731。
> **硬约束**：本文件为**唯一产出**；不改动 engine.rs / defs.rs / state.rs / scenes.rs 等任何源码（并行代理正在改它们）。
> **依据**：design/zhttty_universe/00_INDEX.md(§二/四 力量体系、§五 跨作品复用矩阵、§7.2 引擎最小改动优先级)、00_ENGINE_CONTEXT.md、晨阀各副本 §5 BOSS/§10 实现风险、server-rs/src/{engine,defs,state,scenes}.rs、server-rs/tests/*。
> **标注**：凡世界观数值非设计库铁证者，一律标「建议值·可调」。

---

## 0. 现状盘点与设计原则

### 0.1 现行数据锚点（权威在 server-rs/src/）

- **GameState**（state.rs）：`hp/san/points/weapon/ammo/gene_lock:bool/gene_lock_used/flags/inventory/dead_team/sp_grade:Option<char>/str_bonus/agi_bonus/bloodline:Option<String>` 等，全部 `#[serde(default)]`；`save_version:u32`（现 2）。
- **gene_lock**：布尔（一阶）。来源①剧情觉醒（engine.rs 智能锁判定，`hp<=30` 且 fight==licker）；来源②主神兑换（`route_exchange_gene` → `st.gene_lock=true`，flag `ex_bought_gene`）。结算处：攻击追加伤害、闪避+0.15、受击-4。
- **str_bonus/agi_bonus**：P1 战力强化/吸血鬼附带敏捷，已在 fight_turn 内联应用（str_bonus×5 攻击、agi×0.05 闪避）。**当前为「内联 if 链」**——物质扩展必须改为数据驱动。
- **bloodline**：`Option<String>`，现仅 `"vampire"`，`is_vampire(st)` 判定，fight_turn 内联吸血/减伤。**同样内联，需数据表化。**
- **FightCfg**（defs.rs）：`name/hp/dmg/reward/reward_why/intro/rage_at:Option<i32>/rage_text/on_rage/finisher_if/finisher_name/finisher_desc/win/death`；FIGHTS 是 `scenes.rs` 内一份**静态 &[FightCfg]**，`pub fn fight_cfg(id:&str)->Option<&'static FightCfg>` 查找。现 9 套（6+ 副本已并入更多）。
- **战斗结算**（engine.rs `fight_turn`）：玩家动作(attack/shoot/melee_gun/allout/guard/finisher) → 命中判定 → 伤害 → 基因锁/战力/吸血鬼加成 → 敌 HP 扣减 → 败北/狂暴 → 敌回合(闪避/减伤/受击) → 死亡 → 觉醒判定。
- **兑换**（scenes.rs s_nexus_exchange）：COST 常量 + `route_exchange_*`（`Route::Dyn`，内部校验 points→扣点→写状态→返回 done/fail 场景）+ `cond_show_*` 可见性 + `text_exchange` 目录文案 + `exchange_name` 汇总。
- **测试面**：`tests/{playthrough, migrate_save, nexus_exchange, debug_laser}` + 6 副本 flow（zhouyuan/yiying/moshi/moruiya/jiguancheng/tianshe/yinse），全部经 **`engine::goto / engine::choose / engine::fight_actions / scenes::scene / scenes::fight_cfg`** 公共接口驱动。

### 0.2 三条设计铁律（贯穿全案）

1. **数据驱动优先于写死 if 链**：新战力（血统/基因锁多阶/护盾）一律做成静态表 + 结算处查表，现 fight_turn 内联的 str_bonus/agi_bonus/vampire 逻辑迁移为查表，杜绝第 N 种血统继续堆 `if is_vampire/if is_xxx`。
2. **绝不动现有 40+ 条 FightCfg 结构与字段语义**：敌人机制走**旁附静态表 `BATTLE_MODS`（key by fight_id）**，零侵入 FIGHTS；多段 BOSS 优先「场景链」既有路线，`next_fight` 仅作可选增强。
3. **一切持久字段必带 `#[serde(default)]` + 迁移管线**：新字段缺省即旧档可读（`save_version` 递增幂等），不破坏 playthrough / 6 副本通关 / migrate_save 断言。

---

## 1. 玩家侧成长体系（跨副本持久，serde 持久化）

> 四体系（基因锁 / 血统 / 真气 / 科技）均为**跨任务世界持久**的「主神轮回者本体强化」——回合制战斗引擎只负责把它们的被动数值应用到每次打击，兑换在主神空间完成。

### 1.1 基因锁多阶 `gene_stage: u8`（0-4）

**现状**：`gene_lock: bool` 一阶布尔。**目标**：`gene_stage: u8`(0=未开，1~4=阶)。二者**并存兼容**：`gene_lock` 保留为「布尔视图」，语义 = `gene_stage >= 1`；`gene_stage` 为权威字段。

**新增字段（伪签名）**
```
#state.rs GameState 增加
#[serde(default)]
pub gene_stage: u8,          // 0..=4，权威；0=未开
# gene_lock 保留（serde 兼容视图），仅由兼容层维护/读取
```

**兼容映射规则（写入一处 helper，engine 与 scenes 均走它）**
| 场景 | 读取/写入 | 规则 |
|---|---|---|
| 读当前阶 | `fn gene_stage_of(st)->u8` | `max(st.gene_stage, if st.gene_lock {1} else {0})` |
| 旧档加载 | `migrate_save` | 若 `gene_lock==true` 且 `gene_stage==0` → `gene_stage=1`（幂等：`gene_stage>=1` 则跳过） |
| 写解锁 | 兑换/觉醒处 | 统一 `set_gene_stage(st, n)`：`gene_stage=n` 且 `gene_lock=(n>=1)` |

**各阶增益（战斗结算查 `GENE_STAGES` 表，非内联）**
| 阶 | 兑换门槛（sp_grade） | 攻击 | 闪避 | 受击减伤 | 终结技额伤 | 备注（建议值·可调） |
|---|---|---|---|---|---|---|
| 1 | D 级（纯点数也可） | +6~12 追加 | +0.15 | -4 | — | 现值原样迁移（保持 licker 觉醒/兑换行为） |
| 2 | B 级 | +12~20 追加 | +0.18 | -8 | 终结额 +15 | 对标摩瑞亚 B 级位 |
| 3 | A 级 | +20~30 追加 | +0.20 | -12 | 终结额 +25 | 银晓曙光绝境·规限 |
| 4 | A 级×1（顶） | +30~40 追加 | +0.22 | -16 | 终结额 +40 | 圣位下探上限，副本可控战力上限（推理见 00_INDEX §二 洪荒历位阶：可控战力上限约四阶初中级） |

```rust
// 伪签名（defs.rs 或 scenes.rs 静态表）
struct GeneStageCfg { stage:u8, atk:(i32,i32), dodge:f64, reduce:i32, finisher_bonus:i32 }
const GENE_STAGES: &[GeneStageCfg];
// 结算处：fn apply_gene_stage(st, out) —— 查表累加，替代原内联 if st.gene_lock
```

**兑换门槛联动 sp_grade**：见 §3 兑换表；基因锁二阶起必须持对应支线评级，评级经副本结算写入 `sp_grade`（咒怨D/异形C/摩瑞亚B/量子遗迹D~C/末世C/遗泽C）。**注意**：新副本并入中 `sp_grade` 为后来字段且串档，兑换表显示逻辑沿用 `cond_show_*`，未达标项展示价+评级要求但禁用购买。

### 1.2 血统池扩展 `BLOODLINES` 数据表（3-5 种，含 vampire 接入）

**现状**：`bloodline: Option<String>` + `is_vampire()` 内联 if。**目标**：纯静态表 `BLOODLINES: &[(id, name, desc, BloodlinePassive)]`，现有 vampire 不改 id，迁入表内统一查表结算。

**表结构（伪签名，defs.rs）**
```rust
pub struct BloodlinePassive {
  pub atk_flat: i32,        // 攻击追加（正向），0 无
  pub leech_on_hit: i32,    // 命中吸血量
  pub dodge_bonus: f64,     // 闪避
  pub dmg_reduce: i32,      // 受击固定减伤
  pub san_resist: i32,      // 每回合 SAN 侵蚀豁免
  pub rage_bonus_atk: i32,  // 狂暴时额外攻击（可选，暂置 0）
  pub label: &'static str,  // HUD/兑换文案片段
}
pub struct BloodlineDef { id:&'static str, name:&'static str, desc:&'static str, passive: BloodlinePassive }
pub const BLOODLINES: &[BloodlineDef];
pub fn bloodline_def(st) -> Option<&'static BloodlineDef> { /* 按 st.bloodline 查表 */ }
```

**3~5 种落地清单（以 00_INDEX §二 力量体系为据；数值「建议值·可调」）**
| id | 名称 | 来源作品 | 被动（atk/吸血/闪避/减伤/SAN抗） | 主神门槛 | 备注 |
|---|---|---|---|---|---|
| `vampire` | 初级吸血鬼血统 | 《无限恐怖》（现有） | atk0 / leech4 / dodge0 / reduce3 / san0 | 3000点 + C（现 C） | **接入表，等价迁移现有内联行为，零回归** |
| `werewolf` | 狼人血统 | 《无限恐怖》 | atk8 / leech0 / dodge0.05 / reduce2 / san0 / rage+10 | 4500点 + B | 狂暴化增攻，适合近战 vs 末日/天蛇 |
| `zuwu` | 祖巫血脉 | 《无限恐怖》 | atk0 / leech0 / dodge0 / reduce10 / san0 | 5500点 + B（建议） | 高减伤坦线，克制兽潮/炎魔 |
| `zhanshi_blood` | 圣光圣职者血脉 | 《死亡开端》 | atk0 / leech0 / dodge0 / reduce0 / san_resist8 | 3500点 + C | SAN 抗性流，克制咒怨/摩瑞亚日光光环 |
| `gauss_cyber`（可选预告） | 纳米血统·共振 | 《无限未来》 | atk4 / leech0 / dodge-0.01 / reduce6 / san0 | 科技侧另定 | 与 §1.4 科技叠算；缺省可为预留位 |

**结算处查表改造（非新建 if 链）**：engine.rs 现激进 if（`is_vampire` 吸血/减伤、`str_bonus` 追加）收敛为一个「玩家加成求和」阶段——按武器/天赋/基因阶/血统被动/科技护盾依次累加输出表与减损表，再统一 apply。**已购血统互斥**：`bloodline` 保持 single Option，兑换彼此 hide（沿用 cond_show_vampire 模式），多人血统属远期。

### 1.3 真气/内力（武道系）`qi / qi_max` + 绝学动作

> 来源：《侠行天下》内功真气→绝学（剑冢「问心一剑」，00_INDEX §四.7）；兑换「无名剑诀」已有先例。

**新增字段（state.rs）**
```
#[serde(default)] pub qi: i32       // 当前真气（回合一内耗）
#[serde(default)] pub qi_max: i32   // 上限（内功心法提供）
#[serde(default)] pub inner_art: Option<String>  // 内功心法 id（None=未学）
```

**机制**：
- `qi_max` 由内功心法在兑换时写入（如「无名剑诀」+qi_max=40；「静心诀」+20）；`qi` 跨回合持久，战斗结束、主神空间补段可 `Eff::San/Eff` 或新 `Eff::RefillQi` 刷新。
- **绝学动作**：`engine::fight_actions` 当 `qi >= COST 且 inner_art` 时追加 `"art"`（绝学）动作；`fight_turn` 命中后消耗 `qi -= cost` 并对敌施加固定高额伤害（类似「终结道具型伤害」，如问心一剑 dmg 30-40 无视护甲 `armor`，见 §2.1）。
- **进战斗 UI**：HUD 增 `qi/qiMax` 条（前端 HTML 只读展示，无引擎侵入）；动作渲染复用现 `action_label` 扩展一个分支。
- **无量也可用**：qi 不足时 `"art"` 不出现（仿 finisher/shoot 的可见性判定）。

### 1.4 科技侧（可选轻重）—— `tech_shield` 最小实现 + 预告

**最小实现（护盾减伤，本轮必做）**：
```
#[serde(default)] pub tech_shield: i32   // 当前纳米护盾值，0=无
#[serde(default)] pub tech_shield_max: i32
# 受击结算：先吃护盾（shield -= dmg 处理穿透），剩余才扣 hp
```
- 兑换上架（详见 §3 「纳米护盾模块」），每级 +30 上限并回满。
- 结算位置：engine.rs 敌回合 `dmg` 计算后、`st.hp` 扣减前插入 `absorb`；日志行「纳米护盾抵挡 X」。**零战斗循环重写**，只在一处插入。
- **高斯武器伤害类型标记**（预告）：Weapon 增类型位（`dmg_type: enum{kinetic, energy, holy, silver}`），配合 §2.1 `weak_*` 克制做 ×1.3；首版仅 `weapon` 加字段 + HUD 展示，克制结算延后。
- **量子干扰**（预告）：对特定敌 ×1.3（金属/机械/量子类 fight_id 白名单），数据层落地为 BATTLE_MODS 的一个 `weak_electric` 复用手法，不在本期做独立系统。

---

## 2. 敌人/战斗机制扩展（数据级，不改 FightCfg 结构）

### 2.1 战斗修饰表 `BATTLE_MODS: &[(&'static str, BattleMods)]`

**定位**：独立静态表，key by fight_id，与 FIGHTS 旁附查询；`fight_cfg` 调用处可另取 `battle_mods(id)`。**零侵入现有 40+ FightCfg**；未挂修饰的 fight 天然 None，行为完全不变。

**结构（伪签名，defs.rs）**
```rust
# 防御/伤害修饰（因 fight_id 而定，加法规则见下）
pub struct BattleMods {
  pub weak_fire:    i32,     // 受火系 ×1.3 → 记 30（按 1000 制 or f32，见加法）
  pub weak_electric:i32,     // 受电/量子克制
  pub armor:        i32,     // 每击减伤（dmg_ - armor），>=0
  pub regen:        Option<(i32,u32)>, // (每回合量, 持续回合)，狂暴/状态可触发
  pub aura:         i32,     // 每回合全队 San- 侵蚀
  pub post_kill:    Option<(i32,String)>, // 击杀后对自己副作用 (量,文案)
  pub waves:        &'static [&'static str], // 打完本 fight_id 后连锁的下一个 fight_id 序列
  pub waves_interval: u32,   // waves 前需要等待的行动轮数（可选，建议级）
  pub no_dodge:     bool,    // 此敌不可闪避（命中必中）
}
pub fn battle_mods(id:&str) -> Option<&'static BattleMods> { ... } // 表查找
```

**加法规则（避免二义）**
- 克制倍率：`weak_fire/weak_electric` 存**百分比增量整数**（如 `30` 表示 ×1.3），命中伤害 = `承伤 × (100 + weak_fire + weak_electric)/100`（火电可叠 → ×1.6，仅当敌同时被标弱）。
- 减伤：`armor` 用于「命中后、取 max(1, …)」前的固定扣减，与 `tech_shield` 叠加（先盾后甲）。
- `regen/aura/post_kill` 均为**每回合结算钩子**，见 §2.2 engine 注入点；`waves` 为多段链的数据承载（对比见 §2.3）。
- **与 on_rage 共存**：`BATTLE_MODS` 只做「修饰」，不替代 `on_rage`（狂暴增员/变身仍走原 FightCfg 的 on_rage 回调）；若二者冲突以 on_rage 的演出为准，mods 数值叠加。
- **零改动降级**：任一 mods 未实现引擎结算时，可直接用「剧情节点/w｛in 分支静态结算」承接（沙丘/异形 §10 已多次给出此退路）；首版引擎支持 `weak_* / armor / no_dodge / aura / regen`，`waves/next` 用场景链承接（见 §2.3 推荐）。

**各副本→训练词映射（落地数据参考，作为表初始行）**
| fight_id（示例） | weak_fire | weak_electric | armor | regen | aura | post_kill | no_dodge | waves | 关联副本 |
|---|---|---|---|---|---|---|---|---|---|
| 沙丘 BOSS `b_thirst_king` | 30 | 30 | 0 | (15,3) | 0 | (0,"绿潮蚀伤") 或置 0 | — | — | 沙丘魔海 §5 |
| 摩瑞亚 w`balrog` | 0 | 0 | 0 | 0 | 6 | 0 | — | — | moruiya §5 火焰形态 SAN 光环 |
| 咒怨 `b_kayako` | 0 | 0 | 0 | 0 | 5 | 0 | 可 true | — | zhouyuan §5 黑发领域 |
| 异形成体（多只） | 0 | 30(电磁)且仅示意 | 0 | 0 | 0 | (4,"酸血残留") | — | — | yiying §10.1 酸血 |
| 末世兽潮/轨道增员 | 0 | 0 | 0 | 0 | 0 | 0 | — | 兽潮波次链 | moshi §10 |
| 量子机械壳 | 0 | 30 | 10 | 0 | 0 | 0 | — | — | liangzi_yiji |
> 具体 fight_id 以各副本实现时为准；上表为映射示例，落地表由主 agent 踢回各副本文档对齐。

### 2.2 engine 注入点（数据驱动，不新增 if 长链）

- **敌回合结算顶部**：查 `battle_mods` → 处理 `aura`（每回合全队 San-=n，clamp 0-100）。
- **命中伤害作用后**：`weak_*` 倍率乘算 → `armor` 扣减 → `tech_shield` 吸收 → 敌 HP `regen += n`（若 regen 有效且未终止）。
- **击杀后（fight_win 之前/之内）**：`post_kill` 副作用对玩家生效（Hurt）。
- **可选**：`no_dodge` 判定敌人命中时跳过玩家闪避 roll。

### 2.3 战斗内道具 `usable_in_fight`（两方案 + 推荐**

**现状**：`inventory: Vec<String>`（add_item 去重唯一）。道具无战斗语义，仅门禁/剧情用。

**方案 A（推荐，改动小、收益明确）**：inventory 元素前缀标 `usable_in_fight` 集合
- 维护一个**静态白名单** `FIGHT_ITEMS: &[(&'static str, FightItemEffect)]`（id → 效果），如：
  - `item_holy_water` 圣水 → 对怨灵系 fight_id ×1.5 一击 + 终结加速。
  - `item_silver_bullet` 银弹 → 消耗 1，攻击伤害 +400% 一次（对狼人/不死系）。
  - `item_torch` 火把 → 施加 `weak_fire` 于当战斗 3 回合。
  - `item_lure` 诱水剂 → BOSS 脱水终点（沙丘 §5：提含水止 regen + 60 伤害）。
  - `item_qutry_符` 驱邪符 → 免疫一次即死/封印类技能。
- `engine::fight_actions` 当 `FIGHT_ITEMS` 内存在当前携带项时追加 `"item_<id>"` 动作；`fight_turn` 在「玩家行动」前拦截，消耗道具 + 应用效果，**不消耗行动命中 roll**（道具是确定性动作，对应「道具」入口）。
- 前端仅加一个「道具」按钮入口（HTML/JS 一处），渲染与执行同走 `fight_actions` 保一致（沿用现有 `fight_actions`/`action_label` 单一数据源模式）。
- **风险**：需确认道具在 `inventory` 的去重语义——若同 id 只能持 1，银弹/圣水限量即天然成立；多枚同 id 计数需⑪阵地方案（拆 id：`item_silver_1/2` 或加计数 int 槽，建议级）。

**方案 B（零引擎改动降级）**：道具不进战斗 UI，改为**场景轮内使用**——在接近 BOSS 的 SceneDef 里加「使用 X」选项（`cond: has_item` → `Eff+Route`），消耗道具并置 flag 或直接判胜（环境终结纯文本）。落地即现 eff/cond 全部现成，零新增。
**推荐**：**首版走方案 A**（战斗体验最贴无限流「边打边用道具」），但 B 作为任何战斗内新增失败的兜底；且方案 A 的实现粒度恰好是「fight_actions 加一个动作 + 一段 apply」，与 §1 四体系查表回路同构，可并入同一战斗结算重构包。

### 2.4 多段 BOSS 衔接 `next_fight` 字段 vs 场景链（**推荐场景链**）

| 维度 | 场景链（现成） | `next_fight` 字段 |
|---|---|---|
| 做法 | r1 win → Route 到「转场 scene(演出)」→ 下一 fight；reward 合并用 PointsIfFlag 补偿 | FightCfg 增 `next_fight:Option<&str>` + 可 `phase_reward`，win 自动连下段 |
| 引擎改动 | 零（仅加 fight 条目与 zone 链） | 改 defs.rs FightCfg 结构 + engine `fight_win` 一小段 |
| 首例 | 银色大地/天蛇已这样设计（00_INDEX §四.2, yinse/tianshe §10） | 副本文档列为「可选增强」 |
| 风险 | 无；与 on_rage/终结技完全兼容 | 改 FightCfg 结构触碰 40+ 条表 + 现有 fight 测试面，需 serde 兼容 |
| 适用 | **本轮全部多段 BOSS**（银色二段/天蛇二段/末世二段/量子双形态） | 列 v2 低风险增强，供后续大批量复用 |

**结论**：**本轮坚持场景链**——它零破坏、已在两条洪荒副本文档被采用（yinse §10.2「直接复用 scene 路由…零引擎改动可跑」、tianshe §10「无需改 FightCfg 结构」）。`BATTLE_MODS.waves` 作为**:optional 数据瓦片**保留在表内，若后期决定过渡，用 BATTLE_MODS 承载而不动 FightCfg。

---

## 3. 主神兑换扩展（Route::Dyn 条件扣点模式）

**沿用现有模式**（scenes.rs）：COST 常量 + `route_exchange_*`（`Route::Dyn`，校验 points/sp_grade → 扣点 → 写状态 → done/fail）+ `cond_show_*` + `exchange_name`/`text_exchange` 目录。

**新增 helper（统一门槛判定）**
```rust
fn has_grade_or(st, need: Option<char>) -> bool {
  match need { None=>true, Some(g)=> st.sp_grade.map_or(false, |s| grade_ok(s,g)) } // D<C<B<A<S
}
// 每个新路由内：if st.points<COST {return FAIL;} if !has_grade {return FAIL /*或需评级场景*/}
```

**新兑换条目表（价格+支线评级门槛；数值「建议值·可调」）**
| 条目 | 价格(点) | sp_grade 门槛 | 写状态 | 备注（复用现有 cond 隐藏） |
|---|---|---|---|---|
| 基因锁 一阶·自主开启权 | 2000 | D | `st.gene_stage=1`（沿用现行为） | 已有，规则归一为 gene_stage |
| 基因锁 二阶·入微 | 6000 | B | `st.gene_stage=2` | 摩瑞亚 B 支线解锁位 |
| 基因锁 三阶·禁忌 | 12000 | A | `st.gene_stage=3` | 曙光绝境位 |
| 基因锁 四阶·顿悟 | 22000 | A | `st.gene_stage=4` | 圣位下探，副本可控上限 |
| 吸血鬼血统（现有） | 3000 | C | `bloodline=Some("vampire")`, `agi_bonus+=1` | 迁移入 BLOODLINES |
| 狼人血统 | 4500 | B | `bloodline=Some("werewolf")` | BLOODLINES |
| 祖巫血脉 | 5500 | B | `bloodline=Some("zuwu")` | BLOODLINES |
| 圣光圣职者血脉 | 3500 | C | `bloodline=Some("zhanshi_blood")` | BLOODLINES |
| 内功·无名剑诀 | 1500 | D | `inner_art=Some("wuming"), qi_max=40` | 剑冢兑换先例 |
| 内功·静心诀 | 350 | — | `qi_max+=20`, SAN 恢复 | 低门槛 |
| 纳米护盾模块 Lv.L | 1800 | D | `tech_shield_max+=30; tech_shield=tech_shield_max` | 科技侧最小实现 |
| 高斯手枪（pre表） | 1200 | — | Weapon 增强（预告） | 沙丘 relic_seed 解锁线 |
| 复活队友 | 4000 | — | 现有 | 不变 |

**改 Exchange 输出**：`text_exchange`/`exchange_name` 增列（可选卷动显示已解锁基因阶/血统/内功/护盾），HUD `hud_json` 增 `geneStage/qi/qiMax/techShield/bloodlineName`。

---

## 4. 实现分区（3~4 个可并行包）

> 依赖矩阵：**包 A（数据字段+表）是唯一硬前置**；B、C 依赖 A 的字段签名但不互相依赖；D 依赖 A/B/C 完成。A+B 可并 → C 可并行于 A（只要字段定义就绪）。推荐开跑顺序：**A→(B∥C)→D**。

### 包 A：state+defs 字段与表（数据层地基）——**先开**
| 文件 / 函数 | 改动 |
|---|---|
| `state.rs` | 加 `gene_stage/qi/qi_max/inner_art/tech_shield/tech_shield_max`（全部 serde default）；`migrate_save` 增基因锁默认迁移（gene_lock→stage=1）；`SaveData` 不变 |
| `defs.rs` | 加类型：`BloodlinePassive/BloodlineDef/BATTLE_MODS(BattleMods)/GeneStageCfg/FIGHT_ITEMS`；不触碰 FightCfg 字段语义 |
| **新增** `skills.rs`（新模块或并入 defs） | `BLOODLINES` 表、`GENE_STAGES` 表、`battle_mods(id)` 查询、`bloodline_def(st)`、`gene_stage_of(st)` 兼容 helper |
| `world.rs` | 仅当需要计数道具时（⑪阵）；可后在 C 做 |
| **风险** | serde 增加字段若漏 `default` 会破坏旧档；表引用错误编译失败但不影响运行 |
| **测试建议** | migrate_save 保持 iso（旧档→stage 迁移断言）；type-check 编译通过 |

### 包 B：engine.rs 战斗结算（查表应用，非新 if）
| 文件 / 函数 | 改动 |
|---|---|
| `engine.rs` | 玩家加成段收敛为查表 `apply_gene_stage/bloodline_def`；替换内联 str_bonus/vampire if | 
| `engine.rs` 敌回合 | 插 `battle_mods` 结算（aura/weak/armor/regen/post_kill/no_dodge）+ `tech_shield` 吸收 |
| `engine.rs` | `fight_actions` 增 `art`(绝学)/`item_<id>`(战斗内道具) 动作；`fight_turn` 拦截应用 |
| `engine.rs` hud_json | 增 qi/techShield/geneStage/bloodlineName |
| 依赖 | **需 A 的字段/表就绪**（可 A 已 merge 后并行） |
| **风险** | 重构内联加成可能改动现有数值——必须保持原公式等价（回归 playthrough） |
| **测试建议** | 现有 playthrough/6副本来证明数值不等被改；新增：吸血鬼/基因1阶仍如旧；BATTLE_MODS 单测（aura 扣 san、armor 减伤、weak×1.3、regen、no_dodge） |

### 包 C：主神兑换 + 前端 HUD（可与 A 并行）
| 文件 / 函数 | 改动 |
|---|---|
| `scenes.rs` s_nexus_exchange + 各 `route_exchange_*` | 新增条目路由（基因2-4/血统×3/内功×2/纳米护盾）+ `cond_show_*` + `has_grade_or` 门槛 + `text_exchange/exchange_name` 扩列 |
| `worlds/zhutian.rs`（或主神相关 web/前端） | 兑换光球 PointDef 增加/复用链接（现有 3 个光球可扩展为分类光球） |
| `server-rs/ui/**`（HTML/JS） | HUD 增 qi/护盾/基因阶条 + 战斗「道具」按钮 |
| 依赖 | **字段来自 A**（可 A 只确认签名后即开，不必等 B） |
| **风险** | 兑换路由逻辑若忘 `has_grade` 会漏评级门槛；前端按钮与 fight_actions 计数不一致会选错动作 |
| **测试建议** | nexus_exchange 扩展用例：各新条目扣点/写状态/门槛拒绝/互斥隐藏；HUD not inserting invalid action |

### 包 D：测试
| 位置 | 内容 |
|---|---|
| `tests/*` 新增 `combat_system.rs` | 基因阶增益、血统被动表、BATTLE_MODS 结算、绝学/道具动作、兑换门槛、旧档迁移 |
| 回归 | 全量 `playthrough/migrate_save/nexus_exchange/当前 6+ 副本流` 不得红 |
| 依赖 | **需 A/B/C merge 后**（最后开） |

---

## 5. 兼容红线清单

### 5.1 必带 `#[serde(default)]` 的新字段
`gene_stage`、`qi`、`qi_max`、`inner_art`、`tech_shield`、`tech_shield_max`（血统/基因继承现有字段，无需新默认）。**任何新增持久字段缺 default ⇒ 旧档反序列化失败**，此为最高红线。

### 5.2 旧档迁移
- `migrate_save` 幂等：detect `save_version`；`gene_lock=true && gene_stage==0` → `gene_stage=1`；`save_version` 递增到下一整（保留 v2 屏障时加 v3 = 本包）。**不得二次回写 / 不得清空现有 inventory/flags/fight**。
- 血统：`bloodline="vampire"` 数据迁移后由 BLOODLINES 表承载，字段值不变（`Some("vampire")`），**无需改存档字符串**。

### 5.3 不破坏既有战斗与测试
- **不改 `FightCfg` 字段语义/顺序**，不删 FIGHTS 任何条目——40+ 条（含已并入 6 副本）全部保留。
- 敌机制走 `BATTLE_MODS` 旁附，未挂 mods 的 fight 行为不变；**gene_lock 布尔视图语义保持**（觉醒/兑换路径回归）。
- 现有测试直接触碰的接口保稳：`engine::{goto,choose,fight_actions}`、`scenes::{scene, fight_cfg}`、`GameState::new` 默认值（新字段应为 0/None，不改变 new() 语义）、`compute_settlement` 签名。
- 战斗数值：包 B 内联加成改为查表时，**输出必须与旧公式数值等价**——playthrough 与 6 副本 flow 是金标准。
- `sp_grade` 兑换门槛为**追加约束**，不影响无兑换场景；负点/复活/评级线（S≥1600 等）不因新字段改变。

### 5.4 测试破坏防护
playthrough / migrate_save / nexus_exchange / zhouyuan / yiying / moshi / moruiya / jiguancheng / tianshe / yinse 全量保留且不得红；新功能以新增测试覆盖，不改旧断言硬数值。

---

## 6. 汇总速览

- **玩家侧 4 体系**：基因锁（gene_stage0-4 + 兼容 gene_lock + sp_grade 门槛联动）、血统池（BLOODLINES 表含 vampire 迁入 + 被动查表）、真气（qi/qi_max + inner_art + 绝学动作）、科技（tech_shield 减伤最小实现，高斯/量子干扰预告）。
- **敌人机制**：BATTLE_MODS 独立静态表（weak_fire/weak_electric/armor/regen/aura/post_kill/waves/no_dodge），数据驱动、零侵入 FightCfg、与 on_rage 共存。
- **战斗内道具**：推荐方案 A（fight_actions 加 item 动作 + apply，仿绝学动作同构），方案 B 零改动兜底。
- **多段 BOSS**：推荐场景链（零破坏，yinse/tianshe 已采用），`next_fight` 列 v2 可选。
- **兑换**：新条目表（基因2-4/血统×3/内功×2/纳米护盾）+ `Route::Dyn` + `has_grade_or` 评级门槛。
- **分区**：A(state+defs 字段与表，硬前置) → B(engine 结算)∥C(兑换+HUD) → D(测试)；A 开完 B、C 可并行，D 最后。
- **红线**：新字段全 serde default；migrate_save 幂等；不改 FightCfg/FIGHTS；测试接口与数值回归金标准。