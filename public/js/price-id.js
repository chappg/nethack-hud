// price-id.js — NetHack Price Identification Engine
// Implements exact shopkeeper pricing formulas from shk.c
// Works for 3.6.7 and 3.7 (with variant-specific items)
const PriceID = (() => {

  // ================================================================
  // BASE PRICE TABLES — items grouped by base cost
  // ================================================================
  const PRICE_TABLES = {
    potion: {
      0: ["water"],
      50: ["booze", "fruit juice", "see invisible", "sickness"],
      100: ["confusion", "extra healing", "hallucination", "healing", "restore ability", "sleeping", "blindness"],
      150: ["acid", "oil", "invisibility", "monster detection", "object detection", "speed"],
      200: ["enlightenment", "full healing", "levitation", "polymorph"],
      250: ["gain ability", "gain energy", "gain level"],
      300: ["paralysis"]
    },
    scroll: {
      20: ["identify"],
      50: ["light"],
      60: ["blank paper", "enchant weapon"],
      80: ["enchant armor", "remove curse"],
      100: ["confuse monster", "destroy armor", "fire", "food detection", "gold detection", "magic mapping", "scare monster", "teleportation"],
      200: ["amnesia", "create monster", "earth", "taming"],
      300: ["charging", "genocide", "punishment", "stinking cloud"]
    },
    wand: {
      0: ["nothing"],
      100: ["light", "secret door detection"],
      150: ["enlightenment", "create monster", "locking", "make invisible", "opening", "probing", "slow monster", "speed monster", "striking", "undead turning"],
      175: ["cold", "fire", "lightning", "sleep"],
      200: ["cancellation", "create horde", "digging", "magic missile", "polymorph", "teleportation"],
      500: ["death", "wishing"]
    },
    ring: {
      100: ["adornment", "hunger", "protection", "protection from shape changers", "stealth", "sustain ability", "warning"],
      150: ["aggravate monster", "cold resistance", "gain constitution", "gain strength", "increase accuracy", "increase damage", "invisibility", "poison resistance", "see invisible", "shock resistance"],
      200: ["fire resistance", "free action", "levitation", "regeneration", "searching", "slow digestion", "teleportation"],
      300: ["conflict", "polymorph", "polymorph control", "teleport control"]
    },
    armor: {
      1: ["dunce cap"],
      8: ["elven boots", "fumble boots", "kicking boots", "levitation boots", "speed boots", "water walking boots"],
      10: ["helmet"],
      16: ["gauntlets of dexterity", "gauntlets of fumbling", "gauntlets of power"],
      40: ["cloak of displacement", "cloak of invisibility", "cloak of magic resistance", "cloak of protection", "oilskin cloak"],
      50: ["helm of brilliance", "helm of opposite alignment", "helm of telepathy"],
      80: ["helm of speed"]
    },
    tool: {
      10: ["oil lamp", "tin whistle", "wooden flute", "wooden harp"],
      15: ["leather drum"],
      20: ["bugle", "magic whistle", "stethoscope"],
      25: ["magic flute", "magic harp"],
      50: ["magic lamp"],
      75: ["drum of earthquake", "frost horn", "fire horn", "horn of plenty"],
      100: ["bag of holding"],
      200: ["magic marker"],
    },
    spellbook: {
      100: ["force bolt", "healing", "knock", "light", "protection", "sleep"],
      200: ["charm monster", "confuse monster", "create monster", "cure blindness", "detect food", "detect monsters", "drain life", "extra healing", "haste self", "magic missile", "remove curse", "slow monster", "wizard lock"],
      300: ["cause fear", "clairvoyance", "cone of cold", "detect treasure", "detect unseen", "fireball", "identify", "invisibility", "jumping", "levitation", "magic mapping", "polymorph", "restore ability", "stone to flesh", "teleport away", "turn undead"],
      400: ["cancellation", "create familiar", "dig", "enchant weapon", "finger of death"],
      700: ["Book of the Dead"]
    },
  };

  // ================================================================
  // CHARISMA PRICING — from shk.c:get_cost()
  // ================================================================
  // Buy price multiplier based on charisma:
  //   cha <=  5: base * 2    (+100%)
  //   cha  6- 7: base * 3/2  (+50%)
  //   cha  8-10: base * 4/3  (+33%)
  //   cha 11-15: base * 1    (list price)
  //   cha 16-17: base * 3/4  (-25%)
  //   cha   18:  base * 2/3  (-33%)
  //   cha  >18:  base * 1/2  (-50%)
  //
  // Plus "sucker" markup of +33% for:
  //   - Tourist with XL < 15
  //   - Any player with visible Hawaiian shirt (no armor/cloak over it)
  //
  // Plus random +33% on 1/4 of unidentified items (per object ID, deterministic)

  // Given an observed buy price, compute all possible base prices
  function reverseEngineerBuyPrice(observed, cha, isSucker) {
    // The formula is: observed = floor(base * chaMul * suckerMul * randomMul)
    // where randomMul is either 1 or 4/3 (and we don't know which)
    // We solve for base by trying all multiplier combos

    const chaMultipliers = getChaMultipliers(cha);
    const suckerMuls = isSucker ? [4/3] : [1]; // sucker is cumulative, comes after cha
    const randomMuls = [1, 4/3]; // 1/4 chance of +33%

    const possibleBases = new Set();

    for (const chaMul of chaMultipliers) {
      for (const sMul of suckerMuls) {
        for (const rMul of randomMuls) {
          // observed = floor(base * chaMul * sMul * rMul)
          // But the actual calculation uses integer arithmetic:
          // price = base; price += price/3 (random); price += price/3 (sucker); then cha adjustment
          // Let's try both forward calculation approaches
          const totalMul = chaMul * sMul * rMul;
          const approxBase = observed / totalMul;

          // Check nearby integer values
          for (let b = Math.floor(approxBase) - 2; b <= Math.ceil(approxBase) + 2; b++) {
            if (b < 0) continue;
            // Forward-calculate with integer arithmetic to verify
            const calcPrice = forwardCalcBuyPrice(b, cha, isSucker, rMul > 1);
            if (calcPrice === observed) {
              possibleBases.add(b);
            }
          }
        }
      }
    }

    return [...possibleBases].sort((a, b) => a - b);
  }

  // Forward-calculate buy price using NetHack's integer arithmetic
  function forwardCalcBuyPrice(base, cha, isSucker, hasRandomMarkup) {
    let price = base;
    if (price === 0) return 5; // 0-cost items cost 5gp

    // Random +33% markup (1 in 4 chance, per object)
    if (hasRandomMarkup) {
      price = price + Math.floor(price / 3);
    }

    // Sucker markup +33%
    if (isSucker) {
      price = price + Math.floor(price / 3);
    }

    // Charisma adjustment
    if (cha <= 5) {
      price = price * 2;
    } else if (cha <= 7) {
      price = price + Math.floor(price / 2);
    } else if (cha <= 10) {
      price = price + Math.floor(price / 3);
    } else if (cha <= 15) {
      // list price — no change
    } else if (cha <= 17) {
      price = price - Math.floor(price / 4);
    } else if (cha === 18) {
      price = price - Math.floor(price / 3);
    } else {
      // cha > 18
      price = Math.floor(price / 2);
    }

    // Minimum 1
    if (price < 1) price = 1;
    return price;
  }

  function getChaMultipliers(cha) {
    if (cha <= 5) return [2];
    if (cha <= 7) return [1.5];
    if (cha <= 10) return [4/3];
    if (cha <= 15) return [1];
    if (cha <= 17) return [0.75];
    if (cha === 18) return [2/3];
    return [0.5]; // cha > 18
  }

  // Sell price: base / 2 (normal) or base / 3 (sucker)
  // No charisma modifier. Random -25% on 1/4 of items (not tied to object).
  function reverseEngineerSellPrice(observed, isSucker) {
    const possibleBases = new Set();

    // Normal: sell = floor(base / 2) or floor(base / 3) for sucker
    // Random -25%: sell = floor(floor(base / 2) * 3/4) or similar
    const divisors = isSucker ? [3] : [2];

    for (const div of divisors) {
      // Without random reduction
      // observed = floor(base / div)
      // base could be observed*div to observed*div + div-1
      for (let offset = 0; offset < div; offset++) {
        possibleBases.add(observed * div + offset);
      }

      // With random -25% reduction
      // observed = floor(floor(base / div) * 3/4)
      // inner = floor(base / div)
      // observed = floor(inner * 3/4)
      // inner could be in range [observed*4/3, observed*4/3 + 1.33]
      for (let inner = Math.floor(observed * 4/3); inner <= Math.ceil(observed * 4/3) + 2; inner++) {
        if (Math.floor(inner * 3 / 4) === observed) {
          for (let offset = 0; offset < div; offset++) {
            possibleBases.add(inner * div + offset);
          }
        }
      }
    }

    return [...possibleBases].sort((a, b) => a - b);
  }

  // Items that only exist in specific variants
  const VARIANT_ONLY = {
    'create horde': ['3.7', 'evil'],
    'enlightenment': ['3.7', 'evil'], // wand of enlightenment
  };

  function isItemAvailable(itemName, variant) {
    const restriction = VARIANT_ONLY[itemName];
    if (!restriction) return true;
    return restriction.includes(variant || '3.7');
  }

  const identifiedItems = new Set();

  // Main lookup: given observed price, action, cha, sucker status
  function lookup(category, observedPrice, action, cha, isSucker) {
    const table = PRICE_TABLES[category];
    if (!table) return [];

    let possibleBases;
    if (action === 'sell') {
      possibleBases = reverseEngineerSellPrice(observedPrice, isSucker);
    } else {
      possibleBases = reverseEngineerBuyPrice(observedPrice, cha || 10, isSucker);
    }

    const variant = GameParser.getState().variant || '3.7';
    const results = [];

    for (const [price, items] of Object.entries(table)) {
      const p = parseInt(price);
      if (possibleBases.includes(p)) {
        const filtered = items.filter(i => !identifiedItems.has(i) && isItemAvailable(i, variant));
        if (filtered.length > 0) {
          results.push({ basePrice: p, items: filtered });
        }
      }
    }
    return results;
  }

  function lookupAllCategories(observedPrice, action, cha, isSucker) {
    const all = {};
    for (const cat of Object.keys(PRICE_TABLES)) {
      const results = lookup(cat, observedPrice, action, cha, isSucker);
      if (results.length > 0) all[cat] = results;
    }
    return all;
  }

  function addIdentified(itemName) {
    identifiedItems.add(itemName.toLowerCase());
  }

  // Detect if player is a "sucker" — Tourist XL < 15
  function isSucker(gs) {
    if (!gs) return false;
    // Tourist with XL < 15
    if (gs.role === 'Tou' && gs.xl < 15) return true;
    // Can't detect Hawaiian shirt visibility from parser — assume not sucker for non-tourist
    return false;
  }

  function renderResults(results, container) {
    container.innerHTML = '';
    if (!results || Object.keys(results).length === 0) {
      container.innerHTML = '<div class="info-box">No matches found</div>';
      return;
    }

    for (const [cat, groups] of Object.entries(results)) {
      for (const group of groups) {
        const div = document.createElement('div');
        div.className = 'price-group';
        const categoryIcon = { potion: '🧪', scroll: '📜', wand: '🪄', ring: '💍', armor: '🛡️', tool: '🔧', spellbook: '📖' }[cat] || '📦';
        div.innerHTML = `<h5>${categoryIcon} ${cat} (base: ${group.basePrice}zm)</h5><ul>${
          group.items.map(i => `<li>• ${i}</li>`).join('')
        }</ul>`;
        container.appendChild(div);
      }
    }
  }

  function initUI() {
    const btn = document.getElementById('price-lookup-btn');
    const resultsEl = document.getElementById('price-results');

    renderIdentified();
    initAutoName();
    btn.addEventListener('click', () => {
      const cat = document.getElementById('price-category').value;
      const price = parseInt(document.getElementById('price-input').value);
      const action = document.getElementById('price-action').value;
      if (isNaN(price)) return;

      const gs = GameParser.getState();
      const cha = gs.charisma || 10;
      const sucker = isSucker(gs);
      const results = { [cat]: lookup(cat, price, action, cha, sucker) };
      renderResults(results, resultsEl);
    });
  }

  function renderIdentified() {
    const list = document.getElementById('identified-list');
    if (!list) return;
    if (identifiedItems.size === 0) {
      list.innerHTML = '<li style="color:var(--text-dim);font-style:italic;">None yet</li>';
      return;
    }
    list.innerHTML = [...identifiedItems].sort().map(item =>
      `<li>✓ ${item}</li>`
    ).join('');
  }

  // Track last processed price to avoid re-processing
  let lastProcessedPriceTime = 0;
  let autoNameEnabled = false;

  function initAutoName() {
    const cb = document.getElementById('auto-name-toggle');
    if (cb) {
      // Load preference
      autoNameEnabled = localStorage.getItem('nh_autoname') === 'true';
      cb.checked = autoNameEnabled;
      cb.addEventListener('change', () => {
        autoNameEnabled = cb.checked;
        localStorage.setItem('nh_autoname', autoNameEnabled);
      });
    }
  }

  // Track items we've already auto-named this session
  const autoNamedItems = new Set();

  // Auto-name an item via #call command sent to the terminal
  // NetHack #call flow: #call\n → "What class?" → classChar → "Call <class> by what name?" → name\n
  function autoNameItem(itemAppearance, identification) {
    if (!autoNameEnabled) return;
    if (!itemAppearance || !identification) return;
    if (autoNamedItems.has(itemAppearance)) return;

    autoNamedItems.add(itemAppearance);

    // Item class characters for #call prompt
    const classMap = {
      potion: '!', scroll: '?', wand: '/', ring: '=',
      armor: '[', tool: '(', spellbook: '+'
    };

    const catMatch = identification.match(/^(potion|scroll|wand|ring|armor|tool|spellbook) of /i);
    if (!catMatch) return;
    const classChar = classMap[catMatch[1].toLowerCase()];
    if (!classChar) return;

    const callName = identification;

    if (typeof TerminalManager !== 'undefined' && TerminalManager.sendKeys) {
      // Stagger keystrokes to let NetHack process each prompt
      setTimeout(() => TerminalManager.sendKeys('#call\n'), 50);
      setTimeout(() => TerminalManager.sendKeys(classChar), 300);
      setTimeout(() => TerminalManager.sendKeys(callName + '\n'), 550);
      console.log(`[PriceID] Auto-naming: ${itemAppearance} → ${callName}`);
    }
  }

  function update(gameState) {
    const container = document.getElementById('price-auto-results');

    // Auto price ID from messages
    if (gameState.lastPrice && gameState.lastPrice.time > lastProcessedPriceTime) {
      lastProcessedPriceTime = gameState.lastPrice.time;

      const cha = gameState.charisma || 10;
      const sucker = isSucker(gameState);
      const action = gameState.lastPrice.type === 'sell' ? 'sell' : 'buy';
      const observed = gameState.lastPrice.amount;
      const itemName = gameState.lastPrice.itemName || '';
      const results = lookupAllCategories(observed, action, cha, sucker);

      if (Object.keys(results).length > 0) {
        const suckerNote = sucker ? ' <span style="color:var(--danger);">(sucker markup!)</span>' : '';
        const itemNote = itemName ? ` — "${itemName}"` : '';

        // Check if we have a unique identification (only one possible item across all categories)
        let totalItems = 0;
        let uniqueId = null;
        let uniqueCat = null;
        for (const [cat, groups] of Object.entries(results)) {
          for (const group of groups) {
            totalItems += group.items.length;
            if (group.items.length === 1 && totalItems === 1) {
              uniqueId = group.items[0];
              uniqueCat = cat;
            }
          }
        }

        if (uniqueId && totalItems === 1) {
          // UNIQUE IDENTIFICATION — highlight prominently
          const categoryIcon = { potion: '🧪', scroll: '📜', wand: '🪄', ring: '💍', armor: '🛡️', tool: '🔧', spellbook: '📖' }[uniqueCat] || '📦';
          container.innerHTML = `
            <div style="background:var(--accent);color:#000;padding:6px 10px;border-radius:4px;margin-bottom:6px;font-weight:bold;">
              ✅ IDENTIFIED: ${categoryIcon} ${uniqueCat} of ${uniqueId}
            </div>
            <div style="color:var(--text-dim);font-size:10px;">
              ${observed}zm (${action}, CHA ${cha})${itemNote}${suckerNote}
            </div>`;

          // Try auto-naming if enabled
          if (autoNameEnabled && itemName) {
            autoNameItem(itemName, `${uniqueCat} of ${uniqueId}`);
          }
        } else {
          // Multiple possibilities — show narrowed list
          container.innerHTML = `<div style="color:var(--warning);margin-bottom:4px;">💰 ${observed}zm (${action}, CHA ${cha})${itemNote}${suckerNote}</div>`;
          const div = document.createElement('div');
          renderResults(results, div);
          container.appendChild(div);
        }
      }
    }

    // Shop status with type
    const shopEl = document.getElementById('shop-status');
    if (gameState.inShop) {
      shopEl.textContent = gameState.shopType ? `🏪 In ${gameState.shopType}` : '🏪 In Shop';
      shopEl.style.color = 'var(--warning)';
    } else {
      shopEl.textContent = 'Not in shop';
      shopEl.style.color = 'var(--text-dim)';
    }

    // Detect identification messages
    const msg = gameState.currentMessage;
    if (msg) {
      const idMatch = msg.match(/(?:call|know)\s+.+?\s+(?:as|is)\s+(.+)/i);
      if (idMatch) { addIdentified(idMatch[1].trim()); renderIdentified(); }

      const thisIs = msg.match(/This is (?:a |an )?(.+?)(?:\.|!)/i);
      if (thisIs) { addIdentified(thisIs[1].trim()); renderIdentified(); }
    }
  }

  function save() { return [...identifiedItems]; }
  function load(data) { if (Array.isArray(data)) { identifiedItems.clear(); data.forEach(i => identifiedItems.add(i)); } }
  function reset() { identifiedItems.clear(); }

  return { initUI, update, lookup, lookupAllCategories, addIdentified, isSucker, forwardCalcBuyPrice, save, load, reset };
})();
