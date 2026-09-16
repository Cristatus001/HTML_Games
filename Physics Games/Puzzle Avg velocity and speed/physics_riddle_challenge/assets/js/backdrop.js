/* ==========================================================================
   Physics Riddle Challenge - ambient backdrop
   A purely decorative canvas: a receding telemetry floor, parallax light
   trails, drifting vector arrows and dust. It never reads input and never
   touches gameplay state, so it cannot affect hitboxes or scoring.
   ========================================================================== */
(function (global) {
    'use strict';

    var cvs = null;
    var ctx = null;
    var W = 0, H = 0, DPR = 1;
    var raf = 0;
    var last = 0;
    var t = 0;
    var running = false;
    var reduced = false;

    var streaks = [];
    var arrows = [];
    var motes = [];

    var park = { x: 0, y: 0, tx: 0, ty: 0 };   /* parallax offset */

    function rand(a, b) { return a + Math.random() * (b - a); }

    function resize() {
        if (!cvs) { return; }
        var w = cvs.clientWidth;
        var h = cvs.clientHeight;
        if (w === W && h === H) { return; }   /* observer noise, nothing to do */
        DPR = Math.min(2, global.devicePixelRatio || 1);
        W = w;
        H = h;
        cvs.width = Math.max(1, Math.round(W * DPR));
        cvs.height = Math.max(1, Math.round(H * DPR));
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        seed();
    }

    function seed() {
        var area = Math.max(1, (W * H) / (1280 * 720));
        var nStreak = Math.round(26 * Math.min(2, Math.max(0.5, area)));
        var nArrow = Math.round(9 * Math.min(2, Math.max(0.5, area)));
        var nMote = Math.round(48 * Math.min(2, Math.max(0.5, area)));

        streaks.length = 0;
        for (var i = 0; i < nStreak; i++) { streaks.push(newStreak(true)); }

        arrows.length = 0;
        for (var j = 0; j < nArrow; j++) { arrows.push(newArrow(true)); }

        motes.length = 0;
        for (var k = 0; k < nMote; k++) {
            motes.push({
                x: rand(0, W), y: rand(0, H),
                r: rand(0.6, 2.2), a: rand(0.12, 0.5),
                vy: rand(-7, -2), vx: rand(-4, 4),
                ph: rand(0, Math.PI * 2), depth: rand(0.3, 1)
            });
        }
    }

    function newStreak(spread) {
        var depth = rand(0.15, 1);
        return {
            depth: depth,
            x: spread ? rand(-W * 0.2, W * 1.2) : -rand(120, 420),
            y: rand(0.06, 0.94) * H,
            len: rand(60, 260) * (0.45 + depth),
            v: (28 + depth * 190),
            a: 0.05 + depth * 0.22,
            hue: Math.random() < 0.34 ? 'amber' : 'cyan',
            w: 0.8 + depth * 2.4
        };
    }

    function newArrow(spread) {
        var depth = rand(0.25, 1);
        return {
            depth: depth,
            x: spread ? rand(0, W) : rand(-80, -20),
            y: rand(0.08, 0.92) * H,
            s: 14 + depth * 26,
            v: 8 + depth * 26,
            rot: rand(-0.5, 0.5),
            spin: rand(-0.09, 0.09),
            a: 0.06 + depth * 0.12,
            hue: Math.random() < 0.5 ? 'amber' : 'cyan'
        };
    }

    var TONE = {
        amber: [255, 176, 32],
        cyan: [56, 224, 255]
    };
    function rgba(hue, a) {
        var c = TONE[hue] || TONE.cyan;
        return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
    }

    /* ------------------------------------------------------------- layers */

    function drawFloor() {
        var horizon = H * 0.60;
        var vpx = W * 0.5 + park.x * 0.5;

        var g = ctx.createLinearGradient(0, horizon, 0, H);
        g.addColorStop(0, 'rgba(56,224,255,0.09)');
        g.addColorStop(1, 'rgba(56,224,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, horizon, W, H - horizon);

        ctx.save();
        ctx.beginPath();
        ctx.rect(0, horizon, W, H - horizon);
        ctx.clip();
        ctx.lineWidth = 1;

        /* radial lanes */
        for (var i = -14; i <= 14; i++) {
            var sx = vpx + i * (W / 8);
            ctx.strokeStyle = 'rgba(56,224,255,' + (i % 4 === 0 ? 0.11 : 0.05) + ')';
            ctx.beginPath();
            ctx.moveTo(vpx, horizon);
            ctx.lineTo(sx, H + 40);
            ctx.stroke();
        }

        /* horizontal rungs marching toward the viewer */
        var scroll = (t * 0.09) % 1;
        for (var k = 0; k < 16; k++) {
            var p = (k + scroll) / 16;
            var yy = horizon + Math.pow(p, 2.6) * (H - horizon + 60);
            if (yy > H + 4) { continue; }
            var fade = Math.pow(p, 0.8) * 0.16;
            ctx.strokeStyle = 'rgba(120,225,255,' + fade.toFixed(3) + ')';
            ctx.beginPath();
            ctx.moveTo(0, yy);
            ctx.lineTo(W, yy);
            ctx.stroke();
        }
        ctx.restore();

        /* horizon bloom */
        var hg = ctx.createLinearGradient(0, horizon - 60, 0, horizon + 24);
        hg.addColorStop(0, 'rgba(255,176,32,0)');
        hg.addColorStop(0.7, 'rgba(255,176,32,0.10)');
        hg.addColorStop(1, 'rgba(255,176,32,0)');
        ctx.fillStyle = hg;
        ctx.fillRect(0, horizon - 60, W, 84);
    }

    function drawStreaks(dt) {
        ctx.lineCap = 'round';
        for (var i = 0; i < streaks.length; i++) {
            var s = streaks[i];
            if (!reduced) { s.x += s.v * dt; }
            if (s.x - s.len > W + 60) {
                streaks[i] = newStreak(false);
                continue;
            }
            var px = s.x + park.x * s.depth * 0.6;
            var py = s.y + park.y * s.depth * 0.6;
            var g = ctx.createLinearGradient(px - s.len, py, px, py);
            g.addColorStop(0, rgba(s.hue, 0));
            g.addColorStop(0.75, rgba(s.hue, s.a * 0.7));
            g.addColorStop(1, rgba(s.hue, s.a));
            ctx.strokeStyle = g;
            ctx.lineWidth = s.w;
            ctx.beginPath();
            ctx.moveTo(px - s.len, py);
            ctx.lineTo(px, py);
            ctx.stroke();
        }
    }

    function drawArrow(a) {
        var px = a.x + park.x * a.depth;
        var py = a.y + park.y * a.depth;
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(a.rot);
        var s = a.s;
        ctx.strokeStyle = rgba(a.hue, a.a);
        ctx.fillStyle = rgba(a.hue, a.a * 0.9);
        ctx.lineWidth = Math.max(1, s * 0.11);
        ctx.beginPath();
        ctx.moveTo(-s * 0.7, 0);
        ctx.lineTo(s * 0.32, 0);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(s * 0.72, 0);
        ctx.lineTo(s * 0.22, -s * 0.3);
        ctx.lineTo(s * 0.22, s * 0.3);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.arc(-s * 0.7, 0, Math.max(1.2, s * 0.09), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    function drawArrows(dt) {
        for (var i = 0; i < arrows.length; i++) {
            var a = arrows[i];
            if (!reduced) {
                a.x += a.v * dt;
                a.rot += a.spin * dt;
            }
            if (a.x > W + 90) { arrows[i] = newArrow(false); continue; }
            drawArrow(a);
        }
    }

    function drawMotes(dt) {
        for (var i = 0; i < motes.length; i++) {
            var m = motes[i];
            if (!reduced) {
                m.y += m.vy * dt;
                m.x += m.vx * dt + Math.sin(t * 0.6 + m.ph) * 6 * dt;
                if (m.y < -10) { m.y = H + 10; m.x = rand(0, W); }
                if (m.x < -10) { m.x = W + 10; }
                if (m.x > W + 10) { m.x = -10; }
            }
            var tw = 0.65 + 0.35 * Math.sin(t * 1.6 + m.ph);
            ctx.fillStyle = 'rgba(210,240,255,' + (m.a * tw).toFixed(3) + ')';
            ctx.beginPath();
            ctx.arc(m.x + park.x * m.depth * 0.4, m.y + park.y * m.depth * 0.4, m.r, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    /* --------------------------------------------------------------- loop */

    function frame(ts) {
        raf = global.requestAnimationFrame(frame);
        if (!last) { last = ts; }
        var dt = Math.min(0.05, (ts - last) / 1000);
        last = ts;
        t += dt;

        park.x += (park.tx - park.x) * Math.min(1, dt * 3);
        park.y += (park.ty - park.y) * Math.min(1, dt * 3);

        ctx.clearRect(0, 0, W, H);
        drawFloor();
        drawStreaks(dt);
        drawArrows(dt);
        drawMotes(dt);

        if (reduced) {
            global.cancelAnimationFrame(raf);
            raf = 0;
            running = false;
        }
    }

    function start() {
        if (running || !ctx) { return; }
        running = true;
        last = 0;
        raf = global.requestAnimationFrame(frame);
    }

    function stop() {
        if (raf) { global.cancelAnimationFrame(raf); raf = 0; }
        running = false;
    }

    var Backdrop = {
        init: function (canvas) {
            cvs = canvas;
            if (!cvs || !cvs.getContext) { return; }
            ctx = cvs.getContext('2d');
            if (!ctx) { return; }

            var mq = global.matchMedia ? global.matchMedia('(prefers-reduced-motion: reduce)') : null;
            reduced = !!(mq && mq.matches);
            if (mq && mq.addEventListener) {
                mq.addEventListener('change', function (e) {
                    reduced = e.matches;
                    if (!reduced) { start(); } else { start(); }
                });
            }

            resize();
            /* A WebView can lay the page out after load without firing
               `resize`, so observe the element itself and re-measure. */
            if (global.ResizeObserver) {
                var ro = new global.ResizeObserver(function () { resize(); });
                ro.observe(cvs);
            } else {
                [80, 400, 1200].forEach(function (d) { setTimeout(resize, d); });
            }
            global.addEventListener('resize', resize, { passive: true });
            global.addEventListener('orientationchange', function () {
                setTimeout(resize, 220);
            }, { passive: true });

            document.addEventListener('visibilitychange', function () {
                if (document.hidden) { stop(); } else { start(); }
            });

            /* pointer parallax — passive, decorative only */
            global.addEventListener('pointermove', function (e) {
                var nx = (e.clientX / Math.max(1, global.innerWidth)) - 0.5;
                var ny = (e.clientY / Math.max(1, global.innerHeight)) - 0.5;
                park.tx = -nx * 34;
                park.ty = -ny * 22;
            }, { passive: true });

            start();
        },
        start: start,
        stop: stop
    };

    global.PRC_BACKDROP = Backdrop;
})(window);
