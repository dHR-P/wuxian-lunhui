// triage_ox_confirm.mjs — 追加 2 张黑底原图的专项目视确认 (ox-alpha, round 3)
// 1) raw hunter: 中央近黑区 (x222-545 / y228-880) = 主体缺失(假设A) 还是 实体但极暗(假设B)?
// 2) raw zhengzha: 黑T恤/深裤 vs 黑底亮度边界 + 底部光晕范围 + 靴底距底边像素
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

async function callVision(prompt, imgPath, tag) {
  const b64 = fs.readFileSync(imgPath).toString('base64');
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
      console.log(`  [${tag}] attempt ${attempt} network error: ${e.message}`);
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
      console.log(`  [${tag}] attempt ${attempt} failed (${resp.status}), retry in ${(wait / 1000).toFixed(1)}s`);
      await sleep(wait);
      continue;
    }
    return lastErr;
  }
  return 'ERROR: retries exhausted (429/5xx). last: ' + lastErr;
}

const R3 = [
  {
    tag: 'f3_raw_hunter_blackregion',
    file: 'tools/design/raw_enemy/hunter.png',
    prompt: `这是「猎杀者」的【黑底原图】（未抠图，背景纯黑），图像尺寸 768×1024。请集中看画面中央躯干区域：横 x 约 222–545 px（画面宽 29%–71%）、纵 y 约 228–880 px（画面高 22%–86%）。像素统计显示该区域 90% 以上接近纯黑。现在请专门裁决以下两个假设：
假设A（主体缺失/断裂）：生成时主体躯干本身就是断开的黑块，上下半身之间背景直接可见，中央是真正的空腔；
假设B（主体存在但极暗）：主体躯干是一整块连续的实体，只是颜色极深接近纯黑，与黑底之间没有亮度边界。
请逐条回答：
① 在该区域内分段找内容：y 22%–40%（胸口）、y 40%–58%（腹腰核心）、y 58%–86%（大腿）三段，各能看到什么？有没有任何可辨认的肌肉/皮肤轮廓——胸肌纹理、锁骨、肋弓、腹直肌、腰线、边缘光（rim light）？请逐段说明；
② 有没有发现「主体在某处硬性终止、背景直接透出」式的锐利断口/直线分界？还是整体柔和渐隐？
③ 你认为中央腹腰像素与背景黑是严格同色（0,0,0），还是存在 1–8/255 的极低灰阶差异？依据是什么（能否看出极微弱的明暗起伏或噪点纹理）？
④ 最终裁决：假设A 还是假设B？据此判断——仅靠这张原图，能否用纯代码重抠（如从边缘 flood-fill 判定背景→取反→形态学填洞）得到「实心连续躯干」的轮廓？还是这张图不重新生成就无法获得完整躯干？请给出明确结论。`,
  },
  {
    tag: 'f3_raw_zhengzha_clothes_glow',
    file: 'tools/design/raw_enemy/pc_zhengzha.png',
    prompt: `这是主角「郑吒」的【黑底原图】（未抠图，背景纯黑），图像尺寸 768×1024。请专门确认四件事，全部给出数值：
① 黑色紧身T恤 / 深色裤子与黑底之间有没有明显亮度边界？衣服实际是「深灰蓝色、被光照亮、轮廓清晰可辨」，还是「与背景同为纯黑、肉眼难分」？请分上半身（T恤，重点躯干中央最暗处）与下半身（裤/靴）两种情况回答；
② 底部蓝白光晕/放射光的确切范围：向上蔓延到画面多高（y 约 ?%？按 1024px 高换算约 ?px 起）？左右多宽（x ?% 到 ?%）？最亮的核心区在什么位置（x%/y%）？
③ 人物脚底/靴底距画面底边还剩多少：约 y?%（按 1024px 高换算约 ?px）？
④ 光晕与人物双腿的关系：双腿是清晰的深色剪影浮在光晕前、轮廓可辨，还是被光晕吞没难以分辨？`,
  },
];

const all = JSON.parse(fs.readFileSync(OUT_JSON, 'utf8'));
const logLine = (s) => fs.appendFileSync(OUT_TXT, s + '\n', 'utf8');

for (let i = 0; i < R3.length; i++) {
  const it = R3[i];
  console.log(`--- [${it.tag}] ${it.file}`);
  logLine(`\n【${it.tag}】(第三轮专项确认, 同图)`);
  logLine('问: ' + it.prompt.replace(/\n/g, ' '));
  const ans = await callVision(it.prompt, D(it.file), it.tag);
  logLine('答: ' + ans);
  all.push({ round: 3, tag: it.tag, file: it.file, prompt: it.prompt, answer: ans });
  fs.writeFileSync(OUT_JSON, JSON.stringify(all, null, 2), 'utf8');
  console.log(`  done, ${ans.length} chars`);
  if (i < R3.length - 1) await sleep(14000 + Math.floor(Math.random() * 4000));
}
console.log('ALL DONE -> ' + OUT_TXT);