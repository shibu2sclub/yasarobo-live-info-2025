(function () {
    const roster = nodecg.Replicant('playerRoster');

    const q = s => document.querySelector(s);

    // [📝 既存フォーム] ※ appeal削除のため一切含まない
    const elId = q('#pid');
    const elRobot = q('#robot')
    const elRobotShort = q('#robotShort')
    const elRobotEn = q('#robotEn')
    const elTeam = q('#team')
    const elTeamShort = q('#teamShort')
    const elTeamEn = q('#teamEn')
    const elOrder = q('#order')

    // CSV UI
    const elCsv = q('#csvFile');
    q('#csvImportReplace').addEventListener('click', () => importCsv('replace'));
    q('#csvImportUpsert').addEventListener('click', () => importCsv('upsert'));
    q('#csvExport').addEventListener('click', exportCsv);

    let currentRoster = [];

    function send(action, x) { nodecg.sendMessage('player-control', { action, ...x }) }

    // 追加/上書き（appeal削除・movement等フォームでは扱わない）
    q('#add').addEventListener('click', () => {
        const id = elId.value.trim();
        const robot = elRobot.value.trim();
        if (!id || !robot) return alert("IDとRobotは必須");

        send('add', {
            id, robot,
            robotShort: elRobotShort.value.trim(),
            robotEn: elRobotEn.value.trim(),
            team: elTeam.value.trim(),
            teamShort: elTeamShort.value.trim(),
            teamEn: elTeamEn.value.trim(),
            order: elOrder.value === '' ? undefined : +elOrder.value
        });
    });

    q('#remove').addEventListener('click', () => {
        const opt = q('#list').selectedOptions[0];
        if (opt) send('remove', { id: opt.value });
    });

    q('#clearRoster').addEventListener('click', () => send('clear-roster'));

    function importCsv(mode) {
        const f = elCsv.files?.[0];
        if (!f) return alert("CSV選択を");
        const reader = new FileReader();
        reader.onload = () => {
            const rows = parseCsv(String(reader.result || ''));
            if (rows.length === 0) return alert("データなし");
            send('bulk-set', { mode, rows });
        }
        reader.readAsText(f, 'utf-8');
    }

    /** CSV parser（movement tech power comment含む） */
    function parseCsv(text) {
        text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        const lines = text.split('\n').filter(l => l.trim() !== '');

        const header = split(lines[0]).map(h => h.trim().toLowerCase());
        const idx = Object.fromEntries(header.map((h, i) => [h, i]));

        const pick = (cols, name) => cols[idx[name]] ?? '';

        const rows = [];
        for (let i = 1; i < lines.length; i++) {
            const cols = split(lines[i]);
            rows.push({
                id: pick(cols, 'id'),
                robot: pick(cols, 'robot'),
                robotShort: pick(cols, 'robotshort'),
                robotEn: pick(cols, 'roboten'),
                team: pick(cols, 'team'),
                teamShort: pick(cols, 'teamshort'),
                teamEn: pick(cols, 'teamen'),
                order: pick(cols, 'order'),

                // ★ 追加
                movement: pick(cols, 'movement'),
                tech: pick(cols, 'tech'),
                power: pick(cols, 'power'),
                comment: pick(cols, 'comment'),
            })
        }
        return rows;

        function split(l) {
            let a = [], cur = "", q = false;
            for (let i = 0; i < l.length; i++) {
                const c = l[i];
                if (q) { if (c == '"' && l[i + 1] == '"') { cur += '"'; i++; } else if (c == '"') { q = false; } else cur += c; }
                else { if (c == ',') { a.push(cur); cur = ""; } else if (c == '"') q = true; else cur += c; }
            }
            a.push(cur);
            return a;
        }
    }

    function exportCsv() {
        const H = [
            "id", "robot", "robotShort", "robotEn",
            "team", "teamShort", "teamEn", "order",
            "movement", "tech", "power", "comment"  // appeal削除
        ];

        const body = currentRoster.map(p => H.map(k => esc(p[k])).join(',')).join('\n');
        const csv = H.join(',') + '\n' + body;

        const BOM = new Uint8Array([0xEF, 0xBB, 0xBF]);
        const blob = new Blob([BOM, csv], { type: "text/csv;charset=utf-8;" });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = "player_roster.csv";
        a.click();
    }
    const esc = s => (/[",\n]/.test(s ?? '')) ? `"${String(s ?? '').replace(/"/g, '""')}"` : String(s ?? '');

    roster.on('change', list => {
        currentRoster = list || [];
        render();
    });

    function render() {
        const elList = q('#list');
        elList.innerHTML = "";
        [...currentRoster].sort((a, b) => (a.order ?? 999999) - (b.order ?? 999999))
            .forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id;
                opt.textContent = `[${p.order ?? '-'}] ${p.teamShort || p.team || ''} / ${p.robotShort || p.robot}`;
                elList.append(opt);
            });
        q('#count').textContent = currentRoster.length;
    }
})();
