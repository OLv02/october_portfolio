// The flight path through the tunnel. The same curve exists twice, once in JS
// (camera) and once in GLSL (tunnel particles), so the two can never drift apart.
import * as THREE from './vendor/three.module.min.js';

export const TUN = {
  L: 150,        // tunnel length in world units
  sunGap: 16,    // sun sits this far past the tunnel's end
  vaultGap: 60,  // vault sits this far past the sun
  funnel: 26,    // the tunnel widens from the pupil over this distance
};

const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export function pathPos(eye, s, out = new THREE.Vector3()) {
  const L = TUN.L;
  const ramp = sm(0, 22, s) * (1 - sm(L - 35, L, s));
  return out.set(
    eye.x + (3.4 * Math.sin(s * 0.042) + 1.3 * Math.sin(s * 0.105 + 1.1)) * ramp,
    eye.y + (2.1 * Math.sin(s * 0.057 + 0.6) + 0.8 * Math.sin(s * 0.13 + 2.3)) * ramp,
    eye.z - s,
  );
}

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3();
// Bank angle from the path's sideways acceleration: the camera leans into turns.
export function pathBank(eye, s) {
  pathPos(eye, s - 2, _a); pathPos(eye, s, _b); pathPos(eye, s + 2, _c);
  const ax = (_a.x - 2 * _b.x + _c.x) / 4;
  return Math.max(-0.55, Math.min(0.55, -ax * 22));
}

export const PATH_GLSL = /* glsl */`
uniform vec3 uEye;
uniform float uLt;
vec3 pathPos(float s){
  float ramp = smoothstep(0., 22., s) * (1. - smoothstep(uLt - 35., uLt, s));
  return uEye + vec3((3.4*sin(s*.042) + 1.3*sin(s*.105 + 1.1)) * ramp,
                     (2.1*sin(s*.057 + .6) + .8*sin(s*.13 + 2.3)) * ramp,
                     -s);
}
void pathFrame(float s, out vec3 P, out vec3 N, out vec3 B){
  P = pathPos(s);
  vec3 T = normalize(pathPos(s + .6) - pathPos(s - .6));
  N = normalize(cross(T, vec3(0., 1., 0.)));
  B = cross(N, T);
}
float funnel(float s){ return mix(.45, 1., smoothstep(0., ${TUN.funnel.toFixed(1)}, s)); }
`;
