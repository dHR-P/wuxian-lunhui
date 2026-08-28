# 《无限轮回 · 第一章 生化蜂巢》最终测试报告

> 版本：开放世界版（Rust 引擎 + Tauri WebView 渲染）｜ 测试方式：Node CDP 驱动真实 GUI 全流程 + qwen3.7-flash/ox-alpha 视觉质检
> 日期：本轮收尾
> Z 宇宙设计库：`design/zhttty_universe/`（总索引 `00_INDEX.md` 自述口径 23 个 md：00_ENGINE_CONTEXT 引擎规范 1 / 7 调研 / 15 副本）——本第一章即 Z 宇宙第一副本，设计库为多世界扩展依据。
> 多世界框架 P0 已实现并验收（数据模型 / 存档迁移 / 显式 world 查询，详见 `tools/design/multi_world_impl_log.md`）；主神空间 P1 规划实现中（`tools/design/p1_nexus_impl_log.md`）。

---

## 1. 测试基线总览

| 测试 | 工具 | 结果 | 覆盖内容 |
|------|------|------|----------|
| 引擎层单元测试 | `cargo test --release` | ✅ 4/4 | Rust 侧状态机 / 渲染视图 / 回合战斗 / 结算（含 7 侧结算一致性断言） |
| 箱庭全链 | `tools/gate_chain_test.mjs` | ✅ 67/67 | 4 门禁钥匙链 + 8 传送链 + 双钥匙闭环 + 新增敌人/冷却阀点 + 存档终态 |
| 轮回记忆开图 | `tools/reincarnation_memory_test.mjs` | ✅ 12/12 | 死亡重开继承地图记忆 / 迷雾开图半径 / 跨层过滤 / 存档持久化 |
| 开放世界全流程 | `tools/world_flow.mjs` | ✅ 10/10 | 进轮回 → 世界加载 → 移动 → NPC → 调查 → 红后谜题 → 战斗副本 → 退出 |
| 跨调查点支线耦合 | `tools/coupling_chain_test.mjs` | ✅ 48/48 | 消毒真相链 / 冷却联动 / 导览图↔手册互证 |
| 世界精英敌人 | `tools/world_elite_fight_test.mjs` | ✅ 18/18 | 旧存档补缺 / 地图遭遇 / 战斗副本 / 击杀生效 / 中性胜利场景 / 已死不触发 |
| 门禁视觉质检 | `tools/design/ox_gate_qc.mjs` + ox-alpha | ✅ 4/4（含迷雾复检） | 锁定态/解锁态渲染 + 轮回迷雾透明度 |

---

## 2. 本轮深化内容

### 2.1 轮回记忆开图（迷雾系统）

- `GameState.explored: BTreeSet<String>`（`floor:x:y`）serde 持久化；`api_new` 继承旧存档 explored —— 死亡重开保留地图记忆，契合无限流「轮回记忆」设定
- `REVEAL_RADIUS = 4` 方形开图，三处触发：出生、移动、传送门切换
- `world_view` 输出当前层 `"x:y"` 清单（strip_prefix 只裁一次前缀，避免误裁）
- 前端迷雾：未探索格 `rgba(2,2,6,.72)` 半透明覆盖 + 极淡网格线（`rgba(90,100,140,.09)`）+ 边缘微光，**底下 tile 结构隐约可见**（经 ox-alpha 复检修正自初始 `.88` 过黑版本）；未探索格隐藏敌人/调查点/NPC/副本/门禁，玩家恒可见

### 2.2 跨调查点支线耦合（本轮新增，48 项验证）

| 耦合链 | 前置 | 解锁内容 |
|--------|------|----------|
| 消毒事故真相链 | 列车运行日志(F1) + 消毒终端通知(F1) + 药品柜值班表(F2)，三份旁证齐备 | 主控终端(F3)出现「调阅《消毒执行记录》」→ 新场景 `s_decon_truth` 揭示「消毒即扩散管道」真相：+40 点、-10 理智、flag `decon_truth`；未集齐时终端明确提示还缺哪几份旁证 |
| 冷却回路联动 | 冷却阀顺序谜题解对（A→C→B）→ `cooling_done` | 服务器阵列(F3)出现「读取散热读数」联动选项 → flag `server_cooling`、+15 点 |
| 导览图↔手册互证 | 站台导览图(F1，flag `nav_map`) | 安全手册(F3)文本呼应红笔「上去快」批注，出现「互证导览图与手册」→ flag `nav_manual_cross`、+15 点；未读导览图时不出现该选项 |

另外为消毒终端通知补充了「封闭日 11:40 / 喷淋覆盖范围」细节，与列车日志、值班表形成可感的叙事互文。

### 2.3 视觉质检闭环（门禁 + 迷雾）

- 4 张门禁截图（F1 通风管 / F2 B区，各含锁定+解锁态）全部经 stealth/ox-alpha 视觉校验通过
- 迷雾透明度二次质检：`gate_b_area_f2.png` 锁定态复检 → ox-alpha 确认「tiles are discernible everywhere」——半透明迷雾下底层 tile 结构可见，满足判据（非纯黑糊死）
- ox-alpha 上游 429 限流已内建 60-90s×4 退避 + reasoning 兜底，本轮复检经 3 次退避后成功

### 2.4 世界精英敌人「猎杀者·实验体」（本轮新增，18 项验证）

| 项 | 内容 |
|----|------|
| 地图 | `e_f4_elite` @ F4(25,14)，曼哈顿距离与既有对象 ≥7（最近 n_rain_f4=7 / p_train_door=8），四邻均可走 |
| 战斗 | 第 9 套 FightCfg `hunter_elite`：92HP / 伤害 14-21 / 击杀奖励 +120；HP≤40 狂暴（伤害+4）；HP≤26 可终结技 |
| 数值平衡 | 新局持消防斧（22-34）实测 4-5 轮取胜，玩家余血 42-46——有压迫感但可战胜 |
| 链路修复 | `api_world_interact` 新增敌人分支（alive/dead 判定）+ `zone_enemy_id` 按敌人 id 直击 `kill_enemy`；`ensure_enemies` 改逐个补缺并在 `api_continue` 路径也调用（旧存档自动补上新敌人，存活表为 true 可遭遇） |
| 胜利路由 | win 的剧情场景 view 会被客户端丢弃（zone 胜利仅显示击败横幅），故 `win → s_world_back` 中性场景（overlay 卡片「返回探索」→ 回世界），不污染主线 scene_id（测试断言 win 后 `scene_id === 's_world_back'`） |
| 击杀意志 | kill_enemy 生效后 `enemies_alive=false`、世界视图 `alive:false`、再交互提示「它已经被你放倒了。」、踩过不再触发遭遇 |

### 2.5 结算侧支线统一（双函数合一，本轮修复）

| 项 | 内容 |
|----|------|
| 问题 | `engine.rs` 旧 `compute_settle` 只计 4 条主支线（A/B1/B2/C），`scenes.rs` `compute_settlement` 已扩到 7 侧（含 3 条隐藏调查 `decon_truth`/`server_cooling`/`nav_manual_cross`）——若玩家达成隐藏调查，goto 结算场景时存储的 `settle_total/settle_rank` 与结算卡片展示不一致 |
| 修复 | `engine.rs goto(s_settle)` 改调 `crate::scenes::compute_settlement`（唯一权威函数，7 侧 ×200 + 存活×100 + 点数），删除 engine 侧 4 侧旧函数；`compute_settlement` 改 `pub` 供集成测试直接断言 |
| 结算卡片 | 各侧支线分项行下新增「轮回总计」行（展示 total），与 `settle_total` 存储值完全一致 |
| 验证 | 直接调用权威函数断言存储一致：`full_playthrough` 结算断言升级（4 侧/800 侧加成/存储==权威）；新增 `settle_counts_seven_sides` 测试（7 侧 → ab=400, sb=1400, total=2100, rank='S'，且 `goto` 后 `settle_total/settle_rank` 与权威一致） |
| 顺带清理 | 消除 3 个既有编译 warning（unused BTreeMap import / unused total / unused st），release 构建零警告 |

### 2.6 敌人立绘精灵化（本轮新增）

| 项 | 内容 |
|----|------|
| 背景配方 | 纯黑背景（BLACK_BG）为唯一可靠基底：Z-Image 对纯白/渐变背景会画成场景/地面/投影（历测 opaque 泄漏 2.6%~6.7%，主体被抠穿，ox-alpha 判「需重生成」）；纯黑底 + 明亮冷白主光 + 强明暗分离 + 完整全身居中立绘（zombie 黑底命中率 96.2%） |
| 抠图 | `cutout_enemy.py` v1 单色欧氏距离法（d≤3 透明 / d≥19 不透明 / 中间平滑）；flood 法（T=45）弃用——会把边缘碎裂成互不相连碎块（guard/horde 曾因此被 ox 判重生成） |
| 质检 | `make_enemy_previews.py` → 16px 灰白棋盘格预览（防透明处 RGB=黑误判）→ `ox_enemy_qc.mjs` 5 项判据逐张验收（全身完整居中/设定匹配/过暗缺陷/棋盘格透明度/评级），不合格重生成 |
| 渲染 | `zone3d.js` PlaneGeometry 精灵（宽=高×0.75、alphaTest 0.3、depthWrite false、DoubleSide、billboard 组内水平阴影、scale 1.15、死亡 700ms 淡出、onError 兜底 buildPrimitiveEnemy） |
| 战斗截图闭环 | `enemy_sprite_screenshot.mjs`（CDP 走位至 5 个敌人遭遇→进入战斗副本→截图 fightshot_<kind>.png→击杀退出）→ `ox_fightshot_qc.mjs`（精灵可见完整/无黑框鬼影/比例合理/渲染异常/评级） |

#### 2.6 修订（wan 引擎切换，对齐 material_decision_log）

- **引擎切换**：生图由 Z-Image（BLACK_BG 配方 11+7 轮翻车）切至 **tokenrhythm wan2.7-image**（768×1024，0.2 元/张，`tools/design/gen_wan.py`，弃用 OpenRouter 生图）。
- **配方反转**：2.6 正文的「纯黑背景为唯一可靠基底」是 Z-Image 系结论；wan 下改为**纯黑 + 冷白 rim light 轮廓光**围住内部暗区（floodfill 可回填），抠图由 v1 距离法改 **floodfill（T16/seal2/hole-channel6/hole-solid/closing1/feather2）**。
- **质检方切换**：`ox_enemy_qc.mjs`（stealth/ox-alpha）→ **qwen3.7-flash 识图子代理**（判据沿用 5 项，设定口径必须一致：pc=健康青年战士非丧尸、hunter=无皮肌肉怪非有人物）。
- **主角/猎杀者立绘状态（A1 定稿，2026-08-27）**：**pc = wan 轮6 定稿**（`pc_wan6.png` 1,075,789B 一次过 glm 质检；cut 313,974B 头顶镂空根治、32px 剪影 PASS）；**hunter = FINAL3 手术定稿**（FINAL2 左胸受损 0.5 → 受限 bbox 重切 integrity 1.000、0 生图成本）。两件均已部署（313,974B / 678,058B），旧版备份 `tools/design/backup_cutout/pre_biosfinal_deploy_backup/`。详见 `tools/design/biosFinal_log.md`。
- **四旧档结论（wan 各轮）**：`enemy_guard` **已 wan 重生成并部署**（guard_wan3，479991B 替换旧 216456B，轮1/2 因「黑色防暴甲下半身融黑+边缘光晕」未过）；`enemy_zombie` **建议 wan 重生成（轮1~3 白描边 3 代未根治，未部署）**；`enemy_licker` / `enemy_horde` **保留 v2 旧档**。

---

- **gate_chain_test 67/67**：耦合链新增场景/选项不影响门禁锁链与传送闭环（员工卡→B区/通风管；排水→水闸；备用电源→B-09）
- **coupling_chain_test 48/48**：三条调查点支线耦合链全通过（含 `decon_truth` / `server_cooling` / `nav_manual_cross` 存档断言）
- **reincarnation_memory_test 12/12**：轮回记忆开图全通过（继承记忆 / 跨层过滤 / explored 持久化）
- **world_elite_fight_test 18/18**：新精英敌人完整链路（旧存档补缺 → F4 遭遇 → 战斗副本 → 胜利击杀 → 中性场景 → 已死不触发），含 3 次失败重试兜底（实测第 1 次即胜）
- **world_flow 10/10**：新增 3 处巡逻丧尸 + 冷却阀解密不破坏主线（世界加载/移动/NPC/无菌实验室/红后谜题/舔食者副本/退出全通过）
- 存档：`server-rs/target/release/data/save.json` 为 world_flow 启动的新局（清理档后自动重建）；如需全解锁终态（4 门全开、lab_badge/firstaid/adrenaline、drain_done+backup_on）重跑 `tools/gate_chain_test.mjs` 即可生成

---

## 3. 多世界框架 P0（数据模型 + 存档迁移 + 显式 world 查询，已实现验收）

> 设计依据 `tools/design/multi_world_framework.md` §6 P0；实现与验收见 `tools/design/multi_world_impl_log.md`。**P0 已实现并验收（非规划中占位）**；P1 主神空间已实现并验收（见 §3B）。

| 项 | 内容 |
|----|------|
| world_id | 顶层独立字符串字段（`biohazard_ch1` 起步，`WORLD_BIOHAZARD`），`floor` 保持 usize；`zhutianshenkong`(P1)/`zhuyuan`(P3) 常量预注册 |
| WorldData / WORLDS / find_world | 新增 `worlds/mod.rs`：WorldData 定义 + `WORLDS` 注册表 + `find_world(world_id)` + 全局 `tile/walkable(w,floor,x,y)` 显式携带 world |
| map_objs / enemies_alive 双轨 | 顶层 = 活跃世界镜像（biohazard）；`world_states` = 非活跃世界快照（`switch_world` 惰性）;保留 v1 字段不删/不改名 |
| explored 迷雾 | key 升格 `"world:floor:x:y"`，`migrate_save` 旧 key 前插 `biohazard_ch1:` 幂等迁移（v1→v2 不双前缀） |
| 存档兼容 | 全新增字段 `#[serde(default)]`；单入口 `migrate_save`；`save_version=2`；三条加载路径统一接入 |
| P0 验收结果 | **通过**：`cargo check --all-targets` 无错；`cargo test --test migrate_save` 4/4 + `cargo test --test debug_laser` 1/1 每次运行确定性全绿（迁移用例覆盖：生化进度不丢/explored 前缀幂等/默认 world_id/switch_world 快照恢复）；`api_world` 增 world 元信息前端兼容（UI 零改动） |

## 3B. 多世界框架 P1 · 主神空间（已实现验收，2026-08-27）

> 设计依据 `multi_world_framework.md` §6 P1；实现日志与验收对照 `tools/design/p1_nexus_impl_log.md`。实现子代理：主神空间 P1 实现重派（A3v2，deepseek-v4-flash-0731）；构建验证与 CDP 验收：主线。

| 项 | 内容 |
|----|------|
| 主神空间地图 | `worlds/zhutian.rs`：单层 40×26「中央广场」——中央主神光柱圆台(I@22,12)、西侧张杰 NPC(7,11)、东侧双传送门房间(生化 31,8 / 咒怨 31,18)、南侧兑换光球×3、西南复活祭坛；enemies 空表（无战斗） |
| 跨世界网关 | `worlds/mod.rs` `GW_PORTALS`（WorldGateway 表，不动 maps::PortalDef）：gw_biohazard 可用（主神↔生化 F1 (1,1)）、gw_zhouyuan 占位封印（P3 解锁） |
| API 世界化 | `api_world_interact`/`api_world_move` 改查 `worlds::find_world(&st.world_id)`（不再用 maps:: 全局生化表）；新增 `api_nexus_enter`（结算/兑换后一键回主神，幂等 set `bh_cleared`） |
| 场景与前端 | scenes.rs：card_settle 一键直达主神 + card_nexus 双按钮（回主神空间⌂/进入下一次轮回▶）+ 5 个主神可玩场景（光柱/兑换/祭坛/张杰对话[台词随 bh_cleared 变化]/新轮回确认）；client.js `__enter_nexus__` + portal_world 分支；world2d.js 标题 `世界名 · 层名` |
| 测试结果 | `cargo check` 零错误；`cargo test --release` **8/8 全绿**（migrate_save 4 + playthrough 3 + debug_laser 1）；`cargo build --release` 通过（exe 71,553,024B） |
| CDP 实测 | **`tools/nexus_flow.mjs` 9/9 全绿**：进入链 api_nexus_enter→主神(22,16) / 视图可见 / BFS 移动至光柱 / 光柱→s_nexus_god / 张杰→s_nexus_zhangjie / 兑换卡双按钮 / gw_biohazard→回生化(1,1) / bh_cleared 持久化 / gw_zhouyuan 静态数据；P0 回归 `world_flow.mjs` **10/10**。全章节逻辑回归由 `playthrough.rs`（cargo test 8/8 内）覆盖；旧 `flow_cdp.ps1` 因 P0 世界模式重构开局流程变更而废弃（修复其正则/BOM 后确认卡片链过时，见文件头批注） |
| 缺陷修复 | world.rs:188 `portals` 缺 `mut`（GW 网关并入 world_view 编译错，主线一处补刀） |
| **P1 补完·点数消费体系**（2026-08-27 追加） | **已实现并验收**：兑换实装（细胞强化 800→str_bonus+1 / 基因锁 2000→gene_lock / 吸血鬼血统 3000→bloodline+agi，战斗联动：str 加攻/吸血/闪避/减伤，`Route::Dyn` 条件扣点，点数不足 fail 不扣）；复活实装（4000 点复活 dead_team 首位，空/不足分流）；轮回任务简报卡（sp_grade/点数/兑换/阵亡）。`cargo test --release` **20/20 全绿**（nexus_exchange 6 新增）；**CDP `nexus_exchange_flow.mjs` 10/10 全绿**（种子档 8000 点+蕾恩阵亡 → 兑换三连 → 复活不足拒绝 → 简报）。实现日志 `tools/design/p1_exchange_impl_log.md` |

## 4. 已知待办（后续深化方向）

- 3D 敌人模型细化（当前为 AI 贴图平面，本轮已精灵化，后续可升级为骨骼动画模型）
- 本地配音批量校验（Qwen3-TTS 已生成 9 段，手动试听为主）
- 更多 BOSS 种类（当前舔食者·成年为唯一 BOSS 战，9 套 FightCfg 复用）
- P2 多世界网关结构化（PortalDef.to_world 字段化）；P3 咒怨副本（实现中：`worlds/zhouyuan.rs` + `scenes_zhouyuan.rs` 独立文件已由子代理产出，主线合并阶段接入 worlds/mod.rs 注册 + scenes.rs scene()/fight() 查询扩展 + GW_PORTALS 解锁 + 出口/复活接线；BOSS 伽椰子 r5 `PASS_DEGRADED` 降标稿已部署 `enemy_kayako.png`，反折回望姿态判为引擎能力边界放弃）
- 咒怨/洪荒/末世素材已先行部署（18 张，见 `tools/design/deploy_acceptance_log.md`），对应副本关卡待实装引用

## 5. 交付物清单

- `server-rs/target/release/wuxian-horror-ch1.exe`：release 构建可玩（WebView2 内置）
- `server-rs/src/`：Rust 引擎（maps/world/scenes/engine/state/defs）
- `server-rs/ui/`：2D 地图渲染 world2d.js + 3D 副本 zone3d.js + client.js
- `README.md`：已更新玩法表（跨点支线耦合行）+ 测试行；已补 Z 宇宙上下文 / 多世界框架 / wan 素材管线
- `tools/`：gate_chain_test / reincarnation_memory_test / world_flow / coupling_chain_test / visual_check / design/ox_gate_qc + 报告
- `tools/design/`：`wan_prompts.md`（wan2.7-image 正式 prompt 库 + 质检口径）、`material_decision_log.md`（素材定稿决策日志，wan 轮 1~5 + 四旧档结论 + guard 部署）、`doc_backfill_plan.md`（本文档/回填方案）、`multi_world_framework.md`（多世界框架设计，507 行）、`multi_world_impl_log.md`（多世界 P0 实现 + 验收日志）、`p1_nexus_impl_log.md`（主神空间 P1 实施日志）
- `design/zhttty_universe/`：Z 宇宙设计库（00_INDEX 总索引 + 00_ENGINE_CONTEXT 引擎规范 + 7 调研 + 15 副本设计）
- `TEST_REPORT.md`：本报告