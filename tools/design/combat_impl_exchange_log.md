# 包 C：主神兑换扩展 + 前端 HUD · 实现落盘日志

> 包：C（无限流战斗体系 · 主神兑换 + 前端 HUD）
> 模型：tokenrhythm/deepseek-v4-flash-0731
> 改动文件（严格限定）：
> - `server-rs/src/scenes.rs`（仅 s_nexus_exchange 兑换段 + route_exchange_* + cond_show_* + text_exchange/exchange_name + 新增分类子场景）
> - `server-rs/ui/index.html`（HUD 元素）
> - `server-rs/ui/js/client.js`（refreshHud 容错读字段）
> 未改任何其他文件（engine.rs/state.rs/defs.rs/combat_data.rs/skills_data.rs/items_data.rs 等为只读依赖）。

---

## 一、兑换条目扩展（Route::Dyn 条件扣点 + 校验 points + has_grade_or 评级门槛 + cond_show 已购隐藏）

沿用现有模式：COST 常量 + `route_exchange_*`（Route::Dyn：校验 → 扣点 → 写状态 → done/fail）+ `cond_show_*`。
**铁律遵守**：既有 4 条（强化 800 / 基因锁一阶 2000 / 吸血鬼 3000 / 复活 4000）行为与数值**未改**。

### 1.1 主兑换场景 `s_nexus_exchange` 保留原 3 条目 + 返回主神广场，并新增分类入口（不触碰原条目）
原有 3 条行为完全不变；新增入口均以独立子场景承接，主场景只做闸门。基因第一阶原条目仍由 `cond_show_gene` 购后隐藏（测试兼容）。

### 1.2 新增路由（全部先校验点数 → 再校验评级 → 再验前置，失败不扣点）
| 条目 | 价格 | 评级门槛 | 写状态 | 位置 |
|---|---|---|---|---|
| 基因锁二阶·入微 | 6000 | B | `set_gene_stage(st,2)` | `s_nexus_exchange_gene` |
| 基因锁三阶·禁忌 | 12000 | A | `set_gene_stage(st,3)` | 同上 |
| 基因锁四阶·顿悟 | 22000 | A | `set_gene_stage(st,4)` | 同上 |
| 狼人血统 | 4500 | B | `bloodline=werewolf` | `s_nexus_exchange_blood` |
| 祖巫血脉 | 5500 | B | `bloodline=zuwu` | 同上 |
| 圣光圣职者血脉 | 3500 | C | `bloodline=zhanshi_blood` | 同上 |
| 修真破境 | CULTIVATION_STAGES 表 `need_points/need_grade` | 查表 | `cultivation_stage=next; cultivation_qi_max=cap` | `s_nexus_exchange_xiu` |
| 内功·无名剑诀 | 1500 | D | `inner_art=wuming; qi_max=40; qi=40` | 同上 |
| 内功·静心诀 | 350 | — | `inner_art=jingxin; qi_max+=20; san+10` | 同上 |
| 纳米护盾模块 Lv.L | 1800 | D | `tech_shield_max+=30; tech_shield=tech_shield_max` | `s_nexus_exchange_tech` |

数条校验均为「先失败返回；全部通过才扣点」，失败绝不动点。基因二阶起/血统写入走 `set_gene_stage`（combat_data 唯一写入口）。

### 1.3 技能兑换（146 条，按流派）
skills_data 的 `SKILLS` 表含 price / need_grade / need_bloodline / need_qi / need_stage / need_cultivation。
- 共享 `buy_skill(st,id)`：查 `skill(id)` → `skill_avail`（未拥有 + has_grade_or + 血统/基因阶/修真境/真气上限）→ 点数 → 扣点 → `st.skills.push(id)`。
- `skill_cat!($stat,[(id,名字),...])` 宏在模块作用域**为每个技能生成独立 route fn（以技能 id 为函数名）** + 目录 `ChoiceDef` 静态数组。目录按 9 个流派子场景：修真(`cu_*`)、武道(`sk_ww_*/skx_ww_*`)、基因(`sk_gene_*/skx_gene_*`)、血统、圣光、科技、超能NT、模因、通用。
- `s_nexus_exchange_skill` 为技能秘藏枢纽，分派到各流派目录；每目录行 `cond: None`（商品化展示），已购/未达标在购买时以 fail 场景拒绝（`RouteFn` 无参数、无法逐行生成唯一可见性 fn，故采用运行时校验；已在 sub 文案说明）。

### 1.4 道具铺（ITEMS/WEAPONS/GEAR/TRESURE_DEFS 表）
- `buy_item(st,id)`：武器→`equipment.weapon`；护甲/饰品→`equipment.armor/accessory`；法宝→`treasures`；消耗/圣物→`add_item_counted`（inventory）。价格/评级门槛全部查表（`weapon_def/gear_def/treasure_def/item_def`）。
- `shop_cat!` 宏生成各道具 route fn + 目录 `CAT_SHOP`。`s_nexus_exchange_shop` 展示武器/护具/消耗/符卷/圣物。

### 1.5 合成 route_craft + 武器强化 route_enhance（`s_nexus_exchange_craft`）
- `recipe_build(st,result)`：查 `RECIPES` 表 → 校验 `inventory` 原料齐备 → `consume_item` 消耗 → `add_item_counted` 产出。
  - `route_craft_core`：it_core_crystal ← 灵魂碎片 + 能量核心残片
  - `route_craft_cross`：it_cross ← 圣徽钥匙 + 圣水
  - 条件 `cond_has_recipe_core/cross`：原料齐备才显示。
- `route_enhance`：需已装配 `equipment.weapon` 且 `enhance<5`（`cond_enhance_ready`），+1 扣 1000，`enhance+=1`。

---

## 二、has_grade_or 统一门槛实现

```rust
fn grade_rank(g: char) -> u8 { D=0, C=1, B=2, A=3, S=4 }
fn has_grade_or(st: &GameState, need: Option<char>) -> bool {
    match need { None => true, Some(g) => st.sp_grade.map_or(false, |s| grade_rank(s) >= grade_rank(g)) }
}
```
子路由内统一先 `points` → `has_grade_or` → 前置/重复 校验。基因/修真/血统/内功/护盾条目均接入了该评级门槛。

---

## 三、cond_show_* 扩展与文本扩列

新增（scenes.rs 兑换段头部）：
- `cond_show_gene_cat`：基因进化分类（stage≥1 且 <4 显示）
- `cond_gene2/3/4`：当前阶 < 目标阶才显示
- `cond_werewolf/zuwu/zhanshi`：未拥有该血统才显示
- `cond_cultivable`：当前修为 <7 才显示破境
- `cond_art_wuming/jingxin`：未学该内功才显示
- `cond_has_recipe_core/cross`、`cond_enhance_ready`

`exchange_name` 扩列（已交换单汇总）：体质强化 / 基因阶 / 血统（查 BLOODLINES 名）/ 内功 / 纳米护盾 / 修真境界 / 技能数 / 已装配装备。
`text_exchange` 目录表格扩列各分类价格与评级门槛；主兑换/成功/失败场景沿用。

---

## 四、前端 HUD 改动（容错）

`server-rs/ui/index.html`：HUD 区新增 5 个显示元素，默认 `display:none`：
`hudQi/qiVal`、`hudShield/shieldVal`、`hudGene/geneVal`、`hudCult/cultVal`、`hudSkill/skillVal`。

`server-rs/ui/js/client.js` `refreshHud`：
- 新增 `setHudField` 局部 helper：字段存在且有值才显示，`undefined/0/空` → 隐藏（**不破坏现有 HUD 刷新**）。
- 读取（缺省用 `?? 0`）：`qi/qiMax`、`techShield/techShieldMax`、`geneStage`、`cultivationStage`/`cultivationName`、`skillCount`。
- 战斗「技能/道具」按钮入口：action_label 兜底由包 B 提供，前端按钮渲染沿用现有 `fight_actions` 渲染路径（路由一致性由包 B engine 保证；本包未新增破坏性渲染）。
- `node --check client.js`：exit 0。

---

## 五、验收结果

| 项目 | 结果 |
|---|---|
| `cargo check --release` | ✅ 零错误（Finished release，仅既有 warnings） |
| `cargo test --release --test nexus_exchange` | ✅ 6/6 通过（强化扣点×2、点数不足拒绝、基因购后隐藏、复活扣点/失败/无阵亡） |
| `node --check ui/js/client.js` | ✅ exit 0 |
| `cargo build --release` / 部署 | ❌ 未执行（按要求） |

> 说明：编译过程中曾遇到 `scenes_mumiyi.rs` / `engine.rs` 的并发改动导致的临时编译错误（并行代理包 B 的中间态），均与本次改动无关；在包 B/木乃伊代理合入后，release 检查零错误、nexus_exchange 6/6 通过。

---

## 五·补：宏 `$stat:ident` 一致性复核（包 B 反馈处理）

包 B 曾反馈 `skill_cat!`/`shop_cat!` 调用缺 `$stat:ident` 首参导致全 crate 编译失败。经复核：
- 宏定义：`skill_cat!($stat:ident, [...])`、`shop_cat!($stat:ident, [...])` **均以 `$stat:ident` 为首参**。
- 全部调用点（10 个）均已传首参：`CAT_XIU` / `CAT_WW` / `CAT_GENE` / `CAT_BLOOD` / `CAT_HOLY` / `CAT_TECH` / `CAT_NT` / `CAT_MEME` / `CAT_UTIL` / `CAT_SHOP`。
- 9 个技能目录场景 + 1 个道具铺场景分别引用对应静态表；无遗留不一致调用、无残留 `skill_scenes!` 调用。
- 该反馈针对的是包 B 在合入前的临时中间态；最终 `cargo check --release` — 零错误、`nexus_exchange` 6/6、`node --check` exit 0。
- 仅做了一处注释清理（stale `skill_scenes!` 提示改写成实际 `route fn + 静态数组` 设计说明），无功能改动。

---

## 六、遗留 / 注意事项

1. 技能目录行采用「运行时校验拒绝」而非逐行 `cond_show` 隐藏（受 `RouteFn = fn(&mut GameState)->String` 无参数、宏无法拼接标识符约束）。已购技能在商品文案 `sub` 标注、购买时 fail 提示。若需逐行隐藏，需引入 set 数据结构承载「行号→技能 id」或修改 `Route`/`ChoiceDef` 定义（超出包 C 授权范围）。
2. 合成 `RECIPES` 表当前仅 2 条（item_core_crystal / item_cross），已全部接入；后续表扩充仅需加数据行。
3. 武器强化上限 +5、单价 1000 为「建议值·可调」。
4. 前端 `geneStage/cultivationName/skillCount` 等字段依赖包 B `hud_json` 输出；未输出时前端自动隐藏，不报错。