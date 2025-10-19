// live-main に 試技N回 + ベスト を表示（平文）
(function () {
    const rules = nodecg.Replicant('rules');
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

    let ac = 2;

    function rebuild() {
        const wrap = $('attemptsWrap');
        if (!wrap) return;
        wrap.innerHTML = '';
        for (let i = 1; i <= ac; i++) {
            const div = document.createElement('div');
            div.id = `attempt${i}`;
            div.textContent = `ATTEMPT ${i}: —`;
            wrap.appendChild(div);
        }
        const best = document.createElement('div');
        best.id = 'bestLine';
        best.textContent = 'BEST: —';
        wrap.appendChild(best);
        render();
    }

    function render() {
        const p = current.value;
        const st = attempts.value || { byPlayer: {} };
        const rec = p?.id ? (st.byPlayer?.[p.id] || null) : null;
        for (let i = 1; i <= ac; i++) {
            const el = $(`attempt${i}`);
            if (!el) continue;
            const e = rec?.attempts?.[i - 1] || null;
            el.textContent = e ? `ATTEMPT ${i}: ${e.total}点 / 残 ${fmtMs(e.matchRemainingMs)}` : `ATTEMPT ${i}: —`;
        }
        const bl = $('bestLine');
        const b = rec?.best || null;
        if (bl) bl.textContent = b ? `BEST: ${b.total}点 / 残 ${fmtMs(b.matchRemainingMs)}（${b.from}回目）` : 'BEST: —';
    }

    rules.on('change', (v) => {
        const n = Number(v?.attemptsCount ?? 2);
        const next = Number.isFinite(n) && n >= 1 ? Math.floor(n) : 2;
        if (next !== ac) { ac = next; rebuild(); } else { render(); }
    });

    current.on('change', render);
    attempts.on('change', render);

    // 初期
    rebuild();
})();
