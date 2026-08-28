# 全遍历测试落地记录（full_traversal_test_log.md）

> 项目：wuxian-horror-ch1（server-rs 集成测试）
> 目的：把原来「抽样」（每副本 2-4 flow 用例 + 6 系统抽样）升级为「几十副本 × 上百强化 × 场景交互 × 人物交互 × 面板」的**全量遍历**覆盖。
> 日期：本轮迭代。模型：tokenrhythm/deepseek-v4-flash-0731（大规模测试面扩大子代理）。

---

## 一、新增程序化全遍历测试

三个新增测试文件（均用循环遍历全部条目断言，非手写用例）：

| 文件 | 覆盖维度 | 断言要点 |
|------|----------|----------|
| `server-rs/tests/all_worlds_interaction_test.rs` | 全部 57 个世界 | points.route / npcs.talk / zones.ref_id / gates 字段 / portals 落地可走 / enemies.fight 全可达 |
| `server-rs/tests/all_upgrades_test.rs` | 强化/兑换/合成表 | WEAPONS/GEAR/TRESURE_DEFS/ITEMS/BLOODLINES/SKILLS/RECIPES 字段完整 + 兑换/合成可达 |
| `server-rs/tests/all_panels_test.rs` | 主神空间面板 | s_nexus_* 面板可解析 + 选项/跳转可达 + 结算/死亡卡字段 |

### 1. `all_worlds_interaction_test.rs` —— 全世界遍历
- `points` 每个 `PointDef.route` → `scenes::scene(route)` 可解析（场景交互可达）
- `npcs` 每个 `NpcDef.talk` → 场景可解析（人物交互可达）
- `zones` 的 `ref_id`：**OR 语义** `scene(ref_id) || fight_cfg(ref_id)`（引擎支持 scene 锚定战斗=场景带 fight_id、与 fight 锚定两种合法设计）；已知旧式 3D 谜题标签 `d_laser_room` 单独放行
- `gates` 每个 `GateDef` 的 need_item/need_flag 字段结构合法
- `portals` 落点 (tx,ty) 在目标层地图内且非墙（传送可达）
- `enemies` 每个 `EnemyDef.fight` → `fight_cfg` 可解析（遭遇战可达）
- 额外：全对象 id 跨世界唯一；每世界 `initial_scene` 可解析；每世界出生点可走

### 2. `all_upgrades_test.rs` —— 强化表全遍历
- WEAPONS(20)/GEAR(17)/TRESURE_DEFS(12)：id 非空、dmg/减伤/攻击等关键字段合理、`weapon_def/gear_def/treasure_def` 可查询
- ITEMS(30)：id 唯一、价格/分级字段完整、`item_def` 可查询
- BLOODLINES(9)：passive 字段完整、`bloodline_def` 可查询
- SKILLS(146)：id 唯一、有 school/price/grade、`skill(id)` 可查询、effect 结构可匹配
- RECIPES(8)：产出 id + 全部原料 id 都是「已知物品」（ITEMS / TRESURE_DEFS / QUEST_ITEM_IDS 之一），合成闭环可达

### 3. `all_panels_test.rs` —— 主神空间面板
- 遍历 `scenes::SCENES` 中全部 `s_nexus_*` 前缀面板：`scenes::scene` 可解析、非覆盖层面板 choices 非空、`Route::To` 目标可解析
- 覆盖层卡片按钮非空；`s_settle` 结算卡含 `__enter_nexus__` 回去路由；至少一张卡含 `__enter_nexus__`

---

## 二、全遍历统计（各维度项数）

| 维度 | 数量 |
|------|------|
| 世界总数（WORLDS） | **57** |
| 调查点（POINTS 合计） | **537** |
| NPC（NPCS 合计） | **121** |
| 门禁（GATES 合计） | **112** |
| 传送（PORTALS 合计） | **188** |
| 机关（ZONES 合计） | **93** |
| 敌人（ENEMIES 合计） | **320** |
| 主神面板（s_nexus_*） | **33**（跳转目标 56，坏目标 0） |
| 覆盖层卡片 | **10**（含 __enter_nexus__：1，空按钮：0） |
| WEAPONS | 20 |
| GEAR | 17 |
| TRESURE_DEFS | 12 |
| ITEMS | 30 |
| BLOODLINES | 9 |
| SKILLS | 146 |
| RECIPES | 8 |

---

## 三、暴露并修复的真 bug

全遍历测试一次性暴露了大量「悬空引用」（数据 id 指向不存在的场景/战斗），这是抽样测试根本覆盖不到的。全部在 `server-rs/src/` 最小数据层修复（未动 engine.rs/state.rs/defs.rs 核心逻辑）。

### 3.1 数据表缺失 / 注册不全（items_data.rs）
- **`it_core_crystal` 未注册**：配方产出与二次配方原料，但既不在 `ITEMS` 也不在 `QUEST_ITEM_IDS`。已在 `ITEMS` 表补为 Reliquary 强化材料（`ItemDef { id:"it_core_crystal" ... }`），合成/兑换闭环成立。

### 3.2 世界初始场景悬空（worlds/mod.rs）
- **咒怨 `initial_scene="zy_00"` 不存在**（实际首场景 `zy_01`）→ 改为 `zy_01`。世界初始场景可解析。

### 3.3 咒怨调查点/NPC 缺失场景（scenes_zhouyuan.rs）
- 调查点 `zy_p_rainboots`→`zy_02_shoe`、`zy_p_clock`→`zy_07_clock` 引用的场景从未创建 → **新增两个场景** `zy_02_shoe`（玄关儿童雨鞋，授 `zy_shoe_checked` 支线）与 `zy_07_clock`（F2 走廊挂钟），使调查点可交互。

### 3.4 系统性 id 位移（worlds/shenmiao.rs）
- shenmiao 调查点 10 个 route 全部**编号偏移**（`sm_0X_→sm_1X_ →sm_2X_→sm_3X_`），指向不存在的 `sm_01_vortex`/`sm_11_ceiling`/`sm_21_basilica` 等 → 全部改对到实际场景；NPC `sm_npc_priest`→`sm_25_npc`。

### 3.5 系统性前缀错位（worlds/yinse.rs）
- yinse 敌人 (`ys_scav/ys_brute/...`) 与战斗机关 (`ys_lou/ys_nest/ys_waR0_r1`) 引用 `ys_*`，但战斗表实为 `ws_*` → 全部改为 `ws_*`（27 条敌人 + 3 条机关）。

### 3.6 各展示世界悬空引用（逐点改对）
- **moruiya**：点 `mo_p_crack`→`mo_bridge_desc`；机关 `mo_z_bridge`→`b_balrog`（真悬空）；楼梯口点改指楼层 hub（`mo_02_hall`/`mo_book`）
- **moshi**：军医 NPC `ms_n_medic`→`ms_medic_win`；机枪阵地×2 改指 `ms_00`；弹药升降井/主炮改指 `ms_f4_arrive`
- **xinghe**：NPC `xh_n_commander`→`xh_00`、`xh_n_veteran`→`xh_10_arrive_tunnel`
- **sishen**：敌人 `ss_e_l3_enforcer`→`ss_emissary`（战斗配置）
- **mojiao**：`mj_p_l3_1`→`mj_10_arrive_pool`、`mj_p_l4_3`→`mj_21_tome`
- **wulin**：L2 擂台 6 点/NPC 改指 `wl_arena` hub；机关 `wc_arena_door`→`wc_fight_1`、`wc_wo_di_door`→`wc_jiao_zhong`
- **poxiao**：NPC `px_n_edgar`→`px_edgar_deal`
- **tiexue** `tx_31_stela`→`tx_33_core`、**tiexue2** `tx2_31_oracle`→`tx2_33_core`
- **xinhuangfang**：`xf_33_light`→`xf_33_gate`、`xf_npc_kanshi`→`xf_40_kanshi`、机关 `xf_zone_camp`→`xf_20_center`
- **huanxiongshi**：`p_hx_f3_heli`→`hx_n_pilot`
- **shuangbai**：NPC `sb_n_oldwen`→`sb_05`
- **panbu**：`pb_12`/`pb_20`→`pb_01`（最小世界无独立场景，指向圣遗前庭）
- **jishengqianye**：敌人 `js_boss`→`wc_jq_boss`（战斗表实为 `wc_*` 前缀）

### 3.7 传送落地进墙（4 处）
- `ys_pt_exit`/`tt_pt_exit`（同模板撤离门）：落地 (20,23) 为墙 → 改到 F1 降落/撤离点 (2,13)
- `p_xh_1`：落地 (4,5) 墙 → (6,5)
- `yz_pt_x2`：(3,5) 墙 → (4,5)；`yz_pt_x5`：(6,10) 墙 → (7,10)

> 说明：上述「悬空引用」多为近几批展示/扩展世界在批量铺表时的 id 笔误（前缀、编号、未建场景），抽样测试不触发因此从未被发现；全遍历一次抓净。

---

## 四、cargo test / build 结果

| 命令 | 结果 |
|------|------|
| `cargo test --release --no-fail-fast` | **exit 0，263 passed / 0 failed / 0 ignored** |
| `cargo build --release` | **exit 0，成功**（仅原 110 条 warning，非错误） |

- 原抽样 252 例 + 新增全遍历 11 例 = **263 passed，0 failed**。
- 新增 11 例明细：`all_worlds_interaction_test` 3、`all_upgrades_test` 5、`all_panels_test` 3。

---

## 五、遗留 / 说明
- 引擎对战斗机关同时支持「场景带 fight_id」与「fight 配置」两种锚定，故 test 对 zones 用 OR 语义（两者都不可解析才判坏）；这与个别世界既有数据一致。
- 个别极小展示世界（panbu 等）无独立调查点场景，已按「指向楼层 hub」的最小可达原则收敛，未新增剧情场景（避免过度扩大改动面）。
- 未修改 engine.rs / state.rs / defs.rs 核心逻辑；所有修复均在 `src/worlds/*.rs`、`src/scenes_*.rs`、`src/items_data.rs` 的**数据表**层，最小侵入。
- **未部署**。
