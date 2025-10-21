'use strict';

/**
 * アクティブルールの適用と副作用をまとめるマネージャ。
 * - 監視: rulesActiveKey / rulesLibrary
 * - 適用: rulesLibrary.items[*].rule → rules に反映
 * - 副作用: pointState 初期化、retryCount 初期化（必要なら timer なども）
 */
module.exports = (nodecg) => {
    // ── Policy: 切替時に何をするか（必要に応じて true/false を切替）
    const POLICY = {
        resetPointsOnSwitch: true,
        resetRetryOnSwitch: true,
        // resetTimerOnSwitch: false, // 使う場合は下に実装
        // clearAttemptsOnSwitch: false, // 過去結果の扱いは大会運用に合わせて
    };

    // 入出力 Replicants
    const rulesLibrary = nodecg.Replicant('rulesLibrary');   // {items:[], rev}
    const rulesActiveKey = nodecg.Replicant('rulesActiveKey'); // string|null
    const rules = nodecg.Replicant('rules', {         // 実際に UI/EXT が購読
        persistent: true,
        defaultValue: {
            nameDashboard: '標準ルール',
            nameGraphics: 'STANDARD RULE',
            nameGraphicsShortEn: 'STD',
            themeColor: '#AF1E21',
            attemptsCount: 2,
            retryAttemptsCount: 3,
            items: [
                { key: 'red', labelDashboard: '赤', labelGraphics: 'RED', pointsCorrect: 3, pointsWrong: 1, cap: 5 },
                { key: 'yellow', labelDashboard: '黄', labelGraphics: 'YELLOW', pointsCorrect: 3, pointsWrong: 1, cap: 5 },
                { key: 'blue', labelDashboard: '青', labelGraphics: 'BLUE', pointsCorrect: 3, pointsWrong: 1, cap: 5 },
                { key: 'free', labelDashboard: '自由', labelGraphics: 'FREE', pointsCorrect: 5, pointsWrong: 0, cap: 1 }
            ]
        }
    });

    // 副作用先（必要なものだけ）
    const pointState = nodecg.Replicant('pointState', { persistent: false, defaultValue: { entries: {}, total: 0, rev: 0 } });
    const retryCount = nodecg.Replicant('retryCount', { persistent: false, defaultValue: { count: 0, rev: 0 } });
    // const timerState = nodecg.Replicant('timerState'); // 必要なら利用
    // const attemptsStore = nodecg.Replicant('attemptsStore'); // 必要なら利用

    // ユーティリティ
    const clone = (o) => JSON.parse(JSON.stringify(o || null));

    function applyActiveRule() {
        const key = rulesActiveKey.value;
        const lib = rulesLibrary.value || { items: [] };
        if (!key) return false;
        const doc = (lib.items || []).find(x => x.id === key);
        if (!doc) return false;

        rules.value = clone(doc.rule);
        nodecg.log.info(`[rules-manager] applied rule "${doc.meta?.title || doc.id}"`);

        if (POLICY.resetPointsOnSwitch) {
            const ps = pointState.value || { entries: {}, total: 0, rev: 0 };
            pointState.value = { entries: {}, total: 0, rev: (ps.rev || 0) + 1 };
        }
        if (POLICY.resetRetryOnSwitch) {
            const rc = retryCount.value || { count: 0, rev: 0 };
            retryCount.value = { count: 0, rev: (rc.rev || 0) + 1 };
        }

        // if (POLICY.resetTimerOnSwitch) {
        //   nodecg.sendMessage('timer-control', { action: 'reset' });
        // }

        return true;
    }

    // ActiveKey が変わったら適用
    rulesActiveKey.on('change', () => applyActiveRule());

    // ライブラリが変わって ActiveKey が無効になったら、先頭を選んで適用
    rulesLibrary.on('change', (lib) => {
        const list = lib?.items || [];
        if (!list.length) return;
        const key = rulesActiveKey.value;
        const exists = list.some(x => x.id === key);
        if (!exists) {
            rulesActiveKey.value = list[0].id; // on('change') で applyActiveRule() が走る
        }
    });

    // 起動時にも一度適用を試みる（ActiveKey が既に入っているケース）
    setTimeout(applyActiveRule, 0);
};
