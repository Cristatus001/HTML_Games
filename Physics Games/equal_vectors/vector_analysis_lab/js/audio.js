/* ==========================================================================
   audio.js — fully offline sound.

   Music: generated live with Web Audio (ambient deck pad + slow bell motif),
          so no audio files are required at all.
   Override: if assets/audio/bgm.mp3 exists it is used instead of the
          procedural pad. If it is missing, the pad simply keeps playing.
   SFX:   short synthesised blips, no files.
   ========================================================================== */
var Snd = (function () {
  'use strict';

  var ctx = null, master = null, musGain = null, sfxGain = null;
  var started = false, fileMode = false, bgmEl = null;
  var pad = null, seqTimer = null, chordTimer = null;
  var chordIdx = 0;

  var state = { music: true, sfx: true };

  /* A minor drone progression: Am - F - C - G (low, wide voicings) */
  var PROG = [
    [110.00, 164.81, 261.63],
    [87.31, 130.81, 261.63],
    [130.81, 196.00, 246.94],
    [98.00, 146.83, 246.94]
  ];
  var BELLS = [880.00, 987.77, 1174.66, 1318.51, 1567.98];

  function ensureCtx() {
    if (ctx) return ctx;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { ctx = new AC(); } catch (e) { return null; }

    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);

    musGain = ctx.createGain();
    musGain.gain.value = 0;
    musGain.connect(master);

    sfxGain = ctx.createGain();
    sfxGain.gain.value = 0.55;
    sfxGain.connect(master);
    return ctx;
  }

  function now() { return ctx ? ctx.currentTime : 0; }

  /* ---------------- procedural pad ---------------- */
  function buildPad() {
    if (pad) return;
    var lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 520;
    lp.Q.value = 0.6;

    var padGain = ctx.createGain();
    padGain.gain.value = 0.16;
    lp.connect(padGain);
    padGain.connect(musGain);

    /* slow filter breathing */
    var lfo = ctx.createOscillator();
    var lfoAmt = ctx.createGain();
    lfo.frequency.value = 0.045;
    lfoAmt.gain.value = 210;
    lfo.connect(lfoAmt);
    lfoAmt.connect(lp.frequency);
    lfo.start();

    var voices = [];
    for (var i = 0; i < 3; i++) {
      var o = ctx.createOscillator();
      o.type = i === 0 ? 'triangle' : 'sawtooth';
      o.frequency.value = PROG[0][i];
      o.detune.value = (i - 1) * 7;
      var g = ctx.createGain();
      g.gain.value = i === 0 ? 0.5 : 0.24;
      o.connect(g);
      g.connect(lp);
      o.start();
      voices.push(o);
    }

    /* filtered noise "air" so the deck feels alive */
    var len = Math.floor(ctx.sampleRate * 2);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var s = 0; s < len; s++) d[s] = (Math.random() * 2 - 1) * 0.6;
    var noise = ctx.createBufferSource();
    noise.buffer = buf;
    noise.loop = true;
    var nf = ctx.createBiquadFilter();
    nf.type = 'bandpass';
    nf.frequency.value = 760;
    nf.Q.value = 0.5;
    var ng = ctx.createGain();
    ng.gain.value = 0.018;
    noise.connect(nf); nf.connect(ng); ng.connect(musGain);
    noise.start();

    pad = { voices: voices, filter: lp, gain: padGain };

    setChord(0, 0.05);
    chordTimer = setInterval(function () {
      chordIdx = (chordIdx + 1) % PROG.length;
      setChord(chordIdx, 3.4);
    }, 8200);

    /* sparse bell motif */
    seqTimer = setInterval(function () {
      if (!state.music || fileMode || !ctx || ctx.state !== 'running') return;
      if (Math.random() < 0.45) bell(BELLS[Math.floor(Math.random() * BELLS.length)]);
    }, 2600);
  }

  function setChord(idx, glide) {
    if (!pad) return;
    var t = now();
    for (var i = 0; i < pad.voices.length; i++) {
      var f = PROG[idx][i];
      try {
        pad.voices[i].frequency.cancelScheduledValues(t);
        pad.voices[i].frequency.setValueAtTime(pad.voices[i].frequency.value, t);
        pad.voices[i].frequency.linearRampToValueAtTime(f, t + glide);
      } catch (e) { pad.voices[i].frequency.value = f; }
    }
  }

  function bell(freq) {
    if (!ctx) return;
    var t = now();
    var o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = freq;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.05, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.6);
    var dl = ctx.createBiquadFilter();
    dl.type = 'lowpass'; dl.frequency.value = 2400;
    o.connect(g); g.connect(dl); dl.connect(musGain);
    o.start(t); o.stop(t + 2.7);
  }

  /* ---------------- optional bgm file override ---------------- */
  function probeFile() {
    var a = document.createElement('audio');
    a.loop = true;
    a.preload = 'auto';
    a.volume = 0.55;
    var ok = false;
    a.addEventListener('canplaythrough', function () {
      if (ok) return;
      ok = true;
      fileMode = true;
      if (pad) { try { pad.gain.gain.value = 0; } catch (e) {} }
      if (state.music) { var p = a.play(); if (p && p.catch) p.catch(function () {}); }
      console.info('[Snd] assets/audio/bgm.mp3 found — using file music.');
    });
    a.addEventListener('error', function () {
      if (!ok) console.info('[Snd] no assets/audio/bgm.mp3 — using procedural music.');
    });
    a.src = 'assets/audio/bgm.mp3';
    bgmEl = a;
  }

  /* ---------------- public ---------------- */
  function start() {
    if (!ensureCtx()) return;
    if (ctx.state === 'suspended' && ctx.resume) ctx.resume();
    if (started) { applyMusic(); return; }
    started = true;
    buildPad();
    probeFile();
    applyMusic();
  }

  function applyMusic() {
    if (!ctx) return;
    var t = now();
    var target = state.music ? 0.85 : 0.0;
    try {
      musGain.gain.cancelScheduledValues(t);
      musGain.gain.setValueAtTime(musGain.gain.value, t);
      musGain.gain.linearRampToValueAtTime(target, t + 0.7);
    } catch (e) { musGain.gain.value = target; }
    if (bgmEl && fileMode) {
      if (state.music) { var p = bgmEl.play(); if (p && p.catch) p.catch(function () {}); }
      else bgmEl.pause();
    }
  }

  function setMusic(on) { state.music = !!on; if (started) applyMusic(); }
  function setSfx(on) { state.sfx = !!on; }
  function isMusic() { return state.music; }
  function isSfx() { return state.sfx; }

  /* one-shot synth voice */
  function tone(o) {
    if (!ctx || !state.sfx) return;
    var t = now();
    var osc = ctx.createOscillator();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.f0, t);
    if (o.f1 && o.f1 !== o.f0) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f1), t + o.dur);
    var g = ctx.createGain();
    var peak = o.gain || 0.22;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + (o.atk || 0.008));
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    osc.connect(g);
    if (o.lp) {
      var f = ctx.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = o.lp;
      g.connect(f); f.connect(sfxGain);
    } else g.connect(sfxGain);
    osc.start(t); osc.stop(t + o.dur + 0.02);
  }

  function noiseBurst(dur, freq, gain) {
    if (!ctx || !state.sfx) return;
    var t = now();
    var len = Math.floor(ctx.sampleRate * dur);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    var src = ctx.createBufferSource();
    src.buffer = buf;
    var f = ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = freq || 1600; f.Q.value = 0.9;
    var g = ctx.createGain();
    g.gain.value = gain || 0.15;
    src.connect(f); f.connect(g); g.connect(sfxGain);
    src.start(t);
  }

  var SFX = {
    click: function () { tone({ type: 'square', f0: 520, f1: 300, dur: 0.07, gain: 0.10, lp: 2200 }); },
    hover: function () { tone({ type: 'sine', f0: 900, f1: 1200, dur: 0.05, gain: 0.05 }); },
    pickup: function () { tone({ type: 'triangle', f0: 320, f1: 620, dur: 0.14, gain: 0.16 }); },
    drop: function () { tone({ type: 'triangle', f0: 620, f1: 260, dur: 0.16, gain: 0.16 }); noiseBurst(0.1, 900, 0.08); },
    snap: function () { tone({ type: 'square', f0: 880, f1: 1500, dur: 0.09, gain: 0.12, lp: 3000 }); noiseBurst(0.12, 2400, 0.09); },
    tick: function () { tone({ type: 'square', f0: 1500, f1: 1500, dur: 0.045, gain: 0.07, lp: 4000 }); },
    scan: function () { tone({ type: 'sawtooth', f0: 180, f1: 1400, dur: 0.5, gain: 0.07, lp: 1800 }); },
    pass: function () {
      [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) {
        setTimeout(function () { tone({ type: 'sine', f0: f, f1: f, dur: 0.55, gain: 0.15 }); }, i * 95);
      });
    },
    fail: function () {
      tone({ type: 'sawtooth', f0: 220, f1: 110, dur: 0.42, gain: 0.14, lp: 900 });
      setTimeout(function () { tone({ type: 'square', f0: 150, f1: 90, dur: 0.3, gain: 0.10, lp: 700 }); }, 110);
    },
    unlock: function () {
      tone({ type: 'sine', f0: 700, f1: 1400, dur: 0.28, gain: 0.13 });
      setTimeout(function () { tone({ type: 'sine', f0: 1050, f1: 1750, dur: 0.3, gain: 0.11 }); }, 90);
    },
    whoosh: function () { noiseBurst(0.34, 700, 0.10); },
    seal: function () {
      [392, 523.25, 659.25, 1046.5].forEach(function (f, i) {
        setTimeout(function () { tone({ type: 'triangle', f0: f, f1: f, dur: 0.9, gain: 0.14 }); }, i * 130);
      });
    }
  };

  return {
    start: start, setMusic: setMusic, setSfx: setSfx,
    isMusic: isMusic, isSfx: isSfx, sfx: SFX
  };
})();
