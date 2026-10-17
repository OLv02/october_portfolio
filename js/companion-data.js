// The section companions' shapes, ported from the Windborne proof (through-fern package, 16 Oct 2026). Pure data, no DOM.
// Each builder returns { lock, tun } exactly as the proof does (the same random streams, so the proof's geometry checks
// apply): lock = [x, y, z, part] in the object's own units, the camera looking down -z; tun = per-object metadata.
// Only the approved variants are here: the Little bridge, the spotlit seedling (two leaves at y = -.06), the tabletop
// compass, the quill with one ink trail, the unfurling fern, and (v52 package) the open laurel and the open envelope
// with its right-curving sprout.
import { mulberry32 as seeded } from './build-data.js';

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// ---------- Work: the Little bridge (60% span, four posts per side, round end caps, no heart) ----------
export const BRIDGE = { brightness: 1.2, size: 1, spanScale: 0.6, postsPerSide: 4 };
export function buildBridge(count) {
  const r = seeded(31743), lock = new Float32Array(count * 4), tun = new Float32Array(count * 4);
  const posts = [-1.24, -0.48, 0.48, 1.24];
  const deck = (x) => 0.04 + 0.3 * (1 - (x / 1.24) ** 2), rail = (x) => deck(x) + 0.26;
  for (let i = 0; i < count; i++) {
    const c = r(), side = r() < 0.5 ? -1 : 1, t = r();
    let x, y, z = side * 0.22, part;
    if (c < 0.25) { part = 1; x = (t * 2 - 1) * 1.24; y = rail(x); }
    else if (c < 0.43) { part = 0; x = (t * 2 - 1) * 1.24; y = deck(x); }
    else if (c < 0.65) { part = 0; x = -1.24 + (Math.floor(t * 15) / 14) * 2.48; y = deck(x); z = (r() * 2 - 1) * 0.22; }
    else if (c < 0.79) { part = 2; x = posts[Math.floor(t * posts.length)]; y = deck(x) + r() * (rail(x) - deck(x)); }
    else if (c < 0.87) { part = 3; x = t < 0.5 ? -1.24 : 1.24; y = -0.22 + r() * 0.26; }
    else if (c < 0.97) { part = 1; x = (t * 2 - 1) * 1.24; y = rail(x); }   // the old heart's seeds reinforce the rail
    else {   // rounded caps on the two end posts
      part = 1; const cx = t < 0.5 ? -1.24 : 1.24, a = r() * Math.PI * 2;
      x = cx + 0.075 * Math.cos(a); y = rail(cx) + 0.025 + 0.06 * Math.sin(a);
    }
    x += (r() - 0.5) * 0.012; y += (r() - 0.5) * 0.012; z += (r() - 0.5) * 0.012;
    const py = y - 0.18;   // a slight fixed view from above gives the walkway depth
    lock.set([x * BRIDGE.spanScale, py * Math.cos(0.2) - z * Math.sin(0.2), py * Math.sin(0.2) + z * Math.cos(0.2), part], i * 4);
    tun.set([Math.max(0, Math.min(1, (x + 1.33) / 2.66)), r(), part, part], i * 4);
  }
  return { lock, tun };
}

// ---------- Highlights: the spotlit seedling (rest pose .82) ----------
export const SEEDLING = { brightness: 0.9, size: 0.85, light: 1.8, rest: 0.82, leafNodeY: -0.06 };
const seedlingStemX = (y) => 0.026 * Math.sin(((y + 0.42) / 0.59) * Math.PI);
const seedlingLeafPoint = (side, u, w = 0) => [seedlingStemX(SEEDLING.leafNodeY) + side * (0.38 * u - 0.69 * w), SEEDLING.leafNodeY + 0.32 * u + 0.73 * w];
export function buildSeedling(count) {
  const r = seeded(7813), lock = new Float32Array(count * 4), tun = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    const c = r(), u = r(), side = r() < 0.5 ? -1 : 1;
    let x, y, z = (r() - 0.5) * 0.025, part, rank;
    if (c < 0.14) { part = 0; y = -0.42 + (SEEDLING.leafNodeY + 0.42) * u; x = seedlingStemX(y); rank = 0.12 + 0.3 * u; }
    else if (c < 0.5) {
      part = 1; const edge = r(), w = 0.105 * Math.sin(Math.PI * u) * (edge < 0.7 ? (edge < 0.35 ? -1 : 1) : edge < 0.85 ? 0 : r() * 2 - 1);
      [x, y] = seedlingLeafPoint(side, u, w); rank = 0.35 + 0.55 * u;
    } else if (c < 0.62) {
      part = 2; const a = u * Math.PI * 2, rad = Math.sqrt(r()); x = Math.cos(a) * 0.52 * rad; y = -0.435 + Math.sin(a) * 0.055 * rad; z += (r() - 0.5) * 0.07; rank = 0.08 + r() * 0.1;
    } else {
      part = 4;   // seeds drifting inside the light; the shader moves them down the beam
      const depth = r(); y = -0.4 + u * 1.45; x = -0.72 * (1 - u) + (r() * 2 - 1) * (0.05 + 0.46 * (1 - u));
      const along = (1.12 - y) / 1.54; x = -0.72 + 0.74 * along + (r() * 2 - 1) * (0.035 + 0.485 * along);
      z = (depth - 0.5) * 0.38; rank = r();
    }
    x += (r() - 0.5) * 0.006; y += (r() - 0.5) * 0.006;
    if (part === 0) y = Math.min(y, SEEDLING.leafNodeY);   // the stem stops at the leaf node
    lock.set([x, y, z, part], i * 4); tun.set([rank, r(), r(), part], i * 4);
  }
  return { lock, tun };
}

// ---------- Leadership: the tabletop pocket compass ----------
export const COMPASS = { brightness: 1.2, size: 0.7, view: { tilt: -0.98, turn: 0, bank: 0, heading: -0.52 } };
function compassViewPoint(x, y, z) {
  // turn within the tabletop plane first, then tilt, so the case stays level on screen
  const V = COMPASS.view, h = V.heading, px = x * Math.cos(h) - y * Math.sin(h), py = x * Math.sin(h) + y * Math.cos(h);
  x = px; y = py;
  const a = V.tilt, b = V.turn, c = V.bank;
  const yy = y * Math.cos(a) - z * Math.sin(a), zz = y * Math.sin(a) + z * Math.cos(a);
  const xx = x * Math.cos(b) + zz * Math.sin(b), zzz = -x * Math.sin(b) + zz * Math.cos(b);
  return [xx * Math.cos(c) - yy * Math.sin(c), xx * Math.sin(c) + yy * Math.cos(c), zzz];
}
// tun = [assembly rank, facet lighting, visibility, part]
export function buildCompass(count) {
  const r = seeded(42817), lock = new Float32Array(count * 4), tun = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    const c = r(), t = r(), a = t * Math.PI * 2;
    let x, y, z, part, rank, normal = [0, 0, 1], visibility = 1;
    if (c < 0.24) {
      part = 0; const b = r() < 0.75 ? Math.PI / 2 + (r() - 0.5) * 0.35 : r() * Math.PI * 2, rad = 0.665 + 0.032 * Math.cos(b);
      x = rad * Math.cos(a); y = rad * Math.sin(a); z = 0.12 + 0.025 * Math.sin(b); rank = 0.05 + 0.25 * t;
      normal = [Math.cos(a) * Math.cos(b), Math.sin(a) * Math.cos(b), Math.sin(b)];
      visibility = compassViewPoint(...normal)[2] > -0.12 ? 1 : 0;
    } else if (c < 0.4) {
      part = 1; x = 0.65 * Math.cos(a); y = 0.65 * Math.sin(a); z = -0.15 + r() * 0.27; rank = 0.08 + 0.22 * r();
      normal = [Math.cos(a), Math.sin(a), 0]; visibility = compassViewPoint(...normal)[2] > 0.02 ? 1 : 0;
    } else if (c < 0.48) {
      part = 0; x = 0.665 * Math.cos(a); y = 0.665 * Math.sin(a); z = -0.16; rank = 0.08 + 0.22 * t;
      normal = [Math.cos(a), Math.sin(a), 0]; visibility = compassViewPoint(...normal)[2] > 0.02 ? 1 : 0;
    } else if (c < 0.56) {
      part = 2; const rad = 0.6 * Math.sqrt(r()); x = rad * Math.cos(a); y = rad * Math.sin(a); z = 0.065; rank = 0.25 + 0.25 * r();
    } else if (c < 0.82) {
      part = 3; const ray = Math.floor(t * 8), theta = (ray * Math.PI) / 4, len = ray % 2 === 0 ? 0.53 : 0.31, width = ray % 2 === 0 ? 0.09 : 0.05;
      const edge = r() < 0.5 ? -1 : 1, u = r(), sample = r(); let along, across;
      if (sample < 0.48) { along = len * u; across = edge * width * (u < 0.23 ? u / 0.23 : (1 - u) / 0.77); z = 0.09 + (u < 0.23 ? 1 - u / 0.23 : 0) * 0.095; }
      else if (sample < 0.73) { along = len * u; across = 0; z = 0.09 + (1 - u) * 0.095; }
      else { const v = Math.sqrt(r()); along = v * (u * len + (1 - u) * len * 0.23); across = edge * v * (1 - u) * width; z = 0.09 + (1 - v) * 0.095; }
      x = Math.sin(theta) * along + Math.cos(theta) * across; y = Math.cos(theta) * along - Math.sin(theta) * across;
      rank = 0.35 + 0.45 * Math.min(1, along / len);
      normal = [edge * Math.cos(theta) * 0.7, -edge * Math.sin(theta) * 0.7, 0.71];
      part = edge > 0 ? 3 : 4;
    } else if (c < 0.92) {
      part = 5; const tick = Math.floor(t * 24), theta = (tick * Math.PI) / 12, rad = 0.585 - r() * (tick % 6 === 0 ? 0.085 : 0.028);
      x = Math.sin(theta) * rad; y = Math.cos(theta) * rad; z = 0.078; rank = 0.25 + (tick / 24) * 0.3;
    } else if (c < 0.95) {
      part = 0; const rad = 0.052 * Math.sqrt(r()); x = rad * Math.cos(a); y = rad * Math.sin(a); z = 0.185 + 0.025 * Math.sqrt(1 - (rad / 0.052) ** 2); rank = 0.8;
    } else {
      part = 0; rank = 0.15 + 0.2 * t;
      if (r() < 0.4) { x = 0.065 * Math.cos(a); z = 0.015 + 0.065 * Math.sin(a); y = 0.65 + r() * 0.19; normal = [Math.cos(a), 0, Math.sin(a)]; }
      else { const b = r() * Math.PI * 2, rad = 0.12 + 0.012 * Math.cos(b); x = rad * Math.cos(a); y = 0.94 + rad * Math.sin(a); z = 0.015 + 0.012 * Math.sin(b); normal = [0, 0, 1]; }
    }
    x += (r() - 0.5) * 0.005; y += (r() - 0.5) * 0.005; z += (r() - 0.5) * 0.004;
    const p = compassViewPoint(x, y, z), n = compassViewPoint(...normal);
    const lighting = Math.max(0.32, Math.min(1.25, 0.66 + n[0] * -0.28 + n[1] * 0.4 + n[2] * 0.32));
    lock.set([...p, part], i * 4); tun.set([rank, lighting, visibility, part], i * 4);
  }
  return { lock, tun };
}

// ---------- Writing: the feather quill with one ink trail from the nib ----------
export const QUILL = { brightness: 0.5, size: 0.85 };
function quillSpine(t) {
  if (t < 0) return [-0.28 + 0.6 * t, -0.36 + 1.38 * t, 0];
  const u = 1 - t;
  return [u * u * u * -0.28 + 3 * u * u * t * -0.08 + 3 * u * t * t * 0.28 + t * t * t * 0.82,
    u * u * u * -0.36 + 3 * u * u * t * 0.1 + 3 * u * t * t * 0.7 + t * t * t * 0.78, 0.028 * Math.sin(Math.PI * t)];
}
const quillTangent = (t) => { const u = 1 - t; return [3 * u * u * 0.2 + 6 * u * t * 0.36 + 3 * t * t * 0.54, 3 * u * u * 0.46 + 6 * u * t * 0.6 + 3 * t * t * 0.08]; };
const quillWidth = (t, side) => (side < 0 ? 0.27 : 0.23) * Math.pow(Math.max(0, Math.sin(Math.PI * t)), side < 0 ? 0.68 : 0.82) * (side < 0 ? 0.85 + 0.25 * t : 1.15 - 0.3 * t);
function quillVane(t, side, v) {
  const p = quillSpine(t), [dx, dy] = quillTangent(t), norm = Math.hypot(dx, dy), w = quillWidth(t, side) * v;
  return [p[0] + ((side * dy) / norm) * w, p[1] - ((side * dx) / norm) * w, p[2] - 0.024 * v * v];
}
function quillBarbPoint(t, side, v) {
  const base = quillSpine(t), tip = quillVane(Math.min(1, t + 0.075), side, 1), control = quillVane(Math.min(1, t + 0.025), side, 0.58), u = 1 - v;
  return base.map((q, k) => u * u * q + 2 * u * v * control[k] + v * v * tip[k]);
}
const INK = [
  [[-0.43, -0.705], [-0.38, -0.7], [-0.38, -0.77], [-0.33, -0.75]],
  [[-0.33, -0.75], [-0.28, -0.72], [-0.24, -0.69], [-0.18, -0.71]],
  [[-0.18, -0.71], [-0.08, -0.73], [-0.15, -0.79], [0.03, -0.75]],
  [[0.03, -0.75], [0.16, -0.69], [0.25, -0.73], [0.36, -0.73]],
  [[0.36, -0.73], [0.45, -0.76], [0.53, -0.75], [0.62, -0.71]],
];
function quillInkPoint(t, across = 0) {
  const scaled = Math.min(1, Math.max(0, t)) * INK.length, index = Math.min(INK.length - 1, Math.floor(scaled)), v = scaled - index, u = 1 - v, s = INK[index];
  const x = u * u * u * s[0][0] + 3 * u * u * v * s[1][0] + 3 * u * v * v * s[2][0] + v * v * v * s[3][0];
  const y = u * u * u * s[0][1] + 3 * u * u * v * s[1][1] + 3 * u * v * v * s[2][1] + v * v * v * s[3][1];
  const pressure = 0.003 + 0.014 * Math.pow(Math.sin(Math.PI * t), 0.7) * (0.65 + 0.35 * Math.sin(5 * Math.PI * t));
  return [x, y + across * pressure, -0.008 * Math.sin(Math.PI * t)];
}
export function buildQuill(count) {
  const r = seeded(61593), ink = seeded(9173), lock = new Float32Array(count * 4), tun = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    const c = r(), u = r(), side = r() < 0.5 ? -1 : 1;
    let p, part, rank;
    if (c < 0.16) { const t = -0.25 + u * 1.25; p = quillSpine(t); p[0] += (r() - 0.5) * 0.009; part = 0; rank = 0.04 + 0.7 * u; }
    else if (c < 0.28) { const t = 0.012 + u * 0.98; p = quillVane(t, side, 1 - 0.04 * (0.5 + 0.5 * Math.sin(t * 74 * Math.PI))); part = side < 0 ? 1 : 2; rank = 0.25 + 0.65 * t; }
    else if (c < 0.72) { const row = Math.floor(u * 40), t = 0.008 + (row / 39) * 0.91 + (r() - 0.5) * 0.009; p = quillBarbPoint(Math.max(0, t), side, r()); part = side < 0 ? 1 : 2; rank = 0.25 + 0.65 * t; }
    else if (c < 0.94) { const t = 0.01 + u * 0.98; p = quillVane(t, side, Math.sqrt(r())); part = 3; rank = 0.25 + 0.65 * t; }
    else { const t = 0.008 + u * 0.21; p = quillVane(t, side, 0.6 + r() * 0.62); part = side < 0 ? 1 : 2; rank = 0.25 + 0.65 * t; }
    // the single ink trail, written on from the nib (an independent stream, so the feather targets never change)
    if (ink() < 0.13) { const t = ink(), main = ink() >= 0.2, across = ink() * 2 - 1; if (main) { p = quillInkPoint(t, across); part = 4; rank = t; } }
    p[0] += (r() - 0.5) * 0.004; p[1] += (r() - 0.5) * 0.004; p[2] += (r() - 0.5) * 0.005;
    lock.set([...p, part], i * 4); tun.set([rank, r(), part, part], i * 4);
  }
  return { lock, tun };
}

// ---------- Education: the unfurling fern (three fronds; the main tip stays curled) ----------
export const FERN = { brightness: 0.8, size: 0.85 };
// [baseX, baseY, angle, length, arch, front coiled, front final, pinna pairs, pinna length]
export const FERN_FRONDS = [
  [0.02, -0.56, 1.42, 1.4, -0.62, 0.1, 0.72, 17, 0.34],   // main frond, tip still curled
  [-0.05, -0.56, 2.02, 1.0, 0.7, 0.12, 0.86, 13, 0.24],   // left frond, nearly open
  [0.13, -0.56, 1.3, 0.5, -0.3, 0.04, 0.12, 10, 0.12],    // young fiddlehead, still coiled
];
export const FERN_STEPS = 40, FERN_COIL = 18, FERN_STIPE = 0.16, FERN_SWEEP = 0.32;
const fernFront = (frond, unfurl) => { const f = FERN_FRONDS[frond]; return f[5] + (f[6] - f[5]) * unfurl; };
function fernCurvature(s, f, arch, length) {
  const u = Math.max(1e-6, (s - f) / (1 - f));
  return arch + (Math.sign(arch) * FERN_COIL * Math.pow(u, 1.3) * (s > f ? 1 : 0)) / ((1 - f) * length);
}
function fernFrame(frond, s, unfurl) {
  const [bx, by, angle, length, arch] = FERN_FRONDS[frond], f = fernFront(frond, unfurl), ds = (length * s) / FERN_STEPS;
  let x = bx, y = by, th = angle;
  for (let i = 0; i < FERN_STEPS; i++) {
    const k = fernCurvature(((i + 0.5) / FERN_STEPS) * s, f, arch, length), mid = th + k * ds * 0.5;
    x += Math.cos(mid) * ds; y += Math.sin(mid) * ds; th += k * ds;
  }
  return [x, y, th];
}
function fernPinnaLength(frond, s, unfurl) {
  const f = fernFront(frond, unfurl), open = 1 - 0.86 * smooth(f - 0.04, f + 0.12, s);
  return FERN_FRONDS[frond][8] * smooth(FERN_STIPE - 0.02, FERN_STIPE + 0.1, s) * Math.pow(1 - s, 0.6) * 1.25 * open;
}
function fernPinnaPoint(frond, s, side, t, c, unfurl) {
  const [x, y, th] = fernFrame(frond, s, unfurl), length = fernPinnaLength(frond, s, unfurl);
  const tx = Math.cos(th), ty = Math.sin(th);
  let dx = -side * ty + tx * FERN_SWEEP, dy = side * tx + ty * FERN_SWEEP; const n = Math.hypot(dx, dy); dx /= n; dy /= n;
  const width = length * 0.12 * Math.pow(Math.sin(Math.PI * t), 0.6) * (0.62 + 0.38 * Math.abs(Math.sin(t * Math.PI * 6)));
  return [x + dx * length * t - dy * side * width * c + tx * 0.1 * length * t * t, y + dy * length * t + dx * side * width * c + ty * 0.1 * length * t * t];
}
// lock = final target xyz + part (0 rachis, 1 pinna, 2 midrib/edge, 3 moss); tun = [arc s, side*t, across, frond]
export function buildFern(count) {
  const r = seeded(52711), lock = new Float32Array(count * 4), tun = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    const c = r(), pick = r(), u = r(), v = r(), w = r();
    const frond = pick < 0.52 ? 0 : pick < 0.82 ? 1 : 2, f = FERN_FRONDS[frond];
    let x, y, z = (w - 0.5) * 0.03, part, s, signed = 0, across = 0, id = frond;
    if (c < 0.17) { part = 0; s = u; across = (v - 0.5) * 0.012; [x, y] = fernFrame(frond, s, 1); x += across; }
    else if (c < 0.92) {
      const pairs = f[7], row = Math.floor(u * pairs), side = v < 0.5 ? -1 : 1;
      s = FERN_STIPE + ((1 - FERN_STIPE) * (row + 0.5 + side * 0.12)) / pairs;
      const t = 0.03 + 0.97 * r(), edge = r();
      if (edge < 0.34) { across = 0; part = 2; } else if (edge < 0.66) { across = edge < 0.5 ? -1 : 1; part = 2; } else { across = r() * 2 - 1; part = 1; }
      signed = side * t; [x, y] = fernPinnaPoint(frond, s, side, t, across, 1);
    } else {
      part = 3; id = -1; s = 0.03 + 0.05 * u; const a = v * Math.PI * 2, rad = Math.sqrt(r());
      x = 0.04 + Math.cos(a) * 0.42 * rad; y = -0.575 + Math.sin(a) * 0.05 * rad; z = (r() - 0.5) * 0.08;
    }
    lock.set([x, y, z, part], i * 4); tun.set([s, signed, across, id], i * 4);
  }
  return { lock, tun };
}

// ---------- Awards: the open laurel (two mirrored branches of twelve leaves, rooted growth) ----------
export const LAUREL = { brightness: 1.1, size: 0.85 };
// Each right-hand leaf as [base, tip, edge A controls (2), edge B controls (2)] in the reference's pixels; the left
// branch is the exact mirror (x -> 588 - x).
const LAUREL_R = [
  [[376, 57], [315, 23], [344, 66], [327, 45], [365, 28], [338, 16]],
  [[397, 79], [326, 78], [365, 56], [343, 62], [365, 107], [341, 91]],
  [[421, 101], [403, 16], [388, 75], [390, 45], [436, 73], [424, 42]],
  [[437, 126], [368, 108], [409, 100], [387, 100], [406, 139], [382, 126]],
  [[451, 153], [462, 62], [430, 122], [439, 88], [480, 119], [476, 83]],
  [[456, 180], [390, 149], [429, 140], [408, 144], [423, 195], [403, 176]],
  [[456, 201], [494, 123], [454, 159], [477, 134], [495, 181], [503, 147]],
  [[451, 238], [512, 188], [469, 202], [494, 194], [494, 234], [509, 211]],
  [[439, 266], [409, 188], [395, 231], [399, 204], [439, 235], [425, 206]],
  [[421, 288], [506, 251], [458, 244], [488, 246], [465, 293], [491, 278]],
  [[374, 324], [399, 254], [364, 292], [383, 271], [400, 306], [402, 274]],
  [[394, 313], [472, 316], [424, 293], [452, 297], [433, 346], [460, 331]],
];
const LAUREL_LEAVES = [...LAUREL_R.map((shape) => ({ side: -1, shape: shape.map(([x, y]) => [588 - x, y]) })), ...LAUREL_R.map((shape) => ({ side: 1, shape }))];
const cubic = (a, b, c, d, t) => { const u = 1 - t; return a.map((v, k) => u * u * u * v + 3 * u * u * t * b[k] + 3 * u * t * t * c[k] + t * t * t * d[k]); };
const laurelWorld = (p, z = 0) => [(p[0] - 294) / 210, (190 - p[1]) / 210, z];
const LAUREL_STEM = [[[330, 347], [414, 320], [463, 240], [456, 176]], [[456, 176], [454, 115], [407, 73], [376, 57]]];
const laurelStem = (t) => { const s = Math.min(0.999999999, Math.max(0, t)) * 2, i = Math.floor(s); return laurelWorld(cubic(...LAUREL_STEM[i], t === 1 ? 1 : s - i)); };
function laurelLeaf(index, t, across = 0) {
  const [base, tip, a, b, c, d] = LAUREL_LEAVES[index].shape, edgeA = cubic(base, a, b, tip, t), edgeB = cubic(base, c, d, tip, t), mix = (across + 1) / 2;
  return laurelWorld(edgeA.map((v, k) => v * (1 - mix) + edgeB[k] * mix), 0.025 * Math.sin(Math.PI * t) * (1 - across * across));
}
// where each leaf's petiole meets the stem (the nearest of 501 samples, as the proof finds it)
const LAUREL_ATTACH = LAUREL_LEAVES.map(({ shape }) => {
  const b = laurelWorld(shape[0]); let t = 0, best = Infinity;
  for (let k = 0; k <= 500; k++) { const q = k / 500, p = laurelStem(q), d = (p[0] - b[0]) ** 2 + (p[1] - b[1]) ** 2; if (d < best) { best = d; t = q; } }
  return t;
});
const laurelPetiole = (index, t) => { const a = laurelStem(LAUREL_ATTACH[index]), b = laurelLeaf(index, 0); return a.map((v, k) => v + (b[k] - v) * t); };
// The growth metadata the proof carries in three extra attributes (aGrowBase/Axis/Info) depends only on the leaf, so it
// lives in a table compiled into the shader: per right-hand leaf, its base, its final axis (base to tip) and its node.
export const LAUREL_GROW = LAUREL_R.map((_, j) => {
  const i = LAUREL_R.length + j, base = laurelLeaf(i, 0), tip = laurelLeaf(i, 1);
  return [base[0], base[1], tip[0] - base[0], tip[1] - base[1], LAUREL_ATTACH[i]];
});
// lock = the approved v48 pose + palette part; tun = [rank, random, growth kind (0 stem, 1 petiole, 2 blade), leaf].
// Adjacent seeds are exact mirrors (jitter, rank and palette included), so every even prefix is equally dense both sides.
export function buildLaurel(count) {
  const r = seeded(94173), lock = new Float32Array(count * 4), tun = new Float32Array(count * 4);
  for (let i = 0; i < count; i += 2) {
    const c = r(); let p, rank, part, kind, leaf = 0;
    if (c < 0.09) { const t = r(); p = laurelStem(t); rank = t; part = 0; kind = 0; }
    else {
      const index = LAUREL_R.length + Math.floor(r() * LAUREL_R.length), t = r(); rank = LAUREL_ATTACH[index] + t * 0.045; leaf = index - LAUREL_R.length;
      if (c < 0.14) { p = laurelPetiole(index, t); part = 0; kind = 1; }
      else {
        const across = c < 0.37 ? (r() < 0.5 ? -1 : 1) : c < 0.51 ? (r() - 0.5) * 0.06 : r() * 2 - 1;
        p = laurelLeaf(index, t, across); part = c < 0.51 ? 1 : index % 2 ? 3 : 2; kind = 2;
      }
    }
    for (let k = 0; k < 3; k++) p[k] += (r() - 0.5) * 0.003;
    const meta = [Math.min(1, rank), r(), kind, leaf];
    lock.set([...p, part], i * 4); tun.set(meta, i * 4);
    if (i + 1 < count) { lock.set([-p[0], p[1], p[2], part], (i + 1) * 4); tun.set(meta, (i + 1) * 4); }
  }
  return { lock, tun };
}

// ---------- Contact: the open envelope, its back flap raised, a two-leaf sprout curving right ----------
export const ENVELOPE = { brightness: 1, size: 0.9, leafNodeX: 0.14, leafNodeY: 0.4 };
const envelopeSproutStem = (t) => [ENVELOPE.leafNodeX * t * t, -0.12 + 0.52 * t, 0.055];
const envelopeSproutLeaf = (side, t, w = 0) => { const b = envelopeSproutStem(1); return [b[0] + side * (0.36 * t - 0.69 * w), b[1] + 0.28 * t + 0.73 * w, b[2] + 0.018 * Math.sin(Math.PI * t)]; };
const ENVELOPE_OUTLINE = [[-0.68, 0.03], [0.68, 0.03], [0.68, -0.61], [-0.68, -0.61], [-0.68, 0.03]];
const ENVELOPE_SEAMS = [[[-0.68, 0.03], [0, -0.34]], [[0.68, 0.03], [0, -0.34]], [[-0.68, -0.61], [0, -0.19]], [[0.68, -0.61], [0, -0.19]]];
const envelopeLine = (a, b, t, z) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, z];
function envelopeFlap(side, t) {
  const u = 1 - t, a = [side * 0.68, 0.03], b = [side * 0.34, 0.4], c = [0, 0.57];
  return [u * u * a[0] + 2 * u * t * b[0] + t * t * c[0], u * u * a[1] + 2 * u * t * b[1] + t * t * c[1], -0.04];
}
// lock part: outline 0, seams 1, flap 2, fill 3, sprout stem 4, sprout leaves 5; tun = [random rank, along t, across w, side]
export function buildEnvelope(count) {
  const r = seeded(56273), lock = new Float32Array(count * 4), tun = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    const c = r(), t = r(), side = r() < 0.5 ? -1 : 1; let p, part, w = 0;
    if (c < 0.17) { const edge = Math.floor(r() * 4); p = envelopeLine(ENVELOPE_OUTLINE[edge], ENVELOPE_OUTLINE[edge + 1], t, 0.02); part = 0; }
    else if (c < 0.32) { const edge = ENVELOPE_SEAMS[Math.floor(r() * 4)]; p = envelopeLine(...edge, t, 0.035); part = 1; }
    else if (c < 0.44) { p = envelopeFlap(side, t); part = 2; }
    else if (c < 0.58) { p = [(r() * 2 - 1) * 0.67, -0.6 + r() * 0.62, 0]; part = 3; }
    else if (c < 0.69) { p = envelopeSproutStem(t); part = 4; }
    else { w = 0.087 * Math.sin(Math.PI * t) * (r() < 0.6 ? (r() < 0.5 ? -1 : 1) : r() * 2 - 1); p = envelopeSproutLeaf(side, t, w); part = 5; }
    p[0] += (r() - 0.5) * 0.003; p[1] += (r() - 0.5) * 0.003;
    lock.set([...p, part], i * 4); tun.set([r(), t, w, side], i * 4);
  }
  return { lock, tun };
}

// Each object's kind index (the shader branches on it) and its framing on a stage, taken from the proof studies'
// centred view: scale = min(stageW * w, stageH * h) * size, centre offset = y * stageH.
export const COMPANIONS = {
  bridge: { kind: 0, build: buildBridge, cfg: BRIDGE, frame: { w: 0.32, h: 0.48, y: 0 }, rest: 1 },
  seedling: { kind: 1, build: buildSeedling, cfg: SEEDLING, frame: { w: 0.43, h: 0.37, y: -0.08 }, rest: SEEDLING.rest },
  compass: { kind: 2, build: buildCompass, cfg: COMPASS, frame: { w: 0.35, h: 0.37, y: 0 }, rest: 1 },
  quill: { kind: 3, build: buildQuill, cfg: QUILL, frame: { w: 0.35, h: 0.37, y: 0 }, rest: 1 },
  fern: { kind: 4, build: buildFern, cfg: FERN, frame: { w: 0.44, h: 0.5, y: 0.02 }, rest: 1 },
  laurel: { kind: 5, build: buildLaurel, cfg: LAUREL, frame: { w: 0.35, h: 0.37, y: 0 }, rest: 1 },
  envelope: { kind: 6, build: buildEnvelope, cfg: ENVELOPE, frame: { w: 0.35, h: 0.37, y: 0 }, rest: 1 },
};
