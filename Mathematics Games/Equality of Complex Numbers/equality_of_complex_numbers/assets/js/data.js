/* Twin-Seal Tomb: content.
   The question bank, room times and narrator lines are copied from the original
   "Equality of complex numbers (Simulation).html". One answer key is corrected
   (room 4: 5x + i(3x + y) = 20 + i11 gives y = -1, the original expected 1). */
(function () {
  'use strict';

  var QUESTIONS = {
    1: [
      { display: "3x + i7 = 15 + i7", parts: [["3x","real"], ["15","real"], ["7","imag"], ["7","imag"]], eqReal: "3x = 15", eqImag: "7 = 7", ans: {x:5} },
      { display: "5x + i3 = 25 + i3", parts: [["5x","real"], ["25","real"], ["3","imag"], ["3","imag"]], eqReal: "5x = 25", eqImag: "3 = 3", ans: {x:5} },
      { display: "6x - 3 + i4 = 15 + i4", parts: [["6x-3","real"], ["15","real"], ["4","imag"], ["4","imag"]], eqReal: "6x - 3 = 15", eqImag: "4 = 4", ans: {x:3} },
      { display: "7x + i9 = 28 + i9", parts: [["7x","real"], ["28","real"], ["9","imag"], ["9","imag"]], eqReal: "7x = 28", eqImag: "9 = 9", ans: {x:4} },
      { display: "x + 7 + i5 = 13 + i5", parts: [["x+7","real"], ["13","real"], ["5","imag"], ["5","imag"]], eqReal: "x + 7 = 13", eqImag: "5 = 5", ans: {x:6} },
      { display: "9x - 4 + i3 = 23 + i3", parts: [["9x-4","real"], ["23","real"], ["3","imag"], ["3","imag"]], eqReal: "9x - 4 = 23", eqImag: "3 = 3", ans: {x:3} },
      { display: "2x + 1 + i4 = 9 + i4", parts: [["2x+1","real"], ["9","real"], ["4","imag"], ["4","imag"]], eqReal: "2x + 1 = 9", eqImag: "4 = 4", ans: {x:4} },
      { display: "4x - 5 + i2 = 11 + i2", parts: [["4x-5","real"], ["11","real"], ["2","imag"], ["2","imag"]], eqReal: "4x - 5 = 11", eqImag: "2 = 2", ans: {x:4} },
      { display: "x + 9 + i4 = 15 + i4", parts: [["x+9","real"], ["15","real"], ["4","imag"], ["4","imag"]], eqReal: "x + 9 = 15", eqImag: "4 = 4", ans: {x:6} },
      { display: "3x + 4 + i7 = 25 + i7", parts: [["3x+4","real"], ["25","real"], ["7","imag"], ["7","imag"]], eqReal: "3x + 4 = 25", eqImag: "7 = 7", ans: {x:7} }
    ],
    2: [
      { display: "2x + i(4y + 3) = 14 + i11", parts: [["2x","real"], ["14","real"], ["4y+3","imag"], ["11","imag"]], eqReal: "2x = 14", eqImag: "4y + 3 = 11", ans: {x:7, y:2} },
      { display: "5x + i(y - 2) = 25 + i7", parts: [["5x","real"], ["25","real"], ["y-2","imag"], ["7","imag"]], eqReal: "5x = 25", eqImag: "y - 2 = 7", ans: {x:5, y:9} },
      { display: "9x + i(3y + 5) = 27 + i17", parts: [["9x","real"], ["27","real"], ["3y+5","imag"], ["17","imag"]], eqReal: "9x = 27", eqImag: "3y + 5 = 17", ans: {x:3, y:4} },
      { display: "x + i(y - 7) = 3 + i1", parts: [["x","real"], ["3","real"], ["y-7","imag"], ["1","imag"]], eqReal: "x = 3", eqImag: "y - 7 = 1", ans: {x:3, y:8} },
      { display: "4x + i(6y - 2) = 12 + i22", parts: [["4x","real"], ["12","real"], ["6y-2","imag"], ["22","imag"]], eqReal: "4x = 12", eqImag: "6y - 2 = 22", ans: {x:3, y:4} },
      { display: "3x + i(2y + 4) = 9 + i10", parts: [["3x","real"], ["9","real"], ["2y+4","imag"], ["10","imag"]], eqReal: "3x = 9", eqImag: "2y + 4 = 10", ans: {x:3, y:3} },
      { display: "6x + i(y + 8) = 24 + i15", parts: [["6x","real"], ["24","real"], ["y+8","imag"], ["15","imag"]], eqReal: "6x = 24", eqImag: "y + 8 = 15", ans: {x:4, y:7} },
      { display: "7x + i(4y - 3) = 28 + i13", parts: [["7x","real"], ["28","real"], ["4y-3","imag"], ["13","imag"]], eqReal: "7x = 28", eqImag: "4y - 3 = 13", ans: {x:4, y:4} },
      { display: "2x + i(5y + 1) = 6 + i26", parts: [["2x","real"], ["6","real"], ["5y+1","imag"], ["26","imag"]], eqReal: "2x = 6", eqImag: "5y + 1 = 26", ans: {x:3, y:5} },
      { display: "5x + i(3y - 4) = 15 + i11", parts: [["5x","real"], ["15","real"], ["3y-4","imag"], ["11","imag"]], eqReal: "5x = 15", eqImag: "3y - 4 = 11", ans: {x:3, y:5} }
    ],
    3: [
      { display: "x + 4 + i(2y + 9) = 10 + i25", parts: [["x+4","real"], ["10","real"], ["2y+9","imag"], ["25","imag"]], eqReal: "x + 4 = 10", eqImag: "2y + 9 = 25", ans: {x:6, y:8} },
      { display: "x - 5 + i(7y - 2) = 3 + i12", parts: [["x-5","real"], ["3","real"], ["7y-2","imag"], ["12","imag"]], eqReal: "x - 5 = 3", eqImag: "7y - 2 = 12", ans: {x:8, y:2} },
      { display: "x + 6 + i(3y + 4) = 9 + i16", parts: [["x+6","real"], ["9","real"], ["3y+4","imag"], ["16","imag"]], eqReal: "x + 6 = 9", eqImag: "3y + 4 = 16", ans: {x:3, y:4} },
      { display: "x - 7 + i(5y + 1) = 2 + i11", parts: [["x-7","real"], ["2","real"], ["5y+1","imag"], ["11","imag"]], eqReal: "x - 7 = 2", eqImag: "5y + 1 = 11", ans: {x:9, y:2} },
      { display: "x + 1 + i(2y - 3) = 8 + i7", parts: [["x+1","real"], ["8","real"], ["2y-3","imag"], ["7","imag"]], eqReal: "x + 1 = 8", eqImag: "2y - 3 = 7", ans: {x:7, y:5} },
      { display: "x - 10 + i(4y + 2) = 3 + i14", parts: [["x-10","real"], ["3","real"], ["4y+2","imag"], ["14","imag"]], eqReal: "x - 10 = 3", eqImag: "4y + 2 = 14", ans: {x:13, y:3} },
      { display: "x + 18 + i(6y - 5) = 22 + i7", parts: [["x+18","real"], ["22","real"], ["6y-5","imag"], ["7","imag"]], eqReal: "x + 18 = 22", eqImag: "6y - 5 = 7", ans: {x:4, y:2} },
      { display: "x - 2 + i(3y + 6) = 10 + i18", parts: [["x-2","real"], ["10","real"], ["3y+6","imag"], ["18","imag"]], eqReal: "x - 2 = 10", eqImag: "3y + 6 = 18", ans: {x:12, y:4} },
      { display: "x + 9 + i(5y - 7) = 24 + i8", parts: [["x+9","real"], ["24","real"], ["5y-7","imag"], ["8","imag"]], eqReal: "x + 9 = 24", eqImag: "5y - 7 = 8", ans: {x:15, y:3} },
      { display: "x - 4 + i(7y + 3) = 12 + i24", parts: [["x-4","real"], ["12","real"], ["7y+3","imag"], ["24","imag"]], eqReal: "x - 4 = 12", eqImag: "7y + 3 = 24", ans: {x:16, y:3} }
    ],
    4: [
      { display: "5x + i(2x - y) = 15 + i4", parts: [["5x","real"], ["15","real"], ["2x-y","imag"], ["4","imag"]], eqReal: "5x = 15 (so x=3)", eqImag: "2x - y = 4", ans: {x:3, y:2} },
      { display: "3x + i(4x - 2y) = 9 + i12", parts: [["3x","real"], ["9","real"], ["4x-2y","imag"], ["12","imag"]], eqReal: "3x = 9 (so x=3)", eqImag: "4x - 2y = 12", ans: {x:3, y:0} },
      { display: "6x + i(3x + y) = 18 + i5", parts: [["6x","real"], ["18","real"], ["3x+y","imag"], ["5","imag"]], eqReal: "6x = 18 (so x=3)", eqImag: "3x + y = 5", ans: {x:3, y:-4} },
      { display: "2x + i(5x - y) = 10 + i7", parts: [["2x","real"], ["10","real"], ["5x-y","imag"], ["7","imag"]], eqReal: "2x = 10 (so x=5)", eqImag: "5x - y = 7", ans: {x:5, y:18} },
      { display: "7x + i(2x + 3y) = 21 + i9", parts: [["7x","real"], ["21","real"], ["2x+3y","imag"], ["9","imag"]], eqReal: "7x = 21 (so x=3)", eqImag: "2x + 3y = 9", ans: {x:3, y:1} },
      { display: "4x + i(6x - 2y) = 16 + i20", parts: [["4x","real"], ["16","real"], ["6x-2y","imag"], ["20","imag"]], eqReal: "4x = 16 (so x=4)", eqImag: "6x - 2y = 20", ans: {x:4, y:2} },
      // Original key said y: 1. With x = 4: 12 + y = 11, so y = -1.
      { display: "5x + i(3x + y) = 20 + i11", parts: [["5x","real"], ["20","real"], ["3x+y","imag"], ["11","imag"]], eqReal: "5x = 20 (so x=4)", eqImag: "3x + y = 11", ans: {x:4, y:-1} },
      { display: "8x + i(4x - y) = 32 - i3", parts: [["8x","real"], ["32","real"], ["4x-y","imag"], ["-3","imag"]], eqReal: "8x = 32 (so x=4)", eqImag: "4x - y = -3", ans: {x:4, y:19} },
      { display: "3x + i(2x + 4y) = 12 + i16", parts: [["3x","real"], ["12","real"], ["2x+4y","imag"], ["16","imag"]], eqReal: "3x = 12 (so x=4)", eqImag: "2x + 4y = 16", ans: {x:4, y:2} },
      { display: "9x + i(5x - 3y) = 27 + i6", parts: [["9x","real"], ["27","real"], ["5x-3y","imag"], ["6","imag"]], eqReal: "9x = 27 (so x=3)", eqImag: "5x - 3y = 6", ans: {x:3, y:3} }
    ],
    5: [
      { display: "(4x-2y+8) + i(3x+y-6) = 10 + i8", parts: [["4x-2y+8","real"], ["10","real"], ["3x+y-6","imag"], ["8","imag"]], eqReal: "4x-2y+8 = 10", eqImag: "3x+y-6 = 8", ans: {x:3, y:5} },
      { display: "(6x-y+3) + i(2x+3y+10) = 18 + i5", parts: [["6x-y+3","real"], ["18","real"], ["2x+3y+10","imag"], ["5","imag"]], eqReal: "6x-y+3 = 18", eqImag: "2x+3y+10 = 5", ans: {x:2, y:-3} },
      { display: "(3x-4y+8) + i(5x+y-2) = 10 + i9", parts: [["3x-4y+8","real"], ["10","real"], ["5x+y-2","imag"], ["9","imag"]], eqReal: "3x-4y+8 = 10", eqImag: "5x+y-2 = 9", ans: {x:2, y:1} },
      { display: "(7x-2y+1) + i(4x+y-7) = 2 + i0", parts: [["7x-2y+1","real"], ["2","real"], ["4x+y-7","imag"], ["0","imag"]], eqReal: "7x-2y+1 = 2", eqImag: "4x+y-7 = 0", ans: {x:1, y:3} },
      { display: "(5x+y-6) + i(3x-2y+4) = -3 + i11", parts: [["5x+y-6","real"], ["-3","real"], ["3x-2y+4","imag"], ["11","imag"]], eqReal: "5x+y-6 = -3", eqImag: "3x-2y+4 = 11", ans: {x:1, y:-2} },
      { display: "(2x-3y+10) + i(6x+y-5) = 10 + i15", parts: [["2x-3y+10","real"], ["10","real"], ["6x+y-5","imag"], ["15","imag"]], eqReal: "2x-3y+10 = 10", eqImag: "6x+y-5 = 15", ans: {x:3, y:2} },
      { display: "(8x-y-2) + i(3x+4y-8) = -13 + i1", parts: [["8x-y-2","real"], ["-13","real"], ["3x+4y-8","imag"], ["1","imag"]], eqReal: "8x-y-2 = -13", eqImag: "3x+4y-8 = 1", ans: {x:-1, y:3} },
      { display: "(4x+5y-9) + i(2x-y+3) = 0 + i4", parts: [["4x+5y-9","real"], ["0","real"], ["2x-y+3","imag"], ["4","imag"]], eqReal: "4x+5y-9 = 0", eqImag: "2x-y+3 = 4", ans: {x:1, y:1} },
      { display: "(3x-y+11) + i(7x+2y-10) = 22 + i33", parts: [["3x-y+11","real"], ["22","real"], ["7x+2y-10","imag"], ["33","imag"]], eqReal: "3x-y+11 = 22", eqImag: "7x+2y-10 = 33", ans: {x:5, y:4} },
      { display: "(9x-3y+4) + i(5x+y-1) = -20 - i17", parts: [["9x-3y+4","real"], ["-20","real"], ["5x+y-1","imag"], ["-17","imag"]], eqReal: "9x-3y+4 = -20", eqImag: "5x+y-1 = -17", ans: {x:-3, y:-1} }
    ]
  };

  /* time and narrator: from the original config. Everything else is presentation. */
  var ROOMS = [
    null,
    { id: 1, name: 'The Locked Corridor', time: 30, bg: 'room1',
      narrator: 'Welcome to the Complex Number Escape Room.',
      solveLabel: 'Unlock', realLabel: 'Real', imagLabel: 'Imaginary', vars: ['x'] },
    { id: 2, name: 'The Matching Chamber', time: 40, bg: 'room2',
      narrator: 'The room expands. Separate the rings of reality and imagination.',
      solveLabel: 'Align rings', realLabel: 'Real ring', imagLabel: 'Imaginary ring', vars: ['x', 'y'] },
    { id: 3, name: 'The Fog Chamber', time: 50, bg: 'room3', fog: true,
      narrator: 'The fog obscures your vision. Stay focused on the terms.',
      solveLabel: 'Clear fog', realLabel: 'Real', imagLabel: 'Imaginary', vars: ['x', 'y'] },
    { id: 4, name: 'The Misty Gallery', time: 60, bg: 'room4', mist: true,
      narrator: 'Time flows differently here. Substitution is key.',
      solveLabel: 'Solve', realLabel: 'Real', imagLabel: 'Imaginary', vars: ['x', 'y'] },
    { id: 5, name: 'The Master Lock', time: 75, bg: 'room5', master: true,
      narrator: 'The Master Lock. Solve the system to escape.',
      solveLabel: 'Break seal', realLabel: 'Real', imagLabel: 'Imaginary', vars: ['x', 'y'] }
  ];

  var SCORING = {
    base: 100,          // coins for opening a door
    perSecond: 4,       // coins per second left on the hourglass
    hintCost: 15,       // coins taken from the award per hint
    mistakeCost: 10,    // coins taken from the award per mistake
    minAward: 20,
    retryDelay: 3000,   // the original retried a failed room after 3 s
    assistFraction: 0.5 // the free assist appears when half the room time has gone
  };

  /* ---------- maths helpers (pure) ---------- */

  // "4x-2y+8" -> {x:4, y:-2, c:8}
  function lin(expr) {
    var s = String(expr).replace(/\s+/g, '').replace(/−/g, '-');
    var out = { x: 0, y: 0, c: 0 };
    var re = /([+-]?)(\d*)([xy]?)/g, m;
    while ((m = re.exec(s)) !== null) {
      if (m[0] === '') { re.lastIndex++; if (re.lastIndex > s.length) break; continue; }
      var sign = m[1] === '-' ? -1 : 1;
      if (m[3]) out[m[3]] += sign * (m[2] === '' ? 1 : parseInt(m[2], 10));
      else if (m[2] !== '') out.c += sign * parseInt(m[2], 10);
    }
    return out;
  }

  // One part of the equation as a*x + b*y = k
  function partEq(q, type) {
    var lhs = null, rhs = null;
    q.parts.forEach(function (p) {
      if (p[1] !== type) return;
      if (lhs === null) lhs = p[0]; else rhs = p[0];
    });
    var L = lin(lhs), R = lin(rhs);
    return { a: L.x - R.x, b: L.y - R.y, k: R.c - L.c, lhs: lhs, rhs: rhs };
  }

  function check(q) {
    var x = q.ans.x, y = q.ans.y === undefined ? 0 : q.ans.y;
    return ['real', 'imag'].every(function (t) {
      var e = partEq(q, t);
      return e.a * x + e.b * y === e.k;
    });
  }

  window.TST = window.TST || {};
  window.TST.data = { QUESTIONS: QUESTIONS, ROOMS: ROOMS, SCORING: SCORING, lin: lin, partEq: partEq, check: check };
})();
