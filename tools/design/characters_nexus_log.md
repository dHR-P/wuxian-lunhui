# 主神空间 · 中洲队队友 NPC 接入日志

> 产出方：原著人物接入子代理（模型 tokenrhythm/deepseek-v4-flash-0731）
> 目标：把 `design/zhttty_universe/characters_reference.md` §一 中洲队核心角色还原为主神空间的队友 NPC，
> 对话/性格/台词还原 zhttty《无限恐怖》原著。
> 改动范围：仅 `server-rs/src/scenes.rs`（主神空间 s_nexus 场景段）与 `server-rs/src/worlds/zhutian.rs`（ZHUTIAN 的 NPCS 队友表）。
> 不写真相线/阴谋，不战斗，纯文本展示世界/人物，route 回主神广场 hub。

---

## 已接入的队友 NPC（5 人，floor=0 主神广场）

| NPC | 世界表 id | 场景 id | 坐标 (x,y) | 摆位 |
|---|---|---|---|---|
| 张杰 | `n_zhangjie_nexus` | `s_nexus_zhangjie` | (7,11) | 半圆广场西侧（既有引导者） |
| 郑吒 | `n_zhengzha_nexus` | `s_nexus_zhengzha` | (12,10) | 广场东侧 |
| 楚轩 | `n_chuxuan_nexus` | `s_nexus_chuxuan` | (16,9) | 广场北侧 |
| 詹岚 | `n_zhanlan_nexus` | `s_nexus_zhanlan` | (14,13) | 广场西南 |
| 赵樱空 | `n_zhaoyingkong_nexus` | `s_nexus_zhaoyingkong` | (8,14) | 广场南缘 |

> 坐标均为 floor=0 主神广场空地，与中央主神光柱/南侧兑换光球/西南复活祭坛等已有调查点错开。

---

## 各人对话还原的原著特质

- **张杰（引导者）**：老兵的平静冷漠 →「这里的规则很简单」「别死在第一次轮回里，这里没人给你收尸」；引导者口吻，负责新人生存说明 / 复活祭坛 / 轮回重启。已有场景保留未动。
- **郑吒（热血重情义）**：从最底层成长的自述（「第一次进《生化》吓得腿抖」）；「掉队的人真的会死」「把队友当家人，谁动他们先过我这一关」——还原其重情义、护短、为活下去不惜代价的核心张力；引导新人「先变强才有资格守护别人」。
- **楚轩（冷静理性布局）**：标志性台词「圣人不仁，以天地万物为刍狗」+「真正的布局从不做无谓的牺牲」；理性投资论——**明确提示「先去兑换，把点数花在保命能力上」并 route 到 `s_nexus_exchange`**（兑换引导落地）。
- **詹岚（知性）**：情报 > 血统的分析口吻；「想得多的人往往多活几轮」；情感稳定锚点 + 与郑吒的淡淡情感线（「郑吒总嫌我想太多」）。
- **赵樱空（冷艳刺客）**：寡言、冷漠刀锋感（「那目光冷得像刀锋」「不要挡我的路」「我不靠嘴活着」）；刺客活法引导（身法/隐匿/一击毙命技法 → 兑换光球）；「别死在我前面」职业性疏离中的克制冷暖。

### 通用设计
- 每场 1–3 段纯文本对话，speaker 为对应角色，展现性格/口吻；
- 每人对话尾提供「前往兑换目录」入口 `route: s_nexus_exchange`（楚轩/郑吒/詹岚/赵樱空均嵌），增强可用性；
- 兜底选项 `route: s_nexus_god` 回到主神广场 hub，避免死路。

---

## 变更文件
- `server-rs/src/worlds/zhutian.rs` — ZHUTIAN 世界 `NPCS` 表新增 4 名队友 NPC（张杰已有）。
- `server-rs/src/scenes.rs` — 主神空间场景段 `s_nexus_zhangjie` 之后新增 4 个对话场景 `s_nexus_zhengzha / s_nexus_chuxuan / s_nexus_zhanlan / s_nexus_zhaoyingkong`。

## 验收结果
- `cargo check`：详见主代理汇报（`$LASTEXITCODE==0`）。
- `cargo test --release --test nexus_exchange`：6/6 仍绿（未改动任何既有兑换条目）。

*原著人物接入子代理 · tokenrhythm/deepseek-v4-flash-0731*