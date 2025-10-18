'use strict';

/**
 * 競技者管理：
 * - playerRoster: [{id, robot}, ...] 永続
 * - currentPlayer: {id, robot} | null 一時
 * - メッセージ: add/remove/clear-roster/select/clear-current/bulk-set
 *   - bulk-set: { mode: 'replace'|'upsert', rows: [{id,robot},...] }
 */
module.exports = (nodecg) => {
    /**
     * @typedef {{ id: string, robot: string }} PlayerEntry
     * @typedef {{ id: string, robot: string } | null} CurrentPlayer
     */

    const timerState = nodecg.Replicant('timerState');   // from timer.js
    const pointState = nodecg.Replicant('pointState');   // from points.js


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

    nodecg.listenFor('player-control', (msg) => {
        switch (msg.action) {
            case 'add': {
                const id = String(msg.id || '').trim();
                const robot = String(msg.robot || '').trim();
                if (!id || !robot) return;
                const list = Array.isArray(playerRoster.value) ? [...playerRoster.value] : [];
                const idx = list.findIndex(p => p.id === id);
                if (idx >= 0) list[idx] = { id, robot };
                else list.push({ id, robot });
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
                currentPlayer.value = p ? { id: p.id, robot: p.robot } : null;

                // ▼ 追加：プレイヤー選択時にタイマー＆得点をリセット
                if (p) {
                    // タイマーを「準備満タン・停止・stage=prep・ended=false」に戻す
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

                    // 得点をクリア
                    const ps = pointState.value || {};
                    pointState.value = {
                        red: [],
                        yellow: [],
                        blue: [],
                        free: 0,
                        total: 0,
                        rev: (ps?.rev || 0) + 1
                    };
                }
                break;
            }

            case 'clear-current': {
                currentPlayer.value = null;
                break;
            }

            case 'bulk-set': {
                // { mode: 'replace'|'upsert', rows: [{id,robot},...] }
                const mode = msg.mode === 'upsert' ? 'upsert' : 'replace';
                const rows = Array.isArray(msg.rows) ? msg.rows : [];
                const sanitized = rows
                    .map(({ id, robot }) => ({ id: String(id || '').trim(), robot: String(robot || '').trim() }))
                    .filter(p => p.id && p.robot);

                if (mode === 'replace') {
                    playerRoster.value = sanitized;
                    if (currentPlayer.value && !sanitized.find(p => p.id === currentPlayer.value.id)) {
                        currentPlayer.value = null;
                    }
                } else {
                    const map = new Map((playerRoster.value || []).map(p => [p.id, p]));
                    sanitized.forEach(p => map.set(p.id, p));
                    playerRoster.value = Array.from(map.values());
                    // current は触らない
                }
                break;
            }

            default:
                break;
        }
    });
};
