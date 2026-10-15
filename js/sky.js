// The living sky: a Milky Way with dust lanes and nebula clouds (baked once into a texture),
// crisp twinkling stars, an endless dust field for parallax, and occasional shooting stars.
import * as THREE from './vendor/three.module.min.js';

const NOISE = /* glsl */`
vec3 mod289(vec3 x){ return x - floor(x * (1. / 289.)) * 289.; }
vec4 mod289(vec4 x){ return x - floor(x * (1. / 289.)) * 289.; }
vec4 permute(vec4 x){ return mod289(((x * 34.) + 1.) * x); }
vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - .85373472095314 * r; }
float snoise(vec3 v){
  const vec2 C = vec2(1. / 6., 1. / 3.); const vec4 D = vec4(0., .5, 1., 2.);
  vec3 i = floor(v + dot(v, C.yyy)); vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz); vec3 l = 1. - g; vec3 i1 = min(g.xyz, l.zxy); vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx; vec3 x2 = x0 - i2 + C.yyy; vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(i.z + vec4(0., i1.z, i2.z, 1.)) + i.y + vec4(0., i1.y, i2.y, 1.)) + i.x + vec4(0., i1.x, i2.x, 1.));
  float n_ = .142857142857; vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49. * floor(p * ns.z * ns.z); vec4 x_ = floor(j * ns.z); vec4 y_ = floor(j - 7. * x_);
  vec4 x = x_ * ns.x + ns.yyyy; vec4 y = y_ * ns.x + ns.yyyy; vec4 h = 1. - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy); vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2. + 1.; vec4 s1 = floor(b1) * 2. + 1.; vec4 sh = -step(h, vec4(0.));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy; vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x); vec3 p1 = vec3(a0.zw, h.y); vec3 p2 = vec3(a1.xy, h.z); vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.); m = m * m;
  return 42. * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}
float fbm(vec3 p){ float a = .5, s = 0.; for (int i = 0; i < 6; i++) { s += a * snoise(p); p *= 2.03; a *= .5; } return s; }
`;

const BAKE_FRAG = /* glsl */`
varying vec2 vUv;
${NOISE}
void main(){
  float lon = (vUv.x - .5) * 6.2831853, lat = (vUv.y - .5) * 3.1415927;
  vec3 d = vec3(cos(lat) * sin(lon), sin(lat), -cos(lat) * cos(lon));
  vec3 n = normalize(vec3(.35, .86, .38));
  float bd = dot(d, n);
  vec3 gc = normalize(vec3(-.55, -.12, -.83));
  float core = exp(-pow(acos(clamp(dot(d, gc), -1., 1.)) / .55, 2.));
  float clump = .5 + .5 * fbm(d * 3.2);
  float band = exp(-pow(bd / (.17 + .05 * fbm(d * 2.)), 2.)) * clump;
  float lane = smoothstep(.12, .45, fbm(d * 5.5 + 7.3)) * exp(-pow(bd / .055, 2.));
  band *= 1. - .78 * lane;
  vec3 bandCol = mix(vec3(.5, .56, .85), vec3(1., .8, .6), core) * band * (.34 + .6 * core);
  vec3 q = d * 2.1;
  float w = fbm(q + fbm(q * 1.7 + 3.1));
  float neb = smoothstep(.1, .75, w);
  vec3 nc = mix(vec3(.16, .7, .6), vec3(.6, .3, .86), smoothstep(-.3, .3, fbm(d * 1.3 + 11.)));
  nc = mix(nc, vec3(.92, .4, .55), smoothstep(.25, .6, fbm(d * 1.1 - 4.)) * .7);
  float wisp = .6 + .4 * fbm(d * 9. + 2.);
  vec3 nebCol = nc * neb * wisp * .2;
  float st = pow(max(0., snoise(d * 300.)), 16.) * 1.2;
  vec3 base = vec3(.008, .012, .028) + vec3(.004, .006, .016) * (1. - abs(d.y));
  float dither = (fract(sin(dot(vUv, vec2(12.9898, 78.233))) * 43758.5453) - .5) / 255.;
  gl_FragColor = vec4(base + bandCol + nebCol + st + dither, 1.);
}`;

const DOME_VERT = /* glsl */`varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`;
const DOME_FRAG = /* glsl */`
uniform sampler2D tSky; uniform vec3 uTint; uniform float uBright, uRot;
varying vec3 vDir;
void main(){
  vec3 d = normalize(vDir);
  float cr = cos(uRot), sr = sin(uRot);
  d.xz = vec2(d.x * cr - d.z * sr, d.x * sr + d.z * cr);
  float lon = atan(d.x, -d.z), lat = asin(clamp(d.y, -1., 1.));
  vec3 c = texture2D(tSky, vec2(lon / 6.2831853 + .5, lat / 3.1415927 + .5)).rgb;
  gl_FragColor = vec4(c * uTint * uBright, 1.);
}`;

const STAR_VERT = /* glsl */`
attribute vec4 aStar; // rgb tint packed in .xyz? no: x mag, y hash, z temp, w unused
uniform float uTime, uRot, uDpr, uBright;
varying vec3 vColor;
void main(){
  vec3 d = position;
  float cr = cos(-uRot), sr = sin(-uRot);
  d.xz = vec2(d.x * cr - d.z * sr, d.x * sr + d.z * cr);
  vec4 mv = modelViewMatrix * vec4(d * 380., 1.);
  float mag = aStar.x;
  float tw = .7 + .3 * sin(uTime * (1.5 + aStar.y * 3.) + aStar.y * 40.);
  gl_PointSize = (1.1 + 3.6 * mag * mag * mag) * uDpr;
  vec3 c = mix(vec3(.7, .8, 1.), vec3(1., .85, .65), aStar.z);
  vColor = c * (.25 + 1.5 * mag * mag) * tw * uBright;
  gl_Position = projectionMatrix * mv;
}`;

const DUST_VERT = /* glsl */`
attribute vec4 aDust;
uniform vec3 uCam; uniform float uTime, uPxScale, uOp;
varying vec3 vColor;
void main(){
  vec3 size = vec3(36., 22., 70.);
  vec3 p = uCam + mod(position - uCam + size * .5, size) - size * .5;
  p.y += sin(uTime * .2 + aDust.y * 30.) * .15;
  vec4 mv = viewMatrix * vec4(p, 1.);
  float z = max(.1, -mv.z);
  vec3 rel = (p - uCam) / (size * .5);
  float edge = 1. - smoothstep(.65, 1., max(abs(rel.x), max(abs(rel.y), abs(rel.z))));
  gl_PointSize = min((.035 + .05 * aDust.x) * uPxScale / z, 24.);
  vec3 c = aDust.y < .55 ? vec3(.36, .79, .65) : vec3(.69, .66, .93);
  vColor = c * (.18 + .3 * aDust.x) * edge * smoothstep(.4, 2., z) * uOp;
  gl_Position = projectionMatrix * mv;
}`;

const SPRITE_FRAG = /* glsl */`
varying vec3 vColor;
void main(){
  float d = length(gl_PointCoord - .5) * 2.;
  if (d > 1.) discard;
  gl_FragColor = vec4(vColor * (pow(1. - d, 2.4) * .8 + smoothstep(.42, 0., d) * 1.7), 1.);
}`;

const SHOOT_VERT = /* glsl */`
attribute float aT;
uniform float uDpr, uOp;
varying vec3 vColor;
void main(){
  vec4 mv = modelViewMatrix * vec4(position, 1.);
  gl_PointSize = (1. + 3. * aT) * uDpr;
  vColor = vec3(.85, .92, 1.) * aT * aT * 2.2 * uOp;
  gl_Position = projectionMatrix * mv;
}`;

function additive(vertexShader, fragmentShader, uniforms) {
  return new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending });
}

export class Sky {
  constructor(renderer, tier, hdrType, R) {
    this.renderer = renderer;
    this.R = R;
    this.group = new THREE.Group();

    // bake the nebula once
    const W = tier.sky, H = tier.sky / 2;
    this.rt = new THREE.WebGLRenderTarget(W, H, { type: hdrType, depthBuffer: false, generateMipmaps: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, wrapS: THREE.RepeatWrapping });
    const bakeScene = new THREE.Scene(), bakeCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const tri = new THREE.BufferGeometry();
    tri.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
    const bakeMat = new THREE.ShaderMaterial({ vertexShader: `varying vec2 vUv; void main(){ vUv = position.xy * .5 + .5; gl_Position = vec4(position.xy, 0., 1.); }`, fragmentShader: BAKE_FRAG, depthTest: false, depthWrite: false });
    const q = new THREE.Mesh(tri, bakeMat); q.frustumCulled = false; bakeScene.add(q);
    renderer.setRenderTarget(this.rt); renderer.render(bakeScene, bakeCam); renderer.setRenderTarget(null);
    bakeMat.dispose(); tri.dispose();

    this.domeU = { tSky: { value: this.rt.texture }, uTint: { value: new THREE.Vector3(1, 1, 1) }, uBright: { value: 1 }, uRot: { value: 0 } };
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(400, 48, 24), new THREE.ShaderMaterial({ vertexShader: DOME_VERT, fragmentShader: DOME_FRAG, uniforms: this.domeU, side: THREE.BackSide, depthTest: false, depthWrite: false }));
    this.dome.renderOrder = -100; this.dome.frustumCulled = false;
    this.group.add(this.dome);

    // stars, a share of them crowding the galactic band
    const NS = tier.stars, sp = new Float32Array(NS * 3), sa = new Float32Array(NS * 4);
    const n = new THREE.Vector3(0.35, 0.86, 0.38).normalize(), v = new THREE.Vector3();
    for (let i = 0; i < NS; i++) {
      for (let k = 0; k < 8; k++) {
        v.set(R() * 2 - 1, R() * 2 - 1, R() * 2 - 1);
        const l = v.length(); if (l > 1 || l < 0.01) continue; v.divideScalar(l);
        if (i % 9 < 4 && Math.abs(v.dot(n)) > 0.12 + R() * 0.2) continue;
        break;
      }
      v.normalize();
      sp[i * 3] = v.x; sp[i * 3 + 1] = v.y; sp[i * 3 + 2] = v.z;
      sa[i * 4] = Math.pow(R(), 2.6); sa[i * 4 + 1] = R(); sa[i * 4 + 2] = R() < 0.25 ? 0.6 + R() * 0.4 : R() * 0.3;
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    sg.setAttribute('aStar', new THREE.BufferAttribute(sa, 4));
    this.starU = { uTime: { value: 0 }, uRot: { value: 0 }, uDpr: { value: 1 }, uBright: { value: 1 } };
    this.stars = new THREE.Points(sg, additive(STAR_VERT, SPRITE_FRAG, this.starU));
    this.stars.renderOrder = -90; this.stars.frustumCulled = false;
    this.group.add(this.stars);

    // endless dust: wraps around the camera so it is always there to fly through
    const ND = tier.dust, dp = new Float32Array(ND * 3), da = new Float32Array(ND * 4);
    for (let i = 0; i < ND; i++) {
      dp[i * 3] = (R() - 0.5) * 36; dp[i * 3 + 1] = (R() - 0.5) * 22; dp[i * 3 + 2] = (R() - 0.5) * 70;
      da[i * 4] = R(); da[i * 4 + 1] = R();
    }
    const dg = new THREE.BufferGeometry();
    dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
    dg.setAttribute('aDust', new THREE.BufferAttribute(da, 4));
    this.dustU = { uCam: { value: new THREE.Vector3() }, uTime: { value: 0 }, uPxScale: { value: 100 }, uOp: { value: 1 } };
    this.dust = new THREE.Points(dg, additive(DUST_VERT, SPRITE_FRAG, this.dustU));
    this.dust.renderOrder = -80; this.dust.frustumCulled = false;

    // two shooting-star streaks
    this.shoot = [];
    for (let k = 0; k < 2; k++) {
      const M = 44, g = new THREE.BufferGeometry(), at = new Float32Array(M);
      for (let i = 0; i < M; i++) at[i] = 1 - i / (M - 1);
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(M * 3), 3));
      g.setAttribute('aT', new THREE.BufferAttribute(at, 1));
      const u = { uDpr: { value: 1 }, uOp: { value: 0 } };
      const p = new THREE.Points(g, additive(SHOOT_VERT, SPRITE_FRAG, u));
      p.renderOrder = -85; p.frustumCulled = false;
      this.shoot.push({ points: p, u, life: -1, next: 2 + k * 4 + R() * 3, d0: new THREE.Vector3(), d1: new THREE.Vector3() });
    }
  }

  addTo(scene) {
    scene.add(this.group, this.dust);
    for (const s of this.shoot) scene.add(s.points);
  }

  setDust(n) { this.dust.geometry.setDrawRange(0, n); }

  update(camera, t, dt, look) {
    this.group.position.copy(camera.position);
    const rot = t * 0.004;
    this.domeU.uRot.value = rot; this.starU.uRot.value = rot; this.starU.uTime.value = t;
    this.domeU.uTint.value.copy(look.tint);
    this.domeU.uBright.value = look.sky;
    this.starU.uBright.value = look.stars;
    this.dustU.uCam.value.copy(camera.position); this.dustU.uTime.value = t; this.dustU.uOp.value = look.dust;

    const _v = this._v || (this._v = new THREE.Vector3());
    for (const s of this.shoot) {
      if (s.life < 0) {
        s.next -= dt;
        if (s.next <= 0 && look.shooting) {
          const x0 = -0.8 + this.R() * 1.2, y0 = 0.25 + this.R() * 0.6;
          const dx = 0.35 + this.R() * 0.4, dy = -(0.15 + this.R() * 0.3);
          s.d0.set(x0, y0, 0.5).unproject(camera).sub(camera.position).normalize();
          s.d1.set(x0 + dx, y0 + dy, 0.5).unproject(camera).sub(camera.position).normalize();
          s.life = 0; s.dur = 0.55 + this.R() * 0.4;
        }
        s.u.uOp.value = 0;
        continue;
      }
      s.life += dt;
      const f = s.life / s.dur;
      if (f >= 1.25) { s.life = -1; s.next = 4 + this.R() * 7; s.u.uOp.value = 0; continue; }
      const arr = s.points.geometry.attributes.position.array, M = arr.length / 3;
      for (let i = 0; i < M; i++) {
        const fi = Math.max(0, Math.min(1, f - (i / (M - 1)) * 0.22));
        _v.copy(s.d0).lerp(s.d1, fi).normalize().multiplyScalar(300).add(camera.position);
        arr[i * 3] = _v.x; arr[i * 3 + 1] = _v.y; arr[i * 3 + 2] = _v.z;
      }
      s.points.geometry.attributes.position.needsUpdate = true;
      s.u.uOp.value = Math.sin(Math.min(1, f) * Math.PI) * look.shooting;
    }
  }

  setScale(dpr, pxScale) {
    this.starU.uDpr.value = dpr; this.dustU.uPxScale.value = pxScale;
    for (const s of this.shoot) s.u.uDpr.value = dpr;
  }
}
