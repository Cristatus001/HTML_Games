/* Frog Anatomy Dash — content.
   Zone 1 carries the original ten questions verbatim (same wording, same
   options, same answer indices) and the original platform layout. Zones 2 and
   3 extend the same format.

   Platform / orb coordinates are in world units (900 x 600), the same space
   the original canvas used, so physics behaves identically.                  */
(function (global) {
  'use strict';

  var ZONES = [
    {
      id: 'z1',
      name: 'Swamp Tower',
      subtitle: 'Structural organisation of Rana tigrina',
      crest: 'zone-1',
      spawn: { x: 140, y: 500 },
      platforms: [
        { x: 0,   y: 550, w: 900, h: 50 },
        { x: 200, y: 450, w: 120, h: 20 },
        { x: 450, y: 400, w: 120, h: 20 },
        { x: 700, y: 350, w: 120, h: 20 },
        { x: 500, y: 280, w: 120, h: 20 },
        { x: 250, y: 220, w: 150, h: 20 },
        { x: 50,  y: 150, w: 120, h: 20 },
        { x: 250, y: 80,  w: 100, h: 20 },
        { x: 500, y: 80,  w: 100, h: 20 },
        { x: 750, y: 120, w: 100, h: 20 }
      ],
      orbs: [
        { id: 1, x: 250, y: 410, w: 30, h: 30, art: 'heart',
          q: "The frog's heart has 2 Atria and how many Ventricles?",
          opts: ['One', 'Two', 'Three'], ans: 0 },
        { id: 2, x: 500, y: 360, w: 30, h: 30, art: 'liver',
          q: 'This gland secretes bile but does not store it:',
          opts: ['Pancreas', 'Liver', 'Gall Bladder'], ans: 1 },
        { id: 3, x: 750, y: 310, w: 30, h: 30, art: 'urea',
          q: "Frogs are 'Ureotelic', meaning they primarily excrete:",
          opts: ['Ammonia', 'Uric Acid', 'Urea'], ans: 2 },
        { id: 4, x: 550, y: 240, w: 30, h: 30, art: 'skin',
          q: 'Cutaneous respiration refers to breathing through the:',
          opts: ['Lungs', 'Buccal Cavity', 'Skin'], ans: 2 },
        { id: 5, x: 300, y: 180, w: 30, h: 30, art: 'cloaca',
          q: 'The common chamber for urine, feces, and sperm is the:',
          opts: ['Rectum', 'Cloaca', 'Colon'], ans: 1 },
        { id: 6, x: 100, y: 110, w: 30, h: 30, art: 'prey', hots: true,
          q: 'Why is the alimentary canal of the frog shorter than in herbivores?',
          opts: ['They absorb less', 'They are Carnivores', 'They lack a stomach'], ans: 1 },
        { id: 7, x: 290, y: 40, w: 30, h: 30, art: 'testes', hots: true,
          q: 'In males, Vasa Efferentia connect the Testes directly to the:',
          opts: ['Cloaca', 'Kidneys', 'Liver'], ans: 1 },
        { id: 8, x: 540, y: 40, w: 30, h: 30, art: 'brain', hots: true,
          q: 'The Medulla Oblongata connects to the Spinal Cord through the:',
          opts: ['Foramen Magnum', 'Optic Lobe', 'Cranium'], ans: 0 },
        { id: 9, x: 790, y: 80, w: 30, h: 30, art: 'portal', hots: true,
          q: 'The special venous connection between Liver and Intestine is:',
          opts: ['Renal Portal System', 'Hepatic Portal System', 'Pulmonary Loop'], ans: 1 },
        { id: 10, x: 50, y: 510, w: 30, h: 30, art: 'sun', hots: true,
          q: 'During Aestivation (Summer Sleep), why does pulmonary respiration stop?',
          opts: ['Lungs collapse', 'They use Skin only', 'Nostrils seal shut'], ans: 1 }
      ],
      learn: {
        title: 'Field Notes — Structural Organisation',
        intro: 'Rana tigrina, the Indian bull frog, is the standard example of ' +
               'an amphibian body plan: a cold-blooded (poikilothermic) ' +
               'vertebrate that lives on land and in water.',
        entries: [
          { art: 'heart', term: 'Three-chambered heart',
            text: 'Two atria plus a single undivided ventricle. Because there ' +
                  'is only one ventricle, oxygenated and deoxygenated blood ' +
                  'mix partially — enough for an animal with a low metabolic rate.' },
          { art: 'liver', term: 'Liver and gall bladder',
            text: 'The liver secretes bile; the gall bladder only stores it. ' +
                  'Bile emulsifies fat, it contains no digestive enzyme.' },
          { art: 'urea', term: 'Ureotelism',
            text: 'Frogs excrete nitrogen mainly as urea. Urea is far less ' +
                  'toxic than ammonia and needs much less water to flush out ' +
                  'than the ammonia excreted by fully aquatic animals.' },
          { art: 'skin', term: 'Cutaneous respiration',
            text: 'Gas exchange straight across moist, richly vascular skin. ' +
                  'It works in water and on land, and is the frog\'s only route ' +
                  'while it sleeps out a season buried in mud.' },
          { art: 'cloaca', term: 'Cloaca',
            text: 'One shared chamber receiving the rectum, urinary ducts and ' +
                  'genital ducts, opening by the cloacal aperture.' },
          { art: 'prey', term: 'Carnivorous gut',
            text: 'Frogs catch live insects with a sticky bilobed tongue. ' +
                  'Animal protein is easy to digest, so the alimentary canal is ' +
                  'short — herbivores need a long gut for cellulose.' },
          { art: 'testes', term: 'Vasa efferentia',
            text: 'Fine ducts leaving each testis and entering the kidney of ' +
                  'that side, joining Bidder\'s canal and then the ureter, which ' +
                  'carries both sperm and urine to the cloaca.' },
          { art: 'brain', term: 'Foramen magnum',
            text: 'The opening at the base of the skull through which the ' +
                  'medulla oblongata continues as the spinal cord.' },
          { art: 'portal', term: 'Hepatic portal system',
            text: 'A vein carrying nutrient-rich blood from the intestine to ' +
                  'the liver before it reaches the heart, so the liver can ' +
                  'process and store what was absorbed. The frog also has a ' +
                  'renal portal system serving the kidneys.' },
          { art: 'sun', term: 'Aestivation and hibernation',
            text: 'Summer sleep and winter sleep. Buried in moist mud the frog ' +
                  'drops its metabolic rate and relies on skin respiration only.' }
        ]
      }
    },

    {
      id: 'z2',
      name: 'Organ Ascent',
      subtitle: 'Organ systems, senses and life cycle',
      crest: 'zone-2',
      spawn: { x: 60, y: 500 },
      platforms: [
        { x: 0,   y: 550, w: 900, h: 50 },
        { x: 120, y: 470, w: 140, h: 20 },
        { x: 380, y: 440, w: 120, h: 20 },
        { x: 620, y: 470, w: 140, h: 20 },
        { x: 790, y: 380, w: 110, h: 20 },
        { x: 540, y: 330, w: 130, h: 20 },
        { x: 300, y: 300, w: 130, h: 20 },
        { x: 80,  y: 240, w: 140, h: 20 },
        { x: 330, y: 180, w: 140, h: 20 },
        { x: 600, y: 140, w: 150, h: 20 }
      ],
      orbs: [
        { id: 1, x: 175, y: 430, w: 30, h: 30, art: 'blood',
          q: 'Unlike mammals, the red blood cells of a frog are:',
          opts: ['Nucleated', 'Non-nucleated', 'Absent from blood'], ans: 0 },
        { id: 2, x: 425, y: 400, w: 30, h: 30, art: 'kidney',
          q: 'The kidneys of the frog are of which type?',
          opts: ['Pronephric', 'Mesonephric', 'Metanephric'], ans: 1 },
        { id: 3, x: 675, y: 430, w: 30, h: 30, art: 'tympanum',
          q: 'A frog has no external ear. Sound waves are received by the:',
          opts: ['Pinna', 'Tympanum', 'External nostril'], ans: 1 },
        { id: 4, x: 830, y: 340, w: 30, h: 30, art: 'eye',
          q: "Which membrane protects the frog's eye while it is under water?",
          opts: ['Tympanic membrane', 'Nictitating membrane', 'Basement membrane'], ans: 1 },
        { id: 5, x: 585, y: 290, w: 30, h: 30, art: 'foot',
          q: 'The five webbed digits of the hind limbs are used mainly for:',
          opts: ['Grasping prey', 'Swimming and leaping', 'Digging burrows'], ans: 1 },
        { id: 6, x: 345, y: 260, w: 30, h: 30, art: 'tadpole',
          q: 'The tadpole larva of a frog respires by means of:',
          opts: ['Gills', 'Lungs', 'Skin only'], ans: 0 },
        { id: 7, x: 130, y: 200, w: 30, h: 30, art: 'tongue',
          q: "The frog's tongue is fixed in front and behind it is:",
          opts: ['Bilobed and free', 'Fused to the jaw', 'Completely absent'], ans: 0 },
        { id: 8, x: 385, y: 140, w: 30, h: 30, art: 'eggs',
          q: 'At one time a mature female frog lays roughly how many eggs?',
          opts: ['250 to 300', '2500 to 3000', '25000 to 30000'], ans: 1 },
        { id: 9, x: 660, y: 100, w: 30, h: 30, art: 'nerve',
          q: "How many pairs of cranial nerves arise from the frog's brain?",
          opts: ['Eight', 'Ten', 'Twelve'], ans: 1 },
        { id: 10, x: 830, y: 510, w: 30, h: 30, art: 'lungs',
          q: 'Pulmonary respiration in the frog takes place through the:',
          opts: ['Lungs', 'Buccal cavity', 'Skin'], ans: 0 }
      ],
      learn: {
        title: 'Field Notes — Organ Systems',
        intro: 'The frog carries a full set of vertebrate organ systems in a ' +
               'compact body: digestive, respiratory, circulatory, excretory, ' +
               'nervous, reproductive and a well-developed muscular skeleton.',
        entries: [
          { art: 'blood', term: 'Nucleated RBCs',
            text: 'Amphibian erythrocytes keep their nucleus throughout life. ' +
                  'Mammalian RBCs lose theirs on maturing.' },
          { art: 'kidney', term: 'Mesonephric kidneys',
            text: 'A pair of dark red, bean-shaped kidneys on either side of ' +
                  'the vertebral column. Urine passes by ureters to the cloaca.' },
          { art: 'tympanum', term: 'Tympanum',
            text: 'The frog has no external ear, only a tympanic membrane on ' +
                  'each side of the head that receives sound waves.' },
          { art: 'eye', term: 'Nictitating membrane',
            text: 'A transparent third eyelid that sweeps across the bulged eye ' +
                  'to protect it while the frog is in water.' },
          { art: 'foot', term: 'Webbed hind limbs',
            text: 'Hind limbs are longer and stronger than the forelimbs and ' +
                  'end in five webbed digits — the propulsion for leaping and ' +
                  'swimming. Forelimbs have four digits and no web.' },
          { art: 'tadpole', term: 'Metamorphosis',
            text: 'Eggs hatch into gill-breathing tadpoles that feed and grow ' +
                  'in water, then metamorphose into lung-breathing adults.' },
          { art: 'tongue', term: 'Bilobed tongue',
            text: 'Attached at the front of the mouth and free behind, it flicks ' +
                  'out to trap insects on its sticky surface.' },
          { art: 'eggs', term: 'External fertilisation',
            text: 'A female lays 2500 to 3000 eggs at a time in water; the male ' +
                  'sheds sperm over them, so fertilisation happens outside the body.' },
          { art: 'nerve', term: 'Ten pairs of cranial nerves',
            text: 'The brain lies inside the cranium and gives off ten pairs of ' +
                  'cranial nerves; the nervous system also has spinal and ' +
                  'autonomic divisions.' },
          { art: 'lungs', term: 'Pulmonary respiration',
            text: 'A pair of thin, elastic, sac-like lungs inside the trunk, ' +
                  'ventilated through the nostrils and buccal cavity while the ' +
                  'frog is on land.' }
        ]
      }
    },

    {
      id: 'z3',
      name: 'HOTS Canopy',
      subtitle: 'Reason it out: adaptation and physiology',
      crest: 'zone-3',
      spawn: { x: 60, y: 500 },
      platforms: [
        { x: 0,   y: 550, w: 900, h: 50 },
        { x: 200, y: 480, w: 130, h: 20 },
        { x: 440, y: 430, w: 120, h: 20 },
        { x: 680, y: 470, w: 130, h: 20 },
        { x: 700, y: 360, w: 140, h: 20 },
        { x: 450, y: 300, w: 130, h: 20 },
        { x: 200, y: 250, w: 130, h: 20 },
        { x: 420, y: 190, w: 120, h: 20 },
        { x: 650, y: 140, w: 130, h: 20 },
        { x: 100, y: 120, w: 130, h: 20 }
      ],
      orbs: [
        { id: 1, x: 250, y: 440, w: 30, h: 30, art: 'skin', hots: true,
          q: 'A frog kept in a dry, airy box turns sluggish and soon dies. Why?',
          opts: ['Its moist skin dries, so cutaneous respiration fails',
                 'It cannot find any food inside the box',
                 'Its lungs collapse without water pressure'], ans: 0 },
        { id: 2, x: 485, y: 390, w: 30, h: 30, art: 'blood', hots: true,
          q: 'Frog RBCs keep their nuclei. What does that tell you?',
          opts: ['Amphibian RBCs stay nucleated, unlike mammalian ones',
                 'Frog RBCs cannot carry oxygen at all',
                 'Frog blood is made only in the liver'], ans: 0 },
        { id: 3, x: 730, y: 430, w: 30, h: 30, art: 'portal', hots: true,
          q: 'Why route intestinal blood to the liver before it reaches the heart?',
          opts: ['So the liver processes absorbed nutrients first',
                 'So the blood is oxygenated inside the liver',
                 'So urea can be dumped back into the intestine'], ans: 0 },
        { id: 4, x: 750, y: 320, w: 30, h: 30, art: 'sun', hots: true,
          q: 'A frog survives months buried in summer mud because it has:',
          opts: ['A greatly lowered metabolic rate plus skin respiration',
                 'Oxygen stored inside its urinary bladder',
                 'A faster heartbeat that saves energy'], ans: 0 },
        { id: 5, x: 495, y: 260, w: 30, h: 30, art: 'urea', hots: true,
          q: 'Being ureotelic rather than ammonotelic helps a land frog because urea is:',
          opts: ['Less toxic and needs less water to excrete',
                 'More toxic but far cheaper to make',
                 'Excreted harmlessly as a gas'], ans: 0 },
        { id: 6, x: 245, y: 210, w: 30, h: 30, art: 'heart', hots: true,
          q: 'A single ventricle mixes the blood, yet the frog thrives. Why?',
          opts: ['Skin respiration adds oxygen and its demand is low',
                 'The ventricle actually has a complete septum',
                 'The frog has two hearts working in turn'], ans: 0 },
        { id: 7, x: 465, y: 150, w: 30, h: 30, art: 'muscle', hots: true,
          q: 'Hind limbs are longer and far more muscular than forelimbs in order to:',
          opts: ['Generate thrust for leaping and swimming',
                 'Hold the heavy head upright',
                 'Dig permanent burrows in dry soil'], ans: 0 },
        { id: 8, x: 695, y: 100, w: 30, h: 30, art: 'bone', hots: true,
          q: 'Which pair of external features identifies a male frog?',
          opts: ['Vocal sacs and a nuptial pad on the first digit',
                 'A larger body with no tympanum',
                 'Webbed forelimbs and a longer tongue'], ans: 0 },
        { id: 9, x: 145, y: 80, w: 30, h: 30, art: 'sperm', hots: true,
          q: 'Fertilisation is external. What does laying 2500+ eggs achieve?',
          opts: ['It offsets heavy losses of eggs and tadpoles',
                 'It removes the need for water entirely',
                 'It guarantees that every egg hatches'], ans: 0 },
        { id: 10, x: 830, y: 510, w: 30, h: 30, art: 'hibernation', hots: true,
          q: 'Through hibernation and aestivation the frog breathes chiefly:',
          opts: ['Cutaneously, across its moist skin',
                 'Pulmonarily, using both lungs',
                 'Buccally, through the mouth lining'], ans: 0 }
      ],
      learn: {
        title: 'Field Notes — Adaptation and Physiology',
        entries: [
          { art: 'skin', term: 'Why moisture matters',
            text: 'Cutaneous respiration only works across a wet surface, ' +
                  'because oxygen must dissolve before it can diffuse into ' +
                  'blood. Dry skin means suffocation.' },
          { art: 'heart', term: 'Incomplete double circulation',
            text: 'Blood passes twice through the heart, but the single ' +
                  'ventricle mixes the two streams. It is sufficient because ' +
                  'the frog is poikilothermic with a modest oxygen demand and ' +
                  'tops up oxygen through its skin.' },
          { art: 'urea', term: 'The cost of excretion',
            text: 'Ammonia is highly toxic and must be diluted in a lot of ' +
                  'water; urea is much less toxic, so it can be carried in ' +
                  'blood and released with far less water loss.' },
          { art: 'sun', term: 'Dormancy',
            text: 'Aestivation escapes summer heat and drought, hibernation ' +
                  'escapes winter cold. Both work by cutting the metabolic ' +
                  'rate right down while the skin handles gas exchange.' },
          { art: 'muscle', term: 'Locomotory adaptation',
            text: 'The muscular hind limbs act as a single lever system, ' +
                  'straightening explosively so the frog leaps clear of ' +
                  'predators or drives itself through water.' },
          { art: 'bone', term: 'Sexual dimorphism',
            text: 'The male carries sound-producing vocal sacs and a nuptial ' +
                  '(copulatory) pad on the first digit of each forelimb; the ' +
                  'female has neither.' },
          { art: 'sperm', term: 'Reproductive strategy',
            text: 'External fertilisation in water wastes enormous numbers of ' +
                  'gametes and young, so a very large clutch is the ' +
                  'compensating adaptation.' },
          { art: 'portal', term: 'Portal systems',
            text: 'A portal vein begins and ends in capillaries. The hepatic ' +
                  'portal system samples the gut before the general ' +
                  'circulation; the renal portal system serves the kidneys.' },
          { art: 'blood', term: 'Amphibian blood',
            text: 'Plasma with nucleated RBCs, WBCs and platelets. It carries ' +
                  'gases, nutrients, hormones and wastes, and clots on injury.' },
          { art: 'hibernation', term: 'Ecological role',
            text: 'Frogs eat insects and so protect crops; they are an ' +
                  'important link in the food chain, and are themselves eaten ' +
                  'in some countries.' }
        ]
      }
    }
  ];

  /* Gameplay-only help. Conceptual material lives in each zone's `learn`. */
  var HOW_TO_PLAY = {
    objective: 'Climb the swamp and touch all ten Knowledge Orbs. Each orb ' +
               'asks one question about frog anatomy — answer it correctly to ' +
               'absorb the orb. Collect all ten to clear the zone.',
      rows: [
      { icon: 'key-left',  label: 'Left / A',  text: 'Hop left' },
      { icon: 'key-right', label: 'Right / D', text: 'Hop right' },
      { icon: 'key-space', label: 'Space / W / Up', text: 'Jump high' },
      { icon: 'arrow-up',  label: 'Touch pad', text: 'On phones, use the on-screen pads' }
    ],
    tips: [
      'A wrong answer costs you nothing but a retry — the orb stays put.',
      'Answer every orb first time to earn three lotus seals.',
      'Fall in the water and you simply start the climb again; orbs you have ' +
      'already absorbed stay absorbed.'
    ]
  };

  global.GameData = { ZONES: ZONES, HOW_TO_PLAY: HOW_TO_PLAY, ORBS_PER_ZONE: 10 };
})(window);
