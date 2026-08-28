# server-rs/ —— Tauri v2 + Rust 引擎与 WebView 前端

这是《无限轮回》的**活动版本**（`game/` 是废弃的静态原型）。Rust 引擎承载全部逻辑与状态，WebView 前端（`ui/`）只渲染视图模型。

---

## 一、目录结构

```
server-rs/
├── Cargo.toml          # crate = wuxian-horror-ch1，依赖 tauri/serde/serde_json/rand
├── Cargo.lock
├── build.rs            # tauri_build::build()
├── tauri.conf.json     # Tauri v2 配置：frontendDist=./ui、窗口 1280x820、withGlobalTauri
├── target/             # 构建产物（debug/ / release/，release 的 exe 即游戏本体）
├── gen/                # 生成 schemas
├── icons/              # 图标
├── src/                # Rust 引擎源码（详见 src/README.md）
│   ├── main.rs         # Tauri 命令层（IPC 入口）
│   ├── lib.rs          # 库入口（集成测试与二进制共用）
│   ├── worlds/         # 各副本世界数据注册表（6 表静态）
│   ├── scenes*.rs      # 每副本一个剧本 DSL 场景文件（scenes.rs + scenes_<slug>.rs）
│   ├── engine.rs       # 战斗引擎 / 结算 / 存档恢复
│   ├── state.rs        # GameState 全局状态 / 存档迁移
│   ├── defs.rs         # 类型定义（SceneDef/FightCfg/Eff/Route + 数据层结构体）
│   ├── power.rs        # 动态难度缩放
│   ├── *.data.rs       # 数据表（skills_data/items_data/combat_data）
│   └── maps.rs / world.rs / combat_data.rs
├── tests/              # 集成测试（每副本一个 *_flow.rs + 系统专项 *test.rs）
└── ui/                 # WebView 前端（详见 ui/README.md）
```

---

## 二、Tauri 命令（IPC 契约 —— 前端 client.js 调用）

命令在 `main.rs`，通过 `tauri::generate_handler![...]` 注册。**这些是前后端交互契约，不得随意变更**（前端 `client.js` 直接 `invoke` 调用）：

| 命令 | 参数 | 返回/作用 |
|------|------|-----------|
| `api_new` | — | 新轮回：`scaling_enabled=true`，继承上次轮回地图记忆 `explored`，进入 `s_office` |
| `api_continue` | — | 读档恢复（含 `migrate_save` 迁移） |
| `api_choose` | `{index}` | 剧情选择 / 战斗回合指令 |
| `api_nexus` | — | 主神空间卡片（结算后进入） |
| `api_nexus_enter` | — | 正式切到主神世界（写 `bh_cleared`） |
| `api_deaths` | — | 死亡档案（最近 30 条） |
| `api_has_save` | — | 有无存档 |
| `api_world` | — | 当前世界 2D 地图全量视图 + HUD + 世界元信息 |
| `api_world_move` | `{dx, dy}` | 走一格；返回 `ok/tile/hit/teleported/gate_blocked/encounter/nearby` |
| `api_world_interact` | `{objId}` | 交互门禁/副本入口/敌人/跨世界网关/调查点/NPC/传送门 |
| `api_zone_action` | `{action, arg}` | 3D 副本内动作：`move/attack/dodge/use_item/exit` |
| `api_zone_exit` | — | 离开 3D 副本回到世界地图 |
| `api_scene_goto` | `{sceneId}` | 世界模式跳到剧情场景 |
| `api_scene_back` | — | 剧情场景返回世界地图 |

返回的 `view` 是前端 `handleView` 消费的视图模型（scene/bg/choices/card/world/…）。

---

## 三、数据流总览（关键分层）

```
main.rs (IPC)  ←invoke→  ui/js/client.js
     │  │
     │  ▼
     ├─ engine.rs : goto/choose/render/fight_turn/结算 —— 读 scenes*.rs 剧本 + *data.rs 数值
     │
     ├─ world.rs / worlds/ : world_view / try_move / interact —— 读 maps.rs 六对象 + 各 world 文件
     │
     ├─ state.rs : GameState（唯一权威状态，serde 持久化到 data/save.json）
     │
     └─ power.rs : fight_scale —— 实例化 Fight 时按「主角强度 × 副本难度系数」缩放 FightCfg
```

- 所有 `#[serde(default)]` 新持久字段保证旧档兼容；`save_version` 迁移幂等（`migrate_save` v1→v2/v3）。
- 存档 `data/save.json`、死亡档案 `data/deaths.json`、调用日志 `data/rpc.log` 生成在 **exe 同级 `data/`**。

---

## 四、世界注册（6 表三件套模式）

每个副本世界 = 三个文件（详见 `src/README.md`「副本三件套」）：

1. `src/worlds/<slug>.rs` —— 世界 6 表静态数据。
2. `src/scenes_<slug>.rs` —— 该副本剧本 DSL（`<SLUG>_SCENES` + `fight_cfg` 条目）。
3. `tests/<slug>_flow.rs` —— 该副本集成测试。

注册入口（`src/lib.rs` `pub mod scenes_<slug>;` → `src/worlds/mod.rs` `mod <slug>;` + `WORLD_<SLUG>` 常量 + `WORLD_<SLUG>` 静态 + `WORLDS` 数组 + `GW_PORTALS` 网关 → `src/scenes.rs` `scene()`/`fight_cfg()` 挂 or_else 链）。自动化：`tools/gen_dungeons.mjs` + `tools/gen_register.mjs`（见 `docs/DEVELOPMENT.md`）。

---

## 五、测试结构

- `tests/*_flow.rs`：按副本的端到端流程（进副本→交互→战斗→结算→断言数值/flag）。
- `tests/*_test.rs`：系统专项（`craft_test` 合成、`equipment_test` 装备、`bloodline_test`、`exchange_test`、`dynamic_scaling_test` 动态难度、`all_panels_test` 面板、`all_upgrades_test` 强化、`all_worlds_interaction_test` 全副本交互、`characters_test` 人物、`playthrough` 通关、`migrate_save` 存档迁移等）。

# 运行

```bash
cd server-rs
cargo build --release                       # 构建 exe（含前端打包）
cargo test --release --no-fail-fast         # 全量测试
cargo check --all-targets                   # 快速编译检查
```

产物：`server-rs/target/release/wuxian-horror-ch1.exe`。
