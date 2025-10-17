(function () {
    const roster = nodecg.Replicant('playerRoster');
    const current = nodecg.Replicant('currentPlayer');
    const q = (s) => document.querySelector(s);

    // ...（既存の要素参照・イベントはそのまま）...

    // ── CSV 関連 ─────────────────────────────────────
    const elCsvFile = q('#csvFile');
    q('#csvImportReplace').addEventListener('click', () => importCsv({ mode: 'replace' }));
    q('#csvImportUpsert').addEventListener('click', () => importCsv({ mode: 'upsert' }));
    q('#csvExport').addEventListener('click', exportCsv);

    function importCsv({ mode }) {
        const file = elCsvFile.files?.[0];
        if (!file) return alert('CSVファイルを選択してください。');
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const text = String(reader.result || '');
                const rows = parseCsv(text); // [{id, robot}, ...]
                if (!rows.length) return alert('有効な行が見つかりません。');

                nodecg.sendMessage('player-control', { action: 'bulk-set', mode, rows });
            } catch (e) {
                console.error(e);
                alert('CSVの解析に失敗しました。');
            }
        };
        reader.readAsText(file); // ここはUTF-8前提。Shift-JISの場合は readAsText(file, 'shift-jis') でも可
    }

    // 簡易CSVパーサ（ダブルクオート対応、CRLF/空行/ヘッダ対応）
    function parseCsv(text) {
        const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
            .map(l => l.trim())
            .filter(l => l.length > 0);

        const out = [];
        let hasHeader = false;

        for (let i = 0; i < lines.length; i++) {
            const cols = splitCsvLine(lines[i]); // ["id","robot"] or ["1234","Raptor-X"]
            if (cols.length < 2) continue;
            if (i === 0 && /^id$/i.test(cols[0]) && /^robot$/i.test(cols[1])) { hasHeader = true; continue; }

            const id = String(cols[0]).trim();
            const robot = String(cols[1]).trim();
            if (!id || !robot) continue;
            out.push({ id, robot });
        }
        return out;
    }

    // 1行のCSV分割（"..." でのカンマ/二重引用符エスケープ対応）
    function splitCsvLine(line) {
        const res = [];
        let cur = '';
        let inQ = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (inQ) {
                if (ch === '"') {
                    if (line[i + 1] === '"') { cur += '"'; i++; } // 連続""はエスケープされた"
                    else { inQ = false; }
                } else {
                    cur += ch;
                }
            } else {
                if (ch === '"') inQ = true;
                else if (ch === ',') { res.push(cur); cur = ''; }
                else cur += ch;
            }
        }
        res.push(cur);
        return res;
    }

    function exportCsv() {
        const list = roster.value || [];
        // ヘッダ付き、UTF-8 BOM付与（Excelで文字化けしにくい）
        const header = 'id,robot';
        const body = list.map(p => `${escapeCsv(p.id)},${escapeCsv(p.robot)}`).join('\n');
        const csv = header + '\n' + body;
        const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
        const blob = new Blob([bom, csv], { type: 'text/csv;charset=utf-8;' });

        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `player_roster_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
    }

    function escapeCsv(s) {
        const needsQuote = /[",\n]/.test(s);
        let t = s.replace(/"/g, '""');
        return needsQuote ? `"${t}"` : t;
    }


    const elId = q('#pid');
    const elRobot = q('#robot');
    const elList = q('#list');
    const elCur = q('#cur');
    const elCount = q('#count');

    function send(action, extra) {
        nodecg.sendMessage('player-control', { action, ...extra });
    }

    // 追加／上書き
    q('#add').addEventListener('click', () => {
        const id = elId.value.trim();
        const robot = elRobot.value.trim();
        if (!id || !robot) return;
        send('add', { id, robot });
        elId.value = '';
        elRobot.value = '';
    });

    // 表示に反映
    q('#select').addEventListener('click', () => {
        const opt = elList.selectedOptions[0];
        if (!opt) return;
        send('select', { id: opt.value });
    });

    // 削除
    q('#remove').addEventListener('click', () => {
        const opt = elList.selectedOptions[0];
        if (!opt) return;
        send('remove', { id: opt.value });
    });

    // 現在表示クリア
    q('#clearCur').addEventListener('click', () => send('clear-current'));

    // 全消去
    q('#clearRoster').addEventListener('click', () => send('clear-roster'));

    // 表示更新：リスト
    roster.on('change', (list = []) => {
        elList.innerHTML = '';
        list.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = `ID:${p.id} / ${p.robot}`;
            elList.appendChild(opt);
        });
        elCount.textContent = String(list.length);
    });

    // 表示更新：現在表示
    current.on('change', (p) => {
        elCur.textContent = p ? `ID:${p.id} / ${p.robot}` : '（なし）';
    });
})();
