// The seeds: one set of dandelion seeds that is the globe, then the wind you fly through, then the daisy.
// Each seed is a textured sprite (a parachute drawn once into a canvas atlas) plus four small points on its filaments
// that share its exact pose. Additive blending, no depth test, raw (unmanaged) colour, like the rest of the scene.
import * as THREE from './vendor/three.module.min.js';
import { PATH_GLSL, TUN } from './path.js';

// ---------- the seed atlas: 37 curved filaments with barbs, a stalk and a seed body ----------
export const POINTS_PER_SEED = 4;
export const HUB = [256 / 512, 222 / 512];
export function createSeedAtlas(random) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const c = canvas.getContext('2d');
  c.lineCap = 'round';
  const hub = { x: 256, y: 222 }, anchors = [];
  for (let i = 0; i < 37; i++) {
    const a = Math.PI + (i / 36) * Math.PI;
    const ex = 256 + Math.cos(a) * (173 + random() * 20), ey = 211 + Math.sin(a) * (125 + random() * 25);
    c.strokeStyle = `rgba(245,239,214,${0.42 + random() * 0.4})`; c.lineWidth = 1.2 + random() * 0.8;
    c.beginPath(); c.moveTo(hub.x, hub.y); c.quadraticCurveTo((hub.x + ex) / 2, ey + 29, ex, ey); c.stroke();
    if ([4, 13, 23, 32].includes(i)) {
      const t = 0.72, o = 1 - t;
      anchors.push([(o * o * hub.x + 2 * o * t * (hub.x + ex) / 2 + t * t * ex) / 512 - 0.5, (o * o * hub.y + 2 * o * t * (ey + 29) + t * t * ey) / 512 - 0.5]);
    }
    for (let j = 0; j < 3; j++) {
      const f = 0.79 + j * 0.075, x = hub.x + (ex - hub.x) * f, y = hub.y + (ey - hub.y) * f;
      c.lineWidth = 0.65; c.strokeStyle = 'rgba(247,243,222,.48)';
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a - 0.5) * 14, y + Math.sin(a - 0.5) * 14); c.stroke();
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a + 0.5) * 14, y + Math.sin(a + 0.5) * 14); c.stroke();
    }
  }
  c.strokeStyle = 'rgba(233,218,173,.85)'; c.lineWidth = 2;
  c.beginPath(); c.moveTo(256, 222); c.quadraticCurveTo(263, 295, 251, 365); c.stroke();
  c.save(); c.translate(251, 381); c.rotate(0.12);
  const g = c.createLinearGradient(-5, 0, 6, 0); g.addColorStop(0, '#86704b'); g.addColorStop(0.5, '#d1ad70'); g.addColorStop(1, '#a08352');
  c.fillStyle = g; c.beginPath(); c.ellipse(0, 0, 5.5, 21, 0, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#e4c38b'; c.lineWidth = 0.65; c.beginPath(); c.moveTo(0, -17); c.lineTo(0, 16); c.stroke(); c.restore();
  const tex = new THREE.CanvasTexture(canvas);
  tex.flipY = false;                  // point-sprite coordinates start top-left, like the canvas
  tex.colorSpace = THREE.NoColorSpace;
  tex.userData.anchors = anchors;
  return tex;
}

// ---------- one pose for both the seeds and their attached points ----------
const POSE = /* glsl */`
attribute vec4 aScat, aTun, aCoast, aLock, aPlant;
attribute vec2 aMisc;
uniform float uTime, uIntro, uDive, uTravel, uOp, uPxScale, uMaxPt, uDpr;
uniform float uRadius, uAperture, uCoastMode, uGlobeCompact, uGlobeCompactScale, uGlobeBrightness;
uniform float uOpening, uOttawaLast;   // 1 = blown globe (approved), 0 = the seeds parting around Ottawa
uniform float uWindSize, uFlutter, uLoops, uBackgroundBrightness, uPointStrength, uCameraRoll, uInteract;
uniform vec2 uFlightHalfExtent, uViewportPx;
uniform vec4 uMouse;
// the light and the landing (local sequence 0..1) and the daisy's growth
uniform float uLand, uGrowth, uFieldWidth, uFieldHeight, uPlantX, uGroundY, uPlantScale, uPlantBrightness, uSway, uShowRoots, uLeafGain, uWarm, uLandingSpread;
uniform vec3 uLandO, uFromBase, uCamR, uCamU, uCamF;
${PATH_GLSL}
const float TAU = 6.2831853;
const vec2 HUB = vec2(0., 222. / 512. - .5);

// p, sprite size (world), angle, colour, alpha; compact = globe sprite mode; plantMix = drawn as a round plant point;
// kids = how visible the attached filament points are
void seedPose(out vec3 p, out float size, out float angle, out vec3 colour, out float alpha, out float compact, out float plantMix, out float kids){
  float h = aScat.w, r = aMisc.y, R = uRadius, k4 = R / 4.;

  // ---- the globe; on the way in it is blown away (uOpening 1) or the seeds part around Ottawa (uOpening 0)
  vec4 g4 = mix(vec4(position, aMisc.x), aCoast, uCoastMode);
  vec3 globe = g4.xyz;
  vec2 delta = globe.xy - uEye.xy; float dist = length(delta);
  float open = smoothstep(.24, .62, uDive) * uAperture * (1. - uOpening);
  vec2 away = dist > .001 ? delta / dist : vec2(cos(h * TAU), sin(h * TAU));
  float near = 1. - smoothstep(.10 * R, .85 * R, dist);
  globe.xy += away * open * near * R * .70;
  globe.z += open * near * .45 * k4;
  globe.xy += vec2(sin(uTime * .32 + h * 31.), cos(uTime * .27 + h * 21.)) * .018 * uFlutter * k4;
  // entering: the seeds blow in from the right, still tumbling, and settle onto the globe
  float ui = clamp(uIntro * 1.8 - h * .6, 0., 1.); ui = 1. - pow(1. - ui, 5.);
  vec3 start = aScat.xyz + vec3(sin(uTime * .31 + h * 9.) * .4, sin(uTime * .5 + h * 17.) * .3, 0.);
  globe = mix(start, globe, ui);

  // ---- the wind: stable depth slots along the flight path, recycled around the camera, in a box that fills the screen
  float outer = clamp(dist / (R * 2.), 0., 1.);
  float morph = smoothstep(.44 + .12 * (1. - outer), .70 + .12 * (1. - outer), uDive);
  float slot = mod(aTun.x - uTime * .18 - uTravel + 24., 105.) + uTravel - 24.;
  vec3 P, N, B; pathFrame(slot, P, N, B);
  float hx = uFlightHalfExtent.x, hy = uFlightHalfExtent.y;
  float across = mod(aTun.y * 2. * hx - uTime * (.45 + .55 * h) + hx, 2. * hx) - hx;
  float vertical = aTun.z * 2. * hy + sin(uTime * .45 + h * 15.) * .25 * uFlutter;
  vec3 wind = P + N * across + B * vertical;
  // now and then a seed is caught by a gust and turns a loop that travels with it
  float cyc = fract(uTime * .027 + h * 7.3), k = clamp((cyc - .28) / .24, 0., 1.), caught = step(.82, fract(h * 23.71)) * uLoops;
  wind += N * sin(k * TAU) * .75 * caught + B * (1. - cos(k * TAU)) * .6 * caught;
  // Blown opening, one breath from the right, streamlined from dandelion research (Shields et al. 2025; Cummins et
  // al. 2018). Seeds facing the breath and on the rim let go first; the far (left) side holds on longest, so a clump
  // around Ottawa lingers, leaning with the air, then follows on a gentler tail of the breath. Seeds are so light they
  // move with the air: a fast, slightly upward burst that eases into a slow drift and widens into a swirling plume,
  // with a brief tumble before they settle tuft-up. Then each fades briefly into its wind slot. Strength = uAperture.
  vec2 u = g4.xy / R;
  float rim = 1. - sqrt(max(0., 1. - dot(u, u)));
  float order = clamp(.50 * (1. - u.x) * .5 + .20 * (1. - rim) + .30 * fract(h * 17.3), 0., 1.);
  order = mix(order, 1.05, (1. - smoothstep(.08 * R, .28 * R, dist)) * uOttawaLast);
  float tb = .10 + .40 * order, breath = (.4 + .6 * uAperture) * (1. - .35 * order);
  float fb = clamp((uDive - tb) / .40, 0., 1.), burst = fb * (2. - fb), r2 = fract(h * 9.7) - .5, r3 = fract(h * 12.9) - .5;
  float lean = smoothstep(.08, .16, uDive) * (1. - fb) * uOpening;
  vec3 blown = globe + vec3(-.10, .03, 0.) * lean * k4
             + vec3(-(burst * 9. + fb * 3.) * (.45 + 1.1 * fract(h * 5.1)),
                    burst * (1.4 + 2.4 * r2) + sin(fb * 6. + h * 20.) * .35 * fb,
                    fb * r3 * 7. + cos(fb * 6. + h * 20.) * .35 * fb) * breath * k4;
  float swap = smoothstep(tb + .32, tb + .40, uDive);
  p = mix(mix(globe, wind, morph), mix(blown, wind, step(.5, swap)), uOpening);
  morph = mix(morph, swap, uOpening);
  float blowTumble = r2 * 6. * fb * exp(-fb * 5.) * uOpening;

  float lum = g4.w;
  colour = mix(mix(vec3(.49, .66, .44), vec3(1., .97, .83), lum) * uGlobeBrightness,
               mix(vec3(.68, .77, .61), vec3(1., .95, .79), h) * uBackgroundBrightness, morph);
  float large = step(.965, r);
  size = mix((.13 + .10 * h) * uWindSize * k4, mix(.10 + .18 * fract(r * 97.), .48 + .55 * h, large) * uWindSize, morph);
  compact = uGlobeCompact * mix(1. - smoothstep(.20, .62, uDive), 1. - smoothstep(0., .4, fb), uOpening) * (1. - morph);
  size *= mix(1., uGlobeCompactScale, compact);
  angle = -.1 + sin(uTime * (.6 + h * .4) + h * TAU) * .20 * uFlutter + caught * sin(k * TAU) * .9 * morph - uCameraRoll + blowTumble;
  float ahead = slot - uTravel, edge = abs(across) / hx * 12.;
  float fog = smoothstep(-23., -12., ahead) * (1. - smoothstep(45., 79., ahead)) * (1. - smoothstep(8., 12., edge));
  alpha = mix(.12 + .57 * lum, (.22 + .48 * h) * fog, morph) * mix(1., abs(2. * swap - 1.), uOpening);
  plantMix = 0.;
  kids = 1. - morph;

  // ---- the light and the landing: most seeds leave on the breeze; their identities, once invisible, become the daisy.
  // Three seeds ride along with you and settle on the soil, then fade (local 45-50%).
  if (uLand > 0.) {
    float Ls = uLand, role = aPlant.w;
    vec3 windP = p; float windSize = size, windAngle = angle;
    colour = mix(colour, colour * vec3(1.12, 1.02, .78), uWarm);
    p.x -= smoothstep(.20, .48, Ls) * uFieldWidth * .32;
    alpha *= 1. - smoothstep(.28, .40, Ls);
    if (Ls >= .40 && role < .5) {
      // every passing seed is invisible at this switch, so none is seen jumping to a bit of root or petal
      float part = aLock.w, growth;
      if (part < .5) growth = smoothstep(.18, .44, uGrowth);
      else if (part < 1.5) growth = smoothstep(.33, .65, uGrowth);
      else if (part < 2.5) growth = smoothstep(.45, .84, uGrowth);
      else growth = smoothstep(.74, 1., uGrowth);
      float reveal = smoothstep(aPlant.x - .08, aPlant.x + .08, growth) * smoothstep(0., .025, growth);
      p = uLandO + aLock.xyz * uPlantScale + vec3(uPlantX, uGroundY, 0.);
      float above = max(0., aLock.y);
      p.x += sin(uTime * .7 + above * .5) * .025 * uSway * above * above * uPlantScale;   // still at the soil, freer up the stem
      float tint = aPlant.z, dew = step(3.5, tint);
      size = .060 * mix(.65, 1., step(1.5, part)) * uPlantScale / 7. * mix(1., 1.45, dew);
      colour = part < .5 ? vec3(.46, .43, .28) : part < 1.5 ? vec3(.23, .47, .25) : part < 2.5 ? vec3(.30, .56, .30) : vec3(1., .65, .16);
      if (part > 1.5) {
        if (tint > .5 && tint < 1.5) colour = vec3(1., .96, .83);
        else if (tint > 1.5 && tint < 2.5) colour = vec3(1., .66, .16);
        else if (tint > 2.5 && tint < 3.5) colour = vec3(.56, .72, .39);
        else if (dew > .5) colour = vec3(.85, 1., .91) * 1.35;
      }
      colour *= uPlantBrightness;
      alpha = (part < 1.5 ? .38 : part < 2.5 ? .60 : .82) * reveal;
      if (part < .5) alpha *= uShowRoots;
      if (part > 1.5 && part < 2.5) alpha *= uLeafGain;   // the pair carries all the foliage points, so each is fainter
      angle = 0.; plantMix = 1.; kids = 0.;
    }
    if (role > .5) {
      float index = role - 1., K = uFieldHeight / 16.78;   // the study's view was 16.78 units tall
      float ride = smoothstep(0., .20, Ls), land = smoothstep(.22 + index * .025, .40 + index * .025, Ls);
      vec3 from = uFromBase + uCamR * (uFieldWidth * (.27 - index * .12) - sin(uTime * .19 + index) * .4 * K)
                + uCamU * (uFieldHeight * (.17 + index * .065) + sin(uTime * .37 + index) * .23 * K) - uCamF * .4 * K;
      float offset = index < .5 ? 0. : (index < 1.5 ? -.18 : .16) * uPlantScale * uLandingSpread;
      vec3 soil = uLandO + vec3(uPlantX + offset, uGroundY + windSize * K * .16, .2 * K);
      p = mix(mix(windP, from, ride), soil, land);
      p.x += sin(land * 3.14159265) * (.8 + index * .2) * uLandingSpread * K;
      p.y += sin(land * 3.14159265) * .30 * K;
      size = mix(windSize, max(.4 * uWindSize, windSize) * K * mix(1.8, 1.1, land), ride);
      angle = mix(windAngle, index < .5 ? .6 : -.45, land);   // the body tips as it reaches the ground
      alpha = mix(alpha, .86, ride) * (1. - smoothstep(.45, .50, Ls));
      plantMix = 0.; kids = 1.;
    }
  }

  // ---- a breath of air under the pointer
  if (uMouse.w > .001 && uInteract > .001) {
    vec2 dm = p.xy - uMouse.xy; float dd = length(dm) + 1e-4;
    float f = exp(-dd * dd / (.4 * k4 + .3 * morph)) * uMouse.w * uInteract;
    p.xy += vec2(-.6, .35) * f * .25 + dm / dd * f * .06;
    angle += f * .35;
  }
}
`;

const SEED_VERT = POSE + /* glsl */`
varying vec3 vColour;
varying float vAngle, vAlpha, vCompact, vPlant;
void main(){
  vec3 p; float size, compact, plantMix, kids;
  seedPose(p, size, vAngle, vColour, vAlpha, compact, plantMix, kids);
  vec4 mv = modelViewMatrix * vec4(p, 1.); float depth = -mv.z;
  gl_PointSize = min(uMaxPt, max(.8, size * uPxScale / max(.1, depth)));
  gl_Position = projectionMatrix * mv;
  vAlpha *= smoothstep(.35, 1.1, depth) * uOp;
  vCompact = compact; vPlant = plantMix;
}`;

const SEED_FRAG = /* glsl */`
uniform sampler2D uSeedAtlas;
varying vec3 vColour;
varying float vAngle, vAlpha, vCompact, vPlant;
void main(){
  vec2 q = gl_PointCoord - .5; float c = cos(vAngle), s = sin(vAngle);
  vec2 uv = mat2(c, -s, s, c) * q + .5;
  vec4 tex = vec4(0.);
  if (uv.x >= 0. && uv.x <= 1. && uv.y >= 0. && uv.y <= 1.) tex = texture2D(uSeedAtlas, uv);
  // on the globe the same seed shows a compact, bright hub; its tuft is still there, but quiet
  float core = 1. - smoothstep(.025, .20, length(uv - vec2(.5, 222. / 512.)));
  float seedA = mix(tex.a, max(tex.a * .65, core * .9), vCompact);
  vec3 seedC = mix(tex.rgb * vColour, vColour * vec3(1., .98, .87), vCompact * core);
  float dotA = max(0., 1. - dot(q, q) * 4.);
  float alpha = mix(seedA, dotA, vPlant) * vAlpha;
  if (alpha < .002) discard;
  gl_FragColor = vec4(mix(seedC, vColour, vPlant), alpha);
}`;

const KID_VERT = POSE + /* glsl */`
attribute vec2 aDotUV;
varying vec3 vColour;
varying float vAlpha;
void main(){
  vec3 p, colour; float size, angle, alpha, compact, plantMix, kids;
  seedPose(p, size, angle, colour, alpha, compact, plantMix, kids);
  vec4 mv = modelViewMatrix * vec4(p, 1.); float depth = -mv.z;
  float px = min(uMaxPt, max(.8, size * uPxScale / max(.1, depth)));
  float c = cos(angle), s = sin(angle);
  vec2 screen = vec2(c * aDotUV.x - s * aDotUV.y, s * aDotUV.x + c * aDotUV.y);   // inverse of the atlas rotation
  vec4 clip = projectionMatrix * mv;
  clip.xy += vec2(screen.x, -screen.y) * px * 2. / uViewportPx * clip.w;
  gl_Position = clip;
  gl_PointSize = clamp(px * .14, .9 * uDpr, 2.2 * uDpr);
  vColour = colour * uPointStrength;
  vAlpha = alpha * .6 * kids * (1. - compact) * (1. - plantMix) * smoothstep(.35, 1.1, depth) * uOp;
}`;

const KID_FRAG = /* glsl */`
varying vec3 vColour;
varying float vAlpha;
void main(){
  float d = length(gl_PointCoord - .5) * 2.;
  if (d > 1. || vAlpha < .001) discard;
  gl_FragColor = vec4(vColour, vAlpha * (1. - d * d));
}`;

function additive(vertexShader, fragmentShader, uniforms) {
  return new THREE.ShaderMaterial({
    vertexShader, fragmentShader, uniforms,
    transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
  });
}

const ATTRS = [['position', 'pos', 3], ['aScat', 'scat', 4], ['aTun', 'tun', 4], ['aCoast', 'coast', 4], ['aLock', 'lock', 4], ['aPlant', 'plant', 4], ['aMisc', 'misc', 2]];

export function createMainSystem(data, N, eye, atlas) {
  const total = data.misc.length / 2;
  const g = new THREE.BufferGeometry();
  for (const [name, key, w] of ATTRS) g.setAttribute(name, new THREE.BufferAttribute(data[key], w));
  // the attached points: four per seed, parent-major, so any draw-range prefix pairs with the same seeds
  const kg = new THREE.BufferGeometry(), K = POINTS_PER_SEED;
  for (const [name, key, w] of ATTRS) {
    const src = data[key], out = new Float32Array(total * K * w);
    for (let i = 0; i < total; i++) for (let j = 0; j < K; j++) out.set(src.subarray(i * w, (i + 1) * w), (i * K + j) * w);
    kg.setAttribute(name, new THREE.BufferAttribute(out, w));
  }
  const uv = new Float32Array(total * K * 2), anchors = atlas.userData.anchors;
  for (let i = 0; i < total; i++) for (let j = 0; j < K; j++) uv.set(anchors[j], (i * K + j) * 2);
  kg.setAttribute('aDotUV', new THREE.BufferAttribute(uv, 2));

  const u = {
    uSeedAtlas: { value: atlas }, uTime: { value: 12 }, uIntro: { value: 0 }, uDive: { value: 0 }, uTravel: { value: 0 },
    uOp: { value: 0 }, uPxScale: { value: 100 }, uMaxPt: { value: 64 }, uDpr: { value: 1 },
    uRadius: { value: 2.3 }, uAperture: { value: 1 }, uOpening: { value: 1 }, uOttawaLast: { value: 1 }, uCoastMode: { value: 1 }, uGlobeCompact: { value: 1 }, uGlobeCompactScale: { value: 0.38 }, uGlobeBrightness: { value: 1.6 },
    uWindSize: { value: 1 }, uFlutter: { value: 1 }, uLoops: { value: 1 }, uBackgroundBrightness: { value: 2.5 }, uPointStrength: { value: 0.3 },
    uCameraRoll: { value: 0 }, uInteract: { value: 1 },
    uFlightHalfExtent: { value: new THREE.Vector2(18, 18) }, uViewportPx: { value: new THREE.Vector2(1, 1) },
    uMouse: { value: new THREE.Vector4(0, 0, 0, 0) },
    uLand: { value: 0 }, uGrowth: { value: 0 }, uFieldWidth: { value: 30 }, uFieldHeight: { value: 17 }, uPlantX: { value: 0 }, uGroundY: { value: -2.7 },
    uPlantScale: { value: 3.6 }, uPlantBrightness: { value: 1.2 }, uSway: { value: 1.1 }, uShowRoots: { value: 1 }, uLeafGain: { value: 1 / 3 }, uWarm: { value: 0 }, uLandingSpread: { value: 1 },
    uLandO: { value: new THREE.Vector3() }, uFromBase: { value: new THREE.Vector3() },
    uCamR: { value: new THREE.Vector3(1, 0, 0) }, uCamU: { value: new THREE.Vector3(0, 1, 0) }, uCamF: { value: new THREE.Vector3(0, 0, -1) },
    uEye: { value: eye.clone() }, uLt: { value: TUN.L },
  };
  const seeds = new THREE.Points(g, additive(SEED_VERT, SEED_FRAG, u));
  const kids = new THREE.Points(kg, additive(KID_VERT, KID_FRAG, u));
  for (const o of [seeds, kids]) o.frustumCulled = false;
  seeds.renderOrder = 10; kids.renderOrder = 11;
  const sys = { points: seeds, kids, uniforms: u, geometry: g, total };
  setSeedCount(sys, N);
  return sys;
}
export function setSeedCount(sys, n) {
  n = Math.max(0, Math.min(sys.total, Math.round(n)));
  sys.count = n;
  sys.geometry.setDrawRange(0, n);
  sys.kids.geometry.setDrawRange(0, n * POINTS_PER_SEED);
}

// A soft dark silhouette just behind the globe so the sky can't wash it out.
// It sits at the depth of the globe's rim, so it lines up with the outline as the camera moves.
export function createOccluder(texture, meta, S0, colour) {
  const sc = meta.scale * S0;
  const x0 = -meta.cx * sc, x1 = (meta.width - meta.cx) * sc;
  const y1 = meta.cy * sc, y0 = -(meta.height - meta.cy) * sc;
  const geo = new THREE.PlaneGeometry(x1 - x0, y1 - y0);
  const mat = new THREE.ShaderMaterial({
    uniforms: { tMask: { value: texture }, uOp: { value: 0 }, uColour: { value: new THREE.Vector3(...colour) } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: `uniform sampler2D tMask; uniform float uOp; uniform vec3 uColour; varying vec2 vUv;
      void main(){ float m = texture2D(tMask, vec2(vUv.x, 1. - vUv.y)).b; gl_FragColor = vec4(uColour, m * uOp); }`,
    transparent: true, depthTest: false, depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  const z = meta.globe ? -Math.sqrt(Math.max(0, meta.globe ** 2 - meta.eye[0] ** 2 - meta.eye[1] ** 2)) * S0 : -0.55;
  mesh.position.set((x0 + x1) / 2, (y0 + y1) / 2, z);
  mesh.renderOrder = 5;
  mesh.frustumCulled = false;
  return mesh;
}

// The ground the daisy grows from: a soft band of soil below the soil line, drawn behind the seeds (so the roots show,
// as in a cutaway) in screen colours that post.js's tone curve maps back onto.
export function createGround(exposure) {
  const u = { uOp: { value: 0 }, uExposure: { value: exposure } };
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({
    uniforms: u, transparent: true, depthTest: false, depthWrite: false,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: `uniform float uOp, uExposure; varying vec2 vUv;
      vec3 untone(vec3 c){ return -log(max(vec3(1e-4), 1. - c)) / uExposure; }
      void main(){
        float t = 1. - vUv.y;   // 0 at the soil line, 1 at the bottom of the screen
        vec3 c = mix(vec3(.278, .247, .161), vec3(.102, .149, .114), smoothstep(0., 1., t));
        float a = mix(.11, .9, smoothstep(0., 1., t));
        float line = exp(-pow(t * 220., 2.)) * .2;
        gl_FragColor = vec4(untone(mix(c, vec3(.74, .71, .55), line / max(a + line, 1e-3))), (a + line) * uOp);
      }`,
  }));
  mesh.renderOrder = 4;
  mesh.frustumCulled = false;
  return { mesh, u };
}
