# 寂静岭 · 表里世界 副本实现日志

- BOSS: 三角头 HP180 dmg(16,24)
- 层数: 3
- 钩子: 雾里有东西在敲。

## ★外部依赖
1. lib.rs: pub mod scenes_jingjiling;
2. worlds/mod.rs: mod jingjiling; + WORLD_JINGJILING; + WorldData 注册 + 网关
3. scenes.rs: scene()/fight_cfg() 加 or_else
