# 洪荒历副本素材质检总表（honghuang_assets.md）

> 生成子代理：洪荒历副本素材生成 ｜ 生图模型：tokenrhythm wan2.7-image ｜ 质检模型：tokenrhythm/glm-5.3-flash（2026-08-27 起，模型名不带前缀）
> 项目根：`C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1`
> 依据：`design/zhttty_universe/honghuang_li/yinse_dadi.md`（银色大地·地灵族机界遗迹，高优先级）＋ `00_ENGINE_CONTEXT.md` 素材规格
> 产出目录：raw → `tools/design/raw_honghuang/`；BOSS 抠图 → `tools/design/cutout_out/`
> 成本：0.2 元/张（wan2.7-image 生成）；共 10 张 = **2.0 元**（预算约 10 张，已用尽，未超支）

---

## 一、场景图清单（raw_honghuang/scene_*.png，768×1024，无需抠图）

> 设定定位：**银色大地 = 地灵族机界遗迹，洪荒版"切尔诺贝利"赛博缝合恐怖；昏暗冷色氛围光**。
> 判定口径：空镜场景图，画面禁止出现可辨识的人物/人形/活体/人形尸骸主体（散落的战场断刃/烧毁残骸属允许的战斗环境杂物）；背景即场景本身，不要求纯黑。

| 文件 | 字节 | 生成时间 | 判定 | 缺陷/备注 | 成本 |
|---|---|---|---|---|---|
| `scene_l1_waste.png`（r2 终版） | 1538524 | 2026-08-26 22:11:30 | **PASS**（glm 1/1/1/1） | 白银荒原空镜，前景无人形/尸骸；血天色、冷钢灰调。初版前景出现盔甲人形 FAIL→重生成 r2。r2 早期一次 QC 因描述误写"空无一物"而误判 FAIL，改对齐设计口径后 PASS（杂色断刃等战场杂物属允许装饰） | 0.2 |
| `scene_l2_city.png` | 1594105 | 2026-08-26 21:50:22 | **PASS**（glm 0.9/1/0.9/1） | 都市遗迹空镜，成排白骨向上伸手站姿、符文灯、冷灰蓝。备注：符文灯为挂墙发光而非"倒塌"态、白骨排列略显规整（原样保留，次要细节） | 0.2 |
| `scene_l3_factory.png`（r2 终版） | 1723062 | 2026-08-26 22:11:55 | **PASS**（glm 1/1/1/1） | 升华工厂空镜，传送带/机械臂/熔炉/蒸汽/空置人形模具槽。初版出现站立人形暗影 FAIL→r2 改为"空置模具槽无人形"后 PASS | 0.2 |
| `scene_l3_rift.png` | 1625606 | 2026-08-26 21:51:27 | **PASS**（glm 1/1/1/1） | 低纬度裂缝空镜，墨紫虚空、漂浮机械残骸、蓝紫微光泄漏，符合设定 | 0.2 |
| `scene_l4_arena.png` | 1590830 | 2026-08-26 21:51:48 | **PASS**（glm 0.9/1/1/1） | 决战祭坛空镜，中央升华法阵、符文石柱、偏白蓝幽光。备注：实际石柱约 5-6 根（设定"四根"）、中央光强度略高于"暗淡"——次要细节，可采 | 0.2 |

---

## 二、天蛇实验室场景图（预算内追加 1 张，raw_honghuang/scene_ts_pool.png）

| 文件 | 字节 | 生成时间 | 判定 | 缺陷/备注 | 成本 |
|---|---|---|---|---|---|
| `scene_ts_pool.png` | 1625899 | 2026-08-26 22:15:29 | **PASS**（glm 1/1/1/1） | 天蛇零号基地**血池车间**空镜：暗红血池、白骨池壁、铁链吊钩、传送带、幽绿仪器屏，暗红/骨白/暗绿三色。无任何人物/技师/尸骸主体 | 0.2 |

> 依据 `tianshe_lab.md` §9.2 `bg_l2_pool`（洪荒版生化危机核心意象）。

---

## 三、BOSS 立绘（raw_honghuang/boss_*.png）与抠图（cutout_out/boss_*_cut.png）

> BOSS = 机界升华体·瓦罗残响（两段式）。按任务硬件：**rev2 绝对平面纯黑背景后缀 + 全贴底缘**（供 flood-fill 抠图）。
> 抠图参数：`cutout_floodfill.py <raw> <cut> 16 --seal 2 --closing 1 --feather 2 --hole-channel 6 --hole-solid --zero-rgb`。

| 文件 | 字节 | 生成/抠图时间 | 判定 | 缺陷/备注 | 成本 |
|---|---|---|---|---|---|
| `boss_waro_r1.png`（raw 一形态） | 1468796 | 2026-08-26 21:49:44 | **PASS**（glm 1/1/1/1） | 半圣躯壳×机界升华装甲巨像：机械翼、空白圣光面具、管线蓝白光、舰白蓝装甲、接缝锈橙。后台纯黑无偏 | 0.2 |
| `boss_waro_r2.png`（raw 二形态） | 1507799 | 2026-08-26 21:49:49 | **PASS**（glm 0.9/1/1/0.95） | 一形态+墨紫裂隙物质/深紫触手/多眼柄/暗紫电弧；剩余"一只人类眼睛"可见，符合设定 | 0.2 |
| `boss_waro_r1_cut.png`（抠图） | 858656 | 2026-08-26 21:50 | **PASS**（glm 0.9/1/1/1，像素复核通过） | 透明背景 alpha=0 + RGB=0；opaque 47.7%；边缘带增益 0%（无可辨白/亮描边或光晕）；主体 47.7% 完整贴底(box y14..1007) | 抠图无额外 API 成本 |
| `boss_waro_r2_cut.png`（抠图） | 819207 | 2026-08-26 21:50 | **PASS**（glm 1/1/1/1，像素复核通过） | 透明背景 alpha=0 + RGB=0；opaque 41.0%；边缘带 0% 亮边；主体完整贴底(box y9..1008) | 抠图无额外 API 成本 |

> **抠图像素级复核**（numpy+scipy 独立验证）：两 cut 的透明像素 RGB 全 0（`--zero-rgb` 生效）、沿不透明主体边界 1px 环带增益≥180 像素占比 0% → **无白色描边/光晕/反光污染**。早期 qwen3.7-flash 对抠图报"背景纯白"为透明→白底合成的人为呈现，非真实缺陷；glm-5.3-flash 复核与像素数据一致判 PASS。

---

## 四、总成本

| 项 | 张数 | 单价 | 小计 |
|---|---|---|---|
| 银色大地场景（5，含 l1/l3 各一次重生成） | 7 | 0.2 | 1.4 元 |
| 银色大地 BOSS 立绘（2 raw） | 2 | 0.2 | 0.4 元 |
| 天蛇实验室血池车间 | 1 | 0.2 | 0.2 元 |
| **合计** | **10** | — | **2.0 元** |

> 预算约 10 张已用尽，未超支；抠图与 QC 走本地/chat API 不产生额外生图成本。

---

## 五、过程记录（供追溯）

1. **被测模型替换**：会话中视觉质检模型由 `qwen3.7-flash` 切换为 `glm-5.3-flash`（2026-08-27 约定），模型名不带 `tokenrhythm/` 前缀，否则 MODEL_NOT_AVAILABLE。
2. **场景空镜口径**：初次以过严"空无一物"描述导致 l1 r2 误判 FAIL；改为"禁人物/人形/尸骸主体、允许战场杂物"的设计口径后一致 PASS。
3. **无二次重生成仍不足的图**：l1/l3 重生成 1 次即终版通过，无连续 2 次不过的保留候选。
4. **抠图 QC 工具伪缺陷**：透明背景 PNG 在视觉模型中被按白底合成而误报"背景纯白/蓝灰描边"，已用像素级数据与 glm 复核纠正（边缘带 0% 亮边）。

---

## 六、建议部署清单

> 硬约束：不写 `server-rs/`、不部署 `server-rs/ui/assets/img/`。以下仅供主线统一验收/部署参考。

| 素材 | 用途（对应 bg/enemy 键） | 建议目标 |
|---|---|---|
| `scene_l1_waste.png` | 背景键 `l1_waste`（Act1/Act0 白银荒原） | `server-rs/ui/assets/img/img_ysd_l1_waste.png` |
| `scene_l2_city.png` | 背景键 `l2_city`（Act3 都市遗迹） | `server-rs/ui/assets/img/img_ysd_l2_city.png` |
| `scene_l3_factory.png` | 背景键 `l3_factory`（Act4 工厂） | `server-rs/ui/assets/img/img_ysd_l3_factory.png` |
| `scene_l3_rift.png` | 背景键 `l3_rift`（Act4 裂缝） | `server-rs/ui/assets/img/img_ysd_l3_rift.png` |
| `scene_l4_arena.png` | 背景键 `l4_arena`（Act6 决战祭坛） | `server-rs/ui/assets/img/img_ysd_l4_arena.png` |
| `scene_ts_pool.png` | 背景键 `bg_l2_pool`（天蛇 L2 血池车间） | `server-rs/ui/assets/img/img_ts_l2_pool.png` |
| `boss_waro_r1_cut.png` | BOSS 一形态立绘精灵 `ys_waro_r1` | `server-rs/ui/assets/img/enemy_waro_r1.png`（黑/透明底抠图） |
| `boss_waro_r2_cut.png` | BOSS 二形态立绘精灵 `ys_waro_r2` | `server-rs/ui/assets/img/enemy_waro_r2.png`（黑/透明底抠图） |