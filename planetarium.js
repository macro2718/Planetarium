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
import { calculateLocalSiderealTime } from './utils/astronomy.js';
import { getPhotoAlbumSystem, setupPhotoCaptureButton } from './ui/photoAlbum.js';
import { initLocationSelector, setPlanetarium } from './ui/locationSelector.js';
import { initModeSelector } from './ui/modeSelector.js';
import { initEventArchive, setArchivePlanetarium } from './ui/eventArchive.js';
import { initCelestialLibrary } from './ui/celestialLibrary.js';
import { initHomeScene } from './ui/homeScene.js';
import {
    registerPlanetaria,
    setActivePlanetarium,
    getActivePlanetarium,
    getArchivePlanetarium,
    getLivePlanetarium
} from './ui/planetariumContext.js';

const DEFAULT_OBSERVER_LOCATION = {
    name: '東京',
    nameEn: 'Tokyo',
    lat: 35.6895,
    lon: 139.6917,
    icon: '🗼',
    surfaceType: 'grass'
};

const normalizeSurfaceType = (type) => {
    if (!type) return 'water';
    return type === 'land' ? 'desert' : type;
};

function createDefaultSettings() {
    return {
        showMilkyWay: true,
        showConstellations: true,
        showShootingStars: true,
        showSun: false,
        showMoon: true,
        showPlanets: true,
        showAurora: true,
        showHourCircles: false,
        showDeclinationCircles: false,
        showCelestialEquator: false,
        showEcliptic: false,
        showGalacticEquator: false,
        showLunarOrbit: false,
        showCardinalDirections: false,
        showStarTrails: false,
        autoRotate: false,
        playMusic: false,
        showLensFlare: true,
        surfaceType: normalizeSurfaceType(DEFAULT_OBSERVER_LOCATION.surfaceType) ?? 'water',
        showCometTail: false,
        cometTailTint: '#b7f0ff',
        cometTailIntensity: 1,
        meteorShowerIntensity: 0
    };
}

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
        this.bgmAudio = null;
        this.bgmPlaylist = [];
        this.bgmCurrentIndex = 0;
        this.isPlaying = false;
        this.raycaster = new THREE.Raycaster();
        this.raycaster.params.Points.threshold = 50;
        this.raycaster.params.Mesh = { threshold: 30 };
        this.mouse = new THREE.Vector2();
        this.clickableObjects = [];
        this.catalogPickables = [];
        this.catalog = AstroCatalog.createDefault();
        this.starCatalog = this.catalog.getStars();
        this.starCatalogMap = this.catalog.getStarMap();
        this.observerLocationInfo = { ...DEFAULT_OBSERVER_LOCATION };
        this.observer = {
            lat: DEFAULT_OBSERVER_LOCATION.lat,
            lon: DEFAULT_OBSERVER_LOCATION.lon
        };
        this.timeMode = 'realtime';
        this.isArchive = isArchive;
        this.timeScale = 240; // simulation seconds per real second (custom mode)
        this.dayScale = 1; // days per real second (fixed-time mode)
        this.simulationStartDate = new Date();
        const nowSeconds = performance.now() * 0.001;
        this.simulationStartPerf = nowSeconds;
        this.simulatedDate = new Date(this.simulationStartDate);
        this.initialRealtimeDate = new Date(this.simulationStartDate);
        this.realtimeOffsetMs = 0;
        this.fixedTimeOfDayMs = this.simulationStartDate.getHours() * 3600000
            + this.simulationStartDate.getMinutes() * 60000
            + this.simulationStartDate.getSeconds() * 1000
            + this.simulationStartDate.getMilliseconds();
        this.isTimePaused = false;
        this.localSiderealTime = calculateLocalSiderealTime(this.simulatedDate, this.observer.lon);
        this.infoTimeout = null;
        this.currentMoonState = null;
        this.updaters = [];
        this.lastTime = nowSeconds;
        this.containerId = containerId;
        this.resizeRenderer = this.resizeRenderer.bind(this);
        this.animate = this.animate.bind(this);
        this.isInitialized = false;
        this.isRunning = false;
        this.animationFrameId = null;
    }

    resetState() {
        this.settings = createDefaultSettings();
        this.timeScale = 240;
        this.dayScale = 1;
        this.realtimeOffsetMs = 0;
        this.setTimeMode('realtime', { date: new Date() });
        this.lastTime = this.getCurrentPerfSeconds();
        this.isTimePaused = false;

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
        this.isRunning = true;
        this.lastTime = this.getCurrentPerfSeconds();
        this.hideLoading();
        this.animate();
    }

    stop() {
        this.isRunning = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    destroy() {
        this.stop();
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
            { id: 'btn-music', flag: 'playMusic' }
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
        if (this.timeMode === 'realtime') {
            const offset = Number.isFinite(this.realtimeOffsetMs) ? this.realtimeOffsetMs : 0;
            this.simulatedDate = new Date(Date.now() + offset);
        } else {
            const elapsed = nowSeconds - this.simulationStartPerf;
            if (this.timeMode === 'custom') {
                const scale = this.isTimePaused ? 0 : this.timeScale;
                const simulatedMs = this.simulationStartDate.getTime() + elapsed * 1000 * scale;
                this.simulatedDate = new Date(simulatedMs);
            } else if (this.timeMode === 'fixed-time') {
                // 日付送りモード: 指定時刻を維持しつつ、日付を離散的に進める
                const scale = this.isTimePaused ? 0 : this.dayScale;
                // 経過秒数 * dayScale で進んだ日数を計算（離散的）
                const daysPassed = Math.floor(elapsed * scale);
                const baseDate = new Date(this.simulationStartDate);
                baseDate.setDate(baseDate.getDate() + daysPassed);
                const startOfDay = new Date(baseDate);
                startOfDay.setHours(0, 0, 0, 0);
                const timeOfDayMs = this.fixedTimeOfDayMs ?? 0;
                this.simulatedDate = new Date(startOfDay.getTime() + timeOfDayMs);
            }
        }
        this.localSiderealTime = calculateLocalSiderealTime(this.simulatedDate, this.observer.lon);
    }

    getSimulatedDate() {
        return this.simulatedDate ?? new Date();
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
        // 恒星時を再計算
        this.localSiderealTime = calculateLocalSiderealTime(this.simulatedDate, this.observer.lon);
        if (info?.surfaceType) {
            this.setSurfaceType(info.surfaceType);
        }
        console.log(`観測地を設定: 緯度 ${lat.toFixed(4)}, 経度 ${lon.toFixed(4)}`);
    }

    setTimeMode(mode, options = {}) {
        if (mode === 'realtime') {
            this.timeMode = 'realtime';
            this.isTimePaused = false;
            const providedDate = options.date instanceof Date
                ? options.date
                : (options.date ? new Date(options.date) : null);
            const hasValidDate = providedDate && !Number.isNaN(providedDate.getTime());
            const fallbackDate = this.isArchive
                ? (this.simulatedDate || this.initialRealtimeDate)
                : new Date();
            const baseDate = hasValidDate ? providedDate : fallbackDate;
            this.realtimeOffsetMs = baseDate.getTime() - Date.now();
            this.simulationStartDate = new Date(baseDate);
            this.simulationStartPerf = this.getCurrentPerfSeconds();
            this.simulatedDate = new Date(baseDate);
        } else if (mode === 'custom') {
            this.timeMode = 'custom';
            this.isTimePaused = false;
            if (typeof options.timeScale === 'number' && !Number.isNaN(options.timeScale)) {
                this.timeScale = options.timeScale;
            }
            const providedDate = options.date instanceof Date
                ? options.date
                : (options.date ? new Date(options.date) : null);
            const hasValidDate = providedDate && !Number.isNaN(providedDate.getTime());
            const baseDate = hasValidDate ? providedDate : this.getSimulatedDate();
            this.simulationStartDate = new Date(baseDate);
            this.simulationStartPerf = this.getCurrentPerfSeconds();
            this.simulatedDate = new Date(baseDate);
            this.fixedTimeOfDayMs = baseDate.getHours() * 3600000
                + baseDate.getMinutes() * 60000
                + baseDate.getSeconds() * 1000
                + baseDate.getMilliseconds();
        } else if (mode === 'fixed-time') {
            this.timeMode = 'fixed-time';
            this.isTimePaused = false;
            if (typeof options.dayScale === 'number' && !Number.isNaN(options.dayScale)) {
                this.dayScale = options.dayScale;
            }
            const providedDate = options.date instanceof Date
                ? options.date
                : (options.date ? new Date(options.date) : null);
            const hasValidDate = providedDate && !Number.isNaN(providedDate.getTime());
            const baseDate = hasValidDate ? providedDate : this.getSimulatedDate();
            this.fixedTimeOfDayMs = baseDate.getHours() * 3600000
                + baseDate.getMinutes() * 60000
                + baseDate.getSeconds() * 1000
                + baseDate.getMilliseconds();
            this.simulationStartDate = new Date(baseDate);
            this.simulationStartPerf = this.getCurrentPerfSeconds();
            this.simulatedDate = new Date(baseDate);
        } else {
            console.warn('Unknown time mode:', mode);
            return;
        }
        this.localSiderealTime = calculateLocalSiderealTime(this.simulatedDate, this.observer.lon);
    }

    toggleTimePause(forceState) {
        if (this.timeMode === 'realtime') {
            this.isTimePaused = false;
            return this.isTimePaused;
        }
        const nowSeconds = this.getCurrentPerfSeconds();
        this.updateSimulationTime(nowSeconds);
        const next = typeof forceState === 'boolean' ? forceState : !this.isTimePaused;
        this.isTimePaused = next;
        this.simulationStartDate = new Date(this.simulatedDate);
        this.simulationStartPerf = nowSeconds;
        return this.isTimePaused;
    }

    getCurrentPerfSeconds() {
        return performance.now() * 0.001;
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

    async loadBgmPlaylist() {
        // bgmフォルダ内のmp3ファイルリストを取得
        // 静的なリストとして定義（サーバーサイドがないため）
        const bgmFiles = [
            'bgm/Weightless Dreaming.mp3'
        ];
        this.bgmPlaylist = bgmFiles;
        this.bgmCurrentIndex = 0;
    }

    async startBgm() {
        if (this.isPlaying) return;
        
        if (this.bgmPlaylist.length === 0) {
            await this.loadBgmPlaylist();
        }
        
        if (this.bgmPlaylist.length === 0) {
            console.warn('BGMファイルが見つかりません');
            return;
        }

        this.playCurrentTrack();
    }

    playCurrentTrack() {
        if (this.bgmAudio) {
            this.bgmAudio.pause();
            this.bgmAudio = null;
        }

        const trackPath = this.bgmPlaylist[this.bgmCurrentIndex];
        this.bgmAudio = new Audio(trackPath);
        this.bgmAudio.volume = 0.5;
        
        // 曲が終わったら次の曲へ
        this.bgmAudio.addEventListener('ended', () => {
            this.bgmCurrentIndex = (this.bgmCurrentIndex + 1) % this.bgmPlaylist.length;
            if (this.isPlaying) {
                this.playCurrentTrack();
            }
        });

        this.bgmAudio.play().catch(err => {
            console.error('BGM再生エラー:', err);
        });
        this.isPlaying = true;
    }

    stopBgm() {
        if (!this.bgmAudio) return;
        this.bgmAudio.pause();
        this.bgmAudio.currentTime = 0;
        this.isPlaying = false;
    }

    startAmbientSound() {
        this.startBgm();
    }

    stopAmbientSound() {
        this.stopBgm();
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
        const now = performance.now() * 0.001;
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
    onEnterLibrary: () => setActivePlanetarium('live')
});

// 初期ロード時に選択画面へ進めるよう、星空の準備中オーバーレイを先に隠す
const loadingOverlay = document.getElementById('loading');
if (loadingOverlay) {
    loadingOverlay.classList.add('hidden');
}
