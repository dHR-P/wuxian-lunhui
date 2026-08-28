# 体素方块人 · 每怪独立造型 / 配件系统 / 动画细化 / 精细度升级日志

- 文件：`server-rs/ui/js/zone3d.js`（仅改此文件；未动 client.js / index.html / Rust / assets）
- BOSS 识别：传入 `setData` 的原始 `data.ref`（`buildVoxelEnemy(g, kind, null, data.ref)`），
  `addVoxelAccessory` 内部 `resolveVoxelVariant(kind, refRaw)` 按 ref 特征命中 BOSS，再回退归一 kind。

---

## 0. 精细度升级（补充要求）

新增三块「尽量精细」强化，红线不变：交互契约不改、不引外部库、`node --check exit 0`。

### 0.1 体素段数升级：12 → 18~24 段

`buildVoxelBody` 重构，肢体加入分明关节层次（保肩/髋枢轴组语义，供动画枢轴寻址）：

- **颈**：`head`（头部枢轴 Group，upper 高 1.04）+ 颈部方块（可转头）。
- **臂**：肩枢轴 → 肩甲块 → 上臂 → **肘关节枢轴(elbowL/R)** → 前臂 → **拳头块**。
- **腿**：髋枢轴 → 大腿 → **膝关节枢轴(kneeL/R)** → 小腿 → **鞋块**。
- 新增 **肩甲块**（shoulder 材质，上层微倾）。
- 各可见段合计约 22 个方块（头+发+颈+胸+腰+肩甲×2+臂段×6+腿段×6=~22），符合 18–24 要求。
- `rig` 新增寻址：`head / elbowL/R / kneeL/R / baseLean`；`upper / armL/R / legL/R` 语义保留
  （配件系统与旧动画读肩髋枢轴仍可工作）。
- `baseLean` 记录 cfg.lean，`addVoxelAccessory` 的 extraLean 也并入 baseLean，
  供 animateRig 在 lean 基础上叠加攻击姿势（不被逐帧覆盖）。

### 0.2 全身纹理（不只脸）

新增 **`makeBodyTextureMap(kind, baseHex)`** + `BODY_TEX_CACHE` 缓存
（即要求的 `makeBodyTexture(kind)`；签名带 `baseHex` 以按肤色配色，功能完全等价）：

- 用 128×128 Canvas 按 kind 画布料/甲像素纹理 → `{shirt, pants, shoulder}` 三个 CanvasTexture
  （NearestFilter 保 MC 方块感，零异步）。
- 通用层：布面噪点基理 + 横向/纵向褶皱阴影 + 受光高光条。
- kind 专属：zombie/horde/licker=破衣烂肉+血污+破洞撕口；guard=制服甲片分隔线+胸徽+肩带；
  hunter=皮甲铆钉+拼接缝线+护板；player/默认=贴身衬衫胸前小纹+下摆阴影。
- 使用：`buildVoxelBody` 的 `shirtMat/pantsMat/shoulderMat` 走 bodyTex map；
  `buildVoxelEnemy` 传 `makeBodyTextureMap(ftxt, V.shirt)`（丧尸破衣/守卫制服/猎手皮甲），
  `buildVoxelPlayer` 传 `makeBodyTextureMap("player", 0x3a5ba0)`（蓝衣衬衫）。

### 0.3 更丰富动画（animateRig 细化，逐帧绝对赋值、旋转不累积）

- **行走**：前摆幅度>后摆（+0.14 探出），肘随摆屈伸，支撑腿膝盖微屈，身体左右微晃（负重感）。
- **攻击三段**（attack 单调 1→0，按值划分，手臂+身体协同）：
  段1 起手蓄力（上身后仰蓄势 + 右臂拉后高举 + 右肘屈 + 头偏）、
  段2 前挥（右臂大幅前探横扫 + 身体前送微倾 + 头随挥）、
  段3 收招（平滑回位归零）。
- **待机**：呼吸（upper 起伏 + 点头）+ 头部偶尔转头环顾。
- **受击**：躯干后仰（loop hurtLean 已有）+ 新增头甩动/回弹（`rig.head`）。
- **死亡**：保留倒地+下沉 + 新增四肢外张散架感（可选，`rig.arm/leg/elbow/knee` 向外张）。
- 特殊怪 idle 特征动画保留：tail 尾摆 / tent 触手蠕动 / wing 蝠翼扇动。

---

## 1. 配件系统设计

**`addVoxelAccessory(g, kind, cfg)`**，在 `buildVoxelBody` 通用段基础上按 BOSS/kind 追加体素方块：

- 挂点：`rig.upper`（U=上身枢轴，头/背/肩）、`rig.armL`/`rig.armR`（AL/AR=左右肩枢轴，手武器随臂摆）。
- 配件 schema：`{ A, w,h,d, c, x,y,z, glow?, rot?, anim? }`
  - `A`=挂点；`glow`=emissive 发光；`rot`=单轴角度；`anim`=`'tail'|'tent'|'wing'` 标记可动画配件。
- 动画配件包进枢轴 Group 写入 `rig.animParts`，供 animateRig 做 idle 特征动画。
- 每怪 +3~10 方块（顶点有界）；材质/几何随 enemy 组进入 dispose 遍历自动释放；零外部库。
- 未匹配 BOSS/kind 回退通用段（zombie/horde）。

`VOXEL_VARIANTS` 摘要：

| 键 | 结构亮点 |
|---|---|
| sanjiaotou | 大三角金属头盔（三层收窄+顶锥+面罩）+ AR 巨刀（柄+刃+尖） |
| yiy_queen | 加长后脑+后脑冠、内齿（上下颌+白牙）、尾刃（tail）、骨刺背×3 |
| brain_bug | 肥大脑体 + 脑顶发光（emissive）+ 触须×6（tent） |
| fulaidi | 宽檐帽 + AR 刀爪×3（烧伤脸纹理沿用） |
| tyrant | 巨汉(1.42) + 巨肩甲/巨胸甲 + 双肩触手（tent）+ 肩警示灯（glow） |
| barbossa | 骷髅白脸盖 + 双眼凄红（glow）+ 船长帽 + AR 弯刀 + 外套 |
| dragon | 双角 + 双翼（wing 根+膜）+ 长尾（tail）+ 四足（牛前足） |
| demon | 双角 + 蝠翼（wing）+ 尖尾（tail 亮刃）+ 额焰印（glow） |
| werewolf | 尖耳×2 + 狼吻 + 弓背毛领 + 双手爪×6（extraLean 弓背） |
| golem | 巨石胸/肩/腰 + 裂纹 + 头肩碎石 |
| tentacle | 肥体 + 发光主眼 + 触手×7（tent） |
| undead | 骷髅头盖 + 白颧骨 + 黑眼窝 + 骨手 + 破布披风 |
| guard/hunter/licker | 通用 kind 兜底：头盔 / 双手爪刃 / 长舌 |

## 2. 每怪独立造型清单（12 个独立 BOSS + 3 个 kind 兜底）

三角头 / 异形皇后 / 脑虫 / 弗莱迪 / 追踪者 / 巴博萨 / 龙 / 恶魔 / 狼人 / 石魔像 / 触手怪 / 亡灵骷髅；
加 guard（头盔）/ hunter（爪刃）/ licker（长舌）三种通用 kind 兜底。全部为结构差异（配件增删组合），非仅换 scale/lean。

## 3. 动画细化（enhance animateRig 更细）

详见 0.3：行走摆动更分明、攻击三段（蓄力蓄势→前挥→收招）、待机转头+呼吸、受击后仰+甩头、死亡倒地+四肢散架。

## 3.5 体型参数化（关键补充）

本次新增 **体型参数化**——不同体型由 `BODY_DIMS` 表的**每段方块 x/y/z 尺寸**决定（不只是整体 scale）：

- `buildVoxelBody` 加 `cfg.bodyType`，取 `BODY_DIMS[bodyType||"standard"]` 的 D 结构驱动 头/颈/腰/胸/上臂/前臂/拳/肩甲/大腿/小腿/鞋 各段方块尺寸与枢轴（脚底由 `legY/thigh/shin/shoe` 推导贴地 y≈0，头由 `chestPos/neckH/headH` 推导顶在胸上方）。
- 体型表（7 类）：
  - `standard` 标准人类（玩家/人类 BOSS）；
  - `tall_thin` 高瘦（猎手/修士/刺客）：躯干 y 长、四肢细长的窄条箱；
  - `short_stout` 矮胖（矮人/胖子）：躯干 x/z 宽扁、四肢短粗；
  - `giant` 巨汉（追踪者/巨魔/暴君/石魔像）：整体粗大、胸肩宽厚、大头大四肢；
  - `slender` 细长（触手怪/蛇）：躯干细长条、四肢最细；
  - `obese` 肥胖（脑虫/尸胖）：躯干最宽厚、头小、四肢短粗；
  - `beast` 野兽（龙/狼人/恶魔/异形皇后）：桶胸、头前伸(headFore=+0.10)、强力四肢、弓背。
- 每怪独立体型：`bodyTypeFor(kind, refRaw)` 按 BOSS ref → beast/obese/slender/giant/short_stout/tall_thin/standard，
  再按归一 kind 兜底（hunter=tall_thin、licker=slender、zombie=obese、guard/horde=standard）。
  BOSS 与配件 `variant.body` 字段一致（作为文档标记）。
- **头饰适配**：头饰（帽/角/耳/头盔/骷髅脸盖）配件从 `A:"U"`(upper 绝对坐标) 迁移到新增 `A:"H"`(rig.head 头部枢轴)，
  使头饰随头 pivot 且适配各体型不同头高（不再因换体型而漂移）。
- 方块尺寸差异肉眼可见：脑虫肥脑、触手怪细长、追踪者巨汉、龙/狼人弓背前探——非统一方块只调 scale。

### 3.5.1 各 BOSS 体型对照
| BOSS | bodyType | 尺寸特征 |
|---|---|---|
| 三角头 sanjiaotou | giant | 大头+巨刀 |
| 异形皇后 yiy_queen | beast | 桶胸+长后脑+尾刃+骨刺 |
| 脑虫 brain_bug | obese | 最宽躯干+小头+触须 |
| 弗莱迪 fulaidi | standard | 人类体型+宽檐帽+刀爪 |
| 追踪者 tyrant | giant | 巨汉粗大+触手 |
| 巴博萨 barbossa | standard | 人类+海盗帽+骷髅脸 |
| 龙 dragon | beast | 弓背前探+角翼尾 |
| 恶魔 demon | beast | 弓背前探+角翼尾 |
| 狼人 werewolf | beast | 弓背+尖耳狼吻+爪 |
| 石魔像 golem | giant | 宽巨石身+裂纹 |
| 触手怪 tentacle | slender | 细长条+长触手 |
| 亡灵 undead | standard | 骷髅头+骨手 |

## 4. 校验

- `node --check zone3d.js` → **exit 0**（通过）。
- 红线：`window.Zone3D` 对外方法、`onAction` 契约、`ENEMY_SPRITES`、`VOXEL_ENEMY/VOXEL_PLAYER` 开关均未改动。
- 未引入外部库；未 build。

## 5. 重新落盘记录（2026-08-28）

因前一次用 PowerShell `Get-Content`/`Set-Content`（系统 GBK 码页）读写了 UTF-8 源码，导致 `zone3d.js` 中文乱码被误删/损坏。
上游用 `git checkout` 恢复了「战斗特效对应装备体系」时点的干净版本（原 1853 行，node --check exit 0）。
本处已**基于恢复后的干净版本用 write/edit 工具（UTF-8 安全）重新套用三项精细化改动**：

1. 配件系统 `addVoxelAccessory` + `VOXEL_VARIANTS`（12 BOSS + guard/hunter/licker 兜底；头饰走 `H` 头枢轴锚点）。
2. 段数 18-24（颈/肘/膝/拳/鞋/肩甲）+ 全身纹理 `makeBodyTextureMap`（含 BODY_TEX_CACHE）+ 体型参数化 `BODY_DIMS`（7 类）+ `bodyTypeFor`。
3. 动画细化 `animateRig`（攻击三段 / 受击甩头 / 死亡散架 / tail·tent·wing idle）。

`buildVoxelEnemy(g, kind, tint, refRaw)` 增补 `refRaw` 参数并经 `setData` 传 `data.ref`；另补 `hexToRgba` 与 `makeFaceTexture`/`faceSkinHex`。**全程未用 PowerShell 文本往返改源码**。


