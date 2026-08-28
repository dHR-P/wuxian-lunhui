# 无限流技能系统设计（技能册 · 主神兑换玩法）

> **文档定位**：设计规格（「做什么」，可落地、不写 Rust 实现代码）。落地由编程子代理按 00_ENGINE_CONTEXT.md 数据模型完成。
> **模型**：tokenrhythm/deepseek-v4-flash-0731。
> **角色声明**：本代理为「无限流技能系统设计」子代理，**本文件为唯一产出，零代码修改**。
> **前置依据**：`tools/design/combat_system_design.md`（战斗体系，全文）、`design/zhttty_universe/00_INDEX.md`(§二/四/五 各作品力量体系与跨作品复用)、`00_ENGINE_CONTEXT.md`(数据模型硬约束)、`server-rs/src/{scenes.rs,engine.rs,state.rs}` 实际兑换与战斗动作模式。
> **标注**：一切数值为「建议值·可调」，落地以主 agent 回踢为准；技能名/文案为**自创模仿 zhttty 主神兑换条目风格**（非照抄任何受版权原文）。

---

## §1 技能体系定位与铁律

### 1.1 定位：技能 = 主神处可兑换的「主动招式 + 被动能力」，与四大体系互补

现有战斗体系设计（combat_system_design.md）已含四条**被动数值**成长线：基因锁 `gene_stage`、血统 `BLOODLINES`（`is_vampire` 吸血/减伤查表）、内功 `inner_art`+`qi`、科技 `tech_shield`。它们的共同点是**「买了就生效的被动」**——不占用玩家战术选择。

**技能系统（SKILLS）是与它们正交的「招式化」能力层**：

| 维度 | 四大体系（被动） | **技能系统（SKILLS）** |
|---|---|---|
| 生效方式 | 无条件常驻（查表累加） | **战斗内「多选一自由释放」**（主动技能） 或 常驻数值（被动技能） |
| 战术密度 | 每回合自动生效 | 玩家在动作条里**主动挑选施放** |
| 释放消耗 | 无 | qi / 道具计数 / 场次次数（cost + per_fight_uses） |
| 前置门槛 | 自身兑换门槛 | **need_stage / need_bloodline / need_qi**（挂靠血统/内功/基因阶） |
| 数据形态 | GENE_STAGES / BLOODLINES / qi | **SKILLS 静态表**（与 BLOODLINES 同构的静态数据表） |

**关键分界**：
- 血统/基因锁是「被动的数值骨架」（买了就加攻防）；**技能才是「招式」**——它需要玩家在战斗中主动点选，并且常常**要求你有某个血统/内功/基因阶才能学**（技能是四大体系被动之上长出的「分支」，让已兑换的血统/内功有了被动之外的新动作可玩）。
- 技能不替代上述四条；它消费它们的「前置」并回报更主动的战术手段。

### 1.2 与现有体系的分界规则（技能 vs 血统/基因锁/内功/道具）

| 现有体系 | 技能叠加规则 | 示例技能 |
|---|---|---|
| 血统 BLOODLINES（被动数值） | 技能可 `need_bloodline` 挂靠某血统；血统提供被动，其专属技能提供**主动爆发** | 吸血鬼血统（被动吸血）+ `sk_vampire_frenzy`（主动吸血后增伤，need_bloodline=vampire） |
| 基因锁 gene_stage（被动攻防闪避） | 技能可 `need_stage` 要求基因阶做**前置**；基因锁无「招式」，技能补上主动爆发 | `sk_gene_focus`（need_stage≥2 主动锁敌） |
| 内功 inner_art / qi（被动增上限 + 绝学 art） | **「绝学」实体收编进 SKILLS**：art 成为内功系技能之一；主动技能 `cost_type=qi` | `sk_wenxin_jian`（问心一剑，cost=qi） |
| qi / qi_max（资源条） | 技能最常用的消耗资源（`cost_type=qi`），与 art 同池 | 内功系全体 / 部分神术 |
| 道具 inventory（战斗内 item） | 部分技能 `cost_type=item`（消耗某格道具触发），走 FIGHT_ITEMS 同池判定 | `sk_silver_bullet` 银弹射击 |
| 科技 tech_shield / 枪械 | 技能可要求科技/枪械类前置或追加克制 | `sk_emp_pulse`（电磁脉冲，对机械克制） |

**结论性分界**：血统/基因锁/内功/科技 = **被动数值层（查表累加）**；SKILLS = **招式层（主动释放 + 可被被动层解锁）**。二者正交、可叠加（血统被动 + 其专属技能主动同时在一次打击里生效）。

### 1.3 铁律（四条硬约束，实现时不可违反）

1. **SKILLS 纯静态数据表**（不写死 if 长链）：所有技能定义进 `pub const SKILLS: &[SkillDef]`；结算/列表/兑换全部查表，禁止 `if skill=="sk_xxx"` 堆叠。每技能效果以 `effect` 数据描述（建议伪表达式 + 枚举），引擎按 `SkillKind`/`SkillEffectKind` 分发。
2. **战斗内「技能动作」通过 `fight_actions` 动态追加**：与现有 art/道具动作同构——`fight_actions(st)` 在返回攻击/终结动作的基础上，**when 拥有主动技能且满足 前置(cost/风/血统/阶) 时 push 对应 `sk_<id>` 动作**；渲染复用 `action_label` 加分支，执行在 `fight_turn` 拦截。与 combat_system_design.md §2.3 方案 A（FIGHT_ITEMS 加 item 动作）同一条通道。
3. **兑换沿用 `Route::Dyn` + `has_grade_or`**：技能兑换走 s_nexus_exchange 的 `route_exchange_*` + `cond_show_*` + `text_exchange/exchange_name` 既有模式；门槛用 combat_system_design.md §3 的 `has_grade_or(st, need)` 统一判定（`need_grade: Option<char>`）。
4. **serde default 兼容（最高红线）**：新持久字段 `skills: Vec<String>` 必须 `#[serde(default)]`；`GameState::new` 缺省 `vec![]`；不动 FightCfg/FIGHTS/BATTLE_MODS 现有字段；不破坏 playthrough / 6 副本 / migrate_save。

> **serde 兼容注意**：`skills: Vec<String>` 只存**已购技能 id 列表**（拥有标记），技能**定义/数值全部在静态表 SKILLS**（编译期常量），**不落盘任何技能数值**——所以加技能无需改存档结构、不依赖 migrate_save 迁移；旧档天然读 `skills=[]`。

---

## §2 SKILLS 技能表结构（伪签名数据表）

### 2.1 `SkillDef`（静态表条目，`defs.rs` 或新 `skills.rs` 模块）

```rust
pub enum SkillCost { None, Qi(u32), Item(&'static str), Point /* 剧情演示用，不走战斗内 */ }
pub enum SkillKind { Active, Passive }
pub enum SkillEffectKind {
    // 主动：命中类（走 fight_turn 玩家命中分支）或 条件类（施放即结算，不依赖命中 roll）
    Striking { dmg:(i32,i32), ignore_armor:bool, hits:i32, weak_mods:Option<&'static [&'static str]> /* 对 weak_* 敌人 ×1.3/×1.5，读 BATTLE_MODS */ },
    SelfBuff { hp:i32, san:i32, guard:i32, dodge_bonus:f64 },
    DebuffEnemy { no_dodge:i32 /* 必中回合数 */, stun:i32, dmg_over_time:Option<(i32,i32)> /* (每回合, 回合数) */ },
    // 被动：数值档位（战斗结算段合并进玩家加成）
    Passive { atk_flat:i32, leech:i32, dodge_bonus:f64, dmg_reduce:i32, san_resist:i32, qi_max:i32 },
}
pub struct SkillDef {
    pub id: &'static str,             // "sk_<流派缩写>_<名>"
    pub name: &'static str,           // 技能名（自创，模仿主神条目语气）
    pub school: SkillSchool,          // 流派（武道内功/基因肉躯/血统天赋/圣光神术/科技枪械/超能NT/灵能模因/通用辅助）
    pub desc: &'static str,           // 小说风文案（2~3 句，主神兑换条目风格）
    pub price: i32,                   // 主神点数（建议值·可调）
    pub need_grade: Option<char>,     // D<C<B<A<S 支线门槛（has_grade_or 判定）
    pub need_bloodline: Option<&'static str>, // 前置血统 id（None=无要求）
    pub need_qi: Option<i32>,         // 前置 qi_max（None=无要求）
    pub need_stage: Option<u8>,       // 前置基因阶（None=无要求）
    pub kind: SkillKind,              // Active | Passive
    pub cost: SkillCost,              // 主动技能消耗（被动技能忽略）
    pub effect: SkillEffectKind,
    pub per_fight_uses: Option<u32>,  // 主动技能每场战斗次数上限（None=不限，靠 qi/道具天然限量）
    pub cooldown: u32,                // 建议全置 0（避免冷却计时复杂度，见 §4.3；字段保留为预留）
}
```

### 2.2 静态表与查询/拥有判定（伪签名）

```rust
# defs.rs 或 skills.rs
pub const SKILLS: &[SkillDef] = &[ /* §3 各条目 */ ];
pub fn skill(id: &str) -> Option<&'static SkillDef>    // 表查找（O(n)，30+ 条不计较）
pub fn skills_owned(st: &GameState) -> Vec<&SkillDef>  // 按 st.skills 列表查表
pub fn skill_usable_in_fight(st, skill) -> bool        // 拥有 && 前置满足（见 §4.1）
```

### 2.3 新增持久字段（state.rs）

```rust
# GameState 增加（置于 bloodline 之后、mode 之前）
#[serde(default)]
pub skills: Vec<String>,   // 已购技能 id 列表（只存拥有标记；定义数值全在静态表）
```

- **GameState::new 缺省**：`skills: vec![]`（不改变 new() 语义）。
- **迁移**：无（旧档缺省 `[]` 即可读，`save_version` 不需要必须递增——除非需要显式屏障；建议顺手递增到 v3 幂等防呆，遵循 combat_system_design.md §5.2）。

**推荐：技能独立用 `skills: Vec<String>`，不复用 inventory。** 理由：
1. inventory 承载剧情道具（钥匙卡/样本/门禁券），技能是「兑换的能力」而非可丢弃类物品，语义应分离；
2. 技能兑换是「一次拥有」，inventory 的 `add_item` 去重唯一语义可以复用但不是为「技能册」设计的；拆开让前端技能册页、HUD 技能摘要、`skills_owned` 直接读一个数组，避免把技能混进道具排查逻辑；
3. 便于 `route_exchange_*` 直接 `st.skills.push(id.to_string())`（确认未含再 push）与 `cond_show_*` 查 `st.skills.contains(id)`，模式与 `cond_show_gene`/`cond_show_vampire` 一致。

（若后续需要「技能槽位上限/可装卸」，在 `skills: Vec<String>` 之上加「装备槽」字段即可，本轮不做。）

---

## §3 技能库分类清单（核心交付物：33 条，8 大流派）

> 分类对照：**武道·内功系**（侠行天下）· **基因锁·肉体系**（无限恐怖）· **血统天赋系**（无限恐怖/各血统）· **圣光/神术系**（死亡开端）· **科技/枪械系**（无限未来）· **超能/NT 系**（大宇宙时代）· **灵能/模因系**（无限曙光）· **通用/辅助系**。
> 每条含：id / 名称 / 流派 / 描述文案（主神兑换条目风格，自创）/ 价格+支线门槛 / kind / cost / 战斗效果（主动给 action 语义，被动给数值）。
> 数值均「建议值·可调」。**id 前缀**：`sk_ww`(武道-wushu+内功) `sk_gene`(肉躯) `sk_vamp/wolf/zuwu`(血统) `sk_holy`(圣光) `sk_tech`(科技) `sk_nt`(超能) `sk_meme`(模因/灵能) `sk_util`(通用)。

### A. 武道·内功系 `sk_ww_*`（侠行天下风，6 条）

| id | 名称 | kind | cost | 需内功/基因/血统 | 战斗效果 |
|---|---|---|---|---|---|
| sk_ww_wenxin | **问心一剑** | 主动·招式 | qi 12 | need_qi=inner_art 40 | Striking dmg(30,40) ignore_armor=true，无视护甲；需 qi 足够才在动作条出现 |
| sk_ww_jiuzhuan | **九转归元** | 主动·爆发 | qi 18 | need_qi=inner_art 40 | SelfBuff qi 回 +20/或下一击 dmg×1.5；连击 2 段 |
| sk_ww_wuxiang | **无相步** | 主动·身法 | qi 8 | need_qi=inner_art 60 | SelfBuff dodge_bonus+0.25，守势提升下一轮闪避 |
| sk_ww_bopo | **破军一击** | 主动·破防 | 无(qi 10) | need_qi=inner_art 60 | Striking 对 grief/armor>0 敌人 ×1.5（读 BATTLE_MODS.armor） |
| sk_ww_liantui | **连环腿法** | 主动·连击 | 无 | 无 | Striking hits=3，dmg(6,9)×3，可叠暴击 |
| sk_ww_wumian | **无面心法** | 被动 | — | need_qi=inner_art 40 | Passive qi_max+30，san_resist+4（内功心法加强版，被动） |

**条目示例文案**（模仿主神兑换语气，自创）：
> **问心一剑（虚无级 · 绝学）**——「主神把剑意烙进你的神识：那一剑不问来路、不念归处，只在极静的一瞬，把漫天杀机敛作一线。剑出，无物可御。」价格 1500 点 · 需 D 级支线 · 需内功根基（qi_max≥40）。战斗中消耗真气 12 释放，无视敌方护甲直接斩出 30~40 点真实伤害。

### B. 基因锁·肉体系 `sk_gene_*`（无限恐怖风，3 条）

| id | 名称 | kind | cost | 前置 | 战斗效果 |
|---|---|---|---|---|---|
| sk_gene_focus | **猎手凝视** | 主动·锁定 | 无 | need_stage=2 | DebuffEnemy no_dodge=2（接下来 2 回合攻击必中，不吃敌方闪避） |
| sk_gene_berserk | **本能爆发** | 主动·爆发 | 无 | need_stage=3 | SelfBuff atk_flat 下一击 +15，guard_turn=false 但本回舍闪避 |
| sk_gene_instinct | **战斗直觉** | 被动 | — | need_stage=1 | Passive dodge_bonus+0.08, atk_flat+4 |

**条目示例文案**：
> **战斗直觉（基因锁一阶衍生）**——「主神的说明冰冷简短：解放锁率的肌肉记住了每一位猎手的重心与眼神。无需思考，身体先于剑至。」价格 2000 点 · 需基因锁一阶。

### C. 血统天赋系 `sk_vamp/sk_wolf/sk_zuwu_*`（无限恐怖各血统专属，5 条）

> 均 `need_bloodline` 门槛——只有先兑了对应血统才可学，给被动血统配一个主动招。

| id | 名称 | 血统门槛 | kind | cost | 战斗效果 |
|---|---|---|---|---|---|
| sk_vamp_frenzy | **血之狂潮** | vampire | 主动·吸血强化 | qi 6 | Striking dmg(18,26)+ 命中吸血 io 当 dmg×30%，续攻 2 段 |
| sk_vamp_mist | **血雾遁形** | vampire | 主动·身法 | qi 5 | SelfBuff dodge_bonus+0.3 一回合，san+5 |
| sk_wolf_rend | **狂暴撕咬** | werewolf | 主动·爆发 | 无(场次) | Striking dmg(28,38) 对非机械 ≈×1.3；rage 时额外 +10 |
| sk_zuwu_iron | **祖巫不灭身** | zuwu | 被动 | — | Passive dmg_reduce+8, hp_max+20 |
| sk_zhanshi_light | **圣职者之誓** | zhanshi_blood | 被动 | — | Passive san_resist+6, atk_flat+3（血统联动圣光系） |

**条目示例文案**：
> **血之狂潮（吸血鬼血统招式）**——「主神用吸饱血的心脏跳动做注释：你以为夜晚属于蝠翼，其实属于你——当渴意倾泻而出，你的每一次撕裂都在把敌人的生命汲为己有。」需吸血鬼血统。战斗中消耗真气 6 释放，造成 24~38 伤害并把其中三成化作自身生命。

### D. 圣光/神术系 `sk_holy_*`（死亡开端风，4 条）

| id | 名称 | kind | cost | 前置 | 战斗效果 |
|---|---|---|---|---|---|
| sk_holy_burst | **圣光术** | 主动·克制 | qi 8 | need_qi 20 或 zhanshi_blood | Striking 对亡灵系 weak_holy×1.5（读弱词）+ 自身 san+8 |
| sk_holy_water | **圣水祝福** | 主动·支援 | item(item_holy_water) | has_item 圣水 | DebuffEnemy dmg_over_time(8,3) 对怨灵系；或 SelfBuff guard |
| sk_holy_purify | **圣印驱散** | 主动·净化 | qi 6 | need_qi 20 | 清除自身诅咒类持续效果 / 免疫一次即死（对 BATTLE_MODS post_kill 或诅咒叠层），回复 san+12 |
| sk_holy_veil | **圣光护佑** | 被动 | — | need_qi 20 / zhanshi_blood | Passive san_resist+8, dmg_reduce+3（神术常驻） |

**条目示例文案**：
> **圣光术（对亡灵特攻）**——「主神托起一撮灰烬，冷声说明：当圣火自你掌心亮起，腐烂不再是它们的铠甲而成为它们的墓志铭——凡亡者，尽数退回尘土。」消耗真气 8，对亡灵/怨灵类敌人伤害 ×1.5，并抚平你心神（SAN+8）。

### E. 科技/枪械系 `sk_tech_*`（无限未来风，4 条）

| id | 名称 | kind | cost | 前置 | 战斗效果 |
|---|---|---|---|---|---|
| sk_tech_emp | **电磁脉冲** | 主动·克制 | item / qi 6 | tech 枪械 | Striking 对机械/量子系（weak_electric）×1.6，cost_type=item(emp_grenade) 或 qi |
| sk_tech_nano | **纳米修复** | 主动·回复 | item 或 qi 5 | tech_shield>0 | SelfBuff hp+25（限一次/场，修复纳米愈合躯体） |
| sk_tech_ballistic | **弹道预判** | 主动·必中 | 无 | weapon=Gun | DebuffEnemy no_dodge=1 且下一枪 dmg×1.3（命中必中） |
| sk_tech_scanner | **战术扫描** | 被动 | — | tech | Passive 每场首发命中 atk_flat+6，读敌弱词显示（HUD） |

**条目示例文案**：
> **电磁脉冲（对机械化部队特攻）**——「主神的注释像一段锈蚀的军规：当蓝白色电弧从你的指尖炸开，硅基的头脑会在 0.4 秒内烧毁它们的忠诚。钢结构的东西，终究不是血肉。」对机械/量子类敌人伤害 ×1.6。

### F. 超能/NT 系 `sk_nt_*`（大宇宙时代风，4 条）

| id | 名称 | kind | cost | 前置 | 战斗效果 |
|---|---|---|---|---|---|
| sk_nt_precog | **灾祸预知** | 主动·感知 | 无 | None | 触发「下轮伤势闪避免疫一次」（dodge_bonus+0.5 一回合） |
| sk_nt_empathy | **读心感应** | 主动·感知 | qi 4 | None | 揭示敌弱词（weak_*）/ 触发 `precog_benefit` flag 补给 |
| sk_nt_telekinetic | **念动力场** | 主动·护盾 | qi 10 | None | SelfBuff guard（临时护盾吸收下一击 dmg，等效 tech_shield 临时 +25） |
| sk_nt_push | **精神冲击** | 主动·控场 | qi 8 | None | DebuffEnemy stun=1 + dmg(8,14)，stun 使敌下一轮不行动 |

**条目示例文案**：
> **念动力场（宇宙适应者 NT 技法）**——「主神在虚空里划出一道涟漪：当你把思维绷成一面看不见的壁，连中子星的碎片也只能在其上留下波纹——这一瞬，没有物理能伤害你。」消耗真气 10，形成护盾，吸收敌方下一击全额伤害。

### G. 灵能/模因系 `sk_meme_*`（无限曙光风，3 条）

| id | 名称 | kind | cost | 前置 | 战斗效果 |
|---|---|---|---|---|---|
| sk_meme_mark | **道德印记** | 主动·标记 | qi 6 | None | DebuffEnemy 标记目标：此后对它的伤害 +15%（简易版「概念标记」），持续 3 回合 |
| sk_meme_link | **心灵链接** | 主动·联动 | qi 5 | None | SelfBuff san+10, 队友支援 flag（下轮 get ally_bonus） |
| sk_meme_seal | **概念封锁** | 主动·封印 | qi 12 | need_stage not | DebuffEnemy 封印敌方一次狂暴 / post_kill（压制负面，简易「概念感染逆用」） |

**条目示例文案**：
> **道德印记（模因·初阶概念感染）**——「主神的指尖划过一行无法被记忆的符号：有些叙事一旦被写下，就不再有转折——你让敌人成为『注定被击败』的那个名字。」消耗真气 6，给目标烙上印记，接下来 3 回合你对它的全部伤害提升 15%。

### H. 通用/辅助系 `sk_util_*`（4 条）

| id | 名称 | kind | cost | 战斗效果 |
|---|---|---|---|---|
| sk_util_inspect | **洞察侦查** | 主动·探察 | 无 | 揭示敌 HP/弱词/狂暴阈值（HUD 展示态）、当前 fight 不可闪避与否 |
| sk_util_bandage | **紧急包扎** | 主动·回复 | item(item_bandage) | SelfBuff hp+18（战斗中消耗 1 份纱布） |
| sk_util_morale | **振奋咆哮** | 主动·增益 | 无 | SelfBuff san+8, 下一击 atk_flat+6 |
| sk_util_antidote | **净化血清** | 主动·解控 | item(item_antidote) | 解除毒/诅咒/灼烧持续状态并 hp+8 |

**条目示例文案**：
> **紧急包扎（战场急救技艺）**——「主神把一卷纱布丢到你面前，声音平淡：活不下来，你兑换的一切都是留给主神的遗产。先学会在伤口上做手脚。」消耗 1 份纱布，恢复 18 点生命。每场限用 2 次。

---

### §3 汇总统计

- **技能总数：33 条**（A 6 + B 3 + C 5 + D 4 + E 4 + F 4 + G 3 + H 4）。
- **按 kind**：主动 25 条 / 被动 8 条（被动集中在 wumian/gene_instinct/zuwu_iron/zhanshi_light/holy_veil/tech_scanner 等）。
- **按消耗资源**：qi 为主（约 12 条），item（圣水/纱布/血清/EMP 手雷）4 条，无消耗（受 per_fight_uses 限）9 条。
- **前置门槛**：need_bloodline 5 条、need_stage 3 条、need_qi（内功）8 条、纯支线 need_grade 若干。
- **克制联动**：圣光对亡灵、电磁对机械、银弹/破军对 armor，均读 BATTLE_MODS 弱词体系（combat_system_design.md §2.1），非新机制。

---

## §4 战斗内自由释放

### 4.1 动作条动态追加（`fight_actions` 扩展，与 art/道具同构）

```rust
# engine::fight_actions(st) 现有返回 [finisher, shoot/attack, allout, guard]
# 在其上追加技能动作：对每 owned 且 可用的主动技能 push "sk_<id>"
pub fn fight_actions(st: &GameState) -> Vec<&'static str> {
    let mut v = /* 现有 finisher/武器/allout/guard */;
    for skill in skills_owned(st) {               // skills_owned = st.skills 查 SKILLS 表
        if skill_usable_in_fight(st, skill) {
            v.push(skill.id);                      // "sk_ww_wenxin" 等
        }
    }
    v
}
fn skill_usable_in_fight(st, skill) -> bool {
    if skill.kind != SkillKind::Active { return false; }   // 被动不进动作条
    // 前置：血统 / 基因阶 / 内功 qi 上限
    if let Some(b)=skill.need_bloodline { if st.bloodline.as_deref()!=Some(b) { return false; } }
    if let Some(g)=skill.need_stage { if gene_stage_of(st) < g { return false; } }
    if let Some(m)=skill.need_qi { if st.qi_max < m { return false; } }
    // 消耗可行性与次数
    if !cost_affordable(st, &skill.cost) { return false; }
    if let Some(u)=skill.per_fight_uses {
        if used_this_fight(st, skill.id) >= u { return false; }   // 场次计数，见 §4.3
    }
    true
}
```

- **ui 渲染**：`render()` 的 `Mode::Fight` 分支已对 `acts` 调 `action_label(a, st)` 生成按钮列表——技能动作天然被渲染；只需在 `action_label` 的 `match` 加一个**兜底分支**：对 `act.starts_with("sk_")` 查 SKILLS 表取 `name`/`desc`（如 `"◆ 问心一剑（真气 12）"`）。与 combat_system_design.md §1.3「art 动作」扩展同一处，不新增渲染管线。
- **前端**：动作条按钮渲染本就通吃 `fight_actions` 全列表，技能按钮**零前端结构性改动**；仅需「可点技能时按钮置高亮/附消耗提示」（可选，属增强）。

### 4.2 fight_turn 拦截执行（仿 art/道具动作实现粒度）

```rust
# fight_turn(st, index, deaths) 在解析 act 后、玩家行动/守卫分支前插入：
if act.starts_with("sk_") {
    let skill = skill(act).expect("sk action").clone();
    // ① 扣消耗
    apply_cost(st, &skill.cost);                 // qi -= : Qi(n) / 消耗道具 : Item(id)
    inc_fight_use(st, skill.id);                 // 场次计数 += 1
    // ② 按 effect 分发（SkillEffectKind）
    match skill.effect { Striking{..} => skill_hit_turn(st, skill), SelfBuff{..}=>..., DebuffEnemy{..}=>... }
    // ③ 打完进入通用结算（敌 HP/觉醒/狂暴/敌回合），与现有分支汇合
    /* fallthrough 到现有 fight_turn 尾部逻辑（不回滚到命中 roll） */
    return;  // 或 goto 尾部
}
```

- **Striking（命中类主动）**：复用现有「玩家行动」命中判定段（roll hit + BATTLE_MODS weak/armor），但**终结技/基因锁/血统被动等已含在 base 计算中**——技能只加 own dmg，不重复触发内联加成，避免数值膨胀（见 §6 红线）。
- **SelfBuff / DebuffEnemy（条件类）**：**不消耗行动命中 roll**（与 combat_system_design.md §2.3 方案 A 的道具动作同为确定性动作），施放即结算，必要时消耗一次「场次次数」而不是命中。
- 实现粒度 = combat_system_design.md §2.3/**§1.3 绝学 art** 的 `fight_actions 加动作 + 一段 apply` 完全同构。

### 4.3 冷却/次数（**推荐：场次次数限量，不做冷却计时**）

**推荐采用「每场战斗次数上限 `per_fight_uses` + 资源天然限量」（qi/道具），不做回合冷却 cooldown 计时。** 理由：
- 回合制战斗无「时间轴」，堆 cooldown 需战斗内计数器 + 每回合递减逻辑，复杂度高、易 and 现有 fight_turn 循环纠缠；
- qi/道具本身已是天然冷却（真气跨回合累计、道具一格一份），叠加 `per_fight_uses` 足够控制强技能施放频率；
- `cooldown` 字段**保留为预留位但全表置 0**，未来若做持续状态（燃烧/诅咒/记忆锁）再启用。

**场次计数落地（轻量）**：不建议新持久字段——用 `st.fight` 会话上的临时计数（`Fight` 加 `skill_used: Vec<(String,u32)>` 或复用 `flags` 前缀 `sk_use_<id>_<fight>`，战斗结束自然清零）。首版若为降级，可直接**只靠 qi/道具天然限量 + `per_fight_uses` 规则上的「提示」**（不做硬计数），靠资源条就足够约束（部分无消耗技能（如 sk_tech_ballistic）才需硬 per_fight_uses=1）。

### 4.4 与现有 art 动作的关系（**建议把「绝学」统一并入 SKILLS**）

- **推荐把现有 `"art"`（绝学）动作收编进 SKILLS**：`sk_ww_wenxin` 即「问心一剑」，cost=qi 走 `fight_turn` 的 sk_ 拦截（Striking ignore_armor）。engine 现有 art 分支保留为**通用技能执行通道**（`sk_` 分发时复用其「高额伤害/无视护甲」实现骨架），不新建第二套通道。
- 兼容处理：`"art"` 动作字面量可与 `sk_` 前缀共存一段时间（老兑换 `inner_art` 余额用），最终 `art` 被 SKILLS 里同 id 技能取代；**不动 FightCfg，改的是 engine 动作列表一层**。

---

## §5 主神兑换技能页

### 5.1 场景/卡片（`s_nexus_exchange` 扩展 或 新增技能光球）

- **推荐新增技能册光球**：在 s_nexus 广场则加一个「技能册」光球 → `s_nexus_skills` 场景，或直接在 `s_nexus_exchange` 兑换目录里加一排「◆ 技能册 · 分类技能列表」入口（复用现有 `Route::To`，改动更小，与 §3 L3 combat_system_design.md 的兑换扩展同构）。
- 结构：复刻现有 `s_nexus_exchange` 模式——`SceneDef` + `TextSpec::Dyn(|st| text_skills(st))` + 每技能一条 `ChoiceDef { label: "◆ <名称>", sub: "<价格>点 · <评级> · 流派标签", cond: Some(cond_show_skill(id)), route: Route::Dyn(route_buy_skill(id)) }`。

### 5.2 分类分页

- 技能数量 33+ 条，**按流派分页**：8 大流派各一个「分册」中间场景（如 `s_nexus_skills_wushu` / `..._gene` / `..._blood` / `..._holy` / `..._tech` / `..._nt` / `..._meme` / `..._util`），技能册首页轮列出「武道内功 / 基因肉躯 / 血统天赋 ...」分支链接。
- 每条技能 entry 沿用 `text_exchange` 的小说风格：**价格 + 支线门槛 + 前置（need_bloodline/stage/qi）+ 流派标签 + 一句 desc**。

### 5.3 `cond_show_*` 隐藏已购 + 门槛展示

```rust
fn cond_show_skill(id: &str) -> impl Fn(&GameState) -> bool {
    move |st| !st.skills.contains(&id.to_string())   // 已购隐藏
}
// Route::Dyn 购买（walk has_grade_or + 点数/前置校验 → 扣点 → push skills）
fn route_buy_skill(id: &'static str) -> impl Fn(&mut GameState) -> String {
    move |st| {
        let s = skill(id).expect("skill");
        if st.skills.contains(&id.to_string()) { return "s_nexus_exchange_done".into(); } // 已拥有
        if st.points < s.price { return "s_nexus_exchange_fail".into(); }                 // 点数不足
        if !has_grade_or(st, s.need_grade) { return "s_nexus_skills_grade_fail".into(); } // 支线门槛不足
        // 前置校验（仍需基点：血统/基因阶/内功门可在兑换中心展示文案但不硬拦，或硬拦返回 fail）
        st.points -= s.price;
        st.skills.push(id.to_string());
        "s_nexus_exchange_done".into()
    }
}
```

- `has_grade_or` 复用 combat_system_design.md §3 的 helper，不改其签名。
- 未达标技能展示：`cond_show_*` 显示但 `route` 校验 `has_grade_or`（若等级不足返回专用 fail 场景 `s_nexus_skills_grade_fail`，文案「支线评级不足」），或按 L3 规范「展示价+评级但禁用购买」。

### 5.4 Exchange/HUD 扩列

- `exchange_name(st)`/`text_exchange(st)`：已购技能并入「已兑换」摘要（如追加一行「技能：问心一剑、圣光术 …」或只报技能数「已掌握技能 ×N」）。
- HUD `hud_json`（engine.rs）：增 `skills` 摘要字段——已购主动技能数 / 首 4 个技能名（用于主神空间与 HUD 展示）；战斗中无需列技能（动作条自渲染）。

---

## §6 与战斗体系设计的分区衔接（重要）

### 6.1 技能系统落进 combat_system_design.md §4 的哪个包

combat_system_design.md §4 四个包：**A**(state+defs 字段与表)、**B**(engine 战斗结算)、**C**(主神兑换+HUD)、**D**(测试)。技能系统要求刚好横跨这几处：
- 新增 `skills: Vec<String>` 持久字段 + `SkillDef/SKILLS/查询 helper` → **属包 A（数据层地基）**；
- `fight_actions`/`action_label`/`fight_turn` 增 `sk_` 动作执行 → **属包 B（engine 结算）**；
- 技能册兑换光球/分页/`route_buy_skill`/`has_grade_or`/`cond_show_skill`/HUD skills 摘要 → **属包 C（兑换+HUD）**；
- 技能单测/兑换门槛用例 → **属包 D**。

**结论：技能系统不建独立包，作为增量并入 A/B/C/D 对应同名包。** 因为它的实现粒度与四条被动体系的表/查询/兑换/结算是同构的（同一 `Route::Dyn+has_grade_or+cond_show`、同一 `fight_actions` 追加通道、同一 serde default 红线），独立包会重复 A/B/C/D 的样板且增加合并冲突面。

### 6.2 技能系统增量包 A'/B'/C'/D' 合并顺序建议

| 增量包 | 内容 | 并入位置 | 依赖 | 建议顺序 |
|---|---|---|---|---|
| **A'** | `SkillDef/SkillKind/SkillEffectKind/SkillCost` 类型 + `SKILLS: &[SkillDef]` 33 条 + `skill()`/`skills_owned()`/`skill_usable_in_fight()`；`GameState.skills: Vec<String>`（serde default）+ new 缺省；顺带 `Fight` 会话技能计数（可选 `skill_used` 或 flags 前缀） | combat_system_design.md §4 包 A（data 层，含 skills.rs 新模块） | 包 A 的字段风格 | **第 1 步（与 A 同批或紧随 A'）**——唯一硬前置 |
| **B'** | `fight_actions` 追加 `sk_` 动作 + `skill_usable_in_fight` cost/前置判定；`action_label` 加 sk_ 兜底分支；`fight_turn` 拦截 `sk_`（Striking/SelfBuff/DebuffEnemy 分发）；`art` 收编为技能执行通道 | combat_system_design.md §4 包 B | 需 A' 字段/表就绪 | **第 2 步（A' 后可并行于 C'）** |
| **C'** | 技能册光球/分页（8 流派）+ `route_buy_skill` + `cond_show_skill` + `has_grade_or` + `exchange_name/text_exchange` 增技能摘要 + HUD `skills`；`s_nexus_skills_*` 各分册场景 | combat_system_design.md §4 包 C | 可只确认 A' 签名后即开（不必等 B'） | **与 B' 并行** |
| **D'** | 技能动作单测、兑换门槛用例、回归（playthrough/6 副本不红） | combat_system_design.md §4 包 D | 需 A'/B'/C' merge | **最后** |

**推荐实现顺序**：**A（原包）→ 并入 A' → (B∥B') ∥ (C∥C') → D/D'**。即技能增量顺着战斗体系原包主线走，不额外开并行独立包，避免在 scenes.rs/engine.rs 同一份文件上双代理并发冲突。

### 6.3 技能系统兼容红线（对齐 combat_system_design.md §5）

1. **`skills: Vec<String>` 带 `#[serde(default)]`**（最高红线，缺省即旧档可读）；`GameState::new` 缺省 `vec![]`。
2. **不动 FightCfg/FIGHTS/BATTLE_MODS 现有字段**；技能只读 `battle_mods` 的 weak/armor 弱词，不修改其语义。
3. **动作追加不破坏 playthrough / 6 副本数值**：新 `sk_` 动作**仅新技能触发**（无技能/不满足前置即不进动作条），对未兑换玩家动作列表与现行为完全一致；`fight_turn` 的 `sk_` 拦截只在 `st.skills` 非空时命中，天然零回归。
4. **has_grade_or 复用不改签名**；`sp_grade` 门槛仅追加约束，不改变评级/复活/点数结算。
5. **组队/多人血统**：技能 `need_bloodline` 依赖 `st.bloodline: Option<String>` 单值，已购血统互斥下技能门槛自洽；多人血统属远期，不在本期设计。
6. **技能与被动叠加避免数值膨胀**：主动 Striking 技能自算 own dmg，不重复累加基因锁/血统被动（避免 40+ FightCfg 数值基线被稀释），弱词克制才 ×1.3~1.6。

---

## 汇报要点

- **文档路径**：`tools/design/skills_system_design.md`。
- **SKILLS 表共 33 条**，8 流派：武道内功 6 · 基因肉躯 3 · 血统天赋 5 · 圣光神术 4 · 科技枪械 4 · 超能NT 4 · 灵能模因 3 · 通用辅助 4；主动 25 / 被动 8；qi 消耗约 12 条、道具 4 条、场次限量 9 条。
- **§4 自由释放**：`fight_actions` 动态追加 `sk_` 动作（与 art/道具同构）+ `action_label` 兜底渲染 + `fight_turn` 拦截；推荐**每场次数 `per_fight_uses` + qi/道具天然限量，不做冷却计时**；建议把现有「绝学 art」统一收编进 SKILLS，engine art 分支保留为通用技能执行通道。
- **§5 兑换页**：新增「技能册」光球/入口，8 流派分页，`route_buy_skill`(Route::Dyn+has_grade_or) + `cond_show_skill`(已购隐藏) + `exchange_name/HUD` 增技能摘要。
- **§6 分区衔接**：技能增量**并入** combat_system_design.md 原包 A'/B'/C'/D'（不另设独立包）；推荐 A→A'→(B∥B')∥(C∥C')→D/D'；红线：`skills:Vec` serde default、不动 FightCfg/BATTLE_MODS、新动作仅新技能触发（零回归 6 副本）。
- **零代码修改**：本代理仅产出此设计文档，未改任何 .rs/前端文件。