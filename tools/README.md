# tools/ 目录索引（测试与素材工具 / 脚本快速参考）

> 本文档 = **脚本速查（§0）** + 目录结构（§1-§9）。脚本都需在 `tools/` 目录下运行（很多用相对 `../server-rs` 定位 exe/save）。
> 补记：本索引由文档子代理核对磁盘结构后增补「§0 脚本速查」，其余原有整理内容（§1-§9）保持不变。

## §0 脚本速查（用途 + 运行方式）

所有 `.mjs` 均需已 `cargo build --release`（须有 `server-rs/target/release/wuxian-horror-ch1.exe`）；CDP 脚本大多会自动拉起 exe 并驱动端口（9702 / 9699）。GUI 测试脚本会写日志到 `tools/artifacts/logs/`、截图到 `tools/shots/` / `tools/artifacts/`。

### A. 副本生成（新副本三件套）

| 脚本 | 用途 | 运行 |
|------|------|------|
| `gen_dungeons.mjs` | 从内置 `D` 表 + `templates/demo_*.rs` 批量生成副本三件套骨架：`src/worlds/<slug>.rs` + `src/scenes_<slug>.rs` + `tests/<slug>_flow.rs` + `tools/design/<slug>_impl_log.md`；已存在的跳过 | `node tools/gen_dungeons.mjs` |
| `gen_register.mjs` | 批量把新副本注册进 `lib.rs` / `worlds/mod.rs` / `scenes.rs`（mod 声明 + 常量 + WorldData 静态 + WORLDS 数组）；GW_PORTALS 与 fight_cfg or_else 需手工补 | `node tools/gen_register.mjs` |

> 跑完两步务必 `cd server-rs && cargo check --all-targets` 引导修复，再补 GW_PORTALS / fight_cfg 挂接（完整流程见 `docs/DEVELOPMENT.md`）。

### B. 素材生成（生图 / 音效 / BGM / 语音 / 抠图）

| 脚本 | 用途 | 运行 |
|------|------|------|
| `gen_pc_sprite.py` | 生成主角郑吒全身立绘（768×1024 纯黑底，ComfyUI Z-Image），输出 `tools/design/raw_enemy/pc_zhengzha.png` | `python gen_pc_sprite.py` |
| `gen_enemy_sprites.py` | 生成 5 个敌人立绘（或单张），输出 `tools/design/raw_enemy/<id>.png` | `python gen_enemy_sprites.py [id]` |
| `gen_zimage_batch.py` | 按 manifest 批量 Z-Image 生图 | `python gen_zimage_batch.py <manifest.json> <id...>|ALL` |
| `gen_sfx.py` | numpy 合成游戏音效 → `server-rs/ui/assets/audio/sfx_*.wav`，记录 `tools/design/sfx_log.md` | `python gen_sfx.py`（需 numpy） |
| `gen_bgm.py` | 纯 Python 合成 3 条 BGM（bgm_nexus/horror_loop/battle）→ `server-rs/ui/assets/audio/` | `python gen_bgm.py` |
| `gen_tts*.py` | 本地 Qwen3-TTS CustomVoice 配音 → `server-rs/ui/assets/audio/vo_*.wav`（gen_tts2/3 读 `assets_manifest.json`；_cops2/_zhouyuan/_z_worlds 为各批） | `python gen_tts3.py` 等 |
| `cutout_floodfill.py` | 纯黑背景立绘 floodfill 抠图（含防漏防穿三道防线/羽化/闭运算），解决边角深色误判 | `python cutout_floodfill.py <in.png> <out.png> [阈值] [选项]` |
| `cutout_enemy*.py` | 早期/变体抠图脚本（v2 逐像素欧氏距离法） | `python cutout_enemy_v2.py ...` |

### C. CDP 端到端 GUI 测试（都自动拉起 exe）

| 脚本 | 覆盖 | 运行 |
|------|------|------|
| `e2e_smoke_test.mjs` | 7 项冒烟：新局/移动/地图切换/战斗/分辨率/面板/装备兑换；产出 `tools/e2e_smoke_report.md` | `node tools/e2e_smoke_test.mjs` |
| `flow_cdp.mjs` | 全章节 GUI 流程（生化主线→BOSS→结算→主神空间），截图到 `tools/shots/` | `node tools/flow_cdp.mjs` |
| `world_flow.mjs` | 开放世界地图全流程（标题→地图→移动→NPC→调查点→战斗副本→返回） | `node tools/world_flow.mjs` |
| `gateway_check.mjs` | 6 副本跨世界网关验收（进主神→逐网关交互→断言 world_id 切换 + 落点） | `node tools/gateway_check.mjs` |
| `shot_fight_3d.mjs` | 3D 战斗连拍 6 帧（走位/攻击/闪避/受击），输出 `tools/artifacts/shots/` | `node tools/shot_fight_3d.mjs` |
| `gate_chain_test.mjs` | 箱庭门禁全链（4 门禁钥匙链 + 8 传送链 + 双钥匙闭环 + 存档最终态） | `node tools/gate_chain_test.mjs` |
| `coupling_chain_test.mjs` | 跨调查点支线耦合（消毒真相链/冷却回路/导轨手册互证） | `node tools/coupling_chain_test.mjs` |
| `reincarnation_memory_test.mjs` | 轮回记忆开图（死亡重开继承地图记忆/迷雾半开半径/跨层过滤/持久化） | `node tools/reincarnation_memory_test.mjs` |
| `world_elite_fight_test.mjs` | 世界精英敌人（遇敌/战斗副本/击杀/中性胜利/已死不触） | `node tools/world_elite_fight_test.mjs` |
| `nexus_flow.mjs` / `nexus_exchange_flow.mjs` | 主神空间 / 兑换闭环流程 | `node tools/nexus_flow.mjs` |
| `zhouyuan_flow.mjs` / `world_flow.mjs` | 咒怨 / 世界流程 | `node tools/zhouyuan_flow.mjs` |

### D. CDP 辅助 / 截图 / 质检

| 脚本 | 用途 | 运行 |
|------|------|------|
| `cdp_driver.mjs` | **必须最先启动**：在指定端口开 CDP 驱动（供 ws_eval/ws_click 等连接） | `node tools/cdp_driver.mjs <port>` |
| `ws_eval.ps1` / `ws_click.ps1` | 经 `cdp_port.txt` 定位端口后执行 JS 求值 / 点击 | `powershell -File tools/ws_eval.ps1` |
| `flow_cdp.ps1` / `test_flow_v4.ps1` / `driver.ps1` | 早期 PowerShell GUI 流程测试（步骤日志写 `steps.log`，经 `last_result.json` 传单步结果） | `powershell -File tools/driver.ps1` |
| `visual_check.mjs` | 视觉质检截图（导航到指定 floor/x/y 强制刷新世界视图截图） | `node tools/visual_check.mjs [floor] [x] [y] [out.png]` |
| `tr_vision.mjs` | 图像识别辅助（tokenrhythm glm-5.3-flash，替代 ox-alpha） | `node tools/tr_vision.mjs ...` |
| `screenshot_show.mjs` / `enemy_sprite_screenshot.mjs` | 截图展示 / 敌人立绘截图 | `node tools/screenshot_show.mjs` |
| `ox_vision.mjs` / `eval_visual.py` / `visual_check.mjs` | 历史视觉质检（ox-alpha 已由 tr_vision 取代） | — |
| `extract_frame.ps1` | 视频抽帧质检素材（`-OutPng`，供 ox_cine_qc_multi.mjs 读取） | `powershell -File tools/extract_frame.ps1 -OutPng ...` |

### E. PowerShell 探针 / 杂项

`argprobe.ps1` / `probe_col.ps1` / `click_probe.ps1`（早期调试探针）、`check_game.js`、`map_gen.py`（生成地图 Rust 片段 → `maps_gen.txt`）、`map_validator.py` / `design_check.py` / `qa_zhouyuan.py`（质检）、`fix_xj_maps.py`、`gen_h3.py` / `gen_tts.py` 等。详见本文档 §8「疑似废弃」标注哪些是历史脚本。

---

> 整理原则：**只移动/新建，未删除任何文件**；除「随移动同步的输出路径」外，**未修改任何脚本代码逻辑**（未改读取路径）。
> 管辖范围：仅 `tools/`，不涉及 `server-rs/`、`game/`、`design/`（项目根）、`docs/` 及根 `README.md` / `TEST_REPORT.md`。

## 1. 目录结构（整理后）

```
tools/
├── README.md                       ← 本索引文档
│
├── （根级脚本与运行态文件，见 §2 与 §4）
├── *.mjs / *.ps1 / *.py / *.js     ← 测试/生成/质检脚本主体
├── last_result.json                ← driver.ps1 写 / test_flow_v4.ps1 读（因脚本引用保留原位）
├── cdp_port.txt                    ← ws_eval.ps1 / ws_click.ps1 读取（保留原位）
├── assets_manifest.json            ← gen_tts2.py / gen_tts3.py 读取（保留原位）
├── maps_gen.txt                    ← map_gen.py 生成的地图 Rust 片段（待人工决定）
├── vid_*.txt / cine_*.txt          ← 视频提示/过场文本素材（待人工决定）
│
├── artifacts/                      ← 归档产物（只读参考区）
│   ├── screenshots/                ← 历史质检截图（gate_*/vent_f1/scene_*/world_map）
│   ├── logs/                       ← 历史运行日志（steps/flow_steps/world_steps/flow_run/multi_run）
│   └── manifests/                  ← 批量图像生成批次 manifest（batch2/new_scenes）
│
├── design/                         ← 设计稿与视觉质检（组织归 design/ 子块）
│   ├── canon/                      ← 楼层/架构/BOSS 平台 设定 canon JSON（权威设定，勿动）
│   ├── raw_enemy/                  ← 敌人/主角 立绘原图
│   ├── preview_enemy/              ← 棋盘格预览图
│   ├── npc_*.json / zone_*.json    ← NPC / 区域场景 设计稿
│   ├── ox_*_qc.mjs / ox_*_qc.js    ← 历史 ox-alpha 视觉质检脚本（已由 tr_vision.mjs 取代，保留备查）
│   ├── ox_*.txt / ox_*_report.md   ← 质检结果文本/报告
│   ├── frame_*.png                 ← 过场抽帧质检素材（extract_frame.ps1 生成、ox_cine_qc_multi.mjs 读取）
│   └── ox_raw_responses*.json      ← 质检模型原始回复中间产物（待人工决定）
│
├── tr_vision.mjs                   ← 图像识别辅助脚本（tokenrhythm glm-5.3-flash，替代 ox-alpha）
│
└── shots/                          ← flow_cdp.mjs 截图的实时输出目录（运行期自动重建，保留）
```

## 2. 子目录用途说明

| 位置 | 用途 |
|---|---|
| tools/ 根级脚本 | 测试与素材工具本体：全流程 GUI 测试（`flow_cdp.mjs`/`flow_cdp.ps1`/`driver.ps1`/`test_flow_v4.ps1`/`world_flow.mjs`/`flow_one.ps1` 等）、单点测试（`gate_chain_test.mjs`/`coupling_chain_test.mjs`/`reincarnation_memory_test.mjs`/`world_elite_fight_test.mjs` 等）、CDP 辅助（`ws_click.ps1`/`ws_eval.ps1`/`cdp_driver.mjs`）、素材生成（`gen_*.py`/`gen_pc_sprite.py`/`cutout_enemy*.py` 等）、视觉质检辅助（`visual_check.mjs`/`tr_vision.mjs`/`eval_visual.py`） |
| tools/design/ | 设计稿（NPC/区域/楼层 canon）与视觉质检工作区（识别模型现为 tokenrhythm/glm-5.3-flash，经 `tr_vision.mjs` 调用） |
| tools/design/canon/ | 楼层/架构/BOSS 平台等**权威设定 JSON**，由引擎/文档引用，勿移动 |
| tools/design/raw_enemy/ | 敌人/主角**立绘原图**（zombie/hunter/guard/horde/licker/pc_zhengzha） |
| tools/design/preview_enemy/ | 立绘**棋盘格预览图**（`make_enemy_previews.py` 产出） |
| tools/artifacts/ | **归档产物区**：历史截图/日志/批次 manifest，只读参考，不参与实时运行 |
| tools/artifacts/screenshots/ | 历史视觉质检截图（门禁渲染/场景/世界地图） |
| tools/artifacts/logs/ | 历史运行日志（GUI 全流程测试步骤日志等） |
| tools/artifacts/manifests/ | 批量图像生成批次 manifest（`gen_zimage_batch.py` 的入参） |
| tools/shots/ | `flow_cdp.mjs` 每次运行**自动创建+清空**的实时截图输出目录；当前为空，保留 |

## 3. 本次整理：移动清单（旧 → 新）

**→ tools/artifacts/screenshots/**
| 旧路径 | 新路径 |
|---|---|
| `tools/gate_vent_f1.png` | `tools/artifacts/screenshots/gate_vent_f1.png` |
| `tools/gate_vent_f1_unlocked.png` | `tools/artifacts/screenshots/gate_vent_f1_unlocked.png` |
| `tools/gate_b_area_f2.png` | `tools/artifacts/screenshots/gate_b_area_f2.png` |
| `tools/gate_b_area_f2_unlocked.png` | `tools/artifacts/screenshots/gate_b_area_f2_unlocked.png` |
| `tools/vent_f1.png` | `tools/artifacts/screenshots/vent_f1.png` |
| `tools/shots/world_map.png` | `tools/artifacts/screenshots/world_map.png` |
| `tools/shots/scene_sterile_lab.png` | `tools/artifacts/screenshots/scene_sterile_lab.png` |
| `tools/shots/scene_redqueen_pipe.png` | `tools/artifacts/screenshots/scene_redqueen_pipe.png` |

**→ tools/artifacts/logs/**
| 旧路径 | 新路径 |
|---|---|
| `tools/steps.log` | `tools/artifacts/logs/steps.log` |
| `tools/flow_steps.log` | `tools/artifacts/logs/flow_steps.log` |
| `tools/world_steps.log` | `tools/artifacts/logs/world_steps.log` |
| `tools/flow_run.log` | `tools/artifacts/logs/flow_run.log` |
| `tools/design/multi_run.log` | `tools/artifacts/logs/multi_run.log` |

**→ tools/artifacts/manifests/**
| 旧路径 | 新路径 |
|---|---|
| `tools/manifest_batch2.json` | `tools/artifacts/manifests/manifest_batch2.json` |
| `tools/manifest_new_scenes.json` | `tools/artifacts/manifests/manifest_new_scenes.json` |

## 4. 因脚本引用保留原位的文件（未移动）

| 文件 | 引用方 | 引用性质 |
|---|---|---|
| `last_result.json` | `driver.ps1:256/280/294`（写）、`test_flow_v4.ps1:18/37`（读+清理） | 读+写，运行时状态文件 |
| `cdp_port.txt` | `ws_eval.ps1:3`、`ws_click.ps1:5` | 脚本读取 |
| `assets_manifest.json` | `gen_tts2.py:29`、`gen_tts3.py:22` | 脚本读取 |
| `design/frame_*.png`（10 张） | `design/ox_cine_qc_multi.mjs:28`（硬编码 `${DESIGN}/frame_<stem>_<t>.png`） | 脚本读取 |
| `maps_gen.txt` | `map_gen.py:349`（硬编码生成输出路径） | 生成方硬编码（未归档，见待人工决定） |

## 5. 随移动同步的输出路径（脚本已改，仅改输出路径，未动读取路径）

| 脚本 | 改动 |
|---|---|
| `flow_cdp.mjs:16` | `LOG` 指向 `tools/artifacts/logs/flow_steps.log`（写入与清理均经该变量） |
| `world_flow.mjs:14` | `LOG` 指向 `tools/artifacts/logs/world_steps.log` |
| `flow_cdp.ps1:10/75/86` | `steps.log` 写入/清理路径 → `tools/artifacts/logs/steps.log` |
| `test_flow_v4.ps1:20/25` | 同上 |
| `driver.ps1:281` | 同上 |

> ⚠️ 注意：以上脚本会把日志直接写入 `artifacts/logs/`，请**保留该目录**；若被删除，需先重建再运行脚本（`Add-Content`/`appendFileSync` 不会自动建目录）。

## 6. 读取路径陈旧脚本(2026-08-27 已处理)

| 脚本 | 现状 |
|---|---|
| `design/ox_gate_qc.mjs:8` | ✅ 已更新 `SHOTS_DIR` → `tools/artifacts/screenshots/`(gate_*.png 4 张均已在该目录) |
| `design/ox_probe429.mjs:6/12` | 一次性 429 限流诊断脚本,已废弃(见 §8),不修 |
| `design/ox_shots_qc_runner.js:7` | ✅ 已更新 `SHOTS_DIR` → `tools/artifacts/screenshots/`;其中 `world_map2.png` 从未生成,已从 SHOTS 清单移除并注释 |
| 文档性引用已陈旧 | `design/ox_gate_qc_report.md`、`design/ox_shots_qc.txt` 内的绝对路径指向旧位置(仅文档,不影响运行) |

> 说明：`gate_*.png` 与 `shots/*.png` 由 `visual_check.mjs`（输出文件名走命令行参数、落盘于脚本所在目录 `tools/`）等工具重新生成，属于可再生质检素材，故归档处理。

## 7. 待人工决定清单

1. **`tools/maps_gen.txt`** — `map_gen.py:349` 生成的地图 Rust 代码片段，工具输出的参考产物；归档需同步 `map_gen.py` 输出路径（本次未处理）。
2. **`design/ox_raw_responses.json` / `design/ox_raw_responses_multi.json`** — `ox_cine_qc.mjs:67` / `ox_cine_qc_multi.mjs:77` 写入的模型原始回复中间产物；若归档需同步两脚本输出路径与 `ox_cine_qc.txt:59` 文档。当前按「拿不准不移动」保留在 design/。
3. **根级 `vid_opening.txt` / `vid_laser.txt` / `vid_licker.txt` / `cine_elevator.txt` / `cine_elevator2.txt` / `cine_redqueen_off.txt`** — 视频生成提示/过场文本素材，无脚本硬编码引用；可考虑归入 design/ 或新建 prompts/，待确认用途后决定。
4. **`tools/shots/` 目录** — 当前为空（内容已归档）；它是 `flow_cdp.mjs` 的实时截图输出目录（运行期自动重建），建议保留。
5. **`last_result.json` / `cdp_port.txt`** — 运行时状态文件，因脚本引用保留原位；若后续统一改动脚本路径，可一并归档。

## 8. 疑似废弃（未删除，待人工确认）

| 文件 | 理由 |
|---|---|
| `argprobe.ps1` / `probe_col.ps1` / `click_probe.ps1` | 早期调试探针（对应 `*_probe*.ps1` 模式），无其他脚本引用 |
| `test_flow.ps1` | 早期全流程测试脚本，已被 `test_flow_v4.ps1` / `flow_cdp.ps1` 取代，无引用 |
| `design/ox_probe429.mjs` | 一次性 429 限流诊断脚本 |
| `design/ox_cine_qc.mjs` | 仍引用旧命名 `frame_elevator.png` / `frame_redqueen.png`（当前不存在），已被 `ox_cine_qc_multi.mjs`（5 帧序列版）取代 |

## 9. 附：关键引用关系速查（本次整理依据）

- `visual_check.mjs` — 截图工具，输出名走命令行参数、落盘于 `tools/` 根；`gate_*.png` 等即其产物。
- `flow_cdp.mjs` — 全流程 GUI 测试；日志 → `artifacts/logs/flow_steps.log`，截图 → `tools/shots/`（每次运行清空重建）。
- `world_flow.mjs` — 世界地图流程测试；日志 → `artifacts/logs/world_steps.log`。
- `flow_cdp.ps1` / `test_flow_v4.ps1` / `driver.ps1` — 步骤日志 → `artifacts/logs/steps.log`；`driver.ps1` + `test_flow_v4.ps1` 通过 `last_result.json` 传递单步结果。
- `ws_click.ps1` / `ws_eval.ps1` — 经 `cdp_port.txt` 定位 CDP 端口。
- `extract_frame.ps1` — 视频抽帧工具（`-OutPng` 参数），`frame_*.png` 即其产物，被 `ox_cine_qc_multi.mjs` 读取。
- `shots/`、`server-rs/ui/`：本次核对过，`server-rs/ui/` 下无任何对上述移动文件的引用。