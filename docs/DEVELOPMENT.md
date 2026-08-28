# docs/DEVELOPMENT.md —— 开发工作流

> 给全新接手者的「怎么干活」文档。从「加一个新副本」到「构建、测试、push」全流程 + 红线 + 已知遗留。
> 前置：先读根 `README.md`（项目全貌 + 11 条用户铁律）+ `server-rs/src/README.md`（三件套 + 命名）/ `design/README.md`（设计库）。

---

## 一、环境

| 工具 | 用途 | 路径（本机实测） |
|------|------|------------------|
| Rust 工具链 | 编译引擎 | `C:\Users\GWL\.cargo\bin\cargo.exe` / `rustc.exe` |
| Node.js | 生成/测试脚本 | `C:\Program Files\nodejs\node.exe` |
| Python | 素材生成/抠图（部分需 numpy） | `python`（WindowsApps）或专用 `D:\ai_vllm_env\Scripts\python.exe` / `python_embeded` |
| ffmpeg | 视频抽帧 | `C:\Windows\ffmpeg.exe` |
| git | 版本控制 | `D:\Git\cmd\git.exe` |

系统 WebView2（Win10/11 自带）用于运行 GUI。可执行文件：`server-rs/target/release/wuxian-horror-ch1.exe`。

---

## 二、加一个新副本（开副本全流程）

副本 = **三件套 + 注册 + 调试 + 测试 + 补文档**。以加一个名为 `<slug>`（如 `wulin`）的副本为例。

### 第 1 步：写副本设计（内容铁律见根 README §二）

1. 查对应 zhttty 作品调研 `design/zhttty_universe/<work>/00_<work>_research.md` + 官方人物卡 `characters_reference_official.md`，核实剧情/人物名（不确定标「待补」，**绝不臆造**）。
2. 照 `00_INDEX.md` §1.2 十节模板写副本设计 `<work>/<slug>.md`。
3. 遵守铁律：开放剧情/世界展示；个别可原创但标注；无真相线/阴谋论，《无限未来》设定废稿（位面保留）。

### 第 2 步：生成三件套骨架（自动化）

```bash
cd tools
node gen_dungeons.mjs      # 生成 src/worlds/<slug>.rs + src/scenes_<slug>.rs + tests/<slug>_flow.rs + tools/design/<slug>_impl_log.md
# 若 slug 已在生成表里会跳过；也可手写副本文件后手动注册
```

生成器会按 `D` 表（slug/SLUG/prefix/world名/BOSS/HP/dmg/层数/钩子）产出 6 表世界数据 + `scenes` DSL + 一个 flow 测试骨架。**产物是骨架，BOSS 数值/剧情/调查点是模板占位，需人工按设计补全**。

### 第 3 步：注册（3 处文件）

**方式 A——脚本**：
```bash
node tools/gen_register.mjs   # 自动写 lib.rs + worlds/mod.rs（mod/常量/WorldData static/WORLDS 数组）
```
脚本会跳过已存在项；且 **GW_PORTALS 网关、scenes.rs 的 fight_cfg or_else 需人工补**（脚本已留注释）。

**方式 B——手工（推荐理解机制后手动）**，注册 3 文件：
1. `server-rs/src/lib.rs`：追加 `pub mod scenes_<slug>;`。
2. `server-rs/src/worlds/mod.rs`：
   - 顶部 `mod <slug>;`
   - `pub const WORLD_<SLUG>: &str = "<world_id>";`
   - `static <SLUG>: WorldData = WorldData { id, name, difficulty, initial_scene, floors, floor_names, points, enemies, npcs, zones, portals, gates };`（各表引用 `<slug>::POINTS` 等）
   - `WORLDS` 数组加 `&<SLUG>,`
   - 若需主神可达：`GW_PORTALS` 加 `WorldGateway { id:"gw_<slug>", from_world:WORLD_ZHUTIAN, …, to_world:WORLD_<SLUG>, available:true }`
3. `server-rs/src/scenes.rs`：
   - `scene(id)` 函数链补 `     .or_else(|| crate::scenes_<slug>::<SLUG>_SCENES.iter().find(|x| x.id==id))`
   - `fight_cfg(id)` 补 `     .or_else(|| crate::scenes_<slug>::<slug>_figths().iter().find(|(k,_)| *k==id).map(|(_,v)| v))`

### 第 4 步：编译检查 + 补数值

```bash
cd server-rs
cargo check --all-targets     # 必跑，编译错引导补齐 scenes.rs or_else / worlds 字段
```

把骨架里的占位 BOSS/调查点/剧情换成你设计的真实内容（对照 `scenes_<slug>.rs` 里的 SceneDef/ChoiceDef/FightCfg）。注意动态难度：FightCfg 数值写的是**难度 1.0 基准值**，运行时由 `power.rs::scaled_fight` 按主角强度缩放，勿手动改表去适配玩家强度。

### 第 5 步：测试

```bash
cargo test --release --no-fail-fast        # 全量，含你新加的 <slug>_flow.rs
# 或用 GUI 冒烟（需已 build release）
node ../tools/e2e_smoke_test.mjs
node ../tools/gateway_check.mjs            # 若加了跨世界网关
```

补全 `<slug>_flow.rs` 覆盖：进副本→移动→交互（调查点/NPC/门禁）→战斗→结算断言（flag/points/伤害）。

### 第 6 步：补素材 + 文档

- 副本背景/敌人立绘放 `server-rs/ui/assets/img/`（`bg_<slug>*.png` / `enemy_<slug>.png`），配音 `assets/audio/vo_<slug>*.wav`；账目记入 `tools/design/material_decision_log.md`。
- 写 `tools/design/<slug>_impl_log.md`（实现了什么/数值/外部依赖）。

### 第 7 步：合并 + push

见「三、合并」与「四、构建/测试/发布」。

---

## 三、合并（多子代理并行时的合并约定）

项目工作流会**多开子代理并行**（见 `CLAUDE.md`）。合并约定：

1. 每个子代理只写自己负责的**新文件**（副本三件套 + impl_log + 素材），尽量不改共享文件（lib.rs / worlds/mod.rs / scenes.rs —— 注册交给主线统一收口）。
2. 子代理回落时，主线用 `tools/gen_register.mjs` 或手工统一做 3 文件注册，避免并发写冲突。
3. 合并顺序参考：`merge_batch6_log.md` / `z_merge_batch*_log.md`（历史批次合并日志）。
4. 合并后 `cargo check --all-targets` + `cargo test --release` 全绿才算合并成功。

---

## 四、构建 / 测试 / 发布

```bash
# 构建（release，含前端打包）
cd server-rs
cargo build --release
# exe: server-rs/target/release/wuxian-horror-ch1.exe

# 测试（引擎全量）
cargo test --release --no-fail-fast

# 前端 JS 语法检查（改 ui/js/*.js 后）
node --check server-rs/ui/js/client.js
node --check server-rs/ui/js/world2d.js
node --check server-rs/ui/js/zone3d.js

# GUI 冒烟（需已 build）
node tools/e2e_smoke_test.mjs

# 发布到远端（origin=dHR-P/wuxian-lunhui，分支 master）
git add -A
git commit -m "<说明>"
git push origin master
```

---

## 五、红线（不可违，用户铁律 + 工程约束）

1. **不改交互契约**：`window.World2D` / `window.Zone3D` 对外方法、Tauri `invoke` 命令、`DSH_BOOT` 契约——只允许**新增**（如 `setDpr`/`setResolution`），不允许改签名/删除。
2. **副本只写新文件**：新副本用三件套独立文件，共享注册文件（lib.rs / worlds/mod.rs / scenes.rs）交主线收口，避免与并行子代理冲突。
3. **部署由主线验收**：只有主线能定稿部署/合并/push；子代理产物交主线整合与验收。
4. **不改动态难度表数值去适配玩家**：FightCfg 写难度 1.0 基准，缩放交给 power.rs。
5. **不改归档 `tools/design/canon/` 权威设定 JSON**（引擎/文档引用）。
6. **剧情铁律**（见根 README）：副本来源以原著+社区拓展、原创须标注、人物名核实、开放世界无阴谋论、《无限未来》废稿位面保留。
7. **模型约束**：编程/文字子代理 `tokenrhythm/deepseek-v4-flash-0731`，识图 `tokenrhythm/glm-5.3-flash`（带前缀会 MODEL_NOT_AVAILABLE），生图 wan2.7-image。
8. **`game/` 为废弃静态原型，勿动勿用于开发**；一切以 `server-rs/ui/` 为准。

---

## 六、已知遗留（接手时可接续的 TODO）

从 `tools/design/resolution_quality_log.md` 等文档汇总：

1. **bloom 未做**：three.min.js 内置无 post-processing bloom，需要额外库（触及「不引外部库」红线），有待单独评估是否集成 UnrealBloomPass。
2. **体积光/体积雾未做**：three.min.js 传统方案成本高，现用 Fog + 点光。
3. **gen_dungeons 生成表**：`tools/gen_dungeons.mjs` 的 `D` 表涉及 ~26 副本，生成器对已存在的跳过；新副本需手动加入 D 表或手工三件套。
4. **gen_wan.py**：多份设计文档（`docs/GAME_DESIGN.md`）提及 `tools/design/gen_wan.py`（wan2.7-image），但磁盘未见该文件——实际生图走本地 ComfyUI Z-Image 的 `gen_pc_sprite.py`/`gen_enemy_sprites.py`/`gen_zimage_batch.py`。如需 wan2.7-image 管线需重建该脚本（见 `material_decision_log.md` 生图引擎切 wan 的记录）。
5. **GW_PORTALS 自动插入**：`gen_register.mjs` 对 GW_PORTALS 只写注释不自动插（字段需确认），新增副本的网关要手动补。
6. **历史工具**：`tools/README.md` §8 标注的疑似废弃脚本（`argprobe.ps1`/`probe_col.ps1`/`click_probe.ps1`/`test_flow.ps1`/`ox_probe429.mjs`/`ox_cine_qc.mjs`）未删，待人工确认。
7. **素材归档**：`tools/maps_gen.txt`、`ox_raw_responses*.json`、`vid_*.txt`/`cine_*.txt` 等待人工决定归档时机（见 `tools/README.md` §7）。
