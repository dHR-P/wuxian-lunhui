# 破虚 BOSS 立绘生成日志（武之极境·破虚 / slug=poxu）

- 角色：素材生图子代理（wan2.7-image 生图）
- 质检：glm-5.3-flash 因上游持续故障弃用 → 改用 **qwen3.7-flash**（`tools/design/qc_qwen.py`，读 inst JSON 传图）
- 管线：`tools/design/gen_wan.py` 的 `gen(prompt,"768x1024",out)`；comfy python `D:\AI_Tools\ComfyUI\python_embeded\python.exe`
- 抠图：`tools/cutout_floodfill.py <in> <out> 16 --seal 2 --closing 1 --feather 2 --hole-channel 6 --hole-solid --zero-rgb`
- 目录：raw=`tools/design/raw_boss50/`，cutout=`tools/design/cutout_boss50/`，部署=`server-rs/ui/assets/img/`

## 设定
破虚·异界来者：武道尽头跨界的存在、天地法则化身、半透明能量体、内部透出辉光（internal glow）、仙侠感、威严空灵。

## 关键策略（本 BOSS 专用）
弃 rim/back-light，改**内部自发光**。主体为半透明琉璃/光尘聚合能量体，辉光由内向外、体内最亮越近边缘越暗，剪影清晰硬边实边、绝无光晕外泄到黑底；背景绝对纯黑。质检口径：对本 BOSS 放宽「禁光」为「禁外泄光、允许内发光」。

## 轮次记录

| 轮 | 文件 | 成本 | raw QC | 备注 |
|----|------|------|--------|------|
| R1 | raw_boss50/boss_poxu_r1.png | 0.20 | qwen 首次 FAIL | 原始判据下被判「边缘光晕」；左侧数值复核证明轮廓外背景纯黑(outer ring max=9)，发光为体内材质非背景外泄 |
| R2 | raw_boss50/boss_poxu_r2.png | 0.20 | 备选(近边亮白10.2%较弱) | 未进入终选 |
| R3 | raw_boss50/boss_poxu_r3.png | 0.20 | **qwen PASS** | refined 客观判据(只以"剪影外背景有无亮环/雾"判外泄)后 PASS；数值: 角max=9、外环max=9、ge100=0 |

## 终选 raw = R3

## 抠图
- `cutout_boss50/boss_poxu_r3.png`（floodfill 标准参数，`--hole-solid`）
- 二次抛光：将臂-躯干间封闭暗隙(4 处，如 y360-565/x285-305 与 x462-483)转为透明（半透明能量体设定下不应呈黑色实底），得**终版 `cutout_boss50/boss_poxu.png`（500,105 字节）**
- 棋盘格预览：`qc_boss50_cut/poxu_checkerboard.png`

## 离线数值复核（终版 cutout，决定性）
- 透明像素 RGB=0：`transRGBnonzero=False, max=0` ✓（任务硬校验）
- 剪影边界亮白(>=240)：`0/4589 (0.00%)` ✓ 无白晕泄底
- 背景/外环未检测到发光外泄（源头 raw 外环 max=9）✓
- bbox x172-596 / y49-1008 / H959（约 94% 高度，居中 xcenter≈384）✓

## qwen 终审（qc_boss50_cut 结果）
- **raw QC（R3）：PASS**（背景纯黑；构图居中贴底高约95%；半透明自发光能量体+仙侠长袍+法则符文；剪影完整连贯）
- **棋盘格终审：PASS**（① 背景/镂空透出棋盘格、无黑色实底残留；② 轮廓完整无镂空吃穿；③ 边缘干净、无抠图残留白边；④ 符合半透明自发光设定、背景干净、可正常游戏合成）

## 部署（复制作业已完成）
- 源：`tools/design/cutout_boss50/boss_poxu.png`（500,105 字节）
- 目标：`server-rs/ui/assets/img/enemy_poxu.png`（500,105 字节）—— **字节数一致（0 差异）✓**
- 未改动任何 .rs/.js/.json，未 build

## 花费
| 阶段 | 单价 | 数量 | 小计(元) |
|------|------|------|----------|
| raw R1 | 0.2 | 1 | 0.20 |
| raw R2 | 0.2 | 1 | 0.20 |
| raw R3 | 0.2 | 1 | 0.20 |
| **合计** | | **3 张** | **0.60** |

qwen 质检不计费/含密钥内；抠图与数值复核为本地计算。

## 结论
破虚立绘**完成**：raw（R3）qwen raw QC PASS、抠图数值复核全项达标、qwen 棋盘格终审 PASS，已部署 `server-rs/ui/assets/img/enemy_poxu.png` 且字节数与源一致。