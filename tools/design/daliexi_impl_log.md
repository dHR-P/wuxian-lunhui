# 死亡开端 · 大裂隙 副本实现日志

- BOSS: 裂隙行尸聚合体 HP220 dmg(18,28)
- 层数: 3
- 钩子: 裂口下面，是另一个死亡。

## ★外部依赖
1. lib.rs: pub mod scenes_daliexi;
2. worlds/mod.rs: mod daliexi; + WORLD_DALIEXI; + WorldData 注册 + 网关
3. scenes.rs: scene()/fight_cfg() 加 or_else
