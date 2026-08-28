# 角色立绘视觉质检报告 —「挣扎者」pc_zhengzha（pc_wan2.png）

- **被检图片**：`C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1\tools\design\raw_enemy\pc_wan2.png`
- **图片规格**：768x1024 PNG
- **设定参考**：中国青年男性灾难幸存者变异体、破旧工装、四肢扭曲、丧尸化、纯黑背景、全身像、脚底贴画面底缘，用于 2D 行走动画序列帧
- **质检模型**：tokenrhythm `qwen3.7-flash`（视觉语言模型，读图判图）
- **质检方式**：调用 `https://tokenrhythm.studio/v1/chat/completions`（OpenAI 兼容接口，data URL base64 传图，max_tokens=4000），以 Node.js `fetch` 实现

---

## 一、API 调用情况

**调用成功。** 实际通过 Node v24 `fetch` 调用 tokenrhythm API：

- 模型：`qwen3.7-flash`
- 首次调用即返回 HTTP **200**（无需重试/无 504 / 429）
- 回复正文落在 `choices[0].message.content`（非空），`reasoning_content` 亦有完整推理过程
- 原始结果已存档：`qc_wan_pc2_result.json`（含 content 与 reasoning 原文）

> 说明：`qw` 脚本在运行结束后退出码为 1，但这是 Node.js 在 Windows 上的一个已知良性 `uv async` 断言（进程退出清理问题），与 API 是否成功无关——结果已成功写入 JSON 文件，接入成功。

---

## 二、逐项核验结果（qwen3.7-flash 结论）

| # | 检查项 | 结论 | 依据 |
|---|--------|------|------|
| 1 | 全身完整无裁剪（头顶/脚底） | ✅ 合格 | 头顶与脚底均在画面内，无裁剪 |
| 2 | 脚部贴底缘；双脚完整清晰 | ❌ 不合格 | **脚底下方有明显留白**，双脚踩在带反光的地面上，未贴画面底缘；底部留白过多，不符合行走序列帧规范 |
| 3 | 双手/手指清晰分开无粘连 | ✅ 合格 | 双手握拳、手部轮廓清晰，无 AI 常见粘连；握拳态虽看不到指缝但结构正常 |
| 4 | 躯干/四肢造型饱满；有丧尸变异扭曲感 | ❌ 不合格 | 四肢比例正常、肌肉饱满，但**完全没有四肢扭曲/丧尸化/变异特征**；服装为整洁蓝灰 T 恤+工装裤，不符合"破旧工装" |
| 5 | 纯黑干净背景，无白框/光晕/噪点/文字 | ❌ 不合格 | **背景并非纯黑**：底部存在灰色地面过渡、环境光反射及角色投影，不利透明通道抠图 |
| 6 | 横向 bbox 撑满全宽的原因判定 | ❌ 需修 | 模型判定主体为**居中构图**，两侧有大量黑/深灰留白，并未横向撑满；与数值体检"bbox 撑满全宽"存在不一致（见下） |
| 7 | 整体光影自然（无过曝/死黑） | ⚠️ 部分 | 光影自然、无过曝或死黑，但属标准人像摄影打光，带地面与环境反射，**不符合纯黑资产要求** |

---

## 三、最终判定：**需重生成**

**核心理由：**
1. **图像完全偏离核心设定** —— 呈现的是健康、正常、衣着整洁的男性人像，缺乏丧尸化、变异、破旧、四肢扭曲等怪物「挣扎者」的全部关键特征，等于画错了对象。
2. **背景与构图不符合资产规范** —— 背景非纯黑、底部有地面反光/投影、脚未贴底缘，直接破坏 2D 行走动画序列帧的黑底抠图管线要求。
3. qwen 视觉判定在脚部留白、横向撑满两点上与**数值体检（主体纵向占比 0.959 / 底留白 0px / 横向撑满全宽）冲突**——疑为图中存在地面反光区域被数值版误判为主体内容，或 qwen 视觉感知对反光/留白的归类不同；无论以哪种为准，**底部反光+非纯黑背景本身即不合格**，需重生成。

---

## 四、Prompt 修正要点（重生成时使用）

1. **强化设定与恐怖/变异风格**：明确写入 `zombie mutation, distorted limbs, torn and dirty work clothes, pale sickly skin, decayed features`，并加强制风格词 `horror game concept art, dark fantasy monster`。
2. **规范构图与背景**：明确 `pure black background, no floor reflection, no shadow, full body shot, feet touching bottom edge, body filling frame width`，以保证纯黑干净、脚贴底缘、可干净抠图。

---

*报告基于 qwen3.7-flash 对原图的直接视觉核验，判定「需重生成」（观测证据充分，非臆造）。*