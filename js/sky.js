// The forest air behind everything: a dark green ground with a soft canopy glow up and to the right, a cooler pool
// low on the left, and slow dappled light (a noise texture baked once). Plus drifting pollen motes for depth.
// The gradient is written in screen colours, then un-tonemapped so it lands on those colours after post.js.
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
}`;

// tileable dappled-canopy noise: sampled on a torus so the texture repeats seamlessly
const BAKE_FRAG = /* glsl */`
varying vec2 vUv;
${NOISE}
void main(){
  vec2 a = vUv * 6.2831853;
  vec4 t = vec4(cos(a.x), sin(a.x), cos(a.y), sin(a.y));
  float n = 0., amp = .5;
  for (int i = 0; i < 5; i++) {
    float f = pow(2., float(i));
    n += amp * snoise(vec3(t.x * f + t.z * .7 * f, t.y * f + t.w * .7 * f, (t.z + t.w) * f * .9 + float(i) * 3.1));
    amp *= .5;
  }
  gl_FragColor = vec4(vec3(.5 + .5 * n), 1.);
}`;

const BG_VERT = /* glsl */`varying vec2 vUv; void main(){ vUv = position.xy * .5 + .5; gl_Position = vec4(position.xy, .999, 1.); }`;
const BG_FRAG = /* glsl */`
uniform sampler2D tNoise;
uniform vec3 uBase, uGlow, uPool, uTint;
uniform float uExposure, uBright, uTime, uAspect;
uniform vec2 uLook;
varying vec2 vUv;
vec3 untone(vec3 c){ return -log(max(vec3(1e-4), 1. - c)) / uExposure; }
void main(){
  vec2 p = vec2(vUv.x * uAspect, vUv.y);
  vec2 g = (vUv - vec2(.8, .9)) * vec2(uAspect, 1.) / vec2(max(uAspect, 1.), 1.);
  vec2 l = (vUv - vec2(.05, .1)) * vec2(uAspect, 1.) / vec2(max(uAspect, 1.), 1.);
  vec3 c = uBase;
  c = mix(c, uGlow, (1. - smoothstep(0., .62, length(g))) * .85);
  c = mix(c, uPool, (1. - smoothstep(0., .7, length(l))) * .7);
  // dappled light drifting through the canopy, strongest under the glow
  vec2 uv = p * .55 + uLook * .08 + vec2(uTime * .004, uTime * .0015);
  float n = texture2D(tNoise, uv).r * .65 + texture2D(tNoise, uv * 2.3 + .37).r * .35;
  float dapple = smoothstep(.48, .78, n) * (.35 + .65 * (1. - smoothstep(0., .9, length(g))));
  c *= 1. + dapple * .22;
  float dither = (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - .5) / 255.;
  gl_FragColor = vec4(untone(clamp(c * uTint * uBright, 0., .98)) + dither, 1.);
}`;

const DUST_VERT = /* glsl */`
attribute vec4 aDust;
uniform vec3 uCam; uniform float uTime, uPxScale, uOp;
varying vec3 vColor;
void main(){
  vec3 size = vec3(36., 22., 70.);
  vec3 p = uCam + mod(position - uCam + size * .5 - vec3(uTime * .25, 0., 0.), size) - size * .5;
  p.y += sin(uTime * .2 + aDust.y * 30.) * .25;
  p.x += sin(uTime * .13 + aDust.x * 20.) * .3;
  vec4 mv = viewMatrix * vec4(p, 1.);
  float z = max(.1, -mv.z);
  vec3 rel = (p - uCam) / (size * .5);
  float edge = 1. - smoothstep(.65, 1., max(abs(rel.x), max(abs(rel.y), abs(rel.z))));
  gl_PointSize = min((.03 + .04 * aDust.x) * uPxScale / z, 14.);
  vec3 c = aDust.y < .6 ? vec3(.92, .88, .7) : vec3(.62, .72, .55);
  vColor = c * (.07 + .12 * aDust.x) * edge * smoothstep(.6, 2.5, z) * uOp;
  gl_Position = projectionMatrix * mv;
}`;

const SPRITE_FRAG = /* glsl */`
varying vec3 vColor;
void main(){
  float d = length(gl_PointCoord - .5) * 2.;
  if (d > 1.) discard;
  gl_FragColor = vec4(vColor * (pow(1. - d, 2.) * .9 + smoothstep(.5, 0., d) * .8), 1.);
}`;

const hex3 = (h) => [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255];

export class Sky {
  // palette: { base, glow, pool } as 0xRRGGBB screen colours; exposure: post.js exposure, so the gradient lands on them
  constructor(renderer, tier, hdrType, R, palette, exposure) {
    this.group = new THREE.Group();

    const S = 256;
    this.rt = new THREE.WebGLRenderTarget(S, S, { type: THREE.UnsignedByteType, depthBuffer: false, generateMipmaps: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping });
    const bakeScene = new THREE.Scene(), bakeCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const tri = new THREE.BufferGeometry();
    tri.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
    const bakeMat = new THREE.ShaderMaterial({ vertexShader: `varying vec2 vUv; void main(){ vUv = position.xy * .5 + .5; gl_Position = vec4(position.xy, 0., 1.); }`, fragmentShader: BAKE_FRAG, depthTest: false, depthWrite: false });
    const q = new THREE.Mesh(tri, bakeMat); q.frustumCulled = false; bakeScene.add(q);
    renderer.setRenderTarget(this.rt); renderer.render(bakeScene, bakeCam); renderer.setRenderTarget(null);
    bakeMat.dispose();

    this.bgU = {
      tNoise: { value: this.rt.texture }, uBase: { value: new THREE.Vector3(...hex3(palette.base)) }, uGlow: { value: new THREE.Vector3(...hex3(palette.glow)) },
      uPool: { value: new THREE.Vector3(...hex3(palette.pool)) }, uTint: { value: new THREE.Vector3(1, 1, 1) },
      uExposure: { value: exposure }, uBright: { value: 1 }, uTime: { value: 0 }, uAspect: { value: 1 }, uLook: { value: new THREE.Vector2() },
    };
    const bgTri = new THREE.BufferGeometry();
    bgTri.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
    this.bg = new THREE.Mesh(bgTri, new THREE.ShaderMaterial({ vertexShader: BG_VERT, fragmentShader: BG_FRAG, uniforms: this.bgU, depthTest: false, depthWrite: false }));
    this.bg.renderOrder = -100; this.bg.frustumCulled = false;
    this.group.add(this.bg);

    // pollen motes: wrap around the camera so there is always some to drift through
    const ND = tier.dust, dp = new Float32Array(ND * 3), da = new Float32Array(ND * 4);
    for (let i = 0; i < ND; i++) {
      dp[i * 3] = (R() - 0.5) * 36; dp[i * 3 + 1] = (R() - 0.5) * 22; dp[i * 3 + 2] = (R() - 0.5) * 70;
      da[i * 4] = R(); da[i * 4 + 1] = R();
    }
    const dg = new THREE.BufferGeometry();
    dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
    dg.setAttribute('aDust', new THREE.BufferAttribute(da, 4));
    this.dustU = { uCam: { value: new THREE.Vector3() }, uTime: { value: 0 }, uPxScale: { value: 100 }, uOp: { value: 1 } };
    this.dust = new THREE.Points(dg, new THREE.ShaderMaterial({ vertexShader: DUST_VERT, fragmentShader: SPRITE_FRAG, uniforms: this.dustU, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.dust.renderOrder = -80; this.dust.frustumCulled = false;
    this._d = new THREE.Vector3();
  }

  addTo(scene) { scene.add(this.group, this.dust); }

  setDust(n) { this.dust.geometry.setDrawRange(0, n); }

  update(camera, t, dt, look) {
    this.bgU.uTime.value = t; this.bgU.uAspect.value = camera.aspect;
    this.bgU.uTint.value.copy(look.tint); this.bgU.uBright.value = look.sky;
    camera.getWorldDirection(this._d);
    this.bgU.uLook.value.set(Math.atan2(this._d.x, -this._d.z), this._d.y);
    this.dustU.uCam.value.copy(camera.position); this.dustU.uTime.value = t; this.dustU.uOp.value = look.dust;
  }

  setScale(dpr, pxScale) { this.dustU.uPxScale.value = pxScale; }
}
