// 分が10未満なら、10の位を "!" にする
window.timerFormatOverride = (text, ms, state) => {
    // text 例: "09:58.32"
    const [mPart, rest] = text.split(':');
    const [mTens, mOnes] = mPart.split('');
    if (parseInt(mPart, 10) < 10) {
        return `!${mOnes}:${rest}`;
    }
    return text;
};
