/* ============================================================
   Sound.

   Effects are synthesised with Web Audio, so the game ships
   with no audio files at all. Background music is a procedural
   ambient pad, also synthesised. If assets/audio/bgm.mp3 is
   present it takes over instead; if it is missing or fails to
   decode the pad keeps playing and nothing is reported.
   ============================================================ */
(function (global) {
  'use strict';

  var BGM_FILE = 'assets/audio/bgm.mp3';

  var Audio = {
    ctx: null,
    master: null,
    sfxBus: null,
    musicBus: null,

    sfxOn: true,
    musicOn: true,

    started: false,
    padNodes: [],
    padTimer: null,
    fileEl: null,
    fileSource: null,
    usingFile: false,

    /* Created lazily and only from a user gesture, per autoplay policy. */
    init: function () {
      if (this.ctx) return this.ctx;
      var Ctor = global.AudioContext || global.webkitAudioContext;
      if (!Ctor) return null;
      try {
        this.ctx = new Ctor();
      } catch (e) {
        return null;
      }

      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(this.ctx.destination);

      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.value = this.sfxOn ? 1 : 0;
      this.sfxBus.connect(this.master);

      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = 0;
      this.musicBus.connect(this.master);

      return this.ctx;
    },

    /* Browsers suspend the context until a gesture; call this on any input. */
    resume: function () {
      if (!this.ctx) this.init();
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(function () {});
      }
    },

    setSfx: function (on) {
      this.sfxOn = !!on;
      if (this.sfxBus) {
        this.sfxBus.gain.setTargetAtTime(this.sfxOn ? 1 : 0, this.ctx.currentTime, 0.02);
      }
    },

    setMusic: function (on) {
      this.musicOn = !!on;
      if (!this.ctx) return;
      var target = this.musicOn ? 1 : 0;
      this.musicBus.gain.cancelScheduledValues(this.ctx.currentTime);
      this.musicBus.gain.setTargetAtTime(target, this.ctx.currentTime, 0.5);
      if (this.fileEl) {
        if (this.musicOn) { this.fileEl.play().catch(function () {}); }
        else { this.fileEl.pause(); }
      }
    },

    /* ---------------- Effects ---------------- */

    tone: function (opts) {
      if (!this.sfxOn) return;
      if (!this.ctx) this.init();
      if (!this.ctx) return;

      var t0 = this.ctx.currentTime + (opts.delay || 0);
      var dur = opts.dur || 0.18;
      var osc = this.ctx.createOscillator();
      var gain = this.ctx.createGain();

      osc.type = opts.type || 'sine';
      osc.frequency.setValueAtTime(opts.freq, t0);
      if (opts.to) osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.to), t0 + dur);

      var peak = opts.gain === undefined ? 0.16 : opts.gain;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

      osc.connect(gain);
      if (opts.cutoff) {
        var lp = this.ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = opts.cutoff;
        gain.connect(lp);
        lp.connect(this.sfxBus);
      } else {
        gain.connect(this.sfxBus);
      }

      osc.start(t0);
      osc.stop(t0 + dur + 0.03);
    },

    noise: function (dur, cutoff, gainVal, delay) {
      if (!this.sfxOn) return;
      if (!this.ctx) this.init();
      if (!this.ctx) return;

      var t0 = this.ctx.currentTime + (delay || 0);
      var len = Math.floor(this.ctx.sampleRate * dur);
      var buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      var d = buf.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);

      var src = this.ctx.createBufferSource();
      src.buffer = buf;
      var lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = cutoff || 900;
      var g = this.ctx.createGain();
      g.gain.value = gainVal === undefined ? 0.1 : gainVal;

      src.connect(lp); lp.connect(g); g.connect(this.sfxBus);
      src.start(t0);
    },

    /* A soft plate-seating click when an option is chosen. */
    select: function () {
      this.tone({ freq: 520, to: 700, type: 'triangle', dur: 0.09, gain: 0.1 });
      this.noise(0.05, 2400, 0.05);
    },

    /* Rising major triad. */
    correct: function () {
      var self = this;
      [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) {
        self.tone({ freq: f, type: 'triangle', dur: 0.34, gain: 0.13, delay: i * 0.085, cutoff: 3200 });
      });
      this.tone({ freq: 130.8, type: 'sine', dur: 0.5, gain: 0.1 });
    },

    /* Low detuned buzz. */
    wrong: function () {
      this.tone({ freq: 180, to: 96, type: 'sawtooth', dur: 0.38, gain: 0.11, cutoff: 700 });
      this.tone({ freq: 174, to: 92, type: 'square', dur: 0.38, gain: 0.05, cutoff: 600, delay: 0.01 });
    },

    /* Two flat notes for "you missed a field". */
    warn: function () {
      this.tone({ freq: 420, type: 'triangle', dur: 0.13, gain: 0.11 });
      this.tone({ freq: 340, type: 'triangle', dur: 0.2, gain: 0.11, delay: 0.14 });
    },

    open: function () { this.tone({ freq: 380, to: 620, type: 'sine', dur: 0.14, gain: 0.09 }); },
    close: function () { this.tone({ freq: 560, to: 320, type: 'sine', dur: 0.14, gain: 0.09 }); },

    fanfare: function () {
      var self = this;
      var notes = [392, 523.25, 659.25, 783.99, 1046.5, 1318.5];
      notes.forEach(function (f, i) {
        self.tone({ freq: f, type: 'triangle', dur: 0.42, gain: 0.14, delay: i * 0.11, cutoff: 4000 });
        self.tone({ freq: f / 2, type: 'sine', dur: 0.42, gain: 0.07, delay: i * 0.11 });
      });
      this.noise(0.7, 5200, 0.05, 0.1);
    },

    /* ---------------- Music ---------------- */

    startMusic: function () {
      if (this.started) return;
      if (!this.ctx) this.init();
      if (!this.ctx) return;
      this.started = true;

      var self = this;
      this.tryFile(function (ok) {
        if (!ok) self.startPad();
        if (self.musicOn) {
          self.musicBus.gain.cancelScheduledValues(self.ctx.currentTime);
          self.musicBus.gain.setTargetAtTime(1, self.ctx.currentTime, 1.2);
        }
      });
    },

    /* Optional drop-in track. Any failure falls through to the pad. */
    tryFile: function (done) {
      var self = this;
      var el = new global.Audio();
      var settled = false;

      function settle(ok) {
        if (settled) return;
        settled = true;
        if (!ok) { el.src = ''; done(false); return; }
        try {
          self.fileEl = el;
          self.fileSource = self.ctx.createMediaElementSource(el);
          var g = self.ctx.createGain();
          g.gain.value = 0.55;
          self.fileSource.connect(g);
          g.connect(self.musicBus);
          el.loop = true;
          if (self.musicOn) el.play().catch(function () {});
          self.usingFile = true;
          done(true);
        } catch (e) {
          done(false);
        }
      }

      el.preload = 'auto';
      el.loop = true;
      el.addEventListener('canplaythrough', function () { settle(true); }, { once: true });
      el.addEventListener('error', function () { settle(false); }, { once: true });
      setTimeout(function () { settle(false); }, 3500);
      el.src = BGM_FILE;
      el.load();
    },

    /* Slow evolving pad: a held chord under a lowpass that breathes, with
       sparse bell tones drifting over the top like drips in a quiet lab. */
    startPad: function () {
      var ctx = this.ctx;
      var self = this;

      var padGain = ctx.createGain();
      padGain.gain.value = 0.0001;
      padGain.gain.setTargetAtTime(0.13, ctx.currentTime, 2.5);

      var lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 620;
      lp.Q.value = 0.7;

      /* LFO opens and closes the filter over about twenty seconds. */
      var lfo = ctx.createOscillator();
      var lfoGain = ctx.createGain();
      lfo.frequency.value = 0.048;
      lfoGain.gain.value = 280;
      lfo.connect(lfoGain);
      lfoGain.connect(lp.frequency);
      lfo.start();

      padGain.connect(lp);
      lp.connect(this.musicBus);

      /* D minor add9, voiced low and wide. */
      var roots = [73.42, 110.0, 146.83, 220.0, 246.94];
      roots.forEach(function (f, i) {
        [-4, 4].forEach(function (detune) {
          var o = ctx.createOscillator();
          o.type = i < 2 ? 'sine' : 'triangle';
          o.frequency.value = f;
          o.detune.value = detune;
          var g = ctx.createGain();
          g.gain.value = 0.22 / (i + 1.4);
          o.connect(g);
          g.connect(padGain);
          o.start();
          self.padNodes.push(o);
        });
      });

      self.padNodes.push(lfo);

      /* Occasional soft bell, always a note from the same scale. */
      var scale = [587.33, 698.46, 880.0, 1046.5, 1174.66];
      function drip() {
        if (!self.musicOn) { schedule(); return; }
        var f = scale[Math.floor(Math.random() * scale.length)];
        var t0 = ctx.currentTime;
        var o = ctx.createOscillator();
        var g = ctx.createGain();
        var bp = ctx.createBiquadFilter();
        bp.type = 'lowpass';
        bp.frequency.value = 2600;
        o.type = 'sine';
        o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(0.055, t0 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.4);
        o.connect(g); g.connect(bp); bp.connect(self.musicBus);
        o.start(t0); o.stop(t0 + 2.6);
        schedule();
      }
      function schedule() {
        self.padTimer = setTimeout(drip, 3800 + Math.random() * 6200);
      }
      schedule();
    },

    stopMusic: function () {
      if (this.padTimer) { clearTimeout(this.padTimer); this.padTimer = null; }
      this.padNodes.forEach(function (n) { try { n.stop(); } catch (e) {} });
      this.padNodes = [];
      if (this.fileEl) { this.fileEl.pause(); }
      this.started = false;
    }
  };

  global.Sound = Audio;
})(window);
