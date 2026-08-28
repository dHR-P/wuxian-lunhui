# 分辨率三档 + 画质提升落地日志（前端）

> 目标：支持 1440 / 1080 / 720 三档分辨率；16G 内存 + 8G 显存预算内激进提画质。
> 实测基准：游戏仅占 695MB 内存 + <200MB 显存，画质提升空间巨大。
> 红线：不改 Rust / assets 图片；不改交互契约（window.World2D / window.Zone3D 对外方法、Tauri invoke、DSH_BOOT 全不变）；不引外部库；`node --check` 三文件 exit 0。

## 1. 改动文件
| 文件 | 改动 |
|------|------|
| `server-rs/ui/js/client.js` | 新增 `ResolutionSys` + `window.setResolution/getResolution`；噪点层去 1/3 降采样改 DPR 全分辨率；分辨率选择 UI 接线 |
| `server-rs/ui/js/world2d.js` | 新增 `World2D.setDpr`；地图 HiDPI 显示缩放；地砖烘焙 AO 角遮蔽 + 更丰富地板材质 |
| `server-rs/ui/js/zone3d.js` | `renderer.setPixelRatio(dpr)`；resize 同步 DPR；ACESFilmicToneMapping；阴影升级（方向光 2048 + 边界收紧 + warm 点光投影） |
| `server-rs/ui/index.html` | 标题屏加「画质」档位选择 UI（720p / 1080p / 1440p 按钮） |
| `server-rs/ui/css/style.css` | `.resSel` / `.resBtn` 样式 |

## 2. 分辨率三档怎么实现
- 逻辑目标分辨率（CSS 像素）：
  - `720  -> 1280 × 720`
  - `1080 -> 1920 × 1080`
  - `1440 -> 2560 × 1440`
- 物理渲染分辨率 = 逻辑分辨率 × `devicePixelRatio`。
- 对外契约（新增、可调用）：
  - `window.setResolution(level)`：`level ∈ {720, 1080, 1440}`，非法值忽略。
  - `window.getResolution()`：返回当前档位（默认 1080）。
- 下发链路（`ResolutionSys.apply()`）：
  1. 噪点层 `grainResize()`：窗口全分辨率 × DPR（全屏覆盖层）。
  2. `World2D.setDpr(dpr)`：地图 canvas 按 DPR 显示。
  3. `Zone3D.setResolution(level)`：Three 渲染器重设 pixel ratio + size + camera.aspect。
  4. `window.__resUI(level)`：更新标题屏档位按钮高亮。
- 启动自动档位：`ResolutionSys.apply()` 在 `World2D.init` 之后调用，默认 1080p，随后 `__resUI` 同步高亮。

## 3. DPR / 去降采样
- **噪点层**：原 `cv.width = innerWidth/3; cv.height = innerHeight/3`（1/3 降采样，模糊）
  → 改为 `cv.width = round(innerWidth * dpr); cv.height = round(innerHeight * dpr)` 全分辨率 HiDPI。
- **2D 地图**：内部像素缓冲仍按地图格子最高分辨率（`data.w * TILE`）渲染不牺牲细节；
  显示尺寸改为 `内部像素 / dpr`（CSS），使高清屏每地图像素对应 dpr 个物理像素，配合
  `image-rendering: pixelated` 呈锐利放大。普通屏 dpr=1 时行为与原来完全一致。
- **3D 副本**：`renderer.setPixelRatio(window.devicePixelRatio || 1)`；`onResize` 中也同步 DPR
  （跨屏拖动 / 改档后仍清晰）；`renderer.setSize` + `camera.aspect` 更新逻辑保留并复用。

## 4. 加的画质特性清单（8G 显存预算内，无需降）
| 特性 | 位置 | 说明 |
|------|------|------|
| 方向光阴影 | zone3d.js | `dir.castShadow=true`（原有），mapSize 1024→**2048**，收紧 shadow.camera 边界(near/far/±16)，`bias=-0.0005` 消痤疮，PCFSoft |
| 暖补光投影 | zone3d.js | `warm.castShadow=true`，mapSize 512，`bias=-0.002`（体素人更立体） |
| 抗锯齿 | zone3d.js | `antialias:true`（原有保留） |
| ToneMapping | zone3d.js | `ACESFilmicToneMapping`，exposure 1.12（色彩收拢、电影感；渲染器较弱时属性不存在则跳过） |
| HiDPI | zone3d / world2d / client | `setPixelRatio` + 去降采样 |
| AO 角遮蔽伪影 | world2d 地砖缓存 | 每格右下两角叠 AO 三角渐变（烘焙离屏，零逐帧成本） |
| 地板材质丰富 | world2d 地砖缓存 | 金属地板加刮痕锈点、走廊地板加 3×3 细网孔阵、中线拼缝 |
| 投影/受光棱线 | world2d | 原 dropShadow / topHighlight / sideFront 机制保留并承接 AO 层 |

优先级达成：**阴影 ≥ DPR 高清 > ToneMapping**，且都做了。bloom 未做（见遗留）。

## 5. 接口保持清单（红线核验）
- `window.World2D`：新增 `setDpr`；原有 `init / setData / setPlayer / keydown / keyup / start / stop / nearbyList / moveIntent / clearKeys` 全部不变。
- `window.Zone3D`：新增 `setResolution`；原有 `init / setData / start / stop / dispose / onZoneUpdate / keydown / keyup` 全部不变。
- Tauri invoke / DSH_BOOT 读写：零改动。
- 无 Rust 改动、无 assets 图片改动、无外部库引入（只用内置 three.min.js 现有特性）。

## 6. 节点 check
```
node --check js/client.js   -> exit 0
node --check js/world2d.js  -> exit 0
node --check js/zone3d.js   -> exit 0
```
（未 build；前端改动待下次 build 生效。）

## 7. 遗留
- **bloom 未做**：three.min.js 内置无 post-processing bloom（import 全套 EffectComposer/BloomPass 需额外库，触及红线「不引外部库」），屏幕空间泛光需要后期管线。场景本身有雾 + 点光源氛围 + 阴影 + ToneMapping，已达成视觉目标；如需 bloom 可后续引入内置 UnrealBloomPass 版本单独评估。
- **体积光/体积雾未做**：three.min.js 传统 volume light 方案成本高且需外部 shader，现有 Fog + 点光已够氛围，未计入本次。