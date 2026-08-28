# 前端渲染契约审查报告 —「无限轮回·生化蜂巢」2D/3D 重写

- 审查范围(只读,未修改任何代码):
  - `server-rs/ui/js/client.js`(调用方,614 行)
  - `server-rs/ui/js/world2d.js`(2D 地图,482 行)
  - `server-rs/ui/js/zone3d.js`(3D 副本,564 行)
  - `server-rs/ui/index.html`(加载序:vendor/three.min.js → world2d.js → zone3d.js → client.js)
- 交叉核对:Rust 侧 `server-rs/src/{world.rs, main.rs, engine.rs, maps.rs}`的实发字段,确认契约条款。
- 审查模型:tokenrhythm/deepseek-v4-flash-0731(与主线相同),角色:WebGL/Canvas 渲染契约审查员。
- 日期:2026-02(会话内完成)。
- **修复状态:10/10 已修复(2026-08-27 会话内)。修复明细见第五节「修复回填记录」。**

---

## 一、契约核对

### 1.1 World2D 契约 ✅(基本一致)
client.js:590-594 调 `World2D.init($("worldCanvas"), {onMove,onInteract,onMsg})`,与 world2d.js:36-50 的 `init(canvas, opts)` 匹配(`onHud` 为可选,未传即 null,且无任何消费方——无害死字段)。
- `setData(view.world)` / `setPlayer` / `keydown` / `keyup` / `start` / `stop` / `nearbyList` / `moveIntent` — world2d.js:478 对外暴露完全一致,`window.World2D` 在 client.js 之前挂载(index.html:92 先于 93),无时序问题。

### 1.2 Zone3D 契约 ✅(基本一致)
client.js:426-453 调 `Zone3D.init(container, {onAction,onMsg,onWin,onExit})`,zone3d.js:560 暴露 `{init,setData,start,stop,dispose,onZoneUpdate,keydown,keyup}` 完全一致。
- `Zone3D.setData({id,kind,ref,enemy})`(client.js:458/463)与 zone3d.js:386-414 消费方式一致:`enemy` 仅作"战斗副本是否有敌人"的真值门槛,渲染用 `ref` 经 `enemyKind()`(zone3d.js:40-46)选立绘——`zombie1_save/horde/licker/b_guard/hunter_elite` 与 maps.rs 的 5 个战斗 ref 全部命中,无遗漏。
- **素材路径全部存在且大小写正确**(已 glob 核实):`assets/img/enemy_{zombie,horde,licker,guard,hunter}.png`、`pc_zhengzha.png`、`img_zhangjie.png`、`tex_floor_hive.png`、`tex_wall_industrial.png` 均在 `ui/assets/img/` 下。

### 1.3 Rust 实发字段 vs 前端消费
| 字段 | Rust 实发(world.rs:143-193) | 前端消费 | 结论 |
|---|---|---|---|
| tiles/w/h/floor/floor_name | `F1_MAP…F4_MAP` 字符串数组 | world2d.js:217-222 逐行绘制,`row[x]||"#"` | ✅ |
| px/py | 玩家格坐标 | world2d.js:140-141 `px*TILE+TILE/2` | ✅ |
| explored | **world.rs:177-183 已把 `"floor:x:y"` 剥前缀成 `"x:y"` 后下发**(注释明确用 `strip_prefix` 只裁一次) | world2d.js:139 `new Set(...)` + 34 行 `has(x+":"+y)` | ✅ 前端无需再剥,解析正确(见"无问题项") |
| enemies | `{id,name,x,y,radius,alive}`(alive 由 `enemies_alive` 给出,world_init 全量插 true) | world2d.js:411-439,`alive` 假则跳过绘制,`radius` 画巡逻圈 | ✅ |
| points/npcs/zones/portals/gates | `{id,x,y,done/name/kind/ref/to_floor/locked/need}` | world2d.js 逐类绘制,字段名全对上 | ✅ |
| nearby | `{id,name,kind,dx,dy}`(曼哈顿 ≤1) | world2d.js:170-173 同样按 `|dx|+|dy|<=1` 过滤(注意:对角 |1|+|1|=2 不被双方接受,一致) | ✅ |
| zone 进入返回 | `zone_enter_inner` → `{zone:{id,kind,ref}, enemy:{name,hp,max_hp,intro}, hud}` | client.js:456-465 用 `z.zone` + `z.enemy`(enemy 对象本身 zone3d 不消费,只作真值) | ✅ |

### 1.4 键盘/模式开关
- `setMode()`(client.js:223-236)同步写 `worldActive/zoneActive/window.ZoneActive`,zone3d.js:426 用 `window.ZoneActive` 作门槛,与 client.js 自管变量一致,无错位。
- zone 模式时 client.js:597 `if (worldActive) World2D.keydown(e)` 不执行,方向键 preventDefault 仅由 zone3d 做,world2d 不收事件——**常规按键无冲突**。唯一冲突点见 Bug-01(Escape)。
- raf 成对性(常态路径):`enterWorld`→setMode("world")→setData(→start());`leaveZone`→dispose(→stop)+enterWorldKeep→setData(→start);setMode 非 world 均 `World2D.stop()`、非 zone 均 `Zone3D.stop()`。**正常流程成对**。

---

## 二、潜在 Bug 清单

> 格式:文件:行号:问题:建议。严重级:HIGH / MED / LOW。

### Bug-01 [HIGH] Escape 在 zone 模式被双触发 leaveZone
- `client.js:598-601`(window keydown:`if (e.key === "Escape") { if (zoneActive) leaveZone(); … }`)
- `zone3d.js:444`(zone3d 自己的 keydown:`if (k === "escape" && onExit) onExit();` → client 的 onExit 就是 `leaveZone`)
- 问题:zone 模式按一次 Escape,两个 window keydown 监听器都会执行,`leaveZone()` 并发跑两遍:两次 `api_zone_exit` IPC、两次 `Zone3D.dispose()`、两次 `enterWorldKeep()`(两次 `api_world` + 两次 `World2D.setData`)。当前 dispose 内部有 `parentNode` 判空等守卫所以一般不到崩溃,但这是**明确的重复事件处理缺陷**,且与 Bug-02 组合会放大竞态窗口。
- 建议:二选一——client.js 的 Escape 分支排除 zone 模式(`if (e.key === "Escape" && !zoneActive)`),或 zone3d 不再处理 escape;只在一边负责退出。

### Bug-02 [MED] dispose 之后才 setData/start —— 副本初始化与退出的竞态
- `client.js:455-465`:`Zone3D.init` 在 `await api_world_interact` **之前**就已注册 keydown(zone3d.js:311-312)。若在 IPC 返回前按 Escape:leaveZone → dispose → `enterWorldKeep` 已把界面切回世界;随后 Promise resolve,`Zone3D.setData(...)` + `Zone3D.start()` 在**已 dispose(且 DOM 已被移除)的实例**上执行 → raf 被重新拉起,后台空转渲染,直到下次 setMode 才被停掉。窗口期 = IPC 往返耗时,实际可复现(慢盘/高负载时更长)。
- 建议:enterZone 的异步尾部加"已销毁"标志(`if (disposed) return`),或 init 后立即 setData(enemy 数据可后补),start 只允许在 setData 之后、且 dispose 置 `disposed=true` 后全部拒绝。

### Bug-03 [MED] worldMove 撞敌后不 return,随后 `refreshNearby()` 重启世界渲染循环
- `client.js:280-286`:`if (r.encounter) { enterZone(…, null); }` 未 `await`(函数体在 `await api_world_interact` 处挂起),紧接着 `if (r.nearby) refreshNearby()` 必然执行 → `api_world` + `World2D.setData(w)` → world2d.js:149 `start()` 重启隐藏画布的 raf 循环。
- 后果:进入 3D 副本的同时,2D 世界循环在后台持续 run(不可见但耗 CPU),且 setData 会把玩家/敌人位置打回服务端数据;**若玩家按方向键撞入战斗,残留键位会驱动后台循环不断发 `api_world_move`(见 Bug-04),副本期间世界状态被后台挪动**。
- 建议:`if (r.encounter) { enterZone(...); return; }`;refreshNearby 只在无遭遇时执行。

### Bug-04 [MED] 键位残留(sticky keys):模式切换期间释放的键不再被清理
- `client.js:603-605` + `world2d.js:168`:`World2D.keyup` 仅在 `worldActive` 时转发;进入 zone/story 模式后,键盘在该期间抬起的键(w/a/s/d/方向)永远留在 `world2d.keys`。
- `world2d.js:185-202`:loop 只要被再次 `start()`(Bug-03 的 setData 就会)就会用残留键位持续 `moveCb(dx,dy)` → 后台盲目 `api_world_move`。
- 同理 `setMode("story")`/`setMode("zone")` 均未清 `keys`,回世界后玩家可能"自己走"。
- 建议:setMode 里对非 world 模式调用 `World2D.stop()` 的同时清空对象内部 keys(增补 `World2D.clearKeys()`);keyup 分发与 worldActive 解耦。

### Bug-05 [HIGH] 3D 战斗玩家死亡分支未处理:死亡卡片丢失、副本卡死
- `client.js:432-445` attack 回调只处理 `r.win` 与 `r.view && r.view.fight`;而 Rust `api_zone_action` 死亡时返回 `{dead:true, view: render(st), hud, scene}`(main.rs:359-363,此时 `st.zone=None`、engine.rs render 在 death 场景下不带 `fight` 字段,可能带 `card`)。
- 后果:两个分支都不命中 → 无死亡提示、无死亡卡片(如「基 因 锁」觉醒)、不 leaveZone;玩家画面停在 3D 场景里,只能按 Escape 被动退出。对剧情向游戏这是**玩法断裂**。
- 建议:attack 回调补 `else if (r && r.dead) { handleView(r.view); }`(或至少 `leaveZone()` 并展示死亡反馈),同时保证 `st.scene_id` 死亡卡片流程走到前端。

### Bug-06 [MED] 部分 HUD 刷新把 undefined 写进 UI
- `client.js:441`:`refreshHud({ hp: r.player_hp })` — hud_json 字段为 hp/san/points/weapon/ammo/team(engine.rs:13-26),该对象只有 hp。
- 后果:refreshHud(143-160)执行 `$("sanFill").style.width = clamp(undefined,0,100)+"%"` → `"NaN%"` 非法 CSS 值;`sanVal/ptsVal/wpnVal` 文本变 `"undefined"`;`wpnVal` 显示 `"undefined"`(`undefined + (…)`);teamHud 被重绘成空。每次攻击成功 HUD 就花屏一次。
- 建议:refreshHud 内对字段做 `?? 0`/`?? "—"` 兜底,或 zone 攻击后用完整 hud 刷新(`r.view.hud`)。

### Bug-07 [MED] Zone3D 资源泄漏:dispose 不释放 renderer/纹理,反复进出副本堆积 WebGL 上下文
- `zone3d.js:461-471` dispose 仅 `stop()` + 移除监听 + 移除 DOM 节点;未调 `renderer.dispose()` / `renderer.forceContextLoss()`,未遍历 scene 释放 geometry/material/texture。`setData`(zone3d.js:389)重建敌人时旧 group 的材质/贴图也未回收;`enemyHitFx` 的 setTimeout 闭包(zone3d.js:194-202)若跨 dispose 触发,`scene.remove(ai.m)` 抛异常会被 try 包住(466 行)——但残留引用仍在。
- 后果:每次 `enterWorld → 战斗 → leaveZone → 再进`都新建一个 WebGLRenderer,浏览器 WebGL 上下文上限约 16 个,长时间游玩后上下文耗尽 → 新建 renderer 抛错、渲染黑屏。
- 建议:dispose 中 `renderer.dispose()`(+可选 `forceContextLoss`),并对 `scene.traverse` 释放几何/材质/贴图;setData 重建敌人前对旧 group 同样回收。

### Bug-08 [MED] backToTitle 未清理世界模式状态(标题页残留世界交互与叠加显示)
- `client.js:211-216`:Escape(世界模式)→ `backToTitle()` 只 `story/hud` 隐藏 + titleScreen 显示;**未隐藏 `worldView`、未 `setMode("title")`、worldActive 仍为 true、未 `World2D.stop()`**。
- 后果:① `worldView` 与 `titleScreen` 同时可见,叠层冲突;② window keydown 在标题页仍路由给 World2D(按 E 会真的发 `api_world_interact`,方向键被 preventDefault 让标题页视频/滚动异常);③ World2D raf 持续空转。`showCard` 的 `__title__` 路由(client.js:193)同样走到这里。
- 建议:backToTitle 第一行调 `setMode("title")`(顺带 stop 两个引擎),并显式隐藏 worldView/zoneView。

### Bug-09 [LOW] btnContinue 重复赋值(死代码)
- `client.js:536-545` 第一段 `$("btnContinue").onclick = …`(含 `setMode("world")` 逻辑)被 546-554 立即覆盖,任何情况下都不会执行"继续上次直接回世界"的路径。若第二段才是意图,删除第一段;否则确认逻辑错位。
- (顺带)`client.js:41` `this.dragon = 0;` 为无意义属性写入,建议清理,非功能问题。

### Bug-10 [LOW] 渲染循环每帧分配对象/贴图
- `zone3d.js:544` `camera.position.lerp(new THREE.Vector3(...), 0.12)` 每帧 new 一个 Vector3;`swingFx/dodgeFx` 每次攻击新建 CanvasTexture(zone3d.js:150-181)且不销毁成功路径外的贴图;world2d.js:171 `ctx.createRadialGradient` 每帧多处创建。属 GC/性能级 minor,量级小。

---

## 三、无问题项列表(逐项核对结论)

1. **explored 格式解析 — 无问题。** Rust(world.rs:177-183)在序列化前用 `strip_prefix` 把 `"floor:x:y"` 剥成 `"x:y"` 再下发(注释还防了 `trim_start_matches` 的 `"1:1:5"→"5"` 陷阱),world2d.js 34/139 行的 `has(x+":"+y)` 解析正确;前端不需要也不应该再剥一层。
2. **素材路径大小写 — 无问题。** 5 张 enemy_*.png、pc_zhengzha.png、img_zhangjie.png、tex_floor_hive.png、tex_wall_industrial.png 全部存在于 ui/assets/img/,zone3d/world2d 引用路径一致。
3. **index.html id 对齐 — 无问题。** client.js 全部 `$(...)` 引用(id 清单:narrBox/narrText/bgA/bgB/locName/hpFill/sanFill/hpVal/sanVal/ptsVal/wpnVal/teamHud/cineWrap/cineVid/cineTag/cineSkip/ovCard/endOverlay/story/hud/titleScreen/worldView/zoneView/worldMsg/worldLoc/zoneTitle/zone3dContainer/zoneMsg/fightBar/enemyName/enemyFill/enemyHpTxt/fightLog/choices/speaker/grain/btnNew/btnContinue/btnDeaths/worldCanvas)与 index.html 全部匹配;world2d.js:147 的 `#worldTop #worldLoc` 选择器也存在。
4. **敌人 id → 立绘映射 — 无问题。** Rust 地图敌人 id 为 e_f1_z1/e_h1/e_licker/e_f3_z2/e_f4_elite,恰好全部命中 world2d ENEMY_ICONS(24-30 行);zone3d enemyKind 对 5 个 fight ref 的归一全部正确,未知 ref 默认 zombie,有兜底。
5. **死亡淡出后 enemy=null 的引用安全 — 无问题。** zone3d.js:532 置 null 后,loop 的 `if (enemy && …)`(510)、enemyHitFx 的 `if (!enemy) return`(186)、onZoneUpdate 的 `if (enemy)`(554)都有守卫;`setData` 也先 `if (enemy) scene.remove(enemy)`(389)。
6. **camera/NaN 风险 — 无问题。** `yaw` 为模块级 `let yaw = 0`(zone3d.js:23)且 resetPlayer 每次 setData 重置为 0,不会 undefined;敌我距离 `distE > 2.2` 才做除法(513-517),distE=0 时跳过,无除零 NaN;camera aspect 有 `Math.max(1, …)` 保护(233-235)。
7. **raf 起停配对(正常流程)— 无问题。** world2d/zone3d 的 start/stop 均 `if (raf) …` 防重入,`loop` 内先 `raf = requestAnimationFrame(loop)` 再工作,stop 后取消的是上一帧句柄,成对成立。
8. **事件监听清理 — 无问题(常规路径)。** zone3d init 添加的 keydown/keyup/resize(311-312/245)在 dispose 全部移除(463-465);client.js/world2d 无窗口级重复监听。唯一例外是 Bug-01 的"两个监听器同时响应 Escape"这一**职责重叠**,非重复 addEventListener。
9. **常规键盘冲突 — 无问题。** zone 模式 worldActive=false,client.js 不分发 World2D.keydown;方向键 preventDefault 只有 zone3d 做;`window.ZoneActive` 门槛与 client setMode 同步一致。
10. **canvas 尺寸 — 无问题。** world2d.js:207-210 `cv.width = data.w*TILE`、`cv.height = data.h*TILE`(TILE=30),与契约 w*TILE/h*TILE 一致,并同步 CSS 尺寸。
11. **nearby 交互 — 无问题。** Rust nearby 条目含 `id`,world2d nearbyList 的曼哈顿过滤与 Rust `manhattan<=1` 口径一致(不含对角),client `worldInteract(n[0].id)` → api_world_interact 的 objId 路由(point/npc/zone/gate/portal)全部对得上(main.rs:224-282)。
12. **tiles 渲染与迷雾 — 无问题。** 逐行 `row[x]||"#"` 兜底;迷雾 `isExplored` 正确;出生地 reveal 半径 4(Rust world.rs:8),未探索格整体暗化与"仅画已探索对象"的设计一致。

---

## 四、总体结论

- **Bug 总数:10(严重 2 项 HIGH、6 项 MED、2 项 LOW);无问题项 12 项。**
- 结论:本次"剧本杀/传奇风 2D + 二游风 3D"重写后,**素材、字段契约、id 对齐、探索迷雾解析、立绘 fallback、raf 配对、NaN 防护等主体契约全部成立**,重写质量总体可靠。
- 建议**先修两处 HIGH**:
  1. Bug-05 玩家在 3D 战斗中死亡 → 必须把死亡卡片/退出流程接上(否则死亡即卡死/丢剧情);
  2. Bug-01 Escape 双触发 leaveZone(消除重复事件处理的竞态源头)。
- 再批量处理 MED:Bug-03/04(遭遇后不 return + 键位残留,二者联动,是"副本期间世界后台乱动"的根因)、Bug-06(HUD undefined 花屏,一行兜底可解)、Bug-07(WebGL 上下文泄漏,长时间游玩必现)、Bug-08(返回标题残留世界状态)。
- Bug-02/09/10 为低概率/低影响,可在同一次迭代顺手收掉。

---

## 五、修复回填记录(2026-08-27 会话内,10/10 已修复)

> 修复分布:子代理 B(tokenrhythm/deepseek-v4-flash-0731)完成 Bug-03/04/06/08,主线完成
> Bug-01/02/05/07/09/10;子代理 B 的产出已由主线逐项查盘复核(`grep` 修复点+`node --check`
> 语法校验三文件全部通过)。运行时复验(战斗死亡流程、Escape 退出、连续进出副本的内存表现)
> 在素材定稿后的 CDP 全流程测试阶段执行。

| # | 严重级 | 修复方式(文件:行为) | 状态 |
|---|---|---|---|
| Bug-01 | HIGH | `client.js:608` window keydown Escape 分支排除 zone 模式(`if (e.key === "Escape" && !zoneActive)`),退出只由 zone3d 的 `onExit` 单点负责 | ✅ |
| Bug-02 | MED | `client.js` 引入副本会话代际号 `zoneToken`(227 行声明):enterZone 取 `const token = ++zoneToken`(429),异步尾部两处 `if (token !== zoneToken) return`(473/480)作废在途初始化;leaveZone 首行 `zoneToken++`(487)。比「disposed 标志」更强:先 dispose 后 resolve 与先 resolve 后 dispose 两条竞态路径都被覆盖 | ✅ |
| Bug-03 | MED | `client.js:286-290` 遭遇分支改为 `enterZone(...); return;`——不再落到 `refreshNearby()`(291),副本期间世界渲染循环不会重启、服务端位置不会被后台刷新 | ✅ |
| Bug-04 | MED | `client.js:240` setMode 切出世界时 `World2D.stop(); World2D.clearKeys();`(world2d.js 增补 `clearKeys()`),消除残留键位驱动的后台 `api_world_move` | ✅ |
| Bug-05 | HIGH | `client.js:447-454` attack 回调补 `else if (r && r.dead)` 分支:释放 3D 副本(`Zone3D.dispose()`)、切 `setMode("story")`、显示「你倒下了……」、`r.view` 存在则 `handleView` 渲染死亡卡片(基因锁觉醒等),否则 `leaveZone()`——死亡不再卡死/丢剧情 | ✅ |
| Bug-06 | MED | `client.js:149-153` refreshHud 全部字段 `?? 0` / `?? "—"` 兜底,不再写 `NaN%`/`undefined` 进 UI | ✅ |
| Bug-07 | MED | `zone3d.js:467-489` dispose 全量释放:afterImages 逐一 `scene.remove+material.dispose`(try 包裹)、`scene.traverse` 释放全部 geometry/material/map、`renderer.dispose()` + `renderer.forceContextLoss()`、DOM 节点移除;`setData` 重建敌人前对旧 group 同样回收(422)——反复进出副本不再堆积 WebGL 上下文 | ✅ |
| Bug-08 | MED | `client.js:216` backToTitle 首行 `setMode("title")`(顺带 stop 两个引擎+清键位),并隐藏 worldView/zoneView——标题页不再残留世界交互与叠加显示 | ✅ |
| Bug-09 | LOW | `client.js:555-556` 删除被覆盖的第一段 btnContinue 处理器,仅保留一个,统一走 handleView | ✅ |
| Bug-10 | LOW | `zone3d.js:28` 预分配 `_camTarget` 模块级 Vector3,562-563 行 `_camTarget.set(...)` + `camera.position.lerp(_camTarget, 0.12)`,渲染循环不再每帧 `new THREE.Vector3` | ✅ |

**修复后契约回归**:`node --check` 通过(client.js/world2d.js/zone3d.js);zone3d.js 中 `new THREE.` 仅存于
init/builders 的一次性分配(69 处),loop(491-566)内无其他每帧分配;Zone3D 对外暴露
`{init,setData,start,stop,dispose,onZoneUpdate,keydown,keyup}` 未变,World2D 增补 `clearKeys`
为新增方法(对外契约超集,无破坏)。