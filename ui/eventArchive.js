import { HISTORICAL_EVENTS } from '../data/historicalEvents.js';
import { hideEventEffectPanel, showEventEffectPanel } from './eventEffectPanel.js';
import {
    destroyAllPlanetaria,
    getArchivePlanetarium,
    getLivePlanetarium,
    resetPlanetariumBgm,
    setActivePlanetarium,
    showPlanetariumCanvas
} from './planetariumContext.js';

let currentPlanetarium = null;
let onEventSelected = null;

function resetToRealtime() {
    if (!currentPlanetarium) return;

    const isCustomOrPaused = currentPlanetarium.timeMode !== 'realtime' || currentPlanetarium.isTimePaused;
    if (isCustomOrPaused) {
        currentPlanetarium.setTimeMode('realtime');
        currentPlanetarium.toggleTimePause(false);
    }

    hideEventEffectPanel();
}

export function initEventArchive(options = {}) {
    onEventSelected = options.onSelect;
    setupEventList();
    setupBackButton();
}

export function setArchivePlanetarium(planetarium) {
    currentPlanetarium = planetarium;
}

function setupEventList() {
    const grid = document.getElementById('archive-grid');
    if (!grid) return;

    grid.innerHTML = '';

    HISTORICAL_EVENTS.forEach(event => {
        const card = document.createElement('div');
        card.className = 'archive-card';
        card.dataset.eventId = event.id;

        const localDate = new Date(event.dateTime).toLocaleString('ja-JP', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            timeZoneName: 'short'
        });

        card.innerHTML = `
            <div class="archive-card-head">
                <div class="archive-badge">CHRONO SKY</div>
                <div class="archive-date">${localDate}</div>
            </div>
            <h3 class="archive-title">${event.title}</h3>
            <p class="archive-description">${event.description}</p>
            <div class="archive-meta">
                <div class="archive-location">観測地: ${event.location.name}</div>
                <div class="archive-tags">${event.tags.map(tag => `<span class="archive-tag">${tag}</span>`).join('')}</div>
            </div>
            <button class="archive-select">この瞬間へ移動</button>
        `;

        card.querySelector('.archive-select')?.addEventListener('click', () => {
            activateEvent(event);
        });

        grid.appendChild(card);
    });
}

function activateEvent(event) {
    if (currentPlanetarium) {
        setActivePlanetarium('archive');
        showPlanetariumCanvas();
        currentPlanetarium.start();
        currentPlanetarium.resetState();
        currentPlanetarium.setObserverLocation(event.location.lat, event.location.lon, event.location);
        currentPlanetarium.setTimeMode('custom', {
            date: new Date(event.dateTime),
            timeScale: 0
        });
        currentPlanetarium.toggleTimePause(true);
        applyEventEffects(event);
    }

    hideEventArchiveScreen();
    document.body.classList.remove('home-visible');
    if (onEventSelected) {
        onEventSelected(event);
    }
}

function setupBackButton() {
    const backBtn = document.getElementById('archive-back');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            showModeScreen();
            hideEventArchiveScreen();
        });
    }
}

export function showEventArchiveScreen() {
    const archiveScreen = document.getElementById('archive-screen');
    resetPlanetariumBgm();
    destroyAllPlanetaria();
    currentPlanetarium?.stop();
    getLivePlanetarium()?.stop();
    if (archiveScreen) {
        archiveScreen.classList.remove('hidden');
    }
    document.body.classList.remove('home-visible');
}

export function hideEventArchiveScreen() {
    const archiveScreen = document.getElementById('archive-screen');
    if (archiveScreen) {
        archiveScreen.classList.add('hidden');
    }
}

export function resetArchiveTimeState() {
    resetToRealtime();
}

function applyEventEffects(event) {
    if (!currentPlanetarium) return;
    hideEventEffectPanel();

    const effects = event?.effects ?? [];
    let settingsChanged = false;

    effects.forEach(effect => {
        switch (effect.type) {
        case 'comet-tail':
            currentPlanetarium.settings.showCometTail = effect.enabled !== false;
            currentPlanetarium.settings.cometTailIntensity = effect.intensity ?? 1;
            if (effect.tint) {
                currentPlanetarium.settings.cometTailTint = effect.tint;
            }
            settingsChanged = true;
            break;
        case 'meteor-shower':
            currentPlanetarium.settings.showShootingStars = effect.enabled !== false;
            currentPlanetarium.settings.meteorShowerIntensity = effect.intensity ?? 0.6;
            settingsChanged = true;
            break;
        case 'info-panel':
            showEventEffectPanel({
                title: effect.title || event.title,
                body: effect.body || event.description
            });
            break;
        case 'auto-rotate':
            currentPlanetarium.settings.autoRotate = effect.enabled !== false;
            settingsChanged = true;
            break;
        default:
            break;
        }
    });

    if (settingsChanged) {
        currentPlanetarium.applySettingsToSystems();
        currentPlanetarium.syncControlButtons();
    }
}

function showModeScreen() {
    const modeScreen = document.getElementById('mode-screen');
    const homeScreen = document.getElementById('home-screen');
    getArchivePlanetarium()?.stop();
    getLivePlanetarium()?.stop();
    destroyAllPlanetaria();
    if (modeScreen) {
        modeScreen.classList.remove('hidden');
    }
    if (homeScreen) {
        homeScreen.classList.remove('hidden');
    }
    document.body.classList.add('mode-screen-visible');
    document.body.classList.add('home-visible');
}
