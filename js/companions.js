// The section companions: small seed-made objects beside their sections' headings (Work: the Little bridge,
// Highlights: the spotlit seedling, Leadership: the compass, Writing: the quill, Education: the fern). Ported from the
// Windborne proof's section objects.
//
// One shared companion population, not a seed system per section: its parents are identities from the same 8,000-seed
// universe the main system draws from (the tail it doesn't draw by default), drifting in the same wind. It is split in
// two halves so a section's object can still be on screen while the next one gathers. A half switches to another object
// only while it is invisible, so no seed ever jumps. Each object is framed on its section's .companion-slot element,
// a "stage" placed by style.css, and assembles from the wind as the section's heading scrolls up the screen.
import * as THREE from './vendor/three.module.min.js';
import { PATH_GLSL } from './path.js';
import { WIND_GLSL, SEED_FRAG, KID_FRAG, POINTS_PER_SEED } from './particles.js';
import { COMPANIONS, FERN_FRONDS, FERN_STEPS, FERN_COIL, FERN_STIPE, FERN_SWEEP } from './companion-data.js';

// numbers written into GLSL: negatives in parentheses, so "x-${n}" can never become "x--0.2"
const n = (x) => { const s = Number(x).toFixed(4); return x < 0 ? `(${s})` : s; };
const FERN_SPEC = FERN_FRONDS.map(([bx, by, angle, length, arch, f0, f1, , pinna], i) =>
  `${i ? 'else ' : ''}${i < FERN_FRONDS.length - 1 ? `if (id < ${i}.5)` : ''}{ base = vec2(${n(bx)}, ${n(by)}); angle = ${n(angle)}; len = ${n(length)}; arch = ${n(arch)}; f0 = ${n(f0)}; f1 = ${n(f1)}; pinna = ${n(pinna)}; }`).join('\n  ');

const POSE = /* glsl */`
attribute vec4 aScat, aTun, aObjLock, aObjTun;
attribute vec2 aMisc;
attribute float aHalf;
uniform float uTime, uTravel, uOp, uPxScale, uMaxPt, uDpr, uWindSize, uFlutter, uLoops, uBackgroundBrightness, uPointStrength, uTitleBrightness;
uniform vec2 uFlightHalfExtent, uViewportPx;
// per half (x = half 0, y = half 1): which object, its local progress, presence, scale, brightness, canopy light
uniform vec2 uKind, uProg, uPres, uScale, uBright, uLightK;
uniform vec3 uC0, uC1, uCamR, uCamU, uCamF, uCamPos;
uniform float uStageD;
${PATH_GLSL}
const float TAU = 6.2831853;
${WIND_GLSL}
void fernSpec(float id, out vec2 base, out float angle, out float len, out float arch, out float f0, out float f1, out float pinna){
  ${FERN_SPEC}
}
float fernCurvature(float s, float f, float arch, float len){
  float u = max(1e-6, (s - f) / (1. - f));
  return arch + sign(arch) * ${n(FERN_COIL)} * pow(u, 1.3) * step(f, s) / ((1. - f) * len);
}
vec3 fernFrame(vec2 base, float angle, float len, float arch, float f, float s){
  float ds = len * s / ${n(FERN_STEPS)}, th = angle; vec2 q = base;
  for (int i = 0; i < ${FERN_STEPS}; i++) {
    float k = fernCurvature((float(i) + .5) / ${n(FERN_STEPS)} * s, f, arch, len), mid = th + k * ds * .5;
    q += vec2(cos(mid), sin(mid)) * ds; th += k * ds;
  }
  return vec3(q, th);
}

// gather: wind → object (position and colour); formed: drawn as a round point (the seedling's drifting seeds stay seeds)
void compPose(out vec3 p, out float size, out float angle, out vec3 colour, out float alpha, out float formed){
  float h = aScat.w, r = aMisc.y;
  float slot, across, k, caught;
  vec3 wind = windAt(h, slot, across, k, caught);
  // A borrowed seed starts where the wind has it on screen, but at the companions' depth: the field around the reader
  // keeps its own density, and no seed flies in huge from right in front of the camera.
  vec3 rel = wind - uCamPos; float dz = dot(rel, uCamF);
  wind = uCamPos + rel * (uStageD / max(dz, .5));
  float windSize = (.10 + .18 * fract(r * 97.)) * uWindSize;   // no extra-large foreground seeds among the borrowed ones
  angle = -.1 + sin(uTime * (.6 + h * .4) + h * TAU) * .20 * uFlutter + caught * sin(k * TAU) * .9;
  vec3 windColour = mix(vec3(.69, .77, .65), vec3(1., .95, .79), .5 + .5 * h) * uBackgroundBrightness;
  float windAlpha = (.22 + .48 * h) * windFog(slot, across) * .45 * step(0., dz);

  float half_ = aHalf, kind = mix(uKind.x, uKind.y, half_), prog = mix(uProg.x, uProg.y, half_);
  float S = mix(uScale.x, uScale.y, half_), bright = mix(uBright.x, uBright.y, half_), light = mix(uLightK.x, uLightK.y, half_);
  vec3 centre = mix(uC0, uC1, half_);
  float part = aObjLock.w, rank = clamp(aObjTun.x, 0., 1.);
  vec3 local = aObjLock.xyz, structure;
  float gather = smoothstep(.08 + rank * .22, .60 + rank * .22, prog), objAlpha = .62, objSize = .085 * S / 7., turn = 1., bend = 1.;
  formed = gather;

  if (kind < .5) {          // Little bridge
    structure = part < .5 ? vec3(.73, .69, .48) : part < 1.5 ? vec3(1., .95, .76) : part < 2.5 ? vec3(.66, .78, .52) : vec3(.53, .60, .38);
  } else if (kind < 1.5) {  // spotlit seedling
    bend = 0.;
    bool dust = part > 3.5; float dustFade = 1.;
    if (dust) {
      float along = fract((1.12 - aObjLock.y) / 1.54 + uTime * .026 * (.6 + aObjTun.y));
      dustFade = smoothstep(0., .08, along) * (1. - smoothstep(.90, 1., along));
      float width = .035 + .485 * along, origAlong = (1.12 - aObjLock.y) / 1.54;
      float sideways = (aObjLock.x - (-.72 + .74 * origAlong)) / (.035 + .485 * origAlong);
      local = vec3(-.72 + .74 * along + sideways * width + sin(uTime * .4 + aObjTun.z * 6.283) * .012, 1.12 - 1.54 * along, aObjLock.z);
    } else local.x += sin(uTime * .48 + aObjLock.y) * .009 * max(0., aObjLock.y + .42) * gather;
    structure = dust ? vec3(1., .93, .72) * (.65 + .45 * light) / max(bright, 1e-3) : part < .5 ? vec3(.73, .82, .43) : part < 1.5 ? vec3(.75, .95, .49) : vec3(.40, .54, .28);
    objAlpha = dust ? (.16 + .22 * aObjTun.y) * dustFade : part > 1.5 ? .35 : .8;
    objSize = dust ? (.018 + .045 * aObjTun.z) * S : objSize;
    turn = .75; formed = dust ? 0. : gather;
  } else if (kind < 2.5) {  // compass, with facet lighting and hidden back faces from its data
    structure = part < .5 ? vec3(1., .83, .42) : part < 1.5 ? vec3(.48, .57, .30) : part < 2.5 ? vec3(.64, .68, .48) : part < 3.5 ? vec3(1., .94, .67) : part < 4.5 ? vec3(.42, .62, .40) : vec3(.42, .50, .29);
    structure *= aObjTun.y;
    objAlpha = (part > 1.5 && part < 2.5 ? .25 : .78) * aObjTun.z;
  } else if (kind < 3.5) {  // quill; its one ink trail writes on over local .72-.96
    if (part > 3.5) { gather = smoothstep(.72 + aObjTun.x * .18, .78 + aObjTun.x * .18, prog); formed = gather; }
    structure = part < .5 ? vec3(.94, .83, .49) : part < 1.5 ? vec3(1., .96, .81) : part < 2.5 ? vec3(.77, .86, .63) : part < 3.5 ? vec3(.70, .76, .56) : vec3(.94, .87, .64);
  } else {                  // fern: gathers as fiddleheads by .58, then the fronds unroll .55-1
    float s = aObjTun.x, curl = 0.;
    gather = smoothstep(.06 + s * .16, .42 + s * .16, prog); formed = gather;
    if (part < 2.5) {
      vec2 base; float a0, len, arch, f0, f1, pinna; fernSpec(aObjTun.w, base, a0, len, arch, f0, f1, pinna);
      float f = mix(f0, f1, smoothstep(.55, 1., prog));
      a0 += .02 * sin(uTime * .5 + aObjTun.w * 1.7);
      vec3 fr = fernFrame(base, a0, len, arch, f, s);
      curl = smoothstep(f - .04, f + .12, s);
      if (part < .5) local.xy = fr.xy + vec2(aObjTun.z, 0.);
      else {
        float side = sign(aObjTun.y), t = abs(aObjTun.y), c = aObjTun.z;
        float l = pinna * smoothstep(${n(FERN_STIPE - 0.02)}, ${n(FERN_STIPE + 0.1)}, s) * pow(1. - s, .6) * 1.25 * (1. - .86 * curl);
        vec2 T = vec2(cos(fr.z), sin(fr.z)), d = normalize(vec2(-side * T.y, side * T.x) + T * ${n(FERN_SWEEP)});
        float w = l * .12 * pow(sin(3.14159265 * t), .6) * (.62 + .38 * abs(sin(t * 3.14159265 * 6.)));
        local.xy = fr.xy + d * l * t + vec2(-d.y, d.x) * side * w * c + T * .10 * l * t * t;
      }
    }
    structure = part < .5 ? vec3(.86, .82, .50) : part < 1.5 ? vec3(.52, .74, .40) : part < 2.5 ? vec3(.74, .88, .56) : vec3(.40, .54, .28);
    structure = mix(structure, vec3(1., .90, .60), curl * .5);   // the curled fiddlehead tips carry a warm golden fuzz
    objAlpha = part > 2.5 ? .35 : part > .5 && part < 1.5 ? .55 : .75;
  }

  // the object's local frame faces the camera, at its stage on screen (proof +z = towards the viewer)
  vec3 target = centre + (uCamR * local.x + uCamU * local.y - uCamF * local.z) * S;
  float bendK = sin(gather * 3.14159265) * (1. - gather) * bend;
  p = mix(wind, target, gather) + uCamU * bendK * sin(h * 6.283 + uTime * .13) * .35 * S / 6.;
  colour = mix(windColour, structure * bright, gather);
  alpha = mix(windAlpha, objAlpha, gather * gather) * mix(uPres.x, uPres.y, half_);   // seeds still in flight stay faint
  size = mix(windSize, objSize, gather);
  angle *= 1. - gather * turn;
}
`;

const VERT = POSE + /* glsl */`
varying vec3 vColour;
varying float vAngle, vAlpha, vCompact, vPlant;
void main(){
  vec3 p; float size, formed;
  compPose(p, size, vAngle, vColour, vAlpha, formed);
  vec4 mv = modelViewMatrix * vec4(p, 1.); float depth = -mv.z;
  gl_PointSize = min(uMaxPt, max(.8, size * uPxScale / max(.1, depth)));
  gl_Position = projectionMatrix * mv;
  vAlpha *= smoothstep(.35, 1.1, depth) * uOp;
  vCompact = 0.; vPlant = formed;
}`;

const KID_VERT = POSE + /* glsl */`
attribute vec2 aDotUV;
varying vec3 vColour;
varying float vAlpha;
void main(){
  vec3 p, colour; float size, angle, alpha, formed;
  compPose(p, size, angle, colour, alpha, formed);
  vec4 mv = modelViewMatrix * vec4(p, 1.); float depth = -mv.z;
  float px = min(uMaxPt, max(.8, size * uPxScale / max(.1, depth)));
  float c = cos(angle), s = sin(angle);
  vec2 screen = vec2(c * aDotUV.x - s * aDotUV.y, s * aDotUV.x + c * aDotUV.y);
  vec4 clip = projectionMatrix * mv;
  clip.xy += vec2(screen.x, -screen.y) * px * 2. / uViewportPx * clip.w;
  gl_Position = clip;
  gl_PointSize = clamp(px * .14, .9 * uDpr, 2.2 * uDpr);
  vColour = vec3(1., .97, .86) * uTitleBrightness * uPointStrength;
  vAlpha = alpha * .6 * (1. - formed) * smoothstep(.35, 1.1, depth) * uOp;
}`;

// The seedling's canopy light: one soft beam plane with a pool of light on the moss.
function createCanopyLight(u) {
  const material = new THREE.ShaderMaterial({
    uniforms: u, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `varying vec2 vLocal; void main(){ vLocal = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: `varying vec2 vLocal; uniform float uProgress, uStrength;
      void main(){
        float t = (1.12 - vLocal.y) / 1.54;
        float centre = -.72 + .74 * t, width = .035 + .485 * clamp(t, 0., 1.);
        float feather = 1. - smoothstep(.50, 1.20, abs(vLocal.x - centre) / width);
        float ends = smoothstep(0., .13, t) * (1. - smoothstep(.85, 1.05, t));
        float broken = .72 + .18 * sin(vLocal.x * 37. + vLocal.y * 13.) + .1 * sin(vLocal.x * 63. - vLocal.y * 8.);
        vec2 ground = (vLocal - vec2(.02, -.435)) / vec2(.55, .075);
        float a = (feather * ends * broken * .18 + exp(-dot(ground, ground) * 2.) * .32) * uStrength * smoothstep(.25, .92, uProgress);
        gl_FragColor = vec4(vec3(1., .91, .65), a);
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 2.8), material);
  mesh.renderOrder = 9; mesh.frustumCulled = false;
  return mesh;
}

// main: the main seed system (its uniforms and data are shared); M: parents per half
export function createCompanions(main, data, M) {
  const total = data.misc.length / 2, N = Math.min(2 * M, total), first = total - N, K = POINTS_PER_SEED;
  const WIND = [['position', 'pos', 3], ['aScat', 'scat', 4], ['aTun', 'tun', 4], ['aMisc', 'misc', 2]];
  const g = new THREE.BufferGeometry(), kg = new THREE.BufferGeometry();
  for (const [name, key, w] of WIND) {
    const src = new Float32Array(data[key].subarray(first * w, (first + N) * w)), kid = new Float32Array(N * K * w);
    // borrowed identities take the opposite wind slot and box column, so they never sit exactly on a seed already drawn
    if (key === 'tun') for (let i = 0; i < N; i++) { src[i * 4] = (src[i * 4] + 52.5) % 105; src[i * 4 + 1] = ((src[i * 4 + 1] + 1) % 1) - 0.5; }
    for (let i = 0; i < N; i++) for (let j = 0; j < K; j++) kid.set(src.subarray(i * w, (i + 1) * w), (i * K + j) * w);
    g.setAttribute(name, new THREE.BufferAttribute(src, w));
    kg.setAttribute(name, new THREE.BufferAttribute(kid, w));
  }
  const half = Float32Array.from({ length: N }, (_, i) => (i < N / 2 ? 0 : 1));
  g.setAttribute('aHalf', new THREE.BufferAttribute(half, 1));
  kg.setAttribute('aHalf', new THREE.BufferAttribute(Float32Array.from({ length: N * K }, (_, i) => half[Math.floor(i / K)]), 1));
  for (const geo of [g, kg]) for (const name of ['aObjLock', 'aObjTun']) geo.setAttribute(name, new THREE.BufferAttribute(new Float32Array(geo.attributes.aHalf.count * 4), 4));
  const uv = new Float32Array(N * K * 2), anchors = main.points.material.uniforms.uSeedAtlas.value.userData.anchors;
  for (let i = 0; i < N; i++) for (let j = 0; j < K; j++) uv.set(anchors[j], (i * K + j) * 2);
  kg.setAttribute('aDotUV', new THREE.BufferAttribute(uv, 2));

  const MU = main.uniforms, share = {};
  for (const k of ['uSeedAtlas', 'uTime', 'uTravel', 'uOp', 'uPxScale', 'uMaxPt', 'uDpr', 'uWindSize', 'uFlutter', 'uLoops', 'uBackgroundBrightness', 'uPointStrength', 'uFlightHalfExtent', 'uViewportPx', 'uEye', 'uLt']) share[k] = MU[k];
  const u = Object.assign(share, {
    uTitleBrightness: { value: 1.6 },
    uKind: { value: new THREE.Vector2(0, 1) }, uProg: { value: new THREE.Vector2() }, uPres: { value: new THREE.Vector2() },
    uScale: { value: new THREE.Vector2(1, 1) }, uBright: { value: new THREE.Vector2(1, 1) }, uLightK: { value: new THREE.Vector2() },
    uC0: { value: new THREE.Vector3() }, uC1: { value: new THREE.Vector3() },
    uCamPos: { value: new THREE.Vector3() }, uStageD: { value: 10 },
    uCamR: { value: new THREE.Vector3(1, 0, 0) }, uCamU: { value: new THREE.Vector3(0, 1, 0) }, uCamF: { value: new THREE.Vector3(0, 0, -1) },
  });
  const mat = (vs, fs) => new THREE.ShaderMaterial({ vertexShader: vs, fragmentShader: fs, uniforms: u, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending });
  const points = new THREE.Points(g, mat(VERT, SEED_FRAG)), kids = new THREE.Points(kg, mat(KID_VERT, KID_FRAG));
  points.renderOrder = 12; kids.renderOrder = 13;
  for (const o of [points, kids]) { o.frustumCulled = false; o.visible = false; }
  const lightU = { uProgress: { value: 0 }, uStrength: { value: 0 } }, light = createCanopyLight(lightU);
  light.visible = false;

  const half0 = N / 2, cache = {};
  const shape = (name) => cache[name] || (cache[name] = COMPANIONS[name].build(half0));
  const loaded = [null, null];
  function load(h, name) {
    const { lock, tun } = shape(name), off = h * half0;
    for (const [geo, k] of [[g, 1], [kg, K]]) {
      const L = geo.attributes.aObjLock, Tn = geo.attributes.aObjTun;
      for (let i = 0; i < half0; i++) for (let j = 0; j < k; j++) {
        L.array.set(lock.subarray(i * 4, i * 4 + 4), ((off + i) * k + j) * 4);
        Tn.array.set(tun.subarray(i * 4, i * 4 + 4), ((off + i) * k + j) * 4);
      }
      L.needsUpdate = true; Tn.needsUpdate = true;
    }
    loaded[h] = name;
    u.uKind.value.setComponent(h, COMPANIONS[name].kind);
  }
  return { points, kids, light, lightU, uniforms: u, loaded, load, perHalf: half0, def: (name) => COMPANIONS[name] };
}

// The scroll side: which section each half is showing, how far its object has assembled, and where its stage is.
// sections: [{ name, half, slot, head }]. A section's local progress runs 0 → its rest pose as its stage (the slot) rises
// from a little below the screen to its upper half (stage top 145% → 75% of the viewport height, measured after the
// section's rise-in transform), so the object is mostly formed as it comes up from the bottom of the screen, in the gap
// before its section: reversible, no timers. Reduced motion shows the rest pose without the gathering.
const _c = new THREE.Vector3();
export function updateCompanions(sys, sections, { camera, W, H, reduced, tune }) {
  const u = sys.uniforms, vh = innerHeight;
  const state = sections.map((s) => {
    const slot = s.slot.getBoundingClientRect();
    const ramp = Math.min(1, Math.max(0, (1.45 * vh - slot.top) / (0.7 * vh)));
    const on = slot.bottom > -0.05 * vh && slot.top < 1.45 * vh && slot.width > 0;
    return { s, slot, ramp, on, weight: on ? (reduced ? 1 : ramp) : 0 };
  });
  camera.updateMatrixWorld();
  u.uCamR.value.setFromMatrixColumn(camera.matrixWorld, 0); u.uCamU.value.setFromMatrixColumn(camera.matrixWorld, 1);
  u.uCamF.value.setFromMatrixColumn(camera.matrixWorld, 2).negate();
  const tH = Math.tan((camera.fov * Math.PI) / 360), D = u.uStageD.value, aspect = W / H;
  u.uCamPos.value.copy(camera.position);
  let any = false, lightOn = false;
  for (const h of [0, 1]) {
    const mine = state.filter((x) => x.s.half === h);
    let cur = mine.find((x) => x.s.name === sys.loaded[h]);
    const want = mine.reduce((a, b) => (b.weight > (a ? a.weight : 0) ? b : a), null);
    // switch object only while this half is invisible
    if (want && want.weight > 0 && (!cur || cur.weight === 0) && want.s.name !== sys.loaded[h]) { sys.load(h, want.s.name); cur = want; }
    if (!cur) { u.uPres.value.setComponent(h, 0); continue; }
    const def = sys.def(cur.s.name), cfg = tune.companions[cur.s.name];
    const pres = !cur.on ? 0 : reduced ? 1 : Math.min(1, cur.ramp / 0.12);
    const prog = def.rest * (reduced ? 1 : cur.ramp);
    u.uPres.value.setComponent(h, pres); u.uProg.value.setComponent(h, prog);
    if (pres <= 0) continue;
    any = true;
    // the slot is a small stage: frame the object on it the way the proof frames it on its own page
    const r = cur.slot, stageH = (r.height / H) * 2 * D * tH, stageW = (r.width / W) * 2 * D * tH * aspect;
    const S = Math.min(stageW * def.frame.w, stageH * def.frame.h) * cfg.size;
    const nx = ((r.left + r.width / 2) / W) * 2 - 1, ny = 1 - ((r.top + r.height / 2) / H) * 2;
    _c.copy(camera.position).addScaledVector(u.uCamF.value, D)
      .addScaledVector(u.uCamR.value, nx * D * tH * aspect).addScaledVector(u.uCamU.value, ny * D * tH + def.frame.y * stageH);
    (h ? u.uC1 : u.uC0).value.copy(_c);
    u.uScale.value.setComponent(h, S); u.uBright.value.setComponent(h, cfg.brightness * tune.render.companionGain);
    u.uLightK.value.setComponent(h, cur.s.name === 'seedling' ? cfg.light : 0);
    if (cur.s.name === 'seedling') {
      lightOn = true;
      sys.light.position.copy(_c).addScaledVector(u.uCamF.value, 0.25 * S / 6);
      sys.light.quaternion.copy(camera.quaternion); sys.light.scale.setScalar(S);
      sys.lightU.uProgress.value = prog; sys.lightU.uStrength.value = cfg.light * pres;
    }
  }
  sys.points.visible = sys.kids.visible = any;
  sys.kids.visible = any && tune.look.pointStrength > 0;
  sys.light.visible = lightOn;
}
