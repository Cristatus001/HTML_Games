/* =====================================================================
   DECISION CARDS - audio
   Procedural Web Audio ambient score + SFX, zero audio files required.
   If assets/audio/bgm.mp3 exists it transparently replaces the synth pad.
   ===================================================================== */
(function (global) {
  "use strict";

  var OPTIONAL_BGM = "assets/audio/bgm.mp3";

  var Audio2 = {
    ctx: null,
    master: null,
    musicGain: null,
    sfxGain: null,
    started: false,
    musicOn: true,
    sfxOn: true,
    fileEl: null,
    usingFile: false,
    _nodes: [],
    _timer: null,
    _step: 0,
    _chordIdx: 0,
    onMusicSource: null
  };

  /* ---------------- context ---------------- */
  function ensureCtx() {
    if (Audio2.ctx) return Audio2.ctx;
    var AC = global.AudioContext || global.webkitAudioContext;
    if (!AC) return null;
    try {
      Audio2.ctx = new AC();
    } catch (e) {
      return null;
    }
    var ctx = Audio2.ctx;

    Audio2.master = ctx.createGain();
    Audio2.master.gain.value = 0.9;
    Audio2.master.connect(ctx.destination);

    Audio2.musicGain = ctx.createGain();
    Audio2.musicGain.gain.value = 0;
    Audio2.musicGain.connect(Audio2.master);

    Audio2.sfxGain = ctx.createGain();
    Audio2.sfxGain.gain.value = 0.85;
    Audio2.sfxGain.connect(Audio2.master);

    return ctx;
  }

  function resume() {
    var ctx = ensureCtx();
    if (ctx && ctx.state === "suspended" && ctx.resume) {
      ctx.resume()["catch"](function () {});
    }
    return ctx;
  }

  /* ---------------- SFX ---------------- */
  function blip(opts) {
    if (!Audio2.sfxOn) return;
    var ctx = resume();
    if (!ctx) return;
    var t0 = ctx.currentTime + (opts.delay || 0);
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = opts.type || "sine";
    osc.frequency.setValueAtTime(opts.f0, t0);
    if (opts.f1 && opts.f1 !== opts.f0) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.f1), t0 + (opts.dur || 0.16));
    }
    var peak = (opts.gain === undefined ? 0.22 : opts.gain);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + (opts.dur || 0.16));

    var last = osc;
    if (opts.lp) {
      var lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = opts.lp;
      osc.connect(lp);
      last = lp;
    }
    last.connect(gain);
    gain.connect(Audio2.sfxGain);
    osc.start(t0);
    osc.stop(t0 + (opts.dur || 0.16) + 0.05);
  }

  function noiseBurst(dur, gainVal, lp, hp) {
    if (!Audio2.sfxOn) return;
    var ctx = resume();
    if (!ctx) return;
    var len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    }
    var src = ctx.createBufferSource();
    src.buffer = buf;
    var g = ctx.createGain();
    g.gain.value = gainVal;
    var node = src;
    if (lp) {
      var f = ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = lp;
      node.connect(f);
      node = f;
    }
    if (hp) {
      var h = ctx.createBiquadFilter();
      h.type = "highpass";
      h.frequency.value = hp;
      node.connect(h);
      node = h;
    }
    node.connect(g);
    g.connect(Audio2.sfxGain);
    src.start();
  }

  var SFX = {
    tap: function () { blip({ f0: 660, f1: 880, dur: 0.09, gain: 0.14, type: "triangle" }); },
    move: function () { blip({ f0: 420, f1: 520, dur: 0.07, gain: 0.08, type: "sine" }); },
    open: function () { blip({ f0: 300, f1: 720, dur: 0.2, gain: 0.14, type: "triangle" }); },
    close: function () { blip({ f0: 620, f1: 240, dur: 0.18, gain: 0.12, type: "triangle" }); },
    flip: function () {
      noiseBurst(0.18, 0.1, 3200, 700);
      blip({ f0: 240, f1: 520, dur: 0.18, gain: 0.1, type: "sawtooth", lp: 1400 });
    },
    correct: function () {
      var seq = [523.25, 659.25, 783.99, 1046.5];
      for (var i = 0; i < seq.length; i++) {
        blip({ f0: seq[i], f1: seq[i], dur: 0.42, gain: 0.15, type: "sine", delay: i * 0.075 });
        blip({ f0: seq[i] * 2, f1: seq[i] * 2, dur: 0.24, gain: 0.05, type: "triangle", delay: i * 0.075 });
      }
    },
    wrong: function () {
      blip({ f0: 196, f1: 88, dur: 0.5, gain: 0.24, type: "sawtooth", lp: 900 });
      blip({ f0: 133, f1: 70, dur: 0.6, gain: 0.16, type: "square", lp: 600, delay: 0.05 });
      noiseBurst(0.35, 0.1, 1200, 120);
    },
    unlock: function () {
      var seq = [392, 523.25, 659.25, 880, 1174.7];
      for (var i = 0; i < seq.length; i++) {
        blip({ f0: seq[i], f1: seq[i], dur: 0.5, gain: 0.13, type: "triangle", delay: i * 0.09 });
      }
    },
    win: function () {
      var seq = [523.25, 659.25, 783.99, 1046.5, 1318.5];
      for (var i = 0; i < seq.length; i++) {
        blip({ f0: seq[i], f1: seq[i], dur: 0.7, gain: 0.14, type: "sine", delay: i * 0.11 });
      }
    },
    lose: function () {
      var seq = [349.23, 293.66, 233.08, 174.61];
      for (var i = 0; i < seq.length; i++) {
        blip({ f0: seq[i], f1: seq[i] * 0.98, dur: 0.8, gain: 0.16, type: "triangle", delay: i * 0.16, lp: 1400 });
      }
      noiseBurst(1.2, 0.07, 500, 60);
    },
    boot: function () {
      blip({ f0: 110, f1: 440, dur: 0.6, gain: 0.1, type: "sine" });
      blip({ f0: 1760, f1: 1760, dur: 0.05, gain: 0.05, type: "square", delay: 0.5 });
    }
  };

  /* ---------------- procedural music ---------------- */
  /* Slow ambient bio-lab score: drone + pad chords + sparse plucks. */
  var CHORDS = [
    [110.00, 164.81, 220.00, 329.63],   /* A minor-ish */
    [98.00, 146.83, 196.00, 293.66],    /* G */
    [87.31, 130.81, 174.61, 261.63],    /* F */
    [82.41, 123.47, 164.81, 246.94]     /* E */
  ];
  var PENTA = [440, 493.88, 587.33, 659.25, 880, 987.77];

  function startProcedural() {
    var ctx = resume();
    if (!ctx) return;
    stopProceduralNodes();

    /* sub drone */
    var drone = ctx.createOscillator();
    drone.type = "sine";
    drone.frequency.value = 55;
    var droneG = ctx.createGain();
    droneG.gain.value = 0.16;
    var droneLfo = ctx.createOscillator();
    droneLfo.type = "sine";
    droneLfo.frequency.value = 0.07;
    var droneLfoG = ctx.createGain();
    droneLfoG.gain.value = 0.07;
    droneLfo.connect(droneLfoG);
    droneLfoG.connect(droneG.gain);
    drone.connect(droneG);
    droneG.connect(Audio2.musicGain);
    drone.start();
    droneLfo.start();
    Audio2._nodes.push(drone, droneLfo);

    /* breathing filtered noise = cytoplasm hum */
    var len = Math.floor(ctx.sampleRate * 3);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    var hum = ctx.createBufferSource();
    hum.buffer = buf;
    hum.loop = true;
    var humF = ctx.createBiquadFilter();
    humF.type = "bandpass";
    humF.frequency.value = 320;
    humF.Q.value = 0.7;
    var humG = ctx.createGain();
    humG.gain.value = 0.03;
    var humLfo = ctx.createOscillator();
    humLfo.type = "sine";
    humLfo.frequency.value = 0.05;
    var humLfoG = ctx.createGain();
    humLfoG.gain.value = 180;
    humLfo.connect(humLfoG);
    humLfoG.connect(humF.frequency);
    hum.connect(humF);
    humF.connect(humG);
    humG.connect(Audio2.musicGain);
    hum.start();
    humLfo.start();
    Audio2._nodes.push(hum, humLfo);

    Audio2._chordIdx = 0;
    Audio2._step = 0;
    scheduleBar();
    Audio2._timer = global.setInterval(scheduleBar, 7600);
  }

  function padVoice(freq, when, dur, gainVal) {
    var ctx = Audio2.ctx;
    var osc = ctx.createOscillator();
    var osc2 = ctx.createOscillator();
    osc.type = "triangle";
    osc2.type = "sine";
    osc.frequency.value = freq;
    osc2.frequency.value = freq * 1.005;
    var lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(500, when);
    lp.frequency.linearRampToValueAtTime(1500, when + dur * 0.5);
    lp.frequency.linearRampToValueAtTime(400, when + dur);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(gainVal, when + dur * 0.35);
    g.gain.linearRampToValueAtTime(0.0001, when + dur);
    osc.connect(lp);
    osc2.connect(lp);
    lp.connect(g);
    g.connect(Audio2.musicGain);
    osc.start(when); osc2.start(when);
    osc.stop(when + dur + 0.1); osc2.stop(when + dur + 0.1);
  }

  function pluck(freq, when) {
    var ctx = Audio2.ctx;
    var osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(0.07, when + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 1.4);
    osc.connect(g);
    g.connect(Audio2.musicGain);
    osc.start(when);
    osc.stop(when + 1.5);
  }

  function scheduleBar() {
    var ctx = Audio2.ctx;
    if (!ctx || Audio2.usingFile) return;
    var t = ctx.currentTime + 0.05;
    var chord = CHORDS[Audio2._chordIdx % CHORDS.length];
    Audio2._chordIdx++;
    for (var i = 0; i < chord.length; i++) {
      padVoice(chord[i], t + i * 0.12, 7.6, 0.055);
    }
    /* sparse melodic pings */
    var plucks = 2 + Math.floor(Math.random() * 3);
    for (var k = 0; k < plucks; k++) {
      pluck(PENTA[Math.floor(Math.random() * PENTA.length)], t + 0.6 + Math.random() * 6.4);
    }
  }

  function stopProceduralNodes() {
    if (Audio2._timer) { global.clearInterval(Audio2._timer); Audio2._timer = null; }
    for (var i = 0; i < Audio2._nodes.length; i++) {
      try { Audio2._nodes[i].stop(); } catch (e) {}
      try { Audio2._nodes[i].disconnect(); } catch (e2) {}
    }
    Audio2._nodes = [];
  }

  /* ---------------- optional drop-in music file ---------------- */
  function probeMusicFile() {
    var el;
    try {
      el = new global.Audio();
    } catch (e) {
      return;
    }
    el.loop = true;
    el.preload = "auto";
    el.volume = 0;
    var settled = false;
    var ok = function () {
      if (settled) return;
      settled = true;
      Audio2.fileEl = el;
      Audio2.usingFile = true;
      stopProceduralNodes();
      if (Audio2.musicOn && Audio2.started) playFile();
      if (Audio2.onMusicSource) Audio2.onMusicSource("file");
    };
    var fail = function () {
      if (settled) return;
      settled = true;
      el.src = "";
      if (Audio2.onMusicSource) Audio2.onMusicSource("synth");
    };
    el.addEventListener("canplaythrough", ok);
    el.addEventListener("loadeddata", ok);
    el.addEventListener("error", fail);
    el.addEventListener("stalled", fail);
    el.src = OPTIONAL_BGM;
    global.setTimeout(function () { if (!settled) fail(); }, 4000);
  }

  function playFile() {
    if (!Audio2.fileEl) return;
    Audio2.fileEl.volume = 0.0;
    var p = Audio2.fileEl.play();
    if (p && p["catch"]) p["catch"](function () {});
    /* manual fade in */
    var v = 0;
    var iv = global.setInterval(function () {
      if (!Audio2.fileEl || !Audio2.musicOn) { global.clearInterval(iv); return; }
      v = Math.min(0.5, v + 0.03);
      try { Audio2.fileEl.volume = v; } catch (e) {}
      if (v >= 0.5) global.clearInterval(iv);
    }, 90);
  }

  function stopFile() {
    if (!Audio2.fileEl) return;
    try { Audio2.fileEl.pause(); } catch (e) {}
  }

  /* ---------------- public API ---------------- */
  var API = {
    sfx: SFX,

    init: function (opts) {
      opts = opts || {};
      Audio2.musicOn = opts.music !== false;
      Audio2.sfxOn = opts.sfx !== false;
      Audio2.onMusicSource = opts.onMusicSource || null;
      probeMusicFile();
    },

    /* Called from the first real user gesture (autoplay policy). */
    unlock: function () {
      var ctx = resume();
      if (!ctx) return;
      if (Audio2.started) return;
      Audio2.started = true;
      if (Audio2.musicOn) API.startMusic();
    },

    startMusic: function () {
      if (!Audio2.musicOn) return;
      var ctx = resume();
      if (!ctx) return;
      if (Audio2.usingFile) {
        playFile();
      } else {
        if (!Audio2._timer) startProcedural();
        Audio2.musicGain.gain.cancelScheduledValues(ctx.currentTime);
        Audio2.musicGain.gain.setValueAtTime(Audio2.musicGain.gain.value, ctx.currentTime);
        Audio2.musicGain.gain.linearRampToValueAtTime(0.7, ctx.currentTime + 2.4);
      }
    },

    stopMusic: function () {
      if (Audio2.usingFile) { stopFile(); return; }
      var ctx = Audio2.ctx;
      if (!ctx) return;
      Audio2.musicGain.gain.cancelScheduledValues(ctx.currentTime);
      Audio2.musicGain.gain.setValueAtTime(Audio2.musicGain.gain.value, ctx.currentTime);
      Audio2.musicGain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.8);
    },

    setMusic: function (on) {
      Audio2.musicOn = !!on;
      if (Audio2.musicOn) {
        if (Audio2.started) API.startMusic();
      } else {
        API.stopMusic();
      }
    },

    setSfx: function (on) { Audio2.sfxOn = !!on; },

    /* Duck the music while a big stinger plays. */
    duck: function (amount, seconds) {
      if (Audio2.usingFile) {
        if (!Audio2.fileEl) return;
        var base = Audio2.fileEl.volume;
        try { Audio2.fileEl.volume = Math.max(0, base * (1 - amount)); } catch (e) {}
        global.setTimeout(function () {
          try { if (Audio2.fileEl) Audio2.fileEl.volume = base; } catch (e2) {}
        }, seconds * 1000);
        return;
      }
      var ctx = Audio2.ctx;
      if (!ctx || !Audio2.musicOn) return;
      var g = Audio2.musicGain.gain;
      var now = ctx.currentTime;
      g.cancelScheduledValues(now);
      g.setValueAtTime(g.value, now);
      g.linearRampToValueAtTime(0.7 * (1 - amount), now + 0.12);
      g.linearRampToValueAtTime(0.7, now + seconds);
    },

    isMusicOn: function () { return Audio2.musicOn; },
    isSfxOn: function () { return Audio2.sfxOn; },
    musicSource: function () { return Audio2.usingFile ? "file" : "synth"; },

    suspendAll: function () {
      if (Audio2.ctx && Audio2.ctx.suspend) { try { Audio2.ctx.suspend(); } catch (e) {} }
      if (Audio2.usingFile) stopFile();
    },
    resumeAll: function () {
      if (!Audio2.started) return;
      resume();
      if (Audio2.usingFile && Audio2.musicOn) playFile();
    }
  };

  global.DC_AUDIO = API;
})(window);
