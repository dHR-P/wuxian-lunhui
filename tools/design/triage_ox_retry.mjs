// triage_ox_retry.mjs — 单独重试失败的 cut_enemy_hunter 调用（429 用尽后补充）
import fs from 'node:fs';
import path from 'node:path';

const credPath = 'C:/Users/GWL/.dsh/.credentials.yaml';
const keyMatch = fs.readFileSync(credPath, 'utf8').match(/OPENROUTER_FREE_API_KEY:\s*(\S+)/);
if (!keyMatch) { console.error('API key not found'); process.exit(1); }
const API_KEY = keyMatch[1];

const BASE = 'C:/Users/GWL/Desktop/itwillclaude/games/wuxian-horror-ch1';
const D = (...p) => path.join(BASE, ...p);
const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const OUT_TXT = D('tools/design/ox_material_triage_raw.txt');
const OUT_JSON = D('tools/design/ox_material_triage_raw.json');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const tag = 'cut_enemy_hunter';
const file = 'server-rs/ui/assets/img/enemy_hunter.png';
const prompt = `这是抠图成品【enemy_hunter.png】（带 alpha 透明通道；透明区域在你的画面里可能显示为黑色/白色或棋盘格，请以主体实体轮廓为准）。请逐条回答：
① 主体整体轮廓是否完整、可辨认？有没有「躯干中段大块缺失」（如果是纯透明，缺失处会显示为前述透明色）？
② 四肢（尤其是手臂、小腿）是否破碎、缺块、断成几截？
③ 透明区域是否侵入了主体内部（即内部镂空）？边缘是否有毛糙、灰蓝色溢边？
④ 大致位置：主体占据画面哪些百分比范围？`;

async function callVision() {
  const b64 = fs.readFileSync(D(file)).toString('base64');
  const body = {
    model: 'stealth/ox-alpha',
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: `data:image/png;base64,${b64}` } },
      ],
    }],
  };
  let lastErr = '';
  for (let attempt = 1; attempt <= 6; attempt++) {
    let resp;
    try {
      resp = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch (e) {
      lastErr = 'network: ' + e.message;
      console.log(`attempt ${attempt} network error: ${e.message}`);
      await sleep(8000 * attempt);
      continue;
    }
    if (resp.ok) {
      const data = await resp.json();
      const c = data?.choices?.[0]?.message?.content;
      if (typeof c === 'string' && c.trim()) return c.trim();
      if (data?.choices?.[0]?.message?.reasoning) return 'REASONING-ONLY: ' + data.choices[0].message.reasoning.slice(-1500);
      return 'ERROR shape: ' + JSON.stringify(data).slice(0, 800);
    }
    lastErr = 'HTTP ' + resp.status + ': ' + (await resp.text()).slice(0, 300);
    if (resp.status === 429 || resp.status >= 500) {
      const wait = 8000 * attempt + Math.floor(Math.random() * 5000);
      console.log(`attempt ${attempt} failed (${resp.status}), retry in ${(wait / 1000).toFixed(1)}s`);
      await sleep(wait);
      continue;
    }
    return lastErr;
  }
  return 'ERROR: retries exhausted (429/5xx). last: ' + lastErr;
}

const ans = await callVision();
// 更新 JSON 中对应条目
const arr = JSON.parse(fs.readFileSync(OUT_JSON, 'utf8'));
const e = arr.find((x) => x.tag === tag);
if (!e) { console.error('entry not found in json'); process.exit(1); }
e.answer = ans + '\n\n[注: 首次调用 429 耗尽, 此条为重试成功后的回答]';
e.retried = true;
fs.writeFileSync(OUT_JSON, JSON.stringify(arr, null, 2), 'utf8');
// txt 追加重试节
fs.appendFileSync(OUT_TXT, `\n【${tag}】(重试补录)\n问: ${prompt.replace(/\n/g, ' ')}\n答: ${ans}\n`, 'utf8');
console.log(`RETRY DONE, ${ans.length} chars`);