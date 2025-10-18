(function () {
    const roster = nodecg.Replicant('playerRoster');
    const current = nodecg.Replicant('currentPlayer');

    const q = (s) => document.querySelector(s);
    const elFilter = q('#filter');
    const elList = q('#list');
    const elCur = q('#cur');
    const elCount = q('#count');

    let rawList = [];

    function send(action, extra) {
        nodecg.sendMessage('player-control', { action, ...extra });
    }

    // セレクト反映
    q('#select').addEventListener('click', () => {
        const opt = elList.selectedOptions[0];
        if (!opt) return;
        send('select', { id: opt.value });
    });

    // 現在表示のクリア
    q('#clearCur').addEventListener('click', () => send('clear-current'));

    // フィルタ
    elFilter.addEventListener('input', () => renderList());

    function renderList() {
        const keyword = elFilter.value.trim().toLowerCase();
        elList.innerHTML = '';
        const list = !keyword ? rawList : rawList.filter(p =>
            String(p.id).toLowerCase().includes(keyword) || String(p.robot).toLowerCase().includes(keyword)
        );
        list.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = `ID:${p.id} / ${p.robot}`;
            elList.appendChild(opt);
        });
        elCount.textContent = String(rawList.length);
    }

    roster.on('change', (list = []) => { rawList = list; renderList(); });
    current.on('change', (p) => { elCur.textContent = p ? `ID:${p.id} / ${p.robot}` : '（なし）'; });
})();
