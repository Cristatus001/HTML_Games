/* =====================================================================
   NAME IT RIGHT! — Expedition Taxonomy
   Fully offline. All gameplay logic preserved from the original;
   packaging, theme, audio, mobile input and robustness upgraded.
===================================================================== */
(function () {
"use strict";

/* ---------- paths ---------- */
var EMOJI = "assets/images/ui/emoji/";
var CHARS = "assets/images/characters/";
var BG_IMG = "assets/images/background/jungle_bg.png";
var BGM_FILE = "assets/audio/bgm.mp3";

/* ---------- tiny helpers ---------- */
function $(id){ return document.getElementById(id); }
function el(tag, cls){ var e=document.createElement(tag); if(cls) e.className=cls; return e; }

/* Set an <img> src, with a graceful fallback if the primary file is missing.
   Lets users drop in custom art without breaking anything. */
function setImg(imgEl, primary, fallback){
  if(!imgEl) return;
  imgEl.onerror = function(){
    imgEl.onerror = null;
    if(fallback) imgEl.src = fallback;
    else imgEl.style.display = "none";
  };
  imgEl.src = primary;
}
function ico(name){ return EMOJI + name; }

/* =====================================================================
   SAFE STORAGE (WebViews may restrict localStorage)
===================================================================== */
var store = (function(){
  var mem = {};
  var ok = false;
  try { window.localStorage.setItem("__t","1"); window.localStorage.removeItem("__t"); ok = true; } catch(e){ ok = false; }
  return {
    get: function(k, d){
      try { var v = ok ? window.localStorage.getItem(k) : mem[k]; return v==null ? d : v; }
      catch(e){ return d; }
    },
    set: function(k, v){
      try { if(ok) window.localStorage.setItem(k, v); else mem[k]=String(v); } catch(e){ mem[k]=String(v); }
    }
  };
})();

/* =====================================================================
   GAME STATE
===================================================================== */
var currentState = { score: 0, level: 1, maxLevels: 5 };
var progress = { unlocked: parseInt(store.get("nir_unlocked","1"),10) || 1 };

var settings = {
  music: store.get("nir_music","1") !== "0",
  sound: store.get("nir_sound","1") !== "0"
};

/* =====================================================================
   LEVEL DATA (identical content to original)
===================================================================== */
var levels = [
  {}, // index 0 unused
  {
    type:'drag', title:'Site 1: Build the Name',
    instruction:'Assemble the correct scientific name for the Mango — Genus, species, and Author.',
    character:'Veer', role:'Field Biologist', avatar:'avatar_biologist',
    dialogue:'We found a Mango tree! By binomial nomenclature we need the Genus, species, and Author.',
    correctOrder:['Mangifera','indica','Linn.'],
    items:['indica','Mangifera','Indica','Linn.','Lam.','mangifera']
  },
  {
    type:'choice', title:'Site 2: Spot the Rule Breaker',
    instruction:'Select the ONLY correctly written scientific name.',
    character:'Teja', role:'Taxonomy Expert', avatar:'avatar_expert',
    dialogue:'Look closely at capitalisation and italics. Only one of these is valid for the registry.',
    options:[
      { text:'mangifera Indica', valid:false, italic:true,  reason:'Genus must be capitalised, species lowercase.' },
      { text:'Mangifera Indica', valid:false, italic:true,  reason:'Species epithet must be lowercase.' },
      { text:'Mangifera indica', valid:true,  italic:true,  reason:'Correct! Capital Genus, lowercase species, italicised.' },
      { text:'Mangifera indica', valid:false, italic:false, reason:'Scientific names must be italicised when printed.' }
    ]
  },
  {
    type:'handwriting', title:'Site 3: Field Notebook',
    instruction:'Underline the words correctly for a handwritten report.',
    character:'Veer', role:'Field Biologist', avatar:'avatar_biologist',
    dialogue:'When writing by hand we cannot italicise. How do we show it is a scientific name?',
    words:['Homo','sapiens']
  },
  {
    type:'match', title:'Site 4: Author Attribution',
    instruction:'Select the name with the correct Author Citation for the Mango.',
    character:'Teja', role:'Taxonomy Expert', avatar:'avatar_expert',
    dialogue:'Carolus Linnaeus described the Mango first. His name is abbreviated at the end.',
    options:[
      { text:'Mangifera indica Linn.',   valid:true,  reason:"Correct! 'Linn.' is the standard abbreviation for Carolus Linnaeus, who first described the mango." },
      { text:'Mangifera indica Roxb.',   valid:false, reason:"'Roxb.' abbreviates Roxburgh — not the author who first described the mango." },
      { text:'Mangifera indica Lam.',    valid:false, reason:"'Lam.' abbreviates Lamarck — an incorrect author citation for this species." },
      { text:'Mangifera indica (Linn.)', valid:false, reason:'Parentheses around the author signal a later reclassification. The accepted citation here is Linn. without brackets.' }
    ]
  },
  {
    type:'input', title:'Site 5: Name a New Species',
    character:'Head Scientist', role:'Expedition Lead', avatar:'avatar_lead',
    scenarios:[
      { instruction:'A new Mango species is discovered in Kerala. Assign it the species epithet "keralensis".',
        dialogue:'A new Mango from Kerala! Type the FULL scientific name (Genus + species). Remember your casing rules!',
        genus:'Mangifera', targetSpecies:'keralensis' },
      { instruction:'A new Brinjal species is discovered in Bengal. The Genus is Solanum — assign the epithet "bengalense".',
        dialogue:'A new Brinjal from Bengal! Its Genus is Solanum. Type the FULL scientific name with correct capitalisation.',
        genus:'Solanum', targetSpecies:'bengalense' }
    ]
  }
];
var LEVEL_SHORT = ['', 'Build', 'Rule Breaker', 'Notebook', 'Author', 'New Species'];

/* =====================================================================
   DOM refs
===================================================================== */
var gameArea, scoreDisplay, levelDisplay;

/* =====================================================================
   AUDIO ENGINE  (procedural, offline; optional bgm.mp3 override)
===================================================================== */
var Audio2 = (function(){
  var ctx=null, master=null, musicGain=null, sfxGain=null;
  var padNodes=[], lfo=null, arpTimer=null;
  var htmlBgm=null, useFile=false, started=false, musicPlaying=false;

  function ensure(){
    if(ctx) return;
    var AC = window.AudioContext || window.webkitAudioContext;
    if(!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
    musicGain = ctx.createGain(); musicGain.gain.value = settings.music ? 0.22 : 0; musicGain.connect(master);
    sfxGain = ctx.createGain(); sfxGain.gain.value = settings.sound ? 0.6 : 0; sfxGain.connect(master);
  }

  /* try to use an external bgm file if present */
  function probeFile(){
    htmlBgm = new Audio();
    htmlBgm.loop = true; htmlBgm.preload = "auto"; htmlBgm.volume = settings.music ? 0.5 : 0;
    htmlBgm.addEventListener("canplaythrough", function(){ useFile = true; }, { once:true });
    htmlBgm.addEventListener("error", function(){ useFile = false; });
    htmlBgm.src = BGM_FILE;
  }

  function startPad(){
    if(!ctx || padNodes.length) return;
    var freqs = [110, 164.81, 220]; // A, E, A — calm drone
    var pf = ctx.createBiquadFilter(); pf.type="lowpass"; pf.frequency.value=650; pf.Q.value=0.7; pf.connect(musicGain);
    freqs.forEach(function(f, i){
      var o = ctx.createOscillator(); o.type = i===2 ? "triangle" : "sawtooth";
      o.frequency.value = f; o.detune.value = (i-1)*6;
      var g = ctx.createGain(); g.gain.value = 0.12;
      o.connect(g); g.connect(pf); o.start();
      padNodes.push(o); padNodes.push(g);
    });
    lfo = ctx.createOscillator(); lfo.frequency.value = 0.06;
    var lg = ctx.createGain(); lg.gain.value = 180;
    lfo.connect(lg); lg.connect(pf.frequency); lfo.start();
    padNodes.push(lfo);

    // gentle wandering "bird/marimba" notes
    var scale=[220,246.94,277.18,329.63,369.99,440];
    arpTimer = setInterval(function(){
      if(!musicPlaying || useFile) return;
      if(Math.random() < 0.6){
        var f = scale[Math.floor(Math.random()*scale.length)];
        blip(f, 0.06, "sine", 1.1);
      }
    }, 1300);
  }

  function blip(freq, vol, type, dur){
    if(!ctx) return;
    var o=ctx.createOscillator(); o.type=type||"sine"; o.frequency.value=freq;
    var g=ctx.createGain(); g.gain.value=0;
    o.connect(g); g.connect(musicGain);
    var t=ctx.currentTime;
    g.gain.linearRampToValueAtTime(vol, t+0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t+(dur||1));
    o.start(t); o.stop(t+(dur||1)+0.05);
  }

  function startMusic(){
    ensure(); if(!ctx) return;
    if(ctx.state==="suspended") ctx.resume();
    musicPlaying = true;
    if(useFile && htmlBgm){
      htmlBgm.volume = settings.music ? 0.5 : 0;
      if(settings.music){ var p=htmlBgm.play(); if(p&&p.catch) p.catch(function(){}); }
    } else {
      startPad();
    }
    applyMusicSetting();
  }

  function applyMusicSetting(){
    if(!ctx) return;
    if(musicGain) musicGain.gain.setTargetAtTime(settings.music?0.22:0, ctx.currentTime, 0.15);
    if(htmlBgm){
      htmlBgm.volume = settings.music ? 0.5 : 0;
      if(settings.music && useFile && musicPlaying){ var p=htmlBgm.play(); if(p&&p.catch) p.catch(function(){}); }
    }
  }
  function applySoundSetting(){
    if(sfxGain && ctx) sfxGain.gain.setTargetAtTime(settings.sound?0.6:0, ctx.currentTime, 0.05);
  }

  /* SFX */
  function sfx(kind){
    if(!settings.sound) return;
    ensure(); if(!ctx) return;
    if(ctx.state==="suspended") ctx.resume();
    var t=ctx.currentTime;
    function tone(f, start, dur, type, vol){
      var o=ctx.createOscillator(); o.type=type||"sine"; o.frequency.value=f;
      var g=ctx.createGain(); g.gain.value=0; o.connect(g); g.connect(sfxGain);
      g.gain.linearRampToValueAtTime(vol||0.5, t+start+0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t+start+dur);
      o.start(t+start); o.stop(t+start+dur+0.02);
    }
    if(kind==="click"){ tone(520,0,0.09,"square",0.28); }
    else if(kind==="place"){ tone(360,0,0.08,"triangle",0.3); tone(540,0.05,0.09,"triangle",0.22); }
    else if(kind==="success"){ tone(523.25,0,0.16,"triangle",0.4); tone(659.25,0.12,0.16,"triangle",0.4); tone(783.99,0.24,0.28,"triangle",0.4); }
    else if(kind==="fail"){ tone(311.13,0,0.18,"sawtooth",0.3); tone(233.08,0.14,0.28,"sawtooth",0.3); }
    else if(kind==="win"){ [523.25,659.25,783.99,1046.5].forEach(function(f,i){ tone(f,i*0.13,0.35,"triangle",0.4); }); }
  }

  function firstGesture(){
    if(started) return; started=true;
    ensure(); probeFile();
    // small delay to let the file probe resolve before we choose a source
    setTimeout(startMusic, 350);
  }

  return {
    firstGesture: firstGesture,
    sfx: sfx,
    setMusic: function(on){ settings.music=on; store.set("nir_music", on?"1":"0"); applyMusicSetting(); if(on && started) startMusic(); },
    setSound: function(on){ settings.sound=on; store.set("nir_sound", on?"1":"0"); applySoundSetting(); }
  };
})();

/* =====================================================================
   PARTICLE BURSTS (juice)
===================================================================== */
var fx = (function(){
  var canvas, ctx, parts=[], raf=null;
  function init(){
    canvas=$("fx"); ctx=canvas.getContext("2d"); resize();
    window.addEventListener("resize", resize);
  }
  function resize(){ if(!canvas) return; canvas.width=innerWidth; canvas.height=innerHeight; }
  function burst(x,y,good){
    var n=28;
    for(var i=0;i<n;i++){
      var a=Math.random()*Math.PI*2, sp=2+Math.random()*6;
      parts.push({x:x,y:y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-2,life:1,
        color: good ? (Math.random()<0.5?"#7ed957":"#f6c945") : "#e15b4c",
        size:4+Math.random()*5, rot:Math.random()*6, vr:(Math.random()-0.5)*0.4});
    }
    if(!raf) loop();
  }
  function loop(){
    raf=requestAnimationFrame(loop);
    ctx.clearRect(0,0,canvas.width,canvas.height);
    for(var i=parts.length-1;i>=0;i--){
      var p=parts[i];
      p.vy+=0.18; p.x+=p.vx; p.y+=p.vy; p.life-=0.018; p.rot+=p.vr;
      if(p.life<=0){ parts.splice(i,1); continue; }
      ctx.save(); ctx.globalAlpha=Math.max(0,p.life); ctx.translate(p.x,p.y); ctx.rotate(p.rot);
      ctx.fillStyle=p.color;
      ctx.beginPath();
      ctx.ellipse(0,0,p.size,p.size*0.6,0,0,Math.PI*2); ctx.fill();
      ctx.restore();
    }
    if(!parts.length){ cancelAnimationFrame(raf); raf=null; ctx.clearRect(0,0,canvas.width,canvas.height); }
  }
  return { init:init, burst:burst };
})();

function burstAt(target, good){
  var r = (target && target.getBoundingClientRect) ? target.getBoundingClientRect() : {left:innerWidth/2,top:innerHeight/2,width:0,height:0};
  fx.burst(r.left + r.width/2, r.top + r.height/2, good);
}

/* =====================================================================
   AMBIENT BACKGROUND (drifting leaves + fireflies)
===================================================================== */
(function ambient(){
  var canvas, ctx, leaves=[], flies=[], W, H;
  function start(){
    canvas=$("bg-canvas"); ctx=canvas.getContext("2d"); resize();
    window.addEventListener("resize", resize);
    for(var i=0;i<14;i++) leaves.push(newLeaf(true));
    for(var j=0;j<22;j++) flies.push(newFly());
    requestAnimationFrame(loop);
  }
  function resize(){ W=canvas.width=innerWidth; H=canvas.height=innerHeight; }
  function newLeaf(rand){
    return { x:Math.random()*W, y:rand?Math.random()*H:-20,
      s:8+Math.random()*14, vy:0.3+Math.random()*0.7, vx:(Math.random()-0.5)*0.5,
      rot:Math.random()*6, vr:(Math.random()-0.5)*0.03, hue:Math.random()<0.5?"#3e8e41":"#5fae4e", a:0.35+Math.random()*0.3 };
  }
  function newFly(){ return { x:Math.random()*W, y:Math.random()*H, ph:Math.random()*Math.PI*2, sp:0.005+Math.random()*0.02, r:1.5+Math.random()*2 }; }
  function leafPath(p){
    ctx.beginPath();
    ctx.moveTo(0,-p.s);
    ctx.bezierCurveTo(p.s*0.8,-p.s*0.4, p.s*0.6,p.s*0.7, 0,p.s);
    ctx.bezierCurveTo(-p.s*0.6,p.s*0.7, -p.s*0.8,-p.s*0.4, 0,-p.s);
    ctx.closePath();
  }
  function loop(){
    requestAnimationFrame(loop);
    ctx.clearRect(0,0,W,H);
    // fireflies
    for(var j=0;j<flies.length;j++){
      var f=flies[j]; f.ph+=f.sp; f.x+=Math.sin(f.ph)*0.4; f.y+=Math.cos(f.ph*0.7)*0.3;
      var glow=0.35+0.35*Math.sin(f.ph*3);
      var g=ctx.createRadialGradient(f.x,f.y,0,f.x,f.y,f.r*6);
      g.addColorStop(0,"rgba(246,225,120,"+glow+")"); g.addColorStop(1,"rgba(246,225,120,0)");
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(f.x,f.y,f.r*6,0,Math.PI*2); ctx.fill();
    }
    // leaves
    for(var i=0;i<leaves.length;i++){
      var p=leaves[i]; p.y+=p.vy; p.x+=p.vx+Math.sin(p.y*0.01)*0.4; p.rot+=p.vr;
      if(p.y>H+30){ leaves[i]=newLeaf(false); continue; }
      ctx.save(); ctx.globalAlpha=p.a; ctx.translate(p.x,p.y); ctx.rotate(p.rot);
      ctx.fillStyle=p.hue; leafPath(p); ctx.fill();
      ctx.strokeStyle="rgba(20,60,25,.5)"; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(0,-p.s); ctx.lineTo(0,p.s); ctx.stroke();
      ctx.restore();
    }
  }
  window.__startAmbient = start;
})();

/* =====================================================================
   SCREEN MANAGEMENT
===================================================================== */
function show(screenId){
  ['menu','levelselect','game-screen','victory'].forEach(function(id){ $(id).classList.add('hidden'); });
  $(screenId).classList.remove('hidden');
  $('hud').classList.toggle('hidden', !(screenId==='game-screen'));
}

/* =====================================================================
   GAME ENGINE
===================================================================== */
function startExpedition(fromLevel){
  currentState.score = 0;
  scoreDisplay.textContent = "0";
  loadLevel(fromLevel || 1);
  show('game-screen');
}

function loadLevel(levelNum){
  currentState.level = levelNum;
  levelDisplay.textContent = levelNum;
  gameArea.innerHTML = '';

  var data = levels[levelNum];
  /* levels with multiple scenarios pick one at random for replay variety */
  if(data.scenarios){ data = Object.assign({}, data, data.scenarios[Math.floor(Math.random()*data.scenarios.length)]); }

  /* character card */
  var charBox = el('div','character-box');
  var av = el('div','avatar');
  var avImg = el('img');
  av.appendChild(avImg);
  setImg(avImg, CHARS + data.avatar + ".png", EMOJI + data.avatar + ".png");
  var txt = el('div');
  var nm = el('div','char-name'); nm.textContent = data.character + " · " + data.role;
  var dl = el('div','dialogue'); dl.textContent = '"' + data.dialogue + '"';
  txt.appendChild(nm); txt.appendChild(dl);
  charBox.appendChild(av); charBox.appendChild(txt);
  gameArea.appendChild(charBox);

  var title = el('h2','level-title'); title.textContent = data.title; gameArea.appendChild(title);
  var instr = el('p','instruction'); instr.textContent = data.instruction; gameArea.appendChild(instr);

  var space = el('div'); space.id='active-game-space'; gameArea.appendChild(space);
  var fb = el('div'); fb.id='feedback-area'; gameArea.appendChild(fb);

  if(data.type==='drag') renderDragLevel(space, data);
  else if(data.type==='choice') renderChoiceLevel(space, data);
  else if(data.type==='handwriting') renderHandwritingLevel(space, data);
  else if(data.type==='match') renderMatchLevel(space, data);
  else if(data.type==='input') renderInputLevel(space, data);

  $('game-screen').scrollTop = 0;
}

/* ---------- LEVEL 1: build the name ----------
   Real drag-and-drop (pointer based, works on touch + mouse):
   press a word, it follows your finger/cursor, drop it on a slot.
   Also supports quick tap-to-place as a fallback.                 */
var pickedChip = null;
var drag = { chip:null, ghost:null, moved:false, sx:0, sy:0, pid:null, lastZone:null };
var THRESH = 6; // px before a press becomes a drag

function renderDragLevel(container, data){
  container.innerHTML = '';
  var zonesWrap = el('div','drop-zone-container');
  var slots = [
    { type:'genus',   label:'Genus' },
    { type:'species', label:'species' },
    { type:'author',  label:'Author' }
  ];
  slots.forEach(function(s){
    var z = el('div','drop-zone'); z.dataset.type=s.type; z.dataset.value='';
    var lab = el('span','slot-label'); lab.textContent = '['+s.label+']';
    z.appendChild(lab);
    z.addEventListener('pointerup', function(){ if(!drag.moved) onSlotTap(z); });
    zonesWrap.appendChild(z);
  });
  container.appendChild(zonesWrap);

  var hint = el('p','drag-hint'); hint.textContent = 'Drag a word into a slot — or tap a word, then tap a slot.';
  container.appendChild(hint);

  var bank = el('div','word-bank'); bank.id='word-bank';
  data.items.forEach(function(item, i){
    var chip = el('div','word-chip'); chip.textContent=item; chip.dataset.word=item; chip.dataset.id='chip-'+i;
    chip.addEventListener('pointerdown', function(e){ startDrag(e, chip); });
    bank.appendChild(chip);
  });
  container.appendChild(bank);

  var submit = el('button','btn green'); submit.textContent='Register Name';
  submit.addEventListener('pointerup', checkDragAnswer);
  container.appendChild(submit);

  pickedChip = null;
  drag.chip = null; drag.moved = false;
}

/* --- pointer drag engine --- */
function startDrag(e, chip){
  if(chip.classList.contains('placed')) return;
  Audio2.firstGesture();
  drag.chip = chip; drag.moved = false; drag.pid = e.pointerId;
  drag.sx = e.clientX; drag.sy = e.clientY; drag.lastZone = null;
  try { chip.setPointerCapture(e.pointerId); } catch(err){}
  chip.addEventListener('pointermove', onDragMove);
  chip.addEventListener('pointerup', onDragEnd);
  chip.addEventListener('pointercancel', onDragEnd);
  e.preventDefault();
}
function onDragMove(e){
  if(!drag.chip) return;
  var dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
  if(!drag.moved && (dx*dx + dy*dy) > THRESH*THRESH){
    // promote to an actual drag
    drag.moved = true;
    drag.chip.classList.add('dragging');
    drag.ghost = el('div','drag-ghost'); drag.ghost.textContent = drag.chip.dataset.word;
    document.body.appendChild(drag.ghost);
  }
  if(drag.moved){
    drag.ghost.style.left = e.clientX + 'px';
    drag.ghost.style.top  = e.clientY + 'px';
    var z = zoneUnder(e.clientX, e.clientY);
    if(z !== drag.lastZone){
      if(drag.lastZone) drag.lastZone.classList.remove('target-hover');
      if(z) z.classList.add('target-hover');
      drag.lastZone = z;
    }
    e.preventDefault();
  }
}
function onDragEnd(e){
  var chip = drag.chip; if(!chip) return;
  chip.removeEventListener('pointermove', onDragMove);
  chip.removeEventListener('pointerup', onDragEnd);
  chip.removeEventListener('pointercancel', onDragEnd);
  try { chip.releasePointerCapture(drag.pid); } catch(err){}

  if(drag.moved){
    var z = zoneUnder(e.clientX, e.clientY);
    if(drag.ghost){ drag.ghost.remove(); drag.ghost = null; }
    if(drag.lastZone){ drag.lastZone.classList.remove('target-hover'); drag.lastZone = null; }
    chip.classList.remove('dragging');
    if(z){ pickedChip = chip; placeInSlot(z); }
    // dropped outside any slot -> just returns to the bank (nothing to do)
    // keep drag.moved true briefly so the slot's own pointerup is ignored
    setTimeout(function(){ drag.moved = false; }, 0);
  } else {
    // treated as a tap -> select/deselect
    drag.moved = false;
    onChipTap(chip);
  }
  drag.chip = null;
}
/* returns the .drop-zone under a screen point, ignoring the ghost (pointer-events:none) */
function zoneUnder(x, y){
  var elu = document.elementFromPoint(x, y);
  return elu ? elu.closest('.drop-zone') : null;
}

/* --- tap-to-place fallback --- */
function onChipTap(chip){
  Audio2.sfx('click');
  if(chip.classList.contains('placed')) return;
  if(pickedChip===chip){ chip.classList.remove('selected'); pickedChip=null; clearSlotTargets(); return; }
  if(pickedChip) pickedChip.classList.remove('selected');
  pickedChip = chip; chip.classList.add('selected');
  document.querySelectorAll('.drop-zone').forEach(function(z){ z.classList.add('target'); });
}
function onSlotTap(zone){
  Audio2.firstGesture();
  if(zone.dataset.value && !pickedChip){ returnSlot(zone); Audio2.sfx('click'); return; }
  if(!pickedChip) return;
  placeInSlot(zone);
}
function clearSlotTargets(){
  document.querySelectorAll('.drop-zone').forEach(function(z){ z.classList.remove('target'); });
}
/* shared placement used by both drag-drop and tap-to-place */
function placeInSlot(zone){
  if(!pickedChip) return;
  if(zone.dataset.value) returnSlot(zone); // swap out whatever was there
  var word = pickedChip.dataset.word;
  zone.dataset.value = word;
  zone.dataset.chip = pickedChip.dataset.id;
  zone.innerHTML='';
  var span = el('span'); span.textContent = word; zone.appendChild(span);
  zone.classList.add('filled');
  pickedChip.classList.add('placed');
  pickedChip.classList.remove('selected');
  pickedChip = null;
  clearSlotTargets();
  Audio2.sfx('place');
}
function returnSlot(zone){
  var chipId = zone.dataset.chip;
  if(chipId){ var c=document.querySelector('[data-id="'+chipId+'"]'); if(c){ c.classList.remove('placed'); } }
  zone.dataset.value=''; zone.dataset.chip='';
  zone.classList.remove('filled');
  var lab = el('span','slot-label');
  var type = zone.dataset.type;
  lab.textContent = '['+(type==='genus'?'Genus':type==='species'?'species':'Author')+']';
  zone.innerHTML=''; zone.appendChild(lab);
}
function checkDragAnswer(){
  var zones = document.querySelectorAll('.drop-zone');
  var g = zones[0].dataset.value, s = zones[1].dataset.value, a = zones[2].dataset.value;
  if(g==='Mangifera' && s==='indica' && a==='Linn.'){
    handleSuccess("Perfect! Genus capitalised, species lowercase, Author cited.");
  } else {
    var msg = "Check the rules: ";
    if(g!=='Mangifera') msg += "is the Genus capitalised? ";
    if(s!=='indica') msg += "is the species lowercase? ";
    if(a!=='Linn.') msg += "is the Author correct? ";
    handleFail(msg);
  }
}

/* ---------- LEVEL 2: choice ---------- */
var optionLocked = false; // set once the correct card is chosen (sites 2 & 4)
function renderChoiceLevel(container, data){
  optionLocked = false;
  container.innerHTML='';
  var grid = el('div','options-grid');
  data.options.forEach(function(opt){
    var card = el('div','option-card');
    card.style.fontStyle = opt.italic ? 'italic' : 'normal';
    card.textContent = opt.text;
    card.addEventListener('pointerup', function(){ checkChoiceAnswer(opt, card); });
    grid.appendChild(card);
  });
  container.appendChild(grid);
}
function checkChoiceAnswer(opt, card){
  if(optionLocked) return;
  Audio2.firstGesture();
  if(opt.valid){ card.classList.add('correct'); lockGrid(card); handleSuccess(opt.reason); }
  else { card.classList.add('wrong'); handleFail(opt.reason); }
}

/* once the right card is chosen, block any further interaction on that grid */
function lockGrid(card){
  optionLocked = true;
  var grid = card.closest('.options-grid');
  if(!grid) return;
  grid.style.pointerEvents = 'none';
  grid.querySelectorAll('.option-card').forEach(function(c){ if(c !== card) c.classList.add('dim'); });
}

/* ---------- LEVEL 3: handwriting ---------- */
function renderHandwritingLevel(container, data){
  container.innerHTML='';
  var nb = el('div','notebook');
  var area = el('div','handwritten-area');
  data.words.forEach(function(w, i){
    var span = el('span','handwritten-word'); span.textContent=w; span.dataset.k = i;
    span.addEventListener('pointerup', function(){ Audio2.firstGesture(); Audio2.sfx('click'); span.classList.toggle('underlined'); });
    area.appendChild(span);
  });
  var tip = el('p','tip'); tip.textContent='Tip: in handwriting, underline the Genus and species separately.';
  nb.appendChild(area); nb.appendChild(tip);
  container.appendChild(nb);
  var submit = el('button','btn green'); submit.textContent='Submit Notebook';
  submit.addEventListener('pointerup', function(){
    var words = container.querySelectorAll('.handwritten-word');
    var all = true; words.forEach(function(w){ if(!w.classList.contains('underlined')) all=false; });
    if(all) handleSuccess("Correct! Each word underlined separately.");
    else handleFail("Both words must be underlined separately.");
  });
  container.appendChild(submit);
}

/* ---------- LEVEL 4: match ---------- */
function renderMatchLevel(container, data){
  optionLocked = false;
  container.innerHTML='';
  var grid = el('div','options-grid');
  data.options.forEach(function(opt){
    var card = el('div','option-card'); card.style.fontStyle='italic'; card.textContent=opt.text;
    card.addEventListener('pointerup', function(){
      if(optionLocked) return;
      Audio2.firstGesture();
      if(opt.valid){ card.classList.add('correct'); lockGrid(card); handleSuccess(opt.reason || "Correct! 'Linn.' is the standard abbreviation for Linnaeus."); }
      else { card.classList.add('wrong'); handleFail(opt.reason || "Incorrect. Author citation rules are specific."); }
    });
    grid.appendChild(card);
  });
  container.appendChild(grid);
}

/* ---------- LEVEL 5: input ---------- */
function renderInputLevel(container, data){
  container.innerHTML='';
  var wrap = el('div'); wrap.style.margin='16px 0';
  var input = el('input','name-input'); input.type='text'; input.id='species-input';
  input.setAttribute('placeholder','Type full name here…'); input.autocomplete='off';
  input.setAttribute('autocapitalize','off'); input.setAttribute('autocorrect','off'); input.spellcheck=false;
  wrap.appendChild(input);
  container.appendChild(wrap);
  var submit = el('button','btn green'); submit.textContent='Register Species';
  submit.addEventListener('pointerup', function(){ checkInputAnswer(data.genus, data.targetSpecies); });
  container.appendChild(submit);
  input.addEventListener('keydown', function(e){ if(e.key==='Enter'){ e.preventDefault(); checkInputAnswer(data.genus, data.targetSpecies); } });
  setTimeout(function(){ try{ input.focus(); }catch(e){} }, 50);
}
function checkInputAnswer(genus, species){
  Audio2.firstGesture();
  var input = ($('species-input').value || '').trim();
  var correct = genus + ' ' + species;
  if(input === correct){ handleSuccess("New species registered: " + correct + "."); }
  else if(input.toLowerCase() === correct.toLowerCase()){ handleFail("Spelling is right, but check your capitalisation!"); }
  else if(input.indexOf(genus) === 0 && input.indexOf(' ') === -1){ handleFail("Don't forget the space between Genus and species."); }
  else { handleFail("Try again. Format: " + genus + " [species-epithet] (lowercase)."); }
}

/* =====================================================================
   FLOW HELPERS
===================================================================== */
var answered = false;
function handleSuccess(msg){
  if(answered) return; answered = true;
  var fb = $('feedback-area'); fb.innerHTML='';
  var line = el('div','fb-line success');
  var img = el('img'); setImg(img, ico('check.png')); line.appendChild(img);
  var span = el('span'); span.textContent = msg; line.appendChild(span);
  fb.appendChild(line);

  currentState.score += 10;
  scoreDisplay.textContent = currentState.score;
  Audio2.sfx('success');
  burstAt(line, true);

  // unlock next site
  if(currentState.level + 1 > progress.unlocked && currentState.level < currentState.maxLevels){
    progress.unlocked = currentState.level + 1;
    store.set('nir_unlocked', progress.unlocked);
  }

  setTimeout(function(){
    if(currentState.level < currentState.maxLevels){
      var next = el('button','btn');
      var ai = el('img'); setImg(ai, ico('arrow_right.png')); next.appendChild(ai);
      var t = document.createTextNode('Next Site'); next.appendChild(t);
      next.addEventListener('pointerup', function(){ answered=false; loadLevel(currentState.level+1); });
      fb.appendChild(next);
    } else {
      progress.unlocked = currentState.maxLevels; store.set('nir_unlocked', progress.unlocked);
      showVictory();
    }
  }, 900);
}
function handleFail(msg){
  var fb = $('feedback-area'); fb.innerHTML='';
  var line = el('div','fb-line fail');
  var img = el('img'); setImg(img, ico('cross.png')); line.appendChild(img);
  var span = el('span'); span.textContent = msg; line.appendChild(span);
  fb.appendChild(line);
  Audio2.sfx('fail');
  burstAt(line, false);
}

function showVictory(){
  Audio2.sfx('win');
  var v = $('victory');
  v.innerHTML='';
  var box = el('div','badge-container');
  var tImg = el('img','trophy-big'); setImg(tImg, ico('trophy.png')); box.appendChild(tImg);
  var h = el('h1'); h.textContent='Expedition Complete!'; box.appendChild(h);
  var h3 = el('h3'); h3.textContent='You are now a Master Taxonomist.'; box.appendChild(h3);
  var fs = el('p','final-score'); fs.textContent='Discovery Points: ' + currentState.score; box.appendChild(fs);

  var row = el('div'); row.style.marginTop='14px';
  var learn = el('button','btn ghost');
  var li = el('img'); setImg(li, ico('book.png')); learn.appendChild(li);
  learn.appendChild(document.createTextNode('Learn More'));
  learn.addEventListener('pointerup', function(){ openModal('learn-modal'); });
  var again = el('button','btn green');
  var pi = el('img'); setImg(pi, ico('play.png')); again.appendChild(pi);
  again.appendChild(document.createTextNode('Play Again'));
  again.addEventListener('pointerup', function(){ answered=false; startExpedition(1); });
  var camp = el('button','btn ghost'); camp.textContent='Back to Camp';
  camp.addEventListener('pointerup', function(){ answered=false; show('menu'); });
  row.appendChild(again); row.appendChild(learn); row.appendChild(camp);
  box.appendChild(row);

  v.appendChild(box);
  show('victory');
  // celebratory bursts
  setTimeout(function(){ fx.burst(innerWidth*0.3, innerHeight*0.4, true); }, 100);
  setTimeout(function(){ fx.burst(innerWidth*0.7, innerHeight*0.35, true); }, 300);
  setTimeout(function(){ fx.burst(innerWidth*0.5, innerHeight*0.5, true); }, 500);
}

/* =====================================================================
   LEVEL SELECT
===================================================================== */
function buildLevelSelect(){
  var grid = $('levels-grid'); grid.innerHTML='';
  for(var i=1;i<=currentState.maxLevels;i++){
    (function(n){
      var unlocked = n <= progress.unlocked;
      var done = n < progress.unlocked;
      var card = el('div','level-card' + (unlocked?'':' locked'));
      var num = el('div','lnum'); num.textContent = n; card.appendChild(num);
      var name = el('div','lname'); name.textContent = LEVEL_SHORT[n]; card.appendChild(name);
      var st = el('div','lstate'); var im = el('img');
      setImg(im, ico(done ? 'badge_leaf.png' : unlocked ? 'magnifier.png' : 'lock.png'));
      st.appendChild(im); card.appendChild(st);
      if(unlocked){
        card.addEventListener('pointerup', function(){
          Audio2.firstGesture(); Audio2.sfx('click');
          answered=false; currentState.score = currentState.score || 0;
          scoreDisplay.textContent = currentState.score;
          loadLevel(n); show('game-screen');
        });
      }
      grid.appendChild(card);
    })(i);
  }
}

/* =====================================================================
   MODALS
===================================================================== */
function openModal(id){ $(id).classList.remove('hidden'); }
function closeModal(id){ $(id).classList.add('hidden'); }

/* =====================================================================
   SETTINGS TOGGLES
===================================================================== */
function refreshToggles(){
  $('tog-music').classList.toggle('on', settings.music);
  $('tog-sound').classList.toggle('on', settings.sound);
  setImg($('set-music-ico'), ico(settings.music?'music_on.png':'music_off.png'));
  setImg($('set-sound-ico'), ico(settings.sound?'sound_on.png':'sound_off.png'));
}

/* =====================================================================
   INIT
===================================================================== */
function wireStaticImages(){
  setImg($('boot-logo'), ico('leaf.png'));
  setImg($('menu-logo'), ico('leaf.png'));
  setImg($('hud-leaf'), ico('leaf.png'));
  setImg($('hud-seed'), ico('seed.png'));
  setImg($('ico-settings'), ico('compass.png'));
  setImg($('ico-settings2'), ico('compass.png'));
  setImg($('ico-menu-book'), ico('book.png'));
  setImg($('ico-howto'), ico('magnifier.png'));
  setImg($('ico-play'), ico('play.png'));
  refreshToggles();
}

function tryBackgroundImage(){
  var probe = new Image();
  probe.onload = function(){
    var bg = $('bg-image');
    bg.style.backgroundImage = "url('" + BG_IMG + "')";
    bg.style.opacity = "1";
  };
  probe.onerror = function(){ /* keep CSS/canvas ambient background */ };
  probe.src = BG_IMG;
}

function bindEvents(){
  // menu
  $('btn-play').addEventListener('pointerup', function(){ Audio2.firstGesture(); Audio2.sfx('click'); answered=false; startExpedition(1); });
  $('btn-levels').addEventListener('pointerup', function(){ Audio2.firstGesture(); Audio2.sfx('click'); buildLevelSelect(); show('levelselect'); });
  $('btn-howto').addEventListener('pointerup', function(){ Audio2.firstGesture(); Audio2.sfx('click'); openModal('howto-modal'); });
  $('btn-settings-menu').addEventListener('pointerup', function(){ Audio2.firstGesture(); Audio2.sfx('click'); refreshToggles(); openModal('settings-modal'); });
  $('btn-ls-back').addEventListener('pointerup', function(){ Audio2.sfx('click'); show('menu'); });

  // hud
  $('btn-settings-hud').addEventListener('pointerup', function(){ Audio2.sfx('click'); refreshToggles(); openModal('settings-modal'); });
  $('btn-menu-hud').addEventListener('pointerup', function(){ Audio2.sfx('click'); show('menu'); });

  // modal close buttons
  document.querySelectorAll('[data-close]').forEach(function(b){
    b.addEventListener('pointerup', function(){ Audio2.sfx('click'); closeModal(b.getAttribute('data-close')); });
  });
  // click outside modal closes
  document.querySelectorAll('.overlay').forEach(function(ov){
    ov.addEventListener('pointerup', function(e){ if(e.target===ov) closeModal(ov.id); });
  });

  // toggles
  $('tog-music').addEventListener('pointerup', function(){ var on=!settings.music; Audio2.setMusic(on); refreshToggles(); Audio2.sfx('click'); });
  $('tog-sound').addEventListener('pointerup', function(){ var on=!settings.sound; Audio2.setSound(on); refreshToggles(); if(on) Audio2.sfx('click'); });

  // start audio on any first interaction (autoplay policy)
  var kick = function(){ Audio2.firstGesture(); window.removeEventListener('pointerdown', kick); window.removeEventListener('keydown', kick); };
  window.addEventListener('pointerdown', kick);
  window.addEventListener('keydown', kick);
}

/* prevent pinch-zoom / double-tap zoom / gesture scroll in WebView */
function lockGestures(){
  document.addEventListener('gesturestart', function(e){ e.preventDefault(); }, { passive:false });
  document.addEventListener('dblclick', function(e){ e.preventDefault(); }, { passive:false });
  document.addEventListener('touchmove', function(e){ if(e.touches && e.touches.length>1) e.preventDefault(); }, { passive:false });
  var lastTouch=0;
  document.addEventListener('touchend', function(e){ var now=Date.now(); if(now-lastTouch<=300) e.preventDefault(); lastTouch=now; }, { passive:false });
}

function init(){
  gameArea = $('game-area');
  scoreDisplay = $('score');
  levelDisplay = $('level-indicator');

  fx.init();
  if(window.__startAmbient) window.__startAmbient();
  wireStaticImages();
  tryBackgroundImage();
  bindEvents();
  lockGestures();

  // boot -> menu
  setTimeout(function(){
    var boot=$('boot'); boot.style.opacity='0';
    setTimeout(function(){ boot.style.display='none'; }, 600);
    show('menu');
  }, 1500);
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init);
else init();

})();
