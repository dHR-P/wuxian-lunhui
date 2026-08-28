// 批量生成副本三件套骨架（确定性）——修正版：完整生成 26 行地图 + 五表
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = 'C:\\Users\\GWL\\Desktop\\itwillclaude\\games\\wuxian-horror-ch1';
const TPL = path.join(ROOT, 'tools', 'templates');
const SRC = path.join(ROOT, 'server-rs', 'src');
const TESTS = path.join(ROOT, 'server-rs', 'tests');
const DESIGN = path.join(ROOT, 'tools', 'design');

const templates = {
  worlds: fs.readFileSync(path.join(TPL, 'demo_worlds.rs'), 'utf8'),
  scenes: fs.readFileSync(path.join(TPL, 'demo_scenes.rs'), 'utf8'),
  tests: fs.readFileSync(path.join(TPL, 'demo_tests.rs'), 'utf8'),
};

// slug | SLUG | prefix | 世界名 | BOSS | hp | lo | hi | 层数 | 钩子
const D = [
  ['xingjichuanqi','XINGJICHUANQI','xj_','星际传奇 · CD星球','嗜血生物群',160,14,24,3,'这里的美，只在白天。'],
  ['xinhuangfang','XINHUANGFANG','xf_','心慌方 CUBE','考验者',120,12,20,3,'每个房间都一样，除了死法。'],
  ['huanxiongshi','HUANXIONGSHI','hx_','生化危机 · 浣熊市','暴君',200,18,28,3,'蜂巢在地下，而地狱在地上。'],
  ['mengguijie','MENGGUIJIE','mg_','猛鬼街 · 弗莱迪梦境','弗莱迪',190,16,26,3,'别睡着。睡着了，就是它的。'],
  ['siwuzhen','SIWUZHEN','sw_','死亡开端 · 死雾镇','雾中行尸之王',180,16,24,3,'雾里没有活人。'],
  ['jingjiling','JINGJILING','jj_','寂静岭 · 表里世界','三角头',180,16,24,3,'雾里有东西在敲。'],
  ['shenmiao','SHENMIAO','sm_','死亡开端 · 沉没神殿','旧神眷属',200,16,26,3,'这里的水是倒着流的。'],
  ['shuangbai','SHUANGBAI','sb_','死亡开端 · 霜白村','首位复苏者',150,12,20,2,'所有雾，都是从这口井里长出来的。'],
  ['dashengtang','DASHENGTANG','ds_','死亡开端 · 大教堂圣所','污染圣物之灵',180,16,24,3,'圣光最盛处，腐得最深。'],
  ['daliexi','DALIEXI','dl_','死亡开端 · 大裂隙','裂隙行尸聚合体',220,18,28,3,'裂口下面，是另一个死亡。'],
  ['poxu','POXU','pv_','侠行天下 · 武极境破虚','异界来者',320,22,34,4,'武的尽头，是另一个世界的开始。'],
  ['hangu','HANGU','hg_','洪荒历 · 函谷关攻防','狂化军团长箜邪',240,18,30,3,'人族的城墙，是最后一道。'],
  ['panbu','PANBU','pb_','洪荒历 · 盘部落圣遗之夜','蛇牙祭仪',200,16,24,3,'那夜的火灾不是火——是未来。'],
  ['diweidu','DIWEIDU','dw_','洪荒历 · 低纬度领地','灾厄聚合体',230,18,28,3,'低纬度的影子，会追着活人。'],
  ['sanlian','SANLIAN','sl_','洪荒历 · 三联盟会盟','狂誓者',180,16,24,2,'举杯的下一秒，脚下是祭坛。'],
  ['wujin','WUJIN','wj_','洪荒历 · 无尽森林','兽人战潮王',210,16,26,3,'森林会吃人——也吃文明。'],
  ['yizhong','YIZHONG','yz_','无限恐怖 · 异种','异种成体',170,14,24,3,'它不是入侵——是进化错误。'],
  ['jishengqianye','JISHENGQIANYE','js_','无限恐怖 · 寄生前夜','线粒体聚合体',200,16,26,3,'你的每个细胞，都可能在背叛你。'],
  ['miwu','MIWU','mw_','无限恐怖 · 迷雾','雾中巨物',220,18,28,3,'雾里最可怕的，是雾里回来的人。'],
  ['xingchen','XINGCHEN','xc_','大宇宙时代 · 星辰吞噬者','星核守卫',220,18,28,3,'它的胃，是一整个星团。'],
  ['yinxiang','YINXIANG','yx_','大宇宙时代 · 银色战争','银色舰长',250,20,30,3,'真空里没有声音，但你能听见心跳。'],
  ['nuoya','NUOYA','ny_','大宇宙时代 · 诺亚方舟','失控武装头目',150,12,20,2,'有些救不了的人，也要去救。'],
  ['lanshan','LANSHAN','ls_','无限曙光 · 蓝山保卫战','攻城巨魔督军',260,20,32,3,'一个城市，一座山，一场输不起的仗。'],
  ['shourongsuo','SHOURONGSUO','sr_','无限曙光 · 收容所','模因具现体',190,16,26,3,'被收容的不是东西——是概念。'],
  ['tianwang','TIANWANG','tw_','无限曙光 · 天网地下','机械融合体',280,22,34,3,'审判日，不是某一天——是一个程序。'],
  ['xingjijianchuan','XINGJIJIANCHUAN','xjj_','无限未来 · 星际舰船','舰桥叛乱AI',200,16,26,3,'这艘船，已经不再属于人类。'],
];

function genMap(fIdx) {
  const W = 40, H = 26, rows = [];
  for (let y = 0; y < H; y++) {
    if (y === 0 || y === H - 1) { rows.push('#'.repeat(W)); continue; }
    let r = '#' + '.'.repeat(W - 2) + '#';
    if (fIdx === 0 && y === 3) r = r.slice(0, 20) + 'P' + r.slice(21);
    if (y === 8) r = r.slice(0, 30) + 'I' + r.slice(31);
    if (y === 14) r = r.slice(0, 10) + 'I' + r.slice(11);
    if (y === 20) r = r.slice(0, 25) + 'I' + r.slice(26);
    rows.push(r);
  }
  return rows;
}

function genWorlds(SLUG, prefix, name, floors) {
  let out = `//! ${name} 世界数据\nuse crate::maps::{PointDef, EnemyDef, NpcDef, ZoneDef, PortalDef, GateDef};\n\n`;
  for (let f = 0; f < floors; f++) {
    out += `pub static ${SLUG}_F${f + 1}_MAP: &[&str] = &[\n`;
    for (const r of genMap(f)) out += `    "${r}",\n`;
    out += `];\n`;
  }
  out += `pub static ${SLUG}_FLOOR_NAMES: &[&str] = &[`;
  for (let f = 0; f < floors; f++) out += `"第${f + 1}层"${f < floors - 1 ? ', ' : ''}`;
  out += `];\n\n`;
  out += `pub static POINTS: &[PointDef] = &[\n    PointDef { id: "${prefix}pt_1", name: "调查点", floor: 0, x: 20, y: 5, route: "${prefix}00" },\n];\n`;
  out += `pub static ENEMIES: &[EnemyDef] = &[\n    EnemyDef { id: "${prefix}e_1", name: "敌人", floor: 0, x: 30, y: 5, radius: 3, fight: "${prefix}boss" },\n];\n`;
  out += `pub static NPCS: &[NpcDef] = &[];\n`;
  out += `pub static ZONES: &[ZoneDef] = &[];\n`;
  out += `pub static PORTALS: &[PortalDef] = &[`;
  for (let f = 0; f < floors - 1; f++) {
    out += `\n    PortalDef { id: "${prefix}p_${f + 1}", floor: ${f}, x: 38, y: 5, to_floor: ${f + 1}, tx: 2, ty: 5 },`;
  }
  out += `\n];\n`;
  out += `pub static GATES: &[GateDef] = &[];\n`;
  return out;
}

function genScenes(SLUG, slug, prefix, name, boss, hp, lo, hi, hook) {
  return templates.scenes
    .replaceAll('DEMO', SLUG).replaceAll('demo', slug).replaceAll('dm_', prefix)
    .replace('示例BOSS', boss)
    .replace('hp: 150,', `hp: ${hp},`)
    .replace('dmg: (16, 24),', `dmg: (${lo}, ${hi}),`)
    .replace('你踏入了这个副本。', `你踏入了「${name}」。`)
    .replace('它挡在出口，等待你到来。', `${boss} 挡在出口。${hook}`)
    .replace('副本名 · 死因标题', `${name} · 殒命`)
    .replace('一句话死因', `殒命于${name}`);
}

function genTests(SLUG, slug, prefix) {
  return templates.tests
    .replaceAll('DEMO', SLUG).replaceAll('demo', slug).replaceAll('dm_', prefix);
}

let done = 0;
for (const [slug, SLUG, prefix, name, boss, hp, lo, hi, floors, hook] of D) {
  // 跳过已存在的（子代理已高质量完成的三件套，避免覆盖）
  const wPath = path.join(SRC, 'worlds', `${slug}.rs`);
  const sPath = path.join(SRC, `scenes_${slug}.rs`);
  const tPath = path.join(TESTS, `${slug}_flow.rs`);
  const hasAll = fs.existsSync(wPath) && fs.existsSync(sPath) && fs.existsSync(tPath);
  if (hasAll) { console.log(`SKIP ${slug} (already complete)`); continue; }

  fs.writeFileSync(wPath, genWorlds(SLUG, prefix, name, floors));
  fs.writeFileSync(sPath, genScenes(SLUG, slug, prefix, name, boss, hp, lo, hi, hook));
  fs.writeFileSync(tPath, genTests(SLUG, slug, prefix));
  fs.writeFileSync(path.join(DESIGN, `${slug}_impl_log.md`),
    `# ${name} 副本实现日志\n\n- BOSS: ${boss} HP${hp} dmg(${lo},${hi})\n- 层数: ${floors}\n- 钩子: ${hook}\n\n## ★外部依赖\n1. lib.rs: pub mod scenes_${slug};\n2. worlds/mod.rs: mod ${slug}; + WORLD_${SLUG}; + WorldData 注册 + 网关\n3. scenes.rs: scene()/fight_cfg() 加 or_else\n`);
  done++;
  console.log(`GEN ${slug} (${floors}层 ${boss} HP${hp})`);
}
console.log(`DONE: generated ${done}, skipped ${D.length - done}`);