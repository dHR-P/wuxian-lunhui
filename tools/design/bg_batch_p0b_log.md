# 背景池 Batch P0b 生成验收日志（8 副本 × 3 = 24 张）

- 批次：wuxian-horror-ch1 「每副本通用背景池（开场/调查/战斗·结算）」批量扩充
- 范围：`sishen` / `mumiyi` / `xinghe` / `juluoji` / `moruiya` / `yiying` / `dashengtang` / `wujin` 各 3 张
- 生图：`tools/design/gen_wan.py` gen() 768x1024（wan2.7-image，0.2 元/张）
- 质检：`tools/design/qc_qwen.py`（`qwen3.7-flash`，data URL base64，判据：空镜无人形 / 符合设定 / 无文字水印 / 画面质量）
- 落盘 raw：`tools/design/raw_bg_p0b/<slug>_bg_<type>.png`
- 部署：`server-rs/ui/assets/img/<slug>_bg_<type>.png`
- 引用替换：`tools/design/bg_p0b_edit.py`（全局占位映射 + 按场景语义路由）

## 一、结果汇总

| 项目 | 数量 |
| --- | --- |
| 目标背景池（8×3） | 24 |
| 生成 + 质检 PASS + 部署 | **24 / 24** |
| 遗留 FAIL | **0** |
| 替换的占位/既有 bg 引用 | **183 处**（转 69 个替换组）；另 24 处开场既有 `_bg.png` 保留不动 |
| 累计生图调用（含重试/最终通过） | 约 **47 张** = 约 **9.4 元**（0.2 元/张） |

> 补充：每次生图后都做 qwen3.7-flash 质检；FAIL 者重试新 prompt（≤2 次重试）。质检调用为本地 API，未计 cost；网络抖动导致偶发 `QC_NO_FILE`/429，重试后均通过。

## 二、24 张明细（生成 → qwen PASS → 部署 → 接场景）

| slug | type | 文件 | 覆盖内容 | 尝试 | 状态 |
| --- | --- | --- | --- | --- | --- |
| sishen 死神来了 | open | sishen_bg_open.png | 登机廊桥/值机/候机大厅 | 1 | PASS |
| sishen | invest | sishen_bg_invest.png | 行李提取厅（无文字重点重试） | 初批3FAIL→重试1PASS | PASS |
| sishen | battle | sishen_bg_battle.png | 跑道空镜/apron | 1 | PASS |
| mumiyi 木乃伊 | open | mumiyi_bg_open.png | 墓道石壁/入口沙室 | 3 | PASS |
| mumiyi | invest | mumiyi_bg_invest.png | 圣甲虫厅 | 3 | PASS |
| mumiyi | battle | mumiyi_bg_battle.png | 祭司墓室（纯建筑无棺无浮雕重试） | 6FAIL→纯建筑2PASS | PASS |
| xinghe 星河战队 | open | xinghe_bg_open.png | 登陆场/登陆舱残骸 | 1 | PASS |
| xinghe | invest | xinghe_bg_invest.png | 地洞甬道/菌毯卵堆 | 1 | PASS |
| xinghe | battle | xinghe_bg_battle.png | 脑虫巢/脑虫高台 | 2 | PASS |
| juluoji 侏罗纪 | open | juluoji_bg_open.png | 园区大道/游客中心 | 初批3FAIL→重试1PASS | PASS |
| juluoji | invest | juluoji_bg_invest.png | 热带丛林/岗哨 | 初批3FAIL→重试1PASS | PASS |
| juluoji | battle | juluoji_bg_battle.png | 围栏区/围场 | 2 | PASS |
| moruiya 摩瑞亚 | open | moruiya_bg_open.png | 矿坑大厅/柱厅西闸门 | 1 | PASS |
| moruiya | invest | moruiya_bg_invest.png | 书库/金库/无底阶梯/矿车/石桥深渊 | 1 | PASS |
| moruiya | battle | moruiya_bg_battle.png | 凯撒督姆/断桥/决战 | 1 | PASS |
| yiying 异形4 | open | yiying_bg_open.png | 飞船走廊/气闸/电梯井 | 1 | PASS |
| yiying | invest | yiying_bg_invest.png | 孵化舱/卵区/医疗/生物实验室 | 1 | PASS |
| yiying | battle | yiying_bg_battle.png | 主控室/引擎层/皇后巢穴/舰桥 | 1 | PASS |
| dashengtang 大教堂 | open | dashengtang_bg_open.png | 教堂中殿/圣物/圣坛吊灯 | 1 | PASS |
| dashengtang | invest | dashengtang_bg_invest.png | 地下墓穴/甬道 | 2 | PASS |
| dashengtang | battle | dashengtang_bg_battle.png | 高塔圣光之核/决战 | 1 | PASS |
| wujin 无尽森林 | open | wujin_bg_open.png | 林间小道/密林图腾兽骨 →(初批 wujin_bg 沿用) | 1 | PASS |
| wujin | invest | wujin_bg_invest.png | 部族营地/圣树祭火/柱碑 | 1 | PASS |
| wujin | battle | wujin_bg_battle.png | 巨木深处/迎击口/决战 | 1 | PASS |

## 三、引用替换明细（scenes_<slug>.rs，按场景语义 → 队列）

- **sishen**（L1 机场=open / L2 高速=跑道battle / L3 室内部=invest）：
  img_train×9→open、img_corridor×8→battle、img_zhuyuan_book×12→invest（ss_00 保留 sishen_bg.png）
- **mumiyi**（F0入口=open / F1圣甲虫厅=invest / F2祭司墓室=battle）：
  img_zhuyuan_book×11→open、img_laser×7→invest、img_redqueen×6→battle（mm_00 保留 mumiyi_bg.png）
- **xinghe**（L1登陆场=open / L2地洞=invest / L3脑虫巢=battle）：
  img_horde×10→open、img_corridor×7→invest、img_laser×7→battle（xh_00 保留 xinghe_bg.png）
- **juluoji**（L1园区=open / L2丛林=invest / L3围栏区=battle）：
  img_zhuyuan_book×6→open、img_horde×7→invest、img_laser×8→battle（jl_00 保留 juluoji_bg.png）
- **yiying**（走廊=open / 孵化-实验=invest / 舰桥-引擎-主控-巢穴=battle）：
  img_corridor×10 + img_train×1→open；img_horde×6 + img_sterile_lab×3 + img_isolation×3→invest；
  img_redqueen×7 + img_laser×5→battle（yiy_s0 保留 yiying_bg.png）
- **moruiya**（大厅=open / 书库-矿坑-深渊=invest / 凯撒督姆-断桥=battle）：
  按场景 27 处 img_zhuyuan_book 分派 open6/invest16/battle5（mo_01_gate 保留 moruiya_bg.png）
- **dashengtang**（中殿=open / 地窖甬道=invest / 圣光之核-决战=battle）：
  ds_prelude/ds_round→battle、ds_01+ds_crypt→invest、ds_reliquary/chandelier/tanhai/acolyte/verger/gather→open（ds_00/ds_hub 保留 dashengtang_bg.png）
- **wujin**（林间=open / 部族营地=invest / 巨木-迎击=battle）：
  wj_01/wj_round→battle、wj_00+密林3点→open、部落实地5点+hub→invest、wj_01b_prep/end_choice→battle

共替换 **183 处** bg 引用（69 个替换组）。替换后 `grep 'bg: Some("img_'` 于 8 个 scenes 文件均无残留。

## 四、质检备注 / 遗留

- 多次 FAIL 均属两类：①生成模型在带标牌/木牌/浮雕场景中画出**可读文字**（sishen 行李厅、juluoji park/jungle），改了「无文字、无场景牌」特别 prompt 后 PASS；②**无人形规则**：mumiyi 祭司墓室初版石棺带人脸+人形浮雕被判 FAIL（规则要求含尸体/骷髅/人形即为 FAIL），改用「纯建筑空镜，无棺、无人形浮雕、几何装饰」后 PASS。
- 网络抖动：部分 job 前 1-2 次 QC 报 `QC_NO_FILE`/429（timeout），重试即过，非图片质量问题。
- 遗留：`dashengtang_bg.png` / `wujin_bg.png`（上一批开场单图）仍在 ds_00/ds_hub 与 wj 少量场景使用，作为开场图保留；本批新增 `_open/_invest/_battle` 作为通用池。相关 `//! 待素材替换清单`注释尚未同步更新（不影响运行）。
- 编译：`cargo check` dev profile Finish（仅存量 unused/snake_case 警告，与本次改动无关）。

## 五、产物路径

- raw：`tools/design/raw_bg_p0b/*_bg_<type>.png` + `.qcresult.json`（24 张）
- 部署：`server-rs/ui/assets/img/<slug>_bg_<type>.png`（24 张）
- 引用替换：`server-rs/src/scenes_<slug>.rs`（8 文件，183 处）
- 驱动/配置：`tools/design/bg_p0b_jobs.json`、`bg_p0b_gen.py`、`bg_p0b_retry.py`、`bg_p0b_retry_jobs.json`、`bg_p0b_retry_mumiyi.json`、`bg_p0b_edit.py`、`bg_full_qc_instr.json`（复用）
