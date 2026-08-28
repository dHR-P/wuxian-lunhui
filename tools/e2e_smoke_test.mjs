// ============================================================================
// 无限轮回 · 第一章 —— CDP 端到端冒烟测试（UI 交互层）
// 只读后端状态 + 跑前端,不改任何 src/ui 代码。
//
// 覆盖（7 项,逐项 try/catch,单项失败不打乱后续）：
//   1 启动/新局     点「进入轮回」→ api_nexus_enter → save.json world_id=zhutianshenkong
//   2 移动          api_world_move 走几步 → px/py 变化; 撞墙后坐标不变(不越界)
//   3 地图切换      gw_biohazard→biohazard_ch1; 回主神; gw_zhouyuan→zhuyuan; 断言 world_id
//   4 战斗          biohazard 走图撞敌人→encounter→enterZone→api_zone_action(attack) 若干回合→结算(不崩)
//   5 设置/分辨率   window.setResolution(720/1440) → getResolution 断言; 读 zone3d canvas pixelRatio(若可访问)
//   6 面板/HUD      world 模式检查 #hpVal/#sanVal/#ptsVal/#wpnVal/#locName; 结算出现时检查 #ovCard DOM
//   7 装备/兑换     (Phase2 种子存档) 主神 → 道具铺 → 买「紧急绷带」(220点) → inventory/points 变化
//
// 运行：node tools/e2e_smoke_test.mjs
// 输出：stdout + tools/artifacts/logs/e2e_smoke.log, 报告 tools/e2e_smoke_report.md
// ============================================================================
import { spawn, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', 'server-rs');
const EXE = path.join(ROOT, 'target', 'release', 'wuxian-horror-ch1.exe');
const DATA = path.join(ROOT, 'target', 'release', 'data');
const SAVE = path.join(DATA, 'save.json');
const LOG = path.join(__dirname, 'artifacts', 'logs', 'e2e_smoke_steps.log');
const PORT = 9702;

let PASS = 0, FAIL = 0, NOTES = [];
const results = []; // {id, name, pass, detail}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = s => { try { fs.appendFileSync(LOG, s + '\n'); } catch {} console.log(s); };
function runSync(cmd) { try { return execSync(cmd, { stdio: 'pipe' }).toString(); } catch { return ''; } }

function record(id, name, pass, detail) {
  results.push({ id, name, pass, detail });
  const d = String(detail ?? '').slice(0, 400);
  log(`${pass ? 'PASS' : 'FAIL'} [${id}] ${name} :: ${d}`);
  if (pass) PASS++; else FAIL++;
}

async function killPort() {
  try {
    const out = execSync(`netstat -ano | findstr :${PORT}`, { stdio: 'pipe' }).toString();
    for (const line of out.split(/\r?\n/)) {
      const m = line.trim().match(/(\d+)\s*$/);
      if (m) runSync(`taskkill /PID ${m[1]} /T /F 2>nul`);
    }
  } catch {}
  runSync('taskkill /IM wuxian-horror-ch1.exe /T /F 2>nul');
  await sleep(400);
}

function cleanLaunch() {
  const child = spawn(EXE, [], {
    env: { ...process.env, WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${PORT}` },
    stdio: 'ignore',
  });
  child.unref();
  return child;
}

// 种子存档:世界在生化、已通关 bh_cleared、points=8000(结构对齐真实 save.json)
function seedSave() {
  fs.mkdirSync(DATA, { recursive: true });
  const seed = {
    save_version: 2, world_id: 'biohazard_ch1',
    hp: 100, san: 80, points: 8000,
    weapon: 'Axe', ammo: 6,
    gene_lock: false, gene_lock_used: false,
    flags: { bh_cleared: true },
    dead_team: [], resurrected_name: null,
    scene_id: 's_train', px: 1, py: 1, floor: 0,
    laser_fails: 0, fight: null, zone: null,
    inventory: [], map_objs: {}, enemies_alive: {},
    explored: [], world_states: {},
    sp_grade: null, str_bonus: 0, agi_bonus: 0, bloodline: null,
    gene_stage: 0, qi: 0, qi_max: 0, inner_art: null, tech_shield: 0, tech_shield_max: 0,
    cultivation_stage: 0, cultivation_qi_max: 0, treasures: [], sect: null, skills: [],
    equipment: { weapon: null, armor: null, accessory: null, treasure: [null, null, null] },
    scaling_enabled: true,
  };
  fs.writeFileSync(SAVE, JSON.stringify(seed, null, 1), 'utf8');
}

async function getPage() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const list = await res.json();
      const page = list.find(p => p.type === 'page');
      if (page) return page;
    } catch {}
    await sleep(500);
  }
  throw new Error('CDP page not found');
}

let ws = null, nextId = 1;
async function connect(page) {
  ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
}
function disconnect() { try { ws && ws.close(); } catch {} ws = null; }
function send(o) { ws.send(JSON.stringify(o)); }
function evalJs(expression, timeout = 25000) {
  return new Promise((resolve, reject) => {
    const id = nextId++;
    const timer = setTimeout(() => { ws.removeEventListener('message', onMsg); reject(new Error('eval timeout: ' + expression.slice(0, 70))); }, timeout);
    function onMsg(ev) {
      let msg; try { msg = JSON.parse(ev.data); } catch { return; }
      if (msg.id !== id) return;
      clearTimeout(timer); ws.removeEventListener('message', onMsg);
      if (msg.error) return reject(new Error('cdp: ' + JSON.stringify(msg.error)));
      resolve(msg.result?.result?.value);
    }
    ws.addEventListener('message', onMsg);
    send({ id, method: 'Runtime.evaluate', params: { expression, returnByValue: true, awaitPromise: true } });
  });
}
const inv = (cmd, args) => evalJs(`(async function(){ try { return await window.__TAURI__.core.invoke(${JSON.stringify(cmd)}, ${JSON.stringify(args || {})}); } catch(e){ return { __err: String(e.message||e) }; } })()`);
const saveState = () => { try { return JSON.parse(fs.readFileSync(SAVE, 'utf8')); } catch { return null; } };

function clickNew() {
  return evalJs(`(function(){ const b=document.getElementById('btnNew'); if(b && b.offsetParent!==null){ b.click(); return 1; } return 0; })()`);
}
function clickBtnByText(kw) {
  return evalJs(`(function(){const kw=${JSON.stringify(kw)};const els=[...document.querySelectorAll('.menuBtns .mbtn')].filter(b=>b.offsetParent!==null);const h=els.find(b=>(b.innerText||'').replace(/\\s+/g,'').includes(kw));if(h){h.click();return 1;}return 0;})()`);
}
const zoneActiveQ = () => evalJs(`(function(){ return window.ZoneActive===true; })()`);

// ---------------- Phase 共享 driver 状态 ----------------
let world = null;
async function freshWorld() { world = await inv('api_world'); return world; }

// BFS 路径(直接从 tiles 推导 W/H,杜绝跨越层坐标越界)
function bfsPath(sx, sy, tx, ty, allowPortalFn) {
  const tiles = world.tiles || [];
  const H = tiles.length;
  const W = H > 0 ? (tiles[0] || '').length : 0;
  if (W === 0 || H === 0) return null;
  const inbound = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  const g = Array.from({ length: H }, () => Array(W).fill(false));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if ((tiles[y] || '')[x] === '#') g[y][x] = true;
  (world.gates || []).forEach(gt => { if (gt.locked && inbound(gt.x, gt.y)) g[gt.y][gt.x] = true; });
  (world.enemies || []).forEach(e => { if (e.alive && inbound(e.x, e.y)) g[e.y][e.x] = true; });
  (world.portals || []).forEach(p => { if (inbound(p.x, p.y) && !(allowPortalFn && allowPortalFn(p.x, p.y))) g[p.y][p.x] = true; });
  if (sx === tx && sy === ty) return [];
  const prev = Array.from({ length: H }, () => Array(W).fill(null));
  const dist = Array.from({ length: H }, () => Array(W).fill(-1));
  const q = [[sx, sy]]; dist[sy][sx] = 0;
  while (q.length) {
    const [x, y] = q.shift();
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const nx = x + dx, ny = y + dy;
      if (!inbound(nx, ny)) continue;
      if (g[ny][nx] || dist[ny][nx] >= 0) continue;
      dist[ny][nx] = dist[y][x] + 1; prev[ny][nx] = [x, y];
      q.push([nx, ny]);
      if (nx === tx && ny === ty) { const p = []; let cur = [tx, ty]; while (cur) { p.unshift(cur); cur = prev[cur[1]][cur[0]]; } return p; }
    }
  }
  return null;
}
async function rawMove(dx, dy) { return await inv('api_world_move', { dx, dy }); }

// ============================================================================
// 测试体
// ============================================================================
async function test_new_and_nexus() {
  // 1. 启动/新局:点「进入轮回」→ api_new → 生化世界; api_nexus_enter → 主神
  const clicked = await clickNew();
  if (clicked) await sleep(1800); else await sleep(500);
  let st = saveState();
  const w = await inv('api_world');
  const enterOk = st && st.world_id === 'biohazard_ch1' && w && w.px !== undefined;
  if (!enterOk) {
    record('1', '启动/新局:进入轮回→生化世界', false, `btnNew=${clicked} world=${st && st.world_id}`);
  } else {
    const ne = await inv('api_nexus_enter');
    st = saveState();
    const nx = st && st.world_id === 'zhutianshenkong';
    record('1', '启动/新局:进入轮回→生化→主神(world_id=zhutianshenkong)', !!nx,
      `world=${st && st.world_id} px=${st && st.px} py=${st && st.py} nexusEnterErr=${ne && ne.__err || 'none'}`);
  }
}

async function test_movement() {
  // 2. 移动:在主神空间走几步断言 px/py 变化; 撞墙后坐标不变
  await freshWorld();
  if (!world || world.px === undefined) { record('2', '移动', false, 'no_world'); return; }
  const sx = world.px, sy = world.py;
  // 找一个相对空阔方向,走 2-3 步
  let movedIdx = -1;
  let ctx = null;
  const dirs = [[1,0],[-1,0],[0,1],[0,-1], [1,0],[-1,0]];
  let cur = world;
  for (let i = 0; i < 6; i++) {
    const [dx, dy] = dirs[i];
    const tile = (cur.tiles && cur.tiles[sy] && cur.tiles[sy][sx]); // 从起点估
    const r = await rawMove(dx, dy);
    if (r && r.ok && (r.px !== sx || r.py !== sy)) { movedIdx = i; ctx = r; break; }
  }
  const after = await inv('api_world');
  const moved = after && (after.px !== sx || after.py !== sy);
  record('2', '移动:api_world_move 改变 px/py', moved,
    `(${sx},${sy})->(${(after && after.px)} , ${(after && after.py)}) step=${movedIdx}`);

  // 撞墙:BFS 到一个紧邻 '#' 墙的可走格,再走进墙,断言坐标不变(不越界)
  await freshWorld();
  let wallBlocked = false, wallDetail = 'no_wall_found';
  if (world && world.tiles) {
    const W = world.w, H = world.h;
    const findWallAdj = () => {
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if ((world.tiles[y] || '')[x] === '#') {
          for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
            const ax = x + dx, ay = y + dy;
            if (ax >= 0 && ay >= 0 && ax < W && ay < H && (world.tiles[ay] || '')[ax] !== '#') {
              return { wallX: x, wallY: y, adjX: ax, adjY: ay, dir: [-dx, -dy] };
            }
          }
        }
      }
      return null;
    };
    const wallSpot = findWallAdj();
    if (wallSpot) {
      // BFS 到墙旁可走格
      let guard = 0;
      while (guard++ < 300 && (world.px !== wallSpot.adjX || world.py !== wallSpot.adjY)) {
        const p = bfsPath(world.px, world.py, wallSpot.adjX, wallSpot.adjY, null);
        if (!p || p.length === 0) break;
        const [tx2, ty2] = p.length > 1 ? p[1] : p[0];
        await rawMove(tx2 - world.px, ty2 - world.py);
        await freshWorld();
      }
      if (world.px === wallSpot.adjX && world.py === wallSpot.adjY) {
        const bx = world.px, by = world.py;
        const wdx = wallSpot.wallX - world.px, wdy = wallSpot.wallY - world.py;
        const r = await rawMove(wdx, wdy);
        await freshWorld();
        const unchanged = world.px === bx && world.py === by;
        wallBlocked = unchanged && r && !r.ok;
        wallDetail = `走到墙旁(${bx},${by}) 撞墙(${wdx},${wdy}) 坐标不变=${unchanged} ok=${r && r.ok}`;
      } else {
        wallDetail = `无法走到墙旁 @(${world.px},${world.py})`;
      }
    }
  }
  record('2b', '移动:撞墙不越界', wallBlocked, wallDetail);
}

async function test_map_switch() {
  // 3. 地图切换:gw_biohazard → biohazard_ch1; 回主神; gw_zhouyuan → zhuyuan
  await freshWorld();
  const fromMain = world && world.world?.id === 'zhutianshenkong';
  if (!fromMain) { // 确保在主神
    await inv('api_nexus_enter'); await sleep(600);
    await freshWorld();
  }
  // 生化
  const bh = await inv('api_world_interact', { objId: 'gw_biohazard' });
  let st = saveState();
  const toBH = st && st.world_id === 'biohazard_ch1';
  record('3', '地图切换:gw_biohazard→biohazard_ch1', !!toBH, `world=${st && st.world_id} ${bh && bh.__err || ''}`);
  // 回主神
  await inv('api_nexus_enter'); await sleep(600); st = saveState();
  const backMain = st && st.world_id === 'zhutianshenkong';
  record('3b', '地图切换:api_nexus_enter 回主神', !!backMain, `world=${st && st.world_id}`);
  // 切 zhouyuan
  if (backMain) {
    const zy = await inv('api_world_interact', { objId: 'gw_zhouyuan' });
    st = saveState();
    const toZy = st && st.world_id === 'zhuyuan';
    record('3c', '地图切换:gw_zhouyuan→zhuyuan', !!toZy, `world=${st && st.world_id} ${zy && zy.__err || ''}`);
    await inv('api_nexus_enter'); // 切回主神,供后续项用
  }
}

async function test_battle() {
  // 4. 战斗:切到生化世界,走图撞敌人触发 encounter → api_world_interact(敌id) 进 zone →
  //    api_zone_action(attack) 若干回合 → 结算(win/dead 均算通过,只要不崩)
  await freshWorld();
  if (!(world && world.world && world.world.id === 'biohazard_ch1')) {
    await inv('api_world_interact', { objId: 'gw_biohazard' });
    await sleep(1200); await freshWorld();
  }
  if (!world || world.px === undefined) { record('4', '战斗', false, 'no_world'); return; }

  // 找 3 个存活敌人(优先同层易达),逐个尝试: BFS 到其可走邻格 → 踩上敌格触发 encounter
  const targets = (world.enemies || []).filter(e => e.alive);
  let hitEnemy = null, moves = 0, enteredZone = false;
  const attemptEnemy = async (e) => {
    const near = [[e.x-1,e.y],[e.x+1,e.y],[e.x,e.y-1],[e.x,e.y+1]]
      .filter(([x,y]) => {
        const t = (world.tiles[y] || '')[x]; if (!t || t === '#') return false;
        if ((world.gates || []).some(g => g.locked && g.x === x && g.y === y)) return false;
        if ((world.enemies || []).some(o => o.alive && o.x === x && o.y === y)) return false;
        return true;
      });
    for (const [nx, ny] of near) {
      let guard = 0;
      while (guard++ < 400) {
        await freshWorld();
        if (!world) return false;
        if (world.px === nx && world.py === ny) break;
        const p = bfsPath(world.px, world.py, nx, ny, null);
        if (!p || p.length === 0) break;
        const [tx2, ty2] = p.length > 1 ? p[1] : p[0];
        const r = await rawMove(tx2 - world.px, ty2 - world.py);
        moves++;
        if (r && r.encounter) { hitEnemy = r.encounter.enemy_id; return true; }
        await freshWorld();
      }
      if (world && world.px === nx && world.py === ny) {
        // 已到邻格,踩上敌格
        const r = await rawMove(e.x - world.px, e.y - world.py);
        if (r && r.encounter) { hitEnemy = r.encounter.enemy_id; return true; }
      }
    }
    return false;
  };
  for (const e of targets.slice(0, 4)) {
    if (await attemptEnemy(e)) { enteredZone = true; break; }
    await freshWorld();
    if (!world) break;
  }

  record('4', '战斗:走图撞敌人触发 encounter', !!hitEnemy, `hitEnemy=${hitEnemy} moves=${moves}`);
  if (!hitEnemy) { await inv('api_nexus_enter'); return; }

  // 进 zone(后端):api_world_interact(敌id) 设 save.json.zone
  const zi = await inv('api_world_interact', { objId: hitEnemy });
  let st = saveState();
  const inZone = st && !!st.zone;
  record('4b', '战斗:api_world_interact 进副本(zone 置位)', !!inZone,
    `zone=${inZone ? st.zone.zone_id : 'null'} respErr=${zi && zi.__err || ''}`);

  // 攻击若干回合 → 结算
  let finalResp = null, rounds = 0;
  let curZone = st && st.zone;
  while (curZone && rounds < 25) {
    finalResp = await inv('api_zone_action', { action: 'attack', arg: 0 });
    rounds++;
    await sleep(350);
    st = saveState();
    curZone = st && st.zone;
    if (finalResp && (finalResp.win || finalResp.dead)) break;
  }
  const zoneClosed = !(saveState() && saveState().zone);
  const won = finalResp && finalResp.win === true;
  const died = finalResp && finalResp.dead === true;
  const enc = saveState();
  const noActiveFight = !enc || !enc.fight || (enc.zone === null || enc.zone === undefined);
  const settleOk = !!(zoneClosed && (won || died || !enc.fight));
  record('4c', '战斗:api_zone_action 攻击若干回合→结算(won/dead/不崩)', settleOk,
    `rounds=${rounds} zoneClosed=${zoneClosed} won=${won} dead=${died} world=${enc && enc.world_id} hp=${enc && enc.hp} resp=${JSON.stringify(finalResp).slice(0,110)}`);
  await inv('api_nexus_enter'); // 回主神(若在生化);死亡则在死亡档案,不强求
  await inv('api_scene_back').catch(()=>{}); // 若死亡卡,返回
}

async function test_resolution() {
  // 5. 设置/分辨率:window.setResolution(720/1440) → getResolution 断言
  await evalJs(`(async function(){ if(typeof window.setResolution==='function'){ window.setResolution(720); return true; } return false; })()`);
  await sleep(200);
  const g1 = await evalJs(`(function(){ return typeof window.getResolution==='function' ? window.getResolution() : null; })()`);
  const r720 = g1 === 720;
  record('5', '设置:setResolution(720)→getResolution()=720', r720, `got=${g1}`);

  await evalJs(`(async function(){ if(typeof window.setResolution==='function'){ window.setResolution(1440); return true; } return false; })()`);
  await sleep(200);
  const g2 = await evalJs(`(function(){ return typeof window.getResolution==='function' ? window.getResolution() : null; })()`);
  const r1440 = g2 === 1440;
  record('5b', '设置:setResolution(1440)→getResolution()=1440', r1440, `got=${g2}`);

  // 读 zone3d/canvas pixelRatio(若能访问 window 内部状态)
  let dprDetail = 'n/a';
  const zr = await evalJs(`(function(){
    const c = document.getElementById('zone3dContainer');
    const canvas = c && c.querySelector('canvas');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      return { hasCanvas: true, w: canvas.width, h: canvas.height,
               ratio: canvas.width / (canvas.clientWidth || 1),
               dpr: window.devicePixelRatio || 1 };
    }
    return { hasCanvas: false };
  })()`).catch(() => null);
  if (zr && zr.hasCanvas) {
    dprDetail = `canvas=${zr.w}x${zr.h} ratio≈${(zr.ratio||0).toFixed(2)} dpr=${zr.dpr}`;
  }
  record('5c', '设置:zone3d canvas pixelRatio 检查', true, dprDetail);
}

async function test_hud_dom() {
  // 6. 面板/HUD:world 模式检查 HUD 元素存在; (结算卡 DOM 在 battle 里顺带检查) 
  await freshWorld();
  if (!(world && world.world && world.world.id === 'zhutianshenkong')) {
    await inv('api_nexus_enter'); await sleep(600);
  }
  const h = await evalJs(`(function(){
    const ids = ['hpVal','sanVal','ptsVal','wpnVal','locName'];
    const el = id => document.getElementById(id);
    return { hudDisplay: (el('hud')||{}).style && (el('hud')||{}).style.display,
             present: ids.filter(id => !!el(id)).length, total: ids.length };
  })()`).catch(() => null);
  const hudOk = h && h.present === h.total;
  record('6', '面板/HUD:HUD 元素存在+world 模式可见', hudOk, JSON.stringify(h));
}

async function test_exchange() {
  // 7. 装备/兑换(Phase2 种子存档):继续上次 → api_nexus_enter → 道具铺 → 买「紧急绷带」
  // 点「继续上次」
  const c = await clickBtnByText('继续');
  if (!c) await sleep(400);
  await sleep(1500);
  let st = saveState();
  if (!st || st.world_id !== 'biohazard_ch1') { record('7', '装备/兑换:继续→生化世界', false, `world=${st && st.world_id}`); return; }
  // 进主神
  await inv('api_nexus_enter'); await sleep(600); st = saveState();
  if (!st || st.world_id !== 'zhutianshenkong') { record('7', '装备/兑换:进主神', false, `world=${st && st.world_id}`); return; }
  const points0 = st.points;
  // 走兑换光球 NPC → 兑换场景
  const ex = await inv('api_world_interact', { objId: 'np_exchange_strengthen' });
  const exScene = ex && ex.scene;
  const goto = exScene ? await inv('api_scene_goto', { sceneId: exScene }) : null;
  // 找「道具铺」选项
  let shopIdx = -1;
  const sLabels = ((goto && goto.choices) || []).map((c2, i) => ({ i, label: String(c2.label || '') }));
  shopIdx = sLabels.findIndex(o => o.label.includes('道具铺'));
  if (shopIdx < 0) { record('7', '装备/兑换:兑换目录含道具铺', false, JSON.stringify(sLabels.map(o=>o.label))); return; }
  record('7', '装备/兑换:主神兑换目录含道具铺入口', true, `points0=${points0}`);
  // 进道具铺
  const shopView = await inv('api_choose', { index: shopIdx });
  const shopChoices = ((shopView && shopView.choices) || []).map((c2, i) => ({ i, label: String(c2.label || '') }));
  // 找「紧急绷带」(item_bandage, 220 点, 无门槛)
  const bandage = shopChoices.find(o => o.label.includes('紧急绷带'));
  if (!bandage) { record('7', '装备/兑换:道具铺含紧急绷带', false, JSON.stringify(shopChoices.map(o=>o.label))); return; }
  const buy = await inv('api_choose', { index: bandage.i });
  st = saveState();
  const invHasBandage = (st.inventory || []).some(i => i.startsWith('item_bandage'));
  const pointsDelta = points0 - st.points;
  const wantDelta = 220;
  const ok = invHasBandage && pointsDelta === wantDelta && buy && !buy.__err;
  record('7', '装备/兑换:购买紧急绷带后 inventory/points 变化', ok,
    `inventory追加=${invHasBandage} points ${st.points} 扣${pointsDelta}(期望${wantDelta}) resp=${JSON.stringify(buy).slice(0,120)}`);
  await inv('api_scene_back');
}

// ============================================================================
// 主流程
// ============================================================================
async function main() {
  fs.rmSync(SAVE, { force: true });
  fs.rmSync(LOG, { force: true });
  let child = null;

  // ---- Phase 1: 干净新局 → 项 1~6 ----
  await killPort();
  child = cleanLaunch();
  let page;
  try { page = await getPage(); } catch (e) { console.error('FATAL getPage phase1:', e.message); process.exit(2); }
  await connect(page);
  await sleep(3500);

  const ready = await evalJs(`document.readyState`).catch(() => '?');
  const title = await evalJs('document.title').catch(() => '?');
  log(`UI ready; readyState=${ready}; title=${title}`);
  log('window funcs: ' + JSON.stringify(await evalJs(`(function(){return {invoke:typeof window.__TAURI__ && typeof window.__TAURI__.core && typeof window.__TAURI__.core.invoke, setRes:typeof window.setResolution, Z3D:!!window.Zone3D};})()`).catch(()=>null)));

  // 项序: 1 新局→主神; 2 移动(主神); 3 地图切换; 4 战斗(生化); 5 分辨率; 6 HUD
  await test_new_and_nexus();     // 现在应在主神
  await test_movement();          // 主神移动
  await test_map_switch();        // 生化 → 主神 → zhuyuan → 主神
  await test_battle();            // 生化战斗, 结束后回主神(或死亡档案)
  await test_resolution();
  await test_hud_dom();
  disconnect(); child.kill(); await sleep(800);

  // ---- Phase 2: 种子存档 points=8000 → 项 7 ----
  fs.rmSync(SAVE, { force: true });
  seedSave();
  await killPort();
  child = cleanLaunch();
  try { page = await getPage(); } catch (e) { console.error('FATAL getPage phase2:', e.message); process.exit(2); }
  await connect(page);
  await sleep(3500);
  await test_exchange();
  disconnect(); child.kill();

  // ---- 汇总 ----
  log(`\n===== E2E 冒烟测试完成 PASS=${PASS} FAIL=${FAIL} =====`);
  console.log(`\n===== E2E 冒烟测试 PASS=${PASS} FAIL=${FAIL} =====`);
  for (const r of results) console.log(`  ${r.pass ? 'PASS' : 'FAIL'} [${r.id}] ${r.name}`);
  process.exit(FAIL > 0 ? 1 : 0);
}

main().catch(e => { try { log('FATAL ' + (e.stack || e.message)); } catch {} console.error('FATAL', e); process.exit(2); });