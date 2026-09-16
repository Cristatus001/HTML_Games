/* ==========================================================================
   Hybrid Shooter — Compound Data
   Chemistry content pulled directly from the Hybrid Shooter GDD.
   type: 'sp3' | 'sp2' | 'sp'
   ========================================================================== */

const HYBRID_TYPES = {
  sp3: {
    id: 'sp3',
    label: 'sp³ Hybridized',
    shape: 'Tetrahedral',
    angle: '~109.5°',
    color: '#3DDC97',
    glow: '#8CFFCB',
    hint: 'Carbon with 4 sigma bonds (single bonds only)'
  },
  sp2: {
    id: 'sp2',
    label: 'sp² Hybridized',
    shape: 'Trigonal Planar',
    angle: '~120°',
    color: '#FFB03B',
    glow: '#FFD98C',
    hint: 'Carbon with at least one pi bond (C=C, C=O, aromatic)'
  },
  sp: {
    id: 'sp',
    label: 'sp Hybridized',
    shape: 'Linear',
    angle: '180°',
    color: '#FF5C8A',
    glow: '#FF9CBB',
    hint: 'Carbon with triple bonds or cumulated double bonds'
  }
};

const COMPOUNDS = [
  // ---------------- sp3 : Tetrahedral, ~109.5deg ----------------
  { name: 'Methane', formula: 'CH₄', type: 'sp3' },
  { name: 'Ethane', formula: 'C₂H₆', type: 'sp3' },
  { name: 'Propane', formula: 'C₃H₈', type: 'sp3' },
  { name: 'Butane', formula: 'C₄H₁₀', type: 'sp3' },
  { name: 'Pentane', formula: 'C₅H₁₂', type: 'sp3' },
  { name: 'Hexane', formula: 'C₆H₁₄', type: 'sp3' },
  { name: 'Neopentane', formula: 'C(CH₃)₄', type: 'sp3' },
  { name: 'Cyclohexane', formula: 'C₆H₁₂', type: 'sp3' },
  { name: 'Diamond', formula: 'C(lattice)', type: 'sp3' },
  { name: 'Methyl chloride', formula: 'CH₃Cl', type: 'sp3' },
  { name: 'Chloroform', formula: 'CHCl₃', type: 'sp3' },
  { name: 'Carbon tetrachloride', formula: 'CCl₄', type: 'sp3' },
  { name: 'tert-Butyl bromide', formula: '(CH₃)₃CBr', type: 'sp3' },
  { name: 'Methanol', formula: 'CH₃OH', type: 'sp3' },
  { name: 'Ethanol', formula: 'CH₃CH₂OH', type: 'sp3' },
  { name: '2-Propanol', formula: '(CH₃)₂CHOH', type: 'sp3' },
  { name: 'Dimethyl ether', formula: 'CH₃OCH₃', type: 'sp3' },
  { name: 'Methylamine', formula: 'CH₃NH₂', type: 'sp3' },
  { name: 'Ethyl acetate', formula: 'CH₃COOC₂H₅', type: 'sp3' },
  { name: 'Tetramethylsilane', formula: 'Si(CH₃)₄', type: 'sp3' },

  // ---------------- sp2 : Trigonal planar, ~120deg ----------------
  { name: 'Ethene', formula: 'C₂H₄', type: 'sp2' },
  { name: 'Propene', formula: 'C₃H₆', type: 'sp2' },
  { name: '1,3-Butadiene', formula: 'C₄H₆', type: 'sp2' },
  { name: 'Cyclohexene', formula: 'C₆H₁₀', type: 'sp2' },
  { name: 'Benzene', formula: 'C₆H₆', type: 'sp2' },
  { name: 'Toluene', formula: 'C₇H₈', type: 'sp2' },
  { name: 'Styrene', formula: 'C₈H₈', type: 'sp2' },
  { name: 'Naphthalene', formula: 'C₁₀H₈', type: 'sp2' },
  { name: 'Phenol', formula: 'C₆H₅OH', type: 'sp2' },
  { name: 'Pyridine', formula: 'C₅H₅N', type: 'sp2' },
  { name: 'Formaldehyde', formula: 'CH₂O', type: 'sp2' },
  { name: 'Acetaldehyde', formula: 'CH₃CHO', type: 'sp2' },
  { name: 'Acetone', formula: 'CH₃COCH₃', type: 'sp2' },
  { name: 'Acetic acid', formula: 'CH₃COOH', type: 'sp2' },
  { name: 'Maleic acid', formula: 'C₄H₄O₄', type: 'sp2' },
  { name: 'Urea', formula: 'CO(NH₂)₂', type: 'sp2' },
  { name: 'Methyl acrylate', formula: 'CH₂=CHCOOCH₃', type: 'sp2' },
  { name: 'Carbonate ion', formula: 'CO₃²⁻', type: 'sp2' },
  { name: 'Graphite', formula: 'C(lattice)', type: 'sp2' },

  // ---------------- sp : Linear, 180deg ----------------
  { name: 'Ethyne (Acetylene)', formula: 'C₂H₂', type: 'sp' },
  { name: 'Propyne', formula: 'C₃H₄', type: 'sp' },
  { name: '1-Butyne', formula: 'C₄H₆', type: 'sp' },
  { name: '2-Butyne', formula: 'C₄H₆', type: 'sp' },
  { name: 'Phenylacetylene', formula: 'C₈H₆', type: 'sp' },
  { name: 'Fluoroacetylene', formula: 'C₂HF', type: 'sp' },
  { name: 'Chloroacetylene', formula: 'C₂HCl', type: 'sp' },
  { name: 'Hydrogen cyanide', formula: 'HCN', type: 'sp' },
  { name: 'Acrylonitrile', formula: 'CH₂=CHCN', type: 'sp' },
  { name: 'Cyanogen', formula: 'C₂N₂', type: 'sp' },
  { name: 'Dicyanoacetylene', formula: 'C₄N₂', type: 'sp' },
  { name: 'Cyanoacetylene', formula: 'HC₃N', type: 'sp' },
  { name: 'Allene', formula: 'CH₂=C=CH₂', type: 'sp' },
  { name: 'Ketene', formula: 'CH₂=C=O', type: 'sp' },
  { name: 'Carbon suboxide', formula: 'C₃O₂', type: 'sp' },
  { name: 'Propadienone', formula: 'C₃H₂O', type: 'sp' },
  { name: 'Carbon dioxide', formula: 'CO₂', type: 'sp' },
  { name: 'Carbon monoxide', formula: 'CO', type: 'sp' },
  { name: 'Methyl isocyanide', formula: 'CH₃NC', type: 'sp' },
  { name: 'Benzyne', formula: 'C₆H₄', type: 'sp' }
];

const RANDOM_FACTS = [
  'In sp³ hybridization, one s and three p orbitals mix to form four identical orbitals pointing to the corners of a tetrahedron.',
  'Diamond is a giant covalent lattice made entirely of sp³ hybridized carbon atoms.',
  'sp² carbons are trigonal planar with bond angles of about 120 degrees, leaving one unhybridized p orbital for a pi bond.',
  'Benzene’s six carbons are all sp² hybridized, giving the ring its flat, hexagonal shape.',
  'Graphite conducts electricity because its sp² carbon sheets have delocalized pi electrons free to move.',
  'sp hybridized carbon is linear, with a bond angle of exactly 180 degrees.',
  'In alkynes like acetylene, the triple bond is made of one strong sigma bond and two pi bonds.',
  'Allene has two double bonds sharing one carbon — that central carbon is sp hybridized and linear.',
  'Carbon dioxide’s central carbon is sp hybridized, which is why CO₂ is a perfectly straight, linear molecule.',
  'The percentage of s-character increases from sp³ (25%) to sp² (33%) to sp (50%), making sp bonds the shortest and strongest.',
  'Hydrogen cyanide (HCN) is a simple linear molecule with an sp hybridized carbon triple-bonded to nitrogen.',
  'Methane’s tetrahedral shape comes directly from its carbon being sp³ hybridized.',
  'Aromatic rings like naphthalene are built entirely from sp² carbons, keeping the whole ring system flat.',
  'Urea’s carbonyl carbon is sp² hybridized because of its C=O double bond.',
  'Ketene’s central carbon is sp hybridized due to two cumulated double bonds (C=C=O).'
];

// Freeze so nothing accidentally mutates the source data at runtime.
Object.freeze(HYBRID_TYPES);
Object.freeze(COMPOUNDS);
Object.freeze(RANDOM_FACTS);
