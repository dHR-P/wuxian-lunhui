//! 《生化危机·伊芙琳·浣熊市地下》任务世界 · 集成测试（确定性、不碰随机战斗）。
//! 只依赖 scenes_shenghua3::shenghua3_figths() + scenes::scene/fight_cfg（主线合并后分发闭环）。
//! 结构参考 tools/design/impl_template.md 三节模板；不依赖 find_world/walkable（主线 merge 职责）。

use wuxian_horror_ch1::scenes;
use wuxian_horror_ch1::scenes_shenghua3;

/* ---------------- ① 场景存在性 ---------------- */
#[test]
fn sh3_scenes_exist() {
    // 开场 + 三层 hub + BOSS round + 第二选择 + 结算卡 + 死亡卡
    assert!(scenes::scene("sh3_00").is_some(), "开场缺");
    assert!(scenes::scene("sh3_01_l1_hub").is_some(), "L1 hub 缺");
    assert!(scenes::scene("sh3_03_l2_hub").is_some(), "L2 hub 缺");
    assert!(scenes::scene("sh3_04_l3_hub").is_some(), "L3 hub 缺");
    assert!(scenes::scene("sh3_30_final_choice").is_some(), "第二选择缺");
    assert!(scenes::scene("sh3_09_boss_round").is_some(), "BOSS round 缺");
    assert!(scenes::scene("sh3_42_card").is_some(), "结算卡缺");
    assert!(scenes::scene("sh3_50_death").is_some(), "死亡卡缺");
    // 三个开放结局分支
    assert!(scenes::scene("sh3_31_spare").is_some(), "宽赦结局缺");
    assert!(scenes::scene("sh3_32_feed").is_some(), "喂给结局缺");
    assert!(scenes::scene("sh3_33_blowup").is_some(), "引爆结局缺");
}

/* ---------------- ② 战斗表完整性 & 分发闭环 ---------------- */
#[test]
fn sh3_fights_exist() {
    assert!(scenes::fight_cfg("sh3_boss").is_some(), "追踪者 BOSS 缺");
    assert!(scenes::fight_cfg("sh3_fight_l1").is_some());
    assert!(scenes::fight_cfg("sh3_fight_l2").is_some());
    assert!(scenes::fight_cfg("sh3_fight_l3").is_some());
    let boss = scenes::fight_cfg("sh3_boss").expect("boss");
    assert_eq!(boss.hp, 260, "追踪者·复仇女神 HP 应 260");
}

/* ---------------- ③ 自洽：figths() 表所有 id 分发闭环 ---------------- */
#[test]
fn sh3_self_consistent() {
    for (id, _c) in scenes_shenghua3::shenghua3_figths() {
        assert!(scenes::fight_cfg(id).is_some(), "fight {id} 分发闭环");
    }
    // 证据 flag 链关联的门禁场景存在（结构自检）
    assert!(scenes::scene("sh3_10_sewage_ok").is_some());
    assert!(scenes::scene("sh3_40_death_sewage").is_some());
}