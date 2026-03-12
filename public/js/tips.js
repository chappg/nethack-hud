// tips.js — Contextual strategy tips based on game state, role, and variant
// Focused on vanilla NetHack 3.7-dev (Hardfought) with universal tips also applicable to 3.6.7 (NAO)
// Version tags: [3.7] = 3.7 specific, [Universal] = all versions, unmarked = universal
const StrategyTips = (() => {

  // ================================================================
  // QUEST DATA — nemesis info, strategies, readiness checks
  // ================================================================
  const QUEST_DATA = {
    Arc: {
      leader: 'Lord Carnarvon',
      nemesis: 'Minion of Huhetotl',
      nemesisGlyph: '&',
      artifact: 'Orb of Detection',
      artifactPower: 'magic resistance + ESP',
      difficulty: 'moderate',
      hasWraiths: false,
      questMonsters: 'snakes, human mummies, scorpions',
      nemesisAttacks: 'Physical (8d4 + 4d6) and spell attacks. Demon — resists fire, poison.',
      strategy: 'Minion of Huhetotl is a demon with strong physical and magic attacks. Bring reflection for magic attacks. Fire resistance helps. Standard melee is fine if you have good AC.',
      readinessCheck: (gs) => {
        const warnings = [];
        if (gs.ac > -5) warnings.push('AC is too high — get below -5');
        if (gs.hpmax < 80) warnings.push('Max HP is low — consider waiting');
        return warnings;
      },
    },
    Bar: {
      leader: 'Pelias',
      nemesis: 'Thoth Amon',
      nemesisGlyph: '@',
      artifact: 'Heart of Ahriman',
      artifactPower: 'levitation',
      difficulty: 'moderate',
      hasWraiths: false,
      questMonsters: 'ogres, trolls, rock trolls',
      nemesisAttacks: 'Weapon (1d6+1d4), magic spell, summons. Carries wand of striking.',
      strategy: 'Thoth Amon is a human spellcaster. Reflection helps against wand of striking. He can summon nasties. Rush him down with your superior melee — Barbarians excel at this.',
      readinessCheck: (gs) => {
        const warnings = [];
        if (gs.ac > -5) warnings.push('AC is too high for quest');
        return warnings;
      },
    },
    Cav: {
      leader: 'Shaman Karnov',
      nemesis: 'Chromatic Dragon',
      nemesisGlyph: 'D',
      artifact: 'Sceptre of Might',
      artifactPower: 'conflict + +d5 damage',
      difficulty: 'hard',
      hasWraiths: false,
      questMonsters: 'snakes, lizards, giant spiders, carnivorous apes',
      nemesisAttacks: '⚠️ Chromatic Dragon breathes ALL elements: fire, cold, sleep, disintegration, lightning, poison, acid, and magic. Physical bite 4d8 + claw 2d8.',
      strategy: '🚨 VERY DANGEROUS. You need: fire resistance, cold resistance, sleep resistance, disintegration resistance (wear gray/silver dragon scale mail or have reflection!), shock resistance, poison resistance, and magic resistance. Missing ANY of these can be lethal. Reflection covers disintegration and some magic. Ranged attacks work if you can kite.',
      readinessCheck: (gs) => {
        const warnings = [];
        if (gs.hpmax < 100) warnings.push('⚠️ Max HP too low for Chromatic Dragon — get 100+');
        if (gs.ac > -10) warnings.push('⚠️ AC should be -10 or lower');
        warnings.push('Need ALL resistances: fire, cold, poison, sleep, shock, disint, magic');
        return warnings;
      },
    },
    Hea: {
      leader: 'Hippocrates',
      nemesis: 'Cyclops',
      nemesisGlyph: 'H',
      artifact: 'Staff of Aesculapius',
      artifactPower: 'drain life + heal self on hit',
      difficulty: 'easy',
      hasWraiths: false,
      questMonsters: 'giant rats, snakes, acid blobs',
      nemesisAttacks: 'Physical attacks (4d10 + 2d10). Throws boulders. No magic.',
      strategy: 'Cyclops is one of the easier nemeses. He throws boulders (dodge or catch with high DEX). No magic attacks — just raw physical damage. Good AC and HP will carry you. Ranged attacks work great — he has no ranged counter besides boulders.',
      readinessCheck: (gs) => {
        const warnings = [];
        if (gs.hpmax < 60) warnings.push('More HP would help');
        return warnings;
      },
    },
    Kni: {
      leader: 'King Arthur',
      nemesis: 'Ixoth',
      nemesisGlyph: 'D',
      artifact: 'Magic Mirror of Merlin',
      artifactPower: 'magic resistance',
      difficulty: 'moderate',
      hasWraiths: false,
      questMonsters: 'bugbears, wolves, quasits, ochre jellies',
      nemesisAttacks: 'Bite 4d8, claw 2d4, breathes fire. Dragon — resists fire, can fly.',
      strategy: 'Ixoth is a dragon — fire resistance is essential (he breathes fire). He can fly, so levitation or flight helps chase him. Standard melee with fire resistance and decent AC handles him well. Your lance does extra damage while mounted!',
      readinessCheck: (gs) => {
        const warnings = [];
        if (gs.ac > -5) warnings.push('Get better AC before fighting Ixoth');
        warnings.push('Fire resistance is REQUIRED — Ixoth breathes fire');
        return warnings;
      },
    },
    Mon: {
      leader: 'Grand Master',
      nemesis: 'Master Kaen',
      nemesisGlyph: '@',
      artifact: 'Eyes of the Overworld',
      artifactPower: 'enlightenment + astral vision',
      difficulty: 'very hard',
      hasWraiths: false,
      questMonsters: 'xorn, earth elemental, wood nymph',
      nemesisAttacks: '⚠️ Master Kaen has 4 claw attacks (4d10 each!) and is extremely fast (speed 12). Can steal the quest artifact. Has magic resistance, reflection, and poison resistance.',
      strategy: '🚨 MOST DANGEROUS NEMESIS. Master Kaen is blindingly fast with 4 devastating claw attacks per turn. DO NOT melee him unless massively buffed! Best strategies: (1) Throw a potion of paralysis at him (wear ring of free action!), then attack while paralyzed. (2) Block him behind boulders and use ranged attacks/wands. (3) Wand of death works if he doesn\'t have MR in 3.6.7, but he HAS MR in 3.7. Use paralysis + melee, or boulder fort + ranged.',
      readinessCheck: (gs) => {
        const warnings = [];
        if (gs.hpmax < 120) warnings.push('⚠️ Master Kaen hits HARD — get 120+ HP');
        if (gs.ac > -15) warnings.push('⚠️ Need AC -15 or lower for Kaen');
        warnings.push('💡 Bring potion of paralysis + ring of free action');
        warnings.push('💡 Or create a boulder fort for ranged attacks');
        return warnings;
      },
    },
    Pri: {
      leader: 'Arch Priest',
      nemesis: 'Nalzok',
      nemesisGlyph: '&',
      artifact: 'Mitre of Holiness',
      artifactPower: 'fire resistance',
      difficulty: 'moderate',
      hasWraiths: false,
      questMonsters: 'human zombies, wraiths, ghosts, shades',
      nemesisAttacks: 'Physical (8d4 + 4d6) and magic spell. Demon — resists fire, poison. Can summon.',
      strategy: 'Nalzok is a demon similar to Minion of Huhetotl. Reflection blocks magic attacks. He can summon nasties. Your undead turning is very effective against the quest monsters surrounding him. Holy water damages demons on contact.',
      readinessCheck: (gs) => {
        const warnings = [];
        if (gs.ac > -5) warnings.push('Improve AC before the quest');
        return warnings;
      },
    },
    Ran: {
      leader: 'Orion',
      nemesis: 'Scorpius',
      nemesisGlyph: 's',
      artifact: 'Longbow of Diana',
      artifactPower: 'telepathy + +d5 damage',
      difficulty: 'moderate',
      hasWraiths: false,
      questMonsters: 'centaurs, scorpions, forest centaurs, mountain centaurs',
      nemesisAttacks: 'Claw 2d6, poison sting (⚠️ can be lethal without poison resistance!). Has a wand — check what he zaps.',
      strategy: 'Scorpius has a deadly poison sting — POISON RESISTANCE IS REQUIRED. He also carries a random wand. Rangers excel at ranged combat — use your bow from distance. With poison resistance and good arrows, this fight is straightforward.',
      readinessCheck: (gs) => {
        const warnings = [];
        warnings.push('☠️ Poison resistance is REQUIRED — Scorpius has lethal sting');
        if (gs.hpmax < 70) warnings.push('Get more HP for safety');
        return warnings;
      },
    },
    Rog: {
      leader: 'Master of Thieves',
      nemesis: 'Master Assassin',
      nemesisGlyph: '@',
      artifact: 'Master Key of Thievery',
      artifactPower: 'half physical damage + warning',
      difficulty: 'hard (map is tricky)',
      hasWraiths: false,
      questMonsters: 'leprechauns, nymphs, assassins',
      nemesisAttacks: 'Two weapon attacks + poisoned weapon. The goal level has no-teleport, undiggable walls, and the Master Assassin is in a walled-off section.',
      strategy: '⚠️ The quest goal level is tricky: the stairs land you in a section WALLED OFF from the Master Assassin. You need phasing (cloak of displacement doesn\'t help — you need a potion of phasing, polymorph into a xorn, or fall from the level above). Poison resistance recommended. Once you reach him, he\'s not too bad in melee.',
      readinessCheck: (gs) => {
        const warnings = [];
        warnings.push('⚠️ Goal level is walled off — need phasing or fall from above!');
        warnings.push('💡 Polymorph into xorn, use potion of phasing, or fall from Dlvl above');
        return warnings;
      },
    },
    Sam: {
      leader: 'Lord Sato',
      nemesis: 'Ashikaga Takauji',
      nemesisGlyph: '@',
      artifact: 'Tsurugi of Muramasa',
      artifactPower: 'bisection attack (instakill!)',
      difficulty: 'very hard',
      hasWraiths: false,
      questMonsters: 'wolves, stalkers, ninja, war dogs',
      nemesisAttacks: '🚨 Ashikaga Takauji wields the Tsurugi of Muramasa — it has a BISECTION attack that can INSTAKILL you in one hit! Two weapon attacks + claw that steals quest artifact. IGNORES Elbereth.',
      strategy: '🚨 DO NOT MELEE ASHIKAGA TAKAUJI unless you absolutely must! The Tsurugi\'s bisection attack is instant death with no saving throw. Best strategies: (1) Wand of death (if he lacks MR). (2) Ranged attacks: daggers, shuriken, bow. (3) Wand of sleep/paralysis + ranged attacks. (4) If you must melee, pray you don\'t get bisected — it\'s roughly 1/6 chance per hit. Get the artifact, and the bisection becomes YOUR weapon.',
      readinessCheck: (gs) => {
        const warnings = [];
        warnings.push('🚨 ASHIKAGA WIELDS TSURUGI — bisection = INSTANT DEATH');
        warnings.push('☠️ DO NOT melee! Use wands, ranged attacks, or spells');
        if (gs.hpmax < 100) warnings.push('Get 100+ HP minimum');
        return warnings;
      },
    },
    Tou: {
      leader: 'Twoflower',
      nemesis: 'Master of Thieves',
      nemesisGlyph: '@',
      artifact: 'Platinum Yendorian Express Card',
      artifactPower: 'magic resistance + charge items',
      difficulty: 'moderate',
      hasWraiths: true, // Tourist quest home level can generate wraiths
      questMonsters: 'soldiers, sergeants, lieutenants, guards',
      nemesisAttacks: 'Two weapon attacks (1d6+1d4). Not very strong individually, but surrounded by soldiers.',
      strategy: 'The Master of Thieves himself is weak — the real danger is the army of soldiers guarding him. Clear them out methodically. Elbereth helps. The quest goal level has secret doors in the middle column. Not too bad if you\'re prepared for lots of combat.',
      readinessCheck: (gs) => {
        const warnings = [];
        if (gs.ac > -5) warnings.push('Improve AC — lots of soldiers to fight through');
        return warnings;
      },
    },
    Val: {
      leader: 'Norn',
      nemesis: 'Lord Surtur',
      nemesisGlyph: 'H',
      artifact: 'Orb of Fate',
      artifactPower: 'level drain resistance + half physical damage',
      difficulty: 'easy',
      hasWraiths: false,
      questMonsters: 'fire ants, fire giants, hell hounds, red dragons',
      nemesisAttacks: 'Physical attacks (2d10 + 2d10), fire-based. Respects Elbereth. May teleport to upstairs to heal.',
      strategy: 'Lord Surtur is one of the EASIEST nemeses. He respects Elbereth (write it!). Fire resistance is needed for the quest level (fire ants, hell hounds everywhere). He may teleport to heal at upstairs — chase him or engrave Elbereth there. Standard Valkyrie melee demolishes him.',
      readinessCheck: (gs) => {
        const warnings = [];
        warnings.push('Fire resistance required (fire ants, hell hounds, Surtur)');
        return warnings;
      },
    },
    Wiz: {
      leader: 'Neferet the Green',
      nemesis: 'Dark One',
      nemesisGlyph: '@',
      artifact: 'Eye of the Aethiopica',
      artifactPower: 'energy regen + branchport',
      difficulty: 'moderate',
      hasWraiths: true, // Wizard quest has wraiths as quest monster class
      questMonsters: 'vampires, wraiths, xorns, wood nymphs',
      nemesisAttacks: 'Weapon attacks + spell attacks. Human spellcaster with magic attacks. [3.7] Has magic resistance.',
      strategy: '[3.7] The Dark One has magic resistance, so wand of death won\'t work. Use physical attacks, paralysis, or sleep. Wizards should have good spell options by now. [3.6.7] Carrying the Eye of the Aethiopica grants magic resistance — this makes the Dark One\'s magic mostly harmless. 💡 Wraiths spawn on the Wizard quest — eat their corpses to level up if needed!',
      readinessCheck: (gs) => {
        const warnings = [];
        if (gs.hpmax < 70) warnings.push('Get more HP — Dark One hits hard');
        if (gs.variant === '3.7') warnings.push('[3.7] Dark One has MR — wand of death won\'t work!');
        return warnings;
      },
    },
  };

  // ================================================================
  // ROLE-SPECIFIC TIPS (general, not quest-specific)
  // ================================================================
  const ROLE_TIPS = {
    Rog: [
      "Rogues start with a sack and daggers. Throw daggers for ranged damage — you're skilled!",
      "You can backstab: attack a monster while hidden for extra damage.",
      "Rogues detect traps more easily. Search near doorways.",
      "Your quest artifact (Master Key of Thievery) gives half phys damage and warning.",
      "Daggers are your best weapon. Enchant and throw them. Elven daggers are great.",
      "Rogues get poison resistance at XL 10. Eat killer bees early for it sooner.",
    ],
    Kni: [
      "[Universal] Knights can #dip a long sword in a fountain for Excalibur at XL 5+.",
      "Your starting lance does double damage when mounted. Ride your pony!",
      "Knights have a code of honor: don't attack fleeing/peaceful monsters.",
      "Quest artifact: Magic Mirror of Merlin (magic resistance).",
      "You start Lawful — sacrifice at altars for artifact gifts.",
    ],
    Wiz: [
      "[Universal] Wizards start with useful spellbooks. Read them ASAP before they blank.",
      "Force bolt is your bread and butter early. Magic missile at higher skill.",
      "[Universal] Finger of death is the best attack spell. Save skill slots for attack magic.",
      "Quest artifact: Eye of the Aethiopica (energy regen + branchport).",
      "[Universal] Wizards can #enhance spell skills more than other roles. Invest wisely.",
      "[Universal] Blessed +7 athame (Magicbane from sacrifice) is an excellent early weapon.",
    ],
    Val: [
      "[Universal] Valkyries start with great melee — Excalibur isn't needed, but cold res is!",
      "You gain cold resistance intrinsically. Stack fire resistance gear.",
      "Quest artifact: Orb of Fate (level drain resistance, half phys damage).",
      "[Universal] You can reach Expert in long sword. A blessed rustproof +7 long sword is endgame.",
      "Valkyries start Neutral — sacrifice at neutral altars.",
    ],
    Sam: [
      "[Universal] Samurai start with a katana — excellent weapon, keep it enchanted.",
      "Your quest artifact: Tsurugi of Muramasa (bisection attack!).",
      "You can reach Expert in long sword. Snickersnee → katana → Tsurugi path.",
      "Samurai start Lawful. Sacrifice for early artifact gifts.",
    ],
    Bar: [
      "[Universal] Barbarians start with high HP and poison resistance. Eat everything!",
      "Two-handed sword does massive damage but no shield. AC is a problem early.",
      "Quest artifact: Heart of Ahriman (levitation).",
      "[Universal] You can reach Expert in two-handed sword. Keep it enchanted and rustproof.",
    ],
    Pri: [
      "[Universal] Priests know BUC of all items on pickup. Hugely powerful for ID.",
      "Your starting mace is decent. Priests can't use edged weapons effectively.",
      "Quest artifact: Mitre of Holiness (fire resistance).",
      "[Universal] Undead turning is very effective for you. Use it in Gehennom.",
    ],
    Mon: [
      "[Universal] Monks fight best unarmed — martial arts improve with level. Don't wield weapons!",
      "[Universal] You get multiple intrinsics as you level: speed, see invisible, poison res.",
      "Quest artifact: Eyes of the Overworld (enlightenment, astral vision).",
      "[Universal] Wearing body armor reduces your martial arts. Use cloak + robe only.",
    ],
    Ran: [
      "[Universal] Rangers are Expert in bow. Use it — ranged damage is your specialty.",
      "Your quest artifact: Longbow of Diana (telepathy + +d5 damage).",
      "[Universal] Rangers start with a lot of arrows. Enchant your bow, not individual arrows.",
      "You can twoweapon — consider it once you find good off-hand weapon.",
    ],
    Arc: [
      "[Universal] Archeologists start with a touchstone — use it to ID gems immediately.",
      "Your bullwhip can disarm monsters. #apply it!",
      "Quest artifact: Orb of Detection (magic resistance + ESP).",
      "[Universal] Pick-axe is great for digging — fast movement through rock.",
    ],
    Cav: [
      "[Universal] Cavepersons start strong but dumb. Int is low — spellcasting will fail often.",
      "Your starting sling is decent ranged. Collect and enchant flint stones.",
      "Quest artifact: Sceptre of Might (conflict, +d5 damage).",
    ],
    Hea: [
      "[Universal] Healers start with healing potions and can heal early. Use #apply stethoscope.",
      "[Universal] Poison resistance is critical — you know this, doctor!",
      "Quest artifact: Staff of Aesculapius (drain life + heal).",
      "[Universal] Extra healing spell + healing skill Expert = very durable.",
    ],
    Tou: [
      "[Universal] Tourists start weak but rich! Buy protection from priests early.",
      "Your starting darts stack. Enchant and throw them.",
      "Quest artifact: Platinum Yendorian Express Card (magic resistance + charge).",
      "You start with many food items. Don't starve, but don't overeat.",
    ],
  };

  // ================================================================
  // NAVIGATION TIPS — shown early to teach efficient movement
  // ================================================================
  const NAVIGATION_TIPS = [
    "🚶 [Universal] Use _ (underscore) for travel mode! Click or type a destination and your character auto-walks there. Huge time saver starting Dlvl 2+.",
    "🚶 [Universal] Use Shift+HJKL (or Shift+arrow keys) to run in a direction until something interesting happens. Way faster than tapping individual moves.",
    "🚶 [Universal] Ctrl+direction attacks in that direction — useful for fighting invisible monsters or hitting in a specific direction without moving.",
    "🚶 [Universal] Use < and > near stairs to go up/down. In travel mode (_), you can target stairs you've already seen.",
    "🚶 [Universal] The ; command lets you look at any visible square. Use : to look at what's under you.",
    "🚶 [Universal] Use # to access extended commands. #enhance is critical — check your skill slots regularly!",
  ];

  // ================================================================
  // GAME PHASE TIPS — introduced at appropriate progression points
  // ================================================================

  // Absolute beginner tips: Dlvl 1 only, first ~200 turns
  const TUTORIAL_TIPS = [
    "👋 [Universal] Welcome! Use hjkl or arrow keys to move. yubn for diagonals.",
    "👋 [Universal] Press 'i' to see your inventory. Every item has a letter slot.",
    "👋 [Universal] Press 'e' to eat food when hungry. Eat corpses from kills for nutrition and possible intrinsics!",
    "👋 [Universal] Found something? Pick it up with ',' (comma). Drop with 'd'.",
    "👋 [Universal] Attack by walking into a monster. Use ranged weapons with 'f' (fire/throw).",
    "👋 [Universal] Press '?' for help, '/' to look up a symbol on screen.",
  ];

  // Early game: Dlvl 1-6, XL 1-6
  const EARLY_TIPS = [
    "🌱 [Universal] Explore Mines first for a guaranteed luckstone at Mines' End.",
    "🌱 [Universal] Eat everything safe early — you need nutrition and potential intrinsics.",
    "🌱 [Universal] If you find a magic lamp, don't rub it until it's blessed — 80% wish chance when blessed!",
    "🌱 [Universal] Buy protection from a temple priest early — costs scale with level, so lower XL = cheaper.",
    "🌱 [Universal] Sokoban is worth doing early for the guaranteed bag of holding or amulet of reflection.",
    "🌱 [Universal] Your pet can help ID items: pets won't willingly step on cursed items.",
    "🌱 [Universal] Altar-test items: drop them on a coaligned altar and see if they glow — identifies BUC status for free.",
    "🌱 [Universal] #enhance your weapon skills! Many players forget this. Check after every few levels.",
    "🌱 [Universal] Use 'E-' to engrave 'Elbereth' on the ground with your fingers. Monsters won't attack you on that square (mostly).",
    "🌱 [Universal] Collect rocks and gems — they stack and can be thrown. Sling users love flint stones.",
    "🌱 [Universal] Sacrifice fresh corpses on coaligned altars. Eventually your god may gift you an artifact weapon!",
    "🌱 [Universal] Found a fountain? #dip a long sword in it at XL 5+ for a chance at Excalibur (Lawful only).",
  ];

  // Early-mid: Dlvl 5-12, XL 5-10 — player knows basics, learning strategy
  const EARLY_MID_TIPS = [
    "⚔️ [Universal] Poison resistance is critical. Eat a killer bee or giant spider corpse, or get it from gear.",
    "⚔️ [Universal] Stash items you want to keep near an altar or near Minetown. Don't carry everything!",
    "⚔️ [Universal] Wand of digging is both an escape tool and a mobility tool. Always know where it is.",
    "⚔️ [Universal] Tins of floating eye = guaranteed telepathy. Can also eat floating eye corpse while blind.",
    "⚔️ [Universal] #name items after price-IDing to track what you know. Example: name a potion 'price:100'.",
    "⚔️ [Universal] Cursed potions of gain level = teleport you to the level above. Useful for escape!",
    "⚔️ [Universal] If you find a magic marker, save it for scrolls: enchant weapon, enchant armor, identify, teleport.",
    "⚔️ [Universal] Check your alignment record: sacrifice at altars, don't murder peacefuls, and don't eat dogs/cats.",
    "⚔️ [Universal] Kick locked doors open (or pick them with a lock pick / credit card). Kicking can hurt if you fail.",
    "⚔️ [Universal] Scroll of gold detection, when confused, detects all traps on the level! Very useful.",
  ];

  // Mid game: Dlvl 10-20, XL 10-14
  const MID_TIPS = [
    "🏰 [Universal] Time for the Quest? You need XL 14+ and your quest leader's approval.",
    "🏰 [Universal] Collect a wand of wishing from the Castle before descending to Gehennom.",
    "🏰 [Universal] Fort Ludios has guaranteed gold and soldiers — worth the detour if you find the portal.",
    "🏰 [Universal] Get magic resistance AND reflection before Medusa's level. Both are critical.",
    "🏰 [Universal] Polypiling junk items on a polymorph trap or with a wand can yield excellent gear.",
    "🏰 [Universal] Castle approach: the drawbridge can be destroyed with a wand of striking or a drum. Passtune is the safe way.",
    "🏰 [Universal] Ensure you have: reflection, magic resistance, poison resistance, and free action before the Castle.",
    "🏰 [Universal] Blessed genocide scrolls let you remove an entire monster class. Top targets: L (liches), h (mind flayers), ; (sea monsters).",
    "🏰 [3.7] Polyselfing into a metallivore lets you eat rings for intrinsics. See invisible from a ring of see invisible!",
    "🏰 [Universal] Blessed scrolls of charging let you recharge wands. A wand of wishing can be recharged once!",
  ];

  // Late game: Dlvl 20-30, XL 14-20
  const LATE_TIPS = [
    "🔥 [Universal] Prepare for Gehennom: fire resistance is MANDATORY, and stock up on holy water.",
    "🔥 [Universal] Carry at least 2 amulets of life saving for the endgame.",
    "🔥 [Universal] Bless-test: dip items in holy water for blessed, or use #pray if your god is happy.",
    "🔥 [Universal] Wand of death is instant kill on most things. Always have one for emergencies.",
    "🔥 [Universal] Enchant your primary weapon to +6 or +7. Don't go above +7 — it can explode!",
    "🔥 [Universal] Ensure your AC is at least -10, preferably -20 or lower for Gehennom.",
  ];

  // Gehennom: Dlvl 25+
  const GEHENNOM_TIPS = [
    "🔥 [Universal] Fire resistance is mandatory in Gehennom. You'll take ambient fire damage without it.",
    "🔥 [Universal] Carry at least 2 amulets of life saving for the endgame.",
    "🔥 [Universal] The Vibrating Square is on a specific level — search with a scroll of gold detection (confused = portal detection).",
    "🔥 [Universal] Demons can gate in reinforcements. Kill quickly or use Elbereth.",
    "🔥 [Universal] The Wizard of Yendor will harass you repeatedly. Be ready for magic missile and summon nasties.",
    "🔥 [Universal] Vlad's Tower has the Candelabrum of Invocation. You need it plus the Bell and Book to perform the Invocation.",
    "🔥 [Universal] Clear Gehennom fast — the Wizard respawns and harasses you. Don't explore unnecessarily.",
    "🔥 [Universal] Orcus town has a guaranteed wand of death. Orcus himself is dangerous — high magic resistance.",
  ];

  // Endgame: Astral/Planes
  const ENDGAME_TIPS = [
    "⭐ [Universal] Astral Plane: three altars — you need the correct alignment. Neutral is in the middle.",
    "⭐ [Universal] Planes: you can't go back! Make sure you have everything you need.",
    "⭐ [Universal] Riders (Death, Famine, Pestilence) can't be permanently killed. They revive.",
    "⭐ [Universal] Conflict is powerful on the Astral Plane — let the angels fight each other.",
    "⭐ [Universal] You need the Amulet of Yendor to offer at your aligned altar for ascension.",
  ];

  // ================================================================
  // GENERAL TIPS — shown throughout, rotating
  // ================================================================
  const GENERAL_TIPS = [
    "[Universal] Always carry a lizard corpse — it cures petrification and confusion, and never rots.",
    "[Universal] Price-ID unidentified items in shops before buying. The base price narrows possibilities.",
    "[Universal] Scroll of identify is the most common scroll (base price 20zm). Save for critical items.",
    "[Universal] Dip potions into each other to create new ones. Holy water (blessed water) is especially valuable.",
    "[Universal] Name Sting (any elven dagger) to detect orcs via glow warning.",
    "[Universal] Pets step on cursed items reluctantly — use this to BUC-test on the ground.",
    "[Universal] Wand of digging is an escape tool — zap down to create holes, or break for tunnels.",
    "[Universal] Sacrifice at altars for gifts. Fresh corpses on coaligned altars may grant artifacts.",
    "[Universal] Unicorn horns cure confusion, blindness, hallucination, and more. Always carry one.",
    "[Universal] Write Elbereth with a wand of fire/lightning for a permanent, durable engraving.",
    "[Universal] Ctrl+T toggles autopickup on and off. Useful in shops or when you don't want junk.",
    "[Universal] #untrap can disarm traps and remove balls and chains. Very underused command!",
    "[Universal] Blessed items are more powerful: blessed potions heal more, blessed scrolls have better effects.",
    "[Universal] Wishing tip: 'blessed rustproof +3 gray dragon scale mail' — always specify blessed, enchantment, and erosionproofing.",
    "[Universal] Speed is a huge advantage. Speed boots, potion of speed, or the haste self spell are game-changers.",
    "[Universal] Telepathy (from eating floating eye while blind, or a helm of telepathy) reveals all monsters on the level when blind.",
  ];

  const SHOP_TIPS = [
    "[Universal] Charisma affects shop prices. Wear a +CHA ring before buying expensive items.",
    "[Universal] Pick up and drop items to get the shopkeeper's price quote for price-ID.",
    "[Universal] Don't steal unless you're sure you can handle an angry shopkeeper + Kops.",
    "[Universal] Tip: identify scrolls by their base price. 20zm = identify, 80zm = enchant weapon/armor or teleport, 300zm = genocide/charging.",
    "[Universal] In shops, you can #chat with the shopkeeper to learn item prices without picking things up.",
  ];

  const LOW_HP_TIPS = [
    "⚠️ HP critical! Consider: Elbereth, healing potion, prayer, or teleportation.",
    "⚠️ Prayer works once per ~300-600 turns and heals fully. Check your prayer timeout!",
    "⚠️ If you have a wand of digging, zap down to escape this level entirely.",
    "⚠️ Retreat toward the stairs. Fighting while wounded is the #1 cause of YASD.",
    "⚠️ Engrave Elbereth! Even finger-engraving gives one turn of safety. Write it with a wand for permanent protection.",
  ];

  const FOOD_TIPS = [
    "[Universal] Eat corpses from kills when safe. Prioritize wraith (XL gain) and tengu (teleport control).",
    "[Universal] Pray when Weak from hunger — it fills you. But don't pray too often!",
    "[Universal] A ring of slow digestion eliminates hunger entirely if you don't need the ring slot.",
    "[Universal] Tinning kit lets you preserve corpses for later. Tin of floating eye = safe telepathy.",
  ];

  // ================================================================
  // TRACKED STATE — contextual detection from messages
  // ================================================================
  let partialCorpse = null;
  let unidentifiedWands = [];
  let magicLamp = null;
  let hasUsedTravel = false;
  let hasEngraveTested = false;
  let unidentifiedBags = [];
  let unidentifiedHorns = [];
  let unidentifiedRings = [];
  let identifiableItems = [];    // items on ground or in inventory that can be ID'd by #apply/use
  let navTipShown = false;
  let lastNavTipTurn = 0;
  let polyTrapWarningShown = false;
  let onQuestLevel = false;
  let questTipShown = {};

  // Items that can be identified by simple actions (not price-ID)
  const IDENTIFIABLE_ITEMS = {
    whistle: { method: '#apply it! Tin whistle = short toot. Magic whistle = "magic" toot (recalls pets from anywhere on the level).', icon: '🎵' },
    lamp: { method: '#apply to light it. Oil lamp = ordinary light. Magic lamp = can be rubbed for a wish when blessed!', icon: '🪔' },
    flute: { method: '#apply to play. Wooden flute = bad music. Magic flute = puts nearby monsters to sleep!', icon: '🎵' },
    harp: { method: '#apply to play. Wooden harp = bad music. Magic harp = charms nearby monsters!', icon: '🎵' },
    drum: { method: '#apply to play. Leather drum = noise. Drum of earthquake = shakes the level!', icon: '🥁' },
    horn: { method: '#apply it! Tooled horn = harmless noise. Unicorn horn = cures status effects. Frost/fire horn = directional attack.', icon: '📯' },
    bag: { method: 'Drop it and #loot. "Something moving inside" = bag of tricks (don\'t store items!). Safe to put items in = bag of holding or sack.', icon: '👜' },
    sack: { method: 'Drop it and #loot. Could be a regular sack or oilskin sack (protects from water).', icon: '👜' },
  };

  function checkMessage(msg, turns) {
    if (!msg) return;

    // === Partially eaten corpse detection ===
    const stopEat = msg.match(/[Yy]ou stop eating (?:the |a |an )?(?:partly eaten )?(.+? corpse)/);
    if (stopEat) {
      partialCorpse = { name: stopEat[1], turn: turns };
      cachedTips = null;
    }
    if (/[Yy]ou finish eating|[Tt]his .+ corpse tastes|[Yy]ou eat (?:the |a |an )?(?:partly eaten )?.*corpse/i.test(msg) && !/stop eating/i.test(msg)) {
      partialCorpse = null;
      cachedTips = null;
    }

    // === Travel command detection ===
    if (/^Where do you want to travel to\?|^Travel to where\?/i.test(msg)) {
      hasUsedTravel = true;
      cachedTips = null;
    }

    // === Quest level detection ===
    if (/quest home|quest locate|quest goal|quest portal|accept your quest|you are assigned/i.test(msg)) {
      onQuestLevel = true;
      cachedTips = null;
    }
    // Quest leader rejection
    if (/not yet worthy|come back when you are more experienced|you are not ready/i.test(msg)) {
      cachedTips = null; // will trigger XL tip
    }

    // === Unidentified wand pickup ===
    const wandPickup = msg.match(/(?:pick up|see here)\s+(?:a |an )(.+? wand)[.!]/i) ||
                        msg.match(/^[a-zA-Z] - (?:a |an |\d+ )(.+? wand)\s*$/);
    if (wandPickup) {
      const wName = wandPickup[1].toLowerCase();
      if (!/wand of /.test(wName) && !unidentifiedWands.find(w => w.name === wName)) {
        unidentifiedWands.push({ name: wName, turn: turns });
        cachedTips = null;
      }
    }
    const wandInv = msg.match(/^[a-zA-Z] - (?:a |an )(.+? wand)/);
    if (wandInv) {
      const wName = wandInv[1].toLowerCase();
      if (!/wand of /.test(wName) && !unidentifiedWands.find(w => w.name === wName)) {
        unidentifiedWands.push({ name: wName, turn: turns });
        cachedTips = null;
      }
    }

    // === Wand identification clears it ===
    const wandId = msg.match(/(?:the |a |an )(.+? wand) is a wand of /i);
    if (wandId) {
      const wName = wandId[1].toLowerCase();
      unidentifiedWands = unidentifiedWands.filter(w => w.name !== wName);
      cachedTips = null;
    }

    // === Engrave-test detection ===
    if (/[Yy]ou write in the (?:dust|floor|frost|mud)|The bugs on the .* rearrange|[Yy]ou engrave/i.test(msg)) {
      hasEngraveTested = true;
    }

    // === Identifiable item detection (whistle, lamp, flute, harp, drum, etc.) ===
    for (const [itemType, info] of Object.entries(IDENTIFIABLE_ITEMS)) {
      // Match "you see here a <adjective> whistle" or "a - a <adjective> whistle"
      const seePattern = new RegExp(`(?:see here|pick up|feel here)\\s+(?:a |an )(?:\\w+ )?${itemType}`, 'i');
      const invPattern = new RegExp(`^[a-zA-Z] - (?:a |an )(?:\\w+ )?${itemType}`, 'i');
      if (seePattern.test(msg) || invPattern.test(msg)) {
        // Don't add if already identified (e.g. "magic whistle", "tin whistle", etc.)
        const alreadyId = new RegExp(`(?:magic|tin|tooled|unicorn|frost|fire|wooden|leather|oil|oilskin|bag of) ${itemType}`, 'i');
        if (!alreadyId.test(msg) && !identifiableItems.find(i => i.type === itemType)) {
          identifiableItems.push({ type: itemType, turn: turns });
          cachedTips = null;
        }
      }
      // Clear when identified
      const idPattern = new RegExp(`(?:magic|tin|tooled|unicorn|frost|fire|wooden|leather|oil) ${itemType}`, 'i');
      if (idPattern.test(msg) && /(?:is a|identify|call it|named)/i.test(msg)) {
        identifiableItems = identifiableItems.filter(i => i.type !== itemType);
        cachedTips = null;
      }
    }

    // === Bag detection ===
    const bagPickup = msg.match(/(?:pick up|see here)\s+(?:a |an )(.+? (?:bag|sack))[.!]/i) ||
                      msg.match(/^[a-zA-Z] - (?:a |an )(.+? (?:bag|sack))/);
    if (bagPickup) {
      const bName = bagPickup[1].toLowerCase();
      if (!/bag of holding|bag of tricks|oilskin sack/.test(bName) && !unidentifiedBags.find(b => b.name === bName)) {
        unidentifiedBags.push({ name: bName, turn: turns });
        cachedTips = null;
      }
    }
    if (/bag of tricks|bag of holding|oilskin sack/i.test(msg)) {
      unidentifiedBags = [];
      cachedTips = null;
    }

    // === Horn detection ===
    const hornPickup = msg.match(/(?:pick up|see here)\s+(?:a |an )(.+? horn)[.!]/i) ||
                       msg.match(/^[a-zA-Z] - (?:a |an )(.+? horn)/);
    if (hornPickup) {
      const hName = hornPickup[1].toLowerCase();
      if (!/unicorn horn|frost horn|fire horn|horn of plenty|tooled horn/.test(hName) && !unidentifiedHorns.find(h => h.name === hName)) {
        unidentifiedHorns.push({ name: hName, turn: turns });
        cachedTips = null;
      }
    }
    if (/unicorn horn|frost horn|fire horn|horn of plenty|tooled horn/i.test(msg)) {
      unidentifiedHorns = unidentifiedHorns.filter(h => !msg.toLowerCase().includes(h.name));
      cachedTips = null;
    }

    // === Ring detection (near sinks) ===
    const ringPickup = msg.match(/(?:pick up|see here)\s+(?:a |an )(.+? ring)[.!]/i) ||
                       msg.match(/^[a-zA-Z] - (?:a |an )(.+? ring)/);
    if (ringPickup) {
      const rName = ringPickup[1].toLowerCase();
      if (!/ring of /.test(rName) && !unidentifiedRings.find(r => r.name === rName)) {
        unidentifiedRings.push({ name: rName, turn: turns });
        cachedTips = null;
      }
    }
    if (/ring of /i.test(msg) && /is a ring of|identify/i.test(msg)) {
      unidentifiedRings = [];
      cachedTips = null;
    }

    // === Magic lamp tracking ===
    const lampPickup = /(?:pick up|see here)\s+(?:a |an )?(?:(blessed|uncursed|cursed) )?magic lamp/i.test(msg) ||
                       /^[a-zA-Z] - (?:a |an |\d+ )?(?:(blessed|uncursed|cursed) )?magic lamp/i.test(msg);
    if (lampPickup) {
      const bucMatch = msg.match(/(blessed|uncursed|cursed)\s+magic lamp/i);
      magicLamp = { buc: bucMatch ? bucMatch[1].toLowerCase() : 'unknown', turn: turns };
      cachedTips = null;
    }
    if (/magic lamp|lamp called magic/i.test(msg) && !magicLamp) {
      const bucMatch = msg.match(/(blessed|uncursed|cursed)\s+(?:magic lamp|lamp)/i);
      magicLamp = { buc: bucMatch ? bucMatch[1].toLowerCase() : 'unknown', turn: turns };
      cachedTips = null;
    }
    if (magicLamp && magicLamp.buc === 'unknown') {
      if (/magic lamp.+(?:glow|glows) amber|magic lamp.+light blue/i.test(msg)) {
        magicLamp.buc = 'blessed'; cachedTips = null;
      } else if (/magic lamp.+(?:glow|glows) black/i.test(msg)) {
        magicLamp.buc = 'cursed'; cachedTips = null;
      } else if (/magic lamp.+(?:does not|doesn't) glow/i.test(msg)) {
        magicLamp.buc = 'uncursed'; cachedTips = null;
      }
      const idMatch = msg.match(/(blessed|uncursed|cursed) magic lamp/i);
      if (idMatch) { magicLamp.buc = idMatch[1].toLowerCase(); cachedTips = null; }
    }
    if (magicLamp && /(?:blessed) magic lamp/i.test(msg)) {
      magicLamp.buc = 'blessed'; cachedTips = null;
    }
    if (magicLamp && /you rub the .*lamp|the lamp is now lit|djinn|genie|wish/i.test(msg)) {
      magicLamp = null; cachedTips = null;
    }
  }

  // ================================================================
  // TIP SELECTION ENGINE
  // ================================================================
  let lastTipIndex = -1;
  let lastRoleTipIndex = -1;
  let lastSpecificTip = '';
  let lastDlvl = '';
  let cachedTips = null;

  let tipCounters = {};
  function nextFrom(key, arr) {
    if (!arr || arr.length === 0) return null;
    if (!tipCounters[key]) tipCounters[key] = 0;
    const tip = arr[tipCounters[key] % arr.length];
    tipCounters[key]++;
    return tip;
  }

  function getTips(gs) {
    const currentDlvl = gs.dlvl || '';
    const effects = gs.statusEffects || [];
    const hasUrgent = (gs.hpmax > 0 && gs.hp / gs.hpmax < 0.3) ||
      effects.some(e => ['Stoned', 'Slimed', 'Fainting'].includes(e)) ||
      gs.engulfed || gs.dead;

    const hasContextual = !!(partialCorpse || unidentifiedWands.length || magicLamp ||
      unidentifiedBags.length || unidentifiedHorns.length || identifiableItems.length);

    if (cachedTips && currentDlvl === lastDlvl && !hasUrgent && !hasContextual) {
      return cachedTips;
    }
    lastDlvl = currentDlvl;

    const tips = [];
    const role = gs.role || '';
    const depth = parseInt(gs.dlvl) || 0;
    const xl = gs.xl || 0;
    const turns = gs.turns || 0;
    const variant = gs.variant || '3.7';

    // ==========================================================================
    // P1: THINGS THAT WILL KILL YOU RIGHT NOW
    // Stoning, sliming, critically low HP, engulfed, deadly status effects
    // ==========================================================================

    if (effects.includes('Stoned')) tips.push("🚨 TURNING TO STONE! Eat a lizard corpse or acidic corpse NOW! ~5 turns!");
    if (effects.includes('Slimed')) tips.push("🚨 SLIMING! Burn yourself with fire to cure!");
    if (gs.engulfed) tips.push("🫠 Engulfed! Zap wand of digging, force bolt, or attack the engulfer.");

    if (gs.hpmax > 0 && gs.hp / gs.hpmax < 0.3) {
      tips.push(nextFrom('lowHP', LOW_HP_TIPS));
    }

    if (effects.some(e => ['Fainting'].includes(e))) {
      tips.push(nextFrom('food', FOOD_TIPS));
    }

    if (effects.includes('Confused')) tips.push("💡 Confused! Eat a lizard corpse or use unicorn horn. Avoid engraving Elbereth while confused.");
    if (effects.includes('Hallucinating')) tips.push("💡 Hallucinating! Use unicorn horn. Don't trust monster glyphs or item names.");

    // ==========================================================================
    // P2: THINGS THAT MAY KILL YOU (quest nemesis, dangerous monsters, traps)
    // ==========================================================================

    // Dangerous monster nearby
    const monsters = gs.monsters || [];
    if (monsters.length > 0 && typeof RiskEngine !== 'undefined') {
      const identified = RiskEngine.identifyMonsters(monsters);
      const worst = identified[0];
      if (worst && worst.danger >= 7 && worst.counter) {
        const tip = `⚔️ ${worst.name} nearby! Counter: ${worst.counter}`;
        if (tip !== lastSpecificTip) { tips.push(tip); lastSpecificTip = tip; }
      }
    }

    // Quest nemesis warnings (on quest branch)
    if (role && QUEST_DATA[role] && (gs.branch === 'Quest' || onQuestLevel)) {
      const qd = QUEST_DATA[role];
      const questTips = [
        `⚔️ NEMESIS: ${qd.nemesis} (${qd.nemesisGlyph}) — ${qd.nemesisAttacks}`,
        `💡 Strategy: ${qd.strategy}`,
      ];
      if (qd.readinessCheck) {
        const warnings = qd.readinessCheck(gs);
        if (warnings.length > 0) {
          questTips.push(`📋 Readiness: ${warnings.join(' | ')}`);
        }
      }
      questTips.push(`🏆 Artifact: ${qd.artifact} — ${qd.artifactPower}`);
      if (!questTipShown[role + '_monsters']) {
        tips.push(`🏛️ Quest monsters: ${qd.questMonsters}. ${qd.hasWraiths ? '💡 Wraiths here! Eat corpses to level up.' : ''}`);
        questTipShown[role + '_monsters'] = true;
      }
      tips.push(nextFrom('quest_' + role, questTips));
    }

    // Polymorph trap warning (can kill via system shock)
    if (depth >= 8 && !polyTrapWarningShown) {
      tips.push("⚠️ POLYMORPH TRAPS can appear from Dlvl 8+! System shock can KILL you. Get magic resistance or amulet of unchanging.");
      polyTrapWarningShown = true;
    }

    // Mimic warning
    if (gs.mimicWarning === 'active') {
      tips.push("🎭 Mimic awake! They're slow — just walk away. Break line of sight (turn a corner) and they'll go back to mimicking an object.");
    } else if (gs.mimicWarning) {
      tips.push("🎭 Strange objects are always mimics. Don't touch it — walk away. If you wake it, break line of sight to make it re-mimic.");
    }

    // ==========================================================================
    // P3: THINGS THAT COULD SAVE YOUR LIFE (item identification, survival tools)
    // Identifying wands/items could reveal escape tools or powerful weapons
    // ==========================================================================

    // Unidentified wand — TOP item ID priority (could be wand of death, digging, teleport)
    if (unidentifiedWands.length > 0) {
      const wandNames = unidentifiedWands.map(w => w.name).join(', ');
      tips.push(`🪄 Unidentified wand(s): ${wandNames}. Engrave-test! E → select wand → write 'x'. Vanish=teleport/poly, burn=fire/lightning, dig=digging, zig-zag=striking.`);
    }

    // Unidentified bag (could be bag of holding — game-changing)
    if (unidentifiedBags.length > 0) {
      tips.push(`👜 Unidentified bag! Drop it and #loot. "Something moving inside" = bag of tricks. Otherwise = bag of holding or sack.`);
    }

    // Unidentified horn (unicorn horn = key survival tool)
    if (unidentifiedHorns.length > 0) {
      tips.push(`📯 Unidentified horn! #apply to test. Tooled = noise. Unicorn horn = cures status effects. Frost/fire = directional attack.`);
    }

    // Items on ground/inventory that can be easily identified
    if (identifiableItems.length > 0) {
      const item = identifiableItems[0]; // Show most recent
      const info = IDENTIFIABLE_ITEMS[item.type];
      if (info) {
        tips.push(`${info.icon} Unidentified ${item.type}! ${info.method}`);
      }
    }

    // Unidentified rings near sink
    if (unidentifiedRings.length > 0 && gs.nearSink) {
      tips.push(`💍 Unidentified rings near a sink! Drop them in one at a time — each ring type creates a different identification effect.`);
    }

    // Magic lamp — potentially game-winning wish
    if (magicLamp) {
      if (magicLamp.buc === 'unknown') {
        tips.push("🪔 Magic lamp — unknown BUC! ID it first (altar/identify/pet). Blessed = 80% wish!");
      } else if (magicLamp.buc === 'cursed' || magicLamp.buc === 'uncursed') {
        tips.push(`🪔 Magic lamp is ${magicLamp.buc}. Bless it first! Dip in holy water. Blessed = 80% wish.`);
      } else if (magicLamp.buc === 'blessed') {
        tips.push("🪔 Blessed magic lamp! Rub it (#apply) for 80% chance of a wish. Save it until you know what to wish for.");
      }
    }

    // Partially eaten corpse
    if (partialCorpse) {
      tips.push(`🍖 Partly eaten ${partialCorpse.name} — finish eating before it rots! Press 'e'.`);
    }

    // Prayer reminder (survival tool)
    if (typeof AltarTracker !== 'undefined') {
      const altarState = AltarTracker.getState ? AltarTracker.getState() : null;
      const neverPrayed = altarState && altarState.lastPrayerTurn === 0;
      if (neverPrayed && turns >= 300 && turns < 3000 && xl < 14) {
        tips.push("🙏 Haven't prayed yet! At low HP (≤1/7 max), prayer heals fully. Safe after ~300 turns.");
      }
    }

    // ==========================================================================
    // P4: OTHER (navigation, phase tips, role tips, general advice)
    // Only shown if higher-priority tips haven't filled all 3 slots
    // ==========================================================================

    // Hunger (non-fainting)
    if (effects.some(e => ['Hungry', 'Weak'].includes(e)) && !effects.includes('Fainting')) {
      tips.push(nextFrom('food', FOOD_TIPS));
    }

    // Blind (not urgent but worth noting)
    if (effects.includes('Blind') && !tips.some(t => t.includes('Blind'))) {
      tips.push("💡 Blind! Apply a unicorn horn or wait it out. Telepathy works great while blind.");
    }

    // Quest XL requirement (not on quest yet)
    if (role && QUEST_DATA[role] && !(gs.branch === 'Quest' || onQuestLevel)) {
      if (xl >= 10 && xl < 14 && depth >= 10) {
        const qd = QUEST_DATA[role];
        tips.push(`🏛️ Quest requires XL 14. You're XL ${xl} — ${14 - xl} more levels. ${qd.hasWraiths ? 'Your quest has wraiths for free levels!' : ''}`);
      }
    }

    // Navigation tips
    if (!hasUsedTravel && depth >= 2 && turns > 200 && (turns - lastNavTipTurn > 100)) {
      tips.push(nextFrom('nav', NAVIGATION_TIPS));
      lastNavTipTurn = turns;
    }

    // Shop tips
    if (gs.inShop && !gs.mimicWarning) {
      tips.push(nextFrom('shop', SHOP_TIPS));
    }

    // Phase-appropriate strategy
    if (depth <= 1 && turns < 200 && xl <= 2) {
      tips.push(nextFrom('tutorial', TUTORIAL_TIPS));
    } else if (xl <= 6 && depth <= 8) {
      tips.push(nextFrom('early', EARLY_TIPS));
    } else if (xl <= 10 && depth <= 15) {
      tips.push(nextFrom('earlyMid', EARLY_MID_TIPS));
    } else if (xl <= 14 && depth <= 25 && gs.branch !== 'Quest') {
      tips.push(nextFrom('mid', MID_TIPS));
    } else if (xl <= 20 && depth < 30 && gs.branch !== 'Quest') {
      tips.push(nextFrom('late', LATE_TIPS));
    } else if ((gs.branch === 'Gehennom' || depth >= 30) && gs.branch !== 'Quest') {
      tips.push(nextFrom('gehennom', GEHENNOM_TIPS));
    }
    if (gs.branch === 'Astral Plane' || gs.branch === 'Elemental Planes') {
      tips.push(nextFrom('endgame', ENDGAME_TIPS));
    }

    // Role-specific (not on quest)
    if (role && ROLE_TIPS[role] && gs.branch !== 'Quest') {
      const roleTips = ROLE_TIPS[role];
      lastRoleTipIndex = (lastRoleTipIndex + 1) % roleTips.length;
      tips.push(`🎭 ${roleTips[lastRoleTipIndex]}`);
    }

    // Lower-danger monster counter tips
    if (monsters.length > 0 && typeof RiskEngine !== 'undefined') {
      const identified = RiskEngine.identifyMonsters(monsters);
      const worst = identified[0];
      if (worst && worst.danger < 7 && worst.counter) {
        const tip = `⚔️ ${worst.name} nearby! Counter: ${worst.counter}`;
        if (tip !== lastSpecificTip) { tips.push(tip); lastSpecificTip = tip; }
      }
    }

    // Fill with general tips
    if (tips.length < 2) {
      tips.push(nextFrom('general', GENERAL_TIPS));
    }

    cachedTips = tips.slice(0, 3);
    return cachedTips;
  }

  function updateUI(gameState) {
    const tips = getTips(gameState);
    const container = document.getElementById('tips-content');
    if (!container) return;
    if (tips.length === 0) {
      container.innerHTML = '<div class="info-box">No specific tips right now.</div>';
      return;
    }
    const variant = gameState.variant || '3.7';
    const roleLabel = gameState.role
      ? `<div style="font-size:10px;color:var(--text-dim);margin-bottom:4px;">Role: ${gameState.roleTitle || gameState.role} | NH ${variant}${gameState.branch === 'Quest' ? ' | 🏛️ ON QUEST' : ''}</div>`
      : '';
    container.innerHTML = roleLabel + tips.map(t => `<li class="tip-item">${t}</li>`).join('');
  }

  return { getTips, updateUI, checkMessage, QUEST_DATA };
})();
