# 末世死城·人类防线 — 素材质检收尾交付日志（round 2）

> 角色：素材质检与收尾专员（编程/文字模型 tokenrhythm/deepseek-v4-flash-0731）
> 视觉质检模型：`qwen3.7-flash`（raw，已完成落盘）+ `glm-5.3-flash`（cut，2026-08-27 模型切换后重跑）
> 质检 CLI：`tools/design/moshi_qc.py`（已更新为模型 glm-5.3-flash，并兼容 content/reasoning_content 双重提取）
> 游戏根目录：`C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1`

---

## 0. 过程日志（如实记录）

- raw 质检：先用 qwen3.7-flash 跑通并已落盘 `qc_out/moshi_boss_raw.md`（结论 FAIL）。按主线规则「已完成落盘的 qwen 结果无需重跑」，raw 结果保留。
- cut 质检：首次用旧 qwen 脚本跑，返回空内容失败（未落盘）。随后接入模型切换通知 → 将 `moshi_qc.py` MODEL 改为 `glm-5.3-flash` 并兼容 `reasoning_content`，用 glm-5.3-flash 重跑 cut。

---

## 1. BOSS raw 质检（qwen3.7-flash，已落盘）

- 文件：`tools/design/raw_moshi/boss_siege_beast_raw.png`（1,554,487 字节）
- 出处：`tools/design/qc_out/moshi_boss_raw.md`

```json
{
  "pass": false,
  "verdict": "FAIL",
  "scores": {"object": 1, "bg": 1, "complete": 0.8, "no_pollution": 1},
  "defects": ["贴底不达标:脚掌(爪子)未贴近画面底缘,下方留有约5%-10%的黑色空白区域,且未被轻裁切,不符合『脚/蹄贴住底缘』的立绘构图要求。"]
}
```

- 逐项：对象=Pass（巨型兽形巨怪、非人类/非丧尸，正确）；bg=Pass（纯黑平面，无投影/反光/渐变）；complete=0.8（主体完整，但未贴底缘、下方留白多）；no_pollution=Pass（无白描边/泛光）。

---

## 2. BOSS cut 质检（glm-5.3-flash，已落盘）

- 文件：`tools/design/cutout_out/boss_siege_beast_cut.png`（913,792 字节）
- 出处：`tools/design/qc_out/moshi_boss_cut.md`

```json
{
  "pass": true,
  "verdict": "PASS",
  "scores": {"object": 1, "bg": 1, "complete": 1, "no_pollution": 1},
  "defects": []
}
```

- 逐项：对象=Pass（巨型兽形巨怪：半直立弓身姿态、巨角带焰、巨爪、岩石外皮+熔岩裂纹、狂暴张口；非人类/非丧尸/非着装角色）；bg=Pass（背景均匀，无残留底色/黑边/光晕污染，火焰泛光属主体设计元素非抠图伪像）；complete=Pass（全身头到脚完整、脚爪贴到画面底缘并被轻裁切、下半身不呈剪影、无畸形融合）；no_pollution=Pass（无白描边/发灰晕边/散落碎点）。

---

## 3. 成本汇总

| 项 | 单价 | 数量 | 小计 |
|---|---|---|---|
| 场景图（wan2.7-image 768x1024） | 0.2 元/张 | 4 | 0.8 元 |
| BOSS 立绘（wan2.7-image 768x1024） | 0.2 元/张 | 1 | 0.2 元 |
| BOSS 抠图 + 4 场景质检 + 1 raw + 1 cut 质检（视觉模型 API） | 低 | — | 已计入管线，约可忽略/另计 |
| **累计生图成本** | | | **1.0 元** |

> 与 moshi_assets.md 阶段三记录一致：场景 0.8 + BOSS 0.2 = 1.0 元。

---

## 4. 建议部署清单（主线验收后方可执行，勿自行部署）

> 部署目标：`server-rs/ui/assets/img/`。建议命名如下（源文件→目标名）：

| 目标文件名 | 源文件 | 说明 |
|---|---|---|
| `scene_moshi_citywall_dusk.png` | `raw_moshi/scene_citywall_dusk_v1.png` | F1 城墙黄昏 |
| `scene_moshi_hospital.png` | `raw_moshi/scene_hospital_v1.png` | F2 医院冷绿 |
| `scene_moshi_command.png` | `raw_moshi/scene_command_v1.png` | F3 指挥所 |
| `scene_moshi_observatory.png` | `raw_moshi/scene_observatory_v1.png` | F4 炮台观测台 |
| `enemy_siege_beast.png` | `cutout_out/boss_siege_beast_cut.png` | BOSS 抠图（PASS） |

> 说明：
> 1. 4 张场景图均已 PASS，可直接部署对应源文件。
> 2. BOSS 优先部署 **cut**（PASS，透明底，脚爪贴底缘）；**不推荐部署 raw**（FAIL：脚掌未贴底缘、下方 5%-10% 留白，违反立绘构图要求）。若需 raw（纯黑底）版本，需重新生成或裁剪再质检。

---

## 5. 建议部署清单（最终）

- ✅ **建议部署**（4 场景 + BOSS cut），文件如上表。
- ⚠️ raw 不通过「贴底缘」判据，不建议直接部署；如需纯黑底版本需先修图。

---

## 6. 交付文件清单

- `tools/design/qc_out/moshi_boss_raw.md`（质检结论，FAIL）
- `tools/design/qc_out/moshi_boss_cut.md`（质检结论，PASS）
- `tools/design/moshi_assets.md`（阶段二~七更新）
- `tools/design/moshi_assets_log_round2.md`（本日志）
- `tools/design/moshi_qc.py`（MODEL 改为 glm-5.3-flash + reasoning_content 兼容）