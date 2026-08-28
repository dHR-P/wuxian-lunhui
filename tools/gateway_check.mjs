// 6 副本网关验收（CDP）：进主神 → 逐网关交互 → 断言 world_id 切换 + 落点
import { spawn, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOOLS = __dirname;
const ROOT = path.resolve(TOOLS, '..', 'server-rs');
const EXE = path.join(ROOT, 'target', 'release', 'wuxian-horror-ch1.exe');
const SAVE = path.join(ROOT, 'target', 'release', 'data', 'save.json');
const LOG = path.join(TOOLS, 'artifacts', 'logs', 'gateways_steps.log');
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

// 网关表：id → 期望 world_id
const GW = [
  ['gw_zhouyuan', 'zhuyuan'],
  ['gw_biohazard', 'biohazard_ch1'],
  ['gw_moshi', 'moshi_shoucheng'],
  ['gw_yinse', 'yinse_dadi'],
  ['gw_yiying', 'yiying'],
  ['gw_tianshe', 'tianshe'],
  ['gw_jiguancheng', 'jiguancheng'],
  ['gw_moruiya', 'moruiya'],
  ['gw_cangjingge', 'cangjingge'],
  ['gw_jianzhong', 'jianzhong'],
  ['gw_tongqu', 'tongqu'],
  ['gw_juluoji', 'juluoji'],
  ['gw_xinghe', 'xinghe'],
  ['gw_sishen', 'sishen'],
  ['gw_mumiyi', 'mumiyi'],
  ['gw_mojiao', 'mojiao'],
  ['gw_wulin', 'wulin'],
  ['gw_tianting', 'tianting'],
  ['gw_hezi', 'hezi'],
];

async function main() {
  const child = cleanLaunch();
  let page;
  try { page = await getPage(); } catch (e) { log('FATAL ' + e.message); process.exit(2); }
  await connect(page);
  await sleep(3500);
  log('UI ready');

  // 进主神（先新局→api_nexus_enter）
  await evalJs(`(function(){const b=[...document.querySelectorAll('.menuBtns .mbtn')].filter(b=>b.offsetParent!==null).find(b=>(b.innerText||'').includes('轮回'));if(b){b.click();return 1;}return 0;})()`);
  await sleep(2000);
  await inv('api_nexus_enter');
  const st0 = saveState();
  if (st0 && st0.world_id === 'zhutianshenkong') { PASS++; log('PASS 进入主神'); } else { FAIL++; log('FAIL 进主神'); }

  for (const [gwId, expectWorld] of GW) {
    const r = await inv('api_world_interact', { objId: gwId });
    const st = saveState();
    if (r && !r.__err && st && st.world_id === expectWorld) {
      PASS++; log(`PASS ${gwId} → ${expectWorld} 落点(${st.px},${st.py}) floor=${st.floor}`);
    } else {
      FAIL++; log(`FAIL ${gwId} 期望 ${expectWorld} resp=${JSON.stringify(r).slice(0,140)} world=${st && st.world_id}`);
    }
    // 回主神
    await inv('api_nexus_enter');
  }

  log(`===== 网关验收 PASS=${PASS} FAIL=${FAIL} =====`);
  ws.close();
  child.kill();
  process.exit(FAIL > 0 ? 1 : 0);
}
main().catch(e => { console.error('FATAL', e); process.exit(2); });