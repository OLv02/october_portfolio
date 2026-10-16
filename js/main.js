// The conductor. Maps scroll to a five-act flight that runs underneath the page:
//   globe → dive into Ottawa → tunnel (under About, Work, Highlights) → through the sun → the vault opens → the rest of the page
// and keeps every screen size, from a phone held upright to a wide desktop, composed.
import * as THREE from './vendor/three.module.min.js';
import Lenis from './vendor/lenis.mjs';
import { TUN, pathPos, pathBank } from './path.js';
import { TIERS, detectDevice, AdaptiveQuality } from './quality.js';
import { mulberry32, buildMain, buildPlant, PLANT_VARIANTS } from './build-data.js';
import { createMainSystem, createOccluder, createSeedAtlas, setSeedCount, createGround } from './particles.js';
import { Sky } from './sky.js';
import { Post } from './post.js';
import { Sound } from './audio.js';
import { computeLayout } from './layout.js';
import { GLOBE } from './globe-meta.js';
import { initSite, layoutTop } from './site.js';
import { t, locale, onLangChange, beforeLangChange } from './i18n.js';
import { bgHex, THEME, SKY } from './theme.js';
import { CONFIG, PROFILES, TIER_SEEDS, profileFor } from './config.js';

THREE.ColorManagement.enabled = false;

// boot.js waits for this; if it already fell back to the plain page, the scene stays off
window.__siteLive = true;
if (window.__siteStatic) await new Promise(() => {});

const Q = new URLSearchParams(location.search);
const SHOT = Q.has('shot') && !Q.has('live');
const LIVE = Q.has('shot') && Q.has('live');
const EMBED = Q.has('embed'); // running inside devices.html
const device = detectDevice();
const REDUCED = device.reducedMotion;
const S0 = 2.3, K_SIZE = 0.24, L = TUN.L;

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const seg = (x, a, b) => clamp01((x - a) / (b - a));
const sm = (a, b, x) => { const t = seg(x, a, b); return t * t * (3 - 2 * t); };
const ease = (t) => t * t * (3 - 2 * t);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const lerp = (a, b, t) => a + (b - a) * t;
const $ = (id) => document.getElementById(id);

// ---------- renderer ----------
const canvas = $('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
renderer.setClearColor(bgHex, 1);
const gl = renderer.getContext();
// Software-only graphics (a remote desktop, a VM, a blocklisted GPU) draw the scene on the CPU, so start at the lightest tier
const gpuName = (() => { const x = gl.getExtension('WEBGL_debug_renderer_info'); return x ? String(gl.getParameter(x.UNMASKED_RENDERER_WEBGL)) : ''; })();
if (/swiftshader|llvmpipe|softpipe|software|basic render/i.test(gpuName) && !Q.get('tier')) { device.start = 'low'; device.sample = 'low'; device.canPromote = false; }
const hdrType = gl.getExtension('EXT_color_buffer_float') || gl.getExtension('EXT_color_buffer_half_float') ? THREE.HalfFloatType : THREE.UnsignedByteType;
const maxPointHW = (gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE) || [1, 64])[1];

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, 1, 0.05, 1200);
const R = mulberry32(2026);
let tier = TIERS[device.start];
const sampleTier = TIERS[device.sample];

// ---------- world anchors ----------
const eye = new THREE.Vector3(GLOBE.eye[0] * S0, GLOBE.eye[1] * S0, -0.1);   // Ottawa
const vaultCenter = eye.clone().add(new THREE.Vector3(0, 0, -(L + TUN.sunGap + TUN.vaultGap)));

// ---------- always-on layers (render behind the loading gate) ----------
const post = new Post(renderer, hdrType);
const sky = new Sky(renderer, sampleTier, hdrType, R, SKY, post.u.uExposure.value);
sky.addTo(scene);
sky.setDust(tier.dust);
const ground = createGround(post.u.uExposure.value);
scene.add(ground.mesh);
post.u.uTaps.value = REDUCED ? 0 : tier.zoomTaps;
post.u.uGrain.value = device.coarse ? 0.028 : 0.035;
const sound = new Sound();
// the device lab passes the safe-area insets a real phone would report
if (EMBED && Q.get('safe')) Q.get('safe').split(',').forEach((v, i) => document.documentElement.style.setProperty(['--safe-t', '--safe-r', '--safe-b', '--safe-l'][i], (+v || 0) + 'px'));

let mainSys = null, occluder = null;
// The live copy of the settings: the committed defaults from config.js, plus the device profile's seed look
const tune = { ...structuredClone(CONFIG), profileName: profileFor({ phone: device.phone, width: innerWidth }) };
Object.assign(tune, { profile: { ...PROFILES[tune.profileName] } });
const seedBudget = () => Math.min(tune.profile.seeds, TIER_SEEDS[tier.name] || tune.structure.capacity, tune.structure.capacity);

// ---------- scroll → flight: beats anchored to the page, so the words and the flight stay in step ----------
// [scroll y, flight progress]: the hero holds · dive into the eye · the tunnel runs under About, Work and Projects ·
// through the sun · the vault opens · then the rest of the page scrolls over the open vault (progress 1, "extra" screens)
const flightEl = $('flight'), vaultBeat = $('beat-vault'), afterEl = $('after');
let beats = [[0, 0], [1, 1]];
const docTop = (el) => el.getBoundingClientRect().top + scrollY;
function computeBeats() {
  const vh = innerHeight, fTop = docTop(flightEl), fEnd = fTop + flightEl.offsetHeight;
  const k = [[0, 0], [0.25 * vh, 0.05], [fTop - 0.62 * vh, 0.22], [fEnd - 0.35 * vh, 0.66], [docTop(vaultBeat) - 0.1 * vh, 0.72], [docTop(afterEl) - 0.82 * vh, 1]];
  for (let i = 1; i < k.length; i++) k[i][0] = Math.max(k[i][0], k[i - 1][0] + 1);
  beats = k;
}
function progressAt(y) {
  const last = beats[beats.length - 1];
  if (y >= last[0]) return { p: 1, ex: (y - last[0]) / innerHeight };
  for (let i = 1; i < beats.length; i++) {
    if (y < beats[i][0]) { const [y0, p0] = beats[i - 1], [y1, p1] = beats[i]; return { p: p0 + ((y - y0) / (y1 - y0)) * (p1 - p0), ex: 0 }; }
  }
  return { p: 0, ex: 0 };
}
function scrollFor(p, ex = 0) {
  const last = beats[beats.length - 1];
  if (p >= 1) return last[0] + ex * innerHeight;
  for (let i = 1; i < beats.length; i++) {
    if (p <= beats[i][1]) { const [y0, p0] = beats[i - 1], [y1, p1] = beats[i]; return y0 + ((p - p0) / (p1 - p0 || 1)) * (y1 - y0); }
  }
  return 0;
}
if (window.ResizeObserver) new ResizeObserver(() => computeBeats()).observe(flightEl);

// ---------- sizing: stable on iOS (ignore the address bar sliding in and out) ----------
const lvh = $('lvh');
const heroEl = $('hero');
let W = 0, H = 0, dpr = 1, layout = null, dprCap = +Q.get('dpr') || 9;
function resize(force) {
  const w = innerWidth, h = Math.max(innerHeight, lvh.getBoundingClientRect().height || 0);
  if (!force && w === W && Math.abs(h - H) < 140) return;
  W = w; H = h;
  document.documentElement.style.setProperty('--vhs', innerHeight + 'px');
  dpr = Math.min(window.devicePixelRatio || 1, tier.dpr, dprCap);
  renderer.setPixelRatio(dpr);
  renderer.setSize(W, H, false);
  post.setSize(Math.round(W * dpr), Math.round(H * dpr), tier.bloom);
  camera.aspect = W / H;
  const eb = heroEl.firstElementChild.getBoundingClientRect(), hb = document.querySelector('.chrome').getBoundingClientRect();
  layout = computeLayout(W, H, S0, vaultCenter, { textTop: eb.top - (parseFloat(heroEl.style.transform.split(',')[1]) || 0), headerBottom: hb.bottom + 8 }, { scale: tune.plant.scale, right: tune.landing.plantRight });
  computeBeats();
}
addEventListener('resize', () => resize(false));
// the page uses system fonts now, but re-frame the globe if any font does load late
if (document.fonts) { document.fonts.ready.then(() => resize(true)); document.fonts.addEventListener('loadingdone', () => resize(true)); }
addEventListener('orientationchange', () => setTimeout(() => resize(true), 250));
resize(true);

function applyTier(t) {
  tier = t;
  if (mainSys) setSeedCount(mainSys, seedBudget());
  sky.setDust(Math.min(t.dust, sampleTier.dust));
  post.u.uTaps.value = REDUCED ? 0 : t.zoomTaps;
  resize(true);
  $('q').textContent = t.name; if (Q.has('debug')) $('q').hidden = false;
}
const aq = new AdaptiveQuality(device, applyTier);

// Rebuild the daisy targets for another variant (?tune only), for the seeds and their attached points together
function rebuildPlant() {
  if (!mainSys) return;
  const g = mainSys.geometry, n = mainSys.total, K = mainSys.kids.geometry.attributes.aLock.count / n;
  const lock = g.attributes.aLock.array, plant = g.attributes.aPlant.array;
  const roles = Float32Array.from({ length: n }, (_, i) => plant[i * 4 + 3]);
  buildPlant(n, lock, plant, tune.plant.variant);
  for (let i = 0; i < n; i++) plant[i * 4 + 3] = roles[i];
  for (const [geo, src] of [[g, null], [mainSys.kids.geometry, true]]) {
    if (src) for (const [name, arr] of [['aLock', lock], ['aPlant', plant]]) {
      const out = geo.attributes[name].array;
      for (let i = 0; i < n; i++) for (let j = 0; j < K; j++) out.set(arr.subarray(i * 4, i * 4 + 4), (i * K + j) * 4);
    }
    geo.attributes.aLock.needsUpdate = true; geo.attributes.aPlant.needsUpdate = true;
  }
}

// ?tune opens the hidden tuning panel (js/tune.js): live sliders for every setting in config.js
if (Q.has('tune')) {
  import('./tune.js').then(({ initTune }) => {
    const recount = () => { if (mainSys) setSeedCount(mainSys, seedBudget()); };
    initTune(tune, {
      info: () => `${tune.profileName} profile · ${mainSys ? mainSys.count : 0} of ${tune.structure.capacity} seeds drawn (${tier.name} tier caps at ${TIER_SEEDS[tier.name]}) · ` +
        `DPR ${dpr} · point cap ${Math.min(64 * dpr, maxPointHW)}px · linear output, colour management off`,
      onCount: recount, onLayout: () => resize(true), onPlant: rebuildPlant,
    });
    recount(); rebuildPlant(); resize(true);
  }).catch((e) => console.error(e));
}

// ---------- smooth scroll on desktop; native momentum on touch ----------
let lenis = null;
if (!device.coarse && !REDUCED && !SHOT && !EMBED) {
  lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9 });
  lenis.stop();
}
// jumping to a section flies through whatever lies between, at a pace that grows with the distance
function scrollToTarget(target) {
  const y = typeof target === 'number' ? target : layoutTop(target) - (parseFloat(getComputedStyle(target).scrollMarginTop) || 0);
  if (lenis) lenis.scrollTo(y, { duration: Math.min(3.4, 1 + (Math.abs(y - scrollY) / innerHeight) * 0.22) });
  else window.scrollTo({ top: y, behavior: REDUCED ? 'auto' : 'smooth' });
}
const site = initSite({ scrollTo: scrollToTarget, lockScroll: (on) => { if (lenis) { if (on) lenis.stop(); else lenis.start(); } } });

// ---------- loading: fetch the globe image with real progress, build in a worker ----------
const gateFill = $('gate-fill'), gatePct = $('gate-pct'), gateCount = $('gate-count');
const STARS = seedBudget(), fmtN = (n) => n.toLocaleString(locale());
function gateText() {
  const [a, b = ''] = t('Gathering {n} seeds').split('{n}'), n = document.createElement('b');
  n.id = 'gate-n'; n.textContent = fmtN(STARS);
  $('gate-text').replaceChildren(a, n, b);
}
gateText();
function progress(f) {
  gateFill.style.transform = `scaleX(${f})`;
  gatePct.textContent = Math.round(f * 100) + '%';
  gateCount.textContent = `${fmtN(Math.round(f * STARS))} / ${fmtN(STARS)}`;
}

async function loadImage(url) {
  const res = await fetch(url);
  const blob = await res.blob();
  let bmp;
  try { bmp = await createImageBitmap(blob, { premultiplyAlpha: 'none', colorSpaceConversion: 'none' }); }
  catch (e) { bmp = await createImageBitmap(blob); }
  const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height;
  const x = c.getContext('2d', { willReadFrequently: true });
  x.drawImage(bmp, 0, 0);
  return x.getImageData(0, 0, c.width, c.height).data;
}
async function loadGlobe() {
  const res = await fetch('assets/globe.png');
  const total = +res.headers.get('content-length') || 497569;
  const chunks = []; let got = 0;
  if (res.body && res.body.getReader) {
    const rd = res.body.getReader();
    for (;;) { const { done, value } = await rd.read(); if (done) break; chunks.push(value); got += value.length; progress(0.7 * Math.min(1, got / total)); }
  } else { chunks.push(new Uint8Array(await res.arrayBuffer())); }
  const blob = new Blob(chunks, { type: 'image/png' });
  let bmp;
  try { bmp = await createImageBitmap(blob, { premultiplyAlpha: 'none', colorSpaceConversion: 'none' }); }
  catch (e) { bmp = await createImageBitmap(blob); }
  const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height;
  const x = c.getContext('2d', { willReadFrequently: true });
  x.drawImage(bmp, 0, 0);
  return { pixels: x.getImageData(0, 0, c.width, c.height).data, w: c.width, h: c.height, canvas: c };
}

function buildData(pix, coast) {
  const args = { pixels: pix.pixels, coast, w: pix.w, h: pix.h, meta: GLOBE, N: tune.structure.capacity, S0, coastShare: tune.globe.coastShare, roles: tune.landing.roles, variant: tune.plant.variant };
  const inline = () => ({ main: buildMain(args) });
  if (SHOT || !window.Worker) return Promise.resolve(inline());
  return new Promise((resolve) => {
    let wk;
    try { wk = new Worker(new URL('./build-worker.js', import.meta.url), { type: 'module' }); }
    catch (e) { resolve(inline()); return; }
    let tick = 0.7;
    const iv = setInterval(() => { tick = Math.min(0.97, tick + 0.02); progress(tick); }, 60);
    wk.onmessage = (e) => { clearInterval(iv); wk.terminate(); resolve(e.data); };
    wk.onerror = () => { clearInterval(iv); wk.terminate(); resolve(inline()); };
    wk.postMessage(args);
  });
}

let ready = false;
(async () => {
  try {
    const [pix, coast] = await Promise.all([loadGlobe(), loadImage('assets/coast.png').catch(() => null)]);
    const data = await buildData(pix, coast && coast.length === pix.pixels.length ? coast : null);
    mainSys = createMainSystem(data.main, seedBudget(), eye, createSeedAtlas(mulberry32(411)));
    const tex = new THREE.CanvasTexture(pix.canvas); tex.flipY = false; tex.generateMipmaps = false; tex.minFilter = THREE.LinearFilter;
    occluder = createOccluder(tex, GLOBE, S0, THEME.forest.map((c) => (-Math.log(1 - c) / post.u.uExposure.value) * 0.6));
    scene.add(mainSys.points, mainSys.kids, occluder);
    if (Q.has('tune')) rebuildPlant();   // a remembered ?tune variant may have arrived after the worker started
    applyTier(tier);
    progress(1);
    ready = true;
    $('gate').classList.add('ready');
    if (SHOT || LIVE || EMBED) { if (!Q.has('gate')) enter(); }
    else setTimeout(enter, 1000);   // "Look closer." has a moment on screen, then the stars condense into the globe
  } catch (err) {
    console.error(err);
    paused = true;
    if (window.__siteFallback) window.__siteFallback('the scene could not be built');
  }
})();

// ---------- entering ----------
let entered = false, introStart = 0, T = 0;
function enableTilt() {
  // iOS only allows tilt behind a permission prompt; rather than interrupt, those phones get the touch lens alone
  if (typeof DeviceOrientationEvent === 'undefined' || typeof DeviceOrientationEvent.requestPermission === 'function') return;
  addEventListener('deviceorientation', (e) => {
    if (e.gamma == null) return;
    tilt.tx = Math.max(-1, Math.min(1, e.gamma / 28));
    tilt.ty = Math.max(-1, Math.min(1, (e.beta - 50) / 28));
  });
}
function enter() {
  if (entered || !ready) return;
  entered = true;
  window.__siteEntered = true;
  if (device.coarse && !SHOT && !EMBED) enableTilt();
  $('gate').classList.add('gone');
  if (SHOT) $('gate').style.display = 'none';
  document.documentElement.classList.remove('locked');
  introStart = EMBED && Q.has('nointro') ? T - 10 : T;
  if (lenis) lenis.start();
  site.onEnter();
}
// Sound stays off until the visitor turns it on (and remembers that choice). Browsers only let audio start from a tap,
// click or key press, so once it's wanted the first one anywhere on the page wakes it.
let soundWanted = !SHOT && !EMBED && (() => { try { return localStorage.getItem('wb.sound') === '1'; } catch (e) { return false; } })();
// The button shows what you'd actually hear: bars dancing once audio is playing, steady while it waits for that first
// tap or key press, and flat when it's off.
let soundUI = '';
function setSoundUI(state) {
  if (state === soundUI) return;
  soundUI = state;
  const b = $('sound');
  b.dataset.on = state === 'on' ? '1' : state === 'armed' ? 'armed' : '0';
  soundLabel();
}
const soundLabel = () => $('sound').setAttribute('aria-label', t(soundUI === 'off' ? 'Turn sound on' : 'Mute sound'));
const soundState = () => (!soundWanted ? 'off' : sound.ctx && sound.ctx.state === 'running' && !sound.muted ? 'on' : 'armed');
setSoundUI(soundState());
const wakeSound = () => { if (soundWanted) sound.start(); };
['pointerdown', 'touchstart', 'touchend', 'keydown'].forEach((ev) => addEventListener(ev, wakeSound, { capture: true, passive: true }));
$('sound').addEventListener('click', () => {
  soundWanted = !soundWanted;
  try { localStorage.setItem('wb.sound', soundWanted ? '1' : '0'); } catch (e) { /* private mode */ }
  if (soundWanted) { sound.start(); sound.setMuted(false); } else sound.setMuted(true);
  setSoundUI(soundState());
});

// ---------- your touch ----------
const pointer = { ndc: new THREE.Vector2(), has: false, last: -9, world: new THREE.Vector3(), strength: 0 };
const tilt = { x: 0, y: 0, tx: 0, ty: 0 };
let interactPlane = 0;
function setPointer(x, y) { pointer.ndc.set((x / W) * 2 - 1, -((y / H) * 2 - 1)); pointer.has = true; pointer.last = T; }
// a tap breathes on the seeds under it (the pointer's breeze, briefly at full strength)
function tap(target) {
  if (!entered || (target && target.closest && target.closest('a,button,#gate,#menu,.content'))) return;
  pointer.last = T;
}
addEventListener('pointermove', (e) => {
  if (e.pointerType === 'touch') return;
  setPointer(e.clientX, e.clientY);
  if (EMBED && device.coarse) { tilt.tx = pointer.ndc.x; tilt.ty = -pointer.ndc.y; } // the lab's mouse stands in for tilting the phone
}, { passive: true });
if (EMBED) document.documentElement.addEventListener('pointerleave', () => { tilt.tx = tilt.ty = 0; });
addEventListener('pointerdown', (e) => { if (e.pointerType !== 'touch') { setPointer(e.clientX, e.clientY); tap(e.target); } }, { passive: true });
// a tap is short and still; a swipe that starts a scroll is neither
let touch0 = null;
addEventListener('touchstart', (e) => { const t = e.touches[0]; if (t) { setPointer(t.clientX, t.clientY); touch0 = { x: t.clientX, y: t.clientY, t: performance.now(), target: e.target }; } }, { passive: true });
addEventListener('touchend', (e) => {
  const t = e.changedTouches[0];
  if (t && touch0 && performance.now() - touch0.t < 350 && Math.hypot(t.clientX - touch0.x, t.clientY - touch0.y) < 12) tap(touch0.target);
  touch0 = null;
}, { passive: true });
addEventListener('touchmove', (e) => { const t = e.touches[0]; if (t) setPointer(t.clientX, t.clientY); }, { passive: true });
const _ray = new THREE.Vector3();
function pointerWorld(out) {
  _ray.set(pointer.ndc.x, pointer.ndc.y, 0.5).unproject(camera).sub(camera.position).normalize();
  const t = (interactPlane - camera.position.z) / (_ray.z || -1e-4);
  return out.copy(camera.position).addScaledVector(_ray, Math.max(0, t));
}

// ---------- DOM bits ----------
const hintEl = $('hint'), ottawaEl = $('ottawa');
const hintText = () => { hintEl.firstElementChild.textContent = t(device.coarse ? 'Swipe to explore' : 'Scroll to explore'); };
hintText();

// Switching language changes how tall the text is, so keep the reader on the same card and re-pin the flight to it.
let langAnchor = null;
beforeLangChange(() => {
  langAnchor = null;
  if (scrollY < 40) return;
  const line = scrollY + innerHeight * 0.2;
  const el = [...document.querySelectorAll('main :is(.sec-head, h3, h4, p, li, figure), .beat')].find((e) => e.offsetHeight && layoutTop(e) + e.offsetHeight > line);
  if (el) langAnchor = { el, off: layoutTop(el) - scrollY };
});
onLangChange(() => {
  gateText(); hintText(); soundLabel();
  resize(true);
  if (!langAnchor) return;
  const y = Math.max(0, layoutTop(langAnchor.el) - langAnchor.off);
  if (lenis) lenis.scrollTo(y, { immediate: true, force: true }); else window.scrollTo(0, y);
  langAnchor = null;
});
const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && e.target.classList.add('in')), { threshold: 0.15 });
document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

// ---------- the flight ----------
let gateFade = SHOT ? 1 : 0, pS = 0, extra = 0, prevCam = new THREE.Vector3(), spd = 0;
let windT = 12;   // the seeds' own clock: it runs at the selected wind speed, separately from the camera
let motion = 0, prevTravel = null;   // how much the camera is travelling through the seeds right now, 0..1
const cues = { chime: false };
const camPos = new THREE.Vector3(), camTgt = new THREE.Vector3(), tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
const fwd = new THREE.Vector3(), upV = new THREE.Vector3(), par = new THREE.Vector2();
const look = { tint: new THREE.Vector3(1, 1, 1), sky: 1, dust: 1 };
const shot = { p: +(Q.get('p') || 0), x: +(Q.get('x') || 0), t: +(Q.get('t') || 12), intro: +(Q.get('intro') ?? 1) };


function update(dt) {
  // --- progress
  let { p, ex } = progressAt(window.scrollY);
  if (SHOT) { p = shot.p; ex = shot.x; pS = p; extra = ex; }
  else { const k = 1 - Math.exp(-dt * (lenis ? 11 : 7)); pS += (p - pS) * k; extra += (ex - extra) * k; }
  if (!isFinite(pS)) pS = p;

  const introT = SHOT && entered ? shot.intro : entered ? clamp01((T - introStart) / 3.2) : 0;
  const introE = ease(introT);
  const dive = seg(pS, 0.05, 0.22), tun = seg(pS, 0.22, 0.66), sunA = seg(pS, 0.66, 0.72);
  const rev = seg(pS, 0.72, 0.79);
  // the light and landing sequence, in its own local time (the study's 0..1), mapped onto this part of the page
  const [l0, l1] = tune.segments.landing, Ls = seg(pS, l0, l1);
  const approach = sm(0.1, 0.5, Ls), lightK = sm(0.06, 0.28, Ls) * (1 - sm(0.43, 0.78, Ls)), groundK = sm(0.25, 0.5, Ls);
  const growth = clamp01((Ls - 0.3) / 0.65);
  const act = pS < 0.22 ? 'hero' : pS < 0.72 ? 'tunnel' : 'vault';
  const afterK = sm(0, 1, seg(pS, 0.94, 1) * 0.4 + extra * 0.75);
  const tunnelGate = seg(pS, 0.21, 0.25) * (1 - seg(pS, 0.68, 0.72));
  const P = tune.profile;

  // --- pointer & tilt
  interactPlane = pS < 0.12 ? 0 : camPos.z - 8;
  const recent = pointer.has && T - pointer.last < 1.4;
  pointer.strength += ((recent ? 1 : 0) - pointer.strength) * (1 - Math.exp(-dt * 5));
  if (pointer.has) pointerWorld(tmp), pointer.world.lerp(tmp, 1 - Math.exp(-dt * 12));
  tilt.x += (tilt.tx - tilt.x) * (1 - Math.exp(-dt * 4)); tilt.y += (tilt.ty - tilt.y) * (1 - Math.exp(-dt * 4));
  if (device.coarse) par.set(tilt.x, -tilt.y); else if (pointer.has) par.lerp(pointer.ndc, 1 - Math.exp(-dt * 3));
  const parK = REDUCED ? 0.3 : 1;

  // --- camera
  const Hc = layout.hero;
  let fov = layout.fov, bank = 0, sCam = -1e4;
  upV.set(0, 1, 0);
  if (pS < 0.22) {
    // Blown opening: the globe blows away while the camera eases in toward Ottawa. blowDive 0 holds and then drifts
    // in late; 1 is the full original dive. It ends exactly where the original dive ends, so the journey is unchanged.
    const blow = tune.globe.opening === 'blow', bd = tune.globe.blowDive;
    const k = blow ? Math.pow(sm(0.36 * (1 - bd), 1, dive), 1 + 0.6 * (1 - bd)) : dive, dH = Hc.pos.distanceTo(eye);
    const fovH = layout.fov, tH = Math.tan((fovH * Math.PI) / 360);
    let dist;
    if (k < 0.55) dist = dH * (1 - 0.62 * ease(k / 0.55));
    else dist = lerp(dH * 0.38, 0.32, ease((k - 0.55) / 0.45));
    tmp.copy(Hc.pos).sub(eye).normalize();
    camPos.copy(eye).addScaledVector(tmp, dist);
    tmp2.set(eye.x, eye.y, eye.z + dist);
    camPos.lerp(tmp2, ease(seg(k, 0.25, 0.9)));
    camTgt.copy(Hc.target).lerp(eye, ease(clamp01(k * (blow ? 1 + 0.8 * bd : 1.8))));
    if (REDUCED) fov = lerp(fovH, 64, ease(k));
    else if (k < 0.55) fov = Math.min(98, (2 * Math.atan((dH * tH) / dist) * 180) / Math.PI);
    else fov = lerp(Math.min(98, (2 * Math.atan(tH / 0.38) * 180) / Math.PI), 64, ease((k - 0.55) / 0.45));
    if (blow && !REDUCED) fov = lerp(lerp(fovH, 64, ease(k)), fov, bd);   // a gentler widening than the full dive
    const w = 0.42 * (1 - dive) * parK;
    camPos.x += par.x * w; camPos.y += par.y * w * 0.6;
  } else if (pS < 0.72) {
    sCam = pS < 0.66 ? -0.32 + tun * (L + 0.32) : L + sunA * 26;
    if (sCam <= L) pathPos(eye, Math.max(0, sCam), camPos); else camPos.set(eye.x, eye.y, eye.z - sCam);
    if (sCam < 0) camPos.set(eye.x, eye.y, eye.z - sCam);
    const sT = sCam + 9;
    if (sT <= L) pathPos(eye, sT, camTgt); else camTgt.set(eye.x, eye.y, eye.z - sT);
    bank = REDUCED || !tune.globe.bank ? 0 : 0.3 * pathBank(eye, Math.max(0, Math.min(L, sCam))) * seg(sCam, 2, 20);
    fov = 64 + (REDUCED ? 0 : Math.min(9, spd * 6));
    camPos.x += par.x * 0.22 * parK; camPos.y += par.y * 0.14 * parK;
  } else {
    // come out of the light and slow to rest in front of the plant
    const LF = layout.land;
    const startS = L + 26;
    tmp.set(eye.x, eye.y, eye.z - startS);
    camPos.copy(tmp).lerp(LF.pos, easeOut(rev));
    tmp2.copy(tmp); tmp2.z -= 9;
    camTgt.copy(tmp2).lerp(LF.target, easeOut(rev));
    fov = lerp(64, layout.fov, ease(rev));
    // afterwards a slow breath of a drift while the rest of the page scrolls over the daisy
    const drift = REDUCED ? 0 : afterK;
    camPos.x += Math.sin(T * 0.11) * 0.12 * drift; camPos.y += (Math.sin(T * 0.07) * 0.08 + 0.15 * Math.sin(extra * 0.6)) * drift;
    const w = 0.25 * seg(pS, 0.75, 0.8) * parK;
    camPos.x += par.x * w; camPos.y += par.y * w * 0.6;
  }
  camera.position.copy(camPos);
  if (bank) { fwd.copy(camTgt).sub(camPos).normalize(); upV.applyAxisAngle(fwd, bank); }
  camera.up.copy(upV);
  camera.lookAt(camTgt);
  camera.fov = fov;
  camera.updateProjectionMatrix();

  const camSpeed = dt > 0 ? camPos.distanceTo(prevCam) / dt : 0;
  prevCam.copy(camPos);
  spd += (Math.min(1.6, camSpeed / 45) - spd) * (1 - Math.exp(-dt * 6));
  if (SHOT) spd = 0;

  const pxScale = ((H * dpr) / (2 * Math.tan((fov * Math.PI) / 360))) * K_SIZE;
  const maxPt = Math.min(64 * dpr, maxPointHW);

  // --- the seeds
  // While the page scrolls through the journey the camera travels and the wind holds its breath; when the page
  // rests the camera holds still and the seeds drift, flutter and loop again.
  const travel = eye.z - camPos.z;
  if (prevTravel !== null && dt > 0) {
    const moving = Math.min(1, Math.abs(travel - prevTravel) / dt / tune.flight.motionSpeed);
    motion += (moving - motion) * (1 - Math.exp(-dt / tune.flight.motionEase));
  }
  prevTravel = travel;
  if (SHOT) { windT = shot.t; motion = 0; }
  else windT += dt * P.windSpeed * (1 - motion * tunnelGate) * (1 - 0.82 * approach);
  if (mainSys) {
    const U = mainSys.uniforms, G = tune.globe;
    U.uTime.value = windT; U.uIntro.value = introT;
    U.uDive.value = seg(pS, tune.segments.dive[0], tune.segments.dive[1]);
    U.uTravel.value = travel;
    gateFade += ((ready ? 1 : 0) - gateFade) * (1 - Math.exp(-dt * 1.5));
    U.uOp.value = entered ? 1 : 0.42 * gateFade;
    U.uPxScale.value = pxScale / K_SIZE; U.uMaxPt.value = maxPt; U.uDpr.value = dpr;
    U.uViewportPx.value.set(W * dpr, H * dpr);
    U.uOpening.value = G.opening === 'blow' ? 1 : 0; U.uOttawaLast.value = G.ottawaLast ? 1 : 0;
    U.uRadius.value = S0; U.uAperture.value = G.aperture; U.uGlobeBrightness.value = G.brightness * tune.render.globeGain;
    U.uCoastMode.value = G.mode === 'coast' ? 1 : 0; U.uGlobeCompact.value = G.mode === 'current' ? 0 : 1; U.uGlobeCompactScale.value = G.compactScale;
    U.uWindSize.value = P.seedSize; U.uLoops.value = P.playfulness; U.uFlutter.value = 0.35 + 0.65 * P.playfulness;
    U.uBackgroundBrightness.value = tune.look.backgroundBrightness; U.uPointStrength.value = tune.look.pointStrength;
    mainSys.kids.visible = tune.look.pointStrength > 0;
    U.uFlightHalfExtent.value.set(Math.max(tune.flight.minHalfWidth, tune.flight.halfHeight * camera.aspect), tune.flight.halfHeight);
    U.uCameraRoll.value = bank;
    U.uInteract.value = REDUCED ? 0.4 : 1;
    const LF = layout.land, Lk = tune.landing;
    U.uLand.value = Ls; U.uGrowth.value = growth;
    U.uFieldWidth.value = LF.fieldW; U.uFieldHeight.value = LF.fieldH; U.uPlantX.value = LF.plantX; U.uGroundY.value = LF.groundY;
    U.uPlantScale.value = LF.scale; U.uLandO.value.copy(LF.origin);
    U.uPlantBrightness.value = tune.plant.brightness; U.uSway.value = tune.plant.sway; U.uShowRoots.value = tune.plant.showRoots ? 1 : 0;
    U.uLeafGain.value = (PLANT_VARIANTS[tune.plant.variant] || PLANT_VARIANTS.pair).leafGain;
    U.uWarm.value = Math.min(1, (lightK + afterK * 0.18) * Lk.light); U.uLandingSpread.value = Lk.spread;
    U.uMouse.value.set(pointer.world.x, pointer.world.y, pointer.world.z, pointer.strength);
  }
  camera.updateMatrixWorld();
  if (mainSys) {
    // the three landing seeds ride along in front of the camera, where the landing framing will put them
    const U = mainSys.uniforms;
    U.uCamR.value.setFromMatrixColumn(camera.matrixWorld, 0); U.uCamU.value.setFromMatrixColumn(camera.matrixWorld, 1);
    U.uCamF.value.setFromMatrixColumn(camera.matrixWorld, 2).negate();
    U.uFromBase.value.copy(camera.position).addScaledVector(U.uCamF.value, layout.land.dist);
  }
  ground.mesh.position.set(layout.land.origin.x, layout.land.origin.y + layout.land.groundY - layout.land.fieldH * 0.17, layout.land.origin.z);
  ground.mesh.scale.set(layout.land.fieldW * 3, layout.land.fieldH * 0.34, 1);
  ground.u.uOp.value = groundK;
  ground.mesh.visible = groundK > 0.001;
  if (occluder) {
    occluder.material.uniforms.uOp.value = tune.render.occluder * sm(0.55, 1, introT) * (1 - (tune.globe.opening === 'blow' ? seg(pS, 0.07, 0.15) : seg(pS, 0.09, 0.17)));
    occluder.visible = pS < 0.2;
    // The disc sits at the globe's centre but the seeds cover the near half of the sphere, so any camera move (the dive,
    // or a phone's tilt parallax) used to slide them apart. Facing the camera and sized to the sphere's true outline
    // (radius R·d/√(d²−R²) at distance d) keeps the disc exactly behind the seeds from any viewpoint.
    if (occluder.visible) {
      occluder.lookAt(camera.position);
      const d = camera.position.distanceTo(occluder.position);
      occluder.scale.setScalar(d / Math.sqrt(Math.max(1e-6, d * d - S0 * S0)));
    }
  }


  // --- the look of each act
  const warm = sm(0.3, 0.7, pS) * (1 - sm(0.72, 0.78, pS));
  look.tint.set(1, 1, 1).lerp(tmp.set(1.07, 1.02, 0.9), warm);
  look.sky = pS < 0.72 ? lerp(1, 0.8, sm(0.2, 0.3, pS)) : lerp(0.8, 1, sm(0.72, 0.8, pS));
  look.dust = 1;
  sky.update(camera, T, dt, look);
  sky.setScale(dpr, pxScale);

  post.u.uTime.value = T;
  // bloom eases off as the daisy grows, so its petals and florets stay separate points instead of one glow
  post.u.uBloom.value = act === 'hero' ? 0.85 : act === 'tunnel' ? 1.0 : lerp(0.95, 0.22, sm(0.3, 0.8, growth));
  post.u.uZoom.value = REDUCED ? 0 : Math.min(0.09, spd * 0.055) * (act === 'vault' ? 0 : 1);
  post.u.uCA.value = REDUCED ? 0 : 0.0016 + Math.min(0.008, spd * 0.004);
  post.u.uWarm.value = Math.min(1, (lightK + afterK * 0.18) * tune.landing.light) * 0.75;
  post.u.uGain.value.set(1, 1, 1).lerp(tmp.set(1.04, 1.0, 0.93), warm);
  post.u.uLift.value.set(0, 0, 0);

  // --- sound follows the flight
  // one quiet chime as the daisy opens; it re-arms only once you have scrolled well back, so scrubbing can't repeat it
  if (growth > 0.92 && !cues.chime) { cues.chime = true; sound.chime(); }
  if (growth < 0.4) cues.chime = false;
  sound.update({ act, speed: spd, tunnel: tunnelGate, sun: lightK });
  setSoundUI(soundState());

  // --- words on screen
  const heroOp = sm(0.55, 1, introT) * (1 - sm(0.02, 0.075, pS));
  heroEl.style.opacity = heroOp.toFixed(3);
  heroEl.style.transform = `translate3d(0,${(-50 * sm(0.02, 0.075, pS)).toFixed(1)}px,0)`;
  heroEl.style.visibility = heroOp > 0.001 ? 'visible' : 'hidden';
  // the name is swept onto the screen as the seeds settle into the globe, then the title follows
  heroEl.style.setProperty('--type', sm(0.5, 0.92, introT).toFixed(3));
  heroEl.style.setProperty('--title', sm(0.78, 1, introT).toFixed(3));
  // Ottawa's name beside its mark on the globe, until the dive begins
  const geoOp = heroOp * (1 - sm(0.0, 0.06, pS)) * (layout.upright && W < 360 ? 0 : 1);
  ottawaEl.style.opacity = geoOp.toFixed(3);
  ottawaEl.style.visibility = geoOp > 0.001 ? 'visible' : 'hidden';
  if (geoOp > 0.001) {
    tmp.copy(eye).project(camera);
    ottawaEl.style.transform = `translate3d(${((tmp.x * 0.5 + 0.5) * W).toFixed(1)}px,${((0.5 - tmp.y * 0.5) * H).toFixed(1)}px,0)`;
  }
  hintEl.style.opacity = (entered ? sm(0.9, 1, introT) * (1 - sm(0.0, 0.02, pS)) : 0).toFixed(3);
  document.documentElement.classList.toggle('reading', pS > 0.19);
}

// ---------- loop ----------
let last = performance.now(), frames = 0, paused = false;
function loop(now) {
  if (paused) { last = now; requestAnimationFrame(loop); return; }
  const dt = SHOT ? 1 / 60 : Math.min(0.05, (now - last) / 1000);
  last = now;
  T = SHOT ? shot.t : T + dt;
  if (lenis) lenis.raf(now);
  if (entered && !SHOT) aq.frame(dt);
  update(dt);
  post.render(scene, camera);
  frames++;
  if (SHOT && ready && (entered || Q.has('gate')) && frames > 6) { document.documentElement.dataset.ready = '1'; return; }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
if (SHOT) {
  // put the page where the shot is, so the DOM layer matches the 3D layer
  const place = () => { computeBeats(); window.scrollTo(0, scrollFor(shot.p, shot.x)); };
  if (!Q.has('gate')) document.documentElement.classList.remove('locked');
  addEventListener('load', place); setTimeout(place, 50);
}
document.addEventListener('visibilitychange', () => { last = performance.now(); });

// hooks for the device lab: read and set the flight position, pause, and match render resolution to the frame's on-screen size
function rawProgress() { return progressAt(scrollY); }
function seek(p, ex = 0) {
  const max = document.documentElement.scrollHeight - innerHeight;
  const y = Math.round(Math.max(0, Math.min(max, scrollFor(p, ex))));
  scrollTo(0, y);
  return y;
}
window.__v8 = { get state() { return { pS, extra, T, tier: tier.name, entered, ready, W, H, dpr }; }, raw: rawProgress, seek, pause: (b) => { paused = !!b; }, setDprCap: (c) => { dprCap = c || 9; resize(true); }, camera, renderer, post, layout: () => layout, applyTier, TIERS, sound, sky, scene, tune, seeds: () => mainSys };
