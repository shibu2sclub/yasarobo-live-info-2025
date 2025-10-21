'use strict';

/**
 * 可変試技回数に対応した結果管理（内訳＋リトライ数も保存）。
 *
 * Replicants:
 * - rules: { items: RuleItem[], attemptsCount: number }
 * - timerState: { stage:'prep'|'match', running:boolean, startEpochMs:number, accumulatedMs:number, matchMs:number }
 * - pointState: { entries: Record<string, boolean[]>, total:number }
 * - retryCount: { count:number }
 * - currentPlayer: { id:string, robot:string, ... }
 *
 * - attemptsStore (persistent): {
 *     byPlayer: {
 *       [playerId]: {
 *         attempts: (ResultEntry|null)[],
 *         best: { total:number, matchRemainingMs:number, from:number } | null
 *       }
 *     },
 *     rev:number
 *   }
 *
 * ResultEntry:
 * {
 *   id:string, ts:number, playerId:string, robot:string,
 *   total:number, matchRemainingMs:number,
 *   // ★ 追加保存
 *   breakdown: { [key:string]: boolean[] },   // その時点の entries を丸ごとスナップショット
 *   retryCount: number,                       // その時点のリトライ数
 *   summary?: {                               // 便利用の集計（UI/CSV 用）
 *     [key:string]: { ok:number, ng:number, points:number }
 *   }
 * }
 */

module.exports = (nodecg) => {
    const rules = nodecg.Replicant('rules');
    const timerState = nodecg.Replicant('timerState');
    const pointState = nodecg.Replicant('pointState');
    const retryCount = nodecg.Replicant('retryCount');
    const current = nodecg.Replicant('currentPlayer');

    /** @type {import('nodecg/types/replicant').Replicant<{byPlayer:Record<string,{attempts:(any|null)[],best:any|null}>, rev:number}>} */
    const attemptsStore = nodecg.Replicant('attemptsStore', {
        persistent: true,
        defaultValue: { byPlayer: {}, rev: 0 }
    });

    const nowId = () =>
        new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14) + '-' + Date.now();

    function deepClone(o) { return JSON.parse(JSON.stringify(o)); }

    function scoreOf(key, ok) {
        const r = (rules.value?.items || []).find(it => it.key === key);
        if (!r) return 0;
        return ok ? (r.pointsCorrect || 0) : (r.pointsWrong || 0);
    }

    function buildSummary(entries) {
        const out = {};
        for (const [key, arr] of Object.entries(entries || {})) {
            let ok = 0, ng = 0, pts = 0;
            for (const v of arr) {
                if (v) ok++; else ng++;
                pts += scoreOf(key, !!v);
            }
            out[key] = { ok, ng, points: pts };
        }
        return out;
    }

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

        // ★ 追加保存項目
        const breakdown = deepClone(pointState.value?.entries || {});
        const retry = Number(retryCount.value?.count || 0);
        const summary = buildSummary(breakdown);

        return {
            id: nowId(),
            ts: Date.now(),
            playerId: p.id,
            robot: p.robot,
            total,
            matchRemainingMs,
            breakdown,
            retryCount: retry,
            summary
        };
    }

    function computeBest(arr /* (ResultEntry|null)[] */) {
        const list = (arr || []).filter(Boolean);
        if (list.length === 0) return null;
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
        while (rec.attempts.length <= i) rec.attempts.push(null);

        rec.attempts[i] = entry;
        rec.best = computeBest(rec.attempts);

        attemptsStore.value = { ...store, rev: (store.rev || 0) + 1 };
        nodecg.log.info(`[attempts] set attempt#${index} for ${p.id} total=${entry?.total ?? '—'} rem=${entry?.matchRemainingMs ?? '—'} retry=${entry?.retryCount ?? 0}`);
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
