# Z宇宙新增副本·第二批配音素材日志（cops2）

> 素材子代理 · tokenrhythm/deepseek-v4-flash-0731 · 本地 TTS 生成（不计费，可重试）
> 管线复用 gen_tts_z_worlds.py / gen_tts_zhouyuan.py，Qwen3-TTS CustomVoice 0.6B
> 权重 `D:\AI_Tools\qwen3_tts_customvoice`，运行 `D:\ai_vllm_env\Scripts\python.exe`，`$env:PYTHONIOENCODING="utf-8"`
> 输出暂存 `tools/design/audio_cops2/*.wav`（24kHz/16bit/单声道），**不部署、不改任何 .rs/.js/json 既有文件**。
> manifest：`tools/assets_manifest_cops2.json`（新建）｜生成脚本：`tools/gen_tts_cops2.py`（新建）

生成时间：2026-04 ・ 后台任务 pwsh-149

---

## 一、范围说明

本批为「Z 宇宙新增副本·第二批」，面向 **worlds 展示向**（副本画廊/入口预告/开场&BOSS亮相），
台词从 `design/zhttty_universe/00_INDEX_EXPANSION.md §1` 各新增副本的**钩子**与 **BOSS 宣言**提取，
每副本 1–3 条，共覆盖 **20 个新增副本 / 30 条**。

voice id 命名：`vo_<slug>_<k>`（slug 同 `00_INDEX_EXPANSION.md §1` 表格）。

---

## 二、台词清单（30 条）与音色映射

> 音色限定模型 supported_speakers：`aiden/dylan/eric/ono_anna/ryan/serena/sohee/uncle_fu/vivian`。
> 映射口径同前批：男性/BOSS/宗主/系统 → `uncle_fu`；女低语/鬼泣/精神啸叫/法则残响 → `ono_anna`；童声/机械电子/广播 → `serena`；女性NPC → `sohee`。

| # | voice id | 副本(slug) | speaker / 台词 | voice | instruct 摘要 |
|---|---|---|---|---|---|
| 1 | vo_sishen_1 | 死神来了(sishen_laile) | 死神引子:「死神不是怪物——它从不露面,只在你放松的下一秒。」 | ono_anna | 冰冷无机质平直女声 |
| 2 | vo_sishen_2 | 死神来了(sishen_laile) | 使者·象征战:「名单上有你的名字。你改得掉征兆,改不掉结局。」 | uncle_fu | 低沉沙哑男声 |
| 3 | vo_mumiyi_1 | 木乃伊(mumiyi) | 伊莫顿·诅咒苏醒:「圣甲虫爬过的地方,都是你们的坟。」 | uncle_fu | 回音低沉咒语感 |
| 4 | vo_mumiyi_2 | 木乃伊(mumiyi) | 伊莫顿·复生:「三千年……我又回来了。」 | uncle_fu | 低到高亢复生疯狂 |
| 5 | vo_xinghe_1 | 星河战队(xinghe_zhangdui) | 装甲步兵广播:「一支小队,对上一千只虫。」 | uncle_fu | 急促沙哑广播 |
| 6 | vo_xinghe_2 | 星河战队(xinghe_zhangdui) | 脑虫·精神尖啸:「唳————进得来,就出不去。」 | ono_anna | 尖锐扭曲精神啸叫 |
| 7 | vo_juluoji_1 | 侏罗纪公园(juluoji_gongyuan) | 公园广播:「请勿奔跑——请勿,大声尖叫。」 | serena | 冷冽免责广播 |
| 8 | vo_juluoji_2 | 侏罗纪公园(juluoji_gongyuan) | 霸王龙·咆哮:「吼————你跑得掉吗?」 | ono_anna | 低沉撕扯气声嘶吼 |
| 9 | vo_hangu_1 | 函谷关(hangu_guan) | 守城士卒齐声:「人族的城墙,是最后一道。城在,人在!」 | uncle_fu | 低沉沙哑齐声口号 |
| 10 | vo_hangu_2 | 函谷关(hangu_guan) | 箜邪·万族军团长:「踏平函谷,万族当立!」 | uncle_fu | 暴戾癫狂战吼 |
| 11 | vo_panbuluo_1 | 盘部落(pan_buluo) | 部落老者旁白:「那夜的火灾不是火——是未来。」 | uncle_fu | 苍老平静追忆 |
| 12 | vo_panbuluo_2 | 盘部落(pan_buluo) | 灵蛇族长·蛇牙祭仪:「献上你们的血,换取圣遗的垂怜。」 | ono_anna | 诡异尖细祭咏 |
| 13 | vo_diweidu_1 | 低纬度(diweidu) | 低维低语:「低纬度的影子……会追着活人。」 | ono_anna | 虚无飘渺气声 |
| 14 | vo_diweidu_2 | 低纬度(diweidu) | 灾厄聚合体:「尔既窥我绝地,便做我聚合的养分。」 | uncle_fu | 多重嗓空洞回响 |
| 15 | vo_sanlian_1 | 三联盟(sanlianmeng) | 狂誓者大祭司:「举杯的下一秒,脚下便是祭坛。」 | uncle_fu | 虔诚疯狂祭文 |
| 16 | vo_sanlian_2 | 三联盟(sanlianmeng) | 圣人分身·演出:「愿我伟力所及——皆归于祂的神国。」 | ono_anna | 空灵恢宏神性 |
| 17 | vo_dashengtang_1 | 大教堂(dashengtang) | 污染圣物之灵:「教堂圣光最盛的地方,腐得最深。」 | ono_anna | 冰冷缝合嘶鸣 |
| 18 | vo_shenmiao_1 | 沉没神殿(shenmiao) | 旧神眷属·低颂:「这里的水是倒着流的。」 | ono_anna | 低沉浑浊深海吟颂 |
| 19 | vo_shuangbai_1 | 霜白村(shuangbai_cun) | 村中井·首位复苏者:「所有雾,都是从这口井里长出来的。」 | ono_anna | 干哑气音不祥 |
| 20 | vo_lanshan_1 | 蓝山(lanshan) | 攻城巨魔督军:「一个城市,一座山。今日过后,蓝山再无城头。」 | uncle_fu | 低沉浑厚巨石声 |
| 21 | vo_lanshan_2 | 蓝山(lanshan) | 守城元帅(城楼):「转八阵,固孤山。这一仗,输不起。」 | uncle_fu | 中气沉稳号令 |
| 22 | vo_shourongsuo_1 | 收容所(shourongsuo) | 模因具现体:「被收容的不是东西——是概念。」 | ono_anna | 多重声叠加低语 |
| 23 | vo_tianwang_1 | 天网(tianwang) | 天网本体·电子音:「审判日,不是某一天——是一个程序。」 | serena | 平直机械类电子童声 |
| 24 | vo_xingjijianchuan_1 | 星级舰船(xingji_jianchuan) | 盒间聚合体:「船还是那条船,人不是那些人了。」 | ono_anna | 信号失真断续女声 |
| 25 | vo_hezishore_1 | 盒壁层(hezishore) | 盒外观测者·渗透体:「盒子外面,还有一个盒子。」 | ono_anna | 飘渺空洞渗入感 |
| 26 | vo_xingchen_1 | 星辰吞噬者(xingchen_tunshizhe) | 星核守卫:「它的胃,是一整个星团。」 | uncle_fu | 低沉空旷文明巨物 |
| 27 | vo_yinxiang_1 | 银色战争(yinxiang_zhanzheng) | 舰载广播(真空舱):「没有声音,但你还能听见自己的心跳。」 | serena | 失真机械广播 |
| 28 | vo_yinxiang_2 | 银色战争(yinxiang_zhanzheng) | 银色舰长/战争AI:「你们的存在,阻碍了战争的纯粹。」 | uncle_fu | 冰冷空洞合成男声 |
| 29 | vo_mojiao_1 | 魔教总坛(mojiao_zongtan) | 魔教教主:「血月升起时,总坛才开门。」 | uncle_fu | 阴冷邪魅戏谑 |
| 30 | vo_wujie_poxu_1 | 武极境·破虚(wujie_poxu) | 天地法则化身演出:「武的尽头,是另一个世界的开始。」 | ono_anna | 恢宏空灵法则吟唱 |

> 20 副本明细：死神来了2 / 木乃伊2 / 星河战队2 / 侏罗纪2 / 函谷关2 / 盘部落2 / 低纬度2 / 三联盟2 / 大教堂1 / 沉没神殿1 / 霜白村1 / 蓝山2 / 收容所1 / 天网1 / 星级舰船1 / 盒壁层1 / 星辰吞噬者1 / 银色战争2 / 魔教总坛1 / 武极境·破虚1。

---

## 三、生成结果 wav 清单（id / speaker / 大小 / 时长）

> 下方由 `tools/design/audio_cops2/_generate_summary.json` 汇总。

| id | size(Byte) | dur(s) | speaker | attempt | 状态 |
|---|---|---|---|---|---|
| vo_sishen_1 | 295724 | 6.16 | ono_anna | 1 | ✅ |
| vo_sishen_2 | 253484 | 5.28 | uncle_fu | 1 | ✅ |
| vo_mumiyi_1 | 203564 | 4.24 | uncle_fu | 1 | ✅ |
| vo_mumiyi_2 | 361004 | 7.52 | uncle_fu | 1 | ✅ |
| vo_xinghe_1 | 284204 | 5.92 | uncle_fu | 1 | ✅ |
| vo_xinghe_2 | 172844 | 3.60 | ono_anna | 1 | ✅ |
| vo_juluoji_1 | 334124 | 6.96 | serena | 1 | ✅ |
| vo_juluoji_2 | 119084 | 2.48 | ono_anna | 1 | ✅ |
| vo_hangu_1 | 368684 | 7.68 | uncle_fu | 1 | ✅ |
| vo_hangu_2 | 318764 | 6.64 | uncle_fu | 1 | ✅ |
| vo_panbuluo_1 | 483884 | 10.08 | uncle_fu | 1 | ✅ |
| vo_panbuluo_2 | 387884 | 8.08 | ono_anna | 1 | ✅ |
| vo_diweidu_1 | 207404 | 4.32 | ono_anna | 1 | ✅ |
| vo_diweidu_2 | 211244 | 4.40 | uncle_fu | 1 | ✅ |
| vo_sanlian_1 | 414764 | 8.64 | uncle_fu | 1 | ✅ |
| vo_sanlian_2 | 514604 | 10.72 | ono_anna | 1 | ✅ |
| vo_dashengtang_1 | 357164 | 7.44 | ono_anna | 1 | ✅ |
| vo_shenmiao_1 | 518444 | 10.80 | ono_anna | 1 | ✅ |
| vo_shuangbai_1 | 410924 | 8.56 | ono_anna | 1 | ✅ |
| vo_lanshan_1 | 353324 | 7.36 | uncle_fu | 1 | ✅ |
| vo_lanshan_2 | 299564 | 6.24 | uncle_fu | 1 | ✅ |
| vo_shourongsuo_1 | 387884 | 8.08 | ono_anna | 1 | ✅ |
| vo_tianwang_1 | 288044 | 6.00 | serena | 1 | ✅ |
| vo_xingjijianchuan_1 | 253484 | 5.28 | ono_anna | 1 | ✅ |
| vo_hezishore_1 | 391724 | 8.16 | ono_anna | 1 | ✅ |
| vo_xingchen_1 | 449324 | 9.36 | uncle_fu | 1 | ✅ |
| vo_yinxiang_1 | 334124 | 6.96 | serena | 1 | ✅ |
| vo_yinxiang_2 | 345644 | 7.20 | uncle_fu | 1 | ✅ |
| vo_mojiao_1 | 476204 | 9.92 | uncle_fu | 1 | ✅ |
| vo_wujie_poxu_1 | 353324 | 7.36 | ono_anna | 1 | ✅ |

> 完整数据见 `tools/design/audio_cops2/_generate_summary.json`。

---

## 四、建议部署时 `voice:` 字段映射

> 说明：**不改任何 .rs 文件**。以下为建议，供主线/各副本实现子代理在对应 `SceneDef { speaker, voice: None }` 填 `voice: Some("vo_...")`，或在 worlds 展示层/副本画廊、开场钩子、BOSS 亮相场景引用。

| 副本（world/showcase 场景） | 播放点（建议） | 建议 voice id | 对应角色 |
|---|---|---|---|
| 死神来了 | 开场钩子 / 使者象征战(ss_emissary) | vo_sishen_1 / vo_sishen_2 | 死神引子 / 使者 |
| 木乃伊 | 开棺诅咒(mm_22_curse) / 复生(mm_24_reborn) | vo_mumiyi_1 / vo_mumiyi_2 | 伊莫顿 |
| 星河战队 | 开场广播 / 脑虫巢BOSS | vo_xinghe_1 / vo_xinghe_2 | 广播 / 脑虫 |
| 侏罗纪公园 | 入园广播 / 霸王龙战 | vo_juluoji_1 / vo_juluoji_2 | 广播 / 霸王龙 |
| 函谷关 | 守城开场 / 箜邪BOSS | vo_hangu_1 / vo_hangu_2 | 士卒 / 箜邪 |
| 盘部落 | 圣遗之夜开场 / 蛇牙祭仪 | vo_panbuluo_1 / vo_panbuluo_2 | 老者 / 灵蛇族长 |
| 低纬度 | 进入低维 / 灾厄聚合体战 | vo_diweidu_1 / vo_diweidu_2 | 低语 / 聚合体 |
| 三联盟 | 会盟宴席 / 献祭祭坛 | vo_sanlian_1 / vo_sanlian_2 | 大祭司 / 圣分身 |
| 大教堂 | 地下封印松动开场 | vo_dashengtang_1 | 污染圣物之灵 |
| 沉没神殿 | 神殿外开场 | vo_shenmiao_1 | 旧神眷属 |
| 霜白村 | 井边起源开场 | vo_shuangbai_1 | 首位复苏者 |
| 蓝山 | 城楼号令 / 巨魔督军战 | vo_lanshan_2 / vo_lanshan_1 | 守城元帅 / 巨魔督军 |
| 收容所 | 模因撕封开场 | vo_shourongsuo_1 | 模因具现体 |
| 天网 | 天网核心升起开场 | vo_tianwang_1 | 天网本体 |
| 星级舰船 | 舰桥信号感染开场 | vo_xingjijianchuan_1 | 盒间聚合体 |
| 盒壁层 | 盒壁隧道/真相终局 | vo_hezishore_1 | 盒外观测者 |
| 星辰吞噬者 | 入腹地开场 | vo_xingchen_1 | 星核守卫 |
| 银色战争 | 真空舱广播 / 银色舰长战 | vo_yinxiang_1 / vo_yinxiang_2 | 广播 / 舰长·AI |
| 魔教总坛 | 血月开门 / 教主战 | vo_mojiao_1 | 魔教教主 |
| 武极境·破虚 | 裂隙开场 / 法则化身演出 | vo_wujie_poxu_1 | 天地法则化身 |

> 提示：同副本多条 voice（如函谷关/蓝山/银色战争）建议分别挂在“开场钩子”与“BOSS 亮相”两个 SceneDef/OverlayDef 上，或由前端按段落顺序循环消费。

---

## 五、遗留 / 补充说明（听测建议）

- ✅ **30/30 全部一次生成成功（attempt=1）**，无失败、无换音色重试；基检（存在 / >0 字节 / 时长>0.5s）全部通过。
- ⚠️ 本批为 worlds 展示向，多为 BOSS 宣言/气声/嘶吼/机械电子音，Qwen3-TTS 对「拟声气声/啸叫/拖长尾音」可能生成偏长或念读化。**建议主线听测确认**的重点条目：
  - `vo_xinghe_2`（脑虫尖啸 3.60s）、`vo_juluoji_2`（霸王龙 2.48s）偏短可接受；`vo_sanlian_2`（圣分身神性 10.72s）、`vo_shenmiao_1`（旧神低颂 10.80s）、`vo_xingchen_1`（星核守卫 9.36s）偏长，若嫌拖沓可重生成或拆短句。
  - `vo_hangu_2`、`vo_lanshan_1`、`vo_huchi_*` 等战吼/命令类若显得“抒情/念读”多于“吼”，听测后如需可重跑覆盖（脚本支持重复执行覆盖同 id 文件）。
- ✅ 输出仅落 `tools/design/audio_cops2/`，未触碰 `assets/audio`、未改任何 .rs/.js/.json 既有文件、未部署。部署与 voice 字段落地由主线验收后决定。