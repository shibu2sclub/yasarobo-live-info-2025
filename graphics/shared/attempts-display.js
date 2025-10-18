// live-main に 1回目・2回目・ベストを表示（平文）
(function () {
    const current = nodecg.Replicant('currentPlayer');
    const attempts = nodecg.Replicant('attemptsStore');

    function $(id) { return document.getElementById(id); }

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

        const el1 = $('attempt1');
        const el2 = $('attempt2');
        const elB = $('bestLine');
        if (!el1 || !el2 || !elB) return;

        if (!p || !p.id) {
            el1.textContent = 'ATTEMPT 1: —';
            el2.textContent = 'ATTEMPT 2: —';
            elB.textContent = 'BEST: —';
            return;
        }

        const rec = store.byPlayer?.[p.id] || null;
        const a1 = rec?.attempt1 || null;
        const a2 = rec?.attempt2 || null;
        const b = rec?.best || null;

        el1.textContent = a1 ? `ATTEMPT 1: ${a1.total}点 / 残 ${fmtMs(a1.matchRemainingMs)}` : 'ATTEMPT 1: —';
        el2.textContent = a2 ? `ATTEMPT 2: ${a2.total}点 / 残 ${fmtMs(a2.matchRemainingMs)}` : 'ATTEMPT 2: —';
        elB.textContent = b ? `BEST: ${b.total}点 / 残 ${fmtMs(b.matchRemainingMs)}（${b.from === 1 ? '1回目' : '2回目'}）` : 'BEST: —';
    }

    current.on('change', render);
    attempts.on('change', render);
})();
