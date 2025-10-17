
/**
    * Shared timer renderer:
    * - Subscribes to Replicant('timerState')
    * - Renders at centisecond precision (0.01s) using requestAnimationFrame
    * - DOM update only when centiseconds change
    */
(() => {
    const timerState = nodecg.Replicant('timerState');

    let state = null;
    let lastCentis = -1;
    let serverNowAtLastUpdate = 0;
    let perfNowAtLastUpdate = 0;

    timerState.on('change', (newVal) => {
        state = newVal;
        serverNowAtLastUpdate = Date.now();
        perfNowAtLastUpdate = performance.now();
        // Force immediate paint
        tick();
    });

    function computeElapsedMs() {
        if (!state) return 0;
        const localSince = performance.now() - perfNowAtLastUpdate;
        const approxServerNow = serverNowAtLastUpdate + localSince;
        const base = state.accumulatedMs + (state.running ? (approxServerNow - state.startEpochMs) * (state.speed ?? 1) : 0);
        return Math.max(0, base);
    }

    function formatCentiseconds(ms) {
        const cs = Math.floor(ms / 10);
        const m = Math.floor(cs / 6000);
        const s = Math.floor((cs % 6000) / 100);
        const c = cs % 100;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(c).padStart(2, '0')}`;
    }

    function currentDisplay() {
        if (!state) return '00:00.00';
        const ms = computeElapsedMs();
        if (state.mode === 'countdown') {
            const tgt = Math.max(0, state.targetMs || 0);
            const remain = Math.max(0, tgt - ms);
            return formatCentiseconds(remain);
        } else {
            return formatCentiseconds(ms);
        }
    }

    function tick() {
        const el = document.getElementById('timer');
        if (!el) return requestAnimationFrame(tick);

        // Center sizing — responsive font size based on container
        const wrap = document.querySelector('.timer-wrap');
        if (wrap) {
            const rect = wrap.getBoundingClientRect();
            // Heuristic: width-driven; 8 chars like "00:00.00"
            const fontSize = Math.max(24, Math.min(rect.width / 8, rect.height * 0.7));
            el.style.fontSize = `${fontSize}px`;
        }

        const disp = currentDisplay();
        // Only update DOM when centiseconds change
        const cs = disp.slice(-2); // "xx:yy.zz" → "zz"
        if (cs !== String(lastCentis).padStart(2, '0')) {
            el.textContent = disp;
            lastCentis = Number(cs);
        }
        requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
})();
