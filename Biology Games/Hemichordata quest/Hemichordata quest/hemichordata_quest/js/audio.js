/* ===========================================================================
   Audio — everything is synthesised in the browser with Web Audio, so the
   game ships with no audio files at all.

   If assets/audio/bgm.mp3 is dropped in, it takes over from the generated
   score automatically. If it is absent (the normal case) the 404 is caught
   and the procedural bed keeps playing.

   The bed is a low tidal wash: a slow filtered-noise surge, a warm minor pad,
   and sparse pentatonic drips over the top.
   ======================================================================== */
(function (global) {
  'use strict';

  var ctx = null;
  var master = null, musicBus = null, sfxBus = null;
  var started = false;
  var musicOn = true, sfxOn = true;
  var nodes = [];             /* long-lived generator nodes */
  var accentTimer = null;
  var htmlBgm = null;         /* optional assets/audio/bgm.mp3 */
  var usingFile = false;

  /* D minor pentatonic, two octaves — calm, unhurried, slightly briny. */
  var SCALE = [146.83, 174.61, 196.00, 220.00, 261.63, 293.66, 349.23, 392.00, 440.00];

  function ensureCtx() {
    if (ctx) return ctx;
    var AC = global.AudioContext || global.webkitAudioContext;
    if (!AC) return null;
    try { ctx = new AC(); } catch (e) { return null; }

    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);

    musicBus = ctx.createGain();
    musicBus.gain.value = musicOn ? 0.5 : 0;
    musicBus.connect(master);

    sfxBus = ctx.createGain();
    sfxBus.gain.value = sfxOn ? 0.85 : 0;
    sfxBus.connect(master);

    return ctx;
  }

  function noiseBuffer(seconds) {
    var len = Math.floor(ctx.sampleRate * seconds);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = buf.getChannelData(0);
    var last = 0;
    for (var i = 0; i < len; i++) {
      var white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;      /* brown-ish, sounds like water */
      d[i] = last * 3.2;
    }
    return buf;
  }

  /* ---- the generated bed ------------------------------------------------ */
  function buildBed() {
    if (!ctx || usingFile || nodes.length) return;

    /* 1. tidal wash */
    var src = ctx.createBufferSource();
    src.buffer = noiseBuffer(6);
    src.loop = true;

    var band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 420;
    band.Q.value = 0.7;

    var washGain = ctx.createGain();
    washGain.gain.value = 0.0001;

    var lfo = ctx.createOscillator();
    lfo.frequency.value = 0.085;                /* one surge every ~12s */
    var lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.055;
    lfo.connect(lfoGain).connect(washGain.gain);

    var sweep = ctx.createOscillator();
    sweep.frequency.value = 0.05;
    var sweepGain = ctx.createGain();
    sweepGain.gain.value = 260;
    sweep.connect(sweepGain).connect(band.frequency);

    src.connect(band).connect(washGain).connect(musicBus);
    washGain.gain.setValueAtTime(0.0001, ctx.currentTime);
    washGain.gain.linearRampToValueAtTime(0.075, ctx.currentTime + 4);

    src.start(); lfo.start(); sweep.start();
    nodes.push(src, lfo, sweep);

    /* 2. warm pad — D minor add9 spread low */
    var padFilter = ctx.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.value = 620;
    padFilter.Q.value = 0.6;
    var padGain = ctx.createGain();
    padGain.gain.value = 0.0001;
    padFilter.connect(padGain).connect(musicBus);
    padGain.gain.linearRampToValueAtTime(0.10, ctx.currentTime + 6);

    [73.42, 110.0, 146.83, 220.0, 329.63].forEach(function (f, i) {
      var o = ctx.createOscillator();
      o.type = i > 2 ? 'sine' : 'triangle';
      o.frequency.value = f;
      o.detune.value = (i % 2 ? 6 : -6);
      var g = ctx.createGain();
      g.gain.value = 0.30 / (i + 1.4);
      /* very slow tremolo so the chord breathes */
      var t = ctx.createOscillator();
      t.frequency.value = 0.03 + i * 0.011;
      var tg = ctx.createGain();
      tg.gain.value = g.gain.value * 0.55;
      t.connect(tg).connect(g.gain);
      o.connect(g).connect(padFilter);
      o.start(); t.start();
      nodes.push(o, t);
    });

    var padSweep = ctx.createOscillator();
    padSweep.frequency.value = 0.021;
    var padSweepGain = ctx.createGain();
    padSweepGain.gain.value = 240;
    padSweep.connect(padSweepGain).connect(padFilter.frequency);
    padSweep.start();
    nodes.push(padSweep);

    /* 3. sparse drips */
    scheduleAccent();
  }

  function scheduleAccent() {
    clearTimeout(accentTimer);
    accentTimer = setTimeout(function () {
      if (ctx && musicOn && !usingFile && ctx.state === 'running') drip();
      scheduleAccent();
    }, 2600 + Math.random() * 5200);
  }

  function drip() {
    var f = SCALE[3 + Math.floor(Math.random() * (SCALE.length - 3))];
    var t = ctx.currentTime;
    var o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(f * 1.01, t);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.09);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.085, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.9);
    var lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2200;
    o.connect(g).connect(lp).connect(musicBus);
    o.start(t); o.stop(t + 2.0);
  }

  /* ---- one-shot helpers -------------------------------------------------- */
  function tone(opts) {
    if (!ctx || !sfxOn) return;
    var t = ctx.currentTime + (opts.delay || 0);
    var o = ctx.createOscillator();
    o.type = opts.type || 'sine';
    o.frequency.setValueAtTime(opts.from, t);
    if (opts.to) o.frequency.exponentialRampToValueAtTime(opts.to, t + (opts.dur || 0.2));
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(opts.gain || 0.2, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (opts.dur || 0.2));
    var out = g;
    if (opts.filter) {
      var f = ctx.createBiquadFilter();
      f.type = opts.filter;
      f.frequency.value = opts.cutoff || 1200;
      g.connect(f); out = f;
    }
    o.connect(g);
    out.connect(sfxBus);
    o.start(t); o.stop(t + (opts.dur || 0.2) + 0.05);
  }

  function noiseBurst(dur, cutoff, gain, type) {
    if (!ctx || !sfxOn) return;
    var t = ctx.currentTime;
    var s = ctx.createBufferSource();
    s.buffer = noiseBuffer(Math.max(0.15, dur));
    var f = ctx.createBiquadFilter();
    f.type = type || 'bandpass';
    f.frequency.value = cutoff;
    f.Q.value = 0.9;
    var g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(sfxBus);
    s.start(t); s.stop(t + dur + 0.05);
  }

  var SFX = {
    tap: function () { tone({ from: 340, to: 220, dur: 0.09, gain: 0.13, type: 'triangle' }); },
    open: function () { tone({ from: 220, to: 440, dur: 0.22, gain: 0.12, type: 'triangle' }); },
    close: function () { tone({ from: 420, to: 190, dur: 0.18, gain: 0.11, type: 'triangle' }); },
    correct: function () {
      [0, 0.09, 0.19].forEach(function (d, i) {
        tone({ from: [392, 523.25, 659.25][i], dur: 0.42, gain: 0.17, type: 'triangle', delay: d });
      });
      noiseBurst(0.4, 2600, 0.05);
    },
    wrong: function () {
      tone({ from: 150, to: 74, dur: 0.36, gain: 0.22, type: 'sawtooth', filter: 'lowpass', cutoff: 520 });
      noiseBurst(0.28, 300, 0.13, 'lowpass');
    },
    hint: function () {
      [0, 0.07].forEach(function (d, i) {
        tone({ from: [880, 1174.66][i], to: [1318.51, 1567.98][i], dur: 0.5, gain: 0.09, type: 'sine', delay: d });
      });
    },
    grain: function (i) {
      tone({ from: 620 + (i || 0) * 55, to: 1250 + (i || 0) * 70, dur: 0.13, gain: 0.075, type: 'sine' });
    },
    dig: function () { noiseBurst(0.22, 700, 0.09); },
    complete: function () {
      [0, 0.13, 0.26, 0.42].forEach(function (d, i) {
        tone({ from: [293.66, 440, 587.33, 880][i], dur: 0.85, gain: 0.17, type: 'triangle', delay: d });
      });
      noiseBurst(1.1, 1500, 0.10);
    }
  };

  /* ---- optional bgm.mp3 -------------------------------------------------- */
  function tryFileBgm() {
    if (htmlBgm) return;
    var a = new Audio();
    a.loop = true;
    a.preload = 'auto';
    a.volume = 0;
    a.addEventListener('canplaythrough', function () {
      usingFile = true;
      htmlBgm = a;
      teardownBed();
      if (musicOn && started) fadeFile(0.55);
    }, { once: true });
    /* Missing file is the expected case — swallow it quietly. */
    a.addEventListener('error', function () { a.src = ''; }, { once: true });
    a.src = 'assets/audio/bgm.mp3';
    a.load();
  }

  function fadeFile(target) {
    if (!htmlBgm) return;
    if (target > 0) {
      var p = htmlBgm.play();
      if (p && p.catch) p.catch(function () { /* gesture not granted yet */ });
    }
    var step = (target - htmlBgm.volume) / 18;
    var n = 0;
    var iv = setInterval(function () {
      n++;
      var v = htmlBgm.volume + step;
      htmlBgm.volume = Math.max(0, Math.min(1, v));
      if (n >= 18) {
        clearInterval(iv);
        htmlBgm.volume = Math.max(0, Math.min(1, target));
        if (target === 0) htmlBgm.pause();
      }
    }, 30);
  }

  function teardownBed() {
    nodes.forEach(function (n) { try { n.stop(); } catch (e) { /* already stopped */ } });
    nodes.length = 0;
    clearTimeout(accentTimer);
  }

  var Audio_ = {
    /* Called from the first real user gesture. */
    unlock: function () {
      if (!ensureCtx()) return;
      if (ctx.state === 'suspended') ctx.resume();
      if (!started) {
        started = true;
        tryFileBgm();
        if (musicOn) {
          if (usingFile) fadeFile(0.55); else buildBed();
        }
      } else if (musicOn && usingFile) {
        fadeFile(0.55);
      }
    },

    setMusic: function (on) {
      musicOn = !!on;
      if (!ctx) return;
      if (usingFile) {
        fadeFile(musicOn ? 0.55 : 0);
      } else {
        musicBus.gain.setTargetAtTime(musicOn ? 0.5 : 0, ctx.currentTime, 0.25);
        if (musicOn && started && !nodes.length) buildBed();
      }
    },

    setSfx: function (on) {
      sfxOn = !!on;
      if (ctx) sfxBus.gain.setTargetAtTime(sfxOn ? 0.85 : 0, ctx.currentTime, 0.05);
    },

    play: function (name, arg) {
      if (!ctx || !sfxOn) return;
      if (ctx.state === 'suspended') ctx.resume();
      var fn = SFX[name];
      if (fn) fn(arg);
    },

    isMusicOn: function () { return musicOn; },
    isSfxOn: function () { return sfxOn; }
  };

  global.QuestAudio = Audio_;
})(window);
