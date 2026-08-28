// 原始立绘构图/背景分析（stealth/ox-alpha）
// 目标：在决定抠图/重生成策略前，客观了解 raw 立绘的构图事实。
// 用法: node ox_raw_analyze.mjs hunter guard licker horde
import fs from 'node:fs';
import path from 'node:path';

const credPath = 'C:/Users/GWL/.dsh/.credentials.yaml';
const keyMatch = fs.readFileSync(credPath, 'utf8').match(/OPENROUTER_FREE_API_KEY:\s*(\S+)/);
if (!keyMatch) {
  console.error('API key not found in credentials file');
  process.exit(1);
}
const API_KEY = keyMatch[1];

const baseDir = 'C:/Users/GWL/Desktop/itwillclaude/games/wuxian-horror-ch1';
const imgDir = path.join(baseDir, 'tools', 'design', 'raw_enemy');
const outFile = path.join(baseDir, 'tools', 'design', 'ox_raw_analyze_results.txt');

const EXPECT = {
  hunter: '猎杀者·实验体（高大强壮人形变异体，左巨爪右利刃，灰褐皮肤）',
  guard: '保安丧尸（深蓝制服、手持警棍、青灰皮肤）',
  licker: '舔食者（无皮深红肌肉、四肢着地、长爪长舌）',
  horde: '丧尸群（3-5 只职业丧尸群像）',
  zombie: '站台丧尸（苍白灰绿皮肤、破制服、双手前伸）',
};

const endpoint = 'https://openrouter.ai/api/v1/chat/completions';

function promptText(expect) {
  return `这张图是本地 AI 生成的一幅怪物"全身立绘"（预期内容：${expect}），背景应为纯色以便抠图。
但 AI 常会画出场景/纹理背景。请客观描述画面事实，严格只回答以下问题，逐条简答，不要评价画质：
① 主体（怪物/人物）在画面中的位置（上/中/下/左/右）和大致占比（约占画面高度/宽度的百分比），是否完整入镜（头脚都在画面内）；
② 背景构成：是纯色？渐变？有明显噪点纹理？还是包含场景元素（地面、墙壁、灯光、杂物等）？背景主色调大致是什么颜色；
③ 主体与背景的边界：清晰锐利 / 有柔和光晕 / 有阴影与背景融合 / 边界难以分辨（请选最接近的并简述）；
④ 主体亮度与对比度：主体是否明亮、与背景色差明显，还是偏暗接近背景色；
⑤ 凭主体轮廓，能否清楚辨认出它就是：${expect}？`;
}

async function callVision(expect, b64) {
  const body = {
    model: 'stealth/ox-alpha',
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: promptText(expect) },
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
      await new Promise((r) => setTimeout(r, 6000 * attempt));
      continue;
    }
    if (resp.ok) {
      const data = await resp.json();
      const content = data?.choices?.[0]?.message?.content;
      if (typeof content === 'string' && content.trim()) return content.trim();
      if (data?.choices?.[0]?.message?.reasoning) return 'REASONING-ONLY: ' + data.choices[0].message.reasoning.slice(-1500);
      return 'ERROR: unexpected response shape: ' + JSON.stringify(data).slice(0, 1000);
    }
    const errText = await resp.text();
    if (resp.status === 429 || resp.status >= 500) {
      const wait = 6000 * attempt + Math.floor(Math.random() * 5000);
      console.log(`  attempt ${attempt} failed (HTTP ${resp.status}), retry in ${(wait / 1000).toFixed(1)}s`);
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }
    return `ERROR HTTP ${resp.status}: ${errText.slice(0, 1000)}`;
  }
  return 'ERROR: retries exhausted (429/5xx)';
}

const wanted = process.argv.slice(2);
const ids = wanted.length ? wanted : Object.keys(EXPECT);
const lines = [];
lines.push('=== RAW 立绘构图/背景分析（stealth/ox-alpha）===');
lines.push(`生成时间: ${new Date().toLocaleString('zh-CN')}`);
lines.push('');

for (const id of ids) {
  const full = path.join(imgDir, `${id}.png`);
  console.log(`\n--- ${id} ---`);
  if (!fs.existsSync(full)) {
    lines.push(`【${id}】 文件不存在: ${full}`);
    continue;
  }
  const b64 = fs.readFileSync(full).toString('base64');
  const result = await callVision(EXPECT[id] || '', b64);
  lines.push(`【${id}】`);
  lines.push(result);
  lines.push('');
  console.log(`done (${(b64.length * 0.75 / 1024 / 1024).toFixed(2)} MB image)`);
  await new Promise((r) => setTimeout(r, 8000));
}

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, lines.join('\n'), 'utf8');
console.log(`\nresults written to ${outFile}`);