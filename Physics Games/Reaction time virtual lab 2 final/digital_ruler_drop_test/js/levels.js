/* ============================================================
   levels.js — calibration stages.

   Difficulty comes from the physics, not from arbitrary knobs: a
   shorter rule runs out of scale sooner, so it must be caught faster.
   A rule of length L cm can only measure reactions up to
   t = sqrt(2L/100/g) seconds:

       100 cm -> 0.452 s
        50 cm -> 0.319 s
        30 cm -> 0.247 s

   Each stage asks for N recorded catches, then grades the session.
   ============================================================ */
(function (global) {
  'use strict';

  var G = 9.8;

  /** Seconds of free fall to reach `cm` centimetres. */
  function timeFor(cm) { return Math.sqrt((2 * (cm / 100)) / G); }

  /**
   * metric: 'mean'  -> pass when mean reaction time <= pass
   *         'spread'-> pass when standard deviation <= pass
   *         'count' -> pass simply by filling the trial count
   * good/great tighten the same metric for grade 2 and 3.
   */
  var STAGES = [
    {
      id: 'st1',
      name: 'Orientation',
      ruleCm: 100,
      trials: 3,
      metric: 'count',
      goal: 'Record <b>3</b> clean catches on the metre rule',
      brief: 'A full metre rule gives you until 0.45 s before it slips through. Get a feel for the release.'
    },
    {
      id: 'st2',
      name: 'Steady Hand',
      ruleCm: 100,
      trials: 5,
      metric: 'mean',
      pass: 0.34, good: 0.29, great: 0.25,
      goal: 'Average <b>0.34 s</b> or faster over <b>5</b> catches',
      brief: 'Same rule, but now the average matters. Watch the ruler, not the button.'
    },
    {
      id: 'st3',
      name: 'Quick Draw',
      ruleCm: 50,
      trials: 5,
      metric: 'mean',
      pass: 0.30, good: 0.26, great: 0.22,
      goal: 'Average <b>0.30 s</b> or faster over <b>5</b> catches',
      brief: 'Half the rule. It now slips through at 0.32 s, so a lapse costs you the trial.'
    },
    {
      id: 'st4',
      name: 'Nerve Signal',
      ruleCm: 50,
      trials: 6,
      metric: 'mean',
      pass: 0.26, good: 0.23, great: 0.20,
      goal: 'Average <b>0.26 s</b> or faster over <b>6</b> catches',
      brief: 'Approaching the limit of human visual reaction. Signal travel time alone is ~0.10 s.'
    },
    {
      id: 'st5',
      name: 'Precision Grip',
      ruleCm: 50,
      trials: 6,
      metric: 'spread',
      pass: 0.050, good: 0.036, great: 0.025,
      goal: 'Standard deviation <b>0.050 s</b> or lower over <b>6</b> catches',
      brief: 'Consistency, not speed. Every catch should land on nearly the same mark.'
    },
    {
      id: 'st6',
      name: 'Reflex Master',
      ruleCm: 30,
      trials: 6,
      metric: 'count',
      goal: 'Land <b>6</b> catches on the <b>30 cm</b> rule',
      brief: 'A 30 cm rule clears the line at 0.247 s. Every single catch must beat it.'
    }
  ];

  /* Free Lab is the original open-ended experiment: a metre rule,
     unlimited trials, full data table and statistics. */
  var FREE_LAB = {
    id: 'free',
    name: 'Free Lab',
    ruleCm: 100,
    trials: Infinity,
    metric: 'none',
    isFree: true,
    goal: 'Unlimited trials &mdash; collect your own data set',
    brief: 'No target. Run as many trials as you like and read the statistics.'
  };

  function byId(id) {
    if (id === FREE_LAB.id) return FREE_LAB;
    for (var i = 0; i < STAGES.length; i++) {
      if (STAGES[i].id === id) return STAGES[i];
    }
    return null;
  }

  function indexOf(id) {
    for (var i = 0; i < STAGES.length; i++) {
      if (STAGES[i].id === id) return i;
    }
    return -1;
  }

  function next(id) {
    var i = indexOf(id);
    return (i >= 0 && i < STAGES.length - 1) ? STAGES[i + 1] : null;
  }

  /** A stage unlocks once the previous one has been cleared. */
  function isUnlocked(id) {
    var i = indexOf(id);
    if (i <= 0) return true;
    return !!global.Save.stage(STAGES[i - 1].id).cleared;
  }

  /** The metric value this stage is judged on, or null if not applicable. */
  function metricValue(stage, stats) {
    if (!stats) return null;
    if (stage.metric === 'mean') return stats.mean;
    if (stage.metric === 'spread') return stats.stdDev;
    return null;
  }

  /**
   * Grade a completed session: 0 = failed, 1..3 = cleared with rising quality.
   * A 'count' stage is cleared by filling the trials; its grade then comes
   * from how fast the average was, scaled to what the rule can measure.
   */
  function grade(stage, stats) {
    if (!stats || stats.n < 1) return 0;
    if (stage.isFree) return 0;

    if (stage.metric === 'count') {
      if (stats.n < stage.trials) return 0;
      /* scale the grade against this rule's measurable window */
      var limit = timeFor(stage.ruleCm);
      var ratio = stats.mean / limit;
      if (ratio <= 0.52) return 3;
      if (ratio <= 0.68) return 2;
      return 1;
    }

    if (stats.n < stage.trials) return 0;
    var v = metricValue(stage, stats);
    if (v === null || !isFinite(v)) return 0;
    if (v <= stage.great) return 3;
    if (v <= stage.good) return 2;
    if (v <= stage.pass) return 1;
    return 0;
  }

  /** Human-readable line describing how the session measured up. */
  function verdict(stage, stats) {
    if (!stats || stats.n === 0) return 'No trials recorded.';
    if (stage.isFree) {
      return 'Session closed with <b>' + stats.n + '</b> trial' + (stats.n === 1 ? '' : 's') +
        '. Mean reaction time <b>' + stats.mean.toFixed(3) + ' s</b>.';
    }
    if (stage.metric === 'count') {
      return 'You landed <b>' + stats.n + ' of ' + stage.trials + '</b> catches on the ' +
        stage.ruleCm + ' cm rule, averaging <b>' + stats.mean.toFixed(3) + ' s</b>.';
    }
    if (stage.metric === 'spread') {
      return 'Spread across <b>' + stats.n + '</b> trials was <b>' + stats.stdDev.toFixed(3) +
        ' s</b> against a target of ' + stage.pass.toFixed(3) + ' s.';
    }
    return 'Mean over <b>' + stats.n + '</b> trials was <b>' + stats.mean.toFixed(3) +
      ' s</b> against a target of ' + stage.pass.toFixed(3) + ' s.';
  }

  global.Levels = {
    G: G,
    all: STAGES,
    freeLab: FREE_LAB,
    count: STAGES.length,
    maxGrades: STAGES.length * 3,
    timeFor: timeFor,
    byId: byId,
    indexOf: indexOf,
    next: next,
    isUnlocked: isUnlocked,
    metricValue: metricValue,
    grade: grade,
    verdict: verdict
  };
})(window);
