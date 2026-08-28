// 3D 战斗连拍 v3：严格按「遭遇」正确路径——连续 api_world_move 走向敌人格子，撞到返回 r.encounter，
// 触发前端 enterZone → Zone3D 三人称 3D 战斗；连拍 6 张（对峙/攻击/闪避/受击不同帧）。
// 目标：floor0 近敌 e_f1_z1(7,6) 站台丧尸（spawn @1,1，无需跨层）。
import { spawn, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', 'server-rs');
const EXE = path.join(ROOT, 'target', 'release', 'wuxian-horror-ch1.exe');
const SAVE = path.join(ROOT, 'target', 'release', 'data', 'save.json');
const OUT = path.join(__dirname, 'artifacts', 'shots');
const LOG = path.join(__dirname, 'logs', 'shot_fight_3d.log');
const PORT = 9702;
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(path.dirname(LOG), { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = s => { fs.appendFileSync(LOG, s + '\n'); console.log(s); };

// 目标敌人：F1(floor 0) 低血丧尸(34hp) 两次攻击就死，导致后几帧退出 3D；
// 改打高血 BOSS 舔食者 e_licker(112hp, floor:1 @35,22)，才能撑住 6 张连拍。
// maps.rs ENEMIES: e_licker floor:1 x:35 y:22 fight:licker(112hp)；floor0→1 走 pt_stairs_down(3,20)。
const TARGET = { id: 'e_licker', name: '舔食者', floor: 1, x: 35, y: 22, fight: 'licker', hp: 112 };

function cleanLaunch() {
  try { execSync('taskkill /IM wuxian-horror-ch1.exe /T /F 2>nul', { stdio: 'pipe' }); } catch {}
  try {
    const out = execSync(`netstat -ano | findstr :${PORT}`, { stdio: 'pipe' }).toString();
    for (const line of out.split(/\r?\n/)) {
      const m = line.trim().match(/(\d+)\s*$/);
      if (m) try { execSync(`taskkill /PID ${m[1]} /T /F 2>nul`, { stdio: 'pipe' }); } catch {}
    }
  } catch {}
  fs.rmSync(SAVE, { force: true });
  const child = spawn(EXE, [], {
    env: { ...process.env, WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${PORT}` },
    stdio: 'ignore',
  });
  child.unref();
  return child;
}
async function getPage() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const list = await r.json();
      const p = list.find(x => x.type === 'page');
      if (p) return p;
    } catch {}
    await sleep(500);
  }
  throw new Error('page not found');
}
let ws, nextId = 1;
async function connect(page) {
  ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
}
function send(o) { ws.send(JSON.stringify(o)); }
function cdp(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = nextId++;
    const timer = setTimeout(() => reject(new Error('cdp timeout ' + method)), 25000);
    const onMsg = ev => {
      let m; try { m = JSON.parse(ev.data); } catch { return; }
      if (m.id !== id) return;
      clearTimeout(timer); ws.removeEventListener('message', onMsg);
      m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result);
    };
    ws.addEventListener('message', onMsg);
    send({ id, method, params });
  });
}
async function evalJs(expression, timeout = 25000) {
  const r = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true });
  if (r.exceptionDetails) throw new Error('eval exc: ' + JSON.stringify(r.exceptionDetails).slice(0, 400));
  return r.result?.value;
}
const inv = (cmd, args) => evalJs(`(async function(){ try { return await window.__TAURI__.core.invoke(${JSON.stringify(cmd)}, ${JSON.stringify(args || {})}); } catch(e){ return {__err:String(e.message||e)}; } })()`);
const zoneActiveQ = () => evalJs(`(function(){return window.ZoneActive===true;})()`);
const readSave = () => { try { return JSON.parse(fs.readFileSync(SAVE, 'utf8')); } catch { return null; } };

let world = null;
async function freshWorld() { world = await inv('api_world'); return world; }

// 前端世界函数可用性
async function frontReady() {
  return await evalJs(`(function(){
    return { move: typeof window.worldMove==='function', interact: typeof window.worldInteract==='function',
             zone: typeof window.enterZone==='function', zone3d: !!window.Zone3D };
  })()`);
}

async function shot(name) {
  const r = await cdp('Page.captureScreenshot', { format: 'png' });
  const p = path.join(OUT, name);
  fs.writeFileSync(p, Buffer.from(r.data, 'base64'));
  const size = fs.statSync(p).size;
  log(`SHOT ${name} ${size}B ${size > 50 * 1024 ? '(OK)' : '(可能黑屏/loading)'}`);
  return size;
}
const pressKey = k => evalJs(`(function(){ try { const ev=new KeyboardEvent('keydown',{key:${JSON.stringify(k)},bubbles:true}); window.dispatchEvent(ev); return 1; } catch(e){ return 0; } })()`);

async function main() {
  const child = cleanLaunch();
  let page;
  try { page = await getPage(); } catch (e) { log('FATAL getPage ' + e.message); process.exit(2); }
  await connect(page);
  await evalJs(`window.sleep_=ms=>new Promise(r=>setTimeout(r,ms)); true;`);
  await sleep(3500);
  log('UI ready; readyState=' + await evalJs(`document.readyState`));
  log('前端函数: ' + JSON.stringify(await frontReady()));

  // 1. 新局：点「进入轮回」(btnNew → enterWorld → api_new)
  const clicked = await evalJs(`(function(){ const b=document.getElementById('btnNew'); if(b && b.offsetParent!==null){ b.click(); return 1; } return 0; })()`);
  log('clicked btnNew=' + clicked);
  await sleep(1800);
  let st = readSave();
  log('[step1] api_new 后 world_id=' + (st && st.world_id) + ' px/py=' + (st && st.px) + '/' + (st && st.py));

  // 2. 进主神再进生化：前端 worldInteract('gw_biohazard')（切 world 并重载地图）
  const intr = await evalJs(`(async function(){ try { await window.worldInteract('gw_biohazard'); return 'ok'; } catch(e){ return 'ERR:'+String(e.message||e); } })()`);
  log('[step2] worldInteract gw_biohazard -> ' + intr);
  await sleep(1600);
  await freshWorld();
  log('[step2] 生化世界: floor=' + world.floor_name + ' @(' + world.px + ',' + world.py + ') enemies_alive=' + (world.enemies || []).filter(e => e.alive).length);

  // 3. BFS 路径缓存；用前端 worldMove 驱动走格（前端内部调 api_world_move，撞到会返回 encounter → 自动 enterZone 进 3D）
  function bfsPath(tx, ty, allowPortalFn) {
    const W = world.w, H = world.h;
    const g = Array.from({ length: H }, () => Array(W).fill(false));
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if ((world.tiles[y] || '')[x] === '#') g[y][x] = true;
    (world.gates || []).forEach(gt => { if (gt.locked) g[gt.y][gt.x] = true; });
    (world.enemies || []).forEach(e => { if (e.alive) g[e.y][e.x] = true; });
    (world.portals || []).forEach(p => { if (!(allowPortalFn && allowPortalFn(p.x, p.y))) g[p.y][p.x] = true; });
    const sx = world.px, sy = world.py;
    if (sx === tx && sy === ty) return [];
    const prev = Array.from({ length: H }, () => Array(W).fill(null));
    const dist = Array.from({ length: H }, () => Array(W).fill(-1));
    const q = [[sx, sy]]; dist[sy][sx] = 0;
    while (q.length) {
      const [x, y] = q.shift();
      for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        if (g[ny][nx] || dist[ny][nx] >= 0) continue;
        dist[ny][nx] = dist[y][x] + 1; prev[ny][nx] = [x, y];
        q.push([nx, ny]);
        if (nx === tx && ny === ty) { const p = []; let cur = [tx, ty]; while (cur) { p.unshift(cur); cur = prev[cur[1]][cur[0]]; } return p; }
      }
    }
    return null;
  }

  // 走到目标邻格（可走），再踩上敌人格触发遭遇——用原始 api_world_move 逐格，
  // 每次打印 r.encounter/r.px/r.py 确认在逼近；撞到 encounter 后用前端 enterZone 进 3D。
  // 若敌人不在当前层：先走进 floor0→1 传送门(pt_stairs_down@3,20 / pt_elevator_down@27,4)切层到 floor:1
  let entered = false, hitEnemy = null, moves = [];

  // raw move 一步；返回 r；若 r.encounter 触发则用前端 enterZone 进 3D
  async function rawMove(dx, dy) {
    const r = await inv('api_world_move', { dx, dy });
    log(`   move(${dx},${dy}) -> px,py=(${r.px},${r.py}) encounter=${r.encounter ? JSON.stringify(r.encounter) : 'none'}` +
        (r.teleported ? ' teleported→' + r.floor + '层' : '') + (r.gate_blocked ? ' gate_blocked' : ''));
    moves.push(`(${r.px},${r.py})`);
    return r;
  }
  async function tryEnterFromEncounter(r) {
    if (r && r.encounter) {
      hitEnemy = r.encounter.enemy_id;
      log('   ### encounter -> 前端 enterZone(' + r.encounter.enemy_id + ')');
      const rr = await evalJs(`(async function(){ try { await window.enterZone({id:${JSON.stringify(r.encounter.enemy_id)},kind:'fight',ref:${JSON.stringify(r.encounter.fight_id)},name:${JSON.stringify(r.encounter.name)}}, null); return 'ok'; } catch(e){ return 'ERR:'+String(e.message||e); } })()`);
      log('   enterZone -> ' + rr);
      await sleep(2200);
      return true;
    }
    return false;
  }
  // 走到一个目标格（可走邻格），每步 rawMove 并检查遭遇；中途传送到目标层
  async function walkTo(tx, ty, allowPortalFn) {
    let guard = 0;
    while (guard++ < 500) {
      await freshWorld();
      if (world.px === tx && world.py === ty) return true;
      const p = bfsPath(tx, ty, allowPortalFn);
      if (!p || p.length === 0) { log(`   无路到(${tx},${ty}) 层=${world.floor} @(${world.px},${world.py})`); return false; }
      const [tx2, ty2] = p.length > 1 ? p[1] : p[0];
      if (tx2 === tx && ty2 === ty && allowPortalFn && allowPortalFn(tx, ty)) {
        // 目标就是传送门，直接踩上切层
        const r = await rawMove(tx2 - world.px, ty2 - world.py);
        if (await tryEnterFromEncounter(r)) return 'encounter';
        return true;
      }
      const r = await rawMove(tx2 - world.px, ty2 - world.py);
      if (await tryEnterFromEncounter(r)) return 'encounter';
    }
    return false;
  }

  await freshWorld();
  // 若不在目标层，先切到 floor:1
  if (world.floor !== TARGET.floor) {
    log('当前层=' + world.floor + '，目标层=' + TARGET.floor + '，先切层');
    // 选一个能更靠近目标层的传送门（floor0→1: pt_stairs_down(3,20), pt_elevator_down(27,4)）
    const portalCands = (world.portals || [])
      .filter(p => Math.abs(p.to_floor - TARGET.floor) < Math.abs(world.floor - TARGET.floor))
      .sort((a, b) => Math.abs(a.to_floor - TARGET.floor) - Math.abs(b.to_floor - TARGET.floor));
    for (const pt of portalCands) {
      const r = await walkTo(pt.x, pt.y, (x, y) => x === pt.x && y === pt.y); // 走到传送门并踩上
      if (r === 'encounter') { entered = true; }
      await freshWorld();
      if (world.floor === TARGET.floor) { log('已切到 floor:' + world.floor + ' @(' + world.px + ',' + world.py + ')'); break; }
      if (entered) break;
    }
  }

  await freshWorld();
  if (!entered && world.floor === TARGET.floor) {
    const near = [[TARGET.x-1,TARGET.y],[TARGET.x+1,TARGET.y],[TARGET.x,TARGET.y-1],[TARGET.x,TARGET.y+1]]
      .filter(([x, y]) => {
        const t = (world.tiles[y] || '')[x]; if (!t || t === '#') return false;
        if ((world.gates || []).some(g => g.locked && g.x === x && g.y === y)) return false;
        if ((world.enemies || []).some(e => e.alive && e.x === x && e.y === y)) return false;
        return true;
      });
    log('[' + TARGET.id + '] 邻格: ' + JSON.stringify(near));
    for (const [nx2, ny2] of near) {
      await freshWorld();
      const w = await walkTo(nx2, ny2, null);
      if (w === 'encounter') { entered = true; break; }
      if (await zoneActiveQ()) { entered = true; break; }
      if (w !== true) continue;
      // 到邻格后踩上敌人
      const r = await rawMove(TARGET.x - world.px, TARGET.y - world.py);
      if (await tryEnterFromEncounter(r)) entered = true;
      if (await zoneActiveQ()) { entered = true; break; }
      break;
    }
  }
  if (entered) await freshWorld();
  log('[step3] move 序列: ' + moves.join(' -> '));
  log('[step3] 撞到敌人=' + hitEnemy + ' zone3d-active=' + entered);

  // 兜底强迫进 3D（若上面没撞到；一般不会）
  if (!entered) {
    log('[step3-fallback] 用 enterZone(' + TARGET.id + ') 强制进 3D');
    const r = await evalJs(`(async function(){ try { await window.enterZone({id:${JSON.stringify(TARGET.id)},kind:'fight',ref:${JSON.stringify(TARGET.fight)},name:${JSON.stringify(TARGET.name)}}, null); return 'ok'; } catch(e){ return 'ERR:'+String(e.message||e); } })()`);
    log('enterZone -> ' + r);
    await sleep(2000);
    entered = await zoneActiveQ();
    log('zone3d-active(fallback)=' + entered);
  }

  const zi = await evalJs(`(function(){
    const c = document.getElementById('zone3dContainer');
    return { active: window.ZoneActive===true, canvas: !!c && !!c.querySelector('canvas'), canvases: c?c.querySelectorAll('canvas').length:0, title:(document.getElementById('zoneTitle')||{}).textContent };
  })()`);
  log('zone3d render info: ' + JSON.stringify(zi));

  // 4. 连拍 6 张，间隔 ~700ms；截图间派发 attack(j)/dodge(k) 触发不同动作帧
  const names = ['fight_1.png','fight_2.png','fight_3.png','fight_4.png','fight_5.png','fight_6.png'];
  const actions = ['none','attack','none','dodge','attack','dodge'];
  const sizes = [];
  for (let i = 0; i < 6; i++) {
    if (actions[i] === 'attack') { pressKey('j'); log('  [shot' + (i+1) + '] attack(j)'); await sleep(170); }
    else if (actions[i] === 'dodge') { pressKey('k'); log('  [shot' + (i+1) + '] dodge(k)'); await sleep(170); }
    await sleep(actions[i] === 'none' ? 650 : 700);
    sizes.push(await shot(names[i]));
    log('  [shot' + (i+1) + '] zone-active=' + (await zoneActiveQ()));
  }

  st = readSave();
  log('[RESULT] zone3d=' + entered + ' hitEnemy=' + hitEnemy + ' world_id=' + (st && st.world_id) + ' scene_id=' + (st && st.scene_id) + ' zone=' + JSON.stringify(st && st.zone));
  log('[SIZES] ' + names.map((n, i) => n + '=' + sizes[i]).join(' , '));
  log('[MOVES] ' + moves.join(' -> '));

  ws.close();
  child.kill();
  process.exit(0);
}
main().catch(e => { try { log('FATAL ' + (e.stack || e.message)); } catch {} console.error('FATAL', e); process.exit(2); });