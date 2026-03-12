// sokoban.js — Sokoban puzzle solutions and detection
// NetHack 3.7 has 4 Sokoban levels, each with 2 possible layouts
const Sokoban = (() => {
  // Solving strategy by level (3.7 randomizes layouts + flips them)
  const LEVEL_STRATEGIES = {
    1: {
      name: 'Sokoban Level 1 (entry)',
      tips: [
        'Count boulders and pits — they match exactly',
        'Start with boulders furthest from pits',
        'Clear the path to stairs before finishing',
        'Scrolls of earth are always at the bottom',
      ],
    },
    2: {
      name: 'Sokoban Level 2',
      tips: [
        'More complex layout — plan 2-3 moves ahead',
        'Identify which boulders can only reach specific pits',
        'Push boulders along walls to control their path',
        'Don\'t block narrow corridors with boulders',
      ],
    },
    3: {
      name: 'Sokoban Level 3',
      tips: [
        'Tight layout — one wrong push can strand a boulder',
        'Work from the edges inward',
        'Some boulders must travel L-shaped paths (push right then down)',
        'If stuck, some boulders are decoys — not every one needs to fill a pit',
      ],
    },
    4: {
      name: 'Sokoban Level 4 (prize)',
      tips: [
        'This level has the prize: 50% bag of holding, 50% amulet of reflection',
        'Largest puzzle — many boulders and long pit rows',
        'Work systematically from one end of the pit row',
        'The pit row is usually horizontal — fill from one side',
        'Extra boulders remain after filling all pits — push them into corners',
      ],
    },
  };

  const GENERAL_TIPS = [
    '🧩 Sokoban penalty: -1 Luck (uncapped) per boulder pushed to wrong spot or destroyed',
    '🎁 Prize (top level): Bag of Holding (50%) or Amulet of Reflection (50%)',
    '💡 Plan your moves before pushing! Undo is not possible',
    '💡 Boulders can only be pushed, never pulled',
    '💡 You can destroy boulders with force bolt/wand of striking, but take Luck penalty',
    '💡 Filling all pits correctly removes the Luck penalty',
    '🚫 Don\'t eat in Sokoban — the food rations are finite',
    '💡 Levitation/flying trivializes Sokoban but you still need to push boulders',
  ];

  let inSokoban = false;
  let currentLevel = null;
  let boulderCount = 0;
  let pitCount = 0;
  let filledCount = 0;

  function checkState(gameState) {
    // Detect Sokoban from branch/dlvl
    const dlvl = (gameState.dlvl || '').toString();
    const msg = gameState.currentMessage || '';

    if (/sokoban/i.test(dlvl) || /sokoban/i.test(gameState.branch || '')) {
      inSokoban = true;
    }

    // Count boulders and pits from map
    if (gameState.map) {
      let boulders = 0, pits = 0;
      for (const row of gameState.map) {
        for (const ch of row) {
          if (ch === '`' || ch === '0') boulders++;
          if (ch === '^') pits++;
        }
      }
      if (boulders >= 3 && pits >= 3) inSokoban = true;
      if (inSokoban) {
        boulderCount = boulders;
        pitCount = pits;
        // Estimate filled pits: if initial boulders > current boulders + remaining pits
        // Rough heuristic — filled pits no longer show as ^
      }
    }

    // Track level within Sokoban based on depth changes
    if (inSokoban && /level change/i.test(msg)) {
      currentLevel = (currentLevel || 1) + 1;
    }

    // Detect Sokoban penalty messages
    if (/luck/i.test(msg) && inSokoban) {
      // Player likely made a mistake
    }

    if (/you (?:leave|exit) sokoban/i.test(msg) || 
        (inSokoban && !/sokoban/i.test(dlvl) && gameState.branch !== 'Sokoban')) {
      inSokoban = false;
      currentLevel = null;
    }
  }

  function updateUI() {
    const el = document.getElementById('sokoban-content');
    if (!el) return;

    if (!inSokoban) {
      el.innerHTML = '<div class="info-box">Not in Sokoban</div>';
      return;
    }

    let html = '<div style="color:var(--accent);font-weight:600;margin-bottom:6px">🧩 In Sokoban!</div>';

    // Boulder/pit count
    if (boulderCount > 0 || pitCount > 0) {
      html += `<div style="font-size:12px;margin-bottom:6px;color:var(--warning)">` +
        `🪨 Boulders: ${boulderCount} &nbsp; 🕳️ Pits: ${pitCount}</div>`;
    }
    
    // Level-specific strategy
    const lvl = currentLevel || 1;
    const strat = LEVEL_STRATEGIES[Math.min(lvl, 4)];
    if (strat) {
      html += `<div style="font-size:10px;color:var(--text-dim);margin-bottom:2px">${strat.name}</div>`;
      html += '<ul style="font-size:11px;padding-left:16px;margin-bottom:8px">';
      strat.tips.forEach(t => html += `<li>${t}</li>`);
      html += '</ul>';
    }

    // General tip (rotate)
    const tip = GENERAL_TIPS[Math.floor(Date.now() / 10000) % GENERAL_TIPS.length];
    html += `<div style="font-size:11px;margin-bottom:4px;padding:4px;background:rgba(255,255,255,0.03);border-radius:3px">${tip}</div>`;

    el.innerHTML = html;
  }

  function save() { return { inSokoban, currentLevel }; }
  function load(data) { if (data) { inSokoban = data.inSokoban || false; currentLevel = data.currentLevel || null; } }
  function reset() { inSokoban = false; currentLevel = null; }

  return { checkState, updateUI, isInSokoban: () => inSokoban, save, load, reset };
})();

if (typeof module !== 'undefined') module.exports = Sokoban;
