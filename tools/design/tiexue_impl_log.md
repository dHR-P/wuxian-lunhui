# 《无限曙光 · 铁血·地底金字塔》实现日志

> 子代理「无限曙光·铁血·地底金字塔 副本实现」产物记录（模型 tokenrhythm/deepseek-v4-flash-0731）。
> 只写全新文件，绝不改动既有文件。依据 `design/zhttty_universe/wuxian_shuguang/tiexue_jinzita.md`
> （§3 地图 / §5 BOSS / §6 剧情 / §10 实现风险）。
> 主题：南极冰原下三千米，铁血战士以异形为猎物豢养千年的祭坛金字塔；轮回者既是闯入的猎物，
> 也是打破祭典的人。剧情开放——铁血战士可战可和（无对错）。
> 钩子「猎人，猎物，在这里，是同一个词。」
> 世界 id 常量 `WORLD_TIEXUE="tiexue"` 由主线注册（本子代理不注册、不改 mod.rs）。

## 落地方案（零新引擎系统，复用藏经阁/机关城选择驱动模板）

- **世界**：3 层（L1 冰层营地·裂谷入口 / L2 金字塔墓道迷宫 / L3 祭坛圣殿·皇后巢），每层 40×26。
- **单向下潜链**（仿机关城 p_jc_4 / 藏经阁 p_cj_4）：前向 T1(9,11)L1→L2(18,2)、T3(37,23)L2→L3(1,2)
  物理单向（只建起点门不建反向门）；T5(10,19)L2 → (29,21) 单向捷径（箱庭闭环）；T6 为 L3 回归圣门
  （G4 门禁锁定，出口调查点 tx_p_return 承载回主神结算）。
- **门禁软锁链**（G2→G3→G4，设计 §3.3/3.4）：
  - G2 核心墓室·石板门 `tx_g2_open`（铁血腕刃 iron_blade **或** 酸蚀 flag，双解法防卡关）；
  - G3 祭坛圣门 `altar_key`（解读祭坛石板）；
  - G4 回归圣门 `queen_defeated`（皇后胜利）。
- **主线 BOSS 异形皇后（HP200，狂暴阈 100，奖励 500）**：选择驱动遭遇链，双终结二选一——
  - ① 结盟线（flag `predator_alliance`）→ 特殊选项【铁血·肩炮助战】大额固定伤害（置 `tx_queen_shoulder`）；
  - ② 无结盟 → 祭坛酸液机关（ZoneDef puzzle tx_z_acid，2 步踩石板→`tx_acid_primed`）→【祭坛酸液喷口】
    （置 `tx_queen_acid`）。
  - 狂暴「破卵增员」= 伤害 +6（敌攻区间 26~36）；若已清扫卵巢 `eggs_smashed`(≥3 处) 增员压力减半（扣 3），
    以「先攻首击减伤（camp_prepared -8）」呼应设计 §6 A 加固营地。
  - 胜利：+500、AddItem `death_divinity_shard`、置 `queen_defeated`（开 G4）；失败→死亡档案。
- **支线 BOSS 铁血·成年礼战士（HP150，狂暴阈 60，奖励 300）**：可战可和——

  - **结盟**（谈话 tx_40_predator「归还腕刃」需 iron_blade）→ 置 `predator_alliance`（皇后战触发肩炮终结）；
  - **猎杀**（「伏击猎杀」→ tx_predator_round 选择驱动）→ 胜利 +300、AddItem `predator_wristblade_elite`、置 `predator_hunted`。
  - 狂暴后【腕刃连斩】con 终结。
- 普通杂兵（facehugger/scout/drone/warrior/guard）走 EnemyDef + fight_id 场景，引擎原生战斗，win 依楼层回对应 hub。

## 最终产物（实现完成）

**三文件行数**：
| 文件 | 行数 |
|---|---|
| `server-rs/src/worlds/tiexue.rs` | 190 |
| `server-rs/src/scenes_tiexue.rs` | 798 |
| `server-rs/tests/tiexue_flow.rs` | 206 |
| `tools/design/tiexue_impl_log.md` | 本文件 |

**场景 / fight 数**：TIEXUE_SCENES = **30 个场景**（id 全 `tx_`）；tiexue_figths = **7 场战斗**（id 全 `tx_`：facehugger/scout/drone/warrior/guard/iron_predator/alien_queen）。主线 BOSS 异形皇后 HP200（首版按设计 §10#5 由 240 落地至 200，平衡迭代可上探）、狂暴阈 100、奖励 500；支线铁血 HP150、狂暴阈 60、奖励 300。

**皇后战 / 可战可和铁血 / 双终结 实现**：
- **皇后战**：`tx_55_queen_start` → `start_queen`(Route::Dyn 初始化 st.fight) → `tx_queen_round` 每回合重击/连击/防守（queen_act 统一扣血→胜利判定→狂暴破卵增员→敌攻），hp≤0 → `queen_win`（+500/shard/queen_defeated）→ `tx_60_queen_win` 圣像调查（拾取神性）→ `tx_61_shard` → `tx_90_exit` → 结算卡 `tx_95_card`。失败 → `tx_98_death_queen`。
- **可战可和铁血**：`tx_40_predator` 谈话分「归还腕刃（结盟）/伏击猎杀（可选碍）」。结盟 → `return_blade` 置 `predator_alliance`；猎杀 → `start_predator`/`tx_predator_round`（predator_act 同调 + 狂暴【腕刃连斩】con 终结）→ `predator_win` 置 `predator_hunted` + 掉 `predator_wristblade_elite`。二选一互斥（cond_can_ally / cond_can_hunt）。
- **双终结二选一**：皇后 round 中按 flag 显形终结选项——`predator_alliance` →【铁血·肩炮助战】`finisher_shoulder`(45)；`tx_acid_primed` →【祭坛酸液喷口】`finisher_acid`(55)。二者任一均可胜（若都达成，结盟线优先展示肩炮）。

**G2 双解法防卡关**：腕刃路线（L1 冻尸→iron_blade→置 tx_g2_open）或 酸蚀路线（L2 `tx_32_acid`「引酸蚀门锁」→ HP-15 + 置 tx_g2_open）；G3 需 altar_key；G4 需 queen_defeated。

**与设计差异（如实）**：
- 皇后 HP 按 §10#5 落地 **200**（设计建议 240 留待平衡迭代）。
- 「破卵增员」未做真·多波波次，按 §10#1「零改动降级方案」以 **on_rage 文案 + 伤害 +6**（清扫卵巢则增员压力减半）模拟增员压力。
- 铁血盟友「跟随半径」降级为圣殿固定点位 NPC（§10#2 零改动降级）。
- L1 补给箱（HP+10 San+5）落地为 `+20 点 + San+5`（引擎 Eff 无 Heal；不以 -Hurt 反作弊）。
- 单向下潜 T1/T3/T5/T6，T6 出口由调查点 tx_p_return 承载回主神结算（复用 sanitize / __enter_nexus__ 惯例）。
- 结算：`route_exit_settle` 按 5 个支线 flag（frozen_predator/altar_key/eggs_smashed/predator_alliance/predator_hunted）统一补发 +200×N，评级 S≥1600/A≥1300/B≥1000/C≥700/D；沿主线视图惯例返回主神。

## ★外部依赖（主线合并时需扩展）

1. `server-rs/src/lib.rs`：加 `pub mod scenes_tiexue;`（并确保 test 引用 `wuxian_horror_ch1::scenes_tiexue` 可达）。
2. `server-rs/src/worlds/mod.rs`：`mod tiexue;` + `pub const WORLD_TIEXUE: &str = "tiexue";`
   + 定义 `static TIEXUE: WorldData`（id=WORLD_TIEXUE，initial_scene="tx_00_open"，
   floors=[TIEXUE_L1_MAP, TIEXUE_L2_MAP, TIEXUE_L3_MAP]，各对象表引用 tiexue::*）加入 `WORLDS`；
   可选在 `GW_PORTALS` 加 `gw_tiexue` 主神网关（落点=P L1 出生点 (1,1)）。
3. `server-rs/src/scenes.rs`：`scene()` 并检索 `scenes_tiexue::TIEXUE_SCENES`；
   `fight_cfg()` 并检索 `scenes_tiexue::tiexue_figths()`。

## 测试清单（tiexue_flow.rs 3 例，已在临时 scratch crate 全绿）

1. `tiexue_map_reachable` — 每层地图 40×26、出生点 P(1,1)、调查点/传送门落点可走动、单向下潜门齐备 + 战斗表 7 场 id 齐全、皇后 200/狂暴100、铁血 150。
2. `tiexue_main_line_alliance_shoulder_finisher` — L1 取腕刃→G2→祭坛石板(altar_key)→G3→L3→铁血结盟→皇后战**肩炮终结**→拾神性→回归圣门→结算 (tx_95_card)。
3. `tiexue_hunt_and_acid_finisher` — 铁血**猎杀线**（伏击→腕刃连斩→predator_hunted+猎场之礼）；无结盟时踩酸液机关→皇后战**酸液终结**。

> 验证方式：临时 scratch crate 把 server-rs 复制到 TEMP，在副本里把上述 3 处外部依赖临时接上
> （lib.rs / mod.rs / scenes.rs），`cargo check --lib` EXIT=0、`cargo test --test tiexue_flow` 3/3 ok；
> 主工程不 build --release，既有文件一个字节未改（副本经 UTF-8 安全写入回写，验证过字节未损坏）。
> 注：主工程仓库内存在 `tests/poxiao_flow.rs`（引用未注册的 `WORLD_POXIAO`），与铁血无关，
> 属其他并行副本的在途/遗留测试，不影响本副本产物。

## 待素材替换清单（现用现有图占位）

| 层 | 场景 bg id | 现用占位 |
|---|---|---|
| L1 冰层营地 | tx_bg_ice | img_zhuyuan_book.png |
| L2 金字塔墓道 | tx_bg_maze | img_corridor.png |
| L3 祭坛圣殿 | tx_bg_altar | img_laser.png |

敌人立绘复用：licker→异形、hunter→铁血战士；异形同模可出多色；新美术由主 agent 统一生图替换
（enemy_facehugger / enemy_alien_drone / enemy_alien_warrior / enemy_alien_guard / enemy_predator / enemy_alien_queen）。