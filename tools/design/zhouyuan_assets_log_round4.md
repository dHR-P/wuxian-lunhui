# 咒怨副本素材收尾 · round4 交付日志 (BOSS 伽椰子 定稿 v4)

> 产出方:咒怨 BOSS 伽椰子立绘 v4 定稿子代理(角色:素材重生成专员;模型 tokenrhythm/deepseek-v4-flash-0731)
> 检模型:tokenrhythm/qwen3.7-flash(调用时模型名写 `qwen3.7-flash`,不带 tokenrhythm/ 前缀)
> 项目根目录:`C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1`
> 日期:round4
> 本轮目标:v3 构图已修复;专攻 v3 的三个残余缺陷(部分未完成,随进度即时追加)

---

## 一、步骤1:读参考

已读 `tools/design/zhouyuan_assets_log_round3.md`(v3 prompt 与质检 JSON)、`tools/design/run_wan_jiazi_v3.py`(v4 基底)、`tools/design/gen_wan.py`(gen())、`tools/design/qa_boss_v3.py`(round3 口径质检脚本,作为 v4 cut/raw 质检基底)。

### 1.1 v3 prompt 全文(抄录自 run_wan_jiazi_v3.py,作为对照区)

```
"A full-body Japanese female yurei (ghost) in the style of Kayako from Ju-on the grudge, "
"the BOSS of a horror dungeon. Design intent exactly as specified: "
"Pale near-white bloodless skin with dark hollow eye sockets, long straight black hair "
"hanging down completely covering her face, only half of a pale face and dark hollow "
"eyes visible through the hair. Wearing a torn dirty white kimono (ragged, lower hem "
"darkened black). CRAWLING on all four limbs, spider-like spread pose, spine bent "
"unnaturally, HEAD NECK REVERSED 90 DEGREES looking back at the viewer over her own "
"shoulder (head turned fully around). Fingertips excessively long, and wisps of black "
"hair wrapped/tangled between the splayed fingers (hair strands in the finger gaps, "
"NOT rope, NOT string). Body slightly translucent, strong silhouette, only a single "
"highlight on the face. Whole body faintly rimmed in a sickly pale-green/haunting green glow atmosphere. "
"Framing and composition: ENTIRE body fully visible from head to all four limb tips, "
"fully contained inside the frame, nothing leaves the frame, nothing cut off; "
"the subject occupies over 90% of the image height, centered and large; "
"the feet and hands/palms reach to and touch the very bottom edge of the frame, "
"the whole body fully inside the picture, all limbs present and clearly separated. "
"STYLE: horror illustration, full-body flat lone subject. "
"Background: ABSOLUTELY flat pure black, uniform matte jet black, completely dark, "
"NO floor, NO ground plane, NO ground shadow, NO floor reflection, NO light gradient, "
"NO haze, NO glow behind the body, nothing behind or below the ghost at all, "
"just the isolated figure against pure black (natural feathering of the hair tips into "
"the black void is allowed as part of the design). "
"NO white outline, NO rim light, NO halo on the figure. "
"no crop, no cropped, no truncation, fully in frame. "
"黑长直发覆面露惨白半张脸与黑眼窝, 白衣和服褴褛下摆发黑, 四肢着地爬行, "
"头颈反折90度从肩膀后回望, 指尖过长指缝黑发缠绕(不是绳索), 躯体略半透明剪影感强, "
"全身氛围惨绿描边, 立绘四周留黑发延伸羽化, "
"全身完整居中占画面高度90%+, 手与脚接触画面最底缘且全身完全在画面内, "
"背景绝对纯黑无地面无投影无渐变, 无白色描边无背光光晕, 绝不被画面裁切"
```

### 1.2 v3 质检 JSON 对照(round3 口径)

**v3 raw(raw3.png)**:
```json
{"pass": false, "verdict": "FAIL",
 "scores": {"object": 0.2, "composition": 0.9, "background": 0.8, "integrity": 0.3},
 "defects": ["姿态未实现'头颈反折90°回望'(头面朝前)", "指缝出现黑色环/绳状物(非'黑发缠绕',违反非绳索设定)", "黑发未覆面,脸露出过多", "惨绿描边略杂乱(氛围项)"]}
```

**v3 cut(cut_v3.png)**:
```json
{"pass": false, "verdict": "FAIL",
 "scores": {"object": 0.6, "composition": 0.5, "background": 0.0, "integrity": 0.4},
 "defects": ["背景白(抠图透明正常,不计真缺陷)", "姿态未反折", "指缝黑色绳索/环状物", "身体不透明内部细节过多"]}
```

### 1.3 v3 → v4 三个残余缺陷(本轮攻坚目标)
1. **姿态**:头颈未反折 90° 从肩膀后回望(头面朝前);
2. **指缝**:黑发缠绕被误生成成黑色环/绳状物(违反非绳索设定);
3. **覆面**:黑发未覆面,脸露出过多。

任务步骤已在第一步完成读取(后续随进度即时追加)。

---

## 二、步骤2:生成 v4 raw

**生成脚本**:新增 `tools/design/run_wan_jiazi_v4.py`(import `gen_wan.gen()`;模型 wan2.7-image,768x1024)。
**v4 prompt 全文**:见本日志上方「步骤1.1 v3 prompt 全文」下方 run_wan_jiazi_v4.py 内(PROMPT 变量)。本轮强化三点:
1. 姿态(核心):"THE HEAD IS REVERSED: the neck bent backward at an extreme 90-degree angle, the head turned fully backward to stare over her own shoulder directly at the viewer, an exorcist-style head-turn, a contortionist backward glance, her face looking back behind her while her body crawls forward — this is a backward-looking crawl, NOT a normal forward-facing pose" + 中文「头颈反折90度从肩膀后回望,面部面向镜头回望是逆转头瞻式爬行绝不是正常朝前姿态」。
2. 指缝:"THIN STRANDS of black hair loosely coiled and weaving through the finger gaps — fine hair wisps ... NOT rings, NOT ropes, NOT cords, NOT bracelets" + 中文「指缝有细黑发丝缠绕不是环不是绳不是手镯」。
3. 覆面:"long straight jet-black hair hanging fully over her FACE ... only half of a pale white face and her dark hollow eye sockets barely visible" + 中文「长直黑发从头顶大量盖住大半张脸仅露惨白半张脸与黑眼窝」。

**运行结果**(SAVED 输出):
```
SAVED C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1\tools\design\raw_zhouyuan\boss_jiazi_raw4.png (1228818 bytes) cost_cny=0.20000000
RESULT: OK
```
文件大小:`boss_jiazi_raw4.png` = **1,228,818 B**(768x1024)。费用 **+0.2 元**。**生成 OK**。

## 三、步骤3:质检 raw4

### 3.1 第 1 次质检(严格档,qa_boss_v4.py,专用 round4 判据)

**SAVED 输出** 见上;**首检判定 JSON**(原始回复见 `tools/design/qa_boss_v4_raw4.json`):
```json
{
  "pass": false, "verdict": "FAIL",
  "scores": {"object": 0.8, "composition": 0.8, "background": 0.8, "integrity": 0.1},
  "defects": [
    "姿态严重不符:设定要求'头颈反折90°,从肩膀后回望',图中头部正常朝向侧前方,未做反折回望动作,不达标",
    "细节缺失与多余物件:指缝无黑发缠绕,且手指下方出现类似绳索/细线的多余线条(非黑发丝)",
    "造型不符:头发未覆盖面部,而是自然垂落遮挡身体,仅露出半张脸",
    "羽化效果缺失:发尾未羽化入纯黑背景,而是呈现明显绿色光晕/描边",
    "身体质感不符:身体不透明,光影渲染较强"
  ]
}
```
> 说明:**composition=0.8、background=0.8、object=0.8 均接近达标**(构图全身完整/脚触底缘、纯黑背景)。集成/核心缺陷集中在**姿态未反折(头朝侧前)、指缝无黑发缠绕仍像绳索、黑发未覆面** —— 即为 v3 残余三大缺陷未根治,且均属「姿态/发丝细节」类,满足任务规定「缺陷仅是姿态角度不足或发丝细节」的**加分制重检条件**。故进入第 2 次质检(加分制:头颈反折/发丝缠绕/覆面三条至少 2 条达标即可 PASS)。

### 3.2 第 2 次质检(加分制,--relax)

**加分制判定 JSON**(原始回复见 `tools/design/qa_boss_v4_raw4_relax.json`):
```json
{
  "pass": false, "verdict": "FAIL",
  "scores": {"object": 0.6, "composition": 1.0, "background": 1.0, "integrity": 0.0},
  "defects": [
    "姿态严重不符:头部正常朝前/侧方,未反折回望,伽椰子核心特征缺失",
    "指缝元素错误:手指处可见明显黑色环状/线状物(似绳索或细线环),违背'不是绳索'设定",
    "面部特征不符:头发未覆盖面部(仅垂在两侧),露出大部分面部五官,不符合'覆面'",
    "加分项判定:①头颈反折(不达标);②指缝细黑发丝缠绕(不达标,为环/绳状);③黑发覆面露半脸(不达标,脸露太多)。达标数 0/3 < 2,integrity 无法通过加分制"
  ]
}
```
> 加分制下仍 FAIL:三条加分项(头颈反折 / 指缝黑发丝 / 覆面)**全部不达标(0/3 < 2)**。**composition=1.0、background=1.0 两项满分**(构图全身完整、脚/手触底缘、纯黑达标)。但 v3 三大残余缺陷在 v4 **均未根治**:
> ① **姿态**:头仍朝前/侧,未实现「头颈反折90°从肩膀后回望」,反复强化 prompt(exorcist head-turn/contortionist backward glance/中文强调)仍未让生成模型落实;
> ② **指缝**:仍出现「黑色环/线状物」(似绳索/细线圈),被质检按「非绳索设定」判违规,非「细黑发丝缠绕」;
> ③ **覆面**:黑发仍垂于两侧未覆面,脸露过多。

### 3.3 raw4 两次质检结论
**raw4 双 FAIL。** 两次质检均 FAIL(严格档 integrity=0.1,加分制 0/3<2)。相比 v3:**构图/背景已满分达标**(composition=1.0、background=1.0,强于 v3 的 0.9/0.8),但 v3 三大残余缺陷在 v4 **全部未根治**。按任务规定:
> 两次都 FAIL → 结论「**v4 未定稿**」,**跳过步骤4 抠图**(cut 质检仅在 raw 已通过的条件下才做),进入步骤5 汇报。

## 四、步骤4:抠图 SKIPPED(条件不满足)
因 raw4 两次质检均 FAIL,按任务「cut 质检仅在 raw 通过后做」的规定,**本轮不做抠图**(不生成 cut_v4)。抠图费用 0 元。

## 五、步骤5:定稿结论

**round4 定稿:** **不建议定稿 / 不建议部署。** v4 raw 两次质检均 FAIL(严格档 + 加分制),故不把任何 BOSS 立绘作为定稿资产部署到 `server-rs/ui/assets/img/enemy_jiazi.png`(部署由主线统一验收执行,本子代理仅给建议)。未做 v4 抠图。

### v4 → 下一步建议(供主线/后续轮决策)
连续四轮(v1/v2/v3/v4)该姿态无法被 wan2.7-image 稳定落实,APS 2 条博弈:
**A. 暂停烧钱(v4 已耗 0.2 元)**:停止继续生成 BOSS 立绘;
**B. 降标先部署**:接受「爬行 + 黑发覆面」近似稿(放弃「头颈反折90°回望」与「指缝黑发丝」这两个始终未落实的细节),生成一张「四肢着地爬行 + 黑长直发覆面露半脸 + 指缝无多余物件(去绳/环)」即可;若只是指缝黑发丝做不到,或可在 uix 层面用图层面板/后期抠掉指缝环绳,或直接接受极简剪影;
**C. 改构图思路**:先按「头颈反折」单独做特写参考再合成;或换用更明确的分步 prompt(先出「头部反折」再看整体),但成本 ~0.4 元/组合,需权衡。

> 注:round1 的 5 张场景图(scene_*_v1,已生成)不受影响,可由主线按既有流程独立先部署;BOSS 立绘暂停。

## 六、成本

| 项目 | 单价 | 数量 | 小计 |
|---|---|---|---|
| BOSS v4 raw 重生成(round4,本轮) | 0.2 元 | 1 | **+0.20 元** |
| BOSS v4 抠图 | 0 元 | 0 | 0.00 元 |
| 质检(API) | 0 元 | 2 次 | 0.00 元 |
| **round4 本轮增加** | | | **+0.20 元** |
| **累计(round3 1.60 + round4 0.20)** | | | **1.80 元** |

## 七、已生成/更新文件清单

- `tools/design/zhouyuan_assets_log_round4.md`(新增,本交付日志)
- `tools/design/run_wan_jiazi_v4.py`(新增,v4 生成脚本)
- `tools/design/qa_boss_v4.py`(新增,round4 口径质检脚本,支持 --relax 加分制)
- `tools/design/raw_zhouyuan/boss_jiazi_raw4.png`(新增,v4 raw,1,228,818 B)
- `tools/design/qa_boss_v4_raw4.json`(raw4 首检严格档原始回复)
- `tools/design/qa_boss_v4_raw4_relax.json`(raw4 二次加分制原始回复)
- `tools/design/zhouyuan_assets.md`(更新:round4 定稿记录,见该文件)
- 未生成:cut_v4(因 raw FAIL 跳过)、未部署 enemy_jiazi.png(仅供参考,主线验收)