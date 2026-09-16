/* ============================================================================
 * MOSS SPOREFALL — audio
 *
 * Background music is synthesised in the browser with the Web Audio API, so
 * the game needs no audio files and works fully offline. If the optional file
 * assets/audio/bgm.mp3 is present it overrides the procedural score; if it is
 * missing (the default) the synth is used and nothing breaks.
 * ==========================================================================*/
(function (global) {
  'use strict';

  var ctx = null;
  var ok = true;               // false if Web Audio is unavailable
  var masterGain = null;
  var musicGain = null;
  var sfxGain = null;
  var reverb = null;

  var musicOn = true;
  var sfxOn = true;
  var musicRunning = false;

  var padVoices = [];
  var padFilter = null;
  var windSrc = null;
  var chordTimer = null;
  var dripTimer = null;
  var chordIndex = 0;

  var fileAudio = null;        // HTMLAudioElement when bgm.mp3 exists
  var fileReady = false;

  var MUSIC_VOL = 0.32;
  var SFX_VOL = 0.55;

  function midi(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  /* Four slow, open chords — low and mossy. */
  var PROGRESSION = [
    [45, 52, 57, 64],   // A minor 9 flavour
    [41, 48, 52, 60],   // F major 7
    [48, 55, 59, 62],   // C add9
    [43, 50, 55, 59]    // G 6
  ];
  var DRIP_SCALE = [72, 74, 77, 79, 81, 84, 86];

  /* -------------------------------------------------------------- context */

  function ensureContext() {
    if (ctx || !ok) { return ctx; }
    var AC = global.AudioContext || global.webkitAudioContext;
    if (!AC) { ok = false; return null; }
    try {
      ctx = new AC();
    } catch (e) {
      ok = false;
      return null;
    }

    masterGain = ctx.createGain();
    masterGain.gain.value = 1;
    masterGain.connect(ctx.destination);

    reverb = ctx.createConvolver();
    reverb.buffer = makeImpulse(2.6, 2.4);
    var revGain = ctx.createGain();
    revGain.gain.value = 0.9;
    reverb.connect(revGain);
    revGain.connect(masterGain);

    musicGain = ctx.createGain();
    musicGain.gain.value = musicOn ? MUSIC_VOL : 0;
    musicGain.connect(masterGain);
    musicGain.connect(reverb);

    sfxGain = ctx.createGain();
    sfxGain.gain.value = sfxOn ? SFX_VOL : 0;
    sfxGain.connect(masterGain);
    sfxGain.connect(reverb);

    return ctx;
  }

  function makeImpulse(seconds, decay) {
    var rate = ctx.sampleRate;
    var len = Math.max(1, Math.floor(rate * seconds));
    var buf = ctx.createBuffer(2, len, rate);
    for (var c = 0; c < 2; c++) {
      var data = buf.getChannelData(c);
      for (var i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }
    return buf;
  }

  function makeNoiseBuffer(seconds) {
    var rate = ctx.sampleRate;
    var len = Math.max(1, Math.floor(rate * seconds));
    var buf = ctx.createBuffer(1, len, rate);
    var d = buf.getChannelData(0);
    var last = 0;
    for (var i = 0; i < len; i++) {
      var white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;   // brown-ish, gentle
      d[i] = last * 3.2;
    }
    return buf;
  }

  /** Resume the context after a user gesture (required by every browser). */
  function unlock() {
    var c = ensureContext();
    if (!c) { return; }
    if (c.state === 'suspended' && c.resume) {
      c.resume().catch(function () { /* ignored */ });
    }
    if (fileReady && musicOn && musicRunning && fileAudio && fileAudio.paused) {
      fileAudio.play().catch(function () { /* ignored */ });
    }
  }

  /* ------------------------------------------------------- optional bgm.mp3 */

  function probeMusicFile() {
    try {
      var a = new Audio();
      a.loop = true;
      a.preload = 'auto';
      a.volume = MUSIC_VOL;
      a.addEventListener('canplaythrough', function () {
        fileReady = true;
        fileAudio = a;
        if (musicRunning && musicOn) {
          stopProcedural();
          a.play().catch(function () { /* ignored */ });
        }
      }, { once: true });
      a.addEventListener('error', function () { fileReady = false; }, { once: true });
      a.src = 'assets/audio/bgm.mp3';
      a.load();
    } catch (e) {
      fileReady = false;
    }
  }

  /* ------------------------------------------------------ procedural music */

  function startProcedural() {
    var c = ensureContext();
    if (!c || padVoices.length) { return; }

    padFilter = c.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.value = 780;
    padFilter.Q.value = 0.7;
    padFilter.connect(musicGain);

    // Slow filter sweep so the pad breathes.
    var lfo = c.createOscillator();
    var lfoGain = c.createGain();
    lfo.frequency.value = 0.045;
    lfoGain.gain.value = 340;
    lfo.connect(lfoGain);
    lfoGain.connect(padFilter.frequency);
    lfo.start();
    padVoices.push({ osc: lfo, gain: lfoGain, isLfo: true });

    var chord = PROGRESSION[0];
    for (var i = 0; i < 4; i++) {
      var osc = c.createOscillator();
      osc.type = i === 0 ? 'sine' : 'triangle';
      osc.frequency.value = midi(chord[i]);
      osc.detune.value = (i - 1.5) * 5;
      var g = c.createGain();
      g.gain.value = 0;
      osc.connect(g);
      g.connect(padFilter);
      osc.start();
      g.gain.setTargetAtTime(i === 0 ? 0.30 : 0.16, c.currentTime, 2.4);
      padVoices.push({ osc: osc, gain: g, isLfo: false });
    }

    // Mist layer.
    windSrc = c.createBufferSource();
    windSrc.buffer = makeNoiseBuffer(4);
    windSrc.loop = true;
    var wf = c.createBiquadFilter();
    wf.type = 'bandpass';
    wf.frequency.value = 480;
    wf.Q.value = 0.8;
    var wg = c.createGain();
    wg.gain.value = 0.055;
    windSrc.connect(wf); wf.connect(wg); wg.connect(musicGain);
    windSrc.start();

    chordIndex = 0;
    chordTimer = setInterval(nextChord, 8200);
    scheduleDrip();
  }

  function nextChord() {
    if (!ctx || !padVoices.length) { return; }
    chordIndex = (chordIndex + 1) % PROGRESSION.length;
    var chord = PROGRESSION[chordIndex];
    var v = 0;
    for (var i = 0; i < padVoices.length; i++) {
      if (padVoices[i].isLfo) { continue; }
      padVoices[i].osc.frequency.setTargetAtTime(midi(chord[v]), ctx.currentTime, 1.6);
      v++;
    }
  }

  function scheduleDrip() {
    clearTimeout(dripTimer);
    dripTimer = setTimeout(function () {
      if (musicRunning && musicOn && !fileReady) { drip(); }
      scheduleDrip();
    }, 1400 + Math.random() * 3600);
  }

  /** A single water droplet plink — the signature sound of a damp forest. */
  function drip() {
    var c = ensureContext();
    if (!c) { return; }
    var t = c.currentTime;
    var note = DRIP_SCALE[(Math.random() * DRIP_SCALE.length) | 0];
    var osc = c.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(midi(note) * 1.4, t);
    osc.frequency.exponentialRampToValueAtTime(midi(note), t + 0.09);
    var g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.10, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.85);
    var pan = c.createStereoPanner ? c.createStereoPanner() : null;
    osc.connect(g);
    if (pan) { pan.pan.value = Math.random() * 1.6 - 0.8; g.connect(pan); pan.connect(musicGain); }
    else { g.connect(musicGain); }
    if (reverb) { g.connect(reverb); }
    osc.start(t);
    osc.stop(t + 0.95);
  }

  function stopProcedural() {
    clearInterval(chordTimer); chordTimer = null;
    clearTimeout(dripTimer); dripTimer = null;
    for (var i = 0; i < padVoices.length; i++) {
      try { padVoices[i].osc.stop(); } catch (e) { /* already stopped */ }
      try { padVoices[i].osc.disconnect(); padVoices[i].gain.disconnect(); } catch (e) { /* ignored */ }
    }
    padVoices = [];
    if (windSrc) {
      try { windSrc.stop(); windSrc.disconnect(); } catch (e) { /* ignored */ }
      windSrc = null;
    }
    if (padFilter) { try { padFilter.disconnect(); } catch (e) { /* ignored */ } padFilter = null; }
  }

  /* ---------------------------------------------------------------- public */

  function startMusic() {
    musicRunning = true;
    if (!musicOn) { return; }
    if (fileReady && fileAudio) {
      fileAudio.play().catch(function () { /* ignored */ });
    } else {
      startProcedural();
    }
  }

  function stopMusic() {
    musicRunning = false;
    if (fileAudio) { try { fileAudio.pause(); } catch (e) { /* ignored */ } }
    stopProcedural();
  }

  function setMusicEnabled(on) {
    musicOn = !!on;
    if (musicGain && ctx) {
      musicGain.gain.setTargetAtTime(musicOn ? MUSIC_VOL : 0, ctx.currentTime, 0.15);
    }
    if (!musicOn) {
      if (fileAudio) { try { fileAudio.pause(); } catch (e) { /* ignored */ } }
      stopProcedural();
    } else if (musicRunning) {
      startMusic();
    }
  }

  function setSfxEnabled(on) {
    sfxOn = !!on;
    if (sfxGain && ctx) {
      sfxGain.gain.setTargetAtTime(sfxOn ? SFX_VOL : 0, ctx.currentTime, 0.05);
    }
  }

  /* ------------------------------------------------------------------ sfx */

  function tone(opts) {
    var c = ensureContext();
    if (!c || !sfxOn) { return; }
    var t = c.currentTime + (opts.delay || 0);
    var osc = c.createOscillator();
    osc.type = opts.type || 'sine';
    osc.frequency.setValueAtTime(opts.from, t);
    if (opts.to && opts.to !== opts.from) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.to), t + opts.dur);
    }
    var g = c.createGain();
    var peak = opts.gain || 0.2;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + Math.min(0.02, opts.dur * 0.3));
    g.gain.exponentialRampToValueAtTime(0.0001, t + opts.dur);
    osc.connect(g);
    g.connect(sfxGain);
    osc.start(t);
    osc.stop(t + opts.dur + 0.02);
  }

  function noiseBurst(dur, freq, q, gain) {
    var c = ensureContext();
    if (!c || !sfxOn) { return; }
    var t = c.currentTime;
    var src = c.createBufferSource();
    src.buffer = makeNoiseBuffer(Math.max(0.2, dur));
    var f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq;
    f.Q.value = q;
    var g = c.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(sfxGain);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  var SFX = {
    ui: function () { tone({ type: 'triangle', from: 620, to: 880, dur: 0.09, gain: 0.14 }); },
    back: function () { tone({ type: 'triangle', from: 620, to: 380, dur: 0.11, gain: 0.13 }); },
    collect: function (streak) {
      var base = 660 * Math.pow(1.0595, Math.min(streak || 0, 8) * 2);
      tone({ type: 'sine', from: base, to: base * 1.5, dur: 0.16, gain: 0.22 });
      tone({ type: 'sine', from: base * 1.5, to: base * 2.02, dur: 0.22, gain: 0.15, delay: 0.07 });
    },
    moisture: function () {
      tone({ type: 'sine', from: 420, to: 1180, dur: 0.3, gain: 0.2 });
    },
    hurt: function () {
      tone({ type: 'sawtooth', from: 260, to: 70, dur: 0.34, gain: 0.2 });
      noiseBurst(0.3, 320, 0.7, 0.16);
    },
    warn: function () {
      tone({ type: 'square', from: 300, to: 190, dur: 0.2, gain: 0.12 });
    },
    land: function () {
      tone({ type: 'sine', from: 180, to: 90, dur: 0.4, gain: 0.24 });
      noiseBurst(0.35, 700, 1.2, 0.12);
    },
    win: function () {
      [0, 4, 7, 12, 16].forEach(function (semi, i) {
        tone({ type: 'triangle', from: midi(64 + semi), to: midi(64 + semi), dur: 0.5, gain: 0.16, delay: i * 0.11 });
      });
    },
    lose: function () {
      [0, -3, -5, -12].forEach(function (semi, i) {
        tone({ type: 'triangle', from: midi(60 + semi), to: midi(60 + semi), dur: 0.55, gain: 0.15, delay: i * 0.16 });
      });
    },
    whoosh: function () { noiseBurst(0.22, 900, 0.6, 0.07); }
  };

  function play(name, arg) {
    if (!sfxOn) { return; }
    var fn = SFX[name];
    if (fn) { fn(arg); }
  }

  global.GameAudio = {
    unlock: unlock,
    probeMusicFile: probeMusicFile,
    startMusic: startMusic,
    stopMusic: stopMusic,
    setMusicEnabled: setMusicEnabled,
    setSfxEnabled: setSfxEnabled,
    isMusicOn: function () { return musicOn; },
    isSfxOn: function () { return sfxOn; },
    usingMusicFile: function () { return fileReady; },
    play: play
  };
})(window);
