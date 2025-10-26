(function () {
    const rules = nodecg.Replicant('rules');
    const rulesLibrary = nodecg.Replicant('rulesLibrary'); // ← ルール一覧とテーマカラー参照用
    const current = nodecg.Replicant('currentPlayer');
    const attempts = nodecg.Replicant('attemptsStore');

    const q = (s) => document.querySelector(s);
    const elCur = q('#cur');
    const elAC = q('#attemptsCount');
    const elCards = q('#cards');
    const elBestFrom = q('#bestFrom');
    const elBestScore = q('#bestScore');
    const elBestTime = q('#bestTime');
    const elBestRuleId = q('#bestRuleId');   // ★ 追加 (HTML側で用意)
    const elBestRulePill = q('#bestRulePill'); // ★ 追加 (HTML側で用意)

    q('#resetAll').addEventListener('click', () => nodecg.sendMessage('results:reset-all'));

    let ac = 2; // attemptsCount
    let libCache = { items: [] }; // rulesLibrary のキャッシュ

    // ユーティリティ -------------------------

    function fmtMs(ms) {
        ms = Math.max(0, Math.floor(ms || 0));
        const cs = Math.floor(ms / 10);
        const m = Math.floor(cs / 6000);
        const s = Math.floor((cs % 6000) / 100);
        const c = cs % 100;
        return `${m}:${String(s).padStart(2, '0')}.${String(c).padStart(2, '0')}`;
    }

    function findRuleDocByRuleId(ruleId) {
        if (!ruleId) return null;
        const items = libCache.items || [];
        return items.find(doc => (doc.rule?.ruleId || '') === ruleId) || null;
    }

    function applyRulePill(pillEl, doc) {
        // pillEl: <span class="rule-pill"></span>
        // doc: rulesLibrary.items[n] or null
        if (!pillEl) return;
        if (!doc) {
            pillEl.style.display = 'none';
            pillEl.textContent = '';
            pillEl.style.backgroundColor = '';
            return;
        }
        const r = doc.rule || {};
        const label =
            r.nameGraphics ||
            r.nameDashboard ||
            r.nameGraphicsShortEn ||
            r.ruleId ||
            '(No Name)';
        const color = r.themeColor || '#AF1E21';

        pillEl.textContent = label;
        pillEl.style.display = 'inline-block';
        pillEl.style.backgroundColor = color;
        pillEl.style.color = '#fff';
    }

    // UI構築 -------------------------

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

        <div class="kv ruleline">
          <span>Rule</span>
          <div class="rulecell">
            <strong class="ruleId">—</strong>
            <span class="rule-pill attemptRulePill" style="display:none;"></span>
          </div>
        </div>

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

        // 項目の順序は現在アクティブな rules の items 順をベースにする
        const itemOrder = (rules.value?.items || []).map(it => it.key);

        // 各試技カードを更新
        const cards = elCards.querySelectorAll('section.card');
        cards.forEach((sec, idx) => {
            const i = idx + 1;
            const entry = rec?.attempts?.[i - 1] || null;

            const elScore = sec.querySelector('.score');
            const elTime = sec.querySelector('.time');
            const elRetry = sec.querySelector('.retry');
            const elRuleId = sec.querySelector('.ruleId');
            const pillEl = sec.querySelector('.attemptRulePill');
            const pre = sec.querySelector('.breakdown');

            elScore.textContent = entry ? `${entry.total}点` : '—';
            elTime.textContent = entry ? fmtMs(entry.matchRemainingMs) : '—';
            elRetry.textContent = entry ? String(entry.retryCount ?? 0) : '—';

            // ruleId と Rule Pill
            if (entry && entry.ruleId) {
                elRuleId.textContent = entry.ruleId;
                const doc = findRuleDocByRuleId(entry.ruleId);
                applyRulePill(pillEl, doc);
            } else {
                elRuleId.textContent = '—';
                applyRulePill(pillEl, null);
            }

            // breakdown表示
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
                // 古いルールで今のrulesに出てこないキーがある場合も拾う
                for (const [key, arr] of Object.entries(entry.breakdown || {})) {
                    if (itemOrder.includes(key)) continue;
                    const marks = arr.map(v => v ? '○' : '×').join(' ');
                    lines.push(`${key}: ${marks}`);
                }
                pre.textContent = lines.length ? lines.join('\n') : '（内訳なし）';
            }
        });

        // ベスト表示 (score/time/どの回か) ＋ その回の ruleId と pill
        const b = rec?.best || null;
        if (b && b.from != null) {
            elBestFrom.textContent = `${b.from}回目`;
            elBestScore.textContent = `${b.total}点`;
            elBestTime.textContent = fmtMs(b.matchRemainingMs);

            // その回に対応する attempt を取り出して ruleId を表示
            const bestAttempt = rec?.attempts?.[b.from - 1] || null;
            if (bestAttempt && bestAttempt.ruleId) {
                elBestRuleId.textContent = bestAttempt.ruleId;
                const doc = findRuleDocByRuleId(bestAttempt.ruleId);
                applyRulePill(elBestRulePill, doc);
            } else {
                elBestRuleId.textContent = '—';
                applyRulePill(elBestRulePill, null);
            }
        } else {
            elBestFrom.textContent = '—';
            elBestScore.textContent = '—';
            elBestTime.textContent = '—';
            elBestRuleId.textContent = '—';
            applyRulePill(elBestRulePill, null);
        }
    }

    // Replicant購読 -------------------------

    // attemptsCount 変化時にカードを作りなおす
    rules.on('change', (v) => {
        const n = Number(v?.attemptsCount ?? 2);
        ac = Number.isFinite(n) && n >= 1 ? Math.floor(n) : 2;
        elAC.textContent = String(ac);
        buildCards();
        render();
    });

    rulesLibrary.on('change', (v) => {
        libCache = v || { items: [] };
        render();
    });

    current.on('change', render);
    attempts.on('change', render);

    // 初期描画
    buildCards();
})();
