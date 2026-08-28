// 图像识别辅助脚本：调用 tokenrhythm glm-5.3-flash 识别游戏截图（替代原 ox-alpha / qwen3.7-flash）
// 用法: node tr_vision.mjs <图片路径...> [--prompt "<提示语>"] [--max-tokens N]
//   例: node tr_vision.mjs shot.png
//       node tr_vision.mjs a.png b.png c.png --prompt "逐张检查 UI 完整性"
// 凭据: 从 ~/.dsh/.credentials.yaml 读取 TOKENRHYTHM_API_KEY
// 端点: https://tokenrhythm.studio/v1/chat/completions (OpenAI 兼容, model=glm-5.3-flash)
// 注意: 模型名写 glm-5.3-flash，不带 tokenrhythm/ 前缀（带前缀返回 MODEL_NOT_AVAILABLE）。
//       回复可能在 reasoning_content 字段，需兼容解析；429 退避 15s×5。
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const sleep = ms => new Promise(r => setTimeout(r, ms));
const argv = process.argv.slice(2);
const promptIdx = argv.indexOf('--prompt');
const prompt = promptIdx >= 0 ? argv[promptIdx + 1] : 'Describe what is shown in this game screenshot in Chinese. Include: 1) overall scene, 2) any visible UI elements (text/buttons/HUD), 3) art style and quality issues if any. Be concise.';
const maxTokensIdx = argv.indexOf('--max-tokens');
const maxTokens = maxTokensIdx >= 0 ? Number(argv[maxTokensIdx + 1]) : 4096;
const imgPaths = argv.filter((a, i) => !a.startsWith('--') && (promptIdx < 0 || (i !== promptIdx && i !== promptIdx + 1)) && (maxTokensIdx < 0 || (i !== maxTokensIdx && i !== maxTokensIdx + 1)));

function loadKey() {
  const p = path.join(os.homedir(), '.dsh', '.credentials.yaml');
  const raw = fs.readFileSync(p, 'utf8');
  const m = raw.match(/TOKENRHYTHM_API_KEY:\s*(\S+)/);
  if (!m) throw new Error('TOKENRHYTHM_API_KEY not found');
  return m[1];
}

function mimeOf(p) {
  const lower = p.toLowerCase();
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.bmp')) return 'image/bmp';
  return 'image/png';
}

async function callOnce(key, body) {
  const res = await fetch('https://tokenrhythm.studio/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (res.status === 429) return { retry: true, text: '' };
  const text = await res.text();
  if (!res.ok) return { retry: false, error: `API error ${res.status}: ${text.slice(0, 500)}` };
  let data; try { data = JSON.parse(text); } catch { return { retry: false, error: 'bad json: ' + text.slice(0, 300) }; }
  const msg = data.choices?.[0]?.message || {};
  const content = msg.content || msg.reasoning_content || '';
  return { retry: false, content };
}

async function main() {
  if (imgPaths.length === 0) { console.error('usage: node tr_vision.mjs <image...> [--prompt "..."] [--max-tokens N]'); process.exit(2); }
  for (const p of imgPaths) {
    if (!fs.existsSync(p)) { console.error(`file not found: ${p}`); process.exit(2); }
  }
  const key = loadKey();
  const content = [
    { type: 'text', text: prompt },
    ...imgPaths.map(p => ({ type: 'image_url', image_url: { url: `data:${mimeOf(p)};base64,${fs.readFileSync(p).toString('base64')}` } })),
  ];
  const body = {
    model: 'glm-5.3-flash',
    messages: [{ role: 'user', content }],
    max_tokens: maxTokens,
  };
  // 429 退避 15s×5
  let result = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    result = await callOnce(key, body);
    if (!result.retry) break;
    console.error(`[attempt ${attempt + 1}] HTTP 429, backing off 15s ...`);
    await sleep(15000);
  }
  if (result.retry) { console.error('FATAL: still rate-limited after 5 attempts'); process.exit(1); }
  if (result.error) { console.error('FATAL', result.error); process.exit(1); }
  const out = path.join(os.tmpdir(), 'tr_vision_out.txt');
  fs.writeFileSync(out, result.content, 'utf8');
  console.log(result.content);
  console.log('\n[written to ' + out + ']');
}

main().catch(e => { console.error('FATAL', e.message); process.exit(1); });