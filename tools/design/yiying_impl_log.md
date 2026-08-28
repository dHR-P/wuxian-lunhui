# 异形4·奥瑞迦号 副本实现日志（scenes+worlds+test 子代理）

> 实现子代理（模型 tokenrhythm/deepseek-v4-flash-0731，角色=「异形4·奥瑞迦号 副本实现」）
> 产出物（全部为全新文件，未改动任何既有文件）：
>   - server-rs/src/worlds/yiying.rs
>   - server-rs/src/scenes_yiying.rs
>   - server-rs/tests/yiying_flow.rs
> 依据：design/zhttty_universe/wuxian_kongbu/yiying.md（权威）+ 00_ENGINE_CONTEXT.md
> 参照模板：worlds/zhouyuan.rs · worlds/zhutian.rs · scenes_zhouyuan.rs · defs.rs · maps.rs · tests/zhouyuan_flow.rs

## 一、三文件功能清单

### 1. server-rs/src/worlds/yiying.rs（世界静态数据）
- **3 层**：YIYING_F1_MAP（船员生活区）/ YIYING_F2_MAP（实验室·孵化室）/ YIYING_F3_MAP（引擎区·皇后巢穴），均 40×26 等宽 ASCII（§3 区域表为权威坐标）。
- **YIYING_FLOOR_NAMES**：3 层名。
- **POINTS**（id `yiy_`，9 个）：餐厅破尸(18,10)、气闸机关(33,14)、Father主控(30,5)、医疗舱取样(14,7)、取样台(12,8)、安全柜(4,3)、物资箱(6,5)、烧巢(30,16)、引爆总闸(30,4)、冷却管道(12,8)。
- **ENEMIES**（8 只，异形谱系 抱脸虫→工兵→哨兵→猎手→皇后 所引 fight 均在 scenes_yiying 表）：工兵×3、工兵伏击群、哨兵×2、猎手、巢穴抱脸虫群。
- **NPCS**（3）：Father 终端、考尔、约翰纳。
- **ZONES**（3）：皇后战区(fight)、气闸环境区(env_kill)、管道过热区(env)。
- **PORTALS**（单向+双向电梯）：通风管 L1→L2 单向；电梯 L1↔L2 双向；L2管道→L3 单向；货运电梯 L2↔L3 双向。
- **GATES**（Father 两处判定）：医疗区门(need_item=医钥)、通风管口(need_flag=father_off)、孵化门(need_flag=father_off)、主控室门(双条件 dy)、引擎桥门(need_flag=father_off)、巢穴门(双条件 dy)。

### 2. server-rs/src/scenes_yiying.rs（剧情/战斗）
- 导出 `pub static YIYING_SCENES: &[SceneDef]`（id 全部 `yiy_`）。
- 导出 `pub fn yiying_figths() -> &'static [(&'static str, FightCfg)]` + `yiy_fight_cfg` 查询辅助 + `yiy_scene` 查询辅助。
- **§4 敌人数值（蜂巢+30%）**：10 场战斗 f_yiy_*：抱脸虫 35/工兵70/工兵2 75/伏击群85/哨兵100/哨兵2 110/猎手125/巢穴抱脸50/皇后200。狂暴阈值按表。
- **§5 BOSS 皇后**：HP200 / dmg16-24 / 奖450，狂暴@35% 产卵暴走（每2回合增员+酸血溅射），终结技**双路**：
  ① 管道过热熔毁（需 yiy_father_off，环境终结不触发酸血，+flag yiy_queen_plan）；
  ② 电磁束缚+重火力（需道具 yiy_em_restraint，瘫痪+×1.5）。
- **§6 剧情线**：幕0 开场(Father 警告)→幕1 Father→幕2 孵化室→幕3 巢穴皇后→结算。
- **§7 奖励**：
  - **寄生倒计时**（方案 A 连号 flag `yiy_parasite_1/2/3`）：被抱脸的普维斯经「带他取样」→ yiy_infected+parasite_1；每推进一幕 tick 置一层；第 3 幕未取样(yiy_cured) → 破胸死亡场景「摇篮曲」。
  - **酸血残留 post_kill**：`win` 回调不可变（fn(&GameState)），故用专用 win 场景 yiy_win_acid 经 Route::Dyn/Hurt 一次性结算；工兵奖励 yiy_win_worker；烧巢 yiy_win_burn。
  - **气闸环境击杀**：yiy_s_airlock 选择（成功 Points+80 / 失败 Hurt+San / 绕行）。
  - **C 级支线**：sp_grade 用 Route::Dyn 写 `Some('C')`（queen_reward_route/route_queen_reward）。
- **§8 主神衔接**：6 种死亡档案（摇篮曲/巢穴的养分/气闸的歉意/父的裁决/硫磺与蒸汽/暗角）；复活扣 600 点文案。

### 3. server-rs/tests/yiying_flow.rs（集成测试）
- ① L1 可达（逐行 40 字符 + 出生点(22,17) + 关键点可走动 + BFS 全层连通）。
- ② 主线链（开场→餐厅破尸→Father 智慧关停→孵化室→皇后管道过热熔毁→结算 sp_grade=C）。
- ③ 寄生倒计时未取样→三次「先安顿」→破胸死亡（「摇篮曲」）。
- ④ Father 断电前置影响终结技条件（未关则「主动挑衅皇后」不可见且直接扑管死于「硫磺与蒸汽」；已关则选项可见）。
- ⑤ fight 表完整性（BOSS 200/奖450/狂暴35%、工兵 70 蜂巢+30%）同构 zhouyuan 追加。

## 二、与设计差异（务实验收）
1. **静态门禁双条件**：`g_yiy_lab`/`g_yiy_queen` 需「yiy_father_off OR yiy_pulse」，而静态 GateDef 单一 need_flag。worlds/yiying.rs 中此两门 `need_flag=None`（静态恒锁占位），放行逻辑由 scenes_yiying.rs 的 `cond_gate_dyn / cond_has_pulse / cond_father_off` 在场景选择层判定，保证流程不卡死。地图静态门的 OR 接线由主线合并阶段用 GateDef.Dyn 增强。
2. **FightCfg.win 不可变**：引擎 win 回调为 `fn(&GameState)`，故酸血/工兵奖励/烧巢副作用不写入 win，改由专用 win 场景（yiy_win_acid/worker/burn）经 Route::Dyn/Hurt 落地。行为等价，实现更贴合引擎接口。
3. **死亡复活 600**：仅以文本标注，实际扣点由主线主神复活系统接线（引擎每世界复活价由主线维护）。
4. **出生点**：F1 图 P 放登陆坞 (22,17)，initial_scene 建议 `yiy_s0_arrive`（由主线在 WorldData.initial_scene 填写）。
5. **剧情感触**：树枝上用「就地了结他」跳过寄生倒计时以保持主线纯净；寄生线独立暴露于 s4_incubator 选项。

## 三、待主线排期的素材替换清单（本副本无专属 bg/立绘）
- 背景图（现引已部署图 → 待换目标）：
  - img_train.png → yiy_bg_cargo.png（贝蒂号货舱/开场）
  - img_corridor.png → yiy_bg_corridor.png（舱内走廊/主控室外）
  - img_horde.png → yiy_bg_incubator.png（孵化室/卵区荧光绿黏液）
  - img_laser.png → yiy_bg_queen_nest.png（皇后巢穴骨白穹顶）
  - img_redqueen.png → yiy_bg_reactor.png（反应堆/Father 主控室幽蓝屏）
  - img_isolation.png → yiy_bg_medlab.png（医疗舱）
  - img_sterile_lab.png → yiy_bg_lab.png（生物实验室）
- 敌人立绘（复用 → 待换目标）：抱脸虫/破胸体→img_licker.png（缩放0.6）→enemy_yiy_facehugger.png；工兵/哨兵→img_hunter.png→enemy_yiy_worker.png·enemy_yiy_sentinel.png；猎手→img_hunter.png→enemy_yiy_hunter.png；皇后→img_licker.png（放大）→enemy_yiy_queen.png。
- 完整美术需求见 yiying.md §9。

## 四、外部依赖点（★主线合并必须处理，本子代理无权改既有文件）
1. lib.rs 需加 `pub mod scenes_yiying;`。
2. worlds/mod.rs 需加 `mod yiying;` + `WORLD_YIYING="yiying"` + 注册 YIYING WorldData（id 用 "yiying"，initial_scene="yiy_s0_arrive"）并加入 WORLDS。
3. scenes.rs::scene() 需并入 YIYING_SCENES；scenes.rs::fight_cfg() 需并入 yiying_figths()（参考现有 scenes_zhouyuan 扩展写法）。
4. 结算复活 600 / sp_grade='C' 兑换门槛由主线主神空间接线。
5. tests/yiying_flow.rs 引用 `wuxian_horror_ch1::scenes_yiying`，需 lib.rs 声明该模块后才可编译（同 zhouyuan_flow 先例）。

## 五、cargo check 状态（如实）
- 真实 crate `cargo check`（lib）已通过（Finished dev profile）——既有工程健康。
- 由于 lib.rs/mod.rs 未注册我新增模块（仅主线能改），`cargo check --tests` 报告 tests/yiying_flow.rs 的 E0433（找不到 scenes_yiying，属★外部依赖，合并后即消）。
- 为校验自己两个 crate 文件能编译，临时以独立 scratch crate 镜像真实 defs/state/maps/world/worlds 并挂载 scenes_yiying + worlds::yiying 做了类型校验：
  - worlds/yiying.rs：**零错误**。
  - scenes_yiying.rs：修正 3 处真实错误（win 回调可变性、字符串内 ASCII 引号、format 实参多余）后**全部功能性通过**；唯一残留 E0753 为 include! 内嵌 mod 的 `//!` 模块文档工艺产物，真实 crate 以 `pub mod` 声明时不出现（与既有的 scenes_zhouyuan.rs 同 `//!` 头写法在真实 lib check 中已验证合法）。scratch 校验目录（.craft）为临时工艺，已按要求删除，不属交付物。

## 六、测试清单
① yiying_l1_map_reachable（L1 可达）　② yiying_main_line_queen_win（主线链→皇后→结算）　③ yiying_parasite_timeout_death（寄生破胸死亡）　④ yiying_pipe_finisher_needs_father_off（Father 断电前置→终结技条件）　⑤ yiying_fight_table_complete（fight 表完整性）
（②③④⑤ 需合并后可跑；① 地图可达仅依赖 worlds 注册后可跑。）