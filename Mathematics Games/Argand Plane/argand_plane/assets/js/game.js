/* Mirror River City — game flow, rules, HUD and screens. */
(function () {
  'use strict';
  var AP = window.AP, D = AP.DATA, World = AP.World, Snd = AP.Audio, FX = AP.FX;
  var ICON = 'assets/images/ui/icons/';
  var fmt = AP.fmtZ, num = AP.num;
  function $(id) { return document.getElementById(id); }
  function icon(n, cls) { return '<img src="' + ICON + n + '.png" alt=""' + (cls ? ' class="' + cls + '"' : '') + '>'; }
  function zbar(s) { return '<span class="bar">z</span>' + (s || ''); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function randInt(lo, hi) { return lo + Math.floor(Math.random() * (hi - lo + 1)); }

  var mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  AP.reducedMotion = function () { return !!mq.matches; };

  /* ================= persistence ================= */
  var KEY = 'mirrorRiverCity.v1';
  var store = (function () {
    var s = null;
    try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { s = null; }
    s = s && typeof s === 'object' ? s : {};
    s.best = s.best || {}; s.stars = s.stars || {};
    s.unlocked = clamp(s.unlocked || 1, 1, D.SECTORS.length);
    s.prefs = s.prefs || {}; if (s.prefs.music == null) s.prefs.music = true; if (s.prefs.sfx == null) s.prefs.sfx = true;
    return s;
  })();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) { /* private mode */ } }
  function totalStars() { var t = 0; for (var k in store.stars) t += store.stars[k] || 0; return t; }
  function totalBest() { var t = 0; for (var k in store.best) t += store.best[k] || 0; return t; }

  /* ================= state ================= */
  var G = AP.G = {
    active: false, level: 1, score: 0, scoreShown: 0, levelStartScore: 0, timeLeft: D.LEVEL_TIME,
    phase: 'IDLE', // INTRO, FIND_Z, MODULUS, FIND_CONJ, DONE, OVER
    paused: false, target: null, houses: [], onHouse: null,
    player: { x: 0, y: 0, rx: 0, ry: 0, dir: 0, hop: 0 },
    mistakes: 0, log: [], modTries: 0, taskElapsed: 0, assistRole: null, assistShown: false,
    introStart: 0, introT: 1, modLine: 0, conjLine: 0, zLabel: false, zbarLabel: false, celebrate: -1,
    held: null, holdT: 0, time: 0, reduced: false, earned: null, introTimer: null
  };

  /* ================= house layout ================= */
  function buildHouses(a, b, level) {
    var houses = [], taken = { '0,0': true }, decoys = 0;
    function add(x, y, role) {
      var k = x + ',' + y;
      if (taken[k] || y === 0) return false;
      taken[k] = true;
      houses.push({ x: x, y: y, role: role, look: 'dark', delay: 0 });
      if (role === 'decoy') decoys++;
      return true;
    }
    add(a, b, 'target');
    // The conjugate house exists from the start, dark like every other house, so its
    // appearance never gives the answer away (the original spawned it after Task 2).
    add(a, -b, 'conjugate');
    // Decoys on the classic mistakes: swapped parts and the wrong reflections.
    [[b, a], [-a, b], [-a, -b], [b, -a]].forEach(function (p) { add(p[0], p[1], 'decoy'); });
    var R = Math.max(9, Math.max(Math.abs(a), Math.abs(b)) + 2);
    var want = 12 + level * 3; // original decoy count
    for (var tries = 0; decoys < want && tries < 3000; tries++) add(randInt(-R, R), randInt(-R, R), 'decoy');
    houses.forEach(function (h) { h.delay = Math.min(0.5, Math.hypot(h.x, h.y) / (R * 1.45) * 0.5 + Math.random() * 0.05); });
    return houses;
  }
  function houseAt(x, y) {
    for (var i = 0; i < G.houses.length; i++) if (G.houses[i].x === x && G.houses[i].y === y) return G.houses[i];
    return null;
  }

  /* ================= screens ================= */
  function showScreen(id) {
    ['scr-boot', 'scr-menu', 'scr-levels'].forEach(function (s) { $(s).hidden = s !== id; });
  }
  function setPlayChrome(on) {
    $('hud').hidden = !on; $('side').hidden = !on; $('pos-chip').hidden = !on; $('controls').hidden = !on;
    document.body.classList.toggle('playing', on);
    layout();
  }

  function goMenu() {
    endLevelState();
    setPlayChrome(false);
    closeModal(true);
    $('menu-stars').textContent = totalStars();
    $('menu-best').textContent = totalBest();
    showScreen('scr-menu');
  }

  function goLevels() {
    endLevelState();
    setPlayChrome(false);
    closeModal(true);
    var grid = $('levels-grid'); grid.innerHTML = '';
    D.SECTORS.forEach(function (s) {
      var locked = s.id > store.unlocked, st = store.stars[s.id] || 0, best = store.best[s.id] || 0;
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'sector' + (locked ? ' locked' : st ? ' cleared' : ' open');
      b.disabled = locked;
      b.setAttribute('aria-label', 'Sector ' + s.id + ' ' + s.name + (locked ? ' (locked)' : ''));
      b.innerHTML =
        '<span class="sector-art"><img src="assets/images/art/sector-' + s.id + '.png" alt="" onerror="this.parentNode.hidden=true">' +
        (locked ? '<span class="sector-lock">' + icon('lock') + '</span>' : '') +
        '<span class="sector-num num">' + s.id + '</span></span>' +
        '<span class="sector-name">' + s.name + '</span>' +
        '<span class="sector-blurb">' + s.blurb + '</span>' +
        '<span class="sector-stars">' + [1, 2, 3].map(function (i) { return icon(i <= st ? 'star' : 'star-empty'); }).join('') + '</span>' +
        '<span class="sector-best">' + (locked ? icon('lock') + 'Locked' : icon('bolt') + '<b class="num">' + best + '</b> best') + '</span>';
      if (!locked) b.addEventListener('click', function () { Snd.sfx.click(); G.score = 0; showBrief(s.id); });
      grid.appendChild(b);
    });
    $('levels-stars').textContent = totalStars();
    showScreen('scr-levels');
  }

  /* ================= modal system ================= */
  var modalStack = [];
  function openModal(render, opts) {
    opts = opts || {};
    if (opts.push && modalStack.length) { /* keep stack */ } else if (!opts.push) modalStack = [];
    modalStack.push(render);
    paintModal();
  }
  function paintModal() {
    var render = modalStack[modalStack.length - 1];
    var panel = $('modal-panel');
    var spec = render();
    panel.className = 'plate modal-panel ' + (spec.cls || '');
    panel.innerHTML = spec.html;
    $('modal').hidden = false;
    panel.querySelectorAll('[data-act]').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.preventDefault();
        var fn = spec.actions && spec.actions[el.getAttribute('data-act')];
        if (fn) { Snd.sfx.click(); fn(el); }
      });
    });
    if (spec.after) spec.after(panel);
    var focusEl = panel.querySelector('[data-focus]') || panel.querySelector('[data-primary]');
    if (focusEl) setTimeout(function () { try { focusEl.focus({ preventScroll: true }); } catch (e) { focusEl.focus(); } }, 30);
  }
  function backModal() {
    modalStack.pop();
    if (modalStack.length) paintModal(); else closeModal(true);
  }
  function closeModal(all) {
    if (all) modalStack = [];
    $('modal').hidden = true;
    $('modal-panel').innerHTML = '';
  }
  function modalOpen() { return !$('modal').hidden; }

  /* ---------- Help (How to Play) ---------- */
  function helpModal() {
    return {
      cls: 'wide',
      html:
        '<h2>' + icon('help', 'h-icon') + 'How to Play</h2>' +
        '<div class="scroll">' +
        '<h3>Controls</h3>' +
        '<ul class="keys">' +
        '<li><span class="kbd">' + icon('arrow-up') + icon('arrow-down') + icon('arrow-left') + icon('arrow-right') + '</span><span>Drive one step on the grid: <b>arrow keys</b>, <b>WASD</b> or the on-screen pad. Hold to keep driving.</span></li>' +
        '<li><span class="kbd">' + icon('enter') + '</span><span>Check the house you are parked on: <b>Enter</b>, <b>Space</b> or the <b>Check</b> button.</span></li>' +
        '<li><span class="kbd">' + icon('pause') + '</span><span>Pause: <b>Esc</b>, <b>P</b> or the pause button. The clock stops.</span></li>' +
        '</ul>' +
        '<h3>The three tasks in every sector</h3>' +
        '<ol class="steps">' +
        '<li>' + icon('target') + '<div><b>Plot z.</b> The top bar shows a number like <span class="z">z = 3 + 4i</span>. Right is the real axis, up is the imaginary axis. Drive to that point and press Check.</div></li>' +
        '<li>' + icon('ruler') + '<div><b>Find |z|.</b> Reboot the station by typing its modulus <span class="z">|z| = √(a² + b²)</span>. Decimals are fine (within 0.05). The clock is paused while you think.</div></li>' +
        '<li>' + icon('mirror') + '<div><b>Reach ' + zbar() + '.</b> Reflect across the river (the real axis) to the conjugate <span class="z">' + zbar(' = a − ib') + '</span>, drive there and press Check.</div></li>' +
        '</ol>' +
        '<h3>Scoring</h3>' +
        '<ul class="score-rules">' +
        '<li>' + icon('bolt') + '<span><b class="num">+' + D.MODULUS_POINTS + '</b> for rebooting the station (correct |z|).</span></li>' +
        '<li>' + icon('bolt') + '<span><b class="num">+' + D.STABILIZE_POINTS + '</b> for stabilizing the grid at ' + zbar() + ', plus <b class="num">' + D.TIME_BONUS_PER_SEC + '</b> per second left on the clock.</span></li>' +
        '<li>' + icon('clock') + '<span>Each sector has <b class="num">' + D.LEVEL_TIME + '</b> seconds. If time runs out the grid fails and you retry the sector.</span></li>' +
        '<li>' + icon('star') + '<span>Stars: <b>3</b> with no mistakes, <b>2</b> with 1–2 mistakes, <b>1</b> with 3 or more. A mistake is checking the wrong house or a wrong modulus. Checking an empty street is not a mistake.</span></li>' +
        '<li>' + icon('hint') + '<span><b>Safety net:</b> if you spend ' + D.ASSIST_AFTER + ' seconds on Task 1 or Task 3, the house you need starts to pulse. It costs nothing.</span></li>' +
        '</ul></div>' +
        '<div class="modal-actions"><button class="btn btn-primary" data-act="back" data-primary type="button">' + icon('check') + 'Got it</button></div>',
      actions: { back: backModal }
    };
  }

  /* ---------- Settings ---------- */
  function settingsModal() {
    var armed = false;
    return {
      html:
        '<h2>' + icon('settings', 'h-icon') + 'Settings</h2>' +
        '<div class="toggles">' +
        toggleRow('music', 'Music', store.prefs.music) +
        toggleRow('sfx', 'Sound effects', store.prefs.sfx) +
        '</div>' +
        '<button class="btn btn-danger" data-act="reset" type="button">' + icon('replay') + '<span>Reset progress</span></button>' +
        '<p class="small-note">Reset clears scores, stars and unlocked sectors. Your sound settings are kept.</p>' +
        '<div class="modal-actions"><button class="btn btn-primary" data-act="back" data-primary type="button">' + icon('check') + 'Done</button></div>',
      actions: {
        back: backModal,
        music: function () { setPref('music', !store.prefs.music); paintModal(); },
        sfx: function () { setPref('sfx', !store.prefs.sfx); paintModal(); },
        reset: function (el) {
          if (!armed) { armed = true; el.querySelector('span').textContent = 'Tap again to confirm'; el.classList.add('armed'); return; }
          store.best = {}; store.stars = {}; store.unlocked = 1; save();
          el.querySelector('span').textContent = 'Progress cleared'; el.disabled = true;
          $('menu-stars').textContent = 0; $('menu-best').textContent = 0;
        }
      }
    };
  }
  function toggleRow(key, label, on) {
    var ic = key === 'music' ? (on ? 'music-on' : 'music-off') : (on ? 'sound-on' : 'sound-off');
    return '<button class="toggle ' + (on ? 'on' : '') + '" data-act="' + key + '" type="button" aria-pressed="' + on + '">' +
      icon(ic) + '<span>' + label + '</span><i class="switch"><i></i></i></button>';
  }
  function setPref(k, v) {
    store.prefs[k] = v; save();
    if (k === 'music') Snd.setMusic(v); else Snd.setSfx(v);
  }

  /* ---------- Sector briefing (the original "Mission briefing") ---------- */
  function showBrief(level) {
    var s = D.SECTORS[level - 1];
    showScreen(null);
    openModal(function () {
      return {
        cls: 'brief',
        html:
          '<p class="eyebrow">Sector <span class="num">' + level + '</span> of <span class="num">' + D.SECTORS.length + '</span></p>' +
          '<h2>' + s.name + '</h2>' +
          '<p class="lede">Power stations are failing at points <span class="z">z = a + ib</span>. This simulation has 3 tasks:</p>' +
          '<ol class="steps">' +
          D.TASKS.map(function (t) {
            return '<li>' + icon(t.icon) + '<div><b>' + t.title.replace('Task ' + t.id + ': ', '') + '</b><span>' + D.INSTRUCTIONS[t.id] + '</span></div></li>';
          }).join('') +
          '</ol>' +
          '<p class="small-note">' + icon('clock') + 'Watch the clock: <b class="num">' + D.LEVEL_TIME + '</b> seconds of power.</p>' +
          '<div class="modal-actions">' +
          '<button class="btn" data-act="map" type="button">' + icon('map') + 'Map</button>' +
          '<button class="btn btn-primary" data-act="go" data-primary type="button">' + icon('play') + 'Start engine</button></div>',
        actions: { go: function () { closeModal(true); startLevel(level); }, map: goLevels }
      };
    });
  }

  /* ================= level lifecycle ================= */
  function endLevelState() {
    G.active = false; G.phase = 'IDLE'; G.paused = false; G.held = null;
    clearTimeout(G.introTimer);
    World.particles.length = 0; World.floats.length = 0;
    FX.hideToast();
  }

  function startLevel(level) {
    endLevelState();
    closeModal(true);
    showScreen(null);
    var bank = D.QUESTION_BANK[level];
    var q = bank[Math.floor(Math.random() * bank.length)];
    G.level = level;
    G.runId = (G.runId || 0) + 1;
    G.levelStartScore = G.score; // snapshot: per-level results are computed from this
    G.scoreShown = G.score;
    G.timeLeft = D.LEVEL_TIME;
    G.target = { a: q[0], b: q[1] };
    G.houses = buildHouses(q[0], q[1], level);
    G.player = { x: 0, y: 0, rx: 0, ry: 0, dir: 0, hop: 0 };
    G.mistakes = 0; G.log = []; G.modTries = 0; G.taskElapsed = 0;
    G.assistRole = null; G.assistShown = false;
    G.modLine = 0; G.conjLine = 0; G.zLabel = false; G.zbarLabel = false; G.celebrate = -1;
    G.earned = { reboot: 0, stabilize: 0, bonus: 0, secs: 0 };
    G.active = true; G.paused = false;
    World.cam.x = 0; World.cam.y = 0; World.cam.zoom = G.reduced ? 1 : 0.72;

    $('hud-level').textContent = level;
    $('hud-score').textContent = G.score;
    $('hud-target').innerHTML = 'z = ' + fmt(G.target.a, G.target.b);
    $('hud-target-k').textContent = 'The complex number to be plotted';
    setPlayChrome(true);
    renderTasks(1);
    setObjective(1);
    updateTimeHud(true);
    updatePos();

    G.phase = 'INTRO';
    G.introStart = performance.now();
    G.introT = G.reduced ? 1 : 0;
    // The timer, not the animation, ends the intro, and forces the final state.
    G.introTimer = setTimeout(endIntro, G.reduced ? 0 : D.INTRO_MS);
  }

  function endIntro() {
    if (G.phase !== 'INTRO') return;
    G.introT = 1; World.cam.zoom = 1;
    G.phase = 'FIND_Z'; G.taskElapsed = 0;
    FX.banner('Task 1: Plot z = ' + fmt(G.target.a, G.target.b), 'Locate the failing power station', 'target', 2600);
  }

  function renderTasks(active) {
    $('tasks').innerHTML = D.TASKS.map(function (t) {
      var st = t.id < active ? 'cleared' : t.id === active ? 'active' : 'locked';
      return '<li class="task ' + st + '">' + icon(st === 'cleared' ? 'check' : st === 'locked' ? 'lock' : t.icon) +
        '<span><small>Task <span class="num">' + t.id + '</span></small>' + (t.id === 3 ? 'Find ' + zbar() : t.short) + '</span></li>';
    }).join('');
  }
  var objTimer = null;
  function setObjective(task) {
    $('obj-text').innerHTML = D.INSTRUCTIONS[task];
    $('obj-assist').hidden = true;
    var o = $('objective'); o.classList.remove('flash'); void o.offsetWidth; o.classList.add('flash');
    // Phones: show each new instruction, then fold it away so the map stays visible.
    o.classList.remove('collapsed'); $('obj-toggle').setAttribute('aria-expanded', 'true');
    clearTimeout(objTimer);
    if (window.innerWidth <= 640) objTimer = setTimeout(function () {
      o.classList.add('collapsed'); $('obj-toggle').setAttribute('aria-expanded', 'false'); layout();
    }, 7000);
    layout();
  }

  /* ================= movement + checking ================= */
  var DIRS = { up: [0, 1, Math.PI / 2], down: [0, -1, -Math.PI / 2], left: [-1, 0, Math.PI], right: [1, 0, 0] };
  function canDrive() {
    return G.active && !G.paused && !modalOpen() && (G.phase === 'FIND_Z' || G.phase === 'FIND_CONJ');
  }
  function press(dir) {
    if (!canDrive()) return;
    G.held = dir; G.holdT = 0.3;
    step(dir);
  }
  function release(dir) { if (!dir || G.held === dir) G.held = null; }
  function step(dir) {
    var d = DIRS[dir], P = G.player, L = D.WORLD_LIMIT;
    var nx = clamp(P.x + d[0], -L, L), ny = clamp(P.y + d[1], -L, L);
    P.dir = d[2];
    if (nx === P.x && ny === P.y) { Snd.sfx.bump(); return; }
    P.x = nx; P.y = ny; P.hop = 1;
    Snd.sfx.step();
    updatePos();
  }
  function updatePos() {
    $('pos').textContent = fmt(G.player.x, G.player.y);
    G.onHouse = houseAt(G.player.x, G.player.y);
    $('btn-check').classList.toggle('ready', !!G.onHouse && canDrive());
  }

  function check() {
    if (!canDrive()) return;
    var h = houseAt(G.player.x, G.player.y);
    if (!h) {
      Snd.sfx.nothing();
      FX.toast('No station here. Park on a house, then press <b>Check</b>.', 'info', 2400);
      return;
    }
    if (G.phase === 'FIND_Z') {
      if (h.role === 'target') foundZ(h); else wrong(h, 1, explainZ(h));
    } else {
      if (h.role === 'conjugate') reachConj(h); else wrong(h, 3, explainConj(h));
    }
  }

  function wrong(h, task, msg) {
    G.mistakes++;
    G.log.push({ task: task, text: msg });
    Snd.sfx.wrong();
    FX.rim('bad'); World.kick(0.55);
    World.burst(h.x, h.y, ['#ff4d5e', '#ff9aa8'], 12, 2.2, { size: 3, life: 0.6, gravity: 0 });
    FX.toast(msg, 'bad', 6000);
  }

  function dirWord(v, pos, neg) { return v > 0 ? pos : neg; }
  function explainZ(h) {
    var a = G.target.a, b = G.target.b, at = 'This station is at <b class="z">' + fmt(h.x, h.y) + '</b>. ';
    if (h.role === 'conjugate') return at + 'That is the reflection ' + zbar() + ', which you need in Task 3. First find <b class="z">z = ' + fmt(a, b) + '</b>.';
    if (h.x === b && h.y === a) return at + 'You swapped the parts. The real part (' + num(a) + ') goes along the real axis; the imaginary part (' + num(b) + ') goes up or down.';
    if (h.x === -a && h.y === b) return at + 'Check the sign of the real part: a = ' + num(a) + ', so z is ' + dirWord(a, 'right', 'left') + ' of the imaginary axis.';
    if (h.x === -a && h.y === -b) return at + 'Both signs are flipped (that is −z). Watch the signs of a and b.';
    if (h.x === a) return at + 'Real part correct. Now the imaginary part: b = ' + num(b) + ', so ' + Math.abs(b) + ' ' + dirWord(b, 'up', 'down') + ' from the river.';
    if (h.y === b) return at + 'Imaginary part correct. Now the real part: a = ' + num(a) + ', so ' + Math.abs(a) + ' ' + dirWord(a, 'right', 'left') + ' of the imaginary axis.';
    return at + 'To plot <b class="z">z = ' + fmt(a, b) + '</b>: go ' + Math.abs(a) + ' ' + dirWord(a, 'right', 'left') + ' along the real axis, then ' + Math.abs(b) + ' ' + dirWord(b, 'up', 'down') + '.';
  }
  function explainConj(h) {
    var a = G.target.a, b = G.target.b, at = 'This station is at <b class="z">' + fmt(h.x, h.y) + '</b>. ';
    if (h.role === 'target') return 'This is z itself. Its conjugate ' + zbar() + ' is its mirror image across the river (the real axis).';
    if (h.x === -a && h.y === b) return at + 'That reflects z across the imaginary axis. The conjugate reflects across the <b>real</b> axis: keep a, flip the sign of b.';
    if (h.x === -a && h.y === -b) return at + 'That is −z: both signs flipped. For ' + zbar() + ' only the imaginary part changes sign.';
    if (h.x === a) return at + 'Real part correct. The imaginary part of ' + zbar() + ' is −b, the opposite sign to z.';
    return at + zbar() + ' keeps the real part a and flips the sign of b: ' + zbar(' = a − ib') + '. Reflect z straight across the river.';
  }

  /* ---------- Task 1 solved ---------- */
  function foundZ(h) {
    G.phase = 'MODULUS'; G.held = null; G.assistRole = null;
    h.look = 'failing'; G.zLabel = true;
    Snd.sfx.found(); FX.rim('good');
    World.burst(h.x, h.y, ['#ffcc4d', '#ff4d5e', '#fff1b8'], 26, 3.4, { size: 4, life: 0.9, gravity: -2 });
    renderTasks(2); setObjective(2);
    FX.toast('Found it! The failing station is at <b class="z">z = ' + fmt(G.target.a, G.target.b) + '</b>.', 'good', 1800);
    updatePos();
    setTimeout(function () { if (G.phase === 'MODULUS' && G.active) openModulus(); }, 750);
  }

  /* ---------- Task 2: modulus modal ---------- */
  function openModulus() {
    var a = G.target.a, b = G.target.b;
    openModal(function () {
      return {
        cls: 'reboot',
        html:
          '<p class="eyebrow">' + icon('ruler') + 'Task 2: Find the modulus</p>' +
          '<h2>Station reboot</h2>' +
          '<p class="lede">Calculate the modulus of <b class="z">z = ' + fmt(a, b) + '</b></p>' +
          '<canvas id="mod-canvas" class="mod-canvas" width="440" height="300" aria-label="Right triangle from 0 to z"></canvas>' +
          '<p class="formula">|z| = √(a² + b²)</p>' +
          '<form id="mod-form" class="mod-form" autocomplete="off">' +
          '<label for="mod-input">|z| =</label>' +
          '<input id="mod-input" class="num" type="text" inputmode="decimal" placeholder="?" data-focus aria-label="Modulus of z">' +
          '<button class="btn btn-primary" type="submit" data-primary>' + icon('check') + 'Submit</button></form>' +
          '<p id="mod-feedback" class="mod-feedback" role="alert"></p>' +
          '<p id="mod-steps" class="mod-steps" hidden></p>',
        after: function (panel) {
          drawTriangle($('mod-canvas'), a, b);
          $('mod-form').addEventListener('submit', function (e) { e.preventDefault(); submitModulus(); });
          $('mod-input').addEventListener('keydown', function (e) { e.stopPropagation(); });
        }
      };
    });
  }

  function drawTriangle(cv, a, b) {
    var ctx = cv.getContext('2d'), w = cv.width, h = cv.height;
    ctx.clearRect(0, 0, w, h);
    var A = Math.abs(a), B = Math.abs(b), pad = 46;
    var s = Math.min((w - pad * 2) / A, (h - pad * 2) / B);
    var ox = a >= 0 ? (w - A * s) / 2 : (w + A * s) / 2, oy = b >= 0 ? (h + B * s) / 2 : (h - B * s) / 2;
    var zx = ox + a * s, zy = oy - b * s;
    // grid
    ctx.strokeStyle = 'rgba(58,31,43,0.08)'; ctx.lineWidth = 1;
    for (var gx = ox % s; gx < w; gx += s) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, h); ctx.stroke(); }
    for (var gy = oy % s; gy < h; gy += s) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke(); }
    // axes (the real axis as a river)
    ctx.fillStyle = 'rgba(140,107,217,0.35)'; ctx.fillRect(0, oy - 5, w, 10);
    ctx.strokeStyle = '#5a3fa8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, oy); ctx.lineTo(w, oy); ctx.stroke();
    ctx.strokeStyle = '#d9901a'; ctx.beginPath(); ctx.moveTo(ox, 0); ctx.lineTo(ox, h); ctx.stroke();
    // triangle legs
    ctx.setLineDash([7, 6]); ctx.strokeStyle = '#3a1f2b'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(zx, oy); ctx.lineTo(zx, zy); ctx.stroke(); ctx.setLineDash([]);
    // right-angle mark
    var rx = a >= 0 ? -12 : 12, ryy = b >= 0 ? -12 : 12;
    ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(zx + rx, oy); ctx.lineTo(zx + rx, oy + ryy); ctx.lineTo(zx, oy + ryy); ctx.stroke();
    // hypotenuse |z|
    ctx.strokeStyle = '#c4532f'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(zx, zy); ctx.stroke();
    ctx.fillStyle = '#c4532f'; ctx.beginPath(); ctx.arc(zx, zy, 7, 0, 7); ctx.fill();
    ctx.fillStyle = '#3a1f2b'; ctx.beginPath(); ctx.arc(ox, oy, 5, 0, 7); ctx.fill();
    // labels
    ctx.font = '600 17px Lexend, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#3a1f2b';
    ctx.fillText('a = ' + num(a), (ox + zx) / 2, oy + (b >= 0 ? 20 : -20));
    ctx.textAlign = a >= 0 ? 'left' : 'right';
    ctx.fillText('b = ' + num(b), zx + (a >= 0 ? 12 : -12), (oy + zy) / 2);
    ctx.textAlign = 'center'; ctx.fillStyle = '#c4532f'; ctx.font = '700 19px Lexend, sans-serif';
    var mx = (ox + zx) / 2, my = (oy + zy) / 2, nx = -(zy - oy), ny = zx - ox, nl = Math.hypot(nx, ny) || 1;
    var side = (a >= 0) === (b >= 0) ? -1 : 1;
    ctx.fillText('|z|', mx + nx / nl * 22 * side, my + ny / nl * 22 * side);
    ctx.fillStyle = '#3a1f2b'; ctx.font = '600 14px Lexend, sans-serif';
    ctx.fillText('0', ox + (a >= 0 ? -10 : 10), oy + (b >= 0 ? 14 : -14));
    ctx.fillText('z', zx + (a >= 0 ? 14 : -14), zy + (b >= 0 ? -10 : 10));
  }

  function near(v, t) { return Math.abs(v - t) < D.MODULUS_TOLERANCE; }
  function submitModulus() {
    if (G.phase !== 'MODULUS') return;
    var inp = $('mod-input'), raw = String(inp.value || '').trim().replace(',', '.').replace('−', '-');
    var fb = $('mod-feedback');
    var v = raw === '' ? NaN : Number(raw);
    if (!isFinite(v)) { fb.className = 'mod-feedback info'; fb.textContent = 'Type a number first, for example 7 or 7.5.'; inp.focus(); return; }
    var a = G.target.a, b = G.target.b, A = Math.abs(a), B = Math.abs(b), sq = a * a + b * b, correct = Math.hypot(a, b);
    if (Math.abs(v - correct) < D.MODULUS_TOLERANCE) { modulusSolved(); return; }
    var msg;
    if (v < 0) msg = 'A modulus is a distance from 0, so it is never negative.';
    else if (near(v, sq)) msg = 'That is a² + b² = ' + sq + '. The modulus is its square root: √' + sq + '.';
    else if (near(v, A + B)) msg = 'Adding the parts gives ' + (A + B) + ', but |z| is the slanted side. Square them first: √(a² + b²).';
    else if (near(v, Math.sqrt(Math.abs(A * A - B * B)))) msg = 'Careful: it is a² plus b², not minus.';
    else if (near(v, A) || near(v, B)) msg = 'That is just one side of the triangle. |z| is the slanted side from 0 to z.';
    else msg = 'Not quite. Square a and b, add them, then take the square root.';
    G.mistakes++; G.modTries++;
    G.log.push({ task: 2, text: 'You entered |z| = ' + raw + '. ' + msg });
    fb.className = 'mod-feedback bad'; fb.innerHTML = icon('cross') + '<span>' + msg + '</span>';
    Snd.sfx.wrong(); FX.rim('bad'); FX.shake($('modal-panel'));
    if (G.modTries >= 2) {
      var st = $('mod-steps'); st.hidden = false;
      st.innerHTML = icon('hint') + '<span>a² + b² = ' + (a < 0 ? '(' + num(a) + ')' : a) + '² + ' + (b < 0 ? '(' + num(b) + ')' : b) + '² = ' + (a * a) + ' + ' + (b * b) + ' = ' + sq + '. Now take √' + sq + '.</span>';
    }
    inp.select();
  }

  function modulusSolved() {
    var h = houseAt(G.target.a, G.target.b);
    closeModal(true);
    G.phase = 'FIND_CONJ'; G.taskElapsed = 0; G.assistRole = null; G.assistShown = false;
    h.look = 'powered'; G.modLine = 0.001;
    Snd.sfx.powerUp(); FX.rim('good');
    World.burst(h.x, h.y, ['#ffcc4d', '#fff1b8', '#ec7b4f'], 40, 4, { size: 4.5, life: 1.1, gravity: -2.5 });
    World.floatText(h.x, h.y + 0.6, '+' + D.MODULUS_POINTS);
    award(D.MODULUS_POINTS, h, 5);
    G.earned.reboot = D.MODULUS_POINTS;
    renderTasks(3); setObjective(3);
    $('hud-target-k').innerHTML = 'Now find its conjugate ' + zbar();
    setTimeout(function () {
      if (G.phase !== 'FIND_CONJ') return;
      Snd.sfx.unlock();
      FX.banner('New objective unlocked', 'Stabilize the grid: reflect z across the river to reach ' + zbar(), 'mirror', 3200);
    }, 700);
    updatePos();
  }

  /* ---------- Task 3 solved ---------- */
  function reachConj(h) {
    G.phase = 'DONE'; G.held = null; G.assistRole = null;
    h.look = 'mirror'; G.zbarLabel = true; G.conjLine = 0.001;
    Snd.sfx.found(); setTimeout(Snd.sfx.win, 250); FX.rim('good');
    World.burst(h.x, h.y, ['#c9b6ff', '#8c6bd9', '#fff1b8'], 44, 4, { size: 4.5, life: 1.2, gravity: -2 });
    var secs = Math.max(0, G.timeLeft), bonus = Math.floor(secs * D.TIME_BONUS_PER_SEC);
    G.earned.stabilize = D.STABILIZE_POINTS; G.earned.bonus = bonus; G.earned.secs = Math.floor(secs * 10) / 10;
    World.floatText(h.x, h.y + 0.6, '+' + (D.STABILIZE_POINTS + bonus), '#c9b6ff');
    award(D.STABILIZE_POINTS + bonus, h, 8);
    $('tasks').querySelectorAll('.task')[2].className = 'task cleared';
    $('tasks').querySelectorAll('.task')[2].querySelector('img').src = ICON + 'check.png';
    G.celebrate = 0;
    updatePos();
    setTimeout(completeLevel, 1700);
  }

  function award(amount, house, coins) {
    var from = World.toScreen(house.x, house.y);
    var start = G.score;
    G.score += amount;
    var target = G.score, chip = $('hud-score-chip'), run = G.runId;
    FX.coins(from.x, from.y, coins, function (i) {
      if (run !== G.runId) return; // the level was restarted while coins were in flight
      Snd.sfx.coin();
      var shown = i === coins - 1 ? target : Math.round(start + amount * (i + 1) / coins);
      if (shown > G.scoreShown) G.scoreShown = shown;
      $('hud-score').textContent = G.scoreShown;
      FX.pop(chip);
    });
  }

  function starsFor(m) { return m === 0 ? 3 : m <= 2 ? 2 : 1; }

  function completeLevel() {
    if (!G.active) return;
    var lv = G.level, earned = G.score - G.levelStartScore, stars = starsFor(G.mistakes);
    var prevBest = store.best[lv] || 0, newBest = earned > prevBest;
    store.best[lv] = Math.max(prevBest, earned);
    store.stars[lv] = Math.max(store.stars[lv] || 0, stars);
    if (lv < D.SECTORS.length) store.unlocked = Math.max(store.unlocked, lv + 1);
    save();
    G.phase = 'DONE';
    FX.shower(lv === D.SECTORS.length ? 70 : 36);
    var last = lv === D.SECTORS.length, E = G.earned, t = G.target;
    openModal(function () {
      return {
        cls: 'complete',
        html:
          '<p class="eyebrow">Sector <span class="num">' + lv + '</span> · ' + D.SECTORS[lv - 1].name + '</p>' +
          '<h2>Grid stabilized!</h2>' +
          '<p class="lede">Conjugate <b class="z">' + zbar(' = ' + fmt(t.a, -t.b)) + '</b> secured.</p>' +
          '<div class="stars-row" id="stars-row">' + [1, 2, 3].map(function () { return icon('star-empty', 'star-slot'); }).join('') + '</div>' +
          '<table class="breakdown">' +
          '<tr><td>' + icon('ruler') + '<span>Station rebooted (|z| = ' + Math.round(Math.hypot(t.a, t.b) * 100) / 100 + ')</span></td><td class="num">+' + E.reboot + '</td></tr>' +
          '<tr><td>' + icon('mirror') + '<span>Grid stabilized at ' + zbar() + '</span></td><td class="num">+' + E.stabilize + '</td></tr>' +
          '<tr><td>' + icon('clock') + '<span>Time bonus (<span class="num">' + E.secs.toFixed(1) + '</span> s left × ' + D.TIME_BONUS_PER_SEC + ')</span></td><td class="num">+' + E.bonus + '</td></tr>' +
          '<tr class="total"><td>Sector score' + (newBest ? ' <em class="new-best">New best!</em>' : '') + '</td><td class="num">' + earned + '</td></tr>' +
          '<tr class="sub"><td>Mistakes</td><td class="num">' + G.mistakes + '</td></tr>' +
          '<tr class="sub"><td>Run score</td><td class="num">' + G.score + '</td></tr>' +
          '</table>' + mistakeLog() +
          '<div class="modal-actions">' +
          '<button class="btn" data-act="learn" type="button">' + icon('book') + 'Learn More</button>' +
          '<button class="btn" data-act="replay" type="button">' + icon('replay') + 'Replay</button>' +
          '<button class="btn" data-act="map" type="button">' + icon('map') + 'Map</button>' +
          '<button class="btn btn-primary" data-act="next" data-primary type="button">' + icon(last ? 'trophy' : 'next') + (last ? 'Finish' : 'Next sector') + '</button></div>',
        after: function () { revealStars(stars); },
        actions: {
          learn: function () { openModal(learnModal, { push: true }); },
          replay: function () { G.score = G.levelStartScore; startLevel(lv); },
          map: goLevels,
          next: function () { if (last) victory(); else showBrief(lv + 1); }
        }
      };
    });
  }

  function mistakeLog() {
    if (!G.log.length) return '<p class="clean">' + icon('check') + 'Clean run: no mistakes.</p>';
    return '<details class="mlog"><summary>' + icon('book') + '<span>Mistakes to learn from (<span class="num">' + G.log.length + '</span>)</span></summary><ul>' +
      G.log.map(function (m) { return '<li><b>Task <span class="num">' + m.task + '</span></b> ' + m.text + '</li>'; }).join('') + '</ul></details>';
  }

  var starTimers = [];
  function revealStars(n) {
    starTimers.forEach(clearTimeout); starTimers = [];
    var slots = document.querySelectorAll('#stars-row .star-slot');
    for (var i = 0; i < 3; i++) {
      (function (i) {
        starTimers.push(setTimeout(function () {
          if (!slots[i] || !slots[i].isConnected) return;
          if (i < n) { slots[i].src = ICON + 'star.png'; slots[i].classList.add('lit'); Snd.sfx.star(i); }
        }, 350 + i * 320));
      })(i);
    }
  }

  function victory() {
    FX.shower(90);
    Snd.sfx.win();
    endLevelState();
    setPlayChrome(false);
    openModal(function () {
      return {
        cls: 'victory',
        html:
          icon('trophy', 'big-trophy') +
          '<h2>City restored!</h2>' +
          '<p class="lede">Every sector of Mirror River City is powered and every reflection is steady.</p>' +
          '<div class="victory-stats">' +
          '<span>' + icon('bolt') + '<b class="num">' + G.score + '</b><small>this run</small></span>' +
          '<span>' + icon('star') + '<b class="num">' + totalStars() + '</b><small>of 15 stars</small></span>' +
          '<span>' + icon('trophy') + '<b class="num">' + totalBest() + '</b><small>best city total</small></span></div>' +
          '<div class="modal-actions">' +
          '<button class="btn" data-act="map" type="button">' + icon('map') + 'Map</button>' +
          '<button class="btn" data-act="menu" type="button">' + icon('home') + 'Menu</button>' +
          '<button class="btn btn-primary" data-act="again" data-primary type="button">' + icon('replay') + 'Play again</button></div>',
        actions: { map: goLevels, menu: goMenu, again: function () { G.score = 0; showBrief(1); } }
      };
    });
  }

  function gameOver() {
    G.phase = 'OVER'; G.held = null; G.assistRole = null;
    Snd.sfx.lose(); FX.rim('bad'); World.kick(0.9);
    FX.hideToast();
    var lv = G.level;
    openModal(function () {
      return {
        cls: 'over',
        html:
          icon('clock', 'big-icon') +
          '<h2>Power failure</h2>' +
          '<p class="lede">The grid collapsed before the sector was stabilized. The clock ran out.</p>' +
          '<p class="small-note">Retrying restores your run score to <b class="num">' + G.levelStartScore + '</b>, what you had when this sector began.</p>' +
          '<div class="modal-actions">' +
          '<button class="btn" data-act="map" type="button">' + icon('map') + 'Map</button>' +
          '<button class="btn" data-act="help" type="button">' + icon('help') + 'How to Play</button>' +
          '<button class="btn btn-primary" data-act="retry" data-primary type="button">' + icon('replay') + 'Retry sector</button></div>',
        actions: {
          map: goLevels,
          help: function () { openModal(helpModal, { push: true }); },
          retry: function () { G.score = G.levelStartScore; startLevel(lv); }
        }
      };
    });
  }

  /* ---------- Pause ---------- */
  function canPause() { return G.active && !G.paused && !modalOpen() && (G.phase === 'FIND_Z' || G.phase === 'FIND_CONJ' || G.phase === 'INTRO'); }
  function pause() {
    if (!canPause()) return;
    G.paused = true; G.held = null;
    openModal(function () {
      return {
        cls: 'pause',
        html:
          '<h2>' + icon('pause', 'h-icon') + 'Paused</h2>' +
          '<p class="lede">Sector <span class="num">' + G.level + '</span> · <span class="num">' + Math.ceil(G.timeLeft) + '</span> s of power left</p>' +
          '<div class="toggles">' + toggleRow('music', 'Music', store.prefs.music) + toggleRow('sfx', 'Sound effects', store.prefs.sfx) + '</div>' +
          '<div class="modal-actions">' +
          '<button class="btn" data-act="map" type="button">' + icon('map') + 'Map</button>' +
          '<button class="btn" data-act="help" type="button">' + icon('help') + 'How to Play</button>' +
          '<button class="btn" data-act="restart" type="button">' + icon('replay') + 'Restart</button>' +
          '<button class="btn btn-primary" data-act="resume" data-primary type="button">' + icon('play') + 'Resume</button></div>',
        actions: {
          resume: resume,
          help: function () { openModal(helpModal, { push: true }); },
          restart: function () { G.score = G.levelStartScore; startLevel(G.level); },
          map: goLevels,
          music: function () { setPref('music', !store.prefs.music); paintModal(); },
          sfx: function () { setPref('sfx', !store.prefs.sfx); paintModal(); }
        }
      };
    });
  }
  function resume() { closeModal(true); G.paused = false; updatePos(); }

  /* ---------- Learn More (end screen only) ---------- */
  function learnModal() {
    var t = G.target || { a: 3, b: 4 }, a = t.a, b = t.b, sq = a * a + b * b, m = Math.round(Math.hypot(a, b) * 100) / 100;
    return {
      cls: 'wide learn',
      html:
        '<h2>' + icon('book', 'h-icon') + 'Learn More</h2>' +
        '<div class="scroll">' +
        '<div class="learn-grid"><div>' +
        '<h3>The Argand plane</h3>' +
        '<p>Every complex number <span class="z">z = a + ib</span> is a point (a, b). The horizontal line is the <b>real axis</b> (the river in this city) and the vertical line is the <b>imaginary axis</b>. This picture is named after Jean-Robert Argand, who described it in 1806.</p>' +
        '<h3>Modulus |z|</h3>' +
        '<p>The modulus is the distance from 0 to z. The real part, the imaginary part and |z| make a right triangle, so by Pythagoras <span class="z">|z| = √(a² + b²)</span>.</p>' +
        '<p class="worked">For <span class="z">z = ' + fmt(a, b) + '</span>: |z| = √(' + (a * a) + ' + ' + (b * b) + ') = √' + sq + ' = <b class="num">' + m + '</b></p>' +
        '<h3>Conjugate ' + zbar() + '</h3>' +
        '<p>The conjugate keeps the real part and flips the sign of the imaginary part: <span class="z">' + zbar(' = a − ib') + '</span>. On the plane that is a reflection in the real axis, which is why every conjugate house in this city is the mirror image of its station across the river.</p>' +
        '<p class="worked">For <span class="z">z = ' + fmt(a, b) + '</span>: <span class="z">' + zbar(' = ' + fmt(a, -b)) + '</span></p>' +
        '</div><div class="learn-fig">' + learnSvg(a, b) + '</div></div>' +
        '<h3>Facts worth remembering</h3>' +
        '<ul class="facts">' +
        '<li>' + icon('mirror') + '<span><b>|' + zbar() + '| = |z|.</b> A reflection does not change the distance from 0.</span></li>' +
        '<li>' + icon('ruler') + '<span><b>z · ' + zbar() + ' = |z|².</b> (' + fmt(a, b) + ')(' + fmt(a, -b) + ') = ' + (a * a) + ' + ' + (b * b) + ' = <span class="num">' + sq + '</span>.</span></li>' +
        '<li>' + icon('target') + '<span><b>z + ' + zbar() + ' = 2a</b> is real, and the conjugate of ' + zbar() + ' is z again.</span></li>' +
        '<li>' + icon('help') + '<span>Reflecting in the <b>imaginary</b> axis gives −' + zbar() + ' = −a + ib, and turning half a circle about 0 gives −z. Neither is the conjugate.</span></li>' +
        '</ul></div>' +
        '<div class="modal-actions"><button class="btn btn-primary" data-act="back" data-primary type="button">' + icon('back') + 'Back</button></div>',
      actions: { back: backModal }
    };
  }
  function learnSvg(a, b) {
    var R = Math.max(Math.abs(a), Math.abs(b)) + 2, S = 220 / R, c = 240;
    function X(x) { return c + x * S; } function Y(y) { return c - y * S; }
    var grid = '';
    for (var i = -R; i <= R; i++) {
      grid += '<line x1="' + X(i) + '" y1="' + Y(-R) + '" x2="' + X(i) + '" y2="' + Y(R) + '" class="g"/>';
      grid += '<line x1="' + X(-R) + '" y1="' + Y(i) + '" x2="' + X(R) + '" y2="' + Y(i) + '" class="g"/>';
    }
    return '<svg viewBox="0 0 480 480" class="fig" role="img" aria-label="z, its modulus, and its conjugate on the Argand plane">' +
      '<rect x="0" y="0" width="480" height="' + c + '" class="sky"/><rect x="0" y="' + c + '" width="480" height="' + c + '" class="deep"/>' + grid +
      '<rect x="0" y="' + (c - 7) + '" width="480" height="14" class="river"/>' +
      '<line x1="0" y1="' + c + '" x2="480" y2="' + c + '" class="ax"/><line x1="' + c + '" y1="0" x2="' + c + '" y2="480" class="ay"/>' +
      '<polyline points="' + X(0) + ',' + Y(0) + ' ' + X(a) + ',' + Y(0) + ' ' + X(a) + ',' + Y(b) + '" class="leg"/>' +
      '<line x1="' + X(0) + '" y1="' + Y(0) + '" x2="' + X(a) + '" y2="' + Y(b) + '" class="mod"/>' +
      '<line x1="' + X(a) + '" y1="' + Y(b) + '" x2="' + X(a) + '" y2="' + Y(-b) + '" class="refl"/>' +
      '<circle cx="' + X(a) + '" cy="' + Y(b) + '" r="9" class="pz"/><circle cx="' + X(a) + '" cy="' + Y(-b) + '" r="9" class="pc"/>' +
      '<text x="' + (X(a) + (a >= 0 ? 14 : -14)) + '" y="' + (Y(b) - 4) + '" text-anchor="' + (a >= 0 ? 'start' : 'end') + '" class="tz">z = ' + fmt(a, b) + '</text>' +
      '<text x="' + (X(a) + (a >= 0 ? 14 : -14)) + '" y="' + (Y(-b) + 22) + '" text-anchor="' + (a >= 0 ? 'start' : 'end') + '" class="tc">z̄ = ' + fmt(a, -b) + '</text>' +
      '<text x="' + ((X(0) + X(a)) / 2 + (a * b > 0 ? -16 : 16)) + '" y="' + ((Y(0) + Y(b)) / 2 - 6) + '" text-anchor="middle" class="tm">|z|</text>' +
      '<text x="472" y="' + (c - 12) + '" text-anchor="end" class="tl">Re</text><text x="' + (c + 8) + '" y="18" class="tl">Im</text>' +
      '</svg>';
  }

  /* ================= HUD ================= */
  var lastSecShown = -1;
  function updateTimeHud(force) {
    var s = Math.max(0, Math.ceil(G.timeLeft));
    if (s !== lastSecShown || force) {
      lastSecShown = s;
      $('hud-time').textContent = s;
      $('hud-time-chip').classList.toggle('low', s <= 15);
    }
    $('hud-time-bar').style.width = clamp(G.timeLeft / D.LEVEL_TIME * 100, 0, 100) + '%';
  }

  function layout() {
    World.resize();
    var hud = $('hud'), ctr = $('controls');
    var hb = hud.hidden ? 0 : hud.getBoundingClientRect().bottom;
    document.documentElement.style.setProperty('--hud-h', Math.round(hb) + 'px');
    var side = $('side');
    World.safeTop = hud.hidden ? 0 : Math.max(hb, window.innerWidth <= 640 && !side.hidden ? side.getBoundingClientRect().bottom : 0) + 6;
    World.safeBottom = ctr.hidden ? 0 : (window.innerWidth <= 640 ? ctr.getBoundingClientRect().height : 0);
    // Centre the car in the open map area, not behind the side column.
    var wide = window.innerWidth > 640 && !side.hidden;
    World.offX = wide ? Math.round(side.getBoundingClientRect().right / 2) : 0;
    World.offY = hud.hidden ? 0 : Math.round((World.safeTop - World.safeBottom) * 0.35);
  }

  /* ================= main loop ================= */
  var last = 0;
  function frame(ts) {
    var dt = last ? Math.min(0.05, (ts - last) / 1000) : 0;
    last = ts;
    G.time += dt;
    G.reduced = AP.reducedMotion();
    if (G.active) update(dt);
    World.render(dt, G);
    requestAnimationFrame(frame);
  }

  function update(dt) {
    var P = G.player, k = Math.min(1, dt * 16);
    P.rx += (P.x - P.rx) * k; P.ry += (P.y - P.ry) * k;
    P.hop = Math.max(0, P.hop - dt * 6);
    var ck = Math.min(1, dt * (G.reduced ? 20 : 5));
    World.cam.x += (P.rx - World.cam.x) * ck; World.cam.y += (P.ry - World.cam.y) * ck;

    if (G.phase === 'INTRO') {
      G.introT = clamp((performance.now() - G.introStart) / D.INTRO_MS, 0, 1);
      World.cam.zoom = 0.72 + 0.28 * (1 - Math.pow(1 - G.introT, 3)) + Math.sin(G.introT * Math.PI) * 0.03;
    } else { G.introT = 1; World.cam.zoom += (1 - World.cam.zoom) * Math.min(1, dt * 6); }

    if (G.modLine > 0 && G.modLine < 1) G.modLine = Math.min(1, G.modLine + dt * 1.3);
    if (G.conjLine > 0 && G.conjLine < 1) G.conjLine = Math.min(1, G.conjLine + dt * 1.1);
    if (G.celebrate >= 0) {
      G.celebrate += dt;
      var t = G.target;
      G.houses.forEach(function (h) {
        if (h.look === 'dark' && Math.hypot(h.x - t.a, h.y - t.b) < G.celebrate * 9) {
          h.look = 'lit';
          if (!G.reduced) World.burst(h.x, h.y, '#ffcc4d', 5, 1.4, { size: 3, life: 0.7, gravity: 1.5 });
        }
      });
    }

    var finding = G.phase === 'FIND_Z' || G.phase === 'FIND_CONJ';
    if (finding && !G.paused && !modalOpen()) {
      G.timeLeft -= dt;
      G.taskElapsed += dt;
      if (G.taskElapsed >= D.ASSIST_AFTER && !G.assistRole) {
        G.assistRole = G.phase === 'FIND_Z' ? 'target' : 'conjugate';
        $('obj-assist').hidden = false;
        if (!G.assistShown) { G.assistShown = true; FX.toast('Stuck? The house you need is pulsing now. It costs nothing.', 'info', 3600); }
      }
      if (G.held) {
        G.holdT -= dt;
        if (G.holdT <= 0) { G.holdT = 0.12; step(G.held); }
      }
      updateTimeHud();
      if (G.timeLeft <= 0) { G.timeLeft = 0; updateTimeHud(true); gameOver(); }
    }
  }

  /* ================= input ================= */
  var KEYMAP = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' };
  function onKeyDown(e) {
    Snd.unlock();
    if (modalOpen()) {
      if (e.key === 'Escape') {
        if (G.paused && modalStack.length === 1) { resume(); e.preventDefault(); }
        else if (modalStack.length > 1) { backModal(); e.preventDefault(); }
        return;
      }
      if ((e.key === 'Enter' || e.key === ' ') && !/INPUT|BUTTON|SUMMARY/.test((e.target && e.target.tagName) || '')) {
        var p = $('modal-panel').querySelector('[data-primary]');
        if (p) { e.preventDefault(); p.click(); }
      }
      return;
    }
    if (!$('scr-boot').hidden && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); boot(); return; }
    var dir = KEYMAP[e.code];
    if (dir) { e.preventDefault(); if (!e.repeat) press(dir); return; }
    if (e.key === 'Enter' || e.code === 'Space') { e.preventDefault(); if (!e.repeat) check(); return; }
    if (e.key === 'Escape' || e.code === 'KeyP') { e.preventDefault(); pause(); }
  }
  function onKeyUp(e) { var dir = KEYMAP[e.code]; if (dir) release(dir); }

  function bindPad() {
    document.querySelectorAll('.d-btn').forEach(function (btn) {
      var dir = btn.getAttribute('data-dir');
      btn.addEventListener('pointerdown', function (e) {
        e.preventDefault(); Snd.unlock();
        G.held = null; // reset any stale hold from a lost pointer
        try { btn.setPointerCapture(e.pointerId); } catch (err) {}
        btn.classList.add('down');
        press(dir);
      });
      function up() { btn.classList.remove('down'); release(dir); }
      btn.addEventListener('pointerup', up);
      btn.addEventListener('pointercancel', up);
      btn.addEventListener('lostpointercapture', up);
      btn.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    });
    $('btn-check').addEventListener('click', function () { Snd.unlock(); check(); });
  }
  function releaseAll() { G.held = null; document.querySelectorAll('.d-btn.down').forEach(function (b) { b.classList.remove('down'); }); }

  /* ================= boot ================= */
  function boot() {
    Snd.unlock();
    Snd.setSfx(store.prefs.sfx);
    Snd.setMusic(store.prefs.music);
    Snd.sfx.click();
    goMenu();
  }

  function init() {
    World.init($('world'));
    Snd.musicOn = store.prefs.music; Snd.sfxOn = store.prefs.sfx;
    // A demo target so the title screen shows the river city behind it.
    G.target = null;
    window.addEventListener('resize', layout);
    window.addEventListener('orientationchange', function () { setTimeout(layout, 200); });
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', function () { releaseAll(); pause(); });
    document.addEventListener('visibilitychange', function () { if (document.hidden) { releaseAll(); pause(); } });
    document.addEventListener('pointerdown', function () { Snd.unlock(); }, { passive: true });
    document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
    document.addEventListener('dblclick', function (e) { e.preventDefault(); });
    bindPad();

    $('btn-boot').addEventListener('click', boot);
    $('btn-play').addEventListener('click', function () { Snd.sfx.click(); goLevels(); });
    $('btn-help').addEventListener('click', function () { Snd.sfx.click(); openModal(helpModal); });
    $('btn-settings').addEventListener('click', function () { Snd.sfx.click(); openModal(settingsModal); });
    $('btn-levels-back').addEventListener('click', function () { Snd.sfx.click(); goMenu(); });
    $('btn-pause').addEventListener('click', function () { Snd.sfx.click(); pause(); });
    $('obj-toggle').addEventListener('click', function () {
      var o = $('objective'), c = o.classList.toggle('collapsed');
      clearTimeout(objTimer);
      $('obj-toggle').setAttribute('aria-expanded', String(!c));
      layout();
    });
    layout();
    requestAnimationFrame(frame);
  }

  AP.Game = { startLevel: startLevel, check: check, press: press, release: release, submitModulus: submitModulus };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
