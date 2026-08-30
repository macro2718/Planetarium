import { HISTORICAL_EVENTS } from '../data/historicalEvents.js';
import { formatCoordinate } from '../data/locations.js';
import { hideEventEffectPanel, showEventEffectPanel } from './eventEffectPanel.js';
import {
    destroyAllPlanetaria,
    getArchivePlanetarium,
    getLivePlanetarium,
    hidePlanetariumCanvas,
    resetPlanetariumBgm,
    setActivePlanetarium,
    showPlanetariumCanvas
} from './planetariumContext.js';
import { enterPlanetariumScene, playModeSelectionBgm } from './bgmController.js';
import { navigateTo, SCREEN_ROUTES, setScreenVisible } from './screenRouter.js';
import { GlobePreview } from './globePreview.js';

let currentPlanetarium = null;
let onEventSelected = null;
let selectedEvent = null;
const timelineItems = new Map();
let miniGlobe = null;

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
    setupTimeline();
    setupBackButton();
    setupObserveButton();
    initMiniGlobe();
}

export function setArchivePlanetarium(planetarium) {
    currentPlanetarium = planetarium;
}

function setupTimeline() {
    const timelineEl = document.getElementById('archive-timeline');
    if (!timelineEl) return;

    timelineEl.innerHTML = '';
    timelineItems.clear();

    const sortedEvents = [...HISTORICAL_EVENTS].sort((a, b) => {
        const aDate = new Date(a.dateTime).getTime();
        const bDate = new Date(b.dateTime).getTime();
        return aDate - bDate;
    });

    sortedEvents.forEach(event => {
        const year = getEventYear(event.dateTime);
        const item = document.createElement('div');
        item.className = 'archive-timeline-item';
        item.tabIndex = 0;
        item.dataset.eventId = event.id;
        item.innerHTML = `
            <div class="archive-timeline-year">${year}</div>
            <div class="archive-timeline-title">${event.title}</div>
        `;

        item.addEventListener('click', () => setSelectedEvent(event));
        item.addEventListener('keydown', (evt) => {
            if (evt.key === 'Enter' || evt.key === ' ') {
                evt.preventDefault();
                setSelectedEvent(event);
            }
        });

        timelineEl.appendChild(item);
        timelineItems.set(event.id, item);
    });

    if (selectedEvent) {
        setSelectedEvent(selectedEvent);
    } else if (sortedEvents[0]) {
        setSelectedEvent(sortedEvents[0]);
    }
}

function setupObserveButton() {
    const observeBtn = document.getElementById('archive-observe');
    if (!observeBtn) return;

    observeBtn.addEventListener('click', () => {
        if (selectedEvent) {
            activateEvent(selectedEvent);
        }
    });
}

function setSelectedEvent(event) {
    selectedEvent = event;
    timelineItems.forEach((item, id) => {
        item.classList.toggle('selected', id === event?.id);
    });
    updateSelectionSummary(event);
}

function activateEvent(event) {
    if (!event) return;
    setSelectedEvent(event);

    if (currentPlanetarium) {
        enterPlanetariumScene();
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

    miniGlobe?.stop();
    navigateTo(SCREEN_ROUTES.PLANETARIUM);
    if (onEventSelected) {
        onEventSelected(event);
    }
}

function updateSelectionSummary(event) {
    const titleEl = document.getElementById('archive-selected-title');
    const dateEl = document.getElementById('archive-selected-date');
    const locationEl = document.getElementById('archive-selected-location');
    const descEl = document.getElementById('archive-selected-description');
    const tagsEl = document.getElementById('archive-selected-tags');

    if (titleEl) titleEl.textContent = event?.title || '-';
    if (dateEl) dateEl.textContent = formatEventDate(event?.dateTime);
    if (locationEl) {
        const location = event?.location;
        const hasCoords = typeof location?.lat === 'number' && typeof location?.lon === 'number';
        const coordsText = hasCoords
            ? `${formatCoordinate(location.lat, true)} / ${formatCoordinate(location.lon, false)}`
            : '-';
        const name = location?.name ? `観測地: ${location.name}` : '観測地: -';
        locationEl.textContent = `${name} | ${coordsText}`;
    }
    if (descEl) descEl.textContent = event?.description || '歴史的な瞬間を選択すると、ここに詳細が表示されます。';
    if (tagsEl) {
        tagsEl.innerHTML = '';
        (event?.tags || []).forEach(tag => {
            const tagEl = document.createElement('span');
            tagEl.className = 'archive-tag';
            tagEl.textContent = tag;
            tagsEl.appendChild(tagEl);
        });
    }
    if (miniGlobe && event?.location) {
        miniGlobe.focusLocation(event.location);
    }
}

function setupBackButton() {
    const backBtn = document.getElementById('archive-back');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            showModeScreen();
        });
    }
}

export function showEventArchiveScreen() {
    resetPlanetariumBgm();
    hidePlanetariumCanvas();
    playModeSelectionBgm();
    currentPlanetarium?.stop();
    getLivePlanetarium()?.stop();
    navigateTo(SCREEN_ROUTES.ARCHIVE);
    miniGlobe?.start();
}

export function hideEventArchiveScreen() {
    miniGlobe?.stop();
    setScreenVisible('archive-screen', false);
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
    getArchivePlanetarium()?.stop();
    getLivePlanetarium()?.stop();
    destroyAllPlanetaria();
    playModeSelectionBgm();
    miniGlobe?.stop();
    navigateTo(SCREEN_ROUTES.MODE);
}

function initMiniGlobe() {
    const container = document.getElementById('archive-mini-globe');
    if (!container) return;
    miniGlobe = new GlobePreview('archive-mini-globe', {
        autoStart: false,
        cameraFar: 30,
        dampingFactor: 0.08,
        rotateSpeed: 0.45,
        polarInset: 0.2,
        starCount: 420,
        starRadius: 3.4,
        starRadiusSpread: 1.4,
        globeRotationSpeed: 0.0009,
        starRotationSpeed: 0.00025,
        ambientIntensity: 0.65,
        rimIntensity: 1.1,
        bottomFillIntensity: 0.3
    });
    const initial = selectedEvent || HISTORICAL_EVENTS[0];
    if (initial?.location) {
        miniGlobe.focusLocation(initial.location);
    }
}

export function disposeEventArchive() {
    miniGlobe?.dispose();
    miniGlobe = null;
}


function formatEventDate(dateTime) {
    const parsed = new Date(dateTime);
    if (Number.isNaN(parsed.getTime())) {
        return '-';
    }
    return parsed.toLocaleString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
    });
}

function getEventYear(dateTime) {
    const parsed = new Date(dateTime);
    if (Number.isNaN(parsed.getTime())) return '----';
    return parsed.getFullYear();
}
