(function () {
    const rules = nodecg.Replicant('rules');
    const current = nodecg.Replicant('currentPlayer');
    const attempts = nodecg.Replicant('attemptsStore');

    const q = (s) => document.querySelector(s);
    const elCur = q('#cur');
    const elAC = q('#attemptsCount');
    const elCards = q('#cards');
    const elBestFrom = q('#bestFrom');
    const elBestScore = q('#bestScore');
    const elBestTime = q('#bestTime');

    q('#resetAll').addEventListener('click', () => nodecg.sendMessage('results:reset-all'));

    let ac = 2; // attemptsCount

    function fmtMs(ms) {
        ms = Math.max(0, Math.floor(ms || 0));
        const cs = Math.floor(ms / 10);
        const m = Math.floor(cs / 6000);
        const s = Math.floor((cs % 6000) / 100);
        const c = cs % 100;
        return `${m}:${String(s).padStart(2, '0')}.${String(c).padStart(2, '0')}`;
    }

    function buildCards() {
        elCards.innerHTML = '';
        for (let i = 1; i <= ac; i++) {
            const sec = document.createElement('section');
            sec.className = 'card';
            sec.dataset.index = String(i);
            sec.innerHTML = `
        <h3>競技${i}回目</h3>
        <div class="kv"><span>スコア</span><strong class="score">—</strong></div>
        <div class="kv"><span>競技残</span><strong class="time">—</strong></div>
        <div class="kv"><span>Retry</span><strong class="retry">—</strong></div>
        <details class="details"><summary>内訳を見る</summary><pre class="mono breakdown">—</pre></details>
        <div class="btns">
          <button class="save">保存（${i}回目）</button>
          <button class="reset danger">リセット（${i}回目）</button>
        </div>
      `;
            sec.querySelector('.save').addEventListener('click', () => nodecg.sendMessage('results:save-attempt', { index: i }));
            sec.querySelector('.reset').addEventListener('click', () => nodecg.sendMessage('results:reset-attempt', { index: i }));
            elCards.appendChild(sec);
        }
    }

    function render() {
        const p = current.value;
        const st = attempts.value || { byPlayer: {} };
        const rec = p?.id ? (st.byPlayer?.[p.id] || null) : null;

        elCur.textContent = p ? `ID:${p.id} / ${p.robot}` : '（なし）';

        const itemOrder = (rules.value?.items || []).map(it => it.key);

        const cards = elCards.querySelectorAll('section.card');
        cards.forEach((sec, idx) => {
            const i = idx + 1;
            const entry = rec?.attempts?.[i - 1] || null;

            sec.querySelector('.score').textContent = entry ? `${entry.total}点` : '—';
            sec.querySelector('.time').textContent = entry ? fmtMs(entry.matchRemainingMs) : '—';
            sec.querySelector('.retry').textContent = entry ? String(entry.retryCount ?? 0) : '—';

            // 内訳：key順で ○/× と集計を表示
            const pre = sec.querySelector('.breakdown');
            if (!entry) {
                pre.textContent = '—';
            } else {
                const lines = [];
                for (const key of itemOrder) {
                    const arr = entry.breakdown?.[key] || [];
                    const marks = arr.map(v => v ? '○' : '×').join(' ');
                    const sum = entry.summary?.[key];
                    const label = (rules.value?.items || []).find(it => it.key === key)?.labelDashboard || key;
                    const pts = sum ? ` / ${sum.points}pt` : '';
                    lines.push(`${label}: ${marks} (ok:${sum?.ok ?? 0}, ng:${sum?.ng ?? 0}${pts})`);
                }
                // 未定義のキーが保存されていた場合も一応拾う
                for (const [key, arr] of Object.entries(entry.breakdown || {})) {
                    if (itemOrder.includes(key)) continue;
                    const marks = arr.map(v => v ? '○' : '×').join(' ');
                    lines.push(`${key}: ${marks}`);
                }
                pre.textContent = lines.length ? lines.join('\n') : '（内訳なし）';
            }
        });

        // ベスト
        const b = rec?.best || null;
        elBestFrom.textContent = b ? `${b.from}回目` : '—';
        elBestScore.textContent = b ? `${b.total}点` : '—';
        elBestTime.textContent = b ? fmtMs(b.matchRemainingMs) : '—';
    }

    rules.on('change', (v) => {
        const n = Number(v?.attemptsCount ?? 2);
        ac = Number.isFinite(n) && n >= 1 ? Math.floor(n) : 2;
        elAC.textContent = String(ac);
        buildCards();
        render();
    });

    current.on('change', render);
    attempts.on('change', render);

    // 初期
    buildCards();
})();
