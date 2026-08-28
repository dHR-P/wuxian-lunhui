# P1 补完：主神空间点数消费体系 — 实现日志

## 主线验收（2026-08-27 追加）
- `cargo test --release`：**20/20 全绿**（nexus_exchange 6 + migrate_save 4 + debug_laser 1 + playthrough 3 + 其他），full_playthrough 本次通过（随机 flaky 未复现）。
- `cargo build --release`：exe 71,606,272B（11:50:15）。
- **CDP 实测 `tools/nexus_exchange_flow.mjs`：10/10 全绿**——种子档（world_id=biohazard_ch1、points=8000、dead_team=[蕾恩]）加载 → api_nexus_enter 进主神 → 兑换强化(index0,800→str_bonus+1) → 基因锁(index1,2000→gene_lock) → 血统(基因锁购后可见列表收缩、index1,3000→vampire+agi+1) → 复活(剩2200<4000 fail 不扣点、dead_team 保留) → 张杰简报选项 → 简报卡(sp_grade/兑换/队友)。
- 验收中的脚本经验（供复用）：`api_world_interact` 对调查点只返回 `{kind:point,scene}` 不切场景，需再 `api_scene_goto`；`engine::choose` 用 **cond 过滤后可见选项的数组下标**（非静态 index）；`api_scene_back` 回到世界地图。
- 结论：**P1 补完验收通过**。

---

## 子代理实现记录（下为原始执行日志）

> 角色：主神空间 P1 补完「点数消费体系」实现子代理
> 模型：tokenrhythm/deepseek-v4-flash-0731
> 仓库：games/wuxian-horror-ch1（Rust 引擎 server-rs + 前端 server-rs/ui）
> 红线：不改 maps.rs / 不删既有场景/选项 / 不碰 zhutian 地图与 POINTS id / 不部署 / 不 build --release

## 2026-03-28 实现过程

### 步骤 0 · 现状梳理（读文件）
- `state.rs`：GameState 已有 `points`、`gene_lock`、`dead_team`、`sp_grade`；无 `str_bonus/agi_bonus/bloodline`。
- `defs.rs`：Eff 支持 Points/SetFlag/KillTeam 等；条件扣点需用 Route::Dyn 内联（Eff 无 if-checks）。
- `scenes.rs`：`card_nexus` 静态兑换卡（225 行段）；`s_nexus_exchange`(447) 是 overlay card → 三个光球全指向它；`s_nexus_resurrection`(456) 静态说明「后续轮回开放」；`s_nexus_zhangjie`(466) 含「查看兑换目录/复活祭坛/下一轮回/再聊聊」四选项；`card_new_cycle`(258) 文案「兑换/记忆清空重来」。
- `engine.rs`：fight_turn 玩家攻击 base 计算 + 敌人回合 dodge/dmg；hud_json。
- `worlds/zhutian.rs`：np_exchange_{strengthen,gene,bloodline} 三光球 → s_nexus_exchange；np_nexus_altar → s_nexus_resurrection（不改）。
- `main.rs`：api_nexus → card_nexus_pub；api_nexus_enter 进入主神世界。

### 设计决定
- **不用新 Eff**：兑换/复活的「点数够否 → 扣点」条件逻辑走 `Route::Dyn(fn(&mut GameState)->String)`，函数内做校验/扣点/写状态，按结果返回 success/fail 场景。符合现有 DSL，最小侵入。
- **兑换场景改造**：把 `s_nexus_exchange` 从 overlay card 改造成 `Mode::Normal` 可交互场景（保留三光球路由，不改地图）。新增 success 反馈场景（Dyn 文本）+ fail 提示场景。
- **属性联动（数值平衡依据 00_ENGINE_CONTEXT §2.3/§2.4 生化数值尺度）**：
  - `str_bonus`：细胞活力强化，兑换一次 +1，战斗攻击基础伤害 +5（消防斧 22-34 量级，+5 属可观但 800 点成本高）。谨慎不破坏生化（初始 bonus=0 对既有战斗零影响）。
  - `agi_bonus`：敏捷闪避，每点敌人命中闪避阈值 +0.05；（当前由吸血鬼血统附带 +1）。
  - `bloodline="vampire"`：初级吸血鬼血统，每回合玩家击中后回复 hp +4（上限 100）、受击伤害 -3。
- **复活**：`s_nexus_resurrection` 改为可交互：选项「复活一名本次阵亡的同伴 4000 点」→ 校验点数/扣点/把 dead_team 首位移除（回到存活）；空 dead_team 提示「本次轮回无人阵亡」。
- **简报**：新增 `s_nexus_briefing`（overlay card，Dyn body）：sp_grade + 当前点数 + 已兑换清单（str_bonus/血统）+ 阵亡队友。挂在 s_nexus_zhangjie 新增选项。
- **轮回清空**：新轮回走 `api_new` → GameState::new → bonus/points 天然清零；轮回记忆 explored 保留（已有逻辑），符合 card_new_cycle 文案。无需额外代码。

### 步骤 1 · state.rs 新增字段（已改）
- 新增 `str_bonus: i32`、`agi_bonus: i32`、`bloodline: Option<String>`，均 `#[serde(default)]`（兼容旧档）；`GameState::new()` 初始化为 0/0/None。

### 待办
- [x] scenes.rs 兑换链 + 复活 + 简报
- [x] engine.rs fight_turn 属性联动
- [x] client.js HUD 血统提示（最小改动）
- [x] tests/nexus_exchange.rs 六个用例
- [x] cargo check / cargo test（全绿，除既有随机 flaky full_playthrough，见步骤7）

### 步骤 2 · scenes.rs（已改）
- 常量：`COST_STRENGTHEN=800 / COST_GENE=2000 / COST_VAMPIRE=3000 / COST_RESURRECT=4000`。
- `is_vampire(st)` + `exchange_name(st)`（已兑换清单汇总，供简报/兑换成功/A 复用）。
- 兑换路由函数（Route::Dyn 内联条件扣点）：`route_exchange_strengthen`（扣800→str_bonus+1，可重复）、`route_exchange_gene`（扣2000→置 ex_bought_gene + gene_lock=true）、`route_exchange_vampire`（扣3000→bloodline=vampire + agi_bonus+1）。
- `route_resurrect_teammate`：dead_team 空→none 场景；点数<4000→fail 场景；否则扣点+移出首位+置 resurrected_{key}。
- `s_nexus_exchange` 从 overlay card 改造成 `Mode::Normal` 可交互场景（4 选项：强化/基因/血统/返回），三光球路由不变。
- 新增场景：`s_nexus_exchange_done` / `s_nexus_exchange_fail` / `s_nexus_resurrect_done` / `s_nexus_resurrect_none` / `s_nexus_resurrect_fail` / `s_nexus_briefing`（overlay card `card_briefing`）。
- `s_nexus_resurrection` 改为可交互（复活选项仅 dead_team 非空时显示；保留旧「抚过祭坛符纹」选项）。
- `s_nexus_zhangjie` 新增「看看上次轮回任务简报」选项 → briefing。
- static 限制：scenes 是 static 表，cond 用纯函数指针（`cond_show_*`/`cond_has_dead_teammate`），不能用闭包。
- `card_nexus`/`card_nexus_pub` 保留未删（api_nexus 仍可引用，非破坏）。

### 步骤 3 · engine.rs（已改）
- `hud_json` 新增 `strBonus`/`agiBonus`/`bloodline` 字段（前端 HUD 用）。
- `fight_turn` 玩家攻击段：`str_bonus>0` 时追加 `+str_bonus*5` 伤害；吸血鬼血统命中后回复 hp+4（≤100）。
- `fight_turn` 敌人回合：`dodge += agi_bonus*0.05`；吸血鬼血统受击减伤 3（`raw-gene-3`，下限 2 不变）。
- 平衡依据 00_ENGINE_CONTEXT §2.3：消防斧 22-34 量级，+5/层、+0.05 闪避、-3 受击属可控增量；无兑换则 bonus=0，既有生化零影响。

### 步骤 4 · client.js + index.html（已改，最小）
- index.html HUD 加 `#enhanceVal` 元素（默认隐藏）。
- client.js `refreshHud` 读 `hud.bloodline/strBonus/agiBonus`，聚合为「🩸吸血鬼 体质+N 敏捷+N」提示，无兑换则隐藏。全部兜底（`?? 0`/空串判断），不破坏既有刷新。

### 步骤 5 · cargo check
- 结果：**无 Rust error、无警告**，`Finished dev profile`。PowerShell 的 `[exit code:1]` 是 stderr 重定向原生命令伪报，非编译失败。
- 期间修正：static 表内不能调非 const fn / 用闭包做 cond → 改纯函数指针；`team_display` 返回 `&'static str`（去除参数生命周期）。

### 步骤 6 · 测试（tests/nexus_exchange.rs，6 用例）
- `exchange_strengthen_deducts_points_and_applies_bonus`：扣800 + str_bonus+1 + 进入 done；二次重复兑换再扣800叠加 str_bonus=2。
- `exchange_insufficient_points_rejected_no_deduction`：点数不足 → fail 场景，不扣点、属性不变。
- `exchange_gene_hides_after_purchase`：扣2000 + gene_lock/tag -> 返回后「基因锁」选项隐藏。
- `resurrect_deducts_points_and_removes_dead_teammate`：扣4000 + dead_team 首位移除（one 复活、jd 保留）。
- `resurrect_insufficient_points_rejected`：点数不足 → fail，不扣点、dead_team 不变。
- `resurrect_with_no_dead_shows_none`：无阵亡 → 不显示复活选项（走旧选项回张杰）。

### 步骤 7 · cargo test 总览
- `cargo check --all-targets`：**0 警告 / 0 错误**。
- 各测试文件（多次复跑稳定性验证）：
  - `tests/nexus_exchange.rs`：6/6 恒过（4 次复跑 0 失败）。
  - `tests/migrate_save.rs`：4/4 恒过。
  - `tests/debug_laser.rs`：1/1 恒过。
  - `tests/playthrough.rs`：`settle_counts_seven_sides`、`laser_two_fails_is_death` 恒过；**`full_playthrough_axe_all_sidequests` 为既有随机型 flaky**（同一次代码连续运行 PASS/FAIL 交错），失败点在 `fight_until_done` 里 licker 随机 BOSS 战玩家死亡（playthrough.rs:30 panic「战斗中出现死亡/异常卡片」）。
- **flaky 定性**：新建字段在 `GameState::new()` 均为 0/None，战斗分支（str_bonus>0 / is_vampire / agi_bonus>0）对全新档恒不触发，故 fresh playthrough 战斗逐字节等价于改动前；且 playthrough 流程根本不会进入 B/C 的兑换/复活场景，故非本次回归，属既有随机战测试固有抖动。

### 遗留风险
1. `full_playthrough_axe_all_sidequests` 随机 BOSS 战导致偶发失败（既有，非本次引入）；验收时容忍重跑或按 CDP 全流程验证。
2. 兑换文本 `text_exchange` 的强化行「攻击 +N」首次显示 5、已购后显示 `str_bonus*5+5`，为描述性文本，与 engine 生效值（str_bonus*5）语义一致但展示口径略宽（描述含某项即已生效）。
3. 血统吸血为每命中回复、受击减伤为简化版，未做回合末回血（未超标，符合「实现一个简单版本即可」）。
4. `card_nexus`/`api_nexus` 静态兑换卡保留未删（API 仍引用 card_nexus_pub），已是不可达展示路径，属非破坏性冗余。
5. 基因锁兑换直接置 `gene_lock=true`，与 licker 觉醒剧情共用该字段——若玩家先行兑换，则觉醒剧情卡不再触发（剧情文本仍指引濒危觉醒）。属可接受取舍，已在 A 说明。

### 输出文件清单
- `server-rs/src/state.rs`（+str_bonus/agi_bonus/bloodline/resurrected_name，均 serde(default)）
- `server-rs/src/scenes.rs`（兑换/复活/简报场景 + 路由函数）
- `server-rs/src/engine.rs`（hud_json 字段 + fight_turn 战斗联动）
- `server-rs/ui/index.html`（HUD #enhanceVal 元素）
- `server-rs/ui/js/client.js`（refreshHud 血统/强化提示）
- `server-rs/tests/nexus_exchange.rs`（6 用例）
- `tools/design/p1_exchange_impl_log.md`（本日志）

### 收尾验证
- `cargo check --all-targets`：0 警告 / 0 错误。
- `text_exchange` 强化行修正为「每级攻击 +5」恒等展示，避免已购后的算术误导。
- 最终 `cargo test --test nexus_exchange`：6/6 PASS。

### 结论
P1「点数消费体系」闭环已完成：兑换（A）真交互 + 扣点 + 属性写入 + 战斗数值联动；复活（B）扣点 + dead_team 变动 + 演出版文案；轮回任务简报/评价（C）入口与数据拼装；前端（D）最小 HUD 提示；测试（E）6 用例新增。全部 `cargo check` 零错误零警告；新增用例全绿；既有用例除随机 flaky 的 full_playthrough（非本次回归）外全绿。未改 maps.rs、未删既有场景/选项、未碰 zhutian 地图与 POINTS id、未部署、未 build --release。