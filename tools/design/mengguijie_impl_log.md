# 猛鬼街 · 弗莱迪梦境 副本实现日志

- BOSS: 弗莱迪 HP190 dmg(16,26)
- 层数: 3
- 钩子: 别睡着。睡着了，就是它的。

## ★外部依赖
1. lib.rs: pub mod scenes_mengguijie;
2. worlds/mod.rs: mod mengguijie; + WORLD_MENGGUIJIE; + WorldData 注册 + 网关
3. scenes.rs: scene()/fight_cfg() 加 or_else
