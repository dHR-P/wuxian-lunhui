// 世界精英敌人完整战斗链路验证（CDP 驱动）：
// ① 旧存档补缺：手动从 save.json 删掉 enemies_alive.e_f4_elite 键 → api_continue 后 ensure_enemies 补回 true
// ② 地图可见：F4 层 world.enemies 含 e_f4_elite 且 alive:true
// ③ 遭遇：BFS 走到 (25,14) 邻格 → stepTo 踩上 → encounter.enemy_id === 'e_f4_elite'
// ④ 副本：api_world_interact → zone.kind==='fight'，敌人 = 猎杀者·实验体(hp 92)
// ⑤ 战斗：attack 循环至 win → scenes enemies_alive[e_f4_elite]===false、world alive:false
// ⑥ 胜利收尾：scene_id 落回中性场景 s_world_back；已死敌人再次交互返回 dead 提示；踩过不再触发遭遇
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

function readSave() {
  try { return JSON.parse(fs.readFileSync(SAVE, 'utf8')); } catch { return null; }
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

// 跨层：走到指定层（候选传送门逐个尝试：门禁锁定/无路则换下一候选）
async function goFloor(f) {
  let guard = 0;
  while (world.floor !== f && guard++ < 20) {
    const cands = (world.portals || [])
      .filter(p => Math.abs(p.to_floor - f) < Math.abs(world.floor - f))
      .sort((a, b) => Math.abs(a.to_floor - f) - Math.abs(b.to_floor - f));
    if (!cands.length) return false;
    let okMove = false;
    for (const p of cands) {
      const r = await goto(p.x, p.y); // 走到传送门(允许踩上)
      await refresh();
      if (world.floor === f) return true;
      if (r.ok || r.teleported) { okMove = true; break; }
    }
    if (!okMove) return false;
  }
  return world.floor === f;
}

// ---------- 测试主体 ----------
const page = await getPage();
await connect(page);
console.log('== 连接成功 ==');

// 0. 新轮回开局（清掉耦合测试残留态）
let view = await inv('api_new');
console.log('   api_new 完成');

// 1. 旧存档补缺：删掉 e_f4_elite 键 → api_continue → ensure_enemies 补回
{
  const sv = readSave();
  const hadKey = sv && sv.enemies_alive && 'e_f4_elite' in sv.enemies_alive;
  ok('开局存档含 e_f4_elite 键(alive)', hadKey && sv.enemies_alive.e_f4_elite === true, hadKey ? `alive=${sv.enemies_alive.e_f4_elite}` : '无键');
  if (hadKey) {
    delete sv.enemies_alive.e_f4_elite;
    fs.writeFileSync(SAVE, JSON.stringify(sv, null, 2));
    console.log('   (模拟旧存档：已删除 enemies_alive.e_f4_elite 键)');
  }
  const cont = await inv('api_continue');
  if (!cont || cont.__err) { ok('api_continue 加载存档', false, JSON.stringify(cont)); process.exit(1); }
  // api_continue 不落盘 → 用一个无害场景触发 save_state
  await inv('api_scene_goto', { sceneId: 's_world_back' });
  const sv2 = readSave();
  ok('旧存档补缺：api_continue 后 e_f4_elite 键补回=true', sv2 && sv2.enemies_alive && sv2.enemies_alive.e_f4_elite === true,
    sv2 ? JSON.stringify(sv2.enemies_alive && sv2.enemies_alive.e_f4_elite) : '无存档');
  await inv('api_scene_back');
  await refresh();
}

// 2. 跨层到 F4（电梯→垂直升降机→竖井，传送链）
{
  const okF = await goFloor(3);
  ok('跨层到 F4 底层', okF && world.floor === 3, `floor=${world.floor} @(${world.px},${world.py})`);
}
// 3. F4 地图数据含新精英且存活
{
  const en = (world.enemies || []).find(e => e.id === 'e_f4_elite');
  ok('F4 world.enemies 含 e_f4_elite', !!en, en ? `@(${en.x},${en.y}) alive=${en.alive}` : '缺失');
  ok('e_f4_elite 存活(alive:true)', !!en && en.alive === true);
}

// 4. 走到精英邻格 → 踩上触发遭遇
{
  const EX = 25, EY = 14;
  const near = [[EX - 1, EY], [EX + 1, EY], [EX, EY - 1], [EX, EY + 1]]
    .filter(([x, y]) => {
      const t = (world.tiles[y] || '')[x];
      if (!t || t === '#') return false;
      if ((world.gates || []).some(g => g.locked && g.x === x && g.y === y)) return false;
      if ((world.enemies || []).some(e => e.alive && e.x === x && e.y === y)) return false;
      return true;
    });
  ok('精英四周存在可行走邻格', near.length > 0, near.map(n => `(${n})`).join(' '));
  let reached = null;
  for (const [nx, ny] of near) {
    const r = await goto(nx, ny);
    if (r.ok) { reached = [nx, ny]; break; }
  }
  ok('走到精英邻格', !!reached, reached ? `@(${reached})` : `在@(${world.px},${world.py})`);
  const st = await stepTo(EX, EY);
  ok('踩上精英格 → 遭遇 e_f4_elite', st.encounter === 'e_f4_elite', JSON.stringify(st));
}

// 5. 进入战斗副本
{
  const r = await inv('api_world_interact', { objId: 'e_f4_elite' });
  ok('interact → 战斗副本 zone.kind=fight', r && r.zone && r.zone.kind === 'fight' && r.zone.id === 'e_f4_elite', JSON.stringify(r && r.zone));
  ok('副本敌人 = 猎杀者·实验体(92hp)', r && r.enemy && r.enemy.name === '猎杀者·实验体' && r.enemy.hp === 92, r && r.enemy ? `${r.enemy.name} hp=${r.enemy.hp}` : '');
}

// 6. 战斗至胜利（含重试：万一被精英反杀，重开一轮再打）
let fightResult = null;
for (let attempt = 1; attempt <= 3 && !(fightResult && fightResult.win); attempt++) {
  if (attempt > 1) {
    console.log(`   (精英战第 ${attempt} 次尝试：重新开局)`);
    await inv('api_new');
    await goFloor(3);
    for (const [nx, ny] of [[24, 14], [26, 14], [25, 13], [25, 15]]) {
      const r = await goto(nx, ny);
      if (r.ok) break;
    }
    await stepTo(25, 14);
    await inv('api_world_interact', { objId: 'e_f4_elite' });
  }
  let rounds = 0;
  while (rounds++ < 40) {
    const r = await inv('api_zone_action', { action: 'attack', arg: 0 });
    if (!r || r.__err) { fightResult = { error: JSON.stringify(r) }; break; }
    if (r.win) { fightResult = { win: true, rounds, hp: r.player_hp !== undefined ? r.player_hp : r.hud?.hp }; break; }
    if (r.dead) { fightResult = { dead: true, rounds, scene: r.scene }; break; }
    if (rounds === 40) fightResult = { timeout: true };
  }
  if (fightResult && !fightResult.win && !fightResult.dead) break;
}
ok('精英战胜利 (win:true)', !!fightResult && fightResult.win === true, JSON.stringify(fightResult));
ok('战斗轮数合理(<=12)', !!fightResult && fightResult.rounds <= 12, `rounds=${fightResult && fightResult.rounds}`);

// 7. 胜利收尾断言
{
  const sv = readSave();
  ok('存档: enemies_alive.e_f4_elite=false', sv && sv.enemies_alive && sv.enemies_alive.e_f4_elite === false,
    sv && sv.enemies_alive ? `alive=${sv.enemies_alive.e_f4_elite}` : '无键');
  ok('存档: scene_id 为中性胜利场景 s_world_back', sv && sv.scene_id === 's_world_back', sv && sv.scene_id);
  const w = await refresh();
  const en = (w.enemies || []).find(e => e.id === 'e_f4_elite');
  ok('world(enemies 数据) alive:false', !!en && en.alive === false);
  const ag = await inv('api_world_interact', { objId: 'e_f4_elite' });
  ok('已死精英再次交互 → dead:true 中文提示', ag && ag.kind === 'enemy' && ag.dead === true, ag && ag.msg);
  const svb = await inv('api_scene_back');
  ok('api_scene_back 返回世界视图', !!svb && svb.px !== undefined, `floor=${svb && svb.floor}`);
  // 先离开精英格，再踩回 → 应无遭遇（已死敌人不再触发）
  await refresh();
  await stepTo(24, 14);
  const toc = await stepTo(25, 14);
  ok('踩过已死精英格 → 无遭遇', toc.moved === true, JSON.stringify(toc));
}

console.log(`\n==== 结果: PASS=${PASS} FAIL=${FAIL} ====`);
process.exit(FAIL ? 1 : 0);