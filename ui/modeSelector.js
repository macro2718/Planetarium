import { showLocationScreen, hideLocationScreen } from './locationSelector.js';
import { showEventArchiveScreen, hideEventArchiveScreen, resetArchiveTimeState } from './eventArchive.js';

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
    if (!enterBtn) return;

    const showModeSelector = () => {
        document.body.classList.remove('home-visible');
        modeScreen?.classList.remove('hidden');
        homeScreen?.classList.add('hidden');
    };

    enterBtn.addEventListener('click', showModeSelector);

    // デリゲートで保険をかけ、DOM が差し替わっても「星空を見る」から入れるようにする
    document.addEventListener('click', (event) => {
        if (event.target.closest('#enter-planetarium')) {
            showModeSelector();
        }
    });
}

function setupModeButtons({ onEnterLive, onEnterArchive }) {
    const planetariumBtn = document.getElementById('mode-planetarium');
    if (planetariumBtn) {
        planetariumBtn.addEventListener('click', () => {
            onEnterLive?.();
            hideArchiveAndMode();
            resetArchiveTimeState();
            showLocationScreen();
        });
    }

    const archiveBtn = document.getElementById('mode-archive');
    if (archiveBtn) {
        archiveBtn.addEventListener('click', () => {
            onEnterArchive?.();
            hideArchiveAndMode();
            showEventArchiveScreen();
        });
    }
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
