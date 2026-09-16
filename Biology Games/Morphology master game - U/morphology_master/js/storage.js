/* ============================================================
   Saved progress and settings.
   localStorage is unavailable in some WebViews (private mode,
   storage disabled), so every access is guarded and the game
   falls back to an in-memory store for the session.
   ============================================================ */
(function (global) {
  'use strict';

  var KEY = 'morphology_master_v1';

  var DEFAULTS = {
    sfx: true,
    music: true,
    /* levelId -> { done: bool, seals: 1..3, tries: n } */
    levels: {},
    completed: false
  };

  var memory = null;

  function canUse() {
    try {
      var t = '__mm_probe__';
      global.localStorage.setItem(t, '1');
      global.localStorage.removeItem(t);
      return true;
    } catch (e) {
      return false;
    }
  }

  var usable = canUse();

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function read() {
    if (!usable) return memory || (memory = clone(DEFAULTS));
    try {
      var raw = global.localStorage.getItem(KEY);
      if (!raw) return clone(DEFAULTS);
      var parsed = JSON.parse(raw);
      var out = clone(DEFAULTS);
      if (parsed && typeof parsed === 'object') {
        if (typeof parsed.sfx === 'boolean') out.sfx = parsed.sfx;
        if (typeof parsed.music === 'boolean') out.music = parsed.music;
        if (typeof parsed.completed === 'boolean') out.completed = parsed.completed;
        if (parsed.levels && typeof parsed.levels === 'object') out.levels = parsed.levels;
      }
      return out;
    } catch (e) {
      return clone(DEFAULTS);
    }
  }

  function write(state) {
    if (!usable) { memory = clone(state); return; }
    try {
      global.localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      /* Quota or a disabled store: keep playing, just do not persist. */
      usable = false;
      memory = clone(state);
    }
  }

  var Store = {
    state: read(),

    save: function () { write(this.state); },

    get: function (k) { return this.state[k]; },

    set: function (k, v) { this.state[k] = v; this.save(); },

    levelInfo: function (id) {
      return this.state.levels[id] || { done: false, seals: 0, tries: 0 };
    },

    /* A level is open when it is the first, or the one before it is done. */
    isUnlocked: function (id) {
      if (id <= 1) return true;
      return !!this.levelInfo(id - 1).done;
    },

    recordResult: function (id, seals) {
      var prev = this.levelInfo(id);
      this.state.levels[id] = {
        done: true,
        seals: Math.max(prev.seals || 0, seals),
        tries: prev.tries || 0
      };
      this.save();
    },

    bumpTries: function (id) {
      var prev = this.levelInfo(id);
      this.state.levels[id] = {
        done: prev.done || false,
        seals: prev.seals || 0,
        tries: (prev.tries || 0) + 1
      };
      this.save();
    },

    totalSeals: function () {
      var n = 0, k;
      for (k in this.state.levels) {
        if (Object.prototype.hasOwnProperty.call(this.state.levels, k)) {
          n += this.state.levels[k].seals || 0;
        }
      }
      return n;
    },

    reset: function () {
      var keepSfx = this.state.sfx;
      var keepMusic = this.state.music;
      this.state = clone(DEFAULTS);
      this.state.sfx = keepSfx;
      this.state.music = keepMusic;
      this.save();
    }
  };

  global.Store = Store;
})(window);
