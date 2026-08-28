# 《无限曙光 · 破晓封锁区》(poxiao) 实现日志

## 角色 / 模型
子代理：「无限曙光·破晓封锁区 副本实现」。模型 tokenrhythm/deepseek-v4-flash-0731。

## 职责边界
- 只写**全新文件**，绝不修改任何既有文件（合并由主线做）。
- 交付四份全新产物：
  1. `server-rs/src/worlds/poxiao.rs` —— 世界静态数据（3 层，40×26）
  2. `server-rs/src/scenes_poxiao.rs` —— 场景/战斗静态表
  3. `server-rs/tests/poxiao_flow.rs` —— 集成测试
  4. `tools/design/poxiao_impl_log.md` —— 本实现日志
- 不部署、不 build --release；只动自己文件。

## 设计依据
- 精读 `design/zhttty_universe/wuxian_shuguang/shixue_poxiao.md`（§3 地图 / §5 BOSS / §6 剧情 / §10 实现风险）。
- 方向原则：以「嗜血破晓世界观下的黎明之城 · 人类与血族对峙」为主，弱化封神计划阴谋线；
  剧情开放（三方势力抉择 = 玩家自由选边，无对错）。钩子「太阳快出来了——这对某些人，是末日。」
- BOSS：高级沉沦者·格里高尔 HP120 / 狂暴嗜血 / 日光射线终结（镜阵校准 flag 链）。
- **零新引擎系统**：
  - 日光倒计时 → 用剧情 flag 降级（`poxiao_phase_1/2` = 阶段开关、`poxiao_daylight` = 临界死亡线）
  - 三方势力互斥 flag（`poxiao_faction_human/moderate/neutral` 三者只置其一）
  - BOSS 日光射线终结 → 镜阵校准 flag 链（`poxiao_archive` + `poxiao_dawn_mirror` + `poxiao_sunray_ready`）
- 素材：bg 占位 `img_zhuyuan_book.png / img_corridor.png / img_redqueen.png`（注释待替换 `px_bg_*`）；
  敌人立绘复用 guard→守卫/血族、hunter→沉沦者。

## 模板参照
- `worlds/wulin.rs` + `worlds/hezi.rs`（世界表结构）
- `scenes_wulin.rs` / `scenes_hezi.rs`（场景/战斗表、选择驱动 BOSS、结算卡）
- `tests/wulin_flow.rs`（测试骨架）。

## 世界架构（worlds/poxiao.rs）
- 出生点 P = L1 (4,24) 进入点。
- L1 封锁城区街道：教会收容所（道尔顿）、废弃血站、钟楼广场、十字路口（沉沦者群）、公寓楼、店面废墟、坍塌废墟、地铁口 → L2。
- L2 地下排水道与叛军据点：叛军据点（奥黛丽/埃尔维斯、通讯台三方抉择）、泵房（阀门谜题 flag）、
  深水渠巢穴、发电机房、货运电梯 → L3。
- L3 黎明尖塔：尖塔大堂 → 中层实验区/档案室（弱点情报）→ 顶层决战平台（镜阵列 + BOSS 格里高尔 + 埃德加）。
- 单向传送门（p_px_1 L1→L2、p_px_2 L2→L3 货运电梯、p_px_3 L2→L1 回程捷径）。
- 门禁：G1 军械库（血浆样本×2 或 人类 flag）、G2 水闸（阀门 flag）、G3 电梯闸（发电机 flag）、
  G4/G5 顶层闸门（档案 flag，决战前置）。

## 主线链（scenes_poxiao.rs）
- 幕 0 开场（任务宣言 + 钟楼报时）→ 幕 1 教堂道尔顿（接受护送 → 沉沦者教学战）→ 血站（血清情报）
  → 幕 2 地下三方抉择（人类/血族/中立 互斥 flag）→ 幕 3 档案室（弱点）+ 镜阵列校准（flag 链）
  → 决战前可选「校准主控台」（`poxiao_sunray_ready`）→ BOSS 格里高尔击败（日光射线终结）
  → 结局三变体（human/moderate/neutral）→ 结算卡回主神。

## fight 清单（scene id 全 `px_`，fight id 全 `pc_`）
- `pc_vamp_civil` 平民吸血鬼（L1）
- `pc_guard` 血站守卫吸血鬼（L1）
- `pc_degenerate` 沉沦者（L1 教学 / L2 巢穴 / L3 实验笼）
- `pc_degenerate_horde` 沉沦者群（L1 十字路口）
- `pc_rebel_guard` 叛军守卫（L2，两义势力可对话可战）
- `pc_vamp_patrol` 血族巡逻队（L2）
- `pc_elite` 嗜血沉沦者·精英（L2 发电机房）
- `pc_spire_guard` 尖塔卫队·血族士兵（L3）
- `pc_boss_gregor` BOSS 高级沉沦者·格里高尔（HP120 / 狂暴@60 / 日光终结）

## 关键系统落地（零新引擎）
- **日光倒计时**：`poxiao_phase_1/2`（阶段 flag）、`poxiao_daylight`（临界危险氛围）；由剧情节拍推进
  （进入 L3 档案/镜阵阶段、决战前），淡化为氛围 flag，不新增 state 字段。
- **三方势力互斥**：通讯台一次选项只置 1 个 faction flag，后续结局按 flag 路由三套文本。
- **日光射线终结**：`poxiao_archive`（弱点情报·开顶层闸门）→ `poxiao_dawn_mirror`（左→右→主控校准）
  → 决战开场选「校准主控台」→ `poxiao_sunray_ready`；BOSS 半血狂暴后据此触发日光射线演出 + 终结。
- **选择驱动 BOSS**：`start_gregor` 从 `pc_boss_gregor` FightCfg 初始化 `st.fight`，每回合 Route::Dyn 结算。

## 测试清单（tests/poxiao_flow.rs）
1. L1 可达性：出生点 / 地图完整性 / 传送门落点 / 关键地标可走。
2. 主线链：教堂道尔顿 → 血站 → 地下三方抉择（人类线）→ 档案→镜阵→决战格里高尔（日光终结）→ 结局。
3. 三方势力互斥 flag：一次只能置 1 个 faction；结局按互斥路由。

## ★外部依赖（主线合并阶段需要，已按现有模板签名核对）
1. `server-rs/src/worlds/mod.rs`：
   - `mod poxiao;`
   - `pub const WORLD_POXIAO: &str = "poxiao";  // 无限曙光·破晓封锁区`
   - 新增 `static POXIAO: WorldData`（id=WORLD_POXIAO, initial_scene="px_00_open",
     floors 用 `poxiao::POXIAO_F1..F3_MAP`，其余指向 `poxiao::POINTS/ENEMIES/NPCS/ZONES/PORTALS/GATES`），并入 `WORLDS` 数组。
   - 可选：主神网关 `gw_poxiao`（落点= L1 出生点 (4,24)）。
2. `server-rs/src/lib.rs`：`pub mod scenes_poxiao;`。
3. `server-rs/src/scenes.rs`：
   - `fight_cfg()` 追加 `.or_else(|| crate::scenes_poxiao::poxiao_figths().iter().find(|(k, _)| *k == id).map(|(_, v)| v))`
   - `scene()` 追加 `.or_else(|| crate::scenes_poxiao::POXIAO_SCENES.iter().find(|s| s.id == id))`
4. **注意**：`start_gregor` / `gregor_win` 依赖 `scenes::fight_cfg("pc_boss_gregor")` 能被解析（第 3 条合并后即可）；
   否则 BOSS 选择驱动回合 hp 不初始化会死循环——主线务必先做第 3 条再放行测试。

## 与设计差异
- 任务半径跟随（§10 方案 A）：本实现**暂未落地**（需 Eff::SetAnchor/ClearAnchor + state AnchorState 新字段，
  属引擎小改，超出「零新引擎」且职责限定为只写新文件）——改为剧情叙事弱化（道尔顿台词提醒「别走远」）。
- 日光倒计时由硬时限（turn≥150 抹杀）**降级为阶段 flag 氛围**（零 state 改动），未做真实回合计数失败路径。
  阶段 flag `px_phase_1/2` + `px_daylight` 仅氛围；`px_death_sunrise` 死亡卡已注册供未来硬时限接线。
- 结算评级沿用 sp_grade 写法，未改结算函数。人类线 sp_grade=B、血族/中立=C。
- 军械库门禁 `px_armory_open` 走「人类路线 flag」；货运电梯门禁 `px_generator`、顶层闸门 `px_archive`
  与地图 GateDef 一致。

## 落盘状态（已在临时合并副本验证：cargo check --lib 通过 + poxiao_flow 全绿 + wulin/hezi 回归无冲突）
- [x] worlds/poxiao.rs（197 行，3 层，26 行×40 列全通过，BOSS 落位 L3(18,5)）
- [x] scenes_poxiao.rs（716 行，POXIAO_SCENES 45 场景，poxiao_figths 9 战斗）
- [x] tests/poxiao_flow.rs（180 行，3 用例：L1 可达 / 主线链→格里高尔战+日光终结→结局 / 三方互斥 flag）
- [x] 回归：wulin_flow 4 + hezi_flow 3 用例通过（merge 钩子无冲突）