import { DEFAULT_OBSERVER_LOCATION, normalizeSurfaceType } from './settings.js';

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
    if (ctx.starsGroup) ctx.starsGroup.visible = !!settings.showBackgroundStars;
    if (ctx.milkyWayGroup) ctx.milkyWayGroup.visible = !!settings.showMilkyWay;
    if (ctx.constellationSystem) ctx.constellationSystem.updateVisibility(!!settings.showConstellations);
    if (ctx.shootingStarsGroup) ctx.shootingStarsGroup.visible = !!settings.showShootingStars;
    if (ctx.sunSystem?.setEnabled) {
        ctx.sunSystem.setEnabled(!!settings.showSun);
    } else if (ctx.sunGroup) {
        ctx.sunGroup.visible = !!settings.showSun;
    }
    if (ctx.moonGroup) ctx.moonGroup.visible = !!settings.showMoon;
    if (ctx.auroraGroup) ctx.auroraGroup.visible = !!settings.showAurora;
    if (ctx.hourCircleSystem) ctx.hourCircleSystem.setVisible(!!settings.showHourCircles);
    if (ctx.declinationCircleSystem) ctx.declinationCircleSystem.setVisible(!!settings.showDeclinationCircles);
    if (ctx.celestialEquatorSystem) ctx.celestialEquatorSystem.setVisible(!!settings.showCelestialEquator);
    if (ctx.eclipticSystem) ctx.eclipticSystem.setVisible(!!settings.showEcliptic);
    if (ctx.galacticEquatorSystem) ctx.galacticEquatorSystem.setVisible(!!settings.showGalacticEquator);
    if (ctx.lunarOrbitPlaneSystem) ctx.lunarOrbitPlaneSystem.setVisible(!!settings.showLunarOrbit);
    if (ctx.cardinalDirectionSystem) ctx.cardinalDirectionSystem.setVisible(!!settings.showCardinalDirections);
    if (ctx.starTrailSystem) ctx.starTrailSystem.setEnabled(!!settings.showStarTrails);
    if (ctx.lensFlareSystem?.setEnabled) ctx.lensFlareSystem.setEnabled(!!settings.showLensFlare);
    ctx.setSurfaceType(settings.surfaceType ?? DEFAULT_OBSERVER_LOCATION.surfaceType ?? 'water');
    if (ctx.controls) ctx.controls.autoRotate = !!settings.autoRotate;
    if (ctx.cometTailSystem?.setEnabled) {
        ctx.cometTailSystem.setEnabled(!!settings.showCometTail, {
            intensity: settings.cometTailIntensity,
            tint: settings.cometTailTint
        });
    }
    if (ctx.meteorShowerSystem?.setIntensity) {
        ctx.meteorShowerSystem.setIntensity(settings.meteorShowerIntensity ?? 0);
    }

    if (settings.playMusic) {
        ctx.startAmbientSound();
    } else {
        ctx.stopAmbientSound();
    }

    if (settings.playEnvSound) {
        ctx.startEnvironmentSound(settings.surfaceType);
    } else {
        ctx.stopEnvironmentSound();
    }
}

export function syncControlButtons(ctx) {
    const toggleButtons = [
        { id: 'btn-background-stars', flag: 'showBackgroundStars' },
        { id: 'btn-milkyway', flag: 'showMilkyWay' },
        { id: 'btn-constellations', flag: 'showConstellations' },
        { id: 'btn-shooting', flag: 'showShootingStars' },
        { id: 'btn-sun', flag: 'showSun' },
        { id: 'btn-moon', flag: 'showMoon' },
        { id: 'btn-aurora', flag: 'showAurora' },
        { id: 'btn-hour-circles', flag: 'showHourCircles' },
        { id: 'btn-declination-circles', flag: 'showDeclinationCircles' },
        { id: 'btn-celestial-equator', flag: 'showCelestialEquator' },
        { id: 'btn-ecliptic', flag: 'showEcliptic' },
        { id: 'btn-galactic-equator', flag: 'showGalacticEquator' },
        { id: 'btn-lunar-orbit', flag: 'showLunarOrbit' },
        { id: 'btn-cardinal-directions', flag: 'showCardinalDirections' },
        { id: 'btn-star-trails', flag: 'showStarTrails' },
        { id: 'btn-lensflare', flag: 'showLensFlare' },
        { id: 'btn-auto', flag: 'autoRotate' },
        { id: 'btn-music', flag: 'playMusic' },
        { id: 'btn-env-sound', flag: 'playEnvSound' }
    ];

    for (const { id, flag } of toggleButtons) {
        const btn = document.getElementById(id);
        if (btn) {
            btn.classList.toggle('active', !!ctx.settings?.[flag]);
        }
    }

    syncSurfaceButtons(ctx);
}
