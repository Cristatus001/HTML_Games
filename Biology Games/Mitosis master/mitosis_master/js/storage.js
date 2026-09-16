/* ==========================================================================
   storage.js - saved progress and settings.

   localStorage can be unavailable (private mode, WebView with site data
   blocked) and can throw on both read and write, so every access is guarded
   and falls back to an in-memory copy for the session.
   ========================================================================== */
var Save = (function () {
  'use strict';

  var KEY = 'mitosis_master_v1';

  var DEFAULTS = {
    unlocked: 1,          /* highest stage the player may jump to (1..5) */
    stars: [0, 0, 0, 0, 0],
    bestTime: 0,          /* seconds for a full 5-stage run, 0 = none yet */
    runs: 0,
    lastCellType: '',
    settings: { music: true, sfx: true, motion: true }
  };

  var data = clone(DEFAULTS);
  var usable = true;

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function load() {
    var raw = null;
    try {
      raw = window.localStorage.getItem(KEY);
    } catch (e) {
      usable = false;
      return data;
    }
    if (!raw) { return data; }

    try {
      var parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') { merge(parsed); }
    } catch (e) {
      /* Corrupt payload: keep defaults rather than crashing the boot. */
    }
    return data;
  }

  /* Shallow-merge with validation so an old or hand-edited save cannot put
     the game into an impossible state.                                     */
  function merge(p) {
    if (typeof p.unlocked === 'number') {
      data.unlocked = Math.max(1, Math.min(5, Math.floor(p.unlocked)));
    }
    if (Object.prototype.toString.call(p.stars) === '[object Array]') {
      for (var i = 0; i < 5; i++) {
        var v = Math.floor(p.stars[i]);
        data.stars[i] = (v >= 0 && v <= 3) ? v : 0;
      }
    }
    if (typeof p.bestTime === 'number' && p.bestTime >= 0) { data.bestTime = p.bestTime; }
    if (typeof p.runs === 'number' && p.runs >= 0) { data.runs = Math.floor(p.runs); }
    if (typeof p.lastCellType === 'string') { data.lastCellType = p.lastCellType; }
    if (p.settings && typeof p.settings === 'object') {
      data.settings.music  = p.settings.music  !== false;
      data.settings.sfx    = p.settings.sfx    !== false;
      data.settings.motion = p.settings.motion !== false;
    }
  }

  function flush() {
    if (!usable) { return; }
    try {
      window.localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) {
      usable = false;   /* quota or blocked storage; stay in memory only */
    }
  }

  /* --- public surface ---------------------------------------------------- */

  function get() { return data; }

  function unlockThrough(stage) {
    if (stage > data.unlocked) { data.unlocked = Math.min(5, stage); flush(); }
  }

  function recordStars(stage, stars) {
    var i = stage - 1;
    if (i < 0 || i > 4) { return; }
    if (stars > data.stars[i]) { data.stars[i] = stars; flush(); }
  }

  function recordRun(seconds) {
    data.runs++;
    if (!data.bestTime || seconds < data.bestTime) { data.bestTime = seconds; }
    flush();
  }

  function setCellType(t) { data.lastCellType = t; flush(); }

  function setSetting(name, value) {
    if (!(name in data.settings)) { return; }
    data.settings[name] = !!value;
    flush();
  }

  function totalStars() {
    var t = 0;
    for (var i = 0; i < 5; i++) { t += data.stars[i]; }
    return t;
  }

  function wipe() {
    var keepSettings = clone(data.settings);
    data = clone(DEFAULTS);
    data.settings = keepSettings;   /* audio prefs are not "progress" */
    flush();
  }

  return {
    load: load,
    get: get,
    unlockThrough: unlockThrough,
    recordStars: recordStars,
    recordRun: recordRun,
    setCellType: setCellType,
    setSetting: setSetting,
    totalStars: totalStars,
    wipe: wipe
  };
}());
