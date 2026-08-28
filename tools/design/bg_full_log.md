# 副本场景背景 bg_full 生成验收日志

- 批次：wuxian-horror-ch1 全副本开场场景专属 bg（空镜无人形）
- 生图：`tools/design/gen_wan.py` gen() 768x1024（wan2.7-image，0.2 元/张）
- 质检：`tools/design/qc_qwen.py`（qwen3.7-flash，data URL base64，判据：空镜无人形 / 符合设定 / 无文字水印 / 画面质量）
- 落盘 raw：`tools/design/raw_bg_full/<slug>_bg.png`
- 部署：复制到 `server-rs/ui/assets/img/<slug>_bg.png`，并替换 `scenes_<slug>.rs` 开场场景占位引用

## 一、结果汇总

| 项目 | 数量 |
| --- | --- |
| 任务清单 29 副本 | 29 |
| 生成并 PASS 的新 bg | 24 |
| 接线既有专属 bg（未新生成） | 1（jianzhong） |
| 开场本就为专属 bg、跳过的副本 | 3（zhouyuan / moshi / tiexue2） |
| 共享框架场景、副本级无可替占位 | 1（biohazard） |
| FAIL（无法交付） | 0 |

- 部署到 ui/assets 的新 bg 数：**24**
- 替换的开场场景占位引用数：**24**（+ jianzhong 2 处接线 共 26 处引用改动）
- 生图总张数（含重试/失败分支）：约 **47 张**
- 预估花费：约 **9.4 元**（0.2 元/张 × 47）

## 二、24 张生成 PASS 明细（均：生成→qwen 质检 PASS→落盘 raw→部署→替换开场占位）

| slug | 场景设定 | 开场场景 | 旧占位 → 新 bg | 尝试 | 状态 |
| --- | --- | --- | --- | --- | --- |
| bihai | 深海沉船 | bh_00 | img_zhuyuan_book.png → bihai_bg.png | 1 | PASS |
| yiying | 奥瑞迦号金属走廊/孵化舱 | yiy_s0_arrive | img_train.png → yiying_bg.png | 1 | PASS |
| moruiya | 矮人矿坑石柱大厅 | mo_01_gate | img_zhuyuan_book.png → moruiya_bg.png | 1 | PASS |
| sishen | 机场候机厅 | ss_00 | img_train.png → sishen_bg.png | 4 | PASS |
| mumiyi | 埃及地宫圣甲虫厅 | mm_00_camp | img_zhuyuan_book.png → mumiyi_bg.png | 5 | PASS |
| xinghe | 异星虫巢/登陆场 | xh_00 | img_horde.png → xinghe_bg.png | 2 | PASS |
| juluoji | 热带雨林/围栏 | jl_00 | img_zhuyuan_book.png → juluoji_bg.png | 3 | PASS |
| yinse | 白银死战荒原 | ys_01_drop | img_ysd_l1_waste.png → yinse_bg.png | 1 | PASS |
| tianshe | 地下基因实验室 | ts_open | img_corridor.png → tianshe_bg.png | 1 | PASS |
| tianting | 南天门/凌霄殿 | tt_01_drop | img_zhuyuan_book → tianting_bg.png | 2 | PASS |
| jiguancheng | 墨家机关城 | jg_00 | img_zhuyuan_book.png → jiguancheng_bg.png | 3 | PASS |
| cangjingge | 藏经阁书楼 | cj_00 | img_zhuyuan_book.png → cangjingge_bg.png | 1 | PASS |
| wulin | 擂台广场 | wl_00 | img_zhuyuan_book.png → wulin_bg.png | 2 | PASS |
| tongqu | 江南古镇夜雨街 | tq_00 | img_zhuyuan_book.png → tongqu_bg.png | 1 | PASS |
| mojiao | 血月山道 | mj_00 | img_zhuyuan_book.png → mojiao_bg.png | 1 | PASS |
| hezi | 倒影界星海 | hz_00 | img_laser.png → hezi_bg.png | 1 | PASS |
| shaqiu | 绿潮荒漠 | sq_00_intro | img_laser.png → shaqiu_bg.png | 4 | PASS |
| yize | 神迹殿堂 | yz_01_arrive | img_laser.png → yize_bg.png | 2 | PASS |
| poxiao | 黎明之城清晨 | px_00_open | img_zhuyuan_book.png → poxiao_bg.png | 7 | PASS（红字反复出现，改用模糊/无字面策略后过） |
| tiexue | 冰川金字塔 | tx_00_open | img_zhuyuan_book.png → tiexue_bg.png | 1 | PASS |
| xingjichuanqi2 | 灰雾矿洞 | xj2_00 | img_zhuyuan_book.png → xingjichuanqi2_bg.png | 1 | PASS |
| jialebi | 黑珍珠海盗船 | jb_00 | img_zhuyuan_book.png → jialebi_bg.png | 1 | PASS |
| shenghua3 | 浣熊市地下 | sh3_00 | img_zhuyuan_book.png → shenghua3_bg.png | 1 | PASS |
| jishujing | 梦境锅炉房 | jj2_00 | img_zhuyuan_book.png → jishujing_bg.png | 1 | PASS |

## 三、非生成处理项（grep 复核结论）

1. **jianzhong（剑冢）** — 已有 4 张专属 bg（bg_jz_l1/l2/l3/l4_*.png）但未接线；本次把开场 `jz_00`、`jz_01`（L1 山门古道）接到既有 `bg_jz_l1_shanmen.png`，未新生成。
   - 备注：任务要求场景为"埋剑长廊(L2)"，对应既有 `bg_jz_l2_changlang.png`，但开场场景实际为 L1，故按开场接线 L1 图。
2. **zhouyuan（咒怨）** — 开场 `zy_01` 已是专属 `scene_zy_house_exterior.png`（非占位 img_*），按"仍是占位图才生成"规则跳过。
3. **moshi（末世死城）** — 开场 `ms_00` 已是专属 `scene_moshi_citywall_dusk.png`（非占位），跳过。
4. **tiexue2（铁血 AVP）** — 开场 `tx2_00_open` 已是专属 `tiexue2_bg.png`（非占位，已存在资产），跳过。
5. **biohazard（生化蜂巢）** — 无 `scenes_biohazard.rs`；该副本复用共享框架（`scenes.rs` 的 `s_*` 场景：s_office / s_train / s_corridor / s_redqueen 等，initial_scene=`s_office`），非副本独占场景。替换共享 `s_*` 引用会影响其它副本，故副本级不做替换，标为"共享框架场景，需框架级处理"。

## 四、遗留 / 备注
- 无 FAIL 交付项。
- qwen 质检曾多次出现 QC 传输层报错（QC_NO_FILE，urlopen 超时/网络抖动），经重试均最终 PASS；非图片质量问题。
- poxiao 因模型反复生成可读假文字（"NO NORIO"/"NO NO NO"），多次被"无文字水印"判 FAIL；最终改用远景模糊、无字面纹理的构图后 PASS。
- 生图花费为按 47 张 × 0.2 元估算；质检调用为本地 API 查询，忽略计数。

## 五、产物路径
- raw：`tools/design/raw_bg_full/<slug>_bg.png`（24 张）
- 部署：`server-rs/ui/assets/img/<slug>_bg.png`（24 张）
- 引用替换：`server-rs/src/scenes_<slug>.rs` 开场场景（24 处）+ `scenes_jianzhong.rs`（2 处）
- 驱动/配置：`tools/design/bg_full_run.py`、`bg_full_jobs.json`、`bg_full_retry_jobs.json`、`bg_full_qc_instr.json`
