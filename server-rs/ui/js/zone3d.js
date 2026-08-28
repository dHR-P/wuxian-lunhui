/* 开放世界 · 3D 第三人称副本引擎（Three.js）—— 二游风格强化版
 * 战斗副本: 实时走位躲闪 + 攻击键触发回合判定（引擎执行命中/伤害）
 * 解密副本: 走位躲激光/触发机关（引擎判定）
 * 通过 window.DSH_ZONE.onAction(action, arg) 与 IPC 通信
 *
 * 视觉升级要点（简洁二游风）:
 *  - 玩家改为立绘精灵（pc_zhengzha.png，billboard 始终面向镜头，与敌人同待遇）
 *  - 场景加低模装饰（铁箱/油桶/管通道/血渍贴片）+ 灯带氛围光
 *  - 攻击挥砍改为弧形刀光 + 命中闪白；闪避带残影
 */
"use strict";

const Zone3D = (() => {
  let scene, camera, renderer, raf = null;
  let player = null;         // 玩家组（影子 + 立绘精灵）
  let enemy = null;          // 敌人组
  let keys = {};
  let zoneData = null;       // {id, kind, ref, enemy?}
  let onAction = null;
  let onMsg = null;
  let onWin = null;
  let onExit = null;
  let yaw = 0;
  const PX = { x: 0, z: 0 }; // 玩家实时位置
  const EZ = { x: 4, z: 0 }; // 敌人位置
  let attackCd = 0, dodgeCd = 0;
  let camDist = 4.6;
  const _camTarget = new THREE.Vector3(); // Bug-10: 相机 lerp 目标复用，避免每帧分配
  let onResize = null;   // 由 init 赋值，dispose 移除
  let afterImages = [];  // 闪避残影
  let dust = null;       // 氛围尘粒（粒子系统，dispose 时释放）

  // 体素（MC 方块人）敌人开关：true 时敌人用方块拼成的体素人（BoxGeometry 六面明暗）；
  // false 或素材缺失时回退立绘 billboard / 几何体。纯视觉，不影响战斗判定与 Tauri 契约。
  const VOXEL_ENEMY = true;
  // 体素（MC 方块人）玩家开关：true 时玩家也用方块拼成的史蒂夫风体素人（蓝衣 Steve 配色），
  // 与敌人体素人同比例对峙；false 时回退 pc_zhengzha 立绘 billboard。纯视觉开关，不影响交互契约。
  const VOXEL_PLAYER = true;
  // 敌人精灵素材（fight ref → 立绘与体型；高度按 768x1024 比值 0.75 取宽）
  const ENEMY_SPRITES = {
    zombie: { img: "assets/img/enemy_zombie.png", h: 3.4, y: 1.7 },
    guard:  { img: "assets/img/enemy_guard.png",  h: 3.4, y: 1.7 },
    licker: { img: "assets/img/enemy_licker.png", h: 2.9, y: 1.45 },
    hunter: { img: "assets/img/enemy_hunter.png", h: 4.0, y: 2.0 },
    horde:  { img: "assets/img/enemy_horde.png",  h: 3.6, y: 1.8 },
  };
  const PLAYER_SPRITE = { img: "assets/img/pc_zhengzha.png", h: 3.2, y: 1.6 };
  function enemyKind(ref) {
    if (ref === "licker" || ref === "licker_larva") return "licker";
    if (ref === "hunter_elite") return "hunter";
    if (ref === "b_guard") return "guard";
    if (ref === "horde") return "horde";
    return "zombie"; // zombie1_save / zombie1_far / chef_zombie / mut_guard
  }

  // 敌人/玩家脚下软阴影（贴地椭圆渐隐）
  function makeShadow(r) {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const ctx = c.getContext("2d");
    const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
    g.addColorStop(0, "rgba(0,0,0,0.55)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(r * 2, r * 2),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false })
    );
    m.rotation.x = -Math.PI / 2;
    m.position.y = 0.02;
    return m;
  }

  // 程序化血渍/污渍贴片（贴地，二游氛围）
  function makeStain(r, color) {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const ctx = c.getContext("2d");
    const blobs = 8 + (Math.random() * 6 | 0);
    for (let i = 0; i < blobs; i++) {
      const rr = 8 + Math.random() * (r * 4);
      const a = Math.random() * 6.28, d = Math.random() * 18;
      const x = 64 + Math.cos(a) * d, y = 64 + Math.sin(a) * d;
      const g = ctx.createRadialGradient(x, y, 1, x, y, rr);
      g.addColorStop(0, color);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, rr, 0, 6.28); ctx.fill();
    }
    const tex = new THREE.CanvasTexture(c);
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(r * 2, r * 2),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.75 })
    );
    m.rotation.x = -Math.PI / 2;
    m.position.y = 0.03;
    return m;
  }

  // 灯带（墙脚氛围光条）
  function makeLightStrip(w, h) {
    const c = document.createElement("canvas");
    c.width = 64; c.height = 4;
    const ctx = c.getContext("2d");
    const g = ctx.createLinearGradient(0, 0, 64, 0);
    g.addColorStop(0, "rgba(120,190,255,0)");
    g.addColorStop(0.5, "rgba(120,190,255,.95)");
    g.addColorStop(1, "rgba(120,190,255,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 4);
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false })
    );
    m.position.y = 0.06;
    return m;
  }

  // 氛围尘粒（Z 宇宙各副本战斗统一：漂浮微尘空气中的悬浮微粒，增强真实 3D 空间感）
  function makeDust(n) {
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 1] = 0.4 + Math.random() * 4.6;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 20;
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xcfe8ff, size: 0.07, transparent: true, opacity: 0.55,
      depthWrite: false, sizeAttenuation: true,
    });
    const p = new THREE.Points(geom, mat);
    p.userData = { seed: Math.random() * 200, n };
    scene.add(p);
    return p;
  }

  // 几何体降级敌人（立绘贴图加载失败时兜底）
  function buildPrimitiveEnemy(g, kind) {
    const tint = kind === "hunter" ? 0x4a4a52 : kind === "licker" ? 0x8a2a2a : 0x6a5a3a;
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.55, 1.0, 4, 10),
      new THREE.MeshStandardMaterial({ color: tint })
    );
    body.position.y = 1.2;
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.4, 12, 10),
      new THREE.MeshStandardMaterial({ color: kind === "licker" ? 0x6a1f1f : tint })
    );
    head.position.y = 2.05;
    const claws = new THREE.Mesh(
      new THREE.ConeGeometry(0.1, 0.7, 6),
      new THREE.MeshStandardMaterial({ color: 0xbbb })
    );
    claws.position.set(0.5, 1.4, 0.5);
    claws.rotation.z = 0.6;
    g.add(body, head, claws);
  }

  // 几何体降级玩家（pc 立绘加载失败时兜底）
  function buildPrimitivePlayer() {
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.45, 0.85, 4, 10),
      new THREE.MeshStandardMaterial({ color: 0x2e6f8e })
    );
    body.position.y = 1.05;
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.33, 12, 10),
      new THREE.MeshStandardMaterial({ color: 0xd8b898 })
    );
    head.position.y = 1.9;
    player.add(body, head);
    player.userData.sprite = null;
  }

  // 体素方块人敌人（MC 风格）：用 BoxGeometry 拼出头/身/臂/腿，六面用 MeshLambertMaterial 自然受光，
  // 组内记录随机游走相位。VOXEL_ENEMY=true 时替换立绘 billboard。
  function buildVoxelEnemy(g, kind, tint) {
    const box = (w, h, d, col, x, y, z) => {
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        new THREE.MeshLambertMaterial({ color: col })
      );
      m.position.set(x, y, z);
      m.castShadow = true; m.receiveShadow = true;
      g.add(m);
      return m;
    };
    const repaint = tint || (kind === "hunter" ? 0x4a4a52 : kind === "licker" ? 0x8a2a2a : 0x6a5a3a);
    const dark = 0x3a3430;                      // 裤装深色
    box(0.9, 1.1, 0.5, repaint, 0, 1.15, 0);    // 躯干
    box(0.6, 0.6, 0.6, kind === "licker" ? 0x6a1f1f : repaint, 0, 2.05, 0); // 头（加大至 MC 大头观感：0.5→0.6，y 上移 2.0→2.05）
    box(0.28, 0.95, 0.28, repaint, -0.62, 1.0, 0); // 左臂
    box(0.28, 0.95, 0.28, repaint, 0.62, 1.0, 0);  // 右臂
    box(0.34, 0.9, 0.34, dark, -0.22, 0.45, 0);    // 左腿
    box(0.34, 0.9, 0.34, dark, 0.22, 0.45, 0);     // 右腿
    g.scale.setScalar(1.15);
    g.userData.voxel = { phase: Math.random() * 6.28 };
  }

  // 体素方块人玩家（MC 史蒂夫风）：与 buildVoxelEnemy 同构同比例（脚底 y=0，scale 1.15），
  // 蓝衣 Steve 配色：0x3a5ba0 主色(衣) + 0x2a3450 裤装(深蓝) + 0xd8a878 肤色(头)。VOXEL_PLAYER=true 时替换立绘。
  function buildVoxelPlayer(g) {
    const box = (w, h, d, col, x, y, z) => {
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        new THREE.MeshLambertMaterial({ color: col })
      );
      m.position.set(x, y, z);
      m.castShadow = true; m.receiveShadow = true;
      g.add(m);
      return m;
    };
    const shirt = 0x3a5ba0;  // 蓝衣主色（躯干+臂）
    const pants = 0x2a3450;  // 深蓝裤装
    const skin  = 0xd8a878;  // 肤色（头部）
    box(0.9, 1.1, 0.5, shirt, 0, 1.15, 0);        // 躯干
    box(0.6, 0.6, 0.6, skin, 0, 2.05, 0);          // 头（加大至 MC 大头观感：0.5→0.6，y 上移 2.0→2.05）
    box(0.28, 0.95, 0.28, shirt, -0.62, 1.0, 0);  // 左臂
    box(0.28, 0.95, 0.28, shirt, 0.62, 1.0, 0);   // 右臂
    box(0.34, 0.9, 0.34, pants, -0.22, 0.45, 0);  // 左腿
    box(0.34, 0.9, 0.34, pants, 0.22, 0.45, 0);   // 右腿
    g.scale.setScalar(1.15);   // 与敌人体素人同比例（同 buildVoxelEnemy）
  }

  // 攻击挥砍刀光（弧形渐变）
  function swingFx() {
    if (!player) return;
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const ctx = c.getContext("2d");
    const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
    g.addColorStop(0, "rgba(255,255,255,.95)");
    g.addColorStop(0.55, "rgba(180,220,255,.55)");
    g.addColorStop(1, "rgba(150,200,255,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(64, 64, 60, -1.15, 1.15); ctx.closePath(); ctx.fill();
    const tex = new THREE.CanvasTexture(c);
    const arc = new THREE.Mesh(
      new THREE.PlaneGeometry(2.1, 2.1),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide })
    );
    // 从玩家朝向飞向敌人方向的刀光
    const dir = { x: Math.sin(yaw), z: Math.cos(yaw) };
    arc.position.set(PX.x + dir.x * 1.4, 1.6, PX.z + dir.z * 1.4);
    arc.rotation.y = -yaw;
    scene.add(arc);
    let t = 0;
    const anim = () => {
      t += 0.08;
      arc.scale.setScalar(1 + t * 1.6);
      arc.material.opacity = Math.max(0, 1 - t * 2.2);
      arc.position.x += dir.x * 0.16;
      arc.position.z += dir.z * 0.16;
      if (t < 0.55) requestAnimationFrame(anim);
      else { scene.remove(arc); arc.material.dispose(); tex.dispose(); }
    };
    anim();
  }

  // 受击闪白（玩家攻击命中时敌人白闪）
  function enemyHitFx() {
    if (!enemy) return;
    if (enemy.userData.sprite) {
      const spr = enemy.userData.sprite;
      spr.scale.set(1.22, 0.88, 1);
      const mat = spr.material;
      const prevColor = mat.color ? mat.color.getHex() : 0xffffff;
      if (mat.color) mat.color.setHex(0xffffff);
      if (mat.emissive) mat.emissive.setHex(0xffffff);
      setTimeout(() => {
        if (!spr) return;
        spr.scale.set(1, 1, 1);
        if (mat.color && mat.color.getHex() === 0xffffff) mat.color.setHex(prevColor);
        if (mat.emissive) mat.emissive.setHex(0x000000);
      }, 90);
    } else {
      enemy.scale.set(1.22, 0.88, 1);
      setTimeout(() => { if (enemy) enemy.scale.set(1, 1, 1); }, 90);
    }
  }

  // 闪避残影
  function spawnAfterImage(pos) {
    if (!player || !player.userData.sprite) return;
    const spr = player.userData.sprite;
    const ghost = new THREE.Mesh(
      new THREE.PlaneGeometry(PLAYER_SPRITE.h * 0.75, PLAYER_SPRITE.h),
      new THREE.MeshBasicMaterial({
        map: spr.material.map, transparent: true, depthWrite: false,
        side: THREE.DoubleSide, opacity: 0.28,
      })
    );
    ghost.position.set(pos.x, spr.position.y, pos.z);
    ghost.quaternion.copy(camera.quaternion);
    scene.add(ghost);
    afterImages.push({ m: ghost, t: 0 });
  }

  function init(container, opts = {}) {
    onAction = opts.onAction || null;
    onMsg = opts.onMsg || null;
    onWin = opts.onWin || null;
    onExit = opts.onExit || null;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x10141c);
    scene.fog = new THREE.Fog(0x10141c, 20, 46);

    camera = new THREE.PerspectiveCamera(60, container.clientWidth / Math.max(1, container.clientHeight), 0.1, 100);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    // HiDPI/8G 显存预算内激进画质:全分辨率像素比 + ACES 电影色调映射（高清屏锐利且色彩收拢）
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setSize(Math.max(1, container.clientWidth), Math.max(1, container.clientHeight));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    if ("toneMapping" in renderer) { renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.12; }
    container.appendChild(renderer.domElement);
    onResize = () => {
      const w = Math.max(1, container.clientWidth), h = Math.max(1, container.clientHeight);
      // 跨屏拖动/改档时同步像素比，DPR 变化后保持清晰
      renderer.setPixelRatio(window.devicePixelRatio || 1);
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);
    setTimeout(onResize, 50);

    // 灯光（二游冷主光 + 暖补光）
    const amb = new THREE.AmbientLight(0x6a7a92, 0.55);
    scene.add(amb);
    const dir = new THREE.DirectionalLight(0xe8f2ff, 1.25);
    dir.position.set(6, 14, 5);
    dir.castShadow = true;
    // 8G 显存充足:升高阴影贴图到 2048 + 收紧阴影相机近/边界，PCFSoft 更锐利少锯齿
    dir.shadow.mapSize.set(2048, 2048);
    dir.shadow.camera.near = 1;
    dir.shadow.camera.far = 40;
    dir.shadow.camera.left = -16;
    dir.shadow.camera.right = 16;
    dir.shadow.camera.top = 16;
    dir.shadow.camera.bottom = -16;
    dir.shadow.bias = -0.0005;      // 避免平面接缝阴影痤疮
    scene.add(dir);
    const warm = new THREE.PointLight(0xffb066, 0.8, 22);
    warm.position.set(-6, 4, -4);
    warm.castShadow = true;         // 暖补光也投柔阴影(体素人更立体)
    warm.shadow.mapSize.set(512, 512);
    warm.shadow.bias = -0.002;
    scene.add(warm);
    const cool = new THREE.PointLight(0x66aaff, 0.6, 20);
    cool.position.set(5, 5, 6);
    scene.add(cool);

    // 地板（AI 生成贴图）
    const floorTex = new THREE.TextureLoader().load("assets/img/tex_floor_hive.png", t => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(6, 6);
    });
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(24, 24),
      new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.95, metalness: 0.05 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // 地板血渍贴片
    const stain = makeStain(2.6, "rgba(120,16,16,.75)");
    stain.position.set(-5.5, 0, -2.5);
    scene.add(stain);
    const stain2 = makeStain(1.8, "rgba(80,14,14,.6)");
    stain2.position.set(3.2, 0, 1.8);
    scene.add(stain2);

    // 围墙（AI 生成贴图）
    buildWalls();

    // 场景装饰（低模铁箱/油桶/管线）
    buildProps();

    // 氛围尘粒（轻量粒子，增强空间纵深与 Z 宇宙一致性）
    dust = makeDust(40);

    // 玩家：影子 + （体素方块人或立绘精灵 billboard）。组结构 player 保持不变，仅换内部子对象。
    const group = new THREE.Group();
    group.add(makeShadow(1.4));
    group.userData.dying = false;
    if (VOXEL_PLAYER) {
      // MC 体素方块人（蓝衣 Steve 风；脚底对齐地屏 y=0，scale 1.15 与敌人体素人同比例）
      buildVoxelPlayer(group);
      group.userData.sprite = null;
      group.userData.spec = null;
    } else {
      // 立绘 billboard（pc_zhengzha.png；贴图加载失败回退几何体）——VOXEL_PLAYER=false 时的 fallback
      const tex = new THREE.TextureLoader().load(PLAYER_SPRITE.img, t => {
        if ("colorSpace" in t) t.colorSpace = THREE.SRGBColorSpace;
      }, undefined, () => buildPrimitivePlayer());
      const spr = new THREE.Mesh(
        new THREE.PlaneGeometry(PLAYER_SPRITE.h * 0.75, PLAYER_SPRITE.h),
        new THREE.MeshBasicMaterial({
          map: tex, transparent: true, alphaTest: 0.3,
          depthWrite: false, side: THREE.DoubleSide,
        })
      );
      spr.position.y = PLAYER_SPRITE.y;
      group.add(spr);
      group.userData.sprite = spr;
      group.userData.spec = PLAYER_SPRITE;
    }
    scene.add(group);
    player = group;

    window.addEventListener("keydown", keydown);
    window.addEventListener("keyup", keyup);
  }

  function buildWalls() {
    const wallTex = new THREE.TextureLoader().load("assets/img/tex_wall_industrial.png", t => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(4, 2);
    });
    const mat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.85, metalness: 0.08 });
    const positions = [
      // 四周
      [-12, 0, 0.6, 4, 0], [12, 0, 0.6, 4, 0],
      [0, -12, 4, 0.6, 0], [0, 12, 4, 0.6, 0],
      // 中央柱子
      [-6, 6, 0.8, 4, 0.8], [6, -6, 0.8, 4, 0.8],
      [6, 6, 0.8, 4, 0.8], [-6, -6, 0.8, 4, 0.8],
      // 障碍
      [0, 0, 0.9, 1.6, 0.9],
    ];
    positions.forEach(([x, z, w, h, d]) => {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      wall.position.set(x, h / 2, z);
      wall.castShadow = true;
      wall.receiveShadow = true;
      scene.add(wall);
    });
    // 墙脚冷色灯带（氛围）
    const strip = makeLightStrip(24, 0.35);
    strip.rotation.x = -Math.PI / 2;
    strip.position.set(0, 0.1, -11.7);
    scene.add(strip);
  }

  function buildProps() {
    // 铁箱
    const crateMat = new THREE.MeshStandardMaterial({ color: 0x8a7a5a, roughness: 0.9 });
    const crate = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.9, 1.1), crateMat);
    crate.position.set(-8.5, 0.45, 3.2);
    crate.castShadow = true; crate.receiveShadow = true;
    scene.add(crate);
    const crate2 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.7, 0.8), crateMat);
    crate2.position.set(-8.9, 0.35, 3.9);
    crate2.castShadow = true; crate2.receiveShadow = true;
    scene.add(crate2);
    // 油桶
    const drumMat = new THREE.MeshStandardMaterial({ color: 0x7a2f2f, roughness: 0.75, metalness: 0.3 });
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 1.0, 14), drumMat);
    drum.position.set(8.2, 0.5, -4.5);
    drum.castShadow = true; drum.receiveShadow = true;
    scene.add(drum);
    // 管通道（横跨天花）
    const pipeMat = new THREE.MeshStandardMaterial({ color: 0x9aa7b5, roughness: 0.6, metalness: 0.5 });
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 22, 10), pipeMat);
    pipe.rotation.z = Math.PI / 2;
    pipe.position.set(0, 3.1, 2.5);
    pipe.castShadow = true;
    scene.add(pipe);
    const pipe2 = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 18, 10), pipeMat);
    pipe2.rotation.z = Math.PI / 2;
    pipe2.position.set(0, 2.7, 3.6);
    pipe2.castShadow = true;
    scene.add(pipe2);
    // 墙角杂物：灭火器
    const extMat = new THREE.MeshStandardMaterial({ color: 0xb03030, roughness: 0.5, metalness: 0.2 });
    const ext = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.7, 8), extMat);
    ext.position.set(6.5, 0.35, -4.8);
    ext.castShadow = true;
    scene.add(ext);
    // 血迹墙贴（近墙）
    const wallStain = makeStain(1.4, "rgba(140,20,20,.65)");
    wallStain.position.set(3.8, 0, 11.6);
    scene.add(wallStain);
  }

  function setData(data) {
    zoneData = data;
    // 敌人模型
    if (enemy) scene.remove(enemy);
    if (data.kind === "fight" && data.enemy) {
      const kind = enemyKind(data.ref);
      const spec = ENEMY_SPRITES[kind] || ENEMY_SPRITES.zombie;
      const g = new THREE.Group();
      g.add(makeShadow(1.5));
      if (VOXEL_ENEMY) {
        // MC 体素方块人（纯视觉；dude 默认配色由 buildVoxelEnemy 内定）
        buildVoxelEnemy(g, kind, null);
        g.position.set(EZ.x, 0, EZ.z);
        scene.add(g);
        enemy = g;
        enemy.userData = { kind, spec, sprite: null, dying: false, dyingT: 0 };
      } else {
        // 立绘 billboard（ENEMY_SPRITES 素材；贴图失败回退几何体）——始终保留的 fallback
        const tex = new THREE.TextureLoader().load(spec.img, t => {
          if ("colorSpace" in t) t.colorSpace = THREE.SRGBColorSpace;
        }, undefined, () => buildPrimitiveEnemy(g, kind));
        const spr = new THREE.Mesh(
          new THREE.PlaneGeometry(spec.h * 0.75, spec.h),
          new THREE.MeshBasicMaterial({
            map: tex, transparent: true, alphaTest: 0.3,
            depthWrite: false, side: THREE.DoubleSide,
          })
        );
        spr.position.y = spec.y;
        g.add(spr);
        g.position.set(EZ.x, 0, EZ.z);
        scene.add(g);
        enemy = g;
        enemy.userData = { kind, spec, sprite: spr, dying: false, dyingT: 0 };
        enemy.scale.setScalar(1.15);
      }
    }
    resetPlayer();
  }

  function resetPlayer() {
    PX.x = -4; PX.z = 0;
    if (player) { player.position.set(PX.x, 0, PX.z); }
    yaw = 0;
    attackCd = 0; dodgeCd = 0;
    afterImages.forEach(ai => { scene.remove(ai.m); ai.m.material.dispose(); });
    afterImages = [];
  }

  function keydown(e) {
    if (!window.ZoneActive) return;
    const k = e.key.toLowerCase();
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d", " "].includes(k)) {
      e.preventDefault();
      keys[k] = true;
    }
    if (k === "j" || k === "enter") {
      if (attackCd <= 0 && onAction) { attackCd = 0.7; onAction("attack", 0); swingFx(); enemyHitFx(); }
    }
    if (k === "k" || k === "shift") {
      if (dodgeCd <= 0 && onAction) {
        dodgeCd = 1.0; onAction("dodge", 0);
        const from = { x: PX.x, z: PX.z };
        dodgeFx();
        spawnAfterImage(from);
        spawnAfterImage({ x: (PX.x + from.x) / 2, z: (PX.z + from.z) / 2 });
      }
    }
    if (k === "escape" && onExit) onExit();
  }
  function keyup(e) { keys[e.key.toLowerCase()] = false; }

  // 闪避位移特效
  function dodgeFx() {
    if (!player) return;
    const dir = Math.sin(yaw), dirz = Math.cos(yaw);
    PX.x = clamp(PX.x + dir * 0.9, -11.4, 11.4);
    PX.z = clamp(PX.z + dirz * 0.9, -11.4, 11.4);
    player.position.set(PX.x, 0, PX.z);
  }

  function start() { if (!raf) raf = requestAnimationFrame(loop); }
  function stop() {
    if (raf) { cancelAnimationFrame(raf); raf = null; }
  }
  function dispose() {
    stop();
    window.removeEventListener("keydown", keydown);
    window.removeEventListener("keyup", keyup);
    window.removeEventListener("resize", onResize);
    afterImages.forEach(ai => { try { scene.remove(ai.m); ai.m.material.dispose(); } catch (e) {} });
    afterImages = [];
    if (dust) { try { scene.remove(dust); dust.geometry.dispose(); dust.material.dispose(); } catch (e) {} dust = null; }
    // Bug-07:释放场景内全部 geometry/material/纹理,避免 GPU 内存与 WebGL 上下文随副本进出泄漏
    try {
      scene.traverse(obj => {
        if (!obj) return;
        if (obj.geometry) obj.geometry.dispose();
        const mats = Array.isArray(obj.material) ? obj.material : (obj.material ? [obj.material] : []);
        mats.forEach(m => {
          if (!m) return;
          if (m.map) { try { m.map.dispose(); } catch (e) {} }
          try { m.dispose(); } catch (e) {}
        });
      });
    } catch (e) {}
    if (renderer) {
      try { renderer.dispose(); } catch (e) {}
      try { renderer.forceContextLoss(); } catch (e) {}
      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    }
  }

  function loop() {
    raf = requestAnimationFrame(loop);
    // 实时移动
    let dx = 0, dz = 0;
    if (keys["w"] || keys["arrowup"]) dz -= 1;
    if (keys["s"] || keys["arrowdown"]) dz += 1;
    if (keys["a"] || keys["arrowleft"]) dx -= 1;
    if (keys["d"] || keys["arrowright"]) dx += 1;
    if (dx || dz) {
      const len = Math.hypot(dx, dz);
      dx /= len; dz /= len;
      PX.x = clamp(PX.x + dx * 0.09, -11.4, 11.4);
      PX.z = clamp(PX.z + dz * 0.09, -11.4, 11.4);
      yaw = Math.atan2(dx, dz);
      if (player) {
        player.position.set(PX.x, 0, PX.z);
        player.rotation.y = yaw;
      }
      if (onAction) onAction("move", yaw);
    }
    // 冷却
    attackCd = Math.max(0, attackCd - 0.016);
    dodgeCd = Math.max(0, dodgeCd - 0.016);
    // 残影淡出
    afterImages = afterImages.filter(ai => {
      ai.t += 0.016;
      ai.m.material.opacity = Math.max(0, 0.28 - ai.t * 0.7);
      if (ai.t > 0.45) { scene.remove(ai.m); ai.m.material.dispose(); return false; }
      return true;
    });
    // 玩家立绘 billboard + 待机呼吸
    if (player && player.userData.sprite) {
      const sprP = player.userData.sprite;
      sprP.quaternion.copy(camera.quaternion);
      sprP.position.y = PLAYER_SPRITE.y + Math.sin(performance.now() / 520) * 0.05;
    }
    // 敌人 AI：追踪玩家（战斗副本）
    if (enemy && zoneData && zoneData.kind === "fight") {
      const dxE = PX.x - EZ.x, dzE = PX.z - EZ.z;
      const distE = Math.hypot(dxE, dzE);
      if (distE > 2.2) {
        const sp = 0.045 + Math.sin(performance.now() / 700) * 0.008;
        EZ.x += (dxE / distE) * sp;
        EZ.z += (dzE / distE) * sp;
      }
      EZ.x = clamp(EZ.x, -11, 11); EZ.z = clamp(EZ.z, -11, 11);
      enemy.position.set(EZ.x, 0, EZ.z);
      const spr = enemy.userData.sprite;
      if (spr) {
        const spec = enemy.userData.spec;
        spr.quaternion.copy(camera.quaternion);
        spr.position.y = spec.y + Math.sin(performance.now() / 450) * 0.07;
        spr.rotation.z = Math.sin(performance.now() / 760) * 0.03;
        if (enemy.userData.dying) {
          enemy.userData.dyingT += 0.016;
          const k = Math.min(1, enemy.userData.dyingT / 0.7);
          spr.rotation.x = -1.35 * k;
          spr.position.y = spec.y - 0.6 * k;
          spr.material.opacity = Math.max(0, 1 - k);
          if (k >= 1 && scene) { scene.remove(enemy); enemy = null; }
        }
      } else {
        // 体素方块人：朝向玩家 + 待机轻微起伏；死亡后下沉并移除
        enemy.rotation.y = Math.atan2(PX.x - EZ.x, PX.z - EZ.z);
        if (enemy.userData.dying) {
          enemy.userData.dyingT += 0.016;
          const k = Math.min(1, enemy.userData.dyingT / 0.7);
          enemy.position.y = -0.6 * k;
          if (k >= 1 && scene) { scene.remove(enemy); enemy = null; }
        } else if (enemy.userData.voxel) {
          enemy.position.y = Math.sin(performance.now() / 450 + enemy.userData.voxel.phase) * 0.04;
        }
      }
      const dist = Math.hypot(PX.x - EZ.x, PX.z - EZ.z);
      if (dist < 2.4 && onMsg) onMsg("敌人逼近！按 J 攻击 / K 闪避拉开距离");
      else if (onMsg && dist > 4) onMsg("保持距离，寻找攻击时机");
    }
    // 相机跟随（第三人称）。camDist=4.6 近距离对峙视角，稍降相机高度(4.5→3.2)以平视展示两 MC 方块人细节；
    // 相机高于玩家头顶(体素人最高≈2.6)，水平偏移 2.76，不穿模。_camTarget 复用与 lerp 机制不变。
    const camX = PX.x - Math.sin(yaw) * camDist * 0.6;
    const camZ = PX.z - Math.cos(yaw) * camDist * 0.6;
    _camTarget.set(camX, 3.2, camZ);
    camera.position.lerp(_camTarget, 0.12);
    camera.lookAt(PX.x, 1.4, PX.z);
    // 氛围尘粒：缓慢上浮 + 水平缓涡（轻量，Z 宇宙战斗一致氛围）
    if (dust) {
      const t = performance.now() / 1000;
      const arr = dust.geometry.attributes.position;
      for (let i = 0; i < arr.count; i++) {
        arr.array[i * 3 + 1] = 0.4 + ((arr.array[i * 3 + 1] - 0.4 + 0.02) % 4.6); // 上浮回环
        arr.array[i * 3] += Math.sin(t + i * 0.7) * 0.0009;                       // 水平缓涡
        arr.array[i * 3 + 2] += Math.cos(t + i * 0.5) * 0.0009;
      }
      arr.needsUpdate = true;
    }
    renderer.render(scene, camera);
  }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function onZoneUpdate(data) {
    if (data && data.kind === "fight") {
      if (data.win) {
        if (enemy) { enemy.userData.dying = true; enemy.userData.dyingT = 0; }
        if (onWin) onWin();
      }
    }
  }

  return { init, setData, start, stop, dispose, onZoneUpdate, keydown, keyup,
    // 分辨率档位支持（由 ResolutionSys 下发；level∈{720,1080,1440}）。renderer 已建则立即重设像素比+尺寸。
    setResolution(level) {
      if (renderer) {
        renderer.setPixelRatio(window.devicePixelRatio || 1);
        const w = Math.max(1, (renderer.domElement && renderer.domElement.parentElement) ? renderer.domElement.parentElement.clientWidth : 1280);
        const h = Math.max(1, (renderer.domElement && renderer.domElement.parentElement) ? renderer.domElement.parentElement.clientHeight : 720);
        renderer.setSize(w, h);
        if (camera) { camera.aspect = w / h; camera.updateProjectionMatrix(); }
      }
    },
  };
})();

// 暴露到全局（index.html 先于 client.js 加载）
window.Zone3D = Zone3D;