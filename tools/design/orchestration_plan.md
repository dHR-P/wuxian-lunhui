# Z 宇宙副本批量落地 · 一级子代理分工契约(orchestration_plan.md)

> 用途:在设计库(zhttty_universe/,已完成)与多世界框架 P0(A2 进行中)就绪后,按作品把 15 个副本
> 批量落地为可玩内容。主线只做编排与验收;每个副本组 = 1 个一级子代理,自行开二级子代理执行
> (素材生成/程序落地/质检/测试)。
> 本文件是派发一级子代理时的公共契约,与 `wan_prompts.md`(素材口径)、
> `multi_world_framework.md`(引擎方案)、`00_ENGINE_CONTEXT.md`(引擎能力)配套使用。

## 1. 分工总表(按作品分组)

| 组 | 一级子代理代号 | 作品 | 副本(优先级) | 依赖 |
|---|---|---|---|---|
| G1 | A3-咒怨 | 无限恐怖 | 咒怨(高) | P0 + 主神空间 |
| G2 | A4-异形4 | 无限恐怖 | 异形4·奥瑞迦号(高) | P0 + sp_grade |
| G3 | A5-摩瑞亚 | 无限恐怖 | 摩瑞亚矿坑(中) | P0 + sp_grade |
| G4 | A6-洪荒历 | 洪荒历 | 银色大地(高)、零号基地(高) | P0 |
| G5 | A7-无限未来 | 无限未来 | 末世死城(高)、量子遗迹(中) | P0 + sp_grade |
| G6 | A8-无限曙光 | 无限曙光 | 破晓封锁区(中)、铁血金字塔(中) | P0 |
| G7 | A9-大宇宙时代 | 大宇宙时代 | 沙丘魔海(中)、远古遗迹(中) | P0 |
| G8 | A10-侠行天下 | 侠行天下 | 剑冢禁地(中)、机关城核心(中) | P0(零新系统) |
| G9 | A11-死亡开端 | 死亡开端 | 死雾镇(中)、大裂隙(低) | P0 |

> 首批=G1(咒怨,主神空间样板)+ G4(洪荒历,双高)+ G5(末世死城)。其余按 P0 验收节奏放行,
> 避免与 A2 引擎改动同批抢 server-rs 编译。

## 2. 每个一级子代理的固定职责

1. 通读本组各副本设计文档(zhttty_universe/<slug>/<dungeon>.md)+ 依赖文档(见表格)。
2. 开二级子代理(模型硬约束:编程/文字=tokenrhythm/deepseek-v4-flash-0731;识图质检=tokenrhythm/qwen3.7-flash),
   每个二级 prompt 自包含:文件绝对路径、命令、验收标准、输出位置;代理看不到本对话。
3. 二级任务标准四件套(可按副本裁剪):
   - **素材二级**:按 wan_prompts.md 生成立绘/场景图(gen_wan.py;0.2 元/张)→ floodfill 抠图
     (cutout_floodfill.py)→ 落位 server-rs/ui/assets/img/<副本>_*.png(旧的先备份)。
   - **程序二级**:把设计文档的敌人表/地图 ASCII/SceneDef 剧情/奖励/门禁落成 Rust 数据
     (遵循 multi_world_framework.md 的世界注册表约定;咒怨含 sp_grade 字段接入)。
   - **质检二级**(qwen3.7-flash):对立绘/场景图逐张核验(设定口径与 wan_prompts.md 一致,防猜对象误判)。
   - **测试二级**:cargo test / cargo check + 该副本新场景 smoke(不启动 release 构建)。
4. 向主线交付结构化报告:改动文件清单、新增副本条目(敌人/BOSS/奖励/flag)、素材文件+字节数、
   qwen 判定、cargo 结果、遗留风险。所有决策追加写 tools/design/material_decision_log.md。

## 3. 全局硬约束(所有一级子代理必须遵守)

- 系统 python 是 stub → Python 一律 `D:\AI_Tools\ComfyUI\python_embeded\python.exe`;识图也可 Node v24 fetch。
- 不要 `cargo build --release`、不要重启/拉起游戏进程、不要改 data/save.json 运行时文件(测试用临时副本)。
- 质检口径以 wan_prompts.md rev2 为准(尤其:pc_zhengzha=健康战士非丧尸、hunter=无皮肤肌肉怪兽)。
- 新增字段一律 `#[serde(default)]`,旧存档兼容优先;完成前不得破坏现有可玩性。

## 4. 验收流程(主线)

1. 文件证据:素材 PNG 存在且字节数合理;备份存在;.rs 改动 diff 可读。
2. 质检证据:qwen 报告判定「可发布」;有缺陷的按说明原因与修正点。
3. 编译证据:主线最终统一 `cargo build --release`(A1/A2 完成后一次做)+ 重启 release exe。
4. 运行证据:Node CDP 拉取游戏 → 该副本进出/战斗/结算 smoke + 截图 qwen 校验 → 修 bug。

## 5. 当前在途(本契约发布时)

- A1(素材定稿:pc_wan3/hunter_wan2 + 僵尸四件套评估)— 运行中
- A2(多世界框架 P0:world_id/迁移/注册表)— 运行中
- 本轮主线不做第二批派发,待 A1/A2 验收结果回落后再放行 G1/G4/G5。