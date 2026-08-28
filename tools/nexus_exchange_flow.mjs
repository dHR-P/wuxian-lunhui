// P1 补完验收：主神空间兑换/复活/简报 CDP 实测（Node CDP 驱动）
// 种子存档：world_id=biohazard_ch1、points=8000、dead_team=["蕾恩"] → 继续 → api_nexus_enter → 兑换成功/不足双路径 → 复活 → 简报
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
const LOG = path.join(TOOLS, 'artifacts', 'logs', 'nexus_exchange_steps.log');
const PORT = 9702;

let PASS = 0, FAIL = 0;
const log = s => { fs.appendFileSync(LOG, s + '\n'); console.log(s); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
function runSync(cmd) { try { return execSync(cmd, { stdio: 'pipe' }).toString(); } catch { return ''; } }

// 种子存档：已通关生化、8000 点、蕾恩阵亡、世界在生化（结构对齐真实 save.json：enemies_alive 为对象、fight/zone 可为 null）
function seedSave() {
  fs.mkdirSync(DATA, { recursive: true });
  const seed = {
    save_version: 2, world_id: 'biohazard_ch1',
    hp: 100, san: 80, points: 8000,
    weapon: 'Axe', ammo: 6,
    gene_lock: false, gene_lock_used: false,
    flags: { bh_cleared: true },
    dead_team: ['蕾恩'],
    resurrected_name: null,
    scene_id: 's_train', px: 1, py: 1, floor: 0,
    laser_fails: 0, fight: null, zone: null,
    inventory: [], map_objs: {},
    enemies_alive: {},
    explored: [],
    world_states: {},
    sp_grade: 'C',
    str_bonus: 0, agi_bonus: 0, bloodline: null,
  };
  fs.writeFileSync(SAVE, JSON.stringify(seed, null, 1), 'utf8');
}

function cleanLaunch() {
  runSync(`taskkill /IM wuxian-horror-ch1.exe /T /F 2>nul`);
  try {
    const out = execSync(`netstat -ano | findstr :${PORT}`, { stdio: 'pipe' }).toString();
    for (const line of out.split(/\r?\n/)) {
      const m = line.trim().match(/(\d+)\s*$/);
      if (m) runSync(`taskkill /PID ${m[1]} /T /F 2>nul`);
    }
  } catch { }
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
// 前端按钮点击：点「继续上次」等 .menuBtns .mbtn（title 屏）
const clickBtn = kw => evalJs(`(function(){const kw=${JSON.stringify(kw)};const els=[...document.querySelectorAll('.menuBtns .mbtn')].filter(b=>b.offsetParent!==null);const hit=els.find(b=>(b.innerText||'').replace(/\\s+/g,'').includes(kw));if(hit){hit.click();return true;}return false;})()`);

const saveState = () => { try { return JSON.parse(fs.readFileSync(SAVE, 'utf8')); } catch { return null; } };

async function main() {
  seedSave();
  const child = cleanLaunch();
  let page;
  try { page = await getPage(); } catch (e) { log('FATAL ' + e.message); process.exit(2); }
  await connect(page);
  await sleep(3500);
  log('UI ready (seeded points=8000 dead_team=[蕾恩])');

  // 1. 点「继续」进生化世界
  await clickBtn('继续');
  await sleep(2000);
  const w1 = await inv('api_world');
  log('world after continue: ' + JSON.stringify(w1 ? { px: w1.px, py: w1.py, n: w1.name } : w1));
  if (w1 && w1.px !== undefined) { PASS++; log('PASS 继续→生化世界'); } else { FAIL++; log('FAIL 继续→世界 ' + JSON.stringify(w1).slice(0,150)); }

  // 2. api_nexus_enter → 主神
  const ne = await inv('api_nexus_enter');
  const st1 = saveState();
  if (ne && !ne.__err && st1 && st1.world_id === 'zhutianshenkong' && st1.points === 8000) { PASS++; log(`PASS 进主神 points=8000 str_bonus=${st1.str_bonus} agi=${st1.agi_bonus} bloodline=${st1.bloodline}`); }
  else { FAIL++; log('FAIL 进主神 resp=' + JSON.stringify(ne).slice(0,150) + ' save=' + (st1 && st1.world_id)); }

  // 3. 走到兑换光球 (18,19) → interact（返回 point scene 路由）→ scene_goto 进入 → 兑换场景
  const ex = await inv('api_world_interact', { objId: 'np_exchange_strengthen' });
  const exScene = ex && ex.scene;
  const exGoto = exScene ? await inv('api_scene_goto', { sceneId: exScene }) : null;
  const exLabels = ((exGoto && exGoto.choices) || []).map(c => c.label || '').join('|');
  const exOk = exGoto && !exGoto.__err && exLabels.includes('细胞活力强化') && exLabels.includes('基因锁') && exLabels.includes('吸血鬼');
  if (exOk) { PASS++; log('PASS 兑换光球 → s_nexus_exchange 4选项 [' + exLabels.replace(/\|/g, ' / ').slice(0,90) + ']'); } else { FAIL++; log('FAIL 兑换光球 interact=' + JSON.stringify(ex).slice(0,100) + ' goto=' + JSON.stringify(exGoto).slice(0,180)); }

  // 4. 选「细胞活力强化」→ done：points 8000-800=7200, str_bonus=1
  const ch1 = await inv('api_choose', { index: 0 });
  const st2 = saveState();
  if (ch1 && !ch1.__err && st2 && st2.points === 7200 && st2.str_bonus === 1) { PASS++; log(`PASS 兑换强化扣点 points=${st2.points} str_bonus=${st2.str_bonus}`); }
  else { FAIL++; log('FAIL 兑换强化 resp=' + JSON.stringify(ch1).slice(0,150) + ' save=' + JSON.stringify(st2 ? { p: st2.points, s: st2.str_bonus } : null)); }
  await inv('api_scene_back');

  // 5. 基因锁（三光球共用 s_nexus_exchange，选项固定 index: 0强化/1基因锁/2血统）
  const gSc = await inv('api_world_interact', { objId: 'np_exchange_gene' });
  if (gSc && gSc.scene) await inv('api_scene_goto', { sceneId: gSc.scene });
  await inv('api_choose', { index: 1 }); // gene 2000
  const st3 = saveState();
  if (st3 && st3.points === 5200 && st3.gene_lock === true) { PASS++; log(`PASS 兑换基因锁 points=${st3.points} gene_lock=${st3.gene_lock}`); }
  else { FAIL++; log('FAIL 兑换基因锁 ' + JSON.stringify(st3 ? { p: st3.points, g: st3.gene_lock } : null)); }
  await inv('api_scene_back');
  const bSc = await inv('api_world_interact', { objId: 'np_exchange_bloodline' });
  if (bSc && bSc.scene) await inv('api_scene_goto', { sceneId: bSc.scene });
  // 基因锁已购后可见=[强化,血统,返回]，血统在 index 1
  await inv('api_choose', { index: 1 }); // vampire 3000
  const st4 = saveState();
  if (st4 && st4.points === 2200 && st4.bloodline === 'vampire') { PASS++; log(`PASS 兑换血统 points=${st4.points} bloodline=${st4.bloodline} agi=${st4.agi_bonus}`); }
  else { FAIL++; log('FAIL 兑换血统 ' + JSON.stringify(st4 ? { p: st4.points, b: st4.bloodline } : null)); }
  await inv('api_scene_back');

  // 6. 复活（剩 2200 < 4000 → fail 不扣点）：s_nexus_resurrection 选项 index 0=复活
  const alSc = await inv('api_world_interact', { objId: 'np_nexus_altar' });
  const alGoto = alSc && alSc.scene ? await inv('api_scene_goto', { sceneId: alSc.scene }) : null;
  const alLabels = ((alGoto && alGoto.choices) || []).map(c => c.label || '').join('|');
  const alOk = alGoto && !alGoto.__err && alLabels.includes('复活一名本次阵亡的同伴');
  if (alOk) { PASS++; log('PASS 复活祭坛 → s_nexus_resurrection（含复活选项）'); } else { FAIL++; log('FAIL 复活祭坛 interact=' + JSON.stringify(alSc).slice(0,100) + ' goto=' + JSON.stringify(alGoto).slice(0,150)); }
  const r1 = await inv('api_choose', { index: 0 });
  const st5 = saveState();
  if (st5 && st5.points === 2200 && st5.dead_team.length === 1) { PASS++; log(`PASS 复活点数不足拒绝不扣点 dead=${st5.dead_team.length}`); }
  else { FAIL++; log('FAIL 复活不足 ' + JSON.stringify(st5 ? { p: st5.points, d: st5.dead_team } : null) + ' resp=' + JSON.stringify(r1).slice(0,120)); }

  // 7. 简报（张杰对话 → 新选项 → card_briefing；直接 api_scene_goto 到 s_nexus_zhangjie 再找选项）
  const zj = await inv('api_scene_goto', { sceneId: 's_nexus_zhangjie' });
  const briefOpt = zj && !zj.__err && (zj.choices || []).some(c => String(c.label || '').includes('简报'));
  if (briefOpt) { PASS++; log('PASS 张杰对话含简报选项'); } else { FAIL++; log('FAIL 张杰简报选项 labels=' + ((zj && zj.choices || []).map(c => c.label || '').join('|')).slice(0,120)); }
  if (zj && !zj.__err) {
    const idx = (zj.choices || []).findIndex(c => String(c.label || '').includes('简报'));
    if (idx >= 0) {
      const br = await inv('api_choose', { index: idx });
      const btxt = JSON.stringify(br || '');
      if (btxt.includes('sp_grade') || btxt.includes('蕾恩') || btxt.includes('吸血鬼') || btxt.includes('体质')) { PASS++; log('PASS 简报卡内容含评级/兑换/队友信息'); }
      else { FAIL++; log('FAIL 简报卡内容 ' + btxt.slice(0,180)); }
    } else { FAIL++; log('FAIL 简报选项 index 未找到'); }
  }

  log(`===== 完成 PASS=${PASS} FAIL=${FAIL} =====`);
  ws.close();
  child.kill();
  process.exit(FAIL > 0 ? 1 : 0);
}

main().catch(e => { console.error('FATAL', e); process.exit(2); });