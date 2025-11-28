(function () {
    const vis = nodecg.Replicant('graphicsVisibility');
    const visibleRoot = document.getElementById('visible-root');

    vis.on('change', (v = {}) => {
        const visible = !!v.liveMain;
        visibleRoot.classList.toggle('active', visible);
        // root.classList.toggle('visible', visible); // ← visibleも使いたかったらこれもON
    });
})();
// currentPlayer を購読して live-main に平文表示
(function () {
    const cur = nodecg.Replicant('currentPlayer');
    cur.on('change', (p) => {
        const el = document.getElementById('playerId');
        const el2 = document.getElementById('robotName');
        if (!el) return;
        if (!p) {
            el.textContent = '—';
            el2.textContent = '—';
        } else {
            el.textContent = `${p.id}`;
            el2.textContent = `${p.robot}`;
        }
    });
})();

// ルール名（英語略称）をテーマカラー背景・白文字で表示
(function () {
    const rules = nodecg.Replicant('rules');

    function $(id) { return document.getElementById(id); }

    function applyRule(v) {
        const pill = $('rulePill');
        if (!pill) return;
        const short = (v?.nameGraphicsShortEn || v?.nameGraphics || v?.nameDashboard || '').trim();
        const color = (v?.themeColor || '#AF1E21').toUpperCase();
        // #RRGGBB でなければデフォルトにフォールバック
        const bg = /^#([0-9A-F]{6})$/i.test(color) ? color : '#AF1E21';
        pill.style.color = '#FFFFFF'; // 常に白文字

        if (short) {
            pill.textContent = short;
            pill.style.backgroundColor = bg;
        } else {
            pill.style.display = 'none';
        }


        const maxEl = document.getElementById('max-points');
        let max = 0;
        console.log(v?.maxPoints);
        if (v?.maxPoints != undefined) {
            max = Number(v?.maxPoints || 0);
        }
        else {
            const rules = nodecg.Replicant('rules');
            for (const r of (rules.value?.items || [])) {
                if (typeof r.cap === 'number' && r.cap > 0) {
                    const pc = typeof r.pointsCorrect === 'number' ? r.pointsCorrect : 0;
                    max += pc * r.cap;
                }
            }
        }
        maxEl.textContent = `${max}`;
    }

    rules.on('change', applyRule);
})();


// pointState.total を購読して #points のテキストを更新
(function () {
    const ps = nodecg.Replicant('pointState');

    ps.on('change', (v, pv) => {
        if (v?.total != pv?.total) {
            const total = Number(v?.total || 0);

            const newPointDiv = document.createElement("div");
            newPointDiv.textContent = `${total}`;
            showNextDom(document.getElementById("points"), newPointDiv);
        }
    });
})();


// retryCount を購読して、live-main と onsite-timer の表示を更新する。
// - live-main: #retryLive に "RETRY: n" 表示（要素があれば）
// - onsite-timer: #retry の innerText を n にする（要素があれば）
(function () {
    const retry = nodecg.Replicant('retryCount');

    function $(id) { return document.getElementById(id); }

    function render(v) {
        const n = v?.count ?? 0;

        const newRetryDiv = document.createElement("div");
        newRetryDiv.textContent = `${n}`;
        showNextDom(document.getElementById("retryLive"), newRetryDiv);
    }

    retry.on('change', render);
})();
