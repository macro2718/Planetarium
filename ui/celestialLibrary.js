import { destroyAllPlanetaria, resetPlanetariumBgm } from './planetariumContext.js';
import { findConstellationTale } from '../data/constellationTales.js';
import { BASE_CONSTELLATION_DATA } from '../data/constellations.js';

const STORAGE_KEY = 'celestial-library-unlocked-v1';
let unlockedConstellations = new Set();
let detailView = null;
const FALLBACK_STORY = '物語の断片はまだ集めているところです。星空で出会ったときの余韻を、そのままここに置いておきましょう。';
const FALLBACK_OBSERVATION = '星図を広げ、実際の夜空で形をなぞると新しい発見があります。';

function normalizeConstellationName(name) {
    if (!name) return '';
    return String(name).trim().replace(/\s+/g, ' ');
}

const CONSTELLATION_DESCRIPTION_MAP = new Map(
    BASE_CONSTELLATION_DATA.map((entry) => [normalizeConstellationName(entry.name), entry])
);

export function initCelestialLibrary() {
    unlockedConstellations = loadUnlockedConstellations();
    renderLibraryList();
    setupBackButton();
    setupDetailScreen();
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
    const libraryScreen = document.getElementById('library-screen');
    const detailScreen = document.getElementById('library-detail-screen');

    const names = Array.from(unlockedConstellations).sort((a, b) => a.localeCompare(b, 'ja'));

    if (count) {
        count.textContent = names.length;
    }
    if (!grid) return;

    grid.innerHTML = '';

    if (!names.length) {
        if (detailScreen) detailScreen.classList.add('hidden');
        if (libraryScreen) libraryScreen.classList.remove('hidden');
        if (empty) empty.classList.remove('hidden');
        return;
    }

    if (empty) empty.classList.add('hidden');

    names.forEach((name) => {
        const content = buildConstellationContent(name);

        const metaChips = [];
        if (content.season) metaChips.push(`<span class="library-chip">${content.season}</span>`);
        if (content.keywords?.length) metaChips.push(`<span class="library-chip subtle">${content.keywords[0]}</span>`);
        const metaHtml = metaChips.length ? `<div class="library-meta">${metaChips.join('')}</div>` : '';

        const tagsHtml = content.keywords?.length
            ? `<div class="library-tags">${content.keywords.map((tag) => `<span class="library-tag">${tag}</span>`).join('')}</div>`
            : '';

        const detailLines = [
            content.brightStars ? `<p><span class="library-label">代表星</span>${content.brightStars}</p>` : '',
            content.story ? `<p><span class="library-label">物語</span>${content.story}</p>` : '',
            content.observation ? `<p><span class="library-label">観測</span>${content.observation}</p>` : ''
        ].filter(Boolean).join('');

        const card = document.createElement('div');
        card.className = 'library-card';
        card.innerHTML = `
            <div class="library-card-head">
                <div class="library-badge">CELESTIAL LIBRARY</div>
                <div class="library-status-chip">解放済み</div>
            </div>
            ${metaHtml}
            <h3>${content.name}</h3>
            <p class="library-lede">${content.lede}</p>
            ${tagsHtml}
            <div class="library-detail">
                ${detailLines}
            </div>
        `;
        card.addEventListener('click', () => openConstellationDetail(content));
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

function buildConstellationContent(name) {
    const normalized = normalizeConstellationName(name);
    const tale = findConstellationTale(name) || findConstellationTale(normalized);
    const base = CONSTELLATION_DESCRIPTION_MAP.get(normalized);
    return {
        name: tale?.name || base?.name || name,
        season: tale?.season || '',
        keywords: tale?.keywords || [],
        lede: tale?.lede || base?.description || '星空で出会った記憶が本棚に収まりました。',
        story: tale?.story || FALLBACK_STORY,
        observation: tale?.observation || FALLBACK_OBSERVATION,
        brightStars: tale?.brightStars || ''
    };
}

function openConstellationDetail(content) {
    const refs = detailView || setupDetailScreen();
    if (!refs) return;
    refs.title.textContent = content.name;
    refs.lede.textContent = content.lede;
    refs.story.textContent = content.story;
    refs.observation.textContent = content.observation;
    refs.bright.textContent = content.brightStars || '—';

    if (refs.meta) {
        refs.meta.innerHTML = '';
        if (content.season) {
            const chip = document.createElement('span');
            chip.className = 'library-chip';
            chip.textContent = content.season;
            refs.meta.appendChild(chip);
        }
        if (content.keywords?.length) {
            const chip = document.createElement('span');
            chip.className = 'library-chip subtle';
            chip.textContent = content.keywords[0];
            refs.meta.appendChild(chip);
        }
    }

    if (refs.tags) {
        refs.tags.innerHTML = '';
        (content.keywords || []).forEach((tag) => {
            const el = document.createElement('span');
            el.className = 'library-tag';
            el.textContent = tag;
            refs.tags.appendChild(el);
        });
    }

    if (refs.detailScreen) refs.detailScreen.classList.remove('hidden');
    if (refs.libraryScreen) refs.libraryScreen.classList.add('hidden');
}

function closeConstellationDetail() {
    if (!detailView) return;
    if (detailView.detailScreen) detailView.detailScreen.classList.add('hidden');
    if (detailView.libraryScreen) detailView.libraryScreen.classList.remove('hidden');
}

function setupDetailScreen() {
    if (detailView) return detailView;
    const detailScreen = document.getElementById('library-detail-screen');
    const libraryScreen = document.getElementById('library-screen');
    if (!detailScreen) return null;

    detailView = {
        detailScreen,
        libraryScreen,
        backBtn: document.getElementById('library-detail-back'),
        title: document.getElementById('library-detail-title'),
        lede: document.getElementById('library-detail-lede'),
        story: document.getElementById('library-detail-story'),
        observation: document.getElementById('library-detail-observation'),
        bright: document.getElementById('library-detail-bright'),
        meta: document.getElementById('library-detail-meta'),
        tags: document.getElementById('library-detail-tags')
    };

    if (detailView.backBtn) {
        detailView.backBtn.addEventListener('click', closeConstellationDetail);
    }
    window.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') closeConstellationDetail();
    });

    return detailView;
}
