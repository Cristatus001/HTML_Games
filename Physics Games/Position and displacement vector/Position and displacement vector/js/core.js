/* ==========================================================================
   core.js - maths helpers, optional image loading, persistent flight log
   ========================================================================== */
'use strict';

var TAU = Math.PI * 2;

var Util = {
  clamp: function (v, a, b) { return v < a ? a : (v > b ? b : v); },
  lerp: function (a, b, t) { return a + (b - a) * t; },
  rand: function (a, b) { return a + Math.random() * (b - a); },
  randInt: function (a, b) { return Math.floor(a + Math.random() * (b - a + 1)); },
  hash: function (n) { var s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); },
  dist: function (p, q) { return Math.hypot(p.x - q.x, p.y - q.y); },
  roundRect: function (ctx, x, y, w, h, r) {
    r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  },
  vec: function (x, y) { return '(' + x + ', ' + y + ')'; }
};

/* --------------------------------------------------------------------------
   Assets - every image is OPTIONAL. Missing files resolve to null and the
   canvas falls back to its built-in vector art. Nothing ever throws.
   -------------------------------------------------------------------------- */

var Assets = {
  _img: {},
  _base: 'assets/images/',

  /* art the game uses if present, otherwise it draws vectors instead */
  optional: [
    'background/sky',
    'background/clouds_far',
    'background/clouds_mid',
    'background/clouds_near',
    'background/cloud_sea',
    'background/horizon',
    'islands/island_idle',
    'islands/island_start',
    'islands/island_target',
    'characters/airship',
    'characters/navigator',
    'effects/spark'
  ],

  /* the shipped icon set, used everywhere in place of emoji characters */
  icons: [
    'airship', 'arrow_right', 'book', 'check', 'close', 'compass', 'cross',
    'flag', 'helm', 'island', 'lantern', 'medal', 'music_off', 'music_on',
    'origin', 'path', 'refresh', 'sfx_off', 'sfx_on', 'star_off', 'star_on',
    'vector', 'crystal', 'spire', 'gate', 'wind', 'fuel', 'coin', 'xp',
    'trophy', 'hangar', 'target', 'storm'
  ],

  icon: function (n) { return this._base + 'ui/emoji/' + n + '.png'; },

  get: function (key) {
    var e = this._img[key];
    return e && e.ok ? e.img : null;
  },

  _loadOne: function (key, src) {
    var self = this;
    return new Promise(function (resolve) {
      var entry = { img: new Image(), ok: false };
      self._img[key] = entry;
      var settled = false;
      var finish = function (ok) {
        if (settled) return;
        settled = true;
        entry.ok = ok && entry.img.naturalWidth > 0;
        resolve(entry.ok);
      };
      entry.img.onload = function () { finish(true); };
      entry.img.onerror = function () { finish(false); };
      setTimeout(function () { finish(entry.img.complete && entry.img.naturalWidth > 0); }, 4000);
      entry.img.src = src;
    });
  },

  loadAll: function (onProgress) {
    var self = this;
    var jobs = [];
    this.icons.forEach(function (n) { jobs.push(['ui/' + n, self.icon(n)]); });
    this.optional.forEach(function (k) { jobs.push([k, self._base + k + '.png']); });
    var done = 0;
    var total = jobs.length;
    return Promise.all(jobs.map(function (j) {
      return self._loadOne(j[0], j[1]).then(function (ok) {
        done++;
        if (onProgress) onProgress(done / total, j[0], ok);
        return ok;
      });
    })).then(function () {
      return {
        icons: self.icons.filter(function (n) { return !!self.get('ui/' + n); }).length,
        art: self.optional.filter(function (k) { return !!self.get(k); }).length
      };
    });
  }
};

/* --------------------------------------------------------------------------
   Save - flight log in localStorage. Safe if storage is blocked.
   -------------------------------------------------------------------------- */

var Save = {
  KEY: 'vector_explorer_sky_realm_v2',
  data: null,

  fresh: function () {
    return {
      xp: 0, coins: 0,
      stars: {},          /* missionId -> best stars */
      bests: {},          /* missionId -> {score,time,eff} */
      badges: {},
      crystalsTotal: 0,
      cleanRuns: 0,
      music: true, sfx: true, seenHowTo: false
    };
  },

  load: function () {
    this.data = this.fresh();
    try {
      var raw = window.localStorage.getItem(this.KEY);
      if (raw) {
        var p = JSON.parse(raw);
        if (p && typeof p === 'object') {
          var d = this.data;
          if (typeof p.xp === 'number') d.xp = p.xp;
          if (typeof p.coins === 'number') d.coins = p.coins;
          if (p.stars && typeof p.stars === 'object') d.stars = p.stars;
          if (p.bests && typeof p.bests === 'object') d.bests = p.bests;
          if (p.badges && typeof p.badges === 'object') d.badges = p.badges;
          if (typeof p.crystalsTotal === 'number') d.crystalsTotal = p.crystalsTotal;
          if (typeof p.cleanRuns === 'number') d.cleanRuns = p.cleanRuns;
          if (typeof p.music === 'boolean') d.music = p.music;
          if (typeof p.sfx === 'boolean') d.sfx = p.sfx;
          if (typeof p.seenHowTo === 'boolean') d.seenHowTo = p.seenHowTo;
        }
      }
    } catch (e) { /* private mode / file:// restrictions - run with defaults */ }
    return this.data;
  },

  flush: function () {
    try { window.localStorage.setItem(this.KEY, JSON.stringify(this.data)); } catch (e) { }
  },

  set: function (k, v) { this.data[k] = v; this.flush(); },
  add: function (k, n) { this.data[k] = (this.data[k] || 0) + n; this.flush(); },

  stars: function (id) { return this.data.stars[id] || 0; },
  record: function (id, s) { if (s > this.stars(id)) { this.data.stars[id] = s; } this.flush(); },
  totalStars: function () { var t = 0, s = this.data.stars; for (var k in s) t += s[k]; return t; },

  best: function (id) { return this.data.bests[id] || { score: 0, time: 0, eff: 0 }; },
  bumpScore: function (id, score, time, eff) {
    var b = this.best(id);
    var n = {
      score: Math.max(b.score, score),
      time: b.time ? Math.min(b.time, time) : time,
      eff: Math.max(b.eff, eff)
    };
    this.data.bests[id] = n;
    this.flush();
  },

  /* a mission unlocks once the one before it has been cleared */
  unlocked: function (id) { return id === 1 || this.stars(id - 1) > 0; },

  wipe: function () {
    var m = this.data.music, s = this.data.sfx;
    this.data = this.fresh();
    this.data.music = m; this.data.sfx = s; this.data.seenHowTo = true;
    this.flush();
  }
};
