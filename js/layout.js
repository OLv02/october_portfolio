// Composition for any screen. Instead of fixed coordinates, every key element is given a
// target rectangle on screen and the camera is solved to put it there.
// Upright phones/tablets: globe up top, words below. Landscape: words left, globe right.
// At the end of the flight the camera comes to rest in front of the plant, framed for the same screen.
import * as THREE from './vendor/three.module.min.js';
import { GLOBE } from './globe-meta.js';

const lerp = (a, b, t) => a + (b - a) * t;
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// Solve a camera looking straight down -z so a world box lands on a target NDC rectangle.
function fit({ cx, cy, hx, hy, planeZ }, { nx, ny, nh, maxW }, fov, aspect) {
  const tH = Math.tan((fov * Math.PI) / 360);
  let d = hy / (nh * tH);
  if (hx / (d * tH * aspect) > maxW) d = hx / (maxW * tH * aspect);
  const pos = new THREE.Vector3(cx - nx * d * tH * aspect, cy - ny * d * tH, planeZ + d);
  return { pos, target: new THREE.Vector3(pos.x, pos.y, planeZ), dist: d };
}

export function computeLayout(w, h, S0, vault, measured = {}, landing = {}) {
  const aspect = w / h;
  const t = sm(0.8, 1.3, aspect);                 // 0 = upright, 1 = landscape
  const phoneLand = aspect > 1.3 && h < 520;      // phone on its side: short and wide
  const fov = lerp(56, 50, t);
  const tH = Math.tan((fov * Math.PI) / 360);

  // the box that must always be fully in frame (the globe, solved at the depth of its rim)
  const [fx, fy, fhx, fhy] = GLOBE.frame;
  const rimZ = -Math.sqrt(Math.max(0, GLOBE.globe ** 2 - GLOBE.eye[0] ** 2 - GLOBE.eye[1] ** 2)) * S0;
  const face = { cx: fx * S0, cy: fy * S0, hx: fhx * S0, hy: fhy * S0, planeZ: rimZ };
  const heroTarget = {
    nx: lerp(0.06, phoneLand ? 0.46 : 0.4, t),
    ny: lerp(0.36, phoneLand ? 0.0 : 0.06, t),
    nh: lerp(0.27, phoneLand ? 0.62 : 0.5, t),
    maxW: lerp(0.84, 0.5, t),
  };
  // upright screens: fit the face into the real space between the top bar and the name block
  if (measured.textTop && t < 0.999) {
    const top = measured.headerBottom || 64, bot = measured.textTop - 18;
    const nhU = Math.min(0.34, Math.max(0.16, ((bot - top) / h) * 0.9));
    const nyU = 1 - (top + bot) / h;
    heroTarget.nh = lerp(nhU, heroTarget.nh, t);
    heroTarget.ny = lerp(nyU, heroTarget.ny, t);
  }
  const hero = fit(face, heroTarget, fov, aspect);

  // the landing: solved the way the light/landing study frames it. The plant (soil to flower = plantScale) takes 43% of
  // the view's height, or 64% of its width on narrow screens; the soil line sits 16% below centre; on wide screens
  // the plant stands right of centre, leaving the left for the words. The camera looks straight down -z at the plant.
  const ls = landing.scale || 3.6;
  const fieldH = Math.max(ls / 0.43, ls / (0.64 * aspect)), fieldW = fieldH * aspect;
  const plantX = w > 650 ? fieldW * (landing.right ?? 0.18) : 0, groundY = -fieldH * 0.16;
  const origin = new THREE.Vector3(vault.x - plantX, vault.y - groundY, vault.z);
  const d = fieldH / (2 * tH);
  const land = { pos: new THREE.Vector3(origin.x, origin.y, origin.z + d), target: origin.clone(), origin, dist: d, fieldW, fieldH, plantX, groundY, scale: ls };

  return { aspect, t, fov, hero, land, upright: t < 0.5 };
}
