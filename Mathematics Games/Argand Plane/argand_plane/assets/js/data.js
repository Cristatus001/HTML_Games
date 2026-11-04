/* Mirror River City — content and rules.
 * The question bank is copied unchanged from the original "Argand Plane (Simulation).html".
 * Task wording comes from the "Games and simulations (Complex Numbers)" deck, slides 1-4. */
(function () {
  'use strict';
  var AP = (window.AP = window.AP || {});

  AP.DATA = {
    LEVEL_TIME: 90,          // seconds per sector (original: 90)
    MODULUS_POINTS: 100,     // Task 2 reward (original: +100)
    STABILIZE_POINTS: 500,   // Task 3 reward (original: +500)
    TIME_BONUS_PER_SEC: 10,  // original: floor(timeLeft * 10)
    MODULUS_TOLERANCE: 0.05, // original tolerance
    ASSIST_AFTER: 45,        // seconds on one find-task before the house starts pulsing (free)
    INTRO_MS: 1700,          // entrance animation, input locked
    WORLD_LIMIT: 24,         // the car cannot leave |x|,|y| <= 24

    // Original questionBank, level by level. [a, b] means z = a + ib.
    QUESTION_BANK: {
      1: [[3, 4], [4, 3]],
      2: [[6, 8], [8, 6]],
      3: [[12, 5], [5, 12]],
      4: [
        [3, -4], [5, -12], [6, -8],
        [-3, 4], [-5, 12], [-6, 8],
        [-4, 3], [4, -3], [8, -6],
        [-8, 6], [-12, 5], [12, -5]
      ],
      5: [
        [8, 15], [15, 8],
        [-8, 15], [8, -15],
        [-15, 8], [15, -8],
        [-8, -15], [-15, -8]
      ]
    },

    SECTORS: [
      { id: 1, name: 'Lantern Quay',  blurb: 'First quadrant, small steps.' },
      { id: 2, name: 'Copper Bridge', blurb: 'First quadrant, longer drives.' },
      { id: 3, name: 'Willow Bend',   blurb: 'Tall and wide triangles.' },
      { id: 4, name: 'Four Quarters', blurb: 'Negative parts: every quadrant.' },
      { id: 5, name: 'Far Shore',     blurb: 'Big numbers, all four quadrants.' }
    ],

    // Slide 1-4 of the deck: the simulation has three tasks.
    TASKS: [
      { id: 1, short: 'Plot z',  title: 'Task 1: Plot the complex number', icon: 'target' },
      { id: 2, short: 'Find |z|', title: 'Task 2: Find the modulus',       icon: 'ruler' },
      { id: 3, short: 'Find z̄', title: 'Task 3: Reach the conjugate', icon: 'mirror' }
    ],

    // "Instruction to the player" boxes from the deck (slides 2 and 4).
    INSTRUCTIONS: {
      1: 'Locate the failing power station. Drive to locate the failing house at coordinates <span class="z">z = a + ib</span>.',
      2: 'Reboot the station: calculate its modulus <span class="z">|z| = √(a² + b²)</span>.',
      3: 'For <span class="z">z = a + ib</span>, reflect across the real axis to locate the conjugate coordinate <span class="z"><span class="bar">z</span> = a − ib</span>. Drive to the conjugate house to finish stabilizing the sector before time runs out!'
    }
  };

  /* ---------- helpers ---------- */
  var MINUS = '−';
  function num(n) { return n < 0 ? MINUS + Math.abs(n) : String(n); }

  // "3 + 4i", "3 − 4i", "−3 + i", "4i", "0"
  AP.fmtZ = function (a, b) {
    if (b === 0) return num(a);
    var mag = Math.abs(b) === 1 ? 'i' : Math.abs(b) + 'i';
    if (a === 0) return (b < 0 ? MINUS : '') + mag;
    return num(a) + (b < 0 ? ' ' + MINUS + ' ' : ' + ') + mag;
  };
  AP.num = num;
})();
