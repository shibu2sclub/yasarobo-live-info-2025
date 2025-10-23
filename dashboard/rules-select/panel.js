(function () {
    const lib = nodecg.Replicant('rulesLibrary');
    const act = nodecg.Replicant('rulesActiveKey');
    const rules = nodecg.Replicant('rules');

    const q = (s) => document.querySelector(s);
    const elFilter = q('#filter');
    const elList = q('#list');
    const elActive = q('#active');
    const elAC = q('#ac');
    const elRC = q('#rc');
    const elPrev = q('#preview');
    const btnApply = q('#apply');
    const btnClear = q('#clearActive');

    let rawItems = [];

    // ルール適用：ActiveKey を切り替え、かつ現在選手にも ruleId を書き込む
    btnApply.addEventListener('click', () => {
        const opt = elList.selectedOptions[0];
        if (!opt) return;

        // 1) ActiveKey を更新（→ rules-manager が rules を適用＆副作用実行）
        nodecg.sendMessage('ruleslib:select', { id: opt.value });

        // 2) 現在選手の ruleId にも保存（指定ルールとして上書き）
        const doc = rawItems.find(d => d.id === opt.value);
        const rid = doc?.rule?.ruleId || '';
        if (rid) {
            nodecg.sendMessage('player-control', { action: 'bind-rule-current', ruleId: rid });
        } else {
            // ruleId が未設定のルールの場合はスキップ（推奨: ルールJSONに ruleId を付ける）
            console.warn('[rules-select] selected rule has no ruleId; player binding skipped');
        }
    });

    // 選択解除：ActiveKey を null に（rules は現状維持）
    btnClear.addEventListener('click', () => { act.value = null; });

    elFilter.addEventListener('input', renderList);
    elList.addEventListener('change', renderPreview);
    elList.addEventListener('dblclick', () => btnApply.click());

    lib.on('change', (v) => { rawItems = v?.items || []; renderList(); });
    act.on('change', renderActive);
    rules.on('change', renderActive);

    function renderList() {
        const kw = elFilter.value.trim().toLowerCase();
        const list = !kw ? rawItems : rawItems.filter(d => {
            const t = (d.meta?.title || '').toLowerCase();
            const s = (d.rule?.nameGraphicsShortEn || '').toLowerCase();
            const r = (d.rule?.ruleId || '').toLowerCase();
            return t.includes(kw) || s.includes(kw) || r.includes(kw);
        });

        elList.innerHTML = '';
        list
            .slice()
            .sort((a, b) => (a.meta?.title || '').localeCompare(b.meta?.title || ''))
            .forEach(d => {
                const opt = document.createElement('option');
                opt.value = d.id;
                const title = d.meta?.title || d.id;
                const ac = d.rule?.attemptsCount ?? '?';
                const rc = d.rule?.retryAttemptsCount ?? '?';
                const rid = d.rule?.ruleId ? ` {${d.rule.ruleId}}` : '';
                const abbr = d.rule?.nameGraphicsShortEn ? ` [${d.rule.nameGraphicsShortEn}]` : '';
                opt.textContent = `${title}${abbr}${rid}  (attempts:${ac}, retry:${rc})`;
                elList.appendChild(opt);
            });

        renderPreview();
    }

    function renderPreview() {
        const opt = elList.selectedOptions[0];
        if (!opt) { elPrev.textContent = ''; return; }
        const item = rawItems.find(d => d.id === opt.value);
        elPrev.textContent = item ? JSON.stringify(item.rule, null, 2) : '';
    }

    function renderActive() {
        const r = rules.value || {};
        const title = r.nameDashboard || r.nameGraphics || r.nameGraphicsShortEn || '（未設定）';
        elActive.textContent = title;
        elAC.textContent = String(r.attemptsCount ?? '—');
        elRC.textContent = String(r.retryAttemptsCount ?? '—');
    }
})();
