/* ==========================================================================
   main.js — boot orchestration and mobile/WebView hardening.
   ========================================================================== */
(function () {
  'use strict';

  var BOOT_LINES = [
    'Calibrating sensors',
    'Loading case files',
    'Priming vector scanner',
    'Deck online'
  ];

  function $(id) { return document.getElementById(id); }

  /* ------------------------------------------------ gesture / zoom lockdown */
  function hardenInput() {
    /* block pinch-zoom, double-tap zoom and rubber-band scrolling in WebViews */
    document.addEventListener('gesturestart', function (e) { e.preventDefault(); }, { passive: false });
    document.addEventListener('gesturechange', function (e) { e.preventDefault(); }, { passive: false });
    document.addEventListener('gestureend', function (e) { e.preventDefault(); }, { passive: false });

    document.addEventListener('touchmove', function (e) {
      if (e.touches && e.touches.length > 1) { e.preventDefault(); return; }
      /* allow scrolling only inside explicitly scrollable regions */
      var n = e.target;
      while (n && n !== document.body) {
        if (n.classList && (n.classList.contains('modal-body') || n.classList.contains('scrolls'))) return;
        n = n.parentNode;
      }
      e.preventDefault();
    }, { passive: false });

    var lastTouch = 0;
    document.addEventListener('touchend', function (e) {
      var t = Date.now();
      if (t - lastTouch < 320) e.preventDefault();
      lastTouch = t;
    }, { passive: false });

    document.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    document.addEventListener('dragstart', function (e) { e.preventDefault(); });
    document.addEventListener('selectstart', function (e) {
      var n = e.target;
      while (n && n !== document.body) {
        if (n.classList && n.classList.contains('modal-body')) return;
        n = n.parentNode;
      }
      e.preventDefault();
    });

    /* keep the layout glued to the visual viewport on mobile keyboards / bars */
    function fit() {
      Game.resize();
      BG.resize();
    }
    window.addEventListener('resize', fit);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', fit);
  }

  /* ------------------------------------------------ first-gesture audio wake */
  function armAudio() {
    function wake() {
      Snd.setMusic(Progress.settings.music);
      Snd.setSfx(Progress.settings.sfx);
      Snd.start();
      window.removeEventListener('pointerdown', wake);
      window.removeEventListener('keydown', wake);
    }
    window.addEventListener('pointerdown', wake);
    window.addEventListener('keydown', wake);
  }

  /* ------------------------------------------------ boot */
  function boot() {
    Progress.load();
    BG.init();
    Game.init();
    UI.bind();
    UI.refreshMenu();
    UI.refreshHudCores();
    UI.syncSettingsUi();
    hardenInput();
    armAudio();

    var fill = $('boot-fill'), status = $('boot-status');
    var line = 0;
    var lineTimer = setInterval(function () {
      line = Math.min(BOOT_LINES.length - 1, line + 1);
      status.textContent = BOOT_LINES[line];
    }, 420);

    var pct = 0;
    function setPct(p) {
      pct = Math.max(pct, p);
      fill.style.width = pct.toFixed(0) + '%';
    }

    Assets.load(
      function (done, total) { setPct(10 + (done / total) * 80); },
      function () {
        Assets.applyBackdrop();
        setPct(100);
        status.textContent = BOOT_LINES[BOOT_LINES.length - 1];
        setTimeout(function () {
          clearInterval(lineTimer);
          UI.refreshMenu();
          UI.show('menu');
        }, 620);
      }
    );
    setPct(10);

    /* safety: never leave the player stuck on the boot screen */
    setTimeout(function () {
      if ($('boot').classList.contains('on')) {
        clearInterval(lineTimer);
        UI.show('menu');
      }
    }, 7000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
