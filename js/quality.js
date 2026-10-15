// Device tiers. Phones and tablets are first-class: each gets a budget sized for it,
// and an adaptive monitor steps quality down (or, on tablets, up) from real frame times.

export const TIERS = {
  high: { name: 'high', count: 180000, laptop: 26000, stars: 6000, dust: 2600, glyphs: 1600, dpr: 2.0, bloom: 5, zoomTaps: 10, sky: 2048 },
  med:  { name: 'med',  count: 110000, laptop: 16000, stars: 4200, dust: 1800, glyphs: 1100, dpr: 2.0, bloom: 4, zoomTaps: 6,  sky: 1024 },
  low:  { name: 'low',  count: 60000,  laptop: 9000,  stars: 2600, dust: 1100, glyphs: 700,  dpr: 1.5, bloom: 3, zoomTaps: 0,  sky: 1024 },
};
const ORDER = ['low', 'med', 'high'];

export function detectDevice() {
  const q = new URLSearchParams(location.search);
  let coarse = matchMedia('(pointer: coarse)').matches;
  const minSide = Math.min(screen.width, screen.height);
  let tablet = coarse && minSide >= 700;
  let phone = coarse && !tablet;
  // the device lab (devices.html) runs the site in frames on a laptop and says what to behave as
  const dev = q.get('dev');
  if (dev === 'phone' || dev === 'tablet' || dev === 'desktop') { coarse = dev !== 'desktop'; tablet = dev === 'tablet'; phone = dev === 'phone'; }
  const mem = navigator.deviceMemory || 8;
  const cores = navigator.hardwareConcurrency || 8;
  const weak = mem <= 3 || cores <= 4;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let start = phone ? 'med' : tablet ? 'med' : 'high';
  // Data is sampled once at the largest budget the device could ever be promoted to.
  let sample = phone ? 'med' : 'high';
  if (weak) { start = 'low'; sample = phone ? 'low' : 'med'; }
  const forced = q.get('tier');
  if (forced && TIERS[forced]) { start = forced; sample = ORDER.indexOf(forced) > ORDER.indexOf(sample) ? forced : sample; }
  return { coarse, phone, tablet, reducedMotion, start, sample, canPromote: tablet && !weak && !forced };
}

// Watches real frame times and nudges the tier. One step per verdict, with a cooldown.
export class AdaptiveQuality {
  constructor(device, apply) {
    this.level = ORDER.indexOf(device.start);
    this.max = ORDER.indexOf(device.sample);
    this.canPromote = device.canPromote;
    this.apply = apply;
    this.samples = [];
    this.cool = 2.5;
    this.locked = !!new URLSearchParams(location.search).get('tier');
  }
  get tier() { return TIERS[ORDER[this.level]]; }
  frame(dt) {
    if (this.locked || dt <= 0 || dt > 0.25) return;
    if (this.cool > 0) { this.cool -= dt; return; }
    this.samples.push(dt);
    if (this.samples.length < 90) return;
    const s = this.samples.sort((a, b) => a - b);
    const p75 = s[Math.floor(s.length * 0.75)];
    this.samples = [];
    if (p75 > 0.026 && this.level > 0) { this.level--; this.cool = 3; this.apply(this.tier); }
    else if (p75 < 0.011 && this.canPromote && this.level < this.max) { this.level++; this.cool = 3; this.apply(this.tier); }
  }
}
