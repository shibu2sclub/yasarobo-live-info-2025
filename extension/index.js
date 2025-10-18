'use strict';
module.exports = (nodecg) => {
    require('./timer')(nodecg);
    require('./points')(nodecg);
    require('./player')(nodecg);
    require('./results')(nodecg);
    require('./retry')(nodecg);
    nodecg.log.info('[yasarobo-live-info-2025] extension initialized (timer/points/player/results/retry loaded)');
};
