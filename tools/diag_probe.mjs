// diag_probe.mjs — 诊断 qwen3.7-flash 回复: content 与 reasoning_content 分别是什么
// 用法: node diag_probe.mjs <image1> [image2] ...
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const KEY = (() => { const raw = fs.readFileSync(path.join(os.homedir(), '.dsh', '.credentials.yaml'), 'utf8'); return raw.match(/TOKENRHYTHM_API_KEY:\s*(\S+)/)[1]; })();
const sleep = ms => new Promise(r => setTimeout(r, ms));

const PROMPT = `这是游戏《无限轮回》的一张画面截图。请评估画面质量，用中文简洁回答，严格按以下 6 行输出：
场景类型: （标题屏/主神空间/世界地图/剧情对话/3D战斗 之一）
画面完整性: （正常/黑屏/白屏/空白/加载占位/其它异常）
可见UI: （按钮/对话文字/HUD/血条/立绘/背景图 等，一句话）
美术质量: （清晰度/构图/色彩/风格是否协调，有无模糊、拉伸、错位、文字乱码、占位图、素材缺失）
结论: （PASS 正常 / WARN 有小问题但可用 / FAIL 严重问题）
问题: （一句话说明问题，无问题写"无"）`;

for (const f of process.argv.slice(2)) {
  const b64 = fs.readFileSync(f).toString('base64');
  const body = { model: 'qwen3.7-flash', messages: [{ role: 'user', content: [
    { type: 'text', text: PROMPT },
    { type: 'image_url', image_url: { url: `data:image/png;base64,${b64}` } },
  ]}], max_tokens: 4000 };
  const res = await fetch('https://tokenrhythm.studio/v1/chat/completions', {
    method: 'POST', headers: { 'Authorization': `Bearer ${KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const txt = await res.text();
  if (!res.ok) { console.log(`== ${f} == HTTP ${res.status} ${txt.slice(0,200)}`); continue; }
  const msg = JSON.parse(txt).choices?.[0]?.message || {};
  console.log(`\n######## ${f} ########`);
  console.log(`--- content (len=${(msg.content||'').length}) ---`);
  console.log(msg.content || '(EMPTY)');
  console.log(`--- reasoning_content (len=${(msg.reasoning_content||'').length}) ---`);
  console.log(msg.reasoning_content ? msg.reasoning_content.slice(0,500) : '(EMPTY)');
  await sleep(500);
}
