(function () {
    const rulesLibrary = nodecg.Replicant('rulesLibrary'); // {items:[{rule:{ruleId, nameDashboard, nameGraphics, themeColor,...}, meta:{title}}]}
    const rankingData = nodecg.Replicant('rankingData');  // {byRule:{rid:[...]}}

    const q = (s) => document.querySelector(s);
    const elSelect = q('#ruleSelect');
    const elBody = q('#rankBody');

    let libCache = { items: [] };
    let rankCache = { byRule: {} };

    // 現在UIで選ばれてるruleId
    let currentRuleId = '';

    function fmtMs(ms) {
        ms = Math.max(0, Math.floor(ms || 0));
        const cs = Math.floor(ms / 10);
        const m = Math.floor(cs / 6000);
        const s = Math.floor((cs % 6000) / 100);
        const c = cs % 100;
        // 表示は "m:ss.cc"
        return `${m}:${String(s).padStart(2, '0')}.${String(c).padStart(2, '0')}`;
    }

    // プルダウン再描画
    function renderRuleSelect() {
        const items = libCache.items || [];

        // 現在存在する ruleId の一覧
        // 重複なしで ruleId を拾う（items毎のrule.ruleId）
        const ruleOpts = [];
        for (const doc of items) {
            const r = doc.rule || {};
            const rid = r.ruleId || '';
            if (!rid) continue;
            // label は graphics優先で
            const label =
                r.nameGraphics ||
                r.nameDashboard ||
                r.nameGraphicsShortEn ||
                rid;
            ruleOpts.push({ rid, label });
        }
        // ユニーク化
        const seen = new Set();
        const unique = [];
        for (const o of ruleOpts) {
            if (seen.has(o.rid)) continue;
            seen.add(o.rid);
            unique.push(o);
        }

        // もし currentRuleId がもう無いなら先頭に戻す
        if (unique.length > 0) {
            if (!unique.find(o => o.rid === currentRuleId)) {
                currentRuleId = unique[0].rid;
            }
        } else {
            currentRuleId = '';
        }

        elSelect.innerHTML = '';
        unique.forEach(o => {
            const opt = document.createElement('option');
            opt.value = o.rid;
            opt.textContent = `${o.label} {${o.rid}}`;
            if (o.rid === currentRuleId) opt.selected = true;
            elSelect.appendChild(opt);
        });
    }

    // 順位表再描画
    function renderTable() {
        // currentRuleId が空なら空表示
        if (!currentRuleId) {
            elBody.innerHTML = '';
            return;
        }

        const list = (rankCache.byRule?.[currentRuleId] || []);
        // list: [{playerId, robotShort, teamShort, total, matchRemainingMs}, ...]

        elBody.innerHTML = '';
        list.forEach((row, idx) => {
            const tr = document.createElement('tr');

            const rankTd = document.createElement('td');
            rankTd.textContent = String(idx + 1);

            const idTd = document.createElement('td');
            idTd.textContent = row.playerId || '';

            const robotTd = document.createElement('td');
            robotTd.textContent = row.robotShort || '';

            const teamTd = document.createElement('td');
            teamTd.textContent = row.teamShort || '';

            const scoreTd = document.createElement('td');
            scoreTd.textContent = String(row.total ?? 0);

            const timeTd = document.createElement('td');
            timeTd.textContent = fmtMs(row.matchRemainingMs ?? 0);

            tr.appendChild(rankTd);
            tr.appendChild(idTd);
            tr.appendChild(robotTd);
            tr.appendChild(teamTd);
            tr.appendChild(scoreTd);
            tr.appendChild(timeTd);

            elBody.appendChild(tr);
        });
    }

    // イベント: ルール選択変更
    elSelect.addEventListener('change', () => {
        currentRuleId = elSelect.value || '';
        renderTable();
    });

    // Replicant購読
    rulesLibrary.on('change', v => {
        libCache = v || { items: [] };
        renderRuleSelect();
        renderTable();
    });

    rankingData.on('change', v => {
        rankCache = v || { byRule: {} };
        renderTable();
    });

    // 初期
    renderRuleSelect();
    renderTable();
})();
