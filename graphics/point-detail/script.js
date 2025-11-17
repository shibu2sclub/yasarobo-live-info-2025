(function () {
    ;
})();

(function () {
    const vis = nodecg.Replicant('graphicsVisibility');
    const visibleRoot = document.getElementById('visible-root');

    vis.on('change', (v = {}) => {
        const visible = !!v.pointDetail;
        visibleRoot.classList.toggle('active', visible);
    });
})();