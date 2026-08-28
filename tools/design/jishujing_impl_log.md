# 《无限恐怖 · 弗莱迪归来》副本三件套实现日志

> slug `jishujing` · 场景前缀 `jj2_` · 世界展示向 · 无真相线 · 开放结局
> 里程碑：三件新文件已全部落盘，未改动任何既有文件。

## 一、交付文件

| 文件 | 行数 | 状态 |
|---|---|---|
| `server-rs/src/worlds/jishujing.rs` | 152 | ✅ 已落盘 |
| `server-rs/src/scenes_jishujing.rs` | 510 | ✅ 已落盘 |
| `server-rs/tests/jishujing_flow.rs` | 41 | ✅ 已落盘 |
| `tools/design/jishujing_impl_log.md` | 本文件 | ✅ 已落盘 |

## 二、场景/战斗概览

| 指标 | 数值 |
|---|---|
| `SceneDef` 场景数 | 30 |
| 场景 id 前缀 | `jj2_`（开场 `jj2_00` · L1/L2/L3 hub `jj2_l1_hub/jj2_l2_hub/jj2_l3_hub` · BOSS `jj2_boss`/`jj2_boss_round` · 结算 `jj2_42_card` · 死亡 `jj2_50_death`） |
| `jishujing_figths()` 战斗 | 4（每层 1 前哨象征战 + 选择驱动 BOSS） |
| BOSS | 梦魇弗莱迪，HP **210** |
| 开放结局 | 3 分支（挣脱梦境 / 与弗莱迪共眠 / 把梦交给同伴） |
| 地图 | 3 层 40×26，每行恰 40 字符（程序化生成并逐一核对） |
| POINTS | 12 · ENEMIES 3 · NPCS 3 · ZONES 2 · PORTALS 2 · GATES 2 |

## 三、BOSS 机制（选择驱动 · 黄金模板 C 段）

- `start_boss(st)`：无 fight 时从 `fight_cfg("jj2_boss")` 初始化战斗对象（HP 210），返 `jj2_boss_round`。
- `boss_act(st, dmg, guard)`：扣血→hp≤0 走 `boss_win`；否则弗莱迪反击（狂暴 26 / 普通 20），`guard` 免伤；hp≤0 走 `jj2_50_death`。
- `boss_win(st)`：+500 点、`jj2_freddy_down`、`sp_grade=D` → 开放结局 1 `jj2_end_flee`。
- round 场景提供：重击(30)/防御(0,守卫)/+若握清醒锚(45) 三招 + 两枚开放结局分支（共眠 / 交给同伴）。
- 「清醒之锚」支线：L3 记忆碎片置 `jj2_awake` → 决战时解锁高伤招 `jj2_boss_round`。

## 四、★外部依赖清单（主线合并阶段需接线）

1. `server-rs/src/lib.rs`：新增 `pub mod scenes_jishujing;`。
2. `server-rs/src/worlds/mod.rs`：
   - `mod jishujing;`
   - 组装 `static JISHUJING: WorldData = WorldData { id: "jishujing", name: "无限恐怖·弗莱迪归来", difficulty: ..., initial_scene: "jj2_00", floors: [&jishujing::JISHUJING_L1_MAP, &jishujing::JISHUJING_L2_MAP, &jishujing::JISHUJING_L3_MAP], floor_names: &jishujing::JISHUJING_FLOOR_NAMES, points: &jishujing::POINTS, enemies: &jishujing::ENEMIES, npcs: &jishujing::NPCS, zones: &jishujing::ZONES, portals: &jishujing::PORTALS, gates: &jishujing::GATES };` 并加入 `WORLDS`（如可选网关置 Difficulty）。
3. `server-rs/src/scenes.rs`：`scene(id)` 增加 `or_else(|| scenes_jishujing::JISHUJING_SCENES.iter().find(|s| s.id == id))`；`fight_cfg(id)` 增加 `or_else(|| scenes_jishujing::jj2_fight_cfg(id))`。
4. **素材替换**：bg 全用占位 `img_zhuyuan_book.png`（小镇/锅炉房）`img_corridor.png`（学校走廊）`img_laser.png`（BOSS 决战）；`loc`/voice 文案可随素材一并替换。
5. **新道具 items_data 注册**：`jj2_key`（L1 榆树爪痕钥匙，开 `jj2_g1`）、`jj2_ember`（L2 余烬，开 `jj2_g2`）——需在 items 数据表注册图标/描述。
6. **sp_grade 经济线**：BOSS 战与三条开放结局结算统一给 `sp_grade='D'`，接入副本评级/奖励资源线。
7. **死亡复活接线**：`jj2_50_death` 死亡档案（复活回主神空间扣 300 点）需接入主线复活系统；三场前哨战 + BOSS 的 `death:"jj2_50_death"` 均走此档案。
8. **ZONES 接线**：L3 战圈 `jj2_z_l3_furnace`(kind=fight,ref`jj2_boss`) 与 env 机关 `jj2_z_l3_flash`(ref`jj2_l3_flash`) 由移动引擎接入 ZoneDef 触发。

## 五、验收自检结论

- ✅ 三步 maps 每行恰 40 字符、恰 26 行（逐行 script 校验）。
- ✅ 所有 POINTS/ENEMIES/NPCS/ZONES/PORTALS/GATES/出生点(P) 坐标均落在 `.` 或 `P` 上（逐格核对，修正了 2 处占用墙格）。
- ✅ 全部 `Route::To` 目标均为 `JISHUJING_SCENES` 已定义 scene id（diff 0 缺失）。
- ✅ 全部 `fight_id`（jj2_fight_l1/l2/l3 + boss）均在 `jishujing_figths()` 表内。
- ✅ 测试仅依赖 `scenes_jishujing::jishujing_figths()` + 全局 `scenes::scene`/`scenes::fight_cfg`，未引用 WorldData/find_world/walkable。