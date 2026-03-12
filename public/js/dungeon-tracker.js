// dungeon-tracker.js — Track visited dungeon levels and notable features
const DungeonTracker = (() => {
  const levels = {}; // key: "Dlvl:X" → { features, firstVisit, lastVisit, notes }

  const FEATURE_ICONS = {
    shop: '🏪',
    altar: '⛪',
    fountain: '⛲',
    sink: '🚰',
    throne: '👑',
    trap: '⚠️',
    stairsDown: '↓',
    stairsUp: '↑',
    portal: '🌀',
    vault: '🏦',
  };

  function recordVisit(dlvl) {
    if (!dlvl) return;
    const key = dlvl;
    if (!levels[key]) {
      levels[key] = {
        features: new Set(),
        firstVisit: Date.now(),
        lastVisit: Date.now(),
        turnFirst: 0,
        turnLast: 0,
      };
    }
    levels[key].lastVisit = Date.now();
  }

  function addFeature(dlvl, feature) {
    if (!dlvl || !levels[dlvl]) recordVisit(dlvl);
    if (levels[dlvl]) levels[dlvl].features.add(feature);
  }

  function update(gameState) {
    const dlvl = gameState.dlvl;
    if (!dlvl) return;

    recordVisit(dlvl);
    if (levels[dlvl]) {
      levels[dlvl].turnLast = gameState.turns || 0;
      if (!levels[dlvl].turnFirst) levels[dlvl].turnFirst = gameState.turns || 0;
    }

    // Auto-detect features from messages
    if (gameState.inShop) addFeature(dlvl, 'shop');
    if (gameState.nearAltar) addFeature(dlvl, 'altar');
    if (gameState.nearFountain) addFeature(dlvl, 'fountain');
    if (gameState.nearSink) addFeature(dlvl, 'sink');
    const msg = gameState.currentMessage || '';
    if (/footsteps of a guard on patrol|hear the footsteps of a guard/i.test(msg)) addFeature(dlvl, 'vault');

    renderUI(dlvl);
  }

  function renderUI(currentDlvl) {
    const container = document.getElementById('dungeon-content');
    if (!container) return;

    const sorted = Object.entries(levels).sort((a, b) => {
      const aNum = parseInt(a[0]) || 0;
      const bNum = parseInt(b[0]) || 0;
      return aNum - bNum;
    });

    if (sorted.length === 0) {
      container.innerHTML = '<div class="info-box">No levels visited yet.</div>';
      return;
    }

    container.innerHTML = sorted.map(([dlvl, data]) => {
      const isCurrent = dlvl === currentDlvl;
      const features = [...data.features].map(f => FEATURE_ICONS[f] || f).join(' ');
      const cls = isCurrent ? 'dungeon-level current' : 'dungeon-level';
      return `<div class="${cls}">
        <span class="dl-name">${isCurrent ? '▸ ' : ''}Dlvl:${dlvl}</span>
        <span class="dl-features">${features || '—'}</span>
      </div>`;
    }).join('');
  }

  function initUI() {
    const container = document.getElementById('dungeon-content');
    if (container) container.innerHTML = '<div class="info-box">No levels visited yet.</div>';
  }

  function reset() { for (const k in levels) delete levels[k]; renderUI(); }
  function save() { const d={}; for(const[k,v] of Object.entries(levels)) d[k]={...v,features:[...(v.features||[])]}; return d; }
  function load(data) { if(!data) return; for(const k in levels) delete levels[k]; for(const[k,v] of Object.entries(data)) levels[k]={...v,features:new Set(v.features||[])}; }

  return { update, initUI, addFeature, recordVisit, reset, save, load };
})();
