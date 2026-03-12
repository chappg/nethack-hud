// parser.js — Parse xterm.js terminal buffer to extract NetHack game state
const GameParser = (() => {
  let terminal = null;
  let dirty = false;
  let parseScheduled = false;
  let listeners = [];
  const messageHistory = [];
  const MAX_MESSAGES = 50;
  let lastMessageText = '';
  let lastStatusText = '';

  const state = {
    // Status line 1
    playerName: '',
    strength: '', dexterity: 0, constitution: 0,
    intelligence: 0, wisdom: 0, charisma: 0,
    alignment: '',
    // Status line 2
    dlvl: '', hp: 0, hpmax: 0, pw: 0, pwmax: 0,
    ac: 0, xl: 0, xp: 0, gold: 0, turns: 0,
    statusEffects: [],
    // Map
    map: [],
    monsters: [],
    playerPos: null,
    // Message
    currentMessage: '',
    messageHistory: [],
    // Shop
    inShop: false,
    lastPrice: null,
    // Branch detection
    branch: '',
    // Role/race
    role: '',      // 3-letter: Arc, Bar, Cav, Hea, Kni, Mon, Pri, Ran, Rog, Sam, Tou, Val, Wiz
    roleTitle: '', // Current rank title
    race: '',      // Hum, Elf, Dwa, Gno, Orc
    variant: '3.7', // Default to 3.7-dev (hardfought)
  };

  const MONSTER_GLYPHS = new Set(
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ&;:\''
      .split('')
  );

  // Dungeon feature glyphs that should NOT be treated as monsters
  const FEATURE_GLYPHS = new Set([
    // These letters appear as dungeon features in some tilesets/configs
  ]);

  // Debug mode — toggle via console: GameParser.debug = true
  let debug = false;

  const STATUS_EFFECTS = [
    'Satiated', 'Hungry', 'Weak', 'Fainting', 'Fainted', 'Starved',
    'Blind', 'Confused', 'Stunned', 'Hallucinating', 'Ill', 'FoodPois',
    'Slimed', 'Stoned', 'Overloaded', 'Stressed', 'Strained', 'Burdened',
    'Levitating', 'Flying',
  ];

  function init(term) {
    terminal = term;
    term.onRender(() => {
      dirty = true;
      scheduleParse();
    });
    // Also parse periodically in case onRender misses updates
    // (e.g. SSH data arriving without triggering render)
    setInterval(() => {
      dirty = true;
      scheduleParse();
    }, 500);
  }

  function scheduleParse() {
    if (parseScheduled) return;
    parseScheduled = true;
    // Use setTimeout instead of requestIdleCallback for more reliable timing
    setTimeout(doParse, 16); // ~1 frame
  }

  function getRow(row) {
    const buffer = terminal.buffer.active;
    if (row >= buffer.length) return '';
    const line = buffer.getLine(row);
    if (!line) return '';
    return line.translateToString(true);
  }

  function doParse() {
    parseScheduled = false;
    if (!dirty || !terminal) return;
    dirty = false;

    const buffer = terminal.buffer.active;
    const rows = terminal.rows;
    const cols = terminal.cols;

    // Detect login/menu screens (dgamelaunch, server selection, .nhrc editor)
    const topRows = getRow(0) + getRow(1) + getRow(2) + getRow(3) + getRow(4);
    const isLoginScreen = /login:|password:|username:|welcome to (?:hardfought|nethack)|choose your |dgamelaunch|\.nhrc|nethack\.alt\.org|Not logged in/i.test(topRows);

    if (isLoginScreen) {
      // Reset game state — we're not in a game
      state.onLoginScreen = true;
      if (state.playerName) {
        console.log('[Parser] Login screen detected — resetting game state');
        state.playerName = '';
        state.role = '';
        state.roleTitle = '';
        state.dlvl = '';
        state.hp = 0; state.hpmax = 0;
        state.pw = 0; state.pwmax = 0;
        state.ac = 0; state.xl = 0; state.xp = 0;
        state.gold = 0; state.turns = 0;
        state.statusEffects = [];
        state.monsters = [];
        state.branch = '';
        state.currentMessage = '';
        state.dead = false;
        state.engulfed = false;
        state.inShop = false;
      }
      // Notify listeners so panels can hide
      for (const cb of listeners) {
        try { cb(state); } catch (e) {}
      }
      return;
    }
    state.onLoginScreen = false;

    // Variant detection — only from in-game version strings, not stale state
    // Reset variant when switching servers (resetVariant() is called from app.js)
    if (!state._variantDetected) {
      // Look for version in game startup messages, MOTD, or status
      const allText = topRows + getRow(5) + getRow(6) + getRow(7);
      if (/nethack 3\.7|NH-3\.7|3\.7\.\d-dev|NetHack Version 3\.7/i.test(allText)) {
        state.variant = '3.7';
        state._variantDetected = true;
      } else if (/nethack 3\.6\.7|NH-3\.6\.7|3\.6\.7|NetHack Version 3\.6\.7/i.test(allText)) {
        state.variant = '3.6.7';
        state._variantDetected = true;
      } else if (/nethack 3\.6\.6|3\.6\.6/i.test(allText)) {
        state.variant = '3.6.6';
        state._variantDetected = true;
      } else if (/evilhack/i.test(allText)) {
        state.variant = 'evil';
        state._variantDetected = true;
      } else if (/splicehack/i.test(allText)) {
        state.variant = 'splice';
        state._variantDetected = true;
      } else if (/gnollhack/i.test(allText)) {
        state.variant = 'gnoll';
        state._variantDetected = true;
      } else if (/unnethack/i.test(allText)) {
        state.variant = 'un';
        state._variantDetected = true;
      }
      if (state._variantDetected && debug) {
        console.log(`[Parser] Variant detected: ${state.variant}`);
      }
    }

    // Parse message line (row 0)
    parseMessage(getRow(0));

    // Parse map (rows 1 to rows-3)
    parseMap(buffer, rows, cols);

    // Parse status lines — try last 2 rows first, then scan for them
    const sl1 = getRow(rows - 2);
    const sl2 = getRow(rows - 1);
    parseStatusLine1(sl1);
    parseStatusLine2(sl2);

    // If standard positions didn't find anything, scan bottom 5 rows
    if (!state.playerName && !state.dlvl) {
      for (let r = rows - 1; r >= Math.max(0, rows - 5); r--) {
        const line = getRow(r);
        if (/St:\d/.test(line)) parseStatusLine1(line);
        if (/Dlvl:/.test(line) || /HP:\d/.test(line)) parseStatusLine2(line);
      }
    }

    if (debug) {
      console.log(`[Parser] StatusLine1 (row ${rows-2}): "${sl1.substring(0, 80)}"`);
      console.log(`[Parser] StatusLine2 (row ${rows-1}): "${sl2.substring(0, 80)}"`);
      console.log(`[Parser] State: name=${state.playerName} role=${state.role} hp=${state.hp}/${state.hpmax} dlvl=${state.dlvl} turns=${state.turns}`);
    }

    // Detect branch
    detectBranch();

    // Notify listeners
    for (const cb of listeners) {
      try { cb(state); } catch (e) { console.error('Parser listener error:', e); }
    }
  }

  function parseMessage(text) {
    text = text.trim();
    if (!text || text === lastMessageText) return;
    lastMessageText = text;
    state.currentMessage = text;

    messageHistory.unshift({ text, time: Date.now() });
    if (messageHistory.length > MAX_MESSAGES) messageHistory.pop();
    state.messageHistory = messageHistory;

    // Shop detection — "Hello, <name>! Welcome to <keeper>'s <type> store!"
    if (/welcome to .+(?:shop|store|emporium|bazaar|outlet|market|boutique)/i.test(text) ||
        /welcome.*delicatessen|welcome.*bookstore|welcome.*hardware/i.test(text)) {
      state.inShop = true;
      state.shopEntryTurn = state.turns;
      // Extract shop type if possible
      const shopMatch = text.match(/welcome to .+'s (.+?)!/i);
      if (shopMatch) state.shopType = shopMatch[1].trim();
    } else if (/Thank you for (?:shopping|visiting)|you escaped the shop|Strstrstr\. Your strstr is gone|usage fee/i.test(text)) {
      // "Thank you for shopping" = normal exit, or theft/kops
    }
    // "You hear someone counting money" = left the shop
    if (/hear (?:someone |the shopkeeper )?counting money/i.test(text)) {
      state.inShop = false;
      state.shopType = '';
    }
    // Explicit shop exit: leaving through door
    if (/door.*closes behind you/i.test(text)) {
      state.inShop = false;
      state.shopType = '';
    }

    // Mimic detection — "strange object" is always a mimic
    if (/strange (?:object|item)/i.test(text)) {
      state.mimicWarning = true;
    }
    // Mimic awakened — it attacks or is revealed
    if (/(?:mimic hits|mimic bites|mimic attacks|The .* mimic)/i.test(text)) {
      state.mimicWarning = 'active'; // active mimic, suggest escape
    }
    // Mimic killed or escaped
    if (/(?:it was a mimic|mimic imitating|actually a |you (?:kill|destroy) .* mimic|mimic is killed)/i.test(text)) {
      state.mimicWarning = false;
    }

    // Items on ground — track BEFORE price detection so it's available as context
    if (/you see here/i.test(text) || /you feel here/i.test(text)) {
      state.itemOnGround = text;
    }

    // Price detection: "for you, only X zorkmids" or "worth X zorkmids" or "#chat price"
    // Shop messages: "Hyeghu offers it for 13 zorkmids" / "For you, only 13 zorkmids"
    // #chat: "<name> says it'll cost you X zorkmids" / "price X zorkmids"
    const priceMatch = text.match(/(?:for (?:you|thee),?\s*(?:only\s*)?|(?:I'll give you|offer)\s+|costs?\s+|cost you\s+|it for\s+|price\s+)(\d+)\s*(?:zorkmids?|gold pieces?|zm)/i);
    if (priceMatch) {
      // Try to extract item name from the price message itself
      let itemName = '';

      // "Hyeghu offers it for X zorkmids" — no item name, fall through
      // "For you, only X zorkmids" — no item name, fall through

      // Fall back to last "you see here" item (most common case in shops)
      if (!itemName && state.itemOnGround) {
        const igMatch = state.itemOnGround.match(/(?:see|feel) here (?:a |an |the )?(.+?)\.?\s*$/i);
        if (igMatch) itemName = igMatch[1].trim();
      }

      // Also try "you see" without "here" — some messages say "You see a lamp (unpaid, 13 zorkmids)"
      if (!itemName) {
        const inlinePrice = text.match(/(?:a |an |the )(.+?)\s*\(unpaid,?\s*\d+\s*zorkmids?\)/i);
        if (inlinePrice) itemName = inlinePrice[1].trim();
      }

      state.lastPrice = { amount: parseInt(priceMatch[1]), type: 'buy', raw: text, time: Date.now(), itemName };
    }

    // Sell price: "I'll give you X gold pieces for your <item>"
    const sellMatch = text.match(/(?:I'll give you|offer)\s+(\d+)\s+gold\s+pieces?\s+for\s+(?:your\s+)?(.+?)\.?\s*$/i) ||
                      text.match(/sell .+? for (\d+) gold/i);
    if (sellMatch) {
      const itemName = sellMatch[2] || '';
      state.lastPrice = { amount: parseInt(sellMatch[1]), type: 'sell', raw: text, time: Date.now(), itemName: itemName.trim() };
    }

    // Engulfing detection
    if (/swallows you|you are engulfed/i.test(text)) {
      state.engulfed = true;
    } else if (/expels you|you get regurgitated/i.test(text)) {
      state.engulfed = false;
    }

    // Death detection
    if (/you die|DYWYPI|Do you want your possessions identified/i.test(text)) {
      state.dead = true;
    }

    // Altar/fountain/sink detection
    if (/altar/i.test(text)) state.nearAltar = true;
    if (/fountain/i.test(text)) state.nearFountain = true;
    if (/sink/i.test(text)) state.nearSink = true;

    // Trap detection
    if (/you find a trap|a trap door|bear trap|pit|teleportation trap/i.test(text)) {
      state.trapDetected = text;
    }

    // Level change detection
    if (/you (fall|rise|float|teleport|are teleported)/i.test(text)) {
      state.levelChange = text;
      // Exiting a shop by changing levels
      state.inShop = false;
      state.shopType = '';
    }

    // Identification
    if (/call (?:it|them) |That is (?:a |an )/i.test(text)) {
      state.lastIdentification = text;
    }

    // Eating
    if (/you (?:eat|finish eating)/i.test(text)) {
      state.lastEaten = text;
    }

    // Weapon/combat events
    if (/you hit |you miss |bites!|hits!|misses/i.test(text)) {
      state.inCombat = true;
      state.lastCombatTurn = state.turns;
    } else if (state.inCombat && state.turns - (state.lastCombatTurn||0) > 3) {
      state.inCombat = false;
    }

    // Luck events
    if (/you (?:feel lucky|found a four-leaf clover)|luck/i.test(text)) {
      state.luckEvent = text;
    }
  }

  function parseMap(buffer, rows, cols) {
    const map = [];
    const monsters = [];
    let playerPos = null;
    // NetHack: row 0 = message line, rows-2 and rows-1 = status lines
    // Map area: rows 1 through rows-3
    const mapStart = 1;
    const mapEnd = rows - 2;

    // Dungeon floor/feature/terrain chars that are NOT monsters
    const NOT_MONSTER = new Set([
      ' ', '.', '#', '-', '|', '+', '<', '>', '^', '_', '\\',
      '{', '}', '(', ')', '0', '`', '[', ']', '"', '!', '?',
      '/', '*', '%', '$', '=', '\u0000',
    ]);

    // Only scan for monsters if we have evidence of an active game
    const gameDetected = !!(state.playerName || state.dlvl);

    for (let y = mapStart; y < mapEnd; y++) {
      const line = buffer.getLine(y);
      const row = [];
      if (!line) { map.push(row); continue; }

      // Get the full line text
      const lineStr = line.translateToString(true);

      // Determine map bounds for this row using FLOOR characters only
      // NetHack map is max 80 columns wide (COLNO=80) in standard, but
      // could start at a non-zero column with some windowport configs.
      // Cap at 79 to avoid parsing perm_invent text as monsters.
      const MAP_MAX_COL = Math.min(79, cols - 1);
      let mapLeft = -1, mapRight = -1;
      if (gameDetected) {
        for (let i = 0; i <= Math.min(MAP_MAX_COL, lineStr.length - 1); i++) {
          const ch = lineStr.charAt(i);
          if ('.#+<>_{}\\'.indexOf(ch) >= 0) {
            if (mapLeft < 0) mapLeft = i;
            mapRight = i;
          }
        }
      }
      const isMapRow = mapLeft >= 0;

      for (let x = 0; x < cols; x++) {
        // Primary: use lineStr for reliable character reading
        const c = (x < lineStr.length) ? lineStr.charAt(x) : ' ';
        row.push(c);

        // Get cell object for color info (may be null in some xterm.js versions)
        let cell = null;
        try { cell = line.getCell(x); } catch(e) {}

        if (c === '@') {
          playerPos = { x, y: y - mapStart };
          continue;
        }

        // Skip non-monster characters (dungeon features, items, terrain)
        if (NOT_MONSTER.has(c)) continue;

        // Only look for monsters within the map rectangle
        if (!isMapRow || x < mapLeft || x > mapRight) continue;

        // Potential monster glyph — but we need COLOR to distinguish from text
        // In NetHack, monsters ALWAYS have a non-default foreground color.
        // Plain text (messages, menus, status) uses default foreground.
        if (MONSTER_GLYPHS.has(c) && cell) {
          let fg = -1;
          let hasColor = false;
          try {
            if (typeof cell.isFgDefault === 'function') {
              hasColor = !cell.isFgDefault();
              if (hasColor) {
                fg = cell.getFgColor();
              }
            } else if (typeof cell.isFgPalette === 'function') {
              hasColor = cell.isFgPalette();
              if (hasColor) fg = cell.getFgColor();
            } else if (typeof cell.getFgColor === 'function') {
              fg = cell.getFgColor();
              hasColor = (fg !== 7 && fg !== -1); // 7=white/default
            }
          } catch (e) { fg = -1; }

          // Only count as monster if cell has explicit color
          if (hasColor) {
            // Detect pets: NetHack renders pets with inverse video (reverse attribute)
            let isPet = false;
            try {
              if (typeof cell.isInverse === 'function') {
                isPet = cell.isInverse();
              } else if (typeof cell.isBgPalette === 'function' && cell.isBgPalette()) {
                // Non-default background on a monster glyph usually means inverse/pet
                isPet = true;
              } else if (typeof cell.isBgDefault === 'function' && !cell.isBgDefault()) {
                isPet = true;
              }
            } catch(e) {}
            monsters.push({ glyph: c, fg, x, y: y - mapStart, pet: isPet });
          }

          if (debug) {
            let info = `glyph='${c}' fg=${fg} hasColor=${hasColor} x=${x} y=${y}`;
            if (typeof cell.isFgDefault === 'function') {
              try { info += ` fgDefault=${cell.isFgDefault()} fgPalette=${cell.isFgPalette()}`; } catch {}
            }
            console.log(`[Parser] ${hasColor ? 'MONSTER' : 'skip-no-color'}: ${info}`);
          }
        }
      }
      map.push(row);
    }

    if (debug) {
      console.log(`[Parser] Map: ${mapStart}-${mapEnd}, ${rows} rows, ${cols} cols. Found ${monsters.length} monsters, player=${playerPos ? `${playerPos.x},${playerPos.y}` : 'not found'}`);
      if (monsters.length > 0) {
        console.log(`[Parser] Monsters: ${monsters.map(m => `${m.glyph}(fg:${m.fg}@${m.x},${m.y})`).join(', ')}`);
      }
    }

    state.map = map;
    state.monsters = monsters;
    state.playerPos = playerPos;
  }

  function parseStatusLine1(text) {
    if (!text.trim()) return;
    // Format: "PlayerName the Role  St:18/01 Dx:14 Co:16 In:10 Wi:12 Ch:8  Neutral"
    const stMatch = text.match(/St:(\d+(?:\/(?:\*\*|\d+))?)/);
    const dxMatch = text.match(/Dx:(\d+)/);
    const coMatch = text.match(/Co:(\d+)/);
    const inMatch = text.match(/In:(\d+)/);
    const wiMatch = text.match(/Wi:(\d+)/);
    const chMatch = text.match(/Ch:(\d+)/);

    if (stMatch) state.strength = stMatch[1];
    if (dxMatch) state.dexterity = parseInt(dxMatch[1]);
    if (coMatch) state.constitution = parseInt(coMatch[1]);
    if (inMatch) state.intelligence = parseInt(inMatch[1]);
    if (wiMatch) state.wisdom = parseInt(wiMatch[1]);
    if (chMatch) state.charisma = parseInt(chMatch[1]);

    const alignMatch = text.match(/(Lawful|Neutral|Chaotic)/);
    if (alignMatch) state.alignment = alignMatch[1];

    const nameMatch = text.match(/^(\S+)\s+the\s+(.+?)(?:\s{2,}|\s+St:)/);
    if (nameMatch) {
      state.playerName = nameMatch[1];
      // Role title parsing — NetHack shows rank titles, map to base roles
      const title = nameMatch[2].trim();
      state.roleTitle = title;
      if (!state.role) {
        state.role = detectRole(title);
      }
    }
  }

  // Map rank titles to base roles
  const ROLE_TITLES = {
    // Archeologist
    'Digger': 'Arc', 'Field Worker': 'Arc', 'Investigator': 'Arc', 'Exhumer': 'Arc',
    'Excavator': 'Arc', 'Spelunker': 'Arc', 'Speleologist': 'Arc', 'Collector': 'Arc',
    'Curator': 'Arc', 'Archeologist': 'Arc',
    // Barbarian
    'Plunderer': 'Bar', 'Plunderess': 'Bar', 'Pillager': 'Bar', 'Bandit': 'Bar',
    'Brigand': 'Bar', 'Raider': 'Bar', 'Reaver': 'Bar', 'Slayer': 'Bar',
    'Chieftain': 'Bar', 'Conqueror': 'Bar', 'Barbarian': 'Bar',
    // Caveperson
    'Troglodyte': 'Cav', 'Aborigine': 'Cav', 'Wanderer': 'Cav', 'Vagrant': 'Cav',
    'Wayfarer': 'Cav', 'Roamer': 'Cav', 'Nomad': 'Cav', 'Rover': 'Cav',
    'Pioneer': 'Cav', 'Explorer': 'Cav', 'Caveman': 'Cav', 'Cavewoman': 'Cav',
    // Healer
    'Rhizotomist': 'Hea', 'Empiric': 'Hea', 'Embalmer': 'Hea', 'Dresser': 'Hea',
    'Medicus ossium': 'Hea', 'Herbalist': 'Hea', 'Magister': 'Hea', 'Physician': 'Hea',
    'Chirurgeon': 'Hea', 'Healer': 'Hea',
    // Knight
    'Gallant': 'Kni', 'Esquire': 'Kni', 'Bachelor': 'Kni', 'Sergeant': 'Kni',
    'Knight': 'Kni', 'Banneret': 'Kni', 'Chevalier': 'Kni', 'Seignieur': 'Kni',
    'Paladin': 'Kni', 'Champion': 'Kni',
    // Monk
    'Candidate': 'Mon', 'Novice': 'Mon', 'Initiate': 'Mon', 'Student of Stones': 'Mon',
    'Student of Waters': 'Mon', 'Student of Metals': 'Mon', 'Student of Winds': 'Mon',
    'Student of Fire': 'Mon', 'Master': 'Mon', 'Monk': 'Mon',
    // Priest
    'Aspirant': 'Pri', 'Acolyte': 'Pri', 'Adept': 'Pri', 'Priest': 'Pri',
    'Priestess': 'Pri', 'Curate': 'Pri', 'Canon': 'Pri', 'Lama': 'Pri',
    'Patriarch': 'Pri', 'Matriarch': 'Pri', 'High Priest': 'Pri', 'High Priestess': 'Pri',
    // Ranger
    'Tenderfoot': 'Ran', 'Lookout': 'Ran', 'Trailblazer': 'Ran', 'Reconnoiterer': 'Ran',
    'Scout': 'Ran', 'Tracker': 'Ran', 'Guide': 'Ran', 'Pathfinder': 'Ran',
    'Ranger': 'Ran',
    // Rogue
    'Footpad': 'Rog', 'Cutpurse': 'Rog', 'Rogue': 'Rog', 'Pilferer': 'Rog',
    'Robber': 'Rog', 'Burglar': 'Rog', 'Filcher': 'Rog', 'Magsman': 'Rog',
    'Thief': 'Rog',
    // Samurai
    'Hatamoto': 'Sam', 'Ronin': 'Sam', 'Ninja': 'Sam', 'Joshu': 'Sam',
    'Ryoshu': 'Sam', 'Kokushu': 'Sam', 'Daimyo': 'Sam', 'Kuge': 'Sam',
    'Shogun': 'Sam', 'Samurai': 'Sam',
    // Tourist
    'Rambler': 'Tou', 'Sightseer': 'Tou', 'Excursionist': 'Tou', 'Peregrinator': 'Tou',
    'Traveler': 'Tou', 'Journeyer': 'Tou', 'Voyager': 'Tou', 'Explorer': 'Tou',
    'Adventurer': 'Tou', 'Tourist': 'Tou',
    // Valkyrie
    'Stripling': 'Val', 'Skirmisher': 'Val', 'Fighter': 'Val', 'Woman-at-arms': 'Val',
    'Warrior': 'Val', 'Swashbuckler': 'Val', 'Hero': 'Val', 'Heroine': 'Val',
    'Champion': 'Val', 'Lord': 'Val', 'Lady': 'Val', 'Valkyrie': 'Val',
    // Wizard
    'Evoker': 'Wiz', 'Conjurer': 'Wiz', 'Thaumaturge': 'Wiz', 'Magician': 'Wiz',
    'Enchanter': 'Wiz', 'Enchantress': 'Wiz', 'Sorcerer': 'Wiz', 'Sorceress': 'Wiz',
    'Necromancer': 'Wiz', 'Wizard': 'Wiz', 'Mage': 'Wiz',
  };

  function detectRole(title) {
    return ROLE_TITLES[title] || null;
  }

  function parseStatusLine2(text) {
    if (!text.trim()) return;
    // Format: "Dlvl:1 $:0 HP:16(16) Pw:5(5) AC:7 Xp:1/0 T:1"
    const dlvlMatch = text.match(/Dlvl:(\S+)/);
    const goldMatch = text.match(/\$:(\d+)/);
    const hpMatch = text.match(/HP:(\d+)\((\d+)\)/);
    const pwMatch = text.match(/Pw:(\d+)\((\d+)\)/);
    const acMatch = text.match(/AC:(-?\d+)/);
    const xlMatch = text.match(/(?:Xp|Exp):(\d+)(?:\/(\d+))?/);
    const turnMatch = text.match(/T:(\d+)/);

    if (dlvlMatch) {
      // Level changed — exit shop (might enter a new one next message)
      if (state.dlvl && state.dlvl !== dlvlMatch[1]) {
        state.inShop = false;
        state.shopType = '';
      }
      state.dlvl = dlvlMatch[1];
    }
    if (goldMatch) state.gold = parseInt(goldMatch[1]);
    if (hpMatch) { state.hp = parseInt(hpMatch[1]); state.hpmax = parseInt(hpMatch[2]); }
    if (pwMatch) { state.pw = parseInt(pwMatch[1]); state.pwmax = parseInt(pwMatch[2]); }
    if (acMatch) state.ac = parseInt(acMatch[1]);
    if (xlMatch) { state.xl = parseInt(xlMatch[1]); if (xlMatch[2]) state.xp = parseInt(xlMatch[2]); }
    if (turnMatch) state.turns = parseInt(turnMatch[1]);

    // Status effects
    const effects = [];
    for (const effect of STATUS_EFFECTS) {
      if (text.includes(effect)) effects.push(effect);
    }
    state.statusEffects = effects;
  }

  function detectBranch() {
    const d = state.dlvl;
    if (!d) return;
    if (/Home/i.test(d)) state.branch = 'Quest';
    else if (/Fort/i.test(d)) state.branch = 'Fort Ludios';
    else if (/Astral/i.test(d)) state.branch = 'Astral Plane';
    else if (/Air|Fire|Earth|Water/i.test(d)) state.branch = 'Elemental Planes';
    else if (/Vlad/i.test(d)) state.branch = "Vlad's Tower";
    else if (/Sanctum/i.test(d) || parseInt(d) >= 30) state.branch = 'Gehennom';
    else state.branch = 'Dungeons of Doom';
  }

  function onUpdate(cb) {
    listeners.push(cb);
  }

  function resetVariant() {
    state._variantDetected = false;
    state.variant = '';  // Don't assume — detect from actual game
    state.playerName = '';
    state.role = '';
    state.roleTitle = '';
    state.dlvl = '';
    state.hp = 0; state.hpmax = 0;
    state.ac = 0; state.xl = 0;
    state.turns = 0;
    state.onLoginScreen = true;
  }

  return {
    init,
    onUpdate,
    getState: () => state,
    resetVariant,
    get debug() { return debug; },
    set debug(v) { debug = !!v; console.log(`[Parser] Debug mode: ${debug}`); },
  };
})();
