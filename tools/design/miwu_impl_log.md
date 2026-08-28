# 无限恐怖 · 迷雾 副本实现日志

- BOSS: 雾中巨物 HP220 dmg(18,28)
- 层数: 3
- 钩子: 雾里最可怕的，是雾里回来的人。

## ★外部依赖
1. lib.rs: pub mod scenes_miwu;
2. worlds/mod.rs: mod miwu; + WORLD_MIWU; + WorldData 注册 + 网关
3. scenes.rs: scene()/fight_cfg() 加 or_else
