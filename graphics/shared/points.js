// pointState.total を購読して #points のテキストを更新
(function () {
    const ps = nodecg.Replicant('pointState');

    function $(id) { return document.getElementById(id); }

    ps.on('change', (v) => {
        const el = $('points');
        if (!el) return;
        const total = Number(v?.total || 0);
        el.textContent = `SCORE: ${total}`;
    });
})();
