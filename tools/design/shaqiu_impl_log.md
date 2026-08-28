# 《大宇宙时代 · 沙丘魔海 · 坠毁之星》实现日志

> 子代理「沙丘魔海 副本实现」产物记录。只写全新文件，绝不改动既有文件。
> 依据 `design/zhttty_universe/dayuzhou_shidai/shaqiu_mohai.md`（§3 地图/§4 敌人/§5 BOSS/§6 剧情/§7 奖励/§8 衔接/§10 实现风险精读）。
> 模型：tokenrhythm/deepseek-v4-flash-0731。方向：世界展示向，钩子「绿潮吞没显示器之前，你先看清了它有多美」。
> 零新引擎系统：氧气倒计时用剧情 flag 链降级，属性克制用 BOSS 选择驱动遭遇的「弱火/弱电倍增」表达（不新增 FightCfg 字段）。

## 进度流水

### 步骤 1 · 地图与坐标校验（完成）
- 对照设计 §3 逐层誊写 4 幅 40×26 ASCII 地图，逐行校验 40 字符、无空格。
- 用脚本校验出生点 P 与所有 POINTS/ENEMIES/NPCS/ZONES/PORTALS/GATES 坐标是否落在可行走格（非 `#`）。
- 结论：全部对象坐标与跨层传送门落点均可行走，P 出生点逐层确认：
  - F1 P(4,14)；F2 P(5,12)；F3 P(6,10)；F4 P(6,8)。
- 说明：设计 F3 的「活体活门 j1」为定时机关，属新引擎能力；按 §10 硬约束「零新引擎系统」，
  本实现将其从 F3 地图降级为普通走格（`G`→`.`），F3 仅保留「子宫膜门 g3」一枚 need_flag 门禁。
- 本次校验脚本为临时产物，不留工程内。

### 步骤 2 · 世界静态数据 worlds/shaqiu.rs（完成）
- 四层地图常量 SHAQIU_F1..F4_MAP（每行恰 40 字符）、SHAQIU_FLOOR_NAMES。
- 五表：POINTS / ENEMIES / NPCS / ZONES / PORTALS / GATES（id 全 `sq_` / `e_sq_` / `n_sq_` / `z_sq_` / `pt_sq_` / `gate_sq_` 前缀，与既有世界不重名）。
- 辅助：gate_at / gate_by_id / tile / walkable / spawn（同既有世界模板）。

### 步骤 3 · 剧情与战斗 scenes_shaqiu.rs（完成）
- SHAQIU_SCENES（id 全 `sq_`）+ shaqiu_figths()（id 全 `sq_` 前缀）。
- BOSS 渴水兽王走「选择驱动遭遇链」（Route::Dyn，非引擎 FIGHTS 表）：HP240 / dmg(18,28) / reward600 / rage_at Some(96)。
- 弱火 ×1.3 / 弱电 ×1.3 在战斗回合选择内手动乘算；「诱水剂」倾倒在 HP<50% 条件解锁，固定 60 伤 + 永久停止再生。
- 氧气倒计时：具名函数 oxy_* 推进 flag 链 sq_oxy_1→sq_oxy_2→sq_oxy_3（低氧）/ deeper，低氧阶段按步数扣 HP。

### 步骤 4 · 集成测试 tests/shaqiu_flow.rs（完成）
- 3 用例：① 地图可达/主线链可达；② 兽王两段或诱水剂终结；③ 氧倒计时 flag 链。

### 步骤 5 · 合并前自检（完成）
- 未注册模块不参与当前 `cargo check`；本日志记录接口核对依据（defs/state/world/scenes/maps + rand）。
- 已用「临时 scratch crate」对 scenes_shaqiu.rs + worlds/shaqiu.rs 做真实类型检查，编译通过、数据加载正常。
- 未 build --release，未部署，未改任何既有文件。

## 最终产物
**三文件行数**：

| 文件 | 行数 |
|---|---|
| `server-rs/src/worlds/shaqiu.rs` | 236 |
| `server-rs/src/scenes_shaqiu.rs` | 765 |
| `server-rs/tests/shaqiu_flow.rs` | 193 |
| `tools/design/shaqiu_impl_log.md` | 本文 |

**场景 / fight 数**：SHAQIU_SCENES = **28 个场景**（id 全 `sq_`）；shaqiu_figths = **15 场战斗**（id 全 `sq_`）；
渴水兽王 BOSS = HP240 / dmg(18,28) / reward600 / rage_at Some(96)（选择驱动遭遇链落地，非引擎 FIGHTS 表）。

## 三项机制如何实现（零新引擎系统）
- **渴水兽王战（选择驱动）**：st.fight 存 HP240，boss_act / boss_retaliate 全用 Route::Dyn 逐回合推进；
  狂暴@96 触发 sq_raged，再生 +15/回合最多 3 回合（flag 链 rgc1/rgc2/rgc3 计已耗），
  倾合「诱水剂」后设 sq_dehydrated 永久断再生。胜利→sq_42_boss_down→set sq_boss_dead + 600 点。
- **氧气倒计时（flag 链降级）**：oxy_tick 推进 sq_oxy_1→sq_oxy_2→sq_oxy_3（低氧）→(严重缺氧)，
  低氧起按探索步数 -2/-4 HP；休整节点（医疗箱/通风台/鹰）返回走 sq_route_stay 不推进氧耗（"喘口气"）。
- **弱火 / 弱电克制**：BOSS 回合「火焰冲击」= rng(40,50)×1.3、「电弧放电」= rng(38,46)×1.3
  （弱量 ×1.3 手动乘算），普通猛攻无克制；cheat 条件 cond_lure_finisher = 持诱水剂且 HP<120。

## 与设计差异
- 「活体活门 j1」为定时机关属新引擎能力，按 **§10 零新引擎** 原则降级为 F3 普通走格（`G`→`.`），
  F3 仅保留「子宫膜门 g3」need_flag spore_serum 一枚门禁。
- 沼泽孢子毒气区/狰狞之绿幕墙（zone kind=gas）需引擎 zone 扩展，改为场景叙述表达毒沼与绿潮，
  不下方 zone 表；仅 BOSS 战圈按左侧「kind=fight」落位。
- p4_exit（升空井）是跨世界出口，PortalDef 无 to_world 字段，故不入 PORTALS 表（呈装饰性 Z tile），
  真实出口由胜利场景 → 结算卡片按钮 `__enter_nexus__` 接线（同既有世界）。
- 结算支线共 5 项（side_survivor/side_autopsy/side_battery/side_trap/relic_seed），评级线 S≥1600/A≥1300/B≥1000/C≥700。

## ★外部依赖清单（主线合并时需扩展）
1. `server-rs/src/lib.rs`：加 `pub mod scenes_shaqiu;`。
2. `server-rs/src/worlds/mod.rs`：`mod shaqiu;` + `pub const WORLD_SHAQIU: &str = "shaqiu";` + 在 `WORLDS` 表注册
   `&SHAQIU` WorldData（difficulty=2、initial_scene="sq_00_intro"、四层地图四点表全套）；
   可选在 `GW_PORTALS` 加 `gw_shaqiu` 主神网关（落点=F1 出生点 P(4,14)）。
3. `server-rs/src/scenes.rs`：`scene()` 并联检索 `scenes_shaqiu::SHAQIU_SCENES`；
   `fight_cfg()` 并联检索 `scenes_shaqiu::shaqiu_figths()`。

## ★待素材替换清单（新 bg 落地后替换；当前用现有图占位）
| 楼/场景 | 新 bg 建议 | 现用占位 |
|---|---|---|
| F1 沙海残骸 | sq_bg_f1_wreck | img_laser.png |
| F1 驾驶舱/黑匣子 | sq_bg_cockpit | img_zhuyuan_book.png |
| F2 绿潮战场 | sq_bg_f2_green | img_redqueen.png |
| F3 共生体母巢 | sq_bg_f3_nest | img_zhuyuan_book.png |
| F4 沙丘洞穴 | sq_bg_f4_cave | img_laser.png |
| BOSS 渴水兽王 | sq_bg_boss | img_laser.png |
| 结局升空 | sq_bg_rise | img_zhuyuan_book.png |

敌人立绘复用：zombie→绿潮共生体、hunter→渴水兽王（占位）、horde→虫群；新美术由主 agent 统一生图替换。