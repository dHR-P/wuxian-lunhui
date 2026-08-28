# 副本三件套精确实现模板（照抄即可，勿改字段）

> 用途：副本实现子代理的**唯一必读文件**。所有字段签名以本文件为准，不要再读 server-rs/src 的任何大文件。
> 项目根绝对路径：`C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1`
> 交付三个全新文件 + 一个日志，**绝不修改任何既有文件**（合并由主线做）。不 build --release、不部署。

---

## 一、worlds/<slug>.rs（世界静态数据）

```rust
//! 《作品名·副本站名》世界数据
use crate::maps::{PointDef, EnemyDef, NpcDef, ZoneDef, PortalDef, GateDef};

// 每层 40 字符宽（必须精确 40，可用 # 墙 . 地板 P 出生 I 装饰）；26 行高
pub static <SLUG>_F1_MAP: &[&str] = &[
    "########################################",
    "#......................................#",
    // ... 共 26 行，中间第 2 行某格放 P（出生点）
    "########################################",
];
pub static <SLUG>_FLOOR_NAMES: &[&str] = &["一层名", "二层名", "三层名"];

pub static POINTS: &[PointDef] = &[
    PointDef { id: "xx_pt_a", name: "调查点A", floor: 0, x: 5, y: 5, route: "xx_a" },
];
pub static ENEMIES: &[EnemyDef] = &[
    EnemyDef { id: "xx_e_1", name: "敌人名", floor: 0, x: 10, y: 6, radius: 3, fight: "xx_fight_1" },
];
pub static NPCS: &[NpcDef] = &[
    NpcDef { id: "xx_n_1", name: "NPC名", floor: 0, x: 8, y: 8, talk: "xx_npc_talk" },
];
pub static ZONES: &[ZoneDef] = &[
    ZoneDef { id: "xx_z_1", name: "战圈", floor: 1, x: 12, y: 12, kind: "fight", ref_id: "xx_boss" },
];
pub static PORTALS: &[PortalDef] = &[
    PortalDef { id: "xx_p_1", floor: 0, x: 38, y: 12, to_floor: 1, tx: 2, ty: 12 },
];
pub static GATES: &[GateDef] = &[
    GateDef { id: "xx_g_1", name: "门", floor: 0, x: 20, y: 12, need_item: Some("xx_key"), need_flag: None, lock_msg: "锁着", unlock_msg: "打开了" },
];
```

要点：
- id 全部用统一前缀（如 `xx_`），POINTS/ENEMIES/... 表名固定为 `POINTS/ENEMIES/NPCS/ZONES/PORTALS/GATES`（同名，主线合并时引用这些名字）。
- 地图常量名用 `<SLUG>_F1_MAP..F{n}_MAP` + `<SLUG>_FLOOR_NAMES`。

---

## 二、scenes_<slug>.rs（场景 + 战斗表）

```rust
//! 《副本站名》场景
use crate::defs::*;
use crate::state::GameState;

static NO_EFF: [Eff; 0] = [];
static NO_CH: [ChoiceDef; 0] = [];

// —— 条件（具名 fn，不能捕获闭包）——
fn cond_has_key(st: &GameState) -> bool { st.inventory.iter().any(|i| i == "xx_key") }
fn cond_flag(st: &GameState) -> bool { st.flag("xx_flag") }

// —— 路由 fn（返回 String）——
fn route_noop(_st: &mut GameState) -> String { "xx_hub".to_string() }
// —— on_rage 空实现 ——
fn rage_none(_st: &mut GameState, _log: &mut Vec<String>) {}

pub static <SLUG>_SCENES: &[SceneDef] = &[
    SceneDef {
        id: "xx_00",
        bg: Some("img_zhuyuan_book.png"),   // 占位图，待替换
        loc: Some("场景位置名"),
        mood: "danger",                       // calm/danger/mystery/awe/choice
        speaker: Some("说话人"),
        voice: None,
        text: TextSpec::Static(&["第一段。", "第二段。"]),
        choices: &[
            ChoiceDef {
                label: "选项文本",
                sub: "选项灰字说明",
                cond: None,                    // 或 Some(cond_flag)
                effects: &[Eff::Points(10), Eff::SetFlag("xx_flag")],
                route: Route::To("xx_01"),     // 或 Route::Dyn(route_noop)
            },
        ],
        fight_id: None,   // 原生战斗场景用 Some("fight_id")，此时 choices 用 &NO_CH
        video: None,
        cine_label: None,
        overlay: None,
    },
];

pub fn <slug>_figths() -> &'static [(&'static str, FightCfg)] {
    &[
        ("xx_boss", FightCfg {
            name: "BOSS名",
            hp: 200,
            dmg: (18, 28),
            reward: 500,
            reward_why: "击败 BOSS",
            intro: "BOSS 出现！",
            rage_at: Some(80),
            rage_text: "狂暴了！",
            on_rage: rage_none,
            finisher_if: |_st, _ehp| false,
            finisher_name: |_st| "".to_string(),
            finisher_desc: |_st| "".to_string(),
            win: |_st| "xx_win".to_string(),
            death: "xx_death",
        }),
    ]
}
```

**关键字段签名（务必照抄，尤其这几个容易错）**：
- `Eff::Hurt(i32, &'static str)` —— **两个参数**：扣血值 + 归零时跳转的死亡场景 id。
- `TextSpec::Static(&'static [&'static str])` / `TextSpec::Dyn(fn(&GameState) -> String)`（Dyn 返回 String，if/else 分支字面量要 `.to_string()`）。
- `Route::To(&'static str)` / `Route::Dyn(fn(&mut GameState) -> String)`。
- `ChoiceDef.cond: Option<fn(&GameState) -> bool>`（具名 fn，不能用闭包捕获）。
- `FightCfg` 字段顺序：name, hp, dmg:(i32,i32), reward, reward_why, intro, rage_at:Option<i32>, rage_text, on_rage(fn(&mut GameState,&mut Vec<String>)), finisher_if(fn(&GameState,i32)->bool), finisher_name(fn(&GameState)->String), finisher_desc(fn(&GameState)->String), win(fn(&GameState)->String), death:&'static str。
- `SceneDef` 字段顺序：id, bg:Option<&str>, loc:Option<&str>, mood:&str, speaker:Option<&str>, voice:Option<&str>, text, choices:&[ChoiceDef], fight_id:Option<&str>, video:Option<&str>, cine_label:Option<&str>, overlay:Option<OverlayDef>。
- `OverlayDef { voice: Option<&str>, death: Option<(&str,&str)>, card: fn(&GameState)->Card }`；`Card { title:String, good:bool, body_html:String, buttons:Vec<(String,String)>, voice:Option<&str> }`。

### 选择驱动 BOSS（多段/带条件终结的写法）

```rust
fn start_boss(st: &mut GameState) -> String {
    if st.fight.is_none() {
        if let Some(cfg) = crate::scenes::fight_cfg("xx_boss") {
            st.fight = Some(crate::state::Fight {
                id: "xx_boss".into(), name: cfg.name.to_string(), hp: cfg.hp, max_hp: cfg.hp,
                dmg: cfg.dmg, reward: cfg.reward, reward_why: cfg.reward_why.to_string(),
                raged: false, rage_at: cfg.rage_at, guard_turn: false, pending_log: vec![cfg.intro.to_string()],
            });
        }
    }
    "xx_boss_round".to_string()
}
fn boss_act(st: &mut GameState, dmg: i32, guard: bool) -> String {
    if dmg > 0 { if let Some(f) = st.fight.as_mut() { f.hp = (f.hp - dmg).max(0); } }
    if st.fight.as_ref().map(|f| f.hp <= 0).unwrap_or(false) { return boss_win(st); }
    let raw = if st.fight.as_ref().map(|f| f.raged).unwrap_or(false) { 22 } else { 16 };
    let hit = !guard; // guard 时免伤
    if hit { st.hp = (st.hp - raw).max(0); }
    if st.hp <= 0 { return "xx_death".to_string(); }
    "xx_boss_round".to_string()
}
fn boss_win(st: &mut GameState) -> String {
    st.points += 500; st.set_flag("xx_boss_down"); st.sp_grade = Some('D');
    crate::world::add_item(st, "xx_reward_item");
    "xx_settle".to_string()
}
```

BOSS round 场景（Normal + Dyn）：
```rust
SceneDef {
    id: "xx_boss_round", bg: Some("img_laser.png"), loc: Some("决战处"), mood: "danger",
    speaker: None, voice: None,
    text: TextSpec::Dyn(|st| format!("BOSS 剩余 {} 血，你 HP {}", st.fight.as_ref().map(|f| f.hp).unwrap_or(0), st.hp)),
    choices: &[
        ChoiceDef { label: "重击", sub: "高伤害", cond: None, effects: &NO_EFF, route: Route::Dyn(|st| boss_act(st, 30, false)) },
        ChoiceDef { label: "防御", sub: "本回合免伤", cond: None, effects: &NO_EFF, route: Route::Dyn(|st| boss_act(st, 0, true)) },
    ],
    fight_id: None, video: None, cine_label: None, overlay: None,
},
```

---

## 三、tests/<slug>_flow.rs（3 个确定性用例，不碰随机战斗）

```rust
use wuxian_horror_ch1::scenes;

#[test]
fn <slug>_scenes_exist() {
    assert!(scenes::scene("xx_00").is_some());
    assert!(scenes::scene("xx_hub").is_some());
}

#[test]
fn <slug>_fights_exist() {
    assert!(scenes::fight_cfg("xx_boss").is_some());
}

#[test]
fn <slug>_self_consistent() {
    // 只依赖你自己刚写的 scenes 文件，不依赖任何其它 src：
    for (id, _c) in crate::scenes_<slug>::<slug>_figths() {
        assert!(scenes::fight_cfg(id).is_some(), "fight {id} 分发闭环");
    }
}
```

> **测试只依赖你刚写的 `scenes_<slug>` 文件**（`<slug>_figths()` 表）+ 全局 `scenes::scene`/`scenes::fight_cfg`。**不要**引用 `find_world`/`walkable`/`WorldData`/`w.spawn`（那些是主线合并后的职责，测试里用了会逼你去 grep worlds/mod.rs）。测试越简单越好，主线合并编译能过即可。
> 注：`crate::scenes_<slug>` 路径在测试里指代 lib crate（`wuxian_horror_ch1::scenes_<slug>`），需要主线 lib.rs 注册 `pub mod scenes_<slug>;` 后测试才编译——但这不是你现在要管的，照写即可。

---

## 三·补、重要：副本文件【不需要】写 WorldData

worlds/<slug>.rs 里**不要写、也不要纠结 `WorldData` 结构**——那是主线合并时在 `worlds/mod.rs` 里组装的（`static <SLUG>: WorldData = WorldData { id, name, difficulty, initial_scene, floors, floor_names, points, enemies, npcs, zones, portals, gates }` 并加入 WORLDS）。

你只需要在本文件提供 7 样东西（第一节已列）：
1. `<SLUG>_F1_MAP ... F{n}_MAP`（地图数组）
2. `<SLUG>_FLOOR_NAMES`
3. `POINTS`（类型 `&[maps::PointDef]`）
4. `ENEMIES`（`&[maps::EnemyDef]`）
5. `NPCS`（`&[maps::NpcDef]`）
6. `ZONES`（`&[maps::ZoneDef]`）
7. `PORTALS`（`&[maps::PortalDef]`）、`GATES`（`&[maps::GateDef]`）

**不要** read/依赖 `worlds/mod.rs`、`WorldData`、`find_world`、`walkable`、`spawn` 的定义——那些是主线合并与测试时的职责，与你写这三个新文件无关。照第一节写即可，写完就落盘，不必再查任何其它源文件。

## 附、真实可编译黄金片段（照抄，消除所有不确定）

### A. 结算卡 overlay（胜利/结束）

```rust
SceneDef {
    id: "xx_42_card", bg: None, loc: None, mood: "calm", speaker: None, voice: None,
    text: TextSpec::Static(&[]), choices: &NO_CH, fight_id: None, video: None, cine_label: None,
    overlay: Some(OverlayDef {
        voice: None, death: None,
        card: |st| crate::state::Card {
            title: "结 算".into(), good: true,
            body_html: format!("<p>你完成了这个副本。</p><table class='statTable'><tr><td>存活点数</td><td>{}</td></tr></table>", st.points),
            buttons: vec![("回 到 主 神 空 间 ▶".into(), "__enter_nexus__".into())],
            voice: None,
        },
    }),
},
```

### B. 死亡卡 overlay（死亡档案）

```rust
SceneDef {
    id: "xx_50_death", bg: None, loc: None, mood: "danger", speaker: None, voice: None,
    text: TextSpec::Static(&[]), choices: &NO_CH, fight_id: None, video: None, cine_label: None,
    overlay: Some(OverlayDef {
        voice: None, death: Some(("副本名 · 死因标题", "一句话死因描述")),
        card: |_st| crate::state::Card {
            title: "死 亡".into(), good: false,
            body_html: r#"<p>你死在了这里。</p><p style='color:#ff8a8a'>【死亡档案】</p>"#.to_string(),
            buttons: vec![("回 主 神 空 间 · 复 活".into(), "__enter_nexus__".into())],
            voice: None,
        },
    }),
},
```

### C. 选择驱动 BOSS（完整 start / act / win + round 场景）

```rust
fn start_boss(st: &mut GameState) -> String {
    if st.fight.is_none() {
        if let Some(cfg) = crate::scenes::fight_cfg("xx_boss") {
            st.fight = Some(crate::state::Fight {
                id: "xx_boss".into(), name: cfg.name.to_string(), hp: cfg.hp, max_hp: cfg.hp,
                dmg: cfg.dmg, reward: cfg.reward, reward_why: cfg.reward_why.to_string(),
                raged: false, rage_at: cfg.rage_at, guard_turn: false,
                pending_log: vec![cfg.intro.to_string()],
            });
        }
    }
    "xx_round".to_string()
}
fn boss_act(st: &mut GameState, dmg: i32, guard: bool) -> String {
    if dmg > 0 { if let Some(f) = st.fight.as_mut() { f.hp = (f.hp - dmg).max(0); } }
    if st.fight.as_ref().map(|f| f.hp <= 0).unwrap_or(false) { return boss_win(st); }
    let raw = if st.fight.as_ref().map(|f| f.raged).unwrap_or(false) { 22 } else { 16 };
    if !guard { st.hp = (st.hp - raw).max(0); }
    if st.hp <= 0 { return "xx_50_death".to_string(); }
    "xx_round".to_string()
}
fn boss_win(st: &mut GameState) -> String {
    st.points += 500; st.set_flag("xx_boss_down"); st.sp_grade = Some('D');
    crate::world::add_item(st, "xx_reward");
    "xx_42_card".to_string()
}
```
round 场景（对应 C）：
```rust
SceneDef {
    id: "xx_round", bg: Some("img_laser.png"), loc: Some("决战处"), mood: "danger", speaker: None, voice: None,
    text: TextSpec::Dyn(|st| format!("BOSS 剩余 {} 血，你 HP {}", st.fight.as_ref().map(|f| f.hp).unwrap_or(0), st.hp)),
    choices: &[
        ChoiceDef { label: "重击", sub: "高伤", cond: None, effects: &NO_EFF, route: Route::Dyn(|st| boss_act(st, 30, false)) },
        ChoiceDef { label: "防御", sub: "免伤", cond: None, effects: &NO_EFF, route: Route::Dyn(|st| boss_act(st, 0, true)) },
    ],
    fight_id: None, video: None, cine_label: None, overlay: None,
},
```

### D. 地图行精确 40 字符（避免手数出错）

用下面命令生成 40×26 的 J 层地图再贴进文件（PowerShell 一键生成，逐行精确 40）：
```powershell
$w=40; $h=26
foreach ($y in 0..($h-1)) {
  if ($y -eq 0 -or $y -eq ($h-1)) { "#"*$w }
  else { "#" + "."*($w-2) + "#" }
}
```
（把输出 26 行贴进 `<SLUG>_F1_MAP` 数组；出生点 P 就把第 3 行某格 ".". 改成 "P"，装饰 I 同理；全程不用数，改完每行仍是 40 字符。）

## 四、验收与落盘
- 每写完一个文件就落盘 `tools/design/<slug>_impl_log.md`（三文件行数 / 场景数 / BOSS 机制 / ★外部依赖清单：lib.rs `pub mod scenes_<slug>;`、worlds/mod.rs `mod <slug>;`+`WORLD_<SLUG>` 常量+WorldData 注册+可选网关、scenes.rs scene()/fight_cfg() 各加一条 or_else / 测试清单）。
- 上下文吃紧时优先 worlds + scenes，测试可只写 2 个确定性用例。
- 结构自检：所有 Route::To 目标都是已定义的 scene id；所有 fight_id 都在 <slug>_figths() 里。