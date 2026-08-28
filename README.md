# 无限轮回 · Wuxian Lunhui

以 zhttty「无限」系列小说为原型的箱庭游戏 —— 主神空间 + 多任务世界副本。

## 简介

玩家被主神选中进入轮回，在主神空间兑换强化（基因锁/血统/修真/技能/装备/法宝/合成），再通过跨世界传送门进入一个个任务世界副本。世界之间无固定先后顺序，副本敌人强度随主角当前强度与副本难度系数动态缩放。

- **56 个任务副本 / 54+ 世界**：覆盖 zhttty《无限恐怖》《死亡开端》《无限曙光》《洪荒历》《无限未来》《大宇宙时代》《侠行天下》七部作品的世界观与恐怖片世界（生化危机/咒怨/异形/魔戒/死神来了/木乃伊/星河战队/侏罗纪/寂静岭/加勒比/铁血战士等），含少量原创致敬。
- **剧情人物还原原著**：主神空间接入郑吒/楚轩/张杰/詹岚/赵樱空等中洲队队友 NPC（性格/台词还原），人物设定参照官方百科与萌娘百科，详见 `design/zhttty_universe/characters_reference_official.md`。
- **视觉**：MC（Minecraft）风格体素地图 + 三人称 3D 体素战斗（方块人/实时阴影/视角拉近），支持 720p/1080p/1440p 三档分辨率 + HiDPI。
- **动态难度缩放**：`敌人强度 = 主角当前强度 × 副本难度系数`，非线性、可增强可削弱。

## 技术栈

- **Tauri v2** + **Rust**（引擎 / 状态机 / 场景 DSL / 测试）
- **Three.js**（战斗 3D）+ Canvas2D（体素地图）+ WebView2

## 构建与运行

```bash
# 构建 release
cd server-rs
cargo build --release
# 可执行文件：server-rs/target/release/wuxian-horror-ch1.exe
```

## 测试

```bash
cd server-rs
cargo test --release --no-fail-fast        # 全量 199+ 用例
node ../tools/e2e_smoke_test.mjs          # CDP 端到端 UI 冒烟测试（需先启动游戏）
```

## 目录

- `server-rs/src/` — Rust 引擎（worlds 世界数据 / scenes 场景 / state / engine / defs）
- `server-rs/ui/` — Web 前端（client.js / world2d.js 地图 / zone3d.js 战斗）
- `server-rs/tests/` — 集成测试
- `design/zhttty_universe/` — zhttty 系列原著研究 / 副本设计库 / 官方人物卡
- `tools/` — 生成脚本 / CDP 测试 / 素材管线

## 声明

本项目为对 zhttty「无限」系列作品的同人致敬 / 学习向箱庭游戏复刻，世界观、人物、恐怖片世界名均参考原著与公开百科资料。剧情人物设定以公开资料为准，如有出入以原著为准。