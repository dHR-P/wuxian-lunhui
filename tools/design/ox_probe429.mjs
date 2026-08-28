// 429 诊断：单次请求，若返回 429 则打印响应头与响应体（用于判断限流类型/窗口）
// 用法: node ox_probe429.mjs
import fs from 'node:fs';
import path from 'node:path';

const SHOTS_DIR = 'C:/Users/GWL/Desktop/itwillclaude/games/wuxian-horror-ch1/tools';
const yaml = fs.readFileSync('C:/Users/GWL/.dsh/.credentials.yaml', 'utf8');
const m = yaml.match(/OPENROUTER_FREE_API_KEY:\s*(\S+)/);
if (!m) { console.error('未找到 OPENROUTER_FREE_API_KEY'); process.exit(1); }
const API_KEY = m[1];

const base64 = fs.readFileSync(path.join(SHOTS_DIR, 'gate_vent_f1.png')).toString('base64');

const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'stealth/ox-alpha',
    messages: [{ role: 'user', content: [{ type: 'text', text: '一句话回答：这张图里有什么？' }, { type: 'image_url', image_url: { url: `data:image/png;base64,${base64}` } }] }],
    max_tokens: 300,
  }),
});

console.log('status:', res.status, res.statusText);
console.log('--- headers ---');
for (const [k, v] of res.headers.entries()) {
  if (/retry|rate|limit|x-|error/i.test(k)) console.log(`${k}: ${v}`);
}
console.log('--- body ---');
console.log((await res.text()).slice(0, 2000));
process.exit(0);