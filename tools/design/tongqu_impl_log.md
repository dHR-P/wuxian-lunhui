# 通衢古镇 · 夜雨镖局 实现日志（tongqu）

> 副本子代理产出 · 模型 tokenrhythm/deepseek-v4-flash-0731 · 中文
> 角色：《侠行天下·通衢古镇 副本》子代理。**只写全新文件，绝不修改任何既有文件**（合并由主线做）。
> 设计依据：`design/zhttty_universe/00_INDEX_EXPANSION.md` §1.7 `tonggu_guzhen` 骨架 + §3 素材清单 +
> `design/zhttty_universe/xiaxing_tianxia/00_xiaxing_tianxia_research.md`（武侠×跨界/中前期可考场景底/江湖群像）。
> 硬约束：不部署；不 build --release；**零新引擎系统**（复用 SceneDef/Fight/flag/Gate/Portal/Zone）。

## 0. 版本与产出顺序
- 产出顺序：worlds → scenes → tests（任务约定，上下文吃紧则保 worlds+scenes）。
- 世界 id 常量 `WORLD_TONGQU="tongqu"` 由主线注册（本子代理不碰 worlds/mod.rs）。

## 1. 设计骨架（引自 §1.7，任务给定前提）
- 作品：《侠行天下》；slug `tonggu_guzhen`；本实现 slug 用任务给定的 `tongqu`。
- 一句话：「镖，运送的不只是货。」江湖边缘古镇星级镖局线，追凶→护送→雪夜伏击（中前期可考场景为底）。
- 层数：任务明确 **3 层**（40×26）：镇门 / 市井街巷 / 镇尾古宅。
- BOSS：雪夜劫镖·蒙面头领 HP 180（建议值，可调）。
- 结算奖励量级 ≈1400；复活 300；sp_grade=D（Some('D')）。
- 情感核心：侠义与交易的撕裂（zhttty 式小人物）。
- 复用：guard→护院、hunter→黑店打手；bg 用 img_zhuyuan_book/img_corridor/img_train 占位
  （待替换 tq_bg_gate/street/mansion）。

## 2. 剧情设计（推断·自创，通用武功描述词）
三条线汇于雪夜伏击终局：
- 追凶线（江湖恩怨）：镇门雨后车辙 → 追凶蒙面探子 → 镇尾古宅。flag 链 `tq_trace_*`。
- 护送线（镖局侠义）：镖局柜房接「护镖」委托 → 护送镖车（可选 NPC 跟随剧情味）→ 雪夜伏击。
- 黑店线（黑店阴谋）：识破黑店暗门 → 黑店打手伏击 → 得知「黑店通镖局内鬼」→ 直指蒙面头领。
####. 关键词：夜雨、镖旗、刀剑招架、官道、客栈、当铺。

## 3. 实现文件清单
- `server-rs/src/worlds/tongqu.rs`：3 层地图 + POINTS(tq_)/ENEMIES(tqf_)/NPCS/ZONES/PORTALS/GATES。
- `server-rs/src/scenes_tongqu.rs`：`TONGQU_SCENES`(id tq_)/`tongqu_figths()`(id tqf_) + `tongqu_fight_cfg()`。
- `server-rs/tests/tongqu_flow.rs`：3 用例（可达/main 线/分支结局）。

## 地图 ASCII 约定
- `#`=墙 `.`=地板 `P`=出生 `I`=装饰/调查点；每行恰 40 字符，26 行。
- 坐标权威在 POINTS/ENEMIES/ZONES/PORTALS/GATES；ASCII 为示意蓝图。

本文件为落地进度与设计锚点，随产出逐步增补。

## 4. 产出记录（已完成）
- `server-rs/src/worlds/tongqu.rs`：3 层地图（TONGQU_L1/L2/L3_MAP，各 26 行×40 列，程序化生成并校验全走通）
  + TONGQU_FLOOR_NAMES + POINTS(11, id `tq_`; L1×4/L2×4/L3×3) + ENEMIES(4, id `tqf_`) + NPCS(2, `tq_n_laobiao`/`tq_n_guo`)
  + ZONES(1, `tq_z_l3_boss` ref `tqf_boss`) + PORTALS(4, p_tq_l1l2/l2l3/l3l2/exit) + GATES(1, `tq_g1` need_flag `tq_biaoju_trust`)。
  - 递进链：L1→L2 (p_tq_l1l2)、L2→L3 (p_tq_l2l3)；唯一回跳 p_tq_l3l2(L3→L2) 缝合闭环；p_tq_exit 结算阵。
- `server-rs/src/scenes_tongqu.rs`：`TONGQU_SCENES`（32 场景，id `tq_`）+ `tongqu_figths()`（5 战斗，id `tqf_`）
  + `tongqu_fight_cfg()` 查询辅助。
  - 剧情：镇门(tq_00/01/L1 调查) → 市井(tq_02/追凶/黑店/护镖三线) → 古宅(tq_03/L3 调查) → 雪夜伏击 BOSS(tq_boss_enter/round/win)。
  - 三线 flag：追凶 `tq_trace_2`、黑店 `tq_heidian_truth`、护镖 `tq_biaoju_trust`；BOSS 狂暴后「揭面指认」需 `tq_heidian_truth`。
  - BOSS 雪夜劫镖·蒙面头领 HP180、狂暴阈 70、决策驱动（夜雨每回合寒气 -2）、胜利 +520、密信、sp_grade=Some('D')。
  - 覆盖层：结算卡 tq_34_card、死亡档案 tq_40_death / tq_40_death_boss。
- `server-rs/tests/tongqu_flow.rs`：3 用例（①地图可达性 ②主线链→头领胜利→结算 ③三线汇流+揭面指认结局路径）。

## 5. 校验
- 地图：3 层各 26 行、每行恰 40 字符；POINTS/ENEMIES/NPC/ZONE/PORTAL(含 tx/ty) 全部坐标可走动（脚本校验 RESULT: OK）。
- 场景路由：所有 Route::To 目标与 world 点/NPC 的 route 均在 TONGQU_SCENES 中；tqf_* 5 场全定义。
- 未跑 cargo（本子代理文件未挂进 lib.rs/mod.rs，无法独立编译；由主线合并后统一验证）。

## 6. ★外部依赖清单（合并阶段主线动作）
- `worlds/mod.rs`：声明 `mod tongqu;`、加 `WORLD_TONGQU="tongqu"` 常量、`find_world` 列表注册 `&TONGQU`（WorldData，initial_scene "tq_00"，floors=3，difficulty≈2）。可选 `GW_PORTALS` 加 `gw_tongqu`（主神→落点 L1 P=14,20）。
- `scenes.rs`：`scene()` 末尾追加检索 `crate::scenes_tongqu::TONGQU_SCENES`；`fight_cfg()` 末尾追加 `..tongqu_figths()`。
- `lib.rs`：追加 `pub mod scenes_tongqu;`。
- （本文不触碰既有文件，以上由主线统一改。）

## 7. 测试清单（tongqu_flow.rs）
- tongqu_map_reachable：三层 40×26、出生 (14,20)、POINTS/PORTALS 走通。
- tongqu_main_line_boss_win：tq_00→车辙→市井→客栈追凶(tqf_tuishun)→古宅→雪夜 BOSS 胜→结算，sp_grade=D。
- tongqu_three_branches：黑店/追凶/护镖三线 flag + BOSS「揭面指认」结局路径。