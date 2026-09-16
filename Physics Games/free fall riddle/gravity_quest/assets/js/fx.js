/* ==========================================================================
   Gravity Quest - foreground juice
   Particle bursts, shard streams and floating score pops. Overlay canvas,
   pointer-events:none, no interaction with gameplay logic.
   ========================================================================== */
(function (global) {
    'use strict';

    var canvas, ctx;
    var W = 0, H = 0, DPR = 1;
    var parts = [];
    var pops = [];
    var running = false;
    var raf = null;
    var last = 0;
    var enabled = true;

    function rand(a, b) { return a + Math.random() * (b - a); }

    function resize() {
        if (!canvas) { return; }
        DPR = Math.min(global.devicePixelRatio || 1, 2);
        W = global.innerWidth;
        H = global.innerHeight;
        canvas.width = Math.max(1, Math.floor(W * DPR));
        canvas.height = Math.max(1, Math.floor(H * DPR));
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }

    function ensureLoop() {
        if (running || !ctx) { return; }
        running = true;
        last = 0;
        raf = global.requestAnimationFrame(frame);
    }

    function frame(ts) {
        if (!last) { last = ts; }
        var dt = Math.min(0.05, (ts - last) / 1000);
        last = ts;

        ctx.clearRect(0, 0, W, H);

        var i, p;
        for (i = parts.length - 1; i >= 0; i--) {
            p = parts[i];
            p.life += dt;
            if (p.life >= p.max) { parts.splice(i, 1); continue; }

            p.vy += p.g * dt;
            p.vx *= (1 - p.drag * dt);
            p.vy *= (1 - p.drag * dt);
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.rot += p.spin * dt;

            var t = p.life / p.max;
            var alpha = p.fadeIn && t < 0.1 ? t / 0.1 : (1 - t) * (1 - t);
            var size = p.r * (p.shrink ? (1 - t * 0.65) : 1);

            ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
            ctx.globalCompositeOperation = 'lighter';

            if (p.shape === 'spark') {
                var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size * 3);
                g.addColorStop(0, p.color);
                g.addColorStop(0.4, p.color2 || p.color);
                g.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.arc(p.x, p.y, size * 3, 0, Math.PI * 2);
                ctx.fill();
            } else if (p.shape === 'shard') {
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rot);
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.moveTo(0, -size * 2);
                ctx.lineTo(size * 0.7, 0);
                ctx.lineTo(0, size * 2);
                ctx.lineTo(-size * 0.7, 0);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            } else { /* streak */
                ctx.strokeStyle = p.color;
                ctx.lineWidth = size;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p.x - p.vx * 0.035, p.y - p.vy * 0.035);
                ctx.stroke();
            }
        }

        ctx.globalCompositeOperation = 'source-over';

        for (i = pops.length - 1; i >= 0; i--) {
            var q = pops[i];
            q.life += dt;
            if (q.life >= q.max) { pops.splice(i, 1); continue; }
            var qt = q.life / q.max;
            q.y -= dt * 70;
            ctx.globalAlpha = qt < 0.12 ? qt / 0.12 : 1 - Math.pow(qt, 3);
            ctx.font = '700 ' + q.size + 'px Rajdhani, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = q.glow;
            ctx.shadowBlur = 18;
            ctx.fillStyle = q.color;
            ctx.fillText(q.text, q.x, q.y);
            ctx.shadowBlur = 0;
        }

        ctx.globalAlpha = 1;

        if (parts.length === 0 && pops.length === 0) {
            running = false;
            raf = null;
            return;
        }
        raf = global.requestAnimationFrame(frame);
    }

    function centerOf(el) {
        if (!el || !el.getBoundingClientRect) { return { x: W / 2, y: H / 2 }; }
        var r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }

    var FX = {
        init: function () {
            canvas = document.getElementById('fx-canvas');
            if (!canvas) { return; }
            ctx = canvas.getContext('2d');
            if (!ctx) { return; }
            resize();
            global.addEventListener('resize', resize);
            global.addEventListener('orientationchange', function () { setTimeout(resize, 220); });
        },

        setEnabled: function (on) {
            enabled = !!on;
            if (!enabled) {
                parts.length = 0;
                pops.length = 0;
                if (ctx) { ctx.clearRect(0, 0, W, H); }
            }
        },

        /* celebratory ring burst */
        burst: function (el, opts) {
            if (!ctx || !enabled) { return; }
            opts = opts || {};
            var c = centerOf(el);
            var n = opts.count || 42;
            var colors = opts.colors || ['rgba(140,255,205,1)', 'rgba(0,246,255,1)', 'rgba(255,255,255,1)'];
            for (var i = 0; i < n; i++) {
                var ang = (i / n) * Math.PI * 2 + rand(-0.14, 0.14);
                var spd = rand(opts.minSpeed || 130, opts.maxSpeed || 420);
                parts.push({
                    x: c.x, y: c.y,
                    vx: Math.cos(ang) * spd,
                    vy: Math.sin(ang) * spd,
                    g: opts.gravity != null ? opts.gravity : 420,
                    drag: 1.2,
                    r: rand(1.6, 3.6),
                    rot: Math.random() * Math.PI,
                    spin: rand(-9, 9),
                    color: colors[i % colors.length],
                    color2: 'rgba(0,180,220,.5)',
                    shape: i % 3 === 0 ? 'shard' : 'spark',
                    shrink: true,
                    life: 0,
                    max: rand(0.6, 1.25)
                });
            }
            ensureLoop();
        },

        /* small negative puff */
        puff: function (el) {
            if (!ctx || !enabled) { return; }
            var c = centerOf(el);
            for (var i = 0; i < 14; i++) {
                var ang = rand(0, Math.PI * 2);
                var spd = rand(50, 170);
                parts.push({
                    x: c.x, y: c.y,
                    vx: Math.cos(ang) * spd,
                    vy: Math.sin(ang) * spd,
                    g: 320, drag: 2.4,
                    r: rand(1.2, 2.6),
                    rot: 0, spin: 0,
                    color: 'rgba(255,110,135,1)',
                    color2: 'rgba(180,20,50,.5)',
                    shape: 'spark',
                    shrink: true,
                    life: 0, max: rand(0.3, 0.55)
                });
            }
            ensureLoop();
        },

        /* shard stream flying from an element toward the HUD counter */
        collect: function (fromEl, toEl, count) {
            if (!ctx || !enabled) { return; }
            var a = centerOf(fromEl);
            var b = centerOf(toEl);
            var n = count || 16;
            for (var i = 0; i < n; i++) {
                var ang = Math.atan2(b.y - a.y, b.x - a.x) + rand(-0.7, 0.7);
                var spd = rand(220, 520);
                parts.push({
                    x: a.x + rand(-16, 16), y: a.y + rand(-16, 16),
                    vx: Math.cos(ang) * spd,
                    vy: Math.sin(ang) * spd - rand(40, 180),
                    g: 260, drag: 0.55,
                    r: rand(1.8, 3.4),
                    rot: Math.random() * Math.PI, spin: rand(-12, 12),
                    color: 'rgba(255,214,130,1)',
                    color2: 'rgba(255,150,40,.55)',
                    shape: i % 2 ? 'shard' : 'spark',
                    shrink: false,
                    life: 0, max: rand(0.55, 0.95)
                });
            }
            ensureLoop();
        },

        /* rising number, e.g. "+100" */
        pop: function (el, text, kind) {
            if (!ctx || !enabled) { return; }
            var c = centerOf(el);
            pops.push({
                x: c.x, y: c.y - 10,
                text: text,
                size: Math.round(Math.min(46, Math.max(26, W / 18))),
                color: kind === 'bad' ? '#ff9fb0' : (kind === 'gold' ? '#ffd98a' : '#a9f6ff'),
                glow: kind === 'bad' ? 'rgba(255,70,100,.9)' : (kind === 'gold' ? 'rgba(255,190,80,.9)' : 'rgba(0,220,255,.9)'),
                life: 0, max: 1.15
            });
            ensureLoop();
        },

        /* thin upward trail, used when a node unlocks */
        rise: function (el) {
            if (!ctx || !enabled) { return; }
            var c = centerOf(el);
            for (var i = 0; i < 22; i++) {
                parts.push({
                    x: c.x + rand(-26, 26), y: c.y + rand(-6, 18),
                    vx: rand(-24, 24),
                    vy: rand(-260, -90),
                    g: 60, drag: 0.6,
                    r: rand(1.2, 2.8),
                    rot: 0, spin: 0,
                    color: 'rgba(150,250,255,1)',
                    color2: 'rgba(0,180,230,.5)',
                    shape: 'streak',
                    shrink: true, fadeIn: true,
                    life: 0, max: rand(0.7, 1.3)
                });
            }
            ensureLoop();
        }
    };

    global.GQ_FX = FX;
})(window);
