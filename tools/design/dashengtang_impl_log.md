# 死亡开端 · 大教堂圣所 副本实现日志

- BOSS: 污染圣物之灵 HP180 dmg(16,24)
- 层数: 3
- 钩子: 圣光最盛处，腐得最深。

## ★外部依赖
1. lib.rs: pub mod scenes_dashengtang;
2. worlds/mod.rs: mod dashengtang; + WORLD_DASHENGTANG; + WorldData 注册 + 网关
3. scenes.rs: scene()/fight_cfg() 加 or_else
