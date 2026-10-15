// Tunnel and vault effects: Matrix glyph rain flowing down the tunnel, three trilliums
// that bloom open as you pass, and the shockwave ring when the vault locks.
import * as THREE from './vendor/three.module.min.js';
import { PATH_GLSL, TUN } from './path.js';

const GLYPHS = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜｦﾝ0123456789Z:=*+<>';

function glyphAtlas() {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const x = c.getContext('2d');
  x.fillStyle = '#000'; x.fillRect(0, 0, 512, 512);
  x.font = '48px "Hiragino Sans", "Hiragino Kaku Gothic ProN", "MS Gothic", monospace';
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.shadowColor = 'rgba(255,255,255,.9)'; x.shadowBlur = 8; x.fillStyle = '#fff';
  for (let i = 0; i < 64; i++) {
    const ch = GLYPHS[i % GLYPHS.length], cx = (i % 8) * 64 + 32, cy = Math.floor(i / 8) * 64 + 34;
    x.save(); x.translate(cx, cy); if (i % 3 === 0 && i < 46) x.scale(-1, 1); x.fillText(ch, 0, 0); x.restore();
  }
  const t = new THREE.CanvasTexture(c);
  t.flipY = false; t.minFilter = THREE.LinearFilter; t.generateMipmaps = false;
  return t;
}

const GLYPH_VERT = /* glsl */`
attribute vec4 aG;
attribute float aSeed;
uniform float uTime, uOp, uPxScale, uMaxPt;
varying vec2 vCell; varying float vA; varying float vLead;
${PATH_GLSL}
void main(){
  float s = mod(aG.x - uTime * aG.w, uLt + 20.) - 10.;
  vec3 P, N, B; pathFrame(max(s, 0.), P, N, B);
  vec3 wp = P + (N * cos(aG.y) + B * sin(aG.y)) * aG.z * funnel(max(s, 0.));
  vec4 mv = modelViewMatrix * vec4(wp, 1.);
  float z = max(.1, -mv.z);
  float rate = 2. + fract(aSeed * 7.31) * 6.;
  float idx = floor(fract(sin((aSeed * 91.7 + floor(uTime * rate)) * 12.9898) * 43758.5453) * 64.);
  vCell = vec2(mod(idx, 8.), floor(idx / 8.));
  vLead = step(.93, fract(aSeed * 13.7));
  gl_PointSize = min(.5 * uPxScale / z, uMaxPt);
  vA = uOp * (1. - smoothstep(26., 52., z)) * smoothstep(.6, 2.4, z) * step(0., s);
  gl_Position = projectionMatrix * mv;
}`;
const GLYPH_FRAG = /* glsl */`
uniform sampler2D tAtlas;
varying vec2 vCell; varying float vA; varying float vLead;
void main(){
  float a = texture2D(tAtlas, (vCell + gl_PointCoord) / 8.).r;
  vec3 c = mix(vec3(.4, .95, .7), vec3(.92, 1., .95), vLead);
  gl_FragColor = vec4(c * a * vA * (1.2 + vLead * 1.6), 1.);
}`;

// Trillium: petals fold up into a bud and open as the camera approaches.
const TRI_VERT = /* glsl */`
attribute vec4 aPet; attribute vec3 aCol; attribute float aSize; attribute float aHash; attribute vec3 aScat;
uniform float uTime, uPxScale, uOp, uAsm, uBloom, uMaxPt, uObjScale;
varying vec3 vColor;
void main(){
  float type = aPet.x, A = aPet.y, u = aPet.z, v = aPet.w;
  vec3 dir = vec3(cos(A), sin(A), 0.), perp = vec3(-sin(A), cos(A), 0.), up = vec3(0., 0., 1.);
  vec3 p;
  if (type < .5) {
    float f = (1. - uBloom) * 1.25;
    p = (dir * cos(f) + up * sin(f)) * u * .78 + perp * v * (.35 + .65 * uBloom) + up * u * u * .3 * uBloom;
  } else if (type < 1.5) {
    float f = (1. - uBloom) * .6;
    p = (dir * cos(f) - up * sin(f) * .3) * u * 1.05 + perp * v - up * u * .18;
  } else { p = vec3(A, u, v); }
  float ua = clamp(uAsm * 1.3 - aHash * .3, 0., 1.); ua = ua * ua * (3. - 2. * ua);
  p = mix(aScat, p, ua);
  vec4 mv = modelViewMatrix * vec4(p, 1.);
  float z = max(.1, -mv.z);
  gl_PointSize = min(aSize * uObjScale * 1.15 * (.82 + .36 * sin(uTime * 2.3 + aHash * 6.28)) * uPxScale / z, uMaxPt);
  vColor = aCol * 1.55 * uOp * (1. - smoothstep(30., 60., z)) * smoothstep(.4, 1.5, z);
  gl_Position = projectionMatrix * mv;
}`;
const SPRITE_FRAG = /* glsl */`
varying vec3 vColor;
void main(){
  float d = length(gl_PointCoord - .5) * 2.;
  if (d > 1.) discard;
  gl_FragColor = vec4(vColor * (pow(1. - d, 2.4) * .8 + smoothstep(.42, 0., d) * 1.7), 1.);
}`;

const SHOCK_VERT = /* glsl */`
attribute vec2 aR;
uniform float uAge, uPxScale, uMaxPt;
varying vec3 vColor;
void main(){
  float r = uAge * 13. * (1. + aR.y * .08) + aR.y * .2;
  vec3 p = vec3(cos(aR.x) * r, sin(aR.x) * r, 0.);
  vec4 mv = modelViewMatrix * vec4(p, 1.);
  float z = max(.1, -mv.z);
  gl_PointSize = min(.07 * uPxScale / z, uMaxPt);
  float life = clamp(1. - uAge / 1.5, 0., 1.);
  vColor = mix(vec3(.6, 1., .85), vec3(1., .85, .55), aR.y) * life * life * 1.8 * step(.001, uAge);
  gl_Position = projectionMatrix * mv;
}`;

function additive(vertexShader, fragmentShader, uniforms) {
  return new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending });
}

function trilliumGeo(R) {
  const N = 3200, pet = new Float32Array(N * 4), col = new Float32Array(N * 3), size = new Float32Array(N), hash = new Float32Array(N), scat = new Float32Array(N * 3);
  let k = 0;
  const put = (t, a, u, v, c, s) => { if (k >= N) return; pet.set([t, a, u, v], k * 4); col.set(c, k * 3); size[k] = s; hash[k] = R(); k++; };
  for (let i = 0; i < 3; i++) {
    const A = i * 2.0944 + 0.5236;
    for (let j = 0; j < 680; j++) {
      const u = 0.08 + 0.92 * R(), w = 0.3 * Math.sin(Math.PI * Math.pow(u, 0.85)), vv = 0.78 + R() * 0.22;
      put(0, A, u, (R() * 2 - 1) * w, [0.9 * vv, 0.94 * vv, vv], 0.09 + R() * 0.07);
    }
    for (let j = 0; j < 340; j++) {
      const u = 0.1 + 0.9 * R(), w = 0.2 * Math.sin(Math.PI * Math.pow(u, 0.9)), vv = 0.6 + R() * 0.3;
      put(1, A + 1.0472, u, (R() * 2 - 1) * w, [0.3 * vv, 0.85 * vv, 0.55 * vv], 0.08 + R() * 0.06);
    }
  }
  while (k < N) { const a = R() * 6.283, r = R() * 0.09; put(2, Math.cos(a) * r, Math.sin(a) * r, (R() - 0.5) * 0.06, [1, 0.85, 0.45], 0.1 + R() * 0.06); }
  for (let i = 0; i < N; i++) {
    const el = Math.acos(2 * R() - 1), az = Math.PI * 2 * R(), rr = 4 + R() * 3;
    scat[i * 3] = rr * Math.sin(el) * Math.cos(az); scat[i * 3 + 1] = rr * Math.sin(el) * Math.sin(az); scat[i * 3 + 2] = rr * Math.cos(el);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
  g.setAttribute('aPet', new THREE.BufferAttribute(pet, 4));
  g.setAttribute('aCol', new THREE.BufferAttribute(col, 3));
  g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  g.setAttribute('aHash', new THREE.BufferAttribute(hash, 1));
  g.setAttribute('aScat', new THREE.BufferAttribute(scat, 3));
  return g;
}

export class TunnelFX {
  constructor(R, nGlyphs, eye) {
    // glyph rain
    const gp = new Float32Array(nGlyphs * 3), ga = new Float32Array(nGlyphs * 4), gs = new Float32Array(nGlyphs);
    for (let i = 0; i < nGlyphs; i++) {
      ga[i * 4] = R() * (TUN.L + 20); ga[i * 4 + 1] = R() * 6.2832; ga[i * 4 + 2] = 1.7 + R() * 2.3; ga[i * 4 + 3] = 5 + R() * 9;
      gs[i] = R();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(gp, 3));
    g.setAttribute('aG', new THREE.BufferAttribute(ga, 4));
    g.setAttribute('aSeed', new THREE.BufferAttribute(gs, 1));
    this.glyphU = { uTime: { value: 0 }, uOp: { value: 0 }, uPxScale: { value: 100 }, uMaxPt: { value: 64 }, tAtlas: { value: glyphAtlas() }, uEye: { value: eye.clone() }, uLt: { value: TUN.L } };
    this.glyphs = new THREE.Points(g, additive(GLYPH_VERT, GLYPH_FRAG, this.glyphU));
    this.glyphs.frustumCulled = false; this.glyphs.renderOrder = 20;

    // trilliums
    const tg = trilliumGeo(R);
    this.trills = [
      { s: 0.27, a0: 0.6, spin: 1.1, ph: 0 },
      { s: 0.52, a0: 3.3, spin: -0.9, ph: 2.1 },
      { s: 0.77, a0: 5.2, spin: 1.3, ph: 4.2 },
    ].map((cfg) => {
      const u = { uTime: { value: 0 }, uPxScale: { value: 100 }, uOp: { value: 0 }, uAsm: { value: 0 }, uBloom: { value: 0 }, uMaxPt: { value: 64 }, uObjScale: { value: 2.1 } };
      const o = new THREE.Points(tg, additive(TRI_VERT, SPRITE_FRAG, u));
      o.frustumCulled = false; o.renderOrder = 21; o.scale.setScalar(2.1);
      return { ...cfg, o, u };
    });

    // vault shockwave
    const NS = 2400, sr = new Float32Array(NS * 2);
    for (let i = 0; i < NS; i++) { sr[i * 2] = R() * 6.2832; sr[i * 2 + 1] = R(); }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(NS * 3), 3));
    sg.setAttribute('aR', new THREE.BufferAttribute(sr, 2));
    this.shockU = { uAge: { value: 0 }, uPxScale: { value: 100 }, uMaxPt: { value: 64 } };
    this.shock = new THREE.Points(sg, additive(SHOCK_VERT, SPRITE_FRAG, this.shockU));
    this.shock.frustumCulled = false; this.shock.renderOrder = 30;
  }

  addTo(scene) { scene.add(this.glyphs, this.shock); for (const t of this.trills) scene.add(t.o); }
  setGlyphs(n) { this.glyphs.geometry.setDrawRange(0, n); }

  setScale(pxScale, maxPt) {
    this.glyphU.uPxScale.value = pxScale; this.glyphU.uMaxPt.value = maxPt;
    this.shockU.uPxScale.value = pxScale; this.shockU.uMaxPt.value = maxPt;
    for (const t of this.trills) { t.u.uPxScale.value = pxScale; t.u.uMaxPt.value = maxPt; }
  }
}
