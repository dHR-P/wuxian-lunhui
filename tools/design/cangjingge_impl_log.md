# 《侠行天下 · 藏经阁》实现日志

> 子代理「侠行天下·藏经阁 副本实现」产物记录。只写全新文件，绝不改动既有文件。
> 依据 `design/zhttty_universe/00_INDEX_EXPANSION.md`：`cangjingge` 藏经阁 · 绝学之争 —
> 高解谜低战斗前置；经阁底层藏失传绝学与一部「禁书」，守阁老僧立场成谜；
> 钩子「真正的绝学，藏在你翻书之前」；BOSS 入魔守阁僧 (HP150, 隐藏)；sp_grade=D；
> 可免战解脱（出示信物=机关城墨令同款）；经阁书灵。
> 研究文档 `xiaxing_tianxia/00_xiaxing_tianxia_research.md` §候选5：藏经阁深处（绝学之争）——
> 书页谜题=纯调查/flag 高密度，守阁僧可免战解脱。

## 落地方案（零新引擎系统，复用机关城模板）

- **世界**：4 层（L0 山门·经堂 / L1 藏经阁一楼·书架丛林 / L2 藏经阁二楼·禁书库 / L3 顶层秘籍塔·绝学之争），每层 40×26。
- **单向传送闭环**（仿机关城 p_jc_4 回跳秘道）：前向 p_cj_1/2/3（层序递增，物理单向），唯一回跳 p_cj_back（L2→L1）缝合闭环，p_cj_exit 撤离阵。
- **门禁软锁链**（仿机关城 G1-G4）：G1 经堂内门（需铜铃·经僧）→ G2 禁书库闸（需守经人指引 flag keeper_clue_2）→ G3 绝学密室门（需檀木秘钥 it_tan_key）→ G4 心魔洞暗门（需破障 flag xinmo_unlock 隐藏）。
- **BOSS 选择驱动**：入魔守阁僧（HP150，狂暴阈 60）免战解脱需出示「檀木信物」；另加经阁书灵 miniboss（fight 表）。boss 回合用 Route::Dyn 落 sp_grade='D'。

## 最终产物（实现完成，2026 藏经阁）

**三文件行数**：
| 文件 | 行数 |
|---|---|
| `server-rs/src/worlds/cangjingge.rs` | 209 |
| `server-rs/src/scenes_cangjingge.rs` | 728 |
| `server-rs/tests/cangjingge_flow.rs` | 199 |
| `tools/design/cangjingge_impl_log.md` | 本文件 |

**场景 / fight 数**：CANGJING_SCENES = **39 个场景**（id 全 `cj_`）；cangjingge_figths = **9 场战斗**（id 全 `cj_`：guard1/zhikui/guard2/hunter/guard3/guard4/shuling/shouge/xinmo）。BOSS 入魔守阁僧 HP150、狂暴阈 60、奖励 300；经阁书灵 HP80；心魔 HP90。

**单向门 / 门禁链 / 结局分支 实现**：
- **单向传送闭环**：PORTALS 5 扇 —— 前向 `p_cj_1`(L0→L1) / `p_cj_2`(L1→L2) / `p_cj_4`(L2→L3) 物理单向（只建起点门、不建反向门），唯一回跳 `p_cj_back`(L2→L1 经阁密道) 缝合闭环，`p_cj_exit`(L3 撤离阵)。测试 asserts 前向门齐备 + 回跳门仅 1 扇且 id=p_cj_back。
- **门禁软锁链**：GATES 4 扇（G1 需铜铃 → G2 需 keeper_clue_2 flag → G3 需檀木秘钥 → G4 需 xinmo_unlock flag 隐藏），逐层锁捷径、绕行可达。
- **结局分支**（cj_30_box）：禁书之择三分支 —— 研读禁书 / 以铁页重封 / 焚毁禁书，各写 flag(cj_book_read/seal/burn)+cj_book_choice → cj_31_exit 结算 → cj_32_card（sp_grade=D）。BOSS 另有免战解脱分支 cj_24_shouge_freed（出示檀木信物，狂暴后 cond_shouge_raged 可见）；心魔隐藏战 cj_26_xinmo_door（需先悟绝学 → xinmo_unlock）。

**与骨架差异**：
- 设计骨架为「2 层经阁底/绝学密室/禁书库 + 入魔守阁僧」。为可落地与机关城模式对齐，扩为 **4 层**（L0 山门·经堂 / L1 一楼书架 / L2 二楼禁书库 / L3 顶层秘籍塔），并新增 **经阁书灵** 与 **心魔** 两个选择驱动 BOSS 战扩充战斗密度；保留「高解谜低战斗前置」「免战解脱（信物=机关城墨令同款）」「启示绝学钩子」。
- 秘籍收集链作为奖励支线：三卷武学残卷(it_miju_a/b/c) → it_miju_full → 守经人指引(keeper_clue_1/2) → 檀木信物(it_tan_token) 供 BOSS 免战。

**★外部依赖（主线合并时需扩展，三处）**：
1. `server-rs/src/lib.rs`：加 `pub mod scenes_cangjingge;`（并确保 test 引用 `wuxian_horror_ch1::scenes_cangjingge` 可达）。
2. `server-rs/src/worlds/mod.rs`：`mod cangjingge;` + `pub const WORLD_CANGJING: &str = "cangjingge";` + 在 `WORLDS` 注册 `&CANGJING` WorldData；可选在 `GW_PORTALS` 加 `gw_cangjingge` 主神网关（落点 P 出生点 (14,20)）。
3. `server-rs/src/scenes.rs`：`scene()` 并检索 `scenes_cangjingge::CANGJING_SCENES`；`fight_cfg()` 并检索 `cangjingge_figths()`。

**测试清单（cangjingge_flow.rs 5 例）**：
1. `cangjingge_map_reachable` — 每层地图 40 字符、出生点 P(14,20)、调查点/传送门可走动。
2. `cangjingge_main_line_boss_win` — 山门→取铜铃→一楼集三卷残卷→守经人指引→书梯→二楼取檀木钥→秘籍塔→守阁僧战（选择驱动重击循环）→胜利 sp_grade=D→结局研读→结算。
3. `cangjingge_one_way_portal_closure` — 静态断言唯一回跳门 p_cj_back、前向 p_cj_1/2/4 齐备。
4. `cangjingge_ending_three_branches_and_freed` — 禁书三分支（研读/重封/焚书）+ 出示檀木信物免战解脱。
5. `cangjingge_fight_table_complete` — 战斗表 9 场 id 齐全、BOSS HP150/狂暴60/奖励300、心魔 HP90。

> 注：未注册模块不参与当前 cargo check；已用【临时 scratch crate】对 scenes_cangjingge.rs + worlds/cangjingge.rs 做了真实类型检查（导入 defs/state/world/scenes/maps + rand），编译通过、数据结构加载正常；`cargo check` 主工程 exit 0（无回归）。既有文件一个字节未改，未部署、未 build --release。
- **BOSS 选择驱动**：入魔守阁僧（HP150，狂暴阈 60）免战解脱需出示「檀木信物」；另加经阁书灵 miniboss（fight 表）。boss 回合用 Route::Dyn 落 sp_grade='D'。

## ★外部依赖（主线合并时需扩展）

1. `server-rs/src/lib.rs`：`mod scenes_cangjingge;`
2. `server-rs/src/worlds/mod.rs`：`mod cangjingge;` + `pub const WORLD_CANGJING: &str = "cangjingge";`
   + 在 `WORLDS` 表注册 `&CANGJING`（WorldData），出生点 P；
   + 可选在 `GW_PORTALS` 加 `gw_cangjingge` 主神网关（落点=P 出生点）。
3. `server-rs/src/scenes.rs`：`scene()` 同时检索 `scenes_cangjingge::CANGJING_SCENES`；
   `fight_cfg()` 同时检索 `scenes_cangjingge::cangjingge_figths()`。

## 待素材替换清单（现用现有图占位）

| 层 | 场景 bg | 现用占位 |
|---|---|---|
| L0 经堂 | cj_bg_gate | img_zhuyuan_book.png |
| L1 一楼书房 | cj_bg_hall | img_laser.png |
| L2 禁书库 | cj_bg_scripture | img_corridor.png |
| L3 秘籍塔顶 | cj_bg_scripture_tower | img_zhuyuan_book.png |
| 心魔洞 | cj_bg_xinmo | img_laser.png |

敌人立绘复用：guard→护阁武僧、hunter→叛经者（守阁内盗经倒戈者）、zombie→书页纸傀（术傀）。