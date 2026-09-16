/* ===========================================================================
   Hemichordata Quest — content
   The five riddles, their answers and their hints are reproduced EXACTLY as
   they appear in the original hemichordata_quest.html. Nothing here changes
   what counts as a correct answer.
   ======================================================================== */
(function (global) {
  'use strict';

  /* Chamber order follows the original riddle order. `t` is the position of
     the chamber along the burrow path (0 = surface hole, 1 = blind end). */
  var CHAMBERS = [
    {
      id: 'collar',
      name: 'The Collar Vault',
      t: 0.13,
      art: 'saccoglossus',
      species: 'Saccoglossus',
      caption: 'Collar region — the seat of the stomochord',
      q: "I have a rudimentary structure in my collar region similar to a notochord. What am I called?",
      a: "stomochord",
      hint: "It starts with 'stomo-'."
    },
    {
      id: 'trunk',
      name: 'The Trunk Gallery',
      t: 0.33,
      art: 'balanoglossus',
      species: 'Balanoglossus',
      caption: 'The long third division of the body',
      q: "My body is composed of three parts: an anterior proboscis, a collar, and what long third part?",
      a: "trunk",
      hint: "The largest part of the cylindrical body."
    },
    {
      id: 'gland',
      name: 'The Gland Sump',
      t: 0.55,
      art: 'proboscis_gland',
      species: 'Proboscis gland',
      caption: 'Excretory tissue inside the opened proboscis',
      q: "I am the specialized gland used for excretion in Hemichordates. What is my name?",
      a: "proboscis gland",
      hint: "It is located in the anterior-most region."
    },
    {
      id: 'ancestry',
      name: 'The Ancestry Niche',
      t: 0.77,
      art: 'saccoglossus',
      species: 'Saccoglossus',
      caption: 'A deuterostome once filed under another phylum',
      q: "Hemichordates were earlier considered a sub-phylum of which group?",
      a: "chordata",
      hint: "They are now placed under non-chordata."
    },
    {
      id: 'gills',
      name: 'The Gill Basket',
      t: 0.965,
      art: 'gill_slits',
      species: 'Gill slits',
      caption: 'Paired pharyngeal pores along the trunk',
      q: "Respiration in this phylum takes place through which organs?",
      a: "gills",
      /* The original hint points the player at the bottom-right corner icon.
         The burrow is laid out so that this chamber really does sit in the
         bottom-right of the play field, keeping the hint literally true. */
      hint: "Look at the bottom-right corner icon."
    }
  ];

  /* Learn More — conceptual background only. Nothing here is needed to play. */
  var LORE = [
    {
      title: 'A phylum of three parts',
      art: 'balanoglossus',
      body: 'Every hemichordate body is built from the same three divisions: an anterior <b>proboscis</b>, a short muscular <b>collar</b>, and a long <b>trunk</b>. The proboscis is the digging organ, the collar carries the mouth, and the trunk holds the gill pores, gonads and gut.'
    },
    {
      title: 'The stomochord, not a notochord',
      art: 'saccoglossus',
      body: 'A short stiff diverticulum of the gut pushes forward from the collar into the proboscis. Because it looked like a notochord, hemichordates were long treated as a sub-phylum of <b>Chordata</b>. The <b>stomochord</b> is now known to be a different structure, and the group is treated as a separate phylum of non-chordate deuterostomes.'
    },
    {
      title: 'Pharyngeal gill slits',
      art: 'gill_slits',
      body: 'Rows of paired pores pierce the wall of the anterior trunk. Water taken in at the mouth passes out through them, and gas exchange happens across their richly vascular bars — the same pharyngeal plan seen in chordates, which is why the two groups keep being compared.'
    },
    {
      title: 'The proboscis gland',
      art: 'proboscis_gland',
      body: 'Excretion is handled by the <b>proboscis gland</b> (glomerulus), a mass of tissue at the anterior-most end of the body, pressed against a blood sinus so that waste can be filtered out of the blood and released near the proboscis pore.'
    },
    {
      title: 'Burrows and castings',
      art: null,
      body: 'Acorn worms such as <b>Balanoglossus</b> and <b>Saccoglossus</b> live in U-shaped burrows in intertidal sand and mud. They swallow sediment, digest what is edible, and void the rest at the exit shaft as a neat <b>coiled cast</b> — the spiral mound that gives this game its currency and its markers. Many species also smell strongly of iodoform, from the brominated phenols in their skin.'
    },
    {
      title: 'Colonial cousins and a fossil legacy',
      art: null,
      body: 'Besides the solitary enteropneusts, the phylum contains the tiny colonial <b>pterobranchs</b> (<i>Rhabdopleura</i>, <i>Cephalodiscus</i>), which build collagen tube houses from stacked half-rings. Those tubes are the same construction seen in <b>graptolites</b>, the abundant Palaeozoic fossils — making living pterobranchs their closest surviving relatives.'
    }
  ];

  global.QUEST_DATA = { CHAMBERS: CHAMBERS, LORE: LORE };
})(window);
