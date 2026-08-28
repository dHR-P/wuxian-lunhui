# 洪荒历 · 低纬度领地 副本实现日志

- BOSS: 灾厄聚合体 HP230 dmg(18,28)
- 层数: 3
- 钩子: 低纬度的影子，会追着活人。

## ★外部依赖
1. lib.rs: pub mod scenes_diweidu;
2. worlds/mod.rs: mod diweidu; + WORLD_DIWEIDU; + WorldData 注册 + 网关
3. scenes.rs: scene()/fight_cfg() 加 or_else
