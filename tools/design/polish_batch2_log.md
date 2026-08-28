# polish_batch2_log.md — 批2 七副本剧情润色记录

> 角色：副本剧情润色子代理（tokenrhythm/deepseek-v4-flash-0731）
> 任务：把黄金模板骨架（每副本 5 场景通用文本）补成精致副本（≥15 场景），
> 遵循「剧情开放、无真相指向、世界展示向」。改动范围仅限：
> `server-rs/src/scenes_<slug>.rs`（新增场景）与 `worlds/<slug>.rs`（POINTS/NPCS 补表项）。
> 保留各副本原 `start_boss/boss_act/boss_win/_figths/结算卡/死亡卡/id 前缀` 结构，
> 仅 new 场景、开场 route 指向新 hub、BOSS 胜利 route 到开放结局、开放结局 route 到原结算卡。

## 总览

| slug | BOSS | 新增场景(总 SceneDef id 数) | 调查点(PointDef) | NPC(NpcDef) | 开放结局分支 |
|------|------|----------------------------|------------------|-------------|--------------|
| hangu 函谷关 | 狂化军团长箜邪 | 15 | 5 | 2 | 3 |
| diweidu 低纬度 | 灾厄聚合体 | 15 | 5 | 2 | 3 |
| sanlian 三联盟 | 狂誓者 | 15 | 5 | 2 | 3 |
| wujin 无尽森林 | 兽人战潮王 | 15 | 5 | 2 | 3 |
| yizhong 异种 | 异种成体 | 15 | 5 | 2 | 3 |
| miwu 迷雾 | 雾中巨物 | 15 | 5 | 2 | 3 |
| xingchen 星辰 | 星核守卫 | 15 | 5 | 2 | 3 |

全部副本 SceneDef 场景数 = 15（原 5 场景基础上新增 10 个剧情场景，达到验收线 ≥15）。

## 共通新增结构（每副本）——按 5 项任务

1. **开场扩充**：`<slug>_00` 保留原钩子开场 + 氛围铺陈（bg 用 `<slug>_bg.png`，voice 保留 vo_* 或 None），route 改为指向新 hub。
2. **世界展示调查点 3-5 个**：新增 `*_pt_*` 场景（奇观/风物，Eff 反馈：MarkPoint/Points/San/AddItem/Hurt），在 worlds POINTS 补对应 PointDef（floor:0，route 指向该场景 id）。
3. **NPC 对话 1-2 个**：`*_np_*` 世界居民对话场景，worlds NPCS 补 NpcDef（talk 指向场景 id）。
4. **BOSS 战前铺垫 1-2 个**：新增 `*_01b_prep` 铺垫场景，内含【迎战 BOSS】route: Route::Dyn(start_boss) 与回顾分支；不做任何改动原选择驱动 BOSS 遭遇逻辑。
5. **开放结局 2-3 分支**：boss_win 由直接回原结算卡改为回新增 `*_end_choice`，该场景 看景/带纪念/停留 三分支，各 route: Route::To(原结算卡 `*_card`)。保留原结算卡/死亡卡 OverlayDef 不变。

## 每副本详情

### 1. hangu 函谷关（xc 前缀除外，用 hg_）
- 开场 hg_00 → hub hg_hub
- 调查点：北城墙女墙、关内铁匠铺(得护符)、旧祭坛碑文、封死枯井(可撬井 Hur(8,death))、关内箭楼
- NPC：送粮信使阿宁、守关老将晁伯
- BOSS 铺垫：hg_01b_prep → Route::Dyn(start_boss)（原 start_boss/boss_act/boss_win/hg_round/hg_boss FightCfg 不动，仅 boss_win→hg_end_choice）
- 结局三分支 → hg_card

### 2. diweidu 低纬度（dw_）
- 调查点：倒影旧屋、领主之塔、空旷广场活影、破碎喷泉(得碎镜)、倒影集市(得门影)
- NPC：拾荒者桠子、倒影画师挽
- BOSS 铺垫：dw_01b_prep → Route::Dyn(start_boss)，boss_win→dw_end_choice → 三分支 → dw_card

### 3. sanlian 三联盟（sl_）
- 调查点：盟碑勒痕、青铜献鼎(可搅汤 Hur(6,death))、三族条约、沙盘舆图、旧盟信物
- NPC：司礼官玄成、外族女医涟
- BOSS 铺垫：sl_01b_prep → Route::Dyn(start_boss)，boss_win→sl_end_choice → 三分支 → sl_card

### 4. wujin 无尽森林（wj_）
- 调查点：圣树祭火、藤蔓图腾、兽骨旧迹(可翻骨 Hur(6,death))、心湖倒影、祖声柱碑
- NPC：部族猎人褐爪(得木箭)、割藤老者苍
- BOSS 铺垫：wj_01b_prep → Route::Dyn(start_boss)，boss_win→wj_end_choice → 三分支 → wj_card

### 5. yizhong 异种（yz_，注意与瞬玄的 yz 前缀同前缀但独立文件）
- 调查点：培养舱图谱、主控台日志、异形茧室(可剖茧 Hur(6,death))、蜕皮标本、灭菌走廊爪痕
- NPC：滞留博士纪(得针剂)、幸存实验员荷(得基因数据)
- BOSS 铺垫：yz_01b_prep → Route::Dyn(start_boss)，boss_win→yz_end_choice → 三分支 → yz_card

### 6. miwu 迷雾（mw_）
- 调查点：雾封橱窗、货架留言墙、冷库门前、罐头货道(得图册)、药品架灰斑
- NPC：超市店员邹望(得钢钎)、被困女人芮
- BOSS 铺垫：mw_01b_prep → Route::Dyn(start_boss)，boss_win→mw_end_choice → 三分支 → mw_card

### 7. xingchen 星辰吞噬者（xc_）
- 调查点：星骸压缩区、引力之井、光尘回廊、胃壁晶簇、脊龙骨
- NPC：残骸男人弗(得怀表)、星核衍生物·萤
- BOSS 铺垫：xc_01b_prep → Route::Dyn(start_boss)，boss_win→xc_end_choice → 三分支 → xc_card

## 验收

- 每副本 SceneDef id 数 = 15（grep `^        id: "` 逐文件确认，全部 15）。
- worlds POINTS(5)/NPCS(2) 已补，route/talk 指向对应新增场景 id。
- cargo check $LASTEXITCODE == 0（server-rs 目录执行，8.0s Finished dev；仅其他既有文件的 102 条 never-used/non_snake_case 警告，与本批文件无关）。
- 不 build（按要求）。