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
    // ==================== 增量扩充（第 3 批 · +60 武器 · 五流派） ====================
    // ---- 动漫系（11）----
    WeaponDef { id: "wp_zanjingdao_he", name: "斩魄刀·卍解", tier: 2, dmg: (30, 46), ammo: None, dmg_type: DamageType::Energy, special: &[WeaponSpecial::Burn((3, 3))], base_price: 6800, need_grade: Some('B') },
    WeaponDef { id: "wp_ruyibang", name: "如意金箍棒", tier: 3, dmg: (42, 62), ammo: None, dmg_type: DamageType::Kinetic, special: &[WeaponSpecial::Stun(0.2), WeaponSpecial::Pierce(4)], base_price: 23000, need_grade: Some('A') },
    WeaponDef { id: "wp_excalibur_holy", name: "誓约胜利之剑", tier: 3, dmg: (46, 64), ammo: None, dmg_type: DamageType::Holy, special: &[WeaponSpecial::Burn((4, 3)), WeaponSpecial::Leech(4)], base_price: 30000, need_grade: Some('S') },
    WeaponDef { id: "wp_beam_saber", name: "光束军刀", tier: 2, dmg: (36, 50), ammo: None, dmg_type: DamageType::Energy, special: &[WeaponSpecial::Burn((5, 2)), WeaponSpecial::Stun(0.1)], base_price: 8800, need_grade: Some('A') },
    WeaponDef { id: "wp_zanyue", name: "斩月大刀", tier: 2, dmg: (34, 52), ammo: None, dmg_type: DamageType::Energy, special: &[WeaponSpecial::Pierce(5)], base_price: 7600, need_grade: Some('B') },
    WeaponDef { id: "wp_qianbenying", name: "千本樱·散舞", tier: 2, dmg: (28, 42), ammo: None, dmg_type: DamageType::Silver, special: &[WeaponSpecial::Leech(3), WeaponSpecial::Stun(0.15)], base_price: 7000, need_grade: Some('B') },
    WeaponDef { id: "wp_niutou_ren", name: "牛头虚刃", tier: 3, dmg: (40, 60), ammo: None, dmg_type: DamageType::Energy, special: &[WeaponSpecial::Leech(8), WeaponSpecial::Stun(0.15)], base_price: 21000, need_grade: Some('A') },
    WeaponDef { id: "wp_wang_zhicai", name: "王之财宝·宝具齐射", tier: 3, dmg: (44, 58), ammo: Some(6), dmg_type: DamageType::Kinetic, special: &[WeaponSpecial::Pierce(6)], base_price: 26000, need_grade: Some('A') },
    WeaponDef { id: "wp_guaili_jian", name: "乖离剑·EA", tier: 3, dmg: (52, 70), ammo: None, dmg_type: DamageType::Energy, special: &[WeaponSpecial::Stun(0.3), WeaponSpecial::Burn((6, 3))], base_price: 36000, need_grade: Some('S') },
    WeaponDef { id: "wp_long_ji", name: "龙骑兵系统", tier: 2, dmg: (32, 48), ammo: Some(12), dmg_type: DamageType::Energy, special: &[WeaponSpecial::Burn((3, 2)), WeaponSpecial::Stun(0.1)], base_price: 9000, need_grade: Some('A') },
    WeaponDef { id: "wp_death_scythe_q", name: "死神镰刀·终焉", tier: 3, dmg: (46, 62), ammo: None, dmg_type: DamageType::Silver, special: &[WeaponSpecial::Leech(10)], base_price: 32000, need_grade: Some('S') },
    // ---- 仙侠小说系（11）----
    WeaponDef { id: "wp_feijian_qingyun", name: "青云飞剑", tier: 1, dmg: (24, 36), ammo: None, dmg_type: DamageType::Energy, special: &[WeaponSpecial::Pierce(3)], base_price: 3600, need_grade: Some('C') },
    WeaponDef { id: "wp_shenbing_ling", name: "神兵·灵天刃", tier: 2, dmg: (34, 48), ammo: None, dmg_type: DamageType::Energy, special: &[WeaponSpecial::Burn((3, 3)), WeaponSpecial::Pierce(3)], base_price: 9200, need_grade: Some('B') },
    WeaponDef { id: "wp_zhanxian_feidao", name: "斩仙飞刀", tier: 3, dmg: (42, 58), ammo: None, dmg_type: DamageType::Energy, special: &[WeaponSpecial::Stun(0.25)], base_price: 24000, need_grade: Some('A') },
    WeaponDef { id: "wp_fantian_yin", name: "翻天印", tier: 3, dmg: (48, 66), ammo: None, dmg_type: DamageType::Holy, special: &[WeaponSpecial::Stun(0.3)], base_price: 28000, need_grade: Some('A') },
    WeaponDef { id: "wp_zhuxian_sijian", name: "诛仙四剑·合一", tier: 3, dmg: (56, 76), ammo: None, dmg_type: DamageType::Energy, special: &[WeaponSpecial::Burn((6, 4)), WeaponSpecial::Pierce(6)], base_price: 40000, need_grade: Some('S') },
    WeaponDef { id: "wp_xuanyuan_jian", name: "轩辕剑·人皇", tier: 3, dmg: (50, 68), ammo: None, dmg_type: DamageType::Holy, special: &[WeaponSpecial::Burn((5, 3)), WeaponSpecial::Leech(5)], base_price: 34000, need_grade: Some('S') },
    WeaponDef { id: "wp_pangu_fu", name: "盘古开天斧", tier: 3, dmg: (58, 80), ammo: None, dmg_type: DamageType::Kinetic, special: &[WeaponSpecial::Pierce(8), WeaponSpecial::Stun(0.2)], base_price: 46000, need_grade: Some('S') },
    WeaponDef { id: "wp_kongtong_yin", name: "崆峒印", tier: 2, dmg: (30, 44), ammo: None, dmg_type: DamageType::Holy, special: &[WeaponSpecial::Stun(0.2), WeaponSpecial::Leech(2)], base_price: 8600, need_grade: Some('B') },
    WeaponDef { id: "wp_taiji_tu", name: "太极图", tier: 3, dmg: (40, 54), ammo: None, dmg_type: DamageType::Energy, special: &[WeaponSpecial::Burn((4, 4)), WeaponSpecial::Stun(0.15)], base_price: 22000, need_grade: Some('A') },
    WeaponDef { id: "wp_shanhe_shetu", name: "山河社稷图", tier: 3, dmg: (44, 60), ammo: None, dmg_type: DamageType::Holy, special: &[WeaponSpecial::Stun(0.2), WeaponSpecial::Leech(4)], base_price: 30000, need_grade: Some('S') },
    WeaponDef { id: "wp_xihe_zhen", name: "曦和神针", tier: 2, dmg: (26, 38), ammo: None, dmg_type: DamageType::Energy, special: &[WeaponSpecial::Stun(0.1), WeaponSpecial::Burn((3, 2))], base_price: 6400, need_grade: Some('B') },
    // ---- 科幻系（11）----
    WeaponDef { id: "wp_gauss_rifle", name: "高斯步枪", tier: 2, dmg: (36, 52), ammo: Some(12), dmg_type: DamageType::Energy, special: &[WeaponSpecial::Burn((3, 2))], base_price: 9800, need_grade: Some('B') },
    WeaponDef { id: "wp_particle_cannon", name: "粒子炮", tier: 3, dmg: (50, 66), ammo: Some(4), dmg_type: DamageType::Energy, special: &[WeaponSpecial::Burn((5, 3)), WeaponSpecial::Stun(0.15)], base_price: 26000, need_grade: Some('A') },
    WeaponDef { id: "wp_electromag_gun", name: "电磁加速炮", tier: 2, dmg: (40, 56), ammo: Some(6), dmg_type: DamageType::Kinetic, special: &[WeaponSpecial::Pierce(6)], base_price: 12000, need_grade: Some('A') },
    WeaponDef { id: "wp_plasma_dagger", name: "等离子刺刃", tier: 1, dmg: (26, 38), ammo: None, dmg_type: DamageType::Energy, special: &[WeaponSpecial::Burn((3, 3))], base_price: 4200, need_grade: Some('C') },
    WeaponDef { id: "wp_antimatter_round", name: "反物质湮灭弹", tier: 3, dmg: (60, 78), ammo: Some(2), dmg_type: DamageType::Energy, special: &[WeaponSpecial::Burn((8, 3)), WeaponSpecial::Stun(0.2)], base_price: 42000, need_grade: Some('S') },
    WeaponDef { id: "wp_orbital_gun", name: "轨道天基枪", tier: 3, dmg: (48, 64), ammo: Some(3), dmg_type: DamageType::Kinetic, special: &[WeaponSpecial::Pierce(8)], base_price: 30000, need_grade: Some('A') },
    WeaponDef { id: "wp_laser_sword", name: "纯激光剑", tier: 2, dmg: (38, 54), ammo: None, dmg_type: DamageType::Energy, special: &[WeaponSpecial::Burn((5, 3)), WeaponSpecial::Stun(0.1)], base_price: 10000, need_grade: Some('B') },
    WeaponDef { id: "wp_nano_blade", name: "纳米蜂巢剑", tier: 2, dmg: (32, 46), ammo: None, dmg_type: DamageType::Energy, special: &[WeaponSpecial::Leech(4), WeaponSpecial::Pierce(4)], base_price: 8200, need_grade: Some('B') },
    WeaponDef { id: "wp_phase_weapon", name: "相位扰动枪", tier: 2, dmg: (34, 50), ammo: Some(8), dmg_type: DamageType::Energy, special: &[WeaponSpecial::Stun(0.3)], base_price: 9400, need_grade: Some('B') },
    WeaponDef { id: "wp_warpspeed_round", name: "曲速托卡马克枪", tier: 3, dmg: (52, 70), ammo: Some(3), dmg_type: DamageType::Energy, special: &[WeaponSpecial::Stun(0.25), WeaponSpecial::Burn((6, 3))], base_price: 36000, need_grade: Some('S') },
    WeaponDef { id: "wp_rail_pistol", name: "微型轨道手枪", tier: 1, dmg: (28, 40), ammo: Some(6), dmg_type: DamageType::Kinetic, special: &[WeaponSpecial::Pierce(4)], base_price: 5000, need_grade: Some('C') },
    // ---- 魔幻系（11）----
    WeaponDef { id: "wp_arcan_staff", name: "奥术增幅法杖", tier: 2, dmg: (24, 40), ammo: None, dmg_type: DamageType::Energy, special: &[WeaponSpecial::Burn((4, 3))], base_price: 7800, need_grade: Some('B') },
    WeaponDef { id: "wp_madoushu_grimoire", name: "禁忌魔导书", tier: 3, dmg: (38, 56), ammo: None, dmg_type: DamageType::Holy, special: &[WeaponSpecial::Burn((6, 3)), WeaponSpecial::Leech(4)], base_price: 25000, need_grade: Some('A') },
    WeaponDef { id: "wp_xianzhe_zhi_shi", name: "贤者之石刃", tier: 3, dmg: (44, 62), ammo: None, dmg_type: DamageType::Silver, special: &[WeaponSpecial::Leech(8), WeaponSpecial::Stun(0.15)], base_price: 29000, need_grade: Some('A') },
    WeaponDef { id: "wp_dragon_lance", name: "龙枪·屠龙", tier: 2, dmg: (40, 56), ammo: None, dmg_type: DamageType::Kinetic, special: &[WeaponSpecial::Pierce(6)], base_price: 11000, need_grade: Some('B') },
    WeaponDef { id: "wp_shuang_zhi_aisang", name: "霜之哀伤", tier: 3, dmg: (48, 64), ammo: None, dmg_type: DamageType::Silver, special: &[WeaponSpecial::Burn((7, 3)), WeaponSpecial::Leech(6)], base_price: 33000, need_grade: Some('S') },
    WeaponDef { id: "wp_leidun_chui", name: "雷神之锤·妙尔尼尔", tier: 3, dmg: (50, 68), ammo: None, dmg_type: DamageType::Energy, special: &[WeaponSpecial::Stun(0.3), WeaponSpecial::Burn((5, 3))], base_price: 34000, need_grade: Some('S') },
    WeaponDef { id: "wp_sheng_jian_mj", name: "光之圣剑", tier: 2, dmg: (36, 52), ammo: None, dmg_type: DamageType::Holy, special: &[WeaponSpecial::Burn((4, 3))], base_price: 9000, need_grade: Some('B') },
    WeaponDef { id: "wp_mo_jian_zhl", name: "诅咒魔剑·噬主", tier: 2, dmg: (38, 54), ammo: None, dmg_type: DamageType::Silver, special: &[WeaponSpecial::Leech(8)], base_price: 10500, need_grade: Some('B') },
    WeaponDef { id: "wp_lieyan_jian", name: "烈焰之剑·火舞", tier: 1, dmg: (30, 44), ammo: None, dmg_type: DamageType::Energy, special: &[WeaponSpecial::Burn((5, 3))], base_price: 4800, need_grade: Some('C') },
    WeaponDef { id: "wp_hanbing_gong", name: "寒冰精灵长弓", tier: 2, dmg: (30, 46), ammo: Some(8), dmg_type: DamageType::Silver, special: &[WeaponSpecial::Burn((3, 2)), WeaponSpecial::Stun(0.2)], base_price: 8800, need_grade: Some('B') },
    WeaponDef { id: "wp_zhigu_shenju", name: "翡翠贤杖·自然", tier: 1, dmg: (22, 34), ammo: None, dmg_type: DamageType::Energy, special: &[WeaponSpecial::Leech(3), WeaponSpecial::Burn((2, 2))], base_price: 4000, need_grade: Some('C') },
    // ---- 武侠系（11）----
    WeaponDef { id: "wp_yitian_jian", name: "倚天剑", tier: 2, dmg: (38, 54), ammo: None, dmg_type: DamageType::Silver, special: &[WeaponSpecial::Pierce(5), WeaponSpecial::Stun(0.1)], base_price: 9600, need_grade: Some('B') },
    WeaponDef { id: "wp_tulong_dao", name: "屠龙宝刀", tier: 2, dmg: (42, 58), ammo: None, dmg_type: DamageType::Kinetic, special: &[WeaponSpecial::Pierce(6)], base_price: 10800, need_grade: Some('B') },
    WeaponDef { id: "wp_dagou_bang", name: "打狗棒·逍遥", tier: 1, dmg: (24, 36), ammo: None, dmg_type: DamageType::Kinetic, special: &[WeaponSpecial::Stun(0.15)], base_price: 3800, need_grade: Some('C') },
    WeaponDef { id: "wp_xuantie_jian", name: "玄铁重剑", tier: 2, dmg: (40, 60), ammo: None, dmg_type: DamageType::Kinetic, special: &[WeaponSpecial::Pierce(7)], base_price: 12000, need_grade: Some('A') },
    WeaponDef { id: "wp_lixiao_feidao", name: "小李飞刀·例无虚发", tier: 2, dmg: (28, 42), ammo: None, dmg_type: DamageType::Silver, special: &[WeaponSpecial::Pierce(8), WeaponSpecial::Stun(0.2)], base_price: 8200, need_grade: Some('B') },
    WeaponDef { id: "wp_liumai_jian", name: "六脉神剑·少商剑", tier: 2, dmg: (34, 50), ammo: None, dmg_type: DamageType::Energy, special: &[WeaponSpecial::Burn((3, 3)), WeaponSpecial::Stun(0.1)], base_price: 8900, need_grade: Some('B') },
    WeaponDef { id: "wp_beiming_jian", name: "北冥神功·吸星剑", tier: 2, dmg: (30, 48), ammo: None, dmg_type: DamageType::Energy, special: &[WeaponSpecial::Leech(6), WeaponSpecial::Stun(0.15)], base_price: 9800, need_grade: Some('A') },
    WeaponDef { id: "wp_dugu_jiujian", name: "独孤九剑·破剑式", tier: 3, dmg: (40, 60), ammo: None, dmg_type: DamageType::Silver, special: &[WeaponSpecial::Pierce(6), WeaponSpecial::Stun(0.2)], base_price: 20000, need_grade: Some('A') },
    WeaponDef { id: "wp_miwu_shenzhao", name: "移花接玉掌刃", tier: 1, dmg: (22, 34), ammo: None, dmg_type: DamageType::Kinetic, special: &[WeaponSpecial::Leech(4)], base_price: 3600, need_grade: Some('C') },
    WeaponDef { id: "wp_jinhe_zhang", name: "降龙十八掌·亢龙有悔", tier: 2, dmg: (36, 54), ammo: None, dmg_type: DamageType::Kinetic, special: &[WeaponSpecial::Stun(0.25)], base_price: 9400, need_grade: Some('B') },
    WeaponDef { id: "wp_tianmen_yuanshang", name: "天外飞仙·剑遁", tier: 3, dmg: (44, 64), ammo: None, dmg_type: DamageType::Energy, special: &[WeaponSpecial::Pierce(6), WeaponSpecial::Stun(0.2)], base_price: 22000, need_grade: Some('A') },
    // ---- 动漫系补（+2）与武侠系补（+3）凑满 60 ----
    WeaponDef { id: "wp_diyang_zhandou", name: "迪迦光之刃", tier: 2, dmg: (36, 52), ammo: None, dmg_type: DamageType::Energy, special: &[WeaponSpecial::Burn((5, 3)), WeaponSpecial::Stun(0.1)], base_price: 9800, need_grade: Some('B') },
    WeaponDef { id: "wp_shoujia_qiluo", name: "奇犽·电光疾影", tier: 1, dmg: (28, 40), ammo: None, dmg_type: DamageType::Energy, special: &[WeaponSpecial::Stun(0.2)], base_price: 4600, need_grade: Some('C') },
    WeaponDef { id: "wp_jinghuo_zhang", name: "降妖真火扇", tier: 2, dmg: (34, 50), ammo: None, dmg_type: DamageType::Energy, special: &[WeaponSpecial::Burn((6, 3))], base_price: 8600, need_grade: Some('B') },
    WeaponDef { id: "wp_jinlong_dao", name: "金蛇郎君·缠丝软剑", tier: 1, dmg: (26, 38), ammo: None, dmg_type: DamageType::Silver, special: &[WeaponSpecial::Leech(4), WeaponSpecial::Stun(0.1)], base_price: 4000, need_grade: Some('C') },
    WeaponDef { id: "wp_zhenwu_baojian", name: "真武七星剑", tier: 3, dmg: (42, 60), ammo: None, dmg_type: DamageType::Holy, special: &[WeaponSpecial::Pierce(6), WeaponSpecial::Burn((4, 3))], base_price: 21000, need_grade: Some('A') },
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
    // ==================== 增量扩充（第 3 批 · +30 护甲/饰品 · 各风格） ====================
    // ---- 战甲 / 圣衣 / 机甲（Armor）----
    GearDef { id: "gear_shengclothes_shooter", name: "射手座黄金圣衣", slot: GearSlot::Armor, dmg_reduce: 20, atk_flat: 8, dodge: 0.05, san_resist: 6, qi_max: 0, hp_max: 0, per_turn_qi: 0, dmg_mult: 1.0, price: 30000, need_grade: Some('S') },
    GearDef { id: "gear_nano_mecha_suit", name: "纳米战甲·机甲", slot: GearSlot::Armor, dmg_reduce: 16, atk_flat: 6, dodge: 0.0, san_resist: 0, qi_max: 0, hp_max: 20, per_turn_qi: 0, dmg_mult: 1.0, price: 20000, need_grade: Some('A') },
    GearDef { id: "gear_leidun_armor", name: "雷霆铠甲", slot: GearSlot::Armor, dmg_reduce: 14, atk_flat: 4, dodge: 0.0, san_resist: 0, qi_max: 20, hp_max: 0, per_turn_qi: 3, dmg_mult: 1.0, price: 17000, need_grade: Some('A') },
    GearDef { id: "gear_longlin_jia", name: "龙鳞逆甲", slot: GearSlot::Armor, dmg_reduce: 22, atk_flat: 0, dodge: 0.0, san_resist: 0, qi_max: 0, hp_max: 30, per_turn_qi: 0, dmg_mult: 1.0, price: 32000, need_grade: Some('S') },
    GearDef { id: "gear_shengguang_fapao", name: "圣光法袍", slot: GearSlot::Armor, dmg_reduce: 10, atk_flat: 0, dodge: 0.0, san_resist: 18, qi_max: 0, hp_max: 0, per_turn_qi: 4, dmg_mult: 1.0, price: 16000, need_grade: Some('A') },
    GearDef { id: "gear_tian_yi", name: "神炁天衣", slot: GearSlot::Armor, dmg_reduce: 12, atk_flat: 6, dodge: 0.08, san_resist: 8, qi_max: 0, hp_max: 0, per_turn_qi: 0, dmg_mult: 1.0, price: 18000, need_grade: Some('A') },
    GearDef { id: "gear_azote_panzhi", name: "奥术织纹布甲", slot: GearSlot::Armor, dmg_reduce: 8, atk_flat: 8, dodge: 0.0, san_resist: 5, qi_max: 0, hp_max: 0, per_turn_qi: 4, dmg_mult: 1.0, price: 13000, need_grade: Some('B') },
    GearDef { id: "gear_wh_warframe", name: "战争框架·重装", slot: GearSlot::Armor, dmg_reduce: 19, atk_flat: 10, dodge: 0.0, san_resist: 0, qi_max: 0, hp_max: 0, per_turn_qi: 0, dmg_mult: 1.0, price: 28000, need_grade: Some('A') },
    GearDef { id: "gear_ice_dragon_scale", name: "冰霜巨龙鳞甲", slot: GearSlot::Armor, dmg_reduce: 17, atk_flat: 0, dodge: 0.0, san_resist: 5, qi_max: 0, hp_max: 25, per_turn_qi: 0, dmg_mult: 1.0, price: 24000, need_grade: Some('A') },
    GearDef { id: "gear_shadow_cloak_armor", name: "暗影皮甲", slot: GearSlot::Armor, dmg_reduce: 11, atk_flat: 4, dodge: 0.10, san_resist: 0, qi_max: 0, hp_max: 0, per_turn_qi: 0, dmg_mult: 1.0, price: 15000, need_grade: Some('B') },
    // ---- 饰品 / 护符（Accessory）----
    GearDef { id: "access_divine_ring", name: "神圣婚戒", slot: GearSlot::Accessory, dmg_reduce: 0, atk_flat: 12, dodge: 0.0, san_resist: 4, qi_max: 0, hp_max: 0, per_turn_qi: 0, dmg_mult: 1.1, price: 14000, need_grade: Some('A') },
    GearDef { id: "access_frost_amulet", name: "冰封护符", slot: GearSlot::Accessory, dmg_reduce: 4, atk_flat: 0, dodge: 0.0, san_resist: 0, qi_max: 0, hp_max: 0, per_turn_qi: 0, dmg_mult: 1.0, price: 9000, need_grade: Some('B') },
    GearDef { id: "access_lightning_core", name: "雷电核心吊坠", slot: GearSlot::Accessory, dmg_reduce: 0, atk_flat: 6, dodge: 0.0, san_resist: 0, qi_max: 40, hp_max: 0, per_turn_qi: 3, dmg_mult: 1.0, price: 10000, need_grade: Some('B') },
    GearDef { id: "access_soul_bind", name: "魂之锁结", slot: GearSlot::Accessory, dmg_reduce: 0, atk_flat: 0, dodge: 0.0, san_resist: 12, qi_max: 0, hp_max: 20, per_turn_qi: 0, dmg_mult: 1.0, price: 11000, need_grade: Some('B') },
    GearDef { id: "access_dragon_seal", name: "龙纹玉玺", slot: GearSlot::Accessory, dmg_reduce: 5, atk_flat: 8, dodge: 0.0, san_resist: 4, qi_max: 0, hp_max: 0, per_turn_qi: 0, dmg_mult: 1.0, price: 16000, need_grade: Some('A') },
    GearDef { id: "access_saint_bracelet", name: "圣斗士手环", slot: GearSlot::Accessory, dmg_reduce: 0, atk_flat: 10, dodge: 0.0, san_resist: 0, qi_max: 0, hp_max: 0, per_turn_qi: 0, dmg_mult: 1.0, price: 12000, need_grade: Some('B') },
    GearDef { id: "access_truth_seeker", name: "求真透镜·感知", slot: GearSlot::Accessory, dmg_reduce: 0, atk_flat: 0, dodge: 0.06, san_resist: 6, qi_max: 0, hp_max: 0, per_turn_qi: 0, dmg_mult: 1.0, price: 9800, need_grade: Some('B') },
    GearDef { id: "access_tianxuan_jing", name: "先天玄光镜", slot: GearSlot::Accessory, dmg_reduce: 6, atk_flat: 0, dodge: 0.0, san_resist: 0, qi_max: 60, hp_max: 0, per_turn_qi: 5, dmg_mult: 1.0, price: 20000, need_grade: Some('A') },
    GearDef { id: "access_wuxin_shaer", name: "无心神砂·定魂", slot: GearSlot::Accessory, dmg_reduce: 0, atk_flat: 0, dodge: 0.0, san_resist: 16, qi_max: 0, hp_max: 0, per_turn_qi: 0, dmg_mult: 1.0, price: 13000, need_grade: Some('B') },
    GearDef { id: "access_devil_contract", name: "恶魔契约徽记", slot: GearSlot::Accessory, dmg_reduce: 0, atk_flat: 14, dodge: 0.0, san_resist: 0, qi_max: 0, hp_max: 0, per_turn_qi: 0, dmg_mult: 1.15, price: 18000, need_grade: Some('A') },
    // ---- 中低 tier 补（Armor / Accessory 混合）----
    GearDef { id: "gear_iron_warplate", name: "玄铁重甲", slot: GearSlot::Armor, dmg_reduce: 9, atk_flat: 0, dodge: 0.0, san_resist: 0, qi_max: 0, hp_max: 0, per_turn_qi: 0, dmg_mult: 1.0, price: 5200, need_grade: Some('C') },
    GearDef { id: "gear_silk_robe", name: "唐锦法衣", slot: GearSlot::Armor, dmg_reduce: 5, atk_flat: 4, dodge: 0.04, san_resist: 3, qi_max: 0, hp_max: 0, per_turn_qi: 0, dmg_mult: 1.0, price: 3600, need_grade: Some('C') },
    GearDef { id: "gear_black_tech_suit", name: "黑色科技紧身衣", slot: GearSlot::Armor, dmg_reduce: 8, atk_flat: 6, dodge: 0.06, san_resist: 0, qi_max: 0, hp_max: 0, per_turn_qi: 0, dmg_mult: 1.0, price: 7000, need_grade: Some('B') },
    GearDef { id: "gear_holy_plate_armor", name: "圣骑士板甲", slot: GearSlot::Armor, dmg_reduce: 12, atk_flat: 4, dodge: 0.0, san_resist: 6, qi_max: 0, hp_max: 0, per_turn_qi: 0, dmg_mult: 1.0, price: 9800, need_grade: Some('B') },
    GearDef { id: "access_silver_cross", name: "秘银圣十字", slot: GearSlot::Accessory, dmg_reduce: 3, atk_flat: 0, dodge: 0.0, san_resist: 8, qi_max: 0, hp_max: 0, per_turn_qi: 0, dmg_mult: 1.0, price: 6800, need_grade: Some('C') },
    GearDef { id: "access_moon_pendant", name: "月华坠饰", slot: GearSlot::Accessory, dmg_reduce: 0, atk_flat: 4, dodge: 0.05, san_resist: 4, qi_max: 0, hp_max: 0, per_turn_qi: 0, dmg_mult: 1.0, price: 6200, need_grade: Some('C') },
    GearDef { id: "access_qi_obsidian", name: "聚灵黑曜石", slot: GearSlot::Accessory, dmg_reduce: 0, atk_flat: 0, dodge: 0.0, san_resist: 0, qi_max: 50, hp_max: 0, per_turn_qi: 2, dmg_mult: 1.0, price: 7600, need_grade: Some('B') },
    GearDef { id: "access_werewolf_claw", name: "狼王獠牙挂坠", slot: GearSlot::Accessory, dmg_reduce: 0, atk_flat: 8, dodge: 0.0, san_resist: 0, qi_max: 0, hp_max: 0, per_turn_qi: 0, dmg_mult: 1.0, price: 8000, need_grade: Some('B') },
    GearDef { id: "access_ice_heart", name: "冰晶之心", slot: GearSlot::Accessory, dmg_reduce: 2, atk_flat: 0, dodge: 0.0, san_resist: 0, qi_max: 0, hp_max: 10, per_turn_qi: 0, dmg_mult: 1.0, price: 7000, need_grade: Some('B') },
    GearDef { id: "access_phoenix_feather", name: "涅槃凤羽", slot: GearSlot::Accessory, dmg_reduce: 0, atk_flat: 6, dodge: 0.0, san_resist: 4, qi_max: 0, hp_max: 0, per_turn_qi: 0, dmg_mult: 1.1, price: 15000, need_grade: Some('A') },
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
    // ==================== 增量扩充（第 3 批 · +20 法宝 · 动漫/小说） ====================
    // ---- 本命（slot=0 攻击）----
    TreasureDef { id: "tr_shengbei_shengtian", name: "圣杯·神圣权柄", slot: 0, dmg_reduce: 0, atk_flat: 18, dodge: 0.0, san_resist: 6, qi_max: 0, hp_max: 0, per_turn_qi: 0, dmg_mult: 1.3, ignore_death: false, price: 36000, need_grade: Some('S') },
    TreasureDef { id: "tr_mo_jie_jiujie", name: "魔戒·至尊戒", slot: 0, dmg_reduce: 0, atk_flat: 20, dodge: 0.0, san_resist: 0, qi_max: 0, hp_max: 0, per_turn_qi: 0, dmg_mult: 1.35, ignore_death: false, price: 40000, need_grade: Some('S') },
    TreasureDef { id: "tr_guaili_yuantu", name: "乖离剑·原质图谱", slot: 0, dmg_reduce: 0, atk_flat: 16, dodge: 0.0, san_resist: 0, qi_max: 0, hp_max: 0, per_turn_qi: 0, dmg_mult: 1.25, ignore_death: false, price: 30000, need_grade: Some('S') },
    TreasureDef { id: "tr_yinyang_jing", name: "阴阳宝镜", slot: 0, dmg_reduce: 0, atk_flat: 14, dodge: 0.0, san_resist: 4, qi_max: 0, hp_max: 0, per_turn_qi: 0, dmg_mult: 1.2, ignore_death: false, price: 22000, need_grade: Some('A') },
    TreasureDef { id: "tr_bahuang_longyin", name: "八荒龙印", slot: 0, dmg_reduce: 0, atk_flat: 12, dodge: 0.0, san_resist: 0, qi_max: 0, hp_max: 0, per_turn_qi: 0, dmg_mult: 1.15, ignore_death: false, price: 16000, need_grade: Some('A') },
    TreasureDef { id: "tr_leishen_xianglu", name: "雷神锤·神威", slot: 0, dmg_reduce: 0, atk_flat: 15, dodge: 0.0, san_resist: 0, qi_max: 0, hp_max: 0, per_turn_qi: 2, dmg_mult: 1.2, ignore_death: false, price: 24000, need_grade: Some('A') },
    // ---- 护身（slot=1 防御）----
    TreasureDef { id: "tr_mo_jing_xianshi", name: "贤者之镜·洞察", slot: 1, dmg_reduce: 14, atk_flat: 0, dodge: 0.0, san_resist: 8, qi_max: 0, hp_max: 0, per_turn_qi: 0, dmg_mult: 1.0, ignore_death: false, price: 26000, need_grade: Some('A') },
    TreasureDef { id: "tr_duantou_mojing", name: "魔镜·破碎之握", slot: 1, dmg_reduce: 13, atk_flat: 4, dodge: 0.0, san_resist: 0, qi_max: 0, hp_max: 20, per_turn_qi: 0, dmg_mult: 1.0, ignore_death: false, price: 21000, need_grade: Some('A') },
    TreasureDef { id: "tr_ahnidun_shield", name: "埃葵斯神盾", slot: 1, dmg_reduce: 18, atk_flat: 0, dodge: 0.0, san_resist: 0, qi_max: 0, hp_max: 40, per_turn_qi: 0, dmg_mult: 1.0, ignore_death: false, price: 32000, need_grade: Some('S') },
    TreasureDef { id: "tr_longnei_xiangu", name: "龙内丹", slot: 1, dmg_reduce: 10, atk_flat: 6, dodge: 0.0, san_resist: 0, qi_max: 0, hp_max: 0, per_turn_qi: 3, dmg_mult: 1.0, ignore_death: false, price: 18000, need_grade: Some('A') },
    TreasureDef { id: "tr_shenlingsan_yu", name: "神陵山玉符", slot: 1, dmg_reduce: 8, atk_flat: 0, dodge: 0.10, san_resist: 6, qi_max: 0, hp_max: 0, per_turn_qi: 0, dmg_mult: 1.0, ignore_death: false, price: 14000, need_grade: Some('B') },
    TreasureDef { id: "tr_xuanhuang_taibao", name: "玄黄太宝", slot: 1, dmg_reduce: 15, atk_flat: 0, dodge: 0.0, san_resist: 10, qi_max: 0, hp_max: 0, per_turn_qi: 0, dmg_mult: 1.0, ignore_death: false, price: 28000, need_grade: Some('S') },
    // ---- 辅助（slot=2 回气/生存/SAN）----
    TreasureDef { id: "tr_xianzhe_ziliao", name: "贤者之石·点金", slot: 2, dmg_reduce: 0, atk_flat: 0, dodge: 0.0, san_resist: 8, qi_max: 0, hp_max: 0, per_turn_qi: 8, dmg_mult: 1.0, ignore_death: false, price: 30000, need_grade: Some('S') },
    TreasureDef { id: "tr_sisin_luandao", name: "死神镰刀·摄魂", slot: 2, dmg_reduce: 0, atk_flat: 8, dodge: 0.0, san_resist: 0, qi_max: 0, hp_max: 0, per_turn_qi: 0, dmg_mult: 1.1, ignore_death: false, price: 20000, need_grade: Some('A') },
    TreasureDef { id: "tr_longzu_shengyi", name: "龙珠·七龙珠", slot: 2, dmg_reduce: 0, atk_flat: 10, dodge: 0.0, san_resist: 0, qi_max: 0, hp_max: 30, per_turn_qi: 0, dmg_mult: 1.0, ignore_death: false, price: 24000, need_grade: Some('A') },
    TreasureDef { id: "tr_mishen_zhi_tong", name: "三千世界神瞳", slot: 2, dmg_reduce: 0, atk_flat: 6, dodge: 0.08, san_resist: 8, qi_max: 0, hp_max: 0, per_turn_qi: 0, dmg_mult: 1.0, ignore_death: false, price: 21000, need_grade: Some('A') },
    TreasureDef { id: "tr_tianlu_pa", name: "天书残卷", slot: 2, dmg_reduce: 0, atk_flat: 0, dodge: 0.0, san_resist: 12, qi_max: 40, hp_max: 0, per_turn_qi: 0, dmg_mult: 1.0, ignore_death: false, price: 18000, need_grade: Some('A') },
    TreasureDef { id: "tr_huanjing_luo", name: "幻境罗盘", slot: 2, dmg_reduce: 0, atk_flat: 0, dodge: 0.0, san_resist: 0, qi_max: 30, hp_max: 0, per_turn_qi: 5, dmg_mult: 1.0, ignore_death: false, price: 16000, need_grade: Some('B') },
    TreasureDef { id: "tr_shengwg_huanghun", name: "圣域星芒", slot: 2, dmg_reduce: 3, atk_flat: 6, dodge: 0.0, san_resist: 8, qi_max: 0, hp_max: 0, per_turn_qi: 2, dmg_mult: 1.0, ignore_death: false, price: 17000, need_grade: Some('A') },
    TreasureDef { id: "tr_mengjing_guiji", name: "梦境诡计宝匣", slot: 2, dmg_reduce: 0, atk_flat: 0, dodge: 0.0, san_resist: 10, qi_max: 0, hp_max: 0, per_turn_qi: 0, dmg_mult: 1.0, ignore_death: true, price: 35000, need_grade: Some('S') },
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
    ItemDef { id: "it_core_crystal", name: "核心晶石", kind: ItemSub::Reliquary, stack: true, usable_in_fight: false, effect: ItemEffect::None, price: 2400, need_grade: Some('C') },
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