'use strict';

/**
 * retryCount（非永続。選手変更で0へ）
 * メッセージ:
 *  - 'retry:inc'   → 1加算
 *  - 'retry:reset' → 0にリセット
 */
module.exports = (nodecg) => {
    /** @type {import('nodecg/types/replicant').Replicant<{count:number, rev:number}>} */
    const retryCount = nodecg.Replicant('retryCount', {
        persistent: false,
        defaultValue: { count: 0, rev: 0 }
    });

    nodecg.listenFor('retry:inc', () => {
        const v = retryCount.value || { count: 0, rev: 0 };
        retryCount.value = { count: (v.count || 0) + 1, rev: (v.rev || 0) + 1 };
    });

    nodecg.listenFor('retry:reset', () => {
        const v = retryCount.value || { count: 0, rev: 0 };
        retryCount.value = { count: 0, rev: (v.rev || 0) + 1 };
    });
};
