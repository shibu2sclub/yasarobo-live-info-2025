(function () {
    const timerState = nodecg.Replicant('timerState');
    let state = null;
    let lastText = '';
    let lastStatus = '';
    let serverNowAtLastUpdate = 0;
    let perfNowAtLastUpdate = 0;

    timerState.on('change', (newVal) => {
        state = newVal;
        serverNowAtLastUpdate = Date.now();
        perfNowAtLastUpdate = performance.now();
        tick();
    });

    function stageDurationMs(s) {
        return s.stage === 'prep' ? s.prepMs : s.matchMs;
    }

    function computeElapsedMs() {
        if (!state) return 0;
        const localSince = performance.now() - perfNowAtLastUpdate;
        const approxServerNow = serverNowAtLastUpdate + localSince;
        const base = state.accumulatedMs + (state.running ? (approxServerNow - state.startEpochMs) : 0);
        return Math.max(0, base);
    }

    function remainingMs() {
        if (!state) return 0;
        return Math.max(0, stageDurationMs(state) - computeElapsedMs());
    }

    function formatCentiseconds(ms) {
        const cs = Math.floor(ms / 10);
        const m = Math.floor(cs / 6000);
        const s = Math.floor((cs % 6000) / 100);
        const c = cs % 100;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(c).padStart(2, '0')}`;
    }

    function statusText(rem) {
        // ①準備時間、タイマー開始前：ロボット準備待ち
        // ②準備時間、タイマー進行中：ロボット準備
        // ③競技時間前、タイマー開始前（手動遷移のみ）：競技開始待機
        // ④競技時間、タイマー進行中：競　技　中
        // ⑤準備/競技・一時停止：計測停止中
        // ⑥競技タイムアップ：競　技　終　了
        // ⑦その他：------
        if (!state) return '------';
        if (state.ended) return '競　技　終　了';
        if (!state.running) {
            if (state.stage === 'prep') {
                return rem === state.prepMs ? 'ロボット準備待ち' : '計測停止中';
            } else {
                return rem === state.matchMs ? '競技開始待機' : '計測停止中';
            }
        } else {
            if (state.stage === 'prep') return 'ロボット準備';
            if (state.stage === 'match') return '競　技　中';
        }
        return '------';
    }

    function currentDisplay() {
        if (!state) return '00:00.00';
        const rem = remainingMs();
        let formatted = formatCentiseconds(rem);
        // graphics 側のオーバーライド（分の装飾など）
        if (typeof window.timerFormatOverride === 'function') {
            formatted = window.timerFormatOverride(formatted, rem, state);
        }
        return { text: formatted, status: statusText(rem) };
    }

    function tick() {
        const elTimer = document.getElementById('timer');
        const elStatus = document.getElementById('status');
        if (!elTimer) return requestAnimationFrame(tick);

        // レイアウトに合わせてフォントサイズを自動調整
        const wrap = document.querySelector('.timer-wrap');
        if (wrap) {
            const rect = wrap.getBoundingClientRect();
            const fontSize = Math.max(24, Math.min(rect.width / 8, rect.height * 0.7));
            elTimer.style.fontSize = `${fontSize}px`;
        }

        const { text, status } = currentDisplay();
        if (text !== lastText) {
            elTimer.textContent = text;
            lastText = text;
        }
        if (elStatus && status !== lastStatus) {
            elStatus.textContent = status;
            lastStatus = status;
        }
        requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
})();
