'use strict';

/**
 * ルールのライブラリ管理（保管庫専任）。
 * - rule.ruleId（任意・一意想定）をそのまま保持する
 * - 選択は rulesActiveKey の更新のみ（適用は rules-manager）
 */

module.exports = (nodecg) => {
    const DEFAULT_COLOR = '#AF1E21';
    const HEX6 = /^#([0-9a-fA-F]{6})$/;

    const rulesLibrary = nodecg.Replicant('rulesLibrary', {
        persistent: true,
        defaultValue: { items: [], rev: 0 }
    });
    const rulesActiveKey = nodecg.Replicant('rulesActiveKey', {
        persistent: true,
        defaultValue: null
    });

    function genId() { return `rule-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }

    function normalizeRule(obj) {
        if (!obj || typeof obj !== 'object') throw new Error('rule JSON must be object');
        const out = {};
        // ★ 任意の一意ID（選手連動用）
        out.ruleId = obj.ruleId != null ? String(obj.ruleId).trim() : ''; // 空なら未設定扱い

        out.nameDashboard = String(obj.nameDashboard ?? '');
        out.nameGraphics = String(obj.nameGraphics ?? '');
        out.nameGraphicsShortEn = String(obj.nameGraphicsShortEn ?? '');

        const col = String(obj.themeColor ?? DEFAULT_COLOR).trim();
        out.themeColor = HEX6.test(col) ? col.toUpperCase() : DEFAULT_COLOR;

        const ac = Number(obj.attemptsCount ?? 2);
        out.attemptsCount = (Number.isFinite(ac) && ac >= 1) ? Math.floor(ac) : 2;

        const rc = Number(obj.retryAttemptsCount ?? 3);
        out.retryAttemptsCount = (Number.isFinite(rc) && rc >= 0) ? Math.floor(rc) : 3;

        if (obj.maxPoints != undefined) {
            out.maxPoints = Number(obj.maxPoints);
        }

        if (!Array.isArray(obj.items)) throw new Error('items must be array');
        out.items = obj.items.map((it, i) => {
            if (!it || typeof it !== 'object') throw new Error(`items[${i}] invalid`);
            if (!it.key) throw new Error(`items[${i}].key required`);

            let itemOut = {
                key: String(it.key),
                labelDashboard: String(it.labelDashboard ?? it.key),
                labelGraphics: String(it.labelGraphics ?? it.key),
                pointsCorrect: Number(it.pointsCorrect ?? 0),
                pointsWrong: Number(it.pointsWrong ?? 0),
                cap: Number(it.cap ?? 0),
            }

            if (it.themeColor != undefined) {
                itemOut.themeColor = it.themeColor;
            }
            if (it.icon != undefined) {
                itemOut.icon = it.icon;
            }
            return itemOut;
        });
        return out;
    }

    nodecg.listenFor('ruleslib:replaceAll', (msg) => {
        const arr = Array.isArray(msg?.rules) ? msg.rules : [];
        const items = arr.map((raw) => {
            const rule = normalizeRule(raw);
            const id = genId();
            const title = rule.nameDashboard || rule.nameGraphics || rule.nameGraphicsShortEn || `rule ${id.slice(-4)}`;
            return { id, meta: { title, createdAt: Date.now() }, rule };
        });
        rulesLibrary.value = { items, rev: (rulesLibrary.value?.rev || 0) + 1 };
        if (items[0]) rulesActiveKey.value = items[0].id; // 実適用は rules-manager 側
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
            rulesActiveKey.value = list[0]?.id ?? null;
        }
    });

    nodecg.listenFor('ruleslib:clear', () => {
        rulesLibrary.value = { items: [], rev: (rulesLibrary.value?.rev || 0) + 1 };
        rulesActiveKey.value = null;
    });

    nodecg.listenFor('ruleslib:select', (msg) => {
        const id = String(msg?.id || '');
        if (!id) return;
        rulesActiveKey.value = id; // ★ 実適用は rules-manager
    });
};
