# 大宇宙时代 · 诺亚方舟 副本实现日志

- BOSS: 失控武装头目 HP150 dmg(12,20)
- 层数: 2
- 钩子: 有些救不了的人，也要去救。

## ★外部依赖
1. lib.rs: pub mod scenes_nuoya;
2. worlds/mod.rs: mod nuoya; + WORLD_NUOYA; + WorldData 注册 + 网关
3. scenes.rs: scene()/fight_cfg() 加 or_else
