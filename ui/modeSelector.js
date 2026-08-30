import { showLocationScreen } from './locationSelector.js';
import { showEventArchiveScreen, resetArchiveTimeState } from './eventArchive.js';
import { showLibraryGatewayScreen } from './celestialLibrary.js';
import { resetPlanetariumBgm } from './planetariumContext.js';
import { getPhotoAlbumSystem } from './photoAlbum.js';
import { playModeSelectionBgm, playTitleBgm } from './bgmController.js';
import { navigateTo, SCREEN_ROUTES } from './screenRouter.js';

export function initModeSelector(options = {}) {
    const { onEnterLive, onEnterArchive, onEnterLibrary, onEnterAlbum } = options;
    setupEntryButton();
    setupModeButtons({ onEnterLive, onEnterArchive, onEnterLibrary, onEnterAlbum });
    setupBackButton();
}

function setupEntryButton() {
    const enterBtn = document.getElementById('enter-planetarium');
    if (!enterBtn) {
        console.warn('[modeSelector] enter button not found');
        return;
    }

    const showModeSelector = () => {
        resetPlanetariumBgm();
        playModeSelectionBgm();
        navigateTo(SCREEN_ROUTES.MODE);
    };

    enterBtn.addEventListener('click', (e) => {
        e.preventDefault();
        showModeSelector();
    });
}

function setupModeButtons({ onEnterLive, onEnterArchive, onEnterLibrary, onEnterAlbum }) {
    const handleEnterLive = () => {
        onEnterLive?.();
        resetArchiveTimeState();
        showLocationScreen();
    };

    const handleEnterArchive = () => {
        onEnterArchive?.();
        showEventArchiveScreen();
    };

    const handleEnterLibrary = () => {
        onEnterLibrary?.();
        showLibraryGatewayScreen();
    };

    const handleEnterAlbum = () => {
        onEnterAlbum?.();
        const albumSystem = getPhotoAlbumSystem();
        albumSystem.openAlbum();
    };

    const planetariumBtn = document.getElementById('mode-planetarium');
    if (planetariumBtn) {
        planetariumBtn.addEventListener('click', handleEnterLive);
    }

    const archiveBtn = document.getElementById('mode-archive');
    if (archiveBtn) {
        archiveBtn.addEventListener('click', handleEnterArchive);
    }

    const libraryBtn = document.getElementById('mode-library');
    if (libraryBtn) {
        libraryBtn.addEventListener('click', handleEnterLibrary);
    }

    const albumBtn = document.getElementById('mode-album');
    if (albumBtn) {
        albumBtn.addEventListener('click', handleEnterAlbum);
    }

}

function setupBackButton() {
    const backBtn = document.getElementById('mode-back-home');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            navigateTo(SCREEN_ROUTES.HOME);
            playTitleBgm();
        });
    }
}
