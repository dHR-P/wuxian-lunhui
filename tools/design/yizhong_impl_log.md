# 无限恐怖 · 异种 副本实现日志

- BOSS: 异种成体 HP170 dmg(14,24)
- 层数: 3
- 钩子: 它不是入侵——是进化错误。

## ★外部依赖
1. lib.rs: pub mod scenes_yizhong;
2. worlds/mod.rs: mod yizhong; + WORLD_YIZHONG; + WorldData 注册 + 网关
3. scenes.rs: scene()/fight_cfg() 加 or_else
