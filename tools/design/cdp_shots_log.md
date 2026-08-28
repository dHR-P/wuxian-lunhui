# CDP 3D 战斗截图日志（v4 · 严格遭遇路径）

> 记录时间：2026-08-27。脚本 `tools/shot_fight_3d.mjs`，复用 `gateway_check.mjs` 已验证的 CDP 启动（`WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9702`，WS 连 `page.webSocketDebuggerUrl`）。本次严格按「遭遇」正确路径驱动。

## 结论
**成功截到 zone3d 三人称 3D 战斗画面，6/6 张全为真 3D 战斗帧**，画面为生化副本 F1 层 BOSS 舔食者(Licker, 112HP)。每张 >1.1MB，`window.ZoneActive` 每张截图后皆为 true，副本会话全程保持 `zone.zone_id="e_licker"`，战斗未被打死（BOSS 血只扣到 63）。

## 实际进到的场景 / 状态
- 最终 `world_id = biohazard_ch1`，`floor = 1`（F1 展示名层索引），`scene_id = s_office`
- 副本会话 `zone = {"zone_id":"e_licker","kind":"fight","ref_id":"licker", ...}`；`last_action: attack`，`zhp:63`（只打了 2 轮攻击，血仍在）
- 每张截图后 `zone-active=true`，6 帧全部保持在 3D 战斗内

## 关键路径（正确做法，勿用 api_scene_goto 当 3D 触发）
`api_scene_goto({scene_id:'s_boss'})` 只会推进 Rust 状态并返回 `kind:"scene"`+`fight` 的**场景对话视图**，**不会触发前端 zone3d 三人称 3D 渲染**（zone3d 由前端 `enterZone()` 单独驱动）。

正确路径（读 `ui/js/client.js` 确认）：
**连续 `api_world_move {dx,dy}` 走向敌人所在格 → 踩上敌人格时返回 `r.encounter` → 前端 `enterZone` → `Zone3D.setData+start` 进入三人称 3D 战斗。**

## invoke / move 实际序列（截取关键段，完整见 tools/logs/shot_fight_3d.log）
1. 启动 exe + CDP，等 `document.readyState=complete`；前端函数 `move/interact/zone/zone3d` 均就绪。
2. 点 `#btnNew`（进入轮回）→ `enterWorld()` → `api_new`（world_id=biohazard_ch1, 初始 @1,1）。
3. `window.worldInteract('gw_biohazard')` → `api_world_interact({objId:'gw_biohazard'})` → 切生化蜂巢 F0/F1 入口层。
4. 切层到目标层（BOSS 在 floor:1）：连续 `api_world_move` 走到传送门并踩上切层——
   `move(1,0)`×27 到 (27,1)→`(27,2)`→`(27,3)` 最后 `move(0,1)` 回 `teleported→1层`，落点 `(2,2)`。
5. 在 floor:1 连续 `api_world_move` 逼近 (35,22)：`(1,2)→(1,8)→(6,10)→(12,21)→(25,21)→(34,22)` 各步 `encounter=none`；
   最后 `move(1,0)` → `(35,22)` 返回 **`encounter={"enemy_id":"e_licker","fight_id":"licker","name":"舔食者"}`**。
6. 撞到后前端 `enterZone(e_licker)` → `ok`，`zone3d-active=true`，`zone3dContainer` 有 1 个 WebGL canvas，标题「舔食者」。
7. 连拍 6 张（间隔 ~700ms），shot2/5 前派发 `j`(攻击/刀光)、shot4/6 前派发 `k`(闪避/残影)。

> 说明：手动调用原始 `api_world_move` 只更新后端/存档、不会自动渲染前端 3D；因此在拿到 `r.encounter` 后显式调前端 `enterZone(...)` 加载 same 敌人即可切到真 3D 镜头（等价于前端 `worldMove` 撞到敌人时的自动处理）。

## 每张截图字节数
| 文件 | 字节数 | 判定 | 触发动作 | zone-active |
|------|--------|------|----------|-------------|
| fight_1.png | 1183430 | OK（真 3D）| 对峙 | true |
| fight_2.png | 1266098 | OK（真 3D）| attack(j) 刀光 | true |
| fight_3.png | 1264806 | OK（真 3D）| 对峙 | true |
| fight_4.png | 1223544 | OK（真 3D）| dodge(k) 闪避残影 | true |
| fight_5.png | 1225623 | OK（真 3D）| attack(j) 刀光 | true |
| fight_6.png | 1315959 | OK（真 3D）| dodge(k) 闪避残影 | true |

全部 > 50KB 且 >1.1MB，每张截图后 zone-active 均为 true，确认 6/6 在真 3D 战斗画面中（画面内容经视觉子代理 glm-5.3-flash 复核为 3D 场景几何+人物模型+HUD「舔食者」）。

## 踩坑记录
- 曾用低血丧尸（`e_f1_z1` 34HP，floor:0 @7,6）——两次攻击即击杀，导致第 5~6 帧在攻击后退出 3D（zone-exit）。改打高血 BOSS `e_licker`(112HP, floor:1 @35,22)并与楼层切层配合，6 帧全程保持在 3D 战斗内。

## 结果
- **是否截到真 3D 战斗画面：是**（6/6，画面多样，机身位/血条数值变化体现动态战斗过程）。
- 截图存入 `tools/artifacts/shots/fight_1..6.png`。
- 复现脚本：`tools/shot_fight_3d.mjs`；完整 move/截图日志：`tools/logs/shot_fight_3d.log`。