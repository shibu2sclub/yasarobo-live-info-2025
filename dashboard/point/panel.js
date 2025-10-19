(function () {
    const rules = nodecg.Replicant('rules');
    const ps = nodecg.Replicant('pointState');

    const q = (s) => document.querySelector(s);
    const itemsWrap = q('#items');
    const statusBox = q('#status');

    q('#reset').addEventListener('click', () => nodecg.sendMessage('point-control', { action: 'reset' }));

    // 動的UI：ルールが変わったら組み立て直す
    rules.on('change', () => buildUI());
    ps.on('change', () => refresh());

    function sendAdd(key, ok) {
        nodecg.sendMessage('point-control', { action: 'add', key, ok });
    }

    function buildUI() {
        const list = rules.value?.items || [];
        itemsWrap.innerHTML = '';

        for (const it of list) {
            const row = document.createElement('div');
            row.className = 'row row-grid';
            row.dataset.key = it.key;

            const name = document.createElement('div');
            name.className = 'name';
            name.textContent = it.labelDashboard || it.key;

            const btnOK = document.createElement('button');
            btnOK.textContent = `${it.labelDashboard || it.key} 正解(+${it.pointsCorrect ?? 0})`;
            btnOK.addEventListener('click', () => sendAdd(it.key, true));

            const btnNG = document.createElement('button');
            btnNG.textContent = `${it.labelDashboard || it.key} 誤り(+${it.pointsWrong ?? 0})`;
            btnNG.addEventListener('click', () => sendAdd(it.key, false));

            // pointsWrong が 0 のときはボタンを隠す（仕様に合わせてスッキリ）
            if (!it.pointsWrong) btnNG.style.display = 'none';

            const cap = document.createElement('span');
            cap.className = 'cap';
            cap.id = `cap-${it.key}`;
            cap.textContent = `0 / ${it.cap ?? 0}`;

            row.appendChild(name);
            row.appendChild(btnOK);
            row.appendChild(btnNG);
            row.appendChild(cap);
            itemsWrap.appendChild(row);
        }

        refresh();
    }

    function refresh() {
        const list = rules.value?.items || [];
        const st = ps.value || { entries: {}, total: 0, rev: 0 };

        // ボタンの enable/disable と cap 表示
        for (const it of list) {
            const arr = st.entries?.[it.key] || [];
            const full = arr.length >= (it.cap ?? 0);
            const row = itemsWrap.querySelector(`.row[data-key="${it.key}"]`);
            if (!row) continue;
            const [btnOK, btnNG] = row.querySelectorAll('button');
            btnOK.disabled = full;
            if (btnNG) btnNG.disabled = full;
            const cap = row.querySelector(`#cap-${it.key}`);
            if (cap) cap.textContent = `${arr.length} / ${it.cap ?? 0}`;
        }

        // ステータス（合計と各内訳）
        const parts = [];
        parts.push(`<div><strong>Total:</strong> ${st.total}</div>`);
        for (const it of list) {
            const arr = st.entries?.[it.key] || [];
            const s = `[${arr.map(v => v ? '○' : '×').join(', ')}]`;
            parts.push(`<div><strong>${it.labelDashboard || it.key}:</strong> ${s}</div>`);
        }
        parts.push(`<div><strong>rev:</strong> ${st.rev}</div>`);
        statusBox.innerHTML = parts.join('');
    }
})();
