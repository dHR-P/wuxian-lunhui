# 《无限轮回：生化蜂巢》游戏设计文档

> 无限流文字冒险+开放世界生存游戏 · 主线取材于 zhttty《无限恐怖》第一部第一章「生化危机」（蜂巢篇）
> 技术形态：**Tauri v2（Rust 引擎 server-rs/ + 前端 JS world2d/zone3d）**，开放世界版。
> 本地AI资产管线：**tokenrhythm wan2.7-image 生图** / MiniMax-H3 文生视频(带环境音) / **本地 Qwen3-TTS 语音 + WebAudio 合成音效**（OpenRouter 生图已弃用） / **qwen3.7-flash 识图子代理视觉质检**。素材账目与判定以 `tools/design/material_decision_log.md` 为准，prompt 库见 `tools/design/wan_prompts.md`。
> Z 宇宙上下文：本项目是 **Z 宇宙（无限流超大型箱庭）** 第一章，设计库 `design/zhttty_universe/`（00_INDEX + 00_ENGINE_CONTEXT + 7 作品调研 + 15 副本）；多世界框架 P0 已实现验收（`tools/design/multi_world_impl_log.md`），主神空间 P1 规划实现中（`tools/design/p1_nexus_impl_log.md`）。

## 一、核心循环（无限流框架）

```
现实世界 → 血色之问(YES/NO) → 【主神空间】→ 进入恐怖片世界 → 主线任务+隐藏支线
   ↑                                                        ↓
   └── 死亡 = 真正死亡（坏结局档案）    存活结算 ← 奖励点数/支线剧情评级 ←┘
                                        ↓
                            兑换商店预览 → 下一部恐怖片预告 → 轮回继续
```

## 二、章节流程（生化危机·蜂巢）

| # | 场景 | 关键事件 | 可生还/支线 |
|---|------|----------|------------|
| 0 | 深夜办公室 | 「想明白生命的意义吗？想真正的……活着吗？」 YES/NO | NO→彩蛋结局 |
| 1 | 主神空间广场 | 张杰讲解规则；选武器（消防斧/手枪/军刀） | 新人保护期说明 |
| 2 | 地下列车 | 与佣兵队汇合（一号/蕾恩/卡普兰/J.D.） | 支线A：与蕾恩对话建立信任 |
| 3 | B餐厅·初遇丧尸 | 教学战；救卡普兰或自保 | 理智值变动；支线B1：观察丧尸弱点(+提示) |
| 4 | 红后主机房 | 关闭红后；**激光通道名场面** | 一号为救人剧情杀必死；正确操作可多保1名佣兵(支线B2) |
| 5 | 实验室水道逃亡 | 丧尸群战；蕾恩被咬感染(原著向) | 支线C：肾上腺素延缓感染 |
| 6 | 列车站台·BOSS战 | 舔食者；HP<30% 触发**基因锁一阶觉醒** | 斧劈头颅终结技 |
| 7 | 结算·主神空间 | 点数计算、评级S/A/B/C/D、兑换预告、《咒怨》预告 | 张杰引导者身份伏笔 |

> 开放世界版在本流程之上以 **4 层蜂巢（F1-F4）垂直互锁箱庭** 承载：2D 俯视地图自由探索 + 3D 战斗/解密副本、门禁捷径、垂直传送、16 敌人/24 调查点/红后 4 谜题、跨调查点支线耦合。详见 `README.md`「玩法/箱庭设计」与 `TEST_REPORT.md`。

## 三、数值系统

- **体力 HP** 100：战斗失败归零即死亡结局
- **理智 SAN** 100：目睹恐怖事件扣减，<30 出现手抖(debuff文案)，归零→崩溃结局
- **奖励点数**：杀丧尸+10 / 激光通道存活佣兵每人+50 / BOSS+500 / 支线各+200
- **基因锁**：BOSS战HP<30%且SAN≥20时觉醒（攻击×2.5、必定闪避一次），一次性演出
- **评级**：总分=点数+存活队友×100+理智余量；S≥1500 A≥1200 B≥900 C≥600 其余D
- **武器差异**：消防斧(高伤/慢)、手枪(中伤/远程3弹后哑火)、军刀(快/低伤)——影响战斗选项文案与成功率

## 四、死亡结局档案（无限流特色：死亡即真实死亡）

1. 平庸之死（序章NO）
2. 光中之刃（激光通道时机错误）
3. 噬咬之终（被丧尸群拖倒）
4. 天花板上的眼睛（舔食者击杀玩家）
5. 心碎而止（理智归零）

每个死亡结局展示「主神不会复活新人」+ 本局统计 + 轮回重开按钮。

## 五、本地生成素材清单（wan 引擎 + 本地视频/语音）

> 生图引擎已自 Z-Image 切至 **tokenrhythm wan2.7-image**（`tools/design/gen_wan.py`, 768×1024, 0.2 元/张, 弃用 OpenRouter 生图）；视频/语音保持本地。详细账目/判定/历史 Z-Image 明细见 `tools/design/material_decision_log.md`。

### 图像（wan2.7-image, 768×1024；旧 Z-Image 1344×768 明细见 material_decision_log）
| 文件名 | 内容 |
|--------|------|
| img_title | 黑暗虚空中悬浮巨大猩红汉字「想真正的活着吗」，血雾 |
| img_office | 深夜办公室，青年面对显示器幽光，屏幕血字反光 |
| img_nexus | 半圆形冷金属巨构广场，人群渺小，顶光如审判 |
| img_zhangjie | 冷峻短发老兵半身像，黑色作战服双枪，疤脸 |
| img_zhengzha | 普通白领青年半身像手持消防斧，眼神从惶恐到坚定 |
| img_rain | 女特种兵半身像，利落短发，战术背心，唇角带血 |
| img_train | 废弃地下列车站台，应急红灯，蒸汽 |
| img_corridor | 地下实验室走廊，惨白灯管闪烁，弥漫消毒水雾 |
| img_horde | 惨白走廊尽头丧尸群逼近，腐朽白大褂 |
| img_laser | 玻璃幕墙通道内蓝色激光网格推进切割，金属熔滴 |
| img_redqueen | 球形机房中央全息蓝裙少女投影，代码瀑布 |
| img_licker | 长舌赤红肌腱怪物倒伏天花板，暴露脑组织，肌肉线条 |
| img_settle | 光柱自穹顶洒落的结算大厅，全息数据流 |

#### 立绘精灵（wan2.7-image 纯黑平底 + 冷白 rim light → floodfill 抠图）
- 主角 `pc_zhengzha`、猎杀者 `enemy_hunter`、守卫 `enemy_guard`（**已 wan 定稿部署**）、丧尸 `enemy_zombie`、舔食者 `enemy_licker`、尸群 `enemy_horde`。
- 四旧档/主角/猎杀者定稿状态见 `README.md`「立绘定稿状态」与 `tools/design/material_decision_log.md`（**A1 已定稿并部署（2026-08-27）：pc=wan 轮6、hunter=FINAL3**，详见 `tools/design/biosFinal_log.md`）。

### 视频（H3 T2VA 832×480 124帧 14步 cfg3 NVFP4+SageAttn2 ≈185s/条）
| 文件名 | prompt 方向 |
|--------|------------|
| vid_opening | 雨夜都市霓虹雨幕推近黑暗屏幕浮现猩红微光（开场CG，含雨声环境音） |
| vid_laser | 昏暗玻璃通道蓝色激光网格逐层推进灼切空气（激光通道演出） |
| vid_licker | 手电光束扫过黑暗天花板，肌肉怪物剪影缓缓爬行（BOSS登场） |

### 语音（本地 Qwen3-TTS 24kHz wav）
| 文件名 | 台词 |
|--------|------|
| vo_question | 想明白生命的意义吗？想真正的……活着吗？ |
| vo_rules | 欢迎来到主神空间。完成恐怖片世界的任务，就能活下去，用奖励点数兑换一切。 |
| vo_warning | 记住，在这里死了，就是真的死了。主神，不会复活新人。 |
| vo_mission | 主线任务发布：跟随佣兵小队进入蜂巢，关闭超级电脑红后，活着回到地面。 |
| vo_awaken | 就在此刻，你听见了心跳的声音。基因锁，第一阶段，开启。 |
| vo_settle | 任务完成。正在结算奖励点数与支线剧情评价。 |

### 环境音乐 / 音效
本地语音模型承载语音；环境音/心跳/低血量音效由 **WebView 内 WebAudio 实时合成**（零依赖本地模型），与桌面版共用。

## 六、技术形态

**Tauri v2（Rust 后端 `server-rs/` + WebView 前端）开放世界版**（非早期纯静态 HTML 单页）：
- **后端（Rust）**：`defs.rs`(剧本 DSL) / `maps.rs`(40×26×4 层 tile 网格+对象) / `world.rs`(移动/门禁/敌人巡逻/交互) / `scenes.rs`(80+ 节点/8 战) / `engine.rs`(战斗/结算/存档恢复) / `state.rs`(GameState 持久化)；多世界框架 P0 已并入（`worlds/mod.rs` WorldData/WORLDS/find_world + 显式 world 查询 + `migrate_save` v1→v2）。所有逻辑与状态权威在 Rust 侧，前端只渲染视图模型（IPC invoke 命令驱动）。
- **前端（JS）**：`world2d.js`（2D 俯视地图引擎, Canvas 迷雾开图）+ `zone3d.js`（Three.js 3D 副本, 敌人立绘精灵）+ `client.js`（IPC 桥接/模式切换/对话渲染）。
- 存档 `data/save.json`（`world_id/world_states/save_version=2/sp_grade`，兼容 v1）；死亡档案 `data/deaths.json`（最近 30 条）。
- 运行：`server-rs/target/release/wuxian-horror-ch1.exe`（依赖系统 WebView2，Win10/11 自带）。

## 七、生成纪律（遵循 rules/short-drama.md）

逐批生成 → 释放资源 → **qwen3.7-flash 识图子代理** 按 5 项判据（全身完整居中/设定匹配/过暗缺陷/棋盘格透明度/评级）质检 → 通过再下一批（不再用 ollama gemma；OpenRouter 生图已弃用）。
视频同理，逐条生成-释放-评估（视频管线未切 wan，仍为 H3 + ox-alpha 抽帧校验）。