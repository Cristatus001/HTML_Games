/* Saved progress and settings. Everything degrades to in-memory defaults if
   localStorage is unavailable (private mode, or a WebView with storage off).  */
(function (global) {
  'use strict';

  var KEY = 'frog_anatomy_dash.save.v1';

  var defaults = {
    settings: { music: true, sfx: true },
    zones: {}   /* zoneId -> { cleared, bestTimeMs, bestMisses, seals } */
  };

  var state = clone(defaults);
  var canPersist = true;

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function load() {
    try {
      var raw = global.localStorage.getItem(KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          if (parsed.settings && typeof parsed.settings === 'object') {
            state.settings.music = parsed.settings.music !== false;
            state.settings.sfx = parsed.settings.sfx !== false;
          }
          if (parsed.zones && typeof parsed.zones === 'object') state.zones = parsed.zones;
        }
      }
    } catch (err) {
      canPersist = false;
    }
  }

  function save() {
    if (!canPersist) return;
    try {
      global.localStorage.setItem(KEY, JSON.stringify(state));
    } catch (err) {
      canPersist = false;
    }
  }

  function settings() { return state.settings; }

  function setSetting(name, value) {
    state.settings[name] = !!value;
    save();
  }

  function zone(id) {
    return state.zones[id] || { cleared: false, bestTimeMs: 0, bestMisses: -1, seals: 0 };
  }

  /* A zone is open if it is the first one or the previous one is cleared. */
  function isUnlocked(index) {
    if (index <= 0) return true;
    var zones = global.GameData.ZONES;
    return !!zone(zones[index - 1].id).cleared;
  }

  function sealsFor(misses) {
    if (misses <= 0) return 3;
    if (misses <= 2) return 2;
    return 1;
  }

  /* Returns true when this run beat the stored record. */
  function recordClear(id, timeMs, misses) {
    var prev = zone(id);
    var seals = sealsFor(misses);
    var improved = !prev.cleared ||
                   seals > prev.seals ||
                   (seals === prev.seals && timeMs < prev.bestTimeMs);

    state.zones[id] = {
      cleared: true,
      bestTimeMs: improved || !prev.bestTimeMs ? timeMs : prev.bestTimeMs,
      bestMisses: improved || prev.bestMisses < 0 ? misses : prev.bestMisses,
      seals: Math.max(seals, prev.seals || 0)
    };
    save();
    return improved;
  }

  function totalSeals() {
    return global.GameData.ZONES.reduce(function (sum, z) {
      return sum + (zone(z.id).seals || 0);
    }, 0);
  }

  function clearedCount() {
    return global.GameData.ZONES.filter(function (z) { return zone(z.id).cleared; }).length;
  }

  function reset() {
    state = clone(defaults);
    save();
  }

  global.Save = {
    load: load,
    settings: settings,
    setSetting: setSetting,
    zone: zone,
    isUnlocked: isUnlocked,
    recordClear: recordClear,
    sealsFor: sealsFor,
    totalSeals: totalSeals,
    clearedCount: clearedCount,
    reset: reset
  };
})(window);
