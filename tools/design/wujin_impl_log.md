# 洪荒历 · 无尽森林 副本实现日志

- BOSS: 兽人战潮王 HP210 dmg(16,26)
- 层数: 3
- 钩子: 森林会吃人——也吃文明。

## ★外部依赖
1. lib.rs: pub mod scenes_wujin;
2. worlds/mod.rs: mod wujin; + WORLD_WUJIN; + WorldData 注册 + 网关
3. scenes.rs: scene()/fight_cfg() 加 or_else
