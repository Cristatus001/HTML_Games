/* ==========================================================================
   Physics Riddle Challenge - controller
   Screens, riddle logic, progress persistence and input.
   The answer rules match the original build exactly: any option may be tried,
   a wrong pick explains itself and can be retried, a correct pick locks the
   trial and opens the next one, and Reset clears the current pick.
   ========================================================================== */
(function (global) {
    'use strict';

    var D = global.PRC_DATA;
    var AUDIO = global.PRC_AUDIO;
    var FX = global.PRC_FX;
    var ASSETS = global.PRC_ASSETS;
    var BACKDROP = global.PRC_BACKDROP;

    var ICONS = D.icons;
    var RIDDLES = D.riddles;
    var TOTAL = RIDDLES.length;
    var STORE_KEY = 'prc.velocity.save.v1';

    /* --------------------------------------------------------------- state */

    var save = {
        trials: [],           /* { solved: bool, flawless: bool } per riddle */
        best: 0,
        prefs: { music: true, sfx: true, scale: 1 }
    };

    var run = {
        index: 0,
        solved: [],
        misses: [],
        flawless: [],
        picked: [],           /* slot (screen position) currently shown */
        order: []             /* per trial: slot -> index into riddle.options */
    };

    /* Answers are lettered by where they sit on screen, not by how they are
       written in data.js, because the order is shuffled every run. */
    var LETTERS = ['A', 'B', 'C', 'D'];

    var el = {};              /* cached nodes */
    var openModalId = null;
    var lastFocus = null;

    /* -------------------------------------------------------------- helpers */

    function $(id) { return document.getElementById(id); }
    function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

    function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

    /* Fisher-Yates over the option indices of one riddle. */
    function shuffledOrder(n) {
        var a = [], i, j, tmp;
        for (i = 0; i < n; i++) { a.push(i); }
        for (j = a.length - 1; j > 0; j--) {
            i = Math.floor(Math.random() * (j + 1));
            tmp = a[j]; a[j] = a[i]; a[i] = tmp;
        }
        return a;
    }

    /* The shuffle is decided once per trial per run and then held, so that
       re-rendering (revisiting, restoring a solved trial) keeps the same
       layout and a stored pick still points at the answer the player chose. */
    function orderFor(i) {
        var n = RIDDLES[i].options.length;
        if (!run.order[i] || run.order[i].length !== n) {
            run.order[i] = shuffledOrder(n);
        }
        return run.order[i];
    }

    function optionAt(trial, slot) {
        var src = orderFor(trial)[slot];
        return src == null ? null : RIDDLES[trial].options[src];
    }

    function defaultTrials() {
        var out = [];
        for (var i = 0; i < TOTAL; i++) { out.push({ solved: false, flawless: false }); }
        return out;
    }

    function loadSave() {
        save.trials = defaultTrials();
        var raw = null;
        try { raw = global.localStorage.getItem(STORE_KEY); } catch (e) { raw = null; }
        if (!raw) { return; }
        try {
            var data = JSON.parse(raw);
            if (data && Array.isArray(data.trials)) {
                for (var i = 0; i < TOTAL; i++) {
                    var t = data.trials[i];
                    if (t && typeof t === 'object') {
                        save.trials[i] = { solved: !!t.solved, flawless: !!t.flawless };
                    }
                }
            }
            if (data && typeof data.best === 'number') { save.best = clamp(data.best | 0, 0, TOTAL); }
            if (data && data.prefs) {
                save.prefs.music = data.prefs.music !== false;
                save.prefs.sfx = data.prefs.sfx !== false;
                save.prefs.scale = clamp(parseFloat(data.prefs.scale) || 1, 0.8, 1.35);
            }
        } catch (e) { /* a corrupt save must never block the game */ }
    }

    function writeSave() {
        try {
            global.localStorage.setItem(STORE_KEY, JSON.stringify(save));
        } catch (e) { /* private mode / quota — the game still plays */ }
    }

    /* how many trials are open: everything up to the first unsolved one */
    function unlockedCount() {
        var n = 1;
        for (var i = 0; i < TOTAL; i++) {
            if (save.trials[i].solved) { n = Math.min(TOTAL, i + 2); }
        }
        return n;
    }

    function isUnlocked(i) { return i < unlockedCount(); }

    function solvedCount() {
        var n = 0;
        for (var i = 0; i < run.solved.length; i++) { if (run.solved[i]) { n++; } }
        return n;
    }

    function totalFlawless() {
        var n = 0;
        for (var i = 0; i < TOTAL; i++) { if (save.trials[i].flawless) { n++; } }
        return n;
    }

    function totalCleared() {
        var n = 0;
        for (var i = 0; i < TOTAL; i++) { if (save.trials[i].solved) { n++; } }
        return n;
    }

    function sfx(name) { if (AUDIO) { AUDIO.play(name); } }

    /* Unified press handling: pointerdown warms up audio, click performs the
       action so mouse, touch, pen and keyboard all behave identically. */
    function onPress(node, fn) {
        if (!node) { return; }
        node.addEventListener('pointerdown', function () {
            if (AUDIO) { AUDIO.resume(); }
        }, { passive: true });
        node.addEventListener('pointerenter', function (e) {
            if (e.pointerType === 'mouse' && !node.disabled) { sfx('hover'); }
        }, { passive: true });
        node.addEventListener('click', function (e) {
            if (node.disabled) { return; }
            fn(e);
        });
    }

    var toastTimer = 0;
    function toast(msg) {
        var t = el.toast;
        if (!t) { return; }
        t.hidden = false;
        t.textContent = msg;
        t.classList.add('is-shown');
        global.clearTimeout(toastTimer);
        toastTimer = global.setTimeout(function () {
            t.classList.remove('is-shown');
        }, 1900);
    }

    /* ------------------------------------------------------------- screens */

    var currentScreen = 'boot';

    function show(name) {
        var next = $('screen-' + name);
        if (!next) { return; }
        $$('.screen').forEach(function (s) { s.classList.remove('is-active'); });
        next.classList.add('is-active');
        currentScreen = name;
        var inner = next.querySelector('.screen__inner');
        if (inner) { inner.scrollTop = 0; }
        sfx('whoosh');
    }

    /* --------------------------------------------------------- star pips */

    function starNode(kind) {
        var wrap = document.createElement('span');
        wrap.className = 'star star--' + kind;
        var img = document.createElement('img');
        if (kind === 'on') {
            img.src = ICONS + 'star-on.png';
            img.alt = 'Gold star';
        } else if (kind === 'dim') {
            img.src = ICONS + 'star-on.png';
            img.alt = 'Star earned';
        } else {
            img.src = ICONS + 'star-off.png';
            img.alt = 'Star not earned';
        }
        wrap.appendChild(img);
        return wrap;
    }

    function starKindFor(i) {
        var t = save.trials[i];
        if (t.flawless) { return 'on'; }
        if (t.solved) { return 'dim'; }
        return 'off';
    }

    function fillStars(host, kinds) {
        if (!host) { return; }
        host.innerHTML = '';
        kinds.forEach(function (k) { host.appendChild(starNode(k)); });
    }

    /* ---------------------------------------------------------------- menu */

    function renderMenu() {
        var kinds = [];
        for (var i = 0; i < TOTAL; i++) { kinds.push(starKindFor(i)); }
        fillStars(el.menuStars, kinds);

        el.menuCleared.textContent = totalCleared() + ' / ' + TOTAL;
        el.menuBest.textContent = save.best + ' / ' + TOTAL;
        el.menuFlawless.textContent = String(totalFlawless());

        var cleared = totalCleared();
        if (cleared === 0) {
            el.startLabel.textContent = 'Start Run';
            el.startHint.textContent = 'Three riddles, one lab';
        } else if (cleared < TOTAL) {
            el.startLabel.textContent = 'Continue';
            el.startHint.textContent = 'Resume at trial ' + Math.min(TOTAL, cleared + 1);
        } else {
            el.startLabel.textContent = 'Run Again';
            el.startHint.textContent = 'All trials cleared';
        }
    }

    /* -------------------------------------------------------------- trials */

    function renderTrials() {
        var grid = el.trialGrid;
        grid.innerHTML = '';

        RIDDLES.forEach(function (r, i) {
            var open = isUnlocked(i);
            var card = document.createElement('button');
            card.type = 'button';
            card.className = 'trial-card' + (open ? '' : ' is-locked') + (save.trials[i].solved ? ' is-solved' : '');
            card.setAttribute('data-index', String(i));
            card.setAttribute('aria-label', 'Trial ' + r.index + ': ' + r.codename + (open ? '' : ' (locked)'));
            if (!open) { card.setAttribute('aria-disabled', 'true'); }

            var idx = document.createElement('span');
            idx.className = 'trial-card__idx';
            idx.textContent = '0' + r.index;
            card.appendChild(idx);

            if (!open) {
                var lock = document.createElement('img');
                lock.className = 'trial-card__lock';
                lock.src = ICONS + 'lock.png';
                lock.alt = 'Locked';
                card.appendChild(lock);
            }

            var glyph = document.createElement('span');
            glyph.className = 'trial-card__glyph';
            var gi = document.createElement('img');
            gi.src = r.icon;
            gi.alt = r.iconAlt;
            glyph.appendChild(gi);
            card.appendChild(glyph);

            var tag = document.createElement('span');
            tag.className = 'trial-card__tag';
            tag.textContent = r.tag;
            card.appendChild(tag);

            var name = document.createElement('span');
            name.className = 'trial-card__name';
            name.textContent = r.codename;
            card.appendChild(name);

            var stars = document.createElement('span');
            stars.className = 'trial-card__stars';
            stars.appendChild(starNode(starKindFor(i)));
            card.appendChild(stars);

            onPress(card, function () {
                if (!isUnlocked(i)) {
                    sfx('deny');
                    toast('Clear trial ' + i + ' first');
                    FX.shake(card);
                    return;
                }
                sfx('click');
                startRun(i, false);
            });

            grid.appendChild(card);
        });

        el.trialsFoot.textContent = totalCleared() >= TOTAL
            ? 'All trials cleared. Replay any of them freely.'
            : 'Clear a trial to unlock the next one.';
    }

    /* ---------------------------------------------------------------- rail */

    function renderRail() {
        var rail = el.rail;
        rail.innerHTML = '';
        for (var i = 0; i < TOTAL; i++) {
            if (i > 0) {
                var link = document.createElement('span');
                link.className = 'rail__link' + (run.solved[i - 1] ? ' is-done' : '');
                rail.appendChild(link);
            }
            var node = document.createElement('span');
            node.className = 'rail__node'
                + (run.solved[i] ? ' is-done' : '')
                + (i === run.index && !run.solved[i] ? ' is-current' : '');
            rail.appendChild(node);
        }
    }

    /* --------------------------------------------------------- riddle card */

    function renderRiddle() {
        var r = RIDDLES[run.index];

        el.hudIcon.src = r.icon;
        el.hudIcon.alt = r.iconAlt;
        el.hudTag.textContent = r.tag;
        el.hudName.textContent = r.codename;

        var card = document.createElement('article');
        card.className = 'riddle';
        card.id = 'riddle';

        var scene = document.createElement('div');
        scene.className = 'riddle__scene';
        scene.setAttribute('data-art', 'scene.trial' + r.index);
        var glyph = document.createElement('img');
        glyph.className = 'riddle__glyph';
        glyph.src = r.icon;
        glyph.alt = r.iconAlt;
        scene.appendChild(glyph);
        card.appendChild(scene);

        var q = document.createElement('h2');
        q.className = 'riddle__q';
        q.innerHTML = r.question;
        card.appendChild(q);

        var opts = document.createElement('div');
        opts.className = 'options';
        opts.setAttribute('role', 'group');
        opts.setAttribute('aria-label', 'Answers');

        orderFor(run.index).forEach(function (src, slot) {
            var o = r.options[src];
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'opt';
            b.setAttribute('data-opt', String(slot));

            var key = document.createElement('span');
            key.className = 'opt__key';
            key.textContent = LETTERS[slot] || String(slot + 1);
            b.appendChild(key);

            var txt = document.createElement('span');
            txt.className = 'opt__text';
            txt.textContent = o.label;
            b.appendChild(txt);

            var mark = document.createElement('img');
            mark.className = 'opt__mark';
            mark.src = ICONS + 'check.png';
            mark.alt = '';
            b.appendChild(mark);

            onPress(b, function () { pick(slot); });
            opts.appendChild(b);
        });
        card.appendChild(opts);

        var reveal = document.createElement('div');
        reveal.className = 'reveal';
        reveal.id = 'reveal';
        reveal.setAttribute('role', 'status');
        reveal.setAttribute('aria-live', 'polite');
        card.appendChild(reveal);

        el.stage.innerHTML = '';
        el.stage.appendChild(card);
        if (ASSETS) { ASSETS.refresh(el.stage); }

        /* restore a previously solved state when revisiting a trial */
        if (run.solved[run.index]) {
            applyPick(run.picked[run.index], true);
        }

        updateHud();
        renderRail();
        updateFooter();
    }

    function optionNodes() { return $$('#riddle .opt'); }

    function applyPick(slot, silent) {
        var o = optionAt(run.index, slot);
        if (!o) { return; }
        var nodes = optionNodes();
        var node = nodes[slot];
        if (!node) { return; }
        var reveal = $('reveal');

        nodes.forEach(function (n) { n.classList.remove('is-correct', 'is-wrong', 'is-dimmed'); });

        node.classList.add(o.correct ? 'is-correct' : 'is-wrong');
        var mark = node.querySelector('.opt__mark');
        if (mark) { mark.src = ICONS + (o.correct ? 'check.png' : 'cross.png'); }

        reveal.className = 'reveal is-shown ' + (o.correct ? 'reveal--good' : 'reveal--bad');
        reveal.innerHTML = '';
        var ri = document.createElement('img');
        ri.className = 'reveal__icon';
        ri.src = ICONS + (o.correct ? 'check.png' : 'cross.png');
        ri.alt = '';
        reveal.appendChild(ri);
        var body = document.createElement('div');
        body.innerHTML = o.reveal;
        reveal.appendChild(body);

        if (o.correct) {
            var card = $('riddle');
            card.classList.add('is-solved');
            nodes.forEach(function (n, i) {
                n.disabled = true;
                if (i !== slot) { n.classList.add('is-dimmed'); }
            });
            if (!silent) {
                FX.atElement(node, { palette: 'green', count: 40, power: 340, ringColor: '#3ce6a0' });
                FX.ring(global.innerWidth / 2, global.innerHeight / 2, { color: '#ffb020', r1: 260, life: 0.8, alpha: 0.35 });
            }
        }
    }

    function clearPick() {
        var nodes = optionNodes();
        nodes.forEach(function (n) {
            n.disabled = false;
            n.classList.remove('is-correct', 'is-wrong', 'is-dimmed');
            var m = n.querySelector('.opt__mark');
            if (m) { m.src = ICONS + 'check.png'; }
        });
        var reveal = $('reveal');
        if (reveal) {
            reveal.className = 'reveal';
            reveal.innerHTML = '';
        }
        var card = $('riddle');
        if (card) { card.classList.remove('is-solved'); }
    }

    function pick(slot) {
        var i = run.index;
        if (run.solved[i]) { return; }

        var o = optionAt(i, slot);
        if (!o) { return; }
        run.picked[i] = slot;

        if (o.correct) {
            run.solved[i] = true;
            if (run.misses[i] === 0) { run.flawless[i] = true; }

            save.trials[i].solved = true;
            if (run.flawless[i]) { save.trials[i].flawless = true; }
            var sc = solvedCount();
            if (sc > save.best) { save.best = sc; }
            writeSave();

            applyPick(slot, false);
            sfx('correct');
            if (run.flawless[i]) { global.setTimeout(function () { sfx('star'); }, 260); }
            el.hudScore.parentNode.classList.remove('is-bumped');
            void el.hudScore.parentNode.offsetWidth;
            el.hudScore.parentNode.classList.add('is-bumped');
        } else {
            run.misses[i]++;
            applyPick(slot, false);
            sfx('wrong');
            FX.shake(optionNodes()[slot]);
        }

        updateHud();
        renderRail();
        updateFooter();
    }

    function updateHud() {
        el.hudScore.textContent = String(solvedCount());
    }

    function updateFooter() {
        var solved = run.solved[run.index];
        el.btnNext.disabled = !solved;
        var last = run.index >= TOTAL - 1;
        el.btnNext.querySelector('.btn__label').textContent = last ? 'Finish' : 'Next';
        el.btnNext.querySelector('.btn__icon').src = ICONS + (last ? 'flag.png' : 'next.png');
    }

    /* ----------------------------------------------------------- run flow */

    /* Wipes per-run state, including the answer shuffle, so every fresh run
       re-orders the options. */
    function resetRun() {
        run.solved = [];
        run.misses = [];
        run.flawless = [];
        run.picked = [];
        run.order = [];
        for (var i = 0; i < TOTAL; i++) {
            run.solved.push(false);
            run.misses.push(0);
            run.flawless.push(false);
            run.picked.push(-1);
            run.order.push(null);   /* orderFor() shuffles it on first render */
        }
    }

    function startRun(index, fresh) {
        if (fresh) { resetRun(); }
        run.index = clamp(index, 0, TOTAL - 1);
        show('game');
        renderRiddle();
    }

    function ensureRun() {
        if (run.solved.length !== TOTAL) { resetRun(); }
    }

    function advance() {
        if (!run.solved[run.index]) { return; }
        if (run.index >= TOTAL - 1) {
            finishRun();
            return;
        }
        sfx('unlock');
        run.index++;
        renderRiddle();
    }

    function finishRun() {
        var sc = solvedCount();
        var fl = 0, ms = 0, i;
        for (i = 0; i < TOTAL; i++) {
            if (run.flawless[i]) { fl++; }
            ms += run.misses[i];
        }

        el.resultScore.textContent = sc + ' / ' + TOTAL;
        el.resultFlawless.textContent = fl + ' / ' + TOTAL;
        el.resultMisses.textContent = String(ms);

        var kinds = [];
        for (i = 0; i < TOTAL; i++) {
            kinds.push(run.flawless[i] ? 'on' : (run.solved[i] ? 'dim' : 'off'));
        }
        fillStars(el.resultStars, kinds);

        if (fl === TOTAL) {
            el.resultTitle.textContent = 'Flawless Run';
            el.resultSub.textContent = 'Every riddle solved first try. The lab is yours.';
            el.resultTrophy.src = ICONS + 'trophy.png';
        } else if (sc === TOTAL) {
            el.resultTitle.textContent = 'Run Complete';
            el.resultSub.textContent = 'Great job! You’ve solved the physics riddles!';
            el.resultTrophy.src = ICONS + 'medal.png';
        } else {
            el.resultTitle.textContent = 'Run Ended';
            el.resultSub.textContent = 'Trials remain unsolved — head back in when you’re ready.';
            el.resultTrophy.src = ICONS + 'target.png';
        }

        show('result');
        sfx('fanfare');
        global.setTimeout(function () { FX.celebrate(); }, 180);
        renderMenu();
    }

    /* --------------------------------------------------------------- modals */

    function openModal(id) {
        var m = $(id);
        if (!m) { return; }
        lastFocus = document.activeElement;
        el.modalLayer.hidden = false;
        $$('.modal').forEach(function (x) { x.hidden = true; });
        m.hidden = false;
        openModalId = id;
        sfx('click');
        var first = m.querySelector('.iconbtn, .btn, .switch, .slider');
        if (first && first.focus) { global.setTimeout(function () { first.focus(); }, 40); }
    }

    function closeModal() {
        if (!openModalId) { return; }
        el.modalLayer.hidden = true;
        $$('.modal').forEach(function (x) { x.hidden = true; });
        openModalId = null;
        sfx('click');
        if (lastFocus && lastFocus.focus) { lastFocus.focus(); }
    }

    function buildEntries(host, list) {
        host.innerHTML = '';
        list.forEach(function (item) {
            var row = document.createElement('div');
            row.className = 'entry';

            var ic = document.createElement('span');
            ic.className = 'entry__icon';
            var img = document.createElement('img');
            img.src = item.icon;
            img.alt = '';
            ic.appendChild(img);
            row.appendChild(ic);

            var txt = document.createElement('div');
            txt.className = 'entry__text';
            var h = document.createElement('h3');
            h.className = 'entry__title';
            h.textContent = item.title;
            txt.appendChild(h);
            var p = document.createElement('div');
            p.className = 'entry__body';
            p.innerHTML = item.body || item.text;
            txt.appendChild(p);
            row.appendChild(txt);

            host.appendChild(row);
        });
    }

    /* ------------------------------------------------------------ settings */

    function applyScale(v) {
        v = clamp(parseFloat(v) || 1, 0.8, 1.35);
        document.documentElement.style.setProperty('--ui-scale', String(v));
        el.scaleHint.textContent = Math.round(v * 100) + '%';
        save.prefs.scale = v;
    }

    function syncToggle(btn, icon, on, onSrc, offSrc) {
        btn.classList.toggle('is-on', on);
        btn.setAttribute('aria-checked', on ? 'true' : 'false');
        icon.src = ICONS + (on ? onSrc : offSrc);
    }

    function applyPrefs() {
        syncToggle(el.toggleMusic, el.iconMusic, save.prefs.music, 'music-on.png', 'music-off.png');
        syncToggle(el.toggleSfx, el.iconSfx, save.prefs.sfx, 'sfx-on.png', 'sfx-off.png');
        applyScale(save.prefs.scale);
        if (AUDIO) {
            AUDIO.setMusic(save.prefs.music);
            AUDIO.setSfx(save.prefs.sfx);
        }
    }

    function resetProgress() {
        save.trials = defaultTrials();
        save.best = 0;
        writeSave();
        resetRun();
        renderMenu();
        renderTrials();
        toast('Progress cleared');
        sfx('reset');
    }

    /* ----------------------------------------------------------- keyboard */

    function onKey(e) {
        if (e.key === 'Escape') {
            if (openModalId) { e.preventDefault(); closeModal(); }
            return;
        }
        if (openModalId) { return; }
        if (currentScreen !== 'game') { return; }

        var k = e.key.toLowerCase();
        var map = { '1': 0, '2': 1, '3': 2, '4': 3, a: 0, b: 1, c: 2, d: 3 };
        if (map[k] != null) {
            var nodes = optionNodes();
            var n = nodes[map[k]];
            if (n && !n.disabled) {
                e.preventDefault();
                pick(map[k]);
            }
            return;
        }
        if (e.key === 'Enter' && !el.btnNext.disabled) {
            e.preventDefault();
            advance();
        }
    }

    /* ------------------------------------------------------------ gestures */

    function lockGestures() {
        /* block pinch-zoom and double-tap zoom without killing panel scroll */
        document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
        document.addEventListener('gesturechange', function (e) { e.preventDefault(); });
        document.addEventListener('gestureend', function (e) { e.preventDefault(); });
        document.addEventListener('touchmove', function (e) {
            if (e.touches && e.touches.length > 1) { e.preventDefault(); }
        }, { passive: false });
        document.addEventListener('dblclick', function (e) { e.preventDefault(); });
        document.addEventListener('contextmenu', function (e) { e.preventDefault(); });
        document.addEventListener('dragstart', function (e) { e.preventDefault(); });
    }

    /* ---------------------------------------------------------------- boot */

    var BOOT_LINES = [
        'Calibrating instruments…',
        'Spooling the track…',
        'Syncing displacement vectors…',
        'Warming the riddle vault…'
    ];

    function boot() {
        el = {
            toast: $('toast'),
            loadFill: $('loadbar-fill'),
            loadBar: $('loadbar'),
            loadStatus: $('loadbar-status'),
            bootStart: $('btn-boot-start'),

            menuStars: $('menu-stars'),
            menuCleared: $('menu-cleared'),
            menuBest: $('menu-best'),
            menuFlawless: $('menu-flawless'),
            startLabel: $('btn-start-label'),
            startHint: $('btn-start-hint'),

            trialGrid: $('trial-grid'),
            trialsFoot: $('trials-foot'),

            rail: $('rail'),
            stage: $('stage'),
            hudIcon: $('hud-icon'),
            hudTag: $('hud-tag'),
            hudName: $('hud-name'),
            hudScore: $('hud-score'),
            btnNext: $('btn-next'),

            resultScore: $('result-score'),
            resultFlawless: $('result-flawless'),
            resultMisses: $('result-misses'),
            resultStars: $('result-stars'),
            resultTitle: $('result-title'),
            resultSub: $('result-sub'),
            resultTrophy: $('result-trophy'),

            modalLayer: $('modal-layer'),
            toggleMusic: $('toggle-music'),
            toggleSfx: $('toggle-sfx'),
            iconMusic: $('icon-music'),
            iconSfx: $('icon-sfx'),
            scale: $('scale'),
            scaleHint: $('scale-hint'),
            musicHint: $('music-hint')
        };

        loadSave();
        ensureRun();
        lockGestures();

        if (BACKDROP) { BACKDROP.init($('backdrop-canvas')); }
        if (FX) { FX.init($('fx-canvas')); }

        el.scale.value = String(save.prefs.scale);
        applyScale(save.prefs.scale);

        buildEntries($('howto-body'), D.howto);
        buildEntries($('learn-body'), D.learn);

        /* ---- wiring ---- */
        onPress($('btn-start'), function () {
            sfx('click');
            /* Resume at the first unsolved trial — but once everything is
               cleared the button reads "Run Again", so start from the top. */
            var resume = 0;
            if (totalCleared() < TOTAL) {
                for (var i = 0; i < TOTAL; i++) {
                    if (save.trials[i].solved) { resume = Math.min(TOTAL - 1, i + 1); }
                }
            }
            startRun(resume, true);
        });
        onPress($('btn-trials'), function () { sfx('click'); renderTrials(); show('trials'); });
        onPress($('btn-howto'), function () { openModal('modal-howto'); });
        onPress($('btn-settings'), function () { openModal('modal-settings'); });
        onPress($('btn-reset-progress'), function () { resetProgress(); });
        onPress($('btn-trials-back'), function () { sfx('click'); renderMenu(); show('menu'); });

        onPress($('btn-hud-home'), function () { sfx('click'); renderMenu(); show('menu'); });
        onPress($('btn-hud-settings'), function () { openModal('modal-settings'); });
        onPress($('btn-reset-card'), function () {
            if (run.solved[run.index]) {
                run.solved[run.index] = false;
                run.picked[run.index] = -1;
            }
            clearPick();
            sfx('reset');
            updateHud();
            renderRail();
            updateFooter();
        });
        onPress(el.btnNext, function () { advance(); });

        onPress($('btn-learn'), function () { openModal('modal-learn'); });
        onPress($('btn-replay'), function () { sfx('click'); startRun(0, true); });
        onPress($('btn-result-trials'), function () { sfx('click'); renderTrials(); show('trials'); });
        onPress($('btn-result-menu'), function () { sfx('click'); renderMenu(); show('menu'); });
        onPress($('btn-settings-reset'), function () { resetProgress(); });

        $$('[data-close-modal]').forEach(function (b) { onPress(b, closeModal); });
        el.modalLayer.addEventListener('pointerdown', function (e) {
            if (e.target === el.modalLayer) { closeModal(); }
        });

        onPress(el.toggleMusic, function () {
            save.prefs.music = !save.prefs.music;
            syncToggle(el.toggleMusic, el.iconMusic, save.prefs.music, 'music-on.png', 'music-off.png');
            if (AUDIO) { AUDIO.setMusic(save.prefs.music); }
            writeSave();
            sfx('click');
        });
        onPress(el.toggleSfx, function () {
            save.prefs.sfx = !save.prefs.sfx;
            syncToggle(el.toggleSfx, el.iconSfx, save.prefs.sfx, 'sfx-on.png', 'sfx-off.png');
            if (AUDIO) { AUDIO.setSfx(save.prefs.sfx); }
            writeSave();
            sfx('click');
        });
        el.scale.addEventListener('input', function () {
            applyScale(el.scale.value);
        });
        el.scale.addEventListener('change', function () {
            writeSave();
            sfx('tick');
        });

        document.addEventListener('keydown', onKey);

        renderMenu();
        renderTrials();

        /* ---- loading sequence ---- */
        var started = Date.now();
        var lineTimer = global.setInterval(function () {
            el.loadStatus.textContent = BOOT_LINES[(Math.random() * BOOT_LINES.length) | 0];
        }, 620);

        function setProgress(p) {
            var pct = Math.round(clamp(p, 0, 1) * 100);
            el.loadFill.style.width = pct + '%';
            el.loadBar.setAttribute('aria-valuenow', String(pct));
        }
        setProgress(0.06);

        var audioReady = AUDIO ? AUDIO.init(save.prefs) : Promise.resolve(false);
        var artReady = ASSETS ? ASSETS.load(function (p) { setProgress(0.1 + p * 0.85); }) : Promise.resolve({});

        Promise.all([audioReady, artReady]).then(function (res) {
            if (AUDIO && el.musicHint) {
                el.musicHint.textContent = res[0] ? 'Soundtrack file' : 'Ambient lab pad';
            }
            var wait = Math.max(0, 900 - (Date.now() - started));
            global.setTimeout(function () {
                global.clearInterval(lineTimer);
                setProgress(1);
                el.loadStatus.textContent = 'Systems nominal';
                el.bootStart.classList.remove('is-hidden');
                el.bootStart.focus();
            }, wait);
        });

        onPress(el.bootStart, function () {
            if (AUDIO) { AUDIO.start(); }
            sfx('unlock');
            renderMenu();
            show('menu');
            FX.ring(global.innerWidth / 2, global.innerHeight / 2, { color: '#38e0ff', r1: Math.max(global.innerWidth, global.innerHeight) * 0.5, life: 0.9 });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})(window);
