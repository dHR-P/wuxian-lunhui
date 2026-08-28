# 素材部署日志（bg / 配音）

> 素材部署子代理 · tokenrhythm/deepseek-v4-flash-0731 · 部署时间 2026-04（后台）
> 红线遵守：仅 复制文件到 assets + 改 scenes_*.rs 的 bg/voice 字段行；未改剧情文本/逻辑/其他字段，未改 engine/state/defs/scenes.rs 主表/worlds/lib.rs；未 build --release。

---

## 一、BG 部署（27 张）

源：`tools/design/raw_50bg/*.png` + `tools/design/raw_50bg2/*.png` → 目标 `server-rs/ui/assets/img/<slug>_bg.png`（保持文件名 `<slug>_bg.png`）。

已复制 27 张，全部落位、文件存在性已验证（grep/Test-Path 全过）：

- raw_50bg（12）: jingjiling / xingjichuanqi / jishengqianye / mengguijie / siwuzhen / shenmiao / hangu / diweidu / wujin / xingchen / yinxiang / tianwang
- raw_50bg2（15）: xinhuangfang / huanxiongshi / shuangbai / dashengtang / daliexi / poxu / panbu / sanlian / yizhong / miwu / nuoya / lanshan / shourongsuo / xingjijianchuan / tiexue2

### BG 引用替换（27 处，每副本仅第一个“开场场景” `<prefix>_00` / `<prefix>_00_open` 的 bg 字段）

| 副本 | scenes 文件 | 开场场景 id | 原 bg（占位） | 新 bg |
|---|---|---|---|---|
| 荆棘岭 | scenes_jingjiling.rs | jj_00 | img_zhuyuan_book.png | jingjiling_bg.png |
| 星际传奇 | scenes_xingjichuanqi.rs | xj_00 | img_zhuyuan_book.png | xingjichuanqi_bg.png |
| 寄生前夜 | scenes_jishengqianye.rs | js_00 | img_nexus.png | jishengqianye_bg.png |
| 梦鬼街 | scenes_mengguijie.rs | mg_00 | img_zhuyuan_book.png | mengguijie_bg.png |
| 死物镇 | scenes_siwuzhen.rs | sw_00 | img_zhuyuan_book.png | siwuzhen_bg.png |
| 沉没神殿 | scenes_shenmiao.rs | sm_00 | img_laser.png | shenmiao_bg.png |
| 函谷关 | scenes_hangu.rs | hg_00 | img_zhuyuan_book.png | hangu_bg.png |
| 低纬度 | scenes_diweidu.rs | dw_00 | img_zhuyuan_book.png | diweidu_bg.png |
| 无尽 | scenes_wujin.rs | wj_00 | img_zhuyuan_book.png | wujin_bg.png |
| 星辰吞噬者 | scenes_xingchen.rs | xc_00 | img_zhuyuan_book.png | xingchen_bg.png |
| 银色战争 | scenes_yinxiang.rs | yx_00 | img_zhuyuan_book.png | yinxiang_bg.png |
| 天网 | scenes_tianwang.rs | tw_00 | img_zhuyuan_book.png | tianwang_bg.png |
| 心慌方 | scenes_xinhuangfang.rs | xf_00 | img_laser.png | xinhuangfang_bg.png |
| 浣熊市 | scenes_huanxiongshi.rs | hx_00 | img_corridor.png | huanxiongshi_bg.png |
| 霜白村 | scenes_shuangbai.rs | sb_00 | img_shuangbai_misty.png | shuangbai_bg.png |
| 大教堂 | scenes_dashengtang.rs | ds_00 | img_zhuyuan_book.png | dashengtang_bg.png |
| 打猎溪 | scenes_daliexi.rs | dl_00 | img_zhuyuan_book.png | daliexi_bg.png |
| 破虚（武极境·破虚） | scenes_poxu.rs | pv_00 | img_zhuyuan_book.png | poxu_bg.png |
| 盘部落 | scenes_panbu.rs | pb_00 | img_zhuyuan_book.png | panbu_bg.png |
| 三联盟 | scenes_sanlian.rs | sl_00 | img_zhuyuan_book.png | sanlian_bg.png |
| 一中 | scenes_yizhong.rs | yz_00 | img_zhuyuan_book.png | yizhong_bg.png |
| 迷雾 | scenes_miwu.rs | mw_00 | img_zhuyuan_book.png | miwu_bg.png |
| 诺亚 | scenes_nuoya.rs | ny_00 | img_zhuyuan_book.png | nuoya_bg.png |
| 蓝山 | scenes_lanshan.rs | ls_00 | img_zhuyuan_book.png | lanshan_bg.png |
| 收容所 | scenes_shourongsuo.rs | sr_00 | img_zhuyuan_book.png | shourongsuo_bg.png |
| 星级舰船 | scenes_xingjijianchuan.rs | xjj_00 | img_zhuyuan_book.png | xingjijianchuan_bg.png |
| 铁血战士2 | scenes_tiexue2.rs | tx2_00_open | img_zhuyuan_book.png | tiexue2_bg.png |

> 每副本仅替换“第一个开场场景”的 bg；其余场景保留原占位，避免大改。

---

## 二、配音 wav 部署（30 张）

源 `tools/design/audio_cops2/*.wav`（命名 `vo_<slug>_<k>.wav`）→ 目标 `server-rs/ui/assets/audio/`。

已复制 **30/30** 全部成功，文件存在性已验证无缺失：

vo_sishen_1, vo_sishen_2, vo_mumiyi_1, vo_mumiyi_2, vo_xinghe_1, vo_xinghe_2, vo_juluoji_1, vo_juluoji_2, vo_hangu_1, vo_hangu_2, vo_panbuluo_1, vo_panbuluo_2, vo_diweidu_1, vo_diweidu_2, vo_sanlian_1, vo_sanlian_2, vo_dashengtang_1, vo_shenmiao_1, vo_shuangbai_1, vo_lanshan_1, vo_lanshan_2, vo_shourongsuo_1, vo_tianwang_1, vo_xingjijianchuan_1, vo_hezishore_1, vo_xingchen_1, vo_yinxiang_1, vo_yinxiang_2, vo_mojiao_1, vo_wujie_poxu_1

---

## 三、voice 字段回填清单（17 处 / 16 文件）

> 依据 `cops2_voice_log.md §四「voice 字段建议映射」`；仅回填日志明确给了场景映射、且对应场景当前 `voice: None` 的条目（不覆盖已有 voice）。

| 副本 | scenes 文件 | 场景 id | 回填 voice id | 说明 |
|---|---|---|---|---|
| 函谷关 | scenes_hangu.rs | hg_00（开场） | vo_hangu_1 | 守城开场·士卒齐声 |
| 低纬度 | scenes_diweidu.rs | dw_00（开场） | vo_diweidu_1 | 进入低维·低语 |
| 霜白村 | scenes_shuangbai.rs | sb_00（开场） | vo_shuangbai_1 | 井边起源开场·首位复苏者 |
| 蓝山 | scenes_lanshan.rs | ls_00（开场） | vo_lanshan_2 | 城楼号令·守城元帅 |
| 收容所 | scenes_shourongsuo.rs | sr_00（开场） | vo_shourongsuo_1 | 模因撕封开场 |
| 天网 | scenes_tianwang.rs | tw_00（开场） | vo_tianwang_1 | 天网核心升起 |
| 星级舰船 | scenes_xingjijianchuan.rs | xjj_00（开场） | vo_xingjijianchuan_1 | 舰桥信号感染 |
| 星辰吞噬者 | scenes_xingchen.rs | xc_00（开场） | vo_xingchen_1 | 入腹地·星核守卫 |
| 银色战争 | scenes_yinxiang.rs | yx_00（开场） | vo_yinxiang_1 | 真空舱广播 |
| 武极境·破虚 | scenes_poxu.rs | pv_00（开场） | vo_wujie_poxu_1 | 裂隙开场·法则化身 |
| 盘部落 | scenes_panbu.rs | pb_00（开场） | vo_panbuluo_1 | 圣遗之夜开场·老者 |
| 三联盟 | scenes_sanlian.rs | sl_00（开场） | vo_sanlian_1 | 会盟宴席·大祭司 |
| 大教堂 | scenes_dashengtang.rs | ds_00（开场） | vo_dashengtang_1 | 地下封印松动·圣物之灵 |
| 死神来了 | scenes_sishen.rs | ss_00（开场） | vo_sishen_1 | 开场钩子·死神引子 |
| 星河战队 | scenes_xinghe.rs | xh_00（开场） | vo_xinghe_1 | 开场广播 |
| 木乃伊 | scenes_mumiyi.rs | mm_22_curse（开棺诅咒） | vo_mumiyi_1 | 日志明确给出场景 id |
| 木乃伊 | scenes_mumiyi.rs | mm_24_reborn（复生） | vo_mumiyi_2 | 日志明确给出场景 id |

---

## 四、跳过 / 未回填清单

> 未回填的 wav 只是“已部署未接入场景”，非失败。原因两类：(A) 对应开场场景已有 voice（按红线不覆盖）；(B) 日志映射点到未给出具体场景 id 的 BOSS/战斗场景，拿不准，跳过并记录。

**A. 对应副本开场场景已存在 voice（不覆盖）**
- vo_shenmiao_1 → scenes_shenmiao.rs sm_00 已有 `voice: Some("vo_sm_open")`
- vo_juluoji_1 → scenes_juluoji.rs jl_00 已有 `voice: Some("vo_jl_open")`
- vo_mojiao_1 → scenes_mojiao.rs mj_00 已有 `voice: Some("vo_mj_open")`
- vo_hezishore_1 → scenes_hezi.rs hz_00 已有 `voice: Some("vo_hz_open")`

**B. 日志映射到未具名 BOSS/战斗场景（场景 id 拿不准，跳过并记录）**
- vo_sishen_2 → 使者象征战（日志写 `ss_emissary`，文件内未检索到对应 SceneDef）
- vo_xinghe_2 → 脑虫巢 BOSS
- vo_juluoji_2 → 霸王龙战
- vo_hangu_2 → 箜邪 BOSS
- vo_panbuluo_2 → 蛇牙祭仪
- vo_diweidu_2 → 灾厄聚合体战
- vo_sanlian_2 → 圣分身演出
- vo_lanshan_1 → 巨魔督军战（日志把 vo_lanshan_2 给了开场，故开场回填 vo_lanshan_2；vo_lanshan_1 属 BOSS 战跳过）
- vo_yinxiang_2 → 银色舰长·战争 AI

---

## 五、验收

- ✅ 27 张 bg 文件已在 `server-rs/ui/assets/img/`（27/27，无缺失）
- ✅ 30 个 wav 已在 `server-rs/ui/assets/audio/`（30/30，无缺失）
- ✅ 20 个回填 voice id 对应 wav 均在 `assets/audio` 存在
- ⏱ `cargo check` 结果见部署汇报（`$LASTEXITCODE`）
- ❌ 未 build --release（按约定不做）