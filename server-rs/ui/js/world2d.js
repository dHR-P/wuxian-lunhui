/* 开放世界 · 3D 体素地图引擎（Three.js）—— MC/zone3d 体素风一致
 * 负责: 体素方块地板 / 立体体素墙柱 / 体素方块人玩家(WASD 格子移动) / 敌人/NPC/道具 立体呈现 /
 *       第三人称跟随相机 / 轮回迷雾(explored) / 交互(E)
 * 通过 window.World2D.init 的回调 opts.onMove(dx,dy) / onInteract(objId) 与 IPC 通信。
 *
 * 编码铁律：本文件含中文注释，改动必须走 read/edit/write（UTF-8），严禁 PowerShell 文本往返。
 *
 * 视角说明（与 zone3d 战斗场景观感一致）：
 *  - 每格地面 = 一块受贴图地板块（蜂巢 tex_floor_hive.png 平铺）
 *  - 墙格 `#` = 体素方块柱（BoxGeometry，比地板高出，呈 MC 墙）
 *  - 实体（玩家/敌人/NPC/道具/传送门/门禁/副本入口）→ 体素方块人或 billboard 精灵，站在格子地平面上
 *  - 第三人称相机跟拍玩家（绕 x 轴俯视，透视 60°，带立体纵深）
 *  - WASD 移动仍走格子级 api_world_move（opts.onMove(dx,dy)），遇敌由 Rust 端 encounter 触进入战斗，
 *    本引擎绝不自行改成连续坐标。
 *
 * 契约保留：对外接口与旧 2D 版完全一致 —— init / setData / setPlayer / keydown / keyup /
 *          start / stop / nearbyList / moveIntent / clearKeys / setDpr。client.js 无需改动。
 */
"use strict";

const World2D = (() => {
  let cv, container = null;
  let raf = null;
  let data = null;          // api_world 返回
  let explored = null;      // 已探索格集合 "x:y" -> true（轮回记忆迷雾）
  let px = 0, py = 0;       // 玩家插值坐标（格子坐标，可为小数用于平滑插值）
  let targetPx = 0, targetPy = 0;
  let keys = {};
  let hudCb = null, interCb = null, moveCb = null, msgCb = null;

  let scene = null, camera = null, renderer = null;
  let player = null;        // 玩家体素方块人 Group
  let playerRig = null;     // { legL,legR,armL,armR } 供行走摆动
  let enemiesObj = {};      // id -> { group, rig } 敌人体素人
  let npcObj = {};
  let itemObj = {};         // points 调查点 -> 道具网格/billboard
  let buildObjs = [];       // 场景里由 setData 重建时需清理的所有对象（墙/地板/装饰等）
  let propObjs = [];        // 由 setData 重建的实体对象列表

  const TILE = 2.0;         // 每格世界尺寸（米）
  const WALL_H = 2.2;       // 墙柱高度
  const FLOOR_H = 0.12;     // 地板块厚度
  const CAM_DIST = 9.0;     // 相机距离玩家水平距离
  const CAM_PITCH = 0.55;   // 相机俯角（弧度）

  // 敌人 id → 颜色（体素人配色，沿用旧版 ENEMY_ICONS 语义区分每类敌人）
  const ENEMY_COLORS = {
    e_f1_z1:   { shirt: 0x6a5a3a, pants: 0x3a3430, skin: 0x7d8a6a },
    e_h1:      { shirt: 0x8a2a2a, pants: 0x2a1818, skin: 0x6a1f1f },
    e_licker:  { shirt: 0x5d9c5d, pants: 0x2a3a2a, skin: 0x6f9a6f },
    e_f3_z2:   { shirt: 0x6b4b3a, pants: 0x3a2c24, skin: 0x9a7a6a },
    e_f4_elite:{ shirt: 0x4a4a52, pants: 0x2a2a30, skin: 0x5f5f6a },
  };
  const ENEMY_FALLBACK = [0x7a1f1f, 0x5d9c5d, 0x6b4b3a, 0x8a3a6b];
  const PLAYER_COLORS = { shirt: 0x3a5ba0, pants: 0x2a3450, skin: 0xd8a878, hair: 0x2a1f16, shoe: 0x1c1a1a };
  const NPC_COLORS = { shirt: 0x2a6a7a, pants: 0x22323a, skin: 0xd8a878, hair: 0x22323a, shoe: 0x1c1a1a };

  let dpr = 1;              // HiDPI 显示缩放（由 ResolutionSys.setDpr 下发）
  let floorTex = null;      // 蜂巢地板贴图
  let worldSeed = 7;

  const isExplored = (x, y) => !explored || explored.has(x + ":" + y);

  /* ================= 体素方块人（自包含，MC/zone3d 风格 · 高分辨率细分版） =================
   * 用 BoxGeometry 拼装：双腿(髋枢轴)+躯干(腰/腹/胸/肩)+双臂(肩枢轴+肘+腕+拳)+头(头骨/颧/下颚/脸/发)。
   * 每个部件再细分为更密的小方块，呈现 MC 高分辨率质感，与战斗场景视觉一致。
   * 材质升级 MeshStandardMasterial（分部位 roughness/metalness）。
   * 枢轴层级保留：legL/legR（髋，摆腿）、armL/armR（肩，摆臂），新增 knee/ankle/elbow/wrist 枢轴
   * 均保持 identity 不参与现有行走摆动，绝不破坏 world2d 对 legL/legR/armL/armR rotation 的引用。
   */
  function buildVoxelBody(g, c) {
    const L = c.shirt, P = c.pants, K = c.skin, Hh = c.hair, S = c.shoe;
    // 分部位材质参数（与战斗一致）：皮肤 0.6/0、衣物 0.82/0.05、头发 0.9/0、金属/鞋底 0.35/0.6
    const mat = (col, rough, metal, opts) => new THREE.MeshStandardMaterial(Object.assign({ color: col, roughness: rough, metalness: metal }, opts || {}));
    const skinM  = () => mat(K, 0.6, 0);
    const clothM = () => mat(L, 0.82, 0.05);
    const pantsM = () => mat(P, 0.82, 0.05);
    const hairM  = () => mat(Hh, 0.9, 0);
    const shoeM  = () => mat(S, 0.35, 0.6);
    const box = (w, h, d, m, parent, x, y, z) => {
      const msh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
      msh.position.set(x, y, z);
      msh.castShadow = true; msh.receiveShadow = true;
      parent.add(msh);
      return msh;
    };
    // ============ 程序化体素生成（体素网格 + 三重循环，MC 高分辨率质感） ============
    // 单位体素：单块立方形，挂到指定枢轴并随枢轴旋转；统一开阴影。
    const vox = (parent, x, y, z, s, m) => {
      const msh = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), m);
      msh.position.set(x, y, z);
      msh.castShadow = true; msh.receiveShadow = true;
      parent.add(msh);
      return msh;
    };
    // 环形一圈（angle 相位偏移让相邻段错峰，更显体素拼缝）
    const ring = (parent, y, n, r, s, m, phase) => {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + (phase || 0);
        vox(parent, Math.cos(a) * r * s, y, Math.sin(a) * r * s, s, m);
      }
    };
    // 实心圆柱体（每层环形 n 块 + 中心轴 1 块，柱形体素）
    const cyl = (parent, layers, n, r, cell, m, startY, phase) => {
      for (let layer = 0; layer < layers; layer++) {
        const y = startY - cell * (layer + 0.5);
        ring(parent, y, n, r, cell, m, phase + layer * 0.35);
        vox(parent, 0, y, 0, cell, m);
      }
    };
    // 偏心圆环（鞋头前凸等）：绕 (ox,oz) 的 x 平面小圆
    const ringX = (parent, x, y, n, r, s, m, phase) => {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + (phase || 0);
        vox(parent, x + Math.cos(a) * r * s, y, Math.sin(a) * r * s, s, m);
      }
    };

    // ---- 双腿：髋枢轴（摆腿动画，legL/legR 必须保留）+ 膝/踝 细分枢轴 ----
    const legSpan = 0.30, thighH = 0.5, shinH = 0.45, shoeH = 0.14;
    const hipY = thighH + shinH + shoeH * 0.5;
    const legCell = 0.085;
    const legL = new THREE.Group(); legL.position.set(-legSpan, hipY, 0); g.add(legL);
    const legR = new THREE.Group(); legR.position.set(legSpan, hipY, 0); g.add(legR);
    // 膝枢轴：挂在髋下 thighH 处；踝枢轴：再下 shinH 处（identity，保真挂在相应枢轴下）
    const buildLeg = (hip, ph) => {
      const knee = new THREE.Group(); knee.position.set(0, -thighH, 0); hip.add(knee);
      const ankle = new THREE.Group(); ankle.position.set(0, -shinH, 0); knee.add(ankle);
      // 大腿：实心柱，3 层 环形7+中心（衣物/裤）
      cyl(hip, 3, 7, 1.2, legCell, pantsM(), 0.12, ph);
      // 小腿：实心柱，3 层 环形7+中心（裤）
      cyl(knee, 3, 7, 1.0, legCell, pantsM(), 0.12, ph);
      // 鞋：简化 1 层（环形7+中心，金属感鞋底）+ 前凸鞋头
      cyl(ankle, 1, 7, 1.6, legCell, shoeM(), 0.10, ph);
      ringX(ankle, 0.09, -legCell * 0.5, 3, 0.9, legCell, shoeM(), ph + 0.4);
      return { knee, ankle };
    };
    const lk = buildLeg(legL, 0), rk = buildLeg(legR, Math.PI / 9);

    // ---- 躯干（腰 → 胸 → 肩）与双臂（肩枢轴 + 肘/腕/拳 细分） ----
    // 椭圆柱形躯干：自腰向上 12 层，每层 12 块环形（表面体素空心），半径腰窄胸宽
    const waistH = 0.34, chestH = 0.5;
    const upperY = hipY + waistH * 0.5 + 0.06;
    const upper = new THREE.Group(); upper.position.set(0, upperY, 0); g.add(upper);
    const torsoCell = 0.085;
    const torsoLayers = 9;
    for (let i = 0; i < torsoLayers; i++) {
      const t = i / (torsoLayers - 1);                    // 0 腰 → 1 胸
      const y = -0.50 + t * 0.92;                          // 腰 -0.50 → 肩 +0.42
      const r = 3.2 + t * 1.3;                             // 截面半径渐宽（细胞数）
      ring(upper, y, 9, r, torsoCell, clothM(), i * 0.28);
    }
    // 肩（pauldron 护肩块，两侧各一，衣物）
    const armSpan = 0.55, armPos = 0.42;
    box(0.20, 0.12, 0.24, clothM(), upper, -armSpan, 0.38, 0);
    box(0.20, 0.12, 0.24, clothM(), upper,  armSpan, 0.38, 0);

    const upArmH = 0.5, foreH = 0.42;
    const armL = new THREE.Group(); armL.position.set(-armSpan, armPos, 0); upper.add(armL);
    const armR = new THREE.Group(); armR.position.set(armSpan, armPos, 0); upper.add(armR);
    const armCell = 0.085;
    const buildArm = (shld, ph) => {
      const elbow = new THREE.Group(); elbow.position.set(0, -upArmH, 0); shld.add(elbow);
      const wrist = new THREE.Group(); wrist.position.set(0, -upArmH - foreH, 0); elbow.add(wrist);
      const fist = new THREE.Group(); fist.position.set(0, -0.0, 0.0); wrist.add(fist);
      // 上臂：实心柱 2 层 环形4+中心（衣物）
      cyl(shld, 2, 4, 1.2, armCell, clothM(), 0.12, ph);
      // 前臂：实心柱 2 层 环形4+中心（皮肤露出）
      cyl(elbow, 2, 4, 1.0, armCell, skinM(), 0.12, ph);
      // 拳头：实心柱 1 层 环形6+中心（皮肤）
      cyl(fist, 1, 6, 1.2, armCell, skinM(), 0.12, ph + 0.5);
      return { elbow, wrist, fist };
    };
    const elL = buildArm(armL, 0), elR = buildArm(armR, Math.PI / 9);

    // ---- 头：7×7×7 体素网格，球形轮廓筛选（Math.hypot < R），顶/后发 + 正面纯色脸 ----
    const headY = chestH * 0.5 + waistH * 0.5 + 0.5;
    const head = new THREE.Group(); head.position.set(0, headY, 0); upper.add(head);
    const headCell = 0.09, hc = 2, headR = 2.4;   // 网格 -2..2（球形筛选）
    for (let ix = -hc; ix <= hc; ix++) {
      for (let iy = -hc; iy <= hc; iy++) {
        for (let iz = -hc; iz <= hc; iz++) {
          if (Math.hypot(ix, iy, iz) < headR) {
            const m = iy >= 1.5 ? hairM() : skinM();   // 颅顶两层为发，余为皮肤
            vox(head, ix * headCell, iy * headCell, iz * headCell, headCell, m);
          }
        }
      }
    }

    g.userData.rig = {
      legL, legR, armL, armR,           // 行走摆动仍只引用这四个（不动）
      kneeL: lk.knee, kneeR: rk.knee,   // 新增细分枢轴（identity，供未来细化摆腿）
      ankleL: lk.ankle, ankleR: rk.ankle,
      elbowL: elL.elbow, elbowR: elR.elbow,
      wristL: elL.wrist, wristR: elR.wrist,
      fistL: elL.fist, fistR: elR.fist,
      upper, head,
    };
    g.castShadow = true;
    return g;
  }

  function buildPlayerGroup() {
    const g = new THREE.Group();
    buildVoxelBody(g, PLAYER_COLORS);
    g.scale.setScalar(0.85);   // 地图里玩家体素人略小于墙高，比例协调
    g.userData.sprite = null;
    return g;
  }

  function buildEnemyGroup(e) {
    const col = ENEMY_COLORS[e.id] || ENEMY_FALLBACK[(e.id.charCodeAt(e.id.length - 1) || 0) % ENEMY_FALLBACK.length];
    const g = new THREE.Group();
    buildVoxelBody(g, { shirt: col.shirt || col, pants: col.pants || 0x2a2a30, skin: col.skin || 0x6a5a3a, hair: 0x3a3f2c, shoe: 0x1c1a1a });
    g.scale.setScalar(0.85);
    // 红色指示光圈（敌人站位标记）
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.7, 0.85, 32),
      new THREE.MeshBasicMaterial({ color: 0xff5050, transparent: true, opacity: 0.7, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.03;
    g.add(ring);
    return g;
  }

  function buildNpcGroup() {
    const g = new THREE.Group();
    buildVoxelBody(g, NPC_COLORS);
    g.scale.setScalar(0.85);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.7, 0.85, 32),
      new THREE.MeshBasicMaterial({ color: 0x8ab6ff, transparent: true, opacity: 0.7, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.03;
    g.add(ring);
    return g;
  }

  // 地面小精灵/门禁/传送门发光，用 billboard 精灵（始终面向镜头）。退化时回退色块。
  function makeGloRing(color, outer) {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const ctx = c.getContext("2d");
    const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
    g.addColorStop(0, color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
    sp.scale.setScalar(outer || 1.4);
    sp.position.y = 0.2;
    return sp;
  }

  /* ================= 地图建筑（地板 + 墙体） =================
   * 只在 setData 时重建一次；墙格 `#` → BoxGeometry 柱，空格 `.`/`I` → 地板块。
   * 3D 场景不加迷雾遮掩：所有格子（无论已探索/未探索）都正常渲染实心墙和地板，
   * 只靠「墙挡视线」提供拐角盲区。轮回迷雾仅保留在小地图黑幕（未探索处不显示）。
   */
  function buildMap(build, scene) {
    if (!data) return;
    for (let y = 0; y < data.h; y++) {
      const row = data.tiles[y] || "";
      for (let x = 0; x < data.w; x++) {
        const c = row[x] || "#";
        const wX = (x + 0.5) * TILE, wZ = (y + 0.5) * TILE; // world y 向上（buildMap 不需要 wY）
        if (c === "#") {
          // 墙：体素方块柱（实心，无半透明）
          const mat = new THREE.MeshLambertMaterial({ color: 0x5a6573 });
          const m = new THREE.Mesh(new THREE.BoxGeometry(TILE, WALL_H, TILE), mat);
          m.position.set(wX, WALL_H * 0.5, wZ);
          m.castShadow = true; m.receiveShadow = true;
          build.add(m);
        } else {
          // 地板：受贴图地板块
          const m = new THREE.Mesh(
            new THREE.BoxGeometry(TILE, FLOOR_H, TILE),
            new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.95, metalness: 0.05 })
          );
          m.position.set(wX, -0.0, wZ);
          m.receiveShadow = true;
          build.add(m);
        }
      }
    }
  }

  /* ---------- 游戏状态 ---------- */
  function setData(worldData) {
    data = worldData;
    handleResize();   // 世界数据加载/重载时同步渲染尺寸（进入世界 / 窗口尺寸恢复后确保正确）

    explored = new Set((data.explored || []).map(s => String(s)));
    // 世界种子（地板装饰确定性）；沿用旧版派生
    const seedStr = ((data.world && data.world.name) || "") + "|" + (data.floor_name || "") + (data.id || data.map_id || "");
    let sh = 2166136261;
    for (let i = 0; i < seedStr.length; i++) { sh ^= seedStr.charCodeAt(i); sh = Math.imul(sh, 16777619); }
    worldSeed = (sh >>> 0) % 100000;

    // 玩家格子位置
    px = data.px; py = data.py;
    targetPx = data.px; targetPy = data.py;

    // 清理旧场景实体（墙体/地板/装饰 + 实体对象）
    buildObjs.forEach(o => scene.remove(o));
    buildObjs = [];
    propObjs.forEach(o => scene.remove(o));
    propObjs = [];

    // 重建地图（地板 + 墙体 + 迷雾）——只在此处重建一次
    const bk = new THREE.Group();
    buildMap(bk, scene);
    scene.add(bk);
    buildObjs.push(bk);

    // 重建玩家体素人（如已存在则复用位置更新，避免重复建）
    if (!player) { player = buildPlayerGroup(); scene.add(player); }
    player.position.set((data.px + 0.5) * TILE, 1.0, (data.py + 0.5) * TILE);
    playerRig = player.userData.rig;

    // 敌人
    enemiesObj = {};
    (data.enemies || []).forEach(e => {
      const grp = buildEnemyGroup(e);
      grp.position.set((e.x + 0.5) * TILE, 0.92, (e.y + 0.5) * TILE);
      grp.userData.enemy = e;
      scene.add(grp);
      propObjs.push(grp);
      enemiesObj[e.id] = { group: grp, rig: grp.userData.rig };
    });

    // NPC
    npcObj = {};
    (data.npcs || []).forEach(n => {
      const grp = buildNpcGroup();
      grp.position.set((n.x + 0.5) * TILE, 0.92, (n.y + 0.5) * TILE);
      scene.add(grp);
      propObjs.push(grp);
      npcObj[n.id || n.name] = { group: grp, rig: grp.userData.rig };
    });

    // 调查点（发光小精灵，探到即点亮）
    itemObj = {};
    (data.points || []).forEach(p => {
      const sp = makeGloRing(p.done ? "rgba(80,200,120,.6)" : "rgba(255,215,106,.8)", 0.8);
      sp.position.set((p.x + 0.5) * TILE, 0.3, (p.y + 0.5) * TILE);
      // 未探索隐藏
      sp.visible = isExplored(p.x, p.y);
      scene.add(sp);
      propObjs.push(sp);
      itemObj[p.x + ":" + p.y] = sp;
    });

    // 传送门（能量旋转环）
    (data.portals || []).forEach(p => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.6, 0.08, 8, 24),
        new THREE.MeshBasicMaterial({ color: 0x6ac8ff, transparent: true, opacity: 0.9 })
      );
      ring.position.set((p.x + 0.5) * TILE, 0.8, (p.y + 0.5) * TILE);
      ring.visible = isExplored(p.x, p.y);
      scene.add(ring);
      propObjs.push(ring);
    });

    // 门禁（锁定金 / 解锁绿）
    (data.gates || []).forEach(g => {
      const col = g.locked ? 0xffc040 : 0x4ac47a;
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 1.2, 0.2),
        new THREE.MeshLambertMaterial({ color: col })
      );
      m.position.set((g.x + 0.5) * TILE, 0.7, (g.y + 0.5) * TILE);
      m.visible = isExplored(g.x, g.y);
      scene.add(m);
      propObjs.push(m);
    });

    // 副本入口（战斗红 / 解密蓝 漩涡）
    (data.zones || []).forEach(z => {
      const col = z.kind === "fight" ? 0xff4646 : 0x6a6aff;
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.7, 0.1, 8, 24),
        new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.9 })
      );
      ring.position.set((z.x + 0.5) * TILE, 0.9, (z.y + 0.5) * TILE);
      ring.visible = isExplored(z.x, z.y);
      scene.add(ring);
      propObjs.push(ring);
    });

    const topEl = document.querySelector("#worldTop #worldLoc");
    if (topEl) topEl.textContent = ((data.world && data.world.name) ? data.world.name + " · " : "") + (data.floor_name || "蜂巢");
    drawMinimap();   // 全量重建后刷新小地图
    start();
  }

  function setPlayer(x, y) {
    targetPx = x; targetPy = y;
    drawMinimap();   // 玩家移动后刷新小地图（视图随玩家居中）
  }

  function keydown(e) {
    const k = e.key.toLowerCase();
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"].includes(k)) {
      e.preventDefault();
      keys[k] = true;
    }
    if (k === "e" && interCb) {
      const n = nearbyList();
      if (n.length) interCb(n[0].id);
    }
  }
  function keyup(e) { keys[e.key.toLowerCase()] = false; }

  function nearbyList() {
    if (!data) return [];
    return (data.nearby || []).filter(o => Math.abs(o.dx) + Math.abs(o.dy) <= 1);
  }

  function moveIntent() {
    let dx = 0, dy = 0;
    if (keys["arrowup"] || keys["w"]) dy = -1;
    if (keys["arrowdown"] || keys["s"]) dy = 1;
    if (keys["arrowleft"] || keys["a"]) dx = -1;
    if (keys["arrowright"] || keys["d"]) dx = 1;
    return [dx, dy];
  }

  let lastMoveMs = 0;
  let lastRenderMs = 0;   // 帧率上限渲染闸门时间戳
  function start() {
    if (raf) return;
    raf = requestAnimationFrame(loop);
  }
  function stop() {
    if (raf) { cancelAnimationFrame(raf); raf = null; }
  }

  function loop(now) {
    raf = requestAnimationFrame(loop);
    if (now - lastMoveMs > 130) {
      const [dx, dy] = moveIntent();
      if ((dx || dy) && moveCb) { moveCb(dx, dy); lastMoveMs = now; }
    }
    // 玩家平滑插值（格子坐标内做线性插值，仍是格子级移动，仅视觉过渡）
    px += (targetPx - px) * 0.25;
    py += (targetPy - py) * 0.25;
    const moving = (Math.abs(targetPx - px) > 0.01) || (Math.abs(targetPy - py) > 0.01)
      || keys["w"] || keys["a"] || keys["s"] || keys["d"];
    const swing = moving ? Math.sin(now / 140) : 0;
    if (player) {
      player.position.x = (px + 0.5) * TILE;
      player.position.z = (py + 0.5) * TILE;
      player.position.y = 1.0 + (moving ? Math.sin(now / 120) * 0.03 : 0);
      // 行走摆动：四肢前后摆
      if (playerRig) {
        if (playerRig.legL) playerRig.legL.rotation.x = swing * 0.7;
        if (playerRig.legR) playerRig.legR.rotation.x = -swing * 0.7;
        if (playerRig.armL) playerRig.armL.rotation.x = -swing * 0.6;
        if (playerRig.armR) playerRig.armR.rotation.x = swing * 0.6;
      }
    }
    // 敌人徘徊摆动 + 红环旋转
    Object.keys(enemiesObj).forEach(id => {
      const en = enemiesObj[id].group;
      if (!en || !en.userData.enemy || !en.userData.enemy.alive) return;
      const ph = Math.sin(now / 500 + en.userData.enemy.x) * 0.04;
      en.position.x = (en.userData.enemy.x + 0.5) * TILE + ph;
      const ring = en.children.find(c => c.geometry && c.geometry.type === "RingGeometry");
      if (ring) ring.rotation.z = now / 400;
    });
    // 道具小精灵脉动
    Object.keys(itemObj).forEach(k => {
      const sp = itemObj[k];
      if (sp) { const s = 0.8 + (0.5 + 0.5 * Math.sin(now / 400 + k.length)) * 0.3; sp.scale.setScalar(s); }
    });

    // 第三人称相机跟随玩家（固定俯角 + 水平距离，绕玩家点）
    if (camera && player) {
      const pxp = player.position.x, pyp = player.position.y, pzp = player.position.z;
      camera.position.set(
        pxp + Math.sin(CAM_PITCH) * 0,           // x 与玩家对齐
        pyp + CAM_DIST * Math.sin(CAM_PITCH),
        pzp + CAM_DIST * Math.cos(CAM_PITCH)
      );
      camera.lookAt(pxp, pyp * 0.7 + 0.8, pzp);
    }
    // 帧率上限渲染闸门（window.getFpsLimit 全局接口；接口不存在时按 0=不限每帧渲染）
    const fpsCap = (typeof window.getFpsLimit === "function") ? window.getFpsLimit() : 0;
    if (fpsCap <= 0 || (now - lastRenderMs) >= (1000 / fpsCap)) {
      render();
      lastRenderMs = now;
    }
  }

  function render() {
    if (!renderer || !scene || !camera) return;
    // 后处理：PostFX 就绪走后处理渲染，未就绪回退普通渲染
    if (window.PostFX && window.PostFX.ready) {
      try { window.PostFX.render(); return; } catch (e) { /* 后处理失败回退 */ }
    }
    renderer.render(scene, camera);
  }

  /* ---------- 初始化 ---------- */
  function init(canvas, opts = {}) {
    cv = canvas;
    hudCb = opts.onHud || null;
    interCb = opts.onInteract || null;
    moveCb = opts.onMove || null;
    msgCb = opts.onMsg || null;
    container = canvas.parentNode || canvas;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0d13);
    scene.fog = new THREE.Fog(0x0a0d13, 20, 55);   // 迷雾密度微调：纵深更明显

    camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setSize(Math.max(1, container.clientWidth), Math.max(1, container.clientHeight));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    if ("toneMapping" in renderer) { renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1; }

    // 将 renderer 画布放到 worldCanvasWrap；保留原 canvas 为隐藏占位（不显示，avoid 2D 冲突）
    cv.style.display = "none";
    container.appendChild(renderer.domElement);

    // 灯光（与 zone3d 一致的冷主光 + 暖补光 + 半球环境）
    const amb = new THREE.AmbientLight(0x5a6a82, 0.5);
    scene.add(amb);
    const hemi = new THREE.HemisphereLight(0xbfd6ff, 0x241d28, 0.6);
    scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xe8f2ff, 1.15);   // 主光略增，方块人更立体
    dir.position.set(8, 16, 6);
    dir.castShadow = true;
    dir.shadow.mapSize.set(2048, 2048);
    dir.shadow.camera.near = 1; dir.shadow.camera.far = 60;
    dir.shadow.camera.left = -30; dir.shadow.camera.right = 30;
    dir.shadow.camera.top = 30; dir.shadow.camera.bottom = -30;
    dir.shadow.bias = -0.0004; dir.shadow.normalBias = 0.04;
    scene.add(dir);
    const warm = new THREE.PointLight(0xffb066, 0.7, 40);
    warm.position.set(-10, 6, -8); scene.add(warm);
    const cool = new THREE.PointLight(0x66aaff, 0.5, 34);
    cool.position.set(8, 8, 10); scene.add(cool);
    // 轮廓光/背光（Rim）：从玩家背后偏上方，勾出方块人轮廓边缘
    const rim = new THREE.DirectionalLight(0xbfe0ff, 0.55);
    rim.position.set(6, 10, -12);
    scene.add(rim);
    // 脚下微光（弱填充，提升站立立体感）
    const underGlow = new THREE.PointLight(0x3a4a6a, 0.35, 16);
    underGlow.position.set(0, 0.4, 0); scene.add(underGlow);

    // 地板贴图（蜂巢）
    floorTex = new THREE.TextureLoader().load("assets/img/tex_floor_hive.png", t => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(Math.max(1, Math.ceil((data ? data.w : 10) / 3)), 3);
    });

    // 后处理接口（与并行子代理协作）：js/postfx.js 提供 window.PostFX；有则挂接，无则安全跳过
    if (window.PostFX && window.PostFX.attach) {
      try { window.PostFX.attach(renderer, scene, camera); } catch (e) { /* 后处理插件异常不影响主渲染 */ }
    }

    window.addEventListener("resize", handleResize);
    handleResize();
  }

  function handleResize() {
    if (!renderer || !camera || !container) return;
    const w = Math.max(1, container.clientWidth), h = Math.max(1, container.clientHeight);
    renderer.setPixelRatio(dpr || window.devicePixelRatio || 1);
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  /* ================= 小地图 / 大地图（2D canvas，俯视） =================
   * 轮回迷雾已迁移至此：已探索格亮描（墙深 / 可走浅），未探索格纯黑（黑幕）。
   * 独立于 Three.js 场景，轻量；只在 setData（全量重建）与 setPlayer（移动）
   * 后重绘小地图。大地图由 client.js 的 M 键触发 drawBigmap() 重绘。
   */
  const MINIMAP_RANGE = 19;   // 小地图范围（奇数，玩家居中）
  // 数据坐标 -> 小地图切片像素（以玩家格为中心，范围 range）
  function sliceOrigin(cx, cy, range) {
    const half = Math.floor(range / 2);
    return { ox: cx - half, oy: cy - half };
  }

  // 通用：把范围内已探索格画到 ctx 里（黑幕为未探索）。返回网格原点供画标记复用。
  function drawSliceCtx(ctx, cw, ch, cpx, cpy, range) {
    if (!data) return null;
    const { ox, oy } = sliceOrigin(cpx, cpy, range);
    const cell = Math.min(cw, ch) / range;
    const shiftX = (cw - cell * range) / 2, shiftY = (ch - cell * range) / 2;
    // 背景（未到达/未探索区默认纯黑）
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, cw, ch);
    for (let dy = 0; dy < range; dy++) {
      const ty = oy + dy;
      if (ty < 0 || ty >= data.h) continue;
      const row = data.tiles[ty] || "";
      for (let dx = 0; dx < range; dx++) {
        const tx = ox + dx;
        if (tx < 0 || tx >= data.w) continue;
        if (!isExplored(tx, ty)) continue;           // 保持纯黑（黑幕）
        ctx.fillStyle = (row[tx] === "#") ? "#10161c" : "#27323c"; // 墙深 / 可走浅
        ctx.fillRect(shiftX + dx * cell, shiftY + dy * cell, Math.max(1, cell + 0.5), Math.max(1, cell + 0.5));
      }
    }
    return { ox, oy, range, cell, shiftX, shiftY, cw, ch };
  }

  // 在小地图切片上叠加标记（只在已探索格可见处画）
  function drawSliceMarkers(ctx, geo, cpx, cpy) {
    if (!data || !geo) return;
    const cell = geo.cell;
    const locX = (tx) => geo.shiftX + (tx - geo.ox) * cell + cell / 2;
    const locY = (ty) => geo.shiftY + (ty - geo.oy) * cell + cell / 2;
    const inRange = (tx, ty) => tx >= geo.ox && tx < geo.ox + geo.range && ty >= geo.oy && ty < geo.oy + geo.range;
    const visible = (tx, ty) => isExplored(tx, ty) && inRange(tx, ty);
    const dot = (tx, ty, fill, s) => {
      if (!visible(tx, ty)) return;
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.arc(locX(tx), locY(ty), Math.max(2, s), 0, Math.PI * 2);
      ctx.fill();
    };
    (data.enemies || []).forEach(e => dot(e.x, e.y, "#ff4040", cell * 0.30));   // 敌人红点
    (data.portals || []).forEach(p => dot(p.x, p.y, "#3ec9ff", cell * 0.28));   // 传送门蓝点
    (data.zones || []).forEach(z => dot(z.x, z.y, "#6a6aff", cell * 0.30));     // 副本入口
    (data.gates || []).forEach(g => dot(g.x, g.y, g.locked ? "#ffc040" : "#4ac47a", cell * 0.24)); // 门禁
    (data.npcs || []).forEach(n => dot(n.x, n.y, "#3ee06a", cell * 0.28));      // NPC 绿点
    // 玩家：白色三角（玩家所在格必已探索，无需 gate）
    const pxp = locX(cpx), pyp = locY(cpy);
    const pr = Math.max(3, cell * 0.34);
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(pxp, pyp - pr);
    ctx.lineTo(pxp + pr * 0.82, pyp + pr * 0.68);
    ctx.lineTo(pxp - pr * 0.82, pyp + pr * 0.68);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // 小地图：以玩家为中心的 19×19 俯视切片
  function drawMinimap() {
    if (!data) return;
    const cv = document.getElementById("minimap");
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const cpx = Math.max(0, Math.min(data.w - 1, Math.round(px)));
    const cpy = Math.max(0, Math.min(data.h - 1, Math.round(py)));
    const range = Math.min(MINIMAP_RANGE, Math.max(data.w, data.h));
    const geo = drawSliceCtx(ctx, cv.width, cv.height, cpx, cpy, range);
    drawSliceMarkers(ctx, geo, cpx, cpy);
  }

  // 大地图：整个 data.w×data.h 全图（若地图过大可退化为玩家周围 BIGMAP_RANGE 切片）
  function drawMapFullCtx(ctx, cw, ch) {
    if (!data) return;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, cw, ch);
    const cellX = cw / data.w, cellY = ch / data.h;
    for (let ty = 0; ty < data.h; ty++) {
      const row = data.tiles[ty] || "";
      for (let tx = 0; tx < data.w; tx++) {
        if (!isExplored(tx, ty)) continue;           // 黑幕
        ctx.fillStyle = (row[tx] === "#") ? "#10161c" : "#27323c";
        ctx.fillRect(tx * cellX, ty * cellY, Math.max(1, cellX + 0.5), Math.max(1, cellY + 0.5));
      }
    }
  }
  function drawMapFullMarkers(ctx, cw, ch) {
    if (!data) return;
    const cellX = cw / data.w, cellY = ch / data.h;
    const locX = (tx) => (tx + 0.5) * cellX;
    const locY = (ty) => (ty + 0.5) * cellY;
    const visible = (tx, ty) => isExplored(tx, ty) && tx >= 0 && tx < data.w && ty >= 0 && ty < data.h;
    const dot = (tx, ty, fill, s) => {
      if (!visible(tx, ty)) return;
      ctx.fillStyle = fill;
      ctx.beginPath(); ctx.arc(locX(tx), locY(ty), Math.max(2, s), 0, Math.PI * 2); ctx.fill();
    };
    (data.enemies || []).forEach(e => dot(e.x, e.y, "#ff4040", 4));
    (data.portals || []).forEach(p => dot(p.x, p.y, "#3ec9ff", 4));
    (data.zones || []).forEach(z => dot(z.x, z.y, "#6a6aff", 4));
    (data.gates || []).forEach(g => dot(g.x, g.y, g.locked ? "#ffc040" : "#4ac47a", 3));
    (data.npcs || []).forEach(n => dot(n.x, n.y, "#3ee06a", 4));
    const pxc = Math.max(0, Math.min(data.w - 1, Math.round(px)));
    const pyc = Math.max(0, Math.min(data.h - 1, Math.round(py)));
    const pxp = locX(pxc), pyp = locY(pyc);
    const pr = Math.max(4, Math.min(cw, ch) / (Math.max(data.w, data.h)) * 0.5);
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(pxp, pyp - pr);
    ctx.lineTo(pxp + pr * 0.82, pyp + pr * 0.68);
    ctx.lineTo(pxp - pr * 0.82, pyp + pr * 0.68);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  function drawBigmap() {
    if (!data) return;
    const cv = document.getElementById("bigmap");
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    drawMapFullCtx(ctx, cv.width, cv.height);
    drawMapFullMarkers(ctx, cv.width, cv.height);
  }

  return {
    init, setData, setPlayer, keydown, keyup, start, stop, nearbyList, moveIntent,
    drawMinimap, drawBigmap,
    clearKeys: function () { keys = {}; },
    setDpr: function (x) { dpr = Math.max(0.5, x || 1); if (renderer) renderer.setPixelRatio(dpr); },
  };
})();

// 暴露到全局（index.html 先于 client.js 加载）
window.World2D = World2D;
