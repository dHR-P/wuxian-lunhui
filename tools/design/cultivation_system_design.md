# 修真体系深度设计（无限流修真赛道 · 技能库大流派贯通）

> **文档定位**：设计规格（「做什么」，可落地、不写 Rust 实现代码）。落地由编程子代理按 00_ENGINE_CONTEXT.md 数据模型完成。
> **模型**：tokenrhythm/deepseek-v4-flash-0731。
> **角色声明**：本代理为「无限流·修真体系深度设计」子代理，**本文件为唯一产出，零代码修改**——未改动任何 .rs / 前端 / 存档文件。
> **前置依据**：`tools/design/combat_system_design.md`（战斗体系，全文）、`tools/design/skills_system_design.md`（技能系统 33 条 8 流派，全文）、`design/zhttty_universe/00_INDEX.md`(§二/四 力量体系)、`design/zhttty_universe/00_ENGINE_CONTEXT.md`(数据模型硬约束)、`design/zhttty_universe/{honghuang_li,wuxian_shuguang,xiaxing_tianxia}/00_*_research.md`(三作修真/力量体系节)。
> **模型引用核对**：
> - 洪荒历·正统修真阶梯（`honghuang_li_research.md` §3.1）：**练气→筑基→金丹→元婴→元神→渡劫→仙人**（对应灵位），李四/三清传承。
> - 洪荒历·位阶序列映射（§3.2）：一阶≈杂兵 → 四阶初/中=副本 BOSS 量级（HP 几十~几百）→ 圣位只做残响/演出。
> - 无限曙光·修真（`wuxian_shuguang_research.md`）：楚浩以《青帝万世经》筑基、结顶级金丹；**剑丸**（元神阶剑修）、斗气、十大阵法、都天神雷拳。
> - 侠行天下（`xiaxing_tianxia_research.md`）：内功真气(体质层)→绝学/剑意/心境(终结/怒技层，可挂 san)→武之极境(跨界上层真相)。
> > **标注**：一切世界观数值非设计库铁证者，一律标「建议值·可调」；所有修真名/功法/神通文案为**自创模仿 zhttty 主神兑换条目风格**，不照抄任何受版权原文。

---

## §0 定位与三条铁律

### §0.1 修真在四条被动体系 + 技能大流派中的「角色」

combat_system_design.md §1 已有四条**被动数值成长线**：基因锁 `gene_stage`、血统 `BLOODLINES`、内功 `inner_art/qi`、科技 `tech_shield`；skills_system_design.md 在其上长出「招式层」SKILLS（33 条 8 流派）。

**修真赛道定位**：这是一条**成体系的独立成长线**，不是「内功绝学那一点」的简单加长。它横跨「被动境界成长（新增 cultivate 段）」+「大流派技能库（功法/神通/法宝/禁制四大类，20+ 条并入 SKILLS）」+「法宝格新槽」+「修真阁兑换」。修真与既有四体系**正交但钳制上限**，避免「买满全部 = 数值爆炸」。

| 维度 | 基因锁/血统/内功/科技（四条被动） | **修真赛道（本设计）** |
|---|---|---|
| 成长形态 | 一买即生效的被动数值 | **分阶境界（cultivation_stage，逐阶解锁 qi_max 上限档位）+ 主动神通 + 常驻法宝/被动心法** |
| 资源消耗 | 无/少量 | **神通/阵法耗 qi**（与内功同池）；法宝为「装备格」不带耗 |
| 前置门槛 | 自身 rmb 门槛 | **need_stage(cultivation) 境界门槛** + need_inner_art（与内功衔接）贯穿 |
| 数据形态 | GENE_STAGES / BLOODLINES / qi | **CULTIVATION_STAGES 境界表 + SKILLS 大流派（功法/神通/法宝/禁制）+ TRESURES 法宝表** |
| 战术密度 | 每回合自动生效 | 神通主动入动作条 + 法宝常驻格 + 境界提供被动档位 |

### §0.2 三条铁律（实现时不可违反）

1. **数据驱动**：境界用静态表 `CULTIVATION_STAGES`（阶→qi_max 上限档位/寿元/能力位）；功法/神通/法宝/禁制全部进 SKILLS 表（复用 skills_system_design.md §2.1 `SkillDef`），禁止 `if cultivation_stage==2` 写死 if 链。神通/法宝动作走 `fight_actions` 动态追加，结算查表。
2. **钳制不叠加**：修真提供的 qi_max/被动能力是「独立成长线」，与基因锁/血统被动**上限取钳制或折减叠加**（见 §3），避免「全员满 buff」数值膨胀吞掉 40+ FightCfg 基线。
3. **serde default 兼容（最高红线）**：所有新持久字段 `cultivation_stage` / `sphere` / `treasures` / `sect` 一律 `#[serde(default)]`；`GameState::new` 缺省等效 0/None/空表；不动 FightCfg/FIGHTS/BATTLE_MODS 现有字段与语义；不破坏 playthrough / 6 副本 / migrate_save。

> **与 skills_system_design.md §2.3 的关系**：修真无新增持久字段承载「已购技能」——复用其 `skills: Vec<String>` 同池（功法/神通/法宝/禁制技能 id 一并 push 进 `skills`）。修真额外只需三个新字段：`cultivation_stage`（境界）、`treasures`（法宝格，若走强化槽而非技能）、可选 `sphere`（丹/剑/符流派标签，供技能分页复用）。

---

## §1 修真境界体系（核心）

### §1.1 阶梯设计与对标

**取阶数 = 7 阶**（练气→筑基→金丹→元婴→化神→返虚→合道），根源于 **洪荒历·正统修真阶梯（练气→筑基→金丹→元婴→元神→渡劫→仙人）+ 无限曙光《青帝万世经》筑基/结金丹 + 侠行天下「绝学/剑意→武之极境跨界」上位真相** 的自创缝合：

- 取「练气—筑基—金丹—元婴」为低四阶（副本可控战力区，对齐位阶序列一阶~四阶初，HP 几十~几百、伤害个位~数十）；
- 「化神—返虚—合道」为高三阶（位阶序列四阶中/后，接近副本可控上限即**圣位之下探**）；**合道以上（渡劫→仙人→圣位）做演出/劫难度，不进 fight 数值**，仿真 combat_system_design.md §1.1「圣位下探上限」纪律——修真最高可控阶被封顶在「合道」，再上以境界背景板/渡劫演出呈现。

**为什么对标位阶而非直接抄原阶梯**：洪荒历原阶梯的「元神→渡劫→仙人」跨入灵位/圣位区（00_INDEX §二明确副本可控上限约四阶初/中），而本赛道需要「练到高阶仍能进 FIGHTS 数值」——故把原阶梯后半段压缩为「化神→返虚→合道」三级，作为副本内可控修真顶点。

| 阶 | 名称 | 对标位阶/作品锚点 | 解锁门槛（累计兑换点 + 支线评级 + 前置） | qi_max 上限档（建议值·可调） | 寿元/恢复（建议值） | 标志性能力（自创） |
|---|---|---|---|---|---|---|
| 0 | 未修真（凡体） | — | — | qi_max ≤ 60（复用内功档） | — | 不可施神通（need_stage≥1） |
| 1 | 练气期 | 位阶一阶初 / 侠行内功真气层 | 3000 点 + D | qi_max 上限 **120** | 每场景恢复 hp+8、san+5 | **灵气吐纳**：战斗外/回气点回 qi；被动 san_resist+3 |
| 2 | 筑基期 | 位阶一阶中后 / 《青帝万世经》筑基 | 7000 点 + C（need 练气） | qi_max 上限 **240** | hp 恢复 +12、san+8 | **灵气护体**：受击 fixed reduce-4（无甲也生效）；可学飞行/御剑 |
| 3 | 金丹期 | 位阶二阶 / 楚浩「顶级金丹」 | 15000 点 + B（need 筑基） | qi_max 上限 **400** | 寿元级长存：每场 hp 恢复 +18 | **金丹·心火**：气海自转，每回合 qi 被动回 +4；可学丹火/护体飞钹 |
| 4 | 元婴期 | 位阶三阶 / 剑修剑丸 | 30000 点 + A（need 金丹） | qi_max 上限 **600** | 元神初步：死亡强制留一丝（san 崩坏免疫一次？见装配） | **元婴·神魂出窍**：一次性「神识扫描敌弱词（weak_*/armor）」+ 免 debuff 一回合 |
| 5 | 化神期 | 位阶四阶初（副本可控上限区） | 55000 点 + A（need 元婴） | qi_max 上限 **850** | hp 恢复 +30 | **神意化身**：每场一次「分身替死」（挡一次必死）+ 免疫即死 |
| 6 | 返虚期 | 位阶四阶中（半神） | 90000 点 + S（need 化神） | qi_max 上限 **1100** | 气血绵长：contour 每回合 san 侵蚀 -2 | **返虚·倒映苍生**：战斗内主动「偷取敌方一回合狂暴增益为我用」 |
| 7 | 合道期（顶点·封顶） | 圣位下探 / 武之极境跨界 | 140000 点 + S×1（need 返虚） | qi_max 上限 **1400** | 每场景回满 hp/san 一次 | **合道·天地同游**：每场可「借天地之力」——下一次神通无视 BATTLE_MODS.armor 且 weak 乘算 ×1.5 |
| — | 渡劫/仙人/圣位 | 位阶四阶高/灵位/圣位 | **不开放兑换**（演出级） | — | — | 仅作后排大世界演出/残响，不进 fight 数值（红线） |

> **解构字段**（状态补丁，见 §1.3）。

### §1.2 境界决定 qi_max 上限档位（与既有内功衔接）

combat_system_design.md §1.3：`qi_max` 由内功心法兑换时写入（无名剑诀 +40 / 静心诀 +20）。修真把它做成**独立「档位上限」层**：

```
# 权威规则（建议值·可调）：
qi_max_final = clamp( qi_max_from_inner_art_and_items,   # 内功/心法/丹药累计
                      0, cultivation_stage_cap(cultivation_stage) )   # 修真境界上限档
```

- 内功/丹药先把 `qi_max` 累上去；修真境界提供**天棚**（上限档）。练气 120 → 合道 1400。
- 这样「低级境界 + 顶级内功」会被钳制在档位内，**唯一提升 qi_max 上限的路 = 破境**——修真成为真气系成长的**纵向主线**，内功则是横向资源补充，两者不冲突、不破坏既有兑换。
- **郑重**：`qi = clamp(qi, 0, qi_max_final)` 保持恒等，防止档位下探（理论上境界只升不降，无此问题，但 guard 一下零成本）。

### §1.3 新增持久字段（state.rs，伪签名）

```rust
# GameState 增加（置于 inner_art 之后、skills 之前）
#[serde(default)] pub cultivation_stage: u8,   // 0..=7；0=未修真；权威境界
#[serde(default)] pub cultivation_qi_max: i32, // 当前境界档位（写死表值；可省——查表可得，建议落盘避免重复查）
#[serde(default)] pub treasures: Vec<String>,  // 已装法宝格 id 列表（法宝；非技能，见 §2 类型说明）
#[serde(default)] pub sect: Option<String>,    // 自选修真流派标签（丹/剑/符/阵，供技能分页与 cond_show）
# （说明：功法/神通/禁制技能的「已购拥有」沿用 skills_system_design.md 的 skills: Vec<String>，不新增）
```

- `GameState::new` 缺省：`cultivation_stage: 0, cultivation_qi_max: 0, treasures: vec![], sect: None`——不改变 new() 语义。
- **migrate_save**：无需强制迁移（新字段全 serde default），若需显式屏障建议 `save_version` 递增到 v3 幂等（对齐 combat_system_design.md §5.2）。

**境界表静态表（伪签名）**
```rust
struct CultivationStageCfg { stage:u8, name:&'static str,
    need_points:i64, need_grade:Option<char>, prev:Option<u8>,
    qi_max_cap:i32, hp_regen:i32, san_regen:i32,
    passive:StagePassive /* reduce, san_resist, per_turn_qi, ignore_death, enchant 等位 */ }
const CULTIVATION_STAGES: &[CultivationStageCfg];
fn cultivation_cfg(stage:u8) -> Option<&'static CultivationStageCfg>;
fn qi_max_cap_of(st) -> i32;   // 查表返回阶段档
```

---

## §2 修真功法 / 神通 / 法宝 / 禁制技能路线（20+ 条）

### §2.1 定位与并入方式（关键）

修真技能 = **skills_system_design.md SKILLS「技能库」的大流派扩编**。不新增并行技能体系，全部并入现有 `SKILLS: &[SkillDef]` 总账（skills_system_design.md §2.1/§3）。具体：

- **新增四大子类**，各自映射 `SkillDef` 字段（无需改 `SkillDef` 结构，仅用其既有字段承载）：
  - **功法类**（被动心法/丹田淬炼）：`kind=Passive`，effect=`Passive{ qi_max, dmg_reduce, san_resist, atk_flat, hp_max, per_turn_qi }`（技能表加一列 `per_turn_qi` 可映射 Passive 扩展或并入现有字段，落地时定）。
  - **神通类**（主动）：`kind=Active`，cost=`Qi(n)`，effect=`Striking/SelfBuff/DebuffEnemy`，`need_stage`（境界门槛，非基因step）——**需要新增一个门槛字段**：`need_cultivation: Option<u8>`（境界，而非 `need_stage` 的基因阶；skills_system_design.md §2.1 的 `need_stage` 意义为基因阶，语义需在表内用新字段区分）。
  - **法宝类**（被动/主动装备）：**进 `treasures: Vec<String>`（装备格），不进 SKILLS**——本设计把法宝做成「装备格强化」而非「招式」：装对应本命飞剑/护体法宝 → 常驻被动生效；个别法宝可提供一次性主动（放到神通类）。理由：法宝是「穿戴」，不是「控制学不会即弃」的技能，装备格语义更贴第二章 inventory/inventory 的「装备」概念。
  - **禁制/阵法类**（战斗内 debuff 敌/领域）：`kind=Active`，cost=`Qi(n)`，effect=`DebuffEnemy`（标记/领域化=对敌施加 debuff 回合数 / dmg_over_time），复用 skill一口 DebuffEnemy。

- **需求：`SkillDef` 增列 `need_cultivation: Option<u8>`**（不改类型，仅加字段并用 serde 无关——SKILLS 是编译期静态表，无持久化 serde 风险；与 `need_stage`(基因) 并列，语义互斥：一个技能可两者都要求，也可只要求一个）。

> **说明**：20+ 条修真技能并入 SKILLS 总账，skills_system_design.md §3 总计由 33 条扩至 **33 + 20 = 53 条**；分页照 §5 各大流派「分册」再切细分册「修真·功法/神通/法宝格/禁制」即可（无需新兑换框架）。

### §2.2 功法类（被动心法/丹田淬炼，6 条）`cu_gong_*` / id 前缀

> 被动常驻，提升 qi_max / 回气 / 减伤。兑换即生效，装配式（同部功法只能持一，重复兑换仅叠加描述）。

| id | 名称 | 前置（境界） | 价格+评级 | 被动效果（建议值·可调） |
|---|---|---|---|---|
| cu_gong_qiling | **吐故纳新功**（练气心法） | 练气(1) | 1200 · D | Passive qi_max +40，san_resist+3（呼吸间真气生生不息） |
| cu_gong_dantian | **丹田淬体决** | 筑基(2) | 2800 · C | Passive hp_max+30，dmg_reduce+4（丹田如炉，肉身不坏） |
| cu_gong_zhuque | **朱雀心火法** | 金丹(3) | 6000 · B | Passive 每回合 qi +4（心火自燃）、atk_flat+6（金丹心火添攻势） |
| cu_gong_hunhei | **混元神罡** | 元婴(4) | 12000 · A | Passive dmg_reduce+8，san_resist+8（元婴之神护道周全） |
| cu_gong_daoyin | **太乙导引法** | 化神(5) | 22000 · A | Passive 战斗结束回 qi 全额，hp 恢复 +20（导引天地精气） |
| cu_gong_hecheng | **合道归元气** | 返虚(6) | 40000 · S | Passive qi_max +100，hp_max+60，per_turn_qi+6（返虚气海无边） |

### §2.3 神通类（主动法术/剑术，8 条）`cu_shen_*`

> `need_cultivation`（境界门槛）+ `cost=Qi`。主动入动作条（fight_actions 追加）。耗 qi，靠 qi/境界供给天然限量。

| id | 名称 | 境界门槛 | cost qi | 价格+评级 | 效果（Striking/SelfBuff/Debuff） |
|---|---|---|---|---|---|
| cu_shen_jianren | **剑丸·一线银丝** | 练气(1) | 8 | 1500 · D | Striking dmg(16,24) ignore_armor=false，命中×1（对 armor>0 敌 ×1.3，读 BATTLE_MODS.armor） |
| cu_shen_zhangxin | **掌心雷** | 练气(1) | 6 | 1400 · D | Striking dmg(14,20) weak_electric兼容（对 quantum/机械 ×1.5，读 BATTLE_MODS） |
| cu_shen_yufeng | **御风行** | 筑基(2) | 5 | 2600 · C | SelfBuff dodge_bonus+0.30 一回合（身法+吐息） |
| cu_shen_dunjian | **御剑遁法** | 筑基(2) | 6 | 3000 · C | SelfBuff guard（临时护盾吸收下一击）+ 可越打掉敌狂暴回合（简化） |
| cu_shen_danhuo | **丹火·流焰** | 金丹(3) | 10 | 6000 · B | Striking dmg(30,40) weak_fire 兼容（对弱火敌 ×1.5），hits=1 |
| cu_shen_hunse | **摄魂术** | 元婴(4) | 10 | 12000 · A | DebuffEnemy stun=1（敌下一轮不动）+ dmg(12,18)，对低 san 敌可额外 debuff |
| cu_shen_jianyu | **万剑归宗·雏形** | 元婴(4) | 14 | 15000 · A | Striking dmg(24,30) hits=3（剑丸满银丝，对群体/多段） |
| cu_shen_fankui | **反叩天地** | 化神(5) | 16 | 28000 · A | SelfBuff 下一击 dmg×1.8（神意化身+天地共鸣） |
| cu_shen_daoying | **返虚倒影** | 返虚(6) | 18 | 50000 · S | DebuffEnemy 夺敌一式 buff 三回合（偷狂暴增益为己用） |
| cu_shen_tiandai | **天地同游** | 合道(7) | 22 | 80000 · S | Striking dmg(50,70) ignore_armor=true 且 weak 全 ×1.5（一瞬合道之击） |

### §2.4 法宝类（装备格，6 条）`cu_bab_*`（装进 `treasures`）

> 非 SKILLS——本设计把法宝做成「装备格强化」，装对应本命法宝 → 常驻被动生效（被动数值并入玩家加成阶段查表）。`treasures: Vec<String>` 存已装法宝 id；兑换=装备（replaces 当前同格位，互斥同格位单装）。**法宝常驻**：不回格、不耗 qi。

**法宝格 slot 设计**（建议 3 格：`本命法宝 / 护身法宝 / 辅助法宝`，每格单装，跨格可叠；`treasures` 存 Vec，加载按格位类型去重）。

| id | 名称 | 格位 | 境界门槛 | 价格+评级 | 常驻被动（建议值·可调） |
|---|---|---|---|---|---|
| cu_bab_benming_fejian | **本命飞剑·青锋** | 本命法宝 | 筑基(2) | 4000 · C | atk_flat+8，dmg ×1.1（升满级再强化）；解锁 cu_bab 进阶 |
| cu_bab_hudun_fu | **护体符印** | 护身法宝 | 练气(1) | 2500 · D | 受击 dmg_reduce+6（先盾后甲后本法宝） |
| cu_bab_hunyuan_lu | **混元炉** | 辅助法宝 | 金丹(3) | 9000 · B | 每回合 qi +3，san_resist+5（炉炼真元） |
| cu_bab_wufen_bazhan | **五方幡** | 辅助法宝 | 元婴(4) | 16000 · A | 每场一次免疫一次即死/封印（禁制 debuff 免疫） |
| cu_bab_qiankun_jie | **乾坤袋** | 辅助法宝 | 返虚(6) | 45000 · S | 战斗内可多用一件 FIGHT_ITEMS（道具槽+1）/ HP 上限 +40 |
| cu_bab_qiushui_jian | **秋水神剑** | 本命法宝 | 化神(5) | 30000 · S | atk_flat+12，dmg ×1.2，weak_* 额外 +10%（读弱词叠加） |

> 法宝结算位置：玩家加成阶段并入查表（`apply_treasures(st, out)`，与 combat_system_design.md §1 玩家加成收敛为同一处）；不新增 if 链。

### §2.5 禁制/阵法类（战斗内 debuff 敌/领域，6 条）`cu_jin_*`

> 主动入动作条，耗 qi，效果落 `DebuffEnemy`（标记/领域化）。给敌人上 debuff、克狂暴/减伤。

| id | 名称 | 境界门槛 | cost qi | 价格+评级 | 效果（DebuffEnemy） |
|---|---|---|---|---|---|
| cu_jin_kunxian | **困仙禁制** | 练气(1) | 6 | 1300 · D | DebuffEnemy no_dodge=2（接下来 2 回合攻击必中，禁制锁身） |
| cu_jin_dingji | **定身符** | 筑基(2) | 7 | 2800 · C | DebuffEnemy stun=1（定身一回合） |
| cu_jin_lingri | **临日封印** | 金丹(3) | 10 | 7000 · B | 封印敌狂暴 on_rage / post_kill 3 回合（压制负面转化） |
| cu_jin_zhenmo | **镇魔阵** | 元婴(4) | 12 | 14000 · A | 领域化 DebuffEnemy：敌 dmg 输出 dmg_red 减半 2 回合 + dmg_over_time(8,3) |
| cu_jin_xianzhi | **禁灵罩** | 化神(5) | 14 | 26000 · A | 敌一retch 内 magic/神通类加成失效（next 敌行动减伤），san_resist 我方+8 |
| cu_jin_ruyin | **如印封天** | 返虚(6) | 18 | 52000 · S | DebuffEnemy：封印敌全部 buff（狂暴/再生/regen/aura）2 回合，dmg_over_time(12,3) |

### §2.6 修真技能并入 SKILLS 汇总口径

- **条目数**：20 条新修真技能（功法 6 + 神通 10 + 禁制 6，法宝 **6** 条走 `treasures` 装备格——若项目方愿把法宝也并入 `skills` 变被动技能，则修真 = 26 条全部进 SKILLS。**推荐法宝走 treasures** 以保持「招式 vs 装备」语义分离，故 SKILLS 净增 20 条 → 总计 **53 条**）。
- **id 前缀**：修真新增类用 `cu_*`（自创，避开既有 `sk_ww_` 等；README 注明 `cu_` = cultivation）。为避免与 skills `sk_` 前缀冲突，SKILLS 表内修真技能建议**统一 `cu_` 前缀主 id，同时 `sk_` 前缀作为渲染兼容别名**（action 匹配 `starts_with("sk_")` 外增 `starts_with("cu_")`，见 §4）。
- **与既有「内功绝学 art」关系**：skills_system_design.md §4.4 已把 `art` 收编进 SKILLS（`sk_ww_wenxin`）。修真神通与内功绝学**同池耗 qi、同通道出招**，不重复建第二套；内功心法（无名剑诀/静心诀）保留为「活的资源提供者」，修真功法（cu_gong_*）在其上加境界供给。

---

## §3 修真与现有体系交互（正交但钳制）

### §3.1 修真境界 vs 基因锁 gene_stage —— 两条独立成长线，可叠加但互相钳制上限

| 维度 | 结论 |
|---|---|
| 是否互斥 | **否**。修真(气)与基因锁(肉躯)可兼修——轮回者「神体双修」符合无限流传统（郑吒即基因锁+血统）。 |
| 叠加方式 | 修真提供 **qi_max 档位 + 境界被动（reduce/san_resist/回气）**；基因锁提供 **atk/dodge/finisher_bonus**。二者数值可叠加（都参与玩家加成求和段），**但修真的高额被动（如混元炉 san_resist、金丹段）与基因锁 3~4 阶的数值有折减钳制**——见下。 |
| 上限钳制 | 建议：修真境界与基因锁阶之和的上限工具——`peak_cap`（建议值·可调）：`修真正攻加值 + 基因锁加值` 不得让单次打击突破「四阶初」量级（对齐 00_INDEX 副本可控上限）。落地：在玩家加成求和段加一个**钳制器**（`fn clamp_player_bonus(st)`），对 atk 追加/finisher_bonus 做上限折减（如合计加成 ≥ 某阈值 ×0.6），防止双修满配爆炸。 |
| 兑换经济 | 修真与基因锁共用主神点 + `has_grade_or` 评级门槛，双修需双耗资源与评级（A/S 级都给修真+基因高段），天然约束。 |

### §3.2 修真 vs 血统 BLOODLINES —— 可兼修但主神评级竞争，血统神通与修真神通共用动作条

- **不互斥**：修真(人族道法)与血统(血脉)可兼修，符合无限流（血统是骨架，修真可叠）。两者被动数值都进玩家加成段，**同样受 §3.1 的 `clamp_player_bonus` 总钳制**。
- **专属克制不冲突**：血统技能 `need_bloodline`（如 sk_vamp_frenzy）与修真神通 `need_cultivation` 是不同门槛字段，可同时存在（条件与），不互斥。
- 平衡建议：血统神通与修真神通**共用动作条与 qi 资源**，玩家在有限 qi/每回合中取舍，天然控制两者同时爆发的强度。

### §3.3 修真 vs 真气 qi —— 修真境界提供 qi_max 档位上限，神通耗 qi（§1.2 已定义）

- 核心：**修真 = 纵向拉高 qi_max 的天棚，内功 = 横向补资源**，二者不冲突（§1.2 钳制规则）。
- 神通/阵法作为「耗 qi 主力」扩到修真系，与内功绝学、血统神通同池；`qi` 跨回合持久、修真功法 cu_gong 提供回气被动，共同支撑「连发神通」— 但受 per_turn_qi 上限与钳制约束。

### §3.4 修真 vs BATTLE_MODS（弱词克制）

- 神通/法宝读 BATTLE_MODS 弱词，不新增机制（对齐 skills_system_design.md §6.3）：
  - 掌心雷 → 对 `weak_electric` 敌 ×1.5；丹火·流焰 → 对 `weak_fire` 敌 ×1.5；秋水神剑 weak 额外叠。
  - 修真的「对 armor>0 敌 ×1.3」(cu_shen_jianren)、「无视 armor」(cu_shen_tiandai / 合道) 对齐 BATTLE_MODS.armor 读取。
  - 禁制「镇魔阵/如印封天」→ 压制 BATTLE_MODS.regen/aura/post_kill（读表压制，不改表语义）。

---

## §4 主神兑换修真页（修真阁）

### §4.1 场景/入口

- 在主神 s_nexus 广场新增 **「修真阁」光球**（或兑换目录加「◆ 修真阁」入口，复刻现有 `Route::To`）→ `s_nexus_cultivation` 场景。
- 结构 = 复刻 `s_nexus_exchange` 模式（combat_system_design.md §3 + skills_system_design.md §5.1）：`SceneDef` + `TextSpec::Dyn(|st| text_cultivation(st))` + ChoiceDef 列表 + 分页。

### §4.2 分类

修真阁分四大类页（功法 / 神通 / 法宝格 / 禁制），再加 **破境** 页：

| 分册场景 | 内容 | 拿到的表 |
|---|---|---|
| `s_nexus_cult_gongfa` | 功法（被动心法）6 条 | SKILLS(cu_gong_*) |
| `s_nexus_cult_shen` | 神通（主动）10 条 | SKILLS(cu_shen_*) |
| `s_nexus_cult_fabao` | 法宝格 6 条（装进 treasures） | TRESURE_DEFS(cu_bab_*) |
| `s_nexus_cult_jin` | 禁制/阵法 6 条 | SKILLS(cu_jin_*) |
| `s_nexus_cult_break` | **破境**兑换 | CULTIVATION_STAGES |
| 首页 `s_nexus_cultivation` | 四大类 + 破境入口链接 + 当前境界显示 | — |

- 首页文案（主神兑换条目风格，自创）：**「修真阁」——主神的银色光球微微泛紫：『凡体难逃寿数，道途可逆生死。选一卷道法，把凡胎炼作不灭；修行有尽，那就一界，一界，再一界地破开天际。』** 下分「◆ 功法 / ◆ 神通 / ◆ 法宝 / ◆ 禁制 / ◆ 破境」。

### §4.3 兑换路由与 cond_show（沿既有模式）

```rust
// 普通技能（功法/神通/禁制）——复用 skills_system_design.md §5.3 route_buy_skill
fn cond_show_skill(id) -> impl Fn(&GameState)->bool {
    move |st| !st.skills.contains(&id.to_string())              // 已购隐藏
           // && 境界不足时可加：展示但禁用（或要求前置境界达标才展示，见下）
}
fn route_buy_skill(id) -> impl Fn(&mut GameState)->String {
    move |st| {
        let s = skill(id).expect("skill");
        if st.skills.contains(&id) { return done }
        if st.points < s.price { return fail }
        if !has_grade_or(st, s.need_grade) { return grade_fail }
        if let Some(cs)=s.need_cultivation { if st.cultivation_stage < cs { return stage_fail } }
        st.points -= s.price;
        st.skills.push(id.into());
        done
    }
}
// 法宝——进 treasures 装备格
fn route_buy_treasure(id) -> impl Fn(&mut GameState)->String {
    move |st| { /* 扣点 + has_grade + need_cultivation 校验；按格位替换 st.treasures 内同格项 / push；done */ }
}
// 破境——一次性高额点数 + 评级，写 cultivation_stage
fn route_break_stage(next: u8) -> impl Fn(&mut GameState)->String {
    move |st| {
        let cfg = CULTIVATION_STAGES[next];
        // 前置校验：prev 阶已达、points 充足、has_grade_or(cfg.need_grade)
        // 成功后：st.cultivation_stage = next; st.cultivation_qi_max = cfg.qi_max_cap; clamp qi
        // 演出文案「渡劫·成丹」等
    }
}
```

- **`cond_show` 语义**：已购技能 / 已装法宝隐藏（`s` 无则买）；**境界不足的破境入口展示但 route 校验返回 `s_nexus_cult_stage_fail`（「境界不足，先修到 X 阶」）**；前置境界/评级不足的功法神通也可「展示价+门槛但禁用购买」（对齐 combat_system_design.md §3）。
- **破境需求**：`Route::Dyn` 校验 `prev` 前置 + 点数 + `has_grade_or`；写 `cultivation_stage` + 回满 qi（clamp 到新上限档）+ 结算文案。

### §4.4 Exchange/HUD 扩列

- `exchange_name(st)` / `text_exchange(st)`：报「境界：金丹期」「已掌握修真功法 ×N / 神通 ×M」「法宝：青锋、护体符印」。
- HUD `hud_json`（engine.rs）：增 `cultivationStage/qiMaxCap/sect/treasureList` 摘要；战斗中神通动作条自渲染（复用 fight_actions）。

---

## §5 与 combat_system_design.md §4 分区衔接

### §5.1 修真增量包（A″ / B″ / C″ / D″）并入原包

修真赛道的字段/表/兑换/结算粒度与四条被动体系、技能系统**完全同构**，故**并入原包 A/B/C/D（及 A′/B′/C′/D′），不另设独立包**——理由同 skills_system_design.md §6.1：独立包会重复样板且多一份 scenes.rs/engine.rs 并发冲突面。

| 增量包 | 内容 | 并入位置 | 依赖 | 建议顺序 |
|---|---|---|---|---|
| **A″** | `CULTIVATION_STAGES` 表 + `cultivation_stage/cultivation_qi_max/treasures/sect` 字段（serde default）+ `SkillDef` 增 `need_cultivation:Option<u8>` + `TRESURE_DEFS` 法宝表 + 修真技能进 SKILLS（20 条 cu_*，法宝 6 条进 treasures）+ `cultivation_cfg/qi_max_cap_of/clamp_player_bonus` helper | combat_system_design.md §4 包 A（skills.rs 新模块，含 BLOODLINES/GENE_STAGES/battle_mods 同一模块） | 包 A 字段风格（技能系统 A′ 同批先立） | **第 1 步（A / A′ / A″ 同批或紧随）——唯一硬前置** |
| **B″** | `fight_actions` 追加修真 `cu_*` 神通/禁制动作（与 `sk_` 同通道，`startswith("cu_")`）+ `need_cultivation` 前置判定 + 境界被动（less_reduce/san_resist/per_turn_qi）并入玩家加成查表 + `clamp_player_bonus` 钳制器 + HUD cultivationStage | combat_system_design.md §4 包 B | 需 A″ 字段/表就绪 | **第 2 步（A″ 后可与 C″ 并行）** |
| **C″** | 修真阁光球/四分类+破境页 + `route_buy_* / route_break_stage / cond_show_*` + `has_grade_or` + 境界破境特效文案 + Exchange/HUD 修真摘要 | combat_system_design.md §4 包 C | 可只确认 A″ 签名后即开 | **与 B″ 并行** |
| **D″** | 境界表单测（破境门槛/钳制）、修真技能动作单测、法宝格装配/替换、兑换门槛用例、回归（playthrough/6 副本不红） | combat_system_design.md §4 包 D | 需 A″/B″/C″ merge | **最后** |

### §5.2 推荐实现顺序

**A（原包）→ 并入 A′（技能系）→ 并入 A″（修真）→ (B ∥ B′ ∥ B″) ∥ (C ∥ C′ ∥ C″) → D / D′ / D″**。

- 修真与技能系统同属「数据层 → 结算 → 兑换 → 测试」同构管线，**顺主题主线走**，避免在 scenes.rs/engine.rs 同文件双代理并发冲突。
- 唯一注意：A 与 A″ 若需要同时改 `skills.rs` 模块，应串行（A 先立 skills.rs 骨架，A″ 在其上加 CULTIVATION/TRESURE 表），不并行同文件。

---

## §6 兼容红线清单（对齐 combat_system_design.md §5 & skills_system_design.md §6.3）

1. **必带 `#[serde(default)]` 新字段**：`cultivation_stage`（0 缺省）、`cultivation_qi_max`（0）、`treasures`（vec![]）、`sect`（None）；`GameState::new` 缺省等效不改变 new() 语义。**任何缺 default ⇒ 旧档反序列化失败 = 最高红线**。
2. **旧档迁移**：新字段幂等缺省，无需强制回写；如需显式屏障，`save_version` 递增到 v3（对齐 §5.2），不二次回写、不清空 inventory/flags/fight。
3. **不动 FightCfg / FIGHTS / BATTLE_MODS**：敌人机制语义零侵入；修真只读 `battle_mods` 弱词/armor/regen/aura，**只读不写**，不改表结构。
4. **新动作仅新技能触发 → 零回归**：无修真（`cultivation_stage==0` / `skills` 无 cu_* / `treasures` 空）的旧档与未修真玩家，`fight_actions` 动作列表与现行为完全一致（cu_* 动作不进动作条）；`fight_turn` 的 cu_* 拦截仅在拥有且门槛满足时命中。**6 副本 / playthrough 数值金标准**。
5. **境界提升不影响旧档**：破境是「新增态」，不改 hp/san/points/生存判定基线；钳制器 `clamp_player_bonus` 只在加成求和段生效，无修真/基因满载时零影响。
6. **has_grade_or 复用不改签名**；sp_grade 门槛仅追加约束；多人修真/法宝格互斥为远期。
7. **钳制防膨胀**：双修（修真+基因/血统）通过 `clamp_player_bonus` 折减，避免单次打击突破四阶初量级，保全 40+ FightCfg 数值基线。

---

## 汇报要点

- **文档路径**：`tools/design/cultivation_system_design.md`（本文件，唯一产出，零代码改动）。
- **境界阶梯**：7 阶可控（练气→筑基→金丹→元婴→化神→返虚→合道），根于洪荒历正统修真阶梯 + 无限曙光《青帝万世经》筑基结丹 + 侠行武之极境上位真相的自创缝合；合道以上（渡劫→仙人→圣位）仅演出不进 fight（副本可控上限纪律）。
- **功法/神通/法宝条目**：功法 6 + 神通 10 + 禁制 6 进 SKILLS（20 条 → 技能库扩至 53）；法宝 6 条走 `treasures` 装备格（若并库则修真共 26 条/总 59），id 前缀 cu_*。
- **交互结论**：修真 vs 基因锁可兼修但钳制上限（clamp_player_bonus）；vs 血统可兼修共用动作条/qi；vs qi：修真境界提供 qi_max 档位天棚（纵向），内功补资源（横向）；vs BATTLE_MODS 读弱词克制。
- **修真阁兑换**：主神新增「修真阁」光球 + 四大类分页（功法/神通/法宝格/禁制）+ 破境页；route_buy_* + has_grade_or + cond_show(已购/境界不足隐藏)；破境 Route::Dyn 一次高额点+评级写 cultivation_stage。
- **分区衔接**：修真并入原 A/B/C/D（A″/B″/C″/D″），不另设独立包；推荐 A→A″→(B∥C)→D 顺序，避免同文件双代理冲突。
- **红线**：新字段全 serde default；不动 FightCfg/FIGHTS/BATTLE_MODS；新动作仅新技能触发零回归；境界提升不影响旧档；钳制防膨胀。
- **零代码修改**：本代理仅产出本设计文档，未改任何 .rs / 前端 / 存档文件。