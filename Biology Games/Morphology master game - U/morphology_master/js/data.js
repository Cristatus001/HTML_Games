/* ============================================================
   Content for Morphology Master.
   The questions, options, correct answers and every feedback
   string are carried over unchanged from the original build.
   ============================================================ */
(function (global) {
  'use strict';

  /* Each level: questions the examiner asks, the answer key, and the exact
     verdict copy shown for an incomplete / correct / incorrect submission. */
  var LEVELS = [
    {
      id: 1,
      name: 'The External Shield',
      tagline: 'Integument, coloration and texture',
      badge: 'specimen',
      brief: 'Configure <b>BOTH</b> the skin color and texture of the specimen.',
      questions: [
        {
          id: 'skinColor',
          label: 'Select Dorsal Coloration',
          options: [
            { value: 'Olive',  label: 'Olive Green + Spots',      img: 'skin-olive'  },
            { value: 'Yellow', label: 'Uniform Pale Yellow',      img: 'skin-yellow' }
          ]
        },
        {
          id: 'skinTexture',
          label: 'Select Skin Texture',
          options: [
            { value: 'Dry',   label: 'Dry & Scaly',               img: 'texture-dry'   },
            { value: 'Moist', label: 'Smooth & Slippery (Mucus)', img: 'texture-moist' }
          ]
        }
      ],
      key: { skinColor: 'Olive', skinTexture: 'Moist' },
      submitLabel: 'Submit Observations',
      incomplete: 'Please select BOTH a Dorsal Color and a Skin Texture before submitting.',
      successTitle: 'Correct Observation',
      successText: 'The dorsal side is olive green with dark irregular spots, and the skin is smooth and slippery due to mucus.',
      failTitle: 'Incorrect',
      failText: 'Review Morphology: Dorsal side is olive green (not yellow). Skin must be moist for respiration.'
    },

    {
      id: 2,
      name: 'Sensory Adaptation',
      tagline: 'Organs of vision and hearing',
      badge: 'microscope',
      brief: 'Identify <b>BOTH</b> correct organs for vision and hearing.',
      questions: [
        {
          id: 'eyeFeature',
          label: 'Select Eye Protection',
          options: [
            { value: 'Eyelids',     label: 'Standard Eyelids',      img: 'eye-eyelid'      },
            { value: 'Nictitating', label: 'Nictitating Membrane',  img: 'eye-nictitating' }
          ]
        },
        {
          id: 'earFeature',
          label: 'Select Hearing Organ',
          options: [
            { value: 'Pinna',     label: 'External Ear (Pinna)',   img: 'ear-pinna'    },
            { value: 'Tympanum',  label: 'Membranous Tympanum',    img: 'ear-tympanum' }
          ]
        }
      ],
      key: { eyeFeature: 'Nictitating', earFeature: 'Tympanum' },
      submitLabel: 'Submit Sensory Data',
      incomplete: 'Please select BOTH an Eye feature and an Ear feature.',
      successTitle: 'Sensory Data Verified',
      successText: 'The nictitating membrane protects eyes in water. The membranous tympanum acts as the ear.',
      failTitle: 'Identification Failed',
      failText: 'Frogs use a Tympanum (not Pinna) and Nictitating membranes (not just eyelids) for water protection.'
    },

    {
      id: 3,
      name: 'Sexual Dimorphism',
      tagline: 'Traits that distinguish the male',
      badge: 'lamp',
      brief: 'Identify the <b>MALE</b> frog. All three fields must be set.',
      questions: [
        {
          id: 'forelimb',
          label: 'Forelimb Feature',
          options: [
            { value: 'standard', label: 'Standard Digits',            img: 'forelimb-standard' },
            { value: 'pad',      label: 'Copulatory Pad (1st Digit)', img: 'forelimb-pad'      }
          ]
        },
        {
          id: 'throat',
          label: 'Throat Feature',
          options: [
            { value: 'smooth', label: 'Smooth Throat', img: 'throat-smooth' },
            { value: 'sacs',   label: 'Vocal Sacs',    img: 'throat-sacs'   }
          ]
        },
        {
          id: 'hind',
          label: 'Hind Limb Digits',
          options: [
            { value: '4', label: '4 Digits',           img: 'hind-4' },
            { value: '5', label: '5 Digits (Webbed)',  img: 'hind-5' }
          ]
        }
      ],
      key: { forelimb: 'pad', throat: 'sacs', hind: '5' },
      submitLabel: 'Identify Specimen',
      incomplete: 'Please make a selection for ALL three traits (Forelimb, Throat, Hind Limb).',
      successTitle: 'Specimen Identified: MALE',
      successText: 'Correct. Males are distinguished by sound-producing vocal sacs and a copulatory pad. Hind limbs have 5 digits.',
      failTitle: 'Review Morphology',
      /* The original spelled out which of the two conditions failed. */
      failDetail: function (state) {
        var isMale = state.forelimb === 'pad' && state.throat === 'sacs';
        var hindOk = state.hind === '5';
        var lines = [];
        if (!hindOk) lines.push('Hind limbs must have 5 digits.');
        if (!isMale) lines.push('Males need Vocal Sacs and Copulatory Pads.');
        return { lead: 'Incorrect Classification.', bullets: lines };
      }
    }
  ];

  /* Short readout wording for the vitrine, keyed by question + chosen value. */
  var READOUT = {
    skinColor:   { Olive: 'Olive green, spotted', Yellow: 'Uniform pale yellow' },
    skinTexture: { Dry: 'Dry, scaly',             Moist: 'Moist, mucus-covered' },
    eyeFeature:  { Eyelids: 'Standard eyelids',   Nictitating: 'Nictitating membrane' },
    earFeature:  { Pinna: 'External pinna',       Tympanum: 'Membranous tympanum' },
    forelimb:    { standard: 'Standard digits',   pad: 'Copulatory pad' },
    throat:      { smooth: 'Smooth throat',       sacs: 'Vocal sacs' },
    hind:        { '4': '4 digits',               '5': '5 digits, webbed' }
  };

  /* Gameplay only. Reference material lives in REFERENCE, behind Learn More. */
  var HOW_TO_PLAY = [
    'Work through <b>three field stations</b>. Each one asks you to identify real morphological features of the specimen.',
    'Tap or click an <b>answer plate</b> to select it. The chosen plate lifts and gains a brass rim, and the specimen case updates to show what you picked.',
    'Every question in a station must be answered before the examiner will accept your work.',
    'Press <b>Submit</b> to have your observations verified. A wrong submission can be retried as often as you like.',
    'Each station awards up to <b>three seals</b>. Get it right first time for all three; every retry costs you one.',
    'Keyboard: press <b>1</b> to <b>4</b> to pick options in a question, <b>Enter</b> to submit, <b>Esc</b> to close a panel.',
    'Progress saves automatically on this device, so you can close the game and pick up where you stopped.'
  ];

  /* Conceptual and reference material, deliberately kept out of How to Play. */
  var REFERENCE = [
    {
      h: 'The specimen',
      p: 'Rana tigrina, the Indian bullfrog, is a large amphibian of ponds, ditches and paddy fields across the Indian subcontinent. Phylum Chordata, class Amphibia. It is poikilothermic, meaning body temperature varies with the surroundings, and it survives temperature extremes by hibernating in winter and aestivating in summer inside burrows.',
      tags: ['Chordata', 'Amphibia', 'Anura', 'Poikilothermic']
    },
    {
      h: 'Skin and coloration',
      dl: [
        ['Dorsal surface', 'Olive green marked with dark irregular spots, which breaks up the outline against pond weed and mud. This is protective coloration, not mimicry.'],
        ['Ventral surface', 'Pale uniform yellow, so the animal is hard to see from below against the light.'],
        ['Texture', 'Smooth, moist and slippery. Mucus glands keep it wet; the skin has no scales, no hair and no feathers.'],
        ['Why moisture matters', 'A frog breathes through its skin as well as its lungs. Cutaneous respiration needs a thin, wet, well-supplied surface, so a dry or scaly skin would suffocate it. In water the skin is the only respiratory surface used.']
      ]
    },
    {
      h: 'Sense organs of the head',
      dl: [
        ['Eyes', 'Large and bulging, with an upper eyelid, a lower eyelid, and a third transparent fold, the nictitating membrane. That membrane sweeps across the eye underwater: it protects and keeps the cornea moist while still letting the frog see.'],
        ['Ears', 'There is no pinna and no external ear opening. Instead a membranous tympanum sits flush on each side of the head, just behind the eye, and receives sound waves directly.'],
        ['Nostrils', 'A pair of external nares sit near the tip of the snout so the frog can breathe while almost fully submerged.'],
        ['Tongue', 'Bilobed and attached at the front, it is flicked out to capture insects.']
      ]
    },
    {
      h: 'Limbs and locomotion',
      dl: [
        ['Forelimbs', 'Short, with four digits, and no web. They absorb the shock of landing after a jump.'],
        ['Hind limbs', 'Long and muscular, with five digits joined by a web. The web turns the foot into a paddle for swimming, and the length of the limb powers the leap.'],
        ['Body plan', 'Head and trunk only; there is no neck and no tail in the adult.']
      ]
    },
    {
      h: 'Sexual dimorphism',
      p: 'Males and females are the same in most respects, so identification rests on two structures found only in the male.',
      dl: [
        ['Vocal sacs', 'Paired sacs at the sides of the throat that inflate and amplify the call used to attract females during the breeding season. Females have none.'],
        ['Copulatory pad', 'Also called the nuptial pad. A dark, roughened swelling on the first digit of each forelimb that grips the female during amplexus.']
      ]
    },
    {
      h: 'Why it matters',
      p: 'Frogs eat large numbers of insects and so help keep crop pests in check, which makes them useful in paddy agriculture. They also sit in the middle of the food web, eaten by snakes and birds, and their permeable skin makes them sensitive indicators of water pollution.',
      tags: ['Pest control', 'Food web', 'Bioindicator']
    }
  ];

  var VICTORY_SUMMARY = [
    '<b>Skin:</b> Moist, slippery, dorsal olive-green with spots.',
    '<b>Senses:</b> Tympanum (ear) and Nictitating membrane (eye protection).',
    '<b>Male Traits:</b> Vocal sacs and Copulatory pad on forelimb.'
  ];

  global.GAME_DATA = {
    levels: LEVELS,
    readout: READOUT,
    howToPlay: HOW_TO_PLAY,
    reference: REFERENCE,
    victorySummary: VICTORY_SUMMARY
  };
})(window);
