(function () {
    const rules = nodecg.Replicant('rules');
    const ps = nodecg.Replicant('pointState');

    const q = (s) => document.querySelector(s);
    const elJson = q('#json');
    const elState = q('#state');

    rules.on('change', (v) => {
        try {
            const obj = v || { items: [], attemptsCount: 2, retryAttemptsCount: 3 };
            if (obj.attemptsCount == null) obj.attemptsCount = 2;
            if (obj.retryAttemptsCount == null) obj.retryAttemptsCount = 3;
            elJson.value = JSON.stringify(obj, null, 2);
            elState.textContent = '最新のルールを読み込み済み';
        } catch { /* ignore */ }
    });

    q('#apply').addEventListener('click', () => {
        try {
            const obj = JSON.parse(elJson.value);
            if (!obj || !Array.isArray(obj.items)) throw new Error('items が配列ではありません');

            const n = Number(obj.attemptsCount ?? 2);
            obj.attemptsCount = (Number.isFinite(n) && n >= 1) ? Math.floor(n) : 2;

            const r = Number(obj.retryAttemptsCount ?? 3);
            obj.retryAttemptsCount = (Number.isFinite(r) && r >= 0) ? Math.floor(r) : 3;

            for (const it of obj.items) {
                if (!it.key) throw new Error('item に key が必要です');
                it.pointsCorrect = Number(it.pointsCorrect || 0);
                it.pointsWrong = Number(it.pointsWrong || 0);
                it.cap = Number(it.cap || 0);
            }
            rules.value = obj;
            elState.textContent = '適用しました';
        } catch (e) {
            console.error(e);
            elState.textContent = 'JSONエラー: ' + (e?.message || e);
        }
    });

    q('#resetPoints').addEventListener('click', () => {
        const st = ps.value || { entries: {}, total: 0, rev: 0 };
        ps.value = { entries: {}, total: 0, rev: (st.rev || 0) + 1 };
        elState.textContent = '現在の得点をリセットしました';
    });
})();
