# 无限轮回 · Wuxian Lunhui

以 zhttty「无限」系列为原型的 **无限流 Z 宇宙箱庭游戏**（主神空间 + 56 任务副本 / 57 世界）。

> 本文档是项目**总入口**。建议接手顺序：
> 1. 本文档（项目全貌 + 用户铁律 + 技术栈 + 构建）
> 2. `docs/DEVELOPMENT.md`（开发工作流、红线、已知遗留）
> 3. `design/README.md`（设计库结构）
> 4. `server-rs/README.md` + `server-rs/src/README.md` + `server-rs/ui/README.md`（代码分层）
> 5. `tools/README.md`（工具脚本）

---

## 一、项目是什么

玩家被主神选中进入轮回：在主神空间兑换强化（基因锁 / 血统 / 修真 / 技能 / 装备 / 法宝 / 合成），再通过跨世界传送门进入一个个任务世界副本。**世界之间无固定先后顺序**，副本敌人强度随主角当前强度与副本难度系数**动态缩放**。

当前形态：**Tauri v2 桌面应用**（Rust 引擎 `server-rs/` + WebView 前端 `server-rs/ui/`）。官方可执行文件 `server-rs/target/release/wuxian-horror-ch1.exe`，依赖系统 WebView2（Win10/11 自带）。

### 已实现规模（以磁盘实测为准）

| 类别 | 数量 | 说明 |
|------|------|------|
| 任务副本（世界） | **56 副本**（`tools/design/` 56 份 `*_impl_log.md` 对账）；编译期 `src/worlds/` 按副本分文件、`WORLDS` 注册表 54 项、`scenes_*` 模块 55 个、`tests/*_flow.rs` 55 个 | `server-rs/src/worlds/` |
| 技能 | **146** | `skills_data.rs` `SKILLS` 表 |
| 武器 | **20** | `items_data.rs` `WEAPONS` |
| 护甲/饰品/法宝装备 | **17** | `items_data.rs` `GEAR`（GearDef） |
| 道具 | **30** | `items_data.rs` `ITEMS` |
| 合成配方 | **8** | `items_data.rs` `RECIPES` |
| 血统 | **9** | `combat_data.rs` `BLOODLINES` |
| 基因锁 | 4 阶 | `GENE_STAGES` |
| 修真境界 | 7 阶 | `CULTIVATION_STAGES`（练气~合道） |
| 配音 | **98 条 wav** | `server-rs/ui/assets/audio/` |
| 背景/立绘 | **128 张 png** | `server-rs/ui/assets/img/`（含 bg + 敌人立绘 + NPC + BOSS） |
| 视频过场 | **9 条 mp4** | `server-rs/ui/assets/video/` |
| 集成测试 | **60+ 个 flow / 100+ 用例** | `server-rs/tests/` |

> 实际运行资源占用极低：**~695MB 内存 + <200MB 显存**，画质可激进提升（见 `tools/design/resolution_quality_log.md`）。

---

## 二、用户核心要求铁律（接手者必读，勿违）

以下为本项目的**设计铁律**，任何开发/扩展都必须遵守：

1. **主线 = 无限世界**：主神空间 + 轮回是主线框架；各 zhttty 作品 = 多元宇宙中的位面副本。世界观与剧情都嵌套在「主神空间」里展开。
2. **副本来源**：以 zhttty 原著 + 社区拓展为主（恐怖片世界、各作品位面），**个别可原创但必须标注**「原创致敬/原创」；不凭空编造设定；剧情人物名以官方百科 / 萌娘百科核实为准，不确定的标「待补」，**绝不臆造**。
3. **剧情开放、世界展示为主**：不要真相线 / 阴谋论副本，不要有明确指向意义的剧情。调查点 = 奇观 / 风物；结局开放、多分支、无对错。
4. **《无限未来》**：官方 + 社区确认为**废稿**，其剧情设定废弃（见 `tools/design/infinite_future_removal_log.md`）；但**已实现的副本保留**当多元宇宙位面——末世死城（`moshi`）、盒壁层（`hezi`）、星际舰船（`xingjijianchuan`）。这些世界观位面看得到、进得去。
5. **动态难度缩放**：敌人强度 = 主角当前强度 × 副本难度系数（非线性、副本无前后关系、可随意进入、可增强可削弱）。具体系数见 `server-rs/src/power.rs`（`difficulty 1→0.8 / 2→1.0 / 3→1.3 / 4→1.6 / 5→2.0`；`power_factor = clamp(power/25, 0.6, 4.0)`）。
6. **数量目标**：50+ 副本（已达 56）、上百种强化（技能 146 / 武器 20 / 护甲 17 / 法宝 12 / 血统 9 / 配方 8）。
7. **战斗方式多样化**：刀战 / 枪战 / 激光 / 魔法 / 修真 / 仙侠 / 拳脚都要有对应的攻击表现（前端 `zone3d.js` `weaponStyle()` 映射为 gun/laser/magic/melee/unarmed）。
8. **视觉**：MC 体素风格（地图体素 + 战斗三人称体素人），支持 **720p / 1080p / 1440p** 三档分辨率 + HiDPI（`window.setResolution / getResolution`）。16G 内存 + 8G 显存预算内画质可激进（实测仅 ~700MB 内存 + <200MB 显存）。
9. **素材越丰富越细致越好**：插图 / 地图 / 立绘 / 音效 / BGM / 视频都要充足。
10. **测试**：全遍历覆盖所有可控制面（移动 / 战斗 / 设置 / 装备 / 地图切换 / 面板 / 场景交互 / 人物交互 / 强化条目）。
11. **模型约束**（子代理协作硬约束）：
    - 编程 / 文字子代理：只能用 `tokenrhythm/deepseek-v4-flash-0731`（与主线同模型）；
    - 识图 / 视觉质检子代理：只能用 `tokenrhythm/glm-5.3-flash`（`glm-5.3-flash` 已原生支持图片输入；`qwen3.7-flash` / `ox-alpha` 为历史/备选；glm-5.3-flash 调用不带 `tokenrhythm/` 前缀）；
    - 生图：`tokenrhythm/wan2.7-image`（`tools/design/gen_wan.py` 设计稿提及；实际生图走本地 ComfyUI Z-Image 的 `gen_pc_sprite.py` / `gen_enemy_sprites.py` / `gen_zimage_batch.py`）。

---

## 三、技术栈

- **Tauri v2** + **Rust 2021**（引擎 / 状态机 / 场景 DSL / 战斗 / 动态难度 / 测试）
- **Three.js**（`zone3d.js`，三人称 3D 体素战斗）+ **Canvas2D**（`world2d.js`，体素 2D 俯视地图）+ **WebView2**
- 后端依赖极简：`tauri`、`serde`、`serde_json`、`rand`（见 `server-rs/Cargo.toml`）
- 素材本地管线：wan2.7-image / Z-Image 生图、MiniMax-H3 文生视频、Qwen3-TTS 语音、WebAudio 合成音效与 BGM

### 运行时架构

```
Tauri v2（Rust）                        WebView（前端 JS）
┌────────────────────────┐              ┌──────────────────────────────┐
│ main.rs  Tauri 命令层   │──invoke──▶  │ client.js  IPC 桥接 / 渲染     │
│ engine.rs 战斗/结算      │◀──render── │ world2d.js  2D 体素地图 (Canvas)│
│ scenes*.rs 剧本 DSL     │             │ zone3d.js  3D 三人称战斗 (Three)│
│ state.rs GameState 存档 │             │ index.html  页面结构            │
│ worlds/ 世界数据 6 表    │             └──────────────────────────────┘
│ power.rs 动态难度缩放    │
│ *data.rs 数据表(定义)    │
└────────────────────────┘
 逻辑与状态权威全在 Rust 侧，前端只渲染视图模型。
```

---

## 四、目录总览

```
wuxian-horror-ch1/
├── README.md                  ← 本文件（总入口 + 铁律 + 构建）
├── TEST_REPORT.md             ← 历史全量测试报告（开放世界版）
├── server-rs/                 ← Tauri+Rust 引擎 + WebView 前端（当前活动版本）
│   ├── Cargo.toml / Cargo.lock / tauri.conf.json / build.rs
│   ├── src/                   ← Rust 引擎源码（见 server-rs/src/README.md）
│   ├── worlds/                ← 各副本世界数据（6 表）
│   ├── tests/                 ← 60+ 集成测试（每副本一个 *_flow.rs）
│   ├── gen/                   ← 生成 schemas
│   └── ui/                    ← 前端（index.html / world2d.js / zone3d.js / client.js / assets）
├── design/                    ← 设计库（zhttty 原著研究 + 副本设计 + 官方人物卡）
│   └── zhttty_universe/       ← 7 部作品调研 + 副本设计 + characters_reference_official.md
├── tools/                     ← 生成 / 测试 / 质检 / 素材管线脚本
├── game/                      ← 【旧版】纯静态 HTML 单页原型（已废弃，勿改勿用）
├── docs/                      ← GAME_DESIGN.md（早期） + DEVELOPMENT.md（开发工作流）
└── .gitignore
```

> ⚠️ **`game/` 是历史遗留的静态 HTML 单页原型**（只有 12 张图/6 条 wav，无 world2d/zone3d），当前真项目是 **`server-rs/ui/`**。开发、测试、素材一律以 `server-rs/ui/` 为准，不要动 `game/`。

---

## 五、构建

前置：Rust 工具链（cargo/rustc）+ Node.js（前端脚本/CDP）+ 系统 WebView2（Win10/11 自带）。

```bash
cd server-rs
cargo build --release           # release 构建
# 可执行文件：server-rs/target/release/wuxian-horror-ch1.exe
```

构建产物即前端静态面（`tauri.conf.json` 的 `frontendDist: "./ui"`），`cargo build` 会一起打包前端资源。

---

## 六、测试

```bash
cd server-rs
cargo test --release --no-fail-fast     # Rust 全量单元 + 集成测试（含 60+ 副本 flow）
cargo check --all-targets               # 快速编译检查（注册新副本后必跑）

# CDP 端到端 GUI 冒烟（需先构建 release 并启动游戏；脚本会自己拉起进程）
node ../tools/e2e_smoke_test.mjs        # 7 项 UI 冒烟：新局/移动/地图切换/战斗/分辨率/面板/装备兑换

# 其他 GUI 级测试（均自动拉起 exe 并驱动 CDP 端口 9702）
node ../tools/flow_cdp.mjs              # 全章节 GUI 流程（生化主线终点→主神空间）
node ../tools/world_flow.mjs            # 开放世界地图流程
node ../tools/gateway_check.mjs         # 跨世界网关验收（主神→各副本落点）
node ../tools/shot_fight_3d.mjs         # 3D 战斗连拍（截图到 tools/artifacts/shots/）
```

详细脚本清单见 `tools/README.md`。

---

## 七、仓库

- 远程：`git@github.com/dHR-P/wuxian-lunhui.git`（origin，分支 `master`）
- push：`git add -A && git commit -m "..."`，再 `git push origin master`。

---

## 声明

本项目为对 zhttty「无限」系列作品的同人致敬 / 学习向箱庭游戏复刻，世界观、人物、恐怖片世界名均参考原著与公开百科资料。剧情人物设定以公开资料为准，如有出入以原著为准。
