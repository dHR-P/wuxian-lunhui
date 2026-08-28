# Z宇宙四副本配音素材日志

> 素材子代理 · tokenrhythm/deepseek-v4-flash-0731 · 本地 TTS 生成（不计费，可重试）
> 管线复用咒怨成品（gen_tts3.py / gen_tts_zhouyuan.py），Qwen3-TTS CustomVoice 0.6B
> 权重 `D:\AI_Tools\qwen3_tts_customvoice`，运行 `D:\ai_vllm_env\Scripts\python.exe`，`$env:PYTHONIOENCODING="utf-8"`
> 输出暂存 `tools/design/audio_z_worlds/*.wav`（24kHz/16bit/单声道，与既有管线一致），**不部署、不改任何 .rs/.js/json 既有文件**。
> manifest：`tools/assets_manifest_zy_worlds.json`（新建）｜生成脚本：`tools/gen_tts_z_worlds.py`（新建）

生成时间：2026-04-14 起・后台任务 pwsh-81

---

## 一、台词清单（33 条）与音色映射

> 台词取自各副本设计文档 §9 配音候选 + `server-rs/src/scenes_*.rs` 的 speaker 行与正文（开场 / NPC 对话 / BOSS / 结算）。
> 音色限定模型 supported_speakers：`aiden/dylan/eric/ono_anna/ryan/serena/sohee/uncle_fu/vivian`。

### 末世死城（scenes_moshi.rs）— 8 条
| id | speaker | scene | voice | instruct 摘要 |
|---|---|---|---|---|
| vo_moshi_commander_tide | 指挥官·广播 | ms_00 | uncle_fu | 沙哑急促广播 |
| vo_moshi_commander_fire | 指挥官·授权 | ms_reactor_done/ms_f4 | uncle_fu | 沉冷命令 |
| vo_moshi_minuteman_last | 民兵队长 | ms_00_minuteman | uncle_fu | 哑吼决绝 |
| vo_moshi_cityman | 民兵·口号 | ms_lose | uncle_fu | 低沉坚定 |
| vo_moshi_child | 幸存者孩童 | 幸存者线 | serena | 童声微颤 |
| vo_moshi_doctor | 军医 | ms_medic_win | uncle_fu | 疲惫温和 |
| vo_moshi_commander_auth | 老指挥官 | ms_reactor_done | uncle_fu | 缓沉预示 |
| vo_moshi_beast_growl | 狂化攻城巨兽·低吼 | ms_f4_boss | ono_anna | 气声嘶吼(短) |

### 银色大地（scenes_yinse.rs）— 8 条
| id | speaker | scene | voice | instruct 摘要 |
|---|---|---|---|---|
| vo_yinse_liming_start | 李铭·记录员 | ys_00 | uncle_fu | 平静档案 |
| vo_yinse_liming_refuse | 李铭·记录员 | ys_00_refuse | uncle_fu | 无温度压迫 |
| vo_yinse_asang | 阿桑·少年 | ys_03_asang_win | serena | 年少颤动 |
| vo_yinse_xiaoshu | 小枢·机械童声 | ys_08_xiaoshu | serena | 冷空机械童声 |
| vo_yinse_waro_truth | 瓦罗残响 | ys_12_truth_talk | uncle_fu | 悲怆空旷 |
| vo_yinse_taiyi | 东皇太一投影 | ys_waR0_cast | uncle_fu | 威压审判 |
| vo_yinse_wuming | 吴明·录音旁白 | ys_15_ending_fire | uncle_fu | 沙哑旧磁带 |
| vo_yinse_liming_done | 李铭·结算 | ys_15/16 | uncle_fu | 平静释然 |

### 异形4（scenes_yiying.rs）— 9 条
| id | speaker | scene | voice | instruct 摘要 |
|---|---|---|---|---|
| vo_yiying_zhangshen | 张杰·开场 | yiy_s0_arrive | uncle_fu | 老练嘲讽 |
| vo_yiying_missiongod | 主神·系统音 | yiy_s0_arrive | uncle_fu | 冰冷一字一顿 |
| vo_yiying_father_quarantine | Father(AI) | yiy_s1_hall | serena | 冷冽失真 (压低) |
| vo_yiying_father_material | Father(AI) | yiy_s3_father | serena | 冷冽近温柔 |
| vo_yiying_kall | 考尔 | yiy_s3_father | sohee | 清亮压抑 |
| vo_yiying_puvisi | 普维斯·被寄生者 | yiy_s4 | ono_anna | 痛苦气声 |
| vo_yiying_queen_roar | 异形皇后·咆哮 | yiy_s_queen_start | ono_anna | 嘶裂气声(短) |
| vo_yiying_father_evac | Father·终局 | yiy_s7_evac | serena | 冷漠失真 |
| vo_yiying_zhangshen_material | 张杰·警示 | yiy_s0_arrive | uncle_fu | 老练自嘲 |

### 天蛇（scenes_tianshe.rs）— 8 条
| id | speaker | scene | voice | instruct 摘要 |
|---|---|---|---|---|
| vo_tianshe_mulaba_name | 穆拉巴·族长 | ts_act6_core | uncle_fu | 压抑暴怒「材料论」 |
| vo_tianshe_mulaba_chushe | 穆拉巴·宣言 | ts_act6_core | uncle_fu | 狂热亢奋 |
| vo_tianshe_mulaba_snake | 穆拉巴·弃战 | ts_boss1_retreat | uncle_fu | 嘶吼疯狂 |
| vo_tianshe_alian | 阿莲·药婆 | ts_npc_alien | sohee | 颤抖坚定 |
| vo_tianshe_laoshi | 老石·铁匠 | ts_act5_temple | uncle_fu | 低沉宽厚 |
| vo_tianshe_jun | 钧·镜像留音 | ts_npc_jun | uncle_fu | 平静想通 |
| vo_tianshe_liming | 李铭·旁白结算 | ts_finish | uncle_fu | 平静疏离 |

合计 32 条（末世死城 8 / 银色大地 8 / 异形4 9 / 天蛇 7）。巨兽/皇后低吼类设计为短气声，其余为完整台词。

---

## 二、生成结果 wav 清单（id / 大小 / 时长）

> 下方由 `tools/design/audio_z_worlds/_generate_summary.json` 汇总，生成完成后回填。

| id | size(Byte) | dur(s) | speaker | attempt |
|---|---|---|---|---|
| vo_moshi_commander_tide | 407084 | 8.48 | uncle_fu | 1 |
| vo_moshi_commander_fire | 322604 | 6.72 | uncle_fu | 1 |
| vo_moshi_minuteman_last | 199724 | 4.16 | uncle_fu | 1 |
| vo_moshi_cityman | 115244 | 2.40 | uncle_fu | 1 |
| vo_moshi_child | 184364 | 3.84 | serena | 1 |
| vo_moshi_doctor | 403244 | 8.40 | uncle_fu | 1 |
| vo_moshi_commander_auth | 445484 | 9.28 | uncle_fu | 1 |
| vo_moshi_beast_growl | 357164 | 7.44 | ono_anna | 1 |
| vo_yinse_liming_start | 867884 | 18.08 | uncle_fu | 1 |
| vo_yinse_liming_refuse | 595244 | 12.40 | uncle_fu | 1 |
| vo_yinse_asang | 403244 | 8.40 | serena | 1 |
| vo_yinse_xiaoshu | 433964 | 9.04 | serena | 1 |
| vo_yinse_waro_truth | 672044 | 14.00 | uncle_fu | 1 |
| vo_yinse_taiyi | 165164 | 3.44 | uncle_fu | 1 |
| vo_yinse_wuming | 771884 | 16.08 | uncle_fu | 1 |
| vo_yinse_liming_done | 245804 | 5.12 | uncle_fu | 1 |
| vo_yiying_zhangshen | 695084 | 14.48 | uncle_fu | 1 |
| vo_yiying_missiongod | 514604 | 10.72 | uncle_fu | 1（已修复台词重生成） |
| vo_yiying_father_quarantine | 510764 | 10.64 | serena | 1 |
| vo_yiying_father_material | 372524 | 7.76 | serena | 1 |
| vo_yiying_kall | 280364 | 5.84 | sohee | 1 |
| vo_yiying_puvisi | 403244 | 8.40 | ono_anna | 1 |
| vo_yiying_queen_roar | 1056044 | 22.00 | ono_anna | 1（时长偏长，见遗留） |
| vo_yiying_father_evac | 226604 | 4.72 | serena | 1 |
| vo_yiying_zhangshen_material | 261164 | 5.44 | uncle_fu | 1 |
| vo_tianshe_mulaba_name | 314924 | 6.56 | uncle_fu | 1 |
| vo_tianshe_mulaba_chushe | 652844 | 13.60 | uncle_fu | 1 |
| vo_tianshe_mulaba_snake | 337964 | 7.04 | uncle_fu | 1 |
| vo_tianshe_alian | 261164 | 5.44 | sohee | 1 |
| vo_tianshe_laoshi | 391724 | 8.16 | uncle_fu | 1 |
| vo_tianshe_jun | 280364 | 5.84 | uncle_fu | 1 |
| vo_tianshe_liming | 430124 | 8.96 | uncle_fu | 1 |

---

## 三、失败 / 重试记录

| id | 初次 speaker | 重试顺序 | 最终 |
|---|---|---|---|
| （无） | — | — | 32 条全部 attempt=1 一次成功，无失败无换音色 |

规则：单条最多尝试 3 次；首次 manifest 指定 speaker，失败/时长<0.5s 则按「男声族 / 女声族 / 气声族」回退一次，再回退一次。本次无命中回退。

---

## 四、建议部署时 scenes_*.rs 的 voice 字段映射

> 说明：**不改任何 .rs 文件**。以下为建议，供主线部署时在对应 `SceneDef { .. speaker, voice: None }` 填 `voice: Some("vo_xxx")`，或在场景文本叠加层配置时引用。dsh/前端如何消费 voice 依既有引擎约定。

| scenes 文件 | 场景（scene id） | 建议 voice id | 对应角色 |
|---|---|---|---|
| scenes_moshi.rs | ms_00 | vo_moshi_commander_tide | 指挥官广播 |
| scenes_moshi.rs | ms_reactor_done | vo_moshi_commander_auth | 老指挥官 |
| scenes_moshi.rs | ms_reactor_done / ms_f4 | vo_moshi_commander_fire | 指挥官授权 |
| scenes_moshi.rs | ms_00_minuteman | vo_moshi_minuteman_last | 民兵队长 |
| scenes_moshi.rs | ms_lose | vo_moshi_cityman | 民兵口号「城在，人在」 |
| scenes_moshi.rs | ms_medic_win | vo_moshi_doctor | 军医 |
| scenes_moshi.rs | （幸存者线节点） | vo_moshi_child | 孩童 |
| scenes_moshi.rs | ms_f4_boss | vo_moshi_beast_growl | 攻城巨兽低吼 |
| scenes_yinse.rs | ys_00 | vo_yinse_liming_start | 李铭 |
| scenes_yinse.rs | ys_00_refuse | vo_yinse_liming_refuse | 李铭 |
| scenes_yinse.rs | ys_03_asang_win | vo_yinse_asang | 阿桑 |
| scenes_yinse.rs | ys_08_xiaoshu | vo_yinse_xiaoshu | 小枢 |
| scenes_yinse.rs | ys_12_truth_talk | vo_yinse_waro_truth | 瓦罗残响 |
| scenes_yinse.rs | ys_waR0_cast | vo_yinse_taiyi | 东皇太一投影 |
| scenes_yinse.rs | ys_15_ending_fire | vo_yinse_wuming | 吴明录音 |
| scenes_yinse.rs | ys_15/16_settle | vo_yinse_liming_done | 李铭结算 |
| scenes_yiying.rs | yiy_s0_arrive | vo_yiying_zhangshen | 张杰开场 |
| scenes_yiying.rs | yiy_s0_arrive | vo_yiying_missiongod | 主神系统音 |
| scenes_yiying.rs | yiy_s0_arrive | vo_yiying_zhangshen_material | 张杰警示 |
| scenes_yiying.rs | yiy_s1_hall | vo_yiying_father_quarantine | Father |
| scenes_yiying.rs | yiy_s3_father | vo_yiying_father_material | Father |
| scenes_yiying.rs | yiy_s7_evac | vo_yiying_father_evac | Father 终局 |
| scenes_yiying.rs | yiy_s3_father | vo_yiying_kall | 考尔 |
| scenes_yiying.rs | yiy_s4_incubator | vo_yiying_puvisi | 普维斯 |
| scenes_yiying.rs | yiy_s_queen_start | vo_yiying_queen_roar | 异形皇后咆哮 |
| scenes_tianshe.rs | ts_act6_core | vo_tianshe_mulaba_name | 穆拉巴 |
| scenes_tianshe.rs | ts_act6_core | vo_tianshe_mulaba_chushe | 穆拉巴宣言 |
| scenes_tianshe.rs | ts_boss1_retreat | vo_tianshe_mulaba_snake | 穆拉巴弃战 |
| scenes_tianshe.rs | ts_npc_alien | vo_tianshe_alian | 阿莲 |
| scenes_tianshe.rs | ts_act5_temple | vo_tianshe_laoshi | 老石 |
| scenes_tianshe.rs | ts_npc_jun | vo_tianshe_jun | 钧留音 |
| scenes_tianshe.rs | ts_finish | vo_tianshe_liming | 李铭旁白 |

> 提示：部分场景同时出现多位 speaker（如 yiy_s0_arrive 有张杰+主神），需按段落分别挂 voice，或由前端按行消费多条 voice。

---

## 五、遗留 / 补充说明

- ✅ 全部 32/32 一次生成成功（attempt=1），无失败无换音色重试。
- ✅ `vo_yiying_missiongod` 已确认/重生成修正台词（task 台词原含「羊父」错字，已改为「Father」；重生成后 10.72s / 514604B）。
- ⚠️ `vo_yiying_queen_roar` 生成时长 22.00s（个头很大，Qwen 对拟声嘶吼会拖长成整句），属「台词过长/非纯短音」异常——该条可能实际是缓慢念读而非短促咆哮，**建议主线听测确认，必要时改用音效库合成短促皇后嗥叫**。
- ⚠️ `vo_moshi_beast_growl` 7.44s、`vo_yiying_puvisi` 8.40s 亦偏长，同为气声/嘶吼类，建议听测。
- 所有 wav 与既有管线一致（soundfile 写出，Qwen3TTS 原生 24k 采样），2^x 文件通常为整帧；重复出现的 size（403244/261164/280364）为不同文本恰好生成同帧长的巧合，非文案错误。
- 未做自动听测，仅做基础自检：文件存在 / >0 字节 / 时长>0.5s（全部通过）。
- 输出仅落 `tools/design/audio_z_worlds/`，未触碰 assets/audio、未改任何 .rs/.js/json 既有文件、未部署。部署与 voice 字段落地由主线验收后决定。

生成时间：2026-04-14・后台任务 pwsh-81（批量）+ pwsh-82（missiongod 重生成）