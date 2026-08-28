# 素材定稿决策日志(2026-08-26 第三轮收尾)

> 此文件记录 pc_zhengzha 与 hunter 的候选迭代、数值证据与最终判定,供 README/TEST_REPORT/GAME_DESIGN 回填引用。
> 数值 diag 只作为筛选证据,最终判定以视觉质检(qwen3.7-flash / ox-alpha)为准。

## pc_zhengzha(主角郑吒立绘)

| 候选 | 文件 | 大小 | near-black | glow(y>=40%) | 上下半身 | 判定 |
|---|---|---|---|---|---|---|
| 候选4(旧) | pc_zhengzha.png@19:48 | 317700 | ~88% | — | — | 死刑:胸口黑T恤近黑区(d<=3 占该区37.8%)与外部背景连通通道>6px,flood 类方法像素级不可分(probe 验证 enclosed=0.00%) |
| 候选5 | pc_zhengzha_c5.png | 920917 | 65.2% | 5.02%(border_touch 9639px) | 53/47 | 淘汰:背景泛光严重(near-black 仅65.2%,body bbox 铺满全图,下半部 x≈437-509 垂直发光带贴边) |
| 候选6 | pc_zhengzha_c6.png | 530993 | 91.0% | 0.06%(289px) | 78/22 | **选定候选**:背景纯净、光晕基本消除;内部近黑洞 4176px(0.53%,最大 2121px 质心(354,318)胸口,flood 可修);抠图后 alpha<=5:91.3%、主体 8.6%(--hole-channel 6 --hole-solid) |

prompt 演化关键:第5轮起改为正面描述「穿深灰蓝色紧身T恤,受冷白主光照射呈深灰蓝调,与纯黑背景亮度差明显、绝非纯黑;全身(包括深色衣物)均匀受冷白主光照射、亮度明显高于纯黑背景,人物轮廓(领口、两臂与躯干之间、双腿之间、衣摆下缘)均有清晰受光边缘与背景分离,任何部位不得与纯黑背景同色;背后无光源」。

## hunter(猎杀者怪物立绘)

| 候选 | 文件 | 大小 | near-black | 上下半身 | feet zone | 判定 |
|---|---|---|---|---|---|---|
| 第三轮候选3 | hunter_c3.png | 210484 | 90.8% | 90/10 | 41px | 淘汰:下半身残缺(bottom-half 仅10.3%,feet zone 41px) |
| 第三轮候选4 | hunter.png | 284469 | 88.7% | 69/31 | 8669px | **选定候选**:全身完整(bottom 30.6%,feet 8669px),内部洞 6030px(0.77%,最大 1618px 质心(196,376)胸口 + 1149px 质心(508,622)腹侧,flood 可修);抠图后 alpha<=5:87.4%、主体 11.9% |

prompt 演化关键:第三轮强调「宽肩厚胸、躯干密闭实心、肌肉体积」修正骨架化问题。

## 部署状态

- server-rs/ui/assets/img/pc_zhengzha.png = c6 抠图版(559810B, 20:02:42)
- server-rs/ui/assets/img/enemy_hunter.png = 候选4 抠图版(326091B, 20:02:01)
- 旧版均已备份至 tools/design/backup_cutout/(pc_zhengzha_prev_20260826_200242.png、enemy_hunter_prev_20260826_200242.png)
- 棋盘预览:preview_enemy_pc_zhengzha.png / preview_enemy_hunter.png(384x512)

## 质检结论(2026-08-26 20:13,qwen3.7-flash 首轮)

- **pc_zhengzha c6**:raw=合格/轻微微调(qwen 两轮交叉:约7-7.5头身、轮廓光清晰、背景干净);抠图 B/C=需微调(大腿/裆部连通镂空白块 + 深色边缘黑边/光晕)。诊断:flood T=6 与 v1 距离法均把 y81-696/x262-510 连通透明(与背景同域),参数微调无效 → 已启动 c6 对照轮(第7轮,强化「严格居中、左右对称受光、身体表面绝无黑暗区域」)。
- **hunter 候选4**:三图全判「需重生成」(躯干中下部/腹部至胯部完全融入纯黑背景、无实心肌肉结构,B/C 抠图洞同源,右手多余手持刀具)。已启动第4轮(强化「躯干中下部、下腹部与胯部同样被主光照亮、有清晰暗部肌肉高光,绝非人类、绝无衣物」)。

## 抠图方法论教训(重要)

- flood-fill v2 的「0 孔」验收只查**封闭洞**;主体暗部若与背景经宽通道(>6px,如腿间/腋下)连通,会被当作背景整片删除且不被回填(c6/y81-696 大镂空)。验收必须叠加「主体邻域透明区」检查(neck-hole:距 solid 12px 内的透明连通域)。
- v1 距离法对 pc 系同样删大片近黑 → 深色主体+纯黑背景的素材,flood/v1 均不适用,根治须从生成层保证「主体任何部位亮度远离背景」。

## 第9/10轮进展(20:28-)

- **pc c8(789396B)**:near 仅20.8%、solid 70.1%——「整体提亮」被 Z-Image 放大到整个画面,背景不再黑,弃。
- **pc c9(545546B)**:near 63%、solid 28.1% 全身 bbox,但 y80 起头部就分左右两块(x138-233/x536-631)、躯干中央 x295-480 空——「双人镜像」失败模式(与 c7 同),弃。
- **c6 终审**:抠图 alpha>5 bbox y93-685,y700 以下全空——确证截断非全身,不可用(qwen 首轮「全身完整」判断有误,以像素证据为准)。
- **hunter r5 qwen 全链路判死**:A raw 腰部以下截断+下腹融黑+底部白噪;B 抠图填充色丢失成线稿、躯干镂空成骨架;C 胸腹抠空四肢断裂。弃。
- **新策略(第10轮 pc / 第6轮 hunter)**:「脚底贴近画面底缘、紧贴底部,下方仅留十分之一纯黑空隙」——不给 Z-Image 偷懒画腿的空间;hunter 另加「全身整体提亮」。

## 第11轮策略转折:rim light 分离(20:45-)

- **c10 qwen 终审**:A raw 合格(全身+脚掌完整、7-7.5头身、背景干净,仅右手微瑕)→ **B/C 抠图废**(裆下/腿间/大腿内侧大块透明破洞+边缘脏)。
- **像素级穷尽验证**:c10 裤面/黑发与背景 RGB 几乎相同(near<=3 占 48%);T=4/seal=8(改善 40%→22%)、neck_fill、bright_fill(d>=15 邻域)、body_fill(闭运算 60px)、seal=30 全部无法隔离「黑发/黑裤实体」与「黑背景」——**头部 100% 被 flood 删**。结论:深色主体+纯黑背景在像素层无解,必须生成层提供「主体边界信号」。
- **正解:rim light 轮廓光**——prompt 显式要求人物整体(头发/双肩/双臂/双腿/衣摆)有明亮冷白轮廓线围住内部黑区;抠图时轮廓线成 solid,内部黑区被围成**封闭洞** → hole-solid 回填。已同步:NEG 移除 rim light/轮廓光 禁词、BLACK_BG 移除「背后无光源」。
- 已启动 pc 第11轮(pwsh-134)与 hunter 第7轮(pwsh-135)。

## 失败模式总结(Z-Image 对深色主体的稳定翻车)

| 轮次 | 失败 |
|---|---|
| c5 | 背景泛光(border-touch 9.6k) |
| c6 | 截断半身(y685 后全空) |
| c7 | 竖直分裂(中央233px缝) |
| c8 | 背景被提亮(near 20.8%) |
| c9 | 双人镜像(头都分两半) |
| hunter r4 | 主体过小(2.1%) |
| hunter r5 | 腰下截断+下腹融黑+白噪 |

## 部署状态(updated 20:24)

- server-rs:pc_zhengzha.png=c6 flood 抠图(559810B,待替换)、enemy_hunter.png=hunter_r5 抠图(127588B,20:24:40,质检中)
- 备份:backup_cutout/enemy_hunter_prev_20260826_202440.png

## 引擎切换:wan2.7-image 一次成功(21:04)

- Z-Image 深色主体 11+7 轮翻车后,经用户指示切换图片生成至 tokenrhythm wan2.7-image(本地只留 H3 视频 + 本地语音/音效,弃用 OpenRouter 生图)。
- `tools/design/gen_wan.py`:POST https://tokenrhythm.studio/v1/images/generations,body `{"model":"wan2.7-image","prompt":...,"n":1,"size":"768x1024"}`,返回 `data[0].url` → 下载;HTTP 200,cost_cny=0.2/张;429 退避 15s×5。
- 第一批 `wan_test1.png`(=pc_wan1.png):768x1024,1110302B,一次成功。
- 数值体检(diag_wan_body.py):bg_dark_ratio=0.784、body_h_ratio=0.945、bbox=(225,32)-(542,999)、top_gap=32、bottom_gap=24、bottom8%=0.103、head/mid/low seg=0.168/0.282/0.118、center_col=0.539 → **全身完整、双脚在画面内、背景纯黑**(对比 Z-Image c11 仅大腿/3-4身,本质不同)。
- floodfill 抠图(seal2/hole-channel2/hole-solid/zero-rgb)→ pc_wan1_cut.png:透明74.7%/中0.8%/实心24.5%;清理小连通域(≥30px,去283px)后 bbox=(224,546)x(31,1000),h_ratio 0.947、bottom_gap 23px、bottom8%=0.123 → 含完整双脚。
- 视觉层独立质检(qwen3.7-flash 识图子代理 94792690)完成:判定**需重生成**,但判死点**不是**缺脚/裁切——全身完整性/背景均通过(与数值一致),问题仅为 ①底部留白目测 10-15%(双脚未贴底缘,行走动画会悬空;注:数值 bottom_gap 仅 24px≈2.3%,qwen 目测与像素证据有出入,按视觉权威意见修正) ②手部手指轻微融合。→ 按建议重跑:角色放大占画面 90%+、脚底紧贴底缘、双手手指清晰。

## 正式生成(wan2.7-image,轮1:pc_wan2 / hunter_wan1)

- pc_wan2:run_wan_pc.py(放大下移贴底缘+手指清晰)
- hunter_wan1:run_wan_hunter.py(下半身明亮+肌肉块面+贴底缘)

### 轮1 质检结论(子代理 42414163 / 63b0364d,qwen3.7-flash)

- **pc_wan2 → 需重生成**。注意:质检指令误把 pc_zhengzha 描述为「丧尸怪物」,qwen 据此判「画错对象
  (健康男性人像非丧尸)」——该条系 my prompt 污染误判,**郑吒本应就是健康人类战士**。但 qwen 同时检出的
  **真实缺陷仍然成立:底部地面反光+投影、背景非纯黑、数值 bottom_gap=0 系反光被误算为主体**,
  = 历史 c5/c6 泛光缺陷复发(与 ox_material_triage 记录一致)。
- **hunter_wan1 → 需重生成**。真实结论:下半身黑剪影**已修复** ✅(肌肉块面明亮)、脚贴底双脚清晰 ✅、
  手/刀分离无融合 ✅、构图居中 ✅;遗留缺陷:①白色外描边残留(rim light 烤出白边)②姿态为直立站姿
  不够攻击性(正式设定应为猎杀姿态)。「缺战术紧身衣」系质检指令误设(正式设定=无皮肤无衣物),非缺陷。

## 正式生成(wan2.7-image,轮2:pc_wan3 / hunter_wan2,pwsh-156/157)

- pc_wan3:run_wan_pc3.py —— 通用后缀 rev2(绝对平面纯黑 NO reflection/shadow/gradient/glow
  + 脚掌被底缘轻裁切真正贴底);保持郑吒健康战士设定
- hunter_wan2:run_wan_hunter2.py —— 姿态改低重心扑击猎杀姿态 + 明确 NO white outline;
  保持 skinless 无衣物设定

## wan 轮 3:pc_wan3 / hunter_wan2 定稿(qwen 双判「需重生成」,未部署)

> 轮 2 的 pc_wan2/hunter_wan1 被判重生成后,重跑 pc_wan3/hunter_wan2(raw_pc_wan3.png / raw_hunter_wan2.png)。本轮完成 diag 体检→抠图→qwen 复检。**两图 qwen 均判「需重生成」→ 按验收标准不部署污染版本,修正建议回写本段。**

### pc_wan3(主角郑吒·健康青年战士)结论:需重生成 ❌

- 数值体检(diag_wan_body.py):bg_dark_ratio=0.792 ✅、body_h_ratio=0.941 ✅、bbox=(133,46)-(637,1009)、bottom_gap=14px ✅、bottom8%=0.149 ⚠️、low_seg=0.110 ⚠️、center_col=0.416。背景纯黑、全身完整、脚贴底基本达标;仅脚部/下段数值偏低(地面反光污染嫌疑),非硬伤。
- 抠图(floodfill,更 T6→T16 修复纯黑残留):**T6 版本被纯黑残留污染**(bbox 铺满全图 x2-767/y0-1023、h_ratio=1.0,近黑背景 dist>6 未被近掩膜捕获 → 背景残黑被当主体保留)。**T16 + seal2 + closing1 + feather2 + hole-channel6 + hole-solid + zero-rgb → 干净版**(bbox x133-637/y46-1010、h_ratio=0.942、bottom_gap=13、无边缘黑残、无 col767 黑条)。cutout alpha<=5=75.1%/mid=0.0%/>=250=24.9%。产物:tools/design/cutout_out/pc_wan3_cut.png。
- qwen3.7-flash 复检(HTTP 200):全身完整✅、背景纯黑✅、下半身明亮融入清晰✅;但 **raw④ :全身外围明显纯白描边(约 2-4px)❌=判死项**;脚掌下方留白约 10-15% ⚠️;双手握拳被白边包裹 ⚠️。cutout **继承白描边,背景透明/主体完整/无黑点虽达标,仍因白边不达标**。
- **修正建议(写回 prompt 层根治)**:WAN prompt 强化负面 `NO white outline, NO rim light, NO halo; the silhouette must terminate cleanly and flat against pure black background`;脚掌贴底缘留白压到 ≤5%。

### hunter_wan2(无皮肤肌肉怪兽·低重心扑击)结论:需重生成 ❌

- 数值体检:bg_dark_ratio=0.664 ⚠️(反光/投影污染嫌疑)、body_h_ratio=0.927 ✅、bbox=(52,54)-(724,1002)、bottom_gap=21px ✅、bottom8%=0.084 ❌、low_seg=0.156 ⚠️、center_col=0.453。背景黑占比略低于目标,脚部区稀疏、下段偏低 → 质检重点关注项(本轮真实兑现为背景光晕+描边)。
- 抠图(floodfill T6→T16 修复):T6 版本污染(bbox x3-767/y0-1004、h_ratio=0.981、459 碎点、dark opaque 5.7 万);**T16 + seal2 + closing1 + feather2 + hole-channel6 + hole-solid + zero-rgb → 干净版**(bbox x52-724/y54-1003、h_ratio=0.928、bottom_gap=20、73 小碎点、无边缘黑残)。cutout alpha<=5=61.9%/mid=0.1%/>=250=38.0%。产物:tools/design/cutout_out/hunter_wan2_cut.png。
- qwen3.7-flash 复检(HTTP 200):肢体完整✅、左爪/右手刀清晰分离✅、脚贴底✅、下半身肌肉纹理清晰无黑剪影✅(**轮 1 下半身黑剪影已根治**);但 **raw② _raw④:主体轮廓(头到脚、爪到刀)包裹一圈明显纯白/浅蓝描边 + 周围轮廓光晕(rim light),违反反『无光晕/NO white outline』❌=判死项**。cutout **继承白描边,且持刀臂与躯干间有大块黑色残留杂质**。
- **修正建议(写回 prompt 层根治)**:WAN prompt 强化负面 `NO white outline, NO rim light, NO blue-ish edge glow; muscular body silhouette must terminate cleanly and flat against pure black background`;明确 `flat pure black, no reflected light on ground, no floor shadow`,维持 bg_dark。抠图前须先在 prompt 层剔除白描边,勿在带白边的原图上直接抠。

### 部署状态(本轮未部署)

- 按验收标准:两图 qwen 均「需重生成」→ **未把污染版本部署到 server-rs/ui/assets/img**。线上 pc_zhengzha.png(606438B,20:48:47)与 enemy_hunter.png(342256B,20:49:59)保持原部署版不变。
- 旧版已备份至 `tools/design/backup_cutout/wan2_deploy_backup/`:`pc_zhengzha_prev_20260826_212830.png`(606438B)、`enemy_hunter_prev_20260826_212830.png`(342256B)。
- 干净抠图候选(备用、未部署):`tools/design/cutout_out/pc_wan3_cut.png`、`hunter_wan2_cut.png`。
- 抠图教训写入:接近纯黑非纯(0,0,0)背景时,floodfill 默认 auto_bg 中位色 (7,7,5) + T=6 其距离 ~11 的近黑背景像素不被近掩膜捕获 → 纯黑残留(bounding box 铺满全图)。**需把 T 提至 ~16 或显式 --bg + 提高阈值**,并叠加零子 RGB 清残。

### zombie/licker/guard/horde 四件套评估(19:12 v2 旧档,qwen3.7-flash)

| 文件 | 结论 | 理由 |
|---|---|---|
| enemy_zombie.png(丧尸) | **建议 wan 重生成** | 主体/透明均达标,但 qwen 判定**轮廓硬切/锯齿 stair-step aliasing、缺抗锯齿**,UI 放大毛刺明显观感缺陷(成本 0.2 元/张) |
| enemy_licker.png(舔食者) | **保留 v2 旧档** | 质量最佳,主体高度可辨识、抠图干净无白边/halo,无重生成必要 |
| enemy_guard.png(守卫) | **建议 wan 重生成** | **最优先**:腿部膝盖处断裂/白缝 + 肢体与器械间大块伪影 + 轮廓粗糙脏边/ghosting + 鞋子不自然,影响辨识不可直接部署 |
| enemy_horde.png(尸群) | **保留 v2 旧档** | 三 zombies 群像完整、透明干净、无需单兵细节,省成本 |

- guard、zombie 两图如需重生成候选,候选产出到 raw_enemy/ 且不部署(本轮未执行重生成,留待专门轮)。

## 待办

- [x] wan_test1(=pc_wan1)数值体检通过,floodfill 抠图 OK
- [x] qwen 视觉质检 pc_wan1 → 全身完整确认,脚底留白需修正 → pc_wan2
- [x] pc_wan2 / hunter_wan1 生成+体检+qwen 质检 → 均为「需重生成」(背景泛光/白描边),已重跑 pc_wan3/hunter_wan2
- [x] pc_wan3 / hunter_wan2 生成完成 → diag 体检 → floodfill 抠图 → qwen 复检(设定口径与 wan_prompts 一致)
- [x] pc_wan3 / hunter_wan2 qwen 复检 → **均为「需重生成」(白描边/轮廓光+背景光晕)**,已回写修正建议;待 prompt 层根治白描边后重生成轮
- [ ] 重生成 raw 根治白描边 → 通过后部署到 server-rs/ui/assets/img(替换 Z-Image 流程)
- [ ] guard / zombie 评估为建议 wan 重生成;重生成候选产到 raw_enemy/ 不部署
- [ ] licker / horde 保留 v2 旧档(已定)
- [ ] cargo build --release + taskkill 21340 重启 + 战斗截图质检
- [ ] 文档回填(README 90行、TEST_REPORT 2.6 节、GAME_DESIGN 视觉章节)

## wan 轮 4:pc_wan4 / hunter_wan3 / guard_wan1 / zombie_wan1 重生成轮(执行于 21:39-21:5x)

> 授权已确认,启动重生成轮,四张图并行生成→体检→抠图(T16+zero-rgb)→qwen3.7-flash 质检。子代理链在此轮多次运行时失败(长链路不稳定),已改为**主线直接驱动**:生成/体检/抠图用 comfy-python 直接跑,qwen 质检用自写脚本 `qc_wan_regenerated.py` 直连 tokenrhythm(qwen3.7-flash)逐张识图,结果落 `tools/design/qc_wan_regenerated_result.txt`(4 张均 HTTP 200)。

### 处理链汇总(每图 生成→体检→抠图→qwen)

| 图 | raw diag(关键) | 抠图产物 | qwen raw | qwen cutout | 结论 |
|---|---|---|---|---|---|
| **pc_wan4** | bg_dark=0.740、body_h=0.940、bottom_gap=0、bottom8%=0.570 | pc_wan4_cut(905900B,alpha<=5仅3.7%,auto_bg被底部亮角污染致背景未抠净) | **❌ 需重生成:底部两下角灰蓝地面反光/渐变(lum≈51-55),背景非纯黑** | ❌ 抠图废(继承地面反光成白色残留) | **需重生成** |
| **hunter_wan3** | bg_dark=0.613、body_h=0.923、bottom_gap=38、bottom8%=0.069 | hunter_wan3_cut(696603B,alpha<=5=57%) | **✅ 可发布:全身完整、背景纯黑无光晕、无白描边、爪刀分离、下半身明亮无黑剪影** | ❌ 需重抠:左臂与躯干间大块黑色背景残留(采 hole-solid 填充)+ 边缘黑/灰线 + 左侧边缘噪点 | **raw 合格,cutout 需修复** |
| **guard_wan1** | bg_dark=0.774、body_h=0.921、bottom_gap=30、bottom8%=0.102 | guard_wan1_cut(452891B,alpha<=5=71.8%) | **❌ 需重生成:黑色防暴甲下半身在纯黑背景下融入/过暗,不满足「下半身明亮」;脚底留白~10%** | ⚠️ 可发布(抠图本身干净) | **需重生成** |
| **zombie_wan1** | bg_dark=0.761、body_h=0.916、bottom_gap=9、bottom8%=0.148 | zombie_wan1_cut(520924B,alpha<=5=72.2%) | **❌ 需重生成:全身环绕粗白描边/光晕(2-4px),违反 NO white outline** | ❌ 边缘残留细灰/黑线,不干净 | **需重生成** |

### 判定详情与修正建议

- **pc_wan4(郑吒)→ 需重生成**。失败根因 = **底部地面反光/渐变**(历史 c5/c6、pc_wan2 泛光缺陷**第 3 次复发**)。人物生成质量极高(肌肉/衣服/神态均在线),仅背景不合格。修正:prompt 强化「背景必须绝对纯黑、人物脚下无任何地面/反光/渐变、脚下虚空无实体」;必要时可裁掉底部或缩小主体留纯黑。抠图侧:auto_bg 四角中位法被底部亮角污染 → 本轮起应改用顶部两角测背景色或显式 --bg 校准。
- **hunter_wan3(猎杀者)→ raw「可发布」,cutout 需修复**。这是本轮**唯一 raw 全通过**的图(背景纯黑、无白描边、爪刀分离、下半身明亮无黑剪影,质量最高)。cutout 的「左臂-躯干黑色残留」实为 flood `--hole-solid` 填充的封闭臂-躯空隙(非真正残块);「边缘黑线 + 左侧噪点」需在抠图后清理。改用手动 hole-solid 关闭或抠图后 1px 边缘清洗即可。待 cutout 修净后可部署替换 enemy_hunter.png。
- **guard_wan1(守卫)→ 需重生成**。失败根因 = **黑色防暴甲本是深色,在纯黑背景下天然难分离/下半身过暗**,不满足「下半身明亮」。这是深色主体+纯黑背景的经典冲突(同 Z-Image 历史)。修正:prompt 强化「全身装备(尤其裤腿/下躯干)受冷白主光均匀照亮、轮廓边缘明亮清晰、任何部位不得与纯黑背景同色」;脚底留白压到≤5%。
- **zombie_wan1(丧尸)→ 需重生成**。失败根因 = **粗白描边环绕**(AI 常出的贴纸边,2-4px)。修正:prompt 必须加绝对否定 `no border, no outline, no white edge, clean hard shadowless silhouette against black`;抠图前确认白边已在生成层剔除。

### 本轮部署状态

- **本轮未部署任何新图**。唯一 raw 通过的 hunter_wan3 其 cutout 仍被 qwen 判需修复,按「可部署=raw+cutout 均合格」口径,达不到 deploy 条件 → 未覆盖线上文件。
- 线上保持原部署版:pc_zhengzha.png=606438B、enemy_hunter.png=342256B、enemy_guard.png=216456B、enemy_zombie.png=231566B。
- 备份(wan3_deploy_backup):pc_zhengzha_prev_20260826_213804.png、enemy_hunter_prev_20260826_213804.png、enemy_guard_prev_20260826_213804.png、enemy_zombie_prev_20260826_213804.png。
- 候选 cutout(未部署):cutout_out/pc_wan4_cut.png、hunter_wan3_cut.png、guard_wan1_cut.png、zombie_wan1_cut.png。
- 新增生成脚本(风标准):run_wan_pc4.py / run_wan_hunter3.py / run_wan_guard1.py / run_wan_zombie1.py;质检脚本 qc_wan_regenerated.py。raw 全存_raw_enemy/*(pc_wan4/hunter_wan3/guard_wan1/zombie_wan1)。

### 待办(轮4 追加)

- [ ] **hunter_wan3**:修净 cutout(清除臂-躯空隙残留 + 边缘黑线/左侧噪点)→ 可部署替换 enemy_hunter.png
- [ ] **pc_wan4 / guard_wan1 / zombie_wan1**:按上述根因改 prompt 第 2 轮重生成
- [ ] 抠图 auto_bg 改顶部校准或显式 --bg,规避底部亮角污染
- [ ] 全部通过后统一部署 + licker/horde 保留 v2 旧档定稿

## wan 轮 5:第 2 轮重生成(pc_wan5 / guard_wan2 / zombie_wan2 + hunter_wan3 修边,qwen3.7-flash)

> 按轮 4 根因修正 prompt 再跑。生成/pc_body 用 comfy-python 直跑,qwen 质检用 `qc_wan_regenerated_round2.py`(结果 `qc_wan_round2_result.txt`,4 张均 HTTP 200)。**本轮 0 张达到「raw+cutout 双通过」→ 未部署。**

### 处理链汇总(qwen 判定)

| 图 | raw diag 关键 | raw 判定 | cutout 判定 | 结论 | 部署 |
|---|---|---|---|---|---|
| **pc_wan5**(郑吒) | bg_dark=0.828、body_h=0.904、bottom_gap=33;底部角落 lum≈9-10(泛光已修复) | ⚠️ 基本可(背景轻微暗角渐变,非绝对#000000;脚下无反光合格) | ❌ **头顶黑发被误抠成洞/噪点**(黑头发+黑背景抠图失败) | **raw 可,cuto ut 需修** | 未部署 |
| **guard_wan2**(守卫) | bg_dark=0.757、body_h=0.919、bottom_gap=28 | ❌ 下半身裤子布料仍偏暗、与黑背景区分不足(具风险);边缘光晕偏重 | ❌ 白/浅蓝描边残留(边缘光晕未脱边) | **需重生成** | 未部署 |
| **zombie_wan2**(丧尸) | bg_dark=0.760、body_h=0.954、bottom_gap=17 | ❌ **致命:全身粗白描边照旧(约2-4px),像贴纸,本轮绝对否定无效** | ❌ 白+黑边残留 | **需重生成** | 未部署 |
| **hunter_wan3**(猎杀者) | (raw 详见轮4) | ✅ **可发布**(背景纯黑、无白描边、爪刀分离、下半身明亮) | ❌ **左臂-躯干黑色残留**:`--hole-solid` 把该处「封闭背景空隙」填实成不透明黑 | **raw可,cutout需改(改用非 hole-solid 让空隙透明)** | 未部署 |

### 关键结论与下一步

1. **hunter_wan3 raw 已合格,qwen 唯一站得住的 cutout 问题是「左臂-躯干空隙」应为透明背景、却被 `--hole-solid` 填实**。→ 改用**不用 hole-solid**的抠图(让被包围的背景空隙透明化)重抠,cuto ut 修净后即可部署替换 enemy_hunter.png。左缘噪点已在本轮 `hunter_wan3_cut_final`(largest-component 法)清掉。
2. **pc_wan5 cutout**:头顶黑发被误抠(黑发+黑背景同色,hole-solid 把头发区当作背景透明化 → 头顶空洞)。与 hunter 同根源(cuto ut 对深色头发/背景处理不一致)。需对头部做「强 hole-solid 保留」或改用更保头发的参数。
3. **guard_wan2 / zombie_wan2**:均需**第 3 轮重生成**——guard 下半身亮度(NEEDS stronger key light on pant fabric),zombie 白描边(wan2.7 顽固,需更强绝对否定 + 或用去边后处理)。
4. 抠图方法论新教训:hunter/pc 这类「无衣物有洞穴(臂-躯、腿间)」的立绘,`--hole-solid` 会把封闭背景空隙填实成不透明黑,反而制造「黑块残留」。**深色头发/深色主体 + 纯黑背景在 flood 像素层易互相误判(头发被当背景/背景空隙被当主体)。**根治方向仍是生成层给主体边界信号 + 对深色细节区用 high-T + hole-solid 保头发、对洞穴区用去 hole-solid 透背景。
5. cutout 候选(坏):pc_wan5_cut、guard_wan2_cut、zombie_wan2_cut、hunter_wan3_cut_final;raw 候选(坏):pc_wan5、hunter_wan3(合格)、guard_wan2、zombie_wan2。
6. 备份(本轮覆盖部署前)已放入 wan4_deploy_backup:pc_zhengzha_prev_20260826_220559.png、enemy_hunter_prev_20260826_220559.png、enemy_guard_prev_20260826_220559.png、enemy_zombie_prev_20260826_220559.png。

### 待办(轮5 追加)

- [~] **hunter_wan3**:改「不用 hole-solid(让臂-躯空隙透明)」重抠 cutout → 独立 qwen 复检 → 通过部署 enemy_hunter.png(先用 wan4_deploy_backup 内备份)
- [ ] **pc_wan5**:修 cutout 头顶(强 hole-solid 保留头发 / 头部区域回填)→ 通过部署 pc_zhengzha.png
- [x] **guard_wan2 / zombie_wan2**:第 3 轮重生成(guard 提亮下半身布料;zombie 强化绝对否定/去边)
- [ ] 全部通过后统一部署 + licker/horde 保留 v2 旧档定稿

> **💰 轮5 成本**:4 张 wan 生成 = 0.8 元(0.2 元/张 × 4:pc_wan5 / guard_wan2 / zombie_wan2 / hunter_wan3 复核)。cut 修补 0 元。

### 轮5 收尾(round3 结果 + guard 部署,171/7:43)

> 第 3 轮(guard_wan3 / zombie_wan3)已生成+抠图+qwen 质检;hunter_wan3_cut_final 独立复检。**guard_wan3 部署成功,其余未部署。**(round3 结果落 `qc_wan_round3_result.txt`,3 张均 HTTP 200)

| 图 | raw 判定 | cutout 判定 | 结论 | 部署 |
|---|---|---|---|---|
| **guard_wan3**(守卫) | ✅ **下半身(白/受光战术裤)完美符合「下半身明亮不融黑」,无白描边、背景纯黑、全身完整**;仅脚底留白约10%偏大(非致命) | ✅ 透明底、主体完整、无碎点、无白/黑边、盾牌保留(仅脚留白一致) | **可发布(下半身修复达成)** | ✅ **已部署→enemy_guard.png**(479991B,替换旧 216456B) |
| **zombie_wan3**(丧尸) | ❌ 仍有浅灰/浅蓝边缘光晕、贴纸感(3 代未根治,wan2.7 顽固) | ❌ 白边/浅灰残留 | **需重生成(或后期 matte edge 去边)** | 未部署 |
| **hunter_wan3**(cutout 复检) | ✅ 可发布(背景纯黑、无白描边、爪刀分离、下半身明亮) | ❌ **左臂-躯干凹槽**:RAW 中该区是手臂张开形成的黑背景空隙,被抠图 hole 填实成不透明;qwen 认为应透明(与「非镂空完整体型」设定口径产生分歧) | **raw 可,cuto ut 需定夺(凹槽透明 or 保留实体)** | 未部署 |

**部署执行**:
- `server-rs/ui/assets/img/enemy_guard.png` = guard_wan3_cut(479991B, 07:43:13)。旧版(216456B)备份于 `tools/design/backup_cutout/wan4_deploy_backup/enemy_guard_prev_20260826_220559.png`。
- 其余线上文件未动:pc_zhengzha=606438B(20:48)、enemy_hunter=342256B(20:49)、enemy_zombie=231566B(19:12)。

**zombie_wan3 后续建议**:白描边问题 wan2.7 引擎级顽固(3 代未根除),已非单靠 prompt 可解。可选:①对 zombie_wan3_cut 做 `edge_clean.py`(epoch 2-3)试去薄边,仍难保主体;②接受 ewm2 白边后由后期 matte edge 修边;③如重要,单独专项(如改亮/灰底或换构图)。**本轮按「连续 2 轮不过」对 zombie 记「需重生成/专项」,guard 记「已部署」。**

**hunter_wan3 后续建议**:臂-躯凹槽问题属抠图设定口径分歧(实体 vs 透明),需产品定夺。若接受「非镂空完整体型」则 cutout 可用(黑块对黑底合成不可见);若需透明凹槽,需针对该区域手动掏空(flood 无法经 closed 缝触达)。

### 轮5 cut修补记录(0元,未部署;qwen3.7-flash 复核)

**hunter_wan3 raw** = qwen 连续 3 次判「可发布」(背景纯黑、无白描边、爪刀分离、下半身明亮,完美抠图源)。cutout 唯一问题是「左臂-躯干间被包围的纯黑背景空隙」。

- 尝试 `cutout_floodfill.py` 多参数(no-fix-holes/conn8/gap/去 closing)均无法让该封闭空隙透明(flood 经手臂/躯干闭合缝触达不到,该空隙视为封闭洞)。
- 手术治疗:对「确认的封闭背景空隙」做裁剪出 alpha。**`hunter_wan3_cut_FINAL2.png`**(674067B):透明 59.7%/实心 40.3%,主体单一大连通件(316985px),arm-torso void 区域透明度升至 53.2%(其余为真实肌肉/肢体)。**主体完整未被损坏**。
  - ⚠️ 教训:之前用全局 lum<30 掏空的 v3 **损坏了主体**(把肌肉高光当背景删,胸膛/腹部/大腿镂空,qwen 判 FAIL)。须用**受限 bbox + 连通性判定**的精确掏空,勿全局扫。
- **产物候选(供验收,未部署)**:`cutout_out/hunter_wan3_cut_FINAL2.png`。

**pc_wan5 cutout 头顶**:qwen 指「头顶头发被抠、白色烂块」。经像素取证:raw 头顶 y0-120 几乎无 >lum30 内容(≈0%),cutout 顶部 alpha 与 raw 忠实一致(无可恢复的头像素,头处理 0 像素)。→ **该「头顶残缺」实为 raw 构图/头发过淡(头发几乎与黑背景同层)所致,非抠图 bug**;cut 修补无法补 raw 缺失内容,需 raw 层(重新生成强化头发与背景分离)或接受现状。`pc_wan5_cut.png` 忠实还原 raw。

### 轮5 成本小结

- wan2.7 生成:轮5 四张 = **0.8 元**(pc_wan5 0.2 / guard_wan2 0.2 / zombie_wan2 0.2 / hunter_wan3 复检 0.3?,按 0.2×4=0.8 计)。实际按接口 cost_cny=0.2/张。
- cut 修补(flood 重抠/手术掏空/头处理)= **0 元**。
- 已部署:guard_wan3 → enemy_guard.png(round3 通过)。

### 待办(轮6,代码执行 by 主线验收)

- [ ] **hunter**:验收 `hunter_wan3_cut_FINAL2.png`(raw 已 3×通过);若接受臂-躯空隙透明化即部署 enemy_hunter.png
- [ ] **pc**:若接受头顶挺淡(raw 构图)可部署 pc_zhengzha.png;否则 raw 层重生成强化头发分离
- [ ] **guard**:已部署 enemy_guard.png(round3 合格)。如需微调脚留白再裁剪
- [ ] **zombie**:仍需 round3 重生成(重点:缩小/改色避白描边,或后期 matte edge;预估 0.2 元/张)