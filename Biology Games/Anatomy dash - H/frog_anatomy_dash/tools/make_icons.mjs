/* Build-time only. Rasterises the themed icon/illustration set to PNG so the
   shipped game contains zero emoji characters and needs no image CDN.

   Usage:  npm i sharp && node make_icons.mjs ../assets/images

   Everything here is hand-authored SVG; nothing is downloaded. Re-running is
   safe and idempotent — it simply overwrites the PNGs.                        */

import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const OUT = process.argv[2] || path.join(process.cwd(), '..', 'assets', 'images');

/* ------------------------------------------------------------------ palette
   Moody swamp night as the calm base; vibrancy comes from saturated
   bioluminescent teal, frog green and amber gold pushed against it.          */
const C = {
  night:     '#04201d',
  deep:      '#0a352f',
  teal:      '#12796a',
  tealLit:   '#46e6c8',
  tealPale:  '#c4fff4',
  moss:      '#2c6b2a',
  green:     '#5cb63a',
  greenLit:  '#b9f062',
  greenPale: '#e8ffc4',
  gold:      '#e8a319',
  goldLit:   '#ffd766',
  goldPale:  '#fff3c9',
  amber:     '#c9721a',
  bark:      '#4a2f1d',
  barkLit:   '#7b5232',
  red:       '#d43c4e',
  redLit:    '#ff8a97',
  redPale:   '#ffd9de',
  flesh:     '#c76a86',
  fleshLit:  '#f5a8bd',
  liver:     '#7d3450',
  liverLit:  '#b85a7c',
  bone:      '#eef6f2',
  boneDim:   '#a9c4bd',
  slate:     '#12312e',
  violet:    '#5b3d8f',
  violetLit: '#a98ae0',
  water:     '#1d6f8f',
  waterLit:  '#7fdcf5'
};

/* ----------------------------------------------------------------- helpers */

/* Soft "lit from within" bloom behind an object. */
const bloom = (id, color, stop = 0.6) => `
  <radialGradient id="${id}" cx="50%" cy="50%" r="50%">
    <stop offset="0%"   stop-color="${color}" stop-opacity="${stop}"/>
    <stop offset="52%"  stop-color="${color}" stop-opacity="${stop * 0.32}"/>
    <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
  </radialGradient>`;

/* Top-lit body gradient: highlight above, shadow below. */
const lit = (id, litC, midC, darkC) => `
  <linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%"   stop-color="${litC}"/>
    <stop offset="46%"  stop-color="${midC}"/>
    <stop offset="100%" stop-color="${darkC}"/>
  </linearGradient>`;

/* Bright core fading to rim — for anything that reads as a resource/orb. */
const core = (id, litC, midC, edgeC = midC) => `
  <radialGradient id="${id}" cx="40%" cy="32%" r="74%">
    <stop offset="0%"   stop-color="${litC}"/>
    <stop offset="46%"  stop-color="${midC}"/>
    <stop offset="100%" stop-color="${edgeC}"/>
  </radialGradient>`;

/* Diagonal sheen for glass / wet surfaces. */
const sheen = (id, color = '#ffffff', a = 0.5) => `
  <linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%"   stop-color="${color}" stop-opacity="${a}"/>
    <stop offset="42%"  stop-color="${color}" stop-opacity="${a * 0.16}"/>
    <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
  </linearGradient>`;

const softShadow = (id, blur = 1.6) => `
  <filter id="${id}" x="-40%" y="-40%" width="180%" height="180%">
    <feDropShadow dx="0" dy="1.2" stdDeviation="${blur}"
                  flood-color="#000000" flood-opacity="0.45"/>
  </filter>`;

const glowFilter = (id, blur = 2.4) => `
  <filter id="${id}" x="-60%" y="-60%" width="220%" height="220%">
    <feGaussianBlur stdDeviation="${blur}" result="b"/>
    <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>`;

const doc = (defs, body, vb = 64) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vb} ${vb}" width="${vb}" height="${vb}">
     <defs>${defs}</defs>${body}
   </svg>`;

/* A round "lit token" plate used behind most HUD icons so buttons read as
   inset hardware rather than flat glyphs. */
const plate = (tint = C.teal, tintLit = C.tealLit) => `
  <circle cx="32" cy="32" r="30" fill="url(#plateBg)"/>
  <circle cx="32" cy="32" r="30" fill="url(#plateSheen)"/>
  <circle cx="32" cy="32" r="29" fill="none" stroke="${tintLit}" stroke-opacity="0.5" stroke-width="1.6"/>
  <circle cx="32" cy="32" r="25" fill="none" stroke="${C.night}" stroke-opacity="0.45" stroke-width="1"/>`;

const plateDefs = (tint = C.deep, tintLit = C.teal) => `
  ${core('plateBg', tintLit, tint, C.night)}
  ${sheen('plateSheen', '#ffffff', 0.34)}`;

/* ================================================================== icons
   Each entry: name -> { svg, sizes:[px], dir }                              */

const ui = {};   /* assets/images/ui/emoji  */
const glyph = {};/* anatomy: questions/ + orbs/ */
const chars = {};/* characters/ */
const bg = {};   /* background/ */

/* ---------------------------------------------------------------- UI: play */
ui['play'] = doc(
  `${plateDefs()}${lit('pl', C.greenLit, C.green, C.moss)}${softShadow('sh')}`,
  `${plate()}
   <path d="M25 19 L47 32 L25 45 Z" fill="url(#pl)" filter="url(#sh)"/>
   <path d="M25 19 L47 32 L25 32 Z" fill="#ffffff" fill-opacity="0.22"/>`
);

ui['pause'] = doc(
  `${plateDefs()}${lit('pl', C.tealPale, C.tealLit, C.teal)}${softShadow('sh')}`,
  `${plate()}
   <g filter="url(#sh)">
     <rect x="23" y="20" width="7.5" height="24" rx="2.6" fill="url(#pl)"/>
     <rect x="33.5" y="20" width="7.5" height="24" rx="2.6" fill="url(#pl)"/>
   </g>`
);

ui['replay'] = doc(
  `${plateDefs()}${lit('pl', C.goldPale, C.goldLit, C.gold)}${softShadow('sh')}`,
  `${plate()}
   <g filter="url(#sh)" fill="none" stroke="url(#pl)" stroke-width="5.4" stroke-linecap="round">
     <path d="M45 26 A15 15 0 1 0 47 38"/>
   </g>
   <path d="M47.5 16 L49.5 30 L36 26.5 Z" fill="url(#pl)" filter="url(#sh)"/>`
);

/* Home = a lily pad on water rather than a generic house. */
ui['home'] = doc(
  `${plateDefs()}${core('padG', C.greenLit, C.green, C.moss)}
   ${bloom('padB', C.greenLit, 0.55)}${softShadow('sh')}`,
  `${plate()}
   <circle cx="32" cy="34" r="20" fill="url(#padB)"/>
   <path d="M32 18 A17 17 0 1 1 27 51 L31 34 Z" fill="url(#padG)" filter="url(#sh)"/>
   <path d="M32 18 A17 17 0 0 1 47 30 L32 34 Z" fill="#ffffff" fill-opacity="0.18"/>
   <g stroke="${C.moss}" stroke-opacity="0.7" stroke-width="1.3">
     <path d="M32 34 L44 24"/><path d="M32 34 L48 34"/><path d="M32 34 L43 45"/>
     <path d="M32 34 L31 51"/><path d="M32 34 L21 46"/>
   </g>
   <circle cx="20" cy="24" r="4.6" fill="url(#padG)"/>`
);

/* Settings = a reed/gear hybrid: cog teeth cut from a lily disc. */
ui['settings'] = doc(
  `${plateDefs()}${core('cg', C.tealPale, C.tealLit, C.teal)}${softShadow('sh')}
   ${bloom('cgB', C.tealLit, 0.5)}`,
  `${plate()}
   <circle cx="32" cy="32" r="19" fill="url(#cgB)"/>
   <g filter="url(#sh)">
     <path fill="url(#cg)" d="M32 13 l4.2 3.4 5.1-1.6 2.2 5 5.3 1.1 -0.4 5.3 4.2 3.3 -2.9 4.5 2 5 -4.7 2.6 -1 5.3 -5.4 0.2 -3.4 4.1 -4.8-2.3 -5 2.3 -3.4-4.1 -5.4-0.2 -1-5.3 -4.7-2.6 2-5 -2.9-4.5 4.2-3.3 -0.4-5.3 5.3-1.1 2.2-5 5.1 1.6z"/>
     <circle cx="32" cy="32" r="7.4" fill="${C.deep}"/>
     <circle cx="32" cy="32" r="7.4" fill="none" stroke="${C.tealLit}" stroke-opacity="0.6" stroke-width="1.4"/>
   </g>
   <path d="M32 13 l4.2 3.4 5.1-1.6 2.2 5 5.3 1.1 -0.4 5.3 -20-1z" fill="#ffffff" fill-opacity="0.16"/>`
);

ui['close'] = doc(
  `${plateDefs(C.slate, C.boneDim)}${lit('pl', '#f2f8f6', '#cfdeda', '#93a9a5')}${softShadow('sh')}`,
  `${plate(C.boneDim, '#dfe9e6')}
   <g filter="url(#sh)" stroke="url(#pl)" stroke-width="5.6" stroke-linecap="round">
     <path d="M24 24 L40 40"/><path d="M40 24 L24 40"/>
   </g>`
);

/* Sound = speaker + water ripples. */
const speaker = (col) => `
  <path d="M18 26 h7 l10-8 v28 l-10-8 h-7 z" fill="${col}"/>`;
ui['sound-on'] = doc(
  `${plateDefs()}${lit('pl', C.tealPale, C.tealLit, C.teal)}${softShadow('sh')}`,
  `${plate()}
   <g filter="url(#sh)">${speaker('url(#pl)')}
     <g fill="none" stroke="url(#pl)" stroke-width="3.2" stroke-linecap="round">
       <path d="M40 25 a10 10 0 0 1 0 14"/>
       <path d="M45.5 20 a17 17 0 0 1 0 24"/>
     </g>
   </g>`
);
ui['sound-off'] = doc(
  `${plateDefs(C.slate, C.boneDim)}${lit('pl', '#dfe9e6', C.boneDim, '#6c8783')}${softShadow('sh')}`,
  `${plate(C.boneDim, '#dfe9e6')}
   <g filter="url(#sh)">${speaker('url(#pl)')}
     <g stroke="${C.redLit}" stroke-width="3.6" stroke-linecap="round">
       <path d="M40 26 L52 38"/><path d="M52 26 L40 38"/>
     </g>
   </g>`
);

/* Music = glowing note with a cattail stem. */
const note = (col) => `
  <path d="M28 15 l16-4 v6 l-16 4 z" fill="${col}"/>
  <rect x="26" y="15" width="3.4" height="26" rx="1.6" fill="${col}"/>
  <rect x="41" y="11" width="3.4" height="24" rx="1.6" fill="${col}"/>
  <ellipse cx="22" cy="43" rx="7.4" ry="6" fill="${col}"/>
  <ellipse cx="37" cy="38" rx="7.4" ry="6" fill="${col}"/>`;
ui['music-on'] = doc(
  `${plateDefs()}${lit('pl', C.goldPale, C.goldLit, C.gold)}${softShadow('sh')}
   ${bloom('nb', C.goldLit, 0.5)}${glowFilter('gl', 1.8)}`,
  `${plate(C.gold, C.goldLit)}
   <circle cx="30" cy="30" r="21" fill="url(#nb)"/>
   <g filter="url(#gl)">${note('url(#pl)')}</g>`
);
ui['music-off'] = doc(
  `${plateDefs(C.slate, C.boneDim)}${lit('pl', '#dfe9e6', C.boneDim, '#6c8783')}${softShadow('sh')}`,
  `${plate(C.boneDim, '#dfe9e6')}
   <g opacity="0.85">${note('url(#pl)')}</g>
   <g stroke="${C.redLit}" stroke-width="4" stroke-linecap="round">
     <path d="M15 49 L49 15"/>
   </g>`
);

ui['lock'] = doc(
  `${plateDefs(C.slate, C.boneDim)}${lit('pl', '#e6eeeb', C.boneDim, '#5f7a76')}
   ${lit('bd', C.goldPale, C.gold, C.amber)}${softShadow('sh')}`,
  `${plate(C.boneDim, '#dfe9e6')}
   <path d="M23 31 v-5 a9 9 0 0 1 18 0 v5" fill="none" stroke="url(#pl)" stroke-width="5"/>
   <rect x="18" y="30" width="28" height="21" rx="4.5" fill="url(#bd)" filter="url(#sh)"/>
   <rect x="18" y="30" width="28" height="9" rx="4.5" fill="#ffffff" fill-opacity="0.2"/>
   <circle cx="32" cy="39" r="3.4" fill="${C.bark}"/>
   <rect x="30.6" y="39" width="2.8" height="7" rx="1.4" fill="${C.bark}"/>`
);

ui['unlock'] = doc(
  `${plateDefs()}${lit('pl', C.greenPale, C.greenLit, C.green)}
   ${lit('bd', C.goldPale, C.gold, C.amber)}${softShadow('sh')}`,
  `${plate()}
   <path d="M24 31 v-6 a9 9 0 0 1 17.5-2.6" fill="none" stroke="url(#pl)" stroke-width="5" stroke-linecap="round"/>
   <rect x="18" y="30" width="28" height="21" rx="4.5" fill="url(#bd)" filter="url(#sh)"/>
   <rect x="18" y="30" width="28" height="9" rx="4.5" fill="#ffffff" fill-opacity="0.2"/>
   <circle cx="32" cy="39" r="3.4" fill="${C.bark}"/>
   <rect x="30.6" y="39" width="2.8" height="7" rx="1.4" fill="${C.bark}"/>`
);

/* Progress "stars" are lotus blossoms — themed to the pond. */
const lotus = (fill, stroke, glow) => `
  ${glow ? `<circle cx="32" cy="34" r="21" fill="url(#lb)"/>` : ''}
  <g fill="${fill}" stroke="${stroke}" stroke-width="1.4" stroke-linejoin="round">
    <path d="M32 12 c5 8 5 15 0 21 c-5-6-5-13 0-21z"/>
    <path d="M17 20 c8 4 11 10 11 18 c-8-3-12-9-11-18z"/>
    <path d="M47 20 c1 9-3 15-11 18 c0-8 3-14 11-18z"/>
    <path d="M9 33 c9 0 15 3 19 9 c-9 2-16-1-19-9z"/>
    <path d="M55 33 c-3 8-10 11-19 9 c4-6 10-9 19-9z"/>
    <path d="M32 52 c-9 0-15-4-17-11 h34 c-2 7-8 11-17 11z"/>
  </g>`;
ui['star-filled'] = doc(
  `${core('lf', C.goldPale, C.goldLit, C.gold)}${bloom('lb', C.goldLit, 0.62)}${softShadow('sh')}`,
  `<g filter="url(#sh)">${lotus('url(#lf)', C.amber, true)}</g>`
);
ui['star-empty'] = doc(
  `${lit('le', '#2a4a46', '#1b3936', '#132a28')}`,
  `${lotus('url(#le)', '#3d635e', false)}`
);

/* Knowledge Orb — the collectible/currency. Lit from within. */
ui['orb'] = doc(
  `${bloom('ob', C.tealLit, 0.85)}${core('oc', '#ffffff', C.tealLit, C.teal)}
   ${sheen('os', '#ffffff', 0.7)}${glowFilter('og', 1.6)}`,
  `<circle cx="32" cy="32" r="31" fill="url(#ob)"/>
   <g filter="url(#og)">
     <circle cx="32" cy="32" r="18" fill="url(#oc)"/>
     <circle cx="32" cy="32" r="18" fill="url(#os)"/>
     <circle cx="32" cy="32" r="18" fill="none" stroke="${C.tealPale}" stroke-opacity="0.8" stroke-width="1.4"/>
     <ellipse cx="26" cy="24" rx="6" ry="4.2" fill="#ffffff" fill-opacity="0.75" transform="rotate(-28 26 24)"/>
   </g>`
);

ui['check'] = doc(
  `${plateDefs(C.deep, C.green)}${lit('pl', C.greenPale, C.greenLit, C.green)}${softShadow('sh')}
   ${bloom('cb', C.greenLit, 0.55)}`,
  `${plate(C.green, C.greenLit)}
   <circle cx="32" cy="32" r="20" fill="url(#cb)"/>
   <path d="M19 33 L28 42 L46 22" fill="none" stroke="url(#pl)" stroke-width="7"
         stroke-linecap="round" stroke-linejoin="round" filter="url(#sh)"/>`
);
ui['cross'] = doc(
  `${plateDefs(C.slate, C.red)}${lit('pl', C.redPale, C.redLit, C.red)}${softShadow('sh')}
   ${bloom('cb', C.red, 0.5)}`,
  `${plate(C.red, C.redLit)}
   <circle cx="32" cy="32" r="20" fill="url(#cb)"/>
   <g stroke="url(#pl)" stroke-width="7" stroke-linecap="round" filter="url(#sh)">
     <path d="M22 22 L42 42"/><path d="M42 22 L22 42"/>
   </g>`
);

/* Trophy = a golden frog idol on a plinth. */
ui['trophy'] = doc(
  `${core('tg', C.goldPale, C.goldLit, C.gold)}${bloom('tb', C.goldLit, 0.7)}
   ${lit('tp', C.barkLit, C.bark, '#2c1a0f')}${softShadow('sh')}`,
  `<circle cx="32" cy="30" r="30" fill="url(#tb)"/>
   <g filter="url(#sh)">
     <ellipse cx="32" cy="27" rx="15" ry="13" fill="url(#tg)"/>
     <circle cx="24" cy="16" r="6" fill="url(#tg)"/>
     <circle cx="40" cy="16" r="6" fill="url(#tg)"/>
     <circle cx="24" cy="16" r="2.6" fill="${C.night}"/>
     <circle cx="40" cy="16" r="2.6" fill="${C.night}"/>
     <path d="M24 30 q8 7 16 0" fill="none" stroke="${C.amber}" stroke-width="2.2" stroke-linecap="round"/>
     <path d="M17 33 q-6 5 -2 9" fill="none" stroke="url(#tg)" stroke-width="5" stroke-linecap="round"/>
     <path d="M47 33 q6 5 2 9" fill="none" stroke="url(#tg)" stroke-width="5" stroke-linecap="round"/>
     <rect x="16" y="44" width="32" height="7" rx="2.4" fill="url(#tp)"/>
     <rect x="12" y="51" width="40" height="8" rx="3" fill="url(#tp)"/>
     <rect x="12" y="51" width="40" height="3" rx="1.5" fill="#ffffff" fill-opacity="0.14"/>
   </g>
   <ellipse cx="26" cy="21" rx="5" ry="3.4" fill="#ffffff" fill-opacity="0.4" transform="rotate(-24 26 21)"/>`
);

/* Field journal (Learn More). */
ui['journal'] = doc(
  `${lit('jc', '#3f7f5e', '#2c6047', '#1c3f2f')}${lit('jp', '#fdf6e0', '#efe3c2', '#cfc09a')}
   ${softShadow('sh')}${bloom('jb', C.greenLit, 0.4)}`,
  `<circle cx="32" cy="32" r="28" fill="url(#jb)"/>
   <g filter="url(#sh)">
     <rect x="12" y="10" width="40" height="44" rx="4" fill="url(#jc)"/>
     <rect x="17" y="13" width="32" height="38" rx="2.4" fill="url(#jp)"/>
     <rect x="12" y="10" width="6.5" height="44" rx="3" fill="${C.moss}"/>
     <g stroke="${C.teal}" stroke-opacity="0.75" stroke-width="2" stroke-linecap="round">
       <path d="M23 22 h20"/><path d="M23 29 h20"/><path d="M23 36 h14"/><path d="M23 43 h17"/>
     </g>
     <circle cx="42" cy="40" r="7.5" fill="none" stroke="${C.tealLit}" stroke-width="2.6"/>
     <path d="M47 45 L53 51" stroke="${C.tealLit}" stroke-width="3.4" stroke-linecap="round"/>
   </g>`
);

/* Clipboard (How to Play). */
ui['clipboard'] = doc(
  `${lit('cb2', '#6b4a2c', '#4a2f1d', '#301c10')}${lit('pp', '#fdf8e6', '#eee2c4', '#cdbd97')}
   ${softShadow('sh')}`,
  `<g filter="url(#sh)">
     <rect x="12" y="9" width="40" height="46" rx="4.5" fill="url(#cb2)"/>
     <rect x="16" y="15" width="32" height="36" rx="2.4" fill="url(#pp)"/>
     <rect x="24" y="5" width="16" height="9" rx="3.2" fill="${C.goldLit}"/>
     <rect x="24" y="5" width="16" height="4" rx="2" fill="#ffffff" fill-opacity="0.3"/>
     <g stroke="${C.moss}" stroke-width="2.4" stroke-linecap="round">
       <path d="M21 24 h10"/><path d="M21 32 h16"/><path d="M21 40 h13"/>
     </g>
     <g fill="${C.green}"><circle cx="41" cy="24" r="2.4"/><circle cx="42" cy="32" r="2.4"/></g>
   </g>`
);

/* Direction / jump controls. */
const chev = (rot) => `
  <g transform="rotate(${rot} 32 32)">
    <path d="M38 18 L24 32 L38 46" fill="none" stroke="url(#pl)" stroke-width="7.5"
          stroke-linecap="round" stroke-linejoin="round" filter="url(#sh)"/>
  </g>`;
ui['arrow-left']  = doc(`${plateDefs()}${lit('pl', C.tealPale, C.tealLit, C.teal)}${softShadow('sh')}`, `${plate()}${chev(0)}`);
ui['arrow-right'] = doc(`${plateDefs()}${lit('pl', C.tealPale, C.tealLit, C.teal)}${softShadow('sh')}`, `${plate()}${chev(180)}`);
ui['arrow-up']    = doc(`${plateDefs()}${lit('pl', C.greenPale, C.greenLit, C.green)}${softShadow('sh')}`, `${plate(C.green, C.greenLit)}${chev(90)}`);

/* Keyboard cap glyphs for the How-to-Play card. */
const keycap = (inner) => `
  <rect x="6" y="10" width="52" height="44" rx="8" fill="url(#kc)"/>
  <rect x="6" y="10" width="52" height="44" rx="8" fill="none" stroke="${C.tealLit}" stroke-opacity="0.35" stroke-width="1.5"/>
  <rect x="10" y="14" width="44" height="16" rx="6" fill="#ffffff" fill-opacity="0.1"/>
  ${inner}`;
ui['key-left'] = doc(
  `${lit('kc', '#2b5a55', '#173d3a', '#0c2422')}${lit('pl', C.tealPale, C.tealLit, C.teal)}${softShadow('sh')}`,
  keycap(`<path d="M38 22 L26 32 L38 42" fill="none" stroke="url(#pl)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>`)
);
ui['key-right'] = doc(
  `${lit('kc', '#2b5a55', '#173d3a', '#0c2422')}${lit('pl', C.tealPale, C.tealLit, C.teal)}${softShadow('sh')}`,
  keycap(`<path d="M26 22 L38 32 L26 42" fill="none" stroke="url(#pl)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>`)
);
ui['key-space'] = doc(
  `${lit('kc', '#2b5a55', '#173d3a', '#0c2422')}${lit('pl', C.greenPale, C.greenLit, C.green)}${softShadow('sh')}`,
  keycap(`<rect x="18" y="29" width="28" height="6" rx="3" fill="url(#pl)"/>
          <path d="M32 20 L38 27 H26 Z" fill="url(#pl)"/>`)
);

/* Frog mood faces used for feedback states (never emoji text). */
const frogFace = (bodyG, mouth, eyeLid) => `
  <ellipse cx="32" cy="38" rx="24" ry="20" fill="${bodyG}"/>
  <ellipse cx="32" cy="30" rx="21" ry="13" fill="#ffffff" fill-opacity="0.12"/>
  <circle cx="17" cy="20" r="10" fill="${bodyG}"/>
  <circle cx="47" cy="20" r="10" fill="${bodyG}"/>
  <circle cx="17" cy="20" r="6.4" fill="${C.goldPale}"/>
  <circle cx="47" cy="20" r="6.4" fill="${C.goldPale}"/>
  <circle cx="17" cy="21" r="3.4" fill="${C.night}"/>
  <circle cx="47" cy="21" r="3.4" fill="${C.night}"/>
  <circle cx="15" cy="18" r="1.6" fill="#ffffff" fill-opacity="0.9"/>
  <circle cx="45" cy="18" r="1.6" fill="#ffffff" fill-opacity="0.9"/>
  ${eyeLid}
  ${mouth}`;
ui['frog-happy'] = doc(
  `${core('fb', C.greenLit, C.green, C.moss)}${bloom('fg', C.greenLit, 0.5)}${softShadow('sh')}`,
  `<circle cx="32" cy="34" r="29" fill="url(#fg)"/>
   <g filter="url(#sh)">${frogFace('url(#fb)',
     `<path d="M20 40 q12 12 24 0" fill="none" stroke="${C.moss}" stroke-width="3.4" stroke-linecap="round"/>
      <circle cx="12" cy="42" r="3.6" fill="${C.redLit}" fill-opacity="0.55"/>
      <circle cx="52" cy="42" r="3.6" fill="${C.redLit}" fill-opacity="0.55"/>`, '')}</g>`
);
ui['frog-worried'] = doc(
  `${core('fb', '#9ec97a', '#6f9c4e', '#42632f')}${bloom('fg', C.gold, 0.35)}${softShadow('sh')}`,
  `<circle cx="32" cy="34" r="29" fill="url(#fg)"/>
   <g filter="url(#sh)">${frogFace('url(#fb)',
     `<path d="M22 46 q10 -7 20 0" fill="none" stroke="#41632f" stroke-width="3.4" stroke-linecap="round"/>`,
     `<path d="M9 13 q8 3 14 1" fill="none" stroke="#41632f" stroke-width="2.6" stroke-linecap="round"/>
      <path d="M55 13 q-8 3 -14 1" fill="none" stroke="#41632f" stroke-width="2.6" stroke-linecap="round"/>
      <ellipse cx="52" cy="34" rx="3.4" ry="4.6" fill="${C.waterLit}" fill-opacity="0.8"/>`)}</g>`
);

/* Hourglass with water for the run timer. */
ui['timer'] = doc(
  `${plateDefs()}${lit('gl2', C.bone, C.boneDim, '#7f9a95')}${core('wt', C.waterLit, C.water, '#0d4257')}${softShadow('sh')}`,
  `${plate()}
   <g filter="url(#sh)">
     <rect x="18" y="11" width="28" height="5" rx="2.4" fill="url(#gl2)"/>
     <rect x="18" y="48" width="28" height="5" rx="2.4" fill="url(#gl2)"/>
     <path d="M22 16 h20 l-8 15 8 17 h-20 l8-17 z" fill="${C.deep}" fill-opacity="0.6"
           stroke="url(#gl2)" stroke-width="2.4" stroke-linejoin="round"/>
     <path d="M24.5 44 h15 l-7.5-9 z" fill="url(#wt)"/>
     <path d="M24 18 h16 l-8 8 z" fill="url(#wt)" fill-opacity="0.85"/>
     <circle cx="32" cy="33" r="1.6" fill="${C.waterLit}"/>
   </g>`
);

/* Objective marker = a dragonfly (the frog's prey/goal). */
ui['objective'] = doc(
  `${core('dbody', C.tealLit, C.teal, C.deep)}${bloom('dbl', C.tealLit, 0.55)}
   ${sheen('dw', '#ffffff', 0.55)}${softShadow('sh')}`,
  `<circle cx="32" cy="32" r="28" fill="url(#dbl)"/>
   <g filter="url(#sh)">
     <g fill="${C.tealPale}" stroke="${C.tealLit}" stroke-width="1.2">
       <ellipse cx="16" cy="20" rx="14" ry="5" fill-opacity="0.62" transform="rotate(-18 16 20)"/>
       <ellipse cx="48" cy="20" rx="14" ry="5" fill-opacity="0.62" transform="rotate(18 48 20)"/>
       <ellipse cx="17" cy="32" rx="12" ry="4.4" fill-opacity="0.48" transform="rotate(14 17 32)"/>
       <ellipse cx="47" cy="32" rx="12" ry="4.4" fill-opacity="0.48" transform="rotate(-14 47 32)"/>
     </g>
     <rect x="29.4" y="14" width="5.2" height="40" rx="2.6" fill="url(#dbody)"/>
     <g fill="${C.teal}" fill-opacity="0.8">
       <rect x="29.4" y="32" width="5.2" height="2.6"/><rect x="29.4" y="40" width="5.2" height="2.6"/>
       <rect x="29.4" y="48" width="5.2" height="2.6"/>
     </g>
     <circle cx="32" cy="14" r="7" fill="${C.goldLit}"/>
     <circle cx="28.8" cy="12.6" r="2.2" fill="${C.night}"/>
     <circle cx="35.2" cy="12.6" r="2.2" fill="${C.night}"/>
   </g>`
);

/* HOTS badge = brain + spark. */
ui['hots'] = doc(
  `${core('br', C.fleshLit, C.flesh, '#8d3f57')}${bloom('brb', C.red, 0.5)}
   ${lit('spk', C.goldPale, C.goldLit, C.gold)}${softShadow('sh')}`,
  `<circle cx="32" cy="32" r="29" fill="url(#brb)"/>
   <g filter="url(#sh)">
     <path fill="url(#br)" d="M20 22 q-9 2 -8 11 q-8 5 -1 12 q0 9 10 9 q4 5 11 3 q7 2 11-3 q10 0 10-9 q7-7 -1-12 q1-9 -8-11 q-6-6 -12-3 q-6-3 -12 3z"/>
     <g fill="none" stroke="#8d3f57" stroke-opacity="0.8" stroke-width="2" stroke-linecap="round">
       <path d="M32 19 v34"/><path d="M32 26 q-7 2 -8 8"/><path d="M32 34 q7 2 8 9"/>
       <path d="M32 42 q-7 1 -9 6"/>
     </g>
     <path d="M46 8 l4 10 l-6 1 l5 11 l-12-12 l6-1 z" fill="url(#spk)"/>
   </g>`
);

ui['info'] = doc(
  `${plateDefs()}${lit('pl', C.tealPale, C.tealLit, C.teal)}${softShadow('sh')}`,
  `${plate()}
   <circle cx="32" cy="19" r="4.4" fill="url(#pl)" filter="url(#sh)"/>
   <rect x="28" y="27" width="8" height="21" rx="3.6" fill="url(#pl)" filter="url(#sh)"/>`
);

/* Zone crests for level select. */
ui['zone-1'] = doc(
  `${core('z', C.greenLit, C.green, C.moss)}${bloom('zb', C.greenLit, 0.55)}${softShadow('sh')}
   ${core('gcat', '#c68a4a', '#7b4d24', '#43260f')}`,
  `<circle cx="32" cy="32" r="29" fill="url(#zb)"/>
   <g filter="url(#sh)">
     <path d="M8 56 q24-8 48 0 q-24 5 -48 0z" fill="url(#z)"/>
     <g stroke="url(#z)" stroke-width="4.4" stroke-linecap="round">
       <path d="M18 54 v-22"/><path d="M32 56 v-30"/><path d="M46 54 v-24"/>
     </g>
     <g fill="url(#gcat)">
       <ellipse cx="18" cy="28" rx="4.2" ry="8"/>
       <ellipse cx="32" cy="22" rx="4.6" ry="9"/>
       <ellipse cx="46" cy="26" rx="4.2" ry="8"/>
     </g>
     <g fill="#ffffff" fill-opacity="0.22">
       <ellipse cx="16.6" cy="25" rx="1.6" ry="4"/><ellipse cx="30.6" cy="19" rx="1.8" ry="4.4"/>
     </g>
     <g stroke="url(#z)" stroke-width="3" stroke-linecap="round" fill="none">
       <path d="M18 44 q-8 4 -10 12"/><path d="M46 44 q8 4 10 12"/>
     </g>
   </g>`
);
ui['zone-2'] = doc(
  `${core('z', C.fleshLit, C.flesh, C.liver)}${bloom('zb', C.red, 0.5)}${softShadow('sh')}`,
  `<circle cx="32" cy="32" r="28" fill="url(#zb)"/>
   <g filter="url(#sh)">
     <circle cx="32" cy="32" r="20" fill="none" stroke="url(#z)" stroke-width="4.4" stroke-dasharray="6 5"/>
     <path d="M32 20 c6-7 16-2 14 6 c-2 8-14 14-14 14 s-12-6-14-14 c-2-8 8-13 14-6z" fill="url(#z)"/>
   </g>`
);
ui['zone-3'] = doc(
  `${core('z', C.violetLit, C.violet, '#2c1a4d')}${bloom('zb', C.violetLit, 0.55)}
   ${lit('spk', C.goldPale, C.goldLit, C.gold)}${softShadow('sh')}`,
  `<circle cx="32" cy="32" r="28" fill="url(#zb)"/>
   <g filter="url(#sh)">
     <path d="M32 10 l6 12 13 2 -9 9 2 13 -12-6 -12 6 2-13 -9-9 13-2z" fill="url(#z)"/>
     <path d="M32 24 l3 6 6 1 -4 4 1 6 -6-3 -6 3 1-6 -4-4 6-1z" fill="url(#spk)"/>
   </g>`
);

/* ============================================== anatomy glyphs / questions
   Drawn on a 96 viewBox so they hold up at both 72px (in-world orb) and
   256px (quiz illustration).                                                */

const gdoc = (defs, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="96" height="96">
     <defs>${defs}</defs>${body}
   </svg>`;

/* Every glyph sits on a soft lit disc so it reads against any background. */
const disc = (tint, tintLit) => `
  <circle cx="48" cy="48" r="45" fill="url(#dg)"/>
  <circle cx="48" cy="48" r="45" fill="url(#ds)"/>
  <circle cx="48" cy="48" r="44" fill="none" stroke="${tintLit}" stroke-opacity="0.55" stroke-width="2"/>`;
const discDefs = (tint, tintLit) => `
  ${core('dg', tint, '#0d2d2a', C.night)}
  ${sheen('ds', '#ffffff', 0.22)}
  ${softShadow('gsh', 2)}
  ${bloom('gb', tintLit, 0.6)}`;

/* --- heart: 3-chambered (2 atria + 1 ventricle) --------------------------- */
glyph['heart'] = gdoc(
  `${discDefs(C.liver, C.redLit)}${core('hv', C.fleshLit, C.flesh, C.liver)}
   ${core('atR', C.redPale, C.redLit, C.red)}${core('atL', C.waterLit, C.water, '#0c3a4d')}`,
  `${disc(C.liver, C.redLit)}
   <circle cx="48" cy="52" r="34" fill="url(#gb)"/>
   <g filter="url(#gsh)">
     <!-- great vessels -->
     <path d="M30 14 q-2 12 4 18" fill="none" stroke="${C.red}" stroke-width="7" stroke-linecap="round"/>
     <path d="M66 14 q2 12 -4 18" fill="none" stroke="${C.water}" stroke-width="7" stroke-linecap="round"/>
     <!-- single large ventricle -->
     <path d="M22 46 q26-10 52 0 q2 22 -14 34 q-12 9 -24 0 q-16-12 -14-34z" fill="url(#hv)"/>
     <!-- two atria -->
     <path d="M46 46 q-24 2 -22-12 q2-12 22-9z" fill="url(#atR)"/>
     <path d="M50 46 q24 2 22-12 q-2-12 -22-9z" fill="url(#atL)"/>
     <!-- chamber divisions -->
     <path d="M48 24 v22" stroke="${C.liver}" stroke-opacity="0.75" stroke-width="2.6" fill="none"/>
     <path d="M22 46 q26-8 52 0" stroke="${C.liver}" stroke-opacity="0.7" stroke-width="2.6" fill="none"/>
     <path d="M26 52 q22-7 44 0" stroke="#ffffff" stroke-opacity="0.2" stroke-width="5" fill="none"/>
   </g>
   <ellipse cx="38" cy="60" rx="7" ry="11" fill="#ffffff" fill-opacity="0.14" transform="rotate(-16 38 60)"/>`
);

/* --- liver: bilobed, secretes bile ---------------------------------------- */
glyph['liver'] = gdoc(
  `${discDefs('#5d2a3f', C.liverLit)}${core('lv', C.liverLit, C.liver, '#4b2033')}
   ${core('bl', '#d8f07a', '#9fbf2c', '#5f7a15')}`,
  `${disc('#5d2a3f', C.liverLit)}
   <circle cx="48" cy="46" r="33" fill="url(#gb)"/>
   <g filter="url(#gsh)">
     <path d="M14 40 q10-14 34-12 q24 2 34 12 q-4 22 -30 26 q-30 3 -38-26z" fill="url(#lv)"/>
     <path d="M48 28 q2 32 -4 38" fill="none" stroke="#3c1928" stroke-opacity="0.8" stroke-width="3"/>
     <path d="M20 36 q22-6 56 2" fill="none" stroke="#ffffff" stroke-opacity="0.18" stroke-width="5"/>
     <ellipse cx="58" cy="62" rx="9" ry="8" fill="url(#bl)"/>
     <path d="M58 70 q-2 8 -8 12" fill="none" stroke="#9fbf2c" stroke-width="4" stroke-linecap="round"/>
     <circle cx="55" cy="59" r="2.6" fill="#f4ffc0" fill-opacity="0.8"/>
   </g>`
);

/* --- urea droplet (ureotelic excretion) ---------------------------------- */
glyph['urea'] = gdoc(
  `${discDefs('#1b4d63', C.waterLit)}${core('dr', '#eafcff', C.waterLit, C.water)}
   ${sheen('drs', '#ffffff', 0.6)}`,
  `${disc('#1b4d63', C.waterLit)}
   <circle cx="48" cy="50" r="32" fill="url(#gb)"/>
   <g filter="url(#gsh)">
     <path d="M48 14 q18 22 18 34 a18 18 0 0 1 -36 0 q0-12 18-34z" fill="url(#dr)"/>
     <path d="M48 14 q18 22 18 34 a18 18 0 0 1 -36 0 q0-12 18-34z" fill="url(#drs)"/>
     <ellipse cx="40" cy="42" rx="5" ry="8" fill="#ffffff" fill-opacity="0.6" transform="rotate(-20 40 42)"/>
   </g>
   <!-- urea molecule schematic: two amino groups flanking a carbonyl core -->
   <g stroke="${C.deep}" stroke-opacity="0.75" stroke-width="2.6" fill="none">
     <path d="M38 56 h20"/>
   </g>
   <g>
     <circle cx="48" cy="56" r="7.4" fill="${C.deep}" fill-opacity="0.7"/>
     <circle cx="36" cy="56" r="5.4" fill="${C.teal}" fill-opacity="0.85"/>
     <circle cx="60" cy="56" r="5.4" fill="${C.teal}" fill-opacity="0.85"/>
     <circle cx="48" cy="45" r="4.6" fill="${C.red}" fill-opacity="0.7"/>
     <path d="M48 49 v3" stroke="${C.deep}" stroke-opacity="0.7" stroke-width="2.4"/>
   </g>`
);

/* --- skin / cutaneous respiration ---------------------------------------- */
glyph['skin'] = gdoc(
  `${discDefs('#1e5238', C.greenLit)}${core('sk', C.greenLit, C.green, C.moss)}
   ${core('air', C.tealPale, C.tealLit, C.teal)}`,
  `${disc('#1e5238', C.greenLit)}
   <circle cx="48" cy="52" r="31" fill="url(#gb)"/>
   <g filter="url(#gsh)">
     <path d="M16 40 q32-16 64 0 v28 q-32 14 -64 0z" fill="url(#sk)"/>
     <g fill="${C.moss}" fill-opacity="0.75">
       <ellipse cx="30" cy="50" rx="5" ry="3.6"/><ellipse cx="48" cy="58" rx="5.6" ry="4"/>
       <ellipse cx="66" cy="49" rx="5" ry="3.6"/><ellipse cx="39" cy="66" rx="4.4" ry="3.2"/>
       <ellipse cx="60" cy="66" rx="4.4" ry="3.2"/>
     </g>
     <path d="M16 42 q32-14 64 0" fill="none" stroke="#ffffff" stroke-opacity="0.25" stroke-width="4"/>
     <g fill="url(#air)">
       <circle cx="28" cy="26" r="6"/><circle cx="48" cy="18" r="7.6"/><circle cx="68" cy="26" r="6"/>
     </g>
     <g stroke="url(#air)" stroke-width="3" stroke-linecap="round" opacity="0.85">
       <path d="M28 34 v5"/><path d="M48 28 v8"/><path d="M68 34 v5"/>
     </g>
   </g>`
);

/* --- cloaca: common chamber -------------------------------------------- */
glyph['cloaca'] = gdoc(
  `${discDefs('#4a3520', C.goldLit)}${core('cl', C.fleshLit, C.flesh, C.liver)}
   ${lit('tube', C.barkLit, C.bark, '#2a180d')}`,
  `${disc('#4a3520', C.goldLit)}
   <circle cx="48" cy="54" r="30" fill="url(#gb)"/>
   <g filter="url(#gsh)">
     <g stroke="url(#cl)" stroke-width="9" stroke-linecap="round" fill="none">
       <path d="M20 24 q10 16 24 22"/><path d="M48 16 v30"/><path d="M76 24 q-10 16 -24 22"/>
     </g>
     <ellipse cx="48" cy="60" rx="22" ry="17" fill="url(#cl)"/>
     <ellipse cx="48" cy="56" rx="17" ry="10" fill="#ffffff" fill-opacity="0.14"/>
     <ellipse cx="48" cy="72" rx="8" ry="5.4" fill="${C.liver}"/>
     <ellipse cx="48" cy="72" rx="4" ry="2.4" fill="${C.night}"/>
     <g fill="${C.goldLit}"><circle cx="20" cy="20" r="4.4"/><circle cx="48" cy="13" r="4.4"/><circle cx="76" cy="20" r="4.4"/></g>
   </g>`
);

/* --- prey / carnivore diet --------------------------------------------- */
glyph['prey'] = gdoc(
  `${discDefs('#1e5238', C.greenLit)}${core('bd', '#7f6ad0', C.violet, '#2b1a4a')}
   ${sheen('wg', '#ffffff', 0.5)}${core('tg2', C.redLit, C.red, '#8d1f2f')}`,
  `${disc('#1e5238', C.greenLit)}
   <circle cx="48" cy="48" r="31" fill="url(#gb)"/>
   <g filter="url(#gsh)">
     <!-- insect prey: a fly caught mid-air -->
     <ellipse cx="60" cy="24" rx="22" ry="9" fill="${C.tealPale}" fill-opacity="0.55" transform="rotate(-26 60 24)"/>
     <ellipse cx="60" cy="30" rx="20" ry="8" fill="${C.tealPale}" fill-opacity="0.45" transform="rotate(22 60 30)"/>
     <ellipse cx="58" cy="28" rx="15" ry="11" fill="url(#bd)"/>
     <circle cx="72" cy="22" r="8" fill="url(#bd)"/>
     <circle cx="75" cy="20" r="3" fill="${C.goldLit}"/>
     <g stroke="${C.night}" stroke-width="2.4" stroke-linecap="round" opacity="0.8">
       <path d="M50 38 l-6 8"/><path d="M60 40 l2 9"/><path d="M68 34 l7 7"/>
     </g>
     <!-- the sticky bilobed tongue reaching for it -->
     <path d="M8 82 q10-12 24-18 q10-5 18-2" fill="none" stroke="url(#tg2)" stroke-width="9" stroke-linecap="round"/>
     <path d="M44 62 q9-4 13 3" fill="none" stroke="${C.redPale}" stroke-width="4.4" stroke-linecap="round"/>
   </g>`
);

/* --- testes + vasa efferentia ------------------------------------------- */
glyph['testes'] = gdoc(
  `${discDefs('#20444f', C.tealLit)}${core('ts', C.goldPale, C.goldLit, C.gold)}
   ${core('kd', C.liverLit, C.liver, '#43172b')}`,
  `${disc('#20444f', C.tealLit)}
   <circle cx="48" cy="48" r="31" fill="url(#gb)"/>
   <g filter="url(#gsh)">
     <path d="M30 18 q-12 4 -10 24 q2 20 12 34 q10-10 8-32 q-2-22 -10-26z" fill="url(#kd)"/>
     <path d="M66 18 q12 4 10 24 q-2 20 -12 34 q-10-10 -8-32 q2-22 10-26z" fill="url(#kd)"/>
     <ellipse cx="34" cy="40" rx="9" ry="12" fill="url(#ts)"/>
     <ellipse cx="62" cy="40" rx="9" ry="12" fill="url(#ts)"/>
     <g stroke="${C.tealLit}" stroke-width="2.6" fill="none" stroke-linecap="round">
       <path d="M41 34 q6 2 6 6"/><path d="M41 40 q6 2 6 6"/><path d="M41 46 q6 1 6 5"/>
       <path d="M55 34 q-6 2 -6 6"/><path d="M55 40 q-6 2 -6 6"/><path d="M55 46 q-6 1 -6 5"/>
     </g>
     <ellipse cx="31" cy="35" rx="3.4" ry="4.6" fill="#ffffff" fill-opacity="0.45"/>
     <ellipse cx="59" cy="35" rx="3.4" ry="4.6" fill="#ffffff" fill-opacity="0.45"/>
   </g>`
);

/* --- brain / medulla oblongata ----------------------------------------- */
glyph['brain'] = gdoc(
  `${discDefs('#4a2338', C.fleshLit)}${core('bg2', C.fleshLit, C.flesh, '#7c3550')}
   ${core('cord', C.goldPale, C.goldLit, C.gold)}`,
  `${disc('#4a2338', C.fleshLit)}
   <circle cx="48" cy="44" r="32" fill="url(#gb)"/>
   <g filter="url(#gsh)">
     <!-- olfactory lobes -->
     <ellipse cx="39" cy="15" rx="7" ry="6" fill="url(#bg2)"/>
     <ellipse cx="57" cy="15" rx="7" ry="6" fill="url(#bg2)"/>
     <!-- cerebral hemispheres -->
     <ellipse cx="38" cy="30" rx="10" ry="13" fill="url(#bg2)"/>
     <ellipse cx="58" cy="30" rx="10" ry="13" fill="url(#bg2)"/>
     <!-- optic lobes -->
     <ellipse cx="36" cy="47" rx="9" ry="8" fill="url(#bg2)"/>
     <ellipse cx="60" cy="47" rx="9" ry="8" fill="url(#bg2)"/>
     <!-- cerebellum -->
     <path d="M32 56 q16-6 32 0 q-4 7 -16 7 q-12 0 -16-7z" fill="url(#bg2)"/>
     <!-- medulla oblongata tapering into the spinal cord -->
     <path d="M40 62 h16 l-3 12 h-10z" fill="url(#bg2)"/>
     <path d="M48 74 v14" fill="none" stroke="url(#cord)" stroke-width="10" stroke-linecap="round"/>
     <g fill="none" stroke="#7c3550" stroke-opacity="0.75" stroke-width="2.2">
       <path d="M48 10 v54"/><path d="M30 41 h36"/><path d="M32 55 h32"/>
     </g>
     <g fill="#ffffff" fill-opacity="0.2">
       <ellipse cx="35" cy="25" rx="5.4" ry="4"/><ellipse cx="55" cy="25" rx="5.4" ry="4"/>
     </g>
   </g>`
);

/* --- hepatic portal system --------------------------------------------- */
glyph['portal'] = gdoc(
  `${discDefs('#4a2338', C.redLit)}${core('lvr2', C.liverLit, C.liver, '#43172b')}
   ${core('gut', C.fleshLit, C.flesh, '#8d4059')}`,
  `${disc('#4a2338', C.redLit)}
   <circle cx="48" cy="48" r="31" fill="url(#gb)"/>
   <g filter="url(#gsh)">
     <!-- liver above, intestine below, joined by the portal vein -->
     <path d="M12 26 q16-12 36-10 q24 2 36 12 q-6 18 -32 20 q-30 2 -40-22z" fill="url(#lvr2)"/>
     <path d="M20 66 q12-10 26-5 q14 5 28-5 q6 20 -24 25 q-26 4 -30-15z" fill="url(#gut)"/>
     <!-- portal vein with tributaries draining the gut into the liver -->
     <path d="M48 48 v14" stroke="${C.violetLit}" stroke-width="7" fill="none" stroke-linecap="round"/>
     <g stroke="${C.violetLit}" stroke-width="3.4" fill="none" stroke-linecap="round">
       <path d="M48 54 q-12 1 -17 7"/><path d="M48 57 q12 1 17 7"/>
       <path d="M48 50 q-9-2 -13-6"/><path d="M48 50 q9-2 13-6"/>
     </g>
     <g fill="${C.violetLit}" fill-opacity="0.9">
       <circle cx="48" cy="47" r="3.4"/><circle cx="48" cy="63" r="3.4"/>
     </g>
     <path d="M18 22 q26-9 60 2" fill="none" stroke="#ffffff" stroke-opacity="0.18" stroke-width="4.4"/>
   </g>`
);

/* --- aestivation sun --------------------------------------------------- */
glyph['sun'] = gdoc(
  `${discDefs('#63430f', C.goldLit)}${core('sn', '#fffbe8', C.goldLit, C.gold)}
   ${glowFilter('sgl', 2.2)}`,
  `${disc('#63430f', C.goldLit)}
   <circle cx="48" cy="48" r="36" fill="url(#gb)"/>
   <g filter="url(#sgl)">
     <circle cx="48" cy="48" r="18" fill="url(#sn)"/>
     <g stroke="url(#sn)" stroke-width="5.4" stroke-linecap="round">
       <path d="M48 14 v10"/><path d="M48 72 v10"/><path d="M14 48 h10"/><path d="M72 48 h10"/>
       <path d="M24 24 l7 7"/><path d="M65 65 l7 7"/><path d="M72 24 l-7 7"/><path d="M31 65 l-7 7"/>
     </g>
   </g>
   <ellipse cx="41" cy="41" rx="6" ry="4.4" fill="#ffffff" fill-opacity="0.55" transform="rotate(-30 41 41)"/>`
);

/* --- lungs ------------------------------------------------------------- */
glyph['lungs'] = gdoc(
  `${discDefs('#1b4d63', C.waterLit)}${core('lg', C.fleshLit, C.flesh, '#8d4059')}
   ${core('tr', C.bone, C.boneDim, '#7d938f')}`,
  `${disc('#1b4d63', C.waterLit)}
   <circle cx="48" cy="50" r="31" fill="url(#gb)"/>
   <g filter="url(#gsh)">
     <path d="M44 22 q-4 10 -14 14 q-14 6 -12 26 q2 18 16 14 q10-4 10-22z" fill="url(#lg)"/>
     <path d="M52 22 q4 10 14 14 q14 6 12 26 q-2 18 -16 14 q-10-4 -10-22z" fill="url(#lg)"/>
     <rect x="44.6" y="12" width="7" height="26" rx="3.4" fill="url(#tr)"/>
     <g stroke="${C.boneDim}" stroke-width="3" stroke-linecap="round" opacity="0.7">
       <path d="M46 36 q-8 4 -10 12"/><path d="M50 36 q8 4 10 12"/>
     </g>
     <g fill="#ffffff" fill-opacity="0.15">
       <ellipse cx="33" cy="44" rx="7" ry="10" transform="rotate(-14 33 44)"/>
       <ellipse cx="63" cy="44" rx="7" ry="10" transform="rotate(14 63 44)"/>
     </g>
   </g>`
);

/* --- tympanum (ear) ---------------------------------------------------- */
glyph['tympanum'] = gdoc(
  `${discDefs('#1e5238', C.greenLit)}${core('hd', C.greenLit, C.green, C.moss)}
   ${core('tym', '#e8d9a8', '#b89b58', '#6d5426')}`,
  `${disc('#1e5238', C.greenLit)}
   <circle cx="48" cy="48" r="31" fill="url(#gb)"/>
   <g filter="url(#gsh)">
     <path d="M12 52 q6-30 36-30 q34 0 38 30 q-6 20 -38 20 q-32 0 -36-20z" fill="url(#hd)"/>
     <path d="M14 46 q10-22 34-22 q30 0 36 20" fill="none" stroke="#ffffff" stroke-opacity="0.22" stroke-width="5"/>
     <circle cx="60" cy="46" r="14" fill="url(#tym)"/>
     <circle cx="60" cy="46" r="14" fill="none" stroke="${C.moss}" stroke-width="2.6"/>
     <g fill="none" stroke="#6d5426" stroke-opacity="0.6" stroke-width="1.8">
       <circle cx="60" cy="46" r="9"/><circle cx="60" cy="46" r="4.6"/>
     </g>
     <circle cx="30" cy="38" r="8" fill="${C.goldPale}"/>
     <circle cx="30" cy="39" r="4.2" fill="${C.night}"/>
     <circle cx="28" cy="36" r="2" fill="#ffffff" fill-opacity="0.9"/>
   </g>`
);

/* --- nictitating membrane / eye ---------------------------------------- */
glyph['eye'] = gdoc(
  `${discDefs('#20444f', C.tealLit)}${core('ir', C.goldPale, C.goldLit, C.gold)}
   ${core('nm', C.tealPale, C.tealLit, C.teal)}${core('sk2', C.greenLit, C.green, C.moss)}`,
  `${disc('#20444f', C.tealLit)}
   <circle cx="48" cy="48" r="31" fill="url(#gb)"/>
   <g filter="url(#gsh)">
     <ellipse cx="48" cy="48" rx="36" ry="26" fill="url(#sk2)"/>
     <ellipse cx="48" cy="48" rx="27" ry="20" fill="${C.night}"/>
     <circle cx="48" cy="48" r="17" fill="url(#ir)"/>
     <ellipse cx="48" cy="48" rx="6" ry="15" fill="${C.night}"/>
     <path d="M21 48 a27 20 0 0 0 54 0 a27 20 0 0 1 -54 0z" fill="url(#nm)" fill-opacity="0.75"/>
     <ellipse cx="48" cy="58" rx="26" ry="10" fill="url(#nm)" fill-opacity="0.5"/>
     <ellipse cx="40" cy="40" rx="6" ry="4" fill="#ffffff" fill-opacity="0.75" transform="rotate(-24 40 40)"/>
     <path d="M14 44 q34-26 68 0" fill="none" stroke="${C.moss}" stroke-width="3.4"/>
   </g>`
);

/* --- webbed hind foot -------------------------------------------------- */
glyph['foot'] = gdoc(
  `${discDefs('#1e5238', C.greenLit)}${core('ft', C.greenLit, C.green, C.moss)}
   ${core('web', C.tealPale, C.tealLit, C.teal)}`,
  `${disc('#1e5238', C.greenLit)}
   <circle cx="48" cy="52" r="31" fill="url(#gb)"/>
   <g filter="url(#gsh)">
     <path d="M48 78 q-30-10 -34-44 q10 12 16 8 q-4-18 4-26 q4 16 10 14 q2-18 4-18 q2 0 4 18 q6 2 10-14 q8 8 4 26 q6 4 16-8 q-4 34 -34 44z"
           fill="url(#web)" fill-opacity="0.6"/>
     <g stroke="url(#ft)" stroke-width="7.4" stroke-linecap="round" fill="none">
       <path d="M48 74 L20 34"/><path d="M48 74 L36 24"/><path d="M48 74 L48 18"/>
       <path d="M48 74 L60 24"/><path d="M48 74 L76 34"/>
     </g>
     <g fill="${C.night}">
       <circle cx="20" cy="33" r="3"/><circle cx="36" cy="23" r="3"/><circle cx="48" cy="17" r="3"/>
       <circle cx="60" cy="23" r="3"/><circle cx="76" cy="33" r="3"/>
     </g>
     <ellipse cx="48" cy="68" rx="10" ry="6" fill="#ffffff" fill-opacity="0.14"/>
   </g>`
);

/* --- tadpole / metamorphosis ------------------------------------------- */
glyph['tadpole'] = gdoc(
  `${discDefs('#1b4d63', C.waterLit)}${core('tp', '#7fbf4a', C.moss, '#1d4a1c')}
   ${core('wtr', C.waterLit, C.water, '#0c3a4d')}`,
  `${disc('#1b4d63', C.waterLit)}
   <circle cx="48" cy="48" r="31" fill="url(#gb)"/>
   <g filter="url(#gsh)">
     <ellipse cx="38" cy="44" rx="20" ry="16" fill="url(#tp)"/>
     <path d="M56 44 q16-14 30-6 q-10 8 -8 14 q-12 6 -22-4z" fill="url(#tp)" fill-opacity="0.9"/>
     <circle cx="30" cy="38" r="5.4" fill="${C.goldPale}"/>
     <circle cx="30" cy="39" r="2.6" fill="${C.night}"/>
     <path d="M24 56 q4 12 -2 20" fill="none" stroke="url(#tp)" stroke-width="5" stroke-linecap="round"/>
     <path d="M46 58 q2 14 10 18" fill="none" stroke="url(#tp)" stroke-width="5" stroke-linecap="round"/>
     <ellipse cx="34" cy="36" rx="9" ry="5" fill="#ffffff" fill-opacity="0.2"/>
     <g stroke="url(#wtr)" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.8">
       <path d="M12 74 q10-5 20 0 q10 5 20 0 q10-5 20 0"/>
     </g>
   </g>`
);

/* --- kidney ------------------------------------------------------------ */
glyph['kidney'] = gdoc(
  `${discDefs('#4a2338', C.liverLit)}${core('kn', C.liverLit, C.liver, '#40162a')}
   ${core('ur', C.waterLit, C.water, '#0c3a4d')}`,
  `${disc('#4a2338', C.liverLit)}
   <circle cx="48" cy="48" r="31" fill="url(#gb)"/>
   <g filter="url(#gsh)">
     <path d="M34 16 q-16 6 -16 30 q0 26 16 34 q12-14 10-34 q-2-24 -10-30z" fill="url(#kn)"/>
     <path d="M62 16 q16 6 16 30 q0 26 -16 34 q-12-14 -10-34 q2-24 10-30z" fill="url(#kn)"/>
     <g stroke="url(#ur)" stroke-width="5" fill="none" stroke-linecap="round">
       <path d="M40 62 q6 12 8 22"/><path d="M56 62 q-6 12 -8 22"/>
     </g>
     <g fill="#ffffff" fill-opacity="0.16">
       <ellipse cx="27" cy="34" rx="5" ry="10" transform="rotate(-8 27 34)"/>
       <ellipse cx="69" cy="34" rx="5" ry="10" transform="rotate(8 69 34)"/>
     </g>
     <g stroke="${C.fleshLit}" stroke-opacity="0.7" stroke-width="2" fill="none">
       <path d="M30 34 q8 4 8 12"/><path d="M66 34 q-8 4 -8 12"/>
     </g>
   </g>`
);

/* --- bilobed tongue ---------------------------------------------------- */
glyph['tongue'] = gdoc(
  `${discDefs('#4a2338', C.fleshLit)}${core('tg3', C.redLit, C.red, '#8d1f2f')}
   ${core('mth', C.greenLit, C.green, C.moss)}`,
  `${disc('#4a2338', C.fleshLit)}
   <circle cx="48" cy="50" r="31" fill="url(#gb)"/>
   <g filter="url(#gsh)">
     <path d="M12 40 q36-20 72 0 q-8 30 -36 30 q-28 0 -36-30z" fill="url(#mth)"/>
     <path d="M18 44 q30-14 60 0 q-6 20 -30 20 q-24 0 -30-20z" fill="${C.night}" fill-opacity="0.65"/>
     <path d="M48 44 q-4 18 -18 26 q-4 3 -6-2 q10-8 12-24z" fill="url(#tg3)"/>
     <path d="M48 44 q4 18 18 26 q4 3 6-2 q-10-8 -12-24z" fill="url(#tg3)"/>
     <ellipse cx="48" cy="44" rx="11" ry="6" fill="url(#tg3)"/>
     <ellipse cx="44" cy="43" rx="4" ry="2.4" fill="#ffffff" fill-opacity="0.4"/>
   </g>`
);

/* --- ovary / eggs ------------------------------------------------------ */
glyph['eggs'] = gdoc(
  `${discDefs('#20444f', C.tealLit)}${core('eg', '#ffffff', '#dfeee4', '#9fbcae')}
   ${core('yk', C.goldPale, C.goldLit, C.gold)}${sheen('egs', '#ffffff', 0.55)}`,
  `${disc('#20444f', C.tealLit)}
   <circle cx="48" cy="48" r="31" fill="url(#gb)"/>
   <g filter="url(#gsh)">
     <g>
       <circle cx="32" cy="34" r="13" fill="url(#eg)" fill-opacity="0.9"/>
       <circle cx="60" cy="30" r="12" fill="url(#eg)" fill-opacity="0.9"/>
       <circle cx="44" cy="58" r="14" fill="url(#eg)" fill-opacity="0.9"/>
       <circle cx="68" cy="56" r="11" fill="url(#eg)" fill-opacity="0.9"/>
     </g>
     <g>
       <circle cx="32" cy="34" r="5.4" fill="url(#yk)"/>
       <circle cx="60" cy="30" r="5" fill="url(#yk)"/>
       <circle cx="44" cy="58" r="6" fill="url(#yk)"/>
       <circle cx="68" cy="56" r="4.6" fill="url(#yk)"/>
     </g>
     <g fill="url(#egs)">
       <circle cx="32" cy="34" r="13"/><circle cx="60" cy="30" r="12"/>
       <circle cx="44" cy="58" r="14"/><circle cx="68" cy="56" r="11"/>
     </g>
   </g>`
);

/* --- spinal nerve / nervous system ------------------------------------ */
glyph['nerve'] = gdoc(
  `${discDefs('#2c1a4d', C.violetLit)}${core('nv', C.goldPale, C.goldLit, C.gold)}
   ${core('nb2', C.violetLit, C.violet, '#241340')}`,
  `${disc('#2c1a4d', C.violetLit)}
   <circle cx="48" cy="48" r="31" fill="url(#gb)"/>
   <g filter="url(#gsh)">
     <circle cx="48" cy="30" r="14" fill="url(#nb2)"/>
     <path d="M48 44 q-3 20 0 38" fill="none" stroke="url(#nv)" stroke-width="8" stroke-linecap="round"/>
     <g stroke="url(#nv)" stroke-width="4" fill="none" stroke-linecap="round">
       <path d="M47 54 q-14 2 -20 12"/><path d="M49 62 q14 2 20 12"/><path d="M47 70 q-12 2 -16 10"/>
     </g>
     <g stroke="url(#nb2)" stroke-width="3.4" fill="none" stroke-linecap="round">
       <path d="M40 22 q-10-6 -16-2"/><path d="M56 22 q10-6 16-2"/><path d="M48 18 v-8"/>
     </g>
     <circle cx="44" cy="27" r="3" fill="${C.goldPale}" fill-opacity="0.8"/>
   </g>`
);

/* --- blood cells (RBC, nucleated) ------------------------------------- */
glyph['blood'] = gdoc(
  `${discDefs('#4a1c26', C.redLit)}${core('rbc', C.redLit, C.red, '#8d1f2f')}
   ${core('nuc', C.violetLit, C.violet, '#2b1a4a')}`,
  `${disc('#4a1c26', C.redLit)}
   <circle cx="48" cy="48" r="31" fill="url(#gb)"/>
   <g filter="url(#gsh)">
     <g>
       <ellipse cx="34" cy="36" rx="16" ry="12" fill="url(#rbc)" transform="rotate(-18 34 36)"/>
       <ellipse cx="64" cy="52" rx="14" ry="10" fill="url(#rbc)" transform="rotate(14 64 52)"/>
       <ellipse cx="40" cy="66" rx="13" ry="9" fill="url(#rbc)" transform="rotate(-8 40 66)"/>
     </g>
     <g>
       <ellipse cx="34" cy="36" rx="6" ry="4.4" fill="url(#nuc)" transform="rotate(-18 34 36)"/>
       <ellipse cx="64" cy="52" rx="5" ry="3.8" fill="url(#nuc)" transform="rotate(14 64 52)"/>
       <ellipse cx="40" cy="66" rx="4.6" ry="3.4" fill="url(#nuc)" transform="rotate(-8 40 66)"/>
     </g>
     <g fill="#ffffff" fill-opacity="0.28">
       <ellipse cx="28" cy="30" rx="5" ry="3" transform="rotate(-20 28 30)"/>
       <ellipse cx="58" cy="47" rx="4" ry="2.4" transform="rotate(14 58 47)"/>
     </g>
   </g>`
);

/* --- alimentary canal ------------------------------------------------- */
glyph['gut'] = gdoc(
  `${discDefs('#4a3520', C.goldLit)}${core('gt', C.fleshLit, C.flesh, '#8d4059')}
   ${core('stm', C.liverLit, C.liver, '#43172b')}`,
  `${disc('#4a3520', C.goldLit)}
   <circle cx="48" cy="48" r="31" fill="url(#gb)"/>
   <g filter="url(#gsh)">
     <!-- oesophagus -->
     <path d="M34 10 v14" fill="none" stroke="url(#gt)" stroke-width="9" stroke-linecap="round"/>
     <!-- J-shaped stomach -->
     <path d="M34 24 q16 0 18 14 q2 14 -12 18" fill="none" stroke="url(#stm)"
           stroke-width="17" stroke-linecap="round"/>
     <!-- coiled short intestine -->
     <path d="M40 58 q-18 4 -14 16 q4 12 22 8 q18-4 20-14"
           fill="none" stroke="url(#gt)" stroke-width="11" stroke-linecap="round"/>
     <!-- rectum opening to the cloaca -->
     <path d="M68 68 q8 8 0 16" fill="none" stroke="url(#stm)" stroke-width="10" stroke-linecap="round"/>
     <ellipse cx="68" cy="86" rx="7" ry="4.6" fill="${C.liver}"/>
     <path d="M36 28 q13 2 12 12" fill="none" stroke="#ffffff" stroke-opacity="0.25"
           stroke-width="4.4" stroke-linecap="round"/>
   </g>`
);

/* --- hibernation (winter sleep) -------------------------------------- */
glyph['hibernation'] = gdoc(
  `${discDefs('#1b3f5c', C.waterLit)}${core('ice', '#ffffff', C.waterLit, C.water)}
   ${core('frg', C.moss, '#254f22', '#12300f')}`,
  `${disc('#1b3f5c', C.waterLit)}
   <circle cx="48" cy="48" r="31" fill="url(#gb)"/>
   <g filter="url(#gsh)">
     <path d="M10 62 q38-12 76 0 v18 q-38 10 -76 0z" fill="url(#ice)" fill-opacity="0.35"/>
     <ellipse cx="46" cy="60" rx="22" ry="13" fill="url(#frg)"/>
     <circle cx="30" cy="52" r="8" fill="url(#frg)"/>
     <path d="M25 50 q6 3 10 0" fill="none" stroke="${C.night}" stroke-width="2.4" stroke-linecap="round"/>
     <g stroke="url(#ice)" stroke-width="3" stroke-linecap="round">
       <path d="M62 16 v22"/><path d="M52.5 21.5 l19 11"/><path d="M71.5 21.5 l-19 11"/>
       <path d="M62 20 l-4-4"/><path d="M62 20 l4-4"/><path d="M62 34 l-4 4"/><path d="M62 34 l4 4"/>
       <path d="M26 22 v13"/><path d="M20.4 25.2 l11.2 6.5"/><path d="M31.6 25.2 l-11.2 6.5"/>
     </g>
     <g fill="url(#ice)" opacity="0.85">
       <circle cx="18" cy="40" r="2.6"/><circle cx="78" cy="46" r="2.4"/><circle cx="42" cy="24" r="2"/>
     </g>
   </g>`
);

/* --- sperm / fertilisation ------------------------------------------- */
glyph['sperm'] = gdoc(
  `${discDefs('#1b4d63', C.tealLit)}${core('ov', C.goldPale, C.goldLit, C.gold)}
   ${core('sp', C.tealPale, C.tealLit, C.teal)}`,
  `${disc('#1b4d63', C.tealLit)}
   <circle cx="48" cy="48" r="31" fill="url(#gb)"/>
   <g filter="url(#gsh)">
     <circle cx="58" cy="50" r="20" fill="url(#ov)"/>
     <circle cx="58" cy="50" r="20" fill="none" stroke="${C.amber}" stroke-opacity="0.6" stroke-width="2.4"/>
     <circle cx="58" cy="50" r="8" fill="${C.amber}" fill-opacity="0.5"/>
     <ellipse cx="52" cy="44" rx="6" ry="4" fill="#ffffff" fill-opacity="0.45" transform="rotate(-28 52 44)"/>
     <g>
       <ellipse cx="26" cy="30" rx="6.4" ry="5" fill="url(#sp)"/>
       <path d="M20 32 q-10 4 -12 12 q10-4 14 2" fill="none" stroke="url(#sp)" stroke-width="3" stroke-linecap="round"/>
       <ellipse cx="24" cy="62" rx="5.4" ry="4.4" fill="url(#sp)"/>
       <path d="M19 64 q-10 2 -13 10 q10-2 13 4" fill="none" stroke="url(#sp)" stroke-width="2.6" stroke-linecap="round"/>
     </g>
   </g>`
);

/* --- camouflage / skin colour -------------------------------------- */
glyph['camouflage'] = gdoc(
  `${discDefs('#1e5238', C.greenLit)}${core('c1', C.greenLit, C.green, C.moss)}
   ${core('c2', '#e8d98a', '#b89b48', '#6d5426')}`,
  `${disc('#1e5238', C.greenLit)}
   <circle cx="48" cy="48" r="31" fill="url(#gb)"/>
   <g filter="url(#gsh)">
     <circle cx="48" cy="48" r="30" fill="url(#c1)"/>
     <path d="M48 18 a30 30 0 0 1 0 60 z" fill="url(#c2)"/>
     <g fill="${C.moss}" fill-opacity="0.85">
       <ellipse cx="34" cy="34" rx="7" ry="5"/><ellipse cx="30" cy="56" rx="6" ry="4.4"/>
       <ellipse cx="44" cy="66" rx="5.4" ry="4"/>
     </g>
     <g fill="#6d5426" fill-opacity="0.7">
       <ellipse cx="60" cy="32" rx="6.4" ry="4.6"/><ellipse cx="66" cy="54" rx="6" ry="4.4"/>
       <ellipse cx="54" cy="64" rx="5" ry="3.6"/>
     </g>
     <circle cx="48" cy="48" r="30" fill="url(#ds)"/>
   </g>`
);

/* --- vertebral column / bone ---------------------------------------- */
glyph['bone'] = gdoc(
  `${discDefs('#2f4a46', C.bone)}${core('bn', '#ffffff', C.bone, C.boneDim)}`,
  `${disc('#2f4a46', C.bone)}
   <circle cx="48" cy="48" r="30" fill="url(#gb)"/>
   <g filter="url(#gsh)">
     <!-- vertebral column: stacked vertebrae with transverse processes -->
     <g fill="url(#bn)">
       <rect x="38" y="14" width="20" height="13" rx="5"/>
       <rect x="38" y="30" width="20" height="13" rx="5"/>
       <rect x="39" y="46" width="18" height="12" rx="5"/>
       <rect x="40" y="61" width="16" height="11" rx="5"/>
       <path d="M44 75 q4 12 0 14 q-4-2 -4-14z"/>
       <g>
         <path d="M38 18 q-14-4 -18 4 q12 4 18 1z"/><path d="M58 18 q14-4 18 4 q-12 4 -18 1z"/>
         <path d="M38 34 q-13-4 -16 4 q11 4 16 1z"/><path d="M58 34 q13-4 16 4 q-11 4 -16 1z"/>
         <path d="M39 50 q-11-4 -14 3 q10 3 14 1z"/><path d="M57 50 q11-4 14 3 q-10 3 -14 1z"/>
       </g>
     </g>
     <g stroke="${C.boneDim}" stroke-opacity="0.8" stroke-width="1.8" fill="none">
       <path d="M40 28.5 h16"/><path d="M40 44.5 h16"/><path d="M41 59.5 h14"/>
     </g>
     <g fill="${C.deep}" fill-opacity="0.45">
       <circle cx="48" cy="20" r="3.4"/><circle cx="48" cy="36" r="3.2"/><circle cx="48" cy="52" r="3"/>
     </g>
   </g>`
);

/* --- muscle / limb -------------------------------------------------- */
glyph['muscle'] = gdoc(
  `${discDefs('#4a2338', C.redLit)}${core('ms', C.fleshLit, C.red, '#8d1f2f')}
   ${core('tn', C.bone, C.boneDim, '#7d938f')}`,
  `${disc('#4a2338', C.redLit)}
   <circle cx="48" cy="48" r="30" fill="url(#gb)"/>
   <g filter="url(#gsh)">
     <!-- flexed hind limb: thigh + shank muscle bellies joined by tendons -->
     <path d="M16 20 v10" fill="none" stroke="url(#tn)" stroke-width="8" stroke-linecap="round"/>
     <path d="M16 28 q22 4 24 22" fill="none" stroke="url(#ms)" stroke-width="21" stroke-linecap="round"/>
     <path d="M40 50 q4 20 26 24" fill="none" stroke="url(#ms)" stroke-width="17" stroke-linecap="round"/>
     <path d="M66 74 q10 3 14 8" fill="none" stroke="url(#tn)" stroke-width="8" stroke-linecap="round"/>
     <g stroke="#8d1f2f" stroke-opacity="0.55" stroke-width="2.2" fill="none">
       <path d="M20 26 q18 8 18 24"/><path d="M18 34 q16 8 16 20"/>
       <path d="M42 54 q4 16 22 20"/>
     </g>
     <path d="M20 24 q18 6 19 22" fill="none" stroke="#ffffff" stroke-opacity="0.22" stroke-width="5"/>
   </g>`
);

/* --- water / pond (habitat) ---------------------------------------- */
glyph['water'] = gdoc(
  `${discDefs('#12506b', C.waterLit)}${core('w1', C.waterLit, C.water, '#0b3145')}
   ${core('pd', C.greenLit, C.green, C.moss)}`,
  `${disc('#12506b', C.waterLit)}
   <circle cx="48" cy="52" r="30" fill="url(#gb)"/>
   <g filter="url(#gsh)">
     <path d="M12 44 q36-18 72 0 v26 q-36 16 -72 0z" fill="url(#w1)"/>
     <g stroke="${C.tealPale}" stroke-opacity="0.55" stroke-width="3" fill="none" stroke-linecap="round">
       <path d="M20 56 q8-5 16 0 q8 5 16 0 q8-5 16 0"/>
       <path d="M24 66 q8-4 16 0 q8 4 16 0"/>
     </g>
     <path d="M34 40 a12 12 0 1 1 -4 -2 z" fill="url(#pd)"/>
     <ellipse cx="62" cy="38" rx="13" ry="5" fill="url(#pd)"/>
     <ellipse cx="62" cy="36" rx="9" ry="3" fill="#ffffff" fill-opacity="0.2"/>
   </g>`
);

/* =========================================================== characters
   Frog sprites: 128px, drawn facing right. Fall back to vector art if
   these are deleted.                                                     */

const cdoc = (defs, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
     <defs>${defs}</defs>${body}
   </svg>`;

const frogDefs = `
  ${core('fbody', '#a8e05a', '#5cb63a', '#2c6b2a')}
  ${core('fbelly', '#f2ffd6', '#cdeb9a', '#93bf63')}
  ${lit('fleg', '#8ed44a', '#4f9f30', '#2a5f1f')}
  ${core('feye', '#fff6cf', '#ffd766', '#c98a11')}
  ${bloom('fglow', '#b9f062', 0.42)}
  ${softShadow('fsh', 2.4)}`;

const frogHead = (eyeY = 34, lidPath = '') => `
  <circle cx="46" cy="${eyeY}" r="13" fill="url(#fbody)"/>
  <circle cx="80" cy="${eyeY}" r="13" fill="url(#fbody)"/>
  <circle cx="46" cy="${eyeY}" r="8.4" fill="url(#feye)"/>
  <circle cx="80" cy="${eyeY}" r="8.4" fill="url(#feye)"/>
  <ellipse cx="46" cy="${eyeY + 1}" rx="3.6" ry="5" fill="#0d2410"/>
  <ellipse cx="80" cy="${eyeY + 1}" rx="3.6" ry="5" fill="#0d2410"/>
  <circle cx="43" cy="${eyeY - 3}" r="2.2" fill="#ffffff" fill-opacity="0.9"/>
  <circle cx="77" cy="${eyeY - 3}" r="2.2" fill="#ffffff" fill-opacity="0.9"/>
  ${lidPath}`;

chars['frog-idle'] = cdoc(frogDefs,
  `<ellipse cx="64" cy="118" rx="30" ry="6" fill="#000000" fill-opacity="0.28"/>
   <circle cx="64" cy="66" r="52" fill="url(#fglow)"/>
   <g filter="url(#fsh)">
     <path d="M28 88 q-14 6 -16 18 q10 2 16-6" fill="url(#fleg)"/>
     <path d="M100 88 q14 6 16 18 q-10 2 -16-6" fill="url(#fleg)"/>
     <ellipse cx="64" cy="76" rx="42" ry="34" fill="url(#fbody)"/>
     <ellipse cx="64" cy="88" rx="26" ry="19" fill="url(#fbelly)"/>
     ${frogHead(40)}
     <path d="M46 60 q18 14 36 0" fill="none" stroke="#2c6b2a" stroke-width="4" stroke-linecap="round"/>
     <g fill="#2c6b2a" fill-opacity="0.55">
       <ellipse cx="38" cy="66" rx="7" ry="5"/><ellipse cx="90" cy="66" rx="7" ry="5"/>
       <ellipse cx="64" cy="56" rx="6" ry="4"/>
     </g>
     <g fill="url(#fleg)">
       <ellipse cx="34" cy="102" rx="14" ry="8"/><ellipse cx="94" cy="102" rx="14" ry="8"/>
     </g>
     <ellipse cx="52" cy="60" rx="14" ry="8" fill="#ffffff" fill-opacity="0.18" transform="rotate(-16 52 60)"/>
   </g>`
);

chars['frog-jump'] = cdoc(frogDefs,
  `<circle cx="64" cy="60" r="54" fill="url(#fglow)"/>
   <g filter="url(#fsh)">
     <path d="M26 66 q-18-10 -20-26 q12 0 18 10" fill="url(#fleg)"/>
     <path d="M102 66 q18-10 20-26 q-12 0 -18 10" fill="url(#fleg)"/>
     <ellipse cx="64" cy="64" rx="34" ry="42" fill="url(#fbody)"/>
     <ellipse cx="64" cy="76" rx="21" ry="24" fill="url(#fbelly)"/>
     ${frogHead(32)}
     <path d="M50 52 q14 12 28 0" fill="none" stroke="#2c6b2a" stroke-width="4" stroke-linecap="round"/>
     <path d="M34 96 q-8 16 -2 26 q10-6 12-18" fill="url(#fleg)"/>
     <path d="M94 96 q8 16 2 26 q-10-6 -12-18" fill="url(#fleg)"/>
     <g fill="#2c6b2a" fill-opacity="0.5">
       <ellipse cx="46" cy="62" rx="6" ry="4"/><ellipse cx="82" cy="62" rx="6" ry="4"/>
     </g>
     <ellipse cx="52" cy="52" rx="12" ry="7" fill="#ffffff" fill-opacity="0.2" transform="rotate(-18 52 52)"/>
   </g>`
);

chars['frog-fall'] = cdoc(frogDefs,
  `<circle cx="64" cy="70" r="52" fill="url(#fglow)"/>
   <g filter="url(#fsh)">
     <path d="M24 74 q-16 10 -18 26 q12-2 18-12" fill="url(#fleg)"/>
     <path d="M104 74 q16 10 18 26 q-12-2 -18-12" fill="url(#fleg)"/>
     <ellipse cx="64" cy="74" rx="44" ry="32" fill="url(#fbody)"/>
     <ellipse cx="64" cy="84" rx="27" ry="17" fill="url(#fbelly)"/>
     ${frogHead(42, `<path d="M36 30 q10 4 18 2" fill="none" stroke="#2c6b2a" stroke-width="3" stroke-linecap="round"/>
                     <path d="M92 30 q-10 4 -18 2" fill="none" stroke="#2c6b2a" stroke-width="3" stroke-linecap="round"/>`)}
     <ellipse cx="64" cy="64" rx="9" ry="7" fill="#0d2410" fill-opacity="0.75"/>
     <g fill="url(#fleg)">
       <ellipse cx="32" cy="98" rx="13" ry="8" transform="rotate(-18 32 98)"/>
       <ellipse cx="96" cy="98" rx="13" ry="8" transform="rotate(18 96 98)"/>
     </g>
     <ellipse cx="50" cy="62" rx="13" ry="7" fill="#ffffff" fill-opacity="0.16" transform="rotate(-14 50 62)"/>
   </g>`
);

/* ========================================================== background
   Optional scenery props; the game draws vector equivalents if absent.   */

bg['lilypad'] = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 64" width="128" height="64">
  <defs>${core('lp', '#a8e05a', '#4f9f30', '#22551d')}${sheen('lps', '#ffffff', 0.3)}</defs>
  <ellipse cx="64" cy="34" rx="60" ry="24" fill="url(#lp)"/>
  <path d="M64 34 L118 24 A60 24 0 0 0 64 10 Z" fill="#22551d" fill-opacity="0.35"/>
  <ellipse cx="64" cy="28" rx="46" ry="14" fill="url(#lps)"/>
  <g stroke="#22551d" stroke-opacity="0.5" stroke-width="1.6" fill="none">
    <path d="M64 34 L20 26"/><path d="M64 34 L36 16"/><path d="M64 34 L96 16"/><path d="M64 34 L110 27"/>
  </g>
</svg>`;

bg['cattail'] = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 192" width="64" height="192">
  <defs>${lit('st', '#7fc24a', '#3f8a2c', '#1f4a17')}${core('hd2', '#8b5a2b', '#5a3618', '#311c0b')}</defs>
  <path d="M30 192 q-4-90 2-120" fill="none" stroke="url(#st)" stroke-width="6" stroke-linecap="round"/>
  <rect x="24" y="34" width="14" height="46" rx="7" fill="url(#hd2)"/>
  <rect x="24" y="34" width="6" height="46" rx="3" fill="#ffffff" fill-opacity="0.12"/>
  <path d="M31 66 q-22 18 -26 54" fill="none" stroke="url(#st)" stroke-width="5" stroke-linecap="round"/>
  <path d="M31 84 q22 16 26 52" fill="none" stroke="url(#st)" stroke-width="5" stroke-linecap="round"/>
</svg>`;

bg['dragonfly'] = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 64" width="96" height="64">
  <defs>${core('db', '#46e6c8', '#12796a', '#04201d')}${sheen('dws', '#ffffff', 0.6)}</defs>
  <g>
    <ellipse cx="40" cy="22" rx="26" ry="7" fill="#c4fff4" fill-opacity="0.45" transform="rotate(-12 40 22)"/>
    <ellipse cx="40" cy="40" rx="24" ry="6" fill="#c4fff4" fill-opacity="0.35" transform="rotate(12 40 40)"/>
    <rect x="16" y="28" width="70" height="7" rx="3.5" fill="url(#db)"/>
    <circle cx="88" cy="31" r="8" fill="#ffd766"/>
    <circle cx="91" cy="29" r="2.6" fill="#04201d"/>
  </g>
</svg>`;

bg['log'] = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 64" width="192" height="64">
  <defs>${lit('lg2', '#8a5c34', '#5a3a20', '#2e1c0e')}${core('rings', '#a3703f', '#6b4423', '#3a2411')}</defs>
  <rect x="4" y="14" width="184" height="40" rx="18" fill="url(#lg2)"/>
  <rect x="4" y="14" width="184" height="12" rx="6" fill="#ffffff" fill-opacity="0.12"/>
  <ellipse cx="180" cy="34" rx="12" ry="20" fill="url(#rings)"/>
  <g fill="none" stroke="#3a2411" stroke-opacity="0.6" stroke-width="2">
    <ellipse cx="180" cy="34" rx="7" ry="12"/><ellipse cx="180" cy="34" rx="3" ry="6"/>
  </g>
  <g stroke="#2e1c0e" stroke-opacity="0.4" stroke-width="2.4" fill="none">
    <path d="M24 30 h60"/><path d="M40 42 h72"/><path d="M100 26 h48"/>
  </g>
</svg>`;

/* ================================================================== build */

async function render(svg, outPath, size) {
  await mkdir(path.dirname(outPath), { recursive: true });
  await sharp(Buffer.from(svg), { density: 384 })
    .resize(size.w, size.h, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(outPath);
}

let n = 0;
for (const [name, svg] of Object.entries(ui)) {
  await render(svg, path.join(OUT, 'ui', 'emoji', `${name}.png`), { w: 128, h: 128 }); n++;
}
for (const [name, svg] of Object.entries(glyph)) {
  await render(svg, path.join(OUT, 'questions', `${name}.png`), { w: 256, h: 256 }); n++;
  await render(svg, path.join(OUT, 'orbs',      `${name}.png`), { w: 72,  h: 72  }); n++;
}
for (const [name, svg] of Object.entries(chars)) {
  await render(svg, path.join(OUT, 'characters', `${name}.png`), { w: 192, h: 192 }); n++;
}
const bgSizes = { lilypad: { w: 256, h: 128 }, cattail: { w: 128, h: 384 },
                  dragonfly: { w: 192, h: 128 }, log: { w: 384, h: 128 } };
for (const [name, svg] of Object.entries(bg)) {
  await render(svg, path.join(OUT, 'background', `${name}.png`), bgSizes[name]); n++;
}

console.log(`wrote ${n} PNGs to ${OUT}`);
