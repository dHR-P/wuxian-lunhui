# H3 本地视频生成日志（北京时间 2026-08-27）

- 生成管线：本地 minimax-h3 T2VA（ComfyUI 0.30 @ `D:\AI_Tools\H3_Standard_Preset`）
- 生成脚本：`tools/gen_h3.py`（NVFP4 + SageAttention2，832×480×124 帧 ≈ 5.17s @24fps，14 steps，cfg 3.0）
- 统一 seed：每条约 3-4 分钟（185~215s 热启动），一次一条串行
- 服务端 8192 由 `engine/run_h3.py`（`start_h3.bat`）在本次会话中启动，会话结束仍驻留运行（见文末「遗留」）
- 暂存目录：`C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1\tools\design\video_zhuyuan\`
  验收后由主线复制到 `server-rs\ui\assets\video\`
- 质检模型：`glm-5.3-flash`（tokenrhythm，data URL base64，判据 = 画面符合描述 / 暗调氛围 / 无文字水印 / 无畸变 / 三帧连贯无闪烁）

---

## 1. vid_zy_opening.mp4 —— 咒怨·雨夜凶宅开场

**生成次数 / 耗时：** 2 次
- RUN1 seed=20240901 → 服务端成功但 wrapper 因 GBK print 崩溃、未自动复制 → 手动复制 `t2va_test_00033_.mp4` → FAIL（质检）
- RUN2 seed=20240905 `t2va_test_00035_.mp4` → PASS

**prompt 原文（RUN2 现行）：**
> 深夜深渊般的黑色夜空下，一座日本传统老宅的远景。画面整体极暗，几乎漆黑的天空，无任何亮白云层，只有沉沉夜色。日式木屋与灰瓦屋顶仅被远方极弱的惨绿色调月光勾勒，整体笼罩在浓烈的惨绿+灰蓝冷光中。老宅木质外墙斑驳腐朽，门口地面上放着一双小小的儿童雨鞋，在惨绿月光下显得突兀诡异。屋内门窗缝隙透出幽冷微蓝的灯光。密集雨丝在惨绿冷光中被照亮，夜色里雨势沉闷。氛围极度压抑、阴森、恐怖。镜头从远处缓慢推近大门。画面为静态环境镜头，雨丝与滴水是主要动态，无人物动作惊喜。832x480高分辨率超清，极暗低光环境，深黑色背景，绿色冷调，无任何文字、水印或字幕。

**抽帧判分：**
- RUN1 FAIL：屋顶上方天空发白发亮，呈「阴雨白天」而非「深夜暴雨」；「惨绿」色调缺失。→ 改 prompt 重跑。
- RUN2 PASS：极暗黑夜 + 惨绿/灰蓝冷光成立，儿童雨鞋清晰可见，镜头推进连贯，无文字/水印/畸变/坏帧。（帧：`frames_zy_opening_r2/op_05,25,45.png`）

**dest：** `tools/design/video_zhuyuan/vid_zy_opening.mp4` —— 543,645 B，H.264 832×480 24fps 5.17s

---

## 2. vid_zy_boss.mp4 —— 咒怨·地下室结界决战（伽椰子 BOSS 战）

**生成次数 / 耗时：** 1 次，RUN1 seed=20240902 `t2va_test_00034_.mp4` → PASS（首条即过，含首个 429 退避后成功）

**prompt 原文：**
> 漆黑的神秘地下室内，画面正中央是一块巨大的白色线条结界圈，由发光的白色符文线条在地板上绘制而成。大量浓密乌黑的头发如同潮水般从黑暗中铺满整个地面，覆盖结界圈外围。一个惨白的人形身影正从黑发潮水中缓缓爬出，周身轮廓泛着阴森的惨绿色光芒描边。氛围极度压迫、恐怖、邪异。镜头平稳缓慢地推近中间的结界与白影。832x480高分辨率超清画面，暗黑低光调色，无任何文字、水印或字幕。

**抽帧判分 PASS：** 漆黑室内地面被浓黑长发铺满，中央巨大白色发光符文结界圈完整清晰、圈心淡绿光晕，惨白泛绿身影自发堆中爬出（早期阶段），镜头推进连贯，无文字/水印/畸变/闪烁。（帧：`frames_zy_boss/boss_05,25,45.png`）

**dest：** `tools/design/video_zhuyuan/vid_zy_boss.mp4` —— 1,131,332 B，H.264 832×480 24fps 5.17s

---

## 3. vid_nexus_enter.mp4 —— 主神空间传送

**生成次数 / 耗时：** 2 次
- RUN1 seed=20240903 `t2va_test_00036_.mp4` → FAIL
- RUN2 seed=20240906 `t2va_test_00038_.mp4` → PASS（重跑段曾遇 GLM 429/503 瞬断，帧已落盘，稍后重试成功）

**prompt 原文（RUN2 现行）：**
> 主神空间的半圆形巨大广场，中央环形浅色石阶广场。一名观者的低视角从广场正中央的地面巍峨仰望上方的宏伟穹顶，一座由纯白圣光汇聚成的巨大光柱自穹顶正中倾泻而下。镜头保持低角度仰视，光柱自上而下贯穿画面中央，光芒耀眼夺目，但四周围绕广场的浅色石质环形台阶与穹顶拱形结构依然清晰可辨，暗部层次保留，未全屏过曝。柱体边缘有细碎光尘与光雾缓缓飘散，科幻与神圣庄严感兼具。832x480高分辨率超清，整体偏亮但明暗层次分明，光柱亮而背景细节可见，无任何文字、水印或字幕。

**抽帧判分：**
- RUN1 FAIL：镜头为高空俯视而非「广场中央向上仰视」；帧2-帧3 严重过曝、帧3 近全白无场景信息。→ 改 prompt 重跑。
- RUN2 PASS：低角度仰视光柱意图明确；光柱贯穿画面但穹顶肋拱与浅色石阶清晰可辨、暗部保留；光柱呼吸式脉动连贯；无文字/水印/畸变/坏帧。（帧：`frames_nexus_r2/nx_05,25,45.png`）

**dest：** `tools/design/video_zhuyuan/vid_nexus_enter.mp4` —— 895,920 B，H.264 832×480 24fps 5.17s

---

## 4. vid_moshi_intro.mp4 —— 末世死城·兽潮围城

**生成次数 / 耗时：** 1 次，RUN1 seed=20240904 `t2va_test_00037_.mp4` → PASS（一条即过）

**prompt 原文：**
> 黄昏时分的末世死城城墙全景，厚实斑驳的灰色砖石城墙，天空被落日染成橙灰色，暮色沉重压抑。城墙之外的地平线尽头，无边无际的兽潮与漫天烟尘正缓缓逼近。城墙头沿线上布置着重武器阵地，炮口与火光交错闪动，零星火光在暮色中明明灭灭。整幅画面弥漫着末日血战的惨烈与肃杀氛围。镜头缓慢推近城墙。832x480高分辨率超清画面，暗黑低光调色，无任何文字、水印或字幕。

**抽帧判分 PASS：** 橙灰落日天空、厚实斑驳灰砖城墙主体、城头重武器开火光，墙外地平线兽潮剪影与升腾烟柱，三帧镜头推进连贯、风格统一，枪口火光为合理动态光效，无文字/水印/畸变/坏帧。（帧：`frames_moshi/ms_05,25,45.png`）

**dest：** `tools/design/video_zhuyuan/vid_moshi_intro.mp4` —— 981,807 B，H.264 832×480 24fps 5.17s

---

## 汇总

| 资源 | 生成次数 | 最终状态 | 抽帧判分 | dest 大小 |
|---|---|---|---|---|
| vid_zy_opening | 2 | PASS | 1 FAIL→1 PASS | 543,645 B |
| vid_zy_boss | 1 | PASS | PASS | 1,131,332 B |
| vid_nexus_enter | 2 | PASS | 1 FAIL→1 PASS | 895,920 B |
| vid_moshi_intro | 1 | PASS | PASS | 981,807 B |

- 4/4 全部 PASS，均在暂存目录 `tools/design/video_zhuyuan/`（合规，待主线验收后部署到 `server-rs\ui\assets\video\`）
- 抽帧图与完整模型评语见 `tools/design/frames_*` 及 `tools/design/h3_qc_out.md`
- 质检脚本：`tools/design/h3_qc_glm.py`

## 遗留 / 建议

- **H3 服务器仍在运行**（本次会话由本子代理启动：`engine/run_h3.py` @ 127.0.0.1:8192，日志 `logs/h3_server_stdout/stderr.log`）。如需停止可运行 preset 的 `stop_h3.bat` 或结束该进程；主线后续如还有生成需求可保留复用。
- **ffmpeg 问题**：系统 PATH 的 `C:\Windows\ffmpeg.exe` 执行即崩（0xC0000005），本次改用 preset 内嵌 `engine\python_embeded\Lib\site-packages\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v7.1.exe` 抽帧成功。后续 QC 请沿用此路径（或修好系统 ffmpeg）。
- **运行技巧**：执行 `gen_h3.py` 与 QC 脚本时务必 `$env:PYTHONIOENCODING="utf-8"`，否则 GBK 控制台打印中文会 UnicodeEncodeError 崩溃（首条即踩坑）。
- **seed 建议**：本批次用了不同 seed（20240901/2/3/4/5/6）。如需复现/改版，可按上述对应 seed 重跑；H3 对同 seed 同 prompt 结果稳定可复现。
- **GLM 限流**：QC 遇 429 会 15s×5 退避，偶发 503 需手动稍后重试；对成功落盘帧直接重跑 QC 即可，无需重生成。