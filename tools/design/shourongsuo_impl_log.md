# 无限曙光 · 收容所 副本实现日志

- BOSS: 模因具现体 HP190 dmg(16,26)
- 层数: 3
- 钩子: 被收容的不是东西——是概念。

## ★外部依赖
1. lib.rs: pub mod scenes_shourongsuo;
2. worlds/mod.rs: mod shourongsuo; + WORLD_SHOURONGSUO; + WorldData 注册 + 网关
3. scenes.rs: scene()/fight_cfg() 加 or_else
