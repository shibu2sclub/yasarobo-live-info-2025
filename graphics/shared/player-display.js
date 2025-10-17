// currentPlayer を購読して live-main に平文表示
(function () {
    const cur = nodecg.Replicant('currentPlayer');
    cur.on('change', (p) => {
        const el = document.getElementById('player');
        if (!el) return;
        if (!p) {
            el.textContent = 'ID: — | ROBOT: —';
        } else {
            el.textContent = `ID: ${p.id} | ROBOT: ${p.robot}`;
        }
    });
})();
