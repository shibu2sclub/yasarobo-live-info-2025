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
        let c = 0;
        list.forEach((row, i) => {
            const sec = document.createElement('section');
            sec.className = 'rank-card';
            sec.innerHTML = `
                <diagonal-mask class = "rank-content-wrap" mask-class = "mask-rank-content-wrap">
                    <div class = "rank-content">
                        <div class="rank-pos">${i + 1}</div>
                        <div class="id">${row.playerId || ''}</div>
                        <div class="score"><div><div>${row.total ?? 0}</div><div>pts</div></div></div>
                        <div class="time">${fmtMs(row.matchRemainingMs ?? 0)}</div>
                    </div>
                </diagonal-mask>
            `;
            elRanks.appendChild(sec);
            c += 1;
        });
        const wholeHeight = 150 + c * 55;
        const styleEl = document.querySelector('style');
        styleEl.textContent = `:root { --panel-height: ${wholeHeight}px; }`;
    }

    rankingData.on('change', (v) => { cacheRanking = v || { byRule: {} }; render(); });
    rankingDisplayConfig.on('change', (v) => { cacheDisplay = v || { ruleId: null }; render(); });
    rulesLibrary.on('change', (v) => { cacheRulesLib = v || { items: [] }; render(); });

    render();
})();

(function () {
    const vis = nodecg.Replicant('graphicsVisibility');
    const rankingWrap = document.getElementById('ranking-wrap');
    const rankingTitleWrap = document.getElementById("ranking-title-wrap");

    vis.on('change', (v = {}) => {
        const visible = !!v.rankingBoard;

        const rankingContentWraps = rankingWrap.querySelectorAll('.rank-content-wrap');
        if (visible) {
            rankingWrap.classList.add('no-animation');
            rankingTitleWrap.classList.remove('no-animation');
            rankingWrap.classList.add('active');
            rankingTitleWrap.classList.add('active');
            setTimeout(() => {
                rankingContentWraps.forEach((el, i) => {
                    setTimeout(() => {
                        el.classList.remove('no-animation');
                        el.classList.add('active');
                    }, i * 100);
                });
            }, 600);
        }
        else {
            rankingWrap.classList.remove('no-animation');
            rankingTitleWrap.classList.add('no-animation');
            rankingWrap.classList.remove('active');
            setTimeout(() => {
                rankingTitleWrap.classList.remove('active');
                rankingContentWraps.forEach((el) => {
                    el.classList.add('no-animation');
                    el.classList.remove('active');
                });
            }, 600);
        }
    });
})();