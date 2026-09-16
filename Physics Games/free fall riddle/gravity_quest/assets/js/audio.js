/* ==========================================================================
   Gravity Quest - audio
   Everything is synthesised in-browser with Web Audio, so the game needs
   zero audio files to ship. If assets/audio/bgm.mp3 is present it silently
   replaces the procedural pad; if it is missing the pad keeps playing.
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

    var padNodes = [];      /* running oscillator/LFO nodes for the pad */
    var seqTimer = null;    /* arpeggio scheduler */
    var fileEl = null;      /* optional <audio> override */
    var usingFile = false;

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
        sfxBus.gain.value = sfxOn ? 0.85 : 0;
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
        click: function () {
            blip({ type: 'square', f0: 880, f1: 1320, dur: 0.07, gain: 0.10, cutoff: 3600 });
            blip({ type: 'sine', f0: 2200, f1: 1600, dur: 0.05, gain: 0.05, delay: 0.01 });
        },
        hover: function () {
            blip({ type: 'sine', f0: 1400, f1: 1900, dur: 0.05, gain: 0.04 });
        },
        whoosh: function () {
            noise({ f0: 420, f1: 2600, dur: 0.45, gain: 0.10, filter: 'bandpass', q: 0.8 });
        },
        correct: function () {
            [0, 0.09, 0.18, 0.3].forEach(function (d, i) {
                blip({ type: 'triangle', f0: [523, 659, 784, 1047][i], dur: 0.4, gain: 0.14, delay: d, cutoff: 7000 });
            });
            blip({ type: 'sine', f0: 1568, dur: 0.7, gain: 0.07, delay: 0.3 });
        },
        incorrect: function () {
            blip({ type: 'sawtooth', f0: 240, f1: 110, dur: 0.32, gain: 0.13, cutoff: 1300 });
            blip({ type: 'square', f0: 180, f1: 90, dur: 0.26, gain: 0.07, delay: 0.05, cutoff: 900 });
        },
        thud: function () {
            blip({ type: 'sine', f0: 150, f1: 44, dur: 0.4, gain: 0.26, cutoff: 700 });
            noise({ f0: 220, f1: 60, dur: 0.22, gain: 0.10, filter: 'lowpass' });
        },
        coin: function () {
            [0, 0.07].forEach(function (d, i) {
                blip({ type: 'square', f0: [988, 1319][i], dur: 0.24, gain: 0.09, delay: d, cutoff: 8000 });
            });
        },
        unlock: function () {
            blip({ type: 'triangle', f0: 392, f1: 1568, dur: 0.55, gain: 0.12, cutoff: 6500 });
            noise({ f0: 1800, f1: 5200, dur: 0.5, gain: 0.05 });
        },
        deny: function () {
            blip({ type: 'square', f0: 200, f1: 140, dur: 0.16, gain: 0.10, cutoff: 1000 });
            blip({ type: 'square', f0: 160, f1: 100, dur: 0.16, gain: 0.09, delay: 0.14, cutoff: 900 });
        },
        launch: function () {
            noise({ f0: 200, f1: 3200, dur: 0.9, gain: 0.12 });
            blip({ type: 'sawtooth', f0: 110, f1: 660, dur: 0.9, gain: 0.09, cutoff: 2400 });
        },
        fanfare: function () {
            [523, 659, 784, 1047, 1319].forEach(function (f, i) {
                blip({ type: 'triangle', f0: f, dur: 0.75, gain: 0.13, delay: i * 0.11, cutoff: 8000 });
            });
        }
    };

    /* ------------------------------------------------------- procedural pad */

    /* Slow, wide Am -> F -> C -> G drift. Detuned saw pairs through a
       moving lowpass, plus a breathy noise bed and a sparse bell arpeggio. */
    var CHORDS = [
        [110.00, 164.81, 261.63],   /* Am  */
        [87.31, 130.81, 220.00],    /* F   */
        [130.81, 196.00, 329.63],   /* C   */
        [98.00, 146.83, 293.66]     /* G   */
    ];
    var BELLS = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50];

    function buildPad() {
        if (!ctx) { return; }
        teardownPad();

        var padGain = ctx.createGain();
        padGain.gain.value = 0.0;
        padGain.connect(musicBus);

        var filt = ctx.createBiquadFilter();
        filt.type = 'lowpass';
        filt.frequency.value = 700;
        filt.Q.value = 3.2;
        filt.connect(padGain);

        /* slow filter sweep gives the pad its breathing motion */
        var lfo = ctx.createOscillator();
        var lfoAmt = ctx.createGain();
        lfo.frequency.value = 0.045;
        lfoAmt.gain.value = 380;
        lfo.connect(lfoAmt);
        lfoAmt.connect(filt.frequency);
        lfo.start();

        var voices = [];
        for (var v = 0; v < 3; v++) {
            var a = ctx.createOscillator();
            var b = ctx.createOscillator();
            var g = ctx.createGain();
            a.type = 'sawtooth';
            b.type = 'sawtooth';
            a.detune.value = -7;
            b.detune.value = 7;
            g.gain.value = 0.055;
            a.connect(g); b.connect(g); g.connect(filt);
            a.start(); b.start();
            voices.push({ a: a, b: b, g: g });
        }

        /* airy noise bed */
        var bedLen = Math.floor(ctx.sampleRate * 4);
        var bedBuf = ctx.createBuffer(1, bedLen, ctx.sampleRate);
        var bd = bedBuf.getChannelData(0);
        for (var i = 0; i < bedLen; i++) { bd[i] = (Math.random() * 2 - 1) * 0.32; }
        var bed = ctx.createBufferSource();
        bed.buffer = bedBuf;
        bed.loop = true;
        var bedFilt = ctx.createBiquadFilter();
        bedFilt.type = 'bandpass';
        bedFilt.frequency.value = 620;
        bedFilt.Q.value = 0.6;
        var bedGain = ctx.createGain();
        bedGain.gain.value = 0.05;
        bed.connect(bedFilt); bedFilt.connect(bedGain); bedGain.connect(padGain);
        bed.start();

        padNodes = [lfo, lfoAmt, filt, padGain, bed, bedFilt, bedGain];
        voices.forEach(function (v) { padNodes.push(v.a, v.b, v.g); });

        /* chord + bell scheduler */
        var step = 0;
        function tick() {
            if (!ctx) { return; }
            var chord = CHORDS[step % CHORDS.length];
            var t = now();
            voices.forEach(function (v, idx) {
                var f = chord[idx] || chord[0];
                try {
                    v.a.frequency.cancelScheduledValues(t);
                    v.b.frequency.cancelScheduledValues(t);
                    v.a.frequency.linearRampToValueAtTime(f, t + 2.2);
                    v.b.frequency.linearRampToValueAtTime(f * 1.005, t + 2.2);
                } catch (e) { /* older engines */ }
            });

            /* one sparse bell every other bar keeps it from feeling empty */
            if (step % 2 === 1 && musicOn && !usingFile) {
                var note = BELLS[Math.floor(Math.random() * BELLS.length)];
                var osc = ctx.createOscillator();
                var bg = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.value = note;
                bg.gain.setValueAtTime(0.0001, t);
                bg.gain.exponentialRampToValueAtTime(0.055, t + 0.02);
                bg.gain.exponentialRampToValueAtTime(0.0001, t + 3.2);
                osc.connect(bg); bg.connect(padGain);
                osc.start(t);
                osc.stop(t + 3.4);
            }
            step++;
        }
        tick();
        seqTimer = setInterval(tick, 6200);

        /* fade the pad in */
        ramp(padGain.gain, 1, 3.0, 0.0001);
        padNodes.padGain = padGain;
    }

    function teardownPad() {
        if (seqTimer) { clearInterval(seqTimer); seqTimer = null; }
        padNodes.forEach(function (n) {
            try { if (n.stop) { n.stop(); } } catch (e) { /* already stopped */ }
            try { n.disconnect(); } catch (e) { /* already gone */ }
        });
        padNodes = [];
    }

    /* ------------------------------------------------- optional bgm.mp3 */

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

    var Audio = {
        init: function (prefs) {
            if (prefs) {
                musicOn = prefs.music !== false;
                sfxOn = prefs.sfx !== false;
            }
            /* Probe the optional file up front; the result decides which
               music source `start()` will use. */
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
            ramp(musicBus.gain, musicOn ? 0.42 : 0, 2.4, 0.0001);
        },

        resume: function () {
            if (ctx && ctx.state === 'suspended') {
                ctx.resume().catch(function () { /* ignore */ });
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
                if (musicOn) { startFileMusic(); } else { try { fileEl.pause(); } catch (e) {} }
            }
            if (musicBus) { ramp(musicBus.gain, musicOn ? 0.42 : 0, 0.7); }
            if (musicOn && started && !usingFile && padNodes.length === 0) { buildPad(); }
        },

        setSfx: function (on) {
            sfxOn = !!on;
            if (sfxBus) { ramp(sfxBus.gain, sfxOn ? 0.85 : 0, 0.2); }
        },

        isMusicOn: function () { return musicOn; },
        isSfxOn: function () { return sfxOn; },
        isUsingFile: function () { return usingFile; }
    };

    global.GQ_AUDIO = Audio;
})(window);
