# P1 主神空间实施日志（子代理：主神空间 P1 实现）

> 模型：`tokenrhythm/deepseek-v4-flash-0731`（与主线同模型）
> 角色：Rust 游戏架构 / 多世界落地子代理
> 依据：`tools/design/multi_world_framework.md` §6 P1、§4.3/4.4/2.4；`design/zhttty_universe/00_ENGINE_CONTEXT.md`
> 说明：本文件随实现进度**逐文件追加**落盘，防止中断丢进度。

## 已完成（检查点）

### [done] 阅读设计依据与现有代码
- `multi_world_framework.md §6 P1`（407-428）、§4.3/4.4/2.4、§2.6/2.7、§5.1。
- `00_ENGINE_CONTEXT.md`：SceneDef/ChoiceDef/Eff/PointDef/NpcDef/PortalDef/GateDef/FIGHTS/compute_settlement。
- 现码：worlds/mod.rs（P0 WorldData/WORLDS/find_world/tile/walkable/switch_world 已实现）、world.rs（world_init/reveal_around/try_move/nearby_interactables/world_view/enemy_by_id/kill_enemy/mark_point/add_item/ensure_enemies/switch_world）、scenes.rs（card_settle/card_nexus/s_nexus 系列/s_settle）、main.rs（api_world/api_world_interact/api_nexus 等）、client.js（showCard/__title__/__card_nexus__/__back_to_world__）、world2d.js（setData 标题）。
- **关键结论**：P0 已完成（world_id/world_states/save_version/sp_grade + WorldRuntime + migrate_save + switch_world + explored 前缀）。P1 从零实施。
- **识别到 P0 遗留**：`api_world_interact`/`api_world_move` 仍用 `maps::` 全局生化表（非当前世界表），跨世界后可交互对象会查错。P1 需世界化（不改 maps.rs，改 main.rs 查 `worlds::find_world(&st.world_id)`）。
- **识别到跨世界传送门缺 `to_world`**：`maps::PortalDef` 无 `to_world`（P2 加），且不可改 maps.rs。P1 用独立 `WorldGateway` 网关表（worlds/mod.rs `GW_PORTALS`）承载跨世界网关（gw_biohazard/gw_zhouyuan），避免动 PortalDef。

### [in-progress] 待实施
见末尾逐文件要点。

---

（以下为逐文件变更记录）

## zhutian.rs（新增）✅
- `ZHUTIAN_MAP = 1 层 40×26 ASCII`（等宽，宽度经脚本校验全部 40）。布局定稿（y 行, x 0-39）：
  - 中央直径约 9 格「主神光柱圆台」（中心 `I`@(22,12)，墙环，南侧开口，出生 `P`@(22,16) 恰在开口下方）。
  - 西侧半圆广场（圆弧墙 on y=8,横 x6-13）：张杰 NPC@(7,11)。
  - 东侧传送门阵列：上生化白门房间（y6-9, x28-34，内 `I`@(31,8)），下咒怨灰绿门房间（y16-19，内 `I`@(31,18)）。
  - 南侧兑换区光球×3 @ x18/21/24 y19；西南复活祭坛小室（x5-8 y20-22，`I`@(7,21)）。
- `ZHUTIAN_FLOOR_NAMES = ["主神空间 · 中央广场"]`。
- `POINTS`：主神光柱 np_nexus_god@(22,12)→s_nexus_god；兑换光球×3 np_exchange_{strengthen,gene,bloodline}@(18/21/24,19)→s_nexus_exchange；复活祭坛 np_nexus_altar@(7,21)→s_nexus_resurrection。
- `NPCS`：n_zhangjie_nexus@(7,11)→s_nexus_zhangjie。
- `PORTALS = &[]`（单层无层内切层；跨世界网关走 GW_PORTALS）。
- `GATES`：gz_zhouyuan@(31,16) need_flag `zy_unlocked`（P1 无此 flag → 恒锁，落实「暂不解锁」）。

## worlds/mod.rs ✅
- `mod zhutian;` + `WorldGateway` 结构（id/from_world/floor/x/y/to_world/to_floor/tx/ty/available）。
- `GW_PORTALS` 网关表：gw_biohazard（主神@(31,8)→生化 F1 出生 (1,1)，available）＋gw_zhouyuan（主神@(31,18)→咒怨，available=false 占位）。
- `gw_portal_by_id(id)` / `gw_portal_in(world,floor,x,y)` 查询。
- `ZHUTIAN` WorldData 注册（difficulty=0，enemies 空表），`WORLDS = &[&BIOHAZARD, &ZHUTIAN]`。
- 未动 BIOHAZARD 既有注册与 WorldData 外壳结构。

## world.rs ✅（世界化最小改动，不改 maps.rs）
- `nearby_interactables` 追加 GW 网关为 `portal` 就近项（gateway_label 显示「传送门 · 生化蜂巢」/「传送门 · 咒怨（封印）」）。
- `world_view` 把当前世界 GW 网关并入 `portals` 数组（含 to_world 字段）供前端绘制。
- switch_world（P0 已有）不动。

## main.rs ✅
- `api_world_interact` 世界化：改用 `worlds::find_world(&st.world_id)` 查当前世界 GATES/ZONES/ENEMIES/POINTS/NPCS/PORTALS（不再用 maps:: 全局生化表）；跨世界网关分支 `worlds::gw_portal_by_id`（P1）：「主神→生化」可用 /「咒怨」占位，占位返回 `portal_world available:false` 提示；可用网关 `switch_world→落点覆写→zone=None→save` 返回 `portal_world`（含 floor_name）。zone 激活时拒传 `busy`。
- `api_world_move` 世界化：gate_blocked 查当前世界门禁表、`floor_name` 用 `world.floor_names`；encounter 查当前世界敌人。
- 新增 `api_nexus_enter`：仅 `st.world_id==WORLD_BIOHAZARD` 时 `set_flag("bh_cleared")`（幂等）；`zone=None` 兜底；`switch_world(zhutianshenkong)` → 落点 `spawn()` → save → `rebuild_mode` → `world_view + hud`。
- 恢复意外误删的 `api_deaths` 的 `let path` 行（无功能影响）。
- 注册 `api_nexus_enter` 到 generate_handler。
- `maps` import 仍被 `zone_enemy_id`（main.rs:464）使用，无未用告警。

## scenes.rs ✅
- `card_settle` 结算卡按钮：`查 看 主 神 空 间 → __card_nexus__` 改为一键 `进 入 主 神 空 间 ▶ → __enter_nexus__`。
- `card_nexus`（兑换目录，api_nexus / s_nexus_exchange 复用）按钮改为两枚：`回 主 神 空 间 ⌂ → __enter_nexus__` + `进 入 下 一 次 轮 回 ▶ → __title__`（fallback 保底）。
- 新增 `card_new_cycle`（开始下一轮回确认卡）：按钮 `开 始 下 一 次 轮 回 ▶ → __title__` + `返回主神广场 → __back_to_world__`。
- 新增 5 个主神空间可玩场景（插在 s_warning 之后，复用 `s_nexus*` 前缀，未动既有 s_nexus/s_weapon/s_train/s_settle 系列）：
  - `s_nexus_god`：中央光柱调查点（np_nexus_god 路由）；选项→s_nexus_exchange。
  - `s_nexus_exchange`：兑换光球（兑换×3 路由）；`overlay.card = card_nexus`（复用兑换卡）。
  - `s_nexus_resurrection`：复活祭坛说明（np_nexus_altar 路由）；选项→s_nexus_zhangjie。
  - `s_nexus_zhangjie`：张杰主神对话（含兑换目录 / 复活祭坛 / 「开始下一轮回」→s_nexus_new_cycle / 再聊聊；bh_cleared 后台词变化）。NPC n_zhangjie_nexus 路由至此。
  - `s_nexus_new_cycle`：`overlay.card = card_new_cycle`（轮回重启卡）。
- `card_nexus_pub` 正常引用 `card_nexus`；`#![allow(dead_code)]` 已有。

## client.js / world2d.js
- 【占位】

## client.js / world2d.js ✅
- client.js `showCard` 新增 `__enter_nexus__` 分支：收起 endOverlay → `setMode("world")` → `TAURI_INVOKE("api_nexus_enter")` → 取 `v.hud` refreshHud、`v`（world_view+w+h…）`World2D.setData(v)` + 提示「你回到了主神空间…」；错误走 try/catch `worldMsg`。风格对齐 `__back_to_world__`/`__card_nexus__`。
- client.js `worldInteract` 新增 `kind==="portal_world"` 分支：`available===false` 显示网关未开启提示（咒怨占位）；可用则 `TAURI_INVOKE("api_world")` 整图重载到目标世界。
- world2d.js `setData` 标题改为 `${world.name} · ${floor_name}`（无 world 元信息时回退 `floor_name||"蜂巢"`）。
- main.rs `api_nexus_enter` 返回体补 `world` 元信息（与 api_world 一致），供前端标题取世界名。

## cargo check / test（主线验收执行）
- 子代理三次中断于构建验证，由主线接手：修复 world.rs:188 `portals` 缺 `mut`（GW 网关并入 world_view 的编译错，主线一处补刀）。
- `cargo check`：Finished dev profile（8.93s），零错误零警告。
- `cargo test --release`：**8/8 全绿**（debug_laser 1 + migrate_save 4 + playthrough 3），无回归。
- `cargo build --release`：Finished release profile（32.54s）；产物 `server-rs\target\release\wuxian-horror-ch1.exe`（71,553,024B）。

## §6 P1 验收点对照（主线 CDP 实测，tools/nexus_flow.mjs）
| # | 验收点 | 结果 |
|---|---|---|
| 1 | 生化世界加载（基线） | PASS |
| 2 | api_nexus_enter → world_id=zhutianshenkong，落点 (22,16) 中央广场 | PASS |
| 3 | 主神世界视图 DOM 可见 | PASS |
| 4 | 主神空间 BFS 移动至光柱 (22,12) | PASS |
| 5 | 光柱调查 → s_nexus_god | PASS |
| 6 | 张杰主神对话 → s_nexus_zhangjie | PASS |
| 7 | card_nexus 两按钮（回主神空间⌂/__enter_nexus__ + 进入下一次轮回▶/__title__） | PASS |
| 8 | gw_biohazard 网关交互 → 回生化 (1,1) | PASS |
| 9 | bh_cleared 标记写入存档 | PASS |
| 10 | gw_zhouyuan 占位网关静态数据（to_world=zhuyuan） | PASS（源码+视图双证） |
- **nexus_flow.mjs 9/9 全绿**（#10 为 NOTE 项不计数）；P0 回归 world_flow.mjs **10/10 全绿**。
- P1 验收结论：**通过**。残留 P2 事项：PortalDef.to_world 结构化字段、咒怨世界解锁（gz_zhouyuan 需 zy_unlocked flag）。