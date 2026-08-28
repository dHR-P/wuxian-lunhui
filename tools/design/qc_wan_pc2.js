// -*- coding: utf-8 -*-
const fs = require('fs');
const path = require('path');

const IMG_PATH = String.raw`C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1\tools\design\raw_enemy\pc_wan2.png`;
const OUT_PATH = String.raw`C:\Users\GWL\Desktop\itwillclaude\games\wuxian-horror-ch1\tools\design\qc_wan_pc2_result.json`;
const API_KEY = 'sk_tr_kHjpemePYfJLpsejXmebJsJH8kQHnz-vmXp5JoqG9AQ';
const URL = 'https://tokenrhythm.studio/v1/chat/completions';

const prompt = `你是一位资深游戏美术视觉质检员。请逐项核验下面这张角色立绘(怪物「挣扎者」设定:中国青年男性灾难幸存者变异体,破旧工装,四肢扭曲,丧尸化,纯黑背景,全身像,脚底贴画面底缘,768x1024,用于2D行走动画序列帧)：
1. 全身是否完整在画面内,无裁剪(尤其头顶与脚底)?
2. 脚部是否贴底缘(底部留白是否近乎为0)?双脚是否完整、轮廓清晰可辨?
3. 双手/手指是否清晰分开,无粘连模糊?
4. 躯干/四肢是否造型饱满(非细线/剪影),肢体是否有扭曲感符合丧尸变异设定?
5. 背景是否纯黑干净,无残留白框、光晕、噪点、文字?
6. 主体横向是否撑满全宽(0-767px):是肢体合理向两侧伸出(可接受)还是边缘有脏东西/杂光(需修)?
7. 整体光影是否自然(无过曝/全黑死区)?
请对每一项给出结论并说明理由,最后给出总体判定:「可发布」或「需重生成」,若需重生成请给出1-2句prompt修正要点。`;

function buildBody() {
  const b64 = fs.readFileSync(IMG_PATH).toString('base64');
  return JSON.stringify({
    model: 'qwen3.7-flash',
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: 'data:image/png;base64,' + b64 } },
      ],
    }],
    max_tokens: 4000,
  });
}

async function callOnce() {
  const res = await fetch(URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + API_KEY,
    },
    body: buildBody(),
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  let lastErr = 'no attempt';
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const { status, data } = await callOnce();
      console.log('ATTEMPT', attempt, 'STATUS', status);
      if (status === 200) {
        const msg = data.choices[0].message;
        const content = (msg.content || '').trim();
        const reasoning = (msg.reasoning_content || '').trim();
        const result = content || reasoning;
        fs.writeFileSync(OUT_PATH, JSON.stringify({
          api_ok: true, status,
          content,
          reasoning,
        }, null, 2), 'utf8');
        console.log('RESULT_START');
        console.log(result);
        console.log('RESULT_END');
        return;
      }
      lastErr = 'http ' + status + ': ' + (typeof data === 'string' ? data.slice(0, 500) : JSON.stringify(data).slice(0, 500));
      console.log('non200', lastErr);
      if (status === 429) { console.log('429 sleep 15s'); await sleep(15000); }
      else if (status === 504) { console.log('504 sleep 5s'); await sleep(5000); }
      else { await sleep(3000); }
    } catch (e) {
      lastErr = e.toString();
      console.log('EXC', lastErr);
      await sleep(3000);
    }
  }
  fs.writeFileSync(OUT_PATH, JSON.stringify({ api_ok: false, error: lastErr }, null, 2), 'utf8');
  console.log('FAILED', lastErr);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });