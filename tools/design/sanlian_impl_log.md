# 洪荒历 · 三联盟会盟 副本实现日志

- BOSS: 狂誓者 HP180 dmg(16,24)
- 层数: 2
- 钩子: 举杯的下一秒，脚下是祭坛。

## ★外部依赖
1. lib.rs: pub mod scenes_sanlian;
2. worlds/mod.rs: mod sanlian; + WORLD_SANLIAN; + WorldData 注册 + 网关
3. scenes.rs: scene()/fight_cfg() 加 or_else
