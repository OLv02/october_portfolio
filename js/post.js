// Post-processing: the difference between "digital" and "dreamlike".
// Bloom (dual-filter, cheap enough for phones), sun streak + flares, speed zoom-blur with
// spectral fringing, shockwave ripple, act-by-act colour grade, vignette, film grain.
import * as THREE from './vendor/three.module.min.js';

const VS = /* glsl */`varying vec2 vUv; void main(){ vUv = position.xy * .5 + .5; gl_Position = vec4(position.xy, 0., 1.); }`;

const PREFILTER = /* glsl */`
uniform sampler2D tSrc; uniform vec2 uTexel; uniform float uThreshold, uKnee;
varying vec2 vUv;
void main(){
  vec3 c = (texture2D(tSrc, vUv + uTexel * vec2(-1., -1.)).rgb + texture2D(tSrc, vUv + uTexel * vec2(1., -1.)).rgb
          + texture2D(tSrc, vUv + uTexel * vec2(-1., 1.)).rgb + texture2D(tSrc, vUv + uTexel * vec2(1., 1.)).rgb) * .25;
  float br = max(c.r, max(c.g, c.b));
  float soft = clamp(br - uThreshold + uKnee, 0., 2. * uKnee);
  soft = soft * soft / (4. * uKnee + 1e-4);
  c *= max(soft, br - uThreshold) / max(br, 1e-4);
  gl_FragColor = vec4(c, 1.);
}`;
const DOWN = /* glsl */`
uniform sampler2D tSrc; uniform vec2 uTexel;
varying vec2 vUv;
void main(){
  vec2 h = uTexel * .5;
  vec3 s = texture2D(tSrc, vUv).rgb * 4.;
  s += texture2D(tSrc, vUv - h).rgb + texture2D(tSrc, vUv + h).rgb;
  s += texture2D(tSrc, vUv + vec2(h.x, -h.y)).rgb + texture2D(tSrc, vUv - vec2(h.x, -h.y)).rgb;
  gl_FragColor = vec4(s / 8., 1.);
}`;
const UP = /* glsl */`
uniform sampler2D tSrc, tAdd; uniform vec2 uTexel;
varying vec2 vUv;
void main(){
  vec2 h = uTexel * .5;
  vec3 s = texture2D(tSrc, vUv + vec2(-h.x * 2., 0.)).rgb + texture2D(tSrc, vUv + vec2(-h.x, h.y)).rgb * 2.
         + texture2D(tSrc, vUv + vec2(0., h.y * 2.)).rgb + texture2D(tSrc, vUv + vec2(h.x, h.y)).rgb * 2.
         + texture2D(tSrc, vUv + vec2(h.x * 2., 0.)).rgb + texture2D(tSrc, vUv + vec2(h.x, -h.y)).rgb * 2.
         + texture2D(tSrc, vUv + vec2(0., -h.y * 2.)).rgb + texture2D(tSrc, vUv + vec2(-h.x, -h.y)).rgb * 2.;
  gl_FragColor = vec4(s / 12. + texture2D(tAdd, vUv).rgb, 1.);
}`;

const COMPOSITE = /* glsl */`
uniform sampler2D tScene, tBloom;
uniform vec2 uRes; uniform float uTime;
uniform float uBloom, uExposure, uZoom, uCA, uVig, uGrain, uWhite, uFlash;
uniform vec3 uSun;   // screen uv xy, intensity
uniform vec4 uRip;   // screen uv xy, radius, strength
uniform vec3 uGain, uLift; uniform float uSat;
uniform int uTaps;
varying vec2 vUv;
float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main(){
  vec2 asp = vec2(uRes.x / uRes.y, 1.);
  vec2 uv = vUv;
  if (uRip.w > .001) {
    vec2 d = (uv - uRip.xy) * asp; float r = length(d);
    float k = exp(-pow((r - uRip.z) / .045, 2.)) * uRip.w;
    uv -= normalize(d + 1e-5) / asp * k * .035;
  }
  vec2 c = vec2(.5), dir = uv - c;
  vec3 col;
  if (uZoom > .002 && uTaps > 0) {
    vec3 acc = vec3(0.), wsum = vec3(0.);
    for (int i = 0; i < 12; i++) {
      if (i >= uTaps) break;
      float f = float(i) / float(uTaps);
      vec3 w = vec3(1. - f * .9, 1. - abs(f - .5), .15 + f * .85);
      acc += texture2D(tScene, c + dir * (1. - uZoom * f)).rgb * w; wsum += w;
    }
    col = acc / wsum;
  } else if (uCA > .0005) {
    vec2 o = dir * uCA;
    col = vec3(texture2D(tScene, uv + o).r, texture2D(tScene, uv).g, texture2D(tScene, uv - o).b);
  } else {
    col = texture2D(tScene, uv).rgb;
  }
  col += texture2D(tBloom, uv).rgb * uBloom;

  if (uSun.z > .001) {
    vec2 sd = (vUv - uSun.xy) * asp;
    float streak = exp(-abs(sd.y) * 90.) * exp(-abs(sd.x) * 1.6);
    float glow = .06 / (1. + dot(sd, sd) * 40.);
    col += vec3(.55, .75, 1.) * streak * uSun.z * .55 + vec3(1., .7, .4) * glow * uSun.z;
    vec2 axis = c - uSun.xy;
    for (int i = 0; i < 3; i++) {
      float k = .55 + float(i) * .55;
      vec2 gp = (vUv - (uSun.xy + axis * k)) * asp;
      float g = smoothstep(.07 + float(i) * .03, 0., length(gp));
      col += mix(vec3(.4, .9, .8), vec3(.8, .5, 1.), float(i) * .5) * g * .07 * uSun.z;
    }
  }

  vec2 vd = (vUv - .5) * asp;
  float wr = length(vd);
  col *= uExposure * (1. + uFlash) * (1. + uWhite * 6.);
  col = 1. - exp(-col);
  col = col * uGain + uLift * (1. - col);
  float l = dot(col, vec3(.299, .587, .114));
  col = mix(vec3(l), col, uSat);
  col *= 1. - uVig * (1. - uWhite) * smoothstep(.35, 1.15, wr);
  // flying through the sun: light floods outward from the centre, warm at the core
  float wm = smoothstep(0., .45, uWhite * 1.7 - wr);
  col = mix(col, mix(vec3(1., .93, .8), vec3(1., .98, .95), wm), wm);
  col += (hash(vUv * uRes + fract(uTime) * 91.7) - .5) * uGrain;
  gl_FragColor = vec4(col, 1.);
}`;

export class Post {
  constructor(renderer, hdrType) {
    this.r = renderer;
    this.type = hdrType;
    this.hdr = hdrType !== THREE.UnsignedByteType;
    this.scene = new THREE.Scene();
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
    this.quad = new THREE.Mesh(g);
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);
    const m = (fs, u) => new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: fs, uniforms: u, depthTest: false, depthWrite: false });
    this.mPre = m(PREFILTER, { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() }, uThreshold: { value: this.hdr ? 0.85 : 0.62 }, uKnee: { value: 0.35 } });
    this.mDown = m(DOWN, { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() } });
    this.mUp = m(UP, { tSrc: { value: null }, tAdd: { value: null }, uTexel: { value: new THREE.Vector2() } });
    this.u = {
      tScene: { value: null }, tBloom: { value: null }, uRes: { value: new THREE.Vector2() }, uTime: { value: 0 },
      uBloom: { value: 0.9 }, uExposure: { value: this.hdr ? 1.25 : 2.1 }, uZoom: { value: 0 }, uCA: { value: 0 },
      uVig: { value: 0.32 }, uGrain: { value: 0.035 }, uWhite: { value: 0 }, uFlash: { value: 0 },
      uSun: { value: new THREE.Vector3() }, uRip: { value: new THREE.Vector4() },
      uGain: { value: new THREE.Vector3(1, 1, 1) }, uLift: { value: new THREE.Vector3() }, uSat: { value: 1 }, uTaps: { value: 6 },
    };
    this.mComp = m(COMPOSITE, this.u);
    this.levels = 4;
    this.down = []; this.up = [];
  }

  rt(w, h) {
    return new THREE.WebGLRenderTarget(Math.max(1, w), Math.max(1, h), { type: this.type, depthBuffer: false, generateMipmaps: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
  }

  setSize(w, h, levels) {
    this.w = w; this.h = h; this.levels = levels;
    for (const t of [this.sceneRT, ...this.down, ...this.up]) t && t.dispose();
    this.sceneRT = this.rt(w, h);
    this.down = []; this.up = [];
    let bw = w >> 1, bh = h >> 1;
    for (let i = 0; i < levels; i++) {
      this.down.push(this.rt(bw, bh));
      if (i < levels - 1) this.up.push(this.rt(bw, bh));
      bw = Math.max(1, bw >> 1); bh = Math.max(1, bh >> 1);
    }
    this.u.uRes.value.set(w, h);
  }

  pass(mat, target) {
    this.quad.material = mat;
    this.r.setRenderTarget(target);
    this.r.render(this.scene, this.cam);
  }

  render(scene, camera) {
    const r = this.r;
    r.setRenderTarget(this.sceneRT); r.clear(); r.render(scene, camera);

    this.mPre.uniforms.tSrc.value = this.sceneRT.texture;
    this.mPre.uniforms.uTexel.value.set(1 / this.w, 1 / this.h);
    this.pass(this.mPre, this.down[0]);
    for (let i = 1; i < this.levels; i++) {
      const s = this.down[i - 1];
      this.mDown.uniforms.tSrc.value = s.texture; this.mDown.uniforms.uTexel.value.set(1 / s.width, 1 / s.height);
      this.pass(this.mDown, this.down[i]);
    }
    let src = this.down[this.levels - 1];
    for (let i = this.levels - 2; i >= 0; i--) {
      this.mUp.uniforms.tSrc.value = src.texture; this.mUp.uniforms.tAdd.value = this.down[i].texture;
      this.mUp.uniforms.uTexel.value.set(1 / src.width, 1 / src.height);
      this.pass(this.mUp, this.up[i]);
      src = this.up[i];
    }
    this.u.tScene.value = this.sceneRT.texture;
    this.u.tBloom.value = src.texture;
    this.pass(this.mComp, null);
  }
}
