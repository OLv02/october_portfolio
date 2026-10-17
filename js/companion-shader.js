// The section companions' part of the main seed shader (js/particles.js includes it). The companions are made of the
// real background seeds: two thirds of the drawn seeds are "builders", split in two halves (every third seed is half A,
// the next every third is half B), so one section's object can still be on screen while the next one forms. A builder
// fades out of the drift while its section's stage is still below the screen, waits in the object's bud, grows out
// into its spot as the reader scrolls (and back into the bud scrolling up), and fades back into the drift once the stage
// has gone. Shapes, growth and colours are ported from the Windborne proof's section objects. Compiled with COMP_ONLY,
// it is the reserve's shader (js/companions.js), which shows nothing but formed objects.
import { FERN_FRONDS, FERN_STEPS, FERN_COIL, FERN_STIPE, FERN_SWEEP, LAUREL_GROW, ENVELOPE } from './companion-data.js';

// numbers written into GLSL: negatives in parentheses, so "x-${n}" can never become "x--0.2"
const n = (x) => { const s = Number(x).toFixed(4); return x < 0 ? `(${s})` : s; };
const FERN_SPEC = FERN_FRONDS.map(([bx, by, angle, length, arch, f0, f1, , pinna], i) =>
  `${i ? 'else ' : ''}${i < FERN_FRONDS.length - 1 ? `if (id < ${i}.5)` : ''}{ base = vec2(${n(bx)}, ${n(by)}); angle = ${n(angle)}; len = ${n(length)}; arch = ${n(arch)}; f0 = ${n(f0)}; f1 = ${n(f1)}; pinna = ${n(pinna)}; }`).join('\n  ');
const LAUREL_TABLE = `const vec4 LAUREL_LEAF[12] = vec4[12](${LAUREL_GROW.map(([bx, by, ax, ay]) => `vec4(${n(bx)}, ${n(by)}, ${n(ax)}, ${n(ay)})`).join(', ')});
const float LAUREL_NODE[12] = float[12](${LAUREL_GROW.map((g) => n(g[4])).join(', ')});`;

// Needs uTime, uCamR/uCamU/uCamF (the camera's basis) and TAU from the including shader.
export const COMPANION_GLSL = /* glsl */`
attribute vec4 aObjLock, aObjTun;   // the builder's spot in its half's current object, and that object's metadata
attribute float aComp;              // 0 = not a builder, 1 = half A, 2 = half B
// per half (x = A, y = B): which object, its build progress, scale, brightness, canopy light, rest pose
uniform vec2 uKind, uProg, uPres, uScale, uBright, uLightK, uRest;   // uPres: 0 = in the wind, 1 = at the object
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

${LAUREL_TABLE}
vec2 laurelCubic(vec2 a, vec2 b, vec2 c, vec2 d, float t){ float u = 1. - t; return u*u*u*a + 3.*u*u*t*b + 3.*u*t*t*c + t*t*t*d; }
vec3 laurelStemAt(float side, float t){
  vec2 raw = t < .5 ? laurelCubic(vec2(330., 347.), vec2(414., 320.), vec2(463., 240.), vec2(456., 176.), t * 2.)
                    : laurelCubic(vec2(456., 176.), vec2(454., 115.), vec2(407., 73.), vec2(376., 57.), t * 2. - 1.);
  return vec3(side * (raw.x - 294.) / 210., (190. - raw.y) / 210., 0.);
}

// Called at the end of seedPose with the seed's own wind pose; a builder blends from it to its spot in the object.
void companionPose(inout vec3 p, inout float size, inout float angle, inout vec3 colour, inout float alpha, inout float plantMix, float h){
#ifdef COMP_ONLY
  // the reserve (see js/companions.js) is never part of the drift: it only ever shows a formed object
  if (aComp < .5 || uCompOn < .001) { alpha = 0.; return; }
#else
  if (aComp < .5 || uCompOn < .001) return;
#endif
  float half_ = aComp - 1.5 > 0. ? 1. : 0.;
  float prog = mix(uProg.x, uProg.y, half_), pres = mix(uPres.x, uPres.y, half_);
  // Leaving and rejoining the wind happens off screen: the builder fades out of the drift in place (and back in when its
  // section has scrolled away), so no seed is ever seen flying to the object.
#ifdef COMP_ONLY
  if (pres < 1.) { alpha = 0.; return; }
#else
  if (pres <= 0.) return;
  if (pres < 1.) { alpha *= 1. - pres; return; }
#endif
  float kind = mix(uKind.x, uKind.y, half_), S = mix(uScale.x, uScale.y, half_), bright = mix(uBright.x, uBright.y, half_);
  float light = mix(uLightK.x, uLightK.y, half_), bp = prog / mix(uRest.x, uRest.y, half_);
  vec3 centre = mix(uC0, uC1, half_);
  float part = aObjLock.w;
  vec3 local = aObjLock.xyz, structure;
  float objAlpha = .62, objSize = .085 * S / 7. * uCompDot, turn = 1., inkStart = -1.;
  bool dust = false; float dustFade = 1.;
  // where the object grows from (its starting bud, in local units) and each seed's place in the growth, 0 first .. 1 last
  vec3 bud = vec3(0.); float order = 0.;
  // the laurel and the sprout grow in place along their own stems (the proof's growth): vis is how far each seed has
  // grown in, and plantAlpha its opacity
  float vis = -1., plantAlpha = 0.;

  if (kind < .5) {          // Little bridge
    structure = part < .5 ? vec3(.73, .69, .48) : part < 1.5 ? vec3(1., .95, .76) : part < 2.5 ? vec3(.66, .78, .52) : vec3(.53, .60, .38);
    // from a footing on each bank: the posts rise, then the deck and rails reach across to meet in the middle
    bud = vec3(sign(local.x) * .744, -.39, 0.);
    order = .5 * (1. - abs(local.x) / .744) + .3 * clamp((local.y + .39) / .55, 0., 1.) + (part > .5 && part < 1.5 ? .2 : 0.);
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
    // from a seed in the moss: the stem comes up, then the two leaves open
    bud = vec3(0., -.42, 0.); order = clamp((aObjTun.x - .08) / .82, 0., 1.);
  } else if (kind < 2.5) {  // compass, with facet lighting and hidden back faces from its data
    structure = part < .5 ? vec3(1., .83, .42) : part < 1.5 ? vec3(.48, .57, .30) : part < 2.5 ? vec3(.64, .68, .48) : part < 3.5 ? vec3(1., .94, .67) : part < 4.5 ? vec3(.42, .62, .40) : vec3(.42, .50, .29);
    structure *= aObjTun.y;
    objAlpha = (part > 1.5 && part < 2.5 ? .25 : .78) * aObjTun.z;
    // from the pivot at its centre out to the rim
    order = clamp(length(local.xy) / .75, 0., 1.);
  } else if (kind < 3.5) {  // quill; its one ink trail writes on over local .72-.96
    if (part > 3.5) inkStart = .72 + aObjTun.x * .18;
    // from the nib up the shaft, the vanes opening behind it
    bud = vec3(-.43, -.705, 0.); order = clamp((aObjTun.x - .04) / .86, 0., 1.);
    structure = part < .5 ? vec3(.94, .83, .49) : part < 1.5 ? vec3(1., .96, .81) : part < 2.5 ? vec3(.77, .86, .63) : part < 3.5 ? vec3(.70, .76, .56) : vec3(.94, .87, .64);
  } else if (kind > 5.5) {  // open envelope: the body opens out from its middle, the flap lifts, then the sprout grows
    float ebp = bp;
    structure = part < .5 ? vec3(.97, .91, .74) : part < 1.5 ? vec3(.85, .78, .51) : part < 2.5 ? vec3(.78, .82, .63) : part < 3.5 ? vec3(.68, .69, .51) : part < 4.5 ? vec3(.69, .83, .46) : vec3(.77, .93, .57);
    bud = vec3(0., -.22, .03);
    if (part > 1.5 && part < 2.5) {   // the back flap starts folded down over the front and lifts over .20-.58
      float turn = (1. - smoothstep(.20, .58, ebp)) * 3.14159265, height = aObjLock.y - .03;
      local.y = .03 + height * cos(turn); local.z = -.04 + height * sin(turn);
    }
    objAlpha = part > 2.5 && part < 3.5 ? .10 : .62;
    // the body is all there by .45, from the middle out (a little later for the flap)
    order = part > 1.5 && part < 2.5 ? .3 : .3 * clamp(length((aObjLock.xy - bud.xy) / vec2(.9, .75)), 0., 1.);
    if (part > 3.5) {
      if (part < 4.5) {   // the stem rises from inside the envelope, curving right (x = .14 t^2), over .46-.80
        float grown = mix(-.03, 1.03, smoothstep(.46, .80, ebp));
        plantAlpha = .72 * smoothstep(aObjTun.y - .018, aObjTun.y + .018, grown);
      } else {            // then the two leaves open at the node, over .68-.98
        float open = smoothstep(.68, .98, ebp), lengthGain = mix(.025, 1., smoothstep(0., .8, open)), widthGain = mix(.015, 1., smoothstep(.12, 1., open));
        float side = aObjTun.w, t = aObjTun.y, w = aObjTun.z, roll = (1. - open) * 1.1, tw = (1. - open) * side * .65;
        vec2 blade = vec2(side * (.36 * t * lengthGain - .69 * w * widthGain * cos(roll)), .28 * t * lengthGain + .73 * w * widthGain * cos(roll));
        blade = mat2(cos(tw), sin(tw), -sin(tw), cos(tw)) * blade;
        local = vec3(${n(ENVELOPE.leafNodeX)}, ${n(ENVELOPE.leafNodeY)}, .055) + vec3(blade, .018 * sin(t * 3.14159265) * lengthGain + w * widthGain * sin(roll));
        if (ebp >= .99999) local = aObjLock.xyz;
        plantAlpha = .78 * smoothstep(.015, .07, open) * sqrt(lengthGain * widthGain);
      }
      local.x += sin(uTime * .7 + local.y) * .008 * max(0., local.y + .12);
      vis = plantAlpha / .72;
    }
  } else if (kind > 4.5) {  // open laurel: two mirrored branches grow up from their roots, each leaf opening from its bud
    // the proof's progress, without its opening fade (that is the builders leaving the drift, done above)
    float lp = mix(.075, 1., bp), side = sign(aObjLock.x), gk = aObjTun.z;
    int leaf = int(aObjTun.w + .5);
    float node = gk < .5 ? aObjTun.x : LAUREL_NODE[leaf];
    vec3 stemFinal = laurelStemAt(side, node), root = laurelStemAt(side, 0.);
    vec3 stemNow = mix(root + vec3(0., 1.38 * node, 0.), stemFinal, smoothstep(.08 + node * .18, .32 + node * .28, lp));
    float petiole = smoothstep(.14 + node * .48, .28 + node * .48, lp), opened = smoothstep(.22 + node * .48, .48 + node * .50, lp);
    if (gk < .5) {
      local = stemNow + (aObjLock.xyz - stemFinal);
      plantAlpha = .62 * smoothstep(node - .015, node + .015, mix(-.03, 1.03, smoothstep(.08, .66, lp)));
    } else if (gk < 1.5) {
      local = stemNow + (aObjLock.xyz - stemFinal) * petiole;
      plantAlpha = .62 * smoothstep(.01, .10, petiole) * mix(.15, 1., petiole);
    } else {
      // one coherent leaf grows from its bud: the blade lengthens, then broadens and rolls face-on as it turns into place
      vec4 L = LAUREL_LEAF[leaf];
      vec3 gBase = vec3(side * L.x, L.y, 0.); vec2 gAxis = vec2(side * L.z, L.w);
      vec2 finalAxis = normalize(gAxis), finalNormal = side * vec2(-finalAxis.y, finalAxis.x);
      vec3 rel = aObjLock.xyz - gBase;
      float along = dot(rel.xy, finalAxis), across = dot(rel.xy, finalNormal), bearing = atan(side * finalAxis.x, finalAxis.y);
      float cb = mix(.05, bearing, smoothstep(0., 1., opened));
      vec2 ax = vec2(side * sin(cb), cos(cb)), nm = side * vec2(-ax.y, ax.x);
      float lengthGain = mix(.025, 1., smoothstep(0., .78, opened)), widthGain = mix(.015, 1., smoothstep(.15, 1., opened)), roll = (1. - opened) * 1.2;
      vec2 blade = ax * along * lengthGain + nm * across * widthGain * cos(roll);
      float leafCurl = sin(3.14159265 * clamp(along / max(.001, length(gAxis)), 0., 1.)) * .07 * (1. - opened);
      local = stemNow + (gBase - stemFinal) * petiole + vec3(blade, rel.z * lengthGain + across * widthGain * sin(roll) + leafCurl);
      plantAlpha = .62 * smoothstep(.015, .08, opened) * mix(.03, 1., sqrt(lengthGain * widthGain));
    }
    if (lp >= .99999) local = aObjLock.xyz;   // the endpoint is the approved geometry exactly
    local.x += sign(local.x) * sin(uTime * .65 + local.y * 1.3) * .009 * max(0., local.y + .75);
    structure = part < .5 ? vec3(.85, .77, .47) : part < 1.5 ? vec3(.95, .91, .67) : part < 2.5 ? vec3(.68, .80, .48) : vec3(.78, .84, .56);
    bud = root; vis = plantAlpha / .62;
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
    // from the crown at the base, up each frond (and the fronds unroll as they grow)
    bud = vec3(.03, -.56, 0.); order = part > 2.5 ? 0. : clamp(s, 0., 1.);
    objAlpha = part > 2.5 ? .35 : part > .5 && part < 1.5 ? .55 : .75;
  }

  // The object's local frame faces the camera, at its stage on screen (proof +z = towards the viewer).
  #define TO_WORLD(v) (centre + (uCamR * (v).x + uCamU * (v).y - uCamF * (v).z) * S)
  vec3 target = TO_WORLD(local);
  // A small clump at the bud, so the starting stage reads as a seed rather than a single point.
  vec3 jit = vec3(fract(h * 71.3) - .5, fract(h * 37.9) - .5, fract(h * 13.1) - .5) * vec3(.16, .11, .06);
  vec3 seed = TO_WORLD(bud + jit);
  // The starting stage is there as soon as the stage is on screen: a small bud at the object's base (a few of its seeds,
  // the rest waiting unseen inside it). Scrolling down grows the shape out of the bud in its growth order; scrolling up
  // draws it back in. The quill's ink still writes on at the end; the seedling's drifting seeds appear with its light.
  float inBud = step(fract(h * 53.7), .08);
  if (vis >= 0.) {
    // Grown in place: a seed shows where its stem or leaf has reached. The bud's few seeds wait at the root and fade as
    // the growth leaves it, so nothing is seen travelling.
    float budA = .32 * inBud * (1. - smoothstep(.02, .16, bp)), shown = step(.02, vis);
    p = mix(seed, target, max(shown, step(budA, 0.)));
    colour = mix(vec3(1., .95, .80) * bright, structure * bright, smoothstep(.02, .4, vis));
    alpha = mix(budA, plantAlpha, shown);
    size = objSize; angle *= 1. - turn; plantMix = 1.;
    alpha *= uCompOn;
    return;
  }
  float grow = inkStart >= 0. ? smoothstep(inkStart, inkStart + .06, bp) : dust ? smoothstep(.25, .75, bp)
             : smoothstep(.04 + .78 * order, .04 + .78 * order + .16, bp);
  float gs = grow * grow * (3. - 2. * grow);
  p = dust ? target : mix(seed, target, gs);
  angle *= 1. - turn;
  vec3 budColour = vec3(1., .95, .80) * bright;   // the bud is ivory, like the seeds; it takes its colours as it grows
  colour = mix(budColour, structure * bright, smoothstep(0., .6, grow));
  // seeds still inside the bud are unseen, except the few that make the bud; each one shows as it grows out
  alpha = dust ? objAlpha * grow : mix(.32 * inBud, objAlpha, smoothstep(0., .3, grow));
  size = objSize;
  plantMix = dust ? 0. : 1.;
  alpha *= uCompOn;   // the hand-over between the flight's builders and the reserve (js/companions.js)
}
`;
