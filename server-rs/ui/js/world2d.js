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
  let worldSeed = 7;        // 世界种子：由 worldData.world/floor 派生，供地板材质分桶与装饰确定性随机使用
  // 氛围尘埃粒子（轻量、帧率友好的固定小集合）：{x,y,r,phase,speed} 屏幕空间缓慢飘浮
  let motes = null;         // 惰性初始化的尘埃粒子数组

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

  /* ---------- 程序化地砖缓存（六类地板材质 + 环境装饰精灵 + 道具图标 + 立体墙） ----------
   * 离屏烘焙，逐帧零成本。所有变体都带确定性噪点（用 rnd(seed)）+ 接缝 + 磨损划痕。
   * 布局（TILE×TILE 一格）：
   *   第 0 行（地板材质 6 种 + 墙 + 设备）：
   *     [0]金属板 [1]石板 [2]木地板 [3]沙地 [4]水面 [5]苔藓地 [6]墙 [7]设备I
   *   第 1 行（环境装饰精灵 6 种，绘制时叠到地板格上）：
   *     [0]血渍 [1]裂痕 [2]碎石 [3]植被 [4]水渍 [5]光斑 [6]灰尘/油污
   *   第 2 行（道具图标精灵 6 种，地图道具/调查点用）：
   *     [0]血瓶 [1]钥匙 [2]石碑 [3]火把 [4]卷轴 [5]草药 [6]水晶
   * 仅改观感，地格 `.`/`#`/`I`/`P` 语义与碰撞判定一概不动。
   */
  function buildTileCache() {
    const bt = document.createElement("canvas");
    bt.width = TILE * 8; bt.height = TILE * 4;
    const c = bt.getContext("2d");

    const rnd = (a, b, s) => { const v = Math.sin(s * 127.1 + 311.7) * 43758.5453; return a + (v - Math.floor(v)) * (b - a); };

    // ---------- 通用：给任一地板材质叠加统一「左上受光 + AO 角遮 + 底部内侧投影」立体层 ----------
    function shadeFloor(ox, oy, matDens) {
      const topG = c.createLinearGradient(ox, oy, ox + TILE, oy + TILE);
      topG.addColorStop(0, "rgba(150,185,220,.15)");
      topG.addColorStop(1, "rgba(0,0,0,.11)");
      c.fillStyle = topG; c.fillRect(ox, oy, TILE, TILE);
      c.fillStyle = "rgba(0,0,0,.15)";
      c.beginPath(); c.moveTo(ox + TILE, oy); c.lineTo(ox + TILE, oy + TILE); c.lineTo(ox, oy + TILE); c.fill();
      c.fillStyle = "rgba(0,0,0,.22)";
      c.fillRect(ox, oy + TILE - 3, TILE, 3);
      c.fillRect(ox + TILE - 3, oy, 3, TILE);
      c.fillStyle = "rgba(168,208,240,.18)";
      c.fillRect(ox, oy, TILE, 1); c.fillRect(ox, oy, 1, TILE);
      // 细划痕簇（随机方向短线），密度随 matDens
      c.strokeStyle = "rgba(0,0,0,.22)"; c.lineWidth = 1;
      for (let ci = 0; ci < matDens; ci++) {
        const cx0 = ox + rnd(2, TILE - 4, 9001 + ci * 7);
        const cy0 = oy + rnd(2, TILE - 4, 9101 + ci * 11);
        const ca = rnd(0, 3.14, 9201 + ci * 13);
        const clen = rnd(2, 5, 9301 + ci * 17);
        for (let sc = 0; sc < 3; sc++) {
          c.beginPath();
          c.moveTo(cx0 + rnd(-1, 1, 9401 + sc * 3), cy0 + rnd(-1, 1, 9501 + sc * 5));
          c.lineTo(cx0 + Math.cos(ca) * clen * sc * 0.9 + rnd(-1, 2, 9601 + sc * 7),
                   cy0 + Math.sin(ca) * clen * sc * 0.9 + rnd(-1, 2, 9701 + sc * 9));
          c.stroke();
        }
      }
    }
    // 通用：一格 `oxy` 内的随机裂缝/碎石感折线
    function crackLine(ox, oy, seed) {
      c.strokeStyle = "rgba(5,8,14,.28)"; c.lineWidth = 1;
      const kx0 = ox + rnd(3, TILE - 3, 9901 + seed), ky0 = oy + rnd(3, TILE - 3, 10001 + seed);
      const kdir = rnd(0, 6.28, 10101 + seed);
      let kx = kx0, ky = ky0;
      c.beginPath(); c.moveTo(kx, ky);
      for (let kg = 0; kg < 4; kg++) {
        kx += Math.cos(kdir + rnd(-0.8, 0.8, 10201 + kg * 5)) * rnd(3, 6, 10301 + kg * 7);
        ky += Math.sin(kdir + rnd(-0.8, 0.8, 10401 + kg * 11)) * rnd(3, 6, 10501 + kg * 13);
        c.lineTo(kx, ky);
      }
      c.stroke();
    }

    /* ================= 第 0 行 · 六种地板材质 ================= */
    /** [0] 金属板地板：暗青灰钢板 + 拼缝 + 锈迹 + 铆钉 */
    { const o = 0; c.fillStyle = "#141a22"; c.fillRect(o, 0, TILE, TILE);
      for (let i = 0; i < 46; i++) {
        const g = rnd(10, 46, i + 1);
        c.fillStyle = `rgba(${90 + g | 0},${100 + g | 0},${118 + g | 0},${rnd(0.05, 0.16, i + 7)})`;
        c.fillRect(o + rnd(1, TILE - 3, i + 13), rnd(1, TILE - 3, i + 17), 1.6 + rnd(0, 2, i + 19), 1.1);
      }
      c.fillStyle = "rgba(0,0,0,.5)"; c.fillRect(o, 0, TILE, 1); c.fillRect(o, 0, 1, TILE);
      c.fillStyle = "rgba(120,150,180,.25)"; c.fillRect(o, TILE - 1, TILE, 1); c.fillRect(o + TILE - 1, 0, 1, TILE);
      c.fillStyle = "rgba(140,90,40,.14)";
      for (let i = 0; i < 4; i++) { c.beginPath();
        c.arc(o + rnd(2, TILE - 2, i + 31), rnd(2, TILE - 2, i + 37), rnd(1, 3.4, i + 41), 0, 6.28); c.fill(); }
      // 铆钉点（金属格均匀小凸点）
      c.fillStyle = "rgba(200,215,235,.30)";
      for (let i = 0; i < 5; i++) c.fillRect(o + 3 + i * 6, 2, 1.4, 1.4);
      shadeFloor(o, 0, 6); crackLine(o, 0, 3);
    }
    /** [1] 石板地板：灰色岩板 + 规则石板缝 + 苔点 */
    { const o = TILE; c.fillStyle = "#1c232c"; c.fillRect(o, 0, TILE, TILE);
      for (let i = 0; i < 40; i++) {
        const g = rnd(6, 40, i + 201);
        c.fillStyle = `rgba(${100 + g | 0},${108 + g | 0},${124 + g | 0},${rnd(0.05, 0.14, i + 207)})`;
        c.fillRect(o + rnd(1, TILE - 3, i + 213), rnd(1, TILE - 3, i + 217), rnd(1.5, 4, i + 219), 1.2);
      }
      // 石板拼缝（横纵交错）
      c.fillStyle = "rgba(8,10,16,.6)";
      c.fillRect(o, TILE * 0.5, TILE, 1.6); c.fillRect(o, TILE * 0.9, TILE, 1.6);
      c.fillRect(o + TILE * 0.32, 0, 1.6, TILE * 0.5); c.fillRect(o + TILE * 0.68, TILE * 0.5, 1.6, TILE * 0.5);
      c.fillStyle = "rgba(110,120,140,.15)"; c.fillRect(o, TILE * 0.5 - 1, TILE, 1); c.fillRect(o + TILE * 0.32 - 1, 0, 1, TILE * 0.5);
      // 苔点
      c.fillStyle = "rgba(70,110,70,.22)";
      for (let i = 0; i < 5; i++) c.fillRect(o + rnd(2, TILE - 4, i + 231), rnd(2, TILE - 4, i + 237), 1.4, 1.4);
      shadeFloor(o, 0, 4);
    }
    /** [2] 木地板：深棕木板 + 木纹 + 钉眼 + 磨痕 */
    { const o = TILE * 2; c.fillStyle = "#241a12"; c.fillRect(o, 0, TILE, TILE);
      for (let i = 0; i < 34; i++) {
        const g = rnd(5, 34, i + 301);
        c.fillStyle = `rgba(${118 + g | 0},${86 + g | 0},${52 + g | 0},${rnd(0.06, 0.16, i + 307)})`;
        c.fillRect(o + rnd(1, TILE - 3, i + 313), rnd(1, TILE - 3, i + 317), rnd(1.5, 4, i + 319), 1.1);
      }
      // 纵向木纹条
      c.fillStyle = "rgba(0,0,0,.22)";
      for (let i = 0; i < 3; i++) c.fillRect(o + 5 + i * (TILE / 3), 1, 1, TILE - 2);
      // 木板横拼缝
      c.fillStyle = "rgba(0,0,0,.4)";
      c.fillRect(o, TILE * 0.62, TILE, 1.6);
      // 钉眼
      c.fillStyle = "rgba(20,14,8,.75)";
      for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(o + rnd(3, TILE - 3, i + 331), rnd(3, TILE - 3, i + 337), 1.1, 0, 6.28); c.fill(); }
      shadeFloor(o, 0, 3);
    }
    /** [3] 沙地地板：土黄细沙 + 砂粒 + 波纹 */
    { const o = TILE * 3; c.fillStyle = "#2a2115"; c.fillRect(o, 0, TILE, TILE);
      for (let i = 0; i < 70; i++) {
        const g = rnd(4, 30, i + 401);
        c.fillStyle = `rgba(${150 + g | 0},${128 + g | 0},${76 + g | 0},${rnd(0.06, 0.2, i + 407)})`;
        c.fillRect(o + rnd(1, TILE - 2, i + 413), rnd(1, TILE - 2, i + 417), 1.1, 1.1);
      }
      // 风速波纹（横向细弧）
      c.strokeStyle = "rgba(120,100,60,.25)"; c.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        const yy = rnd(5, TILE - 6, i + 431);
        c.beginPath(); c.moveTo(o + 3, yy);
        c.quadraticCurveTo(o + TILE * 0.5, yy + rnd(-2, 2, i + 437), o + TILE - 3, yy);
        c.stroke();
      }
      shadeFloor(o, 0, 2);
    }
    /** [4] 水面地板：深蓝水面 + 波纹高光 + 湿润反光 */
    { const o = TILE * 4; c.fillStyle = "#0d1722"; c.fillRect(o, 0, TILE, TILE);
      for (let i = 0; i < 30; i++) {
        c.fillStyle = `rgba(${46 + rnd(0,22,i+501)|0},${84 + rnd(0,26,i+507)|0},${130 + rnd(0,22,i+513)|0},${rnd(0.1,0.28,i+517)})`;
        c.fillRect(o + rnd(1, TILE - 3, i + 523), rnd(1, TILE - 3, i + 527), rnd(2, 6, i + 531), 1.2);
      }
      // 波纹曲线（横向，有波峰高光）
      c.strokeStyle = "rgba(150,200,255,.25)"; c.lineWidth = 1;
      for (let i = 0; i < 4; i++) {
        const yy = rnd(4, TILE - 6, i + 541);
        c.beginPath(); c.moveTo(o + 2, yy);
        c.quadraticCurveTo(o + TILE * 0.5, yy + rnd(-3, 3, i + 547), o + TILE - 2, yy);
        c.stroke();
      }
      // 波峰小高光点
      c.fillStyle = "rgba(190,225,255,.35)";
      for (let i = 0; i < 6; i++) c.fillRect(o + rnd(2, TILE - 3, i + 551), rnd(2, TILE - 4, i + 557), 1.4, 1);
      shadeFloor(o, 0, 1);
    }
    /** [5] 苔藓地：暗绿湿苔 + 苔斑 + 草叶 */
    { const o = TILE * 5; c.fillStyle = "#16201a"; c.fillRect(o, 0, TILE, TILE);
      for (let i = 0; i < 60; i++) {
        const g = rnd(4, 26, i + 601);
        c.fillStyle = `rgba(${56 + g | 0},${104 + g | 0},${62 + g | 0},${rnd(0.08, 0.2, i + 607)})`;
        c.fillRect(o + rnd(1, TILE - 3, i + 613), rnd(1, TILE - 3, i + 617), rnd(1.5, 4, i + 631), 1.3);
      }
      // 苔斑团
      c.fillStyle = "rgba(70,120,74,.25)";
      for (let i = 0; i < 3; i++) { c.beginPath();
        c.arc(o + rnd(4, TILE - 4, i + 641), rnd(4, TILE - 4, i + 647), rnd(3, 7, i + 651), 0, 6.28); c.fill(); }
      // 细草叶（竖短线）
      c.strokeStyle = "rgba(120,170,110,.5)"; c.lineWidth = 1;
      for (let i = 0; i < 8; i++) {
        const gx = o + rnd(2, TILE - 2, i + 661), gy = rnd(2, TILE - 4, i + 667);
        c.beginPath(); c.moveTo(gx, gy); c.lineTo(gx + rnd(-1,1,i+671), gy - rnd(2,4,i+677)); c.stroke();
      }
      shadeFloor(o, 0, 1);
    }

    /** [6] 立体墙：墙基 + 砖缝 + 斑驳 + 苔藓 + 底部阴影 + 顶部高光（伪 3D） */
    { const o = TILE * 6; c.fillStyle = "#2a3340"; c.fillRect(o, 0, TILE, TILE);
      // 砖块 2 横 + 交错竖缝（墙顶两排砖，中下部密缝）
      c.fillStyle = "rgba(8,11,16,.85)";
      c.fillRect(o, TILE * 0.30, TILE, 2);   // 排缝
      c.fillRect(o, TILE * 0.62, TILE, 2);
      c.fillRect(o, TILE * 0.92, TILE, 1.5);
      c.fillRect(o + TILE * 0.24, 0, 2, TILE * 0.30);
      c.fillRect(o + TILE * 0.56, 0, 2, TILE * 0.30);
      c.fillRect(o + TILE * 0.12, TILE * 0.30, 2, TILE * 0.32);
      c.fillRect(o + TILE * 0.44, TILE * 0.30, 2, TILE * 0.32);
      c.fillRect(o + TILE * 0.72, TILE * 0.30, 2, TILE * 0.32);
      c.fillRect(o + TILE * 0.30, TILE * 0.62, 2, TILE * 0.30);
      c.fillRect(o + TILE * 0.62, TILE * 0.62, 2, TILE * 0.30);
      // 砖面噪点/斑驳
      for (let i = 0; i < 34; i++) {
        c.fillStyle = `rgba(${90 + rnd(0,50,i+701)|0},${108 + rnd(0,50,i+707)|0},${146 + rnd(0,40,i+713)|0},${rnd(0.05,0.16,i+717)})`;
        c.fillRect(o + rnd(1, TILE - 2, i + 723), rnd(1, TILE - 2, i + 727), rnd(1.5, 4, i + 731), 1.2);
      }
      // 苔藓/污渍斑（墙体也长青苔，呼应苔藓地）
      c.fillStyle = "rgba(76,110,74,.22)";
      for (let i = 0; i < 4; i++) { c.beginPath();
        c.arc(o + rnd(3, TILE - 3, i + 741), rnd(TILE * 0.3, TILE * 0.9, i + 747), rnd(1.5, 4, i + 751), 0, 6.28); c.fill(); }
      // 底部阴影渐变（墙脚压暗，与地板衔接更立体）
      const footG = c.createLinearGradient(o, TILE * 0.6, o, TILE);
      footG.addColorStop(0, "rgba(0,0,0,0)");
      footG.addColorStop(1, "rgba(0,0,0,.42)");
      c.fillStyle = footG; c.fillRect(o, TILE * 0.6, TILE, TILE * 0.4);
      // 顶部受光边（斜光感）+ 顶沿高光
      c.fillStyle = "rgba(150,180,215,.38)";
      c.fillRect(o, 0, TILE, 2); c.fillRect(o, 0, 2, TILE);
      c.fillStyle = "rgba(200,225,250,.5)";
      c.fillRect(o, 0, TILE, 1);
    }
    /** [7] 设备 I（不透明底，绘制时再叠设备图形） */
    { const o = TILE * 7; c.fillStyle = "#0e1116"; c.fillRect(o, 0, TILE, TILE); }

    /* ================= 第 1 行 · 环境装饰精灵（叠到地板格上） ================= */
    { const oy = TILE;
      // [0] 血渍
      c.save(); c.translate(0, oy);
      c.fillStyle = "rgba(110,12,12,.55)";
      for (let i = 0; i < 8; i++) { c.beginPath();
        c.arc(rnd(3, TILE - 3, i + 805), rnd(3, TILE - 3, i + 807), rnd(2, 6, i + 811), 0, 6.28); c.fill(); }
      c.fillStyle = "rgba(150,30,20,.35)";
      for (let i = 0; i < 4; i++) { c.beginPath();
        c.arc(rnd(6, TILE - 6, i + 825), rnd(6, TILE - 6, i + 827), rnd(1, 3, i + 831), 0, 6.28); c.fill(); }
      c.restore();
      // [1] 裂痕（大折线，碎石感）
      c.save(); c.translate(TILE, oy);
      c.strokeStyle = "rgba(5,8,14,.5)"; c.lineWidth = 1.6;
      c.beginPath(); c.moveTo(3, TILE - 3); c.lineTo(TILE * 0.35, TILE * 0.55);
      c.lineTo(TILE * 0.5, TILE * 0.62); c.lineTo(TILE * 0.68, TILE * 0.3); c.lineTo(TILE - 4, TILE * 0.18); c.stroke();
      c.strokeStyle = "rgba(160,170,190,.28)"; c.lineWidth = 1;
      c.beginPath(); c.moveTo(4, TILE - 2); c.lineTo(TILE * 0.36, TILE * 0.57); c.stroke();
      c.restore();
      // [2] 碎石（几粒小石块）
      c.save(); c.translate(TILE * 2, oy);
      c.fillStyle = "rgba(96,102,118,.5)";
      for (let i = 0; i < 6; i++) c.fillRect(rnd(2, TILE - 5, i + 841), rnd(2, TILE - 5, i + 847), rnd(2, 4.5, i + 851), rnd(1.5, 3, i + 855));
      c.fillStyle = "rgba(160,172,190,.4)";
      for (let i = 0; i < 4; i++) c.fillRect(rnd(3, TILE - 5, i + 861), rnd(3, TILE - 5, i + 865), 1.4, 1);
      c.restore();
      // [3] 植被/杂草（草丛一簇）
      c.save(); c.translate(TILE * 3, oy);
      c.strokeStyle = "rgba(120,170,110,.6)"; c.lineWidth = 1.2;
      for (let i = 0; i < 9; i++) {
        const bx = rnd(4, TILE - 4, i + 871), by = rnd(TILE - 10, TILE - 3, i + 877);
        c.beginPath(); c.moveTo(bx, by); c.lineTo(bx + rnd(-2, 2, i + 881), by - rnd(4, 8, i + 885)); c.stroke();
      }
      c.fillStyle = "rgba(110,160,110,.35)";
      c.beginPath(); c.arc(TILE * 0.5 , TILE - rnd(4, 6, 891), rnd(4, 6, 895), 0, 6.28); c.fill();
      c.restore();
      // [4] 水渍/小水洼
      c.save(); c.translate(TILE * 4, oy);
      c.fillStyle = "rgba(40,80,130,.35)";
      c.beginPath(); c.ellipse(TILE * 0.5, TILE * 0.5, rnd(6, 10, 901), rnd(4, 7, 907), 0, 0, 6.28); c.fill();
      c.fillStyle = "rgba(150,200,255,.25)";
      c.beginPath(); c.ellipse(TILE * 0.42, TILE * 0.42, rnd(2, 4, 911), rnd(1, 2, 917), 0, 0, 6.28); c.fill();
      c.restore();
      // [5] 光斑（柔和亮斑，多用于氛围）
      c.save(); c.translate(TILE * 5, oy);
      const gg = c.createRadialGradient(TILE * 0.5, TILE * 0.5, 1, TILE * 0.5, TILE * 0.5, TILE * 0.55);
      gg.addColorStop(0, "rgba(220,240,255,.26)"); gg.addColorStop(1, "rgba(220,240,255,0)");
      c.fillStyle = gg; c.beginPath(); c.arc(TILE * 0.5, TILE * 0.5, TILE * 0.55, 0, 6.28); c.fill();
      c.restore();
      // [6] 灰尘/油污（暗色油环 + 微尘点）
      c.save(); c.translate(TILE * 6, oy);
      c.strokeStyle = "rgba(30,26,18,.4)"; c.lineWidth = 2;
      c.beginPath(); c.arc(TILE * 0.5, TILE * 0.5, rnd(4, 8, 921), 0, 6.28); c.stroke();
      c.fillStyle = "rgba(40,34,22,.3)";
      for (let i = 0; i < 5; i++) c.fillRect(rnd(2, TILE - 3, i + 931), rnd(2, TILE - 3, i + 937), 1.2, 1.2);
      c.restore();
    }

    /* ================= 第 2 行 · 道具图标精灵 ================= */
    { const oy = TILE * 2;
      // [0] 血瓶（小红瓶 + 高光）
      c.save(); c.translate(0, oy);
      c.fillStyle = "rgba(180,40,30,.9)"; c.fillRect(TILE * 0.4, TILE * 0.32, TILE * 0.2, TILE * 0.36);
      c.fillStyle = "rgba(120,20,16,.9)"; c.fillRect(TILE * 0.46, TILE * 0.2, TILE * 0.08, TILE * 0.14);
      c.fillStyle = "rgba(255,255,255,.35)"; c.fillRect(TILE * 0.42, TILE * 0.36, TILE * 0.04, TILE * 0.22);
      c.restore();
      // [1] 钥匙（金黄钥匙 + 齿）
      c.save(); c.translate(TILE, oy);
      c.strokeStyle = "#e8c24a"; c.lineWidth = 1.6;
      c.beginPath(); c.arc(TILE * 0.62, TILE * 0.36, TILE * 0.1, 0, 6.28); c.stroke();
      c.beginPath(); c.moveTo(TILE * 0.62, TILE * 0.46); c.lineTo(TILE * 0.5, TILE * 0.74); c.stroke();
      c.beginPath(); c.moveTo(TILE * 0.53, TILE * 0.68); c.lineTo(TILE * 0.47, TILE * 0.78); c.stroke();
      c.beginPath(); c.moveTo(TILE * 0.57, TILE * 0.72); c.lineTo(TILE * 0.52, TILE * 0.82); c.stroke();
      c.restore();
      // [2] 石碑（灰色带裂痕的石碑）
      c.save(); c.translate(TILE * 2, oy);
      c.fillStyle = "#8a94a6"; c.fillRect(TILE * 0.44, TILE * 0.18, TILE * 0.14, TILE * 0.44);
      c.fillRect(TILE * 0.4, TILE * 0.6, TILE * 0.22, TILE * 0.08);
      c.fillStyle = "rgba(240,245,255,.4)"; c.fillRect(TILE * 0.46, TILE * 0.2, TILE * 0.04, TILE * 0.4);
      c.fillStyle = "rgba(60,64,80,.6)"; c.fillRect(TILE * 0.5, TILE * 0.3, 1, TILE * 0.12);
      c.restore();
      // [3] 火把（木杆 + 火焰）
      c.save(); c.translate(TILE * 3, oy);
      c.fillStyle = "#6b4b2a"; c.fillRect(TILE * 0.49, TILE * 0.45, TILE * 0.05, TILE * 0.34);
      const fg = c.createRadialGradient(TILE * 0.5, TILE * 0.34, 1, TILE * 0.5, TILE * 0.34, TILE * 0.16);
      fg.addColorStop(0, "#ffd76a"); fg.addColorStop(0.6, "#f0943a"); fg.addColorStop(1, "rgba(240,120,40,0)");
      c.fillStyle = fg; c.beginPath(); c.arc(TILE * 0.5, TILE * 0.34, TILE * 0.16, 0, 6.28); c.fill();
      c.restore();
      // [4] 卷轴（皮革卷轴）
      c.save(); c.translate(TILE * 4, oy);
      c.fillStyle = "#b8a47a"; c.fillRect(TILE * 0.3, TILE * 0.38, TILE * 0.42, TILE * 0.16);
      c.fillStyle = "#8a7a58"; c.fillRect(TILE * 0.3, TILE * 0.3, TILE * 0.05, TILE * 0.32);
      c.fillRect(TILE * 0.67, TILE * 0.3, TILE * 0.05, TILE * 0.32);
      c.fillStyle = "rgba(60,50,30,.6)"; c.fillRect(TILE * 0.4, TILE * 0.4, TILE * 0.22, TILE * 0.05);
      c.restore();
      // [5] 草药（茎叶草束）
      c.save(); c.translate(TILE * 5, oy);
      c.fillStyle = "#3f6b3a"; c.fillRect(TILE * 0.46, TILE * 0.3, TILE * 0.05, TILE * 0.35);
      c.fillStyle = "#4f8a42";
      c.beginPath(); c.ellipse(TILE * 0.36, TILE * 0.32, TILE * 0.12, TILE * 0.04, -0.6, 0, 6.28); c.fill();
      c.beginPath(); c.ellipse(TILE * 0.6, TILE * 0.3, TILE * 0.1, TILE * 0.04, 0.4, 0, 6.28); c.fill();
      c.restore();
      // [6] 水晶（发光紫晶）
      c.save(); c.translate(TILE * 6, oy);
      const cg = c.createRadialGradient(TILE * 0.5, TILE * 0.45, 1, TILE * 0.5, TILE * 0.45, TILE * 0.3);
      cg.addColorStop(0, "rgba(190,140,255,.4)"); cg.addColorStop(1, "rgba(190,140,255,0)");
      c.fillStyle = cg; c.beginPath(); c.arc(TILE * 0.5, TILE * 0.45, TILE * 0.3, 0, 6.28); c.fill();
      c.fillStyle = "#b78ae8"; c.fillRect(TILE * 0.45, TILE * 0.22, TILE * 0.1, TILE * 0.4);
      c.fillRect(TILE * 0.32, TILE * 0.4, TILE * 0.28, TILE * 0.1);
      c.restore();
    }

    tileCache = bt;
  }

  // 地板 体素方块顶面 材质选择：确定性 hash 在 6 种材质间分桶（带世界种子轻微偏移）。
  // [0]金属板 [1]石板 [2]木地板 [3]沙地 [4]水面 [5]苔藓地 —— 分布权重近似：
  // 金属/石板最常见（走廊感），木/苔藓（室内丛林），沙/水（边缘/水洼）稀疏点缀。
  function floorTexSrc(x, y) {
    const seed = worldSeed;
    const h = (x * 73856093 + seed * 1000003) ^ (y * 19349663);
    const v = ((h % 100) + 100) % 100;
    if (v < 30) return 0;              // 金属板
    if (v < 52) return TILE;           // 石板
    if (v < 66) return TILE * 2;       // 木地板
    if (v < 78) return TILE * 5;       // 苔藓地
    if (v < 90) return TILE * 4;       // 水面（湿境）
    return TILE * 3;                   // 沙地
  }

  // 环境装饰确定性选择：给 `.`地板格 低概率点缀 7 类细节精灵（第 1 行缓存：[0]血渍 [1]裂痕
  // [2]碎石 [3]植被 [4]水渍 [5]光斑 [6]灰尘）。返回精灵格 x 索引，或 -1（无装饰）。
  // 概率受世界种子＋坐标 hash，稳定无逐帧抖动；零逐帧计算（结果只 drawImage）。
  function floorDeco(x, y) {
    const h = (x * 2654435761 + worldSeed) ^ (y * 40503);
    const v = ((h % 1000) + 1000) % 1000;
    // 总装饰密度 ~22%：90% 空置，其余落在 7 类上（光斑偏稀疏、碎石/灰尘偏密）
    if (v < 780) return -1;
    const type = (h % 100) >>> 0;
    if (type < 16) return 5;            // 光斑
    if (type < 32) return 4;            // 水渍/小水洼
    if (type < 50) return 3;            // 植被/杂草
    if (type < 68) return 1;            // 裂痕
    if (type < 82) return 0;            // 血渍
    if (type < 92) return 6;            // 灰尘/油污
    return 2;                           // 碎石
  }

  // 道具/调查点 → 图标精灵索引（第 2 行缓存：[0]血瓶 [1]钥匙 [2]石碑 [3]火把 [4]卷轴 [5]草药 [6]水晶）
  // 按名称关键字归一到图标；未命中则按名称 hash 稳定映射到一个图标（不再只靠文字标记）。
  const ICON_KEYWORDS = [
    ["vial", "blood", "血瓶", "血药", "血", "pot", "药剂", "药水"],                 // 0 血瓶
    ["key", "钥匙", "钥匙卡", "门卡", "id卡", "card", "通行", "签证"],             // 1 钥匙
    ["stele", "石碑", "碑", "铭文", "石刻", "tablet", "monument", "宿命", "命轨"], // 2 石碑
    ["torch", "火把", "火炬", "火柄", "lamp", "灯", "烛", "candle"],               // 3 火把/灯
    ["scroll", "卷轴", "笔记", "日记", "书函", "信", "paper", "text", "纸"],       // 4 卷轴
    ["herb", "草", "药草", "植物", "花", "seed", "种子", "herb"],                  // 5 草药
    ["crystal", "水晶", "晶", "宝石", "gem", "灵石", "晶石"],                      // 6 水晶
  ];
  function itemIconIdx(name) {
    const n = String(name || "");
    for (let i = 0; i < ICON_KEYWORDS.length; i++) {
      for (let k = 0; k < ICON_KEYWORDS[i].length; k++) {
        if (n.indexOf(ICON_KEYWORDS[i][k]) >= 0) return i;
      }
    }
    // 兜底：按名称 hash 稳定指定一个图标
    let h = 0;
    for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) >>> 0;
    return (h % 7);
  }
  // 在 (cx, cy) 处绘制道具图标精灵（第 2 行缓存 i 号，单色调暗底圆片承载）
  function drawItemIcon(cx, cy, idx, overlayT) {
    ctx.save();
    // 半透明暗底圆片（让图标在任意地板上都清楚）
    ctx.fillStyle = "rgba(8,10,16,.55)";
    ctx.beginPath(); ctx.arc(cx, cy + 1, 11, 0, 6.28); ctx.fill();
    ctx.strokeStyle = `rgba(255,220,120,${overlayT != null ? overlayT : 0.5})`;
    ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy + 1, 11, 0, 6.28); ctx.stroke(); ctx.lineWidth = 1;
    // 从缓存第 2 行裁出图标精灵
    const sw = 18, sy0 = TILE * 2 + (TILE - sw) / 2;
    ctx.drawImage(tileCache, idx * TILE + (TILE - sw) / 2, sy0, sw, sw, cx - sw / 2, cy - sw / 2, sw, sw);
    ctx.restore();
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
    ctx.drawImage(tileCache, TILE * 6, 0, t, t, sx, sy, t, t);
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
    // 世界种子（确定性随机种子，供地板材质/环境装饰分布）：用 world.name + floor_name 派生稳定 hash
    const seedStr = ((data.world && data.world.name) || "") + "|" + (data.floor_name || "") + (data.id || data.map_id || "");
    let sh = 2166136261;
    for (let i = 0; i < seedStr.length; i++) { sh ^= seedStr.charCodeAt(i); sh = Math.imul(sh, 16777619); }
    worldSeed = (sh >>> 0) % 100000;
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
    // 体素顶面上沿（drawFloor 内部用 topBase = y*TILE - blockH；装饰需对齐顶面 → sy - blockH）
    const floorTopY = (y) => y * TILE - P3D.blockH;
    for (let y = 0; y < data.h; y++) {
      const row = data.tiles[y] || "";
      for (let x = 0; x < data.w; x++) {
        const c = row[x] || "#";
        if (c === "#") continue;          // 墙留给第二遍
        const srcX = c === "I" ? TILE * 7 : floorTexSrc(x, y);
        drawFloor(x, y, srcX);
        // 环境装饰：`. `地板格（非设备 I）确定性点缀 7 类细节（血渍/裂痕/碎石/植被/水渍/光斑/灰尘）
        // —— 烘焙好的精灵 drawImage 叠加，零逐帧计算成本，仅观感 ——
        if (c !== "I" && isExplored(x, y)) {
          const dv = floorDeco(x, y);
          if (dv >= 0) {
            ctx.drawImage(tileCache, dv * TILE, TILE, TILE, TILE, x * TILE, floorTopY(y), TILE, TILE);
          }
        }
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
        // 道具图标精灵（顶替问号徽章——把「那是什么」直接画成对应图标：血瓶/钥匙/石碑/火把等）
        drawItemIcon(X, Y, itemIconIdx(p.name), 0.65);
        // 名称小字（图标下方保可读性）
        ctx.fillStyle = "rgba(255,215,106,.92)";
        ctx.font = "9px sans-serif"; ctx.textAlign = "center"; ctx.fillText(p.name || "", X, Y + 22);
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
      // 友好指示圈（蓝白同心弧，与敌人红环区分：友方/可交互目标定位）
      const nRing = 7 + Math.sin(now / 400 + n.x + n.y) * 1.2;
      const nra = now / 900 + n.x;
      ctx.strokeStyle = "rgba(140,190,255,.6)";
      ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(X, Y, nRing, nra, nra + 2.2); ctx.stroke();
      ctx.strokeStyle = "rgba(200,230,255,.35)";
      ctx.beginPath(); ctx.arc(X, Y, nRing + 3, nra + 3, nra + 5.4); ctx.stroke(); ctx.lineWidth = 1;
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
      // 地面指示圈 + 红光（敌人站位标记，强化「有怪在场」的氛围；红色同心圈随时间缓慢旋转）
      const ringPulse = 8 + Math.sin(now / 260 + a.phase) * 2;
      const rgr = ctx.createRadialGradient(X, Y, 1, X, Y, ringPulse + 4);
      rgr.addColorStop(0, "rgba(255,60,40,.28)");
      rgr.addColorStop(1, "rgba(255,60,40,0)");
      ctx.fillStyle = rgr;
      ctx.beginPath(); ctx.arc(X, Y, ringPulse + 4, 0, 6.28); ctx.fill();
      const ringA = now / 800 + a.phase;
      ctx.strokeStyle = "rgba(255,90,70,.55)";
      ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(X, Y, ringPulse, ringA, ringA + 2.4); ctx.stroke();
      ctx.strokeStyle = "rgba(255,150,120,.35)";
      ctx.beginPath(); ctx.arc(X, Y, ringPulse + 2.5, ringA + 3.14, ringA + 5.6); ctx.stroke(); ctx.lineWidth = 1;
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

    // ---------- 环境氛围层（可选、帧率友好）----------
    // 角落暗角 vignette：四角各一个软径向暗罩，景深/神秘感（固定开销，几笔渐变绘制）
    const vig = 90;
    const corners = [
      [0, 0, 1, 1], [W, 0, -1, 1], [0, H, 1, -1], [W, H, -1, -1]
    ];
    ctx.save();
    corners.forEach(([cx, cy, dx, dy]) => {
      const vg = ctx.createRadialGradient(cx, cy, vig * 0.2, cx, cy, vig);
      vg.addColorStop(0, "rgba(0,0,0,0)");
      vg.addColorStop(1, "rgba(2,2,8,.5)");
      ctx.fillStyle = vg;
      ctx.fillRect(cx + dx * vig * 0.1, cy + dy * vig * 0.1, vig, vig);
    });
    // 顶部整体微暗 + 四边内侧渐变暗边（收拢视野）
    const edgeG = ctx.createLinearGradient(0, 0, 0, vig * 0.6);
    edgeG.addColorStop(0, "rgba(0,0,0,.4)"); edgeG.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = edgeG; ctx.fillRect(0, 0, W, vig * 0.6);
    ctx.restore();

    // 尘埃/光斑粒子：固定 ~26 粒屏幕空间缓慢飘浮（性能恒定，不随地图增大）；光源方向模糊提亮
    if (!motes) {
      motes = [];
      for (let i = 0; i < 26; i++) {
        motes.push({ x: Math.random() * W, y: Math.random() * H, r: 0.6 + Math.random() * 1.6, phase: Math.random() * 6.28, sp: 0.12 + Math.random() * 0.3 });
      }
    }
    ctx.save();
    for (let i = 0; i < motes.length; i++) {
      const mt = motes[i];
      mt.y -= mt.sp * 0.02;
      mt.x += Math.sin(now / 2600 + mt.phase) * 0.08;
      if (mt.y < -4) { mt.y = H + 4; mt.x = Math.random() * W; }
      const a = 0.12 + 0.16 * (0.5 + 0.5 * Math.sin(now / 1500 + mt.phase * 2));
      const mg = ctx.createRadialGradient(mt.x, mt.y, 0.2, mt.x, mt.y, mt.r + 1);
      mg.addColorStop(0, `rgba(214,230,255,${a})`);
      mg.addColorStop(1, "rgba(214,230,255,0)");
      ctx.fillStyle = mg;
      ctx.beginPath(); ctx.arc(mt.x, mt.y, mt.r + 1, 0, 6.28); ctx.fill();
    }
    ctx.restore();
  }

  return { init, setData, setPlayer, keydown, keyup, start, stop, nearbyList, moveIntent,
    clearKeys: function () { keys = {}; },
    setDpr: function (x) { dprScale = Math.max(0.5, x || 1); }, // HiDPI:由 ResolutionSys 下发 devicePixelRatio
  };
})();

// 暴露到全局（index.html 先于 client.js 加载）
window.World2D = World2D;