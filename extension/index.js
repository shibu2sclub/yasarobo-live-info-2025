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

    /**
   * Point 記録
   * - 各色は正誤を boolean 配列で保持（true=色正解=3点 / false=色誤り=1点）
   * - 自由ボールは 5 点、カウントで保持
   * - total は拡張側で都度再計算
   */
    /**
     * @typedef {{
     *   red: boolean[];
     *   yellow: boolean[];
     *   blue: boolean[];
     *   free: number;
     *   total: number;
     *   rev: number;
     * }} PointState
     */

    /** @type {import('nodecg/types/replicant').Replicant<PointState>} */
    const pointState = nodecg.Replicant('pointState', {
        persistent: false,
        defaultValue: {
            red: [],
            yellow: [],
            blue: [],
            free: 0,
            total: 0,
            rev: 0
        }
    });

    function recalcTotal(ps) {
        const scoreColor = (arr) => arr.reduce((acc, ok) => acc + (ok ? 3 : 1), 0);
        return scoreColor(ps.red) + scoreColor(ps.yellow) + scoreColor(ps.blue) + ps.free * 5;
    }

    nodecg.listenFor('point-control', (msg) => {
        const ps = pointState.value;
        switch (msg.action) {
            case 'add-color': {
                // msg.color: 'red'|'yellow'|'blue', msg.ok: boolean
                const color = msg.color;
                const ok = !!msg.ok;
                if (!['red', 'yellow', 'blue'].includes(color)) return;
                ps[color] = Array.isArray(ps[color]) ? ps[color] : [];
                ps[color].push(ok);
                const total = recalcTotal(ps);
                pointState.value = { ...ps, total, rev: ps.rev + 1 };
                break;
            }
            case 'add-free': {
                ps.free = (ps.free || 0) + 1;
                const total = recalcTotal(ps);
                pointState.value = { ...ps, total, rev: ps.rev + 1 };
                break;
            }
            case 'reset': {
                pointState.value = { red: [], yellow: [], blue: [], free: 0, total: 0, rev: ps.rev + 1 };
                break;
            }
            default:
                break;
        }
    });

    // 軽いハートビート（任意）：表示の再同期に使える
    setInterval(() => {
        const ps = pointState.value;
        pointState.value = { ...ps, rev: ps.rev + 1 };
    }, 5000);


    // ── Player Management ───────────────────────────────────────────────
    /**
     * @typedef {{ id: string, robot: string }} PlayerEntry
     * @typedef {{ id: string, robot: string } | null} CurrentPlayer
     */

    // 登録リストは永続
    const playerRoster = nodecg.Replicant('playerRoster', {
        persistent: true,
        defaultValue: /** @type {PlayerEntry[]} */ ([]),
    });

    // 現在表示中は一時（リロードで消える）
    const currentPlayer = nodecg.Replicant('currentPlayer', {
        persistent: false,
        defaultValue: /** @type {CurrentPlayer} */ (null),
    });

    nodecg.listenFor('player-control', (msg) => {
        switch (msg.action) {
            case 'add': {
                // msg.id, msg.robot
                const id = String(msg.id || '').trim();
                const robot = String(msg.robot || '').trim();
                if (!id || !robot) return;
                const list = Array.isArray(playerRoster.value) ? [...playerRoster.value] : [];
                // 同じIDがあれば上書き
                const idx = list.findIndex(p => p.id === id);
                if (idx >= 0) list[idx] = { id, robot };
                else list.push({ id, robot });
                playerRoster.value = list;
                break;
            }
            case 'remove': {
                const id = String(msg.id || '').trim();
                if (!id) return;
                const list = (playerRoster.value || []).filter(p => p.id !== id);
                playerRoster.value = list;
                // 表示中だったら消す
                if (currentPlayer.value?.id === id) currentPlayer.value = null;
                break;
            }
            case 'clear-roster': {
                playerRoster.value = [];
                currentPlayer.value = null;
                break;
            }
            case 'select': {
                // id指定で currentPlayer に反映
                const id = String(msg.id || '').trim();
                const p = (playerRoster.value || []).find(x => x.id === id);
                currentPlayer.value = p ? { id: p.id, robot: p.robot } : null;
                break;
            }
            case 'clear-current': {
                currentPlayer.value = null;
                break;
            }
            default:
                break;
        }
    });

};
