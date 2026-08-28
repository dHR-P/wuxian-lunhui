# Rust 多世界框架技术方案 · 无限宇宙（Z 宇宙）

> 设计子代理：模型 `tokenrhythm/deepseek-v4-flash-0731`，角色 = Rust 游戏架构师（Tauri v2 多世界框架）
> 依据：代码事实取自 `server-rs/src/`（main.rs / world.rs / maps.rs / state.rs / engine.rs / scenes.rs / defs.rs / lib.rs，均已逐一通读）+ 设计库 `design/zhttty_universe/00_INDEX.md`、`00_ENGINE_CONTEXT.md`、`wuxian_kongbu/zhouyuan.md`
> 范围：**只做设计**，不写实现代码、不修改任何游戏文件。本文档是唯一产出。
> 标注：「推断」= 无法联网核实、基于代码事实与 zhttty 作品设定知识给出的工程/叙事推断；其余均依据已读文件事实。
> 输出位置：`tools\design\multi_world_framework.md`（本文档），供主 agent 排期落地。

---

## 0. 结论速览（推荐方案一页纸）

1. **世界标识**：顶层独立字段 `world_id: String`，三值起步 —— `"zhutianshenkong"`（主神空间枢纽世界）、`"biohazard_ch1"`（现有生化蜂巢，全量保留）、`"zhuyuan"`（咒怨，P3 接入）；`floor` **保持 `usize` 不变**（语义 = 当前世界内楼层），**不引入 `(world_id, floor)` 复合类型**——三级寻址 `(world_id, floor, x/y)` 由「独立 world_id + 世界数据表按 floor 索引」自然成立，改动面最小。
2. **地图/对象静态数据每世界一份**（WorldData 注册表）；**运行时状态（map_objs / enemies_alive）每世界一份快照**（`world_states`），但**保留现有顶层字段作为「活跃世界镜像」**——所有旧代码零改动，存档迁移不丢数据；**explored 轮回迷雾升级为全局带世界前缀 `"world:floor:x:y"`** 并一次性迁移。
3. **跨世界传送门**：`PortalDef` 增加可选 `to_world` 字段（None = 世界内切层，现状不变）；主神空间与各副本世界互相放置「网关传送门」（id 用 `gw_` 前缀全局唯一）。生化侧出口 = F4 站台列车处新增主神光柱；主神广场 = 传送门阵列。
4. **存档 v2 完全兼容 v1**：全部新字段 `#[serde(default)]` + 统一入口 `migrate_save()`；旧存档自动视为 `world_id="biohazard_ch1"`，生化进度（楼层/探索/敌人/门禁/剧情旗标/点数）一个字段都不丢。**P0~P3 无任何一步破坏旧存档**。
5. **IPC 契约向后兼容扩展**：`api_world` 增 `world` 元信息对象（id/名称/难度/已通关/sp_grade）；`api_world_interact` 在现有 6 路查找前新增第 7 路「全局网关传送门」；新增 `api_nexus_respawn`（死亡扣点复活回主神）与 `api_nexus_enter`（结算后进入主神世界地图）；约定 scene_id 命名空间 = 共享系统场景（死亡 e_* / 结算 s_settle / 主神 s_nexus*）+ 世界前缀场景（咒怨 zy_*），`engine::goto` 不隐式切世界。
6. **模块化**：新增 `worlds/` 模块（WorldData 定义 + WORLDS 注册表 + switch_world 惰性初始化），`maps.rs` 逐步收敛为世界实现而非全局单表；**加载策略 = 静态数据编译期常驻 + 运行时状态按世界惰性初始化**（避免未来 15+ 副本全量初始化）。
7. **实施节奏**：P0 数据模型+迁移 → P1 主神空间世界 → P2 跨世界互进出+复活流 → P3 咒怨接入（前置 `sp_grade` 字段）。每阶段文件清单与验收点见 §6。

---

## 1. 现状架构盘点（单世界 · 代码事实）

### 1.1 数据流总览

```
┌─ 标题页 ─┐
│ api_new / api_continue ──► Session(Mutex<GameState>) 全局唯一会话
└──────────┘                         │
    api_new: GameState::new() → world::world_init()(出生点/武器/敌人全活)
            → engine::goto("s_office") → render() + world::world_view() 拼接
            → 前端 World2D 渲染（2D 俯视 40×26×4 层）
                                     │
    ┌─────────────── 2D 世界循环 ─────────────────┐
    │ api_world_move(dx,dy) → world::try_move()   │ ← 碰撞/门禁/敌人触发/传送门切层
    │ api_world_interact(obj_id) → 6 路路由:        │
    │   gate → zone(副本入口) → enemy(战斗副本)     │
    │   point(调查→场景) → npc(对话→场景)          │
    │   portal(楼层切换 st.floor=to_floor)         │
    └──────────────────────────────────────┘
                                     │
    ┌─ 3D 副本（Zone3D）──────────────────────┐
    │ api_world_interact(zone/enemy) → zone_enter_inner()
    │ api_zone_action("attack") → run_zone_combat_round() → 复用 engine::choose
    │ win  → world::kill_enemy() + st.zone=None → 回地图
    │ dead → st.zone=None + 死亡卡片(Overlay e_*) → 前端展示
    └─────────────────────────────────────────────┘
                                     │
    ┌─ 剧情/结算（SceneDef）──────────────────┐
    │ api_scene_goto(scene_id) → engine::goto() → render()（含“返回地图”按钮）
    │ 通关 → s_escape_train → s_settle → compute_settlement()
    │       → 结算卡 → __card_nexus__ → api_nexus → card_nexus(主神兑换卡)
    │       → __title__（重开轮回，api_new）
    └─────────────────────────────────────────────┘
   每次关键动作 → save_state() 全量写 data/save.json（顶层 GameState serde_json）
```

### 1.2 存档 save_state 关键字段（state.rs GameState，序列化部分）

| 字段 | 类型 | 语义 | 多世界改造影响 |
|---|---|---|---|
| hp / san / points / weapon / ammo / gene_lock / gene_lock_used | 标量 | 轮回者本体数值 | 全局（跨世界共享） |
| flags | `BTreeMap<String,bool>` | 剧情旗标（生化 7 侧支线：A/B1/B2/C/decon_truth/server_cooling/nav_manual_cross） | 全局；命名按世界前缀约定 |
| dead_team | `Vec<String>` | 队友死亡（one/rain/kaplan/jd 全局 4 人） | 全局（咒怨队友问题见 §7 风险） |
| scene_id | `String` | 当前场景（全局唯一字符串命名空间） | 约定化（§4.4） |
| laser_fails | `i32` | 激光机关失败次数 | 不动 |
| fight | `Option<Fight>` | 战斗实例 | 不动（副本内） |
| px / py | `usize` | 玩家格坐标 | 每世界有效 |
| **floor** | `usize` | **楼层 0~3（与 maps::FLOOR_NAMES 索引一一对应）** | **保持 usize，不复合化（§2.2）** |
| inventory | `Vec<String>` | 道具（含 lab_badge 等门禁道具） | 全局 |
| map_objs | `BTreeMap<String,bool>` | 门禁/调查点/区域解锁状态 | 每世界一份（§2.4） |
| enemies_alive | `BTreeMap<String,bool>` | 敌人存活 | 每世界一份（§2.4） |
| zone | `Option<ZoneSession>` | 3D 副本会话 | 不动（天然属于当前世界） |
| explored | `BTreeSet<String>` | **"floor:x:y" 轮回记忆迷雾** | **key 升级为 "world:floor:x:y"（§2.5）** |
| mode / pending_death / settle_total / settle_rank | `#[serde(skip)]` | 运行时态 | 不动 |

### 1.3 地图与对象静态表（maps.rs）

- 常量：`MAP_W=40, MAP_H=26, FLOORS=4`，`FLOOR_NAMES: [&str; 4]`。
- 地形：`F1_MAP..F4_MAP` 四个 `&[&str]` ASCII 数组（P=出生点，I=装饰）。
- 对象静态表（均带 floor/x/y）：`POINTS`(调查点,route→场景 id)、`ENEMIES`(敌巡逻,fight→FIGHTS id)、`NPCS`(对话,talk→场景 id)、`ZONES`(puzzle/fight 副本)、`PORTALS`(物理单向切层)、`GATES`(门禁软锁 need_item/need_flag)。
- 查询函数（全全局单表）：`tile(w,x,y)`（内部 match 0..=3→F1..F4，`_=>F4` 兜底）、`walkable`、`spawn`、`gate_at/gate_by_id`。

### 1.4 单世界硬编码清单（= 多世界改造点，全部有代码事实依据）

| # | 硬编码点 | 位置 | 改造方向 |
|---|---|---|---|
| H1 | `st.floor usize` + `maps::FLOOR_NAMES[st.floor]` | main.rs / world.rs / maps.rs | floor 语义不变，名称查询改走 WorldData.floors（§5.1） |
| H2 | `tile(floor,..)` 内部 `match 0=>F1 1=>F2 2=>F3 _=>F4` | maps.rs | 改走 `WorldData.floors[floor]` |
| H3 | explored key `"floor:x:y"` + `strip_prefix("floor:")` 过滤 | world.rs world_view / reveal_around | key 升格 `"world:floor:x:y"`，迁移重写（§2.5/§3.2） |
| H4 | 全局面对象表+查询（§1.3） | maps.rs | 归入 WorldData 注册表（§5.1） |
| H5 | `compute_settlement` 硬编码 7 侧支线 + S≥1600 阈值 | scenes.rs:180 | 按 world_id 分派支线表，公式骨架不变（§4.5） |
| H6 | 通关循环 `s_settle → __card_nexus__ → card_nexus → __title__` | scenes.rs / client.js | 结算后进主神空间**世界**（地图），轮回重启入口移入主神（P1） |
| H7 | 死亡卡片按钮硬编码 `__title__`（轮回重启），**无扣点复活** | scenes.rs death_card / engine.rs choose | 新增 `__respawn_nexus__` 复活路由（P2） |
| H8 | 队友名单 `["one","rain","kaplan","jd"]` 全局 | state.rs alive_count / engine.rs hud_json | P3 前定夺每世界队友（§7 风险） |
| H9 | scene_id 无前缀全局命名 | scenes.rs / defs.rs | 命名约定化，现有 id 不重命名（§4.4） |
| H10 | `api_nexus` = 纯卡片（主神空间不是地图） | main.rs:150 / scenes.rs card_nexus | P1 改造为主体「进入主神世界地图」，卡片保留为兑换目录 |

### 1.5 主神空间现状与缺口

- 现状只有场景卡片：`s_nexus`（第一次轮回开场教学）→ `card_nexus`（通关后兑换目录，张杰台词 + 4 条兑换 + 「下一部恐怖片：咒怨」预告 + `__title__`）。
- 缺口（与 00_INDEX「Z 宇宙扩展目标 = 主神空间成为主箱庭」对齐）：无可探索 2D 地图、无传送门阵列、无复活/死亡扣点流程、无多副本入口、无多世界存档语义。
- 依据：ENGINE_CONTEXT §4「主神空间雏形」；00_INDEX §4.4 咒怨「首次进入需先通关生化」。这些是设计图书馆既定方向，非本文推断。

---

## 2. 多世界数据模型设计

### 2.1 世界标识与三级寻址（推荐方案）

```text
世界常量（统一在 worlds/mod.rs 定义）:
  "zhutianshenkong"   主神空间（枢纽世界，P1 建）
  "biohazard_ch1"     生化危机·蜂巢（现有 4 层，全量保留为第一副本）
  "zhuyuan"           咒怨（3 层，下一副本，P3 接入）
  未来: honghuangli_* / wuxian_weilai_* ...（15+ 副本的 world_id 待设计库落地时注册）

三级寻址: (world_id, floor, x/y)
  - world_id 决定"哪一张世界数据表"
  - floor 决定"该世界第几层图"
  - (x,y) 决定"该层内格子"
```

**结论（明确，不罗列犹豫）**：`world_id: String` 作为 `GameState` 顶层独立字段；`floor` **保持 `usize` 现状**，不改成 `(world_id, floor)` 复合类型。理由：

1. **序列化与迁移零摩擦**：v1 存档的 `floor` 原样反序列化，无需任何转换；复合类型必须拆/并字段，反而引入迁移风险（H1）。
2. **代码改动面最小**：`world_view` / `try_move` / `nearby_interactables` 的所有楼层运算语义不变，只需把「查全局表」换成「查当前世界表」（§5.1）。
3. **前端契约稳定**：`"floor": 0..3`、`"floor_name"` 字段名与含义不变，前端 World2D 零改动起步（仅新增世界标题展示，§2.7）。
4. 复合类型唯一的收益是编译器防止「跨世界楼层张冠李戴」；该收益由「查询必须显式传 world」的 WorldData 接口设计获得（§5.1），不必以类型系统代价换取。

### 2.2 floor 字段演进结论

- **演进后语义**：`st.floor` = 「当前世界（st.world_id）内的楼层索引」。切换世界时，`floor/px/py` 由目标世界的传送门落点整体覆写（与现有传送门覆写 floor 同构）。
- **FLOOR_NAMES 索引问题**（H1/H2）随 WorldData 化消失：`WorldData.floors: &'static [&'static [&'static str]]` + `WorldData.floor_names`，查询 `world.floors[floor]`，彻底摆脱 `match 0..=3`。

### 2.3 数据归属总表（每世界一份 vs 全局）

| 数据 | 归属 | 理由 |
|---|---|---|
| w/h/floor_names/tiles 静态地形 | **每世界一份**（WorldData.floors） | 世界即地图集，咒怨 3 层/生化 4 层互不共享 |
| POINTS/ENEMIES/NPCS/ZONES/PORTALS/GATES 静态对象表 | **每世界一份**（WorldData.*） | 对象 id 命名空间隔离（咒怨 zy_* 与生化互不干扰） |
| map_objs / enemies_alive **运行时状态** | **每世界一份**（`world_states` 快照，§2.4） | 生化杀死的舔食者不能"复活"到咒怨；切回时状态完整保留 |
| explored **轮回迷雾** | **全局一份**（key 带世界前缀） | 无限流"轮回记忆"跨世界保留（api_new 已按此理念继承，H3） |
| flags 剧情旗标 | **全局一份**（命名前缀约定：生化 A/B1/B2/C/decon_truth/... 保留；咒怨 zy_*；通关标记 world_cleared） | 结算/兑换/门禁 cond 均全局可读；前缀约定防冲突 |
| hp/san/points/weapon/ammo/gene_lock/inventory/dead_team/deaths | **全局一份** | 轮回者本体与货币跨世界携带（与 zhouyuan.md §8 驱邪符跨副本生效一致） |
| spawn / initial_scene | **每世界一份**（WorldData） | 各世界出生点与开局场景不同 |

### 2.4 运行时状态：world_states 快照 + 活跃镜像（推荐核心机制）

**关键设计决策 + 依据**：`map_objs` / `enemies_alive` 是 v1 存档的既有顶层字段，且被 `api_world_interact`、`try_move`、`world_view`、`ensure_enemies`、`playthrough` 测试等大量代码直接读写。**v2 不删除、不重命名这两个字段，保留为「活跃世界运行时镜像」**：

```rust
// state.rs 新增（均 #[serde(default)]，旧存档反序列化零成本）
world_id: String,                              // 缺省 → 迁移时填 "biohazard_ch1"
world_states: BTreeMap<String, WorldRuntime>,  // 非活跃世界的快照（惰性）
save_version: u32,                             // 2
sp_grade: Option<char>,                        // 最近一次支线评级 D/C/B/A/S（P3 咒怨启用，见 §4.5）

// 每世界运行时快照
struct WorldRuntime { map_objs: ..., enemies_alive: ..., entered: bool }
```

- **既有顶层 `map_objs/enemies_alive` = 当前活跃世界（st.world_id）的镜像**，全部旧代码继续直接读写，零改动。
- `switch_world(st, to)` 流程（world.rs 新增，仿照现有传送门切层逻辑扩展）：
  1. `to == st.world_id` → 直接返回；
  2. 把顶层 `map_objs/enemies_alive` 快照进 `world_states[st.world_id]`；
  3. 从 `world_states` 取出 `to` 的快照（缺失则用默认空表）覆盖顶层；
  4. `st.world_id = to`；调用 `ensure_enemies(st)`（按目标世界表补缺，惰性初始化）；
  5. `st.floor/px/py` 由调用方（传送门落点）覆写。
- **为何不彻底迁移为纯 world_states**：serde 反序列化会**静默丢弃未知字段**——若 v2 删除顶层字段，v1 存档里的 `map_objs/enemies_alive` 将读不回来，玩家门禁解锁/敌人状态直接丢失（破坏存档）。「镜像保留」策略从根上规避，且迁移函数无需读旧字段（详见 §3.2）。

### 2.5 explored（轮回记忆）key 演进与迁移

- v1 key：`"floor:x:y"`（如 `"2:14:9"`）；v2 key：`"world:floor:x:y"`（如 `"biohazard_ch1:2:14:9"`）。
- `reveal_around` 写入使用 `format!("{}:{}:{}", st.world_id, st.floor, x, y)`；`world_view` 过滤前缀 `format!("{}:{}:", st.world_id, st.floor)`（注意沿用现有注释警告：用 strip_prefix 只裁一次，勿用 trim_start_matches）。
- **迁移规则**（§3.2 详述）：遍历旧 key，若首段（第一个 `:` 之前）为纯数字 → 前插 `"biohazard_ch1:"`。
- 语义不变：同一轮回内跨世界切换时，各世界迷雾各自保留（这正是多世界下"轮回记忆"的自然扩展）。

### 2.6 跨世界传送门（主神空间 ↔ 副本互进出）

**数据层**（defs.rs / 各世界 portals 表）：

```rust
PortalDef { id, floor, x, y, to_floor: usize, tx, ty,
            to_world: Option<&'static str> /* None = 世界内切层（现状）；Some = 跨世界网关 */ }
```

- 跨世界网关 id 用 `gw_` 前缀**全局唯一**：`"gw_biohazard"`（主神→生化）、`"gw_zhouyuan"`（主神→咒怨, P3 激活）、`"gw_nexus"`（生化→主神, 放在主神侧还是副本侧按世界观定，见下）。
- **查询路由**：`portal_at(world, floor, x, y)` 顶层包装 = 先查当前世界表的 PORTALS（含 to_world=None 的层内门），再查全局 GW_PORTALS 网关表（`world_static` 表，不属任何单世界）。`api_world_interact` 的 portal 分支在网关命中时执行 `switch_world` + 落点覆写（§4.2）。
- **落点接线（推荐初版）**：
  - 生化 F4 站台列车旁（现 `s_escape_train` 剧情的物理位置）放置 `gw_nexus` 光柱：`to_world="zhutianshenkong"` → 主神出生点（广场中央光柱侧）。**依据**：ENGINE_CONTEXT §4 主神空间设想 + 生化是"第一副本回主神"的自然出口（推断落点坐标，P1 定稿）。
  - 主神广场东/北侧传送门阵列：`gw_biohazard` → `biohazard_ch1 / floor=0 / spawn/列车站台出生点`（重复挑战刷分，符合 zhouyuan.md §8「已通关可重复挑战」）；`gw_zhouyuan` P3 激活。
  - 咒怨入口规则按 zhouyuan.md §8：需生化已通关（张杰预告解锁）——实现为网关 GateDef 或 cond（need_flag `bh_cleared`）。
- **世界切换后状态保留**：地图状态经 §2.4 快照保留；敌人（`e_f4_boss` 等）保持死亡；探索迷雾保留；`zone` 副本会话在传送时强制置 None（安全兜底）。

### 2.7 前端契约影响（World2D / Zone3D / client.js）

| 前端点 | 现状 | 多世界后 | 改动量 |
|---|---|---|---|
| World2D.setData | 读 data.tiles/w/h/floor/floor_name/explored/enemies/points/npcs/zones/portals/gates/nearby | 新增可选项 `data.world = {id,name,difficulty,cleared,sp_grade}`；floor 语义不变 | 标题展示一行：`world.name + " · " + floor_name`（world2d.js:148） |
| client.js worldInteract portal 分支 | r 含 floor/floor_name → api_world 全量刷新 | r 增 `to_world/ world` 字段 → 提示「传送至 <世界名>」后仍走 api_world 刷新（逻辑不变） | 提示文案 + 兼容字段 |
| client.js showCard 路由 | `__title__` / `__card_nexus__` / `__back_to_world__` | 新增 `__enter_nexus__`（结算→主神世界）、`__respawn_nexus__`（死亡→复活回主神） | 两个新分支（约 10 行） |
| Zone3D | 3D 副本会话 | 无感知（副本天然属于当前世界；zone=Some 时禁传送） | 0 |
| HUD | hp/san/points/weapon/ammo/geneLock/team | 建议 worldTop 显示世界名 | 1-2 行（CSS 可复用） |

---

## 3. 存档迁移兼容（v1 → v2）

### 3.1 原则（明确结论）

1. **所有新增 GameState 字段一律 `#[serde(default)]`**，旧存档反序列化不因缺字段失败（serde 对字段缺失 → 用 default，对多余字段 → 忽略）。
2. **不删除、不重命名任何 v1 既有字段**（尤其顶层 `map_objs/enemies_alive`，见 §2.4 依据）。
3. 迁移逻辑集中在 **一个函数 `migrate_save(&mut st)`**，在所有加载路径统一调用：`main()` 启动加载、`api_continue`、以及（防御性）`api_new` 读旧档时。
4. 迁移**幂等**：`save_version>=2` 的存档直接跳过（二次迁移不重复改写 explored，防止 key 被二次前插）。

### 3.2 迁移规则明细

| 规则 | 动作 | 失败影响 | 保护 |
|---|---|---|---|
| R1 世界归属 | `world_id` 为空 → `"biohazard_ch1"` | 无 | — |
| R2 探索迷雾 | 遍历 explored：首段纯数字的 key → 前插 `"biohazard_ch1:"` | 迷雾丢失（轮回记忆损失，最心疼资产） | 迁移前后 count 写 rpc.log；playthrough 测试断言 key 数一致（§6 P0 验收） |
| R3 运行时状态 | `world_states` 为空 → **不填充**（顶层即活跃世界 biohazard_ch1 的镜像，直接可用；快照在首次 `switch_world` 时自然产生） | 无 | — |
| R4 scene_id | 不做任何改写（生化场景 id 全局唯一，v2 不重命名） | 无 | — |
| R5 版本号 | `save_version = 2` | 无 | 幂等屏障 |
| R6 支线评级 | `sp_grade = None` | 无 | P3 前无消费者 |

> 关键点：R3 意味着**旧存档加载后 world_states 为空是合法状态**，活跃世界即 biohazard_ch1，`ensure_enemies`/`rebuild_mode` 行为与 v1 完全一致 → 迁移对旧存档的可见影响 = 仅 explored key 改写（R2）与新增元信息（R1/R5）。

### 3.3 api_new 与多世界初始化的关系

- **保留 v1 核心语义**（依据 main.rs:94-97 代码事实）：`api_new` = 开始新轮回，读取旧存档 `explored` 作为轮回记忆继承。
- v2 扩展：轮回记忆继承 = 旧存档 explored 全量（含所有世界前缀）；`GameState::new()` 其余字段按现状重置（hp/san/points/武器/道具/flags 清零——与现实现一致，保持「新轮回从零开始、记忆留存」的玩法）；`world_states` 清空；`world_id="biohazard_ch1"` → `world_init` → `goto(s_office)`。
- **明确边界**：跨世界传送门切换 = **同一轮回内的事件**，`world_states` 保留（等价于现有"切楼层保留 F1 敌人状态"）；只有 `api_new`（轮回重启）才重置世界状态。
- 主神空间作为枢纽世界后，「开始下一轮回」入口从 card_nexus 的 `__title__` 移动为主神空间张杰 NPC 对话选项（P1），但 `api_new` 命令签名不变、前端 `__title__` 路由保留（防 regression）。

### 3.4 破坏性标注汇总（P0~P3 全程）

| 改动 | 是否破坏旧存档 | 保护措施 |
|---|---|---|
| 新增 world_id/world_states/save_version/sp_grade（#[serde(default)]） | 不破坏 | serde default + 幂等迁移 |
| explored key 升格 | v1 读出后**原样迁移**，不破坏；迁移 bug 才会丢 | 迁移日志 + 测试锁定 |
| 顶层 map_objs/enemies_alive 保留为镜像 | 不破坏（v1 字段照常读写） | 严禁未来删除/重命名这两个字段 |
| scene_id 前缀约定 | 只约束新增（zy_*），不 rename 现有 → 不破坏 | 命名规范写入 AGENTS/代码注释 |
| compute_settlement 世界化 | 生化分支保持原公式 → 不破坏 | 单测覆盖 v1 结算数字 |
| 通关循环改造（结算→主神世界） | 无数据字段变化 → 不破坏；在途存档（停在 s_settle/card_nexus）的玩家进入后走新流程，属体验升级 | 保留 __title__ 兜底路由 |

---

## 4. IPC 契约扩展

### 4.1 api_world —— 返回值新增 world 元信息

```jsonc
{
  "world": {
    "id": "biohazard_ch1",          // 当前世界 id
    "name": "生化危机·蜂巢",        // 显示名（WorldData.name）
    "difficulty": 1,                // 难度档：0=主神空间 / 1=生化 / 2=咒怨（复活费基数、数值缩放）
    "cleared": true,                // 该世界通关标记（st.flag("<world>_cleared")，结算时写入）
    "sp_grade": null                // 该世界已获最高支线评级 "D"|"C"|"B"|"A"|"S"，未获 null（P3 前恒 null）
  },
  "w": 40, "h": 26, "floor": 0, "floor_name": "F1 入口层 · 列车站台",
  // ... 其余字段与 v1 完全一致（tiles/enemies/points/npcs/zones/portals/gates/nearby/explored/inventory/px/py）
}
```

- 前端可用 `world.name` 拼标题；`cleared/sp_grade` 用于世界选择界面/传送门开锁展示（咒怨入口"已通关"判定也可由前端读该字段提示）。
- **兼容性**：新增字段为纯增量，旧前端忽略即可；字段类型稳定不再变。

### 4.2 api_world_interact —— objId 路由扩展（跨世界传送门）

```text
现有顺序: GATES → ZONES → ENEMIES → POINTS → NPCS → PORTALS（当前世界表，全部保留）
新增第 0 路（或并入 portal 分支）: GW_PORTALS 全局网关表（id 全局唯一 gw_*）
```

- 网关命中时返回：
```jsonc
{ "kind": "portal_world", "obj_id": "gw_biohazard",
  "to_world": "biohazard_ch1", "to_floor": 0, "to_floor_name": "F1 入口层 · 列车站台",
  "world": { "id": "biohazard_ch1", "name": "生化危机·蜂巢", "difficulty": 1 } }
```
  也可直接复用现 `kind:"portal"` 分支并附加 `to_world` 字段（前端逻辑更少分支）。**推荐后者**：portals 渲染与移动逻辑一站式复用，前端只多读一个字段。
- `zone` 会话激活时（`st.zone.is_some()`）拒绝传送（返回 `{"kind":"busy"}`），防止 3D 副本内切世界产生脏状态。
- 其余 6 路语义不变（天然作用于当前世界表，objId 命名空间由各世界隔离）。

### 4.3 新命令（main.rs 注册）

| 命令 | 用途 | 行为要点 |
|---|---|---|
| `api_nexus_enter` | 结算完成后进入主神空间世界 | `switch_world("zhutianshenkong")` + 落点 + `world_view`（可选：在同一指令内把结算写入 `bh_cleared`） |
| `api_nexus_respawn` | 死亡后回主神扣点复活（P2） | 读取 `deaths` 最新一条（若按世界复活费可据 `WorldData.difficulty` 取 300/400…）；`points -= fee`（**可负，记债，下次副本结算先抵**）；`san = 60`；装备按规则半损（咒怨 §8 口径：随机剔除一半道具）；`zone=None`、战斗清理；`switch_world("zhutianshenkong")` + 落点 + `world_view` |

- 复活费表（推断 + 文档依据）：生化 300（现状未实现、ENGINE_CONTEXT §2.3 基线）、咒怨 400（zhouyuan.md §5 失败去向）、后续副本按 WorldData.difficulty 档位配置。
- `api_nexus`（现有卡片）**保留**：主神世界内「兑换光球」仍可弹出兑换卡片（复用 card_nexus 内容），避免重复实现兑换 UI。

### 4.4 scene_id 世界上下文约定

**结论：scene_id 保持全局唯一字符串命名空间，不塞入 world 字段；世界切换是显式动作。**

1. **命名约定**：
   - 共享系统场景（不属任何副本）：`e_*`（死亡档案卡）、`s_settle`（结算卡）、`s_nexus*`（主神开场/兑换）、`s_weapon`、`s_warning` 等——维持现状 id。
   - 副本场景：以世界 slug 前缀，咒怨 `zy_*`（zhouyuan.md 已按此设计：zy_01..zy_17、d 系列调查场景）；生化现有场景 id 不重命名（防旧存档 scene_id 失效）。
2. **查询**：`scene(id)` 当前是单表线性 find（scenes.rs:1608）。v2 建议按「共享 场景 + 各世界场景」数组组织后仍合并为单一 SCENES 查找（保证 `Route::To` 自由跳转），性能 O(n) 在 600+ 场景量级仍为微秒级，**不引入按世界查场景的间接层**（P3 后再评估 Hash 索引）。
3. **世界上下文如何携带**：`engine::goto` **不隐式切换 world_id**。跨世界的场景跳转（如结算卡 → 主神）由 **IPC 动作**显式完成（按钮 route → 新命令 / 传送门交互），保证「world_id 与场景不同步」这种 bug 不可能发生；`st.world_id` 是唯一权威，场景渲染始终以 `st.world_id` 取世界数据。
4. **死亡卡片回主神空间**（承接任务需求）：死亡场景 `e_*` 是共享场景（各副本可新增专属 `zy_d1..d4`），卡片按钮 route 由 `__title__`（轮回重启）扩展为 **`__respawn_nexus__`**（回主神复活）＋ 保留 `__title__`（放弃重开）。`engine::choose` 的 `Mode::AwaitCard` 分支对未知路由保持现状（no-op），新路由由前端 client.js 具体执行（与 `__card_nexus__` 同款模式，client.js:197 先例）。

### 4.5 结算与 sp_grade 世界化

- `compute_settlement(st)` 签名不动；内部改为 **按 `st.world_id` 取该世界侧支线清单**（WorldData.side_flags + side_names，生化 = 现有 7 条；咒怨 = zy_* 6 条结算支线，zhouyuan.md §7.1）。公式骨架 `total = points + 存活队友×100 + 支线数×200`、评级阈值 S≥1600/A≥1300/B≥1000/C≥700 保持全局一致（00_INDEX §2.4 唯一权威口径）。
- **sp_grade 落地时点**（编排建议）：P0 仅加字段 + `world` 元信息展示（None）；P2 主神兑换 `cond` 预留等级门槛；**P3 咒怨接入时启用**：咒怨通关达成 `zy_exorcism` → 写入 `sp_grade='D'`，主神兑换「基因锁第一阶段 2000+D」等 cond 校验（zhouyuan.md §8 / 00_INDEX P0 必须项）。若主 agent 希望更早验证，可将 Eff::SetGrade + 结算卡展示提前到 P2，不阻塞其他阶段。

---

## 5. Rust 侧模块化建议

### 5.1 worlds/ 模块与 WorldData 注册表（推荐结构示意）

```text
server-rs/src/
├── worlds/
│   ├── mod.rs          // world_id 常量 + WorldData 定义 + WORLDS 注册表 + find_world()
│   ├── biohazard.rs    // 现 maps.rs 世界数据收敛于此（P0 建立外壳，P1 搬家）
│   ├── zhutian.rs      // 主神空间世界（P1 新增）
│   └── zhouyuan.rs     // 咒怨世界（P3 新增）
├── maps.rs             // 过渡期保留（内部改为经 find_world 取数据；P3 后可为世界实现层的 re-export）
├── world.rs            // 通用开放世界逻辑（移动/交互/视图/切换），不再持有具体地图表
├── scenes.rs           // 场景表保持单表 + 前缀命名约定（§4.4）
└── state.rs / engine.rs / defs.rs  // 现状 + 增量字段/枚举
```

```rust
// worlds/mod.rs 结构示意（设计约束，非实现代码）
struct WorldData {
    id: &'static str,           // "biohazard_ch1" ...
    name: &'static str,         // 显示名
    difficulty: u8,             // 复活费/数值缩放档位
    initial_scene: &'static str,// 进世界默认场景（生化 s_office）
    floors: &'static [&'static [&'static str]],   // F1..Fn ASCII（替代 F1_MAP..F4_MAP + tile 的 match）
    floor_names: &'static [&'static str],          // 替代 FLOOR_NAMES
    spawn: (usize, usize),
    points: &'static [PointDef], enemies: &'static [EnemyDef], npcs: &'static [NpcDef],
    zones: &'static [ZoneDef],   portals: &'static [PortalDef], gates: &'static [GateDef],
    side_flags: &'static [&'static str], side_names: &'static [&'static str],  // 结算用
}
static WORLDS: &[WorldData] = &[BIOHAZARD, ZHUTIAN, /* ZHOUYUAN(P3) */];
static GW_PORTALS: &[PortalDef] = &[/* 全局跨世界网关，id 前缀 gw_ */];
```

- 过渡路径（P0 最小 diff）：`WorldData` 外壳先建，生化实例直接引用现有 `F1_MAP..` 与各对象表（不搬家）；查询函数从 `maps::tile` 迁到 `worlds::tile(world, floor, x, y)` 或给 `WorldData` 加方法；`maps.rs` 先做薄 re-export 保持 `tests/playthrough.rs` 等编译通过，P1/P3 随新增世界把数据文件收敛进 `worlds/biohazard.rs`。
- **接口设计硬约束**：所有地图查询必须「显式携带 world」（函数参数或 `world` 前缀方法），杜绝 `st.floor` 裸查询（这才是复合寻址想防的 bug，用接口约定替代类型体操）。

### 5.2 world.rs 职责拆分

| 现有函数 | v2 职责 |
|---|---|
| `world_init` | 保留（当前世界初始化：出生点/武器/敌人生成/对象表缺省） |
| `world_view` | 输出 world 元信息（§4.1）+ 按 `st.world_id` 取数据 + explored 新前缀过滤 |
| `try_move` | 逻辑不变；portal 触发处判断 `to_world`：None → 切层；Some → `switch_world` |
| `nearby_interactables` | 按当前世界表遍历（含 GW_PORTALS 网关作为 portal kind 的附近项） |
| `ensure_enemies` | 按当前世界表补缺（惰性初始化的主要入口） |
| **新增 `switch_world`** | §2.4 快照/载入 + ensure + 落点由调用方覆写 |
| **新增 `enter_world`** | 幂等初始化目标世界（落点 + 区域 scene 锚点，供 api_nexus_enter/respawn 复用） |

### 5.3 场景组织（scenes.rs）

- 维持单一 `SCENES` 表与 `scene(id)` 查找（§4.4 结论）；物理组织可按世界分组加注释分区（现有文件已按「开放世界 NPC 对话 / 主神空间 / 剧情 / 结算结局」分区，v2 增加「咒怨世界」分区）。
- FIGHTS 表同样保持单表 `fight_cfg(id)`（fight id 已全局唯一：`zombie1_*`/`licker`/…/咒怨 `b_kayako`/`b_toshio`）；新增 FightCfg 字段（aura/finisher_stage 等）列为数据级扩展（00_INDEX §7.3 P2 已列），与多世界框架正交。

### 5.4 加载策略（明确结论：惰性初始化，无文件 I/O）

1. **静态数据**：`WorldData` 为编译期 `'static` 常量，天然常驻内存（40×26 ASCII ×N 层 ≈ 每层 1KB，15 副本全量 < 1MB），**不需要也不应该做磁盘化加载**。
2. **运行时状态**：**惰性**——只有 `switch_world`/`enter_world` 进入某世界时才 `ensure_enemies`/建 `map_objs` 缺省；`api_new` 只初始化 biohazard_ch1，绝不预初始化全部未来世界（否则 15+ 副本 × 数百敌人表项被白白写入 world_states，既慢又膨胀存档）。
3. 存档体积：world_states 仅存「进入过且产生过状态差」的世界快照（惰性快照），与 v1 顶层镜像去重后体积接近 v1。

---

## 6. 分阶段实施计划

> 每阶段「验收点」均含：编译（`cargo build` / `cargo test`）篮 + 手动用例（前端手动跑）篮。
> 依赖关系：P0 ⊂ P2 ⊂ P1 顺序无关（P1 依赖 P0 的世界化查询；P2 依赖 P0 的 switch_world 框架）。

### P0 —— 数据模型 + 存档迁移（不可见重构，最优先）

**目标**：类型地基 + v1 存档在 v2 代码下行为完全一致 + api_world 元信息上线。

| 改动文件 | 内容 |
|---|---|
| `server-rs/src/state.rs` | +`world_id: String`、`world_states: BTreeMap<String, WorldRuntime>`、`save_version: u32`、`sp_grade: Option<char>`（全部 `#[serde(default)]`）；+`WorldRuntime` 结构。**不动任何既有字段** |
| `server-rs/src/main.rs` | `load_state()` 后统一 `migrate_save`；main 启动加载与 `api_continue`/`api_new` 均走迁移；`api_world` 组装 world 元信息；迁移统计写 rpc.log |
| `server-rs/src/world.rs` | `explored` 读写双端换新 key 格式（world_view 前缀过滤 / reveal_around）；`ensure_enemies` 读当前世界表（P0 阶段 == biohazard_ch1 断言）；+`switch_world`（先实现、P0 无调用者硬编码世界也可） |
| `server-rs/src/worlds/mod.rs`（新增） | world_id 常量 + WorldData 外壳 + BIOHAZARD 实例（复用现有静态表引用，不搬家） |
| `server-rs/src/maps.rs` | 查询函数加 world 参数层（或经 find_world 包装）；保留原函数薄包装，保证 tests/ 编译 |
| `server-rs/tests/` | 新增迁移测试：构造 v1 形态存档（无 world_id/world_states/explored 旧 key）→ migrate → 断言 world_id/explored 重写/字段保留 |

**验收点**：
- [ ] 旧 save.json（v1 字段）`api_continue` 正常：迷雾、门禁、敌人/剧情状态与迁移前一致（对照迁移前后截图/状态）。
- [ ] 杀死敌人→存档→重启→敌人仍死；开门状态保留。
- [ ] `api_world` 多返回 `world` 元信息，前端不报错（字段增量兼容）。
- [ ] `cargo build` + `cargo test`（含新增迁移测试）绿。
- [ ] 新轮回：world_id=biohazard_ch1、explored 继承、其余重置（现状语义）。

**破坏旧存档**：无。**保护**：全部 serde default；迁移幂等；explored 迁移数量级日志 + 测试锁定；禁止在后续阶段删除/重命名顶层 map_objs/enemies_alive。

### P1 —— 主神空间世界（枢纽世界可玩）

**目标**：结算后进入可探索的主神空间 2D 地图；轮回重启入口移入主神；单向「生化→主神」打通。

| 改动文件 | 内容 |
|---|---|
| `server-rs/src/worlds/zhutian.rs`（新增） | 主神空间 1 层 40×26 ASCII（中央主神光柱/半圆广场/传送门阵列/复活祭坛，蓝本见下）+ POINTS（兑换光球×3、复活祭坛）+ NPCS（张杰）+ PORTALS（`gw_biohazard` 立即可用、`gw_zhouyuan` 占位不可交互）+ GATES（咒怨门 need_flag `bh_cleared` 且暂不解锁） |
| `server-rs/src/worlds/mod.rs` | 注册 ZHUTIAN；GW_PORTALS 表 |
| `server-rs/src/scenes.rs` | `card_nexus` 按钮改造：结算卡按钮 → `__enter_nexus__`（进主神世界）；主神兑换场景/卡片保留（api_nexus 复用）；张杰主神对话场景（含「开始下一轮回」选项 → `__title__`） |
| `server-rs/src/main.rs` | +`api_nexus_enter`（switch_world→zhutianshenkong→落点→world_view）；结算写入 `bh_cleared` |
| `server-rs/src/world.rs` | world_view/ensure 泛化完成（无 biohazard 断言残留） |
| `server-rs/ui/js/client.js` | `__enter_nexus__` 分支（调 api_nexus_enter → world 模式）；worldTop 世界标题（或放 world2d.js） |

**主神空间蓝本**（推断布局，实现时定稿坐标）：中央直径 12 格光柱圆台（出生与「主神」交互点）→ 西侧半圆广场（NPC 聚集）→ 东侧传送门阵列（每副本一个装饰化门框：生化白色实验门 / 咒怨灰绿门框挂童鞋佛珠——zhouyuan.md §8 约定）→ 南侧兑换区（光球 ×3：强化/基因锁/血统，复用 card_nexus 内容）→ 复活祭坛。单层无战斗（enemies 空表）。

**验收点**：
- [ ] 生化通关 → 结算卡 → 「回主神空间」→ 主神世界 2D 地图可走可交互。
- [ ] 张杰对话含兑换目录 + 「开始下一轮回」（api_new 语义不变）。
- [ ] 主神 → `gw_biohazard` → 回到生化 F1 出生点，**地图状态保留**（杀过的敌人在）。
- [ ] 旧流程兜底：`__title__` 仍可用（回归）。
- [ ] cargo 全绿 + 手动两遍通关无 panic。

**破坏旧存档**：无（体验流变化，无字段破坏）。

### P2 —— 跨世界传送门互进出 + 死亡复活流（双向闭环）

**目标**：生化 F4 出口 → 主神光柱；主神 ⇄ 生化对称互传；死亡 → 扣点复活 → 主神空间。

| 改动文件 | 内容 |
|---|---|
| `server-rs/src/defs.rs` | `PortalDef` +`to_world: Option<&'static str>` |
| `server-rs/src/worlds/*` | 生化侧新增 `gw_nexus` 网关门（F4 站台列车旁,推断落点）;GW_PORTALS 完备 |
| `server-rs/src/world.rs` | `try_move`/`nearby_interactables`/`portal_at` 处理 to_world → `switch_world` + 落点覆写 |
| `server-rs/src/main.rs` | `api_world_interact` 网关命中分支（返回 `kind:"portal"` + to_world/world 字段,复用现有 portal 前端刷新逻辑）；+`api_nexus_respawn`（§4.3 行为）；zone 激活时禁传（busy） |
| `server-rs/src/scenes.rs` | 死亡卡片按钮 route 增 `__respawn_nexus__`（death_card 按钮数组扩展,按世界复活费可选文案）；可选新增复活确认卡 |
| `server-rs/src/engine.rs` | `choose` AwaitCard 分支对 `__respawn_nexus__` 等新路由 no-op 透传（前端执行）,与现有 `__title__` 同构 |
| `server-rs/ui/js/client.js` | `__respawn_nexus__` → invoke api_nexus_respawn → world 模式；portal 分支读 to_world 提示「传送至 <世界>」 |
| `server-rs/src/state.rs` | （可选提前）`Eff::SetGrade` + 结算卡展示 sp_grade,为 P3 铺路 |

**验收点**：
- [ ] 生化 F4 → 主神光柱 → 主神广场；主神 → gw_biohazard → 生化出生点；**双向对称**。
- [ ] 世界状态互不串：生化杀敌→主神→回生化,敌人仍死;主神无敌人。
- [ ] 副本内死亡 → 死亡卡 → 「回主神空间复活」→ 扣 300 （生化）/ 400 （咒怨,如已接）点、san=60、装备半损、回到主神世界;点数不足记负、结算先抵。
- [ ] 传送/复活后存档一致（save_state 时机正确）,无脏 zone。
- [ ] 纯生化单世界流程（不碰主神）无回归。
- [ ] cargo 全绿 + 手动三遍（含死一次）无 panic。

**破坏旧存档**：无。

### P3 —— 咒怨世界接入（第二个副本,含 sp_grade 落地）

**目标**：主神传送门阵列激活咒怨;3 层地图/敌表/BOSS/双结局/复活费 400 全量按 zhouyuan.md 落地。

| 改动文件 | 内容 |
|---|---|
| `server-rs/src/worlds/zhouyuan.rs`（新增） | 依 zhouyuan.md §3.1 区域表:3 层 ASCII（F1 一层/F2 二层/F3 阁楼+地下室）+ POINTS/ENEMIES/NPCS/ZONES/PORTALS(P1~P3+楼梯)/GATES(G1~G3)+敌表（b_servant/b_shade 系/b_toshio/b_kayako_shade） |
| `server-rs/src/worlds/mod.rs` | 注册 ZHOUYUAN;gw_zhouyuan 激活（移除 need_flag 占位锁定,改由「生化通关 + 张杰预告」解锁语） |
| `server-rs/src/state.rs` + `defs.rs` | `sp_grade` 启用:`Eff::SetGrade`,含 grades 按世界记档（重复挑战每副本一次有效,奖励减半——zhouyuan.md §8） |
| `server-rs/src/scenes.rs` | zy_* 剧情场景（幕 1~5 按 zhouyuan.md §6 初稿）+ FIGHTS 增 `b_kayako`(HP140/狂暴黑发领域)/`b_toshio` 等 + 专属死亡场景 zy_d1..d4（复刻 e_* 结构）+ 结算卡按世界展示支线清单 |
| `server-rs/src/main.rs` | `compute_settlement` 按 world_id 分派支线表;复活费按 WorldData.difficulty（咒怨 400） |
| `server-rs/ui/js/client.js` | 咒怨 BOSS 演出走数据驱动（无代码改动预期;如需要「满屋黑发」滤镜则 +1 CSS class,非阻塞） |

**验收点**：
- [ ] 主神 gw_zhouyuan 传送门解锁 → 进咒怨 F1;3 层完整,俊雄引路二选一（flag zy_cat_trust/trap）生效。
- [ ] 伽椰子 BOSS:黑发领域狂暴 + 诅咒标记叠层（方案 A 连号 flag zy_curse_1..3）+ 仪式镇压终结;解脱/强杀双结局与结算分支（PointsIfFlag）。
- [ ] 死亡档案 4 种（zy_d1..d4）+ 复活费 400 + 负点抵债。
- [ ] 通关 → `sp_grade='D'` → 主神兑换「基因锁第一阶段(2000+D)」门槛校验通过;重复挑战 sp_grade 不再重复发放、奖励减半。
- [ ] 生化与咒怨世界状态互不影响;回归 P0~P2 全部用例。
- [ ] cargo 全绿 + 完整咒怨流程手动一遍（走安全线 + 走陷阱线各一）。

**破坏旧存档**：无（新增世界与字段 default）。

### 6.1 阶段总览表

| 阶段 | 目标 | 主要文件 | 新增 IPC/路由 | 破坏存档 | 依赖 |
|---|---|---|---|---|---|
| P0 | 数据模型+迁移 | state.rs / main.rs / world.rs / worlds/mod.rs / maps.rs / tests | api_world.world 元信息 | 无 | — |
| P1 | 主神空间世界 | worlds/zhutian.rs / scenes.rs / main.rs / client.js | api_nexus_enter;`__enter_nexus__` | 无 | P0 |
| P2 | 跨世界互进出+复活 | defs.rs / worlds/* / world.rs / main.rs / scenes.rs / engine.rs / client.js | api_nexus_respawn;`__respawn_nexus__`;PortalDef.to_world | 无 | P0 |
| P3 | 咒怨接入+sp_grade | worlds/zhouyuan.rs / scenes.rs / state.rs / defs.rs / main.rs | gw_zhouyuan;Eff::SetGrade | 无 | P0+P2 |

---

## 7. 风险与未决项（含「推断」标注汇总）

| # | 项 | 状态/结论 | 决策时点 |
|---|---|---|---|
| 1 | 主神空间地图具体布局（广场直径/传送门阵列位/复活祭坛坐标） | **推断**：本方案仅给蓝本（§6 P1），坐标 P1 实现时定稿 | P1 |
| 2 | `gw_nexus`（生化→主神光柱）的落点 | **推断**：F4 站台列车旁（剧情 s_escape_train 物理位置）；P1/P2 时按 ASCII 校验可行走 | P2 |
| 3 | 队友跨世界模型 | **推断**：dead_team 全局共享 + 4 人名单现状；咒怨「资深者+新人」队友（zhouyuan.md §6 默认 2 名）需世界级定义,建议 P3 前定稿（可先以固定角色/全局名单兼容） | P3 前 |
| 4 | 复活费数值表 | 生化 300（ENGINE_CONTEXT 基线）、咒怨 400（zhouyuan.md §5）为文档事实;其余按 difficulty 档推断 | P3+ |
| 5 | 点数不足"记负债、下次结算先抵" | zhouyuan.md §8/§5 明确;实现为 points 允许负 + 结算先抵扣（00_INDEX §7.3 P1 小改项） | P2 |
| 6 | explored 迁移 bug 风险 | 迁移幂等 + count 日志 + 测试锁定;若线上已有 v1 存档需先备份 save.json（通用建议） | P0 |
| 7 | 单表 scene() O(n) 查找 | 600+ 场景量级微秒级,不构成瓶颈;P3 后若增 Hash 索引属优化,不阻塞 | P3 后 |
| 8 | 道具跨世界携带 | 文档依据：驱邪符跨副本生效（zhouyuan.md §8）→ 道具全局携带成立;inventory 无世界前缀,天然全局 | 已定 |
| 9 | 新轮回时主神空间「已解锁传送门」是否保留 | **推荐**：world_states 随 api_new 清空（主神世界也是世界,一并重置,只有 explored 记忆留存）——与现状 api_new 语义一致;若希望"通关解锁永久化",改由全局 flag（bh_cleared 等,flags 不全清）表达,本轮不引入 | P1 定稿 |
| 10 | sp_grade 提前启用需求 | 若 P3 前主神兑换就要 D 支线门槛,可将 Eff::SetGrade 提前到 P2（§4.5 已给弹性） | 主 agent 排期 |

---

*（文档完。结论：world_id 独立字段 + floor 保持 usize + 顶层镜像/快照双轨运行时 + 惰性世界初始化 + 全兼容迁移 + 四阶段推进;任何阶段不破坏旧存档。SLug: multi_world_framework；下一步：P0 落地。）*