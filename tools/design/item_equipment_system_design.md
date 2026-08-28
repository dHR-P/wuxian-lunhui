# 无限流道具与装备系统设计（无限流全谱系 · 主神道具铺）

> **文档定位**：设计规格（「做什么」，可落地、不写 Rust 实现代码）。落地由编程子代理按 00_ENGINE_CONTEXT.md 数据模型完成。
> **模型**：tokenrhythm/deepseek-v4-flash-0731。
> **角色声明**：本代理为「无限流·道具与装备系统设计」子代理，**本文件为唯一产出，零代码修改**——未改动任何 .rs / 前端 / 存档文件。
> **前置依据**：`tools/design/combat_system_design.md`（战斗体系，全文，含 FIGHT_ITEMS 方案 A / BATTLE_MODS / GameState 现状 / 兑换 Route::Dyn+has_grade_or）、`cultivation_system_design.md`（修真 treasures 三格）、`skills_system_design.md`（技能库 SKILLS / 战斗内道具 item 消耗）、`gene_lock_system_design.md`（基因锁）、`design/zhttty_universe/00_INDEX.md`（§五 复用矩阵「兑换券/凭证类掉落」行、§7.2 引擎最小改动、§四各副本掉落物 + §四跨副本掉落）、`00_ENGINE_CONTEXT.md`（inventory / AddItem / GateDef need_item / Weapon）、`server-rs/src/{state,defs,engine,world,scenes*}.rs`（现行数据模型与真实道具 id）。
> **标注**：一切数值为「建议值·可调」；道具名/文案为**自创模仿 zhttty 主神兑换条目风格**（不照抄任何受版权原文）；复用现 engine 真实掉落 id（AddItem 句式，见 §1.4 清单）。
> **硬约束**：本文件为唯一产出；零代码修改；不部署；不动 FightCfg / FIGHTS / BATTLE_MODS 现有字段语义。

---

## §0 现状盘点与三条铁律

### 0.1 现行数据锚点（权威在 server-rs/src/）

- **GameState**（state.rs）：`hp/san/points/weapon: Option<Weapon>/ammo/gene_lock/gene_lock_used/flags/inventory: Vec<String>/dead_team/sp_grade: Option<char>/str_bonus/agi_bonus/bloodline: Option<String>` 等，全部 `#[serde(default)]`；`save_version:u32`（现 2）。已有的体系扩展文档新增（未落盘或半落盘，设计层对齐）：`gene_stage/qi/qi_max/inner_art/tech_shield/tech_shield_max/skills: Vec<String>/cultivation_stage/cultivation_qi_max/treasures: Vec<String>/sect`。
- **Weapon 枚举**（state.rs）：`Axe(消防斧 22-34)/Gun(9mm 14-20，ammo 6)/Sword(军刀 10-16)`，`name()/dmg()` 内联；无档位、无伤害类型、无特殊属性。
- **inventory 语义**：`world.rs add_item` **去重唯一**（同 id 只持一）；承载门禁/剧情/兑换券道具，无计数、无战斗语义。
- **战斗结算**（engine.rs fight_turn）：`base` 按武器 dmg 计算（枪 `rnd(14,20)`、斧 `rnd(22,34)`、刀连击 `rnd(10,16)×hits`），再追加基因锁/str_bonus/吸血鬼吸血；当前为「内联 if 链 + 每武器一段」，扩展武器数会变成第 N 段 if。**物质扩展必须改为数据驱动。**
- **兑换**（scenes.rs s_nexus_exchange / s_weapon）：`COST_*` 常量 + `route_exchange_*`（Route::Dyn）+ `cond_show_*` + `exchange_name/text_exchange`；s_weapon 初始三把 Weapon 该。combat/skills/cultivation 文档已给出 `has_grade_or(st, need)`（sp_grade 门槛）与「数据字段全 serde default」纪律。
- **战斗内道具接口**：combat_system_design.md §2.3 方案 A——`FIGHT_ITEMS: &[(id, FightItemEffect)]` 白名单，`fight_actions` 追加 `item_<id>` 动作，`fight_turn` 拦截消耗。skills_system_design.md 复用同一通道做消耗 item 的技能。

### 0.2 三条铁律（贯穿全案）

1. **道具是全谱系的静态表 + 统一查表**：所有道具定义进静态表（`ITEMS` / `FIGHT_ITEMS` / 装备 `WEAPON_CFG`/`GEAR`/`TRESURE_DEFS`），战斗/兑换/门禁/合成一律查表；**禁止**第 N 种道具再写 if。与 BLOODLINES/GENE_STAGES/SKILLS 同构。
2. **所有新持久字段必带 `#[serde(default)]` + 迁移管线**：`equipment` 结构、inventory 计数迁移（见 §2）全部幂等；不破坏 playthrough / 6 副本 / migrate_save。
3. **零侵入现有 Weapon 枚举与 inventory 去重语义**：武器升级/多档走**旁附表**，不改 `Weapon` 字段结构；inventory 计数用**拆 id 零侵入方案**为主（见 §2.2），不强制改现有 `Vec<String>` 容器类型。

---

## §1 道具总分类（无限流全谱系，5 大类）

> 类别与数量：**武器 10 / 护具装备 12 / 消耗品 16 / 圣物凭证 12 / 任务剧情 12+**。每类给「结构 / 示例 / 数值（建议值·可调）」。凡 `id` 前缀复用现 engine 真实 id 的，标注 `〔现〕`；新增统一自创前缀。

### 1.1 武器类（现 Weapon 枚举 → 多档 + 升级）

**结构**（伪签名，见 §2.3 `WEAPONS` 表）：`id / name / tier(档位0-4) / dmg:(i32,i32) / ammo:Option<(现量, 上限)> / dmg_type: enum{kinetic,energy,holy,silver} / special: Vec<WeaponSpecial> / base_price / need_grade`。

**damage type（伤害类型）** 接 combat_system_design.md §1.4「高斯武器伤害类型标记」预告——`kinetic`(动能/实体弹) / `energy`(能量/电) / `holy`(圣光) / `silver`(银)，配 BATTLE_MODS 的 `weak_*` 克制做 ×1.3~1.6。首版仅加字段 + HUD 展示，克制乘算是 v2 预告（对齐 combat）。

**special（特殊属性，取若干）**：`leech`(吸血 X) / `pierce`(破甲，无视 BATTLE_MODS.armor X) / `burn`(灼烧，dmg_over_time) / `stun_chance` / `silver_hit`(对不死/狼人 ×1.5，读弱词)。

| id | 名称（自创模仿主神风格） | tier | dmg | ammo | dmg_type | special | price·评级 | 备注 |
|---|---|---|---|---|---|---|---|---|
| `wp_axe` | 消防斧 | 0 | 22-34 | — | kinetic | — | 初始自选 | 〔现 Weapon::Axe〕
| `wp_gun9` | 9mm 手枪 | 0 | 14-20 | (6,6) | kinetic | — | 初始自选 | 〔现 Weapon::Gun〕
| `wp_sword` | 军用刺刀军刀 | 0 | 10-16×hits | — | kinetic | — | 初始自选 | 〔现 Weapon::Sword〕
| `wp_katana` | 精锻武士刀 | 1 | 16-24×hits | — | kinetic | pierce2 | 1200·C | 剑冢/机关城产线
| `wp_gauss` | 高斯手枪 | 1 | 20-30 | (10,10) | **energy** | weak_electric×1.3 | 1400·— | 〔现 gj_pistol〕末世/沙丘
| `wp_emi` | 电磁脉冲枪 | 2 | 24-36 | (8,8) | **energy** | stun_chance0.15 | 3000·B | 量子遗迹产线
| `wp_holy_sword` | 圣裁十字剑 | 2 | 26-38 | — | **holy** | weak_holy×1.5 | 3600·B | 死雾镇产线
| `wp_silver_gun` | 礼装银弹手枪 | 2 | 22-34 | (6,6) | **silver** | 对不死×1.5 | 3400·C | 摩瑞亚产线
| `wp_cu_ju` | 问心·青锋剑 | 3 | 30-46 | — | kinetic | pierce4 + dmg×1.1 | 8000·A | 修真灵剑，parallel cu_bab
| `wp_quantum_core` | 量子核心振荡剑 | 3 | 34-50 | — | **energy** | weak_electric×1.5 | 11000·A | 量子遗迹/大裂隙产线

**武器升级（强化伞，见 §4.3）**：每把武器可有 `+0 ~ +N`，每级 `dmg 上/下限 +2/+3、pierce（若有）+1、price 递增`；上限建议 `max_enhance=5`（建议值·可调）。这是「强化体系」用户点了要做的部分。

**弹药**：枪械 `ammo` 结构与现 `st.ammo` 关联——**首版保留 `st.ammo` 单一计数**（当前枪武器世界共用 6 发）；多武器独立弹匣属 v2（需要把 ammo 拆到 equipment 每武器下，见 §2.3 兼容说明）。弹药补给=「弹药盒」消耗品（见 §1.3）。

### 1.2 护具 / 装备类（护甲、饰品、法宝）

**结构**（伪签名，见 §2.3 `Equipment`/`GEAR`/`ARMOR`/`TRESURE_DEFS`）：`slot: Weapon|Armor|Accessory|Treasure(本命/护身/辅助)` + 常驻数值段。

**护甲（Armor）**：减伤，接 combat_system_design.md §2.1「先盾(技术护盾)后甲(armor)」——装备护甲提供 `dmg_reduce`。
**饰品（Accessory）**：属性加成（atk_flat/dodge_bonus/san_resist/qi_max/hp_max）。
**法宝（Treasure, 修真三格）**：衔接 cultivation_system_design.md §2.4——`本命法宝 / 护身法宝 / 辅助法宝` 三格，`treasures: Vec<String>` 已承载，本系统把「装备格」统一起来（法宝格并入 Equipment 的 treasure 槽，见 §2.3 兼容）。

| id | 名称 | slot | 常驻数值（建议值·可调） | price·评级 | 备注 |
|---|---|---|---|---|---|
| `gear_police_vest` | 警用防弹背心 | Armor | dmg_reduce+4 | 900·D | 异形产线，初始可买
| `gear_kevlar` | 凯夫拉防弹衣 | Armor | dmg_reduce+7 | 2200·C | 末世死城产线
| `gear_elven_cloak` | 精灵斗篷 | Armor | dmg_reduce+5, dodge+0.05 | 2800·C | 〔现 elven_cloak〕摩瑞亚
| `gear_mithril_vault` | 秘银护甲 | Armor | dmg_reduce+10 | 6000·B | 摩瑞亚产线，对战炎魔受减克
| `gear_nano_vest` | 纳米作战服 | Armor | dmg_reduce+12 | 9000·A | 无限未来产线
| `access_strength_ring` | 蛮力指环 | Accessory | atk_flat+6 | 1200·D | 通用
| `access_agility_boots` | 追风靴 | Accessory | dodge+0.06 | 1300·D | 通用
| `access_san_locket` | 安魂吊坠 | Accessory | san_resist+6 | 1600·C | 死雾镇产线
| `access_qi_belt` | 聚气腰带 | Accessory | qi_max+30 | 1800·C | 修真产线
| `su_bab_benming` | 本命飞剑·青锋 | Treasure(本命) | atk_flat+8, dmg×1.1 | 4000·C | 〔接入 cu_bab_benming_fejian〕修真
| `su_bab_hudun` | 护体符印 | Treasure(护身) | dmg_reduce+6 | 2500·D | 〔接入 cu_bab_hudun_fu〕修真
| `su_bab_hunyuan` | 混元炉 | Treasure(辅助) | 每回合 qi+3, san_resist+5 | 9000·B | 〔接入 cu_bab_hunyuan_lu〕修真

> 说明：法宝三格由 cultivation 文档已设计（`cu_bab_*`），本系统**不重复设计数值**，只在「装备格宿主 `equipment`」上把法宝纳入统一定义与装配入口（§2.3）。上面五行仅为「接入占位」，详细数值以 cultivation_system_design.md §2.4 为准。

### 1.3 消耗品类（药品 / 弹药 / 投掷 / 符箓 / 卷轴）

**结构**（伪签名，见 §2.4 `ITEMS`）：`id / name / kind(consumable) / sub: Heal|San|Ammo|Throw|Charm|Scroll / effect / usable_in_fight:bool / max_stack / price`。

**战斗内可用（usable_in_fight=true，走 combat §2.3 方案 A）**，其余仅主神/战斗外场景使用：

| id | 名称 | sub | 效果（建议值·可调） | 战斗中 | price |
|---|---|---|---|---|---|
| `item_medkit` | 强效医疗包 | Heal | HP +50 | 是 | 700 |
| `item_bandage` | 紧急绷带 | Heal | HP +18 | 是 | 220 |
| `item_sedative` | 镇静剂 | San | SAN +20 | 是 | 320 |
| `item_bottle_water` | 口袋圣水 | Heal | HP+8 / 对怨灵投掷×1.5 | 是 | 180 |
| `item_holy_water` | 圣水 | Throw | 对怨灵/亡灵 fight ×1.5 一击 + 终结加速 | 是 | 400 |
| `item_silver_bullet` | 银弹 | Throw | 消耗 1，攻击 +400% 一次（对狼人/不死） | 是 | 520 |
| `item_torch` | 火把 | Throw | 施加 weak_fire 当战斗 3 回合 | 是 | 260 |
| `item_lure` | 诱水剂 | Throw | BOSS 脱水终点：止 regen + 60 伤害 | 是 | 480 |
| `item_grenade` | 燃烧手雷 | Throw | 对目标 dmg 60-80 一次性 | 是 | 900 |
| `item_quzhen_fu` | 驱邪符 | Charm | 免疫一次即死/封印（post_kill） | 是 | 1500 |
| `item_jiezhou_fu` | 解咒符 | Charm | 解除毒/诅咒/灼烧持续状态 | 是 | 600 |
| `it_qixue_dan` | 气血丹 | Heal | HP +80（战斗外） | 否 | 480 |
| `ammo_crate` | 弹药盒 | Ammo | ammo 回满（当前世界枪） | 否 | 150 |
| `gj_grenade` | 军用手雷 | Throw | dmg 45-60 | 否 | 200 |
| `item_antidote` | 净化血清 | Heal | 解毒/诅咒并 HP+8 | 是 | 420 |
| `item_anesthetic` | 麻醉剂 | Heal | 战斗外 HP-不，敌方束缚 flag | 否 | 200 |

> 弹药盒与现 `ammo` 语义：`ammo` 是全局单一计数（当下枪世界子弹），`ammo_crate` 在 `Route::Dyn` 校验有枪且有 ammo<上限时回 `st.ammo = 上限`；多武器独立弹药 v2。

### 1.4 圣物 / 凭证类（门禁 + 兑换门槛）

> **结构**：`id / name / kind(reliquary) / purpose: Gate|ExchangeCoupon|Key / drop_source / price(若可兑)`。这是现 engine **掉落最密集的一类**——绝大多数真实 AddItem 都是门禁钥匙/兑换券/收集凭证。下表用**现 engine 真实 id**（grep scenes_* 所得），不做重命名。

| id | 名称 | purpose | 掉落副本（search 来源） | 备注 |
|---|---|---|---|---|
| `adrenaline` | 肾上腺素 | 门禁/剧情 | 蜂巢厨房 〔现〕 | 回 hp+30 场景级
| `lab_badge` | 实验室员工卡 | Gate need_item | 蜂巢 〔现〕 | 
| `firstaid` | 急救喷雾 | 门禁/恢复 | 蜂巢 〔现〕 | HP +30
| `yiy_key_med` / `yiy_pulse` / `yiy_em_restraint` / `yiy_embryo_sample` | 医疗钥匙/电磁脉冲装置/束缚装置/胚胎样本 | Gate+兑换券 | 异形4 〔现〕 |
| `item_ghost_key` / `item_toshio_key` / `item_buddha` / `item_diary` / `item_cat_food` | 鬼/俊雄钥匙/佛珠/日记/猫粮 | Gate+仪式 | 咒怨 〔现〕 |
| `item_chushe_sample` / `item_chushe_blood` / `item_core_crystal` | 初蛇基因样本/初蛇血/核心晶石 | Gate+**跨副本兑换券** | 天蛇 〔现〕（样本=跨副本券）
| `item_gene_card` / `item_seal_pass` / `it_qixue_dan` | 基因卡/封印通行证/气血丹 | Gate | 天蛇/机关城 〔现〕 |
| `item_diling` / `item_lou_bone` / `item_jiche` / `item_key` | 地灵信物/驼兽骨/机枢钥匙/通令 | Gate | 银色大地 〔现〕 |
| `beast_core` | 巨兽晶核 | 兑换券 | 末世死城 〔现〕 |
| `mithril_key` / `mithril_block` / `elven_cloak` | 秘银钥匙/秘银矿/精灵斗篷 | Gate+兑换 | 摩瑞亚 〔现〕 |
| `it_gear_key` / `it_gear_token_a/b/c` / `it_pivot_key` / `it_mo_ling_a/b` | 齿钥/枢机令三枚/枢机钥/墨令 | Gate+终结材料 | 机关城 〔现〕 |
| `item_record_1..8` | 失败品残页档案 | 收集凭证(flag 计数) | 天蛇 〔现〕 | 不占战斗数值

**规划的「交易/兑换凭证」等价物**（在主神道具铺上「圣物」分页出售，新增）；这些是自创 id，供兑换券类掉落复用 blueprint：

| id | 名称（自创） | purpose | price·评级 | 说明 |
|---|---|---|---|---|
| `it_soul_shard` | 灵魂碎片 | ExchangeCoupon | 500·D | 通用凭证，可合成或折点
| `it_genome_alpha` | 基因样本·α | ExchangeCoupon(Gene) | 2000·C | 基因锁兑换替代门槛凭证
| `it_core_sample` | 能量核心残片 | ExchangeCoupon(Tech) | 1800·C | 科技侧兑换券
| `it_techniques_talisman` | 驱邪镇宅符 | Gate+兑换 | 1500·C | 〔规划=item_quzhen_fu 供肉用〕→ 本行指「圣物载体」
| `it_cross_key` | 圣徽钥匙 | Gate | 900·D | 死雾镇圣徽
| `it_cross` | 圣徽 | Gate need_item | 1200·D | 钟楼隐藏区
| `it_secret_key` | 秘匣钥匙 | Gate | 700·D | 机关城密匣
| `it_box_mi` | 密匣信物 | 结局凭据 | 300·D | 机关城三分支

### 1.5 任务 / 剧情道具（纯 flag 载体，不占战斗数值）

> `kind=quest`，进 inventory 仅作 `flag`/`need_item` 判定，无 effect、无数值、**绝不出现在 FIGHT_ITEMS**。复用现 id（多为场景拍档），新增自创通行证：

`item_diary`(日记·真相)、`item_letter`(预警信)、`corpse_key`、`data_chip`(数据芯片·真相)、`beam_core`(光束核心)、`yiy_embryo_sample`(胚胎样本·剧情)、`item_hope_light`(希望火种·天蛇)、`item_shoucheng_letter`(守城陪书·机关城)、`it_vault_pass`(宝库通行证)。凡 `quest` 类统一 `usable_in_fight=false`、`max_stack=1`、`kind=quest`。

---

## §2 数据结构设计（伪签名）

### 2.1 inventory 计数问题与方案（A vs B，**推荐 A**）

**现状**：`inventory: Vec<String>` + `add_item` 去重唯一（world.rs）。问题：消耗品/弹药无法计数、同 id 多枚（银弹×3 / 圣水×2）无法表达。

| 方案 | 做法 | 优点 | 缺点 |
|---|---|---|---|
| **A 拆 id** | 同 id 多枚写成 `item_id_1 / item_id_2 / item_id_3`；`add_item` 自动追加序号；`count_items(st, base_id)` 统计前缀命中；消耗时删一个组件 id | **零侵入**现有 `Vec<String>`/serde/存档迁移；`add_item` 只改一行 push 逻辑；GateDef `need_item`、FIGHT_ITEMS 判定读 base_id 前缀仍工作 | id 膨胀（但总数有限，人类可读）；列举需前缀归并（一个 helper 完成） |
| **B 改类型** | `inventory: Vec<(String,i32)>` 或 `BTreeMap<String,i32>` | 语义清晰、计数原生 | **改 serde 容器 + 存档迁移面巨大**：现 Vec<String> 存档、`world.add_item`、`hud_json`、`GateDef need_item` 判定、多场景 AddItem push 全要动；migrate_save 要 `Vec<String> → 新结构` 幂等重写，风险最高 |

**结论（推荐 A）**：首版走 **A 拆 id**——它把复杂度收敛在 `add_item`（push `item_id_{k}`）与一个 `count_items`/`consume_item` helper 内，对现有全部依赖 `inventory: Vec<String>` 的场景（门禁 `need_item`、FIGHT_ITEMS 白名单、hud 列表、剧情 `cond: has_item`）**零破坏**。B 留作 v2 若确需大规模计数再迁（届时 `migrate_save` 补一段 `Vec<String> → 新结构` 幂等映射，且 `save_version` 递增）。

**实现（方案 A）**：
```rust
// world.rs add_item 改造（唯一改动点）
pub fn add_item(st: &mut GameState, item: &str) {
    // 非可堆叠（圣物/任务/装备卷）一律去重唯一，保现语义
    if !items().any(|it| it.id == item && it.max_stack > 1) { return dedup_push(st, item); }
    // 可堆叠消耗品：进位 item_id_k（k = 当前计数）
    let k = count_items(st, item) + 1;
    st.inventory.push(format!("{item}_{k}"));
}
pub fn count_items(st: &GameState, base: &str) -> usize {
    st.inventory.iter().filter(|i| i == base || i.starts_with(&format!("{base}_"))).count()
}
pub fn consume_item(st: &mut GameState, base: &str) -> bool {
    // 从尾部移除一个 `base` 或 `base_k` 组件；返回是否成功
}
pub fn has_item(st: &GameState, base: &str) -> bool { count_items(st, base) > 0 }
// 兼容 helper：现有 has_item 判定读 count>0，不加序号也 true（base 本身存在）
```

> 兼容红线：现场景里写 `Eff::AddItem("item_xxx")`、`cond: has_item("xxx")`、`GateDef need_item` 全部继续可读 `base` 或 `base_n`；**无损堆叠道具保持去重唯一**不变（只对 `max_stack>1` 的消耗品计数）。

### 2.2 装备格：新增 `equipment` 与现有 `weapon` 的关系

**新增持久字段（state.rs，伪签名，全部 serde default）**：
```rust
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct Equipment {
    pub weapon: Option<WeaponSlot>,      // 主手武器（含 dmg_type/special/enhance）
    pub armor: Option<String>,           // 护甲 id（查 GEAR 表）
    pub accessory: Option<String>,       // 饰品 id
    pub treasure: [Option<String>; 3],   // 本命/护身/辅助（arr 索引；对接 cultivation treasures）
}
#[serde(default)]
pub equipment: Equipment,   // 全 serde default → 旧档天然读 Default
```

**与现有 `weapon: Option<Weapon>` 的关系（关键决策）**：
- **建议：保留 `weapon: Option<Weapon>`（旧字段语义不动），新增的 `equipment.weapon: Option<WeaponSlot>` 为「武器强化/伤害类型/特殊属性」的旁附增强**。二选一即可，**不并发**。
  - **兼容层规则**：读有效主手武器 = `equipment.weapon.as_ref().map(|s| s.dart).or(st.weapon)`；`equipment.weapon` 为 `None` 时完全回落到现 `st.weapon`，行为不变。
  - 初始三把（s_weapon）仍走 `Eff::Weapon(Weapon::Axe|Gun|Sword)` → `st.weapon`；玩家在道具铺购买/升级高级武器时写 `equipment.weapon`（带 dmg_type/special/enhance）并把 `st.weapon` 设为对应基础枚举（供 `fight_turn` 的 hit 判定仍可按武器种类发招）。
- **护甲/饰品/法宝**：全走 `equipment.{armor,accessory,treasure}`，`st.weapon` 不参与。法宝三格与 cultivation 文档 `treasures: Vec<String>` 的关系：**二选一宿主**。推荐**用 `equipment.treasure:[_;3]` 做装配权威**，`treasures: Vec<String>` 保留为「已购法宝拥有标记」（平行于 skills 的拥有语义）；装配/换装写 `equipment.treasure`，`route_buy_treasure`（cultivation §4.3）改为写 `equipment`（一次小改）。
- **前端**：HUD `hud_json` 增 `equipment` 摘要（护甲/饰品/主手名 + 强化 +N）。

> 兼容红线：`eff.equipment` 与 `stock.equipment` 全 `#[serde(default)]`；新 `GameState::new` 缺省 `equipment: Default` 不改 new() 语义；旧档 weapon 字段原样保留。

### 2.3 装备/法宝静态表（伪签名，defs.rs 或 weapons.rs）

```rust
pub enum DamageType { Kinetic, Energy, Holy, Silver }
pub enum WeaponSpecial { Leech(i32), Pierce(i32), Burn((i32,i32)), Stun(f64) }
pub struct WeaponSlot {
    pub id: &'static str,          // 查 WEAPONS
    pub enhance: u8,               // +0..+max
}
pub struct WeaponDef {
    pub id: &'static str, pub name: &'static str, pub tier: u8,
    pub dmg: (i32,i32), pub ammo: Option<u32>, pub dmg_type: DamageType,
    pub special: &'static [WeaponSpecial], pub base_price: i32, pub need_grade: Option<char>,
}
pub const WEAPONS: &[WeaponDef];                  // §1.1 十把
pub fn weapon_def(id:&str) -> Option<&'static WeaponDef>;
pub const GEAR: &[GearDef];                        // §1.2 护甲/饰品
pub struct GearDef { slot: GearSlot, id, name, dmg_reduce, atk_flat, dodge, san_resist, qi_max, price, need_grade }
// 法宝复读 cultivation TRESURE_DEFS（cu_bab_*）
```

**结算（engine.rs 一个查表阶段，替代 if 链）**：`fight_turn` 玩家命中段把「§1.1 多武器/≈`weapon_def(w).dmg` + 强化 + special + §1.2 装备常驻」收敛进一个 `apply_gears(st, &mut out)` 查表，与 combat §1「玩家加成求和段」同构。**效果**：Axe/Gun/Sword 三把手级 dmg 与现公式严格一致（不改变 6 副本数值金标准），更高 tier 只在新兑换后生效，零回归。

### 2.4 道具数值总表 `ITEMS`

```rust
pub enum ItemSub { Heal, San, Ammo, Throw, CharmProt, CharmAnti, Scroll, Quest, Reliquary }
pub struct ItemDef {
    pub id: &'static str, pub name: &'static str,
    pub kind: ItemSub, pub stack: bool,          // 可堆叠（拆 id）
    pub usable_in_fight: bool,                   // 走 FIGHT_ITEMS 入口
    pub effect: ItemEffect,                      // Heal(i32)|San(i32)|Throw{...}|Charm{...}|Ammo|None
    pub price: i32, pub need_grade: Option<char>,
}
// 战斗内道具统一查 FIGHT_ITEMS（combat §2.3 方案 A 白名单）——ITEMS 表的可战斗子集
pub const ITEMS: &[ItemDef];
pub const FIGHT_ITEMS: &[(&'static str, FightItemEffect)];   // 复用 combat 定义
pub fn item_def(id:&str) -> Option<&'static ItemDef>;
// 价格/兑换/门禁统一查表：主神道具铺、cond_show、GateDef、合成全走 item_def
```

> 定位：`ITEMS` 是**全谱系道具的唯一事实表**（承 §1.3/1.4/1.5），战斗/兑换/门禁/合成统一 `item_def(id)` 查表，杜绝道具名散落 if。

---

## §3 道具效果类型（战斗内 + 常驻 + 一次性）

### 3.1 战斗内消耗品效果（usable_in_fight，走 FIGHT_ITEMS）

与 combat §2.3 方案 A + skills §4 同一 `fight_actions 追加 item_<id> 动作 + fight_turn 拦截` 通道：

| 效果 | 代表 | 实现 |
|---|---|---|
| 回血/回 san | `item_medkit`(HP+50) / `item_sedative`(SAN+20) | `fight_turn` 拦截时 `st.hp=(+50).min(max)` / `st.san=(+20).clamp(0,100)`，消耗 1 份 |
| 增伤/减伤一次性 | `item_silver_bullet`(+400% 下一击) / `item_bottle_water` | 设一个战斗内临时 flag/缓冲（next_hit_mult)，敌回合结束自然清零 |
| 净化 debuff | `item_antidote`/`item_jiezhou_fu`/`item_quzhen_fu` | 清除诅咒叠层 flag / `post_kill` 免疫（见 §3.3） |
| 触发 BATTLE_MODS 弱词 | `item_torch`(weak_fire 3 回合) / `item_holy_water`(怨灵×1.5) | 写一次 `apply_weak(st, fight_id, fire, 3)` 缓冲，敌结算 read weak_pending |
| 环境终结 | `item_lure`(止 regen + 60) | 直接扣敌 HP + 清 regen（对齐沙丘诱水剂终结） |

> **道具是确定性动作，不消耗命中 roll**（对齐 combat §2.3 方案 A、skills §4.2）；set 每次战斗 `usable_items(st)` 由 `count_items > 0 && usable_in_fight` 过滤。

### 3.2 装备/法宝常驻效果（被动，查表）

护甲 `dmg_reduce`、饰品 `atk_flat/dodge/san_resist/qi_max`、法宝 `atk_flat/reduce/san_resist/per_turn_qi/免疫即死` 全部并入**玩家加成求和段**（engine.rs 一处 `apply_gears(st, out)` + combat §1 的同一查表）。**不新建 if 链**；未装装备/法宝 = 零影响。

### 3.3 一次性触发（免疫即死 / 解咒 —— 接 combat post_kill 与即死）

即死/封印类来源：`BATTLE_MODS.post_kill`（combat §2.1 击杀副作用）、咒怨「二重死」诅咒叠层、摩瑞亚「断桥坠渊」等。
- **免疫一次即死**：`item_quzhen_fu`（驱邪符）→ 施放时 `st.invuln_death = 一档次`，之后任意 `Hurt`/`post_kill` 置死分支前被 `guard_death(st)` 拦截并清档（**复用 combat 的 `post_kill` 结算钩子**，一条 lane 判定）。
- **解咒**：`item_antidote/item_jiezhou_fu` → 清 `zy_curse_1..3` 类叠层 flag 与 debuff 缓冲。
- **免疫封印**：`item_quzhen_fu` / 法宝五方幡 → 对 `post_kill`/封印类禁制免疫一回合（读 `BATTLE_MODS` 压制，不改表语义）。

### 3.4 与 usable_in_fight 的接口统一

`ITEMS` 表挂 `usable_in_fight`；战斗内入口统一走 `FIGHT_ITEMS`（combat 定义）子集，`item_def(id).kind` 决定 effect 分发（Heal/San/Throw/Charm）。道具效果与技能动作（skills `SkillEffectKind`）、修真神通共用**同一套 EffectKind 分发**（recover/buff/debuff/striking），避免第二套 effect 体系——三者都落进 `fight_turn` 的「动作拦截 → 按 kind 应用 → 汇合结算」骨架。

---

## §4 道具来源与主神兑换

### 4.1 来源四通道

1. **副本掉落**（现 AddItem/GateDef/flag，已全覆盖）：BOSS/精英/宝箱/支线按各副本文档§7 产出；本系统只补 §1.4 规划凭证（`it_*`）进兑换券掉落上限。
2. **主神兑换（道具铺）**：见 §4.2。
3. **合成**（可选）：见 §4.3。
4. **任务/剧情奖励**：`Route::Dyn` + `Eff::AddItem`，纯 flag。

### 4.2 主神「道具铺」（Route::Dyn + has_grade_or + cond_show）

在 `s_nexus_exchange` 目录顶部或独立光球加「◆ 道具铺」入口 → 可新增 `s_nexus_shop` 分页场景（或并入现有 exchange 目录，改动最小选并入）。**分页**：武器 / 护具 / 消耗品 / 直辖符卷 / 圣物凭证。

```rust
// 通用购买路由（道具铺所有页共用，查 ITEMS 表）
fn route_buy_item(id: &'static str) -> impl Fn(&mut GameState) -> String {
    move |st| {
        let it = item_def(id).expect("item");
        if it.stack { /* 允许无限买，走 add_item 计数 */ }
        else if st.inventory.iter().any(|i| i == id) { return done; } // 唯一物已持有
        if st.points < it.price { return fail; }
        if !has_grade_or(st, it.need_grade) { return grade_fail; }    // combat §3 helper
        st.points -= it.price;
        crate::world::add_item(st, id);
        done
    }
}
fn cond_show_item(id: &str) -> impl Fn(&GameState)->bool {
    move |st| !(items().any(|it| it.id==id && !it.stack) && st.inventory.iter().any(|i| i==id))
}
```

**价格 + 评级门槛表（建议值·可调）**：武器 900~11000 + D~A、护甲 900~9000 + D~A、消耗品 150~1500 + 多数无评级、符箓 600~1500 + D~C、圣物凭证 300~2000 + D~C。`text_exchange`/`exchange_name` 追加「已持道具」摘要（数前几个 + 数量）。

### 4.3 合成 / 强化（可选，用户点了「强化体系」）

**① 武器强化（+N）**：道具铺「强化」页，每条武器选 +当前档，`route_enhance(id)`：
```rust
fn route_enhance(id:&str) -> impl Fn(&mut GameState)->String {
    move |st| {
        let w = weapon_def(id).expect("weapon");
        // 需持有该武器 + 有强化材料（如 it_soul_shard×1，或点券价）→ 更新 equipment.weapon.enhance += 1
        // dmg 每档 +2/+3、pierce+1；上限 max_enhance=5
    }
}
```
**② 低级→高级合成**（残页→完整凭证等）：`RECIPES` 表 + `Route::Dyn` 校验 inventory 计数（走 §2.1 `consume_item`）：
```rust
pub const RECIPES: &[(result, &[ingredient])] = &[
    ("it_core_crystal", &["it_soul_shard", "item_core_crystal"]),   // 示例：合成顶级核心
    ("it_cross", &["it_cross_key", "item_holy_water"]),             // 示例：圣徽合成
];
fn route_craft(result:&str) -> impl Fn(&mut GameState)->String {
    move |st| {
        let (_, ing) = RECIPES.iter().find(|(r,_)| r==result)?;
        if ing.iter().all(|g| consume_item(st, g)) { add_item(st, result); done }
        else { fail /* 材料不足 */ }
    }
}
```
> 合成/强化都是「查 RECIPES/WEAPONS + 校验 inventory + 写状态」，模式与兑换路由同构，可并入包 C（道具铺设 + 合成页）。

---

## §5 分区衔接（并入 combat 原包 A/B/C/D）

道具/装备系统要求横跨数据层/结算/兑换/测试四层，**不另立独立包**，并入 combat_system_design.md §4 及 skills/cultivation 增量 A'/A″/B′/C′ 对应同名包（理由同 skills §6.1：同构样板，避免 scenes.rs/engine.rs 双代理并发冲突）。

| 增量包 | 内容 | 并入位置 | 依赖 | 建议顺序 |
|---|---|---|---|---|
| **A''''**（数据地基） | `Equipment` 结构 + `equipment:Equipment` 字段（serde default）+ `WEAPONS/GEAR/ITEMS/RECIPES` 静态表 + `item_def/weapon_def/count_items/consume_item`；`add_item` 加计数拆分（仅 max_stack>1 走 `_k`）+ `migrate_save` 幂等；保留 `st.weapon` 兼容回退 + `WeaponSlot` 类型 | combat 包 A（skills.rs/weapons.rs 新模块） | 包 A 字段风格；add_item 改动仅一行 | **第 1 步（与 A/A'/A″ 同批或紧随）——唯一硬前置** |
| **B''''**（引擎结算） | `fight_actions` 追加 `item_<id>`（dedupe FIGHT_ITEMS 白名单）+ `fight_turn` 拦截分发（Heal/San/Throw/Charm/Ammo，确定性动作不耗命中）；`apply_gears` 查表把装备常驻并入玩家加成段；`hud_json` 增 equipment 摘要 | combat 包 B | 需 A'''' 就绪 | **第 2 步（A'''' 后可与 C'''' 并行）** |
| **C''''**（道具铺） | 道具铺分页（武器/护具/消耗/符卷/圣物）+ `route_buy_item/route_enhance/route_craft` + `cond_show_item` + `has_grade_or` + 合成页 + `text_exchange/exchange_name` 道具摘要 + HUD equipment | combat 包 C | 可只确认 A'''' 签名后即开 | **与 B'''' 并行** |
| **D''''**（测试） | 消耗品计数/consume 单测、战斗内 item 动作、装备常驻查表、兑换/合成门槛、inventory 计数迁移断言、回归（playthrough/6 副本不红） | combat 包 D | 需 A/B/C 对应 merge | **最后** |

**推荐顺序**：**A（原包）→ A'（技能）→ A″（修真）→ A''''（道具）→ (B∥B'∥B″∥B'''')∥(C∥C'∥C''∥C'''') → D/D'/D″/D''''**。
同文件注意：A 系都在 `skills.rs`/`weapons.rs` 模块，须与前序包串行铺骨架（A 先立模块，A' 加 SKILLS，A'' 加 CULTIVATION/TRESURE，A'''' 加 WEAPONS/ITEMS），不并行同文件。

---

## §6 兼容红线清单

1. **必带 `#[serde(default)]`**：`equipment: Equipment`（Default：weapon=None/armor=None/accessory=None/treasure=[None;3]）；`GameState::new` 缺省 `Default`，不改变 new() 语义。inventory 若只在 `add_item` 加 `_k` 后缀**不用改容器类型、无需 serde 迁移**。
2. **migrate_save 幂等**：若选择方案 B（远期）需 `Vec<String>→新结构` 映射 + `save_version` 递增；首版方案 A **零迁移**。不得二次回写、清空现有 inventory/flags/fight。
3. **不动 Weapon 枚举 / FightCfg / FIGHTS / BATTLE_MODS**：`st.weapon` 保留原语义；`equipment.weapon` 只是旁附增强（None 即回落现武器）；新动作仅 `item_<id>` 在新购道具时触发，对未购玩家动作列表与现行为一致 → **6 副本/playthrough 数值金标准**。
4. **战斗数值等价**：`apply_gears` 查表对 Axe/Gun/Sword 与现 `rnd` 公式严格一致；护甲/饰品/法宝常驻只增强新玩家，「空装备 = 零影响」。
5. **has_grade_or / cond_show / Route::Dyn 复用不改签名**；sp_grade 只为道具加门槛，不改变评级/复活/点数结算。
6. **法宝与修真一致**：`equipment.treasure` 与 cultivation `treasures: Vec` 二选一宿主，推荐 equipment 为装配权威、treasures 保留拥有标记；不并行双写导致冲突。
7. **门禁/剧情道具零战斗语义**：`kind=quest/reliquary` 的 `usable_in_fight=false`，绝不出现在 FIGHT_ITEMS；`GateDef need_item` 读 `has_item(base)`（前缀命中）继续工作。

---

## 汇报要点

- **文档路径**：`tools/design/item_equipment_system_design.md`（本文件，唯一产出，零代码改动）。
- **5 大类道具**：武器 10（含伤害类型 kinetic/energy/holy/silver + 特殊属性 + 强化+N）、护具装备 12（护甲/饰品 + 法宝三格接入修真）、消耗品 16（药/弹药/投掷/符箓/卷轴）、圣物凭证 12+（复用现真实掉落 id + 自创兑换券）、任务剧情 12+（纯 flag 不占战斗数值）。
- **inventory 计数方案结论**：**推荐 A 拆 id**（`item_id_k`，`add_item` 一行改动 + count_items/consume_item helper），零侵入现有 Vec<String>/serde/存档；B 改容器类型迁移面大留 v2。可堆叠消耗品才计数，圣物/任务/装备卷保持去重唯一。
- **装备格设计**：新增 `equipment: Equipment{weapon:Option<WeaponSlot>, armor, accessory, treasure:[_;3]}`，全 serde default；`st.weapon` 保留原语义，`equipment.weapon` 为旁附增强（None 回落现武器）；法宝三格接入修真（equipment.treasure 为装配权威，treasures 保留拥有标记）。
- **道具效果类型**：战斗内消耗品（回血/回 san/一次性增伤减伤/净化/触发 BATTLE_MODS 弱词 + 环境终结）走 FIGHT_ITEMS 通道、确定性不耗命中 roll；装备/法宝常驻查表并入玩家加成段；一次性免疫即死/解咒接 combat 的 post_kill 钩子；道具效果与技能/修真神通共用同一 EffectKind 分发。
- **道具铺 + 合成**：主神「道具铺」分页（武器/护具/消耗/符卷/圣物），`route_buy_item`(Route::Dyn+has_grade_or+cond_show_item) + 价格/评级门槛表；合成 `RECIPES` 表 + `route_craft` 校验 inventory；武器强化 `route_enhance`(+N，dmg+2/+3)。全部并入包 C。
- **分区衔接**：道具增量 A''''/B''''/C''''/D'''' 并入 combat 原包（及技能 A'、修真 A″ 同批），不另设独立包；推荐 A→A'→A″→A''''→(B∥C)→D；weapons.rs/skills.rs 模块骨架串行铺，避免同文件双代理冲突。
- **红线**：equipment/新表全 serde default（零迁移·方案 A）；不动 Weapon/FightCfg/BATTLE_MODS；战斗数值对旧三把严格等价（空装备零影响）；has_grade_or/cond_show/路由复用不改签名；quest/reliquary 类道具不进战斗。
- **零代码修改**：本代理仅产出本设计文档，未改任何 .rs / 前端 / 存档文件。