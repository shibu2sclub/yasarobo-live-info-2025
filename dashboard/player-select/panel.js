(function () {
    const roster = nodecg.Replicant('playerRoster');
    const current = nodecg.Replicant('currentPlayer');

    const q = (s) => document.querySelector(s);
    const elFilter = q('#filter');
    const elList = q('#list');
    const elCur = q('#cur');
    const elCount = q('#count');

    const btnSelect = q('#select');
    const btnClearCur = q('#clearCur');
    const btnPrevOrder = q('#prevOrder');
    const btnNextOrder = q('#nextOrder');

    let rawList = [];        // Replicant そのもの
    let renderedList = [];   // フィルタ／ソート後（elList の表示順と一致）

    function send(action, extra) {
        nodecg.sendMessage('player-control', { action, ...extra });
    }

    // 「表示に反映」
    btnSelect.addEventListener('click', () => {
        const opt = elList.selectedOptions[0];
        if (!opt) return;
        send('select', { id: opt.value });
    });

    // 現在表示のクリア
    btnClearCur.addEventListener('click', () => send('clear-current'));

    // フィルタ
    elFilter.addEventListener('input', () => renderList());

    // Replicant 購読
    roster.on('change', (list = []) => { rawList = list; renderList(); });
    current.on('change', (p) => { elCur.textContent = p ? formatOneLine(p) : '（なし）'; });

    // 表示描画（filter → sort）
    function renderList() {
        const keyword = elFilter.value.trim().toLowerCase();

        let list = Array.isArray(rawList) ? [...rawList] : [];

        if (keyword) {
            list = list.filter(p =>
                String(p.id).toLowerCase().includes(keyword) ||
                String(p.robot || '').toLowerCase().includes(keyword) ||
                String(p.team || '').toLowerCase().includes(keyword)
            );
        }

        // order → id で並べる（order 未設定は末尾へ）
        list.sort((a, b) => {
            const ao = a.order ?? 1e9, bo = b.order ?? 1e9;
            if (ao !== bo) return ao - bo;
            return String(a.id).localeCompare(String(b.id));
        });

        renderedList = list;

        elList.innerHTML = '';
        for (const p of list) {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = formatOneLine(p);
            elList.appendChild(opt);
        }
        elCount.textContent = String(rawList.length);
    }

    function formatOneLine(p) {
        const order = p.order == null ? '-' : String(p.order);
        const team = p.team ? ` / ${p.team}` : '';
        const robot = p.robotShort || p.robot || '';
        return `[${order}] ID:${p.id}${team} / ${robot}`;
    }

    // ─────────────────────────────────────
    // order ベースで前後移動（現在の renderedList に従う）
    // ─────────────────────────────────────
    btnPrevOrder.addEventListener('click', () => moveSelection(-1));
    btnNextOrder.addEventListener('click', () => moveSelection(+1));

    function moveSelection(offset) {
        if (renderedList.length === 0) return;

        // 現在の選択 index（なければ offset>0 で先頭、offset<0 で末尾から）
        let idx = elList.selectedIndex;
        if (idx < 0) idx = offset > 0 ? 0 : renderedList.length - 1;
        else {
            idx = clamp(idx + offset, 0, renderedList.length - 1);
        }

        // 選択更新
        elList.selectedIndex = idx;
        // スクロール追従
        const opt = elList.options[idx];
        if (opt && typeof opt.scrollIntoView === 'function') {
            opt.scrollIntoView({ block: 'nearest' });
        }
    }

    function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
})();
