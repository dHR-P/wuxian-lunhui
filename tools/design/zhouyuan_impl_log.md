# 《咒怨》副本实现日志（编程子代理）

> 角色：`tokenrhythm/deepseek-v4-flash-0731` 编程/文字子代理
> 职责：只写全新文件（worlds/zhouyuan.rs、scenes_zhouyuan.rs、tests/zhouyuan_flow.rs、本日志），绝不修改任何既有文件。
> 依据：design/zhttty_universe/wuxian_kongbu/zhouyuan.md（417 行，权威）+ 00_ENGINE_CONTEXT.md。
> 并行纪律：scenes.rs / state.rs / engine.rs / defs.rs / worlds/mod.rs / main.rs 正被并行子代理改，本代理不动它们；全局编译错误若来自彼方半成品则记为「外部错误」，不修，交由主线合并统一处理。

---

## 一、落地范围与环境确认（必做第一步上下文阅读结论）

已读：zhouyuan.md 全文、00_ENGINE_CONTEXT.md、worlds/zhutian.rs、worlds/mod.rs、scenes.rs（只读）、maps.rs（只读 Struct 定义）、state.rs、defs.rs、engine.rs、world.rs、tests/playthrough.rs。

### 引擎模型关键事实（决定实现取舍）
1. `Eff` 枚举（defs.rs）：`SetFlag / San / Points / PointsIfFlag / KillTeam / Hurt(death_route) / Weapon / AddItem / MarkPoint`——**无称数类型**，可支撑方案 A（连号 flag）。
2. `FightCfg`（defs.rs）：`name/hp/dmg/reward/reward_why/intro/rage_at/rage_text/on_rage/finisher_if/finisher_name/finisher_desc/win/death`。
   - **`on_rage` 只在狂暴触发当回合执行一次**（engine.rs `fight_turn` 中 `f.raged=true` 后调用），**无「每回合结束」钩子**。
   - **`fight_win` 自动 + `cfg.reward`**，再 goto `cfg.win(st)`。
3. `state.sp_grade: Option<char>` 存在，但**无 `Eff::SetGrade`**——需用 `Route::Dyn(fn(&mut GameState)->String)` 内联写 `st.sp_grade=Some('D')`。
4. `alive_count()` / `hud_json` / `team_display` 以 `["one","rain","kaplan","jd"]` 写死（scenes.rs/state.rs）。设计文档 §7.4 默认 2 名队友（资深者+新人），但引擎当前无这些键；为避免改共享文件，本副本**不加新队友键**，结算侧依赖外部主线接入（见★外部依赖）。

---

## 二、方案取舍

### 取舍 1：诅咒计数 = 方案 A（场景级连号 flag）【明确说明】
- **背景**：文档 §10 「方案 B（推荐）：新增 `Eff::MarkCurse(n)` + `state.curse` + `Cursed(n)`我们命令谓词，改动集中在 state.rs+defs.rs」。但这两个文件正被并行子代理修改。
- **决定**：选 **方案 A**：用连号 flag `zy_curse_1/2/3`，由现有 `Eff::SetFlag` + `cond` 逐级判定支撑（零共享文件改动）。3 层时（三个全置）在下一"回"场景选项里判定 `zy_curse_3` → 路由到「二重死」死亡档案 `zy_17_lose`（d3 被咒入二重死）。
- **影响**：纯本文件实现；代价是不会像方案 B 那样有单一 `state.curse` 计数，但以 3 个布尔 flag 完全等价（自然数 0..=3 → 逐位）。文档 §7.2 把 `zy_curse_1..3` 列为剧情 flag，方案 A 与其字面一致。

### 取舍 2：BOSS「黑发领域每回合 San-5」与「仪式镇压每回合上限 -8%」
- **背景**：engine.rs 的战斗循环（`fight_turn`）没有每回合结束回调；`on_rage` 仅触发一次；`FightCfg` 无 `aura/finisher_stage` 字段。
- **决定**：把 **BOSS 战实现为「选择驱动的回合制场景链」**（`zy_boss_domain` 系列），每"回"是一次 Normal 场景选项，用 `Eff::San(-5)`（狂暴期间）、`Eff::SetFlag(zy_curse_n)`（诅咒叠层）、以及 Boss 血条（用累加 flag/血量减损在场景数据内自管理）逐回合落地。这既能做「每回合结束 San-5」「3 层即死」「仪式镇压」等文档要求，又零引擎改动。**同时仍按文档导出 `b_kayako` 的 FightCfg**（HP140/dmg(12,18)/reward500/狂暴@40）用于 ZoneDef「伽椰子实体」 `(16,20) kind=fight ref b_kayako` 与直接决战路径的引擎战斗可用性。主流程以选择驱动遭遇呈现完整机制。
- **记录取舍**：若主线后续给 `FightCfg` 增加 `aura/finisher_stage`，可把本遭遇迁回引擎战斗；届时 `b_kayako` 的 fight 表即可直接驱动全部机制。当前为了「每回合 San-5 / 诅咒叠层」这类 mid-fight 效果，只能走场景选项。

### 取舍 3：BOSS 胜利该数（reward 500 / 强杀 250）
- **背景**：`fight_win` 自动 + `reward`，`reward` 是固定 `i32`（无法按胜利类型分）。文档 §5：exorcism 胜利 500（+200 额外），强杀胜利点数减半=250 且无 sp_grade/item。
- **决定**：`b_kayako.reward = 500`（引擎直战用）。选择驱动遭遇里，胜利结算由 `zy_16_win` 场景的 `Route::Dyn` 统一结算：
  - exorcism 达成（`zy_exorcism` 置位）：`Points(+200)` + `AddItem(item_talisman)` + `st.sp_grade=Some('D')` + 结算 flag `zy_exorcism`；净得 500(奖励)+200=700。
  - 强杀（无 exorcism）：无 +200、无 item、无 sp_grade，掉落即文档"减半 250"——因引擎固 reward 500（若走引擎直战）或选择链固定给基础点数，强杀支线不再额外加 200。本副本以选择驱动为主，强杀分支给 250 基础，避免引入"反向找零"。已在日志如实记录与 §5 的(500/250)映射为：exorcism 行 500+200，强杀行 250。

### 取舍 4：SAN 第二血条
- 复用现有 `Eff::San` 与 `engine::goto` 的 `san<=0 → e_sancollapse` 保护（引擎既有逻辑）。本副本所有调查/事件都挂 San 惩罚；死亡档案 d1「湿冷雨夜」由独立场景 `zy_17_lose_san`(SAN=0 路径的死亡 overlay) 落地。BOSS 狂暴期回合 San-5 由场景选项逐回合 `Eff::San(-5)` 落地（见取舍 2）。

### 取舍 5：出口（天亮 6:00 真相达成 → 主神光柱强制传送）与失败复活（扣 400）
- **背景**：`GW_PORTALS/switch_world` 在 worlds/mod.rs（并行子代理/主线合并）；复活系统在 scenes.rs 结算路由。
- **决定**：本文件内用**场景/flag 表达「任务完成」状态**（白天 `zy_dawn` + 成功 flag），出口的**传送调用（主神光柱）由主线在合并阶段接线**。失败死亡：挂对应死亡档案 flag（`zy_dead_xxx`）+ 死亡 overlay；「扣 400 点复活」由主线在合并阶段接主神复活系统——本代理只保证 death flag 设计正确（死亡 overlay 的 `OverlayDef.death` 会进 `deaths` 集合，主线复活系统读取）。

### 取舍 6：结算支线 flag 计数
- 现有 `compute_settlement`（scenes.rs）写死 7 个生化支线 key。咒怨的 6 个支线 flag（zy_shoe_checked/zy_cat_trust/zy_toshio_room/zy_diary_truth/zy_buddha/zy_exorcism）要并入侧加成需主线改该函数。本文件只负责正确 set 这些 flag；结算公式兼容由主线扩展（★外部依赖）。

---

## 三、新文件功能清单（随后逐步落盘）

- `worlds/zhouyuan.rs`：ZHOUYUAN_MAP（3 层×40×26）+ ZHOUYUAN_FLOOR_NAMES + POINTS + NPCS + ENEMIES + ZONES + PORTALS + GATES。
- `scenes_zhouyuan.rs`：`pub static ZHOUYUAN_SCENES: &[SceneDef]`（全部 id `zy_`）+ `pub fn zhouyuan_figths() -> &'static [(&'static str, FightCfg)]` + 若干 cond/card 辅助 + 命中集。
- `tests/zhouyuan_flow.rs`：地图可达性 / 主线链 / 狂暴与诅咒 / 死亡档案四类。

## 地图坐标（§3.1 权威，逐条抄录）
- F1：佛龛(4,2)、壁橱P1起点(12,10)、入口P(7,24)、雨鞋(13,21)、冰箱(30,2)、菜刀(26,5)、电视(24,15)、茶几(33,18)、楼梯I(36,17)；敌：佣人(8,8)r3、(27,17)驻守。
- F2：榻榻米(5,5)、挂轴(10,2)、门G2(15,18)、床(6,18)、衣柜(13,22)P3起点、挂钟(18,12)、镜子(30,6)、排风扇(36,3)P2起点、玩具箱(26,16)、门G1(34,23)。
- F3：藏尸处(8,4)、旧皮箱(32,3)、天窗(20,6)、铁门G3(10,12)台阶、结界圈(14,20)、伽椰子实体(16,20)、黑发井(27,18)；敌：亡影强化(6,16)、残影(22,22)。

## 传送门（§3.3）
- P1 壁橱捷径：F1(12,10)→F3(20,6) 单向。
- P2 排风逃生：F2(36,3)→F1(7,21) 单向。
- P3 主卧密道：F2(13,22)→F3(8,20) 单向。
- 垂直楼梯：F1(36,17)↔F2(36,17) 双向；F2楼梯口→F3阁楼。

## 门禁（§3.4）
- G1 阁楼门 F2(34,23) need_flag zy_toshio_key。
- G2 主卧门 F2(15,18) need_flag zy_buddha。
- G3 地下室铁门 F3(10,12) need_flag zy_diary_truth。
- 玄关大门反向 F1(7,24) 单向封闭（无解锁）。

---

## 四、自验结果

（逐步落盘——见下方追加。）

---