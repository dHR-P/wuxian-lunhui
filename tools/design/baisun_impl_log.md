# baisun（命运清单 · 第二端）副本三件套实现日志

> world slug: `baisun`，id 前缀 `bs_`。副本身份：《无限恐怖 · 命运清单 · 第二端》。
> 为第二个「死神来了」系副本（与既有 `sishen` 命运清单第一端并列为独立的全新世界观，「规则流机关」非线性副本诱因），绝不改动任何既有文件。

## 一、交付文件与状态（全部落盘）

| 文件 | 行数 | 状态 |
|--|--|--|
| `server-rs/src/worlds/baisun.rs` | 154 | 已落盘（3 层 40×26 地图 / POINTS 12 / ENEMIES 1 / NPCS 3 / ZONES 4 / PORTALS 2 / GATES 2） |
| `server-rs/src/scenes_baisun.rs` | 512 | 已落盘（SceneDef 30 / fights 1 / 结算卡+死亡卡 overlay） |
| `server-rs/tests/baisun_flow.rs` | 46 | 已落盘（4 个确定性用例：scenes_exist / fights_exist / self_consistent / rule_flow_present） |

## 二、规则流 / BOSS 机制

- **主题**：世界展示向、无真相线、开放结局的「规则流机关」副本——死神无实体，以「连环意外」收命，剧作靠**预判/识破机关**改命，不靠正面武力。
- **三条致命机关**（`ZoneDef kind=env`），每线一个「死亡征兆」flag：
  - L1 医院停车场 → **吊机坠物**（`bs_foresee_drop`）
  - L2 室内商场合订结构 → **电梯夹**（`bs_foresee_elev`）
  - L3 电影院逃生梯 → **火灾逃生**（`bs_foresee_fire`）
- **识破征兆改命**：观测点场景（`bs_01_*` / `bs_04_*` / `bs_07_*`）置 `bs_foresee_*`；对应机关 `zone_drop/elev/fire` 未识破则死亡档案「意外身故」`bs_50_death`，已识破则免死加点回对应 hub。
- **三征兆齐备** → `bs_fate_rewritten`（`foresaw()` flag 链，+150 结算加成 + sp_grade=D）。
- **选择驱动 BOSS**（黄金模板 C）：L3 楼梯间 `bs_boss`（死神·使者，HP 150，dmg 16-24，rage_at 60）。`start_boss` → `bs_boss_round`（重击/防御），`boss_act` 结算敌我 HP（guard 免伤），`boss_win` 置 `bs_boss_down` + sp_grade=D + 掉落 `bs_medallion` → `bs_boss_win` → `bs_settle`。
- **开放结局**：结算 `bs_settle` 按 `bs_fate_rewritten` / `bs_boss_down` / 普通三分支 → `route_settle`（sp_grade 兜底 D）→ 结算卡 `bs_42_card`；任意未识破死亡 → `bs_50_death`。
- **bg 全部占位**：`img_zhuyuan_book.png` / `img_laser.png` / `img_corridor.png`（L1/L3 分布见文件，待主线素材替换）。

## 三、★外部依赖清单（主线合并时必做，缺一不可）

1. **worlds/mod.rs 注册**：`mod baisun;` → `pub static WORLD_BAISUN: &WorldData = &WorldData { id: "baisun", name: "命运清单·第二端", difficulty, initial_scene: "bs_00", floors: &[baisun::BAISUN_L1_MAP, baisun::BAISUN_L2_MAP, baisun::BAISUN_L3_MAP], floor_names: baisun::BAISUN_FLOOR_NAMES, points: baisun::POINTS, enemies: baisun::ENEMIES, npcs: baisun::NPCS, zones: baisun::ZONES, portals: baisun::PORTALS, gates: baisun::GATES };` 并加入 `WORLD_*` 常量数组。
2. **scenes.rs 检索扩展**：`scene()` 与 `fight_cfg()` 各加一条 or_else 检索 `scenes_baisun::BAISUN_SCENES` / `scenes_baisun::bs_fight_cfg`（或 by_name/分发扩展）。
3. **lib.rs 注册**：`pub mod scenes_baisun;`（测试路径 `wuxian_horror_ch1::scenes_baisun` 已按此引用）。
4. **素材替换**：`img_zhuyuan_book.png` / `img_laser.png` / `img_corridor.png` 三张占位图替换为 L3/L2/L1 场景立绘背景。
5. **新道具注册**：应清理掉 `bs_boss_win` 掉落的 `bs_medallion` 至 `items_data.rs`（象征战战利品；若不想做道具可改为 `Eff::Points`，由主线取舍）。
6. **sp_grade 经济线**：`route_settle` / `boss_win` 置 `sp_grade = Some('D')`，纳入主线支线/评级结算（与既有 D 级标准一致）。
7. **死亡复活接线**：`bs_50_death` overlay 死亡档案按主线复活系统扣 300 回主神空间（`__enter_nexus__`）。
8. **测试清单**：`tests/baisun_flow.rs` 4 用例（scenes_exist / fights_exist / self_consistent / rule_flow_present）。

## 四、验收自检（已核）

- 所有 `Route::To` 目标 ∈ 30 个 SceneDef 定义集（24 个 distinct 目标，0 缺失）。
- 所有 POINTS/NPC talk/ZONE ref 均指向已定义场景；`bs_boss` 为唯一 fight（ENEMIES.ZONES fight 均引用 `bs_boss`，位于 `baisun_figths()`）。
- 三层地图共 78 行全为 40 字符（26 行×3），逐行校验无越界；`P` 出生点 (8,3)。
- 未 build --release、未部署、未跑 cargo test（按子代理要求）。
- BOSS 机制一句话：**选择驱动·无实体使者**——规则流识破三征兆改命为主线，仅 L3 一个 HP150 的「死神·使者」象征战（可完全绕过）。