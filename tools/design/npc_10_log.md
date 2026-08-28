# 职业型 NPC 通用立绘 10 张 — 生成/质检/抠图/部署日志

- **时间**: 2026-08-28
- **工作目录**: `games/wuxian-horror-ch1`
- **产图模型**: tokenrhythm `wan2.7-image`（`tools/design/gen_wan.py: gen(prompt,"768x1024",out)`，0.2元/张）
- **质检模型**: tokenrhythm `qwen3.7-flash`（`tools/design/qc_npc10b.py`，data URL base64，max_tokens 3000，429/5xx 退避；判据按 NPC 身份修正，不误判「普通敌人」、不强制冷白 rim light）
- **抠图**: `tools/cutout_floodfill.py <in> <out> 16 --seal 2 --closing 1 --feather 2 --hole-channel 6 --hole-solid --zero-rgb`
- **comfy python**: `D:\AI_Tools\ComfyUI\python_embeded\python.exe`（scipy/numpy/PIL 齐备）
- **部署目录**: `server-rs/ui/assets/img/npc_<type>.png`

## 目标（10 类高频职业型 NPC，纯黑底 / 全身贴底 / 禁外泄白晕硬边 / 供 floodfill 抠图）
npc_guard 守卫 · npc_survivor 幸存者 · npc_watcher 守夜人 · npc_merchant 商人 ·
npc_doctor 医生 · npc_soldier 士兵 · npc_villager 村民 · npc_elder 老者 ·
npc_child 孩童 · npc_woman 现代女性NPC

## 生成批次（命中难点：5 张背景底部出现地面反光渐变）
| Slug | 定稿源 | raw-QC最终 | 说明 |
|------|--------|-----------|------|
| npc_guard | v4 | PASS | v1 背景底部渐变→v4 严格平黑 |
| npc_survivor | v2 | PASS | v1 手持白包裹不符「抱臂缩身」，v2 修正为空手抱胸 |
| npc_watcher | v1 | PASS | 首轮通过 |
| npc_merchant | v4 | PASS | v1/v3 底部渐变→v4 平黑 |
| npc_doctor | v4 | PASS | v1/v3 底部渐变→v4 平黑 |
| npc_soldier | v4 | 数值通过(仅枪口朝向装饰性偏差) | v2 手部手套已修; 枪口方向生成器稳定朝下, bg/complete/edges 数值全清; 外观/资质见遗留 |
| npc_villager | v1 | PASS | 首轮通过 |
| npc_elder | v4 | PASS | v1 底部渐变→v4 平黑 |
| npc_child | v1 | PASS | 首轮通过 |
| npc_woman | v1 | PASS | 首轮通过 |

> **难点与根因**: wan2.7 对多数站立（尤其亮色服装）NPC 会在画面底部画一条「地面反光/更亮渐变」(top 暗~10 / bottom 亮~45-52)，
> 使 floodfill 全局阈值 vs 对角种子无法清掉底部背景，暗色裤脚与其同亮度区间更难分割。
> 处理：改用 `gen_pc_zhanlan` 已验证能稳定输出均匀平黑(#000000、NO gradient/floor、bottom edge uniform black、剪影平贴背景)的措辞模板
> 重新生成 v4，五人 v4 背景四角 top≈3-8 / bottom≈4-8、无渐变，抠图干净。

## 质检结论（qwen3.7-flash，判据按 NPC 身份修正）
- **raw-QC PASS 9/10**: guard/survivor/watcher/merchant/doctor/villager/elder/child/woman 明确 PASS。
- **soldier**: 仅剩「枪口朝下」一项设定偏差；bg=1.0 / complete=1.0 / edges 数值无白条(见下)。枪口朝向为立绘姿式偏好，不影响抠图与游戏；接受该外观保留。
- **cut-QC（抠图后）系统性误报**: qwen3.7-flash 读不到 alpha 通道，把透明区在查看器里合成出的白色误判为「白色背景 / 白描边 / 腿残缺」——与 monster_10 既有结论一致。故抠图质量以**数值复核**为准。

## 数值复核（权威门槛，floodfill 抠图安全）
| Slug | 尺寸 | 外框10%透明% | 内部镂空px | 主体白色残缘px | mid半透明% |
|------|------|-------------|-----------|---------------|-----------|
| npc_guard | 768x1024 | 94.8 | 5 | 0 | 0.0 |
| npc_survivor | 768x1024 | 96.8 | 13 | 0 | 0.0 |
| npc_watcher | 768x1024 | 98.9 | 7 | 0 | 0.1 |
| npc_merchant | 768x1024 | 96.2 | 2 | 0 | 0.0 |
| npc_doctor | 768x1024 | 97.5 | 1 | 0 | 0.0 |
| npc_soldier | 768x1024 | 97.4 | 1 | 0 | 0.0 |
| npc_villager | 768x1024 | 94.5 | 3 | 0 | 0.1 |
| npc_elder | 768x1024 | 96.0 | 5 | 0 | 0.0 |
| npc_child | 768x1024 | 96.0 | 4 | 0 | 0.0 |
| npc_woman | 768x1024 | 98.5 | 0 | 0 | 0.0 |

- 全部 10 张：**外框 10% 边带透明度 ≥94.5%**（背景彻底抠空，全身贴底 full-bleed）✓
- 全部 10 张：**主体紧邻背景的白色残缘 = 0**（无白描边/无白晕外泄）✓ → 满足「禁外泄白晕 + 硬边」要求
- 全部 10 张：**内部镂空 ≤13px**（可忽略，--hole-solid 已填实）✓
- 全部 10 张：**半透明过渡带占面 ≈0**（边缘为干净硬边，非白灰晕）✓
- 透明像素 RGB=0（--zero-rgb）✓；bg≈(4-10) 近黑平底 ✓

## 花费
- 生图：v1×10 + v2×2(survivor/soldier) + v3×5(平黑探索试错,未采用) + v4×5(定稿平黑) = **22 张 × ¥0.20 = ¥4.40**
- 质检（qwen3.7-flash 视觉，~40 次）、抠图、本地数值复核：API/本地，未计入生图款。

## 部署清单（server-rs/ui/assets/img/）
| 文件 | 大小 | 来源 |
|------|------|------|
| npc_guard.png | 359,793 B | raw_npc10/npc_guard_v4CUT.png |
| npc_survivor.png | 389,021 B | raw_npc10/npc_survivor_v2.png（v2 cut） |
| npc_watcher.png | 441,534 B | raw_npc10/npc_watcher.png（v1 cut） |
| npc_merchant.png | 324,343 B | raw_npc10/npc_merchant_v4CUT.png |
| npc_doctor.png | 281,192 B | raw_npc10/npc_doctor_v4CUT.png |
| npc_soldier.png | 399,725 B | raw_npc10/npc_soldier_v4CUT.png |
| npc_villager.png | 429,813 B | raw_npc10/npc_villager.png（v1 cut） |
| npc_elder.png | 341,601 B | raw_npc10/npc_elder_v4CUT.png |
| npc_child.png | 366,007 B | raw_npc10/npc_child.png（v1 cut） |
| npc_woman.png | 272,653 B | raw_npc10/npc_woman.png（v1 cut） |

未改动任何 `.rs` 文件。

## 遗留 / 说明
1. **npc_soldier 枪口朝下**：生成器对士兵立绘稳定呈「胸前持枪、枪口朝右下」姿式，多次提示难以让枪口朝上；为装饰性外观，不影响抠图/游戏，予以接受（bg/complete/edges 数值均通过）。
2. **cut-QC 误报**：qwen3.7-flash 无法读 alpha，把透明合成白色误判为白边/残腿（同 monster_10）。抠图质量以数值复核为准（外框透明+零白缘）。
3. **背景梯度根因**：非纯黑背景来源于 wan2.7 对站立亮衣角色的「底部地面反光」倾向；已用 `gen_pc_zhanlan` 验证模板根治。若未来新增 NPC，直接复用该模板可避免本轮试错。
4. **接线后续**：`.rs` 接线未做（按任务「不碰 .rs」），后续接线方参考本日志部署清单引用 `npc_<type>.png`。

## 脚本
- `tools/design/gen_npc10.py`（v1 全 10 张）
- `tools/design/gen_npc10_v2.py`（survivor/soldier retry）
- `tools/design/gen_npc10_r3.py`（5 张平黑 v4 定稿）
- `tools/design/qc_npc10.py` / `qc_npc10b.py`（NPC 身份修正判据质检）
- `tools/design/cutout_npc10.py`（批量 floodfill 抠图+部署）
- 原素材：`tools/design/raw_npc10/*.png`（v1-v4 留档）
- 质检报告：`tools/design/qc_npc10/rawfix_*.md`
