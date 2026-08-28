//! 动态难度缩放（tools/design/dynamic_scaling_design.md §六）纯函数 + 集成测试。
//! 覆盖 power()/power_factor()/difficulty_scale()/fight_scale()/scaled_fight()。
//! 文件命名为 dynamic_scaling_test.rs（任务约定词尾）。
use wuxian_horror_ch1::combat_data::set_gene_stage;
use wuxian_horror_ch1::defs::{Equipment, WeaponSlot};
use wuxian_horror_ch1::power;
use wuxian_horror_ch1::scenes;
use wuxian_horror_ch1::state::GameState;
use wuxian_horror_ch1::worlds;

/// 基准：fresh GameState 的 power（无武器/装备/技能/境界）
fn fresh_power() -> i32 {
    let st = GameState::new();
    // (hp/20)=5 + weapon_atk(默认 6) = 11
    assert_eq!(power::power(&st), 11);
    11
}

/// 装备一把已知中值武器 → weapon_atk 与 power 上升
#[test]
fn power_weapon_raises() {
    let mut st = GameState::new();
    let p0 = power::power(&st);
    // 问心·青锋剑 dmg(30,46) 中值 38
    st.equipment.weapon = Some(WeaponSlot { id: "wp_cu_ju".to_string(), enhance: 0 });
    let wa = power::weapon_atk(&st);
    assert_eq!(wa, 38, "青锋剑中值 (30+46)/2 = 38");
    assert_eq!(power::power(&st), p0 + 38 - 6, "power 增加 (38 - 默认6)");
}

/// power() 对装备 atk_flat 加成敏感（护甲/饰品/法宝）
#[test]
fn power_equipped_atk_flat_raises() {
    let mut st = GameState::new();
    let p0 = power::power(&st);
    // 蛮力指环 accessory atk_flat=6
    st.equipment.accessory = Some("access_strength_ring".to_string());
    assert_eq!(power::equipped_atk_flat(&st), 6, "饰品攻击加成 6");
    // 本命飞剑·青锋 treasure atk_flat=8（直接装配 equipment.treasure[0]）
    st.equipment.treasure[0] = Some("cu_bab_benming_fejian".to_string());
    assert_eq!(power::equipped_atk_flat(&st), 6 + 8, "饰品+法宝攻击加成 14");
    assert_eq!(power::power(&st), p0 + 14, "power 随装备攻击上升");
}

/// power() 单调：基因锁阶 / 修真境界 / 技能数 各贡献
#[test]
fn power_monotonic() {
    let mut st = GameState::new();
    let p0 = fresh_power();
    // 基因锁 4 阶 → +32
    set_gene_stage(&mut st, 4);
    st.cultivation_stage = 7; // 合道 +42
    for i in 0..30 {
        st.skills.push(format!("skx_test_{i}")); // 技能贡献上限 +20
    }
    assert_eq!(power::power(&st), p0 + 32 + 42 + 20, "power 随成长单调增加");
    assert!(power::power(&st) > p0);
}

/// power_factor：P = clamp(power/25, 0.6, 4.0)
#[test]
fn power_factor_clamp() {
    // 低 power → 下限 0.6
    let mut low = GameState::new(); // power=11 → 11/25=0.44 < 0.6
    assert_eq!(power::power_factor(&low), 0.6);
    // 中 power → 线性
    low.skills.push("x".to_string()); // power=12 → 0.48 → clamp 0.6
    assert_eq!(power::power_factor(&low), 0.6);
    // 高 power → 上限 4.0
    let mut hi = GameState::new();
    hi.hp = 800;
    hi.equipment.weapon = Some(WeaponSlot { id: "wp_gravity_collapse".to_string(), enhance: 0 }); // +52
    set_gene_stage(&mut hi, 4); // +32
    hi.cultivation_stage = 7; // +42
    hi.equipment.accessory = Some("access_strength_ring".to_string()); // +6
    for i in 0..30 { hi.skills.push(format!("skx_{i}")); } // +20
    // power = 40+52+32+42+6+20 = 192 → 192/25 = 7.68 → clamp 4.0
    assert_eq!(power::power_factor(&hi), 4.0);
}

/// difficulty_scale：D 映射表
#[test]
fn difficulty_scale_table() {
    assert_eq!(power::difficulty_scale(1), 0.8);
    assert_eq!(power::difficulty_scale(2), 1.0);
    assert_eq!(power::difficulty_scale(3), 1.3);
    assert_eq!(power::difficulty_scale(4), 1.6);
    assert_eq!(power::difficulty_scale(5), 2.0);
    // 未知难度（含 0 世界难度占位）回退 1.0
    assert_eq!(power::difficulty_scale(0), 1.0);
    assert_eq!(power::difficulty_scale(6), 1.0);
    assert_eq!(power::difficulty_scale(99), 1.0);
}

/// scaling_enabled=false 安全阀：fight_scale 恒 1.0（价值观测的既有 flow 回归）
#[test]
fn fight_scale_valve_when_disabled() {
    let mut st = GameState::new();
    st.scaling_enabled = false;
    st.world_id = worlds::WORLD_BIOHAZARD.to_string(); // D=0.8
    // 即使高 power 也不缩放
    st.gene_stage = 4;
    st.cultivation_stage = 7;
    st.hp = 800;
    assert_eq!(power::fight_scale(&st), 1.0, "关闭缩放时恒 1.0");
}

/// fight_scale = D × P（开启状态，生化 difficulty=1 → D=0.8）
#[test]
fn fight_scale_multiplicative() {
    let mut st = GameState::new();
    st.scaling_enabled = true;
    st.world_id = worlds::WORLD_BIOHAZARD.to_string();
    // 低 power → factor 0.6 ; D=0.8 → scale 0.48
    assert_eq!(power::power_factor(&st), 0.6);
    assert!((power::fight_scale(&st) - 0.8 * 0.6).abs() < 1e-6);
    // 高 power → factor 4.0 → scale 3.2
    let mut hi = GameState::new();
    hi.scaling_enabled = true;
    hi.world_id = worlds::WORLD_BIOHAZARD.to_string();
    hi.hp = 800;
    hi.equipment.weapon = Some(WeaponSlot { id: "wp_gravity_collapse".to_string(), enhance: 0 });
    set_gene_stage(&mut hi, 4);
    hi.cultivation_stage = 7;
    hi.equipment.accessory = Some("access_strength_ring".to_string());
    for i in 0..30 { hi.skills.push(format!("skx_{i}")); }
    assert_eq!(power::power_factor(&hi), 4.0);
    assert!((power::fight_scale(&hi) - 0.8 * 4.0).abs() < 1e-6);
}

/// scaled_fight：关闭缩放 → Fight 数值 == 基准；开启 → hp/dmg/reward 按 scale 放大
#[test]
fn scaled_fight_applies_scale() {
    let cfg = scenes::fight_cfg("horde").expect("horde 战斗表");
    assert_eq!(cfg.hp, 55);
    assert_eq!(cfg.dmg, (11, 17));
    assert_eq!(cfg.reward, 20);

    // 关闭缩放 → 1:1
    let mut off = GameState::new();
    off.scaling_enabled = false;
    off.world_id = worlds::WORLD_BIOHAZARD.to_string();
    let f = power::scaled_fight("horde", cfg, &off, vec![]);
    assert_eq!(f.hp, 55);
    assert_eq!(f.max_hp, 55);
    assert_eq!(f.dmg, (11, 17));
    assert_eq!(f.reward, 20);
    // 关闭缩放：rage_at 保持基准（horde rage_at=Some(25)）
    assert_eq!(f.rage_at, Some(25));

    // 开启 + 高 power → scale=3.2（生物 D=0.8 × factor 4.0）
    let mut hi = GameState::new();
    hi.scaling_enabled = true;
    hi.world_id = worlds::WORLD_BIOHAZARD.to_string();
    hi.hp = 800;
    hi.equipment.weapon = Some(WeaponSlot { id: "wp_gravity_collapse".to_string(), enhance: 0 });
    set_gene_stage(&mut hi, 4);
    hi.cultivation_stage = 7;
    hi.equipment.accessory = Some("access_strength_ring".to_string());
    for i in 0..30 { hi.skills.push(format!("skx_{i}")); }
    assert!((power::fight_scale(&hi) - 3.2).abs() < 1e-6);
    let f = power::scaled_fight("horde", cfg, &hi, vec![]);
    assert_eq!(f.hp, (55.0_f32 * 3.2).round() as i32);
    assert_eq!(f.max_hp, f.hp);
    assert_eq!(f.dmg, ((11.0_f32 * 3.2).round() as i32, (17.0_f32 * 3.2).round() as i32));
    assert_eq!(f.reward, (20.0_f32 * 3.2).round() as i32);
    assert_eq!(f.id, "horde");
}

/// scaled_fight：rage_at 也同源缩放（有 rage 的副本）
#[test]
fn scaled_fight_scales_rage_at() {
    let cfg = scenes::fight_cfg("horde").unwrap(); // rage_at=Some(25)
    assert_eq!(cfg.rage_at, Some(25));
    let mut st = GameState::new();
    st.scaling_enabled = true;
    st.world_id = worlds::WORLD_BIOHAZARD.to_string();
    // 手动给出一个稳定 power → factor 用低值 0.6 → scale = 0.8*0.6 = 0.48
    // rage_at = round(25*0.48) = round(12.0) = 12
    let f = power::scaled_fight("horde", cfg, &st, vec![]);
    assert_eq!(f.rage_at, Some((25.0_f32 * 0.48).round() as i32));
    assert!(f.rage_at.unwrap() < 25, "高难缩放下狂暴阈值按 hp 同比例下修");
}

/// 防御性：缩放不破坏整数健壮性 —— 极大 power 边界不 panic / 不上溢
#[test]
fn scaled_fight_never_panics() {
    let cfg = scenes::fight_cfg("licker").unwrap(); // hp=112 dmg(15,22) reward 500
    let mut st = GameState::new();
    st.scaling_enabled = true;
    st.hp = 1_000_000;
    st.gene_stage = 4;
    st.cultivation_stage = 7;
    st.equipment = Equipment::default();
    let _ = power::scaled_fight("licker", cfg, &st, vec![]);
    let _ = power::scaled_fight("licker_y", cfg, &st, vec![]);
}