const showLoadError = (message) => {
    const loadingElement = document.getElementById('loading');
    if (!loadingElement) return;
    const textElement = loadingElement.querySelector('.loading-text');
    if (textElement) textElement.textContent = message;
    loadingElement.classList.remove('hidden');
};

window.addEventListener('error', (event) => {
    showLoadError('読み込みに失敗しました。ネットワーク/コンソールを確認してください。');
    console.error(event.error || event.message);
});

window.addEventListener('unhandledrejection', (event) => {
    showLoadError('初期化に失敗しました。ネットワーク/コンソールを確認してください。');
    console.error(event.reason);
});
