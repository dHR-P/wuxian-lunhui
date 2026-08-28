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

  // —— 装备体系深化特效（战斗特效对应装备体系）——
  // 武器细分：curWeaponId 是 setData 下发的原始武器串（id 或名称），WEAPON_FX 按 id 查、
  //   WEAPON_FX_NAMES 按中文名兜底，两者都未命中回退 5 类大类默认特效。
  // 法宝：玩家装配的法宝 id 列表（data.fx.treasure），attack 时附加法宝特效。
  // 血统：玩家血统 id（data.bloodline），持续身体 aura（additive 光环，随 player 跟随）。
  // 技能流派：已学技能 id 列表（data.skills），attack 时按流派附加特效。
  let curWeaponId = "—";             // 原始武器串（id 或中文名），供 WEAPON_FX 精确匹配
  let curFxTreasure = [];            // 已装配法宝 id[]（本命/护身/辅助）
  let curBloodline = null;           // 玩家血统 id（无则 null）
  let curSkills = [];                // 已学技能 id[]
  let auraPoints = null;             // 血统 aura 粒子系统（Points，additive，随 player 跟随）
  let auraPulse = 0;                 // aura 动画相位 (s)
  let weaponFxKey = null;            // 当前解析出的武器细分 fx key（weapons_* / default 类别）

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

  // ================= 装备体系 · 武器细分特效映射表 =================
  // 在 5 类大类（melee/gun/laser/magic/unarmed）之内，再按"具体武器 id/名"细分颜色与形态。
  // fxKey → 类内变体，runAttackFx 先查此表命中则走细分特效，未命中回退大类默认。
  // 键统一小写。数值 id 取自 items_data.rs::WEAPONS / TRESURE_DEFS；中文名作名称兜底
  //（HUD 下发的 weapon 多为旧枚举中文名，精确 id 与中英文名兼收才能稳定命中）。
  const WEAPON_FX = {
    // —— melee 大类变体：血色镰风 / 青色剑阵 / 青色仙侠剑气 / 绿色纳米切割线 ——
    "wpn_bloodsaber":    { key: "weapons_bloodscythe", name: "血戮剑" },
    "wp_scythe_pobing":  { key: "weapons_bloodscythe", name: "破军重镰" },
    "wpn_zhuai_jianpan": { key: "weapons_swordarray",  name: "诛仙剑阵盘" },
    "wpn_taixu_godsaw":  { key: "weapons_taixu",       name: "太虚神剑" },
    "wpn_nano_whip":     { key: "weapons_nanowhip",    name: "纳米切割鞭" },
    // —— magic 大类变体：蓝紫量子粒子 / 紫色引力坍缩球 / 因果律光 ——
    "wp_quantum_annihil":  { key: "weapons_quantum",    name: "量子湮灭刀" },
    "wp_gravity_collapse": { key: "weapons_gravity",    name: "引力坍缩炮" },
    "wpn_causality_sword": { key: "weapons_causality",  name: "因果律护身剑" },
    // —— laser 大类变体：蓝色电磁轨道光束 ——
    "wpn_rail_sniper": { key: "weapons_rail", name: "电磁轨道狙击枪" },
    // —— 法宝主手武器（TRESURE_DEFS slot 0，本命武）：青剑意 / 秋水神剑 ——
    "cu_bab_benming_fejian": { key: "weapons_swordqi", name: "本命飞剑·青锋" },
    "cu_bab_qiushui_jian":   { key: "weapons_swordqi", name: "秋水神剑" },
  };
  function resolveWeaponFxKey(raw) {
    if (!raw || raw === "—" || raw === "无" || raw === "none") return null;
    const k = String(raw).toLowerCase();
    // 1) 精确 id
    if (WEAPON_FX.hasOwnProperty(k)) return WEAPON_FX[k].key;
    // 2) 中文名兜底（键含中文，原样比即可；再做拼音/ascii 小写不影响中文）
    const byName = Object.keys(WEAPON_FX).find(id => (WEAPON_FX[id].name || "") === String(raw));
    if (byName) return WEAPON_FX[byName].key;
    return null;
  }

  // ============ 法宝特效映射（TRESURE_DEFS；attack 时按装配法宝附加） ============
  // fxKind: 剑意(青) / 玄光盾(金) / 雷光(雷) / 血煞(红) / 明镜(白) / 生死轮(黑白)
  const TREASURE_FX = {
    "tr_zhuxian_calendar": { kind: "jianyi",   name: "诛仙剑意图" },
    "tr_blood_banner":     { kind: "blood",     name: "血煞战旗" },
    "tr_taixu_shield":     { kind: "shield",    name: "太虚玄光镜" },
    "tr_shenlei_pendant":  { kind: "thunder",   name: "神雷辟邪佩" },
    "tr_danxin_mirror":    { kind: "mirror",    name: "锻心明镜" },
    "tr_undo_pillowstone": { kind: "lifewheel", name: "逆转生死盘" },
  };

  // ============ 血统 aura 映射（BLOODLINES；持续身体光晕，非攻击特效） ============
  const BLOODLINE_AURAS = {
    "angel_bloodline":    { name: "angel",    color: 0xeaf4ff }, // 白金光翼光晕
    "demon_bloodline":    { name: "demon",    color: 0xff4466 }, // 暗红暗翼
    "dragon_bloodline":   { name: "dragon",   color: 0xffcf3a }, // 金色龙鳞辉光
    "cyber_prosthetic":   { name: "cyber",    color: 0x42c8ff }, // 蓝光机械纹
  };

  // ============ 技能流派特效映射（SKILLS；attack 时按已学流派附加） ============
  // schoolKey: xiu(青气劲)/holy(金色光柱)/nt(紫念力)/meme(绿色失真)
  const SCHOOL_STREAM = {
    xiu:  { label: "修真·青气劲", color: 0x66e0a0 },
    holy: { label: "圣光·金光柱", color: 0xffe07a },
    nt:   { label: "超能NT·念力", color: 0xb78aff },
    meme: { label: "模因·绿失真", color: 0x6bff8a },
  };
  // 由已学技能 id 推断流派（skills_data 前缀约定；school ≠ 子技能的某种投掷，仅作 FX 路由）
  function skillSchools(ids) {
    const set = {};
    (ids || []).forEach(id => {
      const s = String(id);
      if (/^(cu_|skx_xiu_)/.test(s)) set.xiu = true;        // 修真
      else if (/^(sk_holy_|skx_holy_)/.test(s)) set.holy = true; // 圣光
      else if (/^(sk_nt_|skx_nt_)/.test(s)) set.nt = true;   // 超能 NT
      else if (/^(sk_meme_|skx_meme_)/.test(s)) set.meme = true; // 模因
    });
    return Object.keys(set); // 返回已命中的 schoolKey[]
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
  // —— 精细度升级：段数由 12 拉至 18~24 ——
  //   新增：颈部(head 组)、手肘/膝盖关节枢轴(elbow/knee)、拳头块、鞋块、肩甲块；
  //   cfg.bodyType 决定 BODY_DIMS 各段方块尺寸（高矮胖瘦一眼可分，非只 scale）；
  //   cfg.bodyTex 给躯干四肢贴 Canvas 布料/甲纹理；cfg.face 给头贴 Canvas 五官纹理。
  // 敌我共用 buildVoxelBody 保证同构（仅 cfg 配色/体型不同，脚底贴地）。rig 记录各枢轴供动画。

  // 十六进制颜色 → rgba() 字符串（Canvas 绘图用；供 makeFaceTexture/makeBodyTextureMap）
  function hexToRgba(hex, alpha) {
    const h = (hex | 0x1000000).toString(16).slice(1);
    const r = parseInt(h.substr(0, 2), 16), g = parseInt(h.substr(2, 2), 16), b = parseInt(h.substr(4, 2), 16);
    return `rgba(${r},${g},${b},${alpha == null ? 1 : alpha})`;
  }

  // ============================================================
  // 体素方块人 · Canvas 五官脸纹理（MC 皮肤风：在方块脸正面画像素五官）
  // ============================================================
  // makeFaceTexture(kind, skinHex)：256×256 Canvas 在皮肤底上绘制眼睛/眉/嘴/伤痕等像素五官。
  const FACE_PIXEL = 256;
  function makeFaceTexture(kind, skinHex) {
    const S = FACE_PIXEL;
    const c = document.createElement("canvas"); c.width = c.height = S;
    const ctx = c.getContext("2d");
    const base = (skinHex || 0xf0e0d0);
    const skin = hexToRgba(base, 1);
    const dark = "rgba(20,12,10,1)";
    const blood = "rgba(150,18,10,1)";
    const bone = "rgba(230,220,200,1)";
    ctx.fillStyle = skin; ctx.fillRect(0, 0, S, S);
    const skinNoise = (kind === "zombie" || kind === "horde") ? 1 : (kind === "licker" ? 1.5 : 0.3);
    if (skinNoise > 0) for (let i = 0; i < 900 * skinNoise; i++) {
      const a = Math.random() * 0.18;
      ctx.fillStyle = `rgba(${Math.random()*60|0},${Math.random()*40|0},${Math.random()*20|0},${a})`;
      ctx.fillRect(Math.random() * S, Math.random() * S, 2 + Math.random() * 4, 2 + Math.random() * 4);
    }
    const px = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); };
    const vline = (x, y0, y1, w, col) => { ctx.fillStyle = col; ctx.fillRect(x, y0, w, y1 - y0); };
    const hline = (x0, y, x1, h, col) => { ctx.fillStyle = col; ctx.fillRect(x0, y, x1 - x0, h); };
    const fk = (kind === "fulaidi" || kind === "dream") ? "fulaidi" : (kind || "zombie");
    const eyeY = 116, eyeW = 14, eyeH = 16, eyeDX = 60, eyeGap = 16;
    const drawEye = (cx, col, style) => {
      const x = cx - eyeW / 2, y = eyeY;
      px(x, y, eyeW, eyeH, col);
      if (style === "hollow") px(cx - 5, y + 4, 10, 8, "rgba(5,4,3,1)");
      else if (style === "slit") px(cx - 2, y + 3, 4, 10, "rgba(4,4,3,1)");
      else if (style === "glow") { px(x, y, eyeW, eyeH, "rgba(60,8,8,1)"); px(cx - 4, y + 5, 8, 6, "rgba(255,40,30,1)"); }
      else { px(cx - 5, y + 3, 10, 10, dark); px(cx + 2, y + 5, 3, 3, "rgba(255,255,255,0.85)"); }
    };
    const drawBrow = (cx, angry, none) => {
      if (none) return;
      const by = eyeY - 26;
      if (angry) { hline(cx - 30, by - 4, cx - 2, 6, dark); hline(cx + 2, by + 2, cx + 30, 6, dark); }
      else { px(cx - 30, by, 28, 6, dark); px(cx + 2, by, 28, 6, dark); }
    };
    if (fk !== "licker") px(S / 2 - 2, 128, 4, 14, fk === "zombie" || fk === "horde" ? "rgba(20,28,14,1)" : "rgba(0,0,0,0.25)");
    switch (fk) {
      case "horde":
        drawEye(S / 2 - eyeDX - eyeGap / 2, "rgba(60,60,50,1)", "hollow");
        drawEye(S / 2 + eyeDX - eyeGap / 2, "rgba(60,60,50,1)", "hollow");
        drawBrow(S / 2 - eyeDX, false, true); drawBrow(S / 2 + eyeDX, false, true);
        ctx.fillStyle = "rgba(40,30,20,1)"; ctx.fillRect(S / 2 - 34, 152, 68, 18);
        for (let i = 0; i < 8; i++) px(S / 2 - 32 + i * 8, 150, 6, 4, bone);
        break;
      case "zombie":
        drawEye(S / 2 - eyeDX - eyeGap / 2, "rgba(55,55,45,1)", "hollow");
        drawEye(S / 2 + eyeDX - eyeGap / 2, "rgba(55,55,45,1)", "hollow");
        drawBrow(S / 2 - eyeDX, false, true); drawBrow(S / 2 + eyeDX, false, true);
        ctx.fillStyle = blood; ctx.fillRect(S / 2 - 44, 146, 88, 34);
        ctx.fillStyle = "rgba(30,8,6,1)"; ctx.fillRect(S / 2 - 38, 152, 76, 6); ctx.fillRect(S / 2 - 38, 168, 76, 6);
        for (let i = 0; i < 9; i++) { px(S / 2 - 40 + i * 9, 150, 5, 6, bone); px(S / 2 - 38 + i * 9, 172, 5, 4, "rgba(200,190,170,1)"); }
        break;
      case "hunter":
        drawEye(S / 2 - eyeDX - eyeGap / 2, "rgba(230,220,190,1)", "slit");
        drawEye(S / 2 + eyeDX - eyeGap / 2, "rgba(230,220,190,1)", "slit");
        drawBrow(S / 2 - eyeDX, true, false); drawBrow(S / 2 + eyeDX, true, false);
        px(S / 2 - 42, 154, 84, 14, "rgba(60,20,14,1)");
        vline(S / 2 - 40, 158, 168, 5, "rgba(20,10,8,1)");
        for (let i = 0; i < 4; i++) { px(S / 2 - 34 + i * 16, 154, 6, 9, bone); px(S / 2 - 30 + i * 16, 160, 6, 8, bone); }
        break;
      case "licker":
        px(64, 34, 128, 44, "rgba(120,20,20,1)");
        for (let i = 0; i < 6; i++) hline(70 + i * 4, 44 + (i % 2) * 6, 70 + i * 4 + 110, 4, "rgba(80,10,10,1)");
        drawEye(S / 2 - eyeDX - eyeGap / 2 - 6, "rgba(90,8,8,1)", "glow");
        drawEye(S / 2 + eyeDX - eyeGap / 2 + 6, "rgba(90,8,8,1)", "glow");
        ctx.fillStyle = "rgba(20,8,8,1)";
        ctx.beginPath(); ctx.moveTo(S / 2, 92); ctx.lineTo(S / 2 - 66, 178); ctx.lineTo(S / 2 + 66, 178); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "rgba(150,16,12,1)"; ctx.fillRect(S / 2 - 46, 112, 92, 8);
        for (let i = 0; i < 7; i++) px(S / 2 - 46 + i * 13, 116, 6, 7, bone);
        for (let i = 0; i < 7; i++) px(S / 2 - 40 + i * 13, 142, 6, 6, "rgba(210,190,170,1)");
        break;
      case "fulaidi":
        px(40, 120, 176, 10, "rgba(150,20,12,0.8)"); px(40, 150, 176, 8, "rgba(60,110,40,0.7)"); px(40, 186, 176, 9, "rgba(140,16,10,0.8)");
        drawEye(S / 2 - eyeDX - eyeGap / 2, "rgba(60,8,6,1)", "glow");
        drawEye(S / 2 + eyeDX - eyeGap / 2, "rgba(60,8,6,1)", "glow");
        drawBrow(S / 2 - eyeDX, true, false); drawBrow(S / 2 + eyeDX, true, false);
        px(S / 2 - 74, 156, 148, 16, "rgba(30,6,4,1)");
        for (let i = 0; i < 9; i++) px(S / 2 - 70 + i * 16, 154, 6, 6, bone);
        ctx.strokeStyle = "rgba(150,14,10,0.9)"; ctx.lineWidth = 3;
        for (let i = -2; i <= 2; i++) { const sx = S / 2 + i * 22; ctx.beginPath(); ctx.moveTo(sx, 116); ctx.bezierCurveTo(sx + 10, 140, sx - 6, 170, sx + 4, 200); ctx.stroke(); }
        break;
      default:
        drawEye(S / 2 - eyeDX - eyeGap / 2, "rgba(235,225,210,1)", "normal");
        drawEye(S / 2 + eyeDX - eyeGap / 2, "rgba(235,225,210,1)", "normal");
        const serious = (kind === "guard");
        drawBrow(S / 2 - eyeDX, !serious && kind === "hunter", serious);
        drawBrow(S / 2 + eyeDX, !serious && kind === "hunter", serious);
        if (serious) { px(S / 2 - 26, 166, 52, 6, "rgba(60,30,20,1)"); vline(S / 2 - 34, 152, 184, 3, "rgba(0,0,0,0.12)"); vline(S / 2 + 30, 152, 184, 3, "rgba(0,0,0,0.12)"); }
        else { px(S / 2 - 22, 164, 44, 7, "rgba(70,35,20,1)"); px(S / 2 - 16, 168, 32, 4, "rgba(160,60,40,0.6)"); ctx.strokeStyle = "rgba(150,30,20,0.85)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(S / 2 + 30, 104); ctx.lineTo(S / 2 + 8, 176); ctx.stroke(); }
        break;
    }
    const tex = new THREE.CanvasTexture(c);
    tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false;
    return tex;
  }
  // 脸部皮肤底色查表（与 buildVoxelEnemy/buildVoxelPlayer 的 skin 配色一致）
  function faceSkinHex(kind) {
    if (kind === "fulaidi" || kind === "dream") return 0xd08a72;
    if (kind === "hunter") return 0x5f5f6a;
    if (kind === "licker") return 0x6a1f1f;
    if (kind === "zombie" || kind === "horde") return 0x7d8a6a;
    return 0xd8a878;
  }

  // ============================================================
  // 身体 Canvas 纹理（不只脸）：躯干/四肢方块贴衣服褶皱/皮甲纹/金属甲纹/血锈。
  // ============================================================
  const BODY_TEX_CACHE = {};
  function makeBodyTextureMap(kind, baseHex) {
    if (typeof document === "undefined") return null;
    const key = String(kind) + "|" + (baseHex || 0);
    if (BODY_TEX_CACHE[key]) return BODY_TEX_CACHE[key];
    const r = (baseHex >> 16) & 255, g = (baseHex >> 8) & 255, b = baseHex & 255;
    const s = 128;
    const zom = /zombie|horde|licker/.test(String(kind));
    const guard = kind === "guard";
    const hunter = kind === "hunter";
    const canvas = document.createElement("canvas"); canvas.width = canvas.height = s;
    const ctx = canvas.getContext("2d");
    const px = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); };
    ctx.fillStyle = `rgb(${r},${g},${b})`; ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 220; i++) {
      const a = Math.random() * (zom ? 0.22 : 0.1);
      ctx.fillStyle = `rgba(${Math.random()*40|0},${Math.random()*30|0},${Math.random()*25|0},${a})`;
      ctx.fillRect(Math.random() * s, Math.random() * s, 2 + Math.random() * 4, 2 + Math.random() * 4);
    }
    const fold = `rgba(0,0,0,${zom ? 0.30 : guard ? 0.20 : hunter ? 0.24 : 0.14})`;
    for (let i = 0; i < 5; i++) ctx.fillStyle = fold, ctx.fillRect(12, 18 + i * 24, s - 24, 3);
    for (let i = 0; i < 3; i++) ctx.fillStyle = fold, ctx.fillRect(30 + i * 34, 8, 3, s - 16);
    ctx.fillStyle = `rgba(255,255,255,${zom ? 0.05 : 0.10})`;
    for (let i = 0; i < 3; i++) ctx.fillRect(36 + i * 30, 14, 2, s - 28);
    if (zom) {
      px(20, 34, 14, 22, "rgba(90,14,10,0.85)"); px(86, 66, 18, 14, "rgba(110,16,10,0.8)"); px(44, 96, 22, 12, "rgba(120,14,10,0.7)");
      for (let i = 0; i < 8; i++) { ctx.strokeStyle = "rgba(70,10,8,0.9)"; ctx.lineWidth = 2; const x0 = 20 + Math.random() * 88, y0 = 20 + Math.random() * 88; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + 8, y0 + 10); ctx.stroke(); }
      for (let i = 0; i < 4; i++) { const x0 = 24 + Math.random() * 80, y0 = 24 + Math.random() * 80; ctx.fillStyle = "rgba(40,20,16,0.9)"; ctx.fillRect(x0, y0, 6 + Math.random() * 8, 5 + Math.random() * 7); }
    } else if (guard) {
      px(46, 8, 36, 22, "rgba(20,28,40,0.55)"); px(4, 4, 120, 4, "rgba(20,28,40,0.5)");
      ctx.strokeStyle = "rgba(20,26,40,0.6)"; ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(20, 58 + i * 26); ctx.lineTo(108, 58 + i * 26); ctx.stroke(); }
      for (let i = 0; i < 2; i++) { ctx.beginPath(); ctx.moveTo(40 + i * 44, 26); ctx.lineTo(40 + i * 44, 116); ctx.stroke(); }
    } else if (hunter) {
      for (let i = 0; i < 6; i++) px(16 + Math.random() * 96, 16 + Math.random() * 96, 3, 3, "rgba(120,110,90,0.9)");
      ctx.strokeStyle = "rgba(40,30,20,0.6)"; ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(12, 24 + i * 32); ctx.lineTo(116, 24 + i * 32); ctx.stroke(); }
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(18 + i * 26, 16); ctx.lineTo(18 + i * 26, 112); ctx.stroke(); }
    } else {
      px(52, 30, 24, 16, "rgba(255,255,255,0.08)");
      ctx.fillStyle = `rgba(0,0,0,${0.12})`; ctx.fillRect(8, 108, 112, 6);
    }
    const toTex = (cv) => { const t = new THREE.CanvasTexture(cv); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; return t; };
    const map = { shirt: toTex(canvas), pants: toTex(canvas), shoulder: toTex(canvas) };
    BODY_TEX_CACHE[key] = map;
    return map;
  }

  // ============================================================
  // 体型参数化表（BODY_DIMS）：定义每种体型「每段方块」的 x/y/z 尺寸与关键枢轴，
  // 非只调整体 scale——让高矮胖瘦一眼可分。
  // ============================================================
  const BODY_DIMS = {
    standard: { headW: 0.60, headH: 0.62, headFore: 0.0, neckW: 0.22, neckH: 0.18,
      waistW: 0.84, waistH: 0.42, chestW: 0.92, chestH: 0.62, torsoD: 0.50, chestPos: 0.50,
      armSpan: 0.56, armPos: 0.56, shPadW: 0.40, upArmW: 0.26, upArmH: 0.36, foreW: 0.24, foreH: 0.40, fistW: 0.26, fistH: 0.20,
      legSpan: 0.22, thighW: 0.34, thighH: 0.30, shinW: 0.30, shinH: 0.46, shoeW: 0.32, shoeH: 0.16, shoeD: 0.40, hairH: 0.12 },
    tall_thin: { headW: 0.54, headH: 0.60, headFore: 0.0, neckW: 0.18, neckH: 0.22,
      waistW: 0.70, waistH: 0.40, chestW: 0.76, chestH: 0.70, torsoD: 0.42, chestPos: 0.60,
      armSpan: 0.50, armPos: 0.60, shPadW: 0.34, upArmW: 0.22, upArmH: 0.42, foreW: 0.20, foreH: 0.46, fistW: 0.22, fistH: 0.18,
      legSpan: 0.18, thighW: 0.26, thighH: 0.34, shinW: 0.22, shinH: 0.52, shoeW: 0.26, shoeH: 0.14, shoeD: 0.34, hairH: 0.12 },
    short_stout: { headW: 0.64, headH: 0.58, headFore: 0.0, neckW: 0.26, neckH: 0.16,
      waistW: 1.00, waistH: 0.46, chestW: 1.06, chestH: 0.56, torsoD: 0.62, chestPos: 0.46,
      armSpan: 0.60, armPos: 0.52, shPadW: 0.46, upArmW: 0.30, upArmH: 0.28, foreW: 0.28, foreH: 0.30, fistW: 0.30, fistH: 0.16,
      legSpan: 0.24, thighW: 0.40, thighH: 0.24, shinW: 0.38, shinH: 0.36, shoeW: 0.40, shoeH: 0.14, shoeD: 0.44, hairH: 0.12 },
    giant: { headW: 0.70, headH: 0.70, headFore: 0.0, neckW: 0.28, neckH: 0.24,
      waistW: 1.10, waistH: 0.50, chestW: 1.20, chestH: 0.80, torsoD: 0.70, chestPos: 0.60,
      armSpan: 0.64, armPos: 0.60, shPadW: 0.54, upArmW: 0.34, upArmH: 0.46, foreW: 0.30, foreH: 0.50, fistW: 0.34, fistH: 0.24,
      legSpan: 0.30, thighW: 0.46, thighH: 0.40, shinW: 0.42, shinH: 0.56, shoeW: 0.46, shoeH: 0.20, shoeD: 0.50, hairH: 0.14 },
    slender: { headW: 0.52, headH: 0.56, headFore: 0.0, neckW: 0.20, neckH: 0.20,
      waistW: 0.64, waistH: 0.34, chestW: 0.68, chestH: 0.66, torsoD: 0.34, chestPos: 0.58,
      armSpan: 0.44, armPos: 0.58, shPadW: 0.28, upArmW: 0.18, upArmH: 0.40, foreW: 0.16, foreH: 0.44, fistW: 0.18, fistH: 0.15,
      legSpan: 0.14, thighW: 0.20, thighH: 0.30, shinW: 0.18, shinH: 0.46, shoeW: 0.22, shoeH: 0.13, shoeD: 0.30, hairH: 0.12 },
    obese: { headW: 0.52, headH: 0.55, headFore: 0.0, neckW: 0.26, neckH: 0.14,
      waistW: 1.16, waistH: 0.52, chestW: 1.28, chestH: 0.78, torsoD: 0.90, chestPos: 0.55,
      armSpan: 0.70, armPos: 0.55, shPadW: 0.58, upArmW: 0.34, upArmH: 0.26, foreW: 0.30, foreH: 0.28, fistW: 0.32, fistH: 0.18,
      legSpan: 0.34, thighW: 0.52, thighH: 0.26, shinW: 0.48, shinH: 0.34, shoeW: 0.50, shoeH: 0.14, shoeD: 0.46, hairH: 0.12 },
    beast: { headW: 0.62, headH: 0.60, headFore: 0.10, neckW: 0.24, neckH: 0.20,
      waistW: 0.96, waistH: 0.40, chestW: 1.04, chestH: 0.68, torsoD: 0.54, chestPos: 0.54,
      armSpan: 0.60, armPos: 0.54, shPadW: 0.42, upArmW: 0.28, upArmH: 0.42, foreW: 0.26, foreH: 0.46, fistW: 0.28, fistH: 0.20,
      legSpan: 0.28, thighW: 0.40, thighH: 0.34, shinW: 0.36, shinH: 0.46, shoeW: 0.40, shoeH: 0.18, shoeD: 0.44, hairH: 0.12 },
  };

  function buildVoxelBody(g, cfg) {
    const c = cfg.colors;
    const D = BODY_DIMS[cfg.bodyType || "standard"] || BODY_DIMS.standard; // 体型方块尺寸表
    const bt = cfg.bodyTex || null;   // 身体纹理 {shirt,pants,shoulder}
    const matOf = (col, map) => map
      ? new THREE.MeshLambertMaterial({ map, color: 0xffffff })
      : new THREE.MeshLambertMaterial({ color: col });
    const shirtMat = matOf(c.shirt, bt && bt.shirt);
    const pantsMat = matOf(c.pants, bt && bt.pants);
    const shoulderMat = matOf(c.shoulder || c.shirt, bt && bt.shoulder);
    const shoeMat = matOf(c.shoe, null);
    const handMat = matOf(c.hand, null);
    const hairMat = matOf(c.hair, null);
    const skinMat = matOf(c.skin, null);
    const box = (w, h, d, mat, gx, x, y, z, extra) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(x, y, z);
      if (extra) { if (extra.rx) m.rotation.x = extra.rx; if (extra.ry) m.rotation.y = extra.ry; if (extra.rz) m.rotation.z = extra.rz; }
      m.castShadow = true; m.receiveShadow = true;
      gx.add(m);
      return m;
    };
    const pivot = (x, y, z) => { const p = new THREE.Group(); p.position.set(x, y, z); g.add(p); return p; };

    // —— 枢轴高度推导：脚底贴地 y≈0 ——
    const legY = D.thighH + D.shinH + D.shoeH * 0.5;   // 髋枢轴 g-local 高
    const upperY = legY + D.waistH * 0.5 + 0.14;       // 腰枢轴 g-local 高
    // 双腿：髋枢轴(legY) + 大腿/膝盖节/小腿 + 鞋块
    const legL = pivot(-D.legSpan, legY, 0);
    const legR = pivot(D.legSpan, legY, 0);
    const kneeL = new THREE.Group(); kneeL.position.set(0, -D.thighH, 0); legL.add(kneeL);
    const kneeR = new THREE.Group(); kneeR.position.set(0, -D.thighH, 0); legR.add(kneeR);
    box(D.thighW, D.thighH, D.thighW * 0.92, pantsMat, legL, 0, -D.thighH * 0.5, 0);   // 左大腿
    box(D.shinW, D.shinH, D.shinW * 0.92, pantsMat, kneeL, 0, -D.shinH * 0.5, 0);      // 左小腿
    box(D.shoeW, D.shoeH, D.shoeD, shoeMat, kneeL, 0, -D.shinH - D.shoeH * 0.5, 0.04);  // 左脚/鞋
    box(D.thighW, D.thighH, D.thighW * 0.92, pantsMat, legR, 0, -D.thighH * 0.5, 0);   // 右大腿
    box(D.shinW, D.shinH, D.shinW * 0.92, pantsMat, kneeR, 0, -D.shinH * 0.5, 0);      // 右小腿
    box(D.shoeW, D.shoeH, D.shoeD, shoeMat, kneeR, 0, -D.shinH - D.shoeH * 0.5, 0.04);  // 右脚/鞋

    // 上部体（腰+胸+肩臂+颈头），枢轴在腰(upperY)，cfg.lean 让整体前倾（驼背/俯身）
    const upper = pivot(0, upperY, 0);
    box(D.waistW, D.waistH, D.torsoD, shirtMat, upper, 0, -D.waistH * 0.5, 0);                 // 腰
    box(D.chestW, D.chestH, D.torsoD, shirtMat, upper, 0, D.chestPos, D.headFore * 0.4);       // 胸（beast 微前挪）
    // 双肩（臂）枢轴 + 肩甲块 + 上臂/肘关节/前臂 + 拳头块（尺寸与臂长按体型）
    const armL = new THREE.Group(); armL.position.set(-D.armSpan, D.armPos, 0); upper.add(armL);
    const armR = new THREE.Group(); armR.position.set(D.armSpan, D.armPos, 0); upper.add(armR);
    const elbowL = new THREE.Group(); elbowL.position.set(0, -D.upArmH, 0); armL.add(elbowL);
    const elbowR = new THREE.Group(); elbowR.position.set(0, -D.upArmH, 0); armR.add(elbowR);
    box(D.shPadW, 0.14, D.shPadW, shoulderMat, armL, 0, -0.02, 0, { rx: 0.25 });  // 左肩甲
    box(D.shPadW, 0.14, D.shPadW, shoulderMat, armR, 0, -0.02, 0, { rx: 0.25 });  // 右肩甲
    box(D.upArmW, D.upArmH, D.upArmW * 0.92, shirtMat, armL, 0, -D.upArmH * 0.5, 0);            // 左上臂
    box(D.foreW, D.foreH, D.foreW * 0.92, handMat, elbowL, 0, -D.foreH * 0.5, 0);               // 左前臂
    box(D.fistW, D.fistH, D.fistW * 0.98, handMat, elbowL, 0, -D.foreH - D.fistH * 0.5, c.foreZ); // 左拳头
    box(D.upArmW, D.upArmH, D.upArmW * 0.92, shirtMat, armR, 0, -D.upArmH * 0.5, 0);            // 右上臂
    box(D.foreW, D.foreH, D.foreW * 0.92, handMat, elbowR, 0, -D.foreH * 0.5, 0);               // 右前臂
    box(D.fistW, D.fistH, D.fistW * 0.98, handMat, elbowR, 0, -D.foreH - D.fistH * 0.5, c.foreZ); // 右拳头

    // 颈 + 头（head 组：颈部方块在头部枢轴下延，供转头动画）+ 发顶
    const headPosY = D.chestPos + D.chestH * 0.5 + D.neckH * 0.5 + D.headH * 0.45; // 头枢轴 upper 局部 y
    const head = new THREE.Group(); head.position.set(0, headPosY, D.headFore); upper.add(head);
    box(D.neckW, D.neckH, D.neckW * 0.92, skinMat, head, 0, -D.neckH * 0.5, 0);   // 颈部
    const faceMap = (cfg.face && typeof document !== "undefined")
      ? makeFaceTexture(cfg.face.kind, faceSkinHex(cfg.face.kind))
      : null;
    const headMat = faceMap
      ? new THREE.MeshLambertMaterial({ map: faceMap, color: 0xffffff })
      : matOf(c.skin, null);
    const hd = new THREE.Mesh(new THREE.BoxGeometry(D.headW, D.headH, D.headW), headMat);
    hd.position.set(0, D.headH * 0.12, 0);
    hd.castShadow = true; hd.receiveShadow = true;
    head.add(hd);
    box(D.headW * 0.92, D.hairH, D.headW * 0.92, hairMat, head, 0, D.headH * 0.12 + D.headH * 0.5 + D.hairH * 0.5, 0); // 发顶/帽顶
    upper.rotation.x = cfg.lean || 0;
    g.userData.rig = { upper, head,
      armL, elbowL, armR, elbowR,
      legL, kneeL, legR, kneeR,
      baseLean: cfg.lean || 0 };   // baseLean 供动画在呼吸/lean 基础上叠加攻击姿势
  }

  // 体型映射：优先读 VOXEL_VARIANTS 表里的 bodyType 字段（BOSS 独立体型），
  // 未命中再按归一 kind 给默认体型（BODY_DIMS 键名）。返回值 = BODY_DIMS 键。
  function bodyTypeFor(kind, refRaw) {
    const vk = resolveVoxelVariant(kind, refRaw);
    if (vk && VOXEL_VARIANTS[vk] && VOXEL_VARIANTS[vk].bodyType) return VOXEL_VARIANTS[vk].bodyType;
    const r = String(refRaw || "").toLowerCase();
    if (/(short|stout|矮人|胖子|dward)/.test(r)) return "short_stout";
    if (/(tall|修士|刺客|剑灵|剑修|法师|cultivat|scholar)/.test(r)) return "tall_thin";
    if (kind === "hunter") return "tall_thin";      // 猎手高挑
    if (kind === "licker") return "slender";        // 舔食者细长贴地
    if (kind === "zombie") return "obese";          // 尸胖（破衣烂肉横身）
    if (kind === "guard") return "standard";
    if (kind === "horde") return "standard";
    return "standard";
  }

  // 体素方块人敌人（MC 风格）：按 kind 区分体型——hunter 更高大(upright)、licker 俯身贴地、
  // zombie 驼背前倾、guard/horde 标准。VOXEL_ENEMY=true 时替换立绘 billboard。
  function buildVoxelEnemy(g, kind, tint, refRaw) {
    const ftxt = (refRaw && /(fula|dream|梦魇|弗莱迪|freddy)/i.test(String(refRaw))) ? "fulaidi" : (kind === "horde" ? "horde" : kind);
    const repaint = tint || (kind === "hunter" ? 0x4a4a52 : kind === "licker" ? 0x8a2a2a : 0x6a5a3a);
    const V = {
      hunter: { sc: 1.32, lean: -0.10, shirt: 0x4a4a52, skin: 0x5f5f6a, hair: 0x8f96a3, pants: 0x2a2a30, foreZ: 0.0, bob: 0.05 },
      licker: { sc: 0.86, lean: 0.58, shirt: 0x8a2a2a, skin: 0x6a1f1f, hair: 0x3f1010, pants: 0x2a1818, foreZ: 0.34, bob: 0.02 },
      zombie: { sc: 1.02, lean: 0.34, shirt: 0x6a5a3a, skin: 0x7d8a6a, hair: 0x3a3f2c, pants: 0x3a3430, foreZ: 0.16, bob: 0.04 },
    }[kind] || { sc: 1.15, lean: 0.16, shirt: repaint, skin: repaint, hair: 0x8a7a5a, pants: 0x3a3430, foreZ: 0.06, bob: 0.05 }; // guard/horde 标准
    buildVoxelBody(g, {
      bodyType: bodyTypeFor(kind, refRaw),
      lean: V.lean,
      face: { kind: ftxt },
      bodyTex: makeBodyTextureMap(ftxt, V.shirt),
      colors: {
        shirt: V.shirt, pants: V.pants, skin: V.skin, hair: V.hair,
        shoe: 0x1c1a1a, hand: V.skin, foreZ: V.foreZ,
        waistW: 0.84, chestW: 0.92, headW: 0.6, torsoD: 0.5,
      },
    });
    g.scale.setScalar(V.sc);
    // 体素配件系统：按 BOSS/kind 在通用段上附加独立造型（覆盖 scale/lean，追加配件方块与 idle 动画枢轴）
    addVoxelAccessory(g, kind, refRaw);
    g.userData.voxel = { phase: Math.random() * 6.28, kind, bob: V.bob, armBoost: kind === "hunter" ? 1.2 : kind === "licker" ? 0.7 : 1 };
  }

  // 体素方块人玩家（MC 史蒂夫风）：与 buildVoxelEnemy 同构（buildVoxelBody），蓝衣 Steve 配色。
  // VOXEL_PLAYER=true 时替换立绘。直立 lean=0，肩髋枢轴同敌，供同套动画。
  function buildVoxelPlayer(g) {
    buildVoxelBody(g, {
      bodyType: "standard",
      lean: 0.0,
      face: { kind: "player" }, // 正常青年脸（郑吒）+ 左脸刀疤
      bodyTex: makeBodyTextureMap("player", 0x3a5ba0), // 蓝衣衬衫纹理
      colors: {
        shirt: 0x3a5ba0, pants: 0x2a3450, skin: 0xd8a878, hair: 0x2a1f16,
        shoe: 0x1c1a1a, hand: 0xd8a878, foreZ: 0.0,
        waistW: 0.84, chestW: 0.92, headW: 0.6, torsoD: 0.5,
      },
    });
    g.scale.setScalar(1.15);   // 与敌人体素人同比例
    g.userData.voxel = { phase: Math.random() * 6.28, bob: 0.05, armBoost: 1 };
  }

  // =====================================================================
  // 体素配件系统 + 每怪独立造型表（VOXEL_VARIANTS）
  // 在 buildVoxelBody 通用段基础上，addVoxelAccessory 按 BOSS/kind 查表追加体素方块配件，
  // 挂到 U=upper 上身枢轴（头/背/肩）、AL/AR=左右肩枢轴（手武器随臂摆）、H=头部枢轴（头饰随头，适配各体型头高）。
  // 顶点数有界：每怪 +3~10 个方块；材质/几何随 g 进入 dispose 遍历自动释放；零外部依赖。
  // 条目 schema：{ A, w,h,d, c, x,y,z, glow?, rot?, anim? }；anim='tail'|'tent'|'wing' 做 idle 摆动。
  // =====================================================================
  const VOXEL_VARIANTS = {
    // —— 三角头：大三角金属头盔(头枢轴 H) + 巨刀（AR 手）——
    sanjiaotou: { sc: 1.16, bodyType: "giant", extraLean: 0.06, parts: [
      { A: "H", w: 0.86, h: 0.34, d: 0.86, c: 0x9aa2ad, x: 0, y: 0.38, z: 0 },     // 头盔底座（宽）
      { A: "H", w: 0.60, h: 0.30, d: 0.60, c: 0xaeb6c2, x: 0, y: 0.64, z: 0 },     // 盔身（中收）
      { A: "H", w: 0.32, h: 0.30, d: 0.32, c: 0x9aa2ad, x: 0, y: 0.90, z: 0 },     // 盔顶（收窄）
      { A: "H", w: 0.12, h: 0.26, d: 0.12, c: 0x5a4a44, x: 0, y: 1.18, z: 0 },     // 顶锥帽
      { A: "H", w: 0.54, h: 0.10, d: 0.74, c: 0x6a6670, x: 0, y: 0.50, z: 0.42 },  // 面罩（前探头）
      { A: "AR", w: 0.10, h: 0.52, d: 0.10, c: 0x2a2320, x: 0.02, y: -0.98, z: 0.08 },  // 巨刀柄
      { A: "AR", w: 0.18, h: 1.55, d: 0.05, c: 0xcfd6e0, x: 0.02, y: -1.75, z: 0.08 },  // 巨刀刃
      { A: "AR", w: 0.10, h: 0.55, d: 0.05, c: 0x93a0b0, x: 0.02, y: -2.55, z: 0.08 },  // 刃尖
    ] },
    // —— 异形皇后：beast 体型 + 加长后脑/内齿(头枢轴 H) + 尾刃 + 骨刺背 ——
    yiy_queen: { sc: 1.28, bodyType: "beast", extraLean: -0.04, parts: [
      { A: "H", w: 0.52, h: 0.16, d: 0.72, c: 0x282830, x: 0, y: 0.10, z: -0.42 },  // 长后脑（向后延伸）
      { A: "H", w: 0.56, h: 0.10, d: 0.30, c: 0x383844, x: 0, y: 0.20, z: -0.55 },  // 后脑冠
      { A: "H", w: 0.22, h: 0.12, d: 0.10, c: 0x1a1a20, x: 0, y: -0.22, z: 0.30 },  // 内齿上（小牙）
      { A: "H", w: 0.48, h: 0.10, d: 0.10, c: 0x22222a, x: 0, y: -0.32, z: 0.20 },  // 下颌骨刃
      { A: "H", w: 0.10, h: 0.08, d: 0.14, c: 0xd8d8c8, x: 0, y: -0.20, z: 0.34 },  // 外露内齿（白）
      { A: "U", w: 0.14, h: 0.66, d: 0.14, c: 0x2a2a32, x: 0, y: 0.55, z: -0.72, anim: "tail" },  // 尾刃柄
      { A: "U", w: 0.06, h: 0.15, d: 0.15, c: 0xd8d8c8, x: 0, y: 0.5, z: 0, anim: "tail" },      // 尾尖刃（随尾）
      { A: "U", w: 0.10, h: 0.22, d: 0.10, c: 0x6a6a78, x: 0, y: 1.02, z: -0.22 },  // 背骨刺1
      { A: "U", w: 0.08, h: 0.18, d: 0.08, c: 0x6a6a78, x: 0, y: 1.16, z: -0.30 },  // 背骨刺2
      { A: "U", w: 0.06, h: 0.14, d: 0.06, c: 0x6a6a78, x: 0, y: 1.28, z: -0.36 },  // 背骨刺3
    ] },
    // —— 脑虫：obese 肥胖脑体 + 头枢轴发光 + 触须 ——
    brain_bug: { sc: 1.05, bodyType: "obese", extraLean: 0.10, parts: [
      { A: "U", w: 1.12, h: 0.55, d: 0.98, c: 0xa89098, x: 0, y: 0.10, z: 0 },      // 肥大脑体（加宽胸）
      { A: "H", w: 0.60, h: 0.10, d: 0.60, c: 0xc0a0b0, x: 0, y: 0.42, z: -0.02, glow: 0x8e2f8f }, // 脑顶发光
      { A: "H", w: 0.10, h: 0.42, d: 0.10, c: 0x7a6a72, x: -0.55, y: -0.30, z: 0.2, anim: "tent" }, // 触须左
      { A: "H", w: 0.10, h: 0.46, d: 0.10, c: 0x7a6a72, x: 0.55, y: -0.30, z: 0.2, anim: "tent" },  // 触须右
      { A: "H", w: 0.10, h: 0.38, d: 0.10, c: 0x6a5a62, x: -0.42, y: -0.22, z: -0.1, anim: "tent" }, // 触须左右
      { A: "H", w: 0.10, h: 0.40, d: 0.10, c: 0x6a5a62, x: 0.42, y: -0.22, z: -0.1, anim: "tent" },  // 触须右后
      { A: "H", w: 0.10, h: 0.30, d: 0.10, c: 0x7a6a72, x: 0.06, y: -0.26, z: 0.38, anim: "tent" },  // 触须前
    ] },
    // —— 弗莱迪（梦魇）：宽檐帽(头枢轴 H) + 刀爪 + 烧伤脸（脸纹理在 buildVoxelEnemy）——
    fulaidi: { sc: 1.12, bodyType: "standard", extraLean: 0.06, parts: [
      { A: "H", w: 0.94, h: 0.06, d: 0.94, c: 0x3a2a20, x: 0, y: 0.38, z: 0 },     // 宽檐帽檐
      { A: "H", w: 0.52, h: 0.26, d: 0.52, c: 0x3a2a20, x: 0, y: 0.50, z: 0 },     // 帽冠
      { A: "H", w: 0.52, h: 0.10, d: 0.56, c: 0xd86a5a, x: 0, y: 0.44, z: 0 },     // 帽红带
      { A: "H", w: 0.60, h: 0.08, d: 0.12, c: 0x2a2a30, x: 0, y: 0.36, z: -0.22 }, // 帽檐折边（后翘）
      { A: "AR", w: 0.06, h: 0.22, d: 0.06, c: 0xd8dde4, x: -0.10, y: -0.88, z: 0.02 }, // 刀爪1
      { A: "AR", w: 0.06, h: 0.26, d: 0.06, c: 0xd8dde4, x: 0.00, y: -0.90, z: 0.02 },  // 刀爪2
      { A: "AR", w: 0.06, h: 0.22, d: 0.06, c: 0xd8dde4, x: 0.10, y: -0.88, z: 0.02 },  // 刀爪3
    ] },
    // —— 追踪者：巨汉体型(giant) + 触手 ——
    tyrant: { sc: 1.42, bodyType: "giant", extraLean: 0.00, parts: [
      { A: "U", w: 1.04, h: 0.22, d: 0.66, c: 0x4a4a55, x: 0, y: 0.78, z: 0 },     // 巨肩甲
      { A: "U", w: 0.88, h: 0.42, d: 0.58, c: 0x56565f, x: 0, y: 0.52, z: 0 },     // 巨胸甲
      { A: "H", w: 0.86, h: 0.10, d: 0.70, c: 0x3a3a44, x: 0, y: 0.12, z: 0 },     // 头带/眉骨
      { A: "U", w: 0.12, h: 0.60, d: 0.12, c: 0x8a4a4a, x: -0.6, y: 0.55, z: -0.3, anim: "tent" }, // 左触手
      { A: "U", w: 0.12, h: 0.56, d: 0.12, c: 0x8a4a4a, x: 0.6, y: 0.55, z: -0.3, anim: "tent" },  // 右触手
      { A: "U", w: 0.18, h: 0.16, d: 0.18, c: 0x56565f, x: -0.42, y: 0.90, z: 0.28, glow: 0x19439a }, // 左肩警示灯
      { A: "U", w: 0.18, h: 0.16, d: 0.18, c: 0x56565f, x: 0.42, y: 0.90, z: 0.28, glow: 0x19439a },  // 右肩警示灯
    ] },
    // —— 巴博萨：骷髅脸 + 海盗帽(头枢轴 H) + 弯刀 ——
    barbossa: { sc: 1.12, bodyType: "standard", extraLean: 0.10, parts: [
      { A: "H", w: 0.90, h: 0.06, d: 0.90, c: 0x4a4a5a, x: 0, y: 0.40, z: 0 },     // 船长帽底
      { A: "H", w: 0.52, h: 0.16, d: 0.52, c: 0x3a2a20, x: 0, y: 0.50, z: 0 },     // 帽冠
      { A: "H", w: 0.62, h: 0.06, d: 0.62, c: 0x2a2a30, x: 0, y: 0.40, z: 0.02, rot: [0, 0.6, 0] }, // 帽檐翘边
      { A: "H", w: 0.64, h: 0.10, d: 0.64, c: 0xc8c8bc, x: 0, y: 0.08, z: 0 },     // 骷髅脸盖（白）
      { A: "H", w: 0.14, h: 0.08, d: 0.10, c: 0x882222, x: -0.16, y: 0.06, z: 0.36, glow: 0xff2222 }, // 左眼凄红
      { A: "H", w: 0.14, h: 0.08, d: 0.10, c: 0x882222, x: 0.16, y: 0.06, z: 0.36, glow: 0xff2222 },  // 右眼凄红
      { A: "U", w: 0.84, h: 0.34, d: 0.10, c: 0x3a4450, x: 0, y: 0.10, z: 0.28 },  // 船长外套披身
      { A: "AR", w: 0.08, h: 0.26, d: 0.08, c: 0x2a2320, x: 0.03, y: -0.92, z: 0.06 }, // 弯刀柄
      { A: "AR", w: 0.16, h: 0.70, d: 0.04, c: 0xdfe4ea, x: 0.03, y: -1.62, z: 0.06, rot: [0, 0, 0.9] }, // 弯刀刃（圆弧）
    ] },
    // —— 龙：beast 体型 + 双角/鼻吻(头枢轴 H) + 双翼 + 长尾 + 四足 ——
    dragon: { sc: 1.35, bodyType: "beast", extraLean: 0.0, parts: [
      { A: "H", w: 0.14, h: 0.52, d: 0.14, c: 0xd8d0b0, x: -0.18, y: 0.34, z: 0.28, rot: [0.3, 0, -0.5] }, // 左角
      { A: "H", w: 0.14, h: 0.52, d: 0.14, c: 0xd8d0b0, x: 0.18, y: 0.34, z: 0.28, rot: [0.3, 0, 0.5] },  // 右角
      { A: "H", w: 0.52, h: 0.16, d: 0.10, c: 0x8a6a3a, x: 0, y: 0.12, z: 0.30 },  // 鼻吻（前伸）
      { A: "U", w: 0.90, h: 0.06, d: 0.30, c: 0x8a6a3a, x: 0, y: 0.62, z: -0.30, anim: "wing" },  // 左翼根
      { A: "U", w: 0.90, h: 0.06, d: 0.30, c: 0x8a6a3a, x: 0, y: 0.62, z: -0.30, anim: "wing" },  // 右翼根(共享锚点两片)
      { A: "U", w: 0.16, h: 0.14, d: 0.16, c: 0x9a7a4a, x: -0.5, y: 0.50, z: -0.34, anim: "tent" }, // 左翼膜（随翼扇）
      { A: "U", w: 0.16, h: 0.14, d: 0.16, c: 0x9a7a4a, x: 0.5, y: 0.50, z: -0.34, anim: "tent" },  // 右翼膜
      { A: "U", w: 0.14, h: 1.20, d: 0.14, c: 0x8a6a3a, x: 0, y: 0.45, z: -0.80, anim: "tail" },   // 长尾柄
      { A: "U", w: 0.26, h: 0.12, d: 0.10, c: 0xd8d0b0, x: 0, y: 0.45, z: -0.80, anim: "tail" },   // 尾尖骨刃
      { A: "U", w: 0.40, h: 0.40, d: 0.36, c: 0x6a4a2a, x: -0.30, y: 0.10, z: 0.32 }, // 左前足（四足）
      { A: "U", w: 0.40, h: 0.40, d: 0.36, c: 0x6a4a2a, x: 0.30, y: 0.10, z: 0.32 },  // 右前足
    ] },
    // —— 恶魔：beast 体型 + 双角/额焰印(头枢轴 H) + 蝠翼 + 尖尾 ——
    demon: { sc: 1.20, bodyType: "beast", extraLean: 0.05, parts: [
      { A: "H", w: 0.16, h: 0.44, d: 0.16, c: 0x5a2030, x: -0.18, y: 0.32, z: 0.24, rot: [0.25, 0, -0.6] }, // 左角
      { A: "H", w: 0.16, h: 0.44, d: 0.16, c: 0x5a2030, x: 0.18, y: 0.32, z: 0.24, rot: [0.25, 0, 0.6] },  // 右角
      { A: "U", w: 0.86, h: 0.06, d: 0.28, c: 0x3a1420, x: 0, y: 0.70, z: -0.26, anim: "wing" },  // 左蝠翼根
      { A: "U", w: 0.86, h: 0.06, d: 0.28, c: 0x3a1420, x: 0, y: 0.70, z: -0.26, anim: "wing" },  // 右蝠翼根
      { A: "U", w: 0.14, h: 0.06, d: 0.52, c: 0x6a2440, x: -0.55, y: 0.56, z: -0.3, anim: "tent" }, // 左翼膜扇
      { A: "U", w: 0.14, h: 0.06, d: 0.52, c: 0x6a2440, x: 0.55, y: 0.56, z: -0.3, anim: "tent" },  // 右翼膜扇
      { A: "U", w: 0.12, h: 0.10, d: 0.72, c: 0x5a2030, x: 0, y: 0.88, z: -0.42, anim: "tail" },   // 尖尾柄
      { A: "U", w: 0.12, h: 0.10, d: 0.12, c: 0xe0e0e0, x: 0, y: 0.88, z: -0.66, anim: "tail" },  // 尾尖刃
      { A: "H", w: 0.44, h: 0.08, d: 0.28, c: 0x3a1418, x: 0, y: 0.14, z: 0.16, glow: 0xff4466 },  // 额焰印
    ] },
    // —— 狼人：beast 体型 + 尖耳/狼吻(头枢轴 H) + 爪 + 弓背 ——
    werewolf: { sc: 1.18, bodyType: "beast", extraLean: -0.08, parts: [
      { A: "H", w: 0.12, h: 0.30, d: 0.12, c: 0x6a7178, x: -0.20, y: 0.30, z: 0.15, rot: [0, 0, -0.4] }, // 左尖耳
      { A: "H", w: 0.12, h: 0.30, d: 0.12, c: 0x6a7178, x: 0.20, y: 0.30, z: 0.15, rot: [0, 0, 0.4] },  // 右尖耳
      { A: "H", w: 0.46, h: 0.32, d: 0.22, c: 0x8a6a52, x: 0, y: -0.02, z: 0.30 },   // 狼吻（前伸突出）
      { A: "U", w: 0.70, h: 0.10, d: 0.46, c: 0x5a5f66, x: 0, y: 0.60, z: -0.30 },  // 弓背毛领
      { A: "AL", w: 0.06, h: 0.20, d: 0.06, c: 0xdfe4ea, x: -0.08, y: -0.86, z: 0.02 }, // 左爪1
      { A: "AL", w: 0.06, h: 0.18, d: 0.06, c: 0xdfe4ea, x: 0.00, y: -0.84, z: 0.02 },  // 左爪2
      { A: "AL", w: 0.06, h: 0.20, d: 0.06, c: 0xdfe4ea, x: 0.08, y: -0.86, z: 0.02 },  // 左爪3
      { A: "AR", w: 0.06, h: 0.20, d: 0.06, c: 0xdfe4ea, x: -0.08, y: -0.86, z: 0.02 }, // 右爪1
      { A: "AR", w: 0.06, h: 0.18, d: 0.06, c: 0xdfe4ea, x: 0.00, y: -0.84, z: 0.02 },  // 右爪2
      { A: "AR", w: 0.06, h: 0.20, d: 0.06, c: 0xdfe4ea, x: 0.08, y: -0.86, z: 0.02 },  // 右爪3
    ] },
    // —— 石魔像：giant 体型 + 巨石方块身 + 裂纹 + 石巨头(头枢轴 H) ——
    golem: { sc: 1.30, bodyType: "giant", extraLean: 0.0, parts: [
      { A: "U", w: 0.98, h: 0.72, d: 0.70, c: 0x8a8a82, x: 0, y: 0.42, z: 0 },     // 巨石胸
      { A: "U", w: 0.90, h: 0.20, d: 0.62, c: 0x9a9a92, x: 0, y: 0.80, z: 0.02 },  // 巨石肩
      { A: "U", w: 0.66, h: 0.20, d: 0.60, c: 0x8a8a82, x: 0, y: 0.0, z: 0.02 },   // 石腰箍
      { A: "U", w: 0.06, h: 0.62, d: 0.06, c: 0x3a3a34, x: -0.2, y: 0.5, z: 0.02, rot: [0, 0, 0.3] }, // 裂纹1
      { A: "U", w: 0.06, h: 0.08, d: 0.06, c: 0x3a3a34, x: 0.16, y: 0.66, z: 0.02, rot: [0, 0, -0.5] }, // 裂纹2
      { A: "U", w: 0.30, h: 0.16, d: 0.30, c: 0x6a6a62, x: -0.4, y: 0.34, z: 0.04, rot: [0, 0, 0.2] },  // 左肩碎石
      { A: "U", w: 0.30, h: 0.16, d: 0.30, c: 0x6a6a62, x: 0.4, y: 0.34, z: 0.04, rot: [0, 0, -0.2] },  // 右肩碎石
      { A: "H", w: 0.64, h: 0.20, d: 0.64, c: 0x9a9a92, x: 0, y: 0.34, z: 0 },     // 石巨头
    ] },
    // —— 触手怪：slender 细长体型 + 发光主眼(头枢轴 H) + 多触手 ——
    tentacle: { sc: 1.10, bodyType: "slender", extraLean: -0.05, parts: [
      { A: "U", w: 0.90, h: 0.40, d: 0.80, c: 0x7a5a6a, x: 0, y: 0.28, z: 0 },     // 肥体
      { A: "H", w: 0.26, h: 0.10, d: 0.26, c: 0x2a2030, x: 0, y: 0.28, z: 0, glow: 0xff5522 }, // 主眼（发光）
      { A: "U", w: 0.12, h: 0.72, d: 0.12, c: 0x6a4a5a, x: -0.62, y: 0.34, z: 0.1, anim: "tent" }, // 触手1
      { A: "U", w: 0.12, h: 0.68, d: 0.12, c: 0x6a4a5a, x: 0.62, y: 0.34, z: 0.1, anim: "tent" },  // 触手2
      { A: "U", w: 0.12, h: 0.80, d: 0.12, c: 0x5a3a4a, x: -0.4, y: 0.40, z: -0.2, anim: "tent" },  // 触手3
      { A: "U", w: 0.12, h: 0.76, d: 0.12, c: 0x5a3a4a, x: 0.4, y: 0.40, z: -0.2, anim: "tent" },   // 触手4
      { A: "U", w: 0.12, h: 0.62, d: 0.12, c: 0x6a4a5a, x: 0.0, y: 0.42, z: -0.42, anim: "tent" },  // 触手5（背）
      { A: "U", w: 0.12, h: 0.58, d: 0.12, c: 0x6a4a5a, x: -0.66, y: 0.40, z: -0.1, anim: "tent" }, // 触手6
      { A: "U", w: 0.12, h: 0.60, d: 0.12, c: 0x6a4a5a, x: 0.66, y: 0.40, z: -0.1, anim: "tent" },  // 触手7
    ] },
    // —— 亡灵/骷髅：standard 体型 + 骷髅头(头枢轴 H) + 骨手 ——
    undead: { sc: 1.15, bodyType: "standard", extraLean: 0.08, parts: [
      { A: "H", w: 0.66, h: 0.12, d: 0.66, c: 0xcfc9b8, x: 0, y: 0.30, z: 0 },     // 骷髅头盖
      { A: "H", w: 0.58, h: 0.14, d: 0.60, c: 0xc8c2b0, x: 0, y: 0.04, z: 0.12 },  // 白颧骨
      { A: "H", w: 0.34, h: 0.14, d: 0.12, c: 0x2a2a30, x: 0, y: 0.00, z: 0.34 },  // 黑眼窝
      { A: "AL", w: 0.10, h: 0.44, d: 0.10, c: 0xe0dbc8, x: 0, y: -0.60, z: 0.02 }, // 左骨前臂/手
      { A: "AR", w: 0.10, h: 0.44, d: 0.10, c: 0xe0dbc8, x: 0, y: -0.60, z: 0.02 }, // 右骨手
      { A: "U", w: 0.78, h: 0.44, d: 0.10, c: 0x4a3a32, x: 0, y: 0.1, z: -0.28 },   // 破布披风（背）
    ] },
    // —— 通用 kind 兜底配件（守卫=头盔(头枢轴 H)／猎手=爪刃／舔舐者=长舌）——
    guard: { sc: 1.15, bodyType: "standard", extraLean: 0.16, parts: [
      { A: "H", w: 0.66, h: 0.16, d: 0.66, c: 0x55606e, x: 0, y: 0.32, z: 0 },     // 半圆头盔
      { A: "H", w: 0.26, h: 0.44, d: 0.26, c: 0x3a4a58, x: 0, y: 0.58, z: 0 },     // 头盔冠脊
      { A: "H", w: 0.64, h: 0.08, d: 0.08, c: 0xcfd6e0, x: 0, y: 0.06, z: 0.34 },  // 护目/面罩亮条
    ] },
    hunter: { bodyType: "tall_thin", extraLean: -0.10, parts: [
      { A: "AR", w: 0.08, h: 0.30, d: 0.08, c: 0xdfe4ea, x: -0.10, y: -0.84, z: 0.02 }, // 爪刃
      { A: "AR", w: 0.08, h: 0.34, d: 0.08, c: 0xdfe4ea, x: 0.02, y: -0.88, z: 0.02 },  // 爪刃中
      { A: "AR", w: 0.08, h: 0.30, d: 0.08, c: 0xdfe4ea, x: 0.14, y: -0.84, z: 0.02 },  // 爪刃
      { A: "AL", w: 0.08, h: 0.30, d: 0.08, c: 0xdfe4ea, x: -0.10, y: -0.84, z: 0.02 },
      { A: "AL", w: 0.08, h: 0.34, d: 0.08, c: 0xdfe4ea, x: 0.02, y: -0.88, z: 0.02 },
      { A: "AL", w: 0.08, h: 0.30, d: 0.08, c: 0xdfe4ea, x: 0.14, y: -0.84, z: 0.02 },
    ] },
    licker: { bodyType: "slender", extraLean: 0.58, parts: [
      { A: "U", w: 0.14, h: 0.10, d: 0.62, c: 0x8a4a5a, x: 0, y: 0.90, z: 0.5, rot: [-0.35, 0, 0], anim: "tent" }, // 长舌（前伸）
    ] },
  };

  // 查表：优先原始 ref 特征命中 BOSS，再回退归一 kind。未匹配返回 null（保留通用段）。
  function resolveVoxelVariant(kind, refRaw) {
    const r = String(refRaw || "").toLowerCase();
    if (/sanjiao|三角头|三角|sjt|pyramid/.test(r)) return "sanjiaotou";
    if (/yiy_|异形皇后|queen/.test(r)) return "yiy_queen";
    if (/brain|脑虫|naochong/.test(r)) return "brain_bug";
    if (/fula|梦魇|弗莱迪|freddy|dream/.test(r)) return "fulaidi";
    if (/tyrant|追踪者|追迹者|追赠/.test(r)) return "tyrant";
    if (/barbossa|巴博萨|海盗/.test(r)) return "barbossa";
    if (/dragon|龙/.test(r)) return "dragon";
    if (/demon|恶魔/.test(r)) return "demon";
    if (/werew|狼人/.test(r)) return "werewolf";
    if (/golem|石魔像|魔像/.test(r)) return "golem";
    if (/tentacle|触手/.test(r)) return "tentacle";
    if (/undead|骷髅|skeleton|亡灵/.test(r)) return "undead";
    if (VOXEL_VARIANTS.hasOwnProperty(kind)) return kind; // guard/hunter/licker... 通用 kind 兜底
    return null;
  }

  // 体素配件系统：在通用段基础上按 BOSS/kind 追加造型方块（挂点在 rig 枢轴）
  function addVoxelAccessory(g, kind, refRaw) {
    const rig = (g.userData && g.userData.rig) || null;
    const vk = resolveVoxelVariant(kind, refRaw);
    const variant = vk ? VOXEL_VARIANTS[vk] : null;
    if (!variant) return;                       // 未匹配 → 保留通用段
    if (rig && variant.extraLean) {
      rig.baseLean = (rig.baseLean || 0) + variant.extraLean;
      rig.upper.rotation.x = rig.baseLean;
    }
    if (variant.sc) g.scale.setScalar(variant.sc);
    if (rig) {
      rig.variant = vk;
      rig.animParts = { tail: [], tent: [], wing: [] };
    }
    const boxAt = (parent, p) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(p.w, p.h, p.d), new THREE.MeshLambertMaterial({ color: p.c }));
      m.position.set(p.x, p.y, p.z);
      if (p.rot) { m.rotation.set(p.rot[0], p.rot[1], p.rot[2]); }
      if (p.glow !== undefined) { m.material.emissive = new THREE.Color(p.glow); m.material.emissiveIntensity = 1.0; }
      m.castShadow = true; m.receiveShadow = true;
      parent.add(m);
      return m;
    };
    (variant.parts || []).forEach(p => {
      const host = p.A === "AR" ? (rig && rig.armR)
        : p.A === "AL" ? (rig && rig.armL)
        : p.A === "H" ? (rig && rig.head)
        : (rig && rig.upper);
      if (!host) return;
      if (p.anim) {
        const grp = new THREE.Group();
        grp.position.set(p.x, p.y, p.z);
        grp.userData.base = (p.rot || [0, 0, 0]).slice();
        grp.userData.ph = Math.random() * 6.28;
        host.add(grp);
        boxAt(grp, { w: p.w, h: p.h, d: p.d, c: p.c, x: 0, y: -p.h / 2, z: 0, glow: p.glow });
        rig.animParts[p.anim].push(grp);
      } else {
        boxAt(host, p);
      }
    });
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

  // 体素人程序化动画（敌我同套；onAction 语义不变，纯视觉。每帧绝对赋值覆盖，不累积）：
  //   呼吸——upper 起伏+轻点头；行走——四肢对侧摆（前摆>后摆）、肘/膝屈伸、身体左右微晃；
  //   待机——头部转头环顾；攻击——三段（起手蓄力拉身后仰→前挥横扫→收招回位）；
  //   特殊怪 idle——尾摆 tail / 触手蠕动 tent / 蝠翼扇动 wing。rig 由 buildVoxelBody 提供。
  function animateRig(rig, t, walk, attack) {
    const moving = walk > 0.8;
    const sp = t * 0.018 * walk;
    const breath = Math.sin(t * 0.0017);
    rig.upper.position.y = breath * 0.035;
    rig.upper.rotation.z = Math.sin(sp) * 0.03;
    const ph = Math.sin(sp);
    const ls = moving ? ph * 0.46 : ph * 0.10;
    rig.legL.rotation.x = ls;
    rig.legR.rotation.x = -ls;
    const as = moving ? 0.86 : 0.20;
    rig.armL.rotation.x = -ls * 0.80 + (moving ? 0.14 : 0.02);
    rig.armR.rotation.x = ls * 0.80 + (moving ? 0.14 : 0.02);
    if (rig.elbowL) rig.elbowL.rotation.x = (moving ? 0.28 : 0.14) - ls * 0.22;
    if (rig.elbowR) rig.elbowR.rotation.x = (moving ? 0.28 : 0.14) + ls * 0.22;
    if (rig.kneeL) rig.kneeL.rotation.x = Math.max(0, ls * 0.45);
    if (rig.kneeR) rig.kneeR.rotation.x = Math.max(0, -ls * 0.45);
    if (moving) rig.upper.rotation.z += Math.sin(sp * 0.5) * 0.04;
    if (rig.head && attack <= 0) {
      rig.head.rotation.y = Math.sin(t * 0.4) * 0.14;
      rig.head.rotation.x = breath * 0.03;
    }
    const baseX = rig.baseLean || 0;
    if (attack > 0) {
      const a = Math.min(1, attack);
      if (a > 0.78) {
        rig.upper.rotation.x = baseX + 0.20;
        rig.armR.rotation.x = -2.15; rig.armR.rotation.y = -0.18;
        rig.armL.rotation.x = 0.5;  rig.armL.rotation.y = 0.10;
        if (rig.elbowR) rig.elbowR.rotation.x = -0.65;
        if (rig.head) { rig.head.rotation.y = -0.15; rig.head.rotation.x = 0.10; }
      } else if (a > 0.30) {
        const k = (a - 0.30) / 0.48;
        rig.upper.rotation.x = baseX - 0.16 * k;
        rig.armR.rotation.x = 2.35 - 0.5 * (1 - k); rig.armR.rotation.y = 0.16;
        rig.armL.rotation.x = 0.34 - 0.18 * k; rig.armL.rotation.y = 0;
        if (rig.elbowR) rig.elbowR.rotation.x = -0.12 + 0.2 * k;
        if (rig.head) { rig.head.rotation.y = 0.12; rig.head.rotation.x = -0.12; }
      } else {
        const k = a / 0.30;
        rig.upper.rotation.x = baseX;
        rig.armR.rotation.x = 0.5 * k; rig.armR.rotation.y = 0;
        rig.armL.rotation.x = -0.2 * k; rig.armL.rotation.y = 0;
        if (rig.elbowR) rig.elbowR.rotation.x = 0.2 * k;
      }
    } else {
      rig.upper.rotation.x = baseX;
    }
    const ap = rig.animParts;
    if (ap) {
      const a = t * 15;
      ap.tail.forEach((grp) => {
        grp.rotation.x = (grp.userData.base[0] || 0) + Math.sin(a + grp.userData.ph) * 0.30;
        grp.rotation.z = (grp.userData.base[2] || 0) + Math.sin(a * 0.6 + grp.userData.ph) * 0.18;
      });
      ap.tent.forEach((grp) => {
        grp.rotation.z = (grp.userData.base[2] || 0) + Math.sin(a * 1.3 + grp.userData.ph) * 0.45;
        grp.rotation.x = (grp.userData.base[0] || 0) + Math.sin(a + grp.userData.ph * 1.7) * 0.35;
      });
      ap.wing.forEach((grp) => {
        grp.rotation.z = (grp.userData.base[2] || 0) + Math.sin(a * 0.8 + grp.userData.ph) * 0.30;
      });
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

  // ============================ 装备体系 · 细分特效实现 ============================

  // 武器细分特效分发：先按 WEAPON_FX 命中具体武器变体，未命中回退大类默认。
  // onAction 语义不变：attack 仍照常触发（特效仅纯视觉）。命中细分时额外叠加法宝/技能流派特效。
  function weaponFxFor(key) {
    switch (key) {
      case "weapons_bloodscythe": bloodScytheFx(); break;  // 血色/暗红镰风（melee）
      case "weapons_swordarray":  swordArrayFx();  break;  // 青色剑阵（多道小剑气）
      case "weapons_taixu":       taixuFx();       break;  // 青色仙侠剑气
      case "weapons_nanowhip":    nanowhipFx();    break;  // 绿色纳米切割线
      case "weapons_quantum":     quantumFx();     break;  // 蓝紫色量子粒子（magic）
      case "weapons_gravity":     gravityFx();     break;  // 紫色引力坍缩球（magic）
      case "weapons_causality":   causalityFx();   break;  // 因果律光（magic）
      case "weapons_rail":        railFx();        break;  // 蓝色电磁轨道光束（laser）
      case "weapons_swordqi":     taixuFx(0xb8c8ff); break;// 本命/秋水神剑→青白剑意
      default: return false;
    }
    return true;
  }

  // 攻击特效分发：按当前武器细分 → 大类；随后按装配法宝 + 已学技能流派叠加附加特效。
  // 命中细分变体时只走细分；未命中则保留原 5 类大类默认特效（行为/契约不变）。
  function runAttackFx() {
    const fk = weaponFxFor(weaponFxKey);
    if (!fk) {
      switch (curWeaponStyle) {
        case "gun":   shootFx(); break;
        case "laser": beamFx();  break;
        case "magic": magicFx(); break;
        case "melee": swingFx(); break;   // 刀战/剑/斧/镰/鞭 → 保留 swingFx 弧形刀光
        default:      punchFx(); break;   // unarmed → 拳击
      }
    }
    // 法宝附加（装配 & 命中代表型法宝时叠加对应法宝技特效）
    curFxTreasure.forEach(tid => treasureFxFor(tid));
    // 技能流派附加（已学流派 → 攻击时叠加流派气流特效）
    skillSchools(curSkills).forEach(skKey => schoolStreamFx(skKey));
  }

  // ---------- 血戮剑/破军重镰：血色弧光镰风（melee 变体，红色刀光 + 血色粒子） ----------
  function bloodScytheFx() {
    if (!player) return;
    const c = document.createElement("canvas"); c.width = c.height = 128;
    const ctx = c.getContext("2d");
    const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
    g.addColorStop(0, "rgba(255,215,215,.92)");
    g.addColorStop(0.5, "rgba(214,40,64,.6)");
    g.addColorStop(1, "rgba(120,10,30,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(64, 64, 60, -1.15, 1.15); ctx.closePath(); ctx.fill();
    const tex = new THREE.CanvasTexture(c);
    const arc = new THREE.Mesh(
      new THREE.PlaneGeometry(2.3, 2.3),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide })
    );
    const dir = { x: Math.sin(yaw), z: Math.cos(yaw) };
    arc.position.set(PX.x + dir.x * 1.5, 1.7, PX.z + dir.z * 1.5);
    arc.rotation.y = -yaw;
    scene.add(arc);
    const glow = glowSprite(0xff4d6d, 2.6);
    glow.position.copy(arc.position);
    scene.add(glow);
    let t = 0;
    const anim = () => {
      t += 0.08;
      arc.scale.setScalar(1 + t * 1.8);
      arc.material.opacity = Math.max(0, 1 - t * 2.2);
      arc.position.x += dir.x * 0.18; arc.position.z += dir.z * 0.18;
      glow.position.set(arc.position.x, arc.position.y, arc.position.z);
      glow.material.opacity = Math.max(0.1, 1 - t * 1.8);
      glow.scale.setScalar(1 + t * 2.0);
      if (t < 0.55) requestAnimationFrame(anim);
      else { scene.remove(arc); arc.material.dispose(); tex.dispose(); scene.remove(glow); glow.material.dispose(); }
    };
    anim();
    const hit = enemy ? { x: enemy.position.x, y: 1.4, z: enemy.position.z }
                      : { x: PX.x + dir.x * 2.6, y: 1.4, z: PX.z + dir.z * 2.6 };
    spawnSpark(hit, 0xff5f7a, 10);
  }

  // ---------- 诛仙剑阵盘：青色剑阵（多道小剑气朝敌人扇形飞出） ----------
  function swordArrayFx() {
    if (!player) return;
    const dir = { x: Math.sin(yaw), z: Math.cos(yaw) };
    const from = { x: PX.x + dir.x * 0.9, y: 1.7, z: PX.z + dir.z * 0.9 };
    const to = enemy
      ? { x: enemy.position.x, y: 1.4, z: enemy.position.z }
      : { x: PX.x + dir.x * 4, y: 1.4, z: PX.z + dir.z * 4 };
    // 阵法光阵（贴地青色阵盘）
    const disc = new THREE.Mesh(
      new THREE.RingGeometry(0.5, 1.5, 32),
      new THREE.MeshBasicMaterial({ color: 0x36d6b8, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })
    );
    disc.rotation.x = -Math.PI / 2;
    disc.position.set(from.x, 0.05, from.z);
    scene.add(disc);
    // 多道小剑气（薄青刃，扇形朝敌人）
    const counts = 6;
    const swords = [];
    for (let i = 0; i < counts; i++) {
      const sw = new THREE.Mesh(
        new THREE.PlaneGeometry(0.22, 1.4),
        new THREE.MeshBasicMaterial({ color: 0x57ffe0, transparent: true, opacity: 0.95, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })
      );
      const off = (i / (counts - 1) - 0.5) * 1.3; // 扇形横向偏移
      const nx = from.x + dir.x * 1.0 - dir.z * off;
      const nz = from.z + dir.z * 1.0 + dir.x * off;
      sw.position.set(nx, 1.6, nz);
      sw.rotation.y = -yaw + off * 0.22;
      scene.add(sw);
      swords.push({ m: sw, dx: 0, dz: 0 });
    }
    const glow = glowSprite(0x3dffcf, 2.2);
    glow.position.set(from.x, 1.6, from.z); scene.add(glow);
    let t = 0;
    const anim = () => {
      t += 0.05;
      disc.scale.setScalar(1 + t * 2.4);
      disc.material.opacity = Math.max(0, 0.55 - t * 1.4);
      swords.forEach(s => {
        s.m.position.x += dir.x * 0.3;
        s.m.position.z += dir.z * 0.3;
        s.m.material.opacity = Math.max(0, 0.95 - t * 2.0);
      });
      glow.material.opacity = Math.max(0.1, 1 - t * 1.6);
      glow.scale.setScalar(1 + t * 1.9);
      if (t < 0.6) requestAnimationFrame(anim);
      else {
        scene.remove(disc); disc.geometry.dispose(); disc.material.dispose();
        swords.forEach(s => { scene.remove(s.m); s.m.geometry.dispose(); s.m.material.dispose(); });
        scene.remove(glow); glow.material.dispose();
      }
    };
    anim();
    spawnSpark(to, 0x57ffe0, 12);
  }

  // ---------- 太虚神剑 / 本命神剑：青色仙侠剑气（细长剑光 + 纵向穿透） ----------
  function taixuFx(edge = 0x66ecff) {
    if (!player) return;
    const dir = { x: Math.sin(yaw), z: Math.cos(yaw) };
    const c = document.createElement("canvas"); c.width = c.height = 64;
    const ctx = c.getContext("2d");
    const g = ctx.createLinearGradient(0, 0, 64, 0);
    g.addColorStop(0, "rgba(255,255,255,0)");
    g.addColorStop(0.5, "rgba(255,255,255,.9)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 20, 64, 24);
    const tex = new THREE.CanvasTexture(c);
    const beam = new THREE.Mesh(
      new THREE.PlaneGeometry(2.4, 0.34),
      new THREE.MeshBasicMaterial({ map: tex, color: edge, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })
    );
    beam.position.set(PX.x + dir.x * 1.6, 1.75, PX.z + dir.z * 1.6);
    beam.rotation.y = -yaw;
    scene.add(beam);
    const glow = glowSprite(edge, 2.4);
    glow.position.copy(beam.position); scene.add(glow);
    let t = 0;
    const anim = () => {
      t += 0.07;
      beam.scale.set(1 + t * 2.2, 1, 1);
      beam.material.opacity = Math.max(0, 1 - t * 2.4);
      beam.position.x += dir.x * 0.3; beam.position.z += dir.z * 0.3;
      glow.position.set(beam.position.x, beam.position.y, beam.position.z);
      glow.material.opacity = Math.max(0.12, 1 - t * 1.6);
      glow.scale.setScalar(1 + t * 1.9);
      if (t < 0.5) requestAnimationFrame(anim);
      else { scene.remove(beam); beam.geometry.dispose(); beam.material.dispose(); tex.dispose(); scene.remove(glow); glow.material.dispose(); }
    };
    anim();
  }

  // ---------- 纳米切割鞭：绿色纳米切割线（高速绿刃切割闪线） ----------
  function nanowhipFx() {
    if (!player) return;
    const dir = { x: Math.sin(yaw), z: Math.cos(yaw) };
    const to = enemy
      ? { x: enemy.position.x, y: 1.4, z: enemy.position.z }
      : { x: PX.x + dir.x * 3.2, y: 1.5, z: PX.z + dir.z * 3.2 };
    // 绿色纳米切割线（细长扁刃 + 锋芒端光点）
    const line = new THREE.Mesh(
      new THREE.PlaneGeometry(3.0, 0.12),
      new THREE.MeshBasicMaterial({ color: 0x5cff8a, transparent: true, opacity: 0.95, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })
    );
    const mx = (PX.x + to.x) / 2, mz = (PX.z + to.z) / 2;
    line.position.set(mx, 1.55, mz);
    line.rotation.y = -yaw;
    scene.add(line);
    const tip = glowSprite(0x8affb0, 0.45);
    tip.position.set(to.x, 1.55, to.z); scene.add(tip);
    let t = 0;
    const anim = () => {
      t += 0.05;
      line.scale.set(1 + t * 0.8, 1 + Math.sin(t * 30) * 0.25, 1); // 切割振荡
      line.material.opacity = Math.max(0, 0.95 - t * 2.6);
      tip.material.opacity = Math.max(0, 1 - t * 3.2);
      tip.scale.setScalar(1 + t * 2.4);
      if (t < 0.42) requestAnimationFrame(anim);
      else { scene.remove(line); line.geometry.dispose(); line.material.dispose(); scene.remove(tip); tip.material.dispose(); }
    };
    anim();
    spawnSpark(to, 0x5cff8a, 9);
  }

  // ---------- 量子湮灭刀：蓝紫色量子粒子（magic 变体，粒子喷涌 + 湮灭爆闪） ----------
  function quantumFx() {
    if (!player) return;
    const dir = { x: Math.sin(yaw), z: Math.cos(yaw) };
    const from = { x: PX.x + dir.x * 0.8, y: 1.7, z: PX.z + dir.z * 0.8 };
    const to = enemy
      ? { x: enemy.position.x, y: 1.4, z: enemy.position.z }
      : { x: PX.x + dir.x * 4, y: 1.4, z: PX.z + dir.z * 4 };
    const orb = glowSprite(0x7c4dff, 0.8);
    orb.position.set(from.x, from.y, from.z); scene.add(orb);
    let t = 0, exploded = false;
    const ox = to.x - from.x, oy = to.y - from.y, oz = to.z - from.z;
    const anim = () => {
      t += 0.04;
      const k = Math.min(1, t * 1.7);
      orb.position.set(from.x + ox * k, from.y + oy * k, from.z + oz * k);
      orb.scale.setScalar(1 + Math.sin(t * 40) * 0.15); // 量子抖动
      if (k >= 1 && !exploded) {
        exploded = true;
        for (let i = 0; i < 22; i++) { // 蓝紫量子粒子（颜色在蓝/紫间跳跃）
          const m = new THREE.Mesh(
            new THREE.BoxGeometry(0.06 + Math.random() * 0.05, 0.06 + Math.random() * 0.05, 0.06 + Math.random() * 0.05),
            new THREE.MeshBasicMaterial({ color: i % 2 ? 0x7c4dff : 0x42aaff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
          );
          m.position.set(to.x, to.y, to.z);
          const a = Math.random() * 6.28, e = 0.6 + Math.random() * 1.0;
          scene.add(m);
          blood.push({ m, vx: Math.cos(a) * e, vy: 0.4 + Math.random() * 1.3, vz: Math.sin(a) * e, spin: (Math.random() - 0.5) * 1.4, life: 0, max: 0.3 + Math.random() * 0.2 });
        }
        const flash = glowSprite(0x7c4dff, 1.6);
        flash.position.set(to.x, to.y, to.z); scene.add(flash);
        setTimeout(() => { scene.remove(flash); flash.material.dispose(); }, 250);
      }
      orb.material.opacity = Math.max(0, 1 - Math.max(0, t - 0.5) * 3.2);
      if (t < 0.75) requestAnimationFrame(anim);
      else { scene.remove(orb); orb.material.dispose(); }
    };
    anim();
  }

  // ---------- 引力坍缩炮：紫色引力坍缩球（magic 变体，挤压收缩 + 拉伸弹道） ----------
  function gravityFx() {
    if (!player) return;
    const dir = { x: Math.sin(yaw), z: Math.cos(yaw) };
    const to = enemy
      ? { x: enemy.position.x, y: 1.4, z: enemy.position.z }
      : { x: PX.x + dir.x * 4, y: 1.4, z: PX.z + dir.z * 4 };
    const from = { x: PX.x + dir.x * 0.8, y: 1.6, z: PX.z + dir.z * 0.8 };
    const orb = glowSprite(0xb44dff, 1.0);
    orb.position.set(from.x, from.y, from.z); scene.add(orb);
    // 引力环（旋转紫环）
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.5, 0.03, 8, 24),
      new THREE.MeshBasicMaterial({ color: 0xcf8aff, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending })
    );
    ring.position.copy(orb.position); scene.add(ring);
    let t = 0;
    const ox = to.x - from.x, oy = to.y - from.y, oz = to.z - from.z;
    const anim = () => {
      t += 0.045;
      const k = Math.min(1, t * 1.5);
      orb.position.set(from.x + ox * k, from.y + oy * k, from.z + oz * k);
      ring.position.copy(orb.position);
      ring.rotation.y += 0.25; ring.rotation.x += 0.1;
      orb.scale.setScalar(1 + Math.sin(t * 22) * 0.18); // 引力脉动
      if (k >= 0.97) {
        // 坍缩：向敌压缩
        orb.scale.setScalar(Math.max(0.3, 1.2 - (t - 0.62) * 6));
        ring.scale.setScalar(Math.max(0.3, 1 - (t - 0.62) * 4));
      }
      orb.material.opacity = Math.max(0, 1 - Math.max(0, t - 0.55) * 3);
      ring.material.opacity = Math.max(0, 0.9 - Math.max(0, t - 0.55) * 3);
      if (t < 0.8) requestAnimationFrame(anim);
      else { scene.remove(orb); orb.material.dispose(); scene.remove(ring); ring.geometry.dispose(); ring.material.dispose(); }
    };
    anim();
    spawnSpark(to, 0xb44dff, 10);
  }

  // ---------- 因果律护身剑：因果律光（错位残影剑光 + 白金色因果线） ----------
  function causalityFx() {
    if (!player) return;
    const dir = { x: Math.sin(yaw), z: Math.cos(yaw) };
    const c = document.createElement("canvas"); c.width = c.height = 64;
    const ctx = c.getContext("2d");
    const g = ctx.createLinearGradient(0, 0, 64, 64);
    g.addColorStop(0, "rgba(255,255,255,0)");
    g.addColorStop(0.5, "rgba(255,255,255,.9)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 20, 64, 26);
    const tex = new THREE.CanvasTexture(c);
    const beams = [];
    const cols = [0xffffff, 0xd9c8ff, 0xaad7ff];
    for (let i = 0; i < 3; i++) { // 三道错位残影剑光
      const b = new THREE.Mesh(
        new THREE.PlaneGeometry(2.6, 0.26),
        new THREE.MeshBasicMaterial({ map: tex, color: cols[i], transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })
      );
      const lz = PX.z - (i - 1) * 0.22, lx = PX.x + (i - 1) * 0.22;
      b.position.set(lx + dir.x * 1.7, 1.8, lz + dir.z * 1.7);
      b.rotation.y = -yaw;
      scene.add(b); beams.push(b);
    }
    const glow = glowSprite(0xe0d0ff, 2.4);
    glow.position.set(PX.x + dir.x * 1.7, 1.8, PX.z + dir.z * 1.7); scene.add(glow);
    let t = 0;
    const anim = () => {
      t += 0.07;
      beams.forEach((b, i) => {
        b.position.x += dir.x * 0.24; b.position.z += dir.z * 0.24;
        b.material.opacity = Math.max(0, 0.9 - t * 2.2 - i * 0.06);
        b.scale.x = 1 + t * 2.0;
      });
      glow.material.opacity = Math.max(0.12, 1 - t * 1.8);
      glow.scale.setScalar(1 + t * 2.0);
      if (t < 0.5) requestAnimationFrame(anim);
      else {
        beams.forEach(b => { scene.remove(b); b.geometry.dispose(); b.material.dispose(); });
        tex.dispose(); scene.remove(glow); glow.material.dispose();
      }
    };
    anim();
  }

  // ---------- 电磁轨道狙击枪：蓝色电磁轨道光束 + 瞄准火花（laser 变体） ----------
  function railFx() {
    if (!player) return;
    const dir = { x: Math.sin(yaw), z: Math.cos(yaw) };
    const from = { x: PX.x, y: 1.6, z: PX.z };
    const to = enemy
      ? { x: enemy.position.x, y: 1.4, z: enemy.position.z }
      : { x: PX.x + dir.x * 4, y: 1.5, z: PX.z + dir.z * 4 };
    const dx = to.x - from.x, dy = to.y - from.y, dz = to.z - from.z;
    const dist = Math.max(0.5, Math.hypot(dx, dy, dz));
    const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2, z: (from.z + to.z) / 2 };
    const core = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, dist, 8),
      new THREE.MeshBasicMaterial({ color: 0x2f9fff, transparent: true, depthWrite: false })
    );
    core.position.set(mid.x, mid.y, mid.z);
    core.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx, dy, dz).normalize());
    scene.add(core);
    // 电磁弧光：外圈电光柱（蓝白渐变 additive）
    const halo = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.15, dist, 8),
      new THREE.MeshBasicMaterial({ color: 0x7ac7ff, transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending })
    );
    halo.position.copy(core.position); halo.quaternion.copy(core.quaternion);
    scene.add(halo);
    // 轨道枪口电弧闪烁
    const muzzle = glowSprite(0x8fd4ff, 0.7);
    muzzle.position.copy(from); scene.add(muzzle);
    let t = 0;
    const anim = () => {
      t += 0.016;
      const hold = Math.min(1, t / 0.32);
      const fade = Math.max(0, 1 - (t - 0.32) * 2.2);
      const op = Math.min(hold, fade);
      core.material.opacity = op;
      halo.material.opacity = 0.4 * op;
      muzzle.material.opacity = Math.max(0, 1 - t * 4);
      muzzle.scale.setScalar(1 + t * 6);
      if (t < 0.7) requestAnimationFrame(anim);
      else {
        scene.remove(core); core.geometry.dispose(); core.material.dispose();
        scene.remove(halo); halo.geometry.dispose(); halo.material.dispose();
        scene.remove(muzzle); muzzle.material.dispose();
      }
    };
    anim();
    spawnSpark(to, 0x8fd4ff, 10);
  }

  // ---------- 法宝特效（attack 时按装配法宝叠加；三类代表 → swordqi/shield/thunder） ----------
  function treasureFxFor(tid) {
    const spec = TREASURE_FX[tid];
    if (!spec) return;
    switch (spec.kind) {
      case "jianyi":  treasureSwordQiFx(); break;  // 诛仙剑意图 → 青剑意
      case "shield":  treasureShieldFx();  break;  // 太虚玄光镜 → 金玄光盾
      case "thunder": treasureThunderFx(); break;  // 神雷辟邪佩 → 雷光
      case "blood":   treasureSwordQiFx(0xff5f7a, 1.2); break; // 血煞战旗 → 红血煞
      case "mirror":  treasureShieldFx(0xffffff, 1.1); break;  // 锻心明镜 → 白光幕
      case "lifewheel": treasureLifewheelFx(); break; // 逆转生死盘 → 黑白生死轮
    }
  }

  // 青剑意：玩家身侧青色剑意气流（attack 时迸发）
  function treasureSwordQiFx(color = 0x6ee0ff, boost = 1) {
    if (!player) return;
    const dir = { x: Math.sin(yaw), z: Math.cos(yaw) };
    for (let i = 0; i < 8; i++) {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(0.14, 0.9),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })
      );
      const a = Math.random() * 6.28, r = 0.6 * boost + Math.random() * 0.3;
      m.position.set(PX.x + Math.cos(a) * r, 1.2 + Math.random() * 1.3, PX.z + Math.sin(a) * r);
      m.rotation.y = a + Math.PI / 2;
      m.userData = { a, t: 0, speed: 0.35 + Math.random() * 0.3 };
      scene.add(m);
      const anim = () => { // 剑意绕身旋转 + 上浮
        m.userData.t += 0.05;
        const k = m.userData.t;
        const ang = m.userData.a + k * 3;
        m.position.x = PX.x + Math.cos(ang) * r;
        m.position.z = PX.z + Math.sin(ang) * r;
        m.position.y += 0.06;
        m.material.opacity = Math.max(0, 0.9 - k * 1.6);
        if (k < 0.6) requestAnimationFrame(anim);
        else { scene.remove(m); m.geometry.dispose(); m.material.dispose(); }
      };
      anim();
    }
  }

  // 金玄光盾：玩家身侧金光护盾光华（attack 时迸发扩散）
  function treasureShieldFx(color = 0xffd36b, boost = 1) {
    if (!player) return;
    const shield = new THREE.Mesh(
      new THREE.SphereGeometry(1.5 * boost, 16, 12),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })
    );
    shield.position.set(PX.x, 1.6, PX.z);
    scene.add(shield);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.2 * boost, 0.05, 10, 28),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending })
    );
    ring.position.set(PX.x, 1.6, PX.z);
    ring.rotation.x = Math.PI / 2;
    scene.add(ring);
    let t = 0;
    const anim = () => {
      t += 0.04;
      shield.material.opacity = Math.max(0, 0.28 * (1 - t * 2.2));
      shield.scale.setScalar(1 + t * 0.6);
      ring.material.opacity = Math.max(0, 0.7 * (1 - t * 2.4));
      ring.rotation.z += 0.12;
      ring.scale.setScalar(1 + t * 0.9);
      if (t < 0.5) requestAnimationFrame(anim);
      else { scene.remove(shield); shield.geometry.dispose(); shield.material.dispose(); scene.remove(ring); ring.geometry.dispose(); ring.material.dispose(); }
    };
    anim();
  }

  // 雷光：神雷劈落（青色闪电光柱 + 迸射电花）
  function treasureThunderFx() {
    if (!player) return;
    const dir = { x: Math.sin(yaw), z: Math.cos(yaw) };
    const to = enemy
      ? { x: enemy.position.x, y: 1.4, z: enemy.position.z }
      : { x: PX.x + dir.x * 3.5, y: 1.4, z: PX.z + dir.z * 3.5 };
    const bolt = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.09, 4.4, 8),
      new THREE.MeshBasicMaterial({ color: 0x30d4ff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
    );
    bolt.position.set(to.x, 2.2, to.z);
    scene.add(bolt);
    const flash = glowSprite(0xa8ecff, 1.3);
    flash.position.set(to.x, 1.4, to.z); scene.add(flash);
    let t = 0;
    const anim = () => {
      t += 0.04;
      const hold = Math.min(1, t / 0.25);
      const fade = Math.max(0, 1 - (t - 0.25) * 4);
      bolt.material.opacity = Math.min(hold, fade);
      flash.material.opacity = Math.max(0, fade * 0.8);
      flash.scale.setScalar(1 + t * 2.5);
      if (t < 0.5) requestAnimationFrame(anim);
      else { scene.remove(bolt); bolt.geometry.dispose(); bolt.material.dispose(); scene.remove(flash); flash.material.dispose(); }
    };
    anim();
    spawnSpark(to, 0xa8ecff, 12);
  }

  // 逆转生死盘：黑白生死轮（attack 时浮现）
  function treasureLifewheelFx() {
    if (!player) return;
    const wheel = new THREE.Mesh(
      new THREE.RingGeometry(0.5, 1.0, 12),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })
    );
    wheel.position.set(PX.x, 1.6, PX.z);
    wheel.rotation.x = Math.PI / 2;
    scene.add(wheel);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.0, 0.04, 8, 22),
      new THREE.MeshBasicMaterial({ color: 0x7a8a9a, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending })
    );
    ring.position.copy(wheel.position);
    scene.add(ring);
    let t = 0;
    const anim = () => {
      t += 0.05;
      wheel.rotation.z += 0.18;
      ring.rotation.x += 0.12; ring.rotation.y += 0.12;
      ring.scale.setScalar(1 + t * 0.7);
      wheel.material.opacity = Math.max(0, 0.6 * (1 - t * 1.8));
      ring.material.opacity = Math.max(0, 0.7 * (1 - t * 1.8));
      if (t < 0.55) requestAnimationFrame(anim);
      else { scene.remove(wheel); wheel.geometry.dispose(); wheel.material.dispose(); scene.remove(ring); ring.geometry.dispose(); ring.material.dispose(); }
    };
    anim();
  }

  // ---------- 技能流派特效（attack 时按已学流派叠加，attack 附加） ----------
  function schoolStreamFx(schoolKey) {
    const spec = SCHOOL_STREAM[schoolKey];
    if (!spec || !player) return;
    const dir = { x: Math.sin(yaw), z: Math.cos(yaw) };
    // 流派气流：围绕玩家迸发的单色能量流（每流派一种色）
    const n = schoolKey === "meme" ? 10 : 8;
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(0.16, 0.5 + Math.random() * 0.5),
        new THREE.MeshBasicMaterial({ color: spec.color, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })
      );
      const a = Math.random() * 6.28, r = 0.5 + Math.random() * 0.5;
      m.position.set(PX.x + Math.cos(a) * r, 1.1 + Math.random() * 1.4, PX.z + Math.sin(a) * r);
      m.rotation.y = a;
      m.userData = { a, r, t: 0 };
      scene.add(m);
      const anim = () => {
        const u = m.userData;
        u.t += 0.05;
        const ang = u.a + u.t * (1.5 + (schoolKey === "meme" ? 1 : 0));
        m.position.x = PX.x + Math.cos(ang) * u.r;
        m.position.z = PX.z + Math.sin(ang) * u.r;
        m.position.y = 1.1 + u.t * 0.7 + Math.sin(u.t * 8) * 0.1;
        m.rotation.z = Math.sin(u.t * 20) * 0.3; // 失真抖动（meme 更剧烈）
        if (schoolKey === "meme") m.rotation.z *= 2;
        m.material.opacity = Math.max(0, 0.85 - u.t * 1.8);
        if (u.t < 0.5) requestAnimationFrame(anim);
        else { scene.remove(m); m.geometry.dispose(); m.material.dispose(); }
      };
      anim();
    }
    // 圣光特例：额外一道金色光柱朝上
    if (schoolKey === "holy") {
      const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.3, 3.6, 10),
        new THREE.MeshBasicMaterial({ color: 0xffe07a, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending })
      );
      pillar.position.set(PX.x, 2.0, PX.z);
      scene.add(pillar);
      let t = 0;
      const animP = () => {
        t += 0.05;
        pillar.material.opacity = Math.max(0, 0.35 * (1 - t * 2));
        if (t < 0.5) requestAnimationFrame(animP);
        else { scene.remove(pillar); pillar.geometry.dispose(); pillar.material.dispose(); }
      };
      animP();
    }
  }

  // ---------- 血统变身持续 aura（additive 光环，随 player 跟随；血统视觉差异） ----------
  function refreshBloodlineAura() {
    // 移除旧 aura（切换血统时重建）
    if (auraPoints) {
      try { scene.remove(auraPoints); auraPoints.geometry.dispose(); auraPoints.material.dispose(); } catch (e) {}
      auraPoints = null;
    }
    const spec = curBloodline ? BLOODLINE_AURAS[curBloodline] : null;
    if (!spec || !player) return;
    const n = spec.name === "angel" ? 30 : 24; // 天使光翼粒子更密
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 6.28 + Math.random() * 0.3;
      const r = 0.7 + Math.random() * 0.5;
      const h = 0.5 + Math.random() * 2.2;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = h;
      pos[i * 3 + 2] = Math.sin(a) * r;
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: spec.color, size: 0.16, transparent: true, opacity: 0.55,
      depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
      map: getGlowTex(), alphaTest: 0,
    });
    const pts = new THREE.Points(geom, mat);
    pts.position.set(player.position.x, 0, player.position.z);
    pts.userData = { spec: spec.name, seed: Math.random() * 100, baseN: n };
    scene.add(pts);
    auraPoints = pts;
  }
  function updateAura(dt) {
    if (!auraPoints || !player) return;
    auraPulse += dt;
    const spec = BLOODLINE_AURAS[curBloodline] || null;
    // 跟随玩家
    auraPoints.position.set(player.position.x, 0, player.position.z);
    const arr = auraPoints.geometry.attributes.position;
    const n = arr.count;
    const t = auraPulse;
    for (let i = 0; i < n; i++) {
      // 绕身旋转 + 上下浮动
      let a = (i / n) * 6.28 + t * (spec && spec.name === "demon" ? 0.7 : 0.4);
      let r = 0.7 + Math.sin(t * 1.3 + i * 0.7) * 0.25;
      let h = 0.5 + ((i % 5) / 5) * 2.2 + Math.sin(t * 1.1 + i * 0.5) * 0.2;
      arr.array[i * 3] = Math.cos(a) * r;
      arr.array[i * 3 + 1] = h;
      arr.array[i * 3 + 2] = Math.sin(a) * r;
    }
    arr.needsUpdate = true;
    // 天使光翼：额外呼吸亮度；机械义体：蓝光脉冲
    let op = 0.55 + Math.sin(t * 2.2) * 0.12;
    if (spec && spec.name === "cyber") op = 0.5 + Math.sin(t * 5) * 0.18;
    auraPoints.material.opacity = op;
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
    if (data && data.weapon !== undefined) {
      curWeaponStyle = resolveWeaponStyle(data.weapon);
      curWeaponId = data.weapon;
      // 武器细分：先查 WEAPON_FX 看命中具体武器变体，未命中留 null 走大类默认
      weaponFxKey = resolveWeaponFxKey(data.weapon);
    }
    // 装备体系附加：血统 aura / 法宝 / 技能流派（setData 路由传参）
    curBloodline = (data && data.bloodline) || null;
    curFxTreasure = Array.isArray(data && data.treasure) ? data.treasure : [];
    curSkills = Array.isArray(data && data.skills) ? data.skills : [];
    // 敌人模型
    if (enemy) scene.remove(enemy);
    if (data.kind === "fight" && data.enemy) {
      const kind = enemyKind(data.ref);
      const spec = ENEMY_SPRITES[kind] || ENEMY_SPRITES.zombie;
      const g = new THREE.Group();
      g.add(makeShadow(1.5));
      if (VOXEL_ENEMY) {
        // MC 体素方块人（纯视觉；配色/配件/体型由 buildVoxelEnemy 内定，refRaw 供 BOSS 识别）
        buildVoxelEnemy(g, kind, null, data.ref);
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
    refreshBloodlineAura(); // 血统 aura 需 player 就位后创建/重建
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
    if (auraPoints) { try { scene.remove(auraPoints); auraPoints.geometry.dispose(); auraPoints.material.dispose(); } catch (e) {} auraPoints = null; }
    curSkills = []; curFxTreasure = []; curBloodline = null; weaponFxKey = null;
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
          // 精细度：死亡散架感——四肢向外张开
          const dr = enemy.userData.rig;
          if (dr) {
            dr.armL.rotation.x = 1.5 * k; dr.armR.rotation.x = -1.5 * k;
            dr.legL.rotation.x = -0.9 * k; dr.legR.rotation.x = 0.9 * k;
            if (dr.elbowL) dr.elbowL.rotation.x = -0.4 * k;
            if (dr.elbowR) dr.elbowR.rotation.x = 0.4 * k;
            if (dr.kneeL) dr.kneeL.rotation.x = 0.5 * k;
            if (dr.kneeR) dr.kneeR.rotation.x = 0.5 * k;
          }
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
            // 受击甩头：头部随受击向外猛甩 + 回弹（配合躯干后仰）
            const ehead = enemy.userData.rig.head;
            if (ehead && h > 0) {
              const hk = 1 - Math.min(1, h * 3);
              ehead.rotation.x = -(0.35 + 0.25 * hk) + Math.sin(performance.now() / 90) * 0.06 * hk;
              ehead.rotation.y = 0.35 * hk;
            }
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
    // 血统 aura 持续动画（随 player 跟随 + 绕身旋转/呼吸脉冲）
    if (auraPoints) updateAura(0.016);
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