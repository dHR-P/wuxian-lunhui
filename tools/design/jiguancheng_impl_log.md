# 《侠行天下 · 机关城核心》实现日志（副本子代理）

> 子代理：编程类，模型 `tokenrhythm/deepseek-v4-flash-0731`（与主线同模型）。
> 落地根：`games/wuxian-horror-ch1`。
> 产出：**只写 3 个全新文件 + 本日志**，未改动任何既有文件（一个字节未碰）。

## 1. 三文件产出与行数

| 文件 | 行数 | 说明 |
|---|---|---|
| `server-rs/src/worlds/jiguancheng.rs` | 217 | 世界静态数据（4 层地图 + POINTS + ENEMIES + NPCS + ZONES + PORTALS + GATES） |
| `server-rs/src/scenes_jiguancheng.rs` | 848 | 剧情与战斗（JIGUAN_SCENES 42 个场景 + jiguancheng_figths 11 场战斗 + 查询辅助） |
| `server-rs/tests/jiguancheng_flow.rs` | 192 | 集成测试（5 个用例） |

> ★项：上述文件在合并注册之前**不参与编译**（未挂入 worlds/mod.rs / scenes.rs / lib.rs），
> 结构按 scenes_zhouyuan.rs / tests/moruiya_flow.rs 模板逐一对齐自查。

## 2. 场景覆盖核对（worlds POINTS/NPC 路由 → scenes 场景 id 全部存在）

worlds/jiguancheng.rs 的 16 个 POINT 路由 + 1 个 NPC talk 全部解析到 JIGUAN_SCENES 中已定义场景：
`jg_02_ling_a / jg_05_ancestor / jg_05_rune_bell / jg_02_gear_key / jg_05_rune_arrow /
jg_11_gear_a / jg_11_gear_b / jg_11_gear_c / jg_05_rune_workshop / jg_04_parts /
jg_13_pivot_key / jg_05_rune_corridor / jg_13_keeper_note / jg_30_box / jg_05_rune_core /
jg_24_keeper_rel_ac`；NPC talk 改指 `jg_13_keeper_note`（守城人笔记，语义一致）。
场景 id 全集（42 个）：`jg_00..jg_32_card`、`jg_*_death*`、`jg_keeper_round`、`jg_colossus_round` 等，grep 已核对无重名、无断链。

## 3. 核心玩法落地方式（对照设计 §10「最小改动」，零新增引擎能力）

1. **单向传送闭环**：PortalDef 物理单向（只建起点门不建反向门）。前向门 `p_jc_1/2/3/5`
   层级递增；唯一回跳门 `p_jc_4`（L3(34,8)→L2(30,18)，to_floor<floor）把地图缝合成箱庭。
   实证：测试③断言"回跳门仅此 1 扇 + 四道进深单向门齐备"。
2. **三启 flag 拼合**：三齿轮机关（jg_11_gear_a/b/c）各 AddItem `it_gear_token_a/b/c`
   （因 AddItem 去重，拆三 id 规避设计 §10 风险 3）+ SetFlag `gear_sw_a/b/c`；
   每处经 `route_gear_pivot` 校验，三处齐发才置 `gear_puzzle_clear`（结算 flag + G2 升降梯
   解锁）与 `jg_pivot_gate`（任务约定的闭合标志）。G2 GateDef `need_flag=gear_puzzle_clear`。
3. **密匣三分支结局**：`jg_30_box` 三选一 → `jc_box_open / seal / destroy`（互斥，各自 AddItem
   it_cross_box_open/sealed 或点数 +150），tri-select 任一均置 `jc_box_choice`（结算 +200）→
   `jg_31_exit` → `jg_32_card`（sp_grade=D + 回主神按钮）。
4. **BOSS 选择驱动**（参考 zhouyuan zy_boss_round / route_boss_attack）：
   - 巨像 `jc_colossus` HP160/dmg(16,24)/奖励550/狂暴@HP≤70；`jg_colossus_round` 每回合动作
     重击/连击/以令夺枢（需三枢机令+狂暴 → 40 固伤并解狂暴）/后撤；`gear_crush` 每 3 回全场
     Hurt(8，jg_qinggong 轻功 flag 减半→4)。胜利 → +550 + it_wuxue_map + it_colossus_core
     + jc_colossus_down + sp_grade=D。
   - 隐藏守城人 `jc_keeper` HP140/dmg(14,22)/奖励400/狂暴@HP≤60；狂暴后持完整墨令可
     `jg_keeper_round` 出示免战 → low +400 + keeper_freed + it_shoucheng_token。
   ZoneDef（jg_z_l4_boss / jg_z_l4_keeper kind=fight）引用以上战斗 id，声明式；实际接入走
   场景链（与咒怨 BOSS 区同款）。
5. **失败复活**：死亡 overlay（death:(title,cause)）卡片文案「回主神空间扣 300 点复活」，
   按钮 `__enter_nexus__`，由主线复活系统接线（设计 §8，与蜂巢同口径）。

## 4. 与设计文档的差异（如实）

1. **旗标命名归一**：任务约定「三个机关各置 jg_master/jg_b/jg_c → 集齐开 jg_pivot_gate」；
   因设计 §3/§7 结算 flag 权威是 `gear_sw_a/b/c → gear_puzzle_clear`，实现同时落：
   `gear_sw_a/b/c`（设计）+ 集齐置 `gear_puzzle_clear` 与 `jg_pivot_gate`，两者都保证；文献复述见 §3-2。
2. **枢机令拆三 id**：设计 §10 风险 3 预设 AddItem 去重，故 `it_gear_token_a/b/c` 拆三，
   终结条件 = 三 id 齐备（同 §10 建议）。
3. **门楼铜钟非铭文点**：设计 L1 表称铜钟"铭文点之一"，但 §7 rune_full 仅列
   (38,3)(30,3)(35,3)(19,16) 四坐标；为保 rune_full=恰好 4，铜钟仅作纯剧情调查（+5 点），不设第 5 枚。
4. **隐藏区 l4 静室**：POINT `jg_p_l4_3` 路由 jg_24_keeper_rel_ac（静室遗物=守城人遗书），
   与 G4 暗门（need_flag=mo_ling_broken）解耦为可选拾取；G4 gate 落在 (9,10)。
5. **befores 网格尺寸**：4 层各 40×26 按设计 ASCII 原样采用，`!I`装饰点尽量落在地板格；
   测试①已断言全 40 字符/行 + 出生点 (14,20)。
6. **撤离阵**（p_jc_exit）：依设计 §10 风险 5 建议，胜利后全走剧情路由（jg_31_exit→jg_32_card），
   p_jc_exit 保留声明但核心撤离靠结局幕（`__enter_nexus__`）。

## 5. ★外部依赖清单（合并注册代理需做的接线）

1. `worlds/mod.rs`：`mod jiguancheng;` + 注册 `WORLD_JIGUAN="jiguancheng"` 常量 + 在 WORLDS
   追加 `JIGUAN` WorldData（引用 `jiguancheng::JIGUAN_L1..L4_MAP/FLOOR_NAMES/POINTS/ENEMIES/NPCS/ZONES/PORTALS/GATES`，
   initial_scene="jg_00"）。可另在 GW_PORTALS 挂主神→机关城网关（本代理未动，留给主线）。
2. `scenes.rs`：`pub fn scene()` 链追加 `JIGUAN_SCENES`；`pub fn fight_cfg()` 链追加
   `jiguancheng_figths()`。
3. `lib.rs`（或 main.rs）：`pub mod scenes_jiguancheng;`（供 tests 引用 scenes_jiguancheng::jiguancheng_figths）。
4. **未注册文件不参与编译**：合并前全量 `cargo check/test` 会忽略本 3 文件（与 zhouyuan 前置相同）。

## 6. 自验（仅局部分析；未注册无法整链编译）

- worlds：POINT/NPC 路由目标全部命中 scenes（已 grep 核对）；地图四行各 40 字符（按设计 ASCII
  手抄，测试①亦会断言）；出生点 (14,20)=spawn()。
- scenes：id 无重复；`route_gear_pivot/route_rune/route_mo_ling_synth/route_exit_settle` 与
  具名 cond 均只定义一次（前期去重一次）；fight 表字段齐全，win/death 路由场景存在。
- tests：按 moruiya/zhouyuan 模板写 5 用例，含主线走到巨像胜利 + 结算 + 密匣三选一 + 闭环断言。

## 7. 测试清单（tests/jiguancheng_flow.rs）

1. `jiguancheng_l1_map_reachable` —— L1 可达（4 层 40 字符、出生点 (14,20)、L1 点可走动、传送门落点在地板）。
2. `jiguancheng_main_line_colossus_win` —— 主线链：jg_00→工坊三启→升降梯→回廊取枢机钥→枢机桥→核心→巨像胜利(sp_grade=D)→密匣开启→结算。
3. `jiguancheng_one_way_portal_closure` —— 单向闭环：p_jc_4 为唯一回跳(to_floor<floor)，p_jc_1/2/3/5 进深单向齐备。
4. `jiguancheng_box_three_branches` —— 密匣三分支：开启/封存/毁匣各断言 flag+item/点数。
5. `jiguancheng_fight_table_complete` —— 战斗表完整性：11 场，巨像 HP160/狂暴70/奖550、守城人 HP140。