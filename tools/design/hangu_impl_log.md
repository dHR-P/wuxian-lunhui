# 洪荒历 · 函谷关攻防 副本实现日志

- BOSS: 狂化军团长箜邪 HP240 dmg(18,30)
- 层数: 3
- 钩子: 人族的城墙，是最后一道。

## ★外部依赖
1. lib.rs: pub mod scenes_hangu;
2. worlds/mod.rs: mod hangu; + WORLD_HANGU; + WorldData 注册 + 网关
3. scenes.rs: scene()/fight_cfg() 加 or_else
