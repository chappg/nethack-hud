// spell-tracker.js — Track known spells, cooldowns, and skill levels
const SpellTracker = (() => {
  const spells = {}; // name → {school, level, lastCast, failRate, known}
  const skills = {}; // school → level (Unskilled/Basic/Skilled/Expert)

  // Spell schools and their notable spells
  const SPELL_DB = {
    'force bolt':       { school: 'attack',    level: 1, notes: 'Reliable damage' },
    'magic missile':    { school: 'attack',    level: 2, notes: 'Bounces off walls' },
    'cone of cold':     { school: 'attack',    level: 4, notes: 'Cold ray, good damage' },
    'fireball':         { school: 'attack',    level: 4, notes: 'Area damage, burns items' },
    'finger of death':  { school: 'attack',    level: 7, notes: 'Instant kill! MR blocks' },
    'healing':          { school: 'healing',   level: 1, notes: 'Basic heal' },
    'extra healing':    { school: 'healing',   level: 3, notes: 'Better heal, cures blind' },
    'cure blindness':   { school: 'healing',   level: 2, notes: 'Cures blindness' },
    'cure sickness':    { school: 'healing',   level: 3, notes: 'Cures illness/food poisoning' },
    'restore ability':  { school: 'healing',   level: 4, notes: 'Restores drained stats' },
    'detect monsters':  { school: 'divination',level: 1, notes: 'Shows all monsters' },
    'detect food':      { school: 'divination',level: 2, notes: 'Shows all food' },
    'clairvoyance':     { school: 'divination',level: 3, notes: 'Reveals map area' },
    'detect unseen':    { school: 'divination',level: 3, notes: 'See invisible, traps' },
    'identify':         { school: 'divination',level: 5, notes: 'Identifies items!' },
    'magic mapping':    { school: 'divination',level: 5, notes: 'Reveals whole level' },
    'sleep':            { school: 'enchantment',level: 1, notes: 'Puts monsters to sleep' },
    'confuse monster':  { school: 'enchantment',level: 2, notes: 'Next melee confuses' },
    'slow monster':     { school: 'enchantment',level: 2, notes: 'Slows target' },
    'charm monster':    { school: 'enchantment',level: 3, notes: 'Tames monster!' },
    'remove curse':     { school: 'clerical',  level: 3, notes: 'Uncurses worn/wielded' },
    'turn undead':      { school: 'clerical',  level: 6, notes: 'Damages/flees undead' },
    'protection':       { school: 'clerical',  level: 1, notes: 'Temporary AC boost' },
    'create monster':   { school: 'clerical',  level: 2, notes: 'Summons monsters' },
    'haste self':       { school: 'escape',    level: 3, notes: 'Temporary speed' },
    'invisibility':     { school: 'escape',    level: 4, notes: 'Go invisible' },
    'teleport away':    { school: 'escape',    level: 6, notes: 'Teleports monster away' },
    'polymorph':        { school: 'matter',    level: 6, notes: 'Polymorphs target' },
    'cancellation':     { school: 'matter',    level: 7, notes: 'Cancels monster magic' },
    'dig':              { school: 'matter',    level: 5, notes: 'Digs through walls/floors' },
    'knock':            { school: 'matter',    level: 1, notes: 'Opens locks' },
    'wizard lock':      { school: 'matter',    level: 2, notes: 'Locks doors/containers' },
    'levitation':       { school: 'escape',    level: 4, notes: 'Float above ground' },
    'jumping':          { school: 'escape',    level: 1, notes: 'Jump 2-4 squares' },
  };

  const SCHOOLS = ['attack', 'healing', 'divination', 'enchantment', 'clerical', 'escape', 'matter'];
  const SCHOOL_ICONS = {
    attack: '⚔️', healing: '💚', divination: '🔮', enchantment: '✨',
    clerical: '⛪', escape: '💨', matter: '🧪'
  };

  // Message patterns
  const LEARN_RE = /you (?:learn|know) (?:the )?(?:spell of )?(.+?)(?:\.|!)/i;
  const CAST_RE = /you cast (?:the )?(?:spell of )?(.+?)(?:\.|!)/i;
  const FAIL_RE = /you fail to cast (.+?)(?:\.|!)/i;
  const FORGET_RE = /you have forgotten (.+?)(?:\.|!)/i;
  const SKILL_RE = /you (?:are now|become) (\w+) in (.+?)(?:\.|!)/i;

  // Spell memory: spells expire after ~10000-20000 turns
  const SPELL_MEMORY = 20000;

  function checkMessage(msg, turns) {
    if (!msg) return;

    const learn = msg.match(LEARN_RE);
    if (learn) {
      const name = learn[1].toLowerCase().trim();
      const db = SPELL_DB[name];
      spells[name] = {
        school: db?.school || 'unknown',
        level: db?.level || 0,
        notes: db?.notes || '',
        learnedTurn: turns,
        lastCast: 0,
        known: true,
      };
    }

    const cast = msg.match(CAST_RE);
    if (cast) {
      const name = cast[1].toLowerCase().trim();
      if (spells[name]) spells[name].lastCast = turns;
      else {
        const db = SPELL_DB[name];
        spells[name] = { school: db?.school || 'unknown', level: db?.level || 0, notes: db?.notes || '', learnedTurn: turns, lastCast: turns, known: true };
      }
    }

    const fail = msg.match(FAIL_RE);
    if (fail) {
      const name = fail[1].toLowerCase().trim();
      if (spells[name]) spells[name].lastFail = turns;
    }

    const forget = msg.match(FORGET_RE);
    if (forget) {
      const name = forget[1].toLowerCase().trim();
      if (spells[name]) spells[name].known = false;
    }

    const skill = msg.match(SKILL_RE);
    if (skill) {
      skills[skill[2].toLowerCase().trim()] = skill[1];
    }
  }

  function updateUI(turns) {
    const el = document.getElementById('spell-list');
    if (!el) return;

    const known = Object.entries(spells).filter(([_, s]) => s.known);
    if (!known.length) {
      el.innerHTML = '<div class="info-box">No spells learned yet</div>';
      return;
    }

    // Group by school
    const bySchool = {};
    known.forEach(([name, s]) => {
      if (!bySchool[s.school]) bySchool[s.school] = [];
      bySchool[s.school].push({ name, ...s });
    });

    let html = '';
    for (const school of SCHOOLS) {
      if (!bySchool[school]) continue;
      const icon = SCHOOL_ICONS[school] || '📖';
      const skillLevel = skills[school] || '';
      html += `<div class="spell-school">${icon} ${school}${skillLevel ? ` (${skillLevel})` : ''}</div>`;
      bySchool[school].sort((a, b) => a.level - b.level).forEach(s => {
        const turnsLeft = turns ? Math.max(0, SPELL_MEMORY - (turns - (s.learnedTurn || 0))) : '?';
        const fading = typeof turnsLeft === 'number' && turnsLeft < 3000;
        html += `<div class="spell-item ${fading ? 'spell-fading' : ''}">
          <span class="spell-name">${s.name}</span>
          <span class="spell-level">Lv${s.level}</span>
          ${s.notes ? `<div class="spell-notes">${s.notes}</div>` : ''}
        </div>`;
      });
    }

    // Forgotten
    const forgotten = Object.entries(spells).filter(([_, s]) => !s.known);
    if (forgotten.length) {
      html += '<div class="spell-school" style="opacity:0.4">📵 Forgotten</div>';
      forgotten.forEach(([name]) => {
        html += `<div class="spell-item" style="opacity:0.3"><s>${name}</s></div>`;
      });
    }

    el.innerHTML = html;
  }

  function save() { return { spells: JSON.parse(JSON.stringify(spells)), skills: {...skills} }; }
  function load(data) { if (data) { Object.assign(spells, data.spells || {}); Object.assign(skills, data.skills || {}); } }
  function reset() { for (const k in spells) delete spells[k]; for (const k in skills) delete skills[k]; }

  return { checkMessage, updateUI, save, load, reset };
})();

if (typeof module !== 'undefined') module.exports = SpellTracker;
