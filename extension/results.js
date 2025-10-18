'use strict';

/**
 * attemptsStore（永続）：
 * byPlayer: {
 *   [playerId]: {
 *     attempt1: ResultEntry | null,
 *     attempt2: ResultEntry | null,
 *     best: { total: number, matchRemainingMs: number, from: 1|2 } | null
 *   }
 * }
 * rev: number
 *
 * ResultEntry:
 * {
 *   id: string,                // 一意ID
 *   ts: number,                // 保存時刻(ms since epoch)
 *   playerId: string,
 *   robot: string,
 *   // 得点内訳と合計
 *   redCorrect: number, redWrong: number,
 *   yellowCorrect: number, yellowWrong: number,
 *   blueCorrect: number, blueWrong: number,
 *   free: number,
 *   total: number,
 *   // 時間（競技の残りのみ）
 *   matchRemainingMs: number
 * }
 *
 * メッセージ:
 * - results:save-attempt   { which: 1|2, reason?: 'manual' }
 * - results:reset-attempt  { which: 1|2 }
 * - results:reset-both     {}
 */

module.exports = (nodecg) => {
    // 既存 Replicant を参照
    const timerState = nodecg.Replicant('timerState');     // from timer.js
    const pointState = nodecg.Replicant('pointState');     // from points.js
    const current = nodecg.Replicant('currentPlayer');  // from player.js

    /** @type {import('nodecg/types/replicant').Replicant<{byPlayer: Record<string, {attempt1:any|null,attempt2:any|null,best:any|null}>, rev:number}>} */
    const attemptsStore = nodecg.Replicant('attemptsStore', {
        persistent: true,
        defaultValue: { byPlayer: {}, rev: 0 }
    });

    // ユーティリティ
    const nowId = () =>
        new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14) + '-' + Date.now();
    const safeArr = (x) => Array.isArray(x) ? x : [];
    const countOKNG = (arr) => {
        let ok = 0, ng = 0;
        for (const v of safeArr(arr)) (v ? ok++ : ng++);
        return [ok, ng];
    };

    function buildEntry() {
        const p = current.value;
        if (!p || !p.id) return null;

        // 得点
        const [rOK, rNG] = countOKNG(pointState.value?.red);
        const [yOK, yNG] = countOKNG(pointState.value?.yellow);
        const [bOK, bNG] = countOKNG(pointState.value?.blue);
        const free = Number(pointState.value?.free || 0);
        const total = Number(pointState.value?.total || 0);

        // 競技残（match only）
        const s = timerState.value || {};
        const matchMs = Number.isFinite(s.matchMs) ? s.matchMs : 0;
        let matchRemainingMs = matchMs;
        if (s.stage === 'match') {
            const t = Date.now();
            const elapsed = (s.accumulatedMs || 0) + (s.running ? (t - (s.startEpochMs || 0)) : 0);
            matchRemainingMs = Math.max(0, matchMs - elapsed);
        } else {
            // 準備中保存 → 競技は未開始なのでフル残
            matchRemainingMs = Math.max(0, matchMs);
        }

        return {
            id: nowId(),
            ts: Date.now(),
            playerId: p.id,
            robot: p.robot,
            redCorrect: rOK, redWrong: rNG,
            yellowCorrect: yOK, yellowWrong: yNG,
            blueCorrect: bOK, blueWrong: bNG,
            free,
            total,
            matchRemainingMs
        };
    }

    function computeBest(a1, a2) {
        if (!a1 && !a2) return null;
        if (a1 && !a2) return { total: a1.total, matchRemainingMs: a1.matchRemainingMs, from: 1 };
        if (!a1 && a2) return { total: a2.total, matchRemainingMs: a2.matchRemainingMs, from: 2 };
        // 両方あり：得点が高い方、同点なら残が多い方
        if (a1.total !== a2.total) {
            return (a1.total > a2.total)
                ? { total: a1.total, matchRemainingMs: a1.matchRemainingMs, from: 1 }
                : { total: a2.total, matchRemainingMs: a2.matchRemainingMs, from: 2 };
        }
        // 同点 → 残が多い方が“良いタイム”
        if (a1.matchRemainingMs !== a2.matchRemainingMs) {
            return (a1.matchRemainingMs > a2.matchRemainingMs)
                ? { total: a1.total, matchRemainingMs: a1.matchRemainingMs, from: 1 }
                : { total: a2.total, matchRemainingMs: a2.matchRemainingMs, from: 2 };
        }
        // 完全同値 → 1を優先
        return { total: a1.total, matchRemainingMs: a1.matchRemainingMs, from: 1 };
    }

    function setAttempt(which, entry) {
        const p = current.value;
        if (!p || !p.id) return;

        const store = attemptsStore.value || { byPlayer: {}, rev: 0 };
        const rec = store.byPlayer[p.id] || { attempt1: null, attempt2: null, best: null };

        if (which === 1) rec.attempt1 = entry;
        else if (which === 2) rec.attempt2 = entry;

        rec.best = computeBest(rec.attempt1, rec.attempt2);
        store.byPlayer[p.id] = rec;
        attemptsStore.value = { ...store, rev: (store.rev || 0) + 1 };

        nodecg.log.info(`[attempts] set attempt${which} for ${p.id} total=${entry?.total ?? '—'} rem=${entry?.matchRemainingMs ?? '—'} bestFrom=${rec.best?.from ?? '—'}`);
    }

    function resetAttempt(which) {
        const p = current.value;
        if (!p || !p.id) return;

        const store = attemptsStore.value || { byPlayer: {}, rev: 0 };
        const rec = store.byPlayer[p.id] || { attempt1: null, attempt2: null, best: null };

        if (which === 1) rec.attempt1 = null;
        else if (which === 2) rec.attempt2 = null;

        rec.best = computeBest(rec.attempt1, rec.attempt2);
        store.byPlayer[p.id] = rec;
        attemptsStore.value = { ...store, rev: (store.rev || 0) + 1 };

        nodecg.log.info(`[attempts] reset attempt${which} for ${p.id}`);
    }

    // メッセージAPI
    nodecg.listenFor('results:save-attempt', (msg) => {
        const which = Number(msg?.which);
        if (which !== 1 && which !== 2) return;
        const entry = buildEntry();
        if (!entry) return;
        setAttempt(which, entry);
    });

    nodecg.listenFor('results:reset-attempt', (msg) => {
        const which = Number(msg?.which);
        if (which !== 1 && which !== 2) return;
        resetAttempt(which);
    });

    nodecg.listenFor('results:reset-both', () => {
        resetAttempt(1);
        resetAttempt(2);
    });
};
