/* ============================================================
   ui.js — screens, HUD, data views, modals, results.
   Owns every DOM read/write outside the rig itself.
   ============================================================ */
(function (global) {
  'use strict';

  var SVG_NS = 'http://www.w3.org/2000/svg';

  var current = 'boot';
  var openModal = null;
  var pendingConfirm = null;
  var sideOpen = false;
  var lastResult = null;

  var el = {};

  function $(id) { return document.getElementById(id); }

  function cache() {
    el.screens = {
      boot: $('screen-boot'),
      menu: $('screen-menu'),
      stages: $('screen-stages'),
      game: $('screen-game'),
      result: $('screen-result')
    };

    /* menu */
    el.menuBest = $('menu-best');
    el.menuGrades = $('menu-grades');
    el.menuTrials = $('menu-trials');
    el.menuProgressSub = $('menu-progress-sub');

    /* stage select */
    el.stageGrid = $('stage-grid');

    /* hud */
    el.hudKicker = $('hud-stage-kicker');
    el.hudName = $('hud-stage-name');
    el.hudObjective = $('hud-objective');
    el.hudPips = $('hud-pips');
    el.gaugeLast = $('gauge-last');
    el.gaugeMean = $('gauge-mean');
    el.gaugeRule = $('gauge-rule');

    /* prompt bar */
    el.promptText = $('prompt-text');
    el.btnMain = $('btn-main');
    el.btnMainLabel = $('btn-main-label');
    el.btnMainIco = $('btn-main-ico');
    el.btnFinish = $('btn-finish');

    /* data panel */
    el.sidePanel = $('side-panel');
    el.tableEmpty = $('table-empty');
    el.tableWrap = $('table-wrap');
    el.tableBody = $('table-body');
    el.statsEmpty = $('stats-empty');
    el.statsGrid = $('stats-grid');
    el.statMean = $('stat-mean');
    el.statMedian = $('stat-median');
    el.statStdDev = $('stat-stddev');
    el.chartBox = $('chart-box');
    el.freelabTools = $('freelab-tools');

    /* result */
    el.resultBadge = $('result-badge');
    el.resultTitle = $('result-title');
    el.resultSub = $('result-sub');
    el.gradeRow = $('grade-row');
    el.resultStats = $('result-stats');
    el.resultNote = $('result-note');
    el.resultChart = $('result-chart');
    el.btnNextStage = $('btn-next-stage');
    el.btnRetry = $('btn-retry');

    /* modals */
    el.modals = {
      howto: $('modal-howto'),
      learn: $('modal-learn'),
      settings: $('modal-settings'),
      confirm: $('modal-confirm')
    };
    el.confirmTitle = $('confirm-title');
    el.confirmMsg = $('confirm-msg');

    /* settings toggles */
    el.toggleMusic = $('toggle-music');
    el.toggleSfx = $('toggle-sfx');
    el.toggleMotion = $('toggle-motion');
    el.toggleMusicIco = $('toggle-music-ico');
    el.toggleSfxIco = $('toggle-sfx-ico');
    el.toggleMotionIco = $('toggle-motion-ico');

    el.toastStack = $('toast-stack');
    el.bootBar = $('boot-bar-fill');
    el.bootPct = $('boot-pct');
    el.bootLine = $('boot-line');
  }

  /* ============================================================
     screens
     ============================================================ */
  function show(name) {
    if (!el.screens[name] || current === name) return;
    var from = el.screens[current];
    var to = el.screens[name];

    if (from) {
      from.classList.add('is-leaving');
      setTimeout(function () {
        from.classList.remove('is-active', 'is-leaving');
      }, 300);
    }
    current = name;
    to.classList.add('is-active');

    if (name === 'menu') refreshMenu();
    if (name === 'stages') buildStageGrid();
    if (name === 'game') {
      /* Measure synchronously: the element is displayed as of the line
         above, and getBoundingClientRect forces the layout we need. Doing
         this only in a rAF would leave the rig mis-scaled for any frame
         the browser chooses not to paint — which is exactly what happens
         in a backgrounded WebView. The rAF pass afterwards just catches
         late font/scrollbar reflow. */
      global.Game.layout();
      global.Backdrop.resize();
      global.requestAnimationFrame(function () {
        global.Game.layout();
        global.Backdrop.resize();
      });
    }
  }

  function screen() { return current; }

  /* ============================================================
     boot
     ============================================================ */
  var BOOT_LINES = [
    'Powering instrument rail…',
    'Calibrating gravity constant…',
    'Zeroing the catch line…',
    'Loading rule set…',
    'Bench ready'
  ];

  function runBoot(done) {
    var pct = 0;
    var lineIx = 0;
    var t = setInterval(function () {
      pct = Math.min(100, pct + 4 + Math.random() * 9);
      if (el.bootBar) el.bootBar.style.width = pct + '%';
      if (el.bootPct) el.bootPct.textContent = Math.round(pct) + '%';

      var wantLine = Math.min(BOOT_LINES.length - 1, Math.floor(pct / 22));
      if (wantLine !== lineIx) {
        lineIx = wantLine;
        if (el.bootLine) el.bootLine.textContent = BOOT_LINES[lineIx];
      }

      if (pct >= 100) {
        clearInterval(t);
        setTimeout(function () { show('menu'); if (done) done(); }, 420);
      }
    }, 110);
  }

  /* ============================================================
     menu
     ============================================================ */
  function refreshMenu() {
    var totals = global.Save.totals();
    if (el.menuBest) {
      el.menuBest.textContent = totals.bestTime === null
        ? '—' : totals.bestTime.toFixed(3) + ' s';
    }
    if (el.menuGrades) {
      el.menuGrades.textContent = global.Save.totalGrades() + ' / ' + global.Levels.maxGrades;
    }
    if (el.menuTrials) el.menuTrials.textContent = String(totals.trials);
    if (el.menuProgressSub) {
      var cleared = global.Save.clearedCount();
      el.menuProgressSub.textContent = cleared === 0
        ? global.Levels.count + ' lab stages'
        : cleared + ' of ' + global.Levels.count + ' stages cleared';
    }
  }

  /* ============================================================
     stage select
     ============================================================ */
  function buildStageGrid() {
    if (!el.stageGrid) return;
    el.stageGrid.innerHTML = '';

    global.Levels.all.forEach(function (st, i) {
      var rec = global.Save.stage(st.id);
      var unlocked = global.Levels.isUnlocked(st.id);

      var card = document.createElement('button');
      card.type = 'button';
      card.className = 'stage-card' +
        (unlocked ? '' : ' is-locked') +
        (rec.cleared ? ' is-cleared' : '');
      card.setAttribute('data-stage', st.id);
      if (!unlocked) card.setAttribute('aria-disabled', 'true');

      /* rule specimen width hints at length: 30/50/100 cm */
      var specPct = Math.round((st.ruleCm / 100) * 100);

      var grades = '';
      for (var g = 1; g <= 3; g++) {
        grades += '<img src="' + global.Assets.icon(rec.grade >= g ? 'grade_on' : 'grade_off') +
          '" alt="" class="' + (rec.grade >= g ? 'is-on' : 'is-off') + '" />';
      }

      var best = rec.bestMean === null
        ? '<span class="stage-best">Not cleared</span>'
        : '<span class="stage-best">Best <b>' + rec.bestMean.toFixed(3) + ' s</b></span>';

      card.innerHTML =
        '<div class="stage-top">' +
          '<span class="stage-no">' + (i + 1) + '</span>' +
          '<span class="stage-name">' + st.name + '</span>' +
          (unlocked
            ? '<img src="' + global.Assets.icon('unlocked') + '" alt="" class="stage-lock" />'
            : '<img src="' + global.Assets.icon('lock') + '" alt="" class="stage-lock" />') +
        '</div>' +
        '<div class="stage-spec">' +
          '<span class="spec-rule" style="max-width:' + specPct + '%"></span>' +
          '<span class="spec-len">' + st.ruleCm + ' cm</span>' +
        '</div>' +
        '<p class="stage-goal">' + (unlocked ? st.goal : 'Clear stage ' + i + ' to unlock') + '</p>' +
        '<div class="stage-foot">' +
          '<span class="grade-set">' + grades + '</span>' +
          best +
        '</div>';

      el.stageGrid.appendChild(card);
    });
  }

  /* ============================================================
     HUD
     ============================================================ */
  function refreshHud() {
    var st = global.Game.stage;
    if (!st) return;

    var idx = global.Levels.indexOf(st.id);
    if (el.hudKicker) {
      el.hudKicker.textContent = st.isFree ? 'Open session' : 'Stage ' + (idx + 1);
    }
    if (el.hudName) el.hudName.textContent = st.name;
    if (el.hudObjective) el.hudObjective.innerHTML = st.goal;
    if (el.gaugeRule) el.gaugeRule.textContent = st.ruleCm + ' cm';

    var trials = global.Game.trials;
    var stats = global.Game.computeStats(trials);

    if (el.gaugeLast) {
      el.gaugeLast.textContent = trials.length
        ? trials[trials.length - 1].time.toFixed(3) : '—';
    }
    if (el.gaugeMean) {
      el.gaugeMean.textContent = stats.n ? stats.mean.toFixed(3) : '—';
      /* colour the mean against the stage target while playing */
      var bad = false;
      if (!st.isFree && st.metric === 'mean' && stats.n >= 1) bad = stats.mean > st.pass;
      if (!st.isFree && st.metric === 'spread' && stats.n >= 2) bad = stats.stdDev > st.pass;
      el.gaugeMean.classList.toggle('is-bad', bad);
    }

    buildPips(st, trials.length);
  }

  function buildPips(st, done) {
    if (!el.hudPips) return;
    if (st.isFree) {
      /* an open session shows a running count instead of a fixed track */
      el.hudPips.innerHTML = '';
      var n = document.createElement('span');
      n.className = 'gauge';
      n.innerHTML = '<span class="gauge-k">Trials</span><span class="gauge-v">' + done + '</span>';
      el.hudPips.appendChild(n);
      return;
    }

    var want = st.trials;
    if (el.hudPips.childElementCount !== want ||
        !el.hudPips.firstElementChild ||
        !el.hudPips.firstElementChild.classList.contains('pip')) {
      el.hudPips.innerHTML = '';
      for (var i = 0; i < want; i++) {
        var p = document.createElement('span');
        p.className = 'pip';
        el.hudPips.appendChild(p);
      }
    }
    var kids = el.hudPips.children;
    for (var k = 0; k < kids.length; k++) {
      kids[k].className = 'pip' +
        (k < done ? ' is-done' : (k === done ? ' is-active' : ''));
    }
  }

  /* ============================================================
     prompt bar
     ============================================================ */
  var PROMPTS = {
    idle: {
      label: 'Arm the Rig', icon: 'play',
      text: 'Press <strong>Arm the Rig</strong> to load the ruler.'
    },
    armed: {
      label: 'Get Ready…', icon: 'timer',
      text: 'Watch the ruler — it drops at any moment.', tone: 'is-urgent'
    },
    dropping: {
      label: 'Catch!', icon: 'bolt',
      text: 'Tap anywhere or press a key <strong>now</strong>.', tone: 'is-urgent'
    }
  };

  function refreshPrompt() {
    var st = global.Game.stage;
    var s = global.Game.state;
    if (!st || !el.btnMain) return;

    var cfg = PROMPTS[s];
    var trials = global.Game.trials;
    var tone = '';

    if (s === 'caught') {
      var last = trials[trials.length - 1];
      cfg = {
        label: global.Game.isSessionComplete() ? 'See Results' : 'Next Trial',
        icon: global.Game.isSessionComplete() ? 'check' : 'retry',
        text: 'Caught at <strong>' + last.distance.toFixed(1) + ' cm</strong> — ' +
              '<span class="big">' + last.time.toFixed(3) + ' s</span>'
      };
      tone = 'is-good';
    } else if (s === 'missed') {
      cfg = {
        label: 'Try Again', icon: 'retry',
        text: 'It slipped through. The <strong>' + st.ruleCm + ' cm</strong> rule ' +
              'cannot measure past ' + global.Levels.timeFor(st.ruleCm).toFixed(3) + ' s.'
      };
      tone = 'is-bad';
    } else if (s === 'falsestart') {
      cfg = {
        label: 'Try Again', icon: 'retry',
        text: 'False start — you moved before the release. Nothing recorded.'
      };
      tone = 'is-bad';
    }

    if (!cfg) cfg = PROMPTS.idle;

    el.btnMainLabel.textContent = cfg.label;
    global.Assets.setIcon(el.btnMainIco, cfg.icon);
    el.btnMain.disabled = (s === 'armed' || s === 'dropping');

    el.promptText.innerHTML = cfg.text;
    el.promptText.className = 'prompt-text ' + (tone || cfg.tone || '');

    /* Free Lab can be closed out at any point once there is data */
    var showFinish = st.isFree && trials.length > 0 &&
      (s === 'idle' || s === 'caught' || s === 'missed' || s === 'falsestart');
    el.btnFinish.classList.toggle('hidden', !showFinish);
  }

  /* ============================================================
     data views
     ============================================================ */
  function refreshData() {
    var trials = global.Game.trials;
    var stats = global.Game.computeStats(trials);
    var has = trials.length > 0;

    /* table */
    if (el.tableEmpty) el.tableEmpty.classList.toggle('hidden', has);
    if (el.tableWrap) el.tableWrap.classList.toggle('hidden', !has);
    if (has && el.tableBody) {
      var best = stats.best;
      el.tableBody.innerHTML = trials.map(function (t) {
        var isBest = trials.length > 1 && t.time === best;
        return '<tr' + (isBest ? ' class="is-best"' : '') + '>' +
          '<td>' + t.id + '</td>' +
          '<td>' + t.distance.toFixed(1) + '</td>' +
          '<td>' + t.time.toFixed(3) + '</td>' +
        '</tr>';
      }).join('');
      /* keep the newest row in view */
      if (el.tableWrap) el.tableWrap.scrollTop = el.tableWrap.scrollHeight;
    }

    /* stats — shown from 2 trials, as in the original lab */
    var showStats = trials.length >= 2;
    if (el.statsEmpty) el.statsEmpty.classList.toggle('hidden', showStats);
    if (el.statsGrid) el.statsGrid.classList.toggle('hidden', !showStats);
    if (showStats) {
      el.statMean.textContent = stats.mean.toFixed(3);
      el.statMedian.textContent = stats.median.toFixed(3);
      el.statStdDev.textContent = stats.stdDev.toFixed(3);
    }

    /* chart */
    renderChart(el.chartBox, trials, global.Game.stage);

    /* Reset All Data belongs to the persistent Free Lab data set */
    if (el.freelabTools) {
      var st = global.Game.stage;
      el.freelabTools.classList.toggle('hidden', !(st && st.isFree && has));
    }
  }

  /* ---------------- chart ---------------- */
  function renderChart(box, trials, stage) {
    if (!box) return;
    box.innerHTML = '';

    if (!trials || trials.length < 2) {
      var msg = document.createElement('p');
      msg.className = 'chart-empty';
      msg.textContent = 'Complete at least 2 trials to plot the session.';
      box.appendChild(msg);
      return;
    }

    var W = box.clientWidth || 300;
    var H = box.clientHeight || 176;
    var PAD = { top: 14, right: 12, bottom: 26, left: 40 };
    var cw = Math.max(20, W - PAD.left - PAD.right);
    var ch = Math.max(20, H - PAD.top - PAD.bottom);

    var times = trials.map(function (t) { return t.time; });
    var maxTime = Math.max.apply(null, times);

    /* include the stage target in the scale so the line is always visible */
    var target = null;
    if (stage && !stage.isFree && stage.metric === 'mean' && isFinite(stage.pass)) {
      target = stage.pass;
    }
    var top = Math.max(maxTime, target || 0);
    var yMax = Math.ceil(top * 10) / 10 || 0.1;
    if (yMax <= 0) yMax = 0.1;

    var svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.setAttribute('preserveAspectRatio', 'none');

    /* bar gradient — lit from the base */
    var defs = document.createElementNS(SVG_NS, 'defs');
    defs.innerHTML =
      '<linearGradient id="cbar" x1="0" y1="1" x2="0" y2="0">' +
        '<stop offset="0" stop-color="#0e7490"/>' +
        '<stop offset="0.55" stop-color="#22d3ee"/>' +
        '<stop offset="1" stop-color="#a5f3fc"/>' +
      '</linearGradient>' +
      '<linearGradient id="cbarBest" x1="0" y1="1" x2="0" y2="0">' +
        '<stop offset="0" stop-color="#0c8f63"/>' +
        '<stop offset="0.55" stop-color="#2fe3a0"/>' +
        '<stop offset="1" stop-color="#b6ffe2"/>' +
      '</linearGradient>';
    svg.appendChild(defs);

    var g = document.createElementNS(SVG_NS, 'g');
    g.setAttribute('transform', 'translate(' + PAD.left + ',' + PAD.top + ')');
    svg.appendChild(g);

    /* grid + y labels */
    for (var i = 0; i <= 4; i++) {
      var val = (yMax / 4) * i;
      var y = ch - (val / yMax) * ch;

      var line = document.createElementNS(SVG_NS, 'line');
      line.setAttribute('x1', -4);
      line.setAttribute('y1', y);
      line.setAttribute('x2', cw);
      line.setAttribute('y2', y);
      line.setAttribute('stroke', 'rgba(90,124,160,0.32)');
      line.setAttribute('stroke-dasharray', '3 4');
      g.appendChild(line);

      var lab = document.createElementNS(SVG_NS, 'text');
      lab.textContent = val.toFixed(2);
      lab.setAttribute('x', -8);
      lab.setAttribute('y', y + 3.5);
      lab.setAttribute('text-anchor', 'end');
      lab.setAttribute('fill', '#6e849b');
      lab.setAttribute('font-size', '9');
      lab.setAttribute('font-family', 'Rajdhani,sans-serif');
      g.appendChild(lab);
    }

    /* bars */
    var slot = cw / trials.length;
    var bw = Math.max(3, Math.min(34, slot * 0.66));
    var best = Math.min.apply(null, times);

    trials.forEach(function (t, ix) {
      var bh = Math.max(1, (t.time / yMax) * ch);
      var x = ix * slot + (slot - bw) / 2;
      var y = ch - bh;

      var rect = document.createElementNS(SVG_NS, 'rect');
      rect.setAttribute('x', x.toFixed(2));
      rect.setAttribute('y', y.toFixed(2));
      rect.setAttribute('width', bw.toFixed(2));
      rect.setAttribute('height', bh.toFixed(2));
      rect.setAttribute('rx', Math.min(3, bw / 3).toFixed(2));
      rect.setAttribute('fill', t.time === best ? 'url(#cbarBest)' : 'url(#cbar)');
      g.appendChild(rect);

      /* x label, thinned out when the session is long */
      var every = trials.length > 14 ? Math.ceil(trials.length / 10) : 1;
      if (ix % every === 0 && slot > 14) {
        var xl = document.createElementNS(SVG_NS, 'text');
        xl.textContent = 'T' + t.id;
        xl.setAttribute('x', (x + bw / 2).toFixed(2));
        xl.setAttribute('y', ch + 14);
        xl.setAttribute('text-anchor', 'middle');
        xl.setAttribute('fill', '#6e849b');
        xl.setAttribute('font-size', '9');
        xl.setAttribute('font-family', 'Rajdhani,sans-serif');
        g.appendChild(xl);
      }
    });

    /* target line */
    if (target !== null) {
      var ty = ch - (target / yMax) * ch;
      var tl = document.createElementNS(SVG_NS, 'line');
      tl.setAttribute('x1', 0);
      tl.setAttribute('y1', ty);
      tl.setAttribute('x2', cw);
      tl.setAttribute('y2', ty);
      tl.setAttribute('stroke', '#ffb02e');
      tl.setAttribute('stroke-width', '1.5');
      tl.setAttribute('stroke-dasharray', '6 4');
      g.appendChild(tl);

      var tt = document.createElementNS(SVG_NS, 'text');
      tt.textContent = 'target';
      tt.setAttribute('x', cw - 2);
      tt.setAttribute('y', Math.max(9, ty - 4));
      tt.setAttribute('text-anchor', 'end');
      tt.setAttribute('fill', '#ffb02e');
      tt.setAttribute('font-size', '8.5');
      tt.setAttribute('font-family', 'Rajdhani,sans-serif');
      g.appendChild(tt);
    }

    box.appendChild(svg);
  }

  /* ============================================================
     side panel
     ============================================================ */
  function toggleSide(force) {
    var want = force === undefined ? !sideOpen : !!force;
    sideOpen = want;
    if (!el.sidePanel) return;
    el.sidePanel.classList.toggle('is-open', want);
    el.sidePanel.classList.remove('is-hidden');
    if (want) refreshData();
    /* the rig loses width on wide screens when the panel appears */
    global.Game.layout();
    global.Backdrop.resize();
    global.requestAnimationFrame(function () {
      global.Game.layout();
      global.Backdrop.resize();
    });
  }

  /* ============================================================
     result screen
     ============================================================ */
  function showResult() {
    var st = global.Game.stage;
    var trials = global.Game.trials;
    var stats = global.Game.computeStats(trials);
    var grade = global.Levels.grade(st, stats);
    var cleared = grade > 0;

    /* Free Lab is never pass/fail — it just reports the data set */
    if (st.isFree) cleared = trials.length > 0;

    lastResult = { stage: st, stats: stats, grade: grade, cleared: cleared };

    if (!st.isFree) {
      global.Save.recordStage(st.id, {
        cleared: cleared,
        grade: grade,
        mean: stats.mean
      });
    }

    /* banner */
    global.Assets.setIcon(el.resultBadge,
      st.isFree ? 'flask' : (cleared ? 'trophy' : 'warn'));
    el.resultTitle.textContent = st.isFree
      ? 'Session Report'
      : (cleared ? 'Stage Cleared' : 'Target Missed');
    el.resultTitle.classList.toggle('is-fail', !cleared && !st.isFree);
    el.resultSub.textContent = st.name + ' · ' + st.ruleCm + ' cm rule';

    /* grades */
    el.gradeRow.innerHTML = '';
    if (!st.isFree) {
      for (var i = 1; i <= 3; i++) {
        var img = document.createElement('img');
        img.src = global.Assets.icon(grade >= i ? 'grade_on' : 'grade_off');
        img.alt = '';
        img.className = grade >= i ? 'is-on' : 'is-off';
        el.gradeRow.appendChild(img);
      }
    }

    /* stat tiles */
    var tiles = [];
    if (stats.n) {
      tiles.push(['Trials', String(stats.n), '', '']);
      tiles.push(['Mean', stats.mean.toFixed(3), 's', 'tone-green']);
      tiles.push(['Median', stats.median.toFixed(3), 's', '']);
      tiles.push(['Std. Dev.', stats.stdDev.toFixed(3), 's', '']);
      tiles.push(['Best', stats.best.toFixed(3), 's', 'tone-green']);
    }
    if (global.Game.misses) tiles.push(['Slipped', String(global.Game.misses), '', 'tone-amber']);
    if (global.Game.falseStarts) tiles.push(['False starts', String(global.Game.falseStarts), '', 'tone-amber']);

    el.resultStats.innerHTML = tiles.map(function (t) {
      return '<div class="result-stat ' + t[3] + '">' +
        '<span class="rk">' + t[0] + '</span>' +
        '<span class="rv">' + t[1] + (t[2] ? '<em>' + t[2] + '</em>' : '') + '</span>' +
      '</div>';
    }).join('');

    /* verdict note */
    var note = global.Levels.verdict(st, stats);
    var extra = '';
    if (!st.isFree && !cleared) {
      extra = ' Retry the stage — your recorded best is kept either way.';
    } else if (!st.isFree && grade < 3) {
      extra = ' Sharpen the average for a higher grade.';
    }
    el.resultNote.innerHTML = note + extra;
    el.resultNote.className = 'result-note ' + (cleared ? 'tone-good' : 'tone-warn');

    /* next stage availability */
    var nxt = st.isFree ? null : global.Levels.next(st.id);
    el.btnNextStage.classList.toggle('hidden', !(cleared && nxt));

    show('result');
    /* the screen is displayed as of the call above, so measure and draw
       now rather than waiting on a frame that may never be painted */
    renderChart(el.resultChart, trials, st);
    global.requestAnimationFrame(function () {
      renderChart(el.resultChart, trials, st);
    });

    /* audio + a nudge if a new stage just opened up */
    if (st.isFree) {
      global.Sound.play('open');
    } else if (cleared) {
      global.Sound.play('stageClear');
      setTimeout(function () { global.Sound.play('grade', grade); }, 620);
      if (nxt) {
        setTimeout(function () {
          toast('Stage unlocked: ' + nxt.name, 'unlocked', 'tone-gold');
          global.Sound.play('unlock');
        }, 1100);
      }
    } else {
      global.Sound.play('stageFail');
    }
  }

  function lastResultInfo() { return lastResult; }

  /* ============================================================
     modals
     ============================================================ */
  function modal(name, on) {
    var m = el.modals[name];
    if (!m) return;

    if (on) {
      if (openModal && openModal !== name) modal(openModal, false);
      m.hidden = false;
      m.classList.remove('is-closing');
      /* applied synchronously — the open animation carries the fade in */
      m.classList.add('is-open');
      openModal = name;
      global.Sound.play('open');
    } else {
      m.classList.remove('is-open');
      m.classList.add('is-closing');
      setTimeout(function () {
        m.hidden = true;
        m.classList.remove('is-closing');
      }, 280);
      if (openModal === name) openModal = null;
    }
  }

  function anyModalOpen() { return openModal !== null; }

  function closeTopModal() {
    if (openModal) { modal(openModal, false); return true; }
    return false;
  }

  function confirm(title, msg, onYes) {
    if (el.confirmTitle) el.confirmTitle.textContent = title;
    if (el.confirmMsg) el.confirmMsg.textContent = msg;
    pendingConfirm = onYes;
    modal('confirm', true);
  }

  function resolveConfirm(yes) {
    var fn = pendingConfirm;
    pendingConfirm = null;
    modal('confirm', false);
    if (yes && typeof fn === 'function') fn();
  }

  /* ============================================================
     settings toggles
     ============================================================ */
  function syncToggles() {
    var s = global.Save.settings();
    setToggle(el.toggleMusic, el.toggleMusicIco, s.music, 'music_on', 'music_off');
    setToggle(el.toggleSfx, el.toggleSfxIco, s.sfx, 'sfx_on', 'sfx_off');
    setToggle(el.toggleMotion, el.toggleMotionIco, s.motion, 'spark', 'spark');
  }

  function setToggle(row, ico, on, iconOn, iconOff) {
    if (!row) return;
    row.setAttribute('aria-pressed', on ? 'true' : 'false');
    /* state swaps the image src — never emoji text */
    if (ico) global.Assets.setIcon(ico, on ? iconOn : iconOff);
  }

  /* ============================================================
     toasts
     ============================================================ */
  function toast(text, iconName, tone) {
    if (!el.toastStack) return;
    var t = document.createElement('div');
    t.className = 'toast ' + (tone || '');
    t.innerHTML = (iconName
      ? '<img src="' + global.Assets.icon(iconName) + '" alt="" />' : '') +
      '<span>' + text + '</span>';
    el.toastStack.appendChild(t);

    setTimeout(function () {
      t.classList.add('is-out');
      setTimeout(function () {
        if (t.parentNode) t.parentNode.removeChild(t);
      }, 320);
    }, 2100);

    /* never let toasts pile up unbounded */
    while (el.toastStack.childElementCount > 3) {
      el.toastStack.removeChild(el.toastStack.firstElementChild);
    }
  }

  /* ============================================================
     full refresh
     ============================================================ */
  function refreshGame() {
    refreshHud();
    refreshPrompt();
    refreshData();
  }

  global.UI = {
    init: cache,
    show: show,
    screen: screen,
    runBoot: runBoot,
    refreshMenu: refreshMenu,
    buildStageGrid: buildStageGrid,
    refreshGame: refreshGame,
    refreshHud: refreshHud,
    refreshPrompt: refreshPrompt,
    refreshData: refreshData,
    renderChart: renderChart,
    toggleSide: toggleSide,
    isSideOpen: function () { return sideOpen; },
    showResult: showResult,
    lastResult: lastResultInfo,
    modal: modal,
    anyModalOpen: anyModalOpen,
    closeTopModal: closeTopModal,
    confirm: confirm,
    resolveConfirm: resolveConfirm,
    syncToggles: syncToggles,
    toast: toast
  };
})(window);
