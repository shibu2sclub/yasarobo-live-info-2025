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

    function send(action, extra) {
        nodecg.sendMessage('point-control', { action, ...extra });
    }

    // ボタン群
    $('[data-act="red-correct"]')[0].addEventListener('click', () => send('add-color', { color: 'red', ok: true }));
    $('[data-act="red-wrong"]')[0].addEventListener('click', () => send('add-color', { color: 'red', ok: false }));
    $('[data-act="yellow-correct"]')[0].addEventListener('click', () => send('add-color', { color: 'yellow', ok: true }));
    $('[data-act="yellow-wrong"]')[0].addEventListener('click', () => send('add-color', { color: 'yellow', ok: false }));
    $('[data-act="blue-correct"]')[0].addEventListener('click', () => send('add-color', { color: 'blue', ok: true }));
    $('[data-act="blue-wrong"]')[0].addEventListener('click', () => send('add-color', { color: 'blue', ok: false }));
    $('[data-act="free"]')[0].addEventListener('click', () => send('add-free'));
    q('#reset').addEventListener('click', () => send('reset'));

    // 表示更新
    ps.on('change', (v) => {
        const show = (arr) => `[${(arr || []).map(x => x ? '○' : '×').join(', ')}]`;
        elTotal.textContent = String(v.total || 0);
        elRed.textContent = show(v.red);
        elYellow.textContent = show(v.yellow);
        elBlue.textContent = show(v.blue);
        elFree.textContent = String(v.free || 0);
        elRev.textContent = String(v.rev || 0);
    });
})();
