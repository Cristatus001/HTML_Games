/* ============================================================
   SIEGE ARTILLERY — game logic
   Projectile-motion target game (NCERT Physics 3.9 mechanics
   preserved exactly). Adds boot/menu flow, campaign levels,
   procedural audio, ambient FX, image-override system and
   unified pointer input. Fully offline.
   ============================================================ */
(function () {
'use strict';

/* ----------------------------------------------------------
   0. Small helpers
   ---------------------------------------------------------- */
const $  = (id) => document.getElementById(id);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/* ----------------------------------------------------------
   1. Persistent settings / progress (localStorage, guarded)
   ---------------------------------------------------------- */
const store = {
    get(key, def) {
        try { const v = localStorage.getItem(key); return v === null ? def : JSON.parse(v); }
        catch (e) { return def; }
    },
    set(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {} }
};

const settings = {
    music: store.get('siege_music', true),
    sfx:   store.get('siege_sfx', true)
};
let progress = store.get('siege_progress', []); // array of booleans per level

/* ----------------------------------------------------------
   2. Levels
   ---------------------------------------------------------- */
const LEVELS = [
    { name: 'The Training Yard', x: 40,  y: 0,  r: 2.6 },
    { name: 'The Open Field',    x: 70,  y: 0,  r: 2.4 },
    { name: 'The Low Wall',      x: 55,  y: 12, r: 2.4 },
    { name: 'Across the Moat',   x: 100, y: 0,  r: 2.2 },
    { name: 'The High Rampart',  x: 85,  y: 22, r: 2.2 },
    { name: 'Distant Gate',      x: 130, y: 0,  r: 2.0 },
    { name: 'The Watchtower',    x: 110, y: 28, r: 2.0 },
    { name: 'The Long Siege',    x: 165, y: 0,  r: 1.9 }
];
const isUnlocked = (i) => i === 0 || progress[i - 1] === true;

/* ----------------------------------------------------------
   3. Image bank — optional PNG overrides w/ vector fallback
   ---------------------------------------------------------- */
const ImageBank = {
    ok: {},
    img: {},
    load(map) {
        const keys = Object.keys(map);
        return Promise.all(keys.map(k => new Promise(res => {
            const im = new Image();
            im.onload = () => { this.ok[k] = true; this.img[k] = im; res(); };
            im.onerror = () => { this.ok[k] = false; res(); };
            im.src = map[k];
        })));
    },
    has(k) { return this.ok[k] === true; }
};
const IMG_MAP = {
    ground:      'assets/images/background/ground.png',
    cannonWheel: 'assets/images/characters/cannon_wheel.png',
    cannonBarrel:'assets/images/characters/cannon_barrel.png',
    cannonball:  'assets/images/characters/cannonball.png',
    target:      'assets/images/characters/target.png',
    battlefield: 'assets/images/background/battlefield.png'
};

/* ----------------------------------------------------------
   4. Audio — procedural music (offline) + optional bgm file,
      plus synthesized SFX. No audio files required.
   ---------------------------------------------------------- */
const Audio2 = {
    ctx: null, master: null, musicGain: null, sfxGain: null,
    padNodes: [], arpTimer: null, arpStep: 0, noiseBuf: null,
    fileEl: null, fileOk: false, usingFile: false, started: false,

    init() {
        if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();  this.master.gain.value = 0.9;
        this.musicGain = this.ctx.createGain(); this.musicGain.gain.value = settings.music ? 0.16 : 0;
        this.sfxGain = this.ctx.createGain();  this.sfxGain.gain.value = settings.sfx ? 0.9 : 0;
        this.musicGain.connect(this.master);
        this.sfxGain.connect(this.master);
        this.master.connect(this.ctx.destination);

        // white-noise buffer for SFX
        const len = this.ctx.sampleRate * 1;
        this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const d = this.noiseBuf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

        // optional drop-in music file (overrides procedural if present)
        try {
            this.fileEl = new Audio('assets/audio/bgm.mp3');
            this.fileEl.loop = true; this.fileEl.preload = 'auto'; this.fileEl.volume = 0.6;
            this.fileEl.addEventListener('canplaythrough', () => {
                this.fileOk = true;
                if (this.started && settings.music && !this.usingFile) { this.stopPad(); this._playFile(); }
            }, { once: true });
            this.fileEl.addEventListener('error', () => { this.fileOk = false; }, { once: true });
        } catch (e) { this.fileOk = false; }
    },

    startMusic() {
        if (!this.ctx) return;
        this.started = true;
        if (!settings.music) return;
        if (this.fileOk) this._playFile(); else this.startPad();
    },
    _playFile() {
        if (!this.fileEl) return;
        this.usingFile = true;
        const p = this.fileEl.play();
        if (p && p.catch) p.catch(() => { this.usingFile = false; this.startPad(); });
    },

    startPad() {
        if (!this.ctx || this.padNodes.length) return;
        const t = this.ctx.currentTime;
        // low lowpass filter shared
        const lp = this.ctx.createBiquadFilter();
        lp.type = 'lowpass'; lp.frequency.value = 560; lp.Q.value = 0.7;
        lp.connect(this.musicGain);
        // slow LFO opens/closes the filter
        const lfo = this.ctx.createOscillator(); const lfoGain = this.ctx.createGain();
        lfo.frequency.value = 0.05; lfoGain.gain.value = 240;
        lfo.connect(lfoGain); lfoGain.connect(lp.frequency); lfo.start();
        // drone chord (A minor-ish: A2, E3, A3)
        [55, 82.4, 110].forEach((f, i) => {
            const o = this.ctx.createOscillator();
            o.type = i === 0 ? 'sine' : 'triangle';
            o.frequency.value = f;
            o.detune.value = (i - 1) * 4;
            const g = this.ctx.createGain(); g.gain.value = i === 0 ? 0.5 : 0.28;
            o.connect(g); g.connect(lp); o.start(t);
            this.padNodes.push(o);
        });
        this.padNodes.push(lfo);
        // gentle arpeggio (A minor pentatonic)
        this.arpStep = 0;
        const scale = [220.0, 261.6, 293.7, 329.6, 392.0, 329.6, 293.7, 261.6];
        this.arpTimer = setInterval(() => {
            if (!this.ctx || !settings.music || this.usingFile) return;
            const now = this.ctx.currentTime;
            const f = scale[this.arpStep % scale.length];
            this.arpStep++;
            const o = this.ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = f;
            const g = this.ctx.createGain();
            g.gain.setValueAtTime(0.0001, now);
            g.gain.exponentialRampToValueAtTime(0.14, now + 0.05);
            g.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);
            o.connect(g); g.connect(lp);
            o.start(now); o.stop(now + 1.5);
        }, 620);
    },
    stopPad() {
        if (this.arpTimer) { clearInterval(this.arpTimer); this.arpTimer = null; }
        this.padNodes.forEach(n => { try { n.stop(); } catch (e) {} try { n.disconnect(); } catch (e) {} });
        this.padNodes = [];
    },

    setMusic(on) {
        settings.music = on; store.set('siege_music', on);
        if (!this.ctx) return;
        if (on) {
            this.musicGain.gain.setTargetAtTime(0.16, this.ctx.currentTime, 0.2);
            if (this.fileOk) this._playFile(); else this.startPad();
        } else {
            this.musicGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.15);
            if (this.usingFile && this.fileEl) { this.fileEl.pause(); this.usingFile = false; }
            this.stopPad();
        }
    },
    setSfx(on) {
        settings.sfx = on; store.set('siege_sfx', on);
        if (this.ctx) this.sfxGain.gain.value = on ? 0.9 : 0;
    },

    _noise(dur) { const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true; return s; },
    fire() {
        if (!this.ctx || !settings.sfx) return;
        const now = this.ctx.currentTime;
        // low thump
        const o = this.ctx.createOscillator(); o.type = 'sine';
        o.frequency.setValueAtTime(160, now); o.frequency.exponentialRampToValueAtTime(42, now + 0.25);
        const g = this.ctx.createGain(); g.gain.setValueAtTime(0.9, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        o.connect(g); g.connect(this.sfxGain); o.start(now); o.stop(now + 0.4);
        // noise blast
        const n = this._noise(); const nf = this.ctx.createBiquadFilter();
        nf.type = 'bandpass'; nf.frequency.value = 900; nf.Q.value = 0.6;
        const ng = this.ctx.createGain(); ng.gain.setValueAtTime(0.7, now);
        ng.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        n.connect(nf); nf.connect(ng); ng.connect(this.sfxGain); n.start(now); n.stop(now + 0.32);
    },
    hit() {
        if (!this.ctx || !settings.sfx) return;
        const now = this.ctx.currentTime;
        const n = this._noise(); const nf = this.ctx.createBiquadFilter();
        nf.type = 'lowpass'; nf.frequency.setValueAtTime(2200, now);
        nf.frequency.exponentialRampToValueAtTime(300, now + 0.5);
        const ng = this.ctx.createGain(); ng.gain.setValueAtTime(0.9, now);
        ng.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        n.connect(nf); nf.connect(ng); ng.connect(this.sfxGain); n.start(now); n.stop(now + 0.62);
        [523, 659, 784].forEach((f, i) => {
            const o = this.ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = f;
            const g = this.ctx.createGain(); const st = now + i * 0.06;
            g.gain.setValueAtTime(0.0001, st); g.gain.exponentialRampToValueAtTime(0.25, st + 0.03);
            g.gain.exponentialRampToValueAtTime(0.001, st + 0.5);
            o.connect(g); g.connect(this.sfxGain); o.start(st); o.stop(st + 0.55);
        });
    },
    click() {
        if (!this.ctx || !settings.sfx) return;
        const now = this.ctx.currentTime;
        const o = this.ctx.createOscillator(); o.type = 'square'; o.frequency.value = 320;
        const g = this.ctx.createGain(); g.gain.setValueAtTime(0.18, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
        o.connect(g); g.connect(this.sfxGain); o.start(now); o.stop(now + 0.1);
    },
    // soft parchment tick while scrolling a panel
    scroll() {
        if (!this.ctx || !settings.sfx) return;
        const now = this.ctx.currentTime;
        const n = this._noise();
        const bp = this.ctx.createBiquadFilter();
        bp.type = 'bandpass'; bp.frequency.value = 1700 + Math.random() * 700; bp.Q.value = 1.4;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.0001, now);
        g.gain.exponentialRampToValueAtTime(0.05, now + 0.004);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
        n.connect(bp); bp.connect(g); g.connect(this.sfxGain);
        n.start(now); n.stop(now + 0.06);
    }
};

/* ----------------------------------------------------------
   5. Ambient embers (DOM)
   ---------------------------------------------------------- */
function spawnEmbers() {
    const field = $('ember-field');
    if (!field) return;
    const N = 26;
    for (let i = 0; i < N; i++) {
        const e = document.createElement('div');
        e.className = 'ember';
        e.style.left = (Math.random() * 100) + '%';
        const dur = 8 + Math.random() * 10;
        e.style.animationDuration = dur + 's';
        e.style.animationDelay = (-Math.random() * dur) + 's';
        const sz = 2 + Math.random() * 4;
        e.style.width = sz + 'px'; e.style.height = sz + 'px';
        e.style.setProperty('--drift', (Math.random() * 120 - 40) + 'px');
        field.appendChild(e);
    }
}

/* ----------------------------------------------------------
   6. Canvas simulation (physics preserved from original)
   ---------------------------------------------------------- */
const canvas = $('simCanvas');
const ctx = canvas.getContext('2d');
const battlefield = $('battlefield');

const g = 9.8;              // gravity (m/s^2) — unchanged
let scale = 10;            // pixels per meter
let W = 0, H = 0;          // logical canvas size (CSS px)
let dpr = 1;
const ORIGIN_X = 50;       // cannon x (px)
const GROUND_H = 50;       // ground strip height (px)
const BALL_RADIUS_PX = 7;  // drawn cannonball radius — also used for pixel-accurate hit testing

function targetRadiusPx() { return Math.max(target.radius * scale, 10); }

let balls = [];
let particles = [];
let smoke = [];
let target = { x: 80, y: 0, radius: 2.5, hit: false, drag: false, locked: false };
let mode = 'free';         // 'free' | 'campaign'
let currentLevel = 0;
let levelDone = false;
let cannonRecoil = 0;
let lastTime = 0;
let running = false;

const ui = {
    v0: $('v0-slider'), v0Txt: $('v0-val'),
    ang: $('angle-slider'), angTxt: $('angle-val'),
    vectors: $('show-vectors'), path: $('show-path'),
    stats: { t: $('time-stat'), y: $('y-stat'), vx: $('vx-stat'), vy: $('vy-stat'),
             h: $('pred-h'), r: $('pred-r') },
    bubble: $('hint-bubble')
};

class Projectile {
    constructor(v0, angleDeg) {
        this.v0 = v0;
        this.angleRad = angleDeg * (Math.PI / 180);
        this.t = 0;
        this.active = true;
        this.path = [];
        this.color = `hsl(${28 + Math.random() * 18}, 90%, 55%)`;
        this.vox = v0 * Math.cos(this.angleRad);
        this.voy = v0 * Math.sin(this.angleRad);
        this.x = 0; this.y = 0;
        this.vx = this.vox; this.vy = this.voy;
    }
    update(dt) {
        if (!this.active) return;
        this.t += dt;
        // Equations of motion (Sec 3.9) — unchanged
        this.x = this.vox * this.t;
        this.y = (this.voy * this.t) - (0.5 * g * this.t * this.t);
        this.vy = this.voy - (g * this.t);

        if (this.y <= 0) {
            this.y = 0; this.active = false; this.vx = 0; this.vy = 0;
            checkHit(this);
        }
        if (this.x * scale > W * 2) this.active = false;
        if (this.active) checkHit(this);

        // smoke trail
        if (this.active && Math.random() < 0.6) {
            smoke.push({ x: this.x, y: this.y, life: 1, r: 2 + Math.random() * 2 });
        }
        // path recording (throttled)
        if (this.path.length === 0 ||
            Math.hypot(this.x - this.path[this.path.length - 1].x, this.y - this.path[this.path.length - 1].y) > 1) {
            this.path.push({ x: this.x, y: this.y });
        }
    }
    draw() {
        const cx = ORIGIN_X + this.x * scale;
        const cy = (H - GROUND_H) - this.y * scale;

        if (ui.path.checked && this.path.length > 0) {
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(255, 225, 170, 0.85)';
            ctx.lineWidth = 2; ctx.setLineDash([5, 5]);
            ctx.moveTo(ORIGIN_X, H - GROUND_H);
            for (const p of this.path) ctx.lineTo(ORIGIN_X + p.x * scale, (H - GROUND_H) - p.y * scale);
            ctx.lineTo(cx, cy); ctx.stroke(); ctx.setLineDash([]);
        }

        // glowing cannonball
        const rad = BALL_RADIUS_PX;
        const gl = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad * 2.6);
        gl.addColorStop(0, 'rgba(255,200,110,.8)'); gl.addColorStop(1, 'rgba(255,140,50,0)');
        ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(cx, cy, rad * 2.6, 0, Math.PI * 2); ctx.fill();

        if (ImageBank.has('cannonball')) {
            ctx.drawImage(ImageBank.img.cannonball, cx - rad, cy - rad, rad * 2, rad * 2);
        } else {
            const bg = ctx.createRadialGradient(cx - 2, cy - 2, 1, cx, cy, rad);
            bg.addColorStop(0, '#8f9aa6'); bg.addColorStop(0.5, '#3d444d'); bg.addColorStop(1, '#14181d');
            ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = 'rgba(255,220,160,.6)'; ctx.lineWidth = 1; ctx.stroke();
        }

        if (ui.vectors.checked && this.active) {
            drawArrow(cx, cy, this.vx * 1.5, 0, '#7fd6ff', 'vx');
            drawArrow(cx, cy, 0, -this.vy * 1.5, '#ff7ac0', 'vy');
        }
    }
}

function drawArrow(x, y, dx, dy, color) {
    if (Math.abs(dx) < 2 && Math.abs(dy) < 2) return;
    ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.moveTo(x, y); ctx.lineTo(x + dx, y + dy); ctx.stroke();
    const a = Math.atan2(dy, dx), head = 8;
    ctx.beginPath(); ctx.fillStyle = color;
    ctx.moveTo(x + dx, y + dy);
    ctx.lineTo(x + dx - head * Math.cos(a - Math.PI / 6), y + dy - head * Math.sin(a - Math.PI / 6));
    ctx.lineTo(x + dx - head * Math.cos(a + Math.PI / 6), y + dy - head * Math.sin(a + Math.PI / 6));
    ctx.fill();
}

function checkHit(ball) {
    if (target.hit) return;
    // Pixel-accurate and center-in-ring: the ball must actually fly into
    // the target face, not just clip its outer rim/corner with its own
    // radius. A graze that merely touches the boundary from outside does
    // not count — the cannonball's center has to land inside the ring.
    const distPx = Math.hypot(ball.x - target.x, ball.y - target.y) * scale;
    if (distPx < targetRadiusPx()) {
        target.hit = true;
        explode(ball.x, ball.y);
        Audio2.hit();
        onTargetHit(ball);
    }
}

function explode(x, y) {
    for (let i = 0; i < 26; i++) {
        const a = Math.random() * Math.PI * 2, sp = Math.random() * 26 + 4;
        particles.push({
            x, y, vx: Math.cos(a) * sp, vy: Math.abs(Math.sin(a) * sp) + 4,
            life: 1, color: `hsl(${Math.random() * 45 + 15}, 100%, ${55 + Math.random() * 15}%)`,
            r: 2 + Math.random() * 3
        });
    }
}

function updateCalculations() {
    const v0 = parseFloat(ui.v0.value);
    const ang = parseFloat(ui.ang.value);
    const rad = ang * Math.PI / 180;

    ui.v0Txt.textContent = v0 + ' m/s';
    ui.angTxt.textContent = ang + '°';

    const Hm = Math.pow(v0 * Math.sin(rad), 2) / (2 * g);   // max height
    const R  = Math.pow(v0, 2) * Math.sin(2 * rad) / g;     // range
    ui.stats.h.textContent = Hm.toFixed(1) + ' m';
    ui.stats.r.textContent = R.toFixed(1) + ' m';

    // Auto-zoom: fit whichever is farther — the range or the target — plus headroom for height.
    if (W > 0) {
        const reach = Math.max(R, target.x, 20) + 20;
        const avail = W - 100;
        let s = avail / reach;
        // also make sure the peak height fits vertically
        const peak = Math.max(Hm, target.y, 5);
        const availV = H - GROUND_H - 40;
        s = Math.min(s, availV / peak);
        scale = clamp(s, 2.2, 34);
    }
}

function showHint(msgHtml, iconFile) {
    ui.bubble.innerHTML = (iconFile ? `<img src="assets/images/ui/emoji/${iconFile}" alt="">` : '') + `<span>${msgHtml}</span>`;
    ui.bubble.classList.add('show');
    clearTimeout(showHint._t);
    showHint._t = setTimeout(() => ui.bubble.classList.remove('show'), 4200);
}

/* ---- environment drawing ---- */
function drawEnvironment() {
    ctx.clearRect(0, 0, W, H);
    const groundY = H - GROUND_H;

    // distance grid + labels
    ctx.strokeStyle = 'rgba(255,235,190,0.10)';
    ctx.fillStyle = 'rgba(255,235,190,0.45)';
    ctx.font = "11px 'Lora', serif";
    ctx.textAlign = 'left';
    ctx.lineWidth = 1;
    const stepPx = scale * 10;
    if (stepPx > 6) {
        for (let x = ORIGIN_X; x < W; x += stepPx) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, groundY); ctx.stroke();
            ctx.fillText(Math.round((x - ORIGIN_X) / scale) + 'm', x + 3, groundY - 6);
        }
    }

    // ground
    if (ImageBank.has('ground')) {
        const im = ImageBank.img.ground;
        const pat = ctx.createPattern(im, 'repeat-x');
        ctx.save(); ctx.translate(0, groundY); ctx.fillStyle = pat;
        ctx.fillRect(0, 0, W, GROUND_H); ctx.restore();
    } else {
        const gg = ctx.createLinearGradient(0, groundY, 0, H);
        gg.addColorStop(0, '#5a4a2b'); gg.addColorStop(0.25, '#463a24'); gg.addColorStop(1, '#241a10');
        ctx.fillStyle = gg; ctx.fillRect(0, groundY, W, GROUND_H);
        // grass rim
        ctx.fillStyle = '#6f7b34'; ctx.fillRect(0, groundY, W, 5);
        ctx.fillStyle = '#57632a'; ctx.fillRect(0, groundY + 5, W, 2);
    }

    drawCannon();
    drawTarget();
}

function drawCannon() {
    const cx = ORIGIN_X, cy = H - GROUND_H;
    const ang = parseFloat(ui.ang.value) * Math.PI / 180;
    const recoil = cannonRecoil * 8;

    // barrel
    ctx.save();
    ctx.translate(cx, cy - 4);
    ctx.rotate(-ang);
    ctx.translate(-recoil, 0);
    if (ImageBank.has('cannonBarrel')) {
        ctx.drawImage(ImageBank.img.cannonBarrel, -6, -14, 56, 28);
    } else {
        const bg = ctx.createLinearGradient(0, -9, 0, 9);
        bg.addColorStop(0, '#9aa4b0'); bg.addColorStop(0.5, '#5b6570'); bg.addColorStop(1, '#262c34');
        ctx.fillStyle = bg;
        roundRect(-4, -9, 46, 18, 6); ctx.fill();
        ctx.strokeStyle = '#14181d'; ctx.lineWidth = 1.5; ctx.stroke();
        // muzzle ring
        ctx.fillStyle = '#3a424c'; roundRect(38, -11, 8, 22, 3); ctx.fill();
    }
    ctx.restore();

    // wheel
    if (ImageBank.has('cannonWheel')) {
        ctx.drawImage(ImageBank.img.cannonWheel, cx - 16, cy - 16, 32, 32);
    } else {
        ctx.beginPath(); ctx.arc(cx, cy, 14, 0, Math.PI * 2);
        const wg = ctx.createRadialGradient(cx - 3, cy - 3, 2, cx, cy, 14);
        wg.addColorStop(0, '#b47f3c'); wg.addColorStop(1, '#6e421a');
        ctx.fillStyle = wg; ctx.fill();
        ctx.strokeStyle = '#3a2410'; ctx.lineWidth = 2; ctx.stroke();
        ctx.strokeStyle = 'rgba(58,36,16,.8)'; ctx.lineWidth = 1.5;
        for (let i = 0; i < 6; i++) {
            const a = (Math.PI / 3) * i;
            ctx.beginPath(); ctx.moveTo(cx, cy);
            ctx.lineTo(cx + Math.cos(a) * 12, cy + Math.sin(a) * 12); ctx.stroke();
        }
        ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.fillStyle = '#3a2410'; ctx.fill();
    }
}

function drawTarget() {
    const tx = ORIGIN_X + target.x * scale;
    const groundY = H - GROUND_H;
    const ty = groundY - target.y * scale;
    const R = targetRadiusPx();

    // support post / stone plinth if elevated
    if (target.y > 0.5) {
        const w = Math.max(R * 0.5, 8);
        const pg = ctx.createLinearGradient(tx - w, 0, tx + w, 0);
        pg.addColorStop(0, '#6b7178'); pg.addColorStop(0.5, '#9aa1a8'); pg.addColorStop(1, '#565b61');
        ctx.fillStyle = pg;
        ctx.fillRect(tx - w, ty, w * 2, groundY - ty);
        ctx.strokeStyle = 'rgba(20,20,24,.5)'; ctx.lineWidth = 1;
        for (let yy = ty; yy < groundY; yy += 14) ctx.strokeRect(tx - w, yy, w * 2, 14);
    }

    if (ImageBank.has('target')) {
        ctx.drawImage(ImageBank.img.target, tx - R, ty - R, R * 2, R * 2);
    } else {
        const rings = [
            [1.0, '#8a5a2b'], [0.86, '#f4ecd6'], [0.68, '#c0392b'],
            [0.5, '#f4ecd6'], [0.32, '#c0392b'], [0.15, '#f4ecd6']
        ];
        for (const [f, col] of rings) {
            ctx.beginPath(); ctx.arc(tx, ty, R * f, 0, Math.PI * 2);
            ctx.fillStyle = target.hit && col === '#c0392b' ? '#4cc9b0' : col; ctx.fill();
        }
        ctx.beginPath(); ctx.arc(tx, ty, R, 0, Math.PI * 2);
        ctx.strokeStyle = '#3a2410'; ctx.lineWidth = 2; ctx.stroke();
    }

    // label
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,240,205,.95)';
    ctx.font = "700 12px 'Playfair Display', serif";
    if (!target.hit) {
        if (target.locked) {
            ctx.fillText(Math.round(target.x) + ' m', tx, ty - R - 8);
        } else {
            ctx.fillText('THE MARK', tx, ty - R - 8);
            ctx.font = "10px 'Lora', serif";
            ctx.fillStyle = 'rgba(255,240,205,.7)';
            ctx.fillText('drag to reposition', tx, ty - R - 22);
        }
    }
    ctx.textAlign = 'left';
}

function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

/* ---- main loop ---- */
function animate(ts) {
    const dt = (ts - lastTime) / 1000;
    lastTime = ts;
    const step = Math.min(dt || 0, 0.1);
    cannonRecoil = Math.max(0, cannonRecoil - step * 4);

    drawEnvironment();

    // smoke (behind balls conceptually but drawn first)
    for (let i = smoke.length - 1; i >= 0; i--) {
        const s = smoke[i]; s.life -= step * 1.6;
        if (s.life <= 0) { smoke.splice(i, 1); continue; }
        const px = ORIGIN_X + s.x * scale, py = (H - GROUND_H) - s.y * scale;
        ctx.globalAlpha = s.life * 0.4; ctx.fillStyle = '#cfc3b0';
        ctx.beginPath(); ctx.arc(px, py, s.r + (1 - s.life) * 4, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
    }

    let anyActive = false;
    balls.forEach(b => {
        b.update(step); b.draw();
        if (b.active) {
            anyActive = true;
            ui.stats.t.textContent = b.t.toFixed(1) + 's';
            ui.stats.y.textContent = b.y.toFixed(1) + 'm';
            ui.stats.vx.textContent = b.vx.toFixed(1);
            ui.stats.vy.textContent = b.vy.toFixed(1);
        }
    });
    // Only one shot in the air at a time — re-arm the cannon once it lands/hits.
    setFireEnabled(!anyActive);

    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= step * 1.4;
        p.vy -= g * step * 0.6;          // embers float, gentle gravity
        p.x += p.vx * step; p.y += p.vy * step;
        if (p.life <= 0 || p.y < 0) { particles.splice(i, 1); continue; }
        const px = ORIGIN_X + p.x * scale, py = (H - GROUND_H) - p.y * scale;
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(px, py, p.r * p.life, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
    }

    requestAnimationFrame(animate);
}

/* ---- sizing ---- */
function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = battlefield.clientWidth;
    H = battlefield.clientHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    updateCalculations();
}

/* ----------------------------------------------------------
   7. Game flow / screens
   ---------------------------------------------------------- */
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    $(id).classList.add('active');
    if (id === 'game-screen') requestAnimationFrame(() => resize());
}
function openModal(id) { $(id).classList.add('show'); }
function closeModal(id) { $(id).classList.remove('show'); }

function startGame(m, levelIndex) {
    mode = m;
    balls = []; particles = []; smoke = [];
    levelDone = false;
    resetStats();

    if (m === 'campaign') {
        currentLevel = levelIndex;
        const L = LEVELS[levelIndex];
        target = { x: L.x, y: L.y, radius: L.r, hit: false, drag: false, locked: true };
        $('hud-level-name').textContent = (levelIndex + 1) + '. ' + L.name;
        $('hud-goal').textContent = 'Bring it down — ' + Math.round(L.x) + ' m out.';
    } else {
        target = { x: 80, y: 0, radius: 2.5, hit: false, drag: false, locked: false };
        $('hud-level-name').textContent = 'Drill Grounds';
        $('hud-goal').textContent = 'Drag the target. Put one through it.';
    }
    showScreen('game-screen');
    updateCalculations();
}

function resetStats() {
    ui.stats.t.textContent = '0.0s'; ui.stats.y.textContent = '0m';
    ui.stats.vx.textContent = '0'; ui.stats.vy.textContent = '0';
}

function onTargetHit(ball) {
    if (mode === 'campaign' && !levelDone) {
        levelDone = true;
        progress[currentLevel] = true;
        store.set('siege_progress', progress);
        setTimeout(() => openVictory(ball), 650);
    } else if (mode === 'free') {
        showHint('Direct hit! The target doesn\'t stand a chance.', 'check.png');
    }
}

function openVictory(ball) {
    const ang = parseFloat(ui.ang.value), v0 = parseFloat(ui.v0.value);
    const isLast = currentLevel >= LEVELS.length - 1;
    $('victory-sub').textContent = LEVELS[currentLevel].name + ' falls to your cannon!';
    $('victory-stats').innerHTML =
        vchip(v0, 'Muzzle Speed') + vchip(ang + '°', 'Barrel Angle') +
        vchip(Math.round(target.x) + 'm', 'Strike Range');
    $('next-btn').querySelector('span').textContent = isLast ? 'Campaign Won' : 'March On';
    openModal('victory-modal');
}
function vchip(val, label) { return `<div class="vchip"><b>${val}</b><span>${label}</span></div>`; }

/* ---- level select rendering ---- */
function renderLevels() {
    const grid = $('level-grid');
    grid.innerHTML = '';
    LEVELS.forEach((L, i) => {
        const card = document.createElement('button');
        card.className = 'level-card' + (isUnlocked(i) ? '' : ' locked');
        card.innerHTML =
            `<span class="lv-num">${i + 1}</span>` +
            `<span class="lv-dist">${L.y > 0 ? 'wall · ' : ''}${Math.round(L.x)} m</span>` +
            (progress[i] ? `<img class="lv-star" src="assets/images/ui/emoji/star.png" alt="cleared">` : '');
        if (isUnlocked(i)) {
            card.addEventListener('click', () => { Audio2.click(); startGame('campaign', i); });
        }
        grid.appendChild(card);
    });
}

/* ----------------------------------------------------------
   8. Input — unified Pointer Events for target dragging
   ---------------------------------------------------------- */
function canvasPoint(e) {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}
canvas.addEventListener('pointerdown', e => {
    if (target.locked) return;
    const p = canvasPoint(e);
    const tx = ORIGIN_X + target.x * scale;
    const ty = (H - GROUND_H) - target.y * scale;
    if (Math.hypot(p.x - tx, p.y - ty) < Math.max(target.radius * scale + 12, 34)) {
        target.drag = true;
        try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    }
});
canvas.addEventListener('pointermove', e => {
    if (!target.drag) return;
    const p = canvasPoint(e);
    let newX = (p.x - ORIGIN_X) / scale;
    target.x = clamp(newX, 5, 100000);
    target.hit = false;
    updateCalculations();
});
function endDrag() { target.drag = false; }
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);

/* ----------------------------------------------------------
   9. Wire up UI
   ---------------------------------------------------------- */
let fireEnabled = true;
function setFireEnabled(on) {
    if (on === fireEnabled) return;
    fireEnabled = on;
    const b = $('fire-btn');
    b.disabled = !on;
    b.classList.toggle('is-reloading', !on);
    b.querySelector('span').textContent = on ? 'FIRE' : 'AIRBORNE';
}
function fire() {
    Audio2.init();
    if (balls.some(b => b.active)) return;   // wait for the current shot to land/hit
    balls.push(new Projectile(parseFloat(ui.v0.value), parseFloat(ui.ang.value)));
    setFireEnabled(false);
    if (mode === 'free') target.hit = false;
    else if (!levelDone) target.hit = false;
    cannonRecoil = 1;
    Audio2.fire();
}

ui.v0.addEventListener('input', updateCalculations);
ui.ang.addEventListener('input', updateCalculations);
$('fire-btn').addEventListener('click', fire);
$('reset-btn').addEventListener('click', () => {
    Audio2.click();
    balls = []; particles = []; smoke = [];
    if (mode === 'free' || !levelDone) target.hit = false;
    resetStats();
});
$('hint-btn').addEventListener('click', () => {
    Audio2.click();
    const ang = parseFloat(ui.ang.value);
    if (ang == 45) showHint('45° — textbook maximum range. You\'ve read the manual.', 'check.png');
    else if (ang >= 88) showHint('Straight up! She\'ll land right back on your own head. Try a flatter angle.', 'arrow-up.png');
    else if (ang < 20) showHint('Flat and fast — she\'ll skim in quick, but won\'t carry far.', 'arrow-down.png');
    else showHint('Twin angles like 30° and 60° land the same distance. Pick your style.', 'torch.png');
});

// navigation
document.querySelectorAll('[data-nav]').forEach(btn => {
    btn.addEventListener('click', () => {
        Audio2.click();
        const nav = btn.getAttribute('data-nav');
        if (nav === 'menu') showScreen('menu-screen');
        else if (nav === 'back-to-menu') showScreen('menu-screen');
    });
});
$('boot-btn').addEventListener('click', () => {
    Audio2.init();
    Audio2.startMusic();
    Audio2.click();
    showScreen('menu-screen');
});
$('campaign-btn').addEventListener('click', () => { Audio2.click(); renderLevels(); showScreen('levels-screen'); });
$('freeplay-btn').addEventListener('click', () => { Audio2.click(); startGame('free'); });

// settings modal
function refreshSwitch(btn, on) {
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.querySelector('.switch-state').textContent = on ? 'On' : 'Off';
    btn.querySelector('.switch-ico').src = 'assets/images/ui/emoji/' +
        (btn.id === 'set-music' ? (on ? 'music-on.png' : 'music-off.png')
                                : (on ? 'sound-on.png' : 'sound-off.png'));
}
function refreshHudToggles() {
    $('music-toggle').querySelector('img').src = 'assets/images/ui/emoji/' + (settings.music ? 'music-on.png' : 'music-off.png');
    $('sfx-toggle').querySelector('img').src = 'assets/images/ui/emoji/' + (settings.sfx ? 'sound-on.png' : 'sound-off.png');
}
function openSettings() { Audio2.click(); refreshSwitch($('set-music'), settings.music); refreshSwitch($('set-sfx'), settings.sfx); openModal('settings-modal'); }
$('menu-settings-btn').addEventListener('click', openSettings);
$('game-settings-btn').addEventListener('click', openSettings);
$('settings-close').addEventListener('click', () => { Audio2.click(); closeModal('settings-modal'); });
$('set-music').addEventListener('click', () => { Audio2.init(); const on = !settings.music; Audio2.setMusic(on); refreshSwitch($('set-music'), on); refreshHudToggles(); });
$('set-sfx').addEventListener('click', () => { Audio2.init(); const on = !settings.sfx; Audio2.setSfx(on); refreshSwitch($('set-sfx'), on); refreshHudToggles(); Audio2.click(); });
$('wipe-progress').addEventListener('click', () => {
    Audio2.click(); progress = []; store.set('siege_progress', progress);
    renderLevels();
    $('wipe-progress').textContent = 'Erased!';
    setTimeout(() => { $('wipe-progress').textContent = 'Erase'; }, 1200);
});

// HUD quick toggles
$('music-toggle').addEventListener('click', () => { Audio2.init(); Audio2.setMusic(!settings.music); refreshHudToggles(); });
$('sfx-toggle').addEventListener('click', () => { Audio2.init(); Audio2.setSfx(!settings.sfx); refreshHudToggles(); Audio2.click(); });

// victory modal buttons
$('learn-btn').addEventListener('click', () => { Audio2.click(); openModal('learn-modal'); });
$('learn-done').addEventListener('click', () => { Audio2.click(); closeModal('learn-modal'); });
$('learn-close').addEventListener('click', () => { Audio2.click(); closeModal('learn-modal'); });
$('replay-btn').addEventListener('click', () => { Audio2.click(); closeModal('victory-modal'); startGame('campaign', currentLevel); });
$('next-btn').addEventListener('click', () => {
    Audio2.click(); closeModal('victory-modal');
    if (currentLevel < LEVELS.length - 1) startGame('campaign', currentLevel + 1);
    else { renderLevels(); showScreen('levels-screen'); }
});
$('victory-menu').addEventListener('click', () => { Audio2.click(); closeModal('victory-modal'); showScreen('menu-screen'); });

/* ----------------------------------------------------------
   10. Global guards — no zoom / scroll / text-select
   ---------------------------------------------------------- */
window.addEventListener('resize', () => { if ($('game-screen').classList.contains('active')) resize(); });
window.addEventListener('orientationchange', () => setTimeout(resize, 250));
document.addEventListener('gesturestart', e => e.preventDefault());
document.addEventListener('gesturechange', e => e.preventDefault());
document.addEventListener('dblclick', e => e.preventDefault(), { passive: false });
document.addEventListener('contextmenu', e => e.preventDefault());
// Block multi-finger pinch gestures without interfering with single-tap buttons
// or scrollable panels (double-tap zoom is already handled by touch-action/viewport).
document.addEventListener('touchmove', e => {
    if (e.touches && e.touches.length > 1) e.preventDefault();
}, { passive: false });

/* ----------------------------------------------------------
   10b. Scroll tick SFX on scrollable panels (throttled)
   ---------------------------------------------------------- */
let _lastScrollSfx = 0;
function onPanelScroll() {
    const now = performance.now();
    if (now - _lastScrollSfx < 110) return;   // throttle so it doesn't machine-gun
    _lastScrollSfx = now;
    Audio2.scroll();
}
document.querySelectorAll('#control-panel, .menu-scroll, .levels-panel, .level-grid, .modal')
    .forEach(el => el.addEventListener('scroll', onPanelScroll, { passive: true }));

/* ----------------------------------------------------------
   11. Boot
   ---------------------------------------------------------- */
spawnEmbers();
refreshHudToggles();
ImageBank.load(IMG_MAP).then(() => {
    if (ImageBank.has('battlefield')) {
        battlefield.style.backgroundImage = `url(${IMG_MAP.battlefield})`;
        battlefield.style.backgroundSize = 'cover';
        battlefield.style.backgroundPosition = 'center';
    }
});
resize();
requestAnimationFrame(animate);

})();
