/* ============================================================================
   Worm Guardian - Save the Sporophyte!
   A three-stage liverwort learning game.

   Runs fully offline: no CDNs, no network requests, no emoji glyphs.
   Every visual element can be overridden by dropping a PNG into
   assets/images/... (see assets/images/README.md); if a file is absent the
   game silently falls back to the built-in vector/canvas art.

   Gameplay values (speeds, goals, insect counts, collision radii, lives,
   score, dash length, invulnerability window) are unchanged from the
   original build. The field is rendered at a fixed 800x500 logical
   resolution and scaled to fit, so play is pixel-identical on every device.
   ========================================================================= */
'use strict';

(function () {

/* ============================================================================
   1. CONFIGURATION & CONTENT
   ========================================================================= */

var VIEW_W = 800;               // logical field width  (original max-width)
var VIEW_H = 500;               // logical field height (16:10)
var STEP_HZ = 60;               // fixed simulation rate - matches original
var STEP_MS = 1000 / STEP_HZ;

var GAME_LEVELS = [
  null, // 0-index unused
  {
    goal: 5,
    title: 'Basics of Habitat & Plant Body',
    insectCount: 2,
    sporophyteSpeed: 1.5,
    insectSpeed: 1.15,  // all insects roam
    hunters: 1,         // ...and this many track the worm

    facts: [
      'Habitat Card: Liverworts grow in moist, shady places like stream banks, damp soil, marshy ground, tree bark, and deep forests.',
      'Why moisture is needed: They require moisture because reproduction depends on water (sperm movement & gemma splash).',
      'Thalloid body: The plant body is thalloid in many liverworts, like Marchantia.',
      'Dorsiventral thallus: Thallus is dorsiventral\u2014it has an upper and lower surface.',
      'Appressed thallus: Thallus lies flat and closely attached to the ground.'
    ]
  },
  {
    goal: 7,
    title: 'Leafy form & Asexual Reproduction',
    insectCount: 4,
    sporophyteSpeed: 2.5,
    insectSpeed: 1.6,
    hunters: 2,

    facts: [
      'Leafy liverworts: Some liverworts are leafy, with leaf-like structures in two rows.',
      'Stem-like axis: Leafy liverworts have a small stem-like axis.',
      'Asexual reproduction \u2013 Fragmentation: Liverworts reproduce asexually by fragmentation\u2014each broken piece grows into a new plant.',
      'Gemmae: Gemmae are green, multicellular, asexual buds.',
      'Gemma cups: Gemmae form inside gemma cups on the thallus.',
      'Gemma dispersal: Gemmae detach and grow into new individuals, often splashed out by rain.',
      'Summary card: Asexual reproduction = Fragmentation + Gemmae formation.'
    ]
  },
  {
    goal: 10,
    title: 'Sexual Reproduction, Sporophyte Parts & Life Cycle',
    insectCount: 6,
    sporophyteSpeed: 3.5,
    insectSpeed: 2.1,
    hunters: 4,

    facts: [
      'Antheridia: Male sex organ = Antheridium.',
      'Archegonia: Female sex organ = Archegonium.',
      'Monoecious/Dioecious: Sex organs may occur on same thallus (monoecious) or different thalli (dioecious).',
      'Sporophyte dependence: Sporophyte remains attached and dependent on the gametophyte.',
      'Foot: Foot = absorbs nutrients from gametophyte.',
      'Seta: Seta = the stalk that raises the capsule.',
      'Capsule: Capsule = site of meiosis and spore formation.',
      'Spore production: Spores are formed inside the capsule.',
      'Spore germination: Spores germinate to form free-living gametophytes.',
      'Haplodominant life cycle: Life cycle is haploid-dominant\u2014gametophyte is the visible plant.'
    ]
  }
];

var TOTAL_LEVELS = GAME_LEVELS.length - 1;
var TOTAL_FACTS = GAME_LEVELS.slice(1).reduce(function (n, l) { return n + l.facts.length; }, 0);

var INSECT_TYPES = ['ladybug', 'ant', 'spider'];

/* --- worm body: every spore eaten makes the worm longer ----------------- */
var SEG_SPACING = 3.4;          // px between body points (speed-independent)
var WORM_BASE_SEGMENTS = 14;    // length at the start of a run
var WORM_GROWTH = 5;            // segments gained per spore
var WORM_MAX_SEGMENTS = 170;    // safety cap (a full run reaches ~124)

/* --- Learn More content (conceptual reference; kept away from How to Play) - */
var GLOSSARY = [
  ['Thallus', 'A flat, ribbon-like plant body with no true roots, stems or leaves. Many liverworts, such as Marchantia, are thalloid.'],
  ['Dorsiventral', 'Having a distinct upper (dorsal) and lower (ventral) surface. A liverwort thallus lies appressed \u2014 pressed flat \u2014 against the ground.'],
  ['Rhizoid', 'A fine, hair-like outgrowth on the underside of the thallus that anchors the plant and draws in water. Not a true root.'],
  ['Gemma (pl. gemmae)', 'A small green, multicellular asexual bud. Gemmae form inside gemma cups and are splashed out by raindrops to grow into new plants.'],
  ['Fragmentation', 'Asexual reproduction in which a broken piece of the thallus grows into a complete new plant.'],
  ['Antheridium', 'The male sex organ, which produces motile sperm.'],
  ['Archegonium', 'The flask-shaped female sex organ, which contains a single egg.'],
  ['Monoecious / Dioecious', 'Monoecious: both sex organs on the same thallus. Dioecious: male and female organs on separate thalli.'],
  ['Gametophyte', 'The haploid, gamete-producing generation. In liverworts this is the green, visible, free-living plant.'],
  ['Sporophyte', 'The diploid, spore-producing generation. In liverworts it stays small, attached to and dependent on the gametophyte, and has three parts: foot, seta and capsule.'],
  ['Foot', 'The base of the sporophyte, embedded in the gametophyte, absorbing nutrients from it.'],
  ['Seta', 'The short stalk that raises the capsule above the thallus so spores disperse further.'],
  ['Capsule', 'The head of the sporophyte, where meiosis takes place and spores are formed.'],
  ['Meiosis', 'The cell division inside the capsule that halves the chromosome number, turning diploid cells into haploid spores.'],
  ['Haplodominant life cycle', 'A life cycle in which the haploid gametophyte is the dominant, long-lived, visible generation \u2014 the pattern seen in all bryophytes.']
];

var CYCLE_STEPS = [
  ['1. Spore', 'A haploid spore lands on damp ground and germinates.'],
  ['2. Gametophyte', 'It grows into the green thallus \u2014 the plant you actually see.'],
  ['3. Sex organs', 'Antheridia and archegonia develop on the thallus.'],
  ['4. Fertilisation', 'Sperm swim through a film of water to the egg. No water, no fertilisation.'],
  ['5. Zygote', 'The fertilised egg divides inside the archegonium.'],
  ['6. Sporophyte', 'It forms foot, seta and capsule \u2014 fed by the gametophyte below.'],
  ['7. Meiosis', 'Inside the capsule, meiosis produces fresh haploid spores.'],
  ['8. Release', 'The capsule opens, spores scatter, and the cycle begins again.']
];

/* ============================================================================
   2. SMALL UTILITIES
   ========================================================================= */

function $(id) { return document.getElementById(id); }
function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
function rand(a, b) { return a + Math.random() * (b - a); }
function distance(x1, y1, x2, y2) {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}
function isTouchDevice() {
  try {
    if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) { return true; }
  } catch (e) { /* matchMedia unsupported */ }
  return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
}

/* ============================================================================
   3. OPTIONAL IMAGE ASSETS  (graceful fallback to built-in vector art)
   ========================================================================= */

var IMAGE_MANIFEST = {
  worm:       'assets/images/characters/worm.png',
  ladybug:    'assets/images/characters/ladybug.png',
  ant:        'assets/images/characters/ant.png',
  spider:     'assets/images/characters/spider.png',
  spore:      'assets/images/items/spore.png',
  bg_floor:   'assets/images/background/forest_floor.png',
  bg_far:     'assets/images/background/canopy_far.png',
  bg_near:    'assets/images/background/foliage_near.png',
  bg_overlay: 'assets/images/background/overlay.png'
};

var Assets = {
  images: {},
  pending: 0,
  loaded: 0,
  failed: 0,

  load: function (onProgress, onDone) {
    var keys = Object.keys(IMAGE_MANIFEST);
    var self = this;
    var settled = 0;
    this.pending = keys.length;

    if (!keys.length) { onDone(); return; }

    keys.forEach(function (key) {
      var img = new Image();
      var finish = function (ok) {
        if (img.__settled) { return; }
        img.__settled = true;
        settled++;
        if (ok) { self.images[key] = img; self.loaded++; }
        else { self.failed++; }
        if (onProgress) { onProgress(settled / keys.length); }
        if (settled === keys.length && onDone) { onDone(); }
      };
      img.onload = function () {
        // guard against zero-byte / broken files that still fire onload
        finish(img.naturalWidth > 0 && img.naturalHeight > 0);
      };
      img.onerror = function () { finish(false); };
      img.src = IMAGE_MANIFEST[key];
    });
  },

  get: function (key) {
    var img = this.images[key];
    return (img && img.complete && img.naturalWidth > 0) ? img : null;
  }
};

/* ============================================================================
   4. SAVED PROGRESS
   ========================================================================= */

var STORE_KEY = 'wormGuardian.save.v1';

var Save = {
  data: {
    unlocked: 1,
    bestScore: 0,
    stageBest: {},        // { "1": score }
    cleared: {},          // { "1": true }
    factsSeen: 0,
    settings: { music: true, sfx: true, touch: true }
  },
  available: true,

  load: function () {
    // first run: show the on-screen stick/dash only where they make sense
    this.data.settings.touch = isTouchDevice();
    try {
      var raw = window.localStorage.getItem(STORE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          this.data.unlocked   = clamp(parseInt(parsed.unlocked, 10) || 1, 1, TOTAL_LEVELS);
          this.data.bestScore  = parseInt(parsed.bestScore, 10) || 0;
          this.data.stageBest  = parsed.stageBest && typeof parsed.stageBest === 'object' ? parsed.stageBest : {};
          this.data.cleared    = parsed.cleared && typeof parsed.cleared === 'object' ? parsed.cleared : {};
          this.data.factsSeen  = clamp(parseInt(parsed.factsSeen, 10) || 0, 0, TOTAL_FACTS);
          if (parsed.settings && typeof parsed.settings === 'object') {
            this.data.settings.music = parsed.settings.music !== false;
            this.data.settings.sfx   = parsed.settings.sfx   !== false;
            this.data.settings.touch = parsed.settings.touch !== false;
          }
        }
      }
    } catch (e) {
      this.available = false;   // private mode / storage disabled - play on regardless
    }
    return this.data;
  },

  save: function () {
    if (!this.available) { return; }
    try { window.localStorage.setItem(STORE_KEY, JSON.stringify(this.data)); }
    catch (e) { this.available = false; }
  },

  wipe: function () {
    this.data = {
      unlocked: 1, bestScore: 0, stageBest: {}, cleared: {}, factsSeen: 0,
      settings: { music: this.data.settings.music, sfx: this.data.settings.sfx, touch: this.data.settings.touch }
    };
    this.save();
  }
};

/* ============================================================================
   5. AUDIO - procedural Web Audio music + SFX, optional bgm.mp3 override
   ========================================================================= */

var Audio_ = {
  ctx: null,
  master: null,
  musicBus: null,
  sfxBus: null,
  musicOn: true,
  sfxOn: true,
  started: false,
  schedulerId: null,
  nextChordTime: 0,
  chordIndex: 0,
  fileEl: null,
  usingFile: false,
  unlocked: false,

  // Am7 - Fmaj7 - Cmaj7 - G6 : slow, damp, forest-floor harmony
  chords: [
    { root: 55.00, notes: [220.00, 261.63, 329.63, 440.00] },  // A
    { root: 43.65, notes: [174.61, 261.63, 329.63, 440.00] },  // F
    { root: 65.41, notes: [196.00, 261.63, 329.63, 392.00] },  // C
    { root: 49.00, notes: [196.00, 246.94, 329.63, 392.00] }   // G
  ],
  pentatonic: [440.00, 523.25, 587.33, 659.25, 783.99, 880.00, 1046.50],
  CHORD_LEN: 7.2,

  init: function () {
    if (this.ctx) { return true; }
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { return false; }
    try { this.ctx = new AC(); } catch (e) { return false; }

    this.master = this.ctx.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(this.ctx.destination);

    this.musicBus = this.ctx.createGain();
    this.musicBus.gain.value = 0.0;
    this.musicBus.connect(this.master);

    this.sfxBus = this.ctx.createGain();
    this.sfxBus.gain.value = 0.55;
    this.sfxBus.connect(this.master);

    // a little air on the pad
    this.musicFilter = this.ctx.createBiquadFilter();
    this.musicFilter.type = 'lowpass';
    this.musicFilter.frequency.value = 900;
    this.musicFilter.Q.value = 0.6;
    this.musicFilter.connect(this.musicBus);

    var lfo = this.ctx.createOscillator();
    var lfoGain = this.ctx.createGain();
    lfo.frequency.value = 0.045;
    lfoGain.gain.value = 260;
    lfo.connect(lfoGain);
    lfoGain.connect(this.musicFilter.frequency);
    lfo.start();

    return true;
  },

  /* must be called from a real user gesture */
  unlock: function () {
    if (!this.init()) { return; }
    if (this.ctx.state === 'suspended') { this.ctx.resume(); }
    if (!this.unlocked) {
      this.unlocked = true;
      this.tryFile();
    }
    this.applyMusicState();
  },

  /* optional drop-in track overrides the synth if it actually loads */
  tryFile: function () {
    var self = this;
    var el = document.createElement('audio');
    el.loop = true;
    el.preload = 'auto';
    el.volume = 0;
    var settled = false;
    var fail = function () {
      if (settled) { return; }
      settled = true;
      self.fileEl = null;
      var hint = $('music-hint');
      if (hint) { hint.textContent = 'Ambient forest pad (procedural)'; }
    };
    var ok = function () {
      if (settled) { return; }
      settled = true;
      self.fileEl = el;
      self.usingFile = true;
      var hint = $('music-hint');
      if (hint) { hint.textContent = 'Custom track: assets/audio/bgm.mp3'; }
      self.stopSynth();
      self.applyMusicState();
    };
    el.addEventListener('canplaythrough', ok);
    el.addEventListener('error', fail);
    // if it has not loaded in 4s, stay on the synth
    window.setTimeout(fail, 4000);
    try { el.src = 'assets/audio/bgm.mp3'; el.load(); } catch (e) { fail(); }
  },

  applyMusicState: function () {
    if (!this.ctx) { return; }
    var on = this.musicOn;
    if (this.usingFile && this.fileEl) {
      if (on) {
        var p = this.fileEl.play();
        if (p && p.catch) { p.catch(function () {}); }
        this.fadeElement(this.fileEl, 0.55);
      } else {
        this.fadeElement(this.fileEl, 0);
      }
      return;
    }
    var t = this.ctx.currentTime;
    this.musicBus.gain.cancelScheduledValues(t);
    this.musicBus.gain.setValueAtTime(this.musicBus.gain.value, t);
    this.musicBus.gain.linearRampToValueAtTime(on ? 0.26 : 0.0, t + 1.1);
    if (on) { this.startSynth(); } else { this.stopSynth(); }
  },

  fadeElement: function (el, target) {
    if (el.__fade) { window.clearInterval(el.__fade); }
    var step = (target - el.volume) / 20;
    el.__fade = window.setInterval(function () {
      var v = el.volume + step;
      if ((step > 0 && v >= target) || (step < 0 && v <= target) || step === 0) {
        el.volume = clamp(target, 0, 1);
        window.clearInterval(el.__fade);
        el.__fade = null;
        if (target === 0) { el.pause(); }
      } else {
        el.volume = clamp(v, 0, 1);
      }
    }, 40);
  },

  startSynth: function () {
    if (this.schedulerId || this.usingFile) { return; }
    var self = this;
    this.nextChordTime = this.ctx.currentTime + 0.15;
    this.schedulerId = window.setInterval(function () { self.tick(); }, 300);
    this.tick();
  },

  stopSynth: function () {
    if (this.schedulerId) { window.clearInterval(this.schedulerId); this.schedulerId = null; }
  },

  tick: function () {
    if (!this.ctx) { return; }
    var horizon = this.ctx.currentTime + 2.0;
    while (this.nextChordTime < horizon) {
      this.scheduleChord(this.nextChordTime, this.chords[this.chordIndex % this.chords.length]);
      this.chordIndex++;
      this.nextChordTime += this.CHORD_LEN;
    }
  },

  scheduleChord: function (t, chord) {
    var ctx = this.ctx, L = this.CHORD_LEN, self = this;

    // sub-bass root
    this.voice(t, chord.root, L, 'sine', 0.20, 2.4);
    this.voice(t, chord.root * 2, L, 'triangle', 0.09, 2.4);

    // pad voices, gently detuned so the chord breathes
    chord.notes.forEach(function (f, i) {
      self.voice(t + i * 0.11, f, L - i * 0.11, 'triangle', 0.062, 2.0, -5 + i * 3);
      self.voice(t + i * 0.11, f, L - i * 0.11, 'sawtooth', 0.020, 2.0, 6 - i * 3);
    });

    // sparse bell melody - a few droplets per chord
    var beats = 8, beat = L / beats;
    for (var b = 0; b < beats; b++) {
      if (Math.random() < 0.34) {
        var n = this.pentatonic[Math.floor(Math.random() * this.pentatonic.length)];
        this.bell(t + b * beat + rand(-0.03, 0.03), n, rand(0.05, 0.1));
      }
    }
  },

  voice: function (t, freq, dur, type, peak, fade, detune) {
    if (!this.ctx || t < this.ctx.currentTime - 0.05) { return; }
    var o = this.ctx.createOscillator();
    var g = this.ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    if (detune) { o.detune.value = detune; }
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + fade);
    g.gain.setValueAtTime(peak, t + Math.max(fade, dur - fade));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(this.musicFilter);
    o.start(t);
    o.stop(t + dur + 0.05);
  },

  bell: function (t, freq, peak) {
    if (!this.ctx || t < this.ctx.currentTime - 0.05) { return; }
    var o = this.ctx.createOscillator();
    var g = this.ctx.createGain();
    o.type = 'sine';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
    o.connect(g);
    g.connect(this.musicFilter);
    o.start(t);
    o.stop(t + 1.6);
  },

  /* ---------------------------- sound effects ---------------------------- */
  blip: function (freq, dur, type, peak, sweepTo) {
    if (!this.sfxOn || !this.ctx) { return; }
    var t = this.ctx.currentTime;
    var o = this.ctx.createOscillator();
    var g = this.ctx.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t);
    if (sweepTo) { o.frequency.exponentialRampToValueAtTime(Math.max(20, sweepTo), t + dur); }
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak || 0.2, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(this.sfxBus);
    o.start(t);
    o.stop(t + dur + 0.02);
  },

  noise: function (dur, from, to, peak) {
    if (!this.sfxOn || !this.ctx) { return; }
    var t = this.ctx.currentTime;
    var len = Math.floor(this.ctx.sampleRate * dur);
    var buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) { d[i] = (Math.random() * 2 - 1) * (1 - i / len); }
    var src = this.ctx.createBufferSource();
    src.buffer = buf;
    var f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 1.1;
    f.frequency.setValueAtTime(from, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(60, to), t + dur);
    var g = this.ctx.createGain();
    g.gain.setValueAtTime(peak || 0.18, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.sfxBus);
    src.start(t);
    src.stop(t + dur + 0.02);
  },

  arp: function (freqs, gap, type, peak, dur) {
    if (!this.sfxOn || !this.ctx) { return; }
    var self = this;
    freqs.forEach(function (f, i) {
      window.setTimeout(function () { self.blip(f, dur || 0.16, type || 'triangle', peak || 0.2); }, i * gap);
    });
  },

  sfx: {
    click:    function () { Audio_.blip(520, 0.055, 'square', 0.10); },
    hover:    function () { Audio_.blip(760, 0.03, 'sine', 0.05); },
    collect:  function () { Audio_.arp([659.25, 987.77], 55, 'triangle', 0.20, 0.14); Audio_.noise(0.18, 2400, 6200, 0.06); },
    dash:     function () { Audio_.noise(0.24, 320, 2600, 0.14); Audio_.blip(180, 0.16, 'sawtooth', 0.08, 460); },
    hurt:     function () { Audio_.blip(200, 0.34, 'sawtooth', 0.24, 55); Audio_.noise(0.26, 900, 140, 0.14); },
    levelup:  function () { Audio_.arp([523.25, 659.25, 783.99, 1046.50], 95, 'triangle', 0.20, 0.26); },
    win:      function () { Audio_.arp([523.25, 659.25, 783.99, 1046.50, 1318.51], 120, 'triangle', 0.22, 0.4); },
    lose:     function () { Audio_.arp([392.00, 329.63, 261.63, 196.00], 150, 'sawtooth', 0.16, 0.34); },
    unlock:   function () { Audio_.arp([440, 587.33, 880], 80, 'sine', 0.18, 0.3); }
  },

  suspend: function () { if (this.ctx && this.ctx.state === 'running') { this.ctx.suspend(); } if (this.fileEl) { this.fileEl.pause(); } },
  resume:  function () {
    if (this.ctx && this.ctx.state === 'suspended') { this.ctx.resume(); }
    if (this.usingFile && this.fileEl && this.musicOn) { var p = this.fileEl.play(); if (p && p.catch) { p.catch(function () {}); } }
  }
};

function playSfx(name) {
  if (Audio_.sfx[name]) { Audio_.sfx[name](); }
}

/* ============================================================================
   6. PARTICLES  (purely decorative - never touch collision)
   ========================================================================= */

var Particles = {
  list: [],

  spawn: function (x, y, opts) {
    opts = opts || {};
    var n = opts.count || 12;
    for (var i = 0; i < n; i++) {
      var a = opts.angle !== undefined ? opts.angle + rand(-0.9, 0.9) : rand(0, Math.PI * 2);
      var sp = rand(opts.speedMin || 1.2, opts.speedMax || 4.4);
      this.list.push({
        x: x, y: y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 1,
        decay: rand(opts.decayMin || 0.018, opts.decayMax || 0.04),
        r: rand(opts.rMin || 1.6, opts.rMax || 4.2),
        hue: opts.hue || 'gold',
        grav: opts.grav === undefined ? 0.045 : opts.grav,
        spin: rand(-0.2, 0.2)
      });
    }
    if (this.list.length > 460) { this.list.splice(0, this.list.length - 460); }
  },

  ring: function (x, y, hue) {
    this.list.push({ ring: true, x: x, y: y, r: 6, life: 1, decay: 0.05, hue: hue || 'gold' });
  },

  step: function () {
    for (var i = this.list.length - 1; i >= 0; i--) {
      var p = this.list[i];
      p.life -= p.decay;
      if (p.life <= 0) { this.list.splice(i, 1); continue; }
      if (p.ring) { p.r += 3.6; continue; }
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.grav;
      p.vx *= 0.975;
      p.vy *= 0.975;
    }
  },

  clear: function () { this.list.length = 0; }
};

var PARTICLE_COLORS = {
  gold:  ['#fff3cf', '#ffc75a', '#8b5418'],
  moss:  ['#e9ffd9', '#9dff6b', '#2f6a1c'],
  blood: ['#ffd9d4', '#ff6b5e', '#6e1616'],
  bio:   ['#ffffff', '#9dff6b', '#1f5a12']
};

/* ============================================================================
   7. FIELD BACKDROP  (animated, parallax; drawn under the entities)
   ========================================================================= */

var Backdrop = {
  motes: [],
  fronds: [],
  litter: [],
  ready: false,

  build: function () {
    var i;
    this.motes = [];
    for (i = 0; i < 46; i++) {
      this.motes.push({
        x: rand(0, VIEW_W), y: rand(0, VIEW_H),
        r: rand(0.7, 2.6), sp: rand(0.09, 0.42),
        drift: rand(-0.16, 0.16), ph: rand(0, Math.PI * 2),
        gold: Math.random() < 0.32
      });
    }
    this.fronds = [];
    for (i = 0; i < 16; i++) {
      var depth = rand(0.25, 1);
      this.fronds.push({
        x: rand(-40, VIEW_W + 40),
        y: rand(-30, VIEW_H + 30),
        r: rand(38, 130) * depth,
        depth: depth,
        rot: rand(0, Math.PI * 2),
        ph: rand(0, Math.PI * 2)
      });
    }
    this.litter = [];
    for (i = 0; i < 22; i++) {
      this.litter.push({
        x: rand(0, VIEW_W), y: rand(0, VIEW_H),
        w: rand(10, 30), h: rand(4, 10),
        rot: rand(0, Math.PI * 2), a: rand(0.05, 0.14)
      });
    }
    this.ready = true;
  },

  draw: function (ctx, time) {
    if (!this.ready) { this.build(); }

    // --- soil base ---------------------------------------------------------
    var floorImg = Assets.get('bg_floor');
    if (floorImg) {
      ctx.drawImage(floorImg, 0, 0, VIEW_W, VIEW_H);
    } else {
      var g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
      g.addColorStop(0, '#16301a');
      g.addColorStop(0.45, '#12250f');
      g.addColorStop(1, '#0a1709');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);

      var rg = ctx.createRadialGradient(VIEW_W * 0.5, VIEW_H * 0.36, 30, VIEW_W * 0.5, VIEW_H * 0.5, VIEW_W * 0.72);
      rg.addColorStop(0, 'rgba(120, 220, 110, 0.10)');
      rg.addColorStop(0.55, 'rgba(40, 110, 40, 0.04)');
      rg.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }

    // --- far parallax foliage ---------------------------------------------
    var farImg = Assets.get('bg_far');
    if (farImg) {
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.drawImage(farImg, Math.sin(time * 0.00006) * 12 - 6, 0, VIEW_W + 12, VIEW_H);
      ctx.restore();
    }

    // --- damp moss patches (soft blobs, slow breathing) --------------------
    ctx.save();
    for (var i = 0; i < this.fronds.length; i++) {
      var f = this.fronds[i];
      var wob = Math.sin(time * 0.0004 + f.ph) * 6 * f.depth;
      var a = 0.035 + f.depth * 0.05;
      var grd = ctx.createRadialGradient(f.x + wob, f.y, 2, f.x + wob, f.y, f.r);
      grd.addColorStop(0, 'rgba(90, 180, 80, ' + a.toFixed(3) + ')');
      grd.addColorStop(0.6, 'rgba(50, 120, 45, ' + (a * 0.5).toFixed(3) + ')');
      grd.addColorStop(1, 'rgba(20, 60, 20, 0)');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(f.x + wob, f.y, f.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // --- leaf litter flecks ------------------------------------------------
    ctx.save();
    for (var j = 0; j < this.litter.length; j++) {
      var l = this.litter[j];
      ctx.save();
      ctx.translate(l.x, l.y);
      ctx.rotate(l.rot + Math.sin(time * 0.0002 + l.x) * 0.05);
      ctx.fillStyle = 'rgba(150, 190, 110, ' + l.a + ')';
      ctx.beginPath();
      ctx.ellipse(0, 0, l.w * 0.5, l.h * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();

    // --- light shafts ------------------------------------------------------
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (var k = 0; k < 3; k++) {
      var bx = VIEW_W * (0.18 + k * 0.31) + Math.sin(time * 0.00013 + k) * 26;
      var sg = ctx.createLinearGradient(bx, 0, bx + 90, VIEW_H);
      var pulse = 0.028 + 0.018 * Math.sin(time * 0.0005 + k * 1.7);
      sg.addColorStop(0, 'rgba(190, 255, 160, ' + pulse.toFixed(3) + ')');
      sg.addColorStop(1, 'rgba(190, 255, 160, 0)');
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.moveTo(bx - 34, -10);
      ctx.lineTo(bx + 40, -10);
      ctx.lineTo(bx + 128, VIEW_H + 10);
      ctx.lineTo(bx + 26, VIEW_H + 10);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // --- floating spore motes ---------------------------------------------
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (var m = 0; m < this.motes.length; m++) {
      var p = this.motes[m];
      p.y -= p.sp;
      p.x += p.drift + Math.sin(time * 0.001 + p.ph) * 0.16;
      if (p.y < -8) { p.y = VIEW_H + 8; p.x = rand(0, VIEW_W); }
      if (p.x < -8) { p.x = VIEW_W + 8; } else if (p.x > VIEW_W + 8) { p.x = -8; }
      var tw = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(time * 0.002 + p.ph));
      var mg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
      if (p.gold) {
        mg.addColorStop(0, 'rgba(255, 236, 180, ' + (0.5 * tw).toFixed(3) + ')');
        mg.addColorStop(0.35, 'rgba(255, 199, 90, ' + (0.22 * tw).toFixed(3) + ')');
        mg.addColorStop(1, 'rgba(255, 199, 90, 0)');
      } else {
        mg.addColorStop(0, 'rgba(230, 255, 210, ' + (0.5 * tw).toFixed(3) + ')');
        mg.addColorStop(0.35, 'rgba(157, 255, 107, ' + (0.20 * tw).toFixed(3) + ')');
        mg.addColorStop(1, 'rgba(157, 255, 107, 0)');
      }
      ctx.fillStyle = mg;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // --- near parallax overlay --------------------------------------------
    var nearImg = Assets.get('bg_near');
    if (nearImg) {
      ctx.save();
      ctx.globalAlpha = 0.8;
      ctx.drawImage(nearImg, Math.sin(time * 0.0001) * 20 - 10, 0, VIEW_W + 20, VIEW_H);
      ctx.restore();
    }
    var ovImg = Assets.get('bg_overlay');
    if (ovImg) {
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.drawImage(ovImg, 0, 0, VIEW_W, VIEW_H);
      ctx.restore();
    }
  }
};

/* ============================================================================
   8. ENTITY ART  (image if supplied, otherwise procedural canvas art)
   ========================================================================= */

var Art = {

  /* worm body ramp: lit crest -> mid tone -> shaded tail */
  BODY_LIT:  [255, 205, 193],
  BODY_MID:  [214, 116, 116],
  BODY_DARK: [126, 52, 58],

  _mix: function (a, b, t) {
    t = t < 0 ? 0 : (t > 1 ? 1 : t);
    return 'rgb(' + Math.round(a[0] + (b[0] - a[0]) * t) + ',' +
                    Math.round(a[1] + (b[1] - a[1]) * t) + ',' +
                    Math.round(a[2] + (b[2] - a[2]) * t) + ')';
  },

  /* --- collectible sporophyte spore --- */
  spore: function (ctx, x, y, r, time, seed) {
    var img = Assets.get('spore');
    var bob = Math.sin(time * 0.003 + seed) * 1.6;
    var pulse = 0.82 + 0.18 * Math.sin(time * 0.004 + seed);

    // outer bloom
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    var gl = ctx.createRadialGradient(x, y + bob, r * 0.3, x, y + bob, r * 2.5);
    gl.addColorStop(0, 'rgba(255, 214, 130, ' + (0.42 * pulse).toFixed(3) + ')');
    gl.addColorStop(0.45, 'rgba(255, 170, 60, ' + (0.16 * pulse).toFixed(3) + ')');
    gl.addColorStop(1, 'rgba(255, 150, 40, 0)');
    ctx.fillStyle = gl;
    ctx.beginPath();
    ctx.arc(x, y + bob, r * 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (img) {
      var d = r * 2.4;
      ctx.drawImage(img, x - d / 2, y + bob - d / 2, d, d);
      return;
    }

    // body: lit from within
    var bg = ctx.createRadialGradient(x - r * 0.34, y + bob - r * 0.4, r * 0.12, x, y + bob, r);
    bg.addColorStop(0, '#fff3d0');
    bg.addColorStop(0.32, '#ffcf72');
    bg.addColorStop(0.72, '#c8801f');
    bg.addColorStop(1, '#6d3f0d');
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.arc(x, y + bob, r, 0, Math.PI * 2);
    ctx.fill();

    // rim light
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 226, 150, 0.7)';
    ctx.lineWidth = Math.max(1, r * 0.11);
    ctx.beginPath();
    ctx.arc(x, y + bob, r * 0.92, Math.PI * 0.15, Math.PI * 0.95);
    ctx.stroke();
    ctx.restore();

    // specular
    ctx.fillStyle = 'rgba(255, 252, 236, 0.85)';
    ctx.beginPath();
    ctx.ellipse(x - r * 0.34, y + bob - r * 0.4, r * 0.22, r * 0.15, -0.5, 0, Math.PI * 2);
    ctx.fill();

    // spore speckles inside the capsule
    ctx.fillStyle = 'rgba(120, 66, 12, 0.35)';
    for (var i = 0; i < 4; i++) {
      var a = seed + i * 1.9 + time * 0.0008;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * r * 0.44, y + bob + Math.sin(a) * r * 0.44, r * 0.1, 0, Math.PI * 2);
      ctx.fill();
    }
  },

  /* --- the guardian worm --- */
  worm: function (ctx, w, time) {
    var img = Assets.get('worm');
    var r = w.size;

    // dash aura
    if (w.dashing) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      var ag = ctx.createRadialGradient(w.x, w.y, r * 0.3, w.x, w.y, r * 2.4);
      ag.addColorStop(0, 'rgba(157, 255, 107, 0.42)');
      ag.addColorStop(1, 'rgba(157, 255, 107, 0)');
      ctx.fillStyle = ag;
      ctx.beginPath();
      ctx.arc(w.x, w.y, r * 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.globalAlpha = w.blinkHidden ? 0.32 : 1;

    /* --- body ---------------------------------------------------------
       The worm grows every time it eats, so the body is stroked in a dozen
       tapering chunks rather than one gradient-filled circle per segment.
       That keeps the cost flat whether it is 14 segments long or 170.      */
    var trail = w.trail;
    var n = Math.min(trail.length, w.segments);
    if (n > 1) {
      var pts = new Array(n);
      for (var i = 0; i < n; i++) { pts[i] = trail[trail.length - 1 - i]; }

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      var CH = 12;
      for (var c = CH - 1; c >= 0; c--) {   // tail first, so the head sits on top
        var a = Math.floor((n - 1) * c / CH);
        var b = Math.floor((n - 1) * (c + 1) / CH);
        if (b <= a) { continue; }
        var t = a / (n - 1);                     // 0 = head, 1 = tail
        var lw = r * 2 * (0.94 - 0.5 * t * t);

        ctx.beginPath();
        ctx.moveTo(pts[a].x, pts[a].y);
        for (var k = a + 1; k <= b; k++) { ctx.lineTo(pts[k].x, pts[k].y); }
        ctx.strokeStyle = Art._mix(Art.BODY_MID, Art.BODY_DARK, t);
        ctx.lineWidth = lw;
        ctx.stroke();

        // top-left sheen so the tube reads as lit from above
        ctx.save();
        ctx.globalAlpha *= 0.5;
        ctx.translate(-lw * 0.13, -lw * 0.17);
        ctx.beginPath();
        ctx.moveTo(pts[a].x, pts[a].y);
        for (var k2 = a + 1; k2 <= b; k2++) { ctx.lineTo(pts[k2].x, pts[k2].y); }
        ctx.strokeStyle = Art._mix(Art.BODY_LIT, Art.BODY_MID, Math.min(1, t + 0.3));
        ctx.lineWidth = lw * 0.32;
        ctx.stroke();
        ctx.restore();
      }

      // annuli, spaced along the body
      ctx.strokeStyle = 'rgba(108, 38, 44, 0.30)';
      ctx.lineWidth = Math.max(1, r * 0.1);
      for (var s2 = 3; s2 < n - 1; s2 += 5) {
        var p0 = pts[s2], p1 = pts[s2 + 1];
        var ax = p1.x - p0.x, ay = p1.y - p0.y;
        var al = Math.sqrt(ax * ax + ay * ay) || 1;
        var nx2 = -ay / al, ny2 = ax / al;
        var tt = s2 / (n - 1);
        var hw = r * (0.94 - 0.5 * tt * tt) * 0.78;
        ctx.beginPath();
        ctx.moveTo(p0.x + nx2 * hw, p0.y + ny2 * hw);
        ctx.lineTo(p0.x - nx2 * hw, p0.y - ny2 * hw);
        ctx.stroke();
      }
    }

    // --- head ---
    var hx = w.x, hy = w.y;
    if (img) {
      var d = r * 2.3;
      ctx.save();
      ctx.translate(hx, hy);
      ctx.rotate(w.dir);
      ctx.drawImage(img, -d / 2, -d / 2, d, d);
      ctx.restore();
      ctx.restore();
      return;
    }

    var hg = ctx.createRadialGradient(hx - r * 0.3, hy - r * 0.36, r * 0.1, hx, hy, r * 0.98);
    hg.addColorStop(0, '#ffe3d9');
    hg.addColorStop(0.42, '#f4aca4');
    hg.addColorStop(1, '#9b444a');
    ctx.fillStyle = hg;
    ctx.beginPath();
    ctx.arc(hx, hy, r * 0.98, 0, Math.PI * 2);
    ctx.fill();

    // eyes look where you steer
    var ex = Math.cos(w.dir), ey = Math.sin(w.dir);
    var px = -ey, py = ex;
    ctx.fillStyle = '#1a1410';
    [-1, 1].forEach(function (s) {
      ctx.beginPath();
      ctx.arc(hx + ex * r * 0.42 + px * s * r * 0.36, hy + ey * r * 0.42 + py * s * r * 0.36, r * 0.15, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    [-1, 1].forEach(function (s) {
      ctx.beginPath();
      ctx.arc(hx + ex * r * 0.38 + px * s * r * 0.33, hy + ey * r * 0.38 + py * s * r * 0.33, r * 0.06, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  },

  /* --- obstacles --- */
  insect: function (ctx, ins, time) {
    var img = Assets.get(ins.type);
    var r = ins.size;
    var idle = Math.sin(time * 0.0022 + ins.seed) * 1.2;

    // menacing under-glow so obstacles read instantly against the floor
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    var col = ins.type === 'ladybug' ? '214, 55, 55' : (ins.type === 'spider' ? '150, 90, 190' : '190, 120, 50');
    var gl = ctx.createRadialGradient(ins.x, ins.y + idle, r * 0.2, ins.x, ins.y + idle, r * 1.7);
    gl.addColorStop(0, 'rgba(' + col + ', 0.26)');
    gl.addColorStop(1, 'rgba(' + col + ', 0)');
    ctx.fillStyle = gl;
    ctx.beginPath();
    ctx.arc(ins.x, ins.y + idle, r * 1.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // contact shadow
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
    ctx.beginPath();
    ctx.ellipse(ins.x, ins.y + r * 0.86, r * 0.78, r * 0.24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // hunters get a pulsing tracking ring so you can read the threat at a glance
    if (ins.role === 'chase') {
      var p = 0.5 + 0.5 * Math.sin(time * 0.006 + ins.seed);
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 96, 84, ' + (0.22 + 0.34 * p).toFixed(3) + ')';
      ctx.lineWidth = 1.8;
      ctx.setLineDash([5, 6]);
      ctx.lineDashOffset = -time * 0.02;
      ctx.beginPath();
      ctx.arc(ins.x, ins.y + idle, r * 1.32 + p * 2.4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // the art is authored head-up, so turn it to face the way it is travelling
    ctx.save();
    ctx.translate(ins.x, ins.y + idle);
    ctx.rotate(ins.angle + Math.PI / 2);

    if (img) {
      var d = r * 2.4;
      ctx.drawImage(img, -d / 2, -d / 2, d, d);
      ctx.restore();
      return;
    }

    if (ins.type === 'ladybug') { Art._ladybug(ctx, r, time, ins.seed); }
    else if (ins.type === 'ant') { Art._ant(ctx, r, time, ins.seed); }
    else { Art._spider(ctx, r, time, ins.seed); }
    ctx.restore();
  },

  _ladybug: function (ctx, r, time, seed) {
    var wig = Math.sin(time * 0.004 + seed) * 0.12;
    // legs
    ctx.strokeStyle = '#1a1410';
    ctx.lineWidth = r * 0.11;
    ctx.lineCap = 'round';
    [-1, 1].forEach(function (s) {
      for (var i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(s * r * 0.4, -r * 0.2 + i * r * 0.38);
        ctx.lineTo(s * r * 0.95, -r * 0.34 + i * r * 0.48 + wig * r);
        ctx.stroke();
      }
    });
    // head
    ctx.fillStyle = '#20191a';
    ctx.beginPath();
    ctx.arc(0, -r * 0.56, r * 0.44, 0, Math.PI * 2);
    ctx.fill();
    // antennae
    ctx.strokeStyle = '#20191a';
    ctx.lineWidth = r * 0.08;
    [-1, 1].forEach(function (s) {
      ctx.beginPath();
      ctx.moveTo(s * r * 0.2, -r * 0.82);
      ctx.quadraticCurveTo(s * r * 0.44, -r * 1.14, s * r * 0.56, -r * 1.28 + wig * r);
      ctx.stroke();
    });
    // shell
    var g = ctx.createRadialGradient(-r * 0.3, -r * 0.22, r * 0.1, 0, r * 0.1, r);
    g.addColorStop(0, '#ff8f84');
    g.addColorStop(0.42, '#dc4040');
    g.addColorStop(1, '#7a1414');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, r * 0.06, r * 0.86, r * 0.9, 0, 0, Math.PI * 2);
    ctx.fill();
    // wing split
    ctx.strokeStyle = 'rgba(40, 8, 8, 0.75)';
    ctx.lineWidth = r * 0.09;
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.76);
    ctx.lineTo(0, r * 0.94);
    ctx.stroke();
    // spots
    ctx.fillStyle = 'rgba(32, 8, 8, 0.9)';
    [[-0.42, -0.16, 0.19], [0.42, -0.16, 0.19], [-0.3, 0.42, 0.15], [0.3, 0.42, 0.15], [0, 0.68, 0.1]]
      .forEach(function (s) {
        ctx.beginPath();
        ctx.arc(s[0] * r, s[1] * r, s[2] * r, 0, Math.PI * 2);
        ctx.fill();
      });
    // gloss
    ctx.fillStyle = 'rgba(255, 230, 224, 0.3)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.34, -r * 0.34, r * 0.24, r * 0.14, -0.5, 0, Math.PI * 2);
    ctx.fill();
  },

  _ant: function (ctx, r, time, seed) {
    var wig = Math.sin(time * 0.006 + seed) * 0.1;
    ctx.strokeStyle = '#4a2d13';
    ctx.lineWidth = r * 0.1;
    ctx.lineCap = 'round';
    [-1, 1].forEach(function (s) {
      for (var i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(s * r * 0.18, -r * 0.16 + i * r * 0.3);
        ctx.quadraticCurveTo(s * r * 0.7, -r * 0.4 + i * r * 0.4, s * r * 0.98, -r * 0.1 + i * r * 0.46 + wig * r);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(s * r * 0.15, -r * 0.62);
      ctx.quadraticCurveTo(s * r * 0.4, -r * 1.06, s * r * 0.6, -r * 1.2 + wig * r);
      ctx.stroke();
    });
    function seg(cx, cy, rx, ry) {
      var g = ctx.createRadialGradient(cx - rx * 0.35, cy - ry * 0.4, rx * 0.1, cx, cy, Math.max(rx, ry));
      g.addColorStop(0, '#c58a4c');
      g.addColorStop(0.45, '#8a5526');
      g.addColorStop(1, '#3d2410');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    seg(0, r * 0.5, r * 0.62, r * 0.5);     // gaster
    seg(0, -r * 0.06, r * 0.3, r * 0.28);   // thorax
    seg(0, -r * 0.54, r * 0.38, r * 0.34);  // head
    ctx.fillStyle = '#1a1008';
    ctx.beginPath();
    ctx.arc(-r * 0.14, -r * 0.6, r * 0.1, 0, Math.PI * 2);
    ctx.arc(r * 0.14, -r * 0.6, r * 0.1, 0, Math.PI * 2);
    ctx.fill();
  },

  _spider: function (ctx, r, time, seed) {
    var wig = Math.sin(time * 0.005 + seed) * 0.12;
    ctx.strokeStyle = '#5c4a70';
    ctx.lineWidth = r * 0.1;
    ctx.lineCap = 'round';
    [-1, 1].forEach(function (s) {
      for (var i = 0; i < 4; i++) {
        var y0 = -r * 0.4 + i * r * 0.26;
        ctx.beginPath();
        ctx.moveTo(s * r * 0.2, y0);
        ctx.quadraticCurveTo(s * r * 0.8, y0 - r * (0.5 - i * 0.12) + wig * r,
                             s * r * 1.15, y0 + r * (0.3 + i * 0.1));
        ctx.stroke();
      }
    });
    var g = ctx.createRadialGradient(-r * 0.24, r * 0.14, r * 0.1, 0, r * 0.34, r * 0.86);
    g.addColorStop(0, '#8b74a8');
    g.addColorStop(0.45, '#4b3a63');
    g.addColorStop(1, '#1c1428');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, r * 0.34, r * 0.62, r * 0.66, 0, 0, Math.PI * 2);
    ctx.fill();
    // hourglass marking
    ctx.fillStyle = 'rgba(220, 70, 70, 0.85)';
    ctx.beginPath();
    ctx.moveTo(0, r * 0.02);
    ctx.lineTo(-r * 0.16, r * 0.36);
    ctx.lineTo(0, r * 0.66);
    ctx.lineTo(r * 0.16, r * 0.36);
    ctx.closePath();
    ctx.fill();
    var hg = ctx.createRadialGradient(-r * 0.14, -r * 0.44, r * 0.06, 0, -r * 0.34, r * 0.48);
    hg.addColorStop(0, '#7b6497');
    hg.addColorStop(1, '#241a33');
    ctx.fillStyle = hg;
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.34, r * 0.42, r * 0.36, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff5a5a';
    [[-0.18, -0.46, 0.08], [0.18, -0.46, 0.08], [-0.07, -0.28, 0.055], [0.07, -0.28, 0.055]]
      .forEach(function (e) {
        ctx.beginPath();
        ctx.arc(e[0] * r, e[1] * r, e[2] * r, 0, Math.PI * 2);
        ctx.fill();
      });
  },

  particles: function (ctx, time) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < Particles.list.length; i++) {
      var p = Particles.list[i];
      var pal = PARTICLE_COLORS[p.hue] || PARTICLE_COLORS.gold;
      if (p.ring) {
        ctx.strokeStyle = 'rgba(255,255,255,' + (p.life * 0.5).toFixed(3) + ')';
        ctx.lineWidth = Math.max(1, 4 * p.life);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.stroke();
        continue;
      }
      var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3);
      g.addColorStop(0, 'rgba(255,255,255,' + (0.85 * p.life).toFixed(3) + ')');
      g.addColorStop(0.3, Art._rgba(pal[1], 0.7 * p.life));
      g.addColorStop(1, Art._rgba(pal[2], 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  },

  _rgba: function (hex, a) {
    var n = parseInt(hex.slice(1), 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a.toFixed(3) + ')';
  }
};

/* ============================================================================
   9. GAME STATE
   ========================================================================= */

var canvas = $('gameCanvas');
var ctx = canvas.getContext('2d');

var gameState = 'boot';       // boot | menu | playing | fact | paused | level_complete | summary | game_over | ui
var currentLevel = 1;
var runStartLevel = 1;

var worm = {
  x: 0, y: 0, size: 20, speed: 4, dashSpeed: 15,
  lives: 3, score: 0,
  vx: 0, vy: 0,
  dashing: false, dashTime: 0,
  safeFromCollision: false,   // post-hit mercy window
  invulnUntil: 0,
  dir: 0,
  blinkHidden: false,
  segments: WORM_BASE_SEGMENTS,
  trail: []
};

var sporophyteBalls = [];
var insects = [];
var factsCollected = [];
var collectedFactsThisLevel = 0;

var animationFrameId = null;
var lastFrameTime = 0;
var accumulator = 0;
var simTime = 0;            // ms of simulated play - drives the invuln window
var levelStartSim = 0;      // simTime at which the current stage began
var wallTime = 0;           // ms of wall clock - drives ambient animation
var screenShake = 0;

/* ============================================================================
   10. CANVAS SIZING (fixed logical resolution, DPR-crisp)
   ========================================================================= */

/**
 * Size the cabinet to fill the viewport. The field keeps its 16:10 ratio, so
 * we take the largest width that still leaves room for the HUD, the progress
 * rail and the control bar - whichever of width or height binds first.
 */
function layoutStage() {
  var app = $('app');
  if (!app) { return; }
  var hud = $('hud'), rail = $('progress-rail'), bar = $('controlbar');
  var cs = window.getComputedStyle(app);
  var row = cs.flexDirection === 'row';

  var padX = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
  var padY = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
  var gap = parseFloat(cs.rowGap) || parseFloat(cs.gap) || 0;

  var ratio = VIEW_W / VIEW_H;

  if (row) {
    var availWr = app.clientWidth - padX - hud.offsetWidth - gap;
    var availHr = app.clientHeight - padY;
    app.style.setProperty('--stage-w',
      Math.max(220, Math.floor(Math.min(availWr, availHr * ratio))) + 'px');
    return;
  }

  var availW = app.clientWidth - padX;

  // The control bar wraps to a second line when it gets narrow, which makes it
  // taller, which would shrink the stage further - a feedback loop that settles
  // on a needlessly tiny field. Measuring the chrome at full width first, then
  // stepping down at most once, keeps it monotone.
  function chromeHeight() {
    var h = 0;
    [hud, rail, bar].forEach(function (el) {
      if (el && window.getComputedStyle(el).display !== 'none') {
        h += el.offsetHeight + gap;
      }
    });
    return h;
  }
  function widthFor(chrome) {
    var availH = app.clientHeight - padY - chrome;
    return Math.max(220, Math.floor(Math.min(availW, availH * ratio)));
  }

  app.style.setProperty('--stage-w', Math.floor(availW) + 'px');
  var w = widthFor(chromeHeight());

  app.style.setProperty('--stage-w', w + 'px');
  var w2 = widthFor(chromeHeight());
  if (w2 < w) { app.style.setProperty('--stage-w', w2 + 'px'); }
}

/* coalesce bursts of resize signals into one measurement per frame */
var resizePending = false;
function scheduleResize() {
  if (resizePending) { return; }
  resizePending = true;
  window.requestAnimationFrame(function () {
    resizePending = false;
    resizeCanvas();
  });
}

function resizeCanvas() {
  layoutStage();

  var dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  var cssW = canvas.clientWidth || VIEW_W;
  var scale = cssW / VIEW_W;
  var bw = Math.max(1, Math.round(VIEW_W * scale * dpr));
  var bh = Math.max(1, Math.round(VIEW_H * scale * dpr));
  if (canvas.width !== bw || canvas.height !== bh) {
    canvas.width = bw;
    canvas.height = bh;
  }
  ctx.setTransform(bw / VIEW_W, 0, 0, bh / VIEW_H, 0, 0);
}

/* ============================================================================
   11. LEVEL SETUP
   ========================================================================= */

/**
 * Random position that avoids the worm's start point and every object
 * already placed. Unchanged rules: 100px clear around centre, 20px
 * separation between objects, 1000-attempt fail-safe.
 */
function createRandomPosition(radius, existingObjects) {
  var x, y, safe = false, attempts = 0;
  var centerDistance = 100;
  var minSeparation = 20;

  do {
    x = Math.random() * (VIEW_W - radius * 2) + radius;
    y = Math.random() * (VIEW_H - radius * 2) + radius;
    safe = true;

    if (distance(x, y, VIEW_W / 2, VIEW_H / 2) < centerDistance) { safe = false; }

    if (safe && existingObjects) {
      for (var i = 0; i < existingObjects.length; i++) {
        var obj = existingObjects[i];
        if (distance(x, y, obj.x, obj.y) < radius + obj.size + minSeparation) { safe = false; break; }
      }
    }
    attempts++;
  } while (!safe && attempts < 1000);

  return { x: x, y: y };
}

function loadLevel(levelNum) {
  currentLevel = levelNum;
  collectedFactsThisLevel = 0;
  worm.x = VIEW_W / 2;
  worm.y = VIEW_H / 2;
  worm.dashing = false;
  worm.safeFromCollision = false;
  worm.invulnUntil = 0;
  worm.dashTime = 0;
  worm.dir = -Math.PI / 2;

  // Seed the body so the worm reads as a worm before it first moves. A long
  // worm is coiled around the spawn point rather than laid out in a straight
  // line, which would run clean off the field.
  worm.trail.length = 0;
  for (var s = worm.segments - 1; s >= 0; s--) {
    var rad = s * 0.42;
    var ang = worm.dir + Math.PI + s * (SEG_SPACING / Math.max(5, rad));
    worm.trail.push({
      x: clamp(worm.x + Math.cos(ang) * rad, worm.size, VIEW_W - worm.size),
      y: clamp(worm.y + Math.sin(ang) * rad, worm.size, VIEW_H - worm.size)
    });
  }

  var existingObjects = [];
  var levelData = GAME_LEVELS[levelNum];

  // 1. sporophyte spores - drifting collectibles
  sporophyteBalls = [];
  for (var i = 0; i < levelData.goal; i++) {
    var pos = createRandomPosition(15, existingObjects);
    var speed = levelData.sporophyteSpeed;
    // keep the original magnitude range, but never a dead-still spore
    var dx = (Math.random() - 0.5) * speed;
    var dy = (Math.random() - 0.5) * speed;
    var mag = Math.sqrt(dx * dx + dy * dy);
    var minMag = speed * 0.22;
    if (mag < minMag) {
      var a = Math.random() * Math.PI * 2;
      dx = Math.cos(a) * minMag;
      dy = Math.sin(a) * minMag;
    }
    var ball = { x: pos.x, y: pos.y, size: 15, dx: dx, dy: dy, seed: Math.random() * 6.28 };
    sporophyteBalls.push(ball);
    existingObjects.push(ball);
  }

  // 2. insects - roaming obstacles; the first few actively hunt the worm
  insects = [];
  var iSpeed = levelData.insectSpeed || 1.0;
  var hunters = levelData.hunters || 0;
  for (var j = 0; j < levelData.insectCount; j++) {
    var ipos = createRandomPosition(20, existingObjects);
    var heading = Math.random() * Math.PI * 2;
    var insect = {
      x: ipos.x, y: ipos.y, size: 20,
      dx: 0, dy: 0,
      role: j < hunters ? 'chase' : 'wander',
      speed: iSpeed * (j < hunters ? 1 : 0.85),
      tdx: Math.cos(heading) * iSpeed,
      tdy: Math.sin(heading) * iSpeed,
      wanderT: 0,
      angle: heading,
      type: INSECT_TYPES[j % INSECT_TYPES.length],
      seed: Math.random() * 6.28
    };
    insects.push(insect);
    existingObjects.push(insect);
  }
  levelStartSim = simTime;

  Particles.clear();
  updateHUD();
  buildProgressPips(levelData.goal);
  updateProgressRail();
}

function startRun(fromLevel) {
  runStartLevel = fromLevel;
  worm.lives = 3;
  worm.score = 0;
  worm.segments = WORM_BASE_SEGMENTS;
  factsCollected = [];

  // stages before this one are already unlocked, so their notes are known
  for (var l = 1; l < fromLevel; l++) {
    factsCollected = factsCollected.concat(GAME_LEVELS[l].facts);
  }
  // ...and the worm starts at the length those spores would have given it
  worm.segments = Math.min(WORM_MAX_SEGMENTS,
    WORM_BASE_SEGMENTS + factsCollected.length * WORM_GROWTH);

  Particles.clear();
  loadLevel(fromLevel);
  hideAllScreens();
  setState('playing');
  Audio_.unlock();
}

/* ============================================================================
   12. SIMULATION  (fixed 60Hz step - identical numbers to the original)
   ========================================================================= */

function update() {
  simTime += STEP_MS;

  // ---- 1. worm movement -------------------------------------------------
  var currentSpeed = worm.dashing ? worm.dashSpeed : worm.speed;
  var mx = (keys.ArrowRight - keys.ArrowLeft);
  var my = (keys.ArrowDown - keys.ArrowUp);
  worm.vx = mx * currentSpeed;
  worm.vy = my * currentSpeed;
  worm.x += worm.vx;
  worm.y += worm.vy;

  if (mx || my) { worm.dir = Math.atan2(my, mx); }

  worm.x = clamp(worm.x, worm.size, VIEW_W - worm.size);
  worm.y = clamp(worm.y, worm.size, VIEW_H - worm.size);

  // Body trail (visual only). Points are laid down at a fixed spacing rather
  // than one per frame, so the body is exactly `segments * SEG_SPACING` long
  // no matter how fast the worm is going - a dash slides the worm forward
  // instead of stretching it - and it holds its shape while standing still.
  var lastT = worm.trail[worm.trail.length - 1];
  if (!lastT) {
    worm.trail.push({ x: worm.x, y: worm.y });
  } else {
    var tdx = worm.x - lastT.x, tdy = worm.y - lastT.y;
    var td = Math.sqrt(tdx * tdx + tdy * tdy);
    var guard = 0;
    while (td >= SEG_SPACING && guard++ < 80) {
      var f = SEG_SPACING / td;
      lastT = { x: lastT.x + tdx * f, y: lastT.y + tdy * f };
      worm.trail.push(lastT);
      tdx = worm.x - lastT.x;
      tdy = worm.y - lastT.y;
      td = Math.sqrt(tdx * tdx + tdy * tdy);
    }
  }
  var maxTrail = worm.segments + 8;
  while (worm.trail.length > maxTrail) { worm.trail.shift(); }

  // ---- 2. dash timer ----------------------------------------------------
  if (worm.dashing) {
    worm.dashTime++;
    if (worm.dashTime % 2 === 0) {
      Particles.spawn(worm.x - Math.cos(worm.dir) * worm.size, worm.y - Math.sin(worm.dir) * worm.size, {
        count: 2, hue: 'bio', speedMin: 0.2, speedMax: 1.2, rMin: 1, rMax: 2.6,
        decayMin: 0.05, decayMax: 0.09, grav: -0.01
      });
    }
    if (worm.dashTime > 15) {           // 15 frames, as originally tuned
      worm.dashing = false;
      worm.dashTime = 0;
    }
  }

  // ---- 3. mercy window --------------------------------------------------
  // (kept separate from dashing, so a dash can no longer cut it short)
  if (worm.safeFromCollision && simTime >= worm.invulnUntil) {
    worm.safeFromCollision = false;
  }
  worm.blinkHidden = worm.safeFromCollision && (Math.floor(simTime / 90) % 2 === 0);

  // ---- 4. spore drift ---------------------------------------------------
  for (var i = 0; i < sporophyteBalls.length; i++) {
    var ball = sporophyteBalls[i];
    ball.x += ball.dx;
    ball.y += ball.dy;
    if (ball.x < ball.size) { ball.x = ball.size; ball.dx = Math.abs(ball.dx); }
    else if (ball.x > VIEW_W - ball.size) { ball.x = VIEW_W - ball.size; ball.dx = -Math.abs(ball.dx); }
    if (ball.y < ball.size) { ball.y = ball.size; ball.dy = Math.abs(ball.dy); }
    else if (ball.y > VIEW_H - ball.size) { ball.y = VIEW_H - ball.size; ball.dy = -Math.abs(ball.dy); }
  }

  // ---- 5. insects -------------------------------------------------------
  updateInsects();

  // ---- 6. collisions ----------------------------------------------------
  checkSporophyteCollision();
  checkInsectCollision();

  Particles.step();
  if (screenShake > 0) { screenShake = Math.max(0, screenShake - 0.6); }
}

/**
 * Insect behaviour.
 *   wander - drifts, re-picking a heading every second or two
 *   chase  - steers toward the worm, but well below the worm's own speed so
 *            it can always be outrun or dashed past
 * Hunters back off during the post-hit mercy window, so a single mistake can
 * never turn into a chain of hits. Nothing here touches collision radii.
 */
function updateInsects() {
  // a short settle-in at stage start, so the worm is never jumped immediately
  if (simTime < levelStartSim + 900) { return; }

  var fleeing = worm.safeFromCollision;

  for (var i = 0; i < insects.length; i++) {
    var ins = insects[i];

    if (ins.role === 'chase') {
      // Aim where the worm is heading, not where it is. Pure tail-chasing can
      // never catch a target that keeps moving; interception forces the player
      // to actually change direction or dash.
      var lead = fleeing ? 0 : 14;
      var px = clamp(worm.x + worm.vx * lead, 0, VIEW_W);
      var py = clamp(worm.y + worm.vy * lead, 0, VIEW_H);
      var tx = px - ins.x, ty = py - ins.y;
      var d = Math.sqrt(tx * tx + ty * ty) || 1;
      var sp = fleeing ? -ins.speed * 0.9 : ins.speed;
      ins.dx += ((tx / d) * sp - ins.dx) * 0.07;    // still a gradual turn
      ins.dy += ((ty / d) * sp - ins.dy) * 0.07;
    } else {
      ins.wanderT--;
      if (ins.wanderT <= 0) {
        var a = Math.random() * Math.PI * 2;
        ins.tdx = Math.cos(a) * ins.speed;
        ins.tdy = Math.sin(a) * ins.speed;
        ins.wanderT = 60 + Math.random() * 120;
      }
      ins.dx += (ins.tdx - ins.dx) * 0.04;
      ins.dy += (ins.tdy - ins.dy) * 0.04;
    }

    // keep them from stacking into a single lethal blob
    for (var j = 0; j < insects.length; j++) {
      if (j === i) { continue; }
      var o = insects[j];
      var sx = ins.x - o.x, sy = ins.y - o.y;
      var sd = Math.sqrt(sx * sx + sy * sy);
      if (sd > 0.001 && sd < 48) {
        ins.dx += (sx / sd) * 0.09;
        ins.dy += (sy / sd) * 0.09;
      }
    }

    var m = Math.sqrt(ins.dx * ins.dx + ins.dy * ins.dy);
    var max = ins.speed * 1.25;
    if (m > max) { ins.dx = ins.dx / m * max; ins.dy = ins.dy / m * max; m = max; }

    ins.x += ins.dx;
    ins.y += ins.dy;

    if (ins.x < ins.size) { ins.x = ins.size; ins.dx = Math.abs(ins.dx); }
    else if (ins.x > VIEW_W - ins.size) { ins.x = VIEW_W - ins.size; ins.dx = -Math.abs(ins.dx); }
    if (ins.y < ins.size) { ins.y = ins.size; ins.dy = Math.abs(ins.dy); }
    else if (ins.y > VIEW_H - ins.size) { ins.y = VIEW_H - ins.size; ins.dy = -Math.abs(ins.dy); }

    if (m > 0.05) { ins.angle = Math.atan2(ins.dy, ins.dx); }
  }
}

function checkSporophyteCollision() {
  for (var i = sporophyteBalls.length - 1; i >= 0; i--) {
    var ball = sporophyteBalls[i];
    if (distance(worm.x, worm.y, ball.x, ball.y) < 30) {
      sporophyteBalls.splice(i, 1);

      Particles.spawn(ball.x, ball.y, { count: 22, hue: 'gold', speedMin: 1, speedMax: 5, grav: 0.02 });
      Particles.ring(ball.x, ball.y, 'gold');
      playSfx('collect');

      // the worm grows with every spore it swallows
      worm.segments = Math.min(WORM_MAX_SEGMENTS, worm.segments + WORM_GROWTH);
      var tailP = worm.trail[0];
      if (tailP) {
        Particles.spawn(tailP.x, tailP.y, {
          count: 7, hue: 'bio', speedMin: 0.3, speedMax: 1.8,
          rMin: 1, rMax: 2.8, grav: -0.01, decayMin: 0.03, decayMax: 0.06
        });
      }

      var factIndex = collectedFactsThisLevel;
      var fact = GAME_LEVELS[currentLevel].facts[factIndex];

      if (fact) {
        factsCollected.push(fact);
        collectedFactsThisLevel++;
        worm.score += 10;
        updateHUD(['score']);
        updateProgressRail();
        showFactPopup(fact);
      } else if (sporophyteBalls.length === 0) {
        // safety net: no fact left to show, finish the stage directly
        handleLevelComplete();
      }
      return;
    }
  }
}

function checkInsectCollision() {
  if (worm.safeFromCollision || worm.dashing) { return; }

  for (var i = 0; i < insects.length; i++) {
    var insect = insects[i];
    if (distance(worm.x, worm.y, insect.x, insect.y) < worm.size + insect.size - 10) {
      worm.lives--;
      worm.safeFromCollision = true;
      worm.invulnUntil = simTime + 1000;   // 1 second of mercy, as before

      Particles.spawn(worm.x, worm.y, { count: 26, hue: 'blood', speedMin: 1.4, speedMax: 6, grav: 0.06 });
      Particles.ring(worm.x, worm.y, 'blood');
      screenShake = 9;
      playSfx('hurt');
      updateHUD(['lives'], true);

      if (worm.lives <= 0) {
        handleGameOver();
      } else {
        showToast('Ouch! You hit ' + insectName(insect.type) + '. Lives remaining: ' + worm.lives, 'hurt');
      }
      return;
    }
  }
}

function insectName(type) {
  return type === 'ant' ? 'an ant' : (type === 'spider' ? 'a spider' : 'a ladybug');
}

/* ============================================================================
   13. RENDERING
   ========================================================================= */

function draw() {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);

  ctx.save();
  if (screenShake > 0.1) {
    ctx.translate(rand(-screenShake, screenShake), rand(-screenShake, screenShake));
  }

  Backdrop.draw(ctx, wallTime);

  for (var i = 0; i < sporophyteBalls.length; i++) {
    var b = sporophyteBalls[i];
    Art.spore(ctx, b.x, b.y, b.size, wallTime, b.seed);
  }

  for (var j = 0; j < insects.length; j++) {
    Art.insect(ctx, insects[j], wallTime);
  }

  if (gameState !== 'menu' && gameState !== 'boot') {
    Art.worm(ctx, worm, wallTime);
  }

  Art.particles(ctx, wallTime);

  ctx.restore();

  // damp inner vignette on top of the field
  var vg = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.34, VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.92);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.5)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

function gameLoop(now) {
  animationFrameId = window.requestAnimationFrame(gameLoop);

  if (!lastFrameTime) { lastFrameTime = now; }
  var delta = Math.min(now - lastFrameTime, 100);   // clamp after a tab stall
  lastFrameTime = now;
  wallTime += delta;

  if (gameState === 'playing') {
    accumulator += delta;
    var guard = 0;
    while (accumulator >= STEP_MS && guard < 6) {
      accumulator -= STEP_MS;
      guard++;
      update();
      if (gameState !== 'playing') { accumulator = 0; break; }
    }
  } else {
    accumulator = 0;
    Particles.step();
    if (screenShake > 0) { screenShake = Math.max(0, screenShake - 0.6); }
  }

  draw();
}

/* ============================================================================
   14. FLOW: fact -> level complete -> summary / game over
   ========================================================================= */

function handleLevelComplete() {
  var levelData = GAME_LEVELS[currentLevel];

  // persist progress
  var best = Save.data.stageBest[currentLevel] || 0;
  if (worm.score > best) { Save.data.stageBest[currentLevel] = worm.score; }
  Save.data.cleared[currentLevel] = true;
  Save.data.factsSeen = Math.max(Save.data.factsSeen, factsCollected.length);
  if (currentLevel + 1 <= TOTAL_LEVELS && Save.data.unlocked < currentLevel + 1) {
    Save.data.unlocked = currentLevel + 1;
  }
  Save.save();

  if (currentLevel < TOTAL_LEVELS) {
    setState('level_complete');
    playSfx('levelup');
    $('lcs-level-num').textContent = currentLevel;
    $('lcs-subtitle').textContent = levelData.title;
    $('lcs-facts').textContent = collectedFactsThisLevel;
    $('lcs-score').textContent = worm.score;
    $('lcs-lives').textContent = worm.lives;
    $('btn-next-text').textContent = 'Proceed to Stage ' + (currentLevel + 1);
    renderDiagram('diagram-lcs', 'lcs');
    showScreen('screen-levelcomplete');
  } else {
    handleGameWin();
  }
}

function goToNextLevel() {
  hideAllScreens();
  currentLevel++;
  loadLevel(currentLevel);
  setState('playing');
}

function handleGameWin() {
  setState('summary');
  playSfx('win');

  if (worm.score > Save.data.bestScore) { Save.data.bestScore = worm.score; }
  Save.data.factsSeen = Math.max(Save.data.factsSeen, factsCollected.length);
  Save.save();

  $('sum-score').textContent = worm.score;
  $('sum-facts').textContent = factsCollected.length;
  $('sum-lives').textContent = worm.lives;
  $('sum-total').textContent = TOTAL_FACTS;

  var list = $('summary-facts-list');
  list.innerHTML = '';
  factsCollected.forEach(function (fact, index) {
    var li = document.createElement('li');
    var n = document.createElement('span');
    n.className = 'n';
    n.textContent = String(index + 1);
    var t = document.createElement('span');
    t.className = 't';
    var split = fact.indexOf(':');
    if (split > 0 && split < 40) {
      var b = document.createElement('b');
      b.textContent = fact.slice(0, split + 1) + ' ';
      t.appendChild(b);
      t.appendChild(document.createTextNode(fact.slice(split + 1).trim()));
    } else {
      t.textContent = fact;
    }
    li.appendChild(n);
    li.appendChild(t);
    list.appendChild(li);
  });

  renderDiagram('diagram-sum', 'sum');
  showScreen('screen-summary');
}

function handleGameOver() {
  setState('game_over');
  playSfx('lose');
  Save.data.factsSeen = Math.max(Save.data.factsSeen, factsCollected.length);
  Save.save();
  $('go-level').textContent = currentLevel;
  $('go-score').textContent = worm.score;
  $('go-facts').textContent = collectedFactsThisLevel;
  $('btn-restart-text').textContent = 'Retry Stage ' + currentLevel;
  showScreen('screen-gameover');
}

function showFactPopup(fact) {
  setState('fact');
  var levelData = GAME_LEVELS[currentLevel];
  $('fact-eyebrow').textContent = 'Field Note ' + collectedFactsThisLevel + ' of ' + levelData.goal;
  $('fact-heading').textContent = 'Fact Collected';
  $('fact-card-text').textContent = fact;
  showScreen('screen-fact');
}

/* The last spore of a stage used to be swallowed: the level-complete screen
   replaced the fact card before it could be read. Now the card is always
   read first, and the stage resolves when it is dismissed. */
function dismissFactPopup() {
  hideAllScreens();
  if (sporophyteBalls.length === 0) {
    handleLevelComplete();
  } else {
    setState('playing');
    grantReentryGrace();
  }
}

/**
 * Coming back from a fact card or a pause, a hunter may be sitting right on
 * top of the worm. A short immunity covers the re-entry, and because hunters
 * already back off while the worm is protected, they scatter at the same time.
 */
function grantReentryGrace() {
  worm.safeFromCollision = true;
  worm.invulnUntil = simTime + 700;
}

/* ============================================================================
   15. HUD + SCREENS
   ========================================================================= */

var hudElements = {
  level: $('level-display'),
  lives: $('lives-display'),
  score: $('score-display')
};
var hudChips = { level: $('chip-level'), lives: $('chip-lives'), score: $('chip-score') };

function updateHUD(bumpKeys, hurt) {
  hudElements.level.textContent = currentLevel;
  hudElements.lives.textContent = worm.lives;
  hudElements.score.textContent = worm.score;

  if (bumpKeys) {
    bumpKeys.forEach(function (k) {
      var el = hudChips[k];
      if (!el) { return; }
      el.classList.remove('bump', 'hurt');
      void el.offsetWidth;                       // restart the animation
      el.classList.add(hurt ? 'hurt' : 'bump');
      window.setTimeout(function () { el.classList.remove('bump', 'hurt'); }, 600);
    });
  }
}

function buildProgressPips(goal) {
  var host = $('progress-pips');
  host.innerHTML = '';
  for (var i = 0; i < goal; i++) { host.appendChild(document.createElement('i')); }
}

function updateProgressRail() {
  var goal = GAME_LEVELS[currentLevel].goal;
  var pct = goal ? (collectedFactsThisLevel / goal) * 100 : 0;
  $('progress-fill').style.width = clamp(pct, 0, 100) + '%';
}

var SCREENS = ['screen-boot', 'screen-menu', 'screen-howto', 'screen-stages', 'screen-settings',
               'screen-pause', 'screen-fact', 'screen-levelcomplete', 'screen-summary',
               'screen-gameover', 'screen-learn'];

function hideAllScreens() {
  SCREENS.forEach(function (id) {
    var el = $(id);
    if (el) { el.hidden = true; }
  });
}

function showScreen(id) {
  hideAllScreens();
  var el = $(id);
  if (el) {
    el.hidden = false;
    if (el.querySelector('.scrollable')) { el.querySelector('.scrollable').scrollTop = 0; }
  }
}

function setState(s) {
  gameState = s;
  var pauseBtn = $('btn-pause');
  var playable = (s === 'playing' || s === 'paused' || s === 'fact');
  pauseBtn.disabled = !playable;
  pauseBtn.style.opacity = playable ? '' : '0.4';
  document.body.classList.toggle('in-game', s === 'playing');
  if (s !== 'playing') { releaseAllKeys(); }
}

var toastTimer = null;
function showToast(text, kind) {
  var t = $('toast');
  $('toast-text').textContent = text;
  $('toast-icon').src = kind === 'good'
    ? 'assets/images/ui/emoji/complete.png'
    : 'assets/images/ui/emoji/hurt.png';
  t.classList.toggle('good', kind === 'good');
  t.classList.add('show');
  if (toastTimer) { window.clearTimeout(toastTimer); }
  toastTimer = window.setTimeout(function () { t.classList.remove('show'); }, 2200);
}

/* ============================================================================
   16. SVG SPOROPHYTE DIAGRAM (the stage reward)
   ========================================================================= */

function renderDiagram(hostId, uid) {
  var host = $(hostId);
  if (!host || host.dataset.built === '1') { return; }
  host.dataset.built = '1';
  host.innerHTML =
  '<svg viewBox="0 0 300 312" role="img" aria-label="Sporophyte structure: capsule, seta and foot">' +
    '<defs>' +
      '<radialGradient id="cap' + uid + '" cx="38%" cy="32%" r="72%">' +
        '<stop offset="0%" stop-color="#fff6db"/>' +
        '<stop offset="34%" stop-color="#ffcf72"/>' +
        '<stop offset="74%" stop-color="#c8801f"/>' +
        '<stop offset="100%" stop-color="#6d3f0d"/>' +
      '</radialGradient>' +
      '<radialGradient id="halo' + uid + '" cx="50%" cy="50%" r="50%">' +
        '<stop offset="0%" stop-color="#ffc75a" stop-opacity=".55"/>' +
        '<stop offset="60%" stop-color="#ffc75a" stop-opacity=".14"/>' +
        '<stop offset="100%" stop-color="#ffc75a" stop-opacity="0"/>' +
      '</radialGradient>' +
      '<linearGradient id="seta' + uid + '" x1="0" y1="0" x2="1" y2="0">' +
        '<stop offset="0%" stop-color="#2f6a1c"/>' +
        '<stop offset="38%" stop-color="#a9d18e"/>' +
        '<stop offset="70%" stop-color="#6aa347"/>' +
        '<stop offset="100%" stop-color="#28541a"/>' +
      '</linearGradient>' +
      '<linearGradient id="foot' + uid + '" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0%" stop-color="#8fc46e"/>' +
        '<stop offset="55%" stop-color="#48892c"/>' +
        '<stop offset="100%" stop-color="#20460f"/>' +
      '</linearGradient>' +
      '<linearGradient id="thal' + uid + '" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0%" stop-color="#7fb85e"/>' +
        '<stop offset="100%" stop-color="#2c5a1a"/>' +
      '</linearGradient>' +
    '</defs>' +

    // capsule glow + body
    '<circle cx="150" cy="62" r="60" fill="url(#halo' + uid + ')"/>' +
    '<circle cx="150" cy="62" r="34" fill="url(#cap' + uid + ')" stroke="#5c3409" stroke-width="1.5"/>' +
    '<path d="M122 76a34 34 0 0 0 56 0" fill="none" stroke="#ffe296" stroke-opacity=".55" stroke-width="3" stroke-linecap="round"/>' +
    '<ellipse cx="138" cy="48" rx="9" ry="6" fill="#fffbee" opacity=".8" transform="rotate(-28 138 48)"/>' +
    // spores inside
    '<g fill="#7a4a10" opacity=".38">' +
      '<circle cx="142" cy="70" r="3.4"/><circle cx="160" cy="60" r="3"/>' +
      '<circle cx="154" cy="76" r="2.6"/><circle cx="137" cy="60" r="2.4"/>' +
    '</g>' +

    // seta
    '<rect x="142" y="96" width="16" height="96" rx="8" fill="url(#seta' + uid + ')" stroke="#1d3d11" stroke-width="1.2"/>' +
    '<rect x="146" y="100" width="3.5" height="88" rx="1.8" fill="#dcffc4" opacity=".38"/>' +

    // foot
    '<path d="M150 190c-26 0-40 12-40 26s18 20 40 20 40-6 40-20-14-26-40-26z" fill="url(#foot' + uid + ')" stroke="#1d3d11" stroke-width="1.2"/>' +
    '<path d="M122 206c14-6 42-6 56 0" fill="none" stroke="#d6ffbb" stroke-opacity=".3" stroke-width="2.5" stroke-linecap="round"/>' +

    // gametophyte thallus it feeds on
    '<path d="M48 250c22-16 60-22 102-22s80 6 102 22c-18 16-58 24-102 24s-84-8-102-24z" fill="url(#thal' + uid + ')" stroke="#1b3a0f" stroke-width="1.4"/>' +
    '<path d="M150 232v40M150 244c-16 2-30 6-42 12M150 244c16 2 30 6 42 12" fill="none" stroke="#1f4a12" stroke-opacity=".55" stroke-width="2"/>' +

    // labels - leaders end on a dot clear of the text
    '<g font-family="Segoe UI, Arial, sans-serif">' +
      '<line x1="182" y1="54" x2="212" y2="42" stroke="#6b5a2c" stroke-width="1.2" stroke-dasharray="3 3"/>' +
      '<circle cx="212" cy="42" r="2.6" fill="#6b5a2c"/>' +
      '<text x="204" y="24" font-size="14" font-weight="700" fill="#4a3d1f">CAPSULE</text>' +
      '<text x="204" y="37" font-size="9.5" fill="#6b5a2c">Meiosis &amp; spores</text>' +

      '<line x1="140" y1="140" x2="106" y2="140" stroke="#6b5a2c" stroke-width="1.2" stroke-dasharray="3 3"/>' +
      '<circle cx="106" cy="140" r="2.6" fill="#6b5a2c"/>' +
      '<text x="96" y="136" font-size="14" font-weight="700" fill="#4a3d1f" text-anchor="end">SETA</text>' +
      '<text x="96" y="149" font-size="9.5" fill="#6b5a2c" text-anchor="end">Raises the capsule</text>' +

      '<line x1="178" y1="208" x2="210" y2="208" stroke="#6b5a2c" stroke-width="1.2" stroke-dasharray="3 3"/>' +
      '<circle cx="210" cy="208" r="2.6" fill="#6b5a2c"/>' +
      '<text x="216" y="204" font-size="14" font-weight="700" fill="#4a3d1f">FOOT</text>' +
      '<text x="216" y="217" font-size="9.5" fill="#6b5a2c">Absorbs food</text>' +

      '<text x="150" y="300" font-size="11" font-weight="700" fill="#4a3d1f" text-anchor="middle">GAMETOPHYTE (thallus)</text>' +
    '</g>' +
  '</svg>';
}

/* ============================================================================
   17. INPUT - unified Pointer Events + keyboard
   ========================================================================= */

var keys = { ArrowUp: 0, ArrowDown: 0, ArrowLeft: 0, ArrowRight: 0 };

var KEY_ALIASES = {
  ArrowUp: 'ArrowUp', KeyW: 'ArrowUp',
  ArrowDown: 'ArrowDown', KeyS: 'ArrowDown',
  ArrowLeft: 'ArrowLeft', KeyA: 'ArrowLeft',
  ArrowRight: 'ArrowRight', KeyD: 'ArrowRight'
};

function releaseAllKeys() {
  keys.ArrowUp = keys.ArrowDown = keys.ArrowLeft = keys.ArrowRight = 0;
}

function tryDash() {
  if (gameState !== 'playing' || worm.dashing) { return; }
  worm.dashing = true;
  worm.dashTime = 0;
  playSfx('dash');
  Particles.spawn(worm.x, worm.y, {
    count: 12, hue: 'bio', angle: worm.dir + Math.PI,
    speedMin: 1, speedMax: 3.4, grav: 0, decayMin: 0.04, decayMax: 0.07
  });
}

function handleKeyDown(e) {
  var mapped = KEY_ALIASES[e.code];
  if (mapped) {
    keys[mapped] = 1;
    if (gameState === 'playing') { e.preventDefault(); }
    return;
  }
  if (e.code === 'Space') {
    if (gameState === 'playing') {
      e.preventDefault();
      tryDash();
    }
    return;
  }
  if (e.code === 'KeyP' || e.code === 'Escape') {
    e.preventDefault();
    if (gameState === 'playing') { pauseGame(); }
    else if (gameState === 'paused') { resumeGame(); }
  }
}

function handleKeyUp(e) {
  var mapped = KEY_ALIASES[e.code];
  if (mapped) { keys[mapped] = 0; }
}

/* --- pointer steering: press and drag anywhere on the field ------------- */
var SWIPE_THRESHOLD = 30;      // same feel as the original swipe detection
var activePointer = null;
var pointerStart = { x: 0, y: 0, t: 0 };
var stickEl = $('stick');
var stickKnob = $('stick-knob');

function localPoint(e) {
  var rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) / (rect.width || 1) * VIEW_W,
    y: (e.clientY - rect.top) / (rect.height || 1) * VIEW_H,
    cx: e.clientX - rect.left,
    cy: e.clientY - rect.top
  };
}

function onPointerDown(e) {
  Audio_.unlock();
  if (gameState !== 'playing' || activePointer !== null) { return; }
  activePointer = e.pointerId;
  var p = localPoint(e);
  pointerStart = { x: e.clientX, y: e.clientY, t: performance.now() };
  if (canvas.setPointerCapture) {
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* not capturable */ }
  }
  if (Save.data.settings.touch) {
    stickEl.style.left = p.cx + 'px';
    stickEl.style.top = p.cy + 'px';
    stickKnob.style.transform = 'translate(0px, 0px)';
    stickEl.classList.add('on');
  }
  e.preventDefault();
}

function onPointerMove(e) {
  if (activePointer !== e.pointerId || gameState !== 'playing') { return; }
  var dx = e.clientX - pointerStart.x;
  var dy = e.clientY - pointerStart.y;

  keys.ArrowUp    = dy < -SWIPE_THRESHOLD ? 1 : 0;
  keys.ArrowDown  = dy >  SWIPE_THRESHOLD ? 1 : 0;
  keys.ArrowLeft  = dx < -SWIPE_THRESHOLD ? 1 : 0;
  keys.ArrowRight = dx >  SWIPE_THRESHOLD ? 1 : 0;

  if (Save.data.settings.touch) {
    var mag = Math.sqrt(dx * dx + dy * dy);
    var lim = 34;
    var k = mag > lim ? lim / mag : 1;
    stickKnob.style.transform = 'translate(' + (dx * k).toFixed(1) + 'px,' + (dy * k).toFixed(1) + 'px)';
  }
  e.preventDefault();
}

function onPointerUp(e) {
  if (activePointer !== e.pointerId) { return; }
  activePointer = null;
  stickEl.classList.remove('on');
  stickKnob.style.transform = 'translate(0px, 0px)';

  if (gameState === 'playing') {
    var dx = e.clientX - pointerStart.x;
    var dy = e.clientY - pointerStart.y;
    // negligible movement = a tap = dash (as in the original)
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) { tryDash(); }
  }
  releaseAllKeys();
}

/* ============================================================================
   18. PAUSE / RESUME
   ========================================================================= */

function pauseGame() {
  if (gameState !== 'playing') { return; }
  setState('paused');
  releaseAllKeys();
  showScreen('screen-pause');
  playSfx('click');
}

function resumeGame() {
  if (gameState !== 'paused') { return; }
  hideAllScreens();
  setState('playing');
  grantReentryGrace();
  playSfx('click');
}

function quitToMenu() {
  setState('menu');
  releaseAllKeys();
  Particles.clear();
  sporophyteBalls = [];
  insects = [];

  // leave the HUD showing a fresh run rather than the last one's leftovers
  worm.lives = 3;
  worm.score = 0;
  collectedFactsThisLevel = 0;
  currentLevel = Save.data.unlocked;
  updateHUD();
  buildProgressPips(GAME_LEVELS[currentLevel].goal);
  updateProgressRail();

  refreshMenu();
  showScreen('screen-menu');
}

/* ============================================================================
   19. MENU / STAGE SELECT / SETTINGS / LEARN MORE
   ========================================================================= */

var learnReturnScreen = 'screen-summary';

function refreshMenu() {
  var d = Save.data;
  var cleared = Object.keys(d.cleared).length;
  var startText = $('btn-start-text');
  if (d.unlocked > 1 && cleared < TOTAL_LEVELS) {
    startText.textContent = 'Continue \u2013 Stage ' + d.unlocked;
  } else {
    startText.textContent = 'Start Game';
  }

  var foot = $('menu-progress');
  if (!d.bestScore && !cleared) {
    foot.textContent = 'No spores recorded yet.';
  } else {
    foot.innerHTML = 'Stages cleared <b>' + cleared + '/' + TOTAL_LEVELS +
                     '</b> \u00b7 Best score <b>' + d.bestScore +
                     '</b> \u00b7 Notes found <b>' + d.factsSeen + '/' + TOTAL_FACTS + '</b>';
  }
}

function buildStageList() {
  var host = $('stage-list');
  host.innerHTML = '';

  for (var i = 1; i <= TOTAL_LEVELS; i++) {
    (function (n) {
      var lvl = GAME_LEVELS[n];
      var unlocked = n <= Save.data.unlocked;
      var cleared = !!Save.data.cleared[n];
      var best = Save.data.stageBest[n] || 0;

      var card = document.createElement('button');
      card.type = 'button';
      card.className = 'stage-card' + (unlocked ? '' : ' locked');
      if (!unlocked) { card.setAttribute('aria-disabled', 'true'); }

      card.innerHTML =
        '<span class="stage-badge">' +
          '<img src="assets/images/ui/emoji/' + (unlocked ? 'level.png' : 'lock.png') + '" alt="">' +
          '<span class="stage-badge-num">' + n + '</span>' +
        '</span>' +
        '<span class="stage-info">' +
          '<span class="stage-name">' + lvl.title + '</span>' +
          '<span class="stage-meta">' +
            '<span><img src="assets/images/ui/emoji/spore.png" alt="">' + lvl.goal + ' spores</span>' +
            '<span><img src="assets/images/ui/emoji/ladybug.png" alt="">' + lvl.insectCount + ' insects</span>' +
            (lvl.hunters ? '<span><img src="assets/images/ui/emoji/hurt.png" alt="">' + lvl.hunters + ' hunting</span>' : '') +
            (best ? '<span><img src="assets/images/ui/emoji/score.png" alt="">' + best + ' best</span>' : '') +
          '</span>' +
        '</span>' +
        '<span class="stage-state">' +
          (cleared ? '<img src="assets/images/ui/emoji/complete.png" alt="Cleared">'
                   : (unlocked ? '<img src="assets/images/ui/emoji/play.png" alt="Play">'
                               : '<img src="assets/images/ui/emoji/lock.png" alt="Locked">')) +
        '</span>';

      card.addEventListener('click', function () {
        if (!unlocked) {
          playSfx('hurt');
          showToast('Clear Stage ' + (n - 1) + ' to unlock this one.', 'hurt');
          return;
        }
        playSfx('click');
        startRun(n);
      });

      host.appendChild(card);
    })(i);
  }
}

function buildLearnMore() {
  var gl = $('glossary');
  if (gl.dataset.built === '1') { return; }
  gl.dataset.built = '1';
  GLOSSARY.forEach(function (row) {
    var dt = document.createElement('dt');
    dt.textContent = row[0];
    var dd = document.createElement('dd');
    dd.textContent = row[1];
    gl.appendChild(dt);
    gl.appendChild(dd);
  });

  var cy = $('cycle');
  CYCLE_STEPS.forEach(function (row) {
    var d = document.createElement('div');
    d.className = 'cycle-step';
    var b = document.createElement('b');
    b.textContent = row[0];
    var s = document.createElement('span');
    s.textContent = row[1];
    d.appendChild(b);
    d.appendChild(s);
    cy.appendChild(d);
  });
}

function openLearnMore(from) {
  learnReturnScreen = from;
  buildLearnMore();
  showScreen('screen-learn');
  playSfx('click');
}

/* --------------------------------- settings ----------------------------- */
function applySettings() {
  var s = Save.data.settings;

  Audio_.musicOn = s.music;
  Audio_.sfxOn = s.sfx;
  Audio_.applyMusicState();

  setSwitch('sw-music', s.music);
  setSwitch('sw-sfx', s.sfx);
  setSwitch('sw-touch', s.touch);

  $('ico-music').src = 'assets/images/ui/emoji/' + (s.music ? 'music-on.png' : 'music-off.png');
  $('ico-sfx').src   = 'assets/images/ui/emoji/' + (s.sfx ? 'sound-on.png' : 'sound-off.png');

  document.body.classList.toggle('touch-ui', s.touch);
  if (!s.touch) { $('stick').classList.remove('on'); }
}

function setSwitch(id, on) {
  var el = $(id);
  if (el) { el.setAttribute('aria-checked', on ? 'true' : 'false'); }
}

/* ============================================================================
   20. WIRING
   ========================================================================= */

function on(id, handler, sound) {
  var el = $(id);
  if (!el) { return; }
  el.addEventListener('click', function (e) {
    Audio_.unlock();
    if (sound !== false) { playSfx('click'); }
    handler(e);
  });
}

function wireUI() {
  // --- menu
  on('btn-start', function () { startRun(Save.data.unlocked); });
  on('btn-stages', function () { buildStageList(); showScreen('screen-stages'); setState('ui'); });
  on('btn-howto', function () { showScreen('screen-howto'); setState('ui'); });
  on('btn-settings', function () { settingsReturn = 'screen-menu'; showScreen('screen-settings'); setState('ui'); });
  on('btn-settings-hud', function () {
    if (gameState === 'playing') { pauseGame(); }
    settingsReturn = (gameState === 'paused') ? 'screen-pause' : 'screen-menu';
    showScreen('screen-settings');
  });

  // --- back buttons
  Array.prototype.forEach.call(document.querySelectorAll('[data-back]'), function (btn) {
    btn.addEventListener('click', function () {
      Audio_.unlock();
      playSfx('click');
      var target = btn.getAttribute('data-back');
      if (btn.closest('#screen-settings')) { target = settingsReturn; }
      if (target === 'screen-menu') { refreshMenu(); setState('menu'); }
      else if (target === 'screen-pause') { setState('paused'); }
      showScreen(target);
    });
  });

  // --- pause
  on('btn-pause', function () {
    if (gameState === 'playing') { pauseGame(); }
    else if (gameState === 'paused') { resumeGame(); }
  }, false);
  on('btn-resume', resumeGame, false);
  on('btn-pause-settings', function () { settingsReturn = 'screen-pause'; showScreen('screen-settings'); });
  on('btn-quit', quitToMenu);

  // --- fact card
  on('btn-continue', dismissFactPopup, false);

  // --- level complete
  on('btn-next-level', goToNextLevel, false);

  // --- summary / game over
  on('btn-retry', function () { startRun(1); });
  on('btn-restart', function () { startRun(currentLevel); });
  on('btn-summary-menu', quitToMenu);
  on('btn-go-menu', quitToMenu);
  on('btn-learn-sum', function () { openLearnMore('screen-summary'); }, false);
  on('btn-learn-go', function () { openLearnMore('screen-gameover'); }, false);
  on('btn-learn-back', function () {
    showScreen(learnReturnScreen);
    setState(learnReturnScreen === 'screen-summary' ? 'summary' : 'game_over');
  }, false);

  // --- settings switches
  function toggle(id, key, after) {
    var el = $(id);
    if (!el) { return; }
    el.addEventListener('click', function () {
      Audio_.unlock();
      Save.data.settings[key] = !Save.data.settings[key];
      Save.save();
      applySettings();
      playSfx('click');
      if (after) { after(); }
    });
  }
  toggle('sw-music', 'music');
  toggle('sw-sfx', 'sfx');
  toggle('sw-touch', 'touch');

  on('btn-wipe', function () {
    Save.wipe();
    applySettings();
    refreshMenu();
    buildStageList();
    showToast('Saved progress cleared.', 'good');
  });

  // --- dash button (pointer, so mouse and touch behave the same)
  var dashBtn = $('btn-dash');
  dashBtn.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    Audio_.unlock();
    dashBtn.classList.add('pressed');
    tryDash();
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) {
    dashBtn.addEventListener(ev, function () { dashBtn.classList.remove('pressed'); });
  });

  // --- press feedback on every button
  Array.prototype.forEach.call(document.querySelectorAll('.btn, .icon-button, .stage-card'), function (b) {
    b.addEventListener('pointerdown', function () { b.classList.add('pressed'); });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) {
      b.addEventListener(ev, function () { b.classList.remove('pressed'); });
    });
  });
}

var settingsReturn = 'screen-menu';

function wireInput() {
  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('keyup', handleKeyUp);

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);

  // never let the page itself scroll, zoom or show a context menu
  document.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
  document.addEventListener('dblclick', function (e) { e.preventDefault(); });
  document.addEventListener('touchmove', function (e) {
    var scrollable = e.target && e.target.closest ? e.target.closest('.scrollable, .summary-list') : null;
    if (!scrollable) { e.preventDefault(); }
  }, { passive: false });

  window.addEventListener('blur', releaseAllKeys);

  window.addEventListener('resize', resizeCanvas);
  window.addEventListener('orientationchange', function () {
    window.setTimeout(resizeCanvas, 220);
  });
  // WebViews do not always fire a resize event on rotation or when the
  // on-screen keyboard opens, so watch the box itself as well
  if (window.ResizeObserver) {
    // observe the viewport box only - observing #app would re-trigger on our
    // own --stage-w writes and loop
    var ro = new window.ResizeObserver(scheduleResize);
    ro.observe(document.documentElement);
  }
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', scheduleResize);
  }
  // the retro face changes the HUD's height once it swaps in
  if (document.fonts && document.fonts.ready && document.fonts.ready.then) {
    document.fonts.ready.then(resizeCanvas).catch(function () {});
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      if (gameState === 'playing') { pauseGame(); }
      Audio_.suspend();
    } else {
      Audio_.resume();
      lastFrameTime = 0;
    }
  });
}

/* --- decorative page motes (CSS-animated, outside the play field) -------- */
function buildAmbientMotes() {
  var host = $('amb-motes');
  if (!host) { return; }
  var n = window.innerWidth < 620 ? 14 : 26;
  var frag = document.createDocumentFragment();
  for (var i = 0; i < n; i++) {
    var d = document.createElement('span');
    var size = rand(3, 9);
    d.className = 'mote' + (Math.random() < 0.34 ? ' mote-gold' : '');
    d.style.width = size.toFixed(1) + 'px';
    d.style.height = size.toFixed(1) + 'px';
    d.style.left = rand(0, 100).toFixed(2) + '%';
    d.style.bottom = rand(-12, 4).toFixed(2) + '%';
    d.style.setProperty('--mx', rand(-90, 90).toFixed(0) + 'px');
    d.style.animationDuration = rand(16, 40).toFixed(1) + 's';
    d.style.animationDelay = (-rand(0, 30)).toFixed(1) + 's';
    frag.appendChild(d);
  }
  host.appendChild(frag);
}

/* ============================================================================
   21. BOOT
   ========================================================================= */

function boot() {
  Save.load();
  applySettings();

  buildAmbientMotes();
  Backdrop.build();
  resizeCanvas();
  wireUI();
  wireInput();

  setState('boot');
  hideAllScreens();
  $('screen-boot').hidden = false;

  var fill = $('boot-fill');
  var note = $('boot-note');
  var notes = ['Waking the forest floor\u2026', 'Soaking the thallus\u2026', 'Counting the gemma cups\u2026', 'Ready'];
  var pct = 0;

  // start the render loop straight away so the backdrop is alive behind boot
  animationFrameId = window.requestAnimationFrame(gameLoop);

  Assets.load(
    function (p) { pct = Math.max(pct, p * 70); fill.style.width = pct.toFixed(0) + '%'; },
    function () { /* assets settled - optional files may simply be absent */ }
  );

  var t0 = performance.now();
  var stepId = window.setInterval(function () {
    var elapsed = performance.now() - t0;
    pct = Math.min(100, Math.max(pct, (elapsed / 1500) * 100));
    fill.style.width = pct.toFixed(0) + '%';
    note.textContent = notes[Math.min(notes.length - 1, Math.floor(pct / 26))];

    if (pct >= 100) {
      window.clearInterval(stepId);
      window.setTimeout(function () {
        refreshMenu();
        buildStageList();
        setState('menu');
        showScreen('screen-menu');
      }, 260);
    }
  }, 60);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

})();
