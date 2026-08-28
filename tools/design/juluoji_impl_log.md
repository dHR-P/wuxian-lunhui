# 《侏罗纪公园 · 失序乐园》实现日志（juluoji）

子代理实现记录。产出顺序 worlds → scenes → tests。**绝不修改任何既有文件。** 全部为全新文件。

## 交付文件（三文件 + 本日志）
| 文件 | 行数 | 内容 |
|------|------|------|
| `server-rs/src/worlds/juluoji.rs` | 187 | 3 层地图 + 静态表 |
| `server-rs/src/scenes_juluoji.rs` | 535 | 25 场景 + 5 战斗 + 选择驱动霸王龙战 |
| `server-rs/tests/juluoji_flow.rs` | 153 | 4 用例（可达 / 主线链→霸王龙 / 追击半径 / 战斗表） |
| `tools/design/juluoji_impl_log.md` | — | 本日志 |

## 世界（worlds/juluoji.rs）
- 3 层（园区/丛林/围栏区），每层 40×26 全等宽；出生点 P L1 (1,20)。大地图开放式（内区全 '.'，无硬墙切割）。
- 静态表：POINTS 10 / ENEMIES 8 / NPCS 3 / ZONES 2 / PORTALS 4 / GATES 3。
- 恐龙追击 = `EnemyDef.radius 大幅拉近`：迅猛龙 radius 5、剑龙群 radius 4、霸王龙 radius 6（> 默认半径 3，进场即贴脸触发战斗）。
- 敌人立绘复用：licker→迅猛龙、hunter→霸王龙、horde→剑龙群。

## 剧情（scenes_juluoji.rs）
- 25 个 SceneDef（id 全 `jl_` 前缀）；剧情线：园区断电→丛林逃生→围栏决战→结算。
- 5 个 FightCfg（`jl_` 前缀）：jl_raptor / jl_stego / jl_raptor_pack / jl_stego2 / jl_trex。
- **BOSS 霸王龙 HP260 选择驱动**：`start_trex` 从 jl_trex 建 Fight；每"回"= `jl_trex_round` Normal 场景 + `Route::Dyn(trex_act)`；选项「瞄准跛脚重击 / 快刀连击 / 冲撞换位 / 侧身滚避」。**撕咬** = 普通反击（rng 18-28，狂暴后 26-38）；**冲撞换位** = 50% 成功置 `jl_slammed`（下回撕咬 +8，模拟"把霸主撞离战位"）+50% 反遭扑袭扣血；狂暴阈 HP≤100（rng 更凶）。击破 `jl_13_trex_down` 写 `sp_grade = Some('B')`、+650、掉 `it_trex_tooth`。
- 恐龙追击演出：丛林入口迅猛龙伏击 / 可丢午餐肉引开免战 / 监控墙观兽，用 Dyn 文本 + radius 拉近呈现。
- 结算：撤离台 → `jl_12_card` Overlay；评级兜底 B。
- 死亡档案：`jl_40_death`（恐爪之下）、`jl_40_death_trex`（巨兽之口）。

## 测试（tests/juluoji_flow.rs，4 用例）
1. `juluoji_map_reachable`：三层每行 40 字符 / 出生点 P(1,20) / 各层调查点与传送门起点可走动。
2. `juluoji_main_line_trex_win`：jl_00→断电日志→**记下跌电点(回 jl_01)**→售货亭取餐肉(需扳手)→穿过侧门→丛林丢餐肉引开→撕抓树痕取铁丝→穿越密林窄道→围栏主电闸(fence_power)→仰望霸王龙→直面→循环「瞄准跛脚重击」→霸王龙胜利(sp_grade=B)→撤离结算卡片。**已修正**：jl_02_powerlog 唯一选项回 jl_01，测试先接「记下跌电点」再接「售货亭冰柜」。
3. `juluoji_chase_radius`：断言迅猛龙≥5 / 剑龙≥4 / 霸王龙≥6，且全 >3（追击拉近）。
4. `juluoji_fight_table`：战斗表含 5 id；霸王龙 HP260 / 狂暴阈100 / 奖励650；迅猛龙 HP46。

## ★外部依赖（主线合并时协商）
- `worlds/mod.rs`：注册 `WORLD_JULUOJI = "juluoji"` 并组装 `juluoji.rs` 的三张地图 + 六表（floors/points/enemies/npcs/zones/portals/gates）
- `scenes.rs`：`scene()` 并入 `JULUOJI_SCENES`；`fight_cfg()` 并入 `juluoji_figths()`，保证 `jl_*` 场景与 `jl_*` 战斗可解
- `lib.rs`：加 `mod juluoji;` / `mod scenes_juluoji;`
- 新道具 id（`it_wrench` / `it_bait_meat` / `it_wire_cutters` / `it_trex_tooth`）：`add_item` 接受任意字符串可跑，但建议在 items 表补显示名

## 待替换素材
- bg：`img_zhuyuan_book.png`(园区) / `img_horde.png`(丛林) / `img_laser.png`(围栏区) → 目标 `jl_bg_park/jungle/fence`
- 敌人立绘复用：licker/hunter/horde

## 合并前 cargo check
因 WORLD_JULUOJI/scenes 未注册、worlds 模块未 `mod`，合并前 `cargo check` 缺失模块为预期失败；结构已对照 `jiguancheng`/`zhouyuan` 模板自查一致。测试在合并后运行。