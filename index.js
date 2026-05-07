const mineflayer = require('mineflayer');
const express = require('express');

// ============ CONFIGURATION ============
const CONFIG = {
  host: 'funark.aternos.me',
  port: 57003,
  username: 'FunarkBot',  // Bot ka naam (change kar sakte ho)
  version: '1.21.1',       // Fixed 1.21.1 Java Edition
  auth: 'offline'           // Aternos offline server hai isliye 'offline'
};

// ============ WEBSERVER (Render heartbeat) ============
const app = express();
const PORT = process.env.PORT || 10000;

app.get('/', (req, res) => {
  res.json({ 
    status: 'Bot is online!',
    server: `${CONFIG.host}:${CONFIG.port}`,
    version: CONFIG.version,
    uptime: Math.floor(process.uptime()) + ' seconds'
  });
});

app.listen(PORT, () => {
  console.log(`[WebServer] Status page running on port ${PORT}`);
});

// ============ CREATE BOT ============
function createBot() {
  console.log(`[Bot] Connecting to ${CONFIG.host}:${CONFIG.port} (Minecraft ${CONFIG.version})...`);
  
  const bot = mineflayer.createBot({
    host: CONFIG.host,
    port: CONFIG.port,
    username: CONFIG.username,
    version: CONFIG.version,
    auth: CONFIG.auth,
    viewDistance: 'far'
  });

  // ---- Bot Events ----

  bot.on('login', () => {
    console.log(`[Bot] ✅ Logged in as ${bot.username}`);
    console.log(`[Bot] Server: ${CONFIG.host}:${CONFIG.port}`);
  });

  bot.on('spawn', () => {
    console.log(`[Bot] ✅ Spawned in the world!`);
  });

  bot.on('error', (err) => {
    console.log(`[Bot] ❌ Error: ${err.message}`);
  });

  bot.on('end', (reason) => {
    console.log(`[Bot] ⚠️ Disconnected: ${reason}`);
    console.log(`[Bot] 🔄 Reconnecting in 5 seconds...`);
    setTimeout(createBot, 5000);
  });

  bot.on('kicked', (reason) => {
    console.log(`[Bot] 👢 Kicked: ${reason}`);
    console.log(`[Bot] 🔄 Reconnecting in 5 seconds...`);
    setTimeout(createBot, 5000);
  });

  // ==== AUTO ATTACK MOBS (Auto-AFK Fighter) ====

  // 1. Auto-sword craft karega agar nahi hai
  function ensureSword() {
    const sword = bot.inventory.items().find(item => 
      item.name.includes('sword') || 
      item.name.includes('axe')
    );
    
    if (!sword) {
      craftWoodenSword();
    }
  }

  function craftWoodenSword() {
    try {
      // Pehle check karo ki planks aur sticks hain ya nahi
      const planks = bot.inventory.items().find(item => item.name === 'oak_planks' || item.name.includes('planks'));
      const sticks = bot.inventory.items().find(item => item.name === 'stick');

      if (planks && sticks && planks.count >= 2 && sticks.count >= 1) {
        bot.craft(bot.recipesFor('wooden_sword')[0], 1, null, (err) => {
          if (err) {
            console.log(`[Craft] ❌ Cannot craft sword: ${err.message}`);
          } else {
            console.log(`[Craft] ✅ Wooden sword crafted!`);
            equipBestWeapon();
          }
        });
      } else {
        console.log(`[Craft] Not enough materials for sword. Going to find wood...`);
        // Simple movement - wood dhundo
        setTimeout(() => {
          const tree = bot.findBlock({
            matching: block => block && block.name && block.name.includes('log'),
            maxDistance: 20
          });
          if (tree) {
            bot.dig(tree, (err) => {
              if (!err) console.log(`[Wood] ✅ Collected wood`);
            });
          }
        }, 2000);
      }
    } catch(e) {
      console.log(`[Craft] Error: ${e.message}`);
    }
  }

  function equipBestWeapon() {
    const weapons = bot.inventory.items().filter(item => 
      item.name.includes('sword') || item.name.includes('axe')
    );
    
    if (weapons.length > 0) {
      // Best weapon equip karo (sabse achha damage)
      const best = weapons.sort((a, b) => b.name.length - a.name.length)[0];
      bot.equip(best, 'hand', (err) => {
        if (!err) console.log(`[Equip] ✅ Equipped ${best.name}`);
      });
    }
  }

  // 2. Auto-attack nearby mobs
  function autoAttack() {
    const hostileMobs = [
      'zombie', 'skeleton', 'creeper', 'spider', 'enderman',
      'witch', 'phantom', 'husk', 'stray', 'drowned',
      'slime', 'magma_cube', 'blaze', 'ghast', 'piglin',
      'hoglin', 'zoglin', 'pillager', 'vindicator', 'evoker',
      'ravager', 'vex', 'guardian', 'elder_guardian',
      'cave_spider', 'wither_skeleton', 'shulker', 'silverfish',
      'endermite', 'wolf', 'bee', 'polar_bear', 'llama',
      'spider_jockey'
    ];

    const mob = bot.nearestEntity(entity => {
      return entity && entity.type === 'mob' && 
             hostileMobs.includes(entity.name) &&
             bot.entity.position.distanceTo(entity.position) < 8;
    });

    if (mob) {
      ensureSword();
      bot.lookAt(mob.position.offset(0, 1, 0), true, () => {
        bot.attack(mob);
        console.log(`[⚔️ Attack] Attacking ${mob.name} at distance ${Math.floor(bot.entity.position.distanceTo(mob.position))}`);
      });
    }
  }

  // 3. Auto-regenerate health
  function autoEat() {
    const food = bot.inventory.items().find(item => 
      item.name.includes('food') || 
      item.name.includes('bread') || 
      item.name.includes('apple') ||
      item.name.includes('pork') ||
      item.name.includes('beef') ||
      item.name.includes('chicken') ||
      item.name.includes('fish') ||
      item.name.includes('potato') ||
      item.name.includes('carrot')
    );

    if (food && bot.food < 18) {
      bot.equip(food, 'hand', (err) => {
        if (!err) {
          bot.consume((err) => {
            if (!err) console.log(`[🍖 Eat] Ate ${food.name}`);
          });
        }
      });
    }
  }

  // 4. Don't get kicked - move around
  function antiAfk() {
    const directions = ['left', 'right', 'forward', 'back'];
    const dir = directions[Math.floor(Math.random() * directions.length)];
    
    setTimeout(() => {
      bot.setControlState(dir, true);
      setTimeout(() => {
        bot.setControlState(dir, false);
        bot.setControlState('jump', true);
        setTimeout(() => {
          bot.setControlState('jump', false);
        }, 500);
      }, 1000);
    }, 1000);
  }

  // ==== START ALL LOOPS ====

  bot.on('spawn', () => {
    console.log(`[Bot] 🤖 All systems active! Killing mobs now...`);
    
    // Har 1 second mein mob attack
    setInterval(() => {
      try {
        autoAttack();
      } catch(e) { /* ignore */ }
    }, 1000);

    // Har 10 seconds mein auto-eat
    setInterval(() => {
      try {
        autoEat();
      } catch(e) { /* ignore */ }
    }, 10000);

    // Har 30 seconds mein equiment check
    setInterval(() => {
      try {
        ensureSword();
      } catch(e) { /* ignore */ }
    }, 30000);

    // Har 45 seconds mein anti-afk
    setInterval(() => {
      try {
        antiAfk();
      } catch(e) { /* ignore */ }
    }, 45000);

    // Har 5 minutes mein wood collect karo
    setInterval(() => {
      try {
        const tree = bot.findBlock({
          matching: block => block && block.name && block.name.includes('log'),
          maxDistance: 15
        });
        if (tree) {
          bot.dig(tree, (err) => {
            if (!err) console.log(`[🌲 Wood] Collected more wood`);
          });
        }
      } catch(e) { /* ignore */ }
    }, 300000); // 5 minutes
  });

  return bot;
}

// ============ START BOT ============
let bot = createBot();

// Auto-restart agar crash ho (safety measure)
process.on('uncaughtException', (err) => {
  console.log(`[CRITICAL] Uncaught Exception: ${err.message}`);
  console.log(`[CRITICAL] Restarting bot in 3 seconds...`);
  setTimeout(() => {
    try {
      if (bot) bot.end();
    } catch(e) {}
    setTimeout(createBot, 3000);
  }, 3000);
});

process.on('unhandledRejection', (err) => {
  console.log(`[CRITICAL] Unhandled Rejection: ${err.message}`);
});

console.log(`[System] FunarkBot starting...`);
console.log(`[System] Target: ${CONFIG.host}:${CONFIG.port}`);
console.log(`[System] Version: Minecraft ${CONFIG.version}`);
