/* =============================================================================
   Leaf Sorter — audio
   Everything is synthesised with Web Audio, so the game needs no audio files
   at all. If assets/audio/bgm.mp3 (or .ogg / .m4a) happens to exist it is used
   instead of the procedural pad; if it is missing or fails we fall straight
   back to the synth without an error reaching the player.
   ========================================================================== */
(function (global) {
  'use strict';

  var BGM_CANDIDATES = [
    'assets/audio/bgm.mp3',
    'assets/audio/bgm.ogg',
    'assets/audio/bgm.m4a'
  ];

  var Audio2 = {
    ctx: null,
    master: null,
    musicBus: null,
    sfxBus: null,
    ready: false,
    musicOn: true,
    sfxOn: true,
    musicRunning: false,
    fileEl: null,
    usingFile: false,
    _nodes: [],
    _timer: null,
    _step: 0
  };

  /* ------------------------------------------------------------------ setup */
  Audio2.init = function () {
    if (this.ready) { return true; }
    var AC = global.AudioContext || global.webkitAudioContext;
    if (!AC) { return false; }
    try {
      this.ctx = new AC();
    } catch (e) {
      return false;
    }
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(this.ctx.destination);

    this.musicBus = this.ctx.createGain();
    this.musicBus.gain.value = 0;
    this.musicBus.connect(this.master);

    this.sfxBus = this.ctx.createGain();
    this.sfxBus.gain.value = 0.85;
    this.sfxBus.connect(this.master);

    this.ready = true;
    return true;
  };

  Audio2.resume = function () {
    if (!this.ready && !this.init()) { return; }
    if (this.ctx.state === 'suspended') {
      try { this.ctx.resume(); } catch (e) { /* ignored */ }
    }
  };

  /* ------------------------------------------------------- tiny synth utils */
  function env(node, t0, attack, hold, release, peak) {
    var g = node.gain;
    g.cancelScheduledValues(t0);
    g.setValueAtTime(0.0001, t0);
    g.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t0 + attack);
    g.setValueAtTime(Math.max(peak, 0.0002), t0 + attack + hold);
    g.exponentialRampToValueAtTime(0.0001, t0 + attack + hold + release);
  }

  Audio2.tone = function (freq, opts) {
    if (!this.sfxOn || !this.ready) { return; }
    opts = opts || {};
    var t0 = this.ctx.currentTime + (opts.delay || 0);
    var osc = this.ctx.createOscillator();
    var gain = this.ctx.createGain();
    var filt = this.ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = opts.cutoff || 4200;
    osc.type = opts.type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (opts.glide) { osc.frequency.exponentialRampToValueAtTime(opts.glide, t0 + (opts.dur || 0.2)); }
    if (opts.detune) { osc.detune.value = opts.detune; }
    osc.connect(filt); filt.connect(gain); gain.connect(this.sfxBus);
    env(gain, t0, opts.attack || 0.008, opts.hold || 0.02, opts.release || (opts.dur || 0.22), opts.vol || 0.22);
    osc.start(t0);
    osc.stop(t0 + (opts.attack || 0.008) + (opts.hold || 0.02) + (opts.release || (opts.dur || 0.22)) + 0.05);
  };

  Audio2.noise = function (opts) {
    if (!this.sfxOn || !this.ready) { return; }
    opts = opts || {};
    var dur = opts.dur || 0.22;
    var rate = this.ctx.sampleRate;
    var buf = this.ctx.createBuffer(1, Math.max(1, Math.floor(rate * dur)), rate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    }
    var src = this.ctx.createBufferSource();
    src.buffer = buf;
    var filt = this.ctx.createBiquadFilter();
    filt.type = opts.filter || 'bandpass';
    filt.frequency.value = opts.freq || 1600;
    filt.Q.value = opts.q || 0.9;
    var gain = this.ctx.createGain();
    gain.gain.value = opts.vol || 0.16;
    src.connect(filt); filt.connect(gain); gain.connect(this.sfxBus);
    src.start();
  };

  /* ------------------------------------------------------------------- sfx  */
  var SFX = {
    tap: function () { Audio2.tone(660, { type: 'triangle', vol: 0.1, dur: 0.09, cutoff: 3000 }); },
    pick: function () {
      Audio2.tone(420, { type: 'triangle', vol: 0.13, dur: 0.1, glide: 620 });
      Audio2.noise({ dur: 0.1, freq: 2600, vol: 0.05 });
    },
    hoverBin: function () { Audio2.tone(520, { type: 'sine', vol: 0.06, dur: 0.07 }); },
    correct: function () {
      var notes = [523.25, 659.25, 783.99, 1046.5];
      for (var i = 0; i < notes.length; i++) {
        Audio2.tone(notes[i], {
          type: 'sine', vol: 0.17, delay: i * 0.062, dur: 0.3, hold: 0.03, cutoff: 6000
        });
      }
      Audio2.noise({ dur: 0.3, freq: 5200, vol: 0.05, filter: 'highpass' });
    },
    wrong: function () {
      Audio2.tone(196, { type: 'sawtooth', vol: 0.16, dur: 0.32, glide: 118, cutoff: 900 });
      Audio2.tone(146, { type: 'square', vol: 0.07, dur: 0.3, cutoff: 700, delay: 0.04 });
      Audio2.noise({ dur: 0.24, freq: 320, vol: 0.1, filter: 'lowpass' });
    },
    star: function (i) {
      Audio2.tone([784, 988, 1319][i % 3], { type: 'sine', vol: 0.2, dur: 0.7, hold: 0.05, cutoff: 8000 });
    },
    complete: function () {
      var seq = [392, 523.25, 659.25, 784, 1046.5];
      for (var i = 0; i < seq.length; i++) {
        Audio2.tone(seq[i], { type: 'triangle', vol: 0.16, delay: i * 0.11, dur: 0.55, hold: 0.05 });
        Audio2.tone(seq[i] / 2, { type: 'sine', vol: 0.1, delay: i * 0.11, dur: 0.6 });
      }
    },
    fail: function () {
      var seq = [392, 349, 294, 233];
      for (var i = 0; i < seq.length; i++) {
        Audio2.tone(seq[i], { type: 'triangle', vol: 0.13, delay: i * 0.14, dur: 0.4, cutoff: 1800 });
      }
    },
    unlock: function () {
      Audio2.tone(880, { type: 'sine', vol: 0.16, dur: 0.4 });
      Audio2.tone(1320, { type: 'sine', vol: 0.12, dur: 0.5, delay: 0.09 });
      Audio2.noise({ dur: 0.4, freq: 4200, vol: 0.05, filter: 'highpass' });
    }
  };

  Audio2.play = function (name, arg) {
    if (!this.sfxOn) { return; }
    if (!this.ready && !this.init()) { return; }
    this.resume();
    if (SFX[name]) { SFX[name](arg); }
  };

  /* --------------------------------------------------- procedural ambience  */
  /* A slow forest pad: two detuned saw voices through a breathing lowpass,
     a wandering pentatonic bell, plus filtered noise for wind.               */
  var CHORDS = [
    [110.00, 164.81, 261.63],   /* A2  E3  C4  */
    [98.00, 146.83, 246.94],    /* G2  D3  B3  */
    [130.81, 196.00, 329.63],   /* C3  G3  E4  */
    [87.31, 130.81, 220.00]     /* F2  C3  A3  */
  ];
  var BELLS = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];

  Audio2._startProcedural = function () {
    var ctx = this.ctx, self = this;

    var padGain = ctx.createGain();
    padGain.gain.value = 0.0001;
    var lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 700;
    lp.Q.value = 0.8;
    padGain.connect(lp);
    lp.connect(this.musicBus);

    /* breathing filter */
    var lfo = ctx.createOscillator();
    var lfoGain = ctx.createGain();
    lfo.frequency.value = 0.055;
    lfoGain.gain.value = 330;
    lfo.connect(lfoGain); lfoGain.connect(lp.frequency);
    lfo.start();

    var voices = [];
    for (var v = 0; v < 3; v++) {
      var o1 = ctx.createOscillator(); o1.type = 'sawtooth'; o1.detune.value = -6;
      var o2 = ctx.createOscillator(); o2.type = 'triangle'; o2.detune.value = 7;
      var g = ctx.createGain(); g.gain.value = v === 0 ? 0.09 : 0.055;
      o1.connect(g); o2.connect(g); g.connect(padGain);
      o1.start(); o2.start();
      voices.push({ o1: o1, o2: o2 });
    }

    /* wind bed */
    var wRate = ctx.sampleRate;
    var wBuf = ctx.createBuffer(1, wRate * 4, wRate);
    var wData = wBuf.getChannelData(0);
    var last = 0;
    for (var i = 0; i < wData.length; i++) {
      last = last * 0.986 + (Math.random() * 2 - 1) * 0.014;
      wData[i] = last * 6;
    }
    var wind = ctx.createBufferSource();
    wind.buffer = wBuf; wind.loop = true;
    var wFilt = ctx.createBiquadFilter();
    wFilt.type = 'bandpass'; wFilt.frequency.value = 480; wFilt.Q.value = 0.6;
    var wGain = ctx.createGain(); wGain.gain.value = 0.16;
    wind.connect(wFilt); wFilt.connect(wGain); wGain.connect(this.musicBus);
    wind.start();

    var wLfo = ctx.createOscillator();
    var wLfoG = ctx.createGain();
    wLfo.frequency.value = 0.08; wLfoG.gain.value = 0.09;
    wLfo.connect(wLfoG); wLfoG.connect(wGain.gain);
    wLfo.start();

    this._nodes = [lfo, wLfo, wind, padGain, lp];
    for (var k = 0; k < voices.length; k++) {
      this._nodes.push(voices[k].o1, voices[k].o2);
    }

    padGain.gain.setTargetAtTime(0.5, ctx.currentTime, 3);

    var bellDue = 2;
    function advance() {
      if (!self.musicRunning) { return; }
      var chord = CHORDS[self._step % CHORDS.length];
      var t = self.ctx.currentTime;
      for (var n = 0; n < voices.length; n++) {
        voices[n].o1.frequency.setTargetAtTime(chord[n], t, 1.6);
        voices[n].o2.frequency.setTargetAtTime(chord[n] * 2, t, 1.6);
      }
      self._step++;
      bellDue--;
      if (bellDue <= 0 && self.musicOn) {
        bellDue = 2 + Math.floor(Math.random() * 3);
        self._bell(BELLS[Math.floor(Math.random() * BELLS.length)]);
      }
    }
    advance();
    this._timer = global.setInterval(advance, 7000);
  };

  Audio2._bell = function (freq) {
    if (!this.ready) { return; }
    var t0 = this.ctx.currentTime + 0.4;
    var osc = this.ctx.createOscillator();
    var g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    var g2 = this.ctx.createGain();
    g2.gain.value = 0.5;
    osc.connect(g); g.connect(g2); g2.connect(this.musicBus);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.09, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 3.2);
    osc.start(t0);
    osc.stop(t0 + 3.4);
  };

  Audio2._stopProcedural = function () {
    if (this._timer) { global.clearInterval(this._timer); this._timer = null; }
    for (var i = 0; i < this._nodes.length; i++) {
      try { if (this._nodes[i].stop) { this._nodes[i].stop(); } } catch (e) { /* ignored */ }
      try { this._nodes[i].disconnect(); } catch (e2) { /* ignored */ }
    }
    this._nodes = [];
  };

  /* ------------------------------------------- optional drop-in music file */
  Audio2.probeMusicFile = function (done) {
    var idx = 0;
    var self = this;
    function tryNext() {
      if (idx >= BGM_CANDIDATES.length) { done(null); return; }
      var url = BGM_CANDIDATES[idx++];
      var el = new global.Audio();
      var settled = false;
      var give = function (ok) {
        if (settled) { return; }
        settled = true;
        el.removeEventListener('canplay', onOk);
        el.removeEventListener('error', onErr);
        if (ok) { done(el); } else { tryNext(); }
      };
      var onOk = function () { give(true); };
      var onErr = function () { give(false); };
      el.addEventListener('canplay', onOk);
      el.addEventListener('error', onErr);
      el.loop = true;
      el.preload = 'auto';
      el.src = url;
      try { el.load(); } catch (e) { give(false); }
      global.setTimeout(function () { if (!settled) { give(false); } }, 2500);
    }
    tryNext();
  };

  Audio2.startMusic = function () {
    if (!this.musicOn) { return; }
    if (!this.ready && !this.init()) { return; }
    this.resume();
    if (this.musicRunning) {
      this.musicBus.gain.setTargetAtTime(0.55, this.ctx.currentTime, 1.2);
      if (this.usingFile && this.fileEl) { this.fileEl.play().catch(function () {}); }
      return;
    }
    this.musicRunning = true;

    var self = this;
    if (this.fileEl === null) {
      this.fileEl = false; /* "probe in flight" */
      this.probeMusicFile(function (el) {
        self.fileEl = el || false;
        if (el && self.musicRunning) {
          self.usingFile = true;
          self._stopProcedural();
          try {
            var src = self.ctx.createMediaElementSource(el);
            src.connect(self.musicBus);
          } catch (e) {
            el.volume = 0.5; /* fall back to element volume */
          }
          el.play().catch(function () { self.usingFile = false; self._startProcedural(); });
        }
      });
    }
    if (this.usingFile && this.fileEl) {
      this.fileEl.play().catch(function () {});
    } else {
      this._startProcedural();
    }
    this.musicBus.gain.setTargetAtTime(0.55, this.ctx.currentTime, 2.5);
  };

  Audio2.stopMusic = function () {
    if (!this.ready) { this.musicRunning = false; return; }
    this.musicBus.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.4);
    var self = this;
    global.setTimeout(function () {
      if (self.musicOn) { return; }
      self.musicRunning = false;
      self._stopProcedural();
      if (self.usingFile && self.fileEl) { try { self.fileEl.pause(); } catch (e) {} }
    }, 700);
  };

  Audio2.setMusic = function (on) {
    this.musicOn = !!on;
    if (this.musicOn) { this.startMusic(); } else { this.stopMusic(); }
  };

  Audio2.setSfx = function (on) {
    this.sfxOn = !!on;
    if (this.ready) { this.sfxBus.gain.value = this.sfxOn ? 0.85 : 0; }
  };

  Audio2.duck = function (amount, seconds) {
    if (!this.ready || !this.musicRunning) { return; }
    var t = this.ctx.currentTime;
    this.musicBus.gain.setTargetAtTime(0.55 * amount, t, 0.1);
    this.musicBus.gain.setTargetAtTime(0.55, t + (seconds || 0.6), 0.5);
  };

  global.LeafAudio = Audio2;
})(window);
