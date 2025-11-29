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
     *   movement?: string,   // 移動方法
     *   tech?: string,       // 使用技術
     *   power?: string,      // 電源
     *   comment?: string     // ひとこと（改行可）
     * }} PlayerEntry
     */

    const timerState = nodecg.Replicant('timerState');
    const pointState = nodecg.Replicant('pointState');
    const retryCount = nodecg.Replicant('retryCount');

    const playerRoster = nodecg.Replicant('playerRoster', {
        persistent: true,
        defaultValue: []
    });

    const currentPlayer = nodecg.Replicant('currentPlayer', {
        persistent: false,
        defaultValue: null
    });

    // -------- CSV行 → PlayerEntry --------
    function sanitizeEntry(row) {
        const id = String(row?.id ?? '').trim();
        const robot = String(row?.robot ?? '').trim();
        if (!id || !robot) return null;

        return {
            id,
            robot,
            robotShort: strOrEmpty(row?.robotShort),
            robotEn: strOrEmpty(row?.robotEn),
            team: strOrEmpty(row?.team),
            teamShort: strOrEmpty(row?.teamShort),
            teamEn: strOrEmpty(row?.teamEn),
            order: numOrUndef(row?.order),

            // ★ 新規
            movement: strOrEmpty(row?.movement),
            tech: strOrEmpty(row?.tech),
            power: strOrEmpty(row?.power),
            comment: strOrEmpty(row?.comment),
        };
    }
    const strOrEmpty = v => v == null ? '' : String(v);
    const numOrUndef = v => v === '' || v == null ? undefined : (Number.isFinite(+v) ? +v : undefined);

    // -------- Message Handlers --------
    nodecg.listenFor('player-control', msg => {
        switch (msg.action) {
            case 'add': {
                const entry = sanitizeEntry(msg);
                if (!entry) return;

                const list = [...(playerRoster.value || [])];
                const i = list.findIndex(p => p.id === entry.id);
                if (i >= 0) list[i] = entry;
                else list.push(entry);
                playerRoster.value = list;
                break;
            }

            case 'remove': {
                const id = String(msg.id || '').trim();
                if (!id) return;
                playerRoster.value = (playerRoster.value || []).filter(p => p.id !== id);
                if (currentPlayer.value?.id === id) currentPlayer.value = null;
                break;
            }

            case 'clear-roster':
                playerRoster.value = [];
                currentPlayer.value = null;
                break;

            case 'select': {
                const id = String(msg.id || '');
                const p = playerRoster.value?.find(v => v.id === id) || null;
                currentPlayer.value = p ? { ...p } : null;

                if (p) {
                    // タイマー初期化
                    const s = timerState.value || {};
                    timerState.value = {
                        ...s, stage: 'prep', running: false,
                        startEpochMs: 0, accumulatedMs: 0, ended: false,
                        rev: (s.rev || 0) + 1
                    };

                    // 得点リセット
                    pointState.value = { red: [], yellow: [], blue: [], free: 0, total: 0, rev: (pointState.value?.rev || 0) + 1 };

                    // リトライリセット
                    retryCount.value = { count: 0, rev: (retryCount.value?.rev || 0) + 1 };
                }
                break;
            }

            case 'clear-current':
                currentPlayer.value = null;
                break;

            case 'bulk-set': {
                const mode = msg.mode === 'upsert' ? 'upsert' : 'replace';
                const rows = msg.rows || [];
                const sanitized = rows.map(sanitizeEntry).filter(Boolean);

                if (mode === 'replace') {
                    playerRoster.value = sanitized;
                    if (currentPlayer.value && !sanitized.find(p => p.id === currentPlayer.value.id))
                        currentPlayer.value = null;
                } else {
                    const map = new Map((playerRoster.value || []).map(p => [p.id, p]));
                    sanitized.forEach(e => map.set(e.id, e));
                    playerRoster.value = [...map.values()];
                }
                break;
            }
        }
    });
};
