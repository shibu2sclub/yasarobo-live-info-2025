'use strict';

/**
 * 得点：
 * - red/yellow/blue: boolean[] （true=色正解=3点, false=誤り=1点）
 * - free: 自由ボール（5点）カウント ← ★ 上限1回
 * - total: 合計点
 * - ENFORCE_CAP: データ側でも上限を強制
 */
module.exports = (nodecg) => {
    /**
     * @typedef {{
     *   red: boolean[];
     *   yellow: boolean[];
     *   blue: boolean[];
     *   free: number;
     *   total: number;
     *   rev: number;
     * }} PointState
     */

    /** @type {import('nodecg/types/replicant').Replicant<PointState>} */
    const pointState = nodecg.Replicant('pointState', {
        persistent: false,
        defaultValue: {
            red: [],
            yellow: [],
            blue: [],
            free: 0,
            total: 0,
            rev: 0
        }
    });

    const ENFORCE_CAP = true;
    const COLOR_CAP = 5;
    const FREE_CAP = 1; // ★ 自由ボールは1回のみ

    const scoreColor = (arr) => (arr || []).reduce((acc, ok) => acc + (ok ? 3 : 1), 0);
    const recalcTotal = (ps) =>
        scoreColor(ps.red) + scoreColor(ps.yellow) + scoreColor(ps.blue) + (ps.free || 0) * 5;

    nodecg.listenFor('point-control', (msg) => {
        const ps = pointState.value;

        switch (msg.action) {
            case 'add-color': {
                const color = msg.color;
                const ok = !!msg.ok;
                if (!['red', 'yellow', 'blue'].includes(color)) return;

                const arr = Array.isArray(ps[color]) ? ps[color] : [];
                if (ENFORCE_CAP && arr.length >= COLOR_CAP) {
                    pointState.value = { ...ps, rev: ps.rev + 1 };
                    return;
                }
                arr.push(ok);
                const total = recalcTotal({ ...ps, [color]: arr });
                pointState.value = { ...ps, [color]: arr, total, rev: ps.rev + 1 };
                break;
            }

            case 'add-free': {
                let free = ps.free || 0;
                if (ENFORCE_CAP && free >= FREE_CAP) {
                    pointState.value = { ...ps, rev: ps.rev + 1 };
                    return;
                }
                free = free + 1;
                const total = scoreColor(ps.red) + scoreColor(ps.yellow) + scoreColor(ps.blue) + free * 5;
                pointState.value = { ...ps, free, total, rev: ps.rev + 1 };
                break;
            }

            case 'reset': {
                pointState.value = { red: [], yellow: [], blue: [], free: 0, total: 0, rev: ps.rev + 1 };
                break;
            }

            default:
                break;
        }
    });

    // 任意のハートビート（表示再同期用）
    setInterval(() => {
        const ps = pointState.value;
        pointState.value = { ...ps, rev: ps.rev + 1 };
    }, 5000);
};
