(function () {
    const lib = nodecg.Replicant('rulesLibrary');

    const q = (s) => document.querySelector(s);
    const elFiles = q('#files');
    const elList = q('#list');
    const elCount = q('#count');

    const btnImportReplace = q('#importReplace');
    const btnImportUpsert = q('#importUpsert');
    const btnExportAll = q('#exportAll');
    const btnRemove = q('#remove');
    const btnClear = q('#clear');

    btnImportReplace.addEventListener('click', () => importFiles('replace'));
    btnImportUpsert.addEventListener('click', () => importFiles('upsert'));
    btnExportAll.addEventListener('click', exportAll);
    btnRemove.addEventListener('click', removeSelected);
    btnClear.addEventListener('click', () => nodecg.sendMessage('ruleslib:clear'));

    lib.on('change', (v) => {
        const items = v?.items || [];
        elList.innerHTML = '';
        items.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d.id;
            const title = d.meta?.title || d.id;
            const ac = d.rule?.attemptsCount ?? '?';
            const rc = d.rule?.retryAttemptsCount ?? '?';
            opt.textContent = `${title}  (attempts:${ac}, retry:${rc})`;
            elList.appendChild(opt);
        });
        elCount.textContent = String(items.length);
    });

    async function importFiles(mode) {
        const files = Array.from(elFiles.files || []);
        if (files.length === 0) { alert('JSONファイルを選択してください'); return; }

        const rules = [];
        for (const f of files) {
            const text = await f.text();
            try {
                const obj = JSON.parse(text);
                rules.push(obj);
            } catch (e) {
                console.error('JSON parse error:', f.name, e);
                alert(`JSON解析に失敗：${f.name}`);
                return;
            }
        }

        if (mode === 'replace') {
            nodecg.sendMessage('ruleslib:replaceAll', { rules });
        } else {
            // upsert: 1件ずつ投入
            for (const r of rules) nodecg.sendMessage('ruleslib:upsert', { rule: r });
        }
    }

    function removeSelected() {
        const opt = elList.selectedOptions[0];
        if (!opt) return;
        nodecg.sendMessage('ruleslib:remove', { id: opt.value });
    }

    function exportAll() {
        const items = lib.value?.items || [];
        const data = items.map(d => d.rule);
        const json = JSON.stringify(data, null, 2);
        const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
        const blob = new Blob([bom, json], { type: 'application/json;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `rules_library_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`;
        document.body.appendChild(a); a.click(); a.remove();
    }
})();
