// Things drawn in stars, floating around the portrait: Meta Ray-Ban Display glasses, a DJI Osmo Pocket 3 that turns
// its screen sideways and starts recording, a DJI Mini 4 Pro in flight, and a Tesla Model Y that pulls up to a
// Supercharger, charges and drives off. After the vault opens they drift past behind the content.
import * as THREE from './vendor/three.module.min.js';

const SPRITE_FRAG = /* glsl */`
varying vec3 vColor;
void main(){
  float d = length(gl_PointCoord - .5) * 2.;
  if (d > 1.) discard;
  float core = smoothstep(.42, 0., d);
  float glow = pow(1. - d, 2.4);
  gl_FragColor = vec4(vColor * (glow * .8 + core * 1.7), 1.);
}`;

const GADGET_VERT = /* glsl */`
attribute vec4 aPart;
attribute vec4 aPivot;
attribute vec3 aScat;
uniform float uTime, uIntro, uOp, uSizeK, uPxScale, uMaxPt, uObjScale, uStyle;
uniform float uWheel, uCharge, uPlug;   // the car's wheel angle, how hard it's charging, and how far the cable is plugged in
varying vec3 vColor;
mat2 rot2(float a){ float c = cos(a), s = sin(a); return mat2(c, s, -s, c); }
float h1(float n){ return fract(sin(n) * 43758.5453); }

// The Pocket 3's 8-second loop: portrait standby → the screen turns to 16:9 → the record button is pressed →
// recording (blinking REC dot, timer, red frame) → the screen turns back.
float pkPhase(){ return mod(uTime + 6.8, 8.); }
float pkTurn(float ph){ return smoothstep(1.2, 2.0, ph) * (1. - smoothstep(6.6, 7.4, ph)); }
float pkPress(float ph){ return exp(-pow((ph - 2.6) / .1, 2.)); }
float pkRec(float ph){ return step(2.75, ph) * (1. - step(6.6, ph)); }

// What the Pocket 3 shows, from a screen point's position q (relative to the screen's centre, after turning).
// The picture stays level as the screen turns; the frame, grid and overlays follow the screen's current shape.
vec3 pocketScreen(vec2 q, float turn, float rec){
  float w = mix(.27, .48, turn), h = mix(.48, .27, turn);
  vec2 im = q / .48 + .5;
  // a sunset over water: warm sky, a low sun, a dark horizon
  float horizon = .44 + .02 * sin(im.x * 9. + uTime * .3);
  vec3 sky = mix(vec3(1.25, .62, .32), vec3(.62, .45, 1.05), smoothstep(.44, .95, im.y));
  sky += vec3(1.6, 1.1, .6) * (1. - smoothstep(.03, .07, length(im - vec2(.58, .5))));
  vec3 sea = mix(vec3(.1, .22, .42), vec3(.55, .32, .28), smoothstep(.2, .44, im.y));
  vec3 c = (im.y > horizon ? sky : sea) * mix(.75, 1., turn);
  vec2 f = q / vec2(w, h) + .5;
  float grid = max(step(abs(f.x - .333), .01), step(abs(f.x - .667), .01)) + max(step(abs(f.y - .333), .01), step(abs(f.y - .667), .01));
  c += vec3(.6) * grid * .25 * turn;
  float blink = step(.5, fract(uTime * 1.1));
  vec2 corner = vec2(-w * .5 + .033, h * .5 - .033);
  float dot = 1. - smoothstep(.013, .021, length(q - corner));
  float timer = step(abs(q.y - corner.y), .006) * step(corner.x + .03, q.x) * step(q.x, corner.x + .09);
  float shutter = 1. - smoothstep(.006, .011, abs(length(q - vec2(w * .5 - .04, 0.)) - .02));
  float edge = 1. - smoothstep(.006, .016, min(w * .5 - abs(q.x), h * .5 - abs(q.y)));
  c += vec3(2.2, .15, .2) * rec * (dot * (.35 + .65 * blink) + edge * .55) + vec3(1.6) * rec * timer;
  c += vec3(1.4) * shutter * turn * (1. - rec);
  return c;
}

// what the glasses show: a heads-up card in the wearer's right lens
vec3 screen(float u, float v){
  float row = floor((1. - v) * 5.), fr = fract((1. - v) * 5.);
  float len = row < .5 ? .34 : .25 + .55 * h1(row * 3.7 + floor(uTime * .4));
  float on = step(.12, u) * step(u, .12 + len) * step(.3, fr) * step(fr, .72) * step(.5, row);
  float clock = (1. - step(.5, row)) * step(.12, u) * step(u, .46) * step(.25, fr) * step(fr, .8);
  float dot = 1. - smoothstep(.06, .1, length(vec2(u - .84, (v - .82) * .62)));
  return vec3(.2, .45, .5) * .35 + vec3(.75, 1., .92) * 1.6 * max(on, clock) + vec3(.55, 1., .8) * 1.4 * dot;
}

void main(){
  float kind = aPart.x, hs = aPart.y, u = aPart.z, v = aPart.w;
  vec3 p = position;
  float ph = pkPhase(), turn = pkTurn(ph), press = pkPress(ph), rec = pkRec(ph);
  vec2 sq = vec2(0.);
  if (aPivot.w > .5) {
    vec3 q = p - aPivot.xyz;
    if (aPivot.w > 4.5) { q.xy = rot2(-turn * 1.5708) * q.xy; sq = q.xy; }        // the Pocket 3's screen turns sideways
    else if (aPivot.w > 3.5) q.yz = rot2(uWheel) * q.yz;                          // the car's wheels roll with the distance driven
    else q.xz = rot2(aPivot.w < 1.5 ? uTime * 11. : aPivot.w < 2.5 ? -uTime * 11. : sin(uTime * .55) * .7) * q.xz;
    p = aPivot.xyz + q;
  }
  // the charging cable hangs from the stall to its holster, or to the car's port while plugged in
  float cableT = -1.;
  if (kind > 8.5) {
    cableT = u;
    vec3 S = vec3(.7, .55, -1.18), E = mix(vec3(.745, .66, -1.3), vec3(.475, .62, -.92), uPlug);
    vec3 C = (S + E) * .5 + vec3(.1, -.3 + .14 * uPlug, 0.);
    float t = u, it = 1. - t;
    p = it * it * S + 2. * it * t * C + t * t * E + position;
  }
  if (uStyle > .5 && uStyle < 1.5 && kind > 4.5 && kind < 5.5) p.z -= press * .014;   // the record button is pressed
  float ui = clamp(uIntro * 1.5 - hs * .3 - .2, 0., 1.); ui = 1. - pow(1. - ui, 3.);   // every point lands by the end of the intro
  p = mix(aScat, p, ui);

  vec3 col; float sz;
  if (kind < .5)      { col = vec3(.55, .7, .9) * .62; sz = .032; }
  else if (kind < 1.5){ col = vec3(.8, .92, 1.) * 1.45; sz = .036; }
  else if (kind < 2.5){ col = vec3(.4, .45, .78) * .36; sz = .03; }
  else if (kind < 3.5){ col = uStyle > .5 ? pocketScreen(sq, turn, rec) * 1.45 : screen(u, v) * 1.15; sz = uStyle > .5 ? .042 : .034; }
  else if (kind < 4.5){ col = vec3(.72, .86, 1.) * 1.9; sz = .038; }
  else if (kind < 5.5){
    vec3 lc = u < .5 ? vec3(1., .28, .32) : u < 1.5 ? vec3(.35, 1., .6) : vec3(1., .95, .9);
    float blink = .5 + .5 * pow(max(0., sin(uTime * 3. + h1(u * 7.1) * 6.)), 6.);
    col = lc * (1.1 + 1.3 * blink); sz = .03;
    if (uStyle > .5 && uStyle < 1.5) col = vec3(1., .2, .24) * (.9 + 3. * press + rec * (.7 + .7 * step(.5, fract(uTime * 1.1))));  // record button
    if (uStyle > 2.5 && uStyle < 3.5 && u > .5 && u < 1.5) col = vec3(.35, 1., .6) * (.25 + 2.4 * uCharge * (.55 + .45 * sin(uTime * 4.)));  // charge port
  }
  else if (kind < 6.5){ col = vec3(.82, .9, 1.) * 1.15; sz = .032; }
  else if (kind < 7.5){ col = vec3(.6, .75, 1.) * .2; sz = .036; }
  else if (kind < 8.5){ col = vec3(.36, .79, .65) * 1.3; sz = .032; }
  else                { col = vec3(.62, .74, .9) * .8 + vec3(.4, 1., .75) * 2.2 * uCharge * pow(fract(cableT * 4. - uTime * 1.8), 6.); sz = .028; }
  if (uStyle > 2.5) col *= kind < .5 ? .7 : kind < 1.5 ? 1.2 : 1.;   // the car and charger: faint panels, bright outline
  if (uStyle > .5 && uStyle < 1.5 && kind < 1.5) col *= 1.35;           // lift the Pocket 3 so it reads at a glance
  col *= mix(1.5, 1., ui);

  vec4 mv = modelViewMatrix * vec4(p, 1.);
  float z = max(.05, -mv.z);
  gl_PointSize = min(sz * uObjScale * uSizeK * (.85 + .3 * sin(uTime * 2.1 + hs * 6.28)) * uPxScale / z, uMaxPt);
  vColor = col * uOp * smoothstep(.12, .6, z);
  gl_Position = projectionMatrix * mv;
}`;

function makeOne(d, style, radius) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(d.pos, 3));
  g.setAttribute('aPart', new THREE.BufferAttribute(d.part, 4));
  g.setAttribute('aPivot', new THREE.BufferAttribute(d.pivot, 4));
  g.setAttribute('aScat', new THREE.BufferAttribute(d.scat, 3));
  const u = {
    uTime: { value: 0 }, uIntro: { value: 0 }, uOp: { value: 0 }, uSizeK: { value: 1 }, uPxScale: { value: 100 },
    uMaxPt: { value: 64 }, uObjScale: { value: 1 }, uStyle: { value: style },
    uWheel: { value: 0 }, uCharge: { value: 0 }, uPlug: { value: 0 },
  };
  const pts = new THREE.Points(g, new THREE.ShaderMaterial({
    vertexShader: GADGET_VERT, fragmentShader: SPRITE_FRAG, uniforms: u,
    transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  pts.frustumCulled = false;
  pts.renderOrder = 12;
  const group = new THREE.Group();
  group.add(pts);
  return { group, points: pts, u, geometry: g, total: d.pos.length / 3, radius };
}

export function createGadgets(data) {
  // the glasses are drawn from the front hinge line backwards, so shift them to rotate about their middle
  const glasses = makeOne(data.glasses, 0, 0.8);
  glasses.points.position.z = 0.55;
  // the car is drawn standing on y = 0; lift it so it turns about its middle
  const car = makeOne(data.car, 3, 1.15);
  car.points.position.y = -0.46;
  // the Supercharger stands still in the car's group while the car itself drives in, charges and leaves
  const charger = makeOne(data.charger, 4, 1);
  charger.points.position.y = -0.46;
  car.group.add(charger.points);
  car.charger = charger;
  return { glasses, pocket: makeOne(data.pocket, 1, 0.72), drone: makeOne(data.drone, 2, 0.95), car };
}

// The car's 11-second loop: it rolls in and slows to a stop beside the charger, the cable plugs in, it charges,
// the cable goes back to its holster, and the car pulls away. z is how far along it is (the car is about 2.2 long).
export function carLoop(t) {
  const L = 11, ph = ((t + 8.6) % L + L) % L;
  const sm = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
  let z;
  if (ph < 2.6) z = -3.4 * (1 - ph / 2.6) ** 2;
  else if (ph < 7.8) z = 0;
  else if (ph < 10.2) z = 3.6 * ((ph - 7.8) / 2.4) ** 2;
  else z = 9;
  return {
    z, wheel: z / 0.19,
    plug: sm(2.6, 3.2, ph) * (1 - sm(7.2, 7.8, ph)),
    charge: sm(3.2, 3.6, ph) * (1 - sm(6.8, 7.2, ph)),
    fade: 1 - sm(1.8, 3, Math.abs(z)),
  };
}

// Draw only a share of each gadget's points (tiers) and keep their brightness steady.
export function setGadgetBudget(gadgets, frac) {
  for (const k of ['glasses', 'pocket', 'drone', 'car']) {
    const o = gadgets[k], n = Math.max(600, Math.round(o.total * frac));
    o.geometry.setDrawRange(0, n);
    o.u.uSizeK.value = Math.sqrt(o.total / n);
    if (o.charger) {
      const c = o.charger, m = Math.max(500, Math.round(c.total * frac));
      c.geometry.setDrawRange(0, m); c.u.uSizeK.value = Math.sqrt(c.total / m);
    }
  }
}
