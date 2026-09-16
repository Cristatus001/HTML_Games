/* Element Hunt - foreground particle effects (score pops, strike sparks,
 * level-complete shower). Decorative only; canvas is pointer-events:none.
 */
(function (global) {
    'use strict';

    var canvas = null, ctx = null;
    var w = 0, h = 0, dpr = 1;
    var parts = [];
    var rings = [];
    var raf = null;
    var last = 0;
    var reduced = false;

    function resize() {
        if (!canvas) { return; }
        dpr = Math.min(global.devicePixelRatio || 1, 2);
        w = canvas.clientWidth;
        h = canvas.clientHeight;
        canvas.width = Math.max(1, Math.floor(w * dpr));
        canvas.height = Math.max(1, Math.floor(h * dpr));
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function ensureLoop() {
        if (raf === null) { last = 0; raf = global.requestAnimationFrame(frame); }
    }

    function frame(ts) {
        if (!last) { last = ts; }
        var dt = Math.min(0.05, (ts - last) / 1000);
        last = ts;

        ctx.clearRect(0, 0, w, h);
        ctx.globalCompositeOperation = 'lighter';

        var i, p;
        for (i = parts.length - 1; i >= 0; i--) {
            p = parts[i];
            p.life -= dt;
            if (p.life <= 0) { parts.splice(i, 1); continue; }
            p.vy += p.grav * dt;
            p.vx *= (1 - p.drag * dt);
            p.vy *= (1 - p.drag * dt);
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.rot += p.spin * dt;

            var k = Math.max(0, p.life / p.life0);
            ctx.globalAlpha = k;
            if (p.shape === 'shard') {
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rot);
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.size * 0.5, -p.size * 0.18, p.size, p.size * 0.36);
                ctx.restore();
            } else {
                var r = p.size * (0.4 + k * 0.6);
                var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
                g.addColorStop(0, '#ffffff');
                g.addColorStop(0.35, p.color);
                g.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        for (i = rings.length - 1; i >= 0; i--) {
            var ring = rings[i];
            ring.life -= dt;
            if (ring.life <= 0) { rings.splice(i, 1); continue; }
            var t = 1 - ring.life / ring.life0;
            var rr = ring.r0 + (ring.r1 - ring.r0) * t;
            ctx.globalAlpha = (1 - t) * 0.85;
            ctx.strokeStyle = ring.color;
            ctx.lineWidth = ring.width * (1 - t) + 0.6;
            ctx.beginPath();
            ctx.arc(ring.x, ring.y, rr, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';

        if (parts.length || rings.length) {
            raf = global.requestAnimationFrame(frame);
        } else {
            raf = null;
            ctx.clearRect(0, 0, w, h);
        }
    }

    function burst(x, y, opts) {
        if (!ctx || reduced) { return; }
        opts = opts || {};
        var n = opts.count || 18;
        var color = opts.color || '#17e380';
        var speed = opts.speed || 220;
        for (var i = 0; i < n; i++) {
            var a = opts.angle === undefined ? Math.random() * Math.PI * 2
                                             : opts.angle + (Math.random() - 0.5) * (opts.spread || 1.2);
            var s = speed * (0.35 + Math.random() * 0.9);
            var life = (opts.life || 0.75) * (0.6 + Math.random() * 0.7);
            parts.push({
                x: x, y: y,
                vx: Math.cos(a) * s, vy: Math.sin(a) * s,
                grav: opts.grav === undefined ? 260 : opts.grav,
                drag: opts.drag === undefined ? 1.6 : opts.drag,
                size: (opts.size || 7) * (0.5 + Math.random()),
                color: Array.isArray(color) ? color[Math.floor(Math.random() * color.length)] : color,
                life: life, life0: life,
                rot: Math.random() * 6.28, spin: (Math.random() - 0.5) * 12,
                shape: opts.shape || (Math.random() < 0.25 ? 'shard' : 'spark')
            });
        }
        ensureLoop();
    }

    function ring(x, y, opts) {
        if (!ctx || reduced) { return; }
        opts = opts || {};
        rings.push({
            x: x, y: y,
            r0: opts.r0 || 6, r1: opts.r1 || 90,
            width: opts.width || 6,
            color: opts.color || '#00e5ff',
            life: opts.life || 0.55, life0: opts.life || 0.55
        });
        ensureLoop();
    }

    /* Sparkles travelling along the struck symbol. */
    function trail(x1, y1, x2, y2, color) {
        if (!ctx || reduced) { return; }
        var steps = 10;
        for (var i = 0; i <= steps; i++) {
            var t = i / steps;
            burst(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, {
                count: 3, color: color, speed: 90, size: 5, life: 0.5, grav: 40, drag: 2.4
            });
        }
    }

    function shower(colors) {
        if (!ctx || reduced) { return; }
        for (var i = 0; i < 90; i++) {
            var life = 1.6 + Math.random() * 1.4;
            parts.push({
                x: Math.random() * w, y: -20 - Math.random() * h * 0.5,
                vx: (Math.random() - 0.5) * 60, vy: 90 + Math.random() * 180,
                grav: 30, drag: 0.2,
                size: 6 + Math.random() * 8,
                color: colors[Math.floor(Math.random() * colors.length)],
                life: life, life0: life,
                rot: Math.random() * 6.28, spin: (Math.random() - 0.5) * 10,
                shape: Math.random() < 0.6 ? 'shard' : 'spark'
            });
        }
        ensureLoop();
    }

    function init(el) {
        canvas = el;
        if (!canvas || !canvas.getContext) { return; }
        ctx = canvas.getContext('2d');
        var mq = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)');
        reduced = !!(mq && mq.matches);
        resize();
        var rt = null;
        global.addEventListener('resize', function () {
            clearTimeout(rt);
            rt = setTimeout(resize, 120);
        });
    }

    global.FX = { init: init, burst: burst, ring: ring, trail: trail, shower: shower };
})(window);
