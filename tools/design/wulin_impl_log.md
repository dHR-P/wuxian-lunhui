# 《侠行天下 · 武林大会》(wulin) 实现日志

## 角色 / 模型
子代理：武林大会副本实现。模型 tokenrhythm/deepseek-v4-flash-0731。

## 职责边界
- 只写三个**全新文件**，绝不修改任何既有文件（合并由主线做）：
  1. `server-rs/src/worlds/wulin.rs` —— 世界静态数据（4 层，40×26）
  2. `server-rs/src/scenes_wulin.rs` —— 场景/战斗静态表
  3. `server-rs/tests/wulin_flow.rs` —— 集成测试
- 不部署、不 build --release，cargo check 只修自己文件。

## 设计依据
- `design/zhttty_universe/00_INDEX_EXPANSION.md` §1.7 + §3 武林大会行：
  - slug `wulin_dahui`，2-3 层 → 本实现取 **4 层**（山门坊市→擂台广场→后台/盟主府前堂→盟主府密道）。
  - 钩子「赢了擂主，输了人心」；BOSS 黑化盟主 / 魔教卧底 HP≈220；复活 400；sp_grade=C。
  - 本任务 explicit 指令：sp_grade 写 `Some('D')`（任务优先于设计文档，故结算评级用 D）。
  - 擂台轮战=FIGHTS 连号战链；卧底=flag 网审/身份反转；阵营支线/NPC 密度高。
  - 素材：新 bg 待替换 `wl_bg_gate/arena/palace`；现用现有图占位
    `img_zhuyuan_book.png（山门/后台）`、`img_corridor.png（盟主府密道）`、`img_nexus.png（擂台广场）`。
  - 敌人立绘复用：guard→护院、hunter→黑马高手、zombie→杂兵。

## 模板参照
- `server-rs/src/worlds/jiguancheng.rs`（世界表结构）+
  `scenes_jiguancheng.rs`（场景/战斗表结构、选择驱动 BOSS）+
  `tests/jiguancheng_flow.rs`（测试骨架）。
- `scenes_zhouyuan.rs` 前 60 行（BOSS 选择驱动遭遇链：st.fight 存血 + Route::Dyn 每回合）。

## 世界架构（wulin.rs）
- 出生点 P = L1 山门 (18,20)。
- L1 山门·会场坊市：入场签到、各门派摊位、密道口调查（藏卧底信物）。
- L2 擂台铺开广场：正中央擂台 ZONE（擂台战链）、擂台守卫/黑马对手、观礼台 NPC 掌门。
- L3 后台·盟主府前堂：阴谋线索调查、护院、铁卫；通往盟主府。
- L4 盟主府·密道：揭露盟主黑化 / 魔教卧底，BOSS 战 ZONE、密道逃脱出口。
- 单向传送门（进深单向 p_wl_1/2/3）+ 先斩后奏/回跳门 p_wl_4 缝合闭环 + 出口 p_wl_exit。
- 门禁 G1 主场入场券（flag 签到）→ 简化走擂台；G2 后台凭帖（信物）；G3 密道暗门（flag 阴谋揭露）。

## 主线链（scenes_wulin.rs）
- 签到 → 会场坊市采买/打探（支线）→ 上擂台轮战（FIGHTS 连号战链 wl_fight_1..4，
  对手=各门派代表）→ 黑马高手（hunter 立绘）→ 后台发现盟主黑化阴谋（flag 网审，
  卧底身份反转）→ 决战抉择：力战黑化盟主 / 反戈相助（魔教卧底揭穿后反转）→ 结局幕 + sp_grade D。

## fight 清单
- `wc_xxx` 前缀（沿用 jc_ 惯例，用 wc_ 区分）：普通各门派对手 + 擂台轮战 + BOSS 黑化盟主 + 卧底。
- 擂台战链：FIGHTS 连号 wl_fight_1..4。

## 测试清单（tests/wulin_flow.rs）
1. L1 地图可达性 + 出生点 + 传送门/门禁静态断言。
2. 主线链：签到→上擂台→轮战连胜→后台阴谋→BOSS 抉择→结局（sp_grade D）。
3. 擂台轮战链完整性 / 战斗表数值断言。
4. 卧底身份反转结局分支（反戈相助 vs 力战）。

## ★外部依赖（主线合并阶段需要，已在临时副本验证过签名）
1. `server-rs/src/worlds/mod.rs`：
   - `mod wulin;`
   - `pub const WORLD_WULIN: &str = "wulin";  // 侠行天下·武林大会`
   - 新增 `static WULIN: WorldData`（id=WORLD_WULIN, initial_scene="wl_00"，
     floors 用 `wulin::WULIN_L1..L4_MAP`，其余指向 `wulin::POINTS/ENEMIES/NPCS/ZONES/PORTALS/GATES`），并入 `WORLDS` 数组。
   - 可选：主神网关 `gw_wulin`（未加也不影响测试/剧情；落点= L1 出生点 (18,20)）。
2. `server-rs/src/lib.rs`：`pub mod scenes_wulin;`（使 tests 能 `use wuxian_horror_ch1::scenes_wulin`）。
3. `server-rs/src/scenes.rs`：
   - `fight_cfg()` 追加 `.or_else(|| crate::scenes_wulin::wulin_figths().iter().find(|(k, _)| *k == id).map(|(_, v)| v))`
   - `scene()` 追加 `.or_else(|| crate::scenes_wulin::WULIN_SCENES.iter().find(|s| s.id == id))`
4. 新 bg 落地后替换 scenes_wulin.rs 顶部标注的 bg 占位字段（wl_bg_gate/arena/rear/palace）。
5. **注意**：`start_menzhu`/`menzhu_win` 依赖 `scenes::fight_cfg("wc_menzhu")` 能被解析（第 3 条合并后即可）；
   否则 BOSS 选择驱动回合 hp 不初始化会死循环——主线务必先做第 3 条再放行测试。

## 落盘状态（已用临时合并副本验证：cargo check --lib + cargo test --test wulin_flow 全绿）
- [x] worlds/wulin.rs（210 行，4 层，地图 26 行×40 列全通过 + 43 个坐标可走位校验）
- [x] scenes_wulin.rs（498 行，WULIN_SCENES 28 场景，wulin_figths 8 战斗）
- [x] tests/wulin_flow.rs（183 行，4 用例全通过）
- [x] cargo check + 4 测试通过（在临时合并副本，未触碰真实既有文件）