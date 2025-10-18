// retryCount を購読して、live-main と onsite-timer の表示を更新する。
// - live-main: #retryLive に "RETRY: n" 表示（要素があれば）
// - onsite-timer: #retry の innerText を n にする（要素があれば）
(function () {
    const retry = nodecg.Replicant('retryCount');

    function $(id) { return document.getElementById(id); }

    function render(v) {
        const n = v?.count ?? 0;

        // live-main 側（SCOREの近くに）
        const liveEl = $('retryLive');
        if (liveEl) {
            liveEl.textContent = `RETRY: ${n}`;
        }

        // onsite-timer 側（span#retry の innerText を書き換える）
        const otEl = $('retry');
        if (otEl) {
            otEl.innerText = String(n);
        }
    }

    retry.on('change', render);
})();
