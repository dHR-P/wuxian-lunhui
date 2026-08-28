# 文档回填方案 ·《无限轮回 第一章 生化蜂巢》(Z 宇宙超大型箱庭)

> 子代理角色：`tokenrhythm/deepseek-v4-flash-0731`，「文档回填方案」一级子代理。
> 任务范围：**只盘点 + 产出回填方案**，不改任何正稿文档。唯一产出本文档 `tools/design/doc_backfill_plan.md`。
> 依据快照（已在读取时逐一核对原文）：README.md(100 行)、TEST_REPORT.md(102 行)、tools/design/material_decision_log.md(152 行)、tools/design/wan_prompts.md(65 行)、tools/design/multi_world_framework.md(507 行)、design/zhttty_universe/00_INDEX.md 与 00_ENGINE_CONTEXT.md、docs/GAME_DESIGN.md(99 行)。
> 并行依赖：A1 子代理（wan2.7-image 重生成定稿）、A2 子代理（Rust 多世界框架 P0 实现）。素材定稿最终结论处用 `{{A1_PENDING:...}}` 占位；P0 实现验收结果处用 `{{A2_PENDING:...}}` 占位。

---

## 0. 结论速览（一页纸）

- **改动手数统计**：素材 7 处（高 5 / 中 2）+ 设计库 3 处（高 2 / 中 1）+ 引擎 4 处（高 2 / 中 2）+ GAME_DESIGN 修旧 2 处（低 2）= **共 16 处**（高 9 / 中 5 / 低 2）。
- **核心发现 1（素材口径已整体过时）**：README 与 TEST_REPORT 的素材/质检描述停留在 **ComfyUI + Z-Image bf16 + ox-alpha** 旧口径；material_decision_log 已切到 **tokenrhythm wan2.7-image + qwen3.7-flash 识图子代理 + floodfill 抠图**，且判定 **pc_wan3 / hunter_wan2 需重生成（未部署）**、**zombie / guard 建议 wan 重生成、licker / horde 保留 v2 旧档**。三处现状与最新结论存在整体差距。
- **核心发现 2（设计库「零引用」）**：README 与 TEST_REPORT 均**未引用** `design/zhttty_universe/`（25 文件：00_INDEX + 00_ENGINE_CONTEXT + 7 调研 + 15 副本 + 辅助），与「Z 宇宙超大型箱庭」定位脱节，必修。
- **核心发现 3（引擎 P0 无章节）**：README/TEST_REPORT 均无多世界框架章节，`multi_world_framework.md`（P0 范围：WorldData/WORLDS/find_world/显式 world 查询/存档迁移）未有任何落地描述，需补章节。
- **核心发现 4（GAME_DESIGN 落后待修旧，非新建）**：`docs/GAME_DESIGN.md` 存在（99 行），但描述的是**旧「纯静态 HTML5 单页应用」形态**（localStorage、Ollama gemma4:e4b 质检、Z-Image 1344×768 生图），与当前 Rust + Tauri + 开放世界 + wan2.7-image 形态完全不符。任务要求的「需新建或并入 README」在现实演化为**「需修旧或并入 README」**，见 §4。

---

## 1. 盘点现状

### 1.1 素材相关现状（README / TEST_REPORT vs material_decision_log 最新）

| 现状位置（原文） | 现状表述 | material_decision_log 最新事实 | 差距 |
|---|---|---|---|
| README L83「## 素材管线（全部本地 AI 生成）」 | 标题本身无误 | — | — |
| README L85-88 表格「场景/立绘/敌人」行 | 工具=`ComfyUI + Z-Image bf16 (port 8188, 1344×768, 中文prompt)`，数量 24 张，质检=`openrouter/stealth/ox-alpha 逐张通过` | wan 切换：生图改走 `tools/design/gen_wan.py` → tokenrhythm wan2.7-image（768×1024，0.2 元/张）；质检改 qwen3.7-flash 识图子代理 | 工具名 / 解析度 / 质检方全变，需回填 |
| README L90「敌人立绘精灵」行 | `ComfyUI + Z-Image bf16（纯黑背景 BLACK_BG 配方，768×1024）+ cutout_enemy.py v1 抠图`，5 张（zombie/horde/licker/guard/hunter），`ox-alpha 逐张通过（16px 棋盘格预览防 RGB 黑误判）` | BLACK_BG 配方 Z-Image 系 11+7 轮翻车已弃用；现 wan2.7-image + rim light；抠图实际改用 **floodfill**（material 日志 L80/L112 用 floodfill，正文工具行 README 仍写 cutout_enemy.py v1 距离法）；**缺主角立绘 pc_zhengzha 一行**；四旧档结论：zombie/guard **建议 wan 重生成**、licker/horde **保留 v2 旧档** | 配方 / 工具 / 质检 / 条目数全变；主角立绘缺行；四旧档结论缺失 |
| README L93「生成纪律遵循 rules/short-drama.md：...ox-alpha 评估...」 | ox-alpha 评估 | qwen3.7-flash 识图子代理替代 ox-alpha 做视觉质检（material L81/L88/L113） | 质检方过时 |
| README L95-100「敌人立绘精灵化管线」小节 | 背景配方「纯黑背景（BLACK_BG）唯一可靠基底」、`cutout_enemy.py v1 单色欧氏距离法`、`ox_enemy_qc.mjs` 调 stealth/ox-alpha 5 项判据 | BLACK_BG 稳定结论被 wan 挑战（Z-Image 深色主体像素无解）；抠图 wan 轮改 floodfill（T16/seal2/hole-channel6 等）；质检改 qwen3.7-flash（5 项判据沿用） | 配方 / 抠图法 / 质检执行方更新 |
| TEST_REPORT L68-76「2.6 敌人立绘精灵化（本轮新增）」 | 背景配方 BLACK_BG 唯一、v1 距离法抠图、make_enemy_previews→ox_enemy_qc 5 项判据、enemy_sprite_screenshot + ox_fightshot_qc | 同上：wan 引擎切换 + floodfill + qwen；且 2.6 未列 pc_zhengzha 主角立绘与四旧档结论 | 同上，需回填最新结论 |
| TEST_REPORT L100「交付物清单」 | `README.md：已更新玩法表（跨点支线耦合行）+ 测试行` | — | 交付物应补 wan_prompts / material_decision_log / doc_backfill_plan 引用 |

### 1.2 设计库引用现状

| 位置 | 现状 | 结论 |
|---|---|---|
| README 全文 | 无任何 `design/zhttty_universe/` 引用 | **缺失**，需新增「Z 宇宙设计库」说明行/章节（含 25 文件、7 作品 / 15 副本、多世界线索） |
| README L3-4 顶部定位 | 仅描述「第一章 生化蜂巢 开放世界版」，未提 Z 宇宙超大型箱庭与设计库 | **缺失** |
| TEST_REPORT L97-102 交付物 | 只列 Rust 引擎 / tools / README，无设计库 | **缺失** |
| TEST_REPORT L3 版本头 | 无 Z 宇宙 / 设计库上下文 | **缺失**（可选补充） |

### 1.3 引擎（多世界框架）引用现状

| 位置 | 现状 | 结论 |
|---|---|---|
| README「架构」L36-55 | 仅单世界 server-rs 结构，无 `worlds/` 模块 / 多世界 | **缺失**，需新增「多世界框架（Z 宇宙部署）」章节，引用 multi_world_framework.md 并给出 P0 验收占位 |
| README「玩法 / 轮回记忆 / 测试」L29-81 | 无 WorldData / WORLDS / find_world / world_id 描述 | **缺失**，P0 后可补一行世界标识说明 |
| TEST_REPORT 全文 | 无多世界框架 / P0 章节 | **缺失**，需在版本头或 §2 后补 P0 实现章节（{{A2_PENDING}} 占位） |
| README L81 测试行 | 列出 cargo test / world_flow / gate_chain / reincarnation / coupling / world_elite / visual_check | P0 后应补迁移测试 / 新 `cargo test` 条目（{{A2_PENDING}}） |

### 1.4 补充发现

- **GAME_DESIGN.md 存在但落后**：位于 `docs/GAME_DESIGN.md`（非项目根），99 行，描述**旧静态 HTML 单页版**（L4 资产管线 Z-Image/Ollama gemma4:e4b、L89-93 纯静态技术形态、L98 生成纪律 gemma 质检），与当前 Rust/Tauri/wan2.7-image 完全不一致。material_decision_log L152「文档回填（README 90行、TEST_REPORT 2.6 节、GAME_DESIGN 视觉章节）」亦明确要回填 GAME_DESIGN 视觉章节。→ 需「修旧」而非「新建」。
- **README L90 与 material log 的 pc/猎杀者关系**：material log 的主角立绘 `pc_zhengzha`（=P 图，非敌人）与 `enemy_hunter`（猎杀者）目前**未在 README L90 条目体现**（README L90 只有 5 张 enemy 精灵，其中 hunter 对应 `enemy_hunter.png`；主角立绘 pc_zhengzha.png 无行）。回填需补一张「主角立绘」行或并入敌人立绘行上下文。

---

## 2. 回填方案（素材相关）

> 标注「贴 90 行附近」/「贴 68 行附近」= 建议插入/替换的物理位置。占位符必须等 A1 定稿后再回填最终值；草稿文案其余部分可立即粘贴。

### P1（高）README · 素材管线章节（约 L83-100）整体换成 wan 续篇

- ①位置：README L83「## 素材管线（全部本地 AI 生成）」至 L100（本章节尾）。
- ②草稿（替换 L83-100 的素材描述正文；L84 表格表头保留，表格行重写。可直接整段替换）：

```markdown
## 素材管线（本地 AI 生成：wan2.7-image 引擎, 质检验收见 tools/design/material_decision_log.md）

### 管线现状（wan 引擎，2026-08-26 切）

| 素材 | 工具/引擎 | 数量 | 现状 |
|------|-----------|------|------|
| 场景/立绘/敌人 | 原生 Z-Image bf16 系（旧 ComfyUI 基线, 1344×768）→ 已切 **tokenrhythm wan2.7-image**（`tools/design/gen_wan.py`, 768×1024, 0.2 元/张） | 24 张 | 场景/过场等已定稿；**深色主体立绘（主角/猎杀者/四旧档）走 wan 定稿流程**，见下 |
| 过场动画 | MiniMax H3 (port 8192, NVFP4+SageAttn2, 832×480×124f) | 5 段 | ox-alpha 抽帧校验通过（视频管线未切换） |
| NPC 语音 | Qwen3-TTS CustomVoice 0.6B（D:\ai_vllm_env） | 9 段 | 手动试听 |
| 敌人/主角立绘精灵 | **wan2.7-image**（纯黑背景 + 冷白 rim light 轮廓光, floodfill 抠图 `tools/design/cutout_*.py`）| 见下「立绘定稿状态」 | 质检 = qwen3.7-flash 识图子代理 |
| 3D 贴图 | Z-Image 平铺纹理（tex_wall/tex_floor） | 2 张 | ox-alpha 通过（非深色主体，未切 wan） |

> 生成纪律遵循 rules/short-drama.md：逐批生成 → 释放资源 → 识图子代理质检 → 通过再下一批。
> 质检执行方已由 ox-alpha **切换为 qwen3.7-flash 识图子代理**（material_decision_log 记录），判据沿用 5 项（全身完整居中/设定匹配/缺陷/透明/评级）。

### 立绘定稿状态（wan 流程 · 最终结论待 A1 补充）

| 立绘 | 引擎 | 定稿结论 | 线上部署 |
|------|------|----------|----------|
| pc_zhengzha（主角郑吒·健康青年战士） | wan2.7-image | {{A1_PENDING:pc_zhengzha 最终定稿结论（字节数/判定/是否通过重生成轮）}} | {{A1_PENDING:server-rs/ui/assets/img/pc_zhengzha.png 当前线上版本及字节数}} |
| enemy_hunter（猎杀者·无皮肤肌肉怪兽） | wan2.7-image | {{A1_PENDING:hunter 最终定稿结论（字节数/判定/是否通过重生成轮）}} | {{A1_PENDING:server-rs/ui/assets/img/enemy_hunter.png 当前线上版本及字节数}} |

### 敌人精灵四旧档评估结论（material_decision_log 19:12 v2 旧档）

- **enemy_guard（守卫）→ 建议 wan 重生成（最优先）**：腿部膝盖断裂/白缝 + 肢体与器械间大块伪影 + 轮廓脏边/ghosting + 鞋子不自然。
- **enemy_zombie（丧尸）→ 建议 wan 重生成**：轮廓硬切/锯齿 stair-step aliasing、缺抗锯齿，UI 放大毛刺明显。
- **enemy_licker（舔食者）→ 保留 v2 旧档**：质量最佳、抠图干净无白边/halo。
- **enemy_horde（尸群）→ 保留 v2 旧档**：三 zombies 群像完整、透明干净、无需单兵细节。
- 落地状态：`{{A1_PENDING:zombie/guard 重生成候选是否已产出并部署；licker/horde 沿用确认}}`。
```

- ③优先级：**高**（素材最新结论与正稿口径差异最大，直接误导读者）。

### P2（高）README · 敌人立绘精灵化管线小节（约 L95-100）配方更新

- ①位置：README L95「### 敌人立绘精灵化管线」至 L100。
- ②草稿（替换该小节描述，核心是**结论反转**——纯黑 BLACK_BG 只是 Z-Image 系下的稳定基底，wan 下改用「rim light 包围 + floodfill 回填」）：

```markdown
### 敌人/主角立绘精灵化管线（wan 版）

- **背景与轮廓（wan 引擎）**：Z-Image 系对「深色主体 + 纯黑背景」像素层无解（11+7 轮翻车：8 种失败模式），已切 **tokenrhythm wan2.7-image**。新配方统一在纯黑平底上以**冷白 rim light 轮廓光围住内部暗区**——轮廓线成 solid、内部黑区被围成闭合洞，供 floodfill 回填（material_decision_log「rim light 分离」折点）。通用后缀强制：`NO word `floor reflection / NO shadow / NO gradient / NO glow`、`soles cropped by bottom frame edge` 真正贴底。
- **抠图**：wan 轮改 **floodfill**（`tools/design/` 下 cutout 脚本：seal2 / hole-channel6 / hole-solid / zero-rgb + closing1 + feather2；接近纯黑非纯背景需 T 提升至 ~16），取代旧 `cutout_enemy.py` v1 距离法（深色主体+黑底时两者均删大片近黑，不可靠）。
- **质检闭环**：`make_enemy_previews.py` 棋盘格预览 → **qwen3.7-flash 识图子代理** 按 5 项判据逐张验收（全身完整居中/设定匹配/过暗缺陷/棋盘格透明度/评级），不合格即重生成。质检 subagent prompt 必须携带生成一致设定（pc=健康青年战士非丧尸；hunter=无皮肌肉怪非有人物）。
- **渲染**：同 tatter `zone3d.js` PlaneGeometry 精灵（宽=高×0.75、alphaTest 0.3、depthWrite false、DoubleSide、billboard 阴影水平、scale 1.15、死亡 700ms 淡出、onError 兜底 buildPrimitiveEnemy）。
```

- ③优先级：**高**（该小节描述的配方已被 wan 推翻，若不改会被当成实现依据误用）。

### P3（高）TEST_REPORT · 2.6 敌人立绘精灵化节（约 L68-76）回填最新结论

- ①位置：TEST_REPORT「2.6 敌人立绘精灵化（本轮新增）」节（L68-76）。
- ②草稿（在该节末尾追加一段「wan 引擎切换后的 2.6 修订」，不删原表，单列修订以保留历史）：

```markdown
#### 2.6 修订（wan 引擎切换，material_decision_log 对齐 · {{A1_PENDING:定稿批注日期}}）

- **引擎切换**：生图由 Z-Image（BLACK_BG 配方 11+7 轮翻车）切至 **tokenrhythm wan2.7-image**（768×1024, 0.2 元/张, `tools/design/gen_wan.py`）。
- **配方反转**：2.6 正文的「纯黑背景为唯一可靠基底」是 Z-Image 系结论；wan 下改为**纯黑 + 冷白 rim light 轮廓光**围住内部暗区（floodfill 可回填），抠图由 v1 距离法改 **floodfill（T16/seal2/hole-channel6/hole-solid/closing1/feather2）**。
- **质检方切换**：`ox_enemy_qc.mjs`（stealth/ox-alpha）→ **qwen3.7-flash 识图子代理**；5 项判据沿用。
- **四旧档结论（wan 前 v2 旧档评估）**：enemy_guard / enemy_zombie **建议 wan 重生成**（轮廓硬切/断裂伪影）；enemy_licker / enemy_horde **保留 v2 旧档**。
- **主角/猎杀者立绘状态**：pc_wan3（郑吒）/ hunter_wan2（猎杀者）qwen 初判均「需重生成」（白描边/轮廓光/背景光晕）→ 未部署，仍为 Z-Image 时代线上版。{{A1_PENDING:后续重生成轮最终定稿结论与部署状态}}
```

- ③优先级：**高**。

### P4（中）README · L93 与 L88-90 质检方措辞

- ①位置：README L87-88（表格质检列）、L93（生成纪律与 ox-alpha）。
-②草稿（仅改质检表述）：
  - L87-88 表格「场景/立绘/敌人」行质检列，由 `openrouter/stealth/ox-alpha 逐张通过` 改为 `qwen3.7-flash 识图子代理逐张通过（立绘/主角深色主体走 wan 流程）`。
  - L93 由 `ox-alpha 评估` 改为 `]qwen3.7-flash 识图子代理评估`。
- ③优先级：**中**（措辞修正，配合 P1/P2 一起做更顺）。

### P5（中）TEST_REPORT · 交付物清单（L95-102）补素材流程引用

- ①位置：TEST_REPORT「5. 交付物清单」（L95-102）。
- ②草稿（在 L101 `tools/` 行后追加一行）：

```markdown
- `tools/design/`：`wan_prompts.md`（wan2.7-image 正式 prompt 库 + 质检口径）、`material_decision_log.md`（素材定稿决策日志，wan 轮1/2/3 + 四旧档结论）、`doc_backfill_plan.md`（本文档/回填方案）、multi_world_framework.md（多世界框架设计）
```

- ③优先级：**中**。

---

## 3. 回填方案（设计库相关）

### P6（高）README · 新增「Z 宇宙设计库」引用（含 25 文件）

- ①位置：README 顶部定位区（约 L3-4）之后、或「## 架构」前加一小节。
- ②草稿（建议插在 L4（Rust 全栈部署句）之后、L6「## 运行」前，作为顶部块引用）：

```markdown
## Z 宇宙（无限流超大型箱庭）上下文

- 本项目是 **zhttty 无限流宇宙（Z 宇宙）超大型箱庭**的第一章——《生化·蜂巢》为第一试炼副本。
- 完整设计库位于 `design/zhttty_universe/`（**25 个 md**：`00_INDEX.md` 总索引 + `00_ENGINE_CONTEXT.md` 引擎规范 + 7 部作品调研 + 15 个副本设计 + 辅助），覆盖《无限恐怖》《洪荒历》《死亡开端》《无限未来》《无限曙光》《大宇宙时代》《侠行天下》7 作，共 15 副本（咒怨/异形/摩瑞亚/剑冢/机关城/…）。
- 多世界扩展与 Z 宇宙落地路线见 `tools/design/multi_world_framework.md`（§7 落地路线由 00_INDEX §6 承接）。
```

- ③优先级：**高**（「零引用」是最显眼缺口，Z 宇宙定位缺失）。

### P7（高）TEST_REPORT · 版本头或交付物补设计库引用

- ①位置：TEST_REPORT 标题下区块引用（L3 附近），或「5. 交付物清单」。
- ②草稿（在 L3 区块引用追加一行）：

```markdown
> Z 宇宙设计库：`design/zhttty_universe/`（25 文件，00_INDEX 总索引 / 00_ENGINE_CONTEXT 引擎规范 / 7 调研 / 15 副本）——本第一章即 Z 宇宙第一副本，设计库为多世界扩展依据。
```

- ③优先级：**高**。

### P8（中）README · L87 表上角补一句「本表随 wan 引擎切换已修订」

- ①位置：README L84 表头下方/表内注释。
- ②草稿（可选一行，避免老表格与 wan 新结论并列打架）：

```markdown
> 注：下表中「立绘/敌人」行的引擎与质检为《材料定稿决策日志》wan 切换后的最新口径；Z-Image 行保留为历史基线。历史 Z-Image 明细见 `docs/GAME_DESIGN.md` 并随 P10/P11 修订。
```

- ③优先级：**中**。

---

## 4. 回填方案（引擎 / 多世界框架相关）

> 前提：`tools/design/multi_world_framework.md`（507 行）已给出 P0 范围（§6 P0：WorldData 外壳 + WORLDS 注册表 + find_world 显式 world 查询 + 存档迁移；§5.1 worlds/ 模块）。本方案仅补「正稿文档应如何引用它 / 是否新建章节」，P0 验收结果一律用 `{{A2_PENDING:...}}` 占位。

### P9（高）README · 新增「多世界框架（Z 宇宙落地）」章节

- ①位置：README「## 架构」（L35-55）之后新增一节；或「## 轮回记忆·迷雾开图」前。
- ②草稿（前置固定描述 + P0 验收占位）：

```markdown
## 多世界框架（Z 宇宙部署，P0 实现中）

- 设计依据：`tools/design/multi_world_framework.md`（507 行，P0~P3 四阶段）。核心结论：顶层独立 `world_id: String`（`zhutianshenkong`/`biohazard_ch1`/`zhuyuan` 起步）；`floor` 保持 `usize` 不复合化；三级寻址 `(world_id, floor, x/y)`；运行时状态 = 顶层镜像 + `world_states` 快照双轨；`explored` 迷雾 key 升格 `"world:floor:x:y"`；存档 v2 完全兼容 v1（`migrate_save` 幂等迁移）。
- **P0 实现范围（数据模型 + 存档迁移，不可见重构）**：`server-rs/src/state.rs`（+`world_id/world_states/save_version/sp_grade`，全 `#[serde(default)]`）；新增 `worlds/mod.rs`（WorldData 定义 + WORLDS 注册表 + **find_world**）+ `worlds/biohazard.rs`；`maps.rs` 查询函数加 **显式 world 参数**（杜绝 `st.floor` 裸查询）；`api_world` 返回 `world` 元信息；`explored` 双端 key 迁移；新增 v1→v2 存档迁移测试。
- **P0 验收**：{{A2_PENDING:P0 实现验收结果——旧 save.json 迁移后迷雾/门禁/敌人/剧情态一致；api_world 增 world 元信息前端兼容；cargo build + cargo test（含迁移测试）绿}}
- **后续阶段**：P1 主神空间世界地图 → P2 跨世界互进出 + 死亡扣点复活 → P3 咒怨接入（sp_grade 落地）。任何阶段不破坏旧存档。
```

- ③优先级：**高**（P0 是正在落地的重大机制，正稿必须有章节）。

### P10（高）TEST_REPORT · 新增「多世界框架 P0」章节（含验收占位）

- ①位置：TEST_REPORT 建议在「2. 本轮深化内容」后、「4. 已知待办」前插入一节（或作为新「3」节，原 3/4/5 顺延）。
- ②草稿：

```markdown
## 3. 多世界框架 P0（数据模型 + 存档迁移，实现中）

> 设计依据 `tools/design/multi_world_framework.md` §6 P0；本节在 P0 验收完成后回填最终结果。

| 项 | 内容 |
|----|------|
| world_id | 顶层独立字符串字段（`biohazard_ch1` 起步），`floor` 保持 usize |
| WorldData / WORLDS / find_world | 新增 `worlds/mod.rs`：WorldData 定义 + WORLDS 注册表 + `find_world(world_id)` 显式 world 查询 |
| map_objs / enemies_alive 双轨 | 顶层 = 活跃世界镜像；`world_states` = 非活跃世界快照（惰性）；保留 v1 字段不删/不改名 |
| explored 迷雾 | key 升格 `"world:floor:x:y"`，`migrate_save` 旧 key 前插 `biohazard_ch1:` 幂等迁移 |
| 存档兼容 | 全新增字段 `#[serde(default)]`；单入口 `migrate_save`；`save_version=2` |
| P0 验收结果 | {{A2_PENDING:P0 实现/测试验收结论——迁移用例、api_world 元信息、cargo 全绿、旧档不丢数据}} |
```

- ③优先级：**高**。

### P11（中）README · 测试行（L81）预留 P0 迁移/多世界测试条目

- ①位置：README L81 测试行。
- ②草稿（追加一句，P0 落地后回填具体数字）：

```markdown
（在第 81 行「+ tools/visual_check.mjs」后追加）
+ 多世界 P0 迁移测试（tools/multi_world_migration_test.mjs 或 cargo 迁移单测）：旧档 v1→v2 迷雾/门禁/敌人/剧情态一致、explored 重写、api_world 元信息 —— {{A2_PENDING:P0 迁移测试结果（通过项数）}}
```

- ③优先级：**中**。

### P12（中）README · L4 / L32-33 顶部定位补 one 句多世界/设计库（可选合并 P6/P9）

- ①位置：README L4（Rust 全栈描述句）或 L3 副标题。
- ②草稿：在 L4 后追加 `本作即 Z 宇宙第一副本；多世界扩展与设计库上下文见「Z 宇宙上下文」的「多世界框架」两节。`
- ③优先级：**中**（纯交叉引用，可与 P6 或 P9 合并，减少手数）。

---

## 5. GAME_DESIGN.md 处置建议（任务要求「需新建」的落地判断）

- **现状**：`docs/GAME_DESIGN.md` **存在**（99 行），但内容为**旧静态 HTML 单页版**：资产管线 L4 `Z-Image 文生图 / Ollama gemma4:e4b 视觉质检`、L50 标题 `Z-Image bf16 1344×768`、L89-93 技术形态 `纯静态 HTML5 单页`、L98 `ollama gemma4:e4b 多模态评分`——与当前 Rust + Tauri + 开放世界 4 层蜂巢 + wan2.7-image 全部不符。
- **结论**：**不需要新建 GAME_DESIGN.md，需要修旧**（否则会形成「一份正稿说 Z-Image/单页、另一份正稿说 wan/Rust」的双轨矛盾）。建议：
  - D1（低）`docs/GAME_DESIGN.md`：①替换文档头管线声明（Z-Image→wan2.7-image + qwen3.7-flash，指向 material_decision_log / wan_prompts）；②「五、本地生成素材清单」表 + 「六、技术形态」整节更新为 Rust+Tauri 开放世界版（可直接引用 README「玩法/架构」）；③补多世界框架与 Z 宇宙设计库链接。
  - D2（低）若团队明确放弃维护 GAME_DESIGN.md，则把其仍有效内容（章节流程/数值/死亡结局档案）并入 README 后删除旧档——但**删除需先中文说明原因**（遵循 rules/general.md）。
  - 优先级：**低**（不影响运行/验收，属文档卫生；但建议在素材与引擎回填后顺手处理，避免双轨误导长期累积）。

---

## 6. 回填执行顺序与依赖

1. **素材组（P1-P5）**：等 A1 定稿最终结论后再替换 `{{A1_PENDING}}`，其余固定文案（引擎切换、floodfill、四旧档结论、qwen 质检）可先粘贴。
2. **引擎组（P9-P12）**：等 A2 P0 验收后替换 `{{A2_PENDING}}`；框架描述与 P0 范围文字（引自 multi_world_framework 文档事实）可先粘贴。
3. **设计库组（P6-P8）**：无外部依赖，`{{}}` 为空，可立即回填。
4. **GAME_DESIGN（D1-D2）**：建议最后做；作为「修旧」而非「新建」。

> 所有最终回填必须**以 A1/A2 返回的结构化结论为准**，未定稿处如实保留占位符，不臆造数字/判定（遵循 CLAUDE.md「结果回收：以子代理返回结论为准，未完成如实标注」）。

---

## 7. 回填检查清单（供执行子代理拷回）

- [ ] README P1 素材管线表（wan 引擎 + 立绘定稿状态 + 四旧档结论）
- [ ] README P2 敌人/主角立绘精灵化管线（wan 版配方）
- [ ] README P3 质检方措辞（ox-alpha→qwen3.7-flash）
- [ ] README P6 Z 宇宙设计库引用（25 文件）
- [ ] README P9 多世界框架章节（WorldData/WORLDS/find_world/P0 范围）
- [ ] README P11 测试行补多世界迁移测试
- [ ] README P12 顶部一句多世界定位（可与 P6/P9 合并）
- [ ] TEST_REPORT P3 2.6 节 wan 修订
- [ ] TEST_REPORT P5 交付物补 tools/design 引用
- [ ] TEST_REPORT P7 版本头补设计库引用
- [ ] TEST_REPORT P10 新增多世界 P0 章节
- [ ] docs/GAME_DESIGN.md D1 修旧（管线/技术形态/多世界引用）
- [ ] 最终替换所有 `{{A1_PENDING:...}}` / `{{A2_PENDING:...}}` 为 A1/A2 实回结论，未定稿者保留占位

*（文档完。SLug: doc_backfill_plan。只产出本文档，未修改任何正稿。）*