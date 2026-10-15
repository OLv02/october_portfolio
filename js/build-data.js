// Pure data builders (no DOM, no three.js). They run inside a worker, or inline in shot mode.
// Every star gets four lives: globe → tunnel → padlock, plus an intro scatter start.

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function gaussFn(R) {
  return () => { let u = 0; while (!u) u = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.283185307 * R()); };
}

// ---------- tunnel targets: (s, theta, radius, kind) ----------
// 0/1 double helix · 2 outer dust wall · 3 data packets (flow toward you) · 4 axis sparkles · 5 light gates
function tunnelPoint(R, gauss, Lt, out, o) {
  const r = R();
  let s, th, rad, kind;
  if (r < 0.36) {
    kind = r < 0.18 ? 0 : 1;
    s = R() * Lt; th = (kind ? Math.PI : 0) + s * 0.21 + gauss() * 0.09; rad = 2.25 + gauss() * 0.1;
  } else if (r < 0.64) {
    kind = 2; s = R() * Lt; th = R() * 6.2832; rad = 3.2 + R() * 2.4;
  } else if (r < 0.82) {
    kind = 3;
    const packets = 26, lane = Math.floor(R() * 10), pk = Math.floor(R() * packets);
    s = (pk / packets) * Lt + (lane * 3.7) % 9 + R() * R() * 3.2;
    th = lane * 0.6283 + 0.31 + gauss() * 0.03; rad = 1.55 + gauss() * 0.05;
  } else if (r < 0.9) {
    kind = 4; s = R() * Lt; th = R() * 6.2832; rad = Math.sqrt(R()) * 1.25;
  } else {
    kind = 5;
    const G = Math.floor(Lt / 9) - 1;
    s = 9 + Math.floor(R() * G) * 9 + gauss() * 0.06; th = R() * 6.2832; rad = 3.0 + gauss() * 0.04;
  }
  out[o] = s; out[o + 1] = th; out[o + 2] = rad; out[o + 3] = kind;
}

// ---------- padlock (local units ×2.3) ----------
// group codes: 0 body (0 face · .2 side · .4 edge · .6 plate · .8 keyhole) · 1 shackle · 2 key · 3 halo ring · 4 drifting shell
const K = 2.3;
function inHole(x, y) {
  return Math.hypot(x, y + 0.3) < 0.155 || (y <= -0.42 && y >= -0.8 && Math.abs(x) < 0.055 + 0.09 * ((-0.42 - y) / 0.38));
}
function lockPoint(R, gauss, out, o) {
  const r = R();
  let x, y, z, g = 0;
  if (r < 0.26) {
    const back = R() < 0.42; let tr = 0;
    do { x = (R() * 2 - 1) * 0.8; y = -1.05 + R() * 1.15; tr++; } while (!back && tr < 24 && inHole(x, y));
    z = (back ? -1 : 1) * (0.4 + R() * 0.05); g = 0;
  } else if (r < 0.37) {
    const f = R();
    if (f < 0.5) { x = (R() < 0.5 ? -1 : 1) * (0.78 + R() * 0.05); y = -1.05 + R() * 1.15; z = (R() * 2 - 1) * 0.42; }
    else { y = f < 0.75 ? 0.08 + R() * 0.04 : -1.07 + R() * 0.04; x = (R() * 2 - 1) * 0.8; z = (R() * 2 - 1) * 0.42; }
    g = 0.2;
  } else if (r < 0.49) {
    const u = R(), e = Math.floor(R() * 12), ys = [-1.05, 0.1], xs = [-0.8, 0.8], zs = [-0.42, 0.42];
    if (e < 4) { x = -0.8 + u * 1.6; y = ys[e & 1]; z = zs[(e >> 1) & 1]; }
    else if (e < 8) { y = -1.05 + u * 1.15; x = xs[e & 1]; z = zs[(e >> 1) & 1]; }
    else { z = -0.42 + u * 0.84; x = xs[e & 1]; y = ys[(e >> 1) & 1]; }
    x += gauss() * 0.008; y += gauss() * 0.008; z += gauss() * 0.008; g = 0.4;
  } else if (r < 0.54) {
    if (R() < 0.8) {
      const u = R(), e = Math.floor(R() * 4), x0 = -0.68, x1 = 0.68, y0 = -0.95, y1 = -0.02;
      if (e === 0) { x = x0 + u * (x1 - x0); y = y0; } else if (e === 1) { x = x0 + u * (x1 - x0); y = y1; }
      else if (e === 2) { x = x0; y = y0 + u * (y1 - y0); } else { x = x1; y = y0 + u * (y1 - y0); }
      x += gauss() * 0.006; y += gauss() * 0.006;
    } else {
      const k = Math.floor(R() * 4), a = R() * 6.283, rr = Math.sqrt(R()) * 0.035;
      x = (k & 1 ? 0.6 : -0.6) + Math.cos(a) * rr; y = (k & 2 ? -0.12 : -0.86) + Math.sin(a) * rr;
    }
    z = 0.452 + R() * 0.01; g = 0.6;
  } else if (r < 0.6) {
    const f = R();
    if (f < 0.45) { const a = R() * 6.283, R2 = 0.165 + 0.016 * R(); x = Math.cos(a) * R2; y = -0.3 + Math.sin(a) * R2; }
    else if (f < 0.75) { const yy = -0.42 - R() * 0.38, w2 = 0.055 + 0.09 * ((-0.42 - yy) / 0.38); x = (R() < 0.5 ? -1 : 1) * (w2 + 0.012 + 0.012 * R()); y = yy; }
    else { const a = R() * 6.283; x = Math.cos(a) * 0.26; y = -0.5 + Math.sin(a) * 0.42; }
    z = 0.42 + R() * 0.05; g = 0.8;
  } else if (r < 0.63) {
    const a = R() * 6.283; x = Math.cos(a) * 0.15; y = -0.3 + Math.sin(a) * 0.15; z = 0.42 - R() * 0.6; g = 0.8;
  } else if (r < 0.81) {
    g = 1; const phi = R() * 6.283, tr2 = 0.07;
    if (R() < 0.74) {
      const t2 = Math.PI * R(), cv = Math.cos(t2), sv = Math.sin(t2);
      x = cv * 0.55 + Math.cos(phi) * cv * tr2; y = 0.1 + sv * 0.72 + Math.cos(phi) * sv * tr2; z = Math.sin(phi) * tr2;
    } else {
      x = (R() < 0.5 ? -0.55 : 0.55) + Math.cos(phi) * tr2; y = -0.16 + R() * 0.28; z = Math.sin(phi) * tr2;
    }
  } else if (r < 0.885) {
    // key, in its own frame: shaft along +z, keyhole plane at z=0, bit pointing +y
    g = 2; const kr = R();
    if (kr < 0.4) { const a = R() * 6.283; x = Math.cos(a) * 0.042; y = Math.sin(a) * 0.042; z = -0.28 + R() * 1.06; }
    else if (kr < 0.54) {
      z = -0.27 + R() * 0.27;
      const seg = Math.floor((z + 0.27) / 0.054), top = 0.155 - (seg % 2 ? 0.045 : 0) - (seg === 2 ? 0.03 : 0);
      x = (R() - 0.5) * 0.024; y = 0.042 + R() * (top - 0.042);
    } else if (kr < 0.6) { const a = R() * 6.283; x = Math.cos(a) * 0.07; y = Math.sin(a) * 0.07; z = 0.78 + R() * 0.04; }
    else {
      // flat bow: an oval loop standing in the shaft's plane, so a 90° turn is unmistakable
      const a = R() * 6.283, band = 0.78 + R() * 0.22;
      y = Math.cos(a) * 0.2 * band; z = 0.98 + Math.sin(a) * 0.17 * band; x = (R() - 0.5) * 0.026;
      if (R() < 0.22) { y *= 0.5; z = 0.98 + (z - 0.98) * 0.5; }
    }
  } else if (r < 0.95) {
    g = 3; const a = R() * 6.283, RR = 1.9 + gauss() * 0.1;
    x = Math.cos(a) * RR; y = gauss() * 0.025; z = Math.sin(a) * RR;
  } else {
    g = 4; const a = R() * 6.283, el = Math.acos(2 * R() - 1), r3 = 2.3 + R() * 1.6;
    x = Math.sin(el) * Math.cos(a) * r3; y = Math.sin(el) * Math.sin(a) * r3 * 0.8; z = Math.cos(el) * r3 * 0.6;
  }
  out[o] = x * K; out[o + 1] = y * K; out[o + 2] = z * K; out[o + 3] = g;
}

// ---------- the main system ----------
export function buildMain({ pixels, w, h, meta, N, S0, Lt, seed = 7 }) {
  const R = mulberry32(seed), gauss = gaussFn(R);
  const P = w * h, cdf = new Float32Array(P);
  let run = 0;
  for (let i = 0; i < P; i++) { const g = pixels[i * 4 + 1] / 255; run += g * g; cdf[i] = run; }

  const pos = new Float32Array(N * 3), scat = new Float32Array(N * 4), tun = new Float32Array(N * 4);
  const lock = new Float32Array(N * 4), misc = new Float32Array(N * 2);
  const sc = meta.scale * S0;
  // On a globe, each point sits on the sphere's front face, shifted back so the eye (Ottawa) is at depth 0.
  const G = meta.globe || 0, eyeZ = G ? Math.sqrt(Math.max(0, G * G - meta.eye[0] ** 2 - meta.eye[1] ** 2)) : 0;
  for (let i = 0; i < N; i++) {
    const t = R() * run;
    let lo = 0, hi = P - 1;
    while (lo < hi) { const m = (lo + hi) >> 1; if (cdf[m] < t) lo = m + 1; else hi = m; }
    const px = (lo % w) + R(), py = ((lo / w) | 0) + R(), lum = pixels[lo * 4] / 255;
    pos[i * 3] = (px - meta.cx) * sc;
    pos[i * 3 + 1] = -(py - meta.cy) * sc;
    if (G) {
      const lx = (px - meta.cx) * meta.scale, ly = -(py - meta.cy) * meta.scale;
      pos[i * 3 + 2] = (Math.sqrt(Math.max(0, G * G - lx * lx - ly * ly)) - eyeZ + gauss() * 0.008) * S0;
    } else pos[i * 3 + 2] = ((lum - 0.5) * 0.3 + gauss() * 0.05) * S0;
    misc[i * 2] = lum; misc[i * 2 + 1] = R();

    // before you enter, the same stars are a three-armed spiral galaxy; entering condenses it into you
    if (R() < 0.16) {
      const rr = Math.abs(gauss()) * 1.4, a = R() * 6.2832;
      scat[i * 4] = Math.cos(a) * rr + 0.5; scat[i * 4 + 1] = Math.sin(a) * rr * 0.62; scat[i * 4 + 2] = -2 + gauss() * 0.35;
    } else {
      const arm = Math.floor(R() * 3), rr = 2.2 + Math.pow(R(), 0.75) * 9.5;
      const a = arm * 2.0944 + rr * 0.42 + gauss() * (0.22 + rr * 0.02);
      scat[i * 4] = Math.cos(a) * rr + 0.5; scat[i * 4 + 1] = Math.sin(a) * rr * 0.62; scat[i * 4 + 2] = -2 + gauss() * 0.5;
    }
    scat[i * 4 + 3] = R();

    tunnelPoint(R, gauss, Lt, tun, i * 4);
    lockPoint(R, gauss, lock, i * 4);
  }
  return { pos, scat, tun, lock, misc };
}

// ---------- the laptop, drawn in code ----------
// Local frame: deck on y=0, screen hinged at the back edge and leaning back 12°, facing +z.
// kind: 0 display · 1 bezel · 2 deck · 3 keys · 4 trackpad · 5 deck edge · 6 hinge
export function buildLaptop({ N, seed = 11 }) {
  const R = mulberry32(seed);
  const pos = new Float32Array(N * 3), uvk = new Float32Array(N * 4), scat = new Float32Array(N * 3);
  const tilt = (12 * Math.PI) / 180, SH = 0.95, SW = 1.5, ct = Math.cos(tilt), st = Math.sin(tilt);
  const scr = (u, v, lift) => [(u - 0.5) * SW, v * SH * ct + lift * st, -0.5 - v * SH * st + lift * ct];
  for (let i = 0; i < N; i++) {
    const r = R();
    let p, u = 0, v = 0, kind;
    if (r < 0.36) { kind = 0; u = 0.045 + R() * 0.91; v = 0.06 + R() * 0.89; p = scr(u, v, 0.006); }
    else if (r < 0.48) {
      kind = 1; const e = Math.floor(R() * 4), t = R(), inner = R() < 0.5, m = inner ? 0.035 : 0;
      if (e === 0) { u = m + t * (1 - 2 * m); v = m; } else if (e === 1) { u = m + t * (1 - 2 * m); v = 1 - m; }
      else if (e === 2) { u = m; v = m + t * (1 - 2 * m); } else { u = 1 - m; v = m + t * (1 - 2 * m); }
      p = scr(u, v, 0.008);
    } else if (r < 0.64) { kind = 2; u = R(); v = R(); p = [(u - 0.5) * SW, 0, (v - 0.5) * 1.0]; }
    else if (r < 0.8) {
      kind = 3;
      const kx = Math.floor(R() * 13), kz = Math.floor(R() * 5), ox = (kx + 0.12 + R() * 0.76) / 13, oz = (kz + 0.15 + R() * 0.7) / 5;
      u = ox; v = oz; p = [(ox - 0.5) * SW * 0.9, 0.006, -0.42 + oz * 0.47];
    } else if (r < 0.85) {
      kind = 4; const e = Math.floor(R() * 4), t = R();
      const x0 = -0.25, x1 = 0.25, z0 = 0.14, z1 = 0.42;
      p = e === 0 ? [x0 + t * 0.5, 0.004, z0] : e === 1 ? [x0 + t * 0.5, 0.004, z1] : e === 2 ? [x0, 0.004, z0 + t * 0.28] : [x1, 0.004, z0 + t * 0.28];
    } else if (r < 0.94) {
      kind = 5; const e = Math.floor(R() * 5), t = R();
      p = e === 0 ? [(t - 0.5) * SW, -R() * 0.03, 0.5] : e === 1 ? [-SW / 2, -R() * 0.03, t - 0.5] : e === 2 ? [SW / 2, -R() * 0.03, t - 0.5] : e === 3 ? [(t - 0.5) * SW, 0, -0.5] : [(t - 0.5) * SW, -0.03, 0.5 - R() * 0.02];
    } else { kind = 6; p = [(R() - 0.5) * SW * 0.96, R() * 0.02, -0.5 + R() * 0.02]; }
    pos[i * 3] = p[0]; pos[i * 3 + 1] = p[1]; pos[i * 3 + 2] = p[2];
    uvk[i * 4] = u; uvk[i * 4 + 1] = v; uvk[i * 4 + 2] = kind; uvk[i * 4 + 3] = R();
    const a = R() * 6.2832, rr = 4 + R() * 5;
    scat[i * 3] = Math.cos(a) * rr; scat[i * 3 + 1] = Math.sin(a) * rr * 0.6; scat[i * 3 + 2] = (R() - 0.5) * 6;
  }
  return { pos, uvk, scat };
}

// ---------- three gadgets, drawn in code: Meta Ray-Ban Display glasses, DJI Osmo Pocket 3, DJI Mini 4 Pro ----------
// Every point: local position, part = [kind, hash, u, v], pivot = [x, y, z, mode], scat = where the intro starts it.
// kind: 0 shell · 1 edge · 2 glass · 3 screen · 4 lens ring · 5 light · 6 prop blade · 7 prop blur · 8 accent
// pivot mode: 0 fixed · 1 spins one way · 2 spins the other · 3 pans side to side
// Parts are picked at random per point, so drawing only the first n points still shows the whole object.
function gadgetArrays(N) {
  return { pos: new Float32Array(N * 3), part: new Float32Array(N * 4), pivot: new Float32Array(N * 4), scat: new Float32Array(N * 3), n: 0 };
}
function put(A, R, x, y, z, kind, u = 0, v = 0, pv = null) {
  const i = A.n++;
  A.pos[i * 3] = x; A.pos[i * 3 + 1] = y; A.pos[i * 3 + 2] = z;
  A.part[i * 4] = kind; A.part[i * 4 + 1] = R(); A.part[i * 4 + 2] = u; A.part[i * 4 + 3] = v;
  if (pv) { A.pivot[i * 4] = pv[0]; A.pivot[i * 4 + 1] = pv[1]; A.pivot[i * 4 + 2] = pv[2]; A.pivot[i * 4 + 3] = pv[3]; }
  const a = R() * 6.2832, rr = 2.5 + R() * 3.5;
  A.scat[i * 3] = Math.cos(a) * rr; A.scat[i * 3 + 1] = Math.sin(a) * rr * 0.7; A.scat[i * 3 + 2] = (R() - 0.5) * 4;
}
const ring = (R, r0, r1) => { const a = R() * 6.2832, r = r0 + (r1 - r0) * R(); return [Math.cos(a) * r, Math.sin(a) * r]; };
const disc = (R, r) => { const a = R() * 6.2832, q = Math.sqrt(R()) * r; return [Math.cos(a) * q, Math.sin(a) * q]; };
// a point on the outline of a rounded rectangle (half sizes hx, hz, corner radius rad) → [x, z]
function rrect(R, hx, hz, rad) {
  const sx = 2 * (hx - rad), sz = 2 * (hz - rad), arc = (Math.PI * rad) / 2, tot = 2 * sx + 2 * sz + 4 * arc;
  let d = R() * tot;
  if (d < sx) return [-hx + rad + d, hz]; d -= sx;
  if (d < sx) return [-hx + rad + d, -hz]; d -= sx;
  if (d < sz) return [hx, -hz + rad + d]; d -= sz;
  if (d < sz) return [-hx, -hz + rad + d]; d -= sz;
  const c = Math.floor(d / arc), a = ((d - c * arc) / arc) * (Math.PI / 2) + (c * Math.PI) / 2;
  const cx = c === 0 || c === 3 ? hx - rad : -hx + rad, cz = c < 2 ? hz - rad : -hz + rad;
  return [cx + Math.cos(a) * rad, cz + Math.sin(a) * rad];
}
// a point on the surface of a box (centre c, half sizes h); edge = true when it sits on one of the 12 edges
function boxSurface(R, c, h, edgeFrac) {
  if (R() < edgeFrac) {
    const e = Math.floor(R() * 12), t = R() * 2 - 1, s1 = e & 1 ? 1 : -1, s2 = e & 2 ? 1 : -1, ax = e >> 2;
    const p = ax === 0 ? [t * h[0], s1 * h[1], s2 * h[2]] : ax === 1 ? [s1 * h[0], t * h[1], s2 * h[2]] : [s1 * h[0], s2 * h[1], t * h[2]];
    return [c[0] + p[0], c[1] + p[1], c[2] + p[2], true];
  }
  const ax = Math.floor(R() * 3), sg = R() < 0.5 ? -1 : 1, u = R() * 2 - 1, v = R() * 2 - 1;
  const p = ax === 0 ? [sg * h[0], u * h[1], v * h[2]] : ax === 1 ? [u * h[0], sg * h[1], v * h[2]] : [u * h[0], v * h[1], sg * h[2]];
  return [c[0] + p[0], c[1] + p[1], c[2] + p[2], false];
}

// Meta Ray-Ban Display: Wayfarer-style frames facing +z, the in-lens display in the wearer's right lens.
function buildGlasses(N, R) {
  const A = gadgetArrays(N), LX = 0.37, BH = 0.2;
  const contour = (side, t, k) => {
    const c = Math.cos(t), s = Math.sin(t);
    const ex = Math.sign(c) * Math.sqrt(Math.abs(c)), ey = Math.sign(s) * Math.sqrt(Math.abs(s));
    const w = 0.27 + 0.06 * (ey * 0.5 + 0.5);
    let x = ex * w * k, y = ey * BH * k;
    const out = ex * side; if (out > 0 && ey > 0) y += 0.04 * out * ey * k;
    return [side * LX + x, y];
  };
  while (A.n < N) {
    const r = R(), side = R() < 0.5 ? -1 : 1;
    if (r < 0.42) {                       // the rims, thick across the brow like a Wayfarer
      const t = R() * 6.2832, top = Math.sin(t) > 0.25, kmax = top ? 1.3 : 1.16, k = 1 + R() * (kmax - 1);
      const [x, y] = contour(side, t, k), z = R() < 0.8 ? 0.045 : R() * 0.045;
      put(A, R, x, y, z, k > kmax - 0.025 || k < 1.018 ? 1 : 0);
    } else if (r < 0.46) {                // bridge
      const t = R(); put(A, R, -0.08 + 0.16 * t, 0.075 + 0.035 * Math.sin(Math.PI * t) + (R() - 0.5) * 0.05, 0.02 + R() * 0.025, R() < 0.35 ? 1 : 0);
    } else if (r < 0.49) {                // hinges
      put(A, R, side * (0.68 + R() * 0.07), 0.06 + R() * 0.12, -0.06 + R() * 0.1, R() < 0.4 ? 1 : 0);
    } else if (r < 0.71) {                // temples: thick near the hinge (that's where the tech lives), curling down at the ear
      const t = R(), z = 0.0 - 1.25 * t, xs = side * (0.73 - 0.05 * t);
      const yb = 0.12 - 0.015 * t - (t > 0.8 ? 0.22 * Math.pow((t - 0.8) / 0.2, 1.6) : 0), hgt = 0.09 - 0.045 * t;
      if (R() < 0.5) put(A, R, xs + (R() < 0.5 ? -0.016 : 0.016), yb + (R() - 0.5) * hgt, z, 0);
      else put(A, R, xs + (R() - 0.5) * 0.032, yb + (R() < 0.5 ? -0.5 : 0.5) * hgt, z, 1);
    } else if (r < 0.85) {                // tinted lenses
      const t = R() * 6.2832, k = Math.sqrt(R()) * 0.97, [x, y] = contour(side, t, k);
      put(A, R, x, y, 0.025 + 0.015 * (1 - k * k), 2);
    } else if (r < 0.965) {               // the display, in the wearer's right lens
      const u = R(), v = R();
      put(A, R, -LX + 0.02 + (u - 0.5) * 0.21, -0.035 + (v - 0.5) * 0.13, 0.043, 3, u, v);
    } else if (r < 0.99) {                // camera on one corner
      if (R() < 0.65) { const [a, b] = ring(R, 0.024, 0.032); put(A, R, 0.62 + a, 0.13 + b, 0.05, 4); }
      else { const [a, b] = disc(R, 0.016); put(A, R, 0.62 + a, 0.13 + b, 0.05, 2); }
    } else {                              // capture LED on the other
      const [a, b] = disc(R, 0.012); put(A, R, -0.62 + a, 0.13 + b, 0.05, 5, 2);
    }
  }
  return A;
}

// DJI Osmo Pocket 3: a slim handle with its 2-inch screen, and a 3-axis gimbal head that pans on top.
// The screen turns from portrait to 16:9 landscape and back (pivot mode 5 spins it about its centre), and the
// red record button gets pressed in between. u, v carry each screen point's place on the portrait screen.
const PK = { sw: 0.27, sh: 0.48, cy: 0.075 };   // portrait screen: width, height (16:9), centre height
function buildPocket(N, R) {
  const A = gadgetArrays(N), hx = 0.21, hz = 0.165, rad = 0.08, PAN = [0, 0, 0, 3], SCR = [0, PK.cy, hz + 0.006, 5];
  const scr = (u, v, kind, lift = 0.006) => put(A, R, (u - 0.5) * PK.sw, PK.cy + (v - 0.5) * PK.sh, hz + lift, kind, u, v, SCR);
  while (A.n < N) {
    const r = R();
    if (r < 0.27) { const [x, z] = rrect(R, hx, hz, rad); put(A, R, x, -0.72 + R() * 1.0, z, 0); }
    else if (r < 0.33) { const [x, z] = rrect(R, hx, hz, rad); put(A, R, x, R() < 0.5 ? -0.72 : 0.28, z, 1); }
    else if (r < 0.35) { put(A, R, (R() * 2 - 1) * (hx - 0.02), R() < 0.5 ? -0.72 : 0.28, (R() * 2 - 1) * (hz - 0.02), 0); }
    else if (r < 0.55) scr(R(), R(), 3);
    // extra points where the REC dot and shutter icon land once the screen is sideways, so they read clearly
    else if (r < 0.57) { const [a, b] = disc(R, 0.03); scr(0.5 + (-0.105 + a) / PK.sw, 0.5 + (-0.21 + b) / PK.sh, 3); }
    else if (r < 0.58) { const [a, b] = disc(R, 0.03); scr(0.5 + a / PK.sw, 0.5 + (0.205 + b) / PK.sh, 3); }
    else if (r < 0.61) {
      const e = Math.floor(R() * 4), t = R();
      const [u, v] = e === 0 ? [t, 0] : e === 1 ? [t, 1] : e === 2 ? [0, t] : [1, t];
      scr(u, v, 1, 0.008);
    } else if (r < 0.645) { const [a, b] = ring(R, 0.028, 0.046); put(A, R, a, -0.23 + b, hz + 0.004, 5, 0); }   // record button
    else if (r < 0.655) { const [a, b] = disc(R, 0.022); put(A, R, a, -0.23 + b, hz + 0.006, 5, 0); }
    else if (r < 0.665) { const [a, b] = ring(R, 0.02, 0.028); put(A, R, a, -0.38 + b, hz + 0.004, 1); }
    // everything above the handle pans with the gimbal
    else if (r < 0.7) { const [a, b] = ring(R, 0.095, 0.105); put(A, R, a, 0.28 + R() * 0.06, b, R() < 0.3 ? 1 : 0, 0, 0, PAN); }
    else if (r < 0.75) { const [x, y, z, ed] = boxSurface(R, [0.2, 0.47, 0], [0.03, 0.17, 0.045], 0.4); put(A, R, x, y, z, ed ? 1 : 0, 0, 0, PAN); }
    else if (r < 0.77) { const [a, b] = ring(R, 0.055, 0.07); put(A, R, 0.168, 0.52 + a, b, 1, 0, 0, PAN); }
    else if (r < 0.88) { const [x, y, z, ed] = boxSurface(R, [-0.03, 0.52, 0], [0.14, 0.12, 0.12], 0.3); put(A, R, x, y, z, ed ? 1 : 0, 0, 0, PAN); }
    else if (r < 0.91) { const [a, b] = ring(R, 0.098, 0.108); put(A, R, -0.03 + a, 0.52 + b, 0.122, 1, 0, 0, PAN); }
    else if (r < 0.96) { const [a, b] = ring(R, 0.07, 0.082); put(A, R, -0.03 + a, 0.52 + b, 0.124, 4, 0, 0, PAN); }
    else { const [a, b] = disc(R, 0.066); put(A, R, -0.03 + a, 0.52 + b, 0.126, R() < 0.12 ? 4 : 2, 0, 0, PAN); }
  }
  return A;
}

// DJI Mini 4 Pro: a slim tapered body, four folding arms (front ones high, rear ones low), spinning props, gimbal under the nose.
function buildDrone(N, R) {
  const A = gadgetArrays(N);
  const motors = [[0.56, 0.05, 0.42, 1], [-0.56, 0.05, 0.42, 2], [0.53, -0.05, -0.44, 2], [-0.53, -0.05, -0.44, 1]];
  const roots = [[0.15, 0.03, 0.2], [-0.15, 0.03, 0.2], [0.15, -0.03, -0.22], [-0.15, -0.03, -0.22]];
  const halfW = (z) => 0.17 - 0.06 * Math.max(0, (z - 0.08) / 0.3);
  while (A.n < N) {
    const r = R();
    if (r < 0.26) {
      const f = R(), z = -0.42 + R() * 0.8, w = halfW(z);
      if (f < 0.4) { const x = (R() * 2 - 1) * w; put(A, R, x, 0.085 + 0.015 * (1 - (x / w) ** 2), z, 0); }
      else if (f < 0.6) put(A, R, (R() * 2 - 1) * w, -0.08, z, 0);
      else if (f < 0.85) put(A, R, (R() < 0.5 ? -1 : 1) * w, -0.08 + R() * 0.165, z, 0);
      else { const zz = R() < 0.5 ? 0.38 : -0.42; put(A, R, (R() * 2 - 1) * halfW(zz), -0.08 + R() * 0.165, zz, 0); }
    } else if (r < 0.34) {
      const z = -0.42 + R() * 0.8, w = halfW(z), top = R() < 0.6;
      put(A, R, (R() < 0.5 ? -1 : 1) * w, top ? 0.085 : -0.08, z, 1);
    } else if (r < 0.37) { put(A, R, (R() < 0.5 ? -1 : 1) * 0.07, 0.1, -0.3 + R() * 0.4, 8); }
    else if (r < 0.47) {
      const m = Math.floor(R() * 4), t = R(), a = roots[m], b = motors[m], [oy, oz] = ring(R, 0.024, 0.03);
      put(A, R, a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + oy, a[2] + (b[2] - a[2]) * t + oz * 0.6, oy > 0.02 ? 1 : 0);
    } else if (r < 0.53) {
      const m = motors[Math.floor(R() * 4)], [a, b] = ring(R, 0.05, 0.058), y = m[1] - 0.03 + R() * 0.08;
      put(A, R, m[0] + a, y, m[2] + b, y > m[1] + 0.04 || y < m[1] - 0.02 ? 1 : 0);
    } else if (r < 0.86) {
      const m = motors[Math.floor(R() * 4)], pv = [m[0], m[1] + 0.06, m[2], m[3]];
      if (R() < 0.6) {
        const rr = 0.05 + R() * 0.29, w = 0.045 * (1 - (0.55 * (rr - 0.05)) / 0.29), side = (R() - 0.5) * w;
        const a = (R() < 0.5 ? 0 : Math.PI) + 0.25 * (rr / 0.34) ** 2 * (m[3] === 1 ? 1 : -1);
        put(A, R, pv[0] + Math.cos(a) * rr - Math.sin(a) * side, pv[1], pv[2] + Math.sin(a) * rr + Math.cos(a) * side, 6, 0, 0, pv);
      } else {
        const a = R() * 6.2832, rr = Math.sqrt(R() * (0.34 ** 2 - 0.05 ** 2) + 0.05 ** 2);
        put(A, R, pv[0] + Math.cos(a) * rr, pv[1], pv[2] + Math.sin(a) * rr, 7, 0, 0, pv);
      }
    } else if (r < 0.94) {
      const f = R();
      if (f < 0.55) { const [x, y, z, ed] = boxSurface(R, [0, -0.11, 0.43], [0.055, 0.05, 0.05], 0.35); put(A, R, x, y, z, ed ? 1 : 0); }
      else if (f < 0.85) { const [a, b] = ring(R, 0.026, 0.034); put(A, R, a, -0.11 + b, 0.482, 4); }
      else { const [a, b] = disc(R, 0.024); put(A, R, a, -0.11 + b, 0.483, 2); }
    } else {
      const k = Math.floor(R() * 4), m = motors[k], [a, b] = disc(R, 0.016);
      put(A, R, m[0] + a, m[1] - 0.045, m[2] + b, 5, k === 0 ? 1 : k === 1 ? 0 : 2);
    }
  }
  return A;
}

// Tesla Model Y (the 2025 refresh): a tall fastback crossover with a glass roof, full-width light bars front and back,
// and wheels that turn. Length runs along z with the nose at +z; the ground is y = 0.
// pivot mode 4 spins a wheel about its axle.
function buildCar(N, R) {
  const A = gadgetArrays(N);
  const prof = [[1.1, 0.44], [1.05, 0.52], [0.42, 0.6], [-0.02, 0.93], [-0.5, 0.935], [-0.95, 0.7], [-1.08, 0.665], [-1.1, 0.6]];
  const top = (z) => {
    for (let i = 1; i < prof.length; i++) {
      const [z0, y0] = prof[i - 1], [z1, y1] = prof[i];
      if (z <= z0 && z >= z1) { const t = (z0 - z) / (z0 - z1), e = t * t * (3 - 2 * t); return y0 + (y1 - y0) * (0.35 * t + 0.65 * e); }
    }
    return 0.5;
  };
  const belt = (z) => (z > 0.42 || z < -0.95 ? top(z) : 0.62 + 0.06 * ((0.42 - z) / 1.37));
  const BOT = 0.14;
  const halfW = (y, z) => {
    let w = 0.46;
    const b = belt(z), t = top(z);
    if (y > b && t > b) w -= 0.12 * Math.min(1, (y - b) / (t - b));
    if (z > 0.85) w *= 1 - 0.32 * ((z - 0.85) / 0.25) ** 2;
    if (z < -0.95) w *= 1 - 0.22 * ((-0.95 - z) / 0.15) ** 2;
    return w;
  };
  const wheels = [[0.67, 1], [-0.67, 1]].flatMap(([z]) => [[0.43, 0.19, z], [-0.43, 0.19, z]]);
  const inArch = (z, y) => wheels.some((w) => Math.hypot(z - w[2], y - w[1]) < 0.245);
  // Most points go to what makes it read as a Model Y from the side: the fastback roofline, the window outline,
  // the light bars and the wheels. The panels in between are only a faint fill.
  while (A.n < N) {
    const r = R(), side = R() < 0.5 ? -1 : 1;
    if (r < 0.17) {                       // body sides below the windows, with the wheel arches cut out
      const z = -1.08 + R() * 2.16, y = BOT + R() * (belt(z) - BOT);
      if (inArch(z, y)) continue;
      put(A, R, side * halfW(y, z), y, z, 0);
    } else if (r < 0.22) {                // hood and the short rear deck
      const z = R() < 0.82 ? 0.42 + R() * 0.64 : -1.08 + R() * 0.13, w = halfW(top(z), z) * (R() * 2 - 1);
      put(A, R, w, top(z) - 0.02 * (w / 0.46) ** 2, z, 0);
    } else if (r < 0.25) {                // smooth nose (no grille)
      const x = (R() * 2 - 1) * 0.4, y = 0.15 + R() * 0.32;
      put(A, R, x, y, 1.1 - 0.12 * (x / 0.42) ** 2 - 0.05 * ((y - 0.3) / 0.17) ** 2, 0);
    } else if (r < 0.27) {                // tail
      const x = (R() * 2 - 1) * 0.4, y = 0.18 + R() * 0.46;
      put(A, R, x, y, -1.1 + 0.08 * (x / 0.42) ** 2, 0);
    } else if (r < 0.33) {                // windshield, glass roof and rear glass
      const z = -0.95 + R() * 1.37, t = top(z), w = halfW(t, z) * 0.96 * (R() * 2 - 1);
      put(A, R, w, t - 0.01, z, 2);
    } else if (r < 0.37) {                // side windows
      const z = -0.9 + R() * 1.27, b = belt(z), t = top(z) - 0.03, y = b + R() * Math.max(0, t - b);
      put(A, R, side * (halfW(y, z) + 0.004), y, z, 2);
    } else if (r < 0.46) {                // the silhouette: nose to tail along the top edge
      const z = -1.1 + R() * 2.2, y = top(z);
      put(A, R, side * halfW(y, z) * 0.97, y, z, 1);
    } else if (r < 0.58) {                // character lines: beltline, window frame, pillars, rocker, door seams
      const f = R();
      let z, y;
      if (f < 0.24) { z = -0.95 + R() * 1.37; y = belt(z); }
      else if (f < 0.44) { z = -0.9 + R() * 1.27; y = top(z) - 0.03; }
      else if (f < 0.56) { z = R() < 0.5 ? -0.22 : 0.38 - 0.2 * R(); y = belt(z) + R() * (top(z) - 0.03 - belt(z)); if (z > 0.2) z = 0.38 - (y - belt(0.38)) * 0.9; }
      else if (f < 0.78) { z = -1.0 + R() * 2.0; y = BOT; if (inArch(z, y + 0.02)) continue; }
      else { const zs = [0.36, -0.22, -0.66]; z = zs[Math.floor(R() * 3)]; y = BOT + R() * (belt(z) - BOT); if (inArch(z, y)) continue; }
      put(A, R, side * (halfW(y, z) + 0.005), y, z, 1);
    } else if (r < 0.63) {                // wheel arch outlines
      const w = wheels[Math.floor(R() * 4)], a = R() * Math.PI, rr = 0.245;
      const z = w[2] + Math.cos(a) * rr, y = w[1] + Math.sin(a) * rr;
      if (y < BOT) continue;
      put(A, R, Math.sign(w[0]) * (halfW(y, z) + 0.005), y, z, 1);
    } else if (r < 0.67) {                // front light bar, and the headlamps below it
      if (R() < 0.6) { const x = (R() * 2 - 1) * 0.42; put(A, R, x, 0.515 + (R() - 0.5) * 0.008, 1.075 - 0.12 * (x / 0.42) ** 2, 4); }
      else { const x = side * (0.25 + R() * 0.15); put(A, R, x, 0.43 + (R() - 0.5) * 0.02, 1.08 - 0.12 * (x / 0.42) ** 2, 4); }
    } else if (r < 0.7) {                 // rear light bar, red
      const x = (R() * 2 - 1) * 0.43; put(A, R, x, 0.625 + (R() - 0.5) * 0.012, -1.095 + 0.08 * (x / 0.42) ** 2, 5, 0);
    } else if (r < 0.705) {               // charge port, rear left (glows green while charging)
      const [a, b] = disc(R, 0.03); put(A, R, 0.468, 0.62 + b, -0.92 + a, 5, 1);
    } else if (r < 0.715) {               // mirrors
      const [a, b] = disc(R, 0.035); put(A, R, side * (0.5 + R() * 0.04), 0.64 + b, 0.33 + a, R() < 0.4 ? 1 : 0);
    } else {                              // wheels: tyre, rim and five spokes, all turning about the axle
      const w = wheels[Math.floor(R() * 4)], out = Math.sign(w[0]), pv = [w[0], w[1], w[2], 4], f = R();
      if (f < 0.24) { const a = R() * 6.2832; put(A, R, w[0] + (R() - 0.5) * 0.12, w[1] + Math.sin(a) * 0.19, w[2] + Math.cos(a) * 0.19, 0, 0, 0, pv); }
      else if (f < 0.42) { const a = R() * 6.2832, rr = 0.15 + R() * 0.04; put(A, R, w[0] + out * 0.06, w[1] + Math.sin(a) * rr, w[2] + Math.cos(a) * rr, 0, 0, 0, pv); }
      else if (f < 0.64) { const a = R() * 6.2832, rr = 0.145 + R() * 0.01; put(A, R, w[0] + out * 0.062, w[1] + Math.sin(a) * rr, w[2] + Math.cos(a) * rr, 1, 0, 0, pv); }
      else if (f < 0.94) {
        const k = Math.floor(R() * 5), a = (k / 5) * 6.2832 + (R() - 0.5) * 0.12, rr = 0.03 + R() * 0.11;
        put(A, R, w[0] + out * 0.064, w[1] + Math.sin(a) * rr, w[2] + Math.cos(a) * rr, 4, 0, 0, pv);
      } else { const [a, b] = disc(R, 0.03); put(A, R, w[0] + out * 0.066, w[1] + b, w[2] + a, 4, 0, 0, pv); }
    }
  }
  return A;
}

// A Tesla Supercharger stall beside the parking spot, with its cable. Same frame as the car (ground y = 0, the car's
// nose toward +z, its left side toward +x). Cable points (kind 9) store a small offset in position and their place
// along the cable in u; the shader lays them on a curve that runs from the stall to the holster or to the car's port.
function buildCharger(N, R) {
  const A = gadgetArrays(N), x0 = 0.6, x1 = 0.74, z0 = -1.48, z1 = -1.16, top = 1.02, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  while (A.n < N) {
    const r = R();
    if (r < 0.34) {                       // the slim body
      const [x, y, z, ed] = boxSurface(R, [cx, top / 2, cz], [(x1 - x0) / 2, top / 2, (z1 - z0) / 2], 0.28);
      put(A, R, x, y, z, ed ? 1 : 0);
    } else if (r < 0.42) {                // rounded cap
      const a = R() * Math.PI, w = (x1 - x0) / 2;
      put(A, R, cx + Math.cos(a) * w, top + Math.sin(a) * 0.05, z0 + R() * (z1 - z0), R() < 0.5 ? 1 : 0);
    } else if (r < 0.5) {                 // light strip down the outer face
      put(A, R, x1 + 0.004, 0.18 + R() * 0.74, z1 - 0.035 + (R() - 0.5) * 0.012, 4);
    } else if (r < 0.54) {                // the red logo near the top
      const [a, b] = disc(R, 0.03); put(A, R, x1 + 0.005, 0.86 + b, cz + a, 5, 0);
    } else if (r < 0.58) {                // holster
      const [a, b] = ring(R, 0.025, 0.035); put(A, R, x1 + 0.004, 0.66 + b, -1.3 + a, 1);
    } else if (r < 0.62) {                // base plate
      put(A, R, cx + (R() - 0.5) * 0.24, 0.005, cz + (R() - 0.5) * 0.42, 1);
    } else {                              // cable
      const [a, b] = disc(R, 0.011); put(A, R, a, b, (R() - 0.5) * 0.022, 9, R());
    }
  }
  return A;
}

export function buildGadgets({ NG = 5200, NP = 4600, ND = 6800, NC = 9000, NS = 2600, seed = 23 }) {
  const R = mulberry32(seed);
  const strip = (A) => ({ pos: A.pos, part: A.part, pivot: A.pivot, scat: A.scat });
  return { glasses: strip(buildGlasses(NG, R)), pocket: strip(buildPocket(NP, R)), drone: strip(buildDrone(ND, R)), car: strip(buildCar(NC, mulberry32(seed + 7))), charger: strip(buildCharger(NS, mulberry32(seed + 11))) };
}
