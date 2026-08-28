# 《星际传奇二·寂静岭·灰雾之心》实现日志（副本子代理）

> 子代理：编程类，模型 `tokenrhythm/deepseek-v4-flash-0731`（与主线同模型）。
> 落地根：`games/wuxian-horror-ch1`（副本源码在 `server-rs/`）。
> 产出：**只写 3 个全新文件 + 本日志**，未改动任何既有文件（一个字节未碰）。
> 定位：`tools/design/impl_template.md` 黄金模板复制替换。主题「罪与罚」，3 层推进：迷雾矿洞 → 废墟教堂 → 灰雾医院。
> 世界展示向、无真相线、开放结局；BOSS 为**选择驱动**。

## 1. 文件进度

| 文件 | 行数 | 状态 |
|---|---|---|
| `server-rs/src/worlds/xingjichuanqi2.rs` | 152 | ✅ 已落盘（3 层 40×26 + POINTS 12 + ENEMIES 3 + NPCS 3 + ZONES 2 + GATES 2 + PORTALS 2，出生点 P(5,5)） |
| `server-rs/src/scenes_xingjichuanqi2.rs` | 537 | ✅ 已落盘（XJ2_SCENES **32 个场景** + xingjichuanqi2_figths **4 场战斗**（3 罪念守卫 + 1 选择驱动 BOSS）） |
| `server-rs/tests/xingjichuanqi2_flow.rs` | 43 | ✅ 已落盘（3 个确定性用例） |

> ★项：上述文件在合并注册之前不参与编译（未挂入 worlds/mod.rs / scenes.rs / lib.rs），属预期。

## 2. 世界静态数据（worlds/xingjichuanqi2.rs）

- **3 层 40×26**：L1 迷雾矿洞 / L2 废墟教堂 / L3 灰雾医院（`XINGJICHUANQI2_L1/2/3_MAP`，ASCII 仅示意，坐标为权威）。
- **出生点** `(5,5)` L1 迷雾矿洞；`XINGJICHUANQI2_FLOOR_NAMES` 3 层名。
- **POINTS 12 个**（全 `xj2_p_` 前缀，route 指向 scenes 场景 id）：
  L1 `xj2_p_l1_rail`（矿车轨道）/`xj2_p_l1_shaft`（塌方竖井）/`xj2_p_l1_well`（积水坑）/`xj2_p_l1_cage`（锈蚀铁笼）；
  L2 `xj2_p_l2_altar`（圣坛）/`xj2_p_l2_conf`（忏悔室）/`xj2_p_l2_pew`（长椅刻字）/`xj2_p_l2_cat`（地下墓穴入口）；
  L3 `xj2_p_l3_reg`（挂号台）/`xj2_p_l3_ward`（303 病房）/`xj2_p_l3_morgue`（停尸房）/`xj2_p_l3_roof`（雾中天台）。
- **NPCS 3 个**（罪证见证者）：L1 守灯老人 `xj2_n_l1_old`→talk `xj2_05_lamp`；L2 敲钟人 `xj2_n_l2_bell`→`xj2_06_bell`；L3 守夜人 `xj2_n_l3_night`→`xj2_07_night`。
- **ENEMIES 3 个**（罪念守卫）：L1 雾中矿工·缚者 `xj2_e_l1_guard`→fight `xj2_fight_miner`；L2 持烛神父·堕影 `xj2_e_l2_priest`→`xj2_fight_priest`；L3 灰雾护士·缝针者 `xj2_e_l3_nurse`→`xj2_fight_nurse`。
- **ZONES 2 个**：
  - L1 `xj2_z_l1_cavein` kind=env → `xj2_10_cavein`（塌方竖井口 · 罪念压身，未破矿洞罪证则死）；
  - L3 `xj2_z_l3_orb` kind=fight → `xj2_boss`（深红手术室 · 选择驱动 BOSS）。
- **GATES 2 个**：`xj2_g1` 教堂侧门（需 `xj2_item_pick` 矿工铁撬）；`xj2_g2` 医院秘密入口（需 flag `xj2_truth_church` 已读透教堂旧罪）。
- **PORTALS 2 个**（逐层推进）：`p_xj2_1` L1(33,21)→L2(20,2)；`p_xj2_2` L2(35,12)→L3(20,2)。

## 3. 罪证 flag 链（核心规则流）

罪与罚主题：逐层收集三桩「罪证」碎片（`xj2_ev_mine`/`xj2_ev_church`/`xj2_ev_hospital`），经 `collect_ev` 幂等置 flag，
三碎片齐备首置 `xj2_evidence_full` 并 +200。未破对应罪证闯入环境机关 → 死亡档案；破证 → 改命免死 + 加点。

1. **矿洞罪证**（L1）：`xj2_02_rail`（矿车轨道）观测置 `xj2_ev_mine`（`mark_ev_mine`）；铁撬 `xj2_02_cage` 获 `xj2_item_pick`。
2. **教堂罪证**（L2）：`xj2_03_altar`（圣坛卷宗）置 `xj2_ev_church`（`mark_ev_church`），并 `xj2_03_gate` 置 `xj2_truth_church` 解锁 G2。
3. **医院罪证**（L3）：`xj2_04_reg`（挂号台病历）置 `xj2_ev_hospital`（`mark_ev_hospital`）。

环境机关：`xj2_10_cavein`（塌方竖井口）→ `zone_cavein`：破 `xj2_ev_mine` 免死回 L1 hub + 30；否则死亡 `xj2_40_death_cavein`。

## 4. 选择驱动 BOSS：三角头·深红审判

- `FightCfg`（id `xj2_boss`）：name 三角头·深红审判，HP **200**，dmg (18,28)，reward 500，rage_at Some(80)。
- 选择驱动公式（黄金模板 C 段照抄）：`xj2_boss_start`（挂 `st.fight`，动态造 Fight）→ `xj2_09_boss_round`；
  `xj2_boss_act(st, dmg, guard)`（扣 BOSS 血 → 归零 `xj2_boss_win`；否则 BOSS 回击 raw，guard 免伤；HP≤0 → `xj2_50_death`）；
  `xj2_boss_win`（+500 pts + `xj2_boss_down` flag + `sp_grade=Some('D')` + `add_item(xj2_item_judgement)`）→ `xj2_30_judgement`。
- **最后审判 · 开放结局三分支**（`xj2_30_judgement` 选择驱动）：
  - `【宽恕】` → `judge_forgive` 置 `xj2_end_forgive` → `xj2_31_forgive`（宽恕静好 · San+20  +150）；
  - `【复仇】` → `judge_revenge` 置 `xj2_end_revenge` → `xj2_32_revenge`（血仇清算 · +200）；
  - `【背负】` → `judge_carry` 置 `xj2_end_carry` → `xj2_33_carry`（背负离场 · San-10  +250）。
  - 三者都 → `route_settle` 置 `sp_grade=D` → `xj2_42_card` 结算卡（body_html 按结局 flag 区分文案，`__enter_nexus__` 按钮）。

## 5. 集成测试（tests/xingjichuanqi2_flow.rs，3 用例）

1. `xj2_scenes_exist`：开场 + 三层 hub + BOSS round + 审判 + 结算卡 + 死亡卡 + 三分支结局场景全部存在。
2. `xj2_fights_exist`：`xj2_boss`（HP==200）+ 3 罪念守卫 fight 全部在 scenes::fight_cfg 分发可达。
3. `xj2_self_consistent`：`xingjichuanqi2_figths()` 表所有 fight id 在 scenes::fight_cfg 分发闭环。

> 测试只依赖 scenes 文件 + scenes::scene/fight_cfg（主线合并后的全局检索），不碰 find_world/walkable。

## 6. ★外部依赖清单（需主线合并阶段接线）

1. `worlds/mod.rs`：注册 `pub const WORLD_XINGJICHUANQI2: &str = "xingjichuanqi2";` + `find_world()` 挂 `WorldData { id, name, difficulty, initial_scene:"xj2_00", floors:&[XINGJICHUANQI2_L1_MAP..], floor_names, points:&maps::POINTS, enemies, npcs, zones, portals, gates }`（引入 `use crate::worlds::xingjichuanqi2::*`）。
2. `scenes.rs`：把 `XJ2_SCENES` 并入 `scene()` 检索、把 `xingjichuanqi2_figths()` 并入 `fight_cfg()` 检索（或 each 调 `xj2_fight_cfg`）。
3. `lib.rs`：声明 `pub mod scenes_xingjichuanqi2;`（worlds 是否建 `mod xingjichuanqi2;` 视模块组织）。
4. 素材替换：bg 现用占位 `img_zhuyuan_book.png`（矿洞/开场）/`img_corridor.png`（教堂/医院/天台）/`img_laser.png`（机关/深红手术室/BOSS），待主线生图后换专属背景；3 个罪念守卫立绘待替换。
5. 新增道具 `xj2_item_pick`（矿工铁撬，G1 门禁 need_item）与 `xj2_item_judgement`（审判印记,BOSS 奖励）需主线在 items_data 注册。
6. `sp_grade=D` 走既有经济线；死亡档案复活扣 300 与死因文案由主线死亡/复活系统接线。

★本子代理只写三文件 + 本日志，未改动任何既有文件；三文件未挂注册故当前不参与编译，属预期。