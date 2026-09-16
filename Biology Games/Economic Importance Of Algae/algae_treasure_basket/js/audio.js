/* ============================================================================
   audio.js — Web Audio sound effects + background music

   Sound effects are synthesised (no files needed). Music is a procedural
   ambient reef synth generated in-browser; if a drop-in file exists at
   assets/audio/bgm.mp3 it takes over instead. Everything degrades quietly if
   Web Audio is unavailable.
   ========================================================================== */
'use strict';

const AudioSys = {
  ctx: null,
  master: null,
  sfxBus: null,
  musicBus: null,
  ready: false,
  failed: false,

  sfxOn: true,
  musicOn: true,

  // procedural music state
  musicNodes: null,
  schedulerId: 0,
  nextNoteTime: 0,
  step: 0,

  // optional drop-in track
  bgmFile: null,
  bgmPath: 'assets/audio/bgm.mp3',
  usingFile: false,

  /** Lazily build the graph. Safe to call as often as you like. */
  init() {
    if (this.ready || this.failed) return this.ready;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) { this.failed = true; return false; }
    try {
      this.ctx = new Ctx();
    } catch (e) {
      this.failed = true;
      return false;
    }

    this.master = this.ctx.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(this.ctx.destination);

    this.sfxBus = this.ctx.createGain();
    this.sfxBus.gain.value = this.sfxOn ? 1 : 0;
    this.sfxBus.connect(this.master);

    this.musicBus = this.ctx.createGain();
    this.musicBus.gain.value = 0;          // faded in when music starts
    this.musicBus.connect(this.master);

    this.ready = true;
    return true;
  },

  /** Browsers start the context suspended until a gesture; nudge it awake. */
  resume() {
    if (!this.init()) return;
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
  },

  setSfx(on) {
    this.sfxOn = !!on;
    if (this.ready) this.sfxBus.gain.value = this.sfxOn ? 1 : 0;
  },

  setMusic(on) {
    this.musicOn = !!on;
    if (!this.musicOn) this.stopMusic();
    else this.startMusic();
  },

  /* ------------------------------------------------------------ effects -- */

  /** One shaped tone. `when` is an offset in seconds from now. */
  tone(freq, type, duration, when, peak) {
    if (!this.sfxOn || !this.init()) return;
    const t0 = this.ctx.currentTime + (when || 0);
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    const p = peak === undefined ? 0.11 : peak;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(p, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(gain);
    gain.connect(this.sfxBus);
    osc.start(t0);
    osc.stop(t0 + duration + 0.03);
  },

  /** Short pitched sweep — used for bubble pops. */
  sweep(from, to, type, duration, when, peak) {
    if (!this.sfxOn || !this.init()) return;
    const t0 = this.ctx.currentTime + (when || 0);
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(from, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + duration);
    const p = peak === undefined ? 0.12 : peak;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(p, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(gain);
    gain.connect(this.sfxBus);
    osc.start(t0);
    osc.stop(t0 + duration + 0.03);
  },

  /** Filtered noise burst — water splash / fizz. */
  noise(duration, freq, q, when, peak) {
    if (!this.sfxOn || !this.init()) return;
    const t0 = this.ctx.currentTime + (when || 0);
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * duration));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = freq || 1200;
    bp.Q.value = q || 1.2;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(peak === undefined ? 0.10 : peak, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    src.connect(bp); bp.connect(gain); gain.connect(this.sfxBus);
    src.start(t0);
    src.stop(t0 + duration + 0.02);
  },

  playClick()   { this.tone(520, 'triangle', 0.07, 0, 0.09); this.tone(780, 'sine', 0.06, 0.03, 0.05); },
  playHover()   { this.tone(880, 'sine', 0.04, 0, 0.03); },
  playSuccess() {
    this.sweep(520, 1180, 'sine', 0.16, 0, 0.13);
    this.tone(784, 'triangle', 0.18, 0.09, 0.09);
    this.tone(1046, 'sine', 0.22, 0.17, 0.07);
    this.noise(0.22, 2600, 1.6, 0, 0.05);
  },
  playFail() {
    this.sweep(220, 90, 'sawtooth', 0.34, 0, 0.10);
    this.noise(0.24, 420, 0.9, 0, 0.07);
  },
  playCatch()   { this.sweep(300, 900, 'sine', 0.14, 0, 0.08); this.noise(0.12, 3200, 2, 0.02, 0.04); },
  playWin() {
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((n, i) =>
      this.tone(n, 'triangle', 0.34, i * 0.13, 0.11));
    this.noise(0.6, 2200, 0.8, 0.1, 0.05);
  },
  playLose() {
    [440, 392, 330, 262].forEach((n, i) => this.tone(n, 'triangle', 0.3, i * 0.15, 0.09));
  },
  playUnlock() {
    [659.25, 880, 1174.7].forEach((n, i) => this.tone(n, 'sine', 0.4, i * 0.1, 0.1));
  },

  /* -------------------------------------------------------------- music -- */

  /**
   * Try the optional drop-in track first. Resolves to true when a file was
   * found and adopted, false when the procedural synth should be used.
   */
  probeMusicFile() {
    return new Promise(resolve => {
      const a = new Audio();
      let settled = false;
      const done = ok => { if (!settled) { settled = true; resolve(ok); } };
      a.preload = 'auto';
      a.loop = true;
      a.addEventListener('canplaythrough', () => { this.bgmFile = a; done(true); }, { once: true });
      a.addEventListener('error', () => done(false), { once: true });
      // file:// and some WebViews never fire either event for a missing file
      setTimeout(() => done(!!this.bgmFile), 2500);
      a.src = this.bgmPath;
      try { a.load(); } catch (e) { done(false); }
    });
  },

  startMusic() {
    if (!this.musicOn || !this.init()) return;
    this.resume();
    const t = this.ctx.currentTime;
    this.musicBus.gain.cancelScheduledValues(t);
    this.musicBus.gain.setValueAtTime(Math.max(0.0001, this.musicBus.gain.value), t);
    this.musicBus.gain.linearRampToValueAtTime(0.5, t + 2.0);

    if (this.bgmFile) {
      this.usingFile = true;
      if (!this.fileSource) {
        try {
          this.fileSource = this.ctx.createMediaElementSource(this.bgmFile);
          this.fileSource.connect(this.musicBus);
        } catch (e) {
          // Some WebViews refuse the route; play the element directly instead.
          this.fileSource = null;
          this.bgmFile.volume = 0.5;
        }
      }
      this.bgmFile.play().catch(() => {});
      return;
    }
    this.startProcedural();
  },

  stopMusic() {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    this.musicBus.gain.cancelScheduledValues(t);
    this.musicBus.gain.setValueAtTime(this.musicBus.gain.value, t);
    this.musicBus.gain.linearRampToValueAtTime(0.0001, t + 0.6);
    if (this.bgmFile && this.usingFile) {
      setTimeout(() => { try { this.bgmFile.pause(); } catch (e) {} }, 650);
      return;
    }
    clearInterval(this.schedulerId);
    this.schedulerId = 0;
    setTimeout(() => this.teardownProcedural(), 700);
  },

  /* --- procedural ambient reef synth ------------------------------------ */

  // Two slow chords, D-minor pentatonic flavoured, four bars each.
  CHORDS: [
    [146.83, 220.00, 261.63, 349.23],   // D3 A3 C4 F4
    [130.81, 196.00, 246.94, 329.63],   // C3 G3 B3 E4
    [174.61, 261.63, 329.63, 440.00],   // F3 C4 E4 A4
    [110.00, 164.81, 261.63, 329.63]    // A2 E3 C4 E4
  ],
  PENTA: [587.33, 698.46, 880.00, 1046.50, 1174.66, 1396.91],

  startProcedural() {
    if (this.musicNodes || !this.ready) return;

    const ctx = this.ctx;
    const out = ctx.createGain();
    out.gain.value = 1;
    out.connect(this.musicBus);

    // Gentle reverb-ish smear so the pad does not sound bare.
    const conv = ctx.createConvolver();
    const irLen = Math.floor(ctx.sampleRate * 2.4);
    const ir = ctx.createBuffer(2, irLen, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < irLen; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / irLen, 2.6) * 0.55;
      }
    }
    conv.buffer = ir;
    const wet = ctx.createGain(); wet.gain.value = 0.45;
    conv.connect(wet); wet.connect(out);

    // Pad: four detuned voices behind a slowly breathing lowpass.
    const padGain = ctx.createGain();
    padGain.gain.value = 0.0;
    const padFilter = ctx.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.value = 700;
    padFilter.Q.value = 0.8;
    padGain.connect(padFilter);
    padFilter.connect(out);
    padFilter.connect(conv);

    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.06;
    lfoGain.gain.value = 320;
    lfo.connect(lfoGain);
    lfoGain.connect(padFilter.frequency);
    lfo.start();

    const voices = [];
    for (let i = 0; i < 4; i++) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = i % 2 ? 'triangle' : 'sawtooth';
      osc.detune.value = (i - 1.5) * 7;
      osc.frequency.value = this.CHORDS[0][i];
      g.gain.value = 0.055;
      osc.connect(g);
      g.connect(padGain);
      osc.start();
      voices.push({ osc, g });
    }
    padGain.gain.linearRampToValueAtTime(0.9, ctx.currentTime + 3);

    // "Current" — filtered noise that swells and falls like a passing surge.
    const nLen = Math.floor(ctx.sampleRate * 4);
    const nBuf = ctx.createBuffer(1, nLen, ctx.sampleRate);
    const nd = nBuf.getChannelData(0);
    for (let i = 0; i < nLen; i++) nd[i] = Math.random() * 2 - 1;
    const nSrc = ctx.createBufferSource();
    nSrc.buffer = nBuf;
    nSrc.loop = true;
    const nFilt = ctx.createBiquadFilter();
    nFilt.type = 'bandpass';
    nFilt.frequency.value = 420;
    nFilt.Q.value = 0.7;
    const nGain = ctx.createGain();
    nGain.gain.value = 0.02;
    const nLfo = ctx.createOscillator();
    const nLfoG = ctx.createGain();
    nLfo.frequency.value = 0.045;
    nLfoG.gain.value = 0.016;
    nLfo.connect(nLfoG);
    nLfoG.connect(nGain.gain);
    nSrc.connect(nFilt); nFilt.connect(nGain); nGain.connect(out);
    nSrc.start(); nLfo.start();

    this.musicNodes = { out, conv, wet, padGain, padFilter, lfo, lfoGain, voices, nSrc, nFilt, nGain, nLfo, nLfoG };

    // Note scheduler: sparse bell plucks over the pad.
    this.step = 0;
    this.nextNoteTime = ctx.currentTime + 0.4;
    this.schedulerId = setInterval(() => this.scheduleAhead(), 120);
  },

  scheduleAhead() {
    if (!this.musicNodes) return;
    const ctx = this.ctx;
    const stepDur = 0.5;                    // 120 BPM eighth-ish pulse
    while (this.nextNoteTime < ctx.currentTime + 0.6) {
      this.scheduleStep(this.step, this.nextNoteTime);
      this.nextNoteTime += stepDur;
      this.step++;
    }
  },

  scheduleStep(step, when) {
    const bar = Math.floor(step / 16) % this.CHORDS.length;

    // Chord change at the top of each bar.
    if (step % 16 === 0) {
      const chord = this.CHORDS[bar];
      this.musicNodes.voices.forEach((v, i) => {
        v.osc.frequency.setTargetAtTime(chord[i], when, 1.2);
      });
    }

    // A pluck on a few of the sixteen steps only — keeps it ambient.
    const beats = [0, 6, 10, 14, 3];
    if (beats.indexOf(step % 16) === -1) return;
    if (Math.random() < 0.32) return;

    const ctx = this.ctx;
    const freq = this.PENTA[Math.floor(Math.random() * this.PENTA.length)];
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(0.09, when + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 1.6);
    osc.connect(g);
    g.connect(this.musicNodes.out);
    g.connect(this.musicNodes.conv);
    osc.start(when);
    osc.stop(when + 1.7);
  },

  teardownProcedural() {
    const n = this.musicNodes;
    if (!n) return;
    this.musicNodes = null;
    try {
      n.voices.forEach(v => { try { v.osc.stop(); } catch (e) {} });
      n.lfo.stop(); n.nLfo.stop(); n.nSrc.stop();
    } catch (e) { /* already stopped */ }
    try { n.out.disconnect(); } catch (e) {}
  },

  /** Human-readable description of where the music is coming from. */
  sourceLabel() {
    return this.bgmFile ? 'Music: assets/audio/bgm.mp3' : 'Music: procedural reef synth';
  }
};
