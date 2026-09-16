/* ===========================================================================
   Persistence. Scores and preferences are kept apart so that "reset scores"
   can wipe one without touching the other. Every access is guarded: private
   browsing modes and file:// origins can throw on localStorage.
   ======================================================================== */
(function (global) {
  'use strict';

  var SCORE_KEY = 'hemichordata_quest.scores.v1';
  var PREF_KEY = 'hemichordata_quest.prefs.v1';

  var DEFAULT_SCORES = {
    bestGrains: 0,
    bestStars: 0,
    bestTimeMs: 0,   /* 0 = never finished */
    runs: 0,
    completions: 0
  };

  var DEFAULT_PREFS = {
    music: true,
    sfx: true,
    reducedMotion: false
  };

  var available = (function () {
    try {
      var k = '__hq_probe__';
      global.localStorage.setItem(k, '1');
      global.localStorage.removeItem(k);
      return true;
    } catch (e) {
      return false;
    }
  })();

  var memory = {};

  function readRaw(key) {
    if (!available) return memory[key] || null;
    try { return global.localStorage.getItem(key); } catch (e) { return null; }
  }

  function writeRaw(key, value) {
    memory[key] = value;
    if (!available) return;
    try { global.localStorage.setItem(key, value); } catch (e) { /* quota / denied */ }
  }

  function load(key, defaults) {
    var out = {}, i, keys = Object.keys(defaults);
    for (i = 0; i < keys.length; i++) out[keys[i]] = defaults[keys[i]];
    var raw = readRaw(key);
    if (!raw) return out;
    var parsed;
    try { parsed = JSON.parse(raw); } catch (e) { return out; }
    if (!parsed || typeof parsed !== 'object') return out;
    for (i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (typeof parsed[k] === typeof defaults[k]) out[k] = parsed[k];
    }
    return out;
  }

  var Store = {
    getScores: function () { return load(SCORE_KEY, DEFAULT_SCORES); },
    getPrefs: function () { return load(PREF_KEY, DEFAULT_PREFS); },

    savePrefs: function (prefs) {
      var cur = Store.getPrefs(), k;
      for (k in prefs) if (Object.prototype.hasOwnProperty.call(prefs, k)) cur[k] = prefs[k];
      writeRaw(PREF_KEY, JSON.stringify(cur));
      return cur;
    },

    countRun: function () {
      var s = Store.getScores();
      s.runs += 1;
      writeRaw(SCORE_KEY, JSON.stringify(s));
      return s;
    },

    /* Records a finished run and reports which records were beaten. */
    recordResult: function (result) {
      var s = Store.getScores();
      var beat = { grains: false, stars: false, time: false };
      s.completions += 1;
      if (result.grains > s.bestGrains) { s.bestGrains = result.grains; beat.grains = true; }
      if (result.stars > s.bestStars) { s.bestStars = result.stars; beat.stars = true; }
      if (result.timeMs > 0 && (s.bestTimeMs === 0 || result.timeMs < s.bestTimeMs)) {
        s.bestTimeMs = result.timeMs; beat.time = true;
      }
      writeRaw(SCORE_KEY, JSON.stringify(s));
      return { scores: s, beat: beat };
    },

    /* Clears records but deliberately keeps audio / motion preferences. */
    resetScores: function () {
      writeRaw(SCORE_KEY, JSON.stringify(DEFAULT_SCORES));
      return Store.getScores();
    },

    isPersistent: function () { return available; }
  };

  global.QuestStore = Store;
})(window);
