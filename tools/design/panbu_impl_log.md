# panbu 副本实现日志

- slug: panbu，前缀 pb_，世界：洪荒历 · 盘部落圣遗之夜
- BOSS：灵蛇族长蛇牙祭仪 HP200 dmg(16,24)，reward 500，rage 60，3 层
- 文件：
  - server-rs/src/worlds/panbu.rs
  - server-rs/src/scenes_panbu.rs
  - server-rs/tests/panbu_flow.rs
- 场景：pb_00 开场 → pb_01 迎战分层 → pb_round BOSS交手 → pb_card 结算 / pb_death 死亡
- BOSS flag: pb_boss_down，奖励物品 pb_reward