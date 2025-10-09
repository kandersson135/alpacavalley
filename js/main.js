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
  achievements:{}, unlockedAch:[], lastTick:Date.now(), lastPlayed:Date.now()
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
  {id:'use_10_power', title:'Power User', desc:'Use 10 power-ups', check: s=>s.powerupsUsed>=10}
];

// New power-ups store
const STORE = [
  {id:'double_wool', title:'Double Wool', cost:100, duration:30, apply: s=>({multWool:2})},
  //{id:'auto_shear', title:'Auto-Shear', cost:200, duration:60, apply: s=>({autoShear:true})},
  {id:'auto_shear', title:'Auto-Shear', cost:200, duration:60, apply: s=>({})},
  {id:'coin_bonus', title:'Coin Bonus', cost:180, duration:30, apply: s=>({coinMult:2})},
  {id:'happy_boost', title:'Happiness Boost', cost:120, duration:30, apply: s=>({happyAdd:20})},
  {id:'super_shear', title:'Super Shear', cost:250, duration:30, apply: s=>({shearMult:3})},
  {id:'auto_craft', title:'Auto-Craft', cost:300, duration:60, apply: s=>({autoCraft:true})}
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
    S.coins += 100;   // small coin reward
    addExp(5);      // small exp reward
    log("You cleaned up alpaca poop (+100 coins, +5 exp).", "info");
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
function pet(){ addExp(5); S.happiness = Math.min(100, S.happiness + 2); log('You pet the alpacas.', "normal"); autosave(); }

function feed() {
  if (S.coins >= 5) {
  addExp(2);
  S.happiness = Math.min(100, S.happiness + 8);
  S.coins -= 5;
  log('You fed the herd (-5 coins).', "normal");
  autosave();
  } else {
  log("Not enough coins to feed the herd.", "error");
  }
}

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

function craft(){
  if(S.wool < 5){ log('Not enough wool to craft (needs 5).', "error"); return; }
  S.wool -= 5;
  let sale = 20 + Math.floor(S.level*2);

  S.powerupsActive.forEach(p=>{
    if(p.id==='coin_bonus' && p.meta && p.meta.coinMult){
      sale *= p.meta.coinMult;
    }
  });

  S.coins += sale; addExp(6); log(`Crafted yarn and sold for ${sale} coins.`, "normal"); checkAllAch(); autosave();
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

  const cost = 200 * S.herd;
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
  const cost = 500 * S.barnLevel;
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
  const cost = 800 * ((S.autoShearLevel || 0) + 1); // cost scales
  if (S.coins < cost) {
    log('Not enough coins', "error");
    return;
  }
  S.coins -= cost;
  S.autoShearLevel = (S.autoShearLevel || 0) + 1;
  log(`You bought a shearing robot! Idle wool increased (robots: ${S.autoShearLevel}).`, "success");
  robotAudio.play();
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
      log(`Achievement unlocked: ${a.title}`, "success");
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
  $('#versionDisplay').text("Version: 0.0.8");
  //$('#timeDisplay').text(new Date().toLocaleString());

  //$('#idleRate').attr('data-title', (S.idleBase * S.herd * (1 + (S.barnLevel-1)*0.2) + (S.autoShear?0.5:0)).toFixed(2) + "/s");

  const alpacaCost = 200 * S.herd;
  //$('#buyAlpacaBtn').text(`Buy Alpaca (${alpacaCost} coins)`);
  $('#buyAlpacaBtn').attr('data-title', `Cost ${alpacaCost} coins`);

  const barnCost = 500 * S.barnLevel;
  $('#upgradeBarn').attr('data-title', `Cost ${barnCost} coins`);

  const autoCost = 800 * ((S.autoShearLevel || 0) + 1);
  $('#upgradeAuto').attr('data-title', `Cost ${autoCost} coins`);

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
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    console.log("⏸️ Tab inactive — stopping loop");
    S.lastPlayed = Date.now();
    stopMainLoop();
  } else {
    console.log("▶️ Tab active again");

    const now = Date.now();
    const diff = (now - S.lastPlayed) / 1000;

    if (diff > 5) {
      tick(diff); // simulate offline gains
      //log(`While you were away, your herd produced wool for ${Math.floor(diff)} seconds 🦙✨`, "info");
      //log(`Time Warp: You caught up on ${Math.floor(diff)} seconds of wool production 🦙✨`, "info");
      log(`The herd was busy: Produced wool for ${Math.floor(diff)} seconds 🦙✨`, "info");
      updateUI();
    }

    startMainLoop(); // restart ticking
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
$('#mute-btn').click(function() {
  if (bgAudio.muted) {
    bgAudio.muted = false;
    alpacaAudio.muted = false;
    alpacaNoise.muted = false;
    popAudio.muted = false;
    thumpAudio.muted = false;
    pootAudio.muted = false;
    spawnAudio.muted = false;
    upgradeAuto.muted = false;
    robotAudio.muted = false;
    levelupAudio.muted = false;
    $(this).removeClass('sound-off');
    //$(this).text('Sound off');
  } else {
    bgAudio.muted = true;
    alpacaAudio.muted = true;
    alpacaNoise.muted = true;
    popAudio.muted = true;
    thumpAudio.muted = true;
    pootAudio.muted = true;
    spawnAudio.muted = true;
    upgradeAudio.muted = true;
    robotAudio.muted = true;
    levelupAudio.muted = true;
    $(this).addClass('sound-off');
    //$(this).text('Sound on');
  }
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
$('#about-btn').click(function() {
  swal({
  title: 'About Alpaca Valley',
  text: `Welcome to Alpaca Valley — a cozy little world full of fluffy friends!

  This game was created by Kim Andersson as a passion project combining chill gameplay, cute aesthetics, and lighthearted humor.

  🎮 Version: 0.0.8
  💡 Made with HTML, CSS, JavaScript, and love.
  🐾 Feedback & ideas are always welcome!

  Thanks for playing!`,
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
