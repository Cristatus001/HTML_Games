/* ==========================================================================
   Hybrid Shooter — Audio Engine
   100% offline. Background music and every sound effect are synthesized in
   the browser with the Web Audio API — no audio files required. If a real
   music file is dropped at assets/audio/bgm.mp3 it is used automatically
   instead of the procedural pad loop (graceful override, graceful fallback).
   ========================================================================== */

const AudioEngine = (() => {
  let ctx = null;
  let master = null;
  let sfxGain = null;
  let musicGain = null;
  let musicOn = true;
  let sfxOn = true;
  let started = false;

  // Procedural music state
  let padNodes = [];
  let padTimer = null;

  // Drop-in file music state
  let fileEl = null;
  let usingFile = false;

  function ensureCtx() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 1;
    master.connect(ctx.destination);

    sfxGain = ctx.createGain();
    sfxGain.gain.value = sfxOn ? 0.8 : 0;
    sfxGain.connect(master);

    musicGain = ctx.createGain();
    musicGain.gain.value = musicOn ? 0.35 : 0;
    musicGain.connect(master);
    return ctx;
  }

  function resume() {
    ensureCtx();
    if (ctx.state === 'suspended') ctx.resume();
  }

  // --- SFX -----------------------------------------------------------------
  function blip({ freq = 440, dur = 0.12, type = 'sine', slideTo = null, gain = 0.5 } = {}) {
    if (!sfxOn) return;
    ensureCtx();
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(slideTo, 1), t0 + dur);
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(g);
    g.connect(sfxGain);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function noiseBurst({ dur = 0.25, gain = 0.35, filterFreq = 1200 } = {}) {
    if (!sfxOn) return;
    ensureCtx();
    const t0 = ctx.currentTime;
    const bufferSize = ctx.sampleRate * dur;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = filterFreq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(filt);
    filt.connect(g);
    g.connect(sfxGain);
    src.start(t0);
  }

  const SFX = {
    shoot: () => blip({ freq: 880, slideTo: 1400, dur: 0.09, type: 'square', gain: 0.25 }),
    correct: () => {
      blip({ freq: 523.25, dur: 0.1, type: 'triangle', gain: 0.4 });
      setTimeout(() => blip({ freq: 783.99, dur: 0.16, type: 'triangle', gain: 0.4 }), 70);
    },
    wrong: () => blip({ freq: 220, slideTo: 90, dur: 0.3, type: 'sawtooth', gain: 0.35 }),
    explosion: () => noiseBurst({ dur: 0.35, gain: 0.5, filterFreq: 900 }),
    lifeLost: () => {
      blip({ freq: 300, slideTo: 100, dur: 0.35, type: 'sawtooth', gain: 0.4 });
      noiseBurst({ dur: 0.3, gain: 0.3, filterFreq: 600 });
    },
    powerup: () => {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
        setTimeout(() => blip({ freq: f, dur: 0.14, type: 'triangle', gain: 0.35 }), i * 60)
      );
    },
    click: () => blip({ freq: 700, dur: 0.06, type: 'square', gain: 0.2 }),
    gameOver: () => {
      [392, 349.23, 293.66, 220].forEach((f, i) =>
        setTimeout(() => blip({ freq: f, dur: 0.3, type: 'sawtooth', gain: 0.3 }), i * 150)
      );
    },
    win: () => {
      [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) =>
        setTimeout(() => blip({ freq: f, dur: 0.25, type: 'triangle', gain: 0.35 }), i * 110)
      );
    }
  };

  function playSfx(name) {
    if (SFX[name]) SFX[name]();
  }

  // --- Procedural ambient pad loop -----------------------------------------
  const PAD_CHORDS = [
    [130.81, 164.81, 196.0],   // C3 E3 G3
    [146.83, 174.61, 220.0],   // D3 F3 A3
    [130.81, 164.81, 207.65],  // C3 E3 Ab3
    [116.54, 146.83, 174.61]   // Bb2 D3 F3
  ];
  let chordIndex = 0;

  function startProceduralLoop() {
    if (usingFile) return;
    ensureCtx();
    stopProceduralLoop();
    playChord();
  }

  function playChord() {
    const chord = PAD_CHORDS[chordIndex % PAD_CHORDS.length];
    chordIndex++;
    const t0 = ctx.currentTime;
    const chordDur = 4.2;

    chord.forEach((freq) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(0.18, t0 + 1.2);
      g.gain.linearRampToValueAtTime(0.18, t0 + chordDur - 1.2);
      g.gain.linearRampToValueAtTime(0, t0 + chordDur);
      osc.connect(g);
      g.connect(musicGain);
      osc.start(t0);
      osc.stop(t0 + chordDur + 0.1);
      padNodes.push(osc);

      // a soft octave-up shimmer for sparkle
      const osc2 = ctx.createOscillator();
      const g2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.value = freq * 2;
      g2.gain.setValueAtTime(0, t0);
      g2.gain.linearRampToValueAtTime(0.05, t0 + 1.5);
      g2.gain.linearRampToValueAtTime(0.05, t0 + chordDur - 1.5);
      g2.gain.linearRampToValueAtTime(0, t0 + chordDur);
      osc2.connect(g2);
      g2.connect(musicGain);
      osc2.start(t0);
      osc2.stop(t0 + chordDur + 0.1);
      padNodes.push(osc2);
    });

    padTimer = setTimeout(playChord, chordDur * 1000 - 200);
  }

  function stopProceduralLoop() {
    if (padTimer) clearTimeout(padTimer);
    padTimer = null;
    padNodes.forEach((n) => {
      try { n.stop(); } catch (e) { /* already stopped */ }
    });
    padNodes = [];
  }

  // --- Optional drop-in music file -----------------------------------------
  function tryLoadMusicFile(src) {
    return new Promise((resolve) => {
      const el = new Audio();
      el.loop = true;
      el.volume = musicOn ? 0.5 : 0;
      el.oncanplaythrough = () => {
        fileEl = el;
        usingFile = true;
        resolve(true);
      };
      el.onerror = () => resolve(false);
      el.src = src;
      // If nothing fires in a reasonable window, treat as missing.
      setTimeout(() => resolve(usingFile), 1500);
    });
  }

  async function startMusic() {
    resume();
    const found = await tryLoadMusicFile('assets/audio/bgm.mp3');
    if (found && fileEl) {
      fileEl.play().catch(() => {});
    } else {
      startProceduralLoop();
    }
    started = true;
  }

  function setMusicOn(on) {
    musicOn = on;
    if (musicGain) musicGain.gain.value = on ? 0.35 : 0;
    if (fileEl) fileEl.volume = on ? 0.5 : 0;
  }

  function setSfxOn(on) {
    sfxOn = on;
    if (sfxGain) sfxGain.gain.value = on ? 0.8 : 0;
  }

  function isMusicOn() { return musicOn; }
  function isSfxOn() { return sfxOn; }

  return {
    resume,
    startMusic,
    setMusicOn,
    setSfxOn,
    isMusicOn,
    isSfxOn,
    play: playSfx
  };
})();
