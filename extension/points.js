'use strict';

/**
 * ルールを JSON で管理して得点計算を汎用化。
 *
 * Replicants:
 * - rules (persistent): { items: Array<RuleItem> }
 *   RuleItem = {
 *     key: string,                // 内部キー（"red" など）
 *     labelDashboard: string,     // Dashboard表示名（例: "赤"）
 *     labelGraphics: string,      // Graphics表示名（例: "RED"）
 *     pointsCorrect: number,      // 正解時の得点
 *     pointsWrong: number,        // 誤答時の得点（0 なら誤答ボタンを出さないUIにもできる）
 *     cap: number                 // 制限個数（上限）
 *   }
 *
 * - pointState (non-persistent):
 *   {
 *     entries: { [key: string]: boolean[] }, // true=正解, false=誤答 を押した履歴（capまで）
 *     total: number,
 *     rev: number
 *   }
 *
 * Messages (from dashboard):
 * - 'point-control', { action: 'add',   key: string, ok: boolean }  // 1件追加（cap厳守）
 * - 'point-control', { action: 'reset' }                            // 全クリア
 */

'use strict';

module.exports = (nodecg) => {
  /** rules: ルールの外部設定（persistent） */
  const rules = nodecg.Replicant('rules', {
    persistent: true,
    defaultValue: {
      nameDashboard: '標準ルール',
      nameGraphics: 'STANDARD RULE',
      nameGraphicsShortEn: 'STD',
      attemptsCount: 2,
      retryAttemptsCount: 3,
      items: [
        { key: 'red',    labelDashboard: '赤',   labelGraphics: 'RED',    pointsCorrect: 3, pointsWrong: 1, cap: 5 },
        { key: 'yellow', labelDashboard: '黄',   labelGraphics: 'YELLOW', pointsCorrect: 3, pointsWrong: 1, cap: 5 },
        { key: 'blue',   labelDashboard: '青',   labelGraphics: 'BLUE',   pointsCorrect: 3, pointsWrong: 1, cap: 5 },
        { key: 'free',   labelDashboard: '自由', labelGraphics: 'FREE',   pointsCorrect: 5, pointsWrong: 0, cap: 1 }
      ]
    }
  });


    /** @type {import('nodecg/types/replicant').Replicant<{entries: Record<string, boolean[]>, total: number, rev: number}>>} */
    const pointState = nodecg.Replicant('pointState', {
        persistent: false,
        defaultValue: {
            entries: {},
            total: 0,
            rev: 0
        }
    });

    // 便利関数
    const byKey = (k) => (rules.value?.items || []).find(it => it.key === k) || null;

    const scoreOf = (key, val /* boolean */) => {
        const r = byKey(key);
        if (!r) return 0;
        return val ? (r.pointsCorrect || 0) : (r.pointsWrong || 0);
    };

    function recalcTotal(ps) {
        let sum = 0;
        const ents = ps.entries || {};
        for (const [key, arr] of Object.entries(ents)) {
            for (const v of (arr || [])) sum += scoreOf(key, !!v);
        }
        return sum;
    }

    function ensureEntryArray(key) {
        const ps = pointState.value;
        if (!ps.entries[key]) ps.entries[key] = [];
        return ps.entries[key];
    }

    nodecg.listenFor('point-control', (msg) => {
        const ps = pointState.value;
        switch (msg.action) {
            case 'add': {
                const key = String(msg.key || '').trim();
                const ok = !!msg.ok;
                const r = byKey(key);
                if (!r) return;
                const arr = ensureEntryArray(key);
                if (arr.length >= (r.cap ?? 0)) {
                    // cap超えは無視（UIでもdisableにする）
                    pointState.value = { ...ps, rev: ps.rev + 1 };
                    return;
                }
                arr.push(ok);
                const total = recalcTotal(ps);
                pointState.value = { entries: { ...ps.entries }, total, rev: ps.rev + 1 };
                break;
            }

            case 'reset': {
                pointState.value = { entries: {}, total: 0, rev: ps.rev + 1 };
                break;
            }

            default:
                break;
        }
    });

    // 軽いハートビート
    setInterval(() => {
        const ps = pointState.value;
        pointState.value = { ...ps, rev: ps.rev + 1 };
    }, 5000);
};
