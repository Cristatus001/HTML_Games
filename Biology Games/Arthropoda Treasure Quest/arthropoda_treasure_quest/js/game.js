"use strict";
/* =========================================================================
   DATA  (gameplay content preserved from the original quiz, verbatim)
   ========================================================================= */
const database = [
  { zone:"armor", img:"shrimp_exoskeleton", ext:"jpg",
    q:"Why is chitinous exoskeleton important in arthropods?",
    options:["Helps in digestion","Provides protection & prevents water loss","Helps in circulation","Produces eggs"], correct:1,
    fact:"The chitinous cuticle is light and waterproof — it shields the body and stops the animal drying out, which is exactly why arthropods thrive on land, in water and in the air." },
  { zone:"springs", img:"tracheal_system", ext:"jpg",
    q:"An insect with tracheal system will exchange gases through?",
    options:["Blood","Skin","Spiracles","Gills"], correct:2,
    fact:"Air enters through tiny pores called spiracles and travels straight to the tissues through branching tracheal tubes — the blood barely gets involved." },
  { zone:"springs", img:"grasshopper", ext:"jpg",
    q:"Why is circulatory system open in arthropods?",
    options:["Blood flows in vessels only","Blood bathes organs directly","No heart present","Only for aquatic life"], correct:1,
    fact:"In an open system the heart pumps haemolymph into large body sinuses, where it bathes the organs directly before draining back to be recirculated." },
  { zone:"armor", img:"shield_bug", ext:"jpg",
    q:"Which structure helps arthropods in movement?",
    options:["Setae","Jointed appendages","Cilia","Pseudopodia"], correct:1,
    fact:"‘Arthropoda’ literally means jointed feet — these hinged limbs give incredible precision, from a beetle’s grip to a crab’s powerful claw." },
  { zone:"armor", img:"coelomate", ext:"png",
    q:"Why are arthropods considered triploblastic?",
    options:["Three body parts","Three germ layers","Three hearts","Three shells"], correct:1,
    fact:"Three germ layers — ectoderm, mesoderm and endoderm — form during development, giving arthropods true organs and a defined body cavity." },
  { zone:"springs", img:"tracheal_system", ext:"jpg",
    q:"Which feature supports terrestrial life in insects?",
    options:["Book gills","Tracheal system","Gills","Open circulation"], correct:1,
    fact:"Unlike gills, tracheal tubes never dry out in open air, letting insects breathe efficiently on land without losing precious water." },
  { zone:"springs", img:"grasshopper", ext:"jpg",
    q:"Malpighian tubules help in?",
    options:["Respiration","Reproduction","Excretion","Movement"], correct:2,
    fact:"Malpighian tubules filter nitrogenous waste from the haemolymph and turn it into dry uric-acid crystals — a clever water-saving trick for life on land." },
  { zone:"grove", img:"limulus", ext:"jpg",
    q:"Why is Limulus called a living fossil?",
    options:["Recently evolved","Extinct","Shows ancient characters","Parasite"], correct:2,
    fact:"Horseshoe crabs like Limulus have barely changed in over 400 million years, still carrying ancestral features long lost in their modern relatives." },
  { zone:"grove", img:"mosquito", ext:"jpg",
    q:"Why are insects like mosquitoes successful vectors?",
    options:["Large size","High reproduction & adaptability","Hard shell","No predators"], correct:1,
    fact:"Rapid breeding and adaptability let mosquitoes and similar insects colonise almost every habitat — exactly what makes them such effective disease carriers." },
  { zone:"grove", img:"mosquito_larva", ext:"jpg",
    q:"Indirect development means?",
    options:["No larva","Young resemble adult","Larval stage present","External fertilisation"], correct:2,
    fact:"In indirect development the young hatch as a larva that looks nothing like the adult, then undergo metamorphosis to transform completely." }
];

const ZONES = [
  { id:"armor",   name:"Amber Armor Ruins",   sub:"Exoskeleton, limbs & body plan" },
  { id:"springs", name:"Whispering Springs",  sub:"Breathing, blood & waste" },
  { id:"grove",   name:"Lost Fossil Grove",   sub:"Living fossils & lifecycles" }
];

const REFERENCE = [
  { img:"shrimp_exoskeleton", ext:"jpg", name:"Exoskeleton & Moulting",
    body:"The rigid, chitin-based cuticle armours the whole body and prevents water loss, but it cannot grow. So arthropods periodically shed it (ecdysis) and grow a soft new one that hardens afterwards.",
    eg:"e.g. shrimp, crabs, insects" },
  { img:"tracheal_system", ext:"jpg", name:"Breathing Without Lungs",
    body:"Terrestrial arthropods breathe through spiracles — small pores opening into a branching network of tracheal tubes that carry air directly to every tissue, no bloodstream required. Aquatic relatives use gills or book gills instead.",
    eg:"e.g. grasshoppers, beetles" },
  { img:"grasshopper", ext:"jpg", name:"Open Circulatory System",
    body:"Instead of blood vessels, an arthropod’s heart pumps haemolymph into open body spaces called sinuses (the haemocoel), bathing the organs directly before draining back to be recirculated.",
    eg:"e.g. insects, crustaceans" },
  { img:"coelomate", ext:"png", name:"Segmented, Jointed Bodies",
    body:"Arthropods are triploblastic, bilaterally symmetrical animals with a true body cavity (coelom) and a segmented body plan carrying paired, jointed appendages — the very feature that gives the phylum its name.",
    eg:"‘Arthropoda’ = jointed feet" },
  { img:"limulus", ext:"jpg", name:"Living Fossils",
    body:"Horseshoe crabs (Limulus) have barely changed in body plan for over 400 million years, retaining ancestral chelicerate features long lost in modern relatives like spiders and scorpions.",
    eg:"e.g. Limulus, the horseshoe crab" },
  { img:"mosquito_larva", ext:"jpg", name:"Vectors & Metamorphosis",
    body:"Rapid reproduction and adaptability make many insects highly successful disease vectors. Most also undergo indirect development: a larva very unlike the adult hatches first, then metamorphoses completely before reaching adulthood.",
    eg:"e.g. mosquito larva → adult" }
];

/* =========================================================================
   VECTOR FALLBACK ART (ink-on-map). Real photos load over this when present.
   ========================================================================= */
const IK="#20140b", GLD="#e6b422", GLD2="#96681c", EMR="#36a869", RUB="#c43e30";
function svg(inner){ return `<svg viewBox='0 0 200 200'>${inner}</svg>`; }
const SPECIMEN_ART = {
  shrimp_exoskeleton: svg(`<g stroke='${IK}' stroke-width='3' fill='rgba(230,180,34,.22)'>
    <path d='M40 90 C46 60 90 46 120 58 C150 70 168 96 160 122 C154 142 130 150 112 140 C118 128 108 118 96 122 C86 126 84 138 92 148 C74 152 54 140 48 120 C42 104 40 96 40 90 Z'/></g>
    <g stroke='${IK}' stroke-width='1.6' fill='none' opacity='.8'>
      <path d='M70 68 q10 10 4 24 M92 62 q10 12 4 26 M112 64 q10 12 4 24'/></g>
    <circle cx='52' cy='84' r='5' fill='${IK}'/>
    <path d='M44 82 L20 70 M44 90 L16 92' stroke='${IK}' stroke-width='2' fill='none'/>`),
  tracheal_system: svg(`<g stroke='${IK}' stroke-width='3' fill='rgba(54,168,105,.18)'>
    <ellipse cx='100' cy='104' rx='58' ry='34'/></g>
    <g stroke='${EMR}' stroke-width='2' fill='none'>
      <path d='M100 104 L54 84 M100 104 L50 104 M100 104 L54 124 M100 104 L146 84 M100 104 L150 104 M100 104 L146 124'/>
      <circle cx='54' cy='84' r='4' fill='${EMR}'/><circle cx='50' cy='104' r='4' fill='${EMR}'/><circle cx='54' cy='124' r='4' fill='${EMR}'/>
      <circle cx='146' cy='84' r='4' fill='${EMR}'/><circle cx='150' cy='104' r='4' fill='${EMR}'/><circle cx='146' cy='124' r='4' fill='${EMR}'/></g>
    <circle cx='150' cy='104' r='14' fill='rgba(230,180,34,.3)' stroke='${IK}' stroke-width='2'/>`),
  grasshopper: svg(`<g stroke='${IK}' stroke-width='3' fill='rgba(54,168,105,.2)'>
    <ellipse cx='104' cy='108' rx='54' ry='22' transform='rotate(-8 104 108)'/></g>
    <path d='M150 100 C168 92 178 76 182 56' stroke='${IK}' stroke-width='4' fill='none' stroke-linecap='round'/>
    <path d='M64 118 C50 128 40 148 34 168' stroke='${IK}' stroke-width='5' fill='none' stroke-linecap='round'/>
    <path d='M56 100 L30 86 M56 108 L26 106' stroke='${IK}' stroke-width='2' fill='none'/>
    <circle cx='58' cy='96' r='6' fill='${IK}'/>`),
  shield_bug: svg(`<g stroke='${IK}' stroke-width='3' fill='rgba(230,180,34,.28)'>
    <path d='M100 40 L152 66 L152 128 L100 160 L48 128 L48 66 Z'/></g>
    <line x1='100' y1='40' x2='100' y2='160' stroke='${IK}' stroke-width='2'/>
    <path d='M48 66 L20 54 M48 128 L20 140 M152 66 L180 54 M152 128 L180 140' stroke='${IK}' stroke-width='4' fill='none' stroke-linecap='round'/>
    <circle cx='100' cy='70' r='6' fill='${IK}'/>`),
  coelomate: svg(`<g fill='none' stroke='${IK}' stroke-width='3'>
      <circle cx='100' cy='100' r='70'/><circle cx='100' cy='100' r='46'/><circle cx='100' cy='100' r='20'/></g>
    <circle cx='100' cy='100' r='70' fill='rgba(150,120,190,.18)'/>
    <circle cx='100' cy='100' r='46' fill='rgba(196,62,48,.18)'/>
    <circle cx='100' cy='100' r='20' fill='rgba(230,180,34,.3)'/>
    <line x1='100' y1='30' x2='100' y2='54' stroke='${RUB}' stroke-width='3'/>
    <line x1='100' y1='146' x2='100' y2='170' stroke='${RUB}' stroke-width='3'/>`),
  limulus: svg(`<g stroke='${IK}' stroke-width='3' fill='rgba(150,104,28,.28)'>
    <path d='M100 40 C140 40 166 70 166 100 C166 118 150 122 132 118 L132 108 C122 114 78 114 68 108 L68 118 C50 122 34 118 34 100 C34 70 60 40 100 40 Z'/></g>
    <line x1='100' y1='40' x2='100' y2='118' stroke='${IK}' stroke-width='1.6'/>
    <path d='M100 118 L100 170' stroke='${IK}' stroke-width='5' stroke-linecap='round'/>
    <circle cx='82' cy='60' r='4' fill='${IK}'/><circle cx='118' cy='60' r='4' fill='${IK}'/>`),
  mosquito: svg(`<g stroke='${IK}' stroke-width='3' fill='none'>
    <path d='M60 120 C80 96 120 96 140 120' stroke-width='4'/>
    <path d='M100 108 L146 60' stroke-width='3'/>
    <path d='M60 120 L20 108 M60 120 L18 132 M100 132 L70 158 M100 132 L128 160 M100 132 L92 168' stroke-width='3'/></g>
    <ellipse cx='90' cy='70' rx='30' ry='14' fill='rgba(54,168,105,.2)' stroke='${IK}' stroke-width='2' transform='rotate(-24 90 70)'/>
    <circle cx='58' cy='118' r='6' fill='${IK}'/>`),
  mosquito_larva: svg(`<g stroke='${EMR}' stroke-width='2' fill='none' opacity='.5'>
    <path d='M20 150 q20 -8 40 0 t40 0 t40 0 t40 0'/></g>
    <g stroke='${IK}' stroke-width='3' fill='rgba(150,104,28,.25)'>
    <path d='M40 100 C60 90 120 92 138 104 C144 108 144 116 136 120 C118 130 60 128 42 116 C36 112 36 104 40 100 Z'/></g>
    <line x1='138' y1='104' x2='156' y2='84' stroke='${IK}' stroke-width='4' stroke-linecap='round'/>
    <circle cx='46' cy='108' r='5' fill='${IK}'/>`),
  default: svg(`<circle cx='100' cy='100' r='54' fill='rgba(54,168,105,.22)' stroke='${IK}' stroke-width='3'/><circle cx='100' cy='100' r='10' fill='${GLD2}'/>`)
};

/* fallback vector chest art, used only if the shipped chest PNGs fail to load */
function chestSVG(state){
  const wood="#7a4a2a", woodDeep="#3a2414", trim = state==="wrong" ? "#8a8a8a" : GLD;
  if(state==="closed"){
    return `<svg viewBox='0 0 200 200'>
      <ellipse cx='100' cy='168' rx='78' ry='10' fill='rgba(0,0,0,.35)'/>
      <rect x='26' y='96' width='148' height='64' rx='10' fill='${wood}' stroke='${woodDeep}' stroke-width='4'/>
      <path d='M26 96 A74 46 0 0 1 174 96 Z' fill='${wood}' stroke='${woodDeep}' stroke-width='4'/>
      <rect x='26' y='92' width='148' height='10' fill='${trim}'/>
      <rect x='86' y='84' width='28' height='28' rx='6' fill='${trim}' stroke='${woodDeep}' stroke-width='2'/>
    </svg>`;
  }
  const glow = state==="correct" ? "rgba(230,180,34,.9)" : "rgba(196,62,48,.5)";
  return `<svg viewBox='0 0 200 200'>
    <ellipse cx='100' cy='168' rx='78' ry='10' fill='rgba(0,0,0,.35)'/>
    <rect x='26' y='96' width='148' height='64' rx='10' fill='${wood}' stroke='${woodDeep}' stroke-width='4'/>
    <rect x='26' y='92' width='148' height='10' fill='${trim}'/>
    <path d='M20 96 L96 40 L180 70 L110 108 Z' fill='${wood}' stroke='${woodDeep}' stroke-width='4'/>
    <circle cx='100' cy='96' r='40' fill='${glow}' opacity='.55'/>
    ${state==="correct" ? `<circle cx='84' cy='98' r='8' fill='${GLD}'/><circle cx='104' cy='90' r='10' fill='${GLD}'/><circle cx='120' cy='100' r='7' fill='${GLD}'/>` : `<path d='M84 100 L96 116 L108 102 L118 122' stroke='${woodDeep}' stroke-width='3' fill='none'/>`}
  </svg>`;
}

/* =========================================================================
   OPTIONAL IMAGE OVERRIDES (graceful fallback to vector art if missing)
   ========================================================================= */
function mountArt(containerEl, pngPath, svgMarkup){
  containerEl.innerHTML = svgMarkup; // vector fallback shown immediately
  const img = new Image(); img.alt = "";
  img.onload = () => { containerEl.innerHTML = ""; containerEl.appendChild(img); };
  img.onerror = () => {}; // keep vector art
  img.src = pngPath;
}
function setSpecimen(imgKey, ext){
  mountArt($("specimen"), `assets/images/specimens/${imgKey}.${ext}`, SPECIMEN_ART[imgKey] || SPECIMEN_ART.default);
}
function setChestArt(el, state){
  // Art lives in its own slot so async PNG loads never clobber the sibling
  // chest-number badge (mountArt replaces the whole container it's given).
  let slot = el.querySelector(".chest-art-slot");
  if(!slot){ slot = document.createElement("div"); slot.className = "chest-art-slot"; el.insertBefore(slot, el.firstChild); }
  mountArt(slot, `assets/images/characters/chest_${state}.png`, chestSVG(state));
}

/* =========================================================================
   STATE + STORAGE
   ========================================================================= */
const LS_KEY = "arthropodaTreasureQuest.v1";
let store = { music:true, sfx:true, best:{} };
try{ const raw = localStorage.getItem(LS_KEY); if(raw) store = Object.assign(store, JSON.parse(raw)); }catch(e){}
function persist(){ try{ localStorage.setItem(LS_KEY, JSON.stringify(store)); }catch(e){} }

let deck = [], currentMode = "all", score = 0, elapsed = 0, timerId = null, answeredCount = 0;
let activeChestIdx = -1, answered = false;

const $ = id => document.getElementById(id);
const screens = { menu:$("menu"), game:$("game"), result:$("result") };
function show(name){ Object.values(screens).forEach(s=>s.classList.remove("active")); screens[name].classList.add("active"); }

/* =========================================================================
   AUDIO  (procedural jungle ambience + SFX, with optional bgm.mp3 override)
   ========================================================================= */
const Audio_ = {
  ctx:null, master:null, musicGain:null, sfxGain:null,
  padNodes:[], lfo:null, started:false, htmlAudio:null, usingFile:false,
  init(){
    if(this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext; if(!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain(); this.master.gain.value = 0.9; this.master.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain(); this.musicGain.gain.value = store.music ? 0.5 : 0.0; this.musicGain.connect(this.master);
    this.sfxGain = this.ctx.createGain(); this.sfxGain.gain.value = store.sfx ? 0.9 : 0.0; this.sfxGain.connect(this.master);
  },
  tryFile(){
    const a = new Audio(); a.loop = true; a.preload = "auto"; a.src = "assets/audio/bgm.mp3";
    a.addEventListener("canplaythrough", () => {
      if(this.usingFile) return; this.usingFile = true; this.htmlAudio = a;
      this.stopPad();
      a.volume = store.music ? 0.55 : 0.0;
      if(this.started && store.music) a.play().catch(()=>{});
    }, { once:true });
    a.addEventListener("error", () => { /* no drop-in file: keep procedural pad */ });
  },
  startPad(){
    if(this.usingFile || !this.ctx || this.padNodes.length) return;
    const now = this.ctx.currentTime;
    const filter = this.ctx.createBiquadFilter(); filter.type = "lowpass"; filter.frequency.value = 900; filter.Q.value = 0.6; filter.connect(this.musicGain);
    this.lfo = this.ctx.createOscillator(); const lfoG = this.ctx.createGain();
    this.lfo.frequency.value = 0.06; lfoG.gain.value = 260; this.lfo.connect(lfoG); lfoG.connect(filter.frequency); this.lfo.start();
    // warm minor-pentatonic pad — calm dusk-in-the-canopy chord
    const freqs = [98.0, 146.83, 196.0, 293.66];
    freqs.forEach((f,i) => {
      const o = this.ctx.createOscillator(); o.type = i<2 ? "triangle" : "sine"; o.frequency.value = f;
      const d = this.ctx.createOscillator(); d.type = "sine"; d.frequency.value = f * 1.006;
      const g = this.ctx.createGain(); g.gain.value = 0.0; g.connect(filter);
      o.connect(g); d.connect(g); o.start(); d.start();
      g.gain.setValueAtTime(0.0001, now); g.gain.linearRampToValueAtTime(0.11 - i*0.014, now + 3 + i);
      const trem = this.ctx.createOscillator(); const tg = this.ctx.createGain();
      trem.frequency.value = 0.08 + i*0.02; tg.gain.value = 0.03; trem.connect(tg); tg.connect(g.gain); trem.start();
      this.padNodes.push(o,d,trem);
    });
    this.scheduleChirp();
  },
  scheduleChirp(){
    if(this.usingFile || !this.ctx || !this.padNodes.length) return;
    if(Math.random() < 0.5){
      const scale = [392.0, 466.16, 587.33, 698.46, 880.0];
      const f = scale[Math.floor(Math.random()*scale.length)];
      const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
      o.type = "triangle"; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, this.ctx.currentTime);
      g.gain.linearRampToValueAtTime(0.08, this.ctx.currentTime + 0.04);
      g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 1.0);
      o.connect(g); g.connect(this.musicGain); o.start(); o.stop(this.ctx.currentTime + 1.1);
    }
    setTimeout(() => this.scheduleChirp(), 1600 + Math.random()*1800);
  },
  stopPad(){ this.padNodes.forEach(n=>{try{n.stop();}catch(e){}}); this.padNodes = []; if(this.lfo){ try{this.lfo.stop();}catch(e){} this.lfo = null; } },
  begin(){
    this.init(); if(!this.ctx) return;
    if(this.ctx.state === "suspended") this.ctx.resume();
    this.started = true;
    this.tryFile();
    if(this.usingFile && this.htmlAudio){ if(store.music) this.htmlAudio.play().catch(()=>{}); }
    else this.startPad();
  },
  setMusic(on){
    store.music = on; persist();
    if(this.musicGain) this.musicGain.gain.setTargetAtTime(on ? 0.5 : 0.0, this.ctx.currentTime, 0.1);
    if(this.htmlAudio){ this.htmlAudio.volume = on ? 0.55 : 0.0; if(on) this.htmlAudio.play().catch(()=>{}); else this.htmlAudio.pause(); }
  },
  setSfx(on){ store.sfx = on; persist(); if(this.sfxGain) this.sfxGain.gain.value = on ? 0.9 : 0.0; },
  blip(type){
    this.init(); if(!this.ctx || !store.sfx) return;
    const now = this.ctx.currentTime;
    if(type==="correct"){ [523.25,659.25,783.99,1046.5].forEach((f,i)=>this._tone(f, now+i*0.08, 0.24, "triangle", 0.16)); }
    else if(type==="wrong"){ this._tone(180, now, 0.3, "sawtooth", 0.14); this._tone(120, now+0.04, 0.34, "sawtooth", 0.12); }
    else if(type==="click"){ this._tone(520, now, 0.06, "square", 0.08); }
    else if(type==="open"){ this._noise(now, 0.14); this._tone(300, now, 0.12, "square", 0.06); }
  },
  _tone(f,t,dur,type,vol){ const o=this.ctx.createOscillator(), g=this.ctx.createGain(); o.type=type; o.frequency.value=f;
    g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(vol,t+0.01); g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    o.connect(g); g.connect(this.sfxGain); o.start(t); o.stop(t+dur+0.02); },
  _noise(t,dur){ const b=this.ctx.createBuffer(1,this.ctx.sampleRate*dur,this.ctx.sampleRate); const d=b.getChannelData(0);
    for(let i=0;i<d.length;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,2);
    const s=this.ctx.createBufferSource(); s.buffer=b; const f=this.ctx.createBiquadFilter(); f.type="highpass"; f.frequency.value=900;
    const g=this.ctx.createGain(); g.gain.value=0.4; s.connect(f); f.connect(g); g.connect(this.sfxGain); s.start(t); }
};

/* =========================================================================
   GAME FLOW
   ========================================================================= */
function buildDeck(mode){
  currentMode = mode;
  const idx = mode === "all" ? database.map((_,i)=>i) : database.map((_,i)=>i).filter(i=>database[i].zone===mode);
  deck = idx.map(i => ({ i, done:false, correct:false }));
}
function fmtTime(s){ return s + "s"; }
function startGame(mode){
  buildDeck(mode);
  score = 0; elapsed = 0; answeredCount = 0; answered = false;
  activeChestIdx = -1;
  $("hud-score").textContent = "0";
  $("hud-total").textContent = String(deck.length);
  $("hud-time").textContent = fmtTime(0);
  $("progress").style.width = "0%";
  $("zone-label").textContent = mode === "all" ? "Full Expedition" : (ZONES.find(z=>z.id===mode)||{}).name || "";
  Audio_.begin();
  renderChestGrid();
  show("game");
  if(timerId) clearInterval(timerId);
  timerId = setInterval(() => { elapsed++; $("hud-time").textContent = fmtTime(elapsed); }, 1000);
}
function renderChestGrid(){
  const grid = $("chest-grid"); grid.innerHTML = "";
  grid.className = "chest-grid" + (deck.length <= 3 ? " n3" : deck.length === 4 ? " n4" : "");
  deck.forEach((slot, pos) => {
    const el = document.createElement("div");
    el.className = "chest";
    const num = document.createElement("span"); num.className = "chest-num"; num.textContent = String(pos+1);
    setChestArt(el, "closed");
    el.appendChild(num);
    el.addEventListener("pointerup", e => { e.preventDefault(); openChest(pos); });
    grid.appendChild(el);
  });
}
function openChest(pos){
  if(deck[pos].done) return;
  if($("q-overlay").classList.contains("active")) return; // guard: one chest at a time
  activeChestIdx = pos; answered = false;
  const d = database[deck[pos].i];
  $("q-tag").textContent = "CHEST " + (pos+1) + " OF " + deck.length;
  $("lens").classList.remove("correct","wrong");
  $("stamp").classList.remove("show");
  $("continue-btn").style.display = "none";
  $("explain").style.display = "none";
  setSpecimen(d.img, d.ext);
  $("clue").textContent = d.q;
  const opts = $("options"); opts.innerHTML = "";
  d.options.forEach((opt,i) => {
    const b = document.createElement("button");
    b.className = "btn-tab opt"; b.textContent = opt;
    b.addEventListener("pointerup", ev => { ev.preventDefault(); checkAnswer(i,d,b); }, { passive:false });
    opts.appendChild(b);
  });
  Audio_.begin(); Audio_.blip("open");
  $("q-overlay").classList.add("active");
}
function checkAnswer(sel, d, btnEl){
  if(answered) return; answered = true;
  const btns = $("options").querySelectorAll("button");
  btns.forEach(b => b.disabled = true);
  const stamp = $("stamp"), stampImg = $("stamp-img"), lens = $("lens");
  const slot = deck[activeChestIdx];
  slot.done = true; answeredCount++;
  if(sel === d.correct){
    slot.correct = true; score++;
    $("hud-score").textContent = String(score);
    btnEl.classList.add("correct-pick");
    lens.classList.add("correct");
    stampImg.src = "assets/images/ui/emoji/check.png";
    Audio_.blip("correct");
  } else {
    btnEl.classList.add("wrong-pick");
    btns[d.correct].classList.add("reveal");
    lens.classList.add("wrong");
    stampImg.src = "assets/images/ui/emoji/cross.png";
    Audio_.blip("wrong");
  }
  stamp.classList.remove("show"); void stamp.offsetWidth; stamp.classList.add("show");
  $("explain-text").textContent = d.fact;
  $("explain").style.display = "block";
  $("continue-btn").style.display = "flex";
  $("progress").style.width = (answeredCount/deck.length*100) + "%";
}
function continueDig(){
  const grid = $("chest-grid");
  const el = grid.children[activeChestIdx];
  const slot = deck[activeChestIdx];
  el.classList.add(slot.correct ? "correct" : "wrong", "done");
  setChestArt(el, slot.correct ? "correct" : "wrong");
  $("q-overlay").classList.remove("active");
  Audio_.blip("click");
  if(answeredCount >= deck.length) setTimeout(endGame, 250);
}

function rankFor(pct){
  if(pct >= 90) return "Grandmaster Explorer";
  if(pct >= 70) return "Seasoned Ranger";
  if(pct >= 50) return "Trail Scout";
  if(pct >= 25) return "Wandering Novice";
  return "Lost Greenhorn";
}
function endGame(){
  if(timerId){ clearInterval(timerId); timerId = null; }
  $("progress").style.width = "100%";
  const total = deck.length, pct = total ? Math.round(score/total*100) : 0;
  const prevBest = store.best[currentMode] || { pct:0, time:null };
  const isNewBest = pct > prevBest.pct || (pct === prevBest.pct && (prevBest.time===null || elapsed < prevBest.time));
  if(isNewBest){ store.best[currentMode] = { pct, time:elapsed }; persist(); }
  $("result-rank").textContent = rankFor(pct);
  $("result-final").textContent = "Treasure found: " + score + " / " + total + "  (" + pct + "%)  in " + fmtTime(elapsed);
  $("result-newbest").style.display = isNewBest ? "block" : "none";
  const stars = pct>=90 ? 3 : pct>=60 ? 2 : pct>=30 ? 1 : 0;
  const sc = $("result-stars"); sc.innerHTML = "";
  for(let i=0;i<3;i++){ const s=document.createElement("span"); s.className="star"; s.innerHTML=starSVG(i<stars); sc.appendChild(s); }
  const notes = [
    "The jungle keeps its secrets a little less well now.",
    "Another chest, another chapter of the phylum's story.",
    "Your field notes are growing thicker by the day.",
    "The old ruins remember every explorer who studied them well."
  ];
  $("result-note").textContent = pct>=90 ? "Masterful digging! The whole expedition camp is talking about you." : notes[Math.floor(Math.random()*notes.length)];
  show("result");
}
function starSVG(filled){
  const fill = filled ? "var(--gold-lit)" : "none", stroke = filled ? "var(--gold-deep)" : "rgba(230,180,34,.4)";
  return `<svg viewBox='0 0 32 32' width='30' height='30'><path d='M16 3 l3.8 8.6 9.4 .8 -7.1 6.2 2.2 9.2 -8.3-5 -8.3 5 2.2-9.2 -7.1-6.2 9.4-.8z' fill='${fill}' stroke='${stroke}' stroke-width='1.6' stroke-linejoin='round'/></svg>`;
}

/* =========================================================================
   MENU / ZONES / MODALS
   ========================================================================= */
function renderZones(){
  const wrap = $("zones"); wrap.innerHTML = "";
  const full = document.createElement("div");
  full.className = "zone full"; full.setAttribute("role","button");
  const bAll = store.best.all;
  full.innerHTML = `<div class="z-name">Full Expedition</div><div class="z-sub">all 10 chests</div>` + (bAll ? `<span class="z-best">Best ${bAll.pct}%</span>` : "");
  full.addEventListener("pointerup", e => { e.preventDefault(); Audio_.blip("click"); startGame("all"); });
  wrap.appendChild(full);
  ZONES.forEach(z => {
    const el = document.createElement("div"); el.className = "zone"; el.setAttribute("role","button");
    const b = store.best[z.id];
    el.innerHTML = `<div class="z-name">${z.name}</div><div class="z-sub">${z.sub}</div>` + (b ? `<span class="z-best">Best ${b.pct}%</span>` : "");
    el.addEventListener("pointerup", e => { e.preventDefault(); Audio_.blip("click"); startGame(z.id); });
    wrap.appendChild(el);
  });
}
function renderReference(){
  const wrap = $("ref-cards"); if(wrap.dataset.done) return; wrap.dataset.done = "1";
  REFERENCE.forEach(r => {
    const c = document.createElement("div"); c.className = "ref-card";
    const head = document.createElement("div"); head.className = "rc-head";
    const thumb = document.createElement("span"); thumb.className = "rc-emblem"; thumb.innerHTML = SPECIMEN_ART[r.img] || SPECIMEN_ART.default;
    const img = new Image();
    img.className = "rc-img"; img.alt = "";
    img.onload = () => { thumb.replaceWith(img); };
    img.onerror = () => {}; // keep vector emblem
    img.src = `assets/images/specimens/${r.img}.${r.ext}`;
    head.appendChild(thumb);
    const h3 = document.createElement("h3"); h3.textContent = r.name; head.appendChild(h3);
    const p1 = document.createElement("p"); p1.textContent = r.body;
    const p2 = document.createElement("p"); p2.className = "eg"; p2.textContent = r.eg;
    c.appendChild(head); c.appendChild(p1); c.appendChild(p2);
    wrap.appendChild(c);
  });
}
function openModal(id){ if(id === "learn-modal") renderReference(); $(id).classList.add("active"); }
function closeModal(el){ el.classList.remove("active"); }

function syncToggles(){
  const m = $("music-toggle"), s = $("sfx-toggle");
  m.classList.toggle("on", store.music); s.classList.toggle("on", store.sfx);
  $("music-icon").src = "assets/images/ui/emoji/" + (store.music ? "music_on.png" : "music_off.png");
  $("sfx-icon").src = "assets/images/ui/emoji/" + (store.sfx ? "sound_on.png" : "sound_off.png");
}

/* =========================================================================
   WIRING
   ========================================================================= */
function wire(){
  $("start-full").addEventListener("pointerup", e => { e.preventDefault(); Audio_.blip("click"); startGame("all"); });
  $("howto-btn").addEventListener("pointerup", e => { e.preventDefault(); Audio_.begin(); Audio_.blip("click"); openModal("howto-modal"); });
  $("menu-settings").addEventListener("pointerup", e => { e.preventDefault(); Audio_.begin(); Audio_.blip("click"); openModal("settings-modal"); });
  $("menu-settings-2").addEventListener("pointerup", e => { e.preventDefault(); Audio_.begin(); Audio_.blip("click"); openModal("settings-modal"); });
  $("game-settings").addEventListener("pointerup", e => { e.preventDefault(); Audio_.blip("click"); openModal("settings-modal"); });
  $("continue-btn").addEventListener("pointerup", e => { e.preventDefault(); continueDig(); });
  $("learn-btn").addEventListener("pointerup", e => { e.preventDefault(); Audio_.blip("click"); openModal("learn-modal"); });
  $("again-btn").addEventListener("pointerup", e => { e.preventDefault(); Audio_.blip("click"); startGame(currentMode); });
  $("tomenu-btn").addEventListener("pointerup", e => { e.preventDefault(); Audio_.blip("click"); renderZones(); show("menu"); });

  document.querySelectorAll("[data-close]").forEach(b => b.addEventListener("pointerup", e => { e.preventDefault(); Audio_.blip("click"); closeModal(b.closest(".modal")); }));
  document.querySelectorAll(".modal").forEach(m => m.addEventListener("pointerup", e => { if(e.target === m) closeModal(m); }));

  $("music-toggle").addEventListener("pointerup", e => { e.preventDefault(); Audio_.begin(); Audio_.setMusic(!store.music); syncToggles(); Audio_.blip("click"); });
  $("sfx-toggle").addEventListener("pointerup", e => { e.preventDefault(); Audio_.setSfx(!store.sfx); syncToggles(); Audio_.blip("click"); });

  syncToggles();
  renderZones();
}

/* =========================================================================
   AMBIENT JUNGLE SCENERY
   ========================================================================= */
function buildAmbient(){
  const amb = $("ambient");
  const arts = ["shrimp_exoskeleton","grasshopper","shield_bug","mosquito","limulus","mosquito_larva"];
  for(let i=0;i<6;i++){
    const d = document.createElement("div"); d.className = "drift";
    const size = 56 + Math.random()*80; d.style.width = d.style.height = size + "px";
    d.innerHTML = SPECIMEN_ART[arts[i % arts.length]];
    const dur = (40 + Math.random()*38).toFixed(0), delay = (-Math.random()*40).toFixed(0);
    d.style.top = (Math.random()*78) + "vh";
    d.style.animation = `${i%2 ? "driftB" : "driftA"} ${dur}s linear ${delay}s infinite`;
    amb.appendChild(d);
  }
  for(let i=0;i<20;i++){
    const m = document.createElement("div"); m.className = "firefly";
    m.style.left = (Math.random()*100) + "vw"; m.style.bottom = (-10 - Math.random()*10) + "vh";
    const dur = (10 + Math.random()*16).toFixed(1);
    m.style.animationDuration = dur + "s"; m.style.animationDelay = (-Math.random()*dur) + "s";
    m.style.transform = `scale(${(0.6 + Math.random()*1.4).toFixed(2)})`;
    amb.appendChild(m);
  }
  const vineL = document.createElement("div"); vineL.id = "vine-left";
  vineL.innerHTML = `<svg viewBox='0 0 80 400' width='100%' height='100%'><path d='M40 0 C10 60 70 120 30 180 C0 230 60 280 30 340 C10 370 40 390 40 400' stroke='${EMR}' stroke-width='6' fill='none' opacity='.6'/><circle cx='30' cy='180' r='10' fill='${EMR}' opacity='.5'/><circle cx='30' cy='340' r='8' fill='${EMR}' opacity='.5'/></svg>`;
  const vineR = document.createElement("div"); vineR.id = "vine-right"; vineR.innerHTML = vineL.innerHTML;
  amb.appendChild(vineL); amb.appendChild(vineR);
}

/* =========================================================================
   INPUT GUARDS (mobile): block zoom/scroll/context, keep taps working
   ========================================================================= */
function inputGuards(){
  document.addEventListener("gesturestart", e => e.preventDefault());
  document.addEventListener("gesturechange", e => e.preventDefault());
  document.addEventListener("dblclick", e => e.preventDefault(), { passive:false });
  document.addEventListener("contextmenu", e => e.preventDefault());
  document.addEventListener("touchmove", e => { if(!e.target.closest(".sheet") && !e.target.closest(".q-sheet") && !e.target.closest(".screen")) e.preventDefault(); }, { passive:false });
  let lastTouch = 0;
  document.addEventListener("touchend", e => { const now = Date.now(); if(now - lastTouch <= 300) e.preventDefault(); lastTouch = now; }, { passive:false });
}

/* =========================================================================
   BOOT
   ========================================================================= */
function tryBackgroundPhoto(){
  const img = new Image();
  img.onload = () => {
    const layer = $("bg-photo");
    layer.style.backgroundImage = `url('assets/images/background/canopy.jpg')`;
    layer.classList.add("show");
  };
  img.onerror = () => {}; // no drop-in photo: keep the CSS canopy gradient
  img.src = "assets/images/background/canopy.jpg";
}
function boot(){
  mountArt($("menu-crest"), "assets/images/characters/chest_closed.png", chestSVG("closed"));
  mountArt($("boot-crest"), "assets/images/characters/chest_closed.png", chestSVG("closed"));
  tryBackgroundPhoto();
  buildAmbient(); wire(); inputGuards();
  show("menu");
  const bar = $("boot-bar"), msg = $("boot-msg");
  const msgs = ["Charting the jungle map...","Sharpening the machete...","Polishing the treasure chests...","Ready, Explorer."];
  let p = 0, mi = 0;
  const t = setInterval(() => {
    p += 6 + Math.random()*10; if(p > 100) p = 100; bar.style.width = p + "%";
    const idx = Math.min(msgs.length-1, Math.floor(p/26)); if(idx !== mi){ mi = idx; msg.textContent = msgs[idx]; }
    if(p >= 100){ clearInterval(t); setTimeout(() => { $("boot").classList.add("hide"); setTimeout(() => $("boot").remove(), 650); }, 380); }
  }, 140);
}
window.addEventListener("DOMContentLoaded", boot);
