// buc-tracker.js — Track Blessed/Uncursed/Cursed status of items
const BUCTracker = (() => {
  const items = {}; // itemDesc → {status: 'blessed'|'uncursed'|'cursed'|'unknown', source, turn}

  const MSG_PATTERNS = [
    // Altar testing
    { re: /(.+?) (?:glow|glows) amber/i, status: 'blessed', source: 'altar' },
    { re: /(.+?) (?:glow|glows) light blue/i, status: 'blessed', source: 'altar' },
    { re: /(.+?) (?:glow|glows) black/i, status: 'cursed', source: 'altar' },
    { re: /(.+?) (?:does not|doesn't) glow/i, status: 'uncursed', source: 'altar' },
    // Pickup messages
    { re: /you feel a (?:malignant|evil) aura .+ (.+)/i, status: 'cursed', source: 'pickup' },
    // Wielding cursed
    { re: /(.+?) welds? itself to your/i, status: 'cursed', source: 'weld' },
    { re: /you can't remove (.+)/i, status: 'cursed', source: 'stuck' },
    // Holy water
    { re: /you feel (?:full of|a warm glow)/i, status: 'blessed', source: 'use' },
    // Pet behavior — pets won't step on cursed
  ];

  // Also detect from inventory text: "a blessed +1 long sword"
  const BUC_PREFIX_RE = /\b(blessed|uncursed|cursed|holy|unholy)\b/i;

  function checkMessage(msg, turns) {
    if (!msg) return;

    for (const p of MSG_PATTERNS) {
      const m = msg.match(p.re);
      if (m) {
        const itemName = cleanItemName(m[1] || msg);
        if (itemName) {
          items[itemName] = { status: p.status, source: p.source, turn: turns };
        }
      }
    }

    // Check for BUC prefix in any message
    const bucMatch = msg.match(/(?:a |an |the )?(blessed|uncursed|cursed) (.+?)(?:\.|!|,)/i);
    if (bucMatch) {
      const itemName = cleanItemName(bucMatch[2]);
      if (itemName) {
        items[itemName] = { status: bucMatch[1].toLowerCase(), source: 'id', turn: turns };
      }
    }
  }

  function cleanItemName(name) {
    if (!name) return '';
    return name.replace(/^(?:a |an |the |your )/i, '').replace(/\s+/g, ' ').trim().substring(0, 60);
  }

  function getAll() {
    return Object.entries(items).map(([name, info]) => ({ name, ...info }));
  }

  function updateUI() {
    const el = document.getElementById('buc-list');
    if (!el) return;

    const all = getAll();
    if (!all.length) {
      el.innerHTML = '<div class="info-box">No BUC info yet. Drop items on an altar to test.</div>';
      return;
    }

    const blessed = all.filter(i => i.status === 'blessed');
    const cursed = all.filter(i => i.status === 'cursed');
    const uncursed = all.filter(i => i.status === 'uncursed');

    let html = '';
    if (cursed.length) {
      html += '<div class="buc-header cursed">⚫ Cursed</div>';
      html += cursed.map(i => `<div class="buc-item cursed">${esc(i.name)}</div>`).join('');
    }
    if (blessed.length) {
      html += '<div class="buc-header blessed">🟡 Blessed</div>';
      html += blessed.map(i => `<div class="buc-item blessed">${esc(i.name)}</div>`).join('');
    }
    if (uncursed.length) {
      html += '<div class="buc-header uncursed">⚪ Uncursed</div>';
      html += uncursed.map(i => `<div class="buc-item uncursed">${esc(i.name)}</div>`).join('');
    }

    el.innerHTML = html;
  }

  function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

  function save() { return JSON.parse(JSON.stringify(items)); }
  function load(data) { if (data) { for (const k in items) delete items[k]; Object.assign(items, data); } }
  function reset() { for (const k in items) delete items[k]; }

  return { checkMessage, getAll, updateUI, save, load, reset };
})();

if (typeof module !== 'undefined') module.exports = BUCTracker;
