/* Audio: fully procedural Web Audio music and effects, so the game needs no
   sound files at all. If assets/audio/bgm.mp3 exists it takes over as the
   music bed; if it is missing (the default) the synth pad plays instead.      */
(function (global) {
  'use strict';

  var ctx = null;
  var master = null;      /* everything                     */
  var musicBus = null;    /* synth pad + melody             */
  var sfxBus = null;      /* one-shots                      */
  var reverbSend = null;

  var musicOn = true;
  var sfxOn = true;
  var started = false;
  var scheduler = null;
  var nextNoteTime = 0;
  var step = 0;

  var fileTrack = null;   /* HTMLAudioElement when bgm.mp3 is present */
  var usingFile = false;

  var BPM = 78;
  var STEP_DUR = 60 / BPM / 2;   /* eighth notes */

  /* A minor / F / C / G — four bars of slow swamp harmony. */
  var CHORDS = [
    [110.00, 130.81, 164.81],          /* Am  */
    [87.31, 130.81, 174.61],           /* F   */
    [130.81, 164.81, 196.00],          /* C   */
    [98.00, 146.83, 196.00]            /* G   */
  ];
  /* Pentatonic voice for the sparse melody line. */
  var PENTA = [329.63, 392.00, 440.00, 523.25, 587.33, 659.25];

  function ensureCtx() {
    if (ctx) return ctx;
    var AC = global.AudioContext || global.webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
    } catch (err) {
      return null;
    }

    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);

    musicBus = ctx.createGain();
    musicBus.gain.value = musicOn ? 0.34 : 0;
    musicBus.connect(master);

    sfxBus = ctx.createGain();
    sfxBus.gain.value = sfxOn ? 0.6 : 0;
    sfxBus.connect(master);

    /* Cheap plate-ish reverb from a decaying noise impulse. */
    reverbSend = ctx.createGain();
    reverbSend.gain.value = 0.4;
    try {
      var conv = ctx.createConvolver();
      conv.buffer = impulse(2.2, 2.6);
      reverbSend.connect(conv);
      conv.connect(master);
    } catch (err) {
      reverbSend.connect(master);
    }
    return ctx;
  }

  function impulse(seconds, decay) {
    var rate = ctx.sampleRate;
    var len = Math.max(1, Math.floor(rate * seconds));
    var buf = ctx.createBuffer(2, len, rate);
    for (var ch = 0; ch < 2; ch++) {
      var data = buf.getChannelData(ch);
      for (var i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }
    return buf;
  }

  function noiseBuffer(seconds) {
    var len = Math.max(1, Math.floor(ctx.sampleRate * seconds));
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  /* ------------------------------------------------------------- music bed */

  function padVoice(freq, time, dur, gain) {
    var osc = ctx.createOscillator();
    var osc2 = ctx.createOscillator();
    var filt = ctx.createBiquadFilter();
    var amp = ctx.createGain();

    osc.type = 'sine';
    osc2.type = 'triangle';
    osc.frequency.value = freq;
    osc2.frequency.value = freq * 1.005;      /* slow beating */

    filt.type = 'lowpass';
    filt.frequency.value = 900;
    filt.Q.value = 0.7;

    amp.gain.value = 0;
    amp.gain.setValueAtTime(0, time);
    amp.gain.linearRampToValueAtTime(gain, time + dur * 0.35);
    amp.gain.linearRampToValueAtTime(0, time + dur);

    osc.connect(filt); osc2.connect(filt);
    filt.connect(amp);
    amp.connect(musicBus);
    amp.connect(reverbSend);

    osc.start(time); osc2.start(time);
    osc.stop(time + dur + 0.05); osc2.stop(time + dur + 0.05);
  }

  function pluck(freq, time, gain) {
    var osc = ctx.createOscillator();
    var amp = ctx.createGain();
    var filt = ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.value = freq;
    filt.type = 'lowpass';
    filt.frequency.setValueAtTime(2600, time);
    filt.frequency.exponentialRampToValueAtTime(700, time + 0.5);

    amp.gain.setValueAtTime(0, time);
    amp.gain.linearRampToValueAtTime(gain, time + 0.012);
    amp.gain.exponentialRampToValueAtTime(0.0008, time + 0.75);

    osc.connect(filt); filt.connect(amp);
    amp.connect(musicBus); amp.connect(reverbSend);
    osc.start(time); osc.stop(time + 0.8);
  }

  /* Filtered noise swell — reads as wind over water. */
  function breath(time, dur) {
    var src = ctx.createBufferSource();
    src.buffer = noiseBuffer(dur + 0.2);
    var filt = ctx.createBiquadFilter();
    filt.type = 'bandpass';
    filt.frequency.value = 520;
    filt.Q.value = 0.8;
    var amp = ctx.createGain();
    amp.gain.setValueAtTime(0, time);
    amp.gain.linearRampToValueAtTime(0.05, time + dur * 0.5);
    amp.gain.linearRampToValueAtTime(0, time + dur);
    src.connect(filt); filt.connect(amp); amp.connect(musicBus);
    src.start(time); src.stop(time + dur + 0.1);
  }

  /* A distant croak: two short descending blips. */
  function croak(time) {
    for (var i = 0; i < 2; i++) {
      var t = time + i * 0.14;
      var osc = ctx.createOscillator();
      var amp = ctx.createGain();
      var filt = ctx.createBiquadFilter();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150 - i * 12, t);
      osc.frequency.exponentialRampToValueAtTime(92 - i * 8, t + 0.1);
      filt.type = 'lowpass';
      filt.frequency.value = 700;
      amp.gain.setValueAtTime(0, t);
      amp.gain.linearRampToValueAtTime(0.09, t + 0.02);
      amp.gain.exponentialRampToValueAtTime(0.0008, t + 0.13);
      osc.connect(filt); filt.connect(amp);
      amp.connect(musicBus); amp.connect(reverbSend);
      osc.start(t); osc.stop(t + 0.16);
    }
  }

  function scheduleStep() {
    var bar = Math.floor(step / 8) % CHORDS.length;
    var inBar = step % 8;
    var t = nextNoteTime;

    if (inBar === 0) {
      CHORDS[bar].forEach(function (f, i) {
        padVoice(f, t, STEP_DUR * 8.4, i === 0 ? 0.15 : 0.1);
      });
      if (bar % 2 === 0) breath(t, STEP_DUR * 8);
    }
    if (inBar === 2 || inBar === 5) {
      var note = PENTA[(step * 3 + bar) % PENTA.length];
      pluck(note, t, inBar === 2 ? 0.1 : 0.07);
    }
    if (inBar === 6 && bar === 3 && Math.random() < 0.7) croak(t + STEP_DUR * 0.5);

    nextNoteTime += STEP_DUR;
    step++;
  }

  function pump() {
    if (!ctx || usingFile) return;
    while (nextNoteTime < ctx.currentTime + 0.6) scheduleStep();
  }

  /* -------------------------------------------------------- optional bgm.mp3 */

  function tryFileTrack() {
    var el = new Audio();
    el.loop = true;
    el.preload = 'auto';
    el.volume = 0.5;

    el.addEventListener('canplaythrough', function () {
      if (usingFile) return;
      usingFile = true;
      fileTrack = el;
      if (musicOn && started) el.play().catch(function () {});
    });
    /* Missing or unplayable file: stay on the synth, no error surfaces. */
    el.addEventListener('error', function () { usingFile = false; fileTrack = null; });
    el.src = 'assets/audio/bgm.mp3';
    try { el.load(); } catch (err) { /* ignore */ }
  }

  /* ------------------------------------------------------------------ sfx */

  function tone(opts) {
    if (!sfxOn) return;
    if (!ensureCtx()) return;
    var t = ctx.currentTime + (opts.delay || 0);
    var osc = ctx.createOscillator();
    var amp = ctx.createGain();
    osc.type = opts.type || 'sine';
    osc.frequency.setValueAtTime(opts.from, t);
    if (opts.to) osc.frequency.exponentialRampToValueAtTime(opts.to, t + opts.dur);
    amp.gain.setValueAtTime(0, t);
    amp.gain.linearRampToValueAtTime(opts.gain || 0.2, t + 0.01);
    amp.gain.exponentialRampToValueAtTime(0.0008, t + opts.dur);
    osc.connect(amp);
    amp.connect(sfxBus);
    if (opts.wet) amp.connect(reverbSend);
    osc.start(t); osc.stop(t + opts.dur + 0.02);
  }

  function noiseBurst(dur, freq, gain) {
    if (!sfxOn || !ensureCtx()) return;
    var t = ctx.currentTime;
    var src = ctx.createBufferSource();
    src.buffer = noiseBuffer(dur + 0.05);
    var filt = ctx.createBiquadFilter();
    filt.type = 'bandpass';
    filt.frequency.value = freq;
    filt.Q.value = 1.1;
    var amp = ctx.createGain();
    amp.gain.setValueAtTime(gain, t);
    amp.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    src.connect(filt); filt.connect(amp); amp.connect(sfxBus);
    src.start(t); src.stop(t + dur + 0.05);
  }

  var SFX = {
    hop:     function () { tone({ type: 'triangle', from: 300, to: 620, dur: 0.13, gain: 0.15 }); },
    land:    function () { noiseBurst(0.12, 260, 0.16); },
    collect: function () {
      tone({ type: 'sine', from: 660, to: 990, dur: 0.18, gain: 0.16, wet: true });
      tone({ type: 'sine', from: 990, to: 1320, dur: 0.22, gain: 0.1, delay: 0.07, wet: true });
    },
    correct: function () {
      [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) {
        tone({ type: 'triangle', from: f, dur: 0.34, gain: 0.14, delay: i * 0.085, wet: true });
      });
    },
    wrong:   function () {
      tone({ type: 'sawtooth', from: 190, to: 110, dur: 0.3, gain: 0.13 });
      noiseBurst(0.18, 180, 0.1);
    },
    splash:  function () { noiseBurst(0.4, 900, 0.2); tone({ type: 'sine', from: 420, to: 130, dur: 0.35, gain: 0.1 }); },
    click:   function () { tone({ type: 'square', from: 520, to: 700, dur: 0.07, gain: 0.09 }); },
    open:    function () { tone({ type: 'triangle', from: 380, to: 720, dur: 0.2, gain: 0.11, wet: true }); },
    win:     function () {
      [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach(function (f, i) {
        tone({ type: 'triangle', from: f, dur: 0.6, gain: 0.15, delay: i * 0.12, wet: true });
      });
      noiseBurst(0.5, 2400, 0.1);
    }
  };

  function play(name) {
    var fn = SFX[name];
    if (fn) fn();
  }

  /* --------------------------------------------------------------- control */

  /* Called from the first real user gesture so autoplay rules are satisfied. */
  function start() {
    if (!ensureCtx()) return;
    if (ctx.state === 'suspended') ctx.resume().catch(function () {});
    if (started) return;
    started = true;
    tryFileTrack();
    nextNoteTime = ctx.currentTime + 0.15;
    step = 0;
    pump();
    scheduler = global.setInterval(pump, 250);
    if (usingFile && fileTrack && musicOn) fileTrack.play().catch(function () {});
  }

  function setMusic(on) {
    musicOn = !!on;
    if (ctx && musicBus) {
      musicBus.gain.setTargetAtTime(musicOn ? 0.34 : 0, ctx.currentTime, 0.15);
    }
    if (fileTrack) {
      if (musicOn) fileTrack.play().catch(function () {});
      else fileTrack.pause();
    }
  }

  function setSfx(on) {
    sfxOn = !!on;
    if (ctx && sfxBus) sfxBus.gain.setTargetAtTime(sfxOn ? 0.6 : 0, ctx.currentTime, 0.05);
  }

  /* Duck the music while a quiz panel is open so the question reads calmly. */
  function duck(on) {
    if (!ctx || !musicBus || !musicOn) return;
    musicBus.gain.setTargetAtTime(on ? 0.14 : 0.34, ctx.currentTime, 0.2);
    if (fileTrack) fileTrack.volume = on ? 0.22 : 0.5;
  }

  function suspend() {
    if (ctx && ctx.state === 'running') ctx.suspend().catch(function () {});
    if (fileTrack) fileTrack.pause();
  }

  function resume() {
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(function () {});
    if (fileTrack && musicOn) fileTrack.play().catch(function () {});
  }

  global.Sound = {
    start: start,
    play: play,
    setMusic: setMusic,
    setSfx: setSfx,
    duck: duck,
    suspend: suspend,
    resume: resume,
    usesFile: function () { return usingFile; }
  };
})(window);
