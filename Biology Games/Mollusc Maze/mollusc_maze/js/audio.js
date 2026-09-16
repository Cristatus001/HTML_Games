/* MolluscAudio — procedural Web Audio, offline by default.
   Music: a slow shimmering nacre pad with a sparse glass-bell arpeggio over it.
   Drops in assets/audio/bgm.mp3 automatically if present, which overrides the
   generative music. Everything no-ops safely if Web Audio is unavailable. */
(function (global) {
  'use strict';

  var MolluscAudio = {
    ctx: null,
    masterGain: null,
    musicGain: null,
    sfxGain: null,
    musicEnabled: true,
    sfxEnabled: true,
    fileMusicMode: false,
    started: false,
    fileEl: null,
    pad: null,
    padTimer: null,
    bellTimer: null,
    reverb: null
  };

  function getCtx() {
    if (MolluscAudio.ctx) return MolluscAudio.ctx;
    var AC = global.AudioContext || global.webkitAudioContext;
    if (!AC) return null;
    var ctx = new AC();
    MolluscAudio.ctx = ctx;

    MolluscAudio.masterGain = ctx.createGain();
    MolluscAudio.masterGain.gain.value = 1;
    MolluscAudio.masterGain.connect(ctx.destination);

    /* a cheap convolution reverb from generated noise — gives the whole mix
       the sense of being inside a shell */
    var len = Math.floor(ctx.sampleRate * 2.6);
    var ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (var ch = 0; ch < 2; ch++) {
      var data = ir.getChannelData(ch);
      for (var i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
      }
    }
    var conv = ctx.createConvolver();
    conv.buffer = ir;
    var wet = ctx.createGain();
    wet.gain.value = 0.42;
    conv.connect(wet);
    wet.connect(MolluscAudio.masterGain);
    MolluscAudio.reverb = conv;

    MolluscAudio.musicGain = ctx.createGain();
    MolluscAudio.musicGain.gain.value = MolluscAudio.musicEnabled ? 0.3 : 0;
    MolluscAudio.musicGain.connect(MolluscAudio.masterGain);
    MolluscAudio.musicGain.connect(conv);

    MolluscAudio.sfxGain = ctx.createGain();
    MolluscAudio.sfxGain.gain.value = MolluscAudio.sfxEnabled ? 0.55 : 0;
    MolluscAudio.sfxGain.connect(MolluscAudio.masterGain);
    MolluscAudio.sfxGain.connect(conv);

    return ctx;
  }

  /* ---------------- Generative pad ---------------- */
  /* Warm, open voicings — Amaj9 / F#m11 / Dmaj9 / E6-9 — drifting slowly. */
  var CHORDS = [
    [110.00, 164.81, 207.65, 277.18],
    [ 92.50, 138.59, 185.00, 246.94],
    [146.83, 220.00, 277.18, 329.63],
    [123.47, 185.00, 246.94, 311.13]
  ];
  /* pentatonic-ish bell notes that sit over any of the above */
  var BELLS = [554.37, 659.26, 739.99, 830.61, 987.77, 1108.73];
  var chordIndex = 0;

  function startPad() {
    var ctx = getCtx();
    if (!ctx || MolluscAudio.pad) return;

    var out = ctx.createGain();
    out.gain.value = 0;
    out.connect(MolluscAudio.musicGain);

    var filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    filter.Q.value = 0.5;
    filter.connect(out);

    var nodes = [];
    CHORDS[chordIndex].forEach(function (f, i) {
      var o = ctx.createOscillator();
      o.type = i === 0 ? 'sine' : 'triangle';
      o.frequency.value = f;

      var vg = ctx.createGain();
      vg.gain.value = 0.3 / (i + 1.2);

      /* slow detune wobble so the pad shimmers like nacre */
      var lfo = ctx.createOscillator();
      lfo.frequency.value = 0.06 + i * 0.021;
      var lfoAmt = ctx.createGain();
      lfoAmt.gain.value = 5;
      lfo.connect(lfoAmt); lfoAmt.connect(o.detune); lfo.start();

      o.connect(vg); vg.connect(filter); o.start();
      nodes.push(o, lfo);
    });

    /* filter sweep */
    var fLfo = ctx.createOscillator();
    fLfo.frequency.value = 0.028;
    var fAmt = ctx.createGain();
    fAmt.gain.value = 380;
    fLfo.connect(fAmt); fAmt.connect(filter.frequency); fLfo.start();
    nodes.push(fLfo);

    out.gain.setTargetAtTime(1, ctx.currentTime, 2.6);
    MolluscAudio.pad = { out: out, nodes: nodes };

    if (!MolluscAudio.padTimer) {
      MolluscAudio.padTimer = setInterval(nextChord, 15000);
    }
    if (!MolluscAudio.bellTimer) {
      MolluscAudio.bellTimer = setInterval(maybeBell, 2600);
    }
  }

  function nextChord() {
    var ctx = MolluscAudio.ctx;
    if (!ctx || !MolluscAudio.musicEnabled || MolluscAudio.fileMusicMode) return;
    chordIndex = (chordIndex + 1) % CHORDS.length;
    var old = MolluscAudio.pad;
    MolluscAudio.pad = null;
    if (old) {
      old.out.gain.setTargetAtTime(0, ctx.currentTime, 1.8);
      setTimeout(function () {
        old.nodes.forEach(function (n) { try { n.stop(); } catch (e) {} });
      }, 4200);
    }
    startPad();
  }

  function stopPad() {
    var ctx = MolluscAudio.ctx;
    if (!ctx) return;
    if (MolluscAudio.padTimer) { clearInterval(MolluscAudio.padTimer); MolluscAudio.padTimer = null; }
    if (MolluscAudio.bellTimer) { clearInterval(MolluscAudio.bellTimer); MolluscAudio.bellTimer = null; }
    var old = MolluscAudio.pad;
    MolluscAudio.pad = null;
    if (old) {
      old.out.gain.setTargetAtTime(0, ctx.currentTime, 0.7);
      setTimeout(function () {
        old.nodes.forEach(function (n) { try { n.stop(); } catch (e) {} });
      }, 1800);
    }
  }

  /* an occasional glass bell, like a drip inside the shell */
  function maybeBell() {
    var ctx = MolluscAudio.ctx;
    if (!ctx || !MolluscAudio.musicEnabled || MolluscAudio.fileMusicMode) return;
    if (Math.random() > 0.55) return;
    var f = BELLS[(Math.random() * BELLS.length) | 0];
    var now = ctx.currentTime;
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.11, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 2.4);
    o.connect(g); g.connect(MolluscAudio.musicGain);
    o.start(now); o.stop(now + 2.5);
  }

  /* ---------------- Optional music file ---------------- */
  function tryFileMusic() {
    var el = document.getElementById('bgm-audio');
    if (!el) return;
    MolluscAudio.fileEl = el;
    el.src = 'assets/audio/bgm.mp3';
    el.volume = 0.5;
    var settled = false;
    el.addEventListener('canplaythrough', function () {
      if (settled) return;
      settled = true;
      MolluscAudio.fileMusicMode = true;
      stopPad();
      if (MolluscAudio.musicEnabled && MolluscAudio.started) el.play().catch(function () {});
    });
    el.addEventListener('error', function () {
      if (settled) return;
      settled = true;
      MolluscAudio.fileMusicMode = false;
      if (MolluscAudio.started && MolluscAudio.musicEnabled) startPad();
    });
    el.load();
  }

  /* ---------------- API ---------------- */
  MolluscAudio.init = function () {
    var ctx = getCtx();
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(function () {});
    tryFileMusic();
  };

  MolluscAudio.startMusic = function () {
    MolluscAudio.started = true;
    var ctx = getCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume().catch(function () {});
    if (!MolluscAudio.musicEnabled) return;
    if (MolluscAudio.fileMusicMode && MolluscAudio.fileEl) {
      MolluscAudio.fileEl.play().catch(function () {});
    } else {
      startPad();
    }
  };

  MolluscAudio.setMusicEnabled = function (on) {
    MolluscAudio.musicEnabled = on;
    var ctx = MolluscAudio.ctx;
    if (MolluscAudio.musicGain && ctx) {
      MolluscAudio.musicGain.gain.setTargetAtTime(on ? 0.3 : 0, ctx.currentTime, 0.3);
    }
    if (MolluscAudio.fileMusicMode && MolluscAudio.fileEl) {
      if (on) MolluscAudio.fileEl.play().catch(function () {});
      else MolluscAudio.fileEl.pause();
    } else if (on) {
      if (MolluscAudio.started) startPad();
    } else {
      stopPad();
    }
  };

  MolluscAudio.setSfxEnabled = function (on) {
    MolluscAudio.sfxEnabled = on;
    if (MolluscAudio.sfxGain) MolluscAudio.sfxGain.gain.value = on ? 0.55 : 0;
  };

  function tone(o) {
    var ctx = getCtx();
    if (!ctx || !MolluscAudio.sfxEnabled) return;
    var now = ctx.currentTime + (o.delay || 0);
    var dur = o.dur || 0.2;
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.freq, now);
    if (o.freqEnd) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.freqEnd), now + dur);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(o.vol || 0.4, now + (o.attack || 0.008));
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(g); g.connect(MolluscAudio.sfxGain);
    osc.start(now); osc.stop(now + dur + 0.04);
  }

  MolluscAudio.playSfx = function (name) {
    if (!getCtx()) return;
    switch (name) {
      case 'click':
        tone({ freq: 880, type: 'sine', dur: 0.09, vol: 0.22 });
        tone({ freq: 1320, type: 'sine', dur: 0.06, vol: 0.1, delay: 0.02 });
        break;
      case 'pearl':   // bright little "plink" as a pearl lands in the tally
        tone({ freq: 1244.5, type: 'sine', dur: 0.28, vol: 0.3 });
        tone({ freq: 1864.7, type: 'sine', dur: 0.2, vol: 0.14, delay: 0.015 });
        break;
      case 'correct': // rising glass triad
        tone({ freq: 659.26, type: 'triangle', dur: 0.24, vol: 0.34 });
        tone({ freq: 830.61, type: 'triangle', dur: 0.26, vol: 0.32, delay: 0.1 });
        tone({ freq: 1108.73, type: 'sine', dur: 0.5, vol: 0.3, delay: 0.2 });
        break;
      case 'wrong':   // soft muted thud, never harsh
        tone({ freq: 196, freqEnd: 110, type: 'triangle', dur: 0.28, vol: 0.3 });
        tone({ freq: 98, type: 'sine', dur: 0.2, vol: 0.18, delay: 0.03 });
        break;
      case 'hint':    // the lure lights up
        tone({ freq: 523.25, freqEnd: 1046.5, type: 'sine', dur: 0.42, vol: 0.26 });
        break;
      case 'complete':
        [523.25, 659.26, 783.99, 1046.5, 1318.5].forEach(function (f, i) {
          tone({ freq: f, type: 'triangle', dur: i === 4 ? 0.9 : 0.3, vol: 0.32, delay: i * 0.13 });
        });
        break;
      default: break;
    }
  };

  global.MolluscAudio = MolluscAudio;
})(window);
