/* ============================================================================
   data.js - case studies, discipline metadata, rank tiers, reference notes.

   The ten case studies below (prompt, option order, answer index, explanation)
   are carried over verbatim from the original module. Nothing here changes what
   the game asks or what it accepts as correct; the added fields are presentation
   only (`system` picks the chip icon/accent, `subject` labels the dossier node).
   ========================================================================== */
'use strict';

/* Discipline metadata: chip icon + accent hue per anatomical system.
   `soft` / `soft2` are the same glow pre-mixed with alpha, so the stylesheet
   never needs color-mix() - that keeps older Android WebViews rendering the
   glows correctly instead of dropping the whole declaration. */
const SYSTEMS = {
  comparative: { label: 'Comparative', icon: 'sys-comparative', accent: '#ff8ab0', glow: '#d4708f',
                 soft: 'rgba(212,112,143,.55)', soft2: 'rgba(212,112,143,.2)' },
  surgical:    { label: 'Surgical',    icon: 'sys-surgical',    accent: '#cfe6f5', glow: '#7ec8f0',
                 soft: 'rgba(126,200,240,.55)', soft2: 'rgba(126,200,240,.2)' },
  environment: { label: 'Environment', icon: 'sys-environment', accent: '#7fdcff', glow: '#3fb6e0',
                 soft: 'rgba(63,182,224,.55)', soft2: 'rgba(63,182,224,.2)' },
  circulatory: { label: 'Circulatory', icon: 'sys-circulatory', accent: '#ff7d92', glow: '#ff4f68',
                 soft: 'rgba(255,79,104,.55)', soft2: 'rgba(255,79,104,.2)' },
  urogenital:  { label: 'Urogenital',  icon: 'sys-urogenital',  accent: '#ffc94d', glow: '#e0a02c',
                 soft: 'rgba(224,160,44,.55)', soft2: 'rgba(224,160,44,.2)' },
  systemic:    { label: 'Systemic',    icon: 'sys-systemic',    accent: '#41e0d0', glow: '#41e0d0',
                 soft: 'rgba(65,224,208,.55)', soft2: 'rgba(65,224,208,.2)' },
  neural:      { label: 'Neural',      icon: 'sys-neural',      accent: '#c79bff', glow: '#8e3ff0',
                 soft: 'rgba(142,63,240,.55)', soft2: 'rgba(142,63,240,.22)' },
  ecological:  { label: 'Ecological',  icon: 'sys-ecological',  accent: '#8ef0a5', glow: '#3fbf68',
                 soft: 'rgba(63,191,104,.55)', soft2: 'rgba(63,191,104,.2)' }
};

const CASES = [
  {
    tag: 'COMPARATIVE ANATOMY',
    system: 'comparative',
    subject: 'Intestinal Length',
    q: "You are comparing the intestine of a Frog vs. a Rabbit. You notice the frog's intestine is significantly shorter. What is the physiological reason?",
    options: [
      'Frogs are herbivores and digest cellulose quickly.',
      'Frogs are carnivores; meat is easier to digest than plant matter.',
      'The frog has no stomach, so the intestine is reduced.',
      'The frog absorbs nutrients through its skin, reducing intestinal need.'
    ],
    answer: 1,
    explanation: '<b>Correct.</b> Frogs are carnivores. Carnivores typically have shorter intestines because meat is digested faster than cellulose-rich plant matter.'
  },
  {
    tag: 'SURGICAL SIMULATION',
    system: 'surgical',
    subject: 'Gall Bladder Excision',
    q: 'During a procedure, the Gall Bladder is removed. Which specific nutrient digestion will be most impaired?',
    options: [
      'Proteins (into amino acids)',
      'Carbohydrates (into glucose)',
      'Fats (Emulsification)',
      'Nucleic Acids'
    ],
    answer: 2,
    explanation: '<b>Correct.</b> The liver secretes bile, stored in the gall bladder. Bile is essential for emulsifying fats. Without it, fat digestion is compromised.'
  },
  {
    tag: 'ENVIRONMENTAL STRESS',
    system: 'environment',
    subject: 'Cutaneous Failure',
    q: 'A frog is trapped in a dry, well-ventilated room. It dies after a few hours despite having functional lungs. What is the cause of death?',
    options: [
      'Starvation',
      'Asphyxiation due to skin drying',
      'Overheating (Hyperthermia)',
      'Carbon dioxide poisoning'
    ],
    answer: 1,
    explanation: '<b>Correct.</b> The skin must be maintained in a moist condition for diffusion of gases (cutaneous respiration). If the skin dries, the frog cannot breathe properly.'
  },
  {
    tag: 'CIRCULATORY LOGIC',
    system: 'circulatory',
    subject: 'Three-Chambered Heart',
    q: "The frog heart has 3 chambers (single ventricle). This means oxygenated and deoxygenated blood mix. How does the frog survive this 'inefficiency'?",
    options: [
      'It has a constant body temperature (Homeotherm).',
      'It has a very high metabolic rate.',
      'It is a poikilotherm with low energy requirements.',
      'It uses its kidneys to filter the blood.'
    ],
    answer: 2,
    explanation: '<b>Correct.</b> Frogs are cold-blooded (poikilotherms). Their metabolic needs are lower than mammals, so they can tolerate the mixed blood pumped by the single ventricle.'
  },
  {
    tag: 'UROGENITAL ANATOMY (MALE)',
    system: 'urogenital',
    subject: 'Male Duct Blockage',
    q: "CRITICAL: You discover a blockage in the 'Ureter' of a MALE frog. What fluids are blocked?",
    options: [
      'Urine only',
      'Sperms only',
      'Both Urine and Sperms',
      'Neither (Ureter is vestigial)'
    ],
    answer: 2,
    explanation: '<b>Correct.</b> In male frogs, the ureters act as a <b>urinogenital duct</b>, carrying both urine and sperms to the cloaca.'
  },
  {
    tag: 'UROGENITAL ANATOMY (FEMALE)',
    system: 'urogenital',
    subject: 'Female Duct Blockage',
    q: 'Now, the same blockage happens in a FEMALE frog. What fluids are blocked?',
    options: [
      'Urine only',
      'Ova (Eggs) only',
      'Both Urine and Ova',
      'Bile and Urine'
    ],
    answer: 0,
    explanation: '<b>Correct.</b> In females, the ureters and oviducts open <b>separately</b> into the cloaca. A blocked ureter stops urine, but not eggs.'
  },
  {
    tag: 'SYSTEMIC CONNECTION',
    system: 'systemic',
    subject: 'Testes to Cloaca',
    q: 'Sperm is produced in the testes. To exit the body, it must pass through which unrelated organ first?',
    options: [
      'The Liver',
      'The Kidney',
      'The Heart',
      'The Stomach'
    ],
    answer: 1,
    explanation: "<b>Correct.</b> Vasa efferentia arise from testes and <b>enter the kidneys</b> to reach Bidder's canal. This is a unique connection."
  },
  {
    tag: 'NEURAL & SENSORY',
    system: 'neural',
    subject: 'Loss of Balance',
    q: 'A frog is jumping but keeps losing its balance and tipping over. Which sensory organ is likely damaged?',
    options: [
      'The Tympanum (Ear)',
      'The Nictitating Membrane',
      'The Sensory Papillae (Touch)',
      'The Olfactory Lobes'
    ],
    answer: 0,
    explanation: '<b>Correct.</b> The ear (tympanum with internal ear) is an organ of hearing as well as <b>balancing (equilibrium)</b>.'
  },
  {
    tag: 'CIRCULATORY PATHWAY',
    system: 'circulatory',
    subject: 'Sinus Venosus Route',
    q: "Trace a blood cell: It enters the 'Sinus Venosus'. Where does it go immediately next?",
    options: [
      'Left Atrium',
      'Right Atrium',
      'Ventricle',
      'Conus Arteriosus'
    ],
    answer: 1,
    explanation: '<b>Correct.</b> The Sinus Venosus is a triangular structure that joins the <b>Right Atrium</b> and pours deoxygenated blood into it.'
  },
  {
    tag: 'ECOLOGICAL IMPACT',
    system: 'ecological',
    subject: 'Crop Yield Collapse',
    q: 'A village exterminates all frogs in the area. Months later, their crop yield drops drastically. Why?',
    options: [
      'Frogs were pollinating the crops.',
      'Frogs provided fertilizer via urea.',
      'Insect populations exploded and ate the crops.',
      'The soil became too dry without frogs.'
    ],
    answer: 2,
    explanation: '<b>Correct.</b> Frogs are beneficial because they eat insects and protect crops. They maintain the ecological balance.'
  }
];

/* Rank tiers - thresholds and copy match the original evaluation exactly. */
const RANKS = [
  {
    min: 9,
    title: 'Diagnosis: CHIEF SURGEON',
    color: '#d500f9',
    soft: 'rgba(213,0,249,.45)',
    stars: 3,
    message: 'Outstanding! ({score}/{total}).<br>You have mastered the anatomy of <i>Rana tigrina</i>.'
  },
  {
    min: 6,
    title: 'Diagnosis: RESIDENT',
    color: '#ea80fc',
    soft: 'rgba(234,128,252,.45)',
    stars: 2,
    message: 'Good work ({score}/{total}).<br>You have a solid understanding, but review the finer details.'
  },
  {
    min: 0,
    title: 'Diagnosis: INTERN',
    color: '#ff5252',
    soft: 'rgba(255,82,82,.45)',
    stars: 1,
    message: 'Score: {score}/{total}.<br>Review the circulatory and urogenital systems and try again.'
  }
];

function rankFor(score) {
  return RANKS.find(r => score >= r.min) || RANKS[RANKS.length - 1];
}

/* ---------------------------------------------------------------------------
   Reference material for the "Learn More" panel on the results screen. This is
   conceptual background only - the gameplay instructions live on the main menu
   under "How to Play" and the two are deliberately kept apart.
   ------------------------------------------------------------------------- */
const REFERENCE = [
  {
    icon: 'frog',
    heading: 'The Specimen',
    body: '<p><b><i>Rana tigrina</i></b> &mdash; the Indian bull frog &mdash; is the standard teaching specimen for vertebrate anatomy. It is an <b>amphibian</b>: aquatic as a larva, partly terrestrial as an adult, and dependent on moist skin for its entire life.</p>' +
          '<p>A frog is a <b>poikilotherm</b> (cold-blooded): its body temperature tracks the surroundings, so its metabolic demand stays low. That single fact explains a surprising amount of its anatomy.</p>'
  },
  {
    icon: 'sys-comparative',
    heading: 'Digestive System',
    body: '<ul>' +
          '<li><b>Alimentary canal:</b> mouth &rarr; buccal cavity &rarr; oesophagus &rarr; stomach &rarr; intestine &rarr; rectum &rarr; <b>cloaca</b>. The cloaca is the shared exit for digestive, urinary and reproductive products.</li>' +
          '<li><b>Carnivore length rule:</b> flesh is quicker to break down than cellulose, so carnivores carry a short intestine while herbivores need a long one.</li>' +
          '<li><b>Bile &amp; emulsification:</b> the <b>liver</b> makes bile, the <b>gall bladder</b> stores it. Bile carries no enzymes &mdash; it breaks large fat droplets into fine ones so lipase can reach them.</li>' +
          '<li><b>Tongue:</b> bilobed and attached at the front, flicked outward to trap insects.</li>' +
          '</ul>'
  },
  {
    icon: 'sys-environment',
    heading: 'Respiration',
    body: '<p>A frog breathes through <b>three</b> surfaces, and never relies on only one:</p>' +
          '<ul>' +
          '<li><b>Cutaneous</b> &mdash; gas diffusion straight across moist skin, both in water and on land. Dry skin means no diffusion, which is why a frog can suffocate in a dry room with perfectly healthy lungs.</li>' +
          '<li><b>Buccal</b> &mdash; exchange across the lining of the buccal cavity.</li>' +
          '<li><b>Pulmonary</b> &mdash; the lungs, used mainly on land.</li>' +
          '</ul>' +
          '<p>Tadpoles instead use <b>gills</b>. Note that a frog has no diaphragm and no ribs: it forces air in by raising the floor of its mouth.</p>'
  },
  {
    icon: 'sys-circulatory',
    heading: 'Circulatory System',
    body: '<ul>' +
          '<li><b>Three chambers:</b> two atria and a <b>single ventricle</b>, so oxygenated and deoxygenated blood mix. A low metabolic rate makes that tolerable.</li>' +
          '<li><b>Sinus venosus:</b> a triangular chamber that collects deoxygenated blood from the major veins and empties it into the <b>right atrium</b>.</li>' +
          '<li><b>Conus arteriosus:</b> arises from the ventricle and carries blood out to the aortic arches.</li>' +
          '<li><b>Closed circulation</b> with red blood cells that are nucleated and oval &mdash; unlike the disc-shaped, nucleus-free cells of a mammal.</li>' +
          '<li><b>Portal systems:</b> hepatic and renal portal veins are both present.</li>' +
          '</ul>'
  },
  {
    icon: 'sys-urogenital',
    heading: 'Urogenital System',
    body: '<p>Excretion and reproduction share plumbing in the male and stay separate in the female &mdash; the single most examinable contrast in the whole specimen.</p>' +
          '<ul>' +
          '<li><b>Kidneys:</b> a pair of <b>mesonephric</b> kidneys; the frog is <b>ureotelic</b>, excreting urea.</li>' +
          '<li><b>Male:</b> <b>vasa efferentia</b> leave the testes and enter the kidney to reach <b>Bidder&rsquo;s canal</b>. The ureter then carries <i>both</i> urine and sperm, which is why it is called the <b>urinogenital duct</b>.</li>' +
          '<li><b>Female:</b> the <b>oviducts</b> and the ureters open <b>separately</b> into the cloaca, so a blocked ureter never obstructs eggs.</li>' +
          '<li><b>Fertilisation</b> is external, and development passes through a tadpole stage &mdash; <b>metamorphosis</b>.</li>' +
          '</ul>'
  },
  {
    icon: 'sys-neural',
    heading: 'Nervous &amp; Sensory Systems',
    body: '<ul>' +
          '<li><b>Central:</b> brain plus spinal cord; the brain divides into fore-, mid- and hind-brain. <b>Olfactory lobes</b> handle smell.</li>' +
          '<li><b>Ear:</b> the <b>tympanum</b> is the external membrane. Together with the internal ear it serves hearing <i>and</i> <b>equilibrium</b> &mdash; damage it and the frog can no longer balance.</li>' +
          '<li><b>Eye:</b> protected by a <b>nictitating membrane</b>, a transparent third eyelid that keeps the cornea moist underwater.</li>' +
          '<li><b>Sensory papillae:</b> touch and taste receptors in the skin and mouth.</li>' +
          '<li><b>Cranial nerves:</b> ten pairs.</li>' +
          '</ul>'
  },
  {
    icon: 'sys-ecological',
    heading: 'Ecological Importance',
    body: '<ul>' +
          '<li>Frogs are voracious <b>insectivores</b>, and act as natural pest control for standing crops. Remove them and insect numbers climb until yields fall.</li>' +
          '<li>They sit in the middle of the food web &mdash; predator to insects, prey to snakes and birds &mdash; so they transfer energy upward.</li>' +
          '<li>Thin permeable skin makes them <b>bio-indicators</b>: amphibian decline is an early warning of pollution.</li>' +
          '<li>Some species are eaten as food, which is why several are now legally protected against over-harvesting.</li>' +
          '</ul>'
  },
  {
    icon: 'journal',
    heading: 'Glossary',
    body: '<ul>' +
          '<li><b>Poikilotherm</b> &mdash; animal whose body temperature varies with the environment.</li>' +
          '<li><b>Cutaneous respiration</b> &mdash; gas exchange through the skin.</li>' +
          '<li><b>Emulsification</b> &mdash; breaking fat into fine droplets to expose more surface to enzymes.</li>' +
          '<li><b>Cloaca</b> &mdash; common chamber receiving digestive, urinary and genital products.</li>' +
          '<li><b>Urinogenital duct</b> &mdash; duct carrying both urine and gametes (male frog).</li>' +
          '<li><b>Vasa efferentia</b> &mdash; fine tubules conducting sperm from testis into the kidney.</li>' +
          '<li><b>Bidder&rsquo;s canal</b> &mdash; longitudinal canal in the kidney collecting sperm.</li>' +
          '<li><b>Sinus venosus</b> &mdash; venous collecting chamber opening into the right atrium.</li>' +
          '<li><b>Conus arteriosus</b> &mdash; outflow tract leaving the ventricle.</li>' +
          '<li><b>Tympanum</b> &mdash; external ear membrane; hearing and balance.</li>' +
          '<li><b>Nictitating membrane</b> &mdash; transparent third eyelid.</li>' +
          '<li><b>Ureotelic</b> &mdash; excreting nitrogenous waste chiefly as urea.</li>' +
          '</ul>'
  }
];
