//! 战斗体系数据层（包 A）：道具 / 装备 / 武器 / 法宝 / 合成 静态表 + 计数 helper。
//! 武器走旁附表（不改现有 Weapon 枚举语义）；inventory 计数用方案 A 拆 id（零侵入 Vec<String>）。
//! 仅数据铺装与查询 helper，不含战斗结算逻辑（结算由包 B 做）。

use crate::defs::{
    DamageType, GearDef, GearSlot, ItemDef, ItemEffect, ItemSub, Recipe, TreasureDef,
    WeaponDef, WeaponSpecial,
};
use crate::state::GameState;

// ============================================================================
// WEAPONS · 武器旁附表（item §1.1；现有 Weapon 枚举语义不动，此表承载档位/伤害类型/特殊）
// ============================================================================
pub const WEAPONS: &[WeaponDef] = &[
    WeaponDef { id: "wp_axe", name: "消防斧", tier: 0, dmg: (22, 34), ammo: None, dmg_type: DamageType::Kinetic, special: &[], base_price: 0, need_grade: None },
    WeaponDef { id: "wp_gun9", name: "9mm 手枪", tier: 0, dmg: (14, 20), ammo: Some(6), dmg_type: DamageType::Kinetic, special: &[], base_price: 0, need_grade: None },
    WeaponDef { id: "wp_sword", name: "军用刺刀军刀", tier: 0, dmg: (10, 16), ammo: None, dmg_type: DamageType::Kinetic, special: &[], base_price: 0, need_grade: None },
    WeaponDef { id: "wp_katana", name: "精锻武士刀", tier: 1, dmg: (16, 24), ammo: None, dmg_type: DamageType::Kinetic, special: &[WeaponSpecial::Pierce(2)], base_price: 1200, need_grade: Some('C') },
    WeaponDef { id: "wp_gauss", name: "高斯手枪", tier: 1, dmg: (20, 30), ammo: Some(10), dmg_type: DamageType::Energy, special: &[WeaponSpecial::Burn((0, 0))], base_price: 1400, need_grade: None },
    WeaponDef { id: "wp_emi", name: "电磁脉冲枪", tier: 2, dmg: (24, 36), ammo: Some(8), dmg_type: DamageType::Energy, special: &[WeaponSpecial::Stun(0.15)], base_price: 3000, need_grade: Some('B') },
    WeaponDef { id: "wp_holy_sword", name: "圣裁十字剑", tier: 2, dmg: (26, 38), ammo: None, dmg_type: DamageType::Holy, special: &[WeaponSpecial::Burn((0, 0))], base_price: 3600, need_grade: Some('B') },
    WeaponDef { id: "wp_silver_gun", name: "礼装银弹手枪", tier: 2, dmg: (22, 34), ammo: Some(6), dmg_type: DamageType::Silver, special: &[WeaponSpecial::Stun(0.0)], base_price: 3400, need_grade: Some('C') },
    WeaponDef { id: "wp_cu_ju", name: "问心·青锋剑", tier: 3, dmg: (30, 46), ammo: None, dmg_type: DamageType::Kinetic, special: &[WeaponSpecial::Pierce(4)], base_price: 8000, need_grade: Some('A') },
    WeaponDef { id: "wp_quantum_core", name: "量子核心振荡剑", tier: 3, dmg: (34, 50), ammo: None, dmg_type: DamageType::Energy, special: &[WeaponSpecial::Stun(0.0)], base_price: 11000, need_grade: Some('A') },
    // ---- 增量扩充（第 2 批 · tier 1~3 各流派）----
    WeaponDef { id: "wp_scythe_pobing", name: "破军重镰", tier: 1, dmg: (28, 42), ammo: None, dmg_type: DamageType::Kinetic, special: &[WeaponSpecial::Pierce(3)], base_price: 1600, need_grade: Some('C') },
    WeaponDef { id: "wpn_bloodsaber", name: "血戮剑", tier: 2, dmg: (26, 40), ammo: None, dmg_type: DamageType::Kinetic, special: &[WeaponSpecial::Leech(6)], base_price: 3800, need_grade: Some('B') },
    WeaponDef { id: "wpn_zhuai_jianpan", name: "诛仙剑阵盘", tier: 3, dmg: (36, 54), ammo: None, dmg_type: DamageType::Energy, special: &[WeaponSpecial::Burn((3, 3)), WeaponSpecial::Stun(0.0)], base_price: 16000, need_grade: Some('A') },
    WeaponDef { id: "wp_quantum_annihil", name: "量子湮灭刀", tier: 3, dmg: (40, 58), ammo: None, dmg_type: DamageType::Energy, special: &[WeaponSpecial::Stun(0.2)], base_price: 20000, need_grade: Some('A') },
    WeaponDef { id: "wp_gravity_collapse", name: "引力坍缩炮", tier: 3, dmg: (45, 60), ammo: Some(4), dmg_type: DamageType::Energy, special: &[WeaponSpecial::Stun(0.25)], base_price: 24000, need_grade: Some('A') },
    WeaponDef { id: "wpn_shihun_fan", name: "噬魂幡", tier: 2, dmg: (24, 36), ammo: None, dmg_type: DamageType::Holy, special: &[WeaponSpecial::Stun(0.0), WeaponSpecial::Burn((2, 2))], base_price: 4200, need_grade: Some('B') },
    WeaponDef { id: "wpn_taixu_godsaw", name: "太虚神剑", tier: 3, dmg: (38, 56), ammo: None, dmg_type: DamageType::Holy, special: &[WeaponSpecial::Pierce(5)], base_price: 22000, need_grade: Some('A') },
    WeaponDef { id: "wpn_rail_sniper", name: "电磁轨道狙击枪", tier: 2, dmg: (32, 48), ammo: Some(3), dmg_type: DamageType::Kinetic, special: &[WeaponSpecial::Pierce(6)], base_price: 9800, need_grade: Some('B') },
    WeaponDef { id: "wpn_nano_whip", name: "纳米切割鞭", tier: 2, dmg: (22, 34), ammo: None, dmg_type: DamageType::Energy, special: &[WeaponSpecial::Burn((4, 2)), WeaponSpecial::Stun(0.1)], base_price: 7200, need_grade: Some('B') },
    WeaponDef { id: "wpn_causality_sword", name: "因果律护身剑", tier: 3, dmg: (34, 50), ammo: None, dmg_type: DamageType::Silver, special: &[WeaponSpecial::Leech(5), WeaponSpecial::Stun(0.15)], base_price: 26000, need_grade: Some('S') },
];

// ============================================================================
// GEAR · 护甲/饰品（item §1.2；slot=Armor|Accessory）
// ============================================================================
pub const GEAR: &[GearDef] = &[
    GearDef { id: "gear_police_vest", name: "警用防弹背心", slot: GearSlot::Armor, dmg_reduce: 4, atk_flat: 0, dodge: 0.0, san_resist: 0, qi_max: 0, hp_max: 0, per_turn_qi: 0, dmg_mult: 1.0, price: 900, need_grade: Some('D') },
    GearDef { id: "gear_kevlar", name: "凯夫拉防弹衣", slot: GearSlot::Armor, dmg_reduce: 7, atk_flat: 0, dodge: 0.0, san_resist: 0, qi_max: 0, hp_max: 0, per_turn_qi: 0, dmg_mult: 1.0, price: 2200, need_grade: Some('C') },
    GearDef { id: "gear_elven_cloak", name: "精灵斗篷", slot: GearSlot::Armor, dmg_reduce: 5, atk_flat: 0, dodge: 0.05, san_resist: 0, qi_max: 0, hp_max: 0, per_turn_qi: 0, dmg_mult: 1.0, price: 2800, need_grade: Some('C') },
    GearDef { id: "gear_mithril_vault", name: "秘银护甲", slot: GearSlot::Armor, dmg_reduce: 10, atk_flat: 0, dodge: 0.0, san_resist: 0, qi_max: 0, hp_max: 0, per_turn_qi: 0, dmg_mult: 1.0, price: 6000, need_grade: Some('B') },
    GearDef { id: "gear_nano_vest", name: "纳米作战服", slot: GearSlot::Armor, dmg_reduce: 12, atk_flat: 0, dodge: 0.0, san_resist: 0, qi_max: 0, hp_max: 0, per_turn_qi: 0, dmg_mult: 1.0, price: 9000, need_grade: Some('A') },
    GearDef { id: "access_strength_ring", name: "蛮力指环", slot: GearSlot::Accessory, dmg_reduce: 0, atk_flat: 6, dodge: 0.0, san_resist: 0, qi_max: 0, hp_max: 0, per_turn_qi: 0, dmg_mult: 1.0, price: 1200, need_grade: Some('D') },
    GearDef { id: "access_agility_boots", name: "追风靴", slot: GearSlot::Accessory, dmg_reduce: 0, atk_flat: 0, dodge: 0.06, san_resist: 0, qi_max: 0, hp_max: 0, per_turn_qi: 0, dmg_mult: 1.0, price: 1300, need_grade: Some('D') },
    GearDef { id: "access_san_locket", name: "安魂吊坠", slot: GearSlot::Accessory, dmg_reduce: 0, atk_flat: 0, dodge: 0.0, san_resist: 6, qi_max: 0, hp_max: 0, per_turn_qi: 0, dmg_mult: 1.0, price: 1600, need_grade: Some('C') },
    GearDef { id: "access_qi_belt", name: "聚气腰带", slot: GearSlot::Accessory, dmg_reduce: 0, atk_flat: 0, dodge: 0.0, san_resist: 0, qi_max: 30, hp_max: 0, per_turn_qi: 0, dmg_mult: 1.0, price: 1800, need_grade: Some('C') },
    // ---- 增量扩充（第 2 批 · 高 tier 减伤/闪避/SAN 抗/qi_max/tech_shield）----
    GearDef { id: "gear_adamant_cuirass", name: "精金胸甲", slot: GearSlot::Armor, dmg_reduce: 15, atk_flat: 0, dodge: 0.0, san_resist: 0, qi_max: 0, hp_max: 20, per_turn_qi: 0, dmg_mult: 1.0, price: 14000, need_grade: Some('A') },
    GearDef { id: "gear_void_leak", name: "虚无织物衣", slot: GearSlot::Armor, dmg_reduce: 9, atk_flat: 0, dodge: 0.08, san_resist: 4, qi_max: 0, hp_max: 0, per_turn_qi: 0, dmg_mult: 1.0, price: 11000, need_grade: Some('A') },
    GearDef { id: "gear_zero_absorb", name: "绝对零度护甲", slot: GearSlot::Armor, dmg_reduce: 18, atk_flat: 0, dodge: 0.0, san_resist: 0, qi_max: 0, hp_max: 0, per_turn_qi: 0, dmg_mult: 1.0, price: 26000, need_grade: Some('S') },
    GearDef { id: "gear_sanctum_plate", name: "圣域板甲", slot: GearSlot::Armor, dmg_reduce: 12, atk_flat: 0, dodge: 0.0, san_resist: 10, qi_max: 0, hp_max: 0, per_turn_qi: 0, dmg_mult: 1.0, price: 15000, need_grade: Some('A') },
    GearDef { id: "access_hades_cloak", name: "幽冥披风", slot: GearSlot::Accessory, dmg_reduce: 0, atk_flat: 0, dodge: 0.12, san_resist: 0, qi_max: 0, hp_max: 0, per_turn_qi: 0, dmg_mult: 1.0, price: 8800, need_grade: Some('B') },
    GearDef { id: "access_will_anchor", name: "意志锚链", slot: GearSlot::Accessory, dmg_reduce: 0, atk_flat: 0, dodge: 0.0, san_resist: 14, qi_max: 0, hp_max: 0, per_turn_qi: 0, dmg_mult: 1.0, price: 9600, need_grade: Some('B') },
    GearDef { id: "access_tianting_belt", name: "天庭灵气腰带", slot: GearSlot::Accessory, dmg_reduce: 0, atk_flat: 0, dodge: 0.0, san_resist: 0, qi_max: 80, hp_max: 0, per_turn_qi: 4, dmg_mult: 1.0, price: 18000, need_grade: Some('A') },
    GearDef { id: "access_nano_tech_shield", name: "纳米护盾核心", slot: GearSlot::Accessory, dmg_reduce: 6, atk_flat: 0, dodge: 0.0, san_resist: 0, qi_max: 0, hp_max: 0, per_turn_qi: 0, dmg_mult: 1.0, price: 12000, need_grade: Some('A') },
];

// ============================================================================
// TRESURE_DEFS · 法宝（修真 §2.4，装备格 slot 0=本命 1=护身 2=辅助）
// ============================================================================
pub const TRESURE_DEFS: &[TreasureDef] = &[
    TreasureDef { id: "cu_bab_benming_fejian", name: "本命飞剑·青锋", slot: 0, dmg_reduce: 0, atk_flat: 8, dodge: 0.0, san_resist: 0, qi_max: 0, hp_max: 0, per_turn_qi: 0, dmg_mult: 1.1, ignore_death: false, price: 4000, need_grade: Some('C') },
    TreasureDef { id: "cu_bab_hudun_fu", name: "护体符印", slot: 1, dmg_reduce: 6, atk_flat: 0, dodge: 0.0, san_resist: 0, qi_max: 0, hp_max: 0, per_turn_qi: 0, dmg_mult: 1.0, ignore_death: false, price: 2500, need_grade: Some('D') },
    TreasureDef { id: "cu_bab_hunyuan_lu", name: "混元炉", slot: 2, dmg_reduce: 0, atk_flat: 0, dodge: 0.0, san_resist: 5, qi_max: 0, hp_max: 0, per_turn_qi: 3, dmg_mult: 1.0, ignore_death: false, price: 9000, need_grade: Some('B') },
    TreasureDef { id: "cu_bab_wufen_bazhan", name: "五方幡", slot: 2, dmg_reduce: 0, atk_flat: 0, dodge: 0.0, san_resist: 0, qi_max: 0, hp_max: 0, per_turn_qi: 0, dmg_mult: 1.0, ignore_death: true, price: 16000, need_grade: Some('A') },
    TreasureDef { id: "cu_bab_qiankun_jie", name: "乾坤袋", slot: 2, dmg_reduce: 0, atk_flat: 0, dodge: 0.0, san_resist: 0, qi_max: 0, hp_max: 40, per_turn_qi: 0, dmg_mult: 1.0, ignore_death: false, price: 45000, need_grade: Some('S') },
    TreasureDef { id: "cu_bab_qiushui_jian", name: "秋水神剑", slot: 0, dmg_reduce: 0, atk_flat: 12, dodge: 0.0, san_resist: 0, qi_max: 0, hp_max: 0, per_turn_qi: 0, dmg_mult: 1.2, ignore_death: false, price: 30000, need_grade: Some('S') },
    // ---- 增量扩充（第 2 批 · 攻击/防御/辅助三型）----
    TreasureDef { id: "tr_zhuxian_calendar", name: "诛仙剑意图", slot: 0, dmg_reduce: 0, atk_flat: 16, dodge: 0.0, san_resist: 0, qi_max: 0, hp_max: 0, per_turn_qi: 0, dmg_mult: 1.25, ignore_death: false, price: 32000, need_grade: Some('S') },
    TreasureDef { id: "tr_blood_banner", name: "血煞战旗", slot: 0, dmg_reduce: 0, atk_flat: 10, dodge: 0.0, san_resist: 0, qi_max: 0, hp_max: 0, per_turn_qi: 0, dmg_mult: 1.15, ignore_death: false, price: 15000, need_grade: Some('A') },
    TreasureDef { id: "tr_taixu_shield", name: "太虚玄光镜", slot: 1, dmg_reduce: 12, atk_flat: 0, dodge: 0.0, san_resist: 0, qi_max: 0, hp_max: 30, per_turn_qi: 0, dmg_mult: 1.0, ignore_death: false, price: 20000, need_grade: Some('A') },
    TreasureDef { id: "tr_shenlei_pendant", name: "神雷辟邪佩", slot: 1, dmg_reduce: 8, atk_flat: 0, dodge: 0.0, san_resist: 8, qi_max: 0, hp_max: 0, per_turn_qi: 0, dmg_mult: 1.0, ignore_death: false, price: 13000, need_grade: Some('B') },
    TreasureDef { id: "tr_danxin_mirror", name: "锻心明镜", slot: 2, dmg_reduce: 0, atk_flat: 0, dodge: 0.0, san_resist: 6, qi_max: 60, hp_max: 0, per_turn_qi: 5, dmg_mult: 1.0, ignore_death: false, price: 22000, need_grade: Some('A') },
    TreasureDef { id: "tr_undo_pillowstone", name: "逆转生死盘", slot: 2, dmg_reduce: 0, atk_flat: 0, dodge: 0.0, san_resist: 0, qi_max: 0, hp_max: 0, per_turn_qi: 0, dmg_mult: 1.0, ignore_death: true, price: 60000, need_grade: Some('S') },
];

// ============================================================================
// ITEMS · 全谱系道具唯一事实表（item §1.3/1.4/1.5；战斗/兑换/门禁/合成查此）
// + 三元：武器 (10) GEAR 已有 / 护具 (9+6 法宝) / 消耗品 (16) / 圣物凭证 / 任务剧情
// ============================================================================
pub const ITEMS: &[ItemDef] = &[
    // ---- 消耗品（可堆叠）----
    ItemDef { id: "item_medkit", name: "强效医疗包", kind: ItemSub::Heal, stack: true, usable_in_fight: true, effect: ItemEffect::Heal(50), price: 700, need_grade: None },
    ItemDef { id: "item_bandage", name: "紧急绷带", kind: ItemSub::Heal, stack: true, usable_in_fight: true, effect: ItemEffect::Heal(18), price: 220, need_grade: None },
    ItemDef { id: "item_sedative", name: "镇静剂", kind: ItemSub::San, stack: true, usable_in_fight: true, effect: ItemEffect::San(20), price: 320, need_grade: None },
    ItemDef { id: "item_bottle_water", name: "口袋圣水", kind: ItemSub::Heal, stack: true, usable_in_fight: true, effect: ItemEffect::Heal(8), price: 180, need_grade: None },
    ItemDef { id: "item_holy_water", name: "圣水", kind: ItemSub::Throw, stack: true, usable_in_fight: true, effect: ItemEffect::Throw { dmg_over_time: None, weak: Some("holy"), flat_dmg: 0 }, price: 400, need_grade: None },
    ItemDef { id: "item_silver_bullet", name: "银弹", kind: ItemSub::Throw, stack: true, usable_in_fight: true, effect: ItemEffect::Throw { dmg_over_time: None, weak: Some("silver"), flat_dmg: 0 }, price: 520, need_grade: None },
    ItemDef { id: "item_torch", name: "火把", kind: ItemSub::Throw, stack: true, usable_in_fight: true, effect: ItemEffect::Throw { dmg_over_time: Some((0, 3)), weak: Some("fire"), flat_dmg: 0 }, price: 260, need_grade: None },
    ItemDef { id: "item_lure", name: "诱水剂", kind: ItemSub::Throw, stack: true, usable_in_fight: true, effect: ItemEffect::Throw { dmg_over_time: None, weak: None, flat_dmg: 60 }, price: 480, need_grade: None },
    ItemDef { id: "item_grenade", name: "燃烧手雷", kind: ItemSub::Throw, stack: true, usable_in_fight: true, effect: ItemEffect::Throw { dmg_over_time: None, weak: None, flat_dmg: 70 }, price: 900, need_grade: None },
    ItemDef { id: "item_quzhen_fu", name: "驱邪符", kind: ItemSub::CharmProt, stack: true, usable_in_fight: true, effect: ItemEffect::Charm { immune_death: true, cure_debuff: false }, price: 1500, need_grade: None },
    ItemDef { id: "item_jiezhou_fu", name: "解咒符", kind: ItemSub::CharmAnti, stack: true, usable_in_fight: true, effect: ItemEffect::Charm { immune_death: false, cure_debuff: true }, price: 600, need_grade: None },
    ItemDef { id: "item_antidote", name: "净化血清", kind: ItemSub::Heal, stack: true, usable_in_fight: true, effect: ItemEffect::Charm { immune_death: false, cure_debuff: true }, price: 420, need_grade: None },
    ItemDef { id: "it_qixue_dan", name: "气血丹", kind: ItemSub::Heal, stack: true, usable_in_fight: false, effect: ItemEffect::Heal(80), price: 480, need_grade: None },
    ItemDef { id: "ammo_crate", name: "弹药盒", kind: ItemSub::Ammo, stack: false, usable_in_fight: false, effect: ItemEffect::Ammo, price: 150, need_grade: None },
    ItemDef { id: "gj_grenade", name: "军用手雷", kind: ItemSub::Throw, stack: true, usable_in_fight: false, effect: ItemEffect::Throw { dmg_over_time: None, weak: None, flat_dmg: 50 }, price: 200, need_grade: None },
    ItemDef { id: "item_anesthetic", name: "麻醉剂", kind: ItemSub::Throw, stack: true, usable_in_fight: false, effect: ItemEffect::None, price: 200, need_grade: None },
    // ---- 强化石 / 新材料（战斗强化消耗品 + 合成原料）----
    ItemDef { id: "it_enhance_stone", name: "普通强化石", kind: ItemSub::Heal, stack: true, usable_in_fight: false, effect: ItemEffect::None, price: 1500, need_grade: None },
    ItemDef { id: "it_enhance_stone_hi", name: "高级强化石", kind: ItemSub::Heal, stack: true, usable_in_fight: false, effect: ItemEffect::None, price: 6000, need_grade: Some('B') },
    ItemDef { id: "it_em_core", name: "电磁炮核心", kind: ItemSub::Reliquary, stack: false, usable_in_fight: false, effect: ItemEffect::None, price: 5000, need_grade: Some('B') },
    ItemDef { id: "it_blood_essence", name: "血族精血", kind: ItemSub::Reliquary, stack: false, usable_in_fight: false, effect: ItemEffect::None, price: 4200, need_grade: Some('B') },
    ItemDef { id: "it_treasure_frag", name: "法宝碎片", kind: ItemSub::Reliquary, stack: false, usable_in_fight: false, effect: ItemEffect::None, price: 2600, need_grade: Some('B') },
    // ---- 圣物凭证：防御型（复用现 engine 掉落 id + 自创兑换券）----
    ItemDef { id: "it_soul_shard", name: "灵魂碎片", kind: ItemSub::Reliquary, stack: true, usable_in_fight: false, effect: ItemEffect::None, price: 500, need_grade: Some('D') },
    ItemDef { id: "it_genome_alpha", name: "基因样本·α", kind: ItemSub::Reliquary, stack: false, usable_in_fight: false, effect: ItemEffect::None, price: 2000, need_grade: Some('C') },
    ItemDef { id: "it_core_sample", name: "能量核心残片", kind: ItemSub::Reliquary, stack: false, usable_in_fight: false, effect: ItemEffect::None, price: 1800, need_grade: Some('C') },
    ItemDef { id: "it_cross_key", name: "圣徽钥匙", kind: ItemSub::Reliquary, stack: false, usable_in_fight: false, effect: ItemEffect::None, price: 900, need_grade: Some('D') },
    ItemDef { id: "it_cross", name: "圣徽", kind: ItemSub::Reliquary, stack: false, usable_in_fight: false, effect: ItemEffect::None, price: 1200, need_grade: Some('D') },
    ItemDef { id: "it_secret_key", name: "秘匣钥匙", kind: ItemSub::Reliquary, stack: false, usable_in_fight: false, effect: ItemEffect::None, price: 700, need_grade: Some('D') },
    ItemDef { id: "it_box_mi", name: "密匣信物", kind: ItemSub::Quest, stack: false, usable_in_fight: false, effect: ItemEffect::None, price: 300, need_grade: Some('D') },
    // ---- 任务/剧情（纯 flag 载体，不占战斗数值）----
    ItemDef { id: "it_vault_pass", name: "宝库通行证", kind: ItemSub::Quest, stack: false, usable_in_fight: false, effect: ItemEffect::None, price: 0, need_grade: None },
];

/// 复用现有 engine 真实掉落的门禁/剧情道具（不一一列入 ITEMS 计量表，属非堆叠剧情载体）
pub const QUEST_ITEM_IDS: &[&str] = &[
    "adrenaline", "firstaid", "lab_badge", "yiy_key_med", "yiy_pulse", "yiy_em_restraint",
    "yiy_embryo_sample", "item_ghost_key", "item_toshio_key", "item_buddha", "item_diary",
    "item_cat_food", "item_chushe_sample", "item_chushe_blood", "item_core_crystal",
    "item_gene_card", "item_seal_pass", "item_diling", "item_lou_bone", "item_jiche",
    "item_key", "beast_core", "mithril_key", "mithril_block", "elven_cloak", "it_gear_key",
    "it_gear_token_a", "it_gear_token_b", "it_gear_token_c", "it_pivot_key", "it_mo_ling_a",
    "item_record_1", "item_letter", "corpse_key", "data_chip", "beam_core", "item_hope_light",
    "item_shoucheng_letter",
];

// ============================================================================
// RECIPES · 合成表（item §4.3 ①）
// ============================================================================
pub const RECIPES: &[Recipe] = &[
    Recipe { result: "it_core_crystal", ingredients: &["it_soul_shard", "it_core_sample"] },
    Recipe { result: "it_cross", ingredients: &["it_cross_key", "item_holy_water"] },
    // ---- 增量扩充（第 2 批 · 新材料合成）----
    Recipe { result: "it_em_core", ingredients: &["it_core_crystal", "beam_core"] },
    Recipe { result: "it_blood_essence", ingredients: &["item_chushe_blood", "it_soul_shard"] },
    Recipe { result: "it_treasure_frag", ingredients: &["it_core_sample", "it_soul_shard"] },
    Recipe { result: "tr_blood_banner", ingredients: &["it_treasure_frag", "it_blood_essence"] },
    Recipe { result: "it_enhance_stone", ingredients: &["it_core_sample", "it_soul_shard"] },
    Recipe { result: "it_enhance_stone_hi", ingredients: &["it_enhance_stone", "it_em_core"] },
];

// ============================================================================
// 查询 helper（数据驱动；结算/兑换/门禁/合成统一查表）
// ============================================================================

/// 按道具 id 查表
pub fn item_def(id: &str) -> Option<&'static ItemDef> {
    ITEMS.iter().find(|it| it.id == id)
}

/// 按武器 id 查表
pub fn weapon_def(id: &str) -> Option<&'static WeaponDef> {
    WEAPONS.iter().find(|w| w.id == id)
}

/// 按装备 id 查表（护甲/饰品）
pub fn gear_def(id: &str) -> Option<&'static GearDef> {
    GEAR.iter().find(|g| g.id == id)
}

/// 按法宝 id 查表
pub fn treasure_def(id: &str) -> Option<&'static TreasureDef> {
    TRESURE_DEFS.iter().find(|t| t.id == id)
}

// ---------- inventory 计数（方案 A：同 id 多枚拆 `id_k`，零侵入 Vec<String>） ----------

/// 是否为某 base 的拆 id 计数组件：`base` 本身 或 `base_<数字>`（方案 A 拆 id）。
/// 仅需数字后缀，避免与「真名含 _ 前缀的独立 id」相撞（如 it_enhance_stone vs it_enhance_stone_hi）。
fn matches_base(entry: &str, base: &str) -> bool {
    if entry == base {
        return true;
    }
    let Some(rest) = entry.strip_prefix(&format!("{base}_")) else { return false; };
    !rest.is_empty() && rest.chars().all(|c| c.is_ascii_digit())
}

/// 统计 base id 持有量（命中 base 本身或 base_N 前缀）
pub fn count_item(st: &GameState, base: &str) -> usize {
    st.inventory.iter().filter(|i| matches_base(i, base)).count()
}

/// 计数别名（保持可读性）
pub fn count_items(st: &GameState, base: &str) -> usize {
    count_item(st, base)
}

/// 是否有该道具（base 或 base_N 前缀命中）
pub fn has_item(st: &GameState, base: &str) -> bool {
    count_item(st, base) > 0
}

/// 无堆叠 / 剧情 / 圣物唯一物：去重唯一保留现 add_item 语义；调用方决定走哪个入口。
/// 追加计数到位：可堆叠消耗品 → push `{base}_{count}`；唯一物 → 去重 push base。
/// 若可堆叠则累加（用 item_def.max_stack 判定，缺表条目按可堆叠处理）。
pub fn add_item_counted(st: &mut GameState, item: &str) {
    let stackable = item_def(item).map(|d| d.stack).unwrap_or(true);
    if !stackable {
        if !st.inventory.iter().any(|i| i == item) {
            st.inventory.push(item.to_string());
        }
        return;
    }
    let k = count_item(st, item) + 1;
    st.inventory.push(format!("{item}_{k}"));
}

/// 消耗一份 base 道具（尾部移除一个 base 或 base_N 组件）；返回是否成功
pub fn consume_item(st: &mut GameState, base: &str) -> bool {
    let pos = st.inventory.iter().rposition(|i| matches_base(i, base));
    match pos {
        Some(p) => {
            st.inventory.remove(p);
            true
        }
        None => false,
    }
}