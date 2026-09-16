/* ==========================================================================
   levels.js - the ten missions.

   All geometry is in VIRTUAL FIELD UNITS on a 1000 x 620 field which is scaled
   to whatever screen the player has, so a distance reading means the same thing
   on a phone and on a desktop. (The original build measured in raw pixels, so
   its numbers changed when you resized the window.)

   THE ECONOMY: displacement is fixed by where the mission puts the two pads.
   The only quantity the player authors is EXCESS distance, d - |dr|. Every
   mechanic below either taxes that excess (fuel, timers, storm floor) or forces
   it (spires, crystals, gates you must wait out).

   hazards
     spire  {x,y,r}                          always lethal, fixed
     gate   {x,y,r,period,duty,phase}        lethal only while charged
     mover  {x0,y0,x1,y1,r,period,phase}     slides between two points
   wind     {x,y}                            added to thrust every frame
   ========================================================================== */
'use strict';

var FIELD = { w: 1000, h: 620 };

var LEVELS = [
  {
    id: 1, name: 'FIRST FLIGHT', mechanic: 'Flight',
    brief: 'Lift off from the blue pad and set down on the gold one.',
    nova: 'Wreck confirmed. Get airborne and put her down on the gold pad.',
    teach: 'Your glowing trail is the DISTANCE you flew. The red laser is your DISPLACEMENT - the straight line from start to finish. They are almost never the same number.',
    launch: { x: 150, y: 470 }, pad: { x: 850, y: 170 },
    islands: [{ x: 520, y: 120, r: 34 }, { x: 330, y: 250, r: 28 }, { x: 700, y: 430, r: 30 }],
    crystals: [], need: 0, hazards: [], wind: null, fog: false, loop: false,
    fuel: 1500, parTime: 14, starE: [0.88, 0.96]
  },

  {
    id: 2, name: 'THE WRECK', mechanic: 'Origin beacon',
    brief: 'Report your position before you fly. Drop a beacon, then read your vector r.',
    nova: 'Position is measured FROM something. Drop a beacon and say from where.',
    teach: 'A position vector r points from a chosen ORIGIN to you. Move the origin and r changes completely - even though you never moved. That is why you always state your reference point.',
    launch: { x: 180, y: 300 }, pad: { x: 830, y: 420 },
    islands: [{ x: 500, y: 180, r: 32 }, { x: 640, y: 520, r: 26 }],
    crystals: [], need: 0, hazards: [], wind: null, fog: false, loop: false,
    beaconsRequired: 2,
    fuel: 1500, parTime: 16, starE: [0.86, 0.94]
  },

  {
    id: 3, name: 'THE SPIRE', mechanic: 'Obstacle',
    brief: 'A dead spire sits square on the straight line. Fly around it.',
    nova: 'The short way is a wall. Go around - and mind the cost.',
    teach: 'Distance can never be less than displacement. When the direct line is blocked, distance MUST exceed it. The inequality d >= |dr| is not a rule of thumb, it is geometry.',
    launch: { x: 130, y: 310 }, pad: { x: 880, y: 310 },
    islands: [{ x: 300, y: 120, r: 26 }, { x: 700, y: 500, r: 26 }],
    crystals: [], need: 0,
    hazards: [{ type: 'spire', x: 500, y: 310, r: 105 }],
    wind: null, fog: false, loop: false,
    fuel: 1400, parTime: 16, starE: [0.80, 0.89]
  },

  {
    id: 4, name: 'CRYSTAL RUN', mechanic: 'Cargo',
    brief: 'Collect 3 sky crystals on the way. They are nowhere near the straight line.',
    nova: 'Cargo pays. Cargo also costs. Your call, pilot.',
    teach: 'Every detour added DISTANCE. Look at the laser - it did not move a single unit. Displacement only knows where you started and where you stopped.',
    launch: { x: 140, y: 330 }, pad: { x: 870, y: 330 },
    islands: [{ x: 500, y: 560, r: 30 }, { x: 500, y: 90, r: 30 }],
    crystals: [{ x: 330, y: 120 }, { x: 500, y: 540 }, { x: 690, y: 130 }, { x: 250, y: 480 }, { x: 780, y: 520 }],
    need: 3, hazards: [], wind: null, fog: false, loop: false,
    fuel: 1900, parTime: 22, starE: [0.55, 0.66]
  },

  {
    id: 5, name: 'STORM GATE', mechanic: 'Timed gate',
    brief: 'The gate is only safe while it is dark. Arriving early kills you.',
    nova: 'You cannot hover for free out here. Time is bought with path.',
    teach: 'To WAIT you had to spend distance - a holding loop is a clock. So a longer route is not always a worse route. Sometimes the extra distance is the whole point.',
    launch: { x: 120, y: 310 }, pad: { x: 880, y: 310 },
    islands: [{ x: 500, y: 560, r: 32 }, { x: 260, y: 130, r: 24 }],
    crystals: [], need: 0,
    hazards: [{ type: 'gate', x: 500, y: 310, r: 88, period: 4.2, duty: 0.5, phase: 0.12 }],
    wind: null, thermal: 26, fog: false, loop: false,
    fuel: 2100, parTime: 26, starE: [0.62, 0.76]
  },

  {
    id: 6, name: 'CROSSWIND', mechanic: 'Vector addition',
    brief: 'A steady wind is pushing you. Point at the pad and you will miss it.',
    nova: 'Feel that? Aim upwind, not at the target.',
    teach: 'Your thrust and the wind ADD as vectors. Where you actually go is the sum of the two arrows, never the one you pointed. That is vector addition in your thumbs.',
    launch: { x: 130, y: 500 }, pad: { x: 870, y: 160 },
    islands: [{ x: 500, y: 320, r: 34 }],
    crystals: [{ x: 500, y: 200 }, { x: 340, y: 400 }], need: 0,
    hazards: [], wind: { x: 0, y: -78 }, fog: false, loop: false,
    fuel: 1800, parTime: 22, starE: [0.76, 0.88]
  },

  {
    id: 7, name: 'THE LOOP', mechanic: 'Zero displacement',
    brief: 'Collect all 4 crystals and land back on the pad you launched from.',
    nova: 'Round trip. Bring the cargo home.',
    teach: 'You flew a long way and your displacement is ZERO. Distance counts every unit you travelled. Displacement only compares two points - and yours were the same point.',
    launch: { x: 500, y: 320 }, pad: { x: 500, y: 320 },
    islands: [{ x: 180, y: 140, r: 26 }, { x: 820, y: 140, r: 26 }, { x: 180, y: 500, r: 26 }, { x: 820, y: 500, r: 26 }],
    crystals: [{ x: 180, y: 140 }, { x: 820, y: 140 }, { x: 820, y: 500 }, { x: 180, y: 500 }],
    need: 4, hazards: [], wind: null, fog: false, loop: true,
    fuel: 2600, parTime: 30, starD: [1500, 1800]
  },

  {
    id: 8, name: 'TWO FRAMES', mechanic: 'Frame independence',
    brief: 'Two beacons are live. Fly the displacement written on your orders, and land anywhere that satisfies it.',
    nova: 'Both beacons disagree about where you are. Neither is wrong.',
    teach: 'The two beacons reported different position vectors for the same ship. But your DISPLACEMENT read the same from both, because the origin cancels out when you subtract. Displacement belongs to the world, not to the frame.',
    launch: { x: 180, y: 470 }, pad: null,
    targetDisp: { x: 560, y: -260 }, dispTol: 34,
    beacons: [{ x: 120, y: 120 }, { x: 880, y: 540 }],
    islands: [{ x: 500, y: 300, r: 30 }, { x: 700, y: 160, r: 26 }],
    crystals: [], need: 0, hazards: [], wind: null, fog: false, loop: false,
    fuel: 1800, parTime: 22, starE: [0.82, 0.93]
  },

  {
    id: 9, name: 'FOG BANK', mechanic: 'Dead reckoning',
    brief: 'You cannot see the field. Fly on your instruments.',
    nova: 'No horizon. Fly the numbers, pilot.',
    teach: 'With no landmarks you navigated by your displacement readout alone. That is dead reckoning - and it works because displacement is a vector: a size AND a direction from a known start.',
    launch: { x: 140, y: 480 }, pad: { x: 860, y: 180 },
    islands: [{ x: 420, y: 250, r: 30 }, { x: 640, y: 430, r: 28 }],
    crystals: [{ x: 500, y: 330 }], need: 1,
    hazards: [{ type: 'spire', x: 300, y: 200, r: 74 }, { type: 'spire', x: 690, y: 300, r: 74 }],
    wind: null, fog: true, loop: false,
    fuel: 2000, parTime: 26, starE: [0.70, 0.82]
  },

  {
    id: 10, name: 'THE MAELSTROM', mechanic: 'Everything',
    brief: 'Moving islands, two gates out of phase, a reversing wind and a rising storm floor. Get to the summit.',
    nova: 'Straight line to the summit. Nothing fancy. GO.',
    teach: 'Position depends on the origin you chose. Distance counts your whole route. Displacement counts only the endpoints. You have flown all three - you are a Vector Master.',
    launch: { x: 110, y: 540 }, pad: { x: 890, y: 90 },
    islands: [{ x: 500, y: 300, r: 30 }],
    crystals: [{ x: 300, y: 380 }, { x: 500, y: 200 }, { x: 700, y: 400 }], need: 3,
    hazards: [
      { type: 'gate', x: 360, y: 300, r: 80, period: 4.0, duty: 0.48, phase: 0 },
      { type: 'gate', x: 680, y: 250, r: 80, period: 4.6, duty: 0.48, phase: 0.5 },
      { type: 'mover', x0: 520, y0: 90, x1: 520, y1: 520, r: 62, period: 5.2, phase: 0 }
    ],
    wind: { x: 62, y: 0 }, windReverse: 5.5, thermal: 20, fog: false, loop: false,
    stormRise: 15,
    fuel: 2600, parTime: 34, starE: [0.62, 0.74]
  }
];

if (typeof module !== 'undefined' && module.exports) module.exports = { LEVELS: LEVELS, FIELD: FIELD };
