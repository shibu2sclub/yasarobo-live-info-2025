'use strict';

/**
 * retryCount（非永続）
 * - ルールの retryAttemptsCount（デフォルト3）を上限として +1 を制御
 * - ★ Retry +1 した「その瞬間」に、現在の試技の得点状態を完全クリア（pointState をリセット）
 *
 * メッセージ:
 *  - 'retry:inc'   → 上限未満のときのみ +1 ＆ pointState を {entries:{}, total:0} にリセット
 *  - 'retry:reset' → retryCount を 0 にリセット（pointState は変更しない）
 */
module.exports = (nodecg) => {
    const rules = nodecg.Replicant('rules'); // attemptsCount / retryAttemptsCount を含む

    /** @type {import('nodecg/types/replicant').Replicant<{count:number, rev:number}>} */
    const retryCount = nodecg.Replicant('retryCount', {
        persistent: false,
        defaultValue: { count: 0, rev: 0 }
    });

    /** @type {import('nodecg/types/replicant').Replicant<{entries:Record<string,boolean[]>, total:number, rev:number}>} */
    const pointState = nodecg.Replicant('pointState', {
        persistent: false,
        defaultValue: { entries: {}, total: 0, rev: 0 }
    });

    function cap() {
        const c = Number(rules.value?.retryAttemptsCount ?? 3);
        return Number.isFinite(c) && c >= 0 ? Math.floor(c) : 3;
    }

    // ★ 現在の試技の得点状態を全クリア（配列も合計も初期化）
    function resetPointState() {
        const cur = pointState.value || { entries: {}, total: 0, rev: 0 };
        pointState.value = { entries: {}, total: 0, rev: (cur.rev || 0) + 1 };
        nodecg.log.info('[retry] pointState cleared due to retry');
    }

    nodecg.listenFor('retry:inc', () => {
        const v = retryCount.value || { count: 0, rev: 0 };
        const limit = cap();
        if ((v.count || 0) >= limit) {
            // 上限時は据え置き（ポイントのクリアも発生させない）
            retryCount.value = { count: v.count || 0, rev: (v.rev || 0) + 1 };
            return;
        }
        // カウントを進め、同時に現在の試技スコアをクリア
        retryCount.value = { count: (v.count || 0) + 1, rev: (v.rev || 0) + 1 };
        resetPointState();
    });

    nodecg.listenFor('retry:reset', () => {
        const v = retryCount.value || { count: 0, rev: 0 };
        // 仕様：retry の「リセット」はカウントのみ。得点状態は変えない
        retryCount.value = { count: 0, rev: (v.rev || 0) + 1 };
    });
};
