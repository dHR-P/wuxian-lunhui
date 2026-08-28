import fs from 'node:fs';

const DESIGN = 'C:/Users/GWL/Desktop/itwillclaude/games/wuxian-horror-ch1/tools/design';
const CRED = 'C:/Users/GWL/.dsh/.credentials.yaml';
const KEY = fs.readFileSync(CRED, 'utf8').match(/OPENROUTER_FREE_API_KEY:\s*(\S+)/)?.[1];
if (!KEY) { console.error('API key not found'); process.exit(1); }

const jobs = [
  { name: 'vid_elevator.mp4', file: `${DESIGN}/frame_elevator.png`, expected: '圆形工业齿轮电梯下降、消毒喷雾、冷白灯光、黑暗管道层' },
  { name: 'vid_redqueen_off.mp4', file: `${DESIGN}/frame_redqueen.png`, expected: '球形机房蓝色全息小女孩投影碎裂成数据雪花、灯光变暗红、熄灭' },
];

async function callOx(job, b64) {
  const url = 'https://openrouter.ai/api/v1/chat/completions';
  const body = {
    model: 'stealth/ox-alpha',
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: '这是游戏过场动画的一帧。请用中文描述画面内容、氛围、以及是否有明显缺陷（畸变/文字水印/模糊/多余物体）。' },
        { type: 'image_url', image_url: { url: `data:image/png;base64,${b64}` } },
      ],
    }],
  };
  let lastErr = null;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(240000),
      });
      if (resp.status === 429) {
        const sleepMs = 10000 + Math.floor(Math.random() * 11000);
        console.error(`[${job.name}] 429 on attempt ${attempt}, sleeping ${Math.round(sleepMs / 1000)}s`);
        await new Promise(r => setTimeout(r, sleepMs));
        continue;
      }
      const data = await resp.json();
      if (!resp.ok) {
        lastErr = `HTTP ${resp.status}: ${JSON.stringify(data).slice(0, 500)}`;
        if (resp.status >= 500) { await new Promise(r => setTimeout(r, 10000)); continue; }
        return { name: job.name, ok: false, text: lastErr };
      }
      const text = data.choices?.[0]?.message?.content ?? JSON.stringify(data);
      return { name: job.name, ok: true, text };
    } catch (e) {
      lastErr = String((e && e.message) || e);
      if (attempt < 4) await new Promise(r => setTimeout(r, 10000));
    }
  }
  return { name: job.name, ok: false, text: `FAILED after 4 attempts: ${lastErr}` };
}

const results = [];
for (const job of jobs) {
  const b64 = fs.readFileSync(job.file).toString('base64');
  console.error(`[${job.name}] base64 len=${b64.length}, calling stealth/ox-alpha ...`);
  const r = await callOx(job, b64);
  results.push(r);
  console.log(`\n===== ${job.name} (expected: ${job.expected}) =====`);
  console.log(r.text);
  console.log('==================================================\n');
}

fs.writeFileSync(`${DESIGN}/ox_raw_responses.json`, JSON.stringify(results, null, 2), 'utf8');
console.error('raw responses saved to ox_raw_responses.json');
