// session-stats.js — Track and display per-game-session statistics
const SessionStats = (() => {
  const stats = {
    startTurn: 0,
    startTime: Date.now(),
    peakHP: 0,
    peakXL: 0,
    deepestLevel: 0,
    monstersKilled: 0,
    deathCount: 0,
    wishCount: 0,
    genocideCount: 0,
    altarsFound: 0,
    shopsVisited: 0,
    prayed: 0,
    itemsIdentified: 0,
    goldCollected: 0,
    maxGold: 0,
    levelUps: [],        // [ { from, to, turn } ]
    lastXL: 0,
  };

  const KILL_RE = /you (?:kill|destroy|slay) |is (?:killed|destroyed|slain)|(?:kills|destroys|slays) (?:the|it|a |an )/i;
  const WISH_RE = /you may wish|for what do you wish/i;
  const GENOCIDE_RE = /wiped out/i;
  const SHOP_RE = /welcome.*(?:shop|store|emporium)/i;
  const PRAY_RE = /you begin praying/i;
  const ID_RE = /call (?:it|them)|that is a/i;

  function checkMessage(msg) {
    if (!msg) return;
    if (KILL_RE.test(msg)) stats.monstersKilled++;
    if (WISH_RE.test(msg)) stats.wishCount++;
    if (GENOCIDE_RE.test(msg)) stats.genocideCount++;
    if (SHOP_RE.test(msg)) stats.shopsVisited++;
    if (PRAY_RE.test(msg)) stats.prayed++;
    if (ID_RE.test(msg)) stats.itemsIdentified++;
    if (/you die|DYWYPI/i.test(msg)) stats.deathCount++;
  }

  function update(gameState) {
    if (gameState.hp > stats.peakHP) stats.peakHP = gameState.hp;
    // Detect level ups
    if (gameState.xl > 0 && stats.lastXL > 0 && gameState.xl > stats.lastXL) {
      stats.levelUps.push({ from: stats.lastXL, to: gameState.xl, turn: gameState.turns || 0 });
    }
    if (gameState.xl > 0) stats.lastXL = gameState.xl;
    if (gameState.xl > stats.peakXL) stats.peakXL = gameState.xl;
    const depth = parseInt(gameState.dlvl) || 0;
    if (depth > stats.deepestLevel) stats.deepestLevel = depth;
    if (gameState.gold > stats.maxGold) stats.maxGold = gameState.gold;
  }

  function updateUI(gameState) {
    const el = document.getElementById('session-stats');
    if (!el) return;

    const elapsed = Math.floor((Date.now() - stats.startTime) / 60000);
    const turns = gameState.turns || 0;

    el.innerHTML = `
      <div class="ss-row">⏱️ ${elapsed}m played · T${turns}</div>
      <div class="ss-row">💀 ${stats.monstersKilled} kills</div>
      <div class="ss-row">📊 Peak: XL${stats.peakXL} · HP${stats.peakHP} · Dlvl:${stats.deepestLevel}</div>
      ${stats.maxGold > 0 ? `<div class="ss-row">💰 Peak gold: ${stats.maxGold}zm</div>` : ''}
      ${stats.wishCount > 0 ? `<div class="ss-row">⭐ ${stats.wishCount} wish${stats.wishCount>1?'es':''}</div>` : ''}
      ${stats.genocideCount > 0 ? `<div class="ss-row">🕊️ ${stats.genocideCount} genocide${stats.genocideCount>1?'s':''}</div>` : ''}
      <div class="ss-row">🙏 ${stats.prayed} prayers · 🏪 ${stats.shopsVisited} shops</div>
      ${stats.levelUps.length > 0 ? `<div class="ss-row">⬆️ ${stats.levelUps.length} level-up${stats.levelUps.length>1?'s':''} (last: XL${stats.levelUps[stats.levelUps.length-1].to} at T${stats.levelUps[stats.levelUps.length-1].turn})</div>` : ''}
    `;
  }

  function reset() {
    Object.keys(stats).forEach(k => {
      if (typeof stats[k] === 'number') stats[k] = 0;
    });
    stats.startTime = Date.now();
  }

  function save() { return {...stats}; }
  function load(data) { if (data) Object.assign(stats, data); }

  return { checkMessage, update, updateUI, reset, save, load, getStats: () => stats };
})();

if (typeof module !== 'undefined') module.exports = SessionStats;
