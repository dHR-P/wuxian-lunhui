# 副本实现日志 · 生化危机·浣熊市（huanxiongshi）

> slug：`huanxiongshi`，world id 常量 `WORLD_HUANXIONGSHI = "huanxiongshi"`（主线合并时声明）。
> 钩子：**「蜂巢在地下，而地狱在地上。」** —— 与既有生化·蜂巢（地下主神线）区分：本副本为**地面浣熊市围城**，
> 丧尸围城 / 核弹倒计时 / 逃生求生。零新引擎，纯静态数据副本。
> 结构照抄 `tools/design/impl_template.md` 三件套模板。

## 一、交付文件（三文件 + 本日志，均全新，未改任何既有文件）

| 文件 | 行数 | 内容 |
|---|---|---|
| `server-rs/src/worlds/huanxiongshi.rs` | 186 | 三层地图 + 五表（POINTS/ENEMIES/NPCS/ZONES/PORTALS/GATES） |
| `server-rs/src/scenes_huanxiongshi.rs` | 536 | `HUANXIONGSHI_SCENES`(34 场景) + `huanxiongshi_figths()`(5 战斗) |
| `server-rs/tests/huanxiongshi_flow.rs` | 122 | 3 确定性用例 |
| `tools/design/huanxiongshi_impl_log.md` | — | 本文件 |

## 二、世界数据（worlds/huanxiongshi.rs）

- 三层 `HUANXIONGSHI_F1_MAP..F3_MAP`，每层 **26 行 × 40 字符**（已验证逐行 40 宽，无越宽/窄行）。
  - F1 **RPD 警局**（丧尸围城心脏，出生 P(1,1)）
  - F2 **燃烧街道**（九死一生岔路，山道 → 城郊）
  - F3 **城郊**（核弹倒计时终点，直升机坪/避难屋/哨所）
- `HUANXIONGSHI_FLOOR_NAMES`：警局 / 街道 / 城郊。
- 表：
  - `POINTS` 13：f1 枪械保险柜/对讲电台/医务室/警长日志/停尸间/屋顶；f2 翻覆警车/便利店/咖啡馆/路障广播；f3 避难屋/直升机坪/哨所。
  - `ENEMIES` 9：丧尸（f1/f3）、舔食者(f1)、街道尸群(f2)、丧尸犬(f2)、暴君·实验体(f3)。
  - `NPCS` 4：沈哲(幸存警员,f1)、艾彬(轮回者,f2)、郑咤(轮回者,f2)、直升机飞行员(f3)。
  - `ZONES` 2：暴君·破墙而出(f1, ref `hx_tyrant`)、城郊尸潮(f3, ref `hx_horde`)。
  - `PORTALS` 2：`pt_hx_1`(f1→f2)、`pt_hx_2`(f2→f3) 单向进阶。
  - `GATES` 1：`gate_hx_suburb`(f2 封锁路障，需 `it_hx_gatekey`)。
- 全部坐标已用脚本逐一断言可走（tile != '#'）。
- 辅助：`tile / walkable / spawn(返回 (1,1)) / gate_at / gate_by_id`。

## 三、剧情与战斗（scenes_huanxiongshi.rs）

- 场景 id 全 `hx_` 前缀，共 **34** 个；战斗 id `hx_` 前缀，共 **5** 档。
- 流程：`hx_00` 序 → `hx_f1_hub` →（取钥匙 f1_lockup / f1_radio 情报）→ f2 → f3 → `hx_nuke_room`(倒计时) → `hx_ending_choice`(三结局) → `hx_settle_card`。
- **BOSS 暴君 Tyrant**：`hx_tyrant` HP=200, dmg(18,28), reward 400, rage_at Some(80)，**选择驱动**（`start_tyrant` 初始化 `st.fight`，`hx_tyrant_round` 场景每回 Dyn：重击/蓄力/防御，狂暴后伤害提升，HP<30 触发 `hx_tyrant_finisher` 终结）。Tyrant_win 写 `hx_tyrant_down` + sp_grade Some('D') + 奖励。
- **城郊尸潮** `hx_horde`：HP120 强敌（原生 fight_id），F3 可选遭遇。
- **核弹倒计时 flag 伪实现**：`nuke_t()` 数 `hx_n1/n2/n3`；`nuke_pause` 每次停留推进 1，第 3 次 → `hx_nuke_death`（死亡档案 overlay）。避免频繁停留即可活到逃离。
- **结局三分支**：`hx_end_escape`(徒步逃离) / `hx_end_heli`(乘机,需 `hx_radio_done` 知情) / `hx_end_stay`(留下) —— 各 +400、写 `hx_end_*` flag、sp_grade Some('D') → `hx_settle_card`。
- 战斗表：`hx_zombie`/`hx_dog`/`hx_licker`/`hx_horde`/`hx_tyrant`。
- bg 占位：街道/警局 `img_corridor.png`，城郊/尸潮 `img_horde.png`。（模板约定待主素材替换）
- 物品：`it_hx_gatekey`(哨所钥匙)、`it_hx_pistol`(手枪)、`it_hx_medkit`(急救包)、`hx_tyrant_trophy`(暴君勋章)。
- 结构自检：所有 `Route::To` 目标均为已定义 scene id；所有 `fight_id`（hx_dog/hx_horde）都在 figths 表内；Dyn 返回串命中已定义场景。

## 四、★外部依赖清单（主神线合并阶段必做，本子代理不改既有文件）

1. **lib.rs**：`pub mod scenes_huanxiongshi;`（tests 导入 `crate::scenes_huanxiongshi` 需要）。
2. **worlds/mod.rs**：
   - `mod huanxiongshi;`
   - 常量 `pub const WORLD_HUANXIONGSHI: &str = "huanxiongshi";`
   - 新增 `static HUANXIONGSHI: WorldData`，把 `huanxiongshi::{HUANXIONGSHI_F1_MAP..}` 挂到 floors、五表挂到 points/enemies/npcs/zones/portals/gates，`initial_scene: "hx_00"`。
   - 追加 `&HUANXIONGSHI` 到 `WORLDS`；可选在主神网关 `GW_PORTALS` 加 `gw_huanxiongshi`（落点 F1 出生 (1,1)）。
3. **scenes.rs**：
   - `scene()`/`scene_by_world` 检索加 `or_else` → `scenes_huanxiongshi::HUANXIONGSHI_SCENES`。
   - `fight_cfg()` 加 `or_else` → `scenes_huanxiongshi::huanxiongshi_figths()`。
4. **items_data.rs**（可选）：为 `it_hx_gatekey` / `it_hx_pistol` / `it_hx_medkit` / `hx_tyrant_trophy` 补物品展示与换取配置；无则默认兜底。
5. **集成测试**：`cargo test --test huanxiongshi_flow`（合并注册后跑）。

> 验收：`cargo test --test huanxiongshi_flow` 三用例绿（map_reachable / dispatch_wired / mainline_escape）。本子代理不 build --release、不部署。