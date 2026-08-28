# 咒怨素材·生成清单与质检记录 (Z宇宙箱庭)

> 产出方:咒怨素材收尾子代理(模型 tokenrhythm/deepseek-v4-flash-0731)
> 阶段:素材生成(补)→ 抠图 → 质检 → 收尾汇总
> 依据:设计文档「日本凶宅雨夜」美术需求 + 伽椰子 BOSS 立绘
> 生成管线:
> - 场景图:wan2.7-image 768x1024,0.2 元/张,429 退避(由前置子代理完成,勿重生成)
> - 抠图:`tools/cutout_floodfill.py`(flood-fill 背景连通域抠图)
> - 质检:tokenrhythm/qwen3.7-flash 视觉质检(data URL base64,max_tokens 4000,429 退避 15s×5)
> 口径:BOSS 伽椰子 = 苍白长发和服女怨灵(日式恐怖);场景 = 日本凶宅雨夜(灰蓝/惨绿冷调)

---

## 一、资产清单

| # | slug | 文件 | 字节 | 生成时间 | 状态 |
|---|---|---|---|---|---|
| 1 | scene_house_exterior_v1 | `tools/design/raw_zhouyuan/scene_house_exterior_v1.png` | 1,553,566 | 21:45:53 | 已生成(待质检落定) |
| 2 | scene_corridor_v1 | `tools/design/raw_zhouyuan/scene_corridor_v1.png` | 1,373,521 | 21:46:29 | 已生成(待质检落定) |
| 3 | scene_room_v1 | `tools/design/raw_zhouyuan/scene_room_v1.png` | 1,450,227 | 21:46:54 | 已生成(待质检落定) |
| 4 | scene_attic_v1 | `tools/design/raw_zhouyuan/scene_attic_v1.png` | 1,506,448 | 21:47:29 | 已生成(待质检落定) |
| 5 | scene_battle_v1 | `tools/design/raw_zhouyuan/scene_battle_v1.png` | 1,537,344 | 21:47:49 | 已生成(待质检落定) |
| 6 | boss_jiazi_raw | `tools/design/raw_zhouyuan/boss_jiazi_raw.png` | 1,223,859 | 21:48:35 | v1 不合格(脚未贴底缘/手指绳索融合/落地投影非纯黑) |
| 7 | boss_jiazi_cut | `tools/design/cutout_out/boss_jiazi_cut.png` | 561,916 | 21:51:32 | v1 抠图(随 v1 raw,已弃用) |
| 8 | boss_jiazi_raw2 | `tools/design/raw_zhouyuan/boss_jiazi_raw2.png` | 1,239,851 | 22:09 | 已生成 v2(round3 正确口径复核:FAIL,右侧身体/脚部被裁切、姿态未反折、指缝无黑发缠绕) |
| 9 | boss_jiazi_cut_v2 | `tools/design/cutout_out/boss_jiazi_cut_v2.png` | 632,321 | 22:14 | 已抠图 v2(round3 复核:FAIL,同上 raw 缺陷) |
| 10 | boss_jiazi_raw3 | `tools/design/raw_zhouyuan/boss_jiazi_raw3.png` | 1,293,494 | round3 | 已生成 v3(round3 口径质检:FAIL,构图已修复但姿态未反折/指缝黑发缠绕误成环绳/黑发未覆面) |
| 11 | boss_jiazi_cut_v3 | `tools/design/cutout_out/boss_jiazi_cut_v3.png` | 764,752 | round3 | 已抠图 v3(round3 口径质检:FAIL,同 raw 缺陷) |
| 12 | boss_jiazi_raw4 | `tools/design/raw_zhouyuan/boss_jiazi_raw4.png` | 1,228,818 | round4 | 已生成 v4(round4 两次质检均 FAIL:构图/背景满分,但头颈未反折/指缝仍环绳/黑发未覆面) |

> 注:资产 6/7 为 v1(不合格,弃用),8/9 为 v2,10/11 为 v3,12 为 v4(round4,未定稿)。12 张中 8 张为「生成」资产,4 张(7/9/11)为抠图产出(round4 因 raw FAIL 未做抠图)。

---

## 二、BOSS 抠图记录

命令(comfy-python 执行):
```
D:\AI_Tools\ComfyUI\python_embeded\python.exe tools\cutout_floodfill.py \
  tools\design\raw_zhouyuan\boss_jiazi_raw.png \
  tools\design\cutout_out\boss_jiazi_cut.png \
  16 --seal 2 --closing 1 --feather 2 --hole-channel 6 --hole-solid --zero-rgb
```
说明:脚本实测无 `--T` 参数,`--T` 即阈值,映射为该脚本第 3 个位置参数(阈值);`--seal/--closing/--feather/--hole-channel/--hole-solid/--zero-rgb` 参数名一致。

结果:768x1024,背景参考色 bg=(11,12,10)(近纯黑),alpha<=5(透明/背景) 63.2%,中段过渡 0.5%,>=250(主体不透明) 36.3%,scipy 形态学可用。抠图费用:0 元。

**v2 抠图(boss_jiazi_cut_v2.png,round2)**
命令(comfy-python 执行):
```
D:\AI_Tools\ComfyUI\python_embeded\python.exe tools\cutout_floodfill.py \
  tools\design\raw_zhouyuan\boss_jiazi_raw2.png \
  tools\design\cutout_out\boss_jiazi_cut_v2.png \
  16 --seal 2 --closing 1 --feather 2 --hole-channel 6 --hole-solid --zero-rgb
```
结果:768x1024,背景参考色 bg=(6,7,5)(近纯黑),alpha<=5(透明/背景) 52.5%,中段过渡 0.0%,>=250(主体不透明) 47.5%,scipy 形态学可用。抠图费用:0 元。

> 抠图管线本身正常(背景连通域透明化干净、主体不透明占比提升、无中段毛边过渡)。但 raw 源图构图不合格(脚部被裁切、未贴底缘),抠图沿用该缺陷,故不解除 raw 的 FAIL。

**v3 抠图(boss_jiazi_cut_v3.png,round3)**
命令(comfy-python 执行):
```
D:\AI_Tools\ComfyUI\python_embeded\python.exe tools\cutout_floodfill.py \
  tools\design\raw_zhouyuan\boss_jiazi_raw3.png \
  tools\design\cutout_out\boss_jiazi_cut_v3.png \
  16 --seal 2 --closing 1 --feather 2 --hole-channel 6 --hole-solid --zero-rgb
```
结果:768x1024,背景参考色 bg=(6,6,5)(近纯黑),alpha<=5(透明/背景) 40.8%,中段过渡 0.4%,>=250(主体不透明) 58.8%,scipy 形态学可用。抠图费用:0 元。

> v3 raw 构图已修复(全身完整、脚/手触底缘),抠图正常;但 raw 仍 FAIL 在姿态未反折、指缝黑发缠绕误成环绳、黑发未覆面上,抠图沿用该缺陷,故 cut_v3 不解除 FAIL。

---

## 三、视觉质检判定 (qwen3.7-flash)

### v1 不合格原因摘要(boss_jiazi_raw / boss_jiazi_cut,见 qa_boss_raw.txt)
1. 背景违法:非均匀纯黑,人物下方有明显落地投影/地面环境感(违反「无投影/杂物」)。
2. 构图违法:脚底未贴近画面底缘(下方约 1/5 为黑色空白),头顶留黑过多,主体未充满画面高度。
3. 细节缺陷:双手手指缠绕的黑色绳索结构混乱,手指与绳索界线模糊、部分融合(AI 生成畸变)。

### v2 raw(boss_jiazi_raw2.png)round2 质检
质检模型:qwen3.7-flash(qwen3.7-flash 视觉接口),data URL base64,max_tokens 4000。命令与原始回复见 `tools/design/qa_boss_v2_results.json`、`qa_boss_v2_recheck.json`。
判定 JSON:
```json
{
  "pass": false, "verdict": "FAIL",
  "scores": {"object": 1.0, "composition": 0, "background": 1.0, "integrity": 0},
  "defects": [
    "构图缺陷:人物右侧身体及脚部延伸出画面外被裁切,未满足全身完整从头到脚的要求",
    "完整度缺陷:脚底未贴住画面底缘(脚部不可见)",
    "元素缺失:画面中未出现设定隐含的绳索元素,无法验证手指与绳索分离可辨"
  ]
}
```
复核(decided 确认,qa_boss_v2_recheck.json):composition=0、background=0(评测亦指出头发左侧有灰蓝色渐变/泛光伪影,不符合纯黑平面/无渐变),integrity=0。核心致命项:脚部/下半身被右侧与底边裁切、脚底未贴底缘——兼有主体边缘光晕伪影。**结论:FAIL(不合格)**。

### v2 cut(boss_jiazi_cut_v2.png)round2 质检
判定 JSON:
```json
{
  "pass": false, "verdict": "FAIL",
  "scores": {"object": 1.0, "composition": 0, "background": 0, "integrity": 0},
  "defects": [
    "背景不符合要求:设定要求纯黑背景,实际显示为白色/透明背景(抠图去背所致,属预期,不算致命;真缺陷是主体边缘残留)",
    "构图不完整:画面右侧严重截断,未显示完整下半身及脚部,不符'全身完整'及'脚底贴住画面底缘'",
    "存在渐变/泛光:头发呈蓝灰色渐变/泛光,不符'长黑发'及'无渐变/无泛光'",
    "缺失元素:图中未出现绳索,无法验证'手指和绳索分离可辨'"
  ]
}
```
> background=0 中「白色/透明背景」一项为抠图去背的正常结果(透明区在普通查看器中显白),并非真缺陷;但构图/完整度/头发光晕均为源 raw 继承的实质缺陷。**结论:FAIL**。

### round2 双图结论
v2 raw 与 v2 cut **双 FAIL**,未双通关。决定性缺陷均在源 raw:脚/下半身被右侧与底边裁切、脚底未贴画面底缘、头发边缘带灰蓝渐变/泛光伪影、无绳索元素(手指与绳索分离无法验证)。

---

### round3 正确口径复核(重要:校准旧质检两条加戏判据)

**口径修正说明(依据 design §9.1 原文,质检与生成均以此为准):**
1. **「绳索」判据作废**：设计原文是「指缝有**黑发缠绕**」——是黑发缠绕,不是绳索,设计中**不存在绳索元素**。旧质检把「画面无绳索」作为 integrity 缺陷属**加戏**,作废;质检不得要求绳索、也不得以「无绳索」判 FAIL。
2. **「发尾羽化」属设计意图**：设计明确「立绘四周留**黑发延伸羽化**」,发尾自然延伸/羽化入纯黑是设计意图,不算「渐变/泛光」缺陷。判定 background 只查:底部无地面/无投影/整体为纯黑。
3. **正式姿态**：四肢着地爬行 + **头颈反折 90° 从肩膀后回望**(非正面立姿);cut 图透明背景为抠图正常结果,不计 background 缺陷。

**round3 质检(qwen3.7-flash,脚本 `qa_boss_v3.py`,query 携带 §9.1 原文 + 上述判据)**

**v2 raw 复核(boss_jiazi_raw2.png):**
```json
{"pass": false, "verdict": "FAIL",
 "scores": {"object": 0.6, "composition": 0.3, "background": 1.0, "integrity": 0.2},
 "defects": ["姿态严重不符(未头颈反折回望)", "无黑眼窝", "指尖不长/指缝无黑发缠绕", "右侧身体/腿部延伸出画面被裁切", "无惨绿描边/半透明/发尾羽化"]}
```
**v2 cut 复核(boss_jiazi_cut_v2.png):**
```json
{"pass": false, "verdict": "FAIL",
 "scores": {"object": 0.7, "composition": 0.2, "background": 0.1, "integrity": 0.2},
 "defects": ["姿态未反折", "指缝无黑发缠绕", "右下角身体/肢被裁切", "无惨绿描边/羽化"]}
```
> v2 raw background=1.0(纯黑达标,「头发灰蓝渐变」旧判据不再成立);但 **composition=0.3(右侧身体/腿被右边缘裁切)** 与姿态、integrity 为真实缺陷 → **v2 仍 FAIL,未双通过**。

**v3 raw 质检(boss_jiazi_raw3.png):**
```json
{"pass": false, "verdict": "FAIL",
 "scores": {"object": 0.2, "composition": 0.9, "background": 0.8, "integrity": 0.3},
 "defects": ["姿态未实现'头颈反折90°回望'(头面朝前)", "指缝出现黑色环/绳状物(非'黑发缠绕',违反非绳索设定)", "黑发未覆面,脸露出过多", "惨绿描边范围略大(氛围项,非致命)"]}
```
> 进步:composition=0.9,**v2 的右侧裁切已修复**(全身完整、脚/手触底缘居中)。剩余真实缺陷:姿态未反折、指缝黑发缠绕误成环绳、黑发未覆面。

**v3 cut 质检(boss_jiazi_cut_v3.png):**
```json
{"pass": false, "verdict": "FAIL",
 "scores": {"object": 0.6, "composition": 0.5, "background": 0.0, "integrity": 0.4},
 "defects": ["背景白(抠图透明正常结果,不计真缺陷)", "姿态未反折", "指缝黑色绳索/环状物,违反设定", "身体不透明内部细节过多"]}
```
> cut 继承 raw 姿态未反折、指缝黑色环绳状物缺陷。

### round3 双图结论
**v2 复核 FAIL、v3 生成后亦 FAIL,均未双通过。** 决定性真实缺陷(与旧口径的绳索/发尾判据无关):
- v2:右侧身体/脚部被裁切(构图FAIL)、姿态未反折、指缝无黑发缠绕。
- v3:构图已修复(0.9),但**姿态未实现「头颈反折90°回望」、指缝黑发缠绕被生成成了黑色环/绳状物(违反非绳索设定)、黑发未覆面** → 仍 FAIL。
- 抠图管线本身正常(cut_v2/cut_v3 均干净无毛边)。

### round4 质检(boss_jiazi_raw4.png)

**v4 raw 首检(严格档,qa_boss_v4.py,qa_boss_v4_raw4.json):**
```json
{"pass": false, "verdict": "FAIL",
 "scores": {"object": 0.8, "composition": 0.8, "background": 0.8, "integrity": 0.1},
 "defects": ["头颈未反折(头朝侧前)", "指缝无黑发缠绕仍似绳索/细线", "黑发未覆面仅露半脸", "发尾未羽化呈绿光晕", "身体不透明"]}
```

**v4 raw 二次质检(加分制,--relax,qa_boss_v4_raw4_relax.json):**
```json
{"pass": false, "verdict": "FAIL",
 "scores": {"object": 0.6, "composition": 1.0, "background": 1.0, "integrity": 0.0},
 "defects": ["头颈未反折(伽椰子核心缺失)", "指缝黑色环/线状物(非黑发丝,违反非绳索)", "黑发未覆面脸露过多", "加分项 0/3<2(反折/发丝/覆面全不达标)"]}
```

### round4 双图结论
**v4 两次质检均 FAIL(未定稿)。** 相比 v3:**构图/背景满分达标**(composition=1.0、background=1.0,强于 v3 的 0.9/0.8);但 v3 三大残余缺陷在 v4 **全部未根治**:① 头颈未实现「反折90°从肩后回望」(反复强化 prompt 无效);② 指缝仍被生成成黑色环/线状物(非细黑发丝);③ 黑发未覆面脸露过多。因 raw FAIL,**跳过抠图**(不生成 cut_v4)。

---

## 四、不合格图修正记录 (若发生)

**v1 → v2 修正(w2 重生成,22:09):**
- v1 缺陷:脚底未贴底缘、手指绳索融合、落地投影非纯黑。
- v2 重生成目标:全身完整、脚底贴住画面底缘、纯黑背景无投影、手指绳索分离。
- 结果:**v2 仍未达标**。毛病转移/残留:脚部与右侧身体被画面边缘裁切(脚底仍不可见/未贴底缘),头发左侧边缘出现灰蓝渐变/泛光伪影,画面无绳索元素。抠图管线本身正常(bg=(6,7,5),透明 52.5%/不透明 47.5%,无毛边),但源 raw 构图不合格导致抠图沿用 FAIL。

**下一步建议(v3,若执行):** 生成时明确要求「全身正面立姿、脚部完整进入画面底缘、纯黑平面背景、头发纯黑无光晕渐变、白和服无污渍、手指与绳索分离可辨、无白描边/无泛光」。生成后先质检 raw,过关再抠图,避免对不合格源图做无谓抠图。

---

### v2 → v3 修正 + 口径修正(round3)
**v2 → v3 修正(v3 raw,round3,gen 提示词按设计原文重新校准):**
- v2 缺陷(round3 口径):右侧身体/脚部被右边缘裁切、姿态未实现「头颈反折90°回望」、指缝无黑发缠绕、无惨绿描边氛围。
- v3 重生成目标:四肢着地爬行 + 头颈反折90°回望;指尖过长指缝黑发缠绕(非绳索);全身完整手/脚触底缘;纯黑背景 + 惨绿描边 + 发尾羽化;严禁以底部边缘裁切措辞避免诱发截断。
- 结果:**v3 构图已修复**(composition 0.9,裁切消除、脚/手触底缘、纯黑达标),但仍 FAIL:① 姿态未反折(头面朝前,未实现从肩后回望);② 指缝黑发缠绕被生成成黑色环/绳状物,违反「非绳索」设定;③ 黑发未覆面,脸露出过多。
- 抠图管线正常(cut_v3: bg=(6,6,5),透明 40.8%/不透明 58.8%,无毛边)。

**口径修正说明(重要,影响判据):**
按 design §9.1 原文,**「绳索」判据作废**(设计是「指缝黑发缠绕」,无绳索元素);**「发尾羽化入黑」属设计意图**,不算渐变/泛光缺陷。旧 round2 质检以「无绳索」「发尾渐变/泛光」作为 FAIL 依据属于加戏,本轮已按正确口径复核(v2/v3 的 FAIL 均成立在于真实构图/姿态/指缝 defects,与上述两条无关)。

---

## 五、成本汇总

| 项目 | 单价 | 数量 | 小计 |
|---|---|---|---|
| 场景图 (wan2.7-image) | 0.2 元 | 5 | 1.00 元 |
| BOSS v1 raw (wan2.7-image) | 0.2 元 | 1 | 0.20 元 |
| BOSS v2 raw 重生成 (wan2.7-image) | 0.2 元 | 1 | 0.20 元 |
| BOSS v3 raw 重生成 (wan2.7-image) | 0.2 元 | 1 | 0.20 元 |
| BOSS v4 raw 重生成 (wan2.7-image) | 0.2 元 | 1 | 0.20 元 |
| BOSS 抠图 (cut / cut_v2 / cut_v3) | 0 元 | 3 | 0.00 元 |
| **合计(round4 已发生)** | | | **1.80 元(含 v4 重生成)** |

---

## 六、结论与建议部署清单

### round2 结论(旧口径,评述)
**v2 未双通过(是 FAIL)。** 旧 round2 以「无绳索」「发尾渐变/泛光」为 FAIL 依据,其中两条为加戏判据(见下 round3)。但 v2 的**构图缺陷(脚/下半身被右侧与底边裁切)是真实缺陷**,与口径无关,故 v2 确实不合格。

### round3 结论(正确口径)
**v2 复核 FAIL;重生成 v3 亦 FAIL,均未双通过。** 决定性真实缺陷(与绳索/发尾两条无关):
- **v2**:右侧身体/脚部被右边缘裁切(构图 FAIL)、姿态未实现头颈反折回望、指缝无黑发缠绕。
- **v3**:构图已修复(composition 0.9,全身完整、脚/手触底缘、纯黑达标),但仍 FAIL —— **头颈未反折90°回望(头面朝前)、指缝黑发缠绕被误生成成黑色环/绳状物(违反非绳索设定)、黑发未覆面脸露出过多**。

### round4 结论
**v4 两次质检均 FAIL,未定稿、不建议部署。** 构图/背景已满分达标(composition 1.0 / background 1.0),但 v3 三大残余缺陷(头颈未反折、指缝误成环绳、黑发未覆面)在 v4 全部未根治(加分制 0/3<2)。连续四轮该「头颈反折90°回望」姿态均无法被 wan2.7-image 落实。

### 建议部署清单(本批**不部署 BOSS 立绘**)
- **BOSS 立绘 enemy_jiazi.png:本轮不部署**(v1→v4 全部 FAIL,未产生可验收定稿)。部署由主线统一验收执行。
- **下一步建议(主线决策)**:
  - **A. 暂停烧钱**:停止继续生成 BOSS 立绘(v4 已耗 0.2 元);
  - **B. 降标先部署**:接受「四肢着地爬行 + 黑长直发覆面露半脸 + 无指缝多余绳/环」近似稿,放弃始终未落实的「头颈反折90°回望」与「指缝黑发丝」两个细节;或后期用图层工具抠掉指缝环绳、接受极简剪影;
  - **C. 改生成思路**:先单独出「头颈反折」特写参考再合成,或分步 prompt(成本 ~0.4 元/组合)。
- **场景图 5 张(scene_*_v1)** 不受影响,可由主线按既有流程独立先部署,与 BOSS 立绘无关。

### round3 → v4 生成要点建议(供下一轮生成器参考)
1. **姿态**：明确「头颈反向反折90°/180°,面部从自身肩后转向镜头回望(contortionist backward glance, exorcist head-turn pose, NOT a normal forward-facing crawl)」+ 中文「头颈反折90度面向镜头回望」。
2. **指缝元素**：明确「loose thin black hair strands weaving naturally between the splayed fingers; no rings, no ropes, no bracelets/cords」+ 中文「指缝是细黑发丝缠绕,不是环、不是绳、不是手镯」。
3. **头发覆面**：「long black hair draping fully over the face from the crown, only half a pale face and the dark eye sockets visible」。
4. 保留已达标项:四肢着地爬行、全身完整手/脚触底缘、纯黑背景 + 惨绿描边 + 发尾羽化入黑。
5. **流程**：v4 raw → qwen3.7-flash(raw PASS)→ 抠图 → qwen3.7-flash(cut PASS)→ 才可部署到 `server-rs/ui/assets/img/enemy_jiazi.png`。可在一次生成含 2-3 张候选择优质检,4096 采样单张约 0.2 元。