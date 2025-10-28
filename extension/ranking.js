'use strict';

/**
 * ランキング生成拡張
 *
 * 出力:
 *  rankingData (persistent: false)
 *    {
 *      byRule: {
 *        [ruleId:string]: Array<{
 *          playerId: string,
 *          robotShort: string,
 *          teamShort: string,
 *          total: number,
 *          matchRemainingMs: number
 *        }>
 *      },
 *      rev: number
 *    }
 *
 * ロジック:
 *  - 各選手ごとに attemptsStore.byPlayer[playerId].attempts を見る
 *  - 各 attempt の ruleId ごとに、その選手の「ベスト記録(同ルール内)」を抽出
 *     (score優先 / 同点なら残り時間が長い方)
 *  - それを ruleId 単位で集約し、ソートしてランキング化
 */

module.exports = (nodecg) => {
    const playerRoster = nodecg.Replicant('playerRoster');   // [{id, robotShort, teamShort, ...}, ...]
    const attemptsStore = nodecg.Replicant('attemptsStore');  // { byPlayer: { [id]: { attempts:[...], best:{...} } }, rev }
    const rulesLibrary = nodecg.Replicant('rulesLibrary');   // { items:[{ rule:{ruleId,...} }], rev }

    const rankingData = nodecg.Replicant('rankingData', {
        persistent: false,
        defaultValue: {
            byRule: {},
            rev: 0
        }
    });

    function deepClone(o) { return JSON.parse(JSON.stringify(o)); }

    // 選手の表示用短縮名を取り出す
    function rosterInfoFor(playerId) {
        const list = playerRoster.value || [];
        const p = list.find(e => e.id === playerId);
        if (!p) {
            return {
                robotShort: '',
                teamShort: ''
            };
        }
        return {
            robotShort: p.robotShort || p.robot || '',
            teamShort: p.teamShort || p.team || ''
        };
    }

    // attemptsの配列から、ruleIdごとのベスト記録を返す
    // return: Map<ruleId, {total, matchRemainingMs}>
    function bestByRuleForAttempts(attemptsArr) {
        const bestMap = new Map();
        (attemptsArr || []).forEach(attempt => {
            if (!attempt) return;
            const rid = attempt.ruleId || '';
            if (!rid) return; // ruleIdが無い記録は集計対象外とする

            const cur = bestMap.get(rid);
            if (!cur) {
                bestMap.set(rid, {
                    total: attempt.total,
                    matchRemainingMs: attempt.matchRemainingMs
                });
                return;
            }
            // 比較: 得点が高い > 残り時間が長い
            if (
                attempt.total > cur.total ||
                (attempt.total === cur.total &&
                    attempt.matchRemainingMs > cur.matchRemainingMs)
            ) {
                bestMap.set(rid, {
                    total: attempt.total,
                    matchRemainingMs: attempt.matchRemainingMs
                });
            }
        });
        return bestMap;
    }

    function recomputeRanking() {
        const store = attemptsStore.value || { byPlayer: {} };
        const byPlayer = store.byPlayer || {};

        /** @type {Record<string, Array<any>>} */
        const tmpByRule = {};

        for (const playerId of Object.keys(byPlayer)) {
            const pdata = byPlayer[playerId] || {};
            const attemptsArr = pdata.attempts || [];

            // ruleIdごとのベスト
            const map = bestByRuleForAttempts(attemptsArr);

            // rosterから表示名
            const names = rosterInfoFor(playerId);

            // 各ruleIdについて集計行を作る
            for (const [rid, rec] of map.entries()) {
                if (!tmpByRule[rid]) tmpByRule[rid] = [];
                tmpByRule[rid].push({
                    playerId,
                    robotShort: names.robotShort,
                    teamShort: names.teamShort,
                    total: rec.total,
                    matchRemainingMs: rec.matchRemainingMs
                });
            }
        }

        // 各ruleId内で並べ替え（score desc, time desc）
        for (const rid of Object.keys(tmpByRule)) {
            tmpByRule[rid].sort((a, b) => {
                if (b.total !== a.total) {
                    return b.total - a.total;
                }
                return b.matchRemainingMs - a.matchRemainingMs;
            });
        }

        // Replicant更新
        const old = rankingData.value || { byRule: {}, rev: 0 };
        rankingData.value = {
            byRule: deepClone(tmpByRule),
            rev: (old.rev || 0) + 1
        };
    }

    // 変化を監視して都度再計算
    attemptsStore.on('change', recomputeRanking);
    playerRoster.on('change', recomputeRanking);

    // rulesLibrary はプルダウン生成に使うのでランキング自体には影響ないが、
    // ルールが消えたり名前が変わった時にUI側で欲しいので一応保持
    rulesLibrary.on('change', (v) => {
        // キャッシュ的に更新したい場合ここでrankingにもrev++しても良いけど、
        // 順位自体は変わらないので放置でもOK
        // 今回は何もしない
    });

    // 初回
    recomputeRanking();
};
