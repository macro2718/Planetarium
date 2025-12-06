import { showLocationScreen, hideLocationScreen } from './locationSelector.js';
import { showEventArchiveScreen, hideEventArchiveScreen } from './eventArchive.js';

export function initModeSelector() {
    setupEntryButton();
    setupModeButtons();
    setupBackButton();
}

function setupEntryButton() {
    const enterBtn = document.getElementById('enter-planetarium');
    const modeScreen = document.getElementById('mode-screen');
    const homeScreen = document.getElementById('home-screen');
    if (!enterBtn) return;

    const newBtn = enterBtn.cloneNode(true);
    enterBtn.parentNode.replaceChild(newBtn, enterBtn);

    newBtn.addEventListener('click', () => {
        document.body.classList.remove('home-visible');
        modeScreen?.classList.remove('hidden');
        homeScreen?.classList.add('hidden');
    });
}

function setupModeButtons() {
    const planetariumBtn = document.getElementById('mode-planetarium');
    if (planetariumBtn) {
        planetariumBtn.addEventListener('click', () => {
            hideArchiveAndMode();
            showLocationScreen();
        });
    }

    const archiveBtn = document.getElementById('mode-archive');
    if (archiveBtn) {
        archiveBtn.addEventListener('click', () => {
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
