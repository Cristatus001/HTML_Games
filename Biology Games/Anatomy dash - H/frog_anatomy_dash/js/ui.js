/* All DOM: screens, HUD, quiz panel, settings, zone select, touch pads.
   Gameplay logic lives in game.js; this module only presents it.             */
(function (global) {
  'use strict';

  var D = global.document;
  function $(id) { return D.getElementById(id); }

  var el = {};
  var overlayStack = [];      /* modal ids currently open, last is on top */
  var quizState = null;
  var lastResult = null;

  function cacheEls() {
    ['screenBoot', 'bootBar', 'bootPct',
     'screenMenu', 'btnPlay', 'btnPlayLabel', 'btnLevels', 'btnHow', 'btnMenuSettings',
     'menuSeals', 'menuCleared',
     'screenLevels', 'zoneGrid', 'btnLevelsBack',
     'modalHow', 'btnHowClose', 'howObjective', 'howControls', 'howTips',
     'modalSettings', 'btnSettingsClose', 'toggleMusic', 'toggleMusicIcon',
     'toggleSfx', 'toggleSfxIcon', 'btnResetSave', 'resetNote',
     'modalPause', 'btnResume', 'btnRestartZone', 'btnPauseHow', 'btnPauseMenu',
     'modalQuiz', 'quizBadge', 'quizBadgeIcon', 'quizBadgeText', 'quizImg',
     'quizFallback', 'quizText', 'quizOptions', 'quizFeedback', 'quizFeedbackIcon',
     'quizFeedbackText',
     'screenResult', 'resultTitle', 'resultSub', 'resultSeals', 'resultTime',
     'resultOrbs', 'resultMisses', 'resultBest', 'btnLearnMore', 'btnNextZone',
     'btnReplayZone', 'btnResultMenu',
     'modalLearn', 'btnLearnClose', 'learnTitle', 'learnIntro', 'learnList',
     'hud', 'hudCrest', 'hudZoneName', 'hudZoneSub', 'hudOrbCount', 'orbTrack',
     'hudTime', 'btnPause', 'btnHudSettings',
     'touchControls', 'padLeft', 'padRight', 'padJump',
     'zoneFlash', 'zoneFlashCrest', 'zoneFlashName', 'zoneFlashSub'
    ].forEach(function (id) { el[id] = $(id); });
  }

  /* ------------------------------------------------------------- screens */

  function showScreen(id) {
    ['screenBoot', 'screenMenu', 'screenLevels', 'screenResult'].forEach(function (s) {
      el[s].classList.toggle('is-active', s === id);
    });
  }

  function hideScreens() { showScreen(''); }

  function openModal(id) {
    if (overlayStack.indexOf(id) === -1) overlayStack.push(id);
    el[id].classList.add('is-active');
  }

  function closeModal(id) {
    var i = overlayStack.indexOf(id);
    if (i !== -1) overlayStack.splice(i, 1);
    el[id].classList.remove('is-active');
  }

  function anyModalOpen() { return overlayStack.length > 0; }

  function topModal() { return overlayStack[overlayStack.length - 1] || null; }

  /* ---------------------------------------------------------------- boot */

  function setBootProgress(f) {
    var pct = Math.round(Math.max(0, Math.min(1, f)) * 100);
    el.bootBar.style.width = pct + '%';
    el.bootPct.textContent = pct + '%';
  }

  /* ---------------------------------------------------------------- HUD */

  function buildOrbTrack(total) {
    el.orbTrack.innerHTML = '';
    for (var i = 0; i < total; i++) {
      var pip = D.createElement('span');
      pip.className = 'orb-pip';
      el.orbTrack.appendChild(pip);
    }
  }

  function setHudZone(zone, index) {
    el.hudCrest.src = global.Assets.icon(zone.crest);
    el.hudZoneName.textContent = zone.name;
    el.hudZoneSub.textContent = 'Zone ' + (index + 1);
  }

  function setHudOrbs(collected, total) {
    el.hudOrbCount.textContent = String(collected);
    var pips = el.orbTrack.children;
    for (var i = 0; i < pips.length; i++) {
      pips[i].classList.toggle('is-on', i < collected);
    }
  }

  function fmtTime(ms) {
    var s = Math.max(0, Math.floor(ms / 1000));
    var m = Math.floor(s / 60);
    var r = s % 60;
    return m + ':' + (r < 10 ? '0' : '') + r;
  }

  function setHudTime(ms) { el.hudTime.textContent = fmtTime(ms); }

  function showHud(on) {
    el.hud.classList.toggle('is-on', !!on);
    el.hud.setAttribute('aria-hidden', on ? 'false' : 'true');
  }

  function flashZone(zone, index) {
    el.zoneFlashCrest.src = global.Assets.icon(zone.crest);
    el.zoneFlashName.textContent = zone.name;
    el.zoneFlashSub.textContent = 'Zone ' + (index + 1) + ' — ' + zone.subtitle;
    el.zoneFlash.classList.remove('is-on');
    /* force reflow so the animation restarts */
    void el.zoneFlash.offsetWidth;
    el.zoneFlash.classList.add('is-on');
  }

  /* --------------------------------------------------------------- menu */

  function refreshMenu() {
    var zones = global.GameData.ZONES;
    el.menuSeals.textContent = String(global.Save.totalSeals());
    el.menuCleared.textContent = String(global.Save.clearedCount());
    var cleared = global.Save.clearedCount();
    el.btnPlayLabel.textContent = cleared > 0 ? 'CONTINUE' : 'START ADVENTURE';
    el.btnPlay.title = 'Zone ' + (Math.min(cleared, zones.length - 1) + 1);
  }

  /* Highest unlocked zone, so PLAY continues where the player left off. */
  function nextZoneIndex() {
    var zones = global.GameData.ZONES;
    for (var i = 0; i < zones.length; i++) {
      if (!global.Save.zone(zones[i].id).cleared) return i;
    }
    return zones.length - 1;
  }

  function buildZoneGrid() {
    var zones = global.GameData.ZONES;
    el.zoneGrid.innerHTML = '';

    zones.forEach(function (zone, index) {
      var unlocked = global.Save.isUnlocked(index);
      var rec = global.Save.zone(zone.id);

      var card = D.createElement('button');
      card.type = 'button';
      card.className = 'zone-card' + (unlocked ? '' : ' is-locked');
      card.disabled = !unlocked;

      var idx = D.createElement('span');
      idx.className = 'zone-index';
      idx.textContent = 'ZONE ' + (index + 1);
      card.appendChild(idx);

      if (!unlocked) {
        var lock = D.createElement('img');
        lock.className = 'zone-lock';
        lock.src = global.Assets.icon('lock');
        lock.alt = 'Locked';
        card.appendChild(lock);
      }

      var crest = D.createElement('img');
      crest.className = 'zone-crest';
      crest.src = global.Assets.icon(zone.crest);
      crest.alt = '';
      card.appendChild(crest);

      var h3 = D.createElement('h3');
      h3.textContent = zone.name;
      card.appendChild(h3);

      var p = D.createElement('p');
      p.textContent = unlocked ? zone.subtitle : 'Clear zone ' + index + ' to unlock';
      card.appendChild(p);

      var seals = D.createElement('span');
      seals.className = 'zone-seals';
      for (var s = 0; s < 3; s++) {
        var img = D.createElement('img');
        var earned = rec.seals > s;
        img.src = global.Assets.icon(earned ? 'star-filled' : 'star-empty');
        img.alt = '';
        if (earned) img.className = 'is-on';
        seals.appendChild(img);
      }
      card.appendChild(seals);

      var best = D.createElement('span');
      best.className = 'zone-best';
      best.textContent = rec.cleared ? 'BEST ' + fmtTime(rec.bestTimeMs) : 'NOT CLEARED';
      card.appendChild(best);

      if (unlocked) {
        card.addEventListener('click', function () {
          global.Sound.play('click');
          global.Game.startZone(index);
        });
      }
      el.zoneGrid.appendChild(card);
    });
  }

  /* -------------------------------------------------------- how to play */

  function buildHowToPlay() {
    var h = global.GameData.HOW_TO_PLAY;
    el.howObjective.textContent = h.objective;

    el.howControls.innerHTML = '';
    h.rows.forEach(function (row) {
      var li = D.createElement('li');
      var img = D.createElement('img');
      img.src = global.Assets.icon(row.icon);
      img.alt = '';
      var b = D.createElement('b');
      b.textContent = row.label;
      var span = D.createElement('span');
      span.textContent = row.text;
      li.appendChild(img); li.appendChild(b); li.appendChild(span);
      el.howControls.appendChild(li);
    });

    el.howTips.innerHTML = '';
    h.tips.forEach(function (tip) {
      var li = D.createElement('li');
      li.textContent = tip;
      el.howTips.appendChild(li);
    });
  }

  /* ------------------------------------------------------------- settings */

  function syncSettings() {
    var s = global.Save.settings();
    el.toggleMusic.setAttribute('aria-pressed', s.music ? 'true' : 'false');
    el.toggleSfx.setAttribute('aria-pressed', s.sfx ? 'true' : 'false');
    el.toggleMusicIcon.src = global.Assets.icon(s.music ? 'music-on' : 'music-off');
    el.toggleSfxIcon.src = global.Assets.icon(s.sfx ? 'sound-on' : 'sound-off');
    global.Sound.setMusic(s.music);
    global.Sound.setSfx(s.sfx);
  }

  /* ------------------------------------------------------------------ quiz */

  var LETTERS = ['A', 'B', 'C', 'D'];

  /* Draws the fallback illustration when a question PNG is unavailable. */
  function drawQuizFallback(canvas, orb) {
    var ctx = canvas.getContext('2d');
    var w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    var g = ctx.createRadialGradient(w * 0.4, h * 0.34, 8, w / 2, h / 2, w * 0.52);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.45, '#46e6c8');
    g.addColorStop(1, '#0d5b52');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, w * 0.36, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,243,201,0.7)';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#04231f';
    ctx.font = '700 46px Oswald, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(orb.id), w / 2, h / 2 + 2);
  }

  function showQuiz(orb, isHots, onCorrect, onWrong) {
    quizState = { orb: orb, answered: false, missed: false };

    el.quizBadge.classList.toggle('is-hots', !!isHots);
    el.quizBadgeIcon.src = global.Assets.icon(isHots ? 'hots' : 'orb');
    el.quizBadgeText.textContent = isHots ? 'HOTS Challenge' : 'Anatomy Check';

    var frame = el.quizImg.parentNode;
    if (global.Assets.has('qz:' + orb.art)) {
      frame.classList.remove('use-fallback');
      el.quizImg.src = 'assets/images/questions/' + orb.art + '.png';
      el.quizImg.alt = orb.art + ' illustration';
    } else {
      frame.classList.add('use-fallback');
      drawQuizFallback(el.quizFallback, orb);
    }

    el.quizText.textContent = orb.q;
    el.quizFeedback.className = 'quiz-feedback';
    el.quizFeedbackText.textContent = '';
    el.quizOptions.innerHTML = '';

    orb.opts.forEach(function (text, index) {
      var btn = D.createElement('button');
      btn.type = 'button';
      btn.className = 'quiz-option';

      var key = D.createElement('span');
      key.className = 'key';
      key.textContent = LETTERS[index] || String(index + 1);
      btn.appendChild(key);

      var label = D.createElement('span');
      label.textContent = text;
      btn.appendChild(label);

      /* The letter chip becomes a verdict icon once the option is judged. */
      function verdict(name) {
        key.textContent = '';
        var mark = D.createElement('img');
        mark.src = global.Assets.icon(name);
        mark.alt = '';
        key.innerHTML = '';
        key.appendChild(mark);
      }

      btn.addEventListener('click', function () {
        if (quizState.answered) return;

        if (index === orb.ans) {
          quizState.answered = true;
          btn.classList.add('is-correct');
          verdict('check');
          el.quizFeedback.className = 'quiz-feedback is-on ok';
          el.quizFeedbackIcon.src = global.Assets.icon('frog-happy');
          el.quizFeedbackText.textContent = 'Correct — orb absorbed';
          global.Sound.play('correct');
          disableOptions();
          global.setTimeout(function () {
            closeModal('modalQuiz');
            if (onCorrect) onCorrect(quizState.missed);
          }, 800);
        } else {
          btn.classList.remove('is-wrong');
          void btn.offsetWidth;
          btn.classList.add('is-wrong');
          verdict('cross');
          quizState.missed = true;
          el.quizFeedback.className = 'quiz-feedback is-on bad';
          el.quizFeedbackIcon.src = global.Assets.icon('frog-worried');
          el.quizFeedbackText.textContent = 'Not quite — try again';
          global.Sound.play('wrong');
          if (onWrong) onWrong();
        }
      });

      el.quizOptions.appendChild(btn);
    });

    openModal('modalQuiz');
    global.Sound.play('open');
    global.Sound.duck(true);
  }

  function disableOptions() {
    var opts = el.quizOptions.children;
    for (var i = 0; i < opts.length; i++) opts[i].disabled = true;
  }

  /* ---------------------------------------------------------------- result */

  function showResult(data) {
    lastResult = data;
    var zones = global.GameData.ZONES;
    var isLast = data.zoneIndex >= zones.length - 1;

    el.resultTitle.textContent = data.seals === 3 ? 'Flawless Climb' : 'Zone Cleared';
    el.resultSub.innerHTML = '';
    var sub = D.createElement('span');
    sub.textContent = 'You mastered ' + data.zone.name + ' — ' + data.zone.subtitle + '.';
    el.resultSub.appendChild(sub);

    el.resultSeals.innerHTML = '';
    for (var i = 0; i < 3; i++) {
      var img = D.createElement('img');
      var on = i < data.seals;
      img.src = global.Assets.icon(on ? 'star-filled' : 'star-empty');
      img.alt = on ? 'Seal earned' : 'Seal not earned';
      if (on) {
        img.className = 'is-on';
        img.style.animationDelay = (0.15 + i * 0.18) + 's';
      }
      el.resultSeals.appendChild(img);
    }

    el.resultTime.textContent = fmtTime(data.timeMs);
    el.resultOrbs.textContent = String(data.orbs);
    el.resultMisses.textContent = String(data.misses);

    var rec = global.Save.zone(data.zone.id);
    el.resultBest.textContent = data.improved
      ? 'NEW PERSONAL BEST'
      : 'BEST ' + fmtTime(rec.bestTimeMs) + ' · ' + rec.seals + ' SEALS';

    el.btnNextZone.disabled = isLast;
    el.btnNextZone.querySelector('span').textContent = isLast ? 'ALL ZONES DONE' : 'NEXT ZONE';

    showScreen('screenResult');
  }

  /* ------------------------------------------------------------ learn more */

  function showLearn(zone) {
    var learn = zone.learn;
    el.learnTitle.textContent = learn.title || 'Field Notes';
    el.learnIntro.textContent = learn.intro || '';
    el.learnIntro.style.display = learn.intro ? '' : 'none';

    el.learnList.innerHTML = '';
    learn.entries.forEach(function (entry) {
      var item = D.createElement('div');
      item.className = 'learn-item';

      var fig = D.createElement('div');
      fig.className = 'learn-figure';
      if (global.Assets.has('qz:' + entry.art)) {
        var img = D.createElement('img');
        img.src = 'assets/images/questions/' + entry.art + '.png';
        img.alt = '';
        fig.appendChild(img);
      } else {
        var dot = D.createElement('span');
        dot.textContent = entry.term.charAt(0);
        dot.style.font = '700 24px Oswald, sans-serif';
        dot.style.color = '#46310f';
        fig.appendChild(dot);
      }
      item.appendChild(fig);

      var text = D.createElement('div');
      text.className = 'learn-text';
      var b = D.createElement('b');
      b.textContent = entry.term;
      var span = D.createElement('span');
      span.textContent = entry.text;
      text.appendChild(b); text.appendChild(span);
      item.appendChild(text);

      el.learnList.appendChild(item);
    });

    openModal('modalLearn');
  }

  /* --------------------------------------------------------- touch pads */

  var padsVisible = false;

  function showPads(on) {
    padsVisible = !!on;
    el.touchControls.classList.toggle('is-on', padsVisible);
    el.touchControls.setAttribute('aria-hidden', padsVisible ? 'false' : 'true');
  }

  /* Pointer Events give one code path for touch, pen and mouse. */
  function bindPad(node, key) {
    function down(e) {
      e.preventDefault();
      node.classList.add('is-down');
      if (node.setPointerCapture && e.pointerId !== undefined) {
        try { node.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      }
      global.Game.setKey(key, true);
    }
    function up(e) {
      if (e) e.preventDefault();
      node.classList.remove('is-down');
      global.Game.setKey(key, false);
    }
    node.addEventListener('pointerdown', down);
    node.addEventListener('pointerup', up);
    node.addEventListener('pointercancel', up);
    node.addEventListener('pointerleave', up);
    node.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  }

  /* ------------------------------------------------------------- wiring */

  function bind() {
    /* Menu */
    el.btnPlay.addEventListener('click', function () {
      global.Sound.play('click');
      global.Game.startZone(nextZoneIndex());
    });
    el.btnLevels.addEventListener('click', function () {
      global.Sound.play('click');
      buildZoneGrid();
      showScreen('screenLevels');
    });
    el.btnLevelsBack.addEventListener('click', function () {
      global.Sound.play('click');
      refreshMenu();
      showScreen('screenMenu');
    });
    el.btnHow.addEventListener('click', function () {
      global.Sound.play('click');
      openModal('modalHow');
    });
    el.btnHowClose.addEventListener('click', function () {
      global.Sound.play('click');
      closeModal('modalHow');
    });
    el.btnMenuSettings.addEventListener('click', function () {
      global.Sound.play('click');
      openModal('modalSettings');
    });
    el.btnSettingsClose.addEventListener('click', function () {
      global.Sound.play('click');
      closeModal('modalSettings');
    });

    /* Settings toggles */
    el.toggleMusic.addEventListener('click', function () {
      var on = el.toggleMusic.getAttribute('aria-pressed') !== 'true';
      global.Save.setSetting('music', on);
      syncSettings();
      global.Sound.play('click');
    });
    el.toggleSfx.addEventListener('click', function () {
      var on = el.toggleSfx.getAttribute('aria-pressed') !== 'true';
      global.Save.setSetting('sfx', on);
      syncSettings();
      if (on) global.Sound.play('click');
    });
    el.btnResetSave.addEventListener('click', function () {
      global.Save.reset();
      syncSettings();
      refreshMenu();
      buildZoneGrid();
      el.resetNote.textContent = 'Progress cleared.';
      global.Sound.play('wrong');
    });

    /* Pause */
    el.btnPause.addEventListener('click', function () {
      global.Sound.play('click');
      global.Game.pause();
    });
    el.btnHudSettings.addEventListener('click', function () {
      global.Sound.play('click');
      global.Game.pause();
      openModal('modalSettings');
    });
    el.btnResume.addEventListener('click', function () {
      global.Sound.play('click');
      global.Game.resume();
    });
    el.btnRestartZone.addEventListener('click', function () {
      global.Sound.play('click');
      global.Game.restartZone();
    });
    el.btnPauseHow.addEventListener('click', function () {
      global.Sound.play('click');
      openModal('modalHow');
    });
    el.btnPauseMenu.addEventListener('click', function () {
      global.Sound.play('click');
      global.Game.toMenu();
    });

    /* Result */
    el.btnLearnMore.addEventListener('click', function () {
      global.Sound.play('open');
      if (lastResult) showLearn(lastResult.zone);
    });
    el.btnLearnClose.addEventListener('click', function () {
      global.Sound.play('click');
      closeModal('modalLearn');
    });
    el.btnNextZone.addEventListener('click', function () {
      if (el.btnNextZone.disabled) return;
      global.Sound.play('click');
      global.Game.startZone(lastResult.zoneIndex + 1);
    });
    el.btnReplayZone.addEventListener('click', function () {
      global.Sound.play('click');
      global.Game.startZone(lastResult.zoneIndex);
    });
    el.btnResultMenu.addEventListener('click', function () {
      global.Sound.play('click');
      global.Game.toMenu();
    });

    /* Touch pads */
    bindPad(el.padLeft, 'left');
    bindPad(el.padRight, 'right');
    bindPad(el.padJump, 'up');
  }

  function init() {
    cacheEls();
    buildOrbTrack(global.GameData.ORBS_PER_ZONE);
    buildHowToPlay();
    bind();
    syncSettings();
    refreshMenu();
  }

  global.UI = {
    init: init,
    setBootProgress: setBootProgress,
    showScreen: showScreen,
    hideScreens: hideScreens,
    openModal: openModal,
    closeModal: closeModal,
    anyModalOpen: anyModalOpen,
    topModal: topModal,
    showHud: showHud,
    setHudZone: setHudZone,
    setHudOrbs: setHudOrbs,
    setHudTime: setHudTime,
    flashZone: flashZone,
    refreshMenu: refreshMenu,
    buildZoneGrid: buildZoneGrid,
    showQuiz: showQuiz,
    showResult: showResult,
    showLearn: showLearn,
    showPads: showPads,
    syncSettings: syncSettings,
    fmtTime: fmtTime
  };
})(window);
