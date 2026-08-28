// 视觉质检辅助脚本 v2：连 CDP → 新轮回 → 跨层导航到目标坐标 → 强制世界视图渲染 → 截图保存
// 用法: node visual_check.mjs [floor] [x] [y] [out.png]   （floor: 0=F1 1=F2 2=F3 3=F4）
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 9702;
const args = process.argv.slice(2);
const floor = Number(args[0] ?? 0);
const tx = Number(args[1] ?? 1);
const ty = Number(args[2] ?? 1);
const outName = args[3] ?? 'shot.png';

const sleep = ms => new Promise(r => setTimeout(r, ms));
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
function evalJs(expression, timeout = 15000) {
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
function cdp(method, params = {}, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const id = nextId++;
    const timer = setTimeout(() => { ws.removeEventListener('message', onMsg); reject(new Error(method + ' timeout')); }, timeout);
    function onMsg(ev) {
      let msg; try { msg = JSON.parse(ev.data); } catch { return; }
      if (msg.id !== id) return;
      clearTimeout(timer); ws.removeEventListener('message', onMsg);
      if (msg.error) return reject(new Error(method + ' err: ' + JSON.stringify(msg.error)));
      resolve(msg.result);
    }
    ws.addEventListener('message', onMsg);
    send({ id, method, params });
  });
}
const inv = (cmd, cmdArgs) => evalJs(`(async function(){ try { return await window.__TAURI__.core.invoke(${JSON.stringify(cmd)}, ${JSON.stringify(cmdArgs || {})}); } catch(e){ return { __err: String(e.message||e) }; } })()`);

async function screenshot(file) {
  const res = await cdp('Page.captureScreenshot', { format: 'png' }, 20000);
  fs.writeFileSync(file, Buffer.from(res.data, 'base64'));
  console.log('saved', file);
}

// ---------- 寻路/移动（与 gate_chain_test 一致） ----------
let world = null;
async function refresh() { world = await inv('api_world'); return world; }
function bfsPath(tx2, ty2, allowPortal) {
  const W = world.w, H = world.h;
  const g = Array.from({ length: H }, () => Array(W).fill(false));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if ((world.tiles[y] || '')[x] === '#') g[y][x] = true;
  }
  (world.gates || []).forEach(gt => { if (gt.locked) g[gt.y][gt.x] = true; });
  (world.enemies || []).forEach(e => { if (e.alive) g[e.y][e.x] = true; });
  (world.portals || []).forEach(p => { if (!(allowPortal && p.x === tx2 && p.y === ty2)) g[p.y][p.x] = true; });
  // 目标格自身不视为障碍：允许走到门禁/敌人/传送门旁边（最终一步由 try_move 判定被挡/触发）
  g[ty2][tx2] = false;
  const sx = world.px, sy = world.py;
  if (sx === tx2 && sy === ty2) return [];
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
      if (nx === tx2 && ny === ty2) {
        const p = [];
        let cur = [tx2, ty2];
        while (cur) { p.unshift(cur); cur = prev[cur[1]][cur[0]]; }
        return p;
      }
    }
  }
  return null;
}
async function stepTo(tx2, ty2) {
  const dx = tx2 - world.px, dy = ty2 - world.py;
  if (Math.abs(dx) + Math.abs(dy) !== 1) throw new Error('stepTo 仅支持相邻格');
  const r = await inv('api_world_move', { dx, dy });
  if (r && r.gate_blocked) return { blocked: true, msg: r.gate_blocked.msg };
  if (r && r.teleported) { await refresh(); return { teleported: true }; }
  if (r && r.encounter) { await refresh(); return { encounter: r.encounter.enemy_id }; }
  world.px = r.px; world.py = r.py;
  return { moved: true };
}
async function goto(tx2, ty2) {
  const isPortal = (world.portals || []).some(p => p.x === tx2 && p.y === ty2);
  let guard = 0;
  while (guard++ < 400) {
    if (world.px === tx2 && world.py === ty2) return { ok: true };
    const p = bfsPath(tx2, ty2, isPortal);
    if (!p || p.length === 0) return { ok: false, reason: 'no-path', at: [world.px, world.py] };
    const next = p.length > 1 ? p[1] : p[0];
    const r = await stepTo(next[0], next[1]);
    if (r.blocked) return { ok: false, reason: 'blocked', msg: r.msg, at: [world.px, world.py] };
    if (r.encounter) return { ok: false, reason: 'encounter', enemy: r.encounter, at: [world.px, world.py] };
  }
  return { ok: false, reason: 'guard' };
}
// 跨层：沿传送门图走到目标楼层（楼层线性链 F1↔F2↔F3↔F4）
async function goFloor(f) {
  let guard = 0;
  while (world.floor !== f && guard++ < 30) {
    const cands = (world.portals || [])
      .filter(p => Math.abs(p.to_floor - f) < Math.abs(world.floor - f))
      .sort((a, b) => Math.abs(a.to_floor - f) - Math.abs(b.to_floor - f));
    if (!cands.length) return { ok: false, reason: 'no-portal', floor: world.floor };
    const p = cands[0];
    const r = await goto(p.x, p.y); // 踩上传送门格 → 切层（teleport 时 stepTo 已 refresh）
    if (r.ok && world.floor === f) return { ok: true };
    if (r.blocked) return { ok: false, reason: 'blocked:' + r.msg, floor: world.floor };
  }
  return { ok: world.floor === f, reason: 'guard', floor: world.floor };
}

// ---------- 主体 ----------
const page = await getPage();
await connect(page);
console.log(`目标 F${floor + 1} @(${tx},${ty}) → ${outName}`);
const keep = process.env.KEEP === '1';
const v = keep ? await inv('api_world') : await inv('api_new');
if (!v?.world && !keep) { console.log('api_new fail', JSON.stringify(v)); process.exit(1); }
if (keep && (v?.__err || v?.floor === undefined)) { console.log('api_world fail', JSON.stringify(v)); process.exit(1); }
world = v.world ?? v; // api_new 包 {world}, api_world 返回扁平世界
console.log(`${keep ? '沿用存档' : '新轮回'} F${world.floor + 1} @(${world.px},${world.py}), tiles=${world.tiles?.length}, inv=${JSON.stringify(world.inventory || [])}`);

if (world.floor !== floor) {
  const r = await goFloor(floor);
  console.log('goFloor →', JSON.stringify(r));
  if (!r.ok) { console.log('无法到达目标楼层'); process.exit(1); }
}
if (world.px !== tx || world.py !== ty) {
  const r = await goto(tx, ty);
  console.log('goto →', JSON.stringify(r));
  // reason==='blocked' = 目标格是锁定门禁/敌人/传送门，玩家已站在其相邻格（正是质检想要的角度）
  if (!r.ok && r.reason !== 'blocked') { console.log('无法到达目标坐标'); process.exit(1); }
}
console.log(`到达 F${world.floor + 1} @(${world.px},${world.py})${world.px !== tx || world.py !== ty ? `（目标格 ${tx},${ty} 相邻，被挡/不可踏入）` : ''}`);

// 强制世界视图渲染 + 放大视口保证整图可见
await evalJs(`setMode('world'); World2D.setData(${JSON.stringify(world)}); true;`);
await cdp('Emulation.setDeviceMetricsOverride', { width: 1280, height: 820, deviceScaleFactor: 1, mobile: false });
await sleep(500);
await screenshot(path.join(__dirname, outName));

// 附近门禁信息摘要（供人工/ox 对照）
const gatesNear = (world.gates || []).map(g => `${g.id}@(${g.x},${g.y}) locked=${g.locked} need=${g.need || ''}`).join(' | ');
console.log('gates on floor:', gatesNear || '(none)');
process.exit(0);