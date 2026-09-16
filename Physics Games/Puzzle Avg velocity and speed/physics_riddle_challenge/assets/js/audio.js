/* ==========================================================================
   Physics Riddle Challenge - audio
   Everything is synthesised in-browser with Web Audio, so the game ships with
   zero audio files. If assets/audio/bgm.mp3 is present it silently replaces
   the procedural pad; if it is missing the pad keeps playing.
   ========================================================================== */
(function (global) {
    'use strict';

    var ctx = null;
    var master = null;
    var sfxBus = null;
    var musicBus = null;

    var musicOn = true;
    var sfxOn = true;
    var started = false;

    var padNodes = [];      /* live oscillator / filter nodes for the pad */
    var seqTimer = null;    /* chord + motif scheduler */
    var fileEl = null;      /* optional <audio> override */
    var usingFile = false;

    var MUSIC_LEVEL = 0.40;
    var SFX_LEVEL = 0.85;

    function ensureCtx() {
        if (ctx) { return ctx; }
        var AC = global.AudioContext || global.webkitAudioContext;
        if (!AC) { return null; }
        try {
            ctx = new AC();
        } catch (e) {
            return null;
        }
        master = ctx.createGain();
        master.gain.value = 0.9;
        master.connect(ctx.destination);

        sfxBus = ctx.createGain();
        sfxBus.gain.value = sfxOn ? SFX_LEVEL : 0;
        sfxBus.connect(master);

        musicBus = ctx.createGain();
        musicBus.gain.value = 0;
        musicBus.connect(master);
        return ctx;
    }

    function now() { return ctx ? ctx.currentTime : 0; }

    function ramp(param, value, time, from) {
        var t = now();
        try {
            param.cancelScheduledValues(t);
            param.setValueAtTime(typeof from === 'number' ? from : param.value, t);
            param.linearRampToValueAtTime(value, t + (time || 0.3));
        } catch (e) {
            param.value = value;
        }
    }

    /* --------------------------------------------------------------- SFX */

    function blip(opts) {
        if (!ctx || !sfxOn) { return; }
        var t0 = now() + (opts.delay || 0);
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        var filt = ctx.createBiquadFilter();

        osc.type = opts.type || 'sine';
        osc.frequency.setValueAtTime(opts.f0, t0);
        if (opts.f1 && opts.f1 !== opts.f0) {
            osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.f1), t0 + opts.dur);
        }

        filt.type = 'lowpass';
        filt.frequency.setValueAtTime(opts.cutoff || 5200, t0);
        filt.Q.value = opts.q || 0.9;

        var peak = opts.gain || 0.18;
        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.exponentialRampToValueAtTime(peak, t0 + (opts.attack || 0.008));
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);

        osc.connect(filt); filt.connect(gain); gain.connect(sfxBus);
        osc.start(t0);
        osc.stop(t0 + opts.dur + 0.05);
    }

    function noise(opts) {
        if (!ctx || !sfxOn) { return; }
        var t0 = now() + (opts.delay || 0);
        var dur = opts.dur || 0.4;
        var len = Math.max(1, Math.floor(ctx.sampleRate * dur));
        var buf = ctx.createBuffer(1, len, ctx.sampleRate);
        var d = buf.getChannelData(0);
        for (var i = 0; i < len; i++) {
            d[i] = (Math.random() * 2 - 1) * (1 - i / len);
        }
        var src = ctx.createBufferSource();
        src.buffer = buf;

        var filt = ctx.createBiquadFilter();
        filt.type = opts.filter || 'bandpass';
        filt.frequency.setValueAtTime(opts.f0 || 900, t0);
        if (opts.f1) {
            filt.frequency.exponentialRampToValueAtTime(Math.max(40, opts.f1), t0 + dur);
        }
        filt.Q.value = opts.q || 1.1;

        var gain = ctx.createGain();
        gain.gain.setValueAtTime(opts.gain || 0.12, t0);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

        src.connect(filt); filt.connect(gain); gain.connect(sfxBus);
        src.start(t0);
        src.stop(t0 + dur + 0.05);
    }

    var SFX = {
        hover: function () {
            blip({ type: 'sine', f0: 1500, f1: 1950, dur: 0.045, gain: 0.035 });
        },
        click: function () {
            blip({ type: 'square', f0: 900, f1: 1340, dur: 0.065, gain: 0.09, cutoff: 3600 });
            blip({ type: 'sine', f0: 2300, f1: 1700, dur: 0.05, gain: 0.045, delay: 0.01 });
        },
        select: function () {
            blip({ type: 'triangle', f0: 620, f1: 940, dur: 0.12, gain: 0.10, cutoff: 4200 });
            noise({ f0: 2600, f1: 900, dur: 0.10, gain: 0.05 });
        },
        whoosh: function () {
            noise({ f0: 380, f1: 2800, dur: 0.42, gain: 0.09, filter: 'bandpass', q: 0.8 });
        },
        correct: function () {
            [0, 0.085, 0.17, 0.28].forEach(function (d, i) {
                blip({ type: 'triangle', f0: [523.25, 659.25, 783.99, 1046.5][i], dur: 0.42, gain: 0.13, delay: d, cutoff: 7200 });
            });
            blip({ type: 'sine', f0: 1567.98, dur: 0.75, gain: 0.06, delay: 0.28 });
        },
        wrong: function () {
            blip({ type: 'sawtooth', f0: 250, f1: 108, dur: 0.30, gain: 0.12, cutoff: 1300 });
            blip({ type: 'square', f0: 186, f1: 92, dur: 0.24, gain: 0.06, delay: 0.05, cutoff: 900 });
        },
        deny: function () {
            blip({ type: 'square', f0: 210, f1: 150, dur: 0.14, gain: 0.09, cutoff: 1000 });
            blip({ type: 'square', f0: 168, f1: 104, dur: 0.14, gain: 0.08, delay: 0.13, cutoff: 900 });
        },
        unlock: function () {
            blip({ type: 'triangle', f0: 392, f1: 1568, dur: 0.52, gain: 0.11, cutoff: 6500 });
            noise({ f0: 1900, f1: 5200, dur: 0.45, gain: 0.045 });
        },
        star: function () {
            [0, 0.07].forEach(function (d, i) {
                blip({ type: 'square', f0: [988, 1319][i], dur: 0.22, gain: 0.075, delay: d, cutoff: 8000 });
            });
        },
        tick: function () {
            blip({ type: 'sine', f0: 2400, dur: 0.03, gain: 0.03 });
        },
        reset: function () {
            noise({ f0: 1400, f1: 300, dur: 0.22, gain: 0.07, filter: 'lowpass' });
        },
        fanfare: function () {
            [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach(function (f, i) {
                blip({ type: 'triangle', f0: f, dur: 0.8, gain: 0.12, delay: i * 0.105, cutoff: 8000 });
            });
            noise({ f0: 900, f1: 4200, dur: 0.7, gain: 0.05, delay: 0.4 });
        }
    };

    /* ------------------------------------------------------- procedural pad */

    /* A slow, wide Dm -> Bb -> F -> C drift: instrument-room ambience with a
       sparse ping motif on top, so the loop never draws attention to itself. */
    var CHORDS = [
        [73.42, 110.00, 174.61],   /* Dm  */
        [58.27, 87.31, 146.83],    /* Bb  */
        [87.31, 130.81, 220.00],   /* F   */
        [65.41, 98.00, 196.00]     /* C   */
    ];
    var PINGS = [587.33, 698.46, 880.00, 1046.50, 1174.66];

    function buildPad() {
        if (!ctx) { return; }
        teardownPad();

        var padGain = ctx.createGain();
        padGain.gain.value = 0.0001;
        padGain.connect(musicBus);

        var filt = ctx.createBiquadFilter();
        filt.type = 'lowpass';
        filt.frequency.value = 640;
        filt.Q.value = 3.0;
        filt.connect(padGain);

        /* slow sweep gives the pad its breathing motion */
        var lfo = ctx.createOscillator();
        var lfoAmt = ctx.createGain();
        lfo.frequency.value = 0.041;
        lfoAmt.gain.value = 360;
        lfo.connect(lfoAmt);
        lfoAmt.connect(filt.frequency);
        lfo.start();

        var voices = [];
        for (var v = 0; v < 3; v++) {
            var a = ctx.createOscillator();
            var b = ctx.createOscillator();
            var g = ctx.createGain();
            a.type = 'sawtooth';
            b.type = 'triangle';
            a.detune.value = -8;
            b.detune.value = 8;
            g.gain.value = 0.052;
            a.connect(g); b.connect(g); g.connect(filt);
            a.start(); b.start();
            voices.push({ a: a, b: b, g: g });
        }

        /* airy bed — the hum of a very large quiet room */
        var bedLen = Math.floor(ctx.sampleRate * 4);
        var bedBuf = ctx.createBuffer(1, bedLen, ctx.sampleRate);
        var bd = bedBuf.getChannelData(0);
        for (var i = 0; i < bedLen; i++) { bd[i] = (Math.random() * 2 - 1) * 0.3; }
        var bed = ctx.createBufferSource();
        bed.buffer = bedBuf;
        bed.loop = true;
        var bedFilt = ctx.createBiquadFilter();
        bedFilt.type = 'bandpass';
        bedFilt.frequency.value = 560;
        bedFilt.Q.value = 0.55;
        var bedGain = ctx.createGain();
        bedGain.gain.value = 0.045;
        bed.connect(bedFilt); bedFilt.connect(bedGain); bedGain.connect(padGain);
        bed.start();

        padNodes = [lfo, lfoAmt, filt, padGain, bed, bedFilt, bedGain];
        voices.forEach(function (vv) { padNodes.push(vv.a, vv.b, vv.g); });

        var step = 0;
        function tick() {
            if (!ctx) { return; }
            var chord = CHORDS[step % CHORDS.length];
            var t = now();
            voices.forEach(function (vv, idx) {
                var f = chord[idx] || chord[0];
                try {
                    vv.a.frequency.cancelScheduledValues(t);
                    vv.b.frequency.cancelScheduledValues(t);
                    vv.a.frequency.linearRampToValueAtTime(f, t + 2.4);
                    vv.b.frequency.linearRampToValueAtTime(f * 1.004, t + 2.4);
                } catch (e) { /* older engines */ }
            });

            if (step % 2 === 1 && musicOn && !usingFile) {
                var note = PINGS[Math.floor(Math.random() * PINGS.length)];
                var osc = ctx.createOscillator();
                var pg = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.value = note;
                pg.gain.setValueAtTime(0.0001, t);
                pg.gain.exponentialRampToValueAtTime(0.05, t + 0.02);
                pg.gain.exponentialRampToValueAtTime(0.0001, t + 3.4);
                osc.connect(pg); pg.connect(padGain);
                osc.start(t);
                osc.stop(t + 3.6);
                padNodes.push(osc, pg);
            }
            step++;
        }
        tick();
        seqTimer = setInterval(tick, 6400);

        ramp(padGain.gain, 1, 3.2, 0.0001);
    }

    function teardownPad() {
        if (seqTimer) { clearInterval(seqTimer); seqTimer = null; }
        padNodes.forEach(function (n) {
            try { if (n.stop) { n.stop(); } } catch (e) { /* already stopped */ }
            try { n.disconnect(); } catch (e) { /* already gone */ }
        });
        padNodes = [];
    }

    /* ------------------------------------------------- optional bgm file */

    function tryMusicFile() {
        fileEl = document.getElementById('bgm-file');
        if (!fileEl) { return Promise.resolve(false); }

        return new Promise(function (resolve) {
            var settled = false;
            function ok() { if (!settled) { settled = true; resolve(true); } }
            function fail() { if (!settled) { settled = true; resolve(false); } }

            fileEl.addEventListener('canplaythrough', ok, { once: true });
            fileEl.addEventListener('loadeddata', ok, { once: true });
            fileEl.addEventListener('error', fail, { once: true });
            fileEl.addEventListener('stalled', fail, { once: true });
            setTimeout(fail, 2200);

            try {
                fileEl.preload = 'auto';
                fileEl.load();
            } catch (e) {
                fail();
            }
        });
    }

    function startFileMusic() {
        if (!fileEl) { return; }
        fileEl.loop = true;
        fileEl.volume = musicOn ? 0.5 : 0;
        var p = fileEl.play();
        if (p && p.catch) { p.catch(function () { /* needs another gesture */ }); }
    }

    /* -------------------------------------------------------------- API */

    var AudioAPI = {
        init: function (prefs) {
            if (prefs) {
                musicOn = prefs.music !== false;
                sfxOn = prefs.sfx !== false;
            }
            return tryMusicFile().then(function (available) {
                usingFile = available;
                return usingFile;
            });
        },

        /* must run from inside a user gesture on mobile */
        start: function () {
            if (started) { this.resume(); return; }
            if (!ensureCtx()) { return; }
            started = true;

            if (usingFile) {
                startFileMusic();
            } else {
                buildPad();
            }
            ramp(musicBus.gain, musicOn ? MUSIC_LEVEL : 0, 2.6, 0.0001);
        },

        resume: function () {
            if (ctx && ctx.state === 'suspended') {
                var r = ctx.resume();
                if (r && r.catch) { r.catch(function () { /* ignore */ }); }
            }
            if (usingFile && musicOn && fileEl && fileEl.paused) {
                startFileMusic();
            }
        },

        play: function (name) {
            if (!sfxOn) { return; }
            if (!ensureCtx()) { return; }
            this.resume();
            var fn = SFX[name];
            if (fn) {
                try { fn(); } catch (e) { /* audio must never break gameplay */ }
            }
        },

        setMusic: function (on) {
            musicOn = !!on;
            if (usingFile && fileEl) {
                fileEl.volume = musicOn ? 0.5 : 0;
                if (musicOn) { startFileMusic(); } else { try { fileEl.pause(); } catch (e) { /* fine */ } }
            }
            if (musicBus) { ramp(musicBus.gain, musicOn ? MUSIC_LEVEL : 0, 0.7); }
            if (musicOn && started && !usingFile && padNodes.length === 0) { buildPad(); }
        },

        setSfx: function (on) {
            sfxOn = !!on;
            if (sfxBus) { ramp(sfxBus.gain, sfxOn ? SFX_LEVEL : 0, 0.2); }
        },

        isMusicOn: function () { return musicOn; },
        isSfxOn: function () { return sfxOn; },
        isUsingFile: function () { return usingFile; }
    };

    global.PRC_AUDIO = AudioAPI;
})(window);
