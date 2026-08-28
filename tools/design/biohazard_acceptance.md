# 生化蜂巢素材验收核验日志

> 角色：素材终验专员（子代理）。模型：文字/脚本 = tokenrhythm/deepseek-v4-flash-0731；视觉核验 = qwen3.7-flash（data URL base64 传图）。
> 状态：**只做核验与建议，不执行部署**。部署由主线统一验收执行。
> 交付方式：每完成一步立即落盘，严禁攒到最后写。

---

## 1. 历史结论摘要（读 material_decision_log.md「wan 轮 5」段）

日期：2026/8/26~27 轮5 及收尾。

| 素材 | 历史结论 | 是否部署 |
|---|---|---|
| **pc_wan5（郑吒）** | raw ⚠️基本可（背景轻微暗角）；cutout ❌头顶黑发被误抠成洞/白块。**像素取证：raw 头顶 y0-120 几乎无 >lum30 内容（≈0%）**，cut alpha 与 raw 忠实一致，无可恢复头发像素。**属实 raw 构图/头发过淡（黑发与黑背景同层），非抠图 bug，cut 修补无法补 raw 缺失** | 未部署（线上 pc_zhengzha.png=606438B/20:48 旧版）|
| **hunter_wan3（撕裂者）** | raw 连续 3 次判「可发布」。唯一缺陷=左臂-躯干封闭黑背景空隙（`--hole-solid` 填实）。已用受限 bbox 手术掏空 → **hunter_wan3_cut_FINAL2.png**：透明 59.7%、主体单一大连通件(316985px)、空隙透明 53.2%、主体完整未损坏 | 未部署（线上 enemy_hunter=342256B 旧版）|
| **guard_wan3（守卫）** | round3 ✅下半身明亮不融黑、无白描边、背景纯黑、主体完整；cutout 透明底、无碎点、无白黑边、盾牌保留（仅脚留白偏大）。**已部署→enemy_guard.png(479991B/07:43)** | ✅已部署（旧版备份 wan4_deploy_backup/enemy_guard_prev_20260826_220559.png）|
| **zombie_wan2（丧尸）** | ❌致命：全身粗白描边照旧(约2-4px)，贴纸感，round3 zombie_wan3 亦有浅灰/浅蓝边缘光晕。wan2.7 引擎级顽固（3 代未根除）。线上 enemy_zombie=231566B(19:12) 为旧 Z-Image 版待评估 | 未部署 |

成本参考：wan2.7 生成 0.2 元/张；cut 修补 0 元。

### 待办（轮6，代码执行由主线验收）
- hunter：验收 hunter_wan3_cut_FINAL2.png（raw 3×通过）；接受臂-躯空隙透明即部署 enemy_hunter
- pc：接受头顶略淡可部署 pc_zhengzha；否则 raw 层重生成强化头发分离（预估 0.2 元）
- guard：已部署 enemy_guard.png（round3 合格）
- zombie：需 round3 重生成（预估 0.2 元/张）或接受现状

---

## 2. 质检记录

核验执行：qwen3.7-flash（tokenrhythm，baseURL https://tokenrhythm.studio/v1/chat/completions，data URL base64 传图，max_tokens=4000）。判据以正式设定为准。每张均给「游戏内小尺寸(32px)是否可接受」说明。

---

### 2.1 pc_zhengzha —— cut 候选（cutout_out/pc_wan5_cut.png = pc_wan5_cut_repair.png，字节级相同 354,963B）

> 注：`pc_wan5_cut_repair.png` 经 SHA-256 比对与 `pc_wan5_cut.png` **完全一致**（同一 hash）。证实历史结论「cut 修补无法补 raw 缺失头发」，repair 即为原 cut，无需单独复检。

**Qwen QC**

```json
{"pass":false,"verdict":"FAIL","scores":{"object":0.5,"composition":1.0,"background":1.0,"integrity":0.3},
 "defects":["头顶头发区域大面积镂空/发白(继承raw缺陷,头发过淡被抠除)","头顶白色区域有黑色碎点/噪点残留"]}
```
32px 说明：**不可接受**。头顶白色空洞在缩略图下仍表现为头顶缺失/白块，郑吒黑发特征完全丢失，严重破坏角色辨识。

裁决：
① **cut 确实继承 raw 缺陷**——头顶头发大面积镂空/发白，像素取证已证 raw 头顶 y0-120 无内容，属 raw 构图/头发过淡（黑发与黑背景同层），**非抠图 bug，cut 忠实还原 raw**。
② **32px 缩放下不可接受**（头顶白发白块，黑发辨识丢失）。
③ **裁决：需 raw 层重生成**（强化头发与背景分离，预估 0.2 元），或接受「头发略淡」降级方案（不推荐，因 32px 下头顶白块影响辨识）。

---

### 2.2 hunter（撕裂者）—— cut 候选（cutout_out/hunter_wan3_cut_FINAL2.png，674,067B，手术掏空版）

**Qwen QC**

```json
{"pass":false,"verdict":"FAIL","scores":{"object":0.8,"composition":0.9,"background":0.7,"integrity":0.5},
 "defects":["主体左侧(左胸/腋下区域)存在抠图过度导致的身体部分缺失/透明,肌肉块面不完整","左臂与躯干间空隙边缘不规则,侵入主体肌肉块面(左胸外侧)"]}
```
32px 说明：**不可接受**。左胸/腋下缺失在缩小后使主体像「烂了一块/残缺」，破坏「无皮肤肌肉怪兽」完整性。

裁决：
① 左臂-躯干空隙已透明化，但**手术掏空过度**：受限 bbox 掏空**误伤了主体左胸/腋下区域**（非仅空隙），肌肉块面不完整。
② 边缘存在侵入主体轮廓的残缺（非干净白/黑边，而是**主体自身缺失**）。Qwen 判 FAIL，与历史「主体单一大连通件未损」口径存在差异——**实检显示主体受损**。
③ **裁决：需修补/重做手术掏空**（收紧掏空 bbox 避开左胸外侧肌肉，或改回「黑块对黑底合成不可见」方案由产品定夺）。**不建议直接部署**。

---

### 2.3 guard（守卫）—— 已部署版（server-rs/ui/assets/img/enemy_guard.png，479,991B，round3 guard_wan3）

**Qwen QC**

```json
{"pass":true,"verdict":"PASS","scores":{"object":1.0,"composition":1.0,"background":1.0,"integrity":1.0},"defects":[]}
```
32px 说明：可接受。缩放下主体轮廓清晰，持盾/持棍动作与头盔面罩特征可辨，关键辨识度保留。

裁决：
① 下半身（白/受光战术裤）明亮不融黑 **合格**。
② 无白描边/浅色描边残留。
③ 无离体碎点、盾牌与短棍完整。
④ **验收通过**。**无需回退**到备份（wan4_deploy_backup/enemy_guard_prev_20260826_220559.png），维持现部署版。

---

### 2.4 zombie（丧尸）—— 候选 cut + raw + 线上旧版三向对比

**zombie_wan2_cut.png（cutout_out，508,983B）**

```json
{"pass":false,"verdict":"FAIL","scores":{"object":0.6,"composition":1.0,"background":0.3,"integrity":0.9},
 "defects":["存在明显的全身白色描边/轮廓线(约1-2px),环绕头部、四肢及躯干,强烈贴纸感,历史缺陷未根治","边缘不够干净,有白色像素残留/溢出"]}
```
32px 说明：**不可接受**。白描边在极小时占主体轮廓 1/8~1/4，细节丢失，退化为白贴纸轮廓。

**zombie_wan2.png（raw_enemy,1,265,767B）**

```json
{"pass":false,"verdict":"FAIL","scores":{"object":0.9,"composition":0.8,"background":0.2,"integrity":0.9},
 "defects":["主体周围存在极明显的白色粗描边,强烈贴纸感","主体与黑背景交界不自然","疑似生成伪影或已初步抠图(带白边)"]}
```
说明：主体本身画质高（object 0.9）、轮廓极清晰，但 **raw 层即带白边**（引擎级问题），直接重抠仍继承白边；**若要保留，可行路径=沿白边内侧重抠去边**（后期 matte edge）。

**enemy_zombie.png（线上旧版 Z-Image，231,566B）**

```json
{"pass":true,"verdict":"PASS","scores":{"object":1.0,"composition":1.0,"background":0.9,"integrity":1.0},
 "defects":["纯白实底背景","人物轮廓边缘存在轻微白色描边/光晕,轻微贴纸感(抠图痕迹)"]}
```
32px 说明：**可接受**。灰白头部、前倾踉跄人形轮廓、绿色破烂衣物、红血迹/破洞以色彩块清晰辨识，符合敌人素材辨识要求。

裁决：
① zombie_wan2 cut **白描边依旧（FAIL）**，raw 亦带白边，round3 方向仍未根治。
② **线上旧版质量合格（PASS）**，仅轻微白边/白底，32px 可辨识。
③ **裁决：现有线上旧版可用，无需 round3 重生成**（0 元，免额外成本）。仅当画面观感要求更高时，再考虑「沿白边内侧重抠去边」或专项生成（预估 0.2 元/张）。

---

## 3. 汇总裁决与建议部署清单

| 素材 | 目标文件 | 源文件 | 裁决 | 预估成本 | 备注 |
|---|---|---|---|---|---|
| **enemy_guard（守卫）** | server-rs/ui/assets/img/enemy_guard.png（现部署版） | round3 guard_wan3_cut（已部署 479,991B） | ✅ **可部署（验收通过，维持现状）** | 0 元 | 不回退；备份保留 |
| **enemy_hunter（撕裂者）** | server-rs/ui/assets/img/enemy_hunter.png（现 342,256B 旧版） | ~~hunter_wan3_cut_FINAL2.png~~ → **建议不用** | ⚠️ **需重做手术（不可直接部署）** | 0.2 元重抠（或 0 元改用黑块可见合成定夺） | 手术掏空伤及左胸主体；需收紧 bbox 重掏或产品定夺「黑块黑底合成」 |
| **pc_zhengzha（主角）** | server-rs/ui/assets/img/pc_zhengzha.png（现 606,438B 旧版） | ~~pc_wan5_cut / _repair~~（继承 raw 头顶空洞） | ⚠️ **需 raw 层重生成**（强化头发与背景分离）；或接受「头顶略淡」降级 | **0.2 元**（raw 重生成 + 重抠） | cut 忠实还原 raw 缺陷，修补无效 |
| **enemy_zombie（丧尸）** | server-rs/ui/assets/img/enemy_zombie.png（现 231,566B 线上旧版） | 线上旧版（Z-Image） | ✅ **可部署（维持现状，可用）** | 0 元（不重生成） | round3 候选仍白描边 FAIL；旧版 PASS |

**建议部署清单（供主线统一执行，本子代理不做部署）**
1. **guard**：无需操作，现 enemy_guard.png 验收通过。
2. **enemy_hunter**：暂不部署 `hunter_wan3_cut_FINAL2`（主体受损）；需①重做受限 bbox 手术掏空（避开左胸），或②产品接受「臂-躯黑块=黑底合成不可见」，或③回退用线上旧版。预估重抠成本约 0 元（脚本）或重生成 0.2 元。
3. **pc_zhengzha**：raw 层重生成（强化头发与背景分离）→ 重抠 → 过检后部署为 pc_zhengzha.png。预估 **0.2 元** + 抠图 0 元。
4. **enemy_zombie**：无需操作，现线上旧版可用。如需观感升级另议。

**成本预估合计**：**0.2 元（仅 pc raw 重生成）**；若 hunter 需重生成则 +0.2≈**0.4 元**。zombie/guard 0 元。

---

## 4. 附：核验备注
- pc repair 与 cut 字节相同（SHA 一致），仅按原 cut 质检。
- 质检所用 qwen 脚本：tools/design/qc_qwen.py（可复用）；判据文件 qc_*.json。