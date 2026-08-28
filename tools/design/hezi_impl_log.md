# 《异位面 · 倒影界》副本实现日志（开放探索 · 世界展示向） — hezi 世界版

## 方向调整记录（最终版）
- 原初“盒壁层·盒子真相线”已在主线路演中被要求砍掉 → 改为**异位面 · 倒影界**开放探索。
- 命名（最终定案）：世界 id 保留 `WORLD_HEZI="hezi"`，文件名 `worlds/hezi.rs` / `scenes_hezi.rs` / `tests/hezi_flow.rs`；场景/战斗 id 全 `hz_` 前缀；道具用 `it_yijie_crystal`（荧光水晶）/ `it_yijie_specimen`（异界标本）。
- **已删除**：盒壁/盒子制造者/盒外观测者·渗透体/真相档案/observer_watching 长线/「盒子外面还有一个盒子」/自毁封印/位面编号 WX-Ω0967 等一切指向性设定。
- **保留/强化**：开放探索（3 层、调查点=奇观、敌人=原生异兽、BOSS=界域守护兽可交流或战）、开放结局三择、sp_grade 按探索度（D/C）。
- 钩子（世界展示向）：「这里没有故事，只有风景。你来过了，就是了。」

## 文件（最终）
| 文件 | 行数 | 说明 |
|---|---|---|
| `server-rs/src/worlds/hezi.rs` | 194 | 3 层 40×26 地图（倒映平原/荧光石林/倒悬星海）+ 五表（maps::* 类型） |
| `server-rs/src/scenes_hezi.rs` | 558 | HEZI_SCENES + hezi_figths + 界域守护兽（交流或战） |
| `server-rs/tests/hezi_flow.rs` | 164 | 3 个集成用例（open-ending 版） |
| `tools/design/hezi_impl_log.md` | 本文件 | 实现日志 |

> 说明：会话早前曾误用 `yijie` 命名产出 `yijie_impl_log.md`，最终统一为 `hezi` 命名；遗留 `yijie_impl_log.md` 已删，世界展示向语义不变。

## 结构速记
- 3 层开放漫游：F1 倒映平原·逆流之河 → F2 荧光石林·水晶回廊 → F3 倒悬星海·界域阙（每行 40 字符；坐标落位于各表，全可走）。
- 奇观（POINTS=10 + 场景内加 会说话的湖，共 11 处 flag）：逆流之河/倒悬草地/静止的雨/棱光石滩/荧光石林/回音谷/结晶花丛/会说话的湖/倒悬星海/界域阙/沉睡的巨人 —— 各为「景色描述 + 可选微互动」，不推进任何阴谋。
- 原生异兽（ENEMIES=7）：逆流鱼群/荧光水鹿/温顺兽群/石林枭/荧光巨鹿/星鲸×2 —— 只是居民。
- BOSS=界域守护兽 · 镜潮兽（场上 z_hz_f3_guardian，fight `hz_guardian` HP200 / rage_at 100）：
  - 友好交流：hz_30_guardian「朝它挥手问好」→ 直接得标本（guardian_friendly，flag hz_guardian_peace）。
  - 切磋：hz_31_battle → 温和态→怒态（镜潮翻涌），胜/和解得标本（flag hz_guardian_win），掉落 it_yijie_specimen。
- 开放结局（hz_40_ending，无对错无真相）：继续漫游 / 带走标本 / 就地安歇看星。
- sp_grade 按探索度：wonder_count(11 项 flag 计数)>=8 → Some('C')，否则 Some('D')。
- 道具：it_yijie_crystal（荧光水晶，滤光，开 G1 微光幕）、it_yijie_specimen（异界标本）。
- 死亡档案 hz_50_death（坠入星海，复活扣 300）。

## ★外部依赖清单（主线合并阶段必须接线，否则 hz_* 无法解析）
1. `lib.rs` 加 `pub mod scenes_hezi;`
2. `scenes.rs::scene(id)` 加 `.or_else(|| crate::scenes_hezi::HEZI_SCENES.iter().find(|s| s.id==id))`
3. `scenes.rs::fight_cfg(id)` 加 `.or_else(|| crate::scenes_hezi::hezi_figths().iter().find(|(k,_)| *k==id).map(|(_,v)| v))`
4. `worlds/mod.rs`：`mod hezi;` + `pub const WORLD_HEZI="hezi";` + `static HEZI: WorldData{...}`(initial_scene="hz_00", floors=HEZI_F1/2/3_MAP, floor_names=hezi::HEZI_FLOOR_NAMES, points/enemies/npcs/zones/portals/gates=hezi::*) + 加入 WORLDS 数组
5. `worlds/mod.rs` 增加 `gw_hezi` 跨世界网关（落点 F1 (1,1)）
6. `items_data.rs` 注册 `it_yijie_crystal`、`it_yijie_specimen`（add_item 入 String 即可运行；兑换/图鉴需注册）
7. 复活/回主神 `__enter_nexus__` 由既有主线接线

## 测试清单（tests/hezi_flow.rs，3 用例）
- ① `hezi_maps_reachable`：三层每行 40 字符/无空格；出生点(1,1)；奇观点/异兽/传送门/门禁可走。
- ② `hezi_main_line_open_ending`：慢些走入→逆流之河捞水光→棱光石滩拾水晶→进入荧光石林→回音谷聊回声→倒悬星海躺一会→界域守护兽友好交流（挥手问好）→收异界标本→继续漫游→结算；断言 hz_w_river/echo/stars 三探索 flag + sp_grade∈{C,D}。
- ③ `hezi_guard_battle_open_ending`：切磋一场（重击循环）→拾标本→就地安歇看星→结算；另：低探索度评 D；战斗表完整性（7 fight id + 守护兽 HP200/rage100）。

## 世界展示向落实自检
- ✅ 无幕后黑手/真相/阴谋：全部奇观纯景色+微互动，无动机链。
- ✅ 敌人=原生居民：擦肩/共鸣/伴游，非阴谋产物。
- ✅ BOSS=界域守护兽：可打可友好交流，皆无指向意义，掉落标本。
- ✅ 结局开放：三个选择无对错无揭示。
- ✅ 钩子改为世界展示向文案。
- ✅ 无真相/阴谋关键词残留（grep 确认 observer_watching/渗透体/盒外/制造者/自毁等已删；仅剩否定式「没有真相要揭」）。