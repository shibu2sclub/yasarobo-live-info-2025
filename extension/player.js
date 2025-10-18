'use strict';

module.exports = (nodecg) => {
    /**
     * @typedef {{ id: string, robot: string }} PlayerEntry
     * @typedef {{ id: string, robot: string } | null} CurrentPlayer
     */

    // 他Replicant参照
    const timerState = nodecg.Replicant('timerState');
    const pointState = nodecg.Replicant('pointState');
    const retryCount = nodecg.Replicant('retryCount'); // ★ 追加

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

                    // 得点クリア
                    const ps = pointState.value || {};
                    pointState.value = {
                        red: [],
                        yellow: [],
                        blue: [],
                        free: 0,
                        total: 0,
                        rev: (ps?.rev || 0) + 1
                    };

                    // ★ リトライ数クリア
                    const rc = retryCount.value || { count: 0, rev: 0 };
                    retryCount.value = { count: 0, rev: (rc.rev || 0) + 1 };
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
                }
                break;
            }

            default:
                break;
        }
    });
};
