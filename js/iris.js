// The iris: a disc of starlight that kindles inside your eye as the camera dives in,
// then opens like an aperture, with the tunnel waiting behind the pupil.
import * as THREE from './vendor/three.module.min.js';

const VERT = /* glsl */`
attribute vec4 aIr;   // radius (pupil edge .37 → limbus 1), angle, kind, hash
uniform float uTime, uDil, uOp, uPxScale, uMaxPt, uRad;
varying vec3 vColor;
void main(){
  float r = aIr.x, kind = aIr.z, h = aIr.w;
  float th = aIr.y + uTime * (.04 + h * .02);
  float pr = mix(.37, 1.9, pow(uDil, 1.4));
  float outer = max(1., pr + .63) + uDil * uDil * 2.6;
  float rr = r <= 1. ? mix(pr, outer, (r - .37) / .63) : r * outer;
  vec3 p = vec3(cos(th) * rr, sin(th) * rr, uDil * uDil * h * .9) * uRad;
  vec3 amber = vec3(1., .74, .38), teal = vec3(.36, .86, .74), violet = vec3(.55, .5, 1.);
  vec3 c; float sz;
  if (kind < .5)      { c = amber * 1.9; sz = .07; }
  else if (kind < 1.5){ c = mix(amber * 1.25, teal, smoothstep(.42, .78, r)); c = mix(c, violet, smoothstep(.82, .98, r) * .6); c *= .75 + .5 * h; sz = .05 + .03 * h; }
  else if (kind < 2.5){ c = vec3(1., .86, .55) * 1.6; sz = .06; }
  else if (kind < 3.5){ c = mix(teal, violet, .55) * .95; sz = .06; }
  else                { c = vec3(.85, .9, 1.) * .45; sz = .05; }
  vec4 mv = modelViewMatrix * vec4(p, 1.);
  float z = max(.02, -mv.z);
  gl_PointSize = min(sz * uRad * (.8 + .4 * sin(uTime * 2.7 + h * 40.)) * uPxScale / z, uMaxPt);
  vColor = c * uOp * smoothstep(.02, .12, z);
  gl_Position = projectionMatrix * mv;
}`;
const FRAG = /* glsl */`
varying vec3 vColor;
void main(){
  float d = length(gl_PointCoord - .5) * 2.;
  if (d > 1.) discard;
  gl_FragColor = vec4(vColor * (pow(1. - d, 2.4) * .8 + smoothstep(.42, 0., d) * 1.7), 1.);
}`;

export class Iris {
  constructor(R, n) {
    const a = new Float32Array(n * 4);
    const spokes = 150;
    for (let i = 0; i < n; i++) {
      const u = R();
      let r, th, kind;
      if (u < 0.12) { kind = 0; r = 0.37 + R() * 0.035; th = R() * 6.2832; }
      else if (u < 0.7) {
        kind = 1; const s = Math.floor(R() * spokes), th0 = (s / spokes) * 6.2832 + (R() - 0.5) * 0.02;
        r = 0.38 + Math.pow(R(), 0.8) * 0.56; th = th0 + Math.sin(r * 14 + s * 3) * 0.035;
      } else if (u < 0.8) { kind = 2; th = R() * 6.2832; r = 0.56 + Math.sin(th * 11) * 0.025 + (R() - 0.5) * 0.02; }
      else if (u < 0.94) { kind = 3; r = 0.93 + R() * 0.07; th = R() * 6.2832; }
      else { kind = 4; r = 1.02 + R() * 0.5; th = R() * 6.2832; }
      a.set([r, th, kind, R()], i * 4);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute('aIr', new THREE.BufferAttribute(a, 4));
    this.u = { uTime: { value: 0 }, uDil: { value: 0 }, uOp: { value: 0 }, uPxScale: { value: 100 }, uMaxPt: { value: 64 }, uRad: { value: 0.12 } };
    this.points = new THREE.Points(g, new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: this.u, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.points.frustumCulled = false;
    this.points.renderOrder = 12;
  }
}
