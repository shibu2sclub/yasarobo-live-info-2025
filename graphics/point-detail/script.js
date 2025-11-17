(function () {
    const pointState = nodecg.Replicant('pointState');
    const rules = nodecg.Replicant('rules');

    const contentElement = document.getElementById('content');

    let cachePoint = null;
    let cacheRules = null;

    /*function fmtRuleName(rule) {
        if (!rule) return '—';
        return (
            rule.nameGraphics ||
            rule.nameDashboard ||
            rule.nameGraphicsShortEn ||
            rule.ruleId ||
            '—'
        );
    }*/

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
        const ps = cachePoint || {};
        const rs = cacheRules || {};

        // elRuleName.textContent = fmtRuleName(rs);
        // elTotalScore.textContent = String(ps.total ?? 0);

        // 内訳テーブル
        const entries = ps.entries || {};
        const ruleItems = rs.items || [];
        const summary = computeSummary(entries, ruleItems);

        // 表示順：ルールに定義されている順 → ルール外の key
        const keysInRule = ruleItems.map((it) => it.key);
        const extraKeys = Object.keys(entries).filter((k) => !keysInRule.includes(k));
        const keys = [...keysInRule, ...extraKeys];

        contentElement.innerHTML = ``;

        let i = 0;
        keys.forEach((key) => {
            const arrRaw = entries[key];
            const arr = Array.isArray(arrRaw) ? arrRaw : [];
            const s = summary[key] || { ok: 0, ng: 0, points: 0 };

            const ruleItem = ruleItems.find((it) => it.key === key);
            const label = ruleItem?.labelGraphics || ruleItem?.labelDashboard || key;

            const marks = arr.map((v) => (v ? '○' : '×')).join(' ');

            const rowDiv = document.createElement('div');
            rowDiv.classList.add("row");
            const bc = ruleItem.icon.borderColor;
            const c = ruleItem.icon.color;
            rowDiv.innerHTML = `
                <div class="icon-box">
                    <div class="icon ${ruleItem.icon.type}" style="${c.indexOf('gradient') == -1 ? `background-color: ${c};` : `background-image: ${c};`} ${bc != undefined ? `border: 4px solid ${bc}` : ''}"></div>
                </div>
                <div class="point-info-box">
                    <div class="point-info">
                        <div id="red-point">${s.points}</div>
                        <div class="point-total">/</div>
                        <div id="red-total" class="point-total">${ruleItem.pointsCorrect * ruleItem.cap}</div>
                    </div>
                </div>
                <div class="point-order-box">
                    <div class="point-table">
                        <div class="point-table-item">〇</div>
                        <div class="point-table-item">〇</div>
                        <div class="point-table-item">〇</div>
                        <div class="point-table-item">〇</div>
                        <div class="point-table-item feature" style="border-color: #FF4747">〇</div>
                    </div>
                </div>
            `;
            contentElement.appendChild(rowDiv);
            i++;
        });

        const styleElement = document.querySelector('style');
        styleElement.innerHTML = `
            :root {
                --row-num: ${i};
            }
        `
    }

    pointState.on('change', (v) => {
        cachePoint = v || null;
        render();
    });
    rules.on('change', (v) => {
        cacheRules = v || null;
        render();
    });

    render();
})();

(function () {
    const vis = nodecg.Replicant('graphicsVisibility');
    const visibleRoot = document.getElementById('visible-root');

    vis.on('change', (v = {}) => {
        const visible = !!v.pointDetail;
        visibleRoot.classList.toggle('active', visible);
    });
})();