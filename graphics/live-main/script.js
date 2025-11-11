// 10分未満なら分を1桁に省略
window.timerFormatOverride = (text, ms, state) => {
    const [mPart, rest] = text.split(':');
    const m = parseInt(mPart, 10);
    if (m < 10) {
        return `${m}:${rest}`;
    }
    return text;
};

(function () {
    const vis = nodecg.Replicant('graphicsVisibility');
    const visibleRoot = document.getElementById('visible-root');

    vis.on('change', (v = {}) => {
        const visible = !!v.liveMain;
        visibleRoot.classList.toggle('active', visible);
        // root.classList.toggle('visible', visible); // ← visibleも使いたかったらこれもON
    });
})();