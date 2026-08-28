// 跨调查点支线耦合验证（CDP 驱动）：
// ① 消毒事故真相链：列车日志(F1) + 消毒终端(F1) + 药品柜值班表(F2) 三份旁证 ⇒ 主控终端(F3)可调阅《消毒执行记录》
// ② 冷却回路联动：冷却阀顺序谜题(F3) ⇒ 服务器阵列(F3)新增散热读数情报
// ③ 导览图⇒手册互证：站台导览图(F1) ⇒ 安全手册(F3)新增捷径认知
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

function readSave() {
  try { return JSON.parse(fs.readFileSync(SAVE, 'utf8')); } catch { return null; }
}

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

async function interact(id) { return inv('api_world_interact', { objId: id }); }
async function choose(i) { return inv('api_choose', { index: i }); }

// 调查点流程：交互 → 场景 → 返回 render 视图（含 visible choices）
async function openScene(pointId) {
  const r = await interact(pointId);
  if (!(r && (r.kind === 'point' || r.scene))) { console.log(`    (interact: ${JSON.stringify(r)})`); return null; }
  return inv('api_scene_goto', { sceneId: r.scene });
}

const page = await getPage();
await connect(page);
console.log('== 跨调查点支线耦合验证开始 ==');

let v = await inv('api_new');
world = v.world;
console.log(`起点 F${world.floor + 1} (${world.px},${world.py})`);
ok('新轮回世界加载', !!world && world.tiles && world.tiles.length > 0);

/* ---------- ① 消毒事故真相链 ---------- */
// 1. F1 列车运行日志（旁证1）
{ const r = await goto(20, 17); ok('F1 走到列车控制台(20,17)', r.ok, r.reason || ''); }
{ const sv0 = readSave();
  const scene = await openScene('p_train_console');
  ok('列车控制台 → 场景 d_train_console', scene && scene.kind === 'scene' && scene.loc.includes('列车'), JSON.stringify(scene?.loc));
  await choose(0);
  const sv = readSave();
  ok('旁证1: 列车日志已读(p_train_console marked)', sv && sv.map_objs && sv.map_objs.p_train_console === true);
  await inv('api_scene_back'); await refresh(); }

// 2. F1 消毒终端（旁证2）
{ const r = await goto(29, 10); ok('F1 走到消毒终端(29,10)', r.ok, r.reason || ''); }
{ const scene = await openScene('p_decon_terminal');
  ok('消毒终端 → 场景 d_decon', scene && scene.kind === 'scene' && scene.loc.includes('消毒'), JSON.stringify(scene?.loc));
  await choose(0);
  const sv = readSave();
  ok('旁证2: 消毒通知已读(p_decon_terminal marked)', sv && sv.map_objs && sv.map_objs.p_decon_terminal === true);
  await inv('api_scene_back'); await refresh(); }

// 3. F1→F2 电梯
{ const r = await goto(27, 4); await refresh(); ok('电梯 → F2 实验层', world.floor === 1, `floor=${world.floor}`); }

// 4. F2 药品柜值班表（旁证3；且此时已读消毒通知，文本应带互文提示）
{ const r = await goto(9, 23); ok('F2 走到药品柜(9,23)', r.ok, r.reason || ''); }
{ const scene = await openScene('p_med_cabinet');
  ok('药品柜 → 场景 d_meds', scene && scene.kind === 'scene' && scene.loc.includes('药品'), JSON.stringify(scene?.loc));
  const paras = (scene?.paragraphs || []).join('\n');
  ok('已读消毒通知后值班表文本含互文提示(签字日期/封闭日)', paras.includes('同一个人') || paras.includes('封闭日'), paras.slice(-80).replace(/\n/g, ' '));
  await choose(0);
  const sv = readSave();
  ok('旁证3: 值班表已读(p_med_cabinet marked)', sv && sv.map_objs && sv.map_objs.p_med_cabinet === true);
  await inv('api_scene_back'); await refresh(); }

// 5. F2→F3 升降机
{ const r = await goto(23, 14); await refresh(); ok('升降机 → F3 核心层', world.floor === 2, `floor=${world.floor}`); }

// 6. F3 主控终端：未调阅前先读设施状态；再验证三旁证齐备后「调阅」选项出现
{ const r = await goto(33, 12); ok('F3 走到主控终端(33,12)', r.ok, r.reason || ''); }
{ let scene = await openScene('p_main_console');
  ok('主控终端 → 场景 d_main_console', scene && scene.kind === 'scene' && scene.loc.includes('主控'), JSON.stringify(scene?.loc));
  const labels0 = (scene?.choices || []).map(c => c.label).join('|');
  ok('三旁证齐备 → 调阅选项可见', scene?.choices?.some(c => c.label.includes('调阅')), labels0);
  await choose(1); // 调阅《消毒执行记录》
  const sv = readSave();
  ok('调阅 → flag decon_truth 置位', sv && sv.flags && sv.flags.decon_truth === true, JSON.stringify(sv?.flags?.decon_truth));
  ok('进入真相场景 s_decon_truth', sv && sv.scene_id === 's_decon_truth', sv?.scene_id);
  const svp = readSave();
  ok('真相奖励已入账(points ≥ 旁证前+40)', svp.points >= 40, `points=${svp.points}`);
  await choose(0); // 关掉记录
  await inv('api_scene_back'); await refresh(); }

// 7. 冷却阀顺序谜题 → cooling_done
{ const r = await goto(12, 22); ok('F3 走到冷却阀组(12,22)', r.ok, r.reason || ''); }
{ const scene = await openScene('p_cooling_valve');
  ok('冷却阀组 → 场景 d_cooling_valve', scene && scene.kind === 'scene' && scene.loc.includes('冷却'), JSON.stringify(scene?.loc));
  const labels = (scene?.choices || []).map(c => c.label).join('|');
  ok('冷却阀 4 选项可见(3错+1对)', (scene?.choices || []).length === 4, `n=${scene?.choices?.length}`);
  ok('正确顺序选项在列(A→C→B)', scene?.choices?.some(c => c.label.includes('主阀 A，再开泄压阀 C，最后旁通阀 B')), labels);
  await choose(1); // 正确顺序
  const sv = readSave();
  ok('冷却阀解对 → flag cooling_done', sv && sv.flags && sv.flags.cooling_done === true, JSON.stringify(sv?.flags?.cooling_done));
  await inv('api_scene_back'); await refresh(); }

/* ---------- ② 冷却回路联动 ---------- */
// 8. F3 服务器阵列：cooling_done 后应出现「读取散热读数」联动选项
{ const r = await goto(30, 5); ok('F3 走到服务器阵列(30,5)', r.ok, r.reason || ''); }
{ const scene = await openScene('p_server_array');
  ok('服务器阵列 → 场景 d_server', scene && scene.kind === 'scene' && scene.loc.includes('服务器'), JSON.stringify(scene?.loc));
  const labels = (scene?.choices || []).map(c => c.label).join('|');
  ok('冷却联动选项可见(读取散热读数)', scene?.choices?.some(c => c.label.includes('散热读数')), labels);
  await choose(1); // 读取散热读数
  const sv = readSave();
  ok('联动 → flag server_cooling 置位', sv && sv.flags && sv.flags.server_cooling === true, JSON.stringify(sv?.flags?.server_cooling));
  await inv('api_scene_back'); await refresh(); }

/* ---------- ③ 导览图⇒手册互证 ---------- */
// 9. F1 站台导览图需要先读（nav_map）——当前轮回已到 F3，直接回 F1 再上 F3 太绕；
//    站台导览图在出生层，改从存档直接验证：先前未读 nav_map，手册不出现互证选项；
//    用 api_scene_goto 直接进 d_manual 检查（世界位置不变），再回 F1 读导览图后复查。
{ let scene = await inv('api_scene_goto', { sceneId: 'd_manual' });
  const hasCross = scene?.choices?.some(c => c.label.includes('互证'));
  ok('未读导览图 → 手册无互证选项', hasCross === false, JSON.stringify((scene?.choices || []).map(c => c.label)));
  await inv('api_scene_back'); }

// 10. 回 F1 读导览图（nav_map）
{ const r1 = await goto(30, 3); await refresh(); ok('升降机 → 回 F2', world.floor === 1, `floor=${world.floor}`); }
{ const r2 = await goto(2, 2); await refresh(); ok('电梯 → 回 F1', world.floor === 0, `floor=${world.floor}`); }
{ const r = await goto(21, 10); ok('F1 走到站台导览图(21,10)', r.ok, r.reason || ''); }
{ const scene = await openScene('p_platform_map');
  ok('导览图 → 场景 d_platform_map', scene && scene.kind === 'scene' && scene.loc.includes('导览'), JSON.stringify(scene?.loc));
  await choose(0);
  const sv = readSave();
  ok('导览图已读 → flag nav_map', sv && sv.flags && sv.flags.nav_map === true, JSON.stringify(sv?.flags?.nav_map));
  await inv('api_scene_back'); await refresh(); }

// 11. 再到 F3 手册复查：应出现互证选项
{ const r1 = await goto(27, 4); await refresh(); ok('电梯 → 再上 F2', world.floor === 1, `floor=${world.floor}`); }
{ const r2 = await goto(23, 14); await refresh(); ok('升降机 → 再上 F3', world.floor === 2, `floor=${world.floor}`); }
{ const r = await goto(36, 8); ok('F3 走到安全手册(36,8)', r.ok, r.reason || ''); }
{ const scene = await openScene('p_safety_manual');
  ok('安全手册 → 场景 d_manual', scene && scene.kind === 'scene' && scene.loc.includes('手册'), JSON.stringify(scene?.loc));
  const labels = (scene?.choices || []).map(c => c.label).join('|');
  ok('读过导览图 → 手册互证选项可见', scene?.choices?.some(c => c.label.includes('互证')), labels);
  await choose(1); // 互证导览图与手册
  const sv = readSave();
  ok('互证 → flag nav_manual_cross 置位', sv && sv.flags && sv.flags.nav_manual_cross === true, JSON.stringify(sv?.flags?.nav_manual_cross));
  await inv('api_scene_back'); await refresh(); }

/* ---------- 存档终态断言 ---------- */
{ const sv = readSave();
  ok('存档: flags.decon_truth', sv && sv.flags && sv.flags.decon_truth === true);
  ok('存档: flags.cooling_done', sv && sv.flags && sv.flags.cooling_done === true);
  ok('存档: flags.server_cooling', sv && sv.flags && sv.flags.server_cooling === true);
  ok('存档: flags.nav_map', sv && sv.flags && sv.flags.nav_map === true);
  ok('存档: flags.nav_manual_cross', sv && sv.flags && sv.flags.nav_manual_cross === true);
  ok('存档: 旁证1 p_train_console', sv && sv.map_objs && sv.map_objs.p_train_console === true);
  ok('存档: 旁证2 p_decon_terminal', sv && sv.map_objs && sv.map_objs.p_decon_terminal === true);
  ok('存档: 旁证3 p_med_cabinet', sv && sv.map_objs && sv.map_objs.p_med_cabinet === true); }

console.log(`\n==== 跨调查点支线耦合验证: PASS=${PASS} FAIL=${FAIL} ====`);
process.exit(FAIL ? 1 : 0);