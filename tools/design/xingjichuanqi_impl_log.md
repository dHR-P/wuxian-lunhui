# 星际传奇 · CD星球 副本实现日志

- BOSS: 嗜血生物群 HP160 dmg(14,24)
- 层数: 3
- 钩子: 这里的美，只在白天。

## ★外部依赖
1. lib.rs: pub mod scenes_xingjichuanqi;
2. worlds/mod.rs: mod xingjichuanqi; + WORLD_XINGJICHUANQI; + WorldData 注册 + 网关
3. scenes.rs: scene()/fight_cfg() 加 or_else
