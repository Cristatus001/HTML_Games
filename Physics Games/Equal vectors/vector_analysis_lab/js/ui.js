/* ==========================================================================
   ui.js — screens, modals, case select, settings and saved progress.
   ========================================================================== */

/* ------------------------------------------------------------------ storage */
var Progress = (function () {
  'use strict';
  var PKEY = 'val_progress_v1';
  var SKEY = 'val_settings_v1';

  function blank() {
    return { done: [], verdict: [], unlocked: 1, last: 0 };
  }

  var data = blank();
  var settings = { music: true, sfx: true };

  function safeParse(raw, fallback) {
    if (!raw) return fallback;
    try {
      var o = JSON.parse(raw);
      return (o && typeof o === 'object') ? o : fallback;
    } catch (e) { return fallback; }
  }

  function store(op, key, val) {
    try {
      if (op === 'get') return window.localStorage.getItem(key);
      if (op === 'set') window.localStorage.setItem(key, val);
      if (op === 'del') window.localStorage.removeItem(key);
    } catch (e) { /* private mode / disabled storage: run without saving */ }
    return null;
  }

  function load() {
    var n = (typeof LEVELS !== 'undefined' ? LEVELS.length : 10);
    var d = safeParse(store('get', PKEY), null);
    data = blank();
    if (d) {
      data.done = Array.isArray(d.done) ? d.done.slice(0, n) : [];
      data.verdict = Array.isArray(d.verdict) ? d.verdict.slice(0, n) : [];
      data.unlocked = Math.max(1, Math.min(n, parseInt(d.unlocked, 10) || 1));
      data.last = Math.max(0, Math.min(n - 1, parseInt(d.last, 10) || 0));
    }
    var s = safeParse(store('get', SKEY), null);
    if (s) {
      settings.music = s.music !== false;
      settings.sfx = s.sfx !== false;
    }
  }

  function save() { store('set', PKEY, JSON.stringify(data)); }
  function saveSettings() { store('set', SKEY, JSON.stringify(settings)); }

  function complete(idx, pass) {
    var n = LEVELS.length;
    var fresh = !data.done[idx];
    data.done[idx] = true;
    data.verdict[idx] = pass ? 'eq' : 'ne';
    data.last = idx;
    if (idx + 2 > data.unlocked) data.unlocked = Math.min(n, idx + 2);
    save();
    if (fresh && idx + 1 < n) Snd.sfx.unlock();
  }

  function count() {
    var c = 0;
    for (var i = 0; i < LEVELS.length; i++) if (data.done[i]) c++;
    return c;
  }
  function tally() {
    var eq = 0, ne = 0;
    for (var i = 0; i < LEVELS.length; i++) {
      if (data.verdict[i] === 'eq') eq++;
      else if (data.verdict[i] === 'ne') ne++;
    }
    return { eq: eq, ne: ne, total: eq + ne };
  }
  function isDone(i) { return !!data.done[i]; }
  function isUnlocked(i) { return i < data.unlocked; }
  function verdictOf(i) { return data.verdict[i] || null; }
  function allDone() { return count() >= LEVELS.length; }

  function resumeIndex() {
    for (var i = 0; i < LEVELS.length; i++) if (!data.done[i]) return i;
    return 0;
  }

  function reset() {
    data = blank();
    store('del', PKEY);
    save();
  }

  return {
    load: load, complete: complete, count: count, tally: tally,
    isDone: isDone, isUnlocked: isUnlocked, verdictOf: verdictOf,
    allDone: allDone, resumeIndex: resumeIndex, reset: reset,
    settings: settings, saveSettings: saveSettings
  };
})();

/* ------------------------------------------------------------------ UI */
var UI = (function () {
  'use strict';

  var EMO = 'assets/images/ui/emoji/';

  function $(id) { return document.getElementById(id); }

  /* ---------- screens ---------- */
  function show(id) {
    var list = document.querySelectorAll('.screen');
    for (var i = 0; i < list.length; i++) list[i].classList.remove('on');
    var el = $(id);
    if (el) el.classList.add('on');
    Game.setMode(id === 'game' ? 'play' : (id === 'outro' ? 'fx' : 'off'));
  }

  function openModal(id) {
    var m = $(id);
    if (m) m.classList.add('on');
    Snd.sfx.click();
  }
  function closeModal(id) {
    var m = $(id);
    if (m) m.classList.remove('on');
    Snd.sfx.click();
  }

  /* ---------- menu ---------- */
  function refreshMenu() {
    var done = Progress.count(), n = LEVELS.length;
    $('menu-progress').textContent = done + ' / ' + n;
    $('menu-meter').style.width = (done / n * 100).toFixed(1) + '%';
    var lbl = $('start-label');
    if (done === 0) lbl.textContent = 'Begin Study';
    else if (Progress.allDone()) lbl.textContent = 'Study Again';
    else lbl.textContent = 'Resume Study';
  }

  /* ---------- HUD cores ---------- */
  function refreshHudCores() {
    var wrap = $('hud-cores');
    if (!wrap) return;
    var n = LEVELS.length;
    if (wrap.childNodes.length !== n) {
      wrap.innerHTML = '';
      for (var i = 0; i < n; i++) {
        var d = document.createElement('span');
        d.className = 'core';
        wrap.appendChild(d);
      }
    }
    for (var j = 0; j < n; j++) {
      var el = wrap.childNodes[j];
      var on = Progress.isDone(j);
      el.className = 'core' + (on ? ' on' : '');
      el.style.backgroundImage = 'url(' + EMO + (on ? 'core_on' : 'core_off') + '.png)';
    }
  }

  /* ---------- case select ---------- */
  function buildCaseGrid() {
    var grid = $('case-grid');
    grid.innerHTML = '';
    for (var i = 0; i < LEVELS.length; i++) grid.appendChild(caseTile(i));
    $('sel-count').textContent = Progress.count() + ' / ' + LEVELS.length;
  }

  function caseTile(i) {
    var lvl = LEVELS[i];
    var unlocked = Progress.isUnlocked(i);
    var done = Progress.isDone(i);

    var b = document.createElement('button');
    b.className = 'case-tile' + (done ? ' done' : '') + (unlocked ? '' : ' locked');
    b.type = 'button';

    var top = document.createElement('div');
    top.className = 'tile-top';
    var num = document.createElement('span');
    num.className = 'tile-num';
    num.textContent = 'CASE ' + (i + 1 < 10 ? '0' : '') + (i + 1);
    top.appendChild(num);

    var flag = document.createElement('img');
    flag.className = 'tile-flag' + (done ? ' core' : '');
    flag.alt = '';
    flag.src = EMO + (!unlocked ? 'lock.png' : done ? 'core_on.png' : 'core_off.png');
    top.appendChild(flag);
    b.appendChild(top);

    var art = document.createElement('div');
    art.className = 'tile-art';
    var img = Assets.get(lvl.icon);
    if (img) art.style.backgroundImage = 'url(' + img.src + ')';
    else art.className += ' fb';
    b.appendChild(art);

    var name = document.createElement('div');
    name.className = 'tile-name';
    name.textContent = unlocked ? lvl.title : 'Locked';
    b.appendChild(name);

    if (unlocked) {
      b.addEventListener('click', function () {
        Snd.sfx.click();
        startCase(i);
      });
    }
    return b;
  }

  /* ---------- flow ---------- */
  function startCase(i) {
    show('game');
    Game.start(i);
    refreshHudCores();
  }

  function startStudy() {
    Snd.sfx.click();
    startCase(Progress.allDone() ? 0 : Progress.resumeIndex());
  }

  function showOutro() {
    var t = Progress.tally();
    $('stat-eq').textContent = t.eq;
    $('stat-ne').textContent = t.ne;
    $('stat-tot').textContent = t.total;
    show('outro');
    Game.confetti();
    Snd.sfx.seal();
  }

  function toMenu() {
    Snd.sfx.click();
    refreshMenu();
    show('menu');
  }

  /* ---------- settings ---------- */
  function syncSettingsUi() {
    var m = Progress.settings.music, s = Progress.settings.sfx;
    $('sw-music').classList.toggle('on', m);
    $('sw-sfx').classList.toggle('on', s);
    $('ico-music').src = EMO + (m ? 'music_on.png' : 'music_off.png');
    $('ico-sfx').src = EMO + (s ? 'sfx_on.png' : 'sfx_off.png');
  }

  function bind() {
    /* menu */
    $('btn-start').addEventListener('click', startStudy);
    $('btn-select').addEventListener('click', function () {
      Snd.sfx.click();
      buildCaseGrid();
      show('select');
    });
    $('btn-howto').addEventListener('click', function () { openModal('m-howto'); });
    $('btn-settings').addEventListener('click', function () { syncSettingsUi(); openModal('m-settings'); });

    /* select */
    $('btn-sel-back').addEventListener('click', toMenu);

    /* game hud */
    $('btn-hud-menu').addEventListener('click', toMenu);
    $('btn-hud-set').addEventListener('click', function () { syncSettingsUi(); openModal('m-settings'); });
    $('btn-next').addEventListener('click', function () { Game.next(); });
    $('btn-re').addEventListener('click', function () { Game.retry(); });

    /* outro */
    $('btn-learn').addEventListener('click', function () { openModal('m-learn'); });
    $('btn-restart').addEventListener('click', function () { Snd.sfx.click(); startCase(0); });
    $('btn-out-menu').addEventListener('click', toMenu);

    /* modal closers */
    var closers = document.querySelectorAll('[data-close]');
    for (var i = 0; i < closers.length; i++) {
      (function (el) {
        el.addEventListener('click', function () { closeModal(el.getAttribute('data-close')); });
      })(closers[i]);
    }
    var modals = document.querySelectorAll('.modal');
    for (var j = 0; j < modals.length; j++) {
      (function (m) {
        m.addEventListener('pointerdown', function (e) {
          if (e.target === m) closeModal(m.id);
        });
      })(modals[j]);
    }
    window.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        var open = document.querySelector('.modal.on');
        if (open) closeModal(open.id);
      }
    });

    /* settings toggles */
    $('sw-music').addEventListener('click', function () {
      Progress.settings.music = !Progress.settings.music;
      Progress.saveSettings();
      Snd.setMusic(Progress.settings.music);
      Snd.sfx.click();
      syncSettingsUi();
    });
    $('sw-sfx').addEventListener('click', function () {
      Progress.settings.sfx = !Progress.settings.sfx;
      Progress.saveSettings();
      Snd.setSfx(Progress.settings.sfx);
      Snd.sfx.click();
      syncSettingsUi();
    });
    $('btn-reset').addEventListener('click', function () {
      Progress.reset();
      Snd.sfx.fail();
      refreshMenu();
      refreshHudCores();
      buildCaseGrid();
    });
  }

  return {
    bind: bind, show: show, showOutro: showOutro, toMenu: toMenu,
    refreshMenu: refreshMenu, refreshHudCores: refreshHudCores,
    buildCaseGrid: buildCaseGrid, syncSettingsUi: syncSettingsUi,
    startCase: startCase
  };
})();
