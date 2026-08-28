// 解析所有 scenes_*.rs 文件，为每个 slug 找出「第一个有 bg（非 None）且非 boss/fight/回合/结算/卡片/死亡」的剧情场景 id。
// 输出 JSON 到 tools/shots/scene_map.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(__dirname, '..', 'server-rs', 'src');

// slug -> 文件名（部分 slug 需映射到文件；缺失则按前缀猜测）
const slugToFile = {
  baisun: 'scenes_baisun.rs', bihai: 'scenes_bihai.rs', cangjingge: 'scenes_cangjingge.rs',
  daliexi: 'scenes_daliexi.rs', dashengtang: 'scenes_dashengtang.rs', diweidu: 'scenes_diweidu.rs',
  hangu: 'scenes_hangu.rs', hezi: 'scenes_hezi.rs', huanxiongshi: 'scenes_huanxiongshi.rs',
  jialebi: 'scenes_jialebi.rs', jianzhong: 'scenes_jianzhong.rs', jiguancheng: 'scenes_jiguancheng.rs',
  jingjiling: 'scenes_jingjiling.rs', jishengqianye: 'scenes_jishengqianye.rs', jishujing: 'scenes_jishujing.rs',
  juluoji: 'scenes_juluoji.rs', lanshan: 'scenes_lanshan.rs', mengguijie: 'scenes_mengguijie.rs',
  miwu: 'scenes_miwu.rs', mojiao: 'scenes_mojiao.rs', moruiya: 'scenes_moruiya.rs',
  moshi: 'scenes_moshi.rs', mumiyi: 'scenes_mumiyi.rs', nuoya: 'scenes_nuoya.rs',
  panbu: 'scenes_panbu.rs', poxiao: 'scenes_poxiao.rs', poxu: 'scenes_poxu.rs',
  sanlian: 'scenes_sanlian.rs', shaqiu: 'scenes_shaqiu.rs', shenghua3: 'scenes_shenghua3.rs',
  shenmiao: 'scenes_shenmiao.rs', shourongsuo: 'scenes_shourongsuo.rs', shuangbai: 'scenes_shuangbai.rs',
  sishen: 'scenes_sishen.rs', siwuzhen: 'scenes_siwuzhen.rs', tianshe: 'scenes_tianshe.rs',
  tianting: 'scenes_tianting.rs', tianwang: 'scenes_tianwang.rs', tiexue: 'scenes_tiexue.rs',
  tiexue2: 'scenes_tiexue2.rs', tongqu: 'scenes_tongqu.rs', wujin: 'scenes_wujin.rs',
  wulin: 'scenes_wulin.rs', xingchen: 'scenes_xingchen.rs', xinghe: 'scenes_xinghe.rs',
  xingjichuanqi: 'scenes_xingjichuanqi.rs', xingjichuanqi2: 'scenes_xingjichuanqi2.rs', xingjijianchuan: 'scenes_xingjijianchuan.rs',
  xinhuangfang: 'scenes_xinhuangfang.rs', yinse: 'scenes_yinse.rs', yinxiang: 'scenes_yinxiang.rs',
  yiying: 'scenes_yiying.rs', yize: 'scenes_yize.rs', yizhong: 'scenes_yizhong.rs',
  zhouyuan: 'scenes_zhouyuan.rs',
};

const BAD_SUBSTRINGS = ['_boss', '_fight', '_round', '_settle', '_card', '_death', '_end', '_win', '_over', 'boss_', 'fight_', 'win'];

// 从文件提取 (id, bg) 对
function extractScenes(file) {
  const full = path.join(SRC, file);
  if (!fs.existsSync(full)) return null;
  const text = fs.readFileSync(full, 'utf8');
  const lines = text.split(/\r?\n/);
  const scenes = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/id:\s*"([^"]+)"/);
    if (!m) continue;
    const id = m[1];
    // bg 可能在下一行到几行内
    let bg = null;
    for (let j = i; j < Math.min(i + 12, lines.length); j++) {
      const bm = lines[j].match(/bg:\s*(Some\("([^"]+)"\)|None)/);
      if (bm) { bg = bm[2] || null; break; }
    }
    scenes.push({ id, bg, line: i + 1 });
  }
  return scenes;
}

const result = {};
const missingFiles = [];
for (const [slug, file] of Object.entries(slugToFile)) {
  const scenes = extractScenes(file);
  if (scenes === null) { missingFiles.push(slug); result[slug] = []; continue; }
  // 首选：有 bg 且非坏名字
  const good = scenes.filter(s => s.bg && !BAD_SUBSTRINGS.some(b => s.id.includes(b)));
  const startIds = good.filter(s => s.id.endsWith('_00') || s.id.endsWith('_0') || s.id.endsWith('_open') || s.id.endsWith('_intro') || s.id.endsWith('_arrive') || s.id.endsWith('_drop') || s.id.endsWith('_camp') || s.id.endsWith('_gate') || s.id.endsWith('_hub'));
  // 候选：优先 start 命名，否则全部 good
  const ordered = [...startIds, ...good.filter(s => !startIds.includes(s))];
  const unique = [...new Map(ordered.map(s => [s.id, s])).values()];
  result[slug] = unique.slice(0, 12).map(s => s.id);
}

const out = { _note: 'slugs -> candidate scene ids (priority order), verified at runtime', result, missingFiles };
fs.writeFileSync(path.join(__dirname, 'scene_map.json'), JSON.stringify(out, null, 2));
console.log('missingFiles:', missingFiles.join(',') || 'none');
for (const [slug, cands] of Object.entries(result)) {
  console.log(slug.padEnd(16), '->', cands.join(', '));
}
