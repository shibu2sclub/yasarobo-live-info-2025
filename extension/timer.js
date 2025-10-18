'use strict';

/**
 * ロボコン仕様タイマー：
 * - カウントダウン専用
 * - 2段階（準備→競技）
 * - Start/Resume/Pause は 1 ボタン toggle-run
 * - 準備0→競技へ自動遷移＆自動スタート
 * - 準備中の手動「競技開始」（force-to-match）時は停止状態で待機
 * - 競技0で ended=true にして停止
 * - Reset で準備満タン・停止・stage=prep・ended=false
 * - 準備/競技デフォルト時間は Replicant に保持（set-durations）
 */
module.exports = (nodecg) => {
    /**
     * @typedef {'prep'|'match'} Stage
     * @typedef {{
     *   stage: Stage,
     *   running: boolean,
     *   startEpochMs: number,
     *   accumulatedMs: number,
     *   prepMs: number,
     *   matchMs: number,
     *   ended: boolean,
     *   rev: number
     * }} TimerState
     */

    /** @type {import('nodecg/types/replicant').Replicant<TimerState>} */
    const timerState = nodecg.Replicant('timerState', {
        persistent: false,
        defaultValue: {
            stage: 'prep',
            running: false,
            startEpochMs: 0,
            accumulatedMs: 0,
            prepMs: 2 * 60 * 1000,   // 2min
            matchMs: 5 * 60 * 1000,  // 5min
            ended: false,
            rev: 0
        }
    });

    const now = () => Date.now();
    const stageDurationMs = (s) => (s.stage === 'prep' ? s.prepMs : s.matchMs);
    const elapsedMs = (s, t) => s.accumulatedMs + (s.running ? (t - s.startEpochMs) : 0);
    const remainingMs = (s, t) => Math.max(0, stageDurationMs(s) - elapsedMs(s, t));

    nodecg.listenFor('timer-control', (msg) => {
        const t = now();
        const s = timerState.value;

        switch (msg.action) {
            case 'toggle-run': {
                if (s.ended) return;
                if (s.running) {
                    // Pause
                    const acc = elapsedMs(s, t);
                    timerState.value = { ...s, running: false, accumulatedMs: acc, rev: s.rev + 1 };
                } else {
                    // Start/Resume（残り0は起動しない）
                    if (remainingMs(s, t) <= 0) return;
                    timerState.value = { ...s, running: true, startEpochMs: t, rev: s.rev + 1 };
                }
                break;
            }

            case 'reset': {
                timerState.value = {
                    ...s,
                    stage: 'prep',
                    running: false,
                    startEpochMs: 0,
                    accumulatedMs: 0,
                    ended: false,
                    rev: s.rev + 1
                };
                break;
            }

            case 'force-to-match': {
                // 準備中に手動で競技へ：停止状態で待機（残=full）
                timerState.value = {
                    ...s,
                    stage: 'match',
                    running: false,
                    startEpochMs: 0,
                    accumulatedMs: 0,
                    ended: false,
                    rev: s.rev + 1
                };
                break;
            }

            case 'set-durations': {
                const prepMs = Math.max(0, Number(msg.prepMs ?? s.prepMs));
                const matchMs = Math.max(0, Number(msg.matchMs ?? s.matchMs));
                timerState.value = { ...s, prepMs, matchMs, rev: s.rev + 1 };
                break;
            }

            default:
                break;
        }
    });

    // 自動遷移＆タイムアップ監視（十分低頻度でOK）
    setInterval(() => {
        const t = now();
        const s = timerState.value;
        if (!s.running) return;

        const rem = remainingMs(s, t);
        if (s.stage === 'prep') {
            if (rem <= 0) {
                // 準備 → 競技（自動スタート）
                timerState.value = {
                    ...s,
                    stage: 'match',
                    running: true,
                    startEpochMs: t,
                    accumulatedMs: 0,
                    ended: false,
                    rev: s.rev + 1
                };
            }
        } else {
            // match
            if (rem <= 0) {
                // 競技終了（0固定・停止）
                timerState.value = {
                    ...s,
                    running: false,
                    accumulatedMs: s.matchMs,
                    ended: true,
                    rev: s.rev + 1
                };
            }
        }
    }, 100);

    // 軽いハートビート（描画側再同期用）
    setInterval(() => {
        const s = timerState.value;
        timerState.value = { ...s, rev: s.rev + 1 };
    }, 2000);
};
