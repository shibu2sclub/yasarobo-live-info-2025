// graphics/test1/script.js
(function () {
    const vis = nodecg.Replicant('graphicsVisibility');
    const visibleRoot = document.getElementById('visible-root');

    vis.on('change', (v = {}) => {
        const visible = !!v.test1;
        visibleRoot.classList.toggle('active', visible);
        // root.classList.toggle('visible', visible); // ← visibleも使いたかったらこれもON
    });
})();
