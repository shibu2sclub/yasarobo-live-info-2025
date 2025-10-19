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

    btnApply.addEventListener('click', () => {
        const opt = elList.selectedOptions[0];
        if (!opt) return;
        nodecg.sendMessage('ruleslib:select', { id: opt.value });
    });

    btnClear.addEventListener('click', () => {
        // 選択解除：ActiveKey を null にし、rules は現状維持（変更したければ適用してください）
        act.value = null;
    });

    elFilter.addEventListener('input', renderList);
    elList.addEventListener('change', renderPreview);
    elList.addEventListener('dblclick', () => btnApply.click());

    lib.on('change', (v) => {
        rawItems = v?.items || [];
        renderList();
    });

    act.on('change', () => renderActive());
    rules.on('change', () => renderActive());

    function renderList() {
        const kw = elFilter.value.trim().toLowerCase();
        const list = !kw ? rawItems : rawItems.filter(d => {
            const t = (d.meta?.title || '').toLowerCase();
            const s = (d.rule?.nameGraphicsShortEn || '').toLowerCase();
            return t.includes(kw) || s.includes(kw);
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
                opt.textContent = `${title}  (attempts:${ac}, retry:${rc})`;
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
