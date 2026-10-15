// Composition for any screen. Instead of fixed coordinates, every key element is given a
// target rectangle on screen and the camera is solved to put it there.
// Upright phones/tablets: globe up top, words below. Landscape: words left, globe right.
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

export function computeLayout(w, h, S0, vault, measured = {}) {
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

  // laptop: lower-left of the face, where your gaze lands
  const laptop = {
    pos: new THREE.Vector3(lerp(-0.86, -1.02, t) * S0, lerp(-1.0, -1.12, t) * S0, 0.5),
    rot: new THREE.Euler(0.32, 0.85, 0, 'YXZ'),
    scale: lerp(1.0, 1.1, t),
  };

  // the little solar system on the landing screen, kept off your name
  const solarDepth = -7;
  const sd = hero.dist - solarDepth;
  const sN = { nx: lerp(-0.64, -0.1, t), ny: lerp(0.83, 0.74, t) };
  const solarHero = {
    pos: new THREE.Vector3(hero.pos.x + sN.nx * sd * tH * aspect, hero.pos.y + sN.ny * sd * tH, solarDepth),
    scale: (lerp(0.09, 0.16, t) * sd * tH * Math.min(1, aspect * 1.6)) / 4.05,
  };

  // the gadgets float in the empty corners around you: a screen spot (nx, ny), a depth, and a size as a share of
  // the screen's half-height. Upright screens and landscape ones each get their own spots.
  const spot = (u, l, rot) => {
    const nx = lerp(u[0], l[0], t), ny = lerp(u[1], l[1], t), z = lerp(u[2], l[2], t), size = lerp(u[3], l[3], t);
    const dz = hero.pos.z - z;
    return { pos: new THREE.Vector3(hero.pos.x + nx * dz * tH * aspect, hero.pos.y + ny * dz * tH, z), world: size * dz * tH, rot };
  };
  // Upright: the car takes the wide spot above your head, the glasses and the Pocket 3 the two narrow strips beside it.
  const gadgets = {
    car: spot([0.0, 0.77, 0.4, 0.17], phoneLand ? [-0.56, 0.6, 0.4, 0.19] : [-0.6, 0.68, 0.4, 0.17], new THREE.Euler(0.2, -1.15, 0.0)),
    drone: spot([0.6, 0.62, -1.0, 0.16], phoneLand ? [0.74, 0.58, -1.5, 0.22] : [0.74, 0.68, -1.5, 0.2], new THREE.Euler(0.85, -0.55, 0.1)),
    glasses: spot([0.72, 0.27, 0.6, 0.09], phoneLand ? [0.16, 0.7, 0.2, 0.15] : [0.16, 0.74, 0.2, 0.14], new THREE.Euler(0.14, 0.62, 0.05)),
    pocket: spot([-0.68, 0.48, 0.6, 0.15], phoneLand ? [-0.6, -0.6, 0.6, 0.28] : [-0.62, -0.62, 0.6, 0.3], new THREE.Euler(0.06, 0.22, -0.08)),
  };

  // the vault, centred for the key ceremony; once it opens the page scrolls over it
  const box = { cx: vault.x, cy: vault.y + 0.5, hx: 1.9, hy: 2.7, planeZ: vault.z };
  const vaultCentered = fit(box, { nx: 0, ny: lerp(0.04, -0.02, t), nh: lerp(0.44, 0.68, t), maxW: lerp(0.92, 0.86, t) }, fov, aspect);

  return { aspect, t, fov, hero, laptop, solarHero, gadgets, vaultCentered, upright: t < 0.5 };
}
