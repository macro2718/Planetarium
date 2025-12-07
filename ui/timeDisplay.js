import { formatCoordinate } from '../data/locations.js';

export function setupTimeDisplay(getPlanetarium) {
    const update = () => updateTimeDisplay(getPlanetarium);
    update();
    const handle = setInterval(update, 1000);
    return {
        dispose() {
            clearInterval(handle);
        }
    };
}

function updateTimeDisplay(getPlanetarium) {
    const ctx = typeof getPlanetarium === 'function' ? getPlanetarium() : null;
    if (!ctx) return;
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
        const isFixedTime = ctx.timeMode === 'fixed-time';
        const paused = ctx.isTimePaused && !isRealtime;
        if (isRealtime) {
            modeEl.textContent = 'リアルタイム';
        } else if (isFixedTime) {
            const scale = Number.isFinite(ctx.dayScale) ? ctx.dayScale : 1;
            const formattedScale = scale.toLocaleString('ja-JP', { maximumFractionDigits: 3 });
            const label = scale === 0 || paused ? '一時停止' : `${formattedScale} 日/秒`;
            modeEl.textContent = `日付送り (${label})`;
        } else {
            const scale = Number.isFinite(ctx.timeScale) ? ctx.timeScale : 1;
            const formattedScale = scale.toLocaleString('ja-JP', { maximumFractionDigits: 3 });
            const label = scale === 0 || paused ? '一時停止' : `×${formattedScale}`;
            modeEl.textContent = `倍速再生 (${label})`;
        }
    }
    const locationEl = document.getElementById('location-info');
    if (locationEl) {
        const lat = ctx.observer?.lat;
        const lon = ctx.observer?.lon;
        const locationInfo = ctx.observerLocationInfo || {};
        const icon = locationInfo.icon || '📍';
        const name = locationInfo.name || 'カスタム地点';
        const englishName = locationInfo.nameEn ? ` (${locationInfo.nameEn})` : '';
        const latText = Number.isFinite(lat) ? formatCoordinate(lat, true) : '---';
        const lonText = Number.isFinite(lon) ? formatCoordinate(lon, false) : '---';
        locationEl.textContent = `${icon} 観測地点: ${name}${englishName} | ${latText} / ${lonText}`;
    }

    const moonSystem = ctx.moonSystem;
    if (moonSystem) {
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
}
}
