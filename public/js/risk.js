// risk.js — Risk Assessment Engine with color-aware monster identification
const RiskEngine = (() => {
  // NetHack terminal colors (xterm 256 basic):
  // 0=black, 1=red, 2=green, 3=yellow/brown, 4=blue, 5=magenta, 6=cyan, 7=white/gray
  // Bold variants: 8=darkgray, 9=bright red, 10=bright green, 11=bright yellow,
  //                12=bright blue, 13=bright magenta, 14=bright cyan, 15=bright white

  // Monster database: glyph → [{name, fg (color), danger, notes, counter}]
  // fg: -1 means any color / unknown
  const MONSTER_DB = {
    'a': [
      { name: "giant ant", fg: 3, danger: 2, notes: "Group attacker" },
      { name: "soldier ant", fg: 4, danger: 5, notes: "High damage, groups", counter: "Elbereth, ranged" },
      { name: "fire ant", fg: 1, danger: 4, notes: "Fire attack", counter: "Fire resistance" },
      { name: "killer bee", fg: 11, danger: 4, notes: "Fast, poison sting, groups", counter: "Poison res, Elbereth" },
      { name: "ant or bee", fg: -1, danger: 3 },
    ],
    'A': [
      { name: "Archon", fg: 15, danger: 9, notes: "Fast, strong, magic", counter: "MR, high AC, speed" },
      { name: "Angel", fg: 7, danger: 6, notes: "Flying, strong", counter: "High AC" },
      { name: "ki-rin", fg: 11, danger: 7, notes: "Spellcasting", counter: "MR" },
    ],
    'b': [
      { name: "acid blob", fg: 2, danger: 2, notes: "Passive acid, corrodes", counter: "Ranged attacks" },
      { name: "gelatinous cube", fg: 6, danger: 4, notes: "Engulfs, paralyzes", counter: "Free action, Elbereth" },
      { name: "rubber goose", fg: 6, danger: 1 },
    ],
    'B': [
      { name: "bat", fg: -1, danger: 1 },
    ],
    'c': [
      { name: "cockatrice", fg: 11, danger: 8, notes: "Petrification on touch/corpse!", counter: "Gloves, ranged, lizard corpse" },
      { name: "chickatrice", fg: 3, danger: 7, notes: "Petrification!", counter: "Gloves, ranged, lizard corpse" },
      { name: "pyrolisk", fg: 1, danger: 6, notes: "Gaze attack, fire", counter: "Blindfold, fire res" },
    ],
    'C': [
      { name: "plains centaur", fg: 3, danger: 3 },
      { name: "mountain centaur", fg: 6, danger: 4 },
    ],
    'd': [
      { name: "jackal", fg: 3, danger: 1, notes: "Pack animal, low threat" },
      { name: "coyote", fg: 3, danger: 1 },
      { name: "fox", fg: 1, danger: 1 },
      { name: "wolf", fg: 3, danger: 2, notes: "Pack animal" },
      { name: "warg", fg: 3, danger: 3 },
      { name: "winter wolf", fg: 6, danger: 4, notes: "Cold breath", counter: "Cold resistance" },
      { name: "winter wolf cub", fg: 6, danger: 2 },
      { name: "hell hound pup", fg: 1, danger: 3, notes: "Fire breath", counter: "Fire resistance" },
      { name: "hell hound", fg: 9, danger: 6, notes: "Fire breath", counter: "Fire resistance" },
      { name: "dog", fg: 7, danger: 1 },
      { name: "large dog", fg: 7, danger: 2 },
      { name: "werejackal", fg: 3, danger: 3, notes: "Lycanthropy!", counter: "Silver, blessed weapon" },
      { name: "werewolf", fg: 3, danger: 4, notes: "Lycanthropy!", counter: "Silver, blessed weapon" },
    ],
    'D': [
      { name: "baby dragon", fg: -1, danger: 3 },
      { name: "gray dragon", fg: 7, danger: 7, notes: "Magic resistance scale mail", counter: "Ranged, tame" },
      { name: "silver dragon", fg: 15, danger: 7, notes: "Reflection scale mail", counter: "Ranged" },
      { name: "red dragon", fg: 1, danger: 7, notes: "Fire breath", counter: "Fire resistance" },
      { name: "white dragon", fg: 7, danger: 7, notes: "Cold breath", counter: "Cold resistance" },
      { name: "blue dragon", fg: 4, danger: 7, notes: "Shock breath", counter: "Shock resistance" },
      { name: "green dragon", fg: 2, danger: 7, notes: "Poison breath", counter: "Poison resistance" },
      { name: "yellow dragon", fg: 11, danger: 7, notes: "Acid breath" },
      { name: "black dragon", fg: 0, danger: 7, notes: "Disintegration breath!", counter: "Disint resistance, reflection" },
      { name: "orange dragon", fg: 3, danger: 7, notes: "Sleep breath", counter: "Sleep resistance, free action" },
    ],
    'e': [
      { name: "floating eye", fg: 4, danger: 3, notes: "Paralyzing gaze (melee only)!", counter: "Ranged attacks, blindfold, telepathy" },
      { name: "gas spore", fg: 7, danger: 4, notes: "Explodes on death!", counter: "Kill from range" },
    ],
    'E': [
      { name: "air elemental", fg: 6, danger: 5, notes: "Engulfing", counter: "Wand of digging" },
      { name: "fire elemental", fg: 11, danger: 5, notes: "Fire passive", counter: "Fire resistance" },
      { name: "earth elemental", fg: 3, danger: 5, notes: "Phases through walls" },
      { name: "water elemental", fg: 4, danger: 5, notes: "Engulfing" },
      { name: "stalker", fg: 7, danger: 5, notes: "Invisible", counter: "See invisible" },
    ],
    'f': [
      { name: "kitten", fg: 7, danger: 1 },
      { name: "housecat", fg: 7, danger: 1 },
      { name: "large cat", fg: 7, danger: 2 },
      { name: "panther", fg: 0, danger: 3 },
      { name: "tiger", fg: 11, danger: 4 },
    ],
    'g': [
      { name: "gremlin", fg: 2, danger: 4, notes: "Steals intrinsics at night!", counter: "Fight during daytime" },
    ],
    'G': [
      { name: "gnome", fg: 3, danger: 1 },
      { name: "gnome lord", fg: 4, danger: 2 },
      { name: "gnome king", fg: 5, danger: 3 },
      { name: "ghost", fg: 7, danger: 1, notes: "Phasing" },
    ],
    'h': [
      { name: "mind flayer", fg: 5, danger: 9, notes: "Brain-eating! Int drain!", counter: "Greased helmet, genocide, ranged" },
      { name: "master mind flayer", fg: 13, danger: 10, notes: "Multiple brain attacks!", counter: "GENOCIDE. Avoid melee at ALL costs" },
      { name: "dwarf", fg: -1, danger: 2 },
      { name: "hobbit", fg: 2, danger: 1 },
    ],
    'H': [
      { name: "minotaur", fg: 3, danger: 7, notes: "Curgles in melee, never misses", counter: "Ranged, wand of digging to escape" },
      { name: "titan", fg: 5, danger: 8, notes: "Spellcasting, strong", counter: "MR, speed" },
      { name: "ettin", fg: 3, danger: 5 },
      { name: "stone giant", fg: 7, danger: 5, notes: "Throws boulders!", counter: "Ranged, speed" },
    ],
    'i': [
      { name: "imp", fg: 1, danger: 2, notes: "Teleports, annoying" },
      { name: "quasit", fg: 4, danger: 2 },
      { name: "tengu", fg: 2, danger: 3, notes: "Teleports, corpse grants teleport control" },
      { name: "leprechaun", fg: 2, danger: 2, notes: "Steals gold, teleports!", counter: "Kill quickly" },
    ],
    'j': [
      { name: "blue jelly", fg: 4, danger: 3, notes: "Cold passive damage", counter: "Don't melee, cold res" },
      { name: "yellow light", fg: 11, danger: 2, notes: "Blinds on explosion", counter: "Blinding resistance" },
    ],
    'k': [
      { name: "kobold", fg: -1, danger: 1 },
    ],
    'l': [
      { name: "leocrotta", fg: 3, danger: 4 },
      { name: "jabberwock", fg: 1, danger: 7, notes: "Strong melee, fast", counter: "High AC, speed, ranged" },
    ],
    'L': [
      { name: "arch-lich", fg: 5, danger: 9, notes: "Summons nasties, curses, spells!", counter: "MR, speed, blessed genocide L" },
      { name: "master lich", fg: -1, danger: 8, notes: "Dangerous spells, curses", counter: "MR, speed" },
      { name: "demilich", fg: 1, danger: 7, notes: "Spells, curses", counter: "MR" },
      { name: "lich", fg: 3, danger: 6, notes: "Spells", counter: "MR" },
    ],
    'M': [
      { name: "Medusa", fg: 10, danger: 8, notes: "Petrifying gaze!", counter: "Reflection, blindfold, mirror" },
    ],
    'n': [
      { name: "nymph", fg: -1, danger: 3, notes: "Steals items, teleports!", counter: "Ranged, speed, free action" },
    ],
    'N': [
      { name: "black naga", fg: 0, danger: 5, notes: "Acidic spit", counter: "Ranged" },
      { name: "golden naga", fg: 11, danger: 5, notes: "Magic attack", counter: "MR" },
      { name: "guardian naga", fg: 2, danger: 6, notes: "Paralyzing spit!", counter: "Free action, ranged" },
      { name: "red naga", fg: 1, danger: 4, notes: "Fire breath", counter: "Fire resistance" },
    ],
    'o': [
      { name: "goblin", fg: 2, danger: 1 },
      { name: "orc", fg: -1, danger: 2 },
    ],
    'P': [
      { name: "purple worm", fg: 5, danger: 7, notes: "Engulfing, digestion!", counter: "Speed, ranged" },
    ],
    'q': [
      { name: "rothe", fg: 3, danger: 2, notes: "Group attacker, herbivore" },
      { name: "mumak", fg: 7, danger: 5, notes: "Trampling, strong", counter: "Speed, ranged" },
      { name: "quantum mechanic", fg: 6, danger: 4, notes: "Teleports you!", counter: "Teleport control" },
    ],
    'R': [
      { name: "disenchanter", fg: 4, danger: 6, notes: "Removes enchantments!", counter: "Ranged, Elbereth" },
      { name: "rust monster", fg: 3, danger: 4, notes: "Rusts metal equipment!", counter: "Elbereth, non-metal, ranged" },
    ],
    's': [
      { name: "scorpion", fg: 1, danger: 3, notes: "Poison sting", counter: "Poison resistance" },
      { name: "cave spider", fg: 7, danger: 1 },
    ],
    'S': [
      { name: "pit viper", fg: 4, danger: 3, notes: "Poisonous bite", counter: "Poison resistance" },
      { name: "cobra", fg: 4, danger: 4, notes: "Spitting venom, blinds", counter: "Poison res, ranged" },
      { name: "python", fg: 2, danger: 3 },
    ],
    'T': [
      { name: "troll", fg: -1, danger: 4, notes: "Regenerates, revives!", counter: "Eat/tin corpse, acid, fire" },
      { name: "rock troll", fg: 6, danger: 5, notes: "Strong troll, regenerates", counter: "Eat/tin corpse, acid, fire" },
    ],
    'U': [
      { name: "umber hulk", fg: 3, danger: 6, notes: "Confusing gaze!", counter: "Blindfold, ranged" },
    ],
    'V': [
      { name: "vampire lord", fg: 4, danger: 6, notes: "Level drain, shape-shifts, flies", counter: "MC3, Elbereth" },
      { name: "vampire", fg: 1, danger: 5, notes: "Level drain", counter: "MC3" },
    ],
    'W': [
      { name: "wraith", fg: 0, danger: 4, notes: "Level drain (eat corpse for XL!)", counter: "MC3, Elbereth" },
      { name: "barrow wight", fg: 7, danger: 4, notes: "Level drain, equipment theft", counter: "MC3, Elbereth" },
    ],
    'X': [
      { name: "xorn", fg: 3, danger: 4, notes: "Phases through walls" },
    ],
    'Y': [
      { name: "yeti", fg: 7, danger: 3 },
      { name: "sasquatch", fg: 3, danger: 4 },
    ],
    'Z': [
      { name: "zombie", fg: -1, danger: 2 },
    ],
    '&': [
      { name: "demon lord/prince", fg: -1, danger: 9, notes: "Unique, very dangerous", counter: "MR, speed, Elbereth, cockatrice corpse" },
      { name: "vrock", fg: 1, danger: 5 },
      { name: "hezrou", fg: 3, danger: 6 },
      { name: "nalfeshnee", fg: 1, danger: 7, notes: "Spellcasting", counter: "MR" },
      { name: "marilith", fg: 1, danger: 8, notes: "Multi-weapon", counter: "High AC, speed" },
      { name: "balrog", fg: 1, danger: 8, notes: "Fire, strong", counter: "Fire res, high AC" },
    ],
    ';': [
      { name: "kraken", fg: 1, danger: 7, notes: "Drowning attack!", counter: "Magical breathing, levitation" },
      { name: "giant eel", fg: 6, danger: 4, notes: "Drowning in water!", counter: "Magical breathing" },
      { name: "electric eel", fg: 4, danger: 5, notes: "Shock + drowning", counter: "Shock res, magical breathing" },
    ],
    "'": [
      { name: "paper golem", fg: 7, danger: 1 },
      { name: "gold golem", fg: 11, danger: 3 },
      { name: "leather golem", fg: 3, danger: 2 },
      { name: "wood golem", fg: 3, danger: 2 },
      { name: "rope golem", fg: 3, danger: 2, notes: "Holds you" },
      { name: "clay golem", fg: 3, danger: 3 },
      { name: "stone golem", fg: 7, danger: 4, notes: "Slow but hits hard" },
      { name: "glass golem", fg: 6, danger: 4, notes: "Sharp shards on hit" },
      { name: "iron golem", fg: 6, danger: 6, notes: "Poison breath", counter: "Poison res" },
    ],
    ':': [
      { name: "newt", fg: 11, danger: 1, notes: "Harmless. Corpse may give energy" },
      { name: "chameleon", fg: -1, danger: 5, notes: "Can mimic any monster!", counter: "Protection from shape changers" },
      { name: "lizard", fg: 2, danger: 1, notes: "Corpse cures petrification & confusion" },
      { name: "crocodile", fg: 3, danger: 4, notes: "Drowning in water", counter: "Stay out of water" },
    ],
    'F': [
      { name: "lichen", fg: 10, danger: 1, notes: "Harmless. Eat corpse — never rots, cures hunger" },
      { name: "lichen", fg: 2, danger: 1, notes: "Harmless. Eat corpse — never rots, cures hunger" },
      { name: "brown mold", fg: 3, danger: 3, notes: "Cold passive damage, steals warmth!", counter: "Fire, ranged attacks" },
      { name: "yellow mold", fg: 11, danger: 3, notes: "Stun passive!", counter: "Ranged attacks, poison res" },
      { name: "green mold", fg: 2, danger: 3, notes: "Acid passive damage!", counter: "Ranged attacks" },
      { name: "red mold", fg: 1, danger: 2, notes: "Fire passive", counter: "Fire resistance" },
      { name: "shrieker", fg: 5, danger: 2, notes: "Screams and summons other monsters!", counter: "Kill quickly from range" },
      { name: "violet fungus", fg: 5, danger: 3, notes: "Hallucinatory touch", counter: "Ranged" },
    ],
    'I': [
      { name: "invisible stalker", fg: -1, danger: 5, notes: "Invisible!", counter: "See invisible" },
    ],
    'J': [
      { name: "blue jelly", fg: 4, danger: 3, notes: "Cold passive damage", counter: "Don't melee, cold res" },
      { name: "spotted jelly", fg: 2, danger: 3, notes: "Acid passive", counter: "Ranged" },
      { name: "ochre jelly", fg: 3, danger: 4, notes: "Acid engulfing", counter: "Ranged" },
    ],
    'K': [
      { name: "Keystone Kop", fg: 4, danger: 2, notes: "Group fighter" },
      { name: "Kop Sergeant", fg: 4, danger: 3 },
      { name: "Kop Lieutenant", fg: 4, danger: 4 },
      { name: "Kop Kaptain", fg: 4, danger: 5 },
    ],
    'm': [
      { name: "small mimic", fg: 3, danger: 3, notes: "Disguised as object!", counter: "Search, be wary of odd items" },
      { name: "large mimic", fg: 1, danger: 4, notes: "Disguised as feature!", counter: "Search" },
      { name: "giant mimic", fg: 5, danger: 6, notes: "Holds you!", counter: "Ranged first, search" },
    ],
    'O': [
      { name: "ogre", fg: 3, danger: 3, notes: "Strong melee" },
      { name: "ogre lord", fg: 1, danger: 4, notes: "Stronger, picks up stuff" },
      { name: "ogre king", fg: 5, danger: 5, notes: "Leader, strong" },
    ],
    'p': [
      { name: "rock piercer", fg: 7, danger: 2, notes: "Falls from ceiling!", counter: "Search above" },
      { name: "iron piercer", fg: 6, danger: 3, notes: "Falls from ceiling!", counter: "Search above" },
      { name: "glass piercer", fg: 15, danger: 4, notes: "Falls from ceiling!", counter: "Search above" },
    ],
    'r': [
      { name: "sewer rat", fg: 3, danger: 1 },
      { name: "giant rat", fg: 3, danger: 1 },
      { name: "rabid rat", fg: 3, danger: 2, notes: "Poisonous", counter: "Poison resistance" },
      { name: "rock mole", fg: 3, danger: 2, notes: "Steals items from pack" },
      { name: "woodchuck", fg: 3, danger: 1 },
      { name: "wererat", fg: 3, danger: 3, notes: "Lycanthropy!", counter: "Silver, blessed weapon" },
    ],
    't': [
      { name: "lurker above", fg: 7, danger: 5, notes: "Engulfing from ceiling!", counter: "Search ceiling, wand of digging" },
      { name: "trapper", fg: 2, danger: 5, notes: "Engulfing from floor!", counter: "Search, levitation" },
    ],
    'u': [
      { name: "white unicorn", fg: 7, danger: 3, notes: "Drop gems to tame, corpse cures poison!" },
      { name: "gray unicorn", fg: 7, danger: 3 },
      { name: "black unicorn", fg: 0, danger: 3 },
      { name: "pony", fg: -1, danger: 1 },
      { name: "horse", fg: 3, danger: 2 },
      { name: "warhorse", fg: 3, danger: 3 },
    ],
    'v': [
      { name: "fog cloud", fg: 7, danger: 2, notes: "Engulfing" },
      { name: "dust vortex", fg: 3, danger: 3, notes: "Blinds" },
      { name: "ice vortex", fg: 6, danger: 3, notes: "Cold damage", counter: "Cold resistance" },
      { name: "energy vortex", fg: 4, danger: 5, notes: "Drains energy!", counter: "Speed, ranged" },
      { name: "steam vortex", fg: 4, danger: 4, notes: "Scalding", counter: "Fire res" },
      { name: "fire vortex", fg: 11, danger: 5, notes: "Burns inventory!", counter: "Fire resistance" },
    ],
    'w': [
      { name: "baby long worm", fg: 3, danger: 2 },
      { name: "baby purple worm", fg: 5, danger: 3 },
      { name: "long worm", fg: 3, danger: 5, notes: "Multi-square body" },
    ],
    'x': [
      { name: "grid bug", fg: 5, danger: 1, notes: "Moves only orthogonally, low threat" },
      { name: "xan", fg: 1, danger: 2, notes: "Pricks legs, hurts movement" },
    ],
    'y': [
      { name: "monkey", fg: 7, danger: 2, notes: "Steals items!" },
      { name: "ape", fg: 3, danger: 3 },
      { name: "carnivorous ape", fg: 3, danger: 4, notes: "Strong melee" },
      { name: "owlbear", fg: 3, danger: 4, notes: "Bear hug!", counter: "High AC" },
      { name: "sasquatch", fg: 3, danger: 4 },
    ],
    'z': [
      { name: "zruty", fg: 3, danger: 4, notes: "Strong regenerating" },
    ],
    '~': [
      { name: "mimic", fg: -1, danger: 4, notes: "Disguised as object/feature!", counter: "Search" },
    ],
  };

  // Match monster by glyph and optionally foreground color
  function identifyMonsters(monsters) {
    const identified = [];
    const seen = new Set();

    for (const m of monsters) {
      const key = m.glyph + ':' + (m.fg != null ? m.fg : -1);
      if (seen.has(key)) continue;
      seen.add(key);

      const candidates = MONSTER_DB[m.glyph];
      if (!candidates) continue;

      // Try color match first, fall back to wildcard, then first entry
      let match = null;
      if (m.fg >= 0) {
        // Exact match
        match = candidates.find(c => c.fg === m.fg);
        // Bold variants: NetHack uses bold for bright colors (e.g., bold red=9, bold yellow=11)
        // Try unbold variant: fg 9→1, 10→2, 11→3, 12→4, 13→5, 14→6, 15→7
        if (!match && m.fg >= 8 && m.fg <= 15) {
          match = candidates.find(c => c.fg === m.fg - 8);
        }
        // Try bold variant
        if (!match && m.fg >= 0 && m.fg <= 7) {
          match = candidates.find(c => c.fg === m.fg + 8);
        }
      }
      if (!match) match = candidates.find(c => c.fg === -1);
      if (!match) match = candidates[0]; // best guess

      identified.push({ ...match, glyph: m.glyph, fg: m.fg, x: m.x, y: m.y, pet: !!m.pet });
    }

    // Sort by danger descending
    identified.sort((a, b) => b.danger - a.danger);
    return identified;
  }

  const RISK_LABELS = [
    '', 'Safe', 'Calm', 'Alert', 'Caution', 'Risky',
    'Dangerous', 'Perilous', 'Critical', 'Deadly', 'YASD Imminent'
  ];

  const RISK_COLORS = [
    '', '#33ff88', '#66ee66', '#99dd44', '#cccc22', '#eeaa00',
    '#ee8800', '#dd5500', '#cc2200', '#ff1111', '#ff0044'
  ];

  function assess(gameState) {
    let risk = 1;
    const factors = [];

    if (!gameState.hpmax || gameState.hpmax === 0) {
      return { score: 0, label: 'Unknown', color: '#666', factors: [{ text: 'No data', level: 'safe' }], threats: [] };
    }

    const hpPct = gameState.hp / gameState.hpmax;

    // HP assessment
    if (hpPct <= 0.15) { risk += 4; factors.push({ text: `HP critical: ${gameState.hp}/${gameState.hpmax}`, level: 'danger' }); }
    else if (hpPct <= 0.3) { risk += 3; factors.push({ text: `HP low: ${gameState.hp}/${gameState.hpmax}`, level: 'danger' }); }
    else if (hpPct <= 0.5) { risk += 1; factors.push({ text: `HP moderate: ${gameState.hp}/${gameState.hpmax}`, level: 'warning' }); }
    else { factors.push({ text: `HP good: ${gameState.hp}/${gameState.hpmax}`, level: 'safe' }); }

    // AC
    if (gameState.ac > 5) { risk += 2; factors.push({ text: `Poor AC: ${gameState.ac}`, level: 'warning' }); }
    else if (gameState.ac > 0) { risk += 1; factors.push({ text: `AC: ${gameState.ac}`, level: 'warning' }); }
    else if (gameState.ac < -10) { factors.push({ text: `Excellent AC: ${gameState.ac}`, level: 'safe' }); }

    // XL assessment
    if (gameState.xl <= 1) { risk += 2; factors.push({ text: `Very low level: XL ${gameState.xl}`, level: 'danger' }); }
    else if (gameState.xl <= 3) { risk += 1; factors.push({ text: `Low level: XL ${gameState.xl}`, level: 'warning' }); }

    // Status effects
    const badEffects = ['Conf', 'Stun', 'Blind', 'Hallu', 'Ill', 'FoodPois', 'Slimed', 'Stoned'];
    const hungerEffects = ['Weak', 'Fainting', 'Fainted'];
    for (const e of (gameState.statusEffects || [])) {
      if (badEffects.includes(e)) { risk += 2; factors.push({ text: `Status: ${e}`, level: 'danger' }); }
      else if (hungerEffects.includes(e)) { risk += 1; factors.push({ text: `Status: ${e}`, level: 'warning' }); }
      else if (e === 'Hungry') { factors.push({ text: 'Hungry', level: 'warning' }); }
    }

    // Recent level-up (positive factor — reduces risk slightly)
    if (typeof SessionStats !== 'undefined') {
      const ss = SessionStats.getStats();
      if (ss.levelUps.length > 0) {
        const last = ss.levelUps[ss.levelUps.length - 1];
        const turnsSince = (gameState.turns || 0) - last.turn;
        if (turnsSince <= 20) {
          risk = Math.max(0, risk - 1);
          factors.push({ text: `Level up! XL${last.from}→${last.to}`, level: 'safe' });
        }
      }
    }

    // Depth vs XL mismatch
    const depth = parseInt(gameState.dlvl) || 0;
    if (depth > 0 && gameState.xl > 0) {
      const mismatch = depth - gameState.xl;
      if (mismatch > 5) { risk += 2; factors.push({ text: `Too deep! Dlvl:${depth} at XL:${gameState.xl}`, level: 'danger' }); }
      else if (mismatch > 2) { risk += 1; factors.push({ text: `Deep for level: Dlvl:${depth} XL:${gameState.xl}`, level: 'warning' }); }
    }

    // Engulfed
    if (gameState.engulfed) {
      risk += 2; factors.push({ text: 'Engulfed!', level: 'danger' });
    }

    // Dead
    if (gameState.dead) {
      risk = 10; factors.push({ text: 'YOU DIED', level: 'danger' });
    }

    // Gehennom penalty
    if (gameState.branch === 'Gehennom') {
      risk += 1; factors.push({ text: 'In Gehennom — hostile territory', level: 'warning' });
    }

    // Multiple monsters is worse
    const monsterCount = (gameState.monsters || []).length;
    if (monsterCount >= 6) { risk += 2; factors.push({ text: `${monsterCount} monsters visible!`, level: 'danger' }); }
    else if (monsterCount >= 3) { risk += 1; factors.push({ text: `${monsterCount} monsters visible`, level: 'warning' }); }

    // Identify and assess monster threats (exclude pets)
    const threats = identifyMonsters(gameState.monsters || []);
    for (const t of threats) {
      if (t.pet) continue; // pets are friendly
      if (t.danger >= 8) { risk += 2; factors.push({ text: `${t.name} nearby!`, level: 'danger' }); }
      else if (t.danger >= 5) { risk += 1; factors.push({ text: `${t.name} visible`, level: 'warning' }); }
    }

    // Compound danger: low HP + high threat monsters
    if (hpPct <= 0.3 && threats.some(t => t.danger >= 6)) {
      risk += 2; factors.push({ text: '⚠️ LOW HP + DANGEROUS MONSTER', level: 'danger' });
    }

    risk = Math.min(10, Math.max(1, risk));

    return { score: risk, label: RISK_LABELS[risk], color: RISK_COLORS[risk], factors, threats };
  }

  function updateUI(gameState) {
    // Don't assess risk when no game is active
    if (typeof GameSession !== 'undefined' && !GameSession.isActive()) {
      const numEl = document.getElementById('risk-number');
      const labelEl = document.getElementById('risk-label');
      if (numEl) { numEl.textContent = '—'; numEl.style.color = '#666'; numEl.style.textShadow = 'none'; }
      if (labelEl) { labelEl.textContent = 'No game'; labelEl.style.color = '#666'; }
      const wrapper = document.getElementById('terminal-wrapper');
      if (wrapper) { wrapper.style.borderColor = ''; wrapper.style.boxShadow = ''; wrapper.classList.remove('danger-flash'); }
      const factorsEl = document.getElementById('risk-factors');
      if (factorsEl) factorsEl.innerHTML = '';
      return;
    }

    const result = assess(gameState);

    // Update risk display
    const numEl = document.getElementById('risk-number');
    const labelEl = document.getElementById('risk-label');
    numEl.textContent = result.score || '—';
    numEl.style.color = result.color;
    numEl.style.textShadow = `0 0 20px ${result.color}`;
    labelEl.textContent = result.label;
    labelEl.style.color = result.color;

    // Update terminal border glow + danger flash
    const wrapper = document.getElementById('terminal-wrapper');
    wrapper.style.borderColor = result.color;
    wrapper.style.boxShadow = `0 0 15px ${result.color}33`;
    if (result.score >= 8) {
      wrapper.classList.add('danger-flash');
    } else {
      wrapper.classList.remove('danger-flash');
    }

    // Risk factors
    const factorsEl = document.getElementById('risk-factors');
    factorsEl.innerHTML = result.factors.map(f =>
      `<li class="${f.level}">${f.level === 'danger' ? '🔴' : f.level === 'warning' ? '🟡' : '🟢'} ${f.text}</li>`
    ).join('');

    // Monster threats
    const monsterList = document.getElementById('monster-list');
    const noMonsters = document.getElementById('no-monsters');
    if (result.threats.length === 0) {
      monsterList.innerHTML = '';
      noMonsters.style.display = '';
    } else {
      noMonsters.style.display = 'none';
      monsterList.innerHTML = result.threats.map(t => {
        const dClass = t.pet ? 'danger-pet' : t.danger >= 7 ? 'danger-high' : t.danger >= 4 ? 'danger-medium' : 'danger-low';
        const petLabel = t.pet ? ' <span class="pet-label">(pet)</span>' : '';
        return `<li>
          <span class="monster-glyph ${dClass}">${t.glyph}</span>
          <span class="monster-info">${t.name}${petLabel}</span>
          <span class="monster-danger ${dClass}">${t.pet ? '🐾' : t.danger + '/10'}</span>
          ${!t.pet && t.notes ? `<span class="monster-counter">⚠ ${t.notes}</span>` : ''}
          ${!t.pet && t.counter ? `<span class="monster-counter">💡 ${t.counter}</span>` : ''}
        </li>`;
      }).join('');
    }
  }

  /**
   * Search all monsters by name (case-insensitive partial match)
   */
  function searchMonsters(query) {
    if (!query || query.length < 2) return [];
    const q = query.toLowerCase();
    const results = [];
    for (const [glyph, monsters] of Object.entries(MONSTER_DB)) {
      for (const m of monsters) {
        if (m.name.toLowerCase().includes(q)) {
          results.push({ ...m, glyph });
        }
      }
    }
    results.sort((a, b) => b.danger - a.danger);
    return results;
  }

  /**
   * Get all monsters, grouped by glyph
   */
  function getAllMonsters() {
    const all = [];
    for (const [glyph, monsters] of Object.entries(MONSTER_DB)) {
      for (const m of monsters) all.push({ ...m, glyph });
    }
    return all.sort((a, b) => a.name.localeCompare(b.name));
  }

  return { assess, updateUI, identifyMonsters, searchMonsters, getAllMonsters, MONSTER_DB };
})();
