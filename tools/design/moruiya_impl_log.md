# 《魔戒·摩瑞亚矿坑》副本实现日志

> 实现代理：tokenrhythm/deepseek-v4-flash-0731（编程/文字，与主线同模型）
> 项目根：`C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1`
> 产出：`worlds/moruiya.rs` → `scenes_moruiya.rs` → `tests/moruiya_flow.rs`（每完成一步即落盘本日志）
> 约束：只新建文件，绝不修改既有文件；不部署；cargo check 仅级联到自建文件（未注册文件不参与编译，以对照 zhouyuan 模板自查结构为准）。

## Step 1 — `server-rs/src/worlds/moruiya.rs`（已完成 ✅ 2026-xx-xx）

- 三层地图 `MORUIYA_F1/F2/F3_MAP`（40×26，每行 40 字符已验证）×3。
- F1 出生点 P(12,1) 西闸门内侧；`I` 火把/石柱/石棺装饰；湖池 W(13,21)、月台 C(21,20)、石梯 S(34,14)。
- F2 上 U(1,1)、月台 C(38,1)、书库大厅/石棺、无底阶梯区(y18-23)、密室(4,24)、S(31,23)。
- F3 上 U(1,1)、卡扎督姆桥 y13、桥裂隙 (22,13)、宝库 (33,21)、塌方缝隙 (6,20)、东门 (36,13)。
- POINTS 13 个（全 `mo_p_`）：湖岸/石板/塌方/月台补給/书/阶梯陷阱×3/密室宝箱/裂隙/秘银宝箱 + 两个楼梯口点。
- ENEMIES 7 个（全 `mo_e_`）：斥候/巡逻队/掠夺者/鼓声伏击/巨魔/禁卫×2。
- NPCS 3 个（`mo_n_`）：甘道夫 F1(12,3)、波罗莫 F1(18,12)、吉姆利 F2(22,7)。
- ZONES 3 个（`mo_z_`）：watcher 湖池 / troll 巨魔口 / bridge 桥中段。
- PORTALS 6 个：P3/P4 楼梯双向对 + P1 矿车单向 + P2 塌方缝隙单向（§3.5）。
- GATES 6 个（`mo_g_g1..g6`）：G1 西闸门(单向死锁)/G2 柱厅门(flag mo_rune_decoded)/G3 塌方(mo_collapse_cleared)/G4 书库门(mo_book_read)/G5 宝库门(道具 mithril_key)/G6 东门(mo_cleared)。

待素材替换清单（本副本无专属新图，bg 用既有氛围图铺底）：
- mo_bg_gate（西闸门湖景）、mo_bg_hall（矮人柱厅）、mo_bg_library（长书库）、mo_bg_bridge（卡扎督姆桥）、mo_bg_fire（炎魔深渊之火）。
- 敌人立绘复用：hunter→半兽人、horde→巨魔、enemy_wicked→监视者（§9.2 复用清单，均注「待替换」）。

（Step 2 scenes、Step 3 tests 追加于下）

## Step 2 — `server-rs/src/scenes_moruiya.rs`（已完成 ✅）

- 导出 `pub static MORUIYA_SCENES: &[SceneDef]`（id 全 `mo_` 前缀）+ `pub fn moruiya_figths() -> &'static [(&'static str, FightCfg)]` + `mo_fight_cfg(id)`。
- 场景分幕（§6）：幕1 西闸门(mo_01_gate→mo_lake watcher 可选) → 幕2 柱厅石板(mo_02_hall/mo_rune/mo_rune_scout) → 幕3 塌方(mo_collapse) → 幕4 书库·巴林之墓(mo_book→mo_drum_ambush_scene) → 幕5 无底阶梯(mo_stair，三陷阱计数) → 幕6 王厅宝库(mo_vault，需 mithril_key) → 幕7 卡扎督姆桥(mo_bridge_desc) → BOSS(mo_boss_round) → 双结局(mo_ending_survive / mo_ending_sacrifice) → 幕8 东门(mo_exit/mo_done) 。支线：矿车(mo_cart/mo_cart_ride)、NPC(甘道夫/波罗莫/吉姆利/巨魔)、死亡档案 6 种(mo_death_watcher/stair/balrog/flame/dark/crush)。
- 战斗表 9 套（+watcher/balrog 的 `b_` 别名 = 11 条目）：goblin_scout/pack/raider、drum_ambush、orc_captain、cave_troll、orc_guard、watcher(+b_watcher)、balrog(+b_balrog)。数值 §4（+60% 基线：普通 34-60/奖 25-60，精英 100-145/奖 250-400，BOSS 270/(18,26)/600，狂暴@135 火焰形态）。
- BOSS 双结局：`Route::Dyn` + 互斥 `SetFlag`（mo_side_survive / mo_side_sacrifice + mo_balrog_down / mo_sacrifice_done），结算 `Eff::PointsIfFlag("mo_side_survive",200)` / `("mo_side_sacrifice",300)` 计分；甘道夫式牺牲写 `st.sp_grade=Some('B')`。
- **持续 SAN 光环**：用选择驱动遭遇链落地——mo_boss_round 每回调 `route_boss_attack`（火焰形态 San-6 + 全场高温 San-3/回，进战斗即生效）；同时导出 `b_balrog` FightCfg 供 ZoneDef 引擎直战复用。
- 火把/光照：纯 flag+文本降级（mo_torch_lit + Eff::San），§10 零改退路。坠落陷阱：PointDef 调查场景 + Eff::Hurt(amount,"mo_death_stair") → 死亡档案；三处陷阱用连号 flag mo_stair_1/2/3 累计，满 3 → 支线 D +150。
- TextSpec::Dyn 均只读渲染，副作用只落在 Route::Dyn / ChoiceDef.effects（防重复触发）。

（Step 3 tests 追加于下）

## Step 3 — `server-rs/tests/moruiya_flow.rs`（已完成 ✅）

- 测试 ① `moruiya_f1_map_reachable`：三层地图每行 40 字符、出生点 P(12,1)、F1 调查点可达（BFS flood）、F1 门禁格子可走动。
- 测试 ② `moruiya_main_line_bridge_break`：西闸门(mo_01_gate，冲入闸门封 G1)→柱厅石板(解密 mo_rune_decoded/mo_side_rune+100)→书库(读完 mo_book_read/mo_side_book+150)→卡扎督姆桥(start_balrog)→炎魔胜利（驱动到断桥阈值 → 断桥坠渊 mo_ending_survive，mo_side_survive + mo_cleared，点数增，与牺牲互斥）→东门结算(mo_exit/mo_done，PointsIfFlag +200)。
- 测试 ③ `moruiya_dual_sacrifice_ending`：双结局·甘道夫式牺牲（start_balrog → 让甘道夫断桥 → mo_ending_sacrifice，mo_side_sacrifice + mo_sacrifice_done + sp_grade=Some('B') + mithril_schematic，与断桥互斥）。
- 测试 ④ `moruiya_balrog_san_aura`：构造火焰形态 Boss(Hp100≤135) → mo_boss_round → 后撤重整（dmg=0 只走 SAN 光环），断言火焰形态每回 San -9（6+3）、普通形态 -3。
- 测试 ⑤ `moruiya_fight_table_complete`：9 主 + 2 别名共 11 条，校验 balrog HP270/reward600/dmg(18,26)/rage@135、watcher HP145、troll HP100。

## ★外部依赖清单（主神合并阶段需接线）

1. `lib.rs`：`pub mod scenes_moruiya;`（供测试 `scenes_moruiya::moruiya_figths` 引用）。
2. `worlds/mod.rs`：`mod moruiya;` + `pub const WORLD_MORUIYA: &str = "moruiya";` + `static MORUIYA: WorldData`（initial_scene `mo_01_gate`，floors= MORUIYA_F1/F2/F3_MAP，floor_names/POINTS/ENEMIES/NPCS/ZONES/PORTALS/GATES）并入 `WORLDS` 注册表。
3. `scenes.rs`：
   - `scene()` 扩展：`.or_else(|| crate::scenes_moruiya::MORUIYA_SCENES.iter().find(|s| s.id==id))`。
   - `fight_cfg()` 扩展：`.or_else(|| crate::scenes_moruiya::mo_fight_cfg(id))`。
   - 复活接线：摩瑞亚死亡档案回主神空间扣点复活（首次 400/递增 600，按 §8；生化 300 基线）由主线复活系统接线。
   - sp_grade：`scene_nexus`/兑换目录对 B 级支线（基因锁二阶段、秘银护甲、精灵斗篷 C 级）门槛判断由主线接入（本副本产出位：甘道夫式牺牲 sp_grade=B）。

## 自验情况

- 未跑 cargo check（scenes_moruiya.rs / worlds/moruiya.rs 未注册进模块图不参与编译，遵循"对照模板自查"）；已对照 zhouyuan 模板逐字段核对 SceneDef/FightCfg/PointDef/GateDef/PortalDef/ZoneDef/EnemyDef/NpcDef 结构与字段顺序。
- 三层地图每行 40 字符 ×26 行经验证（pwsh）全部通过；出生点 P 在 F1(12,1)。
- 战斗表 9+2 别名；BOSS balrog 数值照设计 §5（270/(18,26)/600/狂暴@135 火焰形态）。
- 持续 SAN 光环用选择驱动遭遇链落地（同咒怨黑发领域 b_kayako 作法），并另导出 b_balrog 供 ZoneDef 直战复用。
- 双结局互斥（SetFlag + cond 分支）；炎魔击杀 +600（Route/Dyn），结算用 PointsIfFlag 计结局支线分（断桥 +200、牺牲 +300 + B 级 sp_grade）。
- 设计差异：火把/光照按 §10 最小改动退路走纯 flag+文本（未引入网格光照，状态字段 light 由主线后续迭代）；未改动 compute_settlement（其为生化硬编码 flag，本副本支线分经 PointsIfFlag 在结局场景计，复用主神结算面）。