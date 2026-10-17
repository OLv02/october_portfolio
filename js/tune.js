// The hidden tuning panel: open the site with ?tune. Every slider edits the live settings (main.js reads them each
// frame); Reset returns to the committed defaults in config.js, Copy/Export give the current values as JSON to paste
// back into config.js. "Remember" keeps them in this browser only (localStorage), and only applies when ?tune is on.
// Nothing here changes the repository or what other visitors see.
import { CONFIG, PROFILES, RANGES } from './config.js';

const KEY = 'wb.tune';
const get = (o, path) => path.split('.').reduce((a, k) => a[k], o);
const set = (o, path, v) => { const ks = path.split('.'), last = ks.pop(); ks.reduce((a, k) => a[k], o)[last] = v; };
const PROFILE_KEYS = ['windSpeed', 'seeds', 'seedSize', 'playfulness'];
const LABELS = {
  windSpeed: 'Wind speed', seeds: 'Seeds', seedSize: 'Seed size', playfulness: 'Playfulness',
  'look.backgroundBrightness': 'Wind seed brightness', 'look.pointStrength': 'Attached points',
  'globe.brightness': 'Globe brightness', 'globe.aperture': 'Breath / opening strength', 'globe.blowDive': 'Dive into Ottawa (blown)', 'globe.compactScale': 'Globe sprite scale',
  'plant.brightness': 'Plant brightness', 'plant.sway': 'Plant sway', 'plant.scale': 'Plant size',
  'landing.light': 'Warm light', 'landing.spread': 'Landing spread', 'landing.plantRight': 'Plant offset (wide)',
  'companions.bridge.size': 'Bridge size (Work)', 'companions.seedling.size': 'Seedling size (Highlights)', 'companions.seedling.light': 'Seedling canopy light',
  'companions.compass.size': 'Compass size (Leadership)', 'companions.quill.size': 'Quill size (Writing)', 'companions.fern.size': 'Fern size (Education)',
  'companions.laurel.size': 'Laurel size (Awards)', 'companions.envelope.size': 'Envelope size (Let\'s talk)',
  'after.pullBack': 'Daisy steps back', 'after.shiftRight': 'Daisy shifts right', 'after.shiftDown': 'Daisy shifts down',
  'render.companionGain': 'Companion gain (tone curve)', 'render.companionScale': 'Companion scale (all)',
  'render.globeGain': 'Globe gain (tone curve)', 'render.occluder': 'Globe backing',
  'flight.halfHeight': 'Field half height', 'flight.minHalfWidth': 'Field min half width', 'flight.motionEase': 'Travel settle (s)',
};
const GROUPS = [
  ['Seeds · profile', PROFILE_KEYS],
  ['Look', ['look.backgroundBrightness', 'look.pointStrength']],
  ['Companion render', ['render.companionGain', 'render.companionScale']],
  ['Globe', ['globe.brightness', 'globe.aperture', 'globe.blowDive', 'globe.compactScale', 'render.globeGain', 'render.occluder']],
  ['Journey', ['flight.halfHeight', 'flight.minHalfWidth', 'flight.motionEase']],
  ['Light & landing', ['landing.light', 'landing.spread', 'landing.plantRight']],
  ['Daisy', ['plant.brightness', 'plant.sway', 'plant.scale']],
  ['Companions', ['companions.bridge.size', 'companions.seedling.size', 'companions.seedling.light', 'companions.compass.size', 'companions.quill.size', 'companions.fern.size', 'companions.laurel.size', 'companions.envelope.size']],
  ['After the flight', ['after.pullBack', 'after.shiftRight', 'after.shiftDown']],
];
const NEEDS_COUNT = new Set(['seeds']), NEEDS_LAYOUT = new Set(['plant.scale', 'landing.plantRight']);

export function initTune(tune, { info, onCount, onLayout, onPlant, onFont }) {
  const pathOf = (k) => (PROFILE_KEYS.includes(k) ? 'profile.' + k : k);
  const snapshot = () => {
    const out = { profileName: tune.profileName, profile: { ...tune.profile } };
    for (const k of ['look', 'globe', 'plant', 'landing', 'flight', 'render', 'companions', 'after']) out[k] = { ...tune[k] };
    return out;
  };
  const apply = (saved) => {
    if (saved.profileName && PROFILES[saved.profileName]) tune.profileName = saved.profileName;
    for (const k of ['profile', 'look', 'globe', 'plant', 'landing', 'flight', 'render', 'companions', 'after']) if (saved[k]) Object.assign(tune[k], saved[k]);
  };
  let remember = false;
  try { const s = localStorage.getItem(KEY); if (s) { apply(JSON.parse(s)); remember = true; } } catch (e) { /* storage blocked */ }
  const persist = () => { try { if (remember) localStorage.setItem(KEY, JSON.stringify(snapshot())); else localStorage.removeItem(KEY); } catch (e) { /* storage blocked */ } };

  const root = document.createElement('aside');
  root.className = 'tune';
  root.setAttribute('aria-label', 'Tuning panel');
  root.innerHTML = `<button class="tune-toggle" type="button" aria-expanded="true">Tune</button>
    <div class="tune-body">
      <p class="tune-info" aria-live="polite"></p>
      <label class="tune-row tune-select">Profile <select data-k="profileName"><option value="mobile">mobile</option><option value="desktop">desktop</option></select></label>
      <label class="tune-row tune-select">Heading font <select data-k="look.font"><option value="fraunces">Fraunces</option><option value="georgia">Georgia (original)</option></select></label>
      <label class="tune-row tune-select">Globe <select data-k="globe.mode"><option value="coast">compact + coast</option><option value="compact">compact</option><option value="current">current</option></select></label>
      <label class="tune-row tune-select">Daisy <select data-k="plant.variant"><option value="pair">approved pair</option><option value="original">six-leaf reference</option></select></label>
      <label class="tune-row tune-check"><input type="checkbox" data-k="plant.showRoots"> Roots visible</label>
      <label class="tune-row tune-select">Opening <select data-k="globe.opening"><option value="blow">blown away + slight dive</option><option value="part">part around Ottawa (original)</option></select></label>
      <label class="tune-row tune-check"><input type="checkbox" data-k="globe.ottawaLast"> Ottawa's seeds let go last</label>
      <label class="tune-row tune-check"><input type="checkbox" data-k="globe.bank"> Bank into turns</label>
      <div class="tune-groups"></div>
      <div class="tune-actions"><button type="button" data-a="reset">Reset</button><button type="button" data-a="copy">Copy JSON</button><button type="button" data-a="export">Export</button></div>
      <label class="tune-row tune-check"><input type="checkbox" data-a="remember"> Remember in this browser only</label>
      <p class="tune-note">Edits are live and local. To keep them, paste the JSON into js/config.js.</p>
    </div>`;
  const groups = root.querySelector('.tune-groups'), inputs = [];
  for (const [title, keys] of GROUPS) {
    const fs = document.createElement('fieldset');
    fs.innerHTML = `<legend>${title}</legend>`;
    for (const k of keys) {
      const [min, max, step] = RANGES[k], id = 'tune-' + k.replace(/\./g, '-');
      const row = document.createElement('div');
      row.className = 'tune-row';
      row.innerHTML = `<label for="${id}">${LABELS[k]}</label><input id="${id}" type="range" min="${min}" max="${max}" step="${step}"><output for="${id}"></output>`;
      const input = row.querySelector('input'), out = row.querySelector('output');
      input.addEventListener('input', () => {
        set(tune, pathOf(k), +input.value); out.textContent = input.value;
        if (NEEDS_COUNT.has(k)) onCount(); if (NEEDS_LAYOUT.has(k)) onLayout();
        persist(); refreshInfo();
      });
      inputs.push({ k, input, out });
      fs.appendChild(row);
    }
    groups.appendChild(fs);
  }
  const sync = () => {
    for (const { k, input, out } of inputs) { input.value = get(tune, pathOf(k)); out.textContent = input.value; }
    root.querySelector('[data-k="profileName"]').value = tune.profileName;
    root.querySelector('[data-k="look.font"]').value = tune.look.font;
    root.querySelector('[data-k="globe.mode"]').value = tune.globe.mode;
    root.querySelector('[data-k="plant.variant"]').value = tune.plant.variant;
    root.querySelector('[data-k="plant.showRoots"]').checked = tune.plant.showRoots;
    root.querySelector('[data-k="globe.bank"]').checked = tune.globe.bank;
    root.querySelector('[data-k="globe.opening"]').value = tune.globe.opening;
    root.querySelector('[data-k="globe.ottawaLast"]').checked = tune.globe.ottawaLast;
    root.querySelector('[data-a="remember"]').checked = remember;
    refreshInfo();
  };
  const refreshInfo = () => { root.querySelector('.tune-info').textContent = info(); };
  root.querySelector('[data-k="profileName"]').addEventListener('change', (e) => {
    tune.profileName = e.target.value; Object.assign(tune.profile, PROFILES[tune.profileName]);
    onCount(); persist(); sync();
  });
  root.querySelector('[data-k="look.font"]').addEventListener('change', (e) => { tune.look.font = e.target.value; onFont(); persist(); });
  root.querySelector('[data-k="globe.mode"]').addEventListener('change', (e) => { tune.globe.mode = e.target.value; persist(); });
  root.querySelector('[data-k="plant.variant"]').addEventListener('change', (e) => { tune.plant.variant = e.target.value; onPlant(); persist(); });
  root.querySelector('[data-k="plant.showRoots"]').addEventListener('change', (e) => { tune.plant.showRoots = e.target.checked; persist(); });
  root.querySelector('[data-k="globe.bank"]').addEventListener('change', (e) => { tune.globe.bank = e.target.checked; persist(); });
  root.querySelector('[data-k="globe.opening"]').addEventListener('change', (e) => { tune.globe.opening = e.target.value; persist(); });
  root.querySelector('[data-k="globe.ottawaLast"]').addEventListener('change', (e) => { tune.globe.ottawaLast = e.target.checked; persist(); });
  root.querySelector('[data-a="remember"]').addEventListener('change', (e) => { remember = e.target.checked; persist(); });
  root.querySelector('[data-a="reset"]').addEventListener('click', () => {
    for (const k of ['look', 'globe', 'plant', 'landing', 'flight', 'render', 'companions', 'after']) Object.assign(tune[k], structuredClone(CONFIG[k]));
    Object.assign(tune.profile, PROFILES[tune.profileName]);
    onCount(); onLayout(); onPlant(); onFont(); persist(); sync();
  });
  const json = () => JSON.stringify(snapshot(), null, 2);
  root.querySelector('[data-a="copy"]').addEventListener('click', async (e) => {
    try { await navigator.clipboard.writeText(json()); e.target.textContent = 'Copied'; } catch (err) { e.target.textContent = 'Copy failed'; }
    setTimeout(() => { e.target.textContent = 'Copy JSON'; }, 1500);
  });
  root.querySelector('[data-a="export"]').addEventListener('click', () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([json()], { type: 'application/json' }));
    a.download = 'windborne-tune.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  const toggle = root.querySelector('.tune-toggle');
  toggle.addEventListener('click', () => {
    const open = !root.classList.toggle('closed');
    toggle.setAttribute('aria-expanded', String(open));
  });
  document.body.appendChild(root);
  sync();
  setInterval(refreshInfo, 1000);
  return { apply, snapshot };
}
