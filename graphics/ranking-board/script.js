(function () {
    const rankingData = nodecg.Replicant('rankingData');
    const rankingDisplayConfig = nodecg.Replicant('rankingDisplayConfig');
    const rulesLibrary = nodecg.Replicant('rulesLibrary');

    const elRulePill = document.getElementById('rulePill');
    const elRanks = document.getElementById('ranks');

    let cacheRanking = { byRule: {} };
    let cacheDisplay = { ruleId: null };
    let cacheRulesLib = { items: [] };

    function fmtMs(ms) {
        ms = Math.max(0, Math.floor(ms || 0));
        const cs = Math.floor(ms / 10);
        const m = Math.floor(cs / 6000);
        const s = Math.floor((cs % 6000) / 100);
        const c = cs % 100;
        return `${m}:${String(s).padStart(2, '0')}.${String(c).padStart(2, '0')}`;
    }

    function findRuleDoc(ruleId) {
        return cacheRulesLib.items?.find(d => d.rule?.ruleId === ruleId) || null;
    }

    function render() {
        const rid = cacheDisplay.ruleId || null;
        const doc = findRuleDoc(rid);

        // ルールピル更新
        if (doc) {
            elRulePill.textContent = doc.rule.nameGraphicsShortEn || doc.rule.nameGraphics || doc.rule.nameDashboard || rid;
            elRulePill.style.backgroundColor = doc.rule.themeColor || '#AF1E21';
        } else {
            elRulePill.textContent = '—';
            elRulePill.style.backgroundColor = '#666';
        }

        // ランキングリスト更新
        elRanks.innerHTML = '';
        const list = rid ? cacheRanking.byRule?.[rid] || [] : [];
        list.forEach((row, i) => {
            const sec = document.createElement('section');
            sec.className = 'rank-card';
            sec.innerHTML = `
                <div class="rank-pos">${i + 1}</div>
                <div class="rank-main">
                    <div class="id">${row.playerId || ''}</div>
                    <div class="robot">${row.robotShort || row.robot || ''}</div>
                    <div class="team">${row.teamShort || row.team || ''}</div>
                </div>
                <div class="rank-stats">
                    <div class="score">${row.total ?? 0}</div>
                    <div class="time">${fmtMs(row.matchRemainingMs ?? 0)}</div>
                </div>
            `;
            elRanks.appendChild(sec);
        });
    }

    rankingData.on('change', (v) => { cacheRanking = v || { byRule: {} }; render(); });
    rankingDisplayConfig.on('change', (v) => { cacheDisplay = v || { ruleId: null }; render(); });
    rulesLibrary.on('change', (v) => { cacheRulesLib = v || { items: [] }; render(); });

    render();
})();
