'use strict';
module.exports = (nodecg) => {
    require('./timer')(nodecg);
    require('./points')(nodecg);
    require('./player')(nodecg);
    require('./results')(nodecg);
    require('./retry')(nodecg);
    require('./ruleslib')(nodecg);
    require('./rules-manager')(nodecg);
    require('./ranking')(nodecg);

    nodecg.log.info('[yasarobo-live-info-2025] extension initialized (timer/points/player/results/retry/ruleslib loaded)');
};
