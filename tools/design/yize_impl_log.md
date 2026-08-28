# 《大宇宙时代 · 远古遗迹·遗泽》实现日志（yize）

> 实现子代理：遗泽（yize）副本实现子代理 ｜ 模型：tokenrhythm/deepseek-v4-flash-0731
> 设计依据：`design/zhttty_universe/dayuzhou_shidai/yiji_yize.md`（权威）
> 硬约束：只写全新文件（worlds/yize.rs + scenes_yize.rs + tests/yize_flow.rs + 本日志）；绝不修改既有文件；不部署；不 build --release。
> 主神衔接：world id 常量 `WORLD_YIZE = "yize"`、`mod scenes_yize;`、`scenes::scene()`/`scenes::fight_cfg()` 扩展由主线合并阶段做（★外部依赖，见下）。

---

## 【已完成】File 1 · `server-rs/src/worlds/yize.rs`（世界静态数据，231 行）

### 层数
4 层，40×26/层（MAP_W=40, MAP_H=26 与引擎一致）：
- F1 遗迹外层 · 风化柱廊与巨门（`YIZE_F1_MAP`，§3.1）
- F2 中庭 · 能量矩阵大厅（`YIZE_F2_MAP`，§3.2）
- F3 深廓 · 守卫引擎库（`YIZE_F3_MAP`，§3.3）
- F4 核心 · 遗泽圣所（`YIZE_F4_MAP`，§3.4）

### 导出项
- 地图：`YIZE_F1_MAP..F4_MAP`、`YIZE_FLOOR_NAMES`
- 表：`POINTS` / `ENEMIES` / `NPCS` / `ZONES` / `PORTALS` / `GATES`（全部 id `yz_` 前缀）
- `use crate::maps;` 引用映射类型（与 zhouyuan/moshi 一致）
- 出生点 P 在 F1 入口大厅 (19,24)；每行恰 40 字符（程序化生成 + BFS 验证连通性后落盘）。

### POINTS（调查点，17 个）
| id | 层 | 坐标 | 内容 |
|---|---|---|---|
| yz_pt_entry | F1 | (19,24) | 入口前厅（出生/开场） |
| yz_pt_obs | F1 | (8,4) | 观测终端（relog 预告） |
| yz_pt_supply | F1 | (13,17) | 补给舱 · 权限卡 Lv1 |
| yz_pt_battery | F2 | (5,10) | 能量电池架（energy_cell） |
| yz_pt_archive | F2 | (34,15) | 全息档案台（矩阵顺序线索） |
| yz_pt_well | F2 | (19,13) | 能量之井 |
| yz_pt_engine | F3 | (19,13) | 引擎操控台 |
| yz_pt_wrench1/2/3 | F3 | (15,10)/(23,10)/(19,16) | 三步断电扳手 |
| yz_pt_valve | F3 | (24,17) | 排热阀 |
| yz_pt_holo | F4 | (19,7) | 全息立壁·遗泽纪录 |
| yz_pt_altar | F4 | (19,13) | 祭坛（BOSS 触发） |
| yz_pt_sh1..sh4 | F4 | (9,10)/(29,10)/(9,15)/(29,15) | 护盾碎片座 S1-S4 |
| yz_pt_exit | F4 | (19,3) | 通关传送门位 |

### ENEMIES（§4，fight 引用 yize_figths()）12 个
F1 风化守护者×2/维护哨×1；F2 镜像幻影×2/守卫灵(精英)×1；F3 重装×2/撕裂者(精英)×1/无人机×1；F4 圣所哨兵×2/相位撕裂者(精英)×1（入口 19,23）。

### NPCS（2）
- yz_n_zhangheng（张恒·预知者，F1）→ yz_n_zhangheng
- yz_n_nianxikong（念夕空·传递者，F4）→ yz_n_nianxikong

### ZONES（6）
- yz_z_trap（F1 扫描陷阱回廊，puzzle→yz_d_trap）
- yz_z_matrix（F2 能量矩阵谜题，puzzle→yz_d_matrix）
- yz_z_well（F2 能量之井·守卫灵，fight→yz_ghost）
- yz_z_barracks（F3 东兵舍区，puzzle→yz_d_barracks）
- yz_z_shields（F4 四维护盾碎片阵，puzzle→yz_d_sh1）
- yz_z_boss（F4 遗泽圣所·仲裁者，fight→yz_arbiter）

### PORTALS（8，§3.5 接线表，物理单向）
X1(4,23)→F2(36,12) / X2(36,23)→F2(3,5) / X3(5,20)→F1(37,10) / X4(19,3)→F3(6,22) / X5(31,3)→F4(6,10) / X6(6,4)→F2(35,5) / 北升降(19,3)→F4(19,21) / X7(35,12)→F3(4,12) / X8→通关（名义，跨世界出口走 scenes Route）。

### GATES（4，§3.6）
| id | 位置 | 需要 |
|---|---|---|
| yz_gate1 尘封巨门 | F1(19,4) | relic_key1（权限卡 Lv1） |
| yz_gate2 北闸口 | F2(20,5) | yz_matrix_open（派生 flag，见下） |
| yz_gate3 轨道闸 | F3(20,4) | yz_engine_open（派生 flag） |
| yz_gate4 大殿门 | F4(19,20) | yz_legacy_history（读过遗泽纪录） |

### 与设计差异（File 1）
1. **G2/G3 双条件 OR**：§3.2/§3.3 "电池 OR 矩阵顺序" / "断电完成 OR 卫兵核心" 为 OR；引擎 `GateDef` 只支持 AND（need_item×need_flag 同时成立才开，见 main.rs api_world_interact）。改用派生 flag：`yz_matrix_open`、`yz_engine_open` 由场景在满足任一条件时置位（同 yinse 的 `ys_core_open` 模式）。门禁仅判派生 flag，逻辑等价。
2. **矩阵/护盾坐标落地**：§3.2 矩阵场四核心 M1..M4、§3.4 护盾四座 S1..S4 均按设计坐标落地为 PointDef；顺序谜题在 scenes 分支核对（无需新数据结构）。
3. **X8 跨世界出口**：引擎 `PortalDef` 无 to_world；X8 通关传送门作名义点（地图点 yz_pt_exit 路由到 ending→结算卡），跨世界回主神由 `__enter_nexus__` 按钮走主神接线，同 yinse 的 pt_exit 模式。

### 素材引用（§9.1/§9.2）
本文件无图（纯坐标数据）；bg 占位见 scenes 头注释（img_laser / img_redqueen / img_zhuyuan_book，待替换 yz_bg_*）。

---

## 【已完成】File 2 · `server-rs/src/scenes_yize.rs`（剧情与战斗，764 行）

### 导出项
- `pub static YIZE_SCENES: &[SceneDef]`（id 全部 `yz_` 前缀）
- `pub fn yize_figths() -> &'static [(&'static str, FightCfg)]`（id 全部 `yz_` 前缀）
- 辅助：`yz_scene(id)` / `yz_fight_cfg(id)`（主线合并查询扩展时可直接调用）

### BOSS「遗迹仲裁者」 `yz_arbiter`（HP180, dmg(16,25), 奖300）—— §5
- **选择驱动遭遇链**（参考 scenes_mojiao 教主 / scenes_jiguancheng colossus 模式）：Normal 场景 `yz_arb_round` + Route::Dyn 统一处理每回合并；引擎原生 FightCfg 无 phases 钩子，故用场景链（§10.2 取舍）。
- **四维护罩 flag 伪实现**（§10 风险 1）：碎片座 S1..S4 按 `SHIELD_ORDER=[3,1,4,2]` 顺序交互；每关一片伤害系数 `shield_coeff = 0.4 + 0.2×closed`（0.4→0.6→0.8→1.0）。顺序错 → `shield_reset` 复位全碎片 + 相位冲击 Hurt(6) + San-8。四片全关置 `yz_unlock_order`（结算 +200）。
- **狂暴**：HP≤60 → 过载态伤害区间升至 (20,30)「警告。熵值超限——」（沿用 rage_at/on_rage 数值表，选择驱动内手动判）。
- **[仲裁裁定]终结**（§5）：`finisher_if = shield_closed==4 && hp<45` → `yz_arb_finisher` 场景演出「裁定：继承权确认」→ arb_win。仲裁者战死另设兜底（hp≤0 直接 arb_win）。
- **胜利掉落**：+300、`AddItem legacy_core`、sp_grade=Some('D')；若 `yz_unlock_order` 成立再 +200。

### 敌人表（§4）10 项
`yz_sentinel / yz_drone / yz_phantom / yz_ghost / yz_heavy / yz_ripper / yz_sentry / yz_ripper_phase` + BOSS `yz_arbiter` + 强夺残骸 `yz_arb_remnant`(HP60)。狂暴按文档；立绘全部复用（guard→自律兵器、hunter→撕裂者/仲裁者，§9.3 注释待换色）。

### 剧情线（§6 四幕）
- 幕一 踏入神迹（F1）：观测终端「尊主」预告 → 扫描陷阱回廊（侦察可绕行，`yz_f1_stealth` 结算 +200；强行闯阵触发守卫战）→ 补给舱取权限卡 → 巨门 → F2。
- 幕二 矩阵与齿轮（F2/F3）：矩阵四核顺序 `yz_matrix_order`（正确+40 / 乱序触发幻影战 / 任涛提示）；F3 三扳手三步断电（竞速，每步警醒一兵，三路齐断 `yz_engine_room_core`+`yz_engine_open`）；离开前「排热阀」回收"遗泽不是礼物，是检疫"伏笔。
- 幕三 遗泽真相（F4 全息立壁）：完整听完 / 质疑二次扫描 / 转身不听；前二者置 `yz_legacy_history` 解锁大殿门，后者惩罚（满盾 BOSS）。接「九级毁灭之歌 / 银色之物」伏笔。
- 幕四 带走 or 留下 or 强夺（§6 三选无对错）：
  - 带走遗泽·种子：`yz_legacy_take` +400 +3×`legacy_shard`（能量武器线）+ 结算 PointsIfFlag；张恒「你带走的是一整个战争」+ 银色之物睁眼 CLIFHANGER。
  - 留下警示·石碑：`yz_legacy_warn` +400 +`relic_seal_tome`（空间技术线）+ 结算 PointsIfFlag；姚源「我们该让后来者自己决定」。
  - 贪婪强夺：`start_remnant` 触发仲裁者残骸二段战(HP60) → `yz_legacy_graverob` +150 +1×`legacy_shard` San-20；灰色结局，**不计结算结局支线中的 t ake/warn 项**（仅保留游玩期 4 项 PointsIfFlag）。
- 结算卡 `yz_settle_card`：sp_grade D 级、回主神 `__enter_nexus__`；死亡档案 `yz_lose_arb`「葬于神迹」复活扣 300 点（表意，实际复活连通由主线接）。

### 护盾 / BOSS 判定细节
- `shield_closed` / `shield_coeff` / `ord_count` / `shield_reset` / `shield_act(idx)`：纯 flag 伪实现，零引擎改动。
- 仲裁裁定 `yz_arb_finisher` 为独立演出场景：「四碎片同时亮灭 + 核心爆裂 + 宣告」。

### 与设计差异（File 2）
1. 两段式（主 BOSS + 强夺残骸）均落地为**选择驱动回合**，不依赖引擎 `Mode::Fight` 同步（同 scenes_zhouyuan/mojiao 取舍案）。
2. `FightCfg.win` 为只读闭包，掉落/flag 全由剧情场景 Choice 的 Eff 落地（`arb_win`/`graverob_win` 在 Route::Dyn 内直接改状态）。
3. settlement 支线点数改由**结局结算场景内嵌 PointsIfFlag** 发放（`f1_stealth/matrix_order/engine_room_core/unlock_order` + 结局其一），而非依赖主线 settlement 逐 flag 计数——引擎 `PointsIfFlag` 现成，主线无需改结算公式。
4. graverob 分支按规定**不计结局项 PointsIfFlag**（§6.3 灰色结局）。

---

## 【已完成】File 3 · `server-rs/tests/yize_flow.rs`（集成测试，172 行）

1. `yize_f1_map_reachable`：四层每行 40 字符 / 出生点 (19,24) / F1 点可走动 + 出生点 BFS 连通。
2. `yize_main_line_arbiter_ending`：观测→陷阱绕行→权限卡→矩阵→三步断电→真相→护盾 S3→S1→S4→S2→仲裁者护盾战（重击循环→仲裁裁定/胜利）→带走结局→结算卡（sp_grade=D、掉 legacy_core×1、legacy_shard×3）。
3. `yize_shield_order_wrong_reset`：S3→S1 正确后点 S2（应 S4）错序 → 相位冲击复位 + 不进 yz_sh_wrong，unlock_order 不置，Hurt6；重整回十字殿。

### 外部依赖（★ 需主线合并阶段完成）
| 依赖 | 说明 |
|---|---|
| `WORLD_YIZE` 常量 + `mod worlds::yize;` | worlds/mod.rs 新增 `pub const WORLD_YIZE: &str = "yize";`、`mod yize;`，并注册进 `WORLDS` 列表 `&YIZE` |
| `mod scenes_yize;` | 库根新增模块声明 |
| `YIZE_SCENES` 并入 `scenes::scene()` | scenes.rs `scene()` 增加 `or_else(|| scenes_yize::YIZE_SCENES.iter().find(...))` |
| `yize_figths()` 并入 `scenes::fight_cfg()` | scenes.rs `fight_cfg()` 增加 `or_else(|| scenes_yize::yize_figths().iter().find(...))` |
| 网关/跨世界 | 主神空间门「🏛 八级遗迹·遗泽」由主神世界接入（gw_yize），入场发放高斯手枪 + 30 发（Weapon 开局） |
| 道具定义 | `legacy_core/legacy_shard/relic_seal_tome/relic_key1/energy_cell/guard_core` 交主神兑换线（Scene 内 AddItem 无需 items_data 条目） |

---

## 待办 / 提醒
- [ ] 主线合并注册（上表外部依赖）。
- [ ] cargo check 须在注册后由主线执行（本子代理不改既有文件，无法独立编译新文件；scenes/tests 引用 scenes::scene / fight_cfg 在未注册前编辑器会报错属预期）。
- [ ] 素材命名核对：bg `yz_bg_outer / yz_bg_matrix_hall / yz_bg_engine_bay / yz_bg_sanctum / yz_bg_legacy_holo` + BOSS `enemy_arbiter`（§9 已列，主线统一生图替换占位 img_laser/img_redqueen/img_zhuyuan_book）。