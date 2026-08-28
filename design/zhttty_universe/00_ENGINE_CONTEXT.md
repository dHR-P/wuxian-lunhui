# 00 · 引擎能力与副本设计规范（设计子代理必读）

> 本文档是「zhttty 无限流宇宙（Z 宇宙）超大型箱庭」扩展中，所有**作品研究子代理**与**副本设计子代理**必须遵守的统一规范。
> 设计文档只需描述「做什么」（markdown），实现由主 agent 安排编程子代理按此落地为 Rust/前端代码。

## 1. 游戏现状（《无限轮回 · 第一章 生化蜂巢》）

- 形态：Windows 桌面游戏（Tauri v2 + Rust 引擎 + Web 前端）。`server-rs/` 为 Rust 引擎，`server-rs/ui/` 为前端（HTML/JS + three.js 3D 战场）。
- 玩法：2D 俯视网格箱庭探索（40×26×4 层）+ 文字剧情选择 + 回合制指令战斗（3D 敌人立绘精灵）+ 主神空间结算循环。
- 存档：`data/save.json`，存档/继续正常。

## 2. 引擎数据模型（Rust，权威在 `server-rs/src/`）

### 2.1 剧情 DSL（defs.rs）
```rust
SceneDef { id, bg, loc, mood, speaker, voice, text: Vec<String>, choices: &[ChoiceDef], fight_id: Option<&str>, video, cine_label, overlay }
ChoiceDef { label, sub, cond: Option<fn(&GameState)->bool>, effects: &[Eff], route: Route /* To(id) | Dyn(fn) */ }
Eff::SetFlag(k) | San(i32) | Points(i32) | PointsIfFlag(k, i32) | KillTeam(k)
  | Hurt(i32, death_route) | Weapon(w) | AddItem(item) | MarkPoint(id)
OverlayDef { voice, death: Option<(title, cause)>, card: fn -> Card }
```
- 状态（state.rs）：`points`（奖励点数，主神货币）、`san`（理智 0-100）、`hp`、`weapon`、`ammo`、`flags`（剧情旗标）、`inventory`（道具）、队友存活、`map_objs`（门禁/调查状态）、死亡档案 `deaths`。

### 2.2 开放世界（maps.rs）
- 每世界固定 `MAP_W=40, MAP_H=26`，楼层数可变（现 4 层）。ASCII 地形：`#`墙 `.`地板 `P`出生点 `I`装饰。
- 对象表（独立定义、带 floor/x/y）：
  - `PointDef`：调查点（文本+flag），如列车控制台、病毒样本库。
  - `EnemyDef { id,name,floor,x,y,radius,fight }`：巡逻/驻守敌人，`fight` 引用 FIGHTS 表 id。
  - `NpcDef { id,name,floor,x,y,talk }`：对话 NPC。
  - `ZoneDef { id,name,floor,x,y,kind,ref_id }`：特殊区域（puzzle 机关 / fight BOSS）。
  - `PortalDef { id,floor,x,y,to_floor,tx,ty }`：传送门，**物理单向**（删除反向门即单向），形成箱庭闭环/捷径。
  - `GateDef { id,name,floor,x,y,need_item,need_flag,lock_msg,unlock_msg }`：门禁软锁（道具/flag 解锁）。

### 2.3 战斗（scenes.rs FIGHTS 表，9 套）
```
zombie1_save/far  厨师丧尸  HP34  dmg(7,13) 奖10   （无狂暴，模板函数）
b_chef            厨师丧尸  HP38  dmg(9,15) 奖12
b_guard           保安丧尸  HP36  dmg(8,14) 奖12
mut_guard         样本库守卫 HP42 dmg(11,18) 奖25  狂暴@20
horde             丧尸群    HP55  dmg(11,17) 奖20  狂暴@25（增员）
licker_larva      舔食者早期 HP60 dmg(10,16) 奖80  狂暴@30（挣脱）
licker            舔食者    HP112 dmg(15,22) 奖500 狂暴@55 终结技
hunter_elite      猎杀者·实验体 HP92 dmg(14,21) 奖120 狂暴@40 终结技
```
- FightCfg 字段：name/hp/dmg(min,max)/reward/reward_why/intro/rage_at/rage_text/on_rage/finisher(终结技条件)/win/death。
- 死亡：进入死亡档案（overlay），失败惩罚在 Z 宇宙中设计为「回主神空间扣点复活」。

### 2.4 结算（唯一权威 `compute_settlement`）
```
total = points + 存活队友×100 + 达成支线flag数×200
评级：S≥1600 | A≥1300 | B≥1000 | C≥700 | D
```
- 支线 flag 示例：A 信任蕾恩 / B1 洞察丧尸规律 / B2 参透激光机关 / C 注射肾上腺素 / decon_truth / server_cooling / nav_manual_cross。

## 3. 敌人立绘精灵（前端 3D 战场使用）

| 精灵图 | 映射 fight/敌人 | 描述 |
|---|---|---|
| enemy_zombie.png | 所有普通丧尸 | 黑底抠图 |
| enemy_horde.png | horde 丧尸群 | 群像（5-6 只） |
| enemy_licker.png | licker/licker_larva | 舔食者 |
| enemy_guard.png | b_guard 保安 | 深蓝制服 |
| enemy_hunter.png | hunter_elite 猎杀者 | 灰褐皮肤 |

- 美术管线：ComfyUI Z-Image 生立绘（768×1024）→ 抠图（纯色/洪泛）→ `server-rs/ui/assets/img/enemy_*.png`。前端 PlaneGeometry 宽=高×0.75 + billboard + alphaTest 0.3。
- **新副本如需新怪物立绘**：设计文档中列「美术需求清单」即可（含怪物视觉描述、背景色建议），生图由主 agent 统一跑。

## 4. 已存在的「主神空间」雏形（scenes.rs s_nexus）

- 通关结算卡 →「查看主神空间」→ 半圆形广场（张杰 NPC 对话 + 兑换目录光影）：
  - 细胞活力强化（体质）800 点；基因锁第一阶段 2000 点 + D 支线；初级吸血鬼血统 3000 点 + C 支线；武器架（s_weapon）。
- **Z 宇宙扩展目标**：主神空间成为主箱庭（广场/兑换/复活/评价/多任务世界传送门）；《生化·蜂巢》保留为第一个任务小副本；新增副本（如《咒怨》）。

## 5. 副本设计文档模板（每个副本一份 markdown，必须含以下章节）

```markdown
# 副本设计：<副本名>（<来源作品>）
## 0. 一句话概述（主题/一句话钩子/目标）
## 1. 设定依据（源自原作哪个具体情节/场景，引用 2-3 句原作细节，注明社区参考来源链接可选）
## 2. 主题与氛围（美术色调/音效关键词/情绪曲线）
## 3. 地图结构
   - 楼层数（建议 2-4 层）、层名
   - 每层用 ASCII 绘出（40 宽 × 26 高，与引擎一致；可用 `#` 墙 `.` 地板 `P` 入口 `I` 装饰），
     或用“区域划分表+关键坐标”描述
   - 传送门接线（每对：起点层/坐标 → 目标层/坐标，注明单向意图）
   - 门禁（道具/flag 解锁，锁什么捷径，绕行路线）
## 4. 敌人表（按层）：名称 / 对应 fight 数值建议（HP/伤害/奖励点）/ 立绘复用哪张 enemy_*.png 或新美术需求
## 5. BOSS 设计：HP/伤害区间/狂暴血量/狂暴表现/终结技条件/胜利掉落与奖励点/失败去向
## 6. 剧情线（SceneDef 风格）：分幕段落（每幕：场景文本关键词 + 选项 + flag/点数效果），
   至少给出开场、关键转折、结局三幕的文字初稿
## 7. 奖励与支线：结算支线 flag 清单（每项：flag id/达成条件/奖励点）、掉落道具（AddItem）
## 8. 与主神空间衔接：入口传送门规则/退出条件/失败惩罚（扣点复活）/本副本对兑换项的影响
## 9. 美术与配音需求清单（新立绘/背景图/配音台词候选）
## 10. 实现风险与建议（哪些是最新系统、对引擎的最小改动建议）
```

## 6. 目录与命名约定

- 根目录：`C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1\design\zhttty_universe\`
- 每个作品一个子目录：`<work_slug>/`，slug 用小写英文（如 `wuxian_kongbu`）。
- 作品研究文档：`<work_slug>/00_<work_slug>_research.md`。
- 每个副本：`<work_slug>/<dungeon_slug>.md`。

## 7. 硬约束

- 编程/文字子代理一律声明使用模型 `tokenrhythm/deepseek-v4-flash-0731`（与主线同模型）；识图质检一律 tokenrhythm/qwen3.7-flash（本阶段不需要）。
- 设计文档**不写 Rust 代码**，但所有数值/结构必须**可落地**（符合上述数据模型）。
- 参考社区（百度百科/知乎/贴吧/龙空/起点评论）时标注来源链接。