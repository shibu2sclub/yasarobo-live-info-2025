'use strict';

/**
 * 複数ルールのライブラリ管理。
 *
 * Replicants:
 * - rulesLibrary (persistent): { items: RuleDoc[], rev: number }
 *   RuleDoc = { id: string, meta: {title:string, createdAt:number}, rule: Rule }
 *   Rule = {
 *     nameDashboard?: string,
 *     nameGraphics?: string,
 *     nameGraphicsShortEn?: string,
 *     attemptsCount?: number,
 *     retryAttemptsCount?: number,
 *     items: Array<{ key:string, labelDashboard:string, labelGraphics:string, pointsCorrect:number, pointsWrong:number, cap:number }>
 *   }
 *
 * - rulesActiveKey (persistent): string | null
 * - rules (persistent): Rule  ← システム全体が購読（互換維持）
 *
 * Messages:
 * - 'ruleslib:replaceAll' { rules: Rule[] }   // 置換インポート（複数ファイルまとめて）
 * - 'ruleslib:upsert'     { id?, rule: Rule } // 1件追加/上書き
 * - 'ruleslib:remove'     { id }
 * - 'ruleslib:clear'      {}
 * - 'ruleslib:select'     { id }              // 対象をアクティブに（rules replicant に反映）
 */

module.exports = (nodecg) => {
    const rulesLibrary = nodecg.Replicant('rulesLibrary', {
        persistent: true,
        defaultValue: { items: [], rev: 0 }
    });
    const rulesActiveKey = nodecg.Replicant('rulesActiveKey', {
        persistent: true,
        defaultValue: null
    });
    const rules = nodecg.Replicant('rules', {
        persistent: true,
        // デフォルト1件（従来どおり）。選択で随時上書き。
        defaultValue: {
            nameDashboard: '標準ルール',
            nameGraphics: 'STANDARD RULE',
            nameGraphicsShortEn: 'STD',
            attemptsCount: 2,
            retryAttemptsCount: 3,
            items: [
                { key: 'red', labelDashboard: '赤', labelGraphics: 'RED', pointsCorrect: 3, pointsWrong: 1, cap: 5 },
                { key: 'yellow', labelDashboard: '黄', labelGraphics: 'YELLOW', pointsCorrect: 3, pointsWrong: 1, cap: 5 },
                { key: 'blue', labelDashboard: '青', labelGraphics: 'BLUE', pointsCorrect: 3, pointsWrong: 1, cap: 5 },
                { key: 'free', labelDashboard: '自由', labelGraphics: 'FREE', pointsCorrect: 5, pointsWrong: 0, cap: 1 }
            ]
        }
    });

    // ─────────── utils
    function genId() { return `rule-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }
    function deepClone(o) { return JSON.parse(JSON.stringify(o)); }

    function normalizeRule(obj) {
        if (!obj || typeof obj !== 'object') throw new Error('rule JSON must be object');
        const out = {};
        out.nameDashboard = String(obj.nameDashboard ?? '');
        out.nameGraphics = String(obj.nameGraphics ?? '');
        out.nameGraphicsShortEn = String(obj.nameGraphicsShortEn ?? '');
        const ac = Number(obj.attemptsCount ?? 2);
        out.attemptsCount = (Number.isFinite(ac) && ac >= 1) ? Math.floor(ac) : 2;
        const rc = Number(obj.retryAttemptsCount ?? 3);
        out.retryAttemptsCount = (Number.isFinite(rc) && rc >= 0) ? Math.floor(rc) : 3;

        if (!Array.isArray(obj.items)) throw new Error('items must be array');
        out.items = obj.items.map((it, i) => {
            if (!it || typeof it !== 'object') throw new Error(`items[${i}] invalid`);
            if (!it.key) throw new Error(`items[${i}].key required`);
            return {
                key: String(it.key),
                labelDashboard: String(it.labelDashboard ?? it.key),
                labelGraphics: String(it.labelGraphics ?? it.key),
                pointsCorrect: Number(it.pointsCorrect ?? 0),
                pointsWrong: Number(it.pointsWrong ?? 0),
                cap: Number(it.cap ?? 0)
            };
        });
        return out;
    }

    function setActiveById(id) {
        const lib = rulesLibrary.value || { items: [] };
        const doc = (lib.items || []).find(x => x.id === id) || null;
        if (!doc) return false;
        rules.value = deepClone(doc.rule);
        rulesActiveKey.value = id;
        return true;
    }

    // ─────────── messages
    nodecg.listenFor('ruleslib:replaceAll', (msg) => {
        const arr = Array.isArray(msg?.rules) ? msg.rules : [];
        const items = arr.map((raw) => {
            const rule = normalizeRule(raw);
            const id = genId();
            const title = rule.nameDashboard || rule.nameGraphics || rule.nameGraphicsShortEn || `rule ${id.slice(-4)}`;
            return { id, meta: { title, createdAt: Date.now() }, rule };
        });
        rulesLibrary.value = { items, rev: (rulesLibrary.value?.rev || 0) + 1 };
        if (items[0]) setActiveById(items[0].id); // 最初の1件を自動選択
    });

    nodecg.listenFor('ruleslib:upsert', (msg) => {
        const rule = normalizeRule(msg?.rule);
        const id = msg?.id ? String(msg.id) : genId();
        const title = rule.nameDashboard || rule.nameGraphics || rule.nameGraphicsShortEn || `rule ${id.slice(-4)}`;

        const lib = rulesLibrary.value || { items: [], rev: 0 };
        const list = Array.isArray(lib.items) ? [...lib.items] : [];
        const idx = list.findIndex(x => x.id === id);
        if (idx >= 0) list[idx] = { id, meta: { title, createdAt: list[idx].meta?.createdAt ?? Date.now() }, rule };
        else list.push({ id, meta: { title, createdAt: Date.now() }, rule });

        rulesLibrary.value = { items: list, rev: (lib.rev || 0) + 1 };
    });

    nodecg.listenFor('ruleslib:remove', (msg) => {
        const id = String(msg?.id || '');
        if (!id) return;
        const lib = rulesLibrary.value || { items: [], rev: 0 };
        const list = (lib.items || []).filter(x => x.id !== id);
        rulesLibrary.value = { items: list, rev: (lib.rev || 0) + 1 };
        if (rulesActiveKey.value === id) {
            rulesActiveKey.value = null;
            // 代替で何か選ぶなら先頭を選択
            if (list[0]) setActiveById(list[0].id);
        }
    });

    nodecg.listenFor('ruleslib:clear', () => {
        rulesLibrary.value = { items: [], rev: (rulesLibrary.value?.rev || 0) + 1 };
        rulesActiveKey.value = null;
    });

    nodecg.listenFor('ruleslib:select', (msg) => {
        const id = String(msg?.id || '');
        if (!id) return;
        setActiveById(id);
    });
};
