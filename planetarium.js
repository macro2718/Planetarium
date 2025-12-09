import * as THREE from './three.module.js';
import { OrbitControls } from './vendor/three/addons/controls/OrbitControls.js';
import { AstroCatalog } from './astroCatalog.js';
import { createSkyEnvironment } from './systems/skyEnvironment.js';
import { createStarFieldSystem } from './systems/starFieldSystem.js';
import { createMilkyWaySystem } from './systems/milkyWaySystem.js';
import { createConstellationSystem } from './systems/constellationSystem.js';
import { createNebulaSystem } from './systems/nebulaSystem.js';
import { createSunSystem } from './systems/sunSystem.js';
import { createMoonSystem } from './systems/moonSystem.js';
import { createPlanetSystem } from './systems/planetSystem.js';
import { createAuroraSystem } from './systems/auroraSystem.js';
import { createCosmicDustSystem } from './systems/cosmicDustSystem.js';
import { createSurfaceSystem } from './systems/surfaceSystem.js';
import { createShootingStarSystem } from './systems/shootingStarSystem.js';
import { createCometTailSystem } from './systems/cometTailSystem.js';
import { createMeteorShowerSystem } from './systems/meteorShowerSystem.js';
import { createHourCircleSystem, createDeclinationCircleSystem, createCelestialEquatorSystem, createEclipticSystem, createGalacticEquatorSystem, createLunarOrbitPlaneSystem } from './systems/hourCircleSystem.js';
import { createCardinalDirectionSystem } from './systems/cardinalDirectionSystem.js';
import { createStarTrailSystem } from './systems/starTrailSystem.js';
import { createLensFlareSystem } from './systems/lensFlareSystem.js';
import { attachUIInteractions } from './ui/interactionController.js';
import { setupTimeDisplay } from './ui/timeDisplay.js';
import { setupPhotoCaptureButton } from './ui/photoAlbum.js';
import { initLocationSelector, setPlanetarium } from './ui/locationSelector.js';
import { initModeSelector } from './ui/modeSelector.js';
import { initEventArchive, setArchivePlanetarium } from './ui/eventArchive.js';
import { initCelestialLibrary } from './ui/celestialLibrary.js';
import { initHomeScene } from './ui/homeScene.js';
import { playTitleBgm } from './ui/bgmController.js';
import {
    DEFAULT_OBSERVER_LOCATION,
    createDefaultSettings,
    normalizeSurfaceType
} from './core/settings.js';
import { TimeController } from './core/timeController.js';
import { AudioManager } from './core/audioManager.js';
import {
    registerPlanetaria,
    setActivePlanetarium,
    getActivePlanetarium,
    getArchivePlanetarium,
    getLivePlanetarium
} from './ui/planetariumContext.js';

// ========================================
// プラネタリウム - 美しい星空シミュレーション
// ========================================
class Planetarium {
    constructor(options = {}) {
        const { containerId = 'canvas-container', isArchive = false } = options;

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.minCameraHeight = -4;
        this.settings = createDefaultSettings();
        this.audioManager = new AudioManager();
        this.raycaster = new THREE.Raycaster();
        this.raycaster.params.Points.threshold = 50;
        this.raycaster.params.Mesh = { threshold: 30 };
        this.mouse = new THREE.Vector2();
        this.clickableObjects = [];
        this.catalogPickables = [];
        this.catalog = AstroCatalog.createDefault();
        this.starCatalogMap = this.catalog.getStarMap();
        this.observerLocationInfo = { ...DEFAULT_OBSERVER_LOCATION };
        this.observer = {
            lat: DEFAULT_OBSERVER_LOCATION.lat,
            lon: DEFAULT_OBSERVER_LOCATION.lon
        };
        this.timeController = new TimeController({
            isArchive,
            nowProvider: () => performance.now() * 0.001
        });
        this.isArchive = isArchive;
        this.localSiderealTime = this.timeController.localSiderealTime;
        this.infoTimeout = null;
        this.updaters = [];
        this.lastTime = this.timeController.getCurrentSeconds();
        this.containerId = containerId;
        this.resizeRenderer = this.resizeRenderer.bind(this);
        this.animate = this.animate.bind(this);
        this.isInitialized = false;
        this.isRunning = false;
        this.animationFrameId = null;

        this.updateSimulationTime(this.timeController.getCurrentSeconds());
    }

    get simulatedDate() {
        return this.timeController.getSimulatedDate();
    }

    get timeMode() {
        return this.timeController.timeMode;
    }

    get timeScale() {
        return this.timeController.timeScale;
    }

    set timeScale(value) {
        this.timeController.timeScale = value;
    }

    get dayScale() {
        return this.timeController.dayScale;
    }

    set dayScale(value) {
        this.timeController.dayScale = value;
    }

    get isTimePaused() {
        return this.timeController.isTimePaused;
    }

    resetState() {
        this.settings = createDefaultSettings();
        this.timeController.reset();
        this.setTimeMode('realtime', { date: new Date() });
        this.lastTime = this.timeController.getCurrentSeconds();

        if (this.camera) {
            this.camera.position.set(0, 0, 0.1);
        }
        if (this.controls) {
            this.controls.target.set(0, 0, 0);
            this.controls.autoRotate = false;
            this.controls.update();
        }

        this.applySettingsToSystems();
        this.syncControlButtons();
    }

    init() {
        this.setupScene();
        this.setupCamera();
        this.setupRenderer();
        this.setupControls();

        this.registerUpdater(createSkyEnvironment(this));
        this.registerUpdater(createStarFieldSystem(this));
        this.registerUpdater(createMilkyWaySystem(this));
        this.constellationSystem = createConstellationSystem(this);
        this.registerUpdater(this.constellationSystem);
        createNebulaSystem(this);
        this.sunSystem = createSunSystem(this);
        this.registerUpdater(this.sunSystem);
        this.planetSystem = createPlanetSystem(this);
        this.registerUpdater(this.planetSystem);
        this.moonSystem = createMoonSystem(this);
        this.registerUpdater(this.moonSystem);
        this.registerUpdater(createAuroraSystem(this));
        this.registerUpdater(createCosmicDustSystem(this));
        this.surfaceSystem = createSurfaceSystem(this, () => this.moonSystem.getCurrentState());
        this.registerUpdater(this.surfaceSystem);
        this.registerUpdater(createShootingStarSystem(this));
        this.cometTailSystem = createCometTailSystem(this);
        this.registerUpdater(this.cometTailSystem);
        this.meteorShowerSystem = createMeteorShowerSystem(this);
        this.registerUpdater(this.meteorShowerSystem);
        this.hourCircleSystem = createHourCircleSystem(this);
        this.declinationCircleSystem = createDeclinationCircleSystem(this);
        this.celestialEquatorSystem = createCelestialEquatorSystem(this);
        this.eclipticSystem = createEclipticSystem(this);
        this.galacticEquatorSystem = createGalacticEquatorSystem(this);
        this.lunarOrbitPlaneSystem = createLunarOrbitPlaneSystem(this);
        this.cardinalDirectionSystem = createCardinalDirectionSystem(this);
        this.starTrailSystem = createStarTrailSystem(this);
        this.registerUpdater(this.starTrailSystem);
        this.registerUpdater(this.celestialEquatorSystem);
        this.registerUpdater(this.eclipticSystem);
        this.registerUpdater(this.galacticEquatorSystem);
        this.registerUpdater(this.lunarOrbitPlaneSystem);
        this.lensFlareSystem = createLensFlareSystem(this);
        this.registerUpdater(this.lensFlareSystem);

        this.applySettingsToSystems();
        this.syncControlButtons();
        this.isInitialized = true;
    }

    start() {
        if (!this.isInitialized) {
            this.init();
        }
        if (this.isRunning) return;
        this.audioManager.setAudioReady(true);
        this.isRunning = true;
        this.lastTime = this.timeController.getCurrentSeconds();
        this.hideLoading();
        if (this.settings.playEnvSound) {
            this.startEnvironmentSound(this.settings.surfaceType);
        }
        this.animate();
    }

    stop() {
        this.isRunning = false;
        this.audioManager.setAudioReady(false);
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    destroy() {
        this.stop();
        this.stopAmbientSound();
        this.stopEnvironmentSound();
        window.removeEventListener('resize', this.resizeRenderer);
        if (this.controls?.dispose) {
            this.controls.dispose();
        }
        if (this.renderer) {
            this.renderer.dispose();
            const dom = this.renderer.domElement;
            if (dom?.parentElement) {
                dom.parentElement.removeChild(dom);
            }
        }
        this.disposeScene();
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.constellationSystem = null;
        this.sunSystem = null;
        this.moonSystem = null;
        this.auroraGroup = null;
        this.milkyWayGroup = null;
        this.shootingStarsGroup = null;
        this.sunGroup = null;
        this.moonGroup = null;
        this.surfaceSystem = null;
        this.cometTailSystem = null;
        this.meteorShowerSystem = null;
        this.hourCircleSystem = null;
        this.declinationCircleSystem = null;
        this.celestialEquatorSystem = null;
        this.eclipticSystem = null;
        this.galacticEquatorSystem = null;
        this.lunarOrbitPlaneSystem = null;
        this.cardinalDirectionSystem = null;
        this.starTrailSystem = null;
        this.lensFlareSystem = null;
        this.updaters = [];
        this.clickableObjects = [];
        this.catalogPickables = [];
        this.isInitialized = false;
        this.isRunning = false;
        this.animationFrameId = null;
    }

    disposeScene() {
        if (!this.scene) return;
        this.scene.traverse((obj) => {
            if (obj.geometry?.dispose) {
                obj.geometry.dispose();
            }
            const mat = obj.material;
            if (Array.isArray(mat)) {
                mat.forEach((m) => m?.dispose?.());
            } else if (mat?.dispose) {
                mat.dispose();
            }
            if (obj.texture?.dispose) {
                obj.texture.dispose();
            }
        });
        this.scene.clear();
    }

    registerUpdater(system) {
        if (system?.update) {
            this.updaters.push(system.update);
        }
    }

    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x000011, 0.00008);
    }

    setupCamera() {
        this.camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            0.1,
            20000
        );
        this.camera.position.set(0, 0, 0.1);
    }

    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            preserveDrawingBuffer: true  // 写真撮影のために必要
        });
        this.resizeRenderer();
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        const container = document.getElementById(this.containerId) || document.body;
        container.appendChild(this.renderer.domElement);

        window.addEventListener('resize', this.resizeRenderer);

        // 写真撮影ボタンのセットアップ
        setupPhotoCaptureButton(
            () => getActivePlanetarium()?.renderer || this.renderer,
            () => getActivePlanetarium() || this
        );
    }

    resizeRenderer() {
        if (!this.renderer || !this.camera) return;

        const container = document.getElementById(this.containerId);
        const width = container?.clientWidth || window.innerWidth;
        const height = container?.clientHeight || window.innerHeight || 1;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height, false);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    }

    setupControls() {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.enableZoom = true;
        this.controls.zoomSpeed = 0.5;
        this.controls.minDistance = 0.1;
        this.controls.maxDistance = 100;
        this.controls.enablePan = false;
        this.controls.rotateSpeed = -0.3;
        this.controls.autoRotate = false;
        this.controls.autoRotateSpeed = 0.1;
        this.controls.maxPolarAngle = Math.PI - 0.001;
    }

    syncSurfaceButtons(type = this.settings?.surfaceType) {
        const normalized = normalizeSurfaceType(type);
        const surfaceButtons = document.querySelectorAll('[data-surface-type]');
        surfaceButtons.forEach((btn) => {
            btn.classList.toggle('active', btn.dataset.surfaceType === normalized);
        });
    }

    setSurfaceType(type) {
        const normalized = normalizeSurfaceType(type);
        const applied = this.surfaceSystem?.setSurfaceType
            ? this.surfaceSystem.setSurfaceType(normalized)
            : normalized;
        if (applied) {
            this.settings.surfaceType = applied;
            this.syncSurfaceButtons(applied);
            this.updateEnvironmentSoundForSurface(applied);
        }
        return applied;
    }

    applySettingsToSystems() {
        const settings = this.settings ?? {};
        if (this.milkyWayGroup) this.milkyWayGroup.visible = !!settings.showMilkyWay;
        if (this.constellationSystem) this.constellationSystem.updateVisibility(!!settings.showConstellations);
        if (this.shootingStarsGroup) this.shootingStarsGroup.visible = !!settings.showShootingStars;
        if (this.sunSystem?.setEnabled) {
            this.sunSystem.setEnabled(!!settings.showSun);
        } else if (this.sunGroup) {
            this.sunGroup.visible = !!settings.showSun;
        }
        if (this.moonGroup) this.moonGroup.visible = !!settings.showMoon;
        if (this.auroraGroup) this.auroraGroup.visible = !!settings.showAurora;
        if (this.hourCircleSystem) this.hourCircleSystem.setVisible(!!settings.showHourCircles);
        if (this.declinationCircleSystem) this.declinationCircleSystem.setVisible(!!settings.showDeclinationCircles);
        if (this.celestialEquatorSystem) this.celestialEquatorSystem.setVisible(!!settings.showCelestialEquator);
        if (this.eclipticSystem) this.eclipticSystem.setVisible(!!settings.showEcliptic);
        if (this.galacticEquatorSystem) this.galacticEquatorSystem.setVisible(!!settings.showGalacticEquator);
        if (this.lunarOrbitPlaneSystem) this.lunarOrbitPlaneSystem.setVisible(!!settings.showLunarOrbit);
        if (this.cardinalDirectionSystem) this.cardinalDirectionSystem.setVisible(!!settings.showCardinalDirections);
        if (this.starTrailSystem) this.starTrailSystem.setEnabled(!!settings.showStarTrails);
        if (this.lensFlareSystem?.setEnabled) this.lensFlareSystem.setEnabled(!!settings.showLensFlare);
        this.setSurfaceType(settings.surfaceType ?? DEFAULT_OBSERVER_LOCATION.surfaceType ?? 'water');
        if (this.controls) this.controls.autoRotate = !!settings.autoRotate;
        if (this.cometTailSystem?.setEnabled) {
            this.cometTailSystem.setEnabled(!!settings.showCometTail, {
                intensity: settings.cometTailIntensity,
                tint: settings.cometTailTint
            });
        }
        if (this.meteorShowerSystem?.setIntensity) {
            this.meteorShowerSystem.setIntensity(settings.meteorShowerIntensity ?? 0);
        }

        if (settings.playMusic) {
            this.startAmbientSound();
        } else {
            this.stopAmbientSound();
        }

        if (settings.playEnvSound) {
            this.startEnvironmentSound(settings.surfaceType);
        } else {
            this.stopEnvironmentSound();
        }
    }

    syncControlButtons() {
        const toggleButtons = [
            { id: 'btn-milkyway', flag: 'showMilkyWay' },
            { id: 'btn-constellations', flag: 'showConstellations' },
            { id: 'btn-shooting', flag: 'showShootingStars' },
            { id: 'btn-sun', flag: 'showSun' },
            { id: 'btn-moon', flag: 'showMoon' },
            { id: 'btn-aurora', flag: 'showAurora' },
            { id: 'btn-hour-circles', flag: 'showHourCircles' },
            { id: 'btn-declination-circles', flag: 'showDeclinationCircles' },
            { id: 'btn-celestial-equator', flag: 'showCelestialEquator' },
            { id: 'btn-ecliptic', flag: 'showEcliptic' },
            { id: 'btn-galactic-equator', flag: 'showGalacticEquator' },
            { id: 'btn-lunar-orbit', flag: 'showLunarOrbit' },
            { id: 'btn-cardinal-directions', flag: 'showCardinalDirections' },
            { id: 'btn-star-trails', flag: 'showStarTrails' },
            { id: 'btn-lensflare', flag: 'showLensFlare' },
            { id: 'btn-auto', flag: 'autoRotate' },
            { id: 'btn-music', flag: 'playMusic' },
            { id: 'btn-env-sound', flag: 'playEnvSound' }
        ];

        for (const { id, flag } of toggleButtons) {
            const btn = document.getElementById(id);
            if (btn) {
                btn.classList.toggle('active', !!this.settings?.[flag]);
            }
        }

        this.syncSurfaceButtons();
    }

    updateSimulationTime(nowSeconds) {
        const { simulatedDate, localSiderealTime } = this.timeController.update(
            nowSeconds,
            this.observer.lon
        );
        this.localSiderealTime = localSiderealTime;
        return simulatedDate;
    }

    getSimulatedDate() {
        return this.timeController.getSimulatedDate();
    }

    /**
     * 観測地の緯度経度を変更
     * @param {number} lat - 緯度 (-90 〜 90)
     * @param {number} lon - 経度 (-180 〜 180)
     */
    setObserverLocation(lat, lon, info = null) {
        this.observer.lat = lat;
        this.observer.lon = lon;
        if (info && typeof info === 'object') {
            this.observerLocationInfo = {
                ...info,
                lat,
                lon
            };
        } else {
            this.observerLocationInfo = {
                ...(this.observerLocationInfo || {}),
                lat,
                lon
            };
        }
        this.updateSimulationTime(this.timeController.getCurrentSeconds());
        if (info?.surfaceType) {
            this.setSurfaceType(info.surfaceType);
        }
        console.log(`観測地を設定: 緯度 ${lat.toFixed(4)}, 経度 ${lon.toFixed(4)}`);
    }

    setTimeMode(mode, options = {}) {
        this.timeController.setMode(mode, options);
        this.updateSimulationTime(this.timeController.getCurrentSeconds());
    }

    toggleTimePause(forceState) {
        const paused = this.timeController.togglePause(forceState, this.observer.lon);
        this.localSiderealTime = this.timeController.localSiderealTime;
        return paused;
    }

    getCurrentPerfSeconds() {
        return this.timeController.getCurrentSeconds();
    }

    enforceCameraAboveWater() {
        if (!this.controls || !this.camera) return;
        const minHeight = this.minCameraHeight ?? -4;
        const epsilon = 0.001;
        const target = this.controls.target;
        const distance = this.camera.position.distanceTo(target);
        if (distance === 0 || distance <= Math.abs(minHeight)) {
            this.controls.maxPolarAngle = Math.PI - epsilon;
            return;
        }
        const ratio = THREE.MathUtils.clamp(minHeight / distance, -1, 0.999);
        const limit = Math.acos(ratio);
        const minLimit = this.controls.minPolarAngle + 0.001;
        this.controls.maxPolarAngle = Math.min(Math.max(limit, minLimit), Math.PI - epsilon);
    }

    async startBgm() {
        await this.audioManager.startBgm();
    }

    playCurrentTrack() {
        this.audioManager.playCurrentTrack();
    }

    stopBgm() {
        this.audioManager.stopBgm();
    }

    startAmbientSound() {
        this.audioManager.startAmbientSound();
    }

    stopAmbientSound() {
        this.audioManager.stopAmbientSound();
    }

    getEnvironmentSoundPath(surfaceType = 'water') {
        return this.audioManager.getEnvironmentSoundPath(surfaceType);
    }

    startEnvironmentSound(surfaceType = this.settings?.surfaceType ?? 'water') {
        this.audioManager.startEnvironmentSound(surfaceType);
    }

    stopEnvironmentSound() {
        this.audioManager.stopEnvironmentSound();
    }

    updateEnvironmentSoundForSurface(surfaceType = this.settings?.surfaceType ?? 'water') {
        this.audioManager.updateEnvironmentSoundForSurface(surfaceType, this.settings);
    }

    hideLoading() {
        setTimeout(() => {
            const loadingEl = document.getElementById('loading');
            if (loadingEl) {
                loadingEl.classList.add('hidden');
            }
        }, 1000);
    }

    animate() {
        if (!this.isRunning) return;
        this.animationFrameId = requestAnimationFrame(this.animate);
        const now = this.timeController.getCurrentSeconds();
        this.updateSimulationTime(now);
        const delta = now - this.lastTime;
        this.lastTime = now;
        this.controls?.update();
        this.enforceCameraAboveWater();
        for (const update of this.updaters) {
            update(now, delta);
        }
        this.renderer.render(this.scene, this.camera);
    }
}

const livePlanetarium = new Planetarium({ containerId: 'canvas-container' });
const archivePlanetarium = new Planetarium({
    containerId: 'archive-canvas-container',
    isArchive: true
});

registerPlanetaria({ live: livePlanetarium, archive: archivePlanetarium });

setActivePlanetarium('live');

attachUIInteractions(getActivePlanetarium);
setupTimeDisplay(getActivePlanetarium);

setPlanetarium(getLivePlanetarium());
initLocationSelector({
    onSelect: (location) => {
        console.log(`観測地を変更: ${location.name}`);
    }
});

setArchivePlanetarium(getArchivePlanetarium());
initEventArchive({
    onSelect: (event) => {
        console.log(`クロノスカイ: ${event.title} に移動`);
    }
});
initCelestialLibrary();
initHomeScene();

initModeSelector({
    onEnterLive: () => setActivePlanetarium('live'),
    onEnterArchive: () => setActivePlanetarium('archive'),
    onEnterLibrary: () => setActivePlanetarium('live'),
    onEnterAlbum: () => setActivePlanetarium('live')
});
playTitleBgm();

// 初期ロード時に選択画面へ進めるよう、星空の準備中オーバーレイを先に隠す
const loadingOverlay = document.getElementById('loading');
if (loadingOverlay) {
    loadingOverlay.classList.add('hidden');
}
