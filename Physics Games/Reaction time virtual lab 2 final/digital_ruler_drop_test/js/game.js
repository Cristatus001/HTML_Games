/* ============================================================
   game.js — the reaction bench itself.

   Physics (unchanged from the original experiment):
       d = ½ g t²        ->  distance fallen after time t
       t = √(2d / g)     ->  reaction time from a measured distance

   The measurement is always taken from the clock; the pixel mapping is
   purely for display. Critically, the display scale is DERIVED from the
   rule's own centimetre scale, so the mark sitting on the catch line is
   the same number the physics reports. (The original mixed two scales:
   ruler markings at 1000 px/m but motion at 1500 px/m, so the printed
   reading disagreed with the computed distance.)

   State machine:
       idle -> armed -> dropping -> caught  -> idle ...
                     \-> falsestart -> idle
                        dropping -> missed -> idle
   ============================================================ */
(function (global) {
  'use strict';

  var G = 9.8;

  /* ---------------- session state ---------------- */
  var stage = null;
  var trials = [];
  var misses = 0;
  var falseStarts = 0;

  var state = 'idle';
  var releaseTime = null;     // performance.now() at release
  var dropRaf = null;
  var armTimer = null;
  var tickTimer = null;
  var pixelsFallen = 0;
  var inputLockUntil = 0;
  var lastTrailAt = 0;

  /* ---------------- geometry ---------------- */
  var geo = {
    trackW: 0, trackH: 0,
    rulerW: 0, rulerLenPx: 0,
    pxPerCm: 0, catchY: 0,
    handW: 0, handH: 0
  };

  var el = {};

  function cache() {
    el.track = document.getElementById('rig-track');
    el.dropGroup = document.getElementById('drop-group');
    el.rulerWrap = document.getElementById('ruler-wrap');
    el.ruler = document.getElementById('ruler');
    el.rulerFace = document.getElementById('ruler-face');
    el.dropperHand = document.getElementById('dropper-hand');
    el.catcherHand = document.getElementById('catcher-hand');
    el.catchAssembly = document.getElementById('catch-assembly');
    el.catchLineWrap = document.getElementById('catch-line-wrap');
    el.lamp = document.getElementById('readout-lamp');
    el.lampText = document.getElementById('lamp-text');
    el.live = document.getElementById('live-readout');
    el.liveCm = document.getElementById('live-cm');
    el.flash = document.getElementById('flash');
    el.bench = document.querySelector('.bench');
  }

  /* Recompute the rig layout for the current viewport and rule length. */
  function layout() {
    if (!el.track || !stage) return;

    var r = el.track.getBoundingClientRect();
    geo.trackW = Math.max(120, r.width);
    geo.trackH = Math.max(160, r.height);

    /* rule width scales with the track but stays grabbable */
    geo.rulerW = Math.round(Math.max(30, Math.min(62, geo.trackW * 0.085)));

    /* hands scale with the track, capped so they never dominate */
    geo.handW = Math.round(Math.max(64, Math.min(150, geo.trackW * 0.2)));
    geo.handH = Math.round(geo.handW / 1.6);

    /* the catch line sits low in the rig, leaving room for the hand below */
    var reserveBelow = Math.round(geo.handH * 0.55) + 26;
    geo.catchY = Math.round(Math.min(geo.trackH * 0.76, geo.trackH - reserveBelow));
    geo.catchY = Math.max(Math.round(geo.trackH * 0.42), geo.catchY);

    /* the rule must fit entirely above the catch line, under the hand */
    var topReserve = Math.round(geo.handH * 0.5) + 6;
    geo.rulerLenPx = Math.max(80, geo.catchY - topReserve);
    geo.pxPerCm = geo.rulerLenPx / stage.ruleCm;

    /* apply */
    el.track.style.setProperty('--hand-w', geo.handW + 'px');

    el.dropGroup.style.width = geo.rulerW + 'px';
    el.dropGroup.style.top = (geo.catchY - geo.rulerLenPx) + 'px';

    el.rulerWrap.style.width = geo.rulerW + 'px';
    el.rulerWrap.style.height = geo.rulerLenPx + 'px';

    el.catchAssembly.style.width = geo.rulerW + 'px';
    el.catchAssembly.style.top = (geo.catchY - 1) + 'px';

    var lineW = Math.round(Math.min(geo.trackW * 0.62, Math.max(geo.rulerW * 3.6, 150)));
    el.catchLineWrap.style.width = lineW + 'px';

    buildRuler();
    renderRulerPosition();
  }

  /* ---------------- rule face ----------------
     0 cm is the BOTTOM end of the rule — the end held on the catch
     line — so as the rule falls, rising numbers pass your fingers. */
  function buildRuler() {
    if (!el.rulerFace || !stage) return;

    var L = stage.ruleCm;
    var ppc = geo.pxPerCm;

    /* adaptive density: never draw ticks closer than ~3.4 px apart */
    var minorStep = 1;
    if (ppc < 3.4) minorStep = 5;
    else if (ppc < 6) minorStep = 2;

    /* numerals need breathing room */
    var numStep = 10;
    var candidates = [5, 10, 20, 25, 50];
    for (var c = 0; c < candidates.length; c++) {
      if (candidates[c] * ppc >= 26) { numStep = candidates[c]; break; }
      numStep = candidates[c];
    }
    if (numStep * ppc < 20) numStep = Math.max(numStep, 50);

    var midStep = numStep >= 20 ? 10 : 5;
    var fs = Math.max(7, Math.min(13, Math.round(geo.rulerW * 0.28)));

    var html = [];
    for (var v = 0; v <= L; v += minorStep) {
      var y = (L - v) * ppc;
      var isNum = v % numStep === 0;
      var isMid = !isNum && v % midStep === 0;
      var cls = isNum ? 'tick tick-major' : (isMid ? 'tick tick-mid' : 'tick tick-minor');
      html.push('<span class="' + cls + '" style="top:' + y.toFixed(2) + 'px"></span>');
      if (isNum) {
        html.push('<span class="tick-num" style="top:' + y.toFixed(2) +
          'px;--tick-fs:' + fs + 'px">' + v + '</span>');
      }
    }
    el.rulerFace.innerHTML = html.join('');
  }

  function renderRulerPosition() {
    if (!el.dropGroup) return;
    el.dropGroup.style.transform = 'translate3d(-50%,' + pixelsFallen.toFixed(2) + 'px,0)';
  }

  /* ---------------- statistics ---------------- */
  function computeStats(list) {
    var times = (list || trials).map(function (t) { return t.time; });
    var n = times.length;
    if (!n) return { n: 0, mean: 0, median: 0, stdDev: 0, best: 0, worst: 0 };

    var mean = times.reduce(function (a, b) { return a + b; }, 0) / n;

    var sorted = times.slice().sort(function (a, b) { return a - b; });
    var mid = Math.floor(n / 2);
    var median = n % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

    /* population standard deviation, matching the original lab */
    var variance = times.reduce(function (a, x) {
      return a + Math.pow(x - mean, 2);
    }, 0) / n;

    return {
      n: n,
      mean: mean,
      median: median,
      stdDev: Math.sqrt(variance),
      best: sorted[0],
      worst: sorted[n - 1]
    };
  }

  /* ---------------- lamp / readout ---------------- */
  function setLamp(cls, text) {
    if (!el.lamp) return;
    el.lamp.className = 'readout-lamp' + (cls ? ' state-' + cls : '');
    if (el.lampText) el.lampText.textContent = text;
  }

  function setLive(on, cm) {
    if (!el.live) return;
    el.live.classList.toggle('is-on', !!on);
    if (on && el.liveCm) el.liveCm.textContent = cm.toFixed(1);
  }

  function flash(kind) {
    if (!el.flash) return;
    el.flash.classList.remove('go', 'bad');
    /* force a reflow so the animation restarts on repeated events */
    void el.flash.offsetWidth;
    el.flash.classList.add(kind === 'bad' ? 'bad' : 'go');
  }

  /* ---------------- session control ---------------- */

  function begin(stageDef) {
    stage = stageDef;
    trials = [];
    misses = 0;
    falseStarts = 0;

    /* the Free Lab data set survives across visits */
    if (stage.isFree) {
      trials = global.Save.freeLabTrials().filter(function (t) {
        return t.ruleCm === stage.ruleCm;
      }).map(function (t, i) {
        return { id: i + 1, distance: t.distance, time: t.time, ruleCm: t.ruleCm };
      });
    }

    resetTrial(true);
    layout();
    global.Backdrop.clearFx();
  }

  /** Clear the rig for the next trial without touching recorded data. */
  function resetTrial(silent) {
    clearTimers();
    if (dropRaf) { global.cancelAnimationFrame(dropRaf); dropRaf = null; }

    state = 'idle';
    releaseTime = null;
    pixelsFallen = 0;
    renderRulerPosition();

    if (el.rulerWrap) el.rulerWrap.classList.remove('is-armed', 'is-caught', 'is-missed');
    if (el.dropperHand) el.dropperHand.classList.remove('is-released');
    if (el.catcherHand) el.catcherHand.classList.remove('is-closed');
    if (el.catchAssembly) el.catchAssembly.classList.remove('is-hit');
    setLive(false, 0);
    setLamp('', 'Standing by');

    if (!silent) global.Game.onStateChange(state);
  }

  function clearTimers() {
    if (armTimer) { clearTimeout(armTimer); armTimer = null; }
    if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }
  }

  /** Arm the rig: after a random 1–3 s delay the rule is released. */
  function arm() {
    if (state !== 'idle') return;

    clearTimers();
    pixelsFallen = 0;
    renderRulerPosition();

    state = 'armed';
    if (el.rulerWrap) el.rulerWrap.classList.add('is-armed');
    if (el.catcherHand) el.catcherHand.classList.remove('is-closed');
    setLamp('armed', 'Armed — watch it');
    setLive(false, 0);
    global.Sound.play('arm');
    global.Game.onStateChange(state);

    /* a soft metronome tick while waiting, deliberately NOT in time with
       the release so it can't be used as a cue */
    tickTimer = setInterval(function () { global.Sound.play('tick'); }, 430);

    var delay = 1000 + Math.random() * 2000;   // 1–3 s, as in the original
    armTimer = setTimeout(release, delay);
  }

  function release() {
    if (state !== 'armed') return;
    clearTimers();

    state = 'dropping';
    releaseTime = global.performance.now();
    lastTrailAt = 0;

    if (el.rulerWrap) el.rulerWrap.classList.remove('is-armed');
    if (el.dropperHand) el.dropperHand.classList.add('is-released');
    setLamp('live', 'Falling — catch it');
    setLive(true, 0);
    global.Sound.play('release');
    global.Game.onStateChange(state);

    dropRaf = global.requestAnimationFrame(dropFrame);
  }

  function dropFrame() {
    if (state !== 'dropping') { dropRaf = null; return; }

    var now = global.performance.now();
    var t = (now - releaseTime) / 1000;
    var cm = 0.5 * G * t * t * 100;

    /* the rule has run out of scale — it slipped through the fingers */
    if (cm >= stage.ruleCm) {
      dropRaf = null;
      registerMiss(t, stage.ruleCm);
      return;
    }

    pixelsFallen = cm * geo.pxPerCm;
    renderRulerPosition();
    setLive(true, cm);

    /* a light trail off the trailing edge, throttled */
    if (now - lastTrailAt > 26) {
      lastTrailAt = now;
      global.Backdrop.trail(
        geo.trackW / 2 + geo.rulerW * 0.5,
        (geo.catchY - geo.rulerLenPx) + pixelsFallen
      );
    }

    dropRaf = global.requestAnimationFrame(dropFrame);
  }

  /* ---------------- outcomes ---------------- */

  function attemptCatch() {
    if (state !== 'dropping') return false;
    if (dropRaf) { global.cancelAnimationFrame(dropRaf); dropRaf = null; }
    if (releaseTime === null) return false;

    var t = (global.performance.now() - releaseTime) / 1000;
    var distanceM = 0.5 * G * t * t;
    var cm = distanceM * 100;

    /* the frame check can race the input by a few ms */
    if (cm >= stage.ruleCm) {
      registerMiss(t, stage.ruleCm);
      return true;
    }

    /* snap the display to the measured value so the printed mark on the
       catch line is exactly the distance the physics reports */
    pixelsFallen = cm * geo.pxPerCm;
    renderRulerPosition();
    setLive(true, cm);

    var trial = {
      id: trials.length + 1,
      distance: cm,
      time: t,
      ruleCm: stage.ruleCm
    };
    trials.push(trial);

    state = 'caught';
    inputLockUntil = global.performance.now() + 380;

    if (el.rulerWrap) el.rulerWrap.classList.add('is-caught');
    if (el.catcherHand) el.catcherHand.classList.add('is-closed');
    if (el.catchAssembly) el.catchAssembly.classList.add('is-hit');
    setLamp('good', 'Caught at ' + cm.toFixed(1) + ' cm');

    /* quality drives how big the celebration is: 1 at 0.10 s, 0 at the
       rule's measurable limit */
    var limit = Math.sqrt((2 * (stage.ruleCm / 100)) / G);
    var quality = Math.max(0, Math.min(1, (limit - t) / Math.max(0.001, limit - 0.10)));

    ripple();
    global.Backdrop.burstCatch(geo.trackW / 2, geo.catchY, quality);
    flash('go');
    global.Sound.play(quality > 0.62 ? 'catchGreat' : 'catchGood');

    global.Save.noteTrial(t);
    if (stage.isFree) global.Save.setFreeLabTrials(trials);

    global.Game.onTrial(trial, quality);
    global.Game.onStateChange(state);
    return true;
  }

  function registerMiss(t, cm) {
    if (state !== 'dropping') return;
    clearTimers();

    misses += 1;
    state = 'missed';
    inputLockUntil = global.performance.now() + 380;

    /* park the rule just past the line so it reads as slipped through */
    pixelsFallen = stage.ruleCm * geo.pxPerCm;
    renderRulerPosition();

    if (el.rulerWrap) {
      el.rulerWrap.classList.remove('is-armed');
      el.rulerWrap.classList.add('is-missed');
    }
    setLive(false, 0);
    setLamp('bad', 'Slipped through');

    global.Backdrop.burstMiss(geo.trackW / 2, geo.catchY);
    flash('bad');
    global.Sound.play('miss');

    global.Game.onMiss(t, cm);
    global.Game.onStateChange(state);
  }

  function registerFalseStart() {
    if (state !== 'armed') return;
    clearTimers();

    falseStarts += 1;
    state = 'falsestart';
    inputLockUntil = global.performance.now() + 380;
    pixelsFallen = 0;
    renderRulerPosition();

    if (el.rulerWrap) el.rulerWrap.classList.remove('is-armed');
    setLamp('bad', 'False start');
    setLive(false, 0);

    global.Backdrop.burstFalseStart(geo.trackW / 2, geo.catchY);
    flash('bad');
    global.Sound.play('falseStart');
    if (el.bench) {
      el.bench.classList.remove('is-shaking');
      void el.bench.offsetWidth;
      el.bench.classList.add('is-shaking');
      setTimeout(function () {
        if (el.bench) el.bench.classList.remove('is-shaking');
      }, 400);
    }

    global.Game.onFalseStart();
    global.Game.onStateChange(state);
  }

  function ripple() {
    if (!el.catchLineWrap) return;
    var r = document.createElement('div');
    r.className = 'ripple';
    el.catchLineWrap.appendChild(r);
    setTimeout(function () {
      if (r.parentNode) r.parentNode.removeChild(r);
    }, 700);
  }

  /* ---------------- input ---------------- */

  /** Any tap or keypress on the bench. Returns true if it was consumed. */
  function handleInput() {
    if (state === 'dropping') return attemptCatch();
    if (state === 'armed') { registerFalseStart(); return true; }
    return false;
  }

  function inputLocked() {
    return global.performance.now() < inputLockUntil;
  }

  /* ---------------- session end ---------------- */

  function isSessionComplete() {
    if (!stage || stage.isFree) return false;
    return trials.length >= stage.trials;
  }

  /** Tear the rig down — used when leaving the screen mid-trial. */
  function abort() {
    clearTimers();
    if (dropRaf) { global.cancelAnimationFrame(dropRaf); dropRaf = null; }
    state = 'idle';
    releaseTime = null;
  }

  /* A backgrounded WebView stops firing requestAnimationFrame, which
     freezes the drop loop while the wall clock keeps running. Coming back
     would otherwise either record an absurd reaction time or leave the
     rig stuck mid-flight, so any live trial is voided instead. */
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) return;
    if (state !== 'armed' && state !== 'dropping') return;

    clearTimers();
    if (dropRaf) { global.cancelAnimationFrame(dropRaf); dropRaf = null; }

    state = 'idle';
    releaseTime = null;
    pixelsFallen = 0;
    renderRulerPosition();
    if (el.rulerWrap) el.rulerWrap.classList.remove('is-armed', 'is-caught', 'is-missed');
    if (el.dropperHand) el.dropperHand.classList.remove('is-released');
    setLive(false, 0);
    setLamp('', 'Trial voided — re-arm');
    global.Game.onStateChange(state);
  });

  /* ---------------- public surface ---------------- */
  global.Game = {
    G: G,

    init: function () { cache(); },
    begin: begin,
    layout: layout,
    resetTrial: resetTrial,
    arm: arm,
    abort: abort,

    handleInput: handleInput,
    inputLocked: inputLocked,

    computeStats: function (list) { return computeStats(list); },
    isSessionComplete: isSessionComplete,

    get state() { return state; },
    get stage() { return stage; },
    get trials() { return trials.slice(); },
    get misses() { return misses; },
    get falseStarts() { return falseStarts; },
    get geometry() { return geo; },

    clearTrials: function () {
      trials = [];
      misses = 0;
      falseStarts = 0;
      if (stage && stage.isFree) global.Save.setFreeLabTrials([]);
    },

    /* wired up by ui.js */
    onStateChange: function () {},
    onTrial: function () {},
    onMiss: function () {},
    onFalseStart: function () {}
  };
})(window);
