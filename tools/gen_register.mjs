// 批量注册 27 个新副本到 lib.rs / worlds/mod.rs / scenes.rs（确定性）
import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'C:\\Users\\GWL\\Desktop\\itwillclaude\\games\\wuxian-horror-ch1\\server-rs\\src';
const libPath = path.join(ROOT, 'lib.rs');
const modPath = path.join(ROOT, 'worlds', 'mod.rs');
const scenesPath = path.join(ROOT, 'scenes.rs');

// slug | SLUG | world_id | initial_scene | px | py | 层数
const NEW = [
  ['tiexue2','TIEXUE2','tiexue2','tx2_00_open',1,1,3],
  ['xingjichuanqi','XINGJICHUANQI','xingjichuanqi','xj_00',20,3,3],
  ['xinhuangfang','XINHUANGFANG','xinhuangfang','xf_00',20,3,3],
  ['huanxiongshi','HUANXIONGSHI','huanxiongshi','hx_00',20,3,3],
  ['mengguijie','MENGGUIJIE','mengguijie','mg_00',20,3,3],
  ['siwuzhen','SIWUZHEN','siwuzhen','sw_00',20,3,3],
  ['jingjiling','JINGJILING','jingjiling','jj_00',20,3,3],
  ['shenmiao','SHENMIAO','shenmiao','sm_00',20,3,3],
  ['shuangbai','SHUANGBAI','shuangbai','sb_00',20,3,2],
  ['dashengtang','DASHENGTANG','dashengtang','ds_00',20,3,3],
  ['daliexi','DALIEXI','daliexi','dl_00',20,3,3],
  ['poxu','POXU','poxu','pv_00',20,3,4],
  ['hangu','HANGU','hangu','hg_00',20,3,3],
  ['panbu','PANBU','panbu','pb_00',20,3,3],
  ['diweidu','DIWEIDU','diweidu','dw_00',20,3,3],
  ['sanlian','SANLIAN','sanlian','sl_00',20,3,2],
  ['wujin','WUJIN','wujin','wj_00',20,3,3],
  ['yizhong','YIZHONG','yizhong','yz_00',20,3,3],
  ['jishengqianye','JISHENGQIANYE','jishengqianye','js_00',20,3,3],
  ['miwu','MIWU','miwu','mw_00',20,3,3],
  ['xingchen','XINGCHEN','xingchen','xc_00',20,3,3],
  ['yinxiang','YINXIANG','yinxiang','yx_00',20,3,3],
  ['nuoya','NUOYA','nuoya','ny_00',20,3,2],
  ['lanshan','LANSHAN','lanshan','ls_00',20,3,3],
  ['shourongsuo','SHOURONGSUO','shourongsuo','sr_00',20,3,3],
  ['tianwang','TIANWANG','tianwang','tw_00',20,3,3],
  ['xingjijianchuan','XINGJIJIANCHUAN','xingjijianchuan','xjj_00',20,3,3],
];

// ---- 1. lib.rs：在最后一个 pub mod scenes_xxx 后追加 ----
let lib = fs.readFileSync(libPath, 'utf8');
if (lib.includes('pub mod scenes_tiexue2;')) {
  console.log('lib.rs already has tiexue2, skip');
} else {
  const mods = NEW.map(([s]) => `pub mod scenes_${s};`).join('\n');
  const anchor = 'pub mod scenes_tiexue;';
  if (!lib.includes(anchor)) throw new Error('lib anchor not found');
  lib = lib.replace(anchor, anchor + '\n' + mods);
  fs.writeFileSync(libPath, lib);
  console.log('lib.rs updated');
}

// ---- 2. worlds/mod.rs ----
let mod = fs.readFileSync(modPath, 'utf8');

// 2a. mod 声明 + 常量 + WorldData static：追加到 WORLDS 声明之前
const modDecl = NEW.map(([s]) => `mod ${s};`).join('\n');
const constDecl = NEW.map(([s, SLUG, wid]) => `pub const WORLD_${SLUG}: &str = "${wid}";`).join('\n');
const staticBlocks = NEW.map(([s, SLUG, wid, init, px, py, fl]) => {
  const maps = Array.from({ length: fl }, (_, i) => `${s}::${SLUG}_F${i + 1}_MAP`).join(', ');
  return `static ${SLUG}: WorldData = WorldData {\n    id: WORLD_${SLUG},\n    name: "${wid}",\n    difficulty: 2,\n    initial_scene: "${init}",\n    floors: &[${maps}],\n    floor_names: ${s}::${SLUG}_FLOOR_NAMES,\n    points: ${s}::POINTS,\n    enemies: ${s}::ENEMIES,\n    npcs: ${s}::NPCS,\n    zones: ${s}::ZONES,\n    portals: ${s}::PORTALS,\n    gates: ${s}::GATES,\n};`;
}).join('\n\n');

// 2b. 在 mod 声明区（现有 mod tianshe 之类）后追加 mod 声明 —— 用 WORLDS 前统一追加三个块
const worldsAnchor = 'pub static WORLDS: &[&WorldData] = &[';
if (!mod.includes('mod tiexue2;')) {
  // 把 mod 声明插到 WORLD_ 常量块之前（找第一个已有 static WorldData 前不太稳，改为统一前缀插入到 WORLDS 前）
  const block = modDecl + '\n\n' + constDecl + '\n\n' + staticBlocks + '\n\n';
  mod = mod.replace(worldsAnchor, block + worldsAnchor);
  console.log('worlds/mod.rs: mod+const+static inserted before WORLDS');
}

// 2c. WORLDS 数组追加 &SLUG,
const worldsRefs = NEW.map(([s, SLUG]) => `    &${SLUG},`).join('\n');
const worldsTail = '    &TIANTING, &HEZI, &SHAQIU, &YIZE, &POXIAO, &TIEXUE,';
if (mod.includes(worldsTail)) {
  mod = mod.replace(worldsTail, worldsTail + '\n' + worldsRefs);
  console.log('worlds/mod.rs: WORLDS array appended');
} else {
  console.log('WARN: WORLDS tail anchor not found');
}

// 2d. GW_PORTALS 追加（gateway 结构从现有 grep 一段确认字段——这里用 from_world ZHUTIAN）
const gwAnchor = 'pub static GW_PORTALS: &[WorldGateway] = &[';
const gwBlock = NEW.map(([s, SLUG, wid, init, px, py]) => {
  return `    WorldGateway { id: "gw_${s}", from_world: WORLD_ZHUTIAN, from_floor: 0, fx: 0, fy: 0, to_world: WORLD_${SLUG}, to_floor: 0, tx: ${px}, ty: ${py}, available: true, label: "${wid}" },`;
}).join('\n');
// 找到 GW_PORTALS 数组末尾 "];" —— 用 next_world 附近定位不可靠，改用：在第一个 WorldGateway 之前插入（简单起见：跳过网关，主线可后补）
// 保守：不自动改 GW_PORTALS（结构需确认 WorldGateway 字段），只在日志提示
console.log('GW_PORTALS: skipping auto-insert (需确认 WorldGateway 字段名)');

fs.writeFileSync(modPath, mod);
console.log('worlds/mod.rs written');

// ---- 3. scenes.rs ----
let sc = fs.readFileSync(scenesPath, 'utf8');
const scnAnchor = 'crate::scenes_tiexue::TIEXUE_SCENES'; // 现有 tiexue 的 scene 链
if (sc.includes('scenes_tiexue2::TIEXUE2_SCENES')) {
  console.log('scenes.rs already has tiexue2');
} else {
  const sceneOrElse = NEW.map(([s, SLUG]) => `        .or_else(|| crate::scenes_${s}::${SLUG}_SCENES.iter().find(|x| x.id == id))`).join('\n');
  const fightOrElse = NEW.map(([s, SLUG]) => `        .or_else(|| crate::scenes_${s}::${s}_figths().iter().find(|(k, _)| *k == id).map(|(_, v)| v))`).join('\n');
  // 需要精确锚点，先找 scene() 里现有的 or_else 链尾。这里仅在找到 anchor 时插入
  if (sc.includes(scnAnchor)) {
    sc = sc.replace(scnAnchor, scnAnchor + '\n' + sceneOrElse);
    console.log('scenes.rs scene() or_else appended (近似位置，需 cargo check 确认)');
  } else {
    console.log('WARN: scenes.rs scene anchor not found');
  }
  fs.writeFileSync(scenesPath, sc);
}

console.log('REGISTER DONE\n注意：scenes.rs 的 fight_cfg() or_else 和 GW_PORTALS 需主线手工补（或用 cargo check 引导修复）。');
console.log('下一步：cargo check --all-targets 看编译错并修。');