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

        if (short) {
            pill.textContent = short;
            pill.style.backgroundColor = bg;
            pill.style.display = 'inline-block';
            pill.style.color = '#FFFFFF'; // 常に白文字
        } else {
            pill.style.display = 'none';
        }
    }

    rules.on('change', applyRule);
})();
