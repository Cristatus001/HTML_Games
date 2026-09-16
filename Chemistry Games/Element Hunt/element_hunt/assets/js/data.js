/* Element Hunt - game data
 * Element roster, clues and post-answer fun facts.
 * Content source: "ELEMENT HUNT" design document (2 levels x 15 elements).
 */
(function (global) {
    'use strict';

    var CATEGORIES = {
        nonmetal:      { label: 'Reactive non-metal', color: '#57e6c8' },
        noble:         { label: 'Noble gas',          color: '#b082ff' },
        alkali:        { label: 'Alkali metal',       color: '#ff9a4d' },
        alkaline:      { label: 'Alkaline earth metal', color: '#ffd257' },
        metalloid:     { label: 'Metalloid',          color: '#7fd4ff' },
        halogen:       { label: 'Halogen',            color: '#8fe36a' },
        transition:    { label: 'Transition metal',   color: '#ff7ba8' },
        posttransition:{ label: 'Post-transition metal', color: '#9fb6c9' },
        actinide:      { label: 'Actinide (radioactive)', color: '#5cff9d' }
    };

    var LEVELS = [
        {
            name: 'Foundations & Common Elements',
            subtitle: 'The building blocks of everyday matter',
            elements: [
                { name: 'Hydrogen', symbol: 'H', z: 1, period: 1, group: '1', cat: 'nonmetal',
                  clue: 'Lightest element, main fuel for stars',
                  fact: 'Makes up roughly 75% of all normal mass in the entire universe!' },
                { name: 'Helium', symbol: 'He', z: 2, period: 1, group: '18', cat: 'noble',
                  clue: 'Non-reactive light gas used in party balloons',
                  fact: 'It was discovered in the sun’s spectrum before it was ever found on Earth.' },
                { name: 'Carbon', symbol: 'C', z: 6, period: 2, group: '14', cat: 'nonmetal',
                  clue: 'Basis of organic life, forms diamonds and graphite',
                  fact: 'Soft pencil lead and unbreakable diamonds are made of the exact same carbon atoms!' },
                { name: 'Nitrogen', symbol: 'N', z: 7, period: 2, group: '15', cat: 'nonmetal',
                  clue: 'Makes up nearly 78% of Earth’s atmosphere',
                  fact: 'Liquid nitrogen is cold enough (-196 °C) to freeze a rose so solid it shatters like glass.' },
                { name: 'Oxygen', symbol: 'O', z: 8, period: 2, group: '16', cat: 'nonmetal',
                  clue: 'Essential gas for human breathing and combustion',
                  fact: 'Liquid oxygen is pale blue and can actually be lifted with a strong magnet!' },
                { name: 'Sodium', symbol: 'Na', z: 11, period: 3, group: '1', cat: 'alkali',
                  clue: 'Soft alkali metal found in table salt',
                  fact: 'Pure sodium is soft enough to cut with a butter knife, but explodes violently when dropped in water!' },
                { name: 'Magnesium', symbol: 'Mg', z: 12, period: 3, group: '2', cat: 'alkaline',
                  clue: 'Burns with a brilliant, blinding white light',
                  fact: 'Used in emergency flares and fireworks because it burns so hot it can burn underwater!' },
                { name: 'Aluminium', symbol: 'Al', z: 13, period: 3, group: '13', cat: 'posttransition',
                  clue: 'Lightweight, non-rusting metal used in foils and cans',
                  fact: 'In the 1800s, aluminium was more precious than gold because it was extremely hard to extract!' },
                { name: 'Silicon', symbol: 'Si', z: 14, period: 3, group: '14', cat: 'metalloid',
                  clue: 'Semiconductor used in computer microchips and sand',
                  fact: 'Makes up over 27% of Earth’s crust - mostly as quartz, clay and beach sand.' },
                { name: 'Chlorine', symbol: 'Cl', z: 17, period: 3, group: '17', cat: 'halogen',
                  clue: 'Yellow-green disinfectant gas used in swimming pools',
                  fact: 'Combined with explosive sodium metal, it forms harmless, delicious table salt (NaCl).' },
                { name: 'Potassium', symbol: 'K', z: 19, period: 4, group: '1', cat: 'alkali',
                  clue: 'Essential mineral nutrient high in bananas',
                  fact: 'Bananas are slightly radioactive because they naturally contain a small amount of Potassium-40!' },
                { name: 'Calcium', symbol: 'Ca', z: 20, period: 4, group: '2', cat: 'alkaline',
                  clue: 'Essential mineral for strong bones and teeth',
                  fact: 'Seashells, chalk, limestone and marble are all made of calcium carbonate!' },
                { name: 'Iron', symbol: 'Fe', z: 26, period: 4, group: '8', cat: 'transition',
                  clue: 'Magnetic metal that turns blood red when oxidized',
                  fact: 'The red colour of Mars’ surface and human blood both come from iron reacting with oxygen!' },
                { name: 'Copper', symbol: 'Cu', z: 29, period: 4, group: '11', cat: 'transition',
                  clue: 'Reddish-orange metal that conducts electricity easily',
                  fact: 'Copper naturally kills bacteria, and it turns green over time (which is why the Statue of Liberty is green)!' },
                { name: 'Iodine', symbol: 'I', z: 53, period: 5, group: '17', cat: 'halogen',
                  clue: 'Halogen used as a purple-tinged antiseptic',
                  fact: 'Solid iodine skips the liquid phase when heated and turns directly into a deep purple gas!' }
            ]
        },
        {
            name: 'Metals, Non-Metals & Rare Elements',
            subtitle: 'Deeper into the vault of the periodic table',
            elements: [
                { name: 'Lithium', symbol: 'Li', z: 3, period: 2, group: '1', cat: 'alkali',
                  clue: 'Lightest metal, powers modern rechargeable batteries',
                  fact: 'It is so light and low-density that it floats on water (and oil) while reacting with it!' },
                { name: 'Beryllium', symbol: 'Be', z: 4, period: 2, group: '2', cat: 'alkaline',
                  clue: 'Lightweight metal found in natural emeralds',
                  fact: 'The mirrors of the James Webb Space Telescope are made of gold-coated beryllium!' },
                { name: 'Fluorine', symbol: 'F', z: 9, period: 2, group: '17', cat: 'halogen',
                  clue: 'Most reactive halogen, added to toothpaste',
                  fact: 'Pure fluorine gas is so reactive it can set glass, water and even bricks on fire!' },
                { name: 'Neon', symbol: 'Ne', z: 10, period: 2, group: '18', cat: 'noble',
                  clue: 'Noble gas that glows reddish-orange in high voltage',
                  fact: 'Genuine "neon" signs only glow reddish-orange; all other glowing sign colours use different gases!' },
                { name: 'Phosphorus', symbol: 'P', z: 15, period: 3, group: '15', cat: 'nonmetal',
                  clue: 'Glows in the dark, used on matchbox striking strips',
                  fact: 'Discovered in 1669 by an alchemist who boiled 1,500 gallons of urine trying to make gold!' },
                { name: 'Sulphur', symbol: 'S', z: 16, period: 3, group: '16', cat: 'nonmetal',
                  clue: 'Bright yellow solid that smells like rotten eggs when burned',
                  fact: 'Historically called "brimstone", it erupts with electric blue flames from active volcanoes!' },
                { name: 'Titanium', symbol: 'Ti', z: 22, period: 4, group: '4', cat: 'transition',
                  clue: 'As strong as steel but 45% lighter',
                  fact: 'Human bone naturally bonds directly to titanium, making it ideal for artificial joint replacements!' },
                { name: 'Zinc', symbol: 'Zn', z: 30, period: 4, group: '12', cat: 'transition',
                  clue: 'Anti-corrosion metal used to galvanize steel',
                  fact: 'US penny coins are actually 97.5% zinc inside with only a paper-thin outer copper coating!' },
                { name: 'Bromine', symbol: 'Br', z: 35, period: 4, group: '17', cat: 'halogen',
                  clue: 'Dark red liquid non-metal with a harsh smell',
                  fact: 'One of only two elements on the entire periodic table that are liquid at room temperature!' },
                { name: 'Silver', symbol: 'Ag', z: 47, period: 5, group: '11', cat: 'transition',
                  clue: 'Metal with the highest electrical conductivity',
                  fact: 'Mirror backings are coated with silver because it is the most reflective element on Earth!' },
                { name: 'Tin', symbol: 'Sn', z: 50, period: 5, group: '14', cat: 'posttransition',
                  clue: 'Soft metal that makes a "screaming" sound when bent',
                  fact: 'When a bar of pure tin is bent, it emits a high-pitched squeak known as the "tin cry"!' },
                { name: 'Gold', symbol: 'Au', z: 79, period: 6, group: '11', cat: 'transition',
                  clue: 'Unreactive precious metal that never rusts or tarnishes',
                  fact: 'All the gold ever mined in human history could fit into a single cube measuring just 22 metres per side!' },
                { name: 'Mercury', symbol: 'Hg', z: 80, period: 6, group: '12', cat: 'transition',
                  clue: 'Dense liquid metal historically called "quicksilver"',
                  fact: 'Mercury is so dense that a heavy iron cannonball can float directly on top of a pool of it!' },
                { name: 'Lead', symbol: 'Pb', z: 82, period: 6, group: '14', cat: 'posttransition',
                  clue: 'Heavy, dense metal used for X-ray radiation shielding',
                  fact: 'Ancient Romans used lead to sweeten wine and build water pipes, completely unaware of its toxicity!' },
                { name: 'Uranium', symbol: 'U', z: 92, period: 7, group: '3', groupNote: 'Actinides',
                  cat: 'actinide',
                  clue: 'Dense radioactive element used in nuclear reactors',
                  fact: 'Just 1 gram of Uranium-235 releases as much energy as burning 3 tons of coal!' }
            ]
        }
    ];

    /* Reference material shown behind "Learn More" on the results screen. */
    var REFERENCE = [
        { term: 'Chemical symbol',
          text: 'A one- or two-letter shorthand for an element. The first letter is always a capital, the second is always lowercase - Na, Fe, Au. Some come from Latin names: Fe from ferrum, Au from aurum, Pb from plumbum, Hg from hydrargyrum.' },
        { term: 'Period (row)',
          text: 'A horizontal row of the periodic table, numbered 1 to 7. The period number tells you how many electron shells an atom has. Elements get larger and heavier as you move down the periods.' },
        { term: 'Group (column)',
          text: 'A vertical column, numbered 1 to 18. Elements in the same group have the same number of outer-shell electrons, so they react in very similar ways. Group 1 are the reactive alkali metals; group 18 are the inert noble gases.' },
        { term: 'Atomic number (Z)',
          text: 'The number of protons in the nucleus. It is the element’s identity card - change it and you change the element itself.' },
        { term: 'Families of elements',
          text: 'Metals conduct heat and electricity and are usually shiny and bendable. Non-metals are poor conductors and are often gases. Metalloids such as silicon sit on the border and behave a bit like both, which is what makes them useful in electronics.' }
    ];

    global.ElementHuntData = {
        levels: LEVELS,
        categories: CATEGORIES,
        reference: REFERENCE
    };
})(window);
