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
uniform float uWindSize, uFlutter, uLoops, uBackgroundBrightness, uPointStrength, uCameraRoll, uInteract;
uniform vec2 uFlightHalfExtent, uViewportPx;
uniform vec4 uMouse;
${PATH_GLSL}
const float TAU = 6.2831853;
const vec2 HUB = vec2(0., 222. / 512. - .5);

// p, sprite size (world), angle, colour, alpha; compact = globe sprite mode; plantMix = drawn as a round plant point;
// kids = how visible the attached filament points are
void seedPose(out vec3 p, out float size, out float angle, out vec3 colour, out float alpha, out float compact, out float plantMix, out float kids){
  float h = aScat.w, r = aMisc.y, R = uRadius, k4 = R / 4.;

  // ---- the globe, with the seeds parting around Ottawa on the way in
  vec4 g4 = mix(vec4(position, aMisc.x), aCoast, uCoastMode);
  vec3 globe = g4.xyz;
  vec2 delta = globe.xy - uEye.xy; float dist = length(delta);
  float open = smoothstep(.24, .62, uDive) * uAperture;
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
  p = mix(globe, wind, morph);

  float lum = g4.w;
  colour = mix(mix(vec3(.49, .66, .44), vec3(1., .97, .83), lum) * uGlobeBrightness,
               mix(vec3(.68, .77, .61), vec3(1., .95, .79), h) * uBackgroundBrightness, morph);
  float large = step(.965, r);
  size = mix((.13 + .10 * h) * uWindSize * k4, mix(.10 + .18 * fract(r * 97.), .48 + .55 * h, large) * uWindSize, morph);
  compact = uGlobeCompact * (1. - smoothstep(.20, .62, uDive)) * (1. - morph);
  size *= mix(1., uGlobeCompactScale, compact);
  angle = -.1 + sin(uTime * (.6 + h * .4) + h * TAU) * .20 * uFlutter + caught * sin(k * TAU) * .9 * morph - uCameraRoll;
  float ahead = slot - uTravel, edge = abs(across) / hx * 12.;
  float fog = smoothstep(-23., -12., ahead) * (1. - smoothstep(45., 79., ahead)) * (1. - smoothstep(8., 12., edge));
  alpha = mix(.12 + .57 * lum, (.22 + .48 * h) * fog, morph);
  plantMix = 0.;
  kids = 1. - morph;

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
    uRadius: { value: 2.3 }, uAperture: { value: 1 }, uCoastMode: { value: 1 }, uGlobeCompact: { value: 1 }, uGlobeCompactScale: { value: 0.38 }, uGlobeBrightness: { value: 1.6 },
    uWindSize: { value: 1 }, uFlutter: { value: 1 }, uLoops: { value: 1 }, uBackgroundBrightness: { value: 2.5 }, uPointStrength: { value: 0.3 },
    uCameraRoll: { value: 0 }, uInteract: { value: 1 },
    uFlightHalfExtent: { value: new THREE.Vector2(18, 18) }, uViewportPx: { value: new THREE.Vector2(1, 1) },
    uMouse: { value: new THREE.Vector4(0, 0, 0, 0) },
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
