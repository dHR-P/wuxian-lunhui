# 大宇宙时代 · 星辰吞噬者 副本实现日志

- BOSS: 星核守卫 HP220 dmg(18,28)
- 层数: 3
- 钩子: 它的胃，是一整个星团。

## ★外部依赖
1. lib.rs: pub mod scenes_xingchen;
2. worlds/mod.rs: mod xingchen; + WORLD_XINGCHEN; + WorldData 注册 + 网关
3. scenes.rs: scene()/fight_cfg() 加 or_else
