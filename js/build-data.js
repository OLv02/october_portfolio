// Pure data builders (no DOM, no three.js). They run inside a worker, or inline in shot mode.
// Every seed is one identity with several destinations: the globe (and an alternate spot on a coastline), a slot in the
// wind that carries the journey, and a point of the daisy it becomes. The equations and random streams follow the
// Windborne proof (v22), so the coverage checks made there hold for this data too.

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickFrom(cdf, sum, R) {
  const pick = R() * sum;
  let lo = 0, hi = cdf.length - 1;
  while (lo < hi) { const mid = (lo + hi) >>> 1; if (cdf[mid] < pick) lo = mid + 1; else hi = mid; }
  return lo;
}

// ---------- the daisy: two rings of 24 ivory petals, a golden centre, calyx, six veined leaves, stipules, roots ----------
// lock = [x, y, z, part] in plant units (soil at y = 0, flower at y = 1); part 0 root · 1 stem · 2 leaf · 3 flower
// plant = [reveal order, random, tint, landing role]; tint 0 green · 1 ivory · 2 gold · 3 vein · 4 dew
const stemAt = (t) => [0.055 * Math.sin(t * 2.2), t, 0.005 * Math.sin(t * Math.PI)];
const rootAt = (t) => [0.025 * Math.sin(t * 4), -0.42 * t, -0.01];
function leafAt(leaf, t, across) {
  const side = leaf % 2 ? 1 : -1, pair = Math.floor(leaf / 2), length = 0.31 + 0.07 * pair;
  const base = 0.12 + pair * 0.16, rise = 0.16;
  const x = side * length * t + stemAt(base)[0], y = base + rise * Math.sin(t * Math.PI * 0.8);
  const dx = side * length, dy = rise * Math.PI * 0.8 * Math.cos(t * Math.PI * 0.8), norm = Math.hypot(dx, dy);
  const width = 0.065 * Math.pow(Math.sin(Math.PI * t), 0.8);
  return [x - (dy / norm) * width * across, y + (dx / norm) * width * across, 0.025 * Math.sin(leaf * 2) * t];
}
function buildPlant(count, lock, plant) {
  const r = mulberry32(8821), top = stemAt(1);
  for (let i = 0; i < count; i++) {
    const kind = r(), t = r();
    let xyz, part, order, tint = 0;
    if (kind < 0.14) {
      part = 0; const at = r() * 0.8, base = rootAt(at);
      xyz = r() < 0.4 ? rootAt(t) : [base[0] + (r() < 0.5 ? -1 : 1) * (0.06 + r() * 0.15) * t, base[1] - (0.04 + r() * 0.13) * t, -0.01];
      order = Math.min(1, Math.abs(xyz[1]) / 0.42);
    } else if (kind < 0.24) {
      part = 1; xyz = stemAt(t); xyz[0] += (r() - 0.5) * 0.014; order = t;
      // small curled stipules branch from the stem
      if (r() < 0.22) { const b = 0.24 + Math.floor(r() * 3) * 0.17, s = r() < 0.5 ? -1 : 1, a = t * Math.PI * 1.8, o = stemAt(b); xyz = [o[0] + s * (0.07 * t + 0.025 * Math.sin(a)), b + 0.06 * (1 - Math.cos(a)), 0.01]; order = b + t * 0.25; }
    } else if (kind < 0.55) {
      part = 2; const leaf = Math.floor(r() * 6), detail = r(); let across;
      if (detail < 0.19) { across = 0; tint = 3; }
      else if (detail < 0.34) { const branch = Math.floor(t * 7) / 7; across = (r() < 0.5 ? -1 : 1) * (t - branch) * 7; tint = 3; }
      else across = detail < 0.55 ? (r() < 0.5 ? -1 : 1) : r() * 2 - 1;
      xyz = leafAt(leaf, t, across); order = t;
      if (detail > 0.985) { tint = 4; xyz[2] += 0.02; }
    } else {
      part = 3; const detail = r();
      if (detail < 0.23) {          // Fibonacci florets
        const n = Math.floor(r() * 220), a = n * 2.39996323, rad = Math.sqrt(n / 220) * 0.052;
        xyz = [top[0] + Math.cos(a) * rad, 1 + Math.sin(a) * rad * 0.8, 0.05 + 0.015 * (1 - rad / 0.052)]; tint = n % 5 === 0 ? 1 : 2; order = 0.08 + r() * 0.35;
      } else if (detail < 0.91) {   // petals
        const layer = Math.floor(r() * 2), a = (Math.floor(r() * 24) / 24) * Math.PI * 2 + layer * 0.115, length = 0.205 - layer * 0.025;
        const rad = 0.038 + length * t, w = (r() * 2 - 1) * 0.018 * Math.pow(Math.sin(Math.PI * t), 0.65), curl = 0.008 * Math.sin(t * Math.PI);
        xyz = [top[0] + Math.cos(a) * rad - Math.sin(a) * (w + curl), 1 + Math.sin(a) * rad * 0.78 + Math.cos(a) * (w + curl), 0.025 + layer * 0.006 + 0.035 * Math.sin(Math.PI * t)];
        tint = 1; order = 0.16 + 0.84 * t;
      } else if (detail < 0.975) {  // calyx
        const a = (Math.floor(r() * 12) / 12) * Math.PI * 2, rad = 0.02 + 0.075 * t;
        xyz = [top[0] + Math.cos(a) * rad, 1 + Math.sin(a) * rad * 0.5 - 0.025 * t, -0.015]; tint = 0; order = t * 0.55;
      } else {                      // dew on the petal tips
        const a = (Math.floor(r() * 24) / 24) * Math.PI * 2, rad = 0.235;
        xyz = [top[0] + Math.cos(a) * rad, 1 + Math.sin(a) * rad * 0.78, 0.045]; tint = 4; order = 0.9 + r() * 0.1;
      }
    }
    lock[i * 4] = xyz[0]; lock[i * 4 + 1] = xyz[1]; lock[i * 4 + 2] = xyz[2]; lock[i * 4 + 3] = part;
    plant[i * 4] = Math.min(1, order); plant[i * 4 + 1] = r(); plant[i * 4 + 2] = tint;
  }
}

// ---------- the seeds ----------
// position = globe spot (world units, Ottawa at depth 0) · misc = [globe luminance, random]
// scat = [intro start xyz, hash] · tun = [wind slot 0..105, box x, box y, random] · coast = alternate globe spot + luminance
export function buildMain({ pixels, coast: coastPx, w, h, meta, N, S0, coastShare = 3 / 7, roles = [0, 7, 19] }) {
  const P = w * h, cdf = new Float64Array(P);
  let sum = 0;
  for (let i = 0; i < P; i++) { sum += (pixels[i * 4 + 1] / 255) ** 2; cdf[i] = sum; }
  if (!sum) throw new Error('The globe sampling channel is empty.');
  const eyeZ = Math.sqrt(Math.max(0, 1 - meta.eye[0] ** 2 - meta.eye[1] ** 2));
  const pos = new Float32Array(N * 3), scat = new Float32Array(N * 4), tun = new Float32Array(N * 4), misc = new Float32Array(N * 2);
  const lock = new Float32Array(N * 4), plant = new Float32Array(N * 4), coast = new Float32Array(N * 4);
  const R = mulberry32(94021);
  for (let i = 0; i < N; i++) {
    const lo = pickFrom(cdf, sum, R);
    const x = ((lo % w) + R() - meta.cx) * meta.scale, y = (meta.cy - Math.floor(lo / w) - R()) * meta.scale, lum = pixels[lo * 4] / 255;
    pos[i * 3] = x * S0; pos[i * 3 + 1] = y * S0; pos[i * 3 + 2] = (Math.sqrt(Math.max(0, 1 - x * x - y * y)) - eyeZ) * S0;
    const bx = R() - 0.5, by = R() - 0.5; R();          // the proof's third free-wind coordinate is unused here
    scat[i * 4 + 3] = R();
    tun[i * 4] = R() * 105; tun[i * 4 + 1] = bx; tun[i * 4 + 2] = by; R(); R(); tun[i * 4 + 3] = R();
    misc[i * 2] = lum; misc[i * 2 + 1] = R();
    coast[i * 4] = pos[i * 3]; coast[i * 4 + 1] = pos[i * 3 + 1]; coast[i * 4 + 2] = pos[i * 3 + 2]; coast[i * 4 + 3] = lum;
  }

  // Alternate globe spots along the coastlines, for a share of the seeds (never the Ottawa neighbourhood, which the dive needs)
  if (coastPx) {
    const cc = new Float64Array(P); let cs = 0;
    for (let i = 0; i < P; i++) {
      const x = ((i % w) + 0.5 - meta.cx) * meta.scale, y = (meta.cy - Math.floor(i / w) - 0.5) * meta.scale;
      cs += (coastPx[i * 4] / 255) * (0.25 + 0.75 * Math.sqrt(Math.max(0, 1 - x * x - y * y))); cc[i] = cs;
    }
    const RC = mulberry32(72026), keep = Math.round(coastShare * 7);
    for (let i = 0; cs && i < N; i++) {
      const near = Math.hypot(pos[i * 3] / S0 - meta.eye[0], pos[i * 3 + 1] / S0 - meta.eye[1]) < 0.12;
      if (i % 7 >= keep || near) continue;
      const lo = pickFrom(cc, cs, RC);
      const x = ((lo % w) + RC() - meta.cx) * meta.scale, y = (meta.cy - Math.floor(lo / w) - RC()) * meta.scale;
      coast[i * 4] = x * S0; coast[i * 4 + 1] = y * S0; coast[i * 4 + 2] = (Math.sqrt(Math.max(0, 1 - x * x - y * y)) - eyeZ) * S0; coast[i * 4 + 3] = pixels[lo * 4] / 255;
    }
  }

  // Before you enter, the seeds are out in the wind to the right of the globe; entering blows them in.
  const RI = mulberry32(2611);
  for (let i = 0; i < N; i++) {
    scat[i * 4] = S0 * (2.2 + RI() * 4.5);
    scat[i * 4 + 1] = S0 * (RI() - 0.5) * 2.6 + pos[i * 3 + 1] * 0.3;
    scat[i * 4 + 2] = S0 * (RI() - 0.6) * 2.2;
  }

  buildPlant(N, lock, plant);
  roles.forEach((p, k) => { if (p < N) plant[p * 4 + 3] = k + 1; });
  return { pos, scat, tun, misc, coast, lock, plant };
}
