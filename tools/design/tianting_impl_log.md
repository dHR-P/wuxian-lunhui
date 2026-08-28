# 《洪荒历 · 洪荒天庭》高难副本 · 实现日志

> 子代理：`tokenrhythm/deepseek-v4-flash-0731`（编程/文字）
> 角色：洪荒历·洪荒天庭 副本实现 subagent
> 项目根：`C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1`
> 产出顺序：worlds → scenes → tests（全部为新建文件）

## 任务要点（速记）
- slug：`tianting`；世界 id 常量 `WORLD_TIANTING = "tianting"`（由主线注册，本子代理不改任何既有文件）。
- **零新引擎系统**：复用现有能力（多段 BOSS 场景链 + 圣位演出红线）。
- **圣位铁律**：东天二皇（帝俊/太一）投影**只做 OverlayDef/文本演出，绝不计入 FIGHTS 数值**。

## 设计定稿
- **主题**：玩家作为轮回者深入被封印的「洪荒天庭残境」（三十三重天碎片 / 封神战场），在镇压与被镇压之间求生。钩子：「这里的天，是倒悬的王座。」
- **4 层 40×26**：
  - L1 南天门残垣（坠落点）
  - L2 天庭神桥（云海断裂）
  - L3 封神台（封神榜真相 / BOSS 战场）
  - L4 凌霄殿残殿（东天二皇投影演出 / 结局抉择）
- **剧情线**：闯入残境 → 调查封神真相（3 张封神榜残页 flag 链）→ 天庭神将·封神投影战（两段式场景链，可打断）→ 东天二皇投影演出 → 抉择结局（揭封神榜真相 / 助人皇·伏羲阵印 / 自取神性碎片）。
- **BOSS**：`tf_shenjiang_r1`（HP 260）+ `tf_shenjiang_r2`（二形态），均选择驱动场景链，非引擎 FIGHTS 表（对照 scenes_yinse.rs 的 ws_waro_r1/r2 写法）。
  - 可打断：集齐 3 张封神榜残页 → flag `tt_fengshen_truth`，可在第一形态蓄力轮注入「人皇印记同名封条」打断狂暴。
- **奖励支线**：封神榜残页 flag 链 `tt_fengshen_p1/p2/p3`；`sp_grade = Some('A')`（高难）；掉落神性碎片兑换券 `item_shenxing_voucher` 与神性碎片 `item_shenxing_fragment`。
- **bg 占位**：`img_zhuyuan_book / img_redqueen / img_laser`（待主线替换 `tt_bg_*`）；敌人立绘复用 guard→天兵、hunter→神将。fight_id 一律 None（选择驱动轮次），Engine 战斗模式不参与。

## 文件清单（全部新建 · 已落盘 · 行数为实测）
1. `server-rs/src/worlds/tianting.rs` —— 4 层地图 + FLOOR_NAMES + POINTS/ENEMIES/NPCS/ZONES/PORTALS/GATES（id 全部 `tt_` 前缀）。**222 行**。
2. `server-rs/src/scenes_tianting.rs` —— `TIANTING_SCENES`（id `tt_`）+ `pub fn tianting_figths()`（id `tf_`）。**797 行**。
3. `server-rs/tests/tianting_flow.rs` —— 3 用例。**139 行**。
4. `tools/design/tianting_impl_log.md` —— 本日志。**约 68 行**。

## 产出统计（结构化）
- **世界**：4 层 40×26（L1 南天门残垣 / L2 天庭神桥 / L3 封神台 / L4 凌霄殿残殿）。
- **场景数**：`TIANTING_SCENES` 含 **26 个 SceneDef**（id 全部 `tt_`），含 1 个东天二皇演出 + 3 个结局 + 1 结算卡 + 3 死亡档案 + L4 凌霄殿残殿入口（tt_12_lingxiao，补全缺口）。
- **L4 凌霄殿入口**（`tt_12_lingxiao`）：POINTS 的 tt_lingxiao 路由与 tt_08_fengshen「主升降井下行」选项均有落点；条件路由 `route_lingxiao`——`tt_lingxiao_open`（BOSS 已击破）→ `tt_17_choice`（结局抉择），否则 → `tt_13_fight_gate`（迎战封神投影）。
- **fight 配置**：`tianting_figths()` 含 **9 个 FightCfg**（id 全部 `tf_`：5 杂兵 + 2 小头目 + BOSS 两段 tf_shenjiang_r1/r2）。
- **神将战（天庭神将·封神投影）**：HP 260（r1）+ 150（r2），选择驱动场景链（非引擎 FIGHTS 表），可打断——集齐 3 张封神榜残页→ `tt_fengshen_truth` → 蓄力轮注入「人皇封条」打断（`tt_r1_interrupted`）。
- **东天二皇演出红线（铁律）**：`tt_huang_cast` 场景 `fight_id: None`、`overlay: Some(OverlayDef)`、`video: Some("cine_huang_yaji_tianting")`，`Fight` 不初始化、`Mode` 不进 Fight；东天二皇不出现在 ENEMIES/ZONES(fight)，ZONES 仅作 `kind: "overlay"`。
- **结局分支**（`tt_17_choice` 抉择）：揭封神榜真相 / 助人皇·伏羲阵印 / 自取神性碎片 → 各结局 `sp_grade = Some('A')` → 结算卡 `tt_18_settle`。
- **掉落**：结局统一发神性碎片兑换券 `item_shenxing_voucher`；自取神性碎片结局加发 `item_shenxing_fragment`。

## ★外部依赖清单（需主线在合并阶段完成）
1. `lib.rs` / `worlds/mod.rs` / `scenes.rs` 登记：
   - `lib.rs`：`mod scenes_tianting;`（参照 scenes_yinse 的登记方式）。
   - `worlds/mod.rs`：
     - `mod tianting;`
     - `pub const WORLD_TIANTING: &str = "tianting";`
     - 新增 `static TIANTING: WorldData`（引用 `tianting::TIANTING_F1..F4_MAP / TIANTING_FLOOR_NAMES / POINTS / ENEMIES / NPCS / ZONES / PORTALS / GATES`，`initial_scene: "tt_01_drop_land"`）。
     - 把 `&TIANTING` 加入 `WORLDS` 列表。
     - （可选）`GW_PORTALS` 加 `gw_tianting` 主神→天庭入口。
   - `scenes.rs`：
     - `scene()` 的 or_else 链追加 `.or_else(|| crate::scenes_tianting::TIANTING_SCENES.iter().find(|s| s.id == id))`。
     - `fight_cfg()` 的 or_else 链追加 `.or_else(|| crate::scenes_tianting::tianting_figths().iter().find(|(k, _)| *k == id).map(|(_, v)| v))`。
2. `items_data.rs`（如需新道具被 add_item 显示名称/价格）：`item_shenxing_fragment`（神性碎片，Kind Reliquary）、`item_shenxing_voucher`（神性碎片兑换券，Kind Reliquary/Quest）。
   - 注：`crate::world::add_item` 对未登记 id 仍可加入 inventory（flag/门禁只需 inventory 含 id），主线不登记也能跑逻辑；登记仅为换取显示。
3. 素材：`tt_bg_*` 背景图（当前全部用占位 img_zhuyuan_book/img_redqueen/img_laser，待替换）；敌人立绘复用 guard→天兵、hunter→神将。

## 测试清单（tests/tianting_flow.rs，3 用例）
1. `tianting_f1_map_reachable` —— L1 地图可达性（每行 40 字符 / 出生点 (2,13) / 各 POINT 可走动 + BFS 从出生点可达）+ 出生点；玩家 `hp=600` 扛 BOSS 反击。
2. `tianting_main_line_boss_two_phase` —— 主线链（goto tt_01_drop_land → 天条断碑残页一 → 南天门G1 → 录事官 → 云海残页二 → 星宿残阵 → 封神台残页三 → 拼残页洞悉真相 → 封神台结界 → 迎战一形态 → 重击循环至 tt_huang_cast 断言 `!matches!(mode, Mode::Fight)` → 二形态 → 重击循环至 tt_17_choice → 揭真相结局 → 撤离 → settle 断言 `sp_grade == Some('A')`）。pick 关键词「重击」唯一匹配，不匹配打断/终结选项。
3. `tianting_huang_cast_is_playout_not_fight` —— 圣位红线：直接 goto `tt_huang_cast`，断言 `st.fight.is_none()`、`!matches!(mode, Mode::Fight)`、`scene.fight_id.is_none()`。

## 圣位红线核对
- `tt_huang_cast`：`fight_id: None`，`video: Some(..)` + `cine_label`，choices 仅 `凝望倒悬王座`（推进剧情 + 起二段），`Fight` 不初始化，`Mode` 不进 Fight。
- `ENEMIES` / `ZONES` 均不出现帝俊/太一可战条目；东天二皇在 ZONES 只作 `kind: "overlay"` 演出区。

## 现状
- worlds / scenes / tests 三文件已全部落盘；本子代理不 build --release、不改动任何既有文件；`cargo check` 建议由主神线在合并登记（lib.rs / worlds/mod.rs / scenes.rs）后统一验证。
- 交叉核对已通过：34 个场景 id；26 个 `Route::To` 目标全部有落点；6 个 `Route::Dyn` fn（route_gate3 / route_lingxiao / route_r2_surrender_truth / settle_A / start_shenjiang_r1 / start_shenjiang_r2）均定义；104 行地图串每行恰 40 字符；POINTS 各 route（含 tt_12_lingxiao）与 NPC talk（tt_05_bridge_lushi）全部解析；ENEMIES/ZONES 的 8 个 fight ref 全部在 tianting_figths() 中。