//! P1 点数消费体系集成测试：兑换扣点 + 属性生效 / 点数不足拒绝 / 复活扣点 + dead_team 变动
//! 复用 engine::goto / engine::choose 走完整场景流转（与 playthrough 同风格）。
use wuxian_horror_ch1::scenes;
use wuxian_horror_ch1::state::{GameState, Mode};
use wuxian_horror_ch1::engine;

fn pick(st: &GameState, keyword: &str) -> i32 {
    let scene = scenes::scene(&st.scene_id).expect("scene");
    let visible: Vec<_> = scene.choices.iter().filter(|c| c.cond.map_or(true, |f| f(st))).collect();
    for (i, c) in visible.iter().enumerate() {
        if c.label.contains(keyword) {
            return i as i32;
        }
    }
    panic!("scene {} 未找到含「{}」的选项；可见: {:?}",
        st.scene_id, keyword, visible.iter().map(|c| c.label).collect::<Vec<_>>());
}

/// 用例1：兑换「细胞活力强化」扣 800 点 + str_bonus+1 + strength 生效进入 done 场景
#[test]
fn exchange_strengthen_deducts_points_and_applies_bonus() {
    let mut st = GameState::new();
    st.points = 2000; // 足够兑换一项
    st.world_id = wuxian_horror_ch1::worlds::WORLD_ZHUTIAN.to_string();
    let mut deaths = vec![];
    engine::goto(&mut st, "s_nexus_exchange", &mut deaths);
    assert_eq!(st.scene_id, "s_nexus_exchange", "应进入可交互兑换场景");

    let idx = pick(&st, "细胞活力强化");
    engine::choose(&mut st, idx, &mut deaths);

    // 扣点 + 属性写入 + 进入 done 场景（Mode::Normal，非覆盖层）
    assert_eq!(st.points, 2000 - 800, "应扣 800 点");
    assert_eq!(st.str_bonus, 1, "str_bonus 应 +1");
    assert_eq!(st.scene_id, "s_nexus_exchange_done");
    assert!(matches!(st.mode, Mode::Normal));

    // 重复购买：再扣 800，str_bonus+1（可叠加成 spend sink）
    let d2 = pick(&st, "返回兑换目录");
    engine::choose(&mut st, d2, &mut deaths);
    assert_eq!(st.scene_id, "s_nexus_exchange");
    let again = pick(&st, "细胞活力强化");
    engine::choose(&mut st, again, &mut deaths);
    assert_eq!(st.points, 1200 - 800, "二次兑换再扣 800");
    assert_eq!(st.str_bonus, 2, "str_bonus 叠加到 2");
}

/// 用例2（A）：点数不足兑换 → 进入 fail 场景，不扣点、属性不变
#[test]
fn exchange_insufficient_points_rejected_no_deduction() {
    let mut st = GameState::new();
    st.points = 500; // 不足 800
    st.world_id = wuxian_horror_ch1::worlds::WORLD_ZHUTIAN.to_string();
    let mut deaths = vec![];
    engine::goto(&mut st, "s_nexus_exchange", &mut deaths);

    let idx = pick(&st, "细胞活力强化");
    engine::choose(&mut st, idx, &mut deaths);

    assert_eq!(st.scene_id, "s_nexus_exchange_fail", "点数不足应进 fail 场景");
    assert_eq!(st.points, 500, "不足时不得扣点");
    assert_eq!(st.str_bonus, 0, "不足时属性不变");
}

/// 用例2（B）：兑换权限/即时状态——兑换基因锁后选项隐藏
#[test]
fn exchange_gene_hides_after_purchase() {
    let mut st = GameState::new();
    st.points = 2100;
    st.world_id = wuxian_horror_ch1::worlds::WORLD_ZHUTIAN.to_string();
    let mut deaths = vec![];
    engine::goto(&mut st, "s_nexus_exchange", &mut deaths);

    let idx = pick(&st, "基因锁");
    engine::choose(&mut st, idx, &mut deaths);
    assert_eq!(st.scene_id, "s_nexus_exchange_done");
    assert_eq!(st.points, 100, "基因锁扣 2000");
    assert!(st.gene_lock, "gene_lock 自主开启权生效");
    assert!(st.flag("ex_bought_gene"));

    // 返回兑换目录 → 基因锁不再显示
    let d = pick(&st, "返回兑换目录");
    engine::choose(&mut st, d, &mut deaths);
    assert_eq!(st.scene_id, "s_nexus_exchange");
    assert!(pick_absent(&st, "基因锁"), "兑换后基因锁选项应隐藏");
}

/// 辅助：断言某选项不可见
fn pick_absent(st: &GameState, keyword: &str) -> bool {
    let scene = scenes::scene(&st.scene_id).unwrap();
    let visible: Vec<_> = scene.choices.iter().filter(|c| c.cond.map_or(true, |f| f(st))).collect();
    !visible.iter().any(|c| c.label.contains(keyword))
}

/// 用例3：复活队友 → 扣 4000 + dead_team 首位移除（回到存活）
#[test]
fn resurrect_deducts_points_and_removes_dead_teammate() {
    let mut st = GameState::new();
    st.points = 6000;
    st.world_id = wuxian_horror_ch1::worlds::WORLD_ZHUTIAN.to_string();
    st.dead_team = vec!["one".to_string(), "jd".to_string()];
    let mut deaths = vec![];
    engine::goto(&mut st, "s_nexus_resurrection", &mut deaths);
    assert_eq!(st.scene_id, "s_nexus_resurrection");

    let idx = pick(&st, "复活一名本次阵亡的同伴");
    engine::choose(&mut st, idx, &mut deaths);

    assert_eq!(st.scene_id, "s_nexus_resurrect_done", "成功复活进入 done");
    assert_eq!(st.points, 6000 - 4000, "复活应扣 4000 点");
    assert_eq!(st.dead_team.len(), 1, "首位阵亡者被移除");
    assert!(!st.dead_team.contains(&"one".to_string()), "一号回到存活");
    assert!(st.dead_team.contains(&"jd".to_string()), "其他阵亡者保留");
    assert_eq!(st.resurrected_name.as_deref(), Some("one"), "记录被复活队友");
}

/// 用例3（B）：复活失败——点数不足 → fail 场景，不扣点、dead_team 不变
#[test]
fn resurrect_insufficient_points_rejected() {
    let mut st = GameState::new();
    st.points = 3000; // 不足 4000
    st.world_id = wuxian_horror_ch1::worlds::WORLD_ZHUTIAN.to_string();
    st.dead_team = vec!["rain".to_string()];
    let mut deaths = vec![];
    engine::goto(&mut st, "s_nexus_resurrection", &mut deaths);

    let idx = pick(&st, "复活一名本次阵亡的同伴");
    engine::choose(&mut st, idx, &mut deaths);

    assert_eq!(st.scene_id, "s_nexus_resurrect_fail");
    assert_eq!(st.points, 3000, "不足不得扣点");
    assert_eq!(st.dead_team, vec!["rain".to_string()], "dead_team 不变");
}

/// 用例3（C）：本次轮回无人阵亡 → 提示 none 场景
#[test]
fn resurrect_with_no_dead_shows_none() {
    let mut st = GameState::new();
    st.points = 9999;
    st.world_id = wuxian_horror_ch1::worlds::WORLD_ZHUTIAN.to_string();
    st.dead_team.clear();
    let mut deaths = vec![];
    engine::goto(&mut st, "s_nexus_resurrection", &mut deaths);

    assert!(pick_absent(&st, "复活"), "无阵亡时不显示复活选项");
    // 走旧的「抚过祭坛符纹」返回张杰
    let idx = pick(&st, "抚过祭坛符纹");
    engine::choose(&mut st, idx, &mut deaths);
    assert_eq!(st.scene_id, "s_nexus_zhangjie");
}