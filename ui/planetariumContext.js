let livePlanetarium = null;
let archivePlanetarium = null;
let activePlanetarium = null;
let planetariumVisible = false;

function applyCanvasVisibility(mode) {
    const liveContainer = document.getElementById('canvas-container');
    const archiveContainer = document.getElementById('archive-canvas-container');
    const targetMode = mode || (activePlanetarium === archivePlanetarium ? 'archive' : 'live');
    const isArchive = targetMode === 'archive';

    if (!planetariumVisible) {
        liveContainer?.classList.add('hidden-canvas');
        archiveContainer?.classList.add('hidden-canvas');
        document.body.classList.remove('planetarium-active');
        return;
    }

    document.body.classList.add('planetarium-active');
    liveContainer?.classList.toggle('hidden-canvas', isArchive);
    archiveContainer?.classList.toggle('hidden-canvas', !isArchive);
}

export function registerPlanetaria(planets = {}) {
    livePlanetarium = planets.live || null;
    archivePlanetarium = planets.archive || null;
    applyCanvasVisibility('live');
}

export function setActivePlanetarium(mode = 'live') {
    activePlanetarium = mode === 'archive' ? archivePlanetarium : livePlanetarium;
    applyCanvasVisibility(mode);
    if (activePlanetarium?.resizeRenderer) {
        activePlanetarium.resizeRenderer();
    }
    return activePlanetarium;
}

export function getActivePlanetarium() {
    return activePlanetarium;
}

export function getLivePlanetarium() {
    return livePlanetarium;
}

export function getArchivePlanetarium() {
    return archivePlanetarium;
}

export function showPlanetariumCanvas() {
    planetariumVisible = true;
    applyCanvasVisibility(activePlanetarium === archivePlanetarium ? 'archive' : 'live');
}

export function hidePlanetariumCanvas() {
    planetariumVisible = false;
    applyCanvasVisibility(activePlanetarium === archivePlanetarium ? 'archive' : 'live');
}

export function destroyPlanetarium(mode = 'active') {
    const target = mode === 'archive'
        ? archivePlanetarium
        : mode === 'live'
            ? livePlanetarium
            : activePlanetarium;
    if (target?.destroy) {
        target.destroy();
    }
}

export function destroyAllPlanetaria() {
    destroyPlanetarium('live');
    destroyPlanetarium('archive');
    hidePlanetariumCanvas();
}

export function resetPlanetariumBgm() {
    [livePlanetarium, archivePlanetarium].forEach((planetarium) => {
        if (!planetarium) return;
        if (planetarium.settings) {
            planetarium.settings.playMusic = false;
        }
        if (typeof planetarium.stopAmbientSound === 'function') {
            planetarium.stopAmbientSound();
        }
        if (typeof planetarium.syncControlButtons === 'function') {
            planetarium.syncControlButtons();
        }
    });
}
