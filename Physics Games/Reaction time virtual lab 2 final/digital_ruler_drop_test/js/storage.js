/* ============================================================
   storage.js — persisted settings, stage grades and trial data.

   localStorage can be entirely unavailable (private mode, a locked-down
   WebView, disabled site data). Every read and write is guarded so the
   game degrades to an in-memory session instead of failing.
   ============================================================ */
(function (global) {
  'use strict';

  var KEY = 'drdt.save.v1';

  var DEFAULTS = {
    settings: { music: true, sfx: true, motion: true },
    /* stageId -> { grade:0..3, bestMean:number|null, cleared:bool, plays:int } */
    stages: {},
    /* the open-ended Free Lab session survives a reload */
    freeLab: { trials: [] },
    totals: { trials: 0, bestTime: null }
  };

  var available = (function () {
    try {
      var k = '__drdt_probe__';
      global.localStorage.setItem(k, '1');
      global.localStorage.removeItem(k);
      return true;
    } catch (err) {
      return false;
    }
  })();

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function merge(base, patch) {
    var out = clone(base);
    if (!patch || typeof patch !== 'object') return out;
    Object.keys(base).forEach(function (k) {
      var b = base[k], p = patch[k];
      if (p === undefined || p === null) return;
      if (Object.prototype.toString.call(b) === '[object Object]') {
        out[k] = merge(b, p);
      } else if (Array.isArray(b)) {
        out[k] = Array.isArray(p) ? p : b;
      } else if (b === null) {
        /* A null default means "unset, any primitive allowed" — comparing
           typeof against null yields 'object' and would silently discard a
           stored number, which is how a saved best time used to be lost on
           every reload. */
        if (typeof p === 'number') {
          if (isFinite(p)) out[k] = p;
        } else if (typeof p === 'string' || typeof p === 'boolean') {
          out[k] = p;
        }
      } else if (typeof b === typeof p) {
        out[k] = p;
      }
    });
    /* stages is an open map, so copy unknown keys through */
    if (patch.stages && typeof patch.stages === 'object') {
      Object.keys(patch.stages).forEach(function (id) {
        var s = patch.stages[id];
        if (!s || typeof s !== 'object') return;
        out.stages[id] = {
          grade: clampInt(s.grade, 0, 3),
          bestMean: typeof s.bestMean === 'number' && isFinite(s.bestMean) ? s.bestMean : null,
          cleared: !!s.cleared,
          plays: clampInt(s.plays, 0, 1e6)
        };
      });
    }
    return out;
  }

  function clampInt(v, lo, hi) {
    v = parseInt(v, 10);
    if (!isFinite(v)) return lo;
    return Math.max(lo, Math.min(hi, v));
  }

  var data = clone(DEFAULTS);

  function load() {
    if (!available) return data;
    try {
      var raw = global.localStorage.getItem(KEY);
      if (!raw) return data;
      var parsed = JSON.parse(raw);
      data = merge(DEFAULTS, parsed);
    } catch (err) {
      /* corrupt payload — start clean rather than crash */
      data = clone(DEFAULTS);
    }
    return data;
  }

  var writeTimer = null;
  function save() {
    if (!available) return;
    /* coalesce bursts of writes (a catch touches several fields) */
    if (writeTimer) clearTimeout(writeTimer);
    writeTimer = setTimeout(flush, 120);
  }

  function flush() {
    writeTimer = null;
    if (!available) return;
    try {
      global.localStorage.setItem(KEY, JSON.stringify(data));
    } catch (err) {
      /* quota or a locked store — silently keep the in-memory copy */
    }
  }

  /* ---------- accessors ---------- */

  function settings() { return data.settings; }

  function setSetting(key, val) {
    if (!(key in data.settings)) return;
    data.settings[key] = !!val;
    save();
  }

  function stage(id) {
    if (!data.stages[id]) {
      data.stages[id] = { grade: 0, bestMean: null, cleared: false, plays: 0 };
    }
    return data.stages[id];
  }

  /** Record a stage attempt. Only ever improves a stored record. */
  function recordStage(id, opts) {
    var s = stage(id);
    s.plays += 1;
    if (opts.cleared) s.cleared = true;
    if (typeof opts.grade === 'number' && opts.grade > s.grade) s.grade = opts.grade;
    if (opts.cleared && typeof opts.mean === 'number' && isFinite(opts.mean)) {
      if (s.bestMean === null || opts.mean < s.bestMean) s.bestMean = opts.mean;
    }
    save();
    return s;
  }

  function totalGrades() {
    return Object.keys(data.stages).reduce(function (a, id) {
      return a + (data.stages[id].grade || 0);
    }, 0);
  }

  function clearedCount() {
    return Object.keys(data.stages).reduce(function (a, id) {
      return a + (data.stages[id].cleared ? 1 : 0);
    }, 0);
  }

  /** Global lifetime counters, updated on every recorded trial. */
  function noteTrial(time) {
    data.totals.trials += 1;
    if (typeof time === 'number' && isFinite(time)) {
      if (data.totals.bestTime === null || time < data.totals.bestTime) {
        data.totals.bestTime = time;
      }
    }
    save();
  }

  function totals() { return data.totals; }

  /* ---------- free lab persistence ---------- */
  function freeLabTrials() { return data.freeLab.trials.slice(); }

  function setFreeLabTrials(trials) {
    /* store a compact, validated copy — never the live objects */
    data.freeLab.trials = (trials || []).filter(function (t) {
      return t && isFinite(t.time) && isFinite(t.distance);
    }).map(function (t, i) {
      return { id: i + 1, distance: +t.distance, time: +t.time, ruleCm: +t.ruleCm || 100 };
    });
    save();
  }

  /* ---------- destructive ---------- */
  function wipe() {
    data = clone(DEFAULTS);
    if (available) {
      try { global.localStorage.removeItem(KEY); } catch (err) { /* ignore */ }
    }
  }

  global.Save = {
    available: available,
    load: load,
    flush: flush,
    settings: settings,
    setSetting: setSetting,
    stage: stage,
    recordStage: recordStage,
    totalGrades: totalGrades,
    clearedCount: clearedCount,
    noteTrial: noteTrial,
    totals: totals,
    freeLabTrials: freeLabTrials,
    setFreeLabTrials: setFreeLabTrials,
    wipe: wipe
  };
})(window);
