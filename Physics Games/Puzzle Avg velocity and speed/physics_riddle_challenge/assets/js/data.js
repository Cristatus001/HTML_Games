/* ==========================================================================
   Physics Riddle Challenge - content
   The three riddles, their options and every feedback line are reproduced
   verbatim from the original build; only the markup around them changed.

   Options carry no A/B/C/D letter: game.js shuffles each riddle's options per
   run and letters them by screen position. Every `reveal` line therefore names
   the answer in words rather than by letter, so it reads correctly wherever
   the option lands. Exactly one option per riddle has `correct: true`.
   ========================================================================== */
(function (global) {
    'use strict';

    var ICONS = 'assets/images/ui/emoji/';

    var RIDDLES = [
        {
            id: 'trial-1',
            index: 1,
            codename: 'The Pathless Number',
            tag: 'Scalar Trial',
            icon: ICONS + 'scalar.png',
            iconAlt: 'Glowing magnitude orb above a measuring bar',
            question: 'I only care about the total path you take, divided by the time it took. I have a size, but no direction to my name. <strong>What am I?</strong>',
            options: [
                {
                    label: 'Average Velocity',
                    correct: false,
                    reveal: '<strong>Not quite!</strong> Average Velocity <em>must</em> have a direction (e.g., &ldquo;5 mph North&rdquo;), because it&rsquo;s based on displacement, not distance.'
                },
                {
                    label: 'Average Speed',
                    correct: true,
                    reveal: '<strong>Correct!</strong> <strong>Average Speed</strong> is a scalar quantity, meaning it only has size (magnitude). It&rsquo;s calculated as Total Distance / Total Time.'
                },
                {
                    label: 'Acceleration',
                    correct: false,
                    reveal: '<strong>Incorrect.</strong> Acceleration is the <em>rate of change</em> of velocity. This riddle is describing a rate of change of distance.'
                },
                {
                    label: 'Displacement',
                    correct: false,
                    reveal: '<strong>Incorrect.</strong> Displacement is just the change in position (like &ldquo;5 miles North&rdquo;) and doesn&rsquo;t include time.'
                }
            ]
        },
        {
            id: 'trial-2',
            index: 2,
            codename: 'The Straight-Line Truth',
            tag: 'Vector Trial',
            icon: ICONS + 'vector.png',
            iconAlt: 'Arrow pointing up and to the right from an origin dot',
            question: 'I look at where you start and where you end; your shortest path is my only friend. Divide by time, and my value is found. With both size and direction, I am sound. <strong>What am I?</strong>',
            options: [
                {
                    label: 'Average Speed',
                    correct: false,
                    reveal: '<strong>Incorrect.</strong> Average speed uses the <em>total distance</em> traveled, not the &ldquo;shortest path&rdquo; (displacement).'
                },
                {
                    label: 'Distance',
                    correct: false,
                    reveal: '<strong>Not quite.</strong> Distance is just the length of the path (like &ldquo;10 miles&rdquo;) and doesn&rsquo;t include time or direction.'
                },
                {
                    label: 'Average Velocity',
                    correct: true,
                    reveal: '<strong>Exactly!</strong> <strong>Average Velocity</strong> is a vector quantity (size and direction). It&rsquo;s calculated as Displacement (&ldquo;shortest path&rdquo;) / Total Time.'
                },
                {
                    label: 'Time',
                    correct: false,
                    reveal: '<strong>Incorrect.</strong> Time is what you divide by to find velocity, it&rsquo;s not the velocity itself.'
                }
            ]
        },
        {
            id: 'trial-3',
            index: 3,
            codename: 'The Zero Lap',
            tag: 'Track Trial',
            icon: ICONS + 'track.png',
            iconAlt: 'Oval running track seen from above',
            question: 'A runner jogs 2 laps around a 400-meter track, finishing in 200 seconds. I am zero, but my partner is 4 m/s. <strong>What am I?</strong>',
            options: [
                {
                    label: 'The Average Speed',
                    correct: false,
                    reveal: '<strong>Incorrect.</strong> The Average Speed is 4 m/s (800m / 200s). The riddle says &ldquo;I am zero.&rdquo;'
                },
                {
                    label: 'The Total Distance',
                    correct: false,
                    reveal: '<strong>Incorrect.</strong> The Total Distance is 800 meters (2 laps * 400m). This is not zero.'
                },
                {
                    label: 'The Acceleration',
                    correct: false,
                    reveal: '<strong>Incorrect.</strong> We don&rsquo;t know if the runner&rsquo;s speed changed, so we can&rsquo;t be sure about acceleration. But the average velocity is definitely zero.'
                },
                {
                    label: 'The Average Velocity',
                    correct: true,
                    reveal: '<strong>That&rsquo;s it!</strong> The runner starts and ends at the exact same point, so their <strong>Displacement is 0 meters</strong>. Since Average Velocity = Displacement / Time, the average velocity is 0 m/s. The &ldquo;partner&rdquo; (Average Speed) is Total Distance (2 laps * 400m = 800m) / 200s = 4 m/s.'
                }
            ]
        }
    ];

    /* Reference material — deliberately kept away from the gameplay help.
       This lives behind "Learn More" on the results screen only. */
    var LEARN = [
        {
            title: 'Scalar vs. Vector',
            icon: ICONS + 'scalar.png',
            body: 'A <strong>scalar</strong> has magnitude only — 60 km/h, 800 m, 200 s. A <strong>vector</strong> has magnitude <em>and</em> direction — 60 km/h due north, 800 m east. Speed is a scalar. Velocity is a vector. Every riddle in this challenge turns on that single distinction.'
        },
        {
            title: 'Distance vs. Displacement',
            icon: ICONS + 'track.png',
            body: '<strong>Distance</strong> is the whole length of the path actually travelled, and it never decreases. <strong>Displacement</strong> is the straight line from start point to end point, with a direction attached. Walk 3 m east then 4 m north: distance = 7 m, displacement = 5 m north-east.'
        },
        {
            title: 'The Two Formulas',
            icon: ICONS + 'stopwatch.png',
            body: '<span class="formula">Average speed = <em>total distance</em> &divide; <em>total time</em></span><span class="formula">Average velocity = <em>displacement</em> &divide; <em>total time</em></span>Same denominator, different numerator. That is the entire difference, and it is why the two answers can disagree so violently.'
        },
        {
            title: 'Worked Example: The Closed Loop',
            icon: ICONS + 'runner.png',
            body: 'A runner covers 2 laps of a 400 m track in 200 s and stops on the start line.<br>Distance = 2 &times; 400 = 800 m, so average speed = 800 &divide; 200 = <strong>4 m/s</strong>.<br>Displacement = 0 m (start and finish coincide), so average velocity = 0 &divide; 200 = <strong>0 m/s</strong>.'
        },
        {
            title: 'Worked Example: The Return Trip',
            icon: ICONS + 'vector.png',
            body: 'Drive 120 km east in 2 h, then 120 km back west in 3 h.<br>Distance = 240 km over 5 h &rarr; average speed = <strong>48 km/h</strong>.<br>Displacement = 0 km &rarr; average velocity = <strong>0 km/h</strong>. The car definitely moved; the vector simply came home.'
        },
        {
            title: 'Rules Worth Memorising',
            icon: ICONS + 'beacon.png',
            body: '<ul><li>|average velocity| is never greater than average speed.</li><li>They are equal only for motion in a straight line that never reverses.</li><li>Average speed is <em>not</em> the average of the speeds unless each leg takes the same time.</li><li>Average velocity is zero for any journey that returns to its starting point, however long.</li></ul>'
        },
        {
            title: 'Traps Examiners Love',
            icon: ICONS + 'target.png',
            body: 'Asking for &ldquo;average velocity&rdquo; on a closed circuit (answer: zero). Quoting a speed without a direction and calling it velocity. Averaging 40 km/h and 60 km/h to get 50 km/h over equal <em>distances</em> — the correct answer there is 48 km/h, because the slower leg takes longer.'
        }
    ];

    /* Gameplay-only help, shown from the main menu. */
    var HOWTO = [
        {
            icon: ICONS + 'briefing.png',
            title: 'Objective',
            text: 'Three riddles guard the lab. Each one describes a motion quantity in disguise. Name it correctly to clear the trial and unlock the next one.'
        },
        {
            icon: ICONS + 'play.png',
            title: 'Answering',
            text: 'Tap or click an answer plate — or press keys 1 to 4, or A to D. Press Enter to confirm the highlighted plate when using a keyboard.'
        },
        {
            icon: ICONS + 'cross.png',
            title: 'Wrong Answers',
            text: 'A wrong pick is never fatal. You get an explanation of why it fails and you may try again straight away. Clearing a trial with no wrong picks earns a gold star.'
        },
        {
            icon: ICONS + 'close.png',
            title: 'Reset Plate',
            text: 'The reset button on the riddle panel clears your current pick and its feedback so you can approach the riddle fresh.'
        },
        {
            icon: ICONS + 'next.png',
            title: 'Advancing',
            text: 'Once a trial is solved the Next control lights up. Clear all three to finish the run and open the debrief.'
        },
        {
            icon: ICONS + 'settings.png',
            title: 'Comfort',
            text: 'Music, sound effects and interface scale live in Settings. Progress and stars save to this device automatically.'
        }
    ];

    global.PRC_DATA = {
        riddles: RIDDLES,
        learn: LEARN,
        howto: HOWTO,
        icons: ICONS
    };
})(window);
