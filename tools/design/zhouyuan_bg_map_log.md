# 《咒怨》场景背景分层映射日志

- 改动文件：`server-rs/src/scenes_zhouyuan.rs`
- 改动范围：仅 `bg: Some("...")` 字段的图片名；其余（loc/mood/text/choices/effects/route/overlay/fight 等）一律不动。
- 素材图全集（`server-rs/ui/assets/img/`）：
  - `scene_zy_house_exterior.png`（雨夜玄关/宅邸外观，灰蓝）
  - `scene_zy_corridor.png`（惨绿走廊）
  - `scene_zy_room.png`（和室/卧房）
  - `scene_zy_attic.png`（阁楼昏黄）
  - `scene_zy_battle.png`（地下室结界白线黑发）
  - 兜底 `img_zhuyuan_book.png`（本副本不再直接使用，保留在素材目录作为全局兜底）

---

## 映射表

| 场景 id | loc | 原 bg | 新 bg | 理由 |
|---|---|---|---|---|
| zy_01 | 佐伯家 · 玄关 | img_zhuyuan_book | scene_zy_house_exterior.png | 开场玄关雨夜，匹配宅邸外观 |
| zy_02 | 佐伯家 · 玄关 | img_zhuyuan_book | scene_zy_house_exterior.png | 玄关踏入门厅 |
| zy_00_teammate | 佐伯家 · 玄关 | img_zhuyuan_book | scene_zy_house_exterior.png | NPC 对话在玄关 |
| zy_03_butsudan | F1 · 佛龛·储物间 | img_zhuyuan_book | scene_zy_house_exterior.png | 佛龛间属 F1 公共区 |
| zy_03_back | F1 · 玄关/客厅间 | img_zhuyuan_book | scene_zy_house_exterior.png | 玄关回廊交界 |
| zy_03_fridge | F1 · 厨房 · 冰箱 | img_zhuyuan_book | scene_zy_house_exterior.png | 厨房 |
| zy_03_knife | F1 · 厨房 | img_zhuyuan_book | scene_zy_house_exterior.png | 厨房 |
| zy_03_tv | F1 · 客厅 · 电视 | img_zhuyuan_book | scene_zy_house_exterior.png | 客厅 |
| zy_03_coffee | F1 · 客厅 · 茶几 | img_zhuyuan_book | scene_zy_house_exterior.png | 客厅 |
| zy_04 | 佐伯家 · 一楼楼梯口 | img_zhuyuan_book | scene_zy_corridor.png | 楼梯口/门厅，惨绿走廊相称 |
| zy_05 | 佐伯家 · 二楼走廊 | img_zhuyuan_book | scene_zy_corridor.png | 走廊 |
| zy_05_wallpaper | F2 · 走廊 · 壁纸 | img_zhuyuan_book | scene_zy_corridor.png | 走廊壁纸 |
| zy_05_encounter | F2 · 走廊 | img_zhuyuan_book | scene_zy_corridor.png | 走廊遭遇战 |
| zy_05_win | F2 · 走廊 | img_zhuyuan_book | scene_zy_corridor.png | 走廊战后 |
| zy_06 | F2 · 和室·次卧 | img_zhuyuan_book | scene_zy_room.png | 和室 |
| zy_06_tatami | F2 · 和室 | img_zhuyuan_book | scene_zy_room.png | 和室榻榻米 |
| zy_06_kakejiku | F2 · 和室 · 挂轴 | img_zhuyuan_book | scene_zy_room.png | 和室 |
| zy_07 | F2 · 主卧门 | img_zhuyuan_book | scene_zy_room.png | 主卧入口 |
| zy_07_forcetrap | F2 · 主卧门 | img_zhuyuan_book | scene_zy_room.png | 主卧门强开 |
| zy_08_bedroom | F2 · 主卧（伽椰子卧房） | img_zhuyuan_book | scene_zy_room.png | 主卧卧房 |
| zy_08_bed | F2 · 主卧 · 床边 | img_zhuyuan_book | scene_zy_room.png | 主卧床 |
| zy_08_wardrobe | F2 · 主卧 · 衣柜 | img_zhuyuan_book | scene_zy_room.png | 主卧衣柜 |
| zy_08_bathroom | F2 · 浴室 | img_zhuyuan_book | scene_zy_room.png | 浴室 |
| zy_09_mirror | F2 · 浴室 · 镜子 | img_zhuyuan_book | scene_zy_room.png | 浴室镜 |
| zy_09_vent | F2 · 浴室 · 排风扇 | img_zhuyuan_book | scene_zy_room.png | 浴室排风扇 |
| zy_10_toys | F2 · 俊雄房间 | img_zhuyuan_book | scene_zy_room.png | 俊雄房间 |
| zy_10_toys2 | F2 · 俊雄房间 | img_zhuyuan_book | scene_zy_room.png | 俊雄房间 |
| zy_10_toshio | F2 · 俊雄房间 · 精英战 | img_zhuyuan_book | scene_zy_room.png | 俊雄房间爆走战 |
| zy_10_toshio_win | F2 · 俊雄房间 | img_zhuyuan_book | scene_zy_room.png | 俊雄房间战后 |
| zy_04_trap | F3 · 阁楼天窗侧 | img_zhuyuan_book | scene_zy_attic.png | 壁橱捷径落入阁楼天窗 |
| zy_10_atticdoor | F2 · 阁楼楼梯口 | img_zhuyuan_book | scene_zy_attic.png | 阁楼门前 |
| zy_10_toshio_win2 | F2 · 阁楼楼梯口 | img_zhuyuan_book | scene_zy_attic.png | 开阁楼门 |
| zy_11_corpse | F3 · 阁楼夹层 | img_zhuyuan_book | scene_zy_attic.png | 阁楼藏尸处 |
| zy_11_mourned | F3 · 阁楼 · 藏尸处 | img_zhuyuan_book | scene_zy_attic.png | 阁楼默哀 |
| zy_11_burn | F3 · 阁楼 | img_zhuyuan_book | scene_zy_attic.png | 阁楼焚尸 |
| zy_11_diary | F3 · 阁楼 · 旧皮箱 | img_zhuyuan_book | scene_zy_attic.png | 阁楼皮箱 |
| zy_12 | F3 · 阁楼台阶/地下室交界 | img_zhuyuan_book | scene_zy_attic.png | 阁楼台阶交界（例外：偏阁楼氛围） |
| zy_18_dawn | F3 · 阁楼 · 天窗 | img_zhuyuan_book | scene_zy_attic.png | 阁楼天窗日出 |
| zy_13_basement | F3 · 地下室 | img_zhuyuan_book | scene_zy_battle.png | 地下室 |
| zy_13_basement_trap | F3 · 地下室 · 绕行 | img_zhuyuan_book | scene_zy_battle.png | 地下室潜行 |
| zy_14_well | F3 · 地下室 · 黑发井/结界圈 | img_zhuyuan_book | scene_zy_battle.png | 结界圈核心 |
| zy_15_fight | 佐伯家 · 地下室结界圈 | img_zhuyuan_book | scene_zy_battle.png | 决战结界 |
| zy_boss_round | 佐伯家 · 地下室 · 黑发领域 | img_zhuyuan_book | scene_zy_battle.png | BOSS 黑发领域 |
| zy_16_win | 佐伯家 · 地下室结界 | img_zhuyuan_book | scene_zy_battle.png | 胜利结算冠以结界 |

### 保持 bg: None（未改动）

- zy_16_card_exorcism / zy_16_card_strong：胜利结算卡 overlay，无背景展现。
- zy_17_lose*（lose/curse/wall/san/late）：死亡档案卡 overlay，无背景展现。
- zy_do_teleport / zy_19_done：光柱传送/任务完成卡，无背景展现。

---

## 映射统计

| 新背景图 | 使用场景数 |
|---|---|
| scene_zy_house_exterior.png | 9 |
| scene_zy_corridor.png | 5 |
| scene_zy_room.png | 15 |
| scene_zy_attic.png | 9 |
| scene_zy_battle.png | 6 |
| **合计（改图）** | **44** |
| img_zhuyuan_book.png（剩余引用） | **0** |
| bg: None（overlay/传送/结算卡） | 13 |

---

## 映射合理性说明

- **厨房/客厅**：任务规则把「客厅/厨房/入口/大门」归入 house_exterior 一类，故 F1 客厅/厨房/佛龛/玄关统一用 `scene_zy_house_exterior.png`（灰蓝宅邸公共区）。
- **楼梯口**：zy_04 关键规则里「楼梯」属 corridor，用惨绿走廊图；zy_10_atticdoor / zy_10_toshio_win2 虽 loc 前缀是 F2，但正文是通往阁楼的门，归 attic。
- **浴室**：规则明确浴室 → room，故 zy_08_bathroom / zy_09_mirror / zy_09_vent 用和室卧房图。
- **俊雄房间 / 主卧 / 和室**：一律 room，唯一例外是 zy_10_toshio（俊雄房间精英战）仍用 room，黑发领域仅出现于地下室决战阶段。

### 例外（非 loc 关键词直觉性调整）
- **zy_12**（F3 · 阁楼台阶/地下室交界）：规则中「台阶」→attic，故取 attic 而非 battle（它本身是阁楼去地下室的过渡点，氛围仍偏阁楼昏黄），未用 battle。

---

## 变更 diff 摘要

- 全部 44 处 `id: "<zy_scene>", bg: Some("img_zhuyuan_book.png")` → 替换为新图名。
- 未触碰任何 loc/mood/text/choices/effects/route/overlay/fight/cond 字段。
- 未新增/删除任何场景，id 与逻辑路由保持完全一致。
- `img_zhuyuan_book.png` 在素材目录保留，全局兜底不受影响（本文件不再引用）。

## cargo check

- 在 `server-rs/` 执行 `cargo check`：**通过，exit code 0，零错误零警告**。
- `bg` 为 `String`，改文件名不影响编译；所引用的 5 张图均在 `assets/img/` 存在，前端不会 404。