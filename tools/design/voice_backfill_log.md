# 四副本 + 咒怨配音 voice 字段回填日志

> 子代理：配音字段回填 · tokenrhythm/deepseek-v4-flash-0731
> 依据映射：`tools/design/z_worlds_voice_log.md`（第四节）＋ `tools/design/zhouyuan_voice_log.md`（第五节/建议部署映射）
> 改动范围：**仅** `server-rs/src/scenes_{moshi,yinse,yiying,tianshe,zhouyuan}.rs` 的 `voice:` 字段行。
> 未改其他文件、未改这些文件的其他字段；未部署、未 build --release、未碰 maps.rs/engine.rs/state.rs/defs.rs/client.js。

---

## 一、回填清单（场景 id → voice id）

### scenes_moshi.rs（末世死城，回填 6）
| 场景 id | 场景 | voice | 对应 wav | 备注 |
|---|---|---|---|---|
| ms_00 | F1 城墙平台 · 开场 | `vo_moshi_commander_tide` | ✓ 已存在 | 指挥官广播 · 主神线开场 |
| ms_reactor_done | F3 指挥所 · 授权 | `vo_moshi_commander_auth` | ✓ 已存在 | 老指挥官缓沉预示 |
| ms_00_minuteman | F1 民兵队长 | `vo_moshi_minuteman_last` | ✓ 已存在 | 哑吼决绝 |
| ms_medic_win | F2 病房 · 军医 | `vo_moshi_doctor` | ✓ 已存在 | 疲惫温和 |
| ms_f4_boss | F4 决死反扑 · 巨兽 | `vo_moshi_beast_growl` | ✓ 已存在 | 狂化攻城巨兽低吼 |
| ms_lose | 战死城墙 · 结算卡 | `vo_moshi_cityman`（内层 Card voice） | ✓ 已存在 | 「城在，人在」民兵口号 |

### scenes_yinse.rs（银色大地，回填 8 场景 / 9 处）
| 场景 id | 场景 | voice | 对应 wav | 备注 |
|---|---|---|---|---|
| ys_00 | 主神广场 · 新任务门 | `vo_yinse_liming_start` | ✓ 已存在 | 李铭开局 |
| ys_00_refuse | 主神广场 · 拒绝 | `vo_yinse_liming_refuse` | ✓ 已存在 | 李铭无温度压迫 |
| ys_03_asang_win | L1 战壕 · 救人胜利 | `vo_yinse_asang` | ✓ 已存在 | 阿桑入队台词 |
| ys_07_xiaoshu | L2 都市 · 小枢 NPC | `vo_yinse_xiaoshu` | ✓ 已存在 | 机械童声（注：日志写作 ys_08_xiaoshu，代码实际 id 为 ys_07_xiaoshu，见「跳过/差异」） |
| ys_12_truth_talk | L4 决战祭坛前 · 真相 | `vo_yinse_waro_truth` | ✓ 已存在 | 瓦罗残响 |
| ys_waR0_cast | L4 祭坛 · 东天二皇转场 | `vo_yinse_taiyi` | ✓ 已存在 | 东皇太一投影威压 |
| ys_15_ending_fire | L4 撤离门 · 火种结局 | `vo_yinse_wuming` | ✓ 已存在 | 吴明录音旁白 |
| ys_16_settle / ys_17_settle_fire | 结算卡（和平/火种两结算） | `vo_yinse_liming_done` | ✓ 已存在 | 李铭结算（两结算内层 Card voice 均回填） |

### scenes_yiying.rs（异形4，回填 6）
| 场景 id | 场景 | voice | 对应 wav | 备注 |
|---|---|---|---|---|
| yiy_s0_arrive | 登陆坞 · 开场 | `vo_yiying_missiongod` | ✓ 已存在 | 主神系统音（画面主 speaker 为主神；张杰×2 台词见跳过项） |
| yiy_s1_hall | L1 船员走廊 | `vo_yiying_father_quarantine` | ✓ 已存在 | Father 检疫指令 |
| yiy_s3_father | L2 主控室（Father 核心） | `vo_yiying_father_material` | ✓ 已存在 | Father 低语（考尔台词见跳过项） |
| yiy_s4_incubator | L2 孵化室（卵区） | `vo_yiying_puvisi` | ✓ 已存在 | 普维斯被寄生者 |
| yiy_s_queen_start | L3 皇后巢穴 · 决战开场 | `vo_yiying_queen_roar` | ✓ 已存在 | 异形皇后咆哮 |
| yiy_s7_evac | L3 引擎控制桥 · 引爆总闸 | `vo_yiying_father_evac` | ✓ 已存在 | Father 终局残响 |

### scenes_tianshe.rs（天蛇，回填 6 场景 / 7 处）
| 场景 id | 场景 | voice | 对应 wav | 备注 |
|---|---|---|---|---|
| ts_act5_temple | L3 祭祀场 · 老石 | `vo_tianshe_laoshi` | ✓ 已存在 | 老石铁匠低沉宽厚 |
| ts_act6_core | L4 大厅→核心熔炉 | `vo_tianshe_mulaba_name` | ✓ 已存在 | 穆拉巴材料论（宣言见跳过项） |
| ts_boss1_retreat | L4 族长寝巢→熔炉 · 弃战 | `vo_tianshe_mulaba_snake` | ✓ 已存在 | 穆拉巴嘶吼疯狂 |
| ts_npc_alien | L1 牢房区 · 阿莲 | `vo_tianshe_alian` | ✓ 已存在 | 颤抖坚定 |
| ts_npc_jun | L3 下层回廊 · 钧留音 | `vo_tianshe_jun` | ✓ 已存在 | 钧平静想通 |
| ts_finish | 任务完成结算 | `vo_tianshe_liming`（overlay voice + 内层 Card voice 均设） | ✓ 已存在 | 李铭旁白结算（详见「异常修正」） |

### scenes_zhouyuan.rs（咒怨补齐，回填 1）
| 场景 id | 场景 | voice | 对应 wav | 备注 |
|---|---|---|---|---|
| zy_03_back | F1 玄关/客厅间 · 猫粮后 | `vo_zy_toshio_meow` | ✓ 已存在 | 俊雄「喵——」（该场景正文即「远处传来一声极轻的『喵』」） |

## 二、合计
- **回填场景数**：年夜 6 + 银色 8 + 异形 6 + 天蛇 6 + 咒怨 1 = **27 个场景**（含 yinse/zhouyuan 部分追加到内层 Card voice 的 3 处：ys_16/ys_17/zy_… 不计新增场景；ys_16_settle 与 ys_17_settle_fire 各计一次场景）。
- **涉及 voice 字段行改动**：各场景 voice 行 + 内层 Card voice（ms_lose / ys_16_settle / ys_17_settle_fire / ts_finish）。所有取值均为既有 wav（assets/audio 下均已 grep 确认存在）。

---

## 三、跳过 / 未回填项（及原因）

| 项目 | 日志映射 | 原因 |
|---|---|---|
| vo_moshi_child（幸存者孩童） | 「幸存者线节点」 | 日志未给具体场景 id；moshi.rs 中无独立「孩童对话」SceneDef（幸存者数仅以 flag/结算体现），无明确可挂节点。 |
| vo_moshi_commander_fire（指挥官授权） | ms_reactor_done/ms_f4 | ms_reactor_done 单 voice 槽已被 vo_moshi_commander_auth 占用（speaker=老指挥官）；ms_f4 无独立唯一授权场景，故按主映射取 auth，fire 未挂。 |
| vo_yinse_liming_refuse 已有；vo_yinse 其余全部挂上 | — | 银色 8 条 voice 全部落位。 |
| vo_yiying_zhangshen / vo_yiying_zhangshen_material（张杰×2）| yiy_s0_arrive | 该场景仅一个 voice 槽，画面主 speaker=主神，已挂 vo_yiying_missiongod；张杰开场/警示两句无法同时占 single slot（日志第五节亦注明需按段落前端多 voice 消费）。 |
| vo_yiying_kall（考尔） | yiy_s3_father | 该场景主 speaker=Father，已挂 vo_yiying_father_material；考尔台词仅在正文一句，未单独成场景。 |
| vo_tianshe_mulaba_chushe（穆拉巴宣言） | ts_act6_core | 与 vo_tianshe_mulaba_name 同场景单槽冲突，按日志首行取 name（材料论）挂 ts_act6_core。 |
| 咒怨 vo_zy_mission_pact（签约） | zy_01 | 建议与 vo_zy_mission 随多段文本并播；zy_01 单 voice 槽已挂 vo_zy_mission，不重复覆盖。 |
| 咒怨 vo_zy_kayako_sympathy（质问） | zy_11_mourned | 该场景已挂 vo_zy_kayako_thank；sympathy 为「可选/第二段」，单槽不重复。 |
| 咒怨 vo_zy_narrator_zhangjie（旁白/张杰预告） | 主神空间入口 | scenes_zhouyuan.rs 中无对应「入口预告」场景（zy_01 为主神发布，已挂 mission）；该条本属主线主神空间入口，未落在本文件。 |
| 咒怨其余主场景（zy_01/zy_02/zy_04/zy_05/zy_10_toshio_win/zy_11_mourned/zy_15_fight/zy_boss_round/zy_17_lose） | 对应 vo_zy_* | 主线已回填，本子代理未重复改动。 |

---

## 四、异常 / 差异记录

1. **日志场景 id 与代码不一致**：`z_worlds_voice_log.md` 映射 `ys_08_xiaoshu → vo_yinse_xiaoshu`，但 scenes_yinse.rs 实际场景 id 为 `ys_07_xiaoshu`（小枢 NPC）与 `ys_07_xiaoshu_ok`。已按代码实际 id 将 `vo_yinse_xiaoshu` 挂到 `ys_07_xiaoshu`（主 speaker=小枢）。
2. **ts_finish 原 voice 值异常并已修正**：改前 `overlay.voice` 为 `Some("李铭（旁白）")`（speaker 名，非 wav id，前端 `assets/audio/` + 该串会 404）；已按日志改为 `Some("vo_tianshe_liming")`，并补挂实际会播放的内层 Card `voice` 亦为 `vo_tianshe_liming`。
3. **tianshe 既有非-wav voice 值（未动，越界）**：`scenes_tianshe.rs` 两处 overlay 外层 `voice` 仍为 `Some("灭世蜕皮")`（L523 BOSS II 全灭结算）与 `Some("李铭（死亡档案）")`（L597 通用死亡卡）——均为 speaker/文案标签而非 `vo_` wav id。二者非 `voice: None`（不在本次回填范围）、亦不在日志 voice 映射表；且按 engine 逻辑 overlay 场景实际播的是内层 Card voice（外层 `ov.voice` 不被 `Mode::AwaitCard` 读取），故保持原样。**建议主线验收时统一核对这些 overlay 的 voice 取值。**

---

## 五、wav 存在性核验
- 对上述 5 个场景文件中所有 `voice: Some("vo_…")` 引用做了程序化扫描：`server-rs/ui/assets/audio/` 下 **全部 36 个去重 voice id 的 wav 文件均存在**，无缺文件。
- 回填所引用的 voice：26 个去重 id（moshi 6 / yinse 8 / yiying 6 / tianshe 6 / zhouyuan 1，其中内有 id 复用），全部对应 wav 在 assets/audio。

---

## 六、cargo check 结果（⚠️ 未达零错误，但均为既有/非本子代理范围错误）
执行 `cargo check`（**非 build --release**）后失败，错误全部位于**本次禁改的文件**（`src/lib.rs` / `src/defs.rs` / `state.rs`），与本子代理的 voice 字符串改动无关：

- `E0583`：`src/lib.rs:5` `pub mod items_data;` → **`src/items_data.rs` 不存在**；`src/lib.rs:15` `pub mod skills_data;` → **`src/skills_data.rs` 不存在**。（本次会话未创建/未删除任何文件；两文件本就不存在。）
- `E0119`：`src/defs.rs:252` `#[derive(Default)]` 与 `impl Default for WeaponSlot`（L257）冲突。
- `lifetime may not live long enough`：`src/defs.rs:294` `Equipment` 因 `WeaponSlot` 借用 `&'static str`，`serde::Deserialize` derive 生命周期不符（首个 cargo 运行另报 `state.rs:178/264` 找不到 `crate::defs::Equipment`）。
- 两次 cargo 运行出现不同错误集（Equipment vs items_data/skills_data 等），说明 `target/` 增量缓存与该源码状态不一致，仓库处于**未完成的工作态**。

**结论**：
1. 我改动的 5 个场景文件（只动 voice 字符串字面量 `None → Some("vo_xxx")`）**零编译错误**；两次 cargo 输出中均无 scenes_{moshi,yinse,yiying,tianshe,zhouyuan}.rs 的任何 error。
2. 阻塞 `cargo check` 的缺失模块 `items_data.rs`/`skills_data.rs` 及 `defs.rs` 的 WeaponSlot/Equipment 问题是**既有遗留**，位于任务明确禁改文件（defs.rs/state.rs）之外（lib.rs 亦非允许范围）。
3. 按任务边界，本子代理不越权新建/修改 lib.rs、items_data.rs、skills_data.rs、defs.rs、state.rs。**需主线另行处理上述既有编译阻塞后，方可满足「cargo check 零错误」验收。**

---

## 七、遗留 / 建议听测项（沿用配音日志第五节）
- ⚠️ `vo_yiying_queen_roar` 生成 22.00s（拟声嘶吼被拖长成整句），已挂 yiy_s_queen_start；**建议主线听测**，必要时改回音效库合成短促嗥叫。
- ⚠️ `vo_moshi_beast_growl` 7.44s、`vo_yiying_puvisi` 8.40s 同属偏长的气声/嘶吼类，**建议听测**。
- tianshe 两处非-wav overlay `voice`（「灭世蜕皮」「李铭（死亡档案）」）建议主线复核。
- 多 speaker 单槽场景（yiy_s0_arrive、yiy_s3_father、ts_act6_core、zy_01、zy_11_mourned）的次要 voice 未挂入，如需多段播放需前端按行消费多条 voice（见日志第五节说明）。

生成时间：本回填任务执行时段。