(function () {
    const timerState = nodecg.Replicant('timerState');
    let state = null;
    let lastText = '';
    let serverNowAtLastUpdate = 0;
    let perfNowAtLastUpdate = 0;

    timerState.on('change', (newVal) => {
        state = newVal;
        serverNowAtLastUpdate = Date.now();
        perfNowAtLastUpdate = performance.now();
        tick();
    });

    function computeElapsedMs() {
        if (!state) return 0;
        const localSince = performance.now() - perfNowAtLastUpdate;
        const approxServerNow = serverNowAtLastUpdate + localSince;
        const base = state.accumulatedMs + (state.running ? (approxServerNow - state.startEpochMs) * (state.speed ?? 1) : 0);
        return Math.max(0, base);
    }

    function defaultFormat(ms) {
        const cs = Math.floor(ms / 10);
        const m = Math.floor(cs / 6000);
        const s = Math.floor((cs % 6000) / 100);
        const c = cs % 100;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(c).padStart(2, '0')}`;
    }

    function currentDisplay() {
        if (!state) return '00:00.00';
        const ms = computeElapsedMs();
        let formatted = '';
        if (state.mode === 'countdown') {
            const tgt = Math.max(0, state.targetMs || 0);
            const remain = Math.max(0, tgt - ms);
            formatted = defaultFormat(remain);
        } else {
            formatted = defaultFormat(ms);
        }

        // graphics側が定義していればそれを使う
        if (typeof window.timerFormatOverride === 'function') {
            formatted = window.timerFormatOverride(formatted, ms, state);
        }
        return formatted;
    }

    function tick() {
        const el = document.getElementById('timer');
        if (!el) return requestAnimationFrame(tick);

        const disp = currentDisplay();
        if (disp !== lastText) {
            el.textContent = disp;
            lastText = disp;
        }
        requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
})();
