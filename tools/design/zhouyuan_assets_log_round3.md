# 咒怨副本素材收尾 · round3 交付日志 (BOSS 伽椰子 定稿复核 v2 / 重生成 v3)

> 产出方:咒怨 BOSS 伽椰子立绘定稿子代理(角色:素材质检与重生成专员;模型 tokenrhythm/deepseek-v4-flash-0731)
> 检模型:tokenrhythm/qwen3.7-flash(调用时模型名写 `qwen3.7-flash`,不带 tokenrhythm/ 前缀)
> 项目根目录:`C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1`
> 日期:round3(按设计原文正确口径复核 v2 → 若 FAIL 重生成 v3 → 抠图 → 质检 → 定稿)
> 前置说明:round2 旧质检被判 FAIL,但旧质检口径有误:错误地把「黑发缠绕」当「绳索」判据、把「发尾羽化入纯黑(设计意图)」当「渐变/泛光」缺陷。本轮按 design §9.1 原文重新校准口径。

---

## 一、步骤1:权威设定确认与口径校准

### 1.1 权威设定(design/zhttty_universe/wuxian_kongbu/zhouyuan.md §9.1,唯一口径)
`enemy_kayako.png` 伽椰子本体(BOSS 与残影共用):
- 日式白衣和服(褴褛、下摆发黑);
- 黑长直发覆面、露出惨白半张脸与黑眼窝;
- **四肢着地爬行姿态,头颈反折 90° 从肩膀后回望**;
- 指尖过长、**指缝有黑发缠绕**;
- 身体略带半透明,剪影感强,脸部仅一处高光;
- **纯黑背景(便于抠图),全身氛围惨绿描边,立绘四周留黑发延伸羽化**。

### 1.2 口径校准(相对 round2 旧质检的关键修正)
1. **「绳索」判据作废**：设计原文是「指缝有**黑发缠绕**」——是黑发缠绕,不是绳索!设计中不存在「绳索」元素。旧质检 insistence 指出「画面无绳索」作为 integrity 缺陷属于加戏判据,**作废**。质检不得要求「绳索」,也不得以「无绳索」判 FAIL。
2. **「发尾羽化/渐变/泛光」判据纠正**：设计明确要求「立绘四周留**黑发延伸羽化**」,发尾自然延伸/羽化入纯黑是**设计意图**,不是「渐变/泛光」缺陷。判定 background 时**只检查**:底部无地面/无投影、整体为纯黑,发尾自然羽化入黑允许。
3. **姿态口径纠正**：正式设定是**四肢着地爬行 + 头颈反折 90° 回望**,不是「全身正面立姿」。构图判定允许爬行姿态下的「尾部/延伸肢体贴画面底缘」,重点是全身从头到尾可辨、主体居中、无明显肢体被大面积裁切。
4. **抠图 cut 图透明背景**：透明背景是抠图去背的正常结果,不算 background 缺陷(只评估保留主体区域本身)。

### 1.3 round3 判据定义(写进 qwen query)
- **object** 0-1:是否为日式女怨灵(白衣和服、黑发覆面、惨白脸、黑眼窝、手指细长)——是鬼,不是丧尸/人类战士;
- **composition** 0-1:全身完整从头到脚、主体居中放大、脚底(或爬行姿态的末端肢体)接触画面底缘(允许被底缘轻微裁切,但不得大面积缺脚/缺下半身);**不得要求绳索**;
- **background** 0-1:纯黑无地面无投影无渐变(发尾自然羽化入黑允许);cut 图透明背景是抠图正常结果,不算缺陷;
- **integrity** 0-1:指缝黑发缠绕可辨、手指未融合、无白描边、无多余物件。

### 1.4 关键文件与历史
- v1 raw:`raw_zhouyuan/boss_jiazi_raw.png`(1,223,859 B)— 旧判:脚未贴底/绳索结构混乱/手指融合,弃用。
- v2 raw:`raw_zhouyuan/boss_jiazi_raw2.png`(1,239,851 B,22:09)— 旧判 FAIL(措辞待复核)。
- v2 cut:`cutout_out/boss_jiazi_cut_v2.png`(632,321 B)— 旧判 FAIL(背景白色/透明为抠图正常结果,不算真缺陷;其余为 raw 继承缺陷)。
- 旧质检原始回复:`qa_boss_v2_results.json` / `qa_boss_v2_recheck.json`。

---

## 二、步骤2:v2 复核结果(qwen3.7-flash,round3 正确口径)

质检脚本:新增 `tools/design/qa_boss_v3.py`。query 中完整携带 §9.1 权威设定原文 + round3 判据定义,明示「指缝黑发缠绕(非绳索)」与「发尾羽化入黑为设计意图」两条校准。原始回复落盘见 `qa_boss_v3_raw2.json` / `qa_boss_v3_cutv2.json`。

### A) v2 raw(boss_jiazi_raw2.png,1,239,851 B)
```json
{
  "pass": false, "verdict": "FAIL",
  "scores": {"object": 0.6, "composition": 0.3, "background": 1.0, "integrity": 0.2},
  "defects": [
    "姿态严重不符:设定要求'头颈反折90°,从肩膀后回望',图中头部低垂向前,未反折",
    "特征缺失:设定要求'黑眼窝',图中眼睛被头发遮挡/闭合,无黑眼窝",
    "特征缺失:设定要求'指尖过长,指缝有黑发缠绕',图中手指长度正常,指缝无黑发缠绕",
    "构图不完整:右侧身体/腿部延伸出画面右边缘被裁切,未满足'全身完整'要求",
    "风格缺失:无'惨绿描边'、无'半透明/剪影感'、无'发尾羽化'效果"
  ]
}
```
> 说明:**background=1.0**(raw 背景确为纯黑,此前旧质检「头发灰蓝渐变」在本轮口径下发尾羽化/纯黑场景不再构成缺陷)。但**composition=0.3(右侧身体/腿部被右边缘裁切)** 与 **姿态错误(未头颈反折回望)**、**integrity=0.2(指缝无黑发缠绕)** 为真实缺陷,非口径造成。

### B) v2 cut(boss_jiazi_cut_v2.png,632,321 B)
```json
{
  "pass": false, "verdict": "FAIL",
  "scores": {"object": 0.7, "composition": 0.2, "background": 0.1, "integrity": 0.2},
  "defects": [
    "背景与氛围严重不符:设定要求纯黑背景、全身惨绿描边及发尾羽化,图中为白/透明背景,描边为黑/灰色,无惨绿描边与羽化效果",
    "姿态不符设定:设定要求'头颈反折 90°,从肩膀后回望',图中头部低垂向前,未反折",
    "细节缺失:设定要求'指缝有黑发缠绕'、'指尖过长'、'黑眼窝',图中指缝无黑发缠绕,手指长度正常,无黑眼窝特征",
    "构图裁切:右下角身体/下肢被裁切,未全身完整展示"
  ]
}
```
> 说明:cut 图 background=0.1 中「白/透明背景」为抠图去背正常结果(按口径不计),但扣分项主要是「无惨绿描边/无发尾羽化/姿态/构图」。真缺陷仍是**右下角身体/下肢被裁切 + 姿态错误 + 指缝细节缺失**(raw 继承)。另:本 v2 完全未表达「惨绿描边」氛围,与 §9.1 原文「全身氛围惨绿描边」不符。

### round3 复核结论
**v2 未双通过(FAIL)。** 在去掉旧质检两条加戏判据(绳索、把发尾羽化当渐变)后,v2 仍 FAIL——决定性真实缺陷:
1. **构图:右侧身体/腿部延伸出画面右边缘被裁切**,未满足全身完整从头到脚(与旧质检一致,非口径造成);
2. **姿态错误:v2 未实现「头颈反折 90° 从肩膀后回望」**(v2 prompt 未写该姿态);
3. **integrity:指缝无黑发缠绕、指尖不长、无黑眼窝**;
4. **氛围:无惨绿描边/半透明/发尾羽化**。

→ 按任务规定,继续 **步骤3:生成 v3**。

---

## 三、步骤3:v3 生成(仅当 v2 复核 FAIL)

**v2 复核 FAIL → 触发 v3 重生成。**
- 生成脚本:新增 `tools/design/run_wan_jiazi_v3.py`(import `gen_wan.gen()`;模型 wan2.7-image,768x1024)。
- prompt 要点(英文主写+中文补充):四股落地爬行 + 头颈反折90°回望;指尖过长+指缝黑发缠绕(**非绳索**);构图「entire body fully visible, nothing leaves the frame, subject 90%+ height, feet/hands touch the very bottom edge」,**严禁 "crop" 措辞**;背景「absolutely flat pure black, NO floor/ground/shadow/gradient/glow,发尾可自然羽化入黑」;风格「惨绿描边, NO white outline/rim light/halo」。
- 运行结果:输出 `raw_zhouyuan/boss_jiazi_raw3.png`(1,293,494 B),打印 `SAVED ... cost_cny=0.2`,**生成 OK**。费用 +0.2 元。

## 四、步骤4:v3 抠图 + 双质检

### 4.1 抠图
命令(comfy-python):
```
python tools\cutout_floodfill.py tools\design\raw_zhouyuan\boss_jiazi_raw3.png \
  tools\design\cutout_out\boss_jiazi_cut_v3.png 16 --seal 2 --closing 1 --feather 2 --hole-channel 6 --hole-solid --zero-rgb
```
结果:`boss_jiazi_cut_v3.png`(764,752 B),768x1024,bg=(6,6,5)(近纯黑),透明(alpha<=5) 40.8%,中段过渡 0.4%,不透明(>=250) 58.8%,scipy 可用。抠图费用 0 元。

### 4.2 v3 raw 质检(boss_jiazi_raw3.png)
qwen3.7-flash,round3 口径。原始回复见 `qa_boss_v3_raw3.json`。
```json
{
  "pass": false, "verdict": "FAIL",
  "scores": {"object": 0.2, "composition": 0.9, "background": 0.8, "integrity": 0.3},
  "defects": [
    "姿态严重不符：正式设定要求'头颈反折 90°，从肩膀后回望'，图中人物头部正常朝向前方/侧方，未进行反折动作，不符合伽椰子经典姿态",
    "指缝元素错误：正式设定明确'指缝有黑发缠绕（注意：是黑发缠绕，不是绳索！）'，图中手指上出现明显的黑色环状/绳索状物体（类似黑绳或手环），违反设定且属于多余物件",
    "头发覆盖不足：设定要求'黑长直发覆面，露出惨白半张脸'，图中头发主要垂在身体两侧，未覆盖面部，脸部露出过多",
    "背景光晕过强：虽然设定允许'全身氛围惨绿描边'，但绿色光晕/渐变范围过大，几乎包围全身，略显杂乱（该项属氛围判定，非致命）"
  ]
}
```
> 关键:composition=0.9 ——**v2 的「右侧身体/脚部被裁切」已修复**(全身完整、脚/手触底缘、居中放大)。剩余真实缺陷:**① 姿态未实现「头颈反折90°回望」(头面朝前);② 指缝出现黑色环/绳状物,非「黑发缠绕」;③ 黑发未覆面**。background=0.8 已接近达标(纯黑 + 惨绿描边氛围属设计意图)。

### 4.3 v3 cut 质检(boss_jiazi_cut_v3.png)
qwen3.7-flash,round3 口径。原始回复见 `qa_boss_v3_cutv3.json`。
```json
{
  "pass": false, "verdict": "FAIL",
  "scores": {"object": 0.6, "composition": 0.5, "background": 0.0, "integrity": 0.4},
  "defects": [
    "背景不符：设定要求纯黑背景，图中背景为白色（非纯黑且非透明）",
    "姿态严重不符：设定要求'头颈反折 90°,从肩膀后回望'，图中头部正常朝向，未反折",
    "指缝元素错误：设定明确要求'指缝有黑发缠绕(不是绳索)'，图中指缝出现明显的黑色绳索/环状物，违反设定",
    "风格不符：设定要求'身体略带半透明,剪影感强'，图中身体不透明且内部细节过多"
  ]
}
```
> 说明:cut 图 background=0.0 中「背景为白色」为抠图去背的正常结果(透明区在查看器显白,按口径不计真缺陷),但 cut 继承 raw 的**姿态未反折、指缝黑色环/绳状物**为真实缺陷。

### 4.4 round3 双图结论
**v3 未双通过(FAIL)。** 相比 v2 的重大进步:**构图已修复**(composition 0.9,裁切问题消除、脚/手触底缘、纯黑背景达标)。仍 FAIL 的真实缺陷(疑似 AI 对「四肢着地+头颈反折+指缝黑发缠绕」理解偏差):
1. **姿态**：头部正常朝前,未实现「头颈反折90°从肩膀后回望」(v3 prompt 虽写入,但生成模型未落实,或生成为侧面趴姿而非反折回望);
2. **指缝元素**：出现了黑色环/绳状物(类似绳/环/戒指),而设计要求是「指缝黑发缠绕」(多股黑发丝自然缠绕),被质检判为违反「非绳索」设定;
3. **头发覆面**：黑发多垂于两侧,未覆面遮挡大半张脸。
→ 记录缺陷与 v4 下一步建议(见步骤5),本轮**不建议部署**。

---

## 五、步骤5:定稿结论

**round3 定稿:** **不建议部署。** v2 复核 FAIL / v3 重生成后亦 FAIL,均未双通过,故本轮不把任何 BOSS 立绘作为定稿资产部署到 `server-rs/ui/assets/img/enemy_jiazi.png`(部署由主线统一验收执行,本子代理仅给建议)。

### v3 → v4 下一步建议(供后续生成轮)
1. **姿态强化**：prompt 用「head swung fully backward, face looking back over her own shoulder, neck bent 180/reversed 90°, face directed toward the camera」+ 中文「头颈反折90度面向镜头回望」;必要时配参考词 `exorcist head-turn pose` / `contortionist backward glance`,并强提示「NOT a normal forward-facing crawl」。
2. **指缝元素**：明确「loose strands of black hair naturally weaving between the splayed fingers, thin hair wisps, NOT rings, NOT ropes, NOT bracelets」+ 中文「指缝是细黑发丝缠绕,不是环、不是绳、不是手镯」;先小样验证 qwen 是否认可「黑发缠绕」可辨。
3. **头发覆面**：加「long black hair draping fully over the face from the crown, only half a pale face and the dark eye sockets visible」。
4. **生成流程**：v4 raw → 先 qwen raw PASS → 再抠图 → qwen cut PASS → 才可部署。可在一次生成内包含 2-3 张候选,择优质检。

## 六、成本

| 项目 | 单价 | 数量 | 小计 |
|---|---|---|---|
| 场景图 (wan2.7-image,round1) | 0.2 元 | 5 | 1.00 元 |
| BOSS v1 raw | 0.2 元 | 1 | 0.20 元 |
| BOSS v2 raw 重生成 | 0.2 元 | 1 | 0.20 元 |
| BOSS v3 raw 重生成(本轮) | 0.2 元 | 1 | **0.20 元** |
| BOSS 抠图(cut/cut_v2/cut_v3) | 0 元 | 3 | 0.00 元 |
| **round3 本轮增加** | | | **+0.20 元** |
| **累计(含 v3)** | | | **1.60 元** |

> 注:round2 已累计 1.40 元(v1+v2+抠图2次+场景5张);round3 新增 v3 raw 生成 0.2 元,抠图 0 元,质检(API)不计费。累计 1.60 元。

## 七、已生成/更新文件清单

- `tools/design/zhouyuan_assets_log_round3.md`(新增,本交付日志)
- `tools/design/raw_zhouyuan/boss_jiazi_raw3.png`(新增,v3 raw,1,293,494 B)
- `tools/design/cutout_out/boss_jiazi_cut_v3.png`(新增,v3 抠图,764,752 B)
- `tools/design/run_wan_jiazi_v3.py`(新增,v3 生成脚本)
- `tools/design/qa_boss_v3.py`(新增,round3 口径质检脚本)
- `tools/design/qa_boss_v3_raw2.json` / `qa_boss_v3_cutv2.json`(v2 复核原始回复)
- `tools/design/qa_boss_v3_raw3.json` / `qa_boss_v3_cutv3.json`(v3 质检原始回复)
- `tools/design/zhouyuan_assets.md`(更新:round3 定稿记录,见该文件)