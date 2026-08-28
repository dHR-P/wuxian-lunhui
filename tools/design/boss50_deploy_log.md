# BOSS50 立绘部署清单

- 任务：素材部署（纯文件复制）
- 时间：运行时生成
- 源目录：`tools/design/cutout_boss50/boss_<slug>.png`
- 目标目录：`server-rs/ui/assets/img/enemy_<slug>.png`
- 安全：未碰任何 .rs/.js/.json，未 build

## 复制的 11 张（全部源文件已确认存在）

| # | slug | 源文件 | 目标文件 | 字节数 |
|---|------|--------|----------|--------|
| 1 | sanjiaotou | tools/design/cutout_boss50/boss_sanjiaotou.png | server-rs/ui/assets/img/enemy_sanjiaotou.png | 503655 |
| 2 | fulaidi | tools/design/cutout_boss50/boss_fulaidi.png | server-rs/ui/assets/img/enemy_fulaidi.png | 558589 |
| 3 | yizhong | tools/design/cutout_boss50/boss_yizhong.png | server-rs/ui/assets/img/enemy_yizhong.png | 469304 |
| 4 | jixianti | tools/design/cutout_boss50/boss_jixianti.png | server-rs/ui/assets/img/enemy_jixianti.png | 653988 |
| 5 | baojun | tools/design/cutout_boss50/boss_baojun.png | server-rs/ui/assets/img/enemy_baojun.png | 600038 |
| 6 | miwujuwu | tools/design/cutout_boss50/boss_miwujuwu.png | server-rs/ui/assets/img/enemy_miwujuwu.png | 642825 |
| 7 | xingshiwang | tools/design/cutout_boss50/boss_xingshiwang.png | server-rs/ui/assets/img/enemy_xingshiwang.png | 571603 |
| 8 | juanzhe | tools/design/cutout_boss50/boss_juanzhe.png | server-rs/ui/assets/img/enemy_juanzhe.png | 712891 |
| 9 | kuangxie | tools/design/cutout_boss50/boss_kuangxie.png | server-rs/ui/assets/img/enemy_kuangxie.png | 558755 |
| 10 | shourenchaowang | tools/design/cutout_boss50/boss_shourenchaowang.png | server-rs/ui/assets/img/enemy_shourenchaowang.png | 885730 |
| 11 | jixieronghe | tools/design/cutout_boss50/boss_jixieronghe.png | server-rs/ui/assets/img/enemy_jixieronghe.png | 547075 |

合计：11 张，源文件逐张确认存在后全部复制成功，目标字节数与源完全一致（0 字节差异）。