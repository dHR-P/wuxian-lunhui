// triage_ox.mjs — ox-alpha 质检（stealth/ox-alpha, OpenRouter）
// 两轮: 6 张全图(第一轮) + 3 张重点追问(第二轮, 带像素分析得出的区域坐标)
// 退避: 429/5xx → 6s*attempt + rand(0..5s), 最多 4 次; 图间冷却 13~16s
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
  for (let attempt = 1; attempt <= 4; attempt++) {
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
      await sleep(6000 * attempt);
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
      const wait = 6000 * attempt + Math.floor(Math.random() * 5000);
      console.log(`  [${tag}] attempt ${attempt} failed (${resp.status}), retry in ${(wait / 1000).toFixed(1)}s`);
      await sleep(wait);
      continue;
    }
    return lastErr;
  }
  return 'ERROR: retries exhausted (429/5xx). last: ' + lastErr;
}

const R1 = [
  {
    tag: 'preview_enemy_hunter', file: 'tools/design/preview_enemy/preview_enemy_hunter.png',
    prompt: `这是恐怖生存游戏《生化蜂巢》敌人「猎杀者」立绘【棋盘格预览图】：背景已抠除，透明区域显示为灰白棋盘格（210/150 灰）。已知质检出「胸口至腹部躯干直接透出棋盘格（镂空）」。请仔细看图，逐条回答：
① 主体是否完整入镜（头顶到脚底，未被裁切）？主体大致位置（左右/上下各约 %）？
② 躯干中段（胸口到腹部）是否确实镂空/透明？若有，请给出镂空区域的大致比例位置（例：横向 x 约 30%-70%，纵向 y 约 28%-86%，以画面宽高为 0-100% 估计）；
③ 镂空区域里面显示的是「灰白棋盘格」（纯透明空洞）还是「深色/灰色像素」？边缘是否毛糙、碎裂、有灰蓝溢边？
④ 除了躯干镂空，还有哪些异常（四肢、头部、配色、比例）？
⑤ 结论：镂空是「生成时主体本身断成几块」还是「抠图误删内部内容」的迹象？仅靠代码（重新抠图/修补 alpha）能否修复，还是必须重新生成？`,
  },
  {
    tag: 'preview_enemy_pc_zhengzha', file: 'tools/design/preview_enemy/preview_enemy_pc_zhengzha.png',
    prompt: `这是恐怖生存游戏《生化蜂巢》主角「郑吒」全身立绘【棋盘格预览图】：透明区域显示为灰白棋盘格。已知质检出：画面下半部残留一大块不透明的蓝白色放射状光晕/倒影未抠除；人物边缘蓝色光边渗出；靴底紧贴底边。请逐条回答：
① 主体人物（头到脚）是否完整入镜？人物本体 bounding box 大致比例位置（左/右/上/下各约 x% / y%）？
② 下半部蓝白色光晕/倒影：给出它的比例范围（左起 x?% 到 x?%、上边界约 y?% 到画面底部 y≈100%？）；它是「与人物身体连成一片的发光」还是「独立的大块斑块」？人物双腿/靴子是否被光晕吞没、难以分辨？
③ 靴底距画面底边大约多少（y 到底边约 0-3%？还是明显悬空）？是否疑似被裁切？
④ 人物边缘（尤其下半身）是否有蓝色光边/描边残留？上身、头部、手臂是否正常？
⑤ 结论：能否用纯代码修复（如「底部裁 8%」+ 对光晕区域降低 alpha/局部裁剪）？还是必须重新生成？请给出建议裁剪比例。`,
  },
  {
    tag: 'raw_enemy_hunter', file: 'tools/design/raw_enemy/hunter.png',
    prompt: `这是「猎杀者」的【黑底原图】（未抠图，背景纯黑）。请逐条回答：
① 主体是否完整入镜？躯干中段（胸口到腹部，约画面 x 30%-71%、y 28%-86%）能看清内容吗，还是就是纯黑一片？
② 如果躯干中段是纯黑：它和背景黑是否同一个黑？区域里有没有隐约轮廓/灰阶内容？据此判断「躯干镂空」更可能是 (a) 生成时主体本身就缺/断成几块，还是 (b) 抠图时把主体内部深色区域误删（原图该区域其实有内容）？
③ 主体内部主要深色区域（如阴影、暗色衣饰）与纯黑背景能区分开吗？边缘是否清晰？
④ 主体位置比例、体型、配色大概如何？`,
  },
  {
    tag: 'raw_enemy_pc_zhengzha', file: 'tools/design/raw_enemy/pc_zhengzha.png',
    prompt: `这是主角「郑吒」的【黑底原图】（未抠图，背景纯黑）。请逐条回答：
① 主体是否完整入镜？人物脚/靴子距画面底边还有多少空隙（约 y 到 100% 之间占多少）？
② 人物下半身/脚下是否有大范围蓝白色光晕或倒影效果？它向上蔓延到画面多高（约 y?% 起）？它和人物主体是连成一片还是独立光斑？
③ 人物黑色紧身T恤、深色裤子与纯黑背景能区分开吗？轮廓边缘是否清晰可辨？
④ 若要在保留人物的情况下把黑背景抠掉，这片蓝色光晕应该一起保留（作为人物脚下的光效）还是应该被抠除（属于背景）？`,
  },
  {
    tag: 'cut_enemy_hunter', file: 'server-rs/ui/assets/img/enemy_hunter.png',
    prompt: `这是抠图成品【enemy_hunter.png】（带 alpha 透明通道；透明区域在你的画面里可能显示为黑色/白色或棋盘格，请以主体实体轮廓为准）。请逐条回答：
① 主体整体轮廓是否完整、可辨认？有没有「躯干中段大块缺失」（如果是纯透明，缺失处会显示为前述透明色）？
② 四肢（尤其是手臂、小腿）是否破碎、缺块、断成几截？
③ 透明区域是否侵入了主体内部（即内部镂空）？边缘是否有毛糙、灰蓝色溢边？
④ 大致位置：主体占据画面哪些百分比范围？`,
  },
  {
    tag: 'cut_pc_zhengzha', file: 'server-rs/ui/assets/img/pc_zhengzha.png',
    prompt: `这是抠图成品【pc_zhengzha.png】（带 alpha 透明通道；透明区可能显示为黑/白/棋盘格，请以主体为准）。请逐条回答：
① 人物是否完整（头到脚），靴底位置：人物脚下是否紧贴画面底边、还是仍有透明边距？
② 人物脚下/下半身是否残留大块蓝白色光晕？它占据画面多大范围（从 y?% 到 y?%，左右 x?% 到 x?%）？是包围着人物连成一片，还是独立斑块？
③ 人物边缘（尤其轮廓周围）是否有蓝色光边/描边？
④ 人物本体大致 bounding box（左右/上下 %）？`,
  },
];

const R2 = [
  {
    tag: 'f2_preview_hunter_cavity', file: 'tools/design/preview_enemy/preview_enemy_hunter.png',
    prompt: `请只看「猎杀者」棋盘格预览图中部区域：躯干中段（横 x 约 30%-71%、纵 y 约 28%-86%）那里有报告说是一大块镂空。请专门回答：
① 该区域中央显示的是「灰白棋盘格」（纯透明空洞）还是「某种颜色的像素/烟雾」？
② 镂空区域的形状大致是什么（椭圆/心形/不规则）？边界是否圆滑还是毛糙碎裂？
③ 镂空四周（胸腔壁、肩、腰侧）的"实心"部分是否连续成环状包围它？上方与脖子、下方与腹股沟之间的连接是实心还是也透空？
④ 躯干镂空之外，画面里还有没有其他被棋盘格"侵入"主体内部的区域（例如两个大小不一的空洞并排）？请给出各自的大致坐标。`,
  },
  {
    tag: 'f2_preview_zhengzha_bottom', file: 'tools/design/preview_enemy/preview_enemy_pc_zhengzha.png',
    prompt: `请只看主角「郑吒」棋盘格预览图的【下半部分】（画面底部约 45% 区域，即纵 y 约 55%-100%）。像素分析显示这里有大片不透明蓝白色光晕。请专门回答：
① 蓝白色光晕的边界：它从画面多高的地方开始（y 约 ?%）？左右到多宽（x 约 ?% 到 ?%）？是否一直延伸到画面底边 (y=100%)？
② 光晕与人物双腿/靴子的关系：是光晕整体包裹着双腿（连成一体），还是双腿/靴子独立可辨、光晕只是脚下的一团？
③ 靴底/脚底距画面底边大约多少（y% 到 100% 之间的空隙）？
④ 人物轮廓四周是否有一圈蓝色光边（描边状）？上身部分（y 0-55%）是否存在异常？
⑤ 如果要代码修复：底部裁掉多少 %、两侧各裁多少 % 才能把光晕干净切掉又不伤人物？`,
  },
  {
    tag: 'f2_raw_hunter_torso', file: 'tools/design/raw_enemy/hunter.png',
    prompt: `请集中看「猎杀者」黑底原图的躯干中段区域（横 x 约 30%-71%、纵 y 约 28%-86%）。请专门回答：
① 该区域是「和背景完全一样的纯黑」（即原图生成时就缺一块），还是存在任何内容：微弱灰阶、轮廓线、色彩、噪点？
② 如果纯黑：这块"空腔"的边缘是否能看到主体组织的锐利断口（说明生成时身体被挖空），还是柔和渐隐？
③ 与该区域同高度的两侧（左右手臂位置）内容是否正常、连续？
④ 你的判断：这张原图直接用于重抠图（纯代码，不动生成），能否得到实心完整躯干？还是必须重新生成？`,
  },
];

const all = [];
function logLine(s) { fs.appendFileSync(OUT_TXT, s + '\n', 'utf8'); }

async function run() {
  fs.writeFileSync(OUT_TXT, '=== ox-alpha 素材分诊原始回答 ===\n生成时间: ' + new Date().toLocaleString('zh-CN') + '\n\n', 'utf8');
  fs.writeFileSync(OUT_JSON, '[]', 'utf8');
  console.log('round 1: 6 张');
  for (const it of R1) {
    console.log(`--- [${it.tag}] ${it.file}`);
    logLine(`\n【${it.tag}】 ${it.file}`);
    logLine('问: ' + it.prompt.replace(/\n/g, ' '));
    const ans = await callVision(it.prompt, D(it.file), it.tag);
    logLine('答: ' + ans);
    all.push({ round: 1, tag: it.tag, file: it.file, prompt: it.prompt, answer: ans });
    fs.writeFileSync(OUT_JSON, JSON.stringify(all, null, 2), 'utf8');
    console.log(`  done, ${(ans.length)} chars`);
    await sleep(13000 + Math.floor(Math.random() * 4000));
  }
  console.log('round 2: 3 张重点追问');
  for (const it of R2) {
    console.log(`--- [${it.tag}]`);
    logLine(`\n【${it.tag}】(第二轮追问, 同图)`);
    logLine('问: ' + it.prompt.replace(/\n/g, ' '));
    const ans = await callVision(it.prompt, D(it.file), it.tag);
    logLine('答: ' + ans);
    all.push({ round: 2, tag: it.tag, file: it.file, prompt: it.prompt, answer: ans });
    fs.writeFileSync(OUT_JSON, JSON.stringify(all, null, 2), 'utf8');
    console.log(`  done, ${ans.length} chars`);
    await sleep(13000 + Math.floor(Math.random() * 4000));
  }
  console.log('ALL DONE -> ' + OUT_TXT);
}
run().catch((e) => { console.error('FATAL', e); process.exit(1); });