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
  let curWeaponStyle = "unarmed"; // 当前武器类型风格（gun/laser/magic/melee/unarmed），由 setData.weapon 下发
  let victoryT = 0;               // 胜利动作计时（玩家双臂上举），onZoneUpdate(win) 置 1，每帧按 0.04 衰减
  let camDist = 4.6;
  const _camTarget = new THREE.Vector3(); // Bug-10: 相机 lerp 目标复用，避免每帧分配
  let onResize = null;   // 由 init 赋值，dispose 移除
  let afterImages = [];  // 闪避残影
  let blood = [];        // 命中血粒子（方块飞溅，dispose 释放）
  let dust = null;       // 氛围尘粒（粒子系统，dispose 时释放）
  let glowTex = null;    // 手写 bloom：additive 径向光晕贴图（Canvas 生成，复用）

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

  // 武器类型 → 攻击特效风格。输入可为武器 id（wp_*/wpn_*/tr_* 装备格 id）或中文名（hud.weapon）。
  // 分五类：melee(刀剑斧镰鞭) / gun(枪械弹道) / laser(激光光束) / magic(魔法·修真法术) / unarmed(拳脚无武器)。
  // 找不到匹配时回退 unarmed（拳脚），刀战默认保留 swingFx 弧形刀光。
  // 已知武器 id → 特效风格查表（覆盖 items_data::WEAPONS + TRESURE_DEFS 主手/法宝）。按 id 精确归属，
  // 无法覆盖的再回落按名字关键字正则判别。表内归类依据该武器是枪/激光/法术还是近战刀剑。
  const WEAPON_STYLE_IDS = {
    // gun（枪械弹道）：手枪/高斯/银弹/电磁脉冲/引力坍缩炮/轨道狙击
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
  function weaponStyle(weaponId) {
    const key = String(weaponId || "").toLowerCase();
    if (WEAPON_STYLE_IDS.hasOwnProperty(key)) return WEAPON_STYLE_IDS[key];
    if (!key || key === "—" || key === "无" || key === "none") return "unarmed";
    // —— 激光：laser/photon/beam/光刃/光剑（放枪械前，避免「激光枪」的『枪』误归 gun）
    if (/(laser|photon|beam|光剑|光刃|光束)/.test(key) || key.includes("激光")) return "laser";
    // —— 枪械：手枪/高斯/狙击/轨道/银弹/电磁脉冲/引力坍缩炮 · id 'wp_gun9'/'wp_gauss'/'wp_silver_gun'/'wp_emi'/'wpn_rail_sniper'/'wp_gravity_collapse'
    if (/(gun|pistol|gauss|sniper|rail|gravit|emi|silver|手枪|高斯|狙击|轨道|电磁脉冲|引力|银弹|弹药|枪|shoot)/.test(key)) return "gun";
    // —— 魔法/修真：法杖/符箓/法宝/法阵/剑阵/剑意/幡/镜/炉/扇/术
    if (/(magic|spell|staff|wand|soul|sect|法杖|符|法宝|法阵|剑阵|剑意|幡|镜|炉|灵|修真|修仙|术|杖|扇)/.test(key)) return "magic";
    // —— 近战刀剑：剑/刀/斧/镰/鞭/刃/拳刃
    if (/(sword|blade|saber|axe|scythe|whip|knife|dagger|katana|剑|刀|斧|镰|鞭|刃)/.test(key)) return "melee";
    return "unarmed";
  }
  // 由 setData 下发的 weapon 字段解析当前风格（入参可能是 style 本身或原始名/id）
  function resolveWeaponStyle(raw) {
    if (raw === "gun" || raw === "laser" || raw === "magic" || raw === "melee" || raw === "unarmed") return raw;
    return weaponStyle(raw);
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

  // ---------- 体素方块人（MC 精品化建模）----------
  // 段数 12：头 + 发顶/帽顶 + 胸 + 腰 + (上臂+前臂)×2 + (大腿+小腿/脚)×2。
  // 敌我共用 buildVoxelBody 保证同构（仅 cfg 配色/体型不同，脚底 y=0 贴地）。
  // 肢体均挂在肩/髋枢轴分组(Group)下，rig 记录各枢轴，供 loop() 做呼吸/行走摆动/攻击前摇。
  function buildVoxelBody(g, cfg) {
    const c = cfg.colors;
    const box = (w, h, d, col, gx, x, y, z) => {
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        new THREE.MeshLambertMaterial({ color: col })
      );
      m.position.set(x, y, z);
      m.castShadow = true; m.receiveShadow = true;
      gx.add(m);
      return m;
    };
    const pivot = (x, y, z) => { const p = new THREE.Group(); p.position.set(x, y, z); g.add(p); return p; };

    // 双腿枢轴（髋）——大腿+小腿(脚)
    const legL = pivot(-0.22, 0.62, 0);
    const legR = pivot(0.22, 0.62, 0);
    box(0.34, 0.34, 0.36, c.pants, legL, 0, -0.17, 0);      // 左大腿
    box(0.30, 0.52, 0.32, c.shoe, legL, 0, -0.56, 0.02);     // 左小腿/脚
    box(0.34, 0.34, 0.36, c.pants, legR, 0, -0.17, 0);      // 右大腿
    box(0.30, 0.52, 0.32, c.shoe, legR, 0, -0.56, 0.02);     // 右小腿/脚

    // 上部体（腰+胸+两肩臂+头），枢轴在腰(0.98)——cfg.lean 使其整体前倾（驼背/俯身）
    const upper = pivot(0, 0.98, 0);
    box(c.waistW, 0.42, c.torsoD, c.shirt, upper, 0, -0.05, 0);   // 腰
    box(c.chestW, 0.62, c.torsoD, c.shirt, upper, 0, 0.5, 0);     // 胸
    // 双肩（臂）枢轴
    const armL = new THREE.Group(); armL.position.set(-0.56, 0.56, 0); upper.add(armL);
    const armR = new THREE.Group(); armR.position.set(0.56, 0.56, 0); upper.add(armR);
    box(0.26, 0.40, 0.26, c.shirt, armL, 0, -0.30, 0);            // 左上臂
    box(0.24, 0.44, 0.24, c.hand,  armL, 0, -0.72, c.foreZ);      // 左前臂(手)
    box(0.26, 0.40, 0.26, c.shirt, armR, 0, -0.30, 0);            // 右上臂
    box(0.24, 0.44, 0.24, c.hand,  armR, 0, -0.72, c.foreZ);      // 右前臂(手)
    // 头 + 发顶/帽顶（矮扁方块，MC「顶上一块」观感）
    box(c.headW, 0.62, c.headW, c.skin, upper, 0, 1.12, 0);
    box(c.headW * 0.92, 0.12, c.headW * 0.92, c.hair, upper, 0, 1.49, 0);
    upper.rotation.x = cfg.lean || 0;
    g.userData.rig = { legL, legR, armL, armR, upper };
  }

  // 体素方块人敌人（MC 风格）：按 kind 区分体型——hunter 更高大(upright)、licker 俯身贴地、
  // zombie 驼背前倾、guard/horde 标准。VOXEL_ENEMY=true 时替换立绘 billboard。
  function buildVoxelEnemy(g, kind, tint) {
    const repaint = tint || (kind === "hunter" ? 0x4a4a52 : kind === "licker" ? 0x8a2a2a : 0x6a5a3a);
    const V = {
      hunter: { sc: 1.32, lean: -0.10, shirt: 0x4a4a52, skin: 0x5f5f6a, hair: 0x8f96a3, pants: 0x2a2a30, foreZ: 0.0, bob: 0.05 },
      licker: { sc: 0.86, lean: 0.58, shirt: 0x8a2a2a, skin: 0x6a1f1f, hair: 0x3f1010, pants: 0x2a1818, foreZ: 0.34, bob: 0.02 },
      zombie: { sc: 1.02, lean: 0.34, shirt: 0x6a5a3a, skin: 0x7d8a6a, hair: 0x3a3f2c, pants: 0x3a3430, foreZ: 0.16, bob: 0.04 },
    }[kind] || { sc: 1.15, lean: 0.16, shirt: repaint, skin: repaint, hair: 0x8a7a5a, pants: 0x3a3430, foreZ: 0.06, bob: 0.05 }; // guard/horde 标准
    buildVoxelBody(g, {
      lean: V.lean,
      colors: {
        shirt: V.shirt, pants: V.pants, skin: V.skin, hair: V.hair,
        shoe: 0x1c1a1a, hand: V.skin, foreZ: V.foreZ,
        waistW: 0.84, chestW: 0.92, headW: 0.6, torsoD: 0.5,
      },
    });
    g.scale.setScalar(V.sc);
    g.userData.voxel = { phase: Math.random() * 6.28, kind, bob: V.bob, armBoost: kind === "hunter" ? 1.2 : kind === "licker" ? 0.7 : 1 };
  }

  // 体素方块人玩家（MC 史蒂夫风）：与 buildVoxelEnemy 同构（buildVoxelBody），蓝衣 Steve 配色。
  // VOXEL_PLAYER=true 时替换立绘。直立 lean=0，肩髋枢轴同敌，供同套动画。
  function buildVoxelPlayer(g) {
    buildVoxelBody(g, {
      lean: 0.0,
      colors: {
        shirt: 0x3a5ba0, pants: 0x2a3450, skin: 0xd8a878, hair: 0x2a1f16,
        shoe: 0x1c1a1a, hand: 0xd8a878, foreZ: 0.0,
        waistW: 0.84, chestW: 0.92, headW: 0.6, torsoD: 0.5,
      },
    });
    g.scale.setScalar(1.15);   // 与敌人体素人同比例
    g.userData.voxel = { phase: Math.random() * 6.28, bob: 0.05, armBoost: 1 };
  }

  // 命中血粒子（方块飞溅，MC 风格）：数量~20，重力下落 + 落地轻弹 + 自旋 + 淡出，结束即 dispose 释放
  function spawnBlood(pos) {
    for (let i = 0; i < 20; i++) {
      const s = 0.09 + Math.random() * 0.13;
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(s, s, s),
        new THREE.MeshBasicMaterial({ color: Math.random() < 0.6 ? 0x8a1414 : 0x5e0d0d, transparent: true })
      );
      m.position.set(pos.x, pos.y + Math.random() * 0.3, pos.z);
      scene.add(m);
      blood.push({
        m,
        vx: (Math.random() - 0.5) * 0.3,
        vy: 0.35 + Math.random() * 0.45,
        vz: (Math.random() - 0.5) * 0.3,
        spin: (Math.random() - 0.5) * 0.5,
        life: 0, max: 0.5 + Math.random() * 0.45,
      });
    }
  }
  function updateBlood(dt) {
    const scl = dt * 60;
    blood = blood.filter(b => {
      b.life += dt;
      const k = b.life / b.max;
      b.vy -= dt * 1.15;
      b.m.position.x += b.vx * scl;
      b.m.position.y += b.vy * scl;
      b.m.position.z += b.vz * scl;
      if (b.m.position.y < 0.03) { b.m.position.y = 0.03; b.vy *= -0.35; b.vx *= 0.7; b.vz *= 0.7; } // 落地轻弹即停
      b.m.rotation.x += b.spin * scl; b.m.rotation.z += b.spin * scl;
      b.m.scale.setScalar(Math.max(0.08, 1 - k * 0.7));
      b.m.material.opacity = Math.max(0, 1 - k * 1.5);
      if (k >= 1) { scene.remove(b.m); b.m.geometry.dispose(); b.m.material.dispose(); return false; }
      return true;
    });
  }

  // ---------- 手写 bloom（不引外部库）：additive 光晕精灵，给自发光体（刀光/能量）营造泛光 ----------
  function getGlowTex() {
    if (glowTex) return glowTex;
    const c = document.createElement("canvas"); c.width = c.height = 64;
    const cx = c.getContext("2d");
    const g = cx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.35, "rgba(255,255,255,.55)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    cx.fillStyle = g; cx.fillRect(0, 0, 64, 64);
    glowTex = new THREE.CanvasTexture(c);
    return glowTex;
  }
  function glowSprite(color, size) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: getGlowTex(), color, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    s.scale.set(size, size, 1);
    return s;
  }

  // 体素人程序化动画（敌我同套；onAction 语义不变，纯视觉）：
  //   呼吸——upper 上下轻浮（分组起伏）；行走——四肢对侧摆动（相位随移动加速）；
  //   攻击前摇——右手臂快速前挥（attack 强度驱动）。rig 由 buildVoxelBody 提供。
  function animateRig(rig, t, walk, attack) {
    const sp = t * 0.018 * walk;
    // 呼吸：上半体起伏 + 极细微前倾摆动
    rig.upper.position.y = Math.sin(t * 0.0017) * 0.035;
    rig.upper.rotation.z = Math.sin(sp) * 0.03;
    // 行走摆动：对侧手脚同步，幅度随移动速度爬升
    const ls = walk > 0.8 ? Math.sin(sp) * 0.42 : Math.sin(sp) * 0.10;
    rig.legL.rotation.x = ls;
    rig.legR.rotation.x = -ls;
    rig.armL.rotation.x = -ls * 0.85;
    rig.armR.rotation.x = ls * 0.85;
    // 攻击前摇：右手前挥 + 左臂略微后摆平衡
    if (attack > 0) {
      rig.armR.rotation.x = -1.4 * attack;
      rig.armL.rotation.x = 0.25 * attack;
    }
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
    // 手写 bloom：刀光中心叠加 additive 光晕（泛光感，帧率友好）
    const glow = glowSprite(0xaaddff, 2.4);
    glow.position.copy(arc.position);
    scene.add(glow);
    let t = 0;
    const anim = () => {
      t += 0.08;
      arc.scale.setScalar(1 + t * 1.6);
      arc.material.opacity = Math.max(0, 1 - t * 2.2);
      arc.position.x += dir.x * 0.16;
      arc.position.z += dir.z * 0.16;
      glow.position.set(arc.position.x, arc.position.y, arc.position.z);
      glow.material.opacity = Math.max(0.12, 1 - t * 1.8);
      glow.scale.setScalar(1 + t * 1.9);
      if (t < 0.55) requestAnimationFrame(anim);
      else {
        scene.remove(arc); arc.material.dispose(); tex.dispose();
        scene.remove(glow); glow.material.dispose();
      }
    };
    anim();
  }

  // 弹道（枪战）：从玩家朝向射出细长光束/子弹拖尾 + 枪口闪光 + 命中火花。
  function shootFx() {
    if (!player) return;
    const dir = { x: Math.sin(yaw), z: Math.cos(yaw) };
    const start = { x: PX.x + dir.x * 0.6, y: 1.5, z: PX.z + dir.z * 0.6 };
    // 枪口闪光（additive 光晕）
    const muzzle = glowSprite(0xffd27a, 0.5);
    muzzle.position.set(start.x, start.y, start.z);
    scene.add(muzzle);
    // 弹道主体：细长胶囊（沿朝向），兼具子弹拖尾
    const len = 1.6;
    const bullet = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.045, len, 4, 8),
      new THREE.MeshBasicMaterial({ color: 0xffd98a, transparent: true, depthWrite: false })
    );
    bullet.rotation.x = Math.PI / 2;
    bullet.rotation.z = yaw - Math.PI / 2;
    scene.add(bullet);
    // 命中火花：目标敌人身上 pos 起爆一次
    let hitPos = null;
    if (enemy) hitPos = { x: enemy.position.x, y: 1.4, z: enemy.position.z };
    spawnSpark(hitPos || { x: PX.x + dir.x * 2.4, y: 1.4, z: PX.z + dir.z * 2.4 }, 0xffb066, 10);
    let t = 0;
    const anim = () => {
      t += 0.06;
      bullet.position.set(start.x + dir.x * t * 4.2, start.y, start.z + dir.z * t * 4.2);
      bullet.material.opacity = Math.max(0, 1 - t * 2.6);
      bullet.scale.y = Math.max(0.4, 1 - t * 6);
      muzzle.material.opacity = Math.max(0, 1 - t * 5);
      muzzle.scale.setScalar(1 + t * 5);
      if (t < 0.4) requestAnimationFrame(anim);
      else {
        scene.remove(bullet); bullet.geometry.dispose(); bullet.material.dispose();
        scene.remove(muzzle); muzzle.material.dispose();
      }
    };
    anim();
  }

  // 命中火花（小型喷射粒子，供 shootFx/beamFx 命中复用）
  function spawnSpark(pos, color, n) {
    for (let i = 0; i < (n || 8); i++) {
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(0.06 + Math.random() * 0.06, 0.06 + Math.random() * 0.06, 0.06 + Math.random() * 0.06),
        new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false })
      );
      m.position.set(pos.x, pos.y, pos.z);
      const a = Math.random() * 6.28, e = 0.4 + Math.random() * 0.6;
      scene.add(m);
      blood.push({
        m,
        vx: Math.cos(a) * e, vy: 0.5 + Math.random() * 0.9, vz: Math.sin(a) * e,
        spin: (Math.random() - 0.5) * 0.9,
        life: 0, max: 0.3 + Math.random() * 0.2,
      });
    }
  }

  // 激光（beamFx）：从玩家射向敌人方向的粗亮光柱 + 边缘辉光，持续约 0.3s 后淡出。
  function beamFx() {
    if (!player) return;
    const dir = { x: Math.sin(yaw), z: Math.cos(yaw) };
    const from = { x: PX.x, y: 1.55, z: PX.z };
    const to = enemy
      ? { x: enemy.position.x, y: 1.4, z: enemy.position.z }
      : { x: PX.x + dir.x * 4, y: 1.5, z: PX.z + dir.z * 4 };
    const dx = to.x - from.x, dy = to.y - from.y, dz = to.z - from.z;
    const dist = Math.max(0.5, Math.hypot(dx, dy, dz));
    const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2, z: (from.z + to.z) / 2 };
    const beacon = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.07, dist, 10),
      new THREE.MeshBasicMaterial({ color: 0x66e0ff, transparent: true, depthWrite: false })
    );
    beacon.position.set(mid.x, mid.y, mid.z);
    beacon.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx, dy, dz).normalize());
    scene.add(beacon);
    // 边缘辉光：外圈稍粗的淡蓝色半透明柱体包裹核心光柱
    const halo = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.16, dist, 10),
      new THREE.MeshBasicMaterial({ color: 0x9af0ff, transparent: true, opacity: 0.32, depthWrite: false, blending: THREE.AdditiveBlending })
    );
    halo.position.copy(beacon.position);
    halo.quaternion.copy(beacon.quaternion);
    scene.add(halo);
    // 命中火花（过热灼点）
    spawnSpark(to, 0x9ae8ff, 12);
    let t = 0;
    const anim = () => {
      t += 0.016;
      const hold = Math.min(1, t / 0.3);      // 前 0.3s 持续亮起
      const fade = Math.max(0, 1 - (t - 0.3) * 2.4); // 之后淡出
      const op = Math.min(hold, fade);
      beacon.material.opacity = op;
      halo.material.opacity = 0.32 * op;
      if (t < 0.75) requestAnimationFrame(anim);
      else {
        scene.remove(beacon); beacon.geometry.dispose(); beacon.material.dispose();
        scene.remove(halo); halo.geometry.dispose(); halo.material.dispose();
      }
    };
    anim();
  }

  // 法术球（魔法/修真）：从玩家飞向敌人的发光球体 + 符文环 + 命中爆炸粒子。
  function magicFx() {
    if (!player) return;
    const dir = { x: Math.sin(yaw), z: Math.cos(yaw) };
    const from = { x: PX.x + dir.x * 0.8, y: 1.6, z: PX.z + dir.z * 0.8 };
    const to = enemy
      ? { x: enemy.position.x, y: 1.3, z: enemy.position.z }
      : { x: PX.x + dir.x * 4, y: 1.4, z: PX.z + dir.z * 4 };
    const orb = glowSprite(0xc79bff, 0.9);
    orb.position.set(from.x, from.y, from.z);
    scene.add(orb);
    // 符文环：围绕法术球的一道旋转发光环
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.42, 0.02, 8, 24),
      new THREE.MeshBasicMaterial({ color: 0xe0c9ff, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending })
    );
    ring.position.copy(orb.position);
    scene.add(ring);
    // 命中爆炸粒子（法阵爆散）
    const burst = () => {
      for (let i = 0; i < 16; i++) {
        const m = new THREE.Mesh(
          new THREE.BoxGeometry(0.07 + Math.random() * 0.05, 0.07 + Math.random() * 0.05, 0.07 + Math.random() * 0.05),
          new THREE.MeshBasicMaterial({ color: i % 3 === 0 ? 0xffe9a0 : 0xc79bff, transparent: true, depthWrite: false })
        );
        m.position.set(to.x, to.y, to.z);
        const a = Math.random() * 6.28, e = 0.7 + Math.random() * 0.9;
        scene.add(m);
        blood.push({
          m,
          vx: Math.cos(a) * e, vy: 0.4 + Math.random() * 1.2, vz: Math.sin(a) * e,
          spin: (Math.random() - 0.5) * 1.2,
          life: 0, max: 0.35 + Math.random() * 0.25,
        });
      }
    };
    let t = 0, exploded = false;
    const ox = to.x - from.x, oy = to.y - from.y, oz = to.z - from.z;
    const anim = () => {
      t += 0.04;
      const k = Math.min(1, t * 1.6);
      orb.position.set(from.x + ox * k, from.y + oy * k, from.z + oz * k);
      ring.position.copy(orb.position);
      ring.rotation.y += 0.2;
      ring.rotation.x += 0.08;
      if (k >= 1 && !exploded) { exploded = true; burst(); }
      orb.material.opacity = Math.max(0, 1 - Math.max(0, t - 0.55) * 3);
      ring.material.opacity = Math.max(0, 0.9 - Math.max(0, t - 0.55) * 3);
      if (t < 0.75) requestAnimationFrame(anim);
      else {
        scene.remove(orb); orb.material.dispose();
        scene.remove(ring); ring.geometry.dispose(); ring.material.dispose();
      }
    };
    anim();
  }

  // 拳击（无武器）：近身短促冲击波 + 手臂前挥残影。玩家动画由 animateRig 的 attack 驱动自然完成前挥。
  function punchFx() {
    if (!player) return;
    // 短促冲击波：贴地快速扩张的光圈
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.4, 0.7, 28),
      new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(PX.x, 0.12, PX.z);
    scene.add(ring);
    // 拳风拖尾：一束由肢体方向泛开的气流残影（体素人肩高附近）
    const dir = { x: Math.sin(yaw), z: Math.cos(yaw) };
    const streak = new THREE.Mesh(
      new THREE.PlaneGeometry(1.1, 0.5),
      new THREE.MeshBasicMaterial({ color: 0xffe6b0, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })
    );
    streak.position.set(PX.x + dir.x * 1.1, 1.5, PX.z + dir.z * 1.1);
    streak.rotation.y = -yaw;
    scene.add(streak);
    let t = 0;
    const anim = () => {
      t += 0.05;
      ring.scale.setScalar(1 + t * 3.2);
      ring.material.opacity = Math.max(0, 1 - t * 2.6);
      streak.scale.setScalar(1 + t * 1.4);
      streak.material.opacity = Math.max(0, 1 - t * 3);
      streak.position.x += dir.x * 0.1;
      streak.position.z += dir.z * 0.1;
      if (t < 0.4) requestAnimationFrame(anim);
      else {
        scene.remove(ring); ring.geometry.dispose(); ring.material.dispose();
        scene.remove(streak); streak.geometry.dispose(); streak.material.dispose();
      }
    };
    anim();
  }

  // 攻击特效分发：按当前武器类型风格路由到对应特效（onAction 语义不变，attack 仍触发）。
  function runAttackFx() {
    switch (curWeaponStyle) {
      case "gun":   shootFx(); break;
      case "laser": beamFx();  break;
      case "magic": magicFx(); break;
      case "melee": swingFx(); break;   // 刀战/剑/斧/镰/鞭 → 保留 swingFx 弧形刀光
      default:      punchFx(); break;   // unarmed → 拳击
    }
  }

  function enemyHitFx() {
    if (!enemy) return;
    // 受击后仰：躯干后倾计时（体素敌人由 loop 里的 animateRig 读取，约 0.2s 内 upper 后仰回落）
    if (enemy.userData.hurtT !== undefined) enemy.userData.hurtT = 1;
    if (!enemy.userData.dying) spawnBlood({ x: enemy.position.x, y: 1.1, z: enemy.position.z });
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

    // 灯光（二游冷主光 + 暖补光 + 半球环境）
    const amb = new THREE.AmbientLight(0x6a7a92, 0.4);
    scene.add(amb);
    // 半球光：天青→地红的环境反射，让体素方块的暗面仍可见环境轮廓（省显存、纯数学）
    const hemi = new THREE.HemisphereLight(0xbfd6ff, 0x241d28, 0.55);
    scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xe8f2ff, 1.1);
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
    dir.shadow.bias = -0.0004;      // 微调使平面接缝更干净（normalBias 亦设：减少痤疮又不至漏光）
    dir.shadow.normalBias = 0.04;
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
    if (data && data.weapon !== undefined) curWeaponStyle = resolveWeaponStyle(data.weapon);
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
        enemy.userData = { kind, spec, sprite: null, dying: false, dyingT: 0, hurtT: 0 };
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
        enemy.userData = { kind, spec, sprite: spr, dying: false, dyingT: 0, hurtT: 0 };
        enemy.scale.setScalar(1.15);
      }
    }
    resetPlayer();
  }

  function resetPlayer() {
    PX.x = -4; PX.z = 0;
    if (player) { player.position.set(PX.x, 0, PX.z); }
    yaw = 0;
    attackCd = 0; dodgeCd = 0; if (player) player.userData.attackT = 0;
    victoryT = 0;
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
      if (attackCd <= 0 && onAction) { attackCd = 0.7; onAction("attack", 0); runAttackFx(); enemyHitFx(); if (player) player.userData.attackT = 1; }
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
    blood.forEach(b => { try { scene.remove(b.m); b.m.geometry.dispose(); b.m.material.dispose(); } catch (e) {} });
    blood = [];
    if (glowTex) { try { glowTex.dispose(); } catch (e) {} glowTex = null; }
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
    // 体素玩家程序化动画：呼吸 + 行走摆动 + 攻击前摇（onAction 语义不变）
    if (player && player.userData.rig) {
      if (player.userData.attackT > 0) player.userData.attackT = Math.max(0, player.userData.attackT - 0.04);
      if (victoryT > 0) victoryT = Math.max(0, victoryT - 0.02); // 胜利动作：双臂上举持续约 0.5s
      animateRig(player.userData.rig, performance.now() / 1000, (dx || dz) ? 5.5 : 0.7, player.userData.attackT || 0);
      // 胜利双手高举（上臂枢轴 rotation.x 负向抬举），victoryT 递减淡出
      if (victoryT > 0) {
        player.userData.rig.armL.rotation.x = -2.4 * victoryT;
        player.userData.rig.armR.rotation.x = -2.4 * victoryT;
        player.userData.rig.upper.rotation.z = 0;
      }
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
        // 体素方块人：朝向玩家 + 行走/待机程序化动画；死亡后下沉并移除
        enemy.rotation.y = Math.atan2(PX.x - EZ.x, PX.z - EZ.z);
        const vx = enemy.userData.voxel;
        if (enemy.userData.dying) {
          enemy.userData.dyingT += 0.016;
          const k = Math.min(1, enemy.userData.dyingT / 0.7);
          enemy.position.y = -0.5 * k;
          // 死亡倒地：整体侧倾（rotation.z 向一侧倒）+ 略带前仰（rotation.x），配合下沉，视觉更「真倒地」
          enemy.rotation.z = 0.62 * k;
          enemy.rotation.x = 0.28 * k;
          if (k >= 1 && scene) { scene.remove(enemy); enemy = null; }
        } else if (vx) {
          enemy.position.y = Math.sin(performance.now() / 450 + vx.phase) * 0.04; // 待机微浮
          if (enemy.userData.rig) {
            // 追踪时=行走摆动加速；静止时缓慢跛行/待机摆（较玩家更低频，敌人更「沉重」）
            const walk = distE > 2.2 ? 3.2 : 0.5;
            // 受击后仰：hurtT 约 0.25s 内经 upper 后仰（rotation.x 正向仰）并线性回弹，短促带顿挫感
            const h = enemy.userData.hurtT || 0;
            let hurtLean = 0;
            if (h > 0) {
              enemy.userData.hurtT = Math.max(0, h - 0.06);
              hurtLean = 0.4 * h; // 峰值 0.4，随 h 线性回弹到 0
            }
            animateRig(enemy.userData.rig, performance.now() / 1000, walk * (vx.armBoost || 1), 0);
            enemy.userData.rig.upper.rotation.x += hurtLean;
          }
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
    // 命中血粒子衰减（方块飞溅，含落点弹停）
    if (blood.length) updateBlood(0.016);
    renderer.render(scene, camera);
  }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function onZoneUpdate(data) {
    if (data && data.kind === "fight") {
      if (data.win) {
        if (enemy) { enemy.userData.dying = true; enemy.userData.dyingT = 0; }
        victoryT = 1;   // 胜利动作：玩家双臂上举（loop 驱动）
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