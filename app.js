// SimFarm MVP - daily-care farm engine
const H = 3600e3;
const DAY = 24 * H;

const CROPS = {
  wheat:   { id: 'wheat',   name: 'Wheat',   sell: 15,  xp: 10, growMs: 48*H,  waterMs: 18*H, minLevel: 1, desc: '2 days, easy' },
  turnip:  { id: 'turnip',  name: 'Turnip',  sell: 30,  xp: 20, growMs: 72*H,  waterMs: 18*H, minLevel: 2, desc: '3 days, hardy root' },
  tomato:  { id: 'tomato',  name: 'Tomato',  sell: 60,  xp: 35, growMs: 96*H,  waterMs: 12*H, minLevel: 3, desc: '4 days, thirsty' },
  melon:   { id: 'melon',   name: 'Melon',   sell: 140, xp: 80, growMs: 168*H, waterMs: 24*H, minLevel: 5, desc: '7 days, prize fruit' },
};
// 16-bit crop sprites (CC0, josehzz via OpenGameArt): sheet cells, [portraitX, s0..s4 X], row Y (px)
const SPRITES = {
  wheat:  { row: 80, xs: [0, 16, 32, 48, 64, 80] },
  turnip: { row: 0,  xs: [0, 16, 32, 48, 64, 80] },
  tomato: { row: 32, xs: [0, 16, 32, 48, 64, 80] },
  melon:  { row: 32, xs: [96, 112, 128, 144, 160, 176] },
};
const OLD_IDS = { lettuce: 'wheat', carrot: 'turnip', pumpkin: 'melon' };

const UNLOCK_COST = { 6: 200, 7: 200, 8: 200, 9: 500, 10: 500, 11: 500 };
const SAVE_KEY = 'simfarm-v1';

// --- RETRO pixel crop images: detailed 16x16 + soil moisture + mini icons ---
function soilArt(wet) {
  const R = (x, y, w, h, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`;
  if (wet) return R(1, 12, 14, 3, '#4a2f1c') + R(1, 12, 14, 1, '#6b4426') + R(3, 13, 2, 1, '#3a2412') + R(11, 14, 2, 1, '#3a2412') + R(7, 13, 1, 1, '#3a9ad9');
  return R(1, 12, 14, 3, '#8a5a33') + R(1, 12, 14, 1, '#c08a4e') + R(4, 13, 3, 1, '#6b4426') + R(9, 14, 3, 1, '#6b4426');
}
function iconArt(name) {
  const R = (x, y, w, h, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`;
  const open = (inner) => `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">${inner}</svg>`;
  if (name === 'drop') return open(R(6, 3, 4, 6, '#3a9ad9') + R(7, 2, 2, 2, '#3a9ad9') + R(7, 4, 1, 2, '#bfe8ff') + R(5, 9, 6, 4, '#2d7ab5') + R(6, 10, 2, 2, '#bfe8ff'));
  if (name === 'weed') return open(R(7, 8, 2, 6, '#1e5a24') + R(4, 5, 3, 4, '#4da636') + R(9, 4, 3, 4, '#2d7a33') + R(6, 2, 4, 3, '#7ed957'));
  if (name === 'boost') return open(R(7, 1, 2, 5, '#ffcc33') + R(4, 4, 8, 2, '#ffcc33') + R(6, 6, 4, 4, '#ff9f1c') + R(7, 7, 2, 2, '#fff') + R(3, 11, 10, 1, '#7a4e28'));
  if (name === 'coin') return open(R(5, 3, 6, 10, '#7a4e28') + R(6, 4, 4, 8, '#ffcc33') + R(7, 5, 2, 6, '#ffe08a') + R(7, 7, 2, 2, '#7a4e28'));
  if (name === 'heart') return open(R(4, 4, 3, 3, '#e63946') + R(9, 4, 3, 3, '#e63946') + R(3, 6, 10, 5, '#e63946') + R(5, 11, 6, 2, '#e63946') + R(7, 13, 2, 1, '#e63946') + R(4, 4, 2, 2, '#ffb3ba'));
  if (name === 'sun') return open(R(6, 6, 4, 4, '#ffcc33') + R(7, 2, 2, 2, '#ffcc33') + R(7, 12, 2, 2, '#ffcc33') + R(2, 7, 2, 2, '#ffcc33') + R(12, 7, 2, 2, '#ffcc33') + R(4, 4, 2, 2, '#ff9f1c') + R(10, 10, 2, 2, '#ff9f1c'));
  if (name === 'lock') return open(R(4, 7, 8, 6, '#3a3a3a') + R(4, 7, 8, 1, '#777') + R(5, 4, 6, 3, '#3a3a3a') + R(6, 5, 4, 2, '#fdf6d8') + R(7, 9, 2, 2, '#ffcc33'));
  return open(R(3, 3, 10, 10, '#ccc'));
}
function cropArt(cropId, stage, wet, prog = 0) {
  // R = helper: x,y,w,h,color -> pixel rect
  const R = (x, y, w, h, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`;
  const soil = soilArt(!!wet);
  const open = (inner) => `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges"><g class="sway">${soil}${inner}</g></svg>`;
  const flat = (inner) => `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">${inner}</svg>`;
  if (stage === 'locked') return flat(R(0, 0, 16, 16, '#4a4a4a') + R(0, 0, 16, 2, '#666') + iconArt('lock').replace(/<\/?svg[^>]*>/g, ''));
  if (stage === 'empty') return flat(soil + R(6, 7, 4, 1, '#3d2b1a') + R(7, 6, 2, 3, '#3d2b1a') + R(3, 9, 2, 1, '#6b4426') + R(11, 10, 2, 1, '#6b4426'));
  // 16-bit CC0 sprites (josehzz): 5 growth cells per crop. Wilted/dead reuse
  // live cells - the plot CSS tints them sepia/grayscale.
  if (SPRITES[cropId]) {
    const cell = stage === 'seed' ? 1 : stage === 'sprout' ? 2
      : stage === 'growing' ? (prog >= 0.75 ? 4 : 3) : stage === 'wilted' ? 3 : 5;
    const sp = SPRITES[cropId];
    return `<div class="cellwrap">${spriteImg(sp.xs[cell], sp.row, 'sprite')}${stage === 'ready' ? '<span class="spark"></span>' : ''}</div>`;
  }
  // (hand-drawn fallback below; SPRITES branch above handles all crops)
  return open(R(5, 8, 6, 4, '#7ed957'));
}
// 16-bit sprites: <span class="sprite"> shows one cell of art/crops.png.
// position in % of the 12x10-cell sheet so it scales to any box size.
function spriteImg(cellX, cellY, cls = 'sprite') {
  const px = (cellX / 16 / 11) * 100, py = (cellY / 16 / 9) * 100;
  return `<span class="${cls}" style="background-position:${px}% ${py}%"></span>`;
}
function farmerArt() {
  return `<img class="pixel" src="art/farmer.png" alt="farmer" width="16" height="16" />`;
}
function scarecrowArt() {
  return `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges"><rect x="7" y="2" width="2" height="4" fill="#c9a227"/><rect x="4" y="3" width="8" height="2" fill="#8a5a33"/><rect x="5" y="6" width="6" height="4" fill="#e8d8a0"/><rect x="6" y="7" width="1" height="1" fill="#222"/><rect x="9" y="7" width="1" height="1" fill="#222"/><rect x="3" y="10" width="10" height="1" fill="#5a3d24"/><rect x="7" y="10" width="2" height="6" fill="#5a3d24"/><rect x="4" y="12" width="3" height="3" fill="#a03a3a"/><rect x="9" y="12" width="3" height="3" fill="#3a7ad9"/></svg>`;
}
function classTitle(lvl) {
  if (lvl >= 8) return 'Sunlord of the Vale';
  if (lvl >= 5) return 'Harvest Knight';
  if (lvl >= 3) return 'Crop Tender';
  return 'Sproutling';
}
// cosmetic only: day phase + daily weather (never touches growth math)
function dayPhase(h = new Date().getHours()) {
  if (h < 5 || h >= 21) return 'night';
  if (h < 7) return 'dawn';
  if (h < 17) return 'day';
  if (h < 19) return 'dusk';
  return 'night';
}
function dayWeather(dateStr = todayStr()) {
  let hsh = 0;
  for (const ch of dateStr) hsh = (hsh * 31 + ch.charCodeAt(0)) >>> 0;
  const r = hsh % 10;
  return r < 6 ? 'SUNNY' : r < 8 ? 'CLOUDY' : 'RAIN';
}
function applySky() {
  try {
    document.body.dataset.phase = dayPhase();
    document.body.dataset.weather = dayWeather().toLowerCase();
  } catch { /* headless */ }
}
function floatText(txt, big) {
  try {
    const d = document.createElement('div');
    d.className = 'floater' + (big ? ' big' : '');
    d.textContent = txt;
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 1400);
  } catch { /* headless test env */ }
}
function sceneArt() {
  return `<svg viewBox="0 0 160 44" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges" preserveAspectRatio="xMidYMid slice"><rect x="0" y="0" width="160" height="28" fill="#8fd3ff"/><rect x="0" y="28" width="160" height="16" fill="#7cc25e"/><rect x="0" y="28" width="160" height="3" fill="#a5e08a"/><rect x="124" y="5" width="12" height="12" fill="#ffcc33"/><rect x="126" y="7" width="4" height="4" fill="#ffe08a"/><rect x="20" y="8" width="18" height="6" fill="#fff"/><rect x="24" y="6" width="10" height="4" fill="#fff"/><rect x="90" y="12" width="22" height="7" fill="#fff"/><rect x="96" y="9" width="10" height="5" fill="#fff"/><rect x="8" y="24" width="26" height="12" fill="#c0392b"/><rect x="8" y="24" width="26" height="3" fill="#7a2415"/><rect x="18" y="29" width="6" height="7" fill="#5a1e12"/><rect x="60" y="20" width="3" height="16" fill="#5a3d24"/><rect x="48" y="24" width="27" height="3" fill="#5a3d24"/><rect x="48" y="29" width="27" height="3" fill="#5a3d24"/><rect x="130" y="22" width="3" height="14" fill="#5a3d24"/><rect x="120" y="26" width="23" height="3" fill="#5a3d24"/><rect x="120" y="31" width="23" height="3" fill="#5a3d24"/><rect x="40" y="32" width="4" height="6" fill="#2d5a27"/><rect x="110" y="33" width="4" height="5" fill="#2d5a27"/></svg>`;
}

function todayStr(d = new Date()) { return d.toISOString().slice(0, 10); }

function defaultState() {
  const plots = [];
  for (let i = 0; i < 12; i++) {
    plots.push({ unlocked: i < 6, cropId: null, plantedAt: 0, lastWateredAt: 0, fertilizedAt: 0, health: 100, dead: false, weed: false, sprinkler: false });
  }
  return {
    coins: 100, xp: 0, level: 1,
    streak: 1, lastVisitDate: todayStr(), lastSeen: Date.now(),
    totalHarvests: 0, codex: {}, stats: { water: 0, plant: 0 },
    plots,
    tasks: { date: todayStr(), water: 0, plant: 0, harvest: 0, claimed: false, paid: { water: false, plant: false, harvest: false } },
  };
}

let S = load();

function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return defaultState();
    const s = JSON.parse(raw);
    if (!s.plots || s.plots.length !== 12) return defaultState();
    if (!s.codex) s.codex = {};
    if (!s.stats) s.stats = { water: 0, plant: 0 };
    if (!s.tasks.paid) s.tasks.paid = { water: false, plant: false, harvest: false };
    s.plots.forEach(p => { if (p.sprinkler === undefined) p.sprinkler = false; });
    // migrate pre-16bit crop ids to matching sprite crops (same stats)
    s.plots.forEach(p => { if (p.cropId && OLD_IDS[p.cropId]) p.cropId = OLD_IDS[p.cropId]; });
    Object.keys(OLD_IDS).forEach(old => {
      if (s.codex[old]) { s.codex[OLD_IDS[old]] = (s.codex[OLD_IDS[old]] || 0) + s.codex[old]; delete s.codex[old]; }
    });
    return s;
  } catch { return defaultState(); }
}
function save() { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); }

function xpNeeded() { return 40 + S.level * 30; }
function addXp(n) {
  S.xp += n;
  while (S.xp >= xpNeeded()) { S.xp -= xpNeeded(); S.level++; }
}
// daily quests pay out once each when their goal is first reached
const QUESTS = {
  water: { goal: 3, reward: 15 },
  plant: { goal: 2, reward: 10 },
  harvest: { goal: 1, reward: 25 },
};
function maybePayQuest(k) {
  const q = QUESTS[k];
  if (!S.tasks.paid) S.tasks.paid = { water: false, plant: false, harvest: false };
  if (S.tasks[k] >= q.goal && !S.tasks.paid[k]) {
    S.tasks.paid[k] = true;
    S.coins += q.reward;
    floatText(`Quest done! +${q.reward}c`);
  }
}

// --- time engine ---
function fertActive(p, now) { return p.fertilizedAt && (now - p.fertilizedAt) < 48 * H; }

function plotInfo(p, now = Date.now()) {
  if (!p.unlocked) return { state: 'locked' };
  if (!p.cropId) return { state: 'empty' };
  if (p.dead) return { state: 'dead' };
  const def = CROPS[p.cropId];
  let elapsed = now - p.plantedAt;
  if (fertActive(p, now)) elapsed *= 1.4;
  if (p.weed) elapsed *= 0.6;
  const progress = Math.min(1, elapsed / def.growMs);
  const dryFor = (now - p.lastWateredAt) - def.waterMs;
  const needsWater = dryFor > 0;
  let state = 'growing';
  if (progress < 0.25) state = 'seed';
  else if (progress < 0.55) state = 'sprout';
  else if (progress < 1) state = 'growing';
  else state = 'ready';
  if (p.health < 55 && state !== 'ready') state = 'wilted';
  if (needsWater && state === 'ready') state = 'ready-thirsty';
  return { state, progress, needsWater, dryFor: Math.max(0, dryFor), def };
}

function tick(now = Date.now()) {
  // daily reset + streak
  const today = todayStr(new Date(now));
  if (S.tasks.date !== today) {
    const yesterday = todayStr(new Date(now - DAY));
    if (S.lastVisitDate === yesterday) S.streak++;
    else if (S.lastVisitDate !== today) S.streak = 1;
    S.lastVisitDate = today;
    S.tasks = { date: today, water: 0, plant: 0, harvest: 0, claimed: false, paid: { water: false, plant: false, harvest: false } };
    // rainy days water every living crop for free
    if (dayWeather(today) === 'RAIN') {
      S.lastRain = today;
      S.plots.forEach(p => { if (p.unlocked && p.cropId && !p.dead) p.lastWateredAt = Math.max(p.lastWateredAt, now); });
    }
    // daily weeds: 15% per growing plot
    S.plots.forEach(p => {
      if (p.unlocked && p.cropId && !p.dead && Math.random() < 0.15) p.weed = true;
    });
  }
  // sprinklers auto-water every living crop before decay is computed
  S.plots.forEach(p => {
    if (p.sprinkler && p.unlocked && p.cropId && !p.dead) p.lastWateredAt = Math.max(p.lastWateredAt, now);
  });
  // health decay - scales with actual dry hours so offline neglect kills
  S.plots.forEach(p => {
    if (!p.unlocked || !p.cropId || p.dead) return;
    const info = plotInfo(p, now);
    if (info.needsWater) {
      const dryHours = info.dryFor / H;
      p.health = Math.max(0, 100 - dryHours * 2.5);
      if (p.health <= 0) { p.health = 0; p.dead = true; }
    } else {
      p.health = Math.min(100, p.health + 10);
    }
  });
  save();
}

function awaySummary() {
  const now = Date.now();
  const sinceH = Math.round((now - (S.lastSeen || now)) / H * 10) / 10;
  if (sinceH < 1) { S.lastSeen = now; save(); return ''; }
  let ready = 0, thirsty = 0, dead = 0;
  S.plots.forEach(p => {
    if (!p.cropId) return;
    const info = plotInfo(p, now);
    if (info.state === 'dead') dead++;
    else if (info.state.startsWith('ready')) ready++;
    else if (info.needsWater) thirsty++;
  });
  S.lastSeen = now; save();
  if (ready === 0 && thirsty === 0 && dead === 0) return '';
  return `While you were away (${sinceH}h): ${ready} ready, ${thirsty} thirsty, ${dead} withered.`;
}

// --- actions ---
let activePlot = -1;

function plant(idx, cropId) {
  const p = S.plots[idx], def = CROPS[cropId];
  if (!p || !p.unlocked) { alert('That plot is locked.'); return false; }
  if (p.cropId) { alert('Something already grows here.'); return false; }
  if (!def) return false;
  if (S.level < def.minLevel) { alert(`${def.name} needs Lv${def.minLevel} (you are Lv${S.level}). Harvest Wheat to earn XP!`); return false; }
  // seeds are free - the risk is your time and daily care, never your wallet
  const now = Date.now();
  Object.assign(p, { cropId, plantedAt: now, lastWateredAt: now, health: 100, dead: false, weed: false, fertilizedAt: 0 });
  S.tasks.plant++;
  S.stats.plant++;
  addXp(2);
  floatText('Planted!');
  maybePayQuest('plant');
  save(); render(); return true;
}
function water(idx) {
  const p = S.plots[idx];
  if (!p.cropId || p.dead) return;
  p.lastWateredAt = Date.now();
  if (p.health < 100) p.health = Math.min(100, p.health + 15);
  S.tasks.water++;
  S.stats.water++;
  addXp(3);
  floatText('Watered!');
  maybePayQuest('water');
  save(); render();
}
function fertilize(idx) {
  const p = S.plots[idx];
  if (!p.cropId || p.dead) { alert('Nothing to fertilize here.'); return false; }
  if (S.coins < 10) { alert(`Fertilizer costs 10c (have ${S.coins}c).`); return false; }
  S.coins -= 10;
  p.fertilizedAt = Date.now();
  addXp(2);
  save(); render(); return true;
}
function harvest(idx) {
  const p = S.plots[idx];
  const info = plotInfo(p);
  if (!info.state.startsWith('ready')) return;
  const def = CROPS[p.cropId];
  const quality = p.health >= 70 ? 1 : 0.5;
  const gain = Math.round(def.sell * quality);
  S.coins += gain;
  S.totalHarvests++;
  S.codex[p.cropId] = (S.codex[p.cropId] || 0) + 1;
  S.tasks.harvest++;
  const lvlBefore = S.level;
  addXp(def.xp);
  floatText(`+${gain}c  +${def.xp}xp`);
  maybePayQuest('harvest');
  if (S.level > lvlBefore) floatText(`LEVEL UP! Lv${S.level}`, true);
  const weed = false;
  Object.assign(p, { cropId: null, plantedAt: 0, lastWateredAt: 0, health: 100, dead: false, weed, fertilizedAt: 0 });
  save(); render();
}
function clearPlot(idx) {
  const p = S.plots[idx];
  Object.assign(p, { cropId: null, plantedAt: 0, lastWateredAt: 0, health: 100, dead: false, weed: false, fertilizedAt: 0 });
  save(); render();
}
function unlock(idx) {
  const cost = UNLOCK_COST[idx] || 300;
  if (S.coins < cost) { alert(`Need ${cost}c to unlock (have ${S.coins}c). Harvest first!`); return false; }
  S.coins -= cost;
  S.plots[idx].unlocked = true;
  save(); render(); return true;
}
function buySprinkler(idx) {
  const p = S.plots[idx];
  if (!p || !p.unlocked || !p.cropId || p.dead) { alert('Plant something living here first.'); return false; }
  if (p.sprinkler) return true;
  if (S.coins < 300) { alert(`Sprinkler costs 300c (have ${S.coins}c).`); return false; }
  S.coins -= 300;
  p.sprinkler = true;
  floatText('Sprinkler installed!');
  save(); render(); return true;
}

// --- UI ---
const $ = id => document.getElementById(id);

function stageLabel(info) {
  const m = { seed: 'SEED', sprout: 'SPROUT', growing: 'GROWING', ready: 'READY', 'ready-thirsty': 'READY - DRY', wilted: 'WILTED', dead: 'WITHERED', empty: 'EMPTY', locked: 'LOCKED' };
  return m[info.state] || info.state.toUpperCase();
}

function render() {
  $('coins').innerHTML = `<i class="mini">${iconArt('coin')}</i>${S.coins}c`;
  $('level').textContent = 'Lv' + S.level + ' ' + classTitle(S.level);
  $('streak').innerHTML = `<i class="mini">${iconArt('sun')}</i>Day ${S.streak}`;
  $('xpfill').style.width = Math.min(100, S.xp / xpNeeded() * 100) + '%';
  const hp = $('hudPortrait');
  if (hp) hp.innerHTML = farmerArt();
  applySky();
  renderGrid(); renderShop(); renderTasks(); renderYou();
  const msg = awaySummary();
  const aw = $('awayMsg');
  if (msg) { aw.innerHTML = `<span class="dlg-face">${farmerArt()}</span><span class="dlg-body"><span class="dlg-name">DIARY</span>${msg}</span><span class="dlg-cursor"></span>`; aw.classList.remove('hidden'); }
  else aw.classList.add('hidden');
  // tip: most urgent (onboarding first)
  const now = Date.now();
  let thirsty = 0, ready = 0, dead = 0, planted = 0;
  S.plots.forEach(p => { if (p.cropId) planted++; const i = plotInfo(p, now); if (i.state === 'dead') dead++; else if (i.state.startsWith('ready')) ready++; else if (i.needsWater) thirsty++; });
  const idleTips = [
    'All crops look good. Check back tomorrow.',
    'The scarecrow is watching over your field. All quiet.',
    'Healthy soil, happy crops. Nice work, farmer.',
    'Bees visited while you were away. They approve.',
    'A sunny day in the Vale. Perfect growing weather.',
  ];
  const idle = idleTips[Math.abs([...todayStr(new Date(now))].reduce((a, c) => a + c.charCodeAt(0), 0)) % idleTips.length];
  const tipTxt = planted === 0 ? 'Welcome, Sproutling! Seeds are FREE - tap an empty soil ring to plant Wheat (more crops unlock as you level up).' : dead > 0 ? `${dead} crop(s) withered. Tap it, then Clear.` : ready > 0 ? `${ready} crop(s) READY - tap to harvest!` : thirsty > 0 ? `${thirsty} crop(s) need water - look for blue WATER badges.` : S.lastRain === todayStr(new Date(now)) ? 'Rainy day in the Vale - clouds watered your crops free!' : idle;
  $('tip').innerHTML = `<span class="dlg-face">${scarecrowArt()}</span><span class="dlg-body"><span class="dlg-name">SCARECROW</span>${tipTxt}</span><span class="dlg-cursor"></span>`;
}

function renderGrid() {
  const g = $('grid'); g.innerHTML = '';
  const now = Date.now();
  S.plots.forEach((p, i) => {
    const b = document.createElement('button');
    const info = plotInfo(p, now);
    let cls = info.state;
    if (info.state === 'ready-thirsty') cls = 'ready thirsty';
    else if ((info.state === 'seed' || info.state === 'sprout' || info.state === 'growing') && info.needsWater) cls = 'thirsty';
    b.className = 'plot ' + cls;
    // isometric diorama: diamond tile + floating crop + flat wooden signs
    const sizeFor = (st) => ({
      seed: [0.78, 86], sprout: [0.88, 94], growing: [1, 102], ready: [1.1, 110],
      'ready-thirsty': [1.1, 110], wilted: [0.95, 96], dead: [0.9, 92], empty: [0.7, 84], locked: [0.7, 84],
    }[st] || [1, 100]);
    if (!p.unlocked) {
      b.classList.add('locked');
      const [sc, bh] = sizeFor('locked');
      b.innerHTML = `<div class="diamond"><div class="mound"></div></div><div class="cropX" style="bottom:${bh}px"><div class="art" style="transform:scale(${sc})">${cropArt(null, 'locked')}</div></div><div class="cname">Locked</div><div class="stage">${UNLOCK_COST[i] || 300}c to open</div>`;
    } else if (!p.cropId) {
      const [sc, bh] = sizeFor('empty');
      b.innerHTML = `<div class="diamond"><div class="mound"></div></div><div class="cropX" style="bottom:${bh}px"><div class="art" style="transform:scale(${sc})">${cropArt(null, 'empty', false)}</div></div><div class="cname">Empty soil</div><div class="stage">TAP TO PLANT</div>`;
    } else {
      const def = CROPS[p.cropId];
      const pct = Math.round(info.progress * 100);
      const wet = !info.needsWater;
      const artStage = info.state === 'dead' ? 'dead' : info.state === 'wilted' ? 'wilted' : info.state === 'ready-thirsty' ? 'ready' : info.state;
      const [sc, bh] = sizeFor(info.state);
      const hpRow = info.state === 'dead' ? '<span class="badge hp">WITHERED</span>' : `<span class="badge hp"><i class="mini">${iconArt('heart')}</i>${Math.round(p.health)}</span>`;
      const badges = `${info.needsWater && !p.dead ? `<span class="badge water"><i class="mini">${iconArt('drop')}</i>WATER</span>` : ''}${p.weed ? `<span class="badge weed"><i class="mini">${iconArt('weed')}</i>WEED</span>` : ''}${fertActive(p, now) ? `<span class="badge boost"><i class="mini">${iconArt('boost')}</i>BOOST</span>` : ''}${p.sprinkler ? `<span class="badge boost"><i class="mini">${iconArt('drop')}</i>AUTO</span>` : ''}${hpRow}`;
      b.innerHTML = `<div class="diamond"><div class="mound"></div></div><div class="cropX" style="bottom:${bh}px"><div class="art ${wet ? 'wet' : 'dry'}" style="transform:scale(${sc})">${cropArt(p.cropId, artStage, wet, info.progress)}</div></div>
        <div class="cname">${def.name}</div>
        <div class="stage">${stageLabel(info)} ${pct}%</div>
        <div class="bar"><i style="width:${pct}%"></i></div>
        <div class="badges">${badges}</div>`;
    }
    b.onclick = () => { activePlot = i; openSheet(); };
    g.appendChild(b);
  });
  const scene = $('scene');
  if (scene) scene.innerHTML = sceneArt();
}

function renderShop() {
  const el = $('shopList'); el.innerHTML = '';
  Object.values(CROPS).forEach(d => {
    const locked = S.level < d.minLevel;
    const div = document.createElement('div');
    div.className = 'shop-item packet';
    div.innerHTML = `<div class="packet-art"><div class="packet-top">${d.name}</div><div class="shop-art">${cropArt(d.id, 'ready', true)}</div><div class="packet-price">FREE seed</div></div><div style="flex:1"><b>${d.name}</b> <span class="muted">${d.desc} - Lv${d.minLevel}</span><br><span class="muted">Sells ${d.sell}c / ${Math.round(d.growMs / DAY)}d / +${d.xp}xp</span></div>
      <button ${locked ? 'disabled' : ''}>${locked ? 'Lv' + d.minLevel : 'Plant'}</button>`;
    if (!locked) div.querySelector('button').onclick = () => {
      const idx = S.plots.findIndex(p => p.unlocked && !p.cropId);
      if (idx < 0) { alert('No empty plots! Harvest a READY crop or unlock more.'); return; }
      if (!plant(idx, d.id)) alert(`Can't plant ${d.name} there - try another empty plot.`);
    };
    const emptyIdx = S.plots.findIndex(p => p.unlocked && !p.cropId);
    if (!locked) div.querySelector('button').textContent = emptyIdx >= 0 ? `Plant in plot ${emptyIdx + 1}` : 'No empty plots';
    el.appendChild(div);
  });
  const s = $('supplyList'); s.innerHTML = '';
  const f = document.createElement('div');
  f.className = 'shop-item';
  f.innerHTML = `<div class="shop-art boost-art">${iconArt('boost')}</div><div style="flex:1"><b>Fertilizer</b><br><span class="muted">+40% growth for 48h. 10c per use in plot menu.</span></div>`;
  s.appendChild(f);
}

function renderTasks() {
  const t = S.tasks;
  const goals = [
    ['water', 3, 'Water 3 crops', 'drop', 'Mira the Herbalist', '+15c'],
    ['plant', 2, 'Plant 2 seeds', 'boost', 'Bram the Seedkeep', '+10c'],
    ['harvest', 1, 'Harvest 1 crop', 'coin', 'Guild Board', '+25c'],
  ];
  const el = $('taskList'); el.innerHTML = '';
  goals.forEach(([k, goal, label, icon, giver, reward]) => {
    const done = t[k] >= goal;
    const cur = Math.min(t[k], goal);
    const d = document.createElement('div');
    d.className = 'task quest' + (done ? ' done' : '');
    d.innerHTML = `<span class="pin"></span><i class="mini big">${iconArt(icon)}</i><span class="quest-main"><span class="quest-giver">${giver}</span><span>${label}</span><span class="quest-reward">Reward: ${reward}</span><span class="quest-bar"><i style="width:${Math.round(cur / goal * 100)}%"></i></span></span><b>${cur}/${goal}${done ? ' DONE!' : ''}</b>`;
    el.appendChild(d);
  });
  $('claimStreak').textContent = t.claimed ? `Bonus claimed (Day ${S.streak} streak)` : `Claim daily bonus (${Math.min(50, S.streak * 5)}c)`;
  $('claimStreak').disabled = !!t.claimed;
}

function renderYou() {
  $('pLevel').textContent = `${S.level} (${classTitle(S.level)})`;
  $('pXp').textContent = `${S.xp}/${xpNeeded()}`;
  $('pCoins').textContent = S.coins;
  $('pStreak').textContent = `Day ${S.streak}`;
  $('pHarvest').textContent = S.totalHarvests;
  const av = $('farmerAv');
  if (av) av.innerHTML = farmerArt();
  const day = $('dayLabel');
  if (day) day.textContent = `SPRING DAY ${S.streak} - ${dayWeather()}`;
  let codex = $('codex');
  if (!codex) {
    codex = document.createElement('div');
    codex.id = 'codex';
    codex.className = 'codex';
    const card = document.querySelector('#view-you .card.farmer');
    if (card && card.parentNode) card.parentNode.insertBefore(codex, card.nextSibling);
  }
  const str = S.totalHarvests, vit = S.stats.water, wis = S.streak;
  codex.innerHTML = `<h3>Character</h3><div class="statrows"><div>STR ${str} (harvests)</div><div>VIT ${vit} (waterings)</div><div>WIS ${wis} (day streak)</div></div><h3>Crop Codex</h3><div class="codex-grid">`
    + Object.values(CROPS).map(d => `<div class="codex-item ${S.level >= d.minLevel ? '' : 'locked'}"><span class="codex-art">${cropArt(d.id, 'ready', true)}</span><span>${d.name} x${S.codex[d.id] || 0}</span></div>`).join('')
    + `</div>`;
}

function openSheet() {
  const p = S.plots[activePlot];
  if (!p) { closeSheet(); return; }
  if (!p.unlocked) {
    const cost = UNLOCK_COST[activePlot] || 300;
    const short = Math.max(0, cost - S.coins);
    $('sheetTitle').textContent = `Locked plot ${activePlot + 1}`;
    $('sheetBody').innerHTML = `<div class="sheet-art">${cropArt(null, 'locked')}</div><p>Open this soil bed for <b>${cost}c</b> (you have ${S.coins}c)${short ? ` - earn ${short}c more` : ' - you can afford it!'}</p><div class="row"><button id="aUnlock" ${S.coins < cost ? 'disabled' : ''}>Unlock ${cost}c</button></div>`;
    $('aUnlock').onclick = () => { if (unlock(activePlot)) closeSheet(); else openSheet(); };
    $('sheet').classList.remove('hidden');
    return;
  }
  const info = plotInfo(p);
  if (!p.cropId) {
    $('sheetTitle').textContent = `Empty plot ${activePlot + 1} - pick a seed`;
    let html = `<p>Seeds are <b>FREE</b> - harvests earn coins. Higher levels unlock more crops:</p><div class="seedcards">`;
    Object.values(CROPS).forEach(d => {
      const lvlOk = S.level >= d.minLevel;
      const why = !lvlOk ? `Harvest to reach Lv${d.minLevel}` : `${Math.round(d.growMs / DAY)}d - sells ${d.sell}c`;
      html += `<button class="seedcard" data-crop="${d.id}" ${lvlOk ? '' : 'disabled'}><span class="seedcard-art">${cropArt(d.id, 'ready', true)}</span><span class="seedcard-name">${d.name}</span><span class="seedcard-sub">FREE - ${why}</span></button>`;
    });
    $('sheetBody').innerHTML = html + `</div>`;
    $('sheetBody').querySelectorAll('button').forEach(b => b.onclick = () => { if (plant(activePlot, b.dataset.crop)) closeSheet(); else openSheet(); });
    $('sheet').classList.remove('hidden');
    return;
  }
  const def = CROPS[p.cropId];
  $('sheetTitle').textContent = `${def.name} - ${stageLabel(info)}`;
  const artStage = info.state === 'dead' ? 'dead' : info.state === 'wilted' ? 'wilted' : info.state === 'ready-thirsty' ? 'ready' : info.state;
  const quality = p.health >= 70 ? 1 : 0.5;
  const preview = Math.round(def.sell * quality);
  const fertOn = fertActive(p, Date.now());
  const nextWaterH = Math.max(0, Math.round(((def.waterMs - (Date.now() - p.lastWateredAt)) / H) * 10) / 10);
  let actionRow = '';
  if (p.dead) {
    actionRow = `<button id="aClear" class="btn-clear">Clear withered plant</button>`;
  } else if (p.weed) {
    actionRow = `<button id="aWater" class="btn-water">Water</button><button id="aWeed" class="btn-weed">Remove weed</button>`;
  } else {
    actionRow = `<button id="aWater" class="btn-water">Water</button><button id="aFert" class="btn-fert" ${S.coins < 10 || fertOn ? 'disabled' : ''}>Fert 10c${fertOn ? ' ON' : ''}</button>`
      + (info.state.startsWith('ready') ? `<button id="aHarv" class="btn-harv">Harvest +${preview}c${quality < 1 ? ' (thirsty)' : ''}</button>` : '')
      + (!p.sprinkler ? `<button id="aSprink" class="btn-sprink" ${S.coins < 300 ? 'disabled' : ''}>Sprinkler 300c</button>` : '');
  }
  $('sheetBody').innerHTML = `
    <div class="sheet-art">${cropArt(p.cropId, artStage, !info.needsWater, info.progress)}</div>
    <p>Progress ${Math.round(info.progress * 100)}% | Health ${Math.round(p.health)}${p.weed ? ' | Weeds! Remove to grow happy.' : ''}</p>
    <p class="muted">${p.sprinkler ? 'Sprinkler installed - never goes thirsty. Weeds and harvests still need you!' : info.needsWater ? 'Thirsty - water now or health drops.' : `Watered. Needs water again in ~${nextWaterH}h.`}${quality < 1 && info.state.startsWith('ready') ? ' Dry harvest pays half.' : ''}</p>
    <div class="row">${actionRow}</div>`;
  const aw = $('aWater'); if (aw) aw.onclick = () => { water(activePlot); openSheet(); };
  const af = $('aFert'); if (af) af.onclick = () => { fertilize(activePlot); openSheet(); };
  const as = $('aSprink'); if (as) as.onclick = () => { buySprinkler(activePlot); openSheet(); };
  const h = $('aHarv'); if (h) h.onclick = () => { harvest(activePlot); closeSheet(); };
  const c = $('aClear'); if (c) c.onclick = () => { clearPlot(activePlot); closeSheet(); };
  const w = $('aWeed'); if (w) w.onclick = () => { p.weed = false; addXp(2); save(); render(); openSheet(); };
  $('sheet').classList.remove('hidden');
}

function closeSheet() { $('sheet').classList.add('hidden'); }

// nav
document.querySelectorAll('.tabbar button').forEach(b => b.onclick = () => {
  document.querySelectorAll('.tabbar button').forEach(x => x.classList.remove('active'));
  document.querySelectorAll('.view').forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  $('view-' + b.dataset.view).classList.add('active');
});
$('sheetClose').onclick = closeSheet;
$('sheet').addEventListener('click', e => { if (e.target.id === 'sheet') closeSheet(); });

$('claimStreak').onclick = () => {
  if (S.tasks.claimed) return;
  S.tasks.claimed = true;
  S.coins += Math.min(50, S.streak * 5);
  save(); render();
};
$('waterAll').onclick = () => {
  let n = 0;
  S.plots.forEach((p, i) => {
    if (p.cropId && !p.dead && plotInfo(p).needsWater) { water(i); n++; }
  });
  if (n === 0) alert('No thirsty crops right now.');
};
function fastForward(ms) {
  S.plots.forEach(p => {
    if (p.cropId) { p.plantedAt -= ms; p.lastWateredAt -= ms; if (p.fertilizedAt) p.fertilizedAt -= ms; }
  });
  S.lastSeen -= ms;
  tick(Date.now());
  render();
}
$('ff8').onclick = () => fastForward(8 * H);
$('ff24').onclick = () => fastForward(24 * H);
$('reset').onclick = () => { if (confirm('Reset farm?')) { localStorage.removeItem(SAVE_KEY); S = defaultState(); save(); render(); } };

// boot
window.addEventListener('error', (e) => {
  try {
    const box = document.getElementById('errbox');
    if (box) { box.classList.remove('hidden'); box.textContent = 'Error: ' + (e.message || 'unknown'); }
  } catch { /* noop */ }
});
tick();
render();
setInterval(() => { tick(); render(); }, 30000);
