// 无限轮回 · CDP 驱动（Node 内置 WebSocket）
// 用法:
//   node cdp_driver.mjs dump <port>                  # 输出页面标题 + body 文本 + 可见按钮列表
//   node cdp_driver.mjs click <port> <keyword>       # 按关键词点击可见按钮, 返回被点标签或 '' 
//   node cdp_driver.mjs scene <port>                 # 输出 save.json 的 scene_id (无存档输出 NO_SAVE)
const [,, action, port, keyword] = process.argv;
const PORT = port || '9678';
const SAVE = 'C:/Users/GWL/Desktop/itwillclaude/games/wuxian-horror-ch1/server-rs/target/release/data/save.json';

let ws, nextId = 1;

async function getPage() {
  const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
  const list = await res.json();
  const page = list.find(p => p.type === 'page');
  if (!page) throw new Error('no page target');
  return page;
}

function send(obj) { ws.send(JSON.stringify(obj)); }

function evalJs(expression, opts = {}) {
  return new Promise((resolve, reject) => {
    const id = nextId++;
    const timer = setTimeout(() => { ws.removeEventListener('message', onMsg); reject(new Error('eval timeout: ' + expression.slice(0, 60))); }, 8000);
    function onMsg(ev) {
      let msg; try { msg = JSON.parse(ev.data); } catch { return; }
      if (msg.id !== id) return;
      clearTimeout(timer); ws.removeEventListener('message', onMsg);
      if (msg.error) return reject(new Error('cdp error: ' + JSON.stringify(msg.error)));
      if (msg.result?.exceptionDetails) return resolve({ __exception: msg.result.exceptionDetails.text || 'js exception' });
      resolve(msg.result?.result?.value);
    }
    ws.addEventListener('message', onMsg);
    send({ id, method: 'Runtime.evaluate', params: { expression, returnByValue: true, awaitPromise: true } });
  });
}

async function main() {
  const page = await getPage();
  ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

  if (action === 'dump') {
    const expr = `JSON.stringify({
      title: document.title,
      body: (document.body ? document.body.innerText.slice(0, 600) : 'NOBODY'),
      btns: [...document.querySelectorAll('button')].filter(b => b.offsetParent !== null).map(b => (b.id||'') + '|' + (b.className||'') + '|' + (b.innerText||'').replace(/\\s+/g,''))
    })`;
    const v = await evalJs(expr);
    console.log(v);
  } else if (action === 'click') {
    const kw = keyword;
    const e = `(function(){const kw=${JSON.stringify(kw)};
      const els=[...document.querySelectorAll('#choices .choice,.menuBtns .mbtn,.ovCard .mbtn,#cineSkip')].filter(b=>b.offsetParent!==null);
      const hit=els.find(b=>(b.innerText||'').replace(/\\s+/g,'').includes(kw));
      if(hit){const t=(hit.innerText||'').replace(/\\s+/g,'');hit.click();return t;}return '';})()`;
    const v = await evalJs(e);
    console.log(v ?? '');
  } else if (action === 'scene') {
    const fs = await import('node:fs');
    try {
      const raw = JSON.parse(fs.readFileSync(SAVE, 'utf8'));
      console.log(raw.scene_id);
    } catch { console.log('NO_SAVE'); }
  }
  ws.close();
}

main().then(() => process.exit(0)).catch(err => { console.error('ERR', err.message); process.exit(1); });
