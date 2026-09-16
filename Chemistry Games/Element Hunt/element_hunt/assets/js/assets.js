/* Element Hunt - optional image asset layer.
 *
 * Every entry below is OPTIONAL. If the file exists it is wired up automatically
 * (as a CSS custom property plus a `has-<key>` class on <html>); if it is missing
 * the game silently keeps its built-in CSS/SVG artwork. Drop art in later without
 * touching any code - see assets/images/README.md for names and sizes.
 */
(function (global) {
    'use strict';

    var BASE = 'assets/images/';

    /* key -> relative path (key doubles as CSS var name: --img-<key>) */
    var MANIFEST = {
        'bg-far':        'background/bg_far.png',
        'bg-mid':        'background/bg_mid.png',
        'bg-near':       'background/bg_near.png',
        'logo':          'ui/logo.png',
        'panel':         'ui/panel.png',
        'panel-header':  'ui/panel_header.png',
        'button':        'ui/button.png',
        'grid-frame':    'ui/grid_frame.png',
        'cell':          'grid/cell.png',
        'cell-selected': 'grid/cell_selected.png',
        'cell-found':    'grid/cell_found.png'
    };

    var found = Object.create(null);
    var elementCache = Object.create(null);

    function probe(url) {
        return new Promise(function (resolve) {
            var img = new Image();
            var done = false;
            function finish(ok) {
                if (done) { return; }
                done = true;
                img.onload = img.onerror = null;
                resolve(ok);
            }
            img.onload = function () { finish(img.naturalWidth > 0); };
            img.onerror = function () { finish(false); };
            // Never let a hung request block the boot sequence.
            setTimeout(function () { finish(false); }, 4000);
            img.src = url;
        });
    }

    function apply(key, url) {
        found[key] = url;
        var root = document.documentElement;
        root.style.setProperty('--img-' + key, 'url("' + url + '")');
        root.classList.add('has-' + key);
    }

    function preload() {
        var keys = Object.keys(MANIFEST);
        return Promise.all(keys.map(function (key) {
            var url = BASE + MANIFEST[key];
            return probe(url).then(function (ok) {
                if (ok) { apply(key, url); }
                return ok;
            });
        }));
    }

    /* Per-element portrait art, e.g. assets/images/elements/na.png */
    function elementImage(symbol) {
        var key = String(symbol).toLowerCase();
        if (key in elementCache) { return Promise.resolve(elementCache[key]); }
        var url = BASE + 'elements/' + key + '.png';
        return probe(url).then(function (ok) {
            elementCache[key] = ok ? url : null;
            return elementCache[key];
        });
    }

    global.ImageAssets = {
        preload: preload,
        elementImage: elementImage,
        has: function (key) { return !!found[key]; },
        url: function (key) { return found[key] || null; },
        iconPath: function (name) { return BASE + 'ui/emoji/' + name + '.png'; }
    };
})(window);
