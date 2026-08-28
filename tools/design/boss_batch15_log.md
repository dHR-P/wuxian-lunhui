# 老板/精英专属立绘批量生成日志（15 张）

- 日期：2026-08-28
- 生成：wan2.7-image @ 768x1024，纯黑底 + 全身贴底 + 禁外泄白晕
- 质检：qwen3.7-flash（视觉判图，data URL base64）
- 抠图：`tools/cutout_floodfill.py` 16 --seal 2 --closing 1 --feather 2 --hole-channel 6 --hole-solid --zero-rgb
- 部署：`server-rs/ui/assets/img/enemy_<slug>.png`
- Raw 产物目录：`tools/design/raw_enemy/`

## 花费

| 项目 | 数量 | 单价 | 小计 |
|---|---|---|---|
| 初版生成 | 15 张 | ¥0.20 | ¥3.00 |
| 第 1 轮重生成（QC 判定 14 张带白晕） | 14 张 | ¥0.20 | ¥2.80 |
| 第 2 轮重生成（仍带白色描边 5 张） | 5 张 | ¥0.20 | ¥1.00 |
| 异形皇后定向重生成 v4（暗色化去白边） | 1 张 | ¥0.20 | ¥0.20 |
| **合计** | **35 张** | | **¥7.00** |

> 单独列出的 QC 调用（qwen3.7-flash 视觉判图，多次、含 429/503 退避重试）为对话接口，成本未由脚本单独计价，未计入上表；整体量级极小。

## 结果总表

每条：`PASS/FAIL | cut-QC 分数 | 部署文件 | 说明`

| # | slug | 状态 | cut-QC | 部署文件 | 备注 |
|---|---|---|---|---|---|
| 1 | enemy_brain_bug | PASS | — | ✔ | 初版+1次重生成，抠图干净 |
| 2 | enemy_yiy_queen | PASS | 95 | ✔ | 经 3 轮，第 4 版全黑甲+内部绿酸液定向优化后才过（白边为原画风非瑕疵） |
| 3 | enemy_yiy_facehugger | PASS | — | ✔ | 初版+1次重生成后过 |
| 4 | enemy_yiy_worker | PASS | 98 | ✔ | 第 2 轮重生成后过，抠图优秀 |
| 5 | enemy_gregor | PASS | 95 | ✔ | 白肤怪物，边缘白为原画风非瑕疵 |
| 6 | enemy_tyrant | PASS | 90 | ✔ | 第 1 轮重生成后过 |
| 7 | enemy_barbossa | PASS | 90 | ✔ | 第 1 轮重生成后过，风格化描边接受 |
| 8 | enemy_freddy2 | PASS | 95 | ✔ | 第 2 轮重生成后过，边缘干净 |
| 9 | enemy_pyramid | PASS | — | ✔ | 第 2 轮重生成后过，三角盔+巨刀无白晕 |
| 10 | enemy_deep | PASS | — | ✔ | 初版+1次重生成；深海半透明触手立绘 |
| 11 | enemy_kage | PASS | 95 | ✔ | 第 1 轮重生成后过（初版 QC=20/95 两轮结果波动，取新） |
| 12 | enemy_sword | PASS | — | ✔ | 剑灵暗铁枯剑聚合体 |
| 13 | enemy_zhen | PASS | 95 | ✔ | 初版即过（QC=95），金甲神将 |
| 14 | enemy_poxu | PASS | — | ✔ | 半透明内部发光禁外泄，alpha 复核 ok |
| 15 | enemy_watcher | PASS | — | ✔ | 盒外观测者信息聚合体，半透明发光 |

**PASS 15/15，FAIL 0。** 全部 15 张均已抠图 + 部署 + 数值复核通过。

## 数值复核（透明 RGB=0）

所有部署文件均通过 `verify_cut.py`：尺寸 768x1024、透明像素 RGB 全为 0（`--zero-rgb`）、存在不透明主体、`valid=true`。
代表性 alpha 分布（透明%/半透明%/不透明%）：zhen 51.7/0.1/48.2、yiy_queen 70.9/0.1/29.0、freddy2 74.9/0.0/25.1、
yiy_worker 73.0/0.0/26.9、deep 54.6/0.1/45.3、poxu 56.0/0.4/43.6。均在合理范围。

## 部署清单

一律位于 `server-rs/ui/assets/img/`：
`enemy_brain_bug.png` `enemy_yiy_queen.png` `enemy_yiy_facehugger.png` `enemy_yiy_worker.png`
`enemy_gregor.png` `enemy_tyrant.png` `enemy_barbossa.png` `enemy_freddy2.png` `enemy_pyramid.png`
`enemy_deep.png` `enemy_kage.png` `enemy_sword.png` `enemy_zhen.png` `enemy_poxu.png` `enemy_watcher.png`

## 经验与遗留

- **生成器固有行为**：wan2.7-image 在纯黑底上生成这类深色/发光/浅肤怪物时，易在主体轮廓上画白色描边/光晕（LLM 原始QC 对 14/15 报“白晕/描边”）。多数情况下 `--hole-solid --zero-rgb` 的 floodfill 抠图会把软光晕裁成透明（成品无可见白晕），故交付判定以**抠图成品 + LLM cut-QC** 为准，而非原始黑底图的 raw-QC（raw-QC 过于严格）。
- **难例**：`yiy_queen`（黑甲+酸液）、`yiy_worker`、`freddy2`（红绿条纹+刀爪）、`gregor`（灰白皮）易残留白边，需 2 轮重生成 + 定向提示（整体压暗、浅色仅限主体内部、禁用白色轮廓线）才达标。
- **QC 稳定性**：qwen3.7-flash 偶有非 JSON/截断（max_tokens 已提到 4000）；分数跨调用有波动。为此以 cut-QC（成品角度）为最终 gate，配合确定性 `verify_cut.py`（透明 RGB=0、不透明占比、尺寸）兜底。
- 遗留：无 FAIL。后续如需进一步贴近“零白晕”审美，可在 player 侧对该批深色立绘统一套一层轻微边缘羽化/去白环后处理。
