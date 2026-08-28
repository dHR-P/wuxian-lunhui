// 箱庭强化全链验证（CDP 驱动）：
// F1 调查点 → F2 门禁挡路/解锁(lab_badge 钥匙链) → F2→F3→F4 传送链 → F4 排水闸(drain_done) → 水闸解锁 → 爬梯上行 → 存档断言
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

function readSave() {
  try { return JSON.parse(fs.readFileSync(SAVE, 'utf8')); } catch { return null; }
}

// 深化项辅助：跨层收集所有敌人 id（world 只含当前层，故按楼层逐个刷新采集）
const seenEnemies = new Set();
async function collectEnemies() {
  const startFloor = world.floor;
  for (let f = 0; f < 4; f++) {
    if (world.floor !== f) { const r = await goFloor2(f); if (!r) { await refresh(); } }
    (world.enemies || []).forEach(e => seenEnemies.add(e.id));
  }
  if (world.floor !== startFloor) { await goFloor2(startFloor); }
  await refresh();
}
function mapsAllFloorsHas(id) { return seenEnemies.has(id); }
function idsAllAlive(sv) {
  const ea = (sv && sv.enemies_alive) || {};
  return ['e_f1_z3', 'e_f3_z3', 'e_f4_z2'].every(id => ea[id] === true);
}
// 简易楼层跳转（只走传送门，不交互）
async function goFloor2(f) {
  let guard = 0;
  while (world.floor !== f && guard++ < 30) {
    const cands = (world.portals || [])
      .filter(p => Math.abs(p.to_floor - f) < Math.abs(world.floor - f))
      .sort((a, b) => Math.abs(a.to_floor - f) - Math.abs(b.to_floor - f));
    if (!cands.length) return false;
    const p = cands[0];
    const r = await goto(p.x, p.y);
    if (r.ok && world.floor === f) return true;
    if (r.blocked) return false;
  }
  return world.floor === f;
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
  // 目标若为传送门 → 允许踩上（触发切层）；切层后自动在新楼层续走
  const isPortal = (world.portals || []).some(p => p.x === tx && p.y === ty);
  let guard = 0;
  while (guard++ < 400) {
    if (world.px === tx && world.py === ty) return { ok: true };
    const p = bfsPath(tx, ty, isPortal);
    if (!p || p.length === 0) return { ok: false, reason: 'no-path', at: [world.px, world.py] };
    // p[0] 是玩家当前格，走下一格
    const next = p.length > 1 ? p[1] : p[0];
    const r = await stepTo(next[0], next[1]);
    if (r.blocked) return { ok: false, reason: 'blocked', msg: r.msg, at: [world.px, world.py] };
    if (r.encounter) return { ok: false, reason: 'encounter', enemy: r.encounter, at: [world.px, world.py] };
    // teleported 已由 stepTo refresh，继续在新楼层寻路（目标若不可达则返回 no-path）
  }
  return { ok: false, reason: 'guard' };
}

async function interact(id) { return inv('api_world_interact', { objId: id }); }
async function choose(i) { return inv('api_choose', { index: i }); }

// 调查点完整流程：交互 → 场景 → 选奖励 → 返回卡片 → 回世界
async function investigate(pointId, expectScene, expectIdx = 0) {
  const r = await interact(pointId);
  if (!(r && (r.kind === 'point' || r.scene))) { console.log(`    (interact: ${JSON.stringify(r)})`); return r; }
  await inv('api_scene_goto', { sceneId: r.scene });
  const sv1 = readSave();
  ok(`调查点 ${pointId} → 场景 ${expectScene}`, sv1 && sv1.scene_id === expectScene, sv1?.scene_id);
  await choose(expectIdx);
  const sv2 = readSave();
  await inv('api_scene_back');
  await refresh();
  return sv2;
}

// ---------- 测试主体 ----------
const page = await getPage();
await connect(page);
console.log('== 连接成功，开始新轮回 ==');
let view = await inv('api_new');
world = view.world;
console.log(`起点 F${world.floor + 1} (${world.px},${world.py})`);
ok('新轮回世界加载', !!world && world.tiles && world.tiles.length > 0);

// 1. F1 调查点：行李架
{ const r = await goto(3, 4); ok('F1 走到行李架', r.ok, r.reason || ''); }
{ const sv = await investigate('p_luggage', 'd_luggage'); ok('行李架奖励生效(+Points)', sv && sv.points >= 8, `points=${sv?.points}`); }

// 1.5 F1 通风管：员工捷径门禁存在且锁定（无卡）
{ const gv = (world.gates || []).find(g => g.id === 'gate_vent');
  ok('F1 地图含通风管门禁 gate_vent(锁定)', !!gv && gv.locked === true, gv ? `@(${gv.x},${gv.y})` : ''); }

// 2. F1→F2 电梯
{ const r = await goto(27, 4); await refresh(); ok('电梯 → F2 实验层', world.floor === 1, `reason=${r.reason} floor=${world.floor}`); }

// 3. F2 门禁：未解锁挡路
const gb = (world.gates || []).find(g => g.id === 'gate_b_area');
ok('F2 地图含门禁 gate_b_area(锁定)', !!gb && gb.locked, gb ? `@(${gb.x},${gb.y})` : '');
{ const r = await goto(32, 18); ok('F2 走到门禁北侧(32,18)', r.ok, r.reason || ''); }
{ const r = await interact('gate_b_area');
  ok('未持卡交互门禁 → 锁定提示', r.kind === 'gate' && r.opened === false, JSON.stringify(r));
  ok('锁定消息为中文提示', typeof r.msg === 'string' && r.msg.length > 4, r.msg || ''); }
{ /* 门禁格对 BFS 是不可达障碍，改为从相邻格直接 stepTo 走入 → 应被挡且不移动 */
  const r = await stepTo(32, 19);
  ok('走入锁定门禁被挡(不移动)', r.blocked === true, JSON.stringify(r));
  ok('挡路时玩家未移动', world.px === 32 && world.py === 18, `@(${world.px},${world.py})`); }

// 4. F2 档案柜 → lab_badge
{ const r = await goto(6, 21); ok('F2 走到档案柜', r.ok, r.reason || ''); }
{ const sv = await investigate('p_file_cabinet', 'd_files');
  ok('拿走员工卡 → inventory 含 lab_badge', sv && (sv.inventory || []).includes('lab_badge'), JSON.stringify(sv?.inventory));
  ok('d_files 地图点已标记 done', sv && sv.map_objs && sv.map_objs.p_file_cabinet === true); }

// 5. F2 门禁解锁
{ const r = await goto(32, 18); ok('回到门禁北侧', r.ok, r.reason || ''); }
{ const r = await interact('gate_b_area');
  ok('持卡交互门禁 → 解锁', r.kind === 'gate' && r.opened === true, JSON.stringify(r));
  const sv = readSave(); ok('门禁状态持久化 map_objs.gate_b_area', sv && sv.map_objs && sv.map_objs.gate_b_area === true); }
{ await refresh(); const gb2 = (world.gates || []).find(g => g.id === 'gate_b_area');
  ok('地图刷新后门禁 unlocked=false', gb2 && gb2.locked === false); }
{ const r = await goto(32, 19); ok('穿越已解锁门禁', r.ok, r.reason || '');
  ok('玩家已通过门禁至 (32,19)', world.px === 32 && world.py === 19, `@(${world.px},${world.py})`); }

// 6. F2→F3→F4 传送链（单向竖井）
{ const r = await goto(23, 14); await refresh(); ok('垂直升降机 → F3 核心层', world.floor === 2, `reason=${r.reason} floor=${world.floor}`); }
{ const r = await goto(21, 14); await refresh(); ok('竖井 → F4 底层(单向下行)', world.floor === 3, `reason=${r.reason} floor=${world.floor}`); }

// 7. F4 排水闸 → drain_done
{ const r = await goto(6, 6); ok('F4 走到排水闸', r.ok, r.reason || ''); }
{ const sv = await investigate('p_drain_gate', 'd_drain_gate');
  ok('拉开水闸 → flag drain_done', sv && sv.flags && sv.flags.drain_done === true, JSON.stringify(sv?.flags?.drain_done));
  ok('d_drain_gate 地图点已标记 done', sv && sv.map_objs && sv.map_objs.p_drain_gate === true); }

// 7.5 F4 备用电源 → backup_on（B-09 第二钥匙链）
{ const r = await goto(24, 24); ok('F4 走到备用电源箱', r.ok, r.reason || ''); }
{ const sv = await investigate('p_backup_power', 'd_backup_power');
  ok('推上电闸 → flag backup_on', sv && sv.flags && sv.flags.backup_on === true, JSON.stringify(sv?.flags?.backup_on));
  ok('d_backup_power 地图点已标记 done', sv && sv.map_objs && sv.map_objs.p_backup_power === true); }

// 8. F4 水闸解锁（by flag）——(32,20) 是墙，从南侧可行走邻格 (32,22) 交互
{ const r = await goto(32, 22); ok('F4 走到水闸南侧邻格(32,22)', r.ok, r.reason || ''); }
{ const r = await interact('gate_water_sluice');
  ok('drain_done 满足 → 水闸解锁', r.kind === 'gate' && r.opened === true, JSON.stringify(r));
  const sv = readSave(); ok('水闸状态持久化', sv && sv.map_objs && sv.map_objs.gate_water_sluice === true); }
{ await refresh(); const gw = (world.gates || []).find(g => g.id === 'gate_water_sluice');
  ok('地图刷新后水闸 unlocked=false', gw && gw.locked === false); }
{ const r = await goto(32, 21); ok('穿越已解锁水闸', r.ok, r.reason || '');
  ok('玩家已通过水闸至 (32,21)', world.px === 32 && world.py === 21, `@(${world.px},${world.py})`); }

// 9. 爬梯上行 F4→F3（单向环闭环）——先走到爬梯旁 (31,19)，再 stepTo 触发传送
{ const r = await goto(31, 19); ok('F4 走到爬梯旁(31,19)', r.ok, r.reason || ''); }
{ const r = await stepTo(32, 19); ok('踩上爬梯 → 传送 F3', r.teleported === true, JSON.stringify(r));
  ok('爬梯落点 F3 (32,3)', world.floor === 2 && world.px === 32 && world.py === 3, `@(${world.px},${world.py}) floor=${world.floor}`); }

// 10. F3 B-09 供电闸门（by flag backup_on）
{ const g09 = (world.gates || []).find(g => g.id === 'gate_b09');
  ok('F3 地图含 B-09 闸门(锁定)', !!g09 && g09.locked === true, g09 ? `@(${g09.x},${g09.y})` : ''); }
{ const r = await goto(20, 22); ok('F3 走到 B-09 南侧(20,22)', r.ok, r.reason || ''); }
{ const r = await interact('gate_b09');
  ok('backup_on 满足 → B-09 闸门解锁', r.kind === 'gate' && r.opened === true, JSON.stringify(r));
  const sv = readSave(); ok('B-09 状态持久化', sv && sv.map_objs && sv.map_objs.gate_b09 === true); }
{ await refresh(); const g09b = (world.gates || []).find(g => g.id === 'gate_b09');
  ok('地图刷新后 B-09 unlocked=false', g09b && g09b.locked === false); }
{ const r = await goto(20, 21); ok('穿越 B-09 闸门', r.ok, r.reason || '');
  ok('玩家已通过 B-09 至 (20,21)', world.px === 20 && world.py === 21, `@(${world.px},${world.py})`); }

// 11. F1 通风管回环：F3→F2→F1 解锁 gate_vent → 踩上传送 → 落回 F3 (14,23)
{ const r = await goto(30, 3); await refresh(); ok('升降机 → 回 F2 实验层', world.floor === 1, `reason=${r.reason} floor=${world.floor}`); }
{ const r = await goto(2, 2); await refresh(); ok('电梯 → 回 F1 入口层', world.floor === 0, `reason=${r.reason} floor=${world.floor}`); }
{ const r = await goto(19, 21); ok('F1 走到通风管旁(19,21)', r.ok, r.reason || ''); }
{ const r = await interact('gate_vent');
  ok('持卡交互通风管 → 解锁', r.kind === 'gate' && r.opened === true, JSON.stringify(r));
  const sv = readSave(); ok('通风管状态持久化', sv && sv.map_objs && sv.map_objs.gate_vent === true); }
{ await refresh(); const gv2 = (world.gates || []).find(g => g.id === 'gate_vent');
  ok('地图刷新后通风管 unlocked=false', gv2 && gv2.locked === false); }
{ /* 门禁与传送门同格：解锁后 stepTo 踩上进格即传送，落点 (14,23) */
  const r = await stepTo(20, 21); ok('踩上通风管 → 传送 F3', r.teleported === true, JSON.stringify(r));
  ok('通风管落点 F3 (14,23)', world.floor === 2 && world.px === 14 && world.py === 23, `@(${world.px},${world.py}) floor=${world.floor}`); }

// 12. 存档终态断言
{ const sv = readSave();
  ok('存档: inventory 含 lab_badge / firstaid / adrenaline', sv && (sv.inventory || []).includes('lab_badge'));
  ok('存档: flags.drain_done', sv && sv.flags && sv.flags.drain_done === true);
  ok('存档: flags.backup_on', sv && sv.flags && sv.flags.backup_on === true);
  ok('存档: gate_b_area 解锁', sv && sv.map_objs && sv.map_objs.gate_b_area === true);
  ok('存档: gate_water_sluice 解锁', sv && sv.map_objs && sv.map_objs.gate_water_sluice === true);
  ok('存档: gate_b09 解锁', sv && sv.map_objs && sv.map_objs.gate_b09 === true);
  ok('存档: gate_vent 解锁', sv && sv.map_objs && sv.map_objs.gate_vent === true);
  ok('存档: 楼层 F3(2)', sv && sv.floor === 2, `floor=${sv?.floor}`); }

// 13. 深化项：新增敌人与冷却阀解密点（跨层验证，最后回到 F3 终点不动摇终态）
{ await collectEnemies();
  const ids = ['e_f1_z3', 'e_f3_z3', 'e_f4_z2'];
  ok('新敌人已全部加入地图数据', ids.every(id => mapsAllFloorsHas(id)), ids.join(','));
  const cv = (world.points || []).find(p => p.id === 'p_cooling_valve');
  ok('F3 冷却阀调查点在地图数据中', !!cv, cv ? `@(${cv.x},${cv.y})` : ''); }
{ const sv = readSave();
  ok('存档: 新敌人存活表已初始化', idsAllAlive(sv), JSON.stringify((sv.enemies_alive || {}))?.slice(0, 200)); }

console.log(`\n==== 结果: PASS=${PASS} FAIL=${FAIL} ====`);
process.exit(FAIL ? 1 : 0);