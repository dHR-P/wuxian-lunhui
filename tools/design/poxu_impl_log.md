# 侠行天下 · 武极境破虚 副本实现日志

- BOSS: 异界来者 HP320 dmg(22,34)
- 层数: 4
- 钩子: 武的尽头，是另一个世界的开始。

## ★外部依赖
1. lib.rs: pub mod scenes_poxu;
2. worlds/mod.rs: mod poxu; + WORLD_POXU; + WorldData 注册 + 网关
3. scenes.rs: scene()/fight_cfg() 加 or_else
