// 10分未満なら分を1桁に省略
window.timerFormatOverride = (text, ms, state) => {
    const [mPart, rest] = text.split(':');
    const m = parseInt(mPart, 10);
    if (m < 10) {
        return `${m}:${rest}`;
    }
    return text;
};
