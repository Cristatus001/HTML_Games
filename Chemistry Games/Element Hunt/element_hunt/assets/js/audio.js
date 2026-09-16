/* Element Hunt - audio engine.
 *
 * Music is synthesised in-browser with the Web Audio API, so the game needs no
 * audio files at all and works fully offline. If an optional file is dropped in
 * at assets/audio/bgm.mp3 it takes over from the procedural score automatically;
 * if it is missing (or fails to decode) we fall back to the synth without error.
 */
(function (global) {
    'use strict';

    var BGM_FILE = 'assets/audio/bgm.mp3';

    var ctx = null;
    var master = null;       // everything
    var musicBus = null;     // synth + file music
    var sfxBus = null;
    var started = false;
    var musicOn = true;
    var sfxOn = true;
    var musicRunning = false;

    var fileAudio = null;
    var fileSource = null;
    var fileReady = false;

    var padTimer = null;
    var padNodes = [];
    var humNodes = [];

    /* ---------------------------------------------------------------- helpers */
    function midi(n) { return 440 * Math.pow(2, (n - 69) / 12); }

    function now() { return ctx ? ctx.currentTime : 0; }

    function makeCtx() {
        if (ctx) { return ctx; }
        var AC = global.AudioContext || global.webkitAudioContext;
        if (!AC) { return null; }
        try { ctx = new AC(); } catch (e) { return null; }

        master = ctx.createGain();
        master.gain.value = 0.9;

        // Gentle safety compression so layered synths never clip on phone speakers.
        var comp = ctx.createDynamicsCompressor();
        try {
            comp.threshold.value = -14;
            comp.knee.value = 22;
            comp.ratio.value = 5;
            comp.attack.value = 0.006;
            comp.release.value = 0.28;
        } catch (e) { /* older engines: read-only params, harmless */ }

        musicBus = ctx.createGain();
        musicBus.gain.value = 0;
        sfxBus = ctx.createGain();
        sfxBus.gain.value = 0.85;

        musicBus.connect(master);
        sfxBus.connect(master);
        master.connect(comp);
        comp.connect(ctx.destination);
        return ctx;
    }

    function ramp(param, value, time, at) {
        var t = (at === undefined ? now() : at);
        try {
            param.cancelScheduledValues(t);
            param.setValueAtTime(param.value, t);
            param.linearRampToValueAtTime(value, t + time);
        } catch (e) { param.value = value; }
    }

    /* ------------------------------------------------------- procedural music */
    // A minor / pentatonic flavoured ambient progression - calm, "laboratory" mood.
    var PROGRESSION = [
        [45, 52, 57, 60],   // Am
        [41, 48, 53, 57],   // F
        [43, 50, 55, 59],   // G
        [40, 47, 52, 55]    // E(m)
    ];
    var MELODY = [69, 72, 74, 76, 79, 81, 84];
    var chordIndex = 0;
    var CHORD_LEN = 7.5;

    function startHum() {
        if (!ctx || humNodes.length) { return; }
        // Sub drone
        var osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = midi(33);
        var g = ctx.createGain();
        g.gain.value = 0.05;
        osc.connect(g);
        g.connect(musicBus);
        osc.start();

        // Filtered noise "air"
        var len = Math.floor(ctx.sampleRate * 2);
        var buf = ctx.createBuffer(1, len, ctx.sampleRate);
        var data = buf.getChannelData(0);
        for (var i = 0; i < len; i++) { data[i] = (Math.random() * 2 - 1) * 0.5; }
        var src = ctx.createBufferSource();
        src.buffer = buf;
        src.loop = true;
        var lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 520;
        var ng = ctx.createGain();
        ng.gain.value = 0.018;
        src.connect(lp);
        lp.connect(ng);
        ng.connect(musicBus);
        src.start();

        humNodes = [osc, src];
    }

    function stopHum() {
        humNodes.forEach(function (n) { try { n.stop(); } catch (e) {} });
        humNodes = [];
    }

    function playChord(notes, at, dur) {
        var filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 700;
        filter.Q.value = 0.7;

        var vca = ctx.createGain();
        vca.gain.setValueAtTime(0.0001, at);
        vca.gain.linearRampToValueAtTime(0.16, at + dur * 0.35);
        vca.gain.linearRampToValueAtTime(0.0001, at + dur);

        filter.connect(vca);
        vca.connect(musicBus);

        // Slow filter sweep gives the pad its breathing quality.
        filter.frequency.setValueAtTime(520, at);
        filter.frequency.linearRampToValueAtTime(1250, at + dur * 0.5);
        filter.frequency.linearRampToValueAtTime(560, at + dur);

        var made = [];
        notes.forEach(function (n, i) {
            [0, 1].forEach(function (d) {
                var o = ctx.createOscillator();
                o.type = i === 0 ? 'triangle' : 'sawtooth';
                o.frequency.value = midi(n) * (d ? 1.004 : 0.997);
                var og = ctx.createGain();
                og.gain.value = (i === 0 ? 0.5 : 0.22) / (d + 1);
                o.connect(og);
                og.connect(filter);
                o.start(at);
                o.stop(at + dur + 0.2);
                made.push(o);
            });
        });
        padNodes = padNodes.concat(made);
        if (padNodes.length > 64) { padNodes = padNodes.slice(-64); }
    }

    function bell(at, note, gain) {
        var o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.value = midi(note);
        var o2 = ctx.createOscillator();
        o2.type = 'sine';
        o2.frequency.value = midi(note + 12);
        var g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, at);
        g.gain.exponentialRampToValueAtTime(gain, at + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, at + 2.2);
        var g2 = ctx.createGain();
        g2.gain.value = 0.25;
        o.connect(g);
        o2.connect(g2);
        g2.connect(g);
        g.connect(musicBus);
        o.start(at); o.stop(at + 2.4);
        o2.start(at); o2.stop(at + 2.4);
    }

    function scheduleBar() {
        if (!musicRunning || !ctx) { return; }
        var at = now() + 0.08;
        playChord(PROGRESSION[chordIndex % PROGRESSION.length], at, CHORD_LEN);

        // Sparse shimmering motif over the pad.
        var count = 2 + Math.floor(Math.random() * 3);
        for (var i = 0; i < count; i++) {
            var note = MELODY[Math.floor(Math.random() * MELODY.length)];
            bell(at + 0.6 + Math.random() * (CHORD_LEN - 1.4), note, 0.06 + Math.random() * 0.05);
        }
        chordIndex++;
        padTimer = setTimeout(scheduleBar, CHORD_LEN * 1000);
    }

    function startSynthMusic() {
        if (musicRunning) {
            // Already playing but the bus may have been faded out by stopMusic().
            ramp(musicBus.gain, 0.85, 1.2);
            return;
        }
        musicRunning = true;
        startHum();
        scheduleBar();
        ramp(musicBus.gain, 0.85, 2.5);
    }

    function stopSynthMusic() {
        musicRunning = false;
        if (padTimer) { clearTimeout(padTimer); padTimer = null; }
        stopHum();
        padNodes.forEach(function (o) { try { o.stop(); } catch (e) {} });
        padNodes = [];
    }

    /* ------------------------------------------------------------- file music */
    function tryLoadFile() {
        return new Promise(function (resolve) {
            var a = new Audio();
            var settled = false;
            function ok() { if (!settled) { settled = true; fileAudio = a; fileReady = true; resolve(true); } }
            function fail() { if (!settled) { settled = true; resolve(false); } }
            a.preload = 'auto';
            a.loop = true;
            a.volume = 0.6;
            a.addEventListener('canplaythrough', ok, { once: true });
            a.addEventListener('loadeddata', ok, { once: true });
            a.addEventListener('error', fail, { once: true });
            setTimeout(fail, 3500);
            a.src = BGM_FILE;
            try { a.load(); } catch (e) { fail(); }
        });
    }

    var fileRouted = false;

    function startFileMusic() {
        if (!fileAudio) { return; }
        if (ctx && !fileRouted) {
            // Route the element through the graph once so the music toggle and
            // the synth share a single bus. Some engines refuse: fall back to
            // driving the element's own volume instead.
            fileRouted = true;
            try {
                fileSource = ctx.createMediaElementSource(fileAudio);
                fileSource.connect(musicBus);
            } catch (e) { fileSource = null; }
        }
        // Always restore the bus level - stopMusic() ramps it to zero.
        if (musicBus) { ramp(musicBus.gain, 0.85, 1.2); }
        fileAudio.volume = 0.6;
        var p = fileAudio.play();
        if (p && p.catch) { p.catch(function () { /* autoplay blocked; retried on next gesture */ }); }
    }

    /* ------------------------------------------------------------------- sfx */
    function tone(opts) {
        if (!ctx || !sfxOn) { return; }
        var at = opts.at || now();
        var o = ctx.createOscillator();
        o.type = opts.type || 'sine';
        var g = ctx.createGain();
        var peak = opts.gain === undefined ? 0.2 : opts.gain;
        var dur = opts.dur || 0.15;

        o.frequency.setValueAtTime(opts.f0, at);
        if (opts.f1) { o.frequency.exponentialRampToValueAtTime(Math.max(20, opts.f1), at + dur); }

        g.gain.setValueAtTime(0.0001, at);
        g.gain.exponentialRampToValueAtTime(peak, at + Math.min(0.03, dur * 0.3));
        g.gain.exponentialRampToValueAtTime(0.0001, at + dur);

        var node = o;
        if (opts.filter) {
            var f = ctx.createBiquadFilter();
            f.type = opts.filter;
            f.frequency.value = opts.filterFreq || 900;
            o.connect(f);
            node = f;
        }
        node.connect(g);
        g.connect(sfxBus);
        o.start(at);
        o.stop(at + dur + 0.05);
    }

    function noise(dur, gain, freq) {
        if (!ctx || !sfxOn) { return; }
        var len = Math.floor(ctx.sampleRate * dur);
        var buf = ctx.createBuffer(1, len, ctx.sampleRate);
        var d = buf.getChannelData(0);
        for (var i = 0; i < len; i++) { d[i] = (Math.random() * 2 - 1) * (1 - i / len); }
        var src = ctx.createBufferSource();
        src.buffer = buf;
        var f = ctx.createBiquadFilter();
        f.type = 'bandpass';
        f.frequency.value = freq || 1800;
        var g = ctx.createGain();
        g.gain.value = gain || 0.15;
        src.connect(f); f.connect(g); g.connect(sfxBus);
        src.start();
    }

    var SFX = {
        click: function () { tone({ type: 'square', f0: 320, f1: 620, dur: 0.07, gain: 0.1 }); },
        back: function () { tone({ type: 'square', f0: 480, f1: 240, dur: 0.09, gain: 0.09 }); },
        select: function (n) {
            var step = Math.min(n || 1, 8);
            tone({ type: 'triangle', f0: midi(69 + step * 2), dur: 0.06, gain: 0.09 });
        },
        correct: function () {
            var t = now();
            [0, 4, 7, 12].forEach(function (s, i) {
                tone({ type: 'triangle', f0: midi(69 + s), dur: 0.5, gain: 0.16, at: t + i * 0.07 });
            });
            noise(0.35, 0.07, 3200);
        },
        wrong: function () {
            tone({ type: 'sawtooth', f0: 180, f1: 70, dur: 0.32, gain: 0.16, filter: 'lowpass', filterFreq: 700 });
            noise(0.16, 0.06, 320);
        },
        hint: function () {
            var t = now();
            [0, 5, 9].forEach(function (s, i) {
                tone({ type: 'sine', f0: midi(84 + s), dur: 0.3, gain: 0.1, at: t + i * 0.05 });
            });
        },
        star: function (i) {
            tone({ type: 'sine', f0: midi(76 + (i || 0) * 4), dur: 0.9, gain: 0.18 });
        },
        fanfare: function () {
            var t = now();
            [0, 4, 7, 12, 16].forEach(function (s, k) {
                tone({ type: 'triangle', f0: midi(64 + s), dur: 0.7, gain: 0.15, at: t + k * 0.12 });
            });
        },
        unlock: function () {
            var t = now();
            tone({ type: 'triangle', f0: midi(72), dur: 0.35, gain: 0.14, at: t });
            tone({ type: 'triangle', f0: midi(79), dur: 0.6, gain: 0.14, at: t + 0.14 });
        },
        toggle: function () { tone({ type: 'square', f0: 520, f1: 700, dur: 0.06, gain: 0.08 }); }
    };

    /* ------------------------------------------------------------------- api */
    var api = {
        /* Must be called from a user gesture (browsers block audio otherwise). */
        unlock: function () {
            if (!makeCtx()) { return Promise.resolve(false); }
            if (ctx.state === 'suspended') { ctx.resume(); }
            if (started) {
                if (musicOn) { api.startMusic(); }
                return Promise.resolve(true);
            }
            started = true;
            return tryLoadFile().then(function () {
                if (musicOn) { api.startMusic(); }
                return true;
            });
        },
        startMusic: function () {
            if (!ctx || !musicOn) { return; }
            if (ctx.state === 'suspended') { ctx.resume(); }
            if (fileReady) { startFileMusic(); } else { startSynthMusic(); }
        },
        stopMusic: function () {
            if (fileReady && fileAudio) {
                try { fileAudio.pause(); } catch (e) {}
            }
            if (musicBus) { ramp(musicBus.gain, 0, 0.4); }
            setTimeout(function () { if (!musicOn) { stopSynthMusic(); } }, 500);
        },
        setMusic: function (on) {
            musicOn = !!on;
            if (musicOn) { api.startMusic(); } else { api.stopMusic(); }
        },
        setSfx: function (on) { sfxOn = !!on; },
        isMusicOn: function () { return musicOn; },
        isSfxOn: function () { return sfxOn; },
        usingMusicFile: function () { return fileReady; },
        contextState: function () { return ctx ? ctx.state : 'none'; },
        play: function (name, arg) {
            if (!sfxOn || !ctx) { return; }
            if (ctx.state === 'suspended') { ctx.resume(); }
            var fn = SFX[name];
            if (fn) { fn(arg); }
        },
        suspendAll: function () {
            if (fileReady && fileAudio) { try { fileAudio.pause(); } catch (e) {} }
            if (ctx && ctx.state === 'running') { ctx.suspend(); }
        },
        resumeAll: function () {
            if (!ctx) { return; }
            if (ctx.state === 'suspended') { ctx.resume(); }
            if (musicOn && fileReady && fileAudio) { startFileMusic(); }
        }
    };

    global.AudioEngine = api;
})(window);
