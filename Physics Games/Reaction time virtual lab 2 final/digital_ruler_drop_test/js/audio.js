/* ============================================================
   audio.js — fully offline sound.

   Music: an ambient synth pad generated in-browser from oscillators,
   so no audio file is required. If assets/audio/bgm.mp3 (or .ogg/.m4a)
   is present it overrides the procedural pad; if it is missing or fails
   to decode we fall back to the pad silently.

   SFX: short procedurally synthesised tones — no samples, no network.

   Browsers block audio until a user gesture, so the context stays
   suspended until the first tap/keypress and every entry point is
   safe to call before that happens.
   ============================================================ */
(function (global) {
  'use strict';

  var AC = global.AudioContext || global.webkitAudioContext;

  var ctx = null;
  var master = null;         // everything
  var musicBus = null;       // pad + file
  var sfxBus = null;

  var enabled = { music: true, sfx: true };
  var started = false;
  var unlocked = false;

  /* procedural pad nodes */
  var pad = null;
  /* optional file playback */
  var fileEl = null;
  var fileSrc = null;
  var usingFile = false;

  var MUSIC_GAIN = 0.17;
  var SFX_GAIN = 0.5;

  var CANDIDATES = ['assets/audio/bgm.mp3', 'assets/audio/bgm.ogg', 'assets/audio/bgm.m4a'];

  /* ---------------- context ---------------- */

  function ensureCtx() {
    if (ctx || !AC) return ctx;
    try {
      ctx = new AC();
    } catch (err) {
      ctx = null;
      return null;
    }
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);

    musicBus = ctx.createGain();
    musicBus.gain.value = 0;
    musicBus.connect(master);

    sfxBus = ctx.createGain();
    sfxBus.gain.value = enabled.sfx ? SFX_GAIN : 0;
    sfxBus.connect(master);

    return ctx;
  }

  /** Called from the first real user gesture. */
  function unlock() {
    if (unlocked) return;
    if (!ensureCtx()) return;
    unlocked = true;
    resume();
    if (enabled.music) startMusic();
  }

  function resume() {
    if (!ctx) return;
    if (ctx.state === 'suspended' && ctx.resume) {
      ctx.resume().catch(function () { /* ignore */ });
    }
  }

  function now() { return ctx ? ctx.currentTime : 0; }

  /* ---------------- procedural ambient pad ----------------
     Two detuned saw/triangle layers through a slowly sweeping lowpass,
     plus a sparse bell arpeggio on a fixed chord cycle. Reads as a
     calm instrument-room hum rather than a tune, so it can loop
     indefinitely without becoming tiresome.                        */

  var CHORDS = [
    [110.00, 164.81, 220.00, 277.18],  // A minor-ish
    [98.00,  146.83, 196.00, 246.94],  // G
    [87.31,  130.81, 174.61, 220.00],  // F
    [82.41,  123.47, 164.81, 207.65]   // E
  ];
  var BELL_STEPS = [880.00, 1108.73, 1318.51, 987.77, 1174.66, 880.00];

  function buildPad() {
    if (!ctx || pad) return;

    var out = ctx.createGain();
    out.gain.value = 1;
    out.connect(musicBus);

    /* gentle stereo width */
    var lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 520;
    lp.Q.value = 0.7;
    lp.connect(out);

    /* slow filter sweep — the "breathing" of the room */
    var lfo = ctx.createOscillator();
    var lfoGain = ctx.createGain();
    lfo.type = 'sine';
    lfo.frequency.value = 0.045;
    lfoGain.gain.value = 240;
    lfo.connect(lfoGain);
    lfoGain.connect(lp.frequency);
    lfo.start();

    /* four voices, retuned on each chord change */
    var voices = [];
    for (var i = 0; i < 4; i++) {
      var o1 = ctx.createOscillator();
      var o2 = ctx.createOscillator();
      var g = ctx.createGain();
      o1.type = 'triangle';
      o2.type = 'sawtooth';
      o2.detune.value = 7 + i * 3;
      g.gain.value = i === 0 ? 0.30 : 0.16;
      o1.connect(g); o2.connect(g); g.connect(lp);
      o1.start(); o2.start();
      voices.push({ o1: o1, o2: o2, g: g });
    }

    /* a very quiet noise bed for air */
    var noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.012;
    var nf = ctx.createBiquadFilter();
    nf.type = 'bandpass';
    nf.frequency.value = 640;
    nf.Q.value = 0.5;
    var noise = makeNoise();
    if (noise) {
      noise.connect(nf); nf.connect(noiseGain); noiseGain.connect(out);
      noise.start();
    }

    pad = {
      out: out, lp: lp, lfo: lfo, lfoGain: lfoGain,
      voices: voices, noise: noise,
      chordIx: 0, timer: null, bellIx: 0
    };

    stepChord();
  }

  function makeNoise() {
    if (!ctx) return null;
    var len = Math.floor(ctx.sampleRate * 2);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = buf.getChannelData(0);
    /* brownish noise — softer than white */
    var last = 0;
    for (var i = 0; i < len; i++) {
      var w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;
      d[i] = last * 3.2;
    }
    var src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    return src;
  }

  function stepChord() {
    if (!pad || !ctx) return;
    var chord = CHORDS[pad.chordIx % CHORDS.length];
    var t = now();
    pad.voices.forEach(function (v, i) {
      var f = chord[i % chord.length];
      v.o1.frequency.setTargetAtTime(f, t, 1.4);
      v.o2.frequency.setTargetAtTime(f * 2.005, t, 1.4);
    });

    /* one sparse bell every other chord */
    if (pad.chordIx % 2 === 1) {
      bell(BELL_STEPS[pad.bellIx % BELL_STEPS.length], 0.06);
      pad.bellIx++;
    }

    pad.chordIx++;
    pad.timer = setTimeout(stepChord, 7200);
  }

  function bell(freq, gain) {
    if (!ctx || !musicBus) return;
    var t = now();
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 3.2);
    o.connect(g); g.connect(musicBus);
    o.start(t);
    o.stop(t + 3.3);
  }

  function destroyPad() {
    if (!pad) return;
    if (pad.timer) clearTimeout(pad.timer);
    try {
      pad.voices.forEach(function (v) { v.o1.stop(); v.o2.stop(); });
      pad.lfo.stop();
      if (pad.noise) pad.noise.stop();
    } catch (err) { /* already stopped */ }
    try { pad.out.disconnect(); } catch (err) { /* ignore */ }
    pad = null;
  }

  /* ---------------- optional bgm file ---------------- */

  /** Probe the candidate paths once; resolve with a playable element or null. */
  function probeFile() {
    return CANDIDATES.reduce(function (chain, path) {
      return chain.then(function (found) {
        if (found) return found;
        return canPlay(path);
      });
    }, Promise.resolve(null));
  }

  function canPlay(path) {
    return new Promise(function (resolve) {
      var a = document.createElement('audio');
      var settled = false;
      function ok() { if (!settled) { settled = true; resolve(a); } }
      function no() { if (!settled) { settled = true; resolve(null); } }
      a.preload = 'auto';
      a.loop = true;
      a.addEventListener('canplaythrough', ok, { once: true });
      a.addEventListener('loadeddata', ok, { once: true });
      a.addEventListener('error', no, { once: true });
      setTimeout(no, 3500);
      a.src = path;
      /* load() can throw on some locked-down WebViews */
      try { a.load(); } catch (err) { no(); }
    });
  }

  var fileChecked = false;
  function checkForFile() {
    if (fileChecked) return Promise.resolve(usingFile);
    fileChecked = true;
    return probeFile().then(function (el) {
      if (!el || !ctx) return false;
      fileEl = el;
      fileEl.loop = true;
      try {
        fileSrc = ctx.createMediaElementSource(fileEl);
        fileSrc.connect(musicBus);
      } catch (err) {
        fileEl = null;
        return false;
      }
      usingFile = true;
      /* a drop-in track replaces the generated pad entirely */
      destroyPad();
      return true;
    }).catch(function () { return false; });
  }

  /* ---------------- music control ---------------- */

  function startMusic() {
    if (!ensureCtx() || !enabled.music) return;
    resume();

    checkForFile().then(function (hasFile) {
      if (!enabled.music) return;
      if (hasFile && fileEl) {
        var p = fileEl.play();
        if (p && p.catch) p.catch(function () {
          /* autoplay refused — fall back to the generated pad */
          usingFile = false;
          buildPad();
          fadeMusic(MUSIC_GAIN, 2.5);
        });
      } else {
        buildPad();
      }
      fadeMusic(MUSIC_GAIN, 2.5);
      started = true;
    });
  }

  function stopMusic() {
    if (!ctx) return;
    fadeMusic(0, 0.8);
    setTimeout(function () {
      if (enabled.music) return;   // re-enabled mid-fade
      if (usingFile && fileEl) {
        try { fileEl.pause(); } catch (err) { /* ignore */ }
      } else {
        destroyPad();
      }
      started = false;
    }, 850);
  }

  function fadeMusic(target, secs) {
    if (!musicBus || !ctx) return;
    var t = now();
    musicBus.gain.cancelScheduledValues(t);
    musicBus.gain.setValueAtTime(musicBus.gain.value, t);
    musicBus.gain.linearRampToValueAtTime(target, t + secs);
  }

  function setMusic(on) {
    enabled.music = !!on;
    if (!ctx) return;
    if (enabled.music) {
      if (!started) startMusic(); else fadeMusic(MUSIC_GAIN, 1.2);
    } else {
      stopMusic();
    }
  }

  function setSfx(on) {
    enabled.sfx = !!on;
    if (sfxBus && ctx) {
      var t = now();
      sfxBus.gain.cancelScheduledValues(t);
      sfxBus.gain.setValueAtTime(sfxBus.gain.value, t);
      sfxBus.gain.linearRampToValueAtTime(enabled.sfx ? SFX_GAIN : 0, t + 0.12);
    }
  }

  /* ---------------- sfx synthesis ---------------- */

  function tone(opts) {
    if (!ctx || !enabled.sfx || !sfxBus) return;
    var t = now() + (opts.delay || 0);
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    o.type = opts.type || 'sine';
    o.frequency.setValueAtTime(opts.f0, t);
    if (opts.f1 && opts.f1 !== opts.f0) {
      if (opts.slide === 'lin') o.frequency.linearRampToValueAtTime(opts.f1, t + opts.dur);
      else o.frequency.exponentialRampToValueAtTime(Math.max(1, opts.f1), t + opts.dur);
    }
    var peak = opts.gain === undefined ? 0.3 : opts.gain;
    var atk = opts.attack === undefined ? 0.006 : opts.attack;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + atk);
    g.gain.exponentialRampToValueAtTime(0.0001, t + opts.dur);

    var tail = g;
    if (opts.filter) {
      var f = ctx.createBiquadFilter();
      f.type = opts.filter;
      f.frequency.value = opts.cutoff || 1200;
      if (opts.q) f.Q.value = opts.q;
      g.connect(f);
      tail = f;
    }
    o.connect(g);
    tail.connect(sfxBus);
    o.start(t);
    o.stop(t + opts.dur + 0.03);
  }

  function noiseBurst(opts) {
    if (!ctx || !enabled.sfx || !sfxBus) return;
    var t = now() + (opts.delay || 0);
    var dur = opts.dur || 0.2;
    var len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    }
    var src = ctx.createBufferSource();
    src.buffer = buf;
    var f = ctx.createBiquadFilter();
    f.type = opts.filter || 'bandpass';
    f.frequency.setValueAtTime(opts.f0 || 900, t);
    if (opts.f1) f.frequency.exponentialRampToValueAtTime(Math.max(1, opts.f1), t + dur);
    f.Q.value = opts.q || 1;
    var g = ctx.createGain();
    g.gain.setValueAtTime(opts.gain === undefined ? 0.28 : opts.gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(sfxBus);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  var SFX = {
    /* UI */
    tap: function () { tone({ type: 'triangle', f0: 660, f1: 880, dur: 0.07, gain: 0.16 }); },
    back: function () { tone({ type: 'triangle', f0: 520, f1: 340, dur: 0.09, gain: 0.15 }); },
    toggle: function (on) {
      tone({ type: 'square', f0: on ? 520 : 400, f1: on ? 780 : 300, dur: 0.08, gain: 0.11 });
    },
    open: function () { tone({ type: 'sine', f0: 420, f1: 700, dur: 0.16, gain: 0.14 }); },

    /* arming the rig — a mechanical clunk plus a lamp tick */
    arm: function () {
      noiseBurst({ f0: 300, f1: 120, dur: 0.12, q: 1.2, gain: 0.22 });
      tone({ type: 'square', f0: 180, f1: 140, dur: 0.1, gain: 0.1 });
    },
    tick: function () { tone({ type: 'square', f0: 1400, dur: 0.025, gain: 0.05 }); },

    /* release: a short air whoosh */
    release: function () {
      noiseBurst({ filter: 'highpass', f0: 400, f1: 2600, dur: 0.3, q: 0.6, gain: 0.2 });
      tone({ type: 'sine', f0: 300, f1: 90, dur: 0.28, gain: 0.12 });
    },

    /* a clean catch — bright two-note ping */
    catchGood: function () {
      tone({ type: 'sine', f0: 1180, f1: 1180, dur: 0.16, gain: 0.24 });
      tone({ type: 'sine', f0: 1760, f1: 1760, dur: 0.3, gain: 0.17, delay: 0.05 });
      noiseBurst({ filter: 'highpass', f0: 3000, f1: 6000, dur: 0.1, gain: 0.09 });
    },
    /* an exceptional catch gets an extra sparkle */
    catchGreat: function () {
      SFX.catchGood();
      tone({ type: 'triangle', f0: 2340, dur: 0.28, gain: 0.13, delay: 0.11 });
      tone({ type: 'triangle', f0: 2960, dur: 0.34, gain: 0.1, delay: 0.19 });
    },

    /* the ruler ran out of scale */
    miss: function () {
      noiseBurst({ filter: 'lowpass', f0: 700, f1: 120, dur: 0.34, gain: 0.3 });
      tone({ type: 'sawtooth', f0: 150, f1: 62, dur: 0.36, gain: 0.14, filter: 'lowpass', cutoff: 500 });
    },

    /* moved before the release */
    falseStart: function () {
      tone({ type: 'square', f0: 220, f1: 200, dur: 0.14, gain: 0.16, filter: 'lowpass', cutoff: 900 });
      tone({ type: 'square', f0: 205, f1: 185, dur: 0.16, gain: 0.14, delay: 0.16, filter: 'lowpass', cutoff: 900 });
    },

    stageClear: function () {
      [523.25, 659.25, 783.99, 1046.50].forEach(function (f, i) {
        tone({ type: 'triangle', f0: f, dur: 0.42, gain: 0.2, delay: i * 0.1 });
      });
      noiseBurst({ filter: 'highpass', f0: 2400, f1: 7000, dur: 0.24, gain: 0.1, delay: 0.3 });
    },
    stageFail: function () {
      [392.00, 349.23, 293.66].forEach(function (f, i) {
        tone({ type: 'triangle', f0: f, dur: 0.34, gain: 0.16, delay: i * 0.13 });
      });
    },
    grade: function (n) {
      var base = [0, 880, 1108.73, 1318.51][Math.max(1, Math.min(3, n))] || 880;
      tone({ type: 'sine', f0: base, dur: 0.34, gain: 0.2 });
      tone({ type: 'sine', f0: base * 1.5, dur: 0.4, gain: 0.12, delay: 0.06 });
    },
    unlock: function () {
      tone({ type: 'triangle', f0: 660, f1: 990, dur: 0.2, gain: 0.18 });
      tone({ type: 'sine', f0: 1320, dur: 0.4, gain: 0.14, delay: 0.12 });
    }
  };

  function play(name, arg) {
    if (!ctx || !enabled.sfx) return;
    var fn = SFX[name];
    if (typeof fn === 'function') {
      try { fn(arg); } catch (err) { /* never let audio break gameplay */ }
    }
  }

  /* suspend the context when the app is backgrounded (WebView friendly) */
  document.addEventListener('visibilitychange', function () {
    if (!ctx) return;
    if (document.hidden) {
      fadeMusic(0, 0.4);
      if (usingFile && fileEl) { try { fileEl.pause(); } catch (err) { /* ignore */ } }
    } else if (enabled.music && started) {
      resume();
      if (usingFile && fileEl) {
        var p = fileEl.play();
        if (p && p.catch) p.catch(function () { /* ignore */ });
      }
      fadeMusic(MUSIC_GAIN, 1.5);
    }
  });

  global.Sound = {
    unlock: unlock,
    play: play,
    setMusic: setMusic,
    setSfx: setSfx,
    isMusicOn: function () { return enabled.music; },
    isSfxOn: function () { return enabled.sfx; },
    usingFile: function () { return usingFile; },
    supported: !!AC
  };
})(window);
