//! 战斗体系数据层（包 A）：基因锁 / 血统 / 敌人战斗修饰 / 修真境界 / 战斗内道具 静态表。
//! 仅数据铺装与查询 helper，不含任何战斗结算逻辑（结算由包 B 做）。
//! 全部数值「建议值·可调」，拷贝自 tools/design/* 设计文档。

use crate::defs::{
    BattleMods, BloodlineDef, CultivationStageCfg, FightItemEffect, GeneStageCfg,
    ItemEffect, ItemSub,
};
use crate::state::GameState;

// ============================================================================
// GENE_STAGES · 基因锁各阶（gene_lock §1.1~1.4，口径与 combat §1.1 一致）
// 一阶D/二阶B/三阶A/四阶A顶；濒死 horn：hp<=阈值额外叠（§1.1~1.4 建议值）
// ============================================================================
pub const GENE_STAGES: &[GeneStageCfg] = &[
    GeneStageCfg {
        stage: 1,
        name: "战斗本能",
        sp_grade: Some('D'),
        atk: (6, 12),
        dodge: 0.15,
        dmg_reduce: 4,
        finisher_bonus: 0,
        hp_low_threshold: 30,
        awakening_cost_san: 8,
    },
    GeneStageCfg {
        stage: 2,
        name: "肌肉掌控",
        sp_grade: Some('B'),
        atk: (12, 20),
        dodge: 0.18,
        dmg_reduce: 8,
        finisher_bonus: 15,
        hp_low_threshold: 25,
        awakening_cost_san: 8,
    },
    GeneStageCfg {
        stage: 3,
        name: "精神领域",
        sp_grade: Some('A'),
        atk: (20, 30),
        dodge: 0.20,
        dmg_reduce: 12,
        finisher_bonus: 25,
        hp_low_threshold: 20,
        awakening_cost_san: 10,
    },
    GeneStageCfg {
        stage: 4,
        name: "规则之门",
        sp_grade: Some('A'), // 顶
        atk: (30, 40),
        dodge: 0.22,
        dmg_reduce: 16,
        finisher_bonus: 40,
        hp_low_threshold: 15,
        awakening_cost_san: 15,
    },
];

// ============================================================================
// BLOODLINES · 血统池（combat §1.2；vampire 迁入，被动对现 is_vampire 内联行为等价）
// 现有内联：vampire → 受击减 3（reduce3）、命中吸血 4（leech4）
// ============================================================================
pub const BLOODLINES: &[BloodlineDef] = &[
    BloodlineDef {
        id: "vampire",
        name: "初级吸血鬼血统",
        desc: "夜属于你——每一次撕裂都把敌人的生命汲为己有。",
        passive: crate::defs::BloodlinePassive {
            atk_flat: 0, leech_on_hit: 4, dodge_bonus: 0.0, dmg_reduce: 3, san_resist: 0,
            rage_bonus_atk: 0, label: "攻击吸血·受击减3",
        },
    },
    BloodlineDef {
        id: "werewolf",
        name: "狼人血统",
        desc: "远祖的兽性在月下苏醒——近身撕裂，狂暴时更凶。",
        passive: crate::defs::BloodlinePassive {
            atk_flat: 8, leech_on_hit: 0, dodge_bonus: 0.05, dmg_reduce: 2, san_resist: 0,
            rage_bonus_atk: 10, label: "攻+8·狂暴+10·减2",
        },
    },
    BloodlineDef {
        id: "zuwu",
        name: "祖巫血脉",
        desc: "远古其骨：肉身即壁垒，兽潮炎魔亦难破。",
        passive: crate::defs::BloodlinePassive {
            atk_flat: 0, leech_on_hit: 0, dodge_bonus: 0.0, dmg_reduce: 10, san_resist: 0,
            rage_bonus_atk: 0, label: "受击减10 高坦",
        },
    },
    BloodlineDef {
        id: "zhanshi_blood",
        name: "圣光圣职者血脉",
        desc: "圣祷加持心神，克制咒怨与日光光环。",
        passive: crate::defs::BloodlinePassive {
            atk_flat: 0, leech_on_hit: 0, dodge_bonus: 0.0, dmg_reduce: 0, san_resist: 8,
            rage_bonus_atk: 0, label: "SAN抗+8",
        },
    },
    BloodlineDef {
        id: "gauss_cyber",
        name: "纳米血统·共振",
        desc: "与机械共感（科技侧预留）。",
        passive: crate::defs::BloodlinePassive {
            atk_flat: 4, leech_on_hit: 0, dodge_bonus: -0.01, dmg_reduce: 6, san_resist: 0,
            rage_bonus_atk: 0, label: "攻+4·减6·闪-0.01",
        },
    },
    // ---- 增量扩充（第 2 批 · 天使/恶魔/龙族/机械义体）----
    BloodlineDef {
        id: "angel_bloodline",
        name: "天使血统",
        desc: "圣光凝筑双翼，心志如炽——暗秽退散，濒死亦能历光重生。",
        passive: crate::defs::BloodlinePassive {
            atk_flat: 0, leech_on_hit: 0, dodge_bonus: 0.0, dmg_reduce: 4, san_resist: 12,
            rage_bonus_atk: 0, label: "SAN抗+12·受击减4",
        },
    },
    BloodlineDef {
        id: "demon_bloodline",
        name: "恶魔血统",
        desc: "以血祭炼，以命换力——每一次撕裂都从敌人处夺回生机。",
        passive: crate::defs::BloodlinePassive {
            atk_flat: 12, leech_on_hit: 6, dodge_bonus: 0.0, dmg_reduce: 0, san_resist: 0,
            rage_bonus_atk: 15, label: "攻+12·吸血6·狂暴+15",
        },
    },
    BloodlineDef {
        id: "dragon_bloodline",
        name: "龙族血统",
        desc: "龙魂入髓，钢鳞覆皮——本体即为最凶之器，鳞甲坚不可摧。",
        passive: crate::defs::BloodlinePassive {
            atk_flat: 6, leech_on_hit: 0, dodge_bonus: 0.0, dmg_reduce: 14, san_resist: 0,
            rage_bonus_atk: 0, label: "攻+6·受击减14 高坦",
        },
    },
    BloodlineDef {
        id: "cyber_prosthetic",
        name: "机械义体血统",
        desc: "机械器官与神经同频——身负义体，闪避如电。",
        passive: crate::defs::BloodlinePassive {
            atk_flat: 8, leech_on_hit: 0, dodge_bonus: 0.08, dmg_reduce: 8, san_resist: 0,
            rage_bonus_atk: 0, label: "攻+8·减8·闪+0.08",
        },
    },
];

// ============================================================================
// BATTLE_MODS · 敌人战斗修饰（combat §2.1；key by fight_id，旁附零侵入 FIGHTS）
// 初始行按 combat §2.1 各副本→训练词映射示例。
// ============================================================================
pub const BATTLE_MODS: &[(&'static str, BattleMods)] = &[
    ("b_thirst_king", BattleMods {
        weak_fire: 30, weak_electric: 30, armor: 0, regen: Some((15, 3)), aura: 0,
        post_kill: Some((0, "绿潮蚀伤")), waves: &[], no_dodge: false,
    }),
    ("balrog", BattleMods {
        weak_fire: 0, weak_electric: 0, armor: 0, regen: None, aura: 6,
        post_kill: None, waves: &[], no_dodge: false,
    }),
    ("b_kayako", BattleMods {
        weak_fire: 0, weak_electric: 0, armor: 0, regen: None, aura: 5,
        post_kill: None, waves: &[], no_dodge: true,
    }),
];

// ============================================================================
// CULTIVATION_STAGES · 修真境界（cultivation §1.1）
// 0 未修真（凡体）；1 练气 ~ 7 合道；合道以上只演出不进 fight 数值
// ============================================================================
const SP_ZERO: crate::defs::StagePassive = crate::defs::StagePassive {
    dmg_reduce: 0, san_resist: 0, per_turn_qi: 0, atk_flat: 0, hp_max: 0,
    ignore_death: false, dodge_bonus: 0.0,
};

pub const CULTIVATION_STAGES: &[CultivationStageCfg] = &[
    CultivationStageCfg {
        stage: 1, name: "练气期", need_points: 3000, need_grade: Some('D'), prev: None,
        qi_max_cap: 120, hp_regen: 8, san_regen: 5,
        passive: crate::defs::StagePassive { san_resist: 3, ..SP_ZERO },
    },
    CultivationStageCfg {
        stage: 2, name: "筑基期", need_points: 7000, need_grade: Some('C'), prev: Some(1),
        qi_max_cap: 240, hp_regen: 12, san_regen: 8,
        passive: crate::defs::StagePassive { dmg_reduce: 4, ..SP_ZERO },
    },
    CultivationStageCfg {
        stage: 3, name: "金丹期", need_points: 15000, need_grade: Some('B'), prev: Some(2),
        qi_max_cap: 400, hp_regen: 18, san_regen: 0,
        passive: crate::defs::StagePassive { per_turn_qi: 4, ..SP_ZERO },
    },
    CultivationStageCfg {
        stage: 4, name: "元婴期", need_points: 30000, need_grade: Some('A'), prev: Some(3),
        qi_max_cap: 600, hp_regen: 0, san_regen: 0,
        passive: SP_ZERO,
    },
    CultivationStageCfg {
        stage: 5, name: "化神期", need_points: 55000, need_grade: Some('A'), prev: Some(4),
        qi_max_cap: 850, hp_regen: 30, san_regen: 0,
        passive: crate::defs::StagePassive { ignore_death: true, ..SP_ZERO },
    },
    CultivationStageCfg {
        stage: 6, name: "返虚期", need_points: 90000, need_grade: Some('S'), prev: Some(5),
        qi_max_cap: 1100, hp_regen: 0, san_regen: 0,
        passive: crate::defs::StagePassive { san_resist: 2, ..SP_ZERO },
    },
    CultivationStageCfg {
        stage: 7, name: "合道期（顶点）", need_points: 140000, need_grade: Some('S'), prev: Some(6),
        qi_max_cap: 1400, hp_regen: 100, san_regen: 100,
        passive: SP_ZERO,
    },
];

// ============================================================================
// FIGHT_ITEMS · 战斗内道具白名单（combat §2.3 方案 A；id → 效果）
// ============================================================================
pub const FIGHT_ITEMS: &[(&'static str, FightItemEffect)] = &[
    ("item_medkit", FightItemEffect { kind: ItemSub::Heal, effect: ItemEffect::Heal(50) }),
    ("item_bandage", FightItemEffect { kind: ItemSub::Heal, effect: ItemEffect::Heal(18) }),
    ("item_sedative", FightItemEffect { kind: ItemSub::San, effect: ItemEffect::San(20) }),
    ("item_bottle_water", FightItemEffect {
        kind: ItemSub::Heal, effect: ItemEffect::Heal(8),
    }),
    ("item_holy_water", FightItemEffect {
        kind: ItemSub::Throw, effect: ItemEffect::Throw { dmg_over_time: None, weak: Some("holy"), flat_dmg: 0 },
    }),
    ("item_silver_bullet", FightItemEffect {
        kind: ItemSub::Throw, effect: ItemEffect::Throw { dmg_over_time: None, weak: Some("silver"), flat_dmg: 0 },
    }),
    ("item_torch", FightItemEffect {
        kind: ItemSub::Throw, effect: ItemEffect::Throw { dmg_over_time: Some((0, 3)), weak: Some("fire"), flat_dmg: 0 },
    }),
    ("item_lure", FightItemEffect {
        kind: ItemSub::Throw, effect: ItemEffect::Throw { dmg_over_time: None, weak: None, flat_dmg: 60 },
    }),
    ("item_grenade", FightItemEffect {
        kind: ItemSub::Throw, effect: ItemEffect::Throw { dmg_over_time: None, weak: None, flat_dmg: 70 },
    }),
    ("item_quzhen_fu", FightItemEffect {
        kind: ItemSub::CharmProt, effect: ItemEffect::Charm { immune_death: true, cure_debuff: false },
    }),
    ("item_jiezhou_fu", FightItemEffect {
        kind: ItemSub::CharmAnti, effect: ItemEffect::Charm { immune_death: false, cure_debuff: true },
    }),
    ("item_antidote", FightItemEffect {
        kind: ItemSub::CharmAnti, effect: ItemEffect::Charm { immune_death: false, cure_debuff: true },
    }),
];

// ============================================================================
// 查询 helper（数据驱动；结算由包 B 查表应用）
// ============================================================================

/// 读当前基因锁阶：max(gene_stage, gene_lock 布尔视图)。engine/scenes 唯一入口。
pub fn gene_stage_of(st: &GameState) -> u8 {
    if st.gene_lock && st.gene_stage < 1 { 1 } else { st.gene_stage }
}

/// 写基因锁阶：gene_stage=n 且 gene_lock=(n>=1)。engine/scenes 唯一写入口。
pub fn set_gene_stage(st: &mut GameState, n: u8) {
    st.gene_stage = n;
    st.gene_lock = n >= 1;
}

/// 按血统 id 查表（Option<&BloodlineDef>）
pub fn bloodline_def(id: &str) -> Option<&'static BloodlineDef> {
    BLOODLINES.iter().find(|b| b.id == id)
}

/// 按当前角色血统查表
pub fn bloodline_of(st: &GameState) -> Option<&'static BloodlineDef> {
    match st.bloodline.as_deref() {
        Some(id) => bloodline_def(id),
        None => None,
    }
}

/// 按 fight_id 查战斗修饰
pub fn battle_mods(id: &str) -> Option<&'static BattleMods> {
    BATTLE_MODS.iter().find(|(fid, _)| *fid == id).map(|(_, m)| m)
}

/// 按修真境界阶查表
pub fn cultivation_stage_cfg(n: u8) -> Option<&'static CultivationStageCfg> {
    CULTIVATION_STAGES.iter().find(|c| c.stage == n)
}

/// 当前境界修真 qi_max 天棚档（未修真 0）
pub fn qi_max_cap_of(st: &GameState) -> i32 {
    cultivation_stage_cfg(st.cultivation_stage).map(|c| c.qi_max_cap).unwrap_or(0)
}

/// 基因锁各阶查询：按 gene_stage_of(st) 查表
pub fn gene_stage_cfg(st: &GameState) -> Option<&'static GeneStageCfg> {
    GENE_STAGES.iter().find(|c| c.stage == gene_stage_of(st))
}