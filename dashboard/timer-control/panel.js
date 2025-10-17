(function () {
    const st = nodecg.Replicant('timerState');
    const q = (s) => document.querySelector(s);

    const elStage = q('#stStage');
    const elRunning = q('#stRunning');
    const elRev = q('#stRev');
    const elStatus = q('#stStatus');
    const elDur = q('#stDur');

    const elPrep = q('#prep');
    const elMatch = q('#match');
    const btnToggle = q('#toggleRun');
    const btnReset = q('#reset');
    const btnForce = q('#forceMatch');
    const btnApply = q('#applyDurations');

    function parseMsMMSS(text) {
        const s = String(text || '').trim();
        if (!s) return 0;
        const p = s.split(':');
        if (p.length === 2) {
            const m = parseInt(p[0], 10) || 0;
            const sec = parseInt(p[1], 10) || 0;
            return (m * 60 + sec) * 1000;
        }
        // ss だけでも許容
        const sec = parseInt(s, 10) || 0;
        return sec * 1000;
    }

    function statusText(state, remainingMs) {
        // ①準備時間、タイマー開始前：ロボット準備待ち
        // ②準備時間、タイマー進行中：ロボット準備
        // ③競技時間前、タイマー開始前（手動遷移のみ）：競技開始待機
        // ④競技時間、タイマー進行中：競　技　中
        // ⑤準備/競技・一時停止：計測停止中
        // ⑥競技タイムアップ：競　技　終　了
        // ⑦その他：------
        if (state.ended) return '競　技　終　了';
        if (!state.running) {
            if (state.stage === 'prep') {
                // 初期状態 or 準備で停止
                // 初期状態（残り=prep満タン）を「準備待ち」として扱う
                return remainingMs === state.prepMs ? 'ロボット準備待ち' : '計測停止中';
            } else {
                // stage=match 停止
                // 手動遷移直後は full 残で停止＝競技開始待機
                return remainingMs === state.matchMs ? '競技開始待機' : '計測停止中';
            }
        } else {
            // running
            if (state.stage === 'prep') return 'ロボット準備';
            if (state.stage === 'match') return '競　技　中';
        }
        return '------';
    }

    function computeRemainingMs(state) {
        // パネルは server 時刻で概算すればOK（厳密描画は graphics 側が行う）
        const t = Date.now();
        const dur = state.stage === 'prep' ? state.prepMs : state.matchMs;
        const el = state.accumulatedMs + (state.running ? (t - state.startEpochMs) : 0);
        return Math.max(0, dur - el);
    }

    st.on('change', v => {
        const rem = computeRemainingMs(v);

        elStage.textContent = v.stage;
        elRunning.textContent = String(!!v.running);
        elRev.textContent = String(v.rev);
        elStatus.textContent = statusText(v, rem);
        elDur.textContent = `${v.prepMs} / ${v.matchMs}`;

        // トグルボタンの文言
        btnToggle.textContent = v.running ? 'Pause' : 'Start / Resume';
    });

    function send(action, extra) {
        nodecg.sendMessage('timer-control', { action, ...extra });
    }

    btnToggle.addEventListener('click', () => send('toggle-run'));
    btnReset.addEventListener('click', () => send('reset'));
    btnForce.addEventListener('click', () => send('force-to-match'));
    btnApply.addEventListener('click', () => {
        const prepMs = parseMsMMSS(elPrep.value);
        const matchMs = parseMsMMSS(elMatch.value);
        send('set-durations', { prepMs, matchMs });
    });
    document.querySelector('#resetToPrep').addEventListener('click', () => send('reset-to-prep'));
})();
