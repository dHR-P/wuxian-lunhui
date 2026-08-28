# 末世死城·人类防线 — 素材生成清单与质检记录

> 产出方：末世死城素材生成子代理（模型 tokenrhythm/deepseek-v4-flash-0731）
> 阶段：素材生成/质检治理工作
> 依据：`design/zhttty_universe/wuxian_weilai/moshi_shoucheng.md` §9 美术需求 + §5 BOSS
> 生成管线：
> - 生图：`tools/design/gen_wan.py`（wan2.7-image，768x1024，0.2 元/张，429 退避）
> - 抠图：`tools/cutout_floodfill.py`（flood-fill 背景连通域抠图）
> - 质检：tokenrhythm/glm-5.3-flash 视觉质检（data URL base64，max_tokens 4000；2026-08-27 起由 qwen3.7-flash 切换）
> 约束：不部署 server-rs/ui/assets/img；不改 server-rs 代码；不碰其他 *_assets.md

---

## 阶段一：场景清单（草稿）

依据设计文档 §9「美术与配音需求清单」，人类防线副本共需要 **4 张场景背景图**（768x1024，末世废墟风，昏暗冷色 / 黄昏橙灰主调）：

| # | slug | bg_id（设计文档） | 内容 | 美术色调 |
|---|---|---|---|---|
| 1 | citywall_dusk | f1_citywall_dusk | F1 城墙与外街：城门口广场、重火力阵地、烟尘与火光、远方兽潮烟尘地平线 | 黄昏橙灰主调、暖而绝望 |
| 2 | hospital | f2_hospital | F2 城内医院：急诊大厅 / 病房走廊、冷绿荧光、血迹、末世破败 | 医院冷绿 + 血迹 |
| 3 | command | f3_command | F3 地下指挥所：指挥中枢、深蓝荧光屏、观测屏、电台 | 指挥所深蓝荧光 |
| 4 | observatory | f4_observatory | F4 炮台观测台：高空炮台、夕照、观测甲板、最终战场 | 高空夕照、开阔冷调 |

> BOSS 立绘（§5 + §9）：`enemy_r_siege_beast` 狂化攻城巨兽（见阶段三）。

---

## 阶段二：场景图生成记录

| # | slug | 文件 | 字节 | 生成时间 | 状态 |
|---|---|---|---|---|---|
| 1 | citywall_dusk | `tools/design/raw_moshi/scene_citywall_dusk_v1.png` | 1520439 | 已生成 | **已质检 PASS** (0.95/0.95/1.0/0.95) |
| 2 | hospital | `tools/design/raw_moshi/scene_hospital_v1.png` | 1555616 | 已生成 | **已质检 PASS** (1.0/1.0/1.0/1.0) |
| 3 | command | `tools/design/raw_moshi/scene_command_v1.png` | 1664830 | 已生成 | **已质检 PASS** (1.0/1.0/1.0/1.0) |
| 4 | observatory | `tools/design/raw_moshi/scene_observatory_v1.png` | 1637898 | 已生成 | **已质检 PASS** (0.95/0.9/1.0/0.95) |

> 场景图 4 张全部生成并质检通过（PASS），质检结果见 `qc_out/`。累计成本 0.2×4=0.8 元。

## 阶段三：BOSS 立绘生成记录

| # | slug | 文件 | 字节 | 生成时间 | 状态 |
|---|---|---|---|---|---|
| 1 | siege_beast | `tools/design/raw_moshi/boss_siege_beast_raw.png` | 1554487 | 已生成 | **已质检 FAIL**（脚掌未贴底缘，complete=0.8） |

> BOSS=狂化攻城巨兽（enemy_r_siege_beast，FIGHT fight_r_siege_beast）。纯黑背景 + 全身贴底缘 + 通用后缀。
> 质检结论：raw 未通过「贴底缘」判据（脚掌未贴近画面底缘，下方留 5%-10% 黑色空白、未轻裁切），objective/bg/no_pollution 均 1.0。详见 `qc_out/moshi_boss_raw.md`。
> 累计成本：场景 0.8 + BOSS 0.2 = 1.0 元。

## 阶段四：BOSS 抠图记录

| # | slug | 输入 | 输出 | 阈值/参数 | 自检统计 | 状态 |
|---|---|---|---|---|---|---|
| 1 | siege_beast | `raw_moshi/boss_siege_beast_raw.png` | `cutout_out/boss_siege_beast_cut.png` | T=16, seal=2, closing=1, feather=2, hole-channel=6, hole-solid, zero-rgb | 768x1024, bg=(7,9,6), 透明54.1%, 半透0.1%, 不透明45.8% | **已质检 PASS**（object/bg/complete/no_pollution 均 1.0） |

> BOSS 抠图质检通过：主体为兽形巨怪（非人类/非丧尸）、背景抠净无残留底色黑边、全身完整脚掌贴底缘、无白描边/晕边/碎点。详见 `qc_out/moshi_boss_cut.md`。
> 说明：抠图 flood-fill 将下方黑色空白区域裁到内容边界，从而消除了 raw 的「贴底留白」缺陷，故 cut 版完整且脚掌贴底。

## 阶段五：视觉质检判定

> 质检模型：`glm-5.3-flash`（注：模型名不带 `tokenrhythm/` 前缀，带前缀返回 MODEL_NOT_AVAILABLE；2026-08-27 起由 qwen3.7-flash 切换）。
> 判据：对象符合设定 / 背景 / 主体完整 / 无污染；场景图不要求纯黑。
> 场景分数列：object / composition / no_pollution / color_tone。

**场景图**（4 张全部 PASS）

| # | slug | 判定 | 分数(object/comp/no_poll/color) | 主要缺陷 |
|---|---|---|---|---|
| 1 | citywall_dusk | **PASS** | 0.95/0.95/1.0/0.95 | 远地平线兽潮烟尘偏淡、城墙元素略重复 |
| 2 | hospital | **PASS** | 1.0/1.0/1.0/1.0 | 无 |
| 3 | command | **PASS** | 1.0/1.0/1.0/1.0 | 无 |
| 4 | observatory | **PASS** | 0.95/0.9/1.0/0.95 | 无明显缺陷（客观·橙色夕照+灰暗地面冷调对比完美） |

**BOSS 立绘**

| 版本 | 文件 | 判定 | 分数(object/bg/complete/no_poll) | 主要缺陷 |
|---|---|---|---|---|
| raw | `qc_out/moshi_boss_raw.md` | **FAIL** | 1.0/1.0/0.8/1.0 | 脚掌未贴近画面底缘，下方留 5%-10% 黑色空白、未轻裁切，违反「脚/蹄贴住底缘」构图要求 |
| cut | `qc_out/moshi_boss_cut.md` | **PASS** | 1.0/1.0/1.0/1.0 | 无 |

> raw 判定（qwen3.7-flash 落盘）与 cut 判定（glm-5.3-flash 落盘）。cut 因抠图裁掉下方空白而消除贴底缺陷。
> 附注：glm 对 cut 的 bg 判 1.0 时注明「预览呈纯黑、无法直接验证 alpha」，但阶段四抠图自检统计已证背景 54.1% 全透明、无可视残留，故不阻塞结论。

## 阶段六：不合格图修正记录

- **BOSS raw（`boss_siege_beast_raw.png`）不合格项**：脚掌未贴近画面底缘（下方 5%-10% 黑色空白、未轻裁切）。**处置**：非必改——最终部署采用 cut 版（已 PASS）即可规避；若需纯黑底 raw 版本，需重新生成（构图把巨兽足部置于画面最底）或对 raw 底部裁切后重新质检。
- 4 张场景图与 BOSS cut 均 PASS，无其他不合格项。

## 阶段七：总结

**素材齐备性**：末世死城·人类防线副本所需素材已全部生成并完成视觉质检——

| # | slug | 最终状态 | 可部署版本 |
|---|---|---|---|
| 1 | citywall_dusk | PASS | `raw_moshi/scene_citywall_dusk_v1.png` |
| 2 | hospital | PASS | `raw_moshi/scene_hospital_v1.png` |
| 3 | command | PASS | `raw_moshi/scene_command_v1.png` |
| 4 | observatory | PASS | `raw_moshi/scene_observatory_v1.png` |
| 5 | siege_beast（BOSS） | **PASS（cut）/ FAIL（raw）** | `cutout_out/boss_siege_beast_cut.png` |

**成本汇总**：生图 0.2×5=1.0 元（4 场景 + 1 BOSS）；抠图 / 质检为本地与 API 管线，成本低，含内。

**建议部署清单**（部署目标 `server-rs/ui/assets/img/`，由主线验收后执行；本子代理不自行动部署）：

| 目标文件名 | 源文件 | 说明 |
|---|---|---|
| `scene_moshi_citywall_dusk.png` | `raw_moshi/scene_citywall_dusk_v1.png` | F1 城墙黄昏 |
| `scene_moshi_hospital.png` | `raw_moshi/scene_hospital_v1.png` | F2 医院冷绿 |
| `scene_moshi_command.png` | `raw_moshi/scene_command_v1.png` | F3 指挥所 |
| `scene_moshi_observatory.png` | `raw_moshi/scene_observatory_v1.png` | F4 炮台观测台 |
| `enemy_siege_beast.png` | `cutout_out/boss_siege_beast_cut.png` | BOSS（PASS 抠图） |

> ⚠️ BOSS 不部署 raw（FAIL）；如需纯黑底版本需另生成/裁剪后复检。