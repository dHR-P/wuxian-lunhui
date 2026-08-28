import fs from 'node:fs';
import path from 'node:path';

// --- config ---
const credPath = 'C:/Users/GWL/.dsh/.credentials.yaml';
const keyMatch = fs.readFileSync(credPath, 'utf8').match(/OPENROUTER_FREE_API_KEY:\s*(\S+)/);
if (!keyMatch) {
  console.error('API key not found in credentials file');
  process.exit(1);
}
const API_KEY = keyMatch[1];

const baseDir = 'C:/Users/GWL/Desktop/itwillclaude/games/wuxian-horror-ch1';
const imgDir = path.join(baseDir, 'server-rs', 'ui', 'assets', 'img');
const outFile = path.join(baseDir, 'tools', 'design', 'ox_qc_results.txt');

const images = [
  { file: 'img_sterile_lab.png',  expected: '无菌实验室：冷白荧光灯、不锈钢解剖台、培养皿、绿色液体' },
  { file: 'img_virus_vault.png',  expected: '病毒样本库：绿色荧光冷藏柜、试管架、保险柜' },
  { file: 'img_isolation.png',    expected: '隔离观察室：玻璃舱内无皮生物、双气密门' },
  { file: 'img_b_kitchen.png',    expected: '废弃厨房：不锈钢台面、急救箱、冷藏库门' },
  { file: 'img_chef_zombie.png',  expected: '厨师丧尸：灰白皮肤、手持菜刀、血渍围裙' },
];

const endpoint = 'https://openrouter.ai/api/v1/chat/completions';

function promptText(expected) {
  return `请用中文描述这张图的画面内容、氛围、是否存在明显缺陷（畸变/文字水印/多余肢体/模糊）。
画面预期内容（用于核对，仅作参考，不必强求逐项齐全）：${expected}
请明确按以下三点回答：
① 画面内容是否符合预期；
② 有无明显缺陷（若有，逐条列出具体缺陷，例如畸变位置、文字水印内容、多余肢体、模糊程度）；
③ 给出评级：通过 / 需微调 / 需重生成。
这些是恐怖生存游戏的场景背景图，冷峻恐怖写实质感即可。`;
}

async function callVision(expected, b64) {
  const body = {
    model: 'stealth/ox-alpha',
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: promptText(expected) },
        { type: 'image_url', image_url: { url: `data:image/png;base64,${b64}` } },
      ],
    }],
  };
  for (let attempt = 1; attempt <= 4; attempt++) {
    let resp;
    try {
      resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch (e) {
      console.log(`  network error on attempt ${attempt}: ${e.message}`);
      await new Promise((r) => setTimeout(r, 5000 * attempt));
      continue;
    }
    if (resp.ok) {
      const data = await resp.json();
      const content = data?.choices?.[0]?.message?.content;
      if (typeof content === 'string' && content.trim()) return content.trim();
      return 'ERROR: unexpected response shape: ' + JSON.stringify(data).slice(0, 1000);
    }
    const errText = await resp.text();
    if (resp.status === 429 || resp.status >= 500) {
      const wait = 5000 * attempt;
      console.log(`  attempt ${attempt} failed (HTTP ${resp.status}), retry in ${wait / 1000}s`);
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }
    return `ERROR HTTP ${resp.status}: ${errText.slice(0, 1000)}`;
  }
  return 'ERROR: retries exhausted (429/5xx)';
}

// --- main ---
const lines = [];
lines.push('=== 图片质量校验结果（stealth/ox-alpha）===');
lines.push(`生成时间: ${new Date().toLocaleString('zh-CN')}`);
lines.push('');

for (const img of images) {
  const full = path.join(imgDir, img.file);
  console.log(`\n--- ${img.file} ---`);
  if (!fs.existsSync(full)) {
    lines.push(`【${img.file}】 文件不存在: ${full}`);
    continue;
  }
  const b64 = fs.readFileSync(full).toString('base64');
  const result = await callVision(img.expected, b64);
  lines.push(`【${img.file}】`);
  lines.push(`预期内容: ${img.expected}`);
  lines.push(result);
  lines.push('');
  console.log(`done (${(b64.length * 0.75 / 1024 / 1024).toFixed(2)} MB image)`);
}

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, lines.join('\n'), 'utf8');
console.log(`\nresults written to ${outFile}`);
