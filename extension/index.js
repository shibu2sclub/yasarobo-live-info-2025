'use strict';
module.exports = (nodecg) => {
    require('./timer')(nodecg);
    require('./points')(nodecg);
    require('./player')(nodecg);
    require('./results')(nodecg); // ★ 追加：結果保存モジュール
    nodecg.log.info('[yasarobo-live-info-2025] extension initialized');
};
