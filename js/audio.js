// Sound, synthesized live with no audio files. Off until the visitor turns it on with the sound button.
// A soft open pad · wind that follows how fast you travel · a light leaf rustle in the journey ·
// a warm swell in the light at the end · a quiet two-note chime when the daisy opens.
// Provisional: no final sound palette has been chosen.

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
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 3;
    this.master.connect(comp).connect(c.destination);
    this.master.gain.setTargetAtTime(0.7, t, 1.5);

    // a soft room from a generated impulse
    this.verb = c.createConvolver();
    const len = c.sampleRate * 3.6, ir = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.6); }
    this.verb.buffer = ir;
    this.verbIn = c.createGain(); this.verbIn.gain.value = 0.6;
    this.verbIn.connect(this.verb).connect(this.master);

    // open pad: a low fifth and a tenth, all sine, slowly breathing
    this.padF = c.createBiquadFilter(); this.padF.type = 'lowpass'; this.padF.frequency.value = 600; this.padF.Q.value = 0.5;
    this.padG = c.createGain(); this.padG.gain.value = 0.07;
    this.padF.connect(this.padG); this.padG.connect(this.master); this.padG.connect(this.verbIn);
    [[98, 0.5], [146.8, 0.32], [246.9, 0.12], [293.7, 0.08]].forEach(([f, g]) => {
      const o = c.createOscillator(), gg = c.createGain(); o.type = 'sine'; o.frequency.value = f; gg.gain.value = g;
      const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 0.05 + Math.random() * 0.06; lg.gain.value = g * 0.4;
      lfo.connect(lg).connect(gg.gain); lfo.start();
      o.connect(gg).connect(this.padF); o.start();
    });

    const nb = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    this.noiseBuf = nb;
    // wind
    const ns = c.createBufferSource(); ns.buffer = nb; ns.loop = true;
    this.windF = c.createBiquadFilter(); this.windF.type = 'bandpass'; this.windF.frequency.value = 350; this.windF.Q.value = 0.6;
    this.windG = c.createGain(); this.windG.gain.value = 0.02;
    const gust = c.createOscillator(), gustG = c.createGain(); gust.frequency.value = 0.09; gustG.gain.value = 120;
    gust.connect(gustG).connect(this.windF.frequency); gust.start();
    ns.connect(this.windF).connect(this.windG).connect(this.master); ns.start();
    // leaves: bright, quiet, flickering
    const ls = c.createBufferSource(); ls.buffer = nb; ls.loop = true; ls.playbackRate.value = 0.83;
    this.leafF = c.createBiquadFilter(); this.leafF.type = 'highpass'; this.leafF.frequency.value = 3200;
    this.leafG = c.createGain(); this.leafG.gain.value = 0;
    const flick = c.createOscillator(), flickG = c.createGain(); flick.frequency.value = 3.1; flickG.gain.value = 0.004;
    flick.connect(flickG).connect(this.leafG.gain); flick.start();
    ls.connect(this.leafF).connect(this.leafG); this.leafG.connect(this.master); this.leafG.connect(this.verbIn); ls.start();
    // warm swell in the light
    this.warmG = c.createGain(); this.warmG.gain.value = 0;
    this.warmG.connect(this.master); this.warmG.connect(this.verbIn);
    [196, 293.7, 392, 493.9].forEach((f, i) => { const o = c.createOscillator(), g = c.createGain(); o.type = i ? 'sine' : 'triangle'; o.frequency.value = f; g.gain.value = 0.05 / (i + 1); o.connect(g).connect(this.warmG); o.start(); });
  }

  // called every frame with the current state of the flight
  update(s) {
    if (!this.on || !this.ctx) return;
    const t = this.ctx.currentTime, k = 0.15;
    this.padF.frequency.setTargetAtTime(s.act === 'tunnel' ? 520 + s.speed * 500 : 650, t, 0.6);
    this.windG.gain.setTargetAtTime(0.015 + Math.min(0.18, s.speed * 0.2), t, k);
    this.windF.frequency.setTargetAtTime(300 + s.speed * 1400, t, k);
    this.leafG.gain.setTargetAtTime(s.act === 'tunnel' ? 0.006 * s.tunnel : 0, t, 0.6);
    this.warmG.gain.setTargetAtTime(0.5 * s.sun, t, 0.5);
  }

  setMuted(m) {
    this.muted = m;
    if (!this.ctx) return;
    if (!m) this.wake();
    this.master.gain.setTargetAtTime(m ? 0 : 0.7, this.ctx.currentTime, 0.25);
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
  _ok() { return this.on && this.ctx && !this.muted; }

  chime() { if (this._ok()) { this._bell(587.33, 0.06, 3.4); this._bell(880, 0.035, 2.8, 0.18); } }
}
