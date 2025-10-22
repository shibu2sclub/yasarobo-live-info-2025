'use strict';

module.exports = (nodecg) => {
    /**
     * @typedef {{
     *   id: string,
     *   robot: string,
     *   robotShort?: string,
     *   robotEn?: string,
     *   team?: string,
     *   teamShort?: string,
     *   teamEn?: string,
     *   order?: number,
     *   appeal?: string,
     *   ruleId?: string        // ★ 追加：任意のルール一意ID
     * }} PlayerEntry
     * @typedef {PlayerEntry | null} CurrentPlayer
     */

    // 他Replicant参照（選手切替時のリセットで利用）
    const timerState = nodecg.Replicant('timerState');
    const pointState = nodecg.Replicant('pointState');
    const retryCount = nodecg.Replicant('retryCount');

    // ルール連動用（ruleslib/rules-manager 構成）
    const rulesLibrary = nodecg.Replicant('rulesLibrary');   // { items:[{id, meta, rule:{ruleId,...}}], rev }
    const rulesActiveKey = nodecg.Replicant('rulesActiveKey'); // string|null

    /** @type {import('nodecg/types/replicant').Replicant<PlayerEntry[]>} */
    const playerRoster = nodecg.Replicant('playerRoster', {
        persistent: true,
        defaultValue: []
    });

    /** @type {import('nodecg/types/replicant').Replicant<CurrentPlayer>} */
    const currentPlayer = nodecg.Replicant('currentPlayer', {
        persistent: false,
        defaultValue: null
    });

    // 受け取った行をサニタイズ
    function sanitizeEntry(row) {
        const id = String(row?.id ?? '').trim();
        const robot = String(row?.robot ?? '').trim();
        if (!id || !robot) return null;

        const entry = {
            id,
            robot,
            robotShort: strOrEmpty(row?.robotShort),
            robotEn: strOrEmpty(row?.robotEn),
            team: strOrEmpty(row?.team),
            teamShort: strOrEmpty(row?.teamShort),
            teamEn: strOrEmpty(row?.teamEn),
            order: numOrUndef(row?.order),
            appeal: strOrEmpty(row?.appeal),
            // ★ 追加：CSV/フォームに任意で ruleId を入れられる
            ruleId: optStr(row?.ruleId),
        };
        return entry;
    }
    function strOrEmpty(v) { return v == null ? '' : String(v); }
    function optStr(v) {
        if (v == null) return undefined;
        const s = String(v).trim();
        return s ? s : undefined;
    }
    function numOrUndef(v) {
        if (v === '' || v == null) return undefined;
        const n = Number(v);
        return Number.isFinite(n) ? n : undefined;
    }

    nodecg.listenFor('player-control', (msg) => {
        switch (msg.action) {
            case 'add': {
                // 追加/上書き：全フィールド対応
                const entry = sanitizeEntry(msg);
                if (!entry) return;

                const list = Array.isArray(playerRoster.value) ? [...playerRoster.value] : [];
                const idx = list.findIndex(p => p.id === entry.id);
                if (idx >= 0) list[idx] = entry;
                else list.push(entry);
                playerRoster.value = list;
                break;
            }

            case 'remove': {
                const id = String(msg.id || '').trim();
                if (!id) return;
                const list = (playerRoster.value || []).filter(p => p.id !== id);
                playerRoster.value = list;
                if (currentPlayer.value?.id === id) currentPlayer.value = null;
                break;
            }

            case 'clear-roster': {
                playerRoster.value = [];
                currentPlayer.value = null;
                break;
            }

            case 'select': {
                const id = String(msg.id || '').trim();
                const p = (playerRoster.value || []).find(x => x.id === id) || null;
                // ★ currentPlayer に「全フィールド」を渡します（既存表示は id/robot を使っているので影響なし）
                currentPlayer.value = p ? { ...p } : null;

                if (p) {
                    // タイマーを準備満タン停止へ
                    const s = timerState.value || {};
                    timerState.value = {
                        ...s,
                        stage: 'prep',
                        running: false,
                        startEpochMs: 0,
                        accumulatedMs: 0,
                        ended: false,
                        rev: (s?.rev || 0) + 1
                    };

                    // 得点クリア（※現行の pointState 仕様に合わせています）
                    const ps = pointState.value || {};
                    pointState.value = {
                        red: [],
                        yellow: [],
                        blue: [],
                        free: 0,
                        total: 0,
                        rev: (ps?.rev || 0) + 1
                    };

                    // リトライ数クリア
                    const rc = retryCount.value || { count: 0, rev: 0 };
                    retryCount.value = { count: 0, rev: (rc.rev || 0) + 1 };

                    // ★ ルール自動切替：CSVに ruleId があれば、rulesLibrary から一致する rule.ruleId を探して適用
                    const rid = (p.ruleId || '').trim();
                    if (rid) {
                        const lib = rulesLibrary.value || { items: [] };
                        const found = (lib.items || []).find(doc => (doc.rule?.ruleId || '') === rid);
                        if (found) {
                            rulesActiveKey.value = found.id; // → rules-manager が rules を適用＆副作用実行
                            nodecg.log.info(`[player] auto-switched rule by ruleId="${rid}" -> doc.id=${found.id}`);
                        } else {
                            nodecg.log.warn(`[player] ruleId="${rid}" not found in rulesLibrary`);
                        }
                    }
                }
                break;
            }

            case 'clear-current': {
                currentPlayer.value = null;
                break;
            }

            case 'bulk-set': {
                // CSV 取り込み：{ mode: 'replace'|'upsert', rows: [...] }
                const mode = msg.mode === 'upsert' ? 'upsert' : 'replace';
                const rows = Array.isArray(msg.rows) ? msg.rows : [];

                const sanitized = rows.map(sanitizeEntry).filter(Boolean);
                if (mode === 'replace') {
                    playerRoster.value = /** @type {PlayerEntry[]} */(sanitized);
                    // 現在選択の有効性を確認
                    if (currentPlayer.value && !sanitized.find(p => p.id === currentPlayer.value.id)) {
                        currentPlayer.value = null;
                    }
                } else {
                    // upsert
                    const map = new Map((playerRoster.value || []).map(p => [p.id, p]));
                    for (const e of sanitized) map.set(e.id, e);
                    playerRoster.value = Array.from(map.values());
                }
                break;
            }

            default:
                break;
        }
    });
};
