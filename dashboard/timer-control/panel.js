(function () {
    const ncg = nodecg;

    const st = nodecg.Replicant('timerState');
    const q = (s) => document.querySelector(s);

    const elRunning = q('#stRunning');
    const elMode = q('#stMode');
    const elRev = q('#stRev');

    st.on('change', v => {
        elRunning.textContent = String(!!v.running);
        elMode.textContent = v.mode;
        elRev.textContent = String(v.rev);
    });

    function send(action, extra) {
        nodecg.sendMessage('timer-control', { action, ...extra });
    }

    // Parse "mm:ss.cc" → ms
    function parseTarget(str) {
        // accept m:ss.cc / mm:ss / ss.cc / ss
        const s = String(str || '').trim();
        if (!s) return 0;
        const mmss = s.split(':');
        let m = 0, secs = 0, cs = 0;

        if (mmss.length === 2) {
            m = parseInt(mmss[0], 10) || 0;
            const secpart = mmss[1];
            if (secpart.includes('.')) {
                const [ssec, scc = '0'] = secpart.split('.');
                secs = parseInt(ssec, 10) || 0;
                cs = parseInt(scc.padEnd(2, '0').slice(0, 2), 10) || 0;
            } else {
                secs = parseInt(secpart, 10) || 0;
            }
        } else {
            // only seconds or seconds.centiseconds
            if (s.includes('.')) {
                const [ssec, scc = '0'] = s.split('.');
                secs = parseInt(ssec, 10) || 0;
                cs = parseInt(scc.padEnd(2, '0').slice(0, 2), 10) || 0;
            } else {
                secs = parseInt(s, 10) || 0;
            }
        }
        return (m * 60 + secs) * 1000 + cs * 10;
    }

    q('#startUp').addEventListener('click', () => {
        send('start', { mode: 'countup' });
    });

    q('#startDown').addEventListener('click', () => {
        const target = parseTarget(q('#target').value);
        send('start', { mode: 'countdown', targetMs: target });
    });

    q('#applyTarget').addEventListener('click', () => {
        const target = parseTarget(q('#target').value);
        send('set-target', { targetMs: target });
    });

    q('#pause').addEventListener('click', () => send('pause'));
    q('#resume').addEventListener('click', () => send('resume'));
    q('#reset').addEventListener('click', () => send('reset'));

    q('#applyMode').addEventListener('click', () => {
        const v = q('#mode').value;
        send('set-mode', { mode: v });
    });

    q('#applySpeed').addEventListener('click', () => {
        const v = parseFloat(q('#speed').value);
        send('set-speed', { speed: v });
    });
})();
