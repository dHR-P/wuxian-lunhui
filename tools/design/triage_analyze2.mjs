// triage_analyze2.mjs — 第二轮像素分析
// 1) hunter 抠图: 主体 bbox 内部全部 alpha<30 区域(不论是否连通到外部), 并对照 raw 内容
// 2) hunter raw: 这些区域内的内容像素统计 → 判生成 vs 抠图缺陷
// 3) zhengzha 抠图: alpha>=128 连通成分 → 主体成分(含头部) vs 底部光晕块; 是否合并; 底部块上边界 y%
// 4) zhengzha raw: 靴子(暗色内容) 与下方光晕(亮蓝白) 分离度; 靴底 y%; 光晕块范围
// 5) preview_zhengzha: 成分化重构, 主体 bbox / 底部光晕块 bbox / 是否合并 / 蓝色边缘占比
import fs from 'node:fs';
import zlib from 'node:zlib';
import path from 'node:path';

const BASE = 'C:/Users/GWL/Desktop/itwillclaude/games/wuxian-horror-ch1';
const D = (...p) => path.join(BASE, ...p);

function decodePNG(buf) {
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
  if (interlace !== 0 || bitDepth !== 8) throw new Error('unsupported png fmt');
  const ch = colorType === 6 ? 4 : colorType === 2 ? 3 : 1;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * ch;
  const out = Buffer.alloc(width * height * 4);
  const paeth = (a, b, c) => { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); return pa <= pb && pa <= pc ? a : pb <= pc ? b : c; };
  let pos = 0; const prev = Buffer.alloc(stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[pos++];
    const cur = Buffer.from(raw.subarray(pos, pos + stride)); pos += stride;
    if (filter === 1) { for (let i = ch; i < stride; i++) cur[i] = (cur[i] + cur[i - ch]) & 0xff; }
    else if (filter === 2) { for (let i = 0; i < stride; i++) cur[i] = (cur[i] + prev[i]) & 0xff; }
    else if (filter === 3) { for (let i = 0; i < stride; i++) { const a = i < ch ? 0 : cur[i - ch]; cur[i] = (cur[i] + ((a + prev[i]) >> 1)) & 0xff; } }
    else if (filter === 4) { for (let i = 0; i < stride; i++) { const a = i < ch ? 0 : cur[i - ch], b = prev[i], c = i < ch ? 0 : prev[i - ch]; cur[i] = (cur[i] + paeth(a, b, c)) & 0xff; } }
    for (let x = 0; x < width; x++) {
      const o = x * ch, d = (y * width + x) * 4;
      if (colorType === 6) { out[d] = cur[o]; out[d + 1] = cur[o + 1]; out[d + 2] = cur[o + 2]; out[d + 3] = cur[o + 3]; }
      else if (colorType === 2) { out[d] = cur[o]; out[d + 1] = cur[o + 1]; out[d + 2] = cur[o + 2]; out[d + 3] = 255; }
      else { out[d] = cur[o]; out[d + 1] = cur[o]; out[d + 2] = cur[o]; out[d + 3] = 255; }
    }
    prev.set(cur);
  }
  return { width, height, pixels: out };
}
const P = (f) => decodePNG(fs.readFileSync(f));
const lum = (d, i) => 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
const R1 = (x) => Math.round(x * 10) / 10;

function components(mask, W, H) {
  // 返回所有 4-连通成分 {ids,size,bbox}
  const seen = new Uint8Array(W * H);
  const comps = [];
  for (let i = 0; i < W * H; i++) {
    if (!mask[i] || seen[i]) continue;
    const stack = [i]; seen[i] = 1; const ids = [];
    while (stack.length) {
      const j = stack.pop(); ids.push(j);
      const x = j % W, y = (j / W) | 0;
      const nb = [];
      if (x > 0) nb.push(j - 1);
      if (x < W - 1) nb.push(j + 1);
      if (y > 0) nb.push(j - W);
      if (y < H - 1) nb.push(j + W);
      for (const n of nb) if (mask[n] && !seen[n]) { seen[n] = 1; stack.push(n); }
    }
    let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    for (const j of ids) { const x = j % W, y = (j / W) | 0; if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
    comps.push({ ids, size: ids.length, bbox: [x0, y0, x1, y1] });
  }
  return comps;
}
const pctOf = (bb, W, H) => [R1(bb[0] / W * 100), R1(bb[1] / H * 100), R1(bb[2] / W * 100), R1(bb[3] / H * 100)];

const out = {};

// ---------- 1) hunter 抠图: bbox 内部 alpha<30 大区域 ----------
{
  const { width: W, height: H, pixels } = P(D('server-rs/ui/assets/img/enemy_hunter.png'));
  const subj = { x0: 169, y0: 15, x1: 597, y1: 954 }; // 主体 alpha>=48 bbox
  const MARGIN = 20;
  const low = new Uint8Array(W * H); // alpha<30 且位于主体 bbox 内部(缩边)
  for (let y = subj.y0 + MARGIN; y <= subj.y1 - MARGIN; y++) {
    for (let x = subj.x0 + MARGIN; x <= subj.x1 - MARGIN; x++) {
      const i = y * W + x;
      if (pixels[i * 4 + 3] < 30) low[i] = 1;
    }
  }
  const comps = components(low, W, H).filter((c) => c.size > 200).sort((a, b) => b.size - a.size);
  out.cutHunter_bigInteriorTransparent = comps.map((c) => ({
    px: c.bbox, pct: pctOf(c.bbox, W, H), size: c.size,
  })).slice(0, 12);
  // 每个大区域: raw 内容对照 (raw hunter)
  const raw = P(D('tools/design/raw_enemy/hunter.png'));
  const bg = { r: 0, g: 0, b: 0 };
  const thresh = 20;
  out.cutHunter_rawContentInHoles = comps.slice(0, 6).map((c) => {
    const [x0, y0, x1, y1] = c.bbox;
    let strong = 0, faint = 0, bgLike = 0, total = 0;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (x >= W || y >= H) continue;
      const l = lum(raw.pixels, (y * W + x) * 4);
      total++;
      if (l > thresh) strong++; else if (l > 8) faint++; else bgLike++;
    }
    return { pct: pctOf(c.bbox, W, H), strong, faint, bgLike, total };
  });
  // raw 在该区域的内容 bbox
  const rawContent = new Uint8Array(W * H);
  for (let i = 0, p = 0; i < W * H; i++, p += 4) if (lum(raw.pixels, p) > thresh) rawContent[i] = 1;
  const rawComps = components(rawContent, W, H).filter((c) => c.size > 500).sort((a, b) => b.size - a.size);
  out.rawHunter_bigContentComps = rawComps.slice(0, 8).map((c) => ({ px: c.bbox, pct: pctOf(c.bbox, W, H), size: c.size }));
}

// ---------- 3) zhengzha 抠图: 成分化 ----------
{
  const { width: W, height: H, pixels } = P(D('server-rs/ui/assets/img/pc_zhengzha.png'));
  const mask = new Uint8Array(W * H);
  for (let i = 0, p = 3; i < W * H; i++, p += 4) mask[i] = pixels[p] >= 128 ? 1 : 0;
  const comps = components(mask, W, H).sort((a, b) => b.size - a.size);
  out.cutZhengzha_components = comps.slice(0, 6).map((c) => ({
    px: c.bbox, pct: pctOf(c.bbox, W, H), size: c.size, areaPct: R1(c.size / (W * H) * 100),
  }));
  // 主体成分 = 含头部附近像素 (x≈390,y≈100) 的成分; 底部光晕 = y 中心 > 0.75H 的最大成分
  const headIdx = (100 * W + 390);
  const headComp = comps.find((c) => c.ids.includes(headIdx));
  if (headComp) {
    out.cutZhengzha_headComponent = { px: headComp.bbox, pct: pctOf(headComp.bbox, W, H), size: headComp.size };
    // 主体成分里 y>0.6H 的像素数
    let below60 = 0, below75 = 0;
    for (const j of headComp.ids) { const y = (j / W) | 0; if (y > H * 0.6) below60++; if (y > H * 0.75) below75++; }
    out.cutZhengzha_headComp_extent = { below60: R1(below60 / headComp.size * 100), below75: R1(below75 / headComp.size * 100) };
  }
  // 底部光晕块: 不包含头部的最大成分
  const other = comps.filter((c) => c !== headComp);
  const bottom = other.filter((c) => (c.bbox[1] + c.bbox[3]) / 2 > H * 0.7).sort((a, b) => b.size - a.size)[0];
  if (bottom) out.cutZhengzha_bottomBlock = { px: bottom.bbox, pct: pctOf(bottom.bbox, W, H), size: bottom.size };
  // 蓝色边缘
  let edgePx = 0, blueEdge = 0, edgeTopHalfBlue = 0, edgeTopHalf = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (!mask[i]) continue;
    const isEdge = (x > 0 && !mask[i - 1]) || (x < W - 1 && !mask[i + 1]) || (y > 0 && !mask[i - W]) || (y < H - 1 && !mask[i + W]);
    if (!isEdge) continue;
    edgePx++;
    const p = i * 4;
    const blueD = pixels[p + 2] - Math.max(pixels[p], pixels[p + 1]);
    if (blueD > 40) blueEdge++;
    if (y < H * 0.55) { edgeTopHalf++; if (blueD > 40) edgeTopHalfBlue++; }
  }
  out.cutZhengzha_edge = { edgePx, blueEdgePct: R1(edgePx ? blueEdge / edgePx * 100 : 0), top55BluePct: R1(edgeTopHalf ? edgeTopHalfBlue / edgeTopHalf * 100 : 0) };
  // 黑色衣服区域 alpha 是否保留: 检查 raw 的暗口袋(黑T恤)区域在抠图里的 alpha
  const pockets = [[355, 161, 409, 247], [229, 405, 250, 524], [351, 656, 362, 711], [501, 770, 508, 794]];
  out.cutZhengzha_blackClothesAlpha = pockets.map(([x0, y0, x1, y1]) => {
    let n = 0; const hist = [0, 0, 0, 0]; // <30, 30-95, 96-191, >=192
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const a = pixels[(y * W + x) * 4 + 3]; n++;
      if (a < 30) hist[0]++; else if (a < 96) hist[1]++; else if (a < 192) hist[2]++; else hist[3]++;
    }
    return { px: [x0, y0, x1, y1], pct: pctOf([x0, y0, x1, y1], W, H), alphaHist: hist, n };
  });
}

// ---------- 4) zhengzha raw: 靴子与光晕 ----------
out.rawZhengzha = {};
{
  const { width: W, height: H, pixels } = P(D('tools/design/raw_enemy/pc_zhengzha.png'));
  // 亮(蓝白) 掩码 lum>110
  const bright = new Uint8Array(W * H);
  for (let i = 0, p = 0; i < W * H; i++, p += 4) if (lum(pixels, p) > 110) bright[i] = 1;
  // 暗内容掩码(非背景, 亮度 16..110): 靴子/暗衣物
  const dark = new Uint8Array(W * H);
  for (let i = 0, p = 0; i < W * H; i++, p += 4) { const l = lum(pixels, p); if (l > 16 && l <= 110) dark[i] = 1; }
  const brightComps = components(bright, W, H).sort((a, b) => b.size - a.size);
  out.rawZhengzha_brightComps = brightComps.slice(0, 5).map((c) => ({ px: c.bbox, pct: pctOf(c.bbox, W, H), size: c.size }));
  // 靴子: 在中间列带 x∈[330,450] 找最下方的暗内容像素(严格非亮)
  let bootY = -1, bootX = -1;
  for (let y = H - 1; y >= 0 && bootY < 0; y--) {
    for (let x = 330; x <= 450; x++) {
      const i = y * W + x;
      if (dark[i] && !bright[i]) { bootY = y; bootX = x; break; }
    }
  }
  out.rawZhengzha.boot = bootY >= 0 ? { px: [bootX, bootY], yPct: R1(bootY / H * 100), gapToBottomPct: R1((H - 1 - bootY) / H * 100) } : null;
  // 光晕在中间列带的竖向范围: 亮像素从哪一行开始(下→上 连续)
  let gTop = -1, gBottom = -1;
  for (let y = H - 1; y >= 0; y--) {
    let c = 0; for (let x = 200; x <= 568; x++) c += bright[y * W + x];
    if (c > 0 && gBottom < 0) gBottom = y;
    if (c === 0 && gBottom >= 0) { gTop = y + 1; break; }
  }
  out.rawZhengzha.glowVertical = gBottom >= 0 ? { topY: gTop, bottomY: gBottom, topPct: R1(gTop / H * 100), bottomPct: R1(gBottom / H * 100) } : null;
}

// ---------- 5) preview_zhengzha: 成分化 ----------
{
  const { width: W, height: H, pixels } = P(D('tools/design/preview_enemy/preview_enemy_pc_zhengzha.png'));
  const mask = new Uint8Array(W * H);
  for (let i = 0, p = 0; i < W * H; i++, p += 4) {
    const r = pixels[p], g = pixels[p + 1], b = pixels[p + 2];
    const isChecker = (r === 210 && g === 210 && b === 210) || (r === 150 && g === 150 && b === 150);
    mask[i] = isChecker ? 0 : 1;
  }
  const comps = components(mask, W, H).sort((a, b) => b.size - a.size);
  out.previewZhengzha_components = comps.slice(0, 6).map((c) => ({ px: c.bbox, pct: pctOf(c.bbox, W, H), size: c.size, areaPct: R1(c.size / (W * H) * 100) }));
  const headIdx = (40 * W + 192);
  const headComp = comps.find((c) => c.ids.includes(headIdx));
  if (headComp) out.previewZhengzha_headComponent = { px: headComp.bbox, pct: pctOf(headComp.bbox, W, H), size: headComp.size };
  const others = comps.filter((c) => c !== headComp && (c.bbox[1] + c.bbox[3]) / 2 > H * 0.6);
  if (others.length) {
    const bottom = others.sort((a, b) => b.size - a.size)[0];
    out.previewZhengzha_bottomBlobs = others.slice(0, 5).map((c) => ({ px: c.bbox, pct: pctOf(c.bbox, W, H), size: c.size }));
    const _b = bottom;
    out.previewZhengzha_bottomBlock = { px: _b.bbox, pct: pctOf(_b.bbox, W, H), size: _b.size };
  }
  // 蓝色边缘(轮廓光) 上半身
  let edgePx = 0, blueEdge = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (!mask[i]) continue;
    const isEdge = (x > 0 && !mask[i - 1]) || (x < W - 1 && !mask[i + 1]) || (y > 0 && !mask[i - W]) || (y < H - 1 && !mask[i + W]);
    if (!isEdge) continue;
    edgePx++;
    const p = i * 4;
    const blueD = pixels[p + 2] - Math.max(pixels[p], pixels[p + 1]);
    if (blueD > 40) blueEdge++;
  }
  out.previewZhengzha_edge = { edgePx, blueEdgePct: R1(edgePx ? blueEdge / edgePx * 100 : 0) };
}

fs.writeFileSync(D('tools/design/ox_material_triage_analysis2.json'), JSON.stringify(out, null, 2), 'utf8');
console.log(JSON.stringify(out, null, 2));