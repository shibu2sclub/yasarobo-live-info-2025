'use strict';

/**
 * ルールJSONで汎用化した得点管理（安全な初期化付き）
 *
 * Replicants:
 * - rules (persistent): { items: RuleItem[], ... }
 * - pointState (non-persistent): {
 *     entries: Record<string, boolean[]>,
 *     total: number,
 *     rev: number
 *   }
 *
 * Messages:
 * - 'point-control', { action: 'add',   key: string, ok: boolean }
 * - 'point-control', { action: 'reset' }
 */

module.exports = (nodecg) => {
    /** @type {import('nodecg/types/replicant').Replicant<{items:any[]}>} */
    const rules = nodecg.Replicant('rules');

    /** @type {import('nodecg/types/replicant').Replicant<{entries:Record<string,boolean[]>, total:number, rev:number}>} */
    const pointState = nodecg.Replicant('pointState', {
        persistent: false,
        defaultValue: {
            entries: {},   // ★ 必ずオブジェクトにしておく
            total: 0,
            rev: 0
        }
    });

    // ─────────────────────────────────────────────
    // 安全ユーティリティ（ここが今回の対策の肝）
    // ─────────────────────────────────────────────
    function safePS() {
        // Replicantがまだundefinedの瞬間にも備える
        const ps = pointState.value || {};
        if (typeof ps.entries !== 'object' || ps.entries === null) ps.entries = {};
        if (typeof ps.total !== 'number' || !Number.isFinite(ps.total)) ps.total = 0;
        if (typeof ps.rev !== 'number' || !Number.isFinite(ps.rev)) ps.rev = 0;
        // 形を正規化して反映（参照を切り替えることで購読側も安定）
        pointState.value = { entries: ps.entries, total: ps.total, rev: ps.rev };
        return pointState.value;
    }

    function ensureEntryArray(key) {
        const ps = safePS();
        if (!ps.entries[key]) {
            ps.entries[key] = [];
            pointState.value = { ...ps, rev: ps.rev + 1 };
        }
        return ps.entries[key];
    }

    const getRuleByKey = (k) => (rules.value?.items || []).find(it => it.key === k) || null;

    const scoreOf = (key, val /* boolean */) => {
        const r = getRuleByKey(key);
        if (!r) return 0;
        return val ? (r.pointsCorrect || 0) : (r.pointsWrong || 0);
    };

    function recalcTotal(psLike) {
        const ps = psLike || safePS();
        let sum = 0;
        for (const [key, arr] of Object.entries(ps.entries || {})) {
            for (const v of (arr || [])) sum += scoreOf(key, !!v);
        }
        return sum;
    }

    // ─────────────────────────────────────────────
    // メッセージハンドラ
    // ─────────────────────────────────────────────
    nodecg.listenFor('point-control', (msg) => {
        const action = msg?.action;
        switch (action) {
            case 'add': {
                const key = String(msg?.key || '').trim();
                const ok = !!msg?.ok;
                const r = getRuleByKey(key);
                if (!r) {
                    nodecg.log.warn(`[points] unknown key: "${key}"`);
                    // revだけ進めてUI再描画トリガー（任意）
                    const ps0 = safePS();
                    pointState.value = { ...ps0, rev: ps0.rev + 1 };
                    return;
                }
                const ps = safePS();
                const arr = ensureEntryArray(key);
                // cap超えは無視（UI側でdisableもしているが、バックエンドでも防御）
                if (arr.length >= (r.cap ?? 0)) {
                    pointState.value = { ...ps, rev: ps.rev + 1 };
                    return;
                }
                arr.push(ok);
                const total = recalcTotal(ps);
                pointState.value = { entries: { ...ps.entries }, total, rev: ps.rev + 1 };
                break;
            }

            case 'reset': {
                const ps = safePS();
                pointState.value = { entries: {}, total: 0, rev: ps.rev + 1 };
                break;
            }

            default:
                // 何もしない
                break;
        }
    });

    // ─────────────────────────────────────────────
    // ルール更新時の軽い整形（任意: 不存在キーの掃除など）
    // ─────────────────────────────────────────────
    rules.on('change', () => {
        const ps = safePS();
        // 存在しないキーを掃除（任意、残したいならこのブロックを削除）
        const validKeys = new Set((rules.value?.items || []).map(it => it.key));
        const nextEntries = {};
        for (const [k, arr] of Object.entries(ps.entries)) {
            if (validKeys.has(k)) nextEntries[k] = Array.isArray(arr) ? arr : [];
        }
        const next = { entries: nextEntries, total: recalcTotal({ entries: nextEntries }), rev: ps.rev + 1 };
        pointState.value = next;
    });

    // 軽いハートビート（同期を促す）
    setInterval(() => {
        const ps = safePS();
        pointState.value = { ...ps, rev: ps.rev + 1 };
    }, 5000);
};
