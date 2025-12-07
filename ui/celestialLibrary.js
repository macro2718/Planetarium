import { destroyAllPlanetaria, resetPlanetariumBgm } from './planetariumContext.js';

const STORAGE_KEY = 'celestial-library-unlocked-v1';
let unlockedConstellations = new Set();

export function initCelestialLibrary() {
    unlockedConstellations = loadUnlockedConstellations();
    renderLibraryList();
    setupBackButton();
}

export function showCelestialLibraryScreen() {
    const libraryScreen = document.getElementById('library-screen');
    const homeScreen = document.getElementById('home-screen');
    resetPlanetariumBgm();
    destroyAllPlanetaria();
    if (libraryScreen) {
        libraryScreen.classList.remove('hidden');
    }
    if (homeScreen) {
        homeScreen.classList.add('hidden');
    }
    document.body.classList.remove('home-visible');
    renderLibraryList();
}

export function hideCelestialLibraryScreen() {
    const libraryScreen = document.getElementById('library-screen');
    if (libraryScreen) {
        libraryScreen.classList.add('hidden');
    }
}

export function unlockConstellation(constellationName) {
    const normalized = normalizeConstellationName(constellationName);
    if (!normalized) return;
    if (normalized === '星図外') return;
    if (unlockedConstellations.has(normalized)) return;

    unlockedConstellations.add(normalized);
    saveUnlockedConstellations();
    renderLibraryList();
}

function normalizeConstellationName(name) {
    if (!name) return '';
    return String(name).trim().replace(/\s+/g, ' ');
}

function loadUnlockedConstellations() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return new Set();
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
            return new Set(parsed.map(normalizeConstellationName).filter(Boolean));
        }
    } catch (error) {
        console.warn('[celestialLibrary] Failed to load saved constellations', error);
    }
    return new Set();
}

function saveUnlockedConstellations() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(unlockedConstellations)));
    } catch (error) {
        console.warn('[celestialLibrary] Failed to save constellations', error);
    }
}

function setupBackButton() {
    const backBtn = document.getElementById('library-back');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            showModeScreen();
            hideCelestialLibraryScreen();
        });
    }
}

function renderLibraryList() {
    const grid = document.getElementById('library-grid');
    const empty = document.getElementById('library-empty');
    const count = document.getElementById('library-count');

    const names = Array.from(unlockedConstellations).sort((a, b) => a.localeCompare(b, 'ja'));

    if (count) {
        count.textContent = names.length;
    }
    if (!grid) return;

    grid.innerHTML = '';

    if (!names.length) {
        if (empty) empty.classList.remove('hidden');
        return;
    }

    if (empty) empty.classList.add('hidden');

    names.forEach((name) => {
        const card = document.createElement('div');
        card.className = 'library-card';
        card.innerHTML = `
            <div class="library-card-head">
                <div class="library-badge">CELESTIAL LIBRARY</div>
                <div class="library-status-chip">解放済み</div>
            </div>
            <h3>${name}</h3>
            <p class="library-placeholder">詳細の物語はこれから収蔵されます。星空で出会った記憶を、まずはここに保管しておきましょう。</p>
        `;
        grid.appendChild(card);
    });
}

function showModeScreen() {
    const modeScreen = document.getElementById('mode-screen');
    if (modeScreen) {
        modeScreen.classList.remove('hidden');
    }
    document.body.classList.add('home-visible');
}
