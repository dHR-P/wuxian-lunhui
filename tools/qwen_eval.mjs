// qwen_eval.mjs — 批量评估《无限轮回》游戏截图（61 张）的画面质量
// 判图：调用 tokenrhythm qwen3.7-flash 视觉模型（模型名不带 tokenrhythm/ 前缀）
// 用法: node qwen_eval.mjs [--dump <file>]   (可选 --dump 输出每张原始回复到 JSON，便于自查)
// 结果: tools/shots_eval_report.json + tools/shots_eval_report.md
// 凭据: ~/.dsh/.credentials.yaml 的 TOKENRHYTHM_API_KEY
// 端点: https://tokenrhythm.studio/v1/chat/completions (OpenAI 兼容)
// 注意: 429 退避 15s×5；回复兼容 content / reasoning_content；每张间 sleep 300~600ms
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SHOTS_DIR = path.join(__dirname, 'shots');
const JSON_OUT = path.join(__dirname, 'shots_eval_report.json');
const MD_OUT = path.join(__dirname, 'shots_eval_report.md');
const RAWDIR = path.join(__dirname, 'shots_raw_responses'); // 每张原始回复存档

const ENDPOINT = 'https://tokenrhythm.studio/v1/chat/completions';
const MODEL = 'qwen3.7-flash';
// content 通常为空，完整回复在 reasoning_content；链式思考很长，需足够 token 让它写完末尾的结构化答案
const MAX_TOKENS = 4000;

const sleep = ms => new Promise(r => setTimeout(r, ms));

// 判图指令（中文），要求模型严格按 6 行输出
const JUDGE_PROMPT = `这是游戏《无限轮回》的一张画面截图。请评估画面质量，用中文简洁回答，严格按以下 6 行输出：
场景类型: （标题屏/主神空间/世界地图/剧情对话/3D战斗 之一）
画面完整性: （正常/黑屏/白屏/空白/加载占位/其它异常）
可见UI: （按钮/对话文字/HUD/血条/立绘/背景图 等，一句话）
美术质量: （清晰度/构图/色彩/风格是否协调，有无模糊、拉伸、错位、文字乱码、占位图、素材缺失）
结论: （PASS 正常 / WARN 有小问题但可用 / FAIL 严重问题）
问题: （一句话说明问题，无问题写"无"）`;

function loadKey() {
  const p = path.join(os.homedir(), '.dsh', '.credentials.yaml');
  const raw = fs.readFileSync(p, 'utf8');
  const m = raw.match(/TOKENRHYTHM_API_KEY:\s*(\S+)/);
  if (!m) throw new Error('TOKENRHYTHM_API_KEY not found');
  return m[1];
}

function mimeOf(p) {
  const lower = p.toLowerCase();
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.bmp')) return 'image/bmp';
  return 'image/png';
}

// 单次 API 调用
async function callOnce(key, b64) {
  const body = {
    model: MODEL,
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: JUDGE_PROMPT },
        { type: 'image_url', image_url: { url: `data:image/png;base64,${b64}` } },
      ],
    }],
    max_tokens: MAX_TOKENS,
  };
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (res.status === 429) return { retry: true, reason: '429', error: '', content: '', reasoning: '' };
  const text = await res.text();
  if (!res.ok) {
    // 429 / 5xx / 服务繁忙 / 网关超时 属于瞬时故障，重试
    if (res.status === 429 || res.status >= 500 || /LITELLM_UNAVAILABLE|SERVICE_BUSY|暂时不可用|服务繁忙|overloaded|GATEWAY-TIME|timeout|timed out/i.test(text)) {
      return { retry: true, reason: `${res.status}`, error: '', content: '', reasoning: '' };
    }
    return { retry: false, reason: `${res.status}`, error: `API error ${res.status}: ${text.slice(0, 500)}`, content: '', reasoning: '' };
  }
  let data;
  try { data = JSON.parse(text); } catch { return { retry: false, reason: 'json', error: 'bad json: ' + text.slice(0, 300), content: '', reasoning: '' }; }
  const msg = data.choices?.[0]?.message || {};
  const content = typeof msg.content === 'string' ? msg.content : '';
  const reasoning = typeof msg.reasoning_content === 'string' ? msg.reasoning_content : '';
  return { retry: false, reason: '', error: '', content, reasoning };
}

// 带退避的重试：429/503 等瞬时故障，退避 15s×5
async function callWithRetry(key, b64, fname) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const r = await callOnce(key, b64);
    if (!r.retry) {
      if (r.error) throw new Error(r.error);
      return r; // { content, reasoning }
    }
    console.error(`  [${fname}] attempt ${attempt + 1}: transient fault ${r.reason}, backing off 15s ...`);
    await sleep(15000);
  }
  throw new Error(`[${fname}] still failing after 5 attempts`);
}

// 从模型回复解析 6 个字段；容错：找不到行时按 label 定位，缺省置空"
// 兼容两种情况：
//  a) 干净格式：`场景类型: 剧情对话`
//  b) 模板回显：`场景类型:（标题屏/...之一） -> 剧情对话`，取 "->" 之后的值；无 "->" 时去掉括号模板
function parseReply(text) {
  const src = (text || '');
  const cleanValue = v => {
    let s = v.trim().replace(/^\d+[\.、]\s*/, '');
    // 若行值是模板回显（含 -> 或开头就是"（"），取最终值
    const arrow = s.match(/[->—]\s*([^（()]*)$/);
    if (arrow) s = arrow[1].trim();
    // 去掉残留的括号模板文字
    s = s.replace(/^（[^）]*）\s*/, '').trim();
    // 去掉可能的"之一"、"正常/黑屏/..."枚举残留
    return s.replace(/\s*(之一|一个|等|等。)$/, '').trim();
  };
  const pick = v => {
    const m = src.match(new RegExp(`^\\s*${v}\\s*[:：]\\s*(.*)$`, 'm'));
    if (!m) return '';
    return cleanValue(m[1]);
  };
  // 优先取最后出现的"结论"/"问题"行值（末尾通常是最终判定，避免中途草稿）
  const lastOf = v => {
    const re = new RegExp(`^\\s*${v}\\s*[:：]\\s*(.*)$`, 'gm');
    let m, last = '';
    while ((m = re.exec(src)) !== null) last = m[1];
    return last ? cleanValue(last) : '';
  };
  return {
    scene_type: pick('场景类型'),
    integrity: pick('画面完整性'),
    ui: pick('可见UI'),
    art: pick('美术质量'),
    verdict: lastOf('结论'),
    problem: lastOf('问题').replace(/写["“]无["”]|无问题写/g, '').trim() || '无',
  };
}

function normalizeVerdict(v) {
  const s = (v || '').toUpperCase();
  if (s.includes('FAIL')) return 'FAIL';
  if (s.includes('WARN')) return 'WARN';
  if (s.includes('PASS')) return 'PASS';
  // 未匹配则保守按内容判断（避免把"结论:（PASS/WARN/FAIL 之一）"这类模板误判）
  if (/严重|坏了|缺失|黑屏|白屏|空白|错位|乱码/i.test(s)) return 'FAIL';
  if (/小问题|可用|模糊|略|轻微|截断/i.test(s)) return 'WARN';
  return 'PASS';
}

async function main() {
  if (!fs.existsSync(SHOTS_DIR)) { console.error(`shots dir not found: ${SHOTS_DIR}`); process.exit(2); }
  const pngs = fs.readdirSync(SHOTS_DIR).filter(f => f.toLowerCase().endsWith('.png')).sort();
  console.log(`Found ${pngs.length} PNG files.`);

  // 断点续跑：已有结果的读入
  const existing = {};
  if (fs.existsSync(JSON_OUT)) {
    try {
      const old = JSON.parse(fs.readFileSync(JSON_OUT, 'utf8'));
      for (const r of (old.results || [])) existing[r.file] = r;
    } catch { /* ignore */ }
  }

  const key = loadKey();
  const results = [];
  let done = 0, skipped = 0;
  const t0 = Date.now();

  for (const f of pngs) {
    if (existing[f]) { results.push(existing[f]); skipped++; console.log(`[skip already done] ${f}`); continue; }

    const fp = path.join(SHOTS_DIR, f);
    const b64 = fs.readFileSync(fp).toString('base64');
    let resp;
    try {
      resp = await callWithRetry(key, b64, f);
    } catch (e) {
      console.error(`FATAL ${f}: ${e.message}`);
      results.push({ file: f, scene_type: '', integrity: '', ui: '', art: '', verdict: 'FAIL', problem: '调用失败: ' + e.message });
      done++; continue;
    }

    // content 通常为空，完整回复在 reasoning_content；取两者合并作为判据（优先 content）
    const reply = resp.content || resp.reasoning || '';

    // 存档原始回复（content 与 reasoning 分开存）
    if (!fs.existsSync(RAWDIR)) fs.mkdirSync(RAWDIR, { recursive: true });
    const base = f.replace(/\.png$/, '');
    fs.writeFileSync(path.join(RAWDIR, base + '.txt'), reply, 'utf8');
    fs.writeFileSync(path.join(RAWDIR, base + '.content.txt'), resp.content || '', 'utf8');
    fs.writeFileSync(path.join(RAWDIR, base + '.reasoning.txt'), resp.reasoning || '', 'utf8');

    const parsed = parseReply(reply);
    const verdict = normalizeVerdict(parsed.verdict);
    const rec = {
      file: f,
      scene_type: parsed.scene_type,
      integrity: parsed.integrity,
      ui: parsed.ui,
      art: parsed.art,
      verdict_auto: parsed.verdict, // 模型自报的结论原文
      verdict,                       // 归一化结论
      problem: parsed.problem || '无',
    };
    results.push(rec);
    done++;
    console.log(`[${done}/${pngs.length}] ${f} -> ${verdict}`);
    // 每张间 sleep 300~600ms 避免限流
    await sleep(300 + Math.floor(Math.random() * 300));
  }

  // 汇总统计
  const counts = { PASS: 0, WARN: 0, FAIL: 0, ERROR: 0 };
  for (const r of results) counts[r.verdict] = (counts[r.verdict] || 0) + 1;
  const fails = results.filter(r => r.verdict === 'FAIL');
  const warns = results.filter(r => r.verdict === 'WARN');
  const passes = results.filter(r => r.verdict === 'PASS');

  // 写 JSON
  const json = {
    generated_at: new Date().toISOString(),
    total: results.length,
    model: MODEL,
    prompt_note: 'judged by qwen3.7-flash (tokenrhythm)',
    summary: {
      PASS: counts.PASS || 0,
      WARN: counts.WARN || 0,
      FAIL: counts.FAIL || 0,
      error: counts.ERROR || 0,
    },
    results,
  };
  fs.writeFileSync(JSON_OUT, JSON.stringify(json, null, 2), 'utf8');

  // 写 MD
  const md = buildMarkdown(results, counts, fails, warns, passes);
  fs.writeFileSync(MD_OUT, md, 'utf8');

  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  console.log('--- DONE ---');
  console.log(`total=${results.length} done=${done} skipped_reused=${skipped} elapsed=${secs}s`);
  console.log(`PASS=${counts.PASS||0} WARN=${counts.WARN||0} FAIL=${counts.FAIL||0} error=${counts.ERROR||0}`);
  console.log(`wrote ${JSON_OUT}`);
  console.log(`wrote ${MD_OUT}`);
}

function buildMarkdown(results, counts, fails, warns, passes) {
  const L = [];
  L.push('# 《无限轮回》截图质检报告');
  L.push('');
  L.push(`- 生成时间：${new Date().toISOString()}`);
  L.push(`- 判图模型：${MODEL}（tokenrhythm，OpenAI 兼容视觉接口）`);
  L.push(`- 覆盖截图：${results.length} 张`);
  L.push(`- 原始回复存档目录：tools/shots_raw_responses/`);
  L.push('');
  L.push('## 汇总');
  L.push('');
  L.push(`| 结论 | 数量 |`);
  L.push(`| --- | --- |`);
  L.push(`| PASS 正常 | ${counts.PASS || 0} |`);
  L.push(`| WARN 有小问题可用 | ${counts.WARN || 0} |`);
  L.push(`| FAIL 严重问题 | ${counts.FAIL || 0} |`);
  L.push(`| 调用错误 | ${counts.ERROR || 0} |`);
  L.push('');

  L.push('## FAIL 清单（严重问题）');
  L.push('');
  if (fails.length === 0) L.push('（无）');
  else { for (const r of fails) L.push(`- \`${r.file}\` — ${r.problem || r.art || '未说明'}`); }
  L.push('');

  L.push('## WARN 清单（小问题可用）');
  L.push('');
  if (warns.length === 0) L.push('（无）');
  else { for (const r of warns) L.push(`- \`${r.file}\` — ${r.problem || r.art || '未说明'}`); }
  L.push('');

  // 按场景类型分组
  L.push('## 按场景类型分组明细');
  L.push('');
  const groups = {};
  for (const r of results) {
    const k = r.scene_type || '未识别';
    (groups[k] = groups[k] || []).push(r);
  }
  // 保持稳定顺序：标题屏/主神空间/世界地图/剧情对话/3D战斗 优先，其余后置
  const order = ['标题屏', '主神空间', '世界地图', '剧情对话', '3D战斗'];
  const keys = [...order.filter(k => groups[k]), ...Object.keys(groups).filter(k => !order.includes(k))];
  for (const k of keys) {
    L.push(`### ${k}（${groups[k].length} 张）`);
    L.push('');
    L.push('| 文件 | 结论 | 场景类型 | 完整性 | 可见UI | 美术质量 | 问题 |');
    L.push('| --- | --- | --- | --- | --- | --- | --- |');
    for (const r of groups[k]) {
      const esc = s => (s || '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' / ');
      L.push(`| \`${esc(r.file)}\` | **${esc(r.verdict)}** | ${esc(r.scene_type)} | ${esc(r.integrity)} | ${esc(r.ui)} | ${esc(r.art)} | ${esc(r.problem)} |`);
    }
    L.push('');
  }

  // PASS 简表
  const passByFile = Object.fromEntries(passes.map(r => [r.file, r]));
  L.push('## 全部截图 verdict 一览');
  L.push('');
  L.push('| 文件 | 结论 | 问题 |');
  L.push('| --- | --- | --- |');
  for (const r of results) L.push(`| \`${r.file}\` | **${r.verdict}** | ${(r.problem || '无').replace(/\r?\n/g, ' / ')} |`);
  L.push('');

  L.push('> 说明：结论经归一化（PASS/WARN/FAIL）；"调用错误"表示该张调用 qwen3.7-flash 失败且未能重试成功，需人工复核。');
  return L.join('\n');
}

main().catch(e => { console.error('FATAL', e.message); process.exit(1); });
