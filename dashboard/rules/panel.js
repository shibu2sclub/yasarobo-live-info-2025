(function () {
    const rules = nodecg.Replicant('rules');
    const ps = nodecg.Replicant('pointState');

    const q = (s) => document.querySelector(s);
    const elJson = q('#json');
    const elState = q('#state');

    rules.on('change', (v) => {
        try {
            // 既にユーザーが編集中なら上書きしたくない場合もあるが、
            // ここでは常に最新を出す（必要なら「編集ロック」UIを足す）
            elJson.value = JSON.stringify(v || { items: [] }, null, 2);
            elState.textContent = '最新のルールを読み込み済み';
        } catch {
            /* ignore */
        }
    });

    q('#apply').addEventListener('click', () => {
        try {
            const obj = JSON.parse(elJson.value);
            // ざっくりバリデーション
            if (!obj || !Array.isArray(obj.items)) throw new Error('items が配列ではありません');
            for (const it of obj.items) {
                if (!it.key) throw new Error('item に key が必要です');
                it.pointsCorrect = Number(it.pointsCorrect || 0);
                it.pointsWrong = Number(it.pointsWrong || 0);
                it.cap = Number(it.cap || 0);
            }
            rules.value = obj; // Replicant 更新で全UIに反映される
            elState.textContent = '適用しました';
        } catch (e) {
            console.error(e);
            elState.textContent = 'JSONエラー: ' + (e?.message || e);
        }
    });

    q('#resetPoints').addEventListener('click', () => {
        const st = ps.value || { entries: {}, total: 0, rev: 0 };
        ps.value = { entries: {}, total: 0, rev: (st.rev || 0) + 1 };
        elState.textContent = '現在の得点をリセットしました';
    });
})();
