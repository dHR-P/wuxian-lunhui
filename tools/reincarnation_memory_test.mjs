// 轮回记忆开图专项验证（CDP 驱动）：
// ① api_new 新轮回 → 探索若干区域 → 记录 explored
// ② 模拟死亡重开（再次 api_new）→ 断言旧探索格仍被继承（迷雾不重遮）
// ③ 玩家当前位置周围 REVEAL_RADIUS 内格子在 explored 中
// ④ 跨层：移动到其它楼层后 explored 按楼层过滤输出（"x:y" 无 floor 前缀）
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', 'server-rs');
const SAVE = path.join(ROOT, 'target', 'release', 'data', 'save.json');
const PORT = 9702;

let PASS = 0, FAIL = 0;
const ok = (name, cond, extra = '') => {
  if (cond) { PASS++; console.log(`  ✅ ${name} ${extra}`); }
  else { FAIL++; console.log(`  ❌ ${name} ${extra}`); }
};
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
const inv = (cmd, args) => evalJs(`(async function(){ try { return await window.__TAURI__.core.invoke(${JSON.stringify(cmd)}, ${JSON.stringify(args || {})}); } catch(e){ return { __err: String(e.message||e) }; } })()`);

// ---------- 寻路/移动（同 gate_chain_test） ----------
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
  g[ty][tx] = false;
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
  }
  return { ok: false, reason: 'guard' };
}
async function goFloor(f) {
  let guard = 0;
  while (world.floor !== f && guard++ < 30) {
    const cands = (world.portals || [])
      .filter(p => Math.abs(p.to_floor - f) < Math.abs(world.floor - f))
      .sort((a, b) => Math.abs(a.to_floor - f) - Math.abs(b.to_floor - f));
    if (!cands.length) return { ok: false, reason: 'no-portal', floor: world.floor };
    const p = cands[0];
    const r = await goto(p.x, p.y);
    if (r.ok && world.floor === f) return { ok: true };
    if (r.blocked) return { ok: false, reason: 'blocked:' + r.msg, floor: world.floor };
  }
  return { ok: world.floor === f, reason: 'guard', floor: world.floor };
}
const exploredSet = () => new Set((world.explored || []));
const inExplored = (x, y) => exploredSet().has(`${x}:${y}`);

// ---------- 主体 ----------
const page = await getPage();
await connect(page);
console.log('== 轮回记忆开图验证开始 ==');

// ① 新轮回（继承上次存档记忆——上轮 gate_chain_test 已探索 2608 格）
let v = await inv('api_new');
world = v.world;
console.log(`轮回#1 F${world.floor + 1} @(${world.px},${world.py}) explored=${world.explored?.length}`);
ok('轮回#1 世界加载', !!world && Array.isArray(world.explored));
ok('轮回#1 继承旧存档记忆(explored>0)', (world.explored || []).length > 0, `count=${world.explored?.length}`);

// 出生点周围 REVEAL_RADIUS=4 内开图
const sx = world.px, sy = world.py;
let allAround = true;
for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
  const x = sx + dx, y = sy + dy;
  if (x < 0 || y < 0 || x >= world.w || y >= world.h) continue;
  if (!inExplored(x, y)) allAround = false;
}
ok('出生点周围 4 格半径全部开图', allAround);

// ② 走一段路再走远点，验证移动开图
{ const r = await goto(20, 17); ok('走到 F1 列车控制台(20,17)', r.ok, r.reason || ''); }
ok('移动路径沿途开图(玩家周围4格可见)', inExplored(world.px + 1, world.py) || inExplored(world.px, world.py + 1), `@(${world.px},${world.py})`);
const beforeCount = (world.explored || []).length;

// ③ 死亡重开：api_new 模拟轮回死亡 → 地图记忆必须保留
v = await inv('api_new');
world = v.world;
const afterCount = (world.explored || []).length;
console.log(`轮回#2(死亡重开) F${world.floor + 1} @(${world.px},${world.py}) explored=${afterCount}`);
ok('死亡重开后 explored 保留(>=轮回#1)', afterCount >= beforeCount, `#1=${beforeCount} #2=${afterCount}`);
ok('重开后曾到访的 (20,17) 仍可见(未被迷雾重遮)', inExplored(20, 17));

// ④ 跨层记忆：走到 F2，验证该层 explored 只含当前层坐标且格式为 "x:y"
{ const r = await goto(27, 4); await refresh(); ok('电梯 → F2', world.floor === 1, `floor=${world.floor}`); }
const f2explored = world.explored || [];
ok('F2 explored 全部为 "x:y" 格式(无floor前缀)', f2explored.every(s => /^\d+:\d+$/.test(s)), `count=${f2explored.length}`);
ok('F2 落地周围开图', inExplored(world.px, world.py) && inExplored(world.px, world.py + 1), `@(${world.px},${world.py})`);

// ⑤ 存档断言：save.json 的 explored 字段持久化
const sv = JSON.parse(fs.readFileSync(SAVE, 'utf8'));
ok('save.json 含 explored 字段', Array.isArray(sv.explored) && sv.explored.length > 0, `count=${sv.explored?.length}`);
const keysOk = (sv.explored || []).every(k => /^\d+:\d+:\d+$/.test(String(k)));
ok('save.json explored 为 "floor:x:y" 键', keysOk);

console.log(`\n==== 轮回记忆开图验证: PASS=${PASS} FAIL=${FAIL} ====`);
process.exit(FAIL ? 1 : 0);
