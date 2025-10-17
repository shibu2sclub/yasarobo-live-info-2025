'use strict';

/**
 * Timer state shared via Replicant.
 * We publish only state (start time, accumulated, running, mode, target).
 * Graphics compute display locally at 0.01s precision.
 */
module.exports = (nodecg) => {
    /** @typedef {'countup'|'countdown'} Mode */

    /** @type {import('nodecg/types/replicant').Replicant<{
     *  mode: Mode,
     *  running: boolean,
     *  startEpochMs: number,
     *  accumulatedMs: number,
     *  targetMs?: number,
     *  speed: number,
     *  rev: number
     * }>} */
    const timerState = nodecg.Replicant('timerState', {
        persistent: false,
        defaultValue: {
            mode: 'countup',
            running: false,
            startEpochMs: 0,
            accumulatedMs: 0,
            targetMs: undefined,
            speed: 1,
            rev: 0
        }
    });

    function now() { return Date.now(); }

    function elapsedMs(s, n) {
        return s.accumulatedMs + (s.running ? (n - s.startEpochMs) * (s.speed ?? 1) : 0);
    }

    // Messages from dashboard (or elsewhere)
    nodecg.listenFor('timer-control', (msg) => {
        const s = timerState.value;
        const t = now();

        switch (msg.action) {
            case 'start': {
                const mode = msg.mode === 'countdown' ? 'countdown' : 'countup';
                const targetMs = typeof msg.targetMs === 'number' ? Math.max(0, Math.floor(msg.targetMs)) : undefined;
                timerState.value = {
                    mode,
                    running: true,
                    startEpochMs: t,
                    accumulatedMs: 0,
                    targetMs,
                    speed: 1,
                    rev: s.rev + 1
                };
                break;
            }
            case 'pause': {
                if (!s.running) return;
                const acc = elapsedMs(s, t);
                timerState.value = { ...s, running: false, accumulatedMs: acc, rev: s.rev + 1 };
                break;
            }
            case 'resume': {
                if (s.running) return;
                timerState.value = { ...s, running: true, startEpochMs: t, rev: s.rev + 1 };
                break;
            }
            case 'reset': {
                timerState.value = {
                    mode: s.mode,
                    running: false,
                    startEpochMs: 0,
                    accumulatedMs: 0,
                    targetMs: s.targetMs,
                    speed: 1,
                    rev: s.rev + 1
                };
                break;
            }
            case 'set-mode': {
                const mode = msg.mode === 'countdown' ? 'countdown' : 'countup';
                timerState.value = { ...s, mode, rev: s.rev + 1 };
                break;
            }
            case 'set-target': {
                const targetMs = Math.max(0, Math.floor(msg.targetMs || 0));
                timerState.value = { ...s, targetMs, rev: s.rev + 1 };
                break;
            }
            case 'set-speed': {
                const speed = Number.isFinite(msg.speed) ? Number(msg.speed) : 1;
                timerState.value = { ...s, speed, rev: s.rev + 1 };
                break;
            }
            default:
                break;
        }
    });

    // Optional: light heartbeat while running (recalibration for graphics).
    // This avoids 100Hz replicant spam; ~2s毎に stateを触る程度。
    setInterval(() => {
        const s = timerState.value;
        if (!s.running) return;
        // Touch rev only; values are derived on graphics anyway.
        timerState.value = { ...s, rev: s.rev + 1 };
    }, 2000);

    nodecg.log.info('[yasarobo-timer] extension loaded');
};
