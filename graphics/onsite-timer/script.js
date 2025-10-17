// 分が10未満なら、10の位を "!" にする（新HTMLフォーマット対応）
// 入力例: "9:58<span> 32</span>" / "12:03<span> 45</span>"
window.timerFormatOverride = (html, remMs, state) => {
    const sep = html.indexOf(':');
    if (sep === -1) return html;

    const mPart = html.slice(0, sep);        // "9" or "12"
    const rest = html.slice(sep + 1);        // "58<span> 32</span>" など
    const m = parseInt(mPart, 10);
    if (!Number.isFinite(m)) return html;

    if (m < 10) {
        // 分が1桁のときでも最後の1文字を「1の位」として扱う
        const ones = mPart.slice(-1);          // "9" or "0" など
        return `!${ones}:${rest}`;
    }
    return html;
};
