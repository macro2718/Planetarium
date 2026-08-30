// 場所選択画面のUI制御
import { LOCATIONS, REGION_LABELS, formatCoordinate } from '../data/locations.js';
import {
    destroyAllPlanetaria,
    getArchivePlanetarium,
    hidePlanetariumCanvas,
    resetPlanetariumBgm,
    setActivePlanetarium,
    showPlanetariumCanvas
} from './planetariumContext.js';
import { playModeSelectionBgm, enterPlanetariumScene } from './bgmController.js';
import { navigateTo, SCREEN_ROUTES, setScreenVisible } from './screenRouter.js';
import { GlobePreview } from './globePreview.js';

let currentPlanetarium = null;
let onLocationSelected = null;
let selectedLocation = LOCATIONS[0];
let locationGlobe = null;
const locationCards = new Map();
const SURFACE_LABELS = {
    water: '水面',
    desert: '砂漠',
    grass: '草原',
    ice: '氷原'
};

/**
 * 場所選択システムを初期化
 * @param {Object} options
 * @param {Function} options.onSelect - 場所選択時のコールバック
 */
export function initLocationSelector(options = {}) {
    onLocationSelected = options.onSelect;

    setupLocationList();
    setupBackButton();
    setupObserveButton();

    locationGlobe = new GlobePreview('location-globe', { autoStart: false });
    setSelectedLocation(selectedLocation);
}

/**
 * Planetariumインスタンスを設定
 */
export function setPlanetarium(planetarium) {
    currentPlanetarium = planetarium;
}

/**
 * 場所カードを生成してリストに追加
 */
function setupLocationList() {
    const list = document.getElementById('location-list');
    if (!list) return;

    list.innerHTML = '';
    locationCards.clear();

    LOCATIONS.forEach(location => {
        const card = createLocationCard(location);
        list.appendChild(card);
        locationCards.set(location.id, card);
    });
}

/**
 * 場所カードのDOM要素を作成
 */
function createLocationCard(location) {
    const card = document.createElement('div');
    card.className = 'location-card';
    card.dataset.region = location.region;
    card.dataset.locationId = location.id;
    card.tabIndex = 0;

    const regionLabel = REGION_LABELS[location.region] || location.region;

    card.innerHTML = `
        <div class="location-card-row">
            <div class="location-card-icon" aria-hidden="true">${location.icon || '✶'}</div>
            <div class="location-card-body">
                <div class="location-card-title">
                    <span class="location-card-name">${location.name}</span>
                    <span class="location-card-en">${location.nameEn}</span>
                    <span class="location-region-chip">${regionLabel}</span>
                </div>
            </div>
            <div class="location-card-arrow" aria-hidden="true">→</div>
        </div>
    `;

    card.addEventListener('click', () => {
        setSelectedLocation(location);
    });
    card.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setSelectedLocation(location);
        }
    });

    return card;
}

function setSelectedLocation(location) {
    selectedLocation = location;
    locationCards.forEach((card, id) => {
        card.classList.toggle('selected', id === location.id);
    });
    updateSelectionSummary(location);
    locationGlobe?.focusLocation(location);
}

function updateSelectionSummary(location) {
    const nameEl = document.getElementById('location-selected-name');
    const coordsEl = document.getElementById('location-selected-coords');
    const enEl = document.getElementById('location-selected-en');
    const chipEl = document.getElementById('location-selected-region');
    const descEl = document.getElementById('location-selected-description');
    const surfaceEl = document.getElementById('location-selected-surface');

    if (nameEl) {
        nameEl.textContent = `${location.icon || '✶'} ${location.name}`;
    }
    if (coordsEl) {
        coordsEl.textContent = `${formatCoordinate(location.lat, true)} / ${formatCoordinate(location.lon, false)}`;
    }
    if (enEl) {
        enEl.textContent = location.nameEn || '-';
    }
    if (chipEl) {
        chipEl.textContent = REGION_LABELS[location.region] || location.region;
    }
    if (surfaceEl) {
        surfaceEl.textContent = SURFACE_LABELS[location.surfaceType] || location.surfaceType || '-';
    }
    if (descEl) {
        descEl.textContent = location.description || 'この観測地の詳細情報がここに表示されます。';
    }
}

/**
 * 「観測する」ボタンのイベント設定
 */
function setupObserveButton() {
    const observeBtn = document.getElementById('location-observe');
    if (!observeBtn) return;

    observeBtn.addEventListener('click', () => {
        if (selectedLocation) {
            startObservation(selectedLocation);
        }
    });
}

/**
 * 場所を選択してプラネタリウムを開始
 */
function startObservation(location) {
    // Planetariumの観測地を更新
    if (currentPlanetarium) {
        enterPlanetariumScene();
        setActivePlanetarium('live');
        showPlanetariumCanvas();
        currentPlanetarium.start();
        currentPlanetarium.resetState();
        currentPlanetarium.setObserverLocation(location.lat, location.lon, location);
    }

    locationGlobe?.stop();
    navigateTo(SCREEN_ROUTES.PLANETARIUM);

    // コールバックがあれば呼び出し
    if (onLocationSelected) {
        onLocationSelected(location);
    }

    console.log(`観測地を設定: ${location.name} (${location.lat}, ${location.lon})`);
}

/**
 * 戻るボタンのイベント設定
 */
function setupBackButton() {
    const backBtn = document.getElementById('location-back');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            backToModeFromLocation();
        });
    }
}

/**
 * 場所選択画面からモード選択画面へ戻る（ホームが存在する場合はホームへ）
 */
function backToModeFromLocation() {
    destroyAllPlanetaria();
    playModeSelectionBgm();
    locationGlobe?.stop();
    navigateTo(SCREEN_ROUTES.MODE);
}

/**
 * 場所選択画面を表示
 */
export function showLocationScreen() {
    resetPlanetariumBgm();
    hidePlanetariumCanvas();
    playModeSelectionBgm();

    currentPlanetarium?.stop();
    getArchivePlanetarium()?.stop();

    navigateTo(SCREEN_ROUTES.LOCATION);
    locationGlobe?.start();
    setSelectedLocation(selectedLocation || LOCATIONS[0]);
}

/**
 * 場所選択画面を非表示
 */
export function hideLocationScreen() {
    locationGlobe?.stop();
    setScreenVisible('location-screen', false);
}

export function disposeLocationSelector() {
    locationGlobe?.dispose();
    locationGlobe = null;
}
