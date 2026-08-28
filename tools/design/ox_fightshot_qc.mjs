// 战斗场景截图质检（stealth/ox-alpha）
// 校验：3D 场景内敌人精灵渲染效果——主体完整可辨/透明抠图融合是否干净
// （有无黑框、黑块、毛边、半透明鬼影）/尺寸比例是否合理/图面是否异常
// 用法: node ox_fightshot_qc.mjs [kind...]   (默认全部 5 张)
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
const imgDir = path.join(baseDir, 'tools', 'design', 'fightshots');
const outFile = path.join(baseDir, 'tools', 'design', 'ox_fightshot_qc_results.txt');

const SHOTS = [
  { file: 'fightshot_zombie.png', expect: '站台丧尸：苍白灰绿腐烂皮肤、破站台制服、双手前伸蹒跚姿态，垂直站立的人形怪物' },
  { file: 'fightshot_horde.png', expect: '丧尸群：3-5 只职业丧尸拥挤成群' },
  { file: 'fightshot_licker.png', expect: '舔食者：无皮深红肌肉、四肢着地爬行姿态、长爪' },
  { file: 'fightshot_guard.png', expect: '保安丧尸：深蓝制服、手持警棍、青灰肤色' },
  { file: 'fightshot_hunter.png', expect: '猎杀者实验体：高大强壮变异体、左巨爪右利刃、灰褐皮肤' },
];

const endpoint = 'https://openrouter.ai/api/v1/chat/completions';

function promptText(expect) {
  return `这是第一人称恐怖游戏《生化蜂巢》的战斗场景截图（3D 场景，敌人为可旋转的立牌式立绘精灵，脚下是地图地面，屏幕下方有攻击/逃跑等操作按钮）。
请核对画面并回答：
① 敌人立绘精灵是否清晰可见且完整（全身、姿态可辨），是否符合预期：${expect}；
② 精灵抠图边缘是否干净：有无黑框/黑块/半透明鬼影/毛糙锯齿/残留背景色块围绕主体；（这是重点，请仔细看主体轮廓周围）
③ 精灵在场景中比例/高度是否合理（与场景地面、镜头距离匹配，没有悬空或钻地）；
④ 画面有无明显渲染异常：精灵整个消失/纯色方块/贴图撕裂/严重色偏（若有请说明）；
⑤ 给出评级：通过 / 需微调 / 需重生成。
请用中文，逐条回答，简洁明确。`;
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

// --- main ---
const wanted = process.argv.slice(2);
const list = wanted.length ? SHOTS.filter((s) => wanted.includes(s.file.replace('fightshot_', '').replace('.png', ''))) : SHOTS;
const lines = [];
lines.push('=== 战斗场景截图质检结果（stealth/ox-alpha）===');
lines.push(`生成时间: ${new Date().toLocaleString('zh-CN')}`);
lines.push('');

for (const img of list) {
  const full = path.join(imgDir, img.file);
  console.log(`\n--- ${img.file} ---`);
  if (!fs.existsSync(full)) {
    lines.push(`【${img.file}】 文件不存在: ${full}`);
    continue;
  }
  const b64 = fs.readFileSync(full).toString('base64');
  const result = await callVision(img.expect, b64);
  lines.push(`【${img.file}】`);
  lines.push(`预期内容: ${img.expect}`);
  lines.push(result);
  lines.push('');
  console.log(`done (${(b64.length * 0.75 / 1024 / 1024).toFixed(2)} MB image)`);
  await new Promise((r) => setTimeout(r, 8000));
}

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, lines.join('\n'), 'utf8');
console.log(`\nresults written to ${outFile}`);