'use strict';

/**
 * 可変試技回数に対応した結果管理。
 *
 * Replicants:
 * - rules: { items: RuleItem[], attemptsCount: number }  ← attemptsCount を使用（既定 2）
 * - attemptsStore (persistent): {
 *     byPlayer: {
 *       [playerId]: {
 *         attempts: (ResultEntry|null)[], // 長さは可変。UI 側は rules.attemptsCount を基準に操作
 *         best: { total:number, matchRemainingMs:number, from:number } | null
 *       }
 *     },
 *     rev:number
 *   }
 *
 * Messages:
 * - results:save-attempt  { index:number }   // 1-based index
 * - results:reset-attempt { index:number }
 * - results:reset-all     {}
 */

module.exports = (nodecg) => {
    const rules = nodecg.Replicant('rules');          // from points.js のルール JSON
    const timerState = nodecg.Replicant('timerState');     // from timer.js
    const pointState = nodecg.Replicant('pointState');     // from points.js（total と entries）
    const current = nodecg.Replicant('currentPlayer');  // from player.js

    /** @type {import('nodecg/types/replicant').Replicant<{byPlayer:Record<string,{attempts:(any|null)[],best:any|null}>, rev:number}>} */
    const attemptsStore = nodecg.Replicant('attemptsStore', {
        persistent: true,
        defaultValue: { byPlayer: {}, rev: 0 }
    });

    // ユーティリティ
    const nowId = () =>
        new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14) + '-' + Date.now();

    function buildEntry() {
        const p = current.value;
        if (!p || !p.id) return null;

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
            matchRemainingMs = Math.max(0, matchMs);
        }

        return {
            id: nowId(),
            ts: Date.now(),
            playerId: p.id,
            robot: p.robot,
            total,
            matchRemainingMs
        };
    }

    function computeBest(arr /* (ResultEntry|null)[] */) {
        const list = (arr || []).filter(Boolean);
        if (list.length === 0) return null;

        // 得点が高い方、同点なら残が多い方（インデックスは 1-based）
        let best = { total: -Infinity, matchRemainingMs: -Infinity, from: 1 };
        list.forEach((e, i) => {
            if (e.total > best.total ||
                (e.total === best.total && e.matchRemainingMs > best.matchRemainingMs)) {
                best = { total: e.total, matchRemainingMs: e.matchRemainingMs, from: i + 1 };
            }
        });
        return best;
    }

    function ensureRecord(playerId) {
        const store = attemptsStore.value || { byPlayer: {}, rev: 0 };
        if (!store.byPlayer[playerId]) {
            store.byPlayer[playerId] = { attempts: [], best: null };
        }
        return store;
    }

    function setAttempt(index /* 1-based */, entry) {
        const p = current.value;
        if (!p || !p.id) return;
        const store = ensureRecord(p.id);
        const rec = store.byPlayer[p.id];

        const i = Math.max(1, Math.floor(index)) - 1;
        if (!Array.isArray(rec.attempts)) rec.attempts = [];
        // 足りないところは null で埋める
        while (rec.attempts.length <= i) rec.attempts.push(null);

        rec.attempts[i] = entry;
        rec.best = computeBest(rec.attempts);

        attemptsStore.value = { ...store, rev: (store.rev || 0) + 1 };
        nodecg.log.info(`[attempts] set attempt#${index} for ${p.id} total=${entry?.total ?? '—'} rem=${entry?.matchRemainingMs ?? '—'} bestFrom=${rec.best?.from ?? '—'}`);
    }

    function resetAttempt(index /* 1-based */) {
        const p = current.value;
        if (!p || !p.id) return;
        const store = ensureRecord(p.id);
        const rec = store.byPlayer[p.id];

        const i = Math.max(1, Math.floor(index)) - 1;
        while (rec.attempts.length <= i) rec.attempts.push(null);
        rec.attempts[i] = null;
        rec.best = computeBest(rec.attempts);

        attemptsStore.value = { ...store, rev: (store.rev || 0) + 1 };
        nodecg.log.info(`[attempts] reset attempt#${index} for ${p.id}`);
    }

    function resetAll() {
        const p = current.value;
        if (!p || !p.id) return;
        const store = ensureRecord(p.id);
        store.byPlayer[p.id] = { attempts: [], best: null };
        attemptsStore.value = { ...store, rev: (store.rev || 0) + 1 };
        nodecg.log.info(`[attempts] reset all for ${p?.id}`);
    }

    // メッセージ
    nodecg.listenFor('results:save-attempt', (msg) => {
        const idx = Number(msg?.index);
        if (!Number.isFinite(idx) || idx < 1) return;
        const entry = buildEntry();
        if (!entry) return;
        setAttempt(idx, entry);
    });

    nodecg.listenFor('results:reset-attempt', (msg) => {
        const idx = Number(msg?.index);
        if (!Number.isFinite(idx) || idx < 1) return;
        resetAttempt(idx);
    });

    nodecg.listenFor('results:reset-all', () => resetAll());
};
