// SimFarm MVP - daily-care farm engine
const H = 3600e3;
const DAY = 24 * H;

const CROPS = {
  lettuce: { id: 'lettuce', name: 'Lettuce', sell: 15,  xp: 10, growMs: 48*H,  waterMs: 18*H, minLevel: 1, desc: '2 days, easy' },
  carrot:  { id: 'carrot',  name: 'Carrot',  sell: 30,  xp: 20, growMs: 72*H,  waterMs: 18*H, minLevel: 2, desc: '3 days' },
  tomato:  { id: 'tomato',  name: 'Tomato',  sell: 60,  xp: 35, growMs: 96*H,  waterMs: 12*H, minLevel: 3, desc: '4 days, thirsty' },
  pumpkin: { id: 'pumpkin', name: 'Pumpkin', sell: 140, xp: 80, growMs: 168*H, waterMs: 24*H, minLevel: 5, desc: '7 days, valuable' },
};

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
function cropArt(cropId, stage, wet) {
  // R = helper: x,y,w,h,color -> pixel rect
  const R = (x, y, w, h, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`;
  const soil = soilArt(!!wet);
  const open = (inner) => `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges"><g class="sway">${soil}${inner}</g></svg>`;
  const flat = (inner) => `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">${inner}</svg>`;
  if (stage === 'locked') return flat(R(0, 0, 16, 16, '#4a4a4a') + R(0, 0, 16, 2, '#666') + iconArt('lock').replace(/<\/?svg[^>]*>/g, ''));
  if (stage === 'empty') return flat(soil + R(6, 7, 4, 1, '#3d2b1a') + R(7, 6, 2, 3, '#3d2b1a') + R(3, 9, 2, 1, '#6b4426') + R(11, 10, 2, 1, '#6b4426'));
  if (stage === 'seed') return open(R(3, 10, 3, 2, '#2b1e12') + R(4, 11, 2, 1, '#5a3d24') + R(7, 10, 3, 2, '#2b1e12') + R(8, 11, 2, 1, '#6b4426') + R(11, 10, 2, 2, '#2b1e12') + R(4, 10, 1, 1, '#c08a4e'));
  if (stage === 'sprout') return open(R(7, 7, 2, 6, '#1e4a22') + R(7, 7, 1, 6, '#2d5a27') + R(3, 6, 4, 3, '#2b4a1e') + R(3, 6, 4, 2, '#7ed957') + R(9, 6, 4, 3, '#2b4a1e') + R(9, 6, 4, 2, '#5fbf3f') + R(3, 6, 1, 1, '#d6f5b0'));
  if (stage === 'dead') return open(R(6, 4, 1, 7, '#4a4a4a') + R(9, 4, 1, 7, '#4a4a4a') + R(4, 6, 8, 1, '#555') + R(5, 9, 2, 2, '#333') + R(9, 9, 2, 2, '#333') + R(12, 3, 1, 1, '#222') + R(13, 4, 2, 1, '#222'));
  if (stage === 'wilted') return open(R(7, 7, 2, 6, '#5a4e2e') + R(2, 8, 5, 3, '#6b5a35') + R(2, 8, 5, 1, '#a08b4d') + R(9, 9, 5, 3, '#5a4a2c') + R(9, 9, 5, 1, '#8a7640'));
  const blink = R(1, 1, 1, 1, '#fff') + R(14, 1, 2, 1, '#fff') + R(14, 3, 1, 2, '#fff') + R(1, 4, 1, 2, '#fff');
  // strong dark outlines behind each sprite so silhouettes read at small size (Stardew rule)
  if (cropId === 'lettuce') {
    if (stage === 'growing') return open(R(4, 6, 8, 7, '#223d18') + R(5, 7, 6, 5, '#3f7a2b') + R(5, 7, 6, 2, '#5fbf3f') + R(6, 6, 4, 2, '#7ed957') + R(6, 6, 1, 1, '#d6f5b0'));
    return open(R(2, 4, 12, 9, '#223d18') + R(3, 6, 10, 6, '#3f7a2b') + R(3, 6, 10, 3, '#5fbf3f') + R(5, 5, 6, 3, '#7ed957') + R(6, 7, 4, 4, '#e8f7c8') + R(6, 7, 2, 2, '#fff') + blink);
  }
  if (cropId === 'carrot') {
    if (stage === 'growing') return open(R(5, 3, 2, 9, '#1e3a1b') + R(7, 2, 2, 10, '#1e3a1b') + R(9, 3, 2, 9, '#24401f') + R(5, 3, 1, 9, '#3a7a33') + R(7, 2, 1, 10, '#2d5a27') + R(2, 11, 4, 1, '#2b1e12'));
    return open(R(5, 2, 2, 8, '#1e3a1b') + R(7, 1, 2, 9, '#1e3a1b') + R(9, 2, 2, 8, '#24401f') + R(5, 2, 1, 8, '#55a03a') + R(7, 1, 1, 9, '#2d5a27') + R(4, 9, 8, 4, '#7a3a00') + R(5, 10, 6, 3, '#ff9f1c') + R(5, 10, 2, 3, '#ffd0a0') + R(8, 10, 1, 3, '#c96a00') + blink);
  }
  if (cropId === 'tomato') {
    if (stage === 'growing') return open(R(3, 5, 10, 8, '#1e3a1b') + R(4, 6, 8, 6, '#2d5a27') + R(4, 6, 8, 2, '#4da636') + R(7, 4, 2, 2, '#2d5a27'));
    return open(R(3, 5, 10, 8, '#1e3a1b') + R(4, 6, 8, 6, '#2d5a27') + R(4, 6, 8, 2, '#5fbf3f') + R(4, 8, 3, 3, '#5a1016') + R(9, 8, 3, 3, '#5a1016') + R(6, 6, 4, 4, '#5a1016') + R(4, 8, 3, 3, '#e63946') + R(9, 8, 3, 3, '#e63946') + R(6, 6, 4, 4, '#ff5964') + R(4, 8, 1, 1, '#fff') + R(6, 6, 1, 1, '#fff') + R(9, 8, 1, 1, '#ffb3ba') + blink);
  }
  // pumpkin
  if (stage === 'growing') return open(R(1, 10, 14, 2, '#1e3a1b') + R(5, 8, 6, 4, '#223d18') + R(6, 9, 4, 3, '#7ab648') + R(6, 9, 2, 1, '#c6f09a') + R(7, 7, 2, 2, '#2d5a27'));
  return open(R(1, 10, 14, 2, '#1e3a1b') + R(2, 5, 12, 8, '#5a2a00') + R(3, 6, 10, 6, '#ff6b18') + R(3, 6, 10, 2, '#ffb37a') + R(5, 6, 1, 6, '#c94f00') + R(7, 6, 2, 6, '#e05a00') + R(10, 6, 1, 6, '#c94f00') + R(7, 4, 2, 3, '#1e3a1b') + R(7, 4, 2, 2, '#4da636') + R(3, 6, 2, 1, '#fff') + blink);
  return open(R(5, 8, 6, 4, '#7ed957'));
}
function farmerArt() {
  return `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges"><rect x="4" y="2" width="8" height="3" fill="#e8c33a"/><rect x="2" y="5" width="12" height="2" fill="#c9a227"/><rect x="5" y="7" width="6" height="5" fill="#f0c8a0"/><rect x="5" y="9" width="2" height="1" fill="#222"/><rect x="9" y="9" width="2" height="1" fill="#222"/><rect x="4" y="12" width="8" height="4" fill="#3a7ad9"/><rect x="7" y="12" width="2" height="4" fill="#2b5aa0"/></svg>`;
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
    plots.push({ unlocked: i < 6, cropId: null, plantedAt: 0, lastWateredAt: 0, fertilizedAt: 0, health: 100, dead: false, weed: false });
  }
  return {
    coins: 100, xp: 0, level: 1,
    streak: 1, lastVisitDate: todayStr(), lastSeen: Date.now(),
    totalHarvests: 0, codex: {}, stats: { water: 0, plant: 0 },
    plots,
    tasks: { date: todayStr(), water: 0, plant: 0, harvest: 0, claimed: false },
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
    return s;
  } catch { return defaultState(); }
}
function save() { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); }

function xpNeeded() { return S.level * 100; }
function addXp(n) {
  S.xp += n;
  while (S.xp >= xpNeeded()) { S.xp -= xpNeeded(); S.level++; }
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
    S.tasks = { date: today, water: 0, plant: 0, harvest: 0, claimed: false };
    // daily weeds: 15% per growing plot
    S.plots.forEach(p => {
      if (p.unlocked && p.cropId && !p.dead && Math.random() < 0.15) p.weed = true;
    });
  }
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
  return `While you were away (${sinceH}h): ${ready} ready, ${thirsty} thirsty, ${dead} dead.`;
}

// --- actions ---
let activePlot = -1;

function plant(idx, cropId) {
  const p = S.plots[idx], def = CROPS[cropId];
  if (!p || !p.unlocked) { alert('That plot is locked.'); return false; }
  if (p.cropId) { alert('Something already grows here.'); return false; }
  if (!def) return false;
  if (S.level < def.minLevel) { alert(`${def.name} needs Lv${def.minLevel} (you are Lv${S.level}). Harvest Lettuce to earn XP!`); return false; }
  // seeds are free - the risk is your time and daily care, never your wallet
  const now = Date.now();
  Object.assign(p, { cropId, plantedAt: now, lastWateredAt: now, health: 100, dead: false, weed: false, fertilizedAt: 0 });
  S.tasks.plant++;
  S.stats.plant++;
  addXp(2);
  floatText('Planted!');
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
  const tipTxt = planted === 0 ? 'Welcome, Sproutling! Seeds are FREE - tap an empty soil ring to plant Lettuce (more crops unlock as you level up).' : dead > 0 ? `${dead} crop(s) withered. Tap it, then Clear.` : ready > 0 ? `${ready} crop(s) READY - tap to harvest!` : thirsty > 0 ? `${thirsty} crop(s) need water - look for blue WATER badges.` : 'All crops look good. Check back tomorrow.';
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
    if (!p.unlocked) {
      b.classList.add('locked');
      b.innerHTML = `<div class="art">${cropArt(null, 'locked')}</div><div class="cname">Locked</div><div class="stage">${UNLOCK_COST[i] || 300}c to open</div>`;
    } else if (!p.cropId) {
      b.innerHTML = `<div class="art">${cropArt(null, 'empty', false)}</div><div class="cname">Empty soil</div><div class="stage">TAP TO PLANT</div>`;
    } else {
      const def = CROPS[p.cropId];
      const pct = Math.round(info.progress * 100);
      const wet = !info.needsWater;
      const artStage = info.state === 'dead' ? 'dead' : info.state === 'wilted' ? 'wilted' : info.state === 'ready-thirsty' ? 'ready' : info.state;
      const hearts = Math.ceil(p.health / 20);
      const hpRow = info.state === 'dead' ? '<span class="badge hp">WITHERED</span>' : `<span class="badge hp" title="health">${'♥'.repeat(hearts)}${'♡'.repeat(5 - hearts)} ${Math.round(p.health)}</span>`;
      const badges = `${info.needsWater && !p.dead ? `<span class="badge water"><i class="mini">${iconArt('drop')}</i>WATER</span>` : ''}${p.weed ? `<span class="badge weed"><i class="mini">${iconArt('weed')}</i>WEED</span>` : ''}${fertActive(p, now) ? `<span class="badge boost"><i class="mini">${iconArt('boost')}</i>BOOST</span>` : ''}${hpRow}`;
      b.innerHTML = `<div class="art ${wet ? 'wet' : 'dry'}">${cropArt(p.cropId, artStage, wet)}</div>
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
  $('sheet').classList.remove('hidden');
  if (!p.unlocked) {
    const cost = UNLOCK_COST[activePlot] || 300;
    const short = Math.max(0, cost - S.coins);
    $('sheetTitle').textContent = `Locked plot ${activePlot + 1}`;
    $('sheetBody').innerHTML = `<div class="sheet-art">${cropArt(null, 'locked')}</div><p>Open this soil bed for <b>${cost}c</b> (you have ${S.coins}c)${short ? ` - earn ${short}c more` : ' - you can afford it!'}</p><div class="row"><button id="aUnlock" ${S.coins < cost ? 'disabled' : ''}>Unlock ${cost}c</button></div>`;
    $('aUnlock').onclick = () => { if (unlock(activePlot)) closeSheet(); else openSheet(); };
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
      + (info.state.startsWith('ready') ? `<button id="aHarv" class="btn-harv">Harvest +${preview}c${quality < 1 ? ' (thirsty)' : ''}</button>` : '');
  }
  $('sheetBody').innerHTML = `
    <div class="sheet-art">${cropArt(p.cropId, artStage, !info.needsWater)}</div>
    <p>Progress ${Math.round(info.progress * 100)}% | Health ${Math.round(p.health)}${p.weed ? ' | Weeds! Remove to grow happy.' : ''}</p>
    <p class="muted">${info.needsWater ? 'Thirsty - water now or health drops.' : `Watered. Needs water again in ~${nextWaterH}h.`}${quality < 1 && info.state.startsWith('ready') ? ' Dry harvest pays half.' : ''}</p>
    <div class="row">${actionRow}</div>`;
  const aw = $('aWater'); if (aw) aw.onclick = () => { water(activePlot); openSheet(); };
  const af = $('aFert'); if (af) af.onclick = () => { fertilize(activePlot); openSheet(); };
  const h = $('aHarv'); if (h) h.onclick = () => { harvest(activePlot); closeSheet(); };
  const c = $('aClear'); if (c) c.onclick = () => { clearPlot(activePlot); closeSheet(); };
  const w = $('aWeed'); if (w) w.onclick = () => { p.weed = false; addXp(2); save(); render(); openSheet(); };
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
tick();
render();
setInterval(() => { tick(); render(); }, 30000);
