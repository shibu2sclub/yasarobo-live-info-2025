// graphics/test2/script.js
(function () {
    const vis = nodecg.Replicant('graphicsVisibility');
    const root = document.getElementById('root');

    vis.on('change', (v = {}) => {
        const visible = !!v.test2;
        root.classList.toggle('active', visible);
        // root.classList.toggle('visible', visible);
    });
})();
