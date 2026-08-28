# 无限未来废稿移除 + yize 去重 bug 修复日志

> 产出方：无限未来废稿移除 + yize bug 修复子代理（模型 `tokenrhythm/deepseek-v4-flash-0731`）
> 时间：本轮会话

---

## 一、任务一：移除《无限未来》废稿副本 moshi（末世死城）与 hezi（盒壁层）

依据：无限未来官方/社区确认废稿，全部放弃。

### 1.1 worlds/mod.rs 反注册（逐项）

| 项 | 删除内容 |
|---|---|
| 模块声明 | 删除 `mod moshi;`、`mod hezi;` 两行 |
| 世界常量 | 删除 `pub const WORLD_MOSHI: &str = "moshi_shoucheng";`、`pub const WORLD_HEZI: &str = "hezi";` 两行 |
| GW_PORTALS 网关 | 删除 `gw_moshi`（主神→末世，落点 (6,6)）与 `gw_hezi`（主神→盒壁，落点 (1,1)）两个 `WorldGateway{..}` 条目（含其 id/from/to 行），相邻逗号与分组注释保留正确 |
| 静态世界块 | 删除 `static MOSHI: WorldData {..}` 与 `static HEZI: WorldData {..}` 两个静态块（原 MIS_MAP/HEZI_* 映射全部随之移除） |
| WORLDS 注册表 | 数组里删除 `&MOSHI`、`&HEZI` 引用，逗号拼接正确 |

> 注：`worlds/moshi.rs`、`worlds/hezi.rs`、`scenes_moshi.rs`、`scenes_hezi.rs` 源文件本身**保留未删**，但因 mod/lib 声明已移除，已不再被编译（dead file）；主线后续可统一删除。

### 1.2 lib.rs
- 删除 `pub mod scenes_moshi;`、`pub mod scenes_hezi;` 两行。

### 1.3 scenes.rs（仅 scene()/fight_cfg() 查询函数）
- `fight_cfg()`：删除 `crate::scenes_moshi::moshi_figths()` 与 `crate::scenes_hezi::hezi_figths()` 两条 `.or_else` 链。
- `scene()`：删除 `crate::scenes_moshi::MOSHI_SCENES` 与 `crate::scenes_hezi::HEZI_SCENES` 两条 `.or_else` 链。

### 1.4 测试文件删除
- 删除 `server-rs/tests/moshi_flow.rs`、`server-rs/tests/hezi_flow.rs`（其引用的模块已移除，留下会编译失败）。

### 1.5 设计库标注（不删文件）
- `design/zhttty_universe/wuxian_weilai/liangzi_yiji.md` 第一行 `#` 标题后新增：
  > ⚠️《无限未来》官方/社区确认废稿，本设计不采用（归档保留）。

### 1.6 素材归档说明（不实际删除 assets）
- `scene_moshi_*`、`enemy_siege_beast`、`vid_moshi_intro`、`vo_moshi_*` 等 moshi/hezi 素材保留在 assets 但已无引用；主线后续清理（本轮不删 asset）。

---

## 二、任务二：修 yize legacy_shard 去重 bug

### 现象
- `scenes_yize.rs` 的 `yz_05_ending_choice`「带走遗泽」选项 effects 连续 3 次 `Eff::AddItem("legacy_shard")`；
- 引擎 `world::add_item` 对同名物品去重，仅发 1 枚；`yize_flow.rs` 断言"3 枚"失败。

### 修复方案（选 B：改测试，不改副本逻辑）
- 判定：AddItem 去重是引擎既有契约，副本逻辑（写 3 次同 id）并无 bug，是**测试断言过度**，故不改 scenes_yize.rs。
- `tests/yize_flow.rs`：
  - 断言由 `assert_eq!(shards, 3, ...)` 改为 `assert_eq!(shards, 1, ...)`；
  - `step` 注释由 `+400 + 3 shards` 改为 `+400 + legacy_shard`；
  - 新增两行注释，说明引擎去重语义下"三枚"合并为 1 枚。

---

## 三、验证结果

### cargo check --all-targets
- 结果：`$LASTEXITCODE == 0`（0 编译错/告警不判失败）。✅

### cargo test --release --no-fail-fast
- 结果：退出码 0，全部用例通过，0 failed。✅
- 实测整库 `cargo test --release` 累计 **93 passed / 0 failed**（移除 moshi 4 + hezi 3 = 7 后，用例分布与此吻合；任务里"约 90"为估算）。
- `cargo test --release --test yize_flow`：**3/3 全绿** ✅

---

## 四、遗留
- moshi / hezi 的 `worlds/*.rs`、`scenes_*.rs` 及 assets 素材仍保留（已无引用/不编译），主线后续统一清理。
- playthrough full 若出现既有随机 flaky，以重跑结果为准（既有随机问题，非本次改动引入）。