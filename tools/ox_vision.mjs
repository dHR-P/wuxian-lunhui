// 图像识别辅助脚本：调用 OpenRouter stealth/ox-alpha 识别游戏截图
// 用法: node ox_vision.mjs <图片路径> [提示语]
// 凭据: 从 ~/.dsh/.credentials.yaml 读取 OPENROUTER_FREE_API_KEY
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const imgPath = process.argv[2];
const prompt = process.argv[3] || 'Describe what is shown in this game screenshot in Chinese. Include: 1) overall scene, 2) any visible UI elements (text/buttons/HUD), 3) art style and quality issues if any. Be concise.';

function loadKey() {
  const p = path.join(os.homedir(), '.dsh', '.credentials.yaml');
  const raw = fs.readFileSync(p, 'utf8');
  const m = raw.match(/OPENROUTER_FREE_API_KEY:\s*(\S+)/);
  if (!m) throw new Error('OPENROUTER_FREE_API_KEY not found');
  return m[1];
}

async function main() {
  if (!imgPath || !fs.existsSync(imgPath)) { console.error('usage: node ox_vision.mjs <image> [prompt]'); process.exit(2); }
  const key = loadKey();
  const b64 = fs.readFileSync(imgPath).toString('base64');
  const mime = imgPath.toLowerCase().endsWith('.jpg') || imgPath.toLowerCase().endsWith('.jpeg') ? 'image/jpeg' : 'image/png';
  const body = {
    model: 'stealth/ox-alpha',
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: `data:${mime};base64,${b64}` } },
      ],
    }],
    max_tokens: 1024,
  };
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error('API error', res.status, err.slice(0, 500));
    process.exit(1);
  }
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || '';
  // 输出 UTF-8（文件方式避免控制台编码问题）
  const out = path.join(os.tmpdir(), 'ox_vision_out.txt');
  fs.writeFileSync(out, content, 'utf8');
  console.log(content);
  console.log('\n[written to ' + out + ']');
}

main().catch(e => { console.error('FATAL', e.message); process.exit(1); });
