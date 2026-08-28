// 敌人精灵化战斗截图（CDP 驱动）：
// 走遍 5 种敌人精灵（zombie/horde/licker/guard/hunter），每个进入战斗副本后
// 等待 3D billboard 渲染 → 截图 → 攻击至胜利 → 离开，继续下一只。
// 输出 tools/design/fightshots/fightshot_<kind>.png（1280x820）
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, 'design', 'fightshots');
const PORT = 9702;

let PASS = 0, FAIL = 0;
const ok = (name, cond, extra = '') => {
  if (cond) { PASS++; console.log(`  ✅ ${name} ${extra}`); }
  else { FAIL++; console.log(`  ❌ ${name} ${extra}`); }
};
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---------- CDP helpers ----------
async function getPage() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const list = await res.json();
      const page = list.find(p => p.type === 'page');
      if (page) return page;
    } catch { }
    await sleep(500);
  }
  throw new Error('CDP page not found');
}
let ws, nextId = 1;
async function connect(page) {
  ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
}
function send(o) { ws.send(JSON.stringify(o)); }
function evalJs(expression, timeout = 20000) {
  return new Promise((resolve, reject) => {
    const id = nextId++;
    const timer = setTimeout(() => { ws.removeEventListener('message', onMsg); reject(new Error('eval timeout')); }, timeout);
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
function cdp(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = nextId++;
    const timer = setTimeout(() => { ws.removeEventListener('message', onMsg); reject(new Error('cdp timeout: ' + method)); }, 20000);
    function onMsg(ev) {
      let msg; try { msg = JSON.parse(ev.data); } catch { return; }
      if (msg.id !== id) return;
      clearTimeout(timer); ws.removeEventListener('message', onMsg);
      if (msg.error) return reject(new Error('cdp: ' + JSON.stringify(msg.error)));
      resolve(msg.result);
    }
    ws.addEventListener('message', onMsg);
    send({ id, method, params });
  });
}
async function createTarget() {
  // 页面可能已存在；直接复用第一个 page
  const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
  return list.find(p => p.type === 'page');
}

// ---------- 寻路/移动 ----------
let world = null;
async function refresh() { world = await inv('api_world'); return world; }

function bfsPath(tx, ty, allowPortal) {
  const W = world.w, H = world.h;
  const g = Array.from({ length: H }, () => Array(W).fill(false));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if ((world.tiles[y] || '')[x] === '#') g[y][x] = true;
  }
  (world.gates || []).forEach(gt => { if (gt.locked) g[gt.y][gt.x] = true; });
  (world.enemies || []).forEach(e => { if (e.alive) g[e.y][e.x] = true; });
  (world.portals || []).forEach(p => { if (!(allowPortal && p.x === tx && p.y === ty)) g[p.y][p.x] = true; });
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
      dist[ny][nx] = dist[y][x] + 1;
      prev[ny][nx] = [x, y];
      q.push([nx, ny]);
      if (nx === tx && ny === ty) {
        const p = [];
        let cur = [tx, ty];
        while (cur) { p.unshift(cur); cur = prev[cur[1]][cur[0]]; }
        return p;
      }
    }
  }
  return null;
}

async function stepTo(tx, ty) {
  const dx = tx - world.px, dy = ty - world.py;
  if (Math.abs(dx) + Math.abs(dy) !== 1) throw new Error('stepTo 仅支持相邻格');
  const r = await inv('api_world_move', { dx, dy });
  if (r && r.gate_blocked) return { blocked: true, msg: r.gate_blocked.msg };
  if (r && r.teleported) { await refresh(); return { teleported: true }; }
  if (r && r.encounter) { await refresh(); return { encounter: r.encounter.enemy_id }; }
  world.px = r.px; world.py = r.py;
  return { moved: true };
}

async function goto(tx, ty) {
  const isPortal = (world.portals || []).some(p => p.x === tx && p.y === ty);
  let guard = 0;
  while (guard++ < 400) {
    if (world.px === tx && world.py === ty) return { ok: true };
    const p = bfsPath(tx, ty, isPortal);
    if (!p || p.length === 0) return { ok: false, reason: 'no-path', at: [world.px, world.py] };
    const next = p.length > 1 ? p[1] : p[0];
    const r = await stepTo(next[0], next[1]);
    if (r.blocked) return { ok: false, reason: 'blocked', msg: r.msg, at: [world.px, world.py] };
    if (r.encounter) return { ok: false, reason: 'encounter', enemy: r.encounter, at: [world.px, world.py] };
    if (r.teleported) return { ok: true, teleported: true };
  }
  return { ok: false, reason: 'guard' };
}

// 到目标敌人的邻格（不踩上，避免意外的遭遇打断）
async function gotoAdjacent(ex, ey) {
  const near = [[ex - 1, ey], [ex + 1, ey], [ex, ey - 1], [ex, ey + 1]]
    .filter(([x, y]) => {
      const t = (world.tiles[y] || '')[x];
      if (!t || t === '#') return false;
      if ((world.gates || []).some(g => g.locked && g.x === x && g.y === y)) return false;
      if ((world.enemies || []).some(e => e.alive && e.x === x && e.y === y)) return false;
      return true;
    });
  for (const [nx, ny] of near) {
    const r = await goto(nx, ny);
    if (r.ok) return [nx, ny];
  }
  return null;
}

// 跨层：候选传送门逐个尝试
async function goFloor(f) {
  let guard = 0;
  while (world.floor !== f && guard++ < 20) {
    const cands = (world.portals || [])
      .filter(p => Math.abs(p.to_floor - f) < Math.abs(world.floor - f))
      .sort((a, b) => Math.abs(a.to_floor - f) - Math.abs(b.to_floor - f));
    if (!cands.length) return false;
    let okMove = false;
    for (const p of cands) {
      const r = await goto(p.x, p.y);
      await refresh();
      if (world.floor === f) return true;
      if (r.ok || r.teleported) { okMove = true; break; }
    }
    if (!okMove) return false;
  }
  return world.floor === f;
}

// 遭遇并进入战斗副本（踩上敌人格）
async function engage(enemyId, ex, ey) {
  const st = await stepTo(ex, ey);
  const r = await inv('api_world_interact', { objId: enemyId });
  if (!r || !r.zone || r.zone.kind !== 'fight') return { error: JSON.stringify(r) };
  return { zone: r.zone, enemy: r.enemy };
}

// 截图（整页，含 3D canvas）
async function screenshot(file) {
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1280, height: 820, deviceScaleFactor: 1, mobile: false });
  const shot = await cdp('Page.captureScreenshot', { format: 'png' });
  if (!shot || !shot.data) return false;
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(file, Buffer.from(shot.data, 'base64'));
  return true;
}

// ---------- 测试主体 ----------
const page = await getPage();
await connect(page);
console.log('== 连接成功 ==');

await inv('api_new');
await refresh();
console.log(`   开局 @F${world.floor + 1} (${world.px},${world.py})`);

// 目标清单：[kind, enemyId, floor, x, y]
const TARGETS = [
  ['zombie', 'e_f1_z1', 0, 7, 6],
  ['horde',  'e_h1',    1, 25, 24],
  ['licker', 'e_licker', 1, 35, 22],
  ['guard',  'e_f3_z2', 2, 28, 23],
  ['hunter', 'e_f4_elite', 3, 25, 14],
];

for (const [kind, eid, floor, ex, ey] of TARGETS) {
  console.log(`\n-- ${kind} (${eid}) @F${floor + 1}(${ex},${ey}) --`);
  const fOk = await goFloor(floor);
  ok(`${kind}: 到达楼层 F${floor + 1}`, fOk && world.floor === floor, `floor=${world.floor}`);
  if (!(fOk && world.floor === floor)) { FAIL++; continue; }
  const e = (world.enemies || []).find(x => x.id === eid);
  ok(`${kind}: 地图存在目标敌人`, !!e && e.alive, e ? `@(${e.x},${e.y}) alive=${e.alive}` : '缺失/已死');
  if (!e || !e.alive) { FAIL++; continue; }
  const near = await gotoAdjacent(ex, ey);
  ok(`${kind}: 走到目标邻格`, !!near, near ? `@(${near})` : `在@(${world.px},${world.py})`);
  if (!near) { FAIL++; continue; }
  const eng = await engage(eid, ex, ey);
  ok(`${kind}: 进入战斗副本`, !!eng.zone, eng.error || JSON.stringify(eng.zone || ''));
  if (!eng.zone) { FAIL++; continue; }
  // 等待 3D billboard 渲染（setData + 贴图加载）
  await sleep(1500);
  const file = path.join(OUT_DIR, `fightshot_${kind}.png`);
  const shot = await screenshot(file);
  ok(`${kind}: 截图已保存`, shot, shot ? file : '');
  // 攻击至胜利
  let rounds = 0, win = false;
  while (rounds++ < 40) {
    const r = await inv('api_zone_action', { action: 'attack', arg: 0 });
    if (!r || r.__err) break;
    if (r.win) { win = true; break; }
    if (r.dead) break;
  }
  ok(`${kind}: 战斗胜利`, win, `rounds=${rounds}`);
  await inv('api_zone_exit');
  await sleep(500);
  await refresh();
}

console.log(`\n==== 结果: PASS=${PASS} FAIL=${FAIL} ====`);
process.exit(FAIL ? 1 : 0);