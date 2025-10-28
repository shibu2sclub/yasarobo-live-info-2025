'use strict';

/**
 * ランキング表示用に「どのルールIDを放送に出すか」を管理する小さなReplicant。
 *
 * Replicants:
 * - rankingDisplayConfig (persistent: true)
 *    {
 *      ruleId: string | null
 *    }
 *
 * Messages:
 * - 'rankingDisplay:setRule' { ruleId: string }
 *
 * ※ 今回はメッセージを先に用意しておく（後でdashboardにUIを作れる）
 */

module.exports = (nodecg) => {
    const rankingDisplayConfig = nodecg.Replicant('rankingDisplayConfig', {
        persistent: true,
        defaultValue: {
            ruleId: null
        }
    });

    nodecg.listenFor('rankingDisplay:setRule', msg => {
        const rid = (msg && typeof msg.ruleId === 'string') ? msg.ruleId.trim() : '';
        rankingDisplayConfig.value = { ruleId: rid || null };
        nodecg.log.info('[rankingDisplay] ruleId set to', rankingDisplayConfig.value.ruleId);
    });
};
