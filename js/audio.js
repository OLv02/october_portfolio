// Sound, synthesized live with no audio files. On by default; it wakes on the visitor's first tap, click or key press.
// Drone that shifts per act · wind that follows scroll speed · tunnel shimmer · sun approach + boom ·
// portrait chime · tap blips · key scrape, tumbler clicks, the heavy clunk, and an "access granted" chord.

function silentWavURI() {
  // Tiny looping silent clip: playing it moves iOS audio onto the media channel,
  // so the hardware silent switch doesn't mute Web Audio.
  const n = 800, b = new ArrayBuffer(44 + n * 2), v = new DataView(b);
  const s = (o, t) => { for (let i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i)); };
  s(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); s(8, 'WAVE'); s(12, 'fmt '); v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, 8000, true); v.setUint32(28, 16000, true);
  v.setUint16(32, 2, true); v.setUint16(34, 16, true); s(36, 'data'); v.setUint32(40, n * 2, true);
  let bin = ''; const u8 = new Uint8Array(b); for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]);
  return 'data:audio/wav;base64,' + btoa(bin);
}

export class Sound {
  constructor() { this.ctx = null; this.on = false; this.muted = false; }

  // Safe to call on every tap: the first call builds the sound, later calls just make sure it's running.
  // It has to run inside the tap/click/key handler itself, which is why nothing here waits on a promise first.
  start() {
    if (this.ctx) { this.wake(); return true; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    this.ctx = new AC();
    this.wake();
    this.build();
    this.on = true;
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) this.ctx.suspend(); else if (this.on && !this.muted) this.ctx.resume();
    });
    return true;
  }

  // resume the context, and play the silent clip that moves iOS audio past the silent switch
  wake() {
    if (!this.ctx || this.muted) return;
    if (this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
    if (!this.unlock) { this.unlock = new Audio(silentWavURI()); this.unlock.loop = true; this.unlock.volume = 0.01; }
    if (this.unlock.paused) this.unlock.play().catch(() => {});
  }

  build() {
    const c = this.ctx, t = c.currentTime;
    this.master = c.createGain(); this.master.gain.value = 0;
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 3;
    this.master.connect(comp).connect(c.destination);
    this.master.gain.setTargetAtTime(0.85, t, 1.2);

    // reverb from a generated impulse
    this.verb = c.createConvolver();
    const len = c.sampleRate * 3.2, ir = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
    this.verb.buffer = ir;
    this.verbIn = c.createGain(); this.verbIn.gain.value = 0.55;
    this.verbIn.connect(this.verb).connect(this.master);

    // drone
    this.droneF = c.createBiquadFilter(); this.droneF.type = 'lowpass'; this.droneF.frequency.value = 420; this.droneF.Q.value = 0.7;
    this.droneG = c.createGain(); this.droneG.gain.value = 0.16;
    this.droneF.connect(this.droneG); this.droneG.connect(this.master); this.droneG.connect(this.verbIn);
    this.oscs = [[55, 'sine', 0.5], [55.4, 'sawtooth', 0.09], [82.41, 'triangle', 0.22], [110, 'sawtooth', 0.06], [164.8, 'sine', 0.08]].map(([f, type, g]) => {
      const o = c.createOscillator(), gg = c.createGain(); o.type = type; o.frequency.value = f; gg.gain.value = g;
      o.connect(gg).connect(this.droneF); o.start(); return o;
    });
    const lfo = c.createOscillator(), lfoG = c.createGain(); lfo.frequency.value = 0.07; lfoG.gain.value = 140;
    lfo.connect(lfoG).connect(this.droneF.frequency); lfo.start();

    // shimmer (tunnel)
    this.shimG = c.createGain(); this.shimG.gain.value = 0;
    this.shimG.connect(this.verbIn); this.shimG.connect(this.master);
    [880, 1318.5, 1760, 2637].forEach((f, i) => {
      const o = c.createOscillator(), g = c.createGain(), tr = c.createOscillator(), trg = c.createGain();
      o.frequency.value = f; g.gain.value = 0.025 / (i + 1); tr.frequency.value = 0.3 + i * 0.17; trg.gain.value = 0.02 / (i + 1);
      tr.connect(trg).connect(g.gain); o.connect(g).connect(this.shimG); o.start(); tr.start();
    });

    // wind / whoosh
    const nb = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    this.noiseBuf = nb;
    const ns = c.createBufferSource(); ns.buffer = nb; ns.loop = true;
    this.windF = c.createBiquadFilter(); this.windF.type = 'bandpass'; this.windF.frequency.value = 400; this.windF.Q.value = 0.8;
    this.windG = c.createGain(); this.windG.gain.value = 0.015;
    ns.connect(this.windF).connect(this.windG).connect(this.master); ns.start();

    // sun approach tone
    this.sunO = c.createOscillator(); this.sunO.type = 'sawtooth'; this.sunO.frequency.value = 110;
    this.sunF = c.createBiquadFilter(); this.sunF.type = 'bandpass'; this.sunF.Q.value = 6; this.sunF.frequency.value = 300;
    this.sunG = c.createGain(); this.sunG.gain.value = 0;
    this.sunO.connect(this.sunF).connect(this.sunG); this.sunG.connect(this.master); this.sunG.connect(this.verbIn); this.sunO.start();
  }

  // called every frame with the current state of the flight
  update(s) {
    if (!this.on || !this.ctx) return;
    const t = this.ctx.currentTime, k = 0.12;
    this.droneF.frequency.setTargetAtTime(s.act === 'tunnel' ? 700 + s.speed * 1400 : s.act === 'vault' ? 520 : 380, t, 0.4);
    this.droneG.gain.setTargetAtTime(s.act === 'vault' ? 0.2 : 0.16, t, 0.6);
    this.shimG.gain.setTargetAtTime(s.act === 'tunnel' ? 0.9 * s.tunnel : 0, t, 0.5);
    this.windG.gain.setTargetAtTime(0.012 + Math.min(0.28, s.speed * 0.32), t, k);
    this.windF.frequency.setTargetAtTime(280 + s.speed * 2600, t, k);
    this.sunG.gain.setTargetAtTime(0.11 * s.sun, t, 0.2);
    this.sunO.frequency.setTargetAtTime(90 + s.sun * 120, t, 0.3);
    this.sunF.frequency.setTargetAtTime(220 + s.sun * 1600, t, 0.3);
  }

  setMuted(m) {
    this.muted = m;
    if (!this.ctx) return;
    if (!m) this.wake();
    this.master.gain.setTargetAtTime(m ? 0 : 0.85, this.ctx.currentTime, 0.25);
  }

  _env(node, peak, a, d, when = 0) {
    const t = this.ctx.currentTime + when;
    node.gain.setValueAtTime(0, t); node.gain.linearRampToValueAtTime(peak, t + a); node.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }
  _bell(freq, gain, dur, when = 0) {
    const c = this.ctx;
    [1, 2.76, 5.4, 8.93].forEach((r, i) => {
      const o = c.createOscillator(), g = c.createGain(); o.frequency.value = freq * r;
      o.connect(g); g.connect(this.master); g.connect(this.verbIn);
      this._env(g, gain / (i + 1.4), 0.004, dur / (1 + i * 0.6), when);
      o.start(c.currentTime + when); o.stop(c.currentTime + when + dur + 0.1);
    });
  }
  _noise(f, q, gain, dur, type = 'bandpass', when = 0, f2) {
    const c = this.ctx, s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noiseBuf; fl.type = type; fl.frequency.value = f; fl.Q.value = q;
    if (f2) fl.frequency.exponentialRampToValueAtTime(f2, c.currentTime + when + dur);
    s.connect(fl).connect(g); g.connect(this.master); g.connect(this.verbIn);
    this._env(g, gain, 0.003, dur, when);
    s.start(c.currentTime + when); s.stop(c.currentTime + when + dur + 0.05);
  }
  _ok() { return this.on && this.ctx && !this.muted; }

  chime() { if (this._ok()) { this._bell(659.25, 0.12, 3.2); this._bell(987.77, 0.06, 2.6, 0.12); } }
  blip() { if (!this._ok()) return; const c = this.ctx, o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(1200, c.currentTime); o.frequency.exponentialRampToValueAtTime(520, c.currentTime + 0.14); o.connect(g); g.connect(this.master); g.connect(this.verbIn); this._env(g, 0.05, 0.004, 0.18); o.start(); o.stop(c.currentTime + 0.25); }
  scrape() { if (this._ok()) this._noise(2600, 1.5, 0.07, 0.38, 'bandpass', 0, 1100); }
  click() { if (this._ok()) { this._noise(3300, 9, 0.28, 0.035); this._noise(2800, 9, 0.22, 0.03, 'bandpass', 0.09); } }
  clunk() {
    if (!this._ok()) return;
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.frequency.setValueAtTime(130, c.currentTime); o.frequency.exponentialRampToValueAtTime(40, c.currentTime + 0.35);
    o.connect(g); g.connect(this.master); this._env(g, 0.6, 0.004, 0.45); o.start(); o.stop(c.currentTime + 0.6);
    this._noise(700, 0.8, 0.3, 0.14, 'lowpass');
    [190, 507, 912, 1404].forEach((f, i) => { const oo = c.createOscillator(), gg = c.createGain(); oo.frequency.value = f; oo.connect(gg); gg.connect(this.master); gg.connect(this.verbIn); this._env(gg, 0.07 / (i + 1), 0.002, 1.4); oo.start(); oo.stop(c.currentTime + 1.6); });
  }
  granted() { if (this._ok()) [440, 554.37, 659.25, 880].forEach((f, i) => this._bell(f, 0.07, 2.2, 0.18 + i * 0.11)); }
  boom() {
    if (!this._ok()) return;
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.frequency.setValueAtTime(70, c.currentTime); o.frequency.exponentialRampToValueAtTime(26, c.currentTime + 1.8);
    o.connect(g); g.connect(this.master); g.connect(this.verbIn); this._env(g, 0.5, 0.02, 2.2); o.start(); o.stop(c.currentTime + 2.4);
    this._noise(1800, 0.6, 0.22, 1.6, 'lowpass', 0, 120);
  }
}
