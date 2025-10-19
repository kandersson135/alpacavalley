// Game audio
let bgAudio = new Audio('audio/bg.ogg');
let alpacaAudio = new Audio('audio/alpaca-noise4.mp3');
let alpacaNoise = new Audio('audio/alpaca-noise3.mp3');
let popAudio = new Audio('audio/pop.mp3');
let thumpAudio = new Audio('audio/thump.mp3');
let pootAudio = new Audio('audio/poot.mp3');
let spawnAudio = new Audio('audio/poof.wav');
let upgradeAudio = new Audio('audio/upgrade.mp3');
let robotAudio = new Audio('audio/robot.mp3');
let levelupAudio = new Audio('audio/level-up.mp3');
let notificationAudio = new Audio('audio/notification.mp3');
bgAudio.volume = 0.3;
bgAudio.loop = true;
alpacaAudio.volume = 0.3;
alpacaAudio.loop = true;
alpacaNoise.volume = 0.8;
popAudio.volume = 0.3;
pootAudio.volume = 0.3;
levelupAudio.volume = 0.3;
spawnAudio.volume = 0.3;
robotAudio.volume = 0.3;
upgradeAudio.volume = 0.3;
notificationAudio.volume = 0.3;

const allAudio = [
  bgAudio, alpacaAudio, alpacaNoise, popAudio, thumpAudio,
  pootAudio, spawnAudio, upgradeAudio, robotAudio,
  levelupAudio, notificationAudio
];
function setAllAudioMuted(mute) {
  allAudio.forEach(a => { if (a) a.muted = mute; });
}

const GAME_VERSION = "0.0.8";

// Function to detect Chrome/Edge
function isChromiumBased() {
  const ua = navigator.userAgent;
  return /Chrome/.test(ua) && !/OPR|Edg|Edge|Brave/.test(ua) ? 'chrome' :
         /Edg|Edge/.test(ua) ? 'edge' : false;
}

// On page load
$(window).on('load', function() {
  const browser = isChromiumBased();
  if (browser) {
    log('🔊 Click anywhere to enable sound.', "info");
  }
});

// Click handler for playing audio
$(document).one('click', function() {
  if (bgAudio.paused) bgAudio.play().catch(err => console.log(err));
  if (alpacaAudio.paused) alpacaAudio.play().catch(err => console.log(err));
});

// Attach event to all buttons
$(document).on("mousedown", "button, a", function() {
  // Reset sound to start (in case it overlaps)
  popAudio.currentTime = 0;
  popAudio.play();
});

// -- Game data & defaults
const defaultState = {
  level:1, exp:0, wool:0, coins:0, happiness:50, herd:1,
  idleBase:0.2, // wool per second base
  barnLevel:1, autoShear:false, powerupsActive:[], powerupsUsed:0,
  achievements:{}, unlockedAch:[], lastTick:Date.now(), lastPlayed:Date.now(),
  isMuted: false,

  // 🆕 tracking stats
  totalCrafted: 0,
  totalPowerupTime: 0,
  feedCount: 0,
  petCount: 0,
  playTime: 0,
  offlineTicks: 0,
  poopCleaned: 0,
  alpacaClicks: 0
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
  {id:'level_20', title:'Elite Farmer', desc:'Reach farm level 20', check: s=>s.level>=20},
  {id:'coins_100k', title:'Millionaire', desc:'Reach 100k coins', check: s=>s.coins>=100000},
  {id:'use_10_power', title:'Power User', desc:'Use 10 power-ups', check: s=>s.powerupsUsed>=10},

  {id:'herd_20', title:'Valley Guardian', desc:'Own 20 alpacas', check:s=>s.herd>=20},
  {id:'pink_unlock', title:'Rare Discovery', desc:'Unlock a pink alpaca', check:s=>s.level>=15 && s.herd>=1},
  {id:'herd_full', title:'Max Capacity', desc:'Fill your entire barn with alpacas', check:s=>s.herd>=s.barnLevel*5},

  {id:'coins_10k', title:'Wealthy Shepherd', desc:'Reach 10,000 coins', check:s=>s.coins>=10000},
  {id:'coins_1m', title:'Wool Magnate', desc:'Accumulate 1,000,000 coins', check:s=>s.coins>=1000000},
  {id:'sell_100', title:'Seasoned Merchant', desc:'Craft and sell 100 yarns', check:s=>s.totalCrafted && s.totalCrafted>=100},

  {id:'auto_robot', title:'Mechanical Friend', desc:'Purchase your first shearing robot', check:s=>s.autoShearLevel>=1},
  {id:'auto_robot_5', title:'Factory Farmer', desc:'Own 5 shearing robots', check:s=>s.autoShearLevel>=5},
  {id:'power_long', title:'Energized', desc:'Have a power-up active for over 2 minutes total', check:s=>s.totalPowerupTime && s.totalPowerupTime>=120},

  {id:'happy_100', title:'Herd Whisperer', desc:'Reach 100% happiness', check:s=>s.happiness>=100},
  {id:'feed_50', title:'Snack Distributor', desc:'Feed the herd 50 times', check:s=>s.feedCount && s.feedCount>=50},
  {id:'pet_100', title:'Soft Touch', desc:'Pet the alpacas 100 times', check:s=>s.petCount && s.petCount>=100},

  {id:'idle_1h', title:'Time Well Spent', desc:'Play for 1 hour total', check:s=>s.playTime && s.playTime>=3600},
  {id:'offline_gain', title:'The Lazy Way', desc:'Earn wool while away from the game', check:s=>s.offlineTicks && s.offlineTicks>0},

  {id:'clean_10', title:'Poop Patrol', desc:'Clean up 10 poops', check:s=>s.poopCleaned && s.poopCleaned>=10},
  {id:'stress_10', title:'Too Much Stress', desc:'Stress the alpacas 10 times by clicking them', check:s=>s.alpacaClicks && s.alpacaClicks>=10},
];

// New power-ups store
const STORE = [
  {id:'double_wool', title:'Wool Bonus', cost:1000, duration:30, apply: s=>({multWool:2})},
  //{id:'auto_shear', title:'Auto-Shear', cost:200, duration:60, apply: s=>({autoShear:true})},
  {id:'auto_shear', title:'Auto-Shear', cost:2000, duration:60, apply: s=>({})},
  {id:'coin_bonus', title:'Coin Bonus', cost:1800, duration:30, apply: s=>({coinMult:2})},
  {id:'happy_boost', title:'Happiness Boost', cost:1200, duration:30, apply: s=>({happyAdd:20})},
  {id:'super_shear', title:'Super Shear', cost:2500, duration:30, apply: s=>({shearMult:3})},
  {id:'auto_craft', title:'Auto-Craft', cost:3000, duration:60, apply: s=>({autoCraft:true})}
];

// Regular + choice messages.
const MESSAGE_POOL = [
  // --- Plain messages ---
  { type: 'text', msg: "A cool breeze ruffles the herd's fluff." },
  { type: 'text', msg: "You hear gentle humming from the paddock." },
  { type: 'text', msg: "The alpacas blink at you in quiet curiosity." },
  { type: 'text', msg: "A bell rings in the distance. The valley feels calm." },
  { type: 'text', msg: "Sunlight warms the alpacas’ wool. Everything feels peaceful." },
  { type: 'text', msg: "A lazy cloud drifts by, shaped suspiciously like an alpaca." },
  { type: 'text', msg: "Soft bleats echo across the valley." },
  { type: 'text', msg: "The alpacas gather near the fence, staring at something only they can see." },
  { type: 'text', msg: "A light breeze carries the scent of hay and sunshine." },
  { type: 'text', msg: "You find a single golden strand of wool — shimmering faintly." },
  { type: 'text', msg: "Two alpacas seem to be in a staring contest. You’re not sure who’s winning." },
  { type: 'text', msg: "The valley hums with quiet life." },
  { type: 'text', msg: "Your herd seems unusually energetic today!" },
  { type: 'text', msg: "The sky paints the pasture in hues of orange and gold." },
  { type: 'text', msg: "One alpaca sneezes. Another looks offended." },
  { type: 'text', msg: "A butterfly lands briefly on an alpaca’s nose. Everyone freezes." },
  { type: 'text', msg: "You swear one alpaca just winked at you." },

  // Optional: gated by state (min level, herd size, etc.)
  { type: 'text', msg: "Your growing farm draws curious birds.", cond: s => s.level >= 5 },
  { type: 'text', msg: "The herd seems extra fluffy today.", cond: s => s.herd >= 5 },

  // --- Choice messages ---
  {
    type: 'choice',
    msg: "An alpaca nudges your pocket. What do you do?",
    choices: [
      { id: 'pet',  text: 'Pet gently' },
      { id: 'feed', text: 'Share a snack' },
      { id: 'ignore', text: 'Ignore' }
    ]
  },
  {
    type: 'choice',
    msg: "A merchant strolls by. Do you stop for a chat?",
    cond: s => s.level >= 3,
    choices: [
      { id: 'chat', text: 'Chat' },
      { id: 'pass', text: 'Pass' }
    ]
  },
  {
    type: 'choice',
    msg: "A stray tuft of wool floats by. Do you collect it?",
    choices: [
      { id: 'grab', text: 'Grab it' },
      { id: 'leave', text: 'Let it drift' }
    ]
  },
  {
    type: 'choice',
    msg: "An alpaca looks hungry. What do you do?",
    choices: [
      { id: 'feedSnack', text: 'Feed some hay' },
      { id: 'petInstead', text: 'Pet to distract' },
      { id: 'ignore', text: 'Pretend you didn’t notice' }
    ]
  },
  {
    type: 'choice',
    msg: "You spot a small pile of golden wool near the fence.",
    choices: [
      { id: 'collect', text: 'Collect it (+wool)' },
      { id: 'leave', text: 'Leave it be' }
    ]
  },
  {
    type: 'choice',
    msg: "The merchant from the nearby town returns with new goods.",
    cond: s => s.level >= 5,
    choices: [
      { id: 'buy', text: 'Trade wool for coins' },
      { id: 'chat', text: 'Chat about the valley' },
      { id: 'pass', text: 'Politely decline' }
    ]
  },
  {
    type: 'choice',
    msg: "A mysterious sparkle appears near the barn.",
    choices: [
      { id: 'investigate', text: 'Investigate' },
      { id: 'ignore', text: 'Leave it for now' }
    ]
  },
  {
    type: 'choice',
    msg: "A tiny alpaca foal peeks out from behind the fence!",
    cond: s => s.herd >= 8,
    choices: [
      { id: 'approachFoal', text: 'Approach slowly' },
      { id: 'watchFoal', text: 'Observe quietly' }
    ]
  },
  {
    type: 'choice',
    msg: "A rainbow stretches over the valley — it’s breathtaking.",
    cond: s => s.level >= 10,
    choices: [
      { id: 'admire', text: 'Take a moment to admire' },
      { id: 'shearRainbow', text: 'Use the moment to shear wool' }
    ]
  },
  {
    type: 'choice',
    msg: "A pink alpaca appears at the edge of your field, shimmering softly.",
    cond: s => s.level >= 15,
    choices: [
      { id: 'approachPink', text: 'Approach carefully' },
      { id: 'blink', text: 'You must be imagining things...' }
    ]
  },
  {
    type: 'choice',
    msg: "A shooting star flashes above Alpaca Valley.",
    choices: [
      { id: 'wish', text: 'Make a wish' },
      { id: 'ignoreStar', text: 'Stay grounded' }
    ]
  }
];

// const alpacaImages = [
//   'img/alpacas/black.gif',
//   'img/alpacas/white.gif',
//   'img/alpacas/white2.gif',
//   'img/alpacas/brown.gif',
//   'img/alpacas/brown2.gif',
//   'img/alpacas/brown3.gif',
//   'img/alpacas/blue.gif',
//   'img/alpacas/pink.gif',
// ];

const allAlpacaImages = [
  { src: 'img/alpacas/black.gif', minLevel: 1, name: 'black' },
  { src: 'img/alpacas/white.gif', minLevel: 1, name: 'white' },
  { src: 'img/alpacas/white2.gif', minLevel: 1, name: 'white' },
  { src: 'img/alpacas/brown.gif', minLevel: 1, name: 'brown' },
  { src: 'img/alpacas/brown2.gif', minLevel: 1, name: 'brown' },
  { src: 'img/alpacas/brown3.gif', minLevel: 1, name: 'brown' },
  { src: 'img/alpacas/pink.gif', minLevel: 15, name: 'pink' }
];

// Helper function to get available alpacas based on level
function getAvailableAlpacaImages() {
  return allAlpacaImages.filter(a => S.level >= a.minLevel);
}

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
      log('Game loaded from last save.', "normal");
      return Object.assign({}, defaultState, parsed);
    }
  }catch(e){console.error(e)}
  return JSON.parse(JSON.stringify(defaultState));
}

// function log(text){
//   const time = new Date().toLocaleTimeString();
//   $('#messageCenter').prepend(`<div class=\"logEntry\"><small class=\"logTimestamp\">[${time}]</small> ${text}</div>`);
// }

// message pool stuff
function logWithChoices(message, choices = []) {
  const time = new Date().toLocaleTimeString();

  // Create a unique ID so multiple questions can coexist safely
  const choiceId = 'choices_' + Date.now();

  // Build choice buttons
  const choiceHtml = choices.map(c =>
    `<button class="logChoice btn" data-choice="${c.id}" data-group="${choiceId}">
      ${c.text}
    </button>`
  ).join(' ');

  // Append to message center
  $('#messageCenter').prepend(`
    <div class="logEntry">
      <small class="logTimestamp">[${time}]</small> ${message}<br>
      <div id="${choiceId}" class="choiceGroup">${choiceHtml}</div>
    </div>
  `);
}

function randBetweenMs(minMs, maxMs){
  return Math.floor(minMs + Math.random() * (maxMs - minMs));
}

function pickEligibleMessage() {
  // Filter by optional condition
  const pool = MESSAGE_POOL.filter(m => !m.cond || m.cond(S));
  if (pool.length === 0) return null;
  // Simple uniform pick (add weights if you want)
  return pool[Math.floor(Math.random() * pool.length)];
}

function showAmbientMessage() {
  // If a choice group is still visible, wait until it’s answered
  if ($('.choiceGroup').length > 0) return;

  const m = pickEligibleMessage();
  if (!m) return;

  if (m.type === 'text') {
    log(m.msg, "info");
  } else if (m.type === 'choice') {
    notificationAudio.play();
    logWithChoices(m.msg, m.choices || []);
  }
}

function scheduleAmbientMessages() {
  const delay = randBetweenMs(5*60*1000, 10*60*1000); // 5–10 min
  setTimeout(() => {
    showAmbientMessage();
    scheduleAmbientMessages(); // schedule next one
  }, delay);
}

// log with choices handler
$('#messageCenter').on('click', '.logChoice', function() {
  const choice = $(this).data('choice');
  const group = $(this).data('group');

  // hide/remove the whole choice row for this message
  $(`#${group}`).fadeOut(200, function() { $(this).remove(); });

  switch (choice) {
    // --- your existing ones ---
    case 'feed':
      feed();
      log("You share a snack. The herd seems delighted. (+Happiness)", "success");
      break;
    case 'pet':
      pet();
      log("Soft pats all around. The herd relaxes.", "info");
      break;
    case 'ignore':
      log("You move on. The alpacas stare… unimpressed.", "warning");
      break;
    case 'chat':
      grantCoins(25);
      log("The merchant shares a tip and a small coin. (+25 coins)", "success");
      break;
    case 'pass':
      log("You keep tending the farm. Steady as ever.", "info");
      break;
    case 'grab':
      S.wool += 3;
      addExp(2);
      log("You catch the tuft! (+3 wool, +2 XP)", "success");
      break;
    case 'leave':
      log("You watch it drift into the sunlight. Peaceful.", "info");
      break;
    case 'collect':
      const woolFound = 10 + Math.floor(Math.random() * 10);
      S.wool += woolFound;
      addExp(4);
      log(`You gather some soft wool from the grass (+${woolFound} wool).`, "success");
      break;

    // --- new: hungry alpaca prompt ---
    case 'feedSnack':
      S.happiness = Math.min(100, S.happiness + 5);
      addExp(3);
      log("The alpaca munches happily. Happiness +5 💕", "success");
      break;
    case 'petInstead':
      S.happiness = Math.min(100, S.happiness + 2);
      addExp(2);
      log("You pet the alpaca instead. Its ears wiggle appreciatively.", "normal");
      break;

    // --- new: merchant trade option ---
    case 'buy': {
      if (S.wool >= 5) {
        S.wool -= 5;
        const sale = 50 + Math.floor(S.level * 4);
        S.coins += sale;
        addExp(6);
        log(`You trade 5 wool for ${sale} coins. The merchant smiles warmly. 💰`, "success");
      } else {
        log("You don’t have enough wool to trade.", "error");
      }
      break;
    }

    // --- new: sparkle near barn ---
    case 'investigate': {
      const found = Math.random() < 0.5;
      if (found) {
        const coins = 100 + Math.floor(Math.random() * 50);
        S.coins += coins;
        addExp(8);
        log(`You found ${coins} coins hidden under a tuft of wool! 🪙`, "success");
      } else {
        log("You find… nothing. Just sparkly dust.", "info");
      }
      break;
    }

    // --- new: foal event ---
    case 'approachFoal':
      if (Math.random() < 0.7) {
        S.happiness = Math.min(100, S.happiness + 6);
        addExp(5);
        log("The tiny alpaca lets you pet its nose. Adorable! Happiness +6 💕", "success");
      } else {
        log("The foal trots away playfully. Maybe next time.", "info");
      }
      break;
    case 'watchFoal':
      addExp(2);
      log("You quietly watch the foal explore. A calm moment of peace.", "normal");
      break;

    // --- new: rainbow event ---
    case 'admire':
      S.happiness = Math.min(100, S.happiness + 4);
      addExp(3);
      log("You take a deep breath and admire the view. Happiness +4 🌈", "success");
      break;
    case 'shearRainbow': {
      const rainbowWool = 30 + Math.floor(S.level * 2);
      S.wool += rainbowWool;
      addExp(5);
      log(`You quickly shear ${rainbowWool} rainbow-tinted wool. Magical! 🧶✨`, "success");
      break;
    }

    // --- new: pink alpaca (level-gated event in your pool) ---
    case 'approachPink': {
      const chance = Math.random();
      if (chance < 0.3) {
        log("The pink alpaca vanishes in a shimmer of light. Was it ever real?", "info");
      } else {
        S.happiness = Math.min(100, S.happiness + 10);
        addExp(15);
        log("The pink alpaca nuzzles your hand. A rare and lucky encounter! 💖", "success");
      }
      break;
    }
    case 'blink':
      log("You blink — and it’s gone. Maybe you need a nap.", "normal");
      break;

    // --- new: shooting star ---
    case 'wish': {
      const r = Math.random();
      if (r < 0.33) {
        S.coins += 200;
        log("Your wish comes true! +200 coins 💫", "success");
      } else if (r < 0.66) {
        S.wool += 100;
        log("A bundle of starlit wool appears in your barn! +100 wool 🌟", "success");
      } else {
        S.happiness = Math.min(100, S.happiness + 10);
        log("You feel a warm, happy glow inside. Happiness +10 ✨", "success");
      }
      addExp(5);
      break;
    }
    case 'ignoreStar':
      log("You ignore the star. The night remains quiet and still.", "info");
      break;

    default:
      log("The moment passes quietly.", "normal");
      break;
  }

  updateUI();
  autosave();
});

function log(text, type = "normal") {
  const container = $('#messageCenter');
  const time = new Date().toLocaleTimeString();

  let typeClass = "";
  switch (type) {
    case "success": typeClass = "log-success"; break;
    case "warning": typeClass = "log-warning"; break;
    case "error": typeClass = "log-error"; break;
    case "info": typeClass = "log-info"; break;
    default: typeClass = "log-normal"; break;
  }

  container.prepend(`
    <div class="logEntry ${typeClass}">
      <small class="logTimestamp">[${time}]</small> ${text}
    </div>
  `);

  // Always scroll to top (newest message)
  container.scrollTop(0);
}

function playLevelUpPulse() {
  const $badge = $("#levelBadge");
  $badge.removeClass("pulse");
  void $badge[0].offsetWidth;
  $badge.addClass("pulse");
  $badge.one("animationend", function () {
    $badge.removeClass("pulse");
  });
}

// Experience & Leveling
function expToNext(level){ return Math.floor(100 * Math.pow(1.5, level-1)); }
function addExp(amount){ S.exp += amount; checkLevel(); }
function checkLevel(){
  let need = expToNext(S.level);
  while(S.exp >= need){
    S.exp -= need; S.level++; S.herd += 0; // maybe reward
    log(`Farm leveled up! Now level ${S.level}`, "success");
    playLevelUpPulse();
    levelupAudio.play();
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
    //const randomIndex = Math.floor(Math.random()*alpacaImages.length);
    //const img = $('<img class="alpaca">');
    //img.attr('src', alpacaImages[randomIndex]);

    const available = getAvailableAlpacaImages();
    const chosen = available[Math.floor(Math.random() * available.length)];
    const img = $('<img>');
    img.attr('src', chosen.src);

    img.css({
      position: 'absolute',
      left: Math.random() * (containerWidth - 48) + 'px',
      top: Math.random() * (containerHeight - 48) + 'px',
      transform: 'scaleX(1)'
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


    function updateAlpacaDepthAndScale(el, flip) {
      const alpacaTop = el.position().top;
      const alpacaLeft = el.position().left;
      const alpacaWidth = el.outerWidth();
      const alpacaHeight = el.outerHeight();
      const containerHeight = $('#alpacaImagesContainer').height();

      // 1️⃣ Scale based on vertical position (pseudo-3D)
      const scale = 0.8 + 0.4 * (alpacaTop / containerHeight);

      // 2️⃣ Check all trees for overlap and distance
      const trees = $('.tree').map(function() {
        const $t = $(this);
        return {
          left: $t.position().left,
          top: $t.position().top,
          width: $t.outerWidth(),
          height: $t.outerHeight()
        };
      }).get();

      let behind = false;
      let opacity = 1;
      let brightness = 1;
      let dropShadow = '0px 0px 0px rgba(0,0,0,0)';

      for (const tree of trees) {
        const treeLeft = tree.left;
        const treeRight = tree.left + tree.width;
        const treeBottom = tree.top + tree.height;
        const treeCenterX = tree.left + tree.width / 2;

        const alpacaCenterX = alpacaLeft + alpacaWidth / 2;
        const alpacaBottomY = alpacaTop + alpacaHeight;

        // Check horizontal overlap
        const overlapsX = alpacaCenterX > treeLeft && alpacaCenterX < treeRight;

        // Vertical distance from tree base
        const distanceY = treeBottom - alpacaBottomY; // positive if above tree base

        if (overlapsX && distanceY > 0) {
          behind = true;

          // Fade opacity and brightness smoothly based on distance
          const maxFadeDistance = 50; // pixels for max fade
          const factor = Math.min(distanceY / maxFadeDistance, 1);

          opacity = 1 - 0.2 * factor;           // 1 → 0.8
          brightness = 1 - 0.15 * factor;       // 1 → 0.85
          dropShadow = `0px 4px 2px rgba(0,0,0,0.3)`;

          break; // stop at the first tree that affects the alpaca
        }
      }

      // 3️⃣ Apply dynamic styles
      el.css({
        'z-index': behind ? 1 : 3,
        //'opacity': opacity,
        'filter': `brightness(${brightness}) ${dropShadow}`,
        'transform': `scaleX(${flip}) scale(${scale})`
      });
    }

    function wander(el) {
      function move() {
      const currentLeft = parseFloat(el.css('left')) || 0;
      const currentTop = parseFloat(el.css('top')) || 0;
      const deltaX = (Math.random() - 0.5) * (20 + Math.random() * 200);
      const deltaY = (Math.random() - 0.5) * (20 + Math.random() * 200);

      const newLeft = Math.min(Math.max(currentLeft + deltaX, 0), containerWidth - 48);
      const newTop = Math.min(Math.max(currentTop + deltaY, 0), containerHeight - 48);

      // Decide flip direction
      const flip = deltaX >= 0 ? 1 : -1;

      const stepTime = 6000 + Math.random() * 4000;

      el.animate(
        { left: newLeft + 'px', top: newTop + 'px' },
        {
          duration: stepTime,
          easing: 'linear',
          step: function(now, fx) {
            // continuously update depth + scale + flip
            updateAlpacaDepthAndScale(el, flip);
          },
          complete: move
        }
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
      S.alpacaClicks++; // 🆕 count clicks
      checkAllAch();
      log("The alpaca got stressed! Happiness -3", "warning");

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

        // Keep inside container and adjust flip
        let flip = vx >= 0 ? 1 : -1;
        if (newLeft < 0 || newLeft > containerWidth - el.width()) {
          newLeft = Math.min(Math.max(newLeft, 0), containerWidth - el.width());
          flip *= -1; // reverse flip if hitting wall
        }

        if (newTop < 0 || newTop > containerHeight - el.height()) {
          newTop = Math.min(Math.max(newTop, 0), containerHeight - el.height());
        }

        el.css({ left: newLeft + 'px', top: newTop + 'px' });

        // ✅ Update depth, scale, opacity, filter dynamically
        updateAlpacaDepthAndScale(el, flip);

        requestAnimationFrame(runAway);
      }

      runAway();
      updateUI();
    });
  }

  $('#displayHerdSize').text(`${S.herd} / ${maxHerd}`);
}

function addSingleAlpaca() {
  const container = $('#alpacaImagesContainer');
  const containerWidth = container.width();
  const containerHeight = container.height();
  //  const randomIndex = Math.floor(Math.random() * alpacaImages.length);

  const available = getAvailableAlpacaImages();
  const chosen = available[Math.floor(Math.random() * available.length)];
  const img = $('<img>');
  img.attr('src', chosen.src);

  img.css({
    position: 'absolute',
    left: Math.random() * (containerWidth - 48) + 'px',
    top: Math.random() * (containerHeight - 48) + 'px',
    transform: 'scaleX(1)'
  });
  container.append(img);

  if (chosen.name === 'pink') {
    log("✨ A rare pink alpaca has joined your herd!", "success");
  }

  spawnAudio.play();

  function updateAlpacaDepthAndScale(el, flip) {
    const alpacaTop = el.position().top;
    const alpacaLeft = el.position().left;
    const alpacaWidth = el.outerWidth();
    const alpacaHeight = el.outerHeight();
    const containerHeight = $('#alpacaImagesContainer').height();

    // 1️⃣ Scale based on vertical position (pseudo-3D)
    const scale = 0.8 + 0.4 * (alpacaTop / containerHeight);

    // 2️⃣ Check all trees for overlap and distance
    const trees = $('.tree').map(function() {
      const $t = $(this);
      return {
        left: $t.position().left,
        top: $t.position().top,
        width: $t.outerWidth(),
        height: $t.outerHeight()
      };
    }).get();

    let behind = false;
    let opacity = 1;
    let brightness = 1;
    let dropShadow = '0px 0px 0px rgba(0,0,0,0)';

    for (const tree of trees) {
      const treeLeft = tree.left;
      const treeRight = tree.left + tree.width;
      const treeBottom = tree.top + tree.height;
      const treeCenterX = tree.left + tree.width / 2;

      const alpacaCenterX = alpacaLeft + alpacaWidth / 2;
      const alpacaBottomY = alpacaTop + alpacaHeight;

      // Check horizontal overlap
      const overlapsX = alpacaCenterX > treeLeft && alpacaCenterX < treeRight;

      // Vertical distance from tree base
      const distanceY = treeBottom - alpacaBottomY; // positive if above tree base

      if (overlapsX && distanceY > 0) {
        behind = true;

        // Fade opacity and brightness smoothly based on distance
        const maxFadeDistance = 50; // pixels for max fade
        const factor = Math.min(distanceY / maxFadeDistance, 1);

        opacity = 1 - 0.2 * factor;           // 1 → 0.8
        brightness = 1 - 0.15 * factor;       // 1 → 0.85
        dropShadow = `0px 4px 2px rgba(0,0,0,0.3)`;

        break; // stop at the first tree that affects the alpaca
      }
    }

    // 3️⃣ Apply dynamic styles
    el.css({
      'z-index': behind ? 1 : 3,
      //'opacity': opacity,
      'filter': `brightness(${brightness}) ${dropShadow}`,
      'transform': `scaleX(${flip}) scale(${scale})`
    });
  }

  // --- Wandering logic (reuse your wander function)
  function wander(el) {
    function move() {
    const currentLeft = parseFloat(el.css('left')) || 0;
    const currentTop = parseFloat(el.css('top')) || 0;
    const deltaX = (Math.random() - 0.5) * (20 + Math.random() * 200);
    const deltaY = (Math.random() - 0.5) * (20 + Math.random() * 200);

    const newLeft = Math.min(Math.max(currentLeft + deltaX, 0), containerWidth - 48);
    const newTop = Math.min(Math.max(currentTop + deltaY, 0), containerHeight - 48);

    // Decide flip direction
    const flip = deltaX >= 0 ? 1 : -1;

    const stepTime = 6000 + Math.random() * 4000;

    el.animate(
      { left: newLeft + 'px', top: newTop + 'px' },
      {
        duration: stepTime,
        easing: 'linear',
        step: function(now, fx) {
          // continuously update depth + scale + flip
          updateAlpacaDepthAndScale(el, flip);
        },
        complete: move
      }
    );
    }
    move();
  }

  // spawn animation - drop drom top
  // const spawnY = -40; // start slightly above container
  // const targetTop = Math.random() * (containerHeight - 48);
  // img.css({ top: spawnY + 'px', opacity: 0 });
  // container.append(img);
  // img.animate(
  //   { top: targetTop + 'px', opacity: 1 },
  //   { duration: 800, easing: 'swing', complete: () => wander(img) }
  // );

  // --- Spawn animation
  img.css({
    opacity: 0,
    transform: 'scale(0.5)'
  });
  img.animate(
    { opacity: 1 },
    {
      duration: 400,
      step: function (now, fx) {
        if (fx.prop === "opacity") {
          const scale = 0.5 + now * 0.5;
          $(this).css('transform', `scale(${scale})`);
        }
      },
      complete: function () {
        $(this).css('transform', 'scaleX(1)'); // restore normal facing
        wander(img);
      }
    }
  );

  // poof animation
  const poof = $('<img src="img/misc/poof.gif" class="spawn-poof">');
  poof.css({
    position: 'absolute',
    left: img.css('left'),
    top: img.css('top'),
    width: '31px',
    height: '26px',
    opacity: 1,
    pointerEvents: 'none'
  });
  container.append(poof);
  poof.animate({ opacity: 0, width: '48px', height: '48px' }, 800, () => poof.remove());

  //wander(img);

  // --- Click behavior
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
    S.alpacaClicks++; // 🆕 count clicks
    checkAllAch();
    log("The alpaca got stressed! Happiness -3", "warning");

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

      // Keep inside container and adjust flip
      let flip = vx >= 0 ? 1 : -1;
      if (newLeft < 0 || newLeft > containerWidth - el.width()) {
        newLeft = Math.min(Math.max(newLeft, 0), containerWidth - el.width());
        flip *= -1; // reverse flip if hitting wall
      }

      if (newTop < 0 || newTop > containerHeight - el.height()) {
        newTop = Math.min(Math.max(newTop, 0), containerHeight - el.height());
      }

      el.css({ left: newLeft + 'px', top: newTop + 'px' });

      // ✅ Update depth, scale, opacity, filter dynamically
      updateAlpacaDepthAndScale(el, flip);

      requestAnimationFrame(runAway);
    }

    runAway();
    updateUI();
  });
}

function spawnTrees(count = 15) {
  const container = $('#alpacaImagesContainer');
  const containerWidth = container.width();
  const containerHeight = container.height();

  // Margin from edges
  const margin = 20;

  // Tree size (if consistent)
  const treeSize = 32;

  // Clear old trees if needed
  container.find('.tree').remove();

  const treeImages = [
    'img/misc/tree.png',
    'img/misc/tree2.png'
  ];

  for (let i = 0; i < count; i++) {
    const randomTree = treeImages[Math.floor(Math.random() * treeImages.length)];
    const tree = $('<img class="tree">').attr('src', randomTree);

    // Random position with margin
    const x = margin + Math.random() * (containerWidth - treeSize - 2 * margin);
    const y = margin + Math.random() * (containerHeight - treeSize - 2 * margin);

    tree.css({
      left: `${x}px`,
      top: `${y}px`,
    });

    container.append(tree);
  }
}

// spawn poop
function spawnPoop() {
  const container = $('#alpacaImagesContainer');
  const containerWidth = container.width();
  const containerHeight = container.height();

  //pootAudio.play();

  const poop = $('<img>');
  poop.attr('src', 'img/misc/poop.gif');
  poop.addClass('poop');
  poop.css({
    width: '16px',
    height: '16px',
    position: 'absolute',
    left: Math.random() * (containerWidth - 16) + 'px',
    top: Math.random() * (containerHeight - 16) + 'px',
    cursor: 'pointer'
  });

  // Click to clean up
  poop.click(function() {
    thumpAudio.play();
    $(this).remove();
    S.coins += 1000;   // small coin reward
    addExp(50);      // small exp reward
    S.poopCleaned++; // 🆕
    checkAllAch();
    log("You cleaned up alpaca poop (+1000 coins, +50 exp).", "info");
    autosave();
  });

  container.append(poop);
}

// Schedule poop spawns randomly
// setInterval(() => {
//   if (Math.random() < 0.3) { // 30% chance every check
//     spawnPoop();
//   }
//
//   // if (Math.random() < 0.1 * S.herd) { // with more alpacas, more chance of poop
//   //   spawnPoop();
//   // }
// }, 20000); // check every 20s

function randomPoopSpawn() {
  if (Math.random() < 0.3) { // 30% chance
    spawnPoop();
  }

  // Random delay between 10s and 30s before next check
  const nextDelay = 10000 + Math.random() * 20000;
  setTimeout(randomPoopSpawn, nextDelay);
}

// Start it once
$(document).ready(() => {
  setTimeout(randomPoopSpawn, 5000); // wait 5s before first chance

  //spawnTrees(15);
});

// Penalty if not removed
setInterval(() => {
  $('.poop').each(function() {
    if (!$(this).data('spawnTime')) {
      $(this).data('spawnTime', Date.now());
    }
    const age = Date.now() - $(this).data('spawnTime');
    if (age > 15000) { // older than 15s
      S.happiness = Math.max(0, S.happiness - 5);
      $(this).remove();
    }
  });
}, 5000);

// Actions
function pet() {
  // If already max happiness
  if (S.happiness >= 100) {
    log("Your alpacas are already content and fluffy!", "info");
    return;
  }

  // Calculate diminishing returns with larger herds
  const happinessGain = Math.max(1, 5 - Math.floor(S.herd / 5)); // +5 for small herds, less for big ones
  const expGain = Math.ceil(3 + S.herd * 0.3); // scale XP with herd size

  // Apply effects
  S.happiness = Math.min(100, S.happiness + happinessGain);
  addExp(expGain);
  S.petCount++;  // 🆕 track pets
  checkAllAch();
  log(`You spent time petting your alpacas (+${happinessGain}% happiness, +${expGain} XP).`, "normal");
  autosave();
}


// function pet(){ addExp(5); S.happiness = Math.min(100, S.happiness + 2); log('You pet the alpacas.', "normal"); autosave(); }

function feed() {
  // Cost scales with herd size
  const costPerAlpaca = 25;
  const totalCost = costPerAlpaca * S.herd;

  // If happiness is already maxed
  if (S.happiness >= 100) {
    log("Your alpacas are already perfectly happy!", "info");
    return;
  }

  // Not enough coins
  if (S.coins < totalCost) {
    log(`Not enough coins to feed ${S.herd} alpacas. (${totalCost} needed)`, "error");
    return;
  }

  // Deduct cost
  S.coins -= totalCost;

  // Apply happiness gain (decreasing effect for large herds)
  const happinessGain = Math.max(2, 15 - Math.floor(S.herd / 2));
  S.happiness = Math.min(100, S.happiness + happinessGain);

  // Add experience based on herd size
  const expGain = Math.ceil(S.herd * 1.5);
  addExp(expGain);

  S.feedCount++;  // 🆕 track feedings
  checkAllAch();

  log(`You fed your ${S.herd} alpacas (-${totalCost} coins, +${happinessGain}% happiness).`, "normal");
  autosave();
}


// function feed() {
//   if (S.coins >= 100) {
//   addExp(2);
//   S.happiness = Math.min(100, S.happiness + 8);
//   S.coins -= 100;
//   log('You fed the herd (-100 coins).', "normal");
//   autosave();
//   } else {
//   log("Not enough coins to feed the herd.", "error");
//   }
// }

// function shear(){
//   const base = 1 + Math.floor(S.herd * 0.8) + Math.floor(S.level/2);
//   let mult = 1;
//   S.powerupsActive.forEach(p=>{
//     if(p.id==='double_wool' && p.meta && p.meta.multWool) mult *= p.meta.multWool;
//     if(p.id==='super_shear' && p.meta && p.meta.shearMult) mult *= p.meta.shearMult;
//   });
//   const gained = Math.floor(base * mult);
//   S.wool += gained;
//   addExp(8 + Math.floor(gained/2));
//   log(`Sheared ${gained} wool.`, "normal");
//   checkAllAch();
//   autosave();
// }

function shear() {
  const base = 1 + Math.floor(S.herd * 0.8) + Math.floor(S.level / 2);
  let mult = 1;

  // Apply power-up effects
  S.powerupsActive.forEach(p => {
    if (p.id === 'double_wool' && p.meta && p.meta.multWool) mult *= p.meta.multWool;
    if (p.id === 'super_shear' && p.meta && p.meta.shearMult) mult *= p.meta.shearMult;
  });

  // --- Happiness effect ---
  // Happiness (0–100) directly affects wool yield, with 50% min efficiency.
  // At 100% happiness → full yield, at 0% happiness → 50% yield.

  //const happinessFactor = 0.5 + (S.happiness / 200);
  const happinessFactor = 0.75 + (S.happiness / 100) * 0.75;
  mult *= happinessFactor;

  const gained = Math.floor(base * mult);
  S.wool += gained;

  // --- Pick emoji based on happiness ---
  let moodEmoji = "😐";
  if (S.happiness > 80) moodEmoji = "🥰";
  else if (S.happiness > 50) moodEmoji = "😊";
  else if (S.happiness > 25) moodEmoji = "😟";
  else moodEmoji = "😢";

  // Experience and logging
  addExp(8 + Math.floor(gained / 2));
  // log(`Sheared ${gained} wool ${moodEmoji} (${Math.round(happinessFactor * 100)}% efficiency).`, "normal");
  log(`Sheared ${gained} wool.`, "normal");

  checkAllAch();
  autosave();
}

// function craft(){
//   if(S.wool < 5){ log('Not enough wool to craft (needs 5).', "error"); return; }
//   S.wool -= 5;
//   let sale = 20 + Math.floor(S.level*2);
//
//   S.powerupsActive.forEach(p=>{
//     if(p.id==='coin_bonus' && p.meta && p.meta.coinMult){
//       sale *= p.meta.coinMult;
//     }
//   });
//
//   S.coins += sale; addExp(6); log(`Crafted yarn and sold for ${sale} coins.`, "normal"); checkAllAch(); autosave();
// }

function craft() {
  const woolPerYarn = 5;

  // 🧶 Check if we have enough wool for at least one yarn
  if (S.wool < woolPerYarn) {
    log(`Not enough wool to craft (needs ${woolPerYarn}).`, "error");
    return;
  }

  // ✨ Calculate how many yarns we can make
  const yarnCount = Math.floor(S.wool / woolPerYarn);

  // 🐑 Deduct used wool
  S.wool -= yarnCount * woolPerYarn;

  // 💰 Base sale value per yarn
  let salePerYarn = 20 + Math.floor(S.level * 2);

  // 🪙 Apply powerup multipliers
  S.powerupsActive.forEach(p => {
    if (p.id === 'coin_bonus' && p.meta && p.meta.coinMult) {
      salePerYarn *= p.meta.coinMult;
    }
  });

  // 💵 Total sale amount
  const totalSale = yarnCount * salePerYarn;

  // 📈 Apply rewards
  S.coins += totalSale;
  addExp(6 * yarnCount);

  S.totalCrafted += yarnCount; // 🆕 track total crafted
  log(`Crafted and sold ${yarnCount} yarn for ${totalSale} coins.`, "normal");

  checkAllAch();
  autosave();
}

// function buyAlpaca(){
//   const maxHerd = S.barnLevel * 5; // example cap
//   if(S.herd >= maxHerd){
//   log('Your barn is full! Upgrade to add more alpacas.');
//   return;
//   }
//   const cost = 200 * S.herd;
//   if(S.coins < cost){
//   log('Not enough coins to buy another alpaca.');
//   return;
//   }
//   S.coins -= cost;
//   S.herd++;
//   log('You bought a new alpaca for your farm.');
//   addExp(10);
//   autosave();
//   displayAlpacas(); // update visual display
// }

function buyAlpaca() {
  const maxHerd = S.barnLevel * 5;
  if (S.herd >= maxHerd) {
    log('Your barn is full! Upgrade to add more alpacas.', "error");
    return;
  }

  const cost = 7500 * S.herd;
  if (S.coins < cost) {
    log('Not enough coins to buy another alpaca.', "error");
    return;
  }

  S.coins -= cost;
  S.herd++;
  log('You bought a new alpaca for your farm.', "success");
  addExp(10);
  autosave();

  addSingleAlpaca(); // add only one new alpaca instead of reloading
  $('#displayHerdSize').text(`${S.herd} / ${maxHerd}`);
}

displayAlpacas();

// Upgrades
//function upgradeBarn(){ const cost = 500 * S.barnLevel; if(S.coins < cost){ log('Not enough coins'); return; } S.coins -= cost; S.barnLevel++; log('Barn upgraded. Herd capacity increased.'); autosave(); }

// Update herd size text when barn is upgraded
function upgradeBarn(){
  //const cost = 500 * S.barnLevel;
  //const cost = 1500 * Math.pow(S.barnLevel, 1.5);
  const rawCost = 1500 * Math.pow(S.barnLevel, 1.5);
  const cost = Math.round(rawCost / 50) * 50; // round to nearest 50
  if(S.coins < cost){
    log('Not enough coins', "error");
    return;
  }
  S.coins -= cost;
  S.barnLevel++;
  log('Barn upgraded. Herd capacity increased.', "success");
  upgradeAudio.play();
  autosave();

  // Update herd size display
  const maxHerd = S.barnLevel * 5; // example: 5 alpacas per barn level
  $('#displayHerdSize').text(`${S.herd} / ${maxHerd}`);
}

function upgradeAuto() {
  //const cost = 800 * ((S.autoShearLevel || 0) + 1); // cost scales
  //const level = (S.autoShearLevel || 0) + 1;
  //const cost = Math.floor(1000 * Math.pow(level, 1.8));

  const level = (S.autoShearLevel || 0) + 1;
  const rawCost = 1000 * Math.pow(level, 1.8);
  const cost = Math.round(rawCost / 50) * 50; // round to nearest 50

  if (S.coins < cost) {
    log('Not enough coins', "error");
    return;
  }
  S.coins -= cost;
  S.autoShearLevel = (S.autoShearLevel || 0) + 1;
  log(`You bought a shearing robot! Idle wool increased (robots: ${S.autoShearLevel}).`, "success");
  robotAudio.play();
  checkAllAch();
  autosave();
}

// Power-ups
function buyPowerup(id){ const item = STORE.find(p=>p.id===id); if(!item) return; if(S.coins < item.cost){ log('Not enough coins for power-up.', "error"); return; }
  S.coins -= item.cost; const ends = Date.now() + item.duration*1000;
  const instance = {id:item.id, ends:ends, meta:item.apply(S)}; S.powerupsActive.push(instance); S.powerupsUsed = (S.powerupsUsed||0)+1; log(`Activated power-up: ${item.title} (${item.duration}s)`, "info");
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
  let rate = 0; // if you disabled natural idle wool

  // permanent robots
  if (S.autoShearLevel) {
    rate += 0.5 * S.autoShearLevel; // each robot adds +0.5 wool/sec
  }

  // temporary auto-shear powerup
  S.powerupsActive.forEach(p => {
    if (p.id === 'auto_shear') rate += 1.0;  // adds on top of robots
    if (p.id === 'double_wool') rate *= 2;
    if (p.meta && p.meta.multWool) rate *= p.meta.multWool;
  });

  const amount = rate * dtSec;
  S.wool += amount;

  $('#idleRate').attr('data-title', rate.toFixed(2) + "/s");

  // NEW: Auto-Craft effect
  // if (S.powerupsActive.some(p => p.id === 'auto_craft')) {
  //   const crafts = Math.floor(S.wool / 5); // every 5 wool
  //   if(crafts > 0){
  //     const sale = 20 + Math.floor(S.level*2);
  //     const crafted = Math.min(crafts, 1); // craft at most once per tick
  //     S.wool -= 5 * crafted;
  //     S.coins += sale * crafted;
  //     addExp(6 * crafted);
  //     log(`Auto-crafted yarn and sold for ${sale * crafted} coins.`);
  //   }
  // }
  if (S.powerupsActive.some(p => p.id === 'auto_craft')) {
    const crafts = Math.floor(S.wool / 5); // 5 wool = 1 yarn
    if (crafts > 0) {
      // 🏡 Cap increases with barn level
      const maxPerTick = 5 + (S.barnLevel * 2);
      const crafted = Math.min(crafts, maxPerTick);

      // Base sale value
      let sale = 20 + Math.floor(S.level * 2);

      // Check for coin bonus powerups
      S.powerupsActive.forEach(p => {
        if (p.id === 'coin_bonus' && p.meta && p.meta.coinMult) {
          sale *= p.meta.coinMult;
        }
      });

      // Apply crafting
      S.wool -= 5 * crafted;
      const totalSale = sale * crafted;
      S.coins += totalSale;
      addExp(6 * crafted);

      //log(`Auto-crafted ${crafted} yarn and sold for ${totalSale} coins.`, "info");
    }
  }

  // happiness slowly decays if not fed
  S.happiness = Math.max(0, S.happiness - dtSec*0.05);
  //addExp( Math.floor(dtSec * 0.2) );
  //addExp(dtSec * 0.2);
}

// achievements
function checkAllAch(){
  ACH_DEFS.forEach(a=>{
    if(!S.achievements[a.id] && a.check(S)){
      S.achievements[a.id] = {unlocked:true, time:Date.now()}; S.unlockedAch.push(a.id);
      log(`Achievement unlocked: ${a.title}`, "success");
      // small reward
      // S.coins += 100; S.wool += 10; updateUI();
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
  if(p.id==='auto_craft') return S.level >= 12;
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

// alpaca time
const GAME_START = new Date(); // your game’s "day 1" reference
const REAL_MINUTES_PER_DAY = 10; // adjust for pacing
let lastLoggedDay = 0;
const dayMessages = [
  "🌞 A new alpaca day begins!",
  "☁️ The alpacas yawn and stretch.",
  "🌤️ Another peaceful morning on the farm.",
  "🌾 The fields shimmer under the morning sun.",
];

function updateTimeDisplay() {
  const now = new Date();
  const elapsedMs = now - GAME_START;

  // Calculate in-game day
  const realMsPerDay = REAL_MINUTES_PER_DAY * 60 * 1000;
  const dayNumber = Math.floor(elapsedMs / realMsPerDay) + 1;

  // 🌙 Calculate progress through the current in-game day (0 → 1)
  const dayProgress = (elapsedMs % realMsPerDay) / realMsPerDay;

  // log once when a new day starts
  if (dayNumber !== lastLoggedDay) {
    if (lastLoggedDay !== 0) { // skip logging on very first update
      //log(`🌞 A new alpaca day begins! (Day ${dayNumber})`, "info");
      log(`${dayMessages[Math.floor(Math.random() * dayMessages.length)]} (Day ${dayNumber})`, "info");
    }
    lastLoggedDay = dayNumber;
  }

  // Format real-world time (for flavor)
  const timeString = now.toLocaleTimeString([], { hour12: false }); // e.g. 14:23:08

  // Update display
  $('#timeDisplay').text(`Day ${dayNumber} — ${timeString}`);

  // 🌗 Update day/night overlay tint
  //updateDayNightCycle(dayProgress);
}

function updateDayNightCycle(dayProgress) {
  let opacity = 0;

  if (dayProgress < 0.25) {
    // early morning
    opacity = dayProgress * 1.2;
  } else if (dayProgress < 0.5) {
    // day
    opacity = 0;
  } else if (dayProgress < 0.75) {
    // evening to night
    opacity = (dayProgress - 0.5) * 1.8;
  } else {
    // night to dawn
    opacity = (1 - dayProgress) * 1.8;
  }

  // Clamp between 0 and 0.6
  opacity = Math.min(Math.max(opacity, 0), 0.6);

  $('#nightOverlay').css('background', `rgba(0, 0, 50, ${opacity})`);
}

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
  //$('#idleRate').text((S.idleBase * S.herd * (1 + (S.barnLevel-1)*0.2) + (S.autoShear?0.5:0)).toFixed(2));
  $('#versionDisplay').text(`Version: ${GAME_VERSION}`);
  //$('#timeDisplay').text(new Date().toLocaleString());

  //$('#idleRate').attr('data-title', (S.idleBase * S.herd * (1 + (S.barnLevel-1)*0.2) + (S.autoShear?0.5:0)).toFixed(2) + "/s");

  //const alpacaCost = 200 * S.herd;
  const alpacaCost = 7500 * S.herd;
  //$('#buyAlpacaBtn').text(`Buy Alpaca (${alpacaCost} coins)`);
  $('#buyAlpacaBtn').attr('data-title', `Cost ${formatNumber(alpacaCost)} coins`);

  //const barnCost = 500 * S.barnLevel;
  const barnRawCost = 1500 * Math.pow(S.barnLevel, 1.5);
  const barnCost = Math.round(barnRawCost / 50) * 50; // round to nearest 50
  $('#upgradeBarn').attr('data-title', `Cost ${formatNumber(barnCost)} coins`);

  //const autoCost = 800 * ((S.autoShearLevel || 0) + 1);
  const autoCostlevel = (S.autoShearLevel || 0) + 1;
  const autoRawCost = 1000 * Math.pow(autoCostlevel, 1.8);
  const autoCost = Math.round(autoRawCost / 50) * 50; // round to nearest 50
  $('#upgradeAuto').attr('data-title', `Cost ${formatNumber(autoCost)} coins`);

  const costPerAlpaca = 25;
  const totalFeedCost = costPerAlpaca * S.herd;
  $('#feedBtn').attr('data-title', `Cost ${formatNumber(totalFeedCost)} coins`);

  updateStoreUI();
}

// call once on page load to create the store DOM (one-time)
function initStoreUI(){
  const store = $('#storeArea');
  store.empty();

  // create one card for every power-up in STORE (we'll show/hide by availability)
  STORE.forEach(p=>{
    const $card = $(`
      <div class="power" data-id="${p.id}">
        <div style="font-weight:700">${p.title}</div>
        <small>Duration: ${p.duration}s</small>
        <div style="margin-top:6px"><b><img src="img/icons/coin.png"> <span class="powerCost">${p.cost}</span></b></div>
        <div style="margin-top:6px">
          <button class="btn powerBuyBtn" data-buy="${p.id}"><span class="btnLabel">Buy</span></button>
        </div>
      </div>
    `);
    store.append($card);
  });

  // set initial state
  updateStoreUI();
}

// called often (e.g. from updateUI), updates labels/disabled state WITHOUT rebuilding DOM
function updateStoreUI(){
  const availableIds = getAvailablePowerups().map(x => x.id);

  STORE.forEach(p=>{
    const $card = $(`#storeArea .power[data-id="${p.id}"]`);
    if($card.length === 0) return;

    // show or hide based on availability (level / unlocks)
    const isAvailable = availableIds.includes(p.id);
    if(!isAvailable){
      $card.hide();
      return;
    } else {
      $card.show();
    }

    // update cost (in case you scale it)
    $card.find('.powerCost').text(p.cost);

    // active?
    const active = S.powerupsActive.find(x => x.id === p.id);

    const $btn = $card.find('button[data-buy]');
    const $label = $btn.find('.btnLabel');

    if(active && active.ends){
      const remaining = Math.max(0, Math.ceil((active.ends - Date.now()) / 1000));
      $label.text(remaining > 0 ? `${remaining}s left` : 'Buy');
      $btn.prop('disabled', true);
      $card.css({'opacity':'0.6','pointer-events':'none'});
    } else {
      // not active -> set buy label and disable if unaffordable
      $label.text('Buy');
      const affordable = S.coins >= p.cost;
      $btn.prop('disabled', !affordable);
      if(!affordable){
        $card.css({'opacity':'0.6','pointer-events':'none'});
      } else {
        $card.css({'opacity':'','pointer-events':''});
      }
    }
  });
}

// // main loop (1s)
// let last = Date.now();
// setInterval(()=>{
//   const now = Date.now();
//   const dt = (now - last)/1000; if(dt>5) dt=1; // clamp giant gaps
//   tick(dt); applyPowerupEffects(); last = now; updateUI();
// },1000);


// Main loop
let last = Date.now();
let mainLoop = null;

function startMainLoop() {
  // Prevent multiple intervals stacking
  if (mainLoop) clearInterval(mainLoop);

  last = Date.now(); // reset timing reference
  mainLoop = setInterval(() => {
    const now = Date.now();
    let dt = (now - last) / 1000;
    if (dt > 5) dt = 1; // clamp giant gaps to 1s

    // Track active playtime
    S.playTime += dt;

    // Track power-up active time (any powerup running)
    if (S.powerupsActive && S.powerupsActive.length > 0) {
      S.totalPowerupTime += dt;
    }

    tick(dt);
    applyPowerupEffects();
    last = now;
    updateUI();
  }, 1000);
}

function stopMainLoop() {
  if (mainLoop) {
    clearInterval(mainLoop);
    mainLoop = null;
  }
}

// Start it initially
//startMainLoop();

// check if user leaves tab/comes back
// document.addEventListener("visibilitychange", () => {
//   if (document.hidden) {
//     console.log("⏸️ Tab inactive — stopping loop");
//     S.lastPlayed = Date.now();
//     stopMainLoop();
//   } else {
//     console.log("▶️ Tab active again");
//
//     const now = Date.now();
//     const diff = (now - S.lastPlayed) / 1000;
//
//     if (diff > 5) {
//       tick(diff); // simulate offline gains
//       //log(`While you were away, your herd produced wool for ${Math.floor(diff)} seconds 🦙✨`, "info");
//       //log(`Time Warp: You caught up on ${Math.floor(diff)} seconds of wool production 🦙✨`, "info");
//       log(`The herd was busy: Produced wool for ${Math.floor(diff)} seconds 🦙✨`, "info");
//       updateUI();
//     }
//
//     startMainLoop(); // restart ticking
//     S.lastPlayed = now;
//   }
// });

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    // mute audio
    //allAudio.forEach(a => { if (a) a.muted = true; });

    S.lastPlayed = Date.now();
    stopMainLoop();
  } else {
    // unmute audio
    //allAudio.forEach(a => { if (a) a.muted = S.isMuted; });

    const now = Date.now();
    const diff = (now - S.lastPlayed) / 1000;

    if (diff > 5) {
      tick(diff); // simulate offline gains

      // ✅ Only log if auto shear or powerups are active
      const hasRobot = S.autoShearLevel && S.autoShearLevel > 0;
      const hasActivePowerup = S.powerupsActive && S.powerupsActive.length > 0;

      if (hasRobot || hasActivePowerup) {
        // Count one offline return
        S.offlineTicks = (S.offlineTicks || 0) + 1;
        log(`The herd was busy: Produced wool for ${Math.floor(diff)} seconds.`, "info");
      }

      updateUI();
    }

    startMainLoop();
    S.lastPlayed = now;
  }
});

// cleanup expired powerups often
setInterval(()=>{ applyPowerupEffects(); }, 2000);

let timeTimer;

// UI wiring
function initGame(){
  updateUI();
  initStoreUI();
  scheduleAmbientMessages();
  // attach buttons
  $('#petBtn').click(()=>{ pet(); updateUI(); });
  $('#feedBtn').click(()=>{ feed(); updateUI(); });
  $('#shearBtn').click(()=>{ shear(); updateUI(); });
  $('#craftBtn').click(()=>{ craft(); updateUI(); });
  $('#buyAlpacaBtn').click(()=>{ buyAlpaca(); updateUI(); });
  $('#upgradeBarn').click(()=>{ upgradeBarn(); updateUI(); });
  $('#upgradeAuto').click(()=>{ upgradeAuto(); updateUI(); });

  // play bg Audio
  bgAudio.play();
  alpacaAudio.play();

  setAllAudioMuted(S.isMuted);
  $('#mute-btn').toggleClass('sound-off', S.isMuted);

  // --- Start your farm clock ---
  if (timeTimer) clearInterval(timeTimer); // prevent duplicates
  updateTimeDisplay(); // show it immediately
  timeTimer = setInterval(updateTimeDisplay, 1000); // then update every second

  // store buy
  $('#storeArea').on('click','button[data-buy]', function(){ const id=$(this).data('buy'); buyPowerup(id); updateUI(); });

  // initial achievements check
  checkAllAch();
  // autosave every 10s
  if(autosaveTimer) clearInterval(autosaveTimer);
  autosaveTimer = setInterval(()=>{ saveState(); }, 10000);
}

const assets = [
  // Alpacas
  'img/alpacas/alpaca.png',
  'img/alpacas/alpaca3.png',
  'img/alpacas/black.gif',
  'img/alpacas/brown.gif',
  'img/alpacas/brown2.gif',
  'img/alpacas/brown3.gif',
  'img/alpacas/white.gif',
  'img/alpacas/white2.gif',
  'img/alpacas/pink.gif',
  // UI
  'img/buttons/about.png',
  'img/buttons/about-pressed.png',
  'img/buttons/reset.png',
  'img/buttons/reset-pressed.png',
  'img/buttons/small-bar.png',
  'img/buttons/small-bar-pressed.png',
  'img/buttons/sound-off.png',
  'img/buttons/sound-off-pressed.png',
  'img/buttons/sound-on.png',
  'img/buttons/sound-on-pressed.png',
  'img/buttons/trophy.png',
  'img/buttons/trophy-pressed.png',
  'img/icons/coin.png',
  'img/icons/heart.png',
  'img/icons/wool3.png',
  'img/misc/fence.png',
  'img/misc/hand-cursor.png',
  'img/misc/pointer-cursor.png',
  'img/misc/poop.png',
  'img/misc/paddock-bg-final3.png',
  'img/misc/tree.png',
  'img/misc/tree2.png',
  'img/misc/bush.png',
  'img/misc/barn.png',
  'img/misc/light.png',
  // Sounds
  'audio/bg.ogg',
  'audio/alpaca-noise4.mp3',
  'audio/alpaca-noise3.mp3',
  'audio/pop.mp3',
  'audio/thump.mp3',
  'audio/poot.mp3',
  'audio/upgrade.mp3',
  'audio/robot.mp3',
  'audio/poof.wav',
  'audio/level-up.mp3',
  'audio/notification.mp3',
];

// preload assets
function preloadAssets(assets, onComplete, onProgress) {
  let loaded = 0;
  const total = assets.length;

  if (total === 0) {
    onComplete();
    return;
  }

  assets.forEach((asset) => {
    const ext = asset.split('.').pop().toLowerCase();
    let element;

    if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) {
      element = new Image();
      element.onload = element.onerror = handleLoad;
      element.src = asset;
    } else if (['mp3', 'ogg', 'wav'].includes(ext)) {
      element = new Audio();
      element.oncanplaythrough = element.onerror = handleLoad;
      element.src = asset;
      element.load();
    } else {
      // Unknown asset type, skip but count it as loaded
      handleLoad();
    }
  });

  function handleLoad() {
    loaded++;
    if (onProgress) onProgress(loaded, total);
    if (loaded >= total && onComplete) onComplete();
  }
}

$(document).ready(() => {
  // preloadAssets(assetList, () => {
  //   $('#loadingScreen').fadeOut(500);
  //   initGame();
  // }, (loaded, total) => {
  //   const percent = Math.floor((loaded / total) * 100);
  //   $('.loading-fill').css('width', percent + '%');
  //   $('.loading-text').text(`Loading... ${percent}%`);
  // });

  // preloadAssets(assetList, () => {
  //   // Artificial delay for testing
  //   setTimeout(() => {
  //     $('#loadingScreen').fadeOut(500);
  //     initGame();
  //   }, 2000); // 2000ms = 2 seconds
  // }, (loaded, total) => {
  //   const percent = Math.floor((loaded / total) * 100);
  //   $('.loading-fill').css('width', percent + '%');
  //   $('.loading-text').text(`Loading... ${percent}%`);
  // });

  preloadAssets(assets, () => {
    //console.log("✅ All assets loaded");
    $('#loadingScreen').fadeOut(500);
    initGame();
    startMainLoop();
  }, (loaded, total) => {
    //console.log(`Progress: ${loaded}/${total}`);
    const percent = Math.floor((loaded / total) * 100);
    $('.loading-fill').css('width', percent + '%');
    $('.loading-text').text(`Loading... ${percent}%`);
  });
});

// prevent right click
$(document).on("contextmenu", function(e) {
  e.preventDefault();
});

// Sound button
$('#mute-btn').on('click', function () {
  S.isMuted = !S.isMuted;
  setAllAudioMuted(S.isMuted);
  $(this).toggleClass('sound-off', S.isMuted);
  autosave();
});

// Achievements button
function buildAchievementList() {
  // Create a wrapper div with a fixed height and scroll
  const wrapper = document.createElement('div');
  wrapper.style.maxHeight = '300px';   // adjust as needed
  wrapper.style.overflowY = 'auto';
  wrapper.style.paddingRight = '6px';  // prevent scrollbar overlap

  const $list = $('<div id="achList" class="ach-list"></div>').appendTo(wrapper);

  ACH_DEFS.forEach(a => {
    const unlocked = !!S.achievements[a.id];
    $list.append(`
      <div class="ach ${unlocked ? 'unlocked' : 'locked'}">
        <span class="ach-icon">
          ${unlocked ? '🏆' : '🔒'}
        </span>
        <div class="ach-text">
          <b>${a.title}</b><br>
          <span class="muted">${a.desc}</span>
        </div>
      </div>
    `);
  });

  return wrapper;
}

$('#achiev-btn').click(function() {
  swal({
    title: 'Achievements',
    content: buildAchievementList(),
    button: 'Close',
  });
});

// About button
function buildHelpText() {
  // Create a wrapper div with a fixed height and scroll
  const wrapper = document.createElement('div');
  wrapper.style.maxHeight = '300px';   // adjust as needed
  wrapper.style.overflowY = 'auto';
  wrapper.style.paddingRight = '6px';  // prevent scrollbar overlap
  wrapper.style.textAlign = 'left';    // optional, keeps it clean in Swal

  const helpText = $(`
    <div>
      <h3>Welcome to Alpaca Valley</h3>
      <p>Care for your herd, collect wool, craft yarn, and expand your farm as you grow.</p>

      <ul style="padding-left:18px; margin-top:8px;">
        <li><b>Pet</b> your alpacas to raise their happiness and earn experience.</li>
        <li><b>Feed</b> them to keep their mood high and boost production.</li>
        <li><b>Shear</b> your herd to gather wool — the happier they are, the more they produce.</li>
        <li><b>Craft Yarn</b> from wool and sell it for coins.</li>
        <li><b>Buy Alpacas</b> to grow your herd.</li>
        <li><b>Upgrade</b> your barn and robots to increase capacity and automate production.</li>
        <li><b>Activate Power-Ups</b> for temporary boosts.</li>
      </ul>

      <p style="margin-top:10px;"><i>Keep your alpacas happy, expand your valley, and rule the fluff!</i></p>

      <hr style="margin:10px 0; border:none; border-top:1px dashed #6c5671;">
      <p>
        This game was created by <a href="https://kimandesson.se/" target="_blank">Kim Andersson</a> as a passion project combining chill gameplay, cute aesthetics, and lighthearted humor.<br><br>
        🎮 Version: ${GAME_VERSION}<br>
        💡 Made with HTML, CSS, JavaScript, and love.<br>
        🐾 Feedback & ideas are always welcome!<br><br>
        Thanks for playing!
      </p>
    </div>
  `).appendTo(wrapper);

  return wrapper;
}

$('#about-btn').click(function() {
  swal({
  title: 'About Alpaca Valley',
  content: buildHelpText(),
  // text: `Welcome to Alpaca Valley — a cozy little world full of fluffy friends!
  //
  // This game was created by Kim Andersson as a passion project combining chill gameplay, cute aesthetics, and lighthearted humor.
  //
  // 🎮 Version: 0.0.8
  // 💡 Made with HTML, CSS, JavaScript, and love.
  // 🐾 Feedback & ideas are always welcome!
  //
  // Thanks for playing!`,
    button: 'Close',
  });
});

// Reset button
let isResetting = false;

$('#reset-btn').click(function() {
  swal({
    title: "Reset Game?",
    text: "Are you sure you want to reset your farm? All progress will be lost!",
    buttons: true,
  }).then((willReset) => {
    if (willReset) {
      isResetting = true;
      localStorage.removeItem('alpaca_save');
      location.reload();
    }
  });
});

window.addEventListener('beforeunload', ()=>{
  if (!isResetting) saveState();
});
