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
        showBackgroundStars: true,
        showMilkyWay: true,
        showConstellations: true,
        showShootingStars: true,
        showSun: false,
        showMoon: true,
        showPlanets: true,
        showAurora: true,
        showHourCircles: false,
        showDeclinationCircles: false,
        showCelestialEquator: false,
        showEcliptic: false,
        showGalacticEquator: false,
        showLunarOrbit: false,
        showCardinalDirections: false,
        showStarTrails: false,
        autoRotate: false,
        playMusic: true,
        showLensFlare: true,
        surfaceType: normalizeSurfaceType(DEFAULT_OBSERVER_LOCATION.surfaceType) ?? 'water',
        showCometTail: false,
        cometTailTint: '#b7f0ff',
        cometTailIntensity: 1,
        meteorShowerIntensity: 0,
        playEnvSound: true
    };
}
