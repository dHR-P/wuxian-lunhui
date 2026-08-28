//! 动态难度缩放（design: tools/design/dynamic_scaling_design.md）
//! 副本敌人强度 = 主角当前强度 × 副本难度系数。
//!
//! 原则：
//! - FightCfg 表数值 = 基准值（难度系数 1.0 时的数值），**不改表**，只在实例化 Fight 时缩放。
//! - 缩放是**乘法、线性**（hp/dmg/reward 三者同乘同 scale，保持比例）。
//! - `st.scaling_enabled == false` 时 `fight_scale` 恒 1.0（测试安全阀，保证既有 flow 数值回归全绿）。
//! - San 惩罚 / 环境伤害不缩放（场景机制，非敌人强度）。

use crate::defs::FightCfg;
use crate::state::{Fight, GameState};

/// 主角当前武器攻击贡献：现武器伤害中值 `(dmg.0+dmg.1)/2`；
/// 用户序：新装武器格（equipment.weapon）→ 旧 Weapon 枚举 → 无武器缺省 6。
/// 强化 +N（item_equipment_system_design.md §1.1/§4.3）：dmg 每级下限 +2、上限 +3，
/// 故中值逐级 +2.5。此处把 enhance 计入中值（向上取保护整数）。
pub fn weapon_atk(st: &GameState) -> i32 {
    if let Some(ws) = &st.equipment.weapon {
        if let Some(w) = crate::items_data::weapon_def(&ws.id) {
            let lo = w.dmg.0 + (ws.enhance as i32) * 2;
            let hi = w.dmg.1 + (ws.enhance as i32) * 3;
            return (lo + hi) / 2;
        }
    }
    if let Some(w) = st.weapon {
        let (a, b) = w.dmg();
        return (a + b) / 2;
    }
    6
}

/// 装备常驻攻击追加总和（护甲 + 饰品 + 法宝三格；无装备 0）。
pub fn equipped_atk_flat(st: &GameState) -> i32 {
    let mut a = 0;
    let eq = &st.equipment;
    if let Some(armor) = &eq.armor {
        if let Some(g) = crate::items_data::gear_def(armor) { a += g.atk_flat; }
    }
    if let Some(acc) = &eq.accessory {
        if let Some(g) = crate::items_data::gear_def(acc) { a += g.atk_flat; }
    }
    for t in eq.treasure.iter().flatten() {
        if let Some(td) = crate::items_data::treasure_def(t) { a += td.atk_flat; }
    }
    a
}

/// 主角强度（§二公式，单调增长；不新增字段）：
/// hp/20 + 武器攻击 + 基因锁阶×8 + 修真境界×6 + 装备攻击 + 技能数(上限 +20)。
pub fn power(st: &GameState) -> i32 {
    (st.hp as f32 / 20.0) as i32
        + weapon_atk(st)
        + (st.gene_stage as i32) * 8
        + (st.cultivation_stage as i32) * 6
        + equipped_atk_flat(st)
        + (st.skills.len() as i32).min(20)
}

/// 主角强度因子 P = clamp(power / 25.0, 0.6, 4.0)
pub fn power_factor(st: &GameState) -> f32 {
    (power(st) as f32 / 25.0).clamp(0.6, 4.0)
}

/// 副本难度系数 D（§三）：1→0.8, 2→1.0, 3→1.3, 4→1.6, 5→2.0；其余回退 1.0。
pub fn difficulty_scale(d: usize) -> f32 {
    match d {
        1 => 0.8,
        2 => 1.0,
        3 => 1.3,
        4 => 1.6,
        5 => 2.0,
        _ => 1.0,
    }
}

/// 当前世界的 difficulty（从 st.world_id → worlds::find_world → .difficulty）。
/// world 未注册/未知时回退 usize::MAX 边界外的难度基准 1.0（difficulty_scale 的 _ 分支）。
fn current_difficulty(st: &GameState) -> usize {
    let d = crate::worlds::find_world(&st.world_id).map(|w| w.difficulty as usize).unwrap_or(0);
    d
}

/// 整体缩放倍率 scale = D(副本难度系数) × P(主角强度因子)。
/// 关闭缩放开关（st.scaling_enabled == false）时恒 1.0（测试安全阀）。
pub fn fight_scale(st: &GameState) -> f32 {
    if !st.scaling_enabled {
        return 1.0;
    }
    let d = current_difficulty(st);
    difficulty_scale(d) * power_factor(st)
}

/// 按 scale 缩放 FightCfg → 实例化 Fight。
/// - id 由调用方给定（FightCfg 无 id 字段，构造点各自有权威 id）
/// - hp/max_hp = round(cfg.hp × scale)
/// - dmg = (round(cfg.dmg.0 × scale), round(cfg.dmg.1 × scale))
/// - reward = round(cfg.reward × scale)
/// - rage_at = cfg.rage_at.map(|r| round(r × scale))（与 hp 同源缩放）
/// - 其余字段照 cfg 填（name/reward_why/intro 不变）；pending_log 由调用方给定。
pub fn scaled_fight(id: &str, cfg: &FightCfg, st: &GameState, pending_log: Vec<String>) -> Fight {
    let s = fight_scale(st);
    let hp = (cfg.hp as f32 * s).round() as i32;
    let dmg = ((cfg.dmg.0 as f32 * s).round() as i32, (cfg.dmg.1 as f32 * s).round() as i32);
    let reward = (cfg.reward as f32 * s).round() as i32;
    let rage_at = cfg.rage_at.map(|r| (r as f32 * s).round() as i32);
    Fight {
        id: id.to_string(),
        name: cfg.name.to_string(),
        hp,
        max_hp: hp,
        dmg,
        reward,
        reward_why: cfg.reward_why.to_string(),
        raged: false,
        rage_at,
        guard_turn: false,
        pending_log,
    }
}