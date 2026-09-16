/* ==========================================================================
   ui.js - screens, HUD binding and modals.

   Icon state changes always swap an <img> src; no glyph or emoji text is
   ever written into the DOM.
   ========================================================================== */
var UI = (function () {
  'use strict';

  var ICO = 'assets/images/ui/emoji/';
  function icon(name) { return ICO + name + '.png'; }

  var el = {};
  var current = '';            /* active screen id */
  var settingsFrom = 'menu';   /* where the settings modal was opened from */
  var bannerTimer = null;

  /* Cache of last-rendered HUD values, so the per-frame tick does not
     touch the DOM unless something actually changed.                     */
  var cache = { pct: -1, obj: '', name: '', phase: -1, counters: '', ready: null, pips: -1 };

  function $(id) { return document.getElementById(id); }

  function grab() {
    [
      'stage', 'hud', 'hudBadgeImg', 'hudPhaseNum', 'hudPhaseName', 'hudObjective',
      'objectiveWrap', 'meter', 'meterFill', 'meterLabel', 'pips',
      'btnSfx', 'btnMusic', 'btnPause',
      'controls', 'specimenBar', 'btnNext', 'cytoChoices', 'btnAnimal', 'btnPlant',
      'banner',
      'scrBoot', 'bootFill', 'bootNote',
      'scrMenu', 'btnPlay', 'btnPlayLabel', 'btnSelect', 'btnHowTo', 'btnSettings', 'menuFoot',
      'scrSelect', 'stageGrid', 'btnSelectClose', 'btnWipe',
      'scrResult', 'resultCrest', 'resultTitle', 'resultSub', 'resultStars',
      'resultStats', 'btnAgain', 'btnLearn', 'btnResultSelect', 'btnResultMenu',
      'modHowTo', 'modLearn', 'modSettings',
      'setMusic', 'setSfx', 'setMotion', 'setMusicIco', 'setSfxIco', 'setMusicNote',
      'rowMusic', 'rowSfx', 'rowMotion',
      'settingsActions', 'btnResume', 'btnQuit'
    ].forEach(function (id) { el[id] = $(id); });
  }

  /* ====================================================================== */
  /*                          SCREEN TRANSITIONS                            */
  /* ====================================================================== */
  var SCREENS = ['scrBoot', 'scrMenu', 'scrSelect', 'scrResult'];

  function showScreen(id) {
    SCREENS.forEach(function (s) {
      var node = el[s];
      if (!node) { return; }
      if (s === id) {
        node.hidden = false;
        /* Force a reflow so the opacity transition actually runs. */
        void node.offsetWidth;
        node.classList.add('is-on');
      } else if (!node.hidden) {
        node.classList.remove('is-on');
        var target = node;
        window.setTimeout(function () {
          if (!target.classList.contains('is-on')) { target.hidden = true; }
        }, 300);
      }
    });
    current = id;
  }

  function hideAllScreens() {
    SCREENS.forEach(function (s) {
      var node = el[s];
      if (node && !node.hidden) {
        node.classList.remove('is-on');
        window.setTimeout(function () {
          if (!node.classList.contains('is-on')) { node.hidden = true; }
        }, 300);
      }
    });
    current = '';
  }

  function openModal(id) {
    var m = el[id];
    if (!m) { return; }
    m.hidden = false;
    void m.offsetWidth;
    m.classList.add('is-on');
  }

  function closeModal(id) {
    var m = el[id];
    if (!m) { return; }
    m.classList.remove('is-on');
    window.setTimeout(function () {
      if (!m.classList.contains('is-on')) { m.hidden = true; }
    }, 260);
  }

  var MODALS = ['modHowTo', 'modLearn', 'modSettings'];

  function anyModalOpen() {
    return MODALS.some(function (id) { return el[id] && !el[id].hidden; });
  }

  /* Any screen change must dismiss whatever was floating above it, or two
     modals can end up stacked on top of each other. */
  function closeAllModals() {
    MODALS.forEach(function (id) {
      if (el[id] && !el[id].hidden) { closeModal(id); }
    });
  }

  /* ====================================================================== */
  /*                                 BOOT                                   */
  /* ====================================================================== */
  var BOOT_NOTES = [
    'Loading specimen plate...',
    'Focusing objective lens...',
    'Staining chromatin...',
    'Ready'
  ];

  function bootProgress(f) {
    if (el.bootFill) { el.bootFill.style.width = Math.round(f * 100) + '%'; }
    var i = Math.min(BOOT_NOTES.length - 1, Math.floor(f * BOOT_NOTES.length));
    if (el.bootNote && el.bootNote.textContent !== BOOT_NOTES[i]) {
      el.bootNote.textContent = BOOT_NOTES[i];
    }
  }

  function bootDone() {
    if (el.scrBoot) { el.scrBoot.classList.add('is-open'); }
    window.setTimeout(toMenu, 620);
  }

  /* ====================================================================== */
  /*                                 MENU                                   */
  /* ====================================================================== */
  function toMenu() {
    closeAllModals();
    Game.setPaused(false);
    Game.toAttract();
    el.hud.hidden = true;
    el.controls.hidden = true;
    Game.resize();
    refreshMenu();
    showScreen('scrMenu');
  }

  function refreshMenu() {
    var s = Save.get();
    var total = Save.totalStars();

    if (el.btnPlayLabel) {
      el.btnPlayLabel.textContent = (s.unlocked > 1) ? 'RESUME DIVISION' : 'BEGIN DIVISION';
    }

    if (el.menuFoot) {
      var bits = [];
      if (s.bestTime) { bits.push('Best full run <b>' + fmtTime(s.bestTime) + '</b>'); }
      bits.push('Stars <b>' + total + '/15</b>');
      if (s.runs) { bits.push('Runs <b>' + s.runs + '</b>'); }
      el.menuFoot.innerHTML = bits.join(' &middot; ');
    }
  }

  function fmtTime(sec) {
    var s = Math.max(0, Math.round(sec));
    var m = Math.floor(s / 60);
    var r = s % 60;
    return m + ':' + (r < 10 ? '0' : '') + r;
  }

  /* ====================================================================== */
  /*                             STAGE SELECT                               */
  /* ====================================================================== */
  function buildStageGrid() {
    var save = Save.get();
    var grid = el.stageGrid;
    if (!grid) { return; }

    grid.innerHTML = '';

    PHASES.forEach(function (ph, i) {
      var stageNo = i + 1;
      var locked = stageNo > save.unlocked;
      var stars = save.stars[i] || 0;

      var card = document.createElement('button');
      card.type = 'button';
      card.className = 'stage-card' + (locked ? ' is-locked' : '');
      card.disabled = locked;
      if (locked) { card.setAttribute('aria-disabled', 'true'); }

      var medal = document.createElement('span');
      medal.className = 'stage-medal';

      var art = document.createElement('img');
      art.src = icon(locked ? 'lock' : ph.icon);
      art.alt = '';
      art.draggable = false;
      if (locked) { art.className = 'medal-lock'; }
      medal.appendChild(art);

      var copy = document.createElement('div');
      copy.className = 'stage-copy';

      var kick = document.createElement('span');
      kick.className = 'sc-kicker';
      kick.textContent = 'STAGE ' + stageNo;

      var h3 = document.createElement('h3');
      h3.textContent = ph.name;

      var desc = document.createElement('p');
      desc.textContent = locked ? 'Clear stage ' + i + ' to unlock.' : ph.blurb;

      copy.appendChild(kick);
      copy.appendChild(h3);
      copy.appendChild(desc);

      if (!locked) {
        var row = document.createElement('div');
        row.className = 'stage-stars';
        for (var k = 0; k < 3; k++) {
          var sImg = document.createElement('img');
          sImg.src = icon(k < stars ? 'star' : 'star_empty');
          sImg.alt = '';
          sImg.draggable = false;
          if (k < stars) { sImg.className = 'lit'; }
          row.appendChild(sImg);
        }
        copy.appendChild(row);
      }

      card.appendChild(medal);
      card.appendChild(copy);

      if (!locked) {
        card.addEventListener('click', function () {
          Sound.play('click');
          beginRun(stageNo);
        });
      } else {
        card.addEventListener('click', function () { Sound.play('deny'); });
      }

      grid.appendChild(card);
    });

    Assets.guardDomImages(grid);
  }

  function toSelect() {
    closeAllModals();
    Game.setPaused(false);
    buildStageGrid();
    showScreen('scrSelect');
  }

  /* ====================================================================== */
  /*                                 PLAY                                   */
  /* ====================================================================== */
  function beginRun(stage) {
    closeAllModals();
    Game.setPaused(false);
    hideAllScreens();
    el.hud.hidden = false;
    el.controls.hidden = false;
    /* The HUD changes the free area, so re-measure before the cell is built. */
    Game.resize();
    Game.startRun(stage);
    resetCache();
    refreshHud();
  }

  function resetCache() {
    cache = { pct: -1, obj: '', name: '', phase: -1, counters: '', ready: null, pips: -1 };
  }

  function onStageEnter(phaseIdx, starsEarned) {
    var ph = PHASES[phaseIdx];

    el.btnNext.hidden = true;
    el.btnNext.classList.remove('pulse');
    el.cytoChoices.hidden = (phaseIdx !== 4);

    if (phaseIdx === 4) {
      el.btnAnimal.disabled = false;
      el.btnPlant.disabled = false;
    }

    resetCache();
    refreshHud();

    banner('STAGE ' + ph.n + (starsEarned ? ' - CLEARED' : ''), ph.name);
  }

  function onStageReady() {
    el.btnNext.hidden = false;
    el.btnNext.classList.add('pulse');
  }

  function onCellTypeChosen() {
    el.cytoChoices.hidden = true;
    resetCache();
    refreshHud();
  }

  function banner(kicker, title) {
    if (!el.banner) { return; }
    el.banner.innerHTML = '';

    var card = document.createElement('div');
    card.className = 'banner-card';

    var small = document.createElement('small');
    small.textContent = kicker;
    var strong = document.createElement('strong');
    strong.textContent = title;

    card.appendChild(small);
    card.appendChild(strong);
    el.banner.appendChild(card);

    if (bannerTimer) { window.clearTimeout(bannerTimer); }
    bannerTimer = window.setTimeout(function () {
      if (el.banner) { el.banner.innerHTML = ''; }
    }, 1500);
  }

  /* ====================================================================== */
  /*                                  HUD                                   */
  /* ====================================================================== */
  function refreshHud() {
    if (Game.getMode() !== 'play') { return; }

    var phase = Game.getPhase();
    var ph = PHASES[phase];

    if (cache.phase !== phase) {
      cache.phase = phase;
      el.hudPhaseNum.textContent = String(ph.n);
      el.hudPhaseName.textContent = ph.name;
      el.hudBadgeImg.src = icon(ph.icon);
      cache.name = ph.name;
    }

    /* Stage pips. */
    if (cache.pips !== phase) {
      cache.pips = phase;
      el.pips.innerHTML = '';
      for (var i = 0; i < 5; i++) {
        var li = document.createElement('li');
        if (i < phase) { li.className = 'is-done'; }
        else if (i === phase) { li.className = 'is-now'; }
        el.pips.appendChild(li);
      }
    }

    var obj = Game.objectiveText();
    if (obj !== cache.obj) {
      cache.obj = obj;
      el.hudObjective.textContent = obj;
      el.objectiveWrap.classList.remove('is-swap');
      void el.objectiveWrap.offsetWidth;
      el.objectiveWrap.classList.add('is-swap');
    }

    updateMeter();
    updateCounters();
  }

  function updateMeter() {
    var pct = Math.round(Math.max(0, Math.min(1, Game.progress())) * 100);
    if (pct === cache.pct) { return; }
    cache.pct = pct;

    el.meterFill.style.width = pct + '%';
    el.meterLabel.textContent = pct + '%';
    el.meter.setAttribute('aria-valuenow', String(pct));
    if (pct >= 100) { el.meter.classList.add('is-full'); }
    else { el.meter.classList.remove('is-full'); }
  }

  function updateCounters() {
    var list = Game.counters();
    var key = JSON.stringify(list);
    if (key === cache.counters) { return; }
    cache.counters = key;

    el.specimenBar.innerHTML = '';
    list.forEach(function (c) {
      var box = document.createElement('div');
      box.className = 'spec t-' + c.tone;

      var img = document.createElement('img');
      img.src = icon(c.icon);
      img.alt = '';
      img.draggable = false;

      var b = document.createElement('b');
      b.textContent = c.value;
      var sp = document.createElement('span');
      sp.textContent = c.label;

      /* Mark a met target so it lights up. */
      if (/^(\d+)\/\1$/.test(c.value) || c.value === '100%') {
        box.className += ' is-met';
      }

      box.appendChild(img);
      box.appendChild(b);
      box.appendChild(sp);
      el.specimenBar.appendChild(box);
    });

    Assets.guardDomImages(el.specimenBar);
  }

  /* Called once per animation frame; the caches keep this cheap. */
  function tick() {
    if (Game.getMode() !== 'play' || Game.isPaused()) { return; }
    updateMeter();
    updateCounters();

    var obj = Game.objectiveText();
    if (obj !== cache.obj) { refreshHud(); }

    var ready = Game.isReady();
    if (ready !== cache.ready) {
      cache.ready = ready;
      if (ready) { onStageReady(); }
    }
  }

  /* ====================================================================== */
  /*                                RESULT                                  */
  /* ====================================================================== */
  function onRunComplete(info) {
    closeAllModals();
    el.hud.hidden = true;
    el.controls.hidden = true;
    el.btnNext.hidden = true;
    el.cytoChoices.hidden = true;

    Game.toAttract();
    Game.resize();

    var maxStars = info.stagesPlayed * 3;
    var earned = info.totalStars;

    el.resultTitle.textContent = info.fullRun ? 'MITOSIS COMPLETE' : 'STAGE CLEARED';
    el.resultSub.textContent = info.fullRun
      ? 'One cell became two genetically identical daughter cells.'
      : 'Nice work. Run all five stages in order for a full-cycle record.';

    el.resultCrest.src = icon(earned >= maxStars ? 'trophy' : (earned >= maxStars * 0.6 ? 'star' : 'dna'));

    /* Stars, revealed one at a time. */
    el.resultStars.innerHTML = '';
    var shown = Math.max(1, Math.min(3, Math.round(earned / Math.max(1, info.stagesPlayed))));
    for (var i = 0; i < 3; i++) {
      var img = document.createElement('img');
      img.src = icon(i < shown ? 'star' : 'star_empty');
      img.alt = '';
      img.draggable = false;
      el.resultStars.appendChild(img);
      if (i < shown) {
        (function (node, delay) {
          window.setTimeout(function () {
            node.classList.add('lit');
            Sound.play('tap');
          }, 280 + delay * 240);
        }(img, i));
      }
    }

    /* Stats. */
    var stats = [
      ['TIME', fmtTime(info.seconds)],
      ['STARS', earned + '/' + maxStars],
      ['WASTED TAPS', String(info.misses)],
      ['CELL TYPE', info.cellType === 'PLANT' ? 'PLANT' : 'ANIMAL']
    ];
    var best = Save.get().bestTime;
    if (info.fullRun && best) { stats.push(['BEST RUN', fmtTime(best)]); }

    el.resultStats.innerHTML = '';
    stats.forEach(function (pair) {
      var wrap = document.createElement('div');
      var dt = document.createElement('dt');
      dt.textContent = pair[0];
      var dd = document.createElement('dd');
      dd.textContent = pair[1];
      wrap.appendChild(dt);
      wrap.appendChild(dd);
      el.resultStats.appendChild(wrap);
    });

    showScreen('scrResult');
  }

  /* ====================================================================== */
  /*                          SETTINGS + TOGGLES                            */
  /* ====================================================================== */

  /* Every toggle swaps the row icon's src - never a text glyph. */
  function paintToggle(btnKey, rowKey, on, icoKey, onIcon, offIcon) {
    var btn = el[btnKey];
    if (btn) {
      if (on) { btn.classList.add('is-on'); } else { btn.classList.remove('is-on'); }
      btn.setAttribute('aria-checked', on ? 'true' : 'false');
    }
    var row = el[rowKey];
    if (row) {
      if (on) { row.classList.remove('is-off'); } else { row.classList.add('is-off'); }
    }
    if (icoKey && el[icoKey] && onIcon) {
      el[icoKey].src = icon(on ? onIcon : offIcon);
    }
  }

  function paintHudTool(btnKey, on, onIcon, offIcon) {
    var btn = el[btnKey];
    if (!btn) { return; }
    var img = btn.querySelector('img');
    if (img) { img.src = icon(on ? onIcon : offIcon); }
    if (on) { btn.classList.remove('is-off'); } else { btn.classList.add('is-off'); }
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  }

  function syncAudioUi() {
    var s = Save.get().settings;

    paintToggle('setMusic', 'rowMusic', s.music, 'setMusicIco', 'music_on', 'music_off');
    paintToggle('setSfx',   'rowSfx',   s.sfx,   'setSfxIco',   'sound_on', 'sound_off');
    paintToggle('setMotion', 'rowMotion', s.motion);

    paintHudTool('btnMusic', s.music, 'music_on', 'music_off');
    paintHudTool('btnSfx',   s.sfx,   'sound_on', 'sound_off');

    if (el.setMusicNote) {
      el.setMusicNote.textContent = Sound.usesFile()
        ? 'Track from assets/audio'
        : 'Ambient lab pad';
    }
  }

  function setMusic(on) {
    Save.setSetting('music', on);
    Sound.setMusic(on);
    syncAudioUi();
  }

  function setSfx(on) {
    Save.setSetting('sfx', on);
    Sound.setSfx(on);
    syncAudioUi();
    if (on) { Sound.play('click'); }
  }

  function setMotion(on) {
    Save.setSetting('motion', on);
    Backdrop.setEnabled(on);
    syncAudioUi();
  }

  function openSettings(from) {
    settingsFrom = from || 'menu';
    var inGame = (settingsFrom === 'game');

    if (el.settingsActions) { el.settingsActions.hidden = !inGame; }
    if (inGame) { Game.setPaused(true); }

    syncAudioUi();
    openModal('modSettings');
  }

  function closeSettings() {
    closeModal('modSettings');
    if (settingsFrom === 'game') { Game.setPaused(false); }
  }

  /* ====================================================================== */
  /*                                 WIRING                                 */
  /* ====================================================================== */
  function press(node, fn) {
    if (!node) { return; }
    node.addEventListener('click', function (e) {
      e.preventDefault();
      Sound.unlock();
      fn(e);
    }, false);
  }

  function bind() {
    /* --- menu ---------------------------------------------------------- */
    press(el.btnPlay, function () {
      Sound.play('click');
      var s = Save.get();
      beginRun(s.unlocked > 1 ? s.unlocked : 1);
    });
    press(el.btnSelect, function () { Sound.play('click'); toSelect(); });
    press(el.btnHowTo, function () { Sound.play('click'); openModal('modHowTo'); });
    press(el.btnSettings, function () { Sound.play('click'); openSettings('menu'); });

    /* --- stage select --------------------------------------------------- */
    press(el.btnSelectClose, function () { Sound.play('click'); toMenu(); });
    press(el.btnWipe, function () {
      Sound.play('deny');
      Save.wipe();
      buildStageGrid();
      refreshMenu();
    });

    /* --- in game -------------------------------------------------------- */
    press(el.btnNext, function () { Sound.play('click'); Game.advance(); });
    press(el.btnAnimal, function () {
      el.btnAnimal.disabled = true; el.btnPlant.disabled = true;
      Game.chooseCellType('ANIMAL');
    });
    press(el.btnPlant, function () {
      el.btnAnimal.disabled = true; el.btnPlant.disabled = true;
      Game.chooseCellType('PLANT');
    });

    press(el.btnSfx,   function () { setSfx(!Save.get().settings.sfx); });
    press(el.btnMusic, function () { setMusic(!Save.get().settings.music); });
    press(el.btnPause, function () { Sound.play('click'); openSettings('game'); });

    /* --- result --------------------------------------------------------- */
    press(el.btnAgain, function () { Sound.play('click'); beginRun(1); });
    press(el.btnLearn, function () { Sound.play('click'); openModal('modLearn'); });
    press(el.btnResultSelect, function () { Sound.play('click'); toSelect(); });
    press(el.btnResultMenu, function () { Sound.play('click'); toMenu(); });

    /* --- settings ------------------------------------------------------- */
    press(el.setMusic,  function () { setMusic(!Save.get().settings.music); });
    press(el.setSfx,    function () { setSfx(!Save.get().settings.sfx); });
    press(el.setMotion, function () { Sound.play('click'); setMotion(!Save.get().settings.motion); });
    press(el.btnResume, function () { Sound.play('click'); closeSettings(); });
    press(el.btnQuit,   function () {
      Sound.play('click');
      closeModal('modSettings');
      Game.setPaused(false);
      toMenu();
    });

    /* --- generic close buttons ------------------------------------------ */
    var closers = document.querySelectorAll('[data-close]');
    for (var i = 0; i < closers.length; i++) {
      (function (node) {
        press(node, function () {
          Sound.play('click');
          var id = node.getAttribute('data-close');
          if (id === 'modSettings') { closeSettings(); } else { closeModal(id); }
        });
      }(closers[i]));
    }

    /* Tapping the dimmed area behind a modal dismisses it. */
    ['modHowTo', 'modLearn', 'modSettings'].forEach(function (id) {
      var m = el[id];
      if (!m) { return; }
      m.addEventListener('pointerdown', function (e) {
        if (e.target === m) {
          Sound.play('click');
          if (id === 'modSettings') { closeSettings(); } else { closeModal(id); }
        }
      }, false);
    });

    /* --- keyboard ------------------------------------------------------- */
    document.addEventListener('keydown', function (e) {
      var k = e.key;

      if (k === 'Escape') {
        e.preventDefault();
        if (anyModalOpen()) {
          if (el.modSettings && !el.modSettings.hidden) { closeSettings(); }
          else { closeModal('modHowTo'); closeModal('modLearn'); }
        } else if (Game.getMode() === 'play') {
          openSettings('game');
        }
        return;
      }

      if (k === 'Enter' || k === ' ' || k === 'Spacebar') {
        if (anyModalOpen()) { return; }
        e.preventDefault();
        Sound.unlock();
        if (Game.getMode() === 'play' && Game.isReady()) { Game.advance(); }
        else if (current === 'scrMenu') { el.btnPlay.click(); }
        else if (current === 'scrResult') { el.btnAgain.click(); }
      }
    }, false);
  }

  /* ====================================================================== */
  function init() {
    grab();
    bind();
    Assets.guardDomImages(document);
    syncAudioUi();
  }

  return {
    init: init,
    bootProgress: bootProgress,
    bootDone: bootDone,
    toMenu: toMenu,
    toSelect: toSelect,
    beginRun: beginRun,
    refreshHud: refreshHud,
    tick: tick,
    onStageEnter: onStageEnter,
    onStageReady: onStageReady,
    onCellTypeChosen: onCellTypeChosen,
    onRunComplete: onRunComplete,
    syncAudioUi: syncAudioUi
  };
}());
