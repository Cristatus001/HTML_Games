/* =====================================================================
   DECISION CARDS - game data
   Cards, case files (levels) and the Learn More archive.
   Biology and correct answers follow the original design brief.
   ===================================================================== */
(function (global) {
  "use strict";

  var ICON = "assets/images/ui/emoji/";
  var ART = "assets/images/cards/";

  /* Vector fallbacks, used only when a card art PNG is missing. */
  var VEC = {
    cellGrowth: '<svg viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="1.6" stroke-linecap="round" style="color:#34d399">' +
      '<circle cx="12" cy="12" r="6.2"/><circle cx="12" cy="12" r="2.4" fill="#34d399" opacity=".55"/>' +
      '<path d="M12 3.4V1.6M12 22.4v-1.8M3.4 12H1.6M22.4 12h-1.8M6 6L4.7 4.7M18 18l1.3 1.3M18 6l1.3-1.3M6 18l-1.3 1.3"/></svg>',
    dnaRep: '<svg viewBox="0 0 24 24" fill="none" stroke="#c084fc" stroke-width="1.6" stroke-linecap="round" style="color:#c084fc">' +
      '<path d="M8 2c8 4-8 8 0 12s-8 4 0 8"/><path d="M16 2c-8 4 8 8 0 12s8 4 0 8"/>' +
      '<path d="M9.5 5.5h5M14.5 10h-5M9.5 14.5h5" opacity=".7"/></svg>',
    dnaDamage: '<svg viewBox="0 0 24 24" fill="none" stroke="#fb7185" stroke-width="1.6" stroke-linecap="round" style="color:#fb7185">' +
      '<path d="M8 2c6 3-5 6 0 9"/><path d="M16 22c-6-3 5-6 0-9"/>' +
      '<path d="M13 8l-3 3.4 3.6.6-2.2 4.4 4.6-5.2-3.6-.4z" fill="#fb7185" stroke="none"/></svg>',
    warning: '<svg viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="1.7" stroke-linecap="round" style="color:#fbbf24">' +
      '<path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4.5M12 17h.01"/></svg>',
    spindle: '<svg viewBox="0 0 24 24" fill="none" stroke="#38e0ff" stroke-width="1.5" stroke-linecap="round" style="color:#38e0ff">' +
      '<circle cx="2.6" cy="12" r="1.8" fill="#38e0ff"/><circle cx="21.4" cy="12" r="1.8" fill="#38e0ff"/>' +
      '<path d="M4.4 12L11 6M4.4 12L11 12M4.4 12L11 18M19.6 12L13 6M19.6 12L13 12M19.6 12L13 18"/>' +
      '<path d="M11 5.4h2M11 11.4h2M11 17.4h2" stroke-width="3.2"/></svg>',
    centrosome: '<svg viewBox="0 0 24 24" fill="none" stroke="#f472b6" stroke-width="1.4" stroke-linecap="round" style="color:#f472b6">' +
      '<circle cx="7" cy="8" r="2" fill="#f472b6"/><circle cx="17" cy="8" r="2" fill="#f472b6"/><circle cx="12" cy="17" r="2" fill="#f472b6"/>' +
      '<path d="M7 4.5v-1.2M7 11.5v1.2M3.5 8H2.3M10.5 8h1.2M17 4.5v-1.2M17 11.5v1.2M13.5 8h-1.2M20.5 8h1.2M12 13.5v-1.2M12 20.5v1.2M8.5 17H7.3M15.5 17h1.2"/></svg>',
    signal: '<svg viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="1.6" stroke-linecap="round" style="color:#34d399">' +
      '<circle cx="12" cy="15" r="5" fill="#34d399" opacity=".35"/><circle cx="12" cy="15" r="5"/>' +
      '<path d="M12 8V3M7.5 9.5L5 6.5M16.5 9.5L19 6.5M4.5 13.5L2 12.5M19.5 13.5L22 12.5"/>' +
      '<path d="M12 3l-1.6 2.2h3.2z" fill="#34d399" stroke="none"/></svg>',
    shatter: '<svg viewBox="0 0 24 24" fill="none" stroke="#fb7185" stroke-width="1.5" stroke-linecap="round" style="color:#fb7185">' +
      '<path d="M4 4l5 5M20 4l-5 5M4 20l5-5M20 20l-5-5"/>' +
      '<path d="M12 5.5l2.6 4.4 4.9.7-3.6 3.4.9 4.9-4.8-2.5-4.8 2.5.9-4.9-3.6-3.4 4.9-.7z" fill="#fb7185" opacity=".55" stroke="none"/></svg>'
  };

  /* ------------------------------------------------------------------
     CARDS
     ------------------------------------------------------------------ */
  var CARDS = [
    {
      id: "growth_without_copy",
      track: ["G1", "S"],
      title: "Growth Without Copy",
      phase: "G1 / S BOUNDARY",
      note: "Restriction point audit",
      stripColor: "#fbbf24",
      art: ART + "growth_without_copy.png",
      vector: VEC.cellGrowth,
      conditions: [
        { icon: "cell_size", text: "Cell size doubled" },
        { icon: "dna", text: "DNA still single copy" },
        { icon: "warning", text: "Division signal active" }
      ],
      correct: "pause",
      correctMsg: "Correct.<br>DNA replication scheduled.",
      wrongMsg: "Critical failure.<br>Daughter cells inherit incomplete DNA.",
      explanation: "Cell growth and DNA replication must be coordinated. You must pause to allow S-phase.",
      teja: "Division without DNA copying destabilises the genome.",
      learn: "A cell that has grown but not replicated its DNA is stuck between G1 and S. Cyclin D-CDK4/6 pushes it past the restriction point, but S-phase must actually finish copying all 46 chromosomes before mitosis is safe."
    },
    {
      id: "half_copied_dna",
      track: ["S"],
      title: "Half-Copied DNA",
      phase: "S PHASE",
      note: "Replication fork telemetry",
      stripColor: "#fbbf24",
      art: ART + "half_copied_dna.png",
      vector: VEC.dnaRep,
      conditions: [
        { icon: "dna", text: "Replication started" },
        { icon: "warning", text: "Some chromosomes unfinished" },
        { icon: "time_pressure", text: "Time pressure high" }
      ],
      correct: "repair",
      correctMsg: "Success.<br>Replication completed safely.",
      wrongMsg: "Warning.<br>Broken chromosomes detected.",
      explanation: "DNA synthesis must be completed before division. Repair / completion is priority.",
      teja: "Unfinished replication leads to chromosome breaks.",
      learn: "Stalled replication forks are fragile. The intra-S checkpoint (ATR-Chk1) stabilises them and recruits the machinery that finishes synthesis; entering mitosis first snaps the unreplicated regions."
    },
    {
      id: "damaged_dna_detected",
      track: ["G2"],
      title: "Damaged DNA Detected",
      phase: "G2 CHECKPOINT",
      note: "Radiation dosimetry alert",
      stripColor: "#fb7185",
      art: ART + "damaged_dna_detected.png",
      vector: VEC.dnaDamage,
      conditions: [
        { icon: "radiation", text: "Radiation damage detected" },
        { icon: "dna_broken", text: "DNA copied but errors present" },
        { icon: "cell_size", text: "Cell size normal" }
      ],
      correct: "repair",
      correctMsg: "Safe.<br>Damage repaired via enzymes.",
      wrongMsg: "Mutation spreading.",
      explanation: "Cell cycle events are under genetic control. Repair mechanisms must be activated.",
      teja: "Ignoring errors now fixes them permanently in the population.",
      learn: "p53 rises after damage, holds the cycle and gives repair enzymes time to work. Repairable lesions should be repaired, not passed on: an uncorrected base change becomes a permanent mutation in every descendant."
    },
    {
      id: "everything_ready_almost",
      track: ["G2", "M"],
      title: "Everything Ready... Almost",
      phase: "G2 / M BOUNDARY",
      note: "Spindle readiness poll",
      stripColor: "#fbbf24",
      art: ART + "everything_ready_almost.png",
      vector: VEC.dnaRep,
      conditions: [
        { icon: "dna", text: "DNA fully replicated" },
        { icon: "cell", text: "Cytoplasm sufficient" },
        { icon: "blocked", text: "Spindle system NOT ready" }
      ],
      correct: "pause",
      correctMsg: "Smart move.<br>Spindles assembling now.",
      wrongMsg: "Segregation error.",
      explanation: "Correct division needs precise timing. Without spindles, chromosomes cannot split evenly.",
      teja: "Wait for the machinery. Unequal daughter cells are useless.",
      learn: "Mitosis is a machine problem as much as a DNA problem. Without an assembled microtubule spindle there is nothing to pull sister chromatids apart, so the cycle waits at the G2/M boundary."
    },
    {
      id: "rushed_division_order",
      track: ["S", "G2", "M"],
      title: "Rushed Division Order",
      phase: "CONTROL FAILURE",
      note: "Regulator gene fault",
      stripColor: "#fb7185",
      art: ART + "rushed_division_order.png",
      vector: VEC.warning,
      conditions: [
        { icon: "signal_bolt", text: "Division signal forced" },
        { icon: "dna_broken", text: "DNA incomplete" },
        { icon: "glitch_burst", text: "Control gene glitch" }
      ],
      correct: "destroy",
      correctMsg: "Threat eliminated.<br>Organism protected.",
      wrongMsg: "Cancer risk increased.",
      explanation: "Not all cells should be allowed to divide. If control is lost, apoptosis is the only safe path.",
      teja: "Sometimes the only way to save the organism is to sacrifice the cell.",
      learn: "When the regulator itself is broken, pausing does not help - the cell ignores the brake. Programmed cell death removes the lineage before it becomes a tumour clone."
    },
    {
      id: "checkpoint_arrest_bypass",
      track: ["G2", "M"],
      title: "Checkpoint Arrest Bypass",
      phase: "G2 CHECKPOINT",
      note: "MPF activity rising",
      stripColor: "#fb7185",
      art: ART + "checkpoint_arrest_bypass.png",
      vector: VEC.warning,
      conditions: [
        { icon: "dna_broken", text: "Unresolved DNA damage at G2 checkpoint" },
        { icon: "signal_bolt", text: "Mitosis promoting factor active" },
        { icon: "cell", text: "Cell attempting entry into M-phase" }
      ],
      correct: "pause",
      correctMsg: "Arrest held.<br>Checkpoint signalling restored.",
      wrongMsg: "Chromosomal aberrations.",
      explanation: "Entering mitosis with damaged DNA results in massive chromosomal aberrations. The cycle must be halted until checkpoints clear.",
      teja: "MPF is loud, but the checkpoint outranks it. Hold the line.",
      learn: "MPF (cyclin B-CDK1) is the trigger for mitosis. The G2 checkpoint keeps it inactive through Wee1 and withheld Cdc25 activity while damage remains; overriding that arrest shreds chromosomes during condensation."
    },
    {
      id: "spindle_checkpoint_mismatch",
      track: ["M"],
      title: "Spindle Assembly Checkpoint Mismatch",
      phase: "METAPHASE",
      note: "Kinetochore tension scan",
      stripColor: "#fbbf24",
      art: ART + "spindle_checkpoint_mismatch.png",
      vector: VEC.spindle,
      conditions: [
        { icon: "chromosome", text: "Chromosomes aligned on metaphase plate" },
        { icon: "spindle", text: "One kinetochore unattached to spindle fibres" },
        { icon: "signal_bolt", text: "Anaphase promoting complex primed" }
      ],
      correct: "pause",
      correctMsg: "Anaphase delayed.<br>Attachment corrected.",
      wrongMsg: "Non-disjunction. Aneuploidy logged.",
      explanation: "Premature activation of anaphase before all sister chromatids are properly tensioned leads to non-disjunction and aneuploidy.",
      teja: "One unattached kinetochore is enough to keep the whole cell waiting.",
      learn: "The spindle assembly checkpoint is a wait-anaphase signal broadcast by any kinetochore lacking tension. It blocks the APC/C until every chromosome is bi-oriented, which is why one loose attachment stops the entire division."
    },
    {
      id: "hyperactive_growth_factor_signal",
      track: ["G1"],
      title: "Hyperactive Growth Factor Signal",
      phase: "G1 PHASE",
      note: "Mitogen receptor load high",
      stripColor: "#34d399",
      art: ART + "hyperactive_growth_factor_signal.png",
      vector: VEC.signal,
      conditions: [
        { icon: "signal_bolt", text: "Excessive extracellular mitogens" },
        { icon: "dna_shield", text: "Normal DNA integrity" },
        { icon: "divide", text: "Rapid successive divisions signalled" }
      ],
      correct: "allow",
      correctMsg: "Proceed.<br>Proliferation within safe limits.",
      wrongMsg: "Unnecessary intervention.<br>Healthy tissue growth blocked.",
      explanation: "If genetic material is intact and the cell passes all checkpoints, standard proliferative signals under controlled conditions can proceed safely.",
      teja: "A loud growth signal is not damage. Intact genome, checkpoints clear - let it divide.",
      learn: "Growth factors are supposed to drive division; wound healing and development depend on it. Mitogenic signalling only becomes dangerous when checkpoints or repair pathways are also compromised."
    },
    {
      id: "irreparable_double_strand_breaks",
      track: ["G2"],
      title: "Irreparable Double-Strand Breaks",
      phase: "DAMAGE RESPONSE",
      note: "Repair pathway exhausted",
      stripColor: "#fb7185",
      art: ART + "irreparable_double_strand_breaks.png",
      vector: VEC.shatter,
      conditions: [
        { icon: "radiation", text: "Ionizing radiation exposure" },
        { icon: "glitch_burst", text: "Multiple shattered chromosome strands" },
        { icon: "blocked", text: "Homologous recombination failed" }
      ],
      correct: "destroy",
      correctMsg: "Apoptosis complete.<br>Mutated clone contained.",
      wrongMsg: "Damaged lineage survived.",
      explanation: "When critical structural integrity cannot be restored and repair pathways fail, triggering programmed cell death prevents mutated clone expansion.",
      teja: "Repair had its chance. Containment is the remaining option.",
      learn: "Double-strand breaks are the most dangerous lesion: both strands are cut, so there is no intact template. When homologous recombination fails, p53 switches from repair to apoptosis and the cell is dismantled cleanly."
    },
    {
      id: "centrosome_over_amplification",
      track: ["M"],
      title: "Centrosome Over-Amplification",
      phase: "MITOTIC ENTRY",
      note: "Extra spindle poles counted",
      stripColor: "#f472b6",
      art: ART + "centrosome_over_amplification.png",
      vector: VEC.centrosome,
      conditions: [
        { icon: "centrosome", text: "Extra spindle poles present" },
        { icon: "dna", text: "DNA fully replicated" },
        { icon: "warning", text: "Risk of multipolar mitosis" }
      ],
      correct: "destroy",
      correctMsg: "Terminated.<br>Multipolar catastrophe averted.",
      wrongMsg: "Genome torn apart in multipolar mitosis.",
      explanation: "Cells with supernumerary centrosomes form chaotic multipolar spindles that rip the genome apart during division, making termination the safest choice.",
      teja: "Three poles, two sets of chromosomes. That division has no safe outcome.",
      learn: "A normal cell duplicates its centrosome exactly once per cycle, giving two poles. Extra centrosomes create three or more pulling directions, scattering chromosomes into aneuploid daughters - a hallmark of tumour cells."
    }
  ];

  /* ------------------------------------------------------------------
     CASE FILES (levels)
     ------------------------------------------------------------------ */
  var LEVELS = [
    {
      id: "file_01",
      name: "G1 / S WATCH",
      desc: "Entry-level triage: growth, replication and the restriction point.",
      cards: ["growth_without_copy", "half_copied_dna", "damaged_dna_detected"]
    },
    {
      id: "file_02",
      name: "G2 / M GATE",
      desc: "Mitotic readiness: spindles, checkpoint arrest and metaphase tension.",
      cards: ["everything_ready_almost", "checkpoint_arrest_bypass", "spindle_checkpoint_mismatch"]
    },
    {
      id: "file_03",
      name: "CELL FATE PROTOCOL",
      desc: "Hard calls: when to let a cell live, and when to end it.",
      cards: ["hyperactive_growth_factor_signal", "rushed_division_order",
        "irreparable_double_strand_breaks", "centrosome_over_amplification"]
    },
    {
      id: "file_full",
      name: "FULL SIMULATION",
      desc: "All ten specimens, one continuous shift. Certification run.",
      cards: CARDS.map(function (c) { return c.id; })
    }
  ];

  /* ------------------------------------------------------------------
     LEARN MORE archive (conceptual reference, kept out of How to Play)
     ------------------------------------------------------------------ */
  var CODEX = [
    {
      tab: "PHASES",
      entries: [
        { h: "Interphase", p: "The long working period between divisions: G1, S and G2. The cell grows, copies its DNA and prepares the machinery of mitosis. Roughly 90% of a typical cycle." },
        { h: "G1 - growth", p: "The cell enlarges, builds organelles and proteins, and decides whether conditions justify another division. Cells that opt out enter the resting state G0." },
        { h: "S - synthesis", p: "Every chromosome is replicated, producing two identical sister chromatids joined at a centromere. DNA content doubles; chromosome number does not." },
        { h: "G2 - final check", p: "The cell finishes growing, duplicates centrosomes and verifies that replication was complete and error-free before committing to mitosis." },
        { h: "M - mitosis and cytokinesis", p: "Prophase, metaphase, anaphase and telophase separate the sister chromatids; cytokinesis splits the cytoplasm into two daughter cells." }
      ]
    },
    {
      tab: "CHECKPOINTS",
      entries: [
        { h: "G1 / S restriction point", p: "The main commitment gate. Asks: is the cell big enough, are nutrients and growth signals present, is the DNA undamaged? Past this point the cell is committed to divide.", tag: "Card: Growth Without Copy" },
        { h: "Intra-S checkpoint", p: "Monitors replication forks. Stalled or damaged forks are stabilised and finished rather than abandoned.", tag: "Card: Half-Copied DNA" },
        { h: "G2 / M checkpoint", p: "Confirms replication is complete and DNA damage is repaired before mitosis-promoting factor is allowed to fire.", tag: "Cards: Damaged DNA, Checkpoint Arrest Bypass" },
        { h: "Spindle assembly checkpoint", p: "Operates during metaphase. Any kinetochore that is unattached or lacks tension broadcasts a wait signal that blocks anaphase.", tag: "Card: Spindle Checkpoint Mismatch" }
      ]
    },
    {
      tab: "CONTROL GENES",
      entries: [
        { h: "Cyclins and CDKs", p: "Cyclin levels rise and fall through the cycle; each one activates a cyclin-dependent kinase that phosphorylates the targets for that phase. The pairing is the clock." },
        { h: "MPF (cyclin B - CDK1)", p: "Mitosis promoting factor. Once active it condenses chromosomes and breaks down the nuclear envelope, so checkpoints work by keeping it switched off." },
        { h: "p53", p: "The damage sensor and guardian of the genome. It halts the cycle for repair and, when repair fails, orders apoptosis. Mutated p53 is found in a large share of human cancers." },
        { h: "APC/C", p: "Anaphase promoting complex. Tags securin and cyclin B for destruction, releasing the enzyme that cuts sister chromatids apart. Held back by the spindle checkpoint." },
        { h: "Proto-oncogenes and tumour suppressors", p: "Accelerators and brakes. Gain-of-function in an accelerator (an oncogene) or loss of a brake both push a cell towards uncontrolled division." }
      ]
    },
    {
      tab: "FAILURE MODES",
      entries: [
        { h: "Apoptosis", p: "Programmed, orderly self-destruction. The cell shrinks, fragments its DNA and packages itself for removal without inflaming the tissue around it. The safe end for an unsalvageable cell." },
        { h: "Aneuploidy", p: "An abnormal chromosome count caused by non-disjunction - chromatids that fail to separate correctly. Daughter cells get too many or too few chromosomes." },
        { h: "Mutation fixation", p: "An unrepaired lesion copied during replication becomes permanent, inherited by every descendant cell of that lineage." },
        { h: "Uncontrolled proliferation", p: "When checkpoints and repair both fail, damaged cells keep dividing. Accumulated mutations produce a clone that ignores the tissue it lives in - the basis of cancer." },
        { h: "Multipolar mitosis", p: "Extra centrosomes create three or more spindle poles that pull chromosomes in conflicting directions, scattering the genome across the daughters." }
      ]
    },
    { tab: "CASE NOTES", entries: null }   /* filled from CARDS at runtime */
  ];

  global.DC_DATA = {
    ICON: ICON,
    CARDS: CARDS,
    LEVELS: LEVELS,
    CODEX: CODEX,
    cardById: function (id) {
      for (var i = 0; i < CARDS.length; i++) { if (CARDS[i].id === id) return CARDS[i]; }
      return null;
    }
  };
})(window);
