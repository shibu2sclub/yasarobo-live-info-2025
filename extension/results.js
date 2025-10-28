'use strict';

/**
 * 結果管理（試技ごとの保存＋ベスト算出）
 * デバッグログ付き版
 */

module.exports = (nodecg) => {
    const rules = nodecg.Replicant('rules');
    const timerState = nodecg.Replicant('timerState');
    const pointState = nodecg.Replicant('pointState');
    const retryCount = nodecg.Replicant('retryCount');
    const current = nodecg.Replicant('currentPlayer');

    /** attemptsStore の Replicant */
    const attemptsStore = nodecg.Replicant('attemptsStore', {
        persistent: true,
        defaultValue: { byPlayer: {}, rev: 0 }
    });

    // ーーーー util ーーーー

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
                if (v) ok++;
                else ng++;
                pts += scoreOf(key, !!v);
            }
            out[key] = { ok, ng, points: pts };
        }
        return out;
    }

    /**
     * 現在の状態から attempt レコードを1つ作る
     * - currentPlayer が選ばれてなければ null
     * - ruleId が取れれば ruleId も含める
     */
    function buildEntry() {
        const p = current.value;
        if (!p || !p.id) {
            // nodecg.log.warn('[results] buildEntry(): currentPlayer missing or has no id', p);
            return null;
        }

        const total = Number(pointState.value?.total || 0);

        // 残り競技時間の計算
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

        const breakdown = deepClone(pointState.value?.entries || {});
        const retry = Number(retryCount.value?.count || 0);
        const summary = buildSummary(breakdown);

        const usedRuleId = (rules.value && typeof rules.value.ruleId === 'string')
            ? rules.value.ruleId
            : undefined;

        const entry = {
            id: nowId(),
            ts: Date.now(),
            playerId: p.id,
            robot: p.robot,
            total,
            matchRemainingMs,
            ruleId: usedRuleId,
            breakdown,
            retryCount: retry,
            summary
        };

        // nodecg.log.info('[results] buildEntry(): built entry =', entry);
        return entry;
    }

    function computeBest(arr /* (ResultEntry|null)[] */) {
        const list = (arr || []).filter(Boolean);
        if (list.length === 0) return null;
        let best = { total: -Infinity, matchRemainingMs: -Infinity, from: 1 };
        list.forEach((e, i) => {
            if (
                e.total > best.total ||
                (e.total === best.total && e.matchRemainingMs > best.matchRemainingMs)
            ) {
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
        if (!p || !p.id) {
            nodecg.log.warn('[results] setAttempt(): no current player');
            nodecg.log.info(`[attempts] save skipped: no currentPlayer`);
            return;
        }

        const store = ensureRecord(p.id);
        const rec = store.byPlayer[p.id];

        const i = Math.max(1, Math.floor(index)) - 1;
        if (!Array.isArray(rec.attempts)) rec.attempts = [];
        while (rec.attempts.length <= i) rec.attempts.push(null);

        rec.attempts[i] = entry;
        rec.best = computeBest(rec.attempts);

        attemptsStore.value = { ...store, rev: (store.rev || 0) + 1 };

        // nodecg.log.info(
        //     `[results] setAttempt(): saved attempt#${index} for ${p.id}, score=${entry?.total}, time=${entry?.matchRemainingMs}, ruleId=${entry?.ruleId}`
        // );
        nodecg.log.info(
            `[attempts] set attempt#${index} for ${p.id} total=${entry?.total ?? '—'} rem=${entry?.matchRemainingMs ?? '—'} retry=${entry?.retryCount ?? 0} ruleId=${entry?.ruleId ?? '(none)'}`
        );
        // nodecg.log.info('[results] attemptsStore after save =', attemptsStore.value);
    }

    function resetAttempt(index /* 1-based */) {
        const p = current.value;
        if (!p || !p.id) {
            // nodecg.log.warn('[results] resetAttempt(): no current player');
            return;
        }

        const store = ensureRecord(p.id);
        const rec = store.byPlayer[p.id];

        const i = Math.max(1, Math.floor(index)) - 1;
        while (rec.attempts.length <= i) rec.attempts.push(null);
        rec.attempts[i] = null;
        rec.best = computeBest(rec.attempts);

        attemptsStore.value = { ...store, rev: (store.rev || 0) + 1 };
        // nodecg.log.info(`[results] resetAttempt(): cleared attempt#${index} for ${p.id}`);
        nodecg.log.info(`[attempts] reset attempt#${index} for ${p.id}`);
    }

    function resetAll() {
        const p = current.value;
        if (!p || !p.id) {
            // nodecg.log.warn('[results] resetAll(): no current player');
            return;
        }
        const store = ensureRecord(p.id);
        store.byPlayer[p.id] = { attempts: [], best: null };
        attemptsStore.value = { ...store, rev: (store.rev || 0) + 1 };
        // nodecg.log.info(`[results] resetAll(): cleared all attempts for ${p.id}`);
        nodecg.log.info(`[attempts] reset all for ${p?.id}`);

    }

    // メッセージハンドラ
    nodecg.listenFor('results:save-attempt', (msg) => {
        const idx = Number(msg?.index);
        if (!Number.isFinite(idx) || idx < 1) {
            // nodecg.log.warn('[results] save-attempt: invalid index', msg);
            return;
        }

        // nodecg.log.info('[results] save-attempt received for index', idx);

        const entry = buildEntry();
        if (!entry) {
            // nodecg.log.warn('[results] save-attempt aborted: entry is null');
            return;
        }

        setAttempt(idx, entry);
    });

    nodecg.listenFor('results:reset-attempt', (msg) => {
        const idx = Number(msg?.index);
        if (!Number.isFinite(idx) || idx < 1) {
            // nodecg.log.warn('[results] reset-attempt: invalid index', msg);
            return;
        }
        resetAttempt(idx);
    });

    nodecg.listenFor('results:reset-all', () => {
        resetAll();
    });
};
