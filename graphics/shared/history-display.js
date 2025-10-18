// 選手の最後に保存したスコア＆時間を簡易表示（live-main 用）
(function () {
    const current = nodecg.Replicant('currentPlayer');   // {id, robot} | null
    const store = nodecg.Replicant('resultsStore');    // {byPlayer:{[id]:ResultEntry[]}, rev}

    let curId = null;
    let cache = null;

    function $(id) { return document.getElementById(id); }

    function formatMsToMSScc(ms) {
        ms = Math.max(0, Math.floor(ms));
        const cs = Math.floor(ms / 10);
        const m = Math.floor(cs / 6000);
        const s = Math.floor((cs % 6000) / 100);
        const c = cs % 100;
        return `${m}:${String(s).padStart(2, '0')}.${String(c).padStart(2, '0')}`;
    }

    function render() {
        const el = $('lastResult');
        if (!el || !cache) return;

        const list = cache.byPlayer?.[curId] || [];
        if (!curId || list.length === 0) {
            el.textContent = 'LAST: —';
            return;
        }
        const last = list[list.length - 1];

        // 表示例：LAST: 36点 / 準備残 0:00.00 / 競技残 0:00.00（タイムアップ）
        const total = Number(last.total ?? 0);
        const prep = formatMsToMSScc(last.prepRemainingMs ?? 0);
        const match = formatMsToMSScc(last.matchRemainingMs ?? 0);

        el.textContent = `LAST: ${total}点 / 準備残 ${prep} / 競技残 ${match}`;
    }

    current.on('change', (p) => {
        curId = p?.id || null;
        render();
    });

    store.on('change', (v) => {
        cache = v || { byPlayer: {} };
        render();
    });
})();
