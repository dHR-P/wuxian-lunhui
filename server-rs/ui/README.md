# server-rs/ui/ —— WebView 前端

前端三件（`client.js` / `world2d.js` / `zone3d.js`）+ 页面 + 素材。**前端只渲染 Rust 引擎返回的视图模型**；所有逻辑与状态权威在 Rust 侧。

> ⚠️ `DSH_BOOT` / `window.__DSH_BOOT__` 是设计约定的启动注入接口（本仓库 `ui/` 当前未直接读写该对象，只在 `client.js` 注释中声明「不改 DSH_BOOT 交互契约」），Tauri 场景下由 `window.__TAURI__.core.invoke` 驱动。改前端时切勿碰这个契约。

---

## 一、文件结构

```
server-rs/ui/
├── index.html              页面结构（stage/HUD/story/worldView/zoneView/cine/title 覆盖层）
├── css/style.css           样式（含 .resSel/.resBtn 分辨率档位选择）
├── vendor/three.min.js     Three.js（战斗 3D）
├── js/
│   ├── client.js           IPC 桥接 / 模式切换 / 打字机 / WebAudio 音效 / 分辨率系统
│   ├── world2d.js          2D 俯视体素地图引擎（Canvas + 迷雾开图）
│   └── zone3d.js           三人称 3D 体素战斗（Three.js）
└── assets/
    ├── audio/   98 条 .wav  配音 vo_* + 音效 sfx_* + BGM bgm_*
    ├── img/    128 张 .png  bg_* 副本背景 + img_* 剧情插图 + enemy_* 敌人立绘 + boss_* + 角色
    └── video/    9 条 .mp4  过场（vid_opening/vid_laser/vid_licker 等，MiniMax-H3 生成）
（另有 tools/design 工作区、vendor/ 三方库）
```

---

## 二、交互契约（对外 —— 勿改）

### window.World2D（2D 地图）

对外方法（契约）：`init(el, opts) / setData(data) / setPlayer(px,py) / keydown(e) / keyup(e) / start() / stop() / nearbyList() / moveIntent() / clearKeys()`，另新增 `setDpr(dpr)`（HiDPI）。

### window.Zone3D（3D 战斗）

对外方法（契约）：`init(container, opts) / setData(data) / start() / stop() / dispose() / onZoneUpdate(cb) / keydown(e) / keyup(e)`，另新增 `setResolution(level)`。`weaponStyle()` 把武器映射为 `gun/laser/magic/melee/unarmed` 决定攻击特效。

### 分辨率系统（新增可调用，别改别的契约）

- `window.setResolution(level)`：`level ∈ {720,1080,1440}`（非法忽略），返回当前档位
- `window.getResolution()`：返回当前档位（默认 1080）
- 档位 → 逻辑分辨率（CSS px）：720→1280×720、1080→1920×1080、1440→2560×1440；物理渲染 = 逻辑 × `devicePixelRatio`
- 下发链路 `ResolutionSys.apply()`：1) 噪点层 `grainResize()` 全分辨率；2) `World2D.setDpr(dpr)`；3) `Zone3D.setResolution(level)`；4) `window.__resUI(level)` 更新按钮高亮

### Tauri invoke（IPC 命令清单）

`client.js` 用 `window.__TAURI__.core.invoke` 调用 `server-rs/src/main.rs` 的命令，见 `server-rs/README.md` §二。命令集合：`api_new / api_continue / api_choose / api_nexus / api_nexus_enter / api_deaths / api_has_save / api_world / api_world_move / api_world_interact / api_zone_action / api_zone_exit / api_scene_goto / api_scene_back`。

---

## 三、client.js —— 编排中枢

- **模式**：`title（标题屏）→ world（2D 地图）↔ zone（3D 副本）↔ scene（剧情对话）`，由 `handleView(view)` 根据 view 元数据切换。
- **IPC 桥接**：`TAURI_INVOKE()` 取 invoke 函数；各按钮事件调对应 `api_*`。
- **渲染**：`showBg` 背景翻转（`#bgA/#bgB` 双图切换）、`refreshHud` 更新 HUD、`renderChoices`、打字机 `typewrite`、`skipType`。
- **音频**：`AudioSys`——`drone(mood)` 环境音、`heartbeat(on)` 低血心跳、`sfx(kind)`（laser/hit/…）WebAudio 实时合成，零外依赖。
- **World2D 接线**：`World2D.init($("worldCanvas"), {...})`；键盘 WASD/方向键 → `api_world_move`；`E` → `api_world_interact`；`ESC` → 返回。
- **Zone3D 接线**：地图遭遇/进副本 → `Zone3D.init` + `setData` + `start`；`J` 攻击 / `K` 闪避 / `WASD` 走位 → `api_zone_action`；`onZoneUpdate` 收战斗结果。
- **跨世界切换**：交互到 `portal_world` 网关 → 拉 `api_world` 重载当前世界地图。

---

## 四、world2d.js —— 2D 体素地图

- Canvas 绘制：`data`（六对象表数据）→ 地砖（金属/走廊地板 + AO 角遮蔽 + 3×3 网孔 + 拼缝）、玩家、敌人、调查点、NPC、门禁、传送门。
- 迷雾开图：`GameState.explored` 决定格子可见性，半透明云雾 + 底下层隐约可见。
- HiDPI：内部像素缓冲按最高格子分辨率渲染，显示尺寸 = 内部像素 / dpr。

---

## 五、zone3d.js —— 三人称 3D 体素战斗

- Three.js 场景：体素方块人 + 实时阴影（方向光 2048 / 暖补光投影）+ ACESFilmicToneMapping + 雾/点光氛围。
- 敌人用 `enemy_*.png` 立绘精灵（floodfill 抠图透明底），随距离缩放。
- 攻击特效按 `weaponStyle()` 映射 `gun/laser/magic/melee/unarmed`，对应命中/弹道/法术/近战表现。
- `setPixelRatio(dpr)` + `setSize` 保证 HiDPI / 跨屏拖动清晰。

---

## 六、素材清单（`assets/`）

| 目录 | 数量 | 内容 |
|------|------|------|
| `audio/` | 98 wav | 配音（`vo_*`：张杰/蕾恩/红后/郑吒等）、音效（`sfx_*`：激光/命中/心跳）、BGM（`bgm_nexus`/`bgm_horror_loop`/`bgm_battle`） |
| `img/` | 128 png | 副本背景 `bg_*`（27+ 副本）、剧情插图 `img_*`（办公室/列车/红后/激光等）、敌人立绘 `enemy_*`（12 敌人/8 普通）、BOSS `boss_*`、角色 `img_zhangjie/img_zhengzha/img_rain` 等 |
| `video/` | 9 mp4 | 开场 `vid_opening`、激光通道 `vid_laser`、舔食者登场 `vid_licker`、各副本过场（MiniMax-H3 生成） |

> 素材账目与判定见 `tools/design/material_decision_log.md`；分辨率/画质落地见 `tools/design/resolution_quality_log.md`。
