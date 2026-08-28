# 无限流技能库大规模扩充（技能册扩容 · 100+ 线路）

> **文档定位**：设计规格（「做什么」，可落地、不写 Rust 实现代码）。**本文件为 `skills_system_design.md` 的扩充**，沿用其 `SkillDef` 结构 / 字段 / 兑换模式 / 分区（A'/B'/C'/D'），**只新增技能条目，零代码修改**。
> **模型 / 角色声明**：tokenrhythm/deepseek-v4-flash-0731；本代理为「无限流技能库大规模扩充」子代理，与「修真体系」「基因锁体系」两份并行深度设计文档协调分工。
> **数值**：一切均「建议值·可调」，落地以主 agent 回踢为准。技能名 / 文案为**自创模仿主神兑换条目风格**（非照抄任何受版权原文，不照抄原著名）。
> **前置依据**：`tools/design/skills_system_design.md`（现有 33 条，本文件是其扩充）、`tools/design/combat_system_design.md`（四大被动体系 / BLOODLINES 血统 id）、`design/zhttty_universe/*` 七部作品研究（力量体系 / 副本技能灵感：NT 六类、模因、高斯纳米科技、圣职神术、武侠内功）。

---

## §0 核心策略与 id 命名协调（先读）

### 0.1 扩充目标与总量路径

**目标：技能库总量 100+。** 达成路径（三文档 + 本文件四方分工）：

| 来源 | 负责流派 / 内容 | 条数 |
|---|---|---|
| skills_system_design.md（现有） | 8 流派首发 33 条 | 33 |
| **本文件（扩充）** | 深挖既有流派 + 新增修真交叉 / 基因锁通用强化 | **+76** |
| 修真体系文档（并行子代理） | 修真·练气/筑基/元婴 等专属技能（20+） | +20（占位引用） |
| 基因锁体系文档（并行子代理） | 基因锁四阶专属技能、解限技（20+） | +9（占位引用） |
| **合计** | — | **≈ 137+ ≥ 100 ✔** |

> 本文件实际新增 **76 条**（各流派计数见 §1.2），修真 / 基因锁体系新增的 20+ / 9+ 由并行相档单独落地，本文件仅占位引用与协调，**不重复列出其专属条目**（仅补两者交叉的 7 + 3 条）。

### 0.2 id 命名：`skx_` 前缀方案（与三方不冲突）

| 来源 | 占用前缀 | 说明 |
|---|---|---|
| skills_system_design.md（现有 33） | `sk_ww_` / `sk_gene_` / `sk_vamp/_wolf/_zuwu` / `sk_zhanshi` / `sk_holy_` / `sk_tech_` / `sk_nt_` / `sk_meme_` / `sk_util_` | **已占用，本文件不碰** |
| **本文件（扩充 76）** | **`skx_` + 流派子前缀** | 全部新条目统一 `skx_` 开头，与现有 `sk_` 天然隔离，**零碰撞** |
| 修真体系文档（并行） | 建议保留 `sk_xu_` / `sk_lianqi_`（修真） | 本文件为此**预留** `skx_xiu_*` 命名空间做交叉条，修真专属由该文档定义 |
| 基因锁体系文档（并行） | `sk_gene_*` / `sk_zlj_*` | 本文件交叉条用 `skx_gene_*`，**不占用它拟用的 `sk_gene_*` 剩余位** |

**本文件四条前缀明细（全 `skx_` 开头）：**

```
skx_ww_*     武道·内功系（扩充 16）
skx_blood_*  血统天赋系（扩充 9，血统专属并列前缀，含 vampire/werewolf/zuwu/zhanshi/gauss）
skx_holy_*   圣光/神术系（扩充 8）
skx_tech_*   科技/枪械系（扩充 8）
skx_nt_*     超能/NT 系（扩充 9，按 NT 六类细分命名）
skx_meme_*   灵能/模因系（扩充 7）
skx_util_*   通用/辅助系（扩充 8）
skx_xiu_*    修真交叉系（法宝/阵法/符箓，7，与修真文档协调）
skx_gene_*   基因锁通用强化（3，与基因锁文档协调）
```

> 实现时 `SKILLS` 静态表按 id 升序物理合并 33+76 条，两段前缀互不重叠，`skill(id)` 全表线性查找不变，`skills: Vec<String>` 只存已购 id，零迁移成本。

### 0.3 与 skills_system_design.md 的字段 / 效果类型对齐

- 完整复用其 `SkillDef`（id / name / school / desc / price / need_grade / need_bloodline / need_qi / need_stage / kind / cost / effect / per_fight_uses / cooldown）与 `SkillEffectKind`（`Striking` / `SelfBuff` / `DebuffEnemy` / `Passive`）。
- 数值幅度对齐既有基线：Striking 伤害 8~45、SelfBuff hp±/guard/dodge、DebuffEnemy no_dodge/stun/dmg_over_time、Passive 各项小值叠加；**避免数值膨胀红线**（§6.3）——主动技能自算 own dmg，弱词克制 ×1.3~1.6。
- cost 沿用 `Qi` / `Item` / 无（per_fight_uses 限量）；血统门槛 `need_bloodline` 只认 combat_system_design.md `BLOODLINES` 的 id：`vampire`/`werewolf`/`zuwu`/`zhanshi_blood`/`gauss_cyber`。
- 兑换 / 分页 / 分区全部挂靠既有 A'/B'/C'/D' 包（§4），不新建包，不新增引擎能力。

---

## §1 扩充总表（全量新技能 76 条，按流派分组）

> 表列统一：**id / 名称 / kind / cost / 前置(需血统|需基因阶|需内功 qi_max|需支线) / effect（战斗效果）**。价格 / 支线评级见各条文本行「价格 X 点 · 需 Y 支线」。文案为自创模仿主神语气。cooldown 全表 0（沿用 §4.3 建议）。

---

### A. 武道·内功系 `skx_ww_*`（扩充 16，合计 6+16=22）

> 深挖拳/掌/剑/刀/腿/轻功/内功心法 + 点穴/暗器/外功硬功，金庸武侠风自创招名（不照抄原著名）。招式名：八卦游身掌、分筋错骨手、铁布衫、凌波微步（改「踏雪无痕」）、降龙附跺（改）、金钟罩、乾坤一掷、袖里乾坤 等自创变体。

| id | 名称 | kind | cost | 前置 | effect |
|---|---|---|---|---|---|
| skx_ww_bagua | **八卦游身掌** | 主动·掌法 | qi 8 | 无 | Striking dmg(14,20)+dodge_bonus+0.1（游身走位），hit 2 |
| skx_ww_fenjin | **分筋错骨手** | 主动·擒拿 | qi 10 | need_qi 内功 40 | Striking dmg(10,16)+DebuffEnemy stun=1（拆骨使敌一回合不能动） |
| skx_ww_tiebu | **铁布衫** | 被动·外功 | — | need_stage 1 或 need_qi 30 | Passive dmg_reduce+6, guard+5（硬气功常驻，克钝击） |
| skx_ww_jingangzhao | **金钟罩** | 主动·防御 | qi 12 | need_qi 内功 50 | SelfBuff guard+18（临时护盾吸收下一击）持续 1 回合 |
| skx_ww_taxue | **踏雪无痕** | 主动·轻功 | qi 6 | need_qi 内功 30 | SelfBuff dodge_bonus+0.35, san+3（下一击免疫闪避判定，可逃离） |
| skx_ww_suxin | **素心剑** | 主动·剑招 | qi 9 | need_qi 内功 40 | Striking dmg(18,24) ignore_armor 半（无视部分甲）+san+4（心剑两利） |
| skx_ww_zhenqi | **真气护体** | 被动·心法 | — | need_qi 内功 50 | Passive guard+10, sidestep — 加成 dodge_bonus+0.05（真气入周天） |
| skx_ww_dianxue | **定穴指** | 主动·点穴 | qi 8 | need_qi 内功 30 | DebuffEnemy stun=1 + 减闪避（点中要穴，下轮行动减弱） |
| skx_ww_anqi | **袖里飞蝗** | 主动·暗器 | item(飞蝗石) | 无 | Striking dmg(12,18) hits=2（先制，不打近身），per_fight_uses=2 |
| skx_ww_bopi | **破甲铁臂** | 主动·硬功 | qi 10 | need_qi 内功 45 | Striking 对 armor>0 敌人 ×1.5（读 BATTLE_MODS.armor） |
| skx_ww_lianhuan | **连环穿掌** | 主动·连击 | 无 | need_qi 内功 35 | Striking dmg(7,10) hits=3（穿掌连击，可叠暴击），per_fight_uses=2 |
| skx_ww_neigong | **周天养气诀** | 被动·心法 | — | need_qi 内功 60 | Passive qi_max+25, san_resist+2（内功升华，配合 wumian 叠高 qi 池） |
| skx_ww_cangjian | **藏锋于鞘** | 主动·蓄力 | qi 6 | need_qi 内功 40 | SelfBuff 下一火药 attack/torque → 下一击 atk_flat+12（蓄力爆发的非命中收益） |
| skx_ww_shuangji | **双影腿法** | 主动·腿技 | qi 8 | 无 | Striking dmg(9,13) hits=2 + dodge_bonus+0.15（攻守两立的腿法） |
| skx_ww_jueming | **绝命一击** | 主动·刚劲 | qi 16 | need_qi 内功 70 | Striking dmg(35,48) 舍闪避（本回合 no_dodge 免疫，坦职最后一击） |
| skx_ww_qise | **七弦无形剑** | 主动·音剑 | qi 12 | need_qi 内功 60 | Striking dmg(15,22) 对 san 低敌 +dmg（读 san 弱化，克制怨灵/心魔） |

**条目示例文案（主神兑换风格，自创）**：
> **分筋错骨手（竞技场 · 擒拿）**——「主神的掌心是冷的：它在你听骨节的咯咯声时，把『关节是杠杆』这句话烙进本能。卸掉对手的关节，让他连怨恨的动作都做不完。」价格 800 点 · 需 D 级支线 · 需内功根基（qi_max≥40）。战斗中消耗真气 10，拆骨使敌一回合无法行动。
>
> **绝命一击（虚无级 · 刚劲）**——「剑客收剑入鞘，拳师也学会把半生力气藏在腰间——当你把闪避、后路、犹豫全部押上，那一拳就不再是招式，而是决心本身。」价格 2200 点 · 需 C 级支线 · 需雄浑真气（qi_max≥70）。消耗真气 16，舍闪避轰出 35~48 点刚劲。

---

### B. 血统天赋系 `skx_blood_*`（扩充 9，合计 5+9=14）

> 各血统专属主动/被动技，均 `need_bloodline` 门槛。血液 id：vampire / werewolf / zuwu / zhanshi_blood / gauss_cyber（combat_system_design.md BLOODLINES）。gauss 为科技侧预留位，技能标注「需 gauss_cyber」。

| id | 名称 | 血统门槛 | kind | cost | effect |
|---|---|---|---|---|---|
| skx_vamp_shadow | **暗影之潮** | vampire | 主动·潜匿 | qi 8 | Striking dmg(16,22)+SelfBuff dodge_bonus+0.25（蝠翼穿夜的偷袭技） |
| skx_vamp_drain | **生命汲尽** | vampire | 主动·吸血强攻 | qi 10 | Striking dmg(12,18)+ 命中吸血当 dmg×35%（渴血，克疲敌） |
| skx_vamp_coffin | **血棺沉眠** | vampire | 主动·回复 | qi 6 | SelfBuff hp+22（进入假死修复，本回合 no 行动） |
| skx_wolf_howl | **苍狼长啸** | werewolf | 主动·吼威 | qi 6 | DebuffEnemy 敌方闪避 -0.2 一回合 + dmg(8,12)（吼摄心魄） |
| skx_wolf_primal | **野性直觉** | werewolf | 被动 | — | Passive dodge_bonus+0.05, atk_flat+3（兽性预判） |
| skx_zuwu_maul | **祖巫撼地** | zuwu | 主动·地震 | qi 12 | Striking 对全体非机械 ×1.3（撼地范围，克兽潮） |
| skx_zuwu_totem | **祖巫图腾** | zuwu | 被动 | — | Passive dmg_reduce+3, qi_max+15（图腾庇佑，坦线续航） |
| skx_zhanshi_bless | **圣职祝福** | zhanshi_blood | 主动·祝福 | qi 6 | SelfBuff san+10, guard+6（圣祷安抚，克 SAN 侵蚀副本） |
| skx_gauss_sync | **纳米同频** | gauss_cyber | 被动 | — | Passive atk_flat+4, dodge_bonus+0.02（纳米血统与机械共感，预留 gauss_cyber） |

**条目示例文案（自创）**：
> **血棺沉眠（吸血鬼血统技）**——「胸口那一声比呼吸更慢的心跳，就是你与主神签的契约：真正的死亡早已不属于你——必要时，你退回血棺，把伤势留给黎明去清算。」需吸血鬼血统。消耗真气 6，进入假死修复，恢复 22 点生命（本回合放弃行动）。

---

### C. 圣光/神术系 `skx_holy_*`（扩充 8，合计 4+8=12）

> 治疗 / 驱散 / 祝福 / 惩戒 / 复活祈愿，取材《死亡开端》圣职系；复活祈愿为「战斗内先手施放」的保命技（非死亡复活结算，避免侵入死亡流程，见 §4 说明）。

| id | 名称 | kind | cost | 前置 | effect |
|---|---|---|---|---|---|
| skx_holy_heal | **柔和圣光** | 主动·治疗 | qi 10 | need_qi 20 或 zhanshi_blood | SelfBuff hp+30（圣祷回复） |
| skx_holy_flash | **圣光闪** | 主动·对亡灵 | qi 8 | 无 | Striking 对亡灵/怨灵 weak_holy ×1.5 + debuff no_san（克制） |
| skx_holy_bless | **圣辉祝福** | 主动·祝福 | qi 7 | need_qi 20 | SelfBuff guard+10, dodge_bonus+0.1（诸事顺遂一回合） |
| skx_holy_judge | **圣裁之刃** | 主动·惩戒 | qi 12 | need_qi 内功 40 或 zhanshi_blood | Striking dmg(22,30) 圣光纯粹伤害 ×1.3（对不死） |
| skx_holy_smite | **圣言冲击** | 主动·驱暗 | qi 6 | 无 | DebuffEnemy dmg_over_time(6,3) 对怨灵系 + 清除自身一层诅咒 |
| skx_holy_resurrect | **祈愿圣歌** | 主动·护命 | qi 15, per_fight_uses=1 | need_stage 1 或 zhanshi_blood | SelfBuff 本场一次「致死时 HP 保留 1」护祷（先手施放，非改死亡流程） |
| skx_holy_purge | **至净驱散** | 主动·净蚀 | qi 9 | need_qi 30 | 清除多目标诅咒/毒/灼烧 + san+10（净化主场） |
| skx_holy_aura | **圣光领域** | 被动 | — | need_qi 内功 50 或 zhanshi_blood | Passive san_resist+6, dmg_reduce+2（圣光庇佑常驻） |

**条目示例文案（自创）**：
> **祈愿圣歌（圣职·临终祷词）**——「主神把一束蜡烛塞进你手里：圣光不只是毁灭，它更懂『再撑一下』的意义。当你唱起那句老祷文，连死亡的箭头也会在最后一寸犹豫。」消耗真气 15（每场一次），施放后本场第一次致命伤害被免疫，生命保留 1 点。（此为战斗内先手施放的护命技，**不侵入死亡档案/复活结算**。）

---

### D. 科技/枪械系 `skx_tech_*`（扩充 8，合计 4+8=12）

> 取材《无限未来》高斯 / 纳米 / 量子 / 轨道支援 + 《大宇宙时代》文明等级武备。cost 走 item 或 qi，部分需 weapon=Gun 前置。

| id | 名称 | kind | cost | 前置 | effect |
|---|---|---|---|---|---|
| skx_tech_gauss | **高斯点射** | 主动·枪械 | item(高斯电池) | weapon=Gun | Striking dmg(20,26) ignore_armor（高斯弹头穿甲）per_fight_uses=2 |
| skx_tech_rail | **电磁弹道** | 主动·枪械 | qi 8 | weapon=Gun | Striking dmg(14,20) 对机械 weak_electric ×1.6 |
| skx_tech_nanocoat | **纳米镀膜** | 主动·防护 | qi 5 | tech_shield>0 | SelfBuff guard+12 或临时 tech_shield+10（纳米愈合/镀层） |
| skx_tech_drone | **哨戒无人机** | 主动·部署 | qi 10, per_fight_uses=1 | tech_shield>0 或 need_qi 30 | DebuffEnemy 揭露抽离目标（敌方下两回合命中 -0.15）+ 侦察 |
| skx_tech_overcharge | **过载强化** | 主动·爆发 | qi 9 | tech_shield>0 | SelfBuff 下一击 atk_flat+14（纳米过载） |
| skx_tech_quantum | **量子扰动** | 主动·干扰 | qi 12 | need_qi 40 | DebuffEnemy no_san/prevents 必中一回合（量子纠缠锁敌） |
| skx_tech_beacon | **信标锁定** | 主动·支援 | 无 | weapon=Gun, per_fight_uses=1 | DebuffEnemy no_dodge=2（信标标记，炮击必中） |
| skx_tech_emp_grenade | **EMP 手雷** | 主动·克制 | item(emp_grenade) | 无 | Striking 对机械/量子 weak_electric ×1.6 + 脱离电子束缚（数两弹幕） |

**条目示例文案（自创）**：
> **哨戒无人机（军工 · 部署）**——「主神把一枚拇指大的棱镜弹到你掌中：它会先你一步看清你有没有在骗自己——然后替你盯住每一个会在背后捅刀的方位。」消耗真气 10（每场一次），部署无人机会使目标两回合的闪避与反击衰减，同时揭穿隐遁之敌。

---

### E. 超能/NT 系 `skx_nt_*`（扩充 9，合计 4+9=13）

> 取材《大宇宙时代》NT 六类：预知 / 清晰 / 感应 / 耳语 / 传递 / 思考（+延续既有 sk_nt 的念动）。id 按类细分命名。

| id | 名称 | NT 类 | kind | cost | effect |
|---|---|---|---|---|---|
| skx_nt_seeker | **预感法则** | 预知·战前 | 主动·感知 | qi 4 | SelfBuff 下轮伤势闪避免一次（预知路线，dodge_bonus+0.3） |
| skx_nt_omen | **凶兆推演** | 预知·预言 | 主动·预警 | qi 6 | DebuffEnemy 标记「下轮必受创」（敌方下轮命中 -0.1, own atk_flat+6） |
| skx_nt_micro | **微操弹道** | 清晰·精准 | 主动·枪械 | qi 6 | Striking dmg(12,18) hits=2 必中（清晰者显微镜手眼） |
| skx_nt_read | **恶意感应** | 感应·读心 | 主动·探敌 | qi 4 | 揭示敌弱词/狂暴阈值 + DebuffEnemy no_dodge=1（读意锁敌） |
| skx_nt_sympathy | **共鸣同调** | 感应·共鸣 | 主动·增益 | qi 5 | SelfBuff atk_flat+8（共鸣敌我节奏） |
| skx_nt_bp | **黑科技蓝图** | 耳语·研究 | 主动·造物 | item(蓝图) | 解锁一次物品/道具强化蓝图（战斗外用等效 AddItem 组件），战斗内降级为 atk 加成 |
| skx_nt_song | **灵魂之歌** | 传递·回复 | 主动·回复 | qi 6 | SelfBuff hp+16, san+6（念夕空式歌声回魂） |
| skx_nt_hyperspace | **超维视界** | 思考·超算 | 主动·解析 | qi 10 | DebuffEnemy no_dodge=2 + 敌闪避全消（四维推演） |
| skx_nt_shield | **思维力场** | 念动·护盾 | 主动·护盾 | qi 10 | SelfBuff guard +25（延续既有念动力场的高阶版） |

**条目示例文案（自创）**：
> **超维视界（NT·思考者）**——「主神让那颗星星的轨迹在你瞳孔里放慢了三倍：不是世界变慢，是你第一次看清了它『接下来会怎样』——在它做出每个选择之前，你就已把退路封死。」消耗真气 10，两回合内敌方完全无法闪避你的攻击。

---

### F. 灵能/模因系 `skx_meme_*`（扩充 7，合计 3+7=10）

> 取材《无限曙光》模因（概念感染）/ 逆·模因 / 诅咒模因；延续既有 sk_meme（道德印记/心灵链接/概念封锁）。概念性强，用 AbstractDesc 弱词 / san 干扰 / 负面压制写实。

| id | 名称 | kind | cost | 前置 | effect |
|---|---|---|---|---|---|
| skx_meme_echo | **印记回响** | 主动·扩散 | qi 6 | None | DebuffEnemy 已标道德印记的目标对邻近 +15% 伤害传染（蹭概念） |
| skx_meme_narrate | **命名即缚** | 主动·概念 | qi 9 | None | DebuffEnemy 封印敌一个主动狂暴/复位（「它的结局已被写下」） |
| skx_meme_forget | **遗忘低语** | 主动·侵蚀 | qi 8, per_fight_uses=1 | None | DebuffEnemy dmg_over_time(4,3)+san 干扰（敌方战术混乱） |
| skx_meme_wyrm | **概念缠绕** | 主动·锁定 | qi 7 | None | DebuffEnemy no_dodge=2 + 减速（概念缠足） |
| skx_meme_mindshield | **心膜铸盾** | 被动 | — | None | Passive san_resist+5, dmg_reduce+2（对抗模因污染） |
| skx_meme_cursefeed | **诅咒回收** | 主动·逆用 | qi 10 | 诅咒≥1 层 | SelfBuff 把自身诅咒叠层转为 hp+10/层 + san+4（逆用摸因） |
| skx_meme_overwrite | **覆盖叙事** | 主动·翻盘 | qi 14, per_fight_uses=1 | need_stage 2 | DebuffEnemy 重写敌方下回合意图 → 强制其跳过狂暴/多动（概念级打断） |

**条目示例文案（自创）**：
> **覆盖叙事（模因·高阶概念感染）**——「主神没有说话，只让一张白纸慢慢浮现在你面前——真正的力量不是撕碎敌人，而是让他们在故事里『已经输了』。你把『它本回合会暴走』一句划掉，改写为『它停了一瞬』。」消耗真气 14（每场一次，需基因锁二阶段），重写敌方意图，强制其本回合跳过暴走。

---

### G. 通用/辅助系 `skx_util_*`（扩充 9，合计 4+9=13）

> 侦查 / 生存 / 医疗 / 指挥 / 陷阱 / 逃逸 / 士气 / 疗养，工具人万金油。

| id | 名称 | kind | cost | 前置 | effect |
|---|---|---|---|---|---|
| skx_util_scout | **敌情摸底** | 主动·侦查 | 无 | None | 揭示敌 HP/弱词/狂暴阈值/可闪避性（HUD 态，per_fight_uses=2） |
| skx_util_spotter | **鹰眼标记** | 主动·指挥 | 无 | None | DebuffEnemy no_dodge=1（指挥队友集火） |
| skx_util_fieldmed | **战场急救** | 主动·治疗 | item(纱布) | None | SelfBuff hp+18, san+4（含止血）per_fight_uses=2 |
| skx_util_trap | **绊索陷阱** | 主动·布设 | item(绊索) | None | DebuffEnemy dmg(6,10)+ 敌方下一行动被绊（stun=1）per_fight_uses=2 |
| skx_util_retreat | **战术撤退** | 主动·逃逸 | 无 | None | SelfBuff dodge_bonus+0.5 一回合 + 落下逃跑线（高难保命） |
| skx_util_rally | **号令集结** | 主动·指挥 | qi 4 | None | SelfBuff atk_flat+8, san+5（鼓舞士气） |
| skx_util_insect | **尸味掩体** | 主动·遁形 | item(腐肉) | None | SelfBuff dodge_bonus+0.4（伪装活尸骗开敌人，克巡逻加密） |
| skx_util_rations | **干粮补给** | 主动·恢复 | item(口粮) | None | SelfBuff hp+20(且去掉一场半饥饿 debuff) |
| skx_util_heirloom | **祖传医术** | 被动 | — | None | Passive 天然 hp 恢复每场 +hp 8（交换补给的常驻） |

**条目示例文案（自创）**：
> **尸味掩体（奇技·遁形）**——「主神丢给你一团腐肉：死去的味道本身就是最好的隐身袍——只要你舍得把自己腌进那种气味里，连敏锐的巡逻者也会把你归进『不构成威胁』的一类。」消耗 1 份腐肉，一回合内闪避大幅提升，克警报流副本。

---

### H. 修真交叉系 `skx_xiu_*`（5-8 条 → 取 7，与修真体系文档协调）

> **协调声明**：修真专属（练气/筑基/元婴/剑修/金丹 等 20+ 条）由**修真体系并行子代理**出，本文件**不重复**。此处的 7 条是**法宝 / 阵法 / 符箓**三类与「技能册」交叉的通用件，作为修真文档与技能系统的桥梁——需修真根基（以 `need_qi` 或标注「需修真练气」门槛承接，避免与修真文档内部 id 冲突，前缀 `skx_xiu_*`）。

| id | 名称 | 类 | kind | cost | 前置 | effect |
|---|---|---|---|---|---|---|
| skx_xiu_talisman | **火符·炎爆** | 符箓 | 主动·克制 | item(火符) | need_qi 30 | Striking dmg(20,28) 对再生/生物 ×1.3（弱火） |
| skx_xiu_talisman_cling | **雷符·天罡** | 符箓 | 主动·克制 | item(雷符) | need_qi 30 | Striking 对机械/幽魂 weak_electric / weak_holy ×1.5 |
| skx_xiu_flags | **镇魂旗阵** | 阵法 | 主动·阵法 | qi 12 | need_qi 内功 50 | DebuffEnemy 敌方本回合闪避全消 + 惩戒(6,10)（阵法压阵） |
| skx_xiu_seal | **镇山水印** | 法宝 | 主动·封印 | qi 10 | 需修真练气(门槛衔接修真文档) | DebuffEnemy 封印敌一个狂暴/复位（法宝镇压） |
| skx_xiu_spirit | **御灵印** | 法宝 | 主动·召唤 | qi 12 | need_stage 1 | SelfBuff 临时召唤灵体：guard+12 或 atk_flat+10（灵宠协同） |
| skx_xiu_pill | **培元丹** | 丹药 | 主动·回复 | item(培元丹) | None | SelfBuff hp+40（丹药疗伤，恢复大档）per_fight_uses=2 |
| skx_xiu_formation | **五行守御阵** | 阵法 | 被动 | — | need_qi 内功 60 | Passive dmg_reduce+4, san_resist+4（五行兜底，阵法常驻） |

> 以上 7 条的符文/阵/符/丹药均挂「需修真根基」门槛，具体修真层数/耗材定义交由修真文档统一；本文件只给效果与价格建议，**不重复修真专属条目**。

**条目示例文案（自创）**：
> **镇山水印（法宝·镇压）**——「主神把一枚印玺塞进你手里，印面刻着五个你读不出却认得的老字：山不倒，水不流。盖章的对象若想在你面前暴走发狂，那便先问过这方山水的分量。」需修真练气根基。消耗真气 10，封印敌方一次狂暴。

---

### I. 基因锁通用强化 `skx_gene_*`（2-3 条 → 取 3，与基因锁体系文档协调）

> **协调声明**：基因锁四阶专属技能（解限技 / 人格模拟 等 20+ 条）由**基因锁体系并行子代理**出。此处 3 条为「不以具体阶为核心、可自由选用」的**通用强化**，作为技能册与基因锁体系的桥接件（前缀 `skx_gene_*`，不占用其 `sk_gene_*` 命名空间）。

| id | 名称 | kind | cost | 前置 | effect |
|---|---|---|---|---|---|
| skx_gene_overclock | **短暂过载** | 主动·爆发 | 无 | need_stage 1 | SelfBuff 本回合 atk_flat+12、下回合 -6（透支基因潜能） |
| skx_gene_regen | **锁率再生** | 被动 | — | need_stage 2 | Passive 每场 hp 回复 +8（基因锁自愈常驻） |
| skx_gene_sense | **锁定反应** | 被动 | — | need_stage 1 | Passive dodge_bonus+0.04（解放锁率的条件反射） |

**条目示例文案（自创）**：
> **短暂过载（基因锁通用爆发）**——「主神的提示只有半句：锁不是用来锁住你的，是用来让你在必要时把它松开。当你把锁率拉到极限，那一瞬你就是此世最锋利的刃。」需基因锁一阶。本回合攻击大幅提升，但下一回合会短暂脱力。

---

## §1.2 扩充计数与总量核对

| 流派 | 现有（skills_system_design） | **本文件新增** | 合并小计 |
|---|---|---|---|
| 武道·内功 | 6 | **16** | 22 |
| 基因·肉躯 | 3 | **+3（`skx_gene_*` 通用强化）** | 6 |
| 血统天赋 | 5 | **9** | 14 |
| 圣光/神术 | 4 | **8** | 12 |
| 科技/枪械 | 4 | **8** | 12 |
| 超能/NT | 4 | **9** | 13 |
| 灵能/模因 | 3 | **7** | 10 |
| 通用/辅助 | 4 | **9** | 13 |
| 修真交叉（新分流） | 0 | **7** | 7 |
| 基因锁通用（新分流） | 0 | **3** | 3 |
| **本文件新增合计** | — | **76** | — |

> 新增合计 = 16+9+8+8+9+7+9+7+3 = **76 条**（§1-G 表列为 9 条，含 `skx_util_heirloom`；基因锁通用 3 条计在 I 分流）。本文件新增的 76 条合计到原 33 条之上。
>
> **总量核对（最终达成 100+）：**
> - 现有 `skills_system_design.md` 33 条（武道6+基因3+血统5+圣光4+科技4+NT4+模因3+通用4）。
> - 本文件新增 **76** 条 → **33+76 = 109 条**（单看「技能册」本就破百 ≥100 ✔）。
> - 修真体系文档（并行子代理）预计 +20 修真专属；基因锁体系文档（并行）预计 +20 基因专属 → **109+20+20 = 149 条**，远超 100 ✔。
> - 最低安全线：即便修真/基因锁文档各只补 5 条，109+5+5 = **119 仍 >100**；仅本文件 76 条 + 原 33 条 = 109 已单独超过 100。

---

## §2 与 skills_system_design / cultivation / gene_lock 三文档的协调

### 2.1 分工矩阵（谁负责什么）

| 流派 | 职责归属 | 说明 |
|---|---|---|
| 武道内功 / 血统 / 圣光 / 科技 / 超能NT / 灵能模因 / 通用辅助 | **本文件（扩充）+ skills_system_design（现有）** | 深挖既有流派由本文件负责，不与修真/基因锁文档重合 |
| 修真体系（练气/筑基/剑修/金丹/筑基 专属 20+） | **修真体系文档（并行子代理）** | 本文件仅补「法宝/阵法/符箓」交叉 7 条作为桥接（§1-H），注明需修真根基 |
| 基因锁四阶专属（解限/人格模拟/心门 20+） | **基因锁体系文档（并行子代理）** | 本文件仅补「通用强化」3 条（§1-I），标注需具体阶可调 |
| 战斗结算 / 兑换 / HUD / 分区 | 均挂靠现有 A'/B'/C'/D' 包（skills_system_design §6） | 本文件只在静态表里加条目，**零引擎新增** |

### 2.2 不重复的三条铁律

1. **技能 id 全表唯一**：现有 `sk_*` 与本文件 `skx_*` 两段前缀物理不重叠；修真 `sk_xu_*` / 基因锁 `sk_gene_*` 预留位本文件**不触碰**，只分给修真文档 / 基因锁文档。
2. **内容不重做**：修真专属剑诀/金丹、基因锁专属解限，本文件一律只写「占位引用 + 协调声明」，不列出具体条目（避免与并行文档撞车）。
3. **数值不膨胀**：主动 Striking 技能自算 own dmg，不重复累加基因锁/血统被动，弱词才 ×1.3~1.6（对齐 skills_system_design §6.3 红线）。

### 2.3 并行落地顺序建议

- 修真 / 基因锁两份深度设计先产专属条目 → 主 agent 把三份技能表物理合并进 `SKILLS` 静态表（id 去重）→ 编程子代理按 skills_system_design §4/§5 接入 `fight_actions`+兑换分页。本文件 76 条可**独立先行落地**，不阻塞修真/基因锁文档。

---

## §3 兑换页归类（挂进主神「技能册」分页）

沿用 skills_system_design §5 的「技能册」光球 + 流派分页。**扩充后分页需扩到 9 大分流**（新增「修真交叉」「基因锁通用强化」，并把「血统天赋」独立为一大本）：

| 分页分册 | 现有条目 | 本文件新增 | 合计 | 中间场景建议 |
|---|---|---|---|---|
| 武道·内功 | 6 | 16 | 22 | `s_nexus_skills_wushu`（沿用） |
| 基因·肉躯 | 3 | +3（`skx_gene_*` 桥接） | 6+ | `s_nexus_skills_gene` |
| 血统·天赋 | 5 | +9 | 14 | `s_nexus_skills_blood` |
| 圣光·神术 | 4 | +8 | 12 | `s_nexus_skills_holy` |
| 科技·枪械 | 4 | +8 | 12 | `s_nexus_skills_tech` |
| 超能·NT | 4 | +9 | 13 | `s_nexus_skills_nt` |
| 灵能·模因 | 3 | +7 | 10 | `s_nexus_skills_meme` |
| 通用·辅助 | 4 | +9 | 13 | `s_nexus_skills_util` |
| 修真·交叉（新分页） | 0 | +7 | 7 | `s_nexus_skills_xiu`（新增分册，修真专属将来并入此册或新增 `..._xiu_core`） |

> **分页实现**：技能册首页轮列出 9 大分流分支链接（比对现有 8 分流多出「修真交叉」），每条 entry 沿用 `text_exchange` 小说风格（价格+支线+前置+流派标签+一句 desc）。修真专属 20+ 条若落地面世，再开 `s_nexus_skills_xiu_core` 子分册，与交叉分册区分（避免修真文档 id / 分页撞车）。
> **兑换逻辑零改动**：`cond_show_skill(id)` / `route_buy_skill(id)` / `has_grade_or` 都是参数化的，加新分册 = 加 `SceneDef` 分支 + 在 `SKILLS` 表列条目即可，`route_buy_skill` 签名不变。

---

## §4 分区衔接（并入现有 A'/B'/C'/D' 包，无新包）

> 完全复用 skills_system_design §6 的四增量包划分，本文件**仅扩充静态表条数**，不新增任何字段/通道/渲染。

| 增量包 | 内容（本文件影响） | 说明 |
|---|---|---|
| **A'**（数据层地基） | `SKILLS: &[SkillDef]` 由 33 条 → **109+ 条**（加入本文件 76 条 + 修真/基因锁文档条目）；`skill(id)` / `skills_owned()` / `skill_usable_in_fight()` 逻辑不变 | 条目增多不影响查询（O(n) 表查找），无新字段 |
| **B'**（engine 结算） | `fight_actions` 对 `sk_` / `skx_` 前缀同判；`action_label` 兜底对 `starts_with("sk_")` 与 `starts_with("skx_")` 都查表 | 需 `action_label` 兜底扩展为「前缀 sk_ 或 skx_ 都查 SKILLS」（一行改，复用现有渲染）。`fight_turn` 拦截逻辑不变 |
| **C'**（兑换+HUD） | 技能册分页扩到 9 分流（§3），新增 `s_nexus_skills_xiu`；`route_buy_skill` / `cond_show_skill` 参数化不变 | 仅内容配置，零引擎改动 |
| **D'**（测试） | 新增技能兑换门槛 / 动作执行的批量用例（覆盖新 76 条的代表项） | 追加用例，不回退既有 |

> **唯一工程注意点**：`action_label` 的渲染兜底原判 `act.starts_with("sk_")`，本文件新前缀 `skx_` 需同样被识别——建议兜底令为 `act.starts_with("sk")`（同时覆盖 `sk_` 与 `skx_`），或显式并列两前缀；此为一行级兼容处理，不属于新引擎能力，落地时在 B' 包顺带处理即可。

---

## 汇报要点（结构化）

- **文档路径**：`tools/design/skills_library_expansion.md`（本文件，零代码修改，仅产出此文档）。
- **新增技能条数（按流派计数）**：武道·内功 16 / 血统天赋 9 / 圣光神术 8 / 科技枪械 8 / 超能NT 9 / 灵能模因 7 / 通用辅助 9 / 修真交叉 7 / 基因锁通用强化 3 = **76 条**。
- **最终总量核对（≥100 达成）**：现有 33 + 本文件 76 = **109**（单本技能册已破百）→ +修真文档（+20）→ **129**；+基因锁文档（+20）→ **≈149**，远超 100 ✔；最低安全线（修真/基因锁各仅补 5）仍 **119 > 100**。
- **id 命名协调**：本文件统一 `skx_` 前缀 + 流派子前缀（`skx_ww/blood/holy/tech/nt/meme/util/xiu/gene`），与现有 `sk_*` 物理隔离零碰撞；修真 `sk_xu_*` / 基因锁 `sk_gene_*` 命名空间**留给并行文档**，本文件不占。
- **与三文档分工**：skills_system_design 负责既有 33 + 结构/兑换/分区；本文件深挖既有流派 + 修真/基因锁交叉桥接件；修真/基因锁文档负责各自专属系统性技能（本文件只占位引用不重做）；落地按 skills_system_design §6 A'/B'/C'/D' 分区并入，唯一工程点是 `action_label` 兜底前缀识别扩展到覆盖 `skx_`。