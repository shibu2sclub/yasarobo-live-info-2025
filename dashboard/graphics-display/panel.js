// dashboard/graphics-display/panel.js
(function () {
    const vis = nodecg.Replicant('graphicsVisibility');

    const q = (s) => document.querySelector(s);

    // ボタンのクリック → message送信
    document.body.addEventListener('click', (ev) => {
        const btn = ev.target.closest('button[data-action]');
        if (!btn) return;

        const action = btn.dataset.action;
        const target = btn.dataset.target;
        if (!target) return;

        if (action === 'show') {
            nodecg.sendMessage('graphicsVisibility:set', { id: target, visible: true });
        } else if (action === 'hide') {
            nodecg.sendMessage('graphicsVisibility:set', { id: target, visible: false });
        }
    });

    // Replicant反映
    vis.on('change', (v = {}) => {
        updateRow('liveMain', !!v.liveMain);
        updateRow('rankingBoard', !!v.rankingBoard);
    });

    function updateRow(id, visible) {
        const st = q(`#st-${id}`);
        if (!st) return;
        st.textContent = visible ? 'visible' : 'hidden';
        st.classList.toggle('visible', visible);
    }
})();
