'use strict';

/**
 * resultsStore（永続）：
 * - byPlayer: { [playerId: string]: ResultEntry[] }
 * - rev: number
 *
 * ResultEntry:
 * {
 *   id: string,                // 一意ID（時刻ベース）
 *   ts: number,                // 保存タイムスタンプ (ms since epoch)
 *   playerId: string,
 *   robot: string,
 *   // 得点内訳と合計
 *   redCorrect: number, redWrong: number,
 *   yellowCorrect: number, yellowWrong: number,
 *   blueCorrect: number, blueWrong: number,
 *   free: number,
 *   total: number,
 *   // 時間情報（競技時間の残りのみを保存）
 *   matchRemainingMs: number,  // 競技時間の残り（prep中に保存した場合は matchMs を保存）
 *   // 保存理由
 *   stageEnded: 'match' | 'manual'
 * }
 */

module.exports = (nodecg) => {
    // 他モジュールの Replicant を購読（読取専用）
    const timerState = nodecg.Replicant('timerState');     // from timer.js
    const pointState = nodecg.Replicant('pointState');     // from points.js
    const current = nodecg.Replicant('currentPlayer');  // from player.js

    /** @type {import('nodecg/types/replicant').Replicant<{byPlayer: Record<string, any[]>, rev: number}>} */
    const resultsStore = nodecg.Replicant('resultsStore', {
        persistent: true,
        defaultValue: { byPlayer: {}, rev: 0 }
    });

    // 内部状態：ended の立ち上がり縁を検出（タイムアップで自動保存）
    let lastEnded = false;

    // 便利関数
    const nowId = () =>
        new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14) + '-' + Date.now();
    const safeArr = (x) => Array.isArray(x) ? x : [];

    function countCorrectWrong(arrBool) {
        const arr = safeArr(arrBool);
        let ok = 0, ng = 0;
        for (const v of arr) (v ? ok++ : ng++);
        return [ok, ng];
    }

    /**
     * 現在の状態から保存用エントリを構築。
     * - 保存する時間は「競技時間の残り時間」のみ。
     *   - stage === 'match' のとき：matchMs - 経過
     *   - stage === 'prep' のとき：matchMs（フル）
     */
    function buildEntry(stageEnded = 'match') {
        const p = current.value;
        if (!p || !p.id) return null;

        // 得点
        const [rOK, rNG] = countCorrectWrong(pointState.value?.red);
        const [yOK, yNG] = countCorrectWrong(pointState.value?.yellow);
        const [bOK, bNG] = countCorrectWrong(pointState.value?.blue);
        const free = Number(pointState.value?.free || 0);
        const total = Number(pointState.value?.total || 0);

        // 時間（競技の残りのみ）
        const s = timerState.value || {};
        const matchMs = Number.isFinite(s.matchMs) ? s.matchMs : 0;

        let matchRemainingMs = matchMs;
        if (s.stage === 'match') {
            const t = Date.now();
            const elapsed = (s.accumulatedMs || 0) + (s.running ? (t - (s.startEpochMs || 0)) : 0);
            matchRemainingMs = Math.max(0, matchMs - elapsed);
        } else if (s.stage === 'prep') {
            matchRemainingMs = Math.max(0, matchMs);
        }

        const entry = {
            id: nowId(),
            ts: Date.now(),
            playerId: p.id,
            robot: p.robot,
            redCorrect: rOK, redWrong: rNG,
            yellowCorrect: yOK, yellowWrong: yNG,
            blueCorrect: bOK, blueWrong: bNG,
            free,
            total,
            matchRemainingMs,
            stageEnded
        };
        return entry;
    }

    function appendResult(entry) {
        if (!entry) return;
        const store = resultsStore.value || { byPlayer: {}, rev: 0 };
        const arr = store.byPlayer[entry.playerId] || [];
        arr.push(entry);
        store.byPlayer[entry.playerId] = arr;
        resultsStore.value = { ...store, rev: (store.rev || 0) + 1 };
    }

    // ① 自動保存：競技終了（ended false→true）で保存
    timerState.on('change', (s) => {
        const ended = !!s?.ended;
        if (!lastEnded && ended) {
            const entry = buildEntry('match');
            appendResult(entry);
            nodecg.log.info(
                `[results] auto-saved (player=${entry?.playerId ?? '(none)'} total=${entry?.total ?? '?'}, matchRem=${entry?.matchRemainingMs ?? '?'})`
            );
        }
        lastEnded = ended;
    });

    // ② 手動保存（任意）：dashboardから明示保存
    nodecg.listenFor('results:save-current', (msg) => {
        const entry = buildEntry(msg?.reason === 'manual' ? 'manual' : 'match');
        appendResult(entry);
        nodecg.log.info(
            `[results] manual-saved (player=${entry?.playerId ?? '(none)'} total=${entry?.total ?? '?'}, matchRem=${entry?.matchRemainingMs ?? '?'})`
        );
    });

    // ③ 過去結果の削除/Undo（任意）
    nodecg.listenFor('results:undo-last', (msg) => {
        const playerId = String(msg?.playerId || current.value?.id || '').trim();
        if (!playerId) return;
        const store = resultsStore.value || { byPlayer: {}, rev: 0 };
        const arr = store.byPlayer[playerId] || [];
        if (arr.length > 0) {
            arr.pop();
            store.byPlayer[playerId] = arr;
            resultsStore.value = { ...store, rev: (store.rev || 0) + 1 };
            nodecg.log.info(`[results] undo last (player=${playerId})`);
        }
    });
};
