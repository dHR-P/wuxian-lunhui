# 战斗表现多样化 · 设计落盘

> 角色：战斗表现多样化前端子代理（`tokenrhythm/deepseek-v4-flash-0731`）
> 改动范围：**仅** `server-rs/ui/js/zone3d.js`、`server-rs/ui/js/client.js`
> （client.js 仅做攻击特效路由所需的数据传递 + 武器类型下发，未动其他）。
> 未改：Rust / 其他前端 / index.html / assets；未引外部库。

---

## 1. 武器类型怎么拿到的（数据通路）

### 现状（改动前确认）
- `zone3d.js` 的 `setData(data)` / `onZoneUpdate(data)` 收到的 `data` 只有
  `{ id, kind, ref, enemy }`，**不含玩家武器**（enemy 有 `ref`，玩家无武器字段）。
- `client.js` 的 `enterZone` 在 `Zone3D.init` 后通过 `api_world_interact` / `envData`
  调 `Zone3D.setData({ id, kind, ref, enemy })`，同样不带武器。
- 后端 `engine.rs::hud_json` 提供 `"weapon"` 字段 = 旧 `Weapon` 枚举的**显示名**
  （`State::Weapon`：`Axe→"消防斧"`、`Gun→"9mm手枪"`、`Sword→"军刀"`、无→`"—"`）。
  前端 `client.js` 已用 `currentHud.weapon` 刷新 HUD（`refreshHud`），`currentHud`
  在进副本前由各 `api_*` invoke 填充。

### 采用的通路
- **前端可用且最稳**：`client.js` 在 `enterZone` 里读 `currentHud.weapon`（显示名），
  以 `weapon` 字段**原样传入 `Zone3D.setData`**。
- `zone3d.js` 内 `resolveWeaponStyle()` → 若入参已是五类风格之一则直用，否则交给
  `weaponStyle()` 按 **id + 名字关键字 + 已知 id 查表** 映射为
  `gun / laser / magic / melee / unarmed`。
- 解释：后端 `hud_json` 不返回 `equipment.weapon.id`（装备格 id 如 `wp_gauss` 是纯
  ASCII，且不在 hud 视图里），故前端当前只能拿到旧枚举的**中文显示名**。为满足
  “可映射到 gun/melee/magic/laser/unarmed”，zone3d 的 `weaponStyle` 既支持中文名
  （运行时真实路径），也内置 `WEAPON_STYLE_IDS` 查表覆盖
  `items_data::WEAPONS` / `TRESURE_DEFS` 的全部主手武器 id（将来若上游下发装备 id 也能直接用）。

```js
// client.js（enterZone）
const zoneWpn = (currentHud && currentHud.weapon) || "—";
Zone3D.setData({ id, kind, ref, enemy, weapon: zoneWpn });
```

---

## 2. 五类攻击特效（zone3d.js 新增函数，attack 时按武器类型路由）

模块级状态：`let curWeaponStyle = "unarmed"`，`setData` 里 `resolveWeaponStyle(data.weapon)` 赋值。

### 路由入口 `runAttackFx()`
```js
switch (curWeaponStyle) {
  case "gun":   shootFx(); break;
  case "laser": beamFx();  break;
  case "magic": magicFx(); break;
  case "melee": swingFx(); break;   // 刀战/剑/斧/镰/鞭
  default:      punchFx(); break;   // unarmed 拳击
}
```
在 `keydown` 的 `attack` 分支调用（`onAction("attack",0)` 语义不变，只换特效）。

| 风格 | 函数 | 视觉实现（不引外部库） |
|---|---|---|
| melee（刀/剑/斧/镰/鞭） | `swingFx()`（保留原有） | 弧形渐变刀光 + additive 光晕，从玩家朝向扫向敌人 |
| gun（手枪/高斯/狙击/轨道/银弹/电磁/引力炮） | `shootFx()` | 枪口闪光 + 细长胶囊弹道拖尾（沿朝向飞行衰减）+ 命中火花 `spawnSpark` |
| laser（激光/光剑/光束） | `beamFx()` | 从玩家到敌人的粗亮光柱（Cylinder）+ 半透明 Additive 边缘辉光柱，点亮 0.3s 后淡出；命中灼点火花 |
| magic（魔法/修真法术） | `magicFx()` | 发光法术球从玩家飞向敌人 + 旋转符文环（Torus）+ 命中爆散法阵粒子 |
| unarmed（拳脚/无武器） | `punchFx()` | 贴地短促冲击波光圈（Ring 快速扩张）+ 拳风残影拖尾；玩家手臂前挥由 `animateRig` attack 驱动 |

> 新增小型复用函数 `spawnSpark(pos,color,n)`：火花粒子进 `blood` 通道复用既有衰减/释放逻辑。

---

## 3. 动画深化（轻量，不破坏现有 rig）

| 动画 | 触发 | 驱动 | 实现 |
|---|---|---|---|
| 受击后仰 | `enemyHitFx()` 置 `enemy.userData.hurtT = 1` | `loop` 内体素敌人分支 | `hurtT` 每帧 -0.06（约 0.25 s），`upper.rotation.x += 0.4*hurtT` 短促后仰并线性回弹 |
| 死亡倒地 | `hp<=0` → `onZoneUpdate(win)` 置 `dying=true` | 体素敌人 dying 分支 | 原有下沉 `position.y=-0.5*k` 保留，新增整体侧倾 `rotation.z=0.62*k` + 前仰 `rotation.x=0.28*k`（0.7s 内倒到地） |
| 胜利动作 | `onZoneUpdate({win})` 置模块级 `victoryT=1` | `loop` 玩家 rig 分支 | `victoryT` 每帧 -0.02（约 0.5s），`armL/armR.rotation.x = -2.4*victoryT` 双臂上举并淡出 |

- `enemy.userData` 初始化补 `hurtT:0`（体素与立绘两条路径均补，体质敌人只走体素分支）。
- 死亡倒地只在体素敌人分支叠加 rotation（默认 `VOXEL_ENEMY=true`），不破坏立绘分支原有下沉淡出。

---

## 4. 武器映射表（`weaponStyle(weaponId)`）

优先级：① `WEAPON_STYLE_IDS` 已知 id 精确查表 → ② 空/无武器（`—`/`无`/`none`/空）→
③ 关键字正则（激光先于枪，避免『激光枪』误判 gun）→ ④ 兜底 `unarmed`。

### 已知 id 查表（来自 `items_data::WEAPONS` + `TRESURE_DEFS`）
```js
const WEAPON_STYLE_IDS = {
  // gun（枪械弹道）
  wp_gun9: "gun", wp_gauss: "gun", wp_silver_gun: "gun", wp_emi: "gun",
  wp_gravity_collapse: "gun", wpn_rail_sniper: "gun",
  // melee（近战刀剑斧镰鞭）
  wp_axe: "melee", wp_sword: "melee", wp_katana: "melee", wp_holy_sword: "melee",
  wp_cu_ju: "melee", wp_quantum_core: "melee", wp_scythe_pobing: "melee",
  wpn_bloodsaber: "melee", wp_quantum_annihil: "melee", wpn_taixu_godsaw: "melee",
  wpn_nano_whip: "melee", wpn_causality_sword: "melee", cu_bab_benming_fejian: "melee",
  // magic（修真法术：剑阵/幡/剑意图/法宝）
  wpn_zhuai_jianpan: "magic", wpn_shihun_fan: "magic", tr_zhuxian_calendar: "magic",
};
```

### 关键字兜底（中文名/未来未知 id）
- **unarmed**：空、`—`、`无`、`none`
- **laser**：`laser|photon|beam|光剑|光刃|光束|激光`
- **gun**：`gun|pistol|gauss|sniper|rail|gravit|emi|silver|手枪|高斯|狙击|轨道|电磁脉冲|引力|银弹|弹药|枪|shoot`
- **magic**：`magic|spell|staff|wand|soul|sect|法杖|符|法宝|法阵|剑阵|剑意|幡|镜|炉|灵|修真|修仙|术|杖|扇`
- **melee**：`sword|blade|saber|axe|scythe|whip|knife|dagger|katana|剑|刀|斧|镰|鞭|刃`

### 实测通过（35 例 0 失败）
消防斧=melee · 9mm手枪=gun · 军刀=melee · —=unarmed · 激光枪=laser ·
wp_gauss=gun · wpn_rail_sniper=gun · wp_gravity_collapse=gun · wp_katana=melee ·
wpn_zhuai_jianpan=magic · tr_zhuxian_calendar=magic · cu_bab_benming_fejian=melee · 等。

---

## 5. 接口保持（红线）

- `window.Zone3D` / `window.World2D` 对外方法不变：`init/setData/start/stop/dispose/
  onZoneUpdate/keydown/keyup/setResolution` 均在；`setData` 仅新增可选的 `weapon` 字段。
- `onAction('move'|'attack'|'dodge')` 语义不变：attack 仍触发（`onAction("attack",0)`），
  仅特效分流到 `runAttackFx()`。
- `ENEMY_SPRITES` / `VOXEL_ENEMY` / `VOXEL_PLAYER` 开关原样保留。

---

## 6. node --check

```
node --check server-rs/ui/js/zone3d.js  → exit 0
node --check server-rs/ui/js/client.js  → exit 0
```

未 build。

---

## 7. 遗留 / 边界

- 后端 `hud_json` 暂未下发 `equipment.weapon.id`，前端当前只能以旧枚举的中文显示名
  映射；若需支持“新装备武器(如 高斯/修真法宝) 在战斗中精确表现”，应让 Rust 在
  `hud_json` 或 `api_zone` 里补 `weaponId` 字段，zone3d 的 `WEAPON_STYLE_IDS` 已就绪可直接消费。
- 体素玩家胜利/受击动画仅在 `player.userData.rig` 存在时生效（`VOXEL_PLAYER=true` 默认即有）；
  立绘 billboard 模式主要依赖 `attackT` 前挥与既有视觉，未额外模拟手臂。
- 命中火花（`spawnSpark`）批量并入 `blood` 通道，`dispose()` 时随 `blood` 统一释放，无泄漏。
