# 《星河战队 · 脑虫巢穴》副本实现日志（xinghe）

> 子代理：tokenrhythm/deepseek-v4-flash-0731 · 中文 · 只写全新文件，不改既有文件。

## 产出顺序
worlds → scenes → tests（本次已完成，测试简写）

## 三文件
- `server-rs/src/worlds/xinghe.rs` —— 3 层（登陆场/地洞/脑虫巢），40×26，纯静态世界数据
- `server-rs/src/scenes_xinghe.rs` —— `XINGHE_SCENES` + `xinghe_figths()`，剧本 + BOSS + 多波次
- `server-rs/tests/xinghe_flow.rs` —— 3 集成用例

## 设计要点
- 世界 id 常量 `WORLD_XINGHE = "xinghe"`（主线注册）。
- 3 层：L1 登陆场 / L2 地洞 / L3 脑虫巢。
- sp_grade = `Some('B')`（B 级支线，对齐摩瑞亚 moruiya 写法）。
- BOSS 脑虫 HP220：选择驱动遭遇（`xh_brain_round`），每回合同调：
  - 控制虫群增员（rage 后每 3 回召唤 `xh_e_reinforce` 虫群增员波，horde 立绘 on_rage 模板）
  - 精神尖啸 SAN 蚀（每回合约 3~5，狂暴后加重）
- 多波次增员 = ZoneDef(kind=fight) 波次链 + 战斗场景链（win → 下一波），参照 scenes_moshi.rs。
  增员虫群 fight_id 走 `xh_swarm`（horde→虫群）。
- 敌人数值对齐 00_ENGINE_CONTEXT §2.3 蜂巢基线：普通 HP34-60 奖 10-25、精英 HP90+ 奖 120+、BOSS 120-540 可调。

## 敌人立绘复用
- horde → 虫群（xh_swarm / 增员波）
- zombie → 虫兵（xh_warrior）
- hunter → 巨型虫（xh_giant）
- BOSS 脑虫新立绘待替换 enemy_brain_bug.png（现无，走选择驱动文本演出）

## bg 复用（待替换）
- L1 登陆场 → img_horde.png（待换 xh_bg_landing）
- L2 地洞 → img_corridor.png（待换 xh_bg_tunnel）
- L3 脑虫巢 → img_laser.png + img_corridor.png（待换 xh_bg_nest）

## ★外部依赖（主线合并阶段必做，否则报错/无法进入）
1. `server-rs/src/worlds/mod.rs`：声明 `mod xinghe;`
2. `server-rs/src/worlds/mod.rs`：注册 `pub const WORLD_XINGHE: &str = "xinghe";`
3. `server-rs/src/worlds/mod.rs`：新增 `static XINGHE: WorldData`（id/name/difficulty/initial_scene=`xh_00`/floors/floor_names/points/enemies/npcs/zones/portals/gates），并加入 `WORLDS: &[&WorldData]` 数组；在 `GW_PORTALS` 加主神→xinghe 网关（建议 tx,ty=出生点 P）。
4. `server-rs/src/lib.rs` 或 `main.rs` 需要 `pub mod scenes_xinghe;`（暴露 XINGHE_SCENES / xinghe_figths 供测试与合并）。
5. `server-rs/src/scenes.rs`：`scene()` 与 `fight_cfg()` 扩展检索 `XINGHE_SCENES` / `xinghe_figths()`。
6. 事件/渲染资源：bg 与 enemy_brain_bug 立绘为占位，不影响逻辑编译（文本字段字符串）。
7. 复活费 500 由主线复活系统接线（death 卡按钮 `__enter_nexus__`）。

## 测试清单（tests/xinghe_flow.rs，3 用例）
1. `xinghe_map_reachable` —— 三张图 40 宽、出生点 P 位置正确、调查点/传送门/敌人坐标可走动
2. `xinghe_main_line_brain_win` —— 主线链：登陆→地洞→脑虫巢，越过增员波 → 脑虫选择战胜利 → B 结算
3. `xinghe_wave_reinforce` —— 多波次增员链验证（增员虫群 fight 存在 + 波次链 win 衔接）

## 说明
- 只新增不修改任何既有文件；未 build --release；未部署。

## 最终落盘与统计
- `server-rs/src/worlds/xinghe.rs` —— 173 行；3 层 40×26 地图 + 对象表
- `server-rs/src/scenes_xinghe.rs` —— 537 行；`XINGHE_SCENES`（28 场景）+ `xinghe_figths()`（8 场战斗）
- `server-rs/tests/xinghe_flow.rs` —— 190 行；3 集成用例
- 场景 28 个（含 3 死亡卡/结算卡/多波次休息节点）；战斗 8 场
- BOSS 脑虫 HP220、狂暴阈 100、奖励 950；波次链 xh_wave_a→b→c（逐波增强 68/78/88）+ 隧道增员 xh_tunnel_swarm
- sp_grade=Some('B')