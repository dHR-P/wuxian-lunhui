# 咒怨 BOSS 伽椰子立绘 · round5 放手重试日志 (r5)

> 产出方:咒怨 BOSS 伽椰子立绘放手重试 r5 素材子代理(角色:素材重生成专员;模型 tokenrhythm/deepseek-v4-flash-0731)
> 视觉质检:tokenrhythm/glm-5.3-flash(调用时模型名写 `glm-5.3-flash`,不带前缀;支持 read_image 本地读图 + API data URL base64)
> 项目根目录:`C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1`
> 生成管线:wan2.7-image via tokenrhythm `/v1/images/generations`,768x1024,0.2 元/张(预算不限,放手重试)
> 日期:round5

---

## 〇、步骤0:读参考与前置探测

**已读**:`tools/design/zhouyuan_assets.md`(v1~v4 全历败记录+口径修正)、`zhouyuan_assets_log_round4.md`(v4 细节)、`gen_zhouyuan_boss.py`、`gen_wan.py`(gen() 管线)、`run_wan_jiazi_v4.py`(v4 prompt 基底)、`qa_boss_v4.py`(round4 口径质检脚本,基底)、`tools/cutout_floodfill.py`(抠图管线 CLI)。

**权威设定(design/zhttty_universe/wuxian_kongbu/zhouyuan.md §9.1)**:
日式白衣和服(褴褛、下摆发黑)、黑长直发覆面露惨白半张脸与黑眼窝、四肢着地爬行姿态 + 头颈反折 90° 从肩膀后回望、指缝有黑发缠绕、身体略半透明、纯黑背景 + 惨绿描边 + 发尾羽化入黑。

**口径修正(round3 继承)**:①「绳索」判据作废——设计是「指缝黑发缠绕」非绳索;②「发尾羽化入纯黑」属设计意图,不算渐变/泛光缺陷;③ cut 透明背景为抠图正常结果。

**r5 目标**:预算完全解除。至少交付一个可部署候选。核心攻坚:①头颈反折 90° 回望(v1~v4 均画不出);②指缝黑发丝(非环绳);③黑发覆面。若反折始终失败,交付「四肢着地爬行+黑发覆面露半脸+指缝干净/细发丝+惨绿描边+纯黑底+贴底」的 glm PASS 降标稿。

**前置探测**:写 `probe_wan_image_input.py` 探测 tokenrhythm `/v1/images/generations` 是否支持参考图(image)输入——**结果 HTTP 400「未知字段」:端点不支持 image 参考输入**,只能用纯 prompt 多变体生成。(本步骤 0 次生成。)

---

## 一、R5 尝试轮与花费 汇总(即时追加)

| 变体 | 文件 | 生成轮次 | 花费(累计) | 首检 glm | 终检/判定 |
|---|---|---|---|---|---|
| r5a | `raw_zhouyuan/boss_jiazi_r5a.png` | 第 1 张 | +0.20 / 0.20 | **PASS** 全 1.0 | 倒塌:真四肢爬行;反折未达成(细节复核否) |
| r5b | `raw_zhouyuan/boss_jiazi_r5b.png` | 第 2 张 | +0.20 / 0.40 | PASS_DEGRADED | 半立/双腿姿态,备用 |
| r5c | `raw_zhouyuan/boss_jiazi_r5c.png` | 第 3 张 | +0.20 / 0.60 | FAIL | 身体现猫头鹰形异物,弃 |
| r5d | `raw_zhouyuan/boss_jiazi_r5d.png` | 第 4 张 | +0.20 / 0.80 | **PASS** 全 1.0 | 倒塌:爬行;反折否;数值边缘带22%偏亮 |
| r5e | `raw_zhouyuan/boss_jiazi_r5e.png` | 第 5 张 | +0.20 / 1.00 | PASS_DEGRADED | 跪坐(非爬行),备用 |
| r5f | `raw_zhouyuan/boss_jiazi_r5f.png` | 第 6 张 | +0.20 / 1.20 | PASS_DEGRADED | 反折攻坚仍失败,爬行/跪坐 |
| r5g | `raw_zhouyuan/boss_jiazi_r5g.png` | 第 7 张 | +0.20 / 1.40 | **PASS_DEGRADED 全1.0** | **主推降标稿**(真爬+覆面)→ 抠图 r5_cut |

### 首检原始 JSON(glm-5.3-flash,见 qa_r5_r5a/b/c/d.json)

**r5a**(--bonus):
```json
{"pass": true, "verdict": "PASS",
 "scores": {"object":1,"composition":1,"background":1,"integrity":1},
 "pose_reversed": true, "hair_face": true, "finger_hair": true,
 "defects": ["指缝发丝细,32px小图可能糊成暗点(非致命)"]}
```
**r5b**(标准档):
```json
{"pass": true, "verdict": "PASS_DEGRADED",
 "scores": {"object":1,"composition":1,"background":1,"integrity":1},
 "pose_reversed": false, "hair_face": true, "finger_hair": true,
 "defects": ["头未反折回望(降标,基础性无影响)","姿态为半立/双腿着地起始式"]}
```
**r5c**(--bonus):
```json
{"pass": false, "verdict": "FAIL",
 "scores": {"object":1,"composition":1,"background":1,"integrity":0},
 "pose_reversed": false, "hair_face": true, "finger_hair": false,
 "defects": ["背上出现一只猫头鹰/鹰形异物(违设定,带最基本)","指缝细发丝不可辨","头未反折","加分 1/3<2"]}
```
**r5d**(--bonus):
```json
{"pass": true, "verdict": "PASS",
 "scores": {"object":1,"composition":1,"background":1,"integrity":1},
 "pose_reversed": true, "hair_face": true, "finger_hair": true, "defects": []}
```

### 数值复核(nd_qc_r5.py)

| 文件 | corner_mean/max(近0=纯黑) | 主体亮像素占比 | 边缘带亮(>=180) | 顶/底边亮 | 透明区RGB>5 |
|---|---|---|---|---|---|
| r5a | 8.6 / 13.0 | 0.358 | **0.0000** | 0 / 0 | 0(不透明 raw) |
| r5d | 5.0 / 10.0 | 0.413 | **0.2202**(偏亮) | 0 / 0 | 0 |
| r5b | 5.6 / 13.0 | 0.371 | 0.0000 | 0 / 0 | 0 |
| r5c | 6.4 / 10.0 | 0.335 | 0.0000 | 0 / 0 | 0 |

> **r5a 数值全优**(纯黑背景、无白描边/无边带污染)。r5d 虽 glm PASS,但数值显示主体边缘带 22% 偏亮(可能主体贴侧边或含亮缘),故**候选优先 r5a**。r5b 无污染可用作降标后备。r5c 因浮现猫头鹰异物弃。

### 补充变体 r5e / r5f / r5g 首检 + 数值

| 变体 | 文件 | 生成 | 花费累计 | 首检 glm | 结论 |
|---|---|---|---|---|---|
| r5e | `raw_zhouyuan/boss_jiazi_r5e.png` | 5/7 | /1.00 | PASS_DEGRADED 全1.0 | 跪坐非爬行,备用 |
| r5f | `raw_zhouyuan/boss_jiazi_r5f.png` | 6/7 | /1.20 | PASS_DEGRADED 全1.0 | 反折攻坚仍失败(爬/跪),弃主推 |
| r5g | `raw_zhouyuan/boss_jiazi_r5g.png` | 7/7 | /1.40 | **PASS_DEGRADED 全1.0** | **主推降标稿**(见下) |
| r5_cut | `cutout_out/boss_jiazi_r5_cut.png` | — | /1.40 | **PASS_DEGRADED 全1.0** | **最终剪影** |

**r5g 首检 JSON**(qa_r5_r5g.json):
```json
{"pass":true,"verdict":"PASS_DEGRADED",
 "scores":{"object":1,"composition":1,"background":1,"integrity":1},
 "pose_reversed":false,"hair_face":true,"finger_hair":true,
 "defects":["头未反折(降标接受)","指缝发丝偏细,32px 可能不可辨(提示性)","剪影略粗壮"]}
```

### 关键洞察:反折姿态 v1~v4 无效 + r5 七张全无效 — 引擎无法落实「头颈反折 90°」

对 r5a / r5d / r5e / r5g 做**结构化细节复核**(pose_detail_r5.py),让 glm 具体描述头颈几何(不为讨好而判):

- **姿态**:r5a/r5d/r5g 均为**真·四肢着地爬行**(弓背、双掌着地、膝弯、脚在后);r5e 为跪坐。
- **头颈反折:全部 REVERSED=否**。每张头都在身体前方、低头看向地面方向(3/4 俯视角),无一张实现「从肩后/背后反折面向镜头」。glm 结构细节证伪了首检(加分档)的 `pose_reversed=true`(那是为 32px 场景放宽的过度慷慨判定)。
- **黑发覆面:部分不充分**。r5a/r5d 人脸大部分可见(仅两侧发丝遮沿),r5g 头发盖住大面积脸但**双眼黑眼窝仍可见**(≈半脸)。全二轮无一做到「仅一道惨白半脸」的极深覆面,但 r5g 达标度最高。
- **指缝**:细发丝(非环/绳)r5g 可辨但偏细;无一出现环/绳(本轮新增措辞有效,未再误成环绳)。
- **多余物**:r5c 现猫头鹰形异物弃;r5a/d/e/g 均**无多余物**。

---

## 三、抠图与数值复核(r5g → r5_cut)

命令(comfy-python 3.13.11 执行):
```
D:\AI_Tools\ComfyUI\python_embeded\python.exe tools\cutout_floodfill.py \
  tools\design\raw_zhouyuan\boss_jiazi_r5g.png \
  tools\design\cutout_out\boss_jiazi_r5_cut.png \
  16 --seal 2 --closing 1 --feather 2 --hole-channel 6 --hole-solid --zero-rgb
```
结果:`bg=(6,7,5)`(近纯黑),alpha<=5(透明) 55.5%,中段过渡 0.3%,不透明 44.1%,scipy 形态学可用。抠图费用 0 元。

**数值复核(cut,nd_qc_r5.py)**:corner_max=0(角全透明)、**trans_colored=0.0000(透明像素 RGB 全部=0,zero-rgb 生效、无杂色残留于透明区)**、**edge_band_bright(>=180)=0.0000(无白/亮描边环带污染,关键达标)**、顶/底边亮 0。

**cut 终检 glm(qa_r5_r5_cut.json)**:
```json
{"pass":true,"verdict":"PASS_DEGRADED",
 "scores":{"object":1,"composition":1,"background":1,"integrity":1},
 "pose_reversed":false,"hair_face":true,"finger_hair":true,
 "defects":["头未反折90°(降标,本轮接受)","指缝发丝偏细,32px 演染后可能不可辨(提示,非致命)"]}
```

**预览/小样**:`cutout_out/boss_jiazi_r5_preview.png`(768x1024 深灰底合成,便于查看边缘)、`cutout_out/boss_jiazi_r5_small.png`(36x48 竖版游戏内尺寸)。

---

## 四、R5 结论

### 达成项(glm PASS + 数值双证)
- **对象**:日式女怨灵,白衣和服褴褛下摆发黑、惨白脸+黑眼窝 ✓(object=1)
- **姿态**:**四肢着地爬行**(真·弓背四爬,r5g 结构复核确认)✓(composition=1)
- **黑发覆面**:头发盖住大面积脸,双眼黑眼窝可见(≈半脸,最接近设定的深度)✓(hair_face=true)
- **指缝**:细黑发丝缠绕,非环/绳(本轮措辞修复,未再误成环绳)✓(finger_hair=true)
- **惨绿描边 + 发尾羽化入黑 + 纯黑底** ✓(background=1)
- **贴底缘/全身完整/无裁切/无多余物** ✓(composition=1, EXTRA=无)
- **抠图**:透明区 RGB=0、0% 亮描边污染(cut 定稿数值达标)✓
- **降标判定**:PASS_DEGRADED(=可用降标稿,反折非必需)

### 放弃项(连续 v1~v4 + r5 七张,判定为引擎能力边界)
- **「头颈反折 90° 从肩后回望」:最终放弃**(v1~v4 + r5 结构化复核全 FAIL;wan2.7-image 无法画出颅骨 180° 回翻面向镜头的解剖姿态,反复强化措辞无效)。
- **极深覆面(仅一道惨白半脸)**:未达;多为发丝遮沿+双眼仍可见。已尽力,按「覆面露半脸」降标接受。

### 是否可供部署
**可部署(降标稿)**。`boss_jiazi_r5_cut.png`(透明 PNG,0 元抠图)8 项判定全达标(仅反折缺失 → PASS_DEGRADED)。**供主线验收**:部署到 `server-rs/ui/assets/img/enemy_kayako.png` 前请主线按流程验收通过后再落地(红线:本子代理不部署 server-rs;命名以主线为准,原文档建议 enemy_kayako.png,旧资产 boss_jiazi_cut_*.png 是否覆盖由主线定)。

---

## 五、成本汇总(R5)

| 项目 | 单价 | 数量 | 小计 |
|---|---|---|---|
| BOSS r5 raw 生成(wan2.7-image) | 0.2 元 | 7 张(r5a~g) | **+1.40 元** |
| 抠图(boss_jiazi_r5_cut) | 0 元 | 1 | 0.00 元 |
| 质检(glm-5.3-flash API) | 0 元 | 多次 | 0.00 元 |
| **R5 本轮新增** | | | **+1.40 元** |
| **累计(round4 1.80 + r5 1.40)** | | | **3.20 元** |

> 注:r5 预算不限,共烧 7 张 raw(1.40 元)终收敛出一张 PASS_DEGRADED 可部署降标稿。相对 v1~v4(1.80 元全 FAIL),r5 以 +1.40 元换得第一张可落地候选。

## 六、R5 生成/更新文件清单

- `raw_zhouyuan/boss_jiazi_r5a~g.png`(7 张 raw,候选)
- `cutout_out/boss_jiazi_r5_cut.png`(**最终剪影,768x1024 透明 PNG**)
- `cutout_out/boss_jiazi_r5_preview.png`(深灰底预览,768x1024)
- `cutout_out/boss_jiazi_r5_small.png`(游戏内小样,36x48)
- `tools/design/run_r5.py`(多变体生成器)、`probe_wan_image_input.py`(API 参考输入探测)、`qa_r5.py`(round5 口径 glm 质检)、`pose_detail_r5.py`(头颈姿态结构复核)、`nd_qc_r5.py`(数值复核)、`make_preview_r5.py`(预览/小样)
- `tools/design/zhouyuan_assets_log_round5.md`(本交付日志,R5 主文档)
- `qa_r5_r5{a,b,c,d,e,f,g,conf,cut}.json`、`pose_detail_r5{a,d,e,g}.txt`(GLM 原始判据)
- 未部署/未改动任何 server-rs/ui/assets/img 文件(红线遵守)。