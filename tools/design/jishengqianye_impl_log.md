# 《无限恐怖·寄生前夜》副本实现日志（jishengqianye）

- 场景：`server-rs/src/scenes_jishengqianye.rs`（`JISHENGQIANYE_SCENES` id `js_` + `jishengqianye_figths()` id `wc_jq_`）
- 世界：`server-rs/src/worlds/jishengqianye.rs`（3 层 40×26）+ 集成测试 `server-rs/tests/jishengqianye_flow.rs`
- 引擎：**零新引擎**，复用现有 `SceneDef/ChoiceDef/Route/Eff/FightCfg/PointDef/...` 体系
- 状态：子代理已完成三份全新文件落盘；`cargo check` 验证 `scenes_jishengqianye` **可编译**（仅未接线导致的 dead_code 警告，并入后消除）
- ⚠️ **外部依赖（合并由主线完成，子代理不改既有文件）**：
  1. `lib.rs`：`pub mod scenes_jishengqianye;`（**已存在，无需新增**）
  2. `worlds/mod.rs`：`mod jishengqianye;` + `pub const WORLD_JISHENGQIANYE: &str = "jishengqianye";` + 注册 `static JISHENGQIANYE: WorldData`（`initial_scene:"js_00"`），并加入 `WORLDS`
  3. `scenes.rs`：`scene()` / `fight_cfg()` 同时检索 `JISHENGQIANYE_SCENES` / `jishengqianye_figths()`
  4. 可选跨世界网关：主神 → 落点 `(3,22)`（F1 剧场出口出生点）

## 世界结构

三层 40×26，F 前缀表名：

| 层 | 中文名 | 主线功能 |
|----|--------|----------|
| F1 | 歌剧院·开幕之夜 | 出生点 (3,22)；储物间拿枪、化妆间/主舞台目击、克丽丝（感染链·阶段一） |
| F2 | 纽约街道·感染蔓延 | 封锁街道、救护站、法医处、黑巷猎犬、警戒塔（感染链·阶段二→jq_fused） |
| F3 | 中央研究所·聚合体 | 档案室破解蓝图、样本室、病历中心、培育舱、聚合体深室（BOSS）→ 三结局 |

- 出生点 `P@(3,22)`；唯一回跳门 `p_jq_exit`（F3 楼顶 → F1）造闭环
- 门禁：`jq_g1`(法医处·需布伦放行) / `jq_g2`(培育舱·需 jq_source_found) / `jq_g3`(聚合体·需 jq_boss_ready)
- 表：POINTS 15 / ENEMIES 9 / NPCS 4 / ZONES 3 / PORTALS 5 / GATES 3；全部坐标已由脚本核验可走（AUDIT_OK）

## 核心：线粒体感染 flag 链

```
jq_infected_1（剧场目击克丽丝样本）→ jq_infected_2（救护站/中庭加深）→ jq_fused（彻底融合）
```
`jq_fused` 门控【共存 / 自毁】结局与 BOSS 回合内的「借自身线粒体共鸣」增幅伤选项。

## BOSS：线粒体聚合体（HP 200，选择驱动，霸者阶段增回）

- `wc_jq_boss`：`hp 200` / `dmg (16,26)` / `reward 500` / `rage_at Some(80)`（≈40% 触发）
- **霸者阶段增回**：HP ≤ 80 进入狂暴，攻增（26~38），且每回合自愈 8 点（`boss_act` 内实现）
- 遭遇链（选择驱动，非原生战斗）：
  - `js_f3_bossgate` 三择：清除（直战）/ 共存（需 jq_fused）/ 自毁（需 jq_fused）
  - `js_boss_round` 回合：密集火力(30~46) / 冷静卸力稳伤(14~26) / 借融合共鸣(36~52 深化感染)
  - `boss_win` 按抉择 flag 分流：`js_win_purge` / `js_win_coexist` / `js_win_selfdestruct`，均收敛 `js_card`
- 普通敌：`wc_jq_intro_prop`(30) / `wc_jq_drone`(45) / `wc_jq_evolved`(70,狂暴28) / `wc_jq_hound`(60,狂暴26)

## 结局（开放三线，sp_grade=Some('D')）

1. **清除**：直战把聚合体打崩，连根拔除线粒体巢穴
2. **共存**：融合后订下共生契约，聚合体成为细胞兄弟
3. **自毁**：融合后引爆自身细胞，与聚合体同归于尽，以己为代价救城

## 测试（tests/jishengqianye_flow.rs，3 个确定性用例；不触随机战斗）

按 `tools/design/impl_template.md` 三·节约定写（只依赖 scenes_<slug> + 全局 scenes::scene/fight_cfg，不引用 find_world/walkable/WorldData）：

1. `jishengqianye_scenes_exist` — `scenes::scene()` 可分发 js_00 / js_f3_bossgate / js_boss_round / js_card / js_death
2. `jishengqianye_boss_cfg` — `scenes::fight_cfg("wc_jq_boss")` 数值：hp200 / dmg(16,26) / reward500 / rage_at=Some(80)（霸者阶段增回阈）
3. `jishengqianye_self_consistent` — 分发闭环：战斗表每 id 均可经 fight_cfg 查回；场景表含 js_00 / js_boss_round / js_card

## 待素材替换占位

- F1 歌剧院 `img_nexus.png` / F2 街道 `img_corridor.png` / F3 研究所 `img_zhuyuan_book.png`
- 敌人立绘复用 guard/hunter/zombie；bg 与敌美术由主线统一生图替换（bg 字段已留）