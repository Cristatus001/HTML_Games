/* ============================================================================
   data.js — game content
   The correct/wrong answer sets are unchanged from the original build.
   ========================================================================== */
'use strict';

/** The twelve genuine economic uses of algae, each with its field note. */
const CORRECT_OPTIONS = [
  { text: 'Primary producers',    fact: 'Algae form the base of aquatic food chains.' },
  { text: 'Oxygen producers',     fact: 'They release oxygen and fix carbon dioxide.' },
  { text: 'Food for humans',      fact: 'Porphyra, Laminaria, and Sargassum are edible seaweeds.' },
  { text: 'Hydrocolloids',        fact: 'Used in ice creams, jellies, and microbial culture plates.' },
  { text: 'Biofuel Source',       fact: 'Some algae provide protein-rich supplements and biofuels.' },
  { text: 'Biofertilizers',       fact: 'Cyanobacteria enrich soil by fixing atmospheric nitrogen.' },
  { text: 'Industrial dyes',      fact: 'Some red algae are sources of natural dyes for textiles and food.' },
  { text: 'Cosmetics & skincare', fact: 'Algal extracts are used in face masks, creams, and soaps.' },
  { text: 'Water purification',   fact: 'Algae help remove heavy metals and pollutants from water.' },
  { text: 'Animal feed',          fact: 'Algae are used as nutritious feed for fish and livestock.' },
  { text: 'Soil conditioner',     fact: 'Algal biomass improves soil fertility and texture.' },
  { text: 'Medicinal products',   fact: 'Algal extracts are used for antiviral and antibacterial medicines.' }
];

/** Manufactured goods that have nothing to do with algae. */
const WRONG_OPTIONS = [
  'Toys', 'Sports equipment', 'Airplanes', 'Paints', 'Plastic Bags', 'Computers'
];

/** Why each wrong item is wrong — shown in the Field Journal. */
const WRONG_NOTES = {
  'Toys':             'Moulded from petroleum plastics, wood or metal.',
  'Sports equipment': 'Built from synthetic polymers, rubber, carbon fibre and alloys.',
  'Airplanes':        'Aluminium alloys, titanium and carbon-fibre composites.',
  'Paints':           'Mineral pigments in synthetic resin binders.',
  'Plastic Bags':     'Polyethylene, refined from crude oil or natural gas.',
  'Computers':        'Silicon, copper, rare-earth metals and plastics.'
};

/**
 * Four dives. The first three group the uses by theme; the last is the
 * original full round — all twelve correct bubbles and all six distractors.
 */
const LEVELS = [
  {
    id: 1,
    name: 'Sunlit Shallows',
    desc: 'Where algae feed the sea',
    depth: '5 m',
    tint: 'linear-gradient(to bottom, rgba(80, 220, 235, .16), transparent)',
    correct: [0, 1, 2, 3],
    wrong: ['Toys', 'Airplanes']
  },
  {
    id: 2,
    name: 'Kelp Forest',
    desc: 'Fuel, soil and harvest',
    depth: '24 m',
    tint: 'linear-gradient(to bottom, rgba(60, 210, 140, .16), transparent)',
    correct: [4, 5, 9, 10],
    wrong: ['Sports equipment', 'Paints', 'Computers']
  },
  {
    id: 3,
    name: 'Twilight Reef',
    desc: 'Industry, health and beauty',
    depth: '90 m',
    tint: 'linear-gradient(to bottom, rgba(150, 130, 250, .16), transparent)',
    correct: [6, 7, 8, 11],
    wrong: ['Plastic Bags', 'Toys', 'Paints']
  },
  {
    id: 4,
    name: 'Abyssal Trench',
    desc: 'The full expedition — all twelve',
    depth: '410 m',
    tint: 'linear-gradient(to bottom, rgba(255, 170, 90, .14), transparent)',
    correct: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    wrong: WRONG_OPTIONS.slice()
  }
];

const BOOT_LINES = [
  'Pressurising the dive bell…',
  'Checking the air supply…',
  'Charting the reef…',
  'Lowering the treasure basket…',
  'Ready to dive.'
];
