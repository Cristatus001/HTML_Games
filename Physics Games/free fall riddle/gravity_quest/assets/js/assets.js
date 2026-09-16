/* ==========================================================================
   Gravity Quest - optional image asset layer
   Every slot below is OPTIONAL. If the file exists it is applied on top of
   the CSS/vector art; if it is missing, nothing happens and the built-in
   vector art stays exactly as it is. Drop art in later, no code changes.
   See assets/images/README.md for filenames, sizes and orientation.
   ========================================================================== */
(function (global) {
    'use strict';

    var BASE = 'assets/images/';

    /* key -> { path, mode, target }
       mode 'bg'   : applied as a CSS background-image on the target element(s)
       mode 'var'  : applied as a CSS custom property on <html> + a marker class
    */
    var MANIFEST = {
        'bg.sky':        { path: 'background/sky.png',           mode: 'var', varName: '--bg-art', flag: 'backdrop--art', flagOn: '#backdrop' },
        'bg.nebulaFar':  { path: 'background/nebula_far.png',    mode: 'none' },
        'bg.nebulaNear': { path: 'background/nebula_near.png',   mode: 'none' },
        'bg.starfield':  { path: 'background/starfield.png',     mode: 'none' },

        'char.skydiver': { path: 'characters/skydiver.png',      mode: 'bg', target: '[data-asset="char.skydiver"]', hideKids: true },
        'char.observer': { path: 'characters/observer.png',      mode: 'bg', target: '[data-asset="char.observer"]' },

        'sim.tower':      { path: 'simulations/tower.png',       mode: 'bg', target: '[data-asset="sim.tower"]' },
        'sim.ironBall':   { path: 'simulations/iron_ball.png',   mode: 'bg', target: '[data-asset="sim.ironBall"]' },
        'sim.woodBall':   { path: 'simulations/wooden_ball.png', mode: 'bg', target: '[data-asset="sim.woodBall"]' },
        'sim.elevator':   { path: 'simulations/elevator.png',    mode: 'bg', target: '[data-asset="sim.elevator"]' },
        'sim.cannon':     { path: 'simulations/cannon.png',      mode: 'bg', target: '[data-asset="sim.cannon"]' },
        'sim.projectile': { path: 'simulations/projectile.png',  mode: 'bg', target: '[data-asset="sim.projectile"]' },

        'ui.panel':      { path: 'ui/panel_frame.png',           mode: 'none' },
        'ui.nodeRing':   { path: 'ui/node_ring.png',             mode: 'none' }
    };

    var loaded = {};   /* key -> HTMLImageElement */

    function probe(key, def) {
        return new Promise(function (resolve) {
            var img = new Image();
            var done = false;
            function finish(ok) {
                if (done) { return; }
                done = true;
                resolve(ok ? img : null);
            }
            img.onload = function () { finish(img.naturalWidth > 0); };
            img.onerror = function () { finish(false); };
            /* never let a hung request stall the boot sequence */
            setTimeout(function () { finish(false); }, 2500);
            img.src = BASE + def.path;
        });
    }

    function apply(key, def, img) {
        var url = 'url("' + BASE + def.path + '")';

        if (def.mode === 'var') {
            document.documentElement.style.setProperty(def.varName, url);
            if (def.flagOn) {
                var host = document.querySelector(def.flagOn);
                if (host) { host.classList.add(def.flag); }
            }
            return;
        }
        if (def.mode === 'bg' && def.target) {
            var nodes = document.querySelectorAll(def.target);
            for (var i = 0; i < nodes.length; i++) {
                nodes[i].style.backgroundImage = url;
                nodes[i].classList.add('has-art');
                if (def.hideKids) {
                    /* hide the vector stand-in, keep the element's box intact */
                    var kids = nodes[i].children;
                    for (var k = 0; k < kids.length; k++) {
                        if (!kids[k].classList.contains('parachute')) {
                            kids[k].style.visibility = 'hidden';
                        }
                    }
                }
            }
        }
    }

    var Assets = {
        /* Probe every optional slot. Always resolves — missing art is normal. */
        load: function (onProgress) {
            var keys = Object.keys(MANIFEST);
            var total = keys.length;
            var seen = 0;

            return Promise.all(keys.map(function (key) {
                var def = MANIFEST[key];
                return probe(key, def).then(function (img) {
                    seen++;
                    if (img) {
                        loaded[key] = img;
                        try { apply(key, def, img); } catch (e) { /* art is optional */ }
                    }
                    if (typeof onProgress === 'function') { onProgress(seen / total); }
                });
            })).then(function () { return loaded; });
        },

        has: function (key) { return !!loaded[key]; },
        get: function (key) { return loaded[key] || null; },
        url: function (key) { return MANIFEST[key] ? BASE + MANIFEST[key].path : null; }
    };

    global.GQ_ASSETS = Assets;
})(window);
