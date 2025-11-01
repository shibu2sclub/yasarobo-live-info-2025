// extension/graphics-visibility.js
'use strict';

/**
 * graphicsの表示/非表示を集中的に管理するやつ
 *
 * Replicant:
 *  - graphicsVisibility (persistent)
 *    例) { test1: true, test2: false }
 *
 * Message:
 *  - 'graphicsVisibility:set' { id: string, visible: boolean }
 *    → 1件だけ切り替え
 */
module.exports = (nodecg) => {
    const vis = nodecg.Replicant('graphicsVisibility', {
        persistent: true,
        defaultValue: {
            test1: false,
            test2: false
        }
    });

    nodecg.listenFor('graphicsVisibility:set', (msg) => {
        const id = String(msg?.id || '').trim();
        if (!id) return;
        const visible = !!msg.visible;

        const cur = vis.value || {};
        vis.value = {
            ...cur,
            [id]: visible
        };

        nodecg.log.info(`[graphicsVisibility] set ${id} -> ${visible}`);
    });
};
