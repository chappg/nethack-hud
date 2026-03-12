// game-session.js — Game session lifecycle management
// Handles: detection of active game, state reset, localStorage persistence
const GameSession = (() => {
  let active = false;       // Is a game currently in progress?
  let sessionId = null;     // Unique key for this game session (playerName-role-startTurn)
  let lastPlayerName = '';
  let lastRole = '';
  let connected = false;

  // Modules that need reset/save/load
  const PERSISTENT_MODULES = {
    // key → { save(), load(data), reset() }
  };

  function registerModule(key, mod) {
    PERSISTENT_MODULES[key] = mod;
  }

  function isActive() { return active; }
  function isConnected() { return connected; }

  function setConnected(val) {
    connected = val;
    if (!val) {
      // Disconnected — save current session and deactivate
      if (active) saveSession();
      active = false;
      updatePanelVisibility();
    }
  }

  // Called every parser update
  function update(state) {
    // Detect game start: player name + HP, OR dlvl detected, OR turns > 0
    if (!active && (
      (state.playerName && state.hpmax > 0) ||
      (state.dlvl && state.turns > 0) ||
      (state.playerName && state.dlvl)
    )) {
      startGame(state);
    }

    // Detect game end: death or disconnect
    if (active && state.dead) {
      saveSession();
      // Don't deactivate yet — death analysis needs to show
    }

    // Detect new game: player name or role changed
    if (active && state.playerName && state.playerName !== lastPlayerName && lastPlayerName) {
      // Different character — new game
      saveSession();
      resetAll();
      startGame(state);
    }
  }

  function startGame(state) {
    lastPlayerName = state.playerName;
    lastRole = state.role || '';
    sessionId = `${state.playerName}-${state.role || 'unknown'}-${Date.now()}`;
    active = true;

    // Try to restore previous session for this character
    const restored = tryRestore(state.playerName, state.role);
    if (!restored) {
      resetAll();
    }

    updatePanelVisibility();
    console.log(`[GameSession] Started: ${sessionId}`);
  }

  function resetAll() {
    // Reset all registered modules
    for (const [key, mod] of Object.entries(PERSISTENT_MODULES)) {
      if (typeof mod.reset === 'function') {
        try { mod.reset(); } catch(e) { console.error(`[GameSession] Reset error in ${key}:`, e); }
      }
    }
  }

  function saveSession() {
    if (!sessionId) return;
    const data = {};
    for (const [key, mod] of Object.entries(PERSISTENT_MODULES)) {
      if (typeof mod.save === 'function') {
        try { data[key] = mod.save(); } catch(e) { console.error(`[GameSession] Save error in ${key}:`, e); }
      }
    }
    try {
      // Save under character key (latest session per character+role)
      const charKey = `nh-session-${lastPlayerName}-${lastRole}`;
      localStorage.setItem(charKey, JSON.stringify({ sessionId, savedAt: Date.now(), data }));
      // Also maintain a session list
      const sessions = JSON.parse(localStorage.getItem('nh-sessions') || '[]');
      const existing = sessions.findIndex(s => s.charKey === charKey);
      const entry = { charKey, playerName: lastPlayerName, role: lastRole, savedAt: Date.now() };
      if (existing >= 0) sessions[existing] = entry;
      else sessions.push(entry);
      // Keep last 20 sessions
      while (sessions.length > 20) sessions.shift();
      localStorage.setItem('nh-sessions', JSON.stringify(sessions));
      console.log(`[GameSession] Saved: ${charKey}`);
    } catch (e) { console.error('[GameSession] Save failed:', e); }
  }

  function tryRestore(playerName, role) {
    try {
      const charKey = `nh-session-${playerName}-${role || ''}`;
      const raw = localStorage.getItem(charKey);
      if (!raw) return false;
      const saved = JSON.parse(raw);
      if (!saved.data) return false;
      // Only restore if saved recently (within 24 hours)
      if (Date.now() - saved.savedAt > 24 * 60 * 60 * 1000) return false;
      for (const [key, mod] of Object.entries(PERSISTENT_MODULES)) {
        if (typeof mod.load === 'function' && saved.data[key]) {
          try { mod.load(saved.data[key]); } catch(e) { console.error(`[GameSession] Load error in ${key}:`, e); }
        }
      }
      console.log(`[GameSession] Restored: ${charKey} (saved ${Math.round((Date.now() - saved.savedAt) / 60000)}m ago)`);
      return true;
    } catch(e) { return false; }
  }

  function updatePanelVisibility() {
    // Show/hide game-state panels based on whether a game is active
    const panels = document.querySelectorAll('[data-requires-game]');
    panels.forEach(el => {
      el.style.display = active ? '' : 'none';
    });

    // Show "waiting for game" messages when not active
    const waiting = document.getElementById('waiting-for-game');
    if (waiting) waiting.style.display = active ? 'none' : '';
    const waitingR = document.getElementById('waiting-for-game-right');
    if (waitingR) waitingR.style.display = active ? 'none' : '';
  }

  // Save periodically while game is active
  setInterval(() => {
    if (active) saveSession();
  }, 30000); // every 30 seconds

  // Save on page unload
  window.addEventListener('beforeunload', () => {
    if (active) saveSession();
  });

  return {
    registerModule,
    update,
    isActive,
    isConnected,
    setConnected,
    saveSession,
    resetAll,
    updatePanelVisibility,
  };
})();

if (typeof module !== 'undefined') module.exports = GameSession;
