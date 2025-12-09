// 場所選択画面のUI制御
import * as THREE from '../three.module.js';
import { OrbitControls } from '../vendor/three/addons/controls/OrbitControls.js';
import { LOCATIONS, REGION_LABELS, formatCoordinate } from '../data/locations.js';
import {
    destroyAllPlanetaria,
    getArchivePlanetarium,
    resetPlanetariumBgm,
    setActivePlanetarium,
    showPlanetariumCanvas
} from './planetariumContext.js';

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

const SCREEN_FADE_MS = 600; // Keep in sync with CSS --screen-fade-duration

/**
 * 場所選択システムを初期化
 * @param {Object} options
 * @param {Function} options.onSelect - 場所選択時のコールバック
 */
export function initLocationSelector(options = {}) {
    onLocationSelected = options.onSelect;

    document.body.classList.add('home-visible');
    setupLocationList();
    setupBackButton();
    setupObserveButton();

    locationGlobe = new LocationGlobe('location-globe');
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
                </div>
                <div class="location-card-meta">
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
        setActivePlanetarium('live');
        showPlanetariumCanvas();
        currentPlanetarium.start();
        currentPlanetarium.resetState();
        currentPlanetarium.setObserverLocation(location.lat, location.lon, location);
    }

    // 場所選択画面を非表示
    hideLocationScreen();

    document.body.classList.remove('home-visible');

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
            backToModeFromLocation();
        });
    }
}

/**
 * 場所選択画面からモード選択画面へ戻る（ホームが存在する場合はホームへ）
 */
function backToModeFromLocation() {
    const homeScreen = document.getElementById('home-screen');
    const modeScreen = document.getElementById('mode-screen');
    const locationScreen = document.getElementById('location-screen');

    document.body.classList.add('home-visible');
    document.body.classList.add('mode-screen-visible');
    homeScreen?.classList.remove('hidden');

    // モード選択画面が存在する場合は、そちらへ戻す
    if (modeScreen) {
        modeScreen.classList.add('fading-in');
        modeScreen.classList.remove('hidden');

        requestAnimationFrame(() => {
            modeScreen.classList.remove('fading-in');
        });

        setTimeout(() => {
            if (locationScreen) {
                locationScreen.classList.add('hidden');
            }
        }, SCREEN_FADE_MS);
        return;
    }

    // フォールバックとしてホーム画面へ戻る
    if (homeScreen) {
        homeScreen.classList.add('fading-in');
        homeScreen.classList.remove('hidden');

        requestAnimationFrame(() => {
            homeScreen.classList.remove('fading-in');
        });
    }

    setTimeout(() => {
        if (locationScreen) {
            locationScreen.classList.add('hidden');
        }
    }, SCREEN_FADE_MS);
}

/**
 * 場所選択画面を表示
 */
export function showLocationScreen() {
    const locationScreen = document.getElementById('location-screen');
    const homeScreen = document.getElementById('home-screen');
    resetPlanetariumBgm();
    destroyAllPlanetaria();

    currentPlanetarium?.stop();
    getArchivePlanetarium()?.stop();

    document.body.classList.remove('home-visible');

    if (locationScreen) {
        locationScreen.classList.remove('hidden');
    }
    if (homeScreen) {
        homeScreen.classList.add('hidden');
    }

    setSelectedLocation(selectedLocation || LOCATIONS[0]);
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

class LocationGlobe {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) return;

        this.scene = new THREE.Scene();
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true
        });
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight || 1);
        this.container.appendChild(this.renderer.domElement);

        const aspect = this.container.clientWidth / Math.max(this.container.clientHeight, 1);
        this.camera = new THREE.PerspectiveCamera(40, aspect, 0.1, 50);
        this.camera.position.set(0, 0, 3.6);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.06;
        this.controls.rotateSpeed = 0.5;
        this.controls.enablePan = false;
        this.controls.enableZoom = false;
        this.controls.minPolarAngle = Math.PI * 0.16;
        this.controls.maxPolarAngle = Math.PI - Math.PI * 0.16;

        this.globeGroup = new THREE.Group();
        this.scene.add(this.globeGroup);

        this.addLights();
        this.addStars();
        this.addGlobe();
        this.pin = this.createPin();
        this.globeGroup.add(this.pin);

        this.resizeHandler = () => this.onResize();
        window.addEventListener('resize', this.resizeHandler);

        this.animate = this.animate.bind(this);
        this.animate();
    }

    addLights() {
        const ambient = new THREE.AmbientLight(0xa7bfdc, 0.6);
        const rim = new THREE.DirectionalLight(0xffffff, 1.2);
        rim.position.set(4, 2, 3);
        const bottomFill = new THREE.DirectionalLight(0x1c2f52, 0.35);
        bottomFill.position.set(-2, -3, -2);
        this.scene.add(ambient, rim, bottomFill);
    }

    addStars() {
        const starCount = 900;
        const positions = new Float32Array(starCount * 3);
        for (let i = 0; i < starCount; i++) {
            const radius = 4 + Math.random() * 2.5;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const x = radius * Math.sin(phi) * Math.cos(theta);
            const y = radius * Math.cos(phi);
            const z = radius * Math.sin(phi) * Math.sin(theta);
            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const material = new THREE.PointsMaterial({
            color: new THREE.Color('#cde6ff'),
            size: 0.01,
            transparent: true,
            opacity: 0.7,
            depthWrite: false,
            sizeAttenuation: true
        });

        this.starField = new THREE.Points(geometry, material);
        this.scene.add(this.starField);
    }

    addGlobe() {
        const earthTexture = new THREE.TextureLoader().load('assets/textures/earth-day.jpg', (texture) => {
            texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy?.() || 1;
        });
        earthTexture.colorSpace = THREE.SRGBColorSpace;

        const surface = new THREE.Mesh(
            new THREE.SphereGeometry(0.92, 64, 64),
            new THREE.MeshStandardMaterial({
                map: earthTexture,
                roughness: 0.85,
                metalness: 0.05,
                emissive: new THREE.Color('#0b1a30'),
                emissiveIntensity: 0.18
            })
        );

        this.globeGroup.add(surface);
    }

    createPin() {
        const pinGeo = new THREE.SphereGeometry(0.035, 32, 32);
        const pinMat = new THREE.MeshStandardMaterial({
            color: new THREE.Color('#f0b9ff'),
            emissive: new THREE.Color('#f0b9ff'),
            emissiveIntensity: 0.8,
            roughness: 0.4,
            metalness: 0.2
        });
        return new THREE.Mesh(pinGeo, pinMat);
    }

    focusLocation(location) {
        if (!location) return;
        const { x, y, z } = this.latLonToVector(location.lat, location.lon, 0.92);
        this.pin.position.set(x, y, z);
        this.controls.target.set(0, 0, 0);
    }

    latLonToVector(lat, lon, radius) {
        const phi = THREE.MathUtils.degToRad(90 - lat);
        const theta = THREE.MathUtils.degToRad(lon + 180);
        return {
            x: -radius * Math.sin(phi) * Math.cos(theta),
            y: radius * Math.cos(phi),
            z: radius * Math.sin(phi) * Math.sin(theta)
        };
    }

    onResize() {
        if (!this.container) return;
        const width = this.container.clientWidth || this.container.offsetWidth || 600;
        const height = this.container.clientHeight || this.container.offsetHeight || 400;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    animate() {
        requestAnimationFrame(this.animate);
        this.controls?.update();
        if (this.globeGroup) {
            this.globeGroup.rotation.y += 0.0008;
        }
        if (this.starField) {
            this.starField.rotation.y += 0.0002;
        }
        this.renderer.render(this.scene, this.camera);
    }
}
