# 道具图标批量生成日志（20 个高频道具）

- 日期：2026-08-28
- 生图：`tools/design/gen_wan.py` 的 `gen(prompt,"768x768",out)`，模型 `wan2.7-image`（tokenrhythm），单张 768×768
- 质检：`qwen3.7-flash`（不含前缀），data URL base64 传图，判据：纯黑底 / 无文字水印 / 图标清晰可辨
- 部署目录：`server-rs/ui/assets/img/item_<id>.png`
- 脚本：`tools/design/item_icons/run_item_icons.py`（首批）、`rerun_item_icons.py`（FAIL 项硬化重跑）、`qc_icon.py`（质检）

## 20 个道具选型（按 `server-rs/src/items_data.rs` 的 ITEMS 事实表）

| 类别 | 实际 id | 游戏名 | 图标文件名 |
|---|---|---|---|
| 药类 | item_medkit | 强效医疗包 | item_medkit.png |
| 药类 | item_bandage | 紧急绷带 | item_bandage.png |
| 药类 | item_sedative | 镇静剂 | item_sedative.png |
| 药类 | item_antidote | 净化血清 | item_antidote.png |
| 弹药 | ammo_crate | 弹药盒 | ammo_crate.png |
| 投掷 | item_holy_water | 圣水 | item_holy_water.png |
| 投掷 | item_silver_bullet | 银弹 | item_silver_bullet.png |
| 投掷 | item_torch | 火把 | item_torch.png |
| 投掷 | item_grenade | 燃烧手雷 | item_grenade.png |
| 投掷 | item_bottle_water | 口袋圣水 | item_bottle_water.png |
| 符箓 | item_quzhen_fu | 驱邪符 | item_quzhen_fu.png |
| 符箓 | item_jiezhou_fu | 解咒符 | item_jiezhou_fu.png |
| 材料 | it_core_crystal | 核心晶石 | it_core_crystal.png |
| 材料 | it_blood_essence | 血族精血 | it_blood_essence.png |
| 材料 | it_soul_shard | 灵魂碎片 | it_soul_shard.png |
| 材料 | it_core_sample | 能量核心残片 | it_core_sample.png |
| 材料 | it_em_core | 电磁炮核心 | it_em_core.png |
| 材料 | it_enhance_stone | 普通强化石 | it_enhance_stone.png |
| 钥匙/凭证 | it_cross_key | 圣徽钥匙 | it_cross_key.png |
| 钥匙/凭证 | it_cross | 圣徽 | it_cross.png |

> 说明：任务清单中部分 slug（scroll卷轴 / map地图 / compass罗盘 / mithril秘银 / burning_grenade / exorcism_talisman / curse_removal）在 ITEMS 事实表无对应条目，按「以实际 ITEMS 表为准」补齐为表中的真实高频消耗/材料/凭证道具；强化石已有点（item_stone.png）不重复部署。

## 逐项结果

| # | id | 结果 | 尝试次数 | 生成花费 | 部署 | 备注 |
|---|---|---|---|---|---|---|
| 1 | item_medkit | ✅ PASS | 2 | 0.40 | 已部署 | r0 FAIL → r1 PASS |
| 2 | item_bandage | ✅ PASS | 3（重跑 1）| 0.60+0.20 | 已部署 | 首批 r0-r2 被误判为卫生纸卷 → 硬化重跑 PASS |
| 3 | item_sedative | ✅ PASS | 1 | 0.20 | 已部署 | r0 PASS |
| 4 | item_antidote | ✅ PASS | 3 | 0.60 | 已部署 | r2 PASS |
| 5 | ammo_crate | ✅ PASS | 3 | 0.60 | 已部署 | r2 PASS |
| 6 | item_holy_water | ✅ PASS | 3 | 0.60 | 已部署 | r2 PASS |
| 7 | item_silver_bullet | ✅ PASS | 3 | 0.60 | 已部署 | r2 PASS |
| 8 | item_torch | ✅ PASS | 3（重跑 1）| 0.60+0.20 | 已部署 | 首批橙色光晕刷背景 → 硬化重跑 PASS |
| 9 | item_grenade | ✅ PASS | 1 | 0.20 | 已部署 | r0 PASS |
| 10 | item_bottle_water | ✅ PASS | 1 | 0.20 | 已部署 | r0 PASS |
| 11 | item_quzhen_fu | ✅ PASS | 2 | 0.40 | 已部署 | r1 PASS |
| 12 | item_jiezhou_fu | ✅ PASS | 3（重跑 1）| 0.60+0.20 | 已部署 | 首批符上含"除"字 → 硬化重跑 PASS |
| 13 | it_core_crystal | ✅ PASS | 3（重跑 1）| 0.60+0.20 | 已部署 | 首批青色光晕刷背景 → 硬化重跑 PASS |
| 14 | it_blood_essence | ✅ PASS | 3 | 0.60 | 已部署 | r2 PASS |
| 15 | it_soul_shard | ✅ PASS | 3（重跑 1）| 0.60+0.20 | 已部署 | 首批蓝色光晕刷背景 → 硬化重跑 PASS |
| 16 | it_core_sample | ✅ PASS | 3 | 0.60 | 已部署 | r2 PASS |
| 17 | it_em_core | ✅ PASS | 2 | 0.40 | 已部署 | r1 PASS |
| 18 | it_enhance_stone | ✅ PASS | 1 | 0.20 | 已部署 | r0 PASS |
| 19 | it_cross_key | ✅ PASS | 2 | 0.40 | 已部署 | r1 PASS |
| 20 | it_cross | ✅ PASS | 2 | 0.40 | 已部署 | r1 PASS |

## 成本核算

- 首批 20 项生成花费：9.40 元（wan2.7-image 0.20 元/张 × 47 张，含服务繁忙 504/503 导致的过多重试）
- FAIL 项硬化重跑：1.00 元（5 张）
- **合计生成花费：10.40 元**（QC 为 qwen3.7-flash 文本调用，另计，未计入此数）

## 部署清单（20 个，均 768×768）

在 `games/wuxian-horror-ch1/server-rs/ui/assets/img/` 下，均已确认存在：
`item_medkit.png item_bandage.png item_sedative.png item_antidote.png ammo_crate.png
item_holy_water.png item_silver_bullet.png item_torch.png item_grenade.png item_bottle_water.png
item_quzhen_fu.png item_jiezhou_fu.png it_core_crystal.png it_blood_essence.png it_soul_shard.png
it_core_sample.png it_em_core.png it_enhance_stone.png it_cross_key.png it_cross.png`

## 遗留 / 说明

1. 任务清单中无 ITEMS 表实体的 slug（scroll/map/compass/mithril 等）未生成；如需这些，请先在 ITEMS 表补条目再委托。
2. tokenrhythm 服务在高频调用时出现多次 504/503（服务繁忙），导致首批部分道具为满足「≤2 次重试」被迫多生成；已用硬化 prompt 精确重跑 5 个 FAIL 项，均一次通过。
3. 强化石已有旧图 item_stone.png，未覆盖；本批新增 it_enhance_stone.png（普通强化石 id）。
4. 质检严格按「纯黑底」判——发光类道具（火把/晶石/灵魂碎片）在首批因背景光晕被 QC 拒，重跑时通过「光晕收敛进主体、背景纯黑」提示解决。
