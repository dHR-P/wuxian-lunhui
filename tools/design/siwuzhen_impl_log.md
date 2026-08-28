# 死亡开端 · 死雾镇 副本实现日志

- BOSS: 雾中行尸之王 HP180 dmg(16,24)
- 层数: 3
- 钩子: 雾里没有活人。

## ★外部依赖
1. lib.rs: pub mod scenes_siwuzhen;
2. worlds/mod.rs: mod siwuzhen; + WORLD_SIWUZHEN; + WorldData 注册 + 网关
3. scenes.rs: scene()/fight_cfg() 加 or_else
