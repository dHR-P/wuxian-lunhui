# 《咒怨》测试修复日志（tests/zhouyuan_flow.rs）

## 背景
《咒怨》副本已实现并合并（worlds/zhouyuan.rs + scenes_zhouyuan.rs + 注册 + scenes.rs 扩展查询），
`cargo check` 通过。新增 `tests/zhouyuan_flow.rs` 5 用例，其中 2 个 FAIL：
- `zhouyuan_main_line_boss_win`（line 17 panic）
- `zhouyuan_curse_triple_is_death`（line 193 panic）

## 根因判定

### FAIL 1：zhouyuan_main_line_boss_win —— 测试错（pick 关键词与场景不符）
测试第 146 行 `step("返回玄关")`，但该步执行后所在场景是 `zy_03_back`。
`zy_03_back`（scenes_zhouyuan.rs）`real` 唯一按钮是「继续探索」→ `zy_02`，并无「返回玄关」按钮。
主线在此并不死路（「继续探索」回玄关 `zy_02` 即可继续），因此是**测试写错**，改测试即可。

### FAIL 2：zhouyuan_curse_triple_is_death —— 测试错（"高血狂暴 BOSS"与场景狂暴判定矛盾）
测试 `enter_boss_round(&mut st, 200, 2)` 构造 HP=200 的 BOSS，注释称"狂暴中"。
但 scenes_zhouyuan.rs 的「狂暴」判定是 `boss_raged()` = `fight.hp <= 56`（40% 阈值），
且测试自定义 `boss_raged_flag()` 要求 `hp<=56 && f.raged`。HP=200 既不满足 `hp<=56` 也不满足 `f.raged`，
故 line 193 断言失败；即便越过断言，HP=200 也远高于 56，后续攻击不会触发诅咒叠层。
场景诅咒叠层逻辑（route_boss_attack 内 `if boss_raged` 才叠层）是自洽可用的，因此是**测试构造错误**，改测试。

## 修复内容

### A. 仅改测试 tests/zhouyuan_flow.rs（两处根因下的直接修复）
1. line 146：`step("返回玄关")` → `step("继续探索")`，注释改为 `zy_03_back → zy_02`。
2. line 191-197（挑诅咒测试）：
   - `enter_boss_round(&mut st, 200, 2)` → `enter_boss_round(&mut st, 56, 2)`
     （血量定在狂暴阈值 56；重击伤害 34-46 → 余血 10-22 > 0，BOSS 不会被一回击倒；
     已有 2 层诅咒 → 本回先攒第 3 层 → 叠满 → 进入 `zy_17_lose_curse`）。
   - 同步更新注释，说明场景「狂暴」=HP≤56 的判定依据。

### B. 修复暴露出的第三处：scenes_zhouyuan.rs 强杀/仪式结算奖励缺失（场景 bug）
> 修完 A 后重跑，main_line 从 line 17 推进到 line 176 失败：`assertion failed: st.flag("zy_strongkill")`。
> 该测试期望击杀 BOSS 进入 `zy_16_win` 时「强杀结算」已生效（zy_strongkill 置位、点数增加）。
> 查 scenes_zhouyuan.rs 发现选择驱动 BOSS 战从未发放击杀奖励——`route_boss_attack` 击杀只返回
> `zy_16_win`，`route_win_settle` 也只在仪式路线 +200、强杀路线只置 zy_strongkill，均无 base 奖励。
> 这与设计文档 zhouyuan_impl_log「取舍 3」（仪式胜 500+200=700 / 强杀胜 250 且无支线副产）不符。
> 判定为**场景 bug**，按保守原则修场景：

- 新增 `fn settle_kayako(st: &mut GameState) -> String`：击杀回合统一结算——
  - `zy_exorcism` 成立：`points += 500 + 200`、`sp_grade=Some('D')`、`AddItem(item_talisman)`、置 `zy_exorcism_done`；
  - 否则（强杀）：`points += 250`、置 `zy_strongkill`。
  - 返回 `"zy_16_win"`。
- `route_boss_attack` 击杀分支由 `return "zy_16_win"` 改为 `return settle_kayako(st)`。
- `route_win_settle` 简化为纯路由（奖励/flag 已在击杀回核算，避免重复加）：按 `zy_exorcism` 走
  `zy_16_card_exorcism` / `zy_16_card_strong`。

## 验收
- `cargo check` 编译通过（改动 scenes_zhouyuan.rs 后确认整库可编译）。
- `cargo test --release --test zhouyuan_flow` → **5/5 全绿**：
  `zhouyuan_f1_map_reachable / zhouyuan_main_line_boss_win / zhouyuan_curse_triple_is_death /
  zhouyuan_wallpaper_death_archive / zhouyuan_fight_table_complete` 全部 ok，0 failed。

## 备注
- **动了 scenes_zhouyuan.rs**：`settle_kayako`（新增）、`route_boss_attack`（击杀分支改调结算）、
  `route_win_settle`（改纯路由）。背景：原实现击杀/强杀根本不给奖励，与设计文档矛盾，测试预期更合理。
- 未触碰 bg 字符串（`img_zhuyuan_book.png → scene_zy_*.png` 的 44 处改动由其他代理负责，未重复处理）。
- 其余测试文件（playthrough/migrate_save/nexus_exchange/debug_laser）未动。