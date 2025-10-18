(function () {
    const current = nodecg.Replicant('currentPlayer');
    const attempts = nodecg.Replicant('attemptsStore');

    const q = (s) => document.querySelector(s);
    const curEl = q('#cur');

    const a1Score = q('#a1Score');
    const a1Time = q('#a1Time');
    const a2Score = q('#a2Score');
    const a2Time = q('#a2Time');

    const bestFrom = q('#bestFrom');
    const bestScore = q('#bestScore');
    const bestTime = q('#bestTime');

    function fmtMs(ms) {
        ms = Math.max(0, Math.floor(ms || 0));
        const cs = Math.floor(ms / 10);
        const m = Math.floor(cs / 6000);
        const s = Math.floor((cs % 6000) / 100);
        const c = cs % 100;
        return `${m}:${String(s).padStart(2, '0')}.${String(c).padStart(2, '0')}`;
    }

    function render() {
        const p = current.value;
        const store = attempts.value || { byPlayer: {} };
        curEl.textContent = p ? `ID:${p.id} / ${p.robot}` : '（なし）';

        let rec = null;
        if (p && p.id) rec = store.byPlayer?.[p.id] || null;

        const a1 = rec?.attempt1 || null;
        const a2 = rec?.attempt2 || null;
        const b = rec?.best || null;

        a1Score.textContent = a1 ? `${a1.total}点` : '—';
        a1Time.textContent = a1 ? fmtMs(a1.matchRemainingMs) : '—';
        a2Score.textContent = a2 ? `${a2.total}点` : '—';
        a2Time.textContent = a2 ? fmtMs(a2.matchRemainingMs) : '—';

        bestFrom.textContent = b ? (b.from === 1 ? '1回目' : '2回目') : '—';
        bestScore.textContent = b ? `${b.total}点` : '—';
        bestTime.textContent = b ? fmtMs(b.matchRemainingMs) : '—';
    }

    current.on('change', render);
    attempts.on('change', render);

    // 操作
    q('#save1').addEventListener('click', () => nodecg.sendMessage('results:save-attempt', { which: 1 }));
    q('#save2').addEventListener('click', () => nodecg.sendMessage('results:save-attempt', { which: 2 }));
    q('#reset1').addEventListener('click', () => nodecg.sendMessage('results:reset-attempt', { which: 1 }));
    q('#reset2').addEventListener('click', () => nodecg.sendMessage('results:reset-attempt', { which: 2 }));
    q('#resetBoth').addEventListener('click', () => nodecg.sendMessage('results:reset-both', {}));
})();
