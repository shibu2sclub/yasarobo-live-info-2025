(function () {
    const vis = nodecg.Replicant('graphicsVisibility');
    const visibleRoot = document.getElementById('visible-root');

    vis.on('change', (v = {}) => {
        const visible = !!v.robotInfo;
        visibleRoot.classList.toggle('active', visible);
        // root.classList.toggle('visible', visible); // ← visibleも使いたかったらこれもON
    });
})();

// currentPlayer を購読して平文表示
(function () {
    const cur = nodecg.Replicant('currentPlayer');
    cur.on('change', (p) => {
        console.log(cur);
        const el = document.getElementById('id');
        const el2 = document.getElementById('robot-name');
        if (!el) return;
        if (!p) {
            el.textContent = '—';
            el2.textContent = '—';
        } else {
            el.textContent = `${p.id}`;
            el2.textContent = `${p.robot}`;
        }
        const el3 = document.getElementById("team-name");
        const el4 = document.getElementById("movement");
        const el5 = document.getElementById("technology");
        const el6 = document.getElementById("power-source");
        const el7 = document.getElementById("comment");

        el3.textContent = `${p.team}`;
        el4.textContent = `${p.movement}`;
        el5.textContent = `${p.tech}`;
        el6.textContent = `${p.power}`;
        el7.textContent = `${p.comment}`;
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
    }

    rules.on('change', applyRule);
})();
