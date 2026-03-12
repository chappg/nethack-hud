// god-tracker.js — Track relationship with player's god
const GodTracker = (() => {
  const state = {
    godName: '',           // detected god name
    alignment: '',         // Lawful/Neutral/Chaotic
    favor: 0,             // estimated favor: -3 to +5 scale
    favorLabel: 'Unknown',
    events: [],           // { text, turn, type:'good'|'bad'|'neutral' }
    titleRecord: '',      // alignment record from #enhance or status
    crowned: false,
    converted: false,
    piety: 0,            // sacrifice count affecting piety
  };

  // Favor levels
  const FAVOR_LEVELS = [
    { min: -3, label: 'Wrathful', icon: '💀', color: '#f55' },
    { min: -2, label: 'Angry', icon: '😡', color: '#f77' },
    { min: -1, label: 'Displeased', icon: '😠', color: '#fa5' },
    { min: 0,  label: 'Neutral', icon: '😐', color: '#aaa' },
    { min: 1,  label: 'Pleased', icon: '🙂', color: '#5b5' },
    { min: 2,  label: 'Well-Pleased', icon: '😊', color: '#5d5' },
    { min: 3,  label: 'Extremely Pleased', icon: '😇', color: '#5ff' },
    { min: 4,  label: 'Devout', icon: '🌟', color: '#ff5' },
    { min: 5,  label: 'Crowned', icon: '👑', color: '#f5f' },
  ];

  const MSG = {
    // Prayer outcomes
    prayGood:       /you feel that (.+?) is (pleased|well-pleased|extremely pleased)/i,
    prayBad:        /you feel that (.+?) is (angry|displeased)/i,
    prayNeglect:    /you have been (ignored|neglected)/i,
    // Direct anger
    angered:        /you sense (.+?)'s (anger|displeasure|wrath)/i,
    smite:          /(.+?) smites you/i,
    // Sacrifice outcomes
    sacGood:        /you sense a (.+?) aura|you glimpse a four-leaf clover/i,
    sacGreat:       /an? (.+?) (?:appears? before you|is laid at your feet)/i,
    // Alignment
    alignGood:      /you feel (?:more confident|worthy|piously aligned|devoutly aligned)/i,
    alignBad:       /you feel (?:guilty|sinful|you have strayed)/i,
    alignChange:    /you are (?:stridently |)(lawful|neutral|chaotic)/i,
    // Crowned
    crowned:        /you feel (?:more confident in your|worthy of) |a voice thunders/i,
    // God name from prayer
    godName:        /you feel that (.+?) is |you sense (.+?)'s/i,
    // Conversion
    convert:        /you feel (?:a |)new alignment|the altar converts|you have a new allegiance/i,
    // Misc divine
    gift:           /(?:use my gift wisely|may .+? be with you)/i,
    protectionBuy:  /you feel (?:more )?protected/i,
    // Anger from attacking priest/temple
    templeAnger:    /you desecrate|sacrilege|the temple priests? turns? on you/i,
    // Murder (killing peaceful)
    murder:         /you (?:murder|feel guilty)/i,
  };

  function addEvent(text, turn, type) {
    state.events.unshift({ text, turn, type });
    if (state.events.length > 15) state.events.pop();
  }

  function checkMessage(msg, turns) {
    if (!msg) return;

    // Extract god name
    const godMatch = msg.match(MSG.godName);
    if (godMatch) {
      state.godName = godMatch[1] || godMatch[2] || '';
    }

    // Prayer - good
    const goodPray = msg.match(MSG.prayGood);
    if (goodPray) {
      if (!state.godName && goodPray[1]) state.godName = goodPray[1];
      const level = goodPray[2].toLowerCase();
      if (level === 'extremely pleased') { state.favor = Math.max(state.favor, 3); }
      else if (level === 'well-pleased') { state.favor = Math.max(state.favor, 2); }
      else { state.favor = Math.max(state.favor, 1); }
      addEvent(`Prayer: ${state.godName} is ${level}`, turns, 'good');
    }

    // Prayer - bad
    const badPray = msg.match(MSG.prayBad);
    if (badPray) {
      if (!state.godName && badPray[1]) state.godName = badPray[1];
      const level = badPray[2].toLowerCase();
      if (level === 'angry') { state.favor = Math.min(state.favor, -2); state.favor--; }
      else { state.favor = Math.min(state.favor, -1); state.favor--; }
      state.favor = Math.max(state.favor, -3);
      addEvent(`Prayer: ${state.godName} is ${level}!`, turns, 'bad');
    }

    // Neglected
    if (MSG.prayNeglect.test(msg)) {
      addEvent('Prayer ignored', turns, 'bad');
      state.favor = Math.min(state.favor, 0);
    }

    // Direct divine anger
    if (MSG.angered.test(msg) || MSG.smite.test(msg)) {
      state.favor = Math.max(-3, state.favor - 1);
      addEvent('Divine anger!', turns, 'bad');
    }

    // Temple desecration
    if (MSG.templeAnger.test(msg)) {
      state.favor = Math.max(-3, state.favor - 2);
      addEvent('Temple desecrated!', turns, 'bad');
    }

    // Murder
    if (MSG.murder.test(msg)) {
      state.favor = Math.max(-3, state.favor - 1);
      addEvent('Murdered a peaceful', turns, 'bad');
    }

    // Good sacrifice
    if (MSG.sacGood.test(msg)) {
      state.favor = Math.min(5, state.favor + 1);
      state.piety++;
      addEvent('Sacrifice accepted favorably', turns, 'good');
    }

    // Artifact gift from sacrifice
    const giftMatch = msg.match(MSG.sacGreat);
    if (giftMatch) {
      state.favor = Math.min(5, state.favor + 2);
      state.piety += 2;
      addEvent(`Artifact gift: ${giftMatch[1]}`, turns, 'good');
    }

    // Alignment improvements
    if (MSG.alignGood.test(msg)) {
      state.favor = Math.min(5, state.favor + 1);
      addEvent('Alignment improved', turns, 'good');
    }

    // Alignment damage
    if (MSG.alignBad.test(msg)) {
      state.favor = Math.max(-3, state.favor - 1);
      addEvent('Alignment damaged', turns, 'bad');
    }

    // Crowned
    if (MSG.crowned.test(msg) && state.piety >= 3) {
      state.crowned = true;
      state.favor = 5;
      addEvent('Crowned by your god!', turns, 'good');
    }

    // Conversion
    if (MSG.convert.test(msg)) {
      state.converted = true;
      state.favor = 0;
      addEvent('Converted alignment!', turns, 'neutral');
    }

    // Alignment detection
    const alignMatch = msg.match(MSG.alignChange);
    if (alignMatch) state.alignment = alignMatch[1];

    // Protection purchase — minor favor indicator
    if (MSG.protectionBuy.test(msg)) {
      addEvent('Gained protection', turns, 'good');
    }
  }

  function getFavorLevel() {
    for (let i = FAVOR_LEVELS.length - 1; i >= 0; i--) {
      if (state.favor >= FAVOR_LEVELS[i].min) return FAVOR_LEVELS[i];
    }
    return FAVOR_LEVELS[0];
  }

  function renderUI() {
    const el = document.getElementById('god-content');
    if (!el) return;

    const fl = getFavorLevel();
    const godDisplay = state.godName || (state.alignment ? `your ${state.alignment} god` : 'Unknown');

    let html = `
      <div style="text-align:center;margin-bottom:6px;">
        <div style="font-size:11px;color:var(--text-dim);">Deity: <strong style="color:var(--accent);">${godDisplay}</strong></div>
        <div style="font-size:24px;">${fl.icon}</div>
        <div style="font-weight:bold;color:${fl.color};">${fl.label}</div>
      </div>
    `;

    // Favor bar
    const barPct = Math.round(((state.favor + 3) / 8) * 100);
    html += `<div style="background:#222;border-radius:4px;height:8px;margin:4px 0 8px;">
      <div style="background:${fl.color};height:100%;border-radius:4px;width:${barPct}%;transition:width 0.3s;"></div>
    </div>`;

    // Stats
    if (state.piety > 0) html += `<div style="font-size:11px;color:var(--text-dim);">🔥 Sacrifices: ${state.piety}</div>`;
    if (state.crowned) html += `<div style="font-size:11px;color:#f5f;">👑 Crowned</div>`;
    if (state.converted) html += `<div style="font-size:11px;color:#fa5;">⚡ Converted</div>`;

    // Recent events
    if (state.events.length > 0) {
      html += '<div style="margin-top:6px;border-top:1px solid #333;padding-top:4px;font-size:11px;">';
      html += '<div style="color:var(--text-dim);margin-bottom:2px;">Recent:</div>';
      state.events.slice(0, 5).forEach(e => {
        const color = e.type === 'good' ? '#5b5' : e.type === 'bad' ? '#f55' : '#aaa';
        html += `<div style="color:${color};">T${e.turn}: ${e.text}</div>`;
      });
      html += '</div>';
    }

    if (!state.godName && state.events.length === 0) {
      html = '<div class="info-box">No divine interactions yet. Pray or sacrifice to learn your god\'s disposition.</div>';
    }

    el.innerHTML = html;
  }

  function getState() { return state; }
  function reset() {
    state.godName = ''; state.alignment = ''; state.favor = 0;
    state.events = []; state.crowned = false; state.converted = false; state.piety = 0;
  }
  function save() { return JSON.parse(JSON.stringify(state)); }
  function load(data) { if (data) Object.assign(state, data); }

  return { checkMessage, renderUI, getState, reset, save, load };
})();
