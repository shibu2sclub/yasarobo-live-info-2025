(function () {
    const rules = nodecg.Replicant('rules');

    const q = (s) => document.querySelector(s);
    const elFile = q('#file');
    const elApply = q('#apply');
    const elExport = q('#export');
    const elState = q('#state');

    const elNameDashboard = q('#nameDashboard');
    const elNameGraphics = q('#nameGraphics');
    const elNameGraphicsShort = q('#nameGraphicsShortEn');
    const elAttemptsCount = q('#attemptsCount');
    const elRetryAttemptsCount = q('#retryAttemptsCount');

    rules.on('change', (v) => {
        const obj = v || {};
        elNameDashboard.textContent = obj.nameDashboard ?? '—';
        elNameGraphics.textContent = obj.nameGraphics ?? '—';
        elNameGraphicsShort.textContent = obj.nameGraphicsShortEn ?? '—';
        elAttemptsCount.textContent = String(obj.attemptsCount ?? '—');
        elRetryAttemptsCount.textContent = String(obj.retryAttemptsCount ?? '—');
        elState.textContent = '現在のルールを読み込み済み';
    });

    elApply.addEventListener('click', () => {
        const file = elFile.files?.[0];
        if (!file) { alert('JSONファイルを選択してください。'); return; }
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const obj = JSON.parse(String(reader.result || '{}'));
                validateAndNormalize(obj);
                rules.value = obj; // ← 適用
                elState.textContent = '新しいルールを適用しました';
            } catch (e) {
                console.error(e);
                alert('JSONの読み込み/検証に失敗しました：' + (e?.message || e));
                elState.textContent = '適用失敗';
            }
        };
        reader.readAsText(file);
    });

    elExport.addEventListener('click', () => {
        const v = rules.value || {};
        const txt = JSON.stringify(v, null, 2);
        const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
        const blob = new Blob([bom, txt], { type: 'application/json;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `rules_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`;
        document.body.appendChild(a); a.click(); a.remove();
    });

    function validateAndNormalize(obj) {
        if (!obj || typeof obj !== 'object') throw new Error('JSONがオブジェクトではありません');

        // 追加フィールド：無くても空でOK
        obj.nameDashboard = String(obj.nameDashboard ?? '');
        obj.nameGraphics = String(obj.nameGraphics ?? '');
        obj.nameGraphicsShortEn = String(obj.nameGraphicsShortEn ?? '');

        // 試技回数・リトライ上限
        const ac = Number(obj.attemptsCount ?? 2);
        obj.attemptsCount = (Number.isFinite(ac) && ac >= 1) ? Math.floor(ac) : 2;

        const rc = Number(obj.retryAttemptsCount ?? 3);
        obj.retryAttemptsCount = (Number.isFinite(rc) && rc >= 0) ? Math.floor(rc) : 3;

        // items
        if (!Array.isArray(obj.items)) throw new Error('items が配列ではありません');
        obj.items = obj.items.map((it, i) => {
            if (!it || typeof it !== 'object') throw new Error(`items[${i}] が不正です`);
            if (!it.key) throw new Error(`items[${i}] に key がありません`);
            return {
                key: String(it.key),
                labelDashboard: String(it.labelDashboard ?? it.key),
                labelGraphics: String(it.labelGraphics ?? it.key),
                pointsCorrect: Number(it.pointsCorrect ?? 0),
                pointsWrong: Number(it.pointsWrong ?? 0),
                cap: Number(it.cap ?? 0)
            };
        });
    }
})();
