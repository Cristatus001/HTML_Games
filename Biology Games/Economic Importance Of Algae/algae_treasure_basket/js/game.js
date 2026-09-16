/* ============================================================================
   game.js — boot flow, screens, saved progress and the dive itself

   Gameplay rules are unchanged from the original build:
     · food morsels drift up from below with a horizontal wobble and recycle
       at the bottom when they leave the top of the screen
     · a correct morsel scores +10 and shows a field note while the dive is
       held still; Finn eats it and grows
     · a wrong morsel scores -5; Finn spits it out and shrinks
     · the dive ends when every correct morsel has been eaten
   ========================================================================== */
'use strict';

/* ------------------------------------------------------------------ save -- */

const Save = {
  KEY: 'algae_treasure_basket.save.v1',
  data: null,

  defaults() {
    return { v: 1, unlocked: 1, best: {}, stars: {}, sfx: true, music: true, motion: true };
  },

  load() {
    let parsed = null;
    try {
      const raw = window.localStorage.getItem(this.KEY);
      if (raw) parsed = JSON.parse(raw);
    } catch (e) {
      parsed = null;                       // private mode / corrupt entry
    }
    const d = this.defaults();
    if (parsed && typeof parsed === 'object') {
      if (typeof parsed.unlocked === 'number') d.unlocked = Math.min(LEVELS.length, Math.max(1, parsed.unlocked));
      if (parsed.best && typeof parsed.best === 'object') d.best = parsed.best;
      if (parsed.stars && typeof parsed.stars === 'object') d.stars = parsed.stars;
      if (typeof parsed.sfx === 'boolean') d.sfx = parsed.sfx;
      if (typeof parsed.music === 'boolean') d.music = parsed.music;
      if (typeof parsed.motion === 'boolean') d.motion = parsed.motion;
    }
    this.data = d;
    return d;
  },

  flush() {
    try { window.localStorage.setItem(this.KEY, JSON.stringify(this.data)); }
    catch (e) { /* storage unavailable — progress simply will not persist */ }
  },

  recordDive(levelId, score, stars) {
    const prevBest = this.data.best[levelId] || 0;
    const improved = score > prevBest;
    if (improved) this.data.best[levelId] = score;
    if (stars > (this.data.stars[levelId] || 0)) this.data.stars[levelId] = stars;
    const unlockedNew = levelId >= this.data.unlocked && levelId < LEVELS.length;
    if (unlockedNew) this.data.unlocked = levelId + 1;
    this.flush();
    return { improved: improved, unlockedNew: unlockedNew };
  },

  totalStars() {
    return Object.keys(this.data.stars).reduce((s, k) => s + (this.data.stars[k] || 0), 0);
  },

  reset() {
    this.data = this.defaults();
    this.flush();
  }
};

/* --------------------------------------------------------------- screens -- */

const Screens = {
  ids: ['screen-boot', 'screen-menu', 'screen-levels', 'screen-result',
        'screen-pause', 'screen-howto', 'screen-learn', 'screen-settings'],
  stack: [],

  el(id) { return document.getElementById(id); },

  /** Show one screen exclusively. Pass null to close everything. */
  show(id) {
    this.ids.forEach(s => {
      const node = this.el(s);
      if (node) node.classList.toggle('hidden', s !== id);
    });
    this.current = id || null;
  },

  /** Layer a modal over whatever is showing, remembering what to go back to. */
  open(id) {
    this.stack.push(this.current);
    this.ids.forEach(s => {
      const node = this.el(s);
      if (node) node.classList.toggle('hidden', s !== id);
    });
    this.current = id;
  },

  close() {
    const back = this.stack.pop();
    this.show(back || null);
  },

  hideAll() { this.show(null); }
};

/* ------------------------------------------------------- the reef guide -- */

/**
 * Finn — the companion fish the player steers, and feeds.
 *
 * He chases the pointer on a spring, so he always trails slightly behind and
 * reads as a creature rather than a crosshair: he banks into turns, flips to
 * face his heading, wags harder the faster he swims, trails bubbles, and darts
 * forward when the player picks a morsel. Eating a real algae use makes him
 * grow; swallowing manufactured junk makes him shrink. Steering him is
 * decoration only — every tap still lands directly on the morsel itself.
 */
const GuideFish = {
  el: null,
  x: 0, y: 0,          // current position (element centre)
  tx: 0, ty: 0,        // where the pointer is
  angle: 0,
  facing: 1,
  wagBucket: -1,
  puffAt: 0,
  active: false,

  /* growth */
  scale: 1,
  scaleTarget: 1,
  GROW_STEP: 1.2,      // set per dive by setGrowthFor()
  SHRINK_STEP: 0.88,   // per mouthful of junk
  MIN_SCALE: 0.55,
  MAX_SCALE: 2.05,

  init(el) {
    this.el = el;
    this.x = this.tx = window.innerWidth * 0.5;
    this.y = this.ty = window.innerHeight * 0.62;
    this.render(0);
  },

  target(x, y) { this.tx = x; this.ty = y; },

  show(on) {
    this.active = !!on;
    if (!this.el) return;
    this.el.classList.toggle('show', this.active);
  },

  /** Back to starting size at the top of every dive. */
  resetSize() {
    this.scale = this.scaleTarget = 1;
    this.render(0);
  },

  /**
   * Size the per-morsel growth to the dive, so a flawless run always finishes
   * at full size whether it had four morsels or twelve. Short dives therefore
   * grow him in chunky, obvious steps; the long one grows him gradually.
   */
  setGrowthFor(totalCorrect) {
    const n = Math.max(1, totalCorrect);
    this.GROW_STEP = Math.pow(this.MAX_SCALE, 1 / n);
  },

  /** Multiply the target size, clamped. Returns the new target. */
  grow(factor) {
    this.scaleTarget = Math.max(this.MIN_SCALE,
      Math.min(this.MAX_SCALE, this.scaleTarget * factor));
    return this.scaleTarget;
  },

  /** Where his mouth is right now, in screen coordinates. */
  mouth() {
    if (!this.el) return { x: this.x, y: this.y };
    const w = (this.el.offsetWidth || 100) * this.scale;
    return { x: this.x + this.facing * w * 0.40, y: this.y };
  },

  /** Quick lunge — called when the player picks a morsel. */
  dart() { this.flash('dart', 190); },

  /** Swallowed something good. */
  gulp() { this.flash('gulp', 520); },

  /** Swallowed something indigestible. */
  yuck() { this.flash('yuck', 580); },

  flash(cls, ms) {
    if (!this.el) return;
    this.el.classList.remove(cls);
    void this.el.offsetWidth;               // restart the animation
    this.el.classList.add(cls);
    clearTimeout(this['_t_' + cls]);
    this['_t_' + cls] = setTimeout(() => this.el.classList.remove(cls), ms);
  },

  update(dtSec, tSec) {
    if (!this.el || !this.active) return;

    // Critically-damped-ish chase, frame-rate independent.
    const k = 1 - Math.exp(-8.5 * dtSec);
    const dx = (this.tx - this.x) * k;
    const dy = (this.ty - this.y) * k;
    this.x += dx;
    this.y += dy;

    const speed = Math.hypot(dx, dy) / Math.max(dtSec, 0.0001);

    // Heading: bank towards the direction of travel, level off when idling.
    let wanted = 0;
    if (speed > 14) {
      const phi = Math.atan2(dy, dx) * 180 / Math.PI;
      if (dx < 0) {
        this.facing = -1;
        wanted = phi > 0 ? phi - 180 : phi + 180;
      } else {
        this.facing = 1;
        wanted = phi;
      }
      wanted = Math.max(-32, Math.min(32, wanted));
    }
    this.angle += (wanted - this.angle) * (1 - Math.exp(-7 * dtSec));

    // Tail beat scales with effort — bucketed so the animation is not restarted
    // on every frame.
    const bucket = speed > 620 ? 3 : speed > 300 ? 2 : speed > 90 ? 1 : 0;
    if (bucket !== this.wagBucket) {
      this.wagBucket = bucket;
      this.el.style.setProperty('--wag', [0.52, 0.34, 0.22, 0.15][bucket] + 's');
    }

    // Ease towards the size his last few meals earned him.
    this.scale += (this.scaleTarget - this.scale) * (1 - Math.exp(-9 * dtSec));

    // Bubbles off the tail while swimming hard.
    if (speed > 210 && tSec - this.puffAt > 0.13) {
      this.puffAt = tSec;
      const tail = this.x - this.facing * this.el.offsetWidth * this.scale * 0.5;
      FX.finBubble(tail, this.y + 4);
    }

    this.render(tSec);
  },

  render(tSec) {
    const w = this.el.offsetWidth || 70;
    const h = this.el.offsetHeight || 45;
    const bob = Math.sin(tSec * 1.7) * 2.6;
    // scale() before scaleX() so the flip multiplies into the growth factor;
    // the origin stays the element centre, so the position maths is unaffected.
    this.el.style.transform =
      'translate3d(' + (this.x - w / 2).toFixed(1) + 'px,' +
      (this.y - h / 2 + bob).toFixed(1) + 'px,0) ' +
      'rotate(' + this.angle.toFixed(1) + 'deg) ' +
      'scale(' + this.scale.toFixed(3) + ') scaleX(' + this.facing + ')';
  }
};

/* ------------------------------------------------------------------ game -- */

const Game = {
  /* elements */
  app: null, playArea: null, fish: null, hud: null, basket: null, popup: null,

  /* dive state */
  level: null,
  levelIndex: 0,
  score: 0,
  correctCollected: 0,
  totalCorrect: 0,
  wrongHits: 0,
  morsels: [],
  isPlaying: false,
  isPaused: false,
  popupOpen: false,
  popupElapsed: 0,
  rafId: 0,
  lastFrame: 0,

  /* pointer */
  pointerX: 0,
  pointerY: 0,
  hasFinePointer: false,

  /* --------------------------------------------------------------- boot -- */

  init() {
    this.app = document.getElementById('app');
    this.playArea = document.getElementById('play-area');
    this.fish = document.getElementById('guide-fish');
    this.hud = document.getElementById('hud');
    this.basket = document.getElementById('basket-container');
    this.popup = document.getElementById('popup-message');

    this.hasFinePointer = !!(window.matchMedia &&
      window.matchMedia('(hover: hover) and (pointer: fine)').matches);

    GuideFish.init(this.fish);
    Save.load();
    FX.init();
    FX.setMotion(Save.data.motion);
    AudioSys.sfxOn = Save.data.sfx;
    AudioSys.musicOn = Save.data.music;

    this.buildLearnContent();
    this.bindUI();
    this.bindPointer();
    this.syncSettingsUI();
    this.runBoot();
  },

  runBoot() {
    const fill = document.getElementById('boot-fill');
    const status = document.getElementById('boot-status');
    let shown = 0;

    const setProgress = p => {
      const pct = Math.round(Math.min(1, p) * 100);
      if (fill) fill.style.width = pct + '%';
      const idx = Math.min(BOOT_LINES.length - 1, Math.floor(p * BOOT_LINES.length));
      if (status && idx > shown) { shown = idx; status.textContent = BOOT_LINES[idx]; }
    };

    // Optional artwork probes and the music-file probe run together; both
    // resolve either way, so a fully offline folder still boots promptly.
    const jobs = [
      Assets.preload(p => setProgress(0.15 + p * 0.55)),
      AudioSys.probeMusicFile()
    ];

    setProgress(0.08);
    Promise.all(jobs).then(() => {
      setProgress(0.85);
      Assets.hydrateAll(document);
      this.applyOptionalArt();
      const note = document.getElementById('music-source-note');
      if (note) note.textContent = AudioSys.sourceLabel();
      setProgress(1);
      setTimeout(() => {
        if (status) status.textContent = BOOT_LINES[BOOT_LINES.length - 1];
        this.openMenu();
      }, 380);
    });
  },

  /** Swap in any drop-in background/character art that was found. */
  applyOptionalArt() {
    Assets.applyBackground(document.getElementById('amb-rays'), 'godrays', {
      backgroundSize: 'cover', backgroundPosition: 'top center', backgroundRepeat: 'no-repeat'
    });
    const floor = document.getElementById('amb-floor');
    if (Assets.has('seafloor') && floor) {
      // A supplied seafloor replaces both the sand silhouette and the corals.
      floor.querySelectorAll('.sand, .coral').forEach(n => { n.style.display = 'none'; });
      floor.style.backgroundImage = 'url("' + Assets.url('seafloor') + '")';
      floor.style.backgroundSize = '100% auto';
      floor.style.backgroundPosition = 'bottom center';
      floor.style.backgroundRepeat = 'no-repeat';
    }
    // The guide fish carries data-art, so Assets.hydrateAll already swapped in
    // assets/images/characters/guide_fish.png if it was supplied.
  },

  /** Per-dive scene background, when the matching file was dropped in. */
  applySceneArt(levelId) {
    const keys = { 1: 'bg-shallows', 2: 'bg-kelp', 3: 'bg-twilight', 4: 'bg-trench' };
    const water = document.getElementById('amb-water');
    if (!water) return;
    const key = levelId ? keys[levelId] : 'bg-menu';
    if (Assets.has(key)) {
      water.style.backgroundImage = 'url("' + Assets.url(key) + '")';
      water.style.backgroundSize = 'cover';
      water.style.backgroundPosition = 'center';
    } else {
      water.style.backgroundImage = '';
    }
  },

  /* -------------------------------------------------------------- input -- */

  bindPointer() {
    const move = e => {
      this.pointerX = e.clientX;
      this.pointerY = e.clientY;
      GuideFish.target(e.clientX, e.clientY);
    };
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerdown', move, { passive: true });

    // Kill browser gestures inside the WebView.
    document.addEventListener('gesturestart', e => e.preventDefault());
    document.addEventListener('dblclick', e => e.preventDefault());
    document.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('touchmove', e => {
      // Allow scrolling only inside explicitly scrollable panels.
      if (!e.target.closest || !e.target.closest('.chart-scroll, .level-grid, .panel')) {
        e.preventDefault();
      }
    }, { passive: false });

    window.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        if (Screens.current === 'screen-howto' || Screens.current === 'screen-learn' ||
            Screens.current === 'screen-settings') { Screens.close(); }
        else if (this.isPlaying && !this.isPaused) this.pause();
        else if (this.isPaused) this.resume();
      }
    });

    window.addEventListener('resize', () => this.onResize());
    window.addEventListener('orientationchange', () => setTimeout(() => this.onResize(), 220));

    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.isPlaying && !this.isPaused) this.pause();
    });
  },

  bindUI() {
    const on = (id, fn) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', e => { e.preventDefault(); AudioSys.playClick(); fn(e); });
    };

    on('btn-dive', () => this.openLevels());
    on('btn-howto', () => Screens.open('screen-howto'));
    on('btn-settings', () => Screens.open('screen-settings'));
    on('btn-levels-back', () => this.openMenu());
    on('btn-pause', () => this.pause());
    on('btn-resume', () => this.resume());
    on('btn-pause-settings', () => Screens.open('screen-settings'));
    on('btn-abort', () => this.abort());
    on('btn-retry', () => this.startLevel(this.levelIndex));
    on('btn-next', () => this.startLevel(Math.min(LEVELS.length - 1, this.levelIndex + 1)));
    on('btn-learn', () => Screens.open('screen-learn'));
    on('btn-result-menu', () => this.openMenu());
    on('btn-reset', () => this.confirmReset());

    document.querySelectorAll('[data-close]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.preventDefault();
        AudioSys.playClick();
        Screens.close();
      });
    });

    on('sw-sfx', () => this.toggleSfx());
    on('sw-music', () => this.toggleMusic());
    on('sw-motion', () => this.toggleMotion());
    on('btn-sfx-quick', () => this.toggleSfx());
    on('btn-music-quick', () => this.toggleMusic());
  },

  /* ----------------------------------------------------------- settings -- */

  toggleSfx() {
    Save.data.sfx = !Save.data.sfx;
    AudioSys.setSfx(Save.data.sfx);
    Save.flush();
    this.syncSettingsUI();
    if (Save.data.sfx) AudioSys.playClick();
  },

  toggleMusic() {
    Save.data.music = !Save.data.music;
    Save.flush();
    AudioSys.setMusic(Save.data.music);
    this.syncSettingsUI();
  },

  toggleMotion() {
    Save.data.motion = !Save.data.motion;
    Save.flush();
    FX.setMotion(Save.data.motion);
    this.syncSettingsUI();
  },

  /** Icon state is expressed by swapping the image src, never by text. */
  syncSettingsUI() {
    const sfx = Save.data.sfx, music = Save.data.music, motion = Save.data.motion;

    document.querySelectorAll('[data-icon="sfx"]').forEach(img => {
      img.src = 'assets/images/ui/emoji/' + (sfx ? 'sound_on.png' : 'sound_off.png');
      img.alt = sfx ? 'Sound effects on' : 'Sound effects off';
    });
    document.querySelectorAll('[data-icon="music"]').forEach(img => {
      img.src = 'assets/images/ui/emoji/' + (music ? 'music_on.png' : 'music_off.png');
      img.alt = music ? 'Music on' : 'Music off';
    });

    const setSwitch = (id, state) => {
      const sw = document.getElementById(id);
      if (!sw) return;
      sw.classList.toggle('on', state);
      sw.setAttribute('aria-checked', state ? 'true' : 'false');
    };
    setSwitch('sw-sfx', sfx);
    setSwitch('sw-music', music);
    setSwitch('sw-motion', motion);

    const q1 = document.getElementById('btn-sfx-quick');
    const q2 = document.getElementById('btn-music-quick');
    if (q1) q1.classList.toggle('off', !sfx);
    if (q2) q2.classList.toggle('off', !music);
  },

  confirmReset() {
    const btn = document.getElementById('btn-reset');
    if (!btn) return;
    const label = btn.querySelector('span');
    if (btn.dataset.armed === '1') {
      const keepSettings = { sfx: Save.data.sfx, music: Save.data.music, motion: Save.data.motion };
      Save.reset();
      Save.data.sfx = keepSettings.sfx;
      Save.data.music = keepSettings.music;
      Save.data.motion = keepSettings.motion;
      Save.flush();
      btn.dataset.armed = '0';
      if (label) label.textContent = 'Progress Cleared';
      setTimeout(() => { if (label) label.textContent = 'Reset Progress'; }, 1800);
      this.renderLevels();
      return;
    }
    btn.dataset.armed = '1';
    if (label) label.textContent = 'Tap Again to Confirm';
    setTimeout(() => {
      if (btn.dataset.armed === '1') {
        btn.dataset.armed = '0';
        if (label) label.textContent = 'Reset Progress';
      }
    }, 3200);
  },

  /* ------------------------------------------------------------ screens -- */

  openMenu() {
    this.teardownDive();
    this.applySceneArt(null);
    Screens.show('screen-menu');
    Screens.stack.length = 0;
    this.hud.classList.add('hidden');
    this.basket.classList.add('hidden');
    this.app.classList.remove('playing');
    GuideFish.show(false);
    AudioSys.resume();
    if (Save.data.music) AudioSys.startMusic();
  },

  openLevels() {
    this.renderLevels();
    Screens.show('screen-levels');
    Screens.stack.length = 0;
  },

  renderLevels() {
    const grid = document.getElementById('level-grid');
    if (!grid) return;
    grid.innerHTML = '';

    LEVELS.forEach((lvl, i) => {
      const locked = (i + 1) > Save.data.unlocked;
      const stars = Save.data.stars[lvl.id] || 0;
      const best = Save.data.best[lvl.id] || 0;

      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'level-card' + (locked ? ' locked' : '');
      card.style.setProperty('--card-tint', lvl.tint);
      card.disabled = locked;

      const starHtml = [0, 1, 2].map(s =>
        '<img src="assets/images/ui/emoji/' + (s < stars ? 'star_on' : 'star_off') +
        '.png" alt="" width="24" height="24" class="' + (s < stars ? 'on' : '') + '">'
      ).join('');

      card.innerHTML =
        '<span class="lvl-num">Dive ' + lvl.id + '</span>' +
        '<span class="lvl-name">' + lvl.name + '</span>' +
        '<span class="lvl-desc">' + lvl.desc + ' &middot; ' + lvl.depth + ' &middot; ' +
          lvl.correct.length + ' treasures</span>' +
        '<span class="lvl-meta">' +
          '<span class="lvl-stars">' + starHtml + '</span>' +
          '<span class="lvl-best">' + (best ? 'Best ' + best : 'Not dived') + '</span>' +
        '</span>' +
        (locked ? '<img class="lvl-lock" src="assets/images/ui/emoji/lock.png" alt="Locked" width="34" height="34">' : '');

      if (!locked) {
        card.addEventListener('click', e => {
          e.preventDefault();
          AudioSys.playClick();
          this.startLevel(i);
        });
      }
      grid.appendChild(card);
    });

    const total = document.getElementById('total-stars');
    if (total) total.textContent = Save.totalStars();
  },

  buildLearnContent() {
    const list = document.getElementById('learn-list');
    const wrong = document.getElementById('learn-wrong');
    const count = document.getElementById('learn-count');

    if (list) {
      list.innerHTML = CORRECT_OPTIONS.map(o =>
        '<li><img src="assets/images/ui/emoji/algae.png" alt="" width="22" height="22">' +
        '<span><b>' + o.text + '</b>' + o.fact + '</span></li>'
      ).join('');
    }
    if (count) count.textContent = CORRECT_OPTIONS.length + ' in total';
    if (wrong) {
      wrong.innerHTML = WRONG_OPTIONS.map(w =>
        '<li><img src="assets/images/ui/emoji/cross.png" alt="" width="22" height="22">' +
        '<span><b>' + w + '</b>' + (WRONG_NOTES[w] || '') + '</span></li>'
      ).join('');
    }
  },

  /* --------------------------------------------------------------- dive -- */

  startLevel(index) {
    this.levelIndex = Math.max(0, Math.min(LEVELS.length - 1, index));
    this.level = LEVELS[this.levelIndex];

    Screens.hideAll();
    Screens.stack.length = 0;

    this.score = 0;
    this.correctCollected = 0;
    this.wrongHits = 0;
    this.isPaused = false;
    this.popupOpen = false;
    this.popupElapsed = 0;
    this.hidePopup();

    this.totalCorrect = this.level.correct.length;
    this.applySceneArt(this.level.id);

    this.hud.classList.remove('hidden');
    this.basket.classList.remove('hidden');
    this.app.classList.add('playing');

    // Finn starts mid-water at his base size, and swims to wherever the player
    // points or taps.
    GuideFish.target(window.innerWidth * 0.5, window.innerHeight * 0.62);
    GuideFish.resetSize();
    GuideFish.setGrowthFor(this.totalCorrect);
    GuideFish.show(true);
    this.updateSize();

    document.getElementById('hud-level-name').textContent = this.level.name;
    document.getElementById('hud-total').textContent = this.totalCorrect;
    this.updateScore(0);
    this.updateProgress();

    AudioSys.resume();
    if (Save.data.music) AudioSys.startMusic();

    this.spawnMorsels();
    this.isPlaying = true;
    this.lastFrame = 0;
    cancelAnimationFrame(this.rafId);
    this.rafId = requestAnimationFrame(t => this.loop(t));
  },

  morselSize() {
    return window.innerWidth <= 560 ? 96 : 118;
  },

  spawnMorsels() {
    this.playArea.innerHTML = '';
    this.morsels = [];

    const items = [];
    this.level.correct.forEach(i => {
      const o = CORRECT_OPTIONS[i];
      items.push({ text: o.text, fact: o.fact, type: 'correct' });
    });
    this.level.wrong.forEach(w => items.push({ text: w, type: 'wrong' }));

    // Fisher-Yates
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = items[i]; items[i] = items[j]; items[j] = t;
    }

    const size = this.morselSize();
    const vh = window.innerHeight;
    const maxX = Math.max(0, window.innerWidth - size);
    // Staging band below the fold: tall enough that bubbles arrive as a
    // steady stream rather than one train, but not so tall that the last of
    // them takes an age to show up.
    const spread = Math.max(vh * 0.5, items.length * size * 0.95);
    const minGap = size * 1.18;
    const rasterUrl = Assets.url('morsel');

    items.forEach(item => {
      const el = document.createElement('div');
      el.className = 'food-morsel';
      const label = document.createElement('span');
      label.className = 'label';
      label.textContent = item.text;
      el.appendChild(label);
      if (rasterUrl) {
        el.classList.add('raster');
        el.style.backgroundImage = 'url("' + rasterUrl + '")';
      }

      let x = 0, y = 0, attempts = 0, overlap = true;
      while (overlap && attempts < 60) {
        overlap = false;
        x = Math.random() * maxX;
        y = window.innerHeight + 60 + Math.random() * spread;
        for (let k = 0; k < this.morsels.length; k++) {
          const b = this.morsels[k];
          const dx = x - b.x, dy = y - b.y;
          if (Math.sqrt(dx * dx + dy * dy) < minGap) { overlap = true; break; }
        }
        attempts++;
      }

      const morsel = {
        el: el,
        x: x,
        y: y,
        baseX: x,
        size: size,
        // Rise rate in px/second, expressed as "one screen height every
        // 15-25 seconds" so the pace reads the same on any display.
        speed: vh / (15 + Math.random() * 10),
        wobbleOffset: Math.random() * 100,
        wobbleAmp: 14 + Math.random() * 16,
        data: item,
        active: true
      };

      el.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
      el.addEventListener('pointerdown', e => {
        e.preventDefault();
        e.stopPropagation();
        this.pointerX = e.clientX;
        this.pointerY = e.clientY;
        this.handleInteraction(morsel, e);
      });

      this.playArea.appendChild(el);
      this.morsels.push(morsel);
    });
  },

  handleInteraction(morsel, e) {
    if (!this.isPlaying || this.isPaused || this.popupOpen || !morsel.active) return;

    GuideFish.target(this.pointerX, this.pointerY);
    GuideFish.dart();

    if (morsel.data.type === 'correct') this.handleCorrect(morsel);
    else this.handleWrong(morsel);
  },

  morselCentre(morsel) {
    const r = morsel.el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  },

  dropMorsel(morsel) {
    if (morsel.el.parentNode) morsel.el.parentNode.removeChild(morsel.el);
    const i = this.morsels.indexOf(morsel);
    if (i !== -1) this.morsels.splice(i, 1);
  },

  /**
   * Pull a morsel into Finn's mouth. The mouth is re-read every frame, so the
   * morsel homes in on him as he swims rather than flying at a stale point.
   */
  feedToFish(morsel, durMs, onEaten) {
    const el = morsel.el;
    const half = morsel.size / 2;
    const sx = morsel.x, sy = morsel.y;
    const start = performance.now();

    const step = now => {
      // Abandon quietly if the dive was torn down mid-flight.
      if (!el.isConnected || !this.isPlaying) return;
      const t = Math.min(1, (now - start) / durMs);
      const e = t * t * (3 - 2 * t);                 // smoothstep
      const m = GuideFish.mouth();
      const cx = sx + ((m.x - half) - sx) * e;
      const cy = sy + ((m.y - half) - sy) * e;
      el.style.transform = 'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0) ' +
                           'scale(' + (1 - 0.82 * e).toFixed(3) + ') ' +
                           'rotate(' + (e * 200).toFixed(0) + 'deg)';
      el.style.opacity = String(1 - 0.55 * e);
      if (t < 1) requestAnimationFrame(step);
      else onEaten(m);
    };
    requestAnimationFrame(step);
  },

  handleCorrect(morsel) {
    morsel.active = false;
    morsel.el.classList.add('morsel-good');
    morsel.el.style.pointerEvents = 'none';
    AudioSys.playSuccess();

    const c = this.morselCentre(morsel);
    FX.burst(c.x, c.y, { color: '#6dffae', count: 20, spread: 150 });
    FX.ring(c.x, c.y, '#7dffba', morsel.size * 0.75);
    FX.floatScore(c.x, c.y - 20, '+10', true);
    FX.flash(true);

    this.updateScore(10);
    this.correctCollected++;
    this.updateProgress();

    // Nourishing: Finn swallows it and grows.
    this.feedToFish(morsel, 520, m => {
      this.dropMorsel(morsel);
      GuideFish.gulp();
      GuideFish.grow(GuideFish.GROW_STEP);
      this.updateSize();
      AudioSys.playCatch();
      FX.burst(m.x, m.y, { color: '#9dffc8', count: 14, spread: 90, size: 8 });
      FX.ring(m.x, m.y, '#9dffc8', 60);
      FX.floatScore(m.x, m.y - 34, 'Yum!', true);

      // Log the harvest in the basket.
      this.basket.classList.add('catch');
      const br = this.basket.getBoundingClientRect();
      FX.burst(br.left + br.width / 2, br.top + br.height * 0.3,
        { color: '#ffd47a', count: 10, spread: 70, size: 7 });
      setTimeout(() => this.basket.classList.remove('catch'), 460);
    });

    this.showPopup(morsel.data.fact);
  },

  handleWrong(morsel) {
    morsel.active = false;
    morsel.el.classList.add('morsel-bad');
    morsel.el.style.pointerEvents = 'none';
    AudioSys.playFail();
    this.wrongHits++;

    const c = this.morselCentre(morsel);
    FX.floatScore(c.x, c.y - 20, '-5', false);
    FX.flash(false);

    this.updateScore(-5);
    this.toast('Not food — not from algae', false);

    // Indigestible: he bites it, spits it out and shrinks.
    setTimeout(() => this.feedToFish(morsel, 340, m => {
      this.dropMorsel(morsel);
      GuideFish.yuck();
      GuideFish.grow(GuideFish.SHRINK_STEP);
      this.updateSize();
      FX.burst(m.x, m.y, { color: '#ff6b60', count: 18, spread: 130 });
      FX.ring(m.x, m.y, '#ff7d70', 66);
      FX.floatScore(m.x, m.y - 34, 'Yuck!', false);
    }), 420);
  },

  updateScore(points) {
    this.score += points;
    const el = document.getElementById('hud-score');
    if (el) el.textContent = this.score;
    if (points !== 0) {
      const plate = el ? el.closest('.hud-plate') : null;
      if (plate) {
        plate.classList.remove('bump');
        void plate.offsetWidth;
        plate.classList.add('bump');
      }
    }
  },

  /** Mirror Finn's size into the HUD gauge, tinted by whether he is thriving. */
  updateSize() {
    const el = document.getElementById('hud-size');
    if (!el) return;
    const s = GuideFish.scaleTarget;
    el.textContent = Math.round(s * 100) + '%';
    const plate = document.getElementById('hud-size-plate');
    if (plate) {
      plate.classList.toggle('thriving', s > 1.02);
      plate.classList.toggle('ailing', s < 0.98);
      plate.classList.remove('bump');
      void plate.offsetWidth;
      plate.classList.add('bump');
    }
  },

  updateProgress() {
    const found = document.getElementById('hud-found');
    if (found) found.textContent = this.correctCollected;
    const fill = document.getElementById('hud-bar-fill');
    if (fill) {
      const pct = this.totalCorrect ? (this.correctCollected / this.totalCorrect) * 100 : 0;
      fill.style.width = pct.toFixed(1) + '%';
    }
  },

  toast(text, good) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = text;
    t.className = good ? 'good' : 'bad';
    t.classList.remove('hidden');
    void t.offsetWidth;
    t.style.animation = 'none';
    void t.offsetWidth;
    t.style.animation = '';
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => t.classList.add('hidden'), 1500);
  },

  showPopup(text) {
    document.getElementById('pop-text').textContent = text;
    this.popup.classList.remove('hidden');
    this.popup.style.animation = 'none';
    void this.popup.offsetWidth;
    this.popup.style.animation = '';
    this.popupOpen = true;
    this.popupElapsed = 0;      // counted by the loop so pausing holds it
  },

  hidePopup() {
    this.popup.classList.add('hidden');
    this.popupOpen = false;
  },

  closePopup() {
    this.hidePopup();
    if (this.correctCollected >= this.totalCorrect) this.endDive();
  },

  /* --------------------------------------------------------------- loop -- */

  loop(ts) {
    if (!this.isPlaying) return;
    this.rafId = requestAnimationFrame(t => this.loop(t));

    if (!this.lastFrame) this.lastFrame = ts;
    const dtMs = Math.min(64, ts - this.lastFrame);
    this.lastFrame = ts;
    const dtSec = dtMs / 1000;

    if (this.isPaused) return;

    // Finn keeps swimming even while a field note holds the dive still, so the
    // pointer never feels dead. He touches no gameplay state.
    GuideFish.update(dtSec, ts / 1000);

    if (this.popupOpen) {
      this.popupElapsed += dtMs;
      if (this.popupElapsed >= 3000) this.closePopup();
      return;                                // dive is held still, as before
    }

    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const now = ts / 1000;

    for (let i = 0; i < this.morsels.length; i++) {
      const b = this.morsels[i];
      if (!b.active) continue;

      b.y -= b.speed * dtSec;

      if (b.y < -b.size - 10) {
        // Recycle at the bottom, nudged clear of anything already down there.
        b.y = vh + 40 + Math.random() * (vh * 0.45);
        b.baseX = Math.random() * Math.max(0, vw - b.size);
        for (let k = 0; k < this.morsels.length; k++) {
          const o = this.morsels[k];
          if (o !== b && Math.abs(o.baseX - b.baseX) < b.size &&
              Math.abs(o.y - b.y) < b.size) {
            b.y += b.size * 1.3;
          }
        }
      }

      const wobble = Math.sin(now * 0.9 + b.wobbleOffset) * b.wobbleAmp;
      b.x = Math.max(0, Math.min(vw - b.size, b.baseX + wobble));
      b.el.style.transform = 'translate3d(' + b.x.toFixed(1) + 'px,' + b.y.toFixed(1) + 'px,0)';
    }
  },

  onResize() {
    const size = this.morselSize();
    const vw = window.innerWidth;
    this.morsels.forEach(b => {
      b.size = size;
      b.baseX = Math.max(0, Math.min(vw - size, b.baseX));
      b.x = Math.max(0, Math.min(vw - size, b.x));
      if (b.active) {
        b.el.style.transform = 'translate3d(' + b.x.toFixed(1) + 'px,' + b.y.toFixed(1) + 'px,0)';
      }
    });
  },

  /* ------------------------------------------------------- pause & end -- */

  pause() {
    if (!this.isPlaying || this.isPaused) return;
    this.isPaused = true;
    this.app.classList.remove('playing');
    GuideFish.show(false);
    Screens.show('screen-pause');
    Screens.stack.length = 0;
  },

  resume() {
    if (!this.isPlaying) return;
    this.isPaused = false;
    this.lastFrame = 0;
    Screens.hideAll();
    Screens.stack.length = 0;
    this.app.classList.add('playing');
    AudioSys.resume();
  },

  abort() {
    this.openMenu();
  },

  teardownDive() {
    this.isPlaying = false;
    this.isPaused = false;
    cancelAnimationFrame(this.rafId);
    this.rafId = 0;
    this.lastFrame = 0;
    this.morsels = [];
    if (this.playArea) this.playArea.innerHTML = '';
    this.hidePopup();
    const t = document.getElementById('toast');
    if (t) t.classList.add('hidden');
  },

  starsFor(score, max) {
    if (score >= max) return 3;
    if (score >= max * 0.75) return 2;
    return 1;
  },

  endDive() {
    this.isPlaying = false;
    cancelAnimationFrame(this.rafId);
    this.rafId = 0;
    this.app.classList.remove('playing');
    GuideFish.show(false);
    this.hud.classList.add('hidden');

    const max = this.totalCorrect * 10;
    const stars = this.starsFor(this.score, max);
    const outcome = Save.recordDive(this.level.id, this.score, stars);

    AudioSys.playWin();
    FX.celebrate();
    if (outcome.unlockedNew) setTimeout(() => AudioSys.playUnlock(), 700);

    const size = GuideFish.scaleTarget;
    document.getElementById('result-score').textContent = this.score + ' / ' + max;
    document.getElementById('result-best').textContent = (Save.data.best[this.level.id] || 0);
    document.getElementById('result-size').textContent = Math.round(size * 100) + '%';

    const title = document.getElementById('result-title');
    const msg = document.getElementById('result-msg');
    if (stars === 3) {
      title.textContent = 'Flawless Feed!';
      msg.textContent = 'Every morsel was the real thing — Finn grew to ' +
        Math.round(size * 100) + '% of his starting size, without one bad mouthful.';
    } else if (stars === 2) {
      title.textContent = 'Basket Full!';
      msg.textContent = 'All ' + this.totalCorrect + ' algae morsels eaten. Finn finished at ' +
        Math.round(size * 100) + '% — a bit of junk slowed him down.';
    } else {
      title.textContent = 'Back on Deck';
      msg.textContent = 'Basket filled, but the junk food took its toll — Finn ended at ' +
        Math.round(size * 100) + '%. Dive again for a cleaner run.';
    }

    // Reveal the starfish one at a time.
    const row = document.getElementById('star-row');
    const imgs = row.querySelectorAll('img');
    imgs.forEach(img => {
      img.src = 'assets/images/ui/emoji/star_off.png';
      img.classList.remove('pop');
    });
    for (let i = 0; i < stars; i++) {
      setTimeout(() => {
        imgs[i].src = 'assets/images/ui/emoji/star_on.png';
        imgs[i].classList.add('pop');
        AudioSys.tone(660 + i * 220, 'sine', 0.28, 0, 0.1);
      }, 420 + i * 320);
    }

    const nextBtn = document.getElementById('btn-next');
    const isLast = this.levelIndex >= LEVELS.length - 1;
    if (nextBtn) {
      nextBtn.classList.toggle('hidden', isLast);
      const span = nextBtn.querySelector('span');
      if (span) span.textContent = 'Next Dive';
    }

    const crest = document.getElementById('result-crest');
    if (crest) crest.src = 'assets/images/ui/emoji/' + (stars === 3 ? 'trophy.png' : 'celebrate.png');

    Screens.show('screen-result');
    Screens.stack.length = 0;
  }
};

/* --------------------------------------------------------------- start -- */

// Any first gesture is enough to unlock the audio context in a WebView.
['pointerdown', 'keydown'].forEach(evt => {
  window.addEventListener(evt, function once() {
    AudioSys.resume();
    if (Save.data && Save.data.music) AudioSys.startMusic();
    window.removeEventListener(evt, once);
  }, { once: true });
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => Game.init());
} else {
  Game.init();
}
