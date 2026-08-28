# 《无限恐怖·生化危机·伊芙琳·浣熊市地下》实现日志（副本子代理）

> 子代理：编程类，模型 `tokenrhythm/deepseek-v4-flash-0731`（与主线同模型）。
> 落地根：`games/wuxian-horror-ch1`（副本源码在 `server-rs/`）。
> 产出：**只写 3 个全新文件 + 本日志**，未改动任何既有文件（一个字节未碰）。
> 定位：`tools/design/impl_template.md` 黄金模板复制替换。主题「地下幸存」，3 层推进：地下水道 → 警察局地下 → 实验室·孵化室。
> 世界展示向、无真相线、开放结局；BOSS 为**选择驱动**。

## 1. 文件进度

| 文件 | 行数 | 状态 |
|---|---|---|
| `server-rs/src/worlds/shenghua3.rs` | 151 | ✅ 已落盘（3 层 40×26 + POINTS 12 + ENEMIES 3 + NPCS 3 + ZONES 2 + GATES 2 + PORTALS 2，出生点 P(5,5)） |
| `server-rs/src/scenes_shenghua3.rs` | 530 | ✅ 已落盘（SH3_SCENES **32 个场景** + shenghua3_figths **4 场战斗**（3 生化守卫 + 1 选择驱动 BOSS）） |
| `server-rs/tests/shenghua3_flow.rs` | 41 | ✅ 已落盘（3 个确定性用例） |

> ★项：上述文件在合并注册之前不参与编译（未挂入 worlds/mod.rs / scenes.rs / lib.rs），属预期。

## 2. 世界静态数据（worlds/shenghua3.rs）

- **3 层 40×26**：L1 浣熊市地下水道 / L2 警察局地下 / L3 实验室·孵化室（`SHENGHUA3_L1/2/3_MAP`，ASCII 仅示意，坐标为权威，逐行校验每行恰 40 字符）。
- **出生点** `(5,5)` L1 地下水道；`SHENGHUA3_FLOOR_NAMES` 3 层名。
- **POINTS 12 个**（全 `sh3_p_` 前缀，route 指向 scenes 场景 id）：
  L1 `sh3_p_l1_gate`（地下水闸门）/`sh3_p_l1_valve`（生锈控制阀）/`sh3_p_l1_machine`（废弃抽水泵）/`sh3_p_l1_corpse`（道边尸体）；
  L2 `sh3_p_l2_cell`（审讯室门）/`sh3_p_l2_desk`（档案桌）/`sh3_p_l2_evidence`（证据柜）/`sh3_p_l2_safe`（逃生井盖）；
  L3 `sh3_p_l3_morgue`（停尸间）/`sh3_p_l3_console`（主控台）/`sh3_p_l3_vat`（菌株容器）/`sh3_p_l3_data`（数据终端）。
- **NPCS 3 个**（幸存活证）：L1 地下幸存者·蕾吉 `sh3_n_l1_rugged`→talk `sh3_05_survive`；L2 受困警员 `sh3_n_l2_officer`→`sh3_06_officer`；L3 卧底医生·韩 `sh3_n_l3_doctor`→`sh3_07_doctor`。
- **ENEMIES 3 个**（生化守卫）：L1 下水道舔食者 `sh3_e_l1_licker`→fight `sh3_fight_l1`；L2 暴君投影 `sh3_e_l2_tank`→`sh3_fight_l2`；L3 追踪者亲卫 `sh3_e_l3_hunter`→`sh3_fight_l3`。
- **ZONES 2 个**：
  - L1 `sh3_z_l1_sewage` kind=env → `sh3_10_sewage`（污水渠漫水区，未查水质则生化感染致死）；
  - L3 `sh3_z_l3_hatch` kind=fight → `sh3_boss`（复仇女神孵化室 · 选择驱动 BOSS）。
- **GATES 2 个**：`sh3_g1` 井道通风闸（需 `sh3_antibiotic` 抗生素）；`sh3_g2` 孵化室终端门（需 flag `sh3_log_read` 已读孵化日志）。
- **PORTALS 2 个**（下潜推进）：`p_sh3_1` L1(36,21)→L2(20,2)；`p_sh3_2` L2(33,10)→L3(20,2)。

## 3. 证据 flag 链（核心规则流）

「地下幸存」主题：逐层收集三份证据（`sh3_ev_sample`/`sh3_ev_creed`/`sh3_ev_log`），经 `collect_ev` 幂等置 flag，
三份齐备首置 `sh3_evidence_full` 并 +200。未破对应证据闯入环境机关 → 死亡档案；查证 → 免死加点/解锁门禁。

1. **水样样本**（L1）：`sh3_02_gate`（水闸门水样杯）置 `sh3_ev_sample`；蕾吉赠 `sh3_antibiotic`（开 G1/井道）。`sh3_10_sewage` 的 `zone_sewage` 依 `sh3_water_checked` → 免死 `sh3_10_sewage_ok` 或死 `sh3_40_death_sewage`。
2. **伞公司信条**（L2）：`sh3_03_cell`（审讯室信条）置 `sh3_ev_creed` + `sh3_creed_read`（开井道 G）。
3. **孵化日志**（L3）：`sh3_04_morgue`（停尸间日志）置 `sh3_ev_log` + `sh3_log_read`（开孵化室终端门 G2）。

## 4. 选择驱动 BOSS：追踪者·复仇女神

- `FightCfg`（id `sh3_boss`）：name 追踪者·复仇女神，HP **260**，dmg (19,28)，reward 500，rage_at Some(90)。
- 选择驱动公式（黄金模板 C 段照抄）：`sh3_boss_start`（挂 `st.fight`，动态造 Fight）→ `sh3_09_boss_round`；
  `sh3_boss_act(st, dmg, guard)`（扣 BOSS 血 → 归零 `sh3_boss_win`；否则 BOSS 回击 raw，guard 免伤；HP≤0 → `sh3_50_death`）；
  `sh3_boss_win`（+500 pts + `sh3_boss_down` flag + `sp_grade=Some('D')` + `add_item(sh3_item_prototype)`）→ `sh3_30_final_choice`。
- **第二个选择 · 开放结局三分支**（`sh3_30_final_choice` 选择驱动）：
  - `【宽赦幸存者】` → `end_spare` 置 `sh3_end_spare` → `sh3_31_spare`（宽赦重启 · San+20 +150）；
  - `【把样本喂给复仇女神】` → `end_feed` 置 `sh3_end_feed` → `sh3_32_feed`（并肩守界 · +200）；
  - `【引爆孵化室】` → `end_blowup` 置 `sh3_end_blowup` → `sh3_33_blowup`（引爆离场 · San-10 +250）。
  - 三者都 → `route_settle` 置 `sp_grade=D` → `sh3_42_card` 结算卡（body_html 按结局 flag 区分，`__enter_nexus__` 按钮）。

## 5. 集成测试（tests/shenghua3_flow.rs，3 用例）

1. `sh3_scenes_exist`：开场 + 三层 hub + BOSS round + 第二选择 + 结算卡 + 死亡卡 + 三分支结局场景全部存在。
2. `sh3_fights_exist`：`sh3_boss`（HP==260）+ 3 生化守卫 fight 全部在 scenes::fight_cfg 分发可达。
3. `sh3_self_consistent`：`shenghua3_figths()` 表所有 fight id 在 scenes::fight_cfg 分发闭环。

> 测试只依赖 scenes 文件 + scenes::scene/fight_cfg（主线合并后的全局检索），不碰 find_world/walkable。

## 6. ★外部依赖清单（需主线合并阶段接线）

1. `worlds/mod.rs`：注册 `pub const WORLD_SHENGHUA3: &str = "shenghua3";` + `find_world()` 挂 `WorldData { id, name, difficulty, initial_scene:"sh3_00", floors:&[SHENGHUA3_L1_MAP..], floor_names, points:&maps::POINTS, enemies, npcs, zones, portals, gates }`（引入 `use crate::worlds::shenghua3::*`）。
2. `scenes.rs`：把 `SH3_SCENES` 并入 `scene()` 检索、把 `shenghua3_figths()` 并入 `fight_cfg()` 检索（或 each 调 `sh3_fight_cfg`）。
3. `lib.rs`：声明 `pub mod scenes_shenghua3;`（worlds 是否建 `mod shenghua3;` 视模块组织）。
4. 素材替换：bg 现用占位 `img_zhuyuan_book.png`（下水道/开场）/`img_corridor.png`（警察局/实验室 hub）/`img_laser.png`（孵化室/BOSS/机关），待主线生图后换专属背景；3 个生化守卫立绘待替换。
5. 新增道具 `sh3_antibiotic`（抗生素，G1 门禁 need_item）与 `sh3_item_prototype`（样本原型,BOSS 奖励）需主线在 items_data 注册。
6. `sp_grade=D` 走既有经济线；死亡档案复活扣 300 与「生化感染」存档由主线死亡/复活系统接线。

★本子代理只写三文件 + 本日志，未改动任何既有文件；三文件未挂注册故当前不参与编译，属预期。