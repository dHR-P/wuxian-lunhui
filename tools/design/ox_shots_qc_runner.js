// 游戏截图质量校验：调用 OpenRouter stealth/ox-alpha 多模态模型逐张审查截图
// 用法: node ox_shots_qc_runner.js
const fs = require('fs');
const path = require('path');

const DESIGN_DIR = 'C:/Users/GWL/Desktop/itwillclaude/games/wuxian-horror-ch1/tools/design';
const SHOTS_DIR = 'C:/Users/GWL/Desktop/itwillclaude/games/wuxian-horror-ch1/tools/artifacts/screenshots';
const OUT_FILE = path.join(DESIGN_DIR, 'ox_shots_qc.txt');

// 读取密钥（正则匹配 OPENROUTER_FREE_API_KEY: <token>）
const yaml = fs.readFileSync('C:/Users/GWL/.dsh/.credentials.yaml', 'utf8');
const m = yaml.match(/OPENROUTER_FREE_API_KEY:\s*(\S+)/);
if (!m) { console.error('未找到 OPENROUTER_FREE_API_KEY'); process.exit(1); }
const API_KEY = m[1];

const PROMPT_TEXT =
  '用中文描述这张游戏截图的内容：界面元素、画面内容、有无明显缺陷（黑屏/空白/错乱/文字乱码）。' +
  '请分点说明：1) 整体画面是什么场景/界面；2) 具体可见的元素（地图/角色/文字/UI 等）；3) 是否有渲染缺陷。';

const SHOTS = [
  {
    file: path.join(SHOTS_DIR, 'world_map.png'),
    expect: '2D俯视蜂巢地图，深色背景，墙/地板tile网格，玩家是绿点，敌人是红圈，调查点是金色?号，NPC是蓝圈',
  },
  // world_map2.png 从未生成（2026-08 整理时确认不存在），已从清单移除
  {
    file: path.join(SHOTS_DIR, 'scene_sterile_lab.png'),
    expect: '无菌实验室场景，冷白灯，解剖台，AI生成的写实背景图',
  },
  {
    file: path.join(SHOTS_DIR, 'scene_redqueen_pipe.png'),
    expect: '红后谜题界面，红后说话，蓝色机房背景',
  },
];

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

// 将 content 字段规整为字符串（模型可能返回数组）
function normalizeContent(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((p) => (typeof p === 'string' ? p : p && p.text ? p.text : JSON.stringify(p)))
      .join('\n');
  }
  return JSON.stringify(content, null, 2);
}

async function callOnce(file, base64) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'stealth/ox-alpha',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: PROMPT_TEXT },
            { type: 'image_url', image_url: { url: `data:image/png;base64,${base64}` } },
          ],
        },
      ],
    }),
  });
  return res;
}

async function callWithRetry(file) {
  const base64 = fs.readFileSync(file).toString('base64');
  let lastErr = null;
  for (let attempt = 0; attempt <= 4; attempt++) {
    try {
      const res = await callOnce(file, base64);
      if (res.status === 429) {
        lastErr = `HTTP 429 限流 (第 ${attempt} 次重试前)`;
        const delay = 10000 + Math.floor(Math.random() * 10000); // 10-20 秒
        console.log(`  [429] ${path.basename(file)} 限流，等待 ${(delay / 1000).toFixed(1)}s 后重试 (${attempt + 1}/4)`);
        await sleep(delay);
        continue;
      }
      if (!res.ok) {
        const body = await res.text();
        lastErr = `HTTP ${res.status}: ${body.slice(0, 400)}`;
        // 5xx 也做有限重试
        if (res.status >= 500 && attempt < 4) {
          console.log(`  [${res.status}] ${path.basename(file)} 服务端错误，5s 后重试 (${attempt + 1}/4)`);
          await sleep(5000);
          continue;
        }
        throw new Error(lastErr);
      }
      const data = await res.json();
      const content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
      if (content === undefined || content === null) {
        throw new Error('响应中没有 choices[0].message.content: ' + JSON.stringify(data).slice(0, 400));
      }
      return normalizeContent(content);
    } catch (e) {
      if (lastErr && lastErr.startsWith('HTTP 429')) {
        if (attempt >= 4) throw new Error(lastErr);
        continue; // 已在上面 sleep 过
      }
      throw e;
    }
  }
  throw new Error(lastErr || '重试次数耗尽');
}

(async () => {
  const lines = [];
  const header = [
    '游戏截图质量校验报告（stealth/ox-alpha）',
    '生成时间: ' + new Date().toISOString(),
    '模型: stealth/ox-alpha',
    '',
  ];
  lines.push(...header);
  console.log(header.join('\n'));

  for (const shot of SHOTS) {
    console.log(`开始校验: ${path.basename(shot.file)}`);
    lines.push('='.repeat(60));
    lines.push(`图片: ${path.basename(shot.file)}`);
    lines.push(`文件: ${shot.file}`);
    lines.push(`预期内容: ${shot.expect}`);
    lines.push('');
    try {
      const content = await callWithRetry(shot.file);
      lines.push(`模型描述:`);
      lines.push(content);
      console.log(`  OK: ${path.basename(shot.file)}`);
    } catch (e) {
      lines.push(`调用失败: ${e.message}`);
      console.error(`  FAIL: ${path.basename(shot.file)} -> ${e.message}`);
    }
    lines.push('');
    lines.push('');
  }

  fs.mkdirSync(DESIGN_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, lines.join('\n'), 'utf8');
  console.log('结果已写入: ' + OUT_FILE);
})().catch((e) => {
  console.error('脚本异常退出:', e);
  process.exit(1);
});
