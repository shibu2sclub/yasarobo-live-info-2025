(function () {
    const current = nodecg.Replicant('currentPlayer');
    const retry = nodecg.Replicant('retryCount');

    const q = (s) => document.querySelector(s);
    const elCur = q('#cur');
    const elCount = q('#count');

    q('#inc').addEventListener('click', () => nodecg.sendMessage('retry:inc'));
    q('#reset').addEventListener('click', () => nodecg.sendMessage('retry:reset'));

    current.on('change', (p) => {
        elCur.textContent = p ? `ID:${p.id} / ${p.robot}` : '（なし）';
    });

    retry.on('change', (v) => {
        elCount.textContent = String(v?.count ?? 0);
    });
})();
