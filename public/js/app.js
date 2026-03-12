// app.js — Main application controller
(function () {
  'use strict';

  // Initialize terminal
  const container = document.getElementById('terminal');
  const term = TerminalManager.init(container);

  // Connection status
  TerminalManager.onStatus((status, serverId) => {
    const el = document.getElementById('connection-status');
    el.className = 'status-indicator ' + status;
    const serverName = serverId ? document.querySelector(`#server-select option[value="${serverId}"]`)?.textContent || serverId : '';
    const labels = {
      connected: `⚡ ${serverName || 'Connected'}`,
      disconnected: '⚡ Disconnected',
      connecting: '⚡ Connecting...',
      error: '⚡ Error',
    };
    el.textContent = labels[status] || `⚡ ${status}`;
    if (serverId && status === 'connected') {
      document.getElementById('server-select').value = serverId;
    }
    GameSession.setConnected(status === 'connected');
  });

  // Initialize parser
  GameParser.init(term);

  // Initialize UI modules
  PriceID.initUI();

  // Register modules with GameSession for save/load/reset
  GameSession.registerModule('conducts', ConductTracker);
  GameSession.registerModule('timeline', Timeline);
  GameSession.registerModule('altar', AltarTracker);
  GameSession.registerModule('spells', SpellTracker);
  GameSession.registerModule('stats', SessionStats);
  GameSession.registerModule('dungeon', DungeonTracker);
  GameSession.registerModule('kit', KitTracker);
  GameSession.registerModule('buc', BUCTracker);
  GameSession.registerModule('sokoban', Sokoban);
  GameSession.registerModule('priceid', PriceID);
  GameSession.registerModule('weapon', WeaponLookup);
  GameSession.registerModule('god', GodTracker);

  // Hide game panels initially — show "waiting" message
  GameSession.updatePanelVisibility();

  // Track which messages we've already processed (by index)
  let lastProcessedMsgCount = 0;
  let wasActive = false;

  // Wire parser to all panels
  GameParser.onUpdate((state) => {
    // Let GameSession detect game start/end
    GameSession.update(state);

    // If on login/menu screen, clear the top bar and hide game panels
    if (state.onLoginScreen) {
      document.getElementById('dungeon-level').textContent = 'Dlvl: —';
      document.getElementById('turn-count').textContent = 'T: —';
      document.getElementById('player-info').textContent = '—';
      const variantEl = document.getElementById('game-variant');
      if (variantEl) { variantEl.textContent = ''; variantEl.style.display = 'none'; }
      return; // Don't update any game panels
    }

    // Top bar — always update
    document.getElementById('dungeon-level').textContent =
      state.dlvl ? `Dlvl:${state.dlvl}` + (state.branch !== 'Dungeons of Doom' ? ` (${state.branch})` : '') : 'Dlvl: —';
    document.getElementById('turn-count').textContent = state.turns ? `T:${state.turns}` : 'T: —';
    // Update variant badge — only show when detected
    const variantEl = document.getElementById('game-variant');
    if (variantEl) {
      if (state._variantDetected && state.variant) {
        variantEl.textContent = `NH ${state.variant}`;
        variantEl.style.display = '';
      } else {
        variantEl.textContent = '';
        variantEl.style.display = 'none';
      }
    }
    const variantTag = state.variant && state.variant !== '3.7' ? ` [${state.variant}]` : '';
    document.getElementById('player-info').textContent = state.playerName
      ? `${state.playerName}${state.roleTitle ? ' the ' + state.roleTitle : ''} | HP:${state.hp}/${state.hpmax} | AC:${state.ac} | XL:${state.xl} | 👹${(state.monsters||[]).length}${variantTag}`
      : '—';

    // Debug bar
    if (GameParser.debug) {
      const db = document.getElementById('debug-bar');
      const ml = (state.monsters||[]).slice(0, 20).map(m => `${m.glyph}(fg${m.fg}${m.pet?',pet':''},${m.x},${m.y})`).join(' ');
      if (db) db.textContent = `🐛 name=${state.playerName||'?'} role=${state.role||'?'} hp=${state.hp}/${state.hpmax} dlvl=${state.dlvl||'?'} T=${state.turns||0} 👹${(state.monsters||[]).length} [${ml}] rows=${term.rows} cols=${term.cols}`;
    }

    // Only update game panels when a game is active
    const nowActive = GameSession.isActive();
    if (!wasActive && nowActive) lastProcessedMsgCount = 0; // Reset on new game
    wasActive = nowActive;
    if (!nowActive) return;

    // Update panels
    RiskEngine.updateUI(state);
    PriceID.update(state);
    KitTracker.update(state);
    StrategyTips.updateUI(state);
    DungeonTracker.update(state);

    // Process only NEW messages (avoid re-processing on every parse)
    const msgs = state.messageHistory || [];
    const newMsgCount = msgs.length;
    if (newMsgCount > lastProcessedMsgCount) {
      const newMsgs = msgs.slice(0, newMsgCount - lastProcessedMsgCount);
      for (const m of newMsgs) {
        ConductTracker.checkMessage(m.text);
        Timeline.checkMessage(m.text, state.turns);
        AltarTracker.checkMessage(m.text, state.turns, state.dlvl);
        SpellTracker.checkMessage(m.text, state.turns);
        SessionStats.checkMessage(m.text);
        BUCTracker.checkMessage(m.text, state.turns);
        WeaponLookup.checkMessage(m.text, state.role);
        StrategyTips.checkMessage(m.text, state.turns);
        GodTracker.checkMessage(m.text, state.turns);
      }
      lastProcessedMsgCount = newMsgCount;
    }

    AltarTracker.update(state.turns);
    ConductTracker.updateUI();
    Timeline.updateUI();
    AltarTracker.updateUI();
    SpellTracker.updateUI(state.turns);
    SessionStats.update(state);
    SessionStats.updateUI(state);
    Sokoban.checkState(state);
    Sokoban.updateUI();
    BUCTracker.updateUI();
    DeathAnalysis.checkDeath(state);

    // Message log
    updateMessageLog(state);
  });

  // Message log
  const messageSearch = document.getElementById('message-search');
  function updateMessageLog(state) {
    const log = document.getElementById('message-log');
    const filter = messageSearch.value.toLowerCase();
    const messages = state.messageHistory || [];

    log.innerHTML = messages
      .filter(m => !filter || m.text.toLowerCase().includes(filter))
      .slice(0, 30)
      .map(m => {
        let cls = '';
        const t = m.text.toLowerCase();
        if (/die|kill|destroy|fatal|dead|poison/i.test(t)) cls = 'msg-danger';
        else if (/warning|careful|danger|cursed/i.test(t)) cls = 'msg-important';
        return `<li class="${cls}">${escapeHtml(m.text)}</li>`;
      }).join('');
  }

  messageSearch.addEventListener('input', () => {
    updateMessageLog(GameParser.getState());
  });

  // Panel toggles
  document.getElementById('btn-toggle-left').addEventListener('click', () => {
    document.getElementById('left-sidebar').classList.toggle('hidden');
  });
  document.getElementById('btn-toggle-right').addEventListener('click', () => {
    document.getElementById('right-sidebar').classList.toggle('hidden');
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.altKey && e.key === '1') {
      e.preventDefault();
      document.getElementById('left-sidebar').classList.toggle('hidden');
    }
    if (e.altKey && e.key === '2') {
      e.preventDefault();
      document.getElementById('right-sidebar').classList.toggle('hidden');
    }
    if (e.altKey && (e.key === '?' || e.key === '/')) {
      e.preventDefault();
      document.getElementById('shortcuts-overlay').classList.toggle('hidden');
    }
  });

  function escapeHtml(text) {
    const d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
  }

  // Monster wiki search
  const wikiInput = document.getElementById('monster-search-input');
  const wikiResults = document.getElementById('wiki-results');
  wikiInput.addEventListener('input', () => {
    const q = wikiInput.value.trim();
    const results = RiskEngine.searchMonsters(q);
    if (results.length === 0 && q.length >= 2) {
      wikiResults.innerHTML = '<div class="info-box">No matches.</div>';
    } else if (results.length === 0) {
      wikiResults.innerHTML = '';
    } else {
      wikiResults.innerHTML = results.slice(0, 15).map(m => {
        const dClass = m.danger >= 7 ? 'danger-high' : m.danger >= 4 ? 'danger-medium' : 'danger-low';
        return `<div style="padding:3px 0;border-bottom:1px dotted var(--border);font-size:11px;">
          <span class="monster-glyph ${dClass}" style="display:inline-block;width:16px;text-align:center;">${m.glyph}</span>
          <strong>${m.name}</strong> <span class="${dClass}">[${m.danger}/10]</span>
          ${m.notes ? `<div style="color:var(--text-dim);margin-left:20px;font-size:10px;">⚠ ${m.notes}</div>` : ''}
          ${m.counter ? `<div style="color:var(--safe);margin-left:20px;font-size:10px;">💡 ${m.counter}</div>` : ''}
        </div>`;
      }).join('');
    }
  });
  wikiInput.addEventListener('keydown', (e) => e.stopPropagation());

  // Shortcuts overlay
  document.getElementById('close-shortcuts').addEventListener('click', () => {
    document.getElementById('shortcuts-overlay').classList.add('hidden');
  });
  document.getElementById('shortcuts-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'shortcuts-overlay') e.target.classList.add('hidden');
  });

  // Server selector
  const serverSelect = document.getElementById('server-select');
  const btnReconnect = document.getElementById('btn-reconnect');

  serverSelect.addEventListener('change', () => {
    GameParser.resetVariant();
    TerminalManager.switchServer(serverSelect.value);
  });

  btnReconnect.addEventListener('click', () => {
    GameParser.resetVariant();
    TerminalManager.switchServer(serverSelect.value);
  });

  // Connect!
  TerminalManager.connect();
  term.focus();
})();
