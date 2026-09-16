/* ===========================================================
   Arthropoda HOTS Challenge -- game logic
   Field-journal themed rebuild of the original quiz game.
   Core rules kept identical: 8 questions, 30s each, fly into
   the correct answer tag to advance, wrong/timeout -> retry.
   =========================================================== */
(function () {
"use strict";

/* ---------------- Quiz data (unchanged from original, plus an illustrative photo per entry) ---------------- */
const questions = [
    { q: "Jointed appendages, open circulation and chitinous covering indicate?",
      o: ["Arthropoda", "Annelida", "Mollusca"], a: "Arthropoda",
      img: "assets/images/specimens/shrimp_exoskeleton.jpg" },
    { q: "Why must arthropods molt their exoskeleton?",
      o: ["Growth", "Respiration", "Reproduction"], a: "Growth",
      img: "assets/images/specimens/shrimp_exoskeleton.jpg" },
    { q: "Which respiration suits terrestrial insects best?",
      o: ["Tracheal system", "Gills", "Book gills"], a: "Tracheal system",
      img: "assets/images/specimens/tracheal_system.jpg" },
    { q: "Which trait excludes an animal from Arthropoda?",
      o: ["Jointed legs", "Closed circulation", "Segmentation"], a: "Closed circulation",
      img: "assets/images/specimens/earthworm_annelida.jpg" },
    { q: "Vector causing malaria belongs to?",
      o: ["Anopheles", "Locusta", "Limulus"], a: "Anopheles",
      img: "assets/images/specimens/anopheles_mosquito.png" },
    { q: "Balancing organs in arthropods are called?",
      o: ["Statocysts", "Flame cells", "Nephridia"], a: "Statocysts",
      img: "assets/images/specimens/crab_statocyst.jpg" },
    { q: "Correct economic insect pair:",
      o: ["Apis - Honey", "Locusta - Silk", "Aedes - Lac"], a: "Apis - Honey",
      img: "assets/images/specimens/apis_indica_bee.jpg" },
    { q: "Which feature allows specialization of organs?",
      o: ["Segmentation", "Radial symmetry", "Diploblastic body"], a: "Segmentation",
      img: "assets/images/specimens/earthworm_annelida.jpg" }
];

/* ---------------- Reference gallery (Learn More -- separate from quiz) ---------------- */
const specimens = [
    { img: "assets/images/specimens/shrimp_exoskeleton.jpg", title: "Chitinous Exoskeleton",
      text: "Arthropods are defined by a hard chitinous exoskeleton, jointed appendages, and an open circulatory system. Because the exoskeleton cannot grow, arthropods must molt (ecdysis) periodically to increase in size." },
    { img: "assets/images/specimens/tracheal_system.jpg", title: "Tracheal Respiration",
      text: "Insects breathe through a tracheal system: a network of branching air tubes that deliver oxygen directly to tissues, an adaptation well suited to life on land." },
    { img: "assets/images/specimens/crab_statocyst.jpg", title: "Statocysts",
      text: "Statocysts are fluid-filled balance organs found in many arthropods, such as crabs, helping the animal sense orientation and gravity." },
    { img: "assets/images/specimens/anopheles_mosquito.png", title: "Malaria Vector",
      text: "The Anopheles mosquito is the vector responsible for transmitting the malaria parasite (Plasmodium) to humans." },
    { img: "assets/images/specimens/apis_indica_bee.jpg", title: "Apis indica",
      text: "Apis indica, the Indian honey bee, is economically important for honey production and the pollination of crops." },
    { img: "assets/images/specimens/earthworm_annelida.jpg", title: "Annelida (comparison)",
      text: "Earthworms belong to Phylum Annelida, not Arthropoda. They have a closed circulatory system and a soft, segmented body without jointed appendages -- a useful contrast case." },
    { img: "assets/images/specimens/snail_mollusca.jpg", title: "Mollusca (comparison)",
      text: "Snails belong to Phylum Mollusca. Unlike arthropods, molluscs have a soft, unsegmented body often protected by a calcareous shell rather than a chitinous exoskeleton." }
];

// Fisher-Yates shuffle -- used to randomize answer-tag order on every load/retry.
function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

/* ---------------- Persistent state ---------------- */
const STORAGE_KEY = "arthropodaHOTS.v1";
function loadState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) throw new Error("none");
        const parsed = JSON.parse(raw);
        return Object.assign({ bestScore: 0, musicOn: true, sfxOn: true, checkpoint: null }, parsed);
    } catch (e) {
        return { bestScore: 0, musicOn: true, sfxOn: true, checkpoint: null };
    }
}
function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* storage unavailable */ }
}
const state = loadState();

/* ---------------- DOM refs ---------------- */
const $ = (id) => document.getElementById(id);
const screenMenu = $("screen-menu");
const screenGame = $("screen-game");
const screenEnd = $("screen-end");

const btnBegin = $("btnBegin");
const btnContinue = $("btnContinue");
const btnHowTo = $("btnHowTo");
const btnSettingsMenu = $("btnSettingsMenu");
const btnSettingsGame = $("btnSettingsGame");
const bestScoreLine = $("bestScoreLine");

const modalHowTo = $("modal-howto");
const modalSettings = $("modal-settings");
const modalLearnMore = $("modal-learnmore");

const toggleMusicBtn = $("toggleMusic");
const toggleSfxBtn = $("toggleSfx");
const btnResetProgress = $("btnResetProgress");
const resetConfirmMsg = $("resetConfirmMsg");

const scoreValue = $("scoreValue");
const timerValue = $("timerValue");
const sandFill = $("sandFill");
const questionText = $("questionText");
const questionIllustration = $("questionIllustration");
const questionIllustrationFrame = document.querySelector(".question-illustration-frame");
questionIllustration.addEventListener("error", () => { questionIllustrationFrame.hidden = true; });
questionIllustration.addEventListener("load", () => { questionIllustrationFrame.hidden = false; });
const flightZone = $("flightZone");
const tagsRow = $("tagsRow");
const tagEls = Array.from(document.querySelectorAll(".specimen-tag"));
const player = $("player");
const playerImg = $("playerImg");
const playerFallback = $("playerFallback");
const feedbackBanner = $("feedbackBanner");
const retryBtn = $("retryBtn");
const gameBackdropImg = $("gameBackdropImg");

const btnPlayAgain = $("btnPlayAgain");
const btnLearnMore = $("btnLearnMore");
const btnMainMenu = $("btnMainMenu");
const finalScoreText = $("finalScoreText");
const specimenGallery = $("specimenGallery");

/* ---------------- Screen switching ---------------- */
function showScreen(el) {
    [screenMenu, screenGame, screenEnd].forEach((s) => { s.hidden = (s !== el); });
}
function openModal(el) { el.hidden = false; }
function closeModal(el) { el.hidden = true; }

document.querySelectorAll("[data-close]").forEach((btn) => {
    btn.addEventListener("click", () => closeModal($(btn.getAttribute("data-close"))));
});
document.querySelectorAll(".modal-overlay").forEach((overlay) => {
    overlay.addEventListener("click", (e) => { if (e.target === overlay) closeModal(overlay); });
});

btnHowTo.addEventListener("click", () => openModal(modalHowTo));
btnSettingsMenu.addEventListener("click", () => openModal(modalSettings));
btnSettingsGame.addEventListener("click", () => openModal(modalSettings));

/* ---------------- Image fallback wiring (graceful drop-in art) ---------------- */
function wireOptionalImage(imgEl, onAvailable) {
    const src = imgEl.getAttribute("src");
    const probe = new Image();
    probe.onload = () => {
        imgEl.hidden = false;
        if (typeof onAvailable === "function") onAvailable();
    };
    probe.onerror = () => { imgEl.hidden = true; };
    probe.src = src;
}
wireOptionalImage(playerImg, () => { playerFallback.style.display = "none"; player.classList.add("has-photo"); });
wireOptionalImage(gameBackdropImg);

/* ---------------- Audio: procedural ambient pad + SFX + optional bgm.mp3 ---------------- */
let audioCtx = null;
let musicMasterGain = null;
let musicNodes = [];
let musicRunning = false;
let bgmFileEl = null;
let bgmFileUsable = false;

function ensureAudioContext() {
    if (audioCtx) return audioCtx;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
    musicMasterGain = audioCtx.createGain();
    musicMasterGain.gain.value = state.musicOn ? 0.35 : 0;
    musicMasterGain.connect(audioCtx.destination);
    return audioCtx;
}

// Optional drop-in music file: assets/audio/bgm.mp3 overrides the procedural pad if present.
(function probeBgmFile() {
    bgmFileEl = new Audio("assets/audio/bgm.mp3");
    bgmFileEl.loop = true;
    bgmFileEl.volume = 0.5;
    bgmFileEl.preload = "auto";
    bgmFileEl.addEventListener("canplaythrough", () => { bgmFileUsable = true; }, { once: true });
    bgmFileEl.addEventListener("error", () => { bgmFileUsable = false; }, { once: true });
    bgmFileEl.load();
})();

function startProceduralPad() {
    if (musicRunning || !audioCtx) return;
    const chord = [130.81, 164.81, 196.00, 261.63]; // C3 E3 G3 C4 -- calm major pad
    const filter = audioCtx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 900;
    filter.connect(musicMasterGain);

    const lfo = audioCtx.createOscillator();
    const lfoGain = audioCtx.createGain();
    lfo.frequency.value = 0.06;
    lfoGain.gain.value = 260;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();
    musicNodes.push(lfo);

    chord.forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        osc.type = i === 0 ? "triangle" : "sine";
        osc.frequency.value = freq;
        const g = audioCtx.createGain();
        g.gain.value = 0;
        osc.connect(g);
        g.connect(filter);
        osc.start();
        // gentle fade-in
        g.gain.linearRampToValueAtTime(0.16 / (i + 1), audioCtx.currentTime + 3);
        musicNodes.push(osc, g);
    });
    musicRunning = true;
}
function stopProceduralPad() {
    musicNodes.forEach((n) => { try { n.stop && n.stop(); n.disconnect && n.disconnect(); } catch (e) {} });
    musicNodes = [];
    musicRunning = false;
}

function applyMusicEnabled() {
    if (bgmFileUsable) {
        if (state.musicOn) { bgmFileEl.play().catch(() => {}); }
        else { bgmFileEl.pause(); }
        return;
    }
    ensureAudioContext();
    if (!audioCtx) return;
    if (state.musicOn) {
        if (audioCtx.state === "suspended") audioCtx.resume();
        startProceduralPad();
        musicMasterGain.gain.linearRampToValueAtTime(0.35, audioCtx.currentTime + 0.4);
    } else if (musicMasterGain) {
        musicMasterGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.2);
    }
}

function playTone(freq, duration, type, startDelay, gainPeak) {
    if (!state.sfxOn) return;
    ensureAudioContext();
    if (!audioCtx) return;
    const t0 = audioCtx.currentTime + (startDelay || 0);
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = type || "sine";
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gainPeak || 0.25, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    osc.connect(g);
    g.connect(audioCtx.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.05);
}
function sfxClick() { playTone(600, 0.08, "sine", 0, 0.18); }
function sfxCorrect() {
    playTone(523.25, 0.16, "triangle", 0, 0.22);
    playTone(659.25, 0.16, "triangle", 0.1, 0.22);
    playTone(783.99, 0.24, "triangle", 0.2, 0.24);
}
function sfxWrong() {
    playTone(160, 0.28, "sawtooth", 0, 0.2);
    playTone(110, 0.32, "sawtooth", 0.08, 0.18);
}
function sfxTimeout() {
    playTone(392, 0.2, "square", 0, 0.16);
    playTone(261.63, 0.3, "square", 0.18, 0.16);
}

let firstGestureDone = false;
function onFirstGesture() {
    if (firstGestureDone) return;
    firstGestureDone = true;
    ensureAudioContext();
    applyMusicEnabled();
    document.removeEventListener("pointerdown", onFirstGesture);
    document.removeEventListener("keydown", onFirstGesture);
}
document.addEventListener("pointerdown", onFirstGesture, { once: false });
document.addEventListener("keydown", onFirstGesture, { once: false });

/* ---------------- Settings UI wiring ---------------- */
function refreshSettingsUI() {
    toggleMusicBtn.querySelector("img").src = state.musicOn
        ? "assets/images/ui/emoji/music_on.png" : "assets/images/ui/emoji/music_off.png";
    toggleMusicBtn.classList.toggle("is-off", !state.musicOn);
    toggleSfxBtn.querySelector("img").src = state.sfxOn
        ? "assets/images/ui/emoji/speaker_on.png" : "assets/images/ui/emoji/speaker_off.png";
    toggleSfxBtn.classList.toggle("is-off", !state.sfxOn);
}
toggleMusicBtn.addEventListener("click", () => {
    state.musicOn = !state.musicOn;
    refreshSettingsUI();
    saveState();
    applyMusicEnabled();
});
toggleSfxBtn.addEventListener("click", () => {
    state.sfxOn = !state.sfxOn;
    refreshSettingsUI();
    saveState();
    if (state.sfxOn) sfxClick();
});
btnResetProgress.addEventListener("click", () => {
    state.bestScore = 0;
    state.checkpoint = null;
    saveState();
    refreshMenuUI();
    resetConfirmMsg.style.display = "block";
    setTimeout(() => { resetConfirmMsg.style.display = "none"; }, 1800);
});
refreshSettingsUI();

/* ---------------- Menu UI ---------------- */
function refreshMenuUI() {
    if (state.bestScore > 0) {
        bestScoreLine.hidden = false;
        bestScoreLine.textContent = "Best Score: " + state.bestScore + " / " + questions.length;
    } else {
        bestScoreLine.hidden = true;
    }
    if (state.checkpoint && state.checkpoint.index > 0 && state.checkpoint.index < questions.length) {
        btnContinue.hidden = false;
        btnContinue.textContent = "Continue Expedition (Entry " + (state.checkpoint.index + 1) + "/" + questions.length + ")";
    } else {
        btnContinue.hidden = true;
    }
}
refreshMenuUI();

/* ---------------- Ambient decorative particles (purely visual, no hitboxes) ---------------- */
function spawnDrifters(container, count) {
    for (let i = 0; i < count; i++) {
        const el = document.createElement("div");
        const isBlot = Math.random() < 0.35;
        el.className = "drifter " + (isBlot ? "blot" : "leaf");
        const size = isBlot ? (10 + Math.random() * 16) : (10 + Math.random() * 8);
        el.style.left = (Math.random() * 96) + "%";
        el.style.setProperty("--sway", (Math.random() * 80 - 40) + "px");
        el.style.animationDuration = (14 + Math.random() * 16) + "s";
        el.style.animationDelay = (-Math.random() * 20) + "s";
        if (isBlot) {
            el.style.width = size + "px";
            el.style.height = size + "px";
            el.style.borderRadius = "50%";
            el.style.background = "currentColor";
        } else {
            el.innerHTML =
                '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24">' +
                '<path fill="currentColor" d="M12 2C7 6 3 10 3 15a9 9 0 0018 0c0-5-4-9-9-13z"/></svg>';
        }
        container.appendChild(el);
    }
}
spawnDrifters($("menuDecor"), 10);
spawnDrifters($("gameDecor"), 8);
spawnDrifters($("endDecor"), 10);
spawnDrifters($("ambientLayer"), 10);

/* ---------------- Ink particle burst feedback ---------------- */
function burstInk(x, y, color) {
    for (let i = 0; i < 10; i++) {
        const p = document.createElement("div");
        p.className = "ink-particle";
        const size = 6 + Math.random() * 8;
        const angle = Math.random() * Math.PI * 2;
        const dist = 40 + Math.random() * 60;
        p.style.width = size + "px";
        p.style.height = size + "px";
        p.style.left = x + "px";
        p.style.top = y + "px";
        p.style.background = color;
        p.style.setProperty("--dx", Math.cos(angle) * dist + "px");
        p.style.setProperty("--dy", Math.sin(angle) * dist + "px");
        flightZone.appendChild(p);
        p.addEventListener("animationend", () => p.remove());
    }
}

/* ---------------- Gameplay state ---------------- */
let index = 0, score = 0, timeLeft = 30, timerId = null;
let answered = false;
let px = 0, py = 0; // top-left position of player, in px, relative to flightZone
// Actual rendered size (differs between the vector fallback and the round photo medallion).
function playerW() { return player.offsetWidth || 64; }
function playerH() { return player.offsetHeight || 48; }
const pressedKeys = new Set();
let rafId = null;
let lastFrameTime = 0;
const MOVE_SPEED = 260; // px per second

function clampPosition(x, y) {
    const w = flightZone.clientWidth, h = flightZone.clientHeight;
    return [
        Math.max(0, Math.min(x, Math.max(0, w - playerW()))),
        Math.max(0, Math.min(y, Math.max(0, h - playerH())))
    ];
}
function setPlayerPosition(x, y) {
    [px, py] = clampPosition(x, y);
    player.style.transform = "translate(" + px + "px," + py + "px)";
}
function resetPlayerStart() {
    const w = flightZone.clientWidth, h = flightZone.clientHeight;
    setPlayerPosition((w - playerW()) / 2, h - playerH() - 12);
}

function checkCollision() {
    if (answered) return;
    const p = player.getBoundingClientRect();
    for (const tag of tagEls) {
        const c = tag.getBoundingClientRect();
        const overlap = !(p.right < c.left || p.left > c.right || p.bottom < c.top || p.top > c.bottom);
        if (overlap) {
            answered = true;
            const chosen = tag.querySelector(".tag-text").textContent;
            if (chosen === questions[index].a) {
                flashTag(tag, "correct-flash");
                success();
            } else {
                flashTag(tag, "wrong-flash");
                fail("Rejected -- try again.", "cross_stamp.png");
            }
            return;
        }
    }
}
function flashTag(tag, cls) {
    tag.classList.add(cls);
    setTimeout(() => tag.classList.remove(cls), 700);
}

/* ---------------- Movement loop (keyboard) ---------------- */
function frameLoop(ts) {
    if (!lastFrameTime) lastFrameTime = ts;
    const dt = Math.min(0.05, (ts - lastFrameTime) / 1000);
    lastFrameTime = ts;
    if (!answered && pressedKeys.size) {
        let dx = 0, dy = 0;
        if (pressedKeys.has("ArrowUp") || pressedKeys.has("w")) dy -= 1;
        if (pressedKeys.has("ArrowDown") || pressedKeys.has("s")) dy += 1;
        if (pressedKeys.has("ArrowLeft") || pressedKeys.has("a")) dx -= 1;
        if (pressedKeys.has("ArrowRight") || pressedKeys.has("d")) dx += 1;
        if (dx || dy) {
            const len = Math.hypot(dx, dy) || 1;
            setPlayerPosition(px + (dx / len) * MOVE_SPEED * dt, py + (dy / len) * MOVE_SPEED * dt);
            checkCollision();
        }
    }
    rafId = requestAnimationFrame(frameLoop);
}
rafId = requestAnimationFrame(frameLoop);

document.addEventListener("keydown", (e) => {
    if (screenGame.hidden) return;
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "a", "s", "d"].includes(key)) {
        pressedKeys.add(key);
        e.preventDefault();
    }
});
document.addEventListener("keyup", (e) => {
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    pressedKeys.delete(key);
});
window.addEventListener("blur", () => pressedKeys.clear());

/* ---------------- Movement (unified pointer input: mouse + touch) ---------------- */
let dragging = false;
flightZone.addEventListener("pointerdown", (e) => {
    if (answered) return;
    dragging = true;
    try { flightZone.setPointerCapture(e.pointerId); } catch (err) { /* no active pointer session */ }
    moveToPointer(e);
});
flightZone.addEventListener("pointermove", (e) => {
    if (!dragging || answered) return;
    moveToPointer(e);
});
["pointerup", "pointercancel", "pointerleave"].forEach((evt) => {
    flightZone.addEventListener(evt, () => { dragging = false; });
});
function moveToPointer(e) {
    const rect = flightZone.getBoundingClientRect();
    const x = e.clientX - rect.left - playerW() / 2;
    const y = e.clientY - rect.top - playerH() / 2;
    setPlayerPosition(x, y);
    checkCollision();
}

window.addEventListener("resize", () => { setPlayerPosition(px, py); });
document.addEventListener("gesturestart", (e) => e.preventDefault());
document.addEventListener("dblclick", (e) => e.preventDefault());

/* ---------------- Question flow ---------------- */
function loadQuestion() {
    if (index >= questions.length) { endGame(); return; }

    answered = false;
    timeLeft = 30;
    timerValue.textContent = String(timeLeft);
    sandFill.style.width = "100%";
    sandFill.classList.remove("low");
    feedbackBanner.classList.remove("show", "correct", "wrong");
    feedbackBanner.style.display = "none";
    retryBtn.hidden = true;

    const q = questions[index];
    questionText.textContent = q.q;
    questionIllustration.src = q.img;
    const shuffledOptions = shuffle(q.o.slice());
    tagEls.forEach((tag, i) => { tag.querySelector(".tag-text").textContent = shuffledOptions[i]; });

    resetPlayerStart();

    clearInterval(timerId);
    timerId = setInterval(() => {
        timeLeft--;
        timerValue.textContent = String(Math.max(0, timeLeft));
        sandFill.style.width = Math.max(0, (timeLeft / 30) * 100) + "%";
        if (timeLeft <= 10) sandFill.classList.add("low");
        if (timeLeft <= 0) {
            clearInterval(timerId);
            answered = true;
            fail("Time's up!", "hourglass.png");
        }
    }, 1000);
}

function success() {
    clearInterval(timerId);
    score++;
    scoreValue.textContent = String(score);
    showFeedback("Confirmed!", "check_stamp.png", "correct");
    sfxCorrect();
    const pr = player.getBoundingClientRect();
    const fr = flightZone.getBoundingClientRect();
    burstInk(pr.left - fr.left + playerW() / 2, pr.top - fr.top + playerH() / 2, "rgba(76,107,63,0.85)");
    index++;
    state.checkpoint = { index: index, score: score };
    saveState();
    setTimeout(loadQuestion, 1100);
}

function fail(msg, icon) {
    clearInterval(timerId);
    showFeedback(msg, icon, "wrong");
    if (icon === "hourglass.png") sfxTimeout(); else sfxWrong();
    retryBtn.hidden = false;
}

function showFeedback(text, icon, cls) {
    feedbackBanner.innerHTML = '<img src="assets/images/ui/emoji/' + icon + '" alt=""><span></span>';
    feedbackBanner.querySelector("span").textContent = text;
    feedbackBanner.classList.remove("correct", "wrong");
    feedbackBanner.classList.add(cls, "show");
    feedbackBanner.style.display = "flex";
}

retryBtn.addEventListener("click", () => { sfxClick(); loadQuestion(); });

function endGame() {
    showScreen(screenEnd);
    finalScoreText.textContent = "Final Score: " + score + " / " + questions.length;
    if (score > state.bestScore) state.bestScore = score;
    state.checkpoint = null;
    saveState();
    refreshMenuUI();
}

/* ---------------- Learn More gallery (built once) ---------------- */
(function buildGallery() {
    specimens.forEach((s) => {
        const card = document.createElement("div");
        card.className = "gallery-card";
        card.innerHTML =
            '<img src="' + s.img + '" alt="' + s.title + '" loading="lazy">' +
            '<div class="cap"><strong>' + s.title + "</strong>" + s.text + "</div>";
        specimenGallery.appendChild(card);
    });
})();

/* ---------------- Top-level menu button wiring ---------------- */
function beginNewGame() {
    sfxClick();
    index = 0; score = 0;
    scoreValue.textContent = "0";
    state.checkpoint = null;
    saveState();
    showScreen(screenGame);
    applyMusicEnabled();
    loadQuestion();
}
function continueGame() {
    sfxClick();
    if (state.checkpoint) { index = state.checkpoint.index; score = state.checkpoint.score; }
    scoreValue.textContent = String(score);
    showScreen(screenGame);
    applyMusicEnabled();
    loadQuestion();
}
btnBegin.addEventListener("click", beginNewGame);
btnContinue.addEventListener("click", continueGame);
btnPlayAgain.addEventListener("click", () => { closeModal(modalLearnMore); beginNewGame(); });
btnLearnMore.addEventListener("click", () => openModal(modalLearnMore));
btnMainMenu.addEventListener("click", () => { sfxClick(); refreshMenuUI(); showScreen(screenMenu); });

/* ---------------- init ---------------- */
showScreen(screenMenu);

})();
