// 敌人立绘精灵质检（stealth/ox-alpha）
// 校验：全身完整入镜 / 居中 / 无文字水印 / 无畸形肢体 / 主体轮廓清晰可辨
// 用法: node ox_enemy_qc.mjs [id...]   (默认全部 5 张)
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
// 质检对象为棋盘格合成预览（透明区域=棋盘格可见），透明/边缘判定真实可靠
const imgDir = path.join(baseDir, 'tools', 'design', 'preview_enemy');
const outFile = path.join(baseDir, 'tools', 'design', 'ox_enemy_qc_results.txt');

const SPRITES = [
  { file: 'preview_enemy_zombie.png', expected: '站台丧尸：直立蹒跚姿态，苍白灰绿腐烂皮肤，破裂站台制服，血污伤口，空洞双眼，双手前伸' },
  { file: 'preview_enemy_licker.png', expected: '舔食者：无皮深红肌肉躯体，外露大脑骨骼，无眼，长爪，四肢着地爬行姿态，长舌微吐' },
  { file: 'preview_enemy_hunter.png', expected: '猎杀者实验体：高大强壮人形变异体，膨胀肌肉骨刺，灰褐皮肤，左巨爪右利刃，凶悍站姿' },
  { file: 'preview_enemy_guard.png',  expected: '保安丧尸：深蓝制服防暴背心，青灰腐烂皮肤，手持警棍，歪斜蹒跚站姿' },
  { file: 'preview_enemy_horde.png',  expected: '丧尸群群像：3-5 只不同职业丧尸（乘客/列车员/医生）拥挤蹒跚走来，张牙舞爪' },
  { file: 'preview_enemy_pc_zhengzha.png', expected: '主角郑吒全身立绘：年轻中国男青年，黑色短发，黑色紧身T恤与深色战术长裤，腰系战术腰带，双臂自然下垂握拳，笔直站立' },
];

const endpoint = 'https://openrouter.ai/api/v1/chat/completions';

function promptText(expected) {
  return `这是恐怖生存游戏《生化蜂巢》的怪物全身立绘，已抠除背景，透明区域显示为灰白棋盘格。
请核对画面并回答：
① 是否完整全身入镜（头顶到脚底都可见，没有被裁切）且主体居中；
② 主体是否符合预期描述（仅作参考，不必逐项齐全）：${expected}；
③ 有无明显缺陷：文字/水印/多余肢体/畸形/重叠糊成一团/主体过暗难以辨认（若有请逐条说明）；
④ 透明背景是否干净：棋盘格是否清晰可见（证明透明）、主体边缘是否毛糙/染灰/残留大块背景色斑块或倒影；
⑤ 给出评级：通过 / 需微调 / 需重生成。
请用中文，逐条回答，简洁明确。`;
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
const list = wanted.length ? SPRITES.filter((s) => wanted.includes(s.file.replace('preview_enemy_', '').replace('.png', ''))) : SPRITES;
const lines = [];
lines.push('=== 敌人立绘质检结果（stealth/ox-alpha）===');
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
  const result = await callVision(img.expected, b64);
  lines.push(`【${img.file}】`);
  lines.push(`预期内容: ${img.expected}`);
  lines.push(result);
  lines.push('');
  console.log(`done (${(b64.length * 0.75 / 1024 / 1024).toFixed(2)} MB image)`);
  // 图间冷却，降低 429 概率
  await new Promise((r) => setTimeout(r, 8000));
}

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, lines.join('\n'), 'utf8');
console.log(`\nresults written to ${outFile}`);