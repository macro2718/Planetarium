import * as THREE from '../three.module.js';
import { OrbitControls } from '../vendor/three/addons/controls/OrbitControls.js';
import { HISTORICAL_EVENTS } from '../data/historicalEvents.js';
import { formatCoordinate } from '../data/locations.js';
import { hideEventEffectPanel, showEventEffectPanel } from './eventEffectPanel.js';
import {
    destroyAllPlanetaria,
    getArchivePlanetarium,
    getLivePlanetarium,
    resetPlanetariumBgm,
    setActivePlanetarium,
    showPlanetariumCanvas
} from './planetariumContext.js';
import { enterPlanetariumScene, playModeSelectionBgm } from './bgmController.js';

let currentPlanetarium = null;
let onEventSelected = null;
let selectedEvent = null;
const eventCards = new Map();
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
    setupEventList();
    setupTimeline();
    setupBackButton();
    setupObserveButton();
    initMiniGlobe();
}

export function setArchivePlanetarium(planetarium) {
    currentPlanetarium = planetarium;
}

function setupEventList() {
    const grid = document.getElementById('archive-grid');
    eventCards.clear();

    const sortedEvents = [...HISTORICAL_EVENTS].sort((a, b) => {
        const aTime = new Date(a.dateTime).getTime();
        const bTime = new Date(b.dateTime).getTime();
        return aTime - bTime;
    });

    if (grid) {
        grid.innerHTML = '';
        sortedEvents.forEach(event => {
            const card = document.createElement('div');
            card.className = 'archive-card';
            card.dataset.eventId = event.id;
            card.tabIndex = 0;

            const localDate = formatEventDate(event.dateTime);

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
            `;

            card.addEventListener('click', () => {
                setSelectedEvent(event);
            });

            card.addEventListener('keydown', (evt) => {
                if (evt.key === 'Enter' || evt.key === ' ') {
                    evt.preventDefault();
                    setSelectedEvent(event);
                }
            });

            grid.appendChild(card);
            eventCards.set(event.id, card);
        });
    }

    const initialEvent = selectedEvent || sortedEvents[0];
    if (initialEvent) {
        setSelectedEvent(initialEvent);
    }
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
    eventCards.forEach((card, id) => {
        card.classList.toggle('selected', id === event?.id);
    });
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

    hideEventArchiveScreen();
    document.body.classList.remove('home-visible');
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
            hideEventArchiveScreen();
        });
    }
}

export function showEventArchiveScreen() {
    const archiveScreen = document.getElementById('archive-screen');
    resetPlanetariumBgm();
    destroyAllPlanetaria();
    playModeSelectionBgm();
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
    playModeSelectionBgm();
    document.body.classList.add('mode-screen-visible');
    document.body.classList.add('home-visible');
}

function initMiniGlobe() {
    const container = document.getElementById('archive-mini-globe');
    if (!container) return;
    miniGlobe = new ArchiveMiniGlobe('archive-mini-globe');
    const initial = selectedEvent || HISTORICAL_EVENTS[0];
    if (initial?.location) {
        miniGlobe.focusLocation(initial.location);
    }
}

class ArchiveMiniGlobe {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) return;

        this.scene = new THREE.Scene();
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(this.container.clientWidth || 1, this.container.clientHeight || 1);
        this.container.appendChild(this.renderer.domElement);

        const aspect = (this.container.clientWidth || 1) / Math.max(this.container.clientHeight || 1, 1);
        this.camera = new THREE.PerspectiveCamera(36, aspect, 0.1, 30);
        this.camera.position.set(0, 0, 3.8);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.08;
        this.controls.rotateSpeed = 0.45;
        this.controls.enablePan = false;
        this.controls.enableZoom = false;
        this.controls.minPolarAngle = Math.PI * 0.2;
        this.controls.maxPolarAngle = Math.PI - Math.PI * 0.2;

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
        const ambient = new THREE.AmbientLight(0xa7bfdc, 0.65);
        const rim = new THREE.DirectionalLight(0xffffff, 1.1);
        rim.position.set(4, 2, 3);
        const bottomFill = new THREE.DirectionalLight(0x1c2f52, 0.3);
        bottomFill.position.set(-2, -3, -2);
        this.scene.add(ambient, rim, bottomFill);
    }

    addStars() {
        const starCount = 420;
        const positions = new Float32Array(starCount * 3);
        for (let i = 0; i < starCount; i++) {
            const radius = 3.4 + Math.random() * 1.4;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = radius * Math.cos(phi);
            positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
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
            new THREE.SphereGeometry(0.9, 48, 48),
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
        const { x, y, z } = this.latLonToVector(location.lat, location.lon, 0.9);
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
        const width = this.container.clientWidth || this.container.offsetWidth || 1;
        const height = this.container.clientHeight || this.container.offsetHeight || 1;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    animate() {
        requestAnimationFrame(this.animate);
        this.controls?.update();
        if (this.globeGroup) {
            this.globeGroup.rotation.y += 0.0009;
        }
        if (this.starField) {
            this.starField.rotation.y += 0.00025;
        }
        this.renderer.render(this.scene, this.camera);
    }
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
