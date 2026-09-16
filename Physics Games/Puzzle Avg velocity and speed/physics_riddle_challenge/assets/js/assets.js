/* ==========================================================================
   Physics Riddle Challenge - optional image layer
   Every slot below is OPTIONAL. If the file exists it is layered on top of
   the built-in CSS/canvas art; if it is missing nothing happens and the
   vector art stays exactly as it is. Drop art in later, no code changes.
   See assets/images/README.md for filenames, sizes and orientation.
   ========================================================================== */
(function (global) {
    'use strict';

    var BASE = 'assets/images/';

    /* mode 'var' : sets a CSS custom property on <html> and flags a host node
       mode 'bg'  : sets background-image on every element matching `target`
       mode 'none': probed only, so game code can ask Assets.has(key)          */
    var MANIFEST = {
        'bg.far':      { path: 'background/skyline_far.png',  mode: 'var', varName: '--art-bg-far',  flag: 'has-art-far',  flagOn: '#backdrop' },
        'bg.near':     { path: 'background/skyline_near.png', mode: 'var', varName: '--art-bg-near', flag: 'has-art-near', flagOn: '#backdrop' },
        'bg.grid':     { path: 'background/grid_floor.png',   mode: 'var', varName: '--art-bg-grid', flag: 'has-art-grid', flagOn: '#backdrop' },
        'bg.vignette': { path: 'background/vignette.png',     mode: 'var', varName: '--art-vignette', flag: 'has-art-vignette', flagOn: '#backdrop' },

        'char.runner':     { path: 'characters/runner.png',     mode: 'bg', target: '[data-art="char.runner"]' },
        'char.instructor': { path: 'characters/instructor.png', mode: 'bg', target: '[data-art="char.instructor"]' },

        'scene.trial1': { path: 'scenes/trial_1.png', mode: 'bg', target: '[data-art="scene.trial1"]' },
        'scene.trial2': { path: 'scenes/trial_2.png', mode: 'bg', target: '[data-art="scene.trial2"]' },
        'scene.trial3': { path: 'scenes/trial_3.png', mode: 'bg', target: '[data-art="scene.trial3"]' },

        'ui.crest':    { path: 'ui/crest.png',       mode: 'bg', target: '[data-art="ui.crest"]' },
        'ui.panel':    { path: 'ui/panel_frame.png', mode: 'var', varName: '--art-panel', flag: 'has-art-panel', flagOn: 'html' },
        'ui.plate':    { path: 'ui/answer_plate.png', mode: 'var', varName: '--art-plate', flag: 'has-art-plate', flagOn: 'html' },
        'ui.hudBar':   { path: 'ui/hud_bar.png',     mode: 'var', varName: '--art-hud', flag: 'has-art-hud', flagOn: 'html' }
    };

    var loaded = {};

    function probe(def) {
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

    function apply(def) {
        var url = 'url("' + BASE + def.path + '")';

        if (def.mode === 'var') {
            document.documentElement.style.setProperty(def.varName, url);
            if (def.flagOn) {
                var host = def.flagOn === 'html'
                    ? document.documentElement
                    : document.querySelector(def.flagOn);
                if (host) { host.classList.add(def.flag); }
            }
            return;
        }
        if (def.mode === 'bg' && def.target) {
            var nodes = document.querySelectorAll(def.target);
            for (var i = 0; i < nodes.length; i++) {
                nodes[i].style.backgroundImage = url;
                nodes[i].classList.add('has-art');
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
                return probe(def).then(function (img) {
                    seen++;
                    if (img) {
                        loaded[key] = img;
                        try { apply(def); } catch (e) { /* art is optional */ }
                    }
                    if (typeof onProgress === 'function') { onProgress(seen / total); }
                });
            })).then(function () { return loaded; });
        },

        /* Re-apply 'bg' slots to nodes rendered after boot. */
        refresh: function (root) {
            Object.keys(MANIFEST).forEach(function (key) {
                var def = MANIFEST[key];
                if (!loaded[key] || def.mode !== 'bg' || !def.target) { return; }
                var scope = root || document;
                var nodes = scope.querySelectorAll(def.target);
                for (var i = 0; i < nodes.length; i++) {
                    nodes[i].style.backgroundImage = 'url("' + BASE + def.path + '")';
                    nodes[i].classList.add('has-art');
                }
            });
        },

        has: function (key) { return !!loaded[key]; },
        get: function (key) { return loaded[key] || null; },
        url: function (key) { return MANIFEST[key] ? BASE + MANIFEST[key].path : null; }
    };

    global.PRC_ASSETS = Assets;
})(window);
