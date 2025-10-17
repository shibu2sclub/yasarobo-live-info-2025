(function () {
    const roster = nodecg.Replicant('playerRoster');
    const current = nodecg.Replicant('currentPlayer');

    const q = (s) => document.querySelector(s);

    const elId = q('#pid');
    const elRobot = q('#robot');
    const elList = q('#list');
    const elCur = q('#cur');
    const elCount = q('#count');

    function send(action, extra) {
        nodecg.sendMessage('player-control', { action, ...extra });
    }

    // 追加／上書き
    q('#add').addEventListener('click', () => {
        const id = elId.value.trim();
        const robot = elRobot.value.trim();
        if (!id || !robot) return;
        send('add', { id, robot });
        elId.value = '';
        elRobot.value = '';
    });

    // 表示に反映
    q('#select').addEventListener('click', () => {
        const opt = elList.selectedOptions[0];
        if (!opt) return;
        send('select', { id: opt.value });
    });

    // 削除
    q('#remove').addEventListener('click', () => {
        const opt = elList.selectedOptions[0];
        if (!opt) return;
        send('remove', { id: opt.value });
    });

    // 現在表示クリア
    q('#clearCur').addEventListener('click', () => send('clear-current'));

    // 全消去
    q('#clearRoster').addEventListener('click', () => send('clear-roster'));

    // 表示更新：リスト
    roster.on('change', (list = []) => {
        elList.innerHTML = '';
        list.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = `ID:${p.id} / ${p.robot}`;
            elList.appendChild(opt);
        });
        elCount.textContent = String(list.length);
    });

    // 表示更新：現在表示
    current.on('change', (p) => {
        elCur.textContent = p ? `ID:${p.id} / ${p.robot}` : '（なし）';
    });
})();
