export function setupTimeDisplay(ctx, moonSystem) {
    const update = () => updateTimeDisplay(ctx, moonSystem);
    update();
    const handle = setInterval(update, 1000);
    return {
        dispose() {
            clearInterval(handle);
        }
    };
}

function updateTimeDisplay(ctx, moonSystem) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    const timeEl = document.getElementById('current-time');
    if (timeEl) {
        timeEl.textContent = timeStr;
    }
    const moonState = moonSystem.calculateState(now);
    moonSystem.updateVisuals(moonState);
    const illuminationPct = Math.round(moonState.illumination * 100);
    const infoEl = document.getElementById('celestial-info');
    if (infoEl) {
        infoEl.textContent = `${moonState.emoji} ${moonState.phaseName} | 輝面比 ${illuminationPct}%`;
    }
}
