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

    // ★ HTML出力対応
    function formatCentiseconds(ms) {
        const cs = Math.floor(ms / 10);
        const m = Math.floor(cs / 6000);
        const s = Math.floor((cs % 6000) / 100);
        const c = cs % 100;
        // 秒とセンチ秒の間にスペース、センチ秒を小さく
        return `<span><span class = "timer-min">${String(m)}</span>:<span class = "timer-sec">${String(s).padStart(2, '0')}</span></span><span class = "timer-ms"> ${String(c).padStart(2, '0')}</span>`;
    }

    function statusText(rem) {
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
        if (!state) return { html: '0:00<span> 00</span>', status: '------' };
        const rem = remainingMs();
        let formatted = formatCentiseconds(rem);
        if (typeof window.timerFormatOverride === 'function') {
            formatted = window.timerFormatOverride(formatted, rem, state);
        }
        return { html: formatted, status: statusText(rem) };
    }

    function tick() {
        const elTimer = document.getElementById('timer');
        const elStatus = document.getElementById('status');
        if (!elTimer) return requestAnimationFrame(tick);

        const wrap = document.querySelector('.timer-wrap');
        if (wrap) {
            const rect = wrap.getBoundingClientRect();
            const fontSize = Math.max(24, Math.min(rect.width / 8, rect.height * 0.7));
            elTimer.style.fontSize = `${fontSize}px`;
        }

        const { html, status } = currentDisplay();
        if (html !== lastText) {
            elTimer.innerHTML = html; // ← textContent → innerHTML に変更
            lastText = html;
        }
        if (elStatus && status !== lastStatus) {
            elStatus.textContent = status;
            lastStatus = status;
        }
        requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
})();
