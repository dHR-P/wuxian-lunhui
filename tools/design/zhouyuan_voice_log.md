# 《咒怨》本地配音素材 · 全流程日志

- 素材子代理（模型 tokenrhythm/deepseek-v4-flash-0731）生成。
- 配音管线：Qwen3-TTS CustomVoice 0.6B（权重 `D:\AI_Tools\qwen3_tts_customvoice`）。
- 运行环境：`D:\ai_vllm_env\Scripts\python.exe`（经验证装有 qwen_tts+torch；ComfyUI python 亦装有，作为备选）。
- 输出：先写 `tools/design/audio_zhouyuan/*.wav`（暂存），**不**直接写 `server-rs/ui/assets/audio`。部署待主线验收。
- 生成脚本：`tools/gen_tts_zhouyuan.py`（仿 gen_tts3，未改任何既有文件）；清单 `tools/assets_manifest_zhouyuan.json`。

---

## 一、台词清单（场景 → 台词 → speaker → 音色）

模型 supported_speakers：`aiden, dylan, eric, ono_anna, ryan, serena, sohee, uncle_fu, vivian`。
无专用「女声低语」speaker → 伽椰子用 `ono_anna`（女声）+ instruct 压低/气声低语实现；俊雄用 `serena`（童声）；
主神系统音 / 队友资深者 / 旁白张杰 → 复用主线风格 `uncle_fu`（低沉男声）。

| voice id | 引用场景 | speech 段落 / 台词 | speaker | 音色（speaker+instruct） |
|---|---|---|---|---|
| `vo_zy_mission` | zy_01 | 主神发布：「主线任务：在佐伯家宅邸内存活至清晨六点，并调查怨念之源。」 | 主神(系统音) | Uncle_Fu 低沉缓慢冰冷系统男声 |
| `vo_zy_mission_pact` | zy_01 | 主神签约：「任务完成前，禁止离开宅邸。失败代价：被咒入二重死。」 | 主神(系统音) | Uncle_Fu 沉冷慎重系统男声 |
| `vo_zy_kayako_growl` | zy_boss_round / zy_15_fight | 伽椰子喉音：「嘎——」 | 伽椰子(女声低语) | ono_anna 嘶哑喉音拖长 |
| `vo_zy_kayako_leave` | zy_15_fight | 伽椰子：「谁，也别想离开这栋房子。」 | 伽椰子(女声低语) | ono_anna 阴森低语气声 |
| `vo_zy_kayako_sympathy` | zy_11_mourned | 伽椰子(默哀)：「……你在，同情我？」 | 伽椰子(女声低语) | ono_anna 鬼魂般虚弱低语 |
| `vo_zy_kayako_defeat` | zy_17_lose | 伽椰子(败北)：「我说过，谁也别想离开。」 | 伽椰子(女声低语) | ono_anna 阴冷贴耳低语 |
| `vo_zy_kayako_thank` | zy_11_mourned | 伽椰子(释然)：「……谢谢你。」 | 伽椰子(女声低语) | ono_anna 极轻释然叹息女声 |
| `vo_zy_toshio_meow` | zy_03_back / zy_04 | 俊雄：「喵——」 | 俊雄(童声) | serena 清亮而空洞童声猫叫 |
| `vo_zy_toshio_come` | zy_04 | 俊雄：「……来呀。」 | 俊雄(童声) | serena 苍白空洞童声气声 |
| `vo_zy_toshio_thanks` | zy_10_toshio_win | 俊雄(安全线)：「谢谢你，请我吃饭。」 | 俊雄(童声) | serena 稚嫩天真童声 |
| `vo_zy_senior_hint` | zy_04 | 队友资深者(幕2提示)：「别回头。让猫走前面。」 | 队友(资深者男声) | Uncle_Fu 压低紧张老手提醒 |
| `vo_zy_senior_wall` | zy_05 | 队友资深者(幕3)：「壁纸……它在动！」 | 队友(资深者男声) | Uncle_Fu 急促压抑惊恐低喊 |
| `vo_zy_senior_lock` | zy_02 | 队友资深者(锁宅)：「这栋房子在锁你了。从现在起，每一项调查，都在和它赛跑。」 | 队友(资深者男声) | Uncle_Fu 老练低语一字一顿 |
| `vo_zy_narrator_zhangjie` | 旁白/张杰预告 | 张杰预告：「下一场是个鬼宅。别带太多新人，会死的。」 | 旁白(张杰男声) | Uncle_Fu 低沉老练略带嘲讽 |

> 注：环境音轨（连雨声 / 拍球声 / 爬行声 / 钟摆）为触发式 loop 音效，非 TTS 台词，不在本清单；仅记录于设计文档 §9.4，供主线后续接前端音效。

- 台词来源：`design/zhttty_universe/wuxian_kongbu/zhouyuan.md §9.4 配音台词候选` + `server-rs/src/scenes_zhouyuan.rs` 各 `SceneDef.speaker`/正文说话人段落手动提取对齐。

---

## 二、生成 wav 清单（id / speaker / 大小 / 时长）✅ 全部成功

输出目录：`tools/design/audio_zhouyuan/`（14 条全部生成，`_generate_summary.json` 汇总）。格式 24kHz / 16bit / 单声道。

| id | speaker | 大小(B) | 时长(s) | 状态 |
|---|---|---|---|---|
| vo_zy_mission | Uncle_Fu | 414764 | 8.64 | ✅ |
| vo_zy_mission_pact | Uncle_Fu | 395564 | 8.24 | ✅ |
| vo_zy_kayako_growl | ono_anna | 96044 | 2.00 | ✅ |
| vo_zy_kayako_leave | ono_anna | 207404 | 4.32 | ✅ |
| vo_zy_kayako_sympathy | ono_anna | 184364 | 3.84 | ✅ |
| vo_zy_kayako_defeat | ono_anna | 165164 | 3.44 | ✅ |
| vo_zy_kayako_thank | ono_anna | 92204 | 1.92 | ✅ |
| vo_zy_toshio_meow | serena | 76844 | 1.60 | ✅ |
| vo_zy_toshio_come | serena | 53804 | 1.12 | ✅ |
| vo_zy_toshio_thanks | serena | 111404 | 2.32 | ✅ |
| vo_zy_senior_hint | Uncle_Fu | 130604 | 2.72 | ✅ |
| vo_zy_senior_wall | Uncle_Fu | 142124 | 2.96 | ✅ |
| vo_zy_senior_lock | Uncle_Fu | 391724 | 8.16 | ✅ |
| vo_zy_narrator_zhangjie | Uncle_Fu | 318764 | 6.64 | ✅ |

---

## 三、生成记录（每条目：成功/失败/重试）

运行命令：`D:\ai_vllm_env\Scripts\python.exe tools/gen_tts_zhouyuan.py`

- 14/14 条 **首次尝试即成功**，无失败、无重试（used 指定 speaker）。
- 环境告警（无害）：`sox` 未安装仅出现在 stderr 提示，不影响基础生成（Qwen3-TTS 自行用 PyTorch 手动实现推理）。
- QC 自检（`tools/design/_qc_zhouyuan_voice.py`）：文件存在、>0 字节、时长>0.5s，14 条全部 OK。

---

## 四、wav 格式说明

- 生成用 `sf.write(path, wavs[0], sr)`，sr 为模型原生采样率（Qwen3-TTS 输出 24000Hz / 16bit / 单声道）。
- 既有 `server-rs/ui/assets/audio/*.wav` 实测同为 **24kHz 16bit 单声道**（如 vo_mission.wav: samplerate 24000 / PCM_16 / mono）。
- 因此与既有管线保持完全一致；任务所述「44.1k」与既有实际不符，**以既有一致为准**（24k/16bit）。如需 44.1k 可后续前端 AudioContext 重采样，或部署时统一重采样。

---

## 五、部署建议：场景 `voice:` 字段映射

> 部署时把 `tools/design/audio_zhouyuan/*.wav` 拷入 `server-rs/ui/assets/audio/`，并在 `scenes_zhouyuan.rs` 对应 SceneDef / OverlayDef 的 `voice:` 字段填 wav id（不含 .wav）。

| 场景 id | 建议 `voice:` 值 | 对应 wav | 备注 |
|---|---|---|---|
| zy_01（主神发布） | `vo_zy_mission` | vo_zy_mission.wav | 主神冷系统音 |
| zy_01（签约/失败代价） | 可并 `vo_zy_mission_pact`（随场景多段文本顺序播） | vo_zy_mission_pact.wav | 复用一个 voice 槽可拼长时间线 |
| zy_04（俊雄引路） | `vo_zy_toshio_come` | vo_zy_toshio_come.wav | 童声引诱 |
| zy_04（队友提示） | `vo_zy_senior_hint` | vo_zy_senior_hint.wav | 需多个 voice 时前端循环播 |
| zy_05（壁纸它在动） | `vo_zy_senior_wall` | vo_zy_senior_wall.wav | 队友惊恐低喊 |
| zy_10_toshio_win（安全线） | `vo_zy_toshio_thanks` | vo_zy_toshio_thanks.wav | 「谢谢你，请我吃饭」 |
| zy_11_mourned（默哀） | `vo_zy_kayako_thank` | vo_zy_kayako_thank.wav | 释然「谢谢你」 |
| zy_11_mourned（质问） | 可选 `vo_zy_kayako_sympathy` | vo_zy_kayako_sympathy.wav | 「你在，同情我？」 |
| zy_15_fight（打响） | `vo_zy_kayako_leave` | vo_zy_kayako_leave.wav | 「谁，也别想离开」 |
| zy_boss_round（狂暴喉音） | `vo_zy_kayako_growl` | vo_zy_kayako_growl.wav | 「嘎——」循环短音 |
| zy_17_lose（二重死） | `vo_zy_kayako_defeat` | vo_zy_kayako_defeat.wav | 「我说过，谁也别想离开」 |
| 旁白/张杰预告（主神空间入口） | `vo_zy_narrator_zhangjie` | vo_zy_narrator_zhangjie.wav | 复用主线 vo_zhangjie 同声线 |

> 注意：`scenes_zhouyuan.rs` 目前所有 SceneDef 的 `voice: None`，OverlayDef 亦 `voice: None`；部署时按上表回填即可（属主线后期改动，本子代理不越权改 .rs）。`zy_02` 资深者锁宅 可选用 `vo_zy_senior_lock`（文本较长，建议作长台词一格）。