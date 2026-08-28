// 门禁渲染视觉质检：调用 OpenRouter stealth/ox-alpha 多模态模型逐张审查门禁截图
// 用法: node ox_gate_qc.mjs
// 输出: ox_gate_qc_report.md（4 张图的模型反馈原文）
import fs from 'node:fs';
import path from 'node:path';

const DESIGN_DIR = 'C:/Users/GWL/Desktop/itwillclaude/games/wuxian-horror-ch1/tools/design';
const SHOTS_DIR = 'C:/Users/GWL/Desktop/itwillclaude/games/wuxian-horror-ch1/tools/artifacts/screenshots';
const OUT_FILE = path.join(DESIGN_DIR, 'ox_gate_qc_report.md');

// 读取密钥（正则匹配 OPENROUTER_FREE_API_KEY: <token>）
const yaml = fs.readFileSync('C:/Users/GWL/.dsh/.credentials.yaml', 'utf8');
const m = yaml.match(/OPENROUTER_FREE_API_KEY:\s*(\S+)/);
if (!m) { console.error('未找到 OPENROUTER_FREE_API_KEY'); process.exit(1); }
const API_KEY = m[1];

const QC_TEXT =
  '你是一名游戏视觉质检员。这是一张 Tauri 2D 俯视箱庭地图游戏截图（WebView2 canvas 绘制，' +
  '整层地图约 1120x728，tile 28px，深色蜂巢实验室/生化设施风格）。画面元素约定：' +
  '玩家为绿色圆点（带朝向短线）；门禁画为脉冲描边弧线/门框区域，锁定态带 🔒 锁 emoji，' +
  '解锁态锁图标消失或颜色变化；物品调查点为金色 ?号；敌人为彩色圆圈。\n' +
  '重要：本作有「轮回记忆 · 迷雾」机制——玩家周围约 4-5 格内亮、远处未探索区域覆盖深色半透明迷雾' +
  '（接近黑色的暗色格）。迷雾是预期设计，不是渲染缺陷；请区分「迷雾区域」与「花屏/黑屏/错位」。\n' +
  '请逐项检查并回答（中英文皆可，用 "【检查项a】/【检查项b】/..." 分点）：\n' +
  'a. 门禁渲染：是否能看到门禁区域？脉冲描边弧线/门框是否清晰可辨？🔒 锁 emoji 是否可见（注意是否为豆腐块/乱码方块）？\n' +
  'b. 迷雾机制：玩家附近是否亮、远处是否被迷雾覆盖？迷雾是否均匀半透明（能看到底下 tile 的暗影）而非纯黑糊死？\n' +
  'c. 地图清晰度：玩家附近地面 tile、墙壁、通道是否正常渲染，有无花屏、错位、异常色块？\n' +
  'd. 玩家标记：绿色圆点 + 朝向短线是否可见？\n' +
  'e. 其它：有无文字/emoji 渲染成豆腐块（□□□）、重影等渲染缺陷？\n' +
  '最后给出总评：合格 / 有问题（并列出具体问题）。';

const SHOTS_ALL = [
  {
    file: path.join(SHOTS_DIR, 'gate_vent_f1.png'),
    name: 'F1 通风管门禁【锁定态】',
    ctx: 'gate_vent locked=true need=lab_badge。玩家位于门禁正上方一格（绿色圆点）。应能看到脉冲描边弧线门框 + 🔒 锁 emoji。',
  },
  {
    file: path.join(SHOTS_DIR, 'gate_vent_f1_unlocked.png'),
    name: 'F1 通风管门禁【解锁态】',
    ctx: 'gate_vent locked=false。玩家在门禁左侧一格（该门禁格兼作传送门，解锁后踩上会切层，故从侧面拍摄）。应能看到门禁解锁后的视觉形态（锁图标消失或颜色变化）。',
  },
  {
    file: path.join(SHOTS_DIR, 'gate_b_area_f2.png'),
    name: 'F2 B 区门禁【锁定态】',
    ctx: 'gate_b_area locked=true need=lab_badge。玩家位于门禁正上方一格（绿色圆点）。应能看到脉冲描边弧线门框 + 🔒 锁 emoji。',
  },
  {
    file: path.join(SHOTS_DIR, 'gate_b_area_f2_unlocked.png'),
    name: 'F2 B 区门禁【解锁态】',
    ctx: 'gate_b_area locked=false。玩家位于门禁正上方一格（绿色圆点）。应能看到门禁解锁后的视觉形态（锁图标消失或颜色变化）。',
  },
];

// QC_ONLY=<子串> 时只质检文件名/名称包含该子串的截图（按出现顺序）
const QC_ONLY = process.env.QC_ONLY;
const SHOTS = QC_ONLY ? SHOTS_ALL.filter(s => path.basename(s.file).includes(QC_ONLY) || s.name.includes(QC_ONLY)) : SHOTS_ALL;
if (!SHOTS.length) { console.error('QC_ONLY 未匹配任何截图: ' + QC_ONLY); process.exit(1); }

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

async function callOnce(base64, text) {
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
            { type: 'text', text },
            { type: 'image_url', image_url: { url: `data:image/png;base64,${base64}` } },
          ],
        },
      ],
      max_tokens: 2048,
    }),
  });
  return res;
}

async function callWithRetry(file, text) {
  const base64 = fs.readFileSync(file).toString('base64');
  let lastErr = null;
  for (let attempt = 0; attempt <= 4; attempt++) {
    try {
      const res = await callOnce(base64, text);
      if (res.status === 429) {
        // 读取 429 响应体用于诊断（上游限流原因）
        let errBody = '';
        try { errBody = (await res.text()).slice(0, 300); } catch { /* ignore */ }
        lastErr = `HTTP 429 限流 (第 ${attempt + 1} 次重试前)`;
        // stealth/ox-alpha 上游共享池限流，需要更长退避（60-90 秒）
        const delay = 60000 + Math.floor(Math.random() * 30000);
        console.log(`  [429] ${path.basename(file)} 上游限流，等待 ${(delay / 1000).toFixed(1)}s 后重试 (${attempt + 1}/4)`);
        if (errBody) console.log(`  [429 body] ${errBody}`);
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
      const msg = data.choices && data.choices[0] && data.choices[0].message;
      // stealth/ox-alpha 有时把回答写进 reasoning 而 content 为 null（finish_reason=length）
      let content = msg && msg.content;
      if ((content === undefined || content === null || content === '') && msg && msg.reasoning) {
        content = msg.reasoning;
      }
      if (content === undefined || content === null) {
        throw new Error('响应中没有 choices[0].message.content: ' + JSON.stringify(data).slice(0, 400));
      }
      return normalizeContent(content);
    } catch (e) {
      if (lastErr && lastErr.startsWith('HTTP 429')) {
        if (attempt >= 4) throw new Error(lastErr + (e && e.message ? ' | ' + e.message : ''));
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
    '# 门禁渲染视觉质检报告（stealth/ox-alpha）',
    '',
    '- 生成时间: ' + new Date().toISOString(),
    '- 模型: stealth/ox-alpha',
    '- 质检对象: 4 张门禁截图（F1 通风管 / F2 B 区，各含锁定态与解锁态）',
    '',
  ];
  lines.push(...header);
  console.log(header.join('\n'));

  for (const shot of SHOTS) {
    console.log(`开始质检: ${shot.name} (${path.basename(shot.file)})`);
    lines.push('---');
    lines.push('');
    lines.push(`## ${shot.name}`);
    lines.push('');
    lines.push(`- 文件: \`${shot.file}\``);
    lines.push(`- 场景上下文: ${shot.ctx}`);
    lines.push('');
    lines.push('### 模型反馈原文');
    lines.push('');
    lines.push('```text');
    try {
      const content = await callWithRetry(shot.file, QC_TEXT + '\n\n本次截图场景上下文：' + shot.ctx);
      lines.push(content);
      console.log(`  OK: ${path.basename(shot.file)}`);
    } catch (e) {
      lines.push(`调用失败: ${e.message}`);
      console.error(`  FAIL: ${path.basename(shot.file)} -> ${e.message}`);
    }
    lines.push('```');
    lines.push('');
    lines.push('');
    // 图间冷却，缓解上游限流
    if (shot !== SHOTS[SHOTS.length - 1]) {
      const cool = 30000 + Math.floor(Math.random() * 15000);
      console.log(`  图间冷却 ${(cool / 1000).toFixed(1)}s ...`);
      await sleep(cool);
    }
  }

  fs.mkdirSync(DESIGN_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, lines.join('\n'), 'utf8');
  console.log('结果已写入: ' + OUT_FILE);
})().catch((e) => {
  console.error('脚本异常退出:', e);
  process.exit(1);
});