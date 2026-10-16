// The section companions' part of the main seed shader (js/particles.js includes it). The companions are made of the
// real background seeds: two thirds of the drawn seeds are "builders", split in two halves (every third seed is half A,
// the next every third is half B), so one section's object can still be on screen while the next one forms. A builder
// leaves the wind for its spot in the object nearest first, rides the wind in on a curling path, and goes back to the
// wind when its section scrolls away. Shapes and colours are ported from the Windborne proof's section objects.
import { FERN_FRONDS, FERN_STEPS, FERN_COIL, FERN_STIPE, FERN_SWEEP } from './companion-data.js';

// numbers written into GLSL: negatives in parentheses, so "x-${n}" can never become "x--0.2"
const n = (x) => { const s = Number(x).toFixed(4); return x < 0 ? `(${s})` : s; };
const FERN_SPEC = FERN_FRONDS.map(([bx, by, angle, length, arch, f0, f1, , pinna], i) =>
  `${i ? 'else ' : ''}${i < FERN_FRONDS.length - 1 ? `if (id < ${i}.5)` : ''}{ base = vec2(${n(bx)}, ${n(by)}); angle = ${n(angle)}; len = ${n(length)}; arch = ${n(arch)}; f0 = ${n(f0)}; f1 = ${n(f1)}; pinna = ${n(pinna)}; }`).join('\n  ');

// Needs uTime, uCamR/uCamU/uCamF (the camera's basis) and TAU from the including shader.
export const COMPANION_GLSL = /* glsl */`
attribute vec4 aObjLock, aObjTun;   // the builder's spot in its half's current object, and that object's metadata
attribute float aComp;              // 0 = not a builder, 1 = half A, 2 = half B
// per half (x = A, y = B): which object, its build progress, scale, brightness, canopy light, rest pose
uniform vec2 uKind, uProg, uScale, uBright, uLightK, uRest;
uniform vec3 uC0, uC1;
uniform float uCompOn, uCompDot;   // uCompDot: larger points when an object has fewer seeds than the proof's 3,600

void fernSpec(float id, out vec2 base, out float angle, out float len, out float arch, out float f0, out float f1, out float pinna){
  ${FERN_SPEC}
}
float fernCurvature(float s, float f, float arch, float len){
  float u = max(1e-6, (s - f) / (1. - f));
  return arch + sign(arch) * ${n(FERN_COIL)} * pow(u, 1.3) * step(f, s) / ((1. - f) * len);
}
vec3 fernFrame(vec2 base, float angle, float len, float arch, float f, float s){
  float ds = len * s / ${n(FERN_STEPS)}, th = angle; vec2 q = base;
  for (int i = 0; i < ${FERN_STEPS}; i++) {
    float k = fernCurvature((float(i) + .5) / ${n(FERN_STEPS)} * s, f, arch, len), mid = th + k * ds * .5;
    q += vec2(cos(mid), sin(mid)) * ds; th += k * ds;
  }
  return vec3(q, th);
}

// Called at the end of seedPose with the seed's own wind pose; a builder blends from it to its spot in the object.
void companionPose(inout vec3 p, inout float size, inout float angle, inout vec3 colour, inout float alpha, inout float plantMix, float h){
  if (aComp < .5 || uCompOn < .001) return;
  float half_ = aComp - 1.5 > 0. ? 1. : 0.;
  float prog = mix(uProg.x, uProg.y, half_);
  if (prog <= 0.) return;
  float kind = mix(uKind.x, uKind.y, half_), S = mix(uScale.x, uScale.y, half_), bright = mix(uBright.x, uBright.y, half_);
  float light = mix(uLightK.x, uLightK.y, half_), bp = prog / mix(uRest.x, uRest.y, half_);
  vec3 centre = mix(uC0, uC1, half_);
  float part = aObjLock.w;
  vec3 local = aObjLock.xyz, structure;
  float objAlpha = .62, objSize = .085 * S / 7. * uCompDot, turn = 1., inkStart = -1.;
  bool dust = false; float dustFade = 1.;

  if (kind < .5) {          // Little bridge
    structure = part < .5 ? vec3(.73, .69, .48) : part < 1.5 ? vec3(1., .95, .76) : part < 2.5 ? vec3(.66, .78, .52) : vec3(.53, .60, .38);
  } else if (kind < 1.5) {  // spotlit seedling: its drifting seeds keep moving down the beam
    dust = part > 3.5;
    if (dust) {
      float along = fract((1.12 - aObjLock.y) / 1.54 + uTime * .026 * (.6 + aObjTun.y));
      dustFade = smoothstep(0., .08, along) * (1. - smoothstep(.90, 1., along));
      float width = .035 + .485 * along, origAlong = (1.12 - aObjLock.y) / 1.54;
      float sideways = (aObjLock.x - (-.72 + .74 * origAlong)) / (.035 + .485 * origAlong);
      local = vec3(-.72 + .74 * along + sideways * width + sin(uTime * .4 + aObjTun.z * 6.283) * .012, 1.12 - 1.54 * along, aObjLock.z);
    } else local.x += sin(uTime * .48 + aObjLock.y) * .009 * max(0., aObjLock.y + .42);
    structure = dust ? vec3(1., .93, .72) * (.65 + .45 * light) / max(bright, 1e-3) : part < .5 ? vec3(.73, .82, .43) : part < 1.5 ? vec3(.75, .95, .49) : vec3(.40, .54, .28);
    objAlpha = dust ? (.16 + .22 * aObjTun.y) * dustFade : part > 1.5 ? .35 : .8;
    objSize = dust ? (.018 + .045 * aObjTun.z) * S * uCompDot : objSize;
    turn = .75;
  } else if (kind < 2.5) {  // compass, with facet lighting and hidden back faces from its data
    structure = part < .5 ? vec3(1., .83, .42) : part < 1.5 ? vec3(.48, .57, .30) : part < 2.5 ? vec3(.64, .68, .48) : part < 3.5 ? vec3(1., .94, .67) : part < 4.5 ? vec3(.42, .62, .40) : vec3(.42, .50, .29);
    structure *= aObjTun.y;
    objAlpha = (part > 1.5 && part < 2.5 ? .25 : .78) * aObjTun.z;
  } else if (kind < 3.5) {  // quill; its one ink trail writes on over local .72-.96
    if (part > 3.5) inkStart = .72 + aObjTun.x * .18;
    structure = part < .5 ? vec3(.94, .83, .49) : part < 1.5 ? vec3(1., .96, .81) : part < 2.5 ? vec3(.77, .86, .63) : part < 3.5 ? vec3(.70, .76, .56) : vec3(.94, .87, .64);
  } else {                  // fern: the fronds unroll over .55-1 as the seeds arrive
    float s = aObjTun.x, curl = 0.;
    if (part < 2.5) {
      vec2 base; float a0, len, arch, f0, f1, pinna; fernSpec(aObjTun.w, base, a0, len, arch, f0, f1, pinna);
      float f = mix(f0, f1, smoothstep(.55, 1., bp));
      a0 += .02 * sin(uTime * .5 + aObjTun.w * 1.7);
      vec3 fr = fernFrame(base, a0, len, arch, f, s);
      curl = smoothstep(f - .04, f + .12, s);
      if (part < .5) local.xy = fr.xy + vec2(aObjTun.z, 0.);
      else {
        float side = sign(aObjTun.y), t = abs(aObjTun.y), c = aObjTun.z;
        float l = pinna * smoothstep(${n(FERN_STIPE - 0.02)}, ${n(FERN_STIPE + 0.1)}, s) * pow(1. - s, .6) * 1.25 * (1. - .86 * curl);
        vec2 T = vec2(cos(fr.z), sin(fr.z)), d = normalize(vec2(-side * T.y, side * T.x) + T * ${n(FERN_SWEEP)});
        float w = l * .12 * pow(sin(3.14159265 * t), .6) * (.62 + .38 * abs(sin(t * 3.14159265 * 6.)));
        local.xy = fr.xy + d * l * t + vec2(-d.y, d.x) * side * w * c + T * .10 * l * t * t;
      }
    }
    structure = part < .5 ? vec3(.86, .82, .50) : part < 1.5 ? vec3(.52, .74, .40) : part < 2.5 ? vec3(.74, .88, .56) : vec3(.40, .54, .28);
    structure = mix(structure, vec3(1., .90, .60), curl * .5);   // the curled fiddlehead tips carry a warm golden fuzz
    objAlpha = part > 2.5 ? .35 : part > .5 && part < 1.5 ? .55 : .75;
  }

  // the object's local frame faces the camera, at its stage on screen (proof +z = towards the viewer)
  vec3 target = centre + (uCamR * local.x + uCamU * local.y - uCamF * local.z) * S;
  // Nearest first: the seeds drifting closest to their spot are caught first and the pull spreads outward.
  float dist = length(p - target), delay = .55 * clamp(dist / 30., 0., 1.);
  float g = inkStart >= 0. ? smoothstep(inkStart, inkStart + .06, bp) : smoothstep(delay, delay + .45, bp);
  float formed = dust ? 0. : g;
  // Riding the wind in: a gusty, curling path that sweeps wide in mid-flight, still tumbling until it lands.
  float sw = sin(g * 3.14159265), a = h * TAU + uTime * .35;
  vec3 curlOff = (uCamR * cos(a) + uCamU * sin(a) * .7) * sw * min(dist * .22, S * .8) + uCamU * sw * sw * S * .12;
  p = mix(p, target, g * g * (3. - 2. * g)) + curlOff;
  angle = mix(angle + sw * 2.2 * (fract(h * 31.) - .5), angle * (1. - turn), smoothstep(.55, 1., g));
  colour = mix(colour, structure * bright, g);
  alpha = mix(alpha, objAlpha, g);
  size = mix(size, objSize, smoothstep(0., .7, g));
  plantMix = max(plantMix, formed);
}
`;
