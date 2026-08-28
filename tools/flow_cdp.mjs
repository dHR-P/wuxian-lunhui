// 无限轮回 · 全流程 GUI 测试（Node CDP 驱动）
// 启动游戏 → 标题 → 完整章节 → BOSS → 结算 → 主神空间 → 回标题
// 每个步骤: 按关键词点击可见按钮, 轮询 save.json 断言 scene_id, 关键节点截图
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
const SHOTS = path.join(TOOLS, 'shots');
const LOG = path.join(TOOLS, 'artifacts', 'logs', 'flow_steps.log');
const PORT = 9699;

let PASS = 0, FAIL = 0;
const log = s => { fs.appendFileSync(LOG, s + '\n'); console.log(s); };

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function runSync(cmd) { try { return execSync(cmd, { stdio: 'pipe' }).toString(); } catch (e) { return String(e.stderr || e.message); } }

function cleanLaunch() {
  log('== 清理并启动游戏 ==');
  // 杀残留游戏进程及其 webview 子进程
  runSync(`taskkill /IM wuxian-horror-ch1.exe /T /F 2>nul`);
  // 杀掉占用目标端口的僵尸 webview（来自旧实例）
  try {
    const out = execSync(`netstat -ano | findstr :${PORT}`, { stdio: 'pipe' }).toString();
    for (const line of out.split(/\r?\n/)) {
      const m = line.trim().match(/(\d+)\s*$/);
      if (m) runSync(`taskkill /PID ${m[1]} /T /F 2>nul`);
    }
  } catch { /* no listener */ }
  fs.rmSync(SAVE, { force: true });
  fs.rmSync(LOG, { force: true });
  fs.mkdirSync(SHOTS, { recursive: true });
  // 清理旧截图
  for (const f of fs.readdirSync(SHOTS)) fs.rmSync(path.join(SHOTS, f), { force: true });
  const child = spawn(EXE, [], {
    env: { ...process.env, WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${PORT}` },
    stdio: 'ignore', detached: false,
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

function send(obj) { ws.send(JSON.stringify(obj)); }

function evalJs(expression, timeout = 8000) {
  return new Promise((resolve, reject) => {
    const id = nextId++;
    const timer = setTimeout(() => { ws.removeEventListener('message', onMsg); reject(new Error('eval timeout')); }, timeout);
    function onMsg(ev) {
      let msg; try { msg = JSON.parse(ev.data); } catch { return; }
      if (msg.id !== id) return;
      clearTimeout(timer); ws.removeEventListener('message', onMsg);
      if (msg.error) return reject(new Error('cdp: ' + JSON.stringify(msg.error)));
      if (msg.result?.exceptionDetails) return resolve({ __exception: (msg.result.exceptionDetails.exception?.description || msg.result.exceptionDetails.text || 'js exception').slice(0, 200) });
      resolve(msg.result?.result?.value);
    }
    ws.addEventListener('message', onMsg);
    send({ id, method: 'Runtime.evaluate', params: { expression, returnByValue: true, awaitPromise: true } });
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
        if (b64) { fs.writeFileSync(path.join(SHOTS, name + '.png'), Buffer.from(b64, 'base64')); }
      } catch { }
      resolve();
    }
    ws.addEventListener('message', onMsg);
    send({ id, method: 'Page.captureScreenshot', params: { format: 'png' } });
    setTimeout(() => { ws.removeEventListener('message', onMsg); resolve(); }, 4000);
  });
}

function getScene() {
  try {
    if (!fs.existsSync(SAVE)) return '';
    return JSON.parse(fs.readFileSync(SAVE, 'utf8')).scene_id || '';
  } catch { return ''; }
}

function getSaveJson() {
  try {
    if (!fs.existsSync(SAVE)) return null;
    return JSON.parse(fs.readFileSync(SAVE, 'utf8'));
  } catch { return null; }
}

// 在页面内按关键词点击可见按钮；返回被点标签(去空白)或 ''
async function clickKw(kw) {
  const e = `(function(){const kw=${JSON.stringify(kw)};
    const els=[...document.querySelectorAll('#choices .choice,.menuBtns .mbtn,.ovCard .mbtn,#cineSkip')].filter(b=>b.offsetParent!==null);
    const hit=els.find(b=>(b.innerText||'').replace(/\\s+/g,'').includes(kw));
    if(hit){const t=(hit.innerText||'').replace(/\\s+/g,'');hit.click();return t;}return '';})()`;
  const v = await evalJs(e);
  if (v && v.__exception) return '';
  return String(v || '');
}

// 等待某关键词按钮出现（用于过场后等按钮渲染）
async function waitBtn(kw, ms = 8000) {
  const sw = Date.now();
  while (Date.now() - sw < ms) {
    try {
      const v = await clickKw(kw);
      if (v) return v;
    } catch { }
    await sleep(300);
  }
  return '';
}

// 点击并断言场景; expect 为 scene_id 前缀; timeoutMs 总超时
async function step(kw, expect, { timeoutMs = 15000, tag = '', shot = false } = {}) {
  const sw = Date.now();
  while (Date.now() - sw < timeoutMs) {
    let label = '';
    try { label = await clickKw(kw); } catch { }
    if (label) {
      // 点击成功, 等待场景变化
      const dl = Date.now() + Math.min(4000, timeoutMs);
      while (Date.now() < dl) {
        await sleep(250);
        const sc = getScene();
        if (!expect || sc.startsWith(expect)) {
          PASS++;
          log(`PASS [${kw}] -> ${sc}${tag ? ' (' + tag + ')' : ''}`);
          if (shot) await screenshot(tag || sc);
          return true;
        }
      }
      // 场景未变: 可能点到同类按钮(战斗日志刷新), 继续重试
      await sleep(200);
    } else {
      await sleep(350);
    }
  }
  FAIL++;
  log(`FAIL [${kw}] no-button (expect ${expect})`);
  await screenshot('FAIL_' + (tag || kw.replace(/[^\w\u4e00-\u9fa5]/g, '_')));
  return false;
}

// 战斗循环: 优先终结技, 低血量后撤保命, 处理基因锁卡片; 直到场景变为 winScene
async function fightUntil(winScene, maxRounds = 60, tag = 'fight') {
  for (let i = 0; i < maxRounds; i++) {
    const sc = getScene();
    if (sc.startsWith(winScene)) return true;
    if (sc.startsWith('e_')) return false; // 死亡结局

    // 等待本回合 UI 就绪: 卡片打开 或 choices 有按钮
    let state = '';
    for (let w = 0; w < 25; w++) {
      state = await evalJs(`(function(){const o=document.getElementById('endOverlay');
        if(o&&getComputedStyle(o).display!=='none')return 'CARD';
        const els=[...document.querySelectorAll('#choices .choice')].filter(b=>b.offsetParent!==null);
        return els.length?els.map(b=>(b.innerText||'').replace(/\\s+/g,'')).join('|'):'';})()`);
      if (state === 'CARD' || state) break;
      await sleep(300);
    }
    log(`DBG[${tag}][${i}] sc=${sc} state=${String(state).slice(0,90)}`);

    if (state === 'CARD') {
      const r = await clickKw('睁开眼');
      log(`DBG[${tag}][${i}] card click -> ${r}`);
      if (r) { await sleep(900); continue; }
      await sleep(600);
      continue;
    }

    const st = getSaveJson();
    const hp = st ? (st.hp ?? 100) : 100;
    const awakened = st ? !!st.gene_lock : false;

    // 终结技
    if (await clickKw('终结技')) { await sleep(900); continue; }
    // 未觉醒且血量告急: 后撤观察保命, 撑到基因锁觉醒(hp<=30自动触发)
    if (!awakened && hp <= 40) {
      if (await clickKw('后撤观察')) { await sleep(800); continue; }
    }
    if (await clickKw('攻击')) { await sleep(900); continue; }
    if (await clickKw('全力一搏')) { await sleep(900); continue; }
    await sleep(500);
  }
  return getScene().startsWith(winScene);
}

async function main() {
  const child = cleanLaunch();
  let page;
  try { page = await getPage(); } catch (e) { log('FATAL ' + e.message); process.exit(2); }
  log('CDP connected, page=' + page.title);
  await connect(page);
  await sleep(3000);

  // 等待页面脚本加载完成 (IPC_OK 标记)
  for (let i = 0; i < 30; i++) {
    try {
      const t = await evalJs('document.title');
      if (t && t.includes('IPC_OK')) break;
    } catch { }
    await sleep(500);
  }
  log('UI ready, title=' + await evalJs('document.title'));

  // ---- 流程 ----
  if (!(await step('进入轮回', 's_office', { timeoutMs: 20000, tag: '01_office', shot: true }))) { log('ABORT@title'); child.kill(); process.exit(3); }

  await step('输入YES', 's_yes', { tag: '02_yes' });
  await step('……', 's_nexus', { tag: '03_nexus', shot: true });
  await step('恐怖片世界', 's_nexus2', {});
  await step('冷静', 's_weapon', { tag: '04_weapon', shot: true });
  await step('消防斧', 's_warning', {});
  await step('……', 's_train', {});
  await step('支线A', 's_train_rain', { tag: '05_train_rain', shot: true });
  await step('列车减速', 's_mission', {});
  await step('跟随队伍', 's_corridor', {});
  await step('支线B1', 's_observe_lab', { tag: '06_observe_lab', shot: true });
  await step('追上队伍', 's_bhall', {});
  await step('救卡普兰', 's_fight_zombie1_save', { tag: '07_fight_zombie', shot: true });

  // 战斗1
  if (!(await fightUntil('s_after_zombie1_save', 30, 'zombie1'))) { log('FAIL zombie1 fight'); FAIL++; } else { PASS++; log('PASS zombie1 fight'); }

  await step('压下恶心', 's_find_adrenaline', {});
  await step('收好肾上腺素', 's_to_redqueen', { tag: '08_adrenaline', shot: true });
  await step('支线B2', 's_laser_observed', { tag: '09_laser_observed', shot: true });
  await step('大家小心', 's_shutdown', {});
  await step('冲进玻璃通道', 's_laser_cine', { tag: '10_laser_cine', shot: true });
  // 过场视频: 点跳过, 等 choices 渲染后继续
  await waitBtn('跳过', 6000).catch(() => '');
  await step('握紧武器', 's_laser', { tag: '11_laser', shot: true });
  await step('判断攻击模式', 's_laser_q1', {});
  await step('向上跳跃', 's_laser_q2', {});
  await step('贴地滑铲', 's_laser_q3', {});
  await step('承重梁', 's_laser_end', { tag: '12_laser_end', shot: true });
  await step('重启隔离系统', 's_after_laser', {});
  await step('我们还得继续', 's_waterway', { tag: '13_waterway', shot: true });
  await step('正面开路', 's_fight_horde', { tag: '14_fight_horde', shot: true });

  // 战斗2 尸群
  if (!(await fightUntil('s_rain_bitten', 30, 'horde'))) { log('FAIL horde fight'); FAIL++; } else { PASS++; log('PASS horde fight'); }

  await step('肾上腺素', 's_adrenaline_used', { tag: '15_rain_saved', shot: true });
  await step('尖啸', 's_boss_intro', { tag: '16_boss_intro', shot: true });
  await waitBtn('跳过', 6000).catch(() => '');
  await step('迎战', 's_boss', { tag: '17_boss', shot: true });

  // BOSS 战（可能触发基因锁觉醒卡片）
  if (!(await fightUntil('s_escape_train', 40, 'licker'))) { log('FAIL licker fight'); FAIL++; } else { PASS++; log('PASS licker fight'); }
  await screenshot('18_escape_train');

  await step('……', 's_settle', { tag: '19_settle', shot: true });
  // 结算卡片 -> 查看主神空间
  await step('查看主神空间', 's_settle', { tag: '20_nexus', shot: true });
  // 主神空间卡片 -> 进入下一次轮回 -> 回标题
  await step('进入下一次轮回', '', { tag: '21_title_back', shot: true });

  // 断言回到标题画面
  await sleep(1500);
  let backTitle = false;
  try {
    backTitle = await evalJs(`(function(){const t=document.getElementById('titleScreen');return !!t && getComputedStyle(t).display!=='none';})()`);
  } catch { }
  if (backTitle) { PASS++; log('PASS back-to-title'); } else { FAIL++; log('FAIL back-to-title'); }

  const st = getSaveJson();
  log(`===== 完成 PASS=${PASS} FAIL=${FAIL} =====`);
  if (st) log(`final: scene=${st.scene_id} hp=${st.hp} san=${st.san} pts=${st.points} dead=[${(st.dead_team||[]).join('+')}] flags=${JSON.stringify(st.flags)}`);
  ws.close();
  child.kill();
  process.exit(FAIL > 0 ? 1 : 0);
}

main().catch(e => { console.error('FATAL', e); process.exit(2); });
