/* ==========================================================================
   main.js - boot sequence and WebView hardening.
   ========================================================================== */
(function () {
  'use strict';

  /* -------------------------------------------------- gesture lockdown --- */
  /* A WebView that auto-loads index.html must not scroll, rubber-band,
     pinch-zoom, double-tap-zoom, long-press-select or show a context menu. */
  function lockGestures() {
    document.addEventListener('contextmenu', function (e) { e.preventDefault(); }, false);
    document.addEventListener('dragstart', function (e) { e.preventDefault(); }, false);
    document.addEventListener('selectstart', function (e) {
      /* Allow selection inside scrollable prose so the reference sheet can
         still be read comfortably on desktop. */
      if (e.target && e.target.closest && e.target.closest('.dossier-body, .glass-body')) { return; }
      e.preventDefault();
    }, false);

    /* iOS legacy pinch gestures. */
    ['gesturestart', 'gesturechange', 'gestureend'].forEach(function (n) {
      document.addEventListener(n, function (e) { e.preventDefault(); }, false);
    });

    /* Multi-touch and any touch outside a scrollable pane. */
    document.addEventListener('touchstart', function (e) {
      if (e.touches.length > 1) { e.preventDefault(); }
    }, { passive: false });

    document.addEventListener('touchmove', function (e) {
      if (e.touches.length > 1) { e.preventDefault(); return; }
      var t = e.target;
      if (t && t.closest && t.closest('.dossier-body, .glass-body, .stage-grid, .sheet-result')) {
        return;   /* let these panes scroll */
      }
      e.preventDefault();
    }, { passive: false });

    /* Double-tap zoom on older WebKit. */
    var lastTouch = 0;
    document.addEventListener('touchend', function (e) {
      var now = Date.now();
      if (now - lastTouch <= 320) { e.preventDefault(); }
      lastTouch = now;
    }, false);

    /* Ctrl/Cmd + wheel zoom on desktop. */
    window.addEventListener('wheel', function (e) {
      if (e.ctrlKey || e.metaKey) { e.preventDefault(); }
    }, { passive: false });

    /* Keyboard zoom shortcuts. */
    window.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) &&
          (e.key === '+' || e.key === '-' || e.key === '=' || e.key === '0')) {
        e.preventDefault();
      }
    }, false);

    /* Never let the document itself scroll. */
    window.addEventListener('scroll', function () {
      if (window.scrollY || window.scrollX) { window.scrollTo(0, 0); }
    }, false);
  }

  /* --------------------------------------------------- audio lifecycle --- */
  function bindAudioLifecycle() {
    /* One-time unlock on the first real interaction of any kind. */
    var kick = function () {
      Sound.unlock();
      var s = Save.get().settings;
      Sound.setSfx(s.sfx);
      Sound.setMusic(s.music);
      UI.syncAudioUi();
    };
    ['pointerdown', 'touchstart', 'mousedown', 'keydown'].forEach(function (n) {
      window.addEventListener(n, kick, { once: true, capture: true });
    });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { Sound.suspend(); } else { Sound.resume(); }
    }, false);

    window.addEventListener('pagehide', function () { Sound.suspend(); }, false);
  }

  /* ------------------------------------------------------------- start --- */
  function start() {
    var canvas = document.getElementById('stage');
    if (!canvas || !canvas.getContext) {
      /* No canvas at all: say so plainly rather than showing a blank page. */
      document.body.innerHTML =
        '<div style="color:#e8ecfa;font:600 15px sans-serif;padding:28px;text-align:center">' +
        'This game needs HTML5 canvas support.</div>';
      return;
    }

    lockGestures();

    Save.load();
    Backdrop.setEnabled(Save.get().settings.motion);

    Game.init(canvas);
    UI.init();
    Game.toAttract();
    Game.start();

    bindAudioLifecycle();

    /* Optional artwork loads in the background; the boot bar reflects it but
       the game is fully playable on vector art alone. */
    var floor = 0;
    var settled = false;

    function finish() {
      if (settled) { return; }
      settled = true;
      UI.bootProgress(1);
      UI.bootDone();
    }

    Assets.begin(
      function (f) {
        floor = Math.max(floor, f);
        UI.bootProgress(0.15 + floor * 0.85);
      },
      function () {
        Assets.guardDomImages(document);
        window.setTimeout(finish, 260);
      }
    );

    /* Fade the boot bar in even when every optional image 404s instantly. */
    var faux = 0;
    var fauxTimer = window.setInterval(function () {
      faux += 0.08;
      if (faux >= 1 || settled) { window.clearInterval(fauxTimer); return; }
      UI.bootProgress(Math.max(0.15 + floor * 0.85, faux * 0.9));
    }, 90);

    /* Hard ceiling on the boot screen, whatever the asset layer does. */
    window.setTimeout(finish, 2600);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, false);
  } else {
    start();
  }
}());
