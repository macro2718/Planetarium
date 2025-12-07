import { showLocationScreen, hideLocationScreen } from './locationSelector.js';
import { showEventArchiveScreen, hideEventArchiveScreen, resetArchiveTimeState } from './eventArchive.js';
import { resetPlanetariumBgm } from './planetariumContext.js';

export function initModeSelector(options = {}) {
    const { onEnterLive, onEnterArchive } = options;
    setupEntryButton();
    setupModeButtons({ onEnterLive, onEnterArchive });
    setupBackButton();
}

function setupEntryButton() {
    const enterBtn = document.getElementById('enter-planetarium');
    const modeScreen = document.getElementById('mode-screen');
    const homeScreen = document.getElementById('home-screen');
    
    console.log('[modeSelector] setupEntryButton called');
    console.log('[modeSelector] enterBtn:', enterBtn);
    console.log('[modeSelector] modeScreen:', modeScreen);
    console.log('[modeSelector] homeScreen:', homeScreen);
    
    if (!enterBtn) {
        console.error('[modeSelector] enter-planetarium button not found!');
        return;
    }

    const showModeSelector = () => {
        console.log('[modeSelector] showModeSelector called');
        resetPlanetariumBgm();
        document.body.classList.remove('home-visible');
        modeScreen?.classList.remove('hidden');
        homeScreen?.classList.add('hidden');
        console.log('[modeSelector] modeScreen hidden:', modeScreen?.classList.contains('hidden'));
        console.log('[modeSelector] homeScreen hidden:', homeScreen?.classList.contains('hidden'));
    };

    enterBtn.addEventListener('click', (e) => {
        console.log('[modeSelector] enterBtn clicked directly');
        e.stopPropagation();
        showModeSelector();
    });

    // デリゲートで保険をかけ、DOM が差し替わっても「星空を見る」から入れるようにする
    document.addEventListener('click', (event) => {
        if (event.target.closest('#enter-planetarium')) {
            console.log('[modeSelector] enterBtn clicked via delegation');
            showModeSelector();
        }
    });
}

function setupModeButtons({ onEnterLive, onEnterArchive }) {
    const handleEnterLive = () => {
        onEnterLive?.();
        hideArchiveAndMode();
        resetArchiveTimeState();
        showLocationScreen();
    };

    const handleEnterArchive = () => {
        onEnterArchive?.();
        hideArchiveAndMode();
        showEventArchiveScreen();
    };

    const planetariumBtn = document.getElementById('mode-planetarium');
    if (planetariumBtn) {
        planetariumBtn.addEventListener('click', handleEnterLive);
    }

    const archiveBtn = document.getElementById('mode-archive');
    if (archiveBtn) {
        archiveBtn.addEventListener('click', handleEnterArchive);
    }

    // モード選択画面のDOMが差し替わっても動作するように、デリゲートでも拾う
    document.addEventListener('click', (event) => {
        if (event.target.closest('#mode-planetarium')) {
            handleEnterLive();
            return;
        }

        if (event.target.closest('#mode-archive')) {
            handleEnterArchive();
        }
    });
}

function setupBackButton() {
    const backBtn = document.getElementById('mode-back-home');
    const homeScreen = document.getElementById('home-screen');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            homeScreen?.classList.remove('hidden');
            hideLocationScreen();
            hideEventArchiveScreen();
            const modeScreen = document.getElementById('mode-screen');
            modeScreen?.classList.add('hidden');
            document.body.classList.add('home-visible');
        });
    }
}

function hideArchiveAndMode() {
    const modeScreen = document.getElementById('mode-screen');
    modeScreen?.classList.add('hidden');
    hideEventArchiveScreen();
    document.body.classList.remove('home-visible');
}
