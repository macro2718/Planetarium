const SCREEN_FADE_MS = 600; // Keep in sync with CSS --screen-fade-duration

/**
 * アルバムの戻り方と同一の挙動でモード選択へ戻す。
 * - 元画面に hidden を付与してフェードアウト（CSSのtransition任せ）
 * - モード選択/ホームの hidden を外す
 * - body クラスは album と同じく mode-screen-visible を付与し、home-visible を外す
 * @param {HTMLElement|string|null} fromScreen - フェードアウトさせたい画面のDOMもしくはID
 */
export function transitionToModeScreen(fromScreen = null) {
    const sourceEl = resolveElement(fromScreen);
    const modeScreen = document.getElementById('mode-screen');
    const homeScreen = document.getElementById('home-screen');

    if (modeScreen) {
        modeScreen.classList.remove('hidden');
    }
    if (homeScreen) {
        homeScreen.classList.remove('hidden');
    }

    if (sourceEl) {
        // CSS transitionでフェードアウトさせる
        sourceEl.classList.add('hidden');
    }

    document.body.classList.add('mode-screen-visible');
    document.body.classList.remove('home-visible');
}

function resolveElement(target) {
    if (!target) return null;
    if (typeof target === 'string') {
        return document.getElementById(target);
    }
    if (target instanceof HTMLElement) return target;
    return null;
}

export { SCREEN_FADE_MS };
