// The section companions: seed-made objects beside their sections' headings (Work: the Little bridge, Highlights: the
// spotlit seedling, Leadership: the compass, Writing: the quill, Education: the fern). Ported from the Windborne proof's
// section objects.
//
// They are built from the real background seeds. Two thirds of the main system's seeds are builders, in two halves
// (aComp in particles.js), so one section's object can still be on screen while the next one forms. Each object is
// framed on its section's .companion-slot element (a stage placed by style.css). As the stage comes up the screen the
// half's builders leave the wind for their spots, nearest first, riding the wind in; as it scrolls away at the top
// they go back to the wind. A half switches to another object only while none of its builders is away from the wind,
// so no seed ever jumps. The shader side is js/companion-shader.js.
import * as THREE from './vendor/three.module.min.js';
import { POINTS_PER_SEED } from './particles.js';
import { COMPANIONS } from './companion-data.js';

// The seedling's canopy light: one soft beam plane with a pool of light on the moss.
function createCanopyLight(u) {
  const material = new THREE.ShaderMaterial({
    uniforms: u, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `varying vec2 vLocal; void main(){ vLocal = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: `varying vec2 vLocal; uniform float uProgress, uStrength;
      void main(){
        float t = (1.12 - vLocal.y) / 1.54;
        float centre = -.72 + .74 * t, width = .035 + .485 * clamp(t, 0., 1.);
        float feather = 1. - smoothstep(.50, 1.20, abs(vLocal.x - centre) / width);
        float ends = smoothstep(0., .13, t) * (1. - smoothstep(.85, 1.05, t));
        float broken = .72 + .18 * sin(vLocal.x * 37. + vLocal.y * 13.) + .1 * sin(vLocal.x * 63. - vLocal.y * 8.);
        vec2 ground = (vLocal - vec2(.02, -.435)) / vec2(.55, .075);
        float a = (feather * ends * broken * .18 + exp(-dot(ground, ground) * 2.) * .32) * uStrength * smoothstep(.25, .92, uProgress);
        gl_FragColor = vec4(vec3(1., .91, .65), a);
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 2.8), material);
  mesh.renderOrder = 9; mesh.frustumCulled = false;
  return mesh;
}

export function createCompanions(main) {
  const g = main.geometry, kg = main.kids.geometry, K = POINTS_PER_SEED, comp = g.attributes.aComp.array;
  // each half's builders, in seed order, so any drawn prefix of the seeds holds a complete prefix of the shape
  const members = [0, 1].map((h) => { const m = []; for (let i = 0; i < comp.length; i++) if (comp[i] === h + 1) m.push(i); return m; });
  const lightU = { uProgress: { value: 0 }, uStrength: { value: 0 } }, light = createCanopyLight(lightU);
  light.visible = false;
  const cache = {}, loaded = [null, null];
  const shape = (name, h) => { const key = name + h; return cache[key] || (cache[key] = COMPANIONS[name].build(members[h].length)); };
  function load(h, name) {
    const { lock, tun } = shape(name, h), m = members[h];
    for (const [geo, k] of [[g, 1], [kg, K]]) {
      const L = geo.attributes.aObjLock.array, Tn = geo.attributes.aObjTun.array;
      for (let j = 0; j < m.length; j++) for (let c = 0; c < k; c++) {
        L.set(lock.subarray(j * 4, j * 4 + 4), (m[j] * k + c) * 4);
        Tn.set(tun.subarray(j * 4, j * 4 + 4), (m[j] * k + c) * 4);
      }
      geo.attributes.aObjLock.needsUpdate = true; geo.attributes.aObjTun.needsUpdate = true;
    }
    loaded[h] = name;
    main.uniforms.uKind.value.setComponent(h, COMPANIONS[name].kind);
  }
  const drawnPerHalf = () => members[0].filter((i) => i < main.count).length;
  return { light, lightU, loaded, load, uniforms: main.uniforms, def: (name) => COMPANIONS[name], drawnPerHalf };
}

// The scroll side: which section each half is showing, how far its object is built, and where its stage is.
// sections: [{ name, half, slot, head }]. A section's build runs 0 → its rest pose over half a screen of scrolling while
// its stage is on screen (its centre moving from 95% to 45% of the viewport height), and runs back to 0 as the stage
// leaves at the top (its bottom from 25% to −10%), returning the builders to the wind. Reversible, no timers; it only
// moves when the reader scrolls, so reduced motion keeps it.
const _c = new THREE.Vector3();
export function updateCompanions(sys, sections, { camera, W, H, tune, on = 1 }) {
  const u = sys.uniforms, vh = innerHeight;
  // the drawn builders per half; fewer seeds than the proof's 3,600 get proportionally larger points, so the shape reads
  u.uCompDot.value = Math.min(1.9, Math.max(1, Math.sqrt(3600 / Math.max(1, sys.drawnPerHalf()))));
  const state = sections.map((s) => {
    const slot = s.slot.getBoundingClientRect(), mid = slot.top + slot.height / 2;
    const build = Math.min(1, Math.max(0, (0.95 * vh - mid) / (0.5 * vh)));
    const stay = Math.min(1, Math.max(0, (slot.bottom + 0.1 * vh) / (0.35 * vh)));
    const k = slot.width > 0 ? Math.min(build, stay) : 0;
    return { s, slot, k };
  });
  u.uCompOn.value = on;
  camera.updateMatrixWorld();
  u.uCamR.value.setFromMatrixColumn(camera.matrixWorld, 0); u.uCamU.value.setFromMatrixColumn(camera.matrixWorld, 1);
  u.uCamF.value.setFromMatrixColumn(camera.matrixWorld, 2).negate();
  const tH = Math.tan((camera.fov * Math.PI) / 360), D = 10, aspect = W / H;
  let lightOn = false;
  for (const h of [0, 1]) {
    const mine = state.filter((x) => x.s.half === h);
    let cur = mine.find((x) => x.s.name === sys.loaded[h]);
    const want = mine.reduce((a, b) => (b.k > (a ? a.k : 0) ? b : a), null);
    // switch object only while every builder of this half is back in the wind
    if (want && want.k > 0 && (!cur || cur.k === 0) && want.s.name !== sys.loaded[h]) { sys.load(h, want.s.name); cur = want; }
    const def = cur && sys.def(cur.s.name), prog = cur ? def.rest * cur.k : 0;
    u.uProg.value.setComponent(h, prog * on);
    if (!cur || prog <= 0) continue;
    const cfg = tune.companions[cur.s.name];
    // the slot is a small stage: frame the object on it the way the proof frames it on its own page
    const r = cur.slot, stageH = (r.height / H) * 2 * D * tH, stageW = (r.width / W) * 2 * D * tH * aspect;
    const S = Math.min(stageW * def.frame.w, stageH * def.frame.h) * cfg.size;
    const nx = ((r.left + r.width / 2) / W) * 2 - 1, ny = 1 - ((r.top + r.height / 2) / H) * 2;
    _c.copy(camera.position).addScaledVector(u.uCamF.value, D)
      .addScaledVector(u.uCamR.value, nx * D * tH * aspect).addScaledVector(u.uCamU.value, ny * D * tH + def.frame.y * stageH);
    (h ? u.uC1 : u.uC0).value.copy(_c);
    u.uScale.value.setComponent(h, S); u.uBright.value.setComponent(h, cfg.brightness * tune.render.companionGain);
    u.uLightK.value.setComponent(h, cur.s.name === 'seedling' ? cfg.light : 0);
    u.uRest.value.setComponent(h, def.rest);
    if (cur.s.name === 'seedling') {
      lightOn = true;
      sys.light.position.copy(_c).addScaledVector(u.uCamF.value, 0.25 * S / 6);
      sys.light.quaternion.copy(camera.quaternion); sys.light.scale.setScalar(S);
      sys.lightU.uProgress.value = prog; sys.lightU.uStrength.value = cfg.light * on;
    }
  }
  sys.light.visible = lightOn;
}
