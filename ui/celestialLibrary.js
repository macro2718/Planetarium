import { destroyAllPlanetaria, resetPlanetariumBgm } from './planetariumContext.js';
import { playModeSelectionBgm } from './bgmController.js';
import { navigateTo, SCREEN_ROUTES, setScreenVisible } from './screenRouter.js';
import { CelestialLibraryStore } from './library/libraryStore.js';
import { buildConstellationContent } from './library/constellationContent.js';
import { LibraryDetailView } from './library/libraryDetailView.js';
import {
    disposeShelfScene,
    resizeShelfScene,
    setupShelfScene,
    snapShelfToLeftEdge,
    startShelfScene,
    stopShelfScene,
    updateShelfBooks
} from './library/shelfScene.js';

const libraryStore = new CelestialLibraryStore();
const detailView = new LibraryDetailView();

function prepareLibraryMode() {
    resetPlanetariumBgm();
    destroyAllPlanetaria();
    detailView.hide();
}

export function initCelestialLibrary() {
    libraryStore.load();
    setupGatewayScreen();
    setupBackButton();
    detailView.setup();
    setupShelfScene({
        onSelect: (content, contentIndex) => detailView.open(content, contentIndex)
    });
    renderLibraryList();
}

export function showLibraryGatewayScreen() {
    prepareLibraryMode();
    hideCelestialLibraryScreen();
    playModeSelectionBgm();
    navigateTo(SCREEN_ROUTES.LIBRARY_GATEWAY);
}

export function hideLibraryGatewayScreen() {
    setScreenVisible('library-gateway-screen', false);
}

export function showCelestialLibraryScreen() {
    prepareLibraryMode();
    playModeSelectionBgm();
    navigateTo(SCREEN_ROUTES.LIBRARY);
    renderLibraryList();
    resizeShelfScene();
    snapShelfToLeftEdge();
    startShelfScene();
}

export function hideCelestialLibraryScreen() {
    stopShelfScene();
    setScreenVisible('library-screen', false);
    detailView.hide();
}

export function unlockConstellation(constellationName) {
    if (libraryStore.unlock(constellationName)) renderLibraryList();
}

export function disposeCelestialLibrary() {
    disposeShelfScene();
    detailView.dispose();
}

function setupGatewayScreen() {
    const enterBtn = document.getElementById('library-enter-shelf');
    if (enterBtn) {
        enterBtn.addEventListener('click', () => {
            showCelestialLibraryScreen();
        });
    }

    const backBtn = document.getElementById('library-gateway-back');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            showModeScreen();
        });
    }
}

function setupBackButton() {
    const backBtn = document.getElementById('library-back');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            showLibraryGatewayScreen();
        });
    }
}

function renderLibraryList() {
    const count = document.getElementById('library-count');

    const names = libraryStore.getUnlockedNames();
    const contents = names.map(buildConstellationContent);
    detailView.setContents(contents);

    if (count) {
        count.textContent = names.length;
    }

    if (!contents.length) {
        detailView.hide();
        updateShelfBooks([]);
        toggleEmptyState(true);
        return;
    }

    toggleEmptyState(false);
    updateShelfBooks(contents);
}

function toggleEmptyState(isEmpty) {
    const empty = document.getElementById('library-empty');
    if (empty) {
        empty.classList.toggle('hidden', !isEmpty);
    }
}

function showModeScreen() {
    playModeSelectionBgm();
    navigateTo(SCREEN_ROUTES.MODE);
}
