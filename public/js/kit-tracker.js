// kit-tracker.js — Ascension Kit Tracker
const KitTracker = (() => {
  const ASCENSION_KIT = {
    helmet: { ideal: "helm of brilliance", alternatives: ["helm of telepathy"], icon: "🪖", found: null },
    cloak: { ideal: "cloak of magic resistance", alternatives: ["cloak of protection"], icon: "🧥", found: null },
    body: { ideal: "gray dragon scale mail", alternatives: ["silver dragon scale mail"], icon: "🛡️", found: null },
    gloves: { ideal: "gauntlets of power", alternatives: ["gauntlets of dexterity"], icon: "🧤", found: null },
    boots: { ideal: "speed boots", alternatives: ["water walking boots"], icon: "👢", found: null },
    shield: { ideal: "shield of reflection", alternatives: ["elven shield"], icon: "🔰", found: null },
    weapon: { ideal: "blessed rustproof +7 weapon", alternatives: [], icon: "⚔️", found: null },
    amulet: { ideal: "amulet of life saving", alternatives: ["amulet of reflection"], icon: "📿", found: null },
    ring1: { ideal: "ring of free action", alternatives: [], icon: "💍", found: null },
    ring2: { ideal: "ring of levitation", alternatives: ["ring of conflict"], icon: "💍", found: null },
  };

  const properties = {
    reflection: { label: "Reflection", found: false },
    magicResistance: { label: "Magic Resistance", found: false },
    freeAction: { label: "Free Action", found: false },
    speed: { label: "Speed", found: false },
    seeInvisible: { label: "See Invisible", found: false },
    telepathy: { label: "Telepathy", found: false },
    fireResistance: { label: "Fire Res", found: false },
    coldResistance: { label: "Cold Res", found: false },
    shockResistance: { label: "Shock Res", found: false },
    poisonResistance: { label: "Poison Res", found: false },
    sleepResistance: { label: "Sleep Res", found: false },
    disintegrationResistance: { label: "Disintegration Res", found: false },
  };

  // Message patterns for detecting equipment
  const WEAR_PATTERNS = [
    { regex: /You (?:are now wearing|put on)\s+(?:a |an |the )?(.+?)\./, action: 'equip' },
    { regex: /You (?:take off|remove)\s+(?:a |an |the )?(.+?)\./, action: 'remove' },
    { regex: /You were wearing\s+(?:a |an |the )?(.+?)\./, action: 'remove' },
  ];

  // Map item names to kit slots
  function matchToSlot(itemName) {
    const lower = itemName.toLowerCase();
    for (const [slot, info] of Object.entries(ASCENSION_KIT)) {
      if (lower.includes(info.ideal.toLowerCase())) return { slot, item: itemName, isIdeal: true };
      for (const alt of info.alternatives) {
        if (lower.includes(alt.toLowerCase())) return { slot, item: itemName, isIdeal: false };
      }
    }
    // Generic slot detection
    if (/helm|cap|hat/i.test(lower)) return { slot: 'helmet', item: itemName, isIdeal: false };
    if (/cloak/i.test(lower)) return { slot: 'cloak', item: itemName, isIdeal: false };
    if (/mail|armor|dragon scale/i.test(lower)) return { slot: 'body', item: itemName, isIdeal: false };
    if (/gauntlet|glove/i.test(lower)) return { slot: 'gloves', item: itemName, isIdeal: false };
    if (/boot|shoe/i.test(lower)) return { slot: 'boots', item: itemName, isIdeal: false };
    if (/shield/i.test(lower)) return { slot: 'shield', item: itemName, isIdeal: false };
    if (/amulet/i.test(lower)) return { slot: 'amulet', item: itemName, isIdeal: false };
    return null;
  }

  function detectProperties(msg) {
    const lower = msg.toLowerCase();
    if (/you feel .*fast/i.test(lower)) properties.speed.found = true;
    if (/you feel .*very firm/i.test(lower)) properties.disintegrationResistance.found = true;
    if (/you feel .*healthy/i.test(lower)) properties.poisonResistance.found = true;
    if (/you feel .*full of hot air/i.test(lower)) properties.fireResistance.found = true;
    if (/you feel .*a momentary chill/i.test(lower)) properties.coldResistance.found = true;
    if (/you feel .*a mild tingle/i.test(lower)) properties.shockResistance.found = true;
    if (/your vision .* sharpen/i.test(lower)) properties.seeInvisible.found = true;
    if (/you feel .*a strange mental acuity/i.test(lower)) properties.telepathy.found = true;
  }

  function update(gameState) {
    const msg = gameState.currentMessage;
    if (!msg) return;

    // Detect wear/remove
    for (const p of WEAR_PATTERNS) {
      const m = msg.match(p.regex);
      if (m) {
        const match = matchToSlot(m[1]);
        if (match) {
          ASCENSION_KIT[match.slot].found = p.action === 'equip' ? match.item : null;
        }
      }
    }

    detectProperties(msg);
    renderUI();
  }

  function getCompletion() {
    let total = Object.keys(ASCENSION_KIT).length + Object.keys(properties).length;
    let found = 0;
    for (const v of Object.values(ASCENSION_KIT)) { if (v.found) found++; }
    for (const v of Object.values(properties)) { if (v.found) found++; }
    return Math.round((found / total) * 100);
  }

  function renderUI() {
    const pct = getCompletion();
    document.getElementById('kit-pct').textContent = `${pct}%`;

    // Equipment slots
    const equipEl = document.getElementById('kit-equipment');
    equipEl.innerHTML = Object.entries(ASCENSION_KIT).map(([slot, info]) => {
      const found = info.found;
      const cls = found ? 'kit-found' : 'kit-missing';
      const icon = found ? '✅' : '❌';
      const label = found || info.ideal;
      return `<li class="${cls}"><span class="kit-icon">${icon}</span> <strong>${info.icon} ${slot}:</strong> ${label}</li>`;
    }).join('');

    // Properties
    const propsEl = document.getElementById('kit-properties');
    propsEl.innerHTML = Object.values(properties).map(p => {
      const cls = p.found ? 'kit-found' : 'kit-missing';
      const icon = p.found ? '✅' : '❌';
      return `<li class="${cls}"><span class="kit-icon">${icon}</span> ${p.label}</li>`;
    }).join('');
  }

  function initUI() {
    renderUI();
  }

  function reset() {
    for (const v of Object.values(ASCENSION_KIT)) v.found = null;
    for (const v of Object.values(properties)) v.found = false;
    renderUI();
  }

  function save() {
    return { kit: Object.fromEntries(Object.entries(ASCENSION_KIT).map(([k,v])=>[k,v.found])),
             props: Object.fromEntries(Object.entries(properties).map(([k,v])=>[k,v.found])) };
  }
  function load(data) {
    if (!data) return;
    if (data.kit) for (const [k,v] of Object.entries(data.kit)) { if (ASCENSION_KIT[k]) ASCENSION_KIT[k].found = v; }
    if (data.props) for (const [k,v] of Object.entries(data.props)) { if (properties[k]) properties[k].found = v; }
  }

  return { initUI, update, getCompletion, reset, save, load };
})();
