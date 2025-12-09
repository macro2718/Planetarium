import * as THREE from '../three.module.js';
import { AstroCatalog } from '../astroCatalog.js';
import {
    DEFAULT_OBSERVER_LOCATION,
    createDefaultSettings
} from './settings.js';
import { TimeController } from './timeController.js';
import { AudioManager } from './audioManager.js';
import { createPlanetariumSystems } from './planetariumSystems.js';
import {
    setupScene,
    setupCamera,
    setupRenderer,
    setupControls,
    disposeScene,
    resizeRenderer,
    enforceCameraAboveWater
} from './planetariumScene.js';
import {
    applySurfaceType,
    applySettingsToSystems,
    syncControlButtons,
    syncSurfaceButtons
} from './planetariumSettings.js';

export class Planetarium {
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

        const { systems, updaters } = createPlanetariumSystems(this);
        Object.assign(this, systems);
        updaters.forEach((update) => this.registerUpdater(update));

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
        disposeScene(this);
    }

    registerUpdater(system) {
        if (system?.update) {
            this.updaters.push(system.update);
        }
    }

    setupScene() {
        setupScene(this);
    }

    setupCamera() {
        setupCamera(this);
    }

    setupRenderer() {
        setupRenderer(this);
    }

    resizeRenderer() {
        resizeRenderer(this);
    }

    setupControls() {
        setupControls(this);
    }

    syncSurfaceButtons(type = this.settings?.surfaceType) {
        syncSurfaceButtons(this, type);
    }

    setSurfaceType(type) {
        const applied = applySurfaceType(this, type);
        if (applied) {
            this.updateEnvironmentSoundForSurface(applied);
        }
        return applied;
    }

    applySettingsToSystems() {
        applySettingsToSystems(this);
    }

    syncControlButtons() {
        syncControlButtons(this);
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
        enforceCameraAboveWater(this);
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
