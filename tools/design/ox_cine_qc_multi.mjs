import fs from 'node:fs';

const DESIGN = 'C:/Users/GWL/Desktop/itwillclaude/games/wuxian-horror-ch1/tools/design';
const CRED = 'C:/Users/GWL/.dsh/.credentials.yaml';
const KEY = fs.readFileSync(CRED, 'utf8').match(/OPENROUTER_FREE_API_KEY:\s*(\S+)/)?.[1];
if (!KEY) { console.error('API key not found'); process.exit(1); }

const jobs = [
  {
    name: 'vid_elevator.mp4',
    stem: 'elevator',
    times: [0.5, 1.5, 2.5, 3.5, 4.5],
    expected: '圆形工业齿轮电梯下降、消毒喷雾、冷白灯光、黑暗管道层',
  },
  {
    name: 'vid_redqueen_off.mp4',
    stem: 'redqueen',
    times: [0.5, 1.5, 2.5, 3.5, 4.5],
    expected: '球形机房蓝色全息小女孩投影碎裂成数据雪花、灯光变暗红、熄灭',
  },
];

async function callOx(job) {
  const content = [
    { type: 'text', text: `这是一段 5 秒游戏过场动画按时间顺序抽取的 5 帧（依次为 0.5s、1.5s、2.5s、3.5s、4.5s）。剧本预期画面是：「${job.expected}」。请用中文回答：1) 各时间点帧分别出现了什么画面（按时间顺序简述）；2) 整体是否覆盖了预期元素，哪些元素出现/缺失；3) 画面质量缺陷（畸变/文字水印/模糊/多余物体/闪烁等）。` },
  ];
  for (const t of job.times) {
    const f = `${DESIGN}/frame_${job.stem}_${t}.png`;
    const b64 = fs.readFileSync(f).toString('base64');
    content.push({ type: 'text', text: `【时间点 ${t}s】` });
    content.push({ type: 'image_url', image_url: { url: `data:image/png;base64,${b64}` } });
  }

  const url = 'https://openrouter.ai/api/v1/chat/completions';
  const body = { model: 'stealth/ox-alpha', messages: [{ role: 'user', content }] };
  let lastErr = null;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(300000),
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
  console.error(`[${job.name}] sending 5 frames, calling stealth/ox-alpha ...`);
  const r = await callOx(job);
  results.push(r);
  console.log(`\n===== ${job.name} =====`);
  console.log(r.text);
  console.log('==================================================\n');
}

fs.writeFileSync(`${DESIGN}/ox_raw_responses_multi.json`, JSON.stringify(results, null, 2), 'utf8');
console.error('saved ox_raw_responses_multi.json');
