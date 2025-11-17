const graphicsList = [
    {
        "name": 'live-main',
        "id": 'liveMain'
    },
    {
        "name": 'ranking-board',
        "id": 'rankingBoard'
    },
    {
        "name": 'point-detail',
        "id": 'pointDetail'
    }
]

document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('graphics-container');
    graphicsList.forEach((elem) => {
        const el = document.createElement('div');
        el.innerHTML = `
        <div class="row" data-id="${elem.id}">
            <div class="label">${elem.name}</div>
            <div class="status" id="st-${elem.id}">hidden</div>
            <button data-action="show" data-target="${elem.id}">表示</button>
            <button class="secondary" data-action="hide" data-target="${elem.id}">非表示</button>
        </div>
        `;
        container.appendChild(el);
    });
});

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
        graphicsList.forEach((elem) => {
            updateRow(elem.id, v[elem.id]);
        });
    });

    function updateRow(id, visible) {
        const st = q(`#st-${id}`);
        if (!st) return;
        st.textContent = visible ? 'visible' : 'hidden';
        st.classList.toggle('visible', visible);
    }
})();
