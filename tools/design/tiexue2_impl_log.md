# 铁血·AVP（tiexue2）副本实现日志

> slug: `tiexue2`，world id: `WORLD_TIEXUE2 = "tiexue2"`
> 作品影《异形大战铁血战士》(AVP)
> 实现代理：编程类子代理（tokenrhythm/deepseek-v4-flash-0731）
> 设计依据：`tools/design/impl_template.md`（唯一必读字段模板）
> 合并主线参考：同构已有副本 `tiexue`（worlds/tiexue.rs + scenes_tiexue.rs + tests/tiexue_flow.rs）

---

## 一、交付文件（全新，未改任何既有文件）

| 文件 | 行数 | 内容 |
|---|---|---|
| `server-rs/src/worlds/tiexue2.rs` | ~170 | 三层静态地图 + POINTS/ENEMIES/NPCS/ZONES/PORTALS/GATES |
| `server-rs/src/scenes_tiexue2.rs` | ~640 | `TIEXUE2_SCENES`（场景 id 全部 `tx2_` 前缀）+ `tiexue2_figths()`（fight id 全部 `tx2_` 前缀） |
| `server-rs/tests/tiexue2_flow.rs` | ~100 | 3 个确定性用例（不碰随机战斗） |
| `tools/design/tiexue2_impl_log.md` | 本文件 | 落盘日志 |

---

## 二、玩法机制

**主题**：雨林地下金字塔 · 铁血成年礼猎场 · 异形寄生。钩子「猎人，在这里也可能是猎物」。

**三层 40×26**：
- L1 雨林地表 · 金字塔入口（出生点 P(1,1)、巴哈补给、倒悬铁血残躯、巨蟒蜕剥片、异形卵 ×4、塔沿坠坑 T1）
- L2 金字塔墓道迷宫（入口雨刻壁画、陪葬武器架、祭坛预言碑、酸液锁管、巢室卵 ×2、祭坛圣门 T3）
- L3 祭坛神座 · 皇后巢（碎裂神像、铁血战士 NPC、酸液锁塔机关、回归圣门）

**门禁链**：
- G2 `tx2_g2`：`tx2_g2_open`——由「倒悬铁血残躯取腕刃 (iron_blade_v2)」或「巨蟒蜕剥片 (peel_scale)」任一达成；另 +「酸液锁管引酸 (acid_burned)」替代路径。
- G3 `tx2_g3`：`prophecy_known`（解读祭坛预言碑）→ 单向下潜 L3。
- G4 `tx2_g4`：`queen_v2_down`（皇后败亡）开全归途；逃离线 `flee_v2` + `tx2_g4_open` 走侧缝半成结算。

**BOSS**：
- 异形皇后 **HP 200**，`rage_at Some(100)`；选择驱动遭遇链（`start_queen` → `queen_act` → `queen_win`）。狂暴破卵增员（清扫 ≥3 卵巢则增员压力减半）；双终结二选一：
  - 结盟线【铁血·肩炮助战】`finisher_shoulder`（-45 → 胜，置 `tx2_queen_shoulder`）
  - 无结盟【祭坛酸液锁塔】`finisher_acid`（-55 → 胜，置 `tx2_queen_acid`）
  - 胜利：+500、掉 `death_divinity_v2`、置 `queen_v2_down`。
- 铁血·成年礼战士 **HP 150**，`rage_at Some(60)`；可战可和（互斥 flag）：
  - 归还腕刃结盟 → `predator_alliance_v2`（置位即不再可被猎杀；皇后战获肩炮终结）
  - 伏击猎杀 → 选择驱动（`start_predator` → `predator_act` → `predator_win`，狂暴后【腕刃连斩·终结】），胜 +300、掉 `predator_wristblade_v2`、置 `predator_hunted_v2`。

**结局开放**：
1. 结盟共猎（alliance → 肩炮终结皇后 → 全归途）
2. 独自猎杀（hunt → 酸液终结皇后 → 全归途）
3. 逃离（`flee_v2` 半成结算：点数权 ×0.6、无神性颗粒、支线照发——`tx2_91_flee` 场景承接，经 `tx2_90_exit`/`tx2_95_card` 结算卡片）

**sp_grade** `Some('D')`（结算 `route_exit_settle` 统一兜底写；结盟/猎杀支线 ≥2 条时提为 B）。

**bg 占位**：`img_zhuyuan_book.png`（L1 雨林）/ `img_corridor.png`（L2 墓道）/ `img_laser.png`（L3 祭坛）。敌人立绘复用 licker→异形、hunter→铁血。

**支线 flag**（结算 +200×N）：`frozen_predator_v2` / `prophecy_known` / `eggs_v2_smashed` / `predator_alliance_v2` / `predator_hunted_v2`。

---

## 三、结构自检

- 所有 `Route::To`/`Route::Dyn` 目标均为 `TIEXUE2_SCENES` 内已定义的 scene id（`tx2_` 前缀）。
- 所有 `fight_id` 均在 `tiexue2_figths()` 内定义（`tx2_` 前缀）。
- `Eff::Hurt(i32, &str)` 双参数正确；`TextSpec::Dyn` 返回 `String`；`ChoiceDef.cond` 用具名 fn。
- 地图每行精确 40 字符、每层 26 行，已用脚本校验（78 行全 40，含边框 `#`）。
- `eggs_v2_count` 用 `st.map_objs` 计数（`tx2_p_egg1..6`），`MarkPoint` 对齐。

---

## 四、★外部依赖（主线合并阶段必须接线，否则测试/运行不编译通过）

1. `server-rs/src/lib.rs`：加 `pub mod scenes_tiexue2;`
2. `server-rs/src/worlds/mod.rs`：
   - `mod tiexue2;`
   - `pub const WORLD_TIEXUE2: &str = "tiexue2";`
   - 新增 `static TIEXUE2: WorldData { id: WORLD_TIEXUE2, name: "铁血·AVP·猎场金字塔", difficulty: 2, initial_scene: "tx2_00_open", floors: &[tiexue2::TIEXUE2_F1_MAP, tiexue2::TIEXUE2_F2_MAP, tiexue2::TIEXUE2_F3_MAP], floor_names: tiexue2::TIEXUE2_FLOOR_NAMES, points: tiexue2::POINTS, enemies: tiexue2::ENEMIES, npcs: tiexue2::NPCS, zones: tiexue2::ZONES, portals: tiexue2::PORTALS, gates: tiexue2::GATES }`
   - `WORLDS` 数组追加 `&TIEXUE2`
   - （可选）主神网关 `gw_tiexue2`：落点 = L1 出生点 `tx=1, ty=1`
3. `server-rs/src/scenes.rs`：
   - `scene()` 末尾追加 `.or_else(|| crate::scenes_tiexue2::TIEXUE2_SCENES.iter().find(|s| s.id == id))`
   - `fight_cfg()` 末尾追加 `.or_else(|| crate::scenes_tiexue2::tiexue2_figths().iter().find(|(k, _)| *k == id).map(|(_, v)| v))`

**测试清单**：`server-rs/tests/tiexue2_flow.rs` 3 用例，合并后运行（`cargo test --test tiexue2_flow`）。
- `tiexue2_map_reachable`：行宽 40 / 出生点 P(1,1) / 点与传送门可走 / 战斗表完整 + 皇后 HP200 + 铁血 HP150
- `tiexue2_dispatch_wired`：12 个关键场景 + 全部 fight id 经 `scenes::scene`/`scenes::fight_cfg` 可解析；支线结盟/猎杀选择存在
- `tiexue2_fight_table_complete`：战斗表每条 fight 分发闭环 + 数值自检 + 两线互斥 flag 结构检查

> 未做 `cargo build --release`、未部署、未改任何既有文件——全部由主线合并后统一 build/接线。