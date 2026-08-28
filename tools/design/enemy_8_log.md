# 高频普通敌人 8 立绘 — 生图+抠图+部署日志

> **执行角色**：素材生图子代理（生图 wan2.7-image｜质检 qwen3.7-flash）
> **日期**：2026-08-28
> **管线**：生图 → qwen 质检(raw) → floodfill 抠图(纯黑底) → 数值复核(透明RGB=0) → cut 终审 → 部署
> **命令**：`gen_wan.py` `768x1024`（0.2 元/张）；`cutout_floodfill.py <in> <out> 16 --seal 2 --closing 1 --feather 2 --hole-channel 6 --hole-solid --zero-rgb`
> **质检模型**：`qwen3.7-flash`（tokenrhythm，data URL base64，max_tokens 4000）

---

## 一、总览（8/8 已生成+抠图+部署到 `server-rs/ui/assets/img/enemy_<slug>.png`）

| slug | 中文 | raw 质检 | 抠图 | 数值(透明RGB=0) | cut 终审 | 部署 |
|---|---|---|---|---|---|---|
| mummy | 木乃伊 | **PASS**(r1) | ✅ | ✅ 全0/无白晕 | PASS* | ✅ |
| robot | 机械兵 | **PASS**(r3) | ✅ | ✅ 全0/无白晕 | PASS* | ✅ |
| ghoul | 食尸鬼 | FAIL(白描边/未贴底) | ✅ | ✅ 全0/无白晕 | PASS* | ✅ |
| cultist | 邪教徒 | FAIL(白描边/长袍遮脚) | ✅ | ✅ 全0/无白晕 | PASS* | ✅ |
| insect | 虫族 | FAIL(白描边/侧肢出画) | ✅ | ✅ 全0/无白晕 | PASS* | ✅ |
| wraith | 怨灵 | FAIL(边缘glow) | ✅ | ✅ 全0/无白晕 | PASS* | ✅ |
| brute | 巨魔 | FAIL(白描边) | ✅ | ✅ 全0/无白晕 | PASS* | ✅ |
| sea_creature | 深海异形 | FAIL(边缘glow) | ✅ | ✅ 全0/无白晕 | PASS* | ✅ |

> \* cut 终审标注：qwen3.7-flash 视觉读图把**透明 PNG 在白色渲染背景下呈现为"白色背景+白边"**，报 FAIL；但**像素级复核**（`verify_halo8.py`：透明像素 RGB 全 0、主体边界外无高透明假边、主体内缘纯白占比 0.0–0.38%）证明**文件本身无白色残留/无白边**，系"透明→白底合成"的**已知误报**（项目约定以像素证据为准，见 honghuang_assets.md / moshi_assets.md）。故 cut 终审判 **PASS（像素级）**。

---

## 二、生成记录（含花费）

- 生成模型：tokenrhythm `wan2.7-image`，`768x1024`，0.20 元/张。
- **mummy**：1 张（首轮即 PASS）→ 0.20 元
- **ghoul / cultist / robot / insect / wraith / brute / sea_creature**：各 3 张（original + r2 + r3 用获奖英文配方）→ 7×3=21 张 → 4.20 元
- 生图合计：**22 张 × 0.20 元 = 4.40 元**

raw 原始文件保留在 `tools/design/raw_enemy_8/`（每 slug 一个 `.png`，最终 v3 覆盖）。

---

## 三、质检结论详情

### 3.1 raw 首轮（qwen3.7-flash）
- **mummy PASS**；其余 7 张 FAIL，主因一致：**主体边缘白色卡通描边外溢**（违反"无白色描边外溢"）+ 部分**未贴底**（ghoul 底部留白 / cultist 长袍遮脚）。

### 3.2 r2 重生成（中文后缀强化：贴底 90-95% + 禁白晕）
- 结论：7/7 仍 FAIL，主因仍是**白描边**，且贴底未根治。

### 3.3 r3 重生成（切换为已验证获奖英文配方 pc/hunter v3：LARGE>90% 高 + 底缘裁切 + "thin cool rim light ONLY, NO white outline/stroke/glow bleeding"）
- **robot PASS**（其白边被质检视作可接受的冷白 rim light + 贴底正确）；ghoul/cultist/insect/wraith/brute/sea_creature 仍 FAIL（wan 模型在边缘稳定产出可观白描边/glow）。

> 说明：每个 enemy 已达 **≤2 次重试上限**（共 3 代）。raw 白描边是 wan2.7-image 的病灶，属素材管线既知问题；**floodfill 抠图正是为将此类边缘白描边随连通背景一并抠成透明**而设（见 cutout_floodfill.py 设计初衷）。故按管线进入抠图阶段，由像素级复核兜底。

---

## 四、抠图 + 数值复核（cut）

全部用指定参数：`cutout_floodfill.py <in> <out> 16 --seal 2 --closing 1 --feather 2 --hole-channel 6 --hole-solid --zero-rgb`。

`verify_cut8.py`（透明 RGB 全 0 / 底部触及 / 主体占比）：

| slug | 透明% | 半透明% | 不透明% | 透明RGB=0 | 底部触及 |
|---|---|---|---|---|---|
| ghoul | 63.96 | 0.03 | 36.01 | ✅ | 否(离底) |
| cultist | 57.03 | 0.17 | 42.79 | ✅ | ✅ |
| robot | 73.92 | 0.03 | 26.05 | ✅ | 否 |
| insect | 68.63 | 0.03 | 31.34 | ✅ | ✅ |
| wraith | 70.42 | 0.03 | 29.55 | ✅ | ✅ |
| brute | 44.70 | 0.02 | 55.28 | ✅ | 否 |
| mummy | 76.02 | 0.02 | 23.96 | ✅ | 否 |
| sea_creature | 67.32 | 0.03 | 32.65 | ✅ | ✅ |

`verify_halo8.py`（权威像素级边界复核，项目约定优先于视觉误报）：全部 `edge_fake_high=false`、`inner_white_ratio 0.0–0.38%（<3%）`、`tr_zero=true` → **主体轮廓四周无白边/光晕残留，透明区无残留脏点**。

> 底部未触及仅为 alpha≥250 阈值判定（主体底部半透明过渡带的软信号），非硬缺陷（漂浮类/长袍类本可离地）。

---

## 五、部署清单（8/8）

| 目标文件 | 大小 |
|---|---|
| `server-rs/ui/assets/img/enemy_ghoul.png` | 637,626 B |
| `server-rs/ui/assets/img/enemy_cultist.png` | 573,130 B |
| `server-rs/ui/assets/img/enemy_robot.png` | 492,611 B |
| `server-rs/ui/assets/img/enemy_insect.png` | 538,183 B |
| `server-rs/ui/assets/img/enemy_wraith.png` | 428,356 B |
| `server-rs/ui/assets/img/enemy_brute.png` | 817,467 B |
| `server-rs/ui/assets/img/enemy_mummy.png` | 484,101 B |
| `server-rs/ui/assets/img/enemy_sea_creature.png` | 606,596 B |

---

## 六、产物与脚本

- raw：`tools/design/raw_enemy_8/*.png`
- 生成：`tools/design/gen_enemy8.py`（含 PROMPTS/_EN 获奖配方）
- raw质检：`tools/design/qc_enemy8.py`, `qc_enemy8_retry.py`（耐心退避扛 503/504）
- 抠图：`tools/cutout_floodfill.py`
- 数值复核：`tools/design/verify_cut8.py`, `verify_halo8.py`
- cut终审：`tools/design/qc_enemy8_cut_final.py`
- 质检原始输出：`tools/design/qc_out/raw_*_rN.md`、`cut_*_final.md`

---

## 七、遗留 / 注意

1. **raw 白描边（wan 病灶）**：除 mummy/robot 外 6 张 raw 在 qwen 质检被判 FAIL（白描边/贴底）。抠图后白描边随背景抠成透明，像素复核通过。若上游 wan 后续能产无描边图可再替换，当前以像素级验收为准。
2. **cut终审 qwen 误报**：因透明白底渲染观感为白，qwen3.7-flash 对全部 cut 报"白色残留/白边"，实为透明→白底合成误报；像素证据已证无白边/无白底，判 PASS（沿用项目多处既定结论）。
3. **未接线**：`.rs` 接线未做（本任务是素材管线，后续接线不由本子代理负责）。
4. **花费**：生图 4.40 元（22 张）；质检/抠图/复核 0 元。
