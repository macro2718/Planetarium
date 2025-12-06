// 場所選択画面のUI制御
import { LOCATIONS, REGION_LABELS, formatCoordinate } from '../data/locations.js';

let currentPlanetarium = null;
let onLocationSelected = null;

/**
 * 場所選択システムを初期化
 * @param {Object} options 
 * @param {Function} options.onSelect - 場所選択時のコールバック
 */
export function initLocationSelector(options = {}) {
    onLocationSelected = options.onSelect;
    
    setupLocationGrid();
    setupBackButton();
    setupEnterButton();
}

/**
 * Planetariumインスタンスを設定
 */
export function setPlanetarium(planetarium) {
    currentPlanetarium = planetarium;
}

/**
 * 場所カードを生成してグリッドに追加
 */
function setupLocationGrid() {
    const grid = document.getElementById('location-grid');
    if (!grid) return;

    grid.innerHTML = '';

    LOCATIONS.forEach(location => {
        const card = createLocationCard(location);
        grid.appendChild(card);
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

    const regionLabel = REGION_LABELS[location.region] || location.region;
    
    card.innerHTML = `
        <div class="location-card-icon">${location.icon}</div>
        <div class="location-card-name">${location.name}</div>
        <div class="location-card-region">${regionLabel} · ${location.nameEn}</div>
        <div class="location-card-description">${location.description}</div>
        <div class="location-card-coords">
            <span>📍 ${formatCoordinate(location.lat, true)}</span>
            <span>🧭 ${formatCoordinate(location.lon, false)}</span>
        </div>
    `;

    card.addEventListener('click', () => {
        selectLocation(location);
    });

    return card;
}

/**
 * 場所を選択してプラネタリウムを開始
 */
function selectLocation(location) {
    // Planetariumの観測地を更新
    if (currentPlanetarium) {
        currentPlanetarium.setObserverLocation(location.lat, location.lon);
    }

    // 場所選択画面を非表示
    hideLocationScreen();

    // プラネタリウム画面を表示
    const homeScreen = document.getElementById('home-screen');
    if (homeScreen) {
        homeScreen.classList.add('hidden');
    }

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
            hideLocationScreen();
            showHomeScreen();
        });
    }
}

/**
 * ホーム画面の「星空を見る」ボタンを場所選択画面へ誘導
 */
function setupEnterButton() {
    const enterBtn = document.getElementById('enter-planetarium');
    if (enterBtn) {
        // 既存のイベントリスナーを削除するため、クローンで置き換え
        const newBtn = enterBtn.cloneNode(true);
        enterBtn.parentNode.replaceChild(newBtn, enterBtn);
        
        newBtn.addEventListener('click', () => {
            showLocationScreen();
        });
    }
}

/**
 * 場所選択画面を表示
 */
export function showLocationScreen() {
    const locationScreen = document.getElementById('location-screen');
    const homeScreen = document.getElementById('home-screen');
    
    if (locationScreen) {
        locationScreen.classList.remove('hidden');
    }
    if (homeScreen) {
        homeScreen.classList.add('hidden');
    }
}

/**
 * 場所選択画面を非表示
 */
export function hideLocationScreen() {
    const locationScreen = document.getElementById('location-screen');
    if (locationScreen) {
        locationScreen.classList.add('hidden');
    }
}

/**
 * ホーム画面を表示
 */
function showHomeScreen() {
    const homeScreen = document.getElementById('home-screen');
    if (homeScreen) {
        homeScreen.classList.remove('hidden');
    }
}

/**
 * 現在選択可能な場所リストを取得
 */
export function getLocations() {
    return LOCATIONS;
}

/**
 * IDから場所を取得
 */
export function getLocationById(id) {
    return LOCATIONS.find(loc => loc.id === id);
}
