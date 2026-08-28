/* 无限轮回 · WebView 客户端：渲染 Rust 引擎返回的视图 + 打字机/WebAudio/过场 */
"use strict";

const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* ---------------- 分辨率 / HiDPI ----------------
 * 三档渲染目标(逻辑分辨率 CSS 像素) + DPR 物理像素:
 *   720  -> 1280x720,  1080 -> 1920x1080,  1440 -> 2560x1440
 * 物理像素 = 逻辑分辨率 × devicePixelRatio，保证高清屏不模糊。
 * 对外契约: window.setResolution(level) / window.getResolution()（新增，可调用）。
 * 不改任何 Tauri invoke / DSH_BOOT / window.World2D / window.Zone3D 交互契约。
 */
const ResolutionSys = (() => {
  let level = 1080;                            // 当前档位（默认自适应/1080p）
  const TARGET = { 720: [1280, 720], 1080: [1920, 1080], 1440: [2560, 1440] };
  const dpr = () => (window.devicePixelRatio || 1);
  // 当前逻辑分辨率（CSS 像素）
  function logical() { return TARGET[level] || [innerWidth, innerHeight]; }
  // 当前物理渲染分辨率（逻辑 × DPR，向上取整避免 0）
  function physical() {
    const [w, h] = logical();
    return [Math.max(1, Math.round(w * dpr())), Math.max(1, Math.round(h * dpr()))];
  }
  function apply() {
    // 1) 噪点层：改回窗口全分辨率 × DPR（去掉原 1/3 降采样），由 grainResize 承接
    if (typeof grainResize === "function") grainResize();
    // 2) 2D 地图：把 DPR 交给 World2D，让其 HiDPI 清晰显示
    if (window.World2D && typeof window.World2D.setDpr === "function") window.World2D.setDpr(dpr());
    // 3) 3D 副本：把档位+物理尺寸交给 Zone3D（setPixelRatio + 渲染尺寸）
    if (window.Zone3D && typeof window.Zone3D.setResolution === "function") window.Zone3D.setResolution(level);
    // 4) 更新标题屏分辨率选择高亮（若 UI 存在）
    if (window.__resUI) window.__resUI(level);
  }
  function set(levelIn) {
    if (TARGET[levelIn]) level = levelIn;
    apply();
    return level;
  }
  return {
    set, get: () => level, dpr, logical, physical, apply,
  };
})();
window.setResolution = l => ResolutionSys.set(l);
window.getResolution = () => ResolutionSys.get();

/* ---------------- Tauri IPC ---------------- */
function TAURI_INVOKE() {
  return window.__TAURI__.core.invoke;
}

/* ---------------- 音频（WebAudio 合成）---------------- */
const AudioSys = {
  ctx: null, droneNodes: [], droneMaster: null, heartTimer: null,
  ensure() {
    if (!this.ctx) { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { } }
    if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
  },
  drone(mood) {
    this.ensure(); if (!this.ctx) return;
    this.droneStop();
    const c = this.ctx;
    const g = c.createGain(); g.gain.value = 0; g.connect(c.destination);
    const filt = c.createBiquadFilter(); filt.type = "lowpass";
    filt.frequency.value = mood === "danger" ? 320 : 180; filt.connect(g);
    (mood === "danger" ? [46, 61] : [38, 57]).forEach((f, i) => {
      const o = c.createOscillator(); o.type = i ? "triangle" : "sawtooth";
      o.frequency.value = f; o.detune.value = Math.floor(Math.random() * 16 - 8);
      o.connect(filt); o.start(); this.droneNodes.push(o);
    });
    const buf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * .25;
    const ns = c.createBufferSource(); ns.buffer = buf; ns.loop = true;
    const ng = c.createGain(); ng.gain.value = mood === "danger" ? .05 : .02;
    ns.connect(ng); ng.connect(filt); ns.start(); this.droneNodes.push(ns);
    g.gain.linearRampToValueAtTime(.16, c.currentTime + 2);
    this.droneMaster = g;
  },
  droneStop() {
    if (this.droneMaster) { try { this.droneMaster.gain.linearRampToValueAtTime(0, this.ctx.currentTime + .6); } catch (e) {} }
    const nodes = this.droneNodes; this.droneNodes = [];
    setTimeout(() => nodes.forEach(n => { try { n.stop(); } catch (e) {} }), 700);
  },
  heartbeat(on) {
    if (this.heartTimer) { clearInterval(this.heartTimer); this.heartTimer = null; }
    if (!on) return;
    const thump = () => {
      this.ensure(); if (!this.ctx) return;
      const c = this.ctx, o = c.createOscillator(), g = c.createGain();
      o.type = "sine"; o.frequency.setValueAtTime(58, c.currentTime);
      o.frequency.exponentialRampToValueAtTime(30, c.currentTime + .18);
      g.gain.setValueAtTime(.5, c.currentTime);
      g.gain.exponentialRampToValueAtTime(.001, c.currentTime + .22);
      o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + .24);
    };
    thump(); setTimeout(thump, 260);
    this.heartTimer = setInterval(() => { thump(); setTimeout(thump, 260); }, 1150);
  },
  sfx(kind) {
    this.ensure(); if (!this.ctx) return;
    try {
      const c = this.ctx, t = c.currentTime;
      const o = c.createOscillator(), g = c.createGain();
      o.connect(g); g.connect(c.destination);
      if (kind === "laser") {
        o.type = "sawtooth"; o.frequency.setValueAtTime(1400, t);
        o.frequency.exponentialRampToValueAtTime(90, t + .5);
        g.gain.setValueAtTime(.28, t); g.gain.exponentialRampToValueAtTime(.001, t + .55);
        o.start(t); o.stop(t + .6);
      } else if (kind === "hit") {
        o.type = "square"; o.frequency.setValueAtTime(160, t);
        o.frequency.exponentialRampToValueAtTime(40, t + .12);
        g.gain.setValueAtTime(.3, t); g.gain.exponentialRampToValueAtTime(.001, t + .14);
        o.start(t); o.stop(t + .15);
      } else {
        o.type = "sine"; o.frequency.value = 720;
        g.gain.setValueAtTime(.12, t); g.gain.exponentialRampToValueAtTime(.001, t + .07);
        o.start(t); o.stop(t + .08);
      }
    } catch (e) { /* 音频失败绝不阻断游戏逻辑 */ }
  },
  voice(file) {
    if (!file) return;
    try { if (this._v) this._v.pause(); this._v = new Audio("assets/audio/" + file); this._v.volume = .95; this._v.play().catch(() => {}); } catch (e) {}
  },
};

/* ---------------- 打字机 ---------------- */
const TW = { timer: null, full: "", done: false, cb: null };
function typewrite(el, html, cb) {
  clearTimeout(TW.timer);
  TW.full = html; TW.done = false; TW.cb = cb || null; TW.pos = 0;
  const tokens = []; let tag = "", text = "";
  for (let i = 0; i < html.length; i++) {
    const ch = html[i];
    if (ch === "<") { if (text) { tokens.push({ t: "x", v: text }); text = ""; } tag += ch; }
    else if (ch === ">") { tag += ch; tokens.push({ t: "g", v: tag }); tag = ""; }
    else if (tag) tag += ch; else text += ch;
  }
  if (text) tokens.push({ t: "x", v: text });
  el.innerHTML = ""; el.classList.add("cursorBlink");
  let out = "";
  function step() {
    if (TW.done) return;
    let budget = 2;
    while (budget > 0 && TW.pos < tokens.length) {
      const tk = tokens[TW.pos];
      if (tk.t === "g") { out += tk.v; TW.pos++; continue; }
      if (tk.v.length <= budget) { out += tk.v; budget -= tk.v.length; TW.pos++; }
      else { out += tk.v.slice(0, budget); tk.v = tk.v.slice(budget); budget = 0; }
    }
    el.innerHTML = out;
    $("narrBox").scrollTop = $("narrBox").scrollHeight;
    if (TW.pos >= tokens.length) {
      el.classList.remove("cursorBlink"); TW.done = true;
      const cb = TW.cb; TW.cb = null; cb && cb();
    } else TW.timer = setTimeout(step, 26);
  }
  step();
}
function skipType() {
  if (!TW.done) {
    TW.done = true; clearTimeout(TW.timer);
    $("narrText").innerHTML = TW.full;
    $("narrText").classList.remove("cursorBlink");
    const cb = TW.cb; TW.cb = null; cb && cb();
  }
}
$("narrBox").addEventListener("click", () => skipType());

/* ---------------- 背景 / HUD ---------------- */
let bgFlip = false;
function showBg(imgFile, locName) {
  if (!imgFile) return;
  const a = $("bgA"), b = $("bgB");
  const next = bgFlip ? a : b, cur = bgFlip ? b : a;
  next.style.backgroundImage = `url('assets/img/${imgFile}')`;
  next.classList.add("show"); cur.classList.remove("show");
  bgFlip = !bgFlip;
  $("locName").textContent = locName || "";
}
function refreshHud(hud) {
  if (!hud) return;
  // Bug-06:zone 战斗可能只有部分字段(如仅 hp),全部兜底,避免 undefined/NaN 写入 UI
  const hp = +hud.hp || 0, san = +hud.san || 0;
  $("hpFill").style.width = clamp(hp, 0, 100) + "%";
  $("sanFill").style.width = clamp(san, 0, 100) + "%";
  $("hpVal").textContent = hud.hp ?? 0;
  $("sanVal").textContent = hud.san ?? 0;
  $("ptsVal").textContent = hud.points ?? 0;
  const wpn = hud.weapon ?? "—";
  $("wpnVal").textContent = wpn + (wpn === "9mm手枪" ? `(${hud.ammo ?? 0})` : "");
  // P1 点数消费：已兑换强化/血统在 HUD 上的轻量提示
  let enhStr = "";
  if (hud.bloodline === "vampire") enhStr += "🩸吸血鬼 ";
  if ((hud.strBonus ?? 0) > 0) enhStr += `体质+${hud.strBonus} `;
  if ((hud.agiBonus ?? 0) > 0) enhStr += `敏捷+${hud.agiBonus}`;
  const enhEl = $("enhanceVal");
  if (enhStr.trim()) { enhEl.textContent = enhStr.trim(); enhEl.style.display = "inline"; }
  else { enhEl.style.display = "none"; }
  // 包 C HUD 扩展：真气 / 护盾 / 基因阶 / 修为境界 / 技能数 —— 字段缺省则隐藏（容错，不破坏现有刷新）
  const setHudField = (wrapId, valElId, exists, text) => {
    const wrap = $(wrapId), val = $(valElId);
    if (!wrap || !val) return;
    if (exists && text !== "") { val.textContent = text; wrap.style.display = "inline-flex"; }
    else { wrap.style.display = "none"; }
  };
  const qiMax = hud.qiMax ?? 0;
  setHudField("hudQi", "qiVal", (hud.qi ?? 0) > 0 || qiMax > 0, `${hud.qi ?? 0}/${qiMax}`);
  const shieldMax = hud.techShieldMax ?? 0;
  setHudField("hudShield", "shieldVal", shieldMax > 0, `${hud.techShield ?? 0}/${shieldMax}`);
  const gs = hud.geneStage ?? 0;
  setHudField("hudGene", "geneVal", gs > 0, `${gs}阶`);
  const cs = hud.cultivationStage ?? 0;
  setHudField("hudCult", "cultVal", cs > 0, (hud.cultivationName && hud.cultivationName !== "") ? hud.cultivationName : `${cs}境`);
  const sc = hud.skillCount ?? 0;
  setHudField("hudSkill", "skillVal", sc > 0, `×${sc}`);
  const t = $("teamHud"); t.innerHTML = "";
  (hud.team || []).forEach(m => {
    const sp = document.createElement("span");
    sp.className = m.alive ? "alive" : "dead";
    sp.textContent = m.name;
    t.appendChild(sp); t.appendChild(document.createTextNode(" "));
  });
  document.body.classList.toggle("hurt", hp <= 30 && hp > 0);
  AudioSys.heartbeat(hp <= 35 && hp > 0);
}

/* ---------------- 视频过场 ---------------- */
function playCine(src, label) {
  return new Promise(resolve => {
    const w = $("cineWrap"), v = $("cineVid");
    $("cineTag").textContent = label || "MINIMAX H3 本地生成过场影像";
    w.classList.add("on");
    let ended = false;
    const done = () => {
      if (ended) return; ended = true;
      w.classList.remove("on"); try { v.pause(); } catch (e) {}
      resolve();
    };
    v.onended = done; v.onerror = done;
    v.src = "assets/video/" + src;
    v.play().catch(done);
    $("cineSkip").onclick = done;
  });
}

/* ---------------- 卡片覆盖层 ---------------- */
function showCard(card) {
  AudioSys.voice(card.voice);
  const el = $("ovCard");
  el.innerHTML = `<h2 class="${card.good ? "good" : ""}">${card.title}</h2>${card.body_html ?? card.bodyHtml ?? ""}`;
  const wrap = document.createElement("div");
  wrap.style.cssText = "display:flex;flex-direction:column;gap:10px;margin-top:22px;";
  card.buttons.forEach((b, idx) => {
    const btn = document.createElement("button");
    btn.className = "mbtn"; btn.textContent = b.label;
    btn.onclick = async () => {
      AudioSys.sfx("click");
      if (b.route === "__title__") { $("endOverlay").classList.remove("on"); backToTitle(); return; }
      if (b.route === "__card_nexus__") {
        const v = await TAURI_INVOKE()("api_nexus");
        showCard(v.card); return;
      }
      if (b.route === "__enter_nexus__") {
        // 结算/兑换后进入主神空间世界地图（P1）：api_nexus_enter 返回 world_view+hud
        $("endOverlay").classList.remove("on");
        setMode("world");
        try {
          const v = await TAURI_INVOKE()("api_nexus_enter");
          currentHud = v.hud;
          refreshHud(v.hud);
          if (v.w !== undefined) World2D.setData(v);
          worldMsg("你回到了主神空间。中央光柱下空无一人。");
        } catch (e) { worldMsg("进入主神空间失败: " + String(e)); }
        return;
      }
      if (b.route === "__back_to_world__") {
        $("endOverlay").classList.remove("on");
        await enterWorldKeep();
        return;
      }
      $("endOverlay").classList.remove("on");
      handleView(await TAURI_INVOKE()("api_choose", { index: idx }));
    };
    wrap.appendChild(btn);
  });
  el.appendChild(wrap);
  $("endOverlay").classList.add("on");
}
function backToTitle() {
  // Bug-08:先切回标题模式——统一隐藏 world/zone/story、停掉两个引擎并清键位
  setMode("title");
  $("story").style.display = "none"; $("hud").style.display = "none";
  AudioSys.droneStop(); AudioSys.heartbeat(false);
  $("titleScreen").style.display = "flex";
  TAURI_INVOKE()("api_has_save").then(ok => $("btnContinue").disabled = !ok);
}

/* ---------------- 主渲染 ---------------- */
let worldActive = false;   // 是否在世界地图模式
let zoneActive = false;    // 是否在 3D 副本模式
let currentHud = null;
let zoneToken = 0;         // 副本会话代际号:leaveZone/重进时递增,使在途的 enterZone 失效(Bug-02)

function setMode(mode) {
  // mode: 'title' | 'story' | 'world' | 'zone'
  const storyEl = $("story"), hudEl = $("hud"), worldEl = $("worldView"), zoneEl = $("zoneView");
  worldActive = mode === "world";
  zoneActive = mode === "zone";
  window.ZoneActive = zoneActive;
  storyEl.style.display = mode === "story" ? "block" : "none";
  hudEl.style.display = mode === "title" ? "none" : "flex";
  worldEl.style.display = mode === "world" ? "block" : "none";
  zoneEl.style.display = mode === "zone" ? "flex" : "none";
  $("titleScreen").style.display = mode === "title" ? "flex" : "none";
  if (mode !== "world") { World2D.stop(); World2D.clearKeys(); } // Bug-04:切出世界时清键位,防残留键自动移动
  if (mode !== "zone") { if (window.Zone3D) Zone3D.stop(); }
}

function worldMsg(text) {
  const el = $("worldMsg");
  el.textContent = text || "";
}

async function enterWorld() {
  AudioSys.ensure();
  setMode("world");
  try {
    const view = await TAURI_INVOKE()("api_new");
    currentHud = view.hud;
    refreshHud(view.hud);
    if (view.world) {
      World2D.setData(view.world);
    }
    $("worldLoc").textContent = "蜂巢 · B 区";
    worldMsg("你在主神空间苏醒。探索蜂巢，关闭红后，活着回来。");
  } catch (e) { worldMsg("世界加载失败: " + String(e)); }
}

// 世界移动 → IPC
async function worldMove(dx, dy) {
  try {
    const r = await TAURI_INVOKE()("api_world_move", { dx, dy });
    if (r && r.px !== undefined) {
      if (r.teleported) {
        // 传送门切层：整图重载
        const w = await TAURI_INVOKE()("api_world");
        World2D.setData(w);
        currentHud = w.hud;
        refreshHud(w.hud);
        worldMsg("已抵达 " + (w.floor_name || ""));
        setTimeout(() => { worldMsg(""); }, 1800);
        return;
      }
      World2D.setPlayer(r.px, r.py);
      if (r.gate_blocked) {
        // 门禁挡路：显示锁定提示（不移动）
        worldMsg("🔒 " + (r.gate_blocked.msg || r.gate_blocked.name || "门禁锁定"));
        setTimeout(() => { worldMsg(""); }, 2200);
        return;
      }
      if (r.encounter) {
        // 撞到敌人 → 进入战斗副本(立即 return,不再刷新世界,避免副本期间重启世界循环 Bug-03)
        enterZone({ id: r.encounter.enemy_id, kind: "fight", ref: r.encounter.fight_id, name: r.encounter.name }, null);
        return;
      }
      if (r.nearby) {
        refreshNearby();
      }
    }
  } catch (e) { /* 移动失败忽略 */ }
}

async function refreshNearby() {
  try {
    const w = await TAURI_INVOKE()("api_world");
    World2D.setData(w);
    currentHud = w.hud;
    refreshHud(w.hud);
  } catch { }
}

// 世界交互（E 键 / 点击）→ IPC
async function worldInteract(objId) {
  try {
    const r = await TAURI_INVOKE()("api_world_interact", { objId });
    if (!r) return;
    if (r.kind === "zone" || r.zone) {
      const z = r; // zone_enter_inner 已返回 zone 数据
      if (z && z.zone) enterZone(z.zone, z.enemy || null);
      else worldMsg("副本入口异常");
      return;
    }
    if (r.kind === "gate") {
      // 门禁：解锁成功/失败提示（解锁后刷新地图显示）
      worldMsg((r.opened ? "✅ " : "🔒 ") + (r.msg || "门禁"));
      setTimeout(() => { worldMsg(""); }, 2400);
      refreshNearby();
      return;
    }
    if (r.kind === "npc" || r.kind === "point") {
      // 剧情对话/调查：跳转真实场景
      const sceneId = r.scene || r.route;
      if (sceneId) {
        await showStoryScene(sceneId);
        return;
      }
    }
    if (r.kind === "portal") {
      // 楼层切换：重新加载地图
      worldMsg("传送至 " + (r.floor_name || "下一层") + "…");
      try {
        const w = await TAURI_INVOKE()("api_world");
        World2D.setData(w);
        currentHud = w.hud;
        refreshHud(w.hud);
        worldMsg("已抵达 " + (w.floor_name || ""));
        setTimeout(() => { worldMsg(""); }, 1800);
      } catch (e) { worldMsg("传送失败: " + String(e)); }
      return;
    }
    if (r.kind === "portal_world") {
      // 跨世界网关（P1）：switch_world 已在 Rust 侧完成，这里整图重载到目标世界
      if (r.available === false) {
        worldMsg(r.msg || "该传送门尚未开启。");
        setTimeout(() => { worldMsg(""); }, 2400);
        return;
      }
      worldMsg("传送至「" + (r.to_world || "") + "」…");
      try {
        const w = await TAURI_INVOKE()("api_world");
        World2D.setData(w);
        currentHud = w.hud;
        refreshHud(w.hud);
        worldMsg("已抵达 " + (w.floor_name || w.world?.name || ""));
        setTimeout(() => { worldMsg(""); }, 1800);
      } catch (e) { worldMsg("跨世界传送失败: " + String(e)); }
      return;
    }
    worldMsg("已交互：" + (r.obj_id || ""));
    refreshNearby();
  } catch (e) { worldMsg("交互失败: " + String(e)); }
}

// 显示一个剧情场景（世界中的对话/调查）——真实渲染引擎场景
async function showStoryScene(sceneId) {
  setMode("story");
  worldMsg("");
  try {
    const view = await TAURI_INVOKE()("api_scene_goto", { sceneId });
    currentHud = view.hud;
    refreshHud(view.hud);
    await renderSceneWithBack(view);
  } catch (e) {
    // 场景加载失败则回到地图
    enterWorldKeep();
    worldMsg("场景加载失败: " + String(e));
  }
}

// 渲染引擎场景视图，并注入"返回地图"按钮
async function renderSceneWithBack(view) {
  if (!view) return;
  if (view.kind === "card" && view.card) { showCard(view.card); return; }
  const sceneEl = view;
  if (sceneEl.mood) AudioSys.drone(sceneEl.mood);
  if (sceneEl.video) await playCine(sceneEl.video.src, sceneEl.video.label);
  showBg(sceneEl.bg, sceneEl.loc);
  AudioSys.voice(sceneEl.voice);
  $("speaker").textContent = sceneEl.speaker || "";
  const paras = (sceneEl.paragraphs || []).join("\n\n");
  // 战斗视图
  if (view.fight) {
    $("fightBar").style.display = "block";
    $("enemyName").textContent = view.fight.name;
    $("enemyFill").style.width = clamp(view.fight.hp / view.fight.maxHp * 100, 0, 100) + "%";
    $("enemyHpTxt").textContent = `${view.fight.hp}/${view.fight.maxHp}`;
    const logEl = $("fightLog"); logEl.innerHTML = "";
    (view.fight.log || []).slice(-8).forEach(line => {
      const div = document.createElement("div"); div.innerHTML = line; logEl.appendChild(div);
    });
    logEl.scrollTop = logEl.scrollHeight;
  } else {
    $("fightBar").style.display = "none";
  }
  typewrite($("narrText"), paras, () => {
    const choicesEl = $("choices"); choicesEl.innerHTML = "";
    (view.choices || []).forEach(c => {
      const btn = document.createElement("button");
      btn.className = "choice";
      btn.innerHTML = c.label + (c.sub ? `<span class="sub">${c.sub}</span>` : "");
      btn.onclick = async () => {
        AudioSys.sfx("click");
        const next = await TAURI_INVOKE()("api_choose", { index: c.index });
        await renderSceneWithBack(next);
      };
      choicesEl.appendChild(btn);
    });
    // 世界模式进入的场景，总是附加"返回地图"按钮
    const back = document.createElement("button");
    back.className = "choice";
    back.style.marginTop = "10px";
    back.style.opacity = ".7";
    back.innerHTML = "⬅ 返回地图";
    back.onclick = () => { enterWorldKeep(); };
    choicesEl.appendChild(back);
  });
}

async function enterWorldKeep() {
  // 回到世界地图（保留当前会话）
  setMode("world");
  try {
    const w = await TAURI_INVOKE()("api_world");
    World2D.setData(w);
    currentHud = w.hud;
    refreshHud(w.hud);
  } catch { }
}

// 进入 3D 副本
async function enterZone(zoneInfo, enemyData) {
  const token = ++zoneToken; // Bug-02:记录本次会话代际,退出后(leaveZone 递增)在途初始化作废
  setMode("zone");
  const container = $("zone3dContainer");
  container.innerHTML = "";
  $("zoneTitle").textContent = zoneInfo.name || zoneInfo.ref || "副本";
  Zone3D.init(container, {
    onAction: async (action, arg) => {
      if (action === "move") {
        TAURI_INVOKE()("api_zone_action", { action: "move", arg }).catch(() => {});
        return;
      }
      if (action === "attack") {
        try {
          const r = await TAURI_INVOKE()("api_zone_action", { action: "attack", arg: 0 });
          if (r && r.win) {
            $("zoneMsg").textContent = "⚔ 敌人被击败！";
            Zone3D.onZoneUpdate({ kind: "fight", win: true });
            setTimeout(() => { leaveZone(); }, 1400);
          } else if (r && r.dead) {
            // Bug-05:玩家死亡——Rust 返回 {dead:true, view(死亡卡片), hud, scene},
            // 停止 3D 副本并切换到 story 容器展示死亡卡片,避免副本卡死/死亡提示丢失
            Zone3D.dispose();
            setMode("story");
            $("zoneMsg").textContent = "你倒下了……";
            if (r.view) handleView(r.view);
            else leaveZone();
          } else if (r && r.view && r.view.fight) {
            $("zoneMsg").textContent = `你攻击了 ${r.view.fight.name}（${r.view.fight.hp}/${r.view.fight.maxHp}）`;
            if (r.player_hp !== undefined) refreshHud({ hp: r.player_hp });
          }
        } catch (e) { $("zoneMsg").textContent = "攻击失败"; }
        return;
      }
      if (action === "dodge") {
        $("zoneMsg").textContent = "闪避！";
        setTimeout(() => { $("zoneMsg").textContent = ""; }, 800);
      }
    },
    onWin: () => {},
    onExit: () => leaveZone(),
  });
  // 副本初始数据
  try {
    const z = await TAURI_INVOKE()("api_world_interact", { objId: zoneInfo.id });
    if (token !== zoneToken) return; // Bug-02:等待期间已退出,作废在途初始化
    if (z && z.zone) {
      Zone3D.setData({ id: z.zone.id, kind: z.zone.kind, ref: z.zone.ref, enemy: z.enemy || null });
      Zone3D.start();
    }
  } catch (e) {
    // 副本数据失败也用基础数据
    if (token !== zoneToken) return; // Bug-02
    Zone3D.setData({ id: zoneInfo.id, kind: zoneInfo.kind, ref: zoneInfo.ref, enemy: enemyData || null });
    Zone3D.start();
  }
}

async function leaveZone() {
  zoneToken++; // Bug-02:会话代际递增,使在途 enterZone 的初始化作废
  try {
    await TAURI_INVOKE()("api_zone_exit");
  } catch { }
  Zone3D.dispose();
  enterWorldKeep();
}

async function handleView(view) {
  if (!view) return;
  refreshHud(view.hud);

  // 卡片（死亡/结算/觉醒）
  if (view.kind === "card" && view.card) {
    if (view.card.title.includes("基 因 锁")) { /* 保持场景底 */ }
    showCard(view.card);
    return;
  }

  // 世界模式视图（api_new 返回）
  if (view.world && !zoneActive) {
    setMode("world");
    World2D.setData(view.world);
    return;
  }

  // 场景
  const sceneEl = view;
  if (sceneEl.mood) AudioSys.drone(sceneEl.mood);
  if (sceneEl.video) await playCine(sceneEl.video.src, sceneEl.video.label);
  showBg(sceneEl.bg, sceneEl.loc);
  AudioSys.voice(sceneEl.voice);
  $("speaker").textContent = sceneEl.speaker || "";

  const paras = (sceneEl.paragraphs || []).join("\n\n");

  // 战斗视图
  if (view.fight) {
    $("fightBar").style.display = "block";
    $("enemyName").textContent = view.fight.name;
    $("enemyFill").style.width = clamp(view.fight.hp / view.fight.maxHp * 100, 0, 100) + "%";
    $("enemyHpTxt").textContent = `${view.fight.hp}/${view.fight.maxHp}`;
    const logEl = $("fightLog"); logEl.innerHTML = "";
    (view.fight.log || []).slice(-8).forEach(line => {
      const div = document.createElement("div"); div.innerHTML = line; logEl.appendChild(div);
    });
    logEl.scrollTop = logEl.scrollHeight;
  } else {
    $("fightBar").style.display = "none";
  }

  typewrite($("narrText"), paras, () => {
    const choicesEl = $("choices"); choicesEl.innerHTML = "";
    (view.choices || []).forEach(c => {
      const btn = document.createElement("button");
      btn.className = "choice";
      btn.innerHTML = c.label + (c.sub ? `<span class="sub">${c.sub}</span>` : "");
      btn.onclick = async () => {
        AudioSys.sfx("click");
        handleView(await TAURI_INVOKE()("api_choose", { index: c.index }));
      };
      choicesEl.appendChild(btn);
    });
  });
}

/* ---------------- 标题按钮 ---------------- */
$("btnNew").onclick = () => { enterWorld(); };
// Bug-09:仅保留一个 btnContinue 处理器,下方 handleView 统一渲染 world/场景视图
$("btnContinue").onclick = async () => {
  AudioSys.ensure();
  try {
    const view = await TAURI_INVOKE()("api_continue");
    $("titleScreen").style.display = "none";
    $("hud").style.display = "flex"; $("story").style.display = "block";
    handleView(view);
  } catch (e) { alert(String(e)); }
};
$("btnDeaths").onclick = async () => {
  const data = await TAURI_INVOKE()("api_deaths");
  const arr = data.deaths || [];
  const el = $("ovCard");
  el.innerHTML = `<h2>死 亡 档 案</h2>
    <p style="text-align:center;color:#666">「在这里死了，就是真的死了。」<br>但主神空间记得每一次轮回。</p>
    <div class="deathArchive">${
      arr.length ? arr.map(d => `<div><b>${d.t}</b> — ${d.c}<br><span style="color:#444;font-size:11px">${d.time}</span></div>`).join("")
        : "<div style='text-align:center;color:#555;padding:20px 0'>暂无记录。你还活着……暂时。</div>"
    }</div>`;
  const back = document.createElement("button");
  back.className = "mbtn"; back.textContent = "返 回"; back.style.marginTop = "18px";
  back.onclick = () => $("endOverlay").classList.remove("on");
  el.appendChild(back);
  $("endOverlay").classList.add("on");
};

/* ---------------- 噪点层 ---------------- */
(function grainLoop() {
  const cv = $("grain"), ctx2 = cv.getContext("2d");
  // 全分辨率 × DPR：去掉原 innerWidth/3 降采样，HiDPI 下噪点细腻不糊。
  // grainResize 由 ResolutionSys 调用(每次改档/改 DPR 时重算)。
  function grainResize() {
    const dpr = window.devicePixelRatio || 1;
    cv.width = Math.max(1, Math.round(innerWidth * dpr));
    cv.height = Math.max(1, Math.round(innerHeight * dpr));
  }
  window.grainResize = grainResize;
  addEventListener("resize", grainResize); grainResize();
  setInterval(() => {
    try {
      const img = ctx2.createImageData(cv.width, cv.height);
      for (let i = 0; i < img.data.length; i += 4) {
        const v = Math.random() * 255 | 0;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 40;
      }
      ctx2.putImageData(img, 0, 0);
    } catch (e) {}
  }, 120);
})();

/* ---------------- 启动 ---------------- */
World2D.init($("worldCanvas"), {
  onMove: (dx, dy) => worldMove(dx, dy),
  onInteract: (objId) => worldInteract(objId),
  onMsg: (t) => worldMsg(t),
});
// 初始应用分辨率/DPR（向 World2D.setDpr、Zone3D.setResolution、噪点层下发）
ResolutionSys.apply();
// 键盘：世界模式分发（zone 模式由 Zone3D 自行监听）
window.addEventListener("keydown", (e) => {
  if (worldActive) World2D.keydown(e);
  if (e.key === "Escape" && !zoneActive) {
    // Bug-01:zone 模式的 Escape 退出由 zone3d.js keydown 单点负责(onExit→leaveZone),
    // 此处排除 zone,避免与 zone3d 双触发 leaveZone
    if (worldActive) { backToTitle(); }
  }
});
window.addEventListener("keyup", (e) => {
  if (worldActive) World2D.keyup(e);
});

(async function boot() {
  try {
    const ok = await TAURI_INVOKE()("api_has_save");
    $("btnContinue").disabled = !ok;
  } catch (e) {
    $("btnContinue").disabled = true;
  }
})();

/* ---------------- 分辨率选择 UI（标题屏）---------------- */
(function resUI() {
  const set = (l) => { try { window.setResolution(l); } catch (e) {} };
  // 高亮当前档位（ResolutionSys.apply 回调此函数）
  window.__resUI = (l) => {
    const level = String(l);
    document.querySelectorAll(".resBtn").forEach(b => {
      b.classList.toggle("on", String(b.dataset.res) === level);
    });
  };
  document.querySelectorAll(".resBtn").forEach(b => {
    b.addEventListener("click", () => { AudioSys.ensure(); AudioSys.sfx("click"); set(Number(b.dataset.res)); });
  });
  window.__resUI(ResolutionSys.get());
})();
