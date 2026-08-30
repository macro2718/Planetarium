const descriptor = (key, defaultValue, buttonId, apply) => Object.freeze({
    key,
    defaultValue,
    buttonId,
    apply
});

export const SETTING_DESCRIPTORS = Object.freeze([
    descriptor('showBackgroundStars', true, 'btn-background-stars', (ctx, value) => {
        if (ctx.starsGroup) ctx.starsGroup.visible = value;
    }),
    descriptor('showMilkyWay', true, 'btn-milkyway', (ctx, value) => {
        if (ctx.milkyWayGroup) ctx.milkyWayGroup.visible = value;
    }),
    descriptor('showConstellations', true, 'btn-constellations', (ctx, value) => {
        ctx.constellationSystem?.updateVisibility(value);
    }),
    descriptor('showShootingStars', true, 'btn-shooting', (ctx, value) => {
        if (ctx.shootingStarsGroup) ctx.shootingStarsGroup.visible = value;
    }),
    descriptor('showSun', false, 'btn-sun', (ctx, value) => {
        if (ctx.sunSystem?.setEnabled) ctx.sunSystem.setEnabled(value);
        else if (ctx.sunGroup) ctx.sunGroup.visible = value;
    }),
    descriptor('showMoon', true, 'btn-moon', (ctx, value) => {
        if (ctx.moonGroup) ctx.moonGroup.visible = value;
    }),
    descriptor('showPlanets', true, null, (ctx, value) => {
        if (ctx.planetGroup) ctx.planetGroup.visible = value;
    }),
    descriptor('showAurora', true, 'btn-aurora', (ctx, value) => {
        if (ctx.auroraGroup) ctx.auroraGroup.visible = value;
    }),
    descriptor('showHourCircles', false, 'btn-hour-circles', (ctx, value) => {
        ctx.hourCircleSystem?.setVisible(value);
    }),
    descriptor('showDeclinationCircles', false, 'btn-declination-circles', (ctx, value) => {
        ctx.declinationCircleSystem?.setVisible(value);
    }),
    descriptor('showCelestialEquator', false, 'btn-celestial-equator', (ctx, value) => {
        ctx.celestialEquatorSystem?.setVisible(value);
    }),
    descriptor('showEcliptic', false, 'btn-ecliptic', (ctx, value) => {
        ctx.eclipticSystem?.setVisible(value);
    }),
    descriptor('showGalacticEquator', false, 'btn-galactic-equator', (ctx, value) => {
        ctx.galacticEquatorSystem?.setVisible(value);
    }),
    descriptor('showLunarOrbit', false, 'btn-lunar-orbit', (ctx, value) => {
        ctx.lunarOrbitPlaneSystem?.setVisible(value);
    }),
    descriptor('showCardinalDirections', false, 'btn-cardinal-directions', (ctx, value) => {
        ctx.cardinalDirectionSystem?.setVisible(value);
    }),
    descriptor('showStarTrails', false, 'btn-star-trails', (ctx, value) => {
        ctx.starTrailSystem?.setEnabled(value);
    }),
    descriptor('showLensFlare', true, 'btn-lensflare', (ctx, value) => {
        ctx.lensFlareSystem?.setEnabled(value);
    }),
    descriptor('autoRotate', false, 'btn-auto', (ctx, value) => {
        if (ctx.controls) ctx.controls.autoRotate = value;
    }),
    descriptor('playMusic', true, 'btn-music', (ctx, value) => {
        if (value) ctx.startAmbientSound?.();
        else ctx.stopAmbientSound?.();
    }),
    descriptor('playEnvSound', true, 'btn-env-sound', (ctx, value) => {
        if (value) ctx.startEnvironmentSound?.(ctx.settings?.surfaceType);
        else ctx.stopEnvironmentSound?.();
    })
]);

const DESCRIPTORS_BY_KEY = new Map(
    SETTING_DESCRIPTORS.map((entry) => [entry.key, entry])
);

export function createRegisteredDefaultSettings() {
    return Object.fromEntries(
        SETTING_DESCRIPTORS.map(({ key, defaultValue }) => [key, defaultValue])
    );
}

export function getButtonSettingDescriptors() {
    return SETTING_DESCRIPTORS.filter(({ buttonId }) => Boolean(buttonId));
}

export function applyRegisteredSetting(ctx, key, value = ctx.settings?.[key]) {
    const entry = DESCRIPTORS_BY_KEY.get(key);
    if (!entry) return false;
    entry.apply(ctx, Boolean(value));
    return true;
}

export function setRegisteredSetting(ctx, key, value) {
    if (!DESCRIPTORS_BY_KEY.has(key) || !ctx.settings) return false;
    ctx.settings[key] = Boolean(value);
    applyRegisteredSetting(ctx, key, ctx.settings[key]);
    return ctx.settings[key];
}

export function toggleRegisteredSetting(ctx, key) {
    return setRegisteredSetting(ctx, key, !ctx.settings?.[key]);
}

export function applyAllRegisteredSettings(ctx) {
    SETTING_DESCRIPTORS.forEach(({ key, defaultValue }) => {
        const value = ctx.settings?.[key] ?? defaultValue;
        applyRegisteredSetting(ctx, key, value);
    });
}
