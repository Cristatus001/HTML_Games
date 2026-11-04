/* Twin-Seal Tomb: saved progress (localStorage, with an in-memory fallback). */
(function () {
  'use strict';
  var KEY = 'twinSealTomb.v1';
  var mem = null;

  function blank() {
    return { v: 1, unlocked: 1, rooms: {}, prefs: { music: true, sfx: true }, lastRoom: 0 };
  }
  function read() {
    if (mem) return mem;
    var s = blank();
    try {
      var raw = window.localStorage.getItem(KEY);
      if (raw) {
        var p = JSON.parse(raw);
        if (p && p.v === 1) {
          s.unlocked = Math.max(1, Math.min(5, p.unlocked | 0 || 1));
          s.rooms = p.rooms && typeof p.rooms === 'object' ? p.rooms : {};
          s.lastRoom = p.lastRoom | 0;
          if (p.prefs) { s.prefs.music = p.prefs.music !== false; s.prefs.sfx = p.prefs.sfx !== false; }
        }
      }
    } catch (e) { /* private mode or blocked storage: play on without saving */ }
    mem = s;
    return s;
  }
  function write() {
    try { window.localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) { /* ignore */ }
  }

  var api = {
    get: read,
    room: function (n) { var r = read().rooms[n]; return r || { best: 0, stars: 0, cleared: false }; },
    saveRoom: function (n, coins, stars) {
      var s = read(), r = s.rooms[n] || { best: 0, stars: 0, cleared: false };
      var newBest = coins > r.best;
      r.best = Math.max(r.best, coins); r.stars = Math.max(r.stars, stars); r.cleared = true;
      s.rooms[n] = r; s.lastRoom = n;
      if (n < 5) s.unlocked = Math.max(s.unlocked, n + 1);
      write();
      return newBest;
    },
    vault: function () {
      var s = read(), t = 0;
      for (var k in s.rooms) if (s.rooms.hasOwnProperty(k)) t += s.rooms[k].best | 0;
      return t;
    },
    starsTotal: function () {
      var s = read(), t = 0;
      for (var k in s.rooms) if (s.rooms.hasOwnProperty(k)) t += s.rooms[k].stars | 0;
      return t;
    },
    setPref: function (k, v) { read().prefs[k] = !!v; write(); },
    resetProgress: function () {
      var prefs = read().prefs;
      mem = blank(); mem.prefs = { music: prefs.music, sfx: prefs.sfx };
      write();
    }
  };
  window.TST.store = api;
})();
