/* ==========================================================================
   Gravity Quest - ambient backdrop
   Purely decorative parallax starfield, drifting dust, falling motes and the
   occasional meteor. Draws to its own canvas behind the UI and never touches
   gameplay state or hit testing.
   ========================================================================== */
(function (global) {
    'use strict';

    var canvas, ctx;
    var W = 0, H = 0, DPR = 1;
    var raf = null;
    var running = false;
    var enabled = true;
    var last = 0;
    var depth = 0;          /* 0..1 ascent progress, drives the parallax push */
    var depthEased = 0;

    var stars = [];         /* 3 parallax layers */
    var motes = [];         /* slow falling specks - the "free fall" motif */
    var dust = [];          /* drifting nebula puffs */
    var meteors = [];
    var meteorTimer = 0;

    function rand(a, b) { return a + Math.random() * (b - a); }

    function resize() {
        if (!canvas) { return; }
        DPR = Math.min(global.devicePixelRatio || 1, 2);
        W = canvas.clientWidth || global.innerWidth;
        H = canvas.clientHeight || global.innerHeight;
        canvas.width = Math.max(1, Math.floor(W * DPR));
        canvas.height = Math.max(1, Math.floor(H * DPR));
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        seed();
    }

    function seed() {
        var area = W * H;
        var starCount = Math.round(Math.min(260, Math.max(70, area / 5200)));
        stars = [];
        for (var i = 0; i < starCount; i++) {
            var layer = i % 3;                       /* 0 far ... 2 near */
            stars.push({
                x: Math.random() * W,
                y: Math.random() * H,
                r: [0.7, 1.1, 1.7][layer] * rand(0.7, 1.3),
                a: [0.34, 0.55, 0.85][layer] * rand(0.65, 1),
                p: layer,
                tw: rand(0.4, 1.8),
                ph: Math.random() * Math.PI * 2
            });
        }

        var moteCount = Math.round(Math.min(46, Math.max(14, area / 26000)));
        motes = [];
        for (var m = 0; m < moteCount; m++) {
            motes.push(newMote(true));
        }

        dust = [];
        var dustCount = Math.round(Math.min(7, Math.max(3, area / 190000)));
        for (var d = 0; d < dustCount; d++) {
            dust.push({
                x: Math.random() * W,
                y: Math.random() * H,
                r: rand(90, 230),
                vx: rand(-4, 4),
                vy: rand(-3, 3),
                hue: [188, 196, 268, 172][d % 4],
                a: rand(0.05, 0.11)
            });
        }
    }

    function newMote(anywhere) {
        return {
            x: Math.random() * W,
            y: anywhere ? Math.random() * H : -12,
            /* motes accelerate downward, echoing the free-fall theme */
            v: rand(6, 20),
            acc: rand(3, 11),
            r: rand(0.9, 2.4),
            a: rand(0.25, 0.7),
            sway: rand(-9, 9),
            ph: Math.random() * Math.PI * 2,
            gold: Math.random() < 0.24
        };
    }

    function spawnMeteor() {
        var fromLeft = Math.random() < 0.5;
        meteors.push({
            x: fromLeft ? rand(-0.1, 0.5) * W : rand(0.5, 1.1) * W,
            y: rand(-0.1, 0.35) * H,
            vx: (fromLeft ? 1 : -1) * rand(160, 300),
            vy: rand(120, 240),
            life: 0,
            max: rand(0.8, 1.5),
            len: rand(60, 140)
        });
    }

    function step(dt) {
        depthEased += (depth - depthEased) * Math.min(1, dt * 1.6);

        var i, s;
        for (i = 0; i < stars.length; i++) {
            s = stars[i];
            s.ph += dt * s.tw;
            /* near layers drift faster; the whole field rises with the ascent */
            s.y += dt * (2 + s.p * 5) - dt * depthEased * (10 + s.p * 26);
            s.x -= dt * (1 + s.p * 2) * 0.35;
            if (s.y < -6) { s.y = H + 6; s.x = Math.random() * W; }
            if (s.y > H + 6) { s.y = -6; s.x = Math.random() * W; }
            if (s.x < -6) { s.x = W + 6; }
        }

        for (i = motes.length - 1; i >= 0; i--) {
            var m = motes[i];
            m.v += m.acc * dt;
            m.y += m.v * dt;
            m.ph += dt * 1.4;
            m.x += Math.sin(m.ph) * m.sway * dt;
            if (m.y > H + 14) { motes[i] = newMote(false); }
        }

        for (i = 0; i < dust.length; i++) {
            var d = dust[i];
            d.x += d.vx * dt;
            d.y += d.vy * dt - depthEased * dt * 18;
            if (d.x < -d.r) { d.x = W + d.r; }
            if (d.x > W + d.r) { d.x = -d.r; }
            if (d.y < -d.r) { d.y = H + d.r; }
            if (d.y > H + d.r) { d.y = -d.r; }
        }

        meteorTimer -= dt;
        if (meteorTimer <= 0) {
            meteorTimer = rand(4.5, 12);
            if (meteors.length < 3) { spawnMeteor(); }
        }
        for (i = meteors.length - 1; i >= 0; i--) {
            var mt = meteors[i];
            mt.life += dt;
            mt.x += mt.vx * dt;
            mt.y += mt.vy * dt;
            if (mt.life > mt.max) { meteors.splice(i, 1); }
        }
    }

    function draw() {
        ctx.clearRect(0, 0, W, H);

        /* nebula puffs */
        ctx.globalCompositeOperation = 'lighter';
        for (var i = 0; i < dust.length; i++) {
            var d = dust[i];
            var g = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r);
            g.addColorStop(0, 'hsla(' + d.hue + ',90%,62%,' + d.a + ')');
            g.addColorStop(0.55, 'hsla(' + d.hue + ',90%,50%,' + (d.a * 0.35) + ')');
            g.addColorStop(1, 'hsla(' + d.hue + ',90%,45%,0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
            ctx.fill();
        }

        /* stars */
        for (i = 0; i < stars.length; i++) {
            var s = stars[i];
            var tw = 0.72 + 0.28 * Math.sin(s.ph);
            ctx.globalAlpha = s.a * tw;
            ctx.fillStyle = s.p === 2 ? '#dffaff' : '#a8e6ff';
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fill();
            if (s.p === 2) {
                ctx.globalAlpha = s.a * tw * 0.35;
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.r * 3.2, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        /* falling motes */
        for (i = 0; i < motes.length; i++) {
            var m = motes[i];
            ctx.globalAlpha = m.a;
            ctx.fillStyle = m.gold ? '#ffd591' : '#9ff0ff';
            ctx.beginPath();
            ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
            ctx.fill();
            /* short speed streak below fast motes */
            if (m.v > 42) {
                ctx.globalAlpha = m.a * 0.4;
                ctx.fillRect(m.x - m.r * 0.4, m.y - m.v * 0.06, m.r * 0.8, m.v * 0.06);
            }
        }

        /* meteors */
        for (i = 0; i < meteors.length; i++) {
            var mt = meteors[i];
            var fade = 1 - Math.abs(mt.life / mt.max - 0.5) * 2;
            var nx = mt.vx, ny = mt.vy;
            var mag = Math.sqrt(nx * nx + ny * ny) || 1;
            var tx = mt.x - (nx / mag) * mt.len;
            var ty = mt.y - (ny / mag) * mt.len;
            var mg = ctx.createLinearGradient(mt.x, mt.y, tx, ty);
            mg.addColorStop(0, 'rgba(255,255,255,' + (0.85 * fade) + ')');
            mg.addColorStop(0.35, 'rgba(150,240,255,' + (0.45 * fade) + ')');
            mg.addColorStop(1, 'rgba(120,220,255,0)');
            ctx.globalAlpha = 1;
            ctx.strokeStyle = mg;
            ctx.lineWidth = 2.2;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(mt.x, mt.y);
            ctx.lineTo(tx, ty);
            ctx.stroke();
        }

        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
    }

    function frame(ts) {
        if (!running) { return; }
        if (!last) { last = ts; }
        var dt = Math.min(0.05, (ts - last) / 1000);
        last = ts;
        step(dt);
        draw();
        raf = global.requestAnimationFrame(frame);
    }

    var Backdrop = {
        init: function () {
            canvas = document.getElementById('ambient-canvas');
            if (!canvas) { return; }
            ctx = canvas.getContext('2d');
            if (!ctx) { return; }
            resize();
            global.addEventListener('resize', resize);
            global.addEventListener('orientationchange', function () {
                setTimeout(resize, 220);
            });
            document.addEventListener('visibilitychange', function () {
                if (document.hidden) { Backdrop.pause(); }
                else if (enabled) { Backdrop.play(); }
            });
            this.play();
        },

        play: function () {
            if (!ctx || running || !enabled) { return; }
            running = true;
            last = 0;
            raf = global.requestAnimationFrame(frame);
        },

        pause: function () {
            running = false;
            if (raf) { global.cancelAnimationFrame(raf); raf = null; }
        },

        setEnabled: function (on) {
            enabled = !!on;
            if (enabled) {
                this.play();
            } else {
                this.pause();
                if (ctx) { ctx.clearRect(0, 0, W, H); }
            }
        },

        /* 0 = ground level, 1 = summit. Shifts sky + horizon parallax. */
        setDepth: function (v) {
            depth = Math.max(0, Math.min(1, v));
            var sky = document.getElementById('backdrop-sky');
            var hor = document.getElementById('backdrop-horizon');
            if (sky) { sky.style.transform = 'translate3d(0,' + (depth * 6) + '%,0) scale(' + (1 + depth * 0.06) + ')'; }
            if (hor) { hor.style.transform = 'translate3d(0,' + (depth * 30) + '%,0)'; }
        }
    };

    global.GQ_BACKDROP = Backdrop;
})(window);
