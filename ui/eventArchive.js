import { HISTORICAL_EVENTS } from '../data/historicalEvents.js';

let currentPlanetarium = null;
let onEventSelected = null;

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
                <div class="archive-badge">STARSHADOW ARCHIVE</div>
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
        currentPlanetarium.setObserverLocation(event.location.lat, event.location.lon);
        currentPlanetarium.setTimeMode('custom', {
            date: new Date(event.dateTime),
            timeScale: 0
        });
        currentPlanetarium.toggleTimePause(true);
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

function showModeScreen() {
    const modeScreen = document.getElementById('mode-screen');
    if (modeScreen) {
        modeScreen.classList.remove('hidden');
    }
    document.body.classList.add('home-visible');
}
