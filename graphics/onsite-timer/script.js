// 分が10未満なら、10の位を "!" にする（新HTMLフォーマット対応）
// 入力例: "<span class='timer-min'>9</span>:58<span> 32</span>" / "<span class='timer-min'>12</span>:03<span> 45</span>"
window.timerFormatOverride = (html, remMs, state) => {
    const sep = html.indexOf(':');
    if (sep === -1) return html;

    const mPart = html.slice(0, sep);  // "<span class='timer-min'>9</span>" のような部分
    const rest = html.slice(sep + 1);  // 残りのHTML

    // <span>タグ内の数値を抽出
    const match = mPart.match(/>(\d+)</);
    if (!match) return html;

    const m = parseInt(match[1], 10);
    if (!Number.isFinite(m)) return html;

    if (m < 10) {
        // span内の数値部分だけ !9 に書き換える
        const replaced = mPart.replace(/>(\d+)</, `>!$1<`);
        return `${replaced}:${rest}`;
    }
    return html;
};
