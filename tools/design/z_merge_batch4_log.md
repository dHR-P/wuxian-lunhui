# Z 宇宙第四批 4 副本合并注册日志

> 合并代理：Z 宇宙 4 副本合并注册子代理（`tokenrhythm/deepseek-v4-flash-0731`）。
> 作用域：`server-rs/src/lib.rs`、`server-rs/src/worlds/mod.rs`、`server-rs/src/scenes.rs`（仅 `scene()`/`fight_cfg()` 两查询函数）、`server-rs/tests/`（仅查看/整理，本批 4 个 `*_flow.rs` 已在 `tests/`，无 `tests_pending` 残留）。
> 时间：合并批次执行日。

## 一、4 副本注册逐项确认

地图常量名、层数、出生点以源文件（`worlds/*.rs`）为准；initial_scene 以各 `scenes_*.rs` 开场场景 id 为准。

| slug | 中文名 | 常量 `WORLD_*` | 世界 id | 层数(地图常量) | 表名 | initial_scene | 网关 `gw_*` 落点(出生点 P) |
|---|---|---|---|---|---|---|---|
| shaqiu | 沙丘魔海·坠毁之星 | `WORLD_SHAQIU` | `shaqiu` | 4（F1..F4，`SHAQIU_F1..F4_MAP`） | `POINTS/ENEMIES/NPCS/ZONES/PORTALS/GATES` + `SHAQIU_FLOOR_NAMES` | `sq_00_intro` | F1 坠毁穿梭机残骸 P(4,14) |
| yize | 远古遗迹·遗泽 | `WORLD_YIZE` | `yize` | 4（F1..F4，`YIZE_F1..F4_MAP`） | `POINTS/ENEMIES/NPCS/ZONES/PORTALS/GATES` + `YIZE_FLOOR_NAMES` | `yz_01_arrive` | F1 入口大厅 P(19,24) |
| poxiao | 破晓封锁区 | `WORLD_POXIAO` | `poxiao` | 3（F1..F3，`POXIAO_F1..F3_MAP`） | `POINTS/ENEMIES/NPCS/ZONES/PORTALS/GATES` + `POXIAO_FLOOR_NAMES` | `px_00_open` | L1 封锁城区街道 P(4,24) |
| tiexue | 铁血·地底金字塔 | `WORLD_TIEXUE` | `tiexue` | 3（L1..L3，`TIEXUE_L1..L3_MAP`） | `POINTS/ENEMIES/NPCS/ZONES/PORTALS/GATES` + `TIEXUE_FLOOR_NAMES` | `tx_00_open` | L1 冰层营地 P(1,1) |

- **地图/出生点确认（逐副本核对源文件）**：
  - **shaqiu**：`SHAQIU_F1_MAP`（行14）`F2`（行44）`F3`（行74）`F4`（行104），`SHAQIU_FLOOR_NAMES`（行134）；F1 `P` 标记 y=14,x=4 → P(4,14)；`spawn()` 回退亦写 (4,14)。
  - **yize**：`YIZE_F1_MAP`（行12）`F2`（行42）`F3`（行72）`F4`（行102），`YIZE_FLOOR_NAMES`（行131）；F1 `P` 标记 y=24,x=19 → P(19,24)。
  - **poxiao**：`POXIAO_F1_MAP`（行13，L1 街道）`F2`（行43，L2 排水道）`F3`（行73，L3 尖塔）——F 前缀但楼层名实为 L1..L3，共 **3 层** 非 4 层；`POXIAO_FLOOR_NAMES`（行102）；L1 `P` 标记 y=24,x=4 → P(4,24)。
  - **tiexue**：`TIEXUE_L1_MAP`（行16）`L2`（行47）`L3`（行78）——L 前缀，共 **3 层**；`TIEXUE_FLOOR_NAMES`（行107）；L1 `P` 标记 y=1,x=1 → P(1,1)。
- **initial_scene 确认**：
  - shaqiu `sq_00_intro`（scenes_shaqiu.rs 行348 开场）；poxiao `px_00_open`（scenes_poxiao.rs 行247）；tiexue `tx_00_open`（scenes_tiexue.rs 行335）。
  - yize 无 `yz_00`：首场景为 `yz_01_arrive`（scenes_yize.rs 行312「F1 遗迹外层 · 尘封巨门前厅」，出生点 P(19,24) 的 PointDef `yz_pt_entry` route 直指该场景，为「出生/开场」）。取 `yz_01_arrive`。

## 二、注册改动

### 1. `server-rs/src/lib.rs`
在既有 `scenes_…` 模块声明末尾新增 4 个 `pub mod`：`scenes_shaqiu;`、`scenes_yize;`、`scenes_poxiao;`、`scenes_tiexue;`。

### 2. `server-rs/src/worlds/mod.rs`
- 顶部模块列表追加 `mod shaqiu;`、`mod yize;`、`mod poxiao;`、`mod tiexue;`。
- 新增 4 个世界 id 常量：`WORLD_SHAQIU="shaqiu"` / `WORLD_YIZE="yize"` / `WORLD_POXIAO="poxiao"` / `WORLD_TIEXUE="tiexue"`。
- 新增 4 个 `WorldData`（`static SHAQIU`/`YIZE`/`POXIAO`/`TIEXUE`）：`difficulty` 均=2；`initial_scene` 按上表；`floors/floor_names/points/enemies/npcs/zones/portals/gates` 全部字段引用各 world 文件导出表（表名见上表，floor_names 用各 `*_FLOOR_NAMES`）。
- `WORLDS` 表末尾追加 `&SHAQIU, &YIZE, &POXIAO, &TIEXUE`（现在共 24 世界）。
- `GW_PORTALS` 追加 4 个（from `WORLD_ZHUTIAN`，落点=各副本出生点 P，见上表，`available: true`）：
  - `gw_shaqiu`：主神 (31,34) → shaqiu F0 (4,14)。
  - `gw_yize`：主神 (31,35) → yize F0 (19,24)。
  - `gw_poxiao`：主神 (31,36) → poxiao F0 (4,24)。
  - `gw_tiexue`：主神 (31,37) → tiexue F0 (1,1)。

### 3. `server-rs/src/scenes.rs`（仅两个查询函数）
- `pub fn scene(id)`：or_else 链末尾各追加 1 项，检索 `scenes_shaqiu::SHAQIU_SCENES`、`scenes_yize::YIZE_SCENES`、`scenes_poxiao::POXIAO_SCENES`、`scenes_tiexue::TIEXUE_SCENES`。
- `pub fn fight_cfg(id)`：or_else 链末尾各追加 1 项，检索 `scenes_shaqiu::shaqiu_figths()`、`scenes_yize::yize_figths()`、`scenes_poxiao::poxiao_figths()`、`scenes_tiexue::tiexue_figths()`。

各场景/战斗函数名确认：

| slug | 场景数组 | 战斗函数 |
|---|---|---|
| shaqiu | `SHAQIU_SCENES` | `shaqiu_figths()` |
| yize | `YIZE_SCENES` | `yize_figths()` |
| poxiao | `POXIAO_SCENES` | `poxiao_figths()` |
| tiexue | `TIEXUE_SCENES` | `tiexue_figths()` |

## 三、tests 整理

- 4 个 `*_flow.rs` 均已在本仓库 `server-rs/tests/`：`shaqiu_flow.rs`（193 行）/ `yize_flow.rs`（172 行）/ `poxiao_flow.rs`（180 行）/ `tiexue_flow.rs`（206 行），**无需移入**。
- 全仓库递归确认**无 `tests_pending` 目录残留**（`Get-ChildItem -Recurse -Directory -Filter '*pending*'` 为空），无需清理。
- `poxiao_flow.rs` 引用 `wuxian_horror_ch1::worlds::WORLD_POXIAO` 与 `find_world`；本批注册后查询可解析。

## 四、首次编译错修复清单

4 个新副本的 `worlds/*.rs` + `scenes_*.rs` + `tests/*_flow.rs` **首次编译零报错**（`cargo check --all-targets` 无 error），未对本批次文件做任何编译修复。

> 说明：cargo 把 warning 写入 stderr，PowerShell `2>&1` 会把它当作 NativeCommandError，导致初次运行误报 exit 1；改为捕获实际 `$LASTEXITCODE` 后确认 `CARGO_EXIT=0`、error 行数=0。

## 五、cargo check 结果

- `cargo check --all-targets`：**0 错**，`Finished dev profile`，`CARGO_EXIT=0`，error 行 0。仅各文件 warning（既有 + 本批文件自带的若干 dead_code / non_snake_case / unused_variables 等，不阻断编译）。

## 六、cargo test 结果

`cargo test --release --no-fail-fast`：**exit 101**（2 个 target 失败，见下）。通过数统计：
- `tests/shaqiu_flow.rs`：**3 passed** 全绿。
- `tests/poxiao_flow.rs`：**3 passed** 全绿。
- `tests/tiexue_flow.rs`：**3 passed** 全绿。
- `tests/yize_flow.rs`：**2 passed，1 failed** —— `yize_main_line_arbiter_ending` 失败（见七 · 遗留 ①，确定性失败，非 flaky）。
- 既有全量（原 88 项）除 `playthrough::full_playthrough_axe_all_sidequests` 一次性 flaky（见七 · 遗留 ②），其余全绿。

**两个失败目标：`--test playthrough`、`--test yize_flow`。** `playthrough` 单测重跑即绿（随机战斗带来的 flaky，非注册问题）。

## 七、遗留

### ① 确定性失败：`yize_main_line_arbiter_ending`（yize_flow.rs:149）
- 断言 `带走结局应得 3 枚遗泽碎片`：实际 `st.inventory` 中 `legacy_shard` 只有 **1**（期望 3）。
- **根因（定位）**：`scenes_yize.rs` `yz_05_ending_choice`「带走遗泽 · 种子」选项的 effects 连续三次 `Eff::AddItem("legacy_shard")`（行 677-678），意图发放 3 枚碎片（sub 文案"/三枚碎片"、yize_impl_log §四"带走遗泽·种子 … +3×legacy_shard"）。但引擎 `world::add_item`（world.rs:247-251）对 `st.inventory`（Vec<String>）**去重**：同 id 只 push 一次，故 3×AddItem 实际只产生 1 枚。
- **修复归属**：须改 `scenes_yize.rs`（属**不可改文件**，超本代理授权范围）。修复方向为把同 id 多枚改由"可堆叠/计件"发放（如改用 `Eff::AddItem` 不同 id、或接入 `items_data::add_item_counted` 计件路径、或把三次 AddItem 的 id 做区分），或放宽 yize_flow.rs 断言。**需主线确认后修订**，本代理不越权改动。

### ② flaky：`playthrough::full_playthrough_axe_all_sidequests`
- 全量跑偶然失败一次，失败点 playthrough.rs:124 `觉醒应发生在濒危时`（`gene_lock_used` 时 hp_before 未必 ≤30）。舔食者 BOSS 战随机化导致。**单测立即重跑通过**（`full_playthrough_axe_all_sidequests ... ok`，EXIT=0），确认是随机 flaky，非本批次注册引入。

### ③ 其余
- 本批次编译零错；3/4 副本测试全绿（shaqiu/poxiao/tiexue）。
- 各源文件/测试自带的 dead_code / non_snake_case / unused 警告——预先存在或不阻断编译，非本批次引入。
- 未执行 `cargo build --release`，未部署。