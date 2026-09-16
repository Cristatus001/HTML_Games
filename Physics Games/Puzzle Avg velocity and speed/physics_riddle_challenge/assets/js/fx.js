/* ==========================================================================
   Physics Riddle Challenge - feedback effects
   A single overlay canvas for sparks, shockwaves and finale shards, plus a
   couple of DOM helpers. Purely cosmetic: the loop idles at zero cost when
   nothing is on screen and never blocks input (pointer-events: none).
   ========================================================================== */
(function (global) {
    'use strict';

    var cvs = null, ctx = null;
    var W = 0, H = 0, DPR = 1;
    var raf = 0, last = 0;
    var parts = [];
    var rings = [];
    var reduced = false;

    function rand(a, b) { return a + Math.random() * (b - a); }

    function resize() {
        if (!cvs) { return; }
        var w = cvs.clientWidth;
        var h = cvs.clientHeight;
        if (w === W && h === H) { return; }   /* resizing clears the buffer */
        DPR = Math.min(2, global.devicePixelRatio || 1);
        W = w;
        H = h;
        cvs.width = Math.max(1, Math.round(W * DPR));
        cvs.height = Math.max(1, Math.round(H * DPR));
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }

    var PALETTES = {
        gold:  ['#fff3d0', '#ffb020', '#ff8a1f', '#ffd979'],
        cyan:  ['#e2fbff', '#38e0ff', '#12a7cc', '#9defff'],
        green: ['#e0fff2', '#3ce6a0', '#12a06c', '#a9ffdc'],
        red:   ['#ffe1e8', '#ff4d6d', '#c31840', '#ffa8b8'],
        mixed: ['#fff3d0', '#ffb020', '#38e0ff', '#3ce6a0', '#a678ff']
    };

    function pick(pal) {
        var list = PALETTES[pal] || PALETTES.gold;
        return list[(Math.random() * list.length) | 0];
    }

    function ensureLoop() {
        if (raf || !ctx) { return; }
        last = 0;
        raf = global.requestAnimationFrame(frame);
    }

    function frame(ts) {
        if (!last) { last = ts; }
        var dt = Math.min(0.05, (ts - last) / 1000);
        last = ts;

        ctx.clearRect(0, 0, W, H);

        /* shockwave rings */
        for (var r = rings.length - 1; r >= 0; r--) {
            var g = rings[r];
            g.t += dt;
            var p = g.t / g.life;
            if (p >= 1) { rings.splice(r, 1); continue; }
            var rad = g.r0 + (g.r1 - g.r0) * (1 - Math.pow(1 - p, 3));
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.strokeStyle = g.color;
            ctx.globalAlpha = (1 - p) * g.alpha;
            ctx.lineWidth = g.w * (1 - p * 0.7);
            ctx.beginPath();
            ctx.arc(g.x, g.y, rad, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        /* particles */
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (var i = parts.length - 1; i >= 0; i--) {
            var q = parts[i];
            q.t += dt;
            if (q.t >= q.life) { parts.splice(i, 1); continue; }

            q.vy += q.grav * dt;
            q.vx *= (1 - q.drag * dt);
            q.vy *= (1 - q.drag * dt);
            q.x += q.vx * dt;
            q.y += q.vy * dt;
            q.rot += q.spin * dt;

            var a = 1 - q.t / q.life;
            ctx.globalAlpha = a * q.alpha;

            if (q.kind === 'spark') {
                var sp = Math.hypot(q.vx, q.vy);
                var ang = Math.atan2(q.vy, q.vx);
                var len = Math.min(26, 3 + sp * 0.045);
                ctx.strokeStyle = q.color;
                ctx.lineWidth = q.size * a;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(q.x, q.y);
                ctx.lineTo(q.x - Math.cos(ang) * len, q.y - Math.sin(ang) * len);
                ctx.stroke();
            } else if (q.kind === 'shard') {
                ctx.save();
                ctx.translate(q.x, q.y);
                ctx.rotate(q.rot);
                ctx.fillStyle = q.color;
                ctx.fillRect(-q.size * 0.5, -q.size * 0.22, q.size, q.size * 0.44);
                ctx.restore();
            } else {
                ctx.fillStyle = q.color;
                ctx.beginPath();
                ctx.arc(q.x, q.y, q.size * a, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.restore();

        if (parts.length || rings.length) {
            raf = global.requestAnimationFrame(frame);
        } else {
            ctx.clearRect(0, 0, W, H);
            raf = 0;
        }
    }

    function addParticle(p) {
        if (parts.length > 900) { return; }
        parts.push(p);
    }

    var FX = {
        init: function (canvas) {
            cvs = canvas;
            if (!cvs || !cvs.getContext) { return; }
            ctx = cvs.getContext('2d');
            if (!ctx) { return; }
            var mq = global.matchMedia ? global.matchMedia('(prefers-reduced-motion: reduce)') : null;
            reduced = !!(mq && mq.matches);
            resize();
            /* same late-layout guard as the backdrop: a stale canvas size
               would put every spark in the wrong place */
            if (global.ResizeObserver) {
                var ro = new global.ResizeObserver(function () { resize(); });
                ro.observe(cvs);
            } else {
                [80, 400, 1200].forEach(function (d) { setTimeout(resize, d); });
            }
            global.addEventListener('resize', resize, { passive: true });
            global.addEventListener('orientationchange', function () { setTimeout(resize, 220); }, { passive: true });
        },

        /* radial spark burst */
        burst: function (x, y, opts) {
            if (!ctx) { return; }
            opts = opts || {};
            var n = Math.round((opts.count || 34) * (reduced ? 0.35 : 1));
            var pal = opts.palette || 'gold';
            var power = opts.power || 300;
            for (var i = 0; i < n; i++) {
                var a = rand(0, Math.PI * 2);
                var v = rand(power * 0.35, power);
                addParticle({
                    kind: Math.random() < 0.72 ? 'spark' : 'dot',
                    x: x, y: y,
                    vx: Math.cos(a) * v,
                    vy: Math.sin(a) * v,
                    grav: opts.grav != null ? opts.grav : 340,
                    drag: 1.5,
                    size: rand(1.6, 4.2),
                    color: pick(pal),
                    alpha: rand(0.7, 1),
                    rot: 0, spin: 0,
                    t: 0, life: rand(0.55, 1.15)
                });
            }
            ensureLoop();
        },

        /* upward shard fountain used for the finale */
        shower: function (x, y, opts) {
            if (!ctx) { return; }
            opts = opts || {};
            var n = Math.round((opts.count || 70) * (reduced ? 0.3 : 1));
            var pal = opts.palette || 'mixed';
            for (var i = 0; i < n; i++) {
                var a = -Math.PI / 2 + rand(-0.85, 0.85);
                var v = rand(320, 720);
                addParticle({
                    kind: Math.random() < 0.55 ? 'shard' : 'spark',
                    x: x + rand(-30, 30), y: y,
                    vx: Math.cos(a) * v,
                    vy: Math.sin(a) * v,
                    grav: 700,
                    drag: 0.45,
                    size: rand(5, 12),
                    color: pick(pal),
                    alpha: rand(0.75, 1),
                    rot: rand(0, Math.PI * 2),
                    spin: rand(-9, 9),
                    t: 0, life: rand(1.1, 2.0)
                });
            }
            ensureLoop();
        },

        ring: function (x, y, opts) {
            if (!ctx) { return; }
            opts = opts || {};
            rings.push({
                x: x, y: y,
                r0: opts.r0 || 8,
                r1: opts.r1 || 190,
                w: opts.w || 5,
                color: opts.color || '#ffb020',
                alpha: opts.alpha != null ? opts.alpha : 0.8,
                t: 0,
                life: opts.life || 0.75
            });
            ensureLoop();
        },

        /* convenience: fire at the centre of a DOM element */
        atElement: function (el, opts) {
            if (!el || !el.getBoundingClientRect) { return; }
            var r = el.getBoundingClientRect();
            var x = r.left + r.width / 2;
            var y = r.top + r.height / 2;
            opts = opts || {};
            this.ring(x, y, { color: opts.ringColor || '#3ce6a0', r1: Math.max(r.width, 220), life: 0.7 });
            this.burst(x, y, opts);
        },

        /* edge-to-edge celebration */
        celebrate: function () {
            var y = H * 0.92;
            this.shower(W * 0.5, y, { count: 90 });
            var self = this;
            [0.18, 0.82].forEach(function (fx, i) {
                setTimeout(function () { self.shower(W * fx, y, { count: 55 }); }, 220 + i * 180);
            });
            setTimeout(function () {
                self.ring(W * 0.5, H * 0.42, { color: '#ffb020', r1: Math.max(W, H) * 0.6, life: 1.1, w: 7 });
            }, 120);
        },

        /* short DOM shake used for wrong answers */
        shake: function (el, cls) {
            if (!el) { return; }
            var name = cls || 'is-shaking';
            el.classList.remove(name);
            /* force reflow so the animation restarts every time */
            void el.offsetWidth;
            el.classList.add(name);
            setTimeout(function () { el.classList.remove(name); }, 620);
        }
    };

    global.PRC_FX = FX;
})(window);
