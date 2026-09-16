/* ==========================================================================
   audio.js - fully offline sound.
   Music: procedural airship-deck ambience via Web Audio (no files needed).
          If assets/audio/bgm.mp3 exists it overrides the synth automatically.
   SFX:   short procedural blips - brass, wind and wood.
   ========================================================================== */
'use strict';

var Sound = {
  ctx: null,
  master: null,
  musicBus: null,
  sfxBus: null,
  verb: null,
  ready: false,
  musicOn: true,
  sfxOn: true,
  _synth: null,
  _timer: null,
  _file: null,       // HTMLAudioElement when a drop-in track was found
  _fileChecked: false,
  _beat: 0,
  _nextTime: 0,
  _bpm: 62,
  _lastTick: 0,

  /* ---------------- setup ---------------- */

  init: function () {
    if (this.ctx) return true;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try { this.ctx = new AC(); } catch (e) { return false; }

    this.master = this.ctx.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(this.ctx.destination);

    // Generated plate reverb (noise impulse with exponential decay).
    this.verb = this.ctx.createConvolver();
    this.verb.buffer = this._makeIR(2.6, 2.4);
    var verbGain = this.ctx.createGain();
    verbGain.gain.value = 0.5;
    this.verb.connect(verbGain);
    verbGain.connect(this.master);

    this.musicBus = this.ctx.createGain();
    this.musicBus.gain.value = this.musicOn ? 0.34 : 0;
    this.musicBus.connect(this.master);
    this.musicBus.connect(this.verb);

    this.sfxBus = this.ctx.createGain();
    this.sfxBus.gain.value = this.sfxOn ? 0.5 : 0;
    this.sfxBus.connect(this.master);
    this.sfxBus.connect(this.verb);

    this.ready = true;
    return true;
  },

  resume: function () {
    if (this.ctx && this.ctx.state === 'suspended') { try { this.ctx.resume(); } catch (e) { } }
  },

  _makeIR: function (seconds, decay) {
    var rate = this.ctx.sampleRate;
    var len = Math.max(1, Math.floor(rate * seconds));
    var buf = this.ctx.createBuffer(2, len, rate);
    for (var c = 0; c < 2; c++) {
      var d = buf.getChannelData(c);
      for (var i = 0; i < len; i++) {
        var t = i / len;
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay);
      }
    }
    return buf;
  },

  _noiseBuffer: function (seconds) {
    var rate = this.ctx.sampleRate;
    var len = Math.max(1, Math.floor(rate * seconds));
    var buf = this.ctx.createBuffer(1, len, rate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  },

  /* ---------------- toggles ---------------- */

  setMusic: function (on) {
    this.musicOn = !!on;
    if (this._file) {
      this._file.volume = this.musicOn ? 0.5 : 0;
      if (this.musicOn) { var p = this._file.play(); if (p && p.catch) p.catch(function () { }); }
      else this._file.pause();
    }
    if (this.musicBus && this.ctx) {
      var t = this.ctx.currentTime;
      this.musicBus.gain.cancelScheduledValues(t);
      this.musicBus.gain.setTargetAtTime(this.musicOn ? 0.34 : 0, t, 0.25);
    }
    if (this.musicOn) this.startMusic();
  },

  setSfx: function (on) {
    this.sfxOn = !!on;
    if (this.sfxBus && this.ctx) {
      var t = this.ctx.currentTime;
      this.sfxBus.gain.cancelScheduledValues(t);
      this.sfxBus.gain.setTargetAtTime(this.sfxOn ? 0.5 : 0, t, 0.08);
    }
  },

  /* ---------------- optional drop-in track ---------------- */

  _tryFile: function () {
    var self = this;
    return new Promise(function (resolve) {
      if (self._fileChecked) { resolve(self._file); return; }
      self._fileChecked = true;
      var a = new Audio();
      a.loop = true;
      a.preload = 'auto';
      a.volume = 0;
      var settled = false;
      var ok = function () { if (!settled) { settled = true; self._file = a; resolve(a); } };
      var fail = function () { if (!settled) { settled = true; self._file = null; resolve(null); } };
      a.addEventListener('canplaythrough', ok);
      a.addEventListener('loadeddata', ok);
      a.addEventListener('error', fail);
      setTimeout(fail, 2200);
      try { a.src = 'assets/audio/bgm.mp3'; a.load(); } catch (e) { fail(); }
    });
  },

  /* ---------------- music ---------------- */

  startMusic: function () {
    var self = this;
    if (!this.init()) return;
    this.resume();
    this._tryFile().then(function (file) {
      if (file) {
        // Drop-in track wins over the synth.
        self._stopSynth();
        file.volume = self.musicOn ? 0.5 : 0;
        if (self.musicOn) { var p = file.play(); if (p && p.catch) p.catch(function () { self._startSynth(); }); }
      } else {
        self._startSynth();
      }
    });
  },

  _stopSynth: function () {
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
    if (this._synth) {
      var s = this._synth, t = this.ctx.currentTime;
      try {
        s.out.gain.setTargetAtTime(0, t, 0.4);
        var nodes = s.stop;
        setTimeout(function () {
          nodes.forEach(function (n) { try { n.stop(); } catch (e) { } });
        }, 1200);
      } catch (e) { }
      this._synth = null;
    }
  },

  _startSynth: function () {
    if (this._synth || !this.ready) return;
    var ctx = this.ctx, now = ctx.currentTime;
    var out = ctx.createGain();
    out.gain.value = 0;
    out.gain.setTargetAtTime(1, now, 1.4);
    out.connect(this.musicBus);
    var stopList = [];

    /* -- warm pad: three detuned voices through a breathing lowpass -- */
    var padFilter = ctx.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.value = 620;
    padFilter.Q.value = 0.9;
    var padGain = ctx.createGain();
    padGain.gain.value = 0.3;
    padFilter.connect(padGain);
    padGain.connect(out);

    var lfo = ctx.createOscillator();
    lfo.frequency.value = 0.045;
    var lfoAmt = ctx.createGain();
    lfoAmt.gain.value = 330;
    lfo.connect(lfoAmt);
    lfoAmt.connect(padFilter.frequency);
    lfo.start(now);
    stopList.push(lfo);

    var voices = [];
    var shapes = ['triangle', 'sawtooth', 'sawtooth'];
    for (var i = 0; i < 3; i++) {
      var o = ctx.createOscillator();
      o.type = shapes[i];
      var g = ctx.createGain();
      g.gain.value = i === 0 ? 0.5 : 0.22;
      o.detune.value = (i - 1) * 7;
      o.connect(g);
      g.connect(padFilter);
      o.start(now);
      stopList.push(o);
      voices.push(o);
    }

    /* -- engine hum + wind -- */
    var hum = ctx.createOscillator();
    hum.type = 'sine';
    hum.frequency.value = 55;
    var humGain = ctx.createGain();
    humGain.gain.value = 0.14;
    var humLfo = ctx.createOscillator();
    humLfo.frequency.value = 0.7;
    var humLfoAmt = ctx.createGain();
    humLfoAmt.gain.value = 0.05;
    humLfo.connect(humLfoAmt);
    humLfoAmt.connect(humGain.gain);
    hum.connect(humGain);
    humGain.connect(out);
    hum.start(now); humLfo.start(now);
    stopList.push(hum); stopList.push(humLfo);

    var wind = ctx.createBufferSource();
    wind.buffer = this._noiseBuffer(4);
    wind.loop = true;
    var windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 520;
    windFilter.Q.value = 0.6;
    var windGain = ctx.createGain();
    windGain.gain.value = 0.05;
    var windLfo = ctx.createOscillator();
    windLfo.frequency.value = 0.08;
    var windLfoAmt = ctx.createGain();
    windLfoAmt.gain.value = 0.032;
    windLfo.connect(windLfoAmt);
    windLfoAmt.connect(windGain.gain);
    wind.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(out);
    wind.start(now); windLfo.start(now);
    stopList.push(wind); stopList.push(windLfo);

    this._synth = { out: out, voices: voices, stop: stopList, chord: 0 };
    this._beat = 0;
    this._nextTime = now + 0.15;
    this._applyChord(0, now);

    var self = this;
    this._timer = setInterval(function () { self._schedule(); }, 180);
  },

  // D natural-minor flavoured progression: Dm - Bb - F - Am
  _chords: [
    [146.83, 220.00, 293.66],  // D3 A3 D4
    [116.54, 174.61, 233.08],  // Bb2 F3 Bb3
    [174.61, 261.63, 349.23],  // F3 C4 F4
    [110.00, 164.81, 261.63]   // A2 E3 C4
  ],
  _scale: [293.66, 329.63, 349.23, 440.00, 493.88, 587.33, 659.26],

  _applyChord: function (idx, when) {
    var c = this._chords[idx % this._chords.length];
    var v = this._synth.voices;
    for (var i = 0; i < v.length; i++) {
      v[i].frequency.setTargetAtTime(c[i], when, 1.1);
    }
  },

  _schedule: function () {
    if (!this._synth || !this.ctx) return;
    var ctx = this.ctx;
    var spb = 60 / this._bpm;
    var horizon = ctx.currentTime + 0.7;
    var guard = 0;
    while (this._nextTime < horizon && guard++ < 24) {
      var b = this._beat;
      if (b % 16 === 0) this._applyChord((b / 16) | 0, this._nextTime);
      // sparse bell melody
      if (b % 2 === 0 && Math.random() < 0.42) {
        this._pluck(this._scale[Util.randInt(0, this._scale.length - 1)], this._nextTime, 0.1);
      }
      // soft heartbeat on the downbeat
      if (b % 8 === 0) this._thump(this._nextTime);
      this._beat++;
      this._nextTime += spb;
    }
  },

  _pluck: function (freq, when, vol) {
    var ctx = this.ctx;
    var o = ctx.createOscillator();
    var o2 = ctx.createOscillator();
    o.type = 'sine'; o2.type = 'triangle';
    o.frequency.value = freq; o2.frequency.value = freq * 2.004;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(vol, when + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 1.6);
    var g2 = ctx.createGain();
    g2.gain.value = 0.3;
    o.connect(g); o2.connect(g2); g2.connect(g);
    g.connect(this._synth ? this._synth.out : this.musicBus);
    o.start(when); o2.start(when);
    o.stop(when + 1.7); o2.stop(when + 1.7);
  },

  _thump: function (when) {
    var ctx = this.ctx;
    var o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(78, when);
    o.frequency.exponentialRampToValueAtTime(42, when + 0.28);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(0.16, when + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.6);
    o.connect(g);
    g.connect(this._synth ? this._synth.out : this.musicBus);
    o.start(when); o.stop(when + 0.65);
  },

  /* ---------------- sound effects ---------------- */

  _tone: function (opt) {
    if (!this.ready || !this.sfxOn) return;
    var ctx = this.ctx, t0 = ctx.currentTime + (opt.delay || 0);
    var o = ctx.createOscillator();
    o.type = opt.type || 'sine';
    o.frequency.setValueAtTime(opt.f0, t0);
    if (opt.f1 && opt.f1 !== opt.f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, opt.f1), t0 + opt.dur);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(opt.vol === undefined ? 0.25 : opt.vol, t0 + Math.min(0.02, opt.dur * 0.25));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + opt.dur);
    var node = g;
    if (opt.filter) {
      var f = ctx.createBiquadFilter();
      f.type = opt.filter;
      f.frequency.value = opt.fc || 900;
      f.Q.value = opt.q || 1;
      g.connect(f);
      node = f;
    }
    o.connect(g);
    node.connect(this.sfxBus);
    o.start(t0);
    o.stop(t0 + opt.dur + 0.02);
  },

  _noise: function (opt) {
    if (!this.ready || !this.sfxOn) return;
    var ctx = this.ctx, t0 = ctx.currentTime + (opt.delay || 0);
    var src = ctx.createBufferSource();
    src.buffer = this._noiseBuffer(Math.max(0.05, opt.dur));
    var f = ctx.createBiquadFilter();
    f.type = opt.filter || 'bandpass';
    f.frequency.setValueAtTime(opt.fc || 1200, t0);
    if (opt.fc1) f.frequency.exponentialRampToValueAtTime(Math.max(40, opt.fc1), t0 + opt.dur);
    f.Q.value = opt.q || 1.1;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(opt.vol === undefined ? 0.18 : opt.vol, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + opt.dur);
    src.connect(f); f.connect(g); g.connect(this.sfxBus);
    src.start(t0);
    src.stop(t0 + opt.dur + 0.02);
  },

  play: function (n) {
    if (!this.ready || !this.sfxOn) return;
    switch (n) {
      case 'click':
        this._tone({ type: 'square', f0: 340, f1: 190, dur: 0.07, vol: 0.11, filter: 'lowpass', fc: 1800 });
        this._noise({ fc: 2400, fc1: 900, dur: 0.05, vol: 0.07 });
        break;
      case 'toggle':
        this._tone({ type: 'triangle', f0: 520, f1: 700, dur: 0.1, vol: 0.14 });
        break;
      case 'open':
        this._noise({ fc: 700, fc1: 260, dur: 0.28, vol: 0.09, q: 0.7 });
        this._tone({ type: 'triangle', f0: 180, f1: 300, dur: 0.22, vol: 0.1 });
        break;
      case 'launch':
        this._noise({ fc: 300, fc1: 1800, dur: 0.7, vol: 0.11, q: 0.6 });
        this._tone({ type: 'sawtooth', f0: 90, f1: 260, dur: 0.6, vol: 0.12, filter: 'lowpass', fc: 900 });
        break;
      case 'crystal':
        [784, 1047, 1319].forEach(function (f, i) {
          Sound._tone({ type: 'triangle', f0: f, dur: 0.3, vol: 0.14, delay: i * 0.05 });
        });
        break;
      case 'beacon':
        this._tone({ type: 'sine', f0: 523, dur: 0.5, vol: 0.16 });
        this._tone({ type: 'sine', f0: 784, dur: 0.4, vol: 0.09, delay: 0.05 });
        break;
      case 'crash':
        this._noise({ fc: 1400, fc1: 120, dur: 0.5, vol: 0.2, q: 0.5 });
        this._tone({ type: 'sawtooth', f0: 180, f1: 44, dur: 0.45, vol: 0.16, filter: 'lowpass', fc: 600 });
        break;
      case 'land':
        this._tone({ type: 'sine', f0: 320, f1: 180, dur: 0.3, vol: 0.18 });
        this._noise({ fc: 900, fc1: 300, dur: 0.24, vol: 0.1 });
        break;
      case 'lock':
        this._tone({ type: 'sine', f0: 70, dur: 0.5, vol: 0.24 });
        this._noise({ fc: 1600, fc1: 400, dur: 0.1, vol: 0.12 });
        break;
      case 'laser':
        this._tone({ type: 'sine', f0: 1200, dur: 0.42, vol: 0.2 });
        this._tone({ type: 'sine', f0: 1800, dur: 0.3, vol: 0.09, delay: 0.01 });
        break;
      case 'clear':
        [523, 659, 784, 1047].forEach(function (f, i) {
          Sound._tone({ type: 'triangle', f0: f, dur: 0.5, vol: 0.14, delay: i * 0.08 });
        });
        break;
      case 'fanfare':
        [392, 523, 659, 784, 1047].forEach(function (f, i) {
          Sound._tone({ type: 'triangle', f0: f, dur: 1.1, vol: 0.14, delay: i * 0.11 });
        });
        this._noise({ fc: 5200, fc1: 2200, dur: 1.1, vol: 0.05, q: 0.8, delay: 0.2 });
        break;
      case 'badge':
        [659, 988, 1319].forEach(function (f, i) {
          Sound._tone({ type: 'sine', f0: f, dur: 0.6, vol: 0.13, delay: i * 0.07 });
        });
        break;
      case 'why':
        this._tone({ type: 'sine', f0: 300, f1: 420, dur: 0.6, vol: 0.12 });
        break;
      case 'fail':
        this._tone({ type: 'sawtooth', f0: 220, f1: 70, dur: 0.7, vol: 0.14, filter: 'lowpass', fc: 700 });
        break;
    }
  },

  /* throttled variant for continuous path drawing */
  tick: function (now) {
    if (now - this._lastTick > 110) { this._lastTick = now; this.play('trace'); }
  }
};
