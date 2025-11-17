(function () {
    const currentPlayer = nodecg.Replicant('currentPlayer');
    const pointState = nodecg.Replicant('pointState');
    const retryCount = nodecg.Replicant('retryCount');
    const rules = nodecg.Replicant('rules');

    const elPlayerId = document.getElementById('playerId');
    const elPlayerRobot = document.getElementById('playerRobot');
    const elPlayerTeam = document.getElementById('playerTeam');
    const elRuleName = document.getElementById('ruleName');
    const elTotalScore = document.getElementById('totalScore');
    const elRetry = document.getElementById('retryCount');
    const elBody = document.getElementById('breakdownBody');
    const elRaw = document.getElementById('rawDebug');

    let cachePlayer = null;
    let cachePoint = null;
    let cacheRules = null;
    let cacheRetry = null;

    function fmtRuleName(rule) {
        if (!rule) return '—';
        return (
            rule.nameGraphics ||
            rule.nameDashboard ||
            rule.nameGraphicsShortEn ||
            rule.ruleId ||
            '—'
        );
    }

    function computeSummary(entries, ruleItems) {
        const summary = {};
        const itemsByKey = {};
        (ruleItems || []).forEach((it) => {
            itemsByKey[it.key] = it;
        });

        for (const [key, arrRaw] of Object.entries(entries || {})) {
            const arr = Array.isArray(arrRaw) ? arrRaw : [];
            let ok = 0;
            let ng = 0;
            let pts = 0;
            const rule = itemsByKey[key];

            for (const v of arr) {
                const isOk = !!v;
                if (isOk) ok++;
                else ng++;

                if (rule) {
                    pts += isOk ? (rule.pointsCorrect || 0) : (rule.pointsWrong || 0);
                }
            }
            summary[key] = { ok, ng, points: pts };
        }

        return summary;
    }

    function render() {
        const p = cachePlayer;
        const ps = cachePoint || {};
        const rs = cacheRules || {};
        const rc = cacheRetry || { count: 0 };

        // ヘッダ
        if (!p) {
            elPlayerId.textContent = 'ID: —';
            elPlayerRobot.textContent = 'Robot: —';
            elPlayerTeam.textContent = 'Team: —';
        } else {
            elPlayerId.textContent = `ID: ${p.id ?? '—'}`;
            const robotName = p.robotShort || p.robot || '—';
            const teamName = p.teamShort || p.team || '—';
            elPlayerRobot.textContent = `Robot: ${robotName}`;
            elPlayerTeam.textContent = `Team: ${teamName}`;
        }

        elRuleName.textContent = fmtRuleName(rs);
        elTotalScore.textContent = String(ps.total ?? 0);
        elRetry.textContent = String(rc.count ?? 0);

        // 内訳テーブル
        const entries = ps.entries || {};
        const ruleItems = rs.items || [];
        const summary = computeSummary(entries, ruleItems);

        // 表示順：ルールに定義されている順 → ルール外の key
        const keysInRule = ruleItems.map((it) => it.key);
        const extraKeys = Object.keys(entries).filter((k) => !keysInRule.includes(k));
        const keys = [...keysInRule, ...extraKeys];

        elBody.innerHTML = '';
        keys.forEach((key) => {
            const arrRaw = entries[key];
            const arr = Array.isArray(arrRaw) ? arrRaw : [];
            const s = summary[key] || { ok: 0, ng: 0, points: 0 };

            const ruleItem = ruleItems.find((it) => it.key === key);
            const label = ruleItem?.labelGraphics || ruleItem?.labelDashboard || key;

            const marks = arr.map((v) => (v ? '○' : '×')).join(' ');

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${label}</td>
                <td class="marks">${marks || '—'}</td>
                <td class="num">${s.ok}</td>
                <td class="num">${s.ng}</td>
                <td class="num">${s.points}</td>
            `;
            elBody.appendChild(tr);
        });

        // デバッグ用に生データも軽く表示
        const rawObj = {
            player: p,
            pointState: ps,
            retry: rc,
            rules: {
                name: fmtRuleName(rs),
                ruleId: rs.ruleId || undefined
            }
        };
        elRaw.textContent = JSON.stringify(rawObj, null, 2);
    }

    currentPlayer.on('change', (v) => {
        cachePlayer = v || null;
        render();
    });
    pointState.on('change', (v) => {
        cachePoint = v || null;
        render();
    });
    retryCount.on('change', (v) => {
        cacheRetry = v || null;
        render();
    });
    rules.on('change', (v) => {
        cacheRules = v || null;
        render();
    });

    render();
})();
