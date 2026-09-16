/* ============================================================================
   audio.js - procedural score + effects, fully offline.

   Music is synthesised in-browser with Web Audio (a slow lab-ambient pad over
   a four-chord loop, a soft heartbeat pulse and sparse instrument blips), so
   no audio file is required to ship. If assets/audio/bgm.mp3 is present it is
   used instead and the synth stays silent; if that file is missing or fails to
   decode, playback falls back to the synth without a visible error.

   Nothing is created until the first user gesture, which keeps mobile WebView
   autoplay policies satisfied.
   ========================================================================== */
'use strict';

const Audio2 = {
  ctx: null,
  master: null,
  musicBus: null,
  sfxBus: null,

  musicOn: true,
  sfxOn: true,

  /** 'none' | 'file' | 'synth' */
  mode: 'none',
  started: false,

  fileEl: null,
  fileTried: false,
  nodes: [],
  timer: null,
  step: 0,

  /* ------------------------------------------------------------- lifecycle */

  /** Create the graph. Safe to call repeatedly; only the first call builds. */
  ensure() {
    if (this.ctx) return this.ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      this.ctx = new AC();
    } catch (e) {
      return null;
    }
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(this.ctx.destination);

    this.musicBus = this.ctx.createGain();
    this.musicBus.gain.value = this.musicOn ? 0.5 : 0;
    this.musicBus.connect(this.master);

    this.sfxBus = this.ctx.createGain();
    this.sfxBus.gain.value = this.sfxOn ? 0.85 : 0;
    this.sfxBus.connect(this.master);
    return this.ctx;
  },

  /** Called from the first pointer/key event. Resumes a suspended context. */
  unlock() {
    const ctx = this.ensure();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    if (this.musicOn && !this.started) this.startMusic();
  },

  /* ----------------------------------------------------------------- music */

  startMusic() {
    if (!this.ensure() || this.started) return;
    this.started = true;
    /* Prefer a dropped-in file; fall back to the synth when absent. */
    if (!this.fileTried) {
      this.fileTried = true;
      this.tryFile()
        .then(() => { this.mode = 'file'; })
        .catch(() => { this.mode = 'synth'; this.startSynth(); });
    } else if (this.mode === 'file' && this.fileEl) {
      this.fileEl.play().catch(() => {});
    } else {
      this.mode = 'synth';
      this.startSynth();
    }
  },

  /** Resolve only if assets/audio/bgm.mp3 exists, decodes and starts. */
  tryFile() {
    return new Promise((resolve, reject) => {
      const el = document.createElement('audio');
      el.src = 'assets/audio/bgm.mp3';
      el.loop = true;
      el.preload = 'auto';
      el.volume = this.musicOn ? 0.5 : 0;
      let settled = false;
      const fail = () => { if (!settled) { settled = true; reject(new Error('no bgm file')); } };
      const ok = () => {
        if (settled) return;
        settled = true;
        this.fileEl = el;
        el.play().then(resolve).catch(() => resolve());   // element is valid; a
      };                                                  // blocked play retries
      el.addEventListener('canplaythrough', ok, { once: true });
      el.addEventListener('error', fail, { once: true });
      /* Some engines never fire either event for a 404 inside a WebView. */
      setTimeout(() => { if (!settled && el.readyState >= 3) ok(); else fail(); }, 2500);
    });
  },

  stopMusic() {
    this.started = false;
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    if (this.fileEl) { try { this.fileEl.pause(); } catch (e) {} }
    this.nodes.forEach(n => { try { n.stop ? n.stop() : n.disconnect(); } catch (e) {} });
    this.nodes = [];
  },

  /* -------------------------------------------------------- the synth score
     A slow Am - F - C - G loop in a low register, two detuned voices per note
     through a gently sweeping lowpass, with a heartbeat thump on the downbeat
     and an occasional high blip that sits in the space between chords. */

  startSynth() {
    const ctx = this.ctx;
    if (!ctx) return;

    const pad = ctx.createGain();
    pad.gain.value = 0.0001;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 640;
    filter.Q.value = 4;
    pad.connect(filter);
    filter.connect(this.musicBus);
    pad.gain.exponentialRampToValueAtTime(0.13, ctx.currentTime + 3);

    /* Filter breathing */
    const lfo = ctx.createOscillator();
    const lfoAmt = ctx.createGain();
    lfo.frequency.value = 0.055;
    lfoAmt.gain.value = 260;
    lfo.connect(lfoAmt);
    lfoAmt.connect(filter.frequency);
    lfo.start();
    this.nodes.push(lfo);

    this.padGain = pad;
    this.chords = [
      [110.00, 130.81, 164.81],   /* A minor  */
      [ 87.31, 130.81, 174.61],   /* F major  */
      [ 98.00, 130.81, 196.00],   /* C / G    */
      [ 98.00, 123.47, 146.83]    /* G major  */
    ];
    this.step = 0;

    const BAR = 3400;   /* ms per chord &mdash; deliberately slow and clinical */
    const playBar = () => {
      if (!this.ctx || this.mode !== 'synth') return;
      const t = this.ctx.currentTime;
      const chord = this.chords[this.step % this.chords.length];

      chord.forEach((f, i) => {
        [0, 1].forEach(d => {
          const o = this.ctx.createOscillator();
          const g = this.ctx.createGain();
          o.type = i === 0 ? 'triangle' : 'sawtooth';
          o.frequency.value = f * (d ? 1.006 : 0.997);
          g.gain.value = 0;
          g.gain.linearRampToValueAtTime(0.16 / (i + 1.4), t + 1.1);
          g.gain.linearRampToValueAtTime(0.0001, t + BAR / 1000);
          o.connect(g);
          g.connect(this.padGain);
          o.start(t);
          o.stop(t + BAR / 1000 + 0.1);
        });
      });

      this.heartbeat(t + 0.05);
      this.heartbeat(t + 0.38, 0.55);
      if (this.step % 2 === 1) this.blip(t + 1.9);
      this.step++;
    };

    playBar();
    this.timer = setInterval(playBar, BAR);
  },

  /** Soft low thump - the specimen monitor. */
  heartbeat(when, scale) {
    const ctx = this.ctx;
    if (!ctx) return;
    const s = scale || 1;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(96, when);
    o.frequency.exponentialRampToValueAtTime(38, when + 0.16);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(0.32 * s, when + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.3);
    o.connect(g);
    g.connect(this.musicBus);
    o.start(when);
    o.stop(when + 0.34);
  },

  /** Sparse high instrument tick. */
  blip(when) {
    const ctx = this.ctx;
    if (!ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = [880, 1174, 1318][this.step % 3];
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(0.05, when + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 1.2);
    o.connect(g);
    g.connect(this.musicBus);
    o.start(when);
    o.stop(when + 1.3);
  },

  /* ------------------------------------------------------------- SFX voices */

  /** One shaped oscillator note on the SFX bus. */
  tone(freq, dur, type, gain, slideTo, delay) {
    if (!this.sfxOn) return;
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime + (delay || 0);
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain == null ? 0.2 : gain, t + Math.min(0.02, dur / 3));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(this.sfxBus);
    o.start(t);
    o.stop(t + dur + 0.03);
  },

  /** Filtered noise burst - used for the page-turn / transition whoosh. */
  noise(dur, from, to, gain) {
    if (!this.sfxOn) return;
    const ctx = this.ensure();
    if (!ctx) return;
    const frames = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, frames, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < frames; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 0.8;
    const t = ctx.currentTime;
    bp.frequency.setValueAtTime(from, t);
    bp.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = ctx.createGain();
    g.gain.value = gain == null ? 0.18 : gain;
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bp); bp.connect(g); g.connect(this.sfxBus);
    src.start(t);
  },

  /** Named cues used by the game layer. */
  play(name) {
    switch (name) {
      case 'tap':
        this.tone(520, 0.07, 'square', 0.12);
        this.tone(780, 0.05, 'sine', 0.08, null, 0.03);
        break;
      case 'hover':
        this.tone(1180, 0.035, 'sine', 0.05);
        break;
      case 'confirm':
        this.tone(392, 0.1, 'triangle', 0.2);
        this.tone(587, 0.14, 'triangle', 0.16, null, 0.07);
        break;
      case 'correct':
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
          this.tone(f, 0.3, 'triangle', 0.2, null, i * 0.07));
        this.tone(1567.98, 0.5, 'sine', 0.07, null, 0.3);
        break;
      case 'wrong':
        this.tone(196, 0.34, 'sawtooth', 0.16, 92);
        this.tone(146, 0.4, 'square', 0.09, 70, 0.04);
        break;
      case 'advance':
        this.noise(0.34, 320, 2600, 0.12);
        this.tone(660, 0.12, 'sine', 0.09, 990);
        break;
      case 'open':
        this.noise(0.26, 1800, 420, 0.1);
        this.tone(330, 0.16, 'triangle', 0.12, 494);
        break;
      case 'close':
        this.noise(0.2, 900, 300, 0.09);
        this.tone(392, 0.14, 'triangle', 0.1, 262);
        break;
      case 'tick':
        this.tone(1320, 0.045, 'square', 0.06);
        break;
      case 'rank':
        [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) =>
          this.tone(f, 0.55, 'triangle', 0.18, null, i * 0.11));
        this.tone(130.81, 0.9, 'sine', 0.22, null, 0.1);
        break;
      case 'unlock':
        this.tone(880, 0.1, 'sine', 0.14);
        this.tone(1318.5, 0.22, 'sine', 0.12, null, 0.08);
        break;
      default:
        break;
    }
  },

  /* --------------------------------------------------------------- toggles */

  setMusic(on) {
    this.musicOn = !!on;
    if (this.musicBus) {
      const ctx = this.ctx;
      this.musicBus.gain.cancelScheduledValues(ctx.currentTime);
      this.musicBus.gain.linearRampToValueAtTime(this.musicOn ? 0.5 : 0, ctx.currentTime + 0.35);
    }
    if (this.fileEl) this.fileEl.volume = this.musicOn ? 0.5 : 0;
    if (this.musicOn) {
      this.ensure();
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      if (!this.started) this.startMusic();
      else if (this.mode === 'file' && this.fileEl) this.fileEl.play().catch(() => {});
    }
  },

  setSfx(on) {
    this.sfxOn = !!on;
    if (this.sfxBus) {
      this.sfxBus.gain.setTargetAtTime(this.sfxOn ? 0.85 : 0, this.ctx.currentTime, 0.05);
    }
  },

  /** Duck everything when the WebView is backgrounded. */
  setSuspended(suspended) {
    if (!this.ctx) return;
    if (suspended) {
      if (this.fileEl) { try { this.fileEl.pause(); } catch (e) {} }
      this.ctx.suspend().catch(() => {});
    } else {
      this.ctx.resume().catch(() => {});
      if (this.musicOn && this.mode === 'file' && this.fileEl) this.fileEl.play().catch(() => {});
    }
  }
};
