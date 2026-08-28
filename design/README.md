# design/ —— 设计库

本目录承载游戏**设计侧一切内容**：zhttty 原著研究、副本设计、官方人物卡、各战斗/强化系统设计文档、各副本实现日志（`impl_log`）。

> 编排：本设计与实现强耦合——每个副本/系统的设计文档、实现日志，与 `server-rs/src/` 的代码、`server-rs/tests/` 的测试一一对应。改代码前先看设计，改完补 impl_log。

---

## 一、`design/zhttty_universe/` —— 原著研究 + 副本设计库（核心）

这是「Z 宇宙 / 无限流」的世界观设计库，新副本设计的**依据来源**。

| 文件 | 内容 |
|------|------|
| `00_ENGINE_CONTEXT.md` | **引擎能力与副本设计规范（必读）**：SceneDef DSL、open-world maps 六对象、数值口径、目录约定 |
| `00_INDEX.md` | **总索引**：统筹全部 7 部作品调研 + 15 个早期副本设计（含库结构说明、副本模板 10 节、引擎上下文摘要） |
| `00_INDEX_EXPANSION.md` | 索引扩展（覆盖后加入的更多副本） |
| `characters_reference.md` | 人物参照（凭内置知识、未联网核实版） |
| `characters_reference_official.md` | **官方人物卡（联网抓取整合版，权威）**：逐作品抓取百科人物资料，不确定标「未获取」，不臆造 |

### 7 部作品子目录（每部两个子项）

```
dayuzhou_shidai/    《大宇宙时代》：00_研究 + yiji_yize 远古遗迹遗泽 + shaqiu_mohai 沙丘魔海
honghuang_li/       《洪荒历》：00_研究 + tianshe_lab 天蛇族实验室 + yinse_dadi 银色大地
siwang_kaiduan/     《死亡开端》：00_研究 + daliexi 大裂隙 + siwuzhen 死雾镇
wuxian_kongbu/      《无限恐怖》：00_研究 + moruiya 摩瑞亚 + yiying 异形4 + zhouyuan 咒怨
wuxian_shuguang/    《无限曙光》：00_研究 + shixue_poxiao 破晓封锁区 + tiexue_jinzita 铁血地底金字塔
wuxian_weilai/      《无限未来》（废稿）：00_研究 + liangzi_yiji 量子遗迹 + moshi_shoucheng 末世死城
xiaxing_tianxia/    《侠行天下》：00_研究 + jianzhong 剑冢禁地 + jiguancheng 机关城核心
```

> 命名约定：作品子目录 `slug` 小写英文；每作 `00_<slug>_research.md`（作品研究）+ 若干 `<dungeon_slug>.md`（副本设计）。副本设计文档模板为 10 节（概述/设定依据/主题氛围/地图结构/敌人表/BOSS/剧情线/奖励支线/与主神衔接/美术配音需求/实现风险）——详见 `00_INDEX.md` §1.2。
>
> 另有抓取的百科原始 HTML（`baike_*.html` / `moegirl_*.html`）与部分作品的 `*.md` 剧情研究，供人物卡与副本设计溯源。

---

## 二、`tools/design/` —— 系统设计文档 + 实现日志 + 素材管线工作区

> 注：从目录归属看位于 `tools/design/`，但语义上属于**设计库与素材管线**，故在 `design/README.md` 一并说明。

### 2.1 核心系统设计文档（新系统/改数值前必读）

| 文件 | 系统 |
|------|------|
| `combat_system_design.md` | 战斗体系总设计 |
| `gene_lock_system_design.md` | 基因锁（阶/濒死觉醒/兑换） |
| `cultivation_system_design.md` | 修真境界（练气~合道/流派/真气） |
| `skills_system_design.md` | 技能（146 条分 9 学派） |
| `item_equipment_system_design.md` | 装备/道具/合成（武器/护甲/饰品/法宝 + 强化 +N） |
| `dynamic_scaling_design.md` | **动态难度缩放设计**（`power.rs` 实现依据） |
| `material_decision_log.md` | **素材账目与判定**（wan/Z-Image 生图、成本、历史明细；含音效/语音/BGM 账目） |
| `wan_prompts.md` | 生图 prompt 库 |
| `resolution_quality_log.md` | 三档分辨率 + HiDPI + 画质提升落地日志 |

### 2.2 副本与功能实现日志（impl_log，56 份）

每个副本 / 每批素材一个 `*_impl_log.md` / `*_log.md`，记录**实现了什么、数值基准、外部依赖**（如 lib.rs mod、worlds/mod.rs 注册、scenes.rs 挂接）。重要者：

- 副本：`<dungeon>_impl_log.md`（如 `moshi_impl_log.md`、`zhouyuan_impl_log.md`、`yize_impl_log.md`…共 56 份）
- 框架：`multi_world_impl_log.md`（多世界 P0）、`p1_nexus_impl_log.md`（主神空间 P1）、`p1_exchange_impl_log.md`（主神兑换）、`combat_impl_*.md`（战斗包 A）
- 素材：`bg_50_assets_log.md`、`boss50_assets_log.md`、`enemy_8_log.md`、`bgm_log.md`、`sfx_log.md`、`*_voice_log.md`、`*_assets_log.md`
- 纪律：`infinite_future_removal_log.md`（**《无限未来》废弃裁定**）、`merge_batch6_log.md` / `z_merge_batch*_log.md`（合并）

### 2.3 素材工作区（生图/质检/抠图中间产物）

- `raw_enemy/` 敌人/主角立绘原图；`preview_enemy/` 棋盘格预览
- `raw_50bg*` / `raw_bg_full` / `raw_boss50` / `raw_honghuang` / `raw_moshi` / `raw_jianzhong` / `raw_snapshot_*` — 各批次生图原图
- `cutout_boss50` / `cutout_out` / `qc_*` / `final_2008` — 抠图 / 质检 / 定稿产物
- `canon/` — 楼层/架构/BOSS 平台**权威设定 JSON**（引擎/文档引用，勿动）
- `audio_*` / `video_zhuyuan` — 语音 / 视频生成批次

> 具体工具脚本及其输入输出见 `tools/README.md`（`cutout_floodfill.py`、`gen_pc_sprite.py`、`gen_enemy_sprites.py`、`gen_zimage_batch.py`、`tr_vision.mjs` 等）。

---

## 三、`docs/`

- `GAME_DESIGN.md` — 早期《生化蜂巢》单章设计文档（章节流程/数值系统/死亡档案/素材清单）。已部分被 `zhttty_universe/` 与 `tools/design/` 取代，作早期参考保留。
- `DEVELOPMENT.md` — **开发工作流**（新副本三件套 / 注册 / 合并 / 测试 / 构建 / push / 红线 / 已知遗留）。见 `docs/DEVELOPMENT.md`。

---

## 四、给新副本设计的快速路径

1. 读 `00_ENGINE_CONTEXT.md` + `00_INDEX.md`（了解 DSL 与数值口径）。
2. 查对应作品 `00_<slug>_research.md` + 官方人物卡 `characters_reference_official.md`，核实剧情/人名（不确定标「待补」）。
3. 照 10 节模板写副本设计 `<slug>.md`（存对应作品目录）。
4. 用 `tools/gen_dungeons.mjs` 生成三件套骨架（worlds/`<slug>.rs`、`scenes_<slug>.rs`、`tests/<slug>_flow.rs`）→ `tools/gen_register.mjs` 注册 → `cargo check`/`test` → 补 impl_log（流程详见 `docs/DEVELOPMENT.md`）。
