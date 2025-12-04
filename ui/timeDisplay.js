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
    const now = typeof ctx.getSimulatedDate === 'function' ? ctx.getSimulatedDate() : new Date();
    const dateStr = now.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        weekday: 'short'
    });
    const timeStr = now.toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    const dateEl = document.getElementById('current-date');
    if (dateEl) {
        dateEl.textContent = dateStr;
    }
    const timeEl = document.getElementById('current-time');
    if (timeEl) {
        timeEl.textContent = timeStr;
    }
    const modeEl = document.getElementById('time-mode-indicator');
    if (modeEl) {
        const isRealtime = ctx.timeMode === 'realtime';
        const scale = Number.isFinite(ctx.timeScale) ? ctx.timeScale : 1;
        const formattedScale = scale.toLocaleString('ja-JP', { maximumFractionDigits: 2 });
        const scaleLabel = scale === 0 ? '×0 (停止)' : `×${formattedScale}`;
        modeEl.textContent = isRealtime ? 'リアルタイム' : `カスタム ${scaleLabel}`;
    }
    const moonState = typeof moonSystem.syncWithContextTime === 'function'
        ? moonSystem.syncWithContextTime()
        : (() => {
            const state = moonSystem.calculateState(now);
            moonSystem.updateVisuals(state);
            return state;
        })();
    const illuminationPct = Math.round(moonState.illumination * 100);
    const infoEl = document.getElementById('celestial-info');
    if (infoEl) {
        infoEl.textContent = `${moonState.emoji} ${moonState.phaseName} | 輝面比 ${illuminationPct}%`;
    }
}
