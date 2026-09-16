/* ============================================================================
 * MOSS SPOREFALL — data layer
 * Educational content: the 15 moss facts and the "not a moss" impostor traps,
 * plus reference material shown behind the Learn More button.
 * ==========================================================================*/
(function (global) {
  'use strict';

  /* The 15 correct answers — green dew orbs. Order is preserved. */
  var FACTS = [
    'Mosses grow in moist, shady, cool places.',
    'A moss plant body has stem-like and leaf-like structures.',
    'Mosses attach to the substrate using multicellular rhizoids.',
    'The dominant stage in mosses is the green leafy gametophyte.',
    'Sex organs of mosses are found at the tips of leafy shoots.',
    'The antheridium produces motile, biflagellate sperms.',
    'The archegonium produces a single egg.',
    'Water is necessary for the sperm to reach the egg.',
    'The zygote develops into a dependent sporophyte.',
    'A moss sporophyte has a foot, a seta and a capsule.',
    'Spores form inside the capsule by meiosis.',
    'Spores germinate into a filament called the protonema.',
    'The protonema develops into the leafy gametophyte.',
    'Mosses help in soil formation and retain water.',
    'Sphagnum (peat moss) stores large amounts of water.'
  ];

  /* Short headline shown on the collect card, above the full fact. */
  var FACT_TITLES = [
    'Habitat', 'Plant Body', 'Rhizoids', 'Dominant Stage', 'Sex Organs',
    'Antheridium', 'Archegonium', 'Water Needed', 'The Zygote', 'Sporophyte',
    'Meiosis', 'Protonema', 'Leafy Shoot', 'Ecology', 'Sphagnum'
  ];

  /* The wrong answers — impostors that are NOT mosses. */
  var IMPOSTORS = [
    {
      key: 'fern',
      name: 'Fern Frond',
      warn: 'Not a moss! A FERN is a pteridophyte with true vascular tissue.'
    },
    {
      key: 'cone',
      name: 'Gymnosperm Cone',
      warn: 'Not a moss! A GYMNOSPERM makes naked seeds. Mosses never make seeds.'
    },
    {
      key: 'bloom',
      name: 'Flowering Shoot',
      warn: 'Not a moss! An ANGIOSPERM has flowers. Mosses have no flowers or roots.'
    }
  ];

  /* Three descent zones. Each carries five of the fifteen facts. */
  var ZONES = [
    {
      id: 1,
      name: 'Canopy Drift',
      tagline: 'Released from the capsule, riding the damp air.',
      factFrom: 0,
      factTo: 5,
      depth: 2600,
      fallBase: 2.5,
      fallMax: 4.2,
      laneWiggle: 46,
      hazards: 10,
      windAmp: 0.24,
      sky: ['#0b2b2a', '#12433c', '#1c6350', '#2b8560'],
      fog: 'rgba(150, 235, 200, 0.10)',
      accent: '#6bff9e'
    },
    {
      id: 2,
      name: 'The Damp Rocks',
      tagline: 'Cool shade, dripping stone, narrow gaps.',
      factFrom: 5,
      factTo: 10,
      depth: 3000,
      fallBase: 2.9,
      fallMax: 4.9,
      laneWiggle: 66,
      hazards: 18,
      windAmp: 0.38,
      sky: ['#08222c', '#0e3540', '#155062', '#1d7180'],
      fog: 'rgba(150, 220, 245, 0.10)',
      accent: '#7fe9ff'
    },
    {
      id: 3,
      name: 'Peat Bog Deep',
      tagline: 'Down where Sphagnum holds the water.',
      factFrom: 10,
      factTo: 15,
      depth: 3400,
      fallBase: 3.2,
      fallMax: 5.6,
      laneWiggle: 82,
      hazards: 23,
      windAmp: 0.5,
      sky: ['#241a2e', '#33223a', '#4a2f3c', '#6b4436'],
      fog: 'rgba(255, 205, 150, 0.09)',
      accent: '#ffc46b'
    }
  ];

  /* ---- Learn More reference material (concepts, not controls) ---- */

  var GLOSSARY = [
    ['Bryophyte', 'A non-vascular land plant. Mosses, liverworts and hornworts. Often called the amphibians of the plant kingdom.'],
    ['Gametophyte', 'The green, leafy, haploid (n) stage. In mosses this is the dominant, independent, photosynthetic plant.'],
    ['Rhizoid', 'A slender multicellular thread that anchors the moss. It absorbs a little water but is not a true root.'],
    ['Antheridium', 'The male sex organ. It produces many motile, biflagellate sperms.'],
    ['Archegonium', 'The flask-shaped female sex organ. It produces a single egg.'],
    ['Zygote', 'The diploid (2n) cell formed when sperm fuses with egg. It grows into the sporophyte.'],
    ['Sporophyte', 'The diploid (2n) stage: foot, seta and capsule. It stays attached to and dependent on the gametophyte.'],
    ['Seta', 'The stalk of the sporophyte that raises the capsule into the air so spores disperse widely.'],
    ['Capsule', 'The spore case at the tip of the seta. Spores are produced inside it by meiosis.'],
    ['Protonema', 'The green branched filament that grows from a germinating spore. Buds on it become leafy shoots.'],
    ['Sphagnum', 'Peat moss. Its dead hyaline cells hold many times their own weight in water; it forms peat bogs.']
  ];

  /* Ordered life-cycle stages used by the Learn More diagram. */
  var LIFECYCLE = [
    { label: 'Spore', ploidy: 'n', note: 'Released from the capsule and carried by air.' },
    { label: 'Protonema', ploidy: 'n', note: 'Green filament formed when the spore germinates.' },
    { label: 'Leafy Gametophyte', ploidy: 'n', note: 'The dominant moss plant, anchored by rhizoids.' },
    { label: 'Antheridium + Archegonium', ploidy: 'n', note: 'Sex organs at the tips of leafy shoots.' },
    { label: 'Fertilisation', ploidy: 'n to 2n', note: 'Water carries sperm to the egg.' },
    { label: 'Zygote', ploidy: '2n', note: 'The first cell of the new sporophyte.' },
    { label: 'Sporophyte', ploidy: '2n', note: 'Foot, seta and capsule; dependent on the gametophyte.' },
    { label: 'Meiosis in Capsule', ploidy: '2n to n', note: 'Spores are formed, completing the cycle.' }
  ];

  var ECOLOGY = [
    'Mosses are pioneers on bare rock: they trap dust and start soil formation.',
    'A moss cushion acts like a sponge, slowing runoff and reducing erosion.',
    'Peat bogs built from Sphagnum lock away enormous amounts of carbon.',
    'Because they absorb through their whole surface, mosses are sensitive indicators of air pollution.'
  ];

  global.GameData = {
    FACTS: FACTS,
    FACT_TITLES: FACT_TITLES,
    IMPOSTORS: IMPOSTORS,
    ZONES: ZONES,
    GLOSSARY: GLOSSARY,
    LIFECYCLE: LIFECYCLE,
    ECOLOGY: ECOLOGY
  };
})(window);
