/* ===========================================================================
   Hemichordata Quest — game logic.

   The riddles, the accepted answers and the hints come from js/data.js and are
   byte-for-byte the ones in the original file. Answer checking is still a
   case-insensitive comparison of the trimmed input against the stored answer;
   the only change is that runs of internal whitespace are collapsed first, so
   "proboscis  gland" is no longer rejected.
   ======================================================================== */
(function (global) {
  'use strict';

  var DATA = global.QUEST_DATA;
  var Store = global.QuestStore;
  var Audio_ = global.QuestAudio;
  var FX = global.QuestFX;

  var ICON = 'assets/images/ui/emoji/';
  var ART = 'assets/images/characters/';
  var REF = 'assets/images/reference/';

  var BASE_AWARD = 100;
  var HINT_AWARD = 60;
  var MISS_COST = 20;
  var MIN_AWARD = 20;
  var STAR_3 = 460, STAR_2 = 320;

  var $ = function (id) { return document.getElementById(id); };

  /* ---------------------------------------------------------------- state */
  var state = {
    idx: 0,
    grains: 0,
    startedAt: 0,
    elapsedMs: 0,
    usedHint: false,
    misses: 0,
    cleanCasts: 0,
    locked: true,        /* input locked during transitions */
    running: false,
    finished: false
  };

  var prefs = Store.getPrefs();
  var chambersEls = [];
  var pathEl = null, shaftEl = null, tokenEl = null, pathLen = 0, shaftLen = 0;
  var timerId = 0, tokenRaf = 0;
  var lastFocus = null;

  var reducedMotion = prefs.reducedMotion ||
    (global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* -------------------------------------------------------------- helpers */
  function normalise(s) {
    return String(s == null ? '' : s).toLowerCase().trim().replace(/\s+/g, ' ');
  }

  function fmtTime(ms) {
    var total = Math.max(0, Math.round(ms / 1000));
    var m = Math.floor(total / 60), s = total % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function starsFor(grains) {
    if (grains >= STAR_3) return 3;
    if (grains >= STAR_2) return 2;
    return grains > 0 ? 1 : 0;
  }

  function setStars(container, n, animate) {
    if (!container) return;
    container.innerHTML = '';
    for (var i = 0; i < 3; i++) {
      var img = document.createElement('img');
      var lit = i < n;
      img.src = ICON + (lit ? 'star_filled.png' : 'star_empty.png');
      img.alt = '';
      if (lit) img.className = 'is-lit';
      if (animate && lit && !reducedMotion) {
        img.classList.add('star-pop');
        img.style.animationDelay = (i * 0.16) + 's';
      }
      container.appendChild(img);
    }
    container.setAttribute('aria-label', n + ' of 3');
  }

  /* Inline stand-in art, used when a character photograph is missing.
     Every instance gets its own gradient ids: several stand-ins can be on the
     page at once, and duplicate ids would make later ones paint with nothing. */
  var fbSeq = 0;

  function fallbackArt(kind) {
    var svgns = 'http://www.w3.org/2000/svg';
    var uid = kind + '-' + (++fbSeq);
    var svg = document.createElementNS(svgns, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');   /* behaves like object-fit:cover */
    svg.setAttribute('class', 'chamber-fallback');
    svg.setAttribute('aria-hidden', 'true');

    var body = '<defs><linearGradient id="fb-' + uid + '" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0%" stop-color="#f2a06a"/><stop offset="50%" stop-color="#d1663c"/>' +
      '<stop offset="100%" stop-color="#8a3b22"/></linearGradient>' +
      '<radialGradient id="fbg-' + uid + '" cx="50%" cy="38%" r="62%">' +
      '<stop offset="0%" stop-color="#776c56"/><stop offset="100%" stop-color="#262c27"/>' +
      '</radialGradient></defs>' +
      '<rect x="-20" y="-20" width="140" height="140" fill="url(#fbg-' + uid + ')"/>' +
      '<g stroke="#9c8862" stroke-width="1" opacity="0.25">' +
      '<path d="M-10 22 q26 -5 52 0 t52 0"/><path d="M-10 78 q26 5 52 0 t52 0"/></g>';

    if (kind === 'gill_slits') {
      body += '<path d="M8 64 C28 44 62 42 92 52" fill="none" stroke="url(#fb-' + uid + ')" ' +
        'stroke-width="26" stroke-linecap="round"/>' +
        '<path d="M12 55 C30 38 60 36 88 45" fill="none" stroke="#ffe3c9" stroke-width="3" ' +
        'stroke-linecap="round" opacity="0.55"/>';
      for (var i = 0; i < 7; i++) {
        body += '<ellipse cx="' + (24 + i * 9) + '" cy="' + (55 - i * 0.4) + '" rx="2.3" ry="5.2" ' +
          'fill="#5e2513" opacity="0.75"/>';
      }
    } else if (kind === 'proboscis_gland') {
      body += '<path d="M8 70 C32 42 62 38 92 48" fill="none" stroke="url(#fb-' + uid + ')" ' +
        'stroke-width="28" stroke-linecap="round"/>' +
        '<ellipse cx="44" cy="53" rx="21" ry="13" fill="#f6d7c2" opacity="0.92"/>' +
        '<g fill="#b06a52">' +
        '<circle cx="36" cy="50" r="5"/><circle cx="46" cy="48" r="5.4"/>' +
        '<circle cx="41" cy="58" r="5"/><circle cx="52" cy="56" r="4.4"/></g>' +
        '<ellipse cx="44" cy="53" rx="21" ry="13" fill="none" stroke="#8a3b22" stroke-width="1.6" opacity="0.7"/>';
    } else {
      body += '<path d="M8 82 C16 40 44 20 64 30 C84 40 84 62 68 66 C58 68.5 50 62 53 54" ' +
        'fill="none" stroke="url(#fb-' + uid + ')" stroke-width="21" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<ellipse cx="10" cy="80" rx="11" ry="8" fill="#f2a06a"/>' +
        '<path d="M13 72 C22 44 46 28 62 36" fill="none" stroke="#ffe3c9" stroke-width="3.4" ' +
        'stroke-linecap="round" opacity="0.7"/>' +
        '<path d="M56 30.5 L58.5 41 M64 31.5 L64.5 42" stroke="#5e2513" stroke-width="1.6" opacity="0.5"/>';
    }
    svg.innerHTML = body;
    return svg;
  }

  /* ------------------------------------------------------------ screens */
  var SCREENS = ['screen-boot', 'screen-menu', 'screen-game', 'screen-end'];
  function showScreen(id) {
    SCREENS.forEach(function (s) {
      var el = $(s);
      if (el) el.classList.toggle('is-active', s === id);
    });
  }

  /* ------------------------------------------------------------- modals */
  function openModal(id) {
    var m = $(id);
    if (!m) return;
    lastFocus = document.activeElement;
    m.hidden = false;
    Audio_.play('open');
    var closeBtn = m.querySelector('.modal-close');
    if (closeBtn) closeBtn.focus();
  }
  function closeModal(id) {
    var m = $(id);
    if (!m || m.hidden) return;
    m.hidden = true;
    Audio_.play('close');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function topModal() {
    var open = null;
    ['modal-learn', 'modal-settings', 'modal-how'].forEach(function (id) {
      if (!open && $(id) && !$(id).hidden) open = id;
    });
    return open;
  }

  /* --------------------------------------------------------- the burrow */
  function buildChambers() {
    var host = $('chambers');
    host.innerHTML = '';
    chambersEls = [];

    DATA.CHAMBERS.forEach(function (ch, i) {
      var pt = pathEl.getPointAtLength(ch.t * pathLen);

      var el = document.createElement('div');
      el.className = 'chamber is-locked';
      el.style.left = pt.x + '%';
      el.style.top = pt.y + '%';
      el.setAttribute('data-index', String(i));

      var disc = document.createElement('div');
      disc.className = 'chamber-disc';

      var img = document.createElement('img');
      img.className = 'chamber-art';
      img.alt = ch.species;
      img.src = ART + ch.art + '.png';
      img.addEventListener('error', function () {
        img.remove();
        disc.insertBefore(fallbackArt(ch.art), disc.firstChild);
      });
      disc.appendChild(img);

      var veil = document.createElement('div');
      veil.className = 'chamber-veil';
      disc.appendChild(veil);

      var num = document.createElement('span');
      num.className = 'chamber-num';
      num.textContent = String(i + 1);
      disc.appendChild(num);

      var badge = document.createElement('img');
      badge.className = 'chamber-badge';
      badge.src = ICON + 'lock.png';
      badge.alt = '';
      disc.appendChild(badge);

      el.appendChild(disc);

      var label = document.createElement('span');
      label.className = 'chamber-label ' + (pt.y > 52 ? 'above' : 'below');
      label.textContent = ch.name;
      el.appendChild(label);

      host.appendChild(el);
      chambersEls.push({ root: el, disc: disc, badge: badge });
    });
  }

  function paintChambers() {
    chambersEls.forEach(function (c, i) {
      var cleared = i < state.idx;
      var active = i === state.idx && !state.finished;
      c.root.classList.toggle('is-cleared', cleared);
      c.root.classList.toggle('is-active', active);
      c.root.classList.toggle('is-locked', !cleared && !active);
      c.badge.src = ICON + (cleared ? 'cast.png' : (active ? 'marker.png' : 'lock.png'));
    });
  }

  /* The worm rests a little short of each chamber so that it stays visible in
     the tunnel instead of disappearing behind the chamber disc. */
  function restT(i) {
    var ch = DATA.CHAMBERS[i];
    if (!ch) return 0;
    if (i === 0) return 0.012;                 /* just inside the surface hole */
    return (DATA.CHAMBERS[i - 1].t + ch.t) / 2; /* midway between two discs */
  }

  /* Places the worm at a fraction of the burrow path (or of the exit shaft). */
  function placeToken(t, useShaft) {
    var p = useShaft ? shaftEl : pathEl;
    var len = useShaft ? shaftLen : pathLen;
    var s = Math.max(0, Math.min(1, t)) * len;
    var pt = p.getPointAtLength(s);
    var pt2 = p.getPointAtLength(Math.min(len, s + 0.6));
    var ang = Math.atan2(pt2.y - pt.y, pt2.x - pt.x) * 180 / Math.PI;
    tokenEl.setAttribute('transform',
      'translate(' + pt.x.toFixed(2) + ',' + pt.y.toFixed(2) + ') rotate(' + ang.toFixed(1) + ') scale(0.45)');
  }

  function crawlTo(fromT, toT, useShaft, done) {
    if (tokenRaf) { global.cancelAnimationFrame(tokenRaf); tokenRaf = 0; }
    if (reducedMotion) { placeToken(toT, useShaft); if (done) done(); return; }

    var dur = 420 + Math.abs(toT - fromT) * 1700;
    var t0 = 0;
    var lastDig = 0;
    function step(ts) {
      if (!t0) t0 = ts;
      var k = Math.min(1, (ts - t0) / dur);
      /* ease-in-out with a slight peristaltic ripple */
      var e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      e += Math.sin(k * Math.PI * 6) * 0.006;
      placeToken(fromT + (toT - fromT) * e, useShaft);
      if (ts - lastDig > 240) { lastDig = ts; Audio_.play('dig'); }
      if (k < 1) tokenRaf = global.requestAnimationFrame(step);
      else { tokenRaf = 0; if (done) done(); }
    }
    tokenRaf = global.requestAnimationFrame(step);
  }

  /* --------------------------------------------------------------- HUD */
  function currentWorth() {
    var w = state.usedHint ? HINT_AWARD : BASE_AWARD;
    w -= state.misses * MISS_COST;
    return Math.max(MIN_AWARD, w);
  }

  function updateHud() {
    $('hud-grains').textContent = String(state.grains);
    $('hud-chamber').textContent = 'Chamber ' + Math.min(state.idx + 1, DATA.CHAMBERS.length) +
      ' of ' + DATA.CHAMBERS.length;
    $('hud-time').textContent = fmtTime(state.elapsedMs);
    $('chamber-worth').textContent = String(currentWorth());
    setStars($('hud-stars'), starsFor(state.grains), false);
  }

  function tick() {
    if (!state.running) return;
    state.elapsedMs = Date.now() - state.startedAt;
    $('hud-time').textContent = fmtTime(state.elapsedMs);
  }

  /* ------------------------------------------------------------ riddles */
  function loadChamber() {
    var ch = DATA.CHAMBERS[state.idx];
    if (!ch) return;
    $('chip-index').textContent = 'Chamber ' + (state.idx + 1);
    $('chip-name').textContent = ch.name;
    $('riddle-text').textContent = ch.q;

    var frame = document.querySelector('.specimen-frame');
    if (frame) {
      var old = frame.querySelector('img, svg');
      var plate = document.createElement('img');
      plate.id = 'specimen-art';
      plate.alt = ch.species;
      plate.addEventListener('error', function () {
        var fb = fallbackArt(ch.art);
        fb.removeAttribute('class');
        /* the plate is wide, so show the whole stand-in rather than cropping it */
        fb.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        if (plate.parentNode) plate.parentNode.replaceChild(fb, plate);
      });
      plate.src = ART + ch.art + '.png';
      if (old) frame.replaceChild(plate, old);
      else frame.insertBefore(plate, frame.firstChild);
    }
    $('specimen-caption').textContent = ch.caption;

    var input = $('answer-input');
    input.value = '';
    input.disabled = false;
    setFeedback('', '');
    state.usedHint = false;
    state.misses = 0;
    paintChambers();
    updateHud();
  }

  function setFeedback(text, kind, iconName) {
    var box = $('feedback'), icon = $('feedback-icon'), label = $('feedback-text');
    box.className = 'feedback' + (kind ? ' is-' + kind : '');
    label.textContent = text;
    if (iconName) {
      icon.src = ICON + iconName + '.png';
      icon.classList.remove('is-hidden');
    } else {
      icon.classList.add('is-hidden');
    }
    if (text) {
      box.classList.add('is-flash');
      setTimeout(function () { box.classList.remove('is-flash'); }, 380);
    }
  }

  function awardGrains(amount, sourceEl) {
    var target = $('stat-grains');
    if (reducedMotion) {
      state.grains += amount;
      updateHud();
      FX.pop(target, 'is-pop');
      return;
    }
    var per = Math.max(1, Math.round(amount / 20));
    var added = 0;
    FX.flyGrains(sourceEl, target, per, $('fly-layer'), function () {
      added++;
      var portion = Math.round(amount * (added / Math.min(per, 12)));
      $('hud-grains').textContent = String(state.grains + Math.min(portion, amount));
      Audio_.play('grain', added);
      FX.pop(target, 'is-pop');
    }, function () {
      state.grains += amount;
      updateHud();
      FX.pop(target, 'is-pop');
    });
  }

  function onCorrect() {
    var ch = DATA.CHAMBERS[state.idx];
    var award = currentWorth();
    if (!state.usedHint && state.misses === 0) state.cleanCasts++;

    state.locked = true;
    $('answer-input').disabled = true;

    setFeedback('Scientific Accuracy Confirmed! +' + award + ' grains', 'right', 'correct');
    document.querySelector('.answer-block').classList.add('is-right');
    var consolePanel = document.querySelector('.console-panel');
    consolePanel.classList.remove('is-bloom');
    void consolePanel.offsetWidth;
    consolePanel.classList.add('is-bloom');
    Audio_.play('correct');

    var activeEl = chambersEls[state.idx] ? chambersEls[state.idx].disc : null;
    FX.burstFrom(activeEl, { count: 34, palette: 'glass', speed: 4.2, size: 3.6, life: 62 });
    FX.burstFrom(activeEl, { count: 18, palette: 'ochre', speed: 2.6, size: 3, life: 70, gravity: 0.05 });

    awardGrains(award, $('purse'));

    var fromT = restT(state.idx);
    var wasLast = state.idx >= DATA.CHAMBERS.length - 1;
    state.idx++;

    setTimeout(function () {
      document.querySelector('.answer-block').classList.remove('is-right');
      consolePanel.classList.remove('is-bloom');
      paintChambers();
      if (wasLast) {
        finish(fromT);
      } else {
        crawlTo(fromT, restT(state.idx), false, function () {
          state.locked = false;
          loadChamber();
          $('answer-input').focus();
        });
      }
    }, reducedMotion ? 400 : 1200);
  }

  function onWrong() {
    state.misses++;
    setFeedback('Incorrect specimen data.', 'wrong', 'wrong');
    var block = document.querySelector('.answer-block');
    block.classList.remove('is-wrong');
    void block.offsetWidth;
    block.classList.add('is-wrong');
    var consolePanel = document.querySelector('.console-panel');
    consolePanel.classList.remove('is-rimflash');
    void consolePanel.offsetWidth;
    consolePanel.classList.add('is-rimflash');

    var c = chambersEls[state.idx];
    if (c) {
      c.root.classList.remove('is-shaking');
      void c.root.offsetWidth;
      c.root.classList.add('is-shaking');
      setTimeout(function () { c.root.classList.remove('is-shaking'); }, 520);
      FX.burstFrom(c.disc, { count: 20, palette: 'rust', speed: 3.2, size: 3, life: 46 });
    }
    Audio_.play('wrong');
    updateHud();
    setTimeout(function () { block.classList.remove('is-wrong'); }, 520);
    $('answer-input').select();
  }

  function checkAnswer() {
    if (state.locked || state.finished) return;
    var ch = DATA.CHAMBERS[state.idx];
    if (!ch) return;                       /* guard: no riddle left to check */
    var given = normalise($('answer-input').value);
    if (!given) {
      setFeedback('Type an answer first.', 'hint', 'hint');
      return;
    }
    if (given === ch.a) onCorrect(); else onWrong();
  }

  function showHint() {
    if (state.locked || state.finished) return;
    var ch = DATA.CHAMBERS[state.idx];
    if (!ch) return;
    state.usedHint = true;
    setFeedback(ch.hint, 'hint', 'hint');
    Audio_.play('hint');
    FX.burstFrom($('btn-hint'), { count: 14, palette: 'glass', speed: 2.4, size: 2.6, life: 40, gravity: 0.02 });
    updateHud();
  }

  /* ------------------------------------------------------------- finish */
  function finish(fromT) {
    state.finished = true;
    state.running = false;
    clearInterval(timerId);
    state.elapsedMs = Date.now() - state.startedAt;

    $('exit-shaft').classList.add('is-open');
    var coil = $('cast-coil');
    if (coil) coil.setAttribute('d', coilPath(90, 15.2, 0.8, 6.2, 2.2));

    crawlTo(fromT, 1, false, function () {
      crawlTo(0, 1, true, function () {
        $('cast-mound').classList.add('is-open');
        FX.burstFrom($('cast-mound'), { count: 26, palette: 'ochre', speed: 3, size: 3.4, life: 60 });
        Audio_.play('complete');
        FX.shower();
        setTimeout(showEnd, reducedMotion ? 150 : 700);
      });
    });
  }

  function coilPath(cx, cy, r0, r1, turns) {
    var d = '', steps = 70;
    for (var i = 0; i <= steps; i++) {
      var t = i / steps;
      var a = t * turns * Math.PI * 2;
      var r = r0 + (r1 - r0) * t;
      d += (i ? 'L' : 'M') + (cx + Math.cos(a) * r).toFixed(2) + ' ' + (cy + Math.sin(a) * r * 0.42).toFixed(2);
    }
    return d;
  }

  function showEnd() {
    var stars = starsFor(state.grains);
    var res = Store.recordResult({ grains: state.grains, stars: stars, timeMs: state.elapsedMs });

    $('end-grains').textContent = String(state.grains);
    $('end-time').textContent = fmtTime(state.elapsedMs);
    $('end-clean').textContent = state.cleanCasts + '/' + DATA.CHAMBERS.length;
    setStars($('end-stars'), stars, true);

    var beat = [];
    if (res.beat.grains) beat.push('most grains');
    if (res.beat.stars) beat.push('best rating');
    if (res.beat.time) beat.push('fastest descent');
    var rec = $('end-record');
    if (beat.length) {
      rec.textContent = 'New record: ' + beat.join(', ');
      rec.classList.remove('is-hidden');
    } else {
      rec.classList.add('is-hidden');
    }

    $('end-sub').textContent = stars === 3
      ? 'A clean descent. The cast on the surface is perfectly coiled.'
      : (stars === 2 ? 'The burrow is logged, with a little sediment disturbed.'
        : 'You reached the blind end. The cast is a little ragged.');

    showScreen('screen-end');
    paintRecords();
  }

  /* ------------------------------------------------------------- flow */
  function startRun() {
    state.idx = 0;
    state.grains = 0;
    state.usedHint = false;
    state.misses = 0;
    state.cleanCasts = 0;
    state.finished = false;
    state.locked = true;
    state.elapsedMs = 0;
    state.startedAt = Date.now();
    state.running = true;

    $('exit-shaft').classList.remove('is-open');
    $('cast-mound').classList.remove('is-open');
    document.querySelector('.answer-block').classList.remove('is-right', 'is-wrong');

    Store.countRun();
    buildChambers();
    paintChambers();
    placeToken(0, false);
    loadChamber();
    updateHud();

    clearInterval(timerId);
    timerId = setInterval(tick, 250);

    showScreen('screen-game');
    crawlTo(0, restT(0), false, function () {
      state.locked = false;
      $('answer-input').focus();
    });
  }

  function quitToMenu() {
    state.running = false;
    state.locked = true;
    clearInterval(timerId);
    if (tokenRaf) { global.cancelAnimationFrame(tokenRaf); tokenRaf = 0; }
    paintRecords();
    showScreen('screen-menu');
  }

  function paintRecords() {
    var s = Store.getScores();
    $('rec-grains').textContent = String(s.bestGrains);
    $('rec-time').textContent = s.bestTimeMs ? fmtTime(s.bestTimeMs) : '—';
    $('rec-runs').textContent = String(s.runs);
    setStars($('rec-stars'), s.bestStars, false);
    $('records-note').textContent = Store.isPersistent()
      ? 'Records are stored on this device only.'
      : 'Storage is unavailable here, so records last for this session only.';
  }

  /* The four supplied photographs, shown once on the main menu. */
  function buildSpecimenStrip() {
    var host = $('menu-specimens');
    if (!host || host.childElementCount) return;
    var seen = {};
    DATA.CHAMBERS.forEach(function (ch) {
      if (seen[ch.art]) return;
      seen[ch.art] = true;
      var item = document.createElement('div');
      item.className = 'strip-item';
      var img = document.createElement('img');
      img.alt = ch.species;
      img.addEventListener('error', function () {
        var fb = fallbackArt(ch.art);
        fb.removeAttribute('class');
        if (img.parentNode) img.parentNode.replaceChild(fb, img);
      });
      img.src = ART + ch.art + '.png';
      var name = document.createElement('span');
      name.textContent = ch.species;
      item.appendChild(img);
      item.appendChild(name);
      host.appendChild(item);
    });
  }

  /* ------------------------------------------------------- learn more */
  function buildLearnMore() {
    var host = $('learn-body');
    if (host.childElementCount) return;
    DATA.LORE.forEach(function (item) {
      var wrap = document.createElement('div');
      wrap.className = 'lore';
      if (item.art) {
        var img = document.createElement('img');
        img.className = 'lore-art';
        img.alt = item.title;
        img.src = REF + item.art + '.jpg';
        img.addEventListener('error', function () {
          var fb = fallbackArt(item.art);
          fb.setAttribute('class', 'lore-art');
          wrap.replaceChild(fb, img);
        });
        wrap.appendChild(img);
      }
      var text = document.createElement('div');
      var h = document.createElement('h3');
      h.textContent = item.title;
      var p = document.createElement('p');
      p.innerHTML = item.body;
      text.appendChild(h);
      text.appendChild(p);
      wrap.appendChild(text);
      host.appendChild(wrap);
    });
    var credit = document.createElement('p');
    credit.className = 'lore-credit';
    credit.textContent = 'Specimen photographs are the images supplied with this game: ' +
      'Balanoglossus, Saccoglossus, an opened proboscis showing the gland, and a trunk ' +
      'bearing gill pores.';
    host.appendChild(credit);
  }

  /* --------------------------------------------------------- settings */
  function applyAudioPrefs() {
    Audio_.setMusic(prefs.music);
    Audio_.setSfx(prefs.sfx);

    $('btn-music').querySelector('img').src = ICON + (prefs.music ? 'music_on.png' : 'music_off.png');
    $('btn-music').setAttribute('aria-pressed', String(prefs.music));
    $('btn-music').classList.toggle('is-off', !prefs.music);
    $('set-music-icon').src = ICON + (prefs.music ? 'music_on.png' : 'music_off.png');
    $('set-music').setAttribute('aria-checked', String(prefs.music));

    $('btn-sound').querySelector('img').src = ICON + (prefs.sfx ? 'sound_on.png' : 'sound_off.png');
    $('btn-sound').setAttribute('aria-pressed', String(prefs.sfx));
    $('btn-sound').classList.toggle('is-off', !prefs.sfx);
    $('set-sfx-icon').src = ICON + (prefs.sfx ? 'sound_on.png' : 'sound_off.png');
    $('set-sfx').setAttribute('aria-checked', String(prefs.sfx));

    $('set-motion').setAttribute('aria-checked', String(prefs.reducedMotion));
  }

  function applyMotionPref() {
    reducedMotion = prefs.reducedMotion ||
      (global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
    document.body.classList.toggle('reduced-motion', !!reducedMotion);
    FX.setReduced(reducedMotion);
  }

  /* ------------------------------------------------------------- boot */
  function preload(done) {
    var files = [];
    DATA.CHAMBERS.forEach(function (c) {
      if (files.indexOf(ART + c.art + '.png') < 0) files.push(ART + c.art + '.png');
    });
    ['logo', 'currency', 'cast', 'hint', 'correct', 'wrong', 'sound_on', 'sound_off',
      'music_on', 'music_off', 'settings', 'help', 'book', 'trophy', 'star_filled',
      'star_empty', 'play', 'home', 'replay', 'close', 'tide', 'lock', 'marker'
    ].forEach(function (n) { files.push(ICON + n + '.png'); });

    var loaded = 0, total = files.length;
    var fill = $('boot-fill'), status = $('boot-status');
    var missing = 0;

    function bump() {
      loaded++;
      fill.style.width = Math.round((loaded / total) * 100) + '%';
      if (loaded >= total) {
        status.textContent = missing
          ? (missing + ' asset' + (missing > 1 ? 's' : '') + ' missing — drawn art will stand in.')
          : 'The flat is exposed. The burrow is open.';
        done();
      }
    }
    files.forEach(function (src) {
      var img = new Image();
      img.onload = bump;
      img.onerror = function () { missing++; bump(); };
      img.src = src;
    });
    if (!total) done();
  }

  /* ------------------------------------------------------------ wiring */
  function on(el, fn) {
    if (!el) return;
    el.addEventListener('click', function (e) {
      e.preventDefault();
      Audio_.unlock();
      fn(e);
    });
    /* Pointer Events give touch the same press feel as the mouse. */
    el.addEventListener('pointerdown', function () { Audio_.play('tap'); }, { passive: true });
  }

  function init() {
    pathEl = $('burrow-path');
    shaftEl = $('exit-shaft');
    tokenEl = $('worm-token');
    pathLen = pathEl.getTotalLength();
    shaftLen = shaftEl.getTotalLength();

    FX.init($('ambient-canvas'), $('fx-canvas'), reducedMotion);
    applyMotionPref();
    applyAudioPrefs();
    paintRecords();
    buildSpecimenStrip();
    setStars($('hud-stars'), 0, false);

    /* boot */
    preload(function () {
      $('btn-boot').classList.remove('is-hidden');
    });

    on($('btn-boot'), function () { showScreen('screen-menu'); });
    on($('btn-play'), startRun);
    on($('btn-how'), function () { openModal('modal-how'); });
    on($('btn-menu-settings'), function () { openModal('modal-settings'); });
    on($('btn-settings'), function () { openModal('modal-settings'); });
    on($('btn-quit'), quitToMenu);
    on($('btn-check'), checkAnswer);
    on($('btn-hint'), showHint);
    on($('btn-again'), startRun);
    on($('btn-end-menu'), quitToMenu);
    on($('btn-learn'), function () { buildLearnMore(); openModal('modal-learn'); });

    Array.prototype.forEach.call(document.querySelectorAll('[data-close]'), function (btn) {
      on(btn, function () { closeModal(btn.getAttribute('data-close')); });
    });
    Array.prototype.forEach.call(document.querySelectorAll('.modal'), function (m) {
      m.addEventListener('pointerdown', function (e) { if (e.target === m) closeModal(m.id); });
    });

    on($('btn-music'), function () {
      prefs = Store.savePrefs({ music: !prefs.music });
      applyAudioPrefs();
    });
    on($('btn-sound'), function () {
      prefs = Store.savePrefs({ sfx: !prefs.sfx });
      applyAudioPrefs();
      if (prefs.sfx) Audio_.play('tap');
    });
    on($('set-music'), function () {
      prefs = Store.savePrefs({ music: !prefs.music });
      applyAudioPrefs();
    });
    on($('set-sfx'), function () {
      prefs = Store.savePrefs({ sfx: !prefs.sfx });
      applyAudioPrefs();
      if (prefs.sfx) Audio_.play('tap');
    });
    on($('set-motion'), function () {
      prefs = Store.savePrefs({ reducedMotion: !prefs.reducedMotion });
      applyAudioPrefs();
      applyMotionPref();
    });
    on($('btn-reset'), function () {
      Store.resetScores();
      paintRecords();
      $('reset-note').textContent = 'Records cleared. Audio and motion preferences kept.';
      FX.burstFrom($('btn-reset'), { count: 18, palette: 'sand', speed: 2.6, size: 3, life: 44 });
    });

    var input = $('answer-input');
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); Audio_.unlock(); checkAnswer(); }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        var t = topModal();
        if (t) closeModal(t);
      }
    });

    /* pinch-zoom and double-tap zoom are switched off; the answer field keeps
       its own selection behaviour through CSS. */
    document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
    document.addEventListener('dblclick', function (e) {
      if (e.target !== input) e.preventDefault();
    });
    document.addEventListener('contextmenu', function (e) {
      if (e.target !== input) e.preventDefault();
    });

    global.addEventListener('resize', function () {
      /* chamber positions are percentages of a square field, so they hold;
         only the label side needs revisiting if the field flips shape. */
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
