// triage_analyze.mjs — 像素级分析（无第三方依赖，纯 zlib PNG 解码）
// 目的：为 ox-alpha 质检结论提供精确坐标，判定「生成缺陷 vs 抠图缺陷」
import fs from 'node:fs';
import zlib from 'node:zlib';
import path from 'node:path';

const BASE = 'C:/Users/GWL/Desktop/itwillclaude/games/wuxian-horror-ch1';
const D = (...p) => path.join(BASE, ...p);

const FILES = {
  previewHunter: D('tools/design/preview_enemy/preview_enemy_hunter.png'),
  previewZhengzha: D('tools/design/preview_enemy/preview_enemy_pc_zhengzha.png'),
  rawHunter: D('tools/design/raw_enemy/hunter.png'),
  rawZhengzha: D('tools/design/raw_enemy/pc_zhengzha.png'),
  cutHunter: D('server-rs/ui/assets/img/enemy_hunter.png'),
  cutZhengzha: D('server-rs/ui/assets/img/pc_zhengzha.png'),
};

// ---------- PNG 解码（8bit，非交织；支持 RGBA/RGB/灰度/调色板） ----------
function decodePNG(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not png');
  let off = 8, width, height, bitDepth, colorType, interlace = 0;
  const idat = []; const palette = []; let trns = null;
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') { width = data.readUInt32BE(0); height = data.readUInt32BE(4); bitDepth = data[8]; colorType = data[9]; interlace = data[12]; }
    else if (type === 'PLTE') { for (let i = 0; i + 2 < len; i += 3) palette.push([data[i], data[i + 1], data[i + 2]]); }
    else if (type === 'tRNS') trns = data;
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    off += 12 + len;
  }
  if (interlace !== 0) throw new Error('interlaced png unsupported');
  if (bitDepth !== 8) throw new Error('bitDepth ' + bitDepth + ' unsupported');
  const ch = colorType === 6 ? 4 : colorType === 2 ? 3 : colorType === 0 || colorType === 3 ? 1 : 0;
  if (!ch) throw new Error('colorType ' + colorType + ' unsupported');
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * ch;
  const out = Buffer.alloc(width * height * 4);
  const paeth = (a, b, c) => { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); return pa <= pb && pa <= pc ? a : pb <= pc ? b : c; };
  let pos = 0; const prev = Buffer.alloc(stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[pos++];
    const line = raw.subarray(pos, pos + stride); pos += stride;
    const cur = Buffer.from(line);
    if (filter === 1) { for (let i = ch; i < stride; i++) cur[i] = (cur[i] + cur[i - ch]) & 0xff; }
    else if (filter === 2) { for (let i = 0; i < stride; i++) cur[i] = (cur[i] + prev[i]) & 0xff; }
    else if (filter === 3) { for (let i = 0; i < stride; i++) { const a = i < ch ? 0 : cur[i - ch]; cur[i] = (cur[i] + ((a + prev[i]) >> 1)) & 0xff; } }
    else if (filter === 4) { for (let i = 0; i < stride; i++) { const a = i < ch ? 0 : cur[i - ch], b = prev[i], c = i < ch ? 0 : prev[i - ch]; cur[i] = (cur[i] + paeth(a, b, c)) & 0xff; } }
    for (let x = 0; x < width; x++) {
      const o = x * ch, d = (y * width + x) * 4;
      if (colorType === 6) { out[d] = cur[o]; out[d + 1] = cur[o + 1]; out[d + 2] = cur[o + 2]; out[d + 3] = cur[o + 3]; }
      else if (colorType === 2) { out[d] = cur[o]; out[d + 1] = cur[o + 1]; out[d + 2] = cur[o + 2]; out[d + 3] = 255; }
      else if (colorType === 0) { out[d] = cur[o]; out[d + 1] = cur[o]; out[d + 2] = cur[o]; out[d + 3] = 255; }
      else if (colorType === 3) { const idx = cur[o]; const [r, g, b] = palette[idx]; out[d] = r; out[d + 1] = g; out[d + 2] = b; out[d + 3] = trns && trns.length > idx ? trns[idx] : 255; }
    }
    prev.set(cur);
  }
  return { width, height, pixels: out };
}

const P = (f) => decodePNG(fs.readFileSync(f));
const lum = (d, i) => 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
const P2 = (x) => Math.round(x * 10) / 10;
const P1 = (x) => Math.round(x * 10) / 10;

// ---------- 连通域 / 空洞 ----------
function floodMask(mask, W, H, startIdx) {
  // 返回从 startIdx 出发的 4 连通区域（mask 为 1=可走）
  const seen = new Uint8Array(W * H);
  const stack = [startIdx]; seen[startIdx] = 1;
  const comp = [];
  const nb = [-1, 1, -W, W];
  while (stack.length) {
    const i = stack.pop(); comp.push(i);
    const x = i % W, y = (i / W) | 0;
    if (x > 0 && mask[i - 1] && !seen[i - 1]) { seen[i - 1] = 1; stack.push(i - 1); }
    if (x < W - 1 && mask[i + 1] && !seen[i + 1]) { seen[i + 1] = 1; stack.push(i + 1); }
    if (y > 0 && mask[i - W] && !seen[i - W]) { seen[i - W] = 1; stack.push(i - W); }
    if (y < H - 1 && mask[i + W] && !seen[i + W]) { seen[i + W] = 1; stack.push(i + W); }
  }
  return { ids: comp, seen };
}

function holesIn(mask, W, H) {
  // mask=1 不透明；返回被完全不透明像素包围的透明空洞（4连通）
  const vis = new Uint8Array(W * H);
  const stack = [];
  const tryPush = (i) => { if (!mask[i] && !vis[i]) { vis[i] = 1; stack.push(i); } };
  for (let x = 0; x < W; x++) { tryPush(x); tryPush((H - 1) * W + x); }
  for (let y = 0; y < H; y++) { tryPush(y * W); tryPush(y * W + W - 1); }
  while (stack.length) {
    const i = stack.pop();
    const x = i % W, y = (i / W) | 0;
    if (x > 0) { const n = i - 1; if (!mask[n] && !vis[n]) { vis[n] = 1; stack.push(n); } }
    if (x < W - 1) { const n = i + 1; if (!mask[n] && !vis[n]) { vis[n] = 1; stack.push(n); } }
    if (y > 0) { const n = i - W; if (!mask[n] && !vis[n]) { vis[n] = 1; stack.push(n); } }
    if (y < H - 1) { const n = i + W; if (!mask[n] && !vis[n]) { vis[n] = 1; stack.push(n); } }
  }
  const comps = [];
  const seen2 = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) {
    if (!mask[i] && !vis[i] && !seen2[i]) {
      const c = floodMaskInvert(mask, vis, seen2, W, H, i);
      comps.push(c);
    }
  }
  return comps;
}
function floodMaskInvert(mask, vis, seen2, W, H, start) {
  // 收集 !mask && !vis 的连通成分（即被包围的内部空洞）
  const stack = [start]; seen2[start] = 1; const ids = [];
  while (stack.length) {
    const i = stack.pop(); ids.push(i);
    const x = i % W, y = (i / W) | 0;
    const tries = [i - 1, i + 1, i - W, i + W];
    for (const n of tries) {
      if (!mask[n] && !vis[n] && !seen2[n] && n >= 0 && n < W * H) {
        const nx = n % W, ny = (n / W) | 0;
        if (Math.abs(nx - x) + Math.abs(ny - y) === 1) { seen2[n] = 1; stack.push(n); }
      }
    }
  }
  const xs = [], ys = [];
  for (const i of ids) { xs.push(i % W); ys.push((i / W) | 0); }
  return { ids, size: ids.length, bbox: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] };
}

function bboxOf(ids, W) {
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (const i of ids) { const x = i % W, y = (i / W) | 0; if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
  return [x0, y0, x1, y1];
}

function pct(bb, W, H) { return [P1(bb[0] / W * 100), P1(bb[1] / H * 100), P1(bb[2] / W * 100), P1(bb[3] / H * 100)]; }

// ---------- 分析 1: 棋盘格预览（透明=精确匹配两种棋盘色） ----------
const CA = 210, CB = 150;
function previewOpaque(d, W, H) {
  const mask = new Uint8Array(W * H);
  for (let i = 0, p = 0; i < W * H; i++, p += 4) {
    const r = d[p], g = d[p + 1], b = d[p + 2];
    const isChecker = (r === CA && g === CA && b === CA) || (r === CB && g === CB && b === CB);
    mask[i] = isChecker ? 0 : 1;
  }
  return mask;
}

function analyzePreview(file, name) {
  const { width: W, height: H, pixels } = P(file);
  const mask = previewOpaque(pixels, W, H);
  const nOpaque = mask.reduce((s, v) => s + v, 0);
  const topIdx = mask.findIndex((v) => v === 1);
  const topComp = topIdx >= 0 ? floodMask(mask, W, H, topIdx) : null;
  const holes = holesIn(mask, W, H);
  // 底部不透明成分（从底行出发）
  let bottomStart = -1;
  for (let x = 0; x < W; x++) if (mask[(H - 1) * W + x]) { bottomStart = (H - 1) * W + x; break; }
  const bottomComp = bottomStart >= 0 ? floodMask(mask, W, H, bottomStart) : null;
  const topBbox = topComp ? bboxOf(topComp.ids, W) : null;
  const bottomBbox = bottomComp ? bboxOf(bottomComp.ids, W) : null;
  // 蓝色边缘检测
  let edgePx = 0, blueEdge = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (!mask[i]) continue;
    const isEdge = (x > 0 && !mask[i - 1]) || (x < W - 1 && !mask[i + 1]) || (y > 0 && !mask[i - W]) || (y < H - 1 && !mask[i + W]);
    if (isEdge) {
      edgePx++;
      const p = (y * W + x) * 4;
      if (pixels[p + 2] - pixels[p] > 30 && pixels[p + 2] - pixels[p + 1] > 30) blueEdge++;
    }
  }
  // 行不透明数曲线（抽样 21 行）
  const profile = [];
  for (let k = 0; k <= 20; k++) {
    const y = Math.min(H - 1, Math.round(k * (H - 1) / 20));
    let c = 0; for (let x = 0; x < W; x++) c += mask[y * W + x];
    profile.push([P1(k * 5), c]);
  }
  const res = { name, W, H, opaquePx: nOpaque, opaquePct: P2(nOpaque / (W * H) * 100) };
  if (topBbox) res.topCompBbox_px = topBbox, res.topCompBbox_pct = pct(topBbox, W, H);
  if (bottomBbox) res.bottomCompBbox_px = bottomBbox, res.bottomCompBbox_pct = pct(bottomBbox, W, H);
  if (topComp && bottomComp) {
    // 顶成分是否包含底部区域（说明一体）
    let below60 = 0;
    for (const i of topComp.ids) if ((i / W | 0) > H * 0.6) below60++;
    res.topComp_mergedWithBottom = below60 > 100;
  }
  res.holes = holes.filter((h) => h.size > 8).map((h) => ({ px: h.bbox, pct: pct(h.bbox, W, H), size: h.size }));
  res.edge = { edgePx, blueEdgePct: P2(edgePx ? blueEdge / edgePx * 100 : 0) };
  res.rowProfile = profile;
  return res;
}

// ---------- 分析 2: 抠图成品（真实 alpha） ----------
function analyzeCutout(file, name, alphaTh) {
  const { width: W, height: H, pixels } = P(file);
  const mask = new Uint8Array(W * H);
  for (let i = 0, p = 3; i < W * H; i++, p += 4) mask[i] = pixels[p] >= alphaTh ? 1 : 0;
  const nOpaque = mask.reduce((s, v) => s + v, 0);
  const topIdx = mask.findIndex((v) => v === 1);
  const topComp = topIdx >= 0 ? floodMask(mask, W, H, topIdx) : null;
  const holes = holesIn(mask, W, H);
  let bottomStart = -1;
  for (let x = 0; x < W; x++) if (mask[(H - 1) * W + x]) { bottomStart = (H - 1) * W + x; break; }
  const bottomComp = bottomStart >= 0 ? floodMask(mask, W, H, bottomStart) : null;
  const topBbox = topComp ? bboxOf(topComp.ids, W) : null;
  const bottomBbox = bottomComp ? bboxOf(bottomComp.ids, W) : null;
  // subject = 不透明 - 底部成分
  let subjectBottomY = -1;
  if (bottomComp && topComp) {
    const botSet = new Set(bottomComp.ids);
    subjectBottomY = -1;
    for (const i of topComp.ids) if (!botSet.has(i)) { const y = (i / W) | 0; if (y > subjectBottomY) subjectBottomY = y; }
  }
  // 多阈值 bbox
  const bboxes = {};
  for (const t of [48, 128, 200]) {
    const m = new Uint8Array(W * H);
    for (let i = 0, p = 3; i < W * H; i++, p += 4) m[i] = pixels[p] >= t ? 1 : 0;
    let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1, cnt = 0;
    for (let i = 0; i < W * H; i++) if (m[i]) { cnt++; const x = i % W, y = (i / W) | 0; if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
    if (cnt) bboxes[t] = { px: [x0, y0, x1, y1], pct: pct([x0, y0, x1, y1], W, H) };
  }
  const res = { name, W, H, alphaTh, opaquePx: nOpaque, opaquePct: P2(nOpaque / (W * H) * 100), bboxes };
  res.holes = holes.filter((h) => h.size > 8).map((h) => ({ px: h.bbox, pct: pct(h.bbox, W, H), size: h.size }));
  if (topBbox) res.topCompBbox_px = topBbox, res.topCompBbox_pct = pct(topBbox, W, H);
  if (bottomBbox) res.bottomCompBbox_px = bottomBbox, res.bottomCompBbox_pct = pct(bottomBbox, W, H);
  if (bottomComp) res.bottomCompSize_pct = P2(bottomComp.ids.length / (W * H) * 100);
  if (subjectBottomY >= 0) {
    res.subjectBottomY_px = subjectBottomY;
    res.subjectBottomGapPct = P1((H - 1 - subjectBottomY) / H * 100);
  }
  if (name.includes('zhengzha')) {
    // 行 alpha>=128 数曲线
    const profile = [];
    for (let k = 0; k <= 20; k++) {
      const y = Math.min(H - 1, Math.round(k * (H - 1) / 20));
      let c = 0; for (let x = 0; x < W; x++) c += mask[y * W + x];
      profile.push([P1(k * 5), c]);
    }
    res.rowProfile = profile;
    // 蓝色边缘
    let edgePx = 0, blueEdge = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (!mask[i]) continue;
      const isEdge = (x > 0 && !mask[i - 1]) || (x < W - 1 && !mask[i + 1]) || (y > 0 && !mask[i - W]) || (y < H - 1 && !mask[i + W]);
      if (isEdge) {
        edgePx++;
        const p = (y * W + x) * 4;
        if (pixels[p + 2] - pixels[p] > 30 && pixels[p + 2] - pixels[p + 1] > 30) blueEdge++;
      }
    }
    res.edge = { edgePx, blueEdgePct: P2(edgePx ? blueEdge / edgePx * 100 : 0) };
  }
  return res;
}

// ---------- 分析 3: 黑底原图 ----------
function bgStats(d, W, H) {
  // 四个角的平均色
  let r = 0, g = 0, b = 0, n = 0;
  for (const [cx, cy] of [[2, 2], [W - 3, 2], [2, H - 3], [W - 3, H - 3]]) {
    const p = (cy * W + cx) * 4;
    r += d[p]; g += d[p + 1]; b += d[p + 2]; n++;
  }
  return { r: Math.round(r / n), g: Math.round(g / n), b: Math.round(b / n) };
}

function analyzeRaw(file, name, cutInfo) {
  const { width: W, height: H, pixels } = P(file);
  const bg = bgStats(pixels, W, H);
  const bgLum = 0.299 * bg.r + 0.587 * bg.g + 0.114 * bg.b;
  const thresh = Math.max(bgLum + 12, 20);
  const content = new Uint8Array(W * H);
  let cnt = 0;
  for (let i = 0, p = 0; i < W * H; i++, p += 4) {
    if (lum(pixels, p) > thresh) { content[i] = 1; cnt++; }
  }
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (let i = 0; i < W * H; i++) if (content[i]) { const x = i % W, y = (i / W) | 0; if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
  const holes = holesIn(content, W, H).filter((h) => h.size > 20).map((h) => ({ px: h.bbox, pct: pct(h.bbox, W, H), size: h.size }));
  const res = { name, W, H, bgColor: bg, contentThresh: P1(thresh), contentPx: cnt, contentPct: P2(cnt / (W * H) * 100) };
  if (x0 !== 1e9) { res.contentBbox_px = [x0, y0, x1, y1]; res.contentBbox_pct = pct([x0, y0, x1, y1], W, H); }
  res.interiorEmptyPockets = holes; // 原图中被内容包围的纯黑空洞（生成时就没内容）
  // 在抠图洞区域里查原图是否有内容 → 判断生成 vs 抠图缺陷
  if (cutInfo && cutInfo.holes.length) {
    res.holeContentCheck = [];
    for (const h of cutInfo.holes) {
      const [hx0, hy0, hx1, hy1] = h.px;
      let strong = 0, faint = 0, bgLike = 0, total = 0;
      for (let y = hy0; y <= hy1; y++) for (let x = hx0; x <= hx1; x++) {
        if (x >= W || y >= H) continue;
        const l = lum(pixels, (y * W + x) * 4);
        total++;
        if (l > thresh) strong++; else if (l > Math.max(bgLum + 4, 8)) faint++; else bgLike++;
      }
      res.holeContentCheck.push({ cutHole: h, strong, faint, bgLike, total });
    }
  }
  return res;
}

// ---------- 主流程 ----------
const out = {};
const cutHunter = analyzeCutout(FILES.cutHunter, 'cut_enemy_hunter', 48);
const cutZhengzha = analyzeCutout(FILES.cutZhengzha, 'cut_pc_zhengzha', 48);
out.cutHunter = cutHunter;
out.cutZhengzha = cutZhengzha;
out.previewHunter = analyzePreview(FILES.previewHunter, 'preview_hunter');
out.previewZhengzha = analyzePreview(FILES.previewZhengzha, 'preview_zhengzha');
out.rawHunter = analyzeRaw(FILES.rawHunter, 'raw_hunter', cutHunter);
out.rawZhengzha = analyzeRaw(FILES.rawZhengzha, 'raw_zhengzha', null);

// zhengzha 原图的光晕分析：亮像素（高亮度蓝白）分布
{
  const { width: W, height: H, pixels } = P(FILES.rawZhengzha);
  const bright = new Uint8Array(W * H);
  let brightCnt = 0;
  for (let i = 0, p = 0; i < W * H; i++, p += 4) {
    const l = lum(pixels, p);
    if (l > 110) { bright[i] = 1; brightCnt++; }
  }
  let bx0 = 1e9, by0 = 1e9, bx1 = -1, by1 = -1;
  for (let i = 0; i < W * H; i++) if (bright[i]) { const x = i % W, y = (i / W) | 0; if (x < bx0) bx0 = x; if (y < by0) by0 = y; if (x > bx1) bx1 = x; if (y > by1) by1 = y; }
  const profile = [];
  for (let k = 0; k <= 20; k++) {
    const y = Math.min(H - 1, Math.round(k * (H - 1) / 20));
    let c = 0; for (let x = 0; x < W; x++) c += bright[y * W + x];
    profile.push([P1(k * 5), c]);
  }
  out.rawZhengzha.bright = { count: brightCnt, pct: P2(brightCnt / (W * H) * 100), bbox_px: [bx0, by0, bx1, by1], bbox_pct: pct([bx0, by0, bx1, by1], W, H), rowProfile: profile };
  // 从底部向上找光晕起点：连续 3 行 bright 行占比 >2% 的第一行
  let haloTopY = -1;
  for (let y = H - 1; y >= 0; y--) {
    let c = 0; for (let x = 0; x < W; x++) c += bright[y * W + x];
    if (c > W * 0.02) { haloTopY = y; }
    else if (haloTopY > 0) break;
  }
  out.rawZhengzha.haloTopY = haloTopY;
  out.rawZhengzha.haloStartPct = P1((haloTopY / H) * 100);
}

fs.writeFileSync(path.join(BASE, 'tools/design/ox_material_triage_analysis.json'), JSON.stringify(out, null, 2), 'utf8');
console.log(JSON.stringify(out, null, 2));