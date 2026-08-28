# Z 宇宙第三批 2 副本合并注册日志

> 合并代理：Z 宇宙第三批 2 副本合并注册（`tokenrhythm/deepseek-v4-flash-0731`）。
> 作用域：`server-rs/src/lib.rs`、`server-rs/src/worlds/mod.rs`、`server-rs/src/scenes.rs`（仅 `scene()`/`fight_cfg()` 两查询函数）、`server-rs/tests/` 与 `server-rs/tests_pending/`（仅文件移入移出/删除残留）。
> 时间：合并批次执行日。

## 一、2 副本注册逐项确认

地图常量名与出生点以源文件（`worlds/*.rs`）与 `tests/*_flow.rs` 断言为准；initial_scene 以各 `scenes_*.rs` 开场场景 id 为准。

| slug | 中文名 | 常量 `WORLD_*` | 世界 id | 层数(地图常量) | 表名 | initial_scene | 网关 `gw_*` 落点(出生点 P) |
|---|---|---|---|---|---|---|---|
| tianting | 洪荒天庭（被封印的天庭残境） | `WORLD_TIANTING` | `tianting` | 4（F1..F4，`TIANTING_F1..F4_MAP`） | `POINTS/ENEMIES/NPCS/ZONES/PORTALS/GATES` + `TIANTING_FLOOR_NAMES` | `tt_01_drop` | L1 坠落点 P(2,13) |
| hezi | 盒壁层·异位面（倒影界） | `WORLD_HEZI` | `hezi` | 3（F1..F3，`HEZI_F1..F3_MAP`） | `POINTS/ENEMIES/NPCS/ZONES/PORTALS/GATES` + `HEZI_FLOOR_NAMES` | `hz_00` | F1 倒映平原 P(1,1) |

- **地图常量确认**：
  - tianting：`TIANTING_F1_MAP`（行16）`TIANTING_F2_MAP`（行46）`TIANTING_F3_MAP`（行76）`TIANTING_F4_MAP`（行106），`TIANTING_FLOOR_NAMES`（行135）。
  - hezi：`HEZI_F1_MAP`（行14）`HEZI_F2_MAP`（行44）`HEZI_F3_MAP`（行74），`HEZI_FLOOR_NAMES`（行104）。
- **出生点 P**：tianting L1 坠落点 `tt_pt_drop`（floor 0, x=2, y=13）→ P(2,13)；hezi F1 `P` 标记（y=1, x=1）→ P(1,1)。
- **initial_scene**：tianting `tt_01_drop`（scenes_tianting.rs 行 207 主神广场·解锁入口，随后 `tt_01_drop_land` 才落 L1）；hezi `hz_00`（scenes_hezi.rs 行 208 入境口）。

## 二、注册改动

### 1. `server-rs/src/lib.rs`
新增 `pub mod scenes_tianting;` 与 `pub mod scenes_hezi;`（按字母并入 `scenes_tianshe` 与 `scenes_tongqu` 之间）。

### 2. `server-rs/src/worlds/mod.rs`
- 顶部 `mod hezi;`、`mod tianting;`（按字母并入既有列表）。
- 新增 `pub const WORLD_TIANTING: &str = "tianting";`、`pub const WORLD_HEZI: &str = "hezi";`。
- 新增 `static TIANTING`、`static HEZI` 两个 WorldData：`difficulty` tianting=3（高难世界）、hezi=2；`initial_scene` 按上表；`floors/floor_names/points/enemies/npcs/zones/portals/gates` 全部字段引用各 world 文件导出表。
- `WORLDS` 表末尾追加 `&TIANTING, &HEZI`（现 20 世界）。
- `GW_PORTALS` 追加 2 个（from `WORLD_ZHUTIAN`，落点=出生点 P 见上表）：
  - `gw_tianting`：主神 (31,32) → tianting F0 (2,13)，`available: true`。
  - `gw_hezi`：主神 (31,33) → hezi F0 (1,1)，`available: true`。

### 3. `server-rs/src/scenes.rs`（仅两个查询函数）
- `pub fn scene(id)`：or_else 链末尾追加 2 项，检索 `scenes_tianting::TIANTING_SCENES` 与 `scenes_hezi::HEZI_SCENES`。
- `pub fn fight_cfg(id)`：or_else 链末尾追加 2 项，检索 `scenes_tianting::tianting_figths()` 与 `scenes_hezi::hezi_figths()`。

各场景/战斗函数名确认：

| slug | 场景数组 | 战斗函数 |
|---|---|---|
| tianting | `TIANTING_SCENES` | `tianting_figths()` |
| hezi | `HEZI_SCENES` | `hezi_figths()` |

## 三、tests_pending 清理

- 将 `tests_pending/tianting_flow.rs`（139 行）移到 `tests/tianting_flow.rs`。
- hezi 测试沿用 `tests/hezi_flow.rs`（152 行新版异位面展示版，grep 确认使用 `WORLD_HEZI` / 开场 `hz_00`）。
- 删除 `tests_pending/hezi_flow.rs`（164 行旧版残留）与 `tests_pending/yijie_flow.rs`（145 行改名残留）。
- 移/删后 `tests_pending/` 目录为空，已整目录删除。

## 四、首次编译错修复清单（各 scenes/worlds 文件）

`scenes_tianting.rs` / `scenes_hezi.rs` / `worlds/tianting.rs` / `worlds/hezi.rs` **首次编译零报错**（`cargo check --all-targets` 无 error），未对本批次新增文件做任何编译修复（仅源文件自带的若干 `non_snake_case`/dead_code 警告，不阻断编译）。

## 五、cargo check 结果

- `cargo check --all-targets`：**0 错**，`Finished dev profile`，`CHECK_EXIT=0`。仅既有各文件的 warning（预先存在，非本批次引入）。

## 六、cargo test 结果

`cargo test --release --no-fail-fast`：**exit 0**，全量 **88 passed；0 failed**（doc/misc 空测试 3 个 0 passed 不计）。构成 = 原有 82 + tianting 3 + hezi 3。

- `tests/tianting_flow.rs`：3 passed —— `tianting_f1_map_reachable` / `tianting_huang_cast_is_playout_not_fight` / `tianting_main_line_boss_two_phase`，全部 ok。
- `tests/hezi_flow.rs`（152 行新版展示版）：3 passed —— `hezi_maps_reachable` / `hezi_main_line_open_ending` / `hezi_guard_battle_open_ending`，全部 ok。
- 既有 82 项（含 playthrough full）全绿，无随机 flaky 需重跑。

## 七、遗留

- 无本批次引入的失败或编译错。
- 仅源文件自带的 `non_snake_case`（`scenes_tianting.rs::settle_A` 等）/ dead_code / unused 警告——预先存在，不阻断编译，非本批次引入（如需零警告由主线后续统一清理）。

> 未执行 `cargo build --release`，未部署。