//! 黄金示例副本 tests（确定性，不碰随机战斗）
use wuxian_horror_ch1::scenes;

#[test]
fn demo_scenes_exist() {
    assert!(scenes::scene("dm_00").is_some());
    assert!(scenes::scene("dm_01").is_some());
}

#[test]
fn demo_fights_exist() {
    assert!(scenes::fight_cfg("dm_boss").is_some());
}

#[test]
fn demo_self_consistent() {
    for (id, _c) in wuxian_horror_ch1::scenes_demo::demo_figths() {
        assert!(scenes::fight_cfg(id).is_some(), "fight {id} 分发闭环");
    }
}