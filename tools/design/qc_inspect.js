// Visual QC inspection subagent script
// Reads API key from credentials yaml, converts 2 images to base64, calls qwen3.7-flash vision API.
const fs = require('fs');

// ---- args: [label, image1(raw), image2(cutout), subjectPrompt] ----
const [, , label, imgRaw, imgCut, subjectPrompt] = process.argv;

const creds = fs.readFileSync('C:\\Users\\GWL\\.dsh\\.credentials.yaml', 'utf8');
const m = creds.match(/TOKENRHYTHM_API_KEY:\s*(\S+)/);
const apiKey = m[1];

function toDataUrl(p) {
  const buf = fs.readFileSync(p);
  return 'data:image/png;base64,' + buf.toString('base64');
}

const userContent = `${subjectPrompt}

以下是同一立绘的两张图。第一张是【RAW 原始生成图】(可能有纯黑背景),第二张是【CUTOUT 抠图产物】(主体已被抠出、背景应为透明)。严格按判据逐条判定,并给出每条的 ✅/⚠️/❌。

请按以下 8 条逐条判定(每条给状态与中文依据):
1. RAW: 全身完整无裁剪(头顶不被切,脚掌完整或仅被底缘轻微切)。
2. RAW: 背景是否绝对纯黑无反光/无投影/无渐变色晕(重点:底部有无地面反光/投影;背景是否绝对平面均匀)。
3. RAW: 脚掌是否贴底缘(允许轻微裁切,不应悬空留白过大)。
4. RAW: 白色描边是否残留(身体轮廓是否烤出纯白描边/纯白边缘)。
5. RAW: (怪兽)手/爪/刀是否清晰分离、轮廓不糊不融合。
6. RAW: 下半身是否明亮(怪兽:肚腹/腿/脚有无黑剪影融进背景;人物:裤腿双脚是否清晰不融黑)。
7. CUTOUT: 背景是否全透明、主体完整无镂空孔洞、有无白边/黑边残留、有无纯黑残留杂质、轮廓是否干净。
8. 综合结论: 若任一 RAW 判据明确失败→需重生成;否则若 raw 与 cutout 均通过→可发布。

最后一行给出【最终判定:可发布 或 需重生成】,以及若需重生成的针对本对象的修正建议。请用中文。`;

const payload = {
  model: 'qwen3.7-flash',
  max_tokens: 4000,
  messages: [
    {
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: toDataUrl(imgRaw) } },
        { type: 'image_url', image_url: { url: toDataUrl(imgCut) } },
        { type: 'text', text: userContent }
      ]
    }
  ]
};

async function call(labels) {
  const res = await fetch('https://tokenrhythm.studio/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(120000)
  });
  const status = res.status;
  let text;
  if (status === 200) {
    const j = await res.json();
    text = (j.choices && j.choices[0] && ((j.choices[0].message.reasoning_content) || '')) + '\n=====|BODY|=====\n' + ((j.choices && j.choices[0] && j.choices[0].message.content) || '');
  } else {
    text = await res.text();
  }
  return { status, text };
}

(async () => {
  // retry logic: first 504 -> retry once; 429 -> backoff 15s x5
  let result = null;
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      result = await call();
      if (result.status === 200) break;
      if (result.status === 429) {
        console.log(`[429 backoff] attempt ${attempt}, sleeping 15s`);
        await new Promise(r => setTimeout(r, 15000));
        continue;
      }
      if (result.status === 504 && attempt === 1) {
        console.log(`[504] first attempt, retrying once`);
        continue;
      }
      break;
    } catch (e) {
      console.log('[error] ' + e.message + ' attempt ' + attempt);
      if (attempt < 5) await new Promise(r => setTimeout(r, 8000));
    }
  }
  console.log('### LABEL: ' + label);
  console.log('### HTTP STATUS: ' + (result ? result.status : 'none'));
  console.log('### OUTPUT:');
  console.log(result ? result.text : 'NO RESULT');
})();