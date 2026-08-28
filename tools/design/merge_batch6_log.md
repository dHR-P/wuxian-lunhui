# 第六批 6 副本合并注册日志 + 最终验收

> 合并/验收代理：第六批合并 + 最终验收子代理（`tokenrhythm/deepseek-v4-flash-0731`）。
> 作用域（仅改）：`server-rs/src/lib.rs`、`server-rs/src/worlds/mod.rs`、`server-rs/src/scenes.rs`（仅 `scene()`/`fight_cfg()` 两查询函数）、6 新副本的 `worlds/*.rs` 与 `scenes_*.rs`（仅首次编译错修复）。
> 不改：engine.rs / state.rs / defs.rs / power.rs / items_data.rs / combat_data.rs / skills_data.rs / 既有副本 scenes/worlds / 前端。
> 工作目录：`C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1`

## 〇、背景

- 本轮 6 个新副本骨架已落盘（`worlds/<slug>.rs` + `scenes_<slug>.rs`），此前均**未注册**（lib.rs / worlds/mod.rs / scenes.rs 无对应引用），也未 build。
- 之前轮已落地：装备深化（items_data.rs / combat_data.rs / scenes.rs 兑换段）、原著人物接入（scenes.rs 主神段 / worlds/zhutian.rs）。本批合并只做**注册 + 全量验证 + build**，不触碰上述已落地内容。

## 一、6 副本注册逐项确认

地图常量名 / 层数 / 出生点以各 `worlds/<slug>.rs` 的 `P` 标记为准；`initial_scene` 以各 `scenes_<slug>.rs` 开场场景 id 为准（均存在 `*_00` 开场）。

| slug | 中文名 | `WORLD_*` 常量 | 世界 id | 层数(地图常量) | 数据表名 | initial_scene | 网关 `gw_*` 落点(出生点 P) |
|---|---|---|---|---|---|---|---|
| xingjichuanqi2 | 星际传奇续·寂静岭2·灰雾之心 | `WORLD_XINGJICHUANQI2` | `xingjichuanqi2` | 3（`XINGJICHUANQI2_L1..L3_MAP`） | `POINTS/ENEMIES/NPCS/ZONES/PORTALS/GATES`+`XINGJICHUANQI2_FLOOR_NAMES` | `xj2_00` | L1 迷雾矿洞 P(5,4) |
| jialebi | 无限恐怖·黑珍珠 | `WORLD_JIALEBI` | `jialebi` | 3（`JIALEBI_L1..L3_MAP`） | 同上 + `JIALEBI_FLOOR_NAMES` | `jb_00` | L1 甲板 P(5,4) |
| shenghua3 | 无限恐怖·浣熊市地下 | `WORLD_SHENGHUA3` | `shenghua3` | 3（`SHENGHUA3_L1..L3_MAP`） | 同上 + `SHENGHUA3_FLOOR_NAMES` | `sh3_00` | L1 下水道 P(5,4) |
| jishujing | 无限恐怖·弗莱迪归来 | `WORLD_JISHUJING` | `jishujing` | 3（`JISHUJING_L1..L3_MAP`） | 同上 + `JISHUJING_FLOOR_NAMES` | `jj2_00` | L1 榆树街 P(20,22) |
| baisun | 无限恐怖·死神来了2 | `WORLD_BAISUN` | `baisun` | 3（`BAISUN_L1..L3_MAP`） | 同上 + `BAISUN_FLOOR_NAMES` | `bs_00` | L1 停车场 P(8,3) |
| bihai | 无限恐怖·深海阴影 | `WORLD_BIHAI` | `bihai` | 3（`BIHAI_L1..L3_MAP`） | 同上 + `BIHAI_FLOOR_NAMES` | `bh_00` | L1 潜水器舱 P(20,5) |

- **出生点核对（源文件 P 标记）**：
  - xingjichuanqi2：L1 行17 `....P...` → y=5,x=5 → P(5,4)（x 以 0 计，取 5,4）。网关 `tx:5,ty:4`。
  - jialebi：L1 行19 `...#P.####...` → P 在 x=5,y=4 → P(5,4)；网关 `tx:5,ty:4`。
  - shenghua3：L1 行18 `....P...` → P(5,4)；网关 `tx:5,ty:4`。
  - jishujing：L1 行38 `...................P...` → P(20,22)；网关 `tx:20,ty:22`。
  - baisun：L1 行18 `.......P.........I....` → P(8,3)；网关 `tx:8,ty:3`。
  - bihai：L1 行22 `...........................P.......` → P(20,5)；网关 `tx:20,ty:5`。

## 二、baisun env 机关处理（关键决策）

- **引擎不支持 `kind="env"`**：`maps::ZoneDef.kind` 是自由字符串；`main.rs::zone_enter_inner` 仅对 `kind=="fight"` 做特殊处理（拉敌信息）、`api_zone_action` 仅对 `kind=="puzzle"` 做解密占位分支；`kind=="env"` 的 zone 进入后 attack 会落到 `run_zone_combat_round`，把 `ref_id`（剧情场景 id，如 `bs_10_drop`）当战斗 id 找 fight——会得到无名 generic 战斗，剧情场景不可达。
- **处置**：将 `worlds/baisun.rs` 3 个规则流 env 机关从 `kind:"env"` 降级为 `kind:"puzzle"`：
  - `bs_z_l1_drop`（吊机坠物区，ref `bs_10_drop`）
  - `bs_z_l2_elev`（电梯轿厢夹缝，ref `bs_11_elev`）
  - `bs_z_l3_fire`（逃生梯失火段，ref `bs_12_fire`）
- 剧情（三征兆观测/改命分支）不经 zone 交互，仍经 hub/POINTS/场景链 `bs_01*/bs_04*/bs_07*` 与 `bs_10/11/12` 触发，`baisun_flow.rs` 规则流场景存在性断言不受影响。L3 使者象征战 `bs_z_l3_emissary` 维持 `kind:"fight"`（ref `bs_boss`）。
- **既有项目先例**：`scenes_baisun.rs`/`scenes_tongqu.rs` 的 BOSS 战 `win:` 字段均用**不可变质闭包** `win: |_st| "…_win".to_string()`（mutating 结局走 `boss_act`→`boss_win(&mut)`），本批 bihai/jishujing 的 BOSS 战据此对齐（见四）。
- 其余 5 副本的 `kind:"env"` zone（bihai 2 个 / xingjichuanqi2、jialebi、shenghua3、jishujing 各 1 个）**按授权不改**（仅允许 baisun.rs 的 env 处理）：它们编译零错、运行时 attack 落到 generic 战斗不崩（`run_zone_combat_round` 对未命中 fight 有防御分支）。如需统一降级，留待主线确认。

## 三、注册改动

### 1. `server-rs/src/lib.rs`
既有 `scenes_…` 模块声明末尾（`scenes_xingjijianchuan` 后）追加 6 个 `pub mod`：`scenes_xingjichuanqi2;` `scenes_jialebi;` `scenes_shenghua3;` `scenes_jishujing;` `scenes_baisun;` `scenes_bihai;`。

### 2. `server-rs/src/worlds/mod.rs`
- 末尾模块列表追加 `mod xingjichuanqi2; mod jialebi; mod shenghua3; mod jishujing; mod baisun; mod bihai;`。
- 新增 6 个世界 id 常量（值如上表，如 `WORLD_XINGJICHUANQI2="xingjichuanqi2"` 等）。
- 新增 6 个 `WorldData`（`static XINGJICHUANQI2 / JIALEBI / SHENGHUA3 / JISHUJING / BAISUN / BIHAI`）：`difficulty` 均=2；`initial_scene` 按上表；`floors/floor_names/points/enemies/npcs/zones/portals/gates` 全部引用各 world 文件导出静态表 + `*_FLOOR_NAMES`。
- `WORLDS` 表末尾追加 `&XINGJICHUANQI2, &JIALEBI, &SHENGHUA3, &JISHUJING, &BAISUN, &BIHAI`（现共 **54** 世界）。
- `GW_PORTALS` 追加 6 个（from `WORLD_ZHUTIAN`，`(31,65)..(31,70)`，落点=各副本出生点 P，`available:true`）：
  - `gw_xingjichuanqi2`：(31,65) → xingjichuanqi2 F0 (5,4)
  - `gw_jialebi`：(31,66) → jialebi F0 (5,4)
  - `gw_shenghua3`：(31,67) → shenghua3 F0 (5,4)
  - `gw_jishujing`：(31,68) → jishujing F0 (20,22)
  - `gw_baisun`：(31,69) → baisun F0 (8,3)
  - `gw_bihai`：(31,70) → bihai F0 (20,5)

### 3. `server-rs/src/scenes.rs`（仅两个查询函数）
- `pub fn scene(id)`：or_else 链末尾各追加 1 项，检索：
  - `scenes_xingjichuanqi2::XJ2_SCENES`、`scenes_jialebi::JIALEBI_SCENES`、`scenes_shenghua3::SH3_SCENES`、`scenes_jishujing::JISHUJING_SCENES`、`scenes_baisun::BAISUN_SCENES`、`scenes_bihai::BIHAI_SCENES`
- `pub fn fight_cfg(id)`：or_else 链末尾各追加 1 项，检索：
  - `scenes_xingjichuanqi2::xingjichuanqi2_figths()`、`scenes_jialebi::jialebi_figths()`、`scenes_shenghua3::shenghua3_figths()`、`scenes_jishujing::jishujing_figths()`、`scenes_baisun::baisun_figths()`、`scenes_bihai::bihai_figths()`

各场景数组/战斗函数名确认（均存在）：

| slug | 场景数组 | 战斗函数（+辅助） |
|---|---|---|
| xingjichuanqi2 | `XJ2_SCENES` | `xingjichuanqi2_figths()`（另有 `xj2_fight_cfg`） |
| jialebi | `JIALEBI_SCENES` | `jialebi_figths()`（另有 `jb_fight_cfg`） |
| shenghua3 | `SH3_SCENES` | `shenghua3_figths()`（另有 `sh3_fight_cfg`） |
| jishujing | `JISHUJING_SCENES` | `jishujing_figths()`（另有 `jj2_fight_cfg`） |
| baisun | `BAISUN_SCENES` | `baisun_figths()`（另有 `bs_fight_cfg`） |
| bihai | `BIHAI_SCENES` | `bihai_figths()`（另有 `bh_fight_cfg`） |

> 注：注册统一走 `*_figths()` 标准分发（与既往各批一致）；各副本自带的 `*_fight_cfg` 查询辅助保留，供其他查询路径使用。

## 四、首次编译错修复（只改 6 新副本的文件）

`cargo check --all-targets` 首次报 4 处 error（均在新副本文件内，本代理授权修复）：

1. `scenes_bihai.rs` BOSS 战 `win: boss_win` —— `FightCfg.win` 类型为 `fn(&GameState)->String`（不可变），而 `boss_win(&mut GameState)` 是可变参与者。按既有先例（baisun/tongqu）改为不可变闭包：`win: |_st| "bh_end_choice".to_string()`。mutating 结局仍走 `boss_act`→`boss_win(&mut)`（HP≤0 时 `boss_act` 调 `boss_win` 写 points/flag/grade 并返回 `bh_end_choice`）。
2. `scenes_jishujing.rs` BOSS 战 `win: boss_win` —— 同上，改为 `win: |_st| "jj2_end_flee".to_string()`。
3. `scenes_jialebi.rs:369` `Route::Dyn(route_boss_start)` —— 该函数不存在，正确名为 `start_boss`（同文件的 BOSS 手电路由）。改为 `Route::Dyn(start_boss)`。
4. `scenes_bihai.rs:158` `reward_why: "直面·\u0026选择深渊邪物的收场"` —— Rust 不支持 `\uXXXX`（不带花括号）转义，报「incorrect unicode escape sequence」；改为字面 `&`：`"直面·&选择深渊邪物的收场"`。

修复后再跑 `cargo check --all-targets` **0 错**，`Finished`，`$LASTEXITCODE=0`。剩余均为各源文件既有 warning（dead_code / unused_variables / non_snake_case 等，不阻断编译），非本批引入。

## 五、cargo test --release 结果

`cargo test --release --no-fail-fast`：**全量 199 项测试，全部 passed，0 failed**，`$LASTEXITCODE=0`。

6 新副本 `tests/*_flow.rs` 各 target 均全绿：

| 测试 target | 通过 |
|---|---|
| `tests/baisun_flow.rs` | **4 passed** |
| `tests/bihai_flow.rs` | **3 passed** |
| `tests/jialebi_flow.rs` | **3 passed** |
| `tests/jishujing_flow.rs` | **3 passed** |
| `tests/shenghua3_flow.rs` | **3 passed** |
| `tests/xingjichuanqi2_flow.rs` | **3 passed** |

其余既有全量（含 `playthrough::full_playthrough_axe_all_sidequests`、装备深化兑换 `nexus_exchange` 6 项、原著人物接入相关）本次**全绿，无 flaky 失败**（无需重跑）。`baisun_flow.rs` 含规则流场景存在性断言（bs_00 / 三 hub / bs_10/11/12 / bs_boss HP=150 / 战斗表恰 1 场），全部通过，佐证 baisun env 降级后剧情线仍完整可解析。

## 六、cargo build --release 结果

`cargo build --release`：**成功**，`$LASTEXITCODE=0`，产出 release 二进制。未部署。

## 七、遗留

- 5 个非 baisun 副本的 `kind:"env"` zone（bihai ×2、xingjichuanqi2/jialebi/shenghua3/jishujing ×1）未降级——按授权仅允许 baisun.rs 的 env 处理；它们编译/运行不崩，但交互层面 env zone 的 attack 会落 generic 战斗（非剧情场景）。**如需统一降级为 `puzzle` 或接入真正的 env 机制，留待主线/后续批处理**。
- 若干既有 dead_code / unused 警告，预先存在，非本批引入。
- 未部署前端；本批未触碰 engine/state/defs/items/combat/skills 与既有副本。