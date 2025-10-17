'use strict';

/**
 * ロボコン仕様：
 * - カウントダウン専用
 * - 2段階（準備→競技）
 * - Start/Resume は1ボタンのトグル（動作中なら Pause）
 * - 準備を使い切ると自動で競技に遷移して自動スタート
 * - 準備中に手動で「競技開始」へ遷移可（その場合は一旦停止状態で待機）
 * - 競技が0でタイムアップ → 0で停止
 * - Reset で初期状態（準備満タンで停止表示）
 * - 準備/競技デフォルト時間は Replicant に保持し、Reset で反映
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
     *   ended: boolean, // 競技タイムアップでtrue
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
            prepMs: 2 * 60 * 1000,   // 2分
            matchMs: 5 * 60 * 1000,  // 5分
            ended: false,
            rev: 0
        }
    });

    const now = () => Date.now();

    function stageDurationMs(s) {
        return s.stage === 'prep' ? s.prepMs : s.matchMs;
    }
    function elapsedMs(s, t) {
        return s.accumulatedMs + (s.running ? (t - s.startEpochMs) : 0);
    }
    function remainingMs(s, t) {
        return Math.max(0, stageDurationMs(s) - elapsedMs(s, t));
    }

    // ---- メッセージ受付 ----
    nodecg.listenFor('timer-control', (msg) => {
        const t = now();
        const s = timerState.value;

        switch (msg.action) {
            case 'toggle-run': {
                if (s.ended) return; // タイムアップ後は動かさない
                if (s.running) {
                    // Pause
                    const acc = elapsedMs(s, t);
                    timerState.value = { ...s, running: false, accumulatedMs: acc, rev: s.rev + 1 };
                } else {
                    // Resume/Start
                    // 残り0なら動かさない
                    if (remainingMs(s, t) <= 0) return;
                    timerState.value = { ...s, running: true, startEpochMs: t, rev: s.rev + 1 };
                }
                break;
            }

            case 'reset': {
                // 初期状態：準備満タン、停止、stage=prep、ended=false
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

            // ▼ 追加：reset と同じ挙動（命名で意図を分かりやすく）
            case 'reset-to-prep': {
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
                // 準備中に手動で競技へ。停止状態で待機表示。
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
                // デフォルト時間の設定（反映はReset時でOK）
                const prepMs = Math.max(0, Number(msg.prepMs ?? s.prepMs));
                const matchMs = Math.max(0, Number(msg.matchMs ?? s.matchMs));
                timerState.value = { ...s, prepMs, matchMs, rev: s.rev + 1 };
                break;
            }

            default:
                break;
        }
    });

    // ---- 自動遷移／タイムアップ監視 ----
    // 高頻度は不要だが、秒境界の正確性のため ~100ms 程度で十分
    setInterval(() => {
        const t = now();
        const s = timerState.value;

        if (!s.running) return;
        const rem = remainingMs(s, t);

        if (s.stage === 'prep') {
            if (rem <= 0) {
                // 準備 → 競技へ自動遷移＆自動スタート
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
            // stage === 'match'
            if (rem <= 0) {
                // タイムアップ → 0で停止
                timerState.value = {
                    ...s,
                    running: false,
                    // 競技満了分を accumulated に積む
                    accumulatedMs: s.matchMs,
                    ended: true,
                    rev: s.rev + 1
                };
            }
        }
    }, 100);

    // 軽いハートビート（描画側の再キャリブレーション用）
    setInterval(() => {
        const s = timerState.value;
        timerState.value = { ...s, rev: s.rev + 1 };
    }, 2000);

    nodecg.log.info('[yasarobo-timer] extension loaded (robocon spec)');
};
