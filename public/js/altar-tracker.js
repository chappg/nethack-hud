// altar-tracker.js — Track altars, sacrificing, and prayer state
const AltarTracker = (() => {
  const state = {
    altars: [],            // {dlvl, alignment, x, y}
    lastPrayerTurn: 0,
    prayerSafe: false,     // estimated safe to pray (not safe until ~300 turns)
    sacrificeCount: 0,
    crowned: false,
    gifts: [],             // artifact gifts received
    alignment: '',         // player's alignment
    luck: 0,               // estimated luck (-13 to 13)
    luckItems: [],         // things affecting luck
  };

  // Prayer timeout: ~300-600 turns for safe prayer (simplified)
  const PRAYER_TIMEOUT = 500;

  const MSG_PATTERNS = {
    altar: /there is an? (lawful|neutral|chaotic|unaligned) altar here/i,
    pray: /you begin praying/i,
    prayGood: /you feel that .+? is (?:pleased|well-pleased|extremely pleased)/i,
    prayBad: /you feel that .+? is (?:angry|displeased)/i,
    sacrifice: /you offer the (.+?) (?:to|on)/i,
    gift: /an? (.+?) (?:appears? before you|is laid at your feet)/i,
    crowned: /you feel (?:worthy|more confident|holy|unholy)/i,
    convert: /the altar converts/i,
    luck_good: /you feel (?:lucky|fortunate|in luck)/i,
    luck_bad: /you feel (?:unlucky|out of luck)/i,
    luckstone: /you feel (?:a warm|a strange) sensation/i,
    alignment_lawful: /you are (?:stridently |)lawful/i,
    alignment_neutral: /you are (?:stridently |)neutral/i,
    alignment_chaotic: /you are (?:stridently |)chaotic/i,
    buc_blessed: /amber glow|light blue glow/i,
    buc_cursed: /black glow/i,
  };

  function checkMessage(msg, turns, dlvl) {
    if (!msg) return;

    // Altar detection
    const altarMatch = msg.match(MSG_PATTERNS.altar);
    if (altarMatch) {
      const alignment = altarMatch[1];
      if (!state.altars.find(a => a.dlvl === dlvl && a.alignment === alignment)) {
        state.altars.push({ dlvl, alignment, turn: turns });
      }
    }

    // Prayer tracking
    if (MSG_PATTERNS.pray.test(msg)) {
      state.lastPrayerTurn = turns;
      state.prayerSafe = false;
    }
    if (MSG_PATTERNS.prayGood.test(msg)) {
      state.prayerSafe = false; // just prayed, timeout starts
    }

    // Sacrifice tracking
    const sacMatch = msg.match(MSG_PATTERNS.sacrifice);
    if (sacMatch) {
      state.sacrificeCount++;
    }

    // Artifact gifts
    const giftMatch = msg.match(MSG_PATTERNS.gift);
    if (giftMatch) {
      state.gifts.push({ name: giftMatch[1], turn: turns });
    }

    // Crowning
    if (MSG_PATTERNS.crowned.test(msg) && state.sacrificeCount > 5) {
      state.crowned = true;
    }

    // Alignment detection
    if (MSG_PATTERNS.alignment_lawful.test(msg)) state.alignment = 'Lawful';
    else if (MSG_PATTERNS.alignment_neutral.test(msg)) state.alignment = 'Neutral';
    else if (MSG_PATTERNS.alignment_chaotic.test(msg)) state.alignment = 'Chaotic';

    // Luck estimation
    if (MSG_PATTERNS.luck_good.test(msg)) state.luck = Math.min(13, state.luck + 1);
    if (MSG_PATTERNS.luck_bad.test(msg)) state.luck = Math.max(-13, state.luck - 1);
  }

  function update(turns) {
    // Update prayer safety estimate
    // Safe if: never prayed and 300+ turns in, OR prayed and timeout elapsed
    if (state.lastPrayerTurn === 0 && turns >= 300) {
      state.prayerSafe = true;
    } else if (state.lastPrayerTurn > 0 && (turns - state.lastPrayerTurn) >= PRAYER_TIMEOUT) {
      state.prayerSafe = true;
    }
  }

  function updateUI() {
    const el = document.getElementById('altar-content');
    if (!el) return;

    let html = '';

    // Divine Favor (from GodTracker)
    if (typeof GodTracker !== 'undefined') {
      const gs = GodTracker.getState();
      const FAVOR_LEVELS = [
        { min: -3, label: 'Wrathful', icon: '💀', color: '#f55' },
        { min: -2, label: 'Angry', icon: '😡', color: '#f77' },
        { min: -1, label: 'Displeased', icon: '😠', color: '#fa5' },
        { min: 0,  label: 'Unknown', icon: '😐', color: '#aaa' },
        { min: 1,  label: 'Pleased', icon: '🙂', color: '#5b5' },
        { min: 2,  label: 'Well-Pleased', icon: '😊', color: '#5d5' },
        { min: 3,  label: 'Extremely Pleased', icon: '😇', color: '#5ff' },
        { min: 4,  label: 'Devout', icon: '🌟', color: '#ff5' },
        { min: 5,  label: 'Crowned', icon: '👑', color: '#f5f' },
      ];
      let fl = FAVOR_LEVELS[3]; // default Unknown
      for (let i = FAVOR_LEVELS.length - 1; i >= 0; i--) {
        if (gs.favor >= FAVOR_LEVELS[i].min) { fl = FAVOR_LEVELS[i]; break; }
      }
      const godDisplay = gs.godName || (state.alignment ? `your ${state.alignment} god` : '?');
      html += `<div style="text-align:center;margin-bottom:4px;">
        <span style="font-size:11px;color:var(--text-dim);">⛩️ ${godDisplay}</span>
        <span style="font-size:18px;margin-left:4px;">${fl.icon}</span>
        <strong style="color:${fl.color};margin-left:4px;">${fl.label}</strong>
      </div>`;
      const barPct = Math.round(((gs.favor + 3) / 8) * 100);
      html += `<div style="background:#222;border-radius:4px;height:6px;margin:2px 0 6px;">
        <div style="background:${fl.color};height:100%;border-radius:4px;width:${barPct}%;transition:width 0.3s;"></div>
      </div>`;
    }

    // Prayer status
    const prayClass = state.prayerSafe ? 'safe' : 'danger';
    const prayIcon = state.prayerSafe ? '✅' : '⏳';
    html += `<div class="altar-row ${prayClass}">${prayIcon} Prayer: ${state.prayerSafe ? 'Safe' : 'On timeout'}</div>`;

    // Sacrifices & gifts
    if (state.sacrificeCount > 0 || state.gifts.length > 0) {
      html += `<div class="altar-row">🔥 Sacrifices: ${state.sacrificeCount}</div>`;
      state.gifts.forEach(g => {
        html += `<div class="altar-row gift">🗡️ ${g.name} (T${g.turn})</div>`;
      });
    }

    if (state.crowned) html += '<div class="altar-row crowned">👑 Crowned!</div>';

    // Known altars
    if (state.altars.length > 0) {
      html += '<div class="altar-divider">Known Altars</div>';
      state.altars.forEach(a => {
        const coaligned = a.alignment.toLowerCase() === state.alignment.toLowerCase();
        html += `<div class="altar-row">${coaligned ? '⭐' : '⛩️'} Dlvl:${a.dlvl} — ${a.alignment}${coaligned ? ' (coaligned)' : ''}</div>`;
      });
    }

    // Luck estimate
    if (state.luck !== 0) {
      const luckColor = state.luck > 0 ? 'safe' : 'danger';
      html += `<div class="altar-row ${luckColor}">🍀 Luck: ~${state.luck > 0 ? '+' : ''}${state.luck}</div>`;
    }

    // Divine event log (from GodTracker)
    if (typeof GodTracker !== 'undefined') {
      const gs = GodTracker.getState();
      if (gs.events.length > 0) {
        html += '<div class="altar-divider">Divine Events</div>';
        gs.events.slice(0, 5).forEach(e => {
          const color = e.type === 'good' ? '#5b5' : e.type === 'bad' ? '#f55' : '#aaa';
          html += `<div class="altar-row" style="color:${color};font-size:11px;">T${e.turn}: ${e.text}</div>`;
        });
      }
    }

    if (!html) html = '<div class="info-box">No divine activity yet</div>';
    el.innerHTML = html;
  }

  function getState() { return state; }

  function save() { return JSON.parse(JSON.stringify(state)); }
  function load(data) { if (data) Object.assign(state, data); }
  function reset() { state.altars = []; state.lastPrayerTurn = 0; state.sacrificeCount = 0; state.artifactGifts = []; state.luck = 0; }

  return { checkMessage, update, updateUI, getState, save, load, reset };
})();

if (typeof module !== 'undefined') module.exports = AltarTracker;
