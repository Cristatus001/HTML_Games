/* Build-time only: rasterises the themed icon set to PNG so the shipped game
   contains zero emoji characters. Run with `node make_icons.mjs`. */
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const OUT = process.argv[2];
if (!OUT) { console.error('usage: node make_icons.mjs <out-dir>'); process.exit(1); }

/* ---------------------------------------------------------------- palette */
const C = {
  violetDeep: '#1b0435',
  violetMid:  '#4a148c',
  violetLit:  '#8e3ff0',
  magenta:    '#e040fb',
  magentaLit: '#ff9bff',
  green:      '#3fbf68',
  greenLit:   '#a8f5b8',
  cyan:       '#41e0d0',
  cyanLit:    '#b6fff6',
  bone:       '#f2e6ff',
  boneDim:    '#c8aee0',
  red:        '#ff4f68',
  redLit:     '#ffb3bf',
  gold:       '#ffc94d',
  goldLit:    '#fff0b8',
  flesh:      '#d4708f',
  fleshLit:   '#ffb6c9',
  liver:      '#8e3d5c'
};

/* A soft "lit from within" bloom, drawn as a radial gradient ellipse. */
const bloom = (id, color, stop = 0.55) => `
  <radialGradient id="${id}" cx="50%" cy="50%" r="50%">
    <stop offset="0%"   stop-color="${color}" stop-opacity="${stop}"/>
    <stop offset="55%"  stop-color="${color}" stop-opacity="${stop * 0.35}"/>
    <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
  </radialGradient>`;

/* A top-lit body gradient: highlight above, shadow below. */
const lit = (id, litC, midC, darkC) => `
  <linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%"   stop-color="${litC}"/>
    <stop offset="45%"  stop-color="${midC}"/>
    <stop offset="100%" stop-color="${darkC}"/>
  </linearGradient>`;

/* An inner glow for resources/currency: bright core fading to the rim. */
const core = (id, litC, midC) => `
  <radialGradient id="${id}" cx="42%" cy="34%" r="72%">
    <stop offset="0%"   stop-color="${litC}"/>
    <stop offset="48%"  stop-color="${midC}"/>
    <stop offset="100%" stop-color="${midC}" stop-opacity="0.82"/>
  </radialGradient>`;

const doc = (defs, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
     <defs>${defs}</defs>${body}
   </svg>`;

/* ------------------------------------------------------------------ icons */
/* Every entry: [filename, pixel size, svg markup]. viewBox is always 64x64
   so shapes are authored once and scale to whatever raster size we ask for. */
const icons = {};
const add = (name, size, defs, body) => { icons[name] = { size, svg: doc(defs, body) }; };

/* --- speaker / sound ---------------------------------------------------- */
const speakerBody = `
  <path d="M8 25h9l13-11a1.6 1.6 0 0 1 2.7 1.2v33.6a1.6 1.6 0 0 1-2.7 1.2L17 39H8a2 2 0 0 1-2-2V27a2 2 0 0 1 2-2z"
        fill="url(#spk)" stroke="${C.bone}" stroke-width="2" stroke-linejoin="round"/>`;
const speakerDefs = lit('spk', C.magentaLit, C.magenta, C.violetMid) + bloom('spkGlow', C.magenta);

add('sound-on', 96, speakerDefs + bloom('waveGlow', C.cyan),
  `<ellipse cx="26" cy="32" rx="30" ry="26" fill="url(#spkGlow)"/>
   ${speakerBody}
   <path d="M41 22c5.4 4.2 5.4 15.6 0 19.8" fill="none" stroke="${C.cyanLit}" stroke-width="3.4" stroke-linecap="round"/>
   <path d="M48 15c9 7.4 9 26.2 0 33.6" fill="none" stroke="${C.cyan}" stroke-width="3.4" stroke-linecap="round" opacity="0.85"/>`);

add('sound-off', 96, speakerDefs,
  `<ellipse cx="26" cy="32" rx="30" ry="26" fill="url(#spkGlow)" opacity="0.5"/>
   ${speakerBody}
   <path d="M41 24l14 15M55 24L41 39" fill="none" stroke="${C.red}" stroke-width="4.2" stroke-linecap="round"/>`);

/* --- music ------------------------------------------------------------- */
const noteDefs = lit('note', C.cyanLit, C.cyan, '#1c7d78') + bloom('noteGlow', C.cyan);
const noteBody = `
  <path d="M25 12l24-5v7L25 19z" fill="url(#note)" stroke="${C.bone}" stroke-width="1.8" stroke-linejoin="round"/>
  <path d="M25 12v29M49 7v27" fill="none" stroke="${C.bone}" stroke-width="3.4" stroke-linecap="round"/>
  <ellipse cx="18.5" cy="43" rx="8.5" ry="6.6" fill="url(#note)" stroke="${C.bone}" stroke-width="2"/>
  <ellipse cx="42.5" cy="36" rx="8.5" ry="6.6" fill="url(#note)" stroke="${C.bone}" stroke-width="2"/>`;

add('music-on', 96, noteDefs,
  `<ellipse cx="32" cy="32" rx="31" ry="28" fill="url(#noteGlow)"/>${noteBody}`);

add('music-off', 96, noteDefs,
  `<ellipse cx="32" cy="32" rx="31" ry="28" fill="url(#noteGlow)" opacity="0.4"/>
   ${noteBody}
   <path d="M9 55L55 9" fill="none" stroke="${C.red}" stroke-width="5" stroke-linecap="round"/>`);

/* --- microscope (settings) --------------------------------------------- */
add('settings', 96,
  lit('scope', C.boneDim, '#9a76c4', '#3d2258') + bloom('scopeGlow', C.violetLit),
  `<ellipse cx="32" cy="34" rx="30" ry="27" fill="url(#scopeGlow)"/>
   <rect x="10" y="52" width="44" height="6" rx="3" fill="url(#scope)" stroke="${C.bone}" stroke-width="1.6"/>
   <path d="M24 52c-5-8-4-19 4-25" fill="none" stroke="${C.bone}" stroke-width="3.4" stroke-linecap="round"/>
   <rect x="20" y="42" width="22" height="5" rx="2.5" fill="url(#scope)" stroke="${C.bone}" stroke-width="1.4"/>
   <rect x="33" y="8" width="12" height="22" rx="4" transform="rotate(20 39 19)" fill="url(#scope)" stroke="${C.bone}" stroke-width="2"/>
   <circle cx="31" cy="37" r="4.2" fill="${C.cyanLit}" opacity="0.95"/>
   <path d="M44 12l8-5" stroke="${C.bone}" stroke-width="3" stroke-linecap="round"/>`);

/* --- close / check / cross -------------------------------------------- */
add('close', 96,
  lit('closeR', '#5b3282', '#33144f', '#1b0435') + bloom('closeGlow', C.magenta),
  `<circle cx="32" cy="32" r="30" fill="url(#closeGlow)"/>
   <circle cx="32" cy="32" r="24" fill="url(#closeR)" stroke="${C.magenta}" stroke-width="2.4"/>
   <path d="M23 23l18 18M41 23L23 41" fill="none" stroke="${C.bone}" stroke-width="4.6" stroke-linecap="round"/>`);

add('check', 96,
  lit('okR', C.greenLit, C.green, '#1a6b35') + bloom('okGlow', '#4ce87b'),
  `<circle cx="32" cy="32" r="30" fill="url(#okGlow)"/>
   <circle cx="32" cy="32" r="23" fill="url(#okR)" stroke="#dfffe9" stroke-width="2.2"/>
   <path d="M20 33l8.5 9L45 22" fill="none" stroke="#0d3a1c" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" opacity="0.35"/>
   <path d="M20 32l8.5 9L45 21" fill="none" stroke="#f4fff7" stroke-width="5.4" stroke-linecap="round" stroke-linejoin="round"/>`);

add('cross', 96,
  lit('noR', C.redLit, C.red, '#8c1330') + bloom('noGlow', C.red),
  `<circle cx="32" cy="32" r="30" fill="url(#noGlow)"/>
   <circle cx="32" cy="32" r="23" fill="url(#noR)" stroke="#ffe3e8" stroke-width="2.2"/>
   <path d="M23 23l18 18M41 23L23 41" fill="none" stroke="#4d0715" stroke-width="6" stroke-linecap="round" opacity="0.3"/>
   <path d="M22.5 22.5l18 18M40.5 22.5l-18 18" fill="none" stroke="#fff2f4" stroke-width="5.2" stroke-linecap="round"/>`);

/* --- arrows ------------------------------------------------------------ */
const arrow = (flip) => `
  <ellipse cx="32" cy="32" rx="30" ry="28" fill="url(#arrGlow)"/>
  <g${flip ? ' transform="translate(64,0) scale(-1,1)"' : ''}>
    <path d="M14 32h26" fill="none" stroke="${C.bone}" stroke-width="5.4" stroke-linecap="round"/>
    <path d="M33 19l14 13-14 13" fill="none" stroke="url(#arrS)" stroke-width="5.8"
          stroke-linecap="round" stroke-linejoin="round"/>
  </g>`;
const arrowDefs = `
  <linearGradient id="arrS" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%" stop-color="${C.bone}"/><stop offset="100%" stop-color="${C.magentaLit}"/>
  </linearGradient>` + bloom('arrGlow', C.magenta);
add('arrow-right', 96, arrowDefs, arrow(false));
add('arrow-left', 96, arrowDefs, arrow(true));

/* --- play / pause / replay -------------------------------------------- */
add('play', 96,
  lit('playR', C.magentaLit, C.magenta, '#7b1fa2') + bloom('playGlow', C.magenta),
  `<circle cx="32" cy="32" r="30" fill="url(#playGlow)"/>
   <circle cx="32" cy="32" r="23" fill="url(#playR)" stroke="${C.bone}" stroke-width="2.2"/>
   <path d="M26 20.5l19 11.5-19 11.5z" fill="#fdf4ff" stroke="#480a5c" stroke-width="1.4" stroke-linejoin="round"/>`);

add('replay', 96,
  bloom('repGlow', C.cyan) + `
  <linearGradient id="repS" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="${C.cyanLit}"/><stop offset="100%" stop-color="${C.cyan}"/>
  </linearGradient>`,
  `<circle cx="32" cy="32" r="30" fill="url(#repGlow)"/>
   <path d="M50 32a18 18 0 1 1-6.2-13.6" fill="none" stroke="url(#repS)" stroke-width="6.2" stroke-linecap="round"/>
   <path d="M45 5v15H30" fill="none" stroke="url(#repS)" stroke-width="6.2" stroke-linecap="round" stroke-linejoin="round"/>`);

/* --- lock -------------------------------------------------------------- */
add('lock', 96,
  lit('lockB', '#8a6bb5', '#5a3a86', '#2c1246') + bloom('lockGlow', C.violetLit),
  `<ellipse cx="32" cy="36" rx="27" ry="25" fill="url(#lockGlow)" opacity="0.6"/>
   <path d="M20 30v-6a12 12 0 0 1 24 0v6" fill="none" stroke="${C.boneDim}" stroke-width="5.4" stroke-linecap="round"/>
   <rect x="13" y="28" width="38" height="29" rx="6" fill="url(#lockB)" stroke="${C.boneDim}" stroke-width="2.2"/>
   <circle cx="32" cy="40" r="4.2" fill="#17032c"/>
   <rect x="30" y="42" width="4" height="9" rx="2" fill="#17032c"/>`);

/* --- stars (rank pips) ------------------------------------------------- */
const starPath = 'M32 8l7.4 15.4 16.9 2.3-12.3 11.8 3.1 16.8L32 46.4 16.9 54.3 20 37.5 7.7 25.7l16.9-2.3z';
add('star-filled', 96,
  core('starC', C.goldLit, C.gold) + bloom('starGlow', C.gold),
  `<circle cx="32" cy="32" r="31" fill="url(#starGlow)"/>
   <path d="${starPath}" fill="url(#starC)" stroke="#7a4a00" stroke-width="1.8" stroke-linejoin="round"/>
   <path d="M32 15l4.4 9.4" stroke="#fffbe8" stroke-width="2.6" stroke-linecap="round" opacity="0.8"/>`);
add('star-empty', 96, `
  <linearGradient id="starE" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#4a2b6b"/><stop offset="100%" stop-color="#241040"/>
  </linearGradient>`,
  `<path d="${starPath}" fill="url(#starE)" stroke="#6c4b93" stroke-width="2" stroke-linejoin="round"/>`);

/* --- DNA helix (wordmark) --------------------------------------------- */
add('dna', 160, `
  <linearGradient id="dnaA" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="${C.magentaLit}"/><stop offset="100%" stop-color="${C.magenta}"/>
  </linearGradient>
  <linearGradient id="dnaB" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="${C.cyanLit}"/><stop offset="100%" stop-color="${C.cyan}"/>
  </linearGradient>` + bloom('dnaGlow', C.magenta, 0.5),
  `<ellipse cx="32" cy="32" rx="30" ry="31" fill="url(#dnaGlow)"/>
   <g stroke="#2a0546" stroke-width="10" stroke-linecap="round" fill="none" opacity="0.85">
     <path d="M20 4c0 14 24 14 24 28S20 46 20 60"/>
     <path d="M44 4c0 14-24 14-24 28s24 14 24 28"/>
   </g>
   <g stroke="#2a0546" stroke-width="6.6" stroke-linecap="round" opacity="0.8">
     <path d="M22.5 13h19"/><path d="M20.5 22.5h23"/><path d="M20.5 41.5h23"/><path d="M22.5 51h19"/>
   </g>
   <g stroke="${C.bone}" stroke-width="3.6" stroke-linecap="round">
     <path d="M22.5 13h19"/><path d="M20.5 22.5h23"/><path d="M20.5 41.5h23"/><path d="M22.5 51h19"/>
   </g>
   <path d="M20 4c0 14 24 14 24 28S20 46 20 60" fill="none" stroke="url(#dnaA)" stroke-width="6.4" stroke-linecap="round"/>
   <path d="M44 4c0 14-24 14-24 28s24 14 24 28" fill="none" stroke="url(#dnaB)" stroke-width="6.4" stroke-linecap="round"/>`);

/* --- frog (specimen mark) --------------------------------------------- */
add('frog', 160,
  lit('frogB', '#8ee08a', '#4aab55', '#1f6b34') + bloom('frogGlow', '#5ee07a', 0.45),
  `<ellipse cx="32" cy="34" rx="31" ry="27" fill="url(#frogGlow)"/>
   <path d="M8 44c-3-9 2-18 10-18 4 0 6 2 8 2h12c2 0 4-2 8-2 8 0 13 9 10 18-2 7-11 11-24 11S10 51 8 44z"
         fill="url(#frogB)" stroke="#123f21" stroke-width="2"/>
   <circle cx="18" cy="22" r="9" fill="url(#frogB)" stroke="#123f21" stroke-width="2"/>
   <circle cx="46" cy="22" r="9" fill="url(#frogB)" stroke="#123f21" stroke-width="2"/>
   <circle cx="18" cy="21" r="5.4" fill="${C.goldLit}"/>
   <circle cx="46" cy="21" r="5.4" fill="${C.goldLit}"/>
   <circle cx="18.6" cy="21.6" r="2.6" fill="#160c02"/>
   <circle cx="46.6" cy="21.6" r="2.6" fill="#160c02"/>
   <path d="M22 45c4 4 16 4 20 0" fill="none" stroke="#123f21" stroke-width="2.6" stroke-linecap="round"/>`);

/* --- clipboard (how to play) ------------------------------------------ */
add('clipboard', 96,
  lit('clipB', '#f6efff', '#d9c8ee', '#a98fc9') + bloom('clipGlow', C.violetLit, 0.4),
  `<ellipse cx="32" cy="34" rx="28" ry="28" fill="url(#clipGlow)"/>
   <rect x="12" y="10" width="40" height="48" rx="5" fill="url(#clipB)" stroke="#4b2a6e" stroke-width="2"/>
   <rect x="23" y="5" width="18" height="10" rx="4" fill="#7b4fb0" stroke="#3a1c58" stroke-width="2"/>
   <g stroke="#6a4a91" stroke-width="3" stroke-linecap="round">
     <path d="M20 26h24"/><path d="M20 35h24"/><path d="M20 44h15"/>
   </g>
   <circle cx="32" cy="10" r="2.6" fill="#e6d6f7"/>`);

/* --- journal (learn more) -------------------------------------------- */
add('journal', 96,
  lit('bookB', '#b869ff', '#7b1fa2', '#3d0d55') +
  lit('pageB', '#fffdf6', '#efe4cf', '#cbb894') + bloom('bookGlow', C.magenta, 0.45),
  `<ellipse cx="32" cy="34" rx="30" ry="27" fill="url(#bookGlow)"/>
   <path d="M6 14c8-4 16-4 26 2v40c-10-6-18-6-26-2z" fill="url(#pageB)" stroke="#4b2a6e" stroke-width="2"/>
   <path d="M58 14c-8-4-16-4-26 2v40c10-6 18-6 26-2z" fill="url(#pageB)" stroke="#4b2a6e" stroke-width="2"/>
   <path d="M32 16v38" stroke="#4b2a6e" stroke-width="2.6"/>
   <g stroke="#8a6b4a" stroke-width="2.2" stroke-linecap="round" opacity="0.75">
     <path d="M12 24c6-2 11-2 15 1"/><path d="M12 32c6-2 11-2 15 1"/><path d="M12 40c6-2 11-2 15 1"/>
     <path d="M52 24c-6-2-11-2-15 1"/><path d="M52 32c-6-2-11-2-15 1"/><path d="M52 40c-6-2-11-2-15 1"/>
   </g>`);

/* --- beaker (score / specimen credit; lit from within) ---------------- */
add('beaker', 96,
  core('fluid', C.greenLit, '#33c765') + bloom('beakerGlow', '#4ce87b', 0.6) + `
  <linearGradient id="glassG" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#ffffff" stop-opacity="0.55"/>
    <stop offset="45%" stop-color="#ffffff" stop-opacity="0.08"/>
    <stop offset="100%" stop-color="#ffffff" stop-opacity="0.3"/>
  </linearGradient>`,
  `<ellipse cx="32" cy="38" rx="29" ry="26" fill="url(#beakerGlow)"/>
   <path d="M18 8h28l-2 12 9 24a8 8 0 0 1-7.4 11H14.4A8 8 0 0 1 7 44l9-24z"
         fill="url(#glassG)" stroke="${C.bone}" stroke-width="2.2" stroke-linejoin="round"/>
   <path d="M12.5 33h39l3.5 11a8 8 0 0 1-7.4 11H16.4A8 8 0 0 1 9 44z" fill="url(#fluid)"/>
   <path d="M12.5 33h39" stroke="#d8ffe6" stroke-width="2" opacity="0.7"/>
   <circle cx="25" cy="44" r="2.6" fill="#f0fff5" opacity="0.75"/>
   <circle cx="37" cy="50" r="2" fill="#f0fff5" opacity="0.6"/>
   <circle cx="42" cy="41" r="1.6" fill="#f0fff5" opacity="0.5"/>
   <path d="M21 10h6" stroke="#ffffff" stroke-width="3" stroke-linecap="round" opacity="0.65"/>`);

/* --- rank badge (result crest) --------------------------------------- */
add('badge', 128,
  core('crest', '#ffe89a', C.gold) + bloom('crestGlow', C.gold, 0.5) +
  lit('ribbon', C.magentaLit, C.magenta, '#7b1fa2'),
  `<circle cx="32" cy="30" r="31" fill="url(#crestGlow)"/>
   <path d="M20 44l-6 17 10-4 5 7 6-20z" fill="url(#ribbon)" stroke="#4b0d63" stroke-width="1.8" stroke-linejoin="round"/>
   <path d="M44 44l6 17-10-4-5 7-6-20z" fill="url(#ribbon)" stroke="#4b0d63" stroke-width="1.8" stroke-linejoin="round"/>
   <circle cx="32" cy="27" r="20" fill="url(#crest)" stroke="#7a4a00" stroke-width="2.2"/>
   <circle cx="32" cy="27" r="14.5" fill="none" stroke="#a86a08" stroke-width="1.6" opacity="0.8"/>
   <path d="M32 15l4.6 9.6 10.4 1.4-7.6 7.2 1.9 10.4L32 38.8l-9.3 4.8 1.9-10.4L17 26l10.4-1.4z"
         fill="#fff8dd" opacity="0.92"/>
   <path d="M25 18c3-2 9-2 12 0" stroke="#fffbee" stroke-width="2.4" stroke-linecap="round" opacity="0.75"/>`);

/* --- home (lab hatch) ------------------------------------------------- */
add('home', 96,
  lit('hatch', '#8a6bb5', '#4d2b75', '#25103c') + bloom('hatchGlow', C.violetLit, 0.4),
  `<ellipse cx="32" cy="34" rx="29" ry="27" fill="url(#hatchGlow)"/>
   <path d="M32 6l26 22-5 5-3-2.5V56H14V30.5L11 33 6 28z" fill="url(#hatch)" stroke="${C.boneDim}" stroke-width="2.2" stroke-linejoin="round"/>
   <rect x="25" y="36" width="14" height="20" rx="2" fill="#150329" stroke="${C.magenta}" stroke-width="1.8"/>
   <circle cx="32" cy="25" r="5.4" fill="${C.cyanLit}" opacity="0.9"/>`);

/* --- petri dish (case node) ------------------------------------------- */
add('petri', 96,
  bloom('petriGlow', C.cyan, 0.5) + core('agar', '#9df0ff', '#2f9fd0') + `
  <linearGradient id="petriRim" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#ffffff" stop-opacity="0.7"/>
    <stop offset="100%" stop-color="#ffffff" stop-opacity="0.15"/>
  </linearGradient>`,
  `<circle cx="32" cy="32" r="31" fill="url(#petriGlow)"/>
   <circle cx="32" cy="32" r="24" fill="url(#agar)" stroke="url(#petriRim)" stroke-width="4"/>
   <circle cx="32" cy="32" r="24" fill="none" stroke="${C.bone}" stroke-width="1.6" opacity="0.7"/>
   <circle cx="24" cy="26" r="4" fill="#f6ffd9" opacity="0.75"/>
   <circle cx="40" cy="36" r="5.4" fill="#f6ffd9" opacity="0.6"/>
   <circle cx="30" cy="42" r="2.8" fill="#f6ffd9" opacity="0.7"/>`);

/* --- timer (auto-advance countdown) ---------------------------------- */
add('timer', 96,
  lit('glassT', '#efe2ff', '#c9aee8', '#8b6bb0') + core('sand', C.goldLit, C.gold) + bloom('timerGlow', C.gold, 0.42),
  `<ellipse cx="32" cy="32" rx="28" ry="29" fill="url(#timerGlow)"/>
   <rect x="14" y="5" width="36" height="6" rx="3" fill="url(#glassT)" stroke="#4b2a6e" stroke-width="1.8"/>
   <rect x="14" y="53" width="36" height="6" rx="3" fill="url(#glassT)" stroke="#4b2a6e" stroke-width="1.8"/>
   <path d="M20 11h24c0 10-12 15-12 21s12 11 12 21H20c0-10 12-15 12-21s-12-11-12-21z"
         fill="#ffffff" fill-opacity="0.22" stroke="${C.bone}" stroke-width="2" stroke-linejoin="round"/>
   <path d="M23.5 14h17c0 7-8.5 12-8.5 15.6z" fill="url(#sand)"/>
   <path d="M25 50h14c0-5-7-8-7-8s-7 3-7 8z" fill="url(#sand)"/>
   <path d="M32 33v13" stroke="${C.goldLit}" stroke-width="2" stroke-linecap="round" opacity="0.85"/>`);

/* ------------------------- system / discipline tag icons --------------- */
/* Themed anatomy iconography, one per case-study discipline. */

add('sys-comparative', 96,
  lit('gutG', C.fleshLit, C.flesh, '#8e3d5c') + bloom('gutGlow', C.flesh, 0.42),
  `<ellipse cx="32" cy="32" rx="29" ry="27" fill="url(#gutGlow)"/>
   <path d="M14 10c14 0 14 10 0 10s-14 10 0 10 14 10 0 10 0 10 14 10h22"
         fill="none" stroke="url(#gutG)" stroke-width="8" stroke-linecap="round"/>
   <path d="M14 10c14 0 14 10 0 10s-14 10 0 10 14 10 0 10 0 10 14 10h22"
         fill="none" stroke="#ffd9e4" stroke-width="2" stroke-linecap="round" opacity="0.45"/>`);

add('sys-surgical', 96,
  lit('sbl', '#ffffff', '#d3e4f0', '#7b93a8') + bloom('sblGlow', C.cyan, 0.4),
  `<ellipse cx="32" cy="32" rx="29" ry="27" fill="url(#sblGlow)"/>
   <path d="M10 49l16-16 5 5-16 16H10z" fill="#3d2258" stroke="#d9c6ef" stroke-width="1.8" stroke-linejoin="round"/>
   <path d="M28 31L47 12c4-4 9 1 5 5L33 36z" fill="url(#sbl)" stroke="#4b6070" stroke-width="1.8" stroke-linejoin="round"/>
   <path d="M40 44l14 14M54 44L40 58" stroke="#cfe6f5" stroke-width="3.4" stroke-linecap="round"/>`);

add('sys-environment', 96,
  core('dropG', '#dff8ff', '#3fb6e0') + bloom('dropGlow', '#5fd0ff', 0.45) + `
  <radialGradient id="sunG" cx="50%" cy="50%" r="50%">
    <stop offset="0%" stop-color="${C.goldLit}"/><stop offset="100%" stop-color="#ff9a2e"/>
  </radialGradient>`,
  `<ellipse cx="32" cy="34" rx="29" ry="27" fill="url(#dropGlow)"/>
   <circle cx="47" cy="17" r="9" fill="url(#sunG)"/>
   <g stroke="${C.gold}" stroke-width="2.6" stroke-linecap="round" opacity="0.9">
     <path d="M47 3v4"/><path d="M58.5 17h4"/><path d="M39 9l-2.6-2.6"/><path d="M55 9l2.6-2.6"/>
   </g>
   <path d="M24 14c9 12 14 18 14 25a14 14 0 0 1-28 0c0-7 5-13 14-25z"
         fill="url(#dropG)" stroke="#e6f9ff" stroke-width="2"/>
   <path d="M19 40c0 5 3 8 7 9" stroke="#ffffff" stroke-width="2.6" stroke-linecap="round" opacity="0.7"/>`);

add('sys-circulatory', 96,
  core('heartG', C.fleshLit, '#c2325a') + bloom('heartGlow', C.red, 0.5),
  `<ellipse cx="32" cy="33" rx="30" ry="28" fill="url(#heartGlow)"/>
   <path d="M32 56S8 40 8 24a13 13 0 0 1 24-7 13 13 0 0 1 24 7c0 16-24 32-24 32z"
         fill="url(#heartG)" stroke="#ffdfe7" stroke-width="2.2" stroke-linejoin="round"/>
   <path d="M32 17v26" stroke="#7c0f2c" stroke-width="2.4" opacity="0.55"/>
   <path d="M32 30h20" stroke="#7c0f2c" stroke-width="2.4" opacity="0.55"/>
   <path d="M18 21c2-3 6-4 9-3" stroke="#fff3f6" stroke-width="3" stroke-linecap="round" opacity="0.75"/>`);

add('sys-urogenital', 96,
  core('kidG', '#c98ba8', '#7e2a4c') + bloom('kidGlow', C.flesh, 0.42),
  `<ellipse cx="32" cy="32" rx="29" ry="27" fill="url(#kidGlow)"/>
   <path d="M22 8c8 0 13 8 13 17s-5 15-13 15c-6 0-10-5-10-16S16 8 22 8z"
         fill="url(#kidG)" stroke="#f1cfdd" stroke-width="2"/>
   <path d="M35 25h5c5 0 8 4 8 9v20" fill="none" stroke="${C.goldLit}" stroke-width="4.4" stroke-linecap="round"/>
   <path d="M35 25h5c5 0 8 4 8 9v20" fill="none" stroke="${C.gold}" stroke-width="1.8" stroke-linecap="round" opacity="0.8"/>
   <path d="M20 16c3-1 6 0 8 3" stroke="#ffe6ef" stroke-width="2.6" stroke-linecap="round" opacity="0.7"/>`);

add('sys-systemic', 96,
  bloom('netGlow', C.cyan, 0.45) + core('nodeG', C.cyanLit, '#1f9d95'),
  `<ellipse cx="32" cy="32" rx="30" ry="28" fill="url(#netGlow)"/>
   <g stroke="${C.cyanLit}" stroke-width="2.8" stroke-linecap="round" opacity="0.85">
     <path d="M32 32L13 14"/><path d="M32 32l19-18"/><path d="M32 32L13 50"/><path d="M32 32l19 18"/><path d="M32 32V8"/>
   </g>
   <circle cx="32" cy="32" r="8.5" fill="url(#nodeG)" stroke="#e9fffd" stroke-width="2"/>
   <g fill="url(#nodeG)" stroke="#e9fffd" stroke-width="1.6">
     <circle cx="13" cy="14" r="5"/><circle cx="51" cy="14" r="5"/>
     <circle cx="13" cy="50" r="5"/><circle cx="51" cy="50" r="5"/><circle cx="32" cy="7" r="5"/>
   </g>`);

add('sys-neural', 96,
  core('brainG', '#e7c4ff', '#8e3ff0') + bloom('brainGlow', C.violetLit, 0.5),
  `<ellipse cx="32" cy="32" rx="30" ry="28" fill="url(#brainGlow)"/>
   <path d="M30 12a10 10 0 0 0-16 6 8 8 0 0 0-4 12 9 9 0 0 0 6 12c2 6 10 8 14 4z"
         fill="url(#brainG)" stroke="#f4e6ff" stroke-width="2" stroke-linejoin="round"/>
   <path d="M34 12a10 10 0 0 1 16 6 8 8 0 0 1 4 12 9 9 0 0 1-6 12c-2 6-10 8-14 4z"
         fill="url(#brainG)" stroke="#f4e6ff" stroke-width="2" stroke-linejoin="round"/>
   <path d="M32 12v34" stroke="#4b0d63" stroke-width="2" opacity="0.5"/>
   <g stroke="#fbf2ff" stroke-width="2" stroke-linecap="round" opacity="0.7">
     <path d="M22 20c4 1 5 5 3 8"/><path d="M42 20c-4 1-5 5-3 8"/>
   </g>
   <path d="M32 46v10" stroke="${C.goldLit}" stroke-width="4" stroke-linecap="round"/>
   <path d="M27 56h10" stroke="${C.goldLit}" stroke-width="3.4" stroke-linecap="round"/>`);

add('sys-ecological', 96,
  lit('leafG', '#a8f5b8', '#3fbf68', '#14602f') + bloom('leafGlow', '#4ce87b', 0.45),
  `<ellipse cx="32" cy="32" rx="29" ry="27" fill="url(#leafGlow)"/>
   <path d="M52 8C28 8 12 22 12 40c0 6 2 11 5 14 3-16 14-27 30-32-13 8-21 18-24 32 20 2 33-14 33-34 0-5-1-9-4-12z"
         fill="url(#leafG)" stroke="#d9ffe4" stroke-width="1.8" stroke-linejoin="round"/>
   <ellipse cx="42" cy="44" rx="7" ry="4.6" transform="rotate(-25 42 44)" fill="#3b2258" stroke="${C.goldLit}" stroke-width="1.6"/>
   <g stroke="${C.goldLit}" stroke-width="1.8" stroke-linecap="round">
     <path d="M47 40l4-4"/><path d="M49 45l5-1"/>
   </g>`);

/* ------------------------------------------------------------------ emit */
await mkdir(OUT, { recursive: true });
let n = 0;
for (const [name, { size, svg }] of Object.entries(icons)) {
  const buf = await sharp(Buffer.from(svg), { density: 384 })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9, palette: false })
    .toBuffer();
  await writeFile(path.join(OUT, name + '.png'), buf);
  n++;
}
console.log('wrote ' + n + ' icons to ' + OUT);
