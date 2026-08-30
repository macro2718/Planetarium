import { DEFAULT_OBSERVER_LOCATION, normalizeSurfaceType } from './settings.js';
import {
    applyAllRegisteredSettings,
    getButtonSettingDescriptors
} from './settingRegistry.js';

export function syncSurfaceButtons(ctx, type = ctx.settings?.surfaceType) {
    const normalized = normalizeSurfaceType(type);
    const surfaceButtons = document.querySelectorAll('[data-surface-type]');
    surfaceButtons.forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.surfaceType === normalized);
    });
}

export function applySurfaceType(ctx, type) {
    const normalized = normalizeSurfaceType(type);
    const applied = ctx.surfaceSystem?.setSurfaceType
        ? ctx.surfaceSystem.setSurfaceType(normalized)
        : normalized;
    if (applied) {
        ctx.settings.surfaceType = applied;
        syncSurfaceButtons(ctx, applied);
    }
    return applied;
}

export function applySettingsToSystems(ctx) {
    const settings = ctx.settings ?? {};
    applyAllRegisteredSettings(ctx);
    ctx.setSurfaceType(settings.surfaceType ?? DEFAULT_OBSERVER_LOCATION.surfaceType ?? 'water');
    if (ctx.cometTailSystem?.setEnabled) {
        ctx.cometTailSystem.setEnabled(!!settings.showCometTail, {
            intensity: settings.cometTailIntensity,
            tint: settings.cometTailTint
        });
    }
    if (ctx.meteorShowerSystem?.setIntensity) {
        ctx.meteorShowerSystem.setIntensity(settings.meteorShowerIntensity ?? 0);
    }
}

export function syncControlButtons(ctx) {
    for (const { buttonId, key } of getButtonSettingDescriptors()) {
        const btn = document.getElementById(buttonId);
        if (btn) {
            btn.classList.toggle('active', !!ctx.settings?.[key]);
        }
    }

    syncSurfaceButtons(ctx);
}
