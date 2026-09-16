/* =========================================================================
   Element Hunt: Drag & Strike - game controller
   ========================================================================= */
(function () {
    'use strict';

    var GRID_SIZE = 15;
    var SAVE_KEY = 'elementHunt.save.v1';
    var TIME_BONUS_WINDOW = 25;   // seconds until the speed bonus is exhausted
    var LEVELS = window.ElementHuntData.levels;
    var CATEGORIES = window.ElementHuntData.categories;
    var REFERENCE = window.ElementHuntData.reference;

    /* ------------------------------------------------------------- helpers */
    function $(id) { return document.getElementById(id); }
    function q(sel, root) { return (root || document).querySelector(sel); }
    function qa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

    function hexToRgba(hex, a) {
        var h = String(hex).replace('#', '');
        if (h.length === 3) { h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; }
        var n = parseInt(h, 16);
        if (isNaN(n)) { return 'rgba(0,229,255,' + a + ')'; }
        return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
    }

    function catInfo(key) {
        return CATEGORIES[key] || { label: 'Element', color: '#00e5ff' };
    }

    /* --------------------------------------------------------------- state */
    /* Fisher-Yates: the specimen order is reshuffled on every play. */
    function shuffled(n) {
        var a = [];
        for (var i = 0; i < n; i++) { a.push(i); }
        for (var j = a.length - 1; j > 0; j--) {
            var k = Math.floor(Math.random() * (j + 1));
            var t = a[j]; a[j] = a[k]; a[k] = t;
        }
        return a;
    }

    var state = {
        screen: 'boot',
        level: 0,
        index: 0,
        order: [],
        score: 0,
        levelStartScore: 0,
        attempts: 0,
        elementAttempts: 0,
        hintsUsed: 0,
        levelHints: 0,
        hintUsedForCurrent: false,
        startTime: 0,
        grid: [],
        placed: [],
        found: [],
        running: false,
        busy: false
    };

    var save = {
        stars: {},
        unlocked: 1,
        best: 0,
        music: true,
        sfx: true
    };

    /* ---------------------------------------------------------- persistence */
    function loadSave() {
        try {
            var raw = window.localStorage.getItem(SAVE_KEY);
            if (!raw) { return; }
            var data = JSON.parse(raw);
            if (data && typeof data === 'object') {
                save.stars = (data.stars && typeof data.stars === 'object') ? data.stars : {};
                save.unlocked = Math.min(LEVELS.length, Math.max(1, data.unlocked | 0 || 1));
                save.best = Math.max(0, data.best | 0);
                save.music = data.music !== false;
                save.sfx = data.sfx !== false;
            }
        } catch (e) { /* storage blocked or corrupt - carry on with defaults */ }
    }

    function writeSave() {
        try {
            window.localStorage.setItem(SAVE_KEY, JSON.stringify(save));
        } catch (e) { /* private mode: progress simply will not persist */ }
    }

    function totalStars() {
        var t = 0;
        Object.keys(save.stars).forEach(function (k) { t += save.stars[k] | 0; });
        return t;
    }

    /* ------------------------------------------------------------- screens */
    function showScreen(name) {
        qa('.screen').forEach(function (el) {
            el.classList.toggle('is-active', el.dataset.screen === name);
        });
        state.screen = name;
        state.running = (name === 'game');
        var active = q('.screen.is-active');
        if (active) { active.scrollTop = 0; }
    }

    /* -------------------------------------------------------------- toasts */
    var toastTimer = null;
    function toast(msg) {
        var el = $('toast');
        el.textContent = msg;
        el.classList.add('is-visible');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { el.classList.remove('is-visible'); }, 2200);
    }

    function floatScore(amount, x, y) {
        var el = document.createElement('div');
        el.className = 'float-score' + (amount < 0 ? ' is-negative' : '');
        el.textContent = (amount > 0 ? '+' : '') + amount;
        el.style.left = x + 'px';
        el.style.top = y + 'px';
        document.body.appendChild(el);
        setTimeout(function () { el.remove(); }, 1100);
    }

    function bump(el) {
        if (!el) { return; }
        el.classList.remove('is-bumped');
        // reflow so the animation can restart on rapid updates
        void el.offsetWidth;
        el.classList.add('is-bumped');
    }

    /* ==================================================================
       Grid generation
       ================================================================== */
    var ORIENTATIONS = [
        { dr: 0, dc: 1 },    // across
        { dr: 1, dc: 0 },    // down
        { dr: 1, dc: 1 },    // diagonal down-right
        { dr: 1, dc: -1 }    // diagonal down-left
    ];

    /* Filler letters must never spell an answer on their own. A one-letter symbol
     * like O or K is a complete answer in a single cell, so if the random filler
     * could produce it there would be a handful of equally-correct cells and no
     * real hunt. Those letters are therefore removed from the filler alphabet -
     * in that exact case only, since matching is case-sensitive (banning "O"
     * still leaves "o" available). Multi-letter symbols need no such treatment:
     * their letters only count in the right sequence. */
    var fillerPool = null;

    function buildFillerPool(elements) {
        var banned = Object.create(null);
        elements.forEach(function (el) {
            if (el.symbol.length === 1) { banned[el.symbol] = true; }
        });
        var pool = [];
        for (var i = 0; i < 26; i++) {
            var upper = String.fromCharCode(65 + i);
            var lower = upper.toLowerCase();
            if (!banned[upper]) { pool.push(upper); }
            if (!banned[lower]) { pool.push(lower); }
        }
        fillerPool = pool;
    }

    function randomFiller() {
        if (fillerPool && fillerPool.length) {
            return fillerPool[Math.floor(Math.random() * fillerPool.length)];
        }
        var ch = String.fromCharCode(65 + Math.floor(Math.random() * 26));
        return Math.random() < 0.5 ? ch : ch.toLowerCase();
    }

    /* Two answers must never touch, so no letter is ever shared between symbols
     * and two symbols can never read as one connected run. `spaced` requires a
     * clear one-cell gap (including diagonals) around every placed symbol. */
    function tryBuildGrid(elements, spaced) {
        var grid = [];
        var taken = [];
        for (var r = 0; r < GRID_SIZE; r++) {
            grid.push(new Array(GRID_SIZE).fill(null));
            taken.push(new Array(GRID_SIZE).fill(false));
        }
        var placed = [];

        function blocked(row, col) {
            if (grid[row][col] !== null) { return true; }
            if (!spaced) { return false; }
            // `taken` only ever holds cells of ALREADY placed symbols, so this
            // never rejects a word for being adjacent to its own letters.
            for (var dr = -1; dr <= 1; dr++) {
                for (var dc = -1; dc <= 1; dc++) {
                    var nr = row + dr, nc = col + dc;
                    if (nr < 0 || nr >= GRID_SIZE || nc < 0 || nc >= GRID_SIZE) { continue; }
                    if (taken[nr][nc]) { return true; }
                }
            }
            return false;
        }

        for (var i = 0; i < elements.length; i++) {
            // Real chemical casing: capital first letter, lowercase after (Na, Cl).
            var word = elements[i].symbol;
            var len = word.length;
            var ok = false;

            // Bounded search: never spin forever if the board gets crowded.
            for (var attempt = 0; attempt < 600 && !ok; attempt++) {
                var o = ORIENTATIONS[Math.floor(Math.random() * ORIENTATIONS.length)];
                var sr = Math.floor(Math.random() * GRID_SIZE);
                var sc = Math.floor(Math.random() * GRID_SIZE);
                var er = sr + (len - 1) * o.dr;
                var ec = sc + (len - 1) * o.dc;
                if (er < 0 || er >= GRID_SIZE || ec < 0 || ec >= GRID_SIZE) { continue; }

                var free = true;
                for (var k = 0; k < len; k++) {
                    if (blocked(sr + k * o.dr, sc + k * o.dc)) { free = false; break; }
                }
                if (!free) { continue; }

                var info = { symbol: word, cells: [] };
                for (var m = 0; m < len; m++) {
                    var rr = sr + m * o.dr, cc = sc + m * o.dc;
                    grid[rr][cc] = word[m];
                    taken[rr][cc] = true;
                    info.cells.push({ row: rr, col: cc });
                }
                placed.push(info);
                ok = true;
            }
            if (!ok) { return null; }
        }

        // Filler letters are randomly upper- or lowercase. Symbols are written in
        // proper chemical casing, so an all-uppercase filler would make every
        // two-letter symbol obvious - the lowercase letter would be the only one
        // on the board. Mixing the filler casing removes that tell.
        for (var fr = 0; fr < GRID_SIZE; fr++) {
            for (var fc = 0; fc < GRID_SIZE; fc++) {
                if (grid[fr][fc] === null) {
                    grid[fr][fc] = randomFiller();
                }
            }
        }
        return { grid: grid, placed: placed };
    }

    function generateGrid() {
        var elements = LEVELS[state.level].elements;
        buildFillerPool(elements);
        var built = null;
        // Preferred: every symbol separated by a clear gap. If a board ever proves
        // too crowded to lay out that way, fall back to non-overlapping only, and
        // finally to a guaranteed layout - the game must always be playable.
        for (var i = 0; i < 30 && !built; i++) {
            built = tryBuildGrid(elements, true);
        }
        for (var j = 0; j < 15 && !built; j++) {
            built = tryBuildGrid(elements, false);
        }
        if (!built) {
            // Should never happen with 15x15 and 1-2 letter symbols, but stay playable.
            built = { grid: [], placed: [] };
            for (var r = 0; r < GRID_SIZE; r++) {
                var row = [];
                for (var c = 0; c < GRID_SIZE; c++) {
                    row.push(randomFiller());
                }
                built.grid.push(row);
            }
            elements.forEach(function (el, i2) {
                var word = el.symbol;
                var cells = [];
                for (var k = 0; k < word.length; k++) {
                    built.grid[i2][k] = word[k];
                    cells.push({ row: i2, col: k });
                }
                built.placed.push({ symbol: word, cells: cells });
            });
        }
        state.grid = built.grid;
        state.placed = built.placed;
    }

    var gridEl, wellEl, lineLayer;

    function renderGrid() {
        var frag = document.createDocumentFragment();
        gridEl.innerHTML = '';
        lineLayer.innerHTML = '';
        for (var r = 0; r < GRID_SIZE; r++) {
            for (var c = 0; c < GRID_SIZE; c++) {
                var cell = document.createElement('div');
                cell.className = 'grid-cell';
                cell.dataset.row = r;
                cell.dataset.col = c;
                // The letter lives in its own span so the lit selection/found
                // layers can sit behind it instead of covering it.
                var letter = document.createElement('span');
                letter.className = 'cell-letter';
                letter.textContent = state.grid[r][c];
                cell.appendChild(letter);
                frag.appendChild(cell);
            }
        }
        gridEl.appendChild(frag);
    }

    /* ==================================================================
       Board intro: the letters gather in the middle, zoom, scramble, then
       fly out to their places. Purely cosmetic - input stays locked until
       the board settles, and the speed bonus only starts after that.
       ================================================================== */
    var introToken = 0;
    var introAnims = [];

    /* Hard-reset the board to its CSS state. The intro is a Web Animation, and a
     * WebView that is not producing frames stalls the document timeline - the
     * animation would then hold its first keyframe (every letter collapsed in the
     * centre) while the timers that end the intro still fire, leaving a board
     * whose cells overlap and swallow each other's taps. Cancelling on a timer
     * guarantees the letters are home even if the animation never ran. */
    function stopIntroAnims() {
        for (var i = 0; i < introAnims.length; i++) {
            try { introAnims[i].cancel(); } catch (e) { /* already gone */ }
        }
        introAnims = [];
    }

    function setLetters(randomise) {
        for (var i = 0; i < gridEl.children.length; i++) {
            var cell = gridEl.children[i];
            var span = cell.firstChild;
            if (!span) { continue; }
            span.textContent = randomise
                ? randomFiller()
                : state.grid[+cell.dataset.row][+cell.dataset.col];
        }
    }

    function playIntro() {
        var token = ++introToken;
        var mq = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
        var count = gridEl.children.length;

        if (!count || (mq && mq.matches) || !gridEl.children[0].animate) {
            state.busy = false;
            resetTimer();
            return;
        }

        state.busy = true;
        wellEl.classList.add('is-intro');
        stopIntroAnims();

        var size = wellEl.clientWidth / GRID_SIZE || 24;
        var mid = (GRID_SIZE - 1) / 2;
        var DUR = 1750;
        var jitter = function () { return (Math.random() - 0.5) * size * 2.4; };
        var spin = function () { return (Math.random() - 0.5) * 110; };

        // Whole board breathes in and out behind the letters.
        introAnims.push(gridEl.animate([
            { transform: 'scale(.84)' },
            { transform: 'scale(1.07)', offset: .28 },
            { transform: 'scale(.95)', offset: .58 },
            { transform: 'scale(1)' }
        ], { duration: DUR, easing: 'cubic-bezier(.3,.9,.3,1)', fill: 'backwards' }));

        for (var i = 0; i < count; i++) {
            var cell = gridEl.children[i];
            var dx = (mid - (+cell.dataset.col)) * size;
            var dy = (mid - (+cell.dataset.row)) * size;
            var home = 'translate(0px, 0px) scale(1) rotate(0deg)';
            var centred = function (s, r) {
                return 'translate(' + dx + 'px, ' + dy + 'px) scale(' + s + ') rotate(' + r + 'deg)';
            };
            var shuffle = function (s) {
                return 'translate(' + (dx + jitter()) + 'px, ' + (dy + jitter()) + 'px) scale(' + s +
                       ') rotate(' + spin() + 'deg)';
            };

            // fill:'backwards' holds the first frame through the stagger delay but
            // releases the transform afterwards, so the CSS hover/selected states
            // are not locked out once the intro is over.
            introAnims.push(cell.animate([
                { transform: centred(0.12, spin()), opacity: 0, offset: 0 },
                { transform: centred(1.35, 0), opacity: 1, offset: .22 },
                { transform: shuffle(0.6), opacity: 1, offset: .42 },
                { transform: shuffle(1.18), opacity: 1, offset: .60 },
                { transform: home, opacity: 1, offset: 1 }
            ], {
                duration: DUR,
                delay: Math.random() * 130,
                easing: 'cubic-bezier(.28,.86,.3,1)',
                fill: 'backwards'
            }));
        }

        // Letters cycle while they are bunched up, then settle to the real board.
        [200, 340, 480, 620, 760].forEach(function (t) {
            setTimeout(function () {
                if (token === introToken) { setLetters(true); }
            }, t);
        });
        setTimeout(function () {
            if (token === introToken) { setLetters(false); }
        }, 900);

        setTimeout(function () {
            if (token !== introToken) { return; }
            // Cancel rather than trust the animation to have landed: timers fire
            // even when the compositor is idle, the animation may not have.
            stopIntroAnims();
            setLetters(false);
            wellEl.classList.remove('is-intro');
            state.busy = false;
            resetTimer();
        }, DUR + 200);
    }

    function cellAt(row, col) {
        var index = row * GRID_SIZE + col;
        return gridEl.children[index] || null;
    }

    /* ==================================================================
       Strike-through lines (SVG, scales with the board on resize)
       ================================================================== */
    function drawStrike(cells) {
        var a = cells[0];
        var b = cells[cells.length - 1];
        var x1 = a.col + 0.5, y1 = a.row + 0.5;
        var x2 = b.col + 0.5, y2 = b.row + 0.5;

        // Extend a touch past the letters so the strike reads like a highlighter.
        var dx = x2 - x1, dy = y2 - y1;
        var len = Math.sqrt(dx * dx + dy * dy) || 1;
        var ext = 0.28;
        x1 -= (dx / len) * ext; y1 -= (dy / len) * ext;
        x2 += (dx / len) * ext; y2 += (dy / len) * ext;

        var ns = 'http://www.w3.org/2000/svg';
        ['strike-glow', 'strike-core'].forEach(function (cls) {
            var line = document.createElementNS(ns, 'line');
            line.setAttribute('x1', x1);
            line.setAttribute('y1', y1);
            line.setAttribute('x2', x2);
            line.setAttribute('y2', y2);
            line.setAttribute('class', cls + ' strike-draw');
            lineLayer.appendChild(line);
        });
    }

    function cellCenter(row, col) {
        var el = cellAt(row, col);
        if (!el) { return null; }
        var r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }

    /* ==================================================================
       HUD / UI
       ================================================================== */
    var els = {};

    function elementAt(position) {
        var list = LEVELS[state.level].elements;
        var i = state.order.length ? state.order[position] : position;
        return list[i];
    }

    function currentElement() {
        return elementAt(state.index);
    }

    function updateHud() {
        els.score.textContent = state.score;
        els.level.textContent = state.level + 1;
        els.attempts.textContent = state.attempts;
    }

    function renderTray() {
        var list = LEVELS[state.level].elements;
        var html = '';
        // Slots follow the play order, so the tray fills left to right.
        for (var i = 0; i < list.length; i++) {
            var el = elementAt(i);
            var filled = state.found.indexOf(i) !== -1;
            var cls = 'tray-slot' + (filled ? ' is-filled' : '') + (i === state.index && !filled ? ' is-current' : '');
            html += '<div class="' + cls + '" title="' + (filled ? el.name : 'Specimen ' + (i + 1)) + '">' +
                    (filled ? el.symbol : (i + 1)) + '</div>';
        }
        els.tray.innerHTML = html;
    }

    function updateClue() {
        var el = currentElement();
        var list = LEVELS[state.level].elements;
        els.progress.textContent = (state.index + 1) + '/' + list.length;
        els.clue.textContent = el.clue;
        els.period.textContent = el.period;
        els.group.textContent = el.group + (el.groupNote ? '*' : '');
        els.hintBtn.disabled = false;
        state.hintUsedForCurrent = false;
        renderTray();
    }

    function updateTimeBar() {
        if (!state.running || state.busy || !state.startTime) { return; }
        var elapsed = (Date.now() - state.startTime) / 1000;
        var left = Math.max(0, 1 - elapsed / TIME_BONUS_WINDOW);
        els.timeFill.style.width = (left * 100).toFixed(1) + '%';
        els.timeFill.classList.toggle('is-low', left < 0.35);
        els.bonus.textContent = '+' + timeBonus();
    }

    function timeBonus() {
        var t = (Date.now() - state.startTime) / 1000;
        return Math.max(0, 5 - Math.floor(t / 5));
    }

    function resetTimer() {
        state.startTime = Date.now();
        els.timeFill.style.width = '100%';
        els.timeFill.classList.remove('is-low');
        els.bonus.textContent = '+5';
        clearRescue();
    }

    /* ------------------------------------------------------------- rescue pulse
     * If a specimen has resisted the player for RESCUE_AFTER seconds, the real
     * symbol starts beating on the board so they can strike it. It is a free
     * assist - no points are deducted - and it beats until the symbol is found.
     */
    var RESCUE_AFTER = 45;
    var rescueCells = [];

    function clearRescue() {
        for (var i = 0; i < rescueCells.length; i++) {
            rescueCells[i].classList.remove('is-beating');
        }
        rescueCells = [];
    }

    function maybeRescue() {
        if (!state.running || state.busy || !state.startTime) { return; }
        if (rescueCells.length || anyModalOpen()) { return; }
        if ((Date.now() - state.startTime) / 1000 < RESCUE_AFTER) { return; }

        var target = currentElement().symbol;
        var placed = null;
        for (var i = 0; i < state.placed.length; i++) {
            if (state.placed[i].symbol === target) { placed = state.placed[i]; break; }
        }
        if (!placed) { return; }

        placed.cells.forEach(function (p) {
            var cell = cellAt(p.row, p.col);
            if (cell) {
                cell.classList.add('is-beating');
                rescueCells.push(cell);
            }
        });
        if (rescueCells.length) {
            window.AudioEngine.play('hint');
            toast('Still hunting? ' + target + ' is beating on the board.');
        }
    }

    /* ==================================================================
       Level flow
       ================================================================== */
    function startLevel(levelIndex, freshRun) {
        state.level = Math.max(0, Math.min(LEVELS.length - 1, levelIndex | 0));
        state.index = 0;
        state.attempts = 0;
        state.elementAttempts = 0;
        state.levelHints = 0;
        state.found = [];
        state.busy = false;
        if (freshRun) {
            state.score = 0;
            state.hintsUsed = 0;
        }
        state.levelStartScore = state.score;
        // Fresh specimen order every single play.
        state.order = shuffled(LEVELS[state.level].elements.length);

        generateGrid();
        renderGrid();
        updateHud();
        updateClue();
        resetTimer();
        showScreen('game');
        playIntro();
        toast('Vault ' + (state.level + 1) + ': ' + LEVELS[state.level].name);
    }

    function finishLevel() {
        state.running = false;
        var list = LEVELS[state.level].elements;
        var levelScore = state.score - state.levelStartScore;
        var maxPoints = list.length * 15;
        var pct = maxPoints > 0 ? levelScore / maxPoints : 0;

        var stars = 0;
        if (pct > 0.8) { stars = 3; }
        else if (pct > 0.5) { stars = 2; }
        else if (pct > 0.2) { stars = 1; }

        var key = String(state.level);
        save.stars[key] = Math.max(save.stars[key] | 0, stars);
        save.best = Math.max(save.best, state.score);
        if (state.level + 1 < LEVELS.length) {
            save.unlocked = Math.max(save.unlocked, state.level + 2);
        }
        writeSave();

        showResults(stars);
    }

    /* ==================================================================
       Results screen
       ================================================================== */
    function showResults(stars) {
        var isFinal = state.level + 1 >= LEVELS.length;
        var list = LEVELS[state.level].elements;

        els.resultsTitle.textContent = isFinal ? 'Grand Alchemist!' : ('Vault ' + (state.level + 1) + ' Cleared');
        els.resultsSub.textContent = LEVELS[state.level].name;
        els.resultsSeal.src = 'assets/images/ui/emoji/' + (isFinal ? 'trophy' : 'check') + '.png';
        els.finalScore.textContent = state.score;
        els.bdFound.textContent = list.length;
        els.bdAttempts.textContent = state.attempts;
        els.bdHints.textContent = state.levelHints;

        els.finalReward.classList.toggle('is-hidden', !isFinal);
        els.nextLabel.textContent = isFinal ? 'Play Again' : 'Next Vault';
        els.nextBtn.dataset.mode = isFinal ? 'restart' : 'next';

        var starImgs = qa('.star', els.stars);
        starImgs.forEach(function (img) {
            img.src = 'assets/images/ui/emoji/star_off.png';
            img.classList.remove('is-earned');
        });

        showScreen('results');

        starImgs.forEach(function (img, i) {
            if (i >= stars) { return; }
            setTimeout(function () {
                img.src = 'assets/images/ui/emoji/star_on.png';
                img.classList.add('is-earned');
                window.AudioEngine.play('star', i);
                var r = img.getBoundingClientRect();
                window.FX.burst(r.left + r.width / 2, r.top + r.height / 2, {
                    count: 16, color: ['#ffd257', '#fff3c4', '#ffae2b'], speed: 200, size: 7
                });
            }, 380 + i * 340);
        });

        setTimeout(function () {
            window.AudioEngine.play('fanfare');
            window.FX.shower(isFinal
                ? ['#ffd257', '#00e5ff', '#17e380', '#b082ff', '#ffffff']
                : ['#00e5ff', '#17e380', '#7fe9ff']);
        }, 260);
    }

    /* ==================================================================
       Fun fact reveal
       ================================================================== */
    var pendingAdvance = false;

    function showFact(el, points, firstTry) {
        var info = catInfo(el.cat);
        var tile = els.factTile;
        tile.style.setProperty('--cat', info.color);
        tile.style.setProperty('--cat-a', hexToRgba(info.color, 0.6));

        $('fact-z').textContent = el.z;
        $('fact-symbol').textContent = el.symbol;
        $('fact-name-small').textContent = el.name;
        $('fact-name').textContent = el.name;
        $('fact-period').textContent = el.period;
        $('fact-group').textContent = el.group + (el.groupNote ? ' (' + el.groupNote + ')' : '');
        $('fact-text').textContent = el.fact;
        $('fact-points').textContent = '+' + points;
        $('fact-points-note').textContent = firstTry ? 'first-try bonus included' : 'speed bonus included';

        var chip = $('fact-cat');
        chip.textContent = info.label;
        chip.style.setProperty('--cat', info.color);

        var portrait = $('fact-portrait');
        portrait.classList.add('is-hidden');
        portrait.removeAttribute('src');
        window.ImageAssets.elementImage(el.symbol).then(function (url) {
            if (url && $('modal-fact').hidden === false) {
                portrait.src = url;
                portrait.classList.remove('is-hidden');
            }
        });

        var isLast = state.index + 1 >= LEVELS[state.level].elements.length;
        $('fact-next-label').textContent = isLast ? 'See Results' : 'Next Specimen';

        pendingAdvance = true;
        openModal('modal-fact');
    }

    function continueAfterFact() {
        if (!pendingAdvance) { return; }
        pendingAdvance = false;
        closeModal('modal-fact');

        state.index++;
        state.busy = false;
        if (state.index >= LEVELS[state.level].elements.length) {
            finishLevel();
            return;
        }
        state.elementAttempts = 0;
        updateClue();
        resetTimer();
    }

    /* ==================================================================
       Answer checking
       ================================================================== */
    function checkAnswer(cells) {
        // Matching is exact on BOTH case and direction: the symbol must be struck
        // as it is written and read on the periodic table. "He" is helium; "HE",
        // "hE", "he" and a backwards "eH" are all wrong.
        var target = currentElement().symbol;
        var forward = cells.map(function (c) {
            return state.grid[+c.dataset.row][+c.dataset.col];
        }).join('');
        var backward = forward.split('').reverse().join('');

        // A single tap can never spell a two-letter symbol - treat it as a
        // mis-tap rather than a scored attempt (important on touch screens).
        if (cells.length === 1 && target.length > 1) { return; }

        state.attempts++;
        state.elementAttempts++;
        updateHud();
        bump(els.attempts);

        var hit = (forward === target);
        if (!hit) {
            state.score -= 2;
            updateHud();
            wellEl.classList.add('is-shaking', 'flash-red');
            setTimeout(function () { wellEl.classList.remove('is-shaking', 'flash-red'); }, 520);
            window.AudioEngine.play('wrong');

            // Near misses get named instead of leaving the player guessing - the
            // reading direction and the capitals are both part of the lesson.
            var upper = target.toUpperCase();
            if (backward === target) {
                toast('Right symbol, wrong way round: drag ' + target + ' from ' +
                      target.charAt(0) + ' to ' + target.charAt(target.length - 1) + '.');
            } else if (forward.toUpperCase() === upper) {
                toast('Capitals matter: it is written ' + target + ', not ' + forward + '.');
            } else if (backward.toUpperCase() === upper) {
                toast('Read it forwards and mind the capitals: the symbol is ' + target + '.');
            }

            var mid = cells[Math.floor(cells.length / 2)];
            var p = cellCenter(+mid.dataset.row, +mid.dataset.col);
            if (p) {
                floatScore(-2, p.x, p.y);
                window.FX.burst(p.x, p.y, { count: 12, color: ['#ff546e', '#ff9aab'], speed: 170, size: 6 });
            }
            return;
        }

        /* ---- correct ---- */
        var coords = cells.map(function (c) { return { row: +c.dataset.row, col: +c.dataset.col }; });
        var el = currentElement();
        var firstTry = state.elementAttempts === 1;
        var base = firstTry ? 10 : 5;
        var bonus = timeBonus();
        var points = base + bonus;

        state.score += points;
        state.found.push(state.index);
        state.busy = true;
        clearRescue();
        updateHud();
        bump(els.score);

        coords.forEach(function (c) {
            var cell = cellAt(c.row, c.col);
            if (cell) { cell.classList.add('is-found'); }
        });
        drawStrike(coords);
        renderTray();

        wellEl.classList.remove('flash-red');
        wellEl.classList.add('flash-green');
        setTimeout(function () { wellEl.classList.remove('flash-green'); }, 560);
        window.AudioEngine.play('correct');

        var a = cellCenter(coords[0].row, coords[0].col);
        var b = cellCenter(coords[coords.length - 1].row, coords[coords.length - 1].col);
        if (a && b) {
            window.FX.trail(a.x, a.y, b.x, b.y, catInfo(el.cat).color);
            window.FX.ring((a.x + b.x) / 2, (a.y + b.y) / 2, { color: '#17e380', r1: 120, width: 7 });
            window.FX.burst((a.x + b.x) / 2, (a.y + b.y) / 2, {
                count: 26, color: ['#17e380', '#a9ffd8', '#ffffff', catInfo(el.cat).color], speed: 260, size: 8
            });
            floatScore(points, (a.x + b.x) / 2, (a.y + b.y) / 2 - 18);
        }

        setTimeout(function () { showFact(el, points, firstTry); }, 620);
    }

    /* ==================================================================
       Pointer drag selection (mouse, touch and pen share one code path)
       ================================================================== */
    var drag = { active: false, id: null, start: null, cells: [] };

    function clearSelection() {
        drag.cells.forEach(function (c) { c.classList.remove('is-selected'); });
        drag.cells = [];
    }

    function cellFromPoint(x, y) {
        var el = document.elementFromPoint(x, y);
        return el ? el.closest('.grid-cell') : null;
    }

    function cellsOnLine(start, end) {
        var sr = +start.dataset.row, sc = +start.dataset.col;
        var er = +end.dataset.row, ec = +end.dataset.col;
        var dr = Math.sign(er - sr), dc = Math.sign(ec - sc);
        var straight = (sr === er || sc === ec);
        var diagonal = Math.abs(er - sr) === Math.abs(ec - sc);
        if (!straight && !diagonal) { return [start]; }

        var out = [];
        var r = sr, c = sc;
        var guard = 0;
        while (guard++ <= GRID_SIZE) {
            var cell = cellAt(r, c);
            if (cell) { out.push(cell); }
            if (r === er && c === ec) { break; }
            r += dr;
            c += dc;
        }
        return out.length ? out : [start];
    }

    function canInteract() {
        return state.running && !state.busy && !anyModalOpen();
    }

    /* Abandon a drag without scoring it. */
    function cancelDrag() {
        clearSelection();
        drag.active = false;
        drag.id = null;
        drag.start = null;
    }

    function onPointerDown(e) {
        if (!canInteract()) { return; }
        if (e.pointerType === 'mouse' && e.button !== 0) { return; }
        // If a previous pointerup was lost - the WebView stealing the gesture, the
        // app being backgrounded mid-drag - never let that stale drag lock the
        // board. Drop it and start this one cleanly.
        if (drag.active) { cancelDrag(); }
        var cell = e.target.closest ? e.target.closest('.grid-cell') : null;
        if (!cell) { return; }
        e.preventDefault();
        drag.active = true;
        drag.id = e.pointerId;
        drag.start = cell;
        clearSelection();
        drag.cells = [cell];
        cell.classList.add('is-selected');
        window.AudioEngine.play('select', 1);
        try { gridEl.setPointerCapture(e.pointerId); } catch (err) { /* not critical */ }
    }

    function onPointerMove(e) {
        if (!drag.active || e.pointerId !== drag.id) { return; }
        e.preventDefault();
        var cell = cellFromPoint(e.clientX, e.clientY);
        if (!cell || cell === drag.cells[drag.cells.length - 1]) { return; }

        var next = cellsOnLine(drag.start, cell);
        if (next.length === drag.cells.length && next[next.length - 1] === drag.cells[drag.cells.length - 1]) { return; }

        clearSelection();
        drag.cells = next;
        drag.cells.forEach(function (c) { c.classList.add('is-selected'); });
        window.AudioEngine.play('select', drag.cells.length);
    }

    function onPointerUp(e) {
        if (!drag.active || (e && e.pointerId !== drag.id && e.type !== 'pointercancel')) { return; }
        var cells = drag.cells.slice();
        var cancelled = (e && e.type === 'pointercancel');
        cancelDrag();
        if (cancelled) { return; }
        if (cells.length && canInteract()) { checkAnswer(cells); }
    }

    /* ==================================================================
       Modals
       ================================================================== */
    function anyModalOpen() {
        return qa('.modal').some(function (m) { return !m.hidden; });
    }

    function openModal(id) {
        var m = $(id);
        if (!m) { return; }
        m.hidden = false;
    }

    function closeModal(id) {
        var m = $(id);
        if (!m) { return; }
        m.hidden = true;
    }

    /* ---- learn more content (results screen only) ---- */
    function buildLearnMore() {
        var terms = REFERENCE.map(function (r) {
            return '<div><dt>' + r.term + '</dt><dd>' + r.text + '</dd></div>';
        }).join('');
        $('learn-terms').innerHTML = terms;

        var list = LEVELS[state.level].elements;
        var seen = {};
        var legend = '';
        list.forEach(function (el) {
            if (seen[el.cat]) { return; }
            seen[el.cat] = true;
            var info = catInfo(el.cat);
            legend += '<span class="legend-chip"><span class="legend-dot" style="--dot:' + info.color +
                      '"></span>' + info.label + '</span>';
        });
        $('learn-legend').innerHTML = legend;

        var rows = list.map(function (el) {
            var info = catInfo(el.cat);
            return '<div class="learn-el">' +
                     '<span class="learn-el-tile" style="--cat:' + info.color + ';--cat-a:' +
                         hexToRgba(info.color, 0.6) + '">' + el.symbol + '</span>' +
                     '<div>' +
                       '<div class="learn-el-name">' + el.name + '</div>' +
                       '<div class="learn-el-meta">No. ' + el.z + ' &middot; Period ' + el.period +
                            ' &middot; Group ' + el.group + (el.groupNote ? ' (' + el.groupNote + ')' : '') +
                            ' &middot; ' + info.label + '</div>' +
                       '<div class="learn-el-fact">' + el.fact + '</div>' +
                     '</div>' +
                   '</div>';
        }).join('');
        $('learn-elements').innerHTML = rows;
    }

    /* ==================================================================
       Level select
       ================================================================== */
    function renderLevelList() {
        var html = '';
        LEVELS.forEach(function (lvl, i) {
            var locked = (i + 1) > save.unlocked;
            var stars = save.stars[String(i)] | 0;
            var starHtml = '';
            for (var s = 0; s < 3; s++) {
                starHtml += '<img src="assets/images/ui/emoji/star_' + (s < stars ? 'on' : 'off') + '.png" alt="">';
            }
            html += '<button type="button" class="level-card' + (locked ? ' is-locked' : '') +
                        '" data-level="' + i + '"' + (locked ? ' aria-disabled="true"' : '') + '>' +
                      '<span class="level-badge">' + (locked
                          ? '<img class="lock-img" src="assets/images/ui/emoji/lock.png" alt="Locked">'
                          : (i + 1)) + '</span>' +
                      '<span class="level-info">' +
                        '<span class="level-name">Vault ' + (i + 1) + ' &middot; ' + lvl.name + '</span>' +
                        '<span class="level-desc">' + lvl.subtitle + ' &middot; ' + lvl.elements.length + ' specimens</span>' +
                        '<span class="level-meta">' +
                          '<span class="level-stars">' + starHtml + '</span>' +
                          '<span class="level-best">' + (locked ? 'Clear the previous vault' : (stars ? stars + '/3 crystals' : 'Not yet cleared')) + '</span>' +
                        '</span>' +
                      '</span>' +
                      '<span class="level-go"><img class="icon" src="assets/images/ui/emoji/' +
                          (locked ? 'lock' : 'next') + '.png" alt=""></span>' +
                    '</button>';
        });
        $('level-list').innerHTML = html;
    }

    function refreshMenu() {
        $('menu-best').textContent = save.best;
        $('menu-stars').textContent = totalStars() + ' / ' + (LEVELS.length * 3);
    }

    /* ==================================================================
       Settings
       ================================================================== */
    function syncSettingsUi() {
        $('icon-music').src = 'assets/images/ui/emoji/music_' + (save.music ? 'on' : 'off') + '.png';
        $('label-music').textContent = save.music ? 'On' : 'Off';
        $('toggle-music').setAttribute('aria-pressed', save.music ? 'true' : 'false');

        $('icon-sfx').src = 'assets/images/ui/emoji/sfx_' + (save.sfx ? 'on' : 'off') + '.png';
        $('label-sfx').textContent = save.sfx ? 'On' : 'Off';
        $('toggle-sfx').setAttribute('aria-pressed', save.sfx ? 'true' : 'false');

        $('music-source').textContent = window.AudioEngine.usingMusicFile()
            ? 'Music: assets/audio/bgm.mp3'
            : 'Music: procedural synth (offline)';
    }

    /* ==================================================================
       Boot
       ================================================================== */
    var BOOT_STEPS = [
        'Warming the crucible…',
        'Calibrating the spectrometer…',
        'Charging neon filaments…',
        'Shuffling the letter lattice…',
        'Ready'
    ];

    function boot() {
        var fill = $('boot-fill');
        var status = $('boot-status');
        var step = 0;
        var pct = 0;

        var timer = setInterval(function () {
            pct = Math.min(100, pct + 22 + Math.random() * 16);
            fill.style.width = pct + '%';
            status.textContent = BOOT_STEPS[Math.min(step++, BOOT_STEPS.length - 1)];
            if (pct >= 100) { clearInterval(timer); }
        }, 260);

        var assetsDone = window.ImageAssets.preload();
        var minWait = new Promise(function (res) { setTimeout(res, 1500); });

        Promise.all([assetsDone, minWait]).then(function () {
            clearInterval(timer);
            fill.style.width = '100%';
            status.textContent = 'Ready';
            setTimeout(function () {
                refreshMenu();
                showScreen('menu');
            }, 320);
        });
    }

    /* ==================================================================
       Wiring
       ================================================================== */
    function firstGesture() {
        window.AudioEngine.setSfx(save.sfx);
        window.AudioEngine.setMusic(save.music);
        window.AudioEngine.unlock().then(syncSettingsUi);
    }

    function init() {
        gridEl = $('game-grid');
        wellEl = $('grid-well');
        lineLayer = $('line-layer');

        els = {
            score: $('score'),
            level: $('level-display'),
            attempts: $('attempts'),
            progress: $('element-progress'),
            clue: $('clue-hint'),
            period: $('clue-period'),
            group: $('clue-group'),
            hintBtn: $('hint-btn'),
            tray: $('found-tray'),
            timeFill: $('time-fill'),
            bonus: $('bonus-value'),
            resultsTitle: $('results-title'),
            resultsSub: $('results-sub'),
            resultsSeal: $('results-seal'),
            finalScore: $('final-score'),
            finalReward: $('final-reward'),
            bdFound: $('bd-found'),
            bdAttempts: $('bd-attempts'),
            bdHints: $('bd-hints'),
            stars: $('star-rating'),
            nextBtn: $('btn-next-level'),
            nextLabel: $('btn-next-label'),
            factTile: $('fact-tile')
        };

        loadSave();
        window.Ambience.init($('bg-canvas'));
        window.FX.init($('fx-canvas'));
        window.AudioEngine.setMusic(save.music);
        window.AudioEngine.setSfx(save.sfx);
        syncSettingsUi();

        /* --- audio unlock on the very first interaction --- */
        var once = function () {
            firstGesture();
            document.removeEventListener('pointerdown', once);
            document.removeEventListener('keydown', once);
        };
        document.addEventListener('pointerdown', once);
        document.addEventListener('keydown', once);

        /* --- click sound on every button --- */
        document.addEventListener('pointerdown', function (e) {
            var btn = e.target.closest ? e.target.closest('.btn, .toggle, .level-card, .modal-close') : null;
            if (btn && !btn.disabled) { window.AudioEngine.play('click'); }
        });

        /* --- menu --- */
        $('btn-play').addEventListener('click', function () {
            renderLevelList();
            showScreen('levels');
        });
        $('btn-howto').addEventListener('click', function () { openModal('modal-howto'); });
        $('btn-settings-menu').addEventListener('click', function () {
            syncSettingsUi();
            openModal('modal-settings');
        });

        /* --- level select --- */
        $('level-list').addEventListener('click', function (e) {
            var card = e.target.closest('.level-card');
            if (!card) { return; }
            if (card.classList.contains('is-locked')) {
                window.AudioEngine.play('wrong');
                toast('Clear the previous vault to unlock this one.');
                return;
            }
            startLevel(+card.dataset.level, true);
        });

        $('btn-reset-progress').addEventListener('click', function () {
            save.stars = {};
            save.unlocked = 1;
            save.best = 0;
            writeSave();
            renderLevelList();
            refreshMenu();
            toast('Progress reset.');
        });

        /* --- generic navigation --- */
        document.addEventListener('click', function (e) {
            var act = e.target.closest('[data-action]');
            if (!act) { return; }
            var action = act.dataset.action;
            if (action === 'menu') {
                state.running = false;
                refreshMenu();
                showScreen('menu');
                window.AudioEngine.play('back');
            } else if (action === 'settings') {
                syncSettingsUi();
                openModal('modal-settings');
            }
        });

        /* --- modal closing --- */
        qa('.modal').forEach(function (modal) {
            modal.addEventListener('click', function (e) {
                if (e.target.closest('[data-close]')) { closeModal(modal.id); }
            });
        });
        document.addEventListener('keydown', function (e) {
            if (e.key !== 'Escape') { return; }
            qa('.modal').forEach(function (m) {
                if (!m.hidden && m.id !== 'modal-fact') { closeModal(m.id); }
            });
        });

        /* --- hint --- */
        els.hintBtn.addEventListener('click', function () {
            if (!canInteract() || state.hintUsedForCurrent) { return; }
            var el = currentElement();
            var symbol = el.symbol;
            state.score -= 5;
            state.hintsUsed++;
            state.levelHints++;
            state.hintUsedForCurrent = true;
            updateHud();

            var reveal = symbol.length > 1
                ? symbol[0] + '_'.repeat(symbol.length - 1)
                : symbol;
            els.clue.innerHTML = el.clue + '<br><span class="hint-reveal">Symbol: ' + reveal +
                                 ' (' + symbol.length + ' letter' + (symbol.length > 1 ? 's' : '') + ')</span>';
            els.hintBtn.disabled = true;
            window.AudioEngine.play('hint');

            var r = els.hintBtn.getBoundingClientRect();
            floatScore(-5, r.left + r.width / 2, r.top);
            window.FX.burst(r.left + r.width / 2, r.top + r.height / 2, {
                count: 14, color: ['#ffd257', '#fff3c4'], speed: 150, size: 6
            });
        });

        /* --- grid drag --- */
        gridEl.addEventListener('pointerdown', onPointerDown);
        gridEl.addEventListener('pointermove', onPointerMove);
        gridEl.addEventListener('pointerup', onPointerUp);
        gridEl.addEventListener('pointercancel', onPointerUp);
        window.addEventListener('pointerup', onPointerUp);
        gridEl.addEventListener('contextmenu', function (e) { e.preventDefault(); });
        gridEl.addEventListener('dragstart', function (e) { e.preventDefault(); });

        /* --- fun fact --- */
        $('btn-fact-next').addEventListener('click', continueAfterFact);

        /* --- results --- */
        els.nextBtn.addEventListener('click', function () {
            if (els.nextBtn.dataset.mode === 'restart') {
                startLevel(0, true);
            } else {
                startLevel(state.level + 1, false);
            }
        });
        $('btn-replay').addEventListener('click', function () { startLevel(state.level, true); });
        $('btn-learn').addEventListener('click', function () {
            buildLearnMore();
            openModal('modal-learn');
        });

        /* --- settings toggles --- */
        $('toggle-music').addEventListener('click', function () {
            save.music = !save.music;
            writeSave();
            window.AudioEngine.setMusic(save.music);
            window.AudioEngine.play('toggle');
            syncSettingsUi();
        });
        $('toggle-sfx').addEventListener('click', function () {
            save.sfx = !save.sfx;
            writeSave();
            window.AudioEngine.setSfx(save.sfx);
            if (save.sfx) { window.AudioEngine.play('toggle'); }
            syncSettingsUi();
        });

        /* --- timers & lifecycle --- */
        setInterval(function () {
            updateTimeBar();
            maybeRescue();
        }, 250);

        document.addEventListener('visibilitychange', function () {
            if (document.hidden) {
                cancelDrag();
                window.AudioEngine.suspendAll();
            } else if (save.music || save.sfx) {
                window.AudioEngine.resumeAll();
            }
        });
        window.addEventListener('blur', cancelDrag);

        /* --- kill browser gestures that fight a game canvas --- */
        document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
        document.addEventListener('dblclick', function (e) { e.preventDefault(); });
        document.addEventListener('touchmove', function (e) {
            if (e.touches && e.touches.length > 1) { e.preventDefault(); }
        }, { passive: false });
        document.addEventListener('contextmenu', function (e) {
            if (e.target.closest('.grid-cell, .btn, .level-card')) { e.preventDefault(); }
        });

        boot();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
