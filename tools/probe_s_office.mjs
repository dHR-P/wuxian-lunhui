// 探针:进入 s_office 后 dump DOM 状态(诊断 choices 为何不可见)
import { spawn, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOOLS = __dirname;
const ROOT = path.resolve(TOOLS, '..', 'server-rs');
const EXE = path.join(ROOT, 'target', 'release', 'wuxian-horror-ch1.exe');
const SAVE = path.join(ROOT, 'target', 'release', 'data', 'save.json');
const PORT = 9702;
const sleep = ms => new Promise(r => setTimeout(r, ms));
function runSync(cmd) { try { return execSync(cmd, { stdio: 'pipe' }).toString(); } catch { return ''; } }

runSync(`taskkill /IM wuxian-horror-ch1.exe /T /F 2>nul`);
try {
  const out = execSync(`netstat -ano | findstr :${PORT}`, { stdio: 'pipe' }).toString();
  for (const line of out.split(/\r?\n/)) {
    const m = line.trim().match(/(\d+)\s*$/);
    if (m) runSync(`taskkill /PID ${m[1]} /T /F 2>nul`);
  }
} catch { }
fs.rmSync(SAVE, { force: true });
const child = spawn(EXE, [], { env: { ...process.env, WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${PORT}` }, stdio: 'ignore' });
child.unref();

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
const page = await getPage();
ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
function send(o) { ws.send(JSON.stringify(o)); }
function evalJs(expression, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const id = nextId++;
    const timer = setTimeout(() => reject(new Error('eval timeout')), timeout);
    function onMsg(ev) {
      let msg; try { msg = JSON.parse(ev.data); } catch { return; }
      if (msg.id !== id) return;
      clearTimeout(timer); ws.removeEventListener('message', onMsg);
      resolve(msg.result?.result?.value);
    }
    ws.addEventListener('message', onMsg);
    send({ id, method: 'Runtime.evaluate', params: { expression, returnByValue: true, awaitPromise: true } });
  });
}
await sleep(3500);

// 点击轮回按钮
await evalJs(`(function(){const b=[...document.querySelectorAll('.menuBtns .mbtn')].find(b=>b.offsetParent!==null);if(b){b.click();return b.innerText;}return 'none';})()`);
await sleep(4000);

const dump = await evalJs(`(function(){
  const ids = ['choices','narrBox','narrText','titleScreen','worldView','endOverlay','cineWrap'];
  const o = {};
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (!el) { o[id] = 'MISSING'; return; }
    const cs = getComputedStyle(el);
    o[id] = JSON.stringify({ display: cs.display, vis: cs.visibility, opacity: cs.opacity, off: el.offsetParent === null,
      text: (el.innerText || '').replace(/\\s+/g, ' ').slice(0, 120) });
  });
  o.choicesCount = document.querySelectorAll('#choices .choice').length;
  o.choicesHTML = (document.getElementById('choices')||{innerHTML:''}).innerHTML.slice(0, 300);
  o.tw = (typeof TW !== 'undefined') ? JSON.stringify({ done: TW.done, full: (TW.full||'').slice(0,60) }) : 'TW-undefined';
  o.buttons = [...document.querySelectorAll('button')].map(b => (b.innerText||'').replace(/\\s+/g,' ').slice(0,20)).join('||');
  return JSON.stringify(o);
})()`);
console.log(dump);
const save = fs.existsSync(SAVE) ? JSON.parse(fs.readFileSync(SAVE, 'utf8')) : null;
console.log('SAVE scene_id =', save && save.scene_id);
ws.close();
child.kill();
process.exit(0);