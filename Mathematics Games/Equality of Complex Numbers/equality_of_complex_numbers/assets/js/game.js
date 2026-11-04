/* Twin-Seal Tomb: game flow, rules, HUD, screens and saving.
   Core rules are the original's: five rooms, sort the four terms into Real and
   Imaginary, then solve for x (and y) before the timer runs out. A wrong solution
   or a time-out resets the room with a new inscription after 3 seconds. */
(function () {
  'use strict';
  var D = window.TST.data, T = window.TST.teach, S = window.TST.store;
  var A = window.TST.audio, FX = window.TST.fx, AMB = window.TST.ambient;
  var SC = D.SCORING;
  var RM = FX.RM;
  var TOUCH = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;

  function $(id) { return document.getElementById(id); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = (Math.random() * (i + 1)) | 0; var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function now() { return (window.performance && performance.now) ? performance.now() : Date.now(); }

  var G = {
    screen: 'boot', room: 0, q: null, qIdx: {}, phase: 'idle',
    totalMs: 0, leftMs: 0, lastT: 0, timerIv: null, paused: false, lastSec: -1,
    placed: { real: 0, imag: 0 }, need: { real: 0, imag: 0 },
    hints: 0, mistakes: 0, log: [], assist: false, steps: [], stepIdx: 0,
    runCoins: 0, runStart: 0, selected: null, drag: null, focus: 'x',
    introTimer: null, introAnims: [], retryTimer: null, retryIv: null, timers: []
  };

  /* ---------------- timers that are cleared on every room change ---------------- */
  function later(fn, ms) { var id = setTimeout(fn, ms); G.timers.push(id); return id; }
  function clearLater() { G.timers.forEach(clearTimeout); G.timers = []; }

  /* ---------------- backgrounds ---------------- */
  var bgFront = 'a', bgName = '';
  function setBg(name) {
    if (name === bgName) return;
    bgName = name;
    var next = bgFront === 'a' ? 'b' : 'a';
    var el = $('bg-' + next), old = $('bg-' + bgFront);
    el.style.backgroundImage = 'url("assets/images/backgrounds/' + name + '.jpg")';
    el.classList.add('on'); old.classList.remove('on');
    bgFront = next;
  }

  /* ---------------- screens + modals ---------------- */
  function show(id) {
    qsa('.screen').forEach(function (s) { s.hidden = s.id !== id; s.classList.remove('enter'); });
    var el = $(id); void el.offsetWidth; el.classList.add('enter');
    G.screen = id.replace('scr-', '');
    var app = $('app');
    app.classList.toggle('in-play', G.screen === 'play');
    if (G.screen !== 'play') { app.classList.remove('fog-on', 'mist-on'); AMB.setTone('warm'); }
  }
  function openModal(id) {
    var m = $(id); m.hidden = false;
    var f = m.querySelector('.btn-gold, .btn, .toggle, .icon-btn');
    if (f && !TOUCH) try { f.focus({ preventScroll: true }); } catch (e) {}
  }
  function closeModal(id) { $(id).hidden = true; }
  function topModal() {
    var open = qsa('.modal').filter(function (m) { return !m.hidden; });
    return open.length ? open[open.length - 1] : null;
  }
  function anyModal() { return !!topModal(); }

  /* ---------------- menu ---------------- */
  function firstOpenRoom() {
    var s = S.get();
    for (var i = 1; i <= s.unlocked; i++) if (!S.room(i).cleared) return i;
    return 0;
  }
  function refreshMenu() {
    var s = S.get();
    $('menu-vault').textContent = S.vault();
    $('menu-stars').textContent = S.starsTotal();
    $('menu-rooms').textContent = s.unlocked;
    var n = firstOpenRoom(), anyCleared = Object.keys(s.rooms).length > 0;
    // digits go in the body face: the display face draws 1 like a roman I
    $('btn-play-label').innerHTML = n === 0 ? 'Escape again from Room <span class="num">1</span>'
      : (anyCleared ? 'Continue: Room <span class="num">' + n + '</span>' : 'Begin the escape');
  }
  function goMenu() { stopRoom(); refreshMenu(); setBg('menu'); show('scr-menu'); }

  function renderMap() {
    var s = S.get(), list = $('room-list'), act = firstOpenRoom();
    list.innerHTML = '';
    $('map-vault').textContent = S.vault();
    for (var i = 1; i <= 5; i++) {
      var meta = D.ROOMS[i], r = S.room(i), locked = i > s.unlocked;
      var li = document.createElement('li');
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'room-card' + (locked ? ' locked' : '') + (r.cleared ? ' cleared' : '') + (i === act ? ' active' : '');
      b.disabled = locked;
      b.setAttribute('aria-label', 'Room ' + i + ', ' + meta.name + (locked ? ', locked' : r.cleared ? ', cleared, ' + r.stars + ' stars' : ''));
      var stars = '';
      for (var k = 1; k <= 3; k++) stars += '<img src="assets/images/ui/icons/' + (k <= r.stars ? 'star' : 'star-empty') + '.png" alt="">';
      b.innerHTML =
        '<span class="room-art" style="background-image:url(\'assets/images/backgrounds/' + meta.bg + '.jpg\')">' +
          '<span class="room-num num">' + i + '</span>' +
          '<img class="room-state" src="assets/images/ui/icons/' + (locked ? 'lock' : r.cleared ? 'check' : 'play') + '.png" alt="">' +
        '</span>' +
        '<span class="room-body"><h3>' + T.esc(meta.name) + '</h3>' +
          '<span class="room-meta"><span class="room-stars">' + stars + '</span>' +
          '<span class="room-best"><img src="assets/images/ui/icons/clock.png" alt=""><span class="num">' + meta.time + 's</span></span></span>' +
          '<span class="room-meta"><span>' + (locked ? 'Sealed' : r.cleared ? 'Best' : 'Not yet opened') + '</span>' +
          (r.cleared ? '<span class="room-best"><img src="assets/images/ui/icons/coin.png" alt=""><span class="num">' + r.best + '</span></span>' : '') +
          '</span></span>';
      (function (n) { b.addEventListener('click', function () { A.play('tap'); startRun(n); }); })(i);
      li.appendChild(b); list.appendChild(li);
    }
  }
  function goMap() { stopRoom(); renderMap(); setBg('menu'); show('scr-map'); }

  /* ---------------- room lifecycle ---------------- */
  function startRun(n) { G.runCoins = 0; enterRoom(n, { fresh: true }); }

  function stopRoom() {
    clearInterval(G.timerIv); G.timerIv = null;
    clearTimeout(G.introTimer); G.introTimer = null;
    clearTimeout(G.retryTimer); clearInterval(G.retryIv);
    clearLater();
    G.introAnims.forEach(function (a) { try { a.cancel(); } catch (e) {} }); G.introAnims = [];
    cancelDrag();
    G.phase = 'idle'; G.paused = false;
    ['modal-result', 'modal-fail', 'modal-pause'].forEach(closeModal);
    $('banner').classList.remove('show');
  }

  function pickQuestion(n) {
    var pool = D.QUESTIONS[n], last = G.qIdx[n], idx;
    var tries = 0;
    do { idx = (Math.random() * pool.length) | 0; tries++; } while (idx === last && pool.length > 1 && tries < 20);
    G.qIdx[n] = idx;
    return pool[idx];
  }

  function enterRoom(n, opts) {
    opts = opts || {};
    stopRoom();
    var meta = D.ROOMS[n];
    G.room = n;
    G.q = pickQuestion(n);
    if (!opts.retry) {
      G.hints = 0; G.mistakes = 0; G.log = [];
      G.runStart = G.runCoins;
    }
    G.assist = false; G.steps = T.hints(G.q, n); G.stepIdx = 0; G.selected = null;
    G.totalMs = meta.time * 1000; G.leftMs = G.totalMs; G.lastSec = -1;
    G.placed = { real: 0, imag: 0 }; G.need = { real: 0, imag: 0 };
    G.q.parts.forEach(function (p) { G.need[p[1]]++; });

    setBg(meta.bg);
    show('scr-play');
    var app = $('app');
    app.classList.toggle('fog-on', !!meta.fog);
    app.classList.toggle('mist-on', !!meta.mist);
    AMB.setTone(meta.fog || meta.mist ? 'cool' : 'warm');

    // HUD
    $('hud-room').textContent = n;
    $('hud-room-name').textContent = meta.name;
    $('hud-coins').textContent = G.runCoins;
    updateTime();
    $('time-chip').classList.remove('low');
    $('btn-hint').disabled = false;

    // inscription
    $('eq').innerHTML = T.mathHTML(G.q.display);
    $('lbl-real').textContent = meta.realLabel;
    $('lbl-imag').textContent = meta.imagLabel;

    // door
    var door = $('door');
    door.classList.remove('open', 'rise', 'shake');
    qsa('.socket').forEach(function (s) { s.classList.remove('set', 'hot'); });
    qsa('.tray').forEach(function (t) { t.classList.remove('done', 'hot', 'reject', 'flown', 'beat', 'selectable'); });
    $('stage').classList.remove('solving');

    // slots
    ['real', 'imag'].forEach(function (t) {
      var box = $('slots-' + t); box.innerHTML = '';
      for (var i = 0; i < G.need[t]; i++) { var s = document.createElement('div'); s.className = 'slot'; box.appendChild(s); }
    });

    // terms
    var bank = $('bank'); bank.innerHTML = ''; bank.hidden = false;
    shuffle(G.q.parts.slice()).forEach(function (p, i) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'pill';
      b.dataset.type = p[1]; b.dataset.term = p[0]; b.dataset.i = i;
      b.innerHTML = T.mathHTML(p[0]);
      b.setAttribute('aria-label', 'Term ' + T.pretty(p[0]));
      b.addEventListener('pointerdown', onPillDown);
      b.addEventListener('click', onPillClick);
      bank.appendChild(b);
    });

    // solve panel
    var solve = $('solve'); solve.hidden = true; solve.classList.remove('show');
    $('in-x').value = ''; $('in-y').value = '';
    $('box-y').hidden = meta.vars.length < 2;
    $('solve-label').textContent = meta.solveLabel;
    $('solve-step').hidden = true; $('solve-step').classList.remove('beat');
    qsa('.in-box').forEach(function (b) { b.classList.remove('bad', 'focus'); });

    guide(meta.narrator, '');
    layout();
    intro(meta);
  }

  /* ---------------- intro: field assembles, input locked ---------------- */
  function intro(meta) {
    G.phase = 'intro';
    var banner = $('banner');
    $('banner-k').textContent = 'Room ' + meta.id + ' of 5';
    $('banner-v').textContent = meta.name;
    banner.classList.add('show');
    later(function () { banner.classList.remove('show'); }, RM ? 700 : 1300);
    A.play('rumble');

    var total = RM ? 250 : 1750;
    if (!RM) {
      $('door').classList.add('rise');
      var plaque = $('plaque'); plaque.classList.remove('unroll'); void plaque.offsetWidth; plaque.classList.add('unroll');
      var pr = $('plaque').getBoundingClientRect(), pcx = pr.left + pr.width / 2, pcy = pr.top + pr.height / 2;
      qsa('.pill', $('bank')).forEach(function (p, i) {
        var r = p.getBoundingClientRect();
        var dx = pcx - (r.left + r.width / 2), dy = pcy - (r.top + r.height / 2);
        if (!p.animate) return;
        var a = p.animate([
          { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.2) rotate(' + ((Math.random() - 0.5) * 120) + 'deg)', opacity: 0 },
          { transform: 'translate(' + (dx * 0.4) + 'px,' + (dy * 0.4 - 30) + 'px) scale(1.15) rotate(' + ((Math.random() - 0.5) * 30) + 'deg)', opacity: 1, offset: 0.55 },
          { transform: 'none', opacity: 1 }
        ], { duration: 720, delay: 520 + i * 120, easing: 'cubic-bezier(.3,.7,.3,1)', fill: 'backwards' });
        G.introAnims.push(a);
      });
    }
    G.introTimer = setTimeout(function () {
      // End of intro is driven by this timer, never by the animations finishing.
      G.introAnims.forEach(function (a) { try { a.cancel(); } catch (e) {} });
      G.introAnims = [];
      $('door').classList.remove('rise');
      $('plaque').classList.remove('unroll');
      qsa('.pill', $('bank')).forEach(function (p) { p.style.transform = ''; p.style.opacity = ''; });
      G.phase = 'sort';
      guide(sortInstruction(), '');
      startTimer();
    }, total);
  }

  function sortInstruction() {
    var r = G.room;
    var s = 'Drag each tablet onto the Sun Seal (real part, no i) or the Moon Seal (imaginary part, multiplied by i).';
    if (r === 1) s += ' Here i7 means 7i.';
    return s;
  }

  /* ---------------- guide ---------------- */
  function guide(text, mood) {
    var b = $('guide-text');
    b.textContent = text;
    b.className = 'bubble' + (mood ? ' ' + mood : '');
    void b.offsetWidth; b.classList.add('flash');
    var g = $('guide'); g.classList.remove('cheer', 'worry');
    if (mood === 'good') { void g.offsetWidth; g.classList.add('cheer'); }
    if (mood === 'bad') { void g.offsetWidth; g.classList.add('worry'); }
    layout(); // a longer line can change the space left for the door
  }

  /* ---------------- timer ---------------- */
  function startTimer() {
    clearInterval(G.timerIv);
    G.lastT = now();
    G.timerIv = setInterval(tick, 200);
  }
  function active() { return G.phase === 'sort' || G.phase === 'seal' || G.phase === 'solve'; }
  function tick() {
    var t = now(), dt = t - G.lastT; G.lastT = t;
    if (G.paused || !active()) return;
    G.leftMs = Math.max(0, G.leftMs - dt);
    updateTime();
    var sec = Math.ceil(G.leftMs / 1000);
    if (sec !== G.lastSec) { if (sec <= 5 && sec > 0) A.play('tick'); G.lastSec = sec; }
    if (!G.assist && G.totalMs - G.leftMs >= G.totalMs * SC.assistFraction) assist();
    if (G.leftMs <= 0) failRoom('time');
  }
  function updateTime() {
    var sec = Math.ceil(G.leftMs / 1000), m = Math.floor(sec / 60), s = sec % 60;
    $('hud-time').textContent = m + ':' + (s < 10 ? '0' : '') + s;
    $('hud-time-bar').style.width = (100 * G.leftMs / (G.totalMs || 1)).toFixed(1) + '%';
    $('time-chip').classList.toggle('low', sec <= 5 && active());
  }

  /* ---------------- pause ---------------- */
  function pause() {
    if (G.screen !== 'play' || !active() || G.paused) return;
    G.paused = true; cancelDrag();
    openModal('modal-pause');
  }
  function resume() {
    if (!G.paused) return;
    G.paused = false; G.lastT = now();
    closeModal('modal-pause');
  }

  /* ---------------- dragging (Pointer Events) ---------------- */
  function onPillDown(e) {
    var el = e.currentTarget;
    if (G.phase !== 'sort' || G.paused || el.classList.contains('placed')) return;
    if (e.button !== undefined && e.button > 0) return;
    cancelDrag(); // a lost pointerup must never leave a stale drag behind
    e.preventDefault();
    G.drag = { el: el, id: e.pointerId, sx: e.clientX, sy: e.clientY, moved: false, ghost: null, hot: null };
    try { el.setPointerCapture(e.pointerId); } catch (err) {}
    el.addEventListener('pointermove', onPillMove);
    el.addEventListener('pointerup', onPillUp);
    el.addEventListener('pointercancel', onPillCancel);
  }
  function onPillMove(e) {
    var d = G.drag; if (!d || e.pointerId !== d.id) return;
    if (!d.moved) {
      if (Math.abs(e.clientX - d.sx) + Math.abs(e.clientY - d.sy) < 8) return;
      d.moved = true;
      clearSelection();
      var g = d.el.cloneNode(true);
      g.className = 'pill ghost'; g.removeAttribute('id');
      $('drag-layer').appendChild(g); d.ghost = g;
      d.el.classList.add('lifted');
      A.play('pick');
    }
    d.ghost.style.left = e.clientX + 'px'; d.ghost.style.top = e.clientY + 'px';
    setHot(dropTypeAt(e.clientX, e.clientY));
  }
  function onPillUp(e) {
    var d = G.drag; if (!d || e.pointerId !== d.id) return;
    var el = d.el, moved = d.moved;
    var type = moved ? dropTypeAt(e.clientX, e.clientY) : null;
    endDrag();
    if (moved) { if (type) attempt(el, type); }
    else toggleSelect(el);
  }
  function onPillCancel() { cancelDrag(); }
  function onPillClick(e) {
    if (e.detail !== 0) return; // pointer taps are handled on pointerup; this is keyboard activation
    if (G.phase !== 'sort' || G.paused || e.currentTarget.classList.contains('placed')) return;
    toggleSelect(e.currentTarget);
  }
  function endDrag() {
    var d = G.drag; if (!d) return;
    d.el.removeEventListener('pointermove', onPillMove);
    d.el.removeEventListener('pointerup', onPillUp);
    d.el.removeEventListener('pointercancel', onPillCancel);
    try { d.el.releasePointerCapture(d.id); } catch (err) {}
    if (d.ghost && d.ghost.parentNode) d.ghost.parentNode.removeChild(d.ghost);
    d.el.classList.remove('lifted');
    setHot(null);
    G.drag = null;
  }
  function cancelDrag() { endDrag(); }
  function dropTypeAt(x, y) {
    var el = document.elementFromPoint(x, y);
    var z = el && el.closest ? el.closest('[data-drop]') : null;
    return z ? z.getAttribute('data-drop') : null;
  }
  function setHot(type) {
    ['real', 'imag'].forEach(function (t) {
      $('tray-' + t).classList.toggle('hot', t === type);
      $('socket-' + t).classList.toggle('hot', t === type);
    });
  }

  function toggleSelect(el) {
    if (G.selected === el) { clearSelection(); return; }
    clearSelection();
    G.selected = el; el.classList.add('selected');
    qsa('.tray').forEach(function (t) { t.classList.add('selectable'); });
    A.play('pick');
  }
  function clearSelection() {
    if (G.selected) G.selected.classList.remove('selected');
    G.selected = null;
    qsa('.tray').forEach(function (t) { t.classList.remove('selectable'); });
  }
  function onDropTarget(type) {
    if (G.phase !== 'sort' || G.paused || !G.selected) return;
    var el = G.selected; clearSelection(); attempt(el, type);
  }

  /* ---------------- sorting rules ---------------- */
  function attempt(el, type, viaHint) {
    var correct = el.dataset.type;
    if (type !== correct) {
      G.mistakes++;
      var why = T.whyType(el.dataset.term, correct, G.room);
      G.log.push(why);
      A.play('wrong');
      var tray = $('tray-' + type);
      tray.classList.remove('reject'); void tray.offsetWidth; tray.classList.add('reject');
      setTimeout(function () { tray.classList.remove('reject'); }, 500);
      FX.shake(el);
      guide(why, 'bad');
      return false;
    }
    place(el, type, viaHint);
    return true;
  }

  function place(el, type, viaHint) {
    var slot = qsa('.slot', $('slots-' + type)).filter(function (s) { return !s.firstChild; })[0];
    if (!slot) return;
    el.classList.remove('selected', 'beat', 'lifted');
    el.classList.add('placed');
    el.removeEventListener('pointerdown', onPillDown);
    el.tabIndex = -1;
    slot.appendChild(el);
    G.placed[type]++;
    A.play('drop');
    FX.burstAt(slot, { count: 12, radius: 60, colors: type === 'real' ? ['#ffd35a', '#ec8a1c', '#fff0b8'] : ['#c9b6ff', '#7a5ad6', '#ffffff'] });
    qsa('.tray.beat').forEach(function (t) { t.classList.remove('beat'); });
    var term = T.pretty(el.dataset.term);
    if (!viaHint) guide('Right: “' + term + '” belongs to the ' + (type === 'real' ? 'Sun Seal (real part).' : 'Moon Seal (imaginary part).'), 'good');
    if (G.placed[type] === G.need[type]) sealTray(type);
    if (G.placed.real === G.need.real && G.placed.imag === G.need.imag) {
      G.phase = 'seal';
      later(showSolve, RM ? 200 : 950);
    } else if (G.assist) {
      later(pulseNextPill, 250);
    }
  }

  function sealTray(type) {
    var tray = $('tray-' + type), socket = $('socket-' + type);
    tray.classList.add('done');
    var src = tray.querySelector('.tray-seal');
    var a = src.getBoundingClientRect(), b = socket.getBoundingClientRect();
    var img = document.createElement('img');
    img.src = src.src; img.alt = ''; img.className = 'fly-coin';
    img.style.width = a.width + 'px'; img.style.height = a.height + 'px';
    img.style.left = (a.left + a.width / 2) + 'px'; img.style.top = (a.top + a.height / 2) + 'px';
    $('fly-layer').appendChild(img);
    tray.classList.add('flown');
    var anim = null, dur = RM ? 10 : 650;
    if (!RM && img.animate) {
      var dx = (b.left + b.width / 2) - (a.left + a.width / 2), dy = (b.top + b.height / 2) - (a.top + a.height / 2);
      var sc = b.width / Math.max(1, a.width);
      anim = img.animate([
        { transform: 'translate(-50%,-50%)' },
        { transform: 'translate(calc(-50% + ' + dx * 0.5 + 'px), calc(-50% + ' + (dy * 0.5 - 60) + 'px)) scale(' + (1 + sc) / 2 * 1.2 + ') rotate(180deg)', offset: 0.5 },
        { transform: 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + dy + 'px)) scale(' + sc + ') rotate(360deg)' }
      ], { duration: dur, easing: 'cubic-bezier(.4,0,.3,1)', fill: 'backwards' });
    }
    later(function () {
      if (anim) try { anim.cancel(); } catch (e) {}
      if (img.parentNode) img.parentNode.removeChild(img);
      socket.classList.add('set');
      A.play('seal');
      FX.burstAt(socket, { count: 22, radius: 80, colors: type === 'real' ? ['#ffd35a', '#ec8a1c', '#fff8d0'] : ['#d8ccff', '#7a5ad6', '#ffffff'] });
    }, dur + 10);
  }

  /* ---------------- solve phase ---------------- */
  function showSolve() {
    if (G.phase !== 'seal') return;
    G.phase = 'solve';
    var q = G.q, meta = D.ROOMS[G.room];
    $('bank').hidden = true;
    $('stage').classList.add('solving');
    var solve = $('solve'); solve.hidden = false; void solve.offsetWidth; solve.classList.add('show');
    $('eq-real').innerHTML = T.mathHTML(q.eqReal);
    $('eq-imag').innerHTML = T.mathHTML(q.eqImag);
    renderSteps();
    setFocus('x');
    if (!TOUCH) try { $('in-x').focus({ preventScroll: true }); } catch (e) {}
    var vars = meta.vars.length > 1 ? 'x and y' : 'x';
    guide('Both seals are set. Real part equals real part, imaginary equals imaginary: solve for ' + vars + ', then press ' + meta.solveLabel + '.', 'good');
    if (G.assist && G.stepIdx === 0) revealStep(true);
    layout();
  }

  function renderSteps() {
    var el = $('solve-step');
    if (!G.stepIdx) { el.hidden = true; return; }
    el.hidden = false;
    el.innerHTML = G.steps.slice(0, G.stepIdx).map(T.esc).join('<br>');
  }
  function revealStep(free) {
    if (G.stepIdx >= G.steps.length) return false;
    G.stepIdx++;
    renderSteps();
    var el = $('solve-step');
    if (free) el.classList.add('beat'); else el.classList.remove('beat');
    layout();
    return true;
  }

  function setFocus(v) {
    G.focus = v;
    $('box-x').classList.toggle('focus', v === 'x');
    $('box-y').classList.toggle('focus', v === 'y');
  }
  function keyInput(k) {
    if (G.phase !== 'solve' || G.paused) return;
    var inp = $('in-' + G.focus);
    var v = inp.value;
    if (k === 'del') v = v.slice(0, -1);
    else if (k === '-') v = v.charAt(0) === '-' ? v.slice(1) : '-' + v;
    else if (v.replace('-', '').length < 4) v += k;
    inp.value = v;
    $('box-' + G.focus).classList.remove('bad');
    A.play('tap');
  }
  function buildKeypad() {
    var keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', 'del'];
    var kp = $('keypad');
    keys.forEach(function (k) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'key num' + (k === 'del' ? ' key-del' : '');
      if (k === 'del') { b.innerHTML = '<img src="assets/images/ui/icons/del.png" alt="">'; b.setAttribute('aria-label', 'Delete'); }
      else if (k === '-') { b.innerHTML = '<img src="assets/images/ui/icons/minus.png" alt="">'; b.setAttribute('aria-label', 'Minus sign'); }
      else b.textContent = k;
      b.addEventListener('pointerdown', function (e) { e.preventDefault(); }); // keep the input focused
      b.addEventListener('click', function () { keyInput(k); });
      kp.appendChild(b);
    });
  }
  function sanitize(inp) {
    var v = inp.value.replace(/−/g, '-').replace(/[^0-9-]/g, '');
    v = (v.charAt(0) === '-' ? '-' : '') + v.replace(/-/g, '');
    if (v.replace('-', '').length > 4) v = v.slice(0, v.charAt(0) === '-' ? 5 : 4);
    if (inp.value !== v) inp.value = v;
  }
  function parseVal(s) {
    s = String(s).trim().replace(/−/g, '-');
    if (s === '') return { empty: true };
    if (!/^-?\d+$/.test(s)) return { bad: true };
    return { v: parseInt(s, 10) };
  }

  function submit() {
    if (G.phase !== 'solve' || G.paused) return;
    var meta = D.ROOMS[G.room], q = G.q, vals = {}, missing = null, bad = null;
    meta.vars.forEach(function (v) {
      var p = parseVal($('in-' + v).value);
      if (p.empty && !missing) missing = v;
      else if (p.bad && !bad) bad = v;
      vals[v] = p.v;
    });
    if (missing || bad) {
      var v = missing || bad;
      var box = $('box-' + v); box.classList.remove('bad'); void box.offsetWidth; box.classList.add('bad');
      A.play('wrong');
      setFocus(v); if (!TOUCH) try { $('in-' + v).focus(); } catch (e) {}
      guide(missing ? 'Enter a value for ' + v + ' first.' : 'Use a whole number for ' + v + ', like 4 or −3.', 'bad');
      return;
    }
    var ok = vals.x === q.ans.x && (meta.vars.length < 2 || vals.y === q.ans.y);
    if (ok) success();
    else failRoom('wrong', T.nameMistake(q, G.room, vals));
  }

  /* ---------------- outcomes ---------------- */
  function award() {
    var secs = Math.ceil(G.leftMs / 1000);
    var raw = SC.base + SC.perSecond * secs - SC.hintCost * G.hints - SC.mistakeCost * G.mistakes;
    return { secs: secs, raw: raw, total: Math.max(SC.minAward, raw) };
  }
  function starsFor(m) { return m === 0 ? 3 : m <= 2 ? 2 : 1; }

  function success() {
    G.phase = 'done';
    clearInterval(G.timerIv);
    clearAssist();
    var aw = award(), stars = starsFor(G.mistakes);
    var door = $('door');
    door.classList.add('open');
    A.play('open');
    FX.rim('good');
    FX.burstAt(door, { count: 34, radius: 150 });
    guide(D.ROOMS[G.room].master ? 'The Master Lock breaks! Both seals matched.' : 'Both parts match, so the numbers are equal. The door opens!', 'good');
    var before = G.runCoins;
    G.runCoins += aw.total;
    var newBest = S.saveRoom(G.room, aw.total, stars);
    later(function () {
      var hud = $('hud-coins'), chip = $('coin-chip');
      FX.flyCoins(door, $('hud-coin'), Math.ceil(aw.total / 25), function (k, n) {
        A.play('coin');
        hud.textContent = Math.round(before + aw.total * k / n);
        FX.pop(chip);
      });
    }, RM ? 50 : 600);
    later(function () { showResult(aw, stars, newBest); }, RM ? 600 : 2100);
  }

  function showResult(aw, stars, newBest) {
    var meta = D.ROOMS[G.room];
    $('res-room').textContent = 'Room ' + G.room + ' · ' + meta.name;
    $('res-title').textContent = meta.master ? 'The Master Lock is broken!' : 'Door opened!';
    var st = $('res-stars'); st.innerHTML = '';
    for (var i = 1; i <= 3; i++) {
      var img = document.createElement('img');
      img.alt = i <= stars ? 'star' : 'empty star';
      img.src = 'assets/images/ui/icons/' + (i <= stars ? 'star' : 'star-empty') + '.png';
      if (i <= stars) { img.className = 'got'; img.style.animationDelay = (i * 0.18) + 's'; (function (d) { later(function () { A.play('star'); }, d); })(i * 180); }
      st.appendChild(img);
    }
    var rows = [['Door opened', '+' + SC.base, false],
      ['Time bonus (' + aw.secs + ' s × ' + SC.perSecond + ')', '+' + SC.perSecond * aw.secs, false]];
    if (G.hints) rows.push(['Hints (' + G.hints + ' × ' + SC.hintCost + ')', '−' + SC.hintCost * G.hints, true]);
    if (G.mistakes) rows.push(['Mistakes (' + G.mistakes + ' × ' + SC.mistakeCost + ')', '−' + SC.mistakeCost * G.mistakes, true]);
    if (aw.raw < aw.total) rows.push(['Minimum award', '' + SC.minAward, false]);
    $('res-breakdown').innerHTML = rows.map(function (r) {
      return '<li' + (r[2] ? ' class="neg"' : '') + '><span>' + T.esc(r[0]) + '</span><b class="num">' + T.esc(r[1]) + '</b></li>';
    }).join('');
    var tot = $('res-total'); FX.rollNumber(tot, 0, aw.total, 700);
    $('res-best').hidden = !newBest;
    var uniq = G.log.filter(function (m, i, a) { return a.indexOf(m) === i; }).slice(0, 6);
    $('res-mistakes').hidden = !uniq.length;
    $('res-mistake-list').innerHTML = uniq.map(function (m) { return '<li>' + T.esc(m) + '</li>'; }).join('');
    $('btn-res-next-label').textContent = G.room < 5 ? 'Next room' : 'Escape the tomb';
    openModal('modal-result');
  }

  function failRoom(kind, why) {
    if (!active()) return;
    G.phase = 'fail';
    clearInterval(G.timerIv);
    cancelDrag(); clearSelection(); clearAssist();
    G.mistakes++;
    var q = G.q;
    var msg = kind === 'time' ? 'The hourglass ran out before both seals matched.' : why;
    G.log.push(kind === 'time' ? 'Time ran out in ' + D.ROOMS[G.room].name + '.' : why);
    A.play('fail');
    FX.rim('bad');
    FX.shake($('door'));
    guide(msg, 'bad');
    $('fail-title').textContent = kind === 'time' ? "Time's up!" : 'Incorrect solution';
    $('fail-why').textContent = msg;
    $('fail-ans').textContent = 'This inscription needed ' + T.answerText(q) + '.';
    openModal('modal-fail');
    var bar = $('retry-bar'), t0 = Date.now();
    bar.style.width = '0%';
    clearInterval(G.retryIv);
    G.retryIv = setInterval(function () {
      var p = Math.min(1, (Date.now() - t0) / SC.retryDelay);
      bar.style.width = (p * 100).toFixed(1) + '%';
      if (p >= 1) clearInterval(G.retryIv);
    }, 50);
    clearTimeout(G.retryTimer);
    G.retryTimer = setTimeout(retry, SC.retryDelay);
  }
  function retry() {
    clearTimeout(G.retryTimer); clearInterval(G.retryIv);
    closeModal('modal-fail');
    G.runCoins = G.runStart; // nothing earned in a failed attempt is kept
    enterRoom(G.room, { retry: true });
  }

  /* ---------------- hints + free assist ---------------- */
  function unplacedPills() { return qsa('.pill', $('bank')).filter(function (p) { return !p.classList.contains('placed'); }); }

  function useHint() {
    if (G.paused) return;
    if (G.phase === 'sort') {
      var p = unplacedPills()[0]; if (!p) return;
      cancelDrag(); clearSelection();
      G.hints++;
      FX.toast('Hint used: −' + SC.hintCost + ' coins from this door’s award.', '', 2200);
      guide('Hint: “' + T.pretty(p.dataset.term) + '” ' + (p.dataset.type === 'real' ? 'has no i, so it goes on the Sun Seal.' : 'is multiplied by i, so it goes on the Moon Seal.'), 'good');
      attempt(p, p.dataset.type, true);
    } else if (G.phase === 'solve') {
      if (G.stepIdx >= G.steps.length) { FX.toast('No more hints for this door.', '', 1800); return; }
      G.hints++;
      revealStep(false);
      FX.toast('Hint used: −' + SC.hintCost + ' coins from this door’s award.', '', 2200);
      if (G.stepIdx >= G.steps.length) $('btn-hint').disabled = true;
    }
    A.play('page');
  }

  function pulseNextPill() {
    if (G.phase !== 'sort' || !G.assist) return;
    qsa('.pill.beat, .tray.beat').forEach(function (e) { e.classList.remove('beat'); });
    var p = unplacedPills()[0]; if (!p) return;
    p.classList.add('beat');
    $('tray-' + p.dataset.type).classList.add('beat');
  }
  function assist() {
    G.assist = true;
    if (G.phase === 'sort') {
      pulseNextPill();
      guide('Stuck? The glowing tablet belongs on the glowing seal. This help is free.', '');
    } else if (G.phase === 'solve') {
      if (G.stepIdx === 0) revealStep(true); else $('solve-step').classList.add('beat');
      guide('Stuck? A working step is now shown, free of charge.', '');
    }
  }
  function clearAssist() {
    qsa('.beat').forEach(function (e) { e.classList.remove('beat'); });
  }

  /* ---------------- final + learn more ---------------- */
  function showFinal() {
    stopRoom();
    setBg('escape');
    show('scr-final');
    $('final-run').textContent = G.runCoins;
    $('final-stars').textContent = S.starsTotal();
    $('final-vault').textContent = S.vault();
    A.play('win');
    FX.shower(3600);
  }
  function openLearn() {
    var q = G.q || D.QUESTIONS[1][0], r = G.room || 1;
    $('learn-ex-title').innerHTML = 'Worked example: Room <span class="num">' + r + '</span>';
    $('learn-worked').innerHTML = T.workedHTML(q, r);
    openModal('modal-learn');
  }

  /* ---------------- settings ---------------- */
  function syncToggles() {
    var p = S.get().prefs;
    $('tg-music').setAttribute('aria-pressed', p.music); $('tg-music-v').textContent = p.music ? 'On' : 'Off';
    $('tg-music-ic').src = 'assets/images/ui/icons/' + (p.music ? 'music-on' : 'music-off') + '.png';
    $('tg-sfx').setAttribute('aria-pressed', p.sfx); $('tg-sfx-v').textContent = p.sfx ? 'On' : 'Off';
    $('tg-sfx-ic').src = 'assets/images/ui/icons/' + (p.sfx ? 'sfx-on' : 'sfx-off') + '.png';
  }
  var resetArm = null;
  function onReset() {
    var b = $('btn-reset');
    if (!resetArm) {
      b.classList.add('armed'); $('btn-reset-label').textContent = 'Tap again to reset';
      resetArm = setTimeout(function () { resetArm = null; b.classList.remove('armed'); $('btn-reset-label').textContent = 'Reset progress'; }, 3000);
      return;
    }
    clearTimeout(resetArm); resetArm = null;
    S.resetProgress();
    b.classList.remove('armed'); $('btn-reset-label').textContent = 'Reset progress';
    FX.toast('Progress reset. Sound settings kept.', 'good');
    refreshMenu();
    if (G.screen === 'map') renderMap();
  }

  /* ---------------- layout: size the door from the space left ---------------- */
  function layout() {
    if (G.screen !== 'play') return;
    var wrap = document.querySelector('.door-wrap'), stage = $('stage');
    if (!wrap || !stage) return;
    var narrow = window.innerWidth <= 640;
    var h = wrap.clientHeight, w = stage.clientWidth;
    var portrait = window.innerHeight > window.innerWidth * 1.1;
    var maxW = w * (narrow ? 0.7 : portrait ? 0.46 : 0.38);
    var dh = Math.max(72, Math.min(h, maxW * 984 / 760));
    document.documentElement.style.setProperty('--door-h', Math.floor(dh) + 'px');
  }

  /* ---------------- wiring ---------------- */
  function on(id, ev, fn) { $(id).addEventListener(ev, fn); }
  function bind() {
    on('btn-boot', 'click', function () { A.unlock(); A.play('tap'); goMenu(); });
    on('btn-play', 'click', function () { A.play('tap'); var n = firstOpenRoom(); startRun(n || 1); });
    on('btn-map', 'click', function () { A.play('tap'); goMap(); });
    on('btn-map-back', 'click', function () { A.play('tap'); goMenu(); });
    on('btn-howto', 'click', function () { A.play('page'); openModal('modal-howto'); });
    on('btn-settings', 'click', function () { A.play('tap'); syncToggles(); openModal('modal-settings'); });

    on('btn-pause', 'click', function () { A.play('tap'); pause(); });
    on('btn-resume', 'click', function () { A.play('tap'); resume(); });
    on('btn-restart', 'click', function () { A.play('tap'); G.runCoins = G.runStart; enterRoom(G.room, { fresh: true }); });
    on('btn-pause-help', 'click', function () { A.play('page'); openModal('modal-howto'); });
    on('btn-pause-settings', 'click', function () { A.play('tap'); syncToggles(); openModal('modal-settings'); });
    on('btn-quit', 'click', function () { A.play('tap'); goMap(); });
    on('btn-hint', 'click', useHint);
    on('btn-solve', 'click', submit);

    on('btn-res-next', 'click', function () {
      A.play('tap'); closeModal('modal-result');
      if (G.room < 5) enterRoom(G.room + 1, { fresh: true }); else showFinal();
    });
    on('btn-res-replay', 'click', function () { A.play('tap'); G.runCoins = G.runStart; enterRoom(G.room, { fresh: true }); });
    on('btn-res-learn', 'click', function () { A.play('page'); openLearn(); });
    on('btn-res-map', 'click', function () { A.play('tap'); goMap(); });
    on('btn-fail-retry', 'click', function () { A.play('tap'); retry(); });

    on('btn-final-again', 'click', function () { A.play('tap'); startRun(1); });
    on('btn-final-learn', 'click', function () { A.play('page'); openLearn(); });
    on('btn-final-map', 'click', function () { A.play('tap'); goMap(); });

    on('tg-music', 'click', function () { var v = !S.get().prefs.music; S.setPref('music', v); A.setMusic(v); syncToggles(); });
    on('tg-sfx', 'click', function () { var v = !S.get().prefs.sfx; S.setPref('sfx', v); A.setSfx(v); syncToggles(); A.play('tap'); });
    on('btn-reset', 'click', onReset);

    qsa('[data-close]').forEach(function (b) {
      b.addEventListener('click', function () { A.play('tap'); var m = b.closest('.modal'); if (m) m.hidden = true; });
    });
    qsa('.modal').forEach(function (m) {
      m.addEventListener('click', function (e) {
        if (e.target === m && m.querySelector('[data-close]')) m.hidden = true;
      });
    });

    // trays + sockets accept tap-to-place and keyboard
    ['real', 'imag'].forEach(function (t) {
      [$('tray-' + t), $('socket-' + t)].forEach(function (el) {
        el.addEventListener('click', function () { onDropTarget(t); });
      });
      $('tray-' + t).addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onDropTarget(t); }
      });
    });

    ['x', 'y'].forEach(function (v) {
      var inp = $('in-' + v);
      inp.addEventListener('focus', function () { setFocus(v); });
      inp.addEventListener('input', function () { sanitize(inp); $('box-' + v).classList.remove('bad'); });
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); submit(); } });
      $('box-' + v).addEventListener('pointerdown', function () { setFocus(v); });
    });
    buildKeypad();

    document.addEventListener('keydown', function (e) {
      var k = e.key;
      if (k === 'Escape') {
        var m = topModal();
        if (m) {
          if (m.id === 'modal-pause') { resume(); return; }
          if (m.querySelector('[data-close]')) { m.hidden = true; return; }
          return;
        }
        if (G.screen === 'play') pause();
        return;
      }
      if ((k === 'p' || k === 'P') && G.screen === 'play' && !anyModal() && document.activeElement.tagName !== 'INPUT') { pause(); return; }
      if (G.screen === 'play' && G.phase === 'solve' && !anyModal() && document.activeElement.tagName !== 'INPUT') {
        if (/^[0-9]$/.test(k)) { keyInput(k); e.preventDefault(); }
        else if (k === '-' || k === '−') { keyInput('-'); e.preventDefault(); }
        else if (k === 'Backspace') { keyInput('del'); e.preventDefault(); }
        else if (k === 'Enter') { submit(); e.preventDefault(); }
      }
    });

    // first gesture unlocks audio
    var unlockOnce = function () { A.unlock(); };
    window.addEventListener('pointerdown', unlockOnce, { passive: true });
    window.addEventListener('keydown', unlockOnce);

    // never let a lost gesture or a hidden tab leave the game in a bad state
    window.addEventListener('blur', function () { cancelDrag(); });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { cancelDrag(); pause(); A.suspend(); }
      else A.resume();
    });
    document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
    document.addEventListener('contextmenu', function (e) { if (e.target.closest && e.target.closest('.pill')) e.preventDefault(); });

    var rz = null;
    window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(layout, 60); });
    if (window.ResizeObserver) {
      var ro = new ResizeObserver(function () { layout(); });
      ro.observe($('stage')); ro.observe(document.querySelector('.door-wrap'));
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
  }

  function boot() {
    A.init(S.get().prefs);
    AMB.init();
    bind();
    setBg('title');
    show('scr-boot');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
