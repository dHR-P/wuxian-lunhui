# 地图伪 3D 渲染升级 · 实现日志

> 前端子代理「地图伪 3D 渲染升级」。模型 `tokenrhythm/deepseek-v4-flash-0731`。
> 范围：`server-rs/ui/js/world2d.js` + `server-rs/ui/js/zone3d.js`，不改 Rust、不动 index.html 结构、不动 client.js API 契约、未改 CSS。

## 需求回顾（用户原话）
「所有地图都要按照我说的伪 3D 来做。副本可以自由发挥，但至少要有一部分是 3D 的。」
即：世界地图 tile 全面升级伪 3D / 轴测 2.5D（三个世界共用同一渲染器）；副本（zone3d.js）至少一部分真 3D，已是则小幅增强，保持 Z 宇宙战斗观感一致；不破坏玩法，克制保 40×26 网格可读。

---

## 一、world2d.js —— 世界地图伪 3D / 2.5D（核心）

### 1. 新增伪 3D 参数块 + 通用工具
- 顶部新增 `P3D` 常量块（默认开启，注释声明仅画观感、不碰 walkable/碰撞）：
  - 光照方向 `light:{dx:-1,dy:-1}`（左上→右下）
  - 墙挤出高度 `wallEx:6`；侧面近顶/底端暗色 `sideHi/sideLo`（深色渐变）
  - 投影偏移 `shadowDX:2, shadowDY:5`、不透明度 `shadowAlpha:0.28`
  - 受光高光色 `glowHi`
- 新增通用工具函数：
  - `dropShadow(sx,sy,w,h)`：竖立物通用「向右下偏移半透明黑双层投影」
  - `topHighlight(sx,sy,w,h)`：左上受光渐变高光

### 2. 地板 tile —— 统一光照 + 底部阴影（烘焙进离屏缓存）
- 在 `buildTileCache()` 末尾，对三类地板（金属/走廊/警戒）统一叠加：
  - 顶部受光斜影渐变（左上亮→右下暗，左上光）
  - 底部 + 右侧内侧投影（右下微凹陷，营造面板厚度）
  - 左上高光线
- 烘焙进 `tileCache`，逐帧**零额外成本**；所有世界（蜂巢/主神/咒怨）共用该 cache，故三世界同时生效。

### 3. 墙 tile `#` —— 轴测挤出（改 `drawTile`）
把原来的平贴画法改为「顶面 + 侧面」两段 path / 多段 fillRect：
- **顶面**：墙纹理整体上移 `wallEx` 像素（受左上光，体现立体厚度），并叠左上棱线高光
- **右侧暗面**：竖向渐暗条纹（`sideHi→sideLo`）
- **底面/前面**：横向渐暗条纹，与右侧暗面叠成 L 型立体
- **底部投影**：向右下延伸到下/右邻格前景
- 所有世界同一 `drawTile`，天然统一生效。

### 4. 竖立物加 2px 投影 + 顶部高光（各类 draw 函数）
- 设备立柜 `I`：箱体前先 `dropShadow`，加右/下暗边 + 左/上高光厚度感
- 门禁 locked 铁门：门框前加半透明黑投影（增强厚度）
- 传送门：新增**发光门框**——`dropShadow` + `ctx.shadowBlur` 外发光环绕圆角矩形 + 左上顶棱高光，再叠加原有地面光环/旋转三步漩涡，标示能量门洞
- 3D 副本入口 `zone`：加 `dropShadow` + `topHighlight`（悬浮能量门）
- NPC 头像：底座前加右下圆形投影
- 敌人：立绘前加右下投影；兜底色块加**半透明红投影 + 本体高光**
- 玩家：强调投影（主导角色突出，向右下 + 双层），保留朝向光圈/方向箭头

### 5. 可读性与玩法保持
- `wallEx` 仅 6px（30px tile 的 20%），挤出克制、不遮挡交互点；投影都是半透明低不透明度。
- 仅改绘制路径/叠层，未改动任何 `data` 读写、`nearby/moveIntent/keydown`、碰撞（在 Rust 侧）。
- 新增 `clearKeys()` 导出：client.js 第 261 行 `setMode` 里早已调用 `World2D.clearKeys()`，但原模块未导出该方法（潜在运行时 `undefined is not a function`）；本次补齐导出以规避该隐患，属安全性小改，未改 client.js。

---

## 二、zone3d.js —— 3D 副本增强（原有已是完整 3D，锦上添花）

### 评估结论
现有副本**已是完整真 3D**：`scene` + `PerspectiveCamera` 第三人称跟随、地面 `PlaneGeometry`（带贴图+hive）、`AmbientLight` + `DirectionalLight`（castShadow, PCFSoftShadowMap）+ 冷暖两盏 `PointLight`、墙面/柱/铁箱/油桶/管线/血渍等低模装饰、`fog` 雾效、billboard sprite 敌人和玩家、攻击刀光/受击白闪/闪避残影。故「至少一部分是 3D」已满足，本次仅小幅增强氛围：

### 新增内容
- **氛围尘粒粒子系统** `makeDust(n)` + `P3D dust`：
  - `THREE.Points` 40 粒悬浮微尘（三等随机位置、`PointsMaterial` 半透明青白、`depthWrite:false`）
  - `init()` 中 `buildProps()` 后创建
  - `loop()` 每帧驱动：缓慢上浮回环 + 水平缓涡（读 `performance.now()`），渲染前执行
  - `dispose()` 中清理 geometry/material 并置 null（不泄漏）
- Z 宇宙所有副本走同一 `Zone3D.init`，故战斗副本观感天然一致。

---

## 三、未改动项
- **client.js**：零改动（仅补齐 world2d 的 `clearKeys` 导出以兼容其既有调用）
- **index.html**：零改动
- **css/style.css**：零改动（伪 3D 全部在 canvas 内绘制，无需 CSS）
- **Rust**：零改动

---

## 四、语法自检结果
`node --check` 两文件均通过：
- `server-rs/ui/js/world2d.js` → OK
- `server-rs/ui/js/zone3d.js` → OK

（本轮演进中曾出现 PowerShell 不支持 `&&` 的误报，改用 `$LASTEXITCODE` 判定，两文件均无语法错误。）

---

## 五、取舍 / 遗留风险
1. **墙挤出与邻接墙**：墙顶面上移会与其上方墙 tile 顶面略微叠压，形成统一的挤压浮雕感；暗面叠层在迷宫墙群中呈 L 型厚度，视觉可接受。若观感不满意，可调小 `P3D.wallEx`（4–6）。
2. **性能**：地板光照烘焙进缓存零逐帧成本；墙每格一次 `drawImage`+两次 `fillRect`+两次渐变，40×26≈1040 格，仍轻量可接受。门框用了 `ctx.shadowBlur`（约每传送门每帧一次），数量少，无压力。
3. **roundRect 兼容**：门框用 `ctx.roundRect ? … : ctx.rect` 兜底，老内核降级为直角框。
4. **未起游戏目测**：本环境仅做了语法自检 + 逻辑推演，未实际启动 exe 目测配色/观感；光影深浅、`wallEx` 大小属主观调参项，建议本机跑 `server-rs/target/release/wuxian-horror-ch1.exe` 实测后微调 `P3D` 常量。
5. **全流程固件**：nexus_flow / world_flow 测 DOM 与 API、不测像素，本次只改 canvas 绘制，不影响其断言，风险低。