# 战斗体系深度扩充 · 装备 / 强化落盘日志

- 日期：本会话
- 角色：战斗体系深化子代理（tokenrhythm/deepseek-v4-flash-0731）
- 授权改动文件：`server-rs/src/items_data.rs`、`server-rs/src/combat_data.rs`、`server-rs/src/scenes.rs`（仅兑换段附近）
- 未改动：engine.rs / state.rs / defs.rs / power.rs / lib.rs / worlds / 各 scenes_*.rs / 前端
- 原则：仅增量新增，不改动既有条目数值；工具统一复用 `has_grade_or`、`Route::Dyn`、`shop_cat!` 范式。

## 一、各表新增条数

| 表 | 原条数 | 新增 | 现条数 | 说明 |
| --- | --- | --- | --- | --- |
| WEAPONS | 10 | +10 | 20 | 各流派武器 |
| GEAR | 9 | +8 | 17 | 护甲 / 饰品（含 tech_shield 侧加成） |
| TRESURE_DEFS | 6 | +6 | 12 | 攻击 / 防御 / 辅助法宝 |
| BLOODLINES | 5 | +4 | 9 | 天使 / 恶魔 / 龙族 / 机械义体 |
| ITEMS | 24 | +5 | 29 | 强化石 ×2 + 新材料 ×3 |
| RECIPES | 2 | +6 | 8 | 新材料合成 / 法宝合成 |

> 注：任务背景写「ITEMS 19」，实测源表原有 24 条（含既有圣物凭证/任务剧情条目），本次仅新增 5 条，故 24 → 29；其余表原有条数与背景一致。

- 武器（+10，id 前缀 wp_/wpn_）：破军重镰、血戮剑、诛仙剑阵盘、量子湮灭刀、引力坍缩炮、噬魂幡、太虚神剑、电磁轨道狙击枪、纳米切割鞭、因果律护身剑。各含 dmg 区间 / dmg_type(kinetic/energy/holy/silver) / tier / 特殊属性。特殊属性沿用现有枚举 `WeaponSpecial::{Leech,Pierce,Burn,Stun}`（无独立 silver_hit/AoE 变体，以组合逼近：因果律护身剑 = silver + leech + stun 代表「破魔伤人」；诛仙剑阵盘 = burn + stun 代表范围压制）。
- 护甲 / 饰品（+8，gear_/access_ 前缀）：精金胸甲、虚无织物衣、绝对零度护甲、圣域板甲、幽冥披风、意志锚链、天庭灵气腰带（qi_max+80 / per_turn_qi+4）、纳米护盾核心（tech_shield 体系辅助 slot=Accessory，dmg_reduce 6 提供先手减伤）。
- 法宝（+6，treasure 前缀 tr_）：诛仙剑意图(slot0 攻)、血煞战旗(slot0 攻)、太虚玄光镜(slot1 防)、神雷辟邪佩(slot1 防)、锻心明镜(slot2 辅)、逆转生死盘(slot2 辅，ignore_death)。
- 血统（+4，bl_ 语义对齐现有被动结构 `BloodlinePassive`）：天使血统（SAN抗+12 减4）、恶魔血统（攻+12 吸血6 狂暴+15）、龙族血统（攻+6 受击减14）、机械义体血统（攻+8 减8 闪+0.08）。全部通过 `BLOODLINES` 表接入 `bloodline_of/def` 查询，互斥 hide。
- 强化材料 / 合成原料（ITEMS +5）：普通强化石、高级强化石、电磁炮核心、血族精血、法宝碎片。
- 配方（RECIPES +6）：it_em_core / it_blood_essence / it_treasure_frag / tr_blood_banner（法宝）/ it_enhance_stone / it_enhance_stone_hi。

## 二、兑换接入（scenes.rs，均走既有 `route_exchange_*` 模式）

- **道具铺**（CAT_SHOP）：新增 10 武器 + 8 护甲饰品 + 6 法宝 + 5 强化/新材料 全部以 `shop_cat!` 挂入，复用 `buy_item`（价格 / 评级门槛查表）。法宝通过 `buy_item` 的 `treasure_def` 分支写入 `st.treasures`。
- **血统兑换**（s_nexus_exchange_blood）：新增 4 条血统选项与独立 `route_exchange_angel/demon/dragon/cyberpro`（价格：9000A / 9500A / 10000A / 7800B），互斥 cond 复用 `cond_blood_none`。
- **合成工坊**（s_nexus_exchange_craft）：新增 6 条合成选项 + cond 复检原料；`tr_blood_banner` 为法宝合成特例，直接入 `st.treasures` 装配格（新 `route_craft_tr_banner`）。
- **武器强化线**：保留原「+1 需 1000 点」；新增「消耗普通强化石 +1（免费）」「消耗高级强化石 +2（免费，上至 +5）」两条，配 `route_enhance_stone / route_enhance_stone_hi`，且修复了装备可变借用与 consume_item 冲突的借用问题。

## 三、Cargo 结果

- `cargo check --tests` → `$LASTEXITCODE == 0`（无编译错误；仅既有与前缩略无关的 warning，如 unused_variables / snake_case，非本次引入生效项）。
- `cargo test --release --test nexus_exchange` → 6 通过 / 0 失败（既有 6 用例行为保持不变）。
- 未执行 `cargo build`（按任务要求不 build）。

## 四、遗留 / 说明

1. 新换代武器 / 护甲等级门槛沿用 D<C<B<A<S 评级体系；S 级（零度护甲、因果律剑、逆转生死盘）只有评级 S 才可兑换，为后期高难补充。
2. 新血统 / 被动已入 BLOODLINES 表，具体战斗应用由包 B（engine）统查 `bloodline_of`；本次未改 engine，故被动只进入静态表，战斗生效依赖既有血统结算分支（与现有 5 条一致，增量可被查表自然覆盖）。
3. 法宝合成特例（tr_blood_banner）走 `st.treasures` 装配格；其余新材料合成走通用 inventory 计数。
4. 后续如需「银弹/圣银」专属 `silver_hit` 与真「AoE」特殊属性，需在 `defs.rs` 的 `WeaponSpecial` 增加变体并同步包 B 结算（已超出本子代理授权范围）。