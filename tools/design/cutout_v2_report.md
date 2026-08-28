# 抠图管线 v2 总结报告（cutout_floodfill.py 连通域 flood-fill）

- 项目：`games/wuxian-horror-ch1`
- 日期：2026-08-26（最终参数 v2：seal=2 / fix-holes=开 / closing=1 / feather=2 / T=6 / conn=4）
- 配套：`tools/design/cutout_v2_compare.md`（新旧对比表，含 ①-⑤ 统计项）
- 旧版成品备份：`tools/design/backup_cutout/`（`enemy_*.png` ×5 + `pc_zhengzha.png`）
- 部署状态：**server-rs/ 已由主线接管，本子代理只产出报告、不再写入**

---

## 0. 候选原图分诊（任务要求 + 主线新增标注）

会话中途**主线并行管线持续重生成立绘并多轮定稿**（raw 时间戳多次前移）。分诊依据为
`raw_snapshot_2000`（20:00 冻结）与 `raw_snapshot_2007`（20:07 冻结）两份快照，并结合主线最新判定。

### 分诊结论（status 汇总——已完成判定的候选）
| 角色 | 候选 | 判定 | 依据 |
|---|---|---|---|
| hunter | c1（165631B, 19:36） | **未选择** | 主题较小，包围盒 (70,79)-(592,986) |
| hunter | c3（210484B, 19:51） | **放弃** | 下半身残缺（bottom 10.3%、feet 41px） |
| hunter | **候选4 hunter.png（284469B, 19:52）** | **选定（主线正在抠图定稿）** | 造型完整（bottom 30.6%、feet 8669px），近黑内部连通域仅 6030px（0.77%） |
| pc_zhengzha | c1/c2/c3（早期） | 未选择 | 早期版本质检不达标 |
| pc_zhengzha | c5（920917B, 19:59） | **放弃** | **背景泛光不合格**（glow border-touch 9639px + near-black 仅 65.2%） |
| pc_zhengzha | **c6 / pc_zhengzha.png（530993B, 20:01）** | **选定（主线体检/定稿中）** | 近黑 91%，内部黑衣物连通域 4176px（0.53%），flood-fill 可保留黑色衣物到 0 孔 |
| zombie / licker / guard / horde | 无候选变体（单一原图，live hash 核验 SAME） | 直接重抠 | 24 张原图即正式图 |

> 主线新增说明：**pc_zhengzha c5（920917B）已因背景泛光正式淘汰，c6（530993B）为选定版本**；
> **hunter 第三轮候选4（284469B）= 选定版本**。以上已在分诊表标注。

### 定稿状态（重要）
- **server-rs/ 部署统一由主线定稿后做**；本子代理已暂停对 `server-rs/ui/assets/img/` 的一切写入，
  不再改动 `pc_zhengzha.png` / `enemy_hunter.png`（也不覆盖 zombie/licker/guard/horde）。
- 会话早期 `server-rs/pc_zhengzha.png`（349519B，96.9% 不透明）是**旧中间态坏结果**（背景几乎未抠），
  主线已知悉，新候选（c6）定稿后会覆盖。
- `enemy_hunter_cut.png`(20:02) / `pc_zhengzha_cut.png`(20:02) / `pc_zhengzha_cut2.png`(20:15) 是主线在
  raw_enemy/ 内的抠图中间产物，算法/参数与 `cutout_floodfill.py` 默认参数收敛。

## 1. 新脚本算法说明（tools/cutout_floodfill.py）

与旧法（`cutout_enemy.py` 逐像素欧氏距离 `d<=3→透明/3<d<19→半透明/否则不透明`）的本质区别：
**先做连通域判断，只有与图像边界连通的近背景区域才被清成透明；内部被包围的深色区域 flood 永不触及。**

核心管线与**三道防线**（代码 docstring 已完整记载，含历史教训）：

1. 背景色 bg：默认四角 8x8 中位色（本次全自动检测 `(0,0,0)`），可 `--bg` 覆盖。
2. 近背景掩膜 near = `d(pixel,bg)<=T`（T 默认 6）。
3. **防线① 边界密封 `--seal N`（默认 2）**：flood 前把 near 腐蚀 N 像素，斩断 <=N 像素宽的细缝/窟窿通道，
   flood 结束后把 bgf 膨胀 N 像素再 ∩ 原 near 还原边界背景、不侵入主体。
   - 数学说明（已在 docstring 写明）：字面"闭运算=先膨胀再腐蚀"不改变 1px 细缝的 4-连通性，无法防漏；
     有效方向是"开运算"（先腐蚀→洪泛→再膨胀）。字面闭运算方向降级为 `--gap`（默认 0=关）。
4. **防线② 种子只允许图像四边像素**：seal>0 时种子＝四边 near 像素派生、深入腐蚀带；主体内部深色区够不着种子。
5. 可选 `--gap N`（默认关）：字面"先膨胀再腐蚀"式缺口桥接，解决边缘小缺口挡住洪水的问题。
6. alpha 基础：bgf→0（RGB 保留原值），其余→255。
7. 边缘羽化 `--feather N`（默认 2）：只对主体侧过渡带套 `(d-3)*16`（3<d<19），更远处一律 255。
8. 闭运算 `--closing N`（默认 1）：alpha>0 掩膜 3x3 闭运算清细小透明孔洞，被补像素置 255。
9. **防线③ 内部镂空回填 `--fix-holes`（默认开，`--no-fix-holes` 关）**：填充+羽化+闭运算后，对
   `alpha==0` 掩膜做边界连通性检查，**不接触图像边界的 alpha==0 连通域视为内部镂空**，
   按原欧氏距离 alpha 回填（d<=3→0，3<d<19→(d-3)*16，d>=19→255），而不是一律清 0。

依赖：优先 `scipy.ndimage`（binary_propagation / binary_closing / label，scipy 1.17.1 可用）；
无 scipy 自动降级为 numpy 手写 3x3 膨胀/腐蚀 + 迭代 BFS（本会话未触发降级）。

调参结论（在 hunter 上实测）：
- `seal=2 + fix-holes=开 + closing=1 + feather=2`＝本轮最终默认，相关图内部孔洞可归零。
- `closing=2` 过度闭运算会把肢体间背景楔子"筑坝"隔断产生假孔洞（最大 7.9 万 px），不可用，已弃用为默认。
- `seal=2` 对纯黑实底背景近似无回退，且 fix-holes 会把封闭背景楔子按 ramp_alpha 回填。

环境：`D:\AI_Tools\ComfyUI\python_embeded\python.exe`（Python 3.13.11，numpy 2.4.4，scipy 1.17.1）；
PATH 上的 `python` 不可用，全程用全路径执行。

## 2. 各文件重抠结论（最终默认参数，stage 输出 `tools/design/final_2008/`）

| 文件 | 背景透明% | 半透明% | 不透明% | 内部孔洞 | 最大孔洞 | 包围盒 |
|---|---|---|---|---|---|---|
| enemy_zombie.png | 89.68 | 0.08 | 10.23 | 0 | 0px | (307,86)-(534,745) |
| enemy_licker.png | 85.12 | 0.39 | 14.49 | 0 | 0px | (30,129)-(733,895) |
| enemy_hunter.png（候选4） | 87.37 | 0.72 | 11.91 | 0 | 0px | (70,116)-(706,946) |
| enemy_guard.png | 90.42 | 0.22 | 9.36 | 0 | 0px | (370,183)-(652,830) |
| enemy_horde.png | 89.92 | 0.19 | 9.89 | 0 | 0px | (185,187)-(540,587) |
| pc_zhengzha.png（c6） | 91.25 | 0.19 | 8.56 | 0 | 0px | (274,94)-(499,684) |

全部 6 张（基于选定候选）**内部孤立透明孔洞 = 0，最大孔洞 = 0px**。
（注：数值来自 `final_2008/` stage 输出的统计；正式部署由主线统一做。）

## 3. 对比表

见 `tools/design/cutout_v2_compare.md`（gen_cutout_compare.py 依 diag_old.json / diag_new.json 生成，含 Δ 行）。

核心数据（v1 → v2 最终，基于选定候选）：
- **hunter**：内部孔洞 **419 → 0**，最大孔洞 **80007px → 0px**（旧 80007px ≈ 280×285，即质检"胸腔镂空"）。
  注意：旧 hunter raw 因生成缺陷自带大块纯黑躯干（v1 如实删空）；选定候选（候选4）为新 raw、无该巨洞，
  flood-fill 直接 0 孔。
- **pc_zhengzha**：内部孔洞 **2050 → 0**，最大 7469px → 0px（基于 c6 候选；c5 因背景泛光已弃）；v1 把黑色
  T 恤/战术裤（被身体边缘包围、远离四边）当背景清空，flood-fill 判断其为内部封闭深色衣物 → 保留为实心衣物。
- **zombie / licker / guard / horde**：内部孔洞 169/231/90/216 → **0/0/0/0**。

## 4. 发现的问题（如实说明）

1. **hunter 旧 raw 是生成缺陷**：早期 raw 中央为整片纯黑躯干（近黑连通域 79,484px，跨 y228-880/x222-545），
   与黑底融合，v1 逐像素法如实删空成"胸腔镂空"。**flood-fill 无法把"原图就是黑"的像素变回不透明**；
   最终选定候选4为新 hunter、无该巨洞，故出 0 孔。若需旧 hunter，应重新生图而非抠图。
2. **pc_zhengzha 顺利修复**：黑 T 恤/战术裤在 v1 被欧氏距离误删（2050 孔），v2 flood-fill 正确保留了
   被包围的黑色衣物 → 0 孔且服装实心。c5 因背景泛光淘汰，c6 新 raw 无光晕残留，最终透明占比 91.25%。
3. **包围盒位移**：zombie/guard/horde 新旧包围盒不同（如 guard 旧 x∈243..525→新 x∈370..652），原因是
   并行管线重排/重生成过 raw；新版严格跟随当前 raw 的 d>=19 主体范围（±1px），属预期而非抠图错误。
4. **统计口径**：本期内部孔洞用 `alpha<=5` 且不接触图像边界的连通域计；含 fix-holes+seal 后已全部归零。

## 5. 遗留事项

- hunter 新候选4 与 pc_zhengzha c6 是否正式部署**听主线指令**；主线定稿后会覆盖 server-rs/。
- 视觉终审：建议用视觉模型对新版成品做最终质检（本任务故未调用视觉模型）。
- 如需回滚：`tools/design/backup_cutout/my_final_pre_2007/`（部署前旧成品）与
  `my_final_pre_deploy_4/`（4 张旧 enemy 覆盖前）均可直接覆盖回 `server-rs/ui/assets/img/`。

## 6. 产出文件清单（均已落盘核验）

- 新脚本：`tools/cutout_floodfill.py`（含三道防线 / docstring 历史教训）
- 诊断脚本：`tools/diag_cutout.py`（未改动）
- 对比生成器：`tools/design/gen_cutout_compare.py`（更新读数要点文本）
- 对比表：`tools/design/cutout_v2_compare.md`
- 数据：`tools/design/diag_old.json`（v1 baseline，未改动）、`tools/design/diag_new.json`（重生成）
- 诊断证据：`tools/design/diag_hunter_holes.txt`（并行管线补写）
- 冻结快照：`tools/design/raw_snapshot_2000/` 与 `tools/design/raw_snapshot_2007/`（候选原图全集）
- 重抠 stage：`tools/design/final_2008/`（6 张 v2 0 孔输出，供对照）
- 备份：`tools/design/backup_cutout/`（旧成品 + my_final_pre_2007 + my_final_pre_deploy_4）
- 部署：**server-rs/ 由主线接管**；本子代理不再写入

未修改 `tools/cutout_enemy.py` 与任何前端 js。所有脚本/报告均为 UTF-8。