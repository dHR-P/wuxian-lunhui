# 洪荒历/末世素材部署验收日志（deploy_acceptance_log.md）

> 执行：主线（glm-5.3-flash 直读复核 + Copy-Item 部署）
> 日期：2026-08-27
> 验收方式：主线 read_image 逐张直读复核（glm-5.3-flash 现原生支持图片输入），与子代理 glm 质检结论对照；再字节级校验复制结果。

## 一、复核结论（13/13 PASS）

### 洪荒历（银色大地+天蛇）
| 源文件 | 复核要点 | 结论 |
|---|---|---|
| scene_l1_waste.png | 白银荒原空镜、断剑残骸无人形、血天色冷钢灰 | ✅ 与质检一致 |
| scene_l2_city.png | 都市遗迹、白骨向上伸手站姿、符文灯挂墙发光、冷灰蓝 | ✅ 一致（白骨排列略规整属既知次要细节） |
| scene_l3_factory.png | 升华工厂、传送带/机械臂/熔炉、空置人形模具槽（无人形） | ✅ 一致 |
| scene_l3_rift.png | 墨紫虚空、漂浮机械残骸、蓝紫微光 | ✅ 一致 |
| scene_l4_arena.png | 决战祭坛、中央升华法阵、符文石柱、白蓝幽光 | ✅ 一致（石柱 5-6 根属既知次要细节） |
| scene_ts_pool.png | 天蛇血池车间：暗红血池、白骨池壁、铁链吊钩、幽绿屏 | ✅ 一致 |
| boss_waro_r1_cut.png | 一形态半圣躯壳×机界装甲巨像，透明底干净、贴底完整 | ✅ 一致 |
| boss_waro_r2_cut.png | 二形态墨紫触手/多眼柄/紫电弧、胸口一目、透明底干净 | ✅ 一致 |

### 末世死城·人类防线
| 源文件 | 复核要点 | 结论 |
|---|---|---|
| scene_citywall_dusk_v1.png | 城墙阵地、士兵队列、重机枪位、烟火、黄昏橙灰 | ✅ 一致（士兵人形符合"人类防线"主题设定） |
| scene_hospital_v1.png | 医院走廊、冷绿荧光、血迹、病床/输液架/药瓶 | ✅ 一致 |
| scene_command_v1.png | 地下指挥所、深蓝荧光屏群、电台天线、背影操作员 | ✅ 一致（背影人物符合指挥所场景设定，非缺陷） |
| scene_observatory_v1.png | 高空炮台、双联炮、夕照、信号塔、废墟城市 | ✅ 一致 |
| boss_siege_beast_cut.png | 熔岩纹石甲巨兽、火焰双角、透明底、脚掌贴底完整 | ✅ 一致 |

## 一·B、咒怨场景部署（同日追加）

> 依据 `zhouyuan_assets.md` §六授权：「场景图 5 张不受 BOSS 影响，可由主线独立先部署」。主线 read_image 直读复核 5/5 PASS（宅邸雨景/廊道黑影/和室纸门外鬼影/阁楼地板黑洞/白圈黑发法阵——阴影与鬼影属咒怨题材刻意恐怖意象，非缺陷）。BOSS 立绘 v1~v4 全 FAIL，**继续不部署**（悬置待降标/占位决策）。

| 目标文件（server-rs/ui/assets/img/） | 源 | 字节 | 校验 |
|---|---|---|---|
| scene_zy_house_exterior.png | raw_zhouyuan/scene_house_exterior_v1.png | 1,553,566 | OK |
| scene_zy_corridor.png | raw_zhouyuan/scene_corridor_v1.png | 1,373,521 | OK |
| scene_zy_room.png | raw_zhouyuan/scene_room_v1.png | 1,450,227 | OK |
| scene_zy_attic.png | raw_zhouyuan/scene_attic_v1.png | 1,506,448 | OK |
| scene_zy_battle.png | raw_zhouyuan/scene_battle_v1.png | 1,537,344 | OK |

## 二、格式甄别

- 质疑：read_image 预览报 image/webp，怀疑 raw 为 webp 内容。
- 核查：pwsh 读前 16 字节魔数，13 个源文件与已部署 img_office.png/enemy_guard.png 全部为真 PNG（89 50 4E 47）。webp 为 DSH 预览转码所致，非文件本身格式。
- 结论：无需格式转换，直接复制。

## 三、部署清单（13/13 OK，字节全等）

| 目标文件（server-rs/ui/assets/img/） | 源 | 字节 | 校验 |
|---|---|---|---|
| img_ysd_l1_waste.png | raw_honghuang/scene_l1_waste.png | 1,538,524 | OK |
| img_ysd_l2_city.png | raw_honghuang/scene_l2_city.png | 1,594,105 | OK |
| img_ysd_l3_factory.png | raw_honghuang/scene_l3_factory.png | 1,723,062 | OK |
| img_ysd_l3_rift.png | raw_honghuang/scene_l3_rift.png | 1,625,606 | OK |
| img_ysd_l4_arena.png | raw_honghuang/scene_l4_arena.png | 1,590,830 | OK |
| img_ts_l2_pool.png | raw_honghuang/scene_ts_pool.png | 1,625,899 | OK |
| enemy_waro_r1.png | cutout_out/boss_waro_r1_cut.png | 858,656 | OK |
| enemy_waro_r2.png | cutout_out/boss_waro_r2_cut.png | 819,207 | OK |
| scene_moshi_citywall_dusk.png | raw_moshi/scene_citywall_dusk_v1.png | 1,520,439 | OK |
| scene_moshi_hospital.png | raw_moshi/scene_hospital_v1.png | 1,555,616 | OK |
| scene_moshi_command.png | raw_moshi/scene_command_v1.png | 1,664,830 | OK |
| scene_moshi_observatory.png | raw_moshi/scene_observatory_v1.png | 1,637,898 | OK |
| enemy_siege_beast.png | cutout_out/boss_siege_beast_cut.png | 913,792 | OK |

## 四、遗留事项

- 实机显示校验（alphaTest/立绘缩放）并入下一次 CDP 全流程测试（与 P1 主神链路验收同场进行）。
- 上述素材对应的副本关卡（洪荒历/末世）尚未实装，本批为**素材先行部署**，背景键/enemy 键等待各副本实现时引用。
- 成本不变：洪荒 2.0 元 + 末世 1.0 元（均为子代理生成期已记账）。
