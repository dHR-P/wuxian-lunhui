# NPC 立绘 + 道具图标 素材落盘日志

- 日期: 本条为子代理交付记录
- 工作目录: `C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1`
- 管线: `tools/design/gen_wan.py`(wan2.7-image, 768x1024) → qwen/glm 视觉质检(qwen_qc.py) → NPC 用 `tools/cutout_floodfill.py` 洪水填充抠图 → 部署
- 质检模型: `qwen_qc.py` 实际调用 `glm-5.3-flash`(与项目最新识图约定一致, 见 CLAUDE.md 2026-08-27 修订)

---

## A. NPC 队友立绘(3 张, 已抠图部署)

| slug | 角色 | 立绘质检 | 抠图质检 | 部署文件 | 尺寸 | 抠图统计 |
|---|---|---|---|---|---|---|
| pc_chuxuan | 楚轩(鸿钧转世, 中洲队首席智者, 大校, 戴细框眼镜, 军装, 无感情冷静理性) | PASS | PASS | `server-rs/ui/assets/img/pc_chuxuan.png` | 768x1024 | alpha<=5:78.7% / >=250:21.3% |
| pc_zhanlan | 詹岚(精神力控制者, 知性现代女性) | PASS | PASS | `server-rs/ui/assets/img/pc_zhanlan.png` | 768x1024 | alpha<=5:83.4% / >=250:16.6% |
| pc_zhaoyingkong | 赵樱空(刺客世家天才, 冷艳女刺客) | PASS | PASS | `server-rs/ui/assets/img/pc_zhaoyingkong.png` | 768x1024 | alpha<=5:77.9% / >=250:22.0% |

- **pc_zhengzha(郑吒)**: 已存在 `server-rs/ui/assets/img/pc_zhengzha.png`, 按任务要求跳过未重复生成。
- 原始产物(raw 未抠图)保留在 `tools/design/raw_npc/*.png`。
- 抠图参数: `cutout_floodfill.py <in> <out> 16 --seal 2 --closing 1 --feather 2 --hole-channel 6 --hole-solid --zero-rgb`。

## B. 道具图标(6 个, 方形 768x768, 纯黑平底, 直接存档)

| slug | 道具 | 质检 | 部署文件 |
|---|---|---|---|
| item_health | 血瓶(红色药液玻璃瓶) | PASS(r2 重生成) | `server-rs/ui/assets/img/item_health.png` |
| item_core | 能量核心(青蓝水晶球体) | PASS(r2 重生成) | `server-rs/ui/assets/img/item_core.png` |
| item_holy | 圣水(圣光水瓶) | PASS(r2 重生成) | `server-rs/ui/assets/img/item_holy.png` |
| item_rune | 符文(紫色发光符文石) | PASS(r1) | `server-rs/ui/assets/img/item_rune.png` |
| item_stone | 强化石(琥珀橙结晶) | PASS(r2 重生成) | `server-rs/ui/assets/img/item_stone.png` |
| item_fragment | 法宝碎片(断裂金色残片) | PASS(r1) | `server-rs/ui/assets/img/item_fragment.png` |

- r1 的 health/core/holy/stone 因「发光光晕泄入纯黑背景 + 物体边缘亮白高光描边」QC FAIL,
  已按「光仅存于物体轮廓内、四周纯黑平底、无光环/无光晕外泄」收紧提示词重生成,
  r2 均 PASS。
- 图标按任务「纯黑底或透明底、方形」直接存纯黑底 PNG(无需抠图), 符合要求。

## C. 生成成本

| 项 | 张数 | 单价(元/张) | 小计(元) |
|---|---|---|---|
| NPC 立绘(3 张) | 3 | 0.2 | 0.6 |
| 道具图标 r1(6 张) | 6 | 0.2 | 1.2 |
| 道具图标 r2 重生成(4 张) | 4 | 0.2 | 0.8 |
| **生成合计** | 13 | | **2.6** |

- 生成(GPU)成本合计约 **2.6 元**。
- 视觉质检调用(tokenrhythm chat completions, glm-5.3-flash)成本未按 CNY 单独计价(不计入上述生成账单)。

## D. 部署清单(server-rs/ui/assets/img/)

新增/落地 9 个文件:
```
pc_chuxuan.png       (768x1024, 透明PNG)
pc_zhanlan.png       (768x1024, 透明PNG)
pc_zhaoyingkong.png  (768x1024, 透明PNG)
item_health.png      (768x768, 纯黑底)
item_core.png        (768x768, 纯黑底)
item_holy.png        (768x768, 纯黑底)
item_rune.png        (768x768, 纯黑底)
item_stone.png       (768x768, 纯黑底)
item_fragment.png    (768x768, 纯黑底)
```

## E. 质检原始输出

落盘于 `tools/design/`:
- NPC raw: `qc_pc_chuxuan.md`, `qc_pc_zhanlan.md`, `qc_pc_zhaoyingkong.md`
- NPC cutout: `qc_pc_chuxuan_cut.md`, `qc_pc_zhanlan_cut.md`, `qc_pc_zhaoyingkong_cut.md`
- 道具: `qc_item_health.md`(r1 FAIL) / `qc_item_health_r2.md`(PASS), `qc_item_core*.md`, `qc_item_holy*.md`,
  `qc_item_rune.md`, `qc_item_stone.md`(r1 FAIL) / `qc_item_stone_r2.md`(PASS), `qc_item_fragment.md`

> 注: 视觉质检对「透明 PNG 背景是否透明」「角色身份与设定」无法严格从渲染图确认,
> 其备注仅为质检说明性提示, 结论均为 PASS; 抠图透明比例(alpha<=5 77~83%)与
> 不透明比例(16~22%)符合全身立绘常规预期(人物占画面高占比)。

## F. 遗留 / 备注

- `.rs` 接线未做(按任务「不碰 .rs」)。后续接线方参考本日志部署清单引用素材文件名。
- 若未来需「透明底」道具图标(而非纯黑底), 可对 item_*.png 复用 floodfill 抠图或改透明背景生成; 当前图标为纯黑底方形, 符合任务「纯黑底或透明底」二选一。
