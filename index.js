const mineflayer = require('mineflayer');
const express = require('express');

// ============ CONFIGURATION - CHANGE KARO AGAR ZAROORAT HO ============
const CONFIG = {
  host: 'funark.aternos.me',
  port: 57003,
  username: 'FunarkBot',      // Bot ka naam - apne hisaab se badlo
  version: '1.21.11',          // EXACT version jo aapne bataya
  auth: 'offline'              // Aternos offline server hai
};

// Backup version agar 1.21.11 kaam na kare
const FALLBACK_VERSION = '1.21';

// ============ WEBSERVER (Render ke liye) ============
const app = express();
const PORT = process.env.PORT || 10000;

app.get('/', (req, res) => {
  res.json({ 
    status: 'online',
    server: `${CONFIG.host}:${CONFIG.port}`,
    version: CONFIG.version,
    uptime: Math.floor(process.uptime()) + 's',
    mobs_killed: stats.mobsKilled || 0
  });
});

app.listen(PORT, () => {
  console.log(`[WebServer] ✅ Status page running on port ${PORT}`);
});

// ============ STATS ============
const stats = {
  mobsKilled: 0,
  startTime: Date.now()
};

// ============ CREATE BOT FUNCTION ============
function createBot(versionToUse) {
  const ver = versionToUse || CONFIG.version;
  
  console.log(`[Bot] 🔌 Connecting to ${CONFIG.host}:${CONFIG.port}`);
  console.log(`[Bot] 📌 Using Minecraft version: ${ver}`);
  
  const bot = mineflayer.createBot({
    host: CONFIG.host,
    port: CONFIG.port,
    username: CONFIG.username,
    version: ver,
    auth: CONFIG.auth,
    viewDistance: 'far',
    hideErrors: false
  });

  // ---- EVENT: LOGIN ----
  bot.on('login', () => {
    console.log(`[Bot] ✅ Logged in as ${bot.username}`);
    console.log(`[Bot] 🌐 Server: ${CONFIG.host}:${CONFIG.port}`);
    console.log(`[Bot] 🎯 Version: ${ver}`);
  });

  // ---- EVENT: SPAWN ----
  bot.on('spawn', () => {
    console.log(`[Bot] ✅ Spawned in the world!`);
    console.log(`[Bot] 🤖 All systems active! Killing mobs now...`);
    startBotLoops(bot);
  });

  // ---- EVENT: ERROR ----
  bot.on('error', (err) => {
    console.log(`[Bot] ❌ Error: ${err.message}`);
  });

  // ---- EVENT: DISCONNECT ----
  bot.on('end', (reason) => {
    console.log(`[Bot] ⚠️ Disconnected: ${reason || 'unknown'}`);
    console.log(`[Bot] 🔄 Reconnecting in 5 seconds...`);
    setTimeout(() => reconnectWithFallback(), 5000);
  });

  // ---- EVENT: KICKED ----
  bot.on('kicked', (reason, extra) => {
    console.log(`[Bot] 👢 Kicked: ${reason || extra || 'unknown'}`);
    console.log(`[Bot] 🔄 Reconnecting in 5 seconds...`);
    setTimeout(() => reconnectWithFallback(), 5000);
  });

  // ---- EVENT: CHAT ----
  bot.on('chat', (username, message) => {
    if (username === bot.username) return;
    
    // Admin commands
    if (message.startsWith('!')) {
      const cmd = message.slice(1).toLowerCase();
      
      if (cmd === 'stats') {
        bot.chat(`Stats: Killed ${stats.mobsKilled} mobs | Uptime: ${Math.floor((Date.now() - stats.startTime)/60000)}min`);
      }
      if (cmd === 'come') {
        const player = bot.players[username];
        if (player && player.entity) {
          bot.chat(`Coming to you ${username}!`);
          // Simple path follow
          bot.pathfinder?.goto(player.entity.position);
        }
      }
      if (cmd === 'stop') {
        attacking = false;
        bot.chat(`Stopped attacking. Type !start to resume.`);
      }
      if (cmd === 'start') {
        attacking = true;
        bot.chat(`Resumed attacking!`);
      }
    }
  });

  return bot;
}

// ============ BOT LOOPS (All logic) ============
let attacking = true;
let currentBot = null;

function startBotLoops(bot) {
  currentBot = bot;

  // === MAIN LOOP: Attack mobs har 500ms ===
  const attackLoop = setInterval(() => {
    if (!bot || !bot.entity || !attacking) return;
    
    try {
      const mob = findNearestHostileMob(bot);
      if (mob) {
        attackMob(bot, mob);
      }
    } catch(e) {
      // ignore
    }
  }, 500);

  // === AUTO EAT: Har 10 seconds ===
  const eatLoop = setInterval(() => {
    if (!bot || !bot.entity) return;
    try { autoEat(bot); } catch(e) {}
  }, 10000);

  // === ANTI AFK: Har 40 seconds ===
  const afkLoop = setInterval(() => {
    if (!bot || !bot.entity) return;
    try { antiAfk(bot); } catch(e) {}
  }, 40000);

  // === EQUIP BEST WEAPON: Har 15 seconds ===
  const equipLoop = setInterval(() => {
    if (!bot || !bot.entity) return;
    try { equipBestWeapon(bot); } catch(e) {}
  }, 15000);

  // === COLLECT WOOD: Har 5 minutes ===
  const woodLoop = setInterval(() => {
    if (!bot || !bot.entity) return;
    try { collectWood(bot); } catch(e) {}
  }, 300000);

  // === HEALTH REGEN CHECK: Har 2 seconds ===
  const healthLoop = setInterval(() => {
    if (!bot || !bot.entity) return;
    try {
      if (bot.health < 10) {
        console.log(`[❤️] Low health: ${bot.health}/20 - Retreating!`);
        // Random movement se bachna
        const dirs = ['forward', 'back', 'left', 'right'];
        bot.setControlState(dirs[Math.floor(Math.random()*4)], true);
        setTimeout(() => {
          dirs.forEach(d => bot.setControlState(d, false));
        }, 2000);
      }
    } catch(e) {}
  }, 2000);

  // Clean up intervals on disconnect
  bot.on('end', () => {
    clearInterval(attackLoop);
    clearInterval(eatLoop);
    clearInterval(afkLoop);
    clearInterval(equipLoop);
    clearInterval(woodLoop);
    clearInterval(healthLoop);
  });
}

// ============ HELPER FUNCTIONS ============

function findNearestHostileMob(bot) {
  const hostileMobs = [
    'zombie', 'skeleton', 'creeper', 'spider', 'enderman',
    'witch', 'phantom', 'husk', 'stray', 'drowned',
    'slime', 'magma_cube', 'blaze', 'ghast', 'piglin',
    'hoglin', 'zoglin', 'pillager', 'vindicator', 'evoker',
    'ravager', 'vex', 'guardian', 'elder_guardian',
    'cave_spider', 'wither_skeleton', 'shulker', 'silverfish',
    'endermite', 'bee', 'polar_bear', 'llama',
    'bogged', 'breeze', 'spider_jockey'
  ];

  return bot.nearestEntity(entity => {
    return entity && 
           entity.type === 'mob' && 
           hostileMobs.includes(entity.name) &&
           entity.position && 
           bot.entity &&
           bot.entity.position &&
           bot.entity.position.distanceTo(entity.position) < 12 &&
           entity.health > 0;
  }, {
    maxDistance: 12
  });
}

function attackMob(bot, mob) {
  if (!mob || !mob.position) return;
  
  const dist = bot.entity.position.distanceTo(mob.position);
  
  if (dist < 5) {
    // Close enough - attack directly
    bot.lookAt(mob.position.offset(0, 1.2, 0), true, () => {
      bot.attack(mob);
      stats.mobsKilled++;
    });
  } else {
    // Move closer
    bot.lookAt(mob.position, true);
    
    // Simple pathfind towards mob
    const dx = mob.position.x - bot.entity.position.x;
    const dz = mob.position.z - bot.entity.position.z;
    const len = Math.sqrt(dx*dx + dz*dz);
    
    if (len > 0) {
      bot.setControlState('forward', true);
      bot.look(Math.atan2(-dx, dz), 0, true);
      
      setTimeout(() => {
        bot.setControlState('forward', false);
      }, 800);
    }
  }
}

function equipBestWeapon(bot) {
  // Search for best weapon in inventory
  const weapons = bot.inventory.items().filter(item => 
    item && (
      item.name.includes('sword') || 
      item.name.includes('axe') ||
      item.name.includes('mace') ||
      item.name.includes('spear')  // New 1.21.11 weapon!
    )
  );
  
  if (weapons.length > 0) {
    // Sort by damage potential
    const best = weapons.sort((a, b) => {
      const aVal = a.name.includes('netherite') ? 10 : 
                   a.name.includes('diamond') ? 8 :
                   a.name.includes('iron') ? 6 :
                   a.name.includes('stone') ? 4 :
                   a.name.includes('wooden') ? 2 : 1;
      const bVal = b.name.includes('netherite') ? 10 : 
                   b.name.includes('diamond') ? 8 :
                   b.name.includes('iron') ? 6 :
                   b.name.includes('stone') ? 4 :
                   b.name.includes('wooden') ? 2 : 1;
      return bVal - aVal;
    })[0];
    
    bot.equip(best, 'hand', (err) => {
      if (!err) {
        // Only log if weapon changed
      }
    });
  } else {
    // Try to craft a wooden sword
    craftWoodenSword(bot);
  }
}

function craftWoodenSword(bot) {
  try {
    const planks = bot.inventory.items().find(item => 
      item && (item.name === 'oak_planks' || item.name.includes('planks'))
    );
    const sticks = bot.inventory.items().find(item => 
      item && item.name === 'stick'
    );
    
    if (planks && sticks && planks.count >= 2 && sticks.count >= 1) {
      const recipe = bot.recipesFor('wooden_sword', null, 1, null, [planks, sticks]);
      if (recipe && recipe[0]) {
        bot.craft(recipe[0], 1, null, (err) => {
          if (!err) {
            console.log(`[Craft] ✅ Crafted wooden sword!`);
            equipBestWeapon(bot);
          }
        });
      }
    }
  } catch(e) {
    console.log(`[Craft] Error: ${e.message}`);
  }
}

function autoEat(bot) {
  if (bot.food >= 18) return; // Not hungry enough
  
  const foodItems = bot.inventory.items().filter(item => 
    item && (
      item.name.includes('bread') ||
      item.name.includes('apple') ||
      item.name.includes('pork') ||
      item.name.includes('beef') ||
      item.name.includes('chicken') ||
      item.name.includes('fish') ||
      item.name.includes('potato') ||
      item.name.includes('carrot') ||
      item.name.includes('cookie') ||
      item.name.includes('cake') ||
      item.name.includes('melon') ||
      item.name.includes('mushroom_stew') ||
      item.name.includes('beetroot') ||
      item.name.includes('rabbit') ||
      item.name.includes('mutton') ||
      item.name.includes('steak') ||
      item.name.includes('cooked')
    )
  );
  
  if (foodItems.length > 0) {
    const food = foodItems[0];
    bot.equip(food, 'hand', (err) => {
      if (!err) {
        bot.consume((err) => {
          if (!err) {
            console.log(`[🍖] Ate ${food.name} (hunger: ${bot.food}/20)`);
          }
        });
      }
    });
  }
}

function antiAfk(bot) {
  const actions = [
    () => {
      bot.setControlState('forward', true);
      setTimeout(() => bot.setControlState('forward', false), 600);
    },
    () => {
      bot.setControlState('back', true);
      setTimeout(() => bot.setControlState('back', false), 600);
    },
    () => {
      bot.setControlState('jump', true);
      setTimeout(() => bot.setControlState('jump', false), 300);
    },
    () => {
      bot.look(bot.entity.yaw + Math.PI/4, 0, true);
    }
  ];
  
  const action = actions[Math.floor(Math.random() * actions.length)];
  action();
}

function collectWood(bot) {
  const tree = bot.findBlock({
    matching: block => block && block.name && block.name.includes('log'),
    maxDistance: 15
  });
  
  if (tree) {
    bot.dig(tree, (err) => {
      if (!err) {
        console.log(`[🌲] Collected wood`);
        // Plant a sapling if available
        const sapling = bot.inventory.items().find(item => 
          item && item.name.includes('sapling')
        );
        if (sapling) {
          bot.equip(sapling, 'hand', (err) => {
            if (!err) {
              bot.placeBlock(tree.position.offset(0, 0, 0), tree.face, (err) => {
                if (!err) console.log(`[🌱] Planted sapling`);
              });
            }
          });
        }
      }
    });
  }
}

function reconnectWithFallback() {
  // Pehle original version se try karo
  console.log(`[Bot] 🔁 Attempting reconnect with version ${CONFIG.version}...`);
  
  try {
    if (currentBot) {
      try { currentBot.end(); } catch(e) {}
      currentBot = null;
    }
    currentBot = createBot(CONFIG.version);
  } catch(e) {
    // Agar fail ho to fallback version try karo
    console.log(`[Bot] ⚠️ Version ${CONFIG.version} failed, trying ${FALLBACK_VERSION}...`);
    try {
      currentBot = createBot(FALLBACK_VERSION);
    } catch(e2) {
      console.log(`[Bot] ❌ Both versions failed. Retrying in 10s...`);
      setTimeout(reconnectWithFallback, 10000);
    }
  }
}

// ============ START ============
console.log('========================================');
console.log('  FunarkBot for Aternos');
console.log(`  Server: ${CONFIG.host}:${CONFIG.port}`);
console.log(`  Version: ${CONFIG.version}`);
console.log(`  Paper 1.21.11 (131)`);
console.log('========================================');

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[System] Shutting down...');
  if (currentBot) {
    try { currentBot.end(); } catch(e) {}
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n[System] Received SIGTERM, shutting down...');
  if (currentBot) {
    try { currentBot.end(); } catch(e) {}
  }
  process.exit(0);
});

// Crash recovery
process.on('uncaughtException', (err) => {
  console.log(`[CRITICAL] Uncaught Exception: ${err.message}`);
  console.log(`[CRITICAL] Restarting in 5 seconds...`);
  setTimeout(() => {
    try { if (currentBot) currentBot.end(); } catch(e) {}
    currentBot = createBot(CONFIG.version);
  }, 5000);
});

process.on('unhandledRejection', (err) => {
  console.log(`[CRITICAL] Unhandled Rejection: ${err.message}`);
});

// START THE BOT!
currentBot = createBot(CONFIG.version);
