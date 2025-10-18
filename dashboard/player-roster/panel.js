(function () {
    const roster = nodecg.Replicant('playerRoster');

    const q = (s) => document.querySelector(s);

    const elId = q('#pid');
    const elRobot = q('#robot');
    const elList = q('#list');
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

    // 削除（選択行）
    q('#remove').addEventListener('click', () => {
        const opt = elList.selectedOptions[0];
        if (!opt) return;
        send('remove', { id: opt.value });
    });

    // 全消去
    q('#clearRoster').addEventListener('click', () => send('clear-roster'));

    // CSV
    const elCsv = q('#csvFile');
    q('#csvImportReplace').addEventListener('click', () => importCsv('replace'));
    q('#csvImportUpsert').addEventListener('click', () => importCsv('upsert'));
    q('#csvExport').addEventListener('click', exportCsv);

    function importCsv(mode) {
        const file = elCsv.files?.[0];
        if (!file) return alert('CSVファイルを選択してください。');
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const rows = parseCsv(String(reader.result || ''));
                if (!rows.length) return alert('有効な行が見つかりません。');
                send('bulk-set', { mode, rows });
            } catch (e) {
                console.error(e);
                alert('CSVの解析に失敗しました。');
            }
        };
        reader.readAsText(file);
    }

    function parseCsv(text) {
        const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
            .map(l => l.trim()).filter(l => l.length > 0);
        const out = [];
        for (let i = 0; i < lines.length; i++) {
            const cols = splitCsvLine(lines[i]);
            if (cols.length < 2) continue;
            if (i === 0 && /^id$/i.test(cols[0]) && /^robot$/i.test(cols[1])) continue;
            const id = String(cols[0]).trim();
            const robot = String(cols[1]).trim();
            if (!id || !robot) continue;
            out.push({ id, robot });
        }
        return out;
    }
    function splitCsvLine(line) {
        const res = []; let cur = ''; let inQ = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (inQ) {
                if (ch === `"`) {
                    if (line[i + 1] === '"') { cur += `"`; i++; } else inQ = false;
                } else cur += ch;
            } else {
                if (ch === `"`) { inQ = true; }
                else if (ch === ',') { res.push(cur); cur = ''; }
                else cur += ch;
            }
        }
        res.push(cur); return res;
    }
    function exportCsv() {
        const list = roster.value || [];
        const header = 'id,robot';
        const body = list.map(p => `${escCsv(p.id)},${escCsv(p.robot)}`).join('\n');
        const csv = header + '\n' + body;
        const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
        const blob = new Blob([bom, csv], { type: 'text/csv;charset=utf-8;' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `player_roster_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.csv`;
        document.body.appendChild(a); a.click(); a.remove();
    }
    function escCsv(s) { s = String(s); const nq = /[",\n]/.test(s); s = s.replace(/"/g, '""'); return nq ? `"${s}"` : s; }

    // リスト描画
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
})();
