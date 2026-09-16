/* ==========================================================================
   Gravity Quest - main controller
   Boot -> Menu -> Ascent map -> Riddle -> Codex -> Quest complete.
   Input is unified through Pointer Events so touch, pen, mouse and keyboard
   all follow the same path.
   ========================================================================== */
(function (global) {
    'use strict';

    var D = global.GQ_DATA;
    var A = global.GQ_ASSETS;
    var SND = global.GQ_AUDIO;
    var BG = global.GQ_BACKDROP;
    var FX = global.GQ_FX;

    var CFG = D.CONFIG;
    var RIDDLES = D.RIDDLES;
    var ICONS = 'assets/images/ui/emoji/';

    /* ------------------------------------------------------------- state */
    var state = {
        shards: CFG.START_SHARDS,
        solved: [],          /* booleans, one per riddle */
        hintsUsed: 0,
        current: null,       /* index of the riddle on screen */
        hintUsedThis: false,
        screen: 'boot'
    };

    var prefs = { music: true, sfx: true, motion: true };

    var el = {};             /* cached DOM references */
    var airOn = false;       /* Galileo sim: air resistance toggle */
    var typeTimer = null;

    /* -------------------------------------------------------- persistence */

    function loadSave() {
        state.solved = RIDDLES.map(function () { return false; });
        try {
            var raw = global.localStorage.getItem(CFG.SAVE_KEY);
            if (!raw) { return; }
            var s = JSON.parse(raw);
            if (s && typeof s === 'object') {
                if (typeof s.shards === 'number' && isFinite(s.shards)) {
                    state.shards = Math.max(0, Math.floor(s.shards));
                }
                if (Array.isArray(s.solved)) {
                    for (var i = 0; i < state.solved.length; i++) {
                        state.solved[i] = !!s.solved[i];
                    }
                }
                if (typeof s.hintsUsed === 'number' && isFinite(s.hintsUsed)) {
                    state.hintsUsed = Math.max(0, Math.floor(s.hintsUsed));
                }
            }
        } catch (e) { /* corrupt or unavailable storage: start fresh */ }
    }

    function save() {
        try {
            global.localStorage.setItem(CFG.SAVE_KEY, JSON.stringify({
                shards: state.shards,
                solved: state.solved,
                hintsUsed: state.hintsUsed
            }));
        } catch (e) { /* private mode: play without saving */ }
    }

    function loadPrefs() {
        var seen = false;
        try {
            var raw = global.localStorage.getItem(CFG.PREFS_KEY);
            if (raw) {
                seen = true;
                var p = JSON.parse(raw);
                if (p && typeof p === 'object') {
                    if (typeof p.music === 'boolean') { prefs.music = p.music; }
                    if (typeof p.sfx === 'boolean') { prefs.sfx = p.sfx; }
                    if (typeof p.motion === 'boolean') { prefs.motion = p.motion; }
                }
            }
        } catch (e) { /* defaults are fine */ }

        /* First run on a machine that asks for reduced motion: start with the
           ambient backdrop off. The simulations still animate - there the
           movement is the lesson, not decoration. */
        if (!seen && global.matchMedia) {
            try {
                if (global.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                    prefs.motion = false;
                }
            } catch (e2) { /* ignore */ }
        }
    }

    function savePrefs() {
        try {
            global.localStorage.setItem(CFG.PREFS_KEY, JSON.stringify(prefs));
        } catch (e) { /* ignore */ }
    }

    function resetProgress() {
        state.shards = CFG.START_SHARDS;
        state.hintsUsed = 0;
        state.solved = RIDDLES.map(function () { return false; });
        save();
    }

    /* --------------------------------------------------------- utilities */

    function $(id) { return document.getElementById(id); }
    function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

    function solvedCount() {
        return state.solved.reduce(function (n, v) { return n + (v ? 1 : 0); }, 0);
    }

    function firstUnsolved() {
        for (var i = 0; i < state.solved.length; i++) {
            if (!state.solved[i]) { return i; }
        }
        return -1;
    }

    function isUnlocked(i) {
        return i === 0 || state.solved[i - 1] === true;
    }

    /* Fisher-Yates, so option order changes every visit */
    function shuffled(list) {
        var a = list.slice();
        for (var i = a.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var t = a[i]; a[i] = a[j]; a[j] = t;
        }
        return a;
    }

    /* Unified activation: one handler covers touch, pen, mouse and keyboard.
       Pointer Events give us the tap without the 300ms click delay, and the
       keyboard path is preserved for accessibility. */
    function onTap(node, fn, opts) {
        if (!node) { return; }
        opts = opts || {};
        var armed = false;

        node.addEventListener('pointerdown', function (e) {
            if (e.pointerType === 'mouse' && e.button !== 0) { return; }
            armed = true;
            node.classList.add('is-press');
            if (!opts.silent) { SND.play('click'); }
        });
        node.addEventListener('pointerup', function (e) {
            node.classList.remove('is-press');
            if (!armed) { return; }
            armed = false;
            e.preventDefault();
            fn(e);
        });
        node.addEventListener('pointercancel', function () {
            armed = false;
            node.classList.remove('is-press');
        });
        node.addEventListener('pointerleave', function () {
            armed = false;
            node.classList.remove('is-press');
        });
        /* keyboard activation for buttons that are not native <button> */
        node.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (!opts.silent) { SND.play('click'); }
                fn(e);
            }
        });
    }

    /* --------------------------------------------------------- screen flow */

    var SCREENS = {
        boot: 'screen-boot',
        menu: 'screen-menu',
        map: 'screen-map',
        riddle: 'screen-riddle',
        codex: 'screen-codex',
        complete: 'screen-complete'
    };

    var STAGE_LABEL = {
        menu: 'Mission Control',
        map: 'Ascent Map',
        riddle: 'Riddle',
        codex: 'Codex',
        complete: 'Summit'
    };

    function setScreen(name, opts) {
        opts = opts || {};
        if (state.screen === name) { return; }
        if (!opts.silent) { SND.play('whoosh'); }

        Object.keys(SCREENS).forEach(function (k) {
            var node = $(SCREENS[k]);
            if (node) { node.classList.toggle('is-active', k === name); }
        });
        state.screen = name;

        el.hud.hidden = (name === 'boot');
        el.hudBack.disabled = (name === 'menu' || name === 'boot');
        el.hudStage.textContent = STAGE_LABEL[name] || '';

        updateHudProgress();

        /* parallax depth follows how high the player has climbed */
        var depth = 0;
        if (name === 'map') { depth = 0.15 + 0.2 * (solvedCount() / RIDDLES.length); }
        else if (name === 'riddle' || name === 'codex') {
            depth = 0.3 + 0.5 * ((state.current || 0) / Math.max(1, RIDDLES.length - 1));
        } else if (name === 'complete') { depth = 1; }
        BG.setDepth(depth);
    }

    function updateHudProgress() {
        var pct = (solvedCount() / RIDDLES.length) * 100;
        el.hudTrack.style.width = pct + '%';
        el.menuProgress.textContent = 'Ascent progress: ' + solvedCount() + ' of ' + RIDDLES.length + ' nodes';
        el.playLabel.textContent = solvedCount() > 0 && solvedCount() < RIDDLES.length
            ? 'Continue Ascent'
            : 'Initiate Launch';
    }

    function setShards(value, opts) {
        opts = opts || {};
        var next = Math.max(0, Math.floor(value));
        state.shards = next;
        el.shardValue.textContent = next;
        save();

        if (opts.gain) {
            el.shardCounter.classList.add('is-gain');
            setTimeout(function () { el.shardCounter.classList.remove('is-gain'); }, 420);
        }
    }

    function denyShards() {
        el.shardCounter.classList.add('is-deny');
        setTimeout(function () { el.shardCounter.classList.remove('is-deny'); }, 520);
    }

    /* ------------------------------------------------------------- toast */

    var toastTimer = null;
    function toast(text, kind, icon) {
        el.toastText.textContent = text;
        el.toastIcon.src = ICONS + (icon || 'hint-comet.png');
        el.toast.classList.remove('toast--good', 'toast--bad');
        if (kind) { el.toast.classList.add('toast--' + kind); }
        el.toast.classList.add('is-show');
        if (toastTimer) { clearTimeout(toastTimer); }
        toastTimer = setTimeout(function () {
            el.toast.classList.remove('is-show');
        }, 4200);
    }

    /* ------------------------------------------------------------ modals */

    var openModal = null;

    function showModal(id) {
        var node = $(id);
        if (!node) { return; }
        node.hidden = false;
        /* force a frame so the opening transition actually runs */
        global.requestAnimationFrame(function () { node.classList.add('is-open'); });
        openModal = id;
    }

    function hideModal(id) {
        var node = $(id);
        if (!node) { return; }
        node.classList.remove('is-open');
        setTimeout(function () { node.hidden = true; }, 320);
        if (openModal === id) { openModal = null; }
    }

    /* --------------------------------------------------------- ascent map */

    function buildMap() {
        el.nodes.innerHTML = '';
        var n = RIDDLES.length;
        RIDDLES.forEach(function (r, i) {
            /* node 1 sits at the bottom, the last node at the top */
            var topPct = 88 - (i * (76 / Math.max(1, n - 1)));

            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'node';
            btn.style.top = topPct + '%';
            btn.dataset.riddleId = String(i);

            var disc = document.createElement('span');
            disc.className = 'node__disc';

            var tag = document.createElement('span');
            tag.className = 'node__tag';
            tag.textContent = r.name;

            btn.appendChild(disc);
            btn.appendChild(tag);
            el.nodes.appendChild(btn);

            onTap(btn, function () { openRiddle(i); }, { silent: true });
        });
        refreshMap();
    }

    function refreshMap() {
        var nodes = $$('.node', el.nodes);
        var next = firstUnsolved();

        nodes.forEach(function (btn, i) {
            var disc = btn.querySelector('.node__disc');
            btn.classList.remove('is-done', 'is-locked', 'is-current');

            if (state.solved[i]) {
                btn.classList.add('is-done');
                btn.setAttribute('aria-label', RIDDLES[i].name + ' - solved');
                disc.innerHTML = '';
                var ok = document.createElement('img');
                ok.src = ICONS + 'check.png';
                ok.alt = '';
                disc.appendChild(ok);
            } else if (!isUnlocked(i)) {
                btn.classList.add('is-locked');
                btn.setAttribute('aria-label', RIDDLES[i].name + ' - locked');
                disc.innerHTML = '';
                var lk = document.createElement('img');
                lk.src = ICONS + 'lock.png';
                lk.alt = '';
                disc.appendChild(lk);
            } else {
                btn.setAttribute('aria-label', RIDDLES[i].name + ' - available');
                disc.textContent = String(i + 1);
                if (i === next) { btn.classList.add('is-current'); }
            }
        });

        el.railFill.style.height = ((solvedCount() / RIDDLES.length) * 100) + '%';
        updateHudProgress();
    }

    /* ------------------------------------------------------------ riddle */

    function typeWriter(node, text, speed) {
        if (typeTimer) { clearTimeout(typeTimer); typeTimer = null; }
        node.textContent = '';

        var caret = document.createElement('i');
        caret.className = 'caret';
        node.appendChild(caret);

        var i = 0;
        var span = document.createTextNode('');
        node.insertBefore(span, caret);

        function tick() {
            if (i < text.length) {
                span.nodeValue += text.charAt(i);
                i++;
                typeTimer = setTimeout(tick, speed || 18);
            } else {
                typeTimer = null;
                if (caret.parentNode) { caret.parentNode.removeChild(caret); }
            }
        }
        tick();
    }

    function openRiddle(index) {
        if (!isUnlocked(index)) {
            SND.play('deny');
            toast('That node is still sealed. Solve the one below it first.', 'bad', 'lock.png');
            return;
        }
        SND.play('click');
        state.current = index;
        state.hintUsedThis = false;

        var r = RIDDLES[index];
        el.riddleIndex.textContent = 'Node ' + (index + 1) + ' of ' + RIDDLES.length;
        el.riddleName.textContent = r.name;
        typeWriter(el.riddleText, r.riddle);

        el.hintBtn.disabled = false;
        buildOptions(r);
        setScreen('riddle');
    }

    function buildOptions(r) {
        el.options.innerHTML = '';
        var opts = shuffled(r.options);

        opts.forEach(function (text, i) {
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'option';
            b.dataset.answer = text;

            var key = document.createElement('span');
            key.className = 'option__key';
            key.textContent = String(i + 1);

            var label = document.createElement('span');
            label.className = 'option__text';
            label.textContent = text;

            b.appendChild(key);
            b.appendChild(label);
            el.options.appendChild(b);

            onTap(b, function () { chooseOption(b); }, { silent: true });
        });
    }

    function chooseOption(btn) {
        if (!btn || btn.disabled || btn.classList.contains('is-wrong')) { return; }
        var r = RIDDLES[state.current];
        var picked = btn.dataset.answer;
        var correct = r.accepted.indexOf(picked) !== -1;

        if (!correct) {
            SND.play('incorrect');
            btn.classList.add('is-wrong');
            btn.disabled = true;
            var x = document.createElement('img');
            x.className = 'option__mark';
            x.src = ICONS + 'cross.png';
            x.alt = '';
            btn.appendChild(x);
            FX.puff(btn);
            return;
        }

        /* correct */
        SND.play('correct');
        btn.classList.add('is-right');
        var tick = document.createElement('img');
        tick.className = 'option__mark';
        tick.src = ICONS + 'check.png';
        tick.alt = '';
        btn.appendChild(tick);

        $$('.option', el.options).forEach(function (o) {
            o.disabled = true;
            if (o !== btn && !o.classList.contains('is-wrong')) { o.classList.add('is-dead'); }
        });

        FX.burst(btn, { count: 52 });
        shockwave();

        var wasNew = !state.solved[state.current];
        if (wasNew) {
            state.solved[state.current] = true;
            setShards(state.shards + CFG.REWARD_AMOUNT, { gain: true });
            FX.collect(btn, el.shardCounter, 20);
            FX.pop(btn, '+' + CFG.REWARD_AMOUNT, 'gold');
            SND.play('coin');
        } else {
            FX.pop(btn, 'Correct', 'good');
        }
        save();

        setTimeout(function () { showCodex(state.current); }, 900);
    }

    function shockwave() {
        el.shock.classList.remove('is-on');
        void el.shock.offsetWidth;         /* restart the CSS animation */
        el.shock.classList.add('is-on');
        setTimeout(function () { el.shock.classList.remove('is-on'); }, 1200);
    }

    function useHint() {
        if (state.current == null) { return; }
        if (state.hintUsedThis) { return; }

        if (state.shards < CFG.HINT_COST) {
            SND.play('deny');
            denyShards();
            toast('Not enough Star Shards. You need ' + CFG.HINT_COST + '.', 'bad', 'star-shard.png');
            return;
        }
        setShards(state.shards - CFG.HINT_COST);
        state.hintsUsed++;
        state.hintUsedThis = true;
        el.hintBtn.disabled = true;
        save();

        FX.pop(el.hintBtn, '-' + CFG.HINT_COST, 'bad');
        toast(RIDDLES[state.current].hint, null, 'hint-comet.png');
    }

    /* ------------------------------------------------------------- codex */

    function showCodex(index) {
        var r = RIDDLES[index];
        el.codexTitle.textContent = 'Codex: ' + r.name;
        selectTab('simulation');
        setScreen('codex');
        SND.play('unlock');
        resetSimulation(index);
    }

    function selectTab(tab) {
        $$('.tab', el.codexTabs).forEach(function (t) {
            t.classList.toggle('is-active', t.dataset.tab === tab);
        });
        $$('.codex__page').forEach(function (p) { p.classList.remove('is-active'); });

        if (tab === 'lore') {
            var r = RIDDLES[state.current];
            el.loreTitle.textContent = r.name;
            el.loreText.textContent = r.lore;
            $('codex-page-lore').classList.add('is-active');
        } else {
            var page = $('codex-page-' + state.current);
            if (page) { page.classList.add('is-active'); }
        }
    }

    function leaveCodex() {
        stopTrajectory();
        stopPlunge();
        stopGalileo();
        stopLift();
        refreshMap();
        if (state.solved.every(function (v) { return v; })) {
            showComplete();
        } else {
            setScreen('map');
        }
    }

    /* ------------------------------------------------------- simulations */

    function resetSimulation(id) {
        if (id === 0) {
            resetGalileo();
        } else if (id === 1) {
            resetPlunge();
        } else if (id === 2) {
            resetLift();
        } else if (id === 3) {
            stopTrajectory();
            var m = layoutTrajectory();
            if (m) { drawGhost(m); }

            var proj = $('ball-projectile');
            if (proj) {
                proj.classList.remove('is-live');
                proj.style.transform = 'translate(0px,0px)';
            }
            var trail = $('arc-trail');
            if (trail) { trail.setAttribute('d', ''); }
            ['apex-mark', 'impact', 'muzzle-flash'].forEach(function (n) {
                var node = $(n);
                if (node) { node.classList.remove('is-on'); }
            });
            var cn = $('cannon');
            if (cn) { cn.classList.remove('is-firing'); }
            if (el.arcGuide) { el.arcGuide.classList.remove('is-on'); }
        }
    }

    /* ------------------------------------------------------- elevator (2)
       The car runs the full height of the shaft under a trapezoidal speed
       profile (accelerate / cruise / decelerate), slow enough to read. The
       scale shows the real apparent weight m(g+a)/g for whatever the car is
       doing. Cut the cable and the camera zooms in and slows down, so the
       weightless moment is actually watchable. */

    var LIFT = {
        g: 9.8,
        H: 20,            /* shaft height, m           */
        a: 2.6,           /* drive acceleration, m/s^2 */
        vc: 6.5,          /* cruise speed, m/s         */
        mass: 70,
        slow: 0.5,        /* free fall plays at half speed */
        zoomIn: 1.75,
        mode: 'idle',     /* idle | move | hoist | fall */
        target: 0,
        y: 0, v: 0, aNow: 0,
        zoom: 1, zoomWant: 1,
        raf: null, last: 0
    };

    function stopLift() {
        if (LIFT.raf) { global.cancelAnimationFrame(LIFT.raf); LIFT.raf = null; }
        LIFT.last = 0;
    }

    function liftLabel(text) {
        var n = $('lift-state');
        if (n) { n.textContent = text; }
    }

    function liftReadout() {
        var val = $('scale-reading');
        var box = val ? val.parentNode : null;
        if (!val) { return; }

        var kg = LIFT.mode === 'fall' ? 0 : LIFT.mass * (LIFT.g + LIFT.aNow) / LIFT.g;
        if (kg < 0) { kg = 0; }
        val.textContent = kg.toFixed(1);

        if (box && box.classList) {
            box.classList.toggle('is-zero', kg < 0.05);
            box.classList.toggle('is-heavy', kg > LIFT.mass + 0.6);
            box.classList.toggle('is-light', kg > 0.05 && kg < LIFT.mass - 0.6);
        }
    }

    function liftRender() {
        var stage = $('sim-free-fall');
        var car = $('elevator-car');
        var view = $('lift-view');
        if (!stage || !car || !view) { return; }

        var Hv = stage.clientHeight;
        var Hc = car.offsetHeight;
        var travel = Math.max(20, Hv - 16 - Hc);
        var bottom = 16 + (LIFT.y / LIFT.H) * travel;
        car.style.bottom = bottom.toFixed(1) + 'px';

        /* camera follows the car once zoomed in */
        if (LIFT.zoom <= 1.002) {
            view.style.transform = 'none';
        } else {
            var carCentre = Hv - bottom - Hc / 2;
            var ty = Hv / 2 - carCentre * LIFT.zoom;
            ty = Math.min(0, Math.max(Hv - Hv * LIFT.zoom, ty));
            view.style.transform = 'translateY(' + ty.toFixed(1) + 'px) scale(' + LIFT.zoom.toFixed(3) + ')';
        }
        liftReadout();
    }

    function resetLift() {
        stopLift();
        LIFT.mode = 'idle';
        LIFT.y = 0; LIFT.v = 0; LIFT.aNow = 0;
        LIFT.zoom = 1; LIFT.zoomWant = 1;

        var car = $('elevator-car');
        if (car) { car.classList.remove('is-cut', 'is-falling'); }
        liftLabel('At rest');
        liftRender();
    }

    function beginFreeFall() {
        LIFT.mode = 'fall';
        LIFT.v = 0;
        LIFT.zoomWant = LIFT.zoomIn;
        var car = $('elevator-car');
        if (car) { car.classList.add('is-cut', 'is-falling'); }
        liftLabel('Cable cut - free fall');
        SND.play('whoosh');
    }

    function liftStep(now) {
        if (!LIFT.last) { LIFT.last = now; }
        var raw = Math.max(0, Math.min(0.05, (now - LIFT.last) / 1000));
        LIFT.last = now;
        var dt = raw * (LIFT.mode === 'fall' ? LIFT.slow : 1);

        if (LIFT.mode === 'move' || LIFT.mode === 'hoist') {
            var rem = LIFT.target - LIFT.y;
            var dir = rem >= 0 ? 1 : -1;
            var stopDist = (LIFT.v * LIFT.v) / (2 * LIFT.a);

            if (Math.abs(rem) <= stopDist) {
                LIFT.aNow = (LIFT.v > 0 ? -1 : 1) * LIFT.a;
            } else if (Math.abs(LIFT.v) < LIFT.vc) {
                LIFT.aNow = dir * LIFT.a;
            } else {
                LIFT.aNow = 0;
            }
            LIFT.v += LIFT.aNow * dt;
            LIFT.y += LIFT.v * dt;

            if (Math.abs(LIFT.target - LIFT.y) < 0.08 && Math.abs(LIFT.v) < 0.5) {
                LIFT.y = LIFT.target;
                LIFT.v = 0;
                LIFT.aNow = 0;
                if (LIFT.mode === 'hoist') {
                    beginFreeFall();
                } else {
                    LIFT.mode = 'idle';
                    liftLabel('At rest');
                    liftRender();
                    stopLift();
                    return;
                }
            } else {
                liftLabel(LIFT.aNow > 0.01 ? 'Accelerating up'
                        : LIFT.aNow < -0.01 ? 'Slowing down'
                        : 'Constant speed');
            }
        } else if (LIFT.mode === 'fall') {
            LIFT.aNow = -LIFT.g;
            LIFT.v -= LIFT.g * dt;
            LIFT.y += LIFT.v * dt;
            if (LIFT.y <= 0) {
                LIFT.y = 0; LIFT.v = 0; LIFT.aNow = 0;
                LIFT.mode = 'idle';
                LIFT.zoomWant = 1;
                var carL = $('elevator-car');
                if (carL) { carL.classList.remove('is-falling'); }
                liftLabel('Landed');
                SND.play('thud');
            }
        }

        LIFT.zoom += (LIFT.zoomWant - LIFT.zoom) * Math.min(1, raw * 3.2);
        liftRender();

        if (LIFT.mode === 'idle' && Math.abs(LIFT.zoom - LIFT.zoomWant) < 0.004) {
            LIFT.zoom = LIFT.zoomWant;
            liftRender();
            stopLift();
            return;
        }
        LIFT.raf = global.requestAnimationFrame(liftStep);
    }

    function liftRun() {
        if (LIFT.raf) { return; }
        LIFT.last = 0;
        LIFT.raf = global.requestAnimationFrame(liftStep);
    }

    function liftCommand(mode) {
        var car = $('elevator-car');
        if (!car) { return; }

        if (mode === 'reset') { resetLift(); return; }

        if (mode === 'up' || mode === 'down') {
            if (LIFT.mode === 'fall') { return; }
            car.classList.remove('is-cut', 'is-falling');
            LIFT.zoomWant = 1;
            LIFT.mode = 'move';
            LIFT.target = mode === 'up' ? LIFT.H : 0;
            liftRun();
            return;
        }
        if (mode === 'freefall') {
            if (LIFT.mode === 'fall' || LIFT.mode === 'hoist') { return; }
            if (LIFT.y > LIFT.H - 0.5) {
                beginFreeFall();
            } else {
                car.classList.remove('is-cut', 'is-falling');
                LIFT.mode = 'hoist';
                LIFT.target = LIFT.H;
                liftLabel('Rising to the top');
            }
            liftRun();
        }
    }

    /* -------------------------------------------------- Galileo drop (0)
       Both balls are integrated, not tweened, so the motion is genuine free
       fall (speed builds with time) rather than a linear slide. In vacuum the
       8 kg iron ball and the 0.4 kg wooden ball land together. Add air and
       drag bites the light ball far harder, so the heavier one lands first. */

    var GAL = {
        g: 9.8,
        h: 45,            /* drop height, m                */
        tScale: 1.5,      /* time compression for playback */
        vIron: 85,        /* terminal velocity in air, m/s */
        vWood: 10,
        running: false,
        raf: null,
        last: 0,
        iron: null,
        wood: null
    };

    function galBody(vT) {
        return { y: 0, v: 0, t: 0, vT: vT, landed: false };
    }

    function stopGalileo() {
        GAL.running = false;
        if (GAL.raf) { global.cancelAnimationFrame(GAL.raf); GAL.raf = null; }
        GAL.last = 0;
    }

    /* px of travel available to a ball of the given diameter */
    function galSpan(stage, size) {
        return Math.max(40, stage.clientHeight - 16 - 22 - size);
    }

    function galPlace(ball, body, stage) {
        if (!ball || !stage) { return; }
        var span = galSpan(stage, ball.offsetHeight || 24);
        ball.style.transform = 'translateY(' + (span * (body.y / GAL.h)).toFixed(2) + 'px)';
    }

    function galRender() {
        var stage = $('sim-gravity');
        if (!stage) { return; }
        galPlace($('iron-ball'), GAL.iron, stage);
        galPlace($('wooden-ball'), GAL.wood, stage);
    }

    function resetGalileo() {
        stopGalileo();
        GAL.iron = galBody(GAL.vIron);
        GAL.wood = galBody(GAL.vWood);
        ['time-iron', 'time-wood'].forEach(function (id) {
            var n = $(id);
            if (n) { n.classList.remove('is-on', 'is-first'); n.textContent = ''; }
        });
        galRender();
        var b = $('btn-drop');
        if (b) { b.disabled = false; }
    }

    function galSettle() {
        var ti = $('time-iron');
        var tw = $('time-wood');
        /* highlight the winner only when there actually is one */
        var gap = GAL.wood.t - GAL.iron.t;
        if (ti && gap > 0.05) { ti.classList.add('is-first'); }
        if (tw && gap < -0.05) { tw.classList.add('is-first'); }
        var b = $('btn-drop');
        if (b) { b.disabled = false; }
    }

    function galStep(now) {
        if (!GAL.last) { GAL.last = now; }
        var dt = Math.max(0, Math.min(0.05, (now - GAL.last) / 1000)) * GAL.tScale;
        GAL.last = now;

        [['time-iron', GAL.iron], ['time-wood', GAL.wood]].forEach(function (pair) {
            var chip = pair[0];
            var body = pair[1];
            if (body.landed) { return; }
            /* a = g in vacuum; a = g - (g / vT^2) * v^2 once there is air */
            var a = GAL.g;
            if (airOn) { a -= (GAL.g / (body.vT * body.vT)) * body.v * body.v; }
            body.v += a * dt;
            body.y += body.v * dt;
            body.t += dt;
            if (body.y >= GAL.h) {
                body.y = GAL.h;
                body.landed = true;
                SND.play('thud');
                /* show each time the moment that ball touches down, so the
                   gap between them is something you watch happen */
                var n = $(chip);
                if (n) { n.textContent = body.t.toFixed(2) + ' s'; n.classList.add('is-on'); }
            }
        });

        galRender();

        if (GAL.iron.landed && GAL.wood.landed) {
            stopGalileo();
            galSettle();
            return;
        }
        GAL.raf = global.requestAnimationFrame(galStep);
    }

    function dropBalls() {
        if (GAL.running) { return; }
        resetGalileo();
        GAL.running = true;
        var b = $('btn-drop');
        if (b) { b.disabled = true; }
        SND.play('whoosh');
        GAL.last = 0;
        GAL.raf = global.requestAnimationFrame(galStep);
    }

    /* ---------------------------------------------------- plunge sim (1)
       A real integration of  a = g - k*v^2  , where k = g / vTerminal^2.
       The jumper accelerates, then plateaus as drag grows to match weight;
       opening the canopy multiplies drag and drops terminal velocity hard.
       The player chooses when to pull, which is the whole lesson. */

    var PL = {
        g: 9.8,
        vFree: 55,        /* belly-to-earth terminal velocity, m/s */
        vChute: 14,       /* terminal velocity under canopy, m/s   */
        alt0: 240,        /* exit altitude, m                      */
        tScale: 2.0,      /* time compression, so a jump reads in seconds */
        safeSpeed: 20,    /* survivable touchdown speed, m/s       */
        state: 'ready',
        alt: 240, v: 0, chute: false,
        raf: null, last: 0
    };

    function stopPlunge() {
        if (PL.raf) { global.cancelAnimationFrame(PL.raf); PL.raf = null; }
        PL.last = 0;
    }

    function plungeBtn(text, disabled) {
        var b = $('btn-parachute');
        if (!b) { return; }
        var label = b.querySelector('.btn__label');
        if (label) { label.textContent = text; }
        b.disabled = !!disabled;
        b.classList.toggle('btn--gold', text === 'Deploy Chute');
    }

    function plungeRender() {
        var stage = $('sim-air-resistance');
        var diver = $('stick-figure');
        if (!stage || !diver) { return; }

        /* map altitude onto the drop zone, clear of the instrument strip
           (which wraps to two rows on narrow screens, so measure it) */
        var hud = stage.querySelector('.plunge-hud');
        var top0 = (hud ? hud.offsetHeight : 56) + 6;
        var bottom0 = Math.max(top0 + 40, stage.clientHeight - 16 - diver.offsetHeight - 4);
        var f = 1 - Math.max(0, Math.min(1, PL.alt / PL.alt0));
        diver.style.top = (top0 + (bottom0 - top0) * f) + 'px';

        var altEl = $('plunge-alt');
        var spdEl = $('plunge-speed');
        if (altEl) { altEl.textContent = Math.max(0, Math.round(PL.alt)); }
        if (spdEl) { spdEl.textContent = Math.round(PL.v); }

        /* drag as a fraction of weight: they are equal at terminal velocity */
        var vT = PL.chute ? PL.vChute : PL.vFree;
        var ratio = Math.max(0, Math.min(1, (PL.v * PL.v) / (vT * vT)));
        var grav = $('force-grav');
        var drag = $('force-drag');
        if (grav) { grav.style.width = '100%'; }
        if (drag) { drag.style.width = (ratio * 100).toFixed(1) + '%'; }

        var badge = $('terminal-badge');
        if (badge) { badge.classList.toggle('is-on', ratio > 0.96 && PL.v > 1); }

        stage.style.setProperty('--spd', (PL.v / PL.vFree).toFixed(3));
    }

    function resetPlunge() {
        stopPlunge();
        PL.state = 'ready';
        PL.alt = PL.alt0;
        PL.v = 0;
        PL.chute = false;

        var stage = $('sim-air-resistance');
        if (stage) {
            stage.classList.remove('is-falling', 'is-chute', 'is-hard');
            stage.style.setProperty('--spd', '0');
        }
        var verdict = $('plunge-verdict');
        if (verdict) {
            verdict.classList.remove('is-on', 'is-bad');
            verdict.textContent = '';
        }

        plungeRender();
        plungeBtn('Jump', false);
    }

    function plungeLand() {
        stopPlunge();
        PL.state = 'landed';
        PL.alt = 0;

        var stage = $('sim-air-resistance');
        var verdict = $('plunge-verdict');
        var safe = PL.chute && PL.v <= PL.safeSpeed;

        if (stage) { stage.classList.remove('is-falling'); }
        if (verdict) {
            verdict.textContent = safe
                ? 'Safe landing at ' + Math.round(PL.v) + ' m/s'
                : 'Impact at ' + Math.round(PL.v) + ' m/s';
            verdict.classList.toggle('is-bad', !safe);
            verdict.classList.add('is-on');
        }
        if (safe) {
            SND.play('correct');
        } else {
            SND.play('thud');
            SND.play('incorrect');
            if (stage) {
                stage.classList.remove('is-hard');
                void stage.offsetWidth;
                stage.classList.add('is-hard');
            }
        }
        plungeRender();
        plungeBtn('Reset', false);
    }

    function plungeStep(now) {
        if (!PL.last) { PL.last = now; }
        /* clamped so a backgrounded tab cannot teleport the jumper */
        var dt = Math.max(0, Math.min(0.05, (now - PL.last) / 1000)) * PL.tScale;
        PL.last = now;

        var vT = PL.chute ? PL.vChute : PL.vFree;
        var k = PL.g / (vT * vT);
        PL.v += (PL.g - k * PL.v * PL.v) * dt;
        if (PL.v < 0) { PL.v = 0; }
        PL.alt -= PL.v * dt;

        if (PL.alt <= 0) {
            plungeLand();
            return;
        }
        plungeRender();
        PL.raf = global.requestAnimationFrame(plungeStep);
    }

    function plungeAction() {
        var stage = $('sim-air-resistance');
        if (!stage) { return; }

        if (PL.state === 'ready') {
            PL.state = 'falling';
            stage.classList.add('is-falling');
            SND.play('whoosh');
            plungeBtn('Deploy Chute', false);
            PL.last = 0;
            PL.raf = global.requestAnimationFrame(plungeStep);
            return;
        }
        if (PL.state === 'falling') {
            PL.state = 'chute';
            PL.chute = true;
            stage.classList.remove('is-falling');
            stage.classList.add('is-chute');
            SND.play('unlock');
            plungeBtn('Descending', true);
            return;
        }
        if (PL.state === 'landed') {
            resetPlunge();
        }
    }

    /* ------------------------------------------------ trajectory sim (3)
       The ball's flight is a CSS keyframe animation; the drawn trail is the
       same parabola evaluated in JS. Both read the identical --arc-* values,
       so the line always sits exactly under the ball at any stage size. */

    var ARC = {
        muzzleX: 66,   /* ball centre at launch, px from the stage's left  */
        muzzleY: 58,   /* ball centre at launch, px from the stage's floor */
        restY: 26,     /* ball centre where it comes to rest on the ground */
        dur: 3000
    };
    var arcRaf = null;
    var arcTimers = [];

    function stopTrajectory() {
        if (arcRaf) { global.cancelAnimationFrame(arcRaf); arcRaf = null; }
        arcTimers.forEach(function (t) { clearTimeout(t); });
        arcTimers = [];
    }

    /* size the shot to whatever space the stage currently has */
    function layoutTrajectory() {
        var stage = $('sim-trajectory');
        var proj = $('ball-projectile');
        var guide = el.arcGuide;
        if (!stage || !proj || !guide) { return null; }

        var w = stage.clientWidth;
        var h = stage.clientHeight;
        if (w < 40 || h < 40) { return null; }

        var drop = ARC.muzzleY - ARC.restY;
        var ax = Math.max(140, w - ARC.muzzleX - 34);
        var ah = Math.max(70, h - ARC.muzzleY - 34);

        proj.style.left = (ARC.muzzleX - 10) + 'px';
        proj.style.bottom = (ARC.muzzleY - 10) + 'px';

        /* the overlay box spans launch point to landing point exactly */
        guide.style.left = ARC.muzzleX + 'px';
        guide.style.bottom = ARC.restY + 'px';
        guide.style.width = ax + 'px';
        guide.style.height = (ah + drop) + 'px';
        guide.setAttribute('viewBox', '0 0 ' + ax + ' ' + (ah + drop));

        var m = { ax: ax, ah: ah, drop: drop };

        /* apex of the sheared parabola */
        var ts = (4 * ah - drop) / (8 * ah);
        var up = ah * 4 * ts * (1 - ts) - drop * ts;
        var apex = $('apex-mark');
        if (apex) {
            apex.style.left = (ARC.muzzleX + ax * ts) + 'px';
            apex.style.bottom = (ARC.muzzleY + up + 16) + 'px';
        }
        m.apexT = ts;

        var flash = $('muzzle-flash');
        if (flash) {
            flash.style.left = ARC.muzzleX + 'px';
            flash.style.bottom = ARC.muzzleY + 'px';
        }
        return m;
    }

    /* vertical offset of the ball at time t, positive = downwards */
    function arcY(t, m) { return -m.ah * 4 * t * (1 - t) + m.drop * t; }

    /* place the cannonball at parameter t along the same parabola the
       trail is drawn from */
    function setBallAt(t, m) {
        var proj = $('ball-projectile');
        if (!proj) { return; }
        proj.style.transform = 'translate(' + (m.ax * t).toFixed(2) + 'px,' +
                                              arcY(t, m).toFixed(2) + 'px)';
    }

    function arcPath(m, upTo) {
        var steps = Math.max(2, Math.ceil(upTo * 72));
        var d = '';
        for (var i = 0; i <= steps; i++) {
            var t = upTo * (i / steps);
            var x = m.ax * t;
            var y = m.ah + arcY(t, m);
            d += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1);
        }
        return d;
    }

    function drawGhost(m) {
        var ghost = $('arc-ghost');
        if (ghost) { ghost.setAttribute('d', arcPath(m, 1)); }
    }

    function fireCannon() {
        var m = layoutTrajectory();
        if (!m) { return; }

        stopTrajectory();
        drawGhost(m);

        var proj = $('ball-projectile');
        var trail = $('arc-trail');
        var cannon = $('cannon');
        var flash = $('muzzle-flash');
        var apex = $('apex-mark');
        var impact = $('impact');

        [apex, impact, flash].forEach(function (n) { if (n) { n.classList.remove('is-on'); } });
        if (trail) { trail.setAttribute('d', ''); }
        proj.classList.remove('is-live');

        SND.play('launch');
        if (cannon) {
            cannon.classList.remove('is-firing');
            void cannon.offsetWidth;
            cannon.classList.add('is-firing');
        }
        if (flash) { void flash.offsetWidth; flash.classList.add('is-on'); }
        arcTimers.push(setTimeout(function () {
            if (cannon) { cannon.classList.remove('is-firing'); }
            if (flash) { flash.classList.remove('is-on'); }
        }, 420));

        el.arcGuide.classList.add('is-on');
        proj.classList.add('is-live');
        setBallAt(0, m);

        var start = global.performance && global.performance.now
            ? global.performance.now()
            : Date.now();

        var landed = false;
        function land() {
            if (landed) { return; }
            landed = true;
            if (arcRaf) { global.cancelAnimationFrame(arcRaf); arcRaf = null; }
            setBallAt(1, m);
            if (trail) { trail.setAttribute('d', arcPath(m, 1)); }
            SND.play('thud');
            if (impact) {
                impact.style.left = (ARC.muzzleX + m.ax) + 'px';
                impact.classList.remove('is-on');
                void impact.offsetWidth;
                impact.classList.add('is-on');
            }
            arcTimers.push(setTimeout(function () {
                if (impact) { impact.classList.remove('is-on'); }
                if (apex) { apex.classList.remove('is-on'); }
            }, 900));
        }

        function step(now) {
            /* the rAF timestamp is the frame's start time and can sit a
               hair behind the performance.now() taken at fire time, so
               clamp rather than let the ball jump backwards */
            var t = Math.max(0, Math.min(1, (now - start) / ARC.dur));
            /* ball and trail are moved by the SAME clock, so the shot can
               never desync and no motion preference can flatten it */
            setBallAt(t, m);
            if (trail) { trail.setAttribute('d', arcPath(m, t)); }
            if (apex && t >= m.apexT) { apex.classList.add('is-on'); }

            if (t < 1) {
                arcRaf = global.requestAnimationFrame(step);
                return;
            }
            arcRaf = null;
            land();
        }
        arcRaf = global.requestAnimationFrame(step);
    }

    function wireSimulations() {
        /* --- Galileo --- */
        onTap($('btn-drop'), function () { dropBalls(); }, { silent: true });

        onTap($('btn-air'), function () {
            airOn = !airOn;
            var b = $('btn-air');
            b.querySelector('.btn__label').textContent = airOn ? 'Remove Air' : 'Add Air';
            b.classList.toggle('btn--gold', airOn);
            var lbl = $('gravity-medium');
            if (lbl) {
                lbl.textContent = airOn ? 'Medium: Air' : 'Medium: Vacuum';
                lbl.classList.toggle('is-air', airOn);
            }
            resetGalileo();     /* start each comparison from the top */
        }, { silent: true });

        /* --- The Plunge --- */
        onTap($('btn-parachute'), function () { plungeAction(); }, { silent: true });
        onTap($('btn-plunge-reset'), function () { resetPlunge(); }, { silent: true });

        /* --- Elevator --- */
        $$('#elevator-controls button').forEach(function (btn) {
            onTap(btn, function () { liftCommand(btn.dataset.mode); }, { silent: true });
        });

        /* --- Cannon --- */
        onTap($('btn-fire'), function () { fireCannon(); }, { silent: true });
    }

    /* ---------------------------------------------------- quest complete */

    function showComplete() {
        el.statNodes.textContent = solvedCount() + ' of ' + RIDDLES.length;
        el.statShards.textContent = state.shards;
        el.statHints.textContent = state.hintsUsed;
        setScreen('complete');
        SND.play('fanfare');
        setTimeout(function () {
            FX.burst($('screen-complete').querySelector('.complete__trophy'), {
                count: 70, maxSpeed: 560,
                colors: ['rgba(255,214,130,1)', 'rgba(255,255,255,1)', 'rgba(0,246,255,1)']
            });
        }, 260);
    }

    function buildLearnMore() {
        var host = el.learnBody;
        host.innerHTML = '';
        D.LEARN.forEach(function (item) {
            var card = document.createElement('div');
            card.className = 'learn__card';

            var term = document.createElement('h3');
            term.className = 'learn__term';
            var ic = document.createElement('img');
            ic.className = 'icon icon--xs';
            ic.src = ICONS + 'star-shard.png';
            ic.alt = '';
            term.appendChild(ic);
            term.appendChild(document.createTextNode(item.term));
            card.appendChild(term);

            var def = document.createElement('p');
            def.className = 'learn__def';
            def.innerHTML = item.def;
            card.appendChild(def);

            if (item.math) {
                var m = document.createElement('span');
                m.className = 'learn__math';
                m.textContent = item.math;
                card.appendChild(m);
            }
            if (item.eg) {
                var eg = document.createElement('p');
                eg.className = 'learn__eg';
                eg.innerHTML = item.eg;
                card.appendChild(eg);
            }
            host.appendChild(card);
        });
    }

    /* ----------------------------------------------------------- settings */

    function applyPrefs() {
        SND.setMusic(prefs.music);
        SND.setSfx(prefs.sfx);
        BG.setEnabled(prefs.motion);
        FX.setEnabled(prefs.motion);

        el.toggleMusic.classList.toggle('is-on', prefs.music);
        el.toggleMusic.setAttribute('aria-checked', String(prefs.music));
        el.iconMusic.src = ICONS + (prefs.music ? 'music-on.png' : 'music-off.png');

        el.toggleSfx.classList.toggle('is-on', prefs.sfx);
        el.toggleSfx.setAttribute('aria-checked', String(prefs.sfx));
        el.iconSfx.src = ICONS + (prefs.sfx ? 'sound-on.png' : 'sound-off.png');

        el.toggleMotion.classList.toggle('is-on', prefs.motion);
        el.toggleMotion.setAttribute('aria-checked', String(prefs.motion));
    }

    /* ------------------------------------------------------------ wiring */

    function cache() {
        el.hud = $('hud');
        el.hudBack = $('hud-back');
        el.hudStage = $('hud-stage');
        el.hudTrack = $('hud-track-fill');
        el.hudSettings = $('hud-settings');
        el.shardCounter = $('shard-counter');
        el.shardValue = $('shard-value');

        el.bootStatus = $('boot-status');
        el.bootMeter = $('boot-meter');

        el.menuProgress = $('menu-progress');
        el.playLabel = $('btn-play-label');

        el.nodes = $('ascent-nodes');
        el.railFill = $('ascent-rail-fill');

        el.riddleIndex = $('riddle-index');
        el.riddleName = $('riddle-name');
        el.riddleText = $('riddle-text');
        el.options = $('options');
        el.hintBtn = $('btn-hint');

        el.codexTitle = $('codex-title');
        el.codexTabs = $('codex-tabs');
        el.loreTitle = $('lore-title');
        el.loreText = $('lore-text');
        el.scaleReading = $('scale-reading');
        el.arcGuide = $('arc-guide');

        el.statNodes = $('stat-nodes');
        el.statShards = $('stat-shards');
        el.statHints = $('stat-hints');
        el.learnBody = $('learn-body');

        el.toggleMusic = $('toggle-music');
        el.toggleSfx = $('toggle-sfx');
        el.toggleMotion = $('toggle-motion');
        el.iconMusic = $('icon-music');
        el.iconSfx = $('icon-sfx');

        el.toast = $('toast');
        el.toastText = $('toast-text');
        el.toastIcon = $('toast-icon');
        el.shock = $('shockwave');
    }

    function wire() {
        /* menu */
        onTap($('btn-play'), function () {
            SND.start();
            SND.play('launch');
            refreshMap();
            setScreen('map');
        }, { silent: true });

        onTap($('btn-howto'), function () { showModal('modal-howto'); });
        onTap($('btn-settings'), function () { showModal('modal-settings'); });
        onTap($('hud-settings'), function () { showModal('modal-settings'); });

        /* back navigation */
        onTap($('hud-back'), function () { goBack(); });
        onTap($('btn-map-menu'), function () { setScreen('menu'); });
        onTap($('btn-riddle-back'), function () { refreshMap(); setScreen('map'); });
        onTap($('btn-codex-back'), function () { leaveCodex(); });
        onTap($('btn-complete-menu'), function () { setScreen('menu'); });

        /* riddle */
        onTap(el.hintBtn, function () { useHint(); }, { silent: true });

        /* codex tabs */
        $$('.tab', el.codexTabs).forEach(function (tab) {
            onTap(tab, function () { selectTab(tab.dataset.tab); });
        });

        /* complete */
        onTap($('btn-learn-more'), function () { showModal('modal-learn'); });
        onTap($('btn-play-again'), function () {
            resetProgress();
            refreshMap();
            setScreen('map');
            toast('The ascent begins again. Star Shards reset to ' + CFG.START_SHARDS + '.', null, 'rocket.png');
        });

        /* modal close buttons + backdrop dismissal */
        $$('[data-close]').forEach(function (btn) {
            onTap(btn, function () { hideModal(btn.dataset.close); });
        });
        $$('.overlay').forEach(function (ov) {
            ov.addEventListener('pointerdown', function (e) {
                if (e.target === ov) { hideModal(ov.id); }
            });
        });

        /* settings toggles */
        onTap(el.toggleMusic, function () {
            prefs.music = !prefs.music;
            savePrefs();
            applyPrefs();
            if (prefs.music) { SND.start(); }
        });
        onTap(el.toggleSfx, function () {
            prefs.sfx = !prefs.sfx;
            savePrefs();
            applyPrefs();
            if (prefs.sfx) { SND.play('click'); }
        });
        onTap(el.toggleMotion, function () {
            prefs.motion = !prefs.motion;
            savePrefs();
            applyPrefs();
        });
        onTap($('btn-reset'), function () {
            resetProgress();
            refreshMap();
            applyPrefs();
            setShards(state.shards);
            toast('Progress cleared. The ascent awaits.', null, 'rocket.png');
        });

        wireSimulations();
        wireKeyboard();

        /* re-fit the pixel-sized simulations when the viewport changes */
        var resizeTimer = null;
        global.addEventListener('resize', function () {
            if (resizeTimer) { clearTimeout(resizeTimer); }
            resizeTimer = setTimeout(function () {
                if (state.screen !== 'codex') { return; }
                if (state.current === 3) {
                    resetSimulation(3);
                } else if (state.current === 0) {
                    galRender();
                } else if (state.current === 1) {
                    /* reposition only - never reset a run in progress */
                    plungeRender();
                } else if (state.current === 2) {
                    liftRender();
                }
            }, 180);
        });

        /* mobile WebView hardening: no pinch-zoom, no rubber-band scroll,
           no double-tap zoom, no long-press selection */
        document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
        document.addEventListener('gesturechange', function (e) { e.preventDefault(); });
        document.addEventListener('gestureend', function (e) { e.preventDefault(); });
        document.addEventListener('dblclick', function (e) { e.preventDefault(); });
        document.addEventListener('contextmenu', function (e) { e.preventDefault(); });
        document.addEventListener('touchmove', function (e) {
            if (e.touches && e.touches.length > 1) { e.preventDefault(); }
        }, { passive: false });

        /* first gesture anywhere unlocks the audio context */
        var unlock = function () {
            SND.start();
            document.removeEventListener('pointerdown', unlock);
        };
        document.addEventListener('pointerdown', unlock);

        document.addEventListener('visibilitychange', function () {
            if (!document.hidden) { SND.resume(); }
        });
    }

    function goBack() {
        if (openModal) { hideModal(openModal); return; }
        if (state.screen === 'map') { setScreen('menu'); }
        else if (state.screen === 'riddle') { refreshMap(); setScreen('map'); }
        else if (state.screen === 'codex') { leaveCodex(); }
        else if (state.screen === 'complete') { setScreen('menu'); }
    }

    function wireKeyboard() {
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                e.preventDefault();
                goBack();
                return;
            }
            if (openModal) { return; }

            if (state.screen === 'riddle') {
                if (/^[1-9]$/.test(e.key)) {
                    var idx = parseInt(e.key, 10) - 1;
                    var list = $$('.option', el.options);
                    if (list[idx]) {
                        e.preventDefault();
                        chooseOption(list[idx]);
                    }
                } else if (e.key === 'h' || e.key === 'H') {
                    e.preventDefault();
                    useHint();
                }
            }
        });
    }

    /* --------------------------------------------------------------- boot */

    function runBoot() {
        var steps = D.BOOT_STEPS;
        var i = 0;
        var progress = 0;

        function setMeter(p) {
            progress = Math.max(progress, Math.min(1, p));
            el.bootMeter.style.width = (progress * 100) + '%';
        }

        var stepTimer = setInterval(function () {
            if (i < steps.length) {
                el.bootStatus.textContent = steps[i];
                setMeter((i + 1) / steps.length * 0.9);
                i++;
            }
        }, 340);

        /* probe optional art + optional music file in parallel */
        var assetsDone = A.load(function (p) { setMeter(0.15 + p * 0.6); });
        var audioDone = SND.init(prefs);

        Promise.all([assetsDone, audioDone]).then(function () {
            var wait = Math.max(0, 1500 - (Date.now() - bootStart));
            setTimeout(function () {
                clearInterval(stepTimer);
                el.bootStatus.textContent = steps[steps.length - 1];
                setMeter(1);
                setTimeout(function () {
                    setScreen('menu', { silent: true });
                }, 380);
            }, wait);
        }).catch(function () {
            clearInterval(stepTimer);
            setMeter(1);
            setScreen('menu', { silent: true });
        });
    }

    var bootStart = 0;

    function init() {
        cache();
        loadPrefs();
        loadSave();

        BG.init();
        FX.init();

        applyPrefs();
        setShards(state.shards);
        buildMap();
        buildLearnMore();
        wire();

        bootStart = Date.now();
        runBoot();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})(window);
