/* 开放世界 · 2D 俯视地图引擎（Canvas）—— MC 体素方块强化版
 * 负责: 体素方块地板 / 立体体素墙柱 / 玩家移动(WASD) / 敌人精灵立绘巡逻 / 调查点高亮 / 交互
 * 通过 window.DSH_WORLD.onMove(dx,dy) / onInteract(objId) 与 IPC 通信
 *
 * 体素升级要点（MC/Minecraft 方块感，不改任何交互契约与地图数据读取）:
 *  - 每格地板 = 一块「方块顶面」立方体（顶面亮 + 前/右两个侧面可见，呈现体素方块厚度）
 *  - 墙 = 堆叠的「体素方块柱」，比地板高出一大截（方块顶面 + 前/右/左侧面），形成 MC 墙
 *  - 六面明暗模拟 MC 光照: 顶面最亮（受左上光）、前(南)面中亮、右(东)面偏暗、底/背更暗
 *  - 墙柱侧面向右/下延伸覆盖邻格地板，产生真实前后遮挡纵深（体素感便于读图）
 *  - 实体（玩家/敌人/NPC/道具/传送门）仍站在格子方块顶上，交互/碰撞契约完全不变
 */
"use strict";

const World2D = (() => {
  let cv, ctx, raf = null;
  let data = null;          // api_world 返回
  let explored = null;      // 已探索格集合 "x:y" -> true（轮回记忆迷雾）
  let px = 0, py = 0;       // 玩家插值坐标（像素）
  let targetPx = 0, targetPy = 0;
  let keys = {};
  let enemiesAnim = {};     // id -> {baseX, baseY, phase, alive}
  let hudCb = null, interCb = null, moveCb = null, msgCb = null;
  const TILE = 30;
  // 敌人 id → 精灵立绘（世界地图小头像/小立绘）；未知 id 回退色块
  const ENEMY_ICONS = {
    e_f1_z1: "assets/img/enemy_zombie.png",
    e_h1: "assets/img/enemy_horde.png",
    e_licker: "assets/img/enemy_licker.png",
    e_f3_z2: "assets/img/enemy_guard.png",
    e_f4_elite: "assets/img/enemy_hunter.png",
  };
  const ENEMY_FALLBACK = ["#7a1f1f", "#5d9c5d", "#6b4b3a", "#8a3a6b"];
  const IMGS = {};          // 预加载精灵图
  let tileCache = null;     // 地板顶面方块离屏画布
  let dprScale = 1;         // HiDPI 显示缩放：CSS 尺寸 = 内部像素 / dpr，让高清屏每个地图像素对一物理像素（由 ResolutionSys 下发）

  /* ---------- MC 风格体素渲染参数（默认开启，改观感不碰碰撞） ----------
   * 将平铺地图升级为「体素方块」：
   *  - 地板 = 一块(半)立方体：顶面亮，前(南,+y)面与右(东,+x)面露出薄侧面 → 方块体积感
   *  - 墙   = 体素方块柱：主立面墙砖全格填充（明显高于地板低块），右暗侧 + 顶沿高光 → MC 墙
   *  - 光照统一来自左上（Minecraft 顶面向阳）：顶最亮、前中亮、右偏暗、底/后更暗
   * 仅改绘制观感，tile 的 cells / walkable / 碰撞判定一概不动（碰撞在 Rust 侧）。
   */
  const P3D = {
    light: { dx: -1, dy: -1 },   // 光照方向（左上→右下），顶面受光
    blockH: 5,                   // 地板方块厚度（顶面向上挤出的侧面像素 = 方块高度）
    // 侧面明暗（模拟 MC 六面：前亮/右暗/底更暗），从上到下渐变
    frontHi: "rgba(255,255,255,.10)", // 前(南)面受光上端
    frontLo: "rgba(0,0,0,.30)",       // 前(南)面底端
    rightHi: "rgba(0,0,0,.22)",       // 右(东)面偏暗上端
    rightLo: "rgba(0,0,0,.48)",       // 右(东)面底端（更暗）
    shadowDX: 2, shadowDY: 5,    // 投影偏移（右下）
    shadowAlpha: 0.28,           // 竖立物投影不透明度
    glowHi: "rgba(150,200,255,.55)", // 传送门/建筑受光高光
  };
  // 底部投影（竖立物通用：向右下偏移的半透明黑）
  function dropShadow(sx, sy, w, h) {
    const a = P3D.shadowAlpha;
    ctx.save();
    ctx.fillStyle = `rgba(0,0,0,${a})`;
    ctx.fillRect(sx + P3D.shadowDX + 1, sy + P3D.shadowDY + 1, w, h);
    ctx.fillStyle = `rgba(0,0,0,${a * 0.55})`;
    ctx.fillRect(sx + P3D.shadowDX, sy + P3D.shadowDY, w, h);
    ctx.restore();
  }
  // 受光顶面（左上高光）
  function topHighlight(sx, sy, w, h) {
    const g = ctx.createLinearGradient(sx, sy, sx + w, sy + h);
    g.addColorStop(0, P3D.glowHi); g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.save(); ctx.fillStyle = g; ctx.fillRect(sx, sy, w, h); ctx.restore();
  }

  /* ---------- MC 体素方块六面绘制辅助 ----------
   * 以「顶面亮 / 前(南,+y)面中亮 / 右(东,+x)面暗」三面可视为 MC 方块向阳面，
   * 底/背面更暗。所有面均在各自矩形范围内渐变，贴合 TILE 网格。
   */
  // 前(南)侧面：垂直渐变，上端受光、底端落暗
  function sideFront(x, y, w, h) {
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, P3D.frontHi); g.addColorStop(1, P3D.frontLo);
    ctx.save(); ctx.fillStyle = g; ctx.fillRect(x, y, w, h); ctx.restore();
  }
  // 右(东)侧面：更暗的一侧，垂直(或水平)渐变
  function sideRight(x, y, w, h) {
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, P3D.rightHi); g.addColorStop(1, P3D.rightLo);
    ctx.save(); ctx.fillStyle = g; ctx.fillRect(x, y, w, h); ctx.restore();
  }
  // 侧向棱线（顶/左受光），强化方块边缘
  function edgeTop(x, y, w, h, a) {
    ctx.save();
    ctx.fillStyle = `rgba(175,210,245,${a})`;
    ctx.fillRect(x, y, w, h);
    ctx.restore();
  }

  const isExplored = (x, y) => !explored || explored.has(x + ":" + y);

  function init(canvas, opts = {}) {
    cv = canvas;
    ctx = cv.getContext("2d");
    hudCb = opts.onHud || null;
    interCb = opts.onInteract || null;
    moveCb = opts.onMove || null;
    msgCb = opts.onMsg || null;
    // 预加载立绘（失败静默，绘制时回退）
    ["enemy_zombie", "enemy_horde", "enemy_licker", "enemy_guard", "enemy_hunter",
     "pc_zhengzha", "img_zhangjie"].forEach(k => {
      IMGS[k] = new Image();
      IMGS[k].src = "assets/img/" + k + ".png";
    });
    buildTileCache();
  }

  /* ---------- 程序化地砖缓存（传奇式金属地板 + 立体墙） ---------- */
  function buildTileCache() {
    const bt = document.createElement("canvas");
    bt.width = TILE * 5; bt.height = TILE * 4;
    const c = bt.getContext("2d");

    const rnd = (a, b, s) => { const v = Math.sin(s * 127.1 + 311.7) * 43758.5453; return a + (v - Math.floor(v)) * (b - a); };

    // [0] 金属地板: 暗青灰 + 噪点 + 接缝 + 锈斑
    c.fillStyle = "#141a22"; c.fillRect(0, 0, TILE, TILE);
    for (let i = 0; i < 46; i++) {
      const g = rnd(10, 46, i + 1);
      c.fillStyle = `rgba(${90 + g | 0},${100 + g | 0},${118 + g | 0},${rnd(0.05, 0.16, i + 7)})`;
      c.fillRect(rnd(1, TILE - 3, i + 13), rnd(1, TILE - 3, i + 17), 1.6 + rnd(0, 2, i + 19), 1.1);
    }
    // 接缝（左/上暗线 + 右/下亮线）
    c.fillStyle = "rgba(0,0,0,.5)"; c.fillRect(0, 0, TILE, 1); c.fillRect(0, 0, 1, TILE);
    c.fillStyle = "rgba(120,150,180,.25)"; c.fillRect(0, TILE - 1, TILE, 1); c.fillRect(TILE - 1, 0, 1, TILE);
    // 锈斑
    c.fillStyle = "rgba(140,90,40,.14)";
    for (let i = 0; i < 4; i++) {
      c.beginPath();
      c.arc(rnd(2, TILE - 2, i + 31), rnd(2, TILE - 2, i + 37), rnd(1, 3.4, i + 41), 0, 6.28);
      c.fill();
    }

    // [1] 走廊地板（略亮、更干净）
    c.fillStyle = "#181f29"; c.fillRect(TILE, 0, TILE, TILE);
    for (let i = 0; i < 30; i++) {
      const g = rnd(30, 70, i + 51);
      c.fillStyle = `rgba(${110 + g | 0},${120 + g | 0},${140 + g | 0},${rnd(0.05, 0.14, i + 53)})`;
      c.fillRect(TILE + rnd(1, TILE - 2, i + 59), rnd(1, TILE - 2, i + 61), 1.8, 1.2);
    }
    c.fillStyle = "rgba(0,0,0,.45)"; c.fillRect(TILE, 0, TILE, 1); c.fillRect(TILE, 0, 1, TILE);
    c.fillStyle = "rgba(130,160,190,.3)"; c.fillRect(TILE, TILE - 1, TILE, 1); c.fillRect(TILE + TILE - 1, 0, 1, TILE);

    // [2] 设备坑地板（暗红警戒）
    c.fillStyle = "#171018"; c.fillRect(TILE * 2, 0, TILE, TILE);
    c.fillStyle = "rgba(180,60,50,.10)"; c.fillRect(TILE * 2, 0, TILE, TILE);
    c.fillStyle = "rgba(220,120,80,.5)"; c.fillRect(TILE * 2 + 1, 1, TILE - 2, 2);
    c.fillStyle = "rgba(220,120,80,.5)"; c.fillRect(TILE * 2 + 1, TILE - 3, TILE - 2, 2);
    c.fillStyle = "rgba(220,120,80,.5)"; c.fillRect(TILE * 2 + 1, 1, 2, TILE - 2);
    c.fillStyle = "rgba(220,120,80,.5)"; c.fillRect(TILE * 3 - 3, 1, 2, TILE - 2);
    for (let i = 0; i < 20; i++) {
      c.fillStyle = `rgba(150,110,110,${rnd(0.04, 0.12, i + 71)})`;
      c.fillRect(TILE * 2 + rnd(1, TILE - 2, i + 73), rnd(1, TILE - 2, i + 79), 1.5, 1.2);
    }

    // [3] 立体墙: 墙基 + 砖缝 + 顶部高光（伪 3D）
    c.fillStyle = "#2a3340"; c.fillRect(TILE * 3, 0, TILE, TILE);
    // 砖块横缝
    c.fillStyle = "rgba(10,14,20,.9)";
    c.fillRect(TILE * 3, TILE * 0.48, TILE, 2);
    c.fillRect(TILE * 3, TILE * 0.95, TILE, 2);
    // 竖缝（交错）
    c.fillRect(TILE * 3 + TILE * 0.24, 0, 2, TILE * 0.48);
    c.fillRect(TILE * 3 + TILE * 0.62, TILE * 0.48, 2, TILE * 0.48);
    c.fillRect(TILE * 3 + TILE * 0.42, TILE * 0.95, 2, TILE * 0.05);
    // 砖面噪点
    for (let i = 0; i < 26; i++) {
      c.fillStyle = `rgba(120,140,170,${rnd(0.04, 0.12, i + 83)})`;
      c.fillRect(TILE * 3 + rnd(1, TILE - 2, i + 89), rnd(1, TILE - 2, i + 97), 1.6, 1.2);
    }
    // 顶部受光边（斜光感）
    c.fillStyle = "rgba(150,180,215,.35)";
    c.fillRect(TILE * 3, 0, TILE, 2);
    c.fillRect(TILE * 3, 0, 2, TILE);

    // [4] 设备 I（不透明底，绘制时再叠设备图形）
    c.fillStyle = "#0e1116"; c.fillRect(TILE * 4, 0, TILE, TILE);

    // ---------- 伪 3D:给三类地板统一叠加「左上受光 + 角落环境光遮蔽(AO) + 底部内侧投影」的立体化图层 ----------
    // （烘焙进离屏缓存，逐帧零额外成本；仅观感，不影响判定）
    for (let vt = 0; vt < 3; vt++) {           // 金属/走廊/警戒 三个地板变体
      const ox = vt * TILE, sx = TILE * 3 > 0 ? TILE * 3 : 0;
      // 1) 顶部受光斜影（左上亮→右下暗），强调统一光照
      const topG = c.createLinearGradient(ox, 0, ox + TILE, TILE);
      topG.addColorStop(0, "rgba(150,185,220,.16)");
      topG.addColorStop(1, "rgba(0,0,0,.12)");
      c.fillStyle = topG;
      c.fillRect(ox, 0, TILE, TILE);
      // 2) AO 角遮蔽（环境光遮蔽伪影）：右下两角更暗 + 中心下垂暗，营造每一格「嵌在面板内」的凹感。
      //    用两个三角形近似角落 AO，叠加后比纯线性渐变更真实（烘焙零逐帧成本）。
      c.fillStyle = "rgba(0,0,0,.16)";
      c.beginPath(); c.moveTo(ox + TILE, 0); c.lineTo(ox + TILE, TILE); c.lineTo(ox, TILE); c.fill();
      c.fillStyle = "rgba(0,0,0,.10)";
      // 右下 1/2 区域的软 AO（两条叠加把角点堆得更深）
      c.beginPath(); c.moveTo(ox + TILE, TILE * 0.35); c.lineTo(ox + TILE, TILE); c.lineTo(ox + TILE * 0.35, TILE); c.fill();
      // 3) 底部内侧投影（右下微凹陷，营造面板/地面厚度）
      c.fillStyle = "rgba(0,0,0,.22)";
      c.fillRect(ox, TILE - 3, TILE, 3);       // 底
      c.fillRect(ox + TILE - 3, 0, 3, TILE);   // 右
      // 4) 左上高光线（接缝亮化，呼应光从左上）
      c.fillStyle = "rgba(168,208,240,.18)";
      c.fillRect(ox, 0, TILE, 1); c.fillRect(ox, 0, 1, TILE);
      // 5) 地板材质更丰富：金属/走廊格加横条钢板拼缝 + 微磨屑高光点（仅观感）
      c.fillStyle = "rgba(0,0,0,.10)";
      c.fillRect(ox, TILE * 0.5, TILE, 1);     // 中线接缝
      if (vt === 0) {                          // 金属地板:对角更密的锈点+刮痕
        c.fillStyle = "rgba(140,90,40,.12)";
        for (let i = 0; i < 3; i++) {
          c.fillRect(ox + rnd(2, TILE - 4, i + 401), rnd(2, TILE - 4, i + 407), rnd(5, 10, i + 409), 1);
        }
      }
      if (vt === 1) {                          // 走廊地板:细网孔阵
        c.fillStyle = "rgba(10,14,20,.5)";
        for (let gy = 0; gy < 3; gy++) for (let gx = 0; gx < 3; gx++) {
          c.fillRect(ox + 6 + gx * (TILE / 3), 6 + gy * (TILE / 3), 1.4, 1.4);
        }
      }
    }

    tileCache = bt;
  }

  // 地板 体素方块顶面 材质选择（与平铺同规则：62/88 分桶三个变体）
  function floorTexSrc(x, y) {
    const h = (x * 73856093) ^ (y * 19349663);
    const v = ((h % 100) + 100) % 100;
    return (v < 62 ? 0 : (v < 88 ? TILE : TILE * 2));
  }

  // 地板方块：MC 风格半立方体（顶面 + 前/右两个可见侧面，营造方块体积感）
  // sx,sy 为格子左上角；顶面在 sy-bh 高度受左上光，前(南)边与右(东)边向下拉出 bh 形成块体。
  function drawFloor(x, y, srcX) {
    const sx = x * TILE, sy = y * TILE;
    const bh = P3D.blockH;
    const topBase = sy - bh;                 // 顶面上沿
    // 底部投影（块体朝右下微投影，接地）
    ctx.fillStyle = `rgba(0,0,0,${P3D.shadowAlpha * 0.5})`;
    ctx.fillRect(sx + P3D.shadowDX, topBase + TILE - 2 + P3D.shadowDY, TILE, bh);
    // 前(南,+y)侧面：沿顶面下沿向下拉 bh 的竖向面（中亮）
    sideFront(sx, topBase + TILE, TILE, bh);
    // 右(东,+x)侧面：沿顶面右沿向下拉 bh 的竖向面（更暗）
    sideRight(sx + TILE, topBase, bh, TILE + bh);
    // 顶面（方块受光顶，最亮）
    ctx.drawImage(tileCache, srcX, 0, TILE, TILE, sx, topBase, TILE, TILE);
    // 顶面受光棱线（左上高光边）
    edgeTop(sx, topBase, TILE, 2, 0.28);
    edgeTop(sx, topBase, 2, TILE, 0.28);
  }

  // 墙柱：体素方块柱（主立面为墙砖面 + 右暗侧 + 顶沿高光），全格填充，明显高于地板低块
  // 地板仅是 bh(5px) 的低块，墙却在格子高度内整面填充 → 竖立方块柱，形成 MC 墙体高度差。
  function drawWall(x, y) {
    const sx = x * TILE, sy = y * TILE;
    const t = TILE;
    const rw = P3D.blockH + 3;              // 右(东)侧暗面厚度
    // 底部投影（先画，落向下/右邻格，传达竖立物）
    ctx.fillStyle = `rgba(0,0,0,${P3D.shadowAlpha * 0.75})`;
    ctx.fillRect(sx + P3D.shadowDX, sy + t - 2 + P3D.shadowDY, t * 0.9, P3D.shadowDY);
    ctx.fillRect(sx + t - rw + P3D.shadowDX, sy + P3D.shadowDY, rw, t);
    // 右(东)侧暗面：墙柱右侧竖棱（MC 右侧暗影）
    sideRight(sx + t - rw, sy, rw, t);
    // 主立面（南/前）：墙砖纹理全格填充，营造竖立方块柱
    ctx.drawImage(tileCache, TILE * 3, 0, t, t, sx, sy, t, t);
    // 受左上光：前脸上端略微提亮，下端落暗（MC 顶向阳）
    sideFront(sx, sy, t, t);
    // 顶沿受光棱线（左上高光，强调方块顶 rim）
    edgeTop(sx, sy, t, 3, 0.32);
    edgeTop(sx, sy, 3, t, 0.32);
    // 底部墙脚暗影（与地板相交处）
    ctx.fillStyle = "rgba(0,0,0,.34)";
    ctx.fillRect(sx, sy + t - 3, t, 3);
  }

  /* ---------- 游戏状态 ---------- */
  function setData(worldData) {
    data = worldData;
    explored = new Set((data.explored || []).map(s => String(s)));
    px = data.px * TILE + TILE / 2;
    py = data.py * TILE + TILE / 2;
    targetPx = px; targetPy = py;
    enemiesAnim = {};
    (data.enemies || []).forEach(e => {
      enemiesAnim[e.id] = { baseX: e.x * TILE + TILE / 2, baseY: e.y * TILE + TILE / 2, phase: Math.random() * 6.28, alive: e.alive };
    });
    const topEl = document.querySelector("#worldTop #worldLoc");
    if (topEl) topEl.textContent = ((data.world && data.world.name) ? data.world.name + " · " : "") + (data.floor_name || "蜂巢");
    start();
  }

  function setPlayer(x, y) {
    targetPx = x * TILE + TILE / 2;
    targetPy = y * TILE + TILE / 2;
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
    px += (targetPx - px) * 0.28;
    py += (targetPy - py) * 0.28;
    draw(now);
  }

  /* ---------- 主绘制 ---------- */
  function draw(now) {
    if (!data) return;
    // 地板方块顶面向左上挤出 blockH 像素——顶部留出 margin 避免首行方块顶被裁剪
    const viewTop = P3D.blockH;
    const W = cv.width = data.w * TILE;
    const H = cv.height = data.h * TILE + viewTop;
    // HiDPI：CSS 显示尺寸 = 内部像素 / dpr，1 个地图像素 = dpr 物理像素 → 高清屏清晰不糊。
    // (`image-rendering:pixelated` 下此映射 = 每体素一物理像素的锐利放大)
    cv.style.width = (W / dprScale) + "px";
    cv.style.height = (H / dprScale) + "px";

    // 背景
    ctx.fillStyle = "#07090d";
    ctx.fillRect(0, 0, W, H);

    // —— 第一遍：全部地板体素方块（含装饰地板格），后者可被墙柱覆盖 ——
    for (let y = 0; y < data.h; y++) {
      const row = data.tiles[y] || "";
      for (let x = 0; x < data.w; x++) {
        const c = row[x] || "#";
        if (c === "#") continue;          // 墙留给第二遍
        const srcX = c === "I" ? TILE * 4 : floorTexSrc(x, y);
        drawFloor(x, y, srcX);
      }
    }

    // —— 第二遍：全部墙体素方块柱（按 y 升序 = 前后序，覆盖下方地板/邻格地板）——
    for (let y = 0; y < data.h; y++) {
      const row = data.tiles[y] || "";
      for (let x = 0; x < data.w; x++) {
        if ((row[x] || "#") === "#") drawWall(x, y);
      }
    }

    // 设备装饰 I：机柜/储物箱
    for (let y = 0; y < data.h; y++) {
      const row = data.tiles[y] || "";
      for (let x = 0; x < data.w; x++) {
        if ((row[x] || "#") !== "I") continue;
        const X = x * TILE, Y = y * TILE;
        // 箱体（先投右下影，营造悬浮/立体感）
        dropShadow(X + 4, Y + 6, TILE - 8, TILE - 12);
        ctx.fillStyle = "#3a4654";
        ctx.fillRect(X + 4, Y + 6, TILE - 8, TILE - 12);
        ctx.fillStyle = "rgba(160,190,220,.5)";
        ctx.fillRect(X + 4, Y + 6, TILE - 8, 2);
        // 受光：顶/左棱线高光
        ctx.fillStyle = "rgba(175,210,245,.22)";
        ctx.fillRect(X + 4, Y + 6, TILE - 8, 1); ctx.fillRect(X + 4, Y + 6, 1, TILE - 12);
        // 右侧/底侧暗边（厚度感）
        ctx.fillStyle = "rgba(6,10,16,.55)";
        ctx.fillRect(X + 4, Y + 6 + TILE - 14, TILE - 8, 2);
        ctx.fillRect(X + 4 + TILE - 10, Y + 6, 2, TILE - 12);
        // 门缝/屏幕
        ctx.fillStyle = "#0f141b";
        ctx.fillRect(X + 9, Y + 12, TILE - 18, TILE - 22);
        ctx.fillStyle = "rgba(90,220,200,.55)";
        ctx.fillRect(X + 10, Y + 13, 3, 3);
        ctx.fillRect(X + 15, Y + 13, 3, 3);
      }
    }

    // 轮回迷雾：未探索区域暗化（底下 tile 结构隐约可见）
    if (explored) {
      for (let y = 0; y < data.h; y++) {
        for (let x = 0; x < data.w; x++) {
          if (isExplored(x, y)) continue;
          ctx.fillStyle = "rgba(2,2,6,.72)";
          ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
          ctx.strokeStyle = "rgba(90,100,140,.09)";
          ctx.strokeRect(x * TILE + .5, y * TILE + .5, TILE - 1, TILE - 1);
          ctx.fillStyle = "rgba(20,20,30,.45)";
          ctx.fillRect(x * TILE, y * TILE, TILE, 1);
          ctx.fillRect(x * TILE, y * TILE, 1, TILE);
        }
      }
    }

    // 传送门（能量漩涡，仅已探索）
    (data.portals || []).forEach(p => {
      if (!isExplored(p.x, p.y)) return;
      const X = p.x * TILE + TILE / 2, Y = p.y * TILE + TILE / 2;
      const rot = now / 300 + p.x;
      // 发光门框（伪 3D 竖立：投影 + 顶面高光 + 外发光环），标示这是一道能量门洞
      dropShadow(X - 13, Y - 13, 26, 26);
      const pulse = 2 + Math.sin(now / 380 + p.x * 3) * 1;
      ctx.save();
      ctx.shadowColor = "rgba(100,200,255,.9)";
      ctx.shadowBlur = 9 + pulse;
      ctx.strokeStyle = "rgba(120,200,255,.85)";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(X - 13, Y - 13, 26, 26, 6); else ctx.rect(X - 13, Y - 13, 26, 26);
      ctx.stroke();
      ctx.restore();
      // 门框受光（左上顶棱亮）
      ctx.strokeStyle = "rgba(210,240,255,.85)"; ctx.lineWidth = 1.4;
      const fx = X - 13, fy = Y - 13;
      ctx.beginPath(); ctx.moveTo(fx, fy + 2); ctx.lineTo(fx, fy); ctx.lineTo(fx + 25, fy); ctx.stroke();
      // 地面光环
      const g = ctx.createRadialGradient(X, Y, 2, X, Y, 16);
      g.addColorStop(0, "rgba(80,180,255,.5)");
      g.addColorStop(1, "rgba(80,180,255,0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(X, Y, 16, 0, 6.28); ctx.fill();
      // 旋转三叶漩涡
      for (let i = 0; i < 3; i++) {
        const a = rot * 0.02 + i * 2.09;
        ctx.strokeStyle = i === 0 ? "rgba(130,215,255,.9)" : "rgba(80,170,255,.5)";
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(X, Y, 7 + i * 1.4, a, a + 2.2);
        ctx.stroke();
        ctx.lineWidth = 1;
      }
      ctx.fillStyle = "#bfe8ff";
      ctx.font = "bold 10px sans-serif"; ctx.textAlign = "center";
      ctx.fillText("传送", X, Y + 26);
    });

    // 门禁（锁定铁门 / 已解锁绿灯，仅已探索）
    (data.gates || []).forEach(g => {
      if (!isExplored(g.x, g.y)) return;
      const X = g.x * TILE + TILE / 2, Y = g.y * TILE + TILE / 2;
      if (g.locked) {
        const pulse = 8 + Math.sin(now / 400 + g.x + g.y) * 2;
        const gr = ctx.createRadialGradient(X, Y, 1, X, Y, pulse + 6);
        gr.addColorStop(0, "rgba(255,200,60,.35)");
        gr.addColorStop(1, "rgba(255,200,60,0)");
        ctx.fillStyle = gr;
        ctx.beginPath(); ctx.arc(X, Y, pulse + 6, 0, 6.28); ctx.fill();
        // 铁门（竖立物：先投影增强 3D 厚度感）
        ctx.fillStyle = "rgba(0,0,0,.25)";
        ctx.fillRect(X - 11 + P3D.shadowDX, Y - 7 + P3D.shadowDY, 22, 14);
        ctx.strokeStyle = "#d8a040"; ctx.lineWidth = 2;
        ctx.strokeRect(X - 11, Y - 7, 22, 14); ctx.lineWidth = 1;
        ctx.strokeStyle = "rgba(216,160,64,.5)";
        ctx.beginPath(); ctx.moveTo(X - 11, Y - 1); ctx.lineTo(X + 11, Y - 1); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(X - 11, Y + 3); ctx.lineTo(X + 11, Y + 3); ctx.stroke();
        // 锁
        ctx.fillStyle = "#f4c542";
        ctx.beginPath(); ctx.arc(X, Y - 6, 2.6, 0, 6.28); ctx.fill();
        ctx.fillRect(X - 3, Y - 6, 6, 6);
        ctx.fillStyle = "#0a0a0a"; ctx.fillRect(X - 1.5, Y - 3.4, 3, 3.4);
        // 名称
        ctx.font = "10px sans-serif"; ctx.fillStyle = "#ffe9a8";
        ctx.textAlign = "center"; ctx.fillText(g.name || "门禁", X, Y + 24);
      } else {
        const gr = ctx.createRadialGradient(X, Y, 1, X, Y, 9);
        gr.addColorStop(0, "rgba(80,200,120,.4)");
        gr.addColorStop(1, "rgba(80,200,120,0)");
        ctx.fillStyle = gr;
        ctx.beginPath(); ctx.arc(X, Y, 9, 0, 6.28); ctx.fill();
        ctx.strokeStyle = "#4ac47a"; ctx.beginPath(); ctx.arc(X, Y, 5.5, 0, 6.28); ctx.stroke();
        ctx.fillStyle = "#4ac47a";
        ctx.font = "bold 9px sans-serif"; ctx.textAlign = "center";
        ctx.fillText("✓", X, Y + 4);
      }
    });

    // 调查点（发光问号/放大镜，仅已探索）
    (data.points || []).forEach(p => {
      if (!isExplored(p.x, p.y)) return;
      const X = p.x * TILE + TILE / 2, Y = p.y * TILE + TILE / 2;
      if (p.done) {
        ctx.fillStyle = "rgba(100,180,120,.18)";
        ctx.beginPath(); ctx.arc(X, Y, 8, 0, 6.28); ctx.fill();
        ctx.strokeStyle = "#4a8a5a"; ctx.beginPath(); ctx.arc(X, Y, 6, 0, 6.28); ctx.stroke();
        ctx.fillStyle = "#4a8a5a";
        ctx.font = "bold 9px sans-serif"; ctx.textAlign = "center"; ctx.fillText("✓", X, Y + 4);
      } else {
        const pulse = 7 + Math.sin(now / 400 + p.x * 2) * 2;
        const gr = ctx.createRadialGradient(X, Y, 1, X, Y, pulse + 5);
        gr.addColorStop(0, "rgba(255,215,106,.4)");
        gr.addColorStop(1, "rgba(255,215,106,0)");
        ctx.fillStyle = gr;
        ctx.beginPath(); ctx.arc(X, Y, pulse + 5, 0, 6.28); ctx.fill();
        // 问号徽章
        ctx.fillStyle = "rgba(30,26,14,.92)";
        ctx.beginPath(); ctx.arc(X, Y, 7, 0, 6.28); ctx.fill();
        ctx.strokeStyle = "#ffd76a"; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.arc(X, Y, 7, 0, 6.28); ctx.stroke(); ctx.lineWidth = 1;
        ctx.fillStyle = "#ffd76a";
        ctx.font = "bold 10px sans-serif"; ctx.textAlign = "center"; ctx.fillText("?", X, Y + 4);
        // 标签
        ctx.fillStyle = "rgba(255,215,106,.9)";
        ctx.font = "9px sans-serif"; ctx.fillText(p.name || "", X, Y - 13);
      }
    });

    // NPC（张杰立绘 + 名牌，仅已探索）
    (data.npcs || []).forEach(n => {
      if (!isExplored(n.x, n.y)) return;
      const X = n.x * TILE + TILE / 2, Y = n.y * TILE + TILE / 2;
      // 底座光环
      const gr = ctx.createRadialGradient(X, Y, 3, X, Y, 20);
      gr.addColorStop(0, "rgba(90,150,255,.4)");
      gr.addColorStop(1, "rgba(90,150,255,0)");
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.arc(X, Y, 20, 0, 6.28); ctx.fill();
      const h = TILE * 2.6, w = h * 0.75;
      dropShadow(X - w / 2, Y - h * 0.9 + 2, w, h * 0.9);
      const img = IMGS["img_zhangjie"];
      if (img && img.width > 0) {
        ctx.drawImage(img, X - w / 2, Y - h * 0.9, w, h);
      } else {
        // fallback：同样尺寸的立绘底框（勿退回小圆点）
        ctx.fillStyle = "#2a4a7a";
        ctx.fillRect(X - w / 2, Y - h * 0.9, w, h);
      }
      // 名牌
      ctx.fillStyle = "rgba(0,0,0,.5)";
      ctx.fillRect(X - w / 2, Y + 2, w, 13);
      ctx.fillStyle = "#a8d4ff";
      ctx.font = "11px sans-serif"; ctx.textAlign = "center";
      ctx.fillText(n.name, X, Y + 11);
    });

    // 3D 副本入口（战斗红 / 解密蓝 漩涡，仅已探索）
    (data.zones || []).forEach(z => {
      if (!isExplored(z.x, z.y)) return;
      const X = z.x * TILE + TILE / 2, Y = z.y * TILE + TILE / 2;
      const col = z.kind === "fight" ? [235, 70, 70] : [110, 110, 255];
      const rot = now / 260 + z.x;
      // 竖立投影 + 受光（副本入口悬浮能量门）
      dropShadow(X - 18, Y - 18, 36, 36);
      topHighlight(X - 18, Y - 18, 36, 36);
      const gr = ctx.createRadialGradient(X, Y, 2, X, Y, 18);
      gr.addColorStop(0, `rgba(${col[0]},${col[1]},${col[2]},.55)`);
      gr.addColorStop(1, `rgba(${col[0]},${col[1]},${col[2]},0)`);
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.arc(X, Y, 18, 0, 6.28); ctx.fill();
      for (let i = 0; i < 3; i++) {
        const a = rot * 0.025 + i * 2.09;
        ctx.strokeStyle = i === 0 ? `rgba(${col[0] + 40},${col[1] + 40},${col[2] + 40},.95)` : `rgba(${col[0]},${col[1]},${col[2]},.55)`;
        ctx.lineWidth = 2.4;
        ctx.beginPath(); ctx.arc(X, Y, 8 + i * 1.6, a, a + 2.0);
        ctx.stroke(); ctx.lineWidth = 1;
      }
      // 中心图标
      ctx.fillStyle = "#fff";
      ctx.font = "bold 11px sans-serif"; ctx.textAlign = "center";
      ctx.fillText(z.kind === "fight" ? "⚔" : "◈", X, Y + 4);
      ctx.fillStyle = `rgba(255,220,220,.95)`;
      ctx.font = "9px sans-serif";
      ctx.fillText(z.name || (z.kind === "fight" ? "战斗" : "解密"), X, Y + 26);
    });

    // 敌人（精灵立绘 + 巡逻摆动 + 轻微浮动，仅已探索）
    (data.enemies || []).forEach(e => {
      if (!isExplored(e.x, e.y)) return;
      const a = enemiesAnim[e.id];
      if (!a || !a.alive) return;
      const wobble = Math.sin(now / 500 + a.phase) * 4;
      const floaty = Math.sin(now / 420 + a.phase * 1.3) * 2;
      const X = a.baseX + wobble, Y = a.baseY;
      const icon = ENEMY_ICONS[e.id];
      const img = icon ? IMGS[icon.split("/").pop().replace(".png", "")] : null;
      if (img && img.width > 0) {
        // 立绘小像（底部对齐站立点，先投右下影增强立体/辨识）
        const h = TILE * 2.8, w = h * 0.75;
        const topY = Y - h * 0.9 + floaty;
        dropShadow(X - w / 2, Y - h * 0.9 + 2, w, h * 0.9);
        ctx.drawImage(img, X - w / 2, topY, w, h);
        // 名字牌
        ctx.fillStyle = "rgba(0,0,0,.5)";
        ctx.fillRect(X - w / 2, Y + 2, w, 13);
        ctx.fillStyle = "#ff8080";
        ctx.font = "11px sans-serif"; ctx.textAlign = "center";
        ctx.fillText(e.name || "敌人", X, Y + 11);
      } else {
        // 兜底：红色半透明投影 + 本体高光
        ctx.fillStyle = "rgba(255,40,40,.22)";
        ctx.beginPath(); ctx.arc(X + P3D.shadowDX, Y + P3D.shadowDY, 9, 0, 6.28); ctx.fill();
        ctx.fillStyle = ENEMY_FALLBACK[(e.id.charCodeAt(e.id.length - 1) || 0) % ENEMY_FALLBACK.length];
        ctx.beginPath(); ctx.arc(X, Y, 9, 0, 6.28); ctx.fill();
        ctx.strokeStyle = "#ff5050"; ctx.lineWidth = 2; ctx.stroke(); ctx.lineWidth = 1;
        ctx.fillStyle = "#ff8080"; ctx.font = "10px sans-serif"; ctx.textAlign = "center";
        ctx.fillText("!", X, Y - 11);
      }
      // 巡逻半径
      ctx.strokeStyle = "rgba(255,80,80,.13)";
      ctx.beginPath(); ctx.arc(X, Y, e.radius * TILE, 0, 6.28); ctx.stroke();
    });

    // 玩家（主角立绘 + 朝向光圈，放大 · 镜像 · 上下浮动）
    const plImg = IMGS["pc_zhengzha"];
    if (plImg && plImg.width > 0) {
      const h = TILE * 3.6, w = h * 0.75;
      // 选中光环（脉动半径随时间正弦微变）
      const haloR = 30 + Math.sin(now / 350) * 3;
      const gr = ctx.createRadialGradient(px, py, 3, px, py, haloR);
      gr.addColorStop(0, "rgba(90,220,160,.5)");
      gr.addColorStop(1, "rgba(90,220,160,0)");
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.arc(px, py, haloR, 0, 6.28); ctx.fill();
      // 强调投影（主导角色突出感，向右下，随立绘放大同步放大）
      dropShadow(px - w / 2, py - h * 0.9 + 2, w, h * 0.9);
      // 朝向水平翻转 + 缓慢上下浮动（呼吸/行走感）
      const [idx, idy] = moveIntent();
      const flip = idx < 0;                       // 朝左走时镜像翻面
      const floatY = Math.sin(now / 300) * 2;
      const topY = py - h * 0.85 + floatY;
      ctx.save();
      if (flip) {
        ctx.translate(px, 0);
        ctx.scale(-1, 1);
        ctx.translate(-px, 0);
      }
      ctx.drawImage(plImg, px - w / 2, topY, w, h);
      ctx.restore();
      // 朝向箭头
      if (idx || idy) {
        ctx.strokeStyle = "rgba(234,255,244,.85)";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(px, topY);
        ctx.lineTo(px + idx * 15, topY + idy * 15);
        ctx.stroke(); ctx.lineWidth = 1;
      }
    } else {
      ctx.fillStyle = "rgba(90,220,160,1)";
      ctx.beginPath(); ctx.arc(px, py, 8, 0, 6.28); ctx.fill();
      ctx.strokeStyle = "#eafff4"; ctx.lineWidth = 2; ctx.stroke(); ctx.lineWidth = 1;
    }

    // 附近可交互提示
    const near = nearbyList();
    if (near.length) {
      ctx.font = "12px sans-serif"; ctx.fillStyle = "rgba(255,255,255,.88)";
      ctx.textAlign = "center";
      const hint = near.map(o => o.name).join(" / ");
      ctx.fillText("按 E 交互：" + hint, W / 2, H - 8);
    }
  }

  return { init, setData, setPlayer, keydown, keyup, start, stop, nearbyList, moveIntent,
    clearKeys: function () { keys = {}; },
    setDpr: function (x) { dprScale = Math.max(0.5, x || 1); }, // HiDPI:由 ResolutionSys 下发 devicePixelRatio
  };
})();

// 暴露到全局（index.html 先于 client.js 加载）
window.World2D = World2D;