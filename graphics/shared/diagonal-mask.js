class DiagonalMask extends HTMLElement {
    connectedCallback() {
        // 二重初期化防止
        if (this._initialized) return;
        this._initialized = true;

        const maskClass = this.getAttribute('mask-class');

        // 既存の子を全部 .diag-mask__content に移す
        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'diag-mask__content';

        while (this.firstChild) {
            contentWrapper.appendChild(this.firstChild);
        }

        // マスク構造を作る
        const wipeWrapper = document.createElement('div');
        wipeWrapper.className = 'diag-mask__wipe-wrapper';

        const viewport = document.createElement('div');
        viewport.className = 'diag-mask__viewport';

        if (maskClass != null) {
            this.classList.add(maskClass);
            wipeWrapper.classList.add(maskClass);
            viewport.classList.add(maskClass);
            contentWrapper.classList.add(maskClass);
        }

        wipeWrapper.appendChild(contentWrapper);
        viewport.appendChild(wipeWrapper);

        // diagonal-mask の中身として再挿入
        this.appendChild(viewport);
    }
}

// 独自タグ <diagonal-mask> を登録
customElements.define('diagonal-mask', DiagonalMask);
