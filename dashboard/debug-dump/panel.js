(function () {
    const attemptsStore = nodecg.Replicant('attemptsStore');
    const currentPlayer = nodecg.Replicant('currentPlayer');
    const rules = nodecg.Replicant('rules');
    const rankingData = nodecg.Replicant('rankingData');
    const rulesLibrary = nodecg.Replicant('rulesLibrary');

    const q = (s) => document.querySelector(s);
    const elDbg = q('#dbgDump'); // ← 追加

    let libCache = { items: [] };
    let rankCache = { byRule: {} };

    let currentRuleId = '';

    // ★ ここがデバッグ
    if (elDbg) {
        elDbg.addEventListener('click', () => {
            console.log('[ranking-panel] currentRuleId:', currentRuleId);
            console.log('[ranking-panel] rulesLibrary:', libCache);
            console.log('[ranking-panel] rankingData:', rankCache);

            console.log('[ranking-panel] attemptsStore current snapshot:',
                attemptsStore.value);
            console.log('[ranking-panel] currentPlayer:', currentPlayer.value);
            console.log('[ranking-panel] rules:', rules.value);
            console.log('[ranking-panel] rulesLibrary:', rulesLibrary.value);
            console.log('[ranking-panel] rankingData:', rankingData.value);
        });
    }
})();
