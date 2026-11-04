/* Twin-Seal Tomb: formatting, hints, worked steps and named mistakes. */
(function () {
  'use strict';
  var D = window.TST.data;
  var MINUS = '−';

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  // Plain text: spaces around binary + and -, a real minus sign everywhere.
  function pretty(s) {
    // Word spaces are kept ("(so x=4)" stays readable); operator spacing is normalised.
    s = String(s).replace(/\s+/g, ' ').trim();
    var out = '', prev = '';
    for (var i = 0; i < s.length; i++) {
      var ch = s[i];
      if (ch === ' ') { if (out && out.slice(-1) !== ' ') out += ' '; continue; }
      if (ch === '+' || ch === '-') {
        var binary = /[0-9a-z)]/i.test(prev);
        var sym = ch === '-' ? MINUS : '+';
        if (binary) out = out.replace(/ $/, '') + ' ' + sym + ' ';
        else out += sym;
      } else if (ch === '=') {
        out = out.replace(/ $/, '') + ' = ';
      } else {
        out += ch;
      }
      prev = ch;
    }
    return out.replace(/\s{2,}/g, ' ').trim();
  }

  // Markup: variables and i set as <var>.
  function mathHTML(s) {
    return esc(pretty(s)).replace(/([xyi])/g, function (m) {
      return '<var class="v-' + m + '">' + m + '</var>';
    });
  }

  function num(n) { return n < 0 ? MINUS + Math.abs(n) : String(n); }

  // a x + b y = k as text
  function linText(a, b, k) {
    var terms = [];
    function term(c, v) {
      if (c === 0) return;
      var mag = Math.abs(c) === 1 ? '' : String(Math.abs(c));
      if (!terms.length) terms.push((c < 0 ? MINUS : '') + mag + v);
      else terms.push((c < 0 ? MINUS + ' ' : '+ ') + mag + v);
    }
    term(a, 'x'); term(b, 'y');
    if (!terms.length) terms.push('0');
    return terms.join(' ') + ' = ' + num(k);
  }

  // Step text for one part when the other unknowns are known.
  function solveOne(e, varName, known) {
    var a = varName === 'x' ? e.a : e.b;
    var other = varName === 'x' ? 'y' : 'x';
    var bo = varName === 'x' ? e.b : e.a;
    var k = e.k;
    var lines = [];
    if (bo !== 0 && known && known[other] !== undefined) {
      var v = known[other];
      lines.push('Substitute ' + other + ' = ' + num(v) + ' into ' + pretty(e.lhs) + ' = ' + pretty(e.rhs) + '.');
      k = k - bo * v;
    }
    var L = lin(e.lhs);
    if (L.c !== 0 && bo === 0) {
      lines.push((L.c > 0 ? 'Subtract ' + L.c : 'Add ' + Math.abs(L.c)) + ' on both sides: ' +
        linText(varName === 'x' ? a : 0, varName === 'y' ? a : 0, k) + '.');
    } else if (lines.length) {
      lines.push('That leaves ' + linText(varName === 'x' ? a : 0, varName === 'y' ? a : 0, k) + '.');
    }
    if (a !== 1) lines.push((a === -1 ? 'Change the sign' : 'Divide both sides by ' + num(a)) + ' to get ' + varName + '.');
    return lines.join(' ');
  }
  function lin(s) { return D.lin(s); }

  /* Hints for the solve phase, in order. Each is one short sentence or two. */
  function hints(q, room) {
    var R = D.partEq(q, 'real'), I = D.partEq(q, 'imag');
    var out = [];
    if (room <= 3) {
      out.push('Sun Seal: ' + pretty(q.eqReal) + '. ' + solveOne(R, 'x'));
      if (room === 1) out.push('Moon Seal: ' + pretty(q.eqImag) + ' is already balanced, so only x is unknown.');
      else out.push('Moon Seal: ' + pretty(q.eqImag) + '. ' + solveOne(I, 'y'));
    } else if (room === 4) {
      out.push('Sun Seal: ' + pretty(q.eqReal.replace(/\s*\(.*\)\s*/, '')) + ' gives x first.');
      out.push('Moon Seal: ' + solveOne(I, 'y', { x: q.ans.x }));
    } else {
      out.push('Tidy both parts: ' + linText(R.a, R.b, R.k) + ' and ' + linText(I.a, I.b, I.k) + '.');
      // eliminate y: multiply real by I.b and imag by R.b
      var cx = R.a * I.b - I.a * R.b, ck = R.k * I.b - I.k * R.b;
      out.push('Eliminate y: multiply the first by ' + num(I.b) + ', the second by ' + num(R.b) +
        ', and subtract. That gives ' + linText(cx, 0, ck) + '. Then put x back into either part.');
    }
    return out;
  }

  /* Why a term belongs where it does (wrong-drop feedback). */
  function whyType(term, type, room) {
    var t = '“' + pretty(term) + '”';
    if (type === 'real') return t + ' has no i beside it, so it belongs to the Sun Seal (real part).';
    return t + (room === 1 ? ' is the number multiplied by i, so it belongs to the Moon Seal (imaginary part).'
      : ' is multiplied by i, so it belongs to the Moon Seal (imaginary part).');
  }

  /* Name the mistake in a wrong solution. vals: {x, y} as numbers. */
  function nameMistake(q, room, vals) {
    var ax = q.ans.x, ay = q.ans.y, hasY = ay !== undefined;
    var R = D.partEq(q, 'real'), I = D.partEq(q, 'imag');
    // quote each part as written on the door, never in a solved form
    var rt = pretty(R.lhs + '=' + R.rhs), it = pretty(I.lhs + '=' + I.rhs);
    var xOk = vals.x === ax, yOk = !hasY || vals.y === ay;
    if (!hasY) {
      if (vals.x === -ax && ax !== 0) return 'Check the sign: ' + pretty(q.eqReal) + ' gives a ' + (ax > 0 ? 'positive' : 'negative') + ' x.';
      return 'x = ' + num(vals.x) + ' does not balance the Sun Seal: ' + pretty(q.eqReal) + '.';
    }
    if (!xOk && !yOk && vals.x === ay && vals.y === ax && ax !== ay) return 'Swapped: your x and y are the wrong way round.';
    if (xOk && !yOk) {
      if (vals.y === -ay && ay !== 0) return 'x is right. Check the sign of y in the imaginary part: ' + it + '.';
      return 'x = ' + num(ax) + ' is right, but y does not balance the Moon Seal: ' + it + '.';
    }
    if (!xOk && yOk) {
      if (vals.x === -ax && ax !== 0) return 'y is right. Check the sign of x in the real part: ' + rt + '.';
      return 'y is right, but x does not balance the Sun Seal: ' + rt + '.';
    }
    if (vals.x === -ax && vals.y === -ay) return 'Both signs are flipped. Recheck the minus signs when you move terms across.';
    return 'Neither value balances its seal. Solve the real part first.';
  }

  function answerText(q) {
    return 'x = ' + num(q.ans.x) + (q.ans.y !== undefined ? ', y = ' + num(q.ans.y) : '');
  }

  /* Worked example for Learn More (HTML). */
  function workedHTML(q, room) {
    var R = D.partEq(q, 'real'), I = D.partEq(q, 'imag');
    var rows = [];
    rows.push('<li>Inscription: <span class="m">' + mathHTML(q.display) + '</span></li>');
    rows.push('<li>Real parts equal: <span class="m">' + mathHTML(R.lhs + '=' + R.rhs) + '</span></li>');
    rows.push('<li>Imaginary parts equal: <span class="m">' + mathHTML(I.lhs + '=' + I.rhs) + '</span></li>');
    hints(q, room).forEach(function (h) { rows.push('<li>' + esc(h) + '</li>'); });
    rows.push('<li>So <b class="m">' + esc(answerText(q)) + '</b>.</li>');
    return '<ol class="worked">' + rows.join('') + '</ol>';
  }

  window.TST.teach = {
    esc: esc, pretty: pretty, mathHTML: mathHTML, num: num, hints: hints, whyType: whyType,
    nameMistake: nameMistake, answerText: answerText, workedHTML: workedHTML, linText: linText
  };
})();
