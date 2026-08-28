# 无限未来 · 星际舰船 副本实现日志

- BOSS: 舰桥叛乱AI HP200 dmg(16,26)
- 层数: 3
- 钩子: 这艘船，已经不再属于人类。

## ★外部依赖
1. lib.rs: pub mod scenes_xingjijianchuan;
2. worlds/mod.rs: mod xingjijianchuan; + WORLD_XINGJIJIANCHUAN; + WorldData 注册 + 网关
3. scenes.rs: scene()/fight_cfg() 加 or_else
