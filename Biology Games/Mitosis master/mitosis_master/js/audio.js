/* ==========================================================================
   audio.js - fully offline sound.

   Music:  generated live with Web Audio (a slow ambient pad + a sparse
           pentatonic arpeggio through a synthesised reverb).  Zero files.
           If assets/audio/bgm.mp3 exists it is used instead; if it fails to
           load for any reason we silently keep the procedural engine.
   SFX:    short synthesised one-shots, also file-free.

   Browsers block audio until a gesture, so everything stays suspended until
   Sound.unlock() is called from the first pointer/key event.
   ========================================================================== */
var Sound = (function () {
  'use strict';

  var BGM_FILE = 'assets/audio/bgm.mp3';

  var ctx = null;
  var master = null;          /* everything */
  var musicBus = null;        /* pad + arp + file */
  var sfxBus = null;
  var reverb = null;
  var reverbSend = null;

  var ready = false;
  var unlocked = false;
  var failed = false;         /* no Web Audio at all */

  var musicOn = true;
  var sfxOn = true;

  var pad = null;             /* procedural pad voices */
  var arpTimer = null;
  var arpStep = 0;
  var usingFile = false;
  var fileEl = null;
  var fileNode = null;

  /* Musical material: an A-minor pentatonic bed. Low, slow, unobtrusive. */
  var PAD_HZ = [110.00, 164.81, 220.00, 329.63];        /* A2 E3 A3 E4 */
  var ARP_HZ = [220.00, 261.63, 329.63, 392.00, 440.00, 523.25];
  var ARP_PATTERN = [0, 2, 4, 2, 3, 5, 3, 1];

  /* ---------------------------------------------------------------- setup - */
  function ctor() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { failed = true; return false; }
    try { ctx = new AC(); } catch (e) { failed = true; return false; }

    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);

    /* Synthesised plate reverb: exponentially decaying stereo noise. */
    reverb = ctx.createConvolver();
    reverb.buffer = makeImpulse(2.6, 2.4);
    reverb.connect(master);

    reverbSend = ctx.createGain();
    reverbSend.gain.value = 0.34;
    reverbSend.connect(reverb);

    musicBus = ctx.createGain();
    musicBus.gain.value = 0;              /* faded in by setMusic() */
    musicBus.connect(master);
    musicBus.connect(reverbSend);

    sfxBus = ctx.createGain();
    sfxBus.gain.value = 0.85;
    sfxBus.connect(master);
    sfxBus.connect(reverbSend);

    ready = true;
    return true;
  }

  function makeImpulse(seconds, decay) {
    var rate = ctx.sampleRate;
    var len = Math.max(1, Math.floor(rate * seconds));
    var buf = ctx.createBuffer(2, len, rate);
    for (var c = 0; c < 2; c++) {
      var ch = buf.getChannelData(c);
      for (var i = 0; i < len; i++) {
        var t = i / len;
        ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay);
      }
    }
    return buf;
  }

  function now() { return ctx ? ctx.currentTime : 0; }

  /* ---------------------------------------------------------------- unlock - */
  function unlock() {
    if (failed) { return; }
    if (!ready && !ctor()) { return; }
    if (ctx.state === 'suspended') { ctx.resume(); }
    if (unlocked) { return; }
    unlocked = true;
    probeFile();
    if (musicOn) { startMusic(); }
  }

  /* -------------------------------------------------- optional bgm.mp3 ---- */
  function probeFile() {
    if (fileEl) { return; }

    var el = new Audio();
    el.loop = true;
    el.preload = 'auto';
    /* No crossOrigin: the track is always bundled alongside index.html, and
       requesting CORS would make the load fail outright under file://. */

    var settled = false;
    function accept() {
      if (settled) { return; }
      settled = true;
      fileEl = el;
      attachFile();
    }
    function reject() {
      if (settled) { return; }
      settled = true;
      el.removeAttribute('src');
    }

    el.addEventListener('canplaythrough', accept);
    el.addEventListener('error', reject);
    /* A file that never resolves either way must not hold anything up. */
    window.setTimeout(function () { if (!settled) { reject(); } }, 4000);

    try { el.src = BGM_FILE; el.load(); } catch (e) { reject(); }
  }

  function attachFile() {
    if (!ready || !fileEl) { return; }
    try {
      fileNode = ctx.createMediaElementSource(fileEl);
      fileNode.connect(musicBus);
    } catch (e) {
      /* Some WebViews refuse to route file:// media through Web Audio.
         Fall back to plain <audio> playback at a fixed level.            */
      fileNode = null;
      fileEl.volume = 0.5;
    }
    usingFile = true;
    if (musicOn) { stopProcedural(); playFile(); }
  }

  function playFile() {
    if (!fileEl) { return; }
    var p = fileEl.play();
    if (p && p.catch) { p.catch(function () { /* gesture not ready yet */ }); }
  }

  /* -------------------------------------------------- procedural music ---- */
  function startProcedural() {
    if (!ready || pad) { return; }

    pad = { voices: [], lfo: null, lfoGain: null, filter: null, bus: null };

    pad.bus = ctx.createGain();
    pad.bus.gain.value = 0.5;

    pad.filter = ctx.createBiquadFilter();
    pad.filter.type = 'lowpass';
    pad.filter.frequency.value = 620;
    pad.filter.Q.value = 0.9;
    pad.filter.connect(pad.bus);
    pad.bus.connect(musicBus);

    /* Slow filter sweep gives the bed a breathing quality. */
    pad.lfo = ctx.createOscillator();
    pad.lfo.frequency.value = 0.045;
    pad.lfoGain = ctx.createGain();
    pad.lfoGain.gain.value = 260;
    pad.lfo.connect(pad.lfoGain);
    pad.lfoGain.connect(pad.filter.frequency);
    pad.lfo.start();

    PAD_HZ.forEach(function (hz, i) {
      /* Two slightly detuned oscillators per note = gentle chorus. */
      for (var d = 0; d < 2; d++) {
        var osc = ctx.createOscillator();
        osc.type = i < 2 ? 'sine' : 'triangle';
        osc.frequency.value = hz * (d === 0 ? 1 : 1.0037);

        var g = ctx.createGain();
        g.gain.value = 0;
        g.gain.setTargetAtTime(0.16 / (i + 1), now(), 3.5);

        osc.connect(g);
        g.connect(pad.filter);
        osc.start();
        pad.voices.push({ osc: osc, gain: g });
      }
    });

    arpStep = 0;
    arpTimer = window.setInterval(arpTick, 1350);
    arpTick();
  }

  function arpTick() {
    if (!ready || !musicOn || usingFile) { return; }
    if (ctx.state !== 'running') { return; }

    var idx = ARP_PATTERN[arpStep % ARP_PATTERN.length];
    arpStep++;

    var t = now() + 0.02;
    var hz = ARP_HZ[idx];

    var osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = hz;

    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.10, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);

    osc.connect(g);
    g.connect(musicBus);
    if (reverbSend) { g.connect(reverbSend); }

    osc.start(t);
    osc.stop(t + 1.6);

    /* Every other bar, add a soft octave shimmer. */
    if (arpStep % 4 === 0) {
      var o2 = ctx.createOscillator();
      o2.type = 'sine';
      o2.frequency.value = hz * 2;
      var g2 = ctx.createGain();
      g2.gain.setValueAtTime(0.0001, t);
      g2.gain.exponentialRampToValueAtTime(0.045, t + 0.12);
      g2.gain.exponentialRampToValueAtTime(0.0001, t + 2.0);
      o2.connect(g2); g2.connect(musicBus);
      o2.start(t); o2.stop(t + 2.1);
    }
  }

  function stopProcedural() {
    if (arpTimer) { window.clearInterval(arpTimer); arpTimer = null; }
    if (!pad) { return; }

    var t = now();
    pad.voices.forEach(function (v) {
      try {
        v.gain.gain.cancelScheduledValues(t);
        v.gain.gain.setTargetAtTime(0, t, 0.5);
        v.osc.stop(t + 2.2);
      } catch (e) { /* already stopped */ }
    });
    try { pad.lfo.stop(t + 2.2); } catch (e) { /* already stopped */ }
    pad = null;
  }

  function startMusic() {
    if (!ready || !unlocked) { return; }
    if (usingFile) { playFile(); } else { startProcedural(); }
    musicBus.gain.cancelScheduledValues(now());
    musicBus.gain.setTargetAtTime(0.55, now(), 1.1);
  }

  function stopMusic() {
    if (!ready) { return; }
    musicBus.gain.cancelScheduledValues(now());
    musicBus.gain.setTargetAtTime(0, now(), 0.4);
    if (fileEl) { try { fileEl.pause(); } catch (e) { /* ignore */ } }
    window.setTimeout(function () { if (!musicOn) { stopProcedural(); } }, 900);
  }

  /* ------------------------------------------------------------- toggles -- */
  function setMusic(on) {
    musicOn = !!on;
    if (!ready) { return; }
    if (musicOn) { startMusic(); } else { stopMusic(); }
  }

  function setSfx(on) {
    sfxOn = !!on;
    if (sfxBus) { sfxBus.gain.setTargetAtTime(sfxOn ? 0.85 : 0, now(), 0.05); }
  }

  function isMusicOn() { return musicOn; }
  function isSfxOn() { return sfxOn; }
  function usesFile() { return usingFile; }

  /* ------------------------------------------------------------------ sfx - */
  function tone(opts) {
    if (!ready || !sfxOn || ctx.state !== 'running') { return; }

    var t = now() + 0.005;
    var dur = opts.dur || 0.18;

    var osc = ctx.createOscillator();
    osc.type = opts.type || 'sine';
    osc.frequency.setValueAtTime(opts.from, t);
    if (opts.to && opts.to !== opts.from) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.to), t + dur);
    }

    var g = ctx.createGain();
    var peak = opts.gain === undefined ? 0.3 : opts.gain;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + Math.min(0.03, dur * 0.25));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    var tail = g;
    if (opts.cut) {
      var f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = opts.cut;
      g.connect(f);
      tail = f;
    }
    osc.connect(g);
    tail.connect(sfxBus);

    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  function noise(dur, cut, gain) {
    if (!ready || !sfxOn || ctx.state !== 'running') { return; }

    var t = now() + 0.005;
    var len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var ch = buf.getChannelData(0);
    for (var i = 0; i < len; i++) {
      ch[i] = (Math.random() * 2 - 1) * (1 - i / len);
    }

    var src = ctx.createBufferSource();
    src.buffer = buf;

    var f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = cut || 1400;
    f.Q.value = 1.1;

    var g = ctx.createGain();
    g.gain.value = gain === undefined ? 0.22 : gain;

    src.connect(f); f.connect(g); g.connect(sfxBus);
    src.start(t);
  }

  /* Named cues, so game code never deals in frequencies. */
  var CUES = {
    tap:      function () { tone({ type: 'sine',     from: 620,  to: 880,  dur: 0.09, gain: 0.16 }); },
    condense: function () { tone({ type: 'triangle', from: 300,  to: 760,  dur: 0.22, gain: 0.26, cut: 3200 });
                            noise(0.13, 2200, 0.10); },
    grab:     function () { tone({ type: 'sine',     from: 380,  to: 520,  dur: 0.07, gain: 0.13 }); },
    snap:     function () { tone({ type: 'triangle', from: 180,  to: 120,  dur: 0.16, gain: 0.30 });
                            tone({ type: 'sine',     from: 1180, to: 1560, dur: 0.20, gain: 0.13 }); },
    split:    function () { noise(0.20, 2600, 0.26);
                            tone({ type: 'sawtooth', from: 900,  to: 220,  dur: 0.24, gain: 0.16, cut: 2400 }); },
    trace:    function () { tone({ type: 'sine',     from: 1320, to: 1500, dur: 0.05, gain: 0.07 }); },
    envelope: function () { tone({ type: 'sine',     from: 520,  to: 1040, dur: 0.32, gain: 0.22 }); },
    pinch:    function () { tone({ type: 'triangle', from: 240,  to: 150,  dur: 0.19, gain: 0.24, cut: 1400 });
                            noise(0.16, 700, 0.14); },
    plate:    function () { tone({ type: 'sine',     from: 700,  to: 980,  dur: 0.14, gain: 0.18 });
                            noise(0.10, 3000, 0.08); },
    deny:     function () { tone({ type: 'square',   from: 200,  to: 140,  dur: 0.14, gain: 0.10, cut: 900 }); },
    click:    function () { tone({ type: 'square',   from: 900,  to: 1300, dur: 0.05, gain: 0.09, cut: 4000 });
                            noise(0.04, 3200, 0.06); },
    clear:    function () { chord([523.25, 659.25, 783.99], 0.5, 0.16); },
    victory:  function () { chord([440, 554.37, 659.25, 880], 1.1, 0.15);
                            window.setTimeout(function () { chord([523.25, 659.25, 783.99, 1046.5], 1.4, 0.13); }, 420); }
  };

  function chord(freqs, dur, gain) {
    if (!ready || !sfxOn) { return; }
    freqs.forEach(function (f, i) {
      window.setTimeout(function () {
        tone({ type: 'triangle', from: f, to: f, dur: dur, gain: gain });
      }, i * 70);
    });
  }

  function play(name) {
    if (failed || !ready) { return; }
    var cue = CUES[name];
    if (cue) { try { cue(); } catch (e) { /* never let audio break play */ } }
  }

  /* Pause/resume with the page so a backgrounded WebView goes quiet. */
  function suspend() { if (ready && ctx.state === 'running') { ctx.suspend(); } }
  function resume() {
    if (ready && ctx.state === 'suspended' && unlocked) {
      ctx.resume();
      if (musicOn && usingFile) { playFile(); }
    }
  }

  return {
    unlock: unlock,
    play: play,
    setMusic: setMusic,
    setSfx: setSfx,
    isMusicOn: isMusicOn,
    isSfxOn: isSfxOn,
    usesFile: usesFile,
    suspend: suspend,
    resume: resume
  };
}());
