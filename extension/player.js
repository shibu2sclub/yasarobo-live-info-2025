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
     *   ruleId?: string
     * }} PlayerEntry
     * @typedef {PlayerEntry | null} CurrentPlayer
     */

    // 他Replicant参照（選手切替時のリセットで利用）
    const timerState = nodecg.Replicant('timerState');
    const pointState = nodecg.Replicant('pointState');
    const retryCount = nodecg.Replicant('retryCount');

    // ルール連動用
    const rulesLibrary = nodecg.Replicant('rulesLibrary');   // { items:[{id, rule:{ruleId,...}, meta}], rev }
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

    // roster 内の特定IDをパッチ更新（currentPlayer も同期）
    function patchPlayerInRoster(playerId, patch) {
        const list = Array.isArray(playerRoster.value) ? [...playerRoster.value] : [];
        const idx = list.findIndex(p => p.id === playerId);
        if (idx < 0) return false;
        const next = { ...list[idx], ...patch };
        list[idx] = next;
        playerRoster.value = list;

        if (currentPlayer.value?.id === playerId) {
            currentPlayer.value = { ...next };
        }
        return true;
    }

    function autoSwitchRuleByRuleId(ruleId) {
        if (!ruleId) return false;
        const lib = rulesLibrary.value || { items: [] };
        const found = (lib.items || []).find(doc => (doc.rule?.ruleId || '') === ruleId);
        if (!found) return false;
        rulesActiveKey.value = found.id; // rules-manager が rules を適用＆副作用実行
        nodecg.log.info(`[player] auto-switched rule by ruleId="${ruleId}" -> doc.id=${found.id}`);
        return true;
    }

    nodecg.listenFor('player-control', (msg) => {
        switch (msg.action) {
            case 'add': {
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

                    // 得点クリア（旧仕様に合わせる）
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

                    // ★ 指定ルール（ruleId）があれば自動切替
                    if (p.ruleId) {
                        const ok = autoSwitchRuleByRuleId(String(p.ruleId));
                        if (!ok) nodecg.log.warn(`[player] ruleId="${p.ruleId}" not found in rulesLibrary`);
                    }
                }
                break;
            }

            case 'clear-current': {
                currentPlayer.value = null;
                break;
            }

            case 'bulk-set': {
                const mode = msg.mode === 'upsert' ? 'upsert' : 'replace';
                const rows = Array.isArray(msg.rows) ? msg.rows : [];

                const sanitized = rows.map(sanitizeEntry).filter(Boolean);
                if (mode === 'replace') {
                    playerRoster.value = /** @type {PlayerEntry[]} */(sanitized);
                    if (currentPlayer.value && !sanitized.find(p => p.id === currentPlayer.value.id)) {
                        currentPlayer.value = null;
                    }
                } else {
                    const map = new Map((playerRoster.value || []).map(p => [p.id, p]));
                    for (const e of sanitized) map.set(e.id, e);
                    playerRoster.value = Array.from(map.values());
                }
                break;
            }

            // ★ 追加：rules-select からの「指定ルールに設定」
            case 'bind-rule-current': {
                const rid = String(msg.ruleId || '').trim();
                const cur = currentPlayer.value;
                if (!cur?.id) return;
                const ok = patchPlayerInRoster(cur.id, { ruleId: rid || undefined });
                if (ok) nodecg.log.info(`[player] bound ruleId="${rid}" to player=${cur.id}`);
                break;
            }

            // ★ 追加：player-select の「指定ルール解除」
            case 'clear-rule-current': {
                const cur = currentPlayer.value;
                if (!cur?.id) return;
                const ok = patchPlayerInRoster(cur.id, { ruleId: undefined });
                if (ok) nodecg.log.info(`[player] cleared bound rule for player=${cur.id}`);
                break;
            }

            default:
                break;
        }
    });
};
