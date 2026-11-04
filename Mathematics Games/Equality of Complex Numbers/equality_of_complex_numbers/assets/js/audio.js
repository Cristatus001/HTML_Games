/* Twin-Seal Tomb: procedural tomb music + synthesized sound effects (Web Audio).
   An optional assets/audio/bgm.mp3 replaces the procedural music when present. */
(function () {
  'use strict';
  var AC = window.AudioContext || window.webkitAudioContext;
  var ctx = null, master, musicBus, sfxBus, delay, delayFb, noiseBuf;
  var musicOn = true, sfxOn = true, unlocked = false;
  var musicTimer = null, nextNote = 0, beat = 0, padNodes = [];
  var fileEl = null, useFile = false;

  // D Hijaz (phrygian dominant): D Eb F# G A Bb C
  var SCALE = [0, 1, 4, 5, 7, 8, 10];
  var ROOT = 146.83; // D3
  function f(semi) { return ROOT * Math.pow(2, semi / 12); }

  function build() {
    if (ctx || !AC) return;
    try { ctx = new AC(); } catch (e) { ctx = null; return; }
    master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
    musicBus = ctx.createGain(); musicBus.gain.value = 0; musicBus.connect(master);
    sfxBus = ctx.createGain(); sfxBus.gain.value = sfxOn ? 0.8 : 0; sfxBus.connect(master);
    delay = ctx.createDelay(1.5); delay.delayTime.value = 0.42;
    delayFb = ctx.createGain(); delayFb.gain.value = 0.34;
    var dl = ctx.createBiquadFilter(); dl.type = 'lowpass'; dl.frequency.value = 2200;
    delay.connect(dl); dl.connect(delayFb); delayFb.connect(delay); dl.connect(musicBus);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    var d = noiseBuf.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }

  function tryFile() {
    fileEl = new Audio();
    fileEl.loop = true; fileEl.preload = 'auto'; fileEl.volume = 0.5;
    fileEl.addEventListener('canplaythrough', function () {
      if (useFile) return;
      useFile = true; stopProcedural();
      if (musicOn && unlocked) fileEl.play().catch(function () {});
    }, { once: true });
    fileEl.addEventListener('error', function () { useFile = false; fileEl = null; }, { once: true });
    fileEl.src = 'assets/audio/bgm.mp3';
  }

  /* ---------- procedural music ---------- */
  function startPad() {
    var t = ctx.currentTime;
    var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520; lp.Q.value = 0.7;
    var lfo = ctx.createOscillator(); lfo.frequency.value = 0.06;
    var lfoG = ctx.createGain(); lfoG.gain.value = 220; lfo.connect(lfoG); lfoG.connect(lp.frequency); lfo.start(t);
    var padG = ctx.createGain(); padG.gain.value = 0.0; padG.gain.linearRampToValueAtTime(0.11, t + 4);
    lp.connect(padG); padG.connect(musicBus);
    [[f(-12), -6], [f(-12), 7], [f(-5), 3], [f(0), -4]].forEach(function (p) {
      var o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = p[0]; o.detune.value = p[1];
      var g = ctx.createGain(); g.gain.value = 0.22; o.connect(g); g.connect(lp); o.start(t); padNodes.push(o);
    });
    var sub = ctx.createOscillator(); sub.type = 'sine'; sub.frequency.value = f(-24);
    var sg = ctx.createGain(); sg.gain.value = 0.16; sub.connect(sg); sg.connect(musicBus); sub.start(t);
    // desert wind: band-passed noise that breathes
    var n = ctx.createBufferSource(); n.buffer = noiseBuf; n.loop = true;
    var bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 520; bp.Q.value = 0.8;
    var wl = ctx.createOscillator(); wl.frequency.value = 0.09; var wlg = ctx.createGain(); wlg.gain.value = 260;
    wl.connect(wlg); wlg.connect(bp.frequency); wl.start(t);
    var ng = ctx.createGain(); ng.gain.value = 0.035; n.connect(bp); bp.connect(ng); ng.connect(musicBus); n.start(t);
    padNodes.push(lfo, sub, n, wl);
  }

  function pluck(t, freq, vol) {
    var o = ctx.createOscillator(); o.type = 'triangle';
    o.frequency.setValueAtTime(freq * 1.012, t); o.frequency.exponentialRampToValueAtTime(freq, t + 0.08);
    var o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = freq * 2;
    var g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
    var g2 = ctx.createGain(); g2.gain.value = 0.25;
    o.connect(g); o2.connect(g2); g2.connect(g); g.connect(musicBus); g.connect(delay);
    o.start(t); o2.start(t); o.stop(t + 1.5); o2.stop(t + 1.5);
  }
  function drum(t, low, vol) {
    var o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(low ? 110 : 320, t); o.frequency.exponentialRampToValueAtTime(low ? 48 : 180, t + 0.18);
    var g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + (low ? 0.4 : 0.12));
    o.connect(g); g.connect(musicBus); o.start(t); o.stop(t + 0.45);
  }

  var BEAT = 60 / 84;
  function schedule() {
    if (!ctx) return;
    while (nextNote < ctx.currentTime + 0.4) {
      var b = beat % 8;
      if (b === 0 || b === 3) drum(nextNote, true, 0.18);
      if (b === 2 || b === 5 || b === 6) drum(nextNote, false, 0.05);
      if (Math.random() < (b % 2 === 0 ? 0.42 : 0.18)) {
        var deg = SCALE[(Math.random() * SCALE.length) | 0];
        var oct = Math.random() < 0.3 ? 12 : 0;
        pluck(nextNote + (Math.random() < 0.3 ? BEAT / 2 : 0), f(deg + oct), 0.07);
      }
      nextNote += BEAT; beat++;
    }
  }
  function startProcedural() {
    if (!ctx || useFile || musicTimer) return;
    startPad();
    nextNote = ctx.currentTime + 0.3; beat = 0;
    musicTimer = setInterval(schedule, 120);
  }
  function stopProcedural() {
    if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
    padNodes.forEach(function (n) { try { n.stop(); } catch (e) {} try { n.disconnect(); } catch (e) {} });
    padNodes = [];
  }

  function applyMusic() {
    if (!ctx) return;
    var t = ctx.currentTime;
    if (useFile && fileEl) {
      if (musicOn) fileEl.play().catch(function () {}); else fileEl.pause();
      return;
    }
    musicBus.gain.cancelScheduledValues(t);
    musicBus.gain.setValueAtTime(musicBus.gain.value, t);
    if (musicOn) {
      startProcedural();
      musicBus.gain.linearRampToValueAtTime(0.55, t + 1.2);
    } else {
      musicBus.gain.linearRampToValueAtTime(0, t + 0.4);
      setTimeout(function () { if (!musicOn) stopProcedural(); }, 500);
    }
  }

  /* ---------- sound effects ---------- */
  function tone(type, f0, f1, dur, vol, when) {
    if (!ctx || !sfxOn) return;
    var t = ctx.currentTime + (when || 0);
    var o = ctx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    var g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(dur, freq, q, vol, when, sweepTo) {
    if (!ctx || !sfxOn) return;
    var t = ctx.currentTime + (when || 0);
    var n = ctx.createBufferSource(); n.buffer = noiseBuf;
    var bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.setValueAtTime(freq, t); bp.Q.value = q;
    if (sweepTo) bp.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    var g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    n.connect(bp); bp.connect(g); g.connect(sfxBus); n.start(t); n.stop(t + dur + 0.05);
  }

  var SFX = {
    tap: function () { tone('triangle', 660, 520, 0.08, 0.18); },
    pick: function () { tone('sine', 420, 640, 0.09, 0.2); noise(0.06, 3000, 2, 0.05); },
    drop: function () { tone('triangle', f(12), f(12), 0.18, 0.22); tone('sine', f(19), f(19), 0.22, 0.12, 0.05); },
    wrong: function () { tone('sawtooth', 220, 140, 0.25, 0.14); noise(0.18, 400, 1, 0.08); },
    seal: function () {
      [0, 4, 7, 12].forEach(function (s, i) { tone('triangle', f(12 + s), f(12 + s), 0.5, 0.14, i * 0.06); });
      noise(0.5, 6000, 3, 0.05, 0, 9000);
    },
    rumble: function () { noise(1.3, 90, 0.7, 0.5, 0, 220); tone('sine', 55, 42, 1.3, 0.3); },
    open: function () {
      noise(1.4, 140, 0.7, 0.45, 0, 380); tone('sine', 60, 46, 1.4, 0.3);
      [0, 4, 7, 12, 16].forEach(function (s, i) { tone('triangle', f(12 + s), f(12 + s), 0.9, 0.15, 0.4 + i * 0.09); });
    },
    coin: function () { tone('square', 1320, 1320, 0.06, 0.05); tone('sine', 1980, 1980, 0.12, 0.06, 0.04); },
    star: function () { tone('triangle', 880, 1760, 0.25, 0.14); },
    fail: function () {
      tone('sawtooth', 300, 150, 0.6, 0.16); tone('sawtooth', 302, 148, 0.6, 0.12, 0.02);
      noise(0.6, 200, 1, 0.14);
    },
    tick: function () { tone('square', 1100, 900, 0.03, 0.06); noise(0.02, 2400, 4, 0.06); },
    page: function () { noise(0.18, 1800, 1.2, 0.08, 0, 900); },
    win: function () {
      [0, 1, 4, 5, 7, 8, 10, 12].forEach(function (s, i) { tone('triangle', f(s + 12), f(s + 12), 0.5, 0.13, i * 0.09); });
      [0, 4, 7, 12].forEach(function (s) { tone('sine', f(s), f(s), 2.0, 0.07, 0.8); });
    }
  };

  window.TST.audio = {
    init: function (prefs) { musicOn = prefs.music; sfxOn = prefs.sfx; },
    unlock: function () {
      if (unlocked) { if (ctx && ctx.state === 'suspended') ctx.resume(); return; }
      build();
      if (!ctx) return;
      unlocked = true;
      if (ctx.state === 'suspended') ctx.resume();
      tryFile();
      applyMusic();
    },
    setMusic: function (on) { musicOn = !!on; if (ctx && ctx.state === 'suspended') ctx.resume(); applyMusic(); },
    setSfx: function (on) {
      sfxOn = !!on;
      if (ctx) { var t = ctx.currentTime; sfxBus.gain.cancelScheduledValues(t); sfxBus.gain.setTargetAtTime(sfxOn ? 0.8 : 0, t, 0.05); }
    },
    suspend: function () { if (ctx && ctx.state === 'running') ctx.suspend(); if (fileEl && useFile) fileEl.pause(); },
    resume: function () { if (ctx && ctx.state === 'suspended') ctx.resume(); if (fileEl && useFile && musicOn) fileEl.play().catch(function () {}); },
    play: function (name) { if (SFX[name]) try { SFX[name](); } catch (e) {} }
  };
})();
