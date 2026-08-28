# BOSS50 立绘素材生成日志（12 个高辨识度 BOSS）

- 角色：素材生图子代理（wan2.7-image 生图 / glm-5.3-flash 质检）
- 管线脚本：`tools/design/gen_wan.py` 的 `gen(prompt,"768x1024",out)`；抠图 `tools/cutout_floodfill.py`（固定参数 `16 --seal 2 --closing 1 --feather 2 --hole-channel 6 --hole-solid --zero-rgb`）
- 目录：raw=`tools/design/raw_boss50/`，cutout=`tools/design/cutout_boss50/`
- 命名：raw=`boss_<slug>[后缀].png`，cutout=`boss_<slug>.png`（待部署重命名为 `enemy_<slug>.png`）
- 预算：0.2 元/张，不限

## 结论摘要

| # | BOSS | slug | raw 立绘 | 终判 raw 文件 | cutout | 抠图终审 | 待部署命名 |
|---|------|------|----------|----------------|--------|----------|-----------|
| 1 | 寂静岭三角头 | sanjiaotou | PASS | boss_sanjiaotou_r2.png | ✅ | PASS（透明RGB=0✔） | enemy_sanjiaotou.png |
| 2 | 猛鬼街弗莱迪 | fulaidi | PASS | boss_fulaidi_r2.png | ✅ | 备注(见下) | enemy_fulaidi.png |
| 3 | 异种成体 | yizhong | PASS | boss_yizhong.png | ✅ | 备注 | enemy_yizhong.png |
| 4 | 寄生前夜线粒体聚合体 | jixianti | PASS | boss_jixianti.png | ✅ | 备注 | enemy_jixianti.png |
| 5 | 生化暴君 | baojun | PASS | boss_baojun_r2.png | ✅ | PASS（透明RGB=0✔） | enemy_baojun.png |
| 6 | 迷雾巨物 | miwujuwu | PASS | boss_miwujuwu_r2.png | ✅ | PASS（透明RGB=0✔） | enemy_miwujuwu.png |
| 7 | 死雾镇雾中行尸王 | xingshiwang | PASS | boss_xingshiwang_r2.png | ✅ | 备注 | enemy_xingshiwang.png |
| 8 | 沉没神殿旧神眷属 | juanzhe | PASS | boss_juanzhe_r2.png | ✅ | 备注 | enemy_juanzhe.png |
| 9 | 函谷关箜邪 | kuangxie | PASS | boss_kuangxie_r3.png | ✅ | PASS（透明RGB=0✔） | enemy_kuangxie.png |
| 10 | 无尽森林兽人战潮王 | shourenchaowang | PASS | boss_shourenchaowang_r2.png | ✅ | 备注 | enemy_shourenchaowang.png |
| 11 | 天网机械融合体 | jixieronghe | PASS | boss_jixieronghe_r2.png | ✅ | PASS（透明RGB=0✔） | enemy_jixieronghe.png |
| 12 | 破虚异界来者 | poxujiezhe | **FAIL(遗留)** | — | — | — | — |

**立绘 raw 达标：11/12 PASS，1 遗留（poxujiezhe）。**
**抠图产出 11 张，全部通过数值复核（透明像素 RGB=0，alpha=0），5 张 glm 终审全项 PASS。**

## 关键决策与说明

### 1. raw 立绘塑造（万恶之源是 rim light）
初版 proto 全按「冷白 rim light」出图，glm 质检大面积 FAIL——白/灰描边晕沿剪影泄入纯黑底，抠图必留白边。r2 起把后缀改为「**明确禁止 back-light/rim-light/任何白灰描边晕**，剪影硬边、等亮正冷光」后，大部分通过。留档：
- yizhong、jixianti：r1 即 PASS（本体为半透明光体，闪光即材质本身、轮廓收敛）。
- sanjiaotou/fulaidi/baojun/miwujuwu/xingshiwang/juanzhe/kuangxie(shourenchaowang/jixieronghe：r2 修正后缀后 PASS。
- kuangxie/poxujiezhe：r2 仍 FAIL（kuangxie 脚未贴底裁切；poxujiezhe 白晕+暗袍融黑底+缺半透明质感）→ 走 r3 定向修复：kuangxie_r3 强制脚贴底裁切后 PASS；poxujiezhe_r3 改为实心暗袍修士仍因「半透明辉光设定与无光晕抠图」天然冲突 FAIL，**已达 ≤2 次重生成上限，遗留**。

### 2. baojun「握拳」QC 口径修正
初版质检期望描述误写「没握拳」，导致 r2 明明双拳紧握（符合设定「握拳」）仍被 FAIL。核对任务设定后把期望描述改正为「握拳」，复检 → PASS。此为质检口径修正，非图像问题。

### 3. 抠图终审口径（透明经验证可信）
- **数值复核（决定性）**：全部 11 张 cutout 用 PIL 直接读 alpha 通道核对，透明像素 alpha=0 且 RGB 全为 0（`--zero-rgb`），`透明RGB非零=0`、全部 OK。这是任务指定的「透明像素 RGB=0」硬校验，**11/11 通过**。
- **glm 直接看黑底透明 PNG** 会误判「背景是不透明纯黑」（其视觉后端把 alpha 透明区渲染成黑色），因此我额外做 checkerboard（棋盘格）合成版让 glm 判断——背景区透出棋盘格则证真透明。基于棋盘格终审：
  - 全项干净（PASS）：sanjiaotou、baojun、miwujuwu、kuangxie、jixieronghe。
  - 备注（背景真透明；肢体/触手/爪子围合成的封闭三角空隙被 `--hole-solid` 填为不透明实底，glm 判为「黑残留」）。此为实心立绘的标准行为（防镂空、不穿身体），数值上透明 RGB=0 已证真，可直接用于游戏合成；后续若要求「四肢/触手间空隙全透」，可改用 `--no-fix-holes --seal 0` 重新抠图并复检。
  - 备注项：fulaidi、yizhong、jixianti、xingshiwang、juanzhe、shourenchaowang。

## 花费

| 阶段 | 单价 | 数量 | 小计(元) |
|------|------|------|----------|
| raw 首版 12 张 | 0.2 | 12 | 2.40 |
| r2 重生成 10 张（除 yizhong/jixianti） | 0.2 | 10 | 2.00 |
| r3 定向 2 张（kuangxie/poxujiezhe） | 0.2 | 2 | 0.40 |
| **图像生成合计** | | **24 张** | **4.80** |

glm 质检不计费/含在密钥内；抠图和复核为本地计算。

## 文件清单

### raw_boss50（raw 立绘，含重生成迭代，24 张）
- 采用（PASS）：`boss_sanjiaotou_r2.png`,`boss_fulaidi_r2.png`,`boss_baojun_r2.png`,`boss_miwujuwu_r2.png`,`boss_xingshiwang_r2.png`,`boss_juanzhe_r2.png`,`boss_kuangxie_r3.png`,`boss_shourenchaowang_r2.png`,`boss_jixieronghe_r2.png`,`boss_yizhong.png`,`boss_jixianti.png`
- 采用（FAIL 遗留，不部署）：`boss_poxujiezhe_r3.png`（及其 r1/r2 迭代）
- 弃用迭代：`boss_*_r2/r3.png` 中未被采用的各版本，均留在 raw 供回溯
- 每张配 `.prompt.txt` 存档 prompt

### cutout_boss50（抠图，11 张，即为待部署产物）
- `boss_sanjiaotou.png`,`boss_fulaidi.png`,`boss_yizhong.png`,`boss_jixianti.png`,`boss_baojun.png`,`boss_miwujuwu.png`,`boss_xingshiwang.png`,`boss_juanzhe.png`,`boss_kuangxie.png`,`boss_shourenchaowang.png`,`boss_jixieronghe.png`
- 均为 768x1024 透明 PNG（`--zero-rgb`，透明区 RGB=0）

### 质检存档
- `qc_boss50_raw/`（raw 各次质检 .md）
- `qc_boss50_cut/`（cutout 质检 .md + checkerboard 复核）
- 各 `_results*.json`

## 待部署命名映射
部署时把 `cutout_boss50/boss_<slug>.png` 复制/重命名为 `enemy_<slug>.png`（1~11 号共 11 张），丢入游戏 `server-rs/ui/assets/img/`（见 cutout 工具默认输出目录）。保管 poxujiezhe 为 FLAT 遗留，待后续再出。