# Z 宇宙第二批 9 副本合并注册日志

> 合并代理：Z 宇宙第二批 9 副本合并注册（`tokenrhythm/deepseek-v4-flash-0731`）。
> 作用域：`server-rs/src/lib.rs`、`server-rs/src/worlds/mod.rs`、`server-rs/src/scenes.rs`（仅 `scene()`/`fight_cfg()` 两查询函数）+ 新副本场景/世界文件首次编译错的修复。
> 时间：合并批次执行日。

## 一、9 副本注册逐项确认

批次 9 副本，注册常量 / 地图名 / initial_scene / 网关落点逐项如下（地图常量与出生点以源文件与 `tests/*_flow.rs` 断言为准）：

| slug | 中文名 | 常量 `WORLD_*` | 世界 id | 层数(地图常量) | 表名 | initial_scene | 网关 `gw_*` 落点(出生点 P) |
|---|---|---|---|---|---|---|---|
| cangjingge | 侠行天下·藏经阁·绝学之争 | `WORLD_CANGJING` | `cangjingge` | 4（L0..L3） | `POINTS/ENEMIES/NPCS/ZONES/PORTALS/GATES` | `cj_00` | L0 经堂 P(14,20) |
| jianzhong | 侠行天下·剑冢禁地 | `WORLD_JIANZHONG` | `jianzhong` | 4（L1..L4） | 同上 | `jz_00` | L1 山门古道 P(20,24) |
| tongqu | 侠行天下·通衢古镇·夜雨镖局 | `WORLD_TONGQU` | `tongqu` | 3（L1..L3） | 同上 | `tq_00` | L1 镇门 P(14,20) |
| juluoji | 侏罗纪公园 | `WORLD_JULUOJI` | `juluoji` | 3（L1..L3） | 同上 | `jl_00` | L1 园区 P(1,20) |
| xinghe | 星河异形·巢穴 | `WORLD_XINGHE` | `xinghe` | 3（L1..L3） | 同上 | `xh_00` | L1 登陆场 P(5,14) |
| sishen | 死神来了·机场危机 | `WORLD_SISHEN` | `sishen` | 3（L1..L3） | 同上 | `ss_00` | L1 候机大厅 P(20,5) |
| mumiyi | 木乃伊·哈姆纳塔地宫 | `WORLD_MUMIYI` | `mumiyi` | 3（F0..F2） | **`MUMIYI_POINTS/...`（带世界前缀）** | `mm_00_camp` | F0 地宫入口 P(19,22) |
| mojiao | 魔教总坛·血月 | `WORLD_MOJIAO` | `mojiao` | 4（L1..L4） | `POINTS/ENEMIES/NPCS/ZONES/PORTALS/GATES` | `mj_00` | L1 血月山道 P(27,24) |
| wulin | 侠行天下·武林大会 | `WORLD_WULIN` | `wulin` | 4（L1..L4） | 同上 | `wl_00` | L1 山门 P(18,20) |

## 二、注册改动

### 1. `server-rs/src/lib.rs`
新增 9 个 `pub mod scenes_cangjingge/jianzhong/juluoji/mojiao/mumiyi/sishen/tongqu/wulin/xinghe;`（按字母并入既有列表中）。

### 2. `server-rs/src/worlds/mod.rs`
- 顶部 `mod <slug>;` ×9（按字母并入既有列表）。
- 新增 9 个 `pub const WORLD_<SLUG>: &str = "<slug>";`。
- 仿 ZHAOYUAN/MOSHI 新增 9 个 `static` WorldData：
  - 大部分同 world 文件导出**同名** `POINTS/ENEMIES/NPCS/ZONES/PORTALS/GATES` 与 `<X>_FLOOR_NAMES`；
  - **mumiyi** 例外：表名为带前缀 `MUMIYI_POINTS/MUMIYI_ENEMIES/MUMIYI_NPCS/MUMIYI_ZONES/MUMIYI_PORTALS/MUMIYI_GATES`，地图常量 `MUMIYI_F0/F1/F2_MAP`（F 前缀，非 L）。
  - `difficulty: 2`；`initial_scene` 按上表。
- `WORLDS` 表末尾追加 9 个 `&<X>`。
- `GW_PORTALS` 追加 9 个（from `WORLD_ZHUTIAN`，落点=出生点 P，见上表），`id: gw_<slug>`，`available: true`；主神侧占位坐标 31 行 y=23..31（与既有网关不冲突）。

### 3. `server-rs/src/scenes.rs`（仅两个查询函数，未触碰兑换段 `s_nexus_exchange`）
- `pub fn scene(id)`：or_else 链追加 9 项，逐一检索 `scenes_<slug>::<X>_SCENES`。
- `pub fn fight_cfg(id)`：or_else 链追加 9 项，逐一检索 `scenes_<slug>::<slug>_figths()`（或 `tongqu_figths` 等，函数名见下表）。
- **未改动** 兑换段（`s_nexus_*`、`skill_scenes!`/`shop_cat!` 等包 C 区域）。

各场景/战斗函数名确认：

| slug | 场景数组 | 战斗函数 |
|---|---|---|
| cangjingge | `CANGJING_SCENES` | `cangjingge_figths()` |
| jianzhong | `JIANZHONG_SCENES` | `jianzhong_figths()` |
| tongqu | `TONGQU_SCENES` | `tongqu_figths()` |
| juluoji | `JULUOJI_SCENES` | `juluoji_figths()` |
| xinghe | `XINGHE_SCENES` | `xinghe_figths()` |
| sishen | `SISHEN_SCENES` | `sishen_figths()` |
| mumiyi | `MUMIYI_SCENES` | `mumiyi_figths()` |
| mojiao | `MOJIAO_SCENES` | `mojiao_figths()` |
| wulin | `WULIN_SCENES` | `wulin_figths()` |

## 三、首次编译错修复清单（各 scenes/worlds 文件）

新注册的 9 副本此前未编译，首次纳入 `cargo check` 后报出的编译错（均为类型/构造写法问题，非逻辑错误），按合并必需修复（与 6 副本合并时修 yinse/jiguancheng 编译错同理）。仅修编译错，不改动任何剧情/数值内容。

1. **`server-rs/src/worlds/mumiyi.rs`**
   - 静态表类型写作 `maps::PointDef` 等，但各条目构造用**无前缀** `PointDef{...}/EnemyDef{...}/NpcDef/ZoneDef/PortalDef/GateDef`，首次编译 E0422「不在作用域」。
   - 修复：在 `use crate::maps;` 后补 `use crate::maps::{PointDef, EnemyDef, NpcDef, ZoneDef, PortalDef, GateDef};`（最小改动，不改表数据）。

2. **`server-rs/src/scenes_mumiyi.rs`**
   - `txt_boss2`：`if` 分支返回 `&str`、`else` 返回 `String`，E0308 分支类型不一致 → 给 if 分支加 `.to_string()`。
   - 6 处 `ChoiceDef { cond: <fn> }` 未包 `Some(...)`，E0308（`Option<fn` vs fn item）→ 逐一改为 `cond: Some(cond_has_key / cond_has_scarab_sac / cond_has_water)`（行 352/437/455/530/592/624）。

> 其余 8 副本（cangjingge/jianzhong/tongqu/juluoji/xinghe/sishen/mojiao/wulin）的场景与世界文件首次编译无报错；仅余若干 dead_code/unused 警告（不阻断编译）。

## 四、cargo check 结果

- `cargo check --lib`：**0 错**，`Finished dev profile`。9 副本注册与合并必需编译错修复全部通过。
- `cargo check --tests`：`tests/tongqu_flow.rs`、`tests/mumiyi_flow.rs` 两个测试目标报错——均为**测试文件自身代码缺陷**（见遗留），非注册引入。

## 五、遗留（需主线路/测试子代理处理，非本批次注册引入）

1. **`cargo check --lib` 之外**（接受标准为 `cargo check` 零错，已满足）：
   - `tests/tongqu_flow.rs`：`st.mode == Mode::Fight` / `st.mode != Mode::Fight`（行 41/45）——`Mode` 未实现 `PartialEq`，应改为 `matches!(st.mode, Mode::Fight)`。
   - `tests/mumiyi_flow.rs`：`imhotep.finisher_if(&st, 10)`、`imhotep2.finisher_if(&st2, 10)`（行 176/179）——`FightCfg.finisher_if` 是字段（函数指针）非方法，应改为 `(imhotep.finisher_if)(&st, 10)`。
   - 上述为测试子代理交付的测试文件缺漏，本合并代理未授权改 `tests/*.rs`，请主线或对应测试子代理修复。
2. **若干 dead_code/unused 警告**（各 scenes_*.rs 的 cond 函数、`worlds/mumiyi.rs::MUMIYI_FLOORS` 等）——仅警告，不阻断；如追求零警告可由主线后续清理。
3. **并行 B/C 包**：`scenes.rs` 兑换段（`skill_scenes!` 等）此前在本代理运行中途出现过半成品宏报错，随后已消解；最终 `cargo check --lib` 为 0 错，说明 B/C 包兑换段已闭合。无需本代理处理。

> 未执行 `cargo build --release`，未部署。