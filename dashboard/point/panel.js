(function () {
    const ps = nodecg.Replicant('pointState');

    const q = (s) => document.querySelector(s);
    const $ = (sel) => Array.from(document.querySelectorAll(sel));

    const elTotal = q('#stTotal');
    const elRed = q('#stRed');
    const elYellow = q('#stYellow');
    const elBlue = q('#stBlue');
    const elFree = q('#stFree');
    const elRev = q('#stRev');

    // ★ 追加: 上限表示用
    const capRed = q('#capRed');
    const capYellow = q('#capYellow');
    const capBlue = q('#capBlue');

    function send(action, extra) {
        nodecg.sendMessage('point-control', { action, ...extra });
    }

    // ボタン群
    const btnRedOk = $('[data-act="red-correct"]')[0];
    const btnRedNg = $('[data-act="red-wrong"]')[0];
    const btnYelOk = $('[data-act="yellow-correct"]')[0];
    const btnYelNg = $('[data-act="yellow-wrong"]')[0];
    const btnBluOk = $('[data-act="blue-correct"]')[0];
    const btnBluNg = $('[data-act="blue-wrong"]')[0];
    const btnFree = $('[data-act="free"]')[0];
    const btnReset = q('#reset');

    btnRedOk.addEventListener('click', () => send('add-color', { color: 'red', ok: true }));
    btnRedNg.addEventListener('click', () => send('add-color', { color: 'red', ok: false }));
    btnYelOk.addEventListener('click', () => send('add-color', { color: 'yellow', ok: true }));
    btnYelNg.addEventListener('click', () => send('add-color', { color: 'yellow', ok: false }));
    btnBluOk.addEventListener('click', () => send('add-color', { color: 'blue', ok: true }));
    btnBluNg.addEventListener('click', () => send('add-color', { color: 'blue', ok: false }));
    btnFree.addEventListener('click', () => send('add-free'));
    btnReset.addEventListener('click', () => send('reset'));

    // 表示更新
    ps.on('change', (v) => {
        const show = (arr) => `[${(arr || []).map(x => x ? '○' : '×').join(', ')}]`;
        const redCount = (v.red || []).length;
        const yellowCount = (v.yellow || []).length;
        const blueCount = (v.blue || []).length;

        elTotal.textContent = String(v.total || 0);
        elRed.textContent = show(v.red);
        elYellow.textContent = show(v.yellow);
        elBlue.textContent = show(v.blue);
        elFree.textContent = String(v.free || 0);
        elRev.textContent = String(v.rev || 0);

        // ★ 追加: 上限表示（5球）
        const CAP = 5;
        capRed.textContent = `${redCount} / ${CAP}`;
        capYellow.textContent = `${yellowCount} / ${CAP}`;
        capBlue.textContent = `${blueCount} / ${CAP}`;

        // ★ 追加: 視覚的フィードバック（上限到達でボタンを無効化）
        const redFull = redCount >= CAP;
        const yellowFull = yellowCount >= CAP;
        const blueFull = blueCount >= CAP;

        btnRedOk.disabled = btnRedNg.disabled = redFull;
        btnYelOk.disabled = btnYelNg.disabled = yellowFull;
        btnBluOk.disabled = btnBluNg.disabled = blueFull;
    });
})();
