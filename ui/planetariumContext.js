let livePlanetarium = null;
let archivePlanetarium = null;
let activePlanetarium = null;

function toggleCanvasVisibility(mode) {
    const liveContainer = document.getElementById('canvas-container');
    const archiveContainer = document.getElementById('archive-canvas-container');
    if (liveContainer) {
        liveContainer.classList.toggle('hidden-canvas', mode === 'archive');
    }
    if (archiveContainer) {
        archiveContainer.classList.toggle('hidden-canvas', mode !== 'archive');
    }
}

export function registerPlanetaria(planets = {}) {
    livePlanetarium = planets.live || null;
    archivePlanetarium = planets.archive || null;
}

export function setActivePlanetarium(mode = 'live') {
    activePlanetarium = mode === 'archive' ? archivePlanetarium : livePlanetarium;
    toggleCanvasVisibility(mode);
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
