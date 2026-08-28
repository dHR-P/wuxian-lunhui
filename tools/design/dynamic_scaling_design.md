# 动态难度缩放设计（副本强度 = 主角当前强度 × 副本难度系数）

> 用户需求（2026-08-27）：主线是探索，不做「从弱到强」的线性 BOSS 关卡。每个小副本有不同敌人（有的可无敌人）。副本之间无前后关系，**进入副本时敌人强度以「主角当前强度」为基准，由副本难度系数决定增强或削弱**。

## 一、核心公式

进入战斗（或进入副本）时，对敌人数值做缩放：

```
scale        = 副本难度系数(D) × 主角强度因子(P)
enemy.hp     = round(cfg.hp   × scale)
enemy.dmg    = round(cfg.dmg  × scale)
enemy.reward = round(cfg.reward × scale)
```

- `cfg.*` 是 FightCfg 里写的**基准值**（即难度系数 = 1.0 时的数值，也是当前所有副本已写的数值）。
- 缩放是**乘法**、**线性**，不破坏既有副本逻辑；主角强度不变时若 D=1 且 P=1，则数值与现在完全一致（向后兼容，红线）。

## 二、主角强度因子 P（以主角当前强度为基准）

主角强度 `power` 由现有状态字段综合（不新增字段），单调增长：

```
power = hp 成分 + 武器攻击 + 基因锁阶 + 修真境界 + 装备攻击 + 技能数贡献
```

具体建议值（可调）：
```
weapon_atk(st): 现武器伤害中值（无武器则 6；消防斧 ~10；枪 20+；圣剑等按 Weapon 表）
power = (st.hp / 20)           // 血量成长（hp 100→5；后期 hp 高则涨）
      + weapon_atk(st)         // 武器（6→20+）
      + gene_stage(st)×8       // 基因锁 0-4 阶，每阶 +8
      + cultivation_stage(st)×6// 修真 0-7 阶，每阶 +6
      + equipped_atk_flat(st)  // 装备攻击加成（无装备 0）
      + (st.skills.len()×1)    // 技能数（每个 +1，上限 +20）
```

主角强度因子 P 映射（让敌人跟上主角成长，同时开局不至于被数值淹没）：
```
P = clamp(power / 25.0, 0.6, 4.0)
```
- 开局（power≈低）→ P≈0.6~1.0
- 后期（power 高）→ P 上探 2.0~4.0
- 下限 0.6 保证从不一拳清屏、上限 4.0 防止数值爆炸。

## 三、副本难度系数 D

复用现有 `WorldData.difficulty`（当前值 1/2/3），但**语义改为缩放倍率**：

| difficulty | 语义 | D 系数 |
|---|---|---|
| 1 | 简单/探索 | 0.8 |
| 2 | 标准 | 1.0 |
| 3 | 困难 | 1.3 |
| (新增 4/5 可选) | 地狱/绝境 | 1.6 / 2.0 |

> 现有副本 difficulty 已填 2 或 3，直接映射即可，无需改 world 文件；主线 merge 时把 shaqiu/yize/po/tie 等已在 difficulty 的保持，若用了 1 则映射 0.8。

## 四、实现落点（改 engine 层，副本文件不动）

1. `state.rs`（或新增 `power.rs`）：加 `pub fn power(st: &GameState) -> i32` + `pub fn power_factor(st: &GameState) -> f32` + `pub fn difficulty_scale(d: usize) -> f32`。
2. `engine.rs` 战斗起始处（fight_start / 用 fight_cfg 构造 Fight 的地方）：读当前世界的 difficulty（从 `st.world_id` → `worlds::find_world`），算 scale，把 FightCfg 的 hp/dmg/reward 缩放后写入 Fight 结构。**基点是不改 FightCfg 表本身**（保持基准值），只在「实例化 Fight」时缩放。
3. 选择驱动 BOSS（各 scenes 里手动 `start_xxx` 构造 Fight 的）也要走同一缩放——为此提供引擎级辅助 `crate::engine::spawn_fight(cfg, st) -> Fight`，让选择驱动 BOSS 也调用它（或在 start_xxx 里统一乘 scale）。为最小侵入：新增 `world::fight_scale(st) -> f32`，各 start_xxx 构造 Fight 时把 hp/dmg 乘上它。

## 五、红线与验收
- FightCfg 表数值 = 基准值，**不改**；缩放只在实例化时。
- scale=1.0 时数值与现状完全一致（向后兼容）；先实现 + 验证 `scale == 1.0` 路径下全量测试仍全绿（playthrough/6副本 flow/各世界 flow 不破坏）。
- 主角强度只增不减（装备/境界/技能只增），故 P 单调，副本随时重进都会按当前强度重算——「无前后关系」达成。
- 敌人 hp/dmg/reward 三者同乘 scale，保证比例不失衡；San 惩罚、环境伤害不缩放（它们是场景机制不是敌人强度）。

## 六、测试
新增 `tests/dynamic_scaling.rs`：
1. `power_monotonic`：买武器/升基因锁/升修真 → power 增加。
2. `scale_formula`：给定 difficulty → D 正确；power → P 正确；scale=D×P。
3. `fight_scaled`：用某 fight_cfg + 高 power 主角，构造 Fight 后 hp/dmg 相对基准值增大；低 power 主角减小。
4. `backward_compat`：固定 D=1.0 且构造时 P 强制 1.0（或提供关闭开关）→ 数值==基准值。