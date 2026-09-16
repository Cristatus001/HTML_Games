/* ============================================================
   main.js — boot sequence and every event binding.

   Input is unified: one pointerdown path serves mouse, touch and pen
   identically, with keyboard as a parallel route. Nothing depends on
   hover, and nothing depends on a mouse-only event.
   ============================================================ */
(function (global) {
  'use strict';

  var ICON_WARM = [
    'play', 'retry', 'check', 'timer', 'bolt', 'back', 'next', 'close',
    'help', 'settings', 'brain', 'home', 'trophy', 'warn', 'flask',
    'grade_on', 'grade_off', 'lock', 'unlocked', 'table', 'stats',
    'chart', 'trash', 'medal', 'neuron', 'ruler', 'hand', 'target',
    'gravity', 'spark', 'music_on', 'music_off', 'sfx_on', 'sfx_off'
  ];

  function $(id) { return document.getElementById(id); }

  /* ResizeObservers are kept referenced here so they cannot be collected */
  var observers = [];

  /* ============================================================
     WebView hardening — kill zoom, scroll and selection gestures
     ============================================================ */
  function hardenViewport() {
    /* pinch-zoom and double-tap zoom */
    document.addEventListener('gesturestart', prevent, { passive: false });
    document.addEventListener('gesturechange', prevent, { passive: false });
    document.addEventListener('gestureend', prevent, { passive: false });

    /* multi-touch and rubber-band scrolling, except inside scrollers */
    document.addEventListener('touchmove', function (e) {
      if (e.touches && e.touches.length > 1) { prevent(e); return; }
      if (!e.target || !e.target.closest) return;
      var scroller = e.target.closest(
        '.side-scroll,.stage-scroll,.modal-body,.result-shell,.table-wrap,.ref-table-wrap');
      if (!scroller) prevent(e);
    }, { passive: false });

    /* iOS double-tap zoom */
    var lastTouch = 0;
    document.addEventListener('touchend', function (e) {
      var now = Date.now();
      if (now - lastTouch <= 320) prevent(e);
      lastTouch = now;
    }, { passive: false });

    document.addEventListener('contextmenu', prevent);
    document.addEventListener('selectstart', function (e) {
      if (!e.target || !e.target.closest) { prevent(e); return; }
      /* leave reference tables selectable so numbers can be copied */
      if (!e.target.closest('.modal-body')) prevent(e);
    });
    document.addEventListener('dragstart', prevent);

    /* wheel zoom on desktop (ctrl+wheel) */
    global.addEventListener('wheel', function (e) {
      if (e.ctrlKey) prevent(e);
    }, { passive: false });

    /* keep the address bar collapsed / layout stable in mobile browsers */
    setVH();
    global.addEventListener('resize', setVH);
    global.addEventListener('orientationchange', function () {
      setTimeout(setVH, 260);
    });
  }

  function prevent(e) {
    if (e.cancelable) e.preventDefault();
  }

  function setVH() {
    /* dvh is not universal in older WebViews — expose a px fallback */
    document.documentElement.style.setProperty(
      '--vh', (global.innerHeight * 0.01) + 'px');
  }

  /* ============================================================
     gameplay input
     ============================================================ */

  /** Everything that should count as "catch it now". */
  function benchInput(e) {
    if (global.UI.anyModalOpen()) return;
    if (global.UI.screen() !== 'game') return;

    /* leave the HUD controls tappable so a stage can always be left */
    if (e && e.target && e.target.closest && e.target.closest('.hud')) return;
    /* and the data panel usable while idle */
    if (e && e.target && e.target.closest && e.target.closest('.side-panel')) return;

    var consumed = global.Game.handleInput();
    if (consumed && e && e.cancelable) e.preventDefault();
  }

  function bindGameInput() {
    var screenGame = $('screen-game');
    if (!screenGame) return;

    /* pointerdown covers mouse, touch and pen through one path */
    screenGame.addEventListener('pointerdown', function (e) {
      /* only the primary contact starts a catch */
      if (e.isPrimary === false) return;
      global.Sound.unlock();
      benchInput(e);
    }, { passive: false });

    /* Pointer Events are absent in a few old WebViews — fall back */
    if (!global.PointerEvent) {
      screenGame.addEventListener('touchstart', function (e) {
        global.Sound.unlock();
        benchInput(e);
      }, { passive: false });
      screenGame.addEventListener('mousedown', function (e) {
        global.Sound.unlock();
        benchInput(e);
      });
    }
  }

  function bindKeys() {
    global.addEventListener('keydown', function (e) {
      /* Escape is navigation, never a catch */
      if (e.key === 'Escape') {
        if (global.UI.closeTopModal()) return;
        if (global.UI.screen() === 'game') leaveStage();
        else if (global.UI.screen() === 'stages') go('menu');
        else if (global.UI.screen() === 'result') go('stages');
        return;
      }

      if (global.UI.anyModalOpen()) return;

      /* let Tab reach the focus ring rather than firing a catch */
      if (e.key === 'Tab') return;

      global.Sound.unlock();

      if (global.UI.screen() === 'game') {
        /* Space/Enter on a focused button would double-fire: the catch
           handler consumes them first, and the button is disabled while
           the rule is in flight anyway */
        var consumed = global.Game.handleInput();
        if (consumed) {
          e.preventDefault();
          return;
        }
        /* not mid-trial: Space/Enter advances the rig */
        if ((e.key === ' ' || e.key === 'Enter') &&
            document.activeElement === document.body) {
          e.preventDefault();
          mainAction();
        }
      }
    });
  }

  /* ============================================================
     navigation
     ============================================================ */
  function go(name) {
    global.UI.show(name);
  }

  function startStage(stageDef) {
    /* the screen must be visible BEFORE the rig is measured — measuring a
       display:none element yields a zero box and builds the rule at the
       wrong scale */
    go('game');
    global.Game.begin(stageDef);
    global.UI.refreshGame();
  }

  function leaveStage() {
    var trials = global.Game.trials;
    var st = global.Game.stage;

    /* an in-progress staged session would be discarded, so confirm */
    if (st && !st.isFree && trials.length > 0 && !global.Game.isSessionComplete()) {
      global.UI.confirm(
        'Leave this stage?',
        'You have ' + trials.length + ' recorded trial' +
          (trials.length === 1 ? '' : 's') +
          ' in this session. Leaving now discards them.',
        function () {
          global.Game.abort();
          global.Sound.play('back');
          go('stages');
        });
      return;
    }
    global.Game.abort();
    global.Sound.play('back');
    go(st && st.isFree ? 'menu' : 'stages');
  }

  /** The prompt bar's main button. */
  function mainAction() {
    if (global.Game.inputLocked()) return;

    var s = global.Game.state;
    if (s === 'idle') {
      global.Game.arm();
      return;
    }
    if (s === 'caught') {
      if (global.Game.isSessionComplete()) {
        global.UI.showResult();
      } else {
        global.Game.resetTrial();
        global.UI.refreshGame();
      }
      global.Sound.play('tap');
      return;
    }
    if (s === 'missed' || s === 'falsestart') {
      global.Game.resetTrial();
      global.UI.refreshGame();
      global.Sound.play('tap');
    }
  }

  /* ============================================================
     bindings
     ============================================================ */
  function bindUI() {
    /* --- menu --- */
    on('btn-start', function () { global.Sound.play('tap'); go('stages'); });
    on('btn-freelab', function () {
      global.Sound.play('tap');
      startStage(global.Levels.freeLab);
    });
    on('btn-howto', function () { global.UI.modal('howto', true); });
    on('btn-settings', function () { global.UI.modal('settings', true); });
    on('stages-settings', function () { global.UI.modal('settings', true); });
    on('hud-settings', function () { global.UI.modal('settings', true); });

    /* --- back arrows --- */
    document.querySelectorAll('[data-nav]').forEach(function (b) {
      b.addEventListener('click', function () {
        global.Sound.play('back');
        go(b.getAttribute('data-nav'));
      });
    });

    /* --- stage select (delegated: cards are rebuilt on every visit) --- */
    var grid = $('stage-grid');
    if (grid) {
      grid.addEventListener('click', function (e) {
        var card = e.target.closest ? e.target.closest('.stage-card') : null;
        if (!card) return;
        var id = card.getAttribute('data-stage');
        if (card.classList.contains('is-locked')) {
          global.Sound.play('falseStart');
          global.UI.toast('Clear the previous stage first', 'lock', 'tone-bad');
          return;
        }
        var st = global.Levels.byId(id);
        if (st) { global.Sound.play('tap'); startStage(st); }
      });
    }

    /* --- game --- */
    on('btn-main', mainAction);
    on('hud-back', leaveStage);
    on('hud-data', function () {
      global.Sound.play('tap');
      global.UI.toggleSide();
    });
    on('side-close', function () {
      global.Sound.play('back');
      global.UI.toggleSide(false);
    });
    on('btn-finish', function () {
      global.Sound.play('tap');
      global.Game.abort();
      global.UI.showResult();
    });
    on('btn-reset-data', function () {
      global.UI.confirm(
        'Reset all data?',
        'This clears every recorded trial in the Free Lab data set. Stage grades are not affected.',
        function () {
          global.Game.clearTrials();
          global.Game.resetTrial();
          global.UI.refreshGame();
          global.UI.toast('Trial data cleared', 'trash');
        });
    });

    /* --- result --- */
    on('btn-retry', function () {
      global.Sound.play('tap');
      startStage(global.Game.stage);
    });
    on('btn-next-stage', function () {
      var st = global.Game.stage;
      var nxt = st ? global.Levels.next(st.id) : null;
      global.Sound.play('tap');
      if (nxt) startStage(nxt); else go('stages');
    });
    on('btn-learn', function () { global.UI.modal('learn', true); });
    on('btn-result-menu', function () { global.Sound.play('back'); go('menu'); });

    /* --- modals --- */
    document.querySelectorAll('[data-close-modal]').forEach(function (b) {
      b.addEventListener('click', function () {
        global.Sound.play('back');
        global.UI.closeTopModal();
      });
    });
    /* click the backdrop to dismiss */
    Object.keys({ howto: 1, learn: 1, settings: 1 }).forEach(function (name) {
      var m = $('modal-' + name);
      if (!m) return;
      m.addEventListener('pointerdown', function (e) {
        if (e.target === m) {
          global.Sound.play('back');
          global.UI.modal(name, false);
        }
      });
    });

    on('confirm-yes', function () { global.UI.resolveConfirm(true); });
    on('confirm-no', function () { global.Sound.play('back'); global.UI.resolveConfirm(false); });

    /* --- settings toggles --- */
    on('toggle-music', function () {
      var next = !global.Save.settings().music;
      global.Save.setSetting('music', next);
      global.Sound.setMusic(next);
      global.Sound.play('toggle', next);
      global.UI.syncToggles();
    });
    on('toggle-sfx', function () {
      var next = !global.Save.settings().sfx;
      global.Save.setSetting('sfx', next);
      global.Sound.setSfx(next);
      /* play the confirmation only when turning it back ON */
      if (next) global.Sound.play('toggle', true);
      global.UI.syncToggles();
    });
    on('toggle-motion', function () {
      var next = !global.Save.settings().motion;
      global.Save.setSetting('motion', next);
      global.Backdrop.setMotion(next);
      global.Sound.play('toggle', next);
      global.UI.syncToggles();
    });
    on('btn-wipe-progress', function () {
      global.UI.confirm(
        'Erase saved progress?',
        'Stage grades, records and stored trial data on this device will be removed. This cannot be undone.',
        function () {
          global.Save.wipe();
          /* keep the current audio/motion settings in effect */
          global.Save.setSetting('music', global.Sound.isMusicOn());
          global.Save.setSetting('sfx', global.Sound.isSfxOn());
          global.UI.syncToggles();
          global.UI.refreshMenu();
          global.UI.buildStageGrid();
          global.UI.toast('Progress erased', 'trash', 'tone-bad');
          global.UI.modal('settings', false);
          go('menu');
        });
    });
  }

  function on(id, fn) {
    var b = $(id);
    if (b) b.addEventListener('click', fn);
  }

  /* ============================================================
     game -> ui callbacks
     ============================================================ */
  function bindGameEvents() {
    global.Game.onStateChange = function () {
      global.UI.refreshPrompt();
    };

    global.Game.onTrial = function (trial, quality) {
      global.UI.refreshHud();
      global.UI.refreshData();

      if (quality > 0.78) {
        global.UI.toast('Exceptional — ' + trial.time.toFixed(3) + ' s', 'spark', 'tone-gold');
      }

      var totals = global.Save.totals();
      if (totals.bestTime !== null && trial.time <= totals.bestTime) {
        var st = global.Game.stage;
        /* only shout about a record once there is something to beat */
        if (totals.trials > 1) {
          global.UI.toast('New personal best', 'medal', 'tone-gold');
        }
        if (st) { /* nothing further — the gauge already shows it */ }
      }

      /* staged sessions close themselves out once the track is full */
      if (global.Game.isSessionComplete()) {
        setTimeout(function () {
          if (global.UI.screen() === 'game') global.UI.showResult();
        }, 1250);
      }
    };

    global.Game.onMiss = function () {
      global.UI.refreshHud();
    };

    global.Game.onFalseStart = function () {
      global.UI.refreshHud();
    };
  }

  /* ============================================================
     resize
     ============================================================ */
  function bindResize() {
    var t = null;
    function relayout() {
      global.Game.layout();
      global.Backdrop.resize();
      if (global.UI.screen() === 'game') global.UI.refreshData();
      var lr = global.UI.lastResult();
      if (global.UI.screen() === 'result' && lr) {
        global.UI.renderChart($('result-chart'), global.Game.trials, lr.stage);
      }
    }
    global.addEventListener('resize', function () {
      if (t) clearTimeout(t);
      t = setTimeout(relayout, 150);
    });
    global.addEventListener('orientationchange', function () {
      setTimeout(relayout, 300);
    });

    /* the side panel and rig both depend on the rig's measured box */
    if (global.ResizeObserver) {
      var track = $('rig-track');
      if (track) {
        observers.push(new global.ResizeObserver(function () {
          global.Game.layout();
          global.Backdrop.resize();
        }));
        observers[observers.length - 1].observe(track);
      }
      var chart = $('chart-box');
      if (chart) {
        observers.push(new global.ResizeObserver(function () {
          if (global.UI.screen() === 'game') {
            global.UI.renderChart(chart, global.Game.trials, global.Game.stage);
          }
        }));
        observers[observers.length - 1].observe(chart);
      }
    }
  }

  /* ============================================================
     boot
     ============================================================ */
  function boot() {
    hardenViewport();

    global.Save.load();
    global.UI.init();
    global.Game.init();
    global.Backdrop.init();

    var s = global.Save.settings();
    global.Sound.setMusic(s.music);
    global.Sound.setSfx(s.sfx);
    global.Backdrop.setMotion(s.motion);
    global.UI.syncToggles();

    global.Assets.preloadIcons(ICON_WARM);

    bindUI();
    bindGameInput();
    bindKeys();
    bindGameEvents();
    bindResize();

    /* probe optional drop-in art while the boot bar runs; a missing
       assets/images tree simply leaves the built-in art in place */
    global.Assets.loadOptional().catch(function () { /* never fatal */ });

    global.UI.runBoot(function () {
      global.UI.refreshMenu();
    });

    /* the very first gesture anywhere unlocks the audio context */
    var unlockOnce = function () {
      global.Sound.unlock();
      document.removeEventListener('pointerdown', unlockOnce);
      document.removeEventListener('keydown', unlockOnce);
    };
    document.addEventListener('pointerdown', unlockOnce);
    document.addEventListener('keydown', unlockOnce);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window);
