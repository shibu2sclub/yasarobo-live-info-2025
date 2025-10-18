(function () {
    const ps = nodecg.Replicant('pointState');

    const q = (s) => document.querySelector(s);
    const $ = (sel) => Array.from(document.querySelectorAll(sel));

    // ステータス表示要素
    const elTotal = q('#stTotal');
    const elRed = q('#stRed');
    const elYellow = q('#stYellow');
    const elBlue = q('#stBlue');
    const elFree = q('#stFree');
    const elRev = q('#stRev');

    // 上限表示
    const capRed = q('#capRed');
    const capYellow = q('#capYellow');
    const capBlue = q('#capBlue');

    // ボタン
    const btnRedOk = $('[data-act="red-correct"]')[0];
    const btnRedNg = $('[data-act="red-wrong"]')[0];
    const btnYOk = $('[data-act="yellow-correct"]')[0];
    const btnYNg = $('[data-act="yellow-wrong"]')[0];
    const btnBOk = $('[data-act="blue-correct"]')[0];
    const btnBNg = $('[data-act="blue-wrong"]')[0];
    const btnFree = $('[data-act="free"]')[0];
    const btnReset = q('#reset');

    function send(action, extra) {
        nodecg.sendMessage('point-control', { action, ...extra });
    }

    // クリックイベント
    btnRedOk.addEventListener('click', () => send('add-color', { color: 'red', ok: true }));
    btnRedNg.addEventListener('click', () => send('add-color', { color: 'red', ok: false }));
    btnYOk.addEventListener('click', () => send('add-color', { color: 'yellow', ok: true }));
    btnYNg.addEventListener('click', () => send('add-color', { color: 'yellow', ok: false }));
    btnBOk.addEventListener('click', () => send('add-color', { color: 'blue', ok: true }));
    btnBNg.addEventListener('click', () => send('add-color', { color: 'blue', ok: false }));
    btnFree.addEventListener('click', () => send('add-free'));
    btnReset.addEventListener('click', () => send('reset'));

    // 表示更新
    ps.on('change', (v) => {
        const show = (arr) => `[${(arr || []).map(x => x ? '○' : '×').join(', ')}]`;

        const redCount = (v.red || []).length;
        const yellowCount = (v.yellow || []).length;
        const blueCount = (v.blue || []).length;
        const freeCount = Number(v.free || 0);

        elTotal.textContent = String(v.total || 0);
        elRed.textContent = show(v.red);
        elYellow.textContent = show(v.yellow);
        elBlue.textContent = show(v.blue);
        elFree.textContent = String(freeCount);
        elRev.textContent = String(v.rev || 0);

        // 上限表示（色は5）＋ ボタン有効/無効
        const COLOR_CAP = 5;
        capRed.textContent = `${redCount} / ${COLOR_CAP}`;
        capYellow.textContent = `${yellowCount} / ${COLOR_CAP}`;
        capBlue.textContent = `${blueCount} / ${COLOR_CAP}`;

        const redFull = redCount >= COLOR_CAP;
        const yellowFull = yellowCount >= COLOR_CAP;
        const blueFull = blueCount >= COLOR_CAP;

        btnRedOk.disabled = btnRedNg.disabled = redFull;
        btnYOk.disabled = btnYNg.disabled = yellowFull;
        btnBOk.disabled = btnBNg.disabled = blueFull;

        // ★ 自由ボールは1回のみ
        btnFree.disabled = freeCount >= 1;
    });
})();
