# 剑冢禁地 素材生成日志（jianzhong_assets_log.md）

> 子代理：剑冢禁地·素材生成（deepseek-v4-flash-0731 编程/编排）
> 生图模型：tokenrhythm `wan2.7-image`（768×1024 立绘 / 1024×768 场景，0.2 元/张）
> 视觉质检：tokenrhythm `glm-5.3-flash`（data URL base64 传图，max_tokens≥4000）
> 依据：`design/zhttty_universe/xiaxing_tianxia/jianzhong.md` §5/§9
> 预算：不设限。**本批次花费合计 ≈ 3.2 RMB（16 张×0.2）**
> 状态：raw 存 `tools/design/raw_jianzhong/`，抠图存 `tools/design/cutout_out/`，**未部署**。

---

## 一、BOSS 立绘

### boss_jianling —— 剑冢之灵（剑魔残魂）
- **目标**：千百枯剑聚成的白发剑灵，金瞳，周身万剑绕行（jianzhong.md §5/§9）。
- **生成过程**：
  - v1（`boss_jianling.png`）：QC FAIL —— 背景带灰雾纹理非纯黑；边缘青白辉光大面积泄入背景；脚未贴底裁切。
  - v2（`boss_jianling_v2.png`）：QC FAIL —— 角色全身白色描边/贴纸式勾边；衣袍非暗色；脚掌未贴底。
  - v3（`boss_jianling_v3.png`）：QC **PASS** —— 背景绝对纯黑实心、无雾无辉光；暗铁剑刃聚合身影偏暗哑光；无轮廓线/描边；脚与袍下摆贴底裁切；轮廓完整。
- **抠图**：`cutout_floodfill.py in out 16 --seal 2 --closing 1 --feather 2 --hole-channel 6 --hole-solid --zero-rgb`
  - `cutout_out/boss_jianling_cut.png`：alpha≤5 透明 64.1%，不透明 35.8%，半透明 0.1%（边缘羽化）。
  - 数值复核：透明像素 RGB 全 0 ✅；边缘过渡带 mean-lum 9.4/max 18（暗，无亮白描边）✅；主体仅 27 个孤立 1px 亮像素贴边（金瞳/白发自然亮部，非白描边）✅。
  - glm 终审（棋盘格）：**PASS** —— 背景完全透明、轮廓完整无镂空、无白边/色晕、暗铁袍与黑区分。
- **质感判分**：生图 raw 8.5/10；抠图数值 9/10；glm 终审 **PASS**。
- **花费**：0.6 元（3 次生成）。

---

## 二、场景背景（空镜，禁人物）

| 输出 | 主题 | QC 轮次 | 结论 | 花费 |
|---|---|---|---|---|
| `jz_bg_l1_shanmen_v2.png` | L1 山门古道雾景（素面石坊+灰雾） | v1 FAIL（石坊匾额/石碑出现刻字）→ v2 **PASS**（素面无字） | PASS | 0.4 |
| `jz_bg_l2_changlang.png` | L2 埋剑长廊（两侧剑列微光） | v1 **PASS** | PASS | 0.2 |
| `jz_bg_l3_shengu.png` | L3 剑冢深谷（幽暗谷壁+石冢残碑剪影） | v1 **PASS** | PASS | 0.2 |
| `jz_bg_l4_jianbei_v2.png` | L4 无名剑碑之巅（夕照巨碑+万剑） | v1 FAIL（巨碑竖直碑文刻字）→ v2 **PASS**（仅剑痕无字） | PASS | 0.4 |

- 终审（glm）：**L1/L2/L3/L4 全部 PASS** —— 均无人物/人形，主题色调契合，无文字/水印/logo，构图空间感合格。
- 已采用文件：`raw_jianzhong/jz_bg_l1_shanmen_v2.png`、`jz_bg_l2_changlang.png`、`jz_bg_l3_shengu.png`、`jz_bg_l4_jianbei_v2.png`（v1 作废不在部署建议内）。
- **花费：1.2 元（6 次生成）**。

---

## 三、敌人立绘（高优先 3-4 张）

| 目标 | 生成 | QC | 抠图 | 终审 | 花费 |
|---|---|---|---|---|---|
| 守墓剑仆·灰袍 | `enemy_jipu.png` | v1 **PASS** | `cutout_out/enemy_jipu_cut.png`（透明 65.8%，RGB 全 0，边缘暗） | **PASS** | 0.2 |
| 入魔剑客·残影 | `enemy_rumoke_v2.png` | v1 FAIL（不透明缺残影）→ v2 **PASS**（半透明残影+黑魔气） | `cutout_out/enemy_rumoke_cut.png`（透明 58.8%，RGB 全 0，边缘 mean 9.6） | **PASS**（见终审） | 0.4 |
| 锈剑傀儡 | `enemy_jiangu_v2.png` | v1 FAIL（未贴底满高/眼窝非碎刃/躯干非拼接）→ v2 FAIL（小腿中部被裁断非全身、色调偏亮银非锈、眼窝碎刃不清） | —（未抠图） | **FAIL**（超出重构次数） | 0.4 |
| 剑冢怨灵·游魂 | `enemy_yuanling_v2.png` | v1 FAIL（未贴底/白色辉光泄底/非纯黑角）→ v2 FAIL（仍亮白辉光描边泄底、脚未贴底） | —（未抠图） | **FAIL**（超出重构次数） | 0.4 |

- **质量判定**：已 PASS 2 张（守墓剑仆·灰袍、入魔剑客·残影）完成抠图并通过终审，可作为优先部署替身。
- **锈剑傀儡 / 剑冢怨灵 FAIL 说明**：两版均被 wan 构图固有缺陷影响——全娇躯干被中段截断（jiangu）、白辉光/描边泄底与脚不贴底（yuanling）、锈蚀感不足（jiangu）。共消耗 4 次生成未达"全身贴底+无白边+锈旧/淡光设定"综合标准，按"每条≤2 次"封顶作废。**建议主线后续排期用本地 Z-Image 或换 seed/局部重绘处理**，或按 §9 暂用变体替身过渡。
- **花费：1.4 元（7 次生成）**。

---

## 四、累计与待部署建议

- **累计花费：3.2 元（16 张 0.2 元/张）**。
- **质检汇总**：
  - raw BOSS PASS；raw 场景 4/4 PASS；raw 敌人 2 PASS / 2 FAIL。
  - 抠图终审：BOSS PASS、守墓剑仆 PASS、入魔剑客 PASS（棋盘格 glm 终审 + 透明 RGB=0 数值复核）。
- **待部署建议文件名**（复制到 `server-rs/ui/assets/img/`，由主线验收后定）：
  - BOSS：`boss_jianling.png`（源 `cutout_out/boss_jianling_cut.png`）
  - 敌人：`enemy_jipu.png`（守墓剑仆·灰袍）、`enemy_rumoke.png`（入魔剑客·残影）
  - 背景：`bg_jz_l1_shanmen.png`→`jz_bg_l1_shanmen_v2.png`、`bg_jz_l2_changlang.png`→`jz_bg_l2_changlang.png`、`bg_jz_l3_shengu.png`→`jz_bg_l3_shengu.png`、`bg_jz_l4_jianbei.png`→`jz_bg_l4_jianbei_v2.png`
- **未完成/待补**：锈剑傀儡、剑冢怨灵两张敌人立绘 FAIL（需另排期）；剑碑守卫·双剑、剑心幻影等 §9 其余新美术未做（本轮只做高优先子集）。