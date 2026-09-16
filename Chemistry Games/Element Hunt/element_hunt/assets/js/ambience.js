/* Element Hunt - ambient background motion.
 * Purely decorative: the canvas is pointer-events:none and never touches
 * gameplay state, hitboxes or the grid.
 */
(function (global) {
    'use strict';

    var canvas = null, ctx = null;
    var w = 0, h = 0, dpr = 1;
    var items = [];
    var raf = null;
    var last = 0;
    var reduced = false;
    var parallax = { x: 0, y: 0, tx: 0, ty: 0 };

    var SYMBOLS = ['H', 'He', 'C', 'N', 'O', 'Na', 'Mg', 'Al', 'Si', 'Cl', 'K', 'Ca',
                   'Fe', 'Cu', 'I', 'Li', 'Be', 'F', 'Ne', 'P', 'S', 'Ti', 'Zn',
                   'Br', 'Ag', 'Sn', 'Au', 'Hg', 'Pb', 'U'];
    var TINTS = ['#00e5ff', '#7fd4ff', '#b082ff', '#ffd257', '#17e380'];

    function rand(a, b) { return a + Math.random() * (b - a); }
    function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

    function resize() {
        if (!canvas) { return; }
        dpr = Math.min(global.devicePixelRatio || 1, 2);
        w = canvas.clientWidth;
        h = canvas.clientHeight;
        canvas.width = Math.max(1, Math.floor(w * dpr));
        canvas.height = Math.max(1, Math.floor(h * dpr));
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function makeItem(kind, seeded) {
        var depth = rand(0.25, 1);
        return {
            kind: kind,
            x: rand(-40, w + 40),
            y: seeded ? rand(-40, h + 40) : h + rand(20, 200),
            depth: depth,
            r: kind === 'tile' ? rand(16, 34) * depth + 8 : rand(6, 26) * depth + 4,
            vy: -rand(6, 20) * depth,
            vx: rand(-6, 6) * depth,
            spin: rand(-0.5, 0.5),
            a: rand(0, Math.PI * 2),
            tint: pick(TINTS),
            alpha: rand(0.12, 0.5) * (0.4 + depth * 0.6),
            sym: pick(SYMBOLS),
            pulse: rand(0.4, 1.4)
        };
    }

    function build() {
        items = [];
        var area = Math.max(1, w * h);
        var n = Math.round(Math.min(58, Math.max(16, area / 26000)));
        for (var i = 0; i < n; i++) {
            var kind = i % 5 === 0 ? 'tile' : (i % 3 === 0 ? 'atom' : 'mote');
            items.push(makeItem(kind, true));
        }
    }

    function drawMote(it, t) {
        var pulse = 0.7 + 0.3 * Math.sin(t * it.pulse + it.a);
        var r = it.r * pulse;
        var g = ctx.createRadialGradient(it.x, it.y, 0, it.x, it.y, r);
        g.addColorStop(0, it.tint);
        g.addColorStop(0.35, it.tint);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.globalAlpha = it.alpha * 0.75;
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(it.x, it.y, r, 0, Math.PI * 2);
        ctx.fill();
    }

    function drawAtom(it, t) {
        var r = it.r;
        ctx.save();
        ctx.translate(it.x, it.y);
        ctx.rotate(it.a + t * it.spin * 0.4);
        ctx.globalAlpha = it.alpha * 0.9;
        ctx.strokeStyle = it.tint;
        ctx.lineWidth = Math.max(0.8, r * 0.07);
        for (var k = 0; k < 2; k++) {
            ctx.save();
            ctx.rotate(k * Math.PI / 3);
            ctx.beginPath();
            ctx.ellipse(0, 0, r, r * 0.42, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
        var g = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.5);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(0.4, it.tint);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    function drawTile(it, t) {
        var s = it.r * 1.9;
        ctx.save();
        ctx.translate(it.x, it.y);
        ctx.rotate(Math.sin(t * 0.25 + it.a) * 0.12);
        ctx.globalAlpha = it.alpha * 0.55;
        var g = ctx.createLinearGradient(-s / 2, -s / 2, s / 2, s / 2);
        g.addColorStop(0, 'rgba(255,255,255,0.10)');
        g.addColorStop(1, 'rgba(255,255,255,0.02)');
        ctx.fillStyle = g;
        ctx.strokeStyle = it.tint;
        ctx.lineWidth = 1.1;
        var rr = s * 0.18;
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(-s / 2, -s / 2, s, s, rr);
        } else {
            ctx.rect(-s / 2, -s / 2, s, s);
        }
        ctx.fill();
        ctx.stroke();
        ctx.globalAlpha = it.alpha * 0.9;
        ctx.fillStyle = it.tint;
        ctx.font = '600 ' + Math.round(s * 0.4) + 'px "IBM Plex Mono", ui-monospace, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(it.sym, 0, 1);
        ctx.restore();
    }

    function frame(ts) {
        raf = global.requestAnimationFrame(frame);
        if (!last) { last = ts; }
        var dt = Math.min(0.05, (ts - last) / 1000);
        last = ts;
        var t = ts / 1000;

        parallax.x += (parallax.tx - parallax.x) * 0.05;
        parallax.y += (parallax.ty - parallax.y) * 0.05;

        ctx.clearRect(0, 0, w, h);
        ctx.globalCompositeOperation = 'lighter';

        for (var i = 0; i < items.length; i++) {
            var it = items[i];
            if (!reduced) {
                it.y += it.vy * dt;
                it.x += it.vx * dt + Math.sin(t * 0.3 + it.a) * 4 * dt;
                it.a += it.spin * dt;
            }
            if (it.y < -80 || it.x < -120 || it.x > w + 120) {
                items[i] = makeItem(it.kind, false);
                continue;
            }
            var px = it.x, py = it.y;
            it.x = px + parallax.x * it.depth * 18;
            it.y = py + parallax.y * it.depth * 18;
            if (it.kind === 'atom') { drawAtom(it, t); }
            else if (it.kind === 'tile') { drawTile(it, t); }
            else { drawMote(it, t); }
            it.x = px;
            it.y = py;
        }
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
    }

    function start() {
        if (raf === null) { last = 0; raf = global.requestAnimationFrame(frame); }
    }
    function stop() {
        if (raf !== null) { global.cancelAnimationFrame(raf); raf = null; }
    }

    function init(el) {
        canvas = el;
        if (!canvas || !canvas.getContext) { return; }
        ctx = canvas.getContext('2d');
        var mq = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)');
        reduced = !!(mq && mq.matches);
        resize();
        build();
        start();

        var rt = null;
        global.addEventListener('resize', function () {
            clearTimeout(rt);
            rt = setTimeout(function () { resize(); build(); }, 150);
        });
        document.addEventListener('visibilitychange', function () {
            if (document.hidden) { stop(); } else { start(); }
        });
        // Subtle parallax follow (works for mouse and touch alike).
        global.addEventListener('pointermove', function (e) {
            parallax.tx = (e.clientX / Math.max(1, global.innerWidth) - 0.5) * 2;
            parallax.ty = (e.clientY / Math.max(1, global.innerHeight) - 0.5) * 2;
        }, { passive: true });
    }

    global.Ambience = { init: init, start: start, stop: stop };
})(window);
