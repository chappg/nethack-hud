// weapon-lookup.js — Display weapon stats and role skill caps on pickup/wield
const WeaponLookup = (() => {
  // NetHack 3.7 weapon database: { name: { skill, dmgS, dmgL, weight, hands } }
  // dmgS = small/medium, dmgL = large; format is dice notation
  const WEAPONS = {
    // Daggers (P_DAGGER)
    'dagger':             { skill: 'dagger', dmgS: '1d4', dmgL: '1d3', wt: 10 },
    'elven dagger':       { skill: 'dagger', dmgS: '1d5', dmgL: '1d3', wt: 10 },
    'orcish dagger':      { skill: 'dagger', dmgS: '1d3', dmgL: '1d3', wt: 10 },
    'athame':             { skill: 'dagger', dmgS: '1d4', dmgL: '1d3', wt: 10 },
    'silver dagger':      { skill: 'dagger', dmgS: '1d4', dmgL: '1d3', wt: 12 },
    // Knives (P_KNIFE)
    'knife':              { skill: 'knife', dmgS: '1d3', dmgL: '1d2', wt: 5 },
    'stiletto':           { skill: 'knife', dmgS: '1d3', dmgL: '1d2', wt: 5 },
    'scalpel':            { skill: 'knife', dmgS: '1d3', dmgL: '1d3', wt: 5 },
    'worm tooth':         { skill: 'knife', dmgS: '1d2', dmgL: '1d2', wt: 20 },
    'crysknife':          { skill: 'knife', dmgS: '1d10', dmgL: '1d10', wt: 20 },
    // Axes (P_AXE)
    'axe':                { skill: 'axe', dmgS: '1d6', dmgL: '1d4', wt: 60 },
    'battle-axe':         { skill: 'axe', dmgS: '1d8+1d4', dmgL: '1d6+2d4', wt: 120, hands: 2 },
    'dwarvish mattock':   { skill: 'pick-axe', dmgS: '1d12', dmgL: '1d8+2d6', wt: 120, hands: 2 },
    // Pick-axe
    'pick-axe':           { skill: 'pick-axe', dmgS: '1d6', dmgL: '1d3', wt: 100 },
    // Short swords (P_SHORT_SWORD)
    'short sword':        { skill: 'short sword', dmgS: '1d6', dmgL: '1d8', wt: 30 },
    'elven short sword':  { skill: 'short sword', dmgS: '1d8', dmgL: '1d8', wt: 30 },
    'orcish short sword': { skill: 'short sword', dmgS: '1d5', dmgL: '1d8', wt: 30 },
    'dwarvish short sword':{ skill: 'short sword', dmgS: '1d7', dmgL: '1d8', wt: 30 },
    // Broadswords (P_BROAD_SWORD)
    'broadsword':         { skill: 'broad sword', dmgS: '2d4', dmgL: '1d6+1', wt: 70 },
    'elven broadsword':   { skill: 'broad sword', dmgS: '1d6+1d4', dmgL: '1d6+1', wt: 70 },
    'runesword':          { skill: 'broad sword', dmgS: '2d4', dmgL: '1d6+1', wt: 40 },
    // Long swords (P_LONG_SWORD)
    'long sword':         { skill: 'long sword', dmgS: '1d8', dmgL: '1d12', wt: 40 },
    'katana':             { skill: 'long sword', dmgS: '1d10', dmgL: '1d12', wt: 40 },
    // Two-handed swords (P_TWO_HANDED_SWORD)
    'two-handed sword':   { skill: 'two-handed sword', dmgS: '1d12', dmgL: '3d6', wt: 150, hands: 2 },
    'tsurugi':            { skill: 'two-handed sword', dmgS: '1d16', dmgL: '1d8+2d6', wt: 60, hands: 2 },
    // Scimitars (P_SCIMITAR)
    'scimitar':           { skill: 'scimitar', dmgS: '1d8', dmgL: '1d8', wt: 40 },
    // Sabers (P_SABER)
    'silver saber':       { skill: 'saber', dmgS: '1d8', dmgL: '1d8', wt: 40 },
    // Clubs (P_CLUB)
    'club':               { skill: 'club', dmgS: '1d6', dmgL: '1d3', wt: 30 },
    'aklys':              { skill: 'club', dmgS: '1d6', dmgL: '1d3', wt: 15 },
    // Maces (P_MACE)
    'mace':               { skill: 'mace', dmgS: '1d6+1', dmgL: '1d6', wt: 30 },
    // Morning stars (P_MORNING_STAR)
    'morning star':       { skill: 'morning star', dmgS: '2d4', dmgL: '1d6+1', wt: 120 },
    // Flails (P_FLAIL)
    'flail':              { skill: 'flail', dmgS: '1d6+1', dmgL: '2d4', wt: 15 },
    // Hammers (P_HAMMER)
    'war hammer':         { skill: 'hammer', dmgS: '1d4+1', dmgL: '1d4', wt: 50 },
    // Quarterstaves (P_QUARTERSTAFF)
    'quarterstaff':       { skill: 'quarterstaff', dmgS: '1d6', dmgL: '1d6', wt: 40, hands: 2 },
    // Polearms (P_POLEARMS)
    'partisan':           { skill: 'polearms', dmgS: '1d6', dmgL: '1d6+1', wt: 80, hands: 2 },
    'fauchard':           { skill: 'polearms', dmgS: '1d6', dmgL: '1d8', wt: 60, hands: 2 },
    'glaive':             { skill: 'polearms', dmgS: '1d6', dmgL: '1d10', wt: 75, hands: 2 },
    'bec-de-corbin':      { skill: 'polearms', dmgS: '1d8', dmgL: '1d6', wt: 100, hands: 2 },
    'spetum':             { skill: 'polearms', dmgS: '1d6+1', dmgL: '2d6', wt: 50, hands: 2 },
    'lucern hammer':      { skill: 'polearms', dmgS: '2d4', dmgL: '1d6', wt: 150, hands: 2 },
    'guisarme':           { skill: 'polearms', dmgS: '2d4', dmgL: '1d8', wt: 80, hands: 2 },
    'ranseur':            { skill: 'polearms', dmgS: '2d4', dmgL: '2d4', wt: 50, hands: 2 },
    'voulge':             { skill: 'polearms', dmgS: '2d4', dmgL: '2d4', wt: 125, hands: 2 },
    'bill-guisarme':      { skill: 'polearms', dmgS: '2d4', dmgL: '1d10', wt: 120, hands: 2 },
    'bardiche':           { skill: 'polearms', dmgS: '2d4', dmgL: '3d4', wt: 120, hands: 2 },
    'halberd':            { skill: 'polearms', dmgS: '1d10', dmgL: '2d6', wt: 150, hands: 2 },
    // Spears (P_SPEAR)
    'spear':              { skill: 'spear', dmgS: '1d6', dmgL: '1d8', wt: 30 },
    'elven spear':        { skill: 'spear', dmgS: '1d7', dmgL: '1d8', wt: 30 },
    'orcish spear':       { skill: 'spear', dmgS: '1d5', dmgL: '1d8', wt: 30 },
    'dwarvish spear':     { skill: 'spear', dmgS: '1d8', dmgL: '1d8', wt: 35 },
    'javelin':            { skill: 'spear', dmgS: '1d6', dmgL: '1d6', wt: 20 },
    // Tridents (P_TRIDENT)
    'trident':            { skill: 'trident', dmgS: '1d6+1', dmgL: '3d4', wt: 25 },
    // Lances (P_LANCE)
    'lance':              { skill: 'lance', dmgS: '1d6', dmgL: '1d8', wt: 180 },
    // Bows (P_BOW)
    'bow':                { skill: 'bow', dmgS: '1d2', dmgL: '1d2', wt: 30, ranged: true },
    'elven bow':          { skill: 'bow', dmgS: '1d2', dmgL: '1d2', wt: 30, ranged: true },
    'orcish bow':         { skill: 'bow', dmgS: '1d2', dmgL: '1d2', wt: 30, ranged: true },
    'yumi':               { skill: 'bow', dmgS: '1d2', dmgL: '1d2', wt: 30, ranged: true },
    'arrow':              { skill: 'bow', dmgS: '1d6', dmgL: '1d6', wt: 1, ammo: true },
    'elven arrow':        { skill: 'bow', dmgS: '1d7', dmgL: '1d6', wt: 1, ammo: true },
    'orcish arrow':       { skill: 'bow', dmgS: '1d5', dmgL: '1d6', wt: 1, ammo: true },
    'silver arrow':       { skill: 'bow', dmgS: '1d6', dmgL: '1d6', wt: 1, ammo: true },
    'ya':                 { skill: 'bow', dmgS: '1d7', dmgL: '1d7', wt: 1, ammo: true },
    // Slings (P_SLING)
    'sling':              { skill: 'sling', dmgS: '1d2', dmgL: '1d2', wt: 3, ranged: true },
    'flint stone':        { skill: 'sling', dmgS: '1d6', dmgL: '1d6', wt: 10, ammo: true },
    // Crossbows (P_CROSSBOW)
    'crossbow':           { skill: 'crossbow', dmgS: '1d2', dmgL: '1d2', wt: 50, ranged: true },
    'crossbow bolt':      { skill: 'crossbow', dmgS: '1d4+1', dmgL: '1d6+1', wt: 1, ammo: true },
    // Darts (P_DART)
    'dart':               { skill: 'dart', dmgS: '1d3', dmgL: '1d2', wt: 1 },
    // Shuriken (P_SHURIKEN)
    'shuriken':           { skill: 'shuriken', dmgS: '1d8', dmgL: '1d6', wt: 1 },
    // Boomerangs (P_BOOMERANG)
    'boomerang':          { skill: 'boomerang', dmgS: '1d9', dmgL: '1d9', wt: 5 },
    // Whips (P_WHIP)
    'bullwhip':           { skill: 'whip', dmgS: '1d2', dmgL: '1d1', wt: 20 },
    'rubber hose':        { skill: 'whip', dmgS: '1d4', dmgL: '1d3', wt: 20 },
    // Unicorn horn (P_UNICORN_HORN)
    'unicorn horn':       { skill: 'unicorn horn', dmgS: '1d12', dmgL: '1d12', wt: 20 },
  };

  // Unidentified polearm appearances → real names (NH 3.7)
  const POLEARM_APPEARANCES = {
    'angled poleaxe':     'bardiche',
    'long poleaxe':       'bardiche',  // alt — actually this is voulge
    'hilted polearm':     'bill-guisarme',
    'forked polearm':     'ranseur',
    'single-edged polearm': 'fauchard',
    'pronged polearm':    'spetum',
    'long polearm':       'voulge',
    'pole cleaver':       'voulge',
    'broad polearm':      'partisan',
    'vulgar polearm':     'voulge',
    'hooked polearm':     'guisarme',
    'beaked polearm':     'bec-de-corbin',
    'pole sickle':        'fauchard',
    'pruning hook':       'bill-guisarme',
    'curved polearm':     'guisarme',
    'flattened polearm':  'lucern hammer',
    'pointed polearm':    'partisan',
  };

  // Role max skill levels for each weapon skill
  // B=Basic, S=Skilled, E=Expert, M=Master, G=Grand Master, -=Restricted
  // NH 3.7 role_skill tables
  const ROLE_SKILLS = {
    Arc: { 'dagger': 'E', 'knife': 'S', 'pick-axe': 'E', 'short sword': 'B', 'scimitar': 'B', 'saber': 'E', 'club': 'S', 'quarterstaff': 'B', 'sling': 'S', 'dart': 'B', 'boomerang': 'E', 'whip': 'E', 'unicorn horn': 'S' },
    Bar: { 'dagger': 'B', 'axe': 'E', 'pick-axe': 'B', 'short sword': 'E', 'broad sword': 'S', 'long sword': 'S', 'two-handed sword': 'E', 'scimitar': 'S', 'saber': 'B', 'club': 'S', 'mace': 'S', 'morning star': 'S', 'flail': 'B', 'hammer': 'S', 'quarterstaff': 'B', 'spear': 'S', 'trident': 'S', 'bow': 'B', 'sling': 'B', 'dart': 'B', 'whip': 'B', 'unicorn horn': 'S' },
    Cav: { 'dagger': 'B', 'axe': 'B', 'pick-axe': 'B', 'short sword': 'B', 'club': 'E', 'mace': 'S', 'morning star': 'S', 'flail': 'B', 'hammer': 'S', 'quarterstaff': 'B', 'polearms': 'B', 'spear': 'S', 'trident': 'S', 'lance': 'E', 'bow': 'B', 'sling': 'E', 'boomerang': 'B', 'unicorn horn': 'E' },
    Hea: { 'dagger': 'S', 'knife': 'E', 'short sword': 'B', 'scimitar': 'B', 'club': 'S', 'mace': 'B', 'quarterstaff': 'E', 'polearms': 'B', 'spear': 'S', 'trident': 'B', 'crossbow': 'B', 'dart': 'E', 'shuriken': 'B', 'unicorn horn': 'E' },
    Kni: { 'dagger': 'B', 'axe': 'S', 'pick-axe': 'B', 'short sword': 'B', 'broad sword': 'S', 'long sword': 'E', 'two-handed sword': 'S', 'scimitar': 'B', 'saber': 'S', 'club': 'B', 'mace': 'S', 'morning star': 'S', 'flail': 'B', 'hammer': 'B', 'polearms': 'S', 'spear': 'S', 'trident': 'B', 'lance': 'E', 'bow': 'B', 'crossbow': 'S', 'unicorn horn': 'S' },
    Mon: { 'quarterstaff': 'S', 'spear': 'S', 'crossbow': 'B', 'shuriken': 'E', 'dart': 'B', 'unicorn horn': 'B' },
    Pri: { 'dagger': 'B', 'knife': 'B', 'short sword': 'B', 'club': 'S', 'mace': 'E', 'morning star': 'S', 'flail': 'S', 'hammer': 'S', 'quarterstaff': 'S', 'polearms': 'B', 'spear': 'S', 'trident': 'B', 'lance': 'B', 'bow': 'B', 'sling': 'S', 'crossbow': 'B', 'dart': 'B', 'boomerang': 'B', 'unicorn horn': 'E' },
    Ran: { 'dagger': 'E', 'knife': 'S', 'axe': 'S', 'short sword': 'B', 'broad sword': 'B', 'long sword': 'B', 'two-handed sword': 'B', 'scimitar': 'B', 'saber': 'B', 'club': 'B', 'morning star': 'B', 'flail': 'B', 'hammer': 'B', 'quarterstaff': 'B', 'polearms': 'B', 'spear': 'E', 'trident': 'S', 'lance': 'B', 'bow': 'E', 'sling': 'B', 'crossbow': 'E', 'dart': 'E', 'boomerang': 'B', 'whip': 'B', 'unicorn horn': 'S' },
    Rog: { 'dagger': 'E', 'knife': 'E', 'short sword': 'E', 'broad sword': 'S', 'long sword': 'S', 'two-handed sword': 'B', 'scimitar': 'S', 'saber': 'S', 'club': 'S', 'mace': 'S', 'morning star': 'B', 'flail': 'B', 'hammer': 'B', 'quarterstaff': 'B', 'polearms': 'B', 'spear': 'B', 'crossbow': 'E', 'dart': 'S', 'shuriken': 'B', 'whip': 'B', 'unicorn horn': 'S' },
    Sam: { 'dagger': 'B', 'knife': 'S', 'short sword': 'E', 'broad sword': 'S', 'long sword': 'E', 'two-handed sword': 'S', 'scimitar': 'B', 'club': 'B', 'flail': 'S', 'quarterstaff': 'B', 'polearms': 'S', 'spear': 'S', 'lance': 'S', 'bow': 'E', 'shuriken': 'E', 'unicorn horn': 'B' },
    Tou: { 'dagger': 'S', 'knife': 'B', 'short sword': 'B', 'broad sword': 'B', 'long sword': 'B', 'two-handed sword': 'B', 'scimitar': 'S', 'saber': 'B', 'club': 'B', 'mace': 'B', 'morning star': 'B', 'flail': 'S', 'hammer': 'B', 'quarterstaff': 'B', 'polearms': 'B', 'spear': 'B', 'trident': 'B', 'lance': 'B', 'bow': 'B', 'sling': 'B', 'crossbow': 'B', 'dart': 'E', 'shuriken': 'B', 'boomerang': 'B', 'whip': 'S', 'unicorn horn': 'S' },
    Val: { 'dagger': 'E', 'axe': 'E', 'pick-axe': 'B', 'short sword': 'S', 'broad sword': 'S', 'long sword': 'E', 'two-handed sword': 'S', 'scimitar': 'S', 'saber': 'B', 'club': 'B', 'mace': 'B', 'morning star': 'S', 'flail': 'B', 'hammer': 'E', 'quarterstaff': 'B', 'polearms': 'S', 'spear': 'E', 'trident': 'B', 'lance': 'S', 'bow': 'B', 'sling': 'B', 'crossbow': 'B', 'dart': 'B', 'unicorn horn': 'S' },
    Wiz: { 'dagger': 'E', 'knife': 'S', 'axe': 'B', 'short sword': 'B', 'club': 'S', 'mace': 'B', 'quarterstaff': 'E', 'polearms': 'B', 'spear': 'B', 'trident': 'B', 'sling': 'S', 'dart': 'S', 'unicorn horn': 'S' },
  };

  const SKILL_LABELS = { '-': 'Restricted', 'B': 'Basic', 'S': 'Skilled', 'E': 'Expert', 'M': 'Master', 'G': 'Grand Master' };
  const SKILL_COLORS = { '-': '#666', 'B': '#aaa', 'S': '#5b5', 'E': '#5bf', 'M': '#f5f', 'G': '#ff5' };

  let lastWeapon = null;

  // Parse weapon name from pickup/wield messages
  const PICKUP_RE = [
    // "You pick up a/an/the [blessed/uncursed/cursed] [+N/-N] <weapon>."
    /[Yy]ou (?:pick up|now wield|wield|begin bashing with|ready)\s+(?:a |an |the )?(?:(?:blessed|uncursed|cursed|holy|unholy) )?(?:[+-]\d+ )?(.+?)(?:\s*\((?:weapon|wielded)\))?[.!]/,
    // "f - a/an [blessed/uncursed/cursed] [+N] <weapon>"  (inventory line after pickup)
    /^[a-zA-Z] - (?:a |an |the |\d+ )?(?:(?:blessed|uncursed|cursed) )?(?:[+-]\d+ )?(.+?)(?:\s*\((?:weapon|wielded|alternate|in quiver)\))?$/,
    // "You see here a/an <weapon>."
    /[Yy]ou (?:see|feel) here\s+(?:a |an |the )?(?:(?:blessed|uncursed|cursed) )?(?:[+-]\d+ )?(.+?)[.!]/,
  ];

  function extractWeaponName(text) {
    // Strip count like "2 daggers" → "dagger"
    let name = text.replace(/^\d+\s+/, '').trim();
    // Depluralize simple cases
    name = name.replace(/ves$/, 'fe').replace(/ies$/, 'y').replace(/s$/, '');
    // Remove "named X" suffix
    name = name.replace(/\s+named\s+.*$/, '');
    // Remove artifact "the X" wrapper — keep just the base
    name = name.replace(/\s+\(.*?\)/, '').trim();
    return name.toLowerCase();
  }

  function lookupWeapon(rawName) {
    const name = extractWeaponName(rawName);
    // Direct match
    if (WEAPONS[name]) return { ...WEAPONS[name], name, displayName: rawName };
    // Check polearm appearances
    if (POLEARM_APPEARANCES[name]) {
      const real = POLEARM_APPEARANCES[name];
      if (WEAPONS[real]) return { ...WEAPONS[real], name: real, displayName: rawName, appearance: name, realName: real };
    }
    // Fuzzy: check if any weapon name is a substring
    for (const [wname, data] of Object.entries(WEAPONS)) {
      if (name.includes(wname) || wname.includes(name)) {
        return { ...data, name: wname, displayName: rawName };
      }
    }
    return null;
  }

  function checkMessage(msg, role) {
    if (!msg) return;
    for (const re of PICKUP_RE) {
      const m = msg.match(re);
      if (m) {
        const weapon = lookupWeapon(m[1]);
        if (weapon) {
          lastWeapon = { ...weapon, role, time: Date.now() };
          renderUI(role);
          return;
        }
      }
    }
  }

  function renderUI(role) {
    const el = document.getElementById('weapon-content');
    if (!el) return;

    if (!lastWeapon) {
      el.innerHTML = '<div class="info-box">Pick up or wield a weapon to see stats.</div>';
      return;
    }

    const w = lastWeapon;
    const skillMax = (role && ROLE_SKILLS[role]) ? (ROLE_SKILLS[role][w.skill] || '-') : '?';
    const skillLabel = SKILL_LABELS[skillMax] || skillMax;
    const skillColor = SKILL_COLORS[skillMax] || '#aaa';

    const realNote = w.realName ? `<div style="font-size:10px;color:var(--text-dim);">Identified: ${w.realName}</div>` : '';
    const handsNote = w.hands === 2 ? ' (2H)' : '';

    el.innerHTML = `
      <div style="margin-bottom:6px;">
        <strong style="color:var(--accent);">⚔️ ${w.displayName}</strong>${handsNote}
        ${realNote}
      </div>
      <table style="width:100%;font-size:12px;border-collapse:collapse;">
        <tr><td style="color:var(--text-dim);">Skill</td><td><strong>${w.skill}</strong></td></tr>
        <tr><td style="color:var(--text-dim);">Dmg (small)</td><td>${w.dmgS}</td></tr>
        <tr><td style="color:var(--text-dim);">Dmg (large)</td><td>${w.dmgL}</td></tr>
        <tr><td style="color:var(--text-dim);">Weight</td><td>${w.wt}</td></tr>
        ${role ? `<tr><td style="color:var(--text-dim);">Max Skill (${role})</td><td style="color:${skillColor};font-weight:bold;">${skillLabel}</td></tr>` : ''}
      </table>
    `;

    // Make panel visible
    const panel = document.getElementById('weapon-panel');
    if (panel) panel.style.display = '';
  }

  function reset() {
    lastWeapon = null;
    renderUI(null);
  }

  function save() { return lastWeapon; }
  function load(data) { if (data) lastWeapon = data; }

  return { checkMessage, renderUI, reset, save, load, lookupWeapon };
})();
