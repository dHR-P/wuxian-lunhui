# 《侠行天下 · 剑冢禁地》实现日志（副本子代理）

> 子代理：编程类，模型 `tokenrhythm/deepseek-v4-flash-0731`（与主线同模型）。
> 落地根：`games/wuxian-horror-ch1`。
> 产出：**只写 3 个全新文件 + 本日志**，未改动任何既有文件（一个字节未碰）。

## 1. 三文件产出与行数

| 文件 | 行数 | 说明 |
|---|---|---|
| `server-rs/src/worlds/jianzhong.rs` | 213 | 世界静态数据（4 层 40×26 地图 + POINTS 10 + ENEMIES 12 + NPC 1 + ZONES 4 + PORTALS 5 + GATES 4） |
| `server-rs/src/scenes_jianzhong.rs` | 895 | 剧情与战斗（JIANZHONG_SCENES 45 场景 + jianzhong_figths 13 场战斗 + 查询辅助） |
| `server-rs/tests/jianzhong_flow.rs` | 181 | 集成测试（4 个用例） |

> ★项：上述文件在合并注册之前**不参与编译**（未挂入 worlds/mod.rs / scenes.rs / lib.rs），
> 结构按 scenes_zhouyuan.rs / scenes_jiguancheng.rs / tests/jiguancheng_flow.rs 模板逐一对齐自查。

## 2. 场景/战斗数量与对象全表

- **场景**（JIANZHONG_SCENES，id 全 `jz_` 前缀，45 个）：
  jz_00 / 00_trust / 00_bow / 00_rush / 03_oldman_rush_win / 01 / 02_huangjing / 02_beilin / 03_oldman /
  06_arrive_l2 / 10_arrive_l2 / 11_sword_tassel / 12_mirror1 / 13_mirror1_win / 13_jianming / 14_rust_win /
  15_echo / 15_echo_win / 16_open_gate_l2 / 20_arrive_l3 / 21_shizhong / 22_sword_marks / 23_mirror2 /
  23_mirror2_win / 24_open_gate_l3 / 30_arrive_l4 / 32_guard / 33_cliff / 31_stele_north / _east / _west /
  _south / 34_stele_secret / 41_prequel / 42_boss / boss_round / 50_choice / 51_ending_took /
  51_ending_spare / 52_card / 33_mirror_apex / 33_mirror_apex_win / 99_death / 99_death_boss / 99_sancollapse。
- **战斗**（jianzhong_figths，id 全 `jz_`，13 场）：servant / sentry / patrol / echo / rust / wraith_faint /
  wraith / sword_mad / stele_guard / phantom_1 / phantom_2 / phantom_apex / **sword_spirit(BOSS 150/狂暴@70/奖励 600)**。
- **对象表**：POINTS 10 / ENEMIES 12 / NPC 1（守陵人 jz_03_oldman）/ ZONES 4 / PORTALS 5 / GATES 4。

## 3. 核心玩法落地方式（对照设计 §5/§10「零新增引擎能力」）

1. **心魔镜像战（克制当前武器）**：三场幻影 `jz_phantom_1/2/apex`（L2/L3/L4）走引擎原生 FightCfg
   （数值含克制加成基线，见 §4 表）；Dyn 文本在战前读 `GameState.weapon` 给「镜像克制当前武器」描述（参见
   jz_12_mirror1 / jz_23_mirror2 / jz_33_mirror_apex）。三场各胜置 `jz_mirror_1/2/apex`，
   `mirror_route_all` 集齐后置 `jz_mirror_all`（结算 +200）。
2. **低 san 条件事件**：L3 心魔显影（san<30 才显示选项）用 `ChoiceDef.cond: cond_low_san` 落地
   （设计 §10-2，现成能力）。
3. **BOSS 心境对决（战斗内读 san）**：剑冢之灵走「选择驱动遭遇链」（参考 zhouyuan/killer 折衷）——
   `jz_boss_round` 每回 `boss_act` 读 `GameState.san`：
   - san≤40：**心魔加持**，BOSS 伤害上限 +4，且每 3 回（jz_b1/b2/b3 循环）施放「心魔剑」（20–26 + San-10）；
   - san≥60：**剑心不稳**，BOSS 伤害 -2（台词「好澄明的心境……」）；
   - san≥80 且第 3 回合后：一次性「心境共鸣」回 hp 15（jz_boss_resonance）；
   - 狂暴 @HP≤70：「万剑归冢」每回追加 4–6 剑气；
   - **问心一剑终结**：`cond_finisher_ready` = (jz_heart_clean ‖ san≥50) && 回合数≥5，直接用 `boss_finisher`
     终结胜；san<30 时该选项被「心魔蔽目」（San-8）替换，只能硬磨。
   - 同步导出 `jz_sword_spirit` FightCfg 供 ZoneDef（z_jz_l4_boss）声明式引用（与咒怨 BOSS 同款双轨）。
4. **拔剑/不拔剑双结局**：BOSS 胜 → `jz_50_choice` 二选一（互斥）：
   - 拔剑：AddItem `it_wuming_sword`（设计「无名剑 Weapon 18–24」以兑换/武器项落地）+ San-10 + `jz_took_sword`
     → 结算文案「你带着剑走了……」；
   - 不拔剑：San+15 + `jz_spare_sword` → 剑灵释然文案「万剑入土，剑气归山」。
   - 分幕 `jz_51_ending_took/_spare` → `route_end_settle`（通关 san≥30 置 jz_san_keep，sp_grade 保 D）→ `jz_52_card`（回主神）。
5. **san 心境压力（场景级）**：L2 入场事件「剑意压迫」三选项（运功抵御 San-15 / 强行突破 HP-10 /
   `静心打坐` San+10 + jz_heart_clean）；深谷石冢得 `it_jingxin_stone` 亦置 jz_heart_clean。两者皆解 g3 石门。
6. **奖励/支线 flag（§7，各 +200）**：jz_old_case / jz_heart_clean / jz_mirror_all / jz_spare_sword /
   jz_san_keep / jz_stele_secret（L4 东/西/南剑痕 + 北残碑破译，`route_stele` → jz_34_stele_secret）。
   掉落：it_shanmen_ling / it_rust_key / it_jingxin_stone / it_sword_tassel / it_old_case_relic /
   it_wuming_sword / it_qixue_dan。小棠为存活队友（结算 +100 走既有公式）。
7. **单向传送闭环**：PortalDef 物理单向（无反向门）。进深 f1_to_f2/f2_to_f3/f3_to_f4 层级递增；
   两条单向捷径 `f2_shortcut`（藏剑龛→山门荒径，g4 需 jz_shortcut_open=剑穗+守陵人信任）与
   `f4_cliff`（断崖→深谷底部洞厅，`route_cliff` HP-5 San-5）。测试①断言 `to_floor<floor` 恰为这 2 扇。
8. **门禁**：g1 山门石坊（need_flag=jz_oldman_trust，A/B/C 三路线均置信任）；g2 锈锁铁门
   （need_item=it_rust_key）；g3 深谷石门（need_flag=jz_heart_clean，静心打坐/静心石皆置）；g4 藏剑龛暗格
   （need_flag=jz_shortcut_open）。
9. **失败复活**：死亡 overlay（death:(title,cause)）+ 卡片文案「回主神空间扣 200 点复活」按钮
   `__enter_nexus__`，由主线复活系统接线（设计 §8，与蜂巢同口径）。

## 4. 与设计文档的差异（如实）

1. **门禁 g1 以 flag 实现"或"**：设计为「山门令 **或** 守陵人信任」；因 GateDef 只支持 item 或 flag 其一，
   改为 `need_flag=jz_oldman_trust`，而 A/B/C 三路线均置该 flag（B 路线的「山门令」AddItem 亦附置信任），
   等效满足两种解锁路径。
2. **无名剑以道具项落地**：Weapon 枚举仅 Axe/Gun/Sword（定值伤害），无法承载「无名剑 18–24」；
   故结局拔剑 AddItem `it_wuming_sword`，作为武器/兑换项由主 agent 接线到主神兑换（§8「无名剑 1200/已拥有折半回收」）。
3. **栅 3 剑痕碑坐标**：设计列「东/西剑痕碑(16,5)(24,5)(16,15)(24,15)+北/南残碑」；为凑足 §7「三处剑痕+北残碑」
   破译，落地取 东(16,5)+西(24,5)+南(16,22)+北残碑(20,2) 四调查点，`jz_swordmark_east/west/south + jz_stele_seen`
   集齐置 jz_stele_secret（4 处齐才算，比 3 处更严格但符合「破译剑碑隐文」语义）。
4. **镜像战数值**：设计 §4「克制 dmg+3~5」折入各幻影 HP/dmg 基线；Dyn 文本读武器给克制的 flavor，
   不另造每回合同调钩子（零引擎改动，符合 §10-方案A）。
5. **BOSS 心境对决以"选择驱动遭遇链"落地**：因引擎 FightCfg 无每回合读 san 钩子，采用 jiguancheng/zhouyuan
   同款 Route::Dyn 遭遇链精确实现四种 san 状态 + 问心一剑；`jz_sword_spirit` FightCfg 仅作 ZoneDef/揭示引用。
6. **入场即心魔强制战的门槛**：设计「L3 san<30 强制镜像战」，在 L3 hub 以 san<30 才出现的「心魔显影」选项落地
   （无需强制劫持，玩家可绕开但也无法在低 san 下挥霍奖励），为可实现取舍。

## 5. ★外部依赖清单（合并注册代理需做的接线）

1. `worlds/mod.rs`：`mod jianzhong;` + 注册常量 `WORLD_JIANZHONG="jianzhong"` + 在 WORLDS 追加 `JIANZHONG`
   WorldData（引用 `jianzhong::JIANZHONG_L1..L4_MAP/JIANZHONG_FLOOR_NAMES/POINTS/ENEMIES/NPCS/ZONES/PORTALS/GATES`，
   initial_scene="jz_00"）。可另在 GW_PORTALS 挂主神→剑冢网关（本代理未动，留给主线）。
2. `scenes.rs`：`pub fn scene()` 链追加 `JIANZHONG_SCENES`；`pub fn fight_cfg()` 链追加 `jianzhong_figths()`。
3. `lib.rs`（或 main.rs）：`pub mod scenes_jianzhong;`（供 tests 引用 `scenes_jianzhong::jianzhong_figths`）。
4. **未注册文件不参与编译**：合并前全量 `cargo check/test` 会忽略本 3 文件（与 zhouyuan/jiguancheng 前置相同）。
5. **待素材**（bg 占位可复用）：jz_bg_gate / jz_bg_corridor / jz_bg_valley / jz_bg_stele；镜像/BOSS/怨灵、
   锈剑傀儡、入魔剑客、剑碑守卫等新立绘由主 agent 统一生图替换。

## 6. 自验（仅局部分析；未注册无法整链编译）

- worlds：10 个 POINT 路由 + 1 个 NPC talk 全部命中 scenes（grep 核对）；4 层 40×26（每行 40 字符已核，
  测试①亦断言）；出生点 (20,24)=spawn()；ENEMIES ×12 / 战斗 13 场 id 一一对应；ZONES ref_id 全在 fight 表。
- scenes：`mirror_route_all` 已修正（返回值 jz_10_arrive_l2，置于 SCENES 数组外的辅助节）；boss_round Dyn
  文本已清、无占位残留；`Route::To` 与 `Route::Dyn` 返回目标全部为已定义场景；death 路由 jz_99_* 齐备。
- tests（4 用例）：① 地图可达/出生/单向前捷断言；② 主线链开场→信任→L2(锈钥+静心)→L3(石门)→L4→BOSS
  问心一剑→拔剑→结算；③ 双结局互斥；④ 镜像入 Fight + 战表完整性 + BOSS 数值。