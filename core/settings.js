import { createRegisteredDefaultSettings } from './settingRegistry.js';

export const DEFAULT_OBSERVER_LOCATION = {
    name: '東京',
    nameEn: 'Tokyo',
    lat: 35.6895,
    lon: 139.6917,
    icon: '🗼',
    surfaceType: 'grass'
};

export const normalizeSurfaceType = (type) => {
    if (!type) return 'water';
    return type === 'land' ? 'desert' : type;
};

export function createDefaultSettings() {
    return {
        ...createRegisteredDefaultSettings(),
        surfaceType: normalizeSurfaceType(DEFAULT_OBSERVER_LOCATION.surfaceType) ?? 'water',
        showCometTail: false,
        cometTailTint: '#b7f0ff',
        cometTailIntensity: 1,
        meteorShowerIntensity: 0
    };
}
