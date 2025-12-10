import { Planetarium } from './core/planetarium.js';
import { attachUIInteractions } from './ui/interactionController.js';
import { setupTimeDisplay } from './ui/timeDisplay.js';
import { initLocationSelector, setPlanetarium } from './ui/locationSelector.js';
import { initModeSelector } from './ui/modeSelector.js';
import { initEventArchive, setArchivePlanetarium } from './ui/eventArchive.js';
import { initCelestialLibrary } from './ui/celestialLibrary.js';
import { initHomeScene } from './ui/homeScene.js';
import { playTitleBgm } from './ui/bgmController.js';
import { initHomeSettingsPanel } from './ui/settingsPanel.js';
import {
    registerPlanetaria,
    setActivePlanetarium,
    getActivePlanetarium,
    getArchivePlanetarium,
    getLivePlanetarium
} from './ui/planetariumContext.js';

const livePlanetarium = new Planetarium({ containerId: 'canvas-container' });
const archivePlanetarium = new Planetarium({
    containerId: 'archive-canvas-container',
    isArchive: true
});

registerPlanetaria({ live: livePlanetarium, archive: archivePlanetarium });
setActivePlanetarium('live');

attachUIInteractions(getActivePlanetarium);
setupTimeDisplay(getActivePlanetarium);

setPlanetarium(getLivePlanetarium());
initLocationSelector({
    onSelect: (location) => {
        console.log(`観測地を変更: ${location.name}`);
    }
});

setArchivePlanetarium(getArchivePlanetarium());
initEventArchive({
    onSelect: (event) => {
        console.log(`クロノスカイ: ${event.title} に移動`);
    }
});

initCelestialLibrary();
initHomeScene();
initHomeSettingsPanel();

initModeSelector({
    onEnterLive: () => setActivePlanetarium('live'),
    onEnterArchive: () => setActivePlanetarium('archive'),
    onEnterLibrary: () => setActivePlanetarium('live'),
    onEnterAlbum: () => setActivePlanetarium('live')
});

playTitleBgm();

const loadingOverlay = document.getElementById('loading');
if (loadingOverlay) {
    loadingOverlay.classList.add('hidden');
}
