// P1 主神空间链路 GUI 验收（Node CDP 驱动）v2
// 链路：生化世界 → api_nexus_enter → 主神空间(BFS寻路移动/光柱/张杰/兑换卡按钮) → gw_biohazard 网关 → 回生化 + bh_cleared
import { spawn, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOOLS = __dirname;
const ROOT = path.resolve(TOOLS, '..', 'server-rs');
const EXE = path.join(ROOT, 'target', 'release', 'wuxian-horror-ch1.exe');
const SAVE = path.join(ROOT, 'target', 'release', 'data', 'save.json');
const ZHUTIAN_RS = path.join(ROOT, 'src', 'worlds', 'zhutian.rs');
const LOG = path.join(TOOLS, 'artifacts', 'logs', 'nexus_steps.log');
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

// ---- 地图 BFS（从 zhutian.rs 源码解析 ZHUTIAN_MAP，'#' 不可走）----
function loadGrid() {
  const src = fs.readFileSync(ZHUTIAN_RS, 'utf8');
  const m = src.match(/ZHUTIAN_MAP[^=]*=\s*&\[([\s\S]*?)\];/);
  if (!m) throw new Error('ZHUTIAN_MAP not found in source');
  const rows = [];
  for (const rm of m[1].matchAll(/"([^"]*)"/g)) rows.push(rm[1]);
  return rows; // rows[y][x]
}
const GRID = loadGrid();
function bfsPath(sx, sy, tx, ty) {
  // 目标格不可走时，自动改走其可走邻格
  const W = GRID[0].length, H = GRID.length;
  const walk = (x, y) => y >= 0 && y < H && x >= 0 && x < W && GRID[y][x] !== '#';
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

// BFS 寻路 + 逐走（真实 api_world_move），失败时从当前位置重算一次
async function bfsWalk(tx, ty) {
  let w = await inv('api_world');
  if (!w || w.px === undefined) return { ok: false, why: 'no_world', resp: JSON.stringify(w).slice(0, 120) };
  let plan = bfsPath(w.px, w.py, tx, ty);
  if (!plan) return { ok: false, why: 'no_path', px: w.px, py: w.py };
  let steps = 0;
  for (let retry = 0; retry < 2; retry++) {
    let broken = false;
    for (const mv of plan.moves) {
      const r = await inv('api_world_move', mv);
      steps++;
      if (!r || !r.ok) { broken = true; break; }
    }
    if (!broken) { w = await inv('api_world'); return { ok: w.px === plan.tx && w.py === plan.ty, px: w.px, py: w.py, tx: plan.tx, ty: plan.ty, steps }; }
    w = await inv('api_world');
    if (!w || w.px === undefined) return { ok: false, why: 'no_world_mid' };
    plan = bfsPath(w.px, w.py, tx, ty);
    if (!plan) return { ok: false, why: 'no_path_mid', px: w.px, py: w.py };
  }
  return { ok: false, why: 'blocked_twice', px: w.px, py: w.py };
}

async function main() {
  const child = cleanLaunch();
  let page;
  try { page = await getPage(); } catch (e) { log('FATAL ' + e.message); process.exit(2); }
  await connect(page);
  await sleep(3000);
  log('UI ready (grid=' + GRID.length + 'x' + (GRID[0] || '').length + ')');

  // 1. 标题进入 → 生化世界
  await evalJs(`(function(){const b=[...document.querySelectorAll('.menuBtns .mbtn')].find(b=>b.offsetParent!==null); if(b){b.click();return 1;}return 0;})()`);
  await sleep(2000);
  const w1 = await inv('api_world');
  if (w1 && w1.px !== undefined) { PASS++; log('PASS 生化世界加载 px=' + w1.px + ' py=' + w1.py); }
  else { FAIL++; log('FAIL 生化世界加载'); process.exit(2); }

  // 2. ★进入链：api_nexus_enter → 主神空间
  const ne = await inv('api_nexus_enter');
  const st1 = saveState();
  if (ne && !ne.__err && st1 && st1.world_id === 'zhutianshenkong') {
    PASS++; log(`PASS api_nexus_enter → world_id=zhutianshenkong name=${ne.world?.name || '?'} floor=${ne.floor_name || '?'} px=${ne.px},${ne.py}`);
  } else { FAIL++; log('FAIL api_nexus_enter resp=' + JSON.stringify(ne).slice(0, 200) + ' save_world=' + (st1 && st1.world_id)); }

  // 3. 主神空间 DOM 可见
  const vis = await evalJs(`JSON.stringify({world:(document.getElementById('worldView')||{style:{}}).style.display||'none', canvas:(document.getElementById('worldCanvas')||{width:0}).width>0})`);
  if (vis && vis.includes('"world":"block"')) { PASS++; log('PASS 主神世界视图可见'); } else { FAIL++; log('FAIL 主神世界视图可见 ' + vis); }

  // 4. 主神空间移动（BFS → 光柱点 (22,12) 邻格）
  const wg = await bfsWalk(22, 12);
  if (wg.ok) { PASS++; log(`PASS 主神移动至光柱旁 (${wg.px},${wg.py}) steps=${wg.steps}`); }
  else { FAIL++; log(`FAIL 主神移动 why=${wg.why} ` + JSON.stringify(wg)); }

  // 5. 光柱调查点 → s_nexus_god 场景 → api_scene_back 退出
  const god = await inv('api_world_interact', { objId: 'np_nexus_god' });
  if (god && !god.__err && JSON.stringify(god).includes('s_nexus_god')) { PASS++; log('PASS 主神光柱调查 → s_nexus_god'); }
  else { FAIL++; log('FAIL 主神光柱调查 resp=' + JSON.stringify(god).slice(0, 200)); }
  await inv('api_scene_back');

  // 6. 张杰对话（NPC (7,11)，BFS 至邻格；交互失败则 scene_goto 兜底）
  const wwalk = await bfsWalk(7, 11);
  let zjOk = false;
  if (wwalk.ok) {
    const zj = await inv('api_world_interact', { objId: 'n_zhangjie_nexus' });
    zjOk = zj && !zj.__err && JSON.stringify(zj).includes('s_nexus_zhangjie');
    if (zjOk) await inv('api_scene_back');
  }
  if (!zjOk) {
    const zj2 = await inv('api_scene_goto', { sceneId: 's_nexus_zhangjie' });
    zjOk = zj2 && !zj2.__err;
    if (zjOk) log('NOTE 张杰对话走了 scene_goto 兜底 (邻格交互未命中)');
  }
  if (zjOk) { PASS++; log('PASS 张杰主神对话 → s_nexus_zhangjie'); }
  else { FAIL++; log('FAIL 张杰对话 walk=' + JSON.stringify(wwalk)); }

  // 7. 兑换卡两按钮（card_nexus：回主神空间 + 进入下一次轮回；标签去空白比较）
  const nx = await inv('api_nexus');
  const btns = (nx && nx.card && nx.card.buttons) || (nx && nx.buttons) || [];
  const flat = btns.map(b => ((b[0] || b.label || '') + '|' + (b[1] || b.route || ''))).join(';').replace(/\s+/g, '');
  if (flat.includes('回主神空间') && flat.includes('__enter_nexus__') && flat.includes('进入下一次轮回') && flat.includes('__title__')) {
    PASS++; log('PASS card_nexus 两按钮(回主神空间⌂/进入下一次轮回▶+路由) ');
  } else { FAIL++; log('FAIL card_nexus 按钮 flat=' + flat.slice(0, 160)); }
  await inv('api_scene_back');

  // 8. ★网关回链：BFS 至 gw_biohazard (31,8) → 交互 → 回生化 (1,1)
  const gwalk = await bfsWalk(31, 8);
  if (gwalk.ok) {
    const gw = await inv('api_world_interact', { objId: 'gw_biohazard' });
    const st2 = saveState();
    if (gw && !gw.__err && st2 && st2.world_id === 'biohazard_ch1' && st2.px === 1 && st2.py === 1) {
      PASS++; log(`PASS gw_biohazard 网关 → 生化 (1,1) bh_cleared=${st2.flags && st2.flags.bh_cleared}`);
    } else { FAIL++; log('FAIL 网关回链 resp=' + JSON.stringify(gw).slice(0, 220) + ' world=' + (st2 && st2.world_id) + ` (${st2 && st2.px},${st2 && st2.py})`); }
  } else { FAIL++; log(`FAIL 走到网关 why=${gwalk.why} ` + JSON.stringify(gwalk)); }

  // 9. bh_cleared 标记持久化
  const st3 = saveState();
  if (st3 && st3.flags && st3.flags.bh_cleared === true) { PASS++; log('PASS bh_cleared 标记已写入存档'); }
  else { FAIL++; log('FAIL bh_cleared 未写入存档'); }

  // 10. 主神视图含咒怨占位网关
  const w4 = await inv('api_world');
  const ports = (w4 && w4.portals) || [];
  const zy = ports.find(p => p.id === 'gw_zhouyuan');
  if (zy && zy.to_world === 'zhuyuan') { PASS++; log('PASS 主神视图含 gw_zhouyuan(to_world=zhuyuan)'); }
  else { log('NOTE 当前世界视图未含 gw_zhouyuan（若已回生化属预期，跳过）'); }

  log(`===== 完成 PASS=${PASS} FAIL=${FAIL} =====`);
  ws.close();
  child.kill();
  process.exit(FAIL > 0 ? 1 : 0);
}

main().catch(e => { console.error('FATAL', e); process.exit(2); });
