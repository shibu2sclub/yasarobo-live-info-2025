(function () {
    const roster = nodecg.Replicant('playerRoster');

    const q = (s) => document.querySelector(s);

    // 入力欄
    const elId = q('#pid');
    const elRobot = q('#robot');
    const elRobotShort = q('#robotShort');
    const elRobotEn = q('#robotEn');
    const elTeam = q('#team');
    const elTeamShort = q('#teamShort');
    const elTeamEn = q('#teamEn');
    const elOrder = q('#order');
    const elAppeal = q('#appeal');
    const elRuleId = q('#ruleId'); // ★ 追加: 任意のルール一意ID

    const elList = q('#list');
    const elCount = q('#count');

    // 最新の名簿を保持（選択→フォーム反映に使う）
    let currentRoster = [];

    function send(action, extra) {
        nodecg.sendMessage('player-control', { action, ...extra });
    }

    // 追加／上書き
    q('#add').addEventListener('click', () => {
        const id = elId.value.trim();
        const robot = elRobot.value.trim();
        if (!id || !robot) { alert('ID と Robot は必須です'); return; }

        send('add', {
            id,
            robot,
            robotShort: elRobotShort.value.trim(),
            robotEn: elRobotEn.value.trim(),
            team: elTeam.value.trim(),
            teamShort: elTeamShort.value.trim(),
            teamEn: elTeamEn.value.trim(),
            order: elOrder.value === '' ? undefined : Number(elOrder.value),
            appeal: elAppeal.value,
            // ★ 追加: 任意の ruleId（空なら undefined として扱われる）
            ruleId: elRuleId.value.trim() || undefined,
        });
    });

    // 削除（選択行）
    q('#remove').addEventListener('click', () => {
        const opt = elList.selectedOptions[0];
        if (!opt) return;
        send('remove', { id: opt.value });
    });

    // 全消去
    q('#clearRoster').addEventListener('click', () => send('clear-roster'));

    // CSV インポート／エクスポート UI
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
                // そのまま extension へ
                send('bulk-set', { mode, rows });
            } catch (e) {
                console.error(e);
                alert('CSVの解析に失敗しました。');
            }
        };
        reader.readAsText(file, 'utf-8');
    }

    // ヘッダ必須。順不同OK。足りない列は空扱い。
    // サポート列: id, robot, robotShort, robotEn, team, teamShort, teamEn, order, appeal, ruleId
    function parseCsv(text) {
        const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
            .map(l => l.trim()).filter(l => l.length > 0);
        if (lines.length === 0) return [];

        const header = splitCsvLine(lines[0]).map(h => h.trim());
        const idx = indexBy(header);

        const out = [];
        for (let i = 1; i < lines.length; i++) {
            const cols = splitCsvLine(lines[i]);
            const get = (name) => {
                const k = idx[name];
                return (k == null) ? '' : (cols[k] ?? '').trim();
            };
            const row = {
                id: get('id'),
                robot: get('robot'),
                robotShort: get('robotShort'),
                robotEn: get('robotEn'),
                team: get('team'),
                teamShort: get('teamShort'),
                teamEn: get('teamEn'),
                order: get('order'),
                appeal: get('appeal'),
                ruleId: get('ruleId'), // ★ 追加
            };
            out.push(row);
        }
        return out;
    }

    function indexBy(header) {
        const names = ['id', 'robot', 'robotShort', 'robotEn', 'team', 'teamShort', 'teamEn', 'order', 'appeal', 'ruleId'];
        const map = {};
        for (const n of names) {
            const k = header.findIndex(h => h.toLowerCase() === n.toLowerCase());
            if (k >= 0) map[n] = k;
        }
        if (map.id == null || map.robot == null) {
            throw new Error('CSVヘッダに id, robot が必要です');
        }
        return map;
    }

    function splitCsvLine(line) {
        const res = []; let cur = ''; let inQ = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (inQ) {
                if (ch === `"`) {
                    if (line[i + 1] === '"') { cur += `"`; i++; }
                    else inQ = false;
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
        const list = currentRoster || [];
        const header = ['id', 'robot', 'robotShort', 'robotEn', 'team', 'teamShort', 'teamEn', 'order', 'appeal', 'ruleId'].join(',');
        const body = list.map(p =>
            [
                escCsv(p.id),
                escCsv(p.robot),
                escCsv(p.robotShort ?? ''),
                escCsv(p.robotEn ?? ''),
                escCsv(p.team ?? ''),
                escCsv(p.teamShort ?? ''),
                escCsv(p.teamEn ?? ''),
                p.order == null ? '' : String(p.order),
                escCsv(p.appeal ?? ''),
                escCsv(p.ruleId ?? ''), // ★ 追加
            ].join(',')
        ).join('\n');
        const csv = header + '\n' + body;
        const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
        const blob = new Blob([bom, csv], { type: 'text/csv;charset=utf-8;' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `player_roster_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.csv`;
        document.body.appendChild(a); a.click(); a.remove();
    }

    function escCsv(s) { s = String(s); const nq = /[",\n]/.test(s); s = s.replace(/"/g, '""'); return nq ? `"${s}"` : s; }

    // ─────────────────────────────────────
    // リスト描画 & 選択 → フォーム反映
    // ─────────────────────────────────────
    roster.on('change', (list = []) => {
        currentRoster = Array.isArray(list) ? list : [];
        const sorted = [...currentRoster].sort((a, b) => {
            const ao = a.order ?? 1e9, bo = b.order ?? 1e9;
            if (ao !== bo) return ao - bo;
            const at = (a.team || '').localeCompare(b.team || ''); if (at !== 0) return at;
            return String(a.id).localeCompare(String(b.id));
        });

        elList.innerHTML = '';
        sorted.forEach(p => {
            const opt = document.createElement('option');
            const order = p.order == null ? '-' : String(p.order);
            const team = p.team ? ` / ${p.team}` : '';
            const robot = p.robotShort || p.robot || '';
            const rule = p.ruleId ? ` [rule:${p.ruleId}]` : ''; // ★ 任意で見やすく
            opt.value = p.id;
            opt.textContent = `[${order}] ID:${p.id}${team} / ${robot}${rule}`;
            elList.appendChild(opt);
        });
        elCount.textContent = String(currentRoster.length);
    });

    // 選択したレコードをフォームへ反映
    elList.addEventListener('change', () => {
        const opt = elList.selectedOptions[0];
        if (!opt) return;
        const id = opt.value;
        const rec = currentRoster.find(r => String(r.id) === String(id));
        if (rec) fillForm(rec);
    });

    // ダブルクリックでも反映（任意・使いやすさ向上）
    elList.addEventListener('dblclick', () => {
        const opt = elList.selectedOptions[0];
        if (!opt) return;
        const id = opt.value;
        const rec = currentRoster.find(r => String(r.id) === String(id));
        if (rec) fillForm(rec);
    });

    function fillForm(rec) {
        elId.value = String(rec.id ?? '');
        elRobot.value = String(rec.robot ?? '');
        elRobotShort.value = String(rec.robotShort ?? '');
        elRobotEn.value = String(rec.robotEn ?? '');
        elTeam.value = String(rec.team ?? '');
        elTeamShort.value = String(rec.teamShort ?? '');
        elTeamEn.value = String(rec.teamEn ?? '');
        elOrder.value = rec.order == null ? '' : String(rec.order);
        elAppeal.value = String(rec.appeal ?? '');
        if (elRuleId) elRuleId.value = String(rec.ruleId ?? '');
    }
})();
