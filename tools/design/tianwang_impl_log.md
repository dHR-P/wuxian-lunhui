# 无限曙光 · 天网地下 副本实现日志

- BOSS: 机械融合体 HP280 dmg(22,34)
- 层数: 3
- 钩子: 审判日，不是某一天——是一个程序。

## ★外部依赖
1. lib.rs: pub mod scenes_tianwang;
2. worlds/mod.rs: mod tianwang; + WORLD_TIANWANG; + WorldData 注册 + 网关
3. scenes.rs: scene()/fight_cfg() 加 or_else
