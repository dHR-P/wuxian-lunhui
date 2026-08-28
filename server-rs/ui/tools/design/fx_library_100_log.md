# 百种战斗特效库 · 设计落盘

> 角色：百种战斗特效库前端子代理（`tokenrhythm/deepseek-v4-flash-0731`）
> 改动范围：**仅** `server-rs/ui/js/zone3d.js`（参数化特效引擎 + 特效库表 + 映射重定向 + 随机兜底 + 音效联动）。
> 未改：client.js / index.html / Rust / assets；未引外部库（仅 three.min.js + Canvas 生成纹理）。

---

## 1. FX_LIBRARY 总条目数（分风格）

`FX_LIBRARY` 常量（`zone3d.js` 内）共 **114 条**，按 `style` 分 5 类：

| 风格 style | 条目数 | 代表特效 |
|---|---|---|
| anime（动漫气功） | 26 | 气功波 / 螺旋能量丸 / 暗月弧刃 / 雷光闪 / 千鸟雷光 / 元气弹 / 流星拳 / 天照黑炎 / 须佐之剑 / 元气冲击波 / 灵丸 / 邪王炎杀拳 / 黑棺囚笼 / 凤仙火之术 / 螺旋丸闪 / 瞬极冲刺 / 月牙天冲 / 霸王色气场 / 斗气冲击 / 赤雕火翼 / 威吓白波 / 紫翼雷闪 / 能量浪波 / 金光护体 / 影分身乱拳（26） |
| xianxia（仙侠小说） | 26 | 御剑术 / 万剑归宗 / 掌心雷 / 三昧真火 / 五雷正法 / 诛仙剑阵 / 剑气纵横 / 真元护体 / 法相天地 / 大挪移 / 翻天印 / 斩仙飞刀 / 葫芦收宝 / 十万剑气 / 金刚咒 / 地狱烈焰 / 爆丹焚天 / 青莲剑意 / 雷公轰天 / 太虚流光 / 斗转星移 / 青云直上 / 诛仙剑气 / 时间封印 / 定天一掷 / 剑魔灭世（26） |
| scifi（科幻武器） | 26 | 激光炮 / 等离子炮 / 电磁轨道 / 反物质湮灭 / 量子坍缩 / 引力波 / 黑洞坍缩 / 纳米风暴 / 高能粒子束 / 轨道打击 / 离子风暴 / 相位炮 / 曲速弹 / 湮灭奇点 / 等离子刀刃 / 高斯碎裂 / 光刃切割 / 黑域封锁 / 曲率爆闪 / 等离子束 / 量子极光 / 纳米切割 / 重力井 / 雷神电磁炮 / 星陨龙啸 / 聚变核心（26） |
| wuxia（武侠/魔法） | 26 | 剑气 / 刀气 / 掌风 / 剑意 / 内功罡气 / 一指禅 / 烈焰术 / 寒冰箭 / 闪电链 / 火墙 / 冰风暴 / 召唤雷云 / 寒霜之怒 / 凤舞火诀 / 冷月刀光 / 赤龙雷诀 / 冰龙破 / 红莲业火 / 无敌剑意 / 地龙掌 / 风暴剑 / 凝冰咒 / 混元气罡 / 时光符 / 叠层雷暴 / 魂散令（26） |
| divine（神性圣光） | 10 | 圣光降临 / 极光守护 / 神雷辟邪 / 天道之剑 / 神辉焚天 / 天使裁决 / 能量圣门 / 帝君光环 / 审判神光 / 圆体神辉（10） |

**总计 = 26*4 + 10 = 114 ≥ 100。**

每条目统一结构 `{id, name, shape, color, particle, motion, style}`：

- **shape**（16 构造器选一）：`arc`刀光 / `blade`剑气·直线刃 / `beam`光束柱 / `orb`光球 / `spire`垂直光柱 / `helix`螺旋 / `runering`符文环 / `shockwave`能量波·扩散环 / `swordrain`剑阵·多道 / `bolt`雷电·折线 / `flame`火焰 / `frost`冰霜 / `void`黑洞·吸聚 / `warp`时空·扭曲 / `dragon`龙形·曲线粒子 / `meteor`流星群。
- **color**（16 色取一）：红/橙/金/黄/绿/青/蓝/紫/粉/白/黑/洋/深蓝/紫红/天蓝/银 → 十六进制 palette `FX_COLORS`。
- **particle**：spark火花 / dust光尘 / arc雷电弧 / fire火焰粒 / ice冰晶 / shadow暗影 / stardust星屑 / void湮灭粒。
- **motion**：track直线·追踪 / curve弧形 / spiral螺旋 / scatter散射 / orbit环绕 / burst扩散 / rise上升。
- **style**：anime / xianxia / scifi / wuxia / divine。

---

## 2. 参数化引擎怎么实现（fxEmitter）

`fxEmitter(entry)` 统一入口，读条目四参后：

1. `col = FX_COLORS[entry.color]`；
2. `switch (entry.shape)` 分发到对应 shape 构造器（`emitArc/emitBlade/emitBeam/emitOrb/emitSpire/emitHelix/emitRing/emitShock/emitSwordRain/emitBolt/emitFlame/emitFrost/emitVoid/emitWarp/emitDragon/emitMeteor`，16 个，默认回落 `emitOrb`）；
3. shape 构造器内部用 `col` 定材质 tint、用 Canvas/THREE 原语（`PlaneGeometry` 渐变刃、`CylinderGeometry` 光柱、`RingGeometry` 能量波、`Line` 闪电、`BoxGeometry` 粒子、`glowSprite` 光晕精灵）可视化，并把 `particle/motion` 体现在粒子方向/轨迹上（如 `helix` 螺旋光点、`orb` 命中爆 `spawnSpark`、`flame` 上浮火粒、`void` 吸聚坍缩）。
4. **粒子与释放复用现有通道**：火花统一走 `spawnSpark`→`blood` 数组（`updateBlood` 每帧衰减并 dispose）；一次性几何在各构造器 rAF 结束后 `scene.remove + geometry.dispose + material.dispose`，纹理同 `tex.dispose`；`glowSprite` 复用全局 `getGlowTex()`。
5. **音效联动（加分）**：`fxSfx(shape)` 防御式调 `AudioSys.sfx` —— beam/bolt 触发 `laser`，blade/arc/swordrain 触发 `hit`，其余触发默认 blip；无音频则不接。
6. **性能红线**：单次 attack 内各构造器粒子数（spark 8~16、flame 14、frost 16、void 18、helix/dragon/meteor 20~24 sprite）均 ≤ `FX_PARTS_CAP`(40)；持续血统 aura 沿用原 24~30 粒子 ≤ `FX_AURA_CAP`(30)。additive 混合、depthWrite:false，8G 显存预算内。

---

## 3. 映射方式

三张映射表全部重定向到 `FX_LIBRARY` 的 fx id（`runAttackFx` 通过 `fxById()` 解析后 `fxEmitter` 生成）：

- **WEAPON_FX**（武器细分，`.key` 由 `weapons_*` 旧键改为 fx id）：
  - 血戮剑/破军重镰→`f_diablo_fire`（红焰） · 诛仙剑阵盘→`f_zhuxian_zhen`（剑阵） · 太虚神剑→`f_taixu_liu`（太虚流光） · 纳米切割鞭→`f_nano_cutter` · 量子湮灭刀→`f_anmiao`（反物质湮灭） · 引力坍缩炮→`f_gravity_well`（重力井） · 因果律护身剑→`f_warp_burst`（曲率爆闪） · 电磁轨道狙击枪→`f_dianci_guidao`（电磁轨道） · 本命飞剑·青锋/秋水神剑→`f_yujian`（御剑术）。
- **TREASURE_FX**（法宝，`kind` 改 `fxId`）：诛仙剑意图→`f_zhuxian_qi` · 血煞战旗→`f_honghuo_binh` · 太虚玄光镜→`f_guangdun` · 神雷辟邪佩→`f_shenlei` · 锻心明镜→`f_jiguan_shuf` · 逆转生死盘→`f_shijian_feng`。
- **SCHOOL_STREAM**（技能流派，新增 `fxId`）：修真→`f_jianyi` · 圣光→`f_shengguang` · 超能NT→`f_nengliang_lie` · 模因→`f_nanmi_feng`。
- **STYLE_DEFAULT_FX**（5 大类兜底，新增）：melee→`f_jianqi`(剑气) · gun/laser→`f_laser_pao` · magic→`f_qigongbo` · unarmed→`f_zhangfeng`(掌风)。
- **`randomFx(styleHint)`** 随机兜底：在 `FX_LIBRARY` 按当前武器风格 style 过滤后随机挑一条；`runAttackFx` 中除武器细分/大类默认外，约 15% 概率额外叠加一条风格相符的随机特效，保证上百种都能被用到。

`resolveWeaponFxKey` 函数未改签名，`setData` 中 `weaponFxKey = resolveWeaponFxKey(data.weapon)` 现在返回 FX 库 id，直接由新 `runAttackFx` 消费。

---

## 4. 红线保持

- `window.Zone3D` 对外方法不变（`init/setData/start/stop/dispose/onZoneUpdate/keydown/keyup/setResolution`）；
- `onAction('move'|'attack'|'dodge')` 语义不变：attack 仍触发 `onAction("attack",0)`，`runAttackFx()` 仅换内部特效实现；
- 不引外部库；`VOXEL_ENEMY` / `VOXEL_PLAYER` / `ENEMY_SPRITES` 原样保留；
- 血统 aura / dispose 通道原样保留（新增引擎粒子全部并入 `blood` 或自管 dispose）。

---

## 5. 验收

```
node --check server-rs/ui/js/zone3d.js   → exit 0
grep -c '{ id: "f_'  zone3d.js           → 114（FX_LIBRARY 条目 ≥100）
```
- 映射引用校验：WEAPON/TREASURE/SCHOOL/STYLE_DEFAULT 引用的全部 21+4 个 fx id 均存在于 FX_LIBRARY（无悬空引用）。
- 读取改动段确认：参数化引擎（fxEmitter + 16 shape 构造器）、映射重定向、randomFx 随机兜底自洽。
- 未 build。

---

## 6. 遗留 / 边界

- 旧的 5 类基础 fx 函数（`swingFx/shootFx/beamFx/magicFx/punchFx`）已不再被 `runAttackFx` 调用，保留为死代码（无害，未删除以最小改动）。
- `particle`/`motion` 字段已统一编码进库表，但各 shape 构造器主要驱动在 shape+color；particle/motion 仅在 helix/orb/flame/void/helix 等少数构造器体现为具体轨迹差异，属按需解析（可为后续每 shape 深化轨迹差异留扩展位）。
- 音效联动为「无音效不接」的防御式实现：若 `AudioSys` 未暴露到 `window` 则静默跳过，不阻断游戏逻辑。
