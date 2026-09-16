/* ==========================================================================
   main.js - boot, screens, HUD, input, render loop.
   ========================================================================== */
'use strict';

var canvas, ctx, DPR = 1, VW = 0, VH = 0;

var BADGES = [
  { id: 'first', name: 'First Fix', desc: 'Clear Mission 1', icon: 'check' },
  { id: 'straight', name: 'Straight Shooter', desc: 'Finish with efficiency 98% or better', icon: 'target' },
  { id: 'scenic', name: 'Scenic Route', desc: 'Finish having flown 3x your displacement', icon: 'path' },
  { id: 'zero', name: 'Zero Sum', desc: 'Finish a round trip with zero displacement', icon: 'origin' },
  { id: 'hoard', name: 'Crystal Hoarder', desc: 'Collect 40 crystals', icon: 'crystal' },
  { id: 'untouched', name: 'Untouched', desc: 'Clear 5 missions without a scratch', icon: 'airship' },
  { id: 'storm', name: 'Storm Reader', desc: 'Clear the Storm Gate first try', icon: 'gate' },
  { id: 'frames', name: 'Frame Shifter', desc: 'Clear Two Frames', icon: 'compass' },
  { id: 'master', name: 'Vector Master', desc: 'Three stars on every mission', icon: 'trophy' }
];

var UI = {
  cur: 'boot', _stack: [], idx: 0, lastResult: null,

  $: function (id) { return document.getElementById(id); },

  show: function (id) {
    var s = document.querySelectorAll('.screen');
    for (var i = 0; i < s.length; i++) s[i].classList.remove('active');
    var hud = this.$('hud');
    if (id === 'flight') hud.classList.add('active');
    else { hud.classList.remove('active'); var el = this.$(id); if (el) el.classList.add('active'); }
    this.cur = id;
    requestAnimationFrame(function () { UI.refit(); });
  },

  openModal: function (id) {
    var m = this.$(id);
    if (!m) return;
    var at = this._stack.indexOf(id);
    if (at !== -1) this._stack.splice(at, 1);
    this._stack.push(id);
    m.style.zIndex = String(60 + this._stack.length);
    m.classList.add('open');
    Sound.play('open');
  },
  closeModal: function (id) {
    var m = this.$(id);
    if (!m) return;
    m.classList.remove('open');
    m.style.zIndex = '';
    var at = this._stack.indexOf(id);
    if (at !== -1) this._stack.splice(at, 1);
  },
  closeTop: function () {
    if (!this._stack.length) return false;
    this.closeModal(this._stack[this._stack.length - 1]);
    return true;
  },
  blocking: function () { return this.cur !== 'flight' || this._stack.length > 0; },

  toast: function (msg) {
    var t = this.$('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(this._tt);
    this._tt = setTimeout(function () { t.classList.remove('show'); }, 2200);
  },

  /* ---------------------------------------------------------- nova barks */
  bark: function (who, line, ms) {
    var b = this.$('bark');
    this.$('bark-who').textContent = who;
    this.$('bark-line').textContent = line;
    b.classList.add('show');
    clearTimeout(this._bt);
    this._bt = setTimeout(function () { b.classList.remove('show'); }, ms || 3200);
  },

  /* -------------------------------------------------------------- hangar */
  refreshHangar: function () {
    var d = Save.data;
    this.$('h-level').textContent = Save.level();
    this.$('h-xpbar').style.width = Math.round(Save.levelFrac() * 100) + '%';
    this.$('h-xp').textContent = d.xp;
    this.$('h-coins').textContent = d.coins;
    this.$('h-stars').textContent = Save.totalStars() + ' / ' + (LEVELS.length * 3);
    var cleared = 0;
    for (var i = 0; i < LEVELS.length; i++) if (Save.stars(LEVELS[i].id) > 0) cleared++;
    this.$('h-cleared').textContent = cleared + ' / ' + LEVELS.length;
    this.$('btn-continue').style.display = cleared > 0 ? '' : 'none';
    var badges = BADGES.filter(function (b) { return Save.data.badges[b.id]; }).length;
    this.$('h-badges').textContent = badges + ' / ' + BADGES.length;
  },

  /* ------------------------------------------------------------ map */
  buildMap: function () {
    var wrap = this.$('map-grid');
    wrap.innerHTML = '';
    var self = this;
    LEVELS.forEach(function (lv, i) {
      var open = Save.unlocked(lv.id);
      var card = document.createElement('div');
      card.className = 'mcard mat-wood riveted' + (open ? '' : ' locked');

      var num = document.createElement('span');
      num.className = 'mnum';
      num.textContent = String(lv.id).padStart(2, '0');
      card.appendChild(num);

      var nm = document.createElement('span');
      nm.className = 'mname';
      nm.textContent = open ? lv.name : 'LOCKED';
      card.appendChild(nm);

      var mech = document.createElement('span');
      mech.className = 'mmech';
      mech.textContent = open ? lv.mechanic : '';
      card.appendChild(mech);

      var pips = document.createElement('div');
      pips.className = 'mpips';
      if (open) {
        var got = Save.stars(lv.id);
        for (var s = 0; s < 3; s++) {
          var im = document.createElement('img');
          im.src = Assets.icon(s < got ? 'star_on' : 'star_off');
          im.alt = '';
          pips.appendChild(im);
        }
      } else {
        var lk = document.createElement('img');
        lk.src = Assets.icon('helm');
        lk.alt = 'Locked';
        lk.className = 'lockimg';
        pips.appendChild(lk);
      }
      card.appendChild(pips);

      if (open) card.addEventListener('click', function () { Sound.play('click'); self.brief(i); });
      wrap.appendChild(card);
    });
    this.$('map-total').textContent = Save.totalStars() + ' / ' + (LEVELS.length * 3);
  },

  /* ------------------------------------------------------------- brief */
  brief: function (i) {
    this.idx = Util.clamp(i, 0, LEVELS.length - 1);
    var lv = LEVELS[this.idx];
    this.$('b-no').textContent = 'MISSION ' + String(lv.id).padStart(2, '0');
    this.$('b-name').textContent = lv.name;
    this.$('b-nova').textContent = lv.nova;
    this.$('b-brief').textContent = lv.brief;
    this.$('b-mech').textContent = lv.mechanic;
    var obj = this.$('b-obj');
    obj.innerHTML = '';
    var chips = [];
    if (lv.targetDisp) chips.push(['target', 'Fly Dr = (' + lv.targetDisp.x + ', ' + (-lv.targetDisp.y) + ')']);
    else if (lv.loop) chips.push(['origin', 'Return to the launch pad']);
    else chips.push(['flag', 'Reach the gold pad']);
    if (lv.need) chips.push(['crystal', lv.need + ' crystals']);
    if (lv.beaconsRequired) chips.push(['origin', 'Drop ' + lv.beaconsRequired + ' beacons']);
    chips.push(['fuel', 'Fuel ' + lv.fuel]);
    chips.forEach(function (c) {
      var el = document.createElement('span');
      el.className = 'chip mat-glass';
      var im = document.createElement('img');
      im.src = Assets.icon(c[0]); im.alt = '';
      el.appendChild(im);
      el.appendChild(document.createTextNode(c[1]));
      obj.appendChild(el);
    });
    var st = this.$('b-stars');
    st.innerHTML = '';
    var conds = lv.starD
      ? ['Complete the round trip', 'Fly at least ' + lv.starD[0] + ' units', 'Fly at least ' + lv.starD[1] + ' units']
      : ['Reach the pad', 'Efficiency ' + Math.round(lv.starE[0] * 100) + '% or better', Math.round(lv.starE[1] * 100) + '% and no damage'];
    conds.forEach(function (c, k) {
      var row = document.createElement('div');
      row.className = 'srow';
      var im = document.createElement('img');
      im.src = Assets.icon('star_on'); im.alt = '';
      row.appendChild(im);
      row.appendChild(document.createTextNode(c));
      st.appendChild(row);
    });
    this.show('brief');
  },

  /* ------------------------------------------------------------ flight */
  launch: function () {
    var lv = LEVELS[this.idx];
    Game.load(lv);
    Game.onChange = function () { UI.syncHud(); };
    Game.onWin = function () { setTimeout(function () { UI.debrief(); }, 500); };
    Game.onFail = function (why) { setTimeout(function () { UI.failed(why); }, 500); };
    Game.onWhy = function (d, disp) { UI.why(d, disp); };
    this.$('f-name').textContent = lv.name;
    this.$('f-no').textContent = 'M' + String(lv.id).padStart(2, '0');
    this.$('beacon-btn').style.display = lv.beaconsRequired ? '' : 'none';
    this.beaconsLeft = lv.beaconsRequired || 0;
    this.show('flight');
    this.refit();
    this.syncHud();
    Sound.startMusic();
    this.tutStart(lv);
    var self = this;
    if (lv.id !== 1) setTimeout(function () { self.bark('CAPTAIN NOVA', lv.nova, 4000); }, 400);
  },

  syncHud: function () {
    if (!Game.lv) return;
    var d = Math.round(Game.trail.d), dl = Math.round(Game.dispLen);
    this.$('f-dist').textContent = d;
    this.$('f-disp').textContent = dl;
    var e = Math.round(Game.eff * 100);
    this.$('f-eff').textContent = e + '%';
    this.$('f-effbar').style.width = e + '%';
    this.$('f-fuel').style.width = Math.round(Game.fuelFrac() * 100) + '%';
    var hull = this.$('f-hull');
    hull.innerHTML = '';
    for (var i = 0; i < 3; i++) {
      var im = document.createElement('img');
      im.src = Assets.icon(i < Game.hulls ? 'airship' : 'star_off');
      im.alt = '';
      hull.appendChild(im);
    }
    var need = Game.lv.need || 0;
    var cw = this.$('f-crystals');
    cw.style.display = need ? '' : 'none';
    if (need) {
      cw.innerHTML = '';
      for (var c = 0; c < need; c++) {
        var ci = document.createElement('img');
        ci.src = Assets.icon(c < Game.got ? 'crystal' : 'star_off');
        ci.alt = '';
        cw.appendChild(ci);
      }
    }
    this.$('f-beacons').textContent = this.beaconsLeft || 0;
  },

  dropBeacon: function () {
    if (!this.beaconsLeft) { this.toast('No beacons left.'); return; }
    Game.beacons.push({ x: Game.ship.x, y: Game.ship.y });
    this.beaconsLeft--;
    Sound.play('beacon');
    Game.pfx.emit(Game.ship.x, Game.ship.y, { rgb: COL.initial, count: 20, spMax: 180, g: 0 });
    this.syncHud();
    if (this.beaconsLeft === 0) this.bark('PIP', 'Two frames live. Same ship, two different addresses.', 3600);
    else this.bark('PIP', 'Beacon planted. Your position vector now reads from here.', 3200);
  },


  /* A staged tutorial that reacts to what the player actually does, rather
     than a wall of text they will skip. Mission 1 only. */
  tut: null,
  tutStart: function (lv) {
    if (lv.id !== 1) { this.tut = null; return; }
    this.tut = { step: 'fly' };
    var self = this;
    setTimeout(function () {
      if (self.tut && self.tut.step === 'fly') {
        self.bark('CAPTAIN NOVA', 'Hold your finger anywhere on the sky - she flies to it. Let go and she settles.', 6000);
      }
    }, 900);
  },
  tutStep: function (what) {
    if (!this.tut) return;
    if (what === 'flew' && this.tut.step === 'fly') {
      this.tut.step = 'land';
      var self = this;
      setTimeout(function () {
        if (self.tut && self.tut.step === 'land') {
          self.bark('CAPTAIN NOVA', 'Good. Now set her down inside the gold ring.', 5000);
        }
      }, 2600);
    }
  },
  /* ---------------------------------------------------------- why card */
  why: function (d, disp) {
    this.$('why-d').textContent = d;
    this.$('why-disp').textContent = disp;
    this.$('why-gap').textContent = Math.max(0, d - disp);
    this.$('why-answer').style.display = 'none';
    this.$('why-reveal').style.display = '';
    this.openModal('why-modal');
    Sound.play('why');
  },

  /* ---------------------------------------------------------- debrief */
  debrief: function () {
    var lv = LEVELS[this.idx];
    var r = Game.result();
    this.lastResult = r;
    var prev = Save.stars(lv.id);
    var firstClear = prev === 0;
    Save.record(lv.id, r.stars);
    Save.add('xp', firstClear ? r.xp : Math.floor(r.xp * 0.4));
    Save.add('coins', firstClear ? r.coins : Math.floor(r.coins * 0.4));
    Save.add('crystalsTotal', r.crystals);
    if (r.damage === 0) Save.add('cleanRuns', 1);
    Save.bumpScore(lv.id, r.score, r.time, r.eff);

    /* badges */
    this.grant('first', lv.id === 1);
    this.grant('straight', r.eff >= 0.98);
    this.grant('scenic', r.disp > 0 && r.d >= r.disp * 3);
    this.grant('zero', lv.loop && r.disp < 12);
    this.grant('hoard', Save.data.crystalsTotal >= 40);
    this.grant('untouched', Save.data.cleanRuns >= 5);
    this.grant('storm', lv.id === 5 && r.damage === 0 && firstClear);
    this.grant('frames', lv.id === 8);
    this.grant('master', Save.totalStars() >= LEVELS.length * 3);

    this.$('d-title').textContent = lv.name + ' CLEARED';
    var sw = this.$('d-stars');
    sw.innerHTML = '';
    for (var i = 0; i < 3; i++) {
      var im = document.createElement('img');
      im.src = Assets.icon(i < r.stars ? 'star_on' : 'star_off');
      if (i < r.stars) im.className = 'won';
      im.alt = '';
      sw.appendChild(im);
    }
    this.$('d-score').textContent = r.score;
    this.$('d-dist').textContent = r.d;
    this.$('d-disp').textContent = r.disp;
    this.$('d-eff').textContent = Math.round(r.eff * 100) + '%';
    this.$('d-time').textContent = r.time.toFixed(1) + 's';
    this.$('d-best').textContent = Save.best(lv.id).score;
    this.$('d-crystals').textContent = r.crystals + (lv.need ? ' / ' + lv.need : '');
    this.$('d-damage').textContent = r.damage;
    this.$('d-xp').textContent = '+' + (firstClear ? r.xp : Math.floor(r.xp * 0.4));
    this.$('d-coins').textContent = '+' + (firstClear ? r.coins : Math.floor(r.coins * 0.4));
    this.$('d-teach').textContent = lv.teach;
    this.$('btn-next').style.display = this.idx < LEVELS.length - 1 ? '' : 'none';

    Sound.play(r.stars === 3 ? 'fanfare' : 'clear');
    if (r.stars === 3) {
      for (var k = 0; k < 5; k++) {
        (function (n) {
          setTimeout(function () {
            FX.chip(VW * (0.2 + n * 0.15), VH * 0.2, [COL.final, COL.initial, COL.disp, COL.path], { count: 16 });
          }, n * 120);
        })(k);
      }
    }
    this.openModal('debrief-modal');
  },

  grant: function (id, cond) {
    if (!cond || Save.data.badges[id]) return;
    Save.data.badges[id] = 1;
    Save.flush();
    var b = null;
    for (var i = 0; i < BADGES.length; i++) if (BADGES[i].id === id) b = BADGES[i];
    if (b) { this.toast('Badge earned: ' + b.name); Sound.play('badge'); }
  },

  failed: function (why) {
    this.$('fail-why').textContent = why;
    this.$('fail-dist').textContent = Math.round(Game.trail.d);
    this.$('fail-disp').textContent = Math.round(Game.dispLen);
    this.openModal('fail-modal');
  },

  buildBadges: function () {
    var wrap = this.$('badge-grid');
    wrap.innerHTML = '';
    BADGES.forEach(function (b) {
      var got = !!Save.data.badges[b.id];
      var card = document.createElement('div');
      card.className = 'bcard mat-glass' + (got ? ' got' : '');
      var im = document.createElement('img');
      im.src = Assets.icon(got ? b.icon : 'star_off');
      im.alt = '';
      card.appendChild(im);
      var t = document.createElement('div');
      var n = document.createElement('strong');
      n.textContent = b.name;
      var dd = document.createElement('span');
      dd.textContent = b.desc;
      t.appendChild(n); t.appendChild(dd);
      card.appendChild(t);
      wrap.appendChild(card);
    });
  },

  /* ------------------------------------------------------------ settings */
  applySettings: function () {
    this.syncSw('sw-music', Save.data.music, 'music_on', 'music_off');
    this.syncSw('sw-sfx', Save.data.sfx, 'sfx_on', 'sfx_off');
    Sound.musicOn = Save.data.music;
    Sound.sfxOn = Save.data.sfx;
    if (Sound.ready) { Sound.setMusic(Save.data.music); Sound.setSfx(Save.data.sfx); }
  },
  syncSw: function (id, on, a, b) {
    var el = this.$(id);
    if (!el) return;
    el.setAttribute('aria-checked', on ? 'true' : 'false');
    var img = el.querySelector('img');
    if (img) img.src = Assets.icon(on ? a : b);
  },

  refit: function () {
    var slot = this.$('board-slot');
    if (!slot || !Game.lv) return;
    var r = slot.getBoundingClientRect();
    if (r.width < 8 || r.height < 8) return;
    Game.fit({ x: r.left, y: r.top, w: r.width, h: r.height });
  },

  /* ---------------------------------------------------------------- bind */
  bind: function () {
    var self = this;
    var on = function (id, fn) {
      var el = self.$(id);
      if (el) el.addEventListener('click', function (e) { e.preventDefault(); fn(e); });
    };

    on('btn-boot', function () {
      Sound.init(); Sound.resume();
      Sound.musicOn = Save.data.music; Sound.sfxOn = Save.data.sfx;
      Sound.setSfx(Save.data.sfx); Sound.setMusic(Save.data.music);
      Sound.play('click');
      self.show('hangar'); self.refreshHangar();
      if (!Save.data.seenHowTo) { Save.set('seenHowTo', true); setTimeout(function () { self.openModal('howto-modal'); }, 420); }
    });

    on('btn-fly', function () { Sound.play('click'); self.buildMap(); self.show('map'); });
    on('btn-continue', function () {
      Sound.play('click');
      var i = 0;
      for (var k = 0; k < LEVELS.length; k++) if (Save.unlocked(LEVELS[k].id)) i = k;
      self.brief(i);
    });
    on('btn-howto', function () { Sound.play('click'); self.openModal('howto-modal'); });
    on('btn-badges', function () { Sound.play('click'); self.buildBadges(); self.openModal('badges-modal'); });
    on('btn-settings', function () { Sound.play('click'); self.openModal('settings-modal'); });

    on('map-back', function () { Sound.play('click'); self.show('hangar'); self.refreshHangar(); });
    on('map-howto', function () { Sound.play('click'); self.openModal('howto-modal'); });

    on('b-back', function () { Sound.play('click'); self.buildMap(); self.show('map'); });
    on('b-launch', function () { Sound.play('launch'); self.launch(); });

    on('f-menu', function () { Sound.play('click'); self.buildMap(); self.show('map'); });
    on('f-restart', function () { Sound.play('click'); self.launch(); });
    on('beacon-btn', function () { self.dropBeacon(); });

    on('why-reveal', function () {
      self.$('why-answer').style.display = '';
      self.$('why-reveal').style.display = 'none';
      Sound.play('click');
    });
    on('why-ok', function () {
      Sound.play('click');
      self.closeModal('why-modal');
      Game.finish();
    });

    on('btn-next', function () {
      Sound.play('click');
      self.closeModal('debrief-modal');
      if (self.idx < LEVELS.length - 1) self.brief(self.idx + 1);
      else { self.buildMap(); self.show('map'); }
    });
    on('btn-replay', function () { Sound.play('click'); self.closeModal('debrief-modal'); self.launch(); });
    on('btn-learn', function () { Sound.play('click'); self.openModal('learn-modal'); });
    on('btn-d-map', function () { Sound.play('click'); self.closeModal('debrief-modal'); self.buildMap(); self.show('map'); });

    on('fail-retry', function () { Sound.play('click'); self.closeModal('fail-modal'); self.launch(); });
    on('fail-map', function () { Sound.play('click'); self.closeModal('fail-modal'); self.buildMap(); self.show('map'); });

    on('close-howto', function () { self.closeModal('howto-modal'); });
    on('howto-ok', function () { self.closeModal('howto-modal'); });
    on('close-learn', function () { self.closeModal('learn-modal'); });
    on('learn-ok', function () { self.closeModal('learn-modal'); });
    on('close-badges', function () { self.closeModal('badges-modal'); });
    on('badges-ok', function () { self.closeModal('badges-modal'); });
    on('close-settings', function () { self.closeModal('settings-modal'); });
    on('settings-ok', function () { self.closeModal('settings-modal'); });

    on('sw-music', function () {
      var n = !Save.data.music;
      Save.set('music', n); self.syncSw('sw-music', n, 'music_on', 'music_off');
      Sound.init(); Sound.setMusic(n); Sound.play('toggle');
    });
    on('sw-sfx', function () {
      var n = !Save.data.sfx;
      Save.set('sfx', n); self.syncSw('sw-sfx', n, 'sfx_on', 'sfx_off');
      Sound.init(); Sound.setSfx(n);
      if (n) Sound.play('toggle');
    });
    on('btn-wipe', function () {
      Save.wipe(); self.refreshHangar(); self.buildMap();
      Sound.play('toggle'); self.toast('Flight log cleared.');
    });

    var modals = document.querySelectorAll('.modal');
    for (var i = 0; i < modals.length; i++) {
      modals[i].addEventListener('pointerdown', function (e) {
        if (e.target === this && this.id !== 'debrief-modal' && this.id !== 'fail-modal' && this.id !== 'why-modal') {
          self.closeModal(this.id);
        }
      });
    }

    /* keyboard flight */
    var keys = {};
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { self.closeTop(); return; }
      keys[e.key.toLowerCase()] = true;
      if (self.blocking()) return;
      if (e.key === ' ') { e.preventDefault(); if (self.beaconsLeft) self.dropBeacon(); }
      if (e.key === 'r' || e.key === 'R') { e.preventDefault(); self.launch(); }
      self.applyKeys(keys);
    });
    document.addEventListener('keyup', function (e) {
      keys[e.key.toLowerCase()] = false;
      self.applyKeys(keys);
    });
    this._keys = keys;
  },

  applyKeys: function (k) {
    if (this.blocking() || !Game.lv || Game.state !== 'FLY') return;
    var x = 0, y = 0;
    if (k['a'] || k['arrowleft']) x -= 1;
    if (k['d'] || k['arrowright']) x += 1;
    if (k['w'] || k['arrowup']) y -= 1;
    if (k['s'] || k['arrowdown']) y += 1;
    if (x || y) {
      var m = Math.hypot(x, y);
      Game.setThrust(x / m, y / m);
      this._kbd = true;
    } else if (this._kbd) {
      Game.clearThrust();
      this._kbd = false;
    }
  }
};

/* ==================================================================== save */
Save.level = function () { return 1 + Math.floor(this.data.xp / 500); };
Save.levelFrac = function () { return (this.data.xp % 500) / 500; };

/* ================================================================== canvas */

function resizeCanvas() {
  var vv = window.visualViewport;
  VW = Math.max(260, Math.round(vv ? vv.width : window.innerWidth));
  VH = Math.max(260, Math.round(vv ? vv.height : window.innerHeight));
  DPR = Util.clamp(window.devicePixelRatio || 1, 1, 2.5);
  canvas.style.width = VW + 'px';
  canvas.style.height = VH + 'px';
  canvas.width = Math.round(VW * DPR);
  canvas.height = Math.round(VH * DPR);
  document.documentElement.style.setProperty('--app-h', VH + 'px');
  Scene.resize(VW, VH);
  UI.refit();
}

/* ---- unified pointer control: hold anywhere and the ship flies to your
   finger. A relative drag-stick reads as a genre convention to people who
   already play games and as nothing at all to everyone else. ---- */
var aim = { active: false, x: 0, y: 0, id: null };

function aimAt(e) {
  aim.x = e.clientX; aim.y = e.clientY;
  var f = Game.s2f(aim.x, aim.y);
  Game.setTarget(Util.clamp(f.x, 0, FIELD.w), Util.clamp(f.y, 0, FIELD.h));
}

function bindInput() {
  canvas.addEventListener('pointerdown', function (e) {
    if (!e.isPrimary) return;
    Sound.init(); Sound.resume();
    e.preventDefault();
    if (UI.blocking() || !Game.lv || Game.state !== 'FLY') return;
    aim.active = true; aim.id = e.pointerId;
    aimAt(e);
    UI.tutStep('flew');
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { }
  });

  canvas.addEventListener('pointermove', function (e) {
    if (!aim.active || e.pointerId !== aim.id) return;
    if (!Game.lv || Game.state !== 'FLY') return;
    aimAt(e);
  });

  var release = function () {
    if (!aim.active) return;
    aim.active = false; aim.id = null;
    Game.clearTarget(); Game.clearThrust();
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  window.addEventListener('pointerup', release);

  canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
  document.addEventListener('dblclick', function (e) { e.preventDefault(); });
  document.addEventListener('touchmove', function (e) {
    if (e.touches.length > 1) e.preventDefault();
    else if (e.target === canvas) e.preventDefault();
  }, { passive: false });
}

/* reticle at the held point, plus a lead line from the ship */
function drawAim(ctx) {
  if (!aim.active || !Game.lv || Game.state !== 'FLY') return;
  var sx = Game.view.ox + Game.ship.x * Game.view.s;
  var sy = Game.view.oy + Game.ship.y * Game.view.s;
  ctx.save();
  ctx.strokeStyle = 'rgba(251,191,36,0.35)';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 7]);
  ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(aim.x, aim.y); ctx.stroke();
  ctx.setLineDash([]);
  var p = 0.5 + 0.5 * Math.sin(Game.t * 7);
  var g = ctx.createRadialGradient(aim.x, aim.y, 0, aim.x, aim.y, 26);
  g.addColorStop(0, 'rgba(251,191,36,0.7)');
  g.addColorStop(1, 'rgba(251,191,36,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(aim.x, aim.y, 26, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(aim.x, aim.y, 13 + p * 3, 0, TAU); ctx.stroke();
  ctx.restore();
}

/* ==================================================================== loop */

var _last = 0, _tick = 0;

function frame(now) {
  var dt = _last ? Math.min(0.05, (now - _last) / 1000) : 0.016;
  _last = now;

  Scene.update(dt);
  FX.update(dt);
  if (Game.lv) Game.update(dt);
  if (++_tick % 12 === 0) UI.refit();
  if (Game.lv && UI.cur === 'flight' && _tick % 4 === 0) UI.syncHud();

  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.clearRect(0, 0, VW, VH);
  Scene.draw(ctx, VW, VH);
  if (Game.lv && UI.cur === 'flight') { Game.draw(ctx); drawAim(ctx); }
  FX.draw(ctx);

  requestAnimationFrame(frame);
}

/* ==================================================================== boot */

function boot() {
  canvas = document.getElementById('stage');
  ctx = canvas.getContext('2d');

  document.addEventListener('error', function (e) {
    if (e.target && e.target.tagName === 'IMG') e.target.style.visibility = 'hidden';
  }, true);

  Save.load();
  if (!Save.data.badges) Save.data.badges = {};
  if (document.fonts && document.fonts.load) {
    document.fonts.load('700 12px "Roboto Mono"');
    document.fonts.load('700 16px Fredoka');
  }

  resizeCanvas();
  bindInput();
  UI.bind();
  UI.applySettings();
  requestAnimationFrame(frame);

  var bar = document.getElementById('boot-fill');
  var note = document.getElementById('boot-note');
  var go = document.getElementById('btn-boot');

  Assets.loadAll(function (p) { bar.style.width = Math.round(p * 100) + '%'; })
    .then(function (sum) {
      bar.style.width = '100%';
      note.textContent = sum.art > 0 ? 'INSTRUMENTS ONLINE - ' + sum.art + ' CUSTOM ART FILES' : 'INSTRUMENTS ONLINE';
      go.style.display = '';
      UI.refreshHangar();
      Scene.build(VW, VH);
    });

  var onResize = function () { resizeCanvas(); };
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', function () { setTimeout(onResize, 250); });
  if (window.visualViewport) window.visualViewport.addEventListener('resize', onResize);
  if (window.ResizeObserver) new ResizeObserver(function () { UI.refit(); }).observe(document.getElementById('board-slot'));
  document.addEventListener('visibilitychange', function () { if (document.hidden) _last = 0; else Sound.resume(); });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
