// timeline.js — Key event timeline for the game session
const Timeline = (() => {
  const events = [];
  const MAX_EVENTS = 100;
  let lastEventText = '';

  const EVENT_PATTERNS = [
    // Level changes
    { re: /welcome to experience level (\d+)/i, type: 'levelup', icon: '⬆️', fmt: m => `Level ${m[1]}` },
    // Deaths (monsters killed)
    { re: /you (?:kill|destroy) (?:the |a |an )?(.+?)!/i, type: 'kill', icon: '💀', fmt: m => `Killed ${m[1]}` },
    // Equipment
    { re: /you (?:are now wearing|put on) (?:a |an |the )?(.+?)\./i, type: 'equip', icon: '🛡️', fmt: m => `Equipped ${m[1]}` },
    // Wishes
    { re: /you may wish|for what do you wish/i, type: 'wish', icon: '⭐', fmt: () => 'WISH granted!' },
    // Prayer
    { re: /you begin praying/i, type: 'prayer', icon: '🙏', fmt: () => 'Prayed' },
    { re: /you feel that .+ is pleased/i, type: 'prayer_good', icon: '✨', fmt: () => 'Prayer answered!' },
    // Altar
    { re: /there is an? (.+?) altar here/i, type: 'altar', icon: '⛩️', fmt: m => `${m[1]} altar` },
    { re: /you offer the (.+?) to/i, type: 'sacrifice', icon: '🔥', fmt: m => `Sacrificed ${m[1]}` },
    // Artifacts
    { re: /an? (.+?) appears before you/i, type: 'artifact', icon: '🗡️', fmt: m => `Gift: ${m[1]}` },
    { re: /you feel worthy/i, type: 'artifact_worthy', icon: '🏆', fmt: () => 'Crowned!' },
    // Shops
    { re: /welcome (?:to|back).+?(?:shop|store|emporium)/i, type: 'shop', icon: '🏪', fmt: () => 'Entered shop' },
    // Dungeon features
    { re: /you find a trap/i, type: 'trap', icon: '⚠️', fmt: () => 'Trap found' },
    { re: /the fountain dries up/i, type: 'fountain', icon: '💧', fmt: () => 'Fountain dried' },
    // Genocide
    { re: /wiped out all (.+)/i, type: 'genocide', icon: '🕊️', fmt: m => `Genocided ${m[1]}` },
    // Polymorph
    { re: /you (?:turn into|feel like a new) (.+)/i, type: 'polymorph', icon: '🧬', fmt: m => `Polymorphed: ${m[1]}` },
    // Intrinsics
    { re: /you feel (?:especially )?(?:fast|very fast)/i, type: 'intrinsic', icon: '💨', fmt: () => 'Gained Speed' },
    { re: /you feel (?:very )?firm/i, type: 'intrinsic', icon: '🛡️', fmt: () => 'Gained Disintegration Res' },
    { re: /you feel healthy/i, type: 'intrinsic', icon: '💚', fmt: () => 'Gained Poison Res' },
    { re: /you feel full of hot air/i, type: 'intrinsic', icon: '🔥', fmt: () => 'Gained Fire Res' },
    { re: /you feel a momentary chill/i, type: 'intrinsic', icon: '❄️', fmt: () => 'Gained Cold Res' },
    { re: /you feel a mild tingle/i, type: 'intrinsic', icon: '⚡', fmt: () => 'Gained Shock Res' },
    { re: /you feel wide awake/i, type: 'intrinsic', icon: '👁️', fmt: () => 'Gained Sleep Res' },
    { re: /your (?:vision|sight) .+sharpen/i, type: 'intrinsic', icon: '👀', fmt: () => 'Gained See Invisible' },
    { re: /you feel a strange mental acuity/i, type: 'intrinsic', icon: '🧠', fmt: () => 'Gained Telepathy' },
    { re: /you feel (?:very )?jumpy/i, type: 'intrinsic', icon: '🌀', fmt: () => 'Gained Teleportitis' },
    { re: /you feel in control of yourself/i, type: 'intrinsic', icon: '🎯', fmt: () => 'Gained Teleport Control' },
    // Luck
    { re: /you feel lucky/i, type: 'luck', icon: '🍀', fmt: () => 'Luck increased' },
    { re: /you feel (?:unlucky|a strange sense of loss)/i, type: 'luck', icon: '🍀', fmt: () => 'Luck decreased!' },
    // Excalibur
    { re: /your .+ begins to glow/i, type: 'excalibur', icon: '⚔️', fmt: () => 'Excalibur created!' },
    // Magic lamp
    { re: /you released a djinni/i, type: 'djinni', icon: '🧞', fmt: () => 'Djinni released!' },
    // Ascension run
    { re: /the high priest/i, type: 'endgame', icon: '⚡', fmt: () => 'High Priest encountered' },
    { re: /you offer the Amulet of Yendor/i, type: 'ascend', icon: '🌟', fmt: () => 'Offered the Amulet!' },
    // Pets
    { re: /(?:your|the) (.+?) grows up/i, type: 'pet', icon: '🐾', fmt: m => `Pet grew: ${m[1]}` },
    // Death
    { re: /you die|DYWYPI/i, type: 'death', icon: '☠️', fmt: () => 'YOU DIED' },
    // Engulf
    { re: /swallows you|you are engulfed/i, type: 'engulf', icon: '🫠', fmt: () => 'Engulfed!' },
    // Quest
    { re: /you feel more confident/i, type: 'quest', icon: '🏰', fmt: () => 'Quest progress' },
    // Amulet
    { re: /you feel the Amulet of Yendor/i, type: 'amulet', icon: '🔮', fmt: () => 'Amulet of Yendor!' },
  ];

  const IMPORTANT_TYPES = new Set(['levelup', 'wish', 'artifact', 'artifact_worthy', 'genocide', 'intrinsic', 'death', 'amulet', 'polymorph', 'excalibur', 'djinni', 'ascend']);

  function checkMessage(msg, turns) {
    if (!msg || msg === lastEventText) return;
    lastEventText = msg;

    for (const p of EVENT_PATTERNS) {
      const m = msg.match(p.re);
      if (m) {
        // Dedupe: skip if same type+text within 2 turns
        const last = events[events.length - 1];
        if (last && last.type === p.type && last.text === p.fmt(m) && Math.abs((last.turn || 0) - (turns || 0)) < 3) continue;

        events.push({
          type: p.type,
          icon: p.icon,
          text: p.fmt(m),
          turn: turns || 0,
          time: Date.now(),
          important: IMPORTANT_TYPES.has(p.type),
        });
        if (events.length > MAX_EVENTS) events.shift();
        break; // first match wins
      }
    }
  }

  function getEvents(limit = 20) {
    return events.slice(-limit).reverse();
  }

  function getImportant() {
    return events.filter(e => e.important).reverse();
  }

  function updateUI() {
    const el = document.getElementById('timeline-list');
    if (!el) return;
    const recent = getEvents(15);
    if (!recent.length) {
      el.innerHTML = '<div class="info-box">No key events yet</div>';
      return;
    }
    el.innerHTML = recent.map(e => {
      const cls = e.important ? 'timeline-important' : '';
      const turn = e.turn ? `<span class="timeline-turn">T${e.turn}</span>` : '';
      return `<div class="timeline-event ${cls}">${e.icon} ${e.text} ${turn}</div>`;
    }).join('');
  }

  function reset() { events.length = 0; }

  function save() { return [...events]; }
  function load(data) { if (Array.isArray(data)) { events.length = 0; events.push(...data); } }

  return { checkMessage, getEvents, getImportant, updateUI, reset, save, load };
})();

if (typeof module !== 'undefined') module.exports = Timeline;
