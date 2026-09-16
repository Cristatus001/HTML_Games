/* ============================================================================
 * MOSS SPOREFALL — boot
 * Brings the pieces up in order, then hands over to the main menu.
 * ==========================================================================*/
(function (global) {
  'use strict';

  var BOOT_LINES = [
    'Warming the mist...',
    'Soaking the forest floor...',
    'Opening the capsule...',
    'Catching the wind...'
  ];

  function boot() {
    var UI = global.UI;
    var Sound = global.GameAudio;
    var step = 0;

    UI.init();
    UI.bootProgress(8, BOOT_LINES[0]);

    // Look for the optional music file. Missing is the normal case.
    Sound.probeMusicFile();

    var ticker = setInterval(function () {
      step++;
      if (step < BOOT_LINES.length) {
        UI.bootProgress(18 + step * 16, BOOT_LINES[step]);
      }
    }, 220);

    global.Assets.loadAll().then(function (report) {
      clearInterval(ticker);
      UI.bootProgress(100, report.loaded > 0
        ? 'Loaded ' + report.loaded + ' of ' + report.total + ' art files'
        : 'Ready');

      setTimeout(function () {
        UI.toMenu();
      }, 480);
    }).catch(function () {
      // The loader never rejects, but stay safe: always reach the menu.
      clearInterval(ticker);
      UI.bootProgress(100, 'Ready');
      setTimeout(function () { UI.toMenu(); }, 300);
    });

    // Any first gesture unlocks audio and starts the ambient score.
    var started = false;
    function firstGesture() {
      if (started) { return; }
      started = true;
      Sound.unlock();
      Sound.startMusic();
    }
    ['pointerdown', 'keydown', 'touchstart'].forEach(function (evt) {
      global.addEventListener(evt, firstGesture, { once: true, passive: true });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window);
