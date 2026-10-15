// The solar system: a sun that actually blazes (core + corona + rays), eight planets, orbit trails.
import * as THREE from './vendor/three.module.min.js';

const SOFT_VERT = /* glsl */`
uniform float uTime, uPxScale, uOp, uMaxPt;
attribute float aSize; attribute float aHash; attribute vec3 aCol;
varying vec3 vColor;
void main(){
  vec4 mv = modelViewMatrix * vec4(position, 1.);
  float z = max(.1, -mv.z);
  gl_PointSize = min(aSize * (.85 + .3 * sin(uTime * 2.3 + aHash * 6.28)) * uPxScale / z, uMaxPt);
  vColor = aCol * uOp * smoothstep(.2, 1.2, z);
  gl_Position = projectionMatrix * mv;
}`;
const SOFT_FRAG = /* glsl */`
varying vec3 vColor;
void main(){
  float d = length(gl_PointCoord - .5) * 2.;
  if (d > 1.) discard;
  gl_FragColor = vec4(vColor * (pow(1. - d, 2.4) * .8 + smoothstep(.42, 0., d) * 1.7), 1.);
}`;

// Billboarded glow: hot white core, amber corona, slowly turning rays. Values go well past 1.0
// so the bloom pass turns it into real light.
const CORONA_VERT = /* glsl */`
uniform float uSize;
varying vec2 vP;
void main(){
  vP = position.xy * 2.;
  vec4 c = modelViewMatrix * vec4(0., 0., 0., 1.);
  gl_Position = projectionMatrix * (c + vec4(position.xy * uSize, 0., 0.));
}`;
const CORONA_FRAG = /* glsl */`
uniform float uTime, uOp, uHeat;
varying vec2 vP;
void main(){
  float r = length(vP);
  if (r > 1.) discard;
  float a = atan(vP.y, vP.x);
  float core = exp(-r * r * 90.) * 7.;
  float halo = .5 / (1. + r * r * 55.);
  float rays = pow(.5 + .5 * sin(a * 9. + uTime * .25) * sin(a * 5. - uTime * .17 + 1.3), 4.) * exp(-r * 3.6) * .9;
  float edge = 1. - smoothstep(.55, 1., r);
  vec3 hot = vec3(1., .97, .9), amber = vec3(1., .62, .26), ember = vec3(.95, .32, .2);
  vec3 col = hot * core + mix(amber, ember, smoothstep(.1, .6, r)) * (halo + rays) * (1. + uHeat);
  gl_FragColor = vec4(col * edge * uOp, 1.);
}`;

function additive(vertexShader, fragmentShader, uniforms) {
  return new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending });
}

function ball(R, n, rad, col, s0, s1) {
  const p = new Float32Array(n * 3), c = new Float32Array(n * 3), s = new Float32Array(n), h = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const el = Math.acos(2 * R() - 1), az = Math.PI * 2 * R(), rr = rad * Math.cbrt(R());
    p[i * 3] = rr * Math.sin(el) * Math.cos(az); p[i * 3 + 1] = rr * Math.sin(el) * Math.sin(az); p[i * 3 + 2] = rr * Math.cos(el);
    const v = 0.75 + R() * 0.45;
    c[i * 3] = col[0] * v; c[i * 3 + 1] = col[1] * v; c[i * 3 + 2] = col[2] * v;
    s[i] = s0 + R() * (s1 - s0); h[i] = R();
  }
  return geo(p, c, s, h);
}
function geo(p, c, s, h) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  g.setAttribute('aCol', new THREE.BufferAttribute(c, 3));
  g.setAttribute('aSize', new THREE.BufferAttribute(s, 1));
  g.setAttribute('aHash', new THREE.BufferAttribute(h, 1));
  return g;
}

export class Solar {
  constructor(R) {
    this.group = new THREE.Group();
    this.mats = [];
    const mk = () => { const u = { uTime: { value: 0 }, uPxScale: { value: 100 }, uOp: { value: 1 }, uMaxPt: { value: 64 } }; const m = additive(SOFT_VERT, SOFT_FRAG, u); this.mats.push(m); return m; };

    this.sunPts = new THREE.Points(ball(R, 3200, 0.5, [1, 0.78, 0.4], 0.14, 0.3), mk());
    this.coronaU = { uTime: { value: 0 }, uOp: { value: 1 }, uSize: { value: 4.2 }, uHeat: { value: 0 } };
    this.corona = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), additive(CORONA_VERT, CORONA_FRAG, this.coronaU));
    this.sun = new THREE.Group();
    this.sun.add(this.corona, this.sunPts);
    this.group.add(this.sun);

    const orbR = [0.95, 1.35, 1.75, 2.2, 2.7, 3.15, 3.6, 4.05];
    const NO = 160 * orbR.length, op = new Float32Array(NO * 3), oc = new Float32Array(NO * 3), os = new Float32Array(NO), oh = new Float32Array(NO);
    for (let i = 0; i < NO; i++) {
      const R3 = orbR[Math.floor(i / 160)], a = ((i % 160) / 160) * Math.PI * 2;
      op[i * 3] = Math.cos(a) * R3; op[i * 3 + 1] = 0; op[i * 3 + 2] = Math.sin(a) * R3;
      oc[i * 3] = 0.3; oc[i * 3 + 1] = 0.36; oc[i * 3 + 2] = 0.48; os[i] = 0.05 + R() * 0.03; oh[i] = R();
    }
    this.orbits = new THREE.Points(geo(op, oc, os, oh), mk());
    this.group.add(this.orbits);

    const P = [
      [0.95, 0.1, [0.62, 0.78, 1], 0.62], [1.35, 0.13, [1, 0.6, 0.44], 0.47], [1.75, 0.15, [0.55, 0.9, 0.72], 0.36],
      [2.2, 0.18, [0.95, 0.84, 0.55], 0.27], [2.7, 0.12, [0.74, 0.68, 1], 0.2], [3.15, 0.16, [0.5, 0.72, 0.95], 0.16],
      [3.6, 0.14, [0.86, 0.9, 1], 0.12], [4.05, 0.11, [0.9, 0.68, 0.85], 0.09],
    ];
    this.planets = P.map((c, i) => {
      const m = mk();
      const o = new THREE.Points(ball(R, 900, c[1], c[2], 0.08, 0.16), m);
      if (i === 3) {
        const n = 520, rp = new Float32Array(n * 3), rc = new Float32Array(n * 3), rs = new Float32Array(n), rh = new Float32Array(n);
        for (let k = 0; k < n; k++) {
          const a = Math.PI * 2 * R(), rr = 0.26 + R() * 0.1, v = 0.55 + R() * 0.35;
          rp[k * 3] = Math.cos(a) * rr; rp[k * 3 + 1] = (R() - 0.5) * 0.015; rp[k * 3 + 2] = Math.sin(a) * rr;
          rc[k * 3] = 0.9 * v; rc[k * 3 + 1] = 0.82 * v; rc[k * 3 + 2] = 0.58 * v; rs[k] = 0.05 + R() * 0.03; rh[k] = R();
        }
        const ring = new THREE.Points(geo(rp, rc, rs, rh), m);
        ring.rotation.x = 0.5; o.add(ring);
      }
      this.group.add(o);
      return { o, orb: c[0], spd: c[3], ph: i * 1.7 };
    });
    this.group.traverse((o) => { o.frustumCulled = false; o.renderOrder = -60; });
  }

  update(t, op, heat) {
    for (const m of this.mats) { m.uniforms.uTime.value = t; m.uniforms.uOp.value = op; }
    this.coronaU.uTime.value = t; this.coronaU.uOp.value = op; this.coronaU.uHeat.value = heat;
    this.sun.rotation.y = t * 0.2;
    for (const p of this.planets) {
      const a = t * p.spd + p.ph;
      p.o.position.set(Math.cos(a) * p.orb, 0, Math.sin(a) * p.orb);
      p.o.rotation.y = t * 1.4;
    }
  }

  setScale(pxScale, maxPt) { for (const m of this.mats) { m.uniforms.uPxScale.value = pxScale; m.uniforms.uMaxPt.value = maxPt; } }
}
