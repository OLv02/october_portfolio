// The star system: one set of particles that is the globe, then the tunnel, then the padlock.
// Plus the laptop (drawn in code) and a soft dark disc that keeps the sky from showing through the globe.
import * as THREE from './vendor/three.module.min.js';
import { PATH_GLSL, TUN } from './path.js';

const SPRITE_FRAG = /* glsl */`
varying vec3 vColor;
void main(){
  float d = length(gl_PointCoord - .5) * 2.;
  if (d > 1.) discard;
  float core = smoothstep(.42, 0., d);
  float glow = pow(1. - d, 2.4);
  gl_FragColor = vec4(vColor * (glow * .8 + core * 1.7), 1.);
}`;

const MAIN_VERT = /* glsl */`
attribute vec4 aScat;
attribute vec4 aTun;
attribute vec4 aLock;
attribute vec2 aMisc;
uniform float uTime, uIntro, uIris, uT1, uT2, uLock, uOp, uSizeK, uPxScale, uMaxPt;
uniform float uFogNear, uFogFar, uScreenGlow, uSheen, uFaceX, uLockFlash, uInteract, uSpin;
uniform float uAfter, uGalRot, uLockDim;
uniform vec3 uV;
uniform mat3 uLockRot, uHaloRot;
uniform vec4 uMouse, uRipple;
varying vec3 vColor;
${PATH_GLSL}
const vec3 TEAL = vec3(.36, .79, .65);
const vec3 PURP = vec3(.69, .66, .93);
const vec3 MINT = vec3(.62, .88, .80);
const vec3 WHITE = vec3(.93, .96, 1.);
mat2 rot2(float a){ float c = cos(a), s = sin(a); return mat2(c, s, -s, c); }

vec3 lockWorld(vec4 L, out vec3 lpOut){
  vec3 lp = L.xyz; float g = L.w;
  if (g > 3.5) { lp.xz = rot2(uTime * .05) * lp.xz; lp.y += sin(uTime * .4 + lp.x) * .12; lpOut = lp; return uV + lp; }
  if (g > 2.5) { lp.xz = rot2(uTime * .12) * lp.xz; lp = uHaloRot * lp; lpOut = lp; return uV + lp; }
  if (g > 1.5) {
    float kIn = smoothstep(0., .45, uLock), kPush = smoothstep(.45, .58, uLock), kTurn = smoothstep(.62, .80, uLock);
    lp.xy = rot2(-kTurn * 1.5708) * lp.xy;
    lp.xz = rot2((1. - kIn) * 1.4) * lp.xz;
    lp += vec3(0., -.69, 1.035) + vec3(0., 0., (1. - kPush) * .74) + (1. - kIn) * vec3(3.4, 1.6, 2.6);
  } else if (g > .5) {
    float so = smoothstep(.80, .95, uLock);
    vec3 q = lp - vec3(1.265, 0., 0.);
    q.xz = rot2(so * 1.25) * q.xz;
    lp = q + vec3(1.265, 0., 0.);
    lp.y += so * 1.15;
  }
  lpOut = lp;
  lp.y += .28;
  return uV + uLockRot * lp;
}

void main(){
  float hash = aScat.w, lum = aMisc.x, rnd = aMisc.y;

  // ---- globe (Ottawa opens up as the camera dives in)
  vec3 pp = position;
  vec2 rel = pp.xy - uEye.xy;
  float d = length(rel) + 1e-4;
  pp.xy += rel / d * uIris * 1.8 * exp(-d * 1.1);
  pp.z += uIris * 1.4 * exp(-d * 1.6);
  float ui = clamp(uIntro * 1.8 - hash * .6, 0., 1.); ui = 1. - pow(1. - ui, 5.);
  vec3 sc = aScat.xyz; sc.xy = vec2(.5, 0.) + rot2((1. - ui) * 2.4 + uSpin) * (sc.xy - vec2(.5, 0.));
  vec3 p = mix(sc, pp, ui);

  vec3 base = hash < .45 ? TEAL : (hash < .8 ? PURP : MINT);
  if (lum > .62) base = WHITE;
  vec3 col = base * (.25 + lum);
  float lit = smoothstep(.05, .9, uFaceX - position.x) * smoothstep(.42, .9, lum);
  col = mix(col, vec3(.72, .86, 1.) * 1.2, lit * .34 * uScreenGlow);
  float sz = rnd < .02 ? .16 + .1 * fract(rnd * 53.) : .022 + .045 * lum + .012 * fract(rnd * 97.);
  // as a galaxy, the stars are fewer-looking but bigger and brighter
  sz *= mix(2.7, 1., ui); col *= mix(1.45, 1., ui);

  // dissolve from the outside in: hair and shoulders stream into the tunnel first, the eye goes last
  float dEye = length(position.xy - uEye.xy);
  float u1 = clamp(uT1 * 1.9 - (.3 * (1. - smoothstep(0., 2.2, dEye)) + hash * .25 + aTun.x / uLt * .35), 0., 1.); u1 = u1 * u1 * (3. - 2. * u1);
  float u2 = clamp(uT2 * 1.5 - hash * .5, 0., 1.); u2 = u2 * u2 * (3. - 2. * u2);

  // ---- tunnel
  if (u1 > 0. && u2 < 1.) {
    float s = aTun.x, th = aTun.y, r = aTun.z, kind = aTun.w;
    vec3 tc; float ts;
    if (kind < 1.5)      { th += uTime * .22; tc = mix(vec3(.78, .95, 1.), TEAL * 1.25, hash) * 1.1; ts = .14; }
    else if (kind < 2.5) { th += uTime * .03; tc = (hash < .5 ? PURP : TEAL) * .4; ts = .1; }
    else if (kind < 3.5) { s = mod(s - uTime * 14., uLt); tc = vec3(1., .8, .5) * 1.45; ts = .16; }
    else if (kind < 4.5) { tc = WHITE * .8; ts = .085; }
    else { float pulse = pow(max(0., sin(s * .11 - uTime * 3.2)), 10.); tc = TEAL * (.35 + 1.8 * pulse); ts = .12; }
    r *= funnel(s);
    vec3 P, N, B; pathFrame(s, P, N, B);
    vec3 tp = P + (N * cos(th) + B * sin(th)) * r;
    tc = mix(tc, tc * vec3(1.25, .95, .7), smoothstep(uLt * .5, uLt, s) * .55);
    // in flight, the stars spiral into the pupil like water down a drain, dimmed so they read as streams
    float flight = 4. * u1 * (1. - u1);
    vec3 m = mix(p, tp, u1);
    m.xy = uEye.xy + rot2(flight * 2.4) * (m.xy - uEye.xy);
    p = m; col = mix(col, tc, u1) * (1. - .5 * flight); sz = mix(sz, ts, u1) * (1. - .4 * flight);
  }

  // ---- padlock
  if (u2 > 0.) {
    vec3 lp;
    vec3 lw = lockWorld(aLock, lp);
    float g = aLock.w;
    vec3 lc; float ls;
    if (g < .1)       { lc = vec3(.80, .90, 1.) * .55; ls = .03; }
    else if (g < .3)  { lc = vec3(.80, .90, 1.) * .5;  ls = .03; }
    else if (g < .5)  { lc = vec3(.85, .95, 1.) * 1.25; ls = .05; }
    else if (g < .7)  { lc = TEAL * 1.05; ls = .035; }
    else if (g < .95) { lc = vec3(.6, 1., .85) * 1.4; ls = .045; }
    else if (g < 1.5) { lc = vec3(.86, .92, 1.); ls = .045; }
    else if (g < 2.5) { lc = vec3(1., .8, .48) * 1.35; ls = .045; }
    else if (g < 3.5) { lc = mix(PURP, TEAL, hash) * .55; ls = .04; }
    else              { lc = mix(PURP, TEAL, hash) * .3;  ls = .05; }
    if (g < 2.5) {
      float band = exp(-pow(lp.x * .7 + lp.y * .7 - uSheen, 2.) * 5.);
      lc += vec3(.6, .8, 1.) * band * .55 + uLockFlash * .8;
    }
    // once it's open, the halo, the drifting shell and a share of the body burst out into a galaxy around the lock
    if (uAfter > 0.) {
      if (g > 2.5 || (g < 1.5 && hash < .4)) {
        float ua = clamp(uAfter * 1.5 - fract(hash * 13.7) * .5, 0., 1.); ua = ua * ua * (3. - 2. * ua);
        vec2 gxy = vec2(aScat.x - .5, aScat.y / .62);
        float rr = length(gxy);
        vec3 gp = vec3(gxy.x, (aScat.z + 2.) * .8, gxy.y) * .66;
        gp.xz = rot2(uGalRot - rr * .05) * gp.xz;
        gp.yz = rot2(-.78) * gp.yz;
        gp += uV + vec3(0., .1, -1.2);
        vec3 gc = mix(mix(TEAL, PURP, fract(hash * 7.3)), vec3(1., .74, .46), 1. - smoothstep(1.2, 4.2, rr));
        gc *= .55 + .5 * fract(hash * 31.);
        // the galaxy is seen from much further away than the lock, so its stars are drawn much bigger
        float gs = (.13 + .12 * fract(hash * 17.)) * (fract(hash * 91.) < .03 ? 2.4 : 1.);
        lw = mix(lw, gp, ua) + normalize(lw - uV + 1e-4) * sin(ua * 3.1416) * 1.6;
        lc = mix(lc, gc, ua); ls = mix(ls, gs, ua);
      } else lc *= mix(1., uLockDim, uAfter);
    }
    p = mix(p, lw, u2); col = mix(col, lc, u2); sz = mix(sz, ls, u2);
  }

  // ---- your touch: a gravity well under the pointer, ripples on tap
  float wI = ((1. - u1) * ui + u2) * uInteract;
  if (uMouse.w > .001 && wI > .001) {
    vec2 dm = p.xy - uMouse.xy; float dd = length(dm) + 1e-4;
    float f = exp(-dd * dd / .1) * uMouse.w * wI;
    p.xy += dm / dd * f * .12 + vec2(-dm.y, dm.x) / dd * f * .07;
    p.z += f * .3; col += col * f * .55;
  }
  if (uRipple.w >= 0. && wI > .001) {
    float a = uRipple.w, dd = length(p.xy - uRipple.xy);
    float wave = exp(-pow((dd - a * 3.6) / .3, 2.)) * exp(-a * 1.6) * wI;
    p.z += wave * .45; p.xy += normalize(p.xy - uRipple.xy + 1e-4) * wave * .06; col += col * wave * 1.1;
  }

  vec4 mv = modelViewMatrix * vec4(p, 1.);
  float z = max(.05, -mv.z);
  float tw = .82 + .36 * sin(uTime * 2.3 + hash * 6.2831);
  gl_PointSize = min(sz * uSizeK * tw * uPxScale / z, uMaxPt);
  vColor = col * (1. - smoothstep(uFogNear, uFogFar, z)) * smoothstep(.12, .6, z) * uOp;
  gl_Position = projectionMatrix * mv;
}`;

const LAPTOP_VERT = /* glsl */`
attribute vec4 aUvk;
attribute vec3 aScat;
uniform float uTime, uIntro, uOp, uSizeK, uPxScale, uMaxPt;
varying vec3 vColor;
float h(float n){ return fract(sin(n) * 43758.5453); }
void main(){
  float u = aUvk.x, v = aUvk.y, kind = aUvk.z, hs = aUvk.w;
  float ui = clamp(uIntro * 1.45 - hs * .3 - .15, 0., 1.); ui = 1. - pow(1. - ui, 3.);
  vec3 p = mix(aScat, position, ui);
  vec3 col; float sz;
  if (kind < .5) {
    // live code scrolling up the screen
    float yy = (1. - v) * 15. + uTime * .9, line = floor(yy), fr = fract(yy);
    float indent = floor(h(line * 1.7) * 4.) * .055, len = .18 + .62 * h(line * 3.1);
    float word = step(.16, fract(u * 6.5 + h(line) * 3.));
    float on = step(.06 + indent, u) * step(u, .06 + indent + len) * step(.28, fr) * step(fr, .74) * word * (1. - step(.82, h(line * 5.3)));
    float w = floor(u * 6.5);
    vec3 syn = h(line * 2.3 + w) < .33 ? vec3(.55, 1., .82) : (h(line * 4.1 + w) < .5 ? vec3(.75, .7, 1.) : vec3(1., .82, .55));
    col = mix(vec3(.22, .4, .6) * .55, syn * 2.1, on); sz = mix(.03, .042, on);
  }
  else if (kind < 1.5) { col = vec3(.62, .8, .95) * 1.3; sz = .04; }
  else if (kind < 2.5) { col = vec3(.4, .5, .65) * .38; sz = .032; }
  else if (kind < 3.5) { col = vec3(.55, .78, .9) * .95; sz = .034; }
  else if (kind < 4.5) { col = vec3(.6, .82, .95) * 1.1; sz = .036; }
  else if (kind < 5.5) { col = vec3(.62, .78, .95) * 1.2; sz = .04; }
  else                 { col = vec3(.75, .92, 1.) * 1.6; sz = .045; }
  vec4 mv = modelViewMatrix * vec4(p, 1.);
  float z = max(.05, -mv.z);
  gl_PointSize = min(sz * uSizeK * (.85 + .3 * sin(uTime * 2.1 + hs * 6.28)) * uPxScale / z, uMaxPt);
  vColor = col * uOp * smoothstep(.12, .6, z);
  gl_Position = projectionMatrix * mv;
}`;

function additive(vertexShader, fragmentShader, uniforms) {
  return new THREE.ShaderMaterial({
    vertexShader, fragmentShader, uniforms,
    transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
  });
}

export function createMainSystem(data, N, eye) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(data.pos, 3));
  g.setAttribute('aScat', new THREE.BufferAttribute(data.scat, 4));
  g.setAttribute('aTun', new THREE.BufferAttribute(data.tun, 4));
  g.setAttribute('aLock', new THREE.BufferAttribute(data.lock, 4));
  g.setAttribute('aMisc', new THREE.BufferAttribute(data.misc, 2));
  const u = {
    uTime: { value: 0 }, uIntro: { value: 0 }, uIris: { value: 0 }, uT1: { value: 0 }, uT2: { value: 0 }, uLock: { value: 0 },
    uOp: { value: 0 }, uSizeK: { value: 1 }, uPxScale: { value: 100 }, uMaxPt: { value: 64 },
    uFogNear: { value: 30 }, uFogFar: { value: 60 }, uScreenGlow: { value: 1 }, uSheen: { value: -9 }, uFaceX: { value: -99 },
    uLockFlash: { value: 0 }, uInteract: { value: 1 }, uSpin: { value: 0 }, uAfter: { value: 0 }, uGalRot: { value: 0 }, uLockDim: { value: 0.6 },
    uEye: { value: eye.clone() }, uLt: { value: TUN.L }, uV: { value: new THREE.Vector3() },
    uLockRot: { value: new THREE.Matrix3() }, uHaloRot: { value: new THREE.Matrix3() },
    uMouse: { value: new THREE.Vector4(0, 0, 0, 0) }, uRipple: { value: new THREE.Vector4(0, 0, 0, -1) },
  };
  const pts = new THREE.Points(g, additive(MAIN_VERT, SPRITE_FRAG, u));
  pts.frustumCulled = false;
  pts.renderOrder = 10;
  g.setDrawRange(0, N);
  return { points: pts, uniforms: u, geometry: g, total: data.misc.length / 2 };
}

export function createLaptop(data, N) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(data.pos, 3));
  g.setAttribute('aUvk', new THREE.BufferAttribute(data.uvk, 4));
  g.setAttribute('aScat', new THREE.BufferAttribute(data.scat, 3));
  const u = { uTime: { value: 0 }, uIntro: { value: 0 }, uOp: { value: 0 }, uSizeK: { value: 1 }, uPxScale: { value: 100 }, uMaxPt: { value: 64 } };
  const pts = new THREE.Points(g, additive(LAPTOP_VERT, SPRITE_FRAG, u));
  pts.frustumCulled = false;
  pts.renderOrder = 11;
  g.setDrawRange(0, N);
  // light spilling off the display
  const tilt = (12 * Math.PI) / 180;
  const glowU = { uOp: { value: 0 }, uTime: { value: 0 } };
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.7), new THREE.ShaderMaterial({
    uniforms: glowU, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: `uniform float uOp, uTime; varying vec2 vUv;
      void main(){ vec2 d = (vUv - .5) * vec2(1.4, 2.); float r = dot(d, d);
        float f = exp(-r * 3.2) * (.9 + .1 * sin(uTime * 7.1) * sin(uTime * 2.3));
        gl_FragColor = vec4(vec3(.35, .55, .9) * f * .32 * uOp, 1.); }`,
  }));
  glow.position.set(0, 0.475 * Math.cos(tilt) + 0.05 * Math.sin(tilt), -0.5 - 0.475 * Math.sin(tilt) + 0.12);
  glow.rotation.x = -tilt;
  glow.renderOrder = 9;
  glow.frustumCulled = false;
  const group = new THREE.Group();
  group.add(glow, pts);
  return { group, points: pts, uniforms: u, glowU, geometry: g, total: data.uvk.length / 4 };
}

// A soft dark silhouette just behind the subject so the bright sky can't wash it out.
// For the globe it sits at the depth of the globe's rim, so it lines up with the outline as the camera moves.
export function createOccluder(texture, meta, S0) {
  const sc = meta.scale * S0;
  const x0 = -meta.cx * sc, x1 = (meta.width - meta.cx) * sc;
  const y1 = meta.cy * sc, y0 = -(meta.height - meta.cy) * sc;
  const geo = new THREE.PlaneGeometry(x1 - x0, y1 - y0);
  const mat = new THREE.ShaderMaterial({
    uniforms: { tMask: { value: texture }, uOp: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: `uniform sampler2D tMask; uniform float uOp; varying vec2 vUv;
      void main(){ float m = texture2D(tMask, vec2(vUv.x, 1. - vUv.y)).b; gl_FragColor = vec4(vec3(.012, .02, .04), m * uOp); }`,
    transparent: true, depthTest: false, depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  const z = meta.globe ? -Math.sqrt(Math.max(0, meta.globe ** 2 - meta.eye[0] ** 2 - meta.eye[1] ** 2)) * S0 : -0.55;
  mesh.position.set((x0 + x1) / 2, (y0 + y1) / 2, z);
  mesh.renderOrder = 5;
  mesh.frustumCulled = false;
  return mesh;
}
