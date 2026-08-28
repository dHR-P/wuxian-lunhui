# 测试面扩大落盘日志（强化/装备/血统/合成/动态缩放/人物NPC/兑换）

- **日期**：本会话（2026-08-27）
- **角色**：Rust 测试面扩大子代理（tokenrhythm/deepseek-v4-flash-0731）
- **工作目录**：`C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1`
- **授权改动**：`server-rs/tests/`（新增测试文件）；仅当测试暴露真 bug 时改对应 `server-rs/src/` 最小修复。
- **未改动**：engine.rs / state.rs / defs.rs 核心逻辑（未触碰）；不对任何 `.rs` 跑 `cargo build`（遵守"不 build --release"）。

---

## 一、新增测试文件与用例数（52 例，全绿）

| 文件 | 覆盖系统 | 用例数 |
| --- | --- | --- |
| `tests/dynamic_scaling_test.rs` | 动态缩放（power/power_factor/difficulty_scale/fight_scale/scaled_fight + 安全阀） | 10 |
| `tests/equipment_test.rs` | 装备穿戴（weapon/armor/accessory/treasure→atk/dodge/dmg_reduce）+ 武器强化 +N | 7 |
| `tests/bloodline_test.rs` | 血统（BLOODLINES 九条被动完整性与字段） | 14 |
| `tests/craft_test.rs` | 合成（RECIPES 消耗原料→产出 + 计数契约） | 8 |
| `tests/characters_test.rs` | 主神队友 NPC（张杰/郑吒/楚轩/詹岚/赵樱空）在世界表 + talk 场景 | 5 |
| `tests/exchange_test.rs` | 主神兑换（武器/护甲/饰品/血统/技能买入后 state 变化） | 8 |
| **合计** | | **52** |

---

## 二、测试暴露并修正的真 bug（均为最小改动）

1. **RECIPES 原料 id 张冠李戴（items_data.rs）**
   - `it_core_crystal` 配方原料误写 `"item_core_sample"`（该 id 不存在）；
   - `it_blood_essence` 配方原料误写 `"it_chushe_blood"`（真实掉落为 `"item_chushe_blood"`）。
   - 修正：改为正确 id（`it_core_sample` / `item_chushe_blood`）。否则「能量核心残片 / 血族精血」两条合成永远无法用真实材料达成。
   - 由 `exchange_craft_*` 系列 + `recipe_ingredients_defined_or_produced` 暴露。

2. **武器强化 `+N` 不计入战力（power.rs `weapon_atk`）**
   - 此前 `weapon_atk` 只取中值 `(dmg.0+dmg.1)/2`，忽略了 `equipment.weapon.enhance`。
   - 设计依据 `item_equipment_system_design.md` §1.1/§4.3：每级 dmg 下/上限 +2/+3。
   - 修正：`weapon_atk` 按 enhance 计入（下限 `+2*e`、上限 `+3*e` 再取中值）。仅影响 `power`/`power_factor`/`fight_scale`（scaling_enabled=true 时），scaling=false 时 fight_scale 恒 1.0，既有 flow 数据零回归。
   - 由 `weapon_enhance_raises_power` 暴露（"装备未生效"类）。

3. **法宝装备未写入装配权威 `equipment.treasure`（scenes.rs）**
   - 此前 `buy_item` 法宝分支与 `route_craft_tr_banner` 只把法宝写入 `st.treasures`（拥有标记），**未写** `equipment.treasure[slot]`（装配权威），而 engine 的 `gear_*`/power 的 `equipped_atk_flat` 全读 `equipment.treasure` → 法宝攻/减/闪加成实际不生效。
   - 修正：买/合法宝时同步写 `equipment.treasure[(slot).min(2)]`。engine/defs/state 未动，最小接线修复。
   - 由 `buy_treasure_wires_into_equipment_treasure` 暴露。

4. **拆 id 计数前缀撞车（items_data.rs `count_item`/`consume_item`）**
   - 方案 A 拆 id 用 `base` 或 `base_`（含任意后缀）匹配，导致 `it_enhance_stone` 会把 `it_enhance_stone_hi_1` 误计/误消耗（`starts_with("it_enhance_stone_")` 为真）。
   - 修正：`matches_base` 仅匹配 `base` 或 `base_<数字>`（方案 A 计数组件恒为 `base_数字`），既修撞车又不破坏非堆叠/数字堆叠调用方。
   - 由 `exchange_craft_enh_stone_chain`（合成高中级强化石后计数）暴露。
   - git 场景影响：此前合成高级强化石后 `has_item("it_enhance_stone")` 会误报（把高级当普通）。

> 已修改文件：`server-rs/src/items_data.rs`、`server-rs/src/power.rs`、`server-rs/src/scenes.rs`。未触碰 engine.rs/state.rs/defs.rs。

---

## 三、cargo test 结果

- 单文件逐一：6 个新文件各自 `cargo test --release` 全绿（bloodline 14 / characters 5 / craft 8 / dynamic_scaling 10 / equipment 7 / exchange 8）。
- 全量：`cargo test --release --no-fail-fast` → **exit 0**。
  - **总通过 252，失败 0**（68 个测试二进制全部 ok）。
  - 其中既有测试（flow/playthrough/migrate/nexus_exchange 等）保持全绿，未受本次 src 最小修复回归影响。
  - playthrough 全程一次通过，无 flaky 需重跑。
- 遵守约束：全程未执行 `cargo build --release`（仅 `cargo test --release`）。