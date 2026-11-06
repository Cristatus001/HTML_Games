/* Mirror River City — audio.
 * Procedural evening-river music (pad + sub + river noise + sparse plucks) and synthesized SFX.
 * Drop an optional assets/audio/bgm.mp3 next to this game and it replaces the procedural music. */
(function () {
  'use strict';
  var AP = (window.AP = window.AP || {});

  var A = {
    ctx: null, master: null, musicBus: null, sfxBus: null,
    musicOn: true, sfxOn: true,
    _sched: null, _nextBar: 0, _bar: 0, _noise: null, _mp3: null, _mp3Ok: false, _started: false
  };

  var MUSIC_VOL = 0.42, SFX_VOL = 0.8;

  A.unlock = function () {
    if (!A.ctx) {
      var C = window.AudioContext || window.webkitAudioContext;
      if (!C) return;
      A.ctx = new C();
      A.master = A.ctx.createGain(); A.master.gain.value = 0.9;
      var comp = A.ctx.createDynamicsCompressor();
      comp.threshold.value = -14; comp.ratio.value = 3;
      A.master.connect(comp); comp.connect(A.ctx.destination);
      A.musicBus = A.ctx.createGain(); A.musicBus.gain.value = 0; A.musicBus.connect(A.master);
      A.sfxBus = A.ctx.createGain(); A.sfxBus.gain.value = A.sfxOn ? SFX_VOL : 0; A.sfxBus.connect(A.master);
      A._probeMp3();
    }
    if (A.ctx.state === 'suspended') A.ctx.resume();
    if (!A._started) { A._started = true; A.setMusic(A.musicOn); }
  };

  A._probeMp3 = function () {
    try {
      var el = new Audio();
      el.loop = true; el.preload = 'auto'; el.volume = 0.5;
      el.addEventListener('canplaythrough', function () {
        if (A._mp3Ok) return;
        A._mp3Ok = true; A._mp3 = el;
        A._stopProcedural();
        if (A.musicOn) el.play().catch(function () {});
      });
      el.addEventListener('error', function () { A._mp3Ok = false; });
      el.src = 'assets/audio/bgm.mp3';
    } catch (e) { /* fall back to procedural */ }
  };

  A.setMusic = function (on) {
    A.musicOn = !!on;
    if (!A.ctx) return;
    if (A.ctx.state === 'suspended') A.ctx.resume();
    var t = A.ctx.currentTime;
    if (A._mp3Ok && A._mp3) {
      if (A.musicOn) A._mp3.play().catch(function () {}); else A._mp3.pause();
      return;
    }
    A.musicBus.gain.cancelScheduledValues(t);
    A.musicBus.gain.setValueAtTime(A.musicBus.gain.value, t);
    A.musicBus.gain.linearRampToValueAtTime(A.musicOn ? MUSIC_VOL : 0, t + 0.6);
    if (A.musicOn) A._startProcedural();
    else setTimeout(function () { if (!A.musicOn) A._stopProcedural(); }, 700);
  };

  A.setSfx = function (on) {
    A.sfxOn = !!on;
    if (!A.ctx) return;
    var t = A.ctx.currentTime;
    A.sfxBus.gain.cancelScheduledValues(t);
    A.sfxBus.gain.setValueAtTime(A.sfxOn ? SFX_VOL : 0, t);
  };

  /* ---------------- procedural music ---------------- */
  // F major evening: Fmaj7 - Dm9 - Bbmaj7 - C6/9   (MIDI roots)
  var PROG = [
    { root: 41, notes: [53, 57, 60, 64] },
    { root: 38, notes: [50, 53, 57, 64] },
    { root: 46, notes: [50, 53, 57, 58] },
    { root: 36, notes: [52, 55, 57, 62] }
  ];
  var PENTA = [65, 67, 69, 72, 74, 77, 79, 81];
  var BAR = 4.8; // seconds per chord
  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  A._startProcedural = function () {
    if (A._sched || A._mp3Ok) return;
    A._nextBar = A.ctx.currentTime + 0.1;
    A._startNoise();
    A._sched = setInterval(A._tick, 250);
    A._tick();
  };
  A._stopProcedural = function () {
    if (A._sched) { clearInterval(A._sched); A._sched = null; }
    if (A._noise) { try { A._noise.src.stop(); } catch (e) {} A._noise = null; }
  };
  A._tick = function () {
    if (!A.ctx) return;
    while (A._nextBar < A.ctx.currentTime + 1.2) {
      A._playBar(A._nextBar, PROG[A._bar % PROG.length]);
      A._nextBar += BAR; A._bar++;
    }
  };
  A._playBar = function (t, ch) {
    var ctx = A.ctx;
    // pad: two detuned triangles per note through a soft low-pass
    var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1100; lp.Q.value = 0.4;
    var g = ctx.createGain(); g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.11, t + 1.4); g.gain.setValueAtTime(0.11, t + BAR - 1.2);
    g.gain.linearRampToValueAtTime(0, t + BAR + 0.6);
    lp.connect(g); g.connect(A.musicBus);
    ch.notes.forEach(function (n) {
      [-6, 6].forEach(function (det) {
        var o = ctx.createOscillator(); o.type = 'triangle';
        o.frequency.value = mtof(n); o.detune.value = det;
        o.connect(lp); o.start(t); o.stop(t + BAR + 0.7);
      });
    });
    // sub
    var s = ctx.createOscillator(); s.type = 'sine'; s.frequency.value = mtof(ch.root);
    var sg = ctx.createGain(); sg.gain.setValueAtTime(0, t);
    sg.gain.linearRampToValueAtTime(0.16, t + 0.8); sg.gain.linearRampToValueAtTime(0, t + BAR + 0.3);
    s.connect(sg); sg.connect(A.musicBus); s.start(t); s.stop(t + BAR + 0.4);
    // sparse plucks, like lantern light on water
    var count = 2 + Math.floor(Math.random() * 3);
    for (var i = 0; i < count; i++) {
      var pt = t + 0.4 + Math.random() * (BAR - 0.8);
      A._pluck(pt, mtof(PENTA[Math.floor(Math.random() * PENTA.length)]), 0.06);
    }
  };
  A._pluck = function (t, f, v) {
    var ctx = A.ctx;
    var o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
    var o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = f * 2.01;
    var g = ctx.createGain(); g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(v, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0008, t + 1.8);
    var g2 = ctx.createGain(); g2.gain.value = 0.25;
    var d = ctx.createDelay(); d.delayTime.value = 0.33;
    var fb = ctx.createGain(); fb.gain.value = 0.35;
    o.connect(g); o2.connect(g2); g2.connect(g);
    g.connect(A.musicBus); g.connect(d); d.connect(fb); fb.connect(d); d.connect(A.musicBus);
    o.start(t); o2.start(t); o.stop(t + 2); o2.stop(t + 2);
  };
  A._startNoise = function () {
    var ctx = A.ctx, len = ctx.sampleRate * 4;
    var buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0), last = 0;
    for (var i = 0; i < len; i++) { var w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.2; }
    var src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    var bp = ctx.createBiquadFilter(); bp.type = 'lowpass'; bp.frequency.value = 700;
    var g = ctx.createGain(); g.gain.value = 0.05;
    var lfo = ctx.createOscillator(); lfo.frequency.value = 0.09;
    var lg = ctx.createGain(); lg.gain.value = 0.03;
    lfo.connect(lg); lg.connect(g.gain);
    src.connect(bp); bp.connect(g); g.connect(A.musicBus);
    src.start(); lfo.start();
    A._noise = { src: src };
  };

  /* ---------------- SFX ---------------- */
  function tone(f, type, dur, vol, when, slideTo) {
    if (!A.ctx || !A.sfxOn) return;
    var t = A.ctx.currentTime + (when || 0);
    var o = A.ctx.createOscillator(), g = A.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(A.sfxBus); o.start(t); o.stop(t + dur + 0.05);
  }

  A.sfx = {
    click: function () { tone(660, 'triangle', 0.08, 0.12); },
    step: function () { tone(110, 'sawtooth', 0.09, 0.05, 0, 150); tone(880, 'sine', 0.04, 0.03); },
    bump: function () { tone(90, 'square', 0.12, 0.06); },
    nothing: function () { tone(330, 'triangle', 0.1, 0.08); tone(260, 'triangle', 0.12, 0.07, 0.08); },
    wrong: function () { tone(180, 'square', 0.18, 0.12); tone(140, 'square', 0.26, 0.12, 0.12); },
    found: function () { [523, 659, 784].forEach(function (f, i) { tone(f, 'triangle', 0.18, 0.16, i * 0.08); }); },
    coin: function () { tone(1320, 'sine', 0.09, 0.1); tone(1760, 'sine', 0.12, 0.08, 0.05); },
    powerUp: function () { tone(220, 'sawtooth', 0.5, 0.08, 0, 880); [784, 988, 1175].forEach(function (f, i) { tone(f, 'triangle', 0.25, 0.12, 0.25 + i * 0.07); }); },
    unlock: function () { tone(400, 'sine', 0.6, 0.1, 0, 1200); tone(600, 'triangle', 0.5, 0.06, 0.15, 300); },
    win: function () { [523, 659, 784, 1046, 1318].forEach(function (f, i) { tone(f, 'triangle', 0.35, 0.16, i * 0.11); }); },
    lose: function () { [392, 330, 262, 196].forEach(function (f, i) { tone(f, 'triangle', 0.35, 0.14, i * 0.16); }); },
    star: function (i) { tone(880 + i * 220, 'triangle', 0.3, 0.14); }
  };

  AP.Audio = A;
})();
