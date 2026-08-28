# 《死亡开端·霜白村》副本实现日志

> 副本实现子代理（模型 `tokenrhythm/deepseek-v4-flash-0731`）交付。只写全新文件，未改任何既有文件。
> slug=`shuangbai`，世界 id `WORLD_SHUANGBAI="shuangbai"`，场景 id 前缀 `sb_`。

## 交付文件（三个新文件 + 本日志）

| 文件 | 行数 | 说明 |
|------|------|------|
| `server-rs\src\worlds\shuangbai.rs` | ~106 | 两层 40×26 地图 + `SHUANGBAI_FLOOR_NAMES` + 五表（POINTS/ENEMIES/NPCS/ZONES/PORTALS/GATES），全部 `sb_` 前缀 |
| `server-rs\src\scenes_shuangbai.rs` | ~520 | `SHUANGBAI_SCENES`（12 场景）+ `shuangbai_figths()`（3 场战斗） |
| `server-rs\tests\shuangbai_flow.rs` | ~50 | 3 个确定性用例 |
| `tools\design\shuangbai_impl_log.md` | — | 本日志 |

## worlds/shuangbai.rs
- 地图常量：`SHUANGBAI_F1_MAP`（26 行）、`SHUANGBAI_F2_MAP`（26 行），逐行校验均为**精确 40 字符**。
- `SHUANGBAI_FLOOR_NAMES = ["霜白村（灰雾）","枯井深处（雾之源）"]`。
- 五表（前缀 `sb_`）：
  - `POINTS`：`sb_pt_kujing`(枯井井沿,F1,18,13)、`sb_pt_laowu`(老屋门口,F1,33,6)、`sb_pt_jingdi`(井底白雾,F2,19,12)
  - `ENEMIES`：`sb_e_grey`(雾中游魂,F1,6,11)、`sb_e_warped`(扭曲的村民,F1,26,13)
  - `NPCS`：`sb_n_oldwen`(守井的老温,F1,9,12)
  - `ZONES`：`sb_z_boss`(井底白骨坪,F2,14,6, kind=fight, ref=`sb_boss`)
  - `PORTALS`：`sb_p_down`(F1,18,12 → F2@19,2)、`sb_p_up`(F2,19,2 → F1@18,12)
  - `GATES`：`sb_g_barn`(谷仓门,F1,35,20, need_item=`sb_key_grey`)
- 所有 marker 坐标已用脚本校核落在可走格（非墙、非边界）。

## scenes/shuangbai.rs
- 场景数：**14 个 SceneDef**（`sb_00` 开场、`sb_01`/`sb_02` 枯井与下井、`sb_03`/`sb_04`/`sb_07` 老屋与谷仓、`sb_05`/`sb_06` 老温与游魂、`sb_12`/`sb_13` 井底、`sb_boss_round` BOSS 回合、`sb_settle` 结算、`sb_hub` 中枢、`sb_death` 死亡）。
- 钩子文案落位在 `sb_00`：老温的「所有雾，都是从这口井里长出来的。」
- 场景 mood 分布：mystery/danger/awe 兼顾；开场 `sb_00` mystery、井底 `sb_12`/BOSS danger、胜利 `sb_settle` awe 带 overlay（`sb_epilogue` 卡牌）。
- 选择驱动 BOSS：**首位复苏者** 经 `route_goto_boss` 启动 `Fight`（hp=150），回合场景 `sb_boss_round` 用 `TextSpec::Dyn` 显示余血/玩家 HP，三个选择（重击35/横斩22/防御免伤）经 `boss_act` 结算，狂化后敌伤从 16 升 22，玩家 HP≤0 跳 `sb_death`，BOSS HP≤0 跳 `boss_win` → `sb_settle`（+1500、sp_grade='A'、item `sb_ash_shard`、flag `sb_boss_down`）。
- 原生战斗（fight_id）+ 遭遇战：`sb_fight_grey`（雾中游魂 HP60）、`sb_fight_warped`（扭曲的村民 HP90），胜利回 `sb_hub`，死亡回 `sb_death`。
- 阶段门禁：下井需 `sb_has_rope` 旗标（经 `sb_03`/`sb_06` 取得）；谷仓门走 `sb_04`（剧情）并设 `sb_01` 的可走绳条件。
- 自检：所有 `Route::To` 目标均在 `SHUANGBAI_SCENES` 定义；所有 `fight_id` 均在 `shuangbai_figths()` 内。

## tests/shuangbai_flow.rs（3 个确定性用例）
1. `shuangbai_map_reachable`：两层 26 行、逐行 40 宽；出生点/POINTS/ENEMIES/NPCS/portals 均 walkable。
2. `shuangbai_dispatch_wired`：关键场景 `scenes::scene` 已注册 + 三场战斗 `scenes::fight_cfg` 已注册。
3. `shuangbai_fight_table_complete`：`shuangbai_figths().len()>=3`，每场 fight 经 `scenes::fight_cfg` 分发闭环。

## ★外部依赖清单（系列复制，主线需处理）
- `server-rs/src/lib.rs`：新增 `pub mod scenes_shuangbai;`（测试 `use ...::scenes_shuangbai` 依赖此，合并后运行）。
- `server-rs/src/worlds/mod.rs`：新增 `mod shuangbai;`；定义并注册 `pub const WORLD_SHUANGBAI: &str = "shuangbai";`；构造 `WorldData` 时把本文件的 `SHUANGBAI_F1_MAP/F2_MAP/FLOOR_NAMES/POINTS/ENEMIES/NPCS/ZONES/PORTALS/GATES` 塞入对应字段；可选接入村口 → 死雾镇 的出口网关/传送门。
- `server-rs/src/scenes.rs`：在 `scene()` 的 or_else 链加 `SHUANGBAI_SCENES.iter().find(...)`；在 `fight_cfg()` 的 or_else 链加 `shuangbai_figths()` 的查找分支。
- 测试清单：`shuangbai_map_reachable`、`shuangbai_dispatch_wired`、`shuangbai_fight_table_complete`。

## 验收备注
- 未进行 `cargo build --release` / 部署（按约定）。
- 未读 server-rs 大文件确认 WorldData 字段（模板已给出 `w.floors/w.points/w.spawn/w.enemies/w.npcs/w.portals` 等访问方式，测试按此编写）。
- 上下文吃紧，已按约定优先完成 worlds + scenes；测试 3 个确定性用例均已写完。