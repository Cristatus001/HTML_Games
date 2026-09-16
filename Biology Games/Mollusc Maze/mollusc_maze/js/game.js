(function () {
  'use strict';

  /* ==========================================================================
     Riddle data — questions, answers and hints are unchanged from the original.
     (One hint was reworded: it referenced a "bottom-left icon" that no longer
     exists in this layout, so it now points at the current chamber instead.)
     ========================================================================== */
  var riddles = [
    { q: "Our body is unsegmented with a head, visceral hump, and a muscular...?", a: "foot",          hint: "It's what we use to move!" },
    { q: "I am a file-like rasping organ used for feeding. Who am I?",             a: "radula",        hint: "Look at the specimen in this chamber." },
    { q: "What is our hard outer shell made of?",                                  a: "calcareous",    hint: "Think of calcium." },
    { q: "What do we call the space between the hump and the mantle?",             a: "mantle cavity", hint: "This is where our gills live." }
  ];

  var CHAMBER_NAMES = ['Pila', 'Radula', 'Visceral Hump', 'Octopus'];
  var ROMAN = ['I', 'II', 'III', 'IV'];
  var STORAGE_KEY = 'mollusc_maze_save_v1';
  var MAX_PEARLS = riddles.length * 3;

  /* ---------------- State ---------------- */
  var idx = 0;
  var wrongAttempts = 0;      // total, across the run
  var hintsUsed = 0;          // total, across the run
  var pearls = 0;
  var roundClean = true;      // no hint / no miss on the current riddle
  var hintsUsedThisRound = 0;
  var startTime = 0;
  var busy = false;           // locks input during transitions

  /* ---------------- DOM ---------------- */
  var $ = function (id) { return document.getElementById(id); };

  var riddleText   = $('riddle-text');
  var userInput    = $('user-input');
  var feedback     = $('feedback');
  var riddlePanel  = $('riddle-panel');
  var plateCaption = $('plate-caption');
  var stationCounter = $('station-counter');
  var pearlCount   = $('pearl-count');
  var pearlChip    = $('pearl-chip');

  var mazeWrap  = $('maze-wrap');
  var track     = $('maze-track');
  var trackDash = $('maze-track-dash');
  var trackLit  = $('maze-track-lit');
  var mazeCore  = $('maze-core');
  var snail     = $('snail-token');
  var chambers  = Array.prototype.slice.call(document.querySelectorAll('.chamber'));

  var bestRunCard   = $('best-run-card');
  var bestRunValue  = $('best-run-value');
  var bestPearlsVal = $('best-pearls-value');
  var bestRunStars  = $('best-run-stars');

  var endStars  = $('end-stars');
  var endTime   = $('end-time');
  var endHints  = $('end-hints');
  var endMisses = $('end-misses');
  var endPearls = $('end-pearls');
  var endBestBadge = $('end-best-badge');

  var iconSfx = $('icon-sfx');
  var iconMusic = $('icon-music');
  var toggleMusicBtn = $('toggle-music');
  var toggleSfxBtn = $('toggle-sfx');

  /* ==========================================================================
     The spiral: geometry shared by the background watermark and the maze track
     ========================================================================== */
  function spiralD(cx, cy, rMax, rMin, turns, steps, phase) {
    var d = '';
    for (var i = 0; i <= steps; i++) {
      var t = i / steps;
      var th = phase + t * turns * Math.PI * 2;
      var r = rMax + (rMin - rMax) * t;
      var x = cx + Math.cos(th) * r;
      var y = cy + Math.sin(th) * r;
      d += (i ? 'L' : 'M') + x.toFixed(2) + ' ' + y.toFixed(2);
    }
    return d;
  }

  // background watermark
  var bgPath = $('bg-spiral-path');
  if (bgPath) bgPath.setAttribute('d', spiralD(100, 100, 92, 5, 4.1, 900, Math.PI));

  // the playable track: snail starts on the outer rim and crawls inward
  var MAZE_D = spiralD(50, 50, 43, 9, 1.05, 620, Math.PI * 0.9);
  track.setAttribute('d', MAZE_D);
  trackDash.setAttribute('d', MAZE_D);
  trackLit.setAttribute('d', MAZE_D);

  var trackLen = track.getTotalLength();
  trackLit.style.strokeDasharray = trackLen;
  trackLit.style.strokeDashoffset = trackLen;

  /* Where each chamber sits along the path (0 = outer rim, 1 = the core).
     The first is set in from the rim to leave a lead-in stretch of corridor
     for the snail to park on. */
  var CHAMBER_AT = [0.11, 0.37, 0.64, 0.92];

  function pointAt(frac) {
    var p = track.getPointAtLength(Math.max(0, Math.min(1, frac)) * trackLen);
    return { x: p.x, y: p.y };
  }

  /* Place the chambers onto the spiral. The SVG uses a 0-100 viewBox with
     xMidYMid meet inside a square box, so user units map straight to percent. */
  function layoutChambers() {
    chambers.forEach(function (el, i) {
      var p = pointAt(CHAMBER_AT[i]);
      el.style.left = p.x + '%';
      el.style.top = p.y + '%';
    });
  }
  layoutChambers();

  /* The snail parks this far back along the corridor from the chamber it is
     visiting, so it never sits on top of the specimen photograph. Chamber 1 is
     placed far enough in (see CHAMBER_AT) to leave room for this lead-in. */
  var PARK_BACK = 0.10;
  function parkFor(i) { return Math.max(0, CHAMBER_AT[i] - PARK_BACK); }

  function placeSnail(frac) {
    var p = pointAt(frac);
    var ahead = pointAt(Math.min(1, frac + 0.012));
    var behind = pointAt(Math.max(0, frac - 0.012));
    var ang = Math.atan2(ahead.y - behind.y, ahead.x - behind.x) * 180 / Math.PI;
    // keep the shell on top: mirror instead of turning upside-down
    var flip = (ang > 90 || ang < -90) ? ' scale(-1, 1)' : '';
    if (flip) ang = ang + 180;
    snail.style.left = p.x + '%';
    snail.style.top = p.y + '%';
    snail.style.transform = 'translate(-50%, -50%) rotate(' + ang.toFixed(1) + 'deg)' + flip;
  }

  function revealTrack(frac) {
    trackLit.style.strokeDashoffset = trackLen * (1 - frac);
  }

  /* Animate the snail from one point on the path to another. */
  var crawlRAF = null;
  function crawlTo(fromFrac, toFrac, ms, done) {
    if (crawlRAF) cancelAnimationFrame(crawlRAF);
    var t0 = null;
    snail.classList.add('crawling');
    function step(ts) {
      if (t0 === null) t0 = ts;
      var k = Math.min(1, (ts - t0) / ms);
      var eased = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; // easeInOutQuad
      var f = fromFrac + (toFrac - fromFrac) * eased;
      placeSnail(f);
      // the lit corridor runs ahead of the snail, up to the chamber itself
      revealTrack(Math.min(1, f + PARK_BACK));
      if (k < 1) {
        crawlRAF = requestAnimationFrame(step);
      } else {
        crawlRAF = null;
        snail.classList.remove('crawling');
        if (done) done();
      }
    }
    crawlRAF = requestAnimationFrame(step);
  }

  /* ==========================================================================
     Save data
     ========================================================================== */
  function defaultSave() {
    return { musicOn: true, sfxOn: true, bestTimeMs: null, bestStars: 0, bestPearls: 0, completedRuns: 0 };
  }
  function loadSave() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultSave();
      var parsed = JSON.parse(raw);
      var merged = defaultSave();
      for (var k in merged) { if (parsed[k] !== undefined) merged[k] = parsed[k]; }
      return merged;
    } catch (e) { return defaultSave(); }
  }
  function saveSave(s) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch (e) { /* storage blocked */ }
  }

  function formatTime(ms) {
    var total = Math.round(ms / 1000);
    var m = Math.floor(total / 60), s = total % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function starsFor(p) {
    if (p >= MAX_PEARLS - 1) return 3;   // 11-12
    if (p >= MAX_PEARLS - 5) return 2;   // 7-10
    return 1;
  }

  function renderStars(container, count) {
    container.innerHTML = '';
    for (var i = 0; i < 3; i++) {
      var img = document.createElement('img');
      var lit = i < count;
      img.src = 'assets/images/ui/emoji/' + (lit ? 'icon_star_filled.png' : 'icon_star_outline.png');
      img.alt = '';
      if (lit) { img.className = 'lit'; img.style.animationDelay = (0.12 + i * 0.14) + 's'; }
      container.appendChild(img);
    }
  }

  /* ==========================================================================
     Screens & modals
     ========================================================================== */
  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(function (s) {
      var on = s.id === id;
      s.classList.toggle('active', on);
      s.setAttribute('aria-hidden', on ? 'false' : 'true');
    });
  }
  function openModal(id) { $(id).classList.add('active'); }

  document.querySelectorAll('[data-close]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      $(btn.getAttribute('data-close')).classList.remove('active');
      MolluscAudio.playSfx('click');
    });
  });
  document.querySelectorAll('.modal-overlay').forEach(function (ov) {
    ov.addEventListener('click', function (e) { if (e.target === ov) ov.classList.remove('active'); });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.active').forEach(function (o) { o.classList.remove('active'); });
    }
  });

  /* ==========================================================================
     Settings
     ========================================================================== */
  function setSwitch(btn, v) { btn.setAttribute('aria-checked', v ? 'true' : 'false'); }

  function updateHudIcons() {
    var s = loadSave();
    iconSfx.src = 'assets/images/ui/emoji/icon_sound_' + (s.sfxOn ? 'on' : 'off') + '.png';
    iconMusic.src = 'assets/images/ui/emoji/icon_music_' + (s.musicOn ? 'on' : 'off') + '.png';
  }
  function syncSettingsUI() {
    var s = loadSave();
    setSwitch(toggleMusicBtn, s.musicOn);
    setSwitch(toggleSfxBtn, s.sfxOn);
  }
  function toggleMusic() {
    var s = loadSave();
    s.musicOn = !s.musicOn; saveSave(s);
    setSwitch(toggleMusicBtn, s.musicOn);
    MolluscAudio.setMusicEnabled(s.musicOn);
    updateHudIcons();
  }
  function toggleSfx() {
    var s = loadSave();
    s.sfxOn = !s.sfxOn; saveSave(s);
    setSwitch(toggleSfxBtn, s.sfxOn);
    MolluscAudio.setSfxEnabled(s.sfxOn);
    updateHudIcons();
    if (s.sfxOn) MolluscAudio.playSfx('click');
  }
  toggleMusicBtn.addEventListener('click', toggleMusic);
  toggleSfxBtn.addEventListener('click', toggleSfx);
  $('btn-hud-music').addEventListener('click', toggleMusic);
  $('btn-hud-sfx').addEventListener('click', toggleSfx);

  var resetArmed = false, resetTimer = null;
  $('btn-reset-progress').addEventListener('click', function (e) {
    var btn = e.currentTarget;
    if (!resetArmed) {
      resetArmed = true;
      btn.textContent = 'Tap again to confirm';
      clearTimeout(resetTimer);
      resetTimer = setTimeout(function () {
        resetArmed = false; btn.textContent = 'Reset Saved Progress';
      }, 3000);
      return;
    }
    clearTimeout(resetTimer);
    resetArmed = false;
    btn.textContent = 'Reset Saved Progress';
    var keep = loadSave();
    var fresh = defaultSave();
    fresh.musicOn = keep.musicOn;   // preferences aren't "progress"
    fresh.sfxOn = keep.sfxOn;
    saveSave(fresh);
    refreshMenu();
    MolluscAudio.playSfx('click');
  });

  /* ==========================================================================
     Juice
     ========================================================================== */
  function flashPanel() {
    riddlePanel.classList.remove('flash');
    void riddlePanel.offsetWidth;
    riddlePanel.classList.add('flash');
  }

  /* A pearl arcs from the cleared chamber up into the HUD counter. */
  function flyPearl(fromEl, count) {
    var a = fromEl.getBoundingClientRect();
    var b = pearlChip.getBoundingClientRect();
    for (var i = 0; i < count; i++) {
      (function (n) {
        var img = document.createElement('img');
        img.className = 'pearl-fly';
        img.src = 'assets/images/ui/emoji/icon_pearl.png';
        img.alt = '';
        var x0 = a.left + a.width / 2 - 17, y0 = a.top + a.height / 2 - 17;
        var x1 = b.left + b.width / 2 - 17, y1 = b.top + b.height / 2 - 17;
        img.style.left = x0 + 'px';
        img.style.top = y0 + 'px';
        document.body.appendChild(img);
        var t0 = null, dur = 620, delay = n * 110;
        function step(ts) {
          if (t0 === null) t0 = ts;
          var e = ts - t0 - delay;
          if (e < 0) { requestAnimationFrame(step); return; }
          var k = Math.min(1, e / dur);
          var ease = 1 - Math.pow(1 - k, 3);
          var x = x0 + (x1 - x0) * ease;
          var y = y0 + (y1 - y0) * ease - Math.sin(ease * Math.PI) * 90; // arc
          img.style.transform = 'translate(' + (x - x0) + 'px,' + (y - y0) + 'px) scale(' + (1 - 0.35 * k) + ')';
          img.style.opacity = k > 0.85 ? String((1 - k) / 0.15) : '1';
          if (k < 1) requestAnimationFrame(step);
          else {
            img.remove();
            pearls++;
            pearlCount.textContent = String(pearls);
            pearlChip.classList.remove('pop');
            void pearlChip.offsetWidth;
            pearlChip.classList.add('pop');
            MolluscAudio.playSfx('pearl');
          }
        }
        requestAnimationFrame(step);
      })(i);
    }
  }

  function burstAt(el, hue) {
    if (!window.MolluscParticles) return;
    var r = el.getBoundingClientRect();
    window.MolluscParticles.burst(
      (r.left + r.width / 2) / window.innerWidth,
      (r.top + r.height / 2) / window.innerHeight,
      hue
    );
  }

  /* ==========================================================================
     Core loop
     ========================================================================== */
  function setChamberStates() {
    chambers.forEach(function (el, i) {
      el.classList.toggle('active', i === idx);
      el.classList.toggle('solved', i < idx);
    });
  }

  function update() {
    riddleText.textContent = riddles[idx].q;
    userInput.value = '';
    feedback.innerHTML = '';
    feedback.className = 'feedback';
    stationCounter.textContent = (idx + 1) + ' / ' + riddles.length;
    plateCaption.textContent = 'Chamber ' + ROMAN[idx] + ' · ' + CHAMBER_NAMES[idx];
    roundClean = true;
    setChamberStates();
    flashPanel();
  }

  function checkAnswer() {
    if (busy) return;
    var val = userInput.value.toLowerCase().trim();

    if (val === riddles[idx].a) {
      busy = true;
      var solvedChamber = chambers[idx];
      var solvedIdx = idx;

      feedback.className = 'feedback correct pop';
      feedback.innerHTML = '<img src="assets/images/ui/emoji/icon_correct.png" alt=""><span>Correct — the chamber opens.</span>';
      MolluscAudio.playSfx('correct');

      solvedChamber.classList.add('solved', 'bloom');
      solvedChamber.classList.remove('active');
      setTimeout(function () { solvedChamber.classList.remove('bloom'); }, 850);
      burstAt(solvedChamber.querySelector('.medallion'), 'pearl');

      var award = roundClean ? 3 : (hintsUsedThisRound ? 1 : 2);
      flyPearl(solvedChamber.querySelector('.medallion'), award);

      idx++;
      hintsUsedThisRound = 0;

      var from = parkFor(solvedIdx);
      // on the last chamber the snail carries on all the way to the core pearl
      var to = (idx < riddles.length) ? parkFor(idx) : 1;

      setTimeout(function () {
        crawlTo(from, to, 1500, function () {
          busy = false;
          if (idx < riddles.length) {
            update();
            userInput.focus();
          } else {
            mazeCore.classList.add('awake');
            finishGame();
          }
        });
      }, 700);

    } else {
      wrongAttempts++;
      roundClean = false;
      feedback.className = 'feedback wrong pop';
      feedback.innerHTML = '<img src="assets/images/ui/emoji/icon_incorrect.png" alt=""><span>Not quite — try again.</span>';
      MolluscAudio.playSfx('wrong');
      riddlePanel.classList.add('shake', 'wrong-flash');
      setTimeout(function () { riddlePanel.classList.remove('shake', 'wrong-flash'); }, 450);
      userInput.select();
    }
  }

  function showHint() {
    if (busy) return;
    hintsUsed++;
    hintsUsedThisRound++;
    roundClean = false;
    feedback.className = 'feedback hint pop';
    feedback.innerHTML = '<img src="assets/images/ui/emoji/icon_hint.png" alt=""><span>' + riddles[idx].hint + '</span>';
    MolluscAudio.playSfx('hint');
  }

  function resetGame() {
    if (crawlRAF) { cancelAnimationFrame(crawlRAF); crawlRAF = null; }
    idx = 0; wrongAttempts = 0; hintsUsed = 0; hintsUsedThisRound = 0;
    pearls = 0; busy = false;
    pearlCount.textContent = '0';
    startTime = Date.now();
    mazeCore.classList.remove('awake');
    chambers.forEach(function (el) { el.classList.remove('solved', 'active', 'bloom'); });
    layoutChambers();
    revealTrack(CHAMBER_AT[0]);
    placeSnail(parkFor(0));
    update();
  }

  function finishGame() {
    var elapsed = Date.now() - startTime;
    MolluscAudio.playSfx('complete');

    // pearl shower
    if (window.MolluscParticles) {
      for (var i = 0; i < 5; i++) {
        (function (n) {
          setTimeout(function () {
            window.MolluscParticles.burst(0.2 + Math.random() * 0.6, 0.25 + Math.random() * 0.35, n % 2 ? 'gold' : 'pearl');
          }, n * 170);
        })(i);
      }
    }

    var stars = starsFor(pearls);
    renderStars(endStars, stars);
    endTime.textContent = formatTime(elapsed);
    endHints.textContent = String(hintsUsed);
    endMisses.textContent = String(wrongAttempts);
    endPearls.textContent = pearls + ' / ' + MAX_PEARLS;

    var s = loadSave();
    var newBest = false;
    if (s.bestTimeMs === null || elapsed < s.bestTimeMs) { s.bestTimeMs = elapsed; newBest = true; }
    if (pearls > (s.bestPearls || 0)) s.bestPearls = pearls;
    if (stars > (s.bestStars || 0)) s.bestStars = stars;
    s.completedRuns = (s.completedRuns || 0) + 1;
    saveSave(s);

    endBestBadge.classList.toggle('hidden', !newBest);
    setTimeout(function () { showScreen('screen-end'); }, 900);
  }

  function refreshMenu() {
    var s = loadSave();
    if (s.bestTimeMs === null) { bestRunCard.classList.add('hidden'); return; }
    bestRunCard.classList.remove('hidden');
    bestRunValue.textContent = formatTime(s.bestTimeMs);
    bestPearlsVal.textContent = (s.bestPearls || 0) + ' / ' + MAX_PEARLS;
    renderStars(bestRunStars, s.bestStars || 0);
  }

  /* ==========================================================================
     Wiring
     ========================================================================== */
  $('btn-check').addEventListener('click', checkAnswer);
  $('btn-hint').addEventListener('click', showHint);
  userInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); checkAnswer(); }
  });

  $('btn-boot-start').addEventListener('click', function () {
    MolluscAudio.init();
    MolluscAudio.startMusic();
    refreshMenu();
    showScreen('screen-menu');
  });
  $('btn-play').addEventListener('click', function () {
    MolluscAudio.playSfx('click');
    showScreen('screen-game');
    // lay out after the screen is visible so the maze has real dimensions
    requestAnimationFrame(function () { resetGame(); });
  });
  $('btn-howtoplay').addEventListener('click', function () { MolluscAudio.playSfx('click'); openModal('modal-howtoplay'); });
  $('btn-settings').addEventListener('click', function () { MolluscAudio.playSfx('click'); syncSettingsUI(); openModal('modal-settings'); });
  $('btn-hud-menu').addEventListener('click', function () { MolluscAudio.playSfx('click'); refreshMenu(); showScreen('screen-menu'); });
  $('btn-learnmore').addEventListener('click', function () { MolluscAudio.playSfx('click'); openModal('modal-learnmore'); });
  $('btn-play-again').addEventListener('click', function () {
    MolluscAudio.playSfx('click');
    showScreen('screen-game');
    requestAnimationFrame(function () { resetGame(); });
  });
  $('btn-end-menu').addEventListener('click', function () { MolluscAudio.playSfx('click'); refreshMenu(); showScreen('screen-menu'); });

  /* Tapping a chamber peeks at its specimen (Pointer Events: one path for
     mouse, touch and pen). */
  chambers.forEach(function (el) {
    var med = el.querySelector('.medallion');
    el.addEventListener('pointerdown', function () { med.style.transform = 'scale(0.92)'; });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (evt) {
      el.addEventListener(evt, function () { med.style.transform = ''; });
    });
  });

  document.addEventListener('gesturestart', function (e) { e.preventDefault(); });

  window.addEventListener('resize', function () {
    layoutChambers();
    if (!crawlRAF) placeSnail(idx < riddles.length ? parkFor(idx) : 1);
  }, { passive: true });

  /* Optional drop-in backdrop — silently ignored if absent. */
  (function loadBackdrop() {
    var layer = $('bg-image-layer');
    if (!layer) return;
    var img = new Image();
    img.onload = function () {
      layer.style.backgroundImage = 'url("assets/images/background/backdrop.jpg")';
      layer.classList.add('loaded');
    };
    img.onerror = function () { /* keep the procedural background */ };
    img.src = 'assets/images/background/backdrop.jpg';
  })();

  /* ---------------- Init ---------------- */
  var initial = loadSave();
  MolluscAudio.musicEnabled = initial.musicOn;
  MolluscAudio.sfxEnabled = initial.sfxOn;
  updateHudIcons();
  placeSnail(parkFor(0));
  revealTrack(CHAMBER_AT[0]);
  update();
})();
