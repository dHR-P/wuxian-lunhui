// 无限轮回 · 全截图采集（Node CDP 驱动）
// 目标: tools/shots/ 下生成 ≥58 张截图
//   00_title / 01_nexus / 02_world_map / <slug>.png(55 副本) / fight_z1..3(zone3d)
// 复用 flow_cdp cleanLaunch/connect/evalJs/screenshot + shot_fight_3d 的 BFS 触发 zone3d
import { spawn, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOOLS = __dirname;
const ROOT = path.resolve(TOOLS, '..', 'server-rs');
const EXE = path.join(ROOT, 'target', 'release', 'wuxian-horror-ch1.exe');
const SAVE = path.join(ROOT, 'target', 'release', 'data', 'save.json');
const SHOTS = path.join(TOOLS, 'shots');
const LOG = path.join(TOOLS, 'shots_full.log');
const SCENE_MAP = path.join(TOOLS, 'scene_map.json');
const PORT = 9699;

let PASS = 0, FAIL = 0;
const results = [];   // {name, size}
const fails = [];     // {slug, reason}

const log = s => { fs.appendFileSync(LOG, s + '\n'); console.log(s); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
function runSync(cmd) { try { return execSync(cmd, { stdio: 'pipe' }).toString(); } catch (e) { return String(e.stderr || e.message); } }

function cleanLaunch() {
  log('== 清理并启动游戏 ==');
  runSync('taskkill /IM wuxian-horror-ch1.exe /T /F 2>nul');
  try {
    const out = execSync(`netstat -ano | findstr :${PORT}`, { stdio: 'pipe' }).toString();
    for (const line of out.split(/\r?\n/)) {
      const m = line.trim().match(/(\d+)\s*$/);
      if (m) runSync(`taskkill /PID ${m[1]} /T /F 2>nul`);
    }
  } catch { }
  fs.rmSync(SAVE, { force: true });
  fs.rmSync(LOG, { force: true });
  fs.mkdirSync(SHOTS, { recursive: true });
  for (const f of fs.readdirSync(SHOTS)) fs.rmSync(path.join(SHOTS, f), { force: true });
  const child = spawn(EXE, [], {
    env: { ...process.env, WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${PORT}` },
    stdio: 'ignore', detached: false,
  });
  child.unref();
  return child;
}

async function getPage() {
  for (let i = 0; i < 60; i++) {
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
    const timer = setTimeout(() => { ws.removeEventListener('message', onMsg); reject(new Error('eval timeout: ' + expression.slice(0, 60))); }, timeout);
    function onMsg(ev) {
      let msg; try { msg = JSON.parse(ev.data); } catch { return; }
      if (msg.id !== id) return;
      clearTimeout(timer); ws.removeEventListener('message', onMsg);
      if (msg.error) return reject(new Error('cdp: ' + JSON.stringify(msg.error)));
      if (msg.result?.exceptionDetails) return resolve({ __exception: (msg.result.exceptionDetails.exception?.description || msg.result.exceptionDetails.text || 'js exception').slice(0, 250) });
      resolve(msg.result?.result?.value);
    }
    ws.addEventListener('message', onMsg);
    send({ id, method: 'Runtime.evaluate', params: { expression, returnByValue: true, awaitPromise: true, userGesture: true } });
  });
}

function screenshot(name) {
  return new Promise((resolve) => {
    const id = nextId++;
    function onMsg(ev) {
      let msg; try { msg = JSON.parse(ev.data); } catch { return; }
      if (msg.id !== id) return;
      ws.removeEventListener('message', onMsg);
      try {
        const b64 = msg.result?.data ?? msg.result?.result?.data;
        if (b64) {
          const fp = path.join(SHOTS, name + '.png');
          fs.writeFileSync(fp, Buffer.from(b64, 'base64'));
          const size = fs.statSync(fp).size;
          const ok = size > 5 * 1024;
          results.push({ name, size });
          log(`SHOT ${name}.png ${size}B ${ok ? '(OK)' : '(BLANK/TOO SMALL)'}`);
          resolve({ name, size, ok });
          return;
        }
      } catch (e) { log('SHOT write err ' + name + ': ' + e.message); }
      fails.push({ name, reason: 'screenshot-capture-failed' });
      resolve({ name, size: 0, ok: false });
    }
    ws.addEventListener('message', onMsg);
    send({ id, method: 'Page.captureScreenshot', params: { format: 'png' } });
    setTimeout(() => { ws.removeEventListener('message', onMsg); resolve({ name, size: 0, ok: false }); }, 5000);
  });
}

const inv = (cmd, args) => evalJs(`(async function(){ try { return await window.__TAURI__.core.invoke(${JSON.stringify(cmd)}, ${JSON.stringify(args || {})}); } catch(e){ return {__err:String(e.message||e)}; } })()`);

// 用前端 showStoryScene 渲染剧情场景并返回校验信息
async function gotoShowScene(sceneId) {
  const expr = `(async function(){
    try {
      const view = await window.__TAURI__.core.invoke('api_scene_goto', {sceneId: ${JSON.stringify(sceneId)}});
      if (!view) return JSON.stringify({ok:false, err:'null-view'});
      if (view.__err) return JSON.stringify({ok:false, err:'invoke-err:' + String(view.__err)});
      return JSON.stringify({
        ok: true,
        kind: view.kind || 'scene',
        bg: view.bg != null && view.bg != '',
        parasLen: Array.isArray(view.paragraphs) ? view.paragraphs.join('').length : -1,
        hasFight: !!view.fight,
        card: !!view.card,
        hasErr: !!view.__err,
      });
    } catch(e){ return JSON.stringify({ok:false, err:String(e.message||e)}); }
  })()`;
  const raw = await evalJs(expr);
  if (raw && raw.__exception) return { ok: false, err: raw.__exception };
  try { return JSON.parse(raw || '{}'); } catch { return { ok: false, err: 'parse' }; }
}

// 通过前端 showStoryScene 渲染进 DOM（内部会再次调用 api_scene_goto 并渲染 bg/立绘/文本）
async function renderSceneFront(sceneId) {
  const r = await evalJs(`(async function(){ try { await window.showStoryScene(${JSON.stringify(sceneId)}); return 'ok'; } catch(e){ return 'ERR:'+String(e.message||e); } })()`);
  return r;
}

// 进入主神空间世界并渲染
async function enterNexusFront() {
  const v = await inv('api_nexus_enter');
  if (!v || v.__err) return v;
  const data = JSON.stringify(v);
  await evalJs(`(async function(){
    try { if (window.setMode) setMode('world'); } catch(e){}
    try {
      const vv = ${data};
      if (vv.w !== undefined) World2D.setData(vv); else if (vv.px !== undefined) World2D.setData(vv);
    } catch(e){ window.__nexusErr = String(e.message||e); }
    return true;
  })()`);
  return v;
}

/* ================= zone3d 战斗触发（复用 shot_fight_3d 方法） ================= */
const TARGET = { id: 'e_licker', name: '舔食者', floor: 1, x: 35, y: 22, fight: 'licker', hp: 112 };
let world = null;
const freshWorld = async () => { world = await inv('api_world'); return world; };
const zoneActiveQ = () => evalJs('(function(){return !!window.ZoneActive;})()');

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

async function rawMove(dx, dy) {
  const r = await inv('api_world_move', { dx, dy });
  return r;
}
async function tryEnterFromEncounter(r) {
  if (r && r.encounter) {
    const rr = await evalJs(`(async function(){ try { await window.enterZone({id:${JSON.stringify(r.encounter.enemy_id)},kind:'fight',ref:${JSON.stringify(r.encounter.fight_id)},name:${JSON.stringify(r.encounter.name)}}, null); return 'ok'; } catch(e){ return 'ERR:'+String(e.message||e); } })()`);
    await sleep(2200);
    return true;
  }
  return false;
}
async function walkTo(tx, ty, allowPortalFn) {
  let guard = 0;
  while (guard++ < 500) {
    await freshWorld();
    if (world.px === tx && world.py === ty) return true;
    const p = bfsPath(tx, ty, allowPortalFn);
    if (!p || p.length === 0) { log(`   无路到(${tx},${ty}) 层=${world.floor} @(${world.px},${world.py})`); return false; }
    const [tx2, ty2] = p.length > 1 ? p[1] : p[0];
    if (tx2 === tx && ty2 === ty && allowPortalFn && allowPortalFn(tx, ty)) {
      const r = await rawMove(tx2 - world.px, ty2 - world.py);
      if (await tryEnterFromEncounter(r)) return 'encounter';
      return true;
    }
    const r = await rawMove(tx2 - world.px, ty2 - world.py);
    if (await tryEnterFromEncounter(r)) return 'encounter';
  }
  return false;
}

async function triggerZone3d() {
  let entered = false, hitEnemy = null;
  await freshWorld();
  if (world.floor !== TARGET.floor) {
    const portalCands = (world.portals || [])
      .filter(p => p.to_floor != null && Math.abs(p.to_floor - TARGET.floor) < Math.abs(world.floor - TARGET.floor))
      .sort((a, b) => Math.abs(a.to_floor - TARGET.floor) - Math.abs(b.to_floor - TARGET.floor));
    for (const pt of portalCands) {
      const r = await walkTo(pt.x, pt.y, (x, y) => x === pt.x && y === pt.y);
      if (r === 'encounter') { entered = true; }
      await freshWorld();
      if (world.floor === TARGET.floor) { log('  已切到 floor:' + world.floor + ' @(' + world.px + ',' + world.py + ')'); break; }
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
    for (const [nx2, ny2] of near) {
      await freshWorld();
      const w = await walkTo(nx2, ny2, null);
      if (w === 'encounter') { entered = true; break; }
      if (await zoneActiveQ()) { entered = true; break; }
      if (w !== true) continue;
      const r = await rawMove(TARGET.x - world.px, TARGET.y - world.py);
      if (await tryEnterFromEncounter(r)) entered = true;
      if (await zoneActiveQ()) { entered = true; break; }
      break;
    }
  }
  if (entered) await freshWorld();
  log('[zone3d] 撞到敌人=' + hitEnemy + ' zone3d-active=' + entered);
  if (!entered) {
    log('[zone3d-fallback] 强制 enterZone');
    const r = await evalJs(`(async function(){ try { await window.enterZone({id:${JSON.stringify(TARGET.id)},kind:'fight',ref:${JSON.stringify(TARGET.fight)},name:${JSON.stringify(TARGET.name)}}, null); return 'ok'; } catch(e){ return 'ERR:'+String(e.message||e); } })()`);
    log('enterZone(fallback) -> ' + r);
    await sleep(2000);
    entered = await zoneActiveQ();
  }
  return entered;
}

const pressKey = k => evalJs(`(function(){ try { const ev=new KeyboardEvent('keydown',{key:${JSON.stringify(k)},bubbles:true}); window.dispatchEvent(ev); return 1; } catch(e){ return 0; } })()`);

/* ================= 主流程 ================= */
async function main() {
  const child = cleanLaunch();
  let page;
  try { page = await getPage(); } catch (e) { log('FATAL getPage ' + e.message); process.exit(2); }
  log('CDP connected, page=' + page.title);
  await connect(page);
  await sleep(3000);
  for (let i = 0; i < 30; i++) {
    try { const t = await evalJs('document.title'); if (t && t.includes('IPC_OK')) break; } catch { }
    await sleep(500);
  }
  log('UI ready, title=' + await evalJs('document.title'));

  // ---------- 00 标题 ----------
  await sleep(800);
  await screenshot('00_title');

  // ---------- 世界地图 (api_new → biohazard 3D 体素地图) ----------
  // 用 btnNew 触发 enterWorld (api_new)
  const clickedNew = await evalJs(`(function(){const b=document.getElementById('btnNew'); if(b&&b.offsetParent!==null){b.click();return 1;} return 0;})()`);
  log('clicked btnNew=' + clickedNew);
  if (!clickedNew) {
    // 兜底:直接调 enterWorld
    await evalJs('(async function(){ try { await enterWorld(); } catch(e){} return 1; })()');
  }
  await sleep(2500);
  const wm = await freshWorld();
  log('world map floor=' + (wm && wm.floor_name) + ' px/py=' + (wm && wm.px) + '/' + (wm && wm.py) + ' enemies=' + ((wm && wm.enemies) || []).length);
  // 恢复 world 模式渲染，确保 3D voxel 地图可见
  await evalJs(`(async function(){ try { if(window.setMode) setMode('world'); } catch(e){} try { World2D.setData(${JSON.stringify(wm)}); } catch(e){} return 1; })()`);
  await sleep(1500);
  await screenshot('02_world_map');

  // ---------- zone3d 战斗 ----------
  await evalJs(`(async function(){ try { if(window.setMode) setMode('world'); } catch(e){} try { World2D.setData((await window.__TAURI__.core.invoke('api_world'))); } catch(e){} return 1; })()`);
  const zi = await evalJs(`(function(){ const c=document.getElementById('worldCanvas'); return {has: !!c, w: c?c.width:0, active: window.ZoneActive}; })()`);
  log('worldCanvas info: ' + JSON.stringify(zi));
  const entered3d = await triggerZone3d();
  log('zone3d entered=' + entered3d);
  const zi2 = await evalJs(`(function(){ const c=document.getElementById('zone3dContainer'); return {active: window.ZoneActive===true, canvas: !!c&&!!c.querySelector('canvas'), canvases: c?c.querySelectorAll('canvas').length:0, title:(document.getElementById('zoneTitle')||{}).textContent}; })()`);
  log('zone3d render info: ' + JSON.stringify(zi2));

  // 连拍 3 张三D战斗
  const fightActs = ['none', 'attack', 'dodge'];
  for (let i = 0; i < 3; i++) {
    if (fightActs[i] === 'attack') { await pressKey('j'); await sleep(170); }
    else if (fightActs[i] === 'dodge') { await pressKey('k'); await sleep(170); }
    await sleep(700);
    await screenshot('fight_z' + (i + 1));
  }
  // 记录是否 zone3d
  results.push({ name: '_zone3d_flag:' + (entered3d ? 'true' : 'false'), size: 0 });

  // ---------- 退出战斗回世界，进入主神空间 ----------
  await evalJs(`(async function(){ try { await window.leaveZone ? window.leaveZone() : window.__TAURI__.core.invoke('api_zone_exit'); } catch(e){} return 1; })()`);
  await sleep(1200);
  await enterNexusFront();
  await sleep(1500);
  await screenshot('01_nexus');

  // ---------- 55 副本场景 ----------
  const mapData = JSON.parse(fs.readFileSync(SCENE_MAP, 'utf8'));
  const slugs = mapData.result;

  for (const [slug, cands] of Object.entries(slugs)) {
    let captured = false, lastErr = '';
    // 最多尝试候选前 8 个
    for (const cid of cands.slice(0, 10)) {
      const v = await gotoShowScene(cid);
      if (!v.ok) { lastErr = v.err || 'scene-goto-error(id=' + cid + ')'; continue; }
      if (v.hasFight) { lastErr = 'scene-is-fight(id=' + cid + ')'; continue; }
      if (v.card) { lastErr = 'scene-is-card(id=' + cid + ')'; continue; }
      if (v.kind === 'scene' && v.bg && v.parasLen > 0) {
        // 渲染进 DOM
        await renderSceneFront(cid);
        await sleep(900); // 等背景/立绘渲染
        const s = await screenshot(slug);
        if (s.ok) { PASS++; captured = true; }
        else { fails.push({ slug, reason: 'shot-too-small(id=' + cid + ')' }); }
        break;
      } else {
        lastErr = 'no-bg-or-text(id=' + cid + ', bg=' + v.bg + ', paras=' + v.parasLen + ', kind=' + v.kind + ')';
      }
    }
    if (!captured) { FAIL++; fails.push({ slug, reason: lastErr || 'no-candidate' }); log('FAIL ' + slug + ' -> ' + (lastErr || 'no-candidate')); }
  }

  log('===== DONE PASS=' + PASS + ' FAIL=' + FAIL + ' shots=' + results.length + ' =====');
  log('FAILS: ' + JSON.stringify(fails, null, 2));
  child.kill();
  process.exit(FAIL > 0 ? 1 : 0);
}

main().catch(e => { log('FATAL ' + (e.stack || e.message)); console.error(e); process.exit(2); });
