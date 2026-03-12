// conducts.js — NetHack Conduct Tracker
// Tracks which conducts the player is maintaining based on observed messages

const ConductTracker = (() => {
  const CONDUCTS = {
    foodless:    { label: 'Foodless',    icon: '🚫🍖', intact: true, desc: 'Never ate food' },
    vegan:       { label: 'Vegan',       icon: '🌱',   intact: true, desc: 'No animal products' },
    vegetarian:  { label: 'Vegetarian',  icon: '🥕',   intact: true, desc: 'No meat' },
    atheist:     { label: 'Atheist',     icon: '⚛️',   intact: true, desc: 'Never prayed/sacrificed' },
    weaponless:  { label: 'Weaponless',  icon: '🤜',   intact: true, desc: 'Never wielded weapon' },
    pacifist:    { label: 'Pacifist',    icon: '☮️',   intact: true, desc: 'Never killed' },
    illiterate:  { label: 'Illiterate',  icon: '📵',   intact: true, desc: 'Never read' },
    polypiles:   { label: 'Polypileless',icon: '🔮',   intact: true, desc: 'Never polymorphed items' },
    polyself:    { label: 'Polyselfless',icon: '🧬',   intact: true, desc: 'Never polymorphed self' },
    wishless:    { label: 'Wishless',    icon: '⭐',   intact: true, desc: 'Never wished' },
    artiwishless:{ label: 'Artiwishless',icon: '🗡️',  intact: true, desc: 'Never wished for artifact' },
    genocideless:{ label: 'Genocideless',icon: '🕊️',  intact: true, desc: 'Never genocided' },
    elberethless:{ label: 'Elberethless',icon: '✍️',   intact: true, desc: 'Never wrote Elbereth' },
  };

  // Message patterns that break conducts
  const BREAK_PATTERNS = [
    // Food
    { re: /This .+ is (?:delicious|terrible)|You (?:eat|swallow|drink)/i, breaks: ['foodless'] },
    // Meat/animal
    { re: /You eat (?:the |a )?(?:corpse|tripe|meat|egg|tin of)/i, breaks: ['vegan','vegetarian'] },
    { re: /You eat (?:the |a )?(?:cream pie|candy bar|pancake|fortune cookie|lembas)/i, breaks: ['vegan'] },
    // Prayer/sacrifice
    { re: /You (?:begin praying|pray|sacrifice)/i, breaks: ['atheist'] },
    { re: /You offer the/i, breaks: ['atheist'] },
    // Weapons
    { re: /You wield|wielding/i, breaks: ['weaponless'] },
    // Killing
    { re: /You (?:kill|destroy|slay) /i, breaks: ['pacifist'] },
    { re: /is (?:killed|destroyed|slain)/i, breaks: ['pacifist'] },
    // Reading
    { re: /You read |As you read/i, breaks: ['illiterate'] },
    // Polymorph
    { re: /(?:shimmer|turn into|polymorph) /i, breaks: ['polyself'] },
    { re: /Some of .+ merge|objects on the floor/i, breaks: ['polypiles'] },
    // Wishes
    { re: /You may wish|For what do you wish/i, breaks: ['wishless','artiwishless'] },
    // Genocide
    { re: /Wiped out |genocided/i, breaks: ['genocideless'] },
    // Elbereth
    { re: /Elbereth/i, breaks: ['elberethless'] },
  ];

  function checkMessage(msg) {
    if (!msg) return;
    for (const p of BREAK_PATTERNS) {
      if (p.re.test(msg)) {
        for (const key of p.breaks) {
          if (CONDUCTS[key].intact) {
            CONDUCTS[key].intact = false;
            console.log(`[Conduct] ${CONDUCTS[key].label} broken: "${msg.substring(0,60)}"`);
          }
        }
      }
    }
  }

  function reset() {
    for (const k in CONDUCTS) CONDUCTS[k].intact = true;
  }

  function getAll() {
    return Object.entries(CONDUCTS).map(([key, c]) => ({ key, ...c }));
  }

  function updateUI() {
    const el = document.getElementById('conducts-list');
    if (!el) return;
    const intact = getAll().filter(c => c.intact);
    const broken = getAll().filter(c => !c.intact);
    el.innerHTML = intact.map(c =>
      `<div class="conduct intact" title="${c.desc}">${c.icon} ${c.label}</div>`
    ).join('') + (broken.length ? '<div class="conduct-divider">— broken —</div>' : '') +
    broken.map(c =>
      `<div class="conduct broken" title="${c.desc}">${c.icon} <s>${c.label}</s></div>`
    ).join('');
  }

  function save() {
    const data = {};
    for (const [k, c] of Object.entries(CONDUCTS)) data[k] = c.intact;
    return data;
  }

  function load(data) {
    if (!data) return;
    for (const [k, v] of Object.entries(data)) {
      if (CONDUCTS[k]) CONDUCTS[k].intact = v;
    }
  }

  return { checkMessage, reset, getAll, updateUI, save, load };
})();

if (typeof module !== 'undefined') module.exports = ConductTracker;
