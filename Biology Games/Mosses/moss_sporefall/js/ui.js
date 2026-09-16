/* ============================================================================
 * MOSS SPOREFALL — screens, HUD, saved progress and input wiring
 * ==========================================================================*/
(function (global) {
  'use strict';

  var D = global.GameData;
  var Sound = global.GameAudio;

  var STORE_KEY = 'moss_sporefall_v1';
  var ICON = 'assets/images/ui/emoji/';

  var ZONE_STYLE = [
    { c: '#4fd07f', g: 'rgba(107,255,158,0.55)' },
    { c: '#5fd3f0', g: 'rgba(127,233,255,0.55)' },
    { c: '#f0b45f', g: 'rgba(255,196,107,0.55)' }
  ];

  var save = null;
  var currentZone = 0;
  var lastResult = null;
  var toastTimer = 0;
  var lastScore = 0;
  var el = {};

  /* ------------------------------------------------------------- storage */

  function defaultSave() {
    return {
      zones: {},                       // id -> { stars, best }
      facts: [],                       // fact indices ever collected
      settings: { music: true, sfx: true }
    };
  }

  function loadSave() {
    var s = defaultSave();
    try {
      var raw = global.localStorage.getItem(STORE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          if (parsed.zones && typeof parsed.zones === 'object') { s.zones = parsed.zones; }
          if (Array.isArray(parsed.facts)) { s.facts = parsed.facts.filter(function (n) {
            return typeof n === 'number' && n >= 0 && n < D.FACTS.length;
          }); }
          if (parsed.settings) {
            s.settings.music = parsed.settings.music !== false;
            s.settings.sfx = parsed.settings.sfx !== false;
          }
        }
      }
    } catch (e) {
      // Private mode or corrupt data: fall back to defaults, never crash.
    }
    return s;
  }

  function persist() {
    try {
      global.localStorage.setItem(STORE_KEY, JSON.stringify(save));
    } catch (e) {
      // Storage unavailable — the session still plays, just does not persist.
    }
  }

  function zoneRecord(id) {
    return save.zones[id] || { stars: 0, best: 0 };
  }

  function isUnlocked(index) {
    if (index === 0) { return true; }
    return zoneRecord(D.ZONES[index - 1].id).stars > 0;
  }

  /* --------------------------------------------------------------- screens */

  var SCREENS = ['screen-boot', 'screen-menu', 'screen-zones', 'screen-howto',
                 'screen-settings', 'screen-pause', 'screen-result', 'screen-learn'];

  function show(id) {
    for (var i = 0; i < SCREENS.length; i++) {
      var node = document.getElementById(SCREENS[i]);
      if (node) { node.classList.toggle('active', SCREENS[i] === id); }
    }
  }

  function hideAllScreens() {
    for (var i = 0; i < SCREENS.length; i++) {
      var node = document.getElementById(SCREENS[i]);
      if (node) { node.classList.remove('active'); }
    }
  }

  function setHudVisible(on) {
    el.hud.classList.toggle('hidden', !on);
    el.hud.setAttribute('aria-hidden', on ? 'false' : 'true');
    el.touch.classList.toggle('hidden', !on);
    el.touch.setAttribute('aria-hidden', on ? 'false' : 'true');
  }

  /* ------------------------------------------------------------------ HUD */

  function buildHudSkeleton() {
    el.moisture.innerHTML = '';
    for (var i = 0; i < global.Game.MAX_MOISTURE; i++) {
      var img = document.createElement('img');
      img.className = 'icon lit';
      img.src = ICON + 'dew-drop.png';
      img.alt = '';
      el.moisture.appendChild(img);
    }
  }

  function buildPips(total) {
    el.pips.innerHTML = '';
    for (var i = 0; i < total; i++) {
      var d = document.createElement('span');
      d.className = 'pip';
      el.pips.appendChild(d);
    }
  }

  function onHud(s) {
    el.zoneName.textContent = s.zoneName;

    if (el.pips.childNodes.length !== s.total) { buildPips(s.total); }
    for (var i = 0; i < el.pips.childNodes.length; i++) {
      el.pips.childNodes[i].classList.toggle('on', i < s.collected);
    }

    var drops = el.moisture.childNodes;
    for (var k = 0; k < drops.length; k++) {
      var lit = k < s.moisture;
      drops[k].className = 'icon ' + (lit ? 'lit' : 'spent');
      drops[k].src = ICON + (lit ? 'dew-drop.png' : 'dew-drop-empty.png');
    }

    if (s.score !== lastScore) {
      lastScore = s.score;
      el.score.textContent = s.score;
      el.scorePlate.classList.remove('bump');
      void el.scorePlate.offsetWidth;      // restart the animation
      el.scorePlate.classList.add('bump');
    }

    var pct = Math.min(100, (s.depth / s.totalDepth) * 100);
    el.gaugeFill.style.height = pct + '%';
    el.gaugeMarker.style.top = pct + '%';
    el.depthValue.textContent = Math.round(s.depth / 10) + ' cm';
  }

  /* ---------------------------------------------------------------- toast */

  function showToast(opts) {
    clearTimeout(toastTimer);
    el.toast.classList.toggle('warn', !!opts.warn);
    el.toastIcon.src = ICON + (opts.icon || 'moss-leaf.png');
    el.toastTitle.textContent = opts.title;
    el.toastText.textContent = opts.text;
    el.toast.classList.add('show');
    toastTimer = setTimeout(function () {
      el.toast.classList.remove('show');
    }, opts.duration || 4200);
  }

  function hideToast() {
    clearTimeout(toastTimer);
    el.toast.classList.remove('show');
  }

  function onFact(index) {
    if (save.facts.indexOf(index) === -1) {
      save.facts.push(index);
      persist();
    }
    showToast({
      title: 'MOSS FACT ' + (index + 1) + '  -  ' + D.FACT_TITLES[index].toUpperCase(),
      text: D.FACTS[index],
      icon: 'moss-leaf.png',
      duration: 4400
    });
  }

  function onWarn(impostor) {
    el.moisture.classList.remove('hit');
    void el.moisture.offsetWidth;
    el.moisture.classList.add('hit');
    showToast({
      title: 'NOT A MOSS  -  ' + impostor.name.toUpperCase(),
      text: impostor.warn,
      icon: 'warning.png',
      warn: true,
      duration: 3000
    });
  }

  /* ---------------------------------------------------------- zone select */

  function buildZoneList() {
    el.zoneList.innerHTML = '';

    D.ZONES.forEach(function (z, i) {
      var rec = zoneRecord(z.id);
      var unlocked = isUnlocked(i);
      var style = ZONE_STYLE[i] || ZONE_STYLE[0];

      var card = document.createElement('button');
      card.type = 'button';
      card.className = 'zone-card' + (unlocked ? '' : ' locked');
      card.style.setProperty('--zc', style.c);
      card.style.setProperty('--zg', style.g);
      if (!unlocked) { card.setAttribute('aria-disabled', 'true'); }

      var badge = document.createElement('span');
      badge.className = 'zone-badge';
      badge.textContent = String(z.id);

      var info = document.createElement('span');
      info.className = 'zone-info';

      var title = document.createElement('span');
      title.className = 'zone-title';
      title.textContent = z.name.toUpperCase();

      var sub = document.createElement('span');
      sub.className = 'zone-sub';
      sub.textContent = unlocked ? z.tagline : 'Earn a star in the zone above to unlock.';

      var meta = document.createElement('span');
      meta.className = 'zone-meta';
      var found = 0;
      for (var f = z.factFrom; f < z.factTo; f++) {
        if (save.facts.indexOf(f) !== -1) { found++; }
      }
      meta.textContent = 'FACTS ' + found + '/' + (z.factTo - z.factFrom) +
                         '   DEPTH ' + Math.round(z.depth / 10) + ' cm';

      info.appendChild(title);
      info.appendChild(sub);
      info.appendChild(meta);

      var right = document.createElement('span');
      right.className = 'zone-right';

      if (unlocked) {
        var stars = document.createElement('span');
        stars.className = 'zone-stars';
        for (var s = 0; s < 3; s++) {
          var si = document.createElement('img');
          si.className = 'icon';
          si.src = ICON + (s < rec.stars ? 'star-filled.png' : 'star-empty.png');
          si.alt = '';
          stars.appendChild(si);
        }
        right.appendChild(stars);

        if (rec.best > 0) {
          var best = document.createElement('span');
          best.className = 'zone-best';
          best.textContent = 'BEST ' + rec.best;
          right.appendChild(best);
        }
      } else {
        var lock = document.createElement('img');
        lock.className = 'zone-lock';
        lock.src = ICON + 'lock.png';
        lock.alt = 'Locked';
        right.appendChild(lock);
      }

      card.appendChild(badge);
      card.appendChild(info);
      card.appendChild(right);

      card.addEventListener('click', function () {
        if (!unlocked) { Sound.play('warn'); return; }
        Sound.play('ui');
        beginZone(i);
      });

      el.zoneList.appendChild(card);
    });

    el.totalFacts.textContent = String(save.facts.length);
  }

  /* -------------------------------------------------------------- results */

  function starRow(count) {
    el.resultStars.innerHTML = '';
    for (var i = 0; i < 3; i++) {
      var img = document.createElement('img');
      img.className = 'icon' + (i < count ? ' won' : '');
      img.src = ICON + (i < count ? 'star-filled.png' : 'star-empty.png');
      img.alt = '';
      el.resultStars.appendChild(img);
    }
  }

  function onEnd(result) {
    lastResult = result;
    var z = result.zone;
    var rec = zoneRecord(z.id);
    var isLast = result.zoneIndex === D.ZONES.length - 1;
    var allFacts = save.facts.length >= D.FACTS.length;

    if (result.win) {
      if (result.stars > rec.stars) { rec.stars = result.stars; }
      if (result.score > rec.best) { rec.best = result.score; }
      save.zones[z.id] = rec;
      persist();
    }

    el.resultTitle.classList.toggle('fail', !result.win);
    el.crest.src = ICON + (result.win ? 'award.png' : 'warning.png');

    if (result.win && isLast && allFacts) {
      el.resultTitle.textContent = 'JOURNEY COMPLETE';
      el.resultSub.textContent = 'All fifteen facts gathered. You have mastered the bryophytes.';
    } else if (result.win) {
      el.resultTitle.textContent = 'GERMINATION';
      el.resultSub.textContent = 'The spore took hold in ' + z.name + '. A new gametophyte begins.';
    } else {
      el.resultTitle.textContent = 'DRIED OUT';
      el.resultSub.textContent = 'Without moisture the spore cannot germinate. Try the descent again.';
    }

    starRow(result.stars);

    el.resultScore.textContent = String(result.score);
    el.resultFacts.textContent = result.facts.length + '/' + result.total;
    el.resultMoisture.textContent = String(Math.max(0, result.moisture));
    el.resultDepth.textContent = Math.round(result.depth / 10) + ' cm';

    // Per-fact breakdown for this zone.
    el.factsList.innerHTML = '';
    for (var f = z.factFrom; f < z.factTo; f++) {
      var got = result.facts.indexOf(f) !== -1;
      var row = document.createElement('div');
      row.className = 'fact-line' + (got ? '' : ' missed');

      var ic = document.createElement('img');
      ic.className = 'icon';
      ic.src = ICON + (got ? 'check.png' : 'lock.png');
      ic.alt = '';

      var txt = document.createElement('div');
      var b = document.createElement('b');
      b.textContent = 'FACT ' + (f + 1) + ': ';
      txt.appendChild(b);
      txt.appendChild(document.createTextNode(got ? D.FACTS[f] : 'Not collected on this run.'));

      row.appendChild(ic);
      row.appendChild(txt);
      el.factsList.appendChild(row);
    }

    var canAdvance = result.win && !isLast;
    el.btnNext.classList.toggle('hidden', !canAdvance);

    setHudVisible(false);
    hideToast();
    show('screen-result');
  }

  /* ------------------------------------------------------------ learn more */

  function buildLearnMore() {
    // Life cycle
    el.lifecycle.innerHTML = '';
    D.LIFECYCLE.forEach(function (stage, i) {
      var li = document.createElement('li');
      li.className = 'lc-item';

      var dot = document.createElement('span');
      dot.className = 'lc-dot';
      dot.textContent = String(i + 1);

      var body = document.createElement('div');
      body.className = 'lc-body';

      var t = document.createElement('div');
      t.className = 'lc-title';
      t.textContent = stage.label;
      var pl = document.createElement('span');
      pl.className = 'lc-ploidy';
      pl.textContent = stage.ploidy;
      t.appendChild(pl);

      var note = document.createElement('div');
      note.className = 'lc-note';
      note.textContent = stage.note;

      body.appendChild(t);
      body.appendChild(note);
      li.appendChild(dot);
      li.appendChild(body);
      el.lifecycle.appendChild(li);
    });

    // Glossary
    el.glossary.innerHTML = '';
    D.GLOSSARY.forEach(function (pair) {
      var wrap = document.createElement('div');
      wrap.className = 'gl-item';
      var dt = document.createElement('dt');
      dt.textContent = pair[0];
      var dd = document.createElement('dd');
      dd.textContent = pair[1];
      wrap.appendChild(dt);
      wrap.appendChild(dd);
      el.glossary.appendChild(wrap);
    });

    // Ecology
    el.ecology.innerHTML = '';
    D.ECOLOGY.forEach(function (line) {
      var li = document.createElement('li');
      li.textContent = line;
      el.ecology.appendChild(li);
    });

    // All fifteen facts, marking the ones the player has found.
    el.allFacts.innerHTML = '';
    D.FACTS.forEach(function (text, i) {
      var li = document.createElement('li');
      var found = save.facts.indexOf(i) !== -1;
      li.className = found ? 'found' : '';
      var num = document.createElement('span');
      num.className = 'fnum';
      num.textContent = (i + 1) + '.';
      var span = document.createElement('span');
      span.textContent = text;
      li.appendChild(num);
      li.appendChild(span);
      el.allFacts.appendChild(li);
    });
  }

  /* ------------------------------------------------------------- settings */

  function applySettings() {
    Sound.setMusicEnabled(save.settings.music);
    Sound.setSfxEnabled(save.settings.sfx);

    el.toggleMusic.setAttribute('aria-pressed', save.settings.music ? 'true' : 'false');
    el.toggleSfx.setAttribute('aria-pressed', save.settings.sfx ? 'true' : 'false');
    el.musicIcon.src = ICON + (save.settings.music ? 'music-on.png' : 'music-off.png');
    el.sfxIcon.src = ICON + (save.settings.sfx ? 'sound-on.png' : 'sound-off.png');
    el.musicSource.textContent = Sound.usingMusicFile()
      ? 'Music: playing assets/audio/bgm.mp3.'
      : 'Music: generated live in your browser.';
  }

  /* ----------------------------------------------------------- game flow */

  function beginZone(index) {
    currentZone = index;
    hideToast();
    hideAllScreens();
    setHudVisible(true);
    lastScore = -1;
    buildHudSkeleton();
    buildPips(D.ZONES[index].factTo - D.ZONES[index].factFrom);
    global.Game.clearKeys();
    global.Game.startZone(index);
    Sound.startMusic();
  }

  function toMenu() {
    global.Game.clearKeys();
    global.Game.stop();
    setHudVisible(false);
    hideToast();
    buildZoneList();
    show('screen-menu');
  }

  function togglePause() {
    if (global.Game.getMode() === 'playing') {
      global.Game.pause();
      global.Game.clearKeys();
      clearPads();
      show('screen-pause');
      Sound.play('ui');
    } else if (global.Game.getMode() === 'paused') {
      hideAllScreens();
      global.Game.resume();
      Sound.play('ui');
    }
  }

  /* ---------------------------------------------------------------- input */

  var pads = [];

  function clearPads() {
    pads.forEach(function (p) { p.node.classList.remove('pressed'); });
  }

  function bindPad(node, key) {
    if (!node) { return; }
    var entry = { node: node, key: key };
    pads.push(entry);

    node.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      Sound.unlock();
      node.classList.add('pressed');
      global.Game.setKey(key, true);
      if (node.setPointerCapture) {
        try { node.setPointerCapture(e.pointerId); } catch (err) { /* ignored */ }
      }
    });

    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (evt) {
      node.addEventListener(evt, function (e) {
        e.preventDefault();
        node.classList.remove('pressed');
        global.Game.setKey(key, false);
      });
    });

    node.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  }

  function bindCanvasDrag(canvas) {
    var dragging = false;

    canvas.addEventListener('pointerdown', function (e) {
      Sound.unlock();
      if (!global.Game.isPlayable()) { return; }
      dragging = true;
      global.Game.setPointer(e.clientX);
      if (canvas.setPointerCapture) {
        try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignored */ }
      }
      e.preventDefault();
    });

    canvas.addEventListener('pointermove', function (e) {
      if (!dragging) { return; }
      global.Game.setPointer(e.clientX);
      e.preventDefault();
    });

    ['pointerup', 'pointercancel'].forEach(function (evt) {
      canvas.addEventListener(evt, function () {
        dragging = false;
        global.Game.clearPointer();
      });
    });
  }

  function bindKeyboard() {
    var MAP = {
      ArrowLeft: 'left', KeyA: 'left',
      ArrowRight: 'right', KeyD: 'right',
      ArrowDown: 'down', KeyS: 'down'
    };

    global.addEventListener('keydown', function (e) {
      Sound.unlock();
      var k = MAP[e.code];
      if (k) {
        global.Game.setKey(k, true);
        e.preventDefault();
        return;
      }
      if (e.code === 'KeyP' || e.code === 'Escape') {
        if (global.Game.isPlayable()) { togglePause(); e.preventDefault(); }
      }
    });

    global.addEventListener('keyup', function (e) {
      var k = MAP[e.code];
      if (k) { global.Game.setKey(k, false); e.preventDefault(); }
    });

    // Never leave a key stuck down if the app loses focus.
    global.addEventListener('blur', function () {
      global.Game.clearKeys();
      clearPads();
    });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        global.Game.clearKeys();
        clearPads();
        if (global.Game.getMode() === 'playing') { togglePause(); }
      }
    });
  }

  function bindGestureGuards() {
    // Block pinch zoom, double-tap zoom, long-press menus and rubber-banding.
    ['gesturestart', 'gesturechange', 'gestureend'].forEach(function (evt) {
      document.addEventListener(evt, function (e) { e.preventDefault(); }, { passive: false });
    });
    document.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    document.addEventListener('dragstart', function (e) { e.preventDefault(); });
    document.addEventListener('touchmove', function (e) {
      // Allow scrolling only inside panels that opt in.
      var n = e.target;
      while (n && n !== document.body) {
        if (n.classList && (n.classList.contains('scroll-body') ||
            n.classList.contains('zone-list') || n.classList.contains('result-facts'))) {
          return;
        }
        n = n.parentNode;
      }
      e.preventDefault();
    }, { passive: false });

    var lastTouch = 0;
    document.addEventListener('touchend', function (e) {
      var now = Date.now();
      if (now - lastTouch < 320) { e.preventDefault(); }
      lastTouch = now;
    }, { passive: false });
  }

  /* --------------------------------------------------------------- wiring */

  function grab() {
    el = {
      hud: document.getElementById('hud'),
      touch: document.getElementById('touch-controls'),
      moisture: document.getElementById('moisture-row'),
      pips: document.getElementById('fact-pips'),
      zoneName: document.getElementById('zone-name'),
      score: document.getElementById('score-value'),
      scorePlate: document.querySelector('.score-plate'),
      gaugeFill: document.getElementById('gauge-fill'),
      gaugeMarker: document.getElementById('gauge-marker'),
      depthValue: document.getElementById('depth-value'),

      toast: document.getElementById('toast'),
      toastIcon: document.getElementById('toast-icon'),
      toastTitle: document.getElementById('toast-title'),
      toastText: document.getElementById('toast-text'),

      zoneList: document.getElementById('zone-list'),
      totalFacts: document.getElementById('total-facts'),

      toggleMusic: document.getElementById('toggle-music'),
      toggleSfx: document.getElementById('toggle-sfx'),
      musicIcon: document.getElementById('music-icon'),
      sfxIcon: document.getElementById('sfx-icon'),
      musicSource: document.getElementById('music-source'),

      resultTitle: document.getElementById('result-title'),
      resultSub: document.getElementById('result-sub'),
      resultStars: document.getElementById('result-stars'),
      resultScore: document.getElementById('result-score'),
      resultFacts: document.getElementById('result-facts'),
      resultMoisture: document.getElementById('result-moisture'),
      resultDepth: document.getElementById('result-depth'),
      factsList: document.getElementById('result-facts-list'),
      crest: document.getElementById('result-crest-img'),
      btnNext: document.getElementById('btn-next'),

      lifecycle: document.getElementById('lifecycle-list'),
      glossary: document.getElementById('glossary-list'),
      ecology: document.getElementById('ecology-list'),
      allFacts: document.getElementById('all-facts'),

      bootFill: document.getElementById('boot-fill'),
      bootStatus: document.getElementById('boot-status')
    };
  }

  function on(id, fn) {
    var node = document.getElementById(id);
    if (node) {
      node.addEventListener('click', function (e) {
        e.preventDefault();
        Sound.unlock();
        fn();
      });
    }
  }

  function bindButtons() {
    on('btn-play', function () { Sound.play('ui'); buildZoneList(); show('screen-zones'); });
    on('btn-howto', function () { Sound.play('ui'); show('screen-howto'); });
    on('btn-settings', function () { Sound.play('ui'); applySettings(); show('screen-settings'); });

    Array.prototype.forEach.call(document.querySelectorAll('[data-back]'), function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        Sound.play('back');
        show(btn.getAttribute('data-back'));
      });
    });

    on('btn-pause', togglePause);
    on('btn-resume', togglePause);
    on('btn-restart-zone', function () { Sound.play('ui'); beginZone(currentZone); });
    on('btn-quit', function () { Sound.play('back'); toMenu(); });

    on('btn-retry', function () { Sound.play('ui'); beginZone(currentZone); });
    on('btn-next', function () {
      Sound.play('ui');
      beginZone(Math.min(currentZone + 1, D.ZONES.length - 1));
    });
    on('btn-result-menu', function () { Sound.play('back'); toMenu(); });
    on('btn-learn', function () {
      Sound.play('ui');
      buildLearnMore();
      show('screen-learn');
    });
    on('btn-learn-back', function () { Sound.play('back'); show('screen-result'); });

    el.toggleMusic.addEventListener('click', function () {
      Sound.unlock();
      save.settings.music = !save.settings.music;
      persist();
      applySettings();
      if (save.settings.music) { Sound.startMusic(); }
      Sound.play('ui');
    });

    el.toggleSfx.addEventListener('click', function () {
      Sound.unlock();
      save.settings.sfx = !save.settings.sfx;
      persist();
      applySettings();
      Sound.play('ui');
    });

    on('btn-reset', function () {
      save = defaultSave();
      persist();
      applySettings();
      buildZoneList();
      Sound.play('back');
      el.musicSource.textContent = 'Progress cleared. Start again from Zone 1.';
    });
  }

  /* ----------------------------------------------------------------- boot */

  function bootProgress(pct, text) {
    if (el.bootFill) { el.bootFill.style.width = pct + '%'; }
    if (el.bootStatus && text) { el.bootStatus.textContent = text; }
  }

  function init() {
    grab();
    save = loadSave();

    var canvas = document.getElementById('game-canvas');

    global.Game.init({
      canvas: canvas,
      onHud: onHud,
      onFact: onFact,
      onWarn: onWarn,
      onEnd: function (result) {
        // Let the last beat of feedback land before the panel slides in.
        setTimeout(function () { onEnd(result); }, result.win ? 260 : 700);
      }
    });

    bindCanvasDrag(canvas);
    bindPad(document.getElementById('pad-left'), 'left');
    bindPad(document.getElementById('pad-right'), 'right');
    bindPad(document.getElementById('pad-dive'), 'down');
    bindKeyboard();
    bindGestureGuards();
    bindButtons();

    buildHudSkeleton();
    applySettings();
    global.Game.attract();
  }

  global.UI = {
    init: init,
    bootProgress: bootProgress,
    toMenu: function () {
      buildZoneList();
      applySettings();
      show('screen-menu');
    }
  };
})(window);
