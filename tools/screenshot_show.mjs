// 截图展示：启动游戏 → 进生化蜂巢 → 战斗副本截图 + 世界地图截图
import { spawn, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', 'server-rs');
const EXE = path.join(ROOT, 'target', 'release', 'wuxian-horror-ch1.exe');
const SAVE = path.join(ROOT, 'target', 'release', 'data', 'save.json');
const OUT = path.join(__dirname, 'artifacts', 'shots');
const PORT = 9702;
fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));

function cleanLaunch() {
  try { execSync(`taskkill /IM wuxian-horror-ch1.exe /T /F 2>nul`, { stdio: 'pipe' }); } catch {}
  fs.rmSync(SAVE, { force: true });
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
      const r = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const list = await r.json();
      const p = list.find(x => x.type === 'page');
      if (p) return p;
    } catch {}
    await sleep(500);
  }
  throw new Error('page not found');
}
let ws, nextId = 1;
async function connect(page) {
  ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
}
function send(o) { ws.send(JSON.stringify(o)); }
function cdp(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = nextId++;
    const timer = setTimeout(() => reject(new Error('timeout')), 20000);
    const onMsg = ev => {
      let m; try { m = JSON.parse(ev.data); } catch { return; }
      if (m.id !== id) return;
      clearTimeout(timer); ws.removeEventListener('message', onMsg);
      m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result);
    };
    ws.addEventListener('message', onMsg);
    send({ id, method, params });
  });
}
const evalJs = (expression) => cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }).then(r => r?.result?.value);
const inv = (cmd, args) => evalJs(`(async function(){ try { return await window.__TAURI__.core.invoke(${JSON.stringify(cmd)}, ${JSON.stringify(args||{})}); } catch(e){ return {__err:String(e.message||e)}; } })()`);
async function shot(name) {
  const r = await cdp('Page.captureScreenshot', { format: 'png' });
  const p = path.join(OUT, name);
  fs.writeFileSync(p, Buffer.from(r.data, 'base64'));
  console.log('SHOT', name, fs.statSync(p).size + 'B');
}

async function main() {
  const child = cleanLaunch();
  const page = await getPage();
  await connect(page);
  await sleep(3500);

  // 进生化蜂巢（新局 → 进蜂巢）
  await evalJs(`(function(){const b=[...document.querySelectorAll('.mbtn')].filter(b=>b.offsetParent!==null).find(b=>(b.innerText||'').includes('轮回'));if(b){b.click();return 1;}return 0;})()`);
  await sleep(1800);
  await inv('api_nexus_enter');
  await sleep(800);
  await inv('api_world_interact', { objId: 'gw_biohazard' });
  await sleep(1500);
  await shot('1_world_map_biohazard.png');

  // 进入一场战斗副本（若有战斗触发，直接 goto 一个已知战斗场景）
  await inv('api_scene_goto', { scene_id: 's_boss' }); // 生化舔食者 BOSS 战
  await sleep(2500);
  await shot('2_fight_boss_3d.png');

  console.log('DONE');
  ws.close();
  child.kill();
  process.exit(0);
}
main().catch(e => { console.error('FATAL', e.message); process.exit(2); });