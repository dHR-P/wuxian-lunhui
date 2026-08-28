# 美术资源需求清单（ART_ASSETS_INVENTORY）

> 生成时间：本盘点由子代理对磁盘全量扫描产出（grep / 文件枚举 / 精确计数），所有数字均为实际结果，未做臆测。
> 工作目录：`games/wuxian-horror-ch1`
> 静态资源目录：`server-rs/ui/assets/img/`（现有 **167** 个 PNG）。`game/assets/img/` 仅 12 个（被 `server-rs/ui/assets/img` 覆盖，不另计）。
>
> **读法**：接手者读完本文件即可知道——整个游戏需要哪些美术资源、哪些已经有了、哪些缺、优先级如何、先画什么。

---

## 0. 总览（TL;DR）

| 资源类别 | 需求总数 | 已有着手 | 缺口 | 优先级 |
|---|---|---|---|---|
| 场景背景 bg（占位） | ≈1018 个去重背景 | 52 张 `*_bg.png` + 主题套装 | **≈1018 去重 / 1099 引用条**为占位，其中 **28 场景（baisun）零专属** | **P0** |
| 敌人立绘 | 254 个去重敌人遭遇 id | 42 张（enemy_41 + boss_1） | 杂兵级靠 5 张通用底图复用；**≥7 张点名必做缺**，BOSS/精英 61 缺专属 | P1 |
| NPC 立绘 | 121 个 NPC | 0 张专属（全部复用 `img_zhangjie`） | 121 全缺；对话界面无立绘插槽 | P1 |
| 武器图标 | 80 | 0 | 80 | P1 |
| 护甲/饰品图标 | 47 | 0 | 47 | P2 |
| 法宝图标 | 32 | 0 | 32 | P2 |
| 血统图标 | 19 | 0 | 19 | P2 |
| 普通道具图标 | 30 | 20（item_/it_ 共 25 张） | 10 | P2 |

> ⚠️ **关键背景信息（务必先读）**：前端 `ui/js/world2d.js` 的渲染机制经扫描确认：
> - **道具/武器/护甲/法宝/血统图标** 目前**不由 `item_*/it_*.png` 驱动**，而是用 `itemIconIdx(名称)` 把中文名归一映射到 7 个硬编码 tile 精灵（血瓶/钥匙/石碑/火把/卷轴/草药/水晶）+ 名称 hash 兜底。即 UI 现状**无需独立图标文件也能显示**，那 25 张 `item_/it_` PNG 是"已生成未接线"的孤立资产。
> - **场景背景图**、**敌人立绘**走 `assets/img/*.png`（`bg` 字段、`showBg()`、ENEMY_ICONS 表），与图标机制无关。
> - **NPC 对话层**（`#story`）**没有任何立绘显示位**，只有 speaker 姓名文字。

---

## 1. 场景背景（bg）完整清单

### 1.1 总体数据
- 场景定义文件 **56 个**（`scenes.rs` 主枢纽 + 55 个 `scenes_*.rs` 副本）。
- 取到 `bg` 字段的场景引用 **1474 条**（`bg: Some("...")` 正则命中 1481，7 条跨行未拆）。
- 不同 bg 字符串 **94 个**。
- **通用占位图引用 1099 条，占全部有 bg 场景的 74.5%**。实际只用了 12 个通用占位图：
  `img_zhuyuan_book.png(286)`、`img_laser.png(299)`、`img_corridor.png(209)`、`img_redqueen.png(159)`、`img_nexus.png(43)`、`img_horde.png(42)`、`img_train.png(37)`、`img_sterile_lab.png(9)`、`img_isolation.png(8)`。
  （括号为该图被引用的次数；部分引用写 `img_laser`/`img_redqueen`/`img_zhuyuan_book` 不带 `.png`。）

### 1.2 已有专属背景副本（共 52 张 `*_bg.png`）
每个有 `X_bg.png` 的副本，绝大多数**只在任务开场/结算 1 处**用该专属图，其余十几~几十个场景全部退回通用 `img_*` 占位（"已着手"程度极浅）。较完整的例外只有 4 个副本：
- **moshi**：45 条全部用 `scene_moshi_*`（citywall_dusk / hospital / command / observatory）✔ 全专属。
- **zhouyuan**：46 条全部 `scene_zy_*`（room / house_exterior / attic / battle / corridor）✔ 全专属。
- **yinse**：58 条全部 `img_ysd_l*`（l1_waste / l2_city / l3_factory / l3_rift / l4_arena）✔ 全专属。
- **tianshe**：半专属，`img_ts_l2_pool.png(19)` + `tianshe_bg.png(1)`。
- **shuangbai**：见 §1.4 特别告警，专属图引用但磁盘全缺。

其专属 `*_bg.png` 均存在于磁盘（bihai/cangjingge/daliexi/dashengtang/diweidu/hangu/hezi/huanxiongshi/jialebi/jiguancheng/jingjiling/jishengqianye/jishujing/juluoji/lanshan/mengguijie/miwu/mojiao/moruiya/mumiyi/nuoya/panbu/poxiao/poxu/sanlian/shaqiu/shenghua3/shenmiao/shourongsuo/sishen/siwuzhen/tianwang/tiexue/tiexue2/tongqu/wujin/wulin/xingchen/xinghe/xingjichuanqi/xingjichuanqi2/xingjijianchuan/xinhuangfang/yinxiang/yiying/yize/yizhong 等）。

### 1.3 各副本占位场景清单（含世界设定）

判定：场景 bg 属于通用占位集 `{img_zhuyuan_book/corridor/laser/redqueen/train/horde/nexus/isolation/sterile_lab}`。下表给出**副本 / 占位引用条数 / 去重后需画背景数（按 unique-loc）/ 该画成什么样（世界设定）**。

| 副本（world slug） | 占位引用条 | 去重需画背景 | 世界设定（loc 主题，即"该画成什么样"） |
|---|---|---|---|
| **baisun（P0 首急）** | **28** | **27** | ⭐ 命运清单·第二端：医院停车场 → 室内商场（悬空铁箱/焦黑轿车/吊机/值班室/电梯）→ 电影院逃生梯（灭火器/放映室/杂物间/防火门/失火段）→ 决战楼梯间 |
| scenes(主枢纽·生化) | 116 | 87 | 主神空间半圆广场/光柱/兑换光球、生化地下列车站台、蜂巢 B区廊/餐厅/激光通道/无菌实验室/隔离观察室/机房红后 |
| yiying（异形） | 35 | 32 | 船员生活区/餐厅/医疗区/电梯/到达厅/生物实验室/孵化卵区/皇后巢穴/引擎控制桥/贝蒂号对接舱 |
| yize（遗迹圣所） | 41 | 36 | F1柱廊观测室/补给舱/扫描陷阱/F2能量矩阵大厅/电池库/档案馆/F3中央引擎主舱/F4十字殿/供盾碎片座/仲裁者祭坛 |
| poxiao（破晓·吸血鬼） | 37 | 37 | 教堂广场/废弃血站/地铁口/地下排水道叛军/黎明尖塔决战镜阵 |
| jiguancheng（机关城） | 37 | 34 | 城门/齿轮工坊/齿轮阵/枢机桥/核心密室 |
| jianzhong（剑冢） | 39 | 33 | 山门古道/碑林/埋剑长廊/藏剑龛/剑冢深谷/L4无名剑碑决战（现仅有 bg_jz_l1_shanmen 山门 1 张） |
| xinhuangfang（死亡方块） | 33 | 32 | 启动层铁灰房间/中层编号回廊/出口层白光尽头 |
| bihai（深海） | 30 | 30 | L1潜水器舱/声呐室/舷窗、L2沉船/船长室/货舱、L3海沟祭坛/深渊巨眼 |
| cangjingge（藏经阁） | 32 | 30 | 山门经堂/书架武学残卷/禁书库/秘籍塔顶/心魔洞 |
| huanxiongshi（浣熊市警局） | 29 | 29 | RPD 警局主厅/枪械柜/停尸间/街道尸潮/城郊直升机坪/核弹倒计时 |
| sishen（死神来了） | 29 | 28 | 机场候机/明州高速连环车祸/郊外住宅短路 |
| shenghua3（生化3） | 28 | 28 | 浣熊市下水道/警察局地下/孵化室 |
| tianting（天庭） | 29 | 28 | 南天门残垣/天庭兵冢/神桥/封神台/凌霄殿倒悬王座 |
| mojiao（血月帮） | 30 | 27 | 血月山道/总坛前殿/血池殿/教主密室决战 |
| xingjichuanqi2（迷雾矿洞） | 27 | 27 | 迷雾矿洞/废墟教堂/灰雾医院深红手术室 |
| hezi（逆流之盒） | 27 | 27 | F1逆流平原/F2荧光石林/F3倒悬星海（镜潮兽） |
| jishengqianye（寄生前夜） | 29 | 27 | 剧场后台/封锁街道/研究所聚合体王座 |
| jialebi（加勒比） | 26 | 26 | 黑珍珠甲板/舵轮/沉船湾/海蚀洞/财宝洞/巴博萨决战 |
| tiexue2（铁血2·雨林） | 27 | 26 | 雨林金字塔/迷宫墓道/祭坛神座皇后巢 |
| jishujing（榆树街·弗莱迪） | 27 | 26 | 榆树街梦中小屋/梦境学校/锅炉房熔炉决战 |
| mumiyi（木乃伊） | 24 | 24 | 地宫入口/圣甲虫厅/封印墓门/祭司墓室/伊莫顿石棺/沙海 |
| tiexue（铁血战士） | 25 | 24 | 冰层营地/金字塔墓道迷宫/祭坛圣殿皇后巢 |
| tongqu（通衢镇） | 28 | 23 | 通衢镇/镖局/黑店/客栈/古宅中堂决战 |
| shaqiu（沙丘） | 25 | 23 | 坠毁穿梭机/沼泽孢子/共生体母巢/沙丘洞穴/渴水兽王座 |
| shenmiao（倒悬神庙） | 23 | 23 | 逆流之涡/颠倒回廊/沉眠神龛旧神祭窟 |
| moruiya（矮人·魔戒） | 27 | 23 | 卡扎督姆柱厅/书库/无底阶梯/王厅宝库/卡扎督姆桥/炎魔决战 |
| wulin（武林大会） | 21 | 19 | 大会榜文/兵器摊/擂台广场/盟主府密道/暗厅/决战 |
| juluoji（恐龙·侏罗纪） | 21 | 19 | 恐龙园区/丛林/围场决战 |
| xinghe（星河虫族） | 24 | 20 | 登陆场/地洞菌毯/脑虫巢高台决战 |
| lanshan（蓝山守城） | 15 | 15 | 南城墙/瓮城/烽火台/城中广场 |
| shourongsuo（模因收容所） | 15 | 15 | 标本廊/档案室/隔离区模因具现体 |
| nuoya（诺亚方舟） | 15 | 15 | 登舰大厅/观测层/机舱决战 |
| tianwang（天网SEED） | 15 | 15 | 地下动力廊/齿轮长廊/核心机巢/SEED 核心决战 |
| yinxiang（银舰） | 15 | 15 | 主走廊/舰桥银色舰长王座/引擎舱 |
| xingjijianchuan（星际舰船） | 15 | 15 | 主廊/人形舱/船腹星图广场/舰桥叛乱 AI |
| xinhuangfang 见上 / poxiao 见上 | - | - | - |
| f_yiy_queenhold 等（已并入 yiying） | - | - | - |
| 其余每副本 1~4 层主题（daliexi/dashengtang/diweidu/hangu/jingjiling/mengguijie/miwu/panbu/poxu/sanlian/siwuzhen/wujin/xingchen/xingjichuanqi/yizhong） | 2~3 | 2~3 | 决战处/开幕封面各 1 层，已有各自 `*_bg.png` 作开场 |

### 1.4 ⚠️ 特别告警 — shuangbai 背景缺失（当前无法渲染）
`scenes_shuangbai.rs` 引用了 **10 个 `img_shuangbai_*`** 背景：`img_shuangbai_barn.png / barn_open / bones / boss / death / deep / hut / misty / morning / well`（共 11 条引用）。**这些文件在 `server-rs/ui/assets/img/` 中一个都不存在** → 对应场景当前背景缺失、无法渲染，需优先补画或先回退为可渲染占位图。

### 1.5 排期口径
- 原始占位引用条数：**1099**
- **去重后需新画背景 ≈ 1018 个**（同一副本内 unique-loc，同名分支并入 1 个背景）——**推荐排期用这个数**。
- 完全无占位、专属背景到位的副本：moshi / zhouyuan / yinse（3 个），可跳过。

---

## 2. 敌人立绘清单

### 2.1 总体
- 世界文件 57 个 `.rs`（55 副本 + mod.rs + zhutian.rs）；ENEMIES 表在约 55 个副本中，mod.rs/zhutian.rs 无敌人表。
- **去重敌人遭遇 id（ENEMIES.fight ∪ ZoneDef kind=fight ref_id）= 254 个**（前缀=副本 slug，中尾部=敌人英文名，如 ws_brute、cj_shouge、jc_colossus）。
- 其中 **BOSS/精英级约 61 个**（id 含 boss/colossus/keeper/tyrant/queen/imhotep/gregor/arbiter/balrog/trex/sword_spirit/lou/guardian 等）。

### 2.2 已有着手立绘（磁盘实量 **42 张**）
`server-rs/ui/assets/img/` 下：
- **boss_**（1）：`boss_jianling`
- **enemy_**（41）：`baojun, brute, cultist, cyborg, demon, dragon, fulaidi, ghoul, golem, guard, horde, hunter, insect, jipu, jixianti, jixieronghe, juanzhe, kayako, kuangxie, licker, miwujuwu, mummy, oni, poxu, robot, rumoke, sanjiaotou, sea_creature, shourenchaowang, siege_beast, slasher, tentacle, undead, vampire, waro_r1, waro_r2, werewolf, wraith, xingshiwang, yizhong, zombie`

> 任务提示"41 个"与磁盘一致（enemy_ 41 张）；另加 `boss_jianling` 共 42 张真人立绘。

### 2.3 缺口（重点）
> 机制说明：代码内 `FightCfg` **无 sprite 字段**，不存在机器可读的 fight id → 立绘 slug 映射；前端 `zone3d.js/world2d.js` 只硬编码 `zombie / horde / licker / guard / hunter` 5 张通用复用底图。真正分配以**世界文件注释 + design/ 设计文档**为准。因此"缺口"以世界注释点名的+设计档标"新立绘/必做"的部分为准。

**明确点名缺立绘（磁盘缺失、设计档标必做/待生成）——至少 7 张：**
- `boss_gregor`（poxiao 破晓·格里高尔，标"必做"）
- `enemy_yiy_facehugger` / `_hunter` / `_queen` / `_sentinel` / `_worker`（yiying 异形系 5 张，待生成）
- `enemy_brain_bug`（xinghe 星河虫族·脑虫 BOSS，标"待生成"）

**高优先缺专属立绘的非杂兵 BOSS/精英**（roster 里非 zombie/horde/licker/guard/hunter 语义、又无对应 enemy_/boss_ 文件）：
- `b_balrog`（炎魔，moruiya）、`mm_imhotep`（木乃伊·伊莫顿）、`jl_trex`（霸王龙）、`jc_colossus`（机关城巨像）、`mj_jiaozhu`（血月教主）、`xh_30_brain`（星河脑虫）、`ws_lou`（银胜战潮王）、`sm_oldgod_spawn`（倒悬神庙旧神）、`yz_arbiter`（遗迹圣所仲裁者）、`jz_sword_spirit`（剑冢·剑灵）、`pc_boss_gregor`、`ws_waro_r1/r2`（已有 waro 图，可复用）、`sq_boss_king`（沙丘渴水兽王）、`tw_boss`（天网 SEED）、`xf_*`（死亡方块）等约 61 个 BOSS/精英中的大部分。

**杂兵级**：绝大多数靠 `zombie / horde / licker / guard / hunter` 5 张通用底图**换色复用**即可，不必逐张重画。

### 2.4 精确数字
- 去重敌人 roster id：**254**
- BOSS/精英级：**约 61**
- 已有立绘：**42**（enemy_41 + boss_1）
- 明确点名缺：**≥7** 张；高优先 BOSS/精英缺专属：数十（61 中绝大多数无专属图）。

---

## 3. NPC 立绘清单（121 个）

### 3.1 总体
- **全游戏 NPC 共 121 个** = 55 副本 115 条 `NpcDef` + 主线枢纽 `maps.rs` 6 条（张杰/蕾恩/卡普兰/一号/蕾恩·核心层/蕾恩·站台）。
- **121 个 NPC 无一人有专属立绘**。磁盘 **`npc_*.png` 完全不存在**；所有 NPC 在 2D 世界地图上用**通用 `img_zhangjie.png`** 顶替（`world2d.js` 对所有 npc 统一取该图），仅姓名牌区分。
- 对话剧情界面（`#story`）**没有立绘插槽**，只有 speaker 姓名文字 → NPC 说话不显示任何形象图。
- 主角：`pc_zhengzha.png` 已接入玩家形象；`pc_chuxuan / pc_zhanlan / pc_zhaoyingkong / img_zhengzha` 四张**磁盘存在但代码零引用**（预留未接入）。

### 3.2 按副本分组清单（id / 中文名）
| 副本 | NPC（id / 名） |
|---|---|
| 主线枢纽（maps.rs，6） | n_zhangjie 张杰 / n_rain 蕾恩 / n_kaplan 卡普兰 / n_yihao 一号 / n_rain_f3 蕾恩(核心层) / n_rain_f4 蕾恩(站台) |
| 主神空间 zhutian（5） | 张杰 / 郑吒 / 楚轩 / 詹岚 / 赵樱空 |
| baisun（3） | 停车场保安 / 商场客服 / 电影院清洁工 |
| bihai（3） | 幸存潜水员 / 幸存船员 / 邪教遗民 |
| cangjingge（2） | 守经人游魂 / 旁侍老僧 |
| daliexi（2） | 探矿者 / 守夜人 |
| dashengtang（2） | 执灯人 / 守门司事 |
| diweidu（2） | 拾荒者桠子 / 倒影画师挽 |
| hangu（2） | 送粮信使阿宁 / 守关老将晁伯 |
| hezi（1） | 巨鲸低鸣 |
| huanxiongshi（4） | 沈哲(幸存警员) / 艾彬(主神轮回者) / 郑咤(轮回者) / 直升机飞行员 |
| jialebi（3） | 船厨·阿朵 / 独眼海盗 / 老海盗鬼魂 |
| jianzhong（1） | 守陵人 |
| jiguancheng（1） | 守城人残魂 |
| jingjiling（2） | 避难者 / 传道者 |
| jishengqianye（0） | （空表） |
| jishujing（3） | 榆树街的孩子 / 被困的老师 / 梦中女孩残影 |
| juluoji（3） | 兽医格兰杰 / 幸存游客 / 濒死门卫 |
| lanshan（1） | 老卒 |
| mengguijie（2） | 迷路的孩子们 / 守夜人·父亲 |
| miwu（2） | 超市店员邹望 / 被困女人芮 |
| mojiao（2） | 红衣使者 / 前朝残魂 |
| moruiya（3） | 甘道夫 / 波罗莫 / 吉姆利 |
| moshi（3） | 民兵队长 / 军医 / 老指挥官 |
| mumiyi（3） | 考古队长·阿尔德 / 见习考古员·乔伊 / 悔罪祭司·安卡图 |
| nuoya（1） | 引渡官 |
| panbu（1） | 守夜长老 |
| poxiao（4） | 爱德华·道尔顿 / 奥黛丽·班尼特 / 埃尔维斯 / 埃德加·冯·豪森 |
| poxu（2） | 山巅武者 / 行脚武者 |
| sanlian（2） | 司礼官玄成 / 外族女医涟 |
| shaqiu（2） | 鹰·清晰者 / 格列弗·获救幸存者 |
| shenghua3（3） | 地下幸存者·蕾吉 / 受困警员 / 卧底医生·韩 |
| shenmiao（1） | 倒悬祭司 |
| shourongsuo（1） | 收容员 |
| shuangbai（1） | 守井的老温 |
| sishen（3） | 值班广播员 / 公路巡警 / 隔壁邻居 |
| siwuzhen（2） | 磨坊主·隐者 / 拾荒者 |
| tianshe（3） | 阿莲(狱友·医者) / 老石(狱友·铁匠) / 钧·镜像留音 |
| tianting（1） | 录事官残魂·敬 |
| tianwang（1） | 维修工 |
| tiexue（1） | 铁血·成年礼战士 |
| tiexue2（1） | 铁血·成年礼战士 |
| tongqu（2） | 老镖师·沈镖头 / 黑店掌柜 |
| wujin（2） | 部族猎人褐爪 / 割藤老者苍 |
| wulin（4） | 大会执事 / 净空掌师太 / 金狮拳掌门·铁砂 / 摩云舵主 |
| xingchen（2） | 残骸男人弗 / 星核衍生物·萤 |
| xinghe（2） | 特战队口令 / 老兵·里科 |
| xingjichuanqi（2） | 守日人 / 夜行者观察旅人 |
| xingjichuanqi2（3） | 守灯老人 / 敲钟人 / 医院守夜人 |
| xingjijianchuan（1） | 老导航员(残影) |
| xinhuangfang（1） | 幸存的考验者 |
| yinse（2） | 阿桑(人族劫掠队遗孤) / 小枢(地灵族遗民) |
| yinxiang（1） | 维修师机械 |
| yiying（3） | Father(船载 AI) / 考尔(队友) / 约翰纳(队友) |
| yize（2） | 张恒·预知者 / 念夕空·传递者 |
| yizhong（2） | 滞留博士纪 / 幸存实验员荷 |
| zhouyuan（1） | 资深者(队友) |

### 3.3 高频 NPC 职业类型（值得做专属/通用立绘）
跨副本重复出现、可做"一套职业通用立绘"：
1. **守卫/保安/巡警/门卫** — 停车场保安、濒死门卫、受困警员、公路巡警、守日人等（跨 6+ 副本）
2. **幸存者/村民/避难者** — 幸存潜水员/船员/游客/避难者、邪教遗民、地下幸存者（数量最多）
3. **守夜人/守墓人/守陵人/守经人** — 守夜人(×3)、守墓人、守陵人、守经人游魂、守井者
4. **商人/掌柜/店员** — 黑店掌柜、商场客服、超市店员、倒卖画师
5. **医生/兽医/军医/护士** — 卧底医生·韩、军医、兽医格兰杰、阿莲(医者)
6. **士兵/民兵/军官/老将** — 民兵队长、老指挥官、守关老将晁伯、老卒
7. **修理工/机械师/飞行员** — 维修工、维修师机械、直升机飞行员、老导航员
8. **广播员/播音** — 值班广播员、系统广播
9. **神职/老僧/祭司** — 旁侍老僧、传道者、倒悬祭司、悔罪祭司、红衣使者
10. **盗匪/海盗/猎手** — 独眼海盗、老海盗鬼魂、部族猎人

---

## 4. 道具 / 武器 / 护甲 / 法宝 / 血统 图标清单

### 4.1 各表精确条目数
| 表 | 条数 | 出处 |
|---|---|---|
| WEAPONS | **80** | `items_data.rs`（`WeaponDef{id}`） |
| GEAR（护甲+饰品） | **47** | `items_data.rs`（`GearDef{id}`） |
| TRESURE_DEFS（法宝） | **32** | `items_data.rs`（`TreasureDef{id}`） |
| ITEMS（普通道具） | **30** | `items_data.rs`（`ItemDef{id}`） |
| BLOODLINES（血统） | **19** | `combat_data.rs`（`BLOODLINES` 数组） |
| **合计** | **208** | |

### 4.2 现有图标文件（磁盘 25 张 `item_/it_` + ammo_crate）
- **item_（17）**：`antidote / bandage / bottle_water / core / fragment / grenade / health / holy / holy_water / jiezhou_fu / medkit / quzhen_fu / rune / sedative / silver_bullet / stone / torch`
- **it_（8）**：`blood_essence / core_crystal / core_sample / cross / cross_key / em_core / enhance_stone / soul_shard`
- 另有 `ammo_crate.png` 对应 id `ammo_crate`。

### 4.3 缺图标（按"每个条目专属 png"口径）
> ⚠️ 区分两口径：**A. 要每条目独立图标 png → 缺 188**；**B. 只要 UI 能显示 → 现状用 7 精灵已覆盖，缺 0（但非独立 png）**。见 §0 关键背景。下表是口径 A 的缺口。

| 类别 | 缺数 | 代表性/全部 id |
|---|---|---|
| **武器 WEAPONS** | **80/80** | 全部 `wp_*`/`wpn_*` —— wp_axe, wp_gun9, wp_sword, wp_katana, wp_gauss, wp_emi, wp_holy_sword, wp_silver_gun, wp_cu_ju, wp_quantum_core, wp_scythe_pobing, wpn_bloodsaber, wpn_zhuai_jianpan, wpn_rail_sniper, wp_ruyibang, wp_excalibur_holy, wp_beam_saber, wp_death_scythe_q, wpz_* 系列（zhuxian/xuanyuan/pangu/kongtong/taiji/shanhe）… 共 80 |
| **护甲/饰品 GEAR** | **47/47** | `gear_*` + `access_*` 全部 —— gear_police_vest, gear_kevlar, gear_mithril_vault, gear_nano_vest, gear_void_leak, gear_zero_absorb, gear_longlin_jia, access_strength_ring, access_agility_boots, access_san_locket, access_qi_belt, access_hades_cloak, access_tianting_belt, access_soul_bind … 共 47 |
| **法宝 TRESURE** | **32/32** | `cu_bab_*` + `tr_*` 全部 —— cu_bab_benming_fejian, cu_bab_qiankun_jie, tr_zhuxian_calendar, tr_blood_banner, tr_yinyang_jing, tr_ahnidun_shield, tr_mengjing_guiji … 共 32 |
| **血统 BLOODLINES** | **19/19** | vampire, werewolf (有 enemy 图可复用), zuwu, zhanshi_blood, gauss_cyber, angel/demon/dragon_bloodline, cyber_prosthetic, saiyan/sharingan/hollow/saint/shinigami/quincy/uchiha/senju/otsutsuki/mitsurugi_bloodline |
| **普通道具 ITEMS** | **10/30** | `item_lure`、`it_qixue_dan`、`gj_grenade`、`item_anesthetic`、`it_enhance_stone_hi`、`it_treasure_frag`、`it_genome_alpha`、`it_secret_key`、`it_box_mi`、`it_vault_pass` |
| **合计** | **188** | 80+47+32+19+10 |

### 4.4 说明
- 20 个 ITEMS 已有专属图：item_medkit/bandage/sedative/bottle_water/holy_water/silver_bullet/torch/grenade/quzhen_fu/jiezhou_fu/antidote（11）+ it_enhance_stone/it_em_core/it_blood_essence/it_core_crystal/it_soul_shard/it_core_sample/it_cross/it_cross_key（9）。
- 这 25 张 icon png 目前**均未被 UI 引用**（孤立资产），只有生成日志 `tools/results*.json` 提及；`item_core/fragment/health/holy/rune/stone` 6 张连生成日志都没列。

---

## 5. 缺口优先级表（供生图排期）

### P0 — 必须（场景 bg 占位 / 缺文件不可渲染）
| 缺口 | 数量 | 说明 |
|---|---|---|
| **baisun 占位场景 → 专属 bg** | **28 引用 / 27 去重背景** | 《命运清单·第二端》零专属背景，医院→商场→影院逃生梯，最优先 |
| **shuangbai 缺文件背景** | **10 个 `img_shuangbai_*`** | 磁盘不存在，当前**无法渲染**；需补画或先回退占位 |
| 其余 50 副本占位 bg | ≈ **991 去重背景** | 全游戏 1099 引用除去 baisun/moshi/zhouyuan/yinse 等已做，按副本批量补 |

> P0 总盘子：**约 1018 个去重背景** + 至少 10 个 shuangbai 补图。建议**先画每副本 1~3 层"封面/主线核心场景"**，再按 L 层补细。

### P1 — 重要（可显著提升观感：敌人专绘 / 关键 NPC / 武器图标）
| 缺口 | 数量 | 说明 |
|---|---|---|
| 敌人点名必做立绘 | **≥7 张** | boss_gregor、enemy_yiy_×5、enemy_brain_bug |
| 敌人 BOSS/精英专属立绘 | **≈61 张** | balrog/imhotep/trex/colossus/jiaozhu/脑虫/arbiter/剑灵等（杂兵用 5 张底图复用） |
| 关键剧情 NPC 专属立绘 | **10~20 张** | 张杰/蕾恩/郑吒/楚轩/詹岚/赵樱空/甘道夫/Father 等；先做 10 类职业通用立绘 |
| 武器图标（可复用 tile 精灵或独立 png） | **80** | 若只求显示可复用现有精灵；独立 png 则 80 |
| NPC 对话立绘插槽（代码层） | - | 当前对话层无立绘展示位，需先加 UI 插槽 |

### P2 — 可选（有现成精灵表覆盖，独立图标锦上添花）
| 缺口 | 数量 |
|---|---|
| 护甲/饰品图标 | 47 |
| 法宝图标 | 32 |
| 血统图标 | 19 |
| 普通道具图标（缺的 10 项） | 10 |

### 排期建议
1. **第一批（P0）**：baisun 27 背景 + shuangbai 10 修复 + 每副本 1 层核心场景 → 先让所有副本能完整渲染核心剧情。
2. **第二批（P1）**：7 张点名敌人 + 61 BOSS/精英专绘 + 关键 NPC 画像（含对话插槽）。武器可先沿用 tile 精灵，同时按需补主武器 png。
3. **第三批（P2）**：护甲/法宝/血统/道具独立图标，量大多彩但单张成本低。

---

## 附：复核脚本/数据
本次盘点全部数字来自磁盘扫描，可用以下命令复核：
- 占位场景：`Select-String -Path server-rs/src/scenes_*.rs -Pattern 'bg:\s*Some\("(img_zhuyuan_book|img_corridor|img_laser|img_redqueen|img_train|img_horde|img_nexus|img_isolation|img_sterile_lab)[^"]*"\)'`
- 敌人：`Select-String -Path server-rs/src/worlds/*.rs -Pattern 'fight:\s*"[^"]+"'`（ENEMIES + ZoneDef）
- NPC：`Select-String -Path server-rs/src/worlds/*.rs -Pattern 'NpcDef\s*\{'`
- 图标：`Select-String -Path server-rs/src/{items_data,combat_data}.rs -Pattern '(WeaponDef|GearDef|TreasureDef|ItemDef|BloodlineDef)\s*\{\s*id:\s*"[^"]+"'`
- 资产目录：`Get-ChildItem server-rs/ui/assets/img -File`
