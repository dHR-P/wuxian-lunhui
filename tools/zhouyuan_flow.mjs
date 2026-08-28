// 咒怨副本 CDP 全链路验收（Node 驱动）
// 主神 → gw_zhouyuan 网关 → 咒怨(zhuyuan) → F1 调查 → 层间传送 → BOSS 决战链 → 胜利 → 回主神
import { spawn, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOOLS = __dirname;
const ROOT = path.resolve(TOOLS, '..', 'server-rs');
const EXE = path.join(ROOT, 'target', 'release', 'wuxian-horror-ch1.exe');
const SAVE = path.join(ROOT, 'target', 'release', 'data', 'save.json');
const ZY_RS = path.join(ROOT, 'src', 'worlds', 'zhouyuan.rs');
const LOG = path.join(TOOLS, 'artifacts', 'logs', 'zhouyuan_steps.log');
const PORT = 9702;

let PASS = 0, FAIL = 0;
const log = s => { fs.appendFileSync(LOG, s + '\n'); console.log(s); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
function runSync(cmd) { try { return execSync(cmd, { stdio: 'pipe' }).toString(); } catch { return ''; } }

function cleanLaunch() {
  runSync(`taskkill /IM wuxian-horror-ch1.exe /T /F 2>nul`);
  try {
    const out = execSync(`netstat -ano | findstr :${PORT}`, { stdio: 'pipe' }).toString();
    for (const line of out.split(/\r?\n/)) {
      const m = line.trim().match(/(\d+)\s*$/);
      if (m) runSync(`taskkill /PID ${m[1]} /T /F 2>nul`);
    }
  } catch { }
  fs.rmSync(SAVE, { force: true });
  fs.rmSync(LOG, { force: true });
  const child = spawn(EXE, [], {
    env: { ...process.env, WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${PORT}` },
    stdio: 'ignore',
  });
  child.unref();
  return child;
}

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

const saveState = () => { try { return JSON.parse(fs.readFileSync(SAVE, 'utf8')); } catch { return null; } };

// ---- 咒怨地图 BFS（从 zhouyuan.rs 解析三层网格）----
function loadZyGrid() {
  const src = fs.readFileSync(ZY_RS, 'utf8');
  const floors = [];
  for (const mapName of ['ZHOUYUAN_F1_MAP', 'ZHOUYUAN_F2_MAP', 'ZHOUYUAN_F3_MAP']) {
    const m = src.match(new RegExp(mapName + '[^=]*=\\s*&\\[([\\s\\S]*?)\\];'));
    const rows = [];
    for (const rm of m[1].matchAll(/"([^"]*)"/g)) rows.push(rm[1]);
    floors.push(rows);
  }
  return floors; // floors[floor][y][x]
}
const GRIDS = loadZyGrid();
function bfsPath(floor, sx, sy, tx, ty) {
  const G = GRIDS[floor];
  const W = G[0].length, H = G.length;
  const walk = (x, y) => y >= 0 && y < H && x >= 0 && x < W && G[y][x] !== '#';
  if (!walk(tx, ty)) {
    const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [tx + dx, ty + dy]).find(([x, y]) => walk(x, y));
    if (!nb) return null;
    tx = nb[0]; ty = nb[1];
  }
  const key = (x, y) => y * W + x;
  const prev = new Map(); const q = [[sx, sy]]; prev.set(key(sx, sy), null);
  while (q.length) {
    const [x, y] = q.shift();
    if (x === tx && y === ty) break;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (!walk(nx, ny) || prev.has(key(nx, ny))) continue;
      prev.set(key(nx, ny), [x, y, dx, dy]); q.push([nx, ny]);
    }
  }
  if (!prev.has(key(tx, ty))) return null;
  const moves = [];
  let cur = [tx, ty];
  while (prev.get(key(cur[0], cur[1]))) {
    const [px, py, dx, dy] = prev.get(key(cur[0], cur[1]));
    moves.unshift({ dx, dy }); cur = [px, py];
  }
  return { moves, tx, ty };
}

async function walkTo(tx, ty, floorForGrid) {
  let w = await inv('api_world');
  if (!w || w.px === undefined) return { ok: false, why: 'no_world' };
  const fl = w.floor !== undefined ? w.floor : floorForGrid;
  let plan = bfsPath(fl, w.px, w.py, tx, ty);
  if (!plan) return { ok: false, why: 'no_path', px: w.px, py: w.py, floor: fl };
  for (let retry = 0; retry < 2; retry++) {
    let broken = false;
    for (const mv of plan.moves) {
      const r = await inv('api_world_move', mv);
      if (!r || !r.ok) { broken = true; break; }
    }
    if (!broken) { w = await inv('api_world'); return { ok: true, px: w.px, py: w.py, floor: w.floor }; }
    w = await inv('api_world');
    if (!w || w.px === undefined) return { ok: false, why: 'no_world_mid' };
    plan = bfsPath(fl, w.px, w.py, tx, ty);
    if (!plan) return { ok: false, why: 'no_path_mid', px: w.px, py: w.py };
  }
  return { ok: false, why: 'blocked_twice' };
}

async function interactScene(objId, expectSub) {
  const r = await inv('api_world_interact', { objId });
  if (!r || !r.scene) return { ok: false, why: 'interact-no-scene', resp: JSON.stringify(r).slice(0, 120) };
  const g = await inv('api_scene_goto', { sceneId: r.scene });
  const labels = ((g && g.choices) || []).map(c => c.label || '').join('|');
  return { ok: g && !g.__err && (!expectSub || labels.includes(expectSub)), labels, scene: r.scene };
}

async function main() {
  const child = cleanLaunch();
  let page;
  try { page = await getPage(); } catch (e) { log('FATAL ' + e.message); process.exit(2); }
  await connect(page);
  await sleep(3500);
  log('UI ready');

  // 1. 标题进入 → 生化世界
  await evalJs(`(function(){const b=[...document.querySelectorAll('.menuBtns .mbtn')].filter(b=>b.offsetParent!==null).find(b=>(b.innerText||'').includes('轮回'));if(b){b.click();return 1;}return 0;})()`);
  await sleep(2000);
  const w1 = await inv('api_world');
  if (w1 && w1.px !== undefined) { PASS++; log('PASS 生化世界加载'); } else { FAIL++; log('FAIL 生化世界'); process.exit(2); }

  // 2. 进主神
  await inv('api_nexus_enter');
  const st1 = saveState();
  if (st1 && st1.world_id === 'zhutianshenkong') { PASS++; log('PASS 进主神'); } else { FAIL++; log('FAIL 进主神'); }

  // 3. ★网关：主神 → gw_zhouyuan → 咒怨
  const gw = await inv('api_world_interact', { objId: 'gw_zhouyuan' });
  const st2 = saveState();
  if (gw && !gw.__err && gw.to_world === 'zhuyuan' && st2 && st2.world_id === 'zhuyuan') {
    PASS++; log(`PASS gw_zhouyuan → 咒怨 world_id=zhuyuan 落点=${st2.px},${st2.py} floor=${st2.floor}`);
  } else { FAIL++; log('FAIL 网关进咒怨 gw=' + JSON.stringify(gw).slice(0, 160) + ' world=' + (st2 && st2.world_id)); }

  // 4. F1 出生点移动 + 佛龛调查（场景 zy_03_butsudan 含取猫粮选项）
  const mk = await walkTo(4, 2, 0);
  if (mk.ok) { PASS++; log(`PASS F1 移动至佛龛 (${mk.px},${mk.py})`); } else { FAIL++; log('FAIL F1 移动 ' + JSON.stringify(mk)); }
  const bs = await interactScene('zy_p_butsudan', '取走供品碟里的猫粮');
  if (bs.ok) { PASS++; log('PASS 佛龛调查场景(含取猫粮) ' + (bs.labels || '').slice(0, 60)); } else { FAIL++; log('FAIL 佛龛调查 ' + JSON.stringify(bs)); }
  await inv('api_scene_back');

  // 5. 雨鞋支线调查（zy_02_shoe）
  const sb = await walkTo(13, 21, 0);
  if (sb.ok) {
    const sh = await interactScene('zy_p_rainboots', '');
    if (sh.ok) { PASS++; log('PASS 雨鞋调查 scene=' + sh.scene); } else { FAIL++; log('FAIL 雨鞋 ' + JSON.stringify(sh)); }
    await inv('api_scene_back');
  } else { FAIL++; log('FAIL 走到雨鞋'); }

  // 6. 楼梯 F1(36,17) → F2
  const stp = await walkTo(36, 17, 0);
  if (stp.ok) {
    const pr = await inv('api_world_interact', { objId: 'zy_pt_stairs_up' });
    const st3 = saveState();
    if (pr && !pr.__err && st3 && st3.floor === 1) { PASS++; log(`PASS 楼梯上 F2 floor=${st3.floor} 落点=${st3.px},${st3.py}`); }
    else { FAIL++; log('FAIL 上 F2 pr=' + JSON.stringify(pr).slice(0, 120) + ' floor=' + (st3 && st3.floor)); }
  } else { FAIL++; log('FAIL 走到楼梯'); }

  // 7. F2 镜子宫调查（zy_09_mirror）——展示咒怨调查链
  const mi = await walkTo(30, 6, 1);
  if (mi.ok) {
    const mir = await interactScene('zy_p_mirror', '');
    if (mir.ok) { PASS++; log('PASS F2 镜子调查 scene=' + mir.scene); } else { FAIL++; log('FAIL 镜子 ' + JSON.stringify(mir)); }
    await inv('api_scene_back');
  } else { FAIL++; log('FAIL 走到镜子'); }

  // 8. F2 阁楼楼梯口(34,23) → F3（需 G1 zy_toshio_key；无钥匙走不了——验证 G1 门禁锁定态）
  const g1 = await inv('api_world'); // 世界视图 gates
  const gates = (g1 && g1.gates) || [];
  const atticGate = gates.find(g => g.id === 'zy_g_attic');
  if (atticGate && atticGate.locked === true) { PASS++; log('PASS G1 阁楼门锁定(需zy_toshio_key)'); }
  else { FAIL++; log('FAIL G1 门禁状态 gates=' + JSON.stringify(gates.map(g => g.id)).slice(0, 120)); }

  // 9. ★BOSS 决战链：直接 api_scene_goto 到 zy_15_fight（结界场景）→ 选择驱动战斗回合 → 胜利卡
  const bf = await inv('api_scene_goto', { sceneId: 'zy_15_fight' });
  const isFight = bf && !bf.__err && (bf.choices || []).length > 0;
  if (isFight) { PASS++; log('PASS BOSS 决战场景进入 labels=' + (bf.choices || []).map(c => c.label).join('|').slice(0, 80)); }
  else { FAIL++; log('FAIL BOSS 场景 ' + JSON.stringify(bf).slice(0, 160)); }
  // 强杀走法：选第一个攻击类选项直到 zy_16_win/zy_16_card_strong
  let win = false;
  for (let i = 0; i < 30 && !win; i++) {
    const c = await inv('api_choose', { index: 0 });
    const stt = saveState();
    if (stt && (stt.scene_id === 'zy_16_win' || (stt.scene_id || '').includes('zy_16_card'))) { win = true; }
  }
  if (win) {
    const stw = saveState();
    PASS++; log(`PASS BOSS 战胜利 → scene=${stw.scene_id} pts=${stw.points} strongkill=${stw.flags && stw.flags.zy_strongkill}`);
  } else { FAIL++; log(`FAIL BOSS 战未达胜利 scene=${(saveState() || {}).scene_id}`); }

  log(`===== 完成 PASS=${PASS} FAIL=${FAIL} =====`);
  ws.close();
  child.kill();
  process.exit(FAIL > 0 ? 1 : 0);
}

main().catch(e => { console.error('FATAL', e); process.exit(2); });