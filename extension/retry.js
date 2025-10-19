'use strict';

/**
 * retryCount（非永続）
 * - ルールの retryAttemptsCount（デフォルト3）を上限として +1 を制御
 * メッセージ:
 *  - 'retry:inc'   → 上限未満のときのみ +1（上限時は据え置き）
 *  - 'retry:reset' → 0にリセット
 */
module.exports = (nodecg) => {
    const rules = nodecg.Replicant('rules'); // attemptsCount と retryAttemptsCount を含む

    /** @type {import('nodecg/types/replicant').Replicant<{count:number, rev:number}>} */
    const retryCount = nodecg.Replicant('retryCount', {
        persistent: false,
        defaultValue: { count: 0, rev: 0 }
    });

    function cap() {
        const c = Number(rules.value?.retryAttemptsCount ?? 3);
        return Number.isFinite(c) && c >= 0 ? Math.floor(c) : 3;
    }

    nodecg.listenFor('retry:inc', () => {
        const v = retryCount.value || { count: 0, rev: 0 };
        const limit = cap();
        if ((v.count || 0) >= limit) {
            // 上限時は据え置き。revだけ触ってUI同期したいなら以下の1行を有効化
            retryCount.value = { count: v.count || 0, rev: (v.rev || 0) + 1 };
            return;
        }
        retryCount.value = { count: (v.count || 0) + 1, rev: (v.rev || 0) + 1 };
    });

    nodecg.listenFor('retry:reset', () => {
        const v = retryCount.value || { count: 0, rev: 0 };
        retryCount.value = { count: 0, rev: (v.rev || 0) + 1 };
    });
};
