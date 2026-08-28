# 无限曙光 · 蓝山保卫战 副本实现日志

- BOSS: 攻城巨魔督军 HP260 dmg(20,32)
- 层数: 3
- 钩子: 一个城市，一座山，一场输不起的仗。

## ★外部依赖
1. lib.rs: pub mod scenes_lanshan;
2. worlds/mod.rs: mod lanshan; + WORLD_LANSHAN; + WorldData 注册 + 网关
3. scenes.rs: scene()/fight_cfg() 加 or_else
