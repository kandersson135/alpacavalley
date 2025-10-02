// Game audio
let bgAudio = new Audio('audio/bg.ogg');
let alpacaAudio = new Audio('audio/alpaca-noise4.mp3');
let alpacaNoise = new Audio('audio/alpaca-noise3.mp3');
let popAudio = new Audio('audio/pop.mp3');
bgAudio.volume = 0.1;
bgAudio.loop = true;
bgAudio.play();
alpacaAudio.volume = 0.3;
alpacaAudio.loop = true;
alpacaAudio.play();
alpacaNoise.volume = 0.8;
popAudio.volume = 0.3;

//localStorage.removeItem('alpaca_save');

// Attach event to all buttons
$(document).on("mousedown", "button", function() {
  // Reset sound to start (in case it overlaps)
  popAudio.currentTime = 0;
  popAudio.play();
});

// -- Game data & defaults
const defaultState = {
  level:1, exp:0, wool:0, coins:0, happiness:50, herd:1,
  idleBase:0.2, // wool per second base
  barnLevel:1, autoShear:false, powerupsActive:[], powerupsUsed:0,
  achievements:{}, unlockedAch:[], lastTick:Date.now()
}

// New achievements definitions
const ACH_DEFS = [
  {id:'first_shear', title:'First Shear', desc:'Shear wool for the first time', check: s=>s.exp>0 && s.wool>0},
  {id:'wool_100', title:'Wool Hoarder', desc:'Collect 100 wool total', check: s=>s.wool>=100},
  {id:'level_5', title:'Rising Farmer', desc:'Reach farm level 5', check: s=>s.level>=5},
  {id:'coins_1000', title:'Trader', desc:'Reach 1000 coins', check: s=>s.coins>=1000},
  {id:'use_5_power', title:'Powered Up', desc:'Use 5 power-ups', check: s=>s.powerupsUsed>=5},
  {id:'herd_10', title:'Herd Master', desc:'Own 10 alpacas', check: s=>s.herd>=10},
  {id:'wool_500', title:'Wool Tycoon', desc:'Collect 500 wool total', check: s=>s.wool>=500},
  {id:'level_10', title:'Elite Farmer', desc:'Reach farm level 10', check: s=>s.level>=10},
  {id:'coins_5000', title:'Millionaire', desc:'Reach 5000 coins', check: s=>s.coins>=5000},
  {id:'use_10_power', title:'Power User', desc:'Use 10 power-ups', check: s=>s.powerupsUsed>=10}
];

// New power-ups store
const STORE = [
  {id:'double_wool', title:'Double Wool', cost:100, duration:30, apply: s=>({multWool:2})},
  {id:'auto_shear', title:'Auto-Shear', cost:200, duration:60, apply: s=>({autoShear:true})},
  {id:'happy_boost', title:'Happiness Boost', cost:120, duration:30, apply: s=>({happyAdd:20})},
  {id:'coin_bonus', title:'Coin Bonus', cost:180, duration:30, apply: s=>({coinMult:2})},
  {id:'super_shear', title:'Super Shear', cost:250, duration:30, apply: s=>({shearMult:3})},
  {id:'auto_craft', title:'Auto-Craft', cost:300, duration:60, apply: s=>({autoCraft:true})}
];

const alpacaImages = [
  'img/alpacas/black.gif',
  'img/alpacas/white.gif',
  'img/alpacas/white2.gif',
  'img/alpacas/brown.gif',
  'img/alpacas/brown2.gif',
  'img/alpacas/brown3.gif',
];

// state
let S = loadState();

// utility
function saveState(){
  S.lastTick = Date.now();
  localStorage.setItem('alpaca_save', JSON.stringify(S));
  //log('Game saved');
  updateUI();
}
function loadState(){
  try{
    const raw = localStorage.getItem('alpaca_save');
    if(raw){
      const parsed = JSON.parse(raw);
      // migrate defaults
      log('Game loaded from last save.');
      return Object.assign({}, defaultState, parsed);
    }
  }catch(e){console.error(e)}
  return JSON.parse(JSON.stringify(defaultState));
}

function log(text){
  const time = new Date().toLocaleTimeString();
  $('#messageCenter').prepend(`<div class=\"logEntry\"><small class=\"logTimestamp\">[${time}]</small> ${text}</div>`);
}

// Experience & Leveling
function expToNext(level){ return Math.floor(100 * Math.pow(1.5, level-1)); }
function addExp(amount){ S.exp += amount; checkLevel(); }
function checkLevel(){
  let need = expToNext(S.level);
  while(S.exp >= need){
    S.exp -= need; S.level++; S.herd += 0; // maybe reward
    log(`Farm leveled up! Now level ${S.level}`);
    grantCoins( Math.floor(50 * S.level) );
    need = expToNext(S.level);
    checkAllAch();
  }
  updateUI();
}

function grantCoins(n){
  let mult = 1;
  S.powerupsActive.forEach(p=>{
    if(p.id==='coin_bonus' && p.meta && p.meta.coinMult){
      mult *= p.meta.coinMult;
    }
  });
  S.coins += Math.floor(n * mult);
  updateUI();
}

// Continuous wandering alpacas without resetting
function displayAlpacas(){
  const container = $('#alpacaImagesContainer');
  container.empty();
  const maxHerd = S.barnLevel * 5;
  const containerWidth = container.width();
  const containerHeight = container.height();

  for(let i=0;i<S.herd;i++){
    const randomIndex = Math.floor(Math.random()*alpacaImages.length);
    const img = $('<img>');
    img.attr('src', alpacaImages[randomIndex]);
    img.css({
      width:'29px',
      height:'36px',
      imageRendering:'pixelated',
      position:'absolute',
      left: Math.random()*(containerWidth-48)+'px',
      top: Math.random()*(containerHeight-48)+'px',
      transform: 'scaleX(1)' // start facing right by default
    });
    container.append(img);

    // Wander function for continuous random movement
    // function wander(el) {
    //   const container = $('#alpacaImagesContainer');
    //   const containerWidth = container.width();
    //   const containerHeight = container.height();
    //
    //   (function move(){
    //     const currentLeft = parseFloat(el.css('left')) || 0;
    //     const currentTop = parseFloat(el.css('top')) || 0;
    //     const deltaX = (Math.random()-0.5)*20; // small steps
    //     const deltaY = (Math.random()-0.5)*20;
    //     const newLeft = Math.min(Math.max(currentLeft+deltaX, 0), containerWidth-48);
    //     const newTop = Math.min(Math.max(currentTop+deltaY, 0), containerHeight-48);
    //
    //     // Flip occasionally
    //     if(Math.random() < 0.3){
    //       const currentTransform = el.css('transform');
    //       el.css('transform', currentTransform === 'matrix(-1, 0, 0, 1, 0, 0)' ? 'scaleX(1)' : 'scaleX(-1)');
    //     }
    //
    //     el.animate({left:newLeft+'px', top:newTop+'px'}, 4000 + Math.random()*4000, 'linear', move);
    //   })();
    // }

    function wander(el){
      function move(){
        const currentLeft = parseFloat(el.css('left')) || 0;
        const currentTop = parseFloat(el.css('top')) || 0;

        // Random step distance (small shuffle vs bigger move)
        const deltaX = (Math.random()-0.5) * (20 + Math.random()*60); // 20–80px range
        const deltaY = (Math.random()-0.5) * (20 + Math.random()*60);

        const newLeft = Math.min(Math.max(currentLeft + deltaX, 0), containerWidth-48);
        const newTop = Math.min(Math.max(currentTop + deltaY, 0), containerHeight-48);

        // Flip based on horizontal direction
        if(deltaX > 0){
          el.css('transform', 'scaleX(1)');
        } else if(deltaX < 0){
          el.css('transform', 'scaleX(-1)');
        }

        // Random step duration (2s–6s)
        const stepTime = 6000 + Math.random()*4000;

        el.animate(
          { left:newLeft+'px', top:newTop+'px' },
          stepTime,
          'linear',
          move
        );
      }
      move();
    }

    wander(img);

    img.click(function() {
      const el = $(this);
      const runDuration = 3000; // 3 seconds
      const containerWidth = $('#alpacaImagesContainer').width();
      const containerHeight = $('#alpacaImagesContainer').height();

      // Play alpaca noise
      alpacaNoise.currentTime = 0;
      alpacaNoise.play();

      // Reduce happiness for stressing the alpaca
      S.happiness = Math.max(0, S.happiness - 3); // decrease by 3%
      log("The alpaca got stressed! Happiness -3");

      el.stop(true);

      // Random persistent direction for this run
      const angle = Math.random() * 2 * Math.PI;
      const speed = 1; // pixels per frame, smaller = smoother
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;

      const startTime = Date.now();

      function runAway() {
        const elapsed = Date.now() - startTime;
        if (elapsed >= runDuration) {
          wander(el); // resume normal wandering
          return;
        }

        let currentLeft = parseFloat(el.css('left')) || 0;
        let currentTop = parseFloat(el.css('top')) || 0;

        // Move in persistent direction
        let newLeft = currentLeft + vx;
        let newTop = currentTop + vy;

        // Keep inside container
        if (newLeft < 0 || newLeft > containerWidth - el.width()) {
          newLeft = Math.min(Math.max(newLeft, 0), containerWidth - el.width());
          // Reverse X direction if hitting wall
          el.css('transform', vx >= 0 ? 'scaleX(1)' : 'scaleX(-1)');
        } else {
          el.css('transform', vx >= 0 ? 'scaleX(1)' : 'scaleX(-1)');
        }

        if (newTop < 0 || newTop > containerHeight - el.height()) {
          newTop = Math.min(Math.max(newTop, 0), containerHeight - el.height());
        }

        el.css({ left: newLeft + 'px', top: newTop + 'px' });
        requestAnimationFrame(runAway);
      }

      runAway();
      updateUI();
    });
  }

  $('#displayHerdSize').text(`${S.herd} / ${maxHerd}`);
}

// Call this function whenever herd changes
function addAlpaca(){
  S.herd++;
  displayAlpacas();
}

// Actions
function pet(){ addExp(5); S.happiness = Math.min(100, S.happiness + 2); log('You pet the alpacas.'); autosave(); }

function feed() {
  if (S.coins >= 5) {
  addExp(2);
  S.happiness = Math.min(100, S.happiness + 8);
  S.coins -= 5;
  log('You fed the herd (-5 coins).');
  autosave();
  } else {
  log("Not enough coins to feed the herd.");
  }
}

function shear(){
  const base = 1 + Math.floor(S.herd * 0.8) + Math.floor(S.level/2);
  let mult = 1;
  S.powerupsActive.forEach(p=>{
    if(p.id==='double_wool' && p.meta && p.meta.multWool) mult *= p.meta.multWool;
    if(p.id==='super_shear' && p.meta && p.meta.shearMult) mult *= p.meta.shearMult;
  });
  const gained = Math.floor(base * mult);
  S.wool += gained;
  addExp(8 + Math.floor(gained/2));
  log(`Sheared ${gained} wool.`);
  checkAllAch();
  autosave();
}

function craft(){
  if(S.wool < 5){ log('Not enough wool to craft (needs 5).'); return; }
  S.wool -= 5;
  let sale = 20 + Math.floor(S.level*2);

  S.powerupsActive.forEach(p=>{
    if(p.id==='coin_bonus' && p.meta && p.meta.coinMult){
      sale *= p.meta.coinMult;
    }
  });

  S.coins += sale; addExp(6); log(`Crafted yarn and sold for ${sale} coins.`); checkAllAch(); autosave();
}

function buyAlpaca(){
  const maxHerd = S.barnLevel * 5; // example cap
  if(S.herd >= maxHerd){
  log('Your barn is full! Upgrade to add more alpacas.');
  return;
  }
  const cost = 200 * S.herd;
  if(S.coins < cost){
  log('Not enough coins to buy another alpaca.');
  return;
  }
  S.coins -= cost;
  S.herd++;
  log('You bought a new alpaca for your farm.');
  addExp(10);
  autosave();
  displayAlpacas(); // update visual display
}

displayAlpacas();

// Upgrades
//function upgradeBarn(){ const cost = 500 * S.barnLevel; if(S.coins < cost){ log('Not enough coins'); return; } S.coins -= cost; S.barnLevel++; log('Barn upgraded. Herd capacity increased.'); autosave(); }

// Update herd size text when barn is upgraded
function upgradeBarn(){
  const cost = 500 * S.barnLevel;
  if(S.coins < cost){
  log('Not enough coins');
  return;
  }
  S.coins -= cost;
  S.barnLevel++;
  log('Barn upgraded. Herd capacity increased.');
  autosave();

  // Update herd size display
  const maxHerd = S.barnLevel * 5; // example: 5 alpacas per barn level
  $('#displayHerdSize').text(`${S.herd} / ${maxHerd}`);
}

function upgradeAuto(){ const cost = 800; if(S.coins < cost){ log('Not enough coins'); return; } S.coins -= cost; S.autoShear = true; log('You bought a shearing robot! Idle wool increased.'); autosave(); }

// Power-ups
function buyPowerup(id){ const item = STORE.find(p=>p.id===id); if(!item) return; if(S.coins < item.cost){ log('Not enough coins for power-up.'); return; }
  S.coins -= item.cost; const ends = Date.now() + item.duration*1000;
  const instance = {id:item.id, ends:ends, meta:item.apply(S)}; S.powerupsActive.push(instance); S.powerupsUsed = (S.powerupsUsed||0)+1; log(`Activated power-up: ${item.title} (${item.duration}s)`);
  applyPowerupEffects(); checkAllAch(); autosave();
}

function applyPowerupEffects(){ // cleanup expired & apply
  const now = Date.now(); S.powerupsActive = S.powerupsActive.filter(p=>p.ends>now);
  // compute derived flags
  S.powerupsActive.forEach(p=>{
    if(p.id==='happy_boost' && p.meta && p.meta.happyAdd){
      S.happiness = Math.min(100, S.happiness + p.meta.happyAdd);
    }
  });
  updateUI();
}

// Idle tick
// function tick(dtSec){
//   // base idle wool
//   let rate = S.idleBase * S.herd * (1 + (S.barnLevel-1)*0.2);
//   if(S.autoShear) rate += 0.5; // bought robot
//   // powerups
//   S.powerupsActive.forEach(p=>{ if(p.id==='auto_shear') rate += 1.0; if(p.meta && p.meta.multWool) rate *= p.meta.multWool; });
//   const amount = rate * dtSec;
//   S.wool += amount;
//   // happiness slowly decays if not fed
//   S.happiness = Math.max(0, S.happiness - dtSec*0.01);
//   addExp( Math.floor(dtSec * 0.2) );
// }

function tick(dtSec){
  // base idle wool
  // let rate = S.idleBase * S.herd * (1 + (S.barnLevel-1)*0.2);
  // if(S.autoShear) rate += 0.5; // robot upgrade
  // // powerups
  // S.powerupsActive.forEach(p=>{
  //   if(p.id==='double_wool') rate *= 2;
  //   if(p.id==='auto_shear') rate += 1.0;
  //   if(p.meta && p.meta.multWool) rate *= p.meta.multWool;
  // });
  // const amount = rate * dtSec;
  // S.wool += amount;

  // No base idle wool, only auto systems
  let rate = 0;

  // Only add from autoShear upgrade or powerups
  if(S.autoShear) rate += 0.5;
  S.powerupsActive.forEach(p=>{
    if(p.id==='double_wool') rate *= 2;
    if(p.id==='auto_shear') rate += 1.0;
    if(p.meta && p.meta.multWool) rate *= p.meta.multWool;
  });

  const amount = rate * dtSec;
  S.wool += amount;


  // NEW: Auto-Craft effect
  if (S.powerupsActive.some(p => p.id === 'auto_craft')) {
    const crafts = Math.floor(S.wool / 5); // every 5 wool
    if(crafts > 0){
      const sale = 20 + Math.floor(S.level*2);
      const crafted = Math.min(crafts, 1); // craft at most once per tick
      S.wool -= 5 * crafted;
      S.coins += sale * crafted;
      addExp(6 * crafted);
      log(`Auto-crafted yarn and sold for ${sale * crafted} coins.`);
    }
  }

  // happiness slowly decays if not fed
  S.happiness = Math.max(0, S.happiness - dtSec*0.1);
  addExp( Math.floor(dtSec * 0.2) );
}

// achievements
function checkAllAch(){
  ACH_DEFS.forEach(a=>{
    if(!S.achievements[a.id] && a.check(S)){
      S.achievements[a.id] = {unlocked:true, time:Date.now()}; S.unlockedAch.push(a.id);
      log(`Achievement unlocked: ${a.title}`);
      // small reward
      S.coins += 100; S.wool += 10; updateUI();
    }
  });
  updateUI();
}

// Show power-ups based on farm level
function getAvailablePowerups(){
  return STORE.filter(p => {
  if(p.id==='double_wool') return S.level >= 1;
  if(p.id==='auto_shear') return S.level >= 3;
  if(p.id==='coin_bonus') return S.level >= 5;
  if(p.id==='happy_boost') return S.level >= 10;
  if(p.id==='auto_craft') return S.level >= 15;
  if(p.id==='super_shear') return S.level >= 20;
  return false;
  });
}

// format number
function formatNumber(num) {
  if (num >= 1e9) return (num / 1e9).toFixed(1) + "B";
  if (num >= 1e6) return (num / 1e6).toFixed(1) + "M";
  if (num >= 1e3) return (num / 1e3).toFixed(1) + "k";
  return Math.floor(num); // keep as integer under 1k
}

// autosave scheduler
let autosaveTimer = null;
function autosave(){ saveState(); }

// UI render
function updateUI(){
  $('#levelDisplay').text(S.level);
  const need = expToNext(S.level);
  $('#expText').text(`${Math.floor(S.exp)} / ${need}`);
  $('#expBar').css('width', Math.min(100, (S.exp/need*100)) + '%');
  //$('#woolDisplay').text(Math.floor(S.wool));
  $('#woolDisplay').text(formatNumber(S.wool));
  // $('#coinsDisplay').text(Math.floor(S.coins));
  $('#coinsDisplay').text(formatNumber(S.coins));
  $('#storeCoins').text(Math.floor(S.coins));
  $('#happyDisplay').text(Math.floor(S.happiness) + '%');
  //$('#herdSize').text(S.herd);
  $('#idleRate').text((S.idleBase * S.herd * (1 + (S.barnLevel-1)*0.2) + (S.autoShear?0.5:0)).toFixed(2));
  $('#timeDisplay').text(new Date().toLocaleString());

  const alpacaCost = 200 * S.herd;
  //$('#buyAlpacaBtn').text(`Buy Alpaca (${alpacaCost} coins)`);
  $('#buyAlpacaBtn').attr('data-title', `Cost ${alpacaCost} coins`);

  const barnCost = 500 * S.barnLevel;
  $('#upgradeBarn').attr('data-title', `Cost ${barnCost} coins`);

  // update store
  $('#storeArea').empty();
  getAvailablePowerups().forEach(p=>{
    const disabled = S.coins < p.cost ? 'opacity:0.6' : '';
    $('#storeArea').append(`
    <div class="power" style="${disabled}">
      <div style="font-weight:700">${p.title}</div>
      <small>Duration: ${p.duration}s</small>
      <div style="margin-top:6px"><b>${p.cost} coins</b></div>
      <div style="margin-top:6px"><button class="btn" data-buy="${p.id}">Buy</button></div>
    </div>
    `);
  });

  // list achievements
  $('#achList').empty();
  ACH_DEFS.forEach(a=>{
    const unlocked = !!S.achievements[a.id];
    $('#achList').append(`<div class=\"ach\">${unlocked?'<b>✓</b> ':'<small>•</small> '}<b>${a.title}</b> — <span class=\"muted\">${a.desc}</span></div>`);
  });
}

// main loop (1s)
let last = Date.now();
setInterval(()=>{
  const now = Date.now();
  const dt = (now - last)/1000; if(dt>5) dt=1; // clamp giant gaps
  tick(dt); applyPowerupEffects(); last = now; updateUI();
},1000);

// cleanup expired powerups often
setInterval(()=>{ applyPowerupEffects(); }, 2000);

// UI wiring
$(function(){
  updateUI();
  // attach buttons
  $('#petBtn').click(()=>{ pet(); updateUI(); });
  $('#feedBtn').click(()=>{ feed(); updateUI(); });
  $('#shearBtn').click(()=>{ shear(); updateUI(); });
  $('#craftBtn').click(()=>{ craft(); updateUI(); });
  $('#buyAlpacaBtn').click(()=>{ buyAlpaca(); updateUI(); });
  $('#upgradeBarn').click(()=>{ upgradeBarn(); updateUI(); });
  $('#upgradeAuto').click(()=>{ upgradeAuto(); updateUI(); });

  // store buy
  $('#storeArea').on('click','button[data-buy]', function(){ const id=$(this).data('buy'); buyPowerup(id); updateUI(); });

  // initial achievements check
  checkAllAch();
  // autosave every 10s
  if(autosaveTimer) clearInterval(autosaveTimer);
  autosaveTimer = setInterval(()=>{ saveState(); }, 10000);
});

let isResetting = false;

$('#reset-btn').click(function() {
  if (confirm("Are you sure you want to reset your farm? All progress will be lost!")) {
    isResetting = true;
    localStorage.removeItem('alpaca_save');
    location.reload();
  }
});

window.addEventListener('beforeunload', ()=>{
  if (!isResetting) saveState();
});

// // before unload
// window.addEventListener('beforeunload', ()=>{ saveState(); });
