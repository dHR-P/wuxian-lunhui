use wuxian_horror_ch1::engine;
use wuxian_horror_ch1::items_data;
use wuxian_horror_ch1::scenes;
use wuxian_horror_ch1::state::GameState;
use wuxian_horror_ch1::worlds;

fn held(st: &GameState, id: &str) -> usize { items_data::count_item(st, id) }
fn pick(st: &GameState, keyword: &str) -> i32 {
    let scene = scenes::scene(&st.scene_id).expect("scene");
    let visible: Vec<_> = scene.choices.iter().filter(|c| c.cond.map_or(true, |f| f(st))).collect();
    for (i, c) in visible.iter().enumerate() {
        if c.label.contains(keyword) { return i as i32; }
    }
    println!("SCENE={} visible={:?}", st.scene_id, visible.iter().map(|c| c.label).collect::<Vec<_>>());
    panic!("miss {}", keyword);
}

#[test]
fn probe() {
    let mut st = GameState::new();
    st.world_id = worlds::WORLD_ZHUTIAN.to_string();
    items_data::add_item_counted(&mut st, "it_core_sample");
    items_data::add_item_counted(&mut st, "it_soul_shard");
    items_data::add_item_counted(&mut st, "it_em_core");
    let mut deaths = vec![];
    engine::goto(&mut st, "s_nexus_exchange", &mut deaths);
    let craft = pick(&st, "合成工坊");
    engine::choose(&mut st, craft, &mut deaths);
    let a = pick(&st, "合成：普通强化石");
    engine::choose(&mut st, a, &mut deaths);
    println!("after low synth: scene={} inv={:?}", st.scene_id, st.inventory);
    let back = pick(&st, "返回兑换目录");
    engine::choose(&mut st, back, &mut deaths);
    let craft = pick(&st, "合成工坊");
    engine::choose(&mut st, craft, &mut deaths);
    println!("at craft: scene={} inv={:?}", st.scene_id, st.inventory);
    let b = pick(&st, "合成：高级强化石");
    engine::choose(&mut st, b, &mut deaths);
    println!("after hi synth: scene={} inv={:?}", st.scene_id, st.inventory);
}