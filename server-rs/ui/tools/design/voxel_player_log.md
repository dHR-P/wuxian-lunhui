# 战斗3D副本 · 玩家体素化 + 视角拉近 落盘日志

> 前端子代理：战斗场景玩家体素化 + 视角拉近（tokenrhythm/deepseek-v4-flash-0731）
> 修改文件：`server-rs/ui/js/zone3d.js`（仅渲染/相机层）

## 1. 需求摘要
- 玩家「立绘 billboard」→「MC 方块体素人」（与敌人体素人 `buildVoxelEnemy` 同构同比例），
  蓝衣 Steve 风配色，脚底对齐地屏 y=0。
- 战斗副本视角拉近，让两 MC 方块人对峙时占画面 1/3~1/2，清晰展示身体细节。

## 2. buildVoxelPlayer 实现
新增函数（`zone3d.js` L202-225），与 `buildVoxelEnemy` 完全同构：

```
function buildVoxelPlayer(g) {
  const box = (w,h,d,col,x,y,z) => { Mesh(BoxGeometry, MeshLambertMaterial); ... };
  const shirt=0x3a5ba0, pants=0x2a3450, skin=0xd8a878;
  box(0.9, 1.1, 0.5, shirt, 0, 1.15, 0);       // 躯干
  box(0.5, 0.5, 0.5, skin,  0, 2.0, 0);        // 头
  box(0.28,0.95,0.28,shirt,-0.62,1.0,0);       // 左臂
  box(0.28,0.95,0.28,shirt, 0.62,1.0,0);       // 右臂
  box(0.34,0.9, 0.34,pants,-0.22,0.45,0);      // 左腿
  box(0.34,0.9, 0.34,pants, 0.22,0.45,0);      // 右腿
  g.scale.setScalar(1.15);                     // 与敌人体素人同比例
}
```

### 配色（玩家专属）
| 部位 | 颜色 | hex |
|------|------|-----|
| 躯干 | 衣(主色) | `0x3a5ba0` |
| 头   | 肤色     | `0xd8a878` |
| 左右臂 | 衣(主色) | `0x3a5ba0` |
| 左右腿 | 裤装(深蓝) | `0x2a3450` |

### 比例对齐（与敌人体素人一致）
- 六段 BoxGeometry 尺寸/偏移与 `buildVoxelEnemy` 完全相同（躯干 0.9×1.1×0.5、头 0.5³、臂
  0.28×0.95×0.28、腿 0.34×0.9×0.34）。
- 脚底：腿部 y=0.45±0.9/2 → 底边 y=0 → 贴地。均 `g.scale.setScalar(1.15)` → 站体高约 2.6 单位
  （与敌人体素人完全等高）。

## 3. camDist 新旧值
- 旧：`camDist = 9`
- 新：`camDist = 4.6`（`zone3d.js` L27）

### 配套取景微调（L667-672）
近距离时原相机高 4.5 过度俯视，改平视展示双 MC 方块人细节；`_camTarget` 复用与 `lerp(0.12)`
机制不变：
- 相机高度：`4.5 → 3.2`
- `lookAt` 注视点：`y 1.2 → 1.4`（两体人中部）
- 水平偏移 = `camDist*0.6 = 2.76`，相机高 3.2 > 玩家头顶(≈2.6) 且水平偏移 2.76 → 不穿模。

## 4. VOXEL_PLAYER 开关
- 新增常量（`zone3d.js` L38）：`const VOXEL_PLAYER = true;`
- `true` → 玩家建 `buildVoxelPlayer` 体素人（`sprite=null, spec=null`）。
- `false` → 回退原 `pc_zhengzha.png` 立绘 billboard（else 分支完整保留贴图/光源/`buildPrimitivePlayer` 兜底）。
- 与既有 `VOXEL_ENEMY` 开关风格一致；纯视觉开关。

## 5. 交互契约保持证据
- `window.Zone3D = Zone3D` 导出不变：`{ init, setData, start, stop, dispose, onZoneUpdate, keydown, keyup }`。
- `onAction("move|attack|dodge") / onMsg / onWin / onExit` 全部原样，未触碰。
- `ENEMY_SPRITES`、`PLAYER_SPRITE` 常量未改。
- 玩家 `player` 组名字/数据结构不变，仅换内部子对象；`yaw`/`PX`/`EZ`/`swingFx` 语义未动。
- 体素玩家（`sprite=null`）时，L621 billboard 呼吸与 L286 残影自动跳过——不报错、不破坏判定。

## 6. node --check
```
# cwd = server-rs/ui
node --check js/zone3d.js   →   exit 0
```

## 7. 遗留/注意事项
- 若后续想让体素玩家也有闪避残影（当前 `spawnAfterImage` 依赖 `sprite` 立绘，对体素玩家不生效），
  需为该通道补充独立残影实现（本次范围外）。
- 相机高度微调是「合理取景」范围内的数值微调，未改 `_camTarget` lerp 逻辑本身。
- 未执行 `build --release`（按约束）。