(function () {
    const current = nodecg.Replicant('currentPlayer');
    const retry = nodecg.Replicant('retryCount');
    const rules = nodecg.Replicant('rules');

    const q = (s) => document.querySelector(s);
    const elCur = q('#cur');
    const elCount = q('#count');
    const elLimit = q('#limit');
    const elLimit2 = q('#limit2');
    const btnInc = q('#inc');
    const btnReset = q('#reset');

    function getCap(v) {
        const c = Number(v?.retryAttemptsCount ?? 3);
        return Number.isFinite(c) && c >= 0 ? Math.floor(c) : 3;
    }

    btnInc.addEventListener('click', () => nodecg.sendMessage('retry:inc'));
    btnReset.addEventListener('click', () => nodecg.sendMessage('retry:reset'));

    // ★ 初期値でも正しい状態になるよう安全に描画
    function render() {
        const cap = getCap(rules.value);
        const cnt = Number(retry.value?.count ?? 0);
        elCount.textContent = String(cnt);
        elLimit.textContent = String(cap);
        elLimit2.textContent = String(cap);
        btnInc.disabled = cnt >= cap; // ★ ここでグレーアウト（CSSで見た目反映）
    }

    current.on('change', (p) => { elCur.textContent = p ? `ID:${p.id} / ${p.robot}` : '（なし）'; render(); });
    retry.on('change', render);
    rules.on('change', render);

    // 初回
    render();
})();
