# 大宇宙时代 · 银色战争 副本实现日志

- BOSS: 银色舰长 HP250 dmg(20,30)
- 层数: 3
- 钩子: 真空里没有声音，但你能听见心跳。

## ★外部依赖
1. lib.rs: pub mod scenes_yinxiang;
2. worlds/mod.rs: mod yinxiang; + WORLD_YINXIANG; + WorldData 注册 + 网关
3. scenes.rs: scene()/fight_cfg() 加 or_else
