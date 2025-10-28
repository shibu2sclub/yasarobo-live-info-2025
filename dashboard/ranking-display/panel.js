(function () {
    const rulesLibrary = nodecg.Replicant('rulesLibrary');             // {items:[{rule:{ruleId,...}}]}
    const rankingDisplayConfig = nodecg.Replicant('rankingDisplayConfig'); // {ruleId: string|null}

    const q = (s) => document.querySelector(s);

    const elCurrentPill = q('#currentRulePill');
    const elSelect = q('#ruleSelect');
    const elApply = q('#applyBtn');
    const elClear = q('#clearBtn');

    // キャッシュ
    let libItems = [];
    let currentRuleId = null;

    function getRuleDocByRuleId(ruleId) {
        if (!ruleId) return null;
        return libItems.find(doc => (doc.rule?.ruleId || '') === ruleId) || null;
    }

    // 現在の放送ルール表示を更新
    function renderCurrent() {
        const doc = getRuleDocByRuleId(currentRuleId);

        if (!currentRuleId || !doc || !doc.rule) {
            elCurrentPill.textContent = '—';
            elCurrentPill.style.backgroundColor = '#666';
            elCurrentPill.style.color = '#fff';
            return;
        }

        const r = doc.rule;
        const label =
            r.nameGraphicsShortEn ||
            r.nameGraphics ||
            r.nameDashboard ||
            r.ruleId ||
            '(no name)';

        elCurrentPill.textContent = label;
        elCurrentPill.style.backgroundColor = r.themeColor || '#444';
        elCurrentPill.style.color = '#fff';
    }

    // セレクトボックス再描画
    function renderSelect() {
        // ルール一覧を ruleIdごとにまとめて重複消し
        const seen = new Set();
        const opts = [];
        for (const doc of libItems) {
            const r = doc.rule || {};
            const rid = r.ruleId || '';
            if (!rid) continue;
            if (seen.has(rid)) continue;
            seen.add(rid);

            const label =
                r.nameGraphicsShortEn ||
                r.nameGraphics ||
                r.nameDashboard ||
                rid;

            opts.push({ rid, label, color: r.themeColor || '#444' });
        }

        elSelect.innerHTML = '';
        if (opts.length === 0) {
            const opt = document.createElement('option');
            opt.value = '';
            opt.textContent = '（ルールなし）';
            elSelect.appendChild(opt);
            return;
        }

        opts.forEach(o => {
            const opt = document.createElement('option');
            opt.value = o.rid;
            opt.textContent = `${o.label} {${o.rid}}`;
            if (o.rid === currentRuleId) {
                opt.selected = true;
            }
            elSelect.appendChild(opt);
        });
    }

    // セレクト変更されたら local の currentRuleId を更新する（まだ配信には反映しない）
    elSelect.addEventListener('change', () => {
        currentRuleId = elSelect.value || null;
        // ここではまだ renderCurrent() は呼ばない。
        // renderCurrent() は実際の反映(`apply`)後 or replicant更新後に正しい状態を表示したいから。
    });

    // 「このルールを放送に出す」
    elApply.addEventListener('click', () => {
        const rid = elSelect.value || '';
        nodecg.sendMessage('rankingDisplay:setRule', { ruleId: rid });
        // extension/ranking-display.js が rankingDisplayConfig.ruleId を更新し、
        // その更新を下の replicant.on('change') が拾ってくれる
    });

    // 「放送ランキングを非表示にする」
    elClear.addEventListener('click', () => {
        nodecg.sendMessage('rankingDisplay:setRule', { ruleId: '' });
    });

    // Replicant購読
    rulesLibrary.on('change', v => {
        libItems = (v && v.items) || [];
        renderSelect();
        renderCurrent();
    });

    rankingDisplayConfig.on('change', v => {
        currentRuleId = (v && v.ruleId) || null;
        renderSelect();
        renderCurrent();
    });

    // 初期
    renderSelect();
    renderCurrent();
})();
