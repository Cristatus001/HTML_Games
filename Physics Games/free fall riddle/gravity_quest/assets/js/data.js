/* ==========================================================================
   Gravity Quest - game data
   Riddles, answer pools, lore, and the Learn More reference library.
   ========================================================================== */
(function (global) {
    'use strict';

    var CONFIG = {
        HINT_COST: 30,
        REWARD_AMOUNT: 100,
        START_SHARDS: 50,
        SAVE_KEY: 'gravityQuest.save.v1',
        PREFS_KEY: 'gravityQuest.prefs.v1'
    };

    /* Each riddle ships 9 options: the accepted answer(s) plus plausible
       physics distractors. `accepted` mirrors the original answer checking,
       which also allowed WEIGHTLESSNESS on node 3. */
    var RIDDLES = [
        {
            name: 'The Great Equalizer',
            riddle: 'I pull on the rich and the poor, the big and the small, the feather and the stone, ' +
                    'and give the same acceleration to them all. What am I?',
            accepted: ['GRAVITY'],
            options: [
                'GRAVITY', 'MAGNETISM', 'FRICTION', 'INERTIA', 'MOMENTUM',
                'BUOYANCY', 'AIR RESISTANCE', 'TENSION', 'CENTRIFUGAL FORCE'
            ],
            lore: 'Gravity is the fundamental force that attracts any two objects with mass. On Earth, it ' +
                  'accelerates everything downwards at the same rate: 9.8 m/s². It is the universe’s ' +
                  'great equalizer!',
            hint: 'This force is a fundamental property of mass.'
        },
        {
            name: 'The Invisible Push',
            riddle: 'I am the reason a parachute works and a leaf gently drifts. In a vacuum, I vanish, ' +
                    'giving even the lightest objects a swift gift of speed. What am I?',
            accepted: ['AIR RESISTANCE'],
            options: [
                'AIR RESISTANCE', 'GRAVITY', 'BUOYANCY', 'INERTIA', 'LIFT',
                'SURFACE TENSION', 'MOMENTUM', 'VACUUM', 'ESCAPE VELOCITY'
            ],
            lore: 'Air resistance is a type of friction that opposes an object’s motion through the air. ' +
                  'The larger the surface area (like an open parachute), the stronger the push!',
            hint: 'It is a type of friction, but in the sky.'
        },
        {
            name: 'The Weightless Fall',
            riddle: 'If you jump from a plane, you and an apple released from your hand will fall together, ' +
                    'side by side. For a moment, the apple will seem to float before your eyes. ' +
                    'What is this feeling of having no weight?',
            /* the original accepted both of these spellings of the same idea */
            accepted: ['FREE FALL', 'WEIGHTLESSNESS'],
            options: [
                'FREE FALL', 'WEIGHTLESSNESS', 'ZERO GRAVITY', 'TERMINAL VELOCITY', 'ORBIT',
                'ESCAPE VELOCITY', 'INERTIA', 'MOMENTUM', 'BUOYANCY'
            ],
            lore: 'Weight is the feeling of a surface pushing against you. In free fall, there is no surface ' +
                  'pushing back, so you feel weightless — even though gravity is still pulling on you!',
            hint: 'This can also be called “weightlessness”.'
        },
        {
            name: 'The Up and Down Journey',
            riddle: 'I am thrown upwards, slowing as I rise. I pause at my peak, then fall back to the ground. ' +
                    'Though my speed constantly changes, my acceleration never does. What am I?',
            accepted: ['PROJECTILE'],
            options: [
                'PROJECTILE', 'PENDULUM', 'SATELLITE', 'ORBIT', 'METEOR',
                'ROCKET', 'OSCILLATOR', 'TERMINAL VELOCITY', 'FREE FALL'
            ],
            lore: 'No matter if an object is rising, falling, or at the very peak of its path, its acceleration ' +
                  'due to gravity is always constant and directed downwards.',
            hint: 'It is the scientific term for any object thrown or fired into the air.'
        }
    ];

    /* Learn More: definitions, worked examples and lore. Deliberately kept
       separate from How to Play, which covers controls and objective only. */
    var LEARN = [
        {
            term: 'Free Fall',
            def: 'Motion where gravity is the only force acting on a body. No engine, no rope, no air push — ' +
                 'just gravity. A skydiver before the parachute opens, a dropped stone, and an orbiting ' +
                 'astronaut are all in free fall.',
            math: 'a = g = 9.8 m/s² (downwards)',
            eg: 'A ball dropped from rest is moving at <b>9.8 m/s</b> after 1 second, <b>19.6 m/s</b> after 2 ' +
                'seconds, and <b>29.4 m/s</b> after 3 seconds — it gains the same 9.8 m/s every second.'
        },
        {
            term: 'Acceleration Due to Gravity',
            def: 'Near Earth’s surface every falling object speeds up at the same rate, written <i>g</i>. ' +
                 'It does not depend on mass: heavier objects are pulled harder, but they also resist ' +
                 'acceleration more, and the two effects cancel exactly.',
            math: 'g ≈ 9.8 m/s² on Earth, 1.6 m/s² on the Moon',
            eg: 'Apollo 15’s David Scott dropped a hammer and a falcon feather on the airless Moon in 1971. ' +
                'They hit the surface <b>at the same moment</b>, exactly as Galileo predicted.'
        },
        {
            term: 'Air Resistance (Drag)',
            def: 'A friction-like force from the air an object pushes through. It grows with speed and with ' +
                 'frontal area, and it always points opposite the motion. Remove the air, and it disappears.',
            math: 'Drag grows roughly with v²',
            eg: 'A flat sheet of paper flutters down slowly. Crush the <b>same paper</b> into a tight ball and ' +
                'it drops fast — the mass never changed, only the drag did.'
        },
        {
            term: 'Terminal Velocity',
            def: 'The steady speed reached when upward drag has grown large enough to exactly balance the ' +
                 'downward pull of gravity. The net force becomes zero, so acceleration stops and speed ' +
                 'holds constant. Because drag depends on speed, every falling shape has its own terminal ' +
                 'velocity — change the shape and you change the speed.',
            math: 'a = g - k·v² , so v_terminal = √(g / k)',
            eg: 'A belly-to-earth skydiver levels off near <b>55 m/s</b> (195 km/h). Opening the canopy ' +
                'multiplies drag, and terminal velocity drops to a landable <b>14 m/s</b> — the same jumper, ' +
                'the same gravity, a quarter of the speed.'
        },
        {
            term: 'Weight vs. Mass',
            def: 'Mass is how much matter a body contains and never changes. Weight is the force of gravity on ' +
                 'that mass — and what you actually <i>feel</i> is the surface pushing back up at you. ' +
                 'Remove the surface and the feeling vanishes.',
            math: 'W = m × g',
            eg: 'A 70 kg person still has <b>70 kg of mass</b> in a falling elevator, but the bathroom scale ' +
                'under their feet reads <b>0</b> — nothing is pressing on it.'
        },
        {
            term: 'Apparent Weight',
            def: 'What a scale reads when the whole system is accelerating. Accelerate upwards and you feel ' +
                 'heavier; accelerate downwards and you feel lighter; fall freely and you feel nothing at all.',
            math: 'Scale reading = m(g + a)',
            eg: 'An elevator starting upward briefly pushes the reading from <b>70.0 kg</b> to about ' +
                '<b>80.0 kg</b>, then it settles back once the speed is steady.'
        },
        {
            term: 'Projectile Motion',
            def: 'The path of anything launched into the air and left to gravity. Horizontal motion stays ' +
                 'constant while vertical motion is pure free fall, and the two combine into a parabola.',
            math: 'Maximum range at a 45° launch angle',
            eg: 'A bullet fired horizontally and a bullet simply dropped from the same height hit the ground ' +
                '<b>at the same instant</b> — sideways speed does not delay the fall.'
        },
        {
            term: 'Why Astronauts Float',
            def: 'Not because gravity is missing. At the Space Station’s altitude gravity is still about 90% ' +
                 'as strong as at sea level. The station and everyone in it are falling around the Earth ' +
                 'together — continuous free fall, which we call orbit.',
            math: 'Orbit = falling sideways fast enough to keep missing the ground',
            eg: 'The ISS falls toward Earth constantly while travelling at <b>7.66 km/s</b>, so it curves ' +
                'around the planet instead of hitting it — one lap every <b>90 minutes</b>.'
        }
    ];

    /* Boot-time status lines, purely cosmetic. */
    var BOOT_STEPS = [
        'Calibrating gravimetric array',
        'Spinning up inertial dampers',
        'Charting the ascent path',
        'Seeding star shards',
        'Ready for launch'
    ];

    global.GQ_DATA = {
        CONFIG: CONFIG,
        RIDDLES: RIDDLES,
        LEARN: LEARN,
        BOOT_STEPS: BOOT_STEPS
    };
})(window);
