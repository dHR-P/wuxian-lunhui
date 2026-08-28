# env 机关 ZoneDef 降级日志（kind: "env" → "puzzle"）

**背景**：引擎只支持 `kind == "fight" / "puzzle"` 的 zone kind。5 个新副本中的 `kind: "env"` 机关会被落为 generic 战斗且剧情不可达，故统一降级为 `kind: "puzzle"`（仅改 kind 字段，id/name/floor/x/y/ref_id 均不动）。

**日期**：2026-08-28
**执行**：极简修子代理

## 修改明细（5 个文件，共 6 处）

| 文件 | 位置 | zone id | 说明 |
|------|------|---------|------|
| server-rs/src/worlds/xingjichuanqi2.rs | ZONES L1 | xj2_z_l1_cavein | 塌方竖井口 |
| server-rs/src/worlds/jialebi.rs | ZONES L3 | jb_z_cavein | 洞顶坍方落石带 |
| server-rs/src/worlds/shenghua3.rs | ZONES L1 | sh3_z_l1_sewage | 污水渠漫水区 |
| server-rs/src/worlds/jishujing.rs | ZONES L3 | jj2_z_l3_flash | 记忆回潮区 |
| server-rs/src/worlds/bihai.rs | ZONES L3 | bh_z_l3_pressure | 深水压·殉道深渊 |
| server-rs/src/worlds/bihai.rs | ZONES L3 | bh_z_l3_anoxia | 缺氧裂隙 |

## 验证

- `cargo check` 通过：`LASTEXITCODE=0`（仅存在的历史 warning，无新增错误）。
- 改动后再 grep `kind: "env"` 5 个文件均无匹配。