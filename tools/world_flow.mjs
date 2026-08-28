// 开放世界全流程 GUI 测试（Node CDP 驱动）
// 标题 → 世界地图 → 移动 → NPC对话 → 调查点场景 → 战斗副本 → 返回地图
import { spawn, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOOLS = __dirname;
const ROOT = path.resolve(TOOLS, '..', 'server-rs');
const EXE = path.join(ROOT, 'target', 'release', 'wuxian-horror-ch1.exe');
const DATA = path.join(ROOT, 'target', 'release', 'data');
const SAVE = path.join(DATA, 'save.json');
const LOG = path.join(TOOLS, 'artifacts', 'logs', 'world_steps.log');
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

function getScene() {
  try {
    if (!fs.existsSync(SAVE)) return '';
    return JSON.parse(fs.readFileSync(SAVE, 'utf8')).scene_id || '';
  } catch { return ''; }
}

async function main() {
  const child = cleanLaunch();
  let page;
  try { page = await getPage(); } catch (e) { log('FATAL ' + e.message); process.exit(2); }
  await connect(page);
  await sleep(3000); // 等待页面脚本加载（探针已清理，用固定等待）
  log('UI ready');

  // 1. 进入轮回 → 世界地图
  await evalJs(`(function(){const b=[...document.querySelectorAll('.menuBtns .mbtn')].find(b=>b.offsetParent!==null); if(b){b.click();return 1;}return 0;})()`);
  await sleep(2000);
  const w1 = await inv('api_world');
  if (w1 && w1.px !== undefined) { PASS++; log('PASS 世界地图加载 px=' + w1.px + ' py=' + w1.py + ' enemies=' + w1.enemies.length); }
  else { FAIL++; log('FAIL 世界地图加载'); }

  // 2. 移动测试（连续移动）
  let moved = 0;
  for (let i = 0; i < 30; i++) {
    const r = await inv('api_world_move', { dx: 1, dy: 0 });
    if (r && r.ok) { moved++; if (moved >= 8) break; }
    else break;
  }
  if (moved >= 5) { PASS++; log(`PASS 移动 ${moved} 步`); } else { FAIL++; log(`FAIL 移动仅 ${moved} 步`); }

  // 3. NPC 对话（直接调场景）
  const zj = await inv('api_scene_goto', { sceneId: 's_world_zhangjie' });
  if (zj && zj.speaker === '张杰') { PASS++; log('PASS 张杰对话 speaker=' + zj.speaker); } else { FAIL++; log('FAIL 张杰对话'); }

  // 4. 无菌实验室调查
  const sl = await inv('api_scene_goto', { sceneId: 's_b_sterile_lab' });
  if (sl && (sl.choices || []).length >= 4) { PASS++; log('PASS 无菌实验室 choices=' + (sl.choices || []).length); } else { FAIL++; log('FAIL 无菌实验室'); }

  // 5. 红后谜题
  const rq = await inv('api_scene_goto', { sceneId: 's_rq_pipe' });
  if (rq && rq.speaker === '红后') { PASS++; log('PASS 红后谜题 speaker=' + rq.speaker); } else { FAIL++; log('FAIL 红后谜题'); }
  const rq2 = await inv('api_choose', { index: 0 });
  if (rq2 && String(rq2.loc || '').includes('通过')) { PASS++; log('PASS 管道题答对 -> ' + rq2.loc); } else { FAIL++; log('FAIL 管道题 loc=' + (rq2 && rq2.loc)); }

  // 6. 战斗副本
  const z = await inv('api_world_interact', { objId: 'z_licker' });
  if (z && z.zone && z.zone.kind === 'fight') { PASS++; log('PASS 进入舔食者副本 zone=' + z.zone.id); } else { FAIL++; log('FAIL 舔食者副本'); }
  const atk = await inv('api_zone_action', { action: 'attack', arg: 0 });
  if (atk && atk.hud) { PASS++; log('PASS 副本攻击 player_hp=' + atk.player_hp); } else { FAIL++; log('FAIL 副本攻击'); }
  const ex = await inv('api_zone_exit');
  if (ex && ex.px !== undefined) { PASS++; log('PASS 副本退出回地图'); } else { FAIL++; log('FAIL 副本退出'); }

  // 7. 世界视图可见性
  const vis = await evalJs(`JSON.stringify({world: document.getElementById('worldView').style.display, canvas: document.getElementById('worldCanvas').width > 0})`);
  if (vis && vis.includes('"world":"block"')) { PASS++; log('PASS 世界视图可见'); } else { FAIL++; log('FAIL 世界视图可见'); }

  log(`===== 完成 PASS=${PASS} FAIL=${FAIL} =====`);
  ws.close();
  child.kill();
  process.exit(FAIL > 0 ? 1 : 0);
}

main().catch(e => { console.error('FATAL', e); process.exit(2); });
