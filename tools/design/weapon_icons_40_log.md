# 武器图标生成 log (40 个) — 最终

**工作目录**: `C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1`
**日期**: 2026 (三批: 首轮 + pass2 + pass3)
**生成工具**: `tools/design/gen_wan.py:gen(prompt, "768x768", out)` (模型 `wan2.7-image`, tokenrhythm API)
**质检**: `qwen3.7-flash` (data URL base64, JSON verdict; 每项重复 ≤3 次, QUANCE-LIMIT/503 时退避重试)
**部署目录**: `server-rs/ui/assets/img/item_<weapon_id>.png`
**坐标系**: 纯黑平底方形 768×768, 武器居中, 无文字/水印/边框

## 验收结论

- **PASS: 40/40** | **FAIL: 0/40**
- 40 个图标全部生成、质检通过、已部署到 `server-rs/ui/assets/img/`。
- 首轮 24 PASS / 16 FAIL → pass2 修正 prompt 抢救 12 → pass3 抢救最后 4 → 40/40。

## 花费(估算)

- 生图调用次数(含重试): 首轮 ~77 + pass2 ~33 + pass3 ~6 ≈ **116 次** × ¥0.20 ≈ **¥23.2**
- 质检(qwen3.7-flash)调用: 每张约 1~3 次, 预计 60~120 次 (预算内)。
- (项目预算不限)

## 部署清单 (40, 全部 PASS)

| # | 类别 | weapon_id | 部署文件 | 中文名 | 状态 |
|---|------|-----------|----------|--------|------|
| 1 | 动漫 | wp_zanjingdao_he | item_wp_zanjingdao_he.png | 斩魄刀·卍解 | ✅ |
| 2 | 动漫 | wp_excalibur_holy | item_wp_excalibur_holy.png | 誓约胜利之剑 | ✅ |
| 3 | 动漫 | wp_beam_saber | item_wp_beam_saber.png | 光束军刀 | ✅ |
| 4 | 动漫 | wp_zanyue | item_wp_zanyue.png | 斩月大刀 | ✅ |
| 5 | 动漫 | wp_qianbenying | item_wp_qianbenying.png | 千本樱·散舞 | ✅ |
| 6 | 动漫 | wp_wang_zhicai | item_wp_wang_zhicai.png | 王之财宝·宝具齐射 | ✅ |
| 7 | 动漫 | wp_guaili_jian | item_wp_guaili_jian.png | 乖离剑·EA | ✅ |
| 8 | 动漫 | wp_ruyibang | item_wp_ruyibang.png | 如意金箍棒 | ✅ |
| 9 | 仙侠 | wp_xuanyuan_jian | item_wp_xuanyuan_jian.png | 轩辕剑·人皇 | ✅ |
| 10 | 仙侠 | wp_pangu_fu | item_wp_pangu_fu.png | 盘古开天斧 | ✅ |
| 11 | 仙侠 | wp_zhuxian_sijian | item_wp_zhuxian_sijian.png | 诛仙四剑·合一 | ✅ |
| 12 | 仙侠 | wp_zhanxian_feidao | item_wp_zhanxian_feidao.png | 斩仙飞刀 | ✅ |
| 13 | 仙侠 | wp_fantian_yin | item_wp_fantian_yin.png | 翻天印 | ✅ |
| 14 | 仙侠 | wp_taiji_tu | item_wp_taiji_tu.png | 太极图 | ✅ |
| 15 | 仙侠 | wp_shanhe_shetu | item_wp_shanhe_shetu.png | 山河社稷图 | ✅ |
| 16 | 仙侠 | wp_feijian_qingyun | item_wp_feijian_qingyun.png | 青云飞剑 | ✅ |
| 17 | 科幻 | wp_gauss_rifle | item_wp_gauss_rifle.png | 高斯步枪 | ✅ |
| 18 | 科幻 | wp_particle_cannon | item_wp_particle_cannon.png | 粒子炮 | ✅ |
| 19 | 科幻 | wp_electromag_gun | item_wp_electromag_gun.png | 电磁加速炮 | ✅ |
| 20 | 科幻 | wp_plasma_dagger | item_wp_plasma_dagger.png | 等离子刺刃 | ✅ |
| 21 | 科幻 | wp_antimatter_round | item_wp_antimatter_round.png | 反物质湮灭弹 | ✅ |
| 22 | 科幻 | wp_orbital_gun | item_wp_orbital_gun.png | 轨道天基枪 | ✅ |
| 23 | 科幻 | wp_laser_sword | item_wp_laser_sword.png | 纯激光剑 | ✅ |
| 24 | 科幻 | wp_nano_blade | item_wp_nano_blade.png | 纳米蜂巢剑 | ✅ |
| 25 | 魔幻 | wp_shuang_zhi_aisang | item_wp_shuang_zhi_aisang.png | 霜之哀伤 | ✅ |
| 26 | 魔幻 | wp_leidun_chui | item_wp_leidun_chui.png | 雷神之锤·妙尔尼尔 | ✅ |
| 27 | 魔幻 | wp_sheng_jian_mj | item_wp_sheng_jian_mj.png | 光之圣剑 | ✅ |
| 28 | 魔幻 | wp_mo_jian_zhl | item_wp_mo_jian_zhl.png | 诅咒魔剑·噬主 | ✅ |
| 29 | 魔幻 | wp_arcan_staff | item_wp_arcan_staff.png | 奥术增幅法杖 | ✅ |
| 30 | 魔幻 | wp_madoushu_grimoire | item_wp_madoushu_grimoire.png | 禁忌魔导书 | ✅ |
| 31 | 魔幻 | wp_xianzhe_zhi_shi | item_wp_xianzhe_zhi_shi.png | 贤者之石刃 | ✅ |
| 32 | 魔幻 | wp_dragon_lance | item_wp_dragon_lance.png | 龙枪·屠龙 | ✅ |
| 33 | 武侠 | wp_yitian_jian | item_wp_yitian_jian.png | 倚天剑 | ✅ |
| 34 | 武侠 | wp_tulong_dao | item_wp_tulong_dao.png | 屠龙宝刀 | ✅ |
| 35 | 武侠 | wp_dagou_bang | item_wp_dagou_bang.png | 打狗棒·逍遥 | ✅ |
| 36 | 武侠 | wp_xuantie_jian | item_wp_xuantie_jian.png | 玄铁重剑 | ✅ |
| 37 | 武侠 | wp_lixiao_feidao | item_wp_lixiao_feidao.png | 小李飞刀·例无虚发 | ✅ |
| 38 | 武侠 | wp_liumai_jian | item_wp_liumai_jian.png | 六脉神剑·少商剑 | ✅ |
| 39 | 武侠 | wp_beiming_jian | item_wp_beiming_jian.png | 北冥神功·吸星剑 | ✅ |
| 40 | 武侠 | wp_dugu_jiujian | item_wp_dugu_jiujian.png | 独孤九剑·破剑式 | ✅ |

## 过程说明

1. **首轮 (gen_weapon_icons_40.py)**: 一次性批量生 40; 每项 ≤3 次(1 初试 + ≤2 重试)。产出 **24 PASS / 16 FAIL**。
   - FAIL 主因: ①发光武器(光束军刀/激光剑/霜之哀伤/青云飞剑/太极图等)边缘辉光/外发光被 qwen 判污染;
     ②大斧/雷神锤/翻天印等表面被 wan 画出可读字母/符文; ③内容形态不符(双剑交叉、药瓶柄飞刀、非卍解)。
2. **pass2 (gen_weapon_icons_40_pass2.py)**: 对 16 FAIL 做去辉光/去符文/内容单剑化的修正 prompt, 抢救 **12 → PASS**。
3. **pass3 (gen_weapon_icons_40_pass3.py)**: 对剩余 4 (斩魄刀卍解/太极图/青云飞剑/等离子刺刃) 再做单剑/纯平 logo/光源全封闭刃内 修正, **全部 PASS**。

## 遗留

- **无 FAIL**。40/40 已部署。
- **(重要维护说明)** 脚本初版 `DEPLOY_DIR` 计算有一级路径偏差, 曾把首轮 24 个图标写到
  `tools/server-rs/ui/assets/img/`; 已全部迁回正确目录 `server-rs/ui/assets/img/` 并核对 40 文件齐全。
  `tools/server-rs/ui/...` 为该项目既有的素材暂存区(bl_*/gear_*/tr_* 等), 未删除; 迁移仅针对本次 item_wp_*。
- 图标接线(把 `item_<weapon_id>.png` 挂到前端/在 .rs 中消费)后续另行处理; 本次未改动任何 `.rs` 文件。
- 中间态保留在 `tools/design/item_icons/weapon_stages_40|weapon_pass2_stages|weapon_pass3_stages/`, 可留作复核。
