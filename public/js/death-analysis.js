// death-analysis.js — Post-mortem analysis when the player dies
const DeathAnalysis = (() => {
  let isDead = false;
  let analysis = null;

  function checkDeath(gameState) {
    if (isDead) return;
    if (!gameState.dead) return;
    isDead = true;
    analysis = analyze(gameState);
    showOverlay();
  }

  function analyze(state) {
    const report = {
      cause: 'Unknown',
      factors: [],
      lessons: [],
      stats: {},
    };

    // Determine cause from recent messages
    const recent = (state.messageHistory || []).slice(0, 10).map(m => m.text);
    for (const msg of recent) {
      if (/killed by (?:a |an |the )?(.+)/i.test(msg)) {
        report.cause = msg.match(/killed by (?:a |an |the )?(.+?)(?:\.|!|$)/i)?.[1] || 'monster';
      }
      if (/stoned/i.test(msg)) report.cause = 'petrification';
      if (/starved/i.test(msg)) report.cause = 'starvation';
      if (/drowned/i.test(msg)) report.cause = 'drowning';
      if (/slimed/i.test(msg)) report.cause = 'sliming';
      if (/burned|fire/i.test(msg) && /die/i.test(msg)) report.cause = 'fire damage';
      if (/poison/i.test(msg) && /die/i.test(msg)) report.cause = 'poison';
    }

    // Contributing factors
    if (state.hp <= 0) report.factors.push(`HP was ${state.hp}/${state.hpmax}`);
    if (state.ac > 0) report.factors.push(`Poor AC: ${state.ac} (lower is better)`);
    if (state.xl <= 5) report.factors.push(`Low experience level: XL ${state.xl}`);

    const depth = parseInt(state.dlvl) || 0;
    if (depth > state.xl * 2) report.factors.push(`Too deep for your level (Dlvl:${depth} at XL:${state.xl})`);

    const effects = state.statusEffects || [];
    if (effects.includes('Hungry') || effects.includes('Weak')) report.factors.push('Was hungry/weak');
    if (effects.includes('Confused')) report.factors.push('Was confused');
    if (effects.includes('Blind')) report.factors.push('Was blind');

    // Lessons based on cause
    const lessons = {
      petrification: ['Always carry a lizard corpse or acidic corpse', 'Wear gloves against cockatrices', 'Use ranged attacks on stoning monsters'],
      starvation: ['Eat corpses from kills when safe', 'Pray when Weak — it fills you', 'Carry emergency food rations or tins'],
      drowning: ['Get magical breathing or levitation for water areas', 'Avoid water with eels nearby'],
      sliming: ['Burn yourself with fire to cure sliming', 'Kill green slimes from range'],
      poison: ['Get poison resistance early (eat killer bees, etc.)', 'Unicorn horn cures most poison effects'],
    };

    report.lessons = lessons[report.cause] || [
      'Consider whether you had an escape plan (Elbereth, teleport, digging)',
      'Check if you had enough HP for the threats on this level',
      'Prayer can save you — track your prayer timeout',
    ];

    // Session stats
    const ss = typeof SessionStats !== 'undefined' ? SessionStats.getStats() : {};
    report.stats = {
      turns: state.turns,
      peakXL: ss.peakXL || state.xl,
      peakHP: ss.peakHP || state.hpmax,
      deepest: ss.deepestLevel || depth,
      kills: ss.monstersKilled || 0,
      wishes: ss.wishCount || 0,
    };

    return report;
  }

  function showOverlay() {
    if (!analysis) return;
    let overlay = document.getElementById('death-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'death-overlay';
      overlay.className = 'death-overlay';
      document.body.appendChild(overlay);
    }

    overlay.innerHTML = `
      <div class="death-content">
        <h2>☠️ YASD Analysis</h2>
        <div class="death-cause">Cause: <strong>${esc(analysis.cause)}</strong></div>
        <div class="death-section">
          <h3>Contributing Factors</h3>
          <ul>${analysis.factors.map(f => `<li>⚠️ ${esc(f)}</li>`).join('') || '<li>None detected</li>'}</ul>
        </div>
        <div class="death-section">
          <h3>Lessons</h3>
          <ul>${analysis.lessons.map(l => `<li>💡 ${esc(l)}</li>`).join('')}</ul>
        </div>
        <div class="death-section">
          <h3>Session Summary</h3>
          <div class="death-stats">
            T${analysis.stats.turns || '?'} · XL${analysis.stats.peakXL} · ${analysis.stats.kills} kills · Dlvl:${analysis.stats.deepest}
            ${analysis.stats.wishes ? ` · ${analysis.stats.wishes} wishes` : ''}
          </div>
        </div>
        <button class="death-dismiss" onclick="document.getElementById('death-overlay').classList.remove('show')">Dismiss</button>
      </div>
    `;
    overlay.classList.add('show');
  }

  function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
  function reset() { isDead = false; analysis = null; }

  return { checkDeath, reset };
})();

if (typeof module !== 'undefined') module.exports = DeathAnalysis;
