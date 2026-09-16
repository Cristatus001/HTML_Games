/* ==========================================================================
   levels.js — the ten real-life case files.

   Vector geometry, tolerances and verdict text are unchanged from the original
   build. `setup(cx, cy)` returns absolute coordinates; the game calls it with
   (0, 0) to obtain offsets relative to the centre of the play area so it can
   scale uniformly for small screens without altering any outcome.
   ========================================================================== */
var LEVELS = [
  {
    title: "The Rain Drops",
    desc: "One drop in your yard, one in the neighbor's.<br>Both fall straight down, same speed.",
    icon: "icon/rain",
    scene: "rain",
    kind: "eq",
    setup: function (cx, cy) {
      return {
        ref: { x: cx - 100, y: cy - 100, dx: 0, dy: 150, lbl: "Neighbor" },
        ply: { x: cx + 100, y: cy - 100, dx: 0, dy: 150, lbl: "My Yard" }
      };
    },
    success: "<b>EQUAL!</b><br>Physics doesn't care whose yard it is."
  },
  {
    title: "The Elevators",
    desc: "Elevator A: Floor 1 to 2.<br>Elevator B: Floor 5 to 6.<br>Both go UP same distance.",
    icon: "icon/elevator",
    scene: "lift",
    kind: "eq",
    setup: function (cx, cy) {
      return {
        ref: { x: cx - 150, y: cy + 50, dx: 0, dy: -120, lbl: "Floors 1-2" },
        ply: { x: cx + 50, y: cy - 50, dx: 0, dy: -120, lbl: "Floors 5-6" }
      };
    },
    success: "<b>EQUAL!</b><br>Change in position is identical."
  },
  {
    title: "Parallel Driving",
    desc: "You drive 60 km/h East.<br>Car next to you drives 60 km/h East.",
    icon: "icon/car",
    scene: "road",
    kind: "eq",
    setup: function (cx, cy) {
      return {
        ref: { x: cx - 150, y: cy - 50, dx: 200, dy: 0, lbl: "Lane 1" },
        ply: { x: cx - 150, y: cy + 50, dx: 200, dy: 0, lbl: "Lane 2" }
      };
    },
    success: "<b>EQUAL!</b><br>Same speed + Same Direction."
  },
  {
    title: "Team Lifting",
    desc: "You lift Left side (50lbs). Friend lifts Right side (50lbs).",
    icon: "icon/sofa",
    scene: "room",
    kind: "eq",
    setup: function (cx, cy) {
      return {
        ref: { x: cx - 100, y: cy + 100, dx: 0, dy: -100, lbl: "Person A" },
        ply: { x: cx + 100, y: cy + 100, dx: 0, dy: -100, lbl: "Person B" }
      };
    },
    success: "<b>EQUAL!</b><br>Same force applied to the same direction."
  },
  {
    title: "Piano Keys",
    desc: "Pressing 'Low C' vs 'High C' with the same finger strength.",
    icon: "icon/press",
    scene: "piano",
    kind: "eq",
    setup: function (cx, cy) {
      return {
        ref: { x: cx - 150, y: cy, dx: 0, dy: 60, lbl: "Key 1" },
        ply: { x: cx + 150, y: cy, dx: 0, dy: 60, lbl: "Key 2" }
      };
    },
    success: "<b>EQUAL!</b>"
  },
  {
    title: "Escalators",
    desc: "The UP Escalator vs The DOWN Escalator.",
    icon: "icon/escalator",
    scene: "escalator",
    kind: "ne",
    setup: function (cx, cy) {
      return {
        ref: { x: cx - 100, y: cy + 100, dx: 100, dy: -100, lbl: "Up" },
        ply: { x: cx + 100, y: cy - 100, dx: -100, dy: 100, lbl: "Down" }
      };
    },
    failDir: "<b>NOT EQUAL.</b><br>Opposite directions (180&deg; difference).",
    failMag: ""
  },
  {
    title: "Marching Band",
    desc: "Person A walks Forward. Person B walks Right.",
    icon: "icon/drum",
    scene: "field",
    kind: "ne",
    setup: function (cx, cy) {
      return {
        ref: { x: cx - 50, y: cy + 100, dx: 0, dy: -150, lbl: "Forward" },
        ply: { x: cx - 100, y: cy, dx: 150, dy: 0, lbl: "Right" }
      };
    },
    failDir: "<b>NOT EQUAL.</b><br>Angles are different.",
    failMag: ""
  },
  {
    title: "The Swimmers",
    desc: "Swimmers in Lane 1 and Lane 8, perfectly synced.",
    icon: "icon/swimmer",
    scene: "pool",
    kind: "eq",
    setup: function (cx, cy) {
      return {
        ref: { x: cx - 150, y: cy - 120, dx: 250, dy: 0, lbl: "Lane 1" },
        ply: { x: cx - 150, y: cy + 80, dx: 250, dy: 0, lbl: "Lane 8" }
      };
    },
    success: "<b>EQUAL!</b>"
  },
  {
    title: "Dog Walking",
    desc: "You walk North. Dog pulls North-East.",
    icon: "icon/dog",
    scene: "park",
    kind: "ne",
    setup: function (cx, cy) {
      return {
        ref: { x: cx - 50, y: cy + 150, dx: 0, dy: -200, lbl: "You" },
        ply: { x: cx + 50, y: cy + 150, dx: 60, dy: -190, lbl: "Dog" }
      };
    },
    failDir: "<b>NOT EQUAL.</b><br>Precision matters.",
    failMag: ""
  },
  {
    title: "Cars: Speed Check",
    desc: "Fast Car vs Slow Car. Same Direction.",
    icon: "icon/racecar",
    scene: "highway",
    kind: "ne",
    setup: function (cx, cy) {
      return {
        ref: { x: cx - 150, y: cy - 60, dx: 250, dy: 0, lbl: "Fast" },
        ply: { x: cx - 150, y: cy + 60, dx: 100, dy: 0, lbl: "Slow" }
      };
    },
    failMag: "<b>NOT EQUAL.</b><br>Speed (Magnitude) differs.",
    failDir: ""
  }
];
