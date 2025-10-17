// 合計点をシンプルに平文表示（live-main でのみ使用）
(function () {
    const pointState = nodecg.Replicant('pointState');
    const el = () => document.getElementById('points');

    pointState.on('change', (v) => {
        if (!el()) return;
        const total = v?.total ?? 0;
        document.getElementById('points').textContent = `SCORE: ${total}`;
    });
})();
