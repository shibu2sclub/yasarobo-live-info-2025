// currentPlayer を購読して live-main に平文表示
(function () {
    const cur = nodecg.Replicant('currentPlayer');
    cur.on('change', (p) => {
        const el = document.getElementById('playerId');
        const el2 = document.getElementById('robotName');
        if (!el) return;
        if (!p) {
            el.textContent = '—';
            el2.textContent = '—';
        } else {
            el.textContent = `${p.id}`;
            el2.textContent = `${p.robot}`;
        }
    });
})();
